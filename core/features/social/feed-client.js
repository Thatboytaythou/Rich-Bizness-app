// =========================
// RICH BIZNESS FEED CLIENT — PERSONALIZED + FALLBACK
// =========================

import { supabase } from "/core/supabase.js";

// 🔥 MAIN FEED LOADER
export async function loadFeed({
  targetId = "feed-root",
  userId = null,
  type = null,
  limit = 20
} = {}) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = "Loading...";

  try {
    let posts = [];

    // =========================
    // 🔥 PERSONALIZED FEED (FOLLOWING)
    // =========================
    if (userId) {
      const { data: following } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = following?.map(f => f.following_id) || [];

      if (followingIds.length > 0) {
        let query = supabase
          .from("posts")
          .select("*")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (type) {
          query = query.eq("content_type", type);
        }

        const { data } = await query;
        posts = data || [];
      }
    }

    // =========================
    // 🔥 FALLBACK (GLOBAL)
    // =========================
    if (!posts.length) {
      let fallbackQuery = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (type) {
        fallbackQuery = fallbackQuery.eq("content_type", type);
      }

      const { data } = await fallbackQuery;
      posts = data || [];
    }

    // =========================
    // 🔥 RENDER
    // =========================
    if (!posts.length) {
      container.innerHTML = "No content yet";
      return;
    }

    container.innerHTML = posts.map(renderPost).join("");

  } catch (err) {
    console.error("feed error:", err);
    container.innerHTML = "Error loading feed";
  }
}

// =========================
// 🔥 POST UI
// =========================

function renderPost(post) {
  return `
    <div class="feed-card">

      <div class="feed-header">
        <strong>${post.title || "Untitled"}</strong>
        <span>${post.content_type}</span>
      </div>

      <div class="feed-media">
        ${renderMedia(post.media_url)}
      </div>

    </div>
  `;
}

function renderMedia(url) {
  if (!url) return "";

  if (url.endsWith(".mp4")) {
    return `<video src="${url}" controls></video>`;
  }

  return `<img src="${url}" />`;
}
