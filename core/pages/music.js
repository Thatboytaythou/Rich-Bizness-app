// =========================
// RICH BIZNESS — MUSIC PAGE (ELITE PLAYER)
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const feed = document.getElementById("music-feed");

// PLAYER UI
const playerBar = document.getElementById("player-bar");
const playerAudio = document.getElementById("player-audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerCover = document.getElementById("player-cover");

const playPauseBtn = document.getElementById("player-play");
const nextBtn = document.getElementById("player-next");
const prevBtn = document.getElementById("player-prev");

let tracks = [];
let currentIndex = 0;

// =========================
// LOAD TRACKS
// =========================

async function loadTracks() {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    feed.innerHTML = "Failed to load music";
    return;
  }

  tracks = data;
  renderTracks();
}

// =========================
// RENDER TRACKS
// =========================

function renderTracks() {
  feed.innerHTML = "";

  tracks.forEach((track, index) => {
    const card = document.createElement("div");
    card.className = "music-card";

    card.innerHTML = `
      <img src="${track.cover_url || '/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png'}" />
      
      <div class="music-info">
        <h3>${track.title}</h3>
        <p>${track.artist_name}</p>

        <div class="music-actions">
          <button class="play-btn">▶️</button>
          <button class="like-btn">❤️ ${track.like_count || 0}</button>
          <span>🎧 ${track.play_count || 0}</span>
        </div>
      </div>
    `;

    // PLAY BUTTON
    card.querySelector(".play-btn").onclick = (e) => {
      e.stopPropagation();
      playTrack(index);
    };

    // CLICK WHOLE CARD
    card.onclick = () => playTrack(index);

    // LIKE BUTTON (NO RELOAD)
    card.querySelector(".like-btn").onclick = async (e) => {
      e.stopPropagation();

      const newLikes = (track.like_count || 0) + 1;

      await supabase
        .from("tracks")
        .update({ like_count: newLikes })
        .eq("id", track.id);

      e.target.innerText = `❤️ ${newLikes}`;
    };

    feed.appendChild(card);
  });
}

// =========================
// PLAY TRACK
// =========================

async function playTrack(index) {
  const track = tracks[index];
  currentIndex = index;

  playerBar.style.display = "flex";

  playerAudio.src = track.audio_url;
  playerTitle.innerText = track.title;
  playerArtist.innerText = track.artist_name;
  playerCover.src = track.cover_url || "";

  playerAudio.play();

  // UPDATE PLAY COUNT (no reload)
  await supabase
    .from("tracks")
    .update({ play_count: (track.play_count || 0) + 1 })
    .eq("id", track.id);
}

// =========================
// PLAYER CONTROLS
// =========================

// PLAY / PAUSE
playPauseBtn.onclick = () => {
  if (playerAudio.paused) {
    playerAudio.play();
    playPauseBtn.innerText = "⏸";
  } else {
    playerAudio.pause();
    playPauseBtn.innerText = "▶️";
  }
};

// NEXT
nextBtn.onclick = () => {
  currentIndex = (currentIndex + 1) % tracks.length;
  playTrack(currentIndex);
};

// PREV
prevBtn.onclick = () => {
  currentIndex =
    (currentIndex - 1 + tracks.length) % tracks.length;
  playTrack(currentIndex);
};

// AUTO NEXT SONG
playerAudio.onended = () => {
  nextBtn.click();
};

// =========================
// INIT
// =========================

loadTracks();
