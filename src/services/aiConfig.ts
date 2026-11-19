
/**
 * AI configuration check.
 *
 * Study Forge 2.0 routes ALL model calls through the Supabase edge function
 * (supabase/functions/generate). Keys never reach the client, so this file
 * intentionally reports "not configured" for client-side Gemini usage.
 *
 * Legacy client-side generation (if any) is disabled by design.
 */
export function checkAIConfigured(): boolean {
  return false;
}

export const isAIConfigured = checkAIConfigured();
