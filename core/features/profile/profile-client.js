// =========================
// RICH BIZNESS PROFILE CLIENT
// /core/features/profile/profile-client.js
// Handles: session, profile fetch, UI sync
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== ENV (uses your current system) =====
const SUPABASE_URL =
  window.NEXT_PUBLIC_SUPABASE_URL ||
  window.SUPABASE_URL;

const SUPABASE_KEY =
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// ===== CLIENT =====
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let currentUser = null;
let currentProfile = null;

// ===== HELPERS =====
function $(id) {
  return document.getElementById(id);
}

function safeText(v, fallback = "") {
  return v ?? fallback;
}

function initials(name = "") {
  if (!name) return "RB";
  return name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ===== UI UPDATE =====
function applyProfileToUI(profile) {
  const nameEl = $("artistName") || $("profile-name");
  const bioEl = $("artistMeta") || $("profile-bio");
  const avatarEl = $("artistAvatar") || $("profile-avatar");

  if (nameEl) {
    nameEl.textContent =
      profile?.display_name ||
      profile?.username ||
      "Rich Bizness User";
  }

  if (bioEl) {
    bioEl.textContent =
      profile?.bio ||
      "Tap in. Build your brand. Run your motion.";
  }

  if (avatarEl) {
    const avatarUrl =
      profile?.avatar_url ||
      profile?.image_url ||
      "";

    if (avatarUrl) {
      avatarEl.innerHTML = `<img src="${avatarUrl}" />`;
    } else {
      avatarEl.textContent = initials(
        profile?.display_name || profile?.username
      );
    }
  }
}

// ===== LOAD PROFILE =====
export async function loadProfile() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  currentUser = user;

  if (!user) {
    applyProfileToUI(null);
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
  }

  currentProfile = profile;

  applyProfileToUI(profile);

  return profile;
}

// ===== SESSION WATCH =====
export function watchAuth() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;

    await loadProfile();
  });
}

// ===== SIGN OUT =====
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth.html";
}

// ===== GETTERS =====
export function getUser() {
  return currentUser;
}

export function getProfile() {
  return currentProfile;
}

// ===== INIT =====
export async function initProfileClient() {
  await loadProfile();
  watchAuth();
}
