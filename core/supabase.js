// core/supabase.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 🔒 LOCKED PRODUCTION CONFIG
const SUPABASE_URL = 'https://ksvdequymkceevocgpdj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos';

// 🚀 CLIENT
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// 🔐 SESSION HELPERS
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/auth.html';
}

// 👤 PROFILE FETCH
export async function getProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// 🔁 FOLLOW CHECK
export async function isFollowing(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;

  const { data } = await supabase
    .from('followers')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
}

// 📊 CREATOR BALANCE
export async function getCreatorBalance(userId) {
  if (!userId) return null;

  const { data } = await supabase
    .from('creator_available_balances')
    .select('*')
    .eq('artist_user_id', userId)
    .maybeSingle();

  return data;
}

// 📦 STORAGE URL HELPER
export function getPublicURL(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
