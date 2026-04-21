import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STORAGE_KEY = "rich_bizness_studio_mode_v3";
const GAME_SLUG = "studio-mode";

const defaultState = {
  cash: 0,
  fans: 0,
  hype: 0,
  level: 1,
  score: 0,
  upgrades: {
    mic: false,
    speakers: false,
    lights: false,
    car: false,
  },
  logs: [
    "Studio Mode ready. Record, drop, perform, and save your best run.",
  ],
};

const state = loadState();

const el = {
  cashValue: document.getElementById("cashValue"),
  fansValue: document.getElementById("fansValue"),
  hypeValue: document.getElementById("hypeValue"),
  levelValue: document.getElementById("levelValue"),
  hypeMeter: document.getElementById("hypeMeter"),
  upgradeCount: document.getElementById("upgradeCount"),
  log: document.getElementById("log"),
  leaderboard: document.getElementById("leaderboard"),
  avatarWrap: document.getElementById("avatarWrap"),
  stage: document.getElementById("stage"),
  profileName: document.getElementById("profileName"),
  runStatus: document.getElementById("runStatus"),
  toast: document.getElementById("toast"),

  recordBtn: document.getElementById("recordBtn"),
  dropBtn: document.getElementById("dropBtn"),
  performBtn: document.getElementById("performBtn"),
  cashoutBtn: document.getElementById("cashoutBtn"),
  upgradeMic: document.getElementById("upgradeMic"),
  upgradeSpeakers: document.getElementById("upgradeSpeakers"),
  upgradeLights: document.getElementById("upgradeLights"),
  upgradeCar: document.getElementById("upgradeCar"),
  saveRunBtn: document.getElementById("saveRunBtn"),
  resetRunBtn: document.getElementById("resetRunBtn"),
};

let activeUser = null;
let activeProfile = null;
let toastTimer = null;
let smokeInterval = null;

function safeClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return safeClone(defaultState);

    const parsed = JSON.parse(raw);
    return {
      ...safeClone(defaultState),
      ...parsed,
      upgrades: {
        ...defaultState.upgrades,
        ...(parsed.upgrades || {}),
      },
      logs:
        Array.isArray(parsed.logs) && parsed.logs.length
          ? parsed.logs
          : [...defaultState.logs],
    };
  } catch (error) {
    console.error("[studio-mode] loadState error:", error);
    return safeClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[studio-mode] saveState error:", error);
  }
}

function formatCash(value) {
  return "$" + Math.floor(Number(value || 0)).toLocaleString();
}

function ownedUpgradeCount() {
  return Object.values(state.upgrades).filter(Boolean).length;
}

function scoreFormula() {
  return Math.floor(
    state.cash * 0.08 +
      state.fans * 1.15 +
      state.hype * 6 +
      state.level * 120 +
      ownedUpgradeCount() * 180
  );
}

function recomputeLevelAndScore() {
  state.level = Math.max(
    1,
    1 + Math.floor(state.cash / 140 + state.fans / 85 + state.hype / 12)
  );
  state.score = scoreFormula();
}

function updateRunStatus(text) {
  if (el.runStatus) el.runStatus.textContent = text;
}

function pushLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 28);
  saveState();
  render();
}

function showToast(message, type = "success") {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.className = `toast ${type} show`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.className = `toast ${type}`;
  }, 2200);
}

function setUpgradeButton(button, owned, baseText, ownedText) {
  if (!button) return;
  const strong = button.querySelector("strong");
  if (strong) strong.textContent = owned ? ownedText : baseText;
  button.disabled = owned;
}

function render() {
  recomputeLevelAndScore();

  if (el.cashValue) el.cashValue.textContent = formatCash(state.cash);
  if (el.fansValue) el.fansValue.textContent = Math.floor(state.fans).toLocaleString();
  if (el.hypeValue) el.hypeValue.textContent = Math.floor(state.hype).toLocaleString();
  if (el.levelValue) el.levelValue.textContent = String(state.level);
  if (el.hypeMeter) {
    const cap = state.upgrades.car ? 160 : 100;
    el.hypeMeter.style.width = `${Math.max(0, Math.min(100, (state.hype / cap) * 100))}%`;
  }
  if (el.upgradeCount) {
    el.upgradeCount.textContent = `${ownedUpgradeCount()} / 4 owned`;
  }

  if (el.log) {
    el.log.innerHTML = "";
    state.logs.forEach((item) => {
      const div = document.createElement("div");
      div.className = "log-item";
      div.textContent = item;
      el.log.appendChild(div);
    });
  }

  setUpgradeButton(el.upgradeMic, state.upgrades.mic, "Better Mic — $250", "Better Mic — Owned");
  setUpgradeButton(
    el.upgradeSpeakers,
    state.upgrades.speakers,
    "Studio Speakers — $500",
    "Studio Speakers — Owned"
  );
  setUpgradeButton(
    el.upgradeLights,
    state.upgrades.lights,
    "Neon Lights — $900",
    "Neon Lights — Owned"
  );
  setUpgradeButton(el.upgradeCar, state.upgrades.car, "Luxury Whip — $2000", "Luxury Whip — Owned");
}

function animateAvatar(power = 1) {
  if (!el.avatarWrap) return;
  el.avatarWrap.style.transform = `translateX(-50%) translateY(${-4 * power}px) scale(${1 + power * 0.015})`;
  setTimeout(() => {
    el.avatarWrap.style.transform = "translateX(-50%)";
  }, 150);
}

function spawnFloating(text, className, xPercent, yPercent, duration = 1200) {
  if (!el.stage) return;

  const floating = document.createElement("div");
  floating.className = `floating ${className}`;
  floating.textContent = text;
  floating.style.left = `${xPercent}%`;
  floating.style.top = `${yPercent}%`;
  el.stage.appendChild(floating);

  requestAnimationFrame(() => {
    floating.style.transform = "translateY(-120px) scale(1.18)";
    floating.style.opacity = "0";
  });

  setTimeout(() => floating.remove(), duration + 50);
}

function shower(type, amount) {
  for (let i = 0; i < amount; i += 1) {
    setTimeout(() => {
      const x = 30 + Math.random() * 40;
      const y = 44 + Math.random() * 28;

      if (type === "record") spawnFloating("♪", "note", x, y);
      if (type === "cash") spawnFloating("$", "cash", x, y);
      if (type === "fans") spawnFloating("★", "fan", x, y);
      if (type === "smoke") spawnFloating("☁", "smoke", x, y, 1500);
    }, i * 55);
  }
}

function recordTrack() {
  let cashGain = 65 + Math.random() * 90;
  let hypeGain = 7 + Math.random() * 9;

  if (state.upgrades.mic) {
    cashGain *= 1.55;
    hypeGain *= 1.35;
  }

  state.cash += cashGain;
  state.hype = Math.min(state.upgrades.car ? 160 : 100, state.hype + hypeGain);

  animateAvatar(1.2);
  shower("record", 8);
  shower("smoke", 4);

  updateRunStatus("Recording");
  pushLog(`Recorded a new track. +${formatCash(cashGain)} and +${Math.floor(hypeGain)} hype.`);
  showToast("Track recorded 🎙️", "success");
}

function dropSong() {
  if (state.hype < 10) {
    pushLog("Not enough hype to drop a record yet. Build more buzz first.");
    showToast("Need more hype before dropping a song.", "warn");
    return;
  }

  let fanGain = 24 + Math.random() * 60 + state.hype * 1.45;
  let cashGain = 50 + Math.random() * 95 + state.hype * 1.9;

  if (state.upgrades.speakers) fanGain *= 1.65;
  if (state.upgrades.mic) cashGain *= 1.15;

  state.fans += fanGain;
  state.cash += cashGain;
  state.hype = Math.max(0, state.hype - (16 + Math.random() * 10));

  animateAvatar(1.45);
  shower("fans", 8);
  shower("cash", 8);
  shower("record", 6);

  updateRunStatus("Song Dropped");
  pushLog(`Dropped a song. +${Math.floor(fanGain)} fans and +${formatCash(cashGain)}.`);
  showToast("Song dropped 🚀", "success");
}

function performLive() {
  if (state.hype < 20) {
    pushLog("Need more hype before the crowd will really turn up.");
    showToast("You need more hype to perform live.", "warn");
    return;
  }

  let cashGain = 130 + Math.random() * 180 + state.level * 18;
  let fanGain = 38 + Math.random() * 80;

  if (state.upgrades.lights) {
    cashGain *= 1.45;
    fanGain *= 1.4;
  }
  if (state.upgrades.car) {
    fanGain *= 1.2;
  }

  state.cash += cashGain;
  state.fans += fanGain;
  state.hype = Math.max(0, state.hype - 22);

  animateAvatar(1.9);
  shower("fans", 10);
  shower("cash", 9);
  shower("record", 8);

  updateRunStatus("Live Performance");
  pushLog(`Performed live. +${formatCash(cashGain)} and +${Math.floor(fanGain)} fans.`);
  showToast("Performance went up 🎤", "success");
}

function cashOut() {
  const payout = Math.floor(state.cash * 0.12 + state.fans * 0.05 + state.level * 28);
  state.cash += payout;

  animateAvatar(1.25);
  shower("cash", 12);

  updateRunStatus("Cashing Out");
  pushLog(`Cashed out royalties and creator money. Bonus ${formatCash(payout)}.`);
  showToast(`Cashed out ${formatCash(payout)} 💸`, "success");
}

function buyUpgrade(type, cost, successMessage) {
  if (state.upgrades[type]) return;

  if (state.cash < cost) {
    pushLog(`Need ${formatCash(cost)} to unlock this upgrade.`);
    showToast(`Need ${formatCash(cost)} first.`, "warn");
    return;
  }

  state.cash -= cost;
  state.upgrades[type] = true;

  shower("cash", 6);
  updateRunStatus("Studio Upgraded");
  pushLog(successMessage);
  showToast("Upgrade purchased ✅", "success");
}

async function loadProfile() {
  try {
    const { data: authData } = await supabase.auth.getUser();
    activeUser = authData?.user || null;

    if (!activeUser) {
      if (el.profileName) el.profileName.textContent = "Guest Creator";
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", activeUser.id)
      .maybeSingle();

    if (error) {
      console.error("[studio-mode] profile load error:", error);
    }

    activeProfile = profile || null;

    if (el.profileName) {
      el.profileName.textContent =
        profile?.display_name ||
        profile?.username ||
        activeUser.email ||
        "Signed-in Creator";
    }
  } catch (error) {
    console.error("[studio-mode] loadProfile fatal:", error);
    if (el.profileName) el.profileName.textContent = "Guest Creator";
  }
}

async function saveRun() {
  if (!activeUser) {
    pushLog("Sign in first so your studio run can save to leaderboard.");
    showToast("Sign in first to save your run.", "warn");
    return;
  }

  recomputeLevelAndScore();

  const payload = {
    user_id: activeUser.id,
    game_slug: GAME_SLUG,
    score: state.score,
    cash_earned: Math.floor(state.cash),
    fans_earned: Math.floor(state.fans),
    hype_earned: Math.floor(state.hype),
    level_reached: state.level,
    metadata: {
      upgrades: state.upgrades,
      profile_name:
        el.profileName?.textContent ||
        activeProfile?.display_name ||
        activeProfile?.username ||
        activeUser.email ||
        "Creator",
    },
  };

  const { error } = await supabase.from("arcade_runs").insert(payload);

  if (error) {
    console.error("[studio-mode] save run error:", error);
    pushLog(`Could not save run: ${error.message}`);
    showToast("Run could not save yet.", "error");
    return;
  }

  updateRunStatus("Run Saved");
  pushLog(`Run saved. Leaderboard score locked at ${state.score.toLocaleString()}.`);
  showToast("Run saved to leaderboard 🏆", "success");
  await loadLeaderboard();
}

async function loadLeaderboard() {
  if (!el.leaderboard) return;

  try {
    const { data, error } = await supabase
      .from("arcade_runs")
      .select("id, user_id, score, cash_earned, fans_earned, level_reached, metadata, created_at")
      .eq("game_slug", GAME_SLUG)
      .order("score", { ascending: false })
      .limit(8);

    if (error) {
      console.error("[studio-mode] leaderboard error:", error);
      el.leaderboard.innerHTML = `<div class="tiny">Leaderboard could not load yet.</div>`;
      return;
    }

    if (!data || !data.length) {
      el.leaderboard.innerHTML = `<div class="tiny">No saved studio runs yet. Save the first one.</div>`;
      return;
    }

    el.leaderboard.innerHTML = data
      .map((row, index) => {
        const name =
          row.metadata?.profile_name ||
          `Creator ${String(row.user_id).slice(0, 6)}`;

        return `
          <div class="leader-item">
            <div>
              <div class="name">#${index + 1} ${name}</div>
              <div class="meta">
                Level ${row.level_reached} • ${Math.floor(row.fans_earned).toLocaleString()} fans
              </div>
            </div>
            <div class="score">${Number(row.score || 0).toLocaleString()}</div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("[studio-mode] leaderboard fatal:", error);
    el.leaderboard.innerHTML = `<div class="tiny">Leaderboard could not load yet.</div>`;
  }
}

function resetRun() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, safeClone(defaultState));
  updateRunStatus("Reset");
  pushLog("Run reset. Studio cleared and ready for a new grind.");
  showToast("Studio run reset.", "success");
}

function bindEvents() {
  el.recordBtn?.addEventListener("click", recordTrack);
  el.dropBtn?.addEventListener("click", dropSong);
  el.performBtn?.addEventListener("click", performLive);
  el.cashoutBtn?.addEventListener("click", cashOut);
  el.saveRunBtn?.addEventListener("click", saveRun);
  el.resetRunBtn?.addEventListener("click", resetRun);

  el.upgradeMic?.addEventListener("click", () =>
    buyUpgrade("mic", 250, "Bought a better mic. Recording quality jumped.")
  );
  el.upgradeSpeakers?.addEventListener("click", () =>
    buyUpgrade("speakers", 500, "Installed premium speakers. Every drop hits harder now.")
  );
  el.upgradeLights?.addEventListener("click", () =>
    buyUpgrade("lights", 900, "Neon lights installed. Live performances got way more cinematic.")
  );
  el.upgradeCar?.addEventListener("click", () =>
    buyUpgrade("car", 2000, "Luxury whip unlocked. Your flex level just went crazy.")
  );

  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;

    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    const key = event.key.toLowerCase();
    if (key === "r") recordTrack();
    if (key === "d") dropSong();
    if (key === "p") performLive();
    if (key === "c") cashOut();
  });
}

function startAmbientEffects() {
  if (smokeInterval) clearInterval(smokeInterval);
  smokeInterval = setInterval(() => {
    if (Math.random() > 0.48) shower("smoke", 1);
  }, 1400);
}

async function boot() {
  bindEvents();
  render();
  updateRunStatus("Idle");
  startAmbientEffects();
  await loadProfile();
  await loadLeaderboard();
}

boot();
