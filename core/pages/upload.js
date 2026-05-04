import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const form = document.getElementById("upload-form");
const statusEl = document.getElementById("upload-status");

let currentType = "music";

// =========================
// TYPE SWITCH
// =========================
window.setType = (type) => {
  currentType = type;
  statusEl.innerText = "Selected: " + type.toUpperCase();
};

// =========================
// UPLOAD HANDLER
// =========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!user) {
    alert("Sign in first");
    return;
  }

  statusEl.innerText = "Uploading...";

  try {
    const title = document.getElementById("title").value;
    const subtitle = document.getElementById("subtitle").value;
    const category = document.getElementById("category").value;

    const file = document.getElementById("main-file").files[0];
    const cover = document.getElementById("cover-file").files[0];

    const basePath = ${currentType}/${user.id}/${Date.now()};

    // =========================
    // UPLOAD MAIN FILE
    // =========================
    const filePath = ${basePath}-${file.name};

    const { error: fileError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file);

    if (fileError) throw fileError;

    const fileUrl = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath).data.publicUrl;

    // =========================
    // UPLOAD COVER
    // =========================
    let coverUrl = null;

    if (cover) {
      const coverPath = ${basePath}-cover-${cover.name};

      await supabase.storage
        .from("uploads")
        .upload(coverPath, cover);

      coverUrl = supabase.storage
        .from("uploads")
        .getPublicUrl(coverPath).data.publicUrl;
    }

    // =========================
    // SAVE BASE RECORD
    // =========================
    await supabase.from("uploads").insert({
      user_id: user.id,
      type: currentType,
      title,
      subtitle,
      category,
      file_url: fileUrl,
      cover_url: coverUrl
    });

    // =========================
    // TYPE-SPECIFIC TABLES
    // =========================

    if (currentType === "music") {
      await supabase.from("tracks").insert({
        creator_id: user.id,
        title,
        artist_name: subtitle,
        genre: category,
        audio_url: fileUrl,
        cover_url: coverUrl
      });
    }

    if (currentType === "gaming") {
      await supabase.from("gaming_uploads").insert({
        user_id: user.id,
        title,
        file_url: fileUrl
      });
    }

    if (currentType === "sports") {
      await supabase.from("sports_uploads").insert({
        user_id: user.id,
        title,
        file_url: fileUrl
      });
    }

    if (currentType === "receipt") {
      await supabase.from("payments").insert({
        user_id: user.id,
        type: "manual_receipt",
        status: "pending",
        metadata: { file_url: fileUrl }
      });
    }

    statusEl.innerText = "🔥 Uploaded Successfully";

  } catch (err) {
    console.error(err);
    statusEl.innerText = "❌ " + err.message;
  }
});
