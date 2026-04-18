export const liveState = {
  stream: null,
  token: null,
  roomName: null,
  livekitUrl: null,
  participantIdentity: null,
  room: null,
  connected: false,
  isHost: false,
  viewerAccess: null,
  chatMessages: [],
  members: [],
  ui: {
    busy: false,
    error: '',
    success: ''
  }
};

export function setLiveState(patch = {}) {
  Object.assign(liveState, patch);
  window.__RB_LIVE_STATE__ = liveState;
  return liveState;
}

export function setUiState(patch = {}) {
  liveState.ui = {
    ...liveState.ui,
    ...patch
  };
  window.__RB_LIVE_STATE__ = liveState;
  return liveState.ui;
}

export function resetUiState() {
  liveState.ui = {
    busy: false,
    error: '',
    success: ''
  };
  window.__RB_LIVE_STATE__ = liveState;
}

window.__RB_LIVE_STATE__ = liveState;
