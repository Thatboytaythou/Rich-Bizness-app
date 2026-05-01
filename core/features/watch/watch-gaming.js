// =========================
// RICH BIZNESS — WATCH GAMING (FINAL ELITE)
// /core/features/live/watch-gaming.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let currentStream = null;
let currentGame = null;
let sessionId = null;

// =========================
// ELEMENTS
// =========================

const els = {
  container: document.getElementById("watch-game-container"),
  iframe: document.getElementById("watch-game-frame"),
  overlay: document.getElementById("watch-game-overlay"),
  launchBtns: document.querySelectorAll("[data-launch-game]"),
  closeBtn: document.getElementById("watch-game-close"),
  scoreDisplay: document.getElementById("watch-game-score")
};

// =========================
// INIT
// =========================

export function initWatchGaming({ stream }) {
  currentUser = getCurrentUserState();
  currentStream = stream;

  bindEvents();

  console.log("🎮 Watch Gaming Ready");
}

// =========================
// LOAD GAME
// =========================

async function loadGame(gameSlug) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (error || !data) {
    console.error("❌ game load failed", error);
    return null;
  }

  return data;
}

// =========================
// START GAME
// =========================

async function startGame(gameSlug) {
  const game = await loadGame(gameSlug);
  if (!game) return;

  currentGame = game;

  // Launch iframe
  if (els.iframe) {
    els.iframe.src = game.game_url;
  }

  showGame();

  await startSession();

  console.log("🚀 Game started:", game.slug);
}

// =========================
// SHOW / HIDE
// =========================

function showGame() {
  if (els.container) els.container.style.display = "block";
  if (els.overlay) els.overlay.classList.add("active");
}

function hideGame() {
  if (els.container) els.container.style.display = "none";
  if (els.iframe) els.iframe.src = "";

  endSession();
}

// =========================
// GAME SESSION START
// =========================

async function startSession() {
  if (!currentUser?.id || !currentGame) return;

  const { data } = await supabase
    .from("game_sessions")
    .insert({
      user_id: currentUser.id,
      game: currentGame.title,
      game_slug: currentGame.slug,
      duration: 0,
      result: "active",
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  sessionId = data?.id;
}

// =========================
// GAME SESSION END
// =========================

async function endSession() {
  if (!sessionId) return;

  await supabase
    .from("game_sessions")
    .update({
      result: "completed"
    })
    .eq("id", sessionId);

  sessionId = null;
}

// =========================
// SCORE SUBMIT (FROM GAME)
// =========================

export async function submitScore({
  gameSlug,
  score = 0,
  metadata = {}
}) {
  if (!currentUser?.id || !gameSlug) return;

  const { error } = await supabase
    .from("game_scores")
    .insert({
      user_id: currentUser.id,
      game_slug: gameSlug,
      score,
      meta: metadata,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ score submit failed", error);
    return;
  }

  updateScoreUI(score);

  console.log("🏆 Score submitted:", score);
}

// =========================
// UI UPDATE
// =========================

function updateScoreUI(score) {
  if (els.scoreDisplay) {
    els.scoreDisplay.textContent = score.toLocaleString();
  }
}

// =========================
// LISTEN TO GAME (POSTMESSAGE)
// =========================

window.addEventListener("message", (event) => {
  const data = event.data;

  if (!data || typeof data !== "object") return;

  // GAME → APP COMMUNICATION
  if (data.type === "GAME_SCORE") {
    submitScore({
      gameSlug: currentGame?.slug,
      score: data.score,
      metadata: data.meta || {}
    });
  }

  if (data.type === "GAME_EXIT") {
    hideGame();
  }
});

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.launchBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.launchGame;
      startGame(slug);
    });
  });

  els.closeBtn?.addEventListener("click", hideGame);
}

// =========================
// EXPOSE (OPTIONAL)
// =========================

window.RichBiznessGame = {
  submitScore
};
