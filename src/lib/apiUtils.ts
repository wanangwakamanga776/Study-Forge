/**
 * Utility for API calls with exponential backoff.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429)) {
      console.warn(`Quota rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetries(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Simple string hashing function for caching keys.
 */
export function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}
