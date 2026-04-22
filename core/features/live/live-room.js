import { supabase } from "/core/supabase.js";

/**
 * STATE
 */
let room = null;
let currentStream = null;
let participant = null;
let viewerInterval = null;

/**
 * CONFIG (comes from your env setup)
 */
const LIVEKIT_URL = window.LIVEKIT_URL || "";
const TOKEN_ENDPOINT = "/api/livekit-token";

/**
 * UTILS
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(...args) {
  console.log("[live-room]", ...args);
}

function err(...args) {
  console.error("[live-room]", ...args);
}

/**
 * FETCH STREAM
 */
export async function fetchStreamBySlugOrId({ slug, id }) {
  let query = supabase.from("live_streams").select("*");

  if (slug) query = query.eq("slug", slug);
  if (id) query = query.eq("id", id);

  const { data, error } = await query.single();

  if (error) {
    err("fetchStream error:", error);
    throw error;
  }

  return data;
}

/**
 * GET LIVEKIT TOKEN
 */
async function getToken({ roomName, identity }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roomName,
      identity
    })
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Token fetch failed");
  }

  return json.token;
}

/**
 * CONNECT TO ROOM
 */
export async function connectToRoom({
  stream,
  videoEl,
  identity = `viewer-${Date.now()}`
}) {
  if (!window.LivekitClient) {
    throw new Error("LiveKit client not loaded");
  }

  currentStream = stream;

  const roomName = stream.livekit_room_name;
  if (!roomName) throw new Error("Missing room name");

  const token = await getToken({ roomName, identity });

  const { Room } = window.LivekitClient;

  room = new Room({
    adaptiveStream: true,
    dynacast: true
  });

  bindRoomEvents(room, videoEl);

  await room.connect(LIVEKIT_URL, token);

  participant = room.localParticipant;

  log("Connected to room:", roomName);

  startViewerSync();

  return room;
}

/**
 * BIND EVENTS
 */
function bindRoomEvents(room, videoEl) {
  room.on("trackSubscribed", (track, publication, participant) => {
    if (track.kind === "video") {
      const element = track.attach();
      videoEl.innerHTML = "";
      videoEl.appendChild(element);
    }

    if (track.kind === "audio") {
      track.attach();
    }
  });

  room.on("participantDisconnected", () => {
    log("Participant left");
  });

  room.on("disconnected", () => {
    log("Room disconnected");
    stopViewerSync();
  });
}

/**
 * START CAMERA (CREATOR SIDE)
 */
export async function startPublishing({ videoEl }) {
  if (!room) throw new Error("Room not connected");

  await room.localParticipant.enableCameraAndMicrophone();

  room.localParticipant.videoTracks.forEach(pub => {
    const track = pub.track;
    const el = track.attach();
    videoEl.innerHTML = "";
    videoEl.appendChild(el);
  });

  log("Camera + mic started");
}

/**
 * STOP CAMERA
 */
export async function stopPublishing() {
  if (!room) return;

  await room.localParticipant.setCameraEnabled(false);
  await room.localParticipant.setMicrophoneEnabled(false);

  log("Publishing stopped");
}

/**
 * VIEWER COUNT SYNC (REAL)
 */
function startViewerSync() {
  stopViewerSync();

  viewerInterval = setInterval(async () => {
    if (!room || !currentStream) return;

    const viewerCount = room.numParticipants;

    await supabase
      .from("live_streams")
      .update({
        viewer_count: viewerCount,
        peak_viewers: Math.max(
          viewerCount,
          currentStream.peak_viewers || 0
        ),
        last_activity_at: new Date().toISOString()
      })
      .eq("id", currentStream.id);

  }, 5000);
}

function stopViewerSync() {
  if (viewerInterval) {
    clearInterval(viewerInterval);
    viewerInterval = null;
  }
}

/**
 * DISCONNECT
 */
export async function disconnectRoom() {
  if (!room) return;

  stopViewerSync();

  await room.disconnect();

  room = null;
  currentStream = null;

  log("Disconnected clean");
}

/**
 * END STREAM (CREATOR)
 */
export async function endStream() {
  if (!currentStream?.id) return;

  await supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: new Date().toISOString()
    })
    .eq("id", currentStream.id);

  await disconnectRoom();

  log("Stream ended");
}

/**
 * AUTO BOOT (WATCH PAGE HELPER)
 */
export async function bootLiveRoom({
  videoContainerId = "live-video",
  slug = null,
  id = null
}) {
  const container = document.getElementById(videoContainerId);

  if (!container) {
    err("Missing video container");
    return;
  }

  try {
    const stream = await fetchStreamBySlugOrId({ slug, id });

    if (!stream) {
      container.innerHTML = "Stream not found";
      return;
    }

    if (stream.status !== "live") {
      container.innerHTML = "Stream is offline";
      return;
    }

    await connectToRoom({
      stream,
      videoEl: container
    });

  } catch (e) {
    err("boot error:", e);
    container.innerHTML = "Failed to load stream";
  }
}
