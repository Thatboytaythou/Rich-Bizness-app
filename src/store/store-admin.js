import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const state = {
  products: [],
  orders: [],
  editingId: null
};

const els = {
  banner: document.getElementById("store-admin-banner"),
  productForm: document.getElementById("product-form"),
  productId: document.getElementById("product-id"),
  title: document.getElementById("product-title"),
  description: document.getElementById("product-description"),
  kind: document.getElementById("product-kind"),
  currency: document.getElementById("product-currency"),
  price: document.getElementById("product-price"),
  linkedRecordId: document.getElementById("product-linked-record-id"),
  imageUrl: document.getElementById("product-image-url"),
  active: document.getElementById("product-active"),
  sellerUserId: document.getElementById("product-seller-user-id"),
  formTitle: document.getElementById("form-title"),
  saveBtn: document.getElementById("save-product-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  deleteBtn: document.getElementById("delete-product-btn"),
  focusCreateBtn: document.getElementById("focus-create-btn"),
  refreshDashboardBtn: document.getElementById("refresh-dashboard-btn"),
  reloadProductsBtn: document.getElementById("reload-products-btn"),
  search: document.getElementById("product-search"),
  catalogGrid: document.getElementById("catalog-grid"),
  ordersTableBody: document.getElementById("orders-table-body"),
  statProducts: document.getElementById("stat-products"),
  statOrders: document.getElementById("stat-orders"),
  statRevenue: document.getElementById("stat-revenue"),
  statKind: document.getElementById("stat-kind"),
  formCard: document.getElementById("product-form-card")
};

function showBanner(message, type = "success") {
  els.banner.style.display = "block";
  els.banner.textContent = message;

  if (type === "error") {
    els.banner.style.background = "rgba(255,127,150,.13)";
    els.banner.style.borderColor = "rgba(255,127,150,.28)";
    els.banner.style.color = "#ffd6de";
  } else {
    els.banner.style.background = "rgba(110,231,163,.12)";
    els.banner.style.borderColor = "rgba(110,231,163,.24)";
    els.banner.style.color = "#dcffe9";
  }
}

function clearBanner() {
  els.banner.style.display = "none";
  els.banner.textContent = "";
}

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToDollars(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetForm() {
  state.editingId = null;
  els.productForm.reset();
  els.productId.value = "";
  els.kind.value = "store";
  els.currency.value = "usd";
  els.active.value = "true";
  els.formTitle.textContent = "Create product";
  els.saveBtn.textContent = "Save Product";
  els.cancelEditBtn.classList.add("hidden");
  els.deleteBtn.classList.add("hidden");
}

function fillForm(product) {
  state.editingId = product.id;
  els.productId.value = product.id ?? "";
  els.title.value = product.title || "";
  els.description.value = product.description || "";
  els.kind.value = product.kind || "store";
  els.currency.value = product.currency || "usd";
  els.price.value = centsToDollars(product.price_cents || 0);
  els.linkedRecordId.value = product.linked_record_id ?? "";
  els.imageUrl.value = product.image_url || "";
  els.active.value = String(Boolean(product.active));
  els.sellerUserId.value = product.seller_user_id || "";
  els.formTitle.textContent = `Edit product #${product.id}`;
  els.saveBtn.textContent = "Update Product";
  els.cancelEditBtn.classList.remove("hidden");
  els.deleteBtn.classList.remove("hidden");
  els.formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.products = data || [];
}

async function loadOrders() {
  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  state.orders = data || [];
}

function renderStats() {
  const activeProducts = state.products.filter((p) => p.active).length;
  const paidOrders = state.orders.filter((o) => (o.order_status || o.payment_status) !== "refunded").length;
  const revenue = state.orders
    .filter((o) => (o.order_status || "").toLowerCase() !== "refunded")
    .reduce((sum, order) => sum + Number(order.amount_total || 0), 0);

  const kindCounts = state.products.reduce((acc, p) => {
    const key = p.kind || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topKind = Object.entries(kindCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  els.statProducts.textContent = String(activeProducts);
  els.statOrders.textContent = String(paidOrders);
  els.statRevenue.textContent = formatMoney(revenue);
  els.statKind.textContent = topKind;
}

function renderProducts() {
  const query = els.search.value.trim().toLowerCase();

  const filtered = state.products.filter((product) => {
    if (!query) return true;
    return [
      product.title,
      product.description,
      product.kind,
      product.currency
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (!filtered.length) {
    els.catalogGrid.innerHTML = `<div class="muted">No products matched this search.</div>`;
    return;
  }

  els.catalogGrid.innerHTML = filtered.map((product) => {
    const title = escapeHtml(product.title || product.description || "Untitled Product");
    const desc = escapeHtml(product.description || "No description yet.");
    const image = escapeHtml(product.image_url || "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png");
    const price = centsToDollars(product.price_cents || 0);
    const kind = escapeHtml(product.kind || "store");
    const status = product.active ? "active" : "inactive";

    return `
      <article class="product-card">
        <img src="${image}" alt="${title}" onerror="this.src='/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png';" />
        <div class="product-info">
          <div class="product-title">${title}</div>
          <div class="product-price">$${price}</div>
          <div class="pill-row">
            <span class="pill">${kind}</span>
            <span class="pill">${escapeHtml(status)}</span>
            <span class="pill">${escapeHtml(product.currency || "usd")}</span>
          </div>
          <div class="product-desc">${desc}</div>
          <div class="product-actions">
            <button class="btn btn-secondary edit-product-btn" data-id="${product.id}">Edit</button>
            <a class="btn btn-secondary" href="/store.html" style="text-decoration:none;">View Store</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".edit-product-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const product = state.products.find((item) => String(item.id) === String(button.dataset.id));
      if (product) fillForm(product);
    });
  });
}

function renderOrders() {
  if (!state.orders.length) {
    els.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="muted">No store orders yet.</td>
      </tr>
    `;
    return;
  }

  els.ordersTableBody.innerHTML = state.orders.map((order) => {
    const created = order.created_at
      ? new Date(order.created_at).toLocaleString()
      : "—";

    return `
      <tr>
        <td>${escapeHtml(order.stripe_session_id || "—")}</td>
        <td>${escapeHtml(order.product_name || "—")}</td>
        <td>${escapeHtml(formatMoney(order.amount_total || 0))}</td>
        <td>${escapeHtml(order.order_status || order.payment_status || "—")}</td>
        <td>${escapeHtml(order.customer_email || "—")}</td>
        <td>${escapeHtml(created)}</td>
      </tr>
    `;
  }).join("");
}

async function saveProduct(event) {
  event.preventDefault();
  clearBanner();

  const payload = {
    title: els.title.value.trim(),
    description: els.description.value.trim(),
    kind: els.kind.value,
    image_url: els.imageUrl.value.trim() || null,
    price_cents: dollarsToCents(els.price.value),
    currency: els.currency.value,
    active: els.active.value === "true",
    seller_user_id: els.sellerUserId.value.trim() || null,
    linked_record_id: els.linkedRecordId.value ? Number(els.linkedRecordId.value) : null
  };

  if (!payload.title) {
    showBanner("Product title is required.", "error");
    return;
  }

  if (!payload.kind) {
    showBanner("Product kind is required.", "error");
    return;
  }

  if (!payload.price_cents || payload.price_cents < 50) {
    showBanner("Price must be at least $0.50.", "error");
    return;
  }

  let query = supabase.from("products");

  if (state.editingId) {
    const { error } = await query.update(payload).eq("id", state.editingId);
    if (error) {
      showBanner(error.message, "error");
      return;
    }
    showBanner("Product updated.");
  } else {
    const { error } = await query.insert(payload);
    if (error) {
      showBanner(error.message, "error");
      return;
    }
    showBanner("Product created.");
  }

  resetForm();
  await refreshDashboard();
}

async function deleteProduct() {
  clearBanner();

  if (!state.editingId) return;

  const confirmed = window.confirm("Delete this product?");
  if (!confirmed) return;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", state.editingId);

  if (error) {
    showBanner(error.message, "error");
    return;
  }

  showBanner("Product deleted.");
  resetForm();
  await refreshDashboard();
}

async function refreshDashboard() {
  clearBanner();
  try {
    await Promise.all([loadProducts(), loadOrders()]);
    renderStats();
    renderProducts();
    renderOrders();
  } catch (error) {
    console.error("[store-admin] refresh error:", error);
    showBanner(error.message || "Failed to refresh dashboard.", "error");
  }
}

function bindEvents() {
  els.productForm.addEventListener("submit", saveProduct);
  els.cancelEditBtn.addEventListener("click", resetForm);
  els.deleteBtn.addEventListener("click", deleteProduct);
  els.focusCreateBtn.addEventListener("click", () => {
    resetForm();
    els.formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    els.title.focus();
  });
  els.refreshDashboardBtn.addEventListener("click", refreshDashboard);
  els.reloadProductsBtn.addEventListener("click", refreshDashboard);
  els.search.addEventListener("input", renderProducts);
}

async function boot() {
  bindEvents();
  resetForm();
  await refreshDashboard();
}

boot();
