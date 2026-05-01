// =========================
// RICH BIZNESS — WATCH PRESENCE (FINAL ELITE)
// /core/features/live/watch-presence.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let streamId = null;

let presenceChannel = null;

// =========================
// ELEMENTS
// =========================

const els = {
  list: document.getElementById("watch-presence-list"),
  count: document.getElementById("watch-presence-count")
};

// =========================
// INIT
// =========================

export async function initWatchPresence({ stream }) {
  currentUser = getCurrentUserState();
  streamId = stream?.id;

  if (!streamId) {
    console.warn("❌ presence missing stream");
    return;
  }

  await joinPresence();
  subscribePresence();
  await loadInitialPresence();

  console.log("👥 Presence ready");
}

// =========================
// JOIN PRESENCE CHANNEL
// =========================

async function joinPresence() {
  presenceChannel = supabase.channel("presence-" + streamId, {
    config: {
      presence: {
        key: currentUser?.id || crypto.randomUUID()
      }
    }
  });

  await presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await presenceChannel.track({
        user_id: currentUser?.id || null,
        online_at: new Date().toISOString()
      });
    }
  });
}

// =========================
// SUBSCRIBE TO PRESENCE
// =========================

function subscribePresence() {
  presenceChannel.on("presence", { event: "sync" }, () => {
    const state = presenceChannel.presenceState();
    renderPresence(state);
  });
}

// =========================
// INITIAL LOAD (fallback)
// =========================

async function loadInitialPresence() {
  const { data } = await supabase
    .from("live_stream_members")
    .select("user_id")
    .eq("stream_id", streamId)
    .eq("is_active", true);

  if (!data) return;

  renderFallbackPresence(data);
}

// =========================
// RENDER PRESENCE (REALTIME)
// =========================

function renderPresence(state) {
  const users = Object.values(state).flat();

  updateCount(users.length);
  renderList(users.map((u) => u.user_id));
}

// =========================
// FALLBACK RENDER
// =========================

function renderFallbackPresence(data) {
  const users = data.map((u) => u.user_id);

  updateCount(users.length);
  renderList(users);
}

// =========================
// RENDER LIST
// =========================

async function renderList(userIds = []) {
  if (!els.list) return;

  if (!userIds.length) {
    els.list.innerHTML = `<div class="presence-empty">No viewers yet</div>`;
    return;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", userIds);

  els.list.innerHTML = profiles
    .map((p) => {
      const name =
        p.display_name ||
        p.username ||
        "User";

      const avatar =
        p.avatar_url ||
        "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";

      return `
        <div class="presence-user">
          <img src="${avatar}" />
          <span>${name}</span>
        </div>
      `;
    })
    .join("");
}

// =========================
// COUNT
// =========================

function updateCount(count = 0) {
  if (els.count) {
    els.count.textContent = count.toLocaleString();
  }
}

// =========================
// LEAVE (IMPORTANT)
// =========================

export async function leavePresence() {
  if (presenceChannel) {
    await presenceChannel.untrack();
    supabase.removeChannel(presenceChannel);
  }
}

// =========================
// CLEANUP
// =========================

window.addEventListener("beforeunload", () => {
  leavePresence();
});
