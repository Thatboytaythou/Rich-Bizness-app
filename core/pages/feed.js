// =========================
// RICH BIZNESS FEED
// /core/pages/feed.js
// =========================

import { initApp, getSupabase, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail } from "/core/features/live/live-rail.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();
let currentProfile = getCurrentProfileState();

const $ = (id) => document.getElementById(id);

const els = {
  nav: $("elite-platform-nav"),
  status: $("feed-status"),

  form: $("post-form"),
  submitBtn: $("submit-post-btn"),
  title: $("post-title"),
  body: $("post-body"),
  category: $("post-category"),
  mediaUrl: $("post-media-url"),

  composerAvatar: $("composer-avatar"),
  composerName: $("composer-name"),

  feedList: $("feed-list")
};

mountEliteNav({
  target: "#elite-platform-nav",
  collapsed: false
});

function setStatus(message, type = "normal") {
  if (!els.status) return;

  els.status.textContent = message;
  els.status.classList.remove("is-error", "is-success");

  if (type === "error") els.status.classList.add("is-error");
  if (type === "success") els.status.classList.add("is-success");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getDisplayName(profile = null, user = null) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    profile?.handle ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Rich Bizness Creator"
  );
}

function getAvatar(profile = null) {
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png"
  );
}

async function requireUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return null;
  }

  return currentUser;
}

async function loadCurrentProfile() {
  if (!currentUser?.id) return null;

  if (currentProfile?.id) return currentProfile;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!error && data) {
    currentProfile = data;
  }

  return currentProfile;
}

function renderComposer() {
  if (els.composerName) {
    els.composerName.textContent = getDisplayName(currentProfile, currentUser);
  }

  if (els.composerAvatar) {
    els.composerAvatar.src = getAvatar(currentProfile);
  }
}

function getMediaMarkup(url = "") {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return "";

  const lower = cleanUrl.toLowerCase();

  if (
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.includes("video")
  ) {
    return `
      <div class="feed-media">
        <video src="${escapeHtml(cleanUrl)}" controls playsinline></video>
      </div>
    `;
  }

  return `
    <div class="feed-media">
      <img src="${escapeHtml(cleanUrl)}" alt="Feed media" loading="lazy" />
    </div>
  `;
}

function getProfileFromPost(post) {
  if (Array.isArray(post.profiles)) return post.profiles[0] || null;
  return post.profiles || null;
}

function getPostTitle(post) {
  return post.title || post.caption || "Rich Bizness Move";
}

function getPostBody(post) {
  return post.body || post.description || post.content || post.caption || "";
}

function getPostMedia(post) {
  return (
    post.media_url ||
    post.image_url ||
    post.video_url ||
    post.file_url ||
    post.thumbnail_url ||
    ""
  );
}

function getPostCategory(post) {
  return post.category || post.content_type || post.type || "general";
}

function renderPost(post) {
  const profile = getProfileFromPost(post);
  const authorName = getDisplayName(profile, null);
  const authorAvatar = getAvatar(profile);
  const title = getPostTitle(post);
  const body = getPostBody(post);
  const mediaUrl = getPostMedia(post);
  const category = getPostCategory(post);
  const authorId = post.user_id || post.creator_id || profile?.id || "";

  return `
    <article class="feed-card" data-post-id="${escapeHtml(post.id)}">
      <div class="feed-card-head">
        <a class="feed-author" href="${authorId ? `/profile.html?id=${encodeURIComponent(authorId)}` : "/profile.html"}">
          <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)} avatar" />
          <div>
            <strong>${escapeHtml(authorName)}</strong>
            <span>${escapeHtml(category)} • ${safeDate(post.created_at)}</span>
          </div>
        </a>

        <span class="feed-card-badge">${escapeHtml(String(category).toUpperCase())}</span>
      </div>

      <div class="feed-card-body">
        <h3>${escapeHtml
