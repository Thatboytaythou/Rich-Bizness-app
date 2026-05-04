/* =========================
   RICH BIZNESS — UPLOAD CAPITAL ENGINE (ELITE)
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
// SET TYPE (HUB SWITCH)
// =========================
window.setType = (type) => {
  uploadType = type;
  statusBox.innerText = Selected: ${type.toUpperCase()};
};

// =========================
// STORAGE UPLOAD
// =========================
async function uploadToStorage(file, folder = "uploads") {
  const fileName = ${Date.now()}_${file.name};

  const { error } = await supabase.storage
    .from("uploads")
    .upload(${folder}/${fileName}, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(${folder}/${fileName});

  return data.publicUrl;
}

// =========================
// CREATE MONETIZATION
// =========================
async function createMonetization({ title, creatorId, priceCents, contentId }) {

  // 1. PRODUCT
  const { data: product } = await supabase
    .from("products")
    .insert([{
      name: title,
      price_cents: priceCents,
      creator_id: creatorId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  // 2. PREMIUM CONTENT
  await supabase.from("premium_content").insert([{
    creator_id: creatorId,
    content_type: uploadType,
    content_id: contentId,
    title,
    price_cents: priceCents,
    is_active: true
  }]);

  return product;
}

// =========================
// ROUTE INSERTS
// =========================
async function insertByType(payload) {

  if (uploadType === "music") {
    return await supabase.from("tracks").insert([payload]).select().single();
  }

  if (uploadType === "podcast") {
    return await supabase.from("podcast_episodes").insert([payload]).select().single();
  }

  if (uploadType === "gaming") {
    return await supabase.from("gaming_uploads").insert([payload]).select().single();
  }

  if (uploadType === "sports") {
    return await supabase.from("sports_uploads").insert([payload]).select().single();
  }

  if (uploadType === "art") {
    return await supabase.from("artworks").insert([payload]).select().single();
  }

  if (uploadType === "metaverse") {
    return await supabase.from("uploads").insert([payload]).select().single();
  }

  if (uploadType === "receipt") {
    return await supabase.from("payments").insert([payload]).select().single();
  }
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

    const title = titleInput.value;
    const subtitle = subtitleInput.value;
    const category = categoryInput.value;

    const mainFile = mainFileInput.files[0];
    const coverFile = coverFileInput.files[0];

    // =========================
    // UPLOAD FILES
    // =========================
    const fileUrl = await uploadToStorage(mainFile, uploadType);

    let coverUrl = null;
    if (coverFile) {
      coverUrl = await uploadToStorage(coverFile, ${uploadType}/covers);
    }

    // =========================
    // BASE PAYLOAD
    // =========================
    const basePayload = {
      title,
      creator_id: user.id,
      created_at: new Date().toISOString()
    };

    // =========================
    // TYPE CUSTOMIZATION
    // =========================
    let payload = {};

    if (uploadType === "music") {
      payload = {
        ...basePayload,
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
        ...basePayload,
        caption: subtitle,
        sport_name: category,
        file_url: fileUrl,
        thumbnail_url: coverUrl
      };
    }

    if (uploadType === "gaming") {
      payload = {
        ...basePayload,
        game: category,
        file_url: fileUrl
      };
    }

    if (uploadType === "podcast") {
      payload = {
        ...basePayload,
        description: subtitle,
        audio_url: fileUrl,
        cover_url: coverUrl
      };
    }

    if (uploadType === "art") {
      payload = {
        ...basePayload,
        image_url: fileUrl,
        description: subtitle
      };
    }

    if (uploadType === "metaverse") {
      payload = {
        ...basePayload,
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
        metadata: {
          file_url: fileUrl
        }
      };
    }

    // =========================
    // INSERT
    // =========================
    const { data, error } = await insertByType(payload);

    if (error) throw error;

    // =========================
    // AUTO MONETIZATION 💰
    // =========================
    const priceCents = 199; // default $1.99

    await createMonetization({
      title,
      creatorId: user.id,
      priceCents,
      contentId: data.id
    });

    statusBox.innerText = "🔥 Upload Complete + Monetized";

    form.reset();

  } catch (err) {
    console.error(err);
    statusBox.innerText = "❌ Upload failed";
  }
};
