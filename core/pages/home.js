// =========================
// RICH BIZNESS HOME CONTROLLER — FINAL PATCHED
// /core/pages/home.js
// =========================

import { initApp, getSupabase } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail } from "/core/features/live/live-rail.js";

// =========================
// INIT APP
// =========================
await initApp();

const supabase = getSupabase();

// =========================
// NAVBAR
// =========================
mountEliteNav({
  target: "#elite-platform-nav",
  collapsed: false
});

// =========================
// LIVE RAIL
// =========================
await bootLiveRail({
  railElementId: "homepage-live-rail",
  limit: 6,
  autoRefresh: true,
  intervalMs: 15000,
  channelKey: "homepage"
});

// =========================
// TOPBAR SESSION NAV
// =========================
async function hydrateTopSessionNav() {
  const container = document.getElementById("global-session-nav");
  if (!container) return;

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (session?.user) {
    container.innerHTML = `
      <a href="/profile.html">Profile</a>
      <a href="/messages.html">Messages</a>
      <a href="/notifications.html">Alerts</a>
      <button id="home-topbar-logout-btn" type="button">Tap Out 🚪</button>
    `;

    document.getElementById("home-topbar-logout-btn")?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });

    return;
  }

  container.innerHTML = `
    <a href="/auth.html">Tap In 🔓</a>
    <a href="/auth.html">Join The Bizness</a>
  `;
}

// =========================
// AUTH BAR (BOTTOM)
// =========================
async function hydrateAuthBar() {
  const container = document.getElementById("auth-bar-actions");
  if (!container) return;

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (session?.user) {
    container.innerHTML = `
      <a href="/profile.html" class="btn">My Profile 👤</a>
      <button id="logout-btn" class="btn-ghost" type="button">Tap Out 🚪</button>
    `;

    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });

    return;
  }

  container.innerHTML = `
    <a href="/auth.html" class="btn btn-gold">Tap In 🔓</a>
    <a href="/auth.html" class="btn-ghost">Join The Bizness</a>
  `;
}

await hydrateTopSessionNav();
await hydrateAuthBar();

// =========================
// KEEP HOME SESSION SYNCED
// =========================
supabase.auth.onAuthStateChange(async () => {
  await hydrateTopSessionNav();
  await hydrateAuthBar();
});

// =========================
// HERO MOTION SYSTEM
// =========================
function spawnParticles() {
  const container = document.querySelector(".hero-particles");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 18; i++) {
    const dot = document.createElement("span");

    const size = Math.random() * 6 + 4;
    const left = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = 12 + Math.random() * 10;

    dot.style.position = "absolute";
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.borderRadius = "50%";
    dot.style.background = "rgba(105,255,180,0.25)";
    dot.style.left = `${left}%`;
    dot.style.bottom = "-20px";
    dot.style.animation = `floatUp ${duration}s linear infinite`;
    dot.style.animationDelay = `${delay}s`;

    container.appendChild(dot);
  }
}

function injectParticleStyles() {
  if (document.getElementById("rb-particles-style")) return;

  const style = document.createElement("style");
  style.id = "rb-particles-style";
  style.innerHTML = `
    @keyframes floatUp {
      0% {
        transform: translateY(0) scale(1);
        opacity: 0;
      }

      10% {
        opacity: 1;
      }

      100% {
        transform: translateY(-120vh) scale(1.4);
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(style);
}

injectParticleStyles();
spawnParticles();

// =========================
// HERO VIDEO (OPTIONAL READY)
// =========================
function initHeroVideo() {
  const video = document.querySelector(".hero-video-layer");
  if (!video) return;

  const VIDEO_SRC = "/videos/rich-bizness-hero.mp4";

  fetch(VIDEO_SRC, { method: "HEAD" })
    .then((res) => {
      if (res.ok) {
        video.src = VIDEO_SRC;
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
// SMOOTH SCROLL
// =========================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (event) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});

// =========================
// DEBUG SAFE LOG
// =========================
console.log("🏠 Rich Bizness Home Loaded — FULL SYSTEM ACTIVE");
