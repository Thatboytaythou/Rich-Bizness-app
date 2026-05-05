// =========================
// RICH BIZNESS FEED UI — FINAL
// =========================

import { loadFeed } from "./feed-client.js";

export function mountFeed(targetId = "feed-root") {
  loadFeed(targetId);

  // 🔥 AUTO REFRESH (REAL-TIME FEEL)
  setInterval(() => {
    loadFeed(targetId);
  }, 10000);
}
