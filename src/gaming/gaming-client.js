import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

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
  featuredGame: null,
  leaderboard: [],
  tournaments: [],
  challenges: [],
  activeTab: "all",
  search: ""
};

async function getProfilesMap(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", uniqueIds);

  if (error) {
    console.error("[gaming-client] profiles lookup error:", error);
    return new Map();
  }

  return new Map((data || []).map((row) => [row.id, row]));
}

async function getFeaturedGame() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[gaming-client] featured game error:", error);
    return null;
  }

  return data || null;
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

function formatPlayerName(profile, fallback = "Player") {
  if (!profile) return fallback;
  return profile.display_name || profile.username || fallback;
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

function ensureFeaturedShell() {
  const section = el("gaming-featured-section");
  if (!section) return null;
  return section.querySelector(".panel-body");
}

function renderFeaturedGame() {
  const shell = ensureFeaturedShell();
  if (!shell) return;

  const game = state.featuredGame;

  if (!game) {
    shell.innerHTML = `
      <div class="empty-state">
        <div>No featured game found yet. Add one to your gaming system to power this section.</div>
      </div>
    `;
    return;
  }

  const title = safeText(game.title, "Featured Game");
  const description = safeText(
    game.description,
    "Featured game ready for score battles, tournaments, and live creator competition."
  );
  const image = game.cover_url || game.thumbnail_url || "/images/brand/logo-music-label.png";
  const badge = safeText(game.genre || game.category || "Featured");

  shell.innerHTML = `
    <div class="featured-game">
      <div class="featured-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      </div>

      <div class="featured-copy">
        <div class="featured-badge">${escapeHtml(badge)}</div>
        <h2 class="featured-title">${escapeHtml(title)}</h2>
        <div class="featured-meta">${escapeHtml(description)}</div>

        <div class="featured-actions">
          <a class="action-btn" href="${escapeHtml(game.game_url || "#")}">Play</a>
          <button class="action-btn" id="gaming-submit-score-btn" type="button">Submit Score</button>
          <button class="action-btn" id="gaming-challenge-btn" type="button">Challenge Friends</button>
        </div>
      </div>
    </div>
  `;

  el("gaming-submit-score-btn")?.addEventListener("click", () => {
    showSuccess("Featured game score flow connected. Next step is a full submit-score UI.");
  });

  el("gaming-challenge-btn")?.addEventListener("click", () => {
    showSuccess("Challenge flow connected. Next step is a real challenge creation modal.");
  });

  el("gaming-play-btn")?.addEventListener("click", () => {
    if (game.game_url) {
      window.location.href = game.game_url;
    } else {
      showSuccess("Featured game is selected. Add a game_url to launch directly.");
    }
  });
}

function renderLeaderboard() {
  const list = ensureLeaderboardShell();
  if (!list) return;

  if (!state.leaderboard.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>No leaderboard scores found yet.</div>
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
      <article class="leaderboard-item">
        <div class="rank-pill">${index + 1}</div>
        <div>
          <h4 class="item-title">${escapeHtml(playerName)}</h4>
          <p class="item-sub">${escapeHtml(subtitle || "Score submission")}</p>
        </div>
        <div class="score-pill">${escapeHtml(String(entry.score ?? 0))}</div>
      </article>
    `;
  }).join("");
}

function renderTournaments() {
  const list = ensureTournamentShell();
  if (!list) return;

  if (!state.tournaments.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>No tournaments found yet.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = state.tournaments.map((item) => {
    const status = safeText(item.status, "soon");
    const statusClass = String(status).toLowerCase() === "open" || String(status).toLowerCase() === "live"
      ? "status-pill status-live"
      : "status-pill";

    const subtitleParts = [
      safeText(item.description, "Tournament lane ready for competition."),
      item.start_time ? `Starts ${new Date(item.start_time).toLocaleDateString()}` : null
    ].filter(Boolean);

    return `
      <article class="tournament-item">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <h4 class="item-title">${escapeHtml(safeText(item.title, "Tournament"))}</h4>
            <p class="item-sub">${escapeHtml(subtitleParts.join(" • "))}</p>
          </div>
          <div class="${statusClass}">${escapeHtml(status)}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderChallenges() {
  const list = ensureChallengeShell();
  if (!list) return;

  if (!state.challenges.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div>No challenges found yet.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = state.challenges.map((item) => {
    const subtitleParts = [
      safeText(item.description, "Challenge lane ready."),
      item.target_score ? `Target ${item.target_score}` : null
    ].filter(Boolean);

    return `
      <article class="challenge-item">
        <h4 class="item-title">${escapeHtml(safeText(item.title, "Challenge"))}</h4>
        <p class="item-sub">${escapeHtml(subtitleParts.join(" • "))}</p>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const statsCards = document.querySelectorAll(".stat-card");
  if (!statsCards.length) return;

  const values = [
    state.featuredGame ? 1 : 0,
    state.tournaments.length,
    state.challenges.length,
    state.leaderboard[0]?.score ? `${Math.round(Number(state.leaderboard[0].score) / 1000)}K` : "0"
  ];

  statsCards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    if (strong && values[index] !== undefined) {
      strong.textContent = String(values[index]);
    }
  });
}

function updateVisibility() {
  const sections = {
    featured: el("gaming-featured-section"),
    tournaments: el("gaming-tournaments-section"),
    leaderboard: el("gaming-leaderboard-section"),
    challenges: el("gaming-challenges-section")
  };

  const query = state.search.trim().toLowerCase();

  Object.entries(sections).forEach(([key, section]) => {
    if (!section) return;
    const matchesTab = state.activeTab === "all" || state.activeTab === key;
    const matchesSearch = !query || section.textContent.toLowerCase().includes(query);
    section.style.display = matchesTab && matchesSearch ? "" : "none";
  });
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

    const [featuredGame, leaderboardRaw, tournaments, challenges] = await Promise.all([
      getFeaturedGame(),
      getLeaderboard(),
      getTournaments(),
      getChallenges()
    ]);

    const profileIds = leaderboardRaw.map((entry) => entry.user_id || entry.player_id || entry.creator_id);
    const profilesMap = await getProfilesMap(profileIds);

    state.featuredGame = featuredGame;
    state.leaderboard = leaderboardRaw.map((entry) => ({
      ...entry,
      profile: profilesMap.get(entry.user_id || entry.player_id || entry.creator_id) || null
    }));
    state.tournaments = tournaments;
    state.challenges = challenges;

    renderFeaturedGame();
    renderLeaderboard();
    renderTournaments();
    renderChallenges();
    renderStats();
    updateVisibility();

    if (!featuredGame && !leaderboardRaw.length && !tournaments.length && !challenges.length) {
      showError("Gaming page is locked in, but no real gaming data was found yet.");
      return;
    }

    showSuccess("Gaming page is now pulling real gaming data.");
  } catch (error) {
    console.error("[gaming-client] boot error:", error);
    showError(error.message || "Failed to load gaming page.");
  }
}

document.addEventListener("DOMContentLoaded", bootGamingClient);
