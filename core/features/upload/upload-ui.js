// =========================
// RICH BIZNESS UPLOAD UI — FINAL (WITH ROUTING)
// =========================

import { runUploadFlow } from "./upload-state.js";

export function mountUploadUI(targetId = "upload-root") {
  const root = document.getElementById(targetId);
  if (!root) return;

  root.innerHTML = `
    <div class="upload-shell">

      <input type="file" id="upload-input" hidden />

      <div>
        <button id="upload-trigger">Tap to Load</button>
      </div>

      <div>
        <select id="upload-type">
          <option value="general">General</option>
          <option value="music">Music</option>
          <option value="gaming">Gaming</option>
          <option value="sports">Sports</option>
          <option value="gallery">Gallery</option>
        </select>
      </div>

      <div id="upload-preview"></div>

      <button id="run-upload">RUN IT UP 📈</button>

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

  trigger.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    file = input.files[0];
    if (!file) return;

    preview.innerHTML = "";

    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = "200px";
      preview.appendChild(img);
    }

    if (file.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.style.maxWidth = "200px";
      preview.appendChild(video);
    }
  });

  runBtn.addEventListener("click", async () => {
    if (!file) return;

    await runUploadFlow({
      file,
      type: typeSelect.value,
      previewEl: preview,
      statusEl: document.getElementById("upload-status"),
      orbEl: document.getElementById("upload-orb") || null
    });
  });
}
