// =========================
// RICH BIZNESS PROFILE — COMMAND CENTER (FULL FINAL)
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

  adminLink: $("admin-dashboard-link")
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
// PROFILE RENDER
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

  // ADMIN BUTTON
  if (els.adminLink) {
    const isAdmin =
      profile.role === "admin" ||
      profile.is_admin === true;

    els.adminLink.style.display = isAdmin ? "inline-flex" : "none";
  }
}

// =========================
// DATA LOADERS (🔥 THIS WAS MISSING)
// =========================

async function loadStats() {
  const [
    followersRes,
    uploadsRes,
    liveRes,
    revenueRes
  ] = await Promise.all([
    supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", currentUser.id),
    supabase.from("uploads").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id),
    supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("creator_id", currentUser.id),
    supabase.from("tips").select("amount_cents").eq("to_user_id", currentUser.id)
  ]);

  if (els.followers) els.followers.textContent = followersRes.count || 0;
  if (els.uploads) els.uploads.textContent = uploadsRes.count || 0;
  if (els.live) els.live.textContent = liveRes.count || 0;

  const totalRevenue =
    (revenueRes.data || []).reduce((sum, t) => sum + (t.amount_cents || 0), 0);

  if (els.revenue) els.revenue.textContent = money(totalRevenue);
}

// =========================

async function loadMoney() {
  const { data } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", currentUser.id)
    .maybeSingle();

  if (!data) return;

  if (els.moneyAvailable) els.moneyAvailable.textContent = money(data.available_cents);
  if (els.moneyEarned) els.moneyEarned.textContent = money(data.earned_cents);
  if (els.moneyPaidOut) els.moneyPaidOut.textContent = money(data.paid_out_cents);
}

// =========================

async function loadUploads() {
  const { data } = await supabase
    .from("uploads")
    .select("*")
    .eq("user_id", currentUser.id)
    .limit(6);

  if (!data || !data.length) return;

  els.uploadList.innerHTML = data.map(item => `
    <div class="profile-list-card">
      <strong>${item.title || "Upload"}</strong>
      <span>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</span>
    </div>
  `).join("");
}

// =========================

async function loadLive() {
  const { data } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", currentUser.id)
    .limit(6);

  if (!data || !data.length) return;

  els.liveList.innerHTML = data.map(stream => `
    <div class="profile-list-card">
      <strong>${stream.title || "Live Stream"}</strong>
      <span>${stream.status || "offline"}</span>
    </div>
  `).join("");
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

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: currentUser.id,
      display_name: els.editDisplayName.value,
      username: els.editUsername.value,
      bio: els.editBio.value,
      avatar_url: els.editAvatarUrl.value,
      cover_url: els.editCoverUrl.value,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    setEditStatus(error.message, "error");
    return;
  }

  currentProfile = data;
  renderProfile(data);

  setEditStatus("Saved", "success");
  setTimeout(() => els.modal.close(), 500);
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.editBtn?.addEventListener("click", () => els.modal.showModal());
  els.closeModal?.addEventListener("click", () => els.modal.close());
  els.editForm?.addEventListener("submit", saveProfile);

  els.logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth.html";
  });
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

    // 🔥 THIS IS WHAT MAKES IT FEEL REAL
    await Promise.all([
      loadStats(),
      loadMoney(),
      loadUploads(),
      loadLive()
    ]);

    document.body.classList.add("profile-loaded");

    console.log("🔥 PROFILE FULLY LOADED");
  } catch (err) {
    console.error("Profile crash:", err);
    document.body.classList.add("profile-loaded");
  }
}

bootProfile();
