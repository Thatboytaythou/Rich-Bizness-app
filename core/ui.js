// =========================
// RICH BIZNESS UI CORE — FINAL REPAIR
// /core/ui.js
// Shared UI helpers: toast, modal, cards, media, empty states, formatting
// =========================

import {
  formatMoney,
  formatNumber,
  safeDate,
  clampText,
  BRAND_IMAGES
} from "/core/config.js";

const TOAST_CONTAINER_ID = "rb-toast-container";
const MODAL_ROOT_ID = "rb-modal-root";

function ensureBaseStyles() {
  if (document.getElementById("rb-ui-styles")) return;

  const style = document.createElement("style");
  style.id = "rb-ui-styles";
  style.textContent = `
    #${TOAST_CONTAINER_ID} {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 9999;
      display: grid;
      gap: 10px;
      width: min(380px, calc(100vw - 24px));
    }

    .rb-toast {
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid rgba(255,206,88,0.2);
      background: rgba(8, 10, 14, 0.94);
      color: #fffaf0;
      box-shadow: 0 24px 70px rgba(0,0,0,0.42);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: rbToastIn .2s ease;
    }

    .rb-toast--success {
      border-color: rgba(105,255,180,0.32);
      background: rgba(8, 38, 24, 0.94);
    }

    .rb-toast--error {
      border-color: rgba(255,95,109,0.34);
      background: rgba(54, 12, 18, 0.94);
    }

    .rb-toast--warning {
      border-color: rgba(255,206,88,0.36);
      background: rgba(54, 39, 10, 0.94);
    }

    .rb-toast--info {
      border-color: rgba(56,189,248,0.34);
      background: rgba(10, 24, 42, 0.94);
    }

    .rb-toast strong {
      display:block;
      margin-bottom:4px;
      font-size:14px;
    }

    .rb-toast span {
      display:block;
      color:rgba(255,250,240,0.74);
      font-size:13px;
      line-height:1.45;
    }

    @keyframes rbToastIn {
      from { opacity:0; transform: translateY(-8px) scale(.98); }
      to { opacity:1; transform: translateY(0) scale(1); }
    }

    #${MODAL_ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: none;
    }

    #${MODAL_ROOT_ID}.is-open {
      display: grid;
      place-items: center;
      padding: 18px;
    }

    .rb-modal-overlay {
      position:absolute;
      inset:0;
      background:rgba(0,0,0,0.72);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }

    .rb-modal-shell {
      position:relative;
      width:min(760px, 100%);
      max-height:calc(100vh - 36px);
      overflow:auto;
      border-radius:26px;
      border:1px solid rgba(255,206,88,0.22);
      background:linear-gradient(180deg, rgba(10,12,16,0.98), rgba(5,6,8,0.98));
      box-shadow:0 28px 90px rgba(0,0,0,0.58);
    }

    .rb-modal-head {
      padding:18px 20px;
      border-bottom:1px solid rgba(255,255,255,0.08);
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }

    .rb-modal-head h3 {
      margin:0;
      color:#fffaf0;
      font-size:24px;
      letter-spacing:-0.04em;
    }

    .rb-modal-head p {
      margin:8px 0 0;
      color:rgba(255,250,240,0.68);
      font-size:13px;
      line-height:1.6;
    }

    .rb-modal-close {
      min-width:42px;
      min-height:42px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.05);
      color:#fff;
      font-weight:900;
      cursor:pointer;
    }

    .rb-modal-body {
      padding:20px;
      color:#fffaf0;
    }

    .rb-empty,
    .rb-status-box {
      min-height:140px;
      border-radius:20px;
      border:1px dashed rgba(255,206,88,0.22);
      background:rgba(255,255,255,0.04);
      display:grid;
      place-items:center;
      text-align:center;
      padding:20px;
      color:rgba(255,250,240,0.68);
    }

    .rb-empty strong,
    .rb-status-box strong {
      display:block;
      color:#fffaf0;
      margin-bottom:8px;
      font-size:18px;
    }

    .rb-skeleton {
      position:relative;
      overflow:hidden;
      border-radius:20px;
      background:rgba(255,255,255,0.05);
      min-height:100px;
      border:1px solid rgba(255,255,255,0.08);
    }

    .rb-skeleton::after {
      content:"";
      position:absolute;
      inset:0;
      transform:translateX(-100%);
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      animation:rbShimmer 1.25s infinite;
    }

    @keyframes rbShimmer {
      100% { transform:translateX(100%); }
    }

    .rb-media-fallback {
      width:100%;
      min-height:220px;
      border-radius:20px;
      border:1px solid rgba(255,206,88,0.16);
      background:
        linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.72)),
        url('${BRAND_IMAGES.fallback || BRAND_IMAGES.homeHero}') center/cover no-repeat;
      display:grid;
      place-items:center;
      text-align:center;
      padding:22px;
      color:#fffaf0;
    }

    .rb-stat-pill {
      min-height:32px;
      padding:6px 10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.09);
      background:rgba(255,255,255,0.05);
      color:#fffaf0;
      font-size:12px;
      font-weight:850;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
    }

    .rb-mini-card {
      padding:13px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,0.08);
      background:rgba(0,0,0,0.38);
      display:grid;
      gap:8px;
    }

    @media (max-width: 780px) {
      #${TOAST_CONTAINER_ID} {
        top:12px;
        right:12px;
        left:12px;
        width:auto;
      }

      .rb-modal-body,
      .rb-modal-head {
        padding:14px;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureToastContainer() {
  ensureBaseStyles();

  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = TOAST_CONTAINER_ID;
    document.body.appendChild(container);
  }

  return container;
}

function ensureModalRoot() {
  ensureBaseStyles();

  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }

  return root;
}

/* =========================
   TOASTS / MODALS
========================= */

export function showToast({
  title = "Rich Bizness",
  message = "",
  type = "info",
  duration = 3200
} = {}) {
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `rb-toast rb-toast--${type}`;
  toast.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px) scale(.98)";
    toast.style.transition = "opacity .18s ease, transform .18s ease";
    window.setTimeout(() => toast.remove(), 190);
  }, duration);

  return toast;
}

export function openModal({
  title = "Rich Bizness",
  description = "",
  content = "",
  onClose = null
} = {}) {
  const root = ensureModalRoot();

  root.innerHTML = `
    <div class="rb-modal-overlay" data-rb-modal-close="true"></div>
    <section class="rb-modal-shell" role="dialog" aria-modal="true">
      <div class="rb-modal-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        <button class="rb-modal-close" type="button" data-rb-modal-close="true">✕</button>
      </div>
      <div class="rb-modal-body">${content}</div>
    </section>
  `;

  root.classList.add("is-open");

  const close = () => {
    root.classList.remove("is-open");
    root.innerHTML = "";
    if (typeof onClose === "function") onClose();
  };

  root.onclick = (event) => {
    if (event.target?.dataset?.rbModalClose === "true") close();
  };

  document.addEventListener("keydown", function escHandler(event) {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  });

  return { close, root };
}

export function closeModal() {
  const root = document.getElementById(MODAL_ROOT_ID);
  if (!root) return;
  root.classList.remove("is-open");
  root.innerHTML = "";
}

/* =========================
   STATES
========================= */

export function renderEmptyState({
  title = "Nothing here yet.",
  message = "Content will show up here when it becomes available.",
  icon = "✨"
} = {}) {
  return `
    <div class="rb-empty">
      <div>
        <strong>${escapeHtml(icon)} ${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

export function renderStatusBox({
  title = "Loading...",
  message = "",
  icon = "⚡"
} = {}) {
  return `
    <div class="rb-status-box">
      <div>
        <strong>${escapeHtml(icon)} ${escapeHtml(title)}</strong>
        ${message ? `<span>${escapeHtml(message)}</span>` : ""}
      </div>
    </div>
  `;
}

export function renderSkeleton({ height = 100 } = {}) {
  return `<div class="rb-skeleton" style="min-height:${Number(height || 100)}px;"></div>`;
}

export function renderSkeletonList(count = 3, height = 100) {
  return Array.from({ length: count })
    .map(() => renderSkeleton({ height }))
    .join("");
}

export function renderMediaFallback({
  title = "Media not available.",
  message = "Try again later or upload new content."
} = {}) {
  return `
    <div class="rb-media-fallback">
      <div>
        <strong style="display:block;font-size:20px;margin-bottom:8px;">${escapeHtml(title)}</strong>
        <span style="color:rgba(255,250,240,0.75);font-size:14px;line-height:1.65;">${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

/* =========================
   DOM HELPERS
========================= */

export function setText(selectorOrElement, value = "") {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.textContent = value;
  return el;
}

export function setHTML(selectorOrElement, html = "") {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.innerHTML = html;
  return el;
}

export function setImage(selectorOrElement, src, fallback = BRAND_IMAGES.logo) {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;

  el.src = src || fallback;
  el.onerror = () => {
    el.onerror = null;
    el.src = fallback;
  };

  return el;
}

export function resolveEl(selectorOrElement) {
  return typeof selectorOrElement === "string"
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;
}

/* =========================
   FORMATTERS
========================= */

export function formatMoneySafe(cents = 0, currency = "USD") {
  return formatMoney(cents, currency);
}

export function formatNumberSafe(value = 0) {
  return formatNumber(value);
}

export function safeDateTime(value) {
  return safeDate(value);
}

export function safeShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

/* =========================
   SAFE HTML / URL HELPERS
========================= */

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeUrl(value = "", fallback = "#") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (url.startsWith("javascript:")) return fallback;
  return url;
}

export function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)$/i.test(String(url || "").split("?")[0]);
}

export function isAudioUrl(url = "") {
  return /\.(mp3|wav|m4a|ogg|aac)$/i.test(String(url || "").split("?")[0]);
}

export function isImageUrl(url = "") {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(String(url || "").split("?")[0]);
}

/* =========================
   MEDIA HELPERS
========================= */

export function getDisplayImage(record = {}, fallbacks = []) {
  const options = [
    record.profile_image_url,
    record.avatar_url,
    record.banner_url,
    record.thumbnail_url,
    record.cover_url,
    record.cover_image_url,
    record.image_url,
    record.media_url,
    record.file_url,
    ...fallbacks,
    BRAND_IMAGES.logo,
    BRAND_IMAGES.fallback
  ].filter(Boolean);

  return options[0];
}

export function renderMedia({
  src = "",
  poster = "",
  alt = "Rich Bizness media",
  className = "rb-rendered-media"
} = {}) {
  const safeSrc = safeUrl(src, "");

  if (!safeSrc) {
    return renderMediaFallback();
  }

  if (isVideoUrl(safeSrc)) {
    return `
      <video class="${escapeHtml(className)}" src="${escapeHtml(safeSrc)}" poster="${escapeHtml(poster || "")}" controls playsinline preload="metadata"></video>
    `;
  }

  if (isAudioUrl(safeSrc)) {
    return `
      <audio class="${escapeHtml(className)}" src="${escapeHtml(safeSrc)}" controls preload="metadata"></audio>
    `;
  }

  return `
    <img class="${escapeHtml(className)}" src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" />
  `;
}

/* =========================
   PILLS / CARDS
========================= */

export function renderStatPill(label, value) {
  return `
    <span class="rb-stat-pill">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(String(value))}</span>
    </span>
  `;
}

export function renderMiniCard({
  title = "Untitled",
  subtitle = "",
  meta = "",
  href = "",
  tag = ""
} = {}) {
  const inner = `
    ${tag ? `<span class="rb-stat-pill">${escapeHtml(tag)}</span>` : ""}
    <strong>${escapeHtml(title)}</strong>
    ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
    ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
  `;

  if (href) {
    return `<a class="rb-mini-card" href="${escapeHtml(href)}">${inner}</a>`;
  }

  return `<article class="rb-mini-card">${inner}</article>`;
}

export function createPostCardHTML(post = {}) {
  const mediaUrl = post.media_url || post.file_url || post.video_url || post.image_url || "";
  const media = mediaUrl
    ? `
      <div class="post-card-media" style="width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:rgba(255,255,255,0.04);border:1px solid rgba(255,206,88,0.14);">
        ${renderMedia({
          src: mediaUrl,
          poster: post.thumbnail_url || post.cover_url || "",
          alt: post.title || "Post media",
          className: "post-media"
        })}
      </div>
    `
    : "";

  return `
    <article class="rb-mini-card" style="padding:16px;border-radius:20px;display:grid;gap:12px;">
      ${media}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${renderStatPill("Type", post.type || post.category || "post")}
        ${post.is_featured ? renderStatPill("Featured", "Yes") : ""}
        ${post.is_pinned ? renderStatPill("Pinned", "Yes") : ""}
      </div>
      <div>
        <h4 style="margin:0;font-size:20px;line-height:1.05;">${escapeHtml(post.title || post.caption || "Untitled post")}</h4>
        <p style="margin:8px 0 0;color:rgba(255,250,240,0.68);font-size:14px;line-height:1.7;">
          ${escapeHtml(clampText(post.description || post.body || post.caption || "", 160))}
        </p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;color:rgba(255,250,240,0.62);font-size:12px;">
        <span>Likes: ${formatNumberSafe(post.like_count || post.likes || 0)}</span>
        <span>Comments: ${formatNumberSafe(post.comment_count || 0)}</span>
        <span>Reposts: ${formatNumberSafe(post.repost_count || post.reposts || 0)}</span>
        <span>${escapeHtml(safeDateTime(post.created_at))}</span>
      </div>
    </article>
  `;
}

export function createProductCardHTML(product = {}) {
  const title = product.title || product.name || "Creator Product";
  const image = product.image_url || product.thumbnail_url || BRAND_IMAGES.fallback;

  return `
    <article class="rb-mini-card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:100%;height:180px;object-fit:cover;border-radius:16px;" />
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(clampText(product.description || "", 120))}</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${renderStatPill("Price", formatMoneySafe(product.price_cents || 0))}
        ${renderStatPill("Status", product.is_active === false ? "Hidden" : "Active")}
      </div>
    </article>
  `;
}

export function createTrackCardHTML(track = {}) {
  const title = track.title || "Untitled Track";
  const image = track.cover_url || track.thumbnail_url || BRAND_IMAGES.music || BRAND_IMAGES.logo;

  return `
    <article class="rb-mini-card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:100%;height:180px;object-fit:cover;border-radius:16px;" />
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(track.artist_name || "Rich Bizness Artist")}</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${renderStatPill("Plays", formatNumberSafe(track.play_count || track.plays || 0))}
        ${renderStatPill("Genre", track.genre || "Music")}
      </div>
    </article>
  `;
}

export function createLiveCardHTML(stream = {}) {
  const title = stream.title || "Untitled Live";
  const image = stream.thumbnail_url || stream.cover_url || BRAND_IMAGES.live || BRAND_IMAGES.fallback;
  const slug = stream.slug ? `/watch.html?slug=${encodeURIComponent(stream.slug)}` : "/watch.html";

  return `
    <article class="rb-mini-card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:100%;height:180px;object-fit:cover;border-radius:16px;" />
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(stream.description || "Rich Bizness live room")}</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${renderStatPill("Status", stream.status || "draft")}
        ${renderStatPill("Viewers", formatNumberSafe(stream.viewer_count || 0))}
        ${renderStatPill("Access", stream.access_type || "free")}
      </div>
      <a class="btn btn-gold" href="${escapeHtml(slug)}">Watch</a>
    </article>
  `;
}
