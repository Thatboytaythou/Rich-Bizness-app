import { supabase } from "../shared/supabase.js";

function nowIso() {
  return new Date().toISOString();
}

function normalizeBan(row) {
  if (!row) return null;

  return {
    ...row,
    reason: row.reason || "",
    created_at: row.created_at || null,
    expires_at: row.expires_at || null
  };
}

export async function getStreamBans(streamId) {
  if (!streamId) return [];

  const { data, error } = await supabase
    .from("live_stream_bans")
    .select("*")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[live/moderation] getStreamBans error:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeBan) : [];
}

export async function isUserBannedFromStream({
  streamId,
  userId
}) {
  if (!streamId || !userId) return false;

  const { data, error } = await supabase
    .from("live_stream_bans")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live/moderation] isUserBannedFromStream error:", error);
    return false;
  }

  if (!data) return false;

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
  if (expiresAt && expiresAt < Date.now()) {
    await unbanUserFromStream({ streamId, userId });
    return false;
  }

  return true;
}

export async function banUserFromStream({
  streamId,
  userId,
  moderatorId,
  reason = "",
  expiresAt = null
}) {
  if (!streamId) {
    throw new Error("Missing stream id.");
  }

  if (!userId) {
    throw new Error("Missing user id to ban.");
  }

  const insertPayload = {
    stream_id: streamId,
    user_id: userId,
    moderator_id: moderatorId || null,
    reason: String(reason || "").trim(),
    expires_at: expiresAt || null,
    created_at: nowIso()
  };

  const { data, error } = await supabase
    .from("live_stream_bans")
    .upsert([insertPayload], {
      onConflict: "stream_id,user_id"
    })
    .select()
    .single();

  if (error) {
    console.error("[live/moderation] banUserFromStream error:", error);
    throw error;
  }

  return normalizeBan(data);
}

export async function unbanUserFromStream({
  streamId,
  userId
}) {
  if (!streamId || !userId) return false;

  const { error } = await supabase
    .from("live_stream_bans")
    .delete()
    .eq("stream_id", streamId)
    .eq("user_id", userId);

  if (error) {
    console.error("[live/moderation] unbanUserFromStream error:", error);
    return false;
  }

  return true;
}

export async function canUserJoinStream({
  streamId,
  userId
}) {
  const banned = await isUserBannedFromStream({ streamId, userId });

  return {
    allowed: !banned,
    banned,
    message: banned
      ? "You are banned from this live stream."
      : "User can join stream."
  };
}

export async function removeChatMessage({
  messageId
}) {
  if (!messageId) {
    throw new Error("Missing message id.");
  }

  const { error } = await supabase
    .from("live_chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.error("[live/moderation] removeChatMessage error:", error);
    throw error;
  }

  return true;
}

export async function flagChatMessage({
  messageId,
  moderatorId,
  reason = ""
}) {
  if (!messageId) {
    throw new Error("Missing message id.");
  }

  const payload = {
    message_id: messageId,
    moderator_id: moderatorId || null,
    reason: String(reason || "").trim(),
    created_at: nowIso()
  };

  const { data, error } = await supabase
    .from("live_chat_message_flags")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[live/moderation] flagChatMessage error:", error);
    throw error;
  }

  return data;
}

export async function timeoutUserFromStream({
  streamId,
  userId,
  moderatorId,
  minutes = 10,
  reason = "Timed out by moderator"
}) {
  const expiresAt = new Date(Date.now() + Number(minutes || 10) * 60 * 1000).toISOString();

  return banUserFromStream({
    streamId,
    userId,
    moderatorId,
    reason,
    expiresAt
  });
}
