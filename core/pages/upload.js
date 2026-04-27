// =========================
// RICH BIZNESS UPLOAD — FINAL SYNCED ENGINE
// /core/pages/upload.js
// Routes uploads into:
// posts, music_tracks, sports_uploads, gaming_uploads,
// artworks, products, premium_content, podcast_episodes
// =========================

import {
  initApp,
  getSupabase,
  getCurrentUserState
} from "/core/app.js";

import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("upload-status"),
  form: $("upload-form"),
  submitBtn: $("submit-upload-btn"),
  clearBtn: $("clear-upload-btn"),

  type: $("upload-type"),
  category: $("upload-category"),
  title: $("upload-title"),
  description: $("upload-description"),
  fileUrl: $("upload-file-url"),
  thumbnailUrl: $("upload-thumbnail-url"),
  price: $("upload-price"),
  visibility: $("upload-visibility"),

  artistName: $("upload-artist-name"),
  teamName: $("upload-team-name"),
  athleteName: $("upload-athlete-name"),
  quantity: $("upload-quantity"),
  showId: $("upload-show-id"),
  episodeNumber: $("upload-episode-number"),

  previewImage: $("upload-preview-image"),
  previewType: $("upload-preview-type"),
  previewTitle: $("upload-preview-title"),
  previewCopy: $("upload-preview-copy"),

  recentList: $("recent-uploads-list")
};

const FALLBACK_IMAGE = "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

const LABELS = {
  feed: "Feed Post",
  music: "Music Track",
  sports: "Sports Upload",
  gaming: "Gaming Clip",
  gallery: "Gallery Artwork",
  store: "Store Product",
  premium: "Premium Content",
  podcast: "Podcast Episode"
};

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `upload-status ${type}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

async function requireUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (!currentUser?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return null;
  }

  return currentUser;
}

function getPayloadBase() {
  return {
    type: els.type?.value || "feed",
    category: els.category?.value?.trim() || "",
    title: els.title?.value?.trim() || "",
    description: els.description?.value?.trim() || "",
    fileUrl: els.fileUrl?.value?.trim() || "",
    thumbnailUrl: els.thumbnailUrl?.value?.trim() || "",
    priceCents: moneyToCents(els.price?.value || 0),
    visibility: els.visibility?.value || "public",
    artistName: els.artistName?.value?.trim() || "",
    teamName: els.teamName?.value?.trim() || "",
    athleteName: els.athleteName?.value?.trim() || "",
    quantity: Number(els.quantity?.value || 1),
    showId: els.showId?.value?.trim() || "",
    episodeNumber: Number(els.episodeNumber?.value || 1)
  };
}

function updatePreview() {
  const payload = getPayloadBase();

  if (els.previewImage) {
    els.previewImage.src = payload.thumbnailUrl || payload.fileUrl || FALLBACK_IMAGE;
  }

  if (els.previewType) {
    els.previewType.textContent = LABELS[payload.type] || "Upload";
  }

  if (els.previewTitle) {
    els.previewTitle.textContent = payload.title || "Your upload preview";
  }

  if (els.previewCopy) {
    els.previewCopy.textContent =
      payload.description ||
      payload.fileUrl ||
      "Add a title, description, and file URL to preview the drop.";
  }
}

async function createFeedPost(user, payload) {
  return supabase.from("posts").insert({
    user_id: user.id,
    title: payload.title || null,
    body: payload.description || null,
    category: payload.category || "general",
    media_url: payload.fileUrl || payload.thumbnailUrl || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

async function createMusicTrack(user, payload) {
  return supabase.from("music_tracks").insert({
    user_id: user.id,
    creator_id: user.id,
    title: payload.title || "Untitled Track",
    artist_name: payload.artistName || "Rich Bizness Artist",
    genre: payload.category || "music",
    audio_url: payload.fileUrl || null,
    cover_url: payload.thumbnailUrl || null,
    description: payload.description || null,
    plays: 0,
    likes: 0,
    reposts: 0,
    created_at: new Date().toISOString()
  });
}

async function createSportsUpload(user, payload) {
  return supabase.from("sports_uploads").insert({
    user_id: user.id,
    title: payload.title || "Sports Upload",
    caption: payload.description || null,
    sport_name: payload.category || null,
    team_name: payload.teamName || null,
    athlete_name: payload.athleteName || null,
    content_type: "upload",
    clip_type: payload.visibility === "premium" ? "premium" : "highlight",
    file_url: payload.fileUrl || null,
    thumbnail_url: payload.thumbnailUrl || null,
    views: 0,
    likes: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    metadata: {
      source: "upload_page",
      visibility: payload.visibility
    }
  });
}

async function createGamingUpload(user, payload) {
  return supabase.from("gaming_uploads").insert({
    user_id: user.id,
    title: payload.title || "Gaming Clip",
    caption: payload.description || null,
    game: payload.category || null,
    platform: "Rich Bizness",
    gamer_tag: payload.artistName || null,
    clip_type: payload.visibility === "premium" ? "premium" : "clip",
    file_url: payload.fileUrl || null,
    thumbnail_url: payload.thumbnailUrl || null,
    views: 0,
    likes: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    metadata: {
      source: "upload_page",
      visibility: payload.visibility
    }
  });
}

async function createArtwork(user, payload) {
  return supabase.from("artworks").insert({
    user_id: user.id,
    title: payload.title || "Rich Bizness Artwork",
    description: payload.description || null,
    image_url: payload.fileUrl || payload.thumbnailUrl || null,
    price_cents: payload.priceCents,
    is_paid: payload.priceCents > 0 || payload.visibility === "premium",
    is_featured: false,
    created_at: new Date().toISOString()
  });
}

async function createProduct(user, payload) {
  return supabase.from("products").insert({
    creator_id: user.id,
    user_id: user.id,
    seller_user_id: user.id,
    title: payload.title || "Creator Product",
    name: payload.title || "Creator Product",
    description: payload.description || null,
    image_url: payload.thumbnailUrl || payload.fileUrl || null,
    price_cents: payload.priceCents,
    currency: "usd",
    active: payload.visibility !== "draft" && payload.visibility !== "private",
    is_active: payload.visibility !== "draft" && payload.visibility !== "private",
    kind: "product",
    created_at: new Date().toISOString()
  });
}

async function createPremiumContent(user, payload) {
  return supabase.from("premium_content").insert({
    creator_id: user.id,
    creator_email: user.email || null,
    content_type: payload.category || "premium",
    content_id: 0,
    title: payload.title || "Premium Content",
    description: payload.description || null,
    price_cents: payload.priceCents,
    is_active: payload.visibility !== "draft" && payload.visibility !== "private",
    created_at: new Date().toISOString()
  });
}

async function createPodcastEpisode(user, payload) {
  return supabase.from("podcast_episodes").insert({
    show_id: payload.showId || null,
    creator_id: user.id,
    title: payload.title || "Podcast Episode",
    description: payload.description || null,
    audio_url: payload.fileUrl || null,
    cover_url: payload.thumbnailUrl || null,
    episode_number: payload.episodeNumber || null,
    is_featured: false,
    is_published: payload.visibility !== "draft" && payload.visibility !== "private",
    created_at: new Date().toISOString()
  });
}

async function submitUpload(event) {
  event.preventDefault();

  const user = await requireUser();
  if (!user?.id) return;

  const payload = getPayloadBase();

  if (!payload.title && !payload.fileUrl && !payload.description) {
    setStatus("Add a title, description, or file URL first.", "error");
    return;
  }

  if (els.submitBtn) els.submitBtn.disabled = true;
  setStatus(`Publishing ${LABELS[payload.type] || "upload"}...`);

  const routes = {
    feed: createFeedPost,
    music: createMusicTrack,
    sports: createSportsUpload,
    gaming: createGamingUpload,
    gallery: createArtwork,
    store: createProduct,
    premium: createPremiumContent,
    podcast: createPodcastEpisode
  };

  const handler = routes[payload.type] || createFeedPost;
  const { error } = await handler(user, payload);

  if (error) {
    console.error("[upload] submit error:", error);
    setStatus(error.message || "Upload failed.", "error");
    if (els.submitBtn) els.submitBtn.disabled = false;
    return;
  }

  setStatus(`${LABELS[payload.type] || "Upload"} published successfully.`, "success");
  els.form?.reset();
  updatePreview();
  await loadRecentUploads();

  if (els.submitBtn) els.submitBtn.disabled = false;
}

async function loadRecentUploads() {
  if (!els.recentList) return;

  const user = await requireUser();
  if (!user?.id) return;

  const results = await Promise.allSettled([
    supabase.from("posts").select("id,title,body,category,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("music_tracks").select("id,title,artist_name,genre,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("sports_uploads").select("id,title,caption,sport_name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("gaming_uploads").select("id,title,caption,game,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("artworks").select("id,title,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("products").select("id,title,name,description,created_at").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(3)
  ]);

  const items = [];

  results.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const { data } = result.value || {};
    const type = ["Feed", "Music", "Sports", "Gaming", "Gallery", "Store"][index];

    (data || []).forEach((item) => {
      items.push({
        type,
        title: item.title || item.name || item.body || "Upload",
        subtitle: item.category || item.genre || item.sport_name || item.game || item.description || type,
        created_at: item.created_at
      });
    });
  });

  items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!items.length) {
    els.recentList.innerHTML = `<div class="status-box">No recent uploads yet.</div>`;
    return;
  }

  els.recentList.innerHTML = items.slice(0, 12).map((item) => `
    <article class="recent-upload-card">
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.subtitle || "")}</small>
    </article>
  `).join("");
}

function clearUpload() {
  els.form?.reset();
  updatePreview();
  setStatus("Upload form cleared.", "success");
}

function bindUpload() {
  els.form?.addEventListener("submit", submitUpload);
  els.clearBtn?.addEventListener("click", clearUpload);

  [
    els.type,
    els.title,
    els.description,
    els.fileUrl,
    els.thumbnailUrl
  ].forEach((el) => {
    el?.addEventListener("input", updatePreview);
    el?.addEventListener("change", updatePreview);
  });
}

async function bootUpload() {
  bindUpload();
  updatePreview();
  await loadRecentUploads();
  setStatus("Upload engine synced.", "success");
}

bootUpload().catch((error) => {
  console.error("[upload] boot error:", error);
  setStatus(error.message || "Could not load upload engine.", "error");
});
