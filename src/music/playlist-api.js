import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

export async function getPlaylists({
  search = "",
  featuredOnly = false,
  creatorId = null,
  limit = 50
} = {}) {
  let query = supabase
    .from("playlists")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (featuredOnly) query = query.eq("is_featured", true);
  if (creatorId) query = query.eq("creator_id", creatorId);
  if (search?.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPlaylistById(playlistId) {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPlaylist(payload) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Log in first.");

  const insertPayload = {
    creator_id: user.id,
    title: payload.title?.trim() || "Untitled Playlist",
    description: payload.description?.trim() || "",
    cover_url: payload.cover_url?.trim() || null,
    visibility: payload.visibility || "public",
    is_featured: !!payload.is_featured
  };

  const { data, error } = await supabase
    .from("playlists")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlaylist(playlistId, payload) {
  const updates = {
    title: payload.title?.trim() || "Untitled Playlist",
    description: payload.description?.trim() || "",
    cover_url: payload.cover_url?.trim() || null,
    visibility: payload.visibility || "public",
    is_featured: !!payload.is_featured,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("playlists")
    .update(updates)
    .eq("id", playlistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlaylist(playlistId) {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) throw error;
  return true;
}

export async function getPlaylistTracks(playlistId) {
  const { data, error } = await supabase
    .from("playlist_tracks")
    .select(`
      id,
      playlist_id,
      track_id,
      sort_order,
      created_at,
      tracks (
        id,
        creator_id,
        title,
        artist_name,
        description,
        genre,
        cover_url,
        audio_url,
        duration_seconds,
        is_explicit,
        created_at
      )
    `)
    .eq("playlist_id", playlistId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row.tracks,
    playlist_track_id: row.id,
    playlist_id: row.playlist_id,
    sort_order: row.sort_order
  }));
}

export async function getTracksForCurrentUser(limit = 100) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Log in first.");

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function addTrackToPlaylist({ playlistId, trackId, sortOrder = null }) {
  if (!playlistId || !trackId) throw new Error("Missing playlist or track.");

  let nextOrder = sortOrder;

  if (nextOrder === null) {
    const { data: existing, error: countError } = await supabase
      .from("playlist_tracks")
      .select("id", { count: "exact" })
      .eq("playlist_id", playlistId);

    if (countError) throw countError;
    nextOrder = existing?.length || 0;
  }

  const { data, error } = await supabase
    .from("playlist_tracks")
    .insert({
      playlist_id: playlistId,
      track_id: trackId,
      sort_order: nextOrder
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeTrackFromPlaylist(playlistTrackId) {
  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("id", playlistTrackId);

  if (error) throw error;
  return true;
}

export async function reorderPlaylistTrack({ playlistTrackId, sortOrder }) {
  const { data, error } = await supabase
    .from("playlist_tracks")
    .update({
      sort_order: sortOrder
    })
    .eq("id", playlistTrackId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPlaylistBundle({ playlistId = null, search = "", featuredOnly = false } = {}) {
  const user = await getCurrentUser();
  const [playlists, myTracks, selectedPlaylist, selectedTracks] = await Promise.all([
    getPlaylists({ search, featuredOnly }),
    user?.id ? getTracksForCurrentUser().catch(() => []) : [],
    playlistId ? getPlaylistById(playlistId).catch(() => null) : null,
    playlistId ? getPlaylistTracks(playlistId).catch(() => []) : []
  ]);

  return {
    currentUser: user,
    playlists,
    myTracks,
    selectedPlaylist,
    selectedTracks
  };
}
