// =========================
// RICH BIZNESS APP CORE — FINAL REPAIR
// /core/app.js
// Handles: boot, session/profile state, auth UI, global actions, app events
// =========================

import {
  supabase,
  getUser,
  getProfile,
  getCurrentProfile,
  signOut as supabaseSignOut
} from "/core/supabase.js";

import { ROUTES, BRAND_IMAGES } from "/core/config.js";

let currentUser = null;
let currentProfile = null;
let appBooted = false;
let bootPromise = null;
let authSubscription = null;
let globalActionsBound = false;

export function getSupabase() {
  return supabase;
}

export function getCurrentUserState() {
  return currentUser;
}

export function getCurrentProfileState() {
  return currentProfile;
}

export function isSignedIn() {
  return Boolean(currentUser?.id);
}

export async function initApp({ requireAuth = false, redirectTo = ROUTES.auth } = {}) {
  if (bootPromise) return bootPromise;

  bootPromise = boot({ requireAuth, redirectTo });
  return bootPromise;
}

async function boot({ requireAuth = false, redirectTo = ROUTES.auth } = {}) {
  await hydrateSessionState();

  if (requireAuth && !currentUser?.id) {
    window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.href)}`;
    return {
      user: null,
      profile: null
    };
  }

  setupAuthUI();
  setupGlobalActions();
  bindAuthListener();

  appBooted = true;

  dispatchAppEvent("rb:app-ready", {
    user: currentUser,
    profile: currentProfile
  });

  return {
    user: currentUser,
    profile: currentProfile
  };
}

export async function refreshAppState() {
  await hydrateSessionState();
  setupAuthUI();

  dispatchAppEvent("rb:state-refreshed", {
    user: currentUser,
    profile: currentProfile
  });

  return {
    user: currentUser,
    profile: currentProfile
  };
}

async function hydrateSessionState() {
  currentUser = await getUser();

  if (currentUser?.id) {
    currentProfile = await getProfile(currentUser.id);
  } else {
    currentProfile = null;
  }

  return {
    user: currentUser,
    profile: currentProfile
  };
}

/* =========================
   GLOBAL AUTH UI
   Works with any page using:
   [data-user-name], [data-user-avatar], [data-user-email]
   [data-auth="in"], [data-auth="out"]
========================= */

function setupAuthUI() {
  const displayName = getDisplayName();
  const avatar = getAvatarUrl();

  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = displayName;
  });

  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = currentUser?.email || "";
  });

  document.querySelectorAll("[data-user-avatar]").forEach((el) => {
    if ("src" in el) {
      el.src = avatar;
      el.alt = displayName;
    } else {
      el.style.backgroundImage = `url("${avatar}")`;
    }
  });

  document.querySelectorAll('[data-auth="in"]').forEach((el) => {
    el.hidden = !currentUser;
    el.style.display = currentUser ? "" : "none";
  });

  document.querySelectorAll('[data-auth="out"]').forEach((el) => {
    el.hidden = Boolean(currentUser);
    el.style.display = currentUser ? "none" : "";
  });

  document.body.classList.toggle("is-signed-in", Boolean(currentUser));
  document.body.classList.toggle("is-signed-out", !currentUser);
}

/* =========================
   GLOBAL ACTIONS
========================= */

function setupGlobalActions() {
  if (globalActionsBound) return;
  globalActionsBound = true;

  document.addEventListener("click", async (event) => {
    const logoutButton = event.target.closest("[data-logout], #logoutBtn, #rb-logout-btn");
    if (!logoutButton) return;

    event.preventDefault();

    try {
      logoutButton.disabled = true;
      logoutButton.dataset.originalText = logoutButton.textContent || "";
      logoutButton.textContent = "Logging out...";

      await supabaseSignOut(null);

      currentUser = null;
      currentProfile = null;

      setupAuthUI();

      window.location.href = ROUTES.auth;
    } catch (error) {
      console.error("[core/app] logout failed:", error);
      logoutButton.disabled = false;
      logoutButton.textContent = logoutButton.dataset.originalText || "Logout";
    }
  });
}

/* =========================
   AUTH LISTENER
========================= */

function bindAuthListener() {
  if (authSubscription) return;

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const previousUserId = currentUser?.id || null;
    const nextUser = session?.user || null;
    const nextUserId = nextUser?.id || null;
    const userChanged = previousUserId !== nextUserId;

    currentUser = nextUser;
    currentProfile = nextUserId ? await getProfile(nextUserId) : null;

    setupAuthUI();

    dispatchAppEvent("rb:auth-changed", {
      event,
      user: currentUser,
      profile: currentProfile,
      changed: userChanged
    });
  });

  authSubscription = data?.subscription || null;
}

/* =========================
   PUBLIC HELPERS
========================= */

export async function requireCurrentUser(redirectTo = ROUTES.auth) {
  if (currentUser?.id) return currentUser;

  await hydrateSessionState();

  if (!currentUser?.id && redirectTo) {
    window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.href)}`;
    return null;
  }

  return currentUser;
}

export async function reloadCurrentProfile() {
  if (!currentUser?.id) return null;

  currentProfile = await getCurrentProfile();
  setupAuthUI();

  dispatchAppEvent("rb:profile-updated", {
    user: currentUser,
    profile: currentProfile
  });

  return currentProfile;
}

export function getDisplayName() {
  return (
    currentProfile?.display_name ||
    currentProfile?.full_name ||
    currentProfile?.username ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.username ||
    currentUser?.email?.split("@")[0] ||
    "Rich Bizness User"
  );
}

export function getAvatarUrl() {
  return (
    currentProfile?.avatar_url ||
    currentProfile?.profile_image_url ||
    currentProfile?.profile_image ||
    BRAND_IMAGES.avatar ||
    BRAND_IMAGES.logo
  );
}

export function getBannerUrl() {
  return (
    currentProfile?.banner_url ||
    currentProfile?.cover_url ||
    currentProfile?.cover_image_url ||
    BRAND_IMAGES.homeHero ||
    BRAND_IMAGES.fallback
  );
}

export function dispatchAppEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      detail
    })
  );
}

export function onAppEvent(name, callback) {
  if (typeof callback !== "function") return () => {};

  document.addEventListener(name, callback);

  return () => {
    document.removeEventListener(name, callback);
  };
}

export function destroyApp() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  appBooted = false;
  bootPromise = null;
}

export function isAppBooted() {
  return appBooted;
}

/* =========================
   SMALL UTILITIES
========================= */

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function setText(selectorOrEl, value = "") {
  const el =
    typeof selectorOrEl === "string"
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;

  if (el) el.textContent = value;
}

export function setHtml(selectorOrEl, value = "") {
  const el =
    typeof selectorOrEl === "string"
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;

  if (el) el.innerHTML = value;
}

// =========================
// 🔥 GLOBAL UI SYNC BOOST (ADD ONLY)
// =========================

document.addEventListener("rb:auth-changed", (e) => {
  const { user, profile } = e.detail || {};

  // force nav + UI refresh everywhere
  document.body.classList.toggle("is-signed-in", !!user);
  document.body.classList.toggle("is-signed-out", !user);

  console.log("🔥 AUTH SYNC", user?.id);
});

document.addEventListener("rb:profile-updated", (e) => {
  const { profile } = e.detail || {};

  console.log("🔥 PROFILE SYNC", profile?.id);

  // future hook for live UI updates (avatar, nav, etc)
});
