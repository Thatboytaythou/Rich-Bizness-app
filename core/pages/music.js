// =========================
// RICH BIZNESS — ELITE MUSIC ENGINE (FINAL FINAL)
// /core/pages/music.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let user = getCurrentUserState();

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
  await refreshUser();
  await loadTracks();
  await loadUnlocks();
  render();
}

// =========================
// ALWAYS REFRESH USER
// =========================

async function refreshUser() {
  const { data } = await supabase.auth.getUser();
  user = data?.user || null;
}

// =========================
// LOAD TRACKS
// =========================

async function loadTracks() {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("TRACK LOAD ERROR:", error);
    tracks = [];
    return;
  }

  tracks = data || [];
}

// =========================
// LOAD UNLOCKS (FIXED)
// =========================

async function loadUnlocks() {
  unlockedMap = {};

  if (!user) return;

  const { data, error } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("UNLOCK LOAD ERROR:", error);
    return;
  }

  (data || []).forEach(u => {
    if (u.product_id) {
      unlockedMap[u.product_id] = true;
    }
  });
}

// =========================
// RENDER (UPGRADED UI)
// =========================

function render() {
  feed.innerHTML = "";

  tracks.forEach((t, i) => {
    const unlocked = unlockedMap[t.product_id];

    const el = document.createElement("div");
    el.className = "rb-track-card";

    el.innerHTML = `
      <div class="rb-cover-wrap">
        <img src="${t.cover_url || ''}" class="rb-cover"/>

        ${
          !unlocked
            ? `
          <div class="rb-lock-overlay">
            🔒
            <span>$${((t.price_cents || 199) / 100).toFixed(2)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="rb-track-info">
        <h3>${t.title}</h3>
        <p>${t.artist_name}</p>

        <div class="rb-actions">
          ${
            unlocked
              ? `<button class="rb-play">▶ Play</button>`
              : `<button class="rb-unlock">Unlock</button>`
          }

          <div class="rb-stats">
            ❤️ ${t.like_count || 0}
            🎧 ${t.play_count || 0}
          </div>
        </div>
      </div>
    `;

    // PLAY
    if (unlocked) {
      el.querySelector(".rb-play").onclick = () => play(i);
    }

    // UNLOCK
    if (!unlocked) {
      el.querySelector(".rb-unlock").onclick = () =>
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

  // increment play count (safe)
  await supabase
    .from("tracks")
    .update({ play_count: (t.play_count || 0) + 1 })
    .eq("id", t.id);
}

// =========================
// STRIPE CHECKOUT (FIXED)
// =========================

async function startCheckout(track) {
  if (!user) {
    alert("Sign in first");
    return;
  }

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    alert("Session expired");
    return;
  }

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mode: "music_unlock",
      productId: track.product_id,
      trackId: track.id,
      linkedRecordId: track.id
    })
  });

  const result = await res.json();

  if (!result.checkoutUrl) {
    console.error(result);
    alert("Checkout failed");
    return;
  }

  window.location.href = result.checkoutUrl;
}

// =========================
// PAYMENT RETURN HANDLER (FIXED)
// =========================

async function handleReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) return;

  console.log("Payment return detected");

  // give webhook time to write unlock
  setTimeout(async () => {
    await loadUnlocks();
    render();
  }, 2000);
}

// =========================
// INIT
// =========================

await loadAll();
handleReturn();
