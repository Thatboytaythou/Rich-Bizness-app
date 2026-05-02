// =========================
// RICH BIZNESS ALBUM ENGINE
// /core/features/music/albums.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== INIT =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;
let currentAlbums = [];
let currentAlbum = null;

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
export async function initAlbums() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// LOAD ALL ALBUMS
// =========================
export async function loadAlbums({ limit = 10 } = {}) {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Albums load error:", error);
    return [];
  }

  currentAlbums = data || [];
  return currentAlbums;
}

// =========================
// LOAD ARTIST ALBUMS
// =========================
export async function loadArtistAlbums(userId, { limit = 10 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Artist albums error:", error);
    return [];
  }

  currentAlbums = data || [];
  return currentAlbums;
}

// =========================
// LOAD SINGLE ALBUM + TRACKS
// =========================
export async function loadAlbum(albumId) {
  currentAlbum = albumId;

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Album tracks error:", error);
    return [];
  }

  return data || [];
}

// =========================
// RENDER ALBUMS
// =========================
export function renderAlbums(containerId, albums = []) {
  const container = $(containerId);
  if (!container) return;

  if (!albums.length) {
    container.innerHTML = `<div>No albums yet</div>`;
    return;
  }

  container.innerHTML = albums.map(album => {
    const title = escapeHtml(safe(album.title, "Untitled Album"));
    const cover = album.cover_url || "";

    return `
      <div class="album-card" data-id="${album.id}">
        ${cover ? `
          <img src="${cover}" 
               style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:10px;">
        ` : ""}

        <div class="album-title">${title}</div>
      </div>
    `;
  }).join("");

  // click → load album
  container.querySelectorAll(".album-card").forEach(el => {
    el.onclick = async () => {
      const tracks = await loadAlbum(el.dataset.id);
      renderAlbumTracks("albumTracks", tracks);
    };
  });
}

// =========================
// RENDER TRACKS INSIDE ALBUM
// =========================
export function renderAlbumTracks(containerId, tracks = []) {
  const container = $(containerId);
  if (!container) return;

  if (!tracks.length) {
    container.innerHTML = `<div>No tracks in this album</div>`;
    return;
  }

  container.innerHTML = tracks.map(track => {
    const title = escapeHtml(safe(track.title));
    const artist = escapeHtml(safe(track.artist_name));
    const audio = track.audio_url || "";

    return `
      <div class="track-card">
        <strong>${title}</strong>
        <div>${artist}</div>

        ${audio
          ? `<audio controls src="${audio}"></audio>`
          : `<div>No audio</div>`
        }
      </div>
    `;
  }).join("");
}

// =========================
// CREATE ALBUM
// =========================
export async function createAlbum({ title, cover_url }) {
  if (!currentUser) {
    alert("Sign in first");
    return null;
  }

  const { data, error } = await supabase
    .from("albums")
    .insert([
      {
        creator_id: currentUser.id,
        title,
        cover_url
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Album create error:", error);
    alert("Failed to create album");
    return null;
  }

  return data;
}

// =========================
// ADD TRACK TO ALBUM
// =========================
export async function addTrackToAlbum(trackId, albumId) {
  const { error } = await supabase
    .from("tracks")
    .update({ album_id: albumId })
    .eq("id", trackId);

  if (error) {
    console.error("Add to album error:", error);
    alert("Failed to add track");
  }
}

// =========================
// GET STATE
// =========================
export function getAlbums() {
  return currentAlbums;
}

export function getCurrentAlbum() {
  return currentAlbum;
}
