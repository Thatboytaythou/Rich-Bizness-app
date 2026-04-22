import { supabase } from "/core/supabase.js";
import { getUser, isAuthenticated, onSessionChange } from "/core/features/auth/session.js";
import { BRAND_IMAGES } from "/core/config.js";

let currentProfile = null;
let profileListeners = new Set();
let bootstrapped = false;
let unsubscribeSession = null;

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function notifyProfileListeners() {
  for (const callback of profileListeners) {
    try {
      callback(currentProfile);
    } catch (error) {
      console.error("[profile-bootstrap] listener error:", error);
    }
  }
}

export function onProfileChange(callback) {
  if (typeof callback === "function") {
    profileListeners.add(callback);
  }

  return () => {
    profileListeners.delete(callback);
  };
}

export function getCurrentProfile() {
  return currentProfile;
}

export function clearCurrentProfile() {
  currentProfile = null;
  notifyProfileListeners();
}

export function getProfileDisplayName(profile = null, user = null) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Rich Bizness User"
  );
}

export function getProfileHandle(profile = null, user = null) {
  return (
    profile?.handle ||
    profile?.username ||
    slugify(
      profile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      "richbizness"
    ) ||
    "richbizness"
  );
}

export function getProfileAvatar(profile = null) {
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    BRAND_IMAGES.logo
  );
}

export function getProfileBanner(profile = null) {
  return (
    profile?.banner_url ||
    profile?.cover_url ||
    BRAND_IMAGES.artist ||
    BRAND_IMAGES.homeHero
  );
}

export async function fetchProfileByUserId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profile-bootstrap] fetchProfileByUserId error:", error);
    return null;
  }

  return data || null;
}

function buildProfilePayload(user, overrides = {}) {
  const email = user?.email || null;

  const displayName =
    String(overrides.display_name || "").trim() ||
    String(user?.user_metadata?.display_name || "").trim() ||
    String(user?.user_metadata?.full_name || "").trim() ||
    email?.split("@")[0] ||
    "Rich Bizness User";

  const username =
    slugify(overrides.username) ||
    slugify(user?.user_metadata?.username) ||
    slugify(displayName) ||
    `user-${String(user?.id || "").slice(0, 8)}`;

  const handle =
    slugify(overrides.handle) ||
    slugify(username) ||
    "richbizness";

  return {
    id: user.id,
    user_id: user.id,
    email,
    display_name: displayName,
    username,
    handle,
    avatar_url:
      overrides.avatar_url ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      null,
    profile_image_url:
      overrides.profile_image_url ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      null,
    updated_at: new Date().toISOString()
  };
}

export async function ensureProfileRecord(user, overrides = {}) {
  if (!user?.id) return null;

  const existing = await fetchProfileByUserId(user.id);
  const payload = buildProfilePayload(user, overrides);

  const mergedPayload = {
    ...existing,
    ...payload
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(mergedPayload, { onConflict: "id" });

  if (error) {
    console.error("[profile-bootstrap] ensureProfileRecord error:", error);
    throw new Error(error.message || "Could not bootstrap profile.");
  }

  currentProfile = await fetchProfileByUserId(user.id);
  notifyProfileListeners();

  return currentProfile;
}

export async function loadCurrentProfile(force = false) {
  const user = getUser();

  if (!user?.id) {
    clearCurrentProfile();
    return null;
  }

  if (!force && currentProfile?.id === user.id) {
    return currentProfile;
  }

  const profile = await fetchProfileByUserId(user.id);
  currentProfile = profile;
  notifyProfileListeners();

  return currentProfile;
}

export async function bootstrapProfile(overrides = {}) {
  const user = getUser();

  if (!user?.id || !isAuthenticated()) {
    clearCurrentProfile();
    return null;
  }

  const profile = await ensureProfileRecord(user, overrides);
  currentProfile = profile;
  notifyProfileListeners();

  return profile;
}

export async function updateCurrentProfile(updates = {}) {
  const user = getUser();

  if (!user?.id) {
    throw new Error("No logged in user.");
  }

  const nextPayload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("profiles")
    .update(nextPayload)
    .eq("id", user.id);

  if (error) {
    console.error("[profile-bootstrap] updateCurrentProfile error:", error);
    throw new Error(error.message || "Could not update profile.");
  }

  currentProfile = await fetchProfileByUserId(user.id);
  notifyProfileListeners();

  return currentProfile;
}

export async function bootstrapProfileListener() {
  if (bootstrapped) return;
  bootstrapped = true;

  unsubscribeSession = onSessionChange(async ({ user }) => {
    try {
      if (!user?.id) {
        clearCurrentProfile();
        return;
      }

      await bootstrapProfile();
    } catch (error) {
      console.error("[profile-bootstrap] session listener error:", error);
    }
  });
}

export function destroyProfileBootstrap() {
  if (typeof unsubscribeSession === "function") {
    unsubscribeSession();
    unsubscribeSession = null;
  }

  bootstrapped = false;
  currentProfile = null;
  profileListeners.clear();
}

export async function initProfileBootstrap(overrides = {}) {
  await bootstrapProfileListener();

  if (isAuthenticated()) {
    await bootstrapProfile(overrides);
  } else {
    clearCurrentProfile();
  }

  return currentProfile;
}
