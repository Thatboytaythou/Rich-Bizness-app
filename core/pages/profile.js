// =========================
// RICH BIZNESS PROFILE — COMMAND CENTER (ULTRA MAXED)
// /core/pages/profile.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();
let currentProfile = null;

const $ = (id) => document.getElementById(id);

// =========================
// ELEMENTS
// =========================

const els = {
  cover: $("profile-cover"),
  avatar: $("profile-avatar"),
  displayName: $("profile-display-name"),
  handle: $("profile-handle"),
  bio: $("profile-bio"),

  editBtn: $("edit-profile-btn"),
  logoutBtn: $("logout-btn"),
  messageLink: $("message-profile-link"),

  followers: $("stat-followers"),
  following: $("stat-following"),
  uploads: $("stat-uploads"),
  live: $("stat-live"),
  revenue: $("stat-revenue"),

  uploadList: $("profile-upload-list"),
  liveList: $("profile-live-list"),

  moneyAvailable: $("money-available"),
  moneyEarned: $("money-earned"),
  moneyPaidOut: $("money-paid-out"),

  modal: $("profile-edit-modal"),
  closeModal: $("close-profile-modal"),
  editForm: $("profile-edit-form"),
  editStatus: $("profile-edit-status"),

  editDisplayName: $("edit-display-name"),
  editUsername: $("edit-username"),
  editBio: $("edit-bio"),
  editAvatarUrl: $("edit-avatar-url"),
  editCoverUrl: $("edit-cover-url"),

  adminLink: $("admin-dashboard-link"),

  // 🔥 NEW (COMMAND BAR SYNC)
  cmdLive: $("cmd-live-count"),
  cmdUploads: $("cmd-upload-count"),
  cmdFollowers: $("cmd-follower-count"),
  cmdMoney: $("cmd-money")
};

// =========================
// NAV
// =========================

mountEliteNav({
  target: "#elite-platform-nav",
  collapsed: false
});

// =========================
// HELPERS
// =========================

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function setEditStatus(message, type = "normal") {
  if (!els.editStatus) return;

  els.editStatus.textContent = message;
  els.editStatus.classList.remove("is-success", "is-error");

  if (type === "success") els.editStatus.classList.add("is-success");
  if (type === "error") els.editStatus.classList.add("is-error");
}

// =========================
// 🔥 MOTION HELPERS (NEW)
// =========================

function animateValue(el, end) {
  if (!el) return;

  let start = 0;
  const duration = 600;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(progress * end);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// =========================
// RENDER PROFILE
// =========================

function renderProfile(profile = {}) {
  const displayName =
    profile.display_name ||
    profile.username ||
    currentUser?.email ||
    "Rich Bizness Creator";

  const username = profile.username || "richbizness";

  const avatar =
    profile.avatar_url ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";

  const cover =
    profile.cover_url ||
    "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

  if (els.displayName) els.displayName.textContent = displayName;
  if (els.handle) els.handle.textContent = `@${username}`;
  if (els.bio) els.bio.textContent = profile.bio || "Building your Rich Bizness lane.";

  if (els.avatar) els.avatar.src = avatar;

  if (els.cover) {
    els.cover.style.backgroundImage = `
      linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.85)),
      url("${cover}")
    `;
  }

  if (els.adminLink) {
    const isAdmin =
      profile.role === "admin" ||
      profile.is_admin === true ||
      profile.account_role === "admin";

    els.adminLink.style.display = isAdmin ? "inline-flex" : "none";
  }
}

// =========================
// DATA LOADERS
// =========================

async function loadStats() {
  try {
    const [
      followersRes,
      uploadsRes,
      liveRes,
      tipsRes
    ] = await Promise.all([
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", currentUser.id),
      supabase.from("uploads").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id),
      supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("creator_id", currentUser.id),
      supabase.from("tips").select("amount_cents").eq("to_user_id", currentUser.id)
    ]);

    const followers = followersRes.count || 0;
    const uploads = uploadsRes.count || 0;
    const live = liveRes.count || 0;

    if (els.followers) animateValue(els.followers, followers);
    if (els.uploads) animateValue(els.uploads, uploads);
    if (els.live) animateValue(els.live, live);

    // 🔥 COMMAND BAR SYNC
    if (els.cmdFollowers) animateValue(els.cmdFollowers, followers);
    if (els.cmdUploads) animateValue(els.cmdUploads, uploads);
    if (els.cmdLive) animateValue(els.cmdLive, live);

    const totalRevenue =
      (tipsRes.data || []).reduce((sum, t) => sum + (t.amount_cents || 0), 0);

    if (els.revenue) els.revenue.textContent = money(totalRevenue);
    if (els.cmdMoney) els.cmdMoney.textContent = money(totalRevenue);

  } catch (err) {
    console.warn("Stats failed", err);
  }
}

async function loadMoney() {
  try {
    const { data } = await supabase
      .from("creator_available_balances")
      .select("*")
      .eq("artist_user_id", currentUser.id)
      .maybeSingle();

    if (!data) return;

    if (els.moneyAvailable) els.moneyAvailable.textContent = money(data.available_cents);
    if (els.moneyEarned) els.moneyEarned.textContent = money(data.earned_cents);
    if (els.moneyPaidOut) els.moneyPaidOut.textContent = money(data.paid_out_cents);

  } catch (err) {
    console.warn("Money load failed", err);
  }
}

// =========================
// PROFILE LOAD / CREATE
// =========================

async function ensureProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (data) return data;

  const { data: inserted } = await supabase
    .from("profiles")
    .insert({
      id: currentUser.id,
      email: currentUser.email,
      display_name: "Rich Bizness Creator",
      username: currentUser.email?.split("@")[0],
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  return inserted;
}

// =========================
// SAVE PROFILE
// =========================

async function saveProfile(e) {
  e.preventDefault();

  setEditStatus("Saving...");

  const payload = {
    id: currentUser.id,
    display_name: els.editDisplayName.value,
    username: els.editUsername.value,
    bio: els.editBio.value,
    avatar_url: els.editAvatarUrl.value,
    updated_at: new Date().toISOString()
  };

  if (els.editCoverUrl.value) {
    payload.cover_url = els.editCoverUrl.value;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    setEditStatus(error.message, "error");
    return;
  }

  currentProfile = data;
  renderProfile(data);

  setEditStatus("Saved", "success");

  els.modal.removeAttribute("open");
  document.body.classList.remove("modal-open");
}

// =========================
// EVENTS
// =========================

function bindEvents() {

  els.editBtn?.addEventListener("click", () => {
    if (currentProfile) {
      els.editDisplayName.value = currentProfile.display_name || "";
      els.editUsername.value = currentProfile.username || "";
      els.editBio.value = currentProfile.bio || "";
      els.editAvatarUrl.value = currentProfile.avatar_url || "";
      els.editCoverUrl.value = currentProfile.cover_url || "";
    }

    els.modal.setAttribute("open", "true");
    document.body.classList.add("modal-open");
  });

  els.closeModal?.addEventListener("click", () => {
    els.modal.removeAttribute("open");
    document.body.classList.remove("modal-open");
  });

  els.editForm?.addEventListener("submit", saveProfile);

  els.logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth.html";
  });
}

// =========================
// 🔥 SCROLL + RE-ANIMATION
// =========================

function initScrollAnimations() {
  const items = document.querySelectorAll(".profile-panel, .profile-lane, .money-grid article");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => observer.observe(el));
}

// 🔥 FORCE RE-ANIMATION AFTER LOAD
function triggerReAnimation() {
  setTimeout(() => {
    document.querySelectorAll(".profile-panel").forEach(el => {
      el.style.animation = "none";
      el.offsetHeight;
      el.style.animation = "";
    });
  }, 300);
}

// =========================
// BOOT
// =========================

async function bootProfile() {
  try {
    bindEvents();

    if (!currentUser?.id) {
      const { data } = await supabase.auth.getSession();
      currentUser = data?.session?.user;
    }

    if (!currentUser?.id) {
      window.location.href = "/auth.html";
      return;
    }

    currentProfile = await ensureProfile();

    renderProfile(currentProfile);

    await Promise.all([
      loadStats(),
      loadMoney()
    ]);

    document.body.classList.add("profile-loaded");

    initScrollAnimations();
    triggerReAnimation();

    console.log("🔥 PROFILE MAXED");

  } catch (err) {
    console.error("Profile crash:", err);
    document.body.classList.add("profile-loaded");
  }
}

bootProfile();
