import {
  fetchProfileBundle,
  followProfile,
  unfollowProfile,
  fetchFollowerStats
} from './profile-api.js';
import {
  profileState,
  setProfileState,
  setProfileUiState,
  resetProfileUiState
} from './profile-state.js';
import {
  renderProfile,
  renderStats,
  renderFollowButton,
  renderLatestLive,
  showProfileError,
  showProfileSuccess
} from './profile-ui.js';

async function bootProfilePage() {
  try {
    resetProfileUiState();
    showProfileError('');
    showProfileSuccess('');

    const bundle = await fetchProfileBundle();

    const isOwnProfile =
      !!bundle.viewer?.id &&
      !!bundle.profileUserId &&
      bundle.viewer.id === bundle.profileUserId;

    setProfileState({
      viewer: bundle.viewer,
      profileUserId: bundle.profileUserId,
      profile: bundle.profile,
      stats: bundle.stats,
      postsCount: bundle.postsCount,
      livesCount: bundle.livesCount,
      latestLive: bundle.latestLive,
      isFollowing: bundle.isFollowing,
      isOwnProfile
    });

    renderAll();
    bindFollowButton();
  } catch (error) {
    showProfileError(error.message || 'Failed to load profile');
  }
}

function renderAll() {
  renderProfile(profileState.profile);

  renderStats({
    followersCount: profileState.stats.followers_count,
    followingCount: profileState.stats.following_count,
    postsCount: profileState.postsCount,
    livesCount: profileState.livesCount,
    tierLabel: deriveTierLabel(profileState)
  });

  renderFollowButton({
    isOwnProfile: profileState.isOwnProfile,
    isFollowing: profileState.isFollowing,
    loggedIn: !!profileState.viewer?.id
  });

  renderLatestLive(profileState.latestLive);
}

function deriveTierLabel(state) {
  const followers = Number(state.stats?.followers_count || 0);
  const lives = Number(state.livesCount || 0);

  if (followers >= 10000 || lives >= 50) return 'VIP Ready';
  if (followers >= 1000 || lives >= 15) return 'Rising Star';
  if (followers >= 100 || lives >= 5) return 'Growing';
  return 'Building';
}

function bindFollowButton() {
  const button = document.getElementById('follow-profile-btn');
  if (!button) return;

  button.onclick = async () => {
    try {
      showProfileError('');
      showProfileSuccess('');

      if (profileState.isOwnProfile) return;

      if (!profileState.viewer?.id) {
        throw new Error('Please log in first to follow creators');
      }

      setProfileUiState({ busy: true });
      button.disabled = true;

      if (profileState.isFollowing) {
        await unfollowProfile({
          viewerId: profileState.viewer.id,
          profileUserId: profileState.profileUserId
        });

        setProfileState({ isFollowing: false });
        showProfileSuccess('Unfollowed profile.');
      } else {
        await followProfile({
          viewerId: profileState.viewer.id,
          profileUserId: profileState.profileUserId
        });

        setProfileState({ isFollowing: true });
        showProfileSuccess('Now following profile.');
      }

      const stats = await fetchFollowerStats(profileState.profileUserId);
      setProfileState({ stats });

      renderAll();
    } catch (error) {
      showProfileError(error.message || 'Failed to update follow state');
    } finally {
      setProfileUiState({ busy: false });
      button.disabled = false;
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  bootProfilePage();
});
