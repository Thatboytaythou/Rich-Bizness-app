// =========================
// RICH BIZNESS MUSIC — FINAL SYNCED ENGINE
// /core/pages/music.js
// Source of truth:
// music_tracks, artist_channels, playlists,
// radio_stations, podcast_shows, music_streams
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("music-status"),
  refreshBtn: $("refresh-music-btn"),

  tracksGrid: $("music-tracks-grid"),
  artistsList: $("artist-channels-list"),
  playlistsList: $("playlists-list"),
  radioList: $("radio-stations-list"),
  podcastsList: $("podcast-shows-list"),

  audio: $("music-audio-player"),
  playerTitle: $("player-title"),
  playerArtist: $("player-artist")
};

const FALLBACK_COVER = "/images/83FAD785-46D7-4EB3-8A3F-1E4A8BB78C90.png";

function setStatus(message) {
  if (els.status) els.status.textContent = message;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cover(track) {
  return track.cover_url || track.image_url || FALLBACK_COVER;
}

function getTrackCreatorId(track) {
  return track.creator_id || track.user_id || null;
}

function getTrackPlays(track) {
  return Number(track.play_count ?? track.plays ?? 0);
}

function getTrackLikes(track) {
  return Number(track.like_count ?? track.likes ?? 0);
}

async function getUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

async function recordPlay(track) {
  const user = await getUser();
  const creatorId = getTrackCreatorId(track);

  await supabase.from("music_streams").insert({
    track_id: track.id,
    listener_id: user?.id || null,
    artist_user_id: creatorId,
    played_seconds: 0,
    is_paid_stream: false,
    created_at: new Date().toISOString()
  });

  await supabase
    .from("music_tracks")
    .update({ plays: getTrackPlays(track) + 1 })
    .eq("id", track.id);
}

async function playTrack(track) {
  if (!track.audio_url) {
    alert("This track has no audio_url yet.");
    return;
  }

  els.playerTitle.textContent = track.title || "Untitled Track";
  els.playerArtist.textContent = track.artist_name || "Rich Bizness Artist";
  els.audio.src = track.audio_url;
  await els.audio.play().catch(() => {});
  recordPlay(track).catch(console.warn);
}

async function loadTracks() {
  if (!els.tracksGrid) return;

  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[music] tracks:", error);
    els.tracksGrid.innerHTML = `<div class="status-box">Could not load tracks.</div>`;
    return;
  }

  if (!data?.length) {
    els.tracksGrid.innerHTML = `<div class="status-box">No tracks uploaded yet.</div>`;
    return;
  }

  els.tracksGrid.innerHTML = data.map((track) => `
    <article class="track-card">
      <img src="${escapeHtml(cover(track))}" alt="${escapeHtml(track.title || "Track")}" />
      <h3>${escapeHtml(track.title || "Untitled Track")}</h3>
      <p>${escapeHtml(track.artist_name || "Rich Bizness Artist")}</p>

      <div class="music-meta">
        <span>${escapeHtml(track.genre || "Music")}</span>
        <span>${getTrackPlays(track).toLocaleString()} plays</span>
        <span>${getTrackLikes(track).toLocaleString()} likes</span>
      </div>

      <button
        class="btn btn-gold"
        type="button"
        data-play-track="${escapeHtml(track.id)}"
      >
        Play Track
      </button>
    </article>
  `).join("");

  els.tracksGrid.querySelectorAll("[data-play-track]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-play-track");
      const track = data.find((item) => String(item.id) === String(id));
      if (track) playTrack(track);
    });
  });
}

async function loadArtistChannels() {
  if (!els.artistsList) return;

  const { data, error } = await supabase
    .from("artist_channels")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[music] artists:", error);
    els.artistsList.innerHTML = `<div class="status-box">Could not load artist channels.</div>`;
    return;
  }

  if (!data?.length) {
    els.artistsList.innerHTML = `<div class="status-box">No artist channels yet.</div>`;
    return;
  }

  els.artistsList.innerHTML = data.map((artist) => `
    <article class="artist-card">
      <h3>${escapeHtml(artist.channel_name || "Artist Channel")}</h3>
      <p>${escapeHtml(artist.bio || "Rich Bizness artist.")}</p>
      <div class="music-meta">
        <span>${artist.is_verified ? "Verified" : "Artist"}</span>
        <span>@${escapeHtml(artist.slug || "artist")}</span>
      </div>
      <a class="btn btn-dark" href="/artist/index.html?artist=${encodeURIComponent(artist.slug || artist.user_id || "")}">
        View Artist
      </a>
    </article>
  `).join("");
}

async function loadPlaylists() {
  if (!els.playlistsList) return;

  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[music] playlists:", error);
    els.playlistsList.innerHTML = `<div class="status-box">Could not load playlists.</div>`;
    return;
  }

  if (!data?.length) {
    els.playlistsList.innerHTML = `<div class="status-box">No playlists yet.</div>`;
    return;
  }

  els.playlistsList.innerHTML = data.map((playlist) => `
    <article class="playlist-card">
      <h3>${escapeHtml(playlist.title || playlist.name || "Playlist")}</h3>
      <p>${escapeHtml(playlist.description || "Rich Bizness playlist.")}</p>
      <a class="btn btn-dark" href="/playlist.html?id=${encodeURIComponent(playlist.id)}">
        Open Playlist
      </a>
    </article>
  `).join("");
}

async function loadRadioStations() {
  if (!els.radioList) return;

  const { data, error } = await supabase
    .from("radio_stations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[music] radio:", error);
    els.radioList.innerHTML = `<div class="status-box">Could not load radio stations.</div>`;
    return;
  }

  if (!data?.length) {
    els.radioList.innerHTML = `<div class="status-box">No radio stations yet.</div>`;
    return;
  }

  els.radioList.innerHTML = data.map((station) => `
    <article class="radio-card">
      <h3>${escapeHtml(station.title || station.name || "Radio Station")}</h3>
      <p>${escapeHtml(station.description || "Rich Bizness radio.")}</p>
      <a class="btn btn-dark" href="/radio.html?station=${encodeURIComponent(station.slug || station.id)}">
        Listen
      </a>
    </article>
  `).join("");
}

async function loadPodcastShows() {
  if (!els.podcastsList) return;

  const { data, error } = await supabase
    .from("podcast_shows")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[music] podcasts:", error);
    els.podcastsList.innerHTML = `<div class="status-box">Could not load podcasts.</div>`;
    return;
  }

  if (!data?.length) {
    els.podcastsList.innerHTML = `<div class="status-box">No podcast shows yet.</div>`;
    return;
  }

  els.podcastsList.innerHTML = data.map((show) => `
    <article class="podcast-card">
      <h3>${escapeHtml(show.title || show.name || "Podcast Show")}</h3>
      <p>${escapeHtml(show.description || "Rich Bizness podcast.")}</p>
      <a class="btn btn-dark" href="/podcast.html?show=${encodeURIComponent(show.slug || show.id)}">
        Open Show
      </a>
    </article>
  `).join("");
}

async function refreshMusic() {
  setStatus("Loading music engine...");

  await Promise.all([
    loadTracks(),
    loadArtistChannels(),
    loadPlaylists(),
    loadRadioStations(),
    loadPodcastShows()
  ]);

  setStatus("Music engine synced.");
}

function bindMusic() {
  els.refreshBtn?.addEventListener("click", refreshMusic);

  supabase
    .channel("rb-music-engine")
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, loadTracks)
    .on("postgres_changes", { event: "*", schema: "public", table: "artist_channels" }, loadArtistChannels)
    .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, loadPlaylists)
    .on("postgres_changes", { event: "*", schema: "public", table: "radio_stations" }, loadRadioStations)
    .on("postgres_changes", { event: "*", schema: "public", table: "podcast_shows" }, loadPodcastShows)
    .subscribe();
}

async function bootMusic() {
  bindMusic();
  await refreshMusic();
  console.log("🎧 Rich Bizness Music Engine Loaded");
}

bootMusic().catch((error) => {
  console.error("[music] boot error:", error);
  setStatus(error.message || "Could not load music engine.");
});
