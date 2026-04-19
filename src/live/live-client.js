import { getSessionUser } from "../shared/supabase.js";
import { createStream, endStream, getLiveStreams } from "./live-api.js";
import {
  liveState,
  setSessionState,
  setStudioState,
  setLiveRailState,
  setPresenceState,
  resetStudioState,
  resetPresenceState
} from "./live-state.js";
import {
  showLiveError,
  showLiveSuccess,
  renderStudioSession,
  renderStudioStream,
  renderStudioPresence,
  renderLiveRail,
  setButtonBusy,
  fillStudioForm
} from "./live-ui.js";

const LK = window.LivekitClient;

let studioRoom = null;
let attachedLocalEls = [];

function el(id) {
  return document.getElementById(id);
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function makeStreamSlug(title = "") {
  const base = slugify(title || "live-stream");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "live-stream"}-${suffix}`;
}

function clearLocalStage() {
  const stage = el("live-local-stage");
  if (!stage) return;
  attachedLocalEls.forEach((node) => node?.remove?.());
  attachedLocalEls = [];
  stage.innerHTML = `
    <div class="stage-empty">
      <strong>Camera preview</strong>
      <span>Your camera preview will appear here when you go live.</span>
    </div>
  `;
}

function attachLocalTracks(room) {
  const stage = el("live-local-stage");
  if (!stage) return;

  stage.innerHTML = "";
  attachedLocalEls.forEach((node) => node?.remove?.());
  attachedLocalEls = [];

  let attached = false;

  room.localParticipant.videoTrackPublications.forEach((pub) => {
    if (!pub.track) return;
    const mediaEl = pub.track.attach();
    mediaEl.autoplay = true;
    mediaEl.muted = true;
    mediaEl.playsInline = true;
    mediaEl.className = "stage-video";
    stage.appendChild(mediaEl);
    attachedLocalEls.push(mediaEl);
    attached = true;
  });

  room.localParticipant.audioTrackPublications.forEach((pub) => {
    if (!pub.track) return;
    const audioEl = pub.track.attach();
    audioEl.autoplay = true;
    audioEl.muted = true;
    attachedLocalEls.push(audioEl);
  });

  if (!attached) {
    clearLocalStage();
  }
}

async function requestLivekitToken({
  roomName,
  participantName,
  participantMetadata,
  canPublish = true,
  canSubscribe = true
}) {
  const response = await fetch("/api/livekit-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roomName,
      participantName,
      participantMetadata,
      canPublish,
      canSubscribe
    })
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error || "Failed to fetch LiveKit token");
  }

  return json;
}

async function connectStudioRoom(stream, user) {
  if (!LK) {
    throw new Error("LiveKit client failed to load");
  }

  if (studioRoom) {
    await disconnectStudioRoom();
  }

  const tokenPayload = await requestLivekitToken({
    roomName: stream.livekit_room_name || stream.slug,
    participantName: `host-${user.id}`,
    participantMetadata: {
      role: "host",
      streamId: stream.id,
      userId: user.id
    },
    canPublish: true,
    canSubscribe: true
  });

  const room = new LK.Room({
    adaptiveStream: true,
    dynacast: true
  });

  room
    .on(LK.RoomEvent.Disconnected, () => {
      clearLocalStage();
    })
    .on(LK.RoomEvent.ParticipantConnected, () => {
      renderStudioPresence(room.numParticipants);
    })
    .on(LK.RoomEvent.ParticipantDisconnected, () => {
      renderStudioPresence(room.numParticipants);
    })
    .on(LK.RoomEvent.LocalTrackPublished, () => {
      attachLocalTracks(room);
    })
    .on(LK.RoomEvent.LocalTrackUnpublished, () => {
      attachLocalTracks(room);
    });

  await room.connect(tokenPayload.url, tokenPayload.token);

  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);

  attachLocalTracks(room);
  renderStudioPresence(room.numParticipants);

  studioRoom = room;
}

async function disconnectStudioRoom() {
  if (!studioRoom) return;

  try {
    studioRoom.localParticipant.videoTrackPublications.forEach((pub) => {
      pub.track?.stop?.();
      pub.track?.detach?.();
    });

    studioRoom.localParticipant.audioTrackPublications.forEach((pub) => {
      pub.track?.stop?.();
      pub.track?.detach?.();
    });

    await studioRoom.disconnect();
  } catch (error) {
    console.error("[live-client] disconnectStudioRoom error:", error);
  } finally {
    studioRoom = null;
    clearLocalStage();
  }
}

async function bootLivePage() {
  try {
    resetStudioState();
    resetPresenceState();
    showLiveError("");
    showLiveSuccess("");
    clearLocalStage();

    const user = await getSessionUser();

    setSessionState({
      user,
      ready: true
    });

    renderStudioSession(user);
    bindStudioActions();

    if (!user) {
      showLiveError("Please log in first from /auth.html before starting a stream.");
      renderStudioStream(null);
      return;
    }

    await loadCurrentUserLiveStream(user.id);
    await loadLiveRailForStudio();
  } catch (error) {
    console.error("[live-client] boot error:", error);
    showLiveError(error.message || "Failed to load live studio.");
  }
}

async function loadCurrentUserLiveStream(userId) {
  try {
    const streams = await getLiveStreams();
    const ownLive = Array.isArray(streams)
      ? streams.find((stream) => stream.creator_id === userId)
      : null;

    setStudioState({
      stream: ownLive || null
    });

    if (ownLive) {
      fillStudioForm(ownLive);
      renderStudioStream(ownLive);
      setPresenceState({
        viewers: Number(ownLive.viewer_count || 0)
      });
      renderStudioPresence(Number(ownLive.viewer_count || 0));
      return;
    }

    renderStudioStream(null);
    renderStudioPresence(0);
  } catch (error) {
    console.error("[live-client] loadCurrentUserLiveStream error:", error);
    showLiveError(error.message || "Failed to load your stream.");
  }
}

async function loadLiveRailForStudio() {
  try {
    setLiveRailState({
      loading: true,
      error: ""
    });

    const streams = await getLiveStreams();

    setLiveRailState({
      streams: Array.isArray(streams) ? streams : [],
      loading: false,
      error: ""
    });

    renderLiveRail(liveState.liveRail.streams);
  } catch (error) {
    console.error("[live-client] loadLiveRailForStudio error:", error);
    setLiveRailState({
      loading: false,
      error: error.message || "Failed to load live rail."
    });
  }
}

function collectStudioForm() {
  const title = el("stream-title")?.value?.trim() || "";
  const description = el("stream-description")?.value?.trim() || "";
  const category = el("stream-category")?.value?.trim() || "general";
  const accessType = el("stream-access-type")?.value?.trim() || "free";
  const priceCents = Number(el("stream-price-cents")?.value || 0);
  const thumbnailUrl = el("stream-thumbnail-url")?.value?.trim() || "";

  return {
    title,
    description,
    category,
    access_type: accessType,
    price_cents: Number.isFinite(priceCents) ? priceCents : 0,
    thumbnail_url: thumbnailUrl
  };
}

function validateStudioPayload(payload) {
  if (!payload.title) {
    throw new Error("Stream title is required.");
  }

  if (payload.access_type === "paid" && Number(payload.price_cents || 0) <= 0) {
    throw new Error("Paid streams must have a price greater than 0.");
  }
}

function bindStudioActions() {
  el("start-stream-btn")?.addEventListener("click", startLiveFlow);
  el("end-stream-btn")?.addEventListener("click", endLiveFlow);
  el("copy-share-link-btn")?.addEventListener("click", copyShareLink);
}

async function startLiveFlow() {
  try {
    showLiveError("");
    showLiveSuccess("");

    const user = liveState.session.user;
    if (!user?.id) {
      throw new Error("Please log in first from /auth.html.");
    }

    if (liveState.studio.stream?.is_live) {
      throw new Error("You already have a live stream running.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera is not supported in this browser.");
    }

    const formPayload = collectStudioForm();
    validateStudioPayload(formPayload);

    setStudioState({
      isCreating: true,
      error: "",
      success: ""
    });

    setButtonBusy("start-stream-btn", true, "Starting...", "Start Stream");

    const slug = makeStreamSlug(formPayload.title);

    const stream = await createStream({
      creator_id: user.id,
      title: formPayload.title,
      description: formPayload.description,
      category: formPayload.category,
      access_type: formPayload.access_type,
      price_cents: formPayload.price_cents,
      thumbnail_url: formPayload.thumbnail_url,
      slug
    });

    await connectStudioRoom(stream, user);

    setStudioState({
      stream,
      isCreating: false,
      success: "Stream started successfully."
    });

    setPresenceState({
      viewers: Number(stream.viewer_count || 0)
    });

    renderStudioStream(stream);
    renderStudioPresence(Number(stream.viewer_count || 0));
    showLiveSuccess("Stream started successfully.");

    await loadLiveRailForStudio();
  } catch (error) {
    console.error("[live-client] startLiveFlow error:", error);
    setStudioState({
      isCreating: false,
      error: error.message || "Failed to start stream."
    });
    showLiveError(error.message || "Failed to start stream.");
  } finally {
    setButtonBusy("start-stream-btn", false, "Starting...", "Start Stream");
  }
}

async function endLiveFlow() {
  try {
    showLiveError("");
    showLiveSuccess("");

    const stream = liveState.studio.stream;
    if (!stream?.id) {
      throw new Error("No active stream to end.");
    }

    setStudioState({
      isEnding: true,
      error: "",
      success: ""
    });

    setButtonBusy("end-stream-btn", true, "Ending...", "End Stream");

    await disconnectStudioRoom();
    await endStream(stream.id);

    setStudioState({
      stream: null,
      isEnding: false,
      success: "Stream ended."
    });

    setPresenceState({
      viewers: 0,
      members: []
    });

    renderStudioStream(null);
    renderStudioPresence(0);
    showLiveSuccess("Stream ended.");

    await loadLiveRailForStudio();
  } catch (error) {
    console.error("[live-client] endLiveFlow error:", error);
    setStudioState({
      isEnding: false,
      error: error.message || "Failed to end stream."
    });
    showLiveError(error.message || "Failed to end stream.");
  } finally {
    setButtonBusy("end-stream-btn", false, "Ending...", "End Stream");
  }
}

async function copyShareLink() {
  try {
    const input = el("studio-share-link");
    const value = input?.value?.trim() || "";

    if (!value) {
      throw new Error("No share link yet. Start a stream first.");
    }

    await navigator.clipboard.writeText(value);
    showLiveSuccess("Share link copied.");
  } catch (error) {
    console.error("[live-client] copyShareLink error:", error);
    showLiveError(error.message || "Failed to copy share link.");
  }
}

document.addEventListener("DOMContentLoaded", bootLivePage);
window.addEventListener("beforeunload", () => {
  disconnectStudioRoom();
});
