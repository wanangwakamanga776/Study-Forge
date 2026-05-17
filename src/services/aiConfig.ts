
/**
 * Indicates if the AI service has been configured with an API key.
 * Checks both environment variables to ensure compatibility.
 */
export const isAIConfigured = !!(process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
