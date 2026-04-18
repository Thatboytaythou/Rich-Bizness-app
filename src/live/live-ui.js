function el(id) {
  return document.getElementById(id);
}

export function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value ?? '';
}

export function setHTML(id, value) {
  const node = el(id);
  if (node) node.innerHTML = value ?? '';
}

export function show(id, display = 'block') {
  const node = el(id);
  if (node) node.style.display = display;
}

export function hide(id) {
  const node = el(id);
  if (node) node.style.display = 'none';
}

export function setDisabled(id, disabled = true) {
  const node = el(id);
  if (node) node.disabled = !!disabled;
}

export function setValue(id, value) {
  const node = el(id);
  if (node) node.value = value ?? '';
}

export function getValue(id) {
  return el(id)?.value ?? '';
}

export function appendChatMessage(message) {
  const wrap = el('live-chat-messages');
  if (!wrap) return;

  const item = document.createElement('div');
  item.className = 'live-chat-message';

  const author = message?.profile_name || message?.display_name || 'User';
  const text = message?.message || '';

  item.innerHTML = `
    <div class="live-chat-message__author">${escapeHtml(author)}</div>
    <div class="live-chat-message__body">${escapeHtml(text)}</div>
  `;

  wrap.appendChild(item);
  wrap.scrollTop = wrap.scrollHeight;
}

export function renderChatMessages(messages = []) {
  const wrap = el('live-chat-messages');
  if (!wrap) return;

  wrap.innerHTML = '';

  messages.forEach((message) => appendChatMessage(message));
}

export function renderStatusBadge(label, tone = 'default') {
  const target = el('live-status-badge');
  if (!target) return;

  target.textContent = label;
  target.setAttribute('data-tone', tone);
}

export function renderAccessState(access) {
  if (!access) return;

  if (access.allowed) {
    show('watch-live-shell');
    hide('watch-gate');
    return;
  }

  hide('watch-live-shell');
  show('watch-gate');

  let title = 'Access blocked';
  let subtitle = 'You cannot join this stream right now.';

  if (access.reason === 'login_required') {
    title = 'Login required';
    subtitle = 'Sign in to join this stream.';
  } else if (access.reason === 'purchase_required') {
    title = 'Purchase required';
    subtitle = 'Unlock this stream to watch live.';
  } else if (access.reason === 'follow_required') {
    title = 'Followers only';
    subtitle = 'Follow this creator to join.';
  } else if (access.reason === 'vip_required') {
    title = 'VIP only';
    subtitle = 'This stream is for VIP members.';
  } else if (access.reason === 'banned') {
    title = 'You are banned';
    subtitle = 'You cannot join this stream.';
  } else if (access.reason === 'stream_ended') {
    title = 'Stream ended';
    subtitle = 'This live has already ended.';
  } else if (access.reason === 'stream_not_live') {
    title = 'Not live yet';
    subtitle = 'This stream is not currently live.';
  }

  setText('watch-gate-title', title);
  setText('watch-gate-subtitle', subtitle);
}

export function showError(message) {
  const box = el('live-error');
  if (!box) return;
  box.textContent = message || '';
  box.style.display = message ? 'block' : 'none';
}

export function showSuccess(message) {
  const box = el('live-success');
  if (!box) return;
  box.textContent = message || '';
  box.style.display = message ? 'block' : 'none';
}

export function updateViewerCount(count) {
  setText('live-viewer-count', String(count ?? 0));
}

export function updateShareUrl(url) {
  const input = el('live-share-url');
  if (input) input.value = url || '';
}

export async function copyShareUrl() {
  const input = el('live-share-url');
  if (!input?.value) return false;

  await navigator.clipboard.writeText(input.value);
  return true;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
