// =========================
// RICH BIZNESS PROFILE
// /core/pages/profile.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();
let currentProfile = null;

const $ = (id) => document.getElementById(id);

const els = {
  nav: $("elite-platform-nav"),

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
  editCoverUrl: $("edit-cover-url")
};

mountEliteNav({
  target: "#elite-platform-nav",
  collapsed: false
});

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function safeText(value, fallback = "") {
  return value || fallback;
}

function setEditStatus(message, type = "normal") {
  if (!els.editStatus) return;
  els.editStatus.textContent = message;
  els.editStatus.classList.remove("is-success", "is-error");

  if (type === "success") els.editStatus.classList.add("is-success");
  if (type === "error") els.editStatus.classList.add("is-error");
}

function renderProfile(profile = {}) {
  const displayName =
    profile.display_name ||
    profile.full_name ||
    profile.username ||
    currentUser?.email ||
    "Rich Bizness Creator";

  const username =
    profile.username ||
    profile.handle ||
    "richbizness";

  const avatar =
    profile.avatar_url ||
    profile.profile_image_url ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";

  const cover =
    profile.cover_url ||
    profile.banner_url ||
    "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

  if (els.displayName) els.displayName.textContent = displayName;
  if (els.handle) els.handle.textContent = `@${username}`;
  if (els.bio) {
    els.bio.textContent =
      profile.bio ||
      "Building my lane across Rich Bizness live, music, gaming, sports, gallery, and money moves.";
  }

  if (els.avatar) els.avatar.src = avatar;

  if (els.cover) {
    els.cover.style.backgroundImage = `
      linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.78)),
      url("${cover}")
    `;
  }

  if (els.messageLink) {
    els.messageLink.href = currentUser?.id
      ? `/messages.html?user=${encodeURIComponent(currentUser.id)}`
      : "/messages.html";
  }
}

async function ensureProfile() {
  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("[profile] load profile error:", error);
  }

  if (data) return data;

  const fallbackProfile = {
    id: currentUser.id,
    email: currentUser.email,
    display_name:
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.name ||
      "Rich Bizness Creator",
    username:
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      `creator_${Date.now()}`,
    avatar_url: "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png",
    cover_url: "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png",
    bio: "Building my Rich Bizness lane.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(fallbackProfile)
    .select("*")
    .single();

  if (insertError) {
    console.warn("[profile] create profile skipped:", insertError);
    return fallbackProfile;
  }

  return inserted;
}

async function countTable(table, column = "user_id") {
  if (!currentUser?.id) return 0;

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, currentUser.id);

  if (error) return 0;
  return count || 0;
}

async function loadStats() {
  if (!currentUser?.id) return;

  const [followers, following, uploads, liveRooms] = await Promise.all([
    countTable("followers", "following_id"),
    countTable("followers", "follower_id"),
    countTable("uploads", "user_id"),
    countTable("live_streams", "creator_id")
  ]);

  if (els.followers) els.followers.textContent = followers.toLocaleString();
  if (els.following) els.following.textContent = following.toLocaleString();
  if (els.uploads) els.uploads.textContent = uploads.toLocaleString();
  if (els.live) els.live.textContent = liveRooms.toLocaleString();
}

async function loadMoney() {
  if (!currentUser?.id) return;

  const { data, error } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", currentUser.id)
    .maybeSingle();

  if (error || !data) {
    if (els.moneyAvailable) els.moneyAvailable.textContent = "$0.00";
    if (els.moneyEarned) els.moneyEarned.textContent = "$0.00";
    if (els.moneyPaidOut) els.moneyPaidOut.textContent = "$0.00";
    if (els.revenue) els.revenue.textContent = "$0.00";
    return;
  }

  if (els.moneyAvailable) els.moneyAvailable.textContent = money(data.available_cents);
  if (els.moneyEarned) els.moneyEarned.textContent = money(data.earned_cents);
  if (els.moneyPaidOut) els.moneyPaidOut.textContent = money(data.paid_out_cents);
  if (els.revenue) els.revenue.textContent = money(data.earned_cents);
}

async function loadUploads() {
  if (!els.uploadList || !currentUser?.id) return;

  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data?.length) {
    els.uploadList.innerHTML = `
      <div class="profile-empty">
        <strong>No uploads loaded yet.</strong>
        <span>Your drops will show here as the upload lanes connect.</span>
      </div>
    `;
    return;
  }

  els.uploadList.innerHTML = data
    .map((item) => {
      const title = item.title || item.caption || item.name || "Untitled upload";
      const type = item.content_type || item.category || item.type || "Upload";

      return `
        <article class="profile-list-card">
          <strong>${title}</strong>
          <span>${type}</span>
        </article>
      `;
    })
    .join("");
}

async function loadLiveRooms() {
  if (!els.liveList || !currentUser?.id) return;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data?.length) {
    els.liveList.innerHTML = `
      <div class="profile-empty">
        <strong>No live rooms yet.</strong>
        <span>Create a live room to start building the watch rail.</span>
      </div>
    `;
    return;
  }

  els.liveList.innerHTML = data
    .map((stream) => {
      const href = stream.slug
        ? `/watch.html?slug=${encodeURIComponent(stream.slug)}`
        : `/watch.html?id=${encodeURIComponent(stream.id)}`;

      return `
        <article class="profile-list-card">
          <strong>${stream.title || "Untitled live"}</strong>
          <span>${stream.status || "draft"} • ${stream.category || "general"} • ${Number(stream.viewer_count || 0).toLocaleString()} viewers</span>
          <a class="btn-ghost" href="${href}">Watch</a>
        </article>
      `;
    })
    .join("");
}

function openEditModal() {
  if (!currentProfile || !els.modal) return;

  if (els.editDisplayName) {
    els.editDisplayName.value = currentProfile.display_name || "";
  }

  if (els.editUsername) {
    els.editUsername.value = currentProfile.username || currentProfile.handle || "";
  }

  if (els.editBio) {
    els.editBio.value = currentProfile.bio || "";
  }

  if (els.editAvatarUrl) {
    els.editAvatarUrl.value = currentProfile.avatar_url || currentProfile.profile_image_url || "";
  }

  if (els.editCoverUrl) {
    els.editCoverUrl.value = currentProfile.cover_url || currentProfile.banner_url || "";
  }

  setEditStatus("Ready.");
  els.modal.showModal();
}

function closeEditModal() {
  els.modal?.close();
}

async function saveProfile(event) {
  event.preventDefault();

  if (!currentUser?.id) return;

  setEditStatus("Saving profile...");

  const payload = {
    display_name: els.editDisplayName?.value?.trim() || null,
    username: els.editUsername?.value?.trim() || null,
    bio: els.editBio?.value?.trim() || null,
    avatar_url: els.editAvatarUrl?.value?.trim() || null,
    cover_url: els.editCoverUrl?.value?.trim() || null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: currentUser.id,
        email: currentUser.email,
        ...payload
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) {
    setEditStatus(error.message || "Could not save profile.", "error");
    return;
  }

  currentProfile = data;
  renderProfile(currentProfile);
  setEditStatus("Profile saved.", "success");

  setTimeout(() => {
    closeEditModal();
  }, 700);
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
}

function bindEvents() {
  els.editBtn?.addEventListener("click", openEditModal);
  els.closeModal?.addEventListener("click", closeEditModal);
  els.editForm?.addEventListener("submit", saveProfile);
  els.logoutBtn?.addEventListener("click", logout);
}

async function bootProfile() {
  bindEvents();

  currentUser = getCurrentUserState();

  if (!currentUser?.id) {
    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || null;
  }

  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return;
  }

  currentProfile = await ensureProfile();
  renderProfile(currentProfile);

  await Promise.all([
    loadStats(),
    loadMoney(),
    loadUploads(),
    loadLiveRooms()
  ]);

  console.log("👤 Rich Bizness Profile Loaded");
}

bootProfile().catch((error) => {
  console.error("[profile] boot error:", error);
});
