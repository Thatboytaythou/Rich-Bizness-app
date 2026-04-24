import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { supabase, getCreatorBalance } from "/core/supabase.js";
import { ROUTES, formatMoney } from "/core/config.js";

const MIN_PAYOUT_CENTS = 1000;

function $(id) {
  return document.getElementById(id);
}

const els = {
  status: $("payout-status"),
  available: $("payout-balance-available"),
  earned: $("payout-balance-earned"),
  paid: $("payout-balance-paid"),
  accountStatus: $("payout-account-status"),
  historyList: $("payout-history-list"),
  requestBtn: $("payout-request-btn")
};

let currentUser = null;
let currentProfile = null;
let currentBalance = null;
let payoutAccount = null;

function centsToDollars(cents = 0) {
  return Number(cents || 0) / 100;
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

function badgeClass(status = "") {
  const value = String(status || "").toLowerCase();

  if (["paid", "completed", "succeeded"].includes(value)) return "is-success";
  if (["pending", "processing"].includes(value)) return "is-warning";
  if (["failed", "canceled", "rejected", "refunded"].includes(value)) return "is-error";

  return "";
}

function renderAccountStatus() {
  if (!els.accountStatus) return;

  if (!payoutAccount) {
    els.accountStatus.innerHTML = `
      <div class="payout-account-block is-error">
        <strong>No Stripe payout account connected.</strong>
        <p>Connect your payout account before requesting withdrawals.</p>
        <a class="btn-primary" href="/monetization.html">Set Up Monetization</a>
      </div>
    `;
    return;
  }

  const ready =
    !!payoutAccount.stripe_account_id &&
    !!payoutAccount.payouts_enabled;

  els.accountStatus.innerHTML = `
    <div class="payout-account-block ${ready ? "is-ready" : "is-warning"}">
      <strong>${ready ? "Stripe payout account ready." : "Stripe payout setup incomplete."}</strong>
      <p>
        Account:
        <span>${payoutAccount.stripe_account_id || "Not connected"}</span>
      </p>
      <div class="payout-flags">
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
      <a class="btn-ghost" href="/monetization.html">Manage Stripe Setup</a>
    </div>
  `;
}

function renderBalance() {
  if (!currentBalance) return;

  if (els.available) {
    els.available.textContent = formatMoney(
      centsToDollars(currentBalance.available_cents || 0),
      "USD"
    );
  }

  if (els.earned) {
    els.earned.textContent = formatMoney(
      centsToDollars(currentBalance.earned_cents || 0),
      "USD"
    );
  }

  if (els.paid) {
    els.paid.textContent = formatMoney(
      centsToDollars(currentBalance.paid_out_cents || 0),
      "USD"
    );
  }
}

function renderHistory(rows = []) {
  if (!els.historyList) return;

  if (!rows.length) {
    els.historyList.innerHTML = `
      <article class="payout-row empty">
        <strong>No payout requests yet.</strong>
        <p>Your payout history will show here.</p>
      </article>
    `;
    return;
  }

  els.historyList.innerHTML = rows
    .map((row) => {
      const status = String(row.status || "pending").toLowerCase();

      return `
        <article class="payout-row">
          <div>
            <strong>${formatMoney(centsToDollars(row.amount_cents || 0), row.currency || "USD")}</strong>
            <p>${row.note || "Creator payout request"}</p>
            <small>Requested ${safeDate(row.created_at)}</small>
            ${
              row.processed_at
                ? `<small>Processed ${safeDate(row.processed_at)}</small>`
                : ""
            }
          </div>

          <div class="payout-row-side">
            <span class="badge ${badgeClass(status)}">${status}</span>
            ${
              row.stripe_transfer_id
                ? `<small>${row.stripe_transfer_id}</small>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
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
    console.error("[payouts] payout account error:", error);
    return null;
  }

  return data || null;
}

async function loadPayoutHistory(userId) {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("artist_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[payouts] payout history error:", error);
    return [];
  }

  return data || [];
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function requestPayout() {
  const available = Number(currentBalance?.available_cents || 0);

  if (available < MIN_PAYOUT_CENTS) {
    setStatus("Minimum payout is $10.00.", "error");
    return;
  }

  if (!payoutAccount?.stripe_account_id) {
    setStatus("Connect your Stripe payout account first.", "error");
    return;
  }

  const token = await getAccessToken();

  if (!token) {
    setStatus("Please sign in again before requesting payout.", "error");
    return;
  }

  els.requestBtn.disabled = true;
  setStatus("Submitting payout request...");

  try {
    const res = await fetch("/api/request-payout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        amount_cents: available,
        currency: "usd",
        note: "Creator payout request from payout center"
      })
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Payout request failed.");
    }

    setStatus(
      json.status === "paid"
        ? "Payout sent successfully."
        : "Payout request submitted.",
      "success"
    );

    await loadPayoutsPage();
  } catch (error) {
    console.error("[payouts] request error:", error);
    setStatus(error.message || "Payout request failed.", "error");
  } finally {
    els.requestBtn.disabled = false;
  }
}

async function loadPayoutsPage() {
  setStatus("Loading payout data...");

  const userId = currentUser?.id;
  if (!userId) return;

  const [balance, account, history] = await Promise.all([
    getCreatorBalance(userId),
    loadPayoutAccount(userId),
    loadPayoutHistory(userId)
  ]);

  currentBalance =
    balance || {
      artist_user_id: userId,
      earned_cents: 0,
      paid_out_cents: 0,
      available_cents: 0
    };

  payoutAccount = account;

  renderBalance();
  renderAccountStatus();
  renderHistory(history);

  setStatus("Payout center loaded.", "success");
}

function bindActions() {
  els.requestBtn?.addEventListener("click", requestPayout);
}

export async function bootPayoutsPage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentProfile = getCurrentProfileState();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  if (!currentUser?.id) {
    setStatus("Login required before entering payouts.", "error");
    window.location.href = ROUTES.auth;
    return;
  }

  bindActions();
  await loadPayoutsPage();
}

if (document.body?.classList.contains("payouts-page")) {
  bootPayoutsPage().catch((error) => {
    console.error("[payouts] boot error:", error);
    setStatus(error.message || "Could not load payouts.", "error");
  });
}
