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
  scores: [],
  tournaments: [],
  challenges: [],
  search: "",
  filter: "all"
};

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = el("admin-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const success = el("admin-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("admin-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const error = el("admin-error");
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

function getGameImage(game) {
  return game.cover_url || game.thumbnail_url || IMAGE_FALLBACKS[game.slug] || "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png";
}

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadScores() {
  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[gaming-admin] scores load error:", error);
    return [];
  }

  return data || [];
}

async function loadTournaments() {
  const { data, error } = await supabase
    .from("game_tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("[gaming-admin] tournaments load error:", error);
    return [];
  }

  return data || [];
}

async function loadChallenges() {
  const { data, error } = await supabase
    .from("game_challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("[gaming-admin] challenges load error:", error);
    return [];
  }

  return data || [];
}

function filteredGames() {
  let games = [...state.games];

  if (state.filter === "featured") {
    games = games.filter((game) => game.is_featured);
  } else if (state.filter === "public") {
    games = games.filter((game) => game.visibility === "public");
  }

  if (state.search) {
    const q = state.search.toLowerCase();
    games = games.filter((game) =>
      `${game.title || ""} ${game.slug || ""} ${game.description || ""} ${game.genre || ""} ${game.category || ""}`
        .toLowerCase()
        .includes(q)
    );
  }

  return games;
}

async function setFeaturedGame(gameId) {
  clearMessages();

  const { error: clearError } = await supabase
    .from("games")
    .update({ is_featured: false })
    .neq("id", "");

  if (clearError) {
    showError(clearError.message || "Could not clear old featured game.");
    return;
  }

  const { error } = await supabase
    .from("games")
    .update({ is_featured: true })
    .eq("id", gameId);

  if (error) {
    showError(error.message || "Could not feature game.");
    return;
  }

  showSuccess("Featured game updated.");
  await bootAdmin();
}

async function toggleVisibility(game) {
  clearMessages();

  const nextValue = game.visibility === "public" ? "private" : "public";

  const { error } = await supabase
    .from("games")
    .update({ visibility: nextValue })
    .eq("id", game.id);

  if (error) {
    showError(error.message || "Could not update visibility.");
    return;
  }

  showSuccess(`Visibility changed to ${nextValue}.`);
  await bootAdmin();
}

function renderGames() {
  const list = el("games-list");
  if (!list) return;

  const games = filteredGames();

  if (!games.length) {
    list.innerHTML = `<div class="empty-state"><div>No games found for this filter.</div></div>`;
    return;
  }

  list.innerHTML = games.map((game) => `
    <article class="game-admin-card">
      <div class="game-admin-top">
        <div class="thumb">
          <img src="${escapeHtml(getGameImage(game))}" alt="${escapeHtml(game.title || "Game")}" />
        </div>

        <div class="game-admin-copy">
          <h4>${escapeHtml(safeText(game.title, "Untitled Game"))}</h4>
          <div class="meta">
            ${escapeHtml(safeText(game.description, "No description"))}
          </div>

          <div class="pill-row">
            <div class="pill ${game.is_featured ? "featured" : ""}">${game.is_featured ? "Featured" : "Standard"}</div>
            <div class="pill">${escapeHtml(safeText(game.genre, "Game"))}</div>
            <div class="pill">${escapeHtml(safeText(game.category, "Arcade"))}</div>
            <div class="pill">${escapeHtml(safeText(game.visibility, "public"))}</div>
          </div>

          <div class="card-actions">
            <a class="action-btn" href="${escapeHtml(game.game_url || "#")}">Open Game</a>
            <a class="action-btn" href="/gaming.html">Open Hub</a>
          </div>
        </div>

        <div class="side-actions">
          <button class="btn secondary feature-btn" data-id="${escapeHtml(game.id)}">
            ${game.is_featured ? "Featured" : "Set Featured"}
          </button>

          <button class="action-btn visibility-btn" data-id="${escapeHtml(game.id)}">
            ${game.visibility === "public" ? "Make Private" : "Make Public"}
          </button>
        </div>
      </div>
    </article>
  `).join("");

  list.querySelectorAll(".feature-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const game = state.games.find((item) => item.id === button.dataset.id);
      if (!game || game.is_featured) return;
      await setFeaturedGame(game.id);
    });
  });

  list.querySelectorAll(".visibility-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const game = state.games.find((item) => item.id === button.dataset.id);
      if (!game) return;
      await toggleVisibility(game);
    });
  });
}

function renderScores() {
  const list = el("scores-list");
  if (!list) return;

  if (!state.scores.length) {
    list.innerHTML = `<div class="empty-state"><div>No score rows yet.</div></div>`;
    return;
  }

  list.innerHTML = state.scores.map((score) => `
    <article class="mini-card">
      <h4>${escapeHtml(String(score.score ?? 0))}</h4>
      <div class="meta">
        ${escapeHtml(safeText(score.game_title || score.mode, "Game"))} •
        ${escapeHtml(score.created_at ? new Date(score.created_at).toLocaleDateString() : "Recent")}
      </div>
    </article>
  `).join("");
}

function renderTournaments() {
  const list = el("tournaments-list");
  if (!list) return;

  if (!state.tournaments.length) {
    list.innerHTML = `<div class="empty-state"><div>No tournaments yet.</div></div>`;
    return;
  }

  list.innerHTML = state.tournaments.map((item) => `
    <article class="mini-card">
      <h4>${escapeHtml(safeText(item.title, "Tournament"))}</h4>
      <div class="meta">
        ${escapeHtml(safeText(item.status, "soon"))} •
        ${escapeHtml(safeText(item.description, "Competition lane ready."))}
      </div>
    </article>
  `).join("");
}

function renderChallenges() {
  const list = el("challenges-list");
  if (!list) return;

  if (!state.challenges.length) {
    list.innerHTML = `<div class="empty-state"><div>No challenges yet.</div></div>`;
    return;
  }

  list.innerHTML = state.challenges.map((item) => `
    <article class="mini-card">
      <h4>${escapeHtml(safeText(item.title, "Challenge"))}</h4>
      <div class="meta">
        ${escapeHtml(safeText(item.description, "Pressure lane ready."))}
      </div>
    </article>
  `).join("");
}

function renderStats() {
  el("stat-games").textContent = String(state.games.length);
  el("stat-featured").textContent = String(state.games.filter((game) => game.is_featured).length);
  el("stat-scores").textContent = String(state.scores.length);
  el("stat-tournaments").textContent = String(state.tournaments.length);
  el("stat-challenges").textContent = String(state.challenges.length);
}

function bindUI() {
  const searchInput = el("game-search");
  const filterInput = el("game-filter");

  if (searchInput && searchInput.dataset.bound !== "true") {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim();
      renderGames();
    });
  }

  if (filterInput && filterInput.dataset.bound !== "true") {
    filterInput.dataset.bound = "true";
    filterInput.addEventListener("change", () => {
      state.filter = filterInput.value;
      renderGames();
    });
  }
}

async function bootAdmin() {
  try {
    clearMessages();
    bindUI();

    const [games, scores, tournaments, challenges] = await Promise.all([
      loadGames(),
      loadScores(),
      loadTournaments(),
      loadChallenges()
    ]);

    state.games = games;
    state.scores = scores;
    state.tournaments = tournaments;
    state.challenges = challenges;

    renderGames();
    renderScores();
    renderTournaments();
    renderChallenges();
    renderStats();

    showSuccess(`Gaming admin synced. ${state.games.length} games loaded.`);
  } catch (error) {
    console.error("[gaming-admin] boot error:", error);
    showError(error.message || "Failed to load gaming admin.");
  }
}

document.addEventListener("DOMContentLoaded", bootAdmin);
