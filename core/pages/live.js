// =========================
// RICH BIZNESS LIVE — FINAL
// /core/pages/live.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("live-status-message"),

  previewVideo: $("live-preview-video"),
  previewStage: $("live-preview-stage"),

  startCameraBtn: $("start-camera-btn"),
  stopCameraBtn: $("stop-camera-btn"),
  createLiveBtn: $("create-live-btn"),
  goLiveBtn: $("go-live-btn"),
  endLiveBtn: $("end-live-btn"),
  openWatchBtn: $("open-watch-btn"),
  copyWatchBtn: $("copy-watch-link-btn"),
  refreshBtn: $("refresh-current-stream-btn"),
  clearBtn: $("clear-live-form-btn"),

  title: $("live-title"),
  description: $("live-description"),
  category: $("live-category"),
  accessType: $("live-access-type"),
  price: $("live-price"),
  thumbnailUrl: $("live-thumbnail-url"),
  coverUrl: $("live-cover-url"),
  roomName: $("live-room-name"),
  chatEnabled: $("live-chat-enabled"),
  replayEnabled: $("live-replay-enabled"),
  featured: $("live-featured"),
  scheduled: $("live-scheduled"),

  statStatus: $("live-stat-status"),
  statSlug: $("live-stat-slug"),
  statViewers: $("live-stat-viewers"),
  statRevenue: $("live-stat-revenue"),

  detailId: $("current-stream-id"),
  detailWatchUrl: $("current-watch-url"),
  detailRoom: $("current-room-name"),
  detailTimes: $("current-stream-times"),

  cohostUserId: $("cohost-user-id"),
  cohostSlot: $("cohost-slot"),
  inviteCohostBtn: $("invite-cohost-btn"),
  refreshCohostBtn: $("refresh-cohosts-btn"),
  cohostStatus: $("cohost-status"),

  metaTheme: $("meta-room-theme"),
  metaLabel: $("meta-room-label"),
  enterMetaBtn: $("enter-meta-btn"),
  exitMetaBtn: $("exit-meta-btn"),
  metaStatus: $("meta-status"),

  recentList: $("recent-live-streams")
};

let localStream = null;
let livekitRoom = null;
let currentStream = null;

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

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function makeSlug(title = "go-live") {
  return `${slugify(title) || "go-live"}-${Date.now()}`;
}

function makeRoomName() {
  return `bizness-party-${Date.now()}`;
}

function watchUrl(stream = currentStream) {
  if (!stream) return "";
  const slug = stream.slug || "";
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(slug)}`;
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

async function requireUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return null;
  }

  return currentUser;
}

function getFormPayload() {
  const title = els.title?.value?.trim() || "WE LIT 🔥";
  const roomName = els.roomName?.value?.trim() || makeRoomName();

  return {
    creator_id: currentUser.id,
    title,
    description: els.description?.value?.trim() || null,
    category: els.category?.value || "music",
    access_type: els.accessType?.value || "free",
    price_cents: Math.round(Number(els.price?.value || 0) * 100),
    currency: "usd",
    thumbnail_url: els.thumbnailUrl?.value?.trim() || null,
    cover_url: els.coverUrl?.value?.trim() || null,
    livekit_room_name: roomName,
    slug: currentStream?.slug || makeSlug(title),
    is_chat_enabled: Boolean(els.chatEnabled?.checked ?? true),
    is_featured: Boolean(els.featured?.checked ?? false),
    metadata: {
      replay_enabled: Boolean(els.replayEnabled?.checked ?? true),
      schedule_mode: Boolean(els.scheduled?.checked ?? false),
      meta_theme: els.metaTheme?.value || "Money Road",
      meta_label: els.metaLabel?.value || "Meta Room Ready"
    },
    updated_at: new Date().toISOString()
  };
}

function hydrateForm(stream) {
  if (!stream) return;

  if (els.title) els.title.value = stream.title || "";
  if (els.description) els.description.value = stream.description || "";
  if (els.category) els.category.value = stream.category || stream.lane || "music";
  if (els.accessType) els.accessType.value = stream.access_type || "free";
  if (els.price) els.price.value = Number(stream.price_cents || 0) / 100;
  if (els.thumbnailUrl) els.thumbnailUrl.value = stream.thumbnail_url || "";
  if (els.coverUrl) els.coverUrl.value = stream.cover_url || "";
  if (els.roomName) els.roomName.value = stream.livekit_room_name || "";
  if (els.chatEnabled) els.chatEnabled.checked = stream.is_chat_enabled !== false;
  if (els.featured) els.featured.checked = Boolean(stream.is_featured);
  if (els.replayEnabled) els.replayEnabled.checked = Boolean(stream.metadata?.replay_enabled ?? true);
  if (els.scheduled) els.scheduled.checked = Boolean(stream.metadata?.schedule_mode ?? false);
  if (els.metaTheme) els.metaTheme.value = stream.metadata?.meta_theme || "Money Road";
  if (els.metaLabel) els.metaLabel.value = stream.metadata?.meta_label || "Meta Room Ready";
}

function renderCurrentStream(stream) {
  currentStream = stream || null;

  if (!stream) {
    if (els.statStatus) els.statStatus.textContent = "In The Lab";
    if (els.statSlug) els.statSlug.textContent = "—";
    if (els.statViewers) els.statViewers.textContent = "0";
    if (els.statRevenue) els.statRevenue.textContent = "$0.00";
    if (els.detailId) els.detailId.textContent = "—";
    if (els.detailWatchUrl) els.detailWatchUrl.textContent = "—";
    if (els.detailRoom) els.detailRoom.textContent = "—";
    if (els.detailTimes) els.detailTimes.textContent = "No live record yet.";
    return;
  }

  if (els.statStatus) els.statStatus.textContent = stream.status || "draft";
  if (els.statSlug) els.statSlug.textContent = stream.slug || "—";
  if (els.statViewers) els.statViewers.textContent = Number(stream.viewer_count || 0).toLocaleString();
  if (els.statRevenue) els.statRevenue.textContent = money(stream.total_revenue_cents || 0);

  if (els.detailId) els.detailId.textContent = stream.id || "—";
  if (els.detailWatchUrl) els.detailWatchUrl.textContent = watchUrl(stream);
  if (els.detailRoom) els.detailRoom.textContent = stream.livekit_room_name || "—";
  if (els.detailTimes) {
    els.detailTimes.textContent =
      `Created: ${safeDate(stream.created_at)} | Started: ${safeDate(stream.started_at)} | Ended: ${safeDate(stream.ended_at)}`;
  }

  hydrateForm(stream);
  renderRecentStreams();
}

async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    if (els.previewVideo) {
      els.previewVideo.srcObject = localStream;
      els.previewVideo.muted = true;
      els.previewVideo.playsInline = true;
      await els.previewVideo.play();
    }

    setStatus("Camera active. You ready to call the madness.", "success");
  } catch (error) {
    setStatus(error.message || "Camera failed.", "error");
  }
}

function stopCamera() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (els.previewVideo) {
    els.previewVideo.pause();
    els.previewVideo.srcObject = null;
  }

  setStatus("Camera cut. Itz over ✌🏽");
}

async function createOrUpdateStream() {
  const user = await requireUser();
  if (!user?.id) return;

  const payload = {
    ...getFormPayload(),
    status: currentStream?.status || "draft"
  };

  setStatus("Creating Madness Call...");

  if (currentStream?.id) {
    const { data, error } = await supabase
      .from("live_streams")
      .update(payload)
      .eq("id", currentStream.id)
      .select("*")
      .single();

    if (error) {
      setStatus(error.message || "Could not update stream.", "error");
      return;
    }

    renderCurrentStream(data);
    setStatus("Madness Call updated.", "success");
    return;
  }

  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      ...payload,
      status: "draft",
      viewer_count: 0,
      peak_viewers: 0,
      total_revenue_cents: 0,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    setStatus(error.message || "Could not create stream.", "error");
    return;
  }

  currentStream = data;

  await supabase.from("live_stream_members").insert({
    stream_id: data.id,
    user_id: user.id,
    role: "host",
    is_active: true,
    status: "active",
    metadata: { slot_number: 0 },
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }).catch(() => {});

  renderCurrentStream(data);
  setStatus("Madness Call created. Watch link is ready.", "success");
}

async function connectLiveKitAsHost() {
  if (!currentStream?.livekit_room_name) {
    setStatus("Create a Madness Call first.", "error");
    return;
  }

  if (!localStream) {
    await startCamera();
  }

  try {
    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: currentStream.livekit_room_name,
        identity: currentUser.id,
        name: currentUser.email || "Rich Bizness Host",
        role: "host"
      })
    });

    const tokenData = await res.json();

    if (!res.ok || !tokenData?.token || !tokenData?.url) {
      setStatus(tokenData?.error || "LiveKit token failed.", "error");
      return false;
    }

    const LiveKit = await import("https://esm.sh/livekit-client@2");
    livekitRoom = new LiveKit.Room();

    await livekitRoom.connect(tokenData.url, tokenData.token);

    if (localStream) {
      for (const track of localStream.getTracks()) {
        await livekitRoom.localParticipant.publishTrack(track);
      }
    }

    setStatus("We 🔥 📺 — LiveKit room connected.", "success");
    return true;
  } catch (error) {
    setStatus(error.message || "LiveKit connection failed.", "error");
    return false;
  }
}

async function goLiveNow() {
  const user = await requireUser();
  if (!user?.id) return;

  if (!currentStream?.id) {
    await createOrUpdateStream();
  }

  if (!currentStream?.id) return;

  setStatus("Going live...");

  const connected = await connectLiveKitAsHost();

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      status: "live",
      started_at: currentStream.started_at || new Date().toISOString(),
      ended_at: null,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) {
    setStatus(error.message || "Could not update stream live.", "error");
    return;
  }

  renderCurrentStream(data);

  if (connected) {
    setStatus("We 🔥 📺 — your Bizness Party is live.", "success");
  } else {
    setStatus("Stream marked live, but LiveKit needs attention.", "error");
  }
}

async function endLive() {
  if (!currentStream?.id) {
    setStatus("No current stream to end.", "error");
    return;
  }

  setStatus("Ending Bizness Party...");

  if (livekitRoom) {
    await livekitRoom.disconnect();
    livekitRoom = null;
  }

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) {
    setStatus(error.message || "Could not end live.", "error");
    return;
  }

  await supabase
    .from("live_stream_members")
    .update({
      is_active: false,
      status: "left",
      left_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("stream_id", currentStream.id)
    .eq("user_id", currentUser.id)
    .catch(() => {});

  renderCurrentStream(data);
  setStatus("Party’s Over. Stream ended clean.", "success");
}

function openWatch() {
  if (!currentStream?.slug) {
    setStatus("Create a Madness Call first.", "error");
    return;
  }

  window.location.href = watchUrl(currentStream);
}

async function copyWatchLink() {
  if (!currentStream?.slug) {
    setStatus("Create a Madness Call first.", "error");
    return;
  }

  await navigator.clipboard.writeText(watchUrl(currentStream));
  setStatus("Watch link copied.", "success");
}

async function loadLatestStream() {
  const user = await requireUser();
  if (!user?.id) return;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    setStatus(error.message || "Could not load recent stream.", "error");
    return;
  }

  if (!data?.length) {
    renderCurrentStream(null);
    setStatus("Ready.");
    return;
  }

  renderCurrentStream(data[0]);
  setStatus("Current stream loaded.", "success");
}

async function renderRecentStreams() {
  if (!els.recentList || !currentUser?.id) return;

  const { data } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (!data?.length) {
    els.recentList.innerHTML = `
      <div class="live-empty-card">
        <strong>No recent streams yet.</strong>
        <span>Create your first Madness Call.</span>
      </div>
    `;
    return;
  }

  els.recentList.innerHTML = data.map((stream) => `
    <article class="recent-live-card">
      <strong>${stream.title || "Untitled live"}</strong>
      <span>${stream.status || "draft"} • ${stream.category || "music"} • ${Number(stream.viewer_count || 0)} viewers</span>
      <div class="recent-live-actions">
        <button class="btn-ghost" type="button" data-load-stream="${stream.id}">Load</button>
        <a class="btn-ghost" href="/watch.html?slug=${encodeURIComponent(stream.slug || "")}">Watch</a>
      </div>
    </article>
  `).join("");
}

async function loadStreamById(id) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    setStatus(error.message || "Could not load stream.", "error");
    return;
  }

  renderCurrentStream(data);
  setStatus("Stream loaded.", "success");
}

async function inviteCohost() {
  if (!currentStream?.id) {
    setStatus("Create or load a stream first.", "error");
    return;
  }

  const userId = els.cohostUserId?.value?.trim();
  const slot = Number(els.cohostSlot?.value || 1);

  if (!userId) {
    setStatus("Paste Rich Playa user UUID first.", "error");
    return;
  }

  const { error } = await supabase.from("live_stream_members").upsert(
    {
      stream_id: currentStream.id,
      user_id: userId,
      role: "cohost",
      is_active: true,
      status: "invited",
      metadata: { slot_number: slot },
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "stream_id,user_id" }
  );

  if (error) {
    setStatus(error.message || "Could not invite Rich Playa.", "error");
    return;
  }

  setStatus(`Rich Playa ${slot} invited.`, "success");
  await loadCohosts();
}

async function loadCohosts() {
  if (!currentStream?.id || !els.cohostStatus) return;

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*, profiles:user_id (*)")
    .eq("stream_id", currentStream.id)
    .in("role", ["cohost", "moderator"])
    .eq("is_active", true);

  if (error) {
    els.cohostStatus.textContent = error.message;
    return;
  }

  const slots = [1, 2, 3].map((slot) => {
    const member = data?.find((item) => Number(item.metadata?.slot_number) === slot);
    const name =
      member?.profiles?.display_name ||
      member?.profiles?.username ||
      member?.user_id ||
      "Empty slot";

    return `<strong>Rich Playa ${slot}</strong> ${name}`;
  });

  els.cohostStatus.innerHTML = slots.join("<br />");
}

function enterMetaVision() {
  document.body.classList.add("meta-vision-on");
  if (els.metaStatus) els.metaStatus.textContent = "Meta Vision active.";
}

function exitMetaVision() {
  document.body.classList.remove("meta-vision-on");
  if (els.metaStatus) els.metaStatus.textContent = "Meta Vision ready.";
}

function clearForm() {
  currentStream = null;
  [
    els.title,
    els.description,
    els.price,
    els.thumbnailUrl,
    els.coverUrl,
    els.roomName
  ].forEach((input) => {
    if (input) input.value = "";
  });

  renderCurrentStream(null);
  setStatus("Form cleared.");
}

function bindEvents() {
  els.startCameraBtn?.addEventListener("click", startCamera);
  els.stopCameraBtn?.addEventListener("click", stopCamera);
  els.createLiveBtn?.addEventListener("click", createOrUpdateStream);
  els.goLiveBtn?.addEventListener("click", goLiveNow);
  els.endLiveBtn?.addEventListener("click", endLive);
  els.openWatchBtn?.addEventListener("click", openWatch);
  els.copyWatchBtn?.addEventListener("click", copyWatchLink);
  els.refreshBtn?.addEventListener("click", loadLatestStream);
  els.clearBtn?.addEventListener("click", clearForm);
  els.inviteCohostBtn?.addEventListener("click", inviteCohost);
  els.refreshCohostBtn?.addEventListener("click", loadCohosts);
  els.enterMetaBtn?.addEventListener("click", enterMetaVision);
  els.exitMetaBtn?.addEventListener("click", exitMetaVision);

  els.recentList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-load-stream]");
    if (!btn) return;
    loadStreamById(btn.getAttribute("data-load-stream"));
  });
}

async function bootLive() {
  const user = await requireUser();
  if (!user?.id) return;

  bindEvents();
  await loadLatestStream();
  await renderRecentStreams();

  setStatus("Ready.", "success");
}

bootLive().catch((error) => {
  console.error("[live] boot error:", error);
  setStatus(error.message || "Could not load live studio.", "error");
});
