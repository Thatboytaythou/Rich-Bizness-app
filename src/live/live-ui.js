function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function formatCount(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatAccessLabel(stream) {
  const accessType = safeText(stream?.access_type || "free").toLowerCase();
  const priceCents = Number(stream?.price_cents || 0);

  if (accessType === "paid") {
    return priceCents > 0 ? `PAID • $${(priceCents / 100).toFixed(2)}` : "PAID";
  }

  if (accessType === "vip") return "VIP";
  if (accessType === "followers") return "FOLLOWERS";
  return "FREE";
}

export function showLiveError(message) {
  const node = el("live-error");
  if (!node) return;
  node.textContent = safeText(message);
  node.style.display = message ? "block" : "none";
}

export function showLiveSuccess(message) {
  const node = el("live-success");
  if (!node) return;
  node.textContent = safeText(message);
  node.style.display = message ? "block" : "none";
}

export function showWatchError(message) {
  const node = el("watch-error");
  if (!node) return;
  node.textContent = safeText(message);
  node.style.display = message ? "block" : "none";
}

export function showWatchSuccess(message) {
  const node = el("watch-success");
  if (!node) return;
  node.textContent = safeText(message);
  node.style.display = message ? "block" : "none";
}

export function renderStudioSession(user) {
  const status = el("studio-session-status");
  if (!status) return;

  if (!user) {
    status.textContent = "No active session";
    return;
  }

  status.textContent = `Signed in as ${user.email || user.id}`;
}

export function renderStudioStream(stream) {
  const statusBadge = el("studio-stream-status");
  const titleNode = el("studio-current-title");
  const slugNode = el("studio-current-slug");
  const accessNode = el("studio-current-access");
  const viewersNode = el("studio-current-viewers");
  const shareNode = el("studio-share-link");
  const endBtn = el("end-stream-btn");
  const startBtn = el("start-stream-btn");

  if (!stream) {
    if (statusBadge) statusBadge.textContent = "OFFLINE";
    if (titleNode) titleNode.textContent = "No active stream";
    if (slugNode) slugNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    if (shareNode) {
      shareNode.value = "";
      shareNode.placeholder = "Start stream first, then copy the watch link.";
    }
    if (endBtn) endBtn.disabled = true;
    if (startBtn) startBtn.disabled = false;
    return;
  }

  if (statusBadge) {
    statusBadge.textContent = stream.is_live ? "LIVE" : "OFFLINE";
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Untitled stream");
  if (slugNode) slugNode.textContent = safeText(stream.slug, "--");
  if (accessNode) accessNode.textContent = formatAccessLabel(stream);
  if (viewersNode) viewersNode.textContent = formatCount(stream.viewer_count || 0);

  if (shareNode) {
    const slug = safeText(stream.slug);
    const siteOrigin = window.location.origin;
    shareNode.value = slug ? `${siteOrigin}/watch.html?slug=${encodeURIComponent(slug)}` : "";
  }

  if (endBtn) endBtn.disabled = !stream.is_live;
  if (startBtn) startBtn.disabled = !!stream.is_live;
}

export function renderStudioPresence(viewers = 0) {
  const viewersNode = el("studio-current-viewers");
  if (viewersNode) {
    viewersNode.textContent = formatCount(viewers);
  }
}

export function renderWatchStream(stream) {
  const titleNode = el("watch-stream-title");
  const descNode = el("watch-stream-description");
  const creatorNode = el("watch-stream-creator");
  const accessNode = el("watch-stream-access");
  const statusNode = el("watch-stream-status");
  const viewersNode = el("watch-stream-viewers");
  const joinBtn = el("watch-join-btn");
  const purchaseBtn = el("watch-purchase-btn");

  if (!stream) {
    if (titleNode) titleNode.textContent = "Stream not found";
    if (descNode) descNode.textContent = "Check the link or start a stream from the live studio.";
    if (creatorNode) creatorNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (statusNode) statusNode.textContent = "OFFLINE";
    if (viewersNode) viewersNode.textContent = "0";
    if (joinBtn) joinBtn.disabled = true;
    if (purchaseBtn) purchaseBtn.style.display = "none";
    return;
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Untitled stream");
  if (descNode) descNode.textContent = safeText(stream.description, "No description yet.");
  if (creatorNode) creatorNode.textContent = safeText(stream.creator_name || stream.display_name || stream.creator_id || "--");
  if (accessNode) accessNode.textContent = formatAccessLabel(stream);
  if (statusNode) statusNode.textContent = stream.is_live ? "LIVE" : "OFFLINE";
  if (viewersNode) viewersNode.textContent = formatCount(stream.viewer_count || 0);

  if (joinBtn) {
    joinBtn.disabled = !stream.is_live;
    joinBtn.textContent = stream.is_live ? "Join Live" : "Offline";
  }

  if (purchaseBtn) {
    purchaseBtn.style.display = stream.access_type === "paid" ? "inline-flex" : "none";
  }
}

export function renderWatchPresence(viewers = 0) {
  const viewersNode = el("watch-stream-viewers");
  if (viewersNode) {
    viewersNode.textContent = formatCount(viewers);
  }
}

export function renderChatMessages(messages = []) {
  const chatFeed = el("live-chat-feed");
  if (!chatFeed) return;

  if (!Array.isArray(messages) || messages.length === 0) {
    chatFeed.innerHTML = `
      <div class="chat-message system">
        <strong>System</strong>
        <span>Live chat will show here when messages start coming in.</span>
      </div>
    `;
    return;
  }

  chatFeed.innerHTML = messages
    .map((message) => {
      const name = safeText(
        message?.display_name ||
        message?.username ||
        message?.user_name ||
        message?.user_id ||
        "User"
      );

      const body = safeText(message?.message, "");
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
        <strong>No one is live right now.</strong>
        <span>When a creator starts streaming, the live rail will appear here.</span>
      </div>
    `;
    return;
  }

  rail.innerHTML = streams
    .map((stream) => {
      const slug = safeText(stream.slug);
      const title = escapeHtml(safeText(stream.title, "Live Stream"));
      const thumb = safeText(stream.thumbnail_url, "");
      const category = escapeHtml(safeText(stream.category, "general"));
      const viewers = formatCount(stream.viewer_count || 0);
      const access = escapeHtml(formatAccessLabel(stream));

      return `
        <article class="rb-live-card">
          <a class="rb-live-card__media" href="/watch.html?slug=${encodeURIComponent(slug)}">
            ${
              thumb
                ? `<img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy" />`
                : `<div class="rb-live-card__fallback">LIVE NOW</div>`
            }
            <div class="rb-live-card__overlay">
              <span class="rb-live-badge rb-live-badge--live">LIVE</span>
              <span class="rb-live-badge">${access}</span>
            </div>
          </a>
          <div class="rb-live-card__body">
            <div class="rb-live-card__meta">
              <span>${category}</span>
              <span>${viewers} viewers</span>
            </div>
            <h3 class="rb-live-card__title">
              <a href="/watch.html?slug=${encodeURIComponent(slug)}">${title}</a>
            </h3>
            <div class="rb-live-card__actions">
              <a class="rb-live-watch-btn" href="/watch.html?slug=${encodeURIComponent(slug)}">Join Live</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

export function setButtonBusy(buttonId, busy, busyText, idleText) {
  const button = el(buttonId);
  if (!button) return;

  button.disabled = !!busy;
  button.textContent = busy ? busyText : idleText;
}

export function fillStudioForm(stream) {
  if (!stream) return;

  const title = el("stream-title");
  const description = el("stream-description");
  const category = el("stream-category");
  const accessType = el("stream-access-type");
  const priceCents = el("stream-price-cents");
  const thumbnailUrl = el("stream-thumbnail-url");

  if (title && stream.title !== undefined) title.value = safeText(stream.title);
  if (description && stream.description !== undefined) description.value = safeText(stream.description);
  if (category && stream.category !== undefined) category.value = safeText(stream.category);
  if (accessType && stream.access_type !== undefined) accessType.value = safeText(stream.access_type);
  if (priceCents && stream.price_cents !== undefined) priceCents.value = Number(stream.price_cents || 0);
  if (thumbnailUrl && stream.thumbnail_url !== undefined) thumbnailUrl.value = safeText(stream.thumbnail_url);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
