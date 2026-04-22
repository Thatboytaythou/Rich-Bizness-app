// core/ui.js

import { formatMoney, formatNumber, BRAND_IMAGES } from '/core/config.js';

const TOAST_CONTAINER_ID = 'rb-toast-container';
const MODAL_ROOT_ID = 'rb-modal-root';

function ensureBaseStyles() {
  if (document.getElementById('rb-ui-styles')) return;

  const style = document.createElement('style');
  style.id = 'rb-ui-styles';
  style.textContent = `
    #${TOAST_CONTAINER_ID} {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 9999;
      display: grid;
      gap: 10px;
      width: min(360px, calc(100vw - 24px));
    }

    .rb-toast {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(110,255,176,0.18);
      background: rgba(8, 18, 13, 0.92);
      color: #ecfff4;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.36);
      backdrop-filter: blur(12px);
      line-height: 1.5;
      animation: rbToastIn .18s ease;
    }

    .rb-toast--success {
      border-color: rgba(67,245,155,0.26);
      background: rgba(14, 44, 28, 0.94);
    }

    .rb-toast--error {
      border-color: rgba(255,109,122,0.28);
      background: rgba(50, 16, 20, 0.94);
    }

    .rb-toast--info {
      border-color: rgba(117,214,255,0.28);
      background: rgba(12, 24, 34, 0.94);
    }

    .rb-toast strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .rb-toast span {
      display: block;
      color: #d7f7e5;
      font-size: 13px;
    }

    @keyframes rbToastIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    #${MODAL_ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: none;
    }

    #${MODAL_ROOT_ID}.is-open {
      display: block;
    }

    .rb-modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.62);
      backdrop-filter: blur(6px);
    }

    .rb-modal-shell {
      position: relative;
      width: min(760px, calc(100vw - 20px));
      max-height: calc(100vh - 40px);
      margin: 20px auto;
      overflow: auto;
      border-radius: 24px;
      border: 1px solid rgba(110,255,176,0.18);
      background: linear-gradient(180deg, rgba(10,22,16,0.96), rgba(7,15,12,0.98));
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.42);
    }

    .rb-modal-head {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(110,255,176,0.12);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .rb-modal-head h3 {
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.03em;
      color: #ecfff4;
    }

    .rb-modal-head p {
      margin: 8px 0 0;
      color: #97b8a6;
      font-size: 13px;
      line-height: 1.65;
    }

    .rb-modal-close {
      min-height: 42px;
      min-width: 42px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: #ecfff4;
      font-weight: 900;
      cursor: pointer;
    }

    .rb-modal-body {
      padding: 20px;
      color: #ecfff4;
    }

    .rb-empty {
      min-height: 180px;
      border-radius: 18px;
      border: 1px dashed rgba(110,255,176,0.20);
      background: rgba(255,255,255,0.03);
      display: grid;
      place-items: center;
      text-align: center;
      padding: 20px;
      color: #97b8a6;
    }

    .rb-empty strong {
      display: block;
      color: #ecfff4;
      margin-bottom: 8px;
      font-size: 18px;
    }

    .rb-skeleton {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      background: rgba(255,255,255,0.05);
      min-height: 100px;
      border: 1px solid rgba(110,255,176,0.12);
    }

    .rb-skeleton::after {
      content: "";
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,0.08),
        transparent
      );
      animation: rbShimmer 1.2s infinite;
    }

    @keyframes rbShimmer {
      100% {
        transform: translateX(100%);
      }
    }

    .rb-media-fallback {
      width: 100%;
      min-height: 220px;
      border-radius: 20px;
      border: 1px solid rgba(110,255,176,0.12);
      background:
        linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.68)),
        url('${BRAND_IMAGES.homeHero}') center / cover no-repeat;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 22px;
      color: #d7f7e5;
    }

    .rb-stat-pill {
      min-height: 32px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(110,255,176,0.16);
      background: rgba(255,255,255,0.04);
      color: #ecfff4;
      font-size: 12px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  `;
  document.head.appendChild(style);
}

function ensureToastContainer() {
  ensureBaseStyles();

  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    document.body.appendChild(container);
  }
  return container;
}

function ensureModalRoot() {
  ensureBaseStyles();

  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

export function showToast({
  title = 'Rich Bizness',
  message = '',
  type = 'info',
  duration = 3200
} = {}) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `rb-toast rb-toast--${type}`;
  toast.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'opacity .18s ease, transform .18s ease';
    window.setTimeout(() => toast.remove(), 180);
  }, duration);

  return toast;
}

export function openModal({
  title = 'Rich Bizness',
  description = '',
  content = '',
  onClose = null
} = {}) {
  const root = ensureModalRoot();

  root.innerHTML = `
    <div class="rb-modal-overlay" data-rb-modal-close="true"></div>
    <section class="rb-modal-shell" role="dialog" aria-modal="true">
      <div class="rb-modal-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        <button class="rb-modal-close" type="button" data-rb-modal-close="true">✕</button>
      </div>
      <div class="rb-modal-body">${content}</div>
    </section>
  `;

  root.classList.add('is-open');

  const close = () => {
    root.classList.remove('is-open');
    root.innerHTML = '';
    if (typeof onClose === 'function') onClose();
  };

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target?.dataset?.rbModalClose === 'true') {
        close();
      }
    },
    { once: true }
  );

  return { close, root };
}

export function closeModal() {
  const root = document.getElementById(MODAL_ROOT_ID);
  if (!root) return;
  root.classList.remove('is-open');
  root.innerHTML = '';
}

export function renderEmptyState({
  title = 'Nothing here yet.',
  message = 'Content will show up here when it becomes available.'
} = {}) {
  return `
    <div class="rb-empty">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

export function renderSkeleton({
  height = 100
} = {}) {
  return `<div class="rb-skeleton" style="min-height:${Number(height || 100)}px;"></div>`;
}

export function renderMediaFallback({
  title = 'Media not available.',
  message = 'Try again later or upload new content.'
} = {}) {
  return `
    <div class="rb-media-fallback">
      <div>
        <strong style="display:block;font-size:20px;margin-bottom:8px;">${escapeHtml(title)}</strong>
        <span style="color:#d7f7e5;font-size:14px;line-height:1.65;">${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

export function renderStatPill(label, value) {
  return `
    <span class="rb-stat-pill">
      <strong style="font-size:12px;">${escapeHtml(label)}</strong>
      <span>${escapeHtml(String(value))}</span>
    </span>
  `;
}

export function setText(selectorOrElement, value = '') {
  const el =
    typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

  if (!el) return null;
  el.textContent = value;
  return el;
}

export function setHTML(selectorOrElement, html = '') {
  const el =
    typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

  if (!el) return null;
  el.innerHTML = html;
  return el;
}

export function setImage(selectorOrElement, src, fallback = BRAND_IMAGES.logo) {
  const el =
    typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

  if (!el) return null;
  el.src = src || fallback;
  return el;
}

export function formatMoneySafe(cents = 0, currency = 'USD') {
  return formatMoney(cents, currency);
}

export function formatNumberSafe(value = 0) {
  return formatNumber(value);
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function safeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export function safeShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

export function isVideoUrl(url = '') {
  return /\.(mp4|webm|mov|m4v)$/i.test(String(url || ''));
}

export function isImageUrl(url = '') {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(String(url || ''));
}

export function getDisplayImage(record = {}, fallbacks = []) {
  const options = [
    record.profile_image_url,
    record.avatar_url,
    record.banner_url,
    record.thumbnail_url,
    record.cover_url,
    record.image_url,
    record.media_url,
    ...fallbacks,
    BRAND_IMAGES.logo
  ].filter(Boolean);

  return options[0];
}

export function createPostCardHTML(post = {}) {
  const media = post.media_url
    ? `
      <div class="post-card-media" style="width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:rgba(255,255,255,0.04);border:1px solid rgba(110,255,176,0.16);">
        ${
          isVideoUrl(post.media_url)
            ? `<video src="${post.media_url}" controls playsinline style="width:100%;height:100%;object-fit:cover;background:#0a130e;"></video>`
            : `<img src="${post.thumbnail_url || post.media_url}" alt="${escapeHtml(post.title || 'Post media')}" style="width:100%;height:100%;object-fit:cover;background:#0a130e;" />`
        }
      </div>
    `
    : '';

  return `
    <article style="padding:16px;border-radius:18px;border:1px solid rgba(110,255,176,0.16);background:rgba(255,255,255,0.04);display:grid;gap:12px;">
      ${media}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${renderStatPill('Type', post.type || 'post')}
        ${post.is_featured ? renderStatPill('Featured', 'Yes') : ''}
        ${post.is_pinned ? renderStatPill('Pinned', 'Yes') : ''}
      </div>
      <div>
        <h4 style="margin:0;font-size:20px;line-height:1.05;">${escapeHtml(post.title || 'Untitled post')}</h4>
        <p style="margin:8px 0 0;color:#97b8a6;font-size:14px;line-height:1.7;">${escapeHtml(post.description || '')}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;color:#97b8a6;font-size:12px;">
        <span>Likes: ${formatNumberSafe(post.like_count || 0)}</span>
        <span>Comments: ${formatNumberSafe(post.comment_count || 0)}</span>
        <span>Reposts: ${formatNumberSafe(post.repost_count || 0)}</span>
        <span>${escapeHtml(safeDate(post.created_at))}</span>
      </div>
    </article>
  `;
}
