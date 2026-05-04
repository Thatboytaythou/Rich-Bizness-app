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
// CATEGORY SYSTEM (FULL HUB)
// =========================
const TYPE_MAP = {
  music: {
    table: "tracks",
    fileBucket: "uploads",
    build: (data) => ({
      creator_id: data.user,
      title: data.title,
      artist_name: data.subtitle,
      genre: data.category,
      audio_url: data.file,
      cover_url: data.cover
    })
  },

  podcast: {
    table: "podcast_episodes",
    fileBucket: "uploads",
    build: (data) => ({
      creator_id: data.user,
      title: data.title,
      description: data.category,
      audio_url: data.file,
      cover_url: data.cover
    })
  },

  gaming: {
    table: "gaming_uploads",
    fileBucket: "uploads",
    build: (data) => ({
      user_id: data.user,
      title: data.title,
      file_url: data.file,
      thumbnail_url: data.cover
    })
  },

  sports: {
    table: "sports_uploads",
    fileBucket: "uploads",
    build: (data) => ({
      user_id: data.user,
      title: data.title,
      caption: data.category,
      file_url: data.file,
      thumbnail_url: data.cover
    })
  },

  art: {
    table: "artworks",
    fileBucket: "uploads",
    build: (data) => ({
      user_id: data.user,
      title: data.title,
      image_url: data.file,
      description: data.category
    })
  },

  metaverse: {
    table: "metaverse_assets",
    fileBucket: "uploads",
    build: (data) => ({
      user_id: data.user,
      title: data.title,
      asset_url: data.file,
      type: data.category
    })
  },

  receipt: {
    table: "payments",
    fileBucket: "uploads",
    build: (data) => ({
      user_id: data.user,
      type: "receipt_upload",
      status: "pending",
      metadata: {
        file_url: data.file,
        note: data.title
      }
    })
  }
};

// =========================
// TYPE SWITCH
// =========================
window.setType = (type) => {
  currentType = type;
  statusEl.innerText = "Mode: " + type.toUpperCase();
};

// =========================
// UPLOAD FLOW
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

    const config = TYPE_MAP[currentType];

    if (!config) throw new Error("Invalid upload type");

    // =========================
    // FILE UPLOAD
    // =========================
    const path = ${currentType}/${user.id}/${Date.now()}-${file.name};

    const { error: uploadError } = await supabase.storage
      .from(config.fileBucket)
      .upload(path, file);

    if (uploadError) throw uploadError;

    const fileUrl = supabase.storage
      .from(config.fileBucket)
      .getPublicUrl(path).data.publicUrl;

    // =========================
    // COVER
    // =========================
    let coverUrl = null;

    if (cover) {
      const coverPath = ${currentType}/${user.id}/cover-${Date.now()}-${cover.name};

      await supabase.storage
        .from(config.fileBucket)
        .upload(coverPath, cover);

      coverUrl = supabase.storage
        .from(config.fileBucket)
        .getPublicUrl(coverPath).data.publicUrl;
    }

    // =========================
    // UNIVERSAL LOG
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
    // FEATURE TABLE INSERT
    // =========================
    const payload = config.build({
      user: user.id,
      title,
      subtitle,
      category,
      file: fileUrl,
      cover: coverUrl
    });

    await supabase.from(config.table).insert(payload);

    statusEl.innerText = "🔥 Uploaded to " + currentType.toUpperCase();

  } catch (err) {
    console.error(err);
    statusEl.innerText = "❌ " + err.message;
  }
});
