import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey && rawKey !== 'YOUR_SUPABASE_ANON_KEY' ? rawKey : 'placeholder-anon-key';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable cloud features.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
