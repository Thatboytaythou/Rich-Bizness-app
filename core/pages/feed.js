// feed.js
// Rich Bizness LLC — Final Feed System

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ksvdequymkceevocgpdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  user: null,
  profile: null,
  posts: [],
  activeFilter: "all",
};

const els = {
  feedList: document.querySelector("#feedList"),
  postForm: document.querySelector("#postForm"),
  postText: document.querySelector("#postText"),
  postMedia: document.querySelector("#postMedia"),
  postCategory: document.querySelector("#postCategory"),
  emptyState: document.querySelector("#emptyState"),
  authGate: document.querySelector("#authGate"),
  userBadge: document.querySelector("#userBadge"),
  filterButtons: document.querySelectorAll("[data-feed-filter]"),
};

document.addEventListener("DOMContentLoaded", initFeed);

async function initFeed() {
  await loadUser();
  bindEvents();
  await loadFeed();
}

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  state.user = data?.user || null;

  if (!state.user) {
    if (els.authGate) els.authGate.style.display = "block";
    if (els.postForm) els.postForm.style.display = "none";
    return;
  }

  if (els.authGate) els.authGate.style.display = "none";
  if (els.postForm) els.postForm.style.display = "block";

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  state.profile = profile || null;

  if (els.userBadge) {
    els.userBadge.textContent =
      state.profile?.display_name ||
      state.profile?.username ||
      state.user.email ||
      "Rich Bizness Member";
  }
}

function bindEvents() {
  if (els.postForm) {
    els.postForm.addEventListener("submit", createPost);
  }

  els.filterButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.activeFilter = btn.dataset.feedFilter || "all";

      els.filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      await loadFeed();
    });
  });
}

async function loadFeed() {
  if (!els.feedList) return;

  els.feedList.innerHTML = `<div class="feed-loading">Loading Rich Bizness feed...</div>`;

  let query = supabase
    .from("posts")
    .select(`
      id,
      user_id,
      body,
      caption,
      content,
      category,
      media_url,
      image_url,
      video_url,
      created_at,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (state.activeFilter !== "all") {
    query = query.eq("category", state.activeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Feed load error:", error);
    els.feedList.innerHTML = `
      <div class="feed-error">
        Could not load the feed yet. Check your posts table columns.
      </div>
    `;
    return;
  }

  state.posts = data || [];
  renderFeed();
}

function renderFeed() {
  if (!els.feedList) return;

  if (!state.posts.length) {
    els.feedList.innerHTML = "";
    if (els.emptyState) els.emptyState.style.display = "block";
    return;
  }

  if (els.emptyState) els.emptyState.style.display = "none";

  els.feedList.innerHTML = state.posts.map(renderPostCard).join("");

  document.querySelectorAll("[data-like-post]").forEach((btn) => {
    btn.addEventListener("click", () => likePost(btn.dataset.likePost));
  });

  document.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", () => deletePost(btn.dataset.deletePost));
  });
}

function renderPostCard(post) {
  const profile = post.profiles || {};
  const name =
    profile.display_name ||
    profile.username ||
    "Rich Bizness Creator";

  const avatar =
    profile.avatar_url ||
    "/images/brand/rich-bizness-profile.jpg";

  const text =
    post.body ||
    post.caption ||
    post.content ||
    "";

  const media =
    post.media_url ||
    post.image_url ||
    post.video_url ||
    "";

  const category = post.category || "general";
  const isOwner = state.user && post.user_id === state.user.id;

  return `
    <article class="feed-card">
      <div class="feed-card-top">
        <img class="feed-avatar" src="${escapeAttr(avatar)}" alt="${escapeAttr(name)}" />

        <div class="feed-meta">
          <strong>${escapeHtml(name)}</strong>
          <span>${formatDate(post.created_at)} · ${escapeHtml(category)}</span>
        </div>

        ${isOwner ? `
          <button class="feed-delete" data-delete-post="${post.id}" title="Delete post">
            ×
          </button>
        ` : ""}
      </div>

      ${text ? `<p class="feed-text">${escapeHtml(text)}</p>` : ""}

      ${renderMedia(media)}

      <div class="feed-actions">
        <button data-like-post="${post.id}">🔥 Like</button>
        <button onclick="window.location.href='profile.html?id=${post.user_id}'">View Profile</button>
        <button onclick="window.location.href='messages.html?to=${post.user_id}'">Message</button>
      </div>
    </article>
  `;
}

function renderMedia(url) {
  if (!url) return "";

  const safeUrl = escapeAttr(url);
  const lower = url.toLowerCase();

  if (lower.includes(".mp4") || lower.includes(".webm") || lower.includes(".mov")) {
    return `
      <video class="feed-media" controls playsinline>
        <source src="${safeUrl}" />
      </video>
    `;
  }

  return `<img class="feed-media" src="${safeUrl}" alt="Feed media" />`;
}

async function createPost(event) {
  event.preventDefault();

  if (!state.user) {
    window.location.href = "auth.html";
    return;
  }

  const text = els.postText?.value?.trim() || "";
  const category = els.postCategory?.value || "general";
  const file = els.postMedia?.files?.[0] || null;

  if (!text && !file) {
    alert("Add text or media before posting.");
    return;
  }

  let mediaUrl = null;

  if (file) {
    mediaUrl = await uploadFeedMedia(file);
    if (!mediaUrl) return;
  }

  const payload = {
    user_id: state.user.id,
    body: text,
    caption: text,
    content: text,
    category,
    media_url: mediaUrl,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("posts").insert(payload);

  if (error) {
    console.error("Create post error:", error);
    alert("Post could not be created. Check your posts table columns.");
    return;
  }

  els.postForm.reset();
  await loadFeed();
}

async function uploadFeedMedia(file) {
  const ext = file.name.split(".").pop();
  const path = `${state.user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    alert("Media upload failed. Check your uploads bucket policy.");
    return null;
  }

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(path);

  return data.publicUrl;
}

async function likePost(postId) {
  if (!state.user) {
    window.location.href = "auth.html";
    return;
  }

  const { error } = await supabase.from("post_reactions").insert({
    post_id: postId,
    user_id: state.user.id,
    reaction: "fire",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Like may already exist or table policy blocked it:", error);
  }

  alert("🔥 Liked");
}

async function deletePost(postId) {
  if (!confirm("Delete this post?")) return;

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", state.user.id);

  if (error) {
    console.error("Delete post error:", error);
    alert("Could not delete this post.");
    return;
  }

  await loadFeed();
}

function formatDate(value) {
  if (!value) return "Just now";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
