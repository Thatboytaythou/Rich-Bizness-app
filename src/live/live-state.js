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

export function setSessionState(patch = {}) {
  liveState.session = {
    ...liveState.session,
    ...patch
  };
}

export function setStudioState(patch = {}) {
  liveState.studio = {
    ...liveState.studio,
    ...patch
  };
}

export function setWatchState(patch = {}) {
  liveState.watch = {
    ...liveState.watch,
    ...patch
  };
}

export function setChatState(patch = {}) {
  liveState.chat = {
    ...liveState.chat,
    ...patch
  };
}

export function setPresenceState(patch = {}) {
  liveState.presence = {
    ...liveState.presence,
    ...patch
  };
}

export function setLiveRailState(patch = {}) {
  liveState.liveRail = {
    ...liveState.liveRail,
    ...patch
  };
}

export function resetStudioState() {
  liveState.studio = {
    stream: null,
    isCreating: false,
    isEnding: false,
    error: "",
    success: ""
  };
}

export function resetWatchState() {
  liveState.watch = {
    stream: null,
    joined: false,
    isJoining: false,
    error: "",
    success: ""
  };
}

export function resetChatState() {
  liveState.chat = {
    messages: [],
    sending: false,
    error: ""
  };
}

export function resetPresenceState() {
  liveState.presence = {
    viewers: 0,
    members: []
  };
}
