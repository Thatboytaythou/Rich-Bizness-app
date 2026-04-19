import { getCurrentUser, logoutUser, onAuthStateChange } from "./auth.js";

function qs(root, selector) {
  return root.querySelector(selector);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDisplayName(user) {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email ||
    "Account"
  );
}

function getProfileHref(user) {
  if (user?.id) {
    return `/profile.html?id=${encodeURIComponent(user.id)}`;
  }
  return "/profile.html";
}

function renderNavbar(user) {
  const shell = document.getElementById("global-session-nav");
  if (!shell) return;

  const displayName = escapeHtml(getDisplayName(user));
  const profileHref = getProfileHref(user);

  if (user) {
    shell.innerHTML = `
      <a class="nav-link" href="${profileHref}">${displayName}</a>
      <button class="btn-ghost" id="global-logout-btn" type="button">Logout</button>
    `;
  } else {
    shell.innerHTML = `
      <a class="nav-link" href="/auth.html">Login</a>
      <a class="btn" href="/auth.html">Sign Up</a>
    `;
  }

  const logoutBtn = document.getElementById("global-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        await logoutUser();
        window.location.href = "/auth.html";
      } catch (error) {
        console.error("[navbar-session] logout error:", error);
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
      }
    });
  }
}

async function bootNavbarSession() {
  try {
    const user = await getCurrentUser();
    renderNavbar(user);
  } catch (error) {
    console.error("[navbar-session] boot error:", error);
    renderNavbar(null);
  }

  onAuthStateChange(async () => {
    try {
      const user = await getCurrentUser();
      renderNavbar(user);
    } catch (error) {
      console.error("[navbar-session] auth change error:", error);
      renderNavbar(null);
    }
  });
}

document.addEventListener("DOMContentLoaded", bootNavbarSession);
