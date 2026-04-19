import { supabase } from "../shared/supabase.js";

let presenceChannel = null;

function nowIso() {
  return new Date().toISOString();
}

function normalizeMember(row) {
  if (!row) return null;

  return {
    ...row,
    display_name:
      row.display_name ||
      row.username ||
      row.user_id ||
      "User"
  };
}

export async function loadStreamMembers(streamId) {
  if (!streamId) return [];

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[live/presence] loadStreamMembers error:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeMember) : [];
}

export async function joinPresence({
  streamId,
  user,
  role = "viewer"
}) {
  if (!streamId || !user?.id) {
    throw new Error("Missing stream or user for presence join.");
  }

  const existing = await findMember({
    streamId,
    userId: user.id
  });

  if (existing) {
    await touchMember(existing.id);
    return normalizeMember(existing);
  }

  const insertPayload = {
    stream_id: streamId,
    user_id: user.id,
    role,
    display_name:
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      user.email ||
      "User",
    created_at: nowIso(),
    last_seen_at: nowIso()
  };

  const { data, error } = await supabase
    .from("live_stream_members")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error("[live/presence] joinPresence error:", error);
    throw error;
  }

  await syncViewerCount(streamId);

  return normalizeMember(data);
}

export async function leavePresence({
  streamId,
  userId
}) {
  if (!streamId || !userId) return;

  const { error } = await supabase
    .from("live_stream_members")
    .delete()
    .eq("stream_id", streamId)
    .eq("user_id", userId);

  if (error) {
    console.error("[live/presence] leavePresence error:", error);
  }

  await syncViewerCount(streamId);
}

export async function touchPresence({
  streamId,
  userId
}) {
  if (!streamId || !userId) return;

  const member = await findMember({ streamId, userId });
  if (!member?.id) return;

  await touchMember(member.id);
}

async function touchMember(memberId) {
  const { error } = await supabase
    .from("live_stream_members")
    .update({
      last_seen_at: nowIso()
    })
    .eq("id", memberId);

  if (error) {
    console.error("[live/presence] touchMember error:", error);
  }
}

async function findMember({ streamId, userId }) {
  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live/presence] findMember error:", error);
    return null;
  }

  return data || null;
}

export async function syncViewerCount(streamId) {
  if (!streamId) return 0;

  const members = await loadStreamMembers(streamId);
  const viewerCount = Array.isArray(members) ? members.length : 0;

  const { error } = await supabase
    .from("live_streams")
    .update({
      viewer_count: viewerCount,
      peak_viewers: viewerCount,
      last_activity_at: nowIso()
    })
    .eq("id", streamId);

  if (error) {
    console.error("[live/presence] syncViewerCount error:", error);
  }

  return viewerCount;
}

export function subscribeToPresence(streamId, onPresenceChanged) {
  if (!streamId) return null;

  unsubscribeFromPresence();

  presenceChannel = supabase
    .channel(`live-presence-${streamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_stream_members",
        filter: `stream_id=eq.${streamId}`
      },
      async () => {
        try {
          const members = await loadStreamMembers(streamId);
          const viewerCount = members.length;
          onPresenceChanged?.({
            members,
            viewers: viewerCount
          });
        } catch (error) {
          console.error("[live/presence] subscription callback error:", error);
        }
      }
    )
    .subscribe();

  return presenceChannel;
}

export function unsubscribeFromPresence() {
  if (!presenceChannel) return;

  try {
    supabase.removeChannel(presenceChannel);
  } catch (error) {
    console.error("[live/presence] unsubscribe error:", error);
  } finally {
    presenceChannel = null;
  }
}
