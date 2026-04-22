// core/app.js

import { supabase, getUser, getProfile } from '/core/supabase.js';
import { ROUTES, BRAND_IMAGES } from '/core/config.js';

// 🌍 GLOBAL STATE
let currentUser = null;
let currentProfile = null;

// 🚀 INIT APP
export async function initApp() {
  currentUser = await getUser();

  if (currentUser) {
    currentProfile = await getProfile(currentUser.id);
  }

  setupGlobalNav();
  setupAuthUI();
  setupGlobalActions();
}

// 🧭 NAV SYSTEM
function setupGlobalNav() {
  const navContainer = document.getElementById('global-session-nav');
  if (!navContainer) return;

  navContainer.innerHTML = '';

  if (!currentUser) {
    navContainer.innerHTML = `
      <a class="nav-link" href="${ROUTES.auth}">Login</a>
      <a class="btn" href="${ROUTES.auth}">Join</a>
    `;
    return;
  }

  const avatar =
    currentProfile?.avatar_url ||
    currentProfile?.profile_image_url ||
    BRAND_IMAGES.logo;

  navContainer.innerHTML = `
    <a class="nav-link" href="${ROUTES.notifications}">🔔</a>
    <a class="nav-link" href="${ROUTES.messages}">💬</a>
    <a class="nav-link" href="${ROUTES.profile}">
      <img src="${avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />
    </a>
    <button class="btn-ghost" id="logoutBtn">Logout</button>
  `;
}

// 🔐 AUTH UI
function setupAuthUI() {
  if (!currentUser) return;

  const nameTargets = document.querySelectorAll('[data-user-name]');
  const avatarTargets = document.querySelectorAll('[data-user-avatar]');

  nameTargets.forEach(el => {
    el.textContent =
      currentProfile?.display_name ||
      currentProfile?.username ||
      currentUser.email;
  });

  avatarTargets.forEach(el => {
    el.src =
      currentProfile?.avatar_url ||
      currentProfile?.profile_image_url ||
      BRAND_IMAGES.logo;
  });
}

// ⚡ GLOBAL ACTIONS
function setupGlobalActions() {
  document.addEventListener('click', async (e) => {
    // LOGOUT
    if (e.target.id === 'logoutBtn') {
      await supabase.auth.signOut();
      window.location.href = ROUTES.auth;
    }
  });
}

// 📡 SESSION LISTENER
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    window.location.reload();
  } else {
    window.location.reload();
  }
});
