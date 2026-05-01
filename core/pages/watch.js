// =========================
// RICH BIZNESS WATCH — FINAL SYNCED (REPAIRED)
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
  }).format(Number(cents || 0) / 100);
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function safeText(el, value) {
  if (el) el.textContent = value ?? "";
}

/* =========================
   LOAD STREAM
========================= */

async function loadStream() {
  try {
    const slug = getParam("slug");
    if (!slug) return;

    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("stream load error:", error);
      return;
    }

    if (!data) return;

    activeStream = data;

    safeText(els.title, data.title || "Untitled");
    safeText(els.description, data.description || "");
    safeText(els.viewers, data.viewer_count || 0);
    safeText(els.revenue, money(data.total_revenue_cents || 0));

    if (els.empty) els.empty.style.display = "none";
  } catch (err) {
    console.error("loadStream crash:", err);
  }
}

/* =========================
   LIVEKIT
========================= */

async function connectLive() {
  try {
    if (!activeStream?.id) return;

    // 🔥 always refresh session
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;

    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || ""}`
      },
      body: JSON.stringify({
        streamId: activeStream.id,
        roomName: activeStream.livekit_room_name,
        participantName: currentUser?.id || crypto.randomUUID(),
        requestedRole: "viewer"
      })
    });

    const tokenData = await res.json();

    if (!res.ok || !tokenData?.token) {
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

        // 🔥 safer replace
        if (els.video && els.video.parentNode) {
          els.video.parentNode.replaceChild(el, els.video);
          els.video = el;
        }
      }

      if (track.kind === "audio") {
        el.style.display = "none";
        document.body.appendChild(el);
      }
    });

    await livekitRoom.connect(tokenData.url, tokenData.token);
  } catch (err) {
    console.error("connectLive crash:", err);
  }
}

/* =========================
   CHAT
========================= */

function appendChat(msg) {
  if (!els.chatList) return;

  const el = document.createElement("div");
  el.className = "chat-msg";
  el.innerHTML = `<strong>${msg.sender_name || "User"}</strong>: ${msg.body || ""}`;
  els.chatList.appendChild(el);
  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function subscribeChat() {
  if (!activeStream?.id) return;

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

  const body = els.chatInput?.value?.trim();
  if (!body || !activeStream?.id) return;

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
  if (!els.reactionBurst) return;

  els.reactionBurst.textContent = reaction;
  els.reactionBurst.classList.add("pop");

  setTimeout(() => {
    els.reactionBurst.classList.remove("pop");
  }, 600);
}

function subscribeReactions() {
  if (!activeStream?.id) return;

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
        if (payload.new?.reaction) {
          burst(payload.new.reaction);
        }
      }
    )
    .subscribe();
}

function sendReaction(emoji) {
  if (!activeStream?.id) return;

  supabase.from("live_chat_messages").insert({
    stream_id: activeStream.id,
    reaction: emoji
  });

  burst(emoji);
}

/* =========================
   PRESENCE
========================= */

function subscribePresence() {
  if (!activeStream?.id) return;

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
  if (!activeStream?.id || !els.cohostGrid) return;

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
  if (!activeStream?.id) return;

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
