import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import {
  supabase,
  isFollowing,
  followUser,
  unfollowUser
} from "/core/supabase.js";
import { getQueryParam, safeDate, formatMoney, formatNumber } from "/core/utils.js";
import { BRAND_IMAGES, ROUTES } from "/core/config.js";
import { bootLiveRoom, disconnectRoom } from "/core/features/live/live-room.js";
import { bootLiveChat, destroyLiveChat } from "/core/features/live/live-chat.js";
import { bootLiveReactions, destroyLiveReactions } from "/core/features/live/live-reactions.js";
import {
  fetchLivePermissionState,
  getPermissionMessage
} from "/core/features/live/live-permissions.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  heroTitle: $("watch-hero-title"),
  heroCopy: $("watch-hero-copy"),
  playerStage: $("player-stage"),
  playerTitle: $("player-title"),
  playerCopy: $("player-copy"),
  playerActions: $("player-actions"),
  statusBox: $("watch-status"),
  categoryBadge: $("stream-category-badge"),
  accessBadge: $("stream-access-badge"),
  streamTitle: $("stream-title"),
  streamDescription: $("stream-description"),
  metaStatus: $("meta-status"),
  metaViewers: $("meta-viewers"),
  metaAccess: $("meta-access"),
  metaPrice: $("meta-price"),
  statViewers: $("stat-viewers"),
  statPeakViewers: $("stat-peak-viewers"),
  statChatCount: $("stat-chat-count"),
  statRevenue: $("stat-revenue"),
  creatorAvatar: $("creator-avatar"),
  creatorName: $("creator-name"),
  creatorHandle: $("creator-handle"),
  creatorProfileLink: $("creator-profile-link"),
  creatorMessageLink: $("creator-message-link"),
  followBtn: $("follow-creator-btn"),
  lockedState: $("stream-locked-state"),
  lockedCopy: $("locked-copy"),
  lockedActionLink: $("locked-action-link"),
  chatList: $("chat-list"),
  chatForm: $("chat-form"),
  chatInput: $("chat-input"),
  chatSubmit: $("chat-submit"),
  navMount: $("elite-platform-nav"),
  playerVideoMount: $("live-video"),
  reactionBar: $("live-reaction-bar"),
  reactionBurst: $("live-reaction-burst"),
  chatCount: $("live-chat-count")
};

let currentUser = null;
let currentProfile = null;
let currentStream = null;
let currentCreator = null;
let streamChannel = null;
let followBusy = false;

const slug = getQueryParam("slug", "");
const streamId = getQueryParam("id", "") || getQueryParam("stream", "");

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

function fallbackImage() {
  return BRAND_IMAGES.live || BRAND_IMAGES.homeHero || "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png";
}

function normalizeProfile(profile) {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
}

function getCreatorName(profile = null) {
  const normalized = normalizeProfile(profile);
  return normalized?.display_name || normalized?.username || "Rich Bizness Creator";
}

function getCreatorHandle(profile = null) {
  const normalized = normalizeProfile(profile);
  return normalized?.handle || normalized?.username || "richbizness";
}

function getCreatorAvatar(profile = null) {
  const normalized = normalizeProfile(profile);
  return normalized?.avatar_url || normalized?.profile_image_url || BRAND_IMAGES.logo;
}

function getStreamPriceLabel(stream = null) {
  if (!stream) return "Free";
  const accessType = String(stream.access_type || "free").toLowerCase();

  if (accessType === "paid" && Number(stream.price_cents || 0) > 0) {
    return formatMoney(stream.price_cents || 0, stream.currency || "USD");
  }

  if (accessType === "vip") return "VIP";
  return "Free";
}

function getWatchHref(stream = null) {
  if (!stream) return ROUTES.watch;
  if (stream.slug) return `${ROUTES.watch}?slug=${encodeURIComponent(stream.slug)}`;
  if (stream.id) return `${ROUTES.watch}?id=${encodeURIComponent(stream.id)}`;
  return ROUTES.watch;
}

function clearRealtime() {
  if (streamChannel) {
    supabase.removeChannel(streamChannel);
    streamChannel = null;
  }
}

function renderNoStream() {
  if (els.heroTitle) els.heroTitle.textContent = "No stream found.";
  if (els.heroCopy) els.heroCopy.textContent = "This watch page could not find an active Rich Bizness stream with that slug or id.";
  if (els.playerTitle) els.playerTitle.textContent = "No stream found";
  if (els.playerCopy) els.playerCopy.textContent = "Check the watch link or go back to the homepage live rail.";
  if (els.streamTitle) els.streamTitle.textContent = "No stream found";
  if (els.streamDescription) els.streamDescription.textContent = "No live stream record matched the current watch link.";

  if (els.playerActions) {
    els.playerActions.innerHTML = `
      <a class="btn" href="${ROUTES.home}">Back Home</a>
      <a class="btn-ghost" href="${ROUTES.live}">Go Live</a>
    `;
  }

  if (els.chatList) {
    els.chatList.innerHTML = `
      <div class="chat-empty">
        <div>
          <strong style="display:block;margin-bottom:8px;color:#ecfff4;">No stream chat.</strong>
          <span>A valid stream is required before live chat can load.</span>
        </div>
      </div>
    `;
  }

  if (els.lockedState) els.lockedState.style.display = "none";
  setStatus("No live stream matched this watch link.", "error");
}

async function fetchStream() {
  if (!slug && !streamId) {
    currentStream = null;
    currentCreator = null;
    renderNoStream();
    return null;
  }

  let query = supabase
    .from("live_streams")
    .select(`
      *,
      profiles:creator_id (
        id,
        display_name,
        username,
        handle,
        avatar_url,
        profile_image_url,
        bio
      )
    `);

  if (slug) {
    query = query.eq("slug", slug);
  } else {
    query = query.eq("id", streamId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[core/pages/watch] fetchStream error:", error);
    setStatus("Could not load stream.", "error");
    renderNoStream();
    return null;
  }

  if (!data) {
    currentStream = null;
    currentCreator = null;
    renderNoStream();
    return null;
  }

  currentStream = data;
  currentCreator = normalizeProfile(data.profiles);
  return data;
}

async function getPermissionState() {
  return await fetchLivePermissionState({
    stream: currentStream,
    user: currentUser,
    profile: currentProfile
  });
}

function renderLockedState(permission) {
  if (!els.lockedState || !els.lockedCopy || !els.lockedActionLink) return;

  if (!permission?.canView) {
    els.lockedState.style.display = "grid";
    els.lockedCopy.textContent = getPermissionMessage(permission);

    if (permission.needsLogin) {
      els.lockedActionLink.href = ROUTES.auth;
      els.lockedActionLink.textContent = "Login to continue";
    } else if (permission.needsPurchase || permission.needsVip) {
      els.lockedActionLink.href = ROUTES.monetization || "/monetization.html";
      els.lockedActionLink.textContent = permission.needsVip ? "Unlock VIP access" : "Unlock stream";
    } else {
      els.lockedActionLink.href = ROUTES.home;
      els.lockedActionLink.textContent = "Back Home";
    }
  } else {
    els.lockedState.style.display = "none";
  }
}

function renderPlayerMeta(stream, creator, permission) {
  const image = stream.thumbnail_url || stream.cover_url || fallbackImage();
  const title = stream.title || "Untitled Stream";
  const category = String(stream.category || "live").toUpperCase();
  const accessType = String(stream.access_type || "free").toUpperCase();
  const price = getStreamPriceLabel(stream);

  if (els.heroTitle) els.heroTitle.textContent = title;
  if (els.heroCopy) {
    els.heroCopy.textContent =
      stream.description || "Creator live stream watch experience locked into the Rich Bizness ecosystem.";
  }

  if (els.playerTitle) els.playerTitle.textContent = title;
  if (els.playerCopy) {
    els.playerCopy.textContent = creator
      ? `Now watching ${getCreatorName(creator)} on Rich Bizness.`
      : "Now watching a Rich Bizness creator stream.";
  }

  if (els.categoryBadge) els.categoryBadge.textContent = category;
  if (els.accessBadge) els.accessBadge.textContent = accessType;

  if (els.streamTitle) els.streamTitle.textContent = title;
  if (els.streamDescription) {
    els.streamDescription.textContent = stream.description || "No stream description was added yet.";
  }

  if (els.metaStatus) els.metaStatus.textContent = `Status: ${String(stream.status || "live").toUpperCase()}`;
  if (els.metaViewers) els.metaViewers.textContent = `Viewers: ${formatNumber(stream.viewer_count || 0)}`;
  if (els.metaAccess) els.metaAccess.textContent = `Access: ${accessType}`;
  if (els.metaPrice) els.metaPrice.textContent = `Price: ${price}`;

  if (els.statViewers) els.statViewers.textContent = formatNumber(stream.viewer_count || 0);
  if (els.statPeakViewers) els.statPeakViewers.textContent = formatNumber(stream.peak_viewers || 0);
  if (els.statChatCount) els.statChatCount.textContent = formatNumber(stream.total_chat_messages || 0);
  if (els.statRevenue) {
    els.statRevenue.textContent = formatMoney(stream.total_revenue_cents || 0, stream.currency || "USD");
  }

  if (els.creatorAvatar) els.creatorAvatar.src = getCreatorAvatar(creator);
  if (els.creatorName) els.creatorName.textContent = getCreatorName(creator);
  if (els.creatorHandle) els.creatorHandle.textContent = `@${getCreatorHandle(creator)}`;

  if (els.creatorProfileLink) {
    els.creatorProfileLink.href = creator?.id
      ? `/profile.html?id=${encodeURIComponent(creator.id)}`
      : ROUTES.profile;
  }

  if (els.creatorMessageLink) {
    els.creatorMessageLink.href = creator?.id
      ? `/messages.html?user=${encodeURIComponent(creator.id)}`
      : ROUTES.messages;
  }

  if (els.playerStage) {
    els.playerStage.style.background = `
      linear-gradient(180deg, rgba(5,8,6,0.74), rgba(3,5,4,0.96)),
      url('${image}') center / cover no-repeat
    `;
  }

  if (els.playerActions) {
    if (!permission?.canView) {
      if (permission.needsLogin) {
        els.playerActions.innerHTML = `
          <a class="btn" href="${ROUTES.auth}">Login</a>
          <a class="btn-ghost" href="${ROUTES.home}">Back Home</a>
        `;
      } else {
        els.playerActions.innerHTML = `
          <a class="btn-gold" href="${ROUTES.monetization || "/monetization.html"}">Unlock Access</a>
          <a class="btn-ghost" href="${ROUTES.home}">Back Home</a>
        `;
      }
    } else {
      els.playerActions.innerHTML = `
        <a class="btn" href="${ROUTES.live}">Go Live</a>
        <a class="btn-ghost" href="${ROUTES.home}">Back Home</a>
      `;
    }
  }
}

async function syncFollowButton() {
  if (!els.followBtn) return;

  if (!currentUser || !currentCreator?.id || currentUser.id === currentCreator.id) {
    els.followBtn.textContent = currentUser?.id === currentCreator?.id ? "Your profile" : "Follow";
    els.followBtn.disabled = !currentCreator?.id || currentUser?.id === currentCreator?.id;
    return;
  }

  const following = await isFollowing(currentUser.id, currentCreator.id);
  els.followBtn.textContent = following ? "Following" : "Follow";
  els.followBtn.disabled = false;
  els.followBtn.dataset.following = following ? "true" : "false";
}

async function handleFollowToggle() {
  if (followBusy || !currentUser || !currentCreator?.id || currentUser.id === currentCreator.id) return;

  followBusy = true;
  els.followBtn.disabled = true;

  try {
    const following = els.followBtn.dataset.following === "true";

    if (following) {
      await unfollowUser(currentUser.id, currentCreator.id);
      els.followBtn.textContent = "Follow";
      els.followBtn.dataset.following = "false";
      setStatus("Unfollowed creator.", "success");
    } else {
      await followUser(currentUser.id, currentCreator.id);
      els.followBtn.textContent = "Following";
      els.followBtn.dataset.following = "true";
      setStatus("Creator followed.", "success");
    }
  } catch (error) {
    console.error("[core/pages/watch] follow toggle error:", error);
    setStatus(error.message || "Could not update follow state.", "error");
  } finally {
    followBusy = false;
    els.followBtn.disabled = false;
  }
}

function bindStreamRealtime() {
  clearRealtime();

  if (!currentStream?.id) return;

  streamChannel = supabase
    .channel(`rb-watch-stream-${currentStream.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_streams",
        filter: `id=eq.${currentStream.id}`
      },
      async () => {
        await refreshWatchPage();
      }
    )
    .subscribe();
}

async function mountLiveVideo(permission) {
  if (!els.playerVideoMount) return;

  if (!permission?.canView) {
    els.playerVideoMount.innerHTML = "";
    return;
  }

  els.playerVideoMount.innerHTML = "";

  try {
    await bootLiveRoom({
      videoContainerId: "live-video",
      slug,
      id: streamId
    });
  } catch (error) {
    console.error("[core/pages/watch] mountLiveVideo error:", error);
    els.playerVideoMount.innerHTML = "Failed to load stream";
  }
}

async function mountChat(permission) {
  if (!els.chatList) return;

  if (!permission?.canView) {
    els.chatList.innerHTML = `
      <div class="chat-empty">
        <div>
          <strong style="display:block;margin-bottom:8px;color:#ecfff4;">Chat locked.</strong>
          <span>You need stream access before chat can load.</span>
        </div>
      </div>
    `;
    return;
  }

  if (!permission.canChat) {
    els.chatList.innerHTML = `
      <div class="chat-empty">
        <div>
          <strong style="display:block;margin-bottom:8px;color:#ecfff4;">Chat unavailable.</strong>
          <span>Chat is disabled for this stream.</span>
        </div>
      </div>
    `;
    return;
  }

  await bootLiveChat({
    streamId: currentStream.id,
    userId: currentUser?.id || null,
    listElementId: "chat-list",
    formElementId: "chat-form",
    inputElementId: "chat-input",
    countElementId: "live-chat-count",
    onMessage: async () => {
      if (els.statChatCount && currentStream) {
        const nextValue = Number(els.statChatCount.textContent.replace(/,/g, "") || 0) + 1;
        els.statChatCount.textContent = formatNumber(nextValue);
      }
    }
  });

  if (els.chatInput) {
    els.chatInput.disabled = !permission.canChat;
  }
  if (els.chatSubmit) {
    els.chatSubmit.disabled = !permission.canChat;
  }
}

async function mountReactions(permission) {
  if (!els.reactionBar) return;

  if (!permission?.canView || !permission?.canSendReactions) {
    els.reactionBar.innerHTML = "";
    return;
  }

  await bootLiveReactions({
    streamId: currentStream.id,
    userId: currentUser?.id || null,
    reactionBarElementId: "live-reaction-bar",
    reactionBurstElementId: "live-reaction-burst"
  });
}

async function refreshWatchPage() {
  const stream = await fetchStream();
  if (!stream) return;

  const permission = await getPermissionState();
  renderPlayerMeta(currentStream, currentCreator, permission);
  renderLockedState(permission);
  await syncFollowButton();
  await mountLiveVideo(permission);
  await mountChat(permission);
  await mountReactions(permission);
  bindStreamRealtime();

  setStatus(getPermissionMessage(permission), permission.canView ? "success" : "error");
}

function bindEvents() {
  els.followBtn?.addEventListener("click", handleFollowToggle);
}

export async function bootWatchPage() {
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
  await refreshWatchPage();
}

export function destroyWatchPage() {
  clearRealtime();
  destroyLiveChat();
  destroyLiveReactions();
  disconnectRoom();

  currentStream = null;
  currentCreator = null;
}

if (document.body?.classList.contains("watch-page")) {
  bootWatchPage().catch((error) => {
    console.error("[core/pages/watch] bootWatchPage error:", error);
    setStatus(error.message || "Could not boot watch page.", "error");
  });

  window.addEventListener("beforeunload", () => {
    destroyWatchPage();
  });
}
