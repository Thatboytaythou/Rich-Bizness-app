export const profileState = {
  viewer: null,
  profileUserId: null,
  profile: null,
  stats: {
    followers_count: 0,
    following_count: 0
  },
  postsCount: 0,
  livesCount: 0,
  latestLive: null,
  isFollowing: false,
  isOwnProfile: false,
  ui: {
    busy: false,
    error: '',
    success: ''
  }
};

export function setProfileState(patch = {}) {
  Object.assign(profileState, patch);
  window.__RB_PROFILE_STATE__ = profileState;
  return profileState;
}

export function setProfileUiState(patch = {}) {
  profileState.ui = {
    ...profileState.ui,
    ...patch
  };
  window.__RB_PROFILE_STATE__ = profileState;
  return profileState.ui;
}

export function resetProfileUiState() {
  profileState.ui = {
    busy: false,
    error: '',
    success: ''
  };
  window.__RB_PROFILE_STATE__ = profileState;
}

window.__RB_PROFILE_STATE__ = profileState;
