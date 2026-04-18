import { getSessionUser } from '../shared/supabase.js';

async function request(path, options = {}) {
  const user = await getSessionUser().catch(() => null);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (user?.id) {
    headers['x-user-id'] = user.id;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

export async function createLiveStream(payload) {
  return request('/api/live-stream-create', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateLiveStream(payload) {
  return request('/api/live-stream-update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function endLiveStream(payload) {
  return request('/api/live-stream-end', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function checkLiveStreamAccess({ stream_id, slug }) {
  return request('/api/live-stream-access', {
    method: 'POST',
    body: JSON.stringify({ stream_id, slug })
  });
}

export async function createLivekitToken(payload) {
  return request('/api/livekit-token', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function purchaseLiveAccess(payload) {
  return request('/api/live-stream-purchase', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function sendLiveChatMessage(payload) {
  return request('/api/live-chat-send', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function banLiveViewer(payload) {
  return request('/api/live-moderation-ban', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchLiveRail() {
  const res = await fetch('/api/live-rail');
  if (!res.ok) throw new Error('Failed to load live rail');
  return res.json();
}
