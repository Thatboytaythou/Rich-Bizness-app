import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// DOM
const displayNameEl = document.getElementById("profile-display-name");
const handleEl = document.getElementById("profile-handle");
const bioEl = document.getElementById("profile-bio");
const avatarEl = document.getElementById("profile-avatar");

const followersEl = document.getElementById("profile-followers-count");
const followingEl = document.getElementById("profile-following-count");
const postsEl = document.getElementById("profile-posts-count");
const livesEl = document.getElementById("profile-lives-count");

const followBtn = document.getElementById("follow-profile-btn");

const editPanel = document.getElementById("edit-profile-panel");
const editForm = document.getElementById("edit-profile-form");

const editName = document.getElementById("edit-display-name");
const editUsername = document.getElementById("edit-username");
const editBio = document.getElementById("edit-bio");
const editAvatar = document.getElementById("edit-avatar-url");

const errorBox = document.getElementById("profile-error");
const successBox = document.getElementById("profile-success");

let currentUser = null;
let profileUserId = null;
let isOwnProfile = false;

// helpers
function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = "block";
  successBox.style.display = "none";
}

function showSuccess(msg) {
  if (!successBox) return;
  successBox.textContent = msg;
  successBox.style.display = "block";
  errorBox.style.display = "none";
}

// get profile id from URL
function getProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// load session
async function loadSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
}

// load profile
async function loadProfile() {
  profileUserId = getProfileId() || currentUser?.id;

  if (!profileUserId) {
    showError("No profile found.");
    return;
  }

  isOwnProfile = currentUser?.id === profileUserId;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileUserId)
    .single();

  if (error || !data) {
    showError("Profile not found.");
    return;
  }

  renderProfile(data);
  loadStats();
  setupEdit(data);
}

// render
function renderProfile(p) {
  displayNameEl.textContent = p.display_name || "Rich Bizness User";
  handleEl.textContent = "@" + (p.username || "user");
  bioEl.textContent = p.bio || "No bio yet.";

  if (p.avatar_url) {
    avatarEl.src = p.avatar_url;
  }

  if (isOwnProfile) {
    followBtn.style.display = "none";
  }
}

// stats
async function loadStats() {
  // followers
  const { count: followers } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileUserId);

  // following
  const { count: following } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profileUserId);

  // lives
  const { count: lives } = await supabase
    .from("live_streams")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", profileUserId);

  followersEl.textContent = followers || 0;
  followingEl.textContent = following || 0;
  livesEl.textContent = lives || 0;
  postsEl.textContent = 0;
}

// follow system
followBtn?.addEventListener("click", async () => {
  if (!currentUser) {
    showError("Login first.");
    return;
  }

  const { error } = await supabase.from("followers").insert({
    follower_id: currentUser.id,
    following_id: profileUserId,
  });

  if (error) {
    showError("Already following or error.");
  } else {
    showSuccess("Followed.");
    loadStats();
  }
});

// edit setup
function setupEdit(p) {
  if (!isOwnProfile) return;

  editPanel.style.display = "none";

  editName.value = p.display_name || "";
  editUsername.value = p.username || "";
  editBio.value = p.bio || "";
  editAvatar.value = p.avatar_url || "";
}

// save edit
editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  const updates = {
    id: currentUser.id,
    display_name: editName.value,
    username: editUsername.value,
    bio: editBio.value,
    avatar_url: editAvatar.value,
    updated_at: new Date(),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(updates);

  if (error) {
    showError("Update failed.");
  } else {
    showSuccess("Profile updated.");
    loadProfile();
  }
});

// init
(async () => {
  await loadSession();
  await loadProfile();
})();
