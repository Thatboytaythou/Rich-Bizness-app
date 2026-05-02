// =========================
// RICH BIZNESS TRACK ENGINE
// /core/features/music/tracks.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== INIT =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;
let currentTracks = [];

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function safe(v, f = "") {
  return v ?? f;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[m]);
}

// =========================
// INIT
// =========================
export async function initTracks() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// LOAD ALL TRACKS
// =========================
export async function loadTracks({ limit = 10 } = {}) {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Tracks load error:", error);
    return [];
  }

  currentTracks = data || [];
  return currentTracks;
}

// =========================
// LOAD ARTIST TRACKS
// =========================
export async function loadArtistTracks(userId, { limit = 10 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Artist tracks error:", error);
    return [];
  }

  currentTracks = data || [];
  return currentTracks;
}

// =========================
// RENDER TRACKS
// =========================
export function renderTracks(containerId, tracks = []) {
  const container = $(containerId);
  if (!container) return;

  if (!tracks.length) {
    container.innerHTML = `
      <div class="empty-state">
        No tracks yet. Upload music to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = tracks.map(track => {
    const title = escapeHtml(safe(track.title, "Untitled"));
    const artist = escapeHtml(safe(track.artist_name, "Artist"));
    const cover = track.cover_url || "";
    const audio = track.audio_url || "";

    return `
      <div class="track-card" data-id="${track.id}">
        
        ${cover ? `
          <img 
            src="${cover}" 
            style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:10px;"
          />
        ` : ""}

        <div class="track-title">${title}</div>
        <div class="track-meta">${artist}</div>

        ${audio ? `
          <audio controls src="${audio}"></audio>
        ` : `<div class="track-meta">No audio yet</div>`}

        <div class="track-actions">
          <button onclick="window.addToPlaylist('${track.id}')">
            + Playlist
          </button>
        </div>

      </div>
    `;
  }).join("");
}

// =========================
// CREATE TRACK (UPLOAD ENTRY)
// =========================
export async function createTrack(trackData) {
  if (!currentUser) {
    alert("Sign in first");
    return;
  }

  const payload = {
    creator_id: currentUser.id,
    title: trackData.title,
    artist_name: trackData.artist_name,
    audio_url: trackData.audio_url,
    cover_url: trackData.cover_url,
    genre: trackData.genre || null
  };

  const { data, error } = await supabase
    .from("tracks")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Track create error:", error);
    alert("Failed to upload track");
    return null;
  }

  return data;
}

// =========================
// DELETE TRACK
// =========================
export async function deleteTrack(trackId) {
  if (!trackId) return;

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId);

  if (error) {
    console.error("Delete track error:", error);
    return;
  }

  currentTracks = currentTracks.filter(t => t.id !== trackId);
}

// =========================
// GET CURRENT TRACKS
// =========================
export function getTracks() {
  return currentTracks;
}
