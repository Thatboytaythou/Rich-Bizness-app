import { liveState } from "./live-state.js";

function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatAccessType(value) {
  const map = {
    free: "FREE",
    paid: "PAID",
    vip: "VIP",
    followers: "FOLLOWERS"
  };

  return map[String(value || "").toLowerCase()] || safeText(value, "FREE");
}

function formatStatus(stream) {
  if (!stream) return "OFFLINE";
  return stream.is_live ? "LIVE" : "OFFLINE";
}

function buildWatchUrl(slug) {
  if (!slug) return "";
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(slug)}`;
}

function formatChatMessageName(message) {
  return (
    message?.display_name ||
    message?.username ||
    message?.name ||
    message?.user_id ||
    "User"
  );
}

function formatChatMessageBody(message) {
  return message?.message || "";
}

export function showLiveError(message) {
  const node = el("live-error");
  if (!node) return;

  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function showLiveSuccess(message) {
  const node = el("live-success");
  if (!node) return;

  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function showWatchError(message) {
  const node = el("watch-error");
  if (!node) return;

  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function showWatchSuccess(message) {
  const node = el("watch-success");
  if (!node) return;

  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function setButtonBusy(id, busy, busyText = "Working...", idleText = "Submit") {
  const button = el(id);
  if (!button) return;

  button.disabled = !!busy;
  button.textContent = busy ? busyText : idleText;
  button.style.opacity = busy ? "0.75" : "1";
  button.style.cursor = busy ? "wait" : "pointer";
}

export function renderStudioSession(user) {
  const node = el("studio-session-status");
  if (!node) return;

  if (!user) {
    node.textContent = "No active session";
    return;
  }

  node.textContent = `Signed in as ${user.email || user.id}`;
}

export function renderStudioStream(stream) {
  const statusNode = el("studio-stream-status");
  const titleNode = el("studio-current-title");
  const slugNode = el("studio-current-slug");
  const accessNode = el("studio-current-access");
  const viewersNode = el("studio-current-viewers");
  const shareInput = el("studio-share-link");

  if (statusNode) statusNode.textContent = formatStatus(stream);

  if (!stream) {
    if (titleNode) titleNode.textContent = "No active stream";
    if (slugNode) slugNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    if (shareInput) shareInput.value = "";
    return;
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Untitled Stream");
  if (slugNode) slugNode.textContent = safeText(stream.slug, "--");
  if (accessNode) accessNode.textContent = formatAccessType(stream.access_type);
  if (viewersNode) viewersNode.textContent = safeText(stream.viewer_count, "0");
  if (shareInput) shareInput.value = buildWatchUrl(stream.slug);
}

export function renderStudioPresence(viewers) {
  const viewersNode = el("studio-current-viewers");
  if (!viewersNode) return;
  viewersNode.textContent = safeText(viewers, "0");
}

export function fillStudioForm(stream) {
  if (!stream) return;

  const title = el("stream-title");
  const description = el("stream-description");
  const category = el("stream-category");
  const accessType = el("stream-access-type");
  const priceCents = el("stream-price-cents");
  const thumbnail = el("stream-thumbnail-url");

  if (title) title.value = stream.title || "";
  if (description) description.value = stream.description || "";
  if (category) category.value = stream.category || "general";
  if (accessType) accessType.value = stream.access_type || "free";
  if (priceCents) priceCents.value = stream.price_cents ?? 0;
  if (thumbnail) thumbnail.value = stream.thumbnail_url || "";
}

export function renderLiveRail(streams = []) {
  const rail = el("homepage-live-rail");
  if (!rail) return;

  if (!Array.isArray(streams) || streams.length === 0) {
    rail.innerHTML = `
      <div class="rb-live-empty">
        <div>
          <strong>No one is live right now.</strong>
          <span>When a creator starts streaming, the live rail will appear here.</span>
        </div>
      </div>
    `;
    return;
  }

  rail.innerHTML = streams
    .map((stream) => {
      const thumb = stream.thumbnail_url || stream.cover_url || "";
      const title = safeText(stream.title, "Live Stream");
      const slug = safeText(stream.slug, "");
      const access = formatAccessType(stream.access_type);
      const viewers = safeText(stream.viewer_count, "0");
      const watchUrl = buildWatchUrl(slug);

      return `
        <article class="rb-live-card">
          <a class="rb-live-card__media" href="${watchUrl}">
            ${
              thumb
                ? `<img src="${thumb}" alt="${title}" />`
                : `<div class="rb-live-card__fallback">RICH BIZNESS LIVE</div>`
            }
            <div class="rb-live-card__overlay">
              <span class="rb-live-badge rb-live-badge--live">LIVE</span>
              <span class="rb-live-badge">${access}</span>
              <span class="rb-live-badge">${viewers} watching</span>
            </div>
          </a>

          <div class="rb-live-card__body">
            <div class="rb-live-card__meta">
              <span>${safeText(stream.category, "general")}</span>
              <span>${slug || "--"}</span>
            </div>

            <h3 class="rb-live-card__title">${title}</h3>

            <a class="rb-live-watch-btn" href="${watchUrl}">Watch Live</a>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderWatchStream(stream) {
  const titleNode = el("watch-stream-title");
  const descriptionNode = el("watch-stream-description");
  const statusNode = el("watch-stream-status");
  const creatorNode = el("watch-stream-creator");
  const accessNode = el("watch-stream-access");
  const viewersNode = el("watch-stream-viewers");
  const joinButton = el("watch-join-btn");

  if (!stream) {
    if (titleNode) titleNode.textContent = "Stream unavailable";
    if (descriptionNode) descriptionNode.textContent = "This live stream could not be loaded.";
    if (statusNode) statusNode.textContent = "OFFLINE";
    if (creatorNode) creatorNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    if (joinButton) joinButton.textContent = "Join Live";
    return;
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Live Stream");
  if (descriptionNode) {
    descriptionNode.textContent =
      safeText(stream.description, "Join the room and watch live on Rich Bizness.");
  }
  if (statusNode) statusNode.textContent = formatStatus(stream);
  if (creatorNode) creatorNode.textContent = safeText(stream.creator_id, "--");
  if (accessNode) accessNode.textContent = formatAccessType(stream.access_type);
  if (viewersNode) viewersNode.textContent = safeText(stream.viewer_count, "0");

  if (joinButton) {
    joinButton.textContent = stream.is_live ? "Join Live" : "Offline";
    joinButton.disabled = !stream.is_live;
    joinButton.style.opacity = stream.is_live ? "1" : "0.65";
    joinButton.style.cursor = stream.is_live ? "pointer" : "not-allowed";
  }
}

export function renderWatchPresence(viewers) {
  const viewersNode = el("watch-stream-viewers");
  if (!viewersNode) return;
  viewersNode.textContent = safeText(viewers, "0");
}

export function renderChatMessages(messages = []) {
  const feed = el("live-chat-feed");
  if (!feed) return;

  if (!Array.isArray(messages) || messages.length === 0) {
    feed.innerHTML = `
      <div class="chat-message">
        <strong>System</strong>
        <span>Chat will appear here once messages start coming in.</span>
      </div>
    `;
    return;
  }

  feed.innerHTML = messages
    .map((message) => {
      const name = formatChatMessageName(message);
      const body = formatChatMessageBody(message);

      return `
        <div class="chat-message">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(body)}</span>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function syncStudioFromState() {
  renderStudioSession(liveState.session?.user || null);
  renderStudioStream(liveState.studio?.stream || null);
  renderStudioPresence(liveState.presence?.viewers || 0);
}

export function syncWatchFromState() {
  renderWatchStream(liveState.watch?.stream || null);
  renderWatchPresence(liveState.presence?.viewers || 0);
  renderChatMessages(liveState.chat?.messages || []);
}
