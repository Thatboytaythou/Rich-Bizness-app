// =========================
// RICH BIZNESS WATCH — FINAL LOCKED
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail } from "/core/features/live/live-rail.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

const $ = (id) => document.getElementById(id);

const els = {
  status: $("watch-status"),
  video: $("watch-video"),
  emptyState: $("watch-empty-state"),
  title: $("watch-title"),
  unlockBtn: $("unlock-watch-btn")
};

mountEliteNav({ target: "#elite-platform-nav" });

let activeStream = null;
let accessGranted = false;
let livekitRoom = null;

/* =========================
   HELPERS
========================= */

function setStatus(msg, type = "") {
  if (!els.status) return;
  els.status.textContent = msg;
  els.status.className = `watch-status ${type}`;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function getUser() {
  if (currentUser?.id) return currentUser;
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

/* =========================
   LOAD STREAM
========================= */

async function loadStream() {
  const slug = getParam("slug");

  const { data } = await supabase
    .from("live_streams")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    setStatus("No stream found");
    return null;
  }

  activeStream = data;

  if (els.title) els.title.textContent = data.title;

  return data;
}

/* =========================
   ACCESS CONTROL
========================= */

async function checkAccess() {
  const stream = activeStream;
  const user = await getUser();

  if (!stream) return false;

  if (stream.access_type === "free" || !stream.price_cents) {
    accessGranted = true;
    return true;
  }

  if (!user?.id) return false;

  const { data } = await supabase
    .from("live_stream_purchases")
    .select("id")
    .eq("stream_id", stream.id)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .maybeSingle();

  accessGranted = !!data;
  return accessGranted;
}

/* =========================
   CHECKOUT
========================= */

async function unlockRoom() {
  const user = await getUser();

  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mode: "stream_ticket",
      streamId: activeStream.id,
      successUrl: `${location.origin}/watch.html?slug=${activeStream.slug}&checkout=success`,
      cancelUrl: location.href
    })
  });

  const data = await res.json();

  if (!data?.checkoutUrl) {
    setStatus("Checkout failed", "error");
    return;
  }

  window.location.href = data.checkoutUrl;
}

/* =========================
   LIVEKIT CONNECT
========================= */

async function connectLiveKit() {
  if (!accessGranted) return;

  const roomName = activeStream.livekit_room_name;
  const user = await getUser();

  const res = await fetch("/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomName,
      participantName: user?.id || `viewer-${crypto.randomUUID()}`,
      participantMetadata: { role: "viewer" },
      canPublish: false,
      canSubscribe: true
    })
  });

  const tokenData = await res.json();

  const LiveKit = await import("https://esm.sh/livekit-client@2");
  const room = new LiveKit.Room();

  room.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === "video") {
      track.attach(els.video);
    }
  });

  await room.connect(tokenData.url, tokenData.token);
}

/* =========================
   BOOT
========================= */

async function boot() {
  setStatus("Loading...");

  await getUser();

  if (getParam("checkout") === "success") {
    setStatus("Payment successful — unlocking...");
  }

  await loadStream();

  const hasAccess = await checkAccess();

  if (!hasAccess) {
    setStatus("Locked — purchase required");
    els.unlockBtn?.addEventListener("click", unlockRoom);
    return;
  }

  await connectLiveKit();

  await bootLiveRail({
    railElementId: "watch-live-rail"
  });

  setStatus("Live");
}

boot();
