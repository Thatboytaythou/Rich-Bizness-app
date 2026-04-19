import { getLiveStreams } from "./live-api.js";
import { renderLiveRail } from "./live-ui.js";

let liveRailRefreshTimer = null;

function el(id) {
  return document.getElementById(id);
}

export async function loadLiveRail() {
  try {
    const streams = await getLiveStreams();
    renderLiveRail(Array.isArray(streams) ? streams : []);
    return streams || [];
  } catch (error) {
    console.error("[live/live-rail] loadLiveRail error:", error);
    renderLiveRail([]);
    return [];
  }
}

export function startLiveRailAutoRefresh(intervalMs = 15000) {
  stopLiveRailAutoRefresh();

  liveRailRefreshTimer = window.setInterval(async () => {
    await loadLiveRail();
  }, intervalMs);

  return liveRailRefreshTimer;
}

export function stopLiveRailAutoRefresh() {
  if (liveRailRefreshTimer) {
    window.clearInterval(liveRailRefreshTimer);
    liveRailRefreshTimer = null;
  }
}

export async function bootLiveRail({
  railElementId = "homepage-live-rail",
  autoRefresh = true,
  intervalMs = 15000
} = {}) {
  const rail = el(railElementId);
  if (!rail) return;

  await loadLiveRail();

  if (autoRefresh) {
    startLiveRailAutoRefresh(intervalMs);
  }
}

window.addEventListener("beforeunload", () => {
  stopLiveRailAutoRefresh();
});
