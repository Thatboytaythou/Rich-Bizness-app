// =========================
// RICH BIZNESS GALLERY — FINAL SYNCED ENGINE
// /core/pages/gallery.js
// Source:
// artworks, artwork_likes, artwork_purchases,
// products, store_orders
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("gallery-status"),
  refreshBtn: $("refresh-gallery-btn"),

  artworksGrid: $("artworks-grid"),
  purchasesList: $("artwork-purchases-list"),
  productsList: $("products-list"),
  ordersList: $("store-orders-list")
};

const FALLBACK_IMAGE = "/images/83FAD785-46D7-4EB3-8A3F-1E4A8BB78C90.png";

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `gallery-status ${type}`;
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
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

async function getUser() {
  if (currentUser?.id) return currentUser;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

function artworkImage(item) {
  return item.image_url || item.file_url || item.media_url || item.cover_url || FALLBACK_IMAGE;
}

function artworkTitle(item) {
  return item.title || item.name || "Rich Bizness Artwork";
}

async function loadArtworks() {
  if (!els.artworksGrid) return;

  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[gallery] artworks:", error);
    els.artworksGrid.innerHTML = `<div class="status-box">Could not load artwork.</div>`;
    return;
  }

  if (!data?.length) {
    els.artworksGrid.innerHTML = `<div class="status-box">No artwork uploaded yet.</div>`;
    return;
  }

  els.artworksGrid.innerHTML = data.map((art) => `
    <article class="artwork-card">
      <img src="${escapeHtml(artworkImage(art))}" alt="${escapeHtml(artworkTitle(art))}" />
      <div class="artwork-body">
        <span class="gallery-tag">${art.is_featured ? "Featured" : "Artwork"}</span>
        <h3>${escapeHtml(artworkTitle(art))}</h3>
        <p>${escapeHtml(art.description || "Rich Bizness gallery drop.")}</p>

        <div class="gallery-meta">
          <span>${art.is_paid ? "Paid Unlock" : "Free View"}</span>
          <span>${money(art.price_cents || 0)}</span>
          <span>${safeDate(art.created_at)}</span>
        </div>

        <div class="gallery-card-actions">
          <button class="btn btn-gold" type="button" data-like-art="${escapeHtml(art.id)}">Like</button>
          ${
            art.is_paid || Number(art.price_cents || 0) > 0
              ? `<button class="btn btn-dark" type="button" data-buy-art="${escapeHtml(art.id)}">Unlock</button>`
              : `<a class="btn btn-dark" href="${escapeHtml(artworkImage(art))}" target="_blank" rel="noopener">View</a>`
          }
        </div>
      </div>
    </article>
  `).join("");
}

async function likeArtwork(artworkId) {
  const user = await getUser();

  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return;
  }

  const { error } = await supabase.from("artwork_likes").insert({
    artwork_id: Number(artworkId),
    user_id: user.id,
    created_at: new Date().toISOString()
  });

  if (error) {
    setStatus(error.message || "Could not like artwork.", "error");
    return;
  }

  setStatus("Artwork liked.", "success");
}

async function buyArtwork(artworkId) {
  const user = await getUser();

  if (!user?.id) {
    window.location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    return;
  }

  setStatus("Creating artwork unlock...", "normal");

  const { error } = await supabase.from("artwork_purchases").insert({
    artwork_id: Number(artworkId),
    buyer_user_id: user.id,
    status: "pending",
    created_at: new Date().toISOString()
  });

  if (error) {
    setStatus(error.message || "Could not start artwork unlock.", "error");
    return;
  }

  setStatus("Artwork unlock started. Stripe checkout can connect here.", "success");
  await loadPurchases();
}

async function loadPurchases() {
  if (!els.purchasesList) return;

  const user = await getUser();

  if (!user?.id) {
    els.purchasesList.innerHTML = `<div class="status-box">Sign in to see gallery purchases.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from("artwork_purchases")
    .select("*")
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gallery] purchases:", error);
    els.purchasesList.innerHTML = `<div class="status-box">Could not load purchases.</div>`;
    return;
  }

  if (!data?.length) {
    els.purchasesList.innerHTML = `<div class="status-box">No gallery purchases yet.</div>`;
    return;
  }

  els.purchasesList.innerHTML = data.map((purchase) => `
    <article class="gallery-list-card">
      <span class="gallery-tag">${escapeHtml(purchase.status || "pending")}</span>
      <h3>Artwork #${escapeHtml(purchase.artwork_id || "—")}</h3>
      <p>${money(purchase.amount_cents || 0)} • ${safeDate(purchase.created_at)}</p>
    </article>
  `).join("");
}

async function loadProducts() {
  if (!els.productsList) return;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gallery] products:", error);
    els.productsList.innerHTML = `<div class="status-box">Could not load products.</div>`;
    return;
  }

  if (!data?.length) {
    els.productsList.innerHTML = `<div class="status-box">No products yet.</div>`;
    return;
  }

  els.productsList.innerHTML = data.map((product) => {
    const title = product.title || product.name || product.product_name || "Creator Product";
    const image = product.image_url || product.thumbnail_url || FALLBACK_IMAGE;
    const active = product.active ?? product.is_active ?? true;

    return `
      <article class="product-card">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
        <div>
          <span class="gallery-tag">${active ? "Active" : "Hidden"}</span>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(product.description || "Rich Bizness creator product.")}</p>
          <div class="gallery-meta">
            <span>${money(product.price_cents || 0)}</span>
            <span>${escapeHtml(product.kind || "product")}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadOrders() {
  if (!els.ordersList) return;

  const user = await getUser();

  if (!user?.id) {
    els.ordersList.innerHTML = `<div class="status-box">Sign in to see store orders.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[gallery] orders:", error);
    els.ordersList.innerHTML = `<div class="status-box">Could not load store orders.</div>`;
    return;
  }

  if (!data?.length) {
    els.ordersList.innerHTML = `<div class="status-box">No store orders yet.</div>`;
    return;
  }

  els.ordersList.innerHTML = data.map((order) => `
    <article class="gallery-list-card">
      <span class="gallery-tag">${escapeHtml(order.payment_status || order.order_status || "order")}</span>
      <h3>${escapeHtml(order.product_name || "Store Order")}</h3>
      <p>${money(order.amount_total || 0)} • Qty ${Number(order.quantity || 1)} • ${safeDate(order.created_at)}</p>
    </article>
  `).join("");
}

async function refreshGallery() {
  setStatus("Loading gallery engine...");

  await Promise.all([
    loadArtworks(),
    loadPurchases(),
    loadProducts(),
    loadOrders()
  ]);

  setStatus("Gallery engine synced.", "success");
}

function bindGallery() {
  els.refreshBtn?.addEventListener("click", refreshGallery);

  els.artworksGrid?.addEventListener("click", async (event) => {
    const likeBtn = event.target.closest("[data-like-art]");
    const buyBtn = event.target.closest("[data-buy-art]");

    if (likeBtn) {
      await likeArtwork(likeBtn.getAttribute("data-like-art"));
      return;
    }

    if (buyBtn) {
      await buyArtwork(buyBtn.getAttribute("data-buy-art"));
    }
  });

  supabase
    .channel("rb-gallery-engine")
    .on("postgres_changes", { event: "*", schema: "public", table: "artworks" }, loadArtworks)
    .on("postgres_changes", { event: "*", schema: "public", table: "artwork_purchases" }, loadPurchases)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts)
    .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, loadOrders)
    .subscribe();
}

async function bootGallery() {
  bindGallery();
  await refreshGallery();
  console.log("🎨 Rich Bizness Gallery Engine Loaded");
}

bootGallery().catch((error) => {
  console.error("[gallery] boot error:", error);
  setStatus(error.message || "Could not load gallery engine.", "error");
});
