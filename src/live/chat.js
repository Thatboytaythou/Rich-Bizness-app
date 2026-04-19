import { supabase } from "../shared/supabase.js";

let activeChatChannel = null;

function normalizeMessage(row) {
  if (!row) return null;

  return {
    ...row,
    display_name:
      row.display_name ||
      row.username ||
      row.user_name ||
      row.user_id ||
      "User"
  };
}

export async function loadStreamChatMessages(streamId, limit = 100) {
  if (!streamId) return [];

  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[live/chat] loadStreamChatMessages error:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeMessage) : [];
}

export async function sendStreamChatMessage({
  streamId,
  user,
  message
}) {
  const cleanMessage = String(message || "").trim();

  if (!streamId) {
    throw new Error("Missing stream id.");
  }

  if (!user?.id) {
    throw new Error("Please log in first to chat.");
  }

  if (!cleanMessage) {
    throw new Error("Type a message first.");
  }

  const insertPayload = {
    stream_id: streamId,
    user_id: user.id,
    message: cleanMessage,
    display_name:
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      user.email ||
      "User"
  };

  const { data, error } = await supabase
    .from("live_chat_messages")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error("[live/chat] sendStreamChatMessage error:", error);
    throw error;
  }

  await incrementStreamChatCount(streamId);

  return normalizeMessage(data);
}

export async function incrementStreamChatCount(streamId) {
  if (!streamId) return;

  const { data: stream, error: readError } = await supabase
    .from("live_streams")
    .select("id,total_chat_messages")
    .eq("id", streamId)
    .single();

  if (readError) {
    console.error("[live/chat] increment read error:", readError);
    return;
  }

  const nextCount = Number(stream?.total_chat_messages || 0) + 1;

  const { error: updateError } = await supabase
    .from("live_streams")
    .update({
      total_chat_messages: nextCount,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", streamId);

  if (updateError) {
    console.error("[live/chat] increment update error:", updateError);
  }
}

export function subscribeToStreamChat(streamId, onMessagesChanged) {
  if (!streamId) return null;

  unsubscribeFromStreamChat();

  activeChatChannel = supabase
    .channel(`live-chat-${streamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`
      },
      async () => {
        try {
          const messages = await loadStreamChatMessages(streamId);
          onMessagesChanged?.(messages);
        } catch (error) {
          console.error("[live/chat] subscription callback error:", error);
        }
      }
    )
    .subscribe();

  return activeChatChannel;
}

export function unsubscribeFromStreamChat() {
  if (!activeChatChannel) return;

  try {
    supabase.removeChannel(activeChatChannel);
  } catch (error) {
    console.error("[live/chat] unsubscribe error:", error);
  } finally {
    activeChatChannel = null;
  }
}

export function formatChatTimestamp(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}
