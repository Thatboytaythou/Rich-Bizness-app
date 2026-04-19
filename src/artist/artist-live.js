import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function el(id) {
  return document.getElementById(id);
}

function getArtistIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function showArtistLiveError(message) {
  const node = el("artist-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

function showArtistLiveSuccess(message) {
  const node = el("artist-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

function setLiveButtonState({
  isOwner = false,
  hasLive = false,
  isLive = false,
  liveSlug = ""
} = {}) {
  const goLiveBtn = el("artist-go-live-btn");
  const watchBtn = el("artist-watch-live-btn");

  if (goLiveBtn) {
    if (isOwner) {
      goLiveBtn.style.display = "inline-flex";
      goLiveBtn.textContent = isLive ? "Open Live Studio" : "Go Live";
      goLiveBtn.onclick = () => {
        window.location.href = "/live.html";
      };
    } else {
      goLiveBtn.style.display = "none";
    }
  }

  if (watchBtn) {
    if (hasLive && liveSlug) {
      watchBtn.style.display = "inline-flex";
      watchBtn.textContent = isLive ? "Watch Live" : "Open Latest Session";
      watchBtn.onclick = () => {
        window.location.href = `/watch.html?slug=${encodeURIComponent(liveSlug)}`;
      };
    } else {
      watchBtn.style.display = "none";
    }
  }
}

function renderArtistLiveCard(stream, isOwner = false) {
  const titleEl = el("artist-live-title");
  const descEl = el("artist-live-description");
  const stateEl = el("artist-live-state");
  const slugEl = el("artist-live-slug");
  const accessEl = el("artist-live-access");

  if (!stream) {
    if (titleEl) titleEl.textContent = "Artist live room";
    if (descEl) {
      descEl.textContent = isOwner
        ? "You do not have an active artist live session yet. Start one from the live studio."
        : "This artist does not have a live session active yet.";
    }
    if (stateEl) stateEl.textContent = "OFFLINE";
    if (slugEl) slugEl.textContent = "--";
    if (accessEl) accessEl.textContent = "--";

    setLiveButtonState({
      isOwner,
      hasLive: false,
      isLive: false,
      liveSlug: ""
    });
    return;
  }

  const isLive = !!stream.started_at && !stream.ended_at;

  if (titleEl) titleEl.textContent = safeText(stream.title, "Artist Live Session");
  if (descEl) {
    descEl.textContent = safeText(
      stream.description,
      isLive
        ? "Artist is live right now."
        : "Latest artist session ready for viewers."
    );
  }
  if (stateEl) stateEl.textContent = isLive ? "LIVE" : "OFFLINE";
  if (slugEl) slugEl.textContent = safeText(stream.slug, "--");
  if (accessEl) {
    accessEl.textContent = safeText(
      stream.access_type ? String(stream.access_type).toUpperCase() : "FREE",
      "FREE"
    );
  }

  setLiveButtonState({
    isOwner,
    hasLive: true,
    isLive,
    liveSlug: stream.slug || ""
  });
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

async function resolveArtistId() {
  const fromUrl = getArtistIdFromUrl();
  if (fromUrl) return fromUrl;

  const currentUser = await getCurrentUser();
  return currentUser?.id || null;
}

async function getLatestArtistLive(artistId) {
  if (!artistId) return null;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", artistId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[artist-live] getLatestArtistLive error:", error);
    return null;
  }

  return data || null;
}

async function getArtistLiveCount(artistId) {
  if (!artistId) return 0;

  const { count, error } = await supabase
    .from("live_streams")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", artistId);

  if (error) {
    console.error("[artist-live] getArtistLiveCount error:", error);
    return 0;
  }

  return count || 0;
}

async function renderArtistLiveIntegration() {
  try {
    showArtistLiveError("");
    showArtistLiveSuccess("");

    const [currentUser, artistId] = await Promise.all([
      getCurrentUser(),
      resolveArtistId()
    ]);

    if (!artistId) {
      renderArtistLiveCard(null, false);
      showArtistLiveError("No artist found for this page.");
      return;
    }

    const isOwner = currentUser?.id === artistId;

    const [latestLive, liveCount] = await Promise.all([
      getLatestArtistLive(artistId),
      getArtistLiveCount(artistId)
    ]);

    const livesCountEl = el("artist-lives-count");
    if (livesCountEl) {
      livesCountEl.textContent = String(liveCount || 0);
    }

    renderArtistLiveCard(latestLive, isOwner);

    if (latestLive && latestLive.started_at && !latestLive.ended_at) {
      showArtistLiveSuccess("Artist live session is active.");
    }
  } catch (error) {
    console.error("[artist-live] renderArtistLiveIntegration error:", error);
    renderArtistLiveCard(null, false);
    showArtistLiveError(error.message || "Failed to load artist live system.");
  }
}

document.addEventListener("DOMContentLoaded", renderArtistLiveIntegration);
