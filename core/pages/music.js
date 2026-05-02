// =========================
// RICH BIZNESS MUSIC — FULL ELITE ENGINE (FIXED, NOT DOWNGRADED)
// /core/pages/music.js
// SOURCE OF TRUTH: music_uploads
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

// =========================
// HELPERS
// =========================

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
  return track.cover_url || FALLBACK_COVER;
}

function getTrackPlays(track) {
  return Number(track.play_count ?? 0);
}

// =========================
// AUTH
// =========================

async function getUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

// =========================
// PLAY TRACK (FIXED)
// =========================

async function playTrack(track) {
  if (!track.file_url) {
    alert("No audio file.");
    return;
  }

  els.playerTitle.textContent = track.title || "Untitled Track";
  els.playerArtist.textContent = track.artist_name || "Rich Bizness Artist";

  els.audio.src = track.file_url;
  await els.audio.play().catch(() => {});

  recordPlay(track).catch(console.warn);
}

// =========================
// RECORD PLAY (FIXED)
// =========================

async function recordPlay(track) {
  const user = await getUser();

  await supabase.from("music_streams").insert({
    track_id: track.id,
    listener_id: user?.id || null,
    artist_user_id: track.user_id,
    played_seconds: 0,
    is_paid_stream: false,
    created_at: new Date().toISOString()
  });

  await supabase
    .from("music_uploads")
    .update({ play_count: getTrackPlays(track) + 1 })
    .eq("id", track.id);
}

// =========================
// LOAD TRACKS (FIXED CORE)
// =========================

async function loadTracks() {
  if (!els.tracksGrid) return;

  const { data, error } = await supabase
    .from("music_uploads")
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
      <img src="${escapeHtml(cover(track))}" />
      <h3>${escapeHtml(track.title || "Untitled Track")}</h3>
      <p>${escapeHtml(track.artist_name || "Artist")}</p>

      <div class="music-meta">
        <span>${escapeHtml(track.genre || "Music")}</span>
        <span>${getTrackPlays(track)} plays</span>
      </div>

      <button class="btn btn-gold" data-play-track="${track.id}">
        Play Track
      </button>
    </article>
  `).join("");

  els.tracksGrid.querySelectorAll("[data-play-track]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-play-track");
      const track = data.find((t) => String(t.id) === String(id));
      if (track) playTrack(track);
    });
  });
}

// =========================
// KEEP ALL OTHER SYSTEMS (UNCHANGED)
// =========================

async function loadArtistChannels() {
  if (!els.artistsList) return;

  const { data } = await supabase
    .from("artist_channels")
    .select("*")
    .limit(12);

  els.artistsList.innerHTML = (data || []).map((artist) => `
    <article class="artist-card">
      <h3>${escapeHtml(artist.channel_name || "Artist")}</h3>
      <p>${escapeHtml(artist.bio || "")}</p>
    </article>
  `).join("");
}

async function loadPlaylists() {
  if (!els.playlistsList) return;

  const { data } = await supabase
    .from("playlists")
    .select("*")
    .limit(12);

  els.playlistsList.innerHTML = (data || []).map((p) => `
    <article class="playlist-card">
      <h3>${escapeHtml(p.title || "Playlist")}</h3>
    </article>
  `).join("");
}

async function loadRadioStations() {
  if (!els.radioList) return;

  const { data } = await supabase
    .from("radio_stations")
    .select("*")
    .limit(10);

  els.radioList.innerHTML = (data || []).map((r) => `
    <article class="radio-card">
      <h3>${escapeHtml(r.title || "Radio")}</h3>
    </article>
  `).join("");
}

async function loadPodcastShows() {
  if (!els.podcastsList) return;

  const { data } = await supabase
    .from("podcast_shows")
    .select("*")
    .limit(10);

  els.podcastsList.innerHTML = (data || []).map((p) => `
    <article class="podcast-card">
      <h3>${escapeHtml(p.title || "Podcast")}</h3>
    </article>
  `).join("");
}

// =========================
// REFRESH
// =========================

async function refreshMusic() {
  setStatus("Loading music...");

  await Promise.all([
    loadTracks(),
    loadArtistChannels(),
    loadPlaylists(),
    loadRadioStations(),
    loadPodcastShows()
  ]);

  setStatus("Music synced.");
}

// =========================
// REALTIME (FIXED)
// =========================

function bindMusic() {
  els.refreshBtn?.addEventListener("click", refreshMusic);

  supabase
    .channel("rb-music")
    .on("postgres_changes", { event: "*", schema: "public", table: "music_uploads" }, loadTracks)
    .subscribe();
}

// =========================
// BOOT
// =========================

async function bootMusic() {
  bindMusic();
  await refreshMusic();
  console.log("🎧 MUSIC ENGINE FULLY LOCKED");
}

bootMusic();
