export const liveState = {
  session: {
    user: null,
    ready: false
  },

  studio: {
    stream: null,
    isCreating: false,
    isEnding: false,
    error: "",
    success: ""
  },

  watch: {
    stream: null,
    isJoining: false,
    joined: false,
    error: "",
    success: ""
  },

  liveRail: {
    streams: [],
    loading: false,
    error: ""
  },

  chat: {
    messages: [],
    sending: false,
    error: ""
  },

  presence: {
    viewers: 0,
    members: []
  }
};

export function setSessionState(patch = {}) {
  liveState.session = {
    ...liveState.session,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.session;
}

export function setStudioState(patch = {}) {
  liveState.studio = {
    ...liveState.studio,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.studio;
}

export function setWatchState(patch = {}) {
  liveState.watch = {
    ...liveState.watch,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.watch;
}

export function setLiveRailState(patch = {}) {
  liveState.liveRail = {
    ...liveState.liveRail,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.liveRail;
}

export function setChatState(patch = {}) {
  liveState.chat = {
    ...liveState.chat,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.chat;
}

export function setPresenceState(patch = {}) {
  liveState.presence = {
    ...liveState.presence,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.presence;
}

export function resetStudioState() {
  liveState.studio = {
    stream: null,
    isCreating: false,
    isEnding: false,
    error: "",
    success: ""
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.studio;
}

export function resetWatchState() {
  liveState.watch = {
    stream: null,
    isJoining: false,
    joined: false,
    error: "",
    success: ""
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.watch;
}

export function resetChatState() {
  liveState.chat = {
    messages: [],
    sending: false,
    error: ""
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.chat;
}

export function resetPresenceState() {
  liveState.presence = {
    viewers: 0,
    members: []
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.presence;
}

window.__RB_LIVE_STATE__ = liveState;
