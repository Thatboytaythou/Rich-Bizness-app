// /src/shared/navbar-session.js

import {
  getCurrentUserSafe,
  getCurrentProfileSafe,
  signOutUser,
  watchAuthState
} from "/core/auth.js";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDisplayName(user, profile) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.handle ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email ||
    "Account"
  );
}

function getAvatar(profile) {
  return (
    profile?.profile_image_url ||
    profile?.avatar_url ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png"
  );
}

function getProfileHref(user) {
  if (user?.id) {
    return `/profile.html?id=${encodeURIComponent(user.id)}`;
  }
  return "/profile.html";
}

function renderNavbar(user, profile = null) {
  const shell = document.getElementById("global-session-nav");
  if (!shell) return;

  if (!user) {
    shell.innerHTML = `
      <a class="nav-link" href="/auth.html">Login</a>
      <a class="btn" href="/auth.html">Sign Up</a>
    `;
    return;
  }

  const displayName = escapeHtml(getDisplayName(user, profile));
  const profileHref = getProfileHref(user);
  const avatarUrl = getAvatar(profile);

  shell.innerHTML = `
    <a
      class="nav-link"
      href="${profileHref}"
      style="display:inline-flex;align-items:center;gap:10px;"
    >
      <img
        src="${avatarUrl}"
        alt="${displayName}"
        style="width:30px;height:30px;border-radius:999px;object-fit:cover;border:1px solid rgba(255,255,255,0.12);"
      />
      <span>${displayName}</span>
    </a>
    <button class="btn-ghost" id="global-logout-btn" type="button">Logout</button>
  `;

  const logoutBtn = document.getElementById("global-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        await signOutUser("/auth.html");
      } catch (error) {
        console.error("[navbar-session] logout error:", error);
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
      }
    });
  }
}

async function syncNavbarSession() {
  try {
    const user = await getCurrentUserSafe();

    if (!user) {
      renderNavbar(null, null);
      return;
    }

    const profile = await getCurrentProfileSafe(true);
    renderNavbar(user, profile);
  } catch (error) {
    console.error("[navbar-session] sync error:", error);
    renderNavbar(null, null);
  }
}

async function bootNavbarSession() {
  await syncNavbarSession();

  watchAuthState({
    onSignedIn: async () => {
      await syncNavbarSession();
    },
    onSignedOut: async () => {
      renderNavbar(null, null);
    },
    reloadOnChange: false
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootNavbarSession, { once: true });
} else {
  bootNavbarSession();
}
