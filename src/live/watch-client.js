import { Room, RoomEvent } from 'livekit-client';
import { getSessionUser, supabase } from '../shared/supabase.js';
import {
  checkLiveStreamAccess,
  createLivekitToken,
  purchaseLiveAccess,
  sendLiveChatMessage
} from './live-api.js';
import { liveState, setLiveState } from './live-state.js';
import {
  getValue,
  setText,
  showError,
  showSuccess,
  renderAccessState,
  renderStatusBadge,
  appendChatMessage
} from './live-ui.js';

function qs(id) {
  return document.getElementById(id);
}

function getSlugFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('slug');
}

async function bootWatchPage() {
  try {
    showError('');
    showSuccess('');

    const slug = getSlugFromUrl();

    if (!slug) {
      throw new Error('Missing stream slug');
    }

    const access = await checkLiveStreamAccess({ slug });

    setLiveState({
      viewerAccess: access,
      stream: access.stream || null
    });

    hydrateWatchMeta(access.stream);
    renderAccessState(access);

    if (!access.allowed) return;

    await connectViewer(access.stream);
    await subscribeToChat(access.stream.id);
  } catch (error) {
    showError(error.message || 'Failed to load watch page');
  }
}

function hydrateWatchMeta(stream) {
  if (!stream) return;

  setText('watch-stream-title', stream.title || 'Live Stream');
  setText('watch-stream-category', stream.category || 'general');
  setText('watch-stream-access', stream.access_type || 'free');
  setText('watch-stream-description', stream.description || '');
  setText('live-viewer-count', String(stream.viewer_count || 0));

  renderStatusBadge(stream.status === 'live' ? 'LIVE' : String(stream.status || '').toUpperCase(), 'live');
}

async function connectViewer(stream) {
  const user = await getSessionUser().catch(() => null);

  const tokenRes = await createLivekitToken({
    stream_id: stream.id,
    role: 'viewer',
    display_name: user?.email || 'Guest Viewer'
  });

  const room = new Room();
  bindViewerRoomEvents(room);

  await room.connect(tokenRes.livekit_url, tokenRes.token);

  setLiveState({
    room,
    token: tokenRes.token,
    roomName: tokenRes.room_name,
    livekitUrl: tokenRes.livekit_url,
    participantIdentity: tokenRes.participant_identity,
    connected: true
  });
}

function bindViewerRoomEvents(room) {
  room.on(RoomEvent.TrackSubscribed, (track) => {
    const mediaEl = track.attach();
    const container = qs('watch-remote-media');

    if (!container) return;

    if (track.kind === 'video') {
      container.innerHTML = '';
    }

    container.appendChild(mediaEl);
  });

  room.on(RoomEvent.Disconnected, () => {
    setLiveState({ connected: false, room: null });
  });
}

async function subscribeToChat(streamId) {
  const { data: history, error } = await supabase
    .from('live_chat_messages')
    .select('*')
    .eq('stream_id', streamId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!error && Array.isArray(history)) {
    history.forEach((item) => appendChatMessage(item));
  }

  supabase
    .channel(`live-chat-${streamId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`
      },
      (payload) => {
        appendChatMessage(payload.new);
      }
    )
    .subscribe();
}

async function handleUnlock() {
  try {
    if (!liveState.stream?.id) {
      throw new Error('No stream selected');
    }

    const res = await purchaseLiveAccess({
      stream_id: liveState.stream.id
    });

    if (res?.url) {
      window.location.href = res.url;
      return;
    }

    if (res?.checkout_url) {
      window.location.href = res.checkout_url;
      return;
    }

    throw new Error('No checkout URL returned');
  } catch (error) {
    showError(error.message || 'Failed to start purchase');
  }
}

async function handleSendChat() {
  try {
    const message = getValue('watch-chat-input').trim();

    if (!message) return;
    if (!liveState.stream?.id) throw new Error('No stream selected');

    await sendLiveChatMessage({
      stream_id: liveState.stream.id,
      message
    });

    qs('watch-chat-input').value = '';
  } catch (error) {
    showError(error.message || 'Failed to send message');
  }
}

function bindUi() {
  qs('watch-unlock-btn')?.addEventListener('click', handleUnlock);
  qs('watch-chat-send-btn')?.addEventListener('click', handleSendChat);

  qs('watch-chat-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSendChat();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindUi();
  bootWatchPage();
});
