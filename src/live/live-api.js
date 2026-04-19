import { supabase } from "../shared/supabase.js";

function nowIso() {
  return new Date().toISOString();
}

function makeRoomName(slug = "") {
  const clean = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || `rb-live-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStream(row) {
  if (!row) return null;

  return {
    ...row,
    is_live: !!row.started_at && !row.ended_at
  };
}

/**
 * Active live streams:
 * started_at exists AND ended_at is null
 */
export async function getLiveStreams() {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .not("started_at", "is", null)
    .is("ended_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("getLiveStreams error:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeStream) : [];
}

/**
 * Get stream by id
 */
export async function getStreamById(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", streamId)
    .single();

  if (error) {
    console.error("getStreamById error:", error);
    return null;
  }

  return normalizeStream(data);
}

/**
 * Get stream by slug
 */
export async function getStreamBySlug(slug) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("getStreamBySlug error:", error);
    return null;
  }

  return normalizeStream(data);
}

/**
 * Create a new stream
 */
export async function createStream(payload) {
  const startedAt = nowIso();

  const insertPayload = {
    creator_id: payload.creator_id,
    slug: payload.slug,
    title: payload.title || "Live Stream",
    description: payload.description || "",
    category: payload.category || "general",
    access_type: payload.access_type || "free",
    price_cents: Number(payload.price_cents || 0),
    currency: payload.currency || "usd",
    thumbnail_url: payload.thumbnail_url || null,
    cover_url: payload.cover_url || payload.thumbnail_url || null,
    metadata: payload.metadata || {},
    viewer_count: 0,
    peak_viewers: 0,
    total_chat_messages: 0,
    total_revenue_cents: 0,
    is_chat_enabled: payload.is_chat_enabled ?? true,
    is_replay_enabled: payload.is_replay_enabled ?? true,
    is_featured: payload.is_featured ?? false,
    started_at: startedAt,
    ended_at: null,
    last_activity_at: startedAt,
    livekit_room_name: payload.livekit_room_name || makeRoomName(payload.slug),
    livekit_room_sid: payload.livekit_room_sid || null
  };

  const { data, error } = await supabase
    .from("live_streams")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error("createStream error:", error);
    throw error;
  }

  return normalizeStream(data);
}

/**
 * End stream
 */
export async function endStream(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .update({
      ended_at: nowIso(),
      last_activity_at: nowIso()
    })
    .eq("id", streamId)
    .select()
    .single();

  if (error) {
    console.error("endStream error:", error);
    throw error;
  }

  return normalizeStream(data);
}

/**
 * Join stream
 */
export async function joinStream(streamId, userId) {
  const { error } = await supabase
    .from("live_stream_members")
    .insert([
      {
        stream_id: streamId,
        user_id: userId
      }
    ]);

  if (error) {
    console.error("joinStream error:", error);
  }

  const stream = await getStreamById(streamId);
  if (!stream) return null;

  const nextViewerCount = Number(stream.viewer_count || 0) + 1;
  const nextPeak = Math.max(Number(stream.peak_viewers || 0), nextViewerCount);

  const { data, error: updateError } = await supabase
    .from("live_streams")
    .update({
      viewer_count: nextViewerCount,
      peak_viewers: nextPeak,
      last_activity_at: nowIso()
    })
    .eq("id", streamId)
    .select()
    .single();

  if (updateError) {
    console.error("joinStream viewer update error:", updateError);
    return stream;
  }

  return normalizeStream(data);
}
