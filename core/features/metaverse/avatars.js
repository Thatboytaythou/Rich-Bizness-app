// =========================
// RICH BIZNESS AVATAR — FULL SYNCED
// /core/features/profile/avatar.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

/* =========================
   ELEMENTS
========================= */

const $ = (id) => document.getElementById(id);

const els = {
  avatarImg: $("profile-avatar-img"),
  avatarInput: $("profile-avatar-input"),
  avatarUploadBtn: $("profile-avatar-upload-btn"),
  avatarStatus: $("profile-avatar-status")
};

/* =========================
   HELPERS
========================= */

function setStatus(msg, type = "normal") {
  if (!els.avatarStatus) return;

  els.avatarStatus.textContent = msg;
  els.avatarStatus.className = "status-box";

  if (type === "success") els.avatarStatus.classList.add("is-success");
  if (type === "error") els.avatarStatus.classList.add("is-error");
}

function getFileExt(file) {
  return file.name.split(".").pop()?.toLowerCase() || "png";
}

/* =========================
   LOAD CURRENT AVATAR
========================= */

export async function loadAvatar() {
  const user = getCurrentUserState();
  if (!user?.id) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("avatar load error:", error);
    return;
  }

  if (data?.avatar_url && els.avatarImg) {
    els.avatarImg.src = data.avatar_url;
  }
}

/* =========================
   UPLOAD AVATAR
========================= */

async function uploadAvatar() {
  try {
    const user = getCurrentUserState();
    if (!user?.id) {
      setStatus("You must be signed in.", "error");
      return;
    }

    const file = els.avatarInput?.files?.[0];
    if (!file) {
      setStatus("Select a file first.", "error");
      return;
    }

    setStatus("Uploading avatar...");

    const ext = getFileExt(file);
    const path = `${user.id}/avatar.${ext}`;

    // upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true
      });

    if (uploadError) {
      console.error("upload error:", uploadError);
      setStatus(uploadError.message, "error");
      return;
    }

    // get public url
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const publicUrl = urlData?.publicUrl;

    // save to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("profile update error:", updateError);
      setStatus(updateError.message, "error");
      return;
    }

    // update UI
    if (els.avatarImg) {
      els.avatarImg.src = publicUrl + `?t=${Date.now()}`;
    }

    setStatus("Avatar updated.", "success");
  } catch (err) {
    console.error("avatar crash:", err);
    setStatus("Upload failed.", "error");
  }
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  els.avatarUploadBtn?.addEventListener("click", uploadAvatar);

  els.avatarInput?.addEventListener("change", () => {
    const file = els.avatarInput.files?.[0];
    if (!file || !els.avatarImg) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      els.avatarImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================
   BOOT
========================= */

export function bootAvatar() {
  bindEvents();
  loadAvatar();
}
