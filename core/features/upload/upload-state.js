// =========================
// RICH BIZNESS UPLOAD STATE — FINAL LOCKED
// /core/features/upload/upload-state.js
// =========================

import { supabase } from "/core/supabase.js";
import { playUploadEffects } from "./upload-effects.js";
import { sendUploadToServer } from "./upload-api.js";
import { distributeContent } from "/core/features/social/content-distributor.js";

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
    // STEP 1 — PREP
    // =========================
    setStatus(statusEl, "Charging up... ⚡");

    // =========================
    // STEP 2 — EFFECTS
    // =========================
    await playUploadEffects(orbEl);

    // =========================
    // STEP 3 — AUTH CHECK
    // =========================
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in");
    }

    // =========================
    // STEP 4 — UPLOAD FILE
    // =========================
    setStatus(statusEl, "Running it up... 📈");

    const uploadResult = await sendUploadToServer(file);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "Upload failed");
    }

    // =========================
    // STEP 5 — DISTRIBUTE CONTENT (CORE SYSTEM)
    // =========================
    await distributeContent({
      type: "general", // we upgrade later (music/gaming/etc)
      userId: user.id,
      title: file.name,
      description: "",
      fileUrl: uploadResult.url
    });

    // =========================
    // STEP 6 — SUCCESS
    // =========================
    setStatus(statusEl, "🔥 LIVE IN THE BIZNESS");

    triggerSuccessVisual(previewEl);

  } catch (err) {
    console.error(err);
    setStatus(statusEl, "❌ Upload failed");
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
