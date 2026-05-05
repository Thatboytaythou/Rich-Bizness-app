// =========================
// RICH BIZNESS HOME — FULL FEED SYSTEM
// =========================

import { initApp, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { mountFeed } from "/core/features/social/feed-ui.js";

await initApp();

mountEliteNav({ target: "#elite-platform-nav" });

const user = getCurrentUserState();

// =========================
// 🔥 HOME FEED (PERSONALIZED)
// =========================
mountFeed({
  targetId: "home-feed",
  userId: user?.id || null
});

console.log("🔥 HOME FEED LOCKED");
