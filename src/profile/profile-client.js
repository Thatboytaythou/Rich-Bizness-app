import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULTS = {
  display_name: "thatboytay3d",
  username: "thatboytay3d",
  bio: "Rich Bizness creator building live experiences, music energy, gaming movement, sports culture, and visual storytelling into one powerful platform.",
  avatar_url: "/images/brand/rich-bizness-profile.jpg",
  banner_url: "/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png",
  creator_tier: "Growing",
  favorite_team: "",
  instagram_url: "",
  youtube_url: "",
  facebook_url: "",
  unitedmasters_url: ""
};

const state = {
  session: null,
  user: null,
  profile: null,
  stats: {
    followers: 0,
    following: 0,
    posts: 0,
    lives: 0,
    music: 0,
    gaming: 0
  }
};

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = el("profile-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const success = el("profile-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("profile-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const error = el("profile-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

function safeText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "";
}

function buildProfileUrl(username) {
  const base = window.location.origin;
  const clean = safeText(username, "profile");
  return `${base}/profile.html?u=${encodeURIComponent(clean)}`;
}

function getProfileData() {
  return {
    ...DEFAULTS,
    ...(state.profile || {})
  };
}

function applyHeroBackground(bannerUrl) {
  const hero = el("profile-hero");
  if (!hero) return;
  const url = safeText(bannerUrl, DEFAULTS.banner_url);
  hero.style.setProperty("--banner-image", `url('${url.replaceAll("'", "\\'")}')`);
}

function renderProfile() {
  const profile = getProfileData();

  const displayName = safeText(profile.display_name, DEFAULTS.display_name);
  const username = safeText(profile.username, DEFAULTS.username);
  const bio = safeText(profile.bio, DEFAULTS.bio);
  const avatar = safeText(profile.avatar_url, DEFAULTS.avatar_url);
  const banner = safeText(profile.banner_url, DEFAULTS.banner_url);
  const creatorTier = safeText(profile.creator_tier, DEFAULTS.creator_tier);
  const email = safeText(state.user?.email, "No email found");

  const avatarNodes = [
    el("profile-avatar"),
    el("topbar-profile-logo")
  ].filter(Boolean);

  avatarNodes.forEach((node) => {
    node.src = avatar || DEFAULTS.avatar_url;
  });

  applyHeroBackground(banner);

  if (el("profile-display-name")) el("profile-display-name").textContent = displayName;
  if (el("profile-handle")) el("profile-handle").textContent = `@${username}`;
  if (el("profile-bio")) el("profile-bio").textContent = bio;
  if (el("overview-bio-copy")) el("overview-bio-copy").textContent = bio;
  if (el("profile-tier-badge")) el("profile-tier-badge").textContent = creatorTier;
  if (el("profile-tier-preview")) el("profile-tier-preview").textContent = creatorTier;
  if (el("profile-email")) el("profile-email").textContent = email;
  if (el("profile-link-preview")) el("profile-link-preview").textContent = buildProfileUrl(username);

  populateEditForm(profile);
}

function populateEditForm(profile) {
  const data = { ...DEFAULTS, ...(profile || {}) };

  const map = {
    "edit-display-name": data.display_name,
    "edit-username": data.username,
    "edit-avatar-url": data.avatar_url,
    "edit-banner-url": data.banner_url,
    "edit-tier": data.creator_tier,
    "edit-favorite-team": data.favorite_team,
    "edit-bio": data.bio,
    "edit-instagram": data.instagram_url,
    "edit-youtube": data.youtube_url,
    "edit-facebook": data.facebook_url,
    "edit-unitedmasters": data.unitedmasters_url
  };

  Object.entries(map).forEach(([id, value]) => {
    const node = el(id);
    if (!node) return;
    node.value = safeText(value, "");
  });
}

function renderStats() {
  if (el("stat-followers")) el("stat-followers").textContent = String(state.stats.followers || 0);
  if (el("stat-following")) el("stat-following").textContent = String(state.stats.following || 0);
  if (el("stat-posts")) el("stat-posts").textContent = String(state.stats.posts || 0);
  if (el("stat-lives")) el("stat-lives").textContent = String(state.stats.lives || 0);
  if (el("stat-music")) el("stat-music").textContent = String(state.stats.music || 0);
  if (el("stat-gaming")) el("stat-gaming").textContent = String(state.stats.gaming || 0);
}

function renderActivity() {
  const list = el("profile-activity-list");
  if (!list) return;

  const profile = getProfileData();
  const rows = [
    {
      title: "Profile synced",
      copy: `Profile loaded for @${safeText(profile.username, DEFAULTS.username)}.`
    },
    {
      title: "Creator tier",
      copy: `Current creator tier: ${safeText(profile.creator_tier, DEFAULTS.creator_tier)}.`
    },
    {
      title: "Live identity ready",
      copy: "Profile can now route people into live, watch, feed, music, and gaming."
    }
  ];

  list.innerHTML = rows.map((item) => `
    <article class="list-item">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.copy)}</p>
    </article>
  `).join("");
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.dataset.panel === tabName;
    panel.classList.toggle("hidden", !active);
  });
}

async function loadSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  state.session = data.session || null;
  state.user = data.session?.user || null;
}

async function ensureProfileRow() {
  if (!state.user?.id) return null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    state.profile = existing;
    return existing;
  }

  const seed = {
    id: state.user.id,
    username: state.user.email?.split("@")[0] || DEFAULTS.username,
    display_name: state.user.email?.split("@")[0] || DEFAULTS.display_name,
    avatar_url: DEFAULTS.avatar_url,
    banner_url: DEFAULTS.banner_url,
    bio: DEFAULTS.bio,
    creator_tier: DEFAULTS.creator_tier,
    favorite_team: DEFAULTS.favorite_team,
    instagram_url: DEFAULTS.instagram_url,
    youtube_url: DEFAULTS.youtube_url,
    facebook_url: DEFAULTS.facebook_url,
    unitedmasters_url: DEFAULTS.unitedmasters_url
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(seed, { onConflict: "id" })
    .select()
    .single();

  if (insertError) throw insertError;

  state.profile = inserted;
  return inserted;
}

async function safeCount(tableName, queryBuilder) {
  try {
    const { count, error } = await queryBuilder();
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn(`[profile] count failed for ${tableName}:`, error);
    return 0;
  }
}

async function loadStats() {
  if (!state.user?.id) {
    state.stats = {
      followers: 0,
      following: 0,
      posts: 0,
      lives: 0,
      music: 0,
      gaming: 0
    };
    return;
  }

  const followers = await safeCount("followers", () =>
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", state.user.id)
  );

  const following = await safeCount("followers", () =>
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", state.user.id)
  );

  const posts = await safeCount("feed_posts", () =>
    supabase
      .from("feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", state.user.id)
  );

  const lives = await safeCount("live_streams", () =>
    supabase
      .from("live_streams")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", state.user.id)
  );

  const music = await safeCount("music", () =>
    supabase
      .from("music")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", state.user.id)
  );

  const topScore = await (async () => {
    try {
      const { data, error } = await supabase
        .from("game_scores")
        .select("score")
        .eq("user_id", state.user.id)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return Number(data?.score || 0);
    } catch (error) {
      console.warn("[profile] gaming score load failed:", error);
      return 0;
    }
  })();

  state.stats = {
    followers,
    following,
    posts,
    lives,
    music,
    gaming: topScore
  };
}

function collectFormPayload() {
  return {
    display_name: normalizeUrl(el("edit-display-name")?.value),
    username: normalizeUrl(el("edit-username")?.value).replace(/^@+/, "").toLowerCase(),
    avatar_url: normalizeUrl(el("edit-avatar-url")?.value),
    banner_url: normalizeUrl(el("edit-banner-url")?.value),
    creator_tier: normalizeUrl(el("edit-tier")?.value) || DEFAULTS.creator_tier,
    favorite_team: normalizeUrl(el("edit-favorite-team")?.value),
    bio: normalizeUrl(el("edit-bio")?.value),
    instagram_url: normalizeUrl(el("edit-instagram")?.value),
    youtube_url: normalizeUrl(el("edit-youtube")?.value),
    facebook_url: normalizeUrl(el("edit-facebook")?.value),
    unitedmasters_url: normalizeUrl(el("edit-unitedmasters")?.value)
  };
}

async function saveProfile(event) {
  event.preventDefault();
  clearMessages();

  if (!state.user?.id) {
    showError("You need to sign in before editing your profile.");
    return;
  }

  const payload = collectFormPayload();

  if (!payload.username) {
    showError("Username is required.");
    return;
  }

  if (!payload.display_name) {
    showError("Display name is required.");
    return;
  }

  const updatePayload = {
    id: state.user.id,
    ...payload
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(updatePayload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("[profile] save error:", error);
    showError(error.message || "Could not save profile.");
    return;
  }

  state.profile = data;
  renderProfile();
  renderActivity();
  switchTab("overview");
  showSuccess("Profile updated and synced.");
}

async function copyProfileLink() {
  try {
    const profile = getProfileData();
    const url = buildProfileUrl(profile.username);
    await navigator.clipboard.writeText(url);
    showSuccess("Profile link copied.");
  } catch (error) {
    console.error("[profile] copy link error:", error);
    showError("Could not copy profile link.");
  }
}

async function shareProfile() {
  const profile = getProfileData();
  const url = buildProfileUrl(profile.username);
  const title = `${profile.display_name} on Rich Bizness`;
  const text = `Check out ${profile.display_name} on Rich Bizness`;

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      showSuccess("Profile shared.");
      return;
    }
    await navigator.clipboard.writeText(url);
    showSuccess("Share not available here, so profile link was copied.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("[profile] share error:", error);
    showError("Could not share profile.");
  }
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab || "overview");
    });
  });
}

function bindActions() {
  el("edit-profile-btn")?.addEventListener("click", () => switchTab("edit"));
  el("quick-edit-profile-btn")?.addEventListener("click", () => switchTab("edit"));
  el("cancel-edit-btn")?.addEventListener("click", () => switchTab("overview"));
  el("copy-profile-link-btn")?.addEventListener("click", copyProfileLink);
  el("share-profile-btn")?.addEventListener("click", shareProfile);
  el("profile-edit-form")?.addEventListener("submit", saveProfile);
}

async function bootProfile() {
  try {
    clearMessages();
    bindTabs();
    bindActions();
    switchTab("overview");

    await loadSession();

    if (!state.user) {
      showError("You are not signed in. Sign in first so your profile can load and save correctly.");
      renderProfile();
      renderStats();
      renderActivity();
      return;
    }

    await ensureProfileRow();
    await loadStats();

    renderProfile();
    renderStats();
    renderActivity();

    showSuccess("Profile fully synced.");
  } catch (error) {
    console.error("[profile] boot error:", error);
    showError(error.message || "Failed to load profile.");
  }
}

document.addEventListener("DOMContentLoaded", bootProfile);
