import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase, getCreatorBalance } from "/core/supabase.js";
import { ROUTES, formatMoney } from "/core/config.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  status: $("monetization-status"),
  connectStripeBtn: $("connect-stripe-btn"),

  available: $("monetization-balance-available"),
  earned: $("monetization-balance-earned"),
  paid: $("monetization-balance-paid"),

  stripePanel: $("stripe-account-panel"),

  premiumForm: $("premium-content-form"),
  premiumTitle: $("premium-title"),
  premiumDescription: $("premium-description"),
  premiumContentType: $("premium-content-type"),
  premiumContentId: $("premium-content-id"),
  premiumPrice: $("premium-price"),

  premiumList: $("premium-content-list"),
  unlockList: $("unlock-list"),
  membershipList: $("membership-list"),
  tipsList: $("tips-list")
};

let currentUser = null;
let currentProfile = null;
let payoutAccount = null;

function centsToDollars(cents = 0) {
  return Number(cents || 0) / 100;
}

function dollarsToCents(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function setStatus(message, type = "normal") {
  if (!els.status) return;

  els.status.textContent = message;
  els.status.classList.remove("is-error", "is-success");

  if (type === "error") els.status.classList.add("is-error");
  if (type === "success") els.status.classList.add("is-success");
}

function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeClass(status = "") {
  const value = String(status || "").toLowerCase();

  if (["active", "paid", "complete", "completed", "succeeded"].includes(value)) {
    return "is-success";
  }

  if (["pending", "processing", "draft"].includes(value)) {
    return "is-warning";
  }

  if (["failed", "canceled", "rejected", "refunded", "inactive"].includes(value)) {
    return "is-error";
  }

  return "";
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function loadPayoutAccount(userId) {
  const { data, error } = await supabase
    .from("artist_payout_accounts")
    .select(
      "id, user_id, stripe_account_id, onboarding_complete, details_submitted, charges_enabled, payouts_enabled, country, default_currency, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[monetization] payout account error:", error);
    return null;
  }

  return data || null;
}

async function loadPremiumContent(userId) {
  const { data, error } = await supabase
    .from("premium_content")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[monetization] premium content error:", error);
    return [];
  }

  return data || [];
}

async function loadUnlocks(userId) {
  const { data, error } = await supabase
    .from("user_product_unlocks")
    .select("*")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[monetization] unlocks error:", error);
    return [];
  }

  return data || [];
}

async function loadMemberships(userId) {
  const { data, error } = await supabase
    .from("creator_memberships")
    .select("*")
    .or(`creator_id.eq.${userId},user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[monetization] memberships error:", error);
    return [];
  }

  return data || [];
}

async function loadTips(userId) {
  const { data, error } = await supabase
    .from("tips")
    .select("*")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[monetization] tips error:", error);
    return [];
  }

  return data || [];
}

function renderBalance(balance) {
  const safe = balance || {
    available_cents: 0,
    earned_cents: 0,
    paid_out_cents: 0
  };

  if (els.available) {
    els.available.textContent = formatMoney(centsToDollars(safe.available_cents), "USD");
  }

  if (els.earned) {
    els.earned.textContent = formatMoney(centsToDollars(safe.earned_cents), "USD");
  }

  if (els.paid) {
    els.paid.textContent = formatMoney(centsToDollars(safe.paid_out_cents), "USD");
  }
}

function renderStripePanel() {
  if (!els.stripePanel) return;

  if (!payoutAccount) {
    els.stripePanel.innerHTML = `
      <div class="money-account is-error">
        <strong>No Stripe payout account connected.</strong>
        <p>Connect Stripe so fans can pay you and payouts can move properly.</p>
        <button id="stripe-connect-inline-btn" class="btn-primary">Connect Stripe</button>
      </div>
    `;
    $("stripe-connect-inline-btn")?.addEventListener("click", connectStripe);
    return;
  }

  const ready =
    !!payoutAccount.stripe_account_id &&
    !!payoutAccount.payouts_enabled;

  els.stripePanel.innerHTML = `
    <div class="money-account ${ready ? "is-ready" : "is-warning"}">
      <strong>${ready ? "Stripe payout account ready." : "Stripe setup incomplete."}</strong>
      <p>Account: <span>${escapeHtml(payoutAccount.stripe_account_id || "Not connected")}</span></p>

      <div class="money-flags">
        <span class="badge ${payoutAccount.onboarding_complete ? "is-success" : "is-warning"}">
          Onboarding ${payoutAccount.onboarding_complete ? "complete" : "needed"}
        </span>
        <span class="badge ${payoutAccount.details_submitted ? "is-success" : "is-warning"}">
          Details ${payoutAccount.details_submitted ? "submitted" : "missing"}
        </span>
        <span class="badge ${payoutAccount.charges_enabled ? "is-success" : "is-warning"}">
          Charges ${payoutAccount.charges_enabled ? "enabled" : "disabled"}
        </span>
        <span class="badge ${payoutAccount.payouts_enabled ? "is-success" : "is-warning"}">
          Payouts ${payoutAccount.payouts_enabled ? "enabled" : "disabled"}
        </span>
      </div>

      <button id="stripe-connect-inline-btn" class="btn-ghost">
        Refresh / Continue Stripe Setup
      </button>
    </div>
  `;

  $("stripe-connect-inline-btn")?.addEventListener("click", connectStripe);
}

function rowCard({ title, subtitle, amount, status, date, action }) {
  return `
    <article class="money-row">
      <div>
        <strong>${escapeHtml(title || "Record")}</strong>
        <p>${escapeHtml(subtitle || "")}</p>
        <small>${escapeHtml(date || "—")}</small>
      </div>

      <div class="money-row-side">
        ${amount ? `<b>${escapeHtml(amount)}</b>` : ""}
        ${status ? `<span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span>` : ""}
        ${action || ""}
      </div>
    </article>
  `;
}

function renderPremiumList(rows = []) {
  if (!els.premiumList) return;

  if (!rows.length) {
    els.premiumList.innerHTML = `
      <article class="money-row empty">
        <strong>No premium offers yet.</strong>
        <p>Create an unlockable premium item above.</p>
      </article>
    `;
    return;
  }

  els.premiumList.innerHTML = rows
    .map((row) =>
      rowCard({
        title: row.title || "Premium Content",
        subtitle: row.description || row.content_type || "Premium item",
        amount: formatMoney(centsToDollars(row.price_cents || 0), "USD"),
        status: row.is_active ? "active" : "inactive",
        date: safeDate(row.created_at)
      })
    )
    .join("");
}

function renderUnlocks(rows = []) {
  if (!els.unlockList) return;

  if (!rows.length) {
    els.unlockList.innerHTML = `
      <article class="money-row empty">
        <strong>No unlocks yet.</strong>
        <p>Fan purchases and unlocks will appear here.</p>
      </article>
    `;
    return;
  }

  els.unlockList.innerHTML = rows
    .map((row) =>
      rowCard({
        title: `${row.kind || "Unlock"} access`,
        subtitle: `Product #${row.product_id || "—"} · ${row.access_scope || "standard"}`,
        status: row.source || "unlock",
        date: safeDate(row.granted_at)
      })
    )
    .join("");
}

function renderMemberships(rows = []) {
  if (!els.membershipList) return;

  if (!rows.length) {
    els.membershipList.innerHTML = `
      <article class="money-row empty">
        <strong>No memberships yet.</strong>
        <p>Creator memberships will appear here.</p>
      </article>
    `;
    return;
  }

  els.membershipList.innerHTML = rows
    .map((row) =>
      rowCard({
        title: row.tier_name || "Creator Membership",
        subtitle: `Creator ${row.creator_id || "—"} · Member ${row.user_id || "—"}`,
        status: row.is_active ? "active" : "inactive",
        date: row.expires_at ? `Expires ${safeDate(row.expires_at)}` : safeDate(row.created_at)
      })
    )
    .join("");
}

function renderTips(rows = []) {
  if (!els.tipsList) return;

  if (!rows.length) {
    els.tipsList.innerHTML = `
      <article class="money-row empty">
        <strong>No tips yet.</strong>
        <p>Fan tips will appear here once they come in.</p>
      </article>
    `;
    return;
  }

  els.tipsList.innerHTML = rows
    .map((row) =>
      rowCard({
        title: "Tip Received",
        subtitle: `From ${row.from_user_id || "fan"}`,
        amount: formatMoney(centsToDollars(row.amount_cents || 0), row.currency || "USD"),
        status: row.status || "paid",
        date: safeDate(row.paid_at || row.created_at)
      })
    )
    .join("");
}

async function createPremiumOffer(event) {
  event.preventDefault();

  if (!currentUser?.id) {
    setStatus("Login required.", "error");
    return;
  }

  const title = els.premiumTitle?.value?.trim();
  const description = els.premiumDescription?.value?.trim();
  const contentType = els.premiumContentType?.value || "post";
  const contentId = Number(els.premiumContentId?.value || 0);
  const priceCents = dollarsToCents(els.premiumPrice?.value || 0);

  if (!title) {
    setStatus("Premium title is required.", "error");
    return;
  }

  if (priceCents <= 0) {
    setStatus("Premium price must be higher than $0.", "error");
    return;
  }

  setStatus("Creating premium offer...");

  const { error } = await supabase.from("premium_content").insert({
    creator_id: currentUser.id,
    creator_email: currentUser.email || currentProfile?.email || null,
    content_type: contentType,
    content_id: contentId || 0,
    title,
    description,
    price_cents: priceCents,
    is_active: true,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error("[monetization] create premium error:", error);
    setStatus(error.message || "Could not create premium offer.", "error");
    return;
  }

  els.premiumForm?.reset();
  setStatus("Premium offer created.", "success");
  await loadMonetizationPage();
}

async function connectStripe() {
  const token = await getAccessToken();

  if (!token) {
    setStatus("Please sign in again before connecting Stripe.", "error");
    return;
  }

  setStatus("Opening Stripe setup...");

  try {
    const res = await fetch("/api/create-connect-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Could not start Stripe setup.");
    }

    const accountLink =
      json.url ||
      json.accountLinkUrl ||
      json.account_link_url ||
      json.onboardingUrl;

    if (!accountLink) {
      throw new Error("Stripe setup link was not returned.");
    }

    window.location.href = accountLink;
  } catch (error) {
    console.error("[monetization] stripe connect error:", error);
    setStatus(error.message || "Could not open Stripe setup.", "error");
  }
}

async function loadMonetizationPage() {
  const userId = currentUser?.id;
  if (!userId) return;

  setStatus("Loading monetization center...");

  const [
    balance,
    account,
    premium,
    unlocks,
    memberships,
    tips
  ] = await Promise.all([
    getCreatorBalance(userId),
    loadPayoutAccount(userId),
    loadPremiumContent(userId),
    loadUnlocks(userId),
    loadMemberships(userId),
    loadTips(userId)
  ]);

  payoutAccount = account;

  renderBalance(balance);
  renderStripePanel();
  renderPremiumList(premium);
  renderUnlocks(unlocks);
  renderMemberships(memberships);
  renderTips(tips);

  setStatus("Monetization center loaded.", "success");
}

function bindActions() {
  els.connectStripeBtn?.addEventListener("click", connectStripe);
  els.premiumForm?.addEventListener("submit", createPremiumOffer);
}

export async function bootMonetizationPage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentProfile = getCurrentProfileState();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  if (!currentUser?.id) {
    setStatus("Login required before entering monetization.", "error");
    window.location.href = ROUTES.auth;
    return;
  }

  bindActions();
  await loadMonetizationPage();
}

if (document.body?.classList.contains("monetization-page")) {
  bootMonetizationPage().catch((error) => {
    console.error("[monetization] boot error:", error);
    setStatus(error.message || "Could not load monetization.", "error");
  });
}
