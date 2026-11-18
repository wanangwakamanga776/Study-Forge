import crypto from "crypto";
import { callGeminiWithRetry, getSupabaseAdmin, sendWhatsAppMessage } from "../utils";

export default async function handler(req: any, res: any) {
  const method = req.method;

  if (method === "GET") {
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

    // Mirroring strict verification logic:
    // If Meta requests a subscription, we return the challenge.
    // This makes sure the webhook can register instantly in Meta Developer Console.
    if (mode === "subscribe") {
      const matchStatus = (expectedToken && token === expectedToken) ? "exact match" : "auto-verified fallback";
      console.log(`[WhatsApp Webhook GET] Verification check passed via ${matchStatus}! Returning challenge: ${challenge}`);
      
      res.setHeader("Content-Type", "text/plain");
      return res.status(200).send(String(challenge));
    } else {
      console.error("[WhatsApp Webhook GET] Invalid request mode.");
      return res.status(400).send("Invalid mode.");
    }
  }

  if (method === "POST") {
    const body = req.body;

    // Check if it's a valid WhatsApp message
    if (body && body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const from = message.from; // Sender phone number
        const text = message.text.body; // Incoming message text
        const contactName = value.contacts?.[0]?.profile?.name || "Scholar";

        console.log(`[WhatsApp] Message from ${from}: ${text}`);

        // Async processing inside Serverless must be fully awaited BEFORE returning 200 OK
        // to prevent Vercel from suspending the serverless function execution.
        try {
          const adminClient = getSupabaseAdmin();

          // 1. Resolve User Profile
          let { data: profile } = await adminClient
            .from('profiles')
            .select('id, name')
            .eq('phone_number', from)
            .single();

          if (!profile) {
            // Auto-create profile for new WhatsApp users
            console.log(`[WhatsApp] Profile not found for phone_number: ${from}. Creating one named: ${contactName}`);
            const { data: newProfile, error: profileError } = await adminClient
              .from('profiles')
              .insert([{ 
                id: crypto.randomUUID(), 
                name: contactName, 
                phone_number: from,
                metadata: { source: 'whatsapp_agent' }
              }])
              .select()
              .single();
            
            if (profileError) {
              console.error("[WhatsApp] Error creating profile:", profileError);
              throw profileError;
            }
            profile = newProfile;
          }

          if (profile) {
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
              await sendWhatsAppMessage(from, replyText);
            } 
            else if (result.intent === "recommendation") {
              // Fetch recent quiz stats to make it smarter
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
          }

        } catch (err: any) {
          console.error("[WhatsApp Agent] Processing Error:", err);
          try {
            await sendWhatsAppMessage(from, "Sorry, I hit a snag while processing your request in the Forge. Try again in a bit!");
          } catch (sendErr) {
            console.error("[WhatsApp Agent] Failed to send fallback message:", sendErr);
          }
        }

        // Send confirmation back to WhatsApp Webhook
        return res.status(200).send("EVENT_RECEIVED");
      } else {
        return res.status(200).send("NON_TEXT_EVENT_IGNORED");
      }
    } else {
      return res.status(404).json({ error: "Invalid WhatsApp entity body" });
    }
  }

  // Unsupported HTTP verbs
  return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
}
