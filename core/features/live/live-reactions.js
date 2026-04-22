import { supabase } from "/core/supabase.js";

let reactionChannel = null;
let activeStreamId = null;
let activeUserId = null;
let activeBurstEl = null;
let activeBarEl = null;
let activeCountEls = {};
let reactionCleanupTimer = null;

const REACTION_TYPES = ["fire", "heart", "100", "clap", "lit"];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeReactionType(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  return REACTION_TYPES.includes(clean) ? clean : "fire";
}

function emojiForReaction(type = "") {
  switch (normalizeReactionType(type)) {
    case "heart":
      return "❤️";
    case "100":
      return "💯";
    case "clap":
      return "👏";
    case "lit":
      return "🔥";
    case "fire":
    default:
      return "🔥";
  }
}

function labelForReaction(type = "") {
  switch (normalizeReactionType(type)) {
    case "heart":
      return "Heart";
    case "100":
      return "100";
    case "clap":
      return "Clap";
    case "lit":
      return "Lit";
    case "fire":
    default:
      return "Fire";
  }
}

function removeExistingChannel() {
  if (reactionChannel) {
    supabase.removeChannel(reactionChannel);
    reactionChannel = null;
  }
}

function clearCleanupTimer() {
  if (reactionCleanupTimer) {
    window.clearTimeout(reactionCleanupTimer);
    reactionCleanupTimer = null;
  }
}

function ensureBurstRoot() {
  if (!activeBurstEl) return null;
  activeBurstEl.classList.add("rb-live-reaction-burst");
  return activeBurstEl;
}

function renderFloatingReaction(type = "fire") {
  const root = ensureBurstRoot();
  if (!root) return;

  const reaction = document.createElement("span");
  reaction.className = `rb-live-reaction-float is-${normalizeReactionType(type)}`;
  reaction.textContent = emojiForReaction(type);
  reaction.style.left = `${10 + Math.random() * 78}%`;
  reaction.style.animationDuration = `${2200 + Math.random() * 1000}ms`;
  reaction.style.fontSize = `${24 + Math.random() * 16}px`;

  root.appendChild(reaction);

  window.setTimeout(() => {
    reaction.remove();
  }, 3600);
}

function resetReactionBarIfNeeded() {
  if (!activeBarEl) return;
  activeBarEl.innerHTML = "";
}

function reactionButtonTemplate(type, count = 0, active = false) {
  const safeType = normalizeReactionType(type);
  return `
    <button
      class="rb-live-reaction-btn ${active ? "is-active" : ""}"
      type="button"
      data-reaction-type="${safeType}"
      aria-label="${escapeHtml(labelForReaction(safeType))}"
    >
      <span class="rb-live-reaction-btn__emoji">${emojiForReaction(safeType)}</span>
      <span class="rb-live-reaction-btn__label">${escapeHtml(labelForReaction(safeType))}</span>
      <span class="rb-live-reaction-btn__count" data-reaction-count="${safeType}">${Number(count || 0).toLocaleString()}</span>
    </button>
  `;
}

function renderReactionBar(counts = {}, myReaction = "") {
  if (!activeBarEl) return;

  const normalizedMine = normalizeReactionType(myReaction || "");
  activeBarEl.innerHTML = REACTION_TYPES.map((type) =>
    reactionButtonTemplate(
      type,
      Number(counts?.[type] || 0),
      normalizedMine === type
    )
  ).join("");

  activeCountEls = {};
  activeBarEl.querySelectorAll("[data-reaction-count]").forEach((node) => {
    activeCountEls[node.getAttribute("data-reaction-count")] = node;
  });
}

function updateReactionCounts(counts = {}) {
  REACTION_TYPES.forEach((type) => {
    const node = activeCountEls[type];
    if (node) {
      node.textContent = Number(counts?.[type] || 0).toLocaleString();
    }
  });
}

async function fetchReactionRows(streamId) {
  const { data, error } = await supabase
    .from("live_reactions")
    .select("id, stream_id, user_id, reaction_type, created_at, updated_at")
    .eq("stream_id", streamId);

  if (error) {
    console.error("[live-reactions] fetchReactionRows error:", error);
    throw error;
  }

  return data || [];
}

function summarizeReactionRows(rows = [], userId = null) {
  const counts = {
    fire: 0,
    heart: 0,
    "100": 0,
    clap: 0,
    lit: 0
  };

  let myReaction = "";

  rows.forEach((row) => {
    const type = normalizeReactionType(row.reaction_type);
    counts[type] = Number(counts[type] || 0) + 1;

    if (userId && row.user_id === userId) {
      myReaction = type;
    }
  });

  return {
    counts,
    myReaction
  };
}

export async function fetchLiveReactionSummary(streamId, userId = null) {
  const rows = await fetchReactionRows(streamId);
  return summarizeReactionRows(rows, userId);
}

async function updateStreamReactionCount(streamId) {
  if (!streamId) return;

  const rows = await fetchReactionRows(streamId);
  const total = rows.length;

  await supabase
    .from("live_streams")
    .update({
      total_reactions: total,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", streamId);
}

export async function setLiveReaction({
  streamId,
  userId,
  reactionType
}) {
  if (!streamId) {
    throw new Error("Missing stream id.");
  }

  if (!userId) {
    throw new Error("You must be logged in to react.");
  }

  const type = normalizeReactionType(reactionType);

  const { data: existing, error: existingError } = await supabase
    .from("live_reactions")
    .select("id, reaction_type")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("[live-reactions] existing lookup error:", existingError);
    throw new Error(existingError.message || "Could not check reaction state.");
  }

  if (existing?.reaction_type === type) {
    const { error: deleteError } = await supabase
      .from("live_reactions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("[live-reactions] delete reaction error:", deleteError);
      throw new Error(deleteError.message || "Could not remove reaction.");
    }
  } else if (existing?.id) {
    const { error: updateError } = await supabase
      .from("live_reactions")
      .update({
        reaction_type: type,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[live-reactions] update reaction error:", updateError);
      throw new Error(updateError.message || "Could not update reaction.");
    }
  } else {
    const { error: insertError } = await supabase
      .from("live_reactions")
      .insert({
        stream_id: streamId,
        user_id: userId,
        reaction_type: type
      });

    if (insertError) {
      console.error("[live-reactions] insert reaction error:", insertError);
      throw new Error(insertError.message || "Could not save reaction.");
    }
  }

  await updateStreamReactionCount(streamId);
  return await fetchLiveReactionSummary(streamId, userId);
}

function bindReactionBar() {
  if (!activeBarEl) return;

  activeBarEl.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-reaction-type]");
    if (!button) return;

    const reactionType = button.getAttribute("data-reaction-type");
    if (!reactionType) return;

    if (!activeUserId) {
      window.alert("You must be logged in to react.");
      return;
    }

    button.disabled = true;

    try {
      const summary = await setLiveReaction({
        streamId: activeStreamId,
        userId: activeUserId,
        reactionType
      });

      renderReactionBar(summary.counts, summary.myReaction);
      renderFloatingReaction(reactionType);
    } catch (error) {
      console.error("[live-reactions] button click error:", error);
      window.alert(error.message || "Could not react.");
    } finally {
      button.disabled = false;
    }
  });
}

function bindRealtime(streamId) {
  removeExistingChannel();

  reactionChannel = supabase
    .channel(`rb-live-reactions-${streamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_reactions",
        filter: `stream_id=eq.${streamId}`
      },
      async (payload) => {
        try {
          const summary = await fetchLiveReactionSummary(streamId, activeUserId);
          renderReactionBar(summary.counts, summary.myReaction);

          if (payload?.new?.reaction_type) {
            renderFloatingReaction(payload.new.reaction_type);
          }
        } catch (error) {
          console.error("[live-reactions] realtime refresh error:", error);
        }
      }
    )
    .subscribe((status) => {
      console.log("[live-reactions] realtime status:", status);
    });
}

export async function burstLiveReaction(type = "fire", times = 1) {
  const safeTimes = Math.max(1, Math.min(Number(times || 1), 12));
  for (let i = 0; i < safeTimes; i += 1) {
    renderFloatingReaction(type);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
}

export async function bootLiveReactions({
  streamId,
  userId = null,
  reactionBarElementId = "live-reaction-bar",
  reactionBurstElementId = "live-reaction-burst",
  defaultReaction = "fire"
} = {}) {
  activeStreamId = streamId || null;
  activeUserId = userId || null;
  activeBarEl = document.getElementById(reactionBarElementId);
  activeBurstEl = document.getElementById(reactionBurstElementId);

  if (!activeBarEl) {
    console.warn("[live-reactions] Missing reaction bar element.");
    return;
  }

  resetReactionBarIfNeeded();
  ensureBurstRoot();
  clearCleanupTimer();

  if (!activeStreamId) {
    renderReactionBar({
      fire: 0,
      heart: 0,
      "100": 0,
      clap: 0,
      lit: 0
    }, "");
    return;
  }

  try {
    const summary = await fetchLiveReactionSummary(activeStreamId, activeUserId);
    renderReactionBar(summary.counts, summary.myReaction || normalizeReactionType(defaultReaction));
    bindReactionBar();
    bindRealtime(activeStreamId);
  } catch (error) {
    console.error("[live-reactions] boot error:", error);
    renderReactionBar({
      fire: 0,
      heart: 0,
      "100": 0,
      clap: 0,
      lit: 0
    }, "");
  }

  reactionCleanupTimer = window.setTimeout(() => {
    const floats = activeBurstEl?.querySelectorAll(".rb-live-reaction-float") || [];
    floats.forEach((node) => node.remove());
  }, 5000);
}

export function destroyLiveReactions() {
  removeExistingChannel();
  clearCleanupTimer();

  activeStreamId = null;
  activeUserId = null;
  activeBurstEl = null;
  activeBarEl = null;
  activeCountEls = {};
}
