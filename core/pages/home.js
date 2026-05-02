// =========================
// RICH BIZNESS HOME — FINAL LOCKED (NO DOWNGRADE)
// /core/pages/home.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail } from "/core/features/live/live-rail.js";

// =========================
// INIT (LOCKED)
// =========================
await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

// =========================
// NAV (MATCH INDEX)
// =========================
mountEliteNav({
  target: "#elite-platform-nav",
  collapsed: false
});

// =========================
// LIVE RAIL (REAL SYSTEM)
// =========================
await bootLiveRail({
  railElementId: "homepage-live-rail",
  limit: 6,
  autoRefresh: true,
  intervalMs: 12000,
  channelKey: "homepage"
});

// =========================
// SESSION UI (TOP NAV)
// =========================
async function hydrateTopSessionNav() {
  const el = document.getElementById("global-session-nav");
  if (!el) return;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (currentUser) {
    el.innerHTML = `
      <a href="/profile.html">Profile</a>
      <a href="/messages.html">Messages</a>
      <a href="/notifications.html">Alerts</a>
      <button id="rb-logout-top">Tap Out 🚪</button>
    `;

    document.getElementById("rb-logout-top")?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });

    return;
  }

  el.innerHTML = `
    <a href="/auth.html">Tap In 🔓</a>
    <a href="/auth.html">Join The Bizness</a>
  `;
}

// =========================
// AUTH BAR (BOTTOM MATCH)
// =========================
async function hydrateAuthBar() {
  const el = document.getElementById("auth-bar-actions");
  if (!el) return;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (currentUser) {
    el.innerHTML = `
      <a href="/profile.html" class="btn">My Profile 👤</a>
      <button id="rb-logout-bottom" class="btn-ghost">Tap Out 🚪</button>
    `;

    document.getElementById("rb-logout-bottom")?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });

    return;
  }

  el.innerHTML = `
    <a href="/auth.html" class="btn btn-gold">Tap In 🔓</a>
    <a href="/auth.html" class="btn-ghost">Join The Bizness</a>
  `;
}

// =========================
// SESSION SYNC (REAL FIX)
// =========================
async function syncSessionUI() {
  await hydrateTopSessionNav();
  await hydrateAuthBar();
}

await syncSessionUI();

supabase.auth.onAuthStateChange(async () => {
  await syncSessionUI();
});

// =========================
// HERO PARTICLES (MATCH DESIGN)
// =========================
function injectParticleStyles() {
  if (document.getElementById("rb-particles-style")) return;

  const style = document.createElement("style");
  style.id = "rb-particles-style";

  style.innerHTML = `
    @keyframes floatUp {
      0% { transform: translateY(0) scale(1); opacity: 0; }
      10% { opacity: 1; }
      100% { transform: translateY(-120vh) scale(1.4); opacity: 0; }
    }
  `;

  document.head.appendChild(style);
}

function spawnParticles() {
  const container = document.querySelector(".hero-particles");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 20; i++) {
    const dot = document.createElement("span");

    dot.style.position = "absolute";
    dot.style.width = `${Math.random() * 6 + 4}px`;
    dot.style.height = dot.style.width;
    dot.style.borderRadius = "50%";
    dot.style.background = "rgba(105,255,180,0.25)";
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.bottom = "-20px";
    dot.style.animation = `floatUp ${12 + Math.random() * 10}s linear infinite`;
    dot.style.animationDelay = `${Math.random() * 10}s`;

    container.appendChild(dot);
  }
}

injectParticleStyles();
spawnParticles();

// =========================
// HERO VIDEO (SAFE + ELITE)
// =========================
function initHeroVideo() {
  const video = document.querySelector(".hero-video-layer");
  if (!video) return;

  const SRC = "/videos/rich-bizness-hero.mp4";

  fetch(SRC, { method: "HEAD" })
    .then((res) => {
      if (res.ok) {
        video.src = SRC;
        video.style.opacity = "0.35";
      } else {
        video.style.display = "none";
      }
    })
    .catch(() => {
      video.style.display = "none";
    });
}

initHeroVideo();

// =========================
// SMOOTH SCROLL (KEEP)
// =========================
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});

// =========================
// FINAL CONFIRM
// =========================
console.log("🔥 HOME LOCKED — INDEX SYNCED — NO DOWNGRADE");
