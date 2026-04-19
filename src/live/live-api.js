import { supabase } from "../shared/supabase.js";

/**
 * Get all active live streams
 */
export async function getLiveStreams() {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLiveStreams error:", error);
    return [];
  }

  return data;
}

/**
 * Get single stream by ID
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

  return data;
}

/**
 * Create a new live stream
 */
export async function createStream(payload) {
  const { data, error } = await supabase
    .from("live_streams")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("createStream error:", error);
    return null;
  }

  return data;
}

/**
 * End stream
 */
export async function endStream(streamId) {
  const { error } = await supabase
    .from("live_streams")
    .update({ is_live: false })
    .eq("id", streamId);

  if (error) {
    console.error("endStream error:", error);
  }
}

/**
 * Join stream (tracks viewers)
 */
export async function joinStream(streamId, userId) {
  const { error } = await supabase
    .from("live_stream_members")
    .insert([
      {
        stream_id: streamId,
        user_id: userId,
      },
    ]);

  if (error) {
    console.error("joinStream error:", error);
  }
}
