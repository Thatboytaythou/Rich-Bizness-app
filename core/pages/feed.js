import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase } from "/core/supabase.js";
import { ROUTES, BRAND_IMAGES, formatNumber } from "/core/config.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  navMount: $("elite-platform-nav"),
  statusBox: $("feed-status"),
  feedList: $("feed-list"),
  composerForm: $("feed-composer-form"),
  composerText: $("feed-composer-text"),
  composerTitle: $("feed-composer-title"),
  composerMediaUrl: $("feed-composer-media-url"),
  composerSubmit: $("feed-composer-submit"),
  filterButtons: Array.from(document.querySelectorAll("[data-feed-filter]"))
};

let currentUser = null;
let currentProfile = null;
let currentFilter = "all";
let feedChannel = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;
  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");

  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getDisplayName(profile = null, fallbackUser = null) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.handle ||
    fallbackUser?.user_metadata?.display_name ||
    fallbackUser?.user_metadata?.username ||
    fallbackUser?.email?.split("@")[0] ||
    "Rich Bizness User"
  );
}

function getAvatar(profile = null) {
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    BRAND_IMAGES.logo
  );
}

function mediaTemplate(post = {}) {
  const media =
    post.image_url ||
    post.thumbnail_url ||
    post.cover_url ||
    post.media_url ||
    "";

  if (!media) return "";

  if (/\.(mp4|webm|mov|m4v)$/i.test(media)) {
    return `
      <div class="media-frame aspect-video mt-3">
        <video src="${escapeHtml(media)}" controls playsinline></video>
      </div>
    `;
  }

  return `
    <div class="media-frame aspect-video mt-3">
      <img src="${escapeHtml(media)}" alt="${escapeHtml(post.title || post.caption || "Feed media")}" />
    </div>
  `;
}

function postCard(post = {}) {
  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const displayName =
    profile?.display_name ||
    profile?.username ||
    post.author_name ||
    "Rich Bizness User";

  const avatar =
    profile?.avatar_url ||
    profile?.profile_image_url ||
    post.author_avatar ||
    BRAND_IMAGES.logo;

  const profileHref = post.user_id
    ? `/profile.html?user=${encodeURIComponent(post.user_id)}`
    : ROUTES.profile;

  const postHref = post.id
    ? `/feed.html?post=${encodeURIComponent(post.id)}`
    : ROUTES.feed;

  const category = post.post_type || post.source_table || "post";
  const reactionCount = formatNumber(post.reaction_count || 0);
  const commentCount = formatNumber(post.comment_count || 0);

  return `
    <article class="card feed-post" data-post-id="${escapeHtml(post.id || "")}">
      <div class="justify-between">
        <div class="inline-row">
          <img class="avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(displayName)}" />
          <div>
            <a href="${profileHref}" class="text-sm"><strong>${escapeHtml(displayName)}</strong></a>
            <div class="muted text-xs">${escapeHtml(safeDate(post.created_at))}</div>
          </div>
        </div>
        <span class="badge">${escapeHtml(String(category).toUpperCase())}</span>
      </div>

      ${
        post.title
          ? `<h3 class="mt-3" style="font-size:1.15rem;">${escapeHtml(post.title)}</h3>`
          : ""
      }

      ${
        post.body || post.caption || post.description
          ? `<p class="mt-2">${escapeHtml(post.body || post.caption || post.description)}</p>`
          : ""
      }

      ${mediaTemplate(post)}

      <div class="mt-3 inline-wrap">
        <span class="badge">${reactionCount} reactions</span>
        <span class="badge">${commentCount} comments</span>
      </div>

      <div class="mt-3 inline-wrap">
        <button class="btn-ghost" type="button" data-feed-like="${escapeHtml(post.id || "")}">
          React
        </button>
        <a class="btn-ghost" href="${postHref}">
          Open Post
        </a>
        <a class="btn-ghost" href="${profileHref}">
          Creator
        </a>
      </div>
    </article>
  `;
}

function emptyFeed(title = "No posts yet.", copy = "Feed posts will appear here as creators publish content.") {
  return `
    <div class="empty-state">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(copy)}</span>
      </div>
    </div>
  `;
}

async function fetchFeedPosts() {
  let query = supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id (
        id,
        display_name,
        username,
        handle,
        avatar_url,
        profile_image_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (currentFilter !== "all") {
    query = query.eq("post_type", currentFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[feed] fetchFeedPosts error:", error);
    throw new Error(error.message || "Could not load feed.");
  }

  return data || [];
}

async function renderFeed() {
  if (!els.feedList) return;

  try {
    const posts = await fetchFeedPosts();

    els.feedList.innerHTML = posts.length
      ? posts.map(postCard).join("")
      : emptyFeed(
          currentFilter === "all" ? "No posts yet." : `No ${currentFilter} posts yet.`,
          "The feed will fill as creators post content."
        );

    setStatus("Feed loaded.", "success");
  } catch (error) {
    console.error("[feed] renderFeed error:", error);
    els.feedList.innerHTML = emptyFeed("Feed could not load.", "Try refreshing the page.");
    setStatus(error.message || "Could not load feed.", "error");
  }
}

function syncFilterButtons() {
  els.filterButtons.forEach((button) => {
    const active = button.dataset.feedFilter === currentFilter;
    button.classList.toggle("active", active);
  });
}

async function createFeedPost(event) {
  event.preventDefault();

  if (!currentUser?.id) {
    setStatus("You must be logged in to post.", "error");
    return;
  }

  const title = els.composerTitle?.value.trim() || null;
  const body = els.composerText?.value.trim() || null;
  const mediaUrl = els.composerMediaUrl?.value.trim() || null;

  if (!title && !body && !mediaUrl) {
    setStatus("Add something before posting.", "error");
    return;
  }

  if (els.composerSubmit) els.composerSubmit.disabled = true;

  try {
    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: currentUser.id,
        title,
        body,
        caption: body,
        image_url: mediaUrl,
        media_url: mediaUrl,
        post_type: "post",
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("[feed] createFeedPost error:", error);
      throw new Error(error.message || "Could not create post.");
    }

    if (els.composerForm) els.composerForm.reset();

    setStatus("Post created.", "success");
    await renderFeed();
  } catch (error) {
    console.error("[feed] createFeedPost catch:", error);
    setStatus(error.message || "Could not create post.", "error");
  } finally {
    if (els.composerSubmit) els.composerSubmit.disabled = false;
  }
}

async function reactToPost(postId) {
  if (!currentUser?.id) {
    setStatus("Login required before reacting.", "error");
    return;
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (existingError) {
      console.error("[feed] existing reaction lookup error:", existingError);
      throw new Error(existingError.message || "Could not update reaction.");
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("id", existing.id);

      if (error) {
        console.error("[feed] delete reaction error:", error);
        throw new Error(error.message || "Could not remove reaction.");
      }

      setStatus("Reaction removed.", "success");
    } else {
      const { error } = await supabase
        .from("post_reactions")
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          reaction_type: "fire"
        });

      if (error) {
        console.error("[feed] insert reaction error:", error);
        throw new Error(error.message || "Could not react to post.");
      }

      setStatus("Reaction added.", "success");
    }

    await renderFeed();
  } catch (error) {
    console.error("[feed] reactToPost catch:", error);
    setStatus(error.message || "Could not update reaction.", "error");
  }
}

function clearRealtime() {
  if (feedChannel) {
    supabase.removeChannel(feedChannel);
    feedChannel = null;
  }
}

function bindRealtime() {
  clearRealtime();

  feedChannel = supabase
    .channel("rb-feed-posts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts"
      },
      async () => {
        await renderFeed();
      }
    )
    .subscribe();
}

function bindEvents() {
  els.composerForm?.addEventListener("submit", createFeedPost);

  els.filterButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const nextFilter = button.dataset.feedFilter || "all";
      currentFilter = nextFilter;
      syncFilterButtons();
      await renderFeed();
    });
  });

  els.feedList?.addEventListener("click", async (event) => {
    const reactButton = event.target.closest("[data-feed-like]");
    if (!reactButton) return;

    const postId = reactButton.getAttribute("data-feed-like");
    if (!postId) return;

    await reactToPost(postId);
  });
}

export async function bootFeedPage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentProfile = getCurrentProfileState();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  if (els.composerForm) {
    els.composerForm.style.display = currentUser?.id ? "" : "none";
  }

  syncFilterButtons();
  bindEvents();
  bindRealtime();
  await renderFeed();

  if (currentUser?.id) {
    setStatus(`Feed loaded for ${getDisplayName(currentProfile, currentUser)}.`, "success");
  } else {
    setStatus("Feed loaded. Login to post and react.", "success");
  }
}

export function destroyFeedPage() {
  clearRealtime();
}

if (document.body?.classList.contains("feed-page")) {
  bootFeedPage().catch((error) => {
    console.error("[feed] bootFeedPage error:", error);
    setStatus(error.message || "Could not boot feed page.", "error");
  });

  window.addEventListener("beforeunload", () => {
    destroyFeedPage();
  });
}
