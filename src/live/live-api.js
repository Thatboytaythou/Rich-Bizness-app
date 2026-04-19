import { supabase } from "../shared/supabase.js";

function nowIso() {
  return new Date().toISOString();
}

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 80);
}

export function makeStreamSlug(title = "", creatorId = "") {
  const base = slugify(title || "live-stream") || "live-stream";
  const creatorTail = String(creatorId || "")
    .replace(/-/g, "")
    .slice(-6)
    .toLowerCase();
  const randomTail = Math.random().toString(36).slice(2, 6).toLowerCase();

  return [base, creatorTail || "rb", randomTail].filter(Boolean).join("-");
}

function normalizeStream(row) {
  if (!row) return null;

  return {
    ...row,
    is_live: !!row.started_at && !row.ended_at
  };
}

export async function getLiveStreams() {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .not("started_at", "is", null)
    .is("ended_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[live-api] getLiveStreams error:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeStream) : [];
}

export async function getStreamById(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", streamId)
    .single();

  if (error) {
    console.error("[live-api] getStreamById error:", error);
    return null;
  }

  return normalizeStream(data);
}

export async function getStreamBySlug(slug) {
  const cleanSlug = slugify(slug);

  if (!cleanSlug) return null;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("slug", cleanSlug)
    .single();

  if (error) {
    console.error("[live-api] getStreamBySlug error:", error);
    return null;
  }

  return normalizeStream(data);
}

export async function ensureUniqueSlug(title, creatorId) {
  const baseSlug = makeStreamSlug(title, creatorId);

  let attempt = 0;
  let candidate = baseSlug;

  while (attempt < 8) {
    const { data, error } = await supabase
      .from("live_streams")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      console.error("[live-api] ensureUniqueSlug check error:", error);
      return candidate;
    }

    if (!data) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 5).toLowerCase()}`;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function createStream(payload) {
  const startedAt = nowIso();
  const slug =
    payload.slug && slugify(payload.slug)
      ? slugify(payload.slug)
      : await ensureUniqueSlug(payload.title, payload.creator_id);

  const insertPayload = {
    creator_id: payload.creator_id,
    slug,
    title: payload.title || "Live Stream",
    description: payload.description || "",
    category: payload.category || "general",
    status: "live",
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
    scheduled_for: payload.scheduled_for || null,
    last_activity_at: startedAt,
    livekit_room_name: payload.livekit_room_name || slug,
    livekit_room_sid: payload.livekit_room_sid || null
  };

  const { data, error } = await supabase
    .from("live_streams")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error("[live-api] createStream error:", error);
    throw error;
  }

  return normalizeStream(data);
}

export async function endStream(streamId) {
  const stamp = nowIso();

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: stamp,
      last_activity_at: stamp
    })
    .eq("id", streamId)
    .select()
    .single();

  if (error) {
    console.error("[live-api] endStream error:", error);
    throw error;
  }

  return normalizeStream(data);
}

export async function joinStream(streamId, userId) {
  if (userId) {
    const { error } = await supabase
      .from("live_stream_members")
      .insert([
        {
          stream_id: streamId,
          user_id: userId
        }
      ]);

    if (error) {
      console.error("[live-api] joinStream member insert error:", error);
    }
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
    console.error("[live-api] joinStream viewer update error:", updateError);
    return stream;
  }

  return normalizeStream(data);
}

export function buildWatchUrl(slug) {
  const cleanSlug = slugify(slug);
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(cleanSlug)}`;
}
