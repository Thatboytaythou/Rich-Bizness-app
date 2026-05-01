// =========================
// RICH BIZNESS WATCH — FINAL SYNCED
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

/* =========================
   ELEMENTS
========================= */

const els = {
  video: $("watch-video"),
  empty: $("watch-empty-state"),

  title: $("watch-title"),
  description: $("watch-description"),

  viewers: $("watch-stat-viewers"),
  revenue: $("watch-stat-revenue"),

  chatList: $("watch-chat-list"),
  chatForm: $("watch-chat-form"),
  chatInput: $("watch-chat-input"),

  reactionBurst: $("watch-reaction-burst"),

  cohostGrid: $("watch-cohost-grid"),

  dmInput: $("watch-dm-input"),
  dmBtn: $("send-watch-dm-btn")
};

/* =========================
   STATE
========================= */

let activeStream = null;
let livekitRoom = null;
let chatChannel = null;
let presenceChannel = null;
let reactionChannel = null;

/* =========================
   HELPERS
========================= */

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/* =========================
   LOAD STREAM
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

  els.title.textContent = data.title || "Untitled";
  els.description.textContent = data.description || "";
  els.viewers.textContent = data.viewer_count || 0;
  els.revenue.textContent = money(data.total_revenue_cents || 0);

  // 🔥 hide empty state
  if (els.empty) els.empty.style.display = "none";
}

/* =========================
   LIVEKIT (FIXED)
========================= */

async function connectLive() {
  if (!activeStream?.id) return;

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  const res = await fetch("/api/livekit-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      streamId: activeStream.id,
      roomName: activeStream.livekit_room_name,
      participantName: currentUser?.id || "viewer",
      requestedRole: "viewer"
    })
  });

  const tokenData = await res.json();

  if (!res.ok) {
    console.error("LiveKit token error:", tokenData);
    return;
  }

  const LiveKit = await import("https://esm.sh/livekit-client@2.15.3");

  livekitRoom = new LiveKit.Room({
    adaptiveStream: true,
    dynacast: true
  });

  livekitRoom.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
    const el = track.attach();

    if (track.kind === "video") {
      el.style.width = "100%";
      el.style.height = "100%";

      // 🔥 FIX: replace main video
      const main = document.getElementById("watch-video");
      if (main) main.replaceWith(el);
    }

    if (track.kind === "audio") {
      el.style.display = "none";
      document.body.appendChild(el);
    }
  });

  await livekitRoom.connect(tokenData.url, tokenData.token);
}

/* =========================
   CHAT
========================= */

function appendChat(msg) {
  const el = document.createElement("div");
  el.className = "chat-msg";
  el.innerHTML = `<strong>${msg.sender_name || "User"}</strong>: ${msg.body}`;
  els.chatList.appendChild(el);
  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function subscribeChat() {
  chatChannel = supabase
    .channel(`chat-${activeStream.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        table: "live_chat_messages",
        filter: `stream_id=eq.${activeStream.id}`
      },
      (payload) => appendChat(payload.new)
    )
    .subscribe();
}

async function sendChat(e) {
  e.preventDefault();

  const body = els.chatInput.value.trim();
  if (!body) return;

  await supabase.from("live_chat_messages").insert({
    stream_id: activeStream.id,
    body,
    sender_name: currentUser?.email?.split("@")[0] || "Guest"
  });

  els.chatInput.value = "";
}

/* =========================
   REACTIONS
========================= */

function burst(reaction) {
  els.reactionBurst.textContent = reaction;
  els.reactionBurst.classList.add("pop");

  setTimeout(() => {
    els.reactionBurst.classList.remove("pop");
  }, 600);
}

function subscribeReactions() {
  reactionChannel = supabase
    .channel(`react-${activeStream.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        table: "live_chat_messages",
        filter: `stream_id=eq.${activeStream.id}`
      },
      (payload) => {
        if (payload.new.reaction) burst(payload.new.reaction);
      }
    )
    .subscribe();
}

function sendReaction(emoji) {
  supabase.from("live_chat_messages").insert({
    stream_id: activeStream.id,
    reaction: emoji
  });

  burst(emoji);
}

/* =========================
   PRESENCE (VIEWERS)
========================= */

function subscribePresence() {
  presenceChannel = supabase.channel(`presence-${activeStream.id}`);

  presenceChannel.on("presence", { event: "sync" }, () => {
    const state = presenceChannel.presenceState();
    const count = Object.keys(state).length;

    if (els.viewers) els.viewers.textContent = count;
  });

  presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await presenceChannel.track({
        user: currentUser?.id || crypto.randomUUID()
      });
    }
  });
}

/* =========================
   COHOSTS
========================= */

async function loadCohosts() {
  const { data } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", activeStream.id)
    .eq("role", "cohost");

  els.cohostGrid.innerHTML = "";

  data?.forEach((c) => {
    const el = document.createElement("div");
    el.className = "cohost-box";
    el.textContent = c.user_id;
    els.cohostGrid.appendChild(el);
  });
}

/* =========================
   DM
========================= */

async function sendDM() {
  await supabase.from("dm_messages").insert({
    body: els.dmInput.value,
    metadata: { stream: activeStream.id }
  });

  els.dmInput.value = "";
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  els.chatForm?.addEventListener("submit", sendChat);
  els.dmBtn?.addEventListener("click", sendDM);

  document.querySelectorAll(".reaction-btn").forEach((btn) => {
    btn.onclick = () => sendReaction(btn.dataset.reaction);
  });
}

/* =========================
   BOOT
========================= */

async function boot() {
  bindEvents();

  await loadStream();
  if (!activeStream) return;

  // 🔥 only connect if live
  if (activeStream.status === "live") {
    await connectLive();
  }

  subscribeChat();
  subscribeReactions();
  subscribePresence();

  await loadCohosts();

  await bootLiveRail({
    railElementId: "watch-live-rail"
  });
}

boot();
