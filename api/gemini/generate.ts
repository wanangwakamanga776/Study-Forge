import { callGeminiWithRetry } from "../utils";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { model, systemPrompt, userMessage, maxTokens, jsonMode, responseSchema } = req.body;
    
    // Clean up model name and strictly enforce the abundant and cost-effective gemini-3.5-flash model
    const modelId = "gemini-3.5-flash";

    console.log(`[Gemini API Vercel] Enforcing model: ${modelId}`);

    const response = await callGeminiWithRetry({
      model: modelId,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        ...(jsonMode ? { 
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {})
        } : {}),
      }
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("[Gemini API Vercel] Error:", error);
    const status = error.status || (error.message?.includes("429") ? 429 : 500);
    return res.status(status).json({ 
      error: {
        message: error.message || "Internal Server Error",
        status: error.status || "API_ERROR"
      } 
    });
  }
}
