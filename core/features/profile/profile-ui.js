// =========================
// RICH BIZNESS PROFILE UI — FULL LOCKED
// =========================

export function renderProfile(containerId, profile, counts) {
  const el = document.getElementById(containerId);
  if (!el || !profile) return;

  el.innerHTML = `
    <div class="profile-shell">

      <div id="profile-avatar"></div>

      <h2>${profile.username || "User"}</h2>
      <p>${profile.bio || "No bio yet"}</p>

      <div class="profile-stats">
        <span>Followers: ${counts?.followers || 0}</span>
        <span>Following: ${counts?.following || 0}</span>
      </div>

      <div class="profile-actions">
        <div id="follow-btn"></div>
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

    const { supabase } = await import("/core/supabase.js");

    await supabase
      .from("profiles")
      .update({ username: newName })
      .eq("id", profile.id);

    location.reload();
  });
}
