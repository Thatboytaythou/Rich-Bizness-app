function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatAccess(value) {
  return safeText(value, "free").toUpperCase();
}

function formatViewerCount(value) {
  const num = Number(value || 0);
  if (num < 1000) return String(num);
  if (num < 1000000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

function deriveCreatorLabel(stream) {
  return (
    stream?.creator_display_name ||
    stream?.display_name ||
    stream?.creator_username ||
    stream?.username ||
    stream?.creator_handle ||
    stream?.creator_email ||
    stream?.creator_id ||
    "Creator"
  );
}

function buildWatchUrl(stream) {
  if (!stream?.slug) return "#";
  return `/watch.html?slug=${encodeURIComponent(stream.slug)}`;
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

export function setButtonBusy(id, busy, busyLabel, idleLabel) {
  const node = el(id);
  if (!node) return;

  node.disabled = !!busy;
  node.textContent = busy ? busyLabel : idleLabel;
  node.style.opacity = busy ? "0.7" : "1";
  node.style.pointerEvents = busy ? "none" : "auto";
}

export function renderStudioSession(user) {
  const node = el("studio-session-status");
  if (!node) return;

  if (!user?.id) {
    node.textContent = "No active session";
    return;
  }

  node.textContent = `Signed in as ${user.email || user.id}`;
}

export function renderStudioPresence(viewers) {
  const countNode = el("studio-current-viewers");
  if (countNode) {
    countNode.textContent = formatViewerCount(viewers);
  }
}

export function renderWatchPresence(viewers) {
  const countNode = el("watch-stream-viewers");
  if (countNode) {
    countNode.textContent = formatViewerCount(viewers);
  }
}

export function fillStudioForm(stream) {
  if (!stream) return;

  const title = el("stream-title");
  const description = el("stream-description");
  const category = el("stream-category");
  const access = el("stream-access-type");
  const price = el("stream-price-cents");
  const thumb = el("stream-thumbnail-url");

  if (title) title.value = stream.title || "";
  if (description) description.value = stream.description || "";
  if (category) category.value = stream.category || "general";
  if (access) access.value = stream.access_type || "free";
  if (price) price.value = Number(stream.price_cents || 0);
  if (thumb) thumb.value = stream.thumbnail_url || "";
}

export function renderStudioStream(stream) {
  const statusNode = el("studio-stream-status");
  const titleNode = el("studio-current-title");
  const slugNode = el("studio-current-slug");
  const accessNode = el("studio-current-access");
  const viewersNode = el("studio-current-viewers");
  const shareInput = el("studio-share-link");

  if (!stream) {
    if (statusNode) statusNode.textContent = "OFFLINE";
    if (titleNode) titleNode.textContent = "No active stream";
    if (slugNode) slugNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    if (shareInput) shareInput.value = "";
    return;
  }

  if (statusNode) statusNode.textContent = stream.is_live ? "LIVE" : "OFFLINE";
  if (titleNode) titleNode.textContent = safeText(stream.title, "Untitled stream");
  if (slugNode) slugNode.textContent = safeText(stream.slug);
  if (accessNode) accessNode.textContent = formatAccess(stream.access_type);
  if (viewersNode) viewersNode.textContent = formatViewerCount(stream.viewer_count || 0);

  if (shareInput) {
    const origin = window.location.origin;
    shareInput.value = `${origin}${buildWatchUrl(stream)}`;
  }
}

export function renderWatchStream(stream) {
  const titleNode = el("watch-stream-title");
  const descNode = el("watch-stream-description");
  const statusNode = el("watch-stream-status");
  const creatorNode = el("watch-stream-creator");
  const accessNode = el("watch-stream-access");
  const viewersNode = el("watch-stream-viewers");

  if (!stream) {
    if (titleNode) titleNode.textContent = "Stream unavailable";
    if (descNode) descNode.textContent = "This live stream could not be loaded.";
    if (statusNode) statusNode.textContent = "OFFLINE";
    if (creatorNode) creatorNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    return;
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Untitled stream");
  if (descNode) {
    descNode.textContent =
      safeText(stream.description, "Live stream is active and ready for viewers.");
  }
  if (statusNode) statusNode.textContent = stream.is_live ? "LIVE" : "OFFLINE";
  if (creatorNode) creatorNode.textContent = deriveCreatorLabel(stream);
  if (accessNode) accessNode.textContent = formatAccess(stream.access_type);
  if (viewersNode) viewersNode.textContent = formatViewerCount(stream.viewer_count || 0);
}

export function renderChatMessages(messages = []) {
  const feed = el("live-chat-feed");
  if (!feed) return;

  if (!Array.isArray(messages) || messages.length === 0) {
    feed.innerHTML = `
      <div class="chat-message">
        <strong>System</strong>
        <span>No messages yet.</span>
      </div>
    `;
    return;
  }

  feed.innerHTML = messages
    .map((message) => {
      const name =
        message.display_name ||
        message.username ||
        message.user_name ||
        message.user_id ||
        "User";

      const body = message.message || "";
      return `
        <div class="chat-message">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(body)}</span>
        </div>
      `;
    })
    .join("");
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
      const creator = deriveCreatorLabel(stream);
      const cover = stream.cover_url || stream.thumbnail_url || "";
      const watchUrl = buildWatchUrl(stream);

      return `
        <article class="rb-live-card">
          <a class="rb-live-card__media" href="${watchUrl}">
            ${
              cover
                ? `<img src="${escapeAttribute(cover)}" alt="${escapeAttribute(stream.title || "Live stream")}" />`
                : `<div class="rb-live-card__fallback">LIVE ROOM</div>`
            }
            <div class="rb-live-card__overlay">
              <span class="rb-live-badge rb-live-badge--live">LIVE</span>
              <span class="rb-live-badge">${formatViewerCount(stream.viewer_count || 0)} viewers</span>
              <span class="rb-live-badge">${formatAccess(stream.access_type)}</span>
            </div>
          </a>

          <div class="rb-live-card__body">
            <div class="rb-live-card__meta">
              <span>${escapeHtml(creator)}</span>
              <span>${escapeHtml(stream.category || "general")}</span>
            </div>

            <h3 class="rb-live-card__title">${escapeHtml(stream.title || "Untitled stream")}</h3>

            <a class="rb-live-watch-btn" href="${watchUrl}">Watch Live</a>
          </div>
        </article>
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

function escapeAttribute(value = "") {
  return escapeHtml(value);
}
