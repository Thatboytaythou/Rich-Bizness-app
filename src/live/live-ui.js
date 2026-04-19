function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCount(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatHandle(value = "") {
  const clean = String(value || "").replace(/^@+/, "").trim();
  return clean ? `@${clean}` : "@creator";
}

function buildWatchUrl(slug) {
  if (!slug) return "";
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(slug)}`;
}

function normalizeAccessType(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  if (["free", "paid", "vip", "followers"].includes(clean)) return clean;
  return "free";
}

function formatAccessLabel(stream) {
  const accessType = normalizeAccessType(stream?.access_type);
  const priceCents = Number(stream?.price_cents || 0);

  if (accessType === "paid") {
    return priceCents > 0 ? `PAID • $${(priceCents / 100).toFixed(2)}` : "PAID";
  }

  if (accessType === "vip") return "VIP";
  if (accessType === "followers") return "FOLLOWERS";
  return "FREE";
}

function formatStatusLabel(stream) {
  if (!stream) return "OFFLINE";
  return stream.is_live ? "LIVE" : "OFFLINE";
}

function getCreatorName(stream) {
  return (
    stream?.creator_display_name ||
    stream?.creator_name ||
    stream?.display_name ||
    stream?.username ||
    stream?.creator_id ||
    "Creator"
  );
}

function getCreatorAvatar(stream) {
  return (
    stream?.creator_avatar_url ||
    stream?.avatar_url ||
    stream?.profile_image_url ||
    ""
  );
}

function getCreatorInitials(stream) {
  const name = getCreatorName(stream);
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "RB";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function formatChatMessageName(message) {
  return (
    message?.display_name ||
    message?.username ||
    message?.name ||
    message?.user_name ||
    message?.user_id ||
    "User"
  );
}

function formatChatMessageTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
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
  button.style.opacity = busy ? "0.78" : "1";
  button.style.cursor = busy ? "wait" : "pointer";
}

export function renderStudioSession(user) {
  const node = el("studio-session-status");
  if (!node) return;

  if (!user) {
    node.textContent = "No active session";
    return;
  }

  const label =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email ||
    user?.id;

  node.textContent = `Signed in as ${label}`;
}

export function renderStudioStream(stream) {
  const statusNode = el("studio-stream-status");
  const titleNode = el("studio-current-title");
  const slugNode = el("studio-current-slug");
  const accessNode = el("studio-current-access");
  const viewersNode = el("studio-current-viewers");
  const shareInput = el("studio-share-link");

  if (statusNode) statusNode.textContent = formatStatusLabel(stream);

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
  if (accessNode) accessNode.textContent = formatAccessLabel(stream);
  if (viewersNode) viewersNode.textContent = formatCount(stream.viewer_count || 0);
  if (shareInput) shareInput.value = buildWatchUrl(stream.slug);
}

export function renderStudioPresence(viewers = 0) {
  const viewersNode = el("studio-current-viewers");
  if (!viewersNode) return;
  viewersNode.textContent = formatCount(viewers);
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
  if (accessType) accessType.value = normalizeAccessType(stream.access_type);
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
      const title = escapeHtml(safeText(stream.title, "Live Stream"));
      const slug = safeText(stream.slug, "");
      const access = escapeHtml(formatAccessLabel(stream));
      const viewers = formatCount(stream.viewer_count || 0);
      const watchUrl = buildWatchUrl(slug);
      const creatorName = escapeHtml(getCreatorName(stream));
      const creatorAvatar = getCreatorAvatar(stream);
      const creatorInitials = escapeHtml(getCreatorInitials(stream));

      return `
        <article class="rb-live-card">
          <a class="rb-live-card__media" href="${watchUrl}">
            ${
              thumb
                ? `<img src="${escapeHtml(thumb)}" alt="${title}" />`
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
              <span>${escapeHtml(safeText(stream.category, "general"))}</span>
              <span>${escapeHtml(formatStatusLabel(stream))}</span>
            </div>

            <h3 class="rb-live-card__title">${title}</h3>

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
              <div style="width:34px;height:34px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);display:grid;place-items:center;font-size:12px;font-weight:900;color:#43f59b;flex-shrink:0;">
                ${
                  creatorAvatar
                    ? `<img src="${escapeHtml(creatorAvatar)}" alt="${creatorName}" style="width:100%;height:100%;object-fit:cover;" />`
                    : creatorInitials
                }
              </div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:800;line-height:1.2;">${creatorName}</div>
                <div style="font-size:12px;color:#97b8a6;line-height:1.2;">${escapeHtml(slug || "live-room")}</div>
              </div>
            </div>

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
  const purchaseButton = el("watch-purchase-btn");

  if (!stream) {
    if (titleNode) titleNode.textContent = "Stream unavailable";
    if (descriptionNode) {
      descriptionNode.textContent = "This live stream could not be loaded.";
    }
    if (statusNode) statusNode.textContent = "OFFLINE";
    if (creatorNode) creatorNode.textContent = "--";
    if (accessNode) accessNode.textContent = "--";
    if (viewersNode) viewersNode.textContent = "0";
    if (joinButton) {
      joinButton.textContent = "Join Live";
      joinButton.disabled = true;
    }
    if (purchaseButton) {
      purchaseButton.style.display = "none";
    }
    return;
  }

  if (titleNode) titleNode.textContent = safeText(stream.title, "Live Stream");
  if (descriptionNode) {
    descriptionNode.textContent = safeText(
      stream.description,
      "Join the room and watch live on Rich Bizness."
    );
  }
  if (statusNode) statusNode.textContent = formatStatusLabel(stream);
  if (creatorNode) creatorNode.textContent = getCreatorName(stream);
  if (accessNode) accessNode.textContent = formatAccessLabel(stream);
  if (viewersNode) viewersNode.textContent = formatCount(stream.viewer_count || 0);

  if (joinButton) {
    joinButton.textContent = stream.is_live ? "Join Live" : "Offline";
    joinButton.disabled = !stream.is_live;
    joinButton.style.opacity = stream.is_live ? "1" : "0.65";
    joinButton.style.cursor = stream.is_live ? "pointer" : "not-allowed";
  }

  if (purchaseButton) {
    purchaseButton.style.display =
      normalizeAccessType(stream.access_type) === "paid" ? "inline-flex" : "none";
  }

  renderWatchCreatorCard(stream);
}

export function renderWatchCreatorCard(stream) {
  const existing = el("watch-creator-card");
  const stagePanel = document.querySelector(".stream-meta-card");
  if (!stagePanel) return;

  if (!stream) {
    if (existing) existing.remove();
    return;
  }

  const creatorName = escapeHtml(getCreatorName(stream));
  const creatorAvatar = getCreatorAvatar(stream);
  const initials = escapeHtml(getCreatorInitials(stream));
  const handle =
    stream?.creator_username
      ? formatHandle(stream.creator_username)
      : "";
  const handleMarkup = handle
    ? `<div style="margin-top:6px;color:#97b8a6;font-size:12px;">${escapeHtml(handle)}</div>`
    : "";

  const cardHtml = `
    <div id="watch-creator-card" class="meta-row">
      <strong>Creator</strong>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:52px;height:52px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);display:grid;place-items:center;font-size:16px;font-weight:900;color:#43f59b;flex-shrink:0;">
          ${
            creatorAvatar
              ? `<img src="${escapeHtml(creatorAvatar)}" alt="${creatorName}" style="width:100%;height:100%;object-fit:cover;" />`
              : initials
          }
        </div>
        <div style="min-width:0;">
          <div style="font-size:14px;font-weight:800;line-height:1.2;color:#ecfff4;">${creatorName}</div>
          ${handleMarkup}
        </div>
      </div>
    </div>
  `;

  if (existing) {
    existing.outerHTML = cardHtml;
  } else {
    stagePanel.insertAdjacentHTML("beforeend", cardHtml);
  }
}

export function renderWatchPresence(viewers = 0) {
  const viewersNode = el("watch-stream-viewers");
  if (!viewersNode) return;
  viewersNode.textContent = formatCount(viewers);
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
      const name = escapeHtml(formatChatMessageName(message));
      const body = escapeHtml(message?.message || "");
      const time = formatChatMessageTime(message?.created_at);

      return `
        <div class="chat-message">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <strong>${name}</strong>
            ${time ? `<span style="color:#97b8a6;font-size:11px;">${escapeHtml(time)}</span>` : ""}
          </div>
          <span>${body}</span>
        </div>
      `;
    })
    .join("");

  feed.scrollTop = feed.scrollHeight;
}
