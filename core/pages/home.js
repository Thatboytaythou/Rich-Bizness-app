// =========================
// RICH BIZNESS HOME CONTROLLER
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
      <button id="logout-btn" class="btn-ghost">Tap Out 🚪</button>
    `;

    document.getElementById("logout-btn").onclick = async () => {
      await supabase.auth.signOut();
      location.reload();
    };
  } else {
    container.innerHTML = `
      <a href="/auth.html" class="btn btn-gold">Tap In 🔓</a>
      <a href="/auth.html" class="btn-ghost">Join Now</a>
    `;
  }
}

await hydrateAuthBar();

// =========================
// HERO MOTION SYSTEM
// =========================

// subtle floating particles
function spawnParticles() {
  const container = document.querySelector(".hero-particles");
  if (!container) return;

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

// inject animation keyframes once
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

  // if you add a real video later, just drop file here:
  const VIDEO_SRC = "/videos/rich-bizness-hero.mp4";

  // don't break if file doesn't exist yet
  fetch(VIDEO_SRC, { method: "HEAD" })
    .then(res => {
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
// SMOOTH SCROLL (OPTIONAL UX)
// =========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});

// =========================
// DEBUG SAFE LOG
// =========================
console.log("🏠 Rich Bizness Home Loaded — FULL SYSTEM ACTIVE");
