// =========================
// RICH BIZNESS WATCH — FINAL EXTREME
// /core/pages/watch.js
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
  playerStage: $("watch-player-stage"),

  liveBadge: $("watch-live-badge"),
  accessBadge: $("watch-access-badge"),
  categoryBadge: $("watch-category-badge"),

  title: $("watch-title"),
  description: $("watch-description"),
  heroTitle: $("watch-hero-title"),
  heroCopy: $("watch-hero-copy"),

  copyLinkBtn: $("copy-watch-link-btn"),
  refreshBtn: $("refresh-watch-btn"),
  creatorLink: $("creator-profile-link"),

  statStatus: $("watch-stat-status"),
  statViewers: $("watch-stat-viewers"),
  statPeak: $("watch-stat-peak"),
  statRevenue: $("watch-stat-revenue"),

  gatePanel: $("watch-gate-panel"),
  gateTitle: $("watch-gate-title"),
  gateCopy: $("watch-gate-copy"),
  unlockBtn: $("unlock-watch-btn"),
  vipLink: $("vip-access-link"),

  chatList: $("watch-chat-list"),
  chatForm: $("watch-chat-form"),
  chatInput: $("watch-chat-input"),
  sendChatBtn: $("send-chat-btn"),
  refreshChatBtn: $("refresh-chat-btn"),

  reactionBurst: $("watch-reaction-burst"),

  dmInput: $("watch-dm-input"),
  dmBtn: $("send-watch-dm-btn"),
  dmStatus: $("watch-dm-status"),

  detailId: $("detail-stream-id"),
  detailSlug: $("detail-stream-slug"),
  detailRoom: $("detail-room-name"),
  detailStarted: $("detail-started-at"),

  metaLabel: $("watch-meta-label"),
  enterMetaBtn: $("enter-meta-btn"),
  exitMetaBtn: $("exit-meta-btn")
};

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

let activeStream = null;
let accessGranted = false;
let livekitRoom = null;
let chatChannel = null;

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.classList.remove("is-error", "is-success");
  if (type === "error") els.status.classList.add("is-error");
  if (type === "success") els.status.classList.add("is-success");
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

async function loadStream() {
  const slug = getParam("slug");
  const id = getParam("id");

  let query = supabase.from("live_streams").select("*").limit(1);

  if (slug) query = query.eq("slug", slug);
  else if (id) query = query.eq("id", id);
  else query = query.in("status", ["live", "active"]).order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    setStatus(error.message || "Could not load stream.", "error");
    return null;
  }

  const stream = data?.[0] || null;

  if (!stream) {
    setStatus("No stream selected yet.");
    renderNoStream();
    return null;
  }

  activeStream = stream;
  renderStream(stream);
  return stream;
}

function renderNoStream() {
  els.emptyState?.classList.remove("is-hidden");
  if (els.video) els.video.style.display = "none";
}

function renderStream(stream) {
  const title = stream.title || stream.name || "Rich Bizness Watch Room";
  const desc = stream.description || "Live room connected to the Rich Bizness watch system.";
  const status = stream.status || "draft";
  const access = stream.access_type || "free";
  const category = stream.category || stream.lane || "watch";

  if (els.title) els.title.textContent = title;
  if (els.description) els.description.textContent = desc;
  if (els.heroTitle) els.heroTitle.textContent = title;
  if (els.heroCopy) els.heroCopy.textContent = desc;

  if (els.liveBadge) els.liveBadge.textContent = status === "live" ? "LIVE" : status.toUpperCase();
  if (els.accessBadge) els.accessBadge.textContent = access.toUpperCase();
  if (els.categoryBadge) els.categoryBadge.textContent = String(category).toUpperCase();

  if (els.statStatus) els.statStatus.textContent = status;
  if (els.statViewers) els.statViewers.textContent = Number(stream.viewer_count || 0).toLocaleString();
  if (els.statPeak) els.statPeak.textContent = Number(stream.peak_viewers || 0).toLocaleString();
  if (els.statRevenue) els.statRevenue.textContent = money(stream.total_revenue_cents || 0);

  if (els.detailId) els.detailId.textContent = stream.id || "—";
  if (els.detailSlug) els.detailSlug.textContent = stream.slug || "—";
  if (els.detailRoom) els.detailRoom.textContent = stream.livekit_room_name || stream.room_name || "—";
  if (els.detailStarted) els.detailStarted.textContent = safeDate(stream.started_at);

  if (els.creatorLink) {
    els.creatorLink.href = stream.creator_id
      ? `/profile.html?id=${encodeURIComponent(stream.creator_id)}`
      : "/profile.html";
  }

  renderGate(stream);
}

async function renderGate(stream) {
  const access = stream.access_type || "free";
  const price = Number(stream.price_cents || 0);

  if (access === "free" || price <= 0) {
    accessGranted = true;
    if (els.gateTitle) els.gateTitle.textContent = "Free room access";
    if (els.gateCopy) els.gateCopy.textContent = "This room is open. Tap in and enjoy the Bizness Party.";
    if (els.unlockBtn) els.unlockBtn.textContent = "Room Open";
    enableRoomTools();
    return;
  }

  accessGranted = false;

  if (els.gateTitle) els.gateTitle.textContent = "Paid / VIP room";
  if (els.gateCopy) els.gateCopy.textContent = `Unlock this room for ${money(price)} or use VIP access.`;
  if (els.unlockBtn) els.unlockBtn.textContent = `Unlock ${money(price)}`;

  const user = await getUser();
  if (!user?.id) return;

  const { data } = await supabase
    .from("live_stream_purchases")
    .select("*")
    .eq("stream_id", stream.id)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .maybeSingle();

  if (data) {
    accessGranted = true;
    if (els.gateTitle) els.gateTitle.textContent = "Access unlocked";
    if (els.gateCopy) els.gateCopy.textContent = "You already unlocked this Bizness Party.";
    enableRoomTools();
  }
}

function enableRoomTools() {
  if (els.chatInput) els.chatInput.disabled = false;
  if (els.sendChatBtn) els.sendChatBtn.disabled = false;
  els.emptyState?.classList.add("is-hidden");
}

async function unlockRoom() {
  if (!activeStream) return;

  const user = await getUser();
  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }

  const price = Number(activeStream.price_cents || 0);
  if ((activeStream.access_type || "free") === "free" || price <= 0) {
    accessGranted = true;
    enableRoomTools();
    setStatus("Room open.", "success");
    return;
  }

  setStatus("Creating checkout...");

  const res = await fetch("/api/live-stream-purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      streamId: activeStream.id,
      userId: user.id,
      successUrl: `${location.origin}/watch.html?slug=${encodeURIComponent(activeStream.slug || "")}`,
      cancelUrl: location.href
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.url) {
    setStatus(data?.error || "Could not create checkout.", "error");
    return;
  }

  window.location.href = data.url;
}

async function connectLiveKit() {
  if (!activeStream || !accessGranted) return;

  const roomName = activeStream.livekit_room_name || activeStream.room_name;
  if (!roomName) {
    setStatus("No LiveKit room name on this stream yet.");
    return;
  }

  const user = await getUser();
  const identity = user?.id || `viewer-${crypto.randomUUID()}`;

  try {
    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName,
        identity,
        name: user?.email || "Rich Bizness Viewer",
        role: "viewer"
      })
    });

    const tokenData = await res.json();

    if (!res.ok || !tokenData?.token || !tokenData?.url) {
      setStatus(tokenData?.error || "LiveKit token failed.", "error");
      return;
    }

    const LiveKit = await import("https://esm.sh/livekit-client@2");
    livekitRoom = new LiveKit.Room();

    livekitRoom.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video" && els.video) {
        track.attach(els.video);
        els.video.style.display = "block";
        els.emptyState?.classList.add("is-hidden");
      }

      if (track.kind === "audio") {
        const audio = track.attach();
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
    });

    await livekitRoom.connect(tokenData.url, tokenData.token);
    setStatus("Connected to live room.", "success");
  } catch (error) {
    console.warn("[watch] LiveKit connect skipped:", error);
    setStatus("Watch loaded. LiveKit is not connected yet.", "error");
  }
}

async function loadChat() {
  if (!activeStream?.id || !els.chatList) return;

  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("*, profiles:user_id (*)")
    .eq("stream_id", activeStream.id)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) {
    els.chatList.innerHTML = `<div class="watch-empty-box"><strong>Chat unavailable.</strong><span>${escapeHtml(error.message)}</span></div>`;
    return;
  }

  if (!data?.length) {
    els.chatList.innerHTML = `
      <div class="watch-empty-box">
        <strong>No chat yet.</strong>
        <span>Be the first to talk in the room.</span>
      </div>
    `;
    return;
  }

  els.chatList.innerHTML = data.map((msg) => {
    const name =
      msg.profiles?.display_name ||
      msg.profiles?.username ||
      "Rich Viewer";

    return `
      <article class="chat-message">
        <img src="${escapeHtml(msg.profiles?.avatar_url || "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png")}" alt="" />
        <div>
          <strong>${escapeHtml(name)}</strong>
          <p>${escapeHtml(msg.body || msg.message || "")}</p>
          <span>${safeDate(msg.created_at)}</span>
        </div>
      </article>
    `;
  }).join("");

  els.chatList.scrollTop = els.chatList.scrollHeight;
}

async function sendChat(event) {
  event.preventDefault();

  if (!activeStream?.id) return;

  const user = await getUser();
  if (!user?.id) {
    window.location.href = "/auth.html";
    return;
  }

  const body = els.chatInput?.value?.trim();
  if (!body) return;

  els.chatInput.value = "";

  const { error } = await supabase.from("live_chat_messages").insert({
    stream_id: activeStream.id,
    user_id: user.id,
    body,
    created_at: new Date().toISOString()
  });

  if (error) {
    setStatus(error.message || "Could not send chat.", "error");
    return;
  }

  await loadChat();
}

function subscribeChat() {
  if (!activeStream?.id) return;

  if (chatChannel) supabase.removeChannel(chatChannel);

  chatChannel = supabase
    .channel(`watch-chat-${activeStream.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${activeStream.id}`
      },
      () => loadChat()
    )
    .subscribe();
}

function burstReaction(emoji) {
  if (!els.reactionBurst) return;

  const item = document.createElement("span");
  item.className = "reaction-float";
  item.textContent = emoji;
  item.style.left = `${15 + Math.random() * 70}%`;
  item.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;

  els.reactionBurst.appendChild(item);

  setTimeout(() => item.remove(), 3500);
}

async function sendReaction(emoji) {
  burstReaction(emoji);

  if (!activeStream?.id) return;

  const user = await getUser();

  await supabase.from("live_reactions").insert({
    stream_id: activeStream.id,
    user_id: user?.id || null,
    reaction: emoji,
    created_at: new Date().toISOString()
  }).catch(() => {});
}

async function sendDM() {
  const body = els.dmInput?.value?.trim();

  if (!body || !activeStream?.creator_id) return;

  const user = await getUser();
  if (!user?.id) {
    window.location.href = "/auth.html";
    return;
  }

  if (els.dmStatus) els.dmStatus.textContent = "Sending Slide In...";

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({ created_by: user.id, title: "Live Slide In", is_group: false })
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
    message_type: "live_slide_in",
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

async function loadCohosts() {
  if (!activeStream?.id) return;

  const { data } = await supabase
    .from("live_stream_members")
    .select("*, profiles:user_id (*)")
    .eq("stream_id", activeStream.id)
    .in("role", ["cohost", "moderator"])
    .eq("is_active", true)
    .limit(3);

  for (let i = 1; i <= 3; i++) {
    const member = data?.[i - 1];
    const nameEl = $(`cohost-name-${i}`);
    const roleEl = $(`cohost-role-${i}`);

    if (nameEl) {
      nameEl.textContent =
        member?.profiles?.display_name ||
        member?.profiles?.username ||
        "Empty slot";
    }

    if (roleEl) {
      roleEl.textContent = member?.role || "Waiting";
    }
  }
}

function toggleMeta(on) {
  document.body.classList.toggle("meta-vision-on", on);
  if (els.metaLabel) els.metaLabel.textContent = on ? "Meta Vision Active" : "Meta Room Ready";
}

async function copyLink() {
  await navigator.clipboard.writeText(location.href);
  setStatus("Watch link copied.", "success");
}

function bindEvents() {
  els.unlockBtn?.addEventListener("click", unlockRoom);
  els.refreshBtn?.addEventListener("click", bootWatch);
  els.copyLinkBtn?.addEventListener("click", copyLink);
  els.refreshChatBtn?.addEventListener("click", loadChat);
  els.chatForm?.addEventListener("submit", sendChat);
  els.dmBtn?.addEventListener("click", sendDM);
  els.enterMetaBtn?.addEventListener("click", () => toggleMeta(true));
  els.exitMetaBtn?.addEventListener("click", () => toggleMeta(false));

  document.querySelectorAll(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", () => sendReaction(btn.dataset.reaction || "🔥"));
  });
}

async function countViewerSession() {
  if (!activeStream?.id) return;

  await supabase.from("live_view_sessions").insert({
    stream_id: activeStream.id,
    user_id: currentUser?.id || null,
    started_at: new Date().toISOString()
  }).catch(() => {});
}

async function bootWatch() {
  setStatus("Loading watch room...");

  await getUser();

  const stream = await loadStream();
  if (!stream) return;

  await renderGate(stream);
  await loadChat();
  subscribeChat();
  await loadCohosts();
  await countViewerSession();

  if (accessGranted) {
    await connectLiveKit();
  }

  await bootLiveRail({
    railElementId: "watch-live-rail",
    limit: 4,
    autoRefresh: true,
    intervalMs: 15000,
    channelKey: "watch"
  });

  setStatus("Watch room ready.", "success");
}

bindEvents();

bootWatch().catch((error) => {
  console.error("[watch] boot error:", error);
  setStatus(error.message || "Could not load watch room.", "error");
});
