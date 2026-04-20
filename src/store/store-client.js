import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function showBanner(message, type = "success") {
  let banner = document.getElementById("store-banner");

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "store-banner";
    banner.style.margin = "0 0 16px 0";
    banner.style.padding = "14px 16px";
    banner.style.borderRadius = "14px";
    banner.style.fontWeight = "700";
    banner.style.border = "1px solid transparent";

    const container = document.querySelector(".container");
    const grid = document.getElementById("products");
    container.insertBefore(banner, grid);
  }

  banner.textContent = message;
  banner.style.display = "block";

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

function checkCheckoutState() {
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get("checkout");

  if (checkoutState === "success") {
    showBanner("Payment completed successfully.", "success");
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

  return data || [];
}

async function createCheckout(productId) {
  try {
    const response = await fetch("/api/create-store-checkout-session.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId,
        quantity: 1
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to start checkout");
    }

    if (!data.url) {
      throw new Error("Missing checkout url");
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("[store] createCheckout error:", error);
    showBanner(error.message || "Could not start checkout.", "error");
  }
}

function renderProducts(products) {
  const container = document.getElementById("products");

  if (!products.length) {
    container.innerHTML = `<div class="empty">No products yet.</div>`;
    return;
  }

  container.innerHTML = products.map((p) => `
    <div class="card">
      <img
        src="${p.image_url || "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png"}"
        alt="${p.name || "Product"}"
      />

      <div class="card-body">
        <div class="title">${p.name || "Untitled Product"}</div>
        <div class="price">$${Number(p.price || 0).toFixed(2)}</div>

        <button class="btn buy" data-id="${p.id}">
          Buy Now
        </button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".buy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Loading...";
      await createCheckout(btn.dataset.id);
      btn.disabled = false;
      btn.textContent = "Buy Now";
    });
  });
}

async function boot() {
  checkCheckoutState();
  const products = await loadProducts();
  renderProducts(products);
}

boot();
