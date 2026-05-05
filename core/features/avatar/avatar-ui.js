// =========================
// AVATAR SYSTEM — UI
// =========================

import { saveAvatar } from "./avatar-state.js";

export function mountAvatarUI(targetId = "avatar-root") {
  const root = document.getElementById(targetId);
  if (!root) return;

  root.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:20px;
      min-height:100vh;
      color:white;
    ">
      <h1>Set Your Avatar 🧑</h1>

      <input type="file" id="avatar-input" hidden />

      <button id="avatar-pick">Choose Avatar</button>

      <div id="avatar-preview"></div>

      <button id="avatar-save">Save Avatar</button>

      <div id="avatar-status"></div>
    </div>
  `;

  bindAvatarUI();
}

function bindAvatarUI() {
  const input = document.getElementById("avatar-input");
  const pick = document.getElementById("avatar-pick");
  const preview = document.getElementById("avatar-preview");
  const save = document.getElementById("avatar-save");
  const status = document.getElementById("avatar-status");

  let file = null;

  pick.onclick = () => input.click();

  input.onchange = () => {
    file = input.files[0];
    if (!file) return;

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.width = "120px";
    img.style.borderRadius = "50%";

    preview.innerHTML = "";
    preview.appendChild(img);
  };

  save.onclick = async () => {
    if (!file) {
      status.innerText = "Pick an image first";
      return;
    }

    status.innerText = "Saving...";

    const url = await saveAvatar(file);

    if (url) {
      status.innerText = "Avatar saved 🔥";
    } else {
      status.innerText = "Error saving avatar";
    }
  };
}
