// =========================
// RICH BIZNESS GLOBAL NAV — FINAL ELITE GOD MODE
// /core/nav.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

export function mountEliteNav({ target = "#elite-platform-nav", collapsed = false } = {}) {
  const container = document.querySelector(target);
  if (!container) return;

  const supabase = getSupabase();
  let user = getCurrentUserState();

  const currentPath = window.location.pathname;

  const links = [
    ["Home", "/index.html"],
    ["Feed", "/feed.html"],
    ["Watch", "/watch.html"],
    ["Live", "/live.html"],
    ["Music", "/music.html"],
    ["Gaming", "/gaming.html"],
    ["Sports", "/sports.html"],
    ["Gallery", "/gallery.html"],
    ["Upload", "/upload.html"],
    ["Store", "/store.html"],
    ["Meta", "/metaverse.html"],
    ["Dashboard", "/creator-dashboard.html"]
  ];

  function isActive(href) {
    return currentPath === href || currentPath.endsWith(href.replace("/", ""));
  }

  function renderLinks() {
    return links.map(([label, href]) => {
      return `
        <a class="${isActive(href) ? "active" : ""}" href="${href}">
          ${label}
        </a>
      `;
    }).join("");
  }

  function renderSession() {
    if (!user) {
      return `
        <a class="rb-nav-action ghost" href="/auth.html">Tap In 🔓</a>
      `;
    }

    return `
      <a class="rb-nav-action ghost" href="/messages.html">Messages</a>
      <a class="rb-nav-action ghost" href="/notifications.html">Alerts</a>
      <a class="rb-nav-action primary" href="/profile.html">Profile</a>
      <button class="rb-nav-action ghost" id="rb-logout-btn" type="button">Tap Out 🚪</button>
    `;
  }

  function render() {
    container.innerHTML = `
      <nav class="rb-global-nav ${collapsed ? "collapsed" : ""}">
        <div class="rb-nav-inner">

          <div class="rb-nav-top">
            <a href="/index.html" class="rb-brand">
              <img src="/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png" />
              <span>
                <strong>Rich Bizness</strong>
                <small>Creator Empire</small>
              </span>
            </a>

            <button class="rb-mobile-menu-btn" id="rb-mobile-menu-btn" type="button">
              ☰
            </button>

            <div class="rb-nav-right" id="rb-session-area">
              ${renderSession()}
            </div>
          </div>

          <!-- TOP NAV LINKS -->
          <div class="rb-nav-links" id="rb-nav-links">
            ${renderLinks()}
          </div>

        </div>
      </nav>

      <!-- 🔥 MOBILE APP NAV (BOTTOM) -->
      <div class="rb-bottom-nav">
        ${links.slice(0, 5).map(([label, href]) => `
          <a class="rb-bottom-btn ${isActive(href) ? "active" : ""}" href="${href}">
            <span>${label}</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function bind() {
    const logoutBtn = container.querySelector("#rb-logout-btn");
    const menuBtn = container.querySelector("#rb-mobile-menu-btn");
    const navLinks = container.querySelector("#rb-nav-links");

    logoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/index.html";
    });

    menuBtn?.addEventListener("click", () => {
      navLinks?.classList.toggle("is-open");
    });
  }

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    user = data?.session?.user || null;

    const sessionArea = container.querySelector("#rb-session-area");
    if (sessionArea) {
      sessionArea.innerHTML = renderSession();
      bind();
    }
  }

  render();
  bind();

  supabase.auth.onAuthStateChange(() => {
    refreshSession();
  });
}
