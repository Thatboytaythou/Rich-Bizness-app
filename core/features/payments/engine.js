// =========================
// RICH BIZNESS — MASTER ENGINE
// /core/features/payments/engine.js
// =========================

import { getSupabase } from "/core/app.js";

const supabase = getSupabase();

// =========================
// STATE
// =========================

let currentUser = null;
let sessionToken = null;
let unlockMap = {};

// =========================
// INIT ENGINE (RUN ON EVERY PAGE)
// =========================

export async function initEngine() {
  const { data } = await supabase.auth.getSession();

  currentUser = data?.session?.user || null;
  sessionToken = data?.session?.access_token || null;

  await refreshUnlocks();
}

// =========================
// GET USER
// =========================

export function getUser() {
  return currentUser;
}

// =========================
// GET TOKEN
// =========================

export function getToken() {
  return sessionToken;
}

// =========================
// =========================
// 🔓 UNLOCK SYSTEM
// =========================
// =========================

// Load unlocks from DB
export async function refreshUnlocks() {
  if (!currentUser) {
    unlockMap = {};
    return;
  }

  const { data } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", currentUser.id);

  unlockMap = {};

  (data || []).forEach((u) => {
    unlockMap[u.product_id] = true;
  });
}

// Check access
export function hasAccess(productId) {
  return !!unlockMap[productId];
}

// =========================
// =========================
// 💳 STRIPE CHECKOUT
// =========================
// =========================

export async function startCheckout({
  mode,
  productId,
  linkedId = null,
  extra = {}
}) {
  if (!sessionToken) {
    alert("You must be signed in");
    return;
  }

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        mode,
        productId,
        linkedRecordId: linkedId,
        ...extra
      })
    });

    const data = await res.json();

    if (!data.checkoutUrl) {
      console.error(data);
      alert("Checkout failed");
      return;
    }

    window.location.href = data.checkoutUrl;
  } catch (err) {
    console.error(err);
    alert("Checkout error");
  }
}

// =========================
// =========================
// 🔄 POST-PAYMENT SYNC
// =========================
// =========================

// Auto refresh after Stripe return
export async function handleReturn() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("session_id")) {
    await refreshUnlocks();

    // clean URL (optional)
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// =========================
// =========================
// 🎯 UNIVERSAL ACTION HELPER
// =========================
// =========================

export async function handleAction({
  productId,
  mode,
  linkedId,
  onUnlocked
}) {
  // already unlocked
  if (hasAccess(productId)) {
    onUnlocked();
    return;
  }

  // not unlocked → go to Stripe
  await startCheckout({
    mode,
    productId,
    linkedId
  });
}
