function el(id) {
  return document.getElementById(id);
}

export function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value ?? '';
}

export function showProfileError(message) {
  const node = el('profile-error');
  if (!node) return;
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

export function showProfileSuccess(message) {
  const node = el('profile-success');
  if (!node) return;
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

export function renderProfile(profile) {
  if (!profile) return;

  setText('profile-display-name', profile.display_name || profile.username || 'Creator');
  setText('profile-handle', formatHandle(profile.handle || profile.username || profile.display_name || 'creator'));
  setText(
    'profile-bio',
    profile.bio ||
      'Rich Bizness creator building live experiences, music energy, gaming movement, sports culture, and visual storytelling into one powerful platform.'
  );

  renderAvatar(profile);
}

export function renderStats({ followersCount = 0, followingCount = 0, postsCount = 0, livesCount = 0, tierLabel = 'Building' }) {
  setText('profile-followers-count', formatNumber(followersCount));
  setText('profile-following-count', formatNumber(followingCount));
  setText('profile-posts-count', formatNumber(postsCount));
  setText('profile-lives-count', formatNumber(livesCount));
  setText('profile-tier-label', tierLabel);
}

export function renderFollowButton({ isOwnProfile, isFollowing, loggedIn }) {
  const node = el('follow-profile-btn');
  if (!node) return;

  node.classList.remove('btn', 'btn-ghost');

  if (isOwnProfile) {
    node.textContent = 'Your Profile';
    node.disabled = true;
    node.classList.add('btn-ghost');
    return;
  }

  if (!loggedIn) {
    node.textContent = 'Login to Follow';
    node.disabled = false;
    node.classList.add('btn');
    return;
  }

  if (isFollowing) {
    node.textContent = 'Following';
    node.disabled = false;
    node.classList.add('btn-ghost');
    node.setAttribute('data-following', 'true');
  } else {
    node.textContent = 'Follow';
    node.disabled = false;
    node.classList.add('btn');
    node.setAttribute('data-following', 'false');
  }
}

export function renderLatestLive(latestLive) {
  const link = el('profile-live-link');

  if (!latestLive) {
    setText('profile-live-title', 'No live stream yet');
    setText('profile-live-description', 'Start a stream and your latest live highlight will show here.');
    setText('profile-live-status', 'OFFLINE');
    if (link) {
      link.href = '/live.html';
      link.textContent = 'Start Live';
    }
    return;
  }

  setText('profile-live-title', latestLive.title || 'Live Stream');
  setText(
    'profile-live-description',
    latestLive.description || 'This creator has a recent live stream ready to watch.'
  );
  setText('profile-live-status', String(latestLive.status || 'draft').toUpperCase());

  if (link) {
    if (latestLive.slug) {
      link.href = `/watch.html?slug=${encodeURIComponent(latestLive.slug)}`;
      link.textContent = latestLive.status === 'live' ? 'Join Live' : 'Open Stream';
    } else {
      link.href = '/watch.html';
      link.textContent = 'Open Stream';
    }
  }
}

function renderAvatar(profile) {
  const wrap = el('profile-avatar-wrap');
  const avatar = el('profile-avatar');
  if (!wrap || !avatar) return;

  const avatarUrl =
    profile.avatar_url ||
    profile.profile_image_url ||
    '';

  if (avatarUrl) {
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
