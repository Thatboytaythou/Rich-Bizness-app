// =========================
// RICH BIZNESS UTILS — FINAL REPAIR
// /core/utils.js
// Shared helpers for strings, money, dates, URLs, DOM, media, links, arrays
// =========================

import {
  BRAND_IMAGES,
  ROUTES,
  SUPABASE_PROJECT_URL,
  DEFAULT_CURRENCY
} from "/core/config.js";

/* =========================
   SAFE STRINGS
========================= */

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function clampText(value = "", length = 120) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}

export function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getInitials(value = "") {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "RB";
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

/* =========================
   NUMBERS / MONEY
========================= */

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function toNumber(value = 0, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatNumber(value = 0) {
  return toNumber(value).toLocaleString();
}

export function formatMoney(cents = 0, currency = DEFAULT_CURRENCY || "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase()
  }).format(toNumber(cents) / 100);
}

export function dollarsToCents(value = 0) {
  return Math.round(toNumber(value) * 100);
}

export function centsToDollars(value = 0) {
  return toNumber(value) / 100;
}

export function formatPercent(value = 0, digits = 0) {
  return `${toNumber(value).toFixed(digits)}%`;
}

/* =========================
   DATES
========================= */

export function safeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function safeShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function safeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function nowIso() {
  return new Date().toISOString();
}

/* =========================
   JSON
========================= */

export function safeJsonParse(value, fallback = {}) {
  try {
    if (value == null || value === "") return fallback;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value, fallback = "{}") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/* =========================
   URL / QUERY
========================= */

export function maybeExternalUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function safeUrl(value = "", fallback = "#") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (/^javascript:/i.test(url)) return fallback;
  return url;
}

export function getQueryParam(name, fallback = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? fallback;
}

export function setQueryParams(next = {}) {
  const params = new URLSearchParams(window.location.search);

  Object.entries(next).forEach(([key, value]) => {
    if (value == null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

export function routeWithParams(route = "/", params = {}) {
  const url = new URL(route, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.pathname + url.search;
}

/* =========================
   MEDIA DETECTION
========================= */

function cleanFileUrl(url = "") {
  return String(url || "").split("?")[0].toLowerCase();
}

export function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)$/i.test(cleanFileUrl(url));
}

export function isImageUrl(url = "") {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(cleanFileUrl(url));
}

export function isAudioUrl(url = "") {
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(cleanFileUrl(url));
}

export function getMediaKind(url = "") {
  if (isVideoUrl(url)) return "video";
  if (isAudioUrl(url)) return "audio";
  if (isImageUrl(url)) return "image";
  return "file";
}

/* =========================
   ASYNC
========================= */

export function debounce(fn, wait = 250) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 250) {
  let waiting = false;
  let lastArgs = null;

  return (...args) => {
    if (waiting) {
      lastArgs = args;
      return;
    }

    fn(...args);
    waiting = true;

    window.setTimeout(() => {
      waiting = false;
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
}

export function sleep(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function randomId(prefix = "rb") {
  if (window.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function copyToClipboard(value = "") {
  const text = String(value || "");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();

  return true;
}

/* =========================
   DOM HELPERS
========================= */

export function resolveEl(selectorOrElement) {
  return typeof selectorOrElement === "string"
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;
}

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

export function setValue(selectorOrElement, value = "") {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.value = value;
  return el;
}

export function getValue(selectorOrElement, fallback = "") {
  const el = resolveEl(selectorOrElement);
  if (!el) return fallback;
  return el.value ?? fallback;
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

export function setBackgroundImage(selectorOrElement, src, fallback = BRAND_IMAGES.homeHero) {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;

  const image = src || fallback;
  el.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.62)), url("${image}")`;

  return el;
}

export function showElement(selectorOrElement, display = "") {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.hidden = false;
  el.style.display = display;
  return el;
}

export function hideElement(selectorOrElement) {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.hidden = true;
  el.style.display = "none";
  return el;
}

export function toggleClass(selectorOrElement, className, enabled = true) {
  const el = resolveEl(selectorOrElement);
  if (!el) return null;
  el.classList.toggle(className, Boolean(enabled));
  return el;
}

/* =========================
   PROFILE / DISPLAY HELPERS
========================= */

export function getDisplayName(profile = {}, user = null) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    profile?.handle ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Rich Bizness User"
  );
}

export function getHandle(profile = {}) {
  return (
    profile?.handle ||
    profile?.username ||
    slugify(profile?.display_name || "") ||
    "richbizness"
  );
}

export function getProfileImage(profile = {}) {
  return (
    profile?.profile_image_url ||
    profile?.avatar_url ||
    profile?.profile_image ||
    BRAND_IMAGES.logo
  );
}

export function getBannerImage(profile = {}) {
  return (
    profile?.banner_url ||
    profile?.cover_url ||
    profile?.cover_image_url ||
    BRAND_IMAGES.artist ||
    BRAND_IMAGES.homeHero
  );
}

export function getMediaImage(record = {}) {
  return (
    record?.thumbnail_url ||
    record?.cover_url ||
    record?.image_url ||
    record?.media_url ||
    record?.file_url ||
    BRAND_IMAGES.homeHero
  );
}

/* =========================
   APP LINKS
========================= */

export function getCreatorLink(userId) {
  return userId
    ? routeWithParams(ROUTES.profile || "/profile.html", { user: userId })
    : ROUTES.profile || "/profile.html";
}

export function getPostLink(postId) {
  return postId
    ? routeWithParams(ROUTES.feed || "/feed.html", { post: postId })
    : ROUTES.feed || "/feed.html";
}

export function getSportsPostLink(postId) {
  return postId
    ? routeWithParams(ROUTES.sportsPost || "/sports-post.html", { id: postId })
    : ROUTES.sports || "/sports.html";
}

export function getWatchLink(slug = "") {
  return slug
    ? routeWithParams(ROUTES.watch || "/watch.html", { slug })
    : ROUTES.watch || "/watch.html";
}

export function getLiveLink(streamId = "") {
  return streamId
    ? routeWithParams(ROUTES.live || "/live.html", { id: streamId })
    : ROUTES.live || "/live.html";
}

export function getStoreProductLink(productId = "") {
  return productId
    ? routeWithParams(ROUTES.store || "/store.html", { product: productId })
    : ROUTES.store || "/store.html";
}

/* =========================
   ARRAYS / COLLECTIONS
========================= */

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function uniqueBy(items = [], key = "id") {
  const seen = new Set();

  return normalizeArray(items).filter((item) => {
    const value = item?.[key];
    if (value == null) return true;
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function sortByDateDesc(items = [], key = "created_at") {
  return [...normalizeArray(items)].sort((a, b) => {
    const aTime = new Date(a?.[key] || 0).getTime();
    const bTime = new Date(b?.[key] || 0).getTime();
    return bTime - aTime;
  });
}

/* =========================
   STORAGE
========================= */

export function buildPublicStorageUrl(
  bucket,
  path,
  supabaseUrl = window.NEXT_PUBLIC_SUPABASE_URL || window.SUPABASE_URL || SUPABASE_PROJECT_URL || ""
) {
  if (!bucket || !path || !supabaseUrl) return "";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${String(path).replace(/^\/+/, "")}`;
}

/* =========================
   TYPE INFERENCE
========================= */

export function inferPostTypeFromSource(sourceTable = "") {
  const value = String(sourceTable || "").toLowerCase();

  if (value.includes("music") || value.includes("track")) return "music";
  if (value.includes("gaming") || value.includes("game")) return "gaming";
  if (value.includes("sport")) return "sports";
  if (value.includes("art") || value.includes("gallery")) return "artwork";
  if (value.includes("live")) return "live";
  if (value.includes("podcast")) return "podcast";
  if (value.includes("product") || value.includes("store")) return "product";

  return "post";
}
