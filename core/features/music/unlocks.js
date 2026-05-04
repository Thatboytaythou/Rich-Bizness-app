// =========================
// RICH BIZNESS MUSIC UNLOCK SYSTEM — ELITE
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// INIT
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;

// =========================
// INIT USER
// =========================
export async function initUnlock() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// CHECK ACCESS
// =========================
export async function hasAccess(trackId) {
  if (!currentUser) return false;

  // direct unlock
  const { data: unlock } = await supabase
    .from("music_unlocks")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("track_id", trackId)
    .maybeSingle();

  if (unlock) return true;

  // general unlock system
  const { data: general } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("content_id", trackId)
    .maybeSingle();

  if (general) return true;

  return false;
}

// =========================
// UNLOCK (TEMP UNTIL STRIPE)
// =========================
export async function unlockTrack(trackId) {
  if (!currentUser) {
    alert("Sign in first");
    return;
  }

  const { error } = await supabase
    .from("music_unlocks")
    .insert({
      user_id: currentUser.id,
      track_id: trackId,
      status: "paid"
    });

  if (error) {
    console.error(error);
    alert("Unlock failed");
    return;
  }

  alert("🔥 Unlocked!");

  location.reload();
}

// expose to window
window.unlockTrack = unlockTrack;
