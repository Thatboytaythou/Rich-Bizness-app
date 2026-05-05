// =========================
// RICH BIZNESS FEED UI — SMART (BOOK FLOW)
// =========================

import { loadFeed } from "./feed-client.js";

export function mountFeed({
  targetId = "feed-root",
  type = null,
  userId = null
} = {}) {
  loadFeed({ targetId, type, userId });

  // 🔥 AUTO REFRESH
  setInterval(() => {
    loadFeed({ targetId, type, userId });
  }, 10000);
}
