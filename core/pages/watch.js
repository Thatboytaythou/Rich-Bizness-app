// =========================
// RICH BIZNESS WATCH — FINAL LOCKED
// /core/pages/watch.js
// Matches /watch.html
// Core-only setup
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

  heroTitle: $("watch-hero-title"),
  heroCopy: $("watch-hero-copy"),

  title: $("watch-title"),
  description: $("watch-description"),

  liveBadge: $("watch-live-badge"),
  accessBadge: $("watch-access-badge"),
  categoryBadge: $("watch-category-badge"),

  statStatus: $("watch-stat-status"),
  statViewers: $("watch-stat-viewers"),
  statPeak: $("watch-stat-peak"),
  statRevenue: $("watch-stat-revenue"),

  gatePanel: $("watch-gate-panel"),
  gateTitle: $("watch-gate-title"),
  gateCopy: $("watch-gate-copy"),
  unlockBtn: $("unlock-watch-btn"),

  copyBtn: $("copy-watch-link-btn"),
  refreshBtn: $("refresh-watch-btn"),
  creatorLink: $("creator-profile-link"),

  chatList: $("watch-chat-list"),
  chatForm: $("watch-chat-form"),
  chatInput: $("watch-chat-input"),
  sendChatBtn: $("send-chat-btn"),
  refreshChatBtn: $("refresh-chat-btn"),

  reactionBurst: $("watch-reaction-burst"),

  dmInput: $("watch-dm-input"),
  dmSendBtn: $("send-watch-dm-btn"),
  dmStatus: $("watch-dm-status"),

  detailId: $("detail-stream-id"),
  detailSlug: $("detail-stream-slug"),
  detailRoom: $("detail-room-name"),
  detailStarted: $("detail-started-at"),

  metaLabel: $("watch-meta-label"),
  enterMetaBtn: $("enter-meta-btn"),
  exitMetaBtn: $("exit-meta-btn"),

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
let viewSessionId = null;

function setStatus(message, type = "") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `watch-status ${type}`.trim();
}

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getWatchUrl() {
  if (!activeStream?.slug) return window.location.href;
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(activeStream.slug)}`;
}

async function getUser() {
  if (currentUser?.id) return currentUser;
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

async function getSessionAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

function renderStream(stream) {
  activeStream = stream || null;

  if (!stream) {
    if (els.emptyState) els.emptyState.style.display = "";
    if (els.title) els.title.textContent = "Rich Bizness Watch Room";
    if (els.description) els.description.textContent = "Select a live stream to load the full watch experience.";
    if (els.liveBadge) els.liveBadge.textContent = "OFFLINE";
    if (els.accessBadge) els.accessBadge.textContent = "FREE";
    if (els.categoryBadge) els.categoryBadge.textContent = "WATCH";
    if (els.statStatus) els.statStatus.textContent = "Offline";
    if (els.statViewers) els.statViewers.textContent = "0";
    if (els.statPeak) els.statPeak.textContent = "0";
    if (els.statRevenue) els.statRevenue.textContent = "$0.00";
    return;
  }

  const isLive = stream.status === "live";

  if (els.emptyState) els.emptyState.style.display = isLive ? "none" : "";
  if (els.title) els.title.textContent = stream.title || "Rich Bizness Watch Room";
  if (els.description) els.description.textContent = stream.description || "Live room loaded.";

  if (els.liveBadge) els.liveBadge.textContent = isLive ? "LIVE" : String(stream.status || "offline").toUpperCase();
  if (els.accessBadge) els.accessBadge.textContent = String(stream.access_type || "free").toUpperCase();
  if (els.categoryBadge) els.categoryBadge.textContent = String(stream.category || "watch").toUpperCase();

  if (els.statStatus) els.statStatus.textContent = stream.status || "offline";
  if (els.statViewers) els.statViewers.textContent = Number(stream.viewer_count || 0).toLocaleString();
  if (els.statPeak) els.statPeak.textContent = Number(stream.peak_viewers || 0).toLocaleString();
  if (els.statRevenue) els.statRevenue.textContent = money(stream.total_revenue_cents || 0);

  if (els.detailId) els.detailId.textContent = stream.id || "—";
  if (els.detailSlug) els.detailSlug.textContent = stream.slug || "—";
  if (els.detailRoom) els.detailRoom.textContent = stream.livekit_room_name || "—";
  if (els.detailStarted) els.detailStarted.textContent = safeDate(stream.started_at);

  if (els.heroTitle) els.heroTitle.textContent = isLive ? "Watch the Bizness Party live." : "Stream loaded.";
  if (els.metaLabel) els.metaLabel.textContent = stream.metadata?.meta_label || "Meta Room Ready";

  if (els.creatorLink && stream.creator_id) {
    els.creatorLink.href = `/profile.html?id=${encodeURIComponent(stream.creator_id)}`;
  }
}

async function loadStream() {
  const slug = getParam("slug");

  if (!slug) {
    setStatus("No stream selected.");
    renderStream(null);
    return null;
  }

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    setStatus(error.message || "Could not load stream.", "error");
    renderStream(null);
    return null;
  }

  if (!data) {
    setStatus("No stream found.", "error");
    renderStream(null);
    return null;
  }

  renderStream(data);
  return data;
}

async function checkAccess() {
  const stream = activeStream;
  const user = await getUser();

  if (!stream) return false;

  if (stream.access_type === "free" || Number(stream.price_cents || 0) <= 0) {
    accessGranted = true;
    return true;
  }

  if (!user?.id) {
    accessGranted = false;
    return false;
  }

  const { data } = await supabase
    .from("live_stream_purchases")
    .select("id")
    .eq("stream_id", stream.id)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .maybeSingle();

  accessGranted = Boolean(data);
  return accessGranted;
}

function renderGate() {
  if (!activeStream) return;

  if (accessGranted) {
    if (els.gateTitle) els.gateTitle.textContent = "Room unlocked";
    if (els.gateCopy) els.gateCopy.textContent = "You have access to this Bizness Party.";
    if (els.unlockBtn) els.unlockBtn.style.display = "none";
    return;
  }

  if (els.gateTitle) els.gateTitle.textContent = "Unlock Room";
  if (els.gateCopy) els.gateCopy.textContent = "This room needs paid or VIP access before watching.";
  if (els.unlockBtn) els.unlockBtn.style.display = "";
}

async function unlockRoom() {
  const user = await getUser();

  if (!activeStream?.id) {
    setStatus("No stream loaded.", "error");
    return;
  }

  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return;
  }

  const token = await getSessionAccessToken();

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      mode: "stream_ticket",
      streamId: activeStream.id,
      successUrl: `${location.origin}/watch.html?slug=${activeStream.slug}&checkout=success`,
      cancelUrl: location.href
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.checkoutUrl) {
    setStatus(data?.error || "Checkout failed.", "error");
    return;
  }

  window.location.href = data.checkoutUrl;
}

async function connectLiveKit() {
  if (!accessGranted || !activeStream?.livekit_room_name) return false;

  try {
    const user = await getUser();
    const token = await getSessionAccessToken();

    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        streamId: activeStream.id,
        roomName: activeStream.livekit_room_name,
        participantName: user?.id || `viewer-${crypto.randomUUID()}`,
        participantMetadata: {
          role: "viewer",
          streamId: activeStream.id
        },
        role: "viewer",
        canPublish: false,
        canSubscribe: true
      })
    });

    const tokenData = await res.json().catch(() => ({}));

    if (!res.ok || !tokenData?.token || !tokenData?.url) {
      setStatus(tokenData?.error || "LiveKit token failed.", "error");
      return false;
    }

    const LiveKit = await import("https://esm.sh/livekit-client@2.15.3");

    if (livekitRoom) {
      await livekitRoom.disconnect();
      livekitRoom = null;
    }

    livekitRoom = new LiveKit.Room({
      adaptiveStream: true,
      dynacast: true
    });

    livekitRoom.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video" && els.video) {
        track.attach(els.video);
        els.video.play().catch(() => {});
        if (els.emptyState) els.emptyState.style.display = "none";
      }

      if (track.kind === "audio") {
        const audioEl = track.attach();
        audioEl.autoplay = true;
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
      }
    });

    livekitRoom.on(LiveKit.RoomEvent.Disconnected, () => {
      setStatus("Disconnected from room.");
    });

    await livekitRoom.connect(tokenData.url, tokenData.token);
    setStatus(activeStream.status === "live" ? "Live room connected." : "Stream loaded.");
    return true;
  } catch (error) {
    console.error("[watch] livekit error:", error);
    setStatus(error.message || "Could not connect to stream.", "error");
    return false;
  }
}

async function startViewSession() {
  if (!activeStream?.id) return;

  const user = await getUser();

  const { data } = await supabase
    .from("live_view_sessions")
    .insert({
      stream_id: activeStream.id,
      user_id: user?.id || null,
      viewer_identity: user?.id || `guest-${crypto.randomUUID()}`,
      started_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true
    })
    .select("*")
    .single()
    .catch(() => ({ data: null }));

  viewSessionId = data?.id || null;
}

async function loadCohosts() {
  if (!activeStream?.id) return;

  const { data } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", activeStream.id)
    .in("role", ["cohost", "moderator"])
    .eq("is_active", true)
    .catch(() => ({ data: [] }));

  [1, 2, 3].forEach((slot) => {
    const member = data?.find((item) => Number(item.metadata?.slot_number) === slot);

    const nameEl = els[`cohostName${slot}`];
    const roleEl = els[`cohostRole${slot}`];

    if (nameEl) nameEl.textContent = member?.user_id || "Empty slot";
    if (roleEl) roleEl.textContent = member?.status || "Waiting";
  });
}

async function loadChat() {
  if (!activeStream?.id || !els.chatList) return;

  const { data } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("stream_id", activeStream.id)
    .order("created_at", { ascending: true })
    .limit(50)
    .catch(() => ({ data: [] }));

  if (!data?.length) {
    els.chatList.innerHTML = `
      <div class="watch-empty-box">
        <strong>No chat yet.</strong>
        <span>Messages will appear here once the room opens.</span>
      </div>
    `;
    return;
  }

  els.chatList.innerHTML = data.map((msg) => `
    <article class="watch-chat-message">
      <strong>${msg.sender_name || msg.user_id || "Rich Playa"}</strong>
      <span>${msg.body || msg.message || ""}</span>
    </article>
  `).join("");

  els.chatList.scrollTop = els.chatList.scrollHeight;
}

async function sendChat(event) {
  event?.preventDefault?.();

  if (!activeStream?.id || !els.chatInput) return;

  const body = els.chatInput.value.trim();
  if (!body) return;

  const user = await getUser();

  const { error } = await supabase.from("live_chat_messages").insert({
    stream_id: activeStream.id,
    user_id: user?.id || null,
    body,
    message: body,
    created_at: new Date().toISOString()
  });

  if (error) {
    setStatus(error.message || "Chat failed.", "error");
    return;
  }

  els.chatInput.value = "";
  await loadChat();
}

function enableChat() {
  const enabled = Boolean(accessGranted && activeStream?.is_chat_enabled !== false);

  if (els.chatInput) els.chatInput.disabled = !enabled;
  if (els.sendChatBtn) els.sendChatBtn.disabled = !enabled;
}

function burstReaction(reaction) {
  if (!els.reactionBurst) return;

  els.reactionBurst.textContent = reaction;
  els.reactionBurst.classList.remove("is-active");

  window.requestAnimationFrame(() => {
    els.reactionBurst.classList.add("is-active");
  });

  setTimeout(() => {
    els.reactionBurst.classList.remove("is-active");
  }, 900);
}

async function sendWatchDM() {
  const body = els.dmInput?.value?.trim();

  if (!body) {
    if (els.dmStatus) els.dmStatus.textContent = "Type a message first.";
    return;
  }

  const user = await getUser();

  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return;
  }

  if (!activeStream?.creator_id) {
    if (els.dmStatus) els.dmStatus.textContent = "No creator loaded.";
    return;
  }

  if (els.dmStatus) els.dmStatus.textContent = "Sending Slide In...";

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({
      created_by: user.id,
      title: "Watch Slide In",
      is_group: false,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (threadError) {
    if (els.dmStatus) els.dmStatus.textContent = threadError.message;
    return;
  }

  await supabase.from("dm_thread_members").insert([
    { thread_id: thread.id, user_id: user.id },
    { thread_id: thread.id, user_id: activeStream.creator_id }
  ]);

  const { error } = await supabase.from("dm_messages").insert({
    thread_id: thread.id,
    sender_id: user.id,
    body,
    message_type: "watch_slide_in",
    metadata: { stream_id: activeStream.id },
    created_at: new Date().toISOString()
  });

  if (error) {
    if (els.dmStatus) els.dmStatus.textContent = error.message;
    return;
  }

  els.dmInput.value = "";
  if (els.dmStatus) els.dmStatus.textContent = "Slide In sent.";
}

async function copyWatchLink() {
  await navigator.clipboard.writeText(getWatchUrl());
  setStatus("Watch link copied.", "success");
}

async function refreshWatch() {
  setStatus("Refreshing room...");
  await loadStream();
  await checkAccess();
  renderGate();
  enableChat();
  await loadCohosts();
  await loadChat();
  setStatus(activeStream?.status === "live" ? "Live room refreshed." : "Stream refreshed.");
}

function bindEvents() {
  els.unlockBtn?.addEventListener("click", unlockRoom);
  els.copyBtn?.addEventListener("click", copyWatchLink);
  els.refreshBtn?.addEventListener("click", refreshWatch);
  els.refreshChatBtn?.addEventListener("click", loadChat);
  els.chatForm?.addEventListener("submit", sendChat);
  els.dmSendBtn?.addEventListener("click", sendWatchDM);

  document.querySelectorAll(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      burstReaction(btn.dataset.reaction || "🔥");
    });
  });

  els.enterMetaBtn?.addEventListener("click", () => {
    document.body.classList.add("meta-vision-on");
  });

  els.exitMetaBtn?.addEventListener("click", () => {
    document.body.classList.remove("meta-vision-on");
  });
}

async function boot() {
  bindEvents();

  setStatus("Loading watch room...");

  await getUser();

  if (getParam("checkout") === "success") {
    setStatus("Payment successful — unlocking...");
  }

  await loadStream();

  if (!activeStream) return;

  await checkAccess();
  renderGate();
  enableChat();

  await loadCohosts();
  await loadChat();

  await startViewSession();

  if (accessGranted) {
    await connectLiveKit();
  } else {
    setStatus("Locked — purchase or VIP required.", "error");
    return;
  }

  await bootLiveRail({
    railElementId: "watch-live-rail"
  }).catch(() => {});

  setStatus(activeStream.status === "live" ? "Live." : "Stream loaded.");
}

window.addEventListener("beforeunload", async () => {
  if (!viewSessionId) return;

  await supabase
    .from("live_view_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .eq("id", viewSessionId);
});

boot().catch((error) => {
  console.error("[watch] boot error:", error);
  setStatus(error.message || "Could not load watch room.", "error");
});
