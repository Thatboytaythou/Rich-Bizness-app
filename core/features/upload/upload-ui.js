// =========================
// RICH BIZNESS UPLOAD UI — CLOUD CHAMBER
// /core/features/upload/upload-ui.js
// =========================

import { runUploadFlow } from "./upload-state.js";

export function mountUploadUI(targetId = "upload-root") {
  const root = document.getElementById(targetId);
  if (!root) return;

  root.innerHTML = `
    <section class="upload-chamber">

      <div class="upload-bg"></div>

      <div class="upload-smoke-layer">
        <span class="smoke"></span>
        <span class="smoke alt"></span>
        <span class="smoke deep"></span>
      </div>

      <div class="upload-orb-wrap">

        <div class="upload-orb" id="upload-orb">

          <div class="orb-core">
            <input type="file" id="upload-input" hidden />
            <button id="upload-trigger" class="orb-trigger">
              TAP TO LOAD
            </button>

            <div id="upload-preview" class="upload-preview"></div>
          </div>

        </div>

      </div>

      <div class="upload-actions">

        <button id="run-upload" class="btn btn-gold">
          RUN IT UP 📈
        </button>

        <div id="upload-status" class="upload-status">
          Ready to load
        </div>

      </div>

    </section>
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

  let file = null;

  trigger.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    file = input.files[0];
    if (!file) return;

    preview.innerHTML = "";

    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    }

    if (file.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.controls = true;
      preview.appendChild(video);
    }

    preview.classList.add("active");
  });

  runBtn.addEventListener("click", async () => {
    if (!file) return;

    await runUploadFlow({
      file,
      previewEl: preview,
      statusEl: document.getElementById("upload-status"),
      orbEl: document.getElementById("upload-orb")
    });
  });
}
