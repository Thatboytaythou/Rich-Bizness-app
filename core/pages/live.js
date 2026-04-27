// =========================
// RICH BIZNESS LIVE — FINAL LOCKED
// /core/pages/live.js
// Matches /live.html
// Core-only setup
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  previewVideo: $("studio-preview"),

  startCameraBtn: $("start-camera-btn"),
  stopCameraBtn: $("stop-camera-btn"),
  createLiveBtn: $("create-live-btn"),
  updateLiveBtn: $("update-live-btn"),
  goLiveBtn: $("go-live-btn"),
  endLiveBtn: $("end-live-btn"),
  endLiveTopBtn: $("end-live-top-btn"),

  openWatchBtn: $("open-watch-btn"),
  openWatchLiveBtn: $("open-watch-live-btn"),
  copyWatchBtn: $("copy-watch-link-btn"),
  copyWatchLiveBtn: $("copy-watch-live-btn"),

  refreshBtn: $("refresh-stream-btn"),
  clearBtn: $("clear-live-form-btn"),

  form: $("live-form"),
  statusBox: $("live-status-box"),

  title: $("live-title"),
  description: $("live-description"),
  category: $("live-category"),
  access: $("live-access"),
  price: $("live-price"),
  thumbnail: $("live-thumbnail"),
  cover: $("live-cover"),
  roomName: $("live-room-name"),

  chatEnabled: $("live-chat-enabled"),
  replayEnabled: $("live-replay-enabled"),
  featured: $("live-featured"),
  scheduledMode: $("live-scheduled-mode"),
  scheduleWrap: $("schedule-wrap"),
  scheduledFor: $("live-scheduled-for"),
  currency: $("live-currency"),

  badgeStatus: $("badge-status"),
  badgeAccess: $("badge-access"),
  badgeCategory: $("badge-category"),

  previewTitle: $("preview-title"),
  previewCopy: $("preview-copy"),

  setupActions: $("studio-setup-actions"),
  liveActions: $("studio-live-actions"),

  metaStatus: $("meta-status"),
  metaSlug: $("meta-slug"),
  metaViewers: $("meta-viewers"),
  metaRevenue: $("meta-revenue"),

  detailId: $("detail-stream-id"),
  detailWatchUrl: $("detail-watch-url"),
  detailRoomName: $("detail-room-name"),
  detailTimes: $("detail-times"),

  cohostStatusBox: $("cohost-status-box"),
  cohostUserId: $("cohost-user-id"),
  cohostSlot: $("cohost-slot"),
  bringEmInBtn: $("bring-em-in-btn"),
  refreshCohostBtn: $("refresh-cohosts-btn"),
  cohostList: $("cohost-list"),

  metaVisionStatus: $("meta-vision-status"),
  metaVisionTheme: $("meta-vision-theme"),
  metaVisionLabel: $("meta-vision-label"),
  enterMetaBtn: $("enter-meta-vision-btn"),
  exitMetaBtn: $("exit-meta-vision-btn"),

  recentList: $("recent-live-list"),

  dmPopup: $("live-dm-popup"),
  dmCloseBtn: $("live-dm-close-btn"),
  dmCancelBtn: $("live-dm-cancel-btn"),
  dmSendBtn: $("live-dm-send-btn"),
  dmBody: $("live-dm-body"),
  dmStatus: $("live-dm-status")
};

let localStream = null;
let livekitRoom = null;
let currentStream = null;

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;
  els.statusBox.textContent = message;
  els.statusBox.className = "status-box";
  if (type === "success") els.statusBox.classList.add("is-success");
  if (type === "error") els.statusBox.classList.add("is-error");
}

function setCohostStatus(message) {
  if (els.cohostStatusBox) els.cohostStatusBox.textContent = message;
}

function setMetaVisionStatus(message) {
  if (els.metaVisionStatus) els.metaVisionStatus.textContent = message;
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

function makeRoomName(title = "party") {
  return `rb-${slugify(title) || "party"}-${Date.now()}`;
}

function getWatchUrl(stream = currentStream) {
  if (!stream?.slug) return "";
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(stream.slug)}`;
}

async function requireUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (!currentUser?.id) {
    setStatus("Please sign in first.", "error");
    window.location.href = "/auth.html";
    return null;
  }

  return currentUser;
}

function getFormPayload() {
  const title = els.title?.value?.trim() || "WE LIT 🔥";
  const roomName =
    els.roomName?.value?.trim() ||
    currentStream?.livekit_room_name ||
    makeRoomName(title);

  return {
    creator_id: currentUser.id,
    title,
    description: els.description?.value?.trim() || null,
    category: els.category?.value || "music",
    status: currentStream?.status || "draft",
    access_type: els.access?.value || "free",
    price_cents: Math.round(Number(els.price?.value || 0) * 100),
    currency: (els.currency?.value?.trim() || "USD").toLowerCase(),
    thumbnail_url: els.thumbnail?.value?.trim() || null,
    cover_url: els.cover?.value?.trim() || null,
    livekit_room_name: roomName,
    slug: currentStream?.slug || makeSlug(title),
    scheduled_for: els.scheduledMode?.checked ? els.scheduledFor?.value || null : null,
    is_chat_enabled: Boolean(els.chatEnabled?.checked ?? true),
    is_replay_enabled: Boolean(els.replayEnabled?.checked ?? true),
    is_featured: Boolean(els.featured?.checked ?? false),
    metadata: {
      meta_theme: els.metaVisionTheme?.value || "money-road",
      meta_label: els.metaVisionLabel?.value || "Meta Room Ready"
    },
    updated_at: new Date().toISOString()
  };
}

function hydrateForm(stream) {
  if (!stream) return;

  if (els.title) els.title.value = stream.title || "";
  if (els.description) els.description.value = stream.description || "";
  if (els.category) els.category.value = stream.category || "music";
  if (els.access) els.access.value = stream.access_type || "free";
  if (els.price) els.price.value = Number(stream.price_cents || 0) / 100;
  if (els.thumbnail) els.thumbnail.value = stream.thumbnail_url || "";
  if (els.cover) els.cover.value = stream.cover_url || "";
  if (els.roomName) els.roomName.value = stream.livekit_room_name || "";
  if (els.currency) els.currency.value = (stream.currency || "usd").toUpperCase();

  if (els.chatEnabled) els.chatEnabled.checked = stream.is_chat_enabled !== false;
  if (els.replayEnabled) els.replayEnabled.checked = stream.is_replay_enabled !== false;
  if (els.featured) els.featured.checked = Boolean(stream.is_featured);

  if (els.scheduledMode) els.scheduledMode.checked = Boolean(stream.scheduled_for);
  if (els.scheduledFor) els.scheduledFor.value = stream.scheduled_for || "";

  if (els.metaVisionTheme) els.metaVisionTheme.value = stream.metadata?.meta_theme || "money-road";
  if (els.metaVisionLabel) els.metaVisionLabel.value = stream.metadata?.meta_label || "Meta Room Ready";

  toggleScheduleWrap();
}

function showLiveState(isLive) {
  if (els.setupActions) els.setupActions.style.display = isLive ? "none" : "";
  if (els.liveActions) {
    els.liveActions.hidden = false;
    els.liveActions.style.display = isLive ? "" : "none";
  }
}

function renderStream(stream) {
  currentStream = stream || null;

  if (!stream) {
    if (els.badgeStatus) els.badgeStatus.textContent = "IN THE LAB";
    if (els.badgeAccess) els.badgeAccess.textContent = "FREE";
    if (els.badgeCategory) els.badgeCategory.textContent = "MUSIC";

    if (els.previewTitle) els.previewTitle.textContent = "Rich Bizness Live Studio";
    if (els.previewCopy) els.previewCopy.textContent = "Build the room, test the camera, then call the madness.";

    if (els.metaStatus) els.metaStatus.textContent = "In The Lab";
    if (els.metaSlug) els.metaSlug.textContent = "—";
    if (els.metaViewers) els.metaViewers.textContent = "0";
    if (els.metaRevenue) els.metaRevenue.textContent = "$0.00";

    if (els.detailId) els.detailId.textContent = "—";
    if (els.detailWatchUrl) els.detailWatchUrl.textContent = "—";
    if (els.detailRoomName) els.detailRoomName.textContent = "—";
    if (els.detailTimes) els.detailTimes.textContent = "No live record yet.";

    showLiveState(false);
    return;
  }

  const isLive = stream.status === "live";

  if (els.badgeStatus) els.badgeStatus.textContent = isLive ? "LIVE" : String(stream.status || "draft").toUpperCase();
  if (els.badgeAccess) els.badgeAccess.textContent = String(stream.access_type || "free").toUpperCase();
  if (els.badgeCategory) els.badgeCategory.textContent = String(stream.category || "music").toUpperCase();

  if (els.previewTitle) els.previewTitle.textContent = stream.title || "Rich Bizness Live Studio";
  if (els.previewCopy) els.previewCopy.textContent = stream.description || "Build the room, test the camera, then call the madness.";

  if (els.metaStatus) els.metaStatus.textContent = stream.status || "draft";
  if (els.metaSlug) els.metaSlug.textContent = stream.slug || "—";
  if (els.metaViewers) els.metaViewers.textContent = Number(stream.viewer_count || 0).toLocaleString();
  if (els.metaRevenue) els.metaRevenue.textContent = money(stream.total_revenue_cents || 0);

  if (els.detailId) els.detailId.textContent = stream.id || "—";
  if (els.detailWatchUrl) els.detailWatchUrl.textContent = getWatchUrl(stream) || "—";
  if (els.detailRoomName) els.detailRoomName.textContent = stream.livekit_room_name || "—";
  if (els.detailTimes) {
    els.detailTimes.textContent =
      `Created: ${safeDate(stream.created_at)} | Started: ${safeDate(stream.started_at)} | Ended: ${safeDate(stream.ended_at)}`;
  }

  hydrateForm(stream);
  showLiveState(isLive);
}

function toggleScheduleWrap() {
  if (!els.scheduleWrap) return;
  els.scheduleWrap.style.display = els.scheduledMode?.checked ? "" : "none";
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera is not available in this browser.");
    }

    if (localStream) stopCamera(false);

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    if (els.previewVideo) {
      els.previewVideo.srcObject = localStream;
      els.previewVideo.muted = true;
      els.previewVideo.playsInline = true;
      await els.previewVideo.play().catch(() => {});
    }

    setStatus("Camera active. You ready to call the madness.", "success");
    return localStream;
  } catch (error) {
    console.error("[live] camera error:", error);
    setStatus(error.message || "Camera failed.", "error");
    return null;
  }
}

function stopCamera(showMessage = true) {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (els.previewVideo) {
    els.previewVideo.pause();
    els.previewVideo.srcObject = null;
  }

  if (showMessage) setStatus("Camera cut. Itz over ✌🏽");
}

async function createOrUpdateStream(event) {
  event?.preventDefault?.();

  const user = await requireUser();
  if (!user?.id) return null;

  setStatus(currentStream?.id ? "Saving live setup..." : "Creating Madness Call...");

  const payload = getFormPayload();

  if (currentStream?.id) {
    const { data, error } = await supabase
      .from("live_streams")
      .update(payload)
      .eq("id", currentStream.id)
      .select("*")
      .single();

    if (error) {
      setStatus(error.message || "Could not save live setup.", "error");
      return null;
    }

    renderStream(data);
    await renderRecentStreams();
    await loadCohosts();
    setStatus("Live setup saved. Watch link ready.", "success");
    return data;
  }

  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      ...payload,
      status: "draft",
      viewer_count: 0,
      peak_viewers: 0,
      total_chat_messages: 0,
      total_revenue_cents: 0,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    setStatus(error.message || "Could not create live room.", "error");
    return null;
  }

  await supabase.from("live_stream_members").upsert(
    {
      stream_id: data.id,
      user_id: user.id,
      role: "host",
      is_active: true,
      status: "active",
      livekit_participant_identity: user.id,
      metadata: { slot_number: 0, label: "Host" },
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "stream_id,user_id" }
  ).catch(() => {});

  renderStream(data);
  await renderRecentStreams();
  await loadCohosts();

  setStatus("Madness Call created. Watch link is ready.", "success");
  return data;
}

async function getSessionAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function connectLiveKitAsHost() {
  if (!currentStream?.livekit_room_name) {
    setStatus("Create a Madness Call first.", "error");
    return false;
  }

  const user = await requireUser();
  if (!user?.id) return false;

  if (!localStream) {
    const stream = await startCamera();
    if (!stream) return false;
  }

  try {
    const accessToken = await getSessionAccessToken();

    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        streamId: currentStream.id,
        roomName: currentStream.livekit_room_name,
        participantName: user.id,
        participantMetadata: {
          role: "host",
          streamId: currentStream.id,
          title: currentStream.title
        },
        role: "host",
        canPublish: true,
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

    livekitRoom.on(LiveKit.RoomEvent.Disconnected, () => {
      setStatus("LiveKit disconnected.");
    });

    await livekitRoom.connect(tokenData.url, tokenData.token);

    for (const track of localStream.getTracks()) {
      await livekitRoom.localParticipant.publishTrack(track);
    }

    setStatus("We 🔥 📺 — LiveKit connected.", "success");
    return true;
  } catch (error) {
    console.error("[live] livekit error:", error);
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
    setStatus(error.message || "Could not mark stream live.", "error");
    return;
  }

  renderStream(data);
  await renderRecentStreams();

  setStatus(
    connected ? "We 🔥 📺 — your Bizness Party is live." : "Stream saved live, but camera token failed.",
    connected ? "success" : "error"
  );
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

  stopCamera(false);

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

  renderStream(data);
  await renderRecentStreams();

  setStatus("Party’s Over. Stream ended clean.", "success");
}

function openWatch() {
  if (!currentStream?.slug) {
    setStatus("Create a Madness Call first.", "error");
    return;
  }

  window.location.href = getWatchUrl(currentStream);
}

async function copyWatchLink() {
  if (!currentStream?.slug) {
    setStatus("Create a Madness Call first.", "error");
    return;
  }

  await navigator.clipboard.writeText(getWatchUrl(currentStream));
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
    setStatus(error.message || "Could not load current stream.", "error");
    return;
  }

  if (!data?.length) {
    renderStream(null);
    setStatus("Ready.", "success");
    return;
  }

  renderStream(data[0]);
  await loadCohosts();
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
    els.recentList.innerHTML = `<div class="status-box">No recent streams yet.</div>`;
    return;
  }

  els.recentList.innerHTML = data.map((stream) => `
    <article class="recent-live-card">
      <strong>${stream.title || "Untitled live"}</strong>
      <span>${stream.status || "draft"} • ${stream.category || "music"} • ${Number(stream.viewer_count || 0)} viewers</span>
      <div class="recent-live-actions">
        <button class="btn btn-dark" type="button" data-load-stream="${stream.id}">Load</button>
        <a class="btn btn-dark" href="/watch.html?slug=${encodeURIComponent(stream.slug || "")}">Watch</a>
      </div>
    </article>
  `).join("");
}

async function loadStreamById(id) {
  if (!id) return;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    setStatus(error.message || "Could not load stream.", "error");
    return;
  }

  renderStream(data);
  await loadCohosts();
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

  const { error } = await supabase
    .from("live_stream_members")
    .upsert(
      {
        stream_id: currentStream.id,
        user_id: userId,
        role: "cohost",
        is_active: true,
        status: "invited",
        livekit_participant_identity: userId,
        metadata: {
          slot_number: slot,
          label: `Rich Playa ${slot}`
        },
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
  if (!currentStream?.id || !els.cohostList) return;

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", currentStream.id)
    .in("role", ["cohost", "moderator"])
    .eq("is_active", true);

  if (error) {
    setCohostStatus(error.message);
    return;
  }

  els.cohostList.innerHTML = [1, 2, 3].map((slot) => {
    const member = data?.find((item) => Number(item.metadata?.slot_number) === slot);

    const name =
      member?.profiles?.display_name ||
      member?.profiles?.username ||
      member?.user_id ||
      "Empty slot";

    const status = member?.status || "Waiting";

    return `
      <article class="cohost-card">
        <strong>Rich Playa ${slot}</strong>
        <span>${name}</span>
        <small>${status}</small>
      </article>
    `;
  }).join("");

  setCohostStatus("Rich Playa system ready.");
}

function enterMetaVision() {
  document.body.classList.add("meta-vision-on");
  setMetaVisionStatus("Meta Vision active.");
}

function exitMetaVision() {
  document.body.classList.remove("meta-vision-on");
  setMetaVisionStatus("Meta Vision ready.");
}

function clearForm() {
  currentStream = null;
  els.form?.reset();

  if (els.chatEnabled) els.chatEnabled.checked = true;
  if (els.replayEnabled) els.replayEnabled.checked = true;
  if (els.currency) els.currency.value = "USD";

  toggleScheduleWrap();
  renderStream(null);
  setStatus("Form cleared.", "success");
}

function closeDmPopup() {
  if (els.dmPopup) els.dmPopup.hidden = true;
}

async function sendLiveDM() {
  const body = els.dmBody?.value?.trim();

  if (!body) {
    if (els.dmStatus) els.dmStatus.textContent = "Type a message first.";
    return;
  }

  if (!currentStream?.creator_id) {
    if (els.dmStatus) els.dmStatus.textContent = "Create or load a stream first.";
    return;
  }

  const user = await requireUser();
  if (!user?.id) return;

  if (els.dmStatus) els.dmStatus.textContent = "Sending Slide In...";

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({
      created_by: user.id,
      title: "Live Slide In",
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
    { thread_id: thread.id, user_id: currentStream.creator_id }
  ]);

  const { error } = await supabase.from("dm_messages").insert({
    thread_id: thread.id,
    sender_id: user.id,
    body,
    message_type: "live_slide_in",
    metadata: { stream_id: currentStream.id },
    created_at: new Date().toISOString()
  });

  if (error) {
    if (els.dmStatus) els.dmStatus.textContent = error.message;
    return;
  }

  els.dmBody.value = "";
  if (els.dmStatus) els.dmStatus.textContent = "Slide In sent.";
}

function bindEvents() {
  els.startCameraBtn?.addEventListener("click", startCamera);
  els.stopCameraBtn?.addEventListener("click", () => stopCamera(true));

  els.form?.addEventListener("submit", createOrUpdateStream);
  els.createLiveBtn?.addEventListener("click", createOrUpdateStream);
  els.updateLiveBtn?.addEventListener("click", createOrUpdateStream);

  els.goLiveBtn?.addEventListener("click", goLiveNow);
  els.endLiveBtn?.addEventListener("click", endLive);
  els.endLiveTopBtn?.addEventListener("click", endLive);

  els.openWatchBtn?.addEventListener("click", openWatch);
  els.openWatchLiveBtn?.addEventListener("click", openWatch);
  els.copyWatchBtn?.addEventListener("click", copyWatchLink);
  els.copyWatchLiveBtn?.addEventListener("click", copyWatchLink);

  els.refreshBtn?.addEventListener("click", loadLatestStream);
  els.clearBtn?.addEventListener("click", clearForm);

  els.scheduledMode?.addEventListener("change", toggleScheduleWrap);

  els.bringEmInBtn?.addEventListener("click", inviteCohost);
  els.refreshCohostBtn?.addEventListener("click", loadCohosts);

  els.enterMetaBtn?.addEventListener("click", enterMetaVision);
  els.exitMetaBtn?.addEventListener("click", exitMetaVision);

  els.dmCloseBtn?.addEventListener("click", closeDmPopup);
  els.dmCancelBtn?.addEventListener("click", closeDmPopup);
  els.dmSendBtn?.addEventListener("click", sendLiveDM);

  els.recentList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-load-stream]");
    if (!btn) return;
    loadStreamById(btn.getAttribute("data-load-stream"));
  });
}

async function bootLive() {
  setStatus("Loading live studio...");

  const user = await requireUser();
  if (!user?.id) return;

  bindEvents();
  toggleScheduleWrap();
  showLiveState(false);

  await loadLatestStream();
  await renderRecentStreams();

  setStatus("Ready.", "success");
}

bootLive().catch((error) => {
  console.error("[live] boot error:", error);
  setStatus(error.message || "Could not load live studio.", "error");
});
