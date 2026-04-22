// core/nav.js

import { ROUTES, isActiveRoute, BRAND_IMAGES } from '/core/config.js';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { key: 'home', label: 'Home', href: ROUTES.home },
      { key: 'feed', label: 'Feed', href: ROUTES.feed },
      { key: 'watch', label: 'Watch', href: ROUTES.watch },
      { key: 'live', label: 'Live', href: ROUTES.live, accent: 'green' }
    ]
  },
  {
    label: 'Creator',
    items: [
      { key: 'profile', label: 'Profile', href: ROUTES.profile },
      { key: 'artistHome', label: 'Artist', href: ROUTES.artistHome },
      { key: 'creatorDashboard', label: 'Dashboard', href: ROUTES.creatorDashboard },
      { key: 'upload', label: 'Upload', href: ROUTES.upload, accent: 'gold' }
    ]
  },
  {
    label: 'Lanes',
    items: [
      { key: 'music', label: 'Music', href: ROUTES.music },
      { key: 'gaming', label: 'Gaming', href: ROUTES.gaming },
      { key: 'sports', label: 'Sports', href: ROUTES.sports },
      { key: 'gallery', label: 'Gallery', href: ROUTES.gallery },
      { key: 'store', label: 'Store', href: ROUTES.store }
    ]
  },
  {
    label: 'Social',
    items: [
      { key: 'messages', label: 'Messages', href: ROUTES.messages },
      { key: 'notifications', label: 'Notifications', href: ROUTES.notifications },
      { key: 'monetization', label: 'Money', href: ROUTES.monetization },
      { key: 'adminDashboard', label: 'Admin', href: ROUTES.adminDashboard }
    ]
  }
];

function injectStyles() {
  if (document.getElementById('rb-nav-styles')) return;

  const style = document.createElement('style');
  style.id = 'rb-nav-styles';
  style.textContent = `
    .rb-nav-shell {
      display: grid;
      gap: 14px;
      width: 100%;
    }

    .rb-nav-panel {
      border: 1px solid rgba(110, 255, 176, 0.16);
      background: rgba(7, 16, 12, 0.82);
      backdrop-filter: blur(14px);
      border-radius: 22px;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.36);
      overflow: hidden;
    }

    .rb-nav-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(110, 255, 176, 0.10);
      flex-wrap: wrap;
    }

    .rb-nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .rb-nav-brand-mark {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(67,245,155,0.26), rgba(24,201,114,0.12));
      border: 1px solid rgba(110,255,176,0.34);
      box-shadow: 0 0 24px rgba(67,245,155,0.18);
      flex-shrink: 0;
    }

    .rb-nav-brand-mark img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .rb-nav-brand-copy {
      min-width: 0;
    }

    .rb-nav-brand-copy strong {
      display: block;
      font-size: 18px;
      line-height: 1;
      color: #ecfff4;
      letter-spacing: 0.02em;
    }

    .rb-nav-brand-copy span {
      display: block;
      margin-top: 6px;
      color: #97b8a6;
      font-size: 12px;
      line-height: 1.4;
    }

    .rb-nav-toggle {
      min-height: 44px;
      min-width: 44px;
      padding: 10px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: #ecfff4;
      font-weight: 900;
      cursor: pointer;
      transition: transform .15s ease, border-color .15s ease, background .15s ease;
    }

    .rb-nav-toggle:hover {
      transform: translateY(-1px);
      border-color: rgba(110,255,176,0.22);
    }

    .rb-nav-groups {
      display: grid;
      gap: 16px;
      padding: 18px;
    }

    .rb-nav-group {
      display: grid;
      gap: 10px;
    }

    .rb-nav-group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .rb-nav-group-head strong {
      color: #d8ffea;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .rb-nav-group-head span {
      color: #97b8a6;
      font-size: 11px;
    }

    .rb-nav-links {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .rb-nav-link {
      min-height: 50px;
      border-radius: 16px;
      padding: 12px 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-weight: 800;
      color: #ecfff4;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      transition: transform .15s ease, border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }

    .rb-nav-link:hover {
      transform: translateY(-1px);
      border-color: rgba(110,255,176,0.24);
    }

    .rb-nav-link.is-active {
      background: linear-gradient(135deg, rgba(67,245,155,0.18), rgba(24,201,114,0.10));
      border-color: rgba(110,255,176,0.34);
      box-shadow: 0 10px 24px rgba(24, 201, 114, 0.16);
    }

    .rb-nav-link.is-green {
      background: linear-gradient(135deg, #43f59b, #18c972);
      color: #062312;
      border-color: transparent;
      box-shadow: 0 10px 28px rgba(24, 201, 114, 0.28);
    }

    .rb-nav-link.is-gold {
      background: linear-gradient(135deg, #f5df87, #ffc857);
      color: #2e1d02;
      border-color: transparent;
      box-shadow: 0 10px 28px rgba(255, 200, 87, 0.20);
    }

    .rb-nav-link.is-active.is-green,
    .rb-nav-link.is-active.is-gold {
      transform: translateY(-1px);
    }

    .rb-nav-footer {
      padding: 16px 18px 18px;
      border-top: 1px solid rgba(110,255,176,0.10);
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
    }

    .rb-nav-footer p {
      margin: 0;
      color: #97b8a6;
      font-size: 12px;
      line-height: 1.5;
    }

    .rb-nav-quick {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .rb-nav-quick a {
      min-height: 40px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.04);
      color: #ecfff4;
      font-size: 12px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .rb-nav-collapsed .rb-nav-groups,
    .rb-nav-collapsed .rb-nav-footer {
      display: none;
    }

    @media (max-width: 1180px) {
      .rb-nav-links {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 680px) {
      .rb-nav-top {
        align-items: flex-start;
        flex-direction: column;
      }

      .rb-nav-toggle {
        width: 100%;
      }

      .rb-nav-links {
        grid-template-columns: 1fr;
      }

      .rb-nav-quick {
        width: 100%;
      }

      .rb-nav-quick a {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function buildLink(item) {
  const classes = ['rb-nav-link'];
  if (item.accent === 'green') classes.push('is-green');
  if (item.accent === 'gold') classes.push('is-gold');
  if (isActiveRoute(item.href)) classes.push('is-active');

  return `
    <a class="${classes.join(' ')}" href="${item.href}" data-route-key="${item.key}">
      ${item.label}
    </a>
  `;
}

function buildGroup(group) {
  return `
    <section class="rb-nav-group">
      <div class="rb-nav-group-head">
        <strong>${group.label}</strong>
        <span>${group.items.length} routes</span>
      </div>
      <div class="rb-nav-links">
        ${group.items.map(buildLink).join('')}
      </div>
    </section>
  `;
}

export function mountEliteNav({
  target = '#elite-platform-nav',
  collapsed = false
} = {}) {
  injectStyles();

  const container =
    typeof target === 'string' ? document.querySelector(target) : target;

  if (!container) return null;

  container.innerHTML = `
    <div class="rb-nav-shell">
      <section class="rb-nav-panel ${collapsed ? 'rb-nav-collapsed' : ''}" id="rb-nav-panel">
        <div class="rb-nav-top">
          <div class="rb-nav-brand">
            <div class="rb-nav-brand-mark">
              <img src="${BRAND_IMAGES.logo}" alt="Rich Bizness logo" />
            </div>
            <div class="rb-nav-brand-copy">
              <strong>Rich Bizness</strong>
              <span>Elite creator platform routing for every major lane.</span>
            </div>
          </div>

          <button class="rb-nav-toggle" id="rb-nav-toggle" type="button">
            ${collapsed ? 'Open Menu' : 'Collapse Menu'}
          </button>
        </div>

        <div class="rb-nav-groups">
          ${NAV_GROUPS.map(buildGroup).join('')}
        </div>

        <div class="rb-nav-footer">
          <p>
            Main routes locked for home, creator, live, music, gaming, sports,
            gallery, store, and social movement.
          </p>

          <div class="rb-nav-quick">
            <a href="${ROUTES.live}">Go Live</a>
            <a href="${ROUTES.watch}">Watch</a>
            <a href="${ROUTES.upload}">Upload</a>
            <a href="${ROUTES.creatorDashboard}">Dashboard</a>
          </div>
        </div>
      </section>
    </div>
  `;

  const panel = container.querySelector('#rb-nav-panel');
  const toggle = container.querySelector('#rb-nav-toggle');

  toggle?.addEventListener('click', () => {
    panel.classList.toggle('rb-nav-collapsed');
    const isCollapsed = panel.classList.contains('rb-nav-collapsed');
    toggle.textContent = isCollapsed ? 'Open Menu' : 'Collapse Menu';
  });

  return panel;
}
