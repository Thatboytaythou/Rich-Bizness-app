// =========================
// RICH BIZNESS ARTIST CHANNEL
// /core/features/artist/artist-channel.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== INIT =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;
let currentChannel = null;

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function safe(v, f = "") {
  return v ?? f;
}

// =========================
// INIT
// =========================
export async function initArtistChannel() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  await loadMyChannel();
}

// =========================
// LOAD CHANNEL
// =========================
export async function loadMyChannel() {
  if (!currentUser) return;

  const { data: channel, error } = await supabase
    .from("artist_channels")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Channel load error:", error);
    return;
  }

  currentChannel = channel;

  applyChannelToUI(channel);

  await loadChannelStats();
  await loadPinnedContent(channel);
}

// =========================
// APPLY TO UI
// =========================
function applyChannelToUI(channel) {
  if (!channel) return;

  const nameEl = $("artistName");
  const bioEl = $("artistMeta");

  if (nameEl) {
    nameEl.textContent =
      channel.display_name || "Rich Bizness Artist";
  }

  if (bioEl) {
    bioEl.textContent =
      channel.bio ||
      "Music. Live. Motion. Build your empire.";
  }
}

// =========================
// LOAD STATS
// =========================
async function loadChannelStats() {
  if (!currentUser) return;

  // followers
  const { count: followers } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("following_id", currentUser.id);

  // tracks
  const { count: tracks } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", currentUser.id);

  const followersEl = $("statFollowers");
  const tracksEl = $("statTracks");

  if (followersEl) followersEl.textContent = followers || 0;
  if (tracksEl) tracksEl.textContent = tracks || 0;
}

// =========================
// PINNED CONTENT
// =========================
async function loadPinnedContent(channel) {
  if (!channel) return;

  // PINNED TRACK
  if (channel.pinned_track_id) {
    const { data } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", channel.pinned_track_id)
      .maybeSingle();

    const el = $("pinnedTrack");

    if (el && data) {
      el.innerHTML = `
        <div class="track-card">
          <strong>${safe(data.title)}</strong>
          <div>${safe(data.artist_name)}</div>
          ${data.audio_url ? `<audio controls src="${data.audio_url}"></audio>` : ""}
        </div>
      `;
    }
  }

  // PINNED PLAYLIST
  if (channel.pinned_playlist_id) {
    const { data } = await supabase
      .from("playlists")
      .select("*")
      .eq("id", channel.pinned_playlist_id)
      .maybeSingle();

    const el = $("pinnedPlaylist");

    if (el && data) {
      el.innerHTML = `
        <div class="playlist-card">
          <strong>${safe(data.title)}</strong>
          <div>${safe(data.description)}</div>
        </div>
      `;
    }
  }
}

// =========================
// FOLLOW SYSTEM
// =========================
export async function followArtist(artistId) {
  if (!currentUser) return alert("Sign in first");

  const { error } = await supabase
    .from("followers")
    .insert([
      {
        follower_id: currentUser.id,
        following_id: artistId
      }
    ]);

  if (error) {
    console.error(error);
    return;
  }

  await loadChannelStats();
}

export async function unfollowArtist(artistId) {
  if (!currentUser) return;

  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", currentUser.id)
    .eq("following_id", artistId);

  if (error) {
    console.error(error);
    return;
  }

  await loadChannelStats();
}

// =========================
// UPDATE CHANNEL
// =========================
export async function updateChannel(updates) {
  if (!currentUser) return;

  const { error } = await supabase
    .from("artist_channels")
    .update(updates)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error(error);
    return alert("Update failed");
  }

  await loadMyChannel();
}
