// =========================
// RICH BIZNESS — CREATOR DASHBOARD FINAL SYNC
// /core/pages/creator-dashboard.js
// Sources:
// profiles, followers, posts, music_tracks, products,
// premium_content, live_streams, tips, store_orders,
// payout_requests, creator_available_balances
// =========================

import {
  initApp,
  getSupabase,
  getCurrentUserState,
  getCurrentProfileState
} from "/core/app.js";

import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();
let currentProfile = getCurrentProfileState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  refreshBtn: $("creator-dashboard-refresh-btn"),
  status: $("creator-dashboard-status"),

  banner: $("creator-hero-banner"),
  avatar: $("creator-hero-avatar"),
  name: $("creator-hero-name"),
  handle: $("creator-hero-handle"),
  copy: $("creator-hero-copy"),

  statFollowers: $("creator-stat-followers"),
  statPosts: $("creator-stat-posts"),
  statTracks: $("creator-stat-tracks"),
  statProducts: $("creator-stat-products"),
  statPremium: $("creator-stat-premium"),
  statLive: $("creator-stat-live"),
  statTips: $("creator-stat-tips"),
  statRevenue: $("creator-stat-revenue"),

  balanceAvailable: $("creator-balance-available"),
  balanceEarned: $("creator-balance-earned"),
  balancePaidOut: $("creator-balance-paid-out"),

  summaryLive: $("creator-summary-live"),
  summaryStore: $("creator-summary-store"),
  summaryContent: $("creator-summary-content"),
  summaryMoney: $("creator-summary-money"),

  liveList: $("creator-dashboard-live-list"),
  musicList: $("creator-dashboard-music-list"),
  productsList: $("creator-dashboard-products-list"),
  premiumList: $("creator-dashboard-premium-list"),
  ordersList: $("creator-dashboard-orders-list"),
  tipsList: $("creator-dashboard-tips-list"),
  payoutsList: $("creator-dashboard-payouts-list"),
  postsList: $("creator-dashboard-posts-list")
};

const FALLBACK_AVATAR = "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";
const FALLBACK_BANNER = "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `dashboard-status ${type}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function setText(el, value) {
  if (el) el.textContent = value;
}

function setList(el, html, emptyText = "Nothing here yet.") {
  if (!el) return;
  el.innerHTML = html || `<div class="empty-list">${emptyText}</div>`;
}

async function getUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

async function loadProfile() {
  const user = await getUser();
  if (!user?.id) return null;

  if (currentProfile?.id) return currentProfile;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  currentProfile = data || null;
  return currentProfile;
}

function renderHero(profile, user) {
  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Creator Dashboard";

  const handle =
    profile?.username ||
    profile?.handle ||
    user?.email?.split("@")[0] ||
    "richbizness";

  const avatar =
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    FALLBACK_AVATAR;

  const banner =
    profile?.banner_url ||
    profile?.cover_url ||
    profile?.cover_image_url ||
    FALLBACK_BANNER;

  if (els.avatar) els.avatar.src = avatar;
  if (els.banner) els.banner.src = banner;

  setText(els.name, displayName);
  setText(els.handle, `@${handle}`);
  setText(
    els.copy,
    profile?.bio || "Run your creator empire from one synced control center."
  );
}

async function countRows(table, filterColumn, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(filterColumn, userId);

  if (error) {
    console.warn(`[creator-dashboard] count ${table}:`, error.message);
    return 0;
  }

  return count || 0;
}

async function sumRows(table, amountColumn, filterColumn, userId, statusColumn = null, statusValue = null) {
  let query = supabase.from(table).select(amountColumn).eq(filterColumn, userId);

  if (statusColumn && statusValue) {
    query = query.eq(statusColumn, statusValue);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    console.warn(`[creator-dashboard] sum ${table}:`, error.message);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + Number(row?.[amountColumn] || 0), 0);
}

async function loadBalances(userId) {
  const { data, error } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[creator-dashboard] balance view:", error.message);
    setText(els.balanceAvailable, "$0.00");
    setText(els.balanceEarned, "$0.00");
    setText(els.balancePaidOut, "$0.00");
    return { available: 0, earned: 0, paidOut: 0 };
  }

  const available = Number(data?.available_cents || 0);
  const earned = Number(data?.earned_cents || 0);
  const paidOut = Number(data?.paid_out_cents || 0);

  setText(els.balanceAvailable, money(available));
  setText(els.balanceEarned, money(earned));
  setText(els.balancePaidOut, money(paidOut));

  return { available, earned, paidOut };
}

async function loadStats(userId) {
  const [
    followers,
    posts,
    tracks,
    products,
    premium,
    live,
    tipsCount,
    tipsRevenue,
    storeRevenue,
    liveRevenue,
    premiumRevenue
  ] = await Promise.all([
    countRows("followers", "following_id", userId),
    countRows("posts", "user_id", userId),
    countRows("music_tracks", "user_id", userId),
    countRows("products", "creator_id", userId),
    countRows("premium_content", "creator_id", userId),
    countRows("live_streams", "creator_id", userId),
    countRows("tips", "to_user_id", userId),
    sumRows("tips", "amount_cents", "to_user_id", userId, "status", "paid"),
    sumRows("store_orders", "amount_total", "creator_id", userId),
    sumRows("live_streams", "total_revenue_cents", "creator_id", userId),
    sumRows("premium_track_purchases", "amount_cents", "artist_user_id", userId, "status", "paid")
  ]);

  const totalRevenue = tipsRevenue + storeRevenue + liveRevenue + premiumRevenue;

  setText(els.statFollowers, followers.toLocaleString());
  setText(els.statPosts, posts.toLocaleString());
  setText(els.statTracks, tracks.toLocaleString());
  setText(els.statProducts, products.toLocaleString());
  setText(els.statPremium, premium.toLocaleString());
  setText(els.statLive, live.toLocaleString());
  setText(els.statTips, tipsCount.toLocaleString());
  setText(els.statRevenue, money(totalRevenue));

  setText(els.summaryLive, `${live.toLocaleString()} live stream record${live === 1 ? "" : "s"} connected.`);
  setText(els.summaryStore, `${products.toLocaleString()} product${products === 1 ? "" : "s"} with ${money(storeRevenue)} in store volume.`);
  setText(els.summaryContent, `${posts + tracks + premium} content record${posts + tracks + premium === 1 ? "" : "s"} across feed, music, and premium.`);
  setText(els.summaryMoney, `${money(totalRevenue)} tracked from tips, store, live, and premium music.`);
}

async function loadLive(userId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.liveList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.liveList,
    (data || []).map((stream) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(stream.title || "Untitled Live")}</strong>
          <span>${escapeHtml(stream.status || "draft")} • ${Number(stream.viewer_count || 0)} viewers</span>
        </div>
        <a href="/watch.html?slug=${encodeURIComponent(stream.slug || "")}">Watch</a>
      </article>
    `).join(""),
    "No live streams yet."
  );
}

async function loadMusic(userId) {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.musicList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.musicList,
    (data || []).map((track) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(track.title || "Untitled Track")}</strong>
          <span>${escapeHtml(track.artist_name || "Artist")} • ${Number(track.plays || track.play_count || 0)} plays</span>
        </div>
        <a href="/music.html">Open</a>
      </article>
    `).join(""),
    "No music uploaded yet."
  );
}

async function loadProducts(userId) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`creator_id.eq.${userId},seller_user_id.eq.${userId},user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.productsList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.productsList,
    (data || []).map((product) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(product.title || product.name || "Product")}</strong>
          <span>${money(product.price_cents || 0)} • ${product.active ?? product.is_active ? "active" : "hidden"}</span>
        </div>
        <a href="/store-admin.html">Manage</a>
      </article>
    `).join(""),
    "No products yet."
  );
}

async function loadPremium(userId) {
  const { data, error } = await supabase
    .from("premium_content")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.premiumList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.premiumList,
    (data || []).map((item) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(item.title || "Premium Content")}</strong>
          <span>${escapeHtml(item.content_type || "premium")} • ${money(item.price_cents || 0)}</span>
        </div>
        <a href="/monetization.html">Open</a>
      </article>
    `).join(""),
    "No premium content yet."
  );
}

async function loadOrders(userId) {
  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.ordersList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.ordersList,
    (data || []).map((order) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(order.product_name || "Store Order")}</strong>
          <span>${money(order.amount_total || 0)} • ${escapeHtml(order.payment_status || order.order_status || "pending")}</span>
        </div>
        <span>${safeDate(order.created_at)}</span>
      </article>
    `).join(""),
    "No store orders yet."
  );
}

async function loadTips(userId) {
  const { data, error } = await supabase
    .from("tips")
    .select("*")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.tipsList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.tipsList,
    (data || []).map((tip) => `
      <article class="dashboard-row">
        <div>
          <strong>${money(tip.amount_cents || 0)}</strong>
          <span>${escapeHtml(tip.status || "pending")} • ${safeDate(tip.created_at)}</span>
        </div>
        <span>Tip</span>
      </article>
    `).join(""),
    "No tips yet."
  );
}

async function loadPayouts(userId) {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("artist_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.payoutsList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.payoutsList,
    (data || []).map((payout) => `
      <article class="dashboard-row">
        <div>
          <strong>${money(payout.amount_cents || 0)}</strong>
          <span>${escapeHtml(payout.status || "pending")} • ${safeDate(payout.created_at)}</span>
        </div>
        <a href="/payouts.html">Open</a>
      </article>
    `).join(""),
    "No payout requests yet."
  );
}

async function loadPosts(userId) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    setList(els.postsList, `<div class="empty-list">${escapeHtml(error.message)}</div>`);
    return;
  }

  setList(
    els.postsList,
    (data || []).map((post) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(post.title || post.caption || "Feed Post")}</strong>
          <span>${escapeHtml(post.category || "general")} • ${safeDate(post.created_at)}</span>
        </div>
        <a href="/feed.html">Open</a>
      </article>
    `).join(""),
    "No feed posts yet."
  );
}

async function refreshDashboard() {
  setStatus("Loading creator dashboard...");

  const user = await getUser();

  if (!user?.id) {
    setStatus("Please sign in to view your creator dashboard.", "error");
    window.location.href = "/auth.html";
    return;
  }

  const profile = await loadProfile();
  renderHero(profile, user);

  await Promise.all([
    loadStats(user.id),
    loadBalances(user.id),
    loadLive(user.id),
    loadMusic(user.id),
    loadProducts(user.id),
    loadPremium(user.id),
    loadOrders(user.id),
    loadTips(user.id),
    loadPayouts(user.id),
    loadPosts(user.id)
  ]);

  setStatus("Creator dashboard synced.", "success");
}

function bindDashboard() {
  els.refreshBtn?.addEventListener("click", refreshDashboard);

  supabase
    .channel("rb-creator-dashboard")
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "premium_content" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "tips" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, refreshDashboard)
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, refreshDashboard)
    .subscribe();
}

bindDashboard();

refreshDashboard().catch((error) => {
  console.error("[creator-dashboard] boot error:", error);
  setStatus(error.message || "Could not load creator dashboard.", "error");
});
