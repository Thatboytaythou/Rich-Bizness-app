import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  window.NEXT_PUBLIC_SUPABASE_URL ||
  window.SUPABASE_URL ||
  "https://ksvdequymkceevocgpdj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showError(message) {
  const node = el("gaming-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const success = el("gaming-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("gaming-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const error = el("gaming-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

const state = {
  games: [],
  featuredGame: null,
  leaderboard: [],
  tournaments: [],
  challenges: [],
  activeTab: "all",
  search: ""
};

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getLeaderboard() {
  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[gaming-client] leaderboard error:", error);
    return [];
  }

  return data || [];
}

async function getTournaments() {
  const { data, error } = await supabase
    .from("game_tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[gaming-client] tournaments error:", error);
    return [];
  }

  return data || [];
}

async function getChallenges() {
  const { data, error } = await supabase
    .from("game_challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[gaming-client] challenges error:", error);
    return [];
  }

  return data || [];
}

async function getProfilesMap(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", uniqueIds);

  if (error) {
    console.error("[gaming-client] profiles lookup error:", error);
    return new Map();
  }

  return new Map((data || []).map((row) => [row.id, row]));
}

function formatPlayerName(profile, fallback = "Player") {
  if (!profile) return fallback;
  return profile.display_name || profile.username || fallback;
}

function ensureFeaturedShell() {
  const section = el("gaming-featured-section");
  if (!section) return null;
  return section.querySelector(".panel-body");
}

function ensureLeaderboardShell() {
  let list = document.querySelector(".leaderboard-list");
  if (list) return list;

  const section = el("gaming-leaderboard-section");
  if (!section) return null;

  const panelBody = section.querySelector(".panel-body");
  if (!panelBody) return null;

  panelBody.innerHTML = `<div class="leaderboard-list"></div>`;
  return section.querySelector(".leaderboard-list");
}

function ensureTournamentShell() {
  let list = document.querySelector(".tournament-list");
  if (list) return list;

  const section = el("gaming-tournaments-section");
  if (!section) return null;

  const panelBody = section.querySelector(".panel-body");
  if (!panelBody) return null;

  panelBody.innerHTML = `<div class="tournament-list"></div>`;
  return section.querySelector(".tournament-list");
}

function ensureChallengeShell() {
  let list = document.querySelector(".challenge-list");
  if (list) return list;

  const section = el("gaming-challenges-section");
  if (!section) return null;

  const panelBody = section.querySelector(".panel-body");
  if (!panelBody) return null;

  panelBody.innerHTML = `<div class="challenge-list"></div>`;
  return section.querySelector(".challenge-list");
}

function renderFeaturedGame() {
  const shell = ensureFeaturedShell();
  if (!shell) return;

  const game = state.featuredGame;

  if (!game) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No featured game found yet. Add rows to public.games to power this section.</div>
      </div>
    `;
    return;
  }

  const title = safeText(game.title, "Featured Game");
  const description = safeText(game.description, "Featured game ready for launch.");
  const image =
    game.cover_url ||
    game.thumbnail_url ||
    "/images/brand/639C7F96-E386-46D4-8929-34AFE3C6EDD3.png";
  const badge = safeText(game.genre || game.category || "Featured", "Featured");
  const href = safeText(game.game_url, "#");

  shell.innerHTML = `
    <div class="featured-game" data-search="${escapeHtml(`${title} ${description} ${badge}`.toLowerCase())}">
      <div class="featured-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      </div>

      <div class="featured-copy">
        <div class="featured-badge">${escapeHtml(title)}</div>
        <h2 class="featured-title">${escapeHtml(description)}</h2>
        <div class="featured-meta">${escapeHtml(badge)} • ${escapeHtml(safeText(game.category, "Game"))}</div>

        <div class="featured-actions">
          <a class="action-btn" href="${escapeHtml(href)}">Play</a>
          <button class="action-btn" id="gaming-submit-score-btn" type="button">Submit Score</button>
          <button class="action-btn" id="gaming-challenge-btn" type="button">Challenge Friends</button>
        </div>
      </div>
    </div>
  `;

  const topPlayBtn = el("gaming-play-btn");
  if (topPlayBtn) {
    topPlayBtn.onclick = () => {
      window.location.href = href;
    };
  }

  el("gaming-submit-score-btn")?.addEventListener("click", () => {
    showSuccess("Money Road Runner score flow is connected through /api/submit-game-score.js.");
  });

  el("gaming-challenge-btn")?.addEventListener("click", () => {
    showSuccess("Challenge system is ready for the next UI pass.");
  });
}

function renderGamesSection() {
  const list = ensureTournamentShell();
  if (!list) return;

  if (!state.games.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>Game catalog will load here.</div>
      </div>
    `;
    return;
  }

  const tournamentMarkup = state.tournaments.map((item) => {
    const status = safeText(item.status, "soon");
    const statusClass =
      String(status).toLowerCase() === "open" || String(status).toLowerCase() === "live"
        ? "status-pill status-live"
        : "status-pill";

    const subtitle = [
      safeText(item.description, "Tournament lane ready."),
      item.start_time ? `Starts ${new Date(item.start_time).toLocaleDateString()}` : null
    ].filter(Boolean).join(" • ");

    return `
      <article class="tournament-item" data-search="${escapeHtml(`${item.title || ""} ${subtitle} ${status}`.toLowerCase())}">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <h4 class="item-title">${escapeHtml(safeText(item.title, "Tournament"))}</h4>
            <p class="item-sub">${escapeHtml(subtitle)}</p>
          </div>
          <div class="${statusClass}">${escapeHtml(status)}</div>
        </div>
      </article>
    `;
  }).join("");

  const gamesMarkup = state.games.map((game) => {
    const title = safeText(game.title, "Untitled Game");
    const description = safeText(game.description, "Game ready for launch.");
    const href = safeText(game.game_url, "#");
    const tag = game.is_featured
      ? "Featured"
      : safeText(game.genre || game.category || "Game", "Game");

    return `
      <article class="tournament-item" data-search="${escapeHtml(`${title} ${description} ${tag}`.toLowerCase())}">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <h4 class="item-title">${escapeHtml(title)}</h4>
            <p class="item-sub">${escapeHtml(description)}</p>
          </div>
          <div class="status-pill ${game.is_featured ? "status-live" : ""}">${escapeHtml(tag)}</div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <a class="action-btn" href="${escapeHtml(href)}">Play</a>
        </div>
      </article>
    `;
  }).join("");

  list.innerHTML = tournamentMarkup + gamesMarkup;
}

function renderChallenges() {
  const list = ensureChallengeShell();
  if (!list) return;

  if (!state.challenges.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>Challenges will load here.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = state.challenges.map((item) => {
    const subtitle = [
      safeText(item.description, "Challenge lane ready."),
      item.target_score ? `Target ${item.target_score}` : null
    ].filter(Boolean).join(" • ");

    return `
      <article class="challenge-item" data-search="${escapeHtml(`${item.title || ""} ${subtitle}`.toLowerCase())}">
        <h4 class="item-title">${escapeHtml(safeText(item.title, "Challenge"))}</h4>
        <p class="item-sub">${escapeHtml(subtitle)}</p>
      </article>
    `;
  }).join("");
}

function renderLeaderboard() {
  const list = ensureLeaderboardShell();
  if (!list) return;

  if (!state.leaderboard.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>Leaderboard scores will load here.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = state.leaderboard.map((entry, index) => {
    const playerName = formatPlayerName(entry.profile, "Player");
    const subtitle = [
      safeText(entry.game_title || entry.mode || "Gaming score"),
      entry.created_at ? new Date(entry.created_at).toLocaleDateString() : null
    ].filter(Boolean).join(" • ");

    return `
      <article class="leaderboard-item" data-search="${escapeHtml(`${playerName} ${subtitle} ${entry.score}`.toLowerCase())}">
        <div class="rank-pill">${index + 1}</div>
        <div>
          <h4 class="item-title">${escapeHtml(playerName)}</h4>
          <p class="item-sub">${escapeHtml(subtitle)}</p>
        </div>
        <div class="score-pill">${escapeHtml(String(entry.score ?? 0))}</div>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const statsCards = document.querySelectorAll(".stat-card");
  if (!statsCards.length) return;

  const topScore = state.leaderboard[0]?.score ? Number(state.leaderboard[0].score) : 0;
  const values = [
    state.games.length,
    state.tournaments.length || state.games.length,
    state.challenges.length,
    topScore ? `${Math.round(topScore / 1000)}K` : "0"
  ];

  statsCards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    if (strong && values[index] !== undefined) {
      strong.textContent = String(values[index]);
    }
  });
}

function applySearchToVisibleContent() {
  const query = state.search.trim().toLowerCase();

  document.querySelectorAll("[data-search]").forEach((node) => {
    const haystack = String(node.getAttribute("data-search") || "").toLowerCase();
    node.style.display = !query || haystack.includes(query) ? "" : "none";
  });
}

function updateVisibility() {
  const sections = {
    featured: el("gaming-featured-section"),
    tournaments: el("gaming-tournaments-section"),
    leaderboard: el("gaming-leaderboard-section"),
    challenges: el("gaming-challenges-section")
  };

  Object.entries(sections).forEach(([key, section]) => {
    if (!section) return;
    const matchesTab = state.activeTab === "all" || state.activeTab === key;
    section.style.display = matchesTab ? "" : "none";
  });

  applySearchToVisibleContent();
}

function bindUI() {
  const searchInput = el("gaming-search");
  if (searchInput && searchInput.dataset.bound !== "true") {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim();
      updateVisibility();
    });
  }

  document.querySelectorAll(".tab-btn").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      state.activeTab = button.getAttribute("data-tab") || "all";
      document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      updateVisibility();
    });
  });
}

async function bootGamingClient() {
  try {
    clearMessages();
    bindUI();

    const [games, leaderboardRaw, tournaments, challenges] = await Promise.all([
      getGames(),
      getLeaderboard(),
      getTournaments(),
      getChallenges()
    ]);

    const profileIds = leaderboardRaw.map((entry) => entry.user_id || entry.player_id || entry.creator_id);
    const profilesMap = await getProfilesMap(profileIds);

    state.games = games || [];
    state.featuredGame =
      state.games.find((game) => game.is_featured) ||
      state.games.find((game) => game.slug === "money-road-runner") ||
      state.games[0] ||
      null;

    state.leaderboard = leaderboardRaw.map((entry) => ({
      ...entry,
      profile: profilesMap.get(entry.user_id || entry.player_id || entry.creator_id) || null
    }));

    state.tournaments = tournaments || [];
    state.challenges = challenges || [];

    renderFeaturedGame();
    renderGamesSection();
    renderChallenges();
    renderLeaderboard();
    renderStats();
    updateVisibility();

    if (!state.games.length && !state.leaderboard.length && !state.tournaments.length && !state.challenges.length) {
      showError("Gaming section is live, but no real data was found yet.");
      return;
    }

    showSuccess(`Gaming locked in. ${state.games.length} game${state.games.length === 1 ? "" : "s"} loaded.`);
  } catch (error) {
    console.error("[gaming-client] boot error:", error);
    showError(error.message || "Failed to load gaming page.");
  }
}

document.addEventListener("DOMContentLoaded", bootGamingClient);
