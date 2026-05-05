// =========================
// RICH BIZNESS PROFILE PAGE — FULL LOCKED
// =========================

import { initApp, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

import { getProfile } from "/core/features/profile/profile-client.js";
import { renderProfile } from "/core/features/profile/profile-ui.js";

import { mountFeed } from "/core/features/social/feed-ui.js";

import { getAvatar } from "/core/features/profile/avatar-state.js";
import { renderAvatar } from "/core/features/profile/avatar-ui.js";

import { mountFollowButton } from "/core/features/social/follow-ui.js";
import { getFollowCounts } from "/core/features/social/follow-client.js";

await initApp();

mountEliteNav({ target: "#elite-platform-nav" });

const user = getCurrentUserState();

async function loadProfilePage() {
  if (!user) {
    window.location.href = "/auth.html";
    return;
  }

  const profile = await getProfile(user.id);

  // 🔥 FOLLOW COUNTS
  const counts = await getFollowCounts(user.id);

  // 🔥 RENDER PROFILE UI
  renderProfile("profile-root", profile, counts);

  // 🔥 AVATAR
  const avatar = await getAvatar(user.id);
  renderAvatar("profile-avatar", avatar);

  // 🔥 FOLLOW BUTTON
  mountFollowButton({
    containerId: "follow-btn",
    currentUserId: user.id,
    targetUserId: profile.id
  });

  // 🔥 USER POSTS
  mountFeed({
    targetId: "profile-feed",
    userId: user.id
  });
}

loadProfilePage();
