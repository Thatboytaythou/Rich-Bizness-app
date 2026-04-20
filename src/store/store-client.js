import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

function renderProducts(products) {
  const container = document.getElementById("products");

  if (!products.length) {
    container.innerHTML = `<div class="empty">No products yet.</div>`;
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.image_url || '/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png'}"/>

      <div class="card-body">
        <div class="title">${p.name}</div>
        <div class="price">$${p.price}</div>

        <button class="btn buy" data-id="${p.id}">
          Buy Now
        </button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".buy").forEach(btn => {
    btn.onclick = () => {
      alert("Stripe checkout comes next step 🔥");
    };
  });
}

async function boot() {
  const products = await loadProducts();
  renderProducts(products);
}

boot();
