// =========================
// RICH BIZNESS UPLOAD STATE — RUN IT UP FLOW
// /core/features/upload/upload-state.js
// =========================

import { playUploadEffects } from "./upload-effects.js";
import { sendUploadToServer } from "./upload-api.js";

// =========================
// MAIN FLOW
// =========================

export async function runUploadFlow({
  file,
  previewEl,
  statusEl,
  orbEl
}) {
  if (!file) return;

  try {
    // =========================
    // STEP 1 — PREP UI
    // =========================
    setStatus(statusEl, "Charging up... ⚡");

    // =========================
    // STEP 2 — VISUAL EFFECT (SMOKE + ORB)
    // =========================
    await playUploadEffects(orbEl);

    // =========================
    // STEP 3 — UPLOAD
    // =========================
    setStatus(statusEl, "Running it up... 📈");

    const result = await sendUploadToServer(file);

    if (!result.success) {
      throw new Error(result.error || "Upload failed");
    }

    // =========================
    // STEP 4 — SUCCESS
    // =========================
    setStatus(statusEl, "🔥 LIVE IN THE BIZNESS");

    triggerSuccessVisual(previewEl);

  } catch (err) {
    console.error(err);
    setStatus(statusEl, "❌ Something went wrong");
  }
}

// =========================
// HELPERS
// =========================

function setStatus(el, text) {
  if (!el) return;
  el.textContent = text;
}

function triggerSuccessVisual(previewEl) {
  if (!previewEl) return;

  previewEl.style.transform = "scale(1.05)";
  previewEl.style.transition = "0.3s ease";

  setTimeout(() => {
    previewEl.style.transform = "scale(1)";
  }, 300);
}
