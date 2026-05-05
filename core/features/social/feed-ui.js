// =========================
// RICH BIZNESS FEED UI — FINAL
// =========================

import { loadFeed } from "./feed-client.js";

export function mountFeed({
  targetId = "feed-root",
  userId = null,
  type = null
} = {}) {
  loadFeed({ targetId, userId, type });

  // 🔥 AUTO REFRESH (REAL-TIME FEEL)
  setInterval(() => {
    loadFeed({ targetId, userId, type });
  }, 10000);
}
