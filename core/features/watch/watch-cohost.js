// =========================
// RICH BIZNESS — WATCH COHOST SYSTEM (FINAL ELITE)
// /core/features/live/watch-cohost.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let streamId = null;
let livekitRoom = null;
let localParticipant = null;

// =========================
// CONFIG
// =========================

const MAX_COHOSTS = 3;

// =========================
// INIT
// =========================

export async function initWatchCohost({ stream }) {
  currentUser = getCurrentUserState();
  streamId = stream?.id;

  if (!currentUser?.id || !streamId) {
    console.warn("❌ cohost init missing user or stream");
    return;
  }

  await joinAsViewer();
  subscribeToMembers();
}

// =========================
// JOIN VIEWER
// =========================

async function joinAsViewer() {
  await supabase
    .from("live_stream_members")
    .upsert({
      stream_id: streamId,
      user_id: currentUser.id,
      role: "viewer",
      is_active: true,
      status: "joined"
    });
}

// =========================
// REQUEST COHOST
// =========================

export async function requestCohost() {
  if (!streamId) return;

  const { error } = await supabase
    .from("live_stream_members")
    .update({
      role: "requesting",
      updated_at: new Date().toISOString()
    })
    .eq("stream_id", streamId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("❌ cohost request failed", error);
  } else {
    console.log("🔥 cohost request sent");
  }
}

// =========================
// HOST ACCEPT COHOST
// =========================

export async function acceptCohost(userId, slot = 1) {
  if (!streamId) return;

  const { error } = await supabase
    .from("live_stream_members")
    .update({
      role: "cohost",
      slot_number: slot,
      updated_at: new Date().toISOString()
    })
    .eq("stream_id", streamId)
    .eq("user_id", userId);

  if (error) {
    console.error("❌ accept cohost failed", error);
  } else {
    console.log("✅ cohost accepted");
  }
}

// =========================
// REMOVE COHOST
// =========================

export async function removeCohost(userId) {
  if (!streamId) return;

  await supabase
    .from("live_stream_members")
    .update({
      role: "viewer",
      slot_number: null
    })
    .eq("stream_id", streamId)
    .eq("user_id", userId);
}

// =========================
// LIVEKIT JOIN
// =========================

export async function joinLiveKit(roomName) {
  try {
    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomName,
        userId: currentUser.id
      })
    });

    const data = await res.json();

    const { Room } = await import("https://cdn.skypack.dev/livekit-client");

    livekitRoom = new Room();

    await livekitRoom.connect(data.url, data.token);

    localParticipant = livekitRoom.localParticipant;

    await enableCameraMic();

    console.log("🎥 LiveKit connected");
  } catch (err) {
    console.error("❌ LiveKit join failed", err);
  }
}

// =========================
// ENABLE MEDIA
// =========================

async function enableCameraMic() {
  if (!localParticipant) return;

  await localParticipant.enableCameraAndMicrophone();
}

// =========================
// LEAVE STREAM
// =========================

export async function leaveStream() {
  if (!streamId) return;

  await supabase
    .from("live_stream_members")
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
      status: "left"
    })
    .eq("stream_id", streamId)
    .eq("user_id", currentUser.id);

  if (livekitRoom) {
    livekitRoom.disconnect();
  }

  console.log("👋 left stream");
}

// =========================
// REALTIME MEMBERS
// =========================

function subscribeToMembers() {
  supabase
    .channel("live-members-" + streamId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_stream_members",
        filter: `stream_id=eq.${streamId}`
      },
      (payload) => {
        handleMemberUpdate(payload.new);
      }
    )
    .subscribe();
}

// =========================
// HANDLE MEMBER UPDATE
// =========================

function handleMemberUpdate(member) {
  if (!member) return;

  // If YOU got promoted to cohost → join camera
  if (
    member.user_id === currentUser.id &&
    member.role === "cohost"
  ) {
    joinLiveKit(member.livekit_room_name || "default-room");
  }

  renderCohosts();
}

// =========================
// LOAD COHOSTS
// =========================

async function renderCohosts() {
  const { data } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", streamId)
    .eq("role", "cohost")
    .order("slot_number", { ascending: true });

  const container = document.getElementById("cohost-slots");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= MAX_COHOSTS; i++) {
    const slotUser = data?.find((m) => m.slot_number === i);

    const el = document.createElement("div");
    el.className = "cohost-slot";

    if (slotUser) {
      el.innerHTML = `
        <div class="cohost-card active">
          <span>COHOST ${i}</span>
          <strong>${slotUser.user_id.slice(0, 6)}</strong>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="cohost-card empty">
          <span>EMPTY SLOT ${i}</span>
        </div>
      `;
    }

    container.appendChild(el);
  }
}
