// =========================
// RICH BIZNESS PROFILE — GTA UPGRADED (FINAL FIXED)
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
// RENDER PROFILE
// =========================

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
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";

  const cover =
    profile.cover_url ||
    "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png";

  // TEXT
  if (els.displayName) els.displayName.textContent = displayName;
  if (els.handle) els.handle.textContent = `@${username}`;
  if (els.bio) {
    els.bio.textContent =
      profile.bio ||
      "Building my lane across Rich Bizness.";
  }

  // GTA AVATAR SYSTEM
  if (els.avatar) {
    els.avatar.src = avatar;

    els.avatar.classList.remove(
      "gta-avatar",
      "avatar-hybrid",
      "avatar-anime",
      "avatar-real"
    );

    if (profile.avatar_type === "gta") {
      els.avatar.classList.add("gta-avatar");
    }

    if (profile.avatar_style) {
      els.avatar.classList.add(`avatar-${profile.avatar_style}`);
    }
  }

  // COVER
  if (els.cover) {
    els.cover.style.backgroundImage = `
      linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.85)),
      url("${cover}")
    `;
  }

  // MESSAGE LINK
  if (els.messageLink) {
    els.messageLink.href = currentUser?.id
      ? `/messages.html?user=${encodeURIComponent(currentUser.id)}`
      : "/messages.html";
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

  const fallbackProfile = {
    id: currentUser.id,
    email: currentUser.email,
    display_name: "Rich Bizness Creator",
    username: currentUser.email?.split("@")[0],
    avatar_url: "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png",
    cover_url: "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png",
    bio: "Building my Rich Bizness lane.",
    avatar_type: "gta",
    avatar_style: "hybrid",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted } = await supabase
    .from("profiles")
    .insert(fallbackProfile)
    .select("*")
    .single();

  return inserted;
}

// =========================
// SAVE PROFILE
// =========================

async function saveProfile(event) {
  event.preventDefault();

  setEditStatus("Saving...");

  const payload = {
    display_name: els.editDisplayName?.value?.trim(),
    username: els.editUsername?.value?.trim(),
    bio: els.editBio?.value?.trim(),
    avatar_url: els.editAvatarUrl?.value?.trim(),
    cover_url: els.editCoverUrl?.value?.trim(),

    avatar_type: "gta",
    avatar_style: "hybrid",

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
    setEditStatus(error.message, "error");
    return;
  }

  currentProfile = data;
  renderProfile(currentProfile);

  setEditStatus("Saved", "success");

  setTimeout(() => {
    els.modal?.close();
  }, 600);
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.editBtn?.addEventListener("click", () => els.modal?.showModal());
  els.closeModal?.addEventListener("click", () => els.modal?.close());
  els.editForm?.addEventListener("submit", saveProfile);

  els.logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });
}

// =========================
// BOOT (FIXED — NO BLANK SCREEN)
// =========================

async function bootProfile() {
  try {
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

    // 👇 ALWAYS SHOW PAGE (CRITICAL FIX)
    document.body.classList.add("profile-loaded");

    renderProfile(currentProfile);

    console.log("👤 Profile Ready (GTA Mode)");
  } catch (err) {
    console.error("❌ Profile crash:", err);

    // FAILSAFE
    document.body.classList.add("profile-loaded");
  }
}

bootProfile();
