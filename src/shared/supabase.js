import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  window.SUPABASE_URL ||
  window.NEXT_PUBLIC_SUPABASE_URL ||
  window.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  window.SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  window.VITE_SUPABASE_PUBLISHABLE_KEY ||
  window.VITE_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Missing frontend Supabase URL or browser key.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function getSessionUser() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.user || null;
}

export async function getAccessToken() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.access_token || null;
}
