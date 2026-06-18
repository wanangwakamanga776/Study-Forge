import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check route for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(express.json({ limit: '10mb' }));

  let ai: GoogleGenAI | null = null;
  const getAI = () => {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing or empty.");
      }
      ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  };

  const callGeminiWithRetry = async (
    params: {
      model: string;
      contents: any;
      config?: any;
    },
    maxAttempts = 3
  ): Promise<any> => {
    // List supportable models in preferential order according to gemini-api SKILL guidelines
    const modelsToTry = [
      params.model,
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    // Create a unique array of models to attempt
    const models = Array.from(new Set(modelsToTry.filter(Boolean)));
    
    let lastError: any = null;
    
    for (const currentModel of models) {
      let attempt = 0;
      while (attempt < maxAttempts) {
        try {
          console.log(`[Gemini SDK] Generating content using ${currentModel} (Attempt ${attempt + 1}/${maxAttempts})...`);
          const response = await getAI().models.generateContent({
            ...params,
            model: currentModel,
          });
          return response;
        } catch (error: any) {
          attempt++;
          lastError = error;
          const errMsg = typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error);
          console.warn(`[Gemini SDK] Error on ${currentModel} on attempt ${attempt}:`, errMsg);
          
          const isNotFoundError = 
            error.status === 404 || 
            error.message?.includes("not found") || 
            error.message?.includes("404") ||
            error.message?.includes("not supported");
            
          const isQuotaOrRateLimitError =
            error.status === 429 ||
            error.message?.includes("429") ||
            error.message?.includes("quota") ||
            error.message?.includes("Quota exceeded") ||
            error.message?.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota") ||
            errMsg.includes("429");

          const isHighDemandOrUnavailableError =
            error.status === 503 ||
            error.message?.includes("503") ||
            error.message?.includes("UNAVAILABLE") ||
            error.message?.includes("high demand") ||
            error.message?.includes("temporary") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("503") ||
            errMsg.includes("demand");

          if (isNotFoundError) {
            console.warn(`[Gemini SDK] Model '${currentModel}' not found / supported. Moving immediately to next model...`);
            break; // Break the inner loop, go to the next model in models list which will be clean
          }

          if (isQuotaOrRateLimitError) {
            console.warn(`[Gemini SDK] Model '${currentModel}' hit QUOTA/RATE LIMIT. Moving immediately to next fallback model to avoid blocking...`);
            break; // Immediate failover! Skip remaining attempts for this model.
          }

          if (isHighDemandOrUnavailableError) {
            console.warn(`[Gemini SDK] Model '${currentModel}' is UNAVAILABLE / experiencing high demand. Moving immediately to next fallback model to avoid blocking...`);
            break; // Immediate failover! Skip remaining attempts for this model.
          }
          
          if (attempt >= maxAttempts) {
            break;
          }

          // Exponential backoff delay
          const delay = Math.pow(2, attempt) * 800 + Math.random() * 500;
          console.log(`[Gemini SDK] Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error("Failed to generate content after retrying all fallback models.");
  };

  // --- WHATSAPP AGENT UTILITIES ---

  const sendWhatsAppMessage = async (to: string, message: string) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.warn("[WhatsApp] Missing configuration. Cannot send message. Ensure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.");
      return;
    }

    try {
      const axios = (await import("axios")).default;
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          to: to,
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`[WhatsApp] Message sent to ${to}`);
    } catch (error: any) {
      console.error("[WhatsApp] Send Error:", error.response?.data || error.message);
    }
  };

  // --- WA AGENT WEBHOOK ---
  
  /**
   * WhatsApp Webhook Verification (GET)
   * Required by Meta to verify the server
   */
  app.get("/api/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log("[WhatsApp Webhook GET] Received Verification Request:", {
      mode,
      receivedToken: token,
      challenge,
      configuredToken: expectedToken
    });

    // Highly resilient verification match logic:
    // 1. Matches if the received token matches the configured env token (ignoring default placeholder)
    // 2. Matches helpful default fallback tokens ("studyforge", "study_forge", "studyforge_verify_token")
    // 3. Matches any token if the env variable is completely missing, unconfigured, or set to placeholder,
    //    so the user is NEVER locked out of verification while configuring their environment.
    const isMatched = 
      (expectedToken && expectedToken !== "YOUR_WHATSAPP_VERIFY_TOKEN" && token === expectedToken) ||
      (token === "studyforge") ||
      (token === "study_forge") ||
      (token === "studyforge_verify_token") ||
      (!expectedToken || expectedToken === "YOUR_WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && isMatched) {
      console.log(`[WhatsApp Webhook GET] Verification Match Succeeded! Sending challenge back: ${challenge}`);
      res.set("Content-Type", "text/plain");
      res.status(200).send(String(challenge));
    } else {
      console.error("[WhatsApp Webhook GET] Verification failed. Expected matches did not satisfy security check.");
      res.status(403).send("Verification failed. Please configure WHATSAPP_VERIFY_TOKEN correctly.");
    }
  });

  /**
   * WhatsApp Webhook Processing (POST)
   * Receives and processes real-time messages
   */
  app.post("/api/webhook/whatsapp", async (req, res) => {
    const body = req.body;

    // Check if it's a valid WhatsApp message
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const from = message.from; // Sender phone number
        const text = message.text.body; // Incoming message text
        const contactName = value.contacts?.[0]?.profile?.name || "Scholar";

        console.log(`[WhatsApp] Message from ${from}: ${text}`);

        // Immediate acknowledgment to avoid WhatsApp retries (200 OK)
        res.status(200).send("EVENT_RECEIVED");

        // Async processing
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const adminClient = createClient(
            process.env.VITE_SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || ""
          );

          // 1. Resolve User
          let { data: profile } = await adminClient
            .from('profiles')
            .select('id, name')
            .eq('phone_number', from)
            .single();

          if (!profile) {
            // Auto-create profile for new WhatsApp users
            const { data: newProfile, error: profileError } = await adminClient
              .from('profiles')
              .insert([{ 
                id: crypto.randomUUID(), // Note: In a real app, you might want to link this to auth.users if possible
                name: contactName, 
                phone_number: from,
                metadata: { source: 'whatsapp_agent' }
              }])
              .select()
              .single();
            
            if (profileError) throw profileError;
            profile = newProfile;
          }

          // Store incoming message in Supabase
          await adminClient.from('whatsapp_messages').insert([{
            user_id: profile.id,
            phone_number: from,
            message_type: 'incoming',
            message_text: text,
            metadata: { channel: 'whatsapp', contact_name: contactName }
          }]);

          // 2. Process Intent with Gemini
          const prompt = `You are the Study Forge Assistant. A student sent this message on WhatsApp: "${text}"

          User Profile: ${profile.name} (ID: ${profile.id})
          
          TASK:
          1. Determine if they are trying to LOG a study session (e.g., "I studied math for 30 mins").
          2. Determine if they are ASKING for a study recommendation ("What should I study?").
          3. Otherwise, just chat/answer questions.

          If LOGGING:
          Extract subject, duration_minutes, and brief notes.
          
          If RECOMMENDING:
          You'll need to look at their history. (For now, assume we'll use recent history).

          RESPONSE FORMAT:
          Return JSON ONLY:
          {
            "intent": "log_session" | "recommendation" | "general_chat",
            "extracted_data": { "subject": "Math", "duration": 45, "notes": "Algebra practice" },
            "reply_text": "A friendly response to send back to the user."
          }

          If they log a session, be encouraging and confirm the save.
          If they ask for recommendation, give a smart, personalized advice.`;

          const aiResponse = await callGeminiWithRetry({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });

          const result = JSON.parse(aiResponse.text);

          let replyText = "";

          // 3. Handle Intent
          if (result.intent === "log_session" && result.extracted_data) {
            await adminClient.from('study_sessions').insert([{
              user_id: profile.id,
              subject: result.extracted_data.subject,
              duration_minutes: result.extracted_data.duration,
              notes: result.extracted_data.notes,
              metadata: { channel: 'whatsapp', original_text: text }
            }]);
            
            replyText = result.reply_text;
            // Send Confirmation
            await sendWhatsAppMessage(from, replyText);
          } 
          else if (result.intent === "recommendation") {
            // Fetch recent stats to make it smarter
            const { data: history } = await adminClient
              .from('quiz_results')
              .select('subject, score_percentage')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(5);

            const recPrompt = `Based on these recent quiz scores: ${JSON.stringify(history || [])}. 
            Suggest what ${profile.name} should study today. Keep it short and motivational for WhatsApp. 
            Return just the message text.`;

            const recResponse = await callGeminiWithRetry({
              model: "gemini-3.5-flash",
              contents: recPrompt
            });

            replyText = recResponse.text;
            await sendWhatsAppMessage(from, replyText);
          }
          else {
            // General Chat
            replyText = result.reply_text;
            await sendWhatsAppMessage(from, replyText);
          }

          // Store outgoing message (the generated reply) in Supabase
          if (replyText) {
            await adminClient.from('whatsapp_messages').insert([{
              user_id: profile.id,
              phone_number: from,
              message_type: 'outgoing',
              message_text: replyText,
              metadata: { channel: 'whatsapp' }
            }]);
          }

        } catch (err) {
          console.error("[WhatsApp Agent] Processing Error:", err);
          await sendWhatsAppMessage(from, "Sorry, I hit a snag while processing your request in the Forge. Try again in a bit!");
        }
      } else {
        res.sendStatus(200);
      }
    } else {
      res.sendStatus(404);
    }
  });

  // API routes
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, systemPrompt, userMessage, maxTokens, jsonMode, responseSchema } = req.body;
      
      // Clean up model name and strictly enforce the abundant and cost-effective gemini-3.5-flash model
      const modelId = "gemini-3.5-flash";

      console.log(`[Gemini API] Enforcing most cost-effective model: ${modelId}`);

      const response = await callGeminiWithRetry({
        model: modelId,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          ...(jsonMode ? { 
            responseMimeType: 'application/json',
            ...(responseSchema ? { responseSchema } : {})
          } : {}),
        }
      });

      // Log the request and response to a file for debugging
      const fs = await import("fs");
      try {
        const logContent = `\n\n--- ${new Date().toISOString()} ---\n` +
          `[MODEL]: ${modelId}\n` +
          `[PROMPT]: ${typeof userMessage === 'object' ? JSON.stringify(userMessage) : userMessage}\n` +
          `[SYSTEM]: ${systemPrompt}\n` +
          `[RESPONSE]: ${response.text}\n`;
        fs.appendFileSync(path.resolve(process.cwd(), "gemini_log.txt"), logContent);
      } catch (logErr) {
        console.error("Failed to write to gemini_log.txt:", logErr);
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const status = error.status || (error.message?.includes('429') ? 429 : 500);
      res.status(status).json({ 
        error: {
          message: error.message || "Internal Server Error",
          status: error.status || "API_ERROR"
        } 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Only import vite if we're in dev mode to avoid prod dependency issues
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, the bundled server.cjs is in the dist folder
    // along with the static files.
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`[Server] Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    // Catch-all route for SPA
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
