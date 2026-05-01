// =========================
// RICH BIZNESS WATCH — FINAL MAXED CONTROLLER
// /core/pages/watch.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail } from "/core/features/live/live-rail.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("watch-status"),
  video: $("watch-video"),
  emptyState: $("watch-empty-state"),

  title: $("watch-title"),
  description: $("watch-description"),

  liveBadge: $("watch-live-badge"),
  accessBadge: $("watch-access-badge"),
  categoryBadge: $("watch-category-badge"),

  statStatus: $("watch-stat-status"),
  statViewers: $("watch-stat-viewers"),
  statPeak: $("watch-stat-peak"),
  statRevenue: $("watch-stat-revenue"),

  unlockBtn: $("unlock-watch-btn"),

  chatList: $("watch-chat-list"),
  chatForm: $("watch-chat-form"),
  chatInput: $("watch-chat-input"),
  sendChatBtn: $("send-chat-btn"),

  reactionBurst: $("watch-reaction-burst"),

  dmInput: $("watch-dm-input"),
  dmSendBtn: $("send-watch-dm-btn"),

  cohostName1: $("cohost-name-1"),
  cohostName2: $("cohost-name-2"),
  cohostName3: $("cohost-name-3"),
  cohostRole1: $("cohost-role-1"),
  cohostRole2: $("cohost-role-2"),
  cohostRole3: $("cohost-role-3")
};

let activeStream = null;
let accessGranted = false;
let livekitRoom = null;
let chatChannel = null;
let cohostChannel = null;
let streamChannel = null;
let viewSessionId = null;
let heartbeat = null;

/* =========================
   HELPERS
========================= */

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents) / 100);
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

async function getUser() {
  if (currentUser?.id) return currentUser;
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

/* =========================
   STREAM
========================= */

async function loadStream() {
  const slug = getParam("slug");
  if (!slug) return;

  const { data } = await supabase
    .from("live_streams")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return;

  activeStream = data;

  if (els.title) els.title.textContent = data.title;
  if (els.description) els.description.textContent = data.description;

  if (els.liveBadge) els.liveBadge.textContent = data.status?.toUpperCase();
  if (els.accessBadge) els.accessBadge.textContent = data.access_type?.toUpperCase();

  if (els.statViewers) els.statViewers.textContent = data.viewer_count || 0;
  if (els.statRevenue) els.statRevenue.textContent = money(data.total_revenue_cents);

  return data;
}

/* =========================
   ACCESS
========================= */

async function checkAccess() {
  if (!activeStream) return false;

  if (activeStream.access_type === "free") {
    accessGranted = true;
    return true;
  }

  const user = await getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("live_stream_purchases")
    .select("id")
    .eq("stream_id", activeStream.id)
    .eq("user_id", user.id)
    .maybeSingle();

  accessGranted = !!data;
  return accessGranted;
}

/* =========================
   LIVEKIT
========================= */

async function connectLive() {
  if (!accessGranted) return;

  const res = await fetch("/api/livekit-token", {
    method: "POST",
    body: JSON.stringify({
      streamId: activeStream.id
    })
  });

  const tokenData = await res.json();

  const LiveKit = await import("https://esm.sh/livekit-client");

  livekitRoom = new LiveKit.Room();

  livekitRoom.on("trackSubscribed", (track) => {
    if (track.kind === "video") {
      track.attach(els.video);
    }
  });

  await livekitRoom.connect(tokenData.url, tokenData.token);
}

/* =========================
   CHAT (REALTIME FIXED)
========================= */

function appendChat(msg) {
  const el = document.createElement("div");
  el.innerHTML = `<strong>${msg.sender_name}</strong>: ${msg.body}`;
  els.chatList.appendChild(el);
}

function subscribeChat() {
  chatChannel = supabase
    .channel("chat")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        table: "live_chat_messages"
      },
      (payload) => appendChat(payload.new)
    )
    .subscribe();
}

/* =========================
   COHOST (FIXED)
========================= */

async function loadCohosts() {
  const { data } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", activeStream.id)
    .eq("role", "cohost");

  [1,2,3].forEach(slot => {
    const m = data.find(x => x.slot_number === slot);

    els[`cohostName${slot}`].textContent =
      m?.user_id || "Empty";

    els[`cohostRole${slot}`].textContent =
      m?.status || "Waiting";
  });
}

function subscribeCohosts() {
  cohostChannel = supabase
    .channel("cohosts")
    .on(
      "postgres_changes",
      { event: "*", table: "live_stream_members" },
      loadCohosts
    )
    .subscribe();
}

/* =========================
   VIEW SESSION + HEARTBEAT
========================= */

async function startSession() {
  const { data } = await supabase
    .from("live_view_sessions")
    .insert({
      stream_id: activeStream.id
    })
    .select()
    .single();

  viewSessionId = data.id;

  heartbeat = setInterval(() => {
    supabase
      .from("live_view_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", viewSessionId);
  }, 15000);
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  els.chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = els.chatInput.value;

    await supabase.from("live_chat_messages").insert({
      stream_id: activeStream.id,
      body: msg
    });

    els.chatInput.value = "";
  });

  els.dmSendBtn?.addEventListener("click", async () => {
    await supabase.from("dm_messages").insert({
      body: els.dmInput.value
    });
  });
}

/* =========================
   BOOT
========================= */

async function boot() {
  bindEvents();

  await loadStream();
  if (!activeStream) return;

  await checkAccess();

  await loadCohosts();
  subscribeCohosts();

  subscribeChat();

  await startSession();

  if (accessGranted) {
    await connectLive();
  }

  await bootLiveRail({
    railElementId: "watch-live-rail"
  });

  setStatus("READY");
}

boot();
