// =========================
// RICH BIZNESS MUSIC UNLOCK SYSTEM
// /core/features/music/unlock.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== INIT =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;

// ===== INIT =====
export async function initUnlock() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// CHECK ACCESS
// =========================
export async function hasAccess(contentId, type = "track") {
  if (!currentUser) return false;

  // 1. Check music_unlocks
  const { data: unlock } = await supabase
    .from("music_unlocks")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("track_id", contentId)
    .maybeSingle();

  if (unlock) return true;

  // 2. Check general unlocks
  const { data: general } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("content_id", contentId)
    .maybeSingle();

  if (general) return true;

  // 3. VIP live access fallback
  const { data: vip } = await supabase
    .from("vip_live_access")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (vip) return true;

  return false;
}

// =========================
// GET PREMIUM CONFIG
// =========================
export async function getPremiumConfig(contentId) {
  const { data } = await supabase
    .from("premium_content")
    .select("*")
    .eq("content_id", contentId)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

// =========================
// LOCK / UNLOCK UI WRAPPER
// =========================
export async function applyUnlockToTrack(track) {
  const has = await hasAccess(track.id);

  if (has) {
    return `
      <audio controls src="${track.audio_url}"></audio>
    `;
  }

  const premium = await getPremiumConfig(track.id);

  const price = premium?.price_cents
    ? `$${(premium.price_cents / 100).toFixed(2)}`
    : "Unlock";

  return `
    <div class="locked-track">
      <div class="lock-overlay">
        🔒 Locked Track
      </div>
      <button onclick="window.unlockTrack('${track.id}')">
        ${price}
      </button>
    </div>
  `;
}

// =========================
// UNLOCK (MANUAL / MOCK)
// =========================
export async function unlockTrack(contentId) {
  if (!currentUser) {
    alert("Sign in first");
    return;
  }

  // ⚠️ This is placeholder until Stripe webhook confirms purchase
  const { error } = await supabase
    .from("music_unlocks")
    .insert([
      {
        user_id: currentUser.id,
        track_id: contentId,
        status: "paid"
      }
    ]);

  if (error) {
    console.error(error);
    alert("Unlock failed");
    return;
  }

  alert("Unlocked!");

  location.reload();
}

// expose to window for buttons
window.unlockTrack = unlockTrack;

// =========================
// FILTER TRACK LIST
// =========================
export async function attachUnlockLogic(tracks = []) {
  const results = [];

  for (const track of tracks) {
    const player = await applyUnlockToTrack(track);

    results.push({
      ...track,
      playerHTML: player
    });
  }

  return results;
}
