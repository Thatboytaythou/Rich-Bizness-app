// =========================
// RICH BIZNESS — WATCH ACCESS (FINAL ELITE)
// /core/features/live/watch-access.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let stream = null;

// =========================
// ELEMENTS
// =========================

const els = {
  gate: document.getElementById("watch-access-gate"),
  player: document.getElementById("watch-video"),
  payBtn: document.getElementById("watch-pay-btn"),
  status: document.getElementById("watch-access-status")
};

// =========================
// INIT
// =========================

export async function initWatchAccess({ streamData }) {
  currentUser = getCurrentUserState();
  stream = streamData;

  if (!stream?.id) {
    console.warn("❌ missing stream for access");
    return;
  }

  bindEvents();

  const hasAccess = await checkAccess();

  if (hasAccess) {
    unlock();
  } else {
    lock();
  }

  console.log("🔐 Access system ready");
}

// =========================
// CHECK ACCESS
// =========================

async function checkAccess() {
  // FREE STREAM
  if (stream.access_type === "free") return true;

  if (!currentUser?.id) return false;

  // =========================
  // VIP ACCESS
  // =========================

  if (stream.access_type === "vip") {
    const { data } = await supabase
      .from("vip_live_access")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("status", "active")
      .limit(1);

    if (data?.length) return true;
  }

  // =========================
  // PAID ACCESS
  // =========================

  if (stream.access_type === "paid") {
    const { data } = await supabase
      .from("live_stream_purchases")
      .select("*")
      .eq("stream_id", stream.id)
      .eq("user_id", currentUser.id)
      .eq("status", "paid")
      .limit(1);

    if (data?.length) return true;
  }

  return false;
}

// =========================
// LOCK / UNLOCK UI
// =========================

function unlock() {
  if (els.gate) els.gate.style.display = "none";
  if (els.player) els.player.style.display = "block";
}

function lock() {
  if (els.gate) els.gate.style.display = "flex";
  if (els.player) els.player.style.display = "none";

  if (els.status) {
    els.status.textContent = getAccessMessage();
  }
}

// =========================
// ACCESS MESSAGE
// =========================

function getAccessMessage() {
  if (stream.access_type === "paid") {
    return `🔒 Paid stream — ${formatMoney(stream.price_cents)}`;
  }

  if (stream.access_type === "vip") {
    return "💎 VIP members only stream";
  }

  return "🔒 Access required";
}

// =========================
// PAY FLOW
// =========================

async function startCheckout() {
  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return;
  }

  try {
    const res = await fetch("/api/live-stream-purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        streamId: stream.id
      })
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("❌ checkout failed", err);
  }
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.payBtn?.addEventListener("click", startCheckout);
}

// =========================
// HELPERS
// =========================

function formatMoney(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}
