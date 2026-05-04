/* =========================
   RICH BIZNESS — UPLOAD CAPITAL ENGINE (FIXED)
   /core/pages/upload.js
========================= */

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

// =========================
// STATE
// =========================
let uploadType = "music";

// =========================
// ELEMENTS
// =========================
const form = document.getElementById("upload-form");
const statusBox = document.getElementById("upload-status");

const titleInput = document.getElementById("title");
const subtitleInput = document.getElementById("subtitle");
const categoryInput = document.getElementById("category");

const mainFileInput = document.getElementById("main-file");
const coverFileInput = document.getElementById("cover-file");

// =========================
// SET TYPE
// =========================
window.setType = (type) => {
  uploadType = type;
  statusBox.innerText = Selected: ${type.toUpperCase()};
};

// =========================
// STORAGE UPLOAD
// =========================
async function uploadToStorage(file, folder = "uploads") {
  if (!file) return null;

  const fileName = ${Date.now()}_${file.name};
  const filePath = ${folder}/${fileName};

  const { error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// =========================
// MONETIZATION
// =========================
async function createMonetization({ title, creatorId, priceCents, contentId }) {

  const { data: product, error } = await supabase
    .from("products")
    .insert([{
      name: title,
      price_cents: priceCents,
      creator_id: creatorId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error("Product error:", error);
    return;
  }

  await supabase.from("premium_content").insert([{
    creator_id: creatorId,
    content_type: uploadType,
    content_id: contentId,
    title,
    price_cents: priceCents,
    is_active: true,
    created_at: new Date().toISOString()
  }]);

  return product;
}

// =========================
// INSERT ROUTER
// =========================
async function insertByType(payload) {

  let table = null;

  if (uploadType === "music") table = "tracks";
  if (uploadType === "podcast") table = "podcast_episodes";
  if (uploadType === "gaming") table = "gaming_uploads";
  if (uploadType === "sports") table = "sports_uploads";
  if (uploadType === "art") table = "artworks";
  if (uploadType === "metaverse") table = "uploads";
  if (uploadType === "receipt") table = "payments";

  if (!table) throw new Error("Invalid upload type");

  const { data, error } = await supabase
    .from(table)
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  return data;
}

// =========================
// MAIN SUBMIT
// =========================
form.onsubmit = async (e) => {
  e.preventDefault();

  try {
    if (!user) {
      alert("You must be signed in");
      return;
    }

    statusBox.innerText = "Uploading...";

    const title = titleInput.value.trim();
    const subtitle = subtitleInput.value.trim();
    const category = categoryInput.value.trim();

    const mainFile = mainFileInput.files[0];
    const coverFile = coverFileInput.files[0];

    if (!mainFile) {
      alert("Main file required");
      return;
    }

    // =========================
    // UPLOAD FILES
    // =========================
    const fileUrl = await uploadToStorage(mainFile, uploadType);
    const coverUrl = await uploadToStorage(coverFile, ${uploadType}/covers);

    // =========================
    // BASE PAYLOAD
    // =========================
    const base = {
      title,
      creator_id: user.id,
      created_at: new Date().toISOString()
    };

    let payload = {};

    if (uploadType === "music") {
      payload = {
        ...base,
        artist_name: subtitle,
        genre: category,
        audio_url: fileUrl,
        cover_url: coverUrl,
        play_count: 0,
        like_count: 0
      };
    }

    if (uploadType === "sports") {
      payload = {
        ...base,
        caption: subtitle,
        sport_name: category,
        file_url: fileUrl,
        thumbnail_url: coverUrl
      };
    }

    if (uploadType === "gaming") {
      payload = {
        ...base,
        game: category,
        file_url: fileUrl
      };
    }

    if (uploadType === "podcast") {
      payload = {
        ...base,
        description: subtitle,
        audio_url: fileUrl,
        cover_url: coverUrl
      };
    }

    if (uploadType === "art") {
      payload = {
        ...base,
        image_url: fileUrl,
        description: subtitle
      };
    }

    if (uploadType === "metaverse") {
      payload = {
        ...base,
        file_url: fileUrl,
        type: category
      };
    }

    if (uploadType === "receipt") {
      payload = {
        user_id: user.id,
        amount: 0,
        type: "receipt",
        status: "uploaded",
        metadata: { file_url: fileUrl },
        created_at: new Date().toISOString()
      };
    }

    // =========================
    // INSERT
    // =========================
    const data = await insertByType(payload);

    // =========================
    // MONETIZATION
    // =========================
    await createMonetization({
      title,
      creatorId: user.id,
      priceCents: 199,
      contentId: data.id
    });

    console.log("UPLOAD SUCCESS:", data);

    statusBox.innerText = "🔥 Upload Complete";

    form.reset();

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    statusBox.innerText = "❌ Upload failed";
  }
};
