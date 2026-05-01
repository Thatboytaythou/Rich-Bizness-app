// =========================
// RICH BIZNESS — WATCH STATE (FINAL ELITE)
// /core/features/live/watch-state.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let currentStream = null;
let sessionId = null;
let heartbeatInterval = null;

// =========================
// INIT
// =========================

export async function initWatchState() {
  currentUser = getCurrentUserState();

  const stream = await loadStream();

  if (!stream) {
    showError("Stream not found");
    return null;
  }

  currentStream = stream;

  await startViewSession();
  startHeartbeat();

  console.log("📡 Watch state ready");

  return currentStream;
}

// =========================
// LOAD STREAM
// =========================

async function loadStream() {
  const params = new URLSearchParams(window.location.search);

  const slug = params.get("slug");
  const id = params.get("id");

  let query = supabase.from("live_streams").select("*");

  if (slug) {
    query = query.eq("slug", slug);
  } else if (id) {
    query = query.eq("id", id);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("❌ load stream error", error);
    return null;
  }

  return data;
}

// =========================
// VIEW SESSION START
// =========================

async function startViewSession() {
  const token = generateSessionToken();

  const { data, error } = await supabase
    .from("live_view_sessions")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser?.id || null,
      session_token: token,
      entered_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    console.error("❌ session start failed", error);
    return;
  }

  sessionId = data.id;

  await incrementViewerCount();
}

// =========================
// HEARTBEAT (KEEP SESSION ALIVE)
// =========================

function startHeartbeat() {
  heartbeatInterval = setInterval(async () => {
    if (!sessionId) return;

    await supabase
      .from("live_view_sessions")
      .update({
        last_seen_at: new Date().toISOString()
      })
      .eq("id", sessionId);
  }, 15000); // every 15s
}

// =========================
// END SESSION
// =========================

async function endSession() {
  if (!sessionId) return;

  await supabase
    .from("live_view_sessions")
    .update({
      left_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  await decrementViewerCount();

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
}

// =========================
// VIEWER COUNT CONTROL
// =========================

async function incrementViewerCount() {
  await supabase.rpc("increment_viewers", {
    stream_id_input: currentStream.id
  });
}

async function decrementViewerCount() {
  await supabase.rpc("decrement_viewers", {
    stream_id_input: currentStream.id
  });
}

// =========================
// UI ERROR
// =========================

function showError(msg) {
  const el = document.getElementById("watch-status");
  if (el) el.textContent = msg;
}

// =========================
// HELPERS
// =========================

function generateSessionToken() {
  return crypto.randomUUID();
}

// =========================
// CLEANUP (IMPORTANT)
// =========================

window.addEventListener("beforeunload", () => {
  endSession();
});
