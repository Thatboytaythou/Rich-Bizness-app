// =========================
// 🌍 RICH BIZNESS WORLD ENGINE — LOCKED CORE
// =========================

export function initWorldEngine() {
  bindWorldNavigation();
}

// =========================
// CLICK HANDLER
// =========================

function bindWorldNavigation() {
  const items = document.querySelectorAll("[data-world]");

  items.forEach(item => {
    item.addEventListener("click", () => {
      const world = item.dataset.world;
      openPortal(world);
    });
  });
}

// =========================
// PORTAL EFFECT
// =========================

function openPortal(world) {
  const portal = document.createElement("div");
  portal.className = "world-portal";

  document.body.appendChild(portal);

  requestAnimationFrame(() => {
    portal.classList.add("expand");
  });

  setTimeout(() => {
    route(world);
  }, 700);
}

// =========================
// ROUTING (ALL CORE PAGES)
// =========================

function route(world) {
  const routes = {
    live: "/live.html",              // 🔥 YOU WERE RIGHT — THIS WAS MISSING
    music: "/music.html",
    gaming: "/gaming.html",
    sports: "/sports.html",
    gallery: "/gallery.html",
    store: "/store.html",
    upload: "/upload.html",
    profile: "/profile.html",
    messages: "/messages.html",
    notifications: "/notifications.html",
    metaverse: "/metaverse.html"
  };

  window.location.href = routes[world] || "/";
}
