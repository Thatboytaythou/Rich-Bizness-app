const state = {
  loading: false,
  error: null,

  currentUser: null,
  profileId: null,
  profile: null,

  stats: {
    followers: 0,
    following: 0,
    posts: 0,
    lives: 0,
    tier: "Building"
  },

  latestLive: null,

  isOwnProfile: false,
  isFollowing: false
};

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(getState());
    } catch (err) {
      console.error("[profile-state] listener error:", err);
    }
  });
}

export function getState() {
  return { ...state };
}

export function subscribe(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLoading(value) {
  state.loading = !!value;
  notify();
}

export function setError(message) {
  state.error = message || null;
  notify();
}

export function clearError() {
  state.error = null;
  notify();
}

export function setCurrentUser(user) {
  state.currentUser = user || null;
  notify();
}

export function setProfileId(id) {
  state.profileId = id || null;
  notify();
}

export function setProfile(profile) {
  state.profile = profile || null;
  notify();
}

export function setStats(stats = {}) {
  state.stats = {
    followers: Number(stats.followers || 0),
    following: Number(stats.following || 0),
    posts: Number(stats.posts || 0),
    lives: Number(stats.lives || 0),
    tier: stats.tier || state.stats.tier || "Building"
  };
  notify();
}

export function setLatestLive(live) {
  state.latestLive = live || null;
  notify();
}

export function setIsOwnProfile(value) {
  state.isOwnProfile = !!value;
  notify();
}

export function setIsFollowing(value) {
  state.isFollowing = !!value;
  notify();
}

export function updateProfileField(key, value) {
  if (!state.profile) return;

  state.profile = {
    ...state.profile,
    [key]: value
  };

  notify();
}

export function incrementFollowers() {
  state.stats.followers = Number(state.stats.followers || 0) + 1;
  notify();
}

export function decrementFollowers() {
  state.stats.followers = Math.max(
    0,
    Number(state.stats.followers || 0) - 1
  );
  notify();
}

export function resetProfileState() {
  state.loading = false;
  state.error = null;

  state.currentUser = null;
  state.profileId = null;
  state.profile = null;

  state.stats = {
    followers: 0,
    following: 0,
    posts: 0,
    lives: 0,
    tier: "Building"
  };

  state.latestLive = null;
  state.isOwnProfile = false;
  state.isFollowing = false;

  notify();
}
