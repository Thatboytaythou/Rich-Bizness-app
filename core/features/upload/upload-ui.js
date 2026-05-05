// =========================
// RICH BIZNESS UPLOAD — GOD MODE (PORTAL SYSTEM)
// =========================

import { runUploadFlow } from "./upload-state.js";

export function mountUploadUI(targetId = "upload-stage") {
  const root = document.getElementById(targetId);
  if (!root) return;

  root.innerHTML = `
    <div class="upload-god">

      <h1 class="god-title">RUN IT UP 🚀</h1>

      <input type="file" id="upload-input" hidden />

      <!-- 🔥 PORTAL -->
      <div class="portal" id="portal">
        <div class="portal-core"></div>
      </div>

      <select id="upload-type" class="god-select">
        <option value="general">General</option>
        <option value="music">Music</option>
        <option value="gaming">Gaming</option>
        <option value="sports">Sports</option>
        <option value="gallery">Gallery</option>
      </select>

      <div id="upload-preview" class="preview-zone"></div>

      <button id="ignite" class="ignite-btn">
        IGNITE 🚀
      </button>

      <div id="upload-status">System ready</div>

    </div>
  `;

  bindGodMode();
}

// =========================
// INTERACTION
// =========================

function bindGodMode() {
  const input = document.getElementById("upload-input");
  const portal = document.getElementById("portal");
  const preview = document.getElementById("upload-preview");
  const ignite = document.getElementById("ignite");
  const type = document.getElementById("upload-type");
  const status = document.getElementById("upload-status");

  let file = null;

  // 🔥 OPEN PORTAL
  portal.addEventListener("click", () => {
    portal.classList.add("open");
    document.body.classList.add("energy");
    input.click();
  });

  // 🔥 FILE SELECT
  input.addEventListener("change", () => {
    file = input.files[0];
    if (!file) return;

    preview.innerHTML = "";
    preview.classList.add("active");

    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    }

    if (file.type.startsWith("video")) {
      const vid = document.createElement("video");
      vid.src = URL.createObjectURL(file);
      vid.controls = true;
      preview.appendChild(vid);
    }

    status.innerText = "Energy loaded ⚡";
  });

  // 🔥 IGNITE
  ignite.addEventListener("click", async () => {
    if (!file) {
      status.innerText = "No file";
      return;
    }

    document.body.classList.add("warp");

    await runUploadFlow({
      file,
      type: type.value,
      previewEl: preview,
      statusEl: status,
      orbEl: portal
    });

    document.body.classList.remove("warp");
    status.innerText = "Upload complete 🔥";
  });
}
