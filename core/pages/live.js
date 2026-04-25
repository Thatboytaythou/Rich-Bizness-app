import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
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
  detailTimes: $("detail-times"),

  cohostStatusBox: $("cohost-status-box"),
  cohostUserId: $("cohost-user-id"),
  cohostSlot: $("cohost-slot"),
  bringEmInBtn: $("bring-em-in-btn"),
  refreshCohostsBtn: $("refresh-cohosts-btn"),
  cohostList: $("cohost-list"),

  metaVisionStatus: $("meta-vision-status"),
  metaVisionTheme: $("meta-vision-theme"),
  metaVisionLabel: $("meta-vision-label"),
  enterMetaVisionBtn: $("enter-meta-vision-btn"),
  exitMetaVisionBtn: $("exit-meta-vision-btn"),

  dmPopup: $("live-dm-popup"),
  dmTargetLabel: $("live-dm-target-label"),
  dmBody: $("live-dm-body"),
  dmSendBtn: $("live-dm-send-btn"),
  dmCloseBtn: $("live-dm-close-btn"),
  dmCancelBtn: $("live-dm-cancel-btn"),
  dmStatus: $("live-dm-status")
};

let currentUser = null;
let currentProfile = null;
let currentStream = null;
let previewStream = null;
let activeDmTargetUserId = null;
let activeDmTargetLabel = "Private message";

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;
  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");
  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function setCohostStatus(message, type = "normal") {
  if (!els.cohostStatusBox) return;
  els.cohostStatusBox.textContent = message;
  els.cohostStatusBox.classList.remove("is-error", "is-success");
  if (type === "error") els.cohostStatusBox.classList.add("is-error");
  if (type === "success") els.cohostStatusBox.classList.add("is-success");
}

function setMetaVisionStatus(message, type = "normal") {
  if (!els.metaVisionStatus) return;
  els.metaVisionStatus.textContent = message;
  els.metaVisionStatus.classList.remove("is-error", "is-success");
  if (type === "error") els.metaVisionStatus.classList.add("is-error");
  if (type === "success") els.metaVisionStatus.classList.add("is-success");
}

function setDmStatus(message, type = "normal") {
  if (!els.dmStatus) return;
  els.dmStatus.textContent = message;
  els.dmStatus.classList.remove("is-success", "is-error");
  if (type === "success") els.dmStatus.classList.add("is-success");
  if (type === "error") els.dmStatus.classList.add("is-error");
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

function statusLabel(status) {
  const value = String(status || "draft").toLowerCase();
  if (value === "live") return "WE LIT 🔥";
  if (value === "ended") return "Party’s Over";
  if (value === "scheduled") return "On Deck";
  return "In The Lab";
}

function cohostStatusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active") return "In The Room";
  if (value === "invited" || value === "pending") return "Waiting To Pop In";
  if (value === "removed") return "Cut Off";
  if (value === "left") return "Stepped Out";
  if (value === "declined") return "Passed";
  if (value === "banned") return "Blocked";
  return "Empty slot";
}

function syncPreviewFromForm() {
  if (els.previewTitle) {
    els.previewTitle.textContent = els.liveTitle?.value?.trim() || "Rich Bizness Live Studio";
  }

  if (els.badgeAccess) {
    els.badgeAccess.textContent = String(els.liveAccess?.value || "free").toUpperCase();
  }

  if (els.badgeCategory) {
    els.badgeCategory.textContent = String(els.liveCategory?.value || "music").toUpperCase();
  }

  if (els.previewCopy) {
    els.previewCopy.textContent =
      els.liveDescription?.value?.trim() ||
      "Build the room, test the camera, then call the madness.";
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
    els.previewCopy.textContent = "You’re active. Room is open. Watch link is ready.";
  } else {
    syncPreviewFromForm();
  }
}

function applyMetaVisionUI(metadata = {}) {
  const enabled = !!metadata.meta_vision_enabled;
  const theme = metadata.meta_room_theme || "money-road";

  document.body.classList.toggle("meta-vision-active", enabled);

  [
    "meta-theme-money-road",
    "meta-theme-smoke-city",
    "meta-theme-studio-galaxy",
    "meta-theme-sports-arena",
    "meta-theme-gallery-world"
  ].forEach((className) => document.body.classList.remove(className));

  if (enabled) document.body.classList.add(`meta-theme-${theme}`);

  if (els.metaVisionTheme) els.metaVisionTheme.value = theme;
  if (els.metaVisionLabel) {
    els.metaVisionLabel.value = metadata.meta_room_label || "Meta Room Ready";
  }

  setMetaVisionStatus(
    enabled ? `${metadata.meta_room_label || "Meta Room Ready"} — ${theme}` : "Meta Vision ready.",
    enabled ? "success" : "normal"
  );
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
  applyMetaVisionUI(stream.metadata || {});
  renderCurrentStream(stream);
}

function renderCurrentStream(stream) {
  currentStream = stream || null;

  const isLive = String(stream?.status || "draft").toLowerCase() === "live";

  if (els.badgeStatus) {
    els.badgeStatus.textContent = statusLabel(stream?.status || "draft");
    els.badgeStatus.classList.toggle("is-live", isLive);
  }

  if (els.metaStatus) els.metaStatus.textContent = statusLabel(stream?.status || "draft");
  if (els.metaSlug) els.metaSlug.textContent = stream?.slug || "—";
  if (els.metaViewers) els.metaViewers.textContent = Number(stream?.viewer_count || 0).toLocaleString();
  if (els.metaRevenue) {
    els.metaRevenue.textContent = toMoney(stream?.total_revenue_cents || 0, stream?.currency || "USD");
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
  applyMetaVisionUI(stream?.metadata || {});
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
  applyMetaVisionUI({});

  if (els.badgeStatus) {
    els.badgeStatus.textContent = "IN THE LAB";
    els.badgeStatus.classList.remove("is-live");
  }

  if (els.metaStatus) els.metaStatus.textContent = "In The Lab";

  renderEmptyCohosts();
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
    setStatus("Camera active. You ready to call the madness.", "success");
  } catch (error) {
    console.error("[live] startCameraPreview error:", error);
    setStatus("Could not get active. Check camera permissions.", "error");
  }
}

function stopCameraPreview() {
  if (!previewStream) return;

  previewStream.getTracks().forEach((track) => track.stop());
  if (els.previewVideo) els.previewVideo.srcObject = null;

  previewStream = null;
  setStatus("Camera cut. Itz over ✌🏽");
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

  if (!title) throw new Error("Drop Name is required.");

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
    livekit_room_name: roomNameRaw || `rb-party-${slug}`,
    scheduled_for: scheduledFor,
    started_at:
      statusOverride === "live"
        ? new Date().toISOString()
        : currentStream?.started_at || null,
    ended_at: statusOverride === "ended" ? new Date().toISOString() : null,
    is_chat_enabled: !!els.liveChatEnabled?.checked,
    is_replay_enabled: !!els.liveReplayEnabled?.checked,
    is_featured: !!els.liveFeatured?.checked,
    metadata: currentStream?.metadata || {},
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
  setStatus("Madness Call created.", "success");
  await Promise.all([loadRecentStreams(), loadCohosts()]);

  return data;
}

async function updateLiveStream() {
  if (!currentStream?.id) throw new Error("Create a live first before saving setup.");

  const payload = buildPayload();

  const { data, error } = await supabase
    .from("live_streams")
    .update(payload)
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Could not save live setup.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Live setup saved.", "success");
  await Promise.all([loadRecentStreams(), loadCohosts()]);

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

  if (error) throw new Error(error.message || "Could not go live.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("WE LIT 🔥📺 — Bizness Party is open.", "success");
  await Promise.all([loadRecentStreams(), loadCohosts()]);

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

  if (error) throw new Error(error.message || "Could not end live.");

  renderCurrentStream(data);
  fillFormFromStream(data);
  setStatus("Party’s Over. Live ended clean.", "success");
  await Promise.all([loadRecentStreams(), loadCohosts()]);

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
      const liveBadge = String(stream.status || "").toLowerCase() === "live" ? "WE ON 🔥" : statusLabel(stream.status);

      return `
        <article class="recent-card">
          <h4>${escapeHtml(stream.title || "Untitled Live")}</h4>
          <div class="recent-meta">
            <span>${escapeHtml(liveBadge)}</span>
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
  await loadCohosts();
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

function renderEmptyCohosts() {
  if (!els.cohostList) return;

  els.cohostList.innerHTML = [1, 2, 3]
    .map(
      (slot) => `
        <article class="cohost-card">
          <strong>Rich Playa ${slot}</strong>
          <span>Empty slot</span>
        </article>
      `
    )
    .join("");
}

async function loadCohosts() {
  if (!els.cohostList) return;

  if (!currentStream?.id) {
    renderEmptyCohosts();
    setCohostStatus("Create or load a live stream first.");
    return;
  }

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", currentStream.id)
    .eq("role", "cohost")
    .order("slot_number", { ascending: true });

  if (error) {
    console.error("[live] loadCohosts error:", error);
    setCohostStatus(error.message || "Could not load Rich Playas.", "error");
    return;
  }

  const bySlot = new Map((data || []).map((row) => [Number(row.slot_number || 0), row]));

  els.cohostList.innerHTML = [1, 2, 3]
    .map((slot) => {
      const row = bySlot.get(slot);
      if (!row) {
        return `
          <article class="cohost-card">
            <strong>Rich Playa ${slot}</strong>
            <span>Empty slot</span>
          </article>
        `;
      }

      const status = String(row.status || (row.is_active ? "active" : "invited")).toLowerCase();
      const cardClass = status === "active" ? "is-active" : "is-invited";

      return `
        <article class="cohost-card ${cardClass}">
          <strong>${escapeHtml(row.display_label || `Rich Playa ${slot}`)}</strong>
          <span>${escapeHtml(cohostStatusLabel(status))}</span>
          <span>User: ${escapeHtml(row.user_id)}</span>
          <div class="cohost-card-actions">
            <button class="btn btn-gold" type="button" data-dm-user="${escapeHtml(row.user_id)}" data-dm-label="${escapeHtml(row.display_label || `Rich Playa ${slot}`)}">
              Slide In 🔥
            </button>
            <button class="btn btn-danger" type="button" data-cut-user="${escapeHtml(row.user_id)}">
              Cut Em Off
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  setCohostStatus("Rich Playas loaded.", "success");
}

async function inviteCohost() {
  if (!currentStream?.id) {
    setCohostStatus("Create or load a live stream first.", "error");
    return;
  }

  const targetUserId = els.cohostUserId?.value?.trim();
  const slot = Number(els.cohostSlot?.value || 1);

  if (!targetUserId) {
    setCohostStatus("Paste a Rich Playa user id first.", "error");
    return;
  }

  if (targetUserId === currentUser?.id) {
    setCohostStatus("You are already the host.", "error");
    return;
  }

  if (els.bringEmInBtn) els.bringEmInBtn.disabled = true;

  try {
    const rpc = await supabase.rpc("invite_live_rich_playa", {
      target_stream_id: currentStream.id,
      target_user_id: targetUserId,
      target_slot_number: slot
    });

    if (rpc.error) {
      const { error } = await supabase.from("live_stream_members").upsert(
        {
          stream_id: currentStream.id,
          user_id: targetUserId,
          role: "cohost",
          status: "invited",
          slot_number: slot,
          display_label: `Rich Playa ${slot}`,
          invited_by: currentUser?.id || null,
          can_chat: true,
          can_stream_video: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: "stream_id,user_id" }
      );

      if (error) throw new Error(error.message);
    }

    if (els.cohostUserId) els.cohostUserId.value = "";
    setCohostStatus(`Rich Playa ${slot} invited.`, "success");
    await loadCohosts();
  } catch (error) {
    console.error("[live] inviteCohost error:", error);
    setCohostStatus(error.message || "Could not bring them in.", "error");
  } finally {
    if (els.bringEmInBtn) els.bringEmInBtn.disabled = false;
  }
}

async function removeCohost(targetUserId) {
  if (!currentStream?.id || !targetUserId) return;

  try {
    const rpc = await supabase.rpc("remove_live_rich_playa", {
      target_stream_id: currentStream.id,
      target_user_id: targetUserId
    });

    if (rpc.error) {
      const { error } = await supabase
        .from("live_stream_members")
        .update({
          status: "removed",
          is_active: false,
          left_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("stream_id", currentStream.id)
        .eq("user_id", targetUserId);

      if (error) throw new Error(error.message);
    }

    setCohostStatus("Rich Playa cut off.", "success");
    await loadCohosts();
  } catch (error) {
    console.error("[live] removeCohost error:", error);
    setCohostStatus(error.message || "Could not cut them off.", "error");
  }
}

async function updateMetaVision(enabled) {
  if (!currentStream?.id) {
    setMetaVisionStatus("Create or load a stream first.", "error");
    return;
  }

  const oldMetadata = currentStream.metadata || {};
  const theme = els.metaVisionTheme?.value || "money-road";
  const label = els.metaVisionLabel?.value?.trim() || "Meta Room Ready";

  const nextMetadata = {
    ...oldMetadata,
    meta_vision_enabled: enabled,
    meta_room_theme: theme,
    meta_room_label: label,
    meta_updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("live_streams")
    .update({
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    })
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) {
    setMetaVisionStatus(error.message || "Could not update Meta Vision.", "error");
    return;
  }

  currentStream = data;
  applyMetaVisionUI(data.metadata || {});
  renderCurrentStream(data);
}

function openLiveDmPopup(targetUserId, label = "Private message") {
  if (!targetUserId) {
    setStatus("No DM target selected.", "error");
    return;
  }

  activeDmTargetUserId = targetUserId;
  activeDmTargetLabel = label;

  if (els.dmTargetLabel) els.dmTargetLabel.textContent = `To: ${label}`;
  if (els.dmBody) els.dmBody.value = "";
  if (els.dmPopup) els.dmPopup.hidden = false;

  setDmStatus("Ready.");
  setTimeout(() => els.dmBody?.focus(), 50);
}

function closeLiveDmPopup() {
  activeDmTargetUserId = null;
  activeDmTargetLabel = "Private message";

  if (els.dmPopup) els.dmPopup.hidden = true;
  if (els.dmBody) els.dmBody.value = "";
  setDmStatus("Ready.");
}

async function findOrCreateDmThread(targetUserId) {
  const user = getCurrentUserState();

  if (!user?.id) throw new Error("Login required.");
  if (!targetUserId) throw new Error("Missing DM target.");
  if (user.id === targetUserId) throw new Error("You cannot DM yourself.");

  const { data: myThreads, error: myThreadsError } = await supabase
    .from("dm_thread_members")
    .select("thread_id")
    .eq("user_id", user.id);

  if (myThreadsError) throw new Error(myThreadsError.message);

  let threadId = null;

  if (myThreads?.length) {
    const threadIds = myThreads.map((row) => row.thread_id);

    const { data: matches, error: matchError } = await supabase
      .from("dm_thread_members")
      .select("thread_id")
      .in("thread_id", threadIds)
      .eq("user_id", targetUserId);

    if (matchError) throw new Error(matchError.message);
    if (matches?.length) threadId = matches[0].thread_id;
  }

  if (threadId) return threadId;

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({
      created_by: user.id,
      title: "Slide In 🔥",
      is_group: false,
      last_message_at: new Date().toISOString(),
      metadata: { source: "live_dm_popup" }
    })
    .select("id")
    .single();

  if (threadError) throw new Error(threadError.message);

  threadId = thread.id;

  const { error: membersError } = await supabase.from("dm_thread_members").insert([
    {
      thread_id: threadId,
      user_id: user.id,
      last_read_at: new Date().toISOString()
    },
    {
      thread_id: threadId,
      user_id: targetUserId,
      last_read_at: null
    }
  ]);

  if (membersError) throw new Error(membersError.message);

  return threadId;
}

async function sendLiveDm() {
  const user = getCurrentUserState();
  const body = els.dmBody?.value?.trim();

  if (!user?.id) {
    setDmStatus("Login required.", "error");
    return;
  }

  if (!activeDmTargetUserId) {
    setDmStatus("No DM target selected.", "error");
    return;
  }

  if (!body) {
    setDmStatus("Type your slide first.", "error");
    return;
  }

  if (els.dmSendBtn) els.dmSendBtn.disabled = true;

  try {
    const threadId = await findOrCreateDmThread(activeDmTargetUserId);

    const { error: messageError } = await supabase.from("dm_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body,
      message_type: "text",
      media_url: null,
      reply_to_message_id: null,
      is_deleted: false,
      metadata: {
        source: "live",
        stream_id: currentStream?.id || null,
        target_label: activeDmTargetLabel
      },
      created_at: new Date().toISOString()
    });

    if (messageError) throw new Error(messageError.message);

    await supabase
      .from("dm_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    setDmStatus("Slide delivered 🔥", "success");
    setTimeout(closeLiveDmPopup, 650);
  } catch (error) {
    console.error("[live] sendLiveDm error:", error);
    setDmStatus(error.message || "Could not send DM.", "error");
  } finally {
    if (els.dmSendBtn) els.dmSendBtn.disabled = false;
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
    setStatus(error.message || "Could not save setup.", "error");
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
    setStatus(error.message || "Could not end live.", "error");
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

async function handleCohostListClick(event) {
  const cutBtn = event.target.closest("[data-cut-user]");
  const dmBtn = event.target.closest("[data-dm-user]");

  if (cutBtn) {
    await removeCohost(cutBtn.getAttribute("data-cut-user"));
    return;
  }

  if (dmBtn) {
    openLiveDmPopup(
      dmBtn.getAttribute("data-dm-user"),
      dmBtn.getAttribute("data-dm-label") || "Rich Playa"
    );
  }
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

  els.bringEmInBtn?.addEventListener("click", inviteCohost);
  els.refreshCohostsBtn?.addEventListener("click", loadCohosts);
  els.cohostList?.addEventListener("click", handleCohostListClick);

  els.enterMetaVisionBtn?.addEventListener("click", () => updateMetaVision(true));
  els.exitMetaVisionBtn?.addEventListener("click", () => updateMetaVision(false));
  els.metaVisionTheme?.addEventListener("change", () => {
    if (document.body.classList.contains("meta-vision-active")) updateMetaVision(true);
  });

  els.dmSendBtn?.addEventListener("click", sendLiveDm);
  els.dmCloseBtn?.addEventListener("click", closeLiveDmPopup);
  els.dmCancelBtn?.addEventListener("click", closeLiveDmPopup);
  els.dmPopup?.addEventListener("click", (event) => {
    if (event.target === els.dmPopup) closeLiveDmPopup();
  });
}

export async function bootLivePage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentProfile = getCurrentProfileState();

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
  renderEmptyCohosts();

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

  if (els.previewVideo) els.previewVideo.srcObject = null;

  currentStream = null;
}

window.addEventListener("beforeunload", destroyLivePage);

if (document.body?.classList.contains("live-page")) {
  bootLivePage().catch((error) => {
    console.error("[live] boot error:", error);
    setStatus(error.message || "Could not load live studio.", "error");
  });
}
