// =========================
// RICH BIZNESS — FULL MUSIC ENGINE
// =========================

import { initApp, getSupabase } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();

mountEliteNav({ target: "#elite-platform-nav" });

const feed = document.getElementById("music-feed");

// PLAYER
const playerBar = document.getElementById("player-bar");
const playerAudio = document.getElementById("player-audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerCover = document.getElementById("player-cover");

const playBtn = document.getElementById("player-play");
const nextBtn = document.getElementById("player-next");
const prevBtn = document.getElementById("player-prev");
const progress = document.getElementById("player-progress");

let tracks = [];
let currentIndex = 0;

// =========================
// LOAD
// =========================

async function loadTracks() {
  const { data } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  tracks = data || [];
  render();
}

// =========================
// RENDER
// =========================

function render() {
  feed.innerHTML = "";

  tracks.forEach((t, i) => {
    const el = document.createElement("div");
    el.className = "music-card";

    el.innerHTML = `
      <img src="${t.cover_url || ''}" />
      <div>
        <h3>${t.title}</h3>
        <p>${t.artist_name}</p>

        <div class="music-actions">
          <button class="play">▶️</button>
          <button class="like">❤️ ${t.like_count || 0}</button>
          <span>🎧 ${t.play_count || 0}</span>
        </div>
      </div>
    `;

    el.onclick = () => play(i);

    el.querySelector(".like").onclick = async (e) => {
      e.stopPropagation();

      const newLikes = (t.like_count || 0) + 1;

      await supabase
        .from("tracks")
        .update({ like_count: newLikes })
        .eq("id", t.id);

      e.target.innerText = `❤️ ${newLikes}`;
    };

    feed.appendChild(el);
  });
}

// =========================
// PLAY
// =========================

async function play(i) {
  const t = tracks[i];
  currentIndex = i;

  playerBar.style.display = "flex";

  playerAudio.src = t.audio_url;
  playerTitle.innerText = t.title;
  playerArtist.innerText = t.artist_name;
  playerCover.src = t.cover_url || "";

  playerAudio.play();

  playBtn.innerText = "⏸";

  await supabase
    .from("tracks")
    .update({ play_count: (t.play_count || 0) + 1 })
    .eq("id", t.id);
}

// =========================
// CONTROLS
// =========================

playBtn.onclick = () => {
  if (playerAudio.paused) {
    playerAudio.play();
    playBtn.innerText = "⏸";
  } else {
    playerAudio.pause();
    playBtn.innerText = "▶️";
  }
};

nextBtn.onclick = () => {
  currentIndex = (currentIndex + 1) % tracks.length;
  play(currentIndex);
};

prevBtn.onclick = () => {
  currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  play(currentIndex);
};

// AUTO NEXT
playerAudio.onended = () => nextBtn.click();

// PROGRESS UPDATE
playerAudio.ontimeupdate = () => {
  progress.value =
    (playerAudio.currentTime / playerAudio.duration) * 100 || 0;
};

// SEEK
progress.oninput = () => {
  playerAudio.currentTime =
    (progress.value / 100) * playerAudio.duration;
};

// =========================

loadTracks();
