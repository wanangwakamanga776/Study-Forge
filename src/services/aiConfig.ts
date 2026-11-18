
/**
 * Indicates if the AI service has been configured with an API key.
 *
 * FIX: The old code used process.env.GEMINI_API_KEY which is ALWAYS undefined
 * in a Vite browser build unless vite.config.ts explicitly defines it.
 * This caused isAIConfigured to silently return false even when a key existed,
 * hiding the generation UI without any error message.
 */
function checkAIConfigured(): boolean {
  try {
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log("AIConfig: Checking viteKey", viteKey ? `${viteKey.substring(0,5)}...` : 'undefined');
    if (viteKey && viteKey !== 'YOUR_GEMINI_API_KEY' && viteKey.length > 10) return true;
    
    const procKey = typeof process !== 'undefined' ? (process.env?.GEMINI_API_KEY || '') : '';
    console.log("AIConfig: Checking procKey", procKey ? `${procKey.substring(0,5)}...` : 'undefined');
    if (procKey && procKey !== 'MY_GEMINI_API_KEY' && procKey.length > 10) return true;
  } catch (_) {}

  return false;
}

export const isAIConfigured = checkAIConfigured();
