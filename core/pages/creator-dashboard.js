import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase, getCreatorBalance } from "/core/supabase.js";
import { ROUTES, BRAND_IMAGES, formatMoney, formatNumber } from "/core/config.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  navMount: $("elite-platform-nav"),
  statusBox: $("creator-dashboard-status"),

  heroName: $("creator-hero-name"),
  heroHandle: $("creator-hero-handle"),
  heroAvatar: $("creator-hero-avatar"),
  heroBanner: $("creator-hero-banner"),
  heroCopy: $("creator-hero-copy"),

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

  refreshBtn: $("creator-dashboard-refresh-btn"),

  liveList: $("creator-dashboard-live-list"),
  musicList: $("creator-dashboard-music-list"),
  productsList: $("creator-dashboard-products-list"),
  premiumList: $("creator-dashboard-premium-list"),
  ordersList: $("creator-dashboard-orders-list"),
  tipsList: $("creator-dashboard-tips-list"),
  payoutsList: $("creator-dashboard-payouts-list"),
  postsList: $("creator-dashboard-posts-list")
};

let currentUser = null;
let currentProfile = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;

  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");

  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function centsToDollars(cents = 0) {
  return Number(cents || 0) / 100;
}

function getDisplayName(profile = null, user = null) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.handle ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Rich Bizness Creator"
  );
}

function getHandle(profile = null, user = null) {
  return (
    profile?.handle ||
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "richbizness"
  );
}

function getAvatar(profile = null) {
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    BRAND_IMAGES.logo
  );
}

function getBanner(profile = null) {
  return (
    profile?.banner_url ||
    profile?.cover_url ||
    BRAND_IMAGES.artist ||
    BRAND_IMAGES.homeHero
  );
}

function emptyCard(title = "Nothing here yet.", copy = "This section will fill as your creator activity grows.") {
  return `
    <article class="card">
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(copy)}</p>
    </article>
  `;
}

function creatorCard(title, subtitle, metaBadges = [], actions = []) {
  return `
    <article class="card">
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(subtitle)}</p>
      ${
        metaBadges.length
          ? `<div class="mt-3 inline-wrap">
              ${metaBadges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}
            </div>`
          : ""
      }
      ${
        actions.length
          ? `<div class="mt-3 inline-wrap">${actions.join("")}</div>`
          : ""
      }
    </article>
  `;
}

async function countTable(tableName, column = "id", filters = []) {
  let query = supabase.from(tableName).select(column, { count: "exact", head: true });

  filters.forEach(({ field, value }) => {
    query = query.eq(field, value);
  });

  const { count, error } = await query;

  if (error) {
    console.error(`[creator-dashboard] countTable ${tableName} error:`, error);
    return 0;
  }

  return count || 0;
}

async function fetchRows(tableName, options = {}) {
  let query = supabase.from(tableName).select(options.select || "*");

  (options.filters || []).forEach(({ field, value }) => {
    query = query.eq(field, value);
  });

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: !!options.ascending });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[creator-dashboard] fetchRows ${tableName} error:`, error);
    return [];
  }

  return data || [];
}

function renderHero() {
  if (els.heroName) els.heroName.textContent = getDisplayName(currentProfile, currentUser);
  if (els.heroHandle) els.heroHandle.textContent = `@${getHandle(currentProfile, currentUser)}`;

  if (els.heroAvatar) {
    els.heroAvatar.src = getAvatar(currentProfile);
    els.heroAvatar.alt = getDisplayName(currentProfile, currentUser);
  }

  if (els.heroBanner) {
    els.heroBanner.src = getBanner(currentProfile);
    els.heroBanner.alt = `${getDisplayName(currentProfile, currentUser)} banner`;
  }

  if (els.heroCopy) {
    els.heroCopy.textContent =
      currentProfile?.bio ||
      "Run your live streams, music, products, premium content, posts, orders, tips, balances, and payouts from one creator control center.";
  }
}

async function renderStats() {
  const userId = currentUser?.id;
  if (!userId) return;

  const [
    followersCount,
    postsCount,
    tracksCount,
    productsCount,
    premiumCount,
    liveCount,
    tipsCount,
    storeOrders,
    tipRows,
    premiumRows,
    musicEarningsRows,
    creatorEarningsRows
  ] = await Promise.all([
    countTable("followers", "id", [{ field: "following_id", value: userId }]),
    countTable("posts", "id", [{ field: "user_id", value: userId }]),
    countTable("tracks", "id", [{ field: "creator_id", value: userId }]),
    countTable("products", "id", [{ field: "creator_id", value: userId }]),
    countTable("premium_content", "id", [{ field: "creator_id", value: userId }]),
    countTable("live_streams", "id", [{ field: "creator_id", value: userId }]),
    countTable("tips", "id", [{ field: "to_user_id", value: userId }]),
    fetchRows("store_orders", {
      filters: [{ field: "creator_id", value: userId }],
      limit: 1000
    }),
    fetchRows("tips", {
      filters: [{ field: "to_user_id", value: userId }],
      limit: 1000
    }),
    fetchRows("premium_content", {
      filters: [{ field: "creator_id", value: userId }],
      limit: 1000
    }),
    fetchRows("music_earnings", {
      filters: [{ field: "artist_user_id", value: userId }],
      limit: 1000
    }),
    fetchRows("creator_earnings", {
      filters: [{ field: "creator_id", value: userId }],
      limit: 1000
    })
  ]);

  const ordersCount = storeOrders.length;
  const orderRevenueDollars = storeOrders.reduce((sum, row) => sum + Number(row.amount_total || 0), 0);
  const tipRevenueCents = tipRows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const musicRevenueCents = musicEarningsRows.reduce((sum, row) => sum + Number(row.gross_cents || 0), 0);
  const creatorRevenueCents = creatorEarningsRows.reduce((sum, row) => sum + Number(row.gross_cents || 0), 0);
  const premiumRevenuePotentialCents = premiumRows.reduce((sum, row) => sum + Number(row.price_cents || 0), 0);

  const totalRevenueDollars =
    orderRevenueDollars +
    centsToDollars(tipRevenueCents + musicRevenueCents + creatorRevenueCents);

  if (els.statFollowers) els.statFollowers.textContent = formatNumber(followersCount);
  if (els.statPosts) els.statPosts.textContent = formatNumber(postsCount);
  if (els.statTracks) els.statTracks.textContent = formatNumber(tracksCount);
  if (els.statProducts) els.statProducts.textContent = formatNumber(productsCount);
  if (els.statPremium) els.statPremium.textContent = formatNumber(premiumCount);
  if (els.statLive) els.statLive.textContent = formatNumber(liveCount);
  if (els.statTips) els.statTips.textContent = formatNumber(tipsCount);
  if (els.statRevenue) els.statRevenue.textContent = formatMoney(totalRevenueDollars, "USD");

  if (els.summaryLive) {
    els.summaryLive.textContent = `${formatNumber(liveCount)} live records are connected to your creator profile.`;
  }

  if (els.summaryStore) {
    els.summaryStore.textContent = `${formatNumber(ordersCount)} store orders have moved through your creator lane.`;
  }

  if (els.summaryContent) {
    els.summaryContent.textContent = `${formatNumber(postsCount + tracksCount + premiumCount + productsCount)} total content and product records are tied to your account.`;
  }

  if (els.summaryMoney) {
    els.summaryMoney.textContent = `${formatMoney(totalRevenueDollars, "USD")} has moved through visible creator revenue, with ${formatMoney(centsToDollars(premiumRevenuePotentialCents), "USD")} in current premium pricing inventory.`;
  }
}

async function renderBalances() {
  const userId = currentUser?.id;
  if (!userId) return;

  const balance = await getCreatorBalance(userId);

  if (els.balanceAvailable) els.balanceAvailable.textContent = formatMoney(centsToDollars(balance?.available_cents || 0), "USD");
  if (els.balanceEarned) els.balanceEarned.textContent = formatMoney(centsToDollars(balance?.earned_cents || 0), "USD");
  if (els.balancePaidOut) els.balancePaidOut.textContent = formatMoney(centsToDollars(balance?.paid_out_cents || 0), "USD");
}

async function renderLiveList() {
  if (!els.liveList || !currentUser?.id) return;

  const rows = await fetchRows("live_streams", {
    filters: [{ field: "creator_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.liveList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.title || "Untitled Live",
          row.description || "Live stream record",
          [
            String(row.status || "draft"),
            `${formatNumber(row.viewer_count || 0)} viewers`,
            formatMoney(centsToDollars(row.total_revenue_cents || 0), row.currency || "USD")
          ],
          [
            `<a class="btn-ghost" href="${
              row.slug
                ? `/watch.html?slug=${encodeURIComponent(row.slug)}`
                : `/watch.html?id=${encodeURIComponent(row.id)}`
            }">Watch</a>`,
            `<a class="btn-ghost" href="/live.html?id=${encodeURIComponent(row.id)}">Manage</a>`
          ]
        )
      ).join("")
    : emptyCard("No live streams yet.", "Start a stream and it will show here.");
}

async function renderMusicList() {
  if (!els.musicList || !currentUser?.id) return;

  const rows = await fetchRows("tracks", {
    filters: [{ field: "creator_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.musicList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.title || "Untitled Track",
          row.artist_name || getDisplayName(currentProfile, currentUser),
          [
            row.genre || "genre",
            `${formatNumber(row.play_count || 0)} plays`,
            `${formatNumber(row.like_count || 0)} likes`
          ],
          [`<a class="btn-ghost" href="${ROUTES.music}">Open Music</a>`]
        )
      ).join("")
    : emptyCard("No tracks yet.", "Music uploads will show here.");
}

async function renderProductsList() {
  if (!els.productsList || !currentUser?.id) return;

  const rows = await fetchRows("products", {
    filters: [{ field: "creator_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.productsList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.name || row.title || "Product",
          row.description || "Store product",
          [
            formatMoney(centsToDollars(row.price_cents || 0), row.currency || "USD"),
            row.is_active ? "active" : "inactive"
          ],
          [`<a class="btn-ghost" href="${ROUTES.store}">Open Store</a>`]
        )
      ).join("")
    : emptyCard("No products yet.", "Store products will show here.");
}

async function renderPremiumList() {
  if (!els.premiumList || !currentUser?.id) return;

  const rows = await fetchRows("premium_content", {
    filters: [{ field: "creator_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.premiumList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.title || "Premium Content",
          row.description || "Premium unlock item",
          [
            row.content_type || "premium",
            formatMoney(centsToDollars(row.price_cents || 0), "USD"),
            row.is_active ? "active" : "inactive"
          ],
          [`<a class="btn-ghost" href="${ROUTES.monetization}">Open Monetization</a>`]
        )
      ).join("")
    : emptyCard("No premium content yet.", "Premium items will show here.");
}

async function renderOrdersList() {
  if (!els.ordersList || !currentUser?.id) return;

  const rows = await fetchRows("store_orders", {
    filters: [{ field: "creator_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.ordersList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.product_name || "Store Order",
          row.customer_email || "Customer order",
          [
            formatMoney(row.amount_total || 0, row.currency || "USD"),
            row.payment_status || "payment",
            row.order_status || "order"
          ],
          [`<a class="btn-ghost" href="/store-admin.html">Store Admin</a>`]
        )
      ).join("")
    : emptyCard("No orders yet.", "Store orders will show here.");
}

async function renderTipsList() {
  if (!els.tipsList || !currentUser?.id) return;

  const rows = await fetchRows("tips", {
    filters: [{ field: "to_user_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.tipsList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          "Tip Received",
          `From user ${row.from_user_id || "unknown"}`,
          [
            formatMoney(centsToDollars(row.amount_cents || 0), row.currency || "USD"),
            row.status || "status",
            safeDate(row.paid_at || row.created_at)
          ],
          [`<a class="btn-ghost" href="${ROUTES.monetization}">Open Money</a>`]
        )
      ).join("")
    : emptyCard("No tips yet.", "Tips will show here.");
}

async function renderPayoutsList() {
  if (!els.payoutsList || !currentUser?.id) return;

  const rows = await fetchRows("payout_requests", {
    filters: [{ field: "artist_user_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.payoutsList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          "Payout Request",
          row.status || "payout status",
          [
            formatMoney(centsToDollars(row.amount_cents || 0), row.currency || "USD"),
            safeDate(row.created_at)
          ],
          [`<a class="btn-ghost" href="${ROUTES.payouts || "/payouts.html"}">Open Payouts</a>`]
        )
      ).join("")
    : emptyCard("No payout requests yet.", "Payout requests will show here.");
}

async function renderPostsList() {
  if (!els.postsList || !currentUser?.id) return;

  const rows = await fetchRows("posts", {
    filters: [{ field: "user_id", value: currentUser.id }],
    orderBy: "created_at",
    ascending: false,
    limit: 8
  });

  els.postsList.innerHTML = rows.length
    ? rows.map((row) =>
        creatorCard(
          row.title || row.caption || "Post",
          row.body || row.description || "Creator post",
          [safeDate(row.created_at)],
          [`<a class="btn-ghost" href="${ROUTES.feed}">Open Feed</a>`]
        )
      ).join("")
    : emptyCard("No posts yet.", "Creator posts will show here.");
}

async function renderAllSections() {
  await Promise.all([
    renderStats(),
    renderBalances(),
    renderLiveList(),
    renderMusicList(),
    renderProductsList(),
    renderPremiumList(),
    renderOrdersList(),
    renderTipsList(),
    renderPayoutsList(),
    renderPostsList()
  ]);
}

function bindActions() {
  els.refreshBtn?.addEventListener("click", async () => {
    els.refreshBtn.disabled = true;
    setStatus("Refreshing creator dashboard...");

    try {
      await renderAllSections();
      setStatus("Creator dashboard refreshed.", "success");
    } catch (error) {
      console.error("[creator-dashboard] refresh error:", error);
      setStatus(error.message || "Could not refresh creator dashboard.", "error");
    } finally {
      els.refreshBtn.disabled = false;
    }
  });
}

export async function bootCreatorDashboardPage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentProfile = getCurrentProfileState();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  if (!currentUser?.id) {
    setStatus("Login required before entering creator dashboard.", "error");
    window.location.href = ROUTES.auth;
    return;
  }

  renderHero();
  bindActions();
  await renderAllSections();
  setStatus("Creator dashboard loaded.", "success");
}

if (document.body?.classList.contains("creator-dashboard-page")) {
  bootCreatorDashboardPage().catch((error) => {
    console.error("[creator-dashboard] boot error:", error);
    setStatus(error.message || "Could not load creator dashboard.", "error");
  });
}
