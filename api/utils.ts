import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// Cache Gemini client instance
let aiInstance: GoogleGenAI | null = null;

export const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing or empty.");
    }
    aiInstance = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
};

export const getSupabaseAdmin = () => {
  const url = process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are unconfigured.");
  }
  return createClient(url, serviceKey);
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("[WhatsApp] Missing configuration. Cannot send message. Ensure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.");
    return;
  }

  try {
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
    console.log(`[WhatsApp] Message successfully sent to ${to}`);
  } catch (error: any) {
    console.error("[WhatsApp] Send Error:", error.response?.data || error.message);
  }
};

export const callGeminiWithRetry = async (
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxAttempts = 3
): Promise<any> => {
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
          console.warn(`[Gemini SDK] Model '${currentModel}' not found. Moving immediately to fallback...`);
          break; 
        }

        if (isQuotaOrRateLimitError) {
          console.warn(`[Gemini SDK] Model '${currentModel}' hit QUOTA/RATE LIMIT. Moving immediately to next fallback...`);
          break; 
        }

        if (isHighDemandOrUnavailableError) {
          console.warn(`[Gemini SDK] Model '${currentModel}' is UNAVAILABLE. Moving immediately to next fallback...`);
          break; 
        }
        
        if (attempt >= maxAttempts) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 800 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Failed to generate content after retrying all fallback models.");
};
