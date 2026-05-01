// =========================
// RICH BIZNESS — WATCH REACTIONS (FINAL ELITE)
// /core/features/live/watch-reactions.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let streamId = null;

// =========================
// ELEMENTS
// =========================

const els = {
  container: document.getElementById("watch-reactions"),
  buttons: document.querySelectorAll("[data-reaction]")
};

// =========================
// INIT
// =========================

export function initWatchReactions({ stream }) {
  currentUser = getCurrentUserState();
  streamId = stream?.id;

  if (!streamId) {
    console.warn("❌ reactions missing stream");
    return;
  }

  bindEvents();
  subscribeToReactions();

  console.log("🔥 Reactions ready");
}

// =========================
// SEND REACTION
// =========================

async function sendReaction(type) {
  if (!streamId || !type) return;

  const payload = {
    stream_id: streamId,
    user_id: currentUser?.id || null,
    reaction: type,
    created_at: new Date().toISOString()
  };

  // 🔥 REALTIME ONLY (fast, no DB spam)
  supabase.channel("live-reactions-" + streamId).send({
    type: "broadcast",
    event: "reaction",
    payload
  });

  // OPTIONAL: store (commented out for performance)
  /*
  await supabase.from("live_reactions").insert(payload);
  */
}

// =========================
// RECEIVE REACTION
// =========================

function subscribeToReactions() {
  supabase
    .channel("live-reactions-" + streamId)
    .on("broadcast", { event: "reaction" }, ({ payload }) => {
      renderReaction(payload.reaction);
    })
    .subscribe();
}

// =========================
// RENDER FLOATING REACTION
// =========================

function renderReaction(type) {
  if (!els.container) return;

  const el = document.createElement("div");
  el.className = "reaction-float";
  el.textContent = getEmoji(type);

  // random horizontal position
  el.style.left = Math.random() * 80 + "%";

  els.container.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 4000);
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.reaction;
      sendReaction(type);
    });
  });
}

// =========================
// EMOJI MAP
// =========================

function getEmoji(type) {
  switch (type) {
    case "fire":
      return "🔥";
    case "love":
      return "❤️";
    case "laugh":
      return "😂";
    case "money":
      return "💰";
    case "star":
      return "⭐";
    default:
      return "🔥";
  }
}
