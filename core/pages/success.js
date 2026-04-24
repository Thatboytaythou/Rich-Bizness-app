import { initApp } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

function $(id) {
  return document.getElementById(id);
}

const params = new URLSearchParams(window.location.search);

const checkout = params.get("checkout") || params.get("type") || "checkout";
const sessionId = params.get("session_id") || "";
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

function setLink(href, label = "Continue") {
  const link = $("success-primary-link");
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
  const box = $("success-details");
  if (box) box.innerHTML = html;
}

function getWatchUrl() {
  if (slug) return `/watch.html?slug=${encodeURIComponent(slug)}`;
  if (streamId) return `/watch.html?id=${encodeURIComponent(streamId)}`;
  if (roomName) return `/watch.html?room=${encodeURIComponent(roomName)}`;
  return "/watch.html";
}

function configureSuccessPage() {
  let title = "Payment Successful";
  let message = "Your purchase is confirmed. Your access is being unlocked.";
  let primaryHref = "/index.html";
  let primaryLabel = "Continue";

  if (checkout === "stream_ticket") {
    title = "Live Access Unlocked";
    message = "Your paid live stream ticket is confirmed. You can enter the stream now.";
    primaryHref = getWatchUrl();
    primaryLabel = "Enter Live";
  }

  if (checkout === "vip_membership") {
    title = "VIP Access Activated";
    message = "Your VIP access is confirmed. You can return to the creator’s live room or continue exploring.";
    primaryHref = roomName
      ? `/watch.html?room=${encodeURIComponent(roomName)}`
      : "/live.html";
    primaryLabel = "Open VIP Access";
  }

  if (checkout === "tip") {
    title = "Tip Sent";
    message = "Your tip was sent successfully. The creator’s balance will update automatically.";
    primaryHref = streamId ? getWatchUrl() : "/creator-dashboard.html";
    primaryLabel = streamId ? "Back to Live" : "Continue";
  }

  if (checkout === "store") {
    title = "Order Confirmed";
    message = "Your store purchase is confirmed. Any connected unlocks will now be available.";
    primaryHref = productId ? `/store.html?product=${encodeURIComponent(productId)}` : "/store.html";
    primaryLabel = "View Store";
  }

  if (checkout === "music_unlock") {
    title = "Music Unlocked";
    message = "Your music access is confirmed. The track or album is now unlocked.";
    primaryHref = trackSlug
      ? `/music.html?track=${encodeURIComponent(trackSlug)}`
      : albumSlug
        ? `/music.html?album=${encodeURIComponent(albumSlug)}`
        : "/music.html";
    primaryLabel = "Open Music";
  }

  if (checkout === "artwork") {
    title = "Artwork Purchased";
    message = "Your artwork purchase is confirmed and your access has been recorded.";
    primaryHref = artworkId
      ? `/gallery.html?artwork=${encodeURIComponent(artworkId)}`
      : "/gallery.html";
    primaryLabel = "Open Gallery";
  }

  if (checkout === "premium_content") {
    title = "Premium Content Unlocked";
    message = "Your premium content purchase is confirmed.";
    primaryHref = contentId
      ? `/monetization.html?content=${encodeURIComponent(contentId)}`
      : "/monetization.html";
    primaryLabel = "Open Premium";
  }

  setText("success-message", message);

  const h1 = document.querySelector(".success-card h1");
  if (h1) h1.textContent = title;

  setLink(primaryHref, primaryLabel);

  setDetails(`
    ${detailRows([
      { label: "Checkout", value: checkout },
      { label: "Session", value: sessionId },
      { label: "Stream", value: streamId || slug || roomName },
      { label: "Creator", value: creatorId },
      { label: "Product", value: productId },
      { label: "Content", value: contentId },
      { label: "Track", value: trackSlug },
      { label: "Album", value: albumSlug },
      { label: "Artwork", value: artworkId }
    ])}
    <p class="success-note">
      If access does not show immediately, refresh the page once. Stripe webhooks can take a few seconds to finish.
    </p>
  `);
}

async function bootSuccessPage() {
  await initApp();

  mountEliteNav({
    target: "#elite-platform-nav",
    collapsed: false
  });

  configureSuccessPage();
}

if (document.body?.classList.contains("success-page")) {
  bootSuccessPage().catch((error) => {
    console.error("[success] boot error:", error);
    setText("success-message", "Payment completed, but the success page could not fully load.");
    setDetails(`
      <p class="success-note">
        Your payment may still be confirmed. Check your dashboard or refresh this page.
      </p>
    `);
  });
}
