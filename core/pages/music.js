// =========================
// RICH BIZNESS — MUSIC PAGE (TURNED UP)
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const feed = document.getElementById("music-feed");

const playerAudio = document.getElementById("player-audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerCover = document.getElementById("player-cover");

let currentTrack = null;

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
// RENDER
// =========================

function renderTracks(tracks) {
  feed.innerHTML = "";

  tracks.forEach(track => {
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
          <button class="repost-btn">🔁</button>
          <span class="stat"🎧 ${track.play_count || 0}</span>
        </div>
      </div>
    `;

    // PLAY
    card.querySelector(".play-btn").onclick = () => {
      playTrack(track);
    };

    // LIKE
    card.querySelector(".like-btn").onclick = async (e) => {
      e.stopPropagation();

      await supabase
        .from("tracks")
        .update({ like_count: (track.like_count || 0) + 1 })
        .eq("id", track.id);

      loadTracks();
    };

    // REPOST (simple for now)
    card.querySelector(".repost-btn").onclick = (e) => {
      e.stopPropagation();
      alert("🔁 Reposted (we’ll upgrade this next)");
    };

    feed.appendChild(card);
  });
}

// =========================
// PLAY TRACK
// =========================

async function playTrack(track) {
  currentTrack = track;

  playerAudio.src = track.audio_url;
  playerTitle.innerText = track.title;
  playerArtist.innerText = track.artist_name;
  playerCover.src = track.cover_url || "";

  playerAudio.play();

  // INCREASE PLAY COUNT
  await supabase
    .from("tracks")
    .update({ play_count: (track.play_count || 0) + 1 })
    .eq("id", track.id);

  loadTracks();
}

// =========================
// INIT
// =========================

loadTracks();
