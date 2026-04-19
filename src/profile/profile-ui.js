function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatHandle(value) {
  const clean = String(value || "").replace(/^@+/, "").trim();
  return clean ? `@${clean}` : "@user";
}

function formatCount(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function initialsFromName(value = "") {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "RB";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export function showProfileError(message) {
  const node = el("profile-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function showProfileSuccess(message) {
  const node = el("profile-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

export function renderProfileIdentity(profile) {
  if (!profile) return;

  const displayName = safeText(profile.display_name, "Rich Bizness User");
  const username = profile.username || profile.handle || "user";
  const bio =
    safeText(
      profile.bio,
      "Rich Bizness creator building live experiences, music energy, gaming movement, sports culture, and visual storytelling into one powerful platform."
    );

  const displayNameEl = el("profile-display-name");
  const handleEl = el("profile-handle");
  const bioEl = el("profile-bio");
  const statusCopyEl = el("profile-status-copy");

  if (displayNameEl) displayNameEl.textContent = displayName;
  if (handleEl) handleEl.textContent = formatHandle(username);
  if (bioEl) bioEl.textContent = bio;
  if (statusCopyEl) {
    statusCopyEl.textContent =
      `${displayName} is active across live, profile, uploads, and creator growth systems.`;
  }

  renderProfileAvatar(profile);
}

export function renderProfileAvatar(profile) {
  const wrap = el("profile-avatar-wrap");
  const avatar = el("profile-avatar");
  if (!wrap || !avatar) return;

  const avatarUrl =
    profile.avatar_url ||
    profile.profile_image_url ||
    "";

  if (avatarUrl) {
    avatar.style.display = "block";
    avatar.src = avatarUrl;
    wrap.innerHTML = "";
    wrap.appendChild(avatar);
    return;
  }

  wrap.innerHTML = initialsFromName(
    profile.display_name || profile.username || "RB"
  );
}

export function renderProfileStats(stats = {}) {
  const followersEl = el("profile-followers-count");
  const followingEl = el("profile-following-count");
  const postsEl = el("profile-posts-count");
  const livesEl = el("profile-lives-count");
  const tierEl = el("profile-tier-label");

  if (followersEl) followersEl.textContent = formatCount(stats.followers);
  if (followingEl) followingEl.textContent = formatCount(stats.following);
  if (postsEl) postsEl.textContent = formatCount(stats.posts);
  if (livesEl) livesEl.textContent = formatCount(stats.lives);
  if (tierEl) tierEl.textContent = safeText(stats.tier, "Building");
}

export function renderFollowButton({
  isOwnProfile = false,
  isFollowing = false
} = {}) {
  const button = el("follow-profile-btn");
  if (!button) return;

  if (isOwnProfile) {
    button.textContent = "Your Profile";
    button.disabled = true;
    button.className = "btn-ghost";
    return;
  }

  button.disabled = false;

  if (isFollowing) {
    button.textContent = "Following";
    button.className = "btn-ghost";
  } else {
    button.textContent = "Follow";
    button.className = "btn";
  }
}

export function renderLatestLiveCard(live) {
  const titleEl = el("profile-live-title");
  const descEl = el("profile-live-description");

  if (!titleEl || !descEl) return;

  if (!live) {
    titleEl.textContent = "No active live";
    descEl.textContent =
      "This creator has not started a live stream yet. Once a stream begins, it will show here.";
    return;
  }

  titleEl.textContent = safeText(live.title, "Live Stream");
  descEl.textContent =
    safeText(
      live.description,
      live.is_live
        ? "This creator is live right now."
        : "Latest stream ready for replay or next session."
    );
}

export function renderEditProfileForm(profile) {
  if (!profile) return;

  const displayNameInput = el("edit-display-name");
  const usernameInput = el("edit-username");
  const bioInput = el("edit-bio");
  const avatarUrlInput = el("edit-avatar-url");

  if (displayNameInput) displayNameInput.value = profile.display_name || "";
  if (usernameInput) usernameInput.value = profile.username || "";
  if (bioInput) bioInput.value = profile.bio || "";
  if (avatarUrlInput) avatarUrlInput.value = profile.avatar_url || "";
}

export function openEditProfilePanel() {
  const panel = el("edit-profile-panel");
  if (panel) panel.style.display = "block";
}

export function closeEditProfilePanel() {
  const panel = el("edit-profile-panel");
  if (panel) panel.style.display = "none";
}

export function setSaveProfileButtonBusy(isBusy) {
  const button = el("save-profile-btn");
  if (!button) return;

  button.disabled = !!isBusy;
  button.textContent = isBusy ? "Saving..." : "Save Profile";
}

export function getEditProfileValues() {
  return {
    display_name: el("edit-display-name")?.value?.trim() || "",
    username: el("edit-username")?.value?.trim() || "",
    bio: el("edit-bio")?.value?.trim() || "",
    avatar_url: el("edit-avatar-url")?.value?.trim() || ""
  };
}

export function deriveCreatorTier(stats = {}) {
  const followers = Number(stats.followers || 0);
  const lives = Number(stats.lives || 0);

  if (followers >= 10000 || lives >= 50) return "Elite";
  if (followers >= 2500 || lives >= 20) return "Rising";
  if (followers >= 500 || lives >= 8) return "Growing";
  return "Building";
}
