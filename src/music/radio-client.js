import { getPlaylists, getPlaylistTracks } from "./playlist-api.js";

function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const state = {
  playlists: [],
  stations: [],
  activeStationIndex: 0,
  activeTrackIndex: 0,
  isPlaying: false
};

function getActiveStation() {
  return state.stations[state.activeStationIndex] || null;
}

function getActiveTrack() {
  const station = getActiveStation();
  if (!station?.tracks?.length) return null;
  return station.tracks[state.activeTrackIndex] || station.tracks[0] || null;
}

function showRadioError(message) {
  const node = el("radio-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const success = el("radio-success");
  if (success && message) success.style.display = "none";
}

function showRadioSuccess(message) {
  const node = el("radio-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const error = el("radio-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showRadioError("");
  showRadioSuccess("");
}

function deriveStationTag(playlist) {
  const title = String(playlist?.title || "").toLowerCase();
  const desc = String(playlist?.description || "").toLowerCase();
  const text = `${title} ${desc}`;

  if (text.includes("night") || text.includes("late")) return "Late Night";
  if (text.includes("smoke")) return "Smoke Session";
  if (text.includes("fitness") || text.includes("workout")) return "Workout";
  if (text.includes("drive")) return "Drive";
  if (text.includes("artist")) return "Artist";
  return "Playlist";
}

function normalizeStationFromPlaylist(playlist, tracks) {
  return {
    id: playlist.id,
    label: playlist.title || "Playlist Station",
    description: playlist.description || "Curated Rich Bizness playlist station.",
    cover: playlist.cover_url || "/images/brand/logo-music-label.png",
    visibility: playlist.visibility || "public",
    isFeatured: !!playlist.is_featured,
    tracks: (tracks || []).filter((track) => !!track.audio_url).map((track) => ({
      id: track.id,
      title: track.title || "Untitled Track",
      artist: track.artist_name || "Artist",
      tag: deriveStationTag(playlist),
      cover: track.cover_url || playlist.cover_url || "/images/brand/logo-music-label.png",
      src: track.audio_url || "",
      genre: track.genre || ""
    }))
  };
}

function renderStationButtons() {
  const bar = document.querySelector(".station-bar");
  if (!bar) return;

  if (!state.stations.length) {
    bar.innerHTML = `
      <button class="station-btn active" type="button">No Stations Yet</button>
    `;
    return;
  }

  bar.innerHTML = state.stations.map((station, index) => `
    <button
      class="station-btn ${index === state.activeStationIndex ? "active" : ""}"
      type="button"
      data-station-index="${index}"
    >
      ${escapeHtml(station.label)}
    </button>
  `).join("");

  bar.querySelectorAll("[data-station-index]").forEach((button) => {
    button.addEventListener("click", () => {
      setStation(Number(button.getAttribute("data-station-index") || 0));
    });
  });
}

function renderStationList() {
  const container = el("radio-station-list");
  if (!container) return;

  if (!state.stations.length) {
    container.innerHTML = `
      <div class="station-item active">
        <strong>No playlist stations yet</strong>
        <span>Create playlists with tracks first, then radio will pull them here automatically.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.stations.map((station, index) => `
    <div class="station-item ${index === state.activeStationIndex ? "active" : ""}" data-station-item="${index}">
      <strong>${escapeHtml(station.label)}</strong>
      <span>${escapeHtml(station.description)}</span>
    </div>
  `).join("");

  container.querySelectorAll("[data-station-item]").forEach((item) => {
    item.addEventListener("click", () => {
      setStation(Number(item.getAttribute("data-station-item") || 0));
    });
  });
}

function renderQueue() {
  const queue = el("radio-queue");
  if (!queue) return;

  const station = getActiveStation();

  if (!station || !station.tracks.length) {
    queue.innerHTML = `
      <div class="queue-item active">
        <div class="queue-index">—</div>
        <div class="queue-thumb">
          <img src="/images/brand/logo-music-label.png" alt="No track" />
        </div>
        <div class="queue-copy">
          <strong>No playable tracks</strong>
          <span>Add tracks with real audio URLs into playlists to power radio.</span>
        </div>
        <div class="queue-tag">Empty</div>
      </div>
    `;
    return;
  }

  queue.innerHTML = station.tracks.map((track, index) => `
    <div class="queue-item ${index === state.activeTrackIndex ? "active" : ""}" data-queue-index="${index}">
      <div class="queue-index">${index + 1}</div>
      <div class="queue-thumb">
        <img src="${escapeHtml(track.cover)}" alt="${escapeHtml(track.title)}" />
      </div>
      <div class="queue-copy">
        <strong>${escapeHtml(track.title)}</strong>
        <span>${escapeHtml(track.artist)}${track.genre ? ` • ${escapeHtml(track.genre)}` : ""}</span>
      </div>
      <div class="queue-tag">${escapeHtml(track.tag)}</div>
    </div>
  `).join("");

  queue.querySelectorAll("[data-queue-index]").forEach((item) => {
    item.addEventListener("click", () => {
      state.activeTrackIndex = Number(item.getAttribute("data-queue-index") || 0);
      renderNowPlaying();
      if (state.isPlaying) startPlayback();
    });
  });
}

function renderNowPlaying() {
  const station = getActiveStation();
  const track = getActiveTrack();

  const player = el("radio-player");
  const playBtn = el("radio-play-toggle");

  if (!station) {
    el("radio-station-label").textContent = "No Station";
    el("radio-station-description").textContent = "Create playlists first, then radio will build stations from them.";
    el("radio-track-title").textContent = "No playlist stations yet";
    el("radio-track-meta").textContent = "Playlists with real tracks will appear here.";
    el("radio-cover").src = "/images/brand/logo-music-label.png";
    if (player) player.src = "";
    if (playBtn) playBtn.textContent = "Play";
    renderQueue();
    renderStationButtons();
    renderStationList();
    return;
  }

  el("radio-station-label").textContent = station.label;
  el("radio-station-description").textContent = station.description;

  if (!track) {
    el("radio-track-title").textContent = "No playable tracks";
    el("radio-track-meta").textContent = `${station.label} • Add audio-enabled tracks to this playlist`;
    el("radio-cover").src = station.cover;
    if (player) player.src = "";
    if (playBtn) playBtn.textContent = "Play";
    renderQueue();
    renderStationButtons();
    renderStationList();
    return;
  }

  el("radio-track-title").textContent = track.title;
  el("radio-track-meta").textContent = `${track.artist} • ${track.tag}${track.genre ? ` • ${track.genre}` : ""}`;
  el("radio-cover").src = track.cover;

  if (player) {
    player.src = track.src || "";
  }

  if (playBtn) {
    playBtn.textContent = state.isPlaying ? "Pause" : "Play";
  }

  renderQueue();
  renderStationButtons();
  renderStationList();
}

async function startPlayback() {
  clearMessages();

  const player = el("radio-player");
  const track = getActiveTrack();

  if (!player || !track) {
    showRadioError("No playable track loaded.");
    return;
  }

  if (!track.src) {
    state.isPlaying = false;
    renderNowPlaying();
    showRadioError("This track is missing an audio URL.");
    return;
  }

  try {
    await player.play();
    state.isPlaying = true;
    renderNowPlaying();
    showRadioSuccess(`Now playing: ${track.title}`);
  } catch (error) {
    state.isPlaying = false;
    renderNowPlaying();
    showRadioError("Playback was blocked. Tap play again.");
  }
}

function pausePlayback() {
  const player = el("radio-player");
  if (!player) return;
  player.pause();
  state.isPlaying = false;
  renderNowPlaying();
}

function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function nextTrack() {
  const station = getActiveStation();
  if (!station?.tracks?.length) return;

  state.activeTrackIndex = (state.activeTrackIndex + 1) % station.tracks.length;
  renderNowPlaying();
  if (state.isPlaying) startPlayback();
}

function prevTrack() {
  const station = getActiveStation();
  if (!station?.tracks?.length) return;

  state.activeTrackIndex =
    (state.activeTrackIndex - 1 + station.tracks.length) % station.tracks.length;
  renderNowPlaying();
  if (state.isPlaying) startPlayback();
}

function setStation(index) {
  if (!state.stations[index]) return;
  state.activeStationIndex = index;
  state.activeTrackIndex = 0;
  renderNowPlaying();
  if (state.isPlaying) startPlayback();
}

async function loadRealStations() {
  clearMessages();

  const playlists = await getPlaylists({ limit: 50 });
  state.playlists = playlists || [];

  const playableStations = [];

  for (const playlist of state.playlists) {
    try {
      const tracks = await getPlaylistTracks(playlist.id);
      const station = normalizeStationFromPlaylist(playlist, tracks);

      if (station.tracks.length > 0) {
        playableStations.push(station);
      }
    } catch (error) {
      console.error("[radio-client] playlist load error:", playlist.id, error);
    }
  }

  state.stations = playableStations;
  state.activeStationIndex = 0;
  state.activeTrackIndex = 0;

  renderNowPlaying();

  if (!state.stations.length) {
    showRadioError("No playlist stations found yet. Create playlists and add tracks with real audio URLs first.");
  } else {
    showRadioSuccess("Radio is now pulling real playlists.");
  }
}

function bindControls() {
  el("radio-play-toggle")?.addEventListener("click", togglePlayback);
  el("radio-next-btn")?.addEventListener("click", nextTrack);
  el("radio-prev-btn")?.addEventListener("click", prevTrack);
  el("radio-start-btn")?.addEventListener("click", startPlayback);
  el("radio-player")?.addEventListener("ended", nextTrack);
}

async function bootRadioPage() {
  try {
    bindControls();
    await loadRealStations();
  } catch (error) {
    console.error("[radio-client] boot error:", error);
    showRadioError(error.message || "Failed to load radio stations.");
  }
}

document.addEventListener("DOMContentLoaded", bootRadioPage);
