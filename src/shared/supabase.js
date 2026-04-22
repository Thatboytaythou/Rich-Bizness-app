import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  window.SUPABASE_URL ||
  window.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ksvdequymkceevocgpdj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  window.SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("[core/supabase] Missing frontend Supabase URL or publishable key.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[core/supabase] getSession error:", error);
    return null;
  }

  return session || null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function getSessionUser() {
  return await getUser();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

export async function signOutSession() {
  return await signOut();
}

export async function getProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] getProfile error:", error);
    return null;
  }

  return data || null;
}

export async function getCreatorBalance(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] getCreatorBalance error:", error);
    return null;
  }

  return data || null;
}

export function getPublicStorageUrl(bucket, path) {
  if (!bucket || !path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
