import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const IMAGE_FALLBACKS = {
  "money-road-runner": "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png",
  "studio-showdown": "/images/D8F60174-7E0C-44AF-A4AB-496AB7ADEC52.png",
  "smoke-city-hustle": "/images/C54535CD-E2B2-481B-81C8-4CFA81CC2ACD.png",
  "rich-chess": "/images/brand/9B78765E-1848-4173-8FD4-11B4C908104D.png"
};

const state = {
  games: [],
  featuredGame: null,
  leaderboard: [],
  tournaments: [],
  challenges: [],
  activeTab: "all",
  search: ""
};

function el(id) {
  return document.getElementById(id);
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

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("visibility", "public")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadLeaderboard() {
  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[gaming] leaderboard load error:", error);
    return [];
  }

  return data || [];
}

async function loadTournaments() {
  const { data, error } = await supabase
    .from("game_tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[gaming] tournaments load error:", error);
    return [];
  }

  return data || [];
}

async function loadChallenges() {
  const { data, error } = await supabase
    .from("game_challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[gaming] challenges load error:", error);
    return [];
  }

  return data || [];
}

async function getProfilesMap(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  if (error) {
    console.error("[gaming] profiles lookup error:", error);
    return new Map();
  }

  return new Map((data || []).map((row) => [row.id, row]));
}

function formatPlayerName(profile, fallback = "Player") {
  if (!profile) return fallback;
  return profile.display_name || profile.username || fallback;
}

function getGameImage(game) {
  return game.cover_url || game.thumbnail_url || IMAGE_FALLBACKS[game.slug] || "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png";
}

function renderFeaturedGame() {
  const shell = el("featured-shell");
  if (!shell) return;

  const game = state.featuredGame;
  if (!game) {
    shell.className = "empty-state";
    shell.innerHTML = "<div>No featured game found yet.</div>";
    return;
  }

  const image = getGameImage(game);
  shell.className = "";
  shell.innerHTML = `
    <div class="featured-game" data-search="${escapeHtml(`${game.title} ${game.description} ${game.genre}`.toLowerCase())}">
      <div class="featured-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(game.title)}" />
      </div>

      <div class="featured-copy">
        <div class="featured-badge">${escapeHtml(game.title)}</div>
        <h2 class="featured-title">${escapeHtml(safeText(game.description, "Featured game ready."))}</h2>
        <div class="featured-meta">
          ${escapeHtml(safeText(game.genre, "Game"))} •
          ${escapeHtml(safeText(game.category, "Arcade"))} •
          ${Number(game.play_count || 0)} plays
        </div>

        <div class="featured-actions">
          <a class="action-btn" href="${escapeHtml(game.game_url || "#")}">Play</a>
          <a class="action-btn" href="/gaming.html">Arcade Hub</a>
        </div>
      </div>
    </div>
  `;

  const playBtn = el("gaming-play-btn");
  if (playBtn) {
    playBtn.onclick = () => {
      window.location.href = game.game_url || "/gaming.html";
    };
  }
}

function renderGameGrid() {
  const grid = el("game-grid");
  if (!grid) return;

  if (!state.games.length) {
    grid.innerHTML = `<div class="empty-state"><div>No games found yet.</div></div>`;
    return;
  }

  grid.innerHTML = state.games.slice(0, 4).map((game) => {
    const image = getGameImage(game);
    const tag = game.is_featured ? "Featured" : safeText(game.genre, "Game");

    return `
      <article
        class="game-card"
        style="--card-bg:url('${image}')"
        data-search="${escapeHtml(`${game.title} ${game.description} ${tag}`.toLowerCase())}"
      >
        <div class="game-card-copy">
          <div class="game-card-top">
            <h4>${escapeHtml(game.title)}</h4>
            <div class="status-pill">${escapeHtml(tag)}</div>
          </div>

          <p>${escapeHtml(safeText(game.description, "Game ready for launch."))}</p>

          <div class="featured-meta">
            ${escapeHtml(safeText(game.category, "Arcade"))} • ${Number(game.play_count || 0)} plays
          </div>

          <div class="game-card-actions">
            <a class="btn" href="${escapeHtml(game.game_url || "#")}">Play</a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderLeaderboard() {
  const list = el("leaderboard-list");
  if (!list) return;

  if (!state.leaderboard.length) {
    list.innerHTML = `<div class="empty-state"><div>No scores yet.</div></div>`;
    return;
  }

  list.innerHTML = state.leaderboard.map((entry, index) => {
    const player = formatPlayerName(entry.profile, "Player");
    const subtitle = [
      safeText(entry.game_title || entry.mode || "Game"),
      entry.created_at ? new Date(entry.created_at).toLocaleDateString() : null
    ].filter(Boolean).join(" • ");

    return `
      <article class="leaderboard-item" data-search="${escapeHtml(`${player} ${subtitle} ${entry.score}`.toLowerCase())}">
        <div class="rank-pill">${index + 1}</div>
        <div>
          <h4 class="item-title">${escapeHtml(player)}</h4>
          <p class="item-sub">${escapeHtml(subtitle)}</p>
        </div>
        <div class="score-pill">${escapeHtml(String(entry.score ?? 0))}</div>
      </article>
    `;
  }).join("");
}

function renderTournaments() {
  const list = el("tournament-list");
  if (!list) return;

  if (!state.tournaments.length) {
    list.innerHTML = `<div class="empty-state"><div>No tournaments yet.</div></div>`;
    return;
  }

  list.innerHTML = state.tournaments.map((item) => {
    const status = safeText(item.status, "soon");
    const subtitle = [
      safeText(item.description, "Tournament lane ready."),
      item.start_time ? `Starts ${new Date(item.start_time).toLocaleDateString()}` : null
    ].filter(Boolean).join(" • ");

    return `
      <article class="tournament-item" data-search="${escapeHtml(`${item.title || ""} ${subtitle} ${status}`.toLowerCase())}">
        <h4 class="item-title">${escapeHtml(safeText(item.title, "Tournament"))}</h4>
        <p class="item-sub">${escapeHtml(subtitle)}</p>
        <div class="admin-actions">
          <div class="status-pill">${escapeHtml(status)}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderChallenges() {
  const list = el("challenge-list");
  if (!list) return;

  if (!state.challenges.length) {
    list.innerHTML = `<div class="empty-state"><div>No challenges yet.</div></div>`;
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

function renderAdmin() {
  const list = el("admin-list");
  if (!list) return;

  const featured = state.featuredGame?.title || "None";
  const totalGames = state.games.length;
  const totalScores = state.leaderboard.length;
  const totalTournaments = state.tournaments.length;
  const totalChallenges = state.challenges.length;

  list.innerHTML = `
    <article class="admin-item">
      <h4 class="item-title">Current Featured Game</h4>
      <p class="item-sub">${escapeHtml(featured)}</p>
      <div class="admin-actions">
        <a class="action-btn" href="/upload-gaming.html">Upload Game</a>
        <a class="action-btn" href="/games/chess/index.html">Open Chess</a>
      </div>
    </article>

    <article class="admin-item">
      <h4 class="item-title">System Snapshot</h4>
      <p class="item-sub">
        ${totalGames} games • ${totalScores} leaderboard rows •
        ${totalTournaments} tournaments • ${totalChallenges} challenges
      </p>
    </article>

    <article class="admin-item">
      <h4 class="item-title">Sync Status</h4>
      <p class="item-sub">
        Games, leaderboard, tournaments, and challenges are reading from the same gaming ecosystem.
      </p>
    </article>
  `;
}

function renderStats() {
  el("stat-games").textContent = String(state.games.length);
  el("stat-plays").textContent = String(
    state.games.reduce((sum, game) => sum + Number(game.play_count || 0), 0)
  );
  el("stat-tournaments").textContent = String(state.tournaments.length);
  el("stat-challenges").textContent = String(state.challenges.length);
  el("stat-top-score").textContent = String(state.leaderboard[0]?.score ?? 0);
}

function updateTabVisibility() {
  const sections = {
    games: [el("games-section"), el("game-grid-section")],
    leaderboard: [el("leaderboard-section")],
    tournaments: [el("tournaments-section")],
    challenges: [el("challenges-section")],
    admin: [el("admin-section")]
  };

  Object.entries(sections).forEach(([key, nodes]) => {
    const show = state.activeTab === "all" || state.activeTab === key;
    nodes.forEach((node) => {
      if (node) node.style.display = show ? "" : "none";
    });
  });

  applySearch();
}

function applySearch() {
  const query = state.search.trim().toLowerCase();

  document.querySelectorAll("[data-search]").forEach((node) => {
    const haystack = String(node.getAttribute("data-search") || "").toLowerCase();
    node.style.display = !query || haystack.includes(query) ? "" : "none";
  });
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

async function bootGaming() {
  try {
    clearMessages();
    bindUI();

    const [games, leaderboardRaw, tournaments, challenges] = await Promise.all([
      loadGames(),
      loadLeaderboard(),
      loadTournaments(),
      loadChallenges()
    ]);

    const profileIds = leaderboardRaw.map((entry) => entry.user_id || entry.player_id || entry.creator_id);
    const profilesMap = await getProfilesMap(profileIds);

    state.games = games;
    state.featuredGame =
      games.find((game) => game.is_featured) ||
      games.find((game) => game.slug === "money-road-runner") ||
      games[0] ||
      null;

    state.leaderboard = leaderboardRaw.map((entry) => ({
      ...entry,
      profile: profilesMap.get(entry.user_id || entry.player_id || entry.creator_id) || null
    }));

    state.tournaments = tournaments;
    state.challenges = challenges;

    renderFeaturedGame();
    renderGameGrid();
    renderLeaderboard();
    renderTournaments();
    renderChallenges();
    renderAdmin();
    renderStats();
    updateTabVisibility();

    if (!state.games.length) {
      showError("Gaming ecosystem page loaded, but no public games were returned.");
      return;
    }

    showSuccess(`Gaming ecosystem synced. ${state.games.length} games loaded.`);
  } catch (error) {
    console.error("[gaming] boot error:", error);
    showError(error.message || "Failed to load gaming ecosystem.");
  }
}

document.addEventListener("DOMContentLoaded", bootGaming);
