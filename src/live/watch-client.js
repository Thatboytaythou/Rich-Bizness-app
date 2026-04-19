import { getSessionUser, supabase } from "../shared/supabase.js";
import { getStreamBySlug, joinStream } from "./live-api.js";
import {
  liveState,
  setSessionState,
  setWatchState,
  setChatState,
  setPresenceState,
  resetWatchState,
  resetChatState,
  resetPresenceState
} from "./live-state.js";
import {
  showWatchError,
  showWatchSuccess,
  renderWatchStream,
  renderWatchPresence,
  renderChatMessages,
  setButtonBusy
} from "./live-ui.js";

const LK = window.LivekitClient;
let watchRoom = null;
let attachedMedia = [];
let chatChannel = null;

function el(id) {
  return document.getElementById(id);
}

function getSlugFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("slug");
}

function clearWatchStage() {
  const stage = el("watch-live-stage");
  if (!stage) return;

  attachedMedia.forEach((node) => {
    try {
      node?.remove?.();
    } catch {}
  });
  attachedMedia = [];

  stage.innerHTML = `
    <div class="stage-empty">
      <strong>Live room viewer stage</strong>
      <span>
        This watch page is synced to your live system. It loads stream details,
        allows viewers to join, and supports chat in the same room context.
      </span>
    </div>
  `;
}

function attachSubscribedTrack(track) {
  const stage = el("watch-live-stage");
  if (!stage || !track) return;

  const mediaEl = track.attach();

  if (track.kind === "video") {
    stage.innerHTML = "";
    mediaEl.autoplay = true;
    mediaEl.playsInline = true;
    mediaEl.className = "stage-video";
    stage.appendChild(mediaEl);
    attachedMedia.push(mediaEl);
    return;
  }

  if (track.kind === "audio") {
    mediaEl.autoplay = true;
    attachedMedia.push(mediaEl);
  }
}

async function requestLivekitToken({
  roomName,
  participantName,
  participantMetadata,
  canPublish = false,
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

async function connectWatchRoom(stream, user) {
  if (!LK) {
    throw new Error("LiveKit client failed to load");
  }

  if (watchRoom) {
    await disconnectWatchRoom();
  }

  const participantId =
    user?.id || `guest-${Math.random().toString(36).slice(2, 8)}`;

  const tokenPayload = await requestLivekitToken({
    roomName: stream.livekit_room_name || stream.slug,
    participantName: `viewer-${participantId}`,
    participantMetadata: {
      role: "viewer",
      streamId: stream.id,
      userId: participantId
    },
    canPublish: false,
    canSubscribe: true
  });

  const room = new LK.Room({
    adaptiveStream: true,
    dynacast: true
  });

  room
    .on(LK.RoomEvent.TrackSubscribed, (track) => {
      attachSubscribedTrack(track);
    })
    .on(LK.RoomEvent.ParticipantConnected, () => {
      renderWatchPresence(room.numParticipants);
    })
    .on(LK.RoomEvent.ParticipantDisconnected, () => {
      renderWatchPresence(room.numParticipants);
    })
    .on(LK.RoomEvent.Disconnected, () => {
      clearWatchStage();
    });

  await room.connect(tokenPayload.url, tokenPayload.token);

  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((pub) => {
      if (pub.track) {
        attachSubscribedTrack(pub.track);
      }
    });
  });

  renderWatchPresence(room.numParticipants);
  watchRoom = room;
}

async function disconnectWatchRoom() {
  if (!watchRoom) return;

  try {
    attachedMedia.forEach((node) => {
      try {
        node?.remove?.();
      } catch {}
    });
    attachedMedia = [];
    await watchRoom.disconnect();
  } catch (error) {
    console.error("[watch-client] disconnectWatchRoom error:", error);
  } finally {
    watchRoom = null;
    clearWatchStage();
  }
}

async function loadChatMessages(streamId) {
  try {
    const { data, error } = await supabase
      .from("live_chat_messages")
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    setChatState({
      messages: Array.isArray(data) ? data : [],
      error: ""
    });

    renderChatMessages(liveState.chat.messages);
  } catch (error) {
    console.error("[watch-client] loadChatMessages error:", error);
    setChatState({
      error: error.message || "Failed to load chat messages."
    });
    renderChatMessages([]);
  }
}

function subscribeToChat(streamId) {
  try {
    if (chatChannel) {
      supabase.removeChannel(chatChannel);
      chatChannel = null;
    }

    chatChannel = supabase
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
          await loadChatMessages(streamId);
        }
      )
      .subscribe();
  } catch (error) {
    console.error("[watch-client] subscribeToChat error:", error);
  }
}

function bindWatchActions() {
  el("watch-join-btn")?.addEventListener("click", joinLiveFlow);
  el("watch-purchase-btn")?.addEventListener("click", handlePurchaseFlow);
  el("chat-send-btn")?.addEventListener("click", sendChatMessage);
}

async function joinLiveFlow() {
  try {
    showWatchError("");
    showWatchSuccess("");

    const user = liveState.session.user;
    const stream = liveState.watch.stream;

    if (!stream?.id) {
      throw new Error("No stream loaded.");
    }

    if (!stream.is_live) {
      throw new Error("This stream is offline.");
    }

    setWatchState({
      isJoining: true
    });

    setButtonBusy("watch-join-btn", true, "Joining...", "Join Live");

    await joinStream(stream.id, user?.id || null);
    await connectWatchRoom(stream, user);

    const nextViewerCount = Number(stream.viewer_count || 0) + 1;
    setPresenceState({
      viewers: nextViewerCount
    });
    renderWatchPresence(nextViewerCount);

    setWatchState({
      isJoining: false,
      joined: true,
      success: "Joined stream successfully."
    });

    showWatchSuccess("Joined stream successfully.");
  } catch (error) {
    console.error("[watch-client] joinLiveFlow error:", error);
    setWatchState({
      isJoining: false,
      error: error.message || "Failed to join stream."
    });
    showWatchError(error.message || "Failed to join stream.");
  } finally {
    const stream = liveState.watch.stream;
    setButtonBusy(
      "watch-join-btn",
      false,
      "Joining...",
      stream?.is_live ? "Join Live" : "Offline"
    );
  }
}

function handlePurchaseFlow() {
  const stream = liveState.watch.stream;

  if (!stream?.id) {
    showWatchError("No stream loaded.");
    return;
  }

  showWatchSuccess("Paid access flow hooks here next.");
}

async function sendChatMessage() {
  try {
    showWatchError("");

    const user = liveState.session.user;
    const stream = liveState.watch.stream;
    const input = el("chat-message-input");
    const message = input?.value?.trim() || "";

    if (!user?.id) {
      throw new Error("Please log in first to chat.");
    }

    if (!stream?.id) {
      throw new Error("No stream loaded.");
    }

    if (!message) {
      throw new Error("Type a message first.");
    }

    setChatState({
      sending: true,
      error: ""
    });

    setButtonBusy("chat-send-btn", true, "Sending...", "Send");

    const { error } = await supabase
      .from("live_chat_messages")
      .insert([
        {
          stream_id: stream.id,
          user_id: user.id,
          message,
          display_name:
            user.user_metadata?.display_name ||
            user.user_metadata?.username ||
            user.email ||
            "User"
        }
      ]);

    if (error) throw error;

    if (input) input.value = "";

    setChatState({
      sending: false
    });
  } catch (error) {
    console.error("[watch-client] sendChatMessage error:", error);
    setChatState({
      sending: false,
      error: error.message || "Failed to send message."
    });
    showWatchError(error.message || "Failed to send message.");
  } finally {
    setButtonBusy("chat-send-btn", false, "Sending...", "Send");
  }
}

async function bootWatchPage() {
  try {
    resetWatchState();
    resetChatState();
    resetPresenceState();
    showWatchError("");
    showWatchSuccess("");
    clearWatchStage();

    const user = await getSessionUser();

    setSessionState({
      user,
      ready: true
    });

    bindWatchActions();

    const slug = getSlugFromUrl();
    if (!slug) {
      renderWatchStream(null);
      showWatchError("Missing stream slug in URL.");
      return;
    }

    const stream = await getStreamBySlug(slug);

    if (!stream) {
      renderWatchStream(null);
      showWatchError("Stream not found.");
      return;
    }

    setWatchState({
      stream
    });

    setPresenceState({
      viewers: Number(stream.viewer_count || 0)
    });

    renderWatchStream(stream);
    renderWatchPresence(Number(stream.viewer_count || 0));

    await loadChatMessages(stream.id);
    subscribeToChat(stream.id);
  } catch (error) {
    console.error("[watch-client] boot error:", error);
    showWatchError(error.message || "Failed to load watch page.");
  }
}

document.addEventListener("DOMContentLoaded", bootWatchPage);

window.addEventListener("beforeunload", () => {
  disconnectWatchRoom();

  if (chatChannel) {
    try {
      supabase.removeChannel(chatChannel);
    } catch {}
  }
});
