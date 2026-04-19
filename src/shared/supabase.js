import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl =
  window.SUPABASE_URL ||
  window.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseKey =
  window.SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("[supabase] Missing frontend Supabase URL or browser key.");
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

export async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session || null;
}

export async function signOutSession() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}
