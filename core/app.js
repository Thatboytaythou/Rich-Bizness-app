// =========================
// RICH BIZNESS APP CORE — AUTH LOCKED
// =========================

import { supabase } from "/core/supabase.js";

let currentUser = null;

// 🔥 INIT APP (RUN ON EVERY PAGE)
export async function initApp() {
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  // 🔥 LISTEN FOR LOGIN / LOGOUT
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateGlobalSessionUI();
  });

  updateGlobalSessionUI();
}

// 🔥 GET USER
export function getCurrentUserState() {
  return currentUser;
}

// 🔥 GLOBAL NAV UI (TOP BAR LOGIN STATE)
async function updateGlobalSessionUI() {
  const el = document.getElementById("global-session-nav");
  if (!el) return;

  if (currentUser) {
    el.innerHTML = `
      <a href="/profile.html">Profile</a>
      <button id="logout-btn">Tap Out 🚪</button>
    `;

    document.getElementById("logout-btn").onclick = async () => {
      await supabase.auth.signOut();
      location.reload();
    };

  } else {
    el.innerHTML = `
      <a href="/auth.html">Tap In 🔓</a>
    `;
  }
}
