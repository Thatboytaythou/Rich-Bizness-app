// =========================
// RICH BIZNESS FEED — FINAL
// /core/pages/feed.js
// =========================

import {
  initApp,
  getSupabase,
  getCurrentUserState,
  getCurrentProfileState
} from "/core/app.js";

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
        <h3>${escapeHtml(title)}</h3>
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        ${getMediaMarkup(mediaUrl)}
      </div>

      <div class="feed-actions">
        <button class="btn-ghost like-btn" type="button" data-like-post="${escapeHtml(post.id)}">❤️ Like</button>
        <button class="btn-ghost comment-btn" type="button" data-comment-post="${escapeHtml(post.id)}">💬 Comment</button>
        <button class="btn-ghost repost-btn" type="button" data-repost-post="${escapeHtml(post.id)}">🔁 Repost</button>
      </div>
    </article>
  `;
}

async function loadFeed() {
  setStatus("Loading feed...");

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id (*)
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[feed] loadFeed error:", error);
    setStatus(error.message || "Failed to load feed.", "error");
    return;
  }

  if (!data?.length) {
    els.feedList.innerHTML = `
      <div class="feed-empty">
        <strong>No posts yet.</strong>
        <span>Be the first to post a move.</span>
      </div>
    `;
    setStatus("Feed ready.");
    return;
  }

  els.feedList.innerHTML = data.map(renderPost).join("");
  setStatus("Feed loaded.", "success");
}

async function createPost(event) {
  event.preventDefault();

  const user = await requireUser();
  if (!user?.id) return;

  const title = els.title?.value?.trim() || "";
  const body = els.body?.value?.trim() || "";
  const category = els.category?.value || "general";
  const mediaUrl = els.mediaUrl?.value?.trim() || "";

  if (!title && !body && !mediaUrl) {
    setStatus("Add a title, message, or media before posting.", "error");
    return;
  }

  if (els.submitBtn) els.submitBtn.disabled = true;
  setStatus("Posting your move...");

  const payload = {
    user_id: user.id,
    title: title || null,
    body: body || null,
    category,
    media_url: mediaUrl || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("posts").insert(payload);

  if (error) {
    console.error("[feed] createPost error:", error);
    setStatus(error.message || "Failed to post.", "error");
    if (els.submitBtn) els.submitBtn.disabled = false;
    return;
  }

  els.form?.reset();
  setStatus("Posted to the feed.", "success");

  if (els.submitBtn) els.submitBtn.disabled = false;

  await loadFeed();
}

async function likePost(postId) {
  const user = await requireUser();
  if (!user?.id || !postId) return;

  const { error } = await supabase.from("post_reactions").upsert(
    {
      post_id: postId,
      user_id: user.id,
      reaction_type: "like",
      created_at: new Date().toISOString()
    },
    {
      onConflict: "post_id,user_id"
    }
  );

  if (error) {
    console.warn("[feed] likePost skipped:", error);
    setStatus(error.message || "Could not like post.", "error");
    return;
  }

  setStatus("Liked.", "success");
}

async function repostPost(postId) {
  const user = await requireUser();
  if (!user?.id || !postId) return;

  const { error } = await supabase.from("reposts").insert({
    post_id: postId,
    user_id: user.id,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.warn("[feed] repostPost skipped:", error);
    setStatus(error.message || "Could not repost.", "error");
    return;
  }

  setStatus("Reposted.", "success");
}

function commentPost(postId) {
  if (!postId) return;

  const comment = window.prompt("Drop your comment:");
  if (!comment?.trim()) return;

  createComment(postId, comment.trim());
}

async function createComment(postId, body) {
  const user = await requireUser();
  if (!user?.id || !postId || !body) return;

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    body,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.warn("[feed] comment skipped:", error);
    setStatus(error.message || "Could not comment.", "error");
    return;
  }

  setStatus("Comment added.", "success");
}

function bindFeedActions() {
  els.feedList?.addEventListener("click", async (event) => {
    const likeBtn = event.target.closest("[data-like-post]");
    const commentBtn = event.target.closest("[data-comment-post]");
    const repostBtn = event.target.closest("[data-repost-post]");

    if (likeBtn) {
      await likePost(likeBtn.getAttribute("data-like-post"));
      return;
    }

    if (commentBtn) {
      commentPost(commentBtn.getAttribute("data-comment-post"));
      return;
    }

    if (repostBtn) {
      await repostPost(repostBtn.getAttribute("data-repost-post"));
    }
  });
}

async function bootFeed() {
  const user = await requireUser();
  if (!user?.id) return;

  await loadCurrentProfile();
  renderComposer();

  els.form?.addEventListener("submit", createPost);
  bindFeedActions();

  await loadFeed();

  await bootLiveRail({
    railElementId: "feed-live-rail",
    limit: 5,
    autoRefresh: true,
    intervalMs: 15000,
    channelKey: "feed"
  });

  supabase
    .channel("rb-feed-posts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "posts"
      },
      async () => {
        await loadFeed();
      }
    )
    .subscribe();

  console.log("🔥 Rich Bizness Feed Loaded");
}

bootFeed().catch((error) => {
  console.error("[feed] boot error:", error);
  setStatus(error.message || "Could not load feed.", "error");
});
