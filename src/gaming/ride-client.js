import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const RIDE_SLUG = "rich-bizness-ride";
const DEFAULT_COVER = "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png";

const rideState = {
  game: null,
  user: null,
  profile: null,
  run: {
    score: 0,
    cash: 0,
    distance: 0,
    health: 100,
    boost: 100,
    lives: 3,
    startedAt: null,
    endedAt: null,
    mode: "Elite Ride"
  },
  submitting: false,
  bridgeBound: false
};

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
  const node = el("ride-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const success = el("ride-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("ride-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const error = el("ride-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

async function loadRideGame() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", RIDE_SLUG)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadAuth() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user || null;
  if (!user) return { user: null, profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[ride] profile load error:", error);
  }

  return { user, profile: profile || null };
}

function renderRideHero() {
  const shell = el("ride-hero-shell");
  if (!shell) return;

  const image = rideState.game?.cover_url || rideState.game?.thumbnail_url || DEFAULT_COVER;
  const title = rideState.game?.title || "Rich Bizness Ride";
  const description = rideState.game?.description || "Elite city bike runner tied to your Rich Bizness universe.";

  shell.innerHTML = `
    <div class="featured-game">
      <div class="featured-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      </div>
      <div class="featured-copy">
        <div class="featured-badge">${escapeHtml(title)}</div>
        <h2 class="featured-title">${escapeHtml(description)}</h2>
        <div class="featured-meta">
          Racing • Arcade • 3D Ride Mode • ${formatNumber(rideState.game?.play_count || 0)} plays
        </div>
        <div class="featured-actions">
          <button class="action-btn" id="ride-start-btn">Launch Ride</button>
          <a class="ghost-btn" href="/gaming.html">Arcade Hub</a>
        </div>
      </div>
    </div>
  `;

  const startBtn = el("ride-start-btn");
  if (startBtn) {
    startBtn.onclick = () => {
      const node = el("ride-game-mount");
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
      window.dispatchEvent(new CustomEvent("rb:ride:start"));
    };
  }
}

function renderRideStats() {
  const scoreNode = el("ride-stat-score");
  const cashNode = el("ride-stat-cash");
  const distanceNode = el("ride-stat-distance");
  const healthNode = el("ride-stat-health");
  const boostNode = el("ride-stat-boost");
  const livesNode = el("ride-stat-lives");
  const playerNode = el("ride-player-name");

  if (scoreNode) scoreNode.textContent = formatNumber(rideState.run.score);
  if (cashNode) cashNode.textContent = formatCurrency(rideState.run.cash);
  if (distanceNode) distanceNode.textContent = `${formatNumber(Math.floor(rideState.run.distance))}m`;
  if (healthNode) healthNode.textContent = `${Math.max(0, Math.floor(rideState.run.health))}%`;
  if (boostNode) boostNode.textContent = `${Math.max(0, Math.floor(rideState.run.boost))}%`;
  if (livesNode) livesNode.textContent = String(rideState.run.lives);
  if (playerNode) playerNode.textContent = rideState.profile?.display_name || rideState.profile?.username || "Guest Rider";
}

function bindRideBridge() {
  if (rideState.bridgeBound) return;
  rideState.bridgeBound = true;

  window.addEventListener("rb:ride:update", (event) => {
    const patch = event.detail || {};
    rideState.run = {
      ...rideState.run,
      ...patch
    };
    renderRideStats();
  });

  window.addEventListener("rb:ride:gameover", async (event) => {
    const patch = event.detail || {};
    rideState.run = {
      ...rideState.run,
      ...patch,
      endedAt: new Date().toISOString()
    };
    renderRideStats();
    await submitRideScore();
  });
};

async function submitRideScore() {
  if (rideState.submitting) return;
  if (!rideState.user) {
    showError("Ride ended, but you are not signed in so the score could not be saved.");
    return;
  }

  try {
    rideState.submitting = true;
    clearMessages();

    const payload = {
      gameSlug: RIDE_SLUG,
      score: Number(rideState.run.score || 0),
      mode: rideState.run.mode || "Elite Ride",
      metadata: {
        cash: Number(rideState.run.cash || 0),
        distance: Number(rideState.run.distance || 0),
        health: Number(rideState.run.health || 0),
        boost: Number(rideState.run.boost || 0),
        lives: Number(rideState.run.lives || 0),
        startedAt: rideState.run.startedAt,
        endedAt: rideState.run.endedAt,
        source: "ride.html"
      },
      userId: rideState.user.id
    };

    const response = await fetch("/api/submit-game-score.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.error || "Failed to submit ride score.");
    }

    showSuccess(`Ride score saved. ${formatNumber(payload.score)} points locked in.`);
  } catch (error) {
    console.error("[ride] submit score error:", error);
    showError(error.message || "Failed to submit ride score.");
  } finally {
    rideState.submitting = false;
  }
}

function renderRideAdmin() {
  const node = el("ride-admin-shell");
  if (!node) return;

  node.innerHTML = `
    <article class="admin-item">
      <h4 class="item-title">Ride Game Slug</h4>
      <p class="item-sub">${escapeHtml(RIDE_SLUG)}</p>
    </article>

    <article class="admin-item">
      <h4 class="item-title">Current User</h4>
      <p class="item-sub">${escapeHtml(rideState.profile?.display_name || rideState.profile?.username || "Guest mode")}</p>
    </article>

    <article class="admin-item">
      <h4 class="item-title">Integration Status</h4>
      <p class="item-sub">
        Auth ${rideState.user ? "connected" : "guest mode"} •
        Score submit endpoint ready •
        Games table ${rideState.game ? "found" : "missing record"}
      </p>
    </article>
  `;
}

function warnIfMissingGameRecord() {
  if (rideState.game) return;
  showError("Ride page loaded, but the games table does not have a public rich-bizness-ride row yet.");
}

export async function bootRidePage() {
  try {
    clearMessages();

    const [{ user, profile }, game] = await Promise.all([
      loadAuth(),
      loadRideGame()
    ]);

    rideState.user = user;
    rideState.profile = profile;
    rideState.game = game;
    rideState.run.startedAt = new Date().toISOString();

    renderRideHero();
    renderRideStats();
    renderRideAdmin();
    bindRideBridge();
    warnIfMissingGameRecord();

    if (rideState.game) {
      showSuccess("Ride game ecosystem synced and ready.");
    }
  } catch (error) {
    console.error("[ride] boot error:", error);
    showError(error.message || "Failed to boot ride page.");
  }
}

document.addEventListener("DOMContentLoaded", bootRidePage);
