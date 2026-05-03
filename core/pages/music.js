// =========================
// RICH BIZNESS MUSIC — FULL ENGINE (TRACKS + RADIO + PODCAST)
// =========================

import { initApp, getSupabase } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();

mountEliteNav({ target: "#elite-platform-nav" });

// =========================
// ELEMENTS
// =========================
const tracksGrid = document.getElementById("music-tracks-grid");
const radioList = document.getElementById("radio-stations-list");
const podcastList = document.getElementById("podcast-shows-list");

const statusBox = document.getElementById("music-status");

const player = document.getElementById("music-audio-player");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");

const refreshBtn = document.getElementById("refresh-music-btn");

// =========================
// STATE
// =========================
let tracks = [];
let radios = [];
let podcasts = [];

// =========================
// LOAD ALL DATA
// =========================
async function loadAll() {
  statusBox.innerText = "Loading music system...";

  await Promise.all([
    loadTracks(),
    loadRadio(),
    loadPodcasts()
  ]);

  statusBox.innerText = "Music system ready 🔥";
}

// =========================
// TRACKS
// =========================
async function loadTracks() {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  tracks = data || [];
  renderTracks();
}

function renderTracks() {
  if (!tracks.length) {
    tracksGrid.innerHTML = `<div class="status-box">No tracks yet</div>`;
    return;
  }

  tracksGrid.innerHTML = tracks.map(t => `
    <div class="track-card">
      <img src="${t.cover_url || '/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png'}" />
      <h3>${t.title || "Untitled"}</h3>
      <p>${t.artist_name || "Unknown Artist"}</p>

      <button class="btn btn-primary" data-play="${t.id}">
        Play
      </button>
    </div>
  `).join("");

  document.querySelectorAll("[data-play]").forEach(btn => {
    btn.onclick = () => {
      const track = tracks.find(t => t.id === btn.dataset.play);
      playTrack(track);
    };
  });
}

function playTrack(track) {
  if (!track?.audio_url) return;

  player.src = track.audio_url;
  player.play();

  playerTitle.innerText = track.title;
  playerArtist.innerText = track.artist_name;

  incrementPlay(track.id);
}

async function incrementPlay(id) {
  await supabase.rpc("increment_play_count", { track_id: id });
}

// =========================
// RADIO
// =========================
async function loadRadio() {
  const { data, error } = await supabase
    .from("radio_stations")
    .select("*");

  if (error) {
    console.warn("No radio table yet");
    radioList.innerHTML = `<div class="status-box">No radio yet</div>`;
    return;
  }

  radios = data || [];

  if (!radios.length) {
    radioList.innerHTML = `<div class="status-box">No stations yet</div>`;
    return;
  }

  radioList.innerHTML = radios.map(r => `
    <div class="radio-card">
      <h3>${r.name || "Station"}</h3>
      <p>${r.description || ""}</p>

      <button class="btn btn-gold" data-radio="${r.stream_url}">
        Play Radio
      </button>
    </div>
  `).join("");

  document.querySelectorAll("[data-radio]").forEach(btn => {
    btn.onclick = () => {
      player.src = btn.dataset.radio;
      player.play();

      playerTitle.innerText = "Live Radio";
      playerArtist.innerText = "Rich Bizness Radio";
    };
  });
}

// =========================
// PODCASTS
// =========================
async function loadPodcasts() {
  const { data, error } = await supabase
    .from("podcast_shows")
    .select("*");

  if (error) {
    console.warn("No podcast table yet");
    podcastList.innerHTML = `<div class="status-box">No podcasts yet</div>`;
    return;
  }

  podcasts = data || [];

  if (!podcasts.length) {
    podcastList.innerHTML = `<div class="status-box">No podcasts yet</div>`;
    return;
  }

  podcastList.innerHTML = podcasts.map(p => `
    <div class="podcast-card">
      <h3>${p.title || "Podcast"}</h3>
      <p>${p.description || ""}</p>
    </div>
  `).join("");
}

// =========================
// REALTIME TRACKS
// =========================
function setupRealtime() {
  supabase
    .channel("tracks-live")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "tracks"
    }, payload => {
      tracks.unshift(payload.new);
      renderTracks();
    })
    .subscribe();
}

// =========================
// REFRESH
// =========================
refreshBtn.onclick = () => loadAll();

// =========================
// INIT
// =========================
await loadAll();
setupRealtime();
