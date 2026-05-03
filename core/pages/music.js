// =========================
// RICH BIZNESS — MUSIC PAGE
// =========================

import { initApp, getSupabase } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();

mountEliteNav({ target: "#elite-platform-nav" });

const feed = document.getElementById("music-feed");

const playerAudio = document.getElementById("player-audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerCover = document.getElementById("player-cover");

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

  renderTracks(data);
}

// =========================
// RENDER TRACKS
// =========================

function renderTracks(tracks) {
  feed.innerHTML = "";

  tracks.forEach(track => {
    const card = document.createElement("div");
    card.className = "music-card";

    card.innerHTML = `
      <img src="${track.cover_url || '/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png'}" />
      <div>
        <h3>${track.title}</h3>
        <p>${track.artist_name}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      playTrack(track);
    });

    feed.appendChild(card);
  });
}

// =========================
// PLAY TRACK
// =========================

function playTrack(track) {
  playerAudio.src = track.audio_url;
  playerTitle.innerText = track.title;
  playerArtist.innerText = track.artist_name;
  playerCover.src = track.cover_url || "";

  playerAudio.play();
}

// =========================
// INIT
// =========================

loadTracks();
