import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getBanner() {
  return document.getElementById("store-banner");
}

function showBanner(message, type = "success") {
  const banner = getBanner();
  if (!banner) return;

  banner.textContent = message;
  banner.style.display = "block";
  banner.style.margin = "0 0 16px 0";
  banner.style.padding = "14px 16px";
  banner.style.borderRadius = "14px";
  banner.style.fontWeight = "700";
  banner.style.border = "1px solid transparent";

  if (type === "error") {
    banner.style.background = "rgba(255, 90, 115, 0.12)";
    banner.style.borderColor = "rgba(255, 90, 115, 0.28)";
    banner.style.color = "#ffd0d8";
  } else {
    banner.style.background = "rgba(67, 245, 155, 0.12)";
    banner.style.borderColor = "rgba(67, 245, 155, 0.28)";
    banner.style.color = "#d8ffea";
  }
}

function clearBanner() {
  const banner = getBanner();
  if (!banner) return;
  banner.style.display = "none";
  banner.textContent = "";
}

function checkCheckoutState() {
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get("checkout");

  if (checkoutState === "success") {
    showBanner(
      "Payment completed successfully. Your order is being confirmed.",
      "success"
    );
  }

  if (checkoutState === "cancel") {
    showBanner("Checkout was canceled.", "error");
  }
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[store] loadProducts error:", error);
    showBanner("Could not load store products.", "error");
    return [];
  }

  console.log("[store] loaded products:", data);
  return data || [];
}

function getProductTitle(product) {
  return (
    product.title ||
    product.name ||
    product.description ||
    "Untitled Product"
  );
}

function getProductPrice(product) {
  const cents = Number(product.price_cents ?? 0);
  return Number.isFinite(cents) ? (cents / 100).toFixed(2) : "0.00";
}

function getProductImage(product) {
  return (
    product.image_url ||
    "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png"
  );
}

async function createCheckout(productId) {
  try {
    clearBanner();

    if (!productId) {
      throw new Error("Missing product id.");
    }

    const response = await fetch("/api/create-store-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: Number(productId),
        quantity: 1
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Failed to start checkout");
    }

    if (!data.url || typeof data.url !== "string") {
      throw new Error("Missing checkout url");
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error("[store] createCheckout error:", error);
    showBanner(error.message || "Could not start checkout.", "error");
  }
}

function renderProducts(products) {
  const container = document.getElementById("products");
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `<div class="empty">No products yet.</div>`;
    return;
  }

  container.innerHTML = products.map((product) => {
    const title = getProductTitle(product);
    const price = getProductPrice(product);
    const image = getProductImage(product);
    const id = product.id ?? "";

    return `
      <div class="card">
        <img
          src="${image}"
          alt="${title}"
          onerror="this.src='/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png';"
        />

        <div class="card-body">
          <div class="title">${title}</div>
          <div class="price">$${price}</div>

          <button class="btn buy" data-id="${id}">
            Buy Now
          </button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".buy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Loading...";
      await createCheckout(btn.dataset.id);
      btn.disabled = false;
      btn.textContent = originalText;
    });
  });
}

async function boot() {
  checkCheckoutState();
  const products = await loadProducts();
  renderProducts(products);
}

boot();
