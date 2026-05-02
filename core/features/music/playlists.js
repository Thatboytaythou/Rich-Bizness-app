// =========================
// RICH BIZNESS PLAYLIST ENGINE
// /core/features/music/playlist.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== ENV =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;
let currentPlaylist = null;

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function safe(v, f = "") {
  return v ?? f;
}

// ===== INIT =====
export async function initPlaylist() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  await loadUserPlaylists();
}

// ===== LOAD USER PLAYLISTS =====
export async function loadUserPlaylists() {
  const container = $("playlistList");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `<div>No user session</div>`;
    return;
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<div>Error loading playlists</div>`;
    return;
  }

  if (!data.length) {
    container.innerHTML = `<div>No playlists yet</div>`;
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="playlist-card" data-id="${p.id}">
      <div class="playlist-title">${safe(p.title, "Untitled")}</div>
      <div class="playlist-meta">${safe(p.description, "")}</div>
    </div>
  `).join("");

  // click handler
  container.querySelectorAll(".playlist-card").forEach(el => {
    el.onclick = () => loadPlaylist(el.dataset.id);
  });
}

// ===== LOAD SINGLE PLAYLIST =====
export async function loadPlaylist(playlistId) {
  currentPlaylist = playlistId;

  const container = $("playlistTracks");

  if (!container) return;

  container.innerHTML = "Loading...";

  const { data, error } = await supabase
    .from("playlist_tracks")
    .select(`
      id,
      tracks (
        id,
        title,
        artist_name,
        cover_url,
        audio_url
      )
    `)
    .eq("playlist_id", playlistId);

  if (error) {
    console.error(error);
    container.innerHTML = "Error loading tracks";
    return;
  }

  if (!data.length) {
    container.innerHTML = "No tracks in this playlist";
    return;
  }

  container.innerHTML = data.map(row => {
    const t = row.tracks;

    return `
      <div class="track-card">
        <strong>${safe(t.title)}</strong>
        <div>${safe(t.artist_name)}</div>
        ${t.audio_url ? `<audio controls src="${t.audio_url}"></audio>` : ""}
        <button onclick="removeFromPlaylist('${row.id}')">Remove</button>
      </div>
    `;
  }).join("");
}

// ===== CREATE PLAYLIST =====
export async function createPlaylist(title, description = "") {
  if (!currentUser) return alert("Not signed in");

  const { data, error } = await supabase
    .from("playlists")
    .insert([
      {
        user_id: currentUser.id,
        title,
        description
      }
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    return alert("Failed to create playlist");
  }

  await loadUserPlaylists();
  return data;
}

// ===== ADD TRACK =====
export async function addToPlaylist(trackId) {
  if (!currentPlaylist) return alert("Select a playlist");

  const { error } = await supabase
    .from("playlist_tracks")
    .insert([
      {
        playlist_id: currentPlaylist,
        track_id: trackId
      }
    ]);

  if (error) {
    console.error(error);
    return alert("Failed to add track");
  }

  await loadPlaylist(currentPlaylist);
}

// ===== REMOVE TRACK =====
window.removeFromPlaylist = async function (playlistTrackId) {
  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("id", playlistTrackId);

  if (error) {
    console.error(error);
    return alert("Failed to remove");
  }

  await loadPlaylist(currentPlaylist);
};
