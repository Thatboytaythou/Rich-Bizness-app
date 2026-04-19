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
    joined: false,
    isJoining: false,
    error: "",
    success: ""
  },

  chat: {
    messages: [],
    sending: false,
    error: ""
  },

  presence: {
    viewers: 0,
    members: []
  },

  liveRail: {
    streams: [],
    loading: false,
    error: ""
  }
};

function mergeSection(sectionName, patch = {}) {
  liveState[sectionName] = {
    ...liveState[sectionName],
    ...patch
  };

  return liveState[sectionName];
}

export function setSessionState(patch = {}) {
  return mergeSection("session", patch);
}

export function setStudioState(patch = {}) {
  return mergeSection("studio", patch);
}

export function setWatchState(patch = {}) {
  return mergeSection("watch", patch);
}

export function setChatState(patch = {}) {
  return mergeSection("chat", patch);
}

export function setPresenceState(patch = {}) {
  return mergeSection("presence", patch);
}

export function setLiveRailState(patch = {}) {
  return mergeSection("liveRail", patch);
}

export function resetStudioState() {
  liveState.studio = {
    stream: null,
    isCreating: false,
    isEnding: false,
    error: "",
    success: ""
  };

  return liveState.studio;
}

export function resetWatchState() {
  liveState.watch = {
    stream: null,
    joined: false,
    isJoining: false,
    error: "",
    success: ""
  };

  return liveState.watch;
}

export function resetChatState() {
  liveState.chat = {
    messages: [],
    sending: false,
    error: ""
  };

  return liveState.chat;
}

export function resetPresenceState() {
  liveState.presence = {
    viewers: 0,
    members: []
  };

  return liveState.presence;
}

export function resetLiveRailState() {
  liveState.liveRail = {
    streams: [],
    loading: false,
    error: ""
  };

  return liveState.liveRail;
}

export function resetAllLiveState() {
  liveState.session = {
    user: null,
    ready: false
  };

  resetStudioState();
  resetWatchState();
  resetChatState();
  resetPresenceState();
  resetLiveRailState();

  return liveState;
}
