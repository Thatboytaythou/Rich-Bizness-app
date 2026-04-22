import { supabase } from "/core/supabase.js";
import { BRAND_IMAGES } from "/core/config.js";

let railChannel = null;
let railRefreshTimer = null;
let activeRailElement = null;
let activeOptions = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents = 0, currency = "USD") {
  const amount = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD"
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString();
}

function normalizeType(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getCategoryLabel(value = "") {
  const text = String(value || "live").trim();
  if (!text) return "Live";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getAccessLabel(stream = {}) {
  const accessType = normalizeType(stream.access_type || "free");
  const priceCents = Number(stream.price_cents || 0);
  const currency = stream.currency || "USD";

  if (accessType === "paid" && priceCents > 0) {
    return formatMoney(priceCents, currency);
  }

  if (accessType === "vip") {
    return "VIP";
  }

  return "Free";
}

function getStreamImage(stream = {}) {
  return (
    stream.thumbnail_url ||
    stream.cover_url ||
    stream.image_url ||
    BRAND_IMAGES.live ||
    BRAND_IMAGES.homeHero
  );
}

function getCreatorProfile(profile) {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
}

function getCreatorName(stream = {}) {
  const profile = getCreatorProfile(stream.profiles);
  return (
    profile?.display_name ||
    profile?.username ||
    stream.creator_name ||
    "Rich Bizness Creator"
  );
}

function getWatchHref(stream = {}) {
  if (stream?.slug) {
    return `/watch.html?slug=${encodeURIComponent(stream.slug)}`;
  }

  if (stream?.id) {
    return `/watch.html?id=${encodeURIComponent(stream.id)}`;
  }

  return "/watch.html";
}

function getProfileHref(stream = {}) {
  const profile = getCreatorProfile(stream.profiles);
  if (profile?.id) {
    return `/profile.html?id=${encodeURIComponent(profile.id)}`;
  }
  if (stream?.creator_id) {
    return `/profile.html?id=${encodeURIComponent(stream.creator_id)}`;
  }
  return "/profile.html";
}

function clearRealtime() {
  if (railChannel) {
    supabase.removeChannel(railChannel);
    railChannel = null;
  }
}

function clearRefreshTimer() {
  if (railRefreshTimer) {
    window.clearInterval(railRefreshTimer);
    railRefreshTimer = null;
  }
}

function renderEmptyState(railElement, message = "No live streams right now.") {
  if (!railElement) return;

  railElement.innerHTML = `
    <div class="rb-live-empty">
      <div>
        <strong>${escapeHtml(message)}</strong>
        <span>When creators go live, the rail fills automatically.</span>
      </div>
    </div>
  `;
}

function cardTemplate(stream = {}, options = {}) {
  const watchHref = getWatchHref(stream);
  const profileHref = getProfileHref(stream);
  const image = getStreamImage(stream);
  const title = escapeHtml(stream.title || "Untitled Live");
  const category = escapeHtml(getCategoryLabel(stream.category || "live"));
  const accessLabel = escapeHtml(getAccessLabel(stream));
  const creator = escapeHtml(getCreatorName(stream));
  const viewers = formatNumber(stream.viewer_count || 0);
  const accessType = normalizeType(stream.access_type || "free").toUpperCase();
  const featured = !!stream.is_featured;
  const showCreatorLink = options.showCreatorLink !== false;

  return `
    <article class="rb-live-card ${featured ? "is-featured" : ""}">
      <a class="rb-live-card__media" href="${watchHref}">
        <img
          src="${escapeHtml(image)}"
          alt="${title}"
          loading="lazy"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
        />
        <div class="rb-live-card__fallback" style="display:none;">
          LIVE
        </div>

        <div class="rb-live-card__overlay">
          <span class="rb-live-badge rb-live-badge--live">LIVE</span>
          <span class="rb-live-badge">${category}</span>
          <span class="rb-live-badge">${accessLabel}</span>
        </div>
      </a>

      <div class="rb-live-card__body">
        <div class="rb-live-card__meta">
          <span>${creator}</span>
          <span>${viewers} watching</span>
        </div>

        <h4 class="rb-live-card__title">${title}</h4>

        <div class="rb-live-card__meta" style="margin-bottom:14px;">
          <span>${accessType}</span>
          <span>${stream.is_chat_enabled ? "Chat on" : "Chat off"}</span>
        </div>

        <div class="rb-live-card__actions" style="display:flex;gap:10px;flex-wrap:wrap;">
          <a class="rb-live-watch-btn" href="${watchHref}">Watch now</a>
          ${showCreatorLink ? `<a class="rb-live-watch-btn" href="${profileHref}">Creator</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderRail(railElement, streams = [], options = {}) {
  if (!railElement) return;

  if (!Array.isArray(streams) || !streams.length) {
    renderEmptyState(railElement, options.emptyMessage || "No live streams right now.");
    return;
  }

  railElement.innerHTML = streams.map((stream) => cardTemplate(stream, options)).join("");
}

function buildQuery({
  category = "",
  creatorId = "",
  featuredOnly = false,
  limit = 12
} = {}) {
  let query = supabase
    .from("live_streams")
    .select(`
      id,
      creator_id,
      slug,
      title,
      description,
      category,
      status,
      access_type,
      price_cents,
      currency,
      thumbnail_url,
      cover_url,
      livekit_room_name,
      started_at,
      ended_at,
      is_chat_enabled,
      is_featured,
      viewer_count,
      peak_viewers,
      total_chat_messages,
      total_revenue_cents,
      last_activity_at,
      created_at,
      updated_at,
      profiles:creator_id (
        id,
        display_name,
        username,
        avatar_url,
        profile_image_url
      )
    `)
    .eq("status", "live")
    .order("is_featured", { ascending: false })
    .order("viewer_count", { ascending: false })
    .order("started_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (creatorId) {
    query = query.eq("creator_id", creatorId);
  }

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  if (limit) {
    query = query.limit(limit);
  }

  return query;
}

export async function fetchLiveRailStreams(options = {}) {
  const { data, error } = await buildQuery(options);

  if (error) {
    console.error("[live-rail] fetchLiveRailStreams error:", error);
    throw error;
  }

  return data || [];
}

export async function refreshLiveRail(railElement = activeRailElement, options = activeOptions || {}) {
  if (!railElement) return;

  try {
    const streams = await fetchLiveRailStreams(options);
    renderRail(railElement, streams, options);
  } catch (error) {
    console.error("[live-rail] refreshLiveRail error:", error);
    renderEmptyState(railElement, "Live rail could not load right now.");
  }
}

function bindRealtime(railElement, options = {}) {
  clearRealtime();

  railChannel = supabase
    .channel(`rb-live-rail-${options.channelKey || "default"}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_streams"
      },
      async () => {
        await refreshLiveRail(railElement, options);
      }
    )
    .subscribe((status) => {
      console.log("[live-rail] realtime status:", status);
    });
}

function bindVisibilityRefresh(railElement, options = {}) {
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      await refreshLiveRail(railElement, options);
    }
  });
}

function bindAutoRefresh(railElement, options = {}) {
  clearRefreshTimer();

  if (!options.autoRefresh) return;

  railRefreshTimer = window.setInterval(async () => {
    await refreshLiveRail(railElement, options);
  }, Number(options.intervalMs || 15000));
}

export async function bootLiveRail({
  railElementId = "live-rail",
  category = "",
  creatorId = "",
  featuredOnly = false,
  limit = 12,
  autoRefresh = true,
  intervalMs = 15000,
  emptyMessage = "No live streams right now.",
  showCreatorLink = true,
  channelKey = "default"
} = {}) {
  const railElement = document.getElementById(railElementId);

  if (!railElement) {
    console.warn("[live-rail] Missing rail element:", railElementId);
    return;
  }

  activeRailElement = railElement;
  activeOptions = {
    railElementId,
    category,
    creatorId,
    featuredOnly,
    limit,
    autoRefresh,
    intervalMs,
    emptyMessage,
    showCreatorLink,
    channelKey
  };

  await refreshLiveRail(railElement, activeOptions);
  bindRealtime(railElement, activeOptions);
  bindVisibilityRefresh(railElement, activeOptions);
  bindAutoRefresh(railElement, activeOptions);
}

export function destroyLiveRail() {
  clearRealtime();
  clearRefreshTimer();
  activeRailElement = null;
  activeOptions = null;
}
