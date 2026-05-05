// =========================
// RICH BIZNESS FEED CLIENT — FINAL
// =========================

import { supabase } from "/core/supabase.js";

export async function loadFeed(targetId = "feed-root") {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = "Loading feed...";

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    container.innerHTML = "Error loading feed";
    return;
  }

  if (!data.length) {
    container.innerHTML = "No content yet";
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
