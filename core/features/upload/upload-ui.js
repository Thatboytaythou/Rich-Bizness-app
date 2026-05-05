// =========================
// RICH BIZNESS UPLOAD UI — FULL (FIXED + SAFE MOUNT)
// =========================

import { runUploadFlow } from "./upload-state.js";

export function mountUploadUI(targetId = "upload-root") {
  // 🔥 SAFE ROOT (NO MORE BLANK SCREEN)
  let root = document.getElementById(targetId);
  if (!root) {
    console.warn("UPLOAD ROOT NOT FOUND — USING BODY");
    root = document.body;
  }

  root.innerHTML = `
    <div class="upload-shell" style="
      min-height:100vh;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:20px;
      padding:20px;
    ">

      <h1 class="upload-title">RUN IT UP 🚀</h1>

      <input type="file" id="upload-input" hidden />

      <button id="upload-trigger" class="upload-btn">
        Tap to Load
      </button>

      <select id="upload-type">
        <option value="general">General</option>
        <option value="music">Music</option>
        <option value="gaming">Gaming</option>
        <option value="sports">Sports</option>
        <option value="gallery">Gallery</option>
      </select>

      <div id="upload-preview"></div>

      <button id="run-upload" class="upload-btn">
        RUN IT UP 📈
      </button>

      <div id="upload-status">Ready to load</div>

    </div>
  `;

  bindUploadUI();
}

// =========================
// INTERACTION
// =========================

function bindUploadUI() {
  const input = document.getElementById("upload-input");
  const trigger = document.getElementById("upload-trigger");
  const preview = document.getElementById("upload-preview");
  const runBtn = document.getElementById("run-upload");
  const typeSelect = document.getElementById("upload-type");

  let file = null;

  // OPEN FILE PICKER
  trigger.addEventListener("click", () => input.click());

  // FILE SELECT
  input.addEventListener("change", () => {
    file = input.files[0];
    if (!file) return;

    preview.innerHTML = "";

    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = "250px";
      img.style.borderRadius = "12px";
      preview.appendChild(img);
    }

    if (file.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.style.maxWidth = "250px";
      video.style.borderRadius = "12px";
      preview.appendChild(video);
    }
  });

  // RUN UPLOAD
  runBtn.addEventListener("click", async () => {
    if (!file) {
      document.getElementById("upload-status").innerText = "Select a file first";
      return;
    }

    await runUploadFlow({
      file,
      type: typeSelect.value,
      previewEl: preview,
      statusEl: document.getElementById("upload-status"),
      orbEl: null
    });
  });
}

// =========================
// AUTO MOUNT (NO TIMING BUGS)
// =========================

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    mountUploadUI();
  });
}
