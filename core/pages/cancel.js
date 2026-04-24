import { initApp } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

function $(id) {
  return document.getElementById(id);
}

const params = new URLSearchParams(window.location.search);

const checkout = params.get("checkout") || params.get("type") || "checkout";
const streamId = params.get("streamId") || params.get("stream_id") || "";
const slug = params.get("slug") || "";
const roomName = params.get("roomName") || params.get("room_name") || "";
const creatorId = params.get("creatorId") || params.get("creator_id") || "";
const productId = params.get("productId") || params.get("product_id") || "";
const contentId = params.get("contentId") || params.get("content_id") || "";
const trackSlug = params.get("trackSlug") || params.get("track_slug") || "";
const albumSlug = params.get("albumSlug") || params.get("album_slug") || "";
const artworkId = params.get("artworkId") || params.get("artwork_id") || "";

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setLink(href, label = "Go Back") {
  const link = $("cancel-primary-link");
  if (!link) return;

  link.href = href;
  link.textContent = label;
}

function detailRows(rows = []) {
  return rows
    .filter((row) => row?.value)
    .map(
      (row) => `
        <div class="success-row">
          <span>${row.label}</span>
          <strong>${row.value}</strong>
        </div>
      `
    )
    .join("");
}

function setDetails(html) {
  const box = $("cancel-details");
  if (box) box.innerHTML = html;
}

function getWatchUrl() {
  if (slug) return `/watch.html?slug=${encodeURIComponent(slug)}`;
  if (streamId) return `/watch.html?id=${encodeURIComponent(streamId)}`;
  if (roomName) return `/watch.html?room=${encodeURIComponent(roomName)}`;
  return "/watch.html";
}

function configureCancelPage() {
  let title = "Checkout Canceled";
  let message = "No payment was completed. You can safely return and try again.";
  let primaryHref = "/index.html";
  let primaryLabel = "Go Back";

  if (checkout === "stream_ticket") {
    title = "Live Ticket Canceled";
    message = "Your live ticket checkout was canceled. You can return to the stream page anytime.";
    primaryHref = getWatchUrl();
    primaryLabel = "Back to Live";
  }

  if (checkout === "vip_membership") {
    title = "VIP Checkout Canceled";
    message = "Your VIP checkout was canceled. No VIP access was granted.";
    primaryHref = roomName
      ? `/watch.html?room=${encodeURIComponent(roomName)}`
      : creatorId
        ? `/profile.html?id=${encodeURIComponent(creatorId)}`
        : "/monetization.html";
    primaryLabel = "Back to VIP";
  }

  if (checkout === "tip") {
    title = "Tip Canceled";
    message = "Your tip checkout was canceled. No payment was sent.";
    primaryHref = streamId ? getWatchUrl() : "/creator-dashboard.html";
    primaryLabel = streamId ? "Back to Live" : "Continue";
  }

  if (checkout === "store") {
    title = "Store Checkout Canceled";
    message = "Your store checkout was canceled. No order was placed.";
    primaryHref = productId ? `/store.html?product=${encodeURIComponent(productId)}` : "/store.html";
    primaryLabel = "Back to Store";
  }

  if (checkout === "music_unlock") {
    title = "Music Unlock Canceled";
    message = "Your music unlock checkout was canceled. No access was granted.";
    primaryHref = trackSlug
      ? `/music.html?track=${encodeURIComponent(trackSlug)}`
      : albumSlug
        ? `/music.html?album=${encodeURIComponent(albumSlug)}`
        : "/music.html";
    primaryLabel = "Back to Music";
  }

  if (checkout === "artwork") {
    title = "Artwork Checkout Canceled";
    message = "Your artwork checkout was canceled. No artwork access was granted.";
    primaryHref = artworkId
      ? `/gallery.html?artwork=${encodeURIComponent(artworkId)}`
      : "/gallery.html";
    primaryLabel = "Back to Gallery";
  }

  if (checkout === "premium_content") {
    title = "Premium Checkout Canceled";
    message = "Your premium content checkout was canceled. No premium access was granted.";
    primaryHref = contentId
      ? `/monetization.html?content=${encodeURIComponent(contentId)}`
      : "/monetization.html";
    primaryLabel = "Back to Premium";
  }

  const h1 = document.querySelector(".success-card h1");
  if (h1) h1.textContent = title;

  setText("cancel-message", message);
  setLink(primaryHref, primaryLabel);

  setDetails(`
    ${detailRows([
      { label: "Checkout", value: checkout },
      { label: "Stream", value: streamId || slug || roomName },
      { label: "Creator", value: creatorId },
      { label: "Product", value: productId },
      { label: "Content", value: contentId },
      { label: "Track", value: trackSlug },
      { label: "Album", value: albumSlug },
      { label: "Artwork", value: artworkId }
    ])}
    <p class="success-note">
      Since checkout was canceled, no payment or unlock should be recorded.
    </p>
  `);
}

async function bootCancelPage() {
  await initApp();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  configureCancelPage();
}

if (document.body?.classList.contains("cancel-page")) {
  bootCancelPage().catch((error) => {
    console.error("[cancel] boot error:", error);
    setText("cancel-message", "Checkout was canceled, but this page could not fully load.");
    setDetails(`
      <p class="success-note">
        You can safely return to the app. No payment should have been completed.
      </p>
    `);
  });
}
