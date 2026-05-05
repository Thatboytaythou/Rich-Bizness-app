// =========================
// RICH BIZNESS PROFILE CLIENT — FINAL
// =========================

import { supabase } from "/core/supabase.js";

export async function getProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("profile load error:", error);
    return null;
  }

  return data;
}

export async function updateProfile(userId, updates) {
  if (!userId) return;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("profile update error:", error);
  }
}
