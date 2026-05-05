// =========================
// RICH BIZNESS UPLOAD STATE — FINAL (ROUTING)
// =========================

import { supabase } from "/core/supabase.js";
import { playUploadEffects } from "./upload-effects.js";
import { sendUploadToServer } from "./upload-api.js";
import { distributeContent } from "/core/features/social/content-distributor.js";

export async function runUploadFlow({
  file,
  type,
  previewEl,
  statusEl,
  orbEl
}) {
  if (!file) return;

  try {
    setStatus(statusEl, "Charging up... ⚡");

    await playUploadEffects(orbEl);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Login required");

    setStatus(statusEl, "Running it up... 📈");

    const uploadResult = await sendUploadToServer(file);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "Upload failed");
    }

    // 🔥 ROUTING BASED ON TYPE
    await distributeContent({
      type,
      userId: user.id,
      title: file.name,
      description: "",
      fileUrl: uploadResult.url
    });

    setStatus(statusEl, "🔥 LIVE IN THE BIZNESS");

    triggerSuccessVisual(previewEl);

  } catch (err) {
    console.error(err);
    setStatus(statusEl, "❌ Upload failed");
  }
}

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
