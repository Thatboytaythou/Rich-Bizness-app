// =========================
// RICH BIZNESS GLOBAL NAV
// /core/nav.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

export function mountEliteNav({ target = "#elite-platform-nav", collapsed = false } = {}) {
  const container = document.querySelector(target);
  if (!container) return;

  const supabase = getSupabase();
  let user = getCurrentUserState();

  function render() {
    container.innerHTML = `
      <nav class="rb-global-nav ${collapsed ? "collapsed" : ""}">
        <div class="rb-nav-left">
          <a href="/index.html" class="rb-brand">
            <img src="/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png" />
            <span>Rich Bizness</span>
          </a>

          <div class="rb-nav-links">
            <a href="/feed.html">Feed</a>
            <a href="/watch.html">Watch</a>
            <a href="/live.html">Live</a>
            <a href="/music.html">Music</a>
            <a href="/gaming.html">Gaming</a>
            <a href="/sports.html">Sports</a>
            <a href="/gallery.html">Gallery</a>
          </div>
        </div>

        <div class="rb-nav-right" id="rb-session-area">
          ${renderSession()}
        </div>
      </nav>
    `;
  }

  function renderSession() {
    if (!user) {
      return `
        <a class="btn-ghost" href="/auth.html">Tap In 🔓</a>
      `;
    }

    return `
      <a class="btn-ghost" href="/messages.html">Messages</a>
      <a class="btn-ghost" href="/notifications.html">Alerts</a>
      <a class="btn" href="/profile.html">Profile</a>
      <button class="btn-ghost" id="rb-logout-btn">Tap Out 🚪</button>
    `;
  }

  function bind() {
    const logoutBtn = document.getElementById("rb-logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = "/index.html";
      };
    }
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

  // keep session synced
  supabase.auth.onAuthStateChange(() => {
    refreshSession();
  });
}
