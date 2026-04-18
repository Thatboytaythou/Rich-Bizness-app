import { fetchLiveRail } from './live-api.js';

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatAccessLabel(accessType, priceCents = 0, currency = 'usd') {
  if (accessType === 'paid') {
    const amount = Number(priceCents || 0) / 100;
    return amount > 0
      ? `PAID • ${amount.toLocaleString(undefined, {
          style: 'currency',
          currency: String(currency || 'usd').toUpperCase()
        })}`
      : 'PAID';
  }

  if (accessType === 'followers') return 'FOLLOWERS';
  if (accessType === 'vip') return 'VIP';
  return 'FREE';
}

function cardTemplate(stream) {
  const title = escapeHtml(stream.title || 'Live Stream');
  const category = escapeHtml(stream.category || 'general');
  const slug = encodeURIComponent(stream.slug || '');
  const thumbnailUrl = stream.thumbnail_url
    ? escapeHtml(stream.thumbnail_url)
    : '';
  const viewers = Number(stream.viewer_count || 0);
  const accessLabel = formatAccessLabel(
    stream.access_type,
    stream.price_cents,
    stream.currency
  );

  return `
    <article class="rb-live-card">
      <a class="rb-live-card__media" href="/watch.html?slug=${slug}">
        ${
          thumbnailUrl
            ? `<img src="${thumbnailUrl}" alt="${title}" loading="lazy" />`
            : `<div class="rb-live-card__fallback">LIVE NOW</div>`
        }
        <div class="rb-live-card__overlay">
          <span class="rb-live-badge rb-live-badge--live">LIVE</span>
          <span class="rb-live-badge">${escapeHtml(accessLabel)}</span>
        </div>
      </a>

      <div class="rb-live-card__body">
        <div class="rb-live-card__meta">
          <span>${category}</span>
          <span>${viewers} viewer${viewers === 1 ? '' : 's'}</span>
        </div>

        <h3 class="rb-live-card__title">
          <a href="/watch.html?slug=${slug}">${title}</a>
        </h3>

        <div class="rb-live-card__actions">
          <a class="rb-live-watch-btn" href="/watch.html?slug=${slug}">
            Join Live
          </a>
        </div>
      </div>
    </article>
  `;
}

function setStatus(message = '') {
  const node = qs('homepage-live-rail-status');
  if (!node) return;
  node.textContent = message;
}

function renderRail(streams = []) {
  const rail = qs('homepage-live-rail');
  if (!rail) return;

  if (!Array.isArray(streams) || streams.length === 0) {
    rail.innerHTML = `
      <div class="rb-live-empty">
        <strong>No one is live right now.</strong>
        <span>When a creator starts streaming, the live rail will appear here.</span>
      </div>
    `;
    return;
  }

  rail.innerHTML = streams.map(cardTemplate).join('');
}

async function loadLiveRail() {
  try {
    setStatus('Loading live streams...');
    const result = await fetchLiveRail();
    renderRail(result.streams || []);
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Failed to load live streams');
    renderRail([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLiveRail();
});
