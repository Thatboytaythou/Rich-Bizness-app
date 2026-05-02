import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase } from "/core/supabase.js";
import { formatMoney, formatNumber } from "/core/config.js";

const $ = (id) => document.getElementById(id);

const els = {
  status: $("admin-status"),
  refreshBtn: $("refresh-admin-btn"),

  statProfiles: $("stat-profiles"),
  statLiveStreams: $("stat-live-streams"),
  statProducts: $("stat-products"),
  statOrders: $("stat-orders"),
  statPremium: $("stat-premium"),
  statTips: $("stat-tips"),
  statPayouts: $("stat-payouts"),
  statTracks: $("stat-tracks"),

  pressureList: $("admin-pressure-list"),
  liveList: $("admin-live-list"),
  balanceList: $("admin-balance-list"),
  orderList: $("admin-order-list"),
  payoutList: $("admin-payout-list"),
  premiumList: $("admin-premium-list"),
  trackList: $("admin-track-list"),
  profileList: $("admin-profile-list")
};

/* =========================
UTILS
========================= */

function setStatus(msg, type = "normal") {
  els.status.textContent = msg;
  els.status.classList.remove("is-error", "is-success");
  if (type === "error") els.status.classList.add("is-error");
  if (type === "success") els.status.classList.add("is-success");
}

function money(v = 0, c = "USD") {
  return formatMoney(Number(v || 0), c);
}

function count(v = 0) {
  return formatNumber(Number(v || 0));
}

/* =========================
SAFE FETCH (IMPORTANT FIX)
========================= */

async function safeFetch(table, opts = {}) {
  let q = supabase.from(table).select(opts.select || "*");

  if (opts.order) q = q.order(opts.order, { ascending: !!opts.asc });
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;

  if (error) {
    console.warn(`[admin] ${table} skipped`, error.message);
    return [];
  }

  return data || [];
}

async function safeCount(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count || 0;
}

/* =========================
COUNTS
========================= */

async function loadCounts() {
  const [
    profiles,
    live,
    products,
    orders,
    premium,
    tips,
    payouts,
    tracks
  ] = await Promise.all([
    safeCount("profiles"),
    safeCount("live_streams"),
    safeCount("products"),
    safeCount("store_orders"),
    safeCount("premium_content"),
    safeCount("tips"),
    safeCount("payout_requests"),
    safeCount("tracks")
  ]);

  els.statProfiles.textContent = count(profiles);
  els.statLiveStreams.textContent = count(live);
  els.statProducts.textContent = count(products);
  els.statOrders.textContent = count(orders);
  els.statPremium.textContent = count(premium);
  els.statTips.textContent = count(tips);
  els.statPayouts.textContent = count(payouts);
  els.statTracks.textContent = count(tracks);
}

/* =========================
LIVE LIST (FIXED CORE TABLE)
========================= */

async function loadLive() {
  const rows = await safeFetch("live_streams", {
    order: "created_at",
    limit: 6
  });

  if (!rows.length) {
    els.liveList.innerHTML = `<div class="admin-empty"><strong>No live streams</strong></div>`;
    return;
  }

  els.liveList.innerHTML = rows.map(s => `
    <div class="admin-list-card">
      <strong>${s.title || "Untitled"}</strong>
      <span>${s.status}</span>

      <div>
        👁 ${count(s.viewer_count)}
        💬 ${count(s.total_chat_messages)}
      </div>

      <div>
        <button onclick="window.open('/watch.html?slug=${s.slug}')">Open</button>
      </div>
    </div>
  `).join("");
}

/* =========================
BALANCES
========================= */

async function loadBalances() {
  const rows = await safeFetch("creator_available_balances", {
    order: "available_cents",
    limit: 6
  });

  els.balanceList.innerHTML = rows.length
    ? rows.map(b => `
      <div class="admin-list-card">
        <strong>${b.artist_user_id}</strong>
        <span>${money(b.available_cents)}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No balances</strong></div>`;
}

/* =========================
ORDERS
========================= */

async function loadOrders() {
  const rows = await safeFetch("store_orders", {
    order: "created_at",
    limit: 6
  });

  els.orderList.innerHTML = rows.length
    ? rows.map(o => `
      <div class="admin-list-card">
        <strong>${o.product_name}</strong>
        <span>${money(o.amount_total)}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No orders</strong></div>`;
}

/* =========================
PAYOUTS
========================= */

async function loadPayouts() {
  const rows = await safeFetch("payout_requests", {
    order: "created_at",
    limit: 6
  });

  els.payoutList.innerHTML = rows.length
    ? rows.map(p => `
      <div class="admin-list-card">
        <strong>${p.user_id}</strong>
        <span>${p.status}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No payouts</strong></div>`;
}

/* =========================
PREMIUM
========================= */

async function loadPremium() {
  const rows = await safeFetch("premium_content", {
    order: "created_at",
    limit: 6
  });

  els.premiumList.innerHTML = rows.length
    ? rows.map(p => `
      <div class="admin-list-card">
        <strong>${p.title}</strong>
        <span>${money(p.price_cents)}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No premium content</strong></div>`;
}

/* =========================
TRACKS
========================= */

async function loadTracks() {
  const rows = await safeFetch("tracks", {
    order: "created_at",
    limit: 6
  });

  els.trackList.innerHTML = rows.length
    ? rows.map(t => `
      <div class="admin-list-card">
        <strong>${t.title}</strong>
        <span>${t.artist_name}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No tracks</strong></div>`;
}

/* =========================
PROFILES
========================= */

async function loadProfiles() {
  const rows = await safeFetch("profiles", {
    order: "created_at",
    limit: 6
  });

  els.profileList.innerHTML = rows.length
    ? rows.map(p => `
      <div class="admin-list-card">
        <strong>${p.display_name || p.username}</strong>
        <span>@${p.username}</span>
      </div>
    `).join("")
    : `<div class="admin-empty"><strong>No profiles</strong></div>`;
}

/* =========================
BOOT
========================= */

async function boot() {
  await initApp();

  mountEliteNav({ target: "#elite-platform-nav" });

  const user = getCurrentUserState();
  const profile = getCurrentProfileState();

  if (!user) {
    setStatus("Login required", "error");
    return;
  }

  if (profile?.role !== "admin") {
    setStatus("Admin only access", "error");
  } else {
    setStatus("Admin ready", "success");
  }

  await Promise.all([
    loadCounts(),
    loadLive(),
    loadBalances(),
    loadOrders(),
    loadPayouts(),
    loadPremium(),
    loadTracks(),
    loadProfiles()
  ]);
}

els.refreshBtn?.addEventListener("click", boot);

boot();
