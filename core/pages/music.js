// =========================
// RICH BIZNESS — ELITE MUSIC ENGINE (FINAL)
// /core/pages/music.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const feed = document.getElementById("music-feed");

// PLAYER
const playerBar = document.getElementById("player-bar");
const playerAudio = document.getElementById("player-audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerCover = document.getElementById("player-cover");

let tracks = [];
let unlockedMap = {};

// =========================
// LOAD EVERYTHING
// =========================

async function loadAll() {
  await loadTracks();
  await loadUnlocks();
  render();
}

// =========================
// LOAD TRACKS
// =========================

async function loadTracks() {
  const { data } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  tracks = data || [];
}

// =========================
// LOAD UNLOCKS
// =========================

async function loadUnlocks() {
  if (!user) return;

  const { data } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", user.id);

  unlockedMap = {};

  (data || []).forEach(u => {
    unlockedMap[u.product_id] = true;
  });
}

// =========================
// RENDER
// =========================

function render() {
  feed.innerHTML = "";

  tracks.forEach((t, i) => {
    const unlocked = unlockedMap[t.product_id];

    const el = document.createElement("div");
    el.className = "music-card";

    el.innerHTML = `
      <img src="${t.cover_url || ''}" class="cover"/>

      <div class="music-info">
        <h3>${t.title}</h3>
        <p>${t.artist_name}</p>

        ${
          unlocked
            ? `<button class="play-btn">▶️ Play</button>`
            : `
              <button class="unlock-btn">
                🔒 Unlock $${((t.price_cents || 199)/100).toFixed(2)}
              </button>
            `
        }
      </div>
    `;

    // PLAY
    if (unlocked) {
      el.querySelector(".play-btn").onclick = () => play(i);
    }

    // UNLOCK
    if (!unlocked) {
      el.querySelector(".unlock-btn").onclick = () =>
        startCheckout(t);
    }

    feed.appendChild(el);
  });
}

// =========================
// PLAY
// =========================

async function play(i) {
  const t = tracks[i];

  playerBar.style.display = "flex";

  playerAudio.src = t.audio_url;
  playerTitle.innerText = t.title;
  playerArtist.innerText = t.artist_name;
  playerCover.src = t.cover_url || "";

  playerAudio.play();
}

// =========================
// STRIPE CHECKOUT
// =========================

async function startCheckout(track) {
  if (!user) {
    alert("Sign in first");
    return;
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session.access_token;

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mode: "music_unlock",
      productId: track.product_id,
      trackId: track.id
    })
  });

  const data = await res.json();

  if (!data.checkoutUrl) {
    alert("Checkout failed");
    return;
  }

  window.location.href = data.checkoutUrl;
}

// =========================
// AUTO REFRESH AFTER PAYMENT
// =========================

if (window.location.search.includes("session_id")) {
  setTimeout(() => {
    loadAll();
  }, 1500);
}

// =========================

loadAll();
