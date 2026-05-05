// =========================
// RICH BIZNESS PROFILE PAGE — FINAL
// =========================

import { initApp, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

import { getProfile } from "/core/features/profile/profile-client.js";
import { renderProfile } from "/core/features/profile/profile-ui.js";

import { mountFeed } from "/core/features/social/feed-ui.js";

import { getAvatar } from "/core/features/profile/avatar-state.js";
import { renderAvatar } from "/core/features/profile/avatar-ui.js";

// INIT
await initApp();

mountEliteNav({ target: "#elite-platform-nav" });

const user = getCurrentUserState();

// LOAD PROFILE
async function loadProfilePage() {
  if (!user) {
    window.location.href = "/auth.html";
    return;
  }

  const profile = await getProfile(user.id);

  renderProfile("profile-root", profile);

  // 🔥 AVATAR
  const avatar = await getAvatar(user.id);
  renderAvatar("profile-avatar", avatar);

  // 🔥 USER FEED
  mountFeed({
    targetId: "profile-feed",
    userId: user.id
  });
}

loadProfilePage();
