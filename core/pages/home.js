import { initApp } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import { bootLiveRail, destroyLiveRail } from "/core/features/live/live-rail.js";

let homeBooted = false;

function $(id) {
  return document.getElementById(id);
}

const els = {
  navMount: $("elite-platform-nav"),
  liveRail: $("homepage-live-rail")
};

function hasHomeShell() {
  return document.body?.classList.contains("home-page");
}

async function mountNav() {
  if (!els.navMount) return;

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });
}

async function mountLiveRail() {
  if (!els.liveRail) return;

  await bootLiveRail({
    railElementId: "homepage-live-rail",
    limit: 6,
    autoRefresh: true,
    intervalMs: 15000,
    channelKey: "homepage",
    emptyMessage: "No one is live right now.",
    showCreatorLink: true
  });
}

function bindHomeActions() {
  const actionButtons = document.querySelectorAll("[data-home-scroll]");
  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-home-scroll");
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

export async function bootHomePage() {
  if (homeBooted) return;
  homeBooted = true;

  await initApp();
  await mountNav();
  await mountLiveRail();
  bindHomeActions();
}

export function destroyHomePage() {
  destroyLiveRail();
  homeBooted = false;
}

if (hasHomeShell()) {
  bootHomePage().catch((error) => {
    console.error("[core/pages/home] bootHomePage error:", error);
  });

  window.addEventListener("beforeunload", () => {
    destroyHomePage();
  });
}
