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

export function setButtonState({
  id,
  text,
  disabled = false,
  addClass = '',
  removeClasses = []
}) {
  const node = el(id);
  if (!node) return;

  if (text !== undefined) node.textContent = text;
  node.disabled = !!disabled;

  removeClasses.forEach((className) => node.classList.remove(className));
  if (addClass) node.classList.add(addClass);
}

export function showProfileError(message) {
  const node = ensureNotice('profile-error', 'error');
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

export function showProfileSuccess(message) {
  const node = ensureNotice('profile-success', 'success');
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

export function renderProfile(profile) {
  if (!profile) return;

  setText('profile-display-name', profile.display_name || profile.username || 'Creator');
  setText('profile-handle', formatHandle(profile.username || profile.handle || profile.display_name || 'creator'));
  setText(
    'profile-bio',
    profile.bio ||
      'Rich Bizness creator building live experiences, music energy, gaming movement, sports culture, and visual storytelling.'
  );

  renderAvatar(profile);
}

export function renderStats({ followersCount = 0, followingCount = 0, postsCount = 0, livesCount = 0, tierLabel = 'Rising' }) {
  setText('profile-followers-count', formatNumber(followersCount));
  setText('profile-following-count', formatNumber(followingCount));
  setText('profile-posts-count', formatNumber(postsCount));
  setText('profile-lives-count', formatNumber(livesCount));
  setText('profile-tier-label', tierLabel);
}

export function renderFollowButton({ isOwnProfile, isFollowing, loggedIn }) {
  const node = el('follow-profile-btn');
  if (!node) return;

  if (isOwnProfile) {
    node.textContent = 'Your Profile';
    node.disabled = true;
    node.classList.remove('btn');
    node.classList.add('btn-ghost');
    return;
  }

  if (!loggedIn) {
    node.textContent = 'Login to Follow';
    node.disabled = false;
    node.classList.remove('btn-ghost');
    node.classList.add('btn');
    return;
  }

  if (isFollowing) {
    node.textContent = 'Following';
    node.disabled = false;
    node.classList.remove('btn');
    node.classList.add('btn-ghost');
    node.setAttribute('data-following', 'true');
  } else {
    node.textContent = 'Follow';
    node.disabled = false;
    node.classList.remove('btn-ghost');
    node.classList.add('btn');
    node.setAttribute('data-following', 'false');
  }
}

export function renderLatestLive(latestLive) {
  if (!latestLive) {
    setText('profile-live-title', 'No live stream yet');
    setText('profile-live-description', 'Start a stream and your latest live highlight will show here.');
    setText('profile-live-cta', 'Start Live');
    setLiveHref('/live.html');
    setText('profile-live-status', 'OFFLINE');
    return;
  }

  setText('profile-live-title', latestLive.title || 'Live Stream');
  setText(
    'profile-live-description',
    latestLive.description || 'This creator has a recent live stream ready to watch.'
  );
  setText('profile-live-status', String(latestLive.status || 'draft').toUpperCase());

  if (latestLive.slug) {
    setLiveHref(`/watch.html?slug=${encodeURIComponent(latestLive.slug)}`);
    setText('profile-live-cta', latestLive.status === 'live' ? 'Join Live' : 'Open Stream');
  } else {
    setLiveHref('/watch.html');
    setText('profile-live-cta', 'Open Stream');
  }
}

function setLiveHref(href) {
  const link = el('profile-live-link');
  if (link) link.setAttribute('href', href);
}

function renderAvatar(profile) {
  const wrap = el('profile-avatar-wrap');
  if (!wrap) return;

  const avatar = el('profile-avatar');
  const avatarUrl =
    profile.avatar_url ||
    profile.profile_image_url ||
    profile.image_url ||
    '';

  if (avatar && avatarUrl) {
    avatar.src = avatarUrl;
    avatar.style.display = 'block';

    while (wrap.firstChild) {
      wrap.removeChild(wrap.firstChild);
    }

    wrap.appendChild(avatar);
    return;
  }

  wrap.textContent = initials(profile.display_name || profile.username || 'RB');
}

function formatHandle(value) {
  const clean = String(value || '').replace(/^@+/, '').trim();
  return clean ? `@${clean}` : '@creator';
}

function initials(value) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'RB';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function ensureNotice(id, type) {
  let node = el(id);
  if (node) return node;

  node = document.createElement('div');
  node.id = id;
  node.style.display = 'none';
  node.style.marginBottom = '12px';
  node.style.padding = '12px 14px';
  node.style.borderRadius = '16px';
  node.style.border = '1px solid transparent';
  node.style.fontSize = '14px';

  if (type === 'error') {
    node.style.background = 'rgba(255, 90, 115, 0.1)';
    node.style.borderColor = 'rgba(255, 90, 115, 0.24)';
    node.style.color = '#ffd0d8';
  } else {
    node.style.background = 'rgba(67, 245, 155, 0.1)';
    node.style.borderColor = 'rgba(67, 245, 155, 0.24)';
    node.style.color = '#d8ffea';
  }

  const hero = document.querySelector('.profile-hero');
  if (hero && hero.parentNode) {
    hero.parentNode.insertBefore(node, hero);
  }

  return node;
}
