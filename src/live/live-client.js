import { Room, RoomEvent } from 'livekit-client';
import { getSessionUser } from '../shared/supabase.js';
import {
  createLiveStream,
  createLivekitToken,
  endLiveStream
} from './live-api.js';
import { liveState, setLiveState, setUiState, resetUiState } from './live-state.js';
import {
  getValue,
  setText,
  showError,
  showSuccess,
  renderStatusBadge,
  updateShareUrl,
  copyShareUrl,
  setDisabled,
  updateViewerCount
} from './live-ui.js';

function qs(id) {
  return document.getElementById(id);
}

async function createAndStartStream() {
  resetUiState();
  showError('');
  showSuccess('');

  try {
    setUiState({ busy: true });
    setDisabled('start-live-btn', true);

    const payload = {
      title: getValue('live-title'),
      description: getValue('live-description'),
      category: getValue('live-category') || 'general',
      access_type: getValue('live-access-type') || 'free',
      price_cents: Number(getValue('live-price-cents') || 0),
      thumbnail_url: getValue('live-thumbnail-url') || null,
      cover_url: getValue('live-cover-url') || null,
      is_chat_enabled: true,
      is_replay_enabled: false,
      start_now: true
    };

    const createRes = await createLiveStream(payload);

    setLiveState({
      stream: createRes.stream,
      isHost: true
    });

    updateShareUrl(createRes.share_url);
    renderStatusBadge('LIVE', 'live');
    setText('live-room-name', createRes.livekit_room_name);
    showSuccess('Live stream created.');

    await connectHostToRoom();
  } catch (error) {
    showError(error.message || 'Failed to start live stream');
  } finally {
    setUiState({ busy: false });
    setDisabled('start-live-btn', false);
  }
}

async function connectHostToRoom() {
  try {
    const user = await getSessionUser();

    if (!liveState.stream?.id) {
      throw new Error('No active stream found');
    }

    const tokenRes = await createLivekitToken({
      stream_id: liveState.stream.id,
      role: 'host',
      display_name: user?.email || 'Host'
    });

    const room = new Room();

    bindRoomEvents(room);

    await room.connect(tokenRes.livekit_url, tokenRes.token);

    setLiveState({
      room,
      token: tokenRes.token,
      roomName: tokenRes.room_name,
      livekitUrl: tokenRes.livekit_url,
      participantIdentity: tokenRes.participant_identity,
      connected: true
    });

    const tracks = await Room.createLocalTracks({
      audio: true,
      video: true
    });

    const localParticipant = room.localParticipant;

    for (const track of tracks) {
      await localParticipant.publishTrack(track);
    }

    attachLocalVideo(room);
    showSuccess('You are live now.');
  } catch (error) {
    showError(error.message || 'Failed to connect host to room');
  }
}

function bindRoomEvents(room) {
  room.on(RoomEvent.ParticipantConnected, () => {
    updateViewerCount((liveState.stream?.viewer_count || 0) + 1);
  });

  room.on(RoomEvent.ParticipantDisconnected, () => {
    updateViewerCount(Math.max(0, (liveState.stream?.viewer_count || 1) - 1));
  });

  room.on(RoomEvent.Disconnected, () => {
    setLiveState({ connected: false });
  });

  room.on(RoomEvent.TrackSubscribed, (track) => {
    const mediaEl = track.attach();
    const container = qs('live-remote-media');
    if (container) container.appendChild(mediaEl);
  });
}

function attachLocalVideo(room) {
  const container = qs('live-local-media');
  if (!container) return;

  container.innerHTML = '';

  room.localParticipant.videoTrackPublications.forEach((publication) => {
    if (!publication.track) return;
    const mediaEl = publication.track.attach();
    mediaEl.muted = true;
    container.appendChild(mediaEl);
  });
}

async function endCurrentStream() {
  try {
    showError('');
    showSuccess('');

    if (!liveState.stream?.id) {
      throw new Error('No live stream to end');
    }

    await endLiveStream({ stream_id: liveState.stream.id });

    if (liveState.room) {
      await liveState.room.disconnect();
    }

    setLiveState({
      connected: false,
      room: null
    });

    renderStatusBadge('ENDED', 'ended');
    showSuccess('Live stream ended.');
  } catch (error) {
    showError(error.message || 'Failed to end stream');
  }
}

async function toggleMic() {
  try {
    if (!liveState.room) return;
    const enabled = liveState.room.localParticipant.isMicrophoneEnabled;
    await liveState.room.localParticipant.setMicrophoneEnabled(!enabled);
    showSuccess(enabled ? 'Mic muted.' : 'Mic unmuted.');
  } catch (error) {
    showError(error.message || 'Failed to toggle mic');
  }
}

async function toggleCamera() {
  try {
    if (!liveState.room) return;
    const enabled = liveState.room.localParticipant.isCameraEnabled;
    await liveState.room.localParticipant.setCameraEnabled(!enabled);
    showSuccess(enabled ? 'Camera off.' : 'Camera on.');
  } catch (error) {
    showError(error.message || 'Failed to toggle camera');
  }
}

function bindUi() {
  qs('start-live-btn')?.addEventListener('click', createAndStartStream);
  qs('end-live-btn')?.addEventListener('click', endCurrentStream);
  qs('toggle-mic-btn')?.addEventListener('click', toggleMic);
  qs('toggle-camera-btn')?.addEventListener('click', toggleCamera);

  qs('copy-share-btn')?.addEventListener('click', async () => {
    try {
      const ok = await copyShareUrl();
      showSuccess(ok ? 'Share link copied.' : 'No share link yet.');
    } catch (error) {
      showError(error.message || 'Failed to copy share link');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindUi();
  renderStatusBadge('OFFLINE', 'default');
});
