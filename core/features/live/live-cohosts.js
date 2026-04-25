import { supabase } from "/core/supabase.js";

export function cohostStatusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "In The Room";
  if (value === "invited" || value === "pending") return "Waiting To Pop In";
  if (value === "removed") return "Cut Off";
  if (value === "left") return "Stepped Out";
  if (value === "declined") return "Passed";
  if (value === "banned") return "Blocked";

  return "Empty slot";
}

export function richPlayaLabel(slot) {
  return `Rich Playa ${Number(slot || 1)}`;
}

export async function fetchLiveCohosts(streamId) {
  if (!streamId) return [];

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", streamId)
    .eq("role", "cohost")
    .order("slot_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function inviteLiveCohost({ streamId, userId, slotNumber, invitedBy }) {
  if (!streamId) throw new Error("Missing stream id.");
  if (!userId) throw new Error("Missing Rich Playa user id.");

  const slot = Number(slotNumber || 1);

  const rpc = await supabase.rpc("invite_live_rich_playa", {
    target_stream_id: streamId,
    target_user_id: userId,
    target_slot_number: slot
  });

  if (!rpc.error) return rpc.data;

  const { data, error } = await supabase
    .from("live_stream_members")
    .upsert(
      {
        stream_id: streamId,
        user_id: userId,
        role: "cohost",
        status: "invited",
        slot_number: slot,
        display_label: richPlayaLabel(slot),
        invited_by: invitedBy || null,
        can_chat: true,
        can_stream_video: true,
        updated_at: new Date().toISOString()
      },
      { onConflict: "stream_id,user_id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeLiveCohost({ streamId, userId }) {
  if (!streamId || !userId) throw new Error("Missing stream or user id.");

  const rpc = await supabase.rpc("remove_live_rich_playa", {
    target_stream_id: streamId,
    target_user_id: userId
  });

  if (!rpc.error) return rpc.data;

  const { data, error } = await supabase
    .from("live_stream_members")
    .update({
      status: "removed",
      left_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function acceptLiveCohostInvite(streamId) {
  if (!streamId) throw new Error("Missing stream id.");

  const { data, error } = await supabase.rpc("accept_live_rich_playa_invite", {
    target_stream_id: streamId
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function leaveLiveCohost(streamId) {
  if (!streamId) throw new Error("Missing stream id.");

  const { data, error } = await supabase.rpc("leave_live_rich_playa", {
    target_stream_id: streamId
  });

  if (error) throw new Error(error.message);
  return data;
}
