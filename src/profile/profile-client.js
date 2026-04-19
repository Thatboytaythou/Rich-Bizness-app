import {
  getFullProfileBundle,
  upsertProfile,
  followProfile,
  unfollowProfile
} from "./profile-api.js";
import {
  getState,
  setLoading,
  setError,
  clearError,
  setCurrentUser,
  setProfileId,
  setProfile,
  setStats,
  setLatestLive,
  setIsOwnProfile,
  setIsFollowing,
  incrementFollowers,
  decrementFollowers
} from "./profile-state.js";
import {
  showProfileError,
  showProfileSuccess,
  renderProfileIdentity,
  renderProfileStats,
  renderFollowButton,
  renderLatestLiveCard,
  renderEditProfileForm,
  openEditProfilePanel,
  closeEditProfilePanel,
  setSaveProfileButtonBusy,
  getEditProfileValues,
  deriveCreatorTier
} from "./profile-ui.js";

function el(id) {
  return document.getElementById(id);
}

function resetMessages() {
  showProfileError("");
  showProfileSuccess("");
  clearError();
}

async function bootProfilePage() {
  try {
    resetMessages();
    setLoading(true);

    const bundle = await getFullProfileBundle();

    setCurrentUser(bundle.currentUser);
    setProfileId(bundle.profileId);
    setProfile(bundle.profile);
    setLatestLive(bundle.latestLive);
    setIsOwnProfile(bundle.isOwnProfile);
    setIsFollowing(bundle.isFollowing);

    const tier = deriveCreatorTier(bundle.stats);
    setStats({
      ...bundle.stats,
      tier
    });

    renderEverything();
    bindEvents();
  } catch (error) {
    console.error("[profile-client] bootProfilePage error:", error);
    const message = error.message || "Failed to load profile.";
    setError(message);
    showProfileError(message);
  } finally {
    setLoading(false);
  }
}

function renderEverything() {
  const state = getState();

  if (state.profile) {
    renderProfileIdentity(state.profile);
    renderEditProfileForm(state.profile);
  }

  renderProfileStats(state.stats);
  renderFollowButton({
    isOwnProfile: state.isOwnProfile,
    isFollowing: state.isFollowing
  });
  renderLatestLiveCard(state.latestLive);
}

function bindEvents() {
  bindFollowButton();
  bindEditProfileToggle();
  bindEditProfileForm();
}

function bindFollowButton() {
  const button = el("follow-profile-btn");
  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";

  button.addEventListener("click", async () => {
    const state = getState();

    if (state.isOwnProfile) return;

    if (!state.currentUser?.id) {
      showProfileError("Log in first to follow profiles.");
      return;
    }

    try {
      resetMessages();
      button.disabled = true;

      if (state.isFollowing) {
        await unfollowProfile({
          followerId: state.currentUser.id,
          followingId: state.profileId
        });

        setIsFollowing(false);
        decrementFollowers();
        renderFollowButton({
          isOwnProfile: false,
          isFollowing: false
        });
        renderProfileStats(getState().stats);
        showProfileSuccess("Unfollowed.");
      } else {
        await followProfile({
          followerId: state.currentUser.id,
          followingId: state.profileId
        });

        setIsFollowing(true);
        incrementFollowers();
        renderFollowButton({
          isOwnProfile: false,
          isFollowing: true
        });
        renderProfileStats(getState().stats);
        showProfileSuccess("Followed.");
      }
    } catch (error) {
      console.error("[profile-client] follow toggle error:", error);
      showProfileError(error.message || "Could not update follow state.");
    } finally {
      button.disabled = false;
    }
  });
}

function bindEditProfileToggle() {
  const openBtn = el("edit-profile-toggle-btn");
  const cancelBtn = el("cancel-edit-profile-btn");

  if (openBtn && openBtn.dataset.bound !== "true") {
    openBtn.dataset.bound = "true";
    openBtn.addEventListener("click", () => {
      const state = getState();
      if (!state.isOwnProfile) return;
      openEditProfilePanel();
    });
  }

  if (cancelBtn && cancelBtn.dataset.bound !== "true") {
    cancelBtn.dataset.bound = "true";
    cancelBtn.addEventListener("click", () => {
      closeEditProfilePanel();
      const state = getState();
      if (state.profile) {
        renderEditProfileForm(state.profile);
      }
      resetMessages();
    });
  }
}

function bindEditProfileForm() {
  const form = el("edit-profile-form");
  if (!form || form.dataset.bound === "true") return;

  form.dataset.bound = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const state = getState();

    if (!state.currentUser?.id || !state.isOwnProfile) {
      showProfileError("You can only edit your own profile.");
      return;
    }

    try {
      resetMessages();
      setSaveProfileButtonBusy(true);

      const values = getEditProfileValues();

      const updatedProfile = await upsertProfile({
        id: state.currentUser.id,
        display_name: values.display_name,
        username: values.username,
        handle: values.username,
        bio: values.bio,
        avatar_url: values.avatar_url,
        updated_at: new Date().toISOString()
      });

      setProfile(updatedProfile);
      renderProfileIdentity(updatedProfile);
      renderEditProfileForm(updatedProfile);
      closeEditProfilePanel();
      showProfileSuccess("Profile updated.");
    } catch (error) {
      console.error("[profile-client] save profile error:", error);
      showProfileError(error.message || "Could not save profile.");
    } finally {
      setSaveProfileButtonBusy(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", bootProfilePage);
