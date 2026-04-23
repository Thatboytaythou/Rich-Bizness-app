<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rich Bizness — Admin Dashboard</title>
  <meta
    name="description"
    content="Rich Bizness admin dashboard for platform overview, creators, live streams, uploads, monetization, payouts, orders, and system activity."
  />

  <link rel="stylesheet" href="/styles/theme.css" />
  <link rel="stylesheet" href="/styles/base.css" />
  <link rel="stylesheet" href="/styles/layout.css" />
  <link rel="stylesheet" href="/styles/components.css" />
  <link rel="stylesheet" href="/styles/main.css" />
  <link rel="stylesheet" href="/styles/mobile.css" />

  <style>
    .admin-dashboard-page .admin-shell {
      display: grid;
      gap: 20px;
    }

    .admin-dashboard-page .admin-hero {
      position: relative;
      overflow: hidden;
      padding: 24px;
      border-radius: 24px;
      border: 1px solid var(--rb-border);
      background:
        linear-gradient(180deg, rgba(9, 17, 13, 0.68), rgba(5, 10, 8, 0.92)),
        url('/images/brand/19FB5229-30DD-40B0-9404-5136C27FEF6A.png') center / cover no-repeat;
      box-shadow: var(--rb-shadow), var(--rb-glow);
    }

    .admin-dashboard-page .admin-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      color: #d7f7e5;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .admin-dashboard-page .admin-hero h1 {
      margin: 16px 0 10px;
      font-size: clamp(34px, 5vw, 62px);
      line-height: 0.96;
      letter-spacing: -0.04em;
      max-width: 900px;
    }

    .admin-dashboard-page .admin-hero p {
      margin: 0;
      color: var(--rb-text-soft);
      max-width: 900px;
      line-height: 1.75;
      font-size: 15px;
    }

    .admin-dashboard-page .admin-top-grid {
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      gap: 18px;
      align-items: start;
    }

    .admin-dashboard-page .admin-side-stack,
    .admin-dashboard-page .admin-section-stack {
      display: grid;
      gap: 18px;
    }

    .admin-dashboard-page .admin-panel {
      border-radius: 24px;
      border: 1px solid var(--rb-border);
      background: linear-gradient(180deg, rgba(10,22,16,0.86), rgba(7,15,12,0.94));
      box-shadow: var(--rb-shadow), var(--rb-glow);
      overflow: hidden;
    }

    .admin-dashboard-page .admin-panel-head,
    .admin-dashboard-page .admin-panel-body {
      padding: 18px;
    }

    .admin-dashboard-page .admin-panel-head {
      padding-bottom: 0;
    }

    .admin-dashboard-page .admin-panel-head h3 {
      margin: 0;
      font-size: 22px;
      line-height: 1;
    }

    .admin-dashboard-page .admin-panel-head p {
      margin: 8px 0 0;
      color: var(--rb-text-soft);
      font-size: 13px;
      line-height: 1.65;
    }

    .admin-dashboard-page .admin-panel-body {
      display: grid;
      gap: 16px;
    }

    .admin-dashboard-page .admin-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .admin-dashboard-page .admin-stat-card {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid var(--rb-border);
      background: rgba(255,255,255,0.04);
    }

    .admin-dashboard-page .admin-stat-card span {
      display: block;
      color: var(--rb-text-soft);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }

    .admin-dashboard-page .admin-stat-card strong {
      display: block;
      font-size: 22px;
      line-height: 1.15;
    }

    .admin-dashboard-page .admin-mini-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .admin-dashboard-page .admin-mini-card {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid var(--rb-border);
      background: rgba(255,255,255,0.04);
    }

    .admin-dashboard-page .admin-mini-card strong {
      display: block;
      font-size: 15px;
      margin-bottom: 6px;
    }

    .admin-dashboard-page .admin-mini-card span {
      display: block;
      color: var(--rb-text-soft);
      font-size: 13px;
      line-height: 1.65;
    }

    .admin-dashboard-page .admin-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .admin-dashboard-page .admin-status-box {
      min-height: 56px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--rb-border);
      background: rgba(255,255,255,0.04);
      color: var(--rb-text-soft);
      font-size: 13px;
      line-height: 1.6;
    }

    .admin-dashboard-page .admin-status-box.is-error {
      border-color: rgba(255,109,122,0.24);
      background: rgba(255,109,122,0.08);
      color: #ffd7dc;
    }

    .admin-dashboard-page .admin-status-box.is-success {
      border-color: rgba(67,245,155,0.22);
      background: rgba(67,245,155,0.08);
      color: #d8ffea;
    }

    .admin-dashboard-page .admin-list {
      display: grid;
      gap: 12px;
    }

    .admin-dashboard-page .admin-list-card {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid var(--rb-border);
      background: rgba(255,255,255,0.04);
      display: grid;
      gap: 10px;
    }

    .admin-dashboard-page .admin-list-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .admin-dashboard-page .admin-list-head strong {
      display: block;
      font-size: 16px;
      line-height: 1.2;
    }

    .admin-dashboard-page .admin-list-head span {
      display: block;
      color: var(--rb-text-soft);
      font-size: 12px;
      line-height: 1.5;
    }

    .admin-dashboard-page .admin-list-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .admin-dashboard-page .admin-pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: #ecfff4;
      font-size: 12px;
      font-weight: 800;
    }

    .admin-dashboard-page .admin-pill.live {
      background: linear-gradient(135deg, #ff5e72, #ff7a4d);
      border-color: transparent;
    }

    .admin-dashboard-page .admin-pill.gold {
      background: rgba(255,200,87,0.12);
      border-color: rgba(255,200,87,0.20);
      color: #ffe6a7;
    }

    .admin-dashboard-page .admin-pill.green {
      background: rgba(67,245,155,0.10);
      border-color: rgba(67,245,155,0.22);
      color: #d8ffea;
    }

    .admin-dashboard-page .admin-list-copy {
      color: var(--rb-text-soft);
      font-size: 13px;
      line-height: 1.65;
    }

    .admin-dashboard-page .admin-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .admin-dashboard-page .admin-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .admin-dashboard-page .admin-empty {
      min-height: 160px;
      border-radius: 18px;
      border: 1px dashed rgba(255,255,255,0.10);
      display: grid;
      place-items: center;
      text-align: center;
      padding: 18px;
      color: var(--rb-text-soft);
      background: rgba(255,255,255,0.03);
    }

    .admin-dashboard-page .admin-empty strong {
      display: block;
      color: #ecfff4;
      margin-bottom: 8px;
      font-size: 17px;
    }

    .admin-dashboard-page .admin-toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .admin-dashboard-page .admin-toolbar .btn,
    .admin-dashboard-page .admin-toolbar .btn-ghost,
    .admin-dashboard-page .admin-toolbar .btn-gold,
    .admin-dashboard-page .admin-toolbar .btn-dark {
      min-width: 130px;
    }

    @media (max-width: 1200px) {
      .admin-dashboard-page .admin-top-grid,
      .admin-dashboard-page .admin-grid-2,
      .admin-dashboard-page .admin-grid-3 {
        grid-template-columns: 1fr;
      }

      .admin-dashboard-page .admin-stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .admin-dashboard-page .admin-stats-grid,
      .admin-dashboard-page .admin-mini-grid {
        grid-template-columns: 1fr;
      }

      .admin-dashboard-page .admin-panel-head,
      .admin-dashboard-page .admin-panel-body,
      .admin-dashboard-page .admin-hero {
        padding-left: 16px;
        padding-right: 16px;
      }

      .admin-dashboard-page .admin-actions .btn,
      .admin-dashboard-page .admin-actions .btn-ghost,
      .admin-dashboard-page .admin-actions .btn-gold,
      .admin-dashboard-page .admin-actions .btn-dark,
      .admin-dashboard-page .admin-toolbar .btn,
      .admin-dashboard-page .admin-toolbar .btn-ghost,
      .admin-dashboard-page .admin-toolbar .btn-gold,
      .admin-dashboard-page .admin-toolbar .btn-dark {
        width: 100%;
        min-width: 0;
      }
    }
  </style>
</head>
<body class="admin-dashboard-page">
  <div class="page-shell admin-shell">
    <div id="elite-platform-nav"></div>

    <section class="admin-hero">
      <div class="admin-kicker">Rich Bizness Admin</div>
      <h1>Platform command center for creators, live, orders, payouts, uploads, and system movement.</h1>
      <p>
        This dashboard gives you one place to monitor the Rich Bizness ecosystem. Track creator growth,
        live activity, premium movement, store orders, payout pressure, and content flow without losing platform structure.
      </p>
    </section>

    <section class="admin-top-grid">
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Platform overview</h3>
          <p>Real counts across the main departments that matter right now.</p>
        </div>

        <div class="admin-panel-body">
          <div id="admin-status" class="admin-status-box">Loading admin dashboard...</div>

          <div class="admin-stats-grid">
            <article class="admin-stat-card">
              <span>Total profiles</span>
              <strong id="stat-profiles">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Live streams</span>
              <strong id="stat-live-streams">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Products</span>
              <strong id="stat-products">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Store orders</span>
              <strong id="stat-orders">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Premium content</span>
              <strong id="stat-premium">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Tips</span>
              <strong id="stat-tips">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Open payouts</span>
              <strong id="stat-payouts">0</strong>
            </article>
            <article class="admin-stat-card">
              <span>Tracks</span>
              <strong id="stat-tracks">0</strong>
            </article>
          </div>

          <div class="admin-mini-grid">
            <article class="admin-mini-card">
              <strong>Revenue in motion</strong>
              <span id="revenue-summary">Calculating live, store, tips, and premium movement.</span>
            </article>
            <article class="admin-mini-card">
              <strong>Creator pressure</strong>
              <span id="creator-summary">Checking creator balances, payout demand, and content growth.</span>
            </article>
            <article class="admin-mini-card">
              <strong>Live ecosystem</strong>
              <span id="live-summary">Checking active stream pressure, viewer count, and chat movement.</span>
            </article>
            <article class="admin-mini-card">
              <strong>Store ecosystem</strong>
              <span id="store-summary">Checking order count, payment flow, and product activity.</span>
            </article>
          </div>

          <div class="admin-toolbar">
            <a class="btn" href="/live.html">Go Live</a>
            <a class="btn-ghost" href="/store-admin.html">Store Admin</a>
            <a class="btn-ghost" href="/admin-payouts.html">Payout Queue</a>
            <a class="btn-gold" href="/creator-dashboard.html">Creator Dashboard</a>
            <button class="btn-dark" id="refresh-admin-btn" type="button">Refresh Dashboard</button>
          </div>
        </div>
      </section>

      <aside class="admin-side-stack">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h3>Quick control</h3>
            <p>Fast jump to the departments that hold the system together.</p>
          </div>
          <div class="admin-panel-body">
            <div class="admin-actions">
              <a class="btn-ghost" href="/profile.html">Profile</a>
              <a class="btn-ghost" href="/feed.html">Feed</a>
              <a class="btn-ghost" href="/watch.html">Watch</a>
              <a class="btn-ghost" href="/messages.html">Messages</a>
              <a class="btn-ghost" href="/notifications.html">Notifications</a>
              <a class="btn-ghost" href="/music.html">Music</a>
              <a class="btn-ghost" href="/gaming.html">Gaming</a>
              <a class="btn-ghost" href="/sports.html">Sports</a>
              <a class="btn-ghost" href="/gallery.html">Gallery</a>
              <a class="btn-ghost" href="/store.html">Store</a>
              <a class="btn-ghost" href="/upload.html">Upload</a>
              <a class="btn-ghost" href="/monetization.html">Monetization</a>
            </div>
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel-head">
            <h3>Platform pressure</h3>
            <p>Fast snapshots of what needs eyes first.</p>
          </div>
          <div class="admin-panel-body">
            <div class="admin-list" id="admin-pressure-list">
              <div class="admin-empty">
                <div>
                  <strong>Loading pressure signals.</strong>
                  <span>The system is checking live, payouts, orders, and creator balances.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <section class="admin-grid-2">
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Recent live streams</h3>
          <p>Current and recent stream activity across the platform.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-live-list">
            <div class="admin-empty">
              <div>
                <strong>Loading live activity.</strong>
                <span>Recent live streams will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Creator balances</h3>
          <p>Watch available balance pressure across creators.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-balance-list">
            <div class="admin-empty">
              <div>
                <strong>Loading creator balances.</strong>
                <span>Balance records will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section class="admin-grid-2">
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Recent orders</h3>
          <p>Store movement, payment state, and creator-side order flow.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-order-list">
            <div class="admin-empty">
              <div>
                <strong>Loading store orders.</strong>
                <span>Recent store movement will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Payout requests</h3>
          <p>Pending payout pressure and payout pipeline visibility.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-payout-list">
            <div class="admin-empty">
              <div>
                <strong>Loading payout queue.</strong>
                <span>Payout requests will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section class="admin-grid-3">
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Premium content</h3>
          <p>Premium items and creator-side paid content inventory.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-premium-list">
            <div class="admin-empty">
              <div>
                <strong>Loading premium content.</strong>
                <span>Premium items will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Tracks</h3>
          <p>Recent music uploads and track movement.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-track-list">
            <div class="admin-empty">
              <div>
                <strong>Loading tracks.</strong>
                <span>Recent tracks will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel-head">
          <h3>Creators</h3>
          <p>Most recent profile movement across the platform.</p>
        </div>
        <div class="admin-panel-body">
          <div class="admin-list" id="admin-profile-list">
            <div class="admin-empty">
              <div>
                <strong>Loading creators.</strong>
                <span>Recent profiles will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>

  <script>
    window.NEXT_PUBLIC_SUPABASE_URL = "https://ksvdequymkceevocgpdj.supabase.co";
    window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";
    window.SUPABASE_URL = window.NEXT_PUBLIC_SUPABASE_URL;
    window.SUPABASE_PUBLISHABLE_KEY = window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  </script>

  <script type="module">
    import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
    import { mountEliteNav } from "/core/nav.js";
    import { supabase } from "/core/supabase.js";
    import { formatMoney, formatNumber } from "/core/config.js";

    const els = {
      status: document.getElementById("admin-status"),
      refreshBtn: document.getElementById("refresh-admin-btn"),

      statProfiles: document.getElementById("stat-profiles"),
      statLiveStreams: document.getElementById("stat-live-streams"),
      statProducts: document.getElementById("stat-products"),
      statOrders: document.getElementById("stat-orders"),
      statPremium: document.getElementById("stat-premium"),
      statTips: document.getElementById("stat-tips"),
      statPayouts: document.getElementById("stat-payouts"),
      statTracks: document.getElementById("stat-tracks"),

      revenueSummary: document.getElementById("revenue-summary"),
      creatorSummary: document.getElementById("creator-summary"),
      liveSummary: document.getElementById("live-summary"),
      storeSummary: document.getElementById("store-summary"),

      pressureList: document.getElementById("admin-pressure-list"),
      liveList: document.getElementById("admin-live-list"),
      balanceList: document.getElementById("admin-balance-list"),
      orderList: document.getElementById("admin-order-list"),
      payoutList: document.getElementById("admin-payout-list"),
      premiumList: document.getElementById("admin-premium-list"),
      trackList: document.getElementById("admin-track-list"),
      profileList: document.getElementById("admin-profile-list")
    };

    function setStatus(message, type = "normal") {
      els.status.textContent = message;
      els.status.classList.remove("is-error", "is-success");

      if (type === "error") els.status.classList.add("is-error");
      if (type === "success") els.status.classList.add("is-success");
    }

    function escapeHtml(value = "") {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function safeDate(value) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString();
    }

    function emptyBlock(title, copy) {
      return `
        <div class="admin-empty">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(copy)}</span>
          </div>
        </div>
      `;
    }

    function money(value = 0, currency = "USD") {
      return formatMoney(Number(value || 0), currency || "USD");
    }

    function count(value = 0) {
      return formatNumber(Number(value || 0));
    }

    async function countTable(tableName) {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error(`[admin] countTable ${tableName} error:`, error);
        return 0;
      }

      return count || 0;
    }

    async function fetchRows(tableName, options = {}) {
      let query = supabase.from(tableName).select(options.select || "*");

      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: !!options.ascending });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[admin] fetchRows ${tableName} error:`, error);
        return [];
      }

      return data || [];
    }

    function liveCard(stream = {}) {
      const statusClass = String(stream.status || "").toLowerCase() === "live" ? "live" : "";
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(stream.title || "Untitled Live")}</strong>
              <span>${escapeHtml(safeDate(stream.created_at))}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill ${statusClass}">${escapeHtml(stream.status || "draft")}</span>
              <span class="admin-pill">${escapeHtml(stream.access_type || "free")}</span>
            </div>
          </div>
          <div class="admin-list-copy">
            ${escapeHtml(stream.description || "No live description.")}
          </div>
          <div class="admin-list-meta">
            <span class="admin-pill green">${count(stream.viewer_count || 0)} viewers</span>
            <span class="admin-pill">${count(stream.total_chat_messages || 0)} chats</span>
            <span class="admin-pill gold">${money(stream.total_revenue_cents || 0, stream.currency || "USD")}</span>
          </div>
        </article>
      `;
    }

    function balanceCard(balance = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(balance.artist_user_id || "Unknown creator")}</strong>
              <span>Creator balance snapshot</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill green">${money(balance.available_cents || 0, "USD")} available</span>
            </div>
          </div>
          <div class="admin-list-meta">
            <span class="admin-pill">${money(balance.earned_cents || 0, "USD")} earned</span>
            <span class="admin-pill">${money(balance.paid_out_cents || 0, "USD")} paid out</span>
          </div>
        </article>
      `;
    }

    function orderCard(order = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(order.product_name || "Store order")}</strong>
              <span>${escapeHtml(order.customer_email || "No customer email")}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill">${escapeHtml(order.payment_status || "unknown")}</span>
              <span class="admin-pill">${escapeHtml(order.order_status || "pending")}</span>
            </div>
          </div>
          <div class="admin-list-meta">
            <span class="admin-pill gold">${money(order.amount_total || 0, order.currency || "USD")}</span>
            <span class="admin-pill">${count(order.quantity || 0)} qty</span>
            <span class="admin-pill">${escapeHtml(safeDate(order.created_at))}</span>
          </div>
        </article>
      `;
    }

    function payoutCard(payout = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(payout.user_id || payout.creator_id || "Payout request")}</strong>
              <span>${escapeHtml(safeDate(payout.created_at))}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill">${escapeHtml(payout.status || "pending")}</span>
            </div>
          </div>
          <div class="admin-list-meta">
            <span class="admin-pill gold">${money(payout.amount_cents || payout.amount_total || 0, payout.currency || "USD")}</span>
          </div>
        </article>
      `;
    }

    function premiumCard(item = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(item.title || "Premium content")}</strong>
              <span>${escapeHtml(item.content_type || "premium")}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill ${item.is_active ? "green" : ""}">${item.is_active ? "active" : "inactive"}</span>
            </div>
          </div>
          <div class="admin-list-copy">${escapeHtml(item.description || "No description.")}</div>
          <div class="admin-list-meta">
            <span class="admin-pill gold">${money(item.price_cents || 0, "USD")}</span>
          </div>
        </article>
      `;
    }

    function trackCard(track = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(track.title || "Untitled Track")}</strong>
              <span>${escapeHtml(track.artist_name || "Unknown Artist")}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill">${escapeHtml(track.genre || "genre")}</span>
            </div>
          </div>
          <div class="admin-list-meta">
            <span class="admin-pill green">${count(track.play_count || 0)} plays</span>
            <span class="admin-pill">${count(track.like_count || 0)} likes</span>
          </div>
        </article>
      `;
    }

    function profileCard(profile = {}) {
      return `
        <article class="admin-list-card">
          <div class="admin-list-head">
            <div>
              <strong>${escapeHtml(profile.display_name || profile.username || "Rich Bizness User")}</strong>
              <span>@${escapeHtml(profile.handle || profile.username || "richbizness")}</span>
            </div>
            <div class="admin-list-meta">
              <span class="admin-pill">${escapeHtml(safeDate(profile.created_at || profile.updated_at))}</span>
            </div>
          </div>
          <div class="admin-list-copy">${escapeHtml(profile.bio || "No bio yet.")}</div>
        </article>
      `;
    }

    async function renderCounts() {
      const [
        profiles,
        liveStreams,
        products,
        orders,
        premium,
        tips,
        payouts,
        tracks
      ] = await Promise.all([
        countTable("profiles"),
        countTable("live_streams"),
        countTable("products"),
        countTable("store_orders"),
        countTable("premium_content"),
        countTable("tips"),
        countTable("payout_requests"),
        countTable("tracks")
      ]);

      els.statProfiles.textContent = count(profiles);
      els.statLiveStreams.textContent = count(liveStreams);
      els.statProducts.textContent = count(products);
      els.statOrders.textContent = count(orders);
      els.statPremium.textContent = count(premium);
      els.statTips.textContent = count(tips);
      els.statPayouts.textContent = count(payouts);
      els.statTracks.textContent = count(tracks);

      return { profiles, liveStreams, products, orders, premium, tips, payouts, tracks };
    }

    async function renderPressure() {
      const [
        liveRows,
        payoutRows,
        balanceRows,
        orderRows
      ] = await Promise.all([
        fetchRows("live_streams", { orderBy: "viewer_count", ascending: false, limit: 5 }),
        fetchRows("payout_requests", { orderBy: "created_at", ascending: false, limit: 5 }),
        fetchRows("creator_available_balances", { orderBy: "available_cents", ascending: false, limit: 5 }),
        fetchRows("store_orders", { orderBy: "created_at", ascending: false, limit: 5 })
      ]);

      const liveCount = liveRows.filter((row) => String(row.status || "").toLowerCase() === "live").length;
      const payoutCount = payoutRows.filter((row) => String(row.status || "").toLowerCase() !== "paid").length;
      const balancePressure = balanceRows.reduce((sum, row) => sum + Number(row.available_cents || 0), 0);
      const orderPressure = orderRows.length;

      els.revenueSummary.textContent =
        `${money(
          liveRows.reduce((sum, row) => sum + Number(row.total_revenue_cents || 0), 0) +
          orderRows.reduce((sum, row) => sum + Number(row.amount_total || 0), 0),
          "USD"
        )} moving across live and store snapshots.`;

      els.creatorSummary.textContent =
        `${count(balanceRows.length)} balance records loaded with ${money(balancePressure, "USD")} available across current snapshot.`;

      els.liveSummary.textContent =
        `${count(liveCount)} live streams active right now with ${count(
          liveRows.reduce((sum, row) => sum + Number(row.viewer_count || 0), 0)
        )} total viewers in snapshot.`;

      els.storeSummary.textContent =
        `${count(orderPressure)} recent orders loaded across current store movement.`;

      const pressureCards = [];

      if (liveCount > 0) {
        pressureCards.push(`
          <article class="admin-list-card">
            <div class="admin-list-head">
              <div>
                <strong>Live pressure</strong>
                <span>Current live load across the platform</span>
              </div>
              <div class="admin-list-meta">
                <span class="admin-pill live">${count(liveCount)} live</span>
              </div>
            </div>
            <div class="admin-list-copy">Streams are active right now and should stay monitored for viewer movement, access flow, and chat volume.</div>
          </article>
        `);
      }

      if (payoutCount > 0) {
        pressureCards.push(`
          <article class="admin-list-card">
            <div class="admin-list-head">
              <div>
                <strong>Payout queue pressure</strong>
                <span>Open payout requests that still need movement</span>
              </div>
              <div class="admin-list-meta">
                <span class="admin-pill gold">${count(payoutCount)} open</span>
              </div>
            </div>
            <div class="admin-list-copy">The payout queue still has active requests that should stay visible inside the admin lane.</div>
          </article>
        `);
      }

      if (balancePressure > 0) {
        pressureCards.push(`
          <article class="admin-list-card">
            <div class="admin-list-head">
              <div>
                <strong>Creator balance pressure</strong>
                <span>Available creator funds inside the current snapshot</span>
              </div>
              <div class="admin-list-meta">
                <span class="admin-pill green">${money(balancePressure, "USD")}</span>
              </div>
            </div>
            <div class="admin-list-copy">Creator balances show how much payout pressure is building inside the platform.</div>
          </article>
        `);
      }

      els.pressureList.innerHTML = pressureCards.length
        ? pressureCards.join("")
        : emptyBlock("No pressure signals right now.", "The dashboard did not detect any strong admin pressure from the current snapshot.");
    }

    async function renderSectionLists() {
      const [
        liveRows,
        balanceRows,
        orderRows,
        payoutRows,
        premiumRows,
        trackRows,
        profileRows
      ] = await Promise.all([
        fetchRows("live_streams", { orderBy: "created_at", ascending: false, limit: 6 }),
        fetchRows("creator_available_balances", { orderBy: "available_cents", ascending: false, limit: 6 }),
        fetchRows("store_orders", { orderBy: "created_at", ascending: false, limit: 6 }),
        fetchRows("payout_requests", { orderBy: "created_at", ascending: false, limit: 6 }),
        fetchRows("premium_content", { orderBy: "created_at", ascending: false, limit: 6 }),
        fetchRows("tracks", { orderBy: "created_at", ascending: false, limit: 6 }),
        fetchRows("profiles", { orderBy: "updated_at", ascending: false, limit: 6 })
      ]);

      els.liveList.innerHTML = liveRows.length
        ? liveRows.map(liveCard).join("")
        : emptyBlock("No live streams yet.", "Live stream records will appear here.");

      els.balanceList.innerHTML = balanceRows.length
        ? balanceRows.map(balanceCard).join("")
        : emptyBlock("No creator balances yet.", "Creator balance records will appear here.");

      els.orderList.innerHTML = orderRows.length
        ? orderRows.map(orderCard).join("")
        : emptyBlock("No store orders yet.", "Store orders will appear here.");

      els.payoutList.innerHTML = payoutRows.length
        ? payoutRows.map(payoutCard).join("")
        : emptyBlock("No payout requests yet.", "Payout requests will appear here.");

      els.premiumList.innerHTML = premiumRows.length
        ? premiumRows.map(premiumCard).join("")
        : emptyBlock("No premium content yet.", "Premium content records will appear here.");

      els.trackList.innerHTML = trackRows.length
        ? trackRows.map(trackCard).join("")
        : emptyBlock("No tracks yet.", "Recent tracks will appear here.");

      els.profileList.innerHTML = profileRows.length
        ? profileRows.map(profileCard).join("")
        : emptyBlock("No profiles yet.", "Recent profile records will appear here.");
    }

    async function bootAdminDashboard() {
      await initApp();

      mountEliteNav({
        target: "#elite-platform-nav",
        collapsed: false
      });

      const currentUser = getCurrentUserState();
      const currentProfile = getCurrentProfileState();

      if (!currentUser?.id) {
        setStatus("Login required before entering admin dashboard.", "error");
        return;
      }

      const isAdminLike =
        currentProfile?.is_admin ||
        currentProfile?.is_super_admin ||
        currentProfile?.role === "admin" ||
        currentProfile?.account_role === "admin";

      if (!isAdminLike) {
        setStatus("This dashboard is restricted to admin access.", "error");
      } else {
        setStatus("Admin dashboard loaded.", "success");
      }

      await renderCounts();
      await renderPressure();
      await renderSectionLists();
    }

    els.refreshBtn?.addEventListener("click", async () => {
      setStatus("Refreshing admin dashboard...");
      await renderCounts();
      await renderPressure();
      await renderSectionLists();
      setStatus("Admin dashboard refreshed.", "success");
    });

    bootAdminDashboard().catch((error) => {
      console.error("[admin-dashboard] boot error:", error);
      setStatus(error.message || "Could not load admin dashboard.", "error");
    });
  </script>
</body>
</html>
