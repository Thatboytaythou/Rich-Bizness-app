import { initApp, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase } from "/core/supabase.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  navMount: $("elite-platform-nav"),
  previewVideo: $("studio-preview"),
  liveForm: $("live-form"),
  statusBox: $("live-status-box"),
  recentLiveList: $("recent-live-list"),

  setupActions: $("studio-setup-actions"),
  liveActions: $("studio-live-actions"),

  startCameraBtn: $("start-camera-btn"),
  stopCameraBtn: $("stop-camera-btn"),
  createLiveBtn: $("create-live-btn"),
  updateLiveBtn: $("update-live-btn"),
  goLiveBtn: $("go-live-btn"),
  endLiveBtn: $("end-live-btn"),
  endLiveTopBtn: $("end-live-top-btn"),
  refreshStreamBtn: $("refresh-stream-btn"),
  clearLiveFormBtn: $("clear-live-form-btn"),
  openWatchBtn: $("open-watch-btn"),
  copyWatchLinkBtn: $("copy-watch-link-btn"),
  openWatchLiveBtn: $("open-watch-live-btn"),
  copyWatchLiveBtn: $("copy-watch-live-btn"),

  liveTitle: $("live-title"),
  liveDescription: $("live-description"),
  liveCategory: $("live-category"),
  liveAccess: $("live-access"),
  livePrice: $("live-price"),
  liveThumbnail: $("live-thumbnail"),
  liveCover: $("live-cover"),
  liveRoomName: $("live-room-name"),
  liveChatEnabled: $("live-chat-enabled"),
  liveReplayEnabled: $("live-replay-enabled"),
  liveFeatured: $("live-featured"),
  liveScheduledMode: $("live-scheduled-mode"),
  liveScheduledFor: $("live-scheduled-for"),
  liveCurrency: $("live-currency"),
  scheduleWrap: $("schedule-wrap"),

  badgeStatus: $("badge-status"),
  badgeAccess: $("badge-access"),
  badgeCategory: $("badge-category"),
  previewTitle: $("preview-title"),
  previewCopy: $("preview-copy"),

  metaStatus: $("meta-status"),
  metaSlug: $("meta-slug"),
  metaViewers: $("meta-viewers"),
  metaRevenue: $("meta-revenue"),

  detailStreamId: $("detail-stream-id"),
  detailWatchUrl: $("detail-watch-url"),
  detailRoomName: $("detail-room-name"),
  detailTimes: $("detail-times")
};

let currentStream = null;
let previewStream = null;

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;

  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");

  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function toMoney(cents = 0, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  }).format(Number(cents || 0) / 100);
}

function toCents(amount = 0) {
  return Math.round(Number(amount || 0) * 100);
}

function safeDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function watchHrefFromStream(stream) {
  if (!stream) return "/watch.html";
  if (stream.slug) return `/watch.html?slug=${encodeURIComponent(stream.slug)}`;
  if (stream.id) return `/watch.html?id=${encodeURIComponent(stream.id)}`;
  return "/watch.html";
}

function syncPreviewFromForm() {
  if (els.previewTitle) {
    els.previewTitle.textContent =
      els.liveTitle?.value?.trim() || "Rich Bizness Live Studio";
  }

  const access = String(els.liveAccess?.value || "free").toUpperCase();
  const category = String(els.liveCategory?.value || "live").toUpperCase();

  if (els.badgeAccess) els.badgeAccess.textContent = access;
  if (els.badgeCategory) els.badgeCategory.textContent = category;

  if (els.previewCopy) {
    els.previewCopy.textContent =
      els.liveDescription?.value?.trim() ||
      "Start camera preview, build your stream, save the stream record, then open the watch page.";
  }
}

function syncScheduleVisibility() {
  if (!els.scheduleWrap || !els.liveScheduledMode) return;
  els.scheduleWrap.style.display = els.liveScheduledMode.checked ? "grid" : "none";
}

function syncStudioActionState(stream) {
  const isLive = String(stream?.status || "").toLowerCase() === "live";

  els.setupActions?.classList.toggle("is-hidden", isLive);
  els.liveActions?.classList.toggle("is-visible", isLive);

  if (isLive && els.previewCopy) {
    els.previewCopy.textContent =
      "You are live now. Camera setup controls are hidden so viewers only see the live control state.";
  } else {
    syncPreviewFromForm();
  }
}

function fillFormFromStream(stream) {
  if (!stream) return;

  if (els.liveTitle) els.liveTitle.value = stream.title || "";
  if (els.liveDescription) els.liveDescription.value = stream.description || "";
  if (els.liveCategory) els.liveCategory.value = stream.category || "general";
  if (els.liveAccess) els.liveAccess.value = stream.access_type || "free";

  if (els.livePrice) {
    els.livePrice.value =
      Number(stream.price_cents || 0) > 0
        ? (Number(stream.price_cents || 0) / 100).toFixed(2)
        : "";
  }

  if (els.liveThumbnail) els.liveThumbnail.value = stream.thumbnail_url || "";
  if (els.liveCover) els.liveCover.value = stream.cover_url || "";
  if (els.liveRoomName) els.liveRoomName.value = stream.livekit_room_name || "";
  if (els.liveChatEnabled) els.liveChatEnabled.checked = !!stream.is_chat_enabled;
  if (els.liveReplayEnabled) els.liveReplayEnabled.checked = !!stream.is_replay_enabled;
  if (els.liveFeatured) els.liveFeatured.checked = !!stream.is_featured;
  if (els.liveCurrency) els.liveCurrency.value = stream.currency || "USD";

  if (stream.scheduled_for) {
    if (els.liveScheduledMode) els.liveScheduledMode.checked = true;

    const local = new Date(stream.scheduled_for);
    if (!Number.isNaN(local.getTime()) && els.liveScheduledFor) {
      const iso = new Date(local.getTime() - local.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      els.liveScheduledFor.value = iso;
    }
  } else {
    if (els.liveScheduledMode) els.liveScheduledMode.checked = false;
    if (els.liveScheduledFor) els.liveScheduledFor.value = "";
  }

  syncScheduleVisibility();
  syncPreviewFromForm();
  renderCurrentStream(stream);
}

function renderCurrentStream(stream) {
  currentStream = stream || null;

  const isLive = String(stream?.status || "draft").toLowerCase() === "live";

  if (els.badgeStatus) {
    els.badgeStatus.textContent = isLive
      ? "LIVE"
      : String(stream?.status || "draft").toUpperCase();

    els.badgeStatus.classList.toggle("is-live", isLive);
  }

  if (els.metaStatus) els.metaStatus.textContent = stream?.status || "draft";
  if (els.metaSlug) els.metaSlug.textContent = stream?.slug || "—";
  if (els.metaViewers) {
    els.metaViewers.textContent = Number(stream?.viewer_count || 0).toLocaleString();
  }
  if (els.metaRevenue) {
    els.metaRevenue.textContent = toMoney(
      stream?.total_revenue_cents || 0,
      stream?.currency || "USD"
    );
  }

  if (els.detailStreamId) els.detailStreamId.textContent = stream?.id || "—";
  if (els.detailWatchUrl) {
    els.detailWatchUrl.textContent = stream
      ? `${window.location.origin}${watchHrefFromStream(stream)}`
      : "—";
  }
  if (els.detailRoomName) els.detailRoomName.textContent = stream?.livekit_room_name || "—";
  if (els.detailTimes) {
    els.detailTimes.textContent = stream
      ? `Created: ${safeDateTime(stream.created_at)} | Started: ${safeDateTime(stream.started_at)} | Ended: ${safeDateTime(stream.ended_at)}`
      : "No live record yet.";
  }

  syncStudioActionState(stream);
}

function clearForm() {
  currentStream = null;

  els.liveForm?.reset();

  if (els.liveAccess) els.liveAccess.value = "free";
  if (els.liveCategory) els.liveCategory.value = "music";
  if (els.liveCurrency) els.liveCurrency.value = "USD";
  if (els.liveChatEnabled) els.liveChatEnabled.checked = true;
  if (els.liveReplayEnabled) els.liveReplayEnabled.checked = true;
  if (els.liveFeatured) els.liveFeatured.checked = false;
  if (els.liveScheduledMode) els.liveScheduledMode.checked = false;

  syncScheduleVisibility();
  syncPreviewFromForm();
  renderCurrentStream(null);

  if (els.badgeStatus) {
    els.badgeStatus.textContent = "OFFLINE";
    els.badgeStatus.classList.remove("is-live");
  }

  if (els.metaStatus) els.metaStatus.textContent = "Draft";

  setStatus("Form cleared.");
}

async function startCameraPreview() {
  try {
    if (previewStream) stopCameraPreview();

    previewStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    if (els.previewVideo) els.previewVideo.srcObject = previewStream;

    setStatus("Camera preview started.", "success");
  } catch (error) {
    console.error("[live] startCameraPreview error:", error);
    setStatus("Could not start camera preview. Check browser permissions.", "error");
  }
}

function stopCameraPreview() {
  if (!previewStream) return;

  previewStream.getTracks().forEach((track) => track.stop());

  if (els.previewVideo) els.previewVideo.srcObject = null;

  previewStream = null;
  setStatus("Camera preview stopped.");
}

function buildPayload({ statusOverride = null } = {}) {
  const user = getCurrentUserState();

  if (!user?.id) throw new Error("You must be logged in.");

  const title = els.liveTitle?.value?.trim() || "";
  const category = els.liveCategory?.value || "general";
  const accessType = els.liveAccess?.value || "free";
  const currency = (els.liveCurrency?.value || "USD").trim().toUpperCase();
  const roomNameRaw = els.liveRoomName?.value?.trim() || "";

  const scheduledEnabled = !!els.liveScheduledMode?.checked;
  const scheduledFor =
    scheduledEnabled && els.liveScheduledFor?.value
      ? new Date(els.liveScheduledFor.value).toISOString()
      : null;

  if (!title) throw new Error("Stream title is required.");

  const slugBase = slugify(title);
  const slug = currentStream?.slug || `${slugBase}-${Date.now()}`;

  return {
    creator_id: user.id,
    slug,
    title,
    description: els.liveDescription?.value?.trim() || null,
    category: category || "general",
    status: statusOverride || (scheduledFor ? "scheduled" : currentStream?.status || "draft"),
    access_type: accessType || "free",
    price_cents: accessType === "paid" ? toCents(els.livePrice?.value || 0) : 0,
    currency: currency || "USD",
    thumbnail_url: els.liveThumbnail?.value?.trim() || null,
    cover_url: els.liveCover?.value?.trim() || null,
    livekit_room_name: roomNameRaw || `rb-live-${slug}`,
    scheduled_for: scheduledFor,
    started_at:
      statusOverride === "live"
        ? new Date().toISOString()
        : currentStream?.started_at || null,
    ended_at: statusOverride === "ended" ? new Date().toISOString() : null,
    is_chat_enabled: !!els.liveChatEnabled?.checked,
    is_replay_enabled: !!els.liveReplayEnabled?.checked,
    is_featured: !!els.liveFeatured?.checked,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function createLiveStream() {
  const payload = buildPayload();

  const insertPayload = {
    ...payload,
    viewer_count: 0,
    peak_viewers: 0,
    total_chat_messages: 0,
    total_revenue_cents: 0,
    metadata: {},
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("live_streams")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Could not create live stream.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Live stream record created.", "success");
  await loadRecentStreams();

  return data;
}

async function updateLiveStream() {
  if (!currentStream?.id) {
    throw new Error("Create a stream first before updating it.");
  }

  const payload = buildPayload();

  const { data, error } = await supabase
    .from("live_streams")
    .update(payload)
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Could not update live stream.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Live stream updated.", "success");
  await loadRecentStreams();

  return data;
}

async function goLiveNow() {
  if (!currentStream?.id) {
    currentStream = await createLiveStream();
  }

  const payload = buildPayload({ statusOverride: "live" });

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      ...payload,
      scheduled_for: null,
      started_at: new Date().toISOString(),
      ended_at: null
    })
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Could not start live stream.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Stream is live now. Studio camera setup controls are hidden.", "success");
  await loadRecentStreams();

  return data;
}

async function endLiveStream() {
  if (!currentStream?.id) throw new Error("No current live stream to end.");

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Could not end live stream.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Live stream ended clean. Studio setup controls are back.", "success");
  await loadRecentStreams();

  return data;
}

async function loadRecentStreams() {
  const user = getCurrentUserState();

  if (!els.recentLiveList) return;

  if (!user?.id) {
    els.recentLiveList.innerHTML = `<div class="status-box">Login first to load your live history.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    els.recentLiveList.innerHTML = `<div class="status-box is-error">Could not load recent live streams.</div>`;
    return;
  }

  if (!data?.length) {
    els.recentLiveList.innerHTML = `<div class="status-box">No streams yet.</div>`;
    return;
  }

  els.recentLiveList.innerHTML = data
    .map((stream) => {
      const watchHref = watchHrefFromStream(stream);

      return `
        <article class="recent-card">
          <h4>${escapeHtml(stream.title || "Untitled Live")}</h4>
          <div class="recent-meta">
            <span>${escapeHtml(stream.status || "draft")}</span>
            <span>${escapeHtml(stream.category || "general")}</span>
            <span>${Number(stream.viewer_count || 0).toLocaleString()} viewers</span>
          </div>
          <p>${escapeHtml(stream.description || "No description.")}</p>
          <div class="recent-actions">
            <button class="btn btn-dark" type="button" data-load-stream="${stream.id}">Load</button>
            <a class="btn btn-dark" href="${watchHref}">Watch</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadStreamById(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", streamId)
    .single();

  if (error) {
    setStatus("Could not load that stream.", "error");
    return;
  }

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Stream loaded into studio.", "success");
}

function openWatchPage() {
  window.location.href = watchHrefFromStream(currentStream);
}

async function copyWatchLink() {
  const href = `${window.location.origin}${watchHrefFromStream(currentStream)}`;

  try {
    await navigator.clipboard.writeText(href);
    setStatus("Watch link copied.", "success");
  } catch {
    setStatus("Could not copy watch link.", "error");
  }
}

async function handleCreateLive(event) {
  event.preventDefault();

  if (els.createLiveBtn) els.createLiveBtn.disabled = true;

  try {
    await createLiveStream();
  } catch (error) {
    setStatus(error.message || "Could not create stream.", "error");
  } finally {
    if (els.createLiveBtn) els.createLiveBtn.disabled = false;
  }
}

async function handleUpdateLive() {
  if (els.updateLiveBtn) els.updateLiveBtn.disabled = true;

  try {
    await updateLiveStream();
  } catch (error) {
    setStatus(error.message || "Could not update stream.", "error");
  } finally {
    if (els.updateLiveBtn) els.updateLiveBtn.disabled = false;
  }
}

async function handleGoLive() {
  if (els.goLiveBtn) els.goLiveBtn.disabled = true;

  try {
    await goLiveNow();
  } catch (error) {
    setStatus(error.message || "Could not go live.", "error");
  } finally {
    if (els.goLiveBtn) els.goLiveBtn.disabled = false;
  }
}

async function handleEndLiveClick() {
  if (els.endLiveBtn) els.endLiveBtn.disabled = true;
  if (els.endLiveTopBtn) els.endLiveTopBtn.disabled = true;

  try {
    await endLiveStream();
  } catch (error) {
    setStatus(error.message || "Could not end stream.", "error");
  } finally {
    if (els.endLiveBtn) els.endLiveBtn.disabled = false;
    if (els.endLiveTopBtn) els.endLiveTopBtn.disabled = false;
  }
}

async function handleRefreshStream() {
  if (!currentStream?.id) {
    setStatus("No current stream selected.", "error");
    return;
  }

  await loadStreamById(currentStream.id);
}

async function handleRecentClick(event) {
  const button = event.target.closest("[data-load-stream]");
  if (!button) return;

  const streamId = button.getAttribute("data-load-stream");
  if (!streamId) return;

  await loadStreamById(streamId);
}

function bindEvents() {
  els.liveAccess?.addEventListener("change", syncPreviewFromForm);
  els.liveCategory?.addEventListener("change", syncPreviewFromForm);
  els.liveTitle?.addEventListener("input", syncPreviewFromForm);
  els.liveDescription?.addEventListener("input", syncPreviewFromForm);
  els.liveScheduledMode?.addEventListener("change", syncScheduleVisibility);

  els.startCameraBtn?.addEventListener("click", startCameraPreview);
  els.stopCameraBtn?.addEventListener("click", stopCameraPreview);
  els.openWatchBtn?.addEventListener("click", openWatchPage);
  els.copyWatchLinkBtn?.addEventListener("click", copyWatchLink);
  els.openWatchLiveBtn?.addEventListener("click", openWatchPage);
  els.copyWatchLiveBtn?.addEventListener("click", copyWatchLink);
  els.clearLiveFormBtn?.addEventListener("click", clearForm);

  els.liveForm?.addEventListener("submit", handleCreateLive);
  els.updateLiveBtn?.addEventListener("click", handleUpdateLive);
  els.goLiveBtn?.addEventListener("click", handleGoLive);
  els.endLiveBtn?.addEventListener("click", handleEndLiveClick);
  els.endLiveTopBtn?.addEventListener("click", handleEndLiveClick);
  els.refreshStreamBtn?.addEventListener("click", handleRefreshStream);
  els.recentLiveList?.addEventListener("click", handleRecentClick);
}

export async function bootLivePage() {
  await initApp();

  if (els.navMount) {
    mountEliteNav({
      target: "#elite-platform-nav",
      collapsed: false
    });
  }

  bindEvents();

  syncScheduleVisibility();
  syncPreviewFromForm();
  renderCurrentStream(null);

  await loadRecentStreams();

  const urlParams = new URLSearchParams(window.location.search);
  const streamIdFromUrl = urlParams.get("id");

  if (streamIdFromUrl) {
    await loadStreamById(streamIdFromUrl);
  }
}

export function destroyLivePage() {
  if (previewStream) {
    previewStream.getTracks().forEach((track) => track.stop());
    previewStream = null;
  }

  if (els.previewVideo) {
    els.previewVideo.srcObject = null;
  }

  currentStream = null;
}

window.addEventListener("beforeunload", destroyLivePage);

if (document.body?.classList.contains("live-page")) {
  bootLivePage().catch((error) => {
    console.error("[live] boot error:", error);
    setStatus(error.message || "Could not load live studio.", "error");
  });
}
