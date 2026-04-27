// =========================
// RICH BIZNESS NOTIFICATIONS — FINAL GLOBAL ENGINE
// /core/pages/notifications.js
// Source: notifications
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav", collapsed: false });

const $ = (id) => document.getElementById(id);

const els = {
  status: $("notifications-status"),
  list: $("notifications-list"),
  refreshBtn: $("refresh-notifications-btn"),
  markAllReadBtn: $("mark-all-read-btn"),
  filterBtns: document.querySelectorAll("[data-filter]")
};

let activeFilter = "all";

const FILTER_MAP = {
  all: null,
  social: ["like", "comment", "repost", "follow", "post_reaction"],
  messages: ["message", "dm", "live_slide_in"],
  live: ["live", "live_started", "live_purchase", "vip_live_access"],
  gaming: ["game_challenge", "game_challenge_invite", "game_score", "game_result"],
  sports: ["sports_pick", "sports_result", "sports_upload", "sports_bracket"],
  music: ["music_upload", "music_unlock", "track_purchase", "music_stream"],
  gallery: ["artwork_like", "artwork_purchase", "gallery"],
  store: ["store_order", "product_purchase", "payout", "payment"],
  system: ["system", "admin", "account"]
};

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `notifications-status ${type}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getIcon(type = "") {
  const clean = String(type || "").toLowerCase();

  if (clean.includes("message") || clean.includes("dm")) return "💬";
  if (clean.includes("live")) return "📺";
  if (clean.includes("game") || clean.includes("challenge")) return "🎮";
  if (clean.includes("sport")) return "🏆";
  if (clean.includes("music") || clean.includes("track")) return "🎵";
  if (clean.includes("art") || clean.includes("gallery")) return "🎨";
  if (clean.includes("store") || clean.includes("order") || clean.includes("purchase")) return "🛒";
  if (clean.includes("payment") || clean.includes("payout")) return "💰";
  if (clean.includes("like")) return "❤️";
  if (clean.includes("comment")) return "💬";
  if (clean.includes("follow")) return "👥";
  if (clean.includes("system")) return "⚙️";

  return "🔔";
}

function getTitle(item) {
  return item.title || item.type || "Rich Bizness Notification";
}

function getBody(item) {
  return item.body || item.message || item.description || "Something happened in your Rich Bizness empire.";
}

function isRead(item) {
  return Boolean(item.read_at || item.is_read);
}

function getLink(item) {
  return item.link_url || item.url || item.metadata?.link_url || "";
}

function renderNotifications(items = []) {
  if (!els.list) return;

  if (!items.length) {
    els.list.innerHTML = `
      <div class="status-box">
        No notifications yet.
      </div>
    `;
    return;
  }

  els.list.innerHTML = items.map((item) => {
    const read = isRead(item);
    const link = getLink(item);

    return `
      <article class="notification-card ${read ? "is-read" : "is-unread"}" data-notification-id="${escapeHtml(item.id)}">
        <div class="notification-icon">${getIcon(item.type)}</div>

        <div class="notification-body">
          <div class="notification-top">
            <strong>${escapeHtml(getTitle(item))}</strong>
            <span>${safeDate(item.created_at)}</span>
          </div>

          <p>${escapeHtml(getBody(item))}</p>

          <div class="notification-meta">
            <span>${escapeHtml(item.type || "notification")}</span>
            ${read ? `<span>Read</span>` : `<span class="unread-pill">Unread</span>`}
          </div>

          <div class="notification-actions">
            ${
              link
                ? `<a class="btn btn-dark" href="${escapeHtml(link)}">Open</a>`
                : ""
            }
            ${
              !read
                ? `<button class="btn btn-gold" type="button" data-mark-read="${escapeHtml(item.id)}">Mark Read</button>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadNotifications() {
  const user = await getUser();

  if (!user?.id) {
    setStatus("Sign in to view notifications.", "error");
    els.list.innerHTML = `
      <div class="status-box">
        Please sign in to load your Rich Bizness alerts.
      </div>
    `;
    return;
  }

  setStatus("Loading notifications...");

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const filterTypes = FILTER_MAP[activeFilter];

  if (Array.isArray(filterTypes)) {
    query = query.in("type", filterTypes);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[notifications] load error:", error);
    setStatus(error.message || "Could not load notifications.", "error");
    els.list.innerHTML = `<div class="status-box">Could not load notifications.</div>`;
    return;
  }

  renderNotifications(data || []);

  const unreadCount = (data || []).filter((item) => !isRead(item)).length;
  setStatus(
    `${data?.length || 0} notification${data?.length === 1 ? "" : "s"} loaded • ${unreadCount} unread`,
    "success"
  );
}

async function markRead(notificationId) {
  const user = await getUser();
  if (!user?.id || !notificationId) return;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    setStatus(error.message || "Could not mark notification read.", "error");
    return;
  }

  await loadNotifications();
}

async function markAllRead() {
  const user = await getUser();

  if (!user?.id) {
    setStatus("Sign in first.", "error");
    return;
  }

  setStatus("Marking all notifications read...");

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", user.id)
    .or("is_read.is.false,read_at.is.null");

  if (error) {
    setStatus(error.message || "Could not mark all read.", "error");
    return;
  }

  await loadNotifications();
}

function bindNotifications() {
  els.refreshBtn?.addEventListener("click", loadNotifications);
  els.markAllReadBtn?.addEventListener("click", markAllRead);

  els.filterBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      activeFilter = btn.dataset.filter || "all";

      els.filterBtns.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      await loadNotifications();
    });
  });

  els.list?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-mark-read]");
    if (!btn) return;

    await markRead(btn.getAttribute("data-mark-read"));
  });

  supabase
    .channel("rb-global-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications"
      },
      async (payload) => {
        const user = await getUser();
        const row = payload.new || payload.old;

        if (!user?.id || row?.user_id !== user.id) return;

        await loadNotifications();
      }
    )
    .subscribe();
}

async function bootNotifications() {
  bindNotifications();
  await loadNotifications();
  console.log("🔔 Rich Bizness Notifications Loaded");
}

bootNotifications().catch((error) => {
  console.error("[notifications] boot error:", error);
  setStatus(error.message || "Could not load notifications.", "error");
});
