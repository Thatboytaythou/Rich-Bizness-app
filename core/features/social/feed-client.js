// =========================
// RICH BIZNESS FEED CLIENT — FILTERED (BOOK SYSTEM)
// =========================

import { supabase } from "/core/supabase.js";

export async function loadFeed({
  targetId = "feed-root",
  type = null,
  userId = null,
  limit = 20
} = {}) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = "Loading...";

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // 🔥 FILTER BY TYPE (music, gaming, etc)
  if (type) {
    query = query.eq("content_type", type);
  }

  // 🔥 FILTER BY USER (profile page)
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    container.innerHTML = "Error loading feed";
    return;
  }

  if (!data.length) {
    container.innerHTML = "Nothing here yet";
    return;
  }

  container.innerHTML = data.map(renderPost).join("");
}

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

  if (url.includes(".mp4")) {
    return `<video src="${url}" controls></video>`;
  }

  return `<img src="${url}" />`;
}
