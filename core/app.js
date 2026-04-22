// core/app.js

import { supabase, getUser, getProfile } from '/core/supabase.js';
import { ROUTES, BRAND_IMAGES } from '/core/config.js';

let currentUser = null;
let currentProfile = null;
let appBooted = false;
let authSubscription = null;
let logoutBound = false;
let navRenderedForUserId = null;

export function getCurrentUserState() {
  return currentUser;
}

export function getCurrentProfileState() {
  return currentProfile;
}

export async function initApp() {
  await hydrateSessionState();
  setupGlobalNav();
  setupAuthUI();
  setupGlobalActions();
  bindAuthListener();

  appBooted = true;

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
}

function setupGlobalNav() {
  const navContainer = document.getElementById('global-session-nav');
  if (!navContainer) return;

  const currentUserId = currentUser?.id || 'guest';

  if (navRenderedForUserId === currentUserId && navContainer.dataset.rbReady === 'true') {
    return;
  }

  navRenderedForUserId = currentUserId;
  navContainer.dataset.rbReady = 'true';

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
    currentProfile?.profile_image ||
    BRAND_IMAGES.logo;

  const displayName =
    currentProfile?.display_name ||
    currentProfile?.username ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.username ||
    currentUser?.email ||
    'Profile';

  navContainer.innerHTML = `
    <a class="nav-link" href="${ROUTES.notifications}" aria-label="Notifications">🔔</a>
    <a class="nav-link" href="${ROUTES.messages}" aria-label="Messages">💬</a>
    <a class="nav-link" href="${ROUTES.profile}" aria-label="Profile">
      <img
        src="${escapeHtml(avatar)}"
        alt="${escapeHtml(displayName)}"
        style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;"
      />
    </a>
    <button class="btn-ghost" id="logoutBtn" type="button">Logout</button>
  `;
}

function setupAuthUI() {
  const nameTargets = document.querySelectorAll('[data-user-name]');
  const avatarTargets = document.querySelectorAll('[data-user-avatar]');
  const emailTargets = document.querySelectorAll('[data-user-email]');
  const loggedInTargets = document.querySelectorAll('[data-auth="in"]');
  const loggedOutTargets = document.querySelectorAll('[data-auth="out"]');

  const displayName =
    currentProfile?.display_name ||
    currentProfile?.username ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.username ||
    currentUser?.email ||
    'Rich Bizness User';

  const avatar =
    currentProfile?.avatar_url ||
    currentProfile?.profile_image_url ||
    currentProfile?.profile_image ||
    BRAND_IMAGES.logo;

  nameTargets.forEach((el) => {
    el.textContent = displayName;
  });

  avatarTargets.forEach((el) => {
    if ('src' in el) {
      el.src = avatar;
    }
  });

  emailTargets.forEach((el) => {
    el.textContent = currentUser?.email || '';
  });

  loggedInTargets.forEach((el) => {
    el.style.display = currentUser ? '' : 'none';
  });

  loggedOutTargets.forEach((el) => {
    el.style.display = currentUser ? 'none' : '';
  });
}

function setupGlobalActions() {
  if (logoutBound) return;
  logoutBound = true;

  document.addEventListener('click', async (event) => {
    const logoutButton = event.target.closest('#logoutBtn');
    if (!logoutButton) return;

    try {
      logoutButton.disabled = true;
      logoutButton.textContent = 'Logging out...';
      await supabase.auth.signOut();
      window.location.href = ROUTES.auth;
    } catch (error) {
      console.error('[core/app] logout failed:', error);
      logoutButton.disabled = false;
      logoutButton.textContent = 'Logout';
    }
  });
}

function bindAuthListener() {
  if (authSubscription) return;

  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUser = session?.user || null;
    const previousUserId = currentUser?.id || null;
    const nextUserId = nextUser?.id || null;
    const userChanged = previousUserId !== nextUserId;

    currentUser = nextUser;
    currentProfile = nextUserId ? await getProfile(nextUserId) : null;

    navRenderedForUserId = null;
    setupGlobalNav();
    setupAuthUI();

    document.dispatchEvent(
      new CustomEvent('rb:auth-changed', {
        detail: {
          user: currentUser,
          profile: currentProfile,
          changed: userChanged
        }
      })
    );
  });

  authSubscription = data?.subscription || null;
}

export function destroyApp() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  appBooted = false;
  navRenderedForUserId = null;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
