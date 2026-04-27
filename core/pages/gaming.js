// =========================
// RICH BIZNESS GAMING — PRO LEAGUE HUB
// /core/pages/gaming.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("gaming-status"),
  gamesGrid: $("games-grid"),
  leaderboardList: $("leaderboard-list"),
  challengesList: $("challenges-list"),
  recentScoresList: $("recent-scores-list"),
  uploadsList: $("gaming-uploads-list"),
  refreshBtn: $("refresh-gaming-btn")
};

const FALLBACK_IMAGE = "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `gaming-status ${type}`;
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

function gameImage(game) {
  return game.thumbnail_url || game.cover_url || FALLBACK_IMAGE;
}

function gameUrl(game) {
  if (game.game_url) return game.game_url;
  if (game.slug === "ride") return "/games/rich-bizness-ride/index.html";
  if (game.slug === "rich-chess") return "/games/chess/index.html";
  return `/games/${encodeURIComponent(game.slug || "")}/index.html`;
}

async function loadGames() {
  if (!els.gamesGrid) return;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[gaming] loadGames:", error);
    els.gamesGrid.innerHTML = `<div class="status-box">Could not load games.</div>`;
    return;
  }

  if (!data?.length) {
    els.gamesGrid.innerHTML = `<div class="status-box">No games loaded yet.</div>`;
    return;
  }

  els.gamesGrid.innerHTML = data.map((game) => `
    <article class="game-card">
      <img src="${escapeHtml(gameImage(game))}" alt="${escapeHtml(game.title || "Game")}" />
      <div class="game-card-body">
        <span class="game-kicker">${escapeHtml(game.category || game.genre || "Arcade")}</span>
        <h3>${escapeHtml(game.title || "Untitled Game")}</h3>
        <p>${escapeHtml(game.description || "Rich Bizness Pro League game.")}</p>
        <div class="game-meta">
          <span>Plays: ${Number(game.play_count || 0).toLocaleString()}</span>
          <span>${game.is_featured ? "Featured" : "Pro League"}</span>
        </div>
        <a class="btn btn-gold" href="${escapeHtml(gameUrl(game))}">Play Now</a>
      </div>
    </article>
  `).join("");
}

async function loadLeaderboard(gameSlug = null) {
  if (!els.leaderboardList) return;

  let query = supabase
    .from("game_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (gameSlug) query = query.eq("game_slug", gameSlug);

  const { data, error } = await query;

  if (error) {
    console.error("[gaming] loadLeaderboard:", error);
    els.leaderboardList.innerHTML = `<div class="status-box">Could not load leaderboard.</div>`;
    return;
  }

  if (!data?.length) {
    els.leaderboardList.innerHTML = `<div class="status-box">No scores yet. Be first.</div>`;
    return;
  }

  els.leaderboardList.innerHTML = data.map((score, index) => `
    <article class="leaderboard-row">
      <strong>#${index + 1}</strong>
      <div>
        <span>${escapeHtml(score.game_slug || "game")}</span>
        <small>${escapeHtml(score.mode || "arcade")} • ${safeDate(score.created_at)}</small>
      </div>
      <b>${Number(score.score || 0).toLocaleString()}</b>
    </article>
  `).join("");
}

async function loadRecentScores() {
  if (!els.recentScoresList) return;

  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gaming] loadRecentScores:", error);
    els.recentScoresList.innerHTML = `<div class="status-box">Could not load recent scores.</div>`;
    return;
  }

  if (!data?.length) {
    els.recentScoresList.innerHTML = `<div class="status-box">No recent scores yet.</div>`;
    return;
  }

  els.recentScoresList.innerHTML = data.map((score) => `
    <article class="score-card">
      <strong>${Number(score.score || 0).toLocaleString()}</strong>
      <span>${escapeHtml(score.game_slug || "game")}</span>
      <small>${safeDate(score.created_at)}</small>
    </article>
  `).join("");
}

async function loadChallenges() {
  if (!els.challengesList) return;

  const { data, error } = await supabase
    .from("game_challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[gaming] loadChallenges:", error);
    els.challengesList.innerHTML = `<div class="status-box">Could not load challenges.</div>`;
    return;
  }

  if (!data?.length) {
    els.challengesList.innerHTML = `<div class="status-box">No Pro League challenges yet.</div>`;
    return;
  }

  els.challengesList.innerHTML = data.map((challenge) => `
    <article class="challenge-card">
      <span>${escapeHtml(challenge.game_slug || "pro-league")}</span>
      <h3>${escapeHtml(challenge.title || "Pro League Challenge")}</h3>
      <p>${escapeHtml(challenge.description || "Compete for the top score.")}</p>
      <div class="game-meta">
        <span>Entry: $${(Number(challenge.entry_fee_cents || 0) / 100).toFixed(2)}</span>
        <span>Prize: $${(Number(challenge.prize_cents || 0) / 100).toFixed(2)}</span>
      </div>
    </article>
  `).join("");
}

async function loadGamingUploads() {
  if (!els.uploadsList) return;

  const { data, error } = await supabase
    .from("gaming_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[gaming] loadGamingUploads:", error);
    els.uploadsList.innerHTML = `<div class="status-box">Could not load gaming uploads.</div>`;
    return;
  }

  if (!data?.length) {
    els.uploadsList.innerHTML = `<div class="status-box">No gaming clips yet.</div>`;
    return;
  }

  els.uploadsList.innerHTML = data.map((clip) => `
    <article class="gaming-upload-card">
      <strong>${escapeHtml(clip.title || "Gaming Clip")}</strong>
      <span>${escapeHtml(clip.game || clip.game_slug || clip.platform || "Rich Bizness Gaming")}</span>
      <small>${Number(clip.views || 0)} views • ${Number(clip.likes || 0)} likes</small>
    </article>
  `).join("");
}

async function refreshGaming() {
  setStatus("Loading Pro League...");
  await Promise.all([
    loadGames(),
    loadLeaderboard(),
    loadRecentScores(),
    loadChallenges(),
    loadGamingUploads()
  ]);
  setStatus("Pro League ready.", "success");
}

function bindGaming() {
  els.refreshBtn?.addEventListener("click", refreshGaming);

  supabase
    .channel("rb-gaming-hub")
    .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, async () => {
      await loadLeaderboard();
      await loadRecentScores();
    })
    .subscribe();
}

async function bootGaming() {
  bindGaming();
  await refreshGaming();
  console.log("🎮 Rich Bizness Pro League Gaming Loaded");
}

bootGaming().catch((error) => {
  console.error("[gaming] boot error:", error);
  setStatus(error.message || "Could not load gaming hub.", "error");
});
