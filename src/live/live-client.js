import { getSessionUser } from "../shared/supabase.js";
import {
  getLiveStreams,
  createStream,
  endStream
} from "./live-api.js";
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

async function bootLivePage() {
  try {
    resetStudioState();
    resetPresenceState();
    showLiveError("");
    showLiveSuccess("");

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

    const formPayload = collectStudioForm();
    validateStudioPayload(formPayload);

    setStudioState({
      isCreating: true,
      error: "",
      success: ""
    });

    setButtonBusy("start-stream-btn", true, "Starting...", "Start Stream");

    const payload = {
      creator_id: user.id,
      title: formPayload.title,
      description: formPayload.description,
      category: formPayload.category,
      access_type: formPayload.access_type,
      price_cents: formPayload.price_cents,
      thumbnail_url: formPayload.thumbnail_url,
      slug: makeStreamSlug(formPayload.title),
      is_live: true,
      viewer_count: 0
    };

    const stream = await createStream(payload);

    if (!stream) {
      throw new Error("Failed to create stream.");
    }

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
