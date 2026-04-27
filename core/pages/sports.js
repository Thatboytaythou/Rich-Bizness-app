// =========================
// RICH BIZNESS SPORTS — FINAL SYNCED ENGINE
// /core/pages/sports.js
// Source:
// sports_uploads, sports_posts, sports_profiles,
// sports_picks, sports_pick_results, sports_brackets
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("sports-status"),
  refreshBtn: $("refresh-sports-btn"),

  uploadsGrid: $("sports-uploads-grid"),
  postsList: $("sports-posts-list"),
  picksList: $("sports-picks-list"),
  profilesList: $("sports-profiles-list"),
  bracketsList: $("sports-brackets-list")
};

const FALLBACK_IMAGE = "/images/83FAD785-46D7-4EB3-8A3F-1E4A8BB78C90.png";

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `sports-status ${type}`;
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

function imageForUpload(item) {
  return item.thumbnail_url || item.image_url || item.cover_url || FALLBACK_IMAGE;
}

function videoForUpload(item) {
  return item.file_url || item.video_url || item.media_url || "";
}

function uploadTitle(item) {
  return item.title || item.caption || item.sport_name || "Sports Highlight";
}

function uploadSubtitle(item) {
  const parts = [
    item.sport_name,
    item.team_name,
    item.athlete_name,
    item.position_name
  ].filter(Boolean);

  return parts.length ? parts.join(" • ") : "Rich Bizness Sports";
}

async function getUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

async function loadSportsUploads() {
  if (!els.uploadsGrid) return;

  const { data, error } = await supabase
    .from("sports_uploads")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[sports] uploads:", error);
    els.uploadsGrid.innerHTML = `<div class="status-box">Could not load sports uploads.</div>`;
    return;
  }

  if (!data?.length) {
    els.uploadsGrid.innerHTML = `<div class="status-box">No sports uploads yet.</div>`;
    return;
  }

  els.uploadsGrid.innerHTML = data.map((item) => {
    const videoUrl = videoForUpload(item);

    return `
      <article class="sports-card">
        <div class="sports-media">
          ${
            videoUrl
              ? `<video src="${escapeHtml(videoUrl)}" poster="${escapeHtml(imageForUpload(item))}" controls preload="metadata"></video>`
              : `<img src="${escapeHtml(imageForUpload(item))}" alt="${escapeHtml(uploadTitle(item))}" />`
          }
        </div>

        <div class="sports-card-body">
          <span class="sports-tag">${escapeHtml(item.clip_type || item.content_type || "Highlight")}</span>
          <h3>${escapeHtml(uploadTitle(item))}</h3>
          <p>${escapeHtml(item.caption || item.description || uploadSubtitle(item))}</p>

          <div class="sports-meta">
            <span>${escapeHtml(uploadSubtitle(item))}</span>
            <span>${Number(item.views || 0).toLocaleString()} views</span>
            <span>${Number(item.likes || 0).toLocaleString()} likes</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadSportsPosts() {
  if (!els.postsList) return;

  const { data, error } = await supabase
    .from("sports_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("[sports] posts:", error);
    els.postsList.innerHTML = `<div class="status-box">Could not load sports posts.</div>`;
    return;
  }

  if (!data?.length) {
    els.postsList.innerHTML = `<div class="status-box">No sports posts yet.</div>`;
    return;
  }

  els.postsList.innerHTML = data.map((post) => `
    <article class="sports-list-card">
      <span class="sports-tag">${escapeHtml(post.category || "Sports Post")}</span>
      <h3>${escapeHtml(post.title || "Sports Update")}</h3>
      <p>${escapeHtml(post.description || post.caption || "Rich Bizness sports post.")}</p>
      <div class="sports-meta">
        <span>${safeDate(post.created_at)}</span>
        ${post.video_url ? `<a href="${escapeHtml(post.video_url)}" target="_blank" rel="noopener">Open Video</a>` : ""}
      </div>
    </article>
  `).join("");
}

async function loadSportsPicks() {
  if (!els.picksList) return;

  const { data, error } = await supabase
    .from("sports_picks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("[sports] picks:", error);
    els.picksList.innerHTML = `<div class="status-box">Could not load sports picks.</div>`;
    return;
  }

  if (!data?.length) {
    els.picksList.innerHTML = `<div class="status-box">No sports picks yet.</div>`;
    return;
  }

  els.picksList.innerHTML = data.map((pick) => `
    <article class="sports-list-card">
      <span class="sports-tag">${escapeHtml(pick.sport || "Pick")}</span>
      <h3>${escapeHtml(pick.title || `${pick.team_name || "Team"} vs ${pick.opponent || "Opponent"}`)}</h3>
      <p>${escapeHtml(pick.prediction || "Prediction pending.")}</p>

      <div class="sports-meta">
        <span>Team: ${escapeHtml(pick.team_name || "—")}</span>
        <span>Opponent: ${escapeHtml(pick.opponent || "—")}</span>
        <span>Confidence: ${escapeHtml(pick.confidence || "—")}</span>
        <span>Result: ${escapeHtml(pick.result || "pending")}</span>
        <span>Points: ${Number(pick.points || 0)}</span>
      </div>
    </article>
  `).join("");
}

async function loadSportsProfiles() {
  if (!els.profilesList) return;

  const { data, error } = await supabase
    .from("sports_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[sports] profiles:", error);
    els.profilesList.innerHTML = `<div class="status-box">Could not load sports profiles.</div>`;
    return;
  }

  if (!data?.length) {
    els.profilesList.innerHTML = `<div class="status-box">No fan profiles yet.</div>`;
    return;
  }

  els.profilesList.innerHTML = data.map((profile) => `
    <article class="sports-list-card">
      <span class="sports-tag">${escapeHtml(profile.favorite_sport || "Fan")}</span>
      <h3>${escapeHtml(profile.fan_tag || "Sports Fan")}</h3>
      <p>${escapeHtml(profile.bio || "Rich Bizness sports profile.")}</p>

      <div class="sports-meta">
        <span>Team: ${escapeHtml(profile.favorite_team || "—")}</span>
        <span>${safeDate(profile.created_at)}</span>
      </div>
    </article>
  `).join("");
}

async function loadSportsBrackets() {
  if (!els.bracketsList) return;

  const { data, error } = await supabase
    .from("sports_brackets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[sports] brackets:", error);
    els.bracketsList.innerHTML = `<div class="status-box">Could not load sports brackets.</div>`;
    return;
  }

  if (!data?.length) {
    els.bracketsList.innerHTML = `<div class="status-box">No brackets yet.</div>`;
    return;
  }

  els.bracketsList.innerHTML = data.map((bracket) => `
    <article class="sports-list-card">
      <span class="sports-tag">${escapeHtml(bracket.sport || "Bracket")}</span>
      <h3>${escapeHtml(bracket.title || "Sports Bracket")}</h3>
      <p>Status: ${escapeHtml(bracket.status || "open")}</p>

      <div class="sports-meta">
        <span>${safeDate(bracket.created_at)}</span>
      </div>
    </article>
  `).join("");
}

async function refreshSports() {
  setStatus("Loading sports engine...");

  await Promise.all([
    loadSportsUploads(),
    loadSportsPosts(),
    loadSportsPicks(),
    loadSportsProfiles(),
    loadSportsBrackets()
  ]);

  setStatus("Sports engine synced.", "success");
}

function bindSports() {
  els.refreshBtn?.addEventListener("click", refreshSports);

  supabase
    .channel("rb-sports-engine")
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_uploads" }, loadSportsUploads)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_posts" }, loadSportsPosts)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_picks" }, loadSportsPicks)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_profiles" }, loadSportsProfiles)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_brackets" }, loadSportsBrackets)
    .subscribe();
}

async function bootSports() {
  bindSports();
  await refreshSports();
  console.log("🏆 Rich Bizness Sports Engine Loaded");
}

bootSports().catch((error) => {
  console.error("[sports] boot error:", error);
  setStatus(error.message || "Could not load sports engine.", "error");
});
