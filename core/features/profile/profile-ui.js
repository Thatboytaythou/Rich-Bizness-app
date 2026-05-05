// =========================
// RICH BIZNESS PROFILE UI — FINAL
// =========================

import { updateProfile } from "./profile-client.js";

export function renderProfile(containerId, profile) {
  const el = document.getElementById(containerId);
  if (!el || !profile) return;

  el.innerHTML = `
    <div class="profile-shell">

      <div id="profile-avatar"></div>

      <h2>${profile.username || "User"}</h2>
      <p>${profile.bio || "No bio yet"}</p>

      <div class="profile-stats">
        <span>Followers: ${profile.followers_count || 0}</span>
        <span>Following: ${profile.following_count || 0}</span>
      </div>

      <div class="profile-actions">
        <button id="edit-profile-btn">Edit Profile</button>
      </div>

      <div id="profile-feed"></div>

    </div>
  `;

  bindProfileEdit(profile);
}

function bindProfileEdit(profile) {
  const btn = document.getElementById("edit-profile-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const newName = prompt("New username:", profile.username);
    if (!newName) return;

    await updateProfile(profile.id, {
      username: newName
    });

    location.reload();
  });
}
