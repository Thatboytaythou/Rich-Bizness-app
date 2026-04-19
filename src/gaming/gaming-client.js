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
  recentRuns: [],
  activeTab: "all",
  search: ""
};

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getLeaderboard() {
  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gaming-client] leaderboard error:", error);
    return [];
  }

  return data || [];
}

async function getRecentRuns() {
  const { data, error } = await supabase
    .from("arcade_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gaming-client] recent runs error:", error);
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

function renderFeaturedGame() {
  const shell = document.querySelector("#gaming-featured-section .panel-body");
  if (!shell) return;

  const game = state.featuredGame;
  if (!game) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No featured game found yet.</div>
      </div>
    `;
    return;
  }

  const image =
    game.cover_url ||
    game.thumbnail_url ||
    "/images/brand/639C7F96-E386-46D4-8929-34AFE3C6EDD3.png";

  shell.innerHTML = `
    <div class="featured-game" data-search="${escapeHtml(`${game.title} ${game.description} ${game.genre}`.toLowerCase())}">
      <div class="featured-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(game.title)}" />
      </div>

      <div class="featured-copy">
        <div class="featured-badge">${escapeHtml(game.title)}</div>
        <h2 class="featured-title">${escapeHtml(safeText(game.description, "Featured arcade game"))}</h2>
        <div class="featured-meta">
          ${escapeHtml(safeText(game.genre, "Game"))} •
          ${escapeHtml(safeText(game.category, "Arcade"))} •
          ${Number(game.play_count || 0)} plays
        </div>

        <div class="featured-actions">
          <a class="action-btn" href="${escapeHtml(game.game_url || "#")}">Play</a>
          <button class="action-btn" id="featured-score-info" type="button">Score Flow</button>
        </div>
      </div>
    </div>
  `;

  const heroBtn = el("gaming-play-btn");
  if (heroBtn) {
    heroBtn.onclick = () => {
      window.location.href = game.game_url || "#";
    };
  }

  el("featured-score-info")?.addEventListener("click", () => {
    showSuccess("Arcade score saving is wired through /api/submit-game-score.js.");
  });
}

function renderGamesRail() {
  const shell = document.querySelector("#gaming-games-section .panel-body");
  if (!shell) return;

  if (!state.games.length) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No arcade games found yet.</div>
      </div>
    `;
    return;
  }

  shell.innerHTML = `
    <div class="arcade-grid">
      ${state.games.map((game) => {
        const image =
          game.cover_url ||
          game.thumbnail_url ||
          "/images/brand/639C7F96-E386-46D4-8929-34AFE3C6EDD3.png";

        return `
          <article class="arcade-card" data-search="${escapeHtml(`${game.title} ${game.description} ${game.genre}`.toLowerCase())}">
            <div class="arcade-card-media">
              <img src="${escapeHtml(image)}" alt="${escapeHtml(game.title)}" />
            </div>
            <div class="arcade-card-body">
              <div class="arcade-card-top">
                <h4>${escapeHtml(game.title)}</h4>
                <span class="status-pill ${game.is_featured ? "status-live" : ""}">
                  ${game.is_featured ? "Featured" : escapeHtml(safeText(game.genre, "Game"))}
                </span>
              </div>
              <p>${escapeHtml(safeText(game.description, "Arcade game ready."))}</p>
              <div class="arcade-card-meta">
                <span>${escapeHtml(safeText(game.category, "Arcade"))}</span>
                <span>${Number(game.play_count || 0)} plays</span>
              </div>
              <div class="arcade-card-actions">
                <a class="action-btn" href="${escapeHtml(game.game_url || "#")}">Play</a>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderLeaderboard() {
  const shell = document.querySelector("#gaming-leaderboard-section .panel-body");
  if (!shell) return;

  if (!state.leaderboard.length) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No leaderboard scores yet.</div>
      </div>
    `;
    return;
  }

  shell.innerHTML = `
    <div class="leaderboard-list">
      ${state.leaderboard.map((entry, index) => {
        const playerName = formatPlayerName(entry.profile, "Player");
        const subtitle = [
          safeText(entry.game_title || entry.mode || "Arcade"),
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
      }).join("")}
    </div>
  `;
}

function renderRecentRuns() {
  const shell = document.querySelector("#gaming-runs-section .panel-body");
  if (!shell) return;

  if (!state.recentRuns.length) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No recent runs yet.</div>
      </div>
    `;
    return;
  }

  shell.innerHTML = `
    <div class="challenge-list">
      ${state.recentRuns.map((run) => {
        const playerName = formatPlayerName(run.profile, "Player");
        return `
          <article class="challenge-item" data-search="${escapeHtml(`${run.game_slug} ${playerName} ${run.score}`.toLowerCase())}">
            <h4 class="item-title">${escapeHtml(run.game_slug)}</h4>
            <p class="item-sub">
              ${escapeHtml(playerName)} •
              Score ${escapeHtml(String(run.score ?? 0))} •
              ${escapeHtml(new Date(run.created_at).toLocaleDateString())}
            </p>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderStats() {
  const cards = document.querySelectorAll(".stat-card");
  if (!cards.length) return;

  const topScore = state.leaderboard[0]?.score ? Number(state.leaderboard[0].score) : 0;
  const totalPlays = state.games.reduce((sum, game) => sum + Number(game.play_count || 0), 0);

  const values = [
    state.games.length,
    totalPlays,
    state.recentRuns.length,
    topScore ? `${Math.round(topScore / 1000)}K` : "0"
  ];

  cards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    if (strong && values[index] !== undefined) strong.textContent = String(values[index]);
  });
}

function applySearch() {
  const query = state.search.trim().toLowerCase();
  document.querySelectorAll("[data-search]").forEach((node) => {
    const haystack = String(node.getAttribute("data-search") || "").toLowerCase();
    node.style.display = !query || haystack.includes(query) ? "" : "none";
  });
}

function updateTabVisibility() {
  const sections = {
    featured: el("gaming-featured-section"),
    games: el("gaming-games-section"),
    leaderboard: el("gaming-leaderboard-section"),
    runs: el("gaming-runs-section")
  };

  Object.entries(sections).forEach(([key, section]) => {
    if (!section) return;
    const visible = state.activeTab === "all" || state.activeTab === key;
    section.style.display = visible ? "" : "none";
  });

  applySearch();
}

function bindUI() {
  const searchInput = el("gaming-search");
  if (searchInput && searchInput.dataset.bound !== "true") {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim();
      applySearch();
    });
  }

  document.querySelectorAll(".tab-btn").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      state.activeTab = button.getAttribute("data-tab") || "all";
      document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      updateTabVisibility();
    });
  });
}

async function bootGamingClient() {
  try {
    clearMessages();
    bindUI();

    const [games, leaderboardRaw, recentRunsRaw] = await Promise.all([
      getGames(),
      getLeaderboard(),
      getRecentRuns()
    ]);

    const userIds = [
      ...leaderboardRaw.map((entry) => entry.user_id || entry.player_id || entry.creator_id),
      ...recentRunsRaw.map((entry) => entry.user_id)
    ];

    const profilesMap = await getProfilesMap(userIds);

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

    state.recentRuns = recentRunsRaw.map((entry) => ({
      ...entry,
      profile: profilesMap.get(entry.user_id) || null
    }));

    renderFeaturedGame();
    renderGamesRail();
    renderLeaderboard();
    renderRecentRuns();
    renderStats();
    updateTabVisibility();

    if (!state.games.length) {
      showError("Arcade page loaded, but no games were returned from public.games.");
      return;
    }

    showSuccess(`Arcade locked in. ${state.games.length} games loaded.`);
  } catch (error) {
    console.error("[gaming-client] boot error:", error);
    showError(error.message || "Failed to load arcade page.");
  }
}

document.addEventListener("DOMContentLoaded", bootGamingClient);
