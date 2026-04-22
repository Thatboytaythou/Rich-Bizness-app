import { supabase } from '/core/supabase.js';
import { BRAND_IMAGES } from '/core/config.js';

let railRefreshTimer = null;
let liveChannel = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatViewers(value = 0) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(cents = 0, currency = 'USD') {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}

function getCategoryLabel(value = '') {
  const text = String(value || '').trim();
  if (!text) return 'Live';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getAccessLabel(stream = {}) {
  const accessType = String(stream?.access_type || 'free').toLowerCase();
  const priceCents = Number(stream?.price_cents || 0);
  const currency = stream?.currency || 'USD';

  if (accessType === 'paid' && priceCents > 0) {
    return formatMoney(priceCents, currency);
  }

  if (accessType === 'vip') {
    return 'VIP';
  }

  return 'Free';
}

function getStreamImage(stream = {}) {
  return (
    stream.thumbnail_url ||
    stream.cover_url ||
    BRAND_IMAGES.live ||
    BRAND_IMAGES.homeHero
  );
}

function getWatchHref(stream = {}) {
  if (stream?.slug) {
    return `/watch.html?slug=${encodeURIComponent(stream.slug)}`;
  }

  if (stream?.id) {
    return `/watch.html?id=${encodeURIComponent(stream.id)}`;
  }

  return '/watch.html';
}

function normalizeStream(stream = {}) {
  return {
    id: stream.id,
    creator_id: stream.creator_id || '',
    slug: stream.slug || '',
    title: stream.title || 'Untitled Live',
    description: stream.description || '',
    category: stream.category || 'live',
    status: stream.status || 'live',
    access_type: stream.access_type || 'free',
    price_cents: Number(stream.price_cents || 0),
    currency: stream.currency || 'USD',
    thumbnail_url: stream.thumbnail_url || '',
    cover_url: stream.cover_url || '',
    livekit_room_name: stream.livekit_room_name || '',
    started_at: stream.started_at || null,
    ended_at: stream.ended_at || null,
    is_chat_enabled: Boolean(stream.is_chat_enabled),
    is_featured: Boolean(stream.is_featured),
    viewer_count: Number(stream.viewer_count || 0),
    peak_viewers: Number(stream.peak_viewers || 0),
    total_chat_messages: Number(stream.total_chat_messages || 0),
    total_revenue_cents: Number(stream.total_revenue_cents || 0),
    last_activity_at: stream.last_activity_at || null,
    created_at: stream.created_at || null,
    updated_at: stream.updated_at || null
  };
}

function renderEmptyState(railElement, message = 'No one is live right now.') {
  railElement.innerHTML = `
    <div class="rb-live-empty">
      <div>
        <strong>${escapeHtml(message)}</strong>
        <span>When a creator starts streaming, the rail will fill automatically.</span>
      </div>
    </div>
  `;
}

function renderRail(railElement, streams = []) {
  if (!railElement) return;

  if (!Array.isArray(streams) || streams.length === 0) {
    renderEmptyState(railElement);
    return;
  }

  railElement.innerHTML = streams
    .map((stream) => {
      const watchHref = getWatchHref(stream);
      const image = getStreamImage(stream);
      const category = getCategoryLabel(stream.category);
      const accessLabel = getAccessLabel(stream);
      const viewers = formatViewers(stream.viewer_count);
      const title = escapeHtml(stream.title);
      const creator = escapeHtml(stream.creator_name || 'Rich Bizness Creator');

      return `
        <article class="rb-live-card">
          <a class="rb-live-card__media" href="${watchHref}">
            <img
              src="${image}"
              alt="${title}"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
            />
            <div class="rb-live-card__fallback" style="display:none;">
              LIVE
            </div>

            <div class="rb-live-card__overlay">
              <span class="rb-live-badge rb-live-badge--live">LIVE</span>
              <span class="rb-live-badge">${escapeHtml(category)}</span>
              <span class="rb-live-badge">${escapeHtml(accessLabel)}</span>
            </div>
          </a>

          <div class="rb-live-card__body">
            <div class="rb-live-card__meta">
              <span>${creator}</span>
              <span>${viewers} watching</span>
            </div>

            <h4 class="rb-live-card__title">${title}</h4>

            <a class="rb-live-watch-btn" href="${watchHref}">
              Watch now
            </a>
          </div>
        </article>
      `;
    })
    .join('');
}

async function fetchLiveStreams() {
  const { data, error } = await supabase
    .from('live_streams')
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
    .eq('status', 'live')
    .order('is_featured', { ascending: false })
    .order('viewer_count', { ascending: false })
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[home-live-rail] fetchLiveStreams error:', error);
    throw error;
  }

  return (data || []).map((row) => {
    const stream = normalizeStream(row);
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      ...stream,
      creator_name:
        profile?.display_name ||
        profile?.username ||
        'Rich Bizness Creator',
      creator_avatar:
        profile?.avatar_url ||
        profile?.profile_image_url ||
        ''
    };
  });
}

async function refreshRail(railElement) {
  if (!railElement) return;

  try {
    const streams = await fetchLiveStreams();
    renderRail(railElement, streams);
  } catch (error) {
    console.error('[home-live-rail] refreshRail error:', error);
    renderEmptyState(railElement, 'Live rail could not load right now.');
  }
}

function bindRealtime(railElement) {
  if (liveChannel) {
    supabase.removeChannel(liveChannel);
    liveChannel = null;
  }

  liveChannel = supabase
    .channel('rb-home-live-rail')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      },
      async () => {
        await refreshRail(railElement);
      }
    )
    .subscribe((status) => {
      console.log('[home-live-rail] realtime status:', status);
    });
}

function bindVisibilityRefresh(railElement) {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await refreshRail(railElement);
    }
  });
}

export async function bootLiveRail({
  railElementId = 'homepage-live-rail',
  autoRefresh = true,
  intervalMs = 15000
} = {}) {
  const railElement = document.getElementById(railElementId);
  if (!railElement) {
    console.warn('[home-live-rail] Missing rail element:', railElementId);
    return;
  }

  await refreshRail(railElement);
  bindRealtime(railElement);
  bindVisibilityRefresh(railElement);

  if (railRefreshTimer) {
    window.clearInterval(railRefreshTimer);
    railRefreshTimer = null;
  }

  if (autoRefresh) {
    railRefreshTimer = window.setInterval(async () => {
      await refreshRail(railElement);
    }, intervalMs);
  }
}
