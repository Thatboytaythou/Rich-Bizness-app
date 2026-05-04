/* =========================
   RICH BIZNESS — MASTER UPLOAD ENGINE
========================= */

export function createUploadEngine({ supabase, user }) {

  if (!supabase || !user) {
    throw new Error("Upload engine missing supabase or user");
  }

  // =========================
  // STORAGE
  // =========================
  async function uploadFile(file, path) {
    const name = ${Date.now()}_${file.name};

    const { error } = await supabase.storage
      .from("uploads")
      .upload(${path}/${name}, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("uploads")
      .getPublicUrl(${path}/${name});

    return data.publicUrl;
  }

  // =========================
  // ROUTE CONTENT → TABLE
  // =========================
  async function routeInsert(type, payload) {

    const map = {
      music: "tracks",
      sports: "sports_uploads",
      gaming: "gaming_uploads",
      podcast: "podcast_episodes",
      art: "artworks",
      metaverse: "uploads"
    };

    const table = map[type];

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
  // MONETIZATION (AUTO)
  // =========================
  async function attachMonetization({ title, contentId, creatorId }) {

    const price = 199;

    // product
    const { data: product } = await supabase
      .from("products")
      .insert([{
        name: title,
        price_cents: price,
        creator_id: creatorId
      }])
      .select()
      .single();

    // unlock system
    await supabase.from("user_product_unlocks").insert([]);

    // premium content
    await supabase.from("premium_content").insert([{
      creator_id: creatorId,
      content_type: "music",
      content_id: contentId,
      price_cents: price,
      is_active: true
    }]);

    return product;
  }

  // =========================
  // MAIN UPLOAD FLOW
  // =========================
  async function upload({ type, file, cover, meta }) {

    const fileUrl = await uploadFile(file, type);

    let coverUrl = null;
    if (cover) {
      coverUrl = await uploadFile(cover, ${type}/covers);
    }

    const base = {
      creator_id: user.id,
      created_at: new Date().toISOString()
    };

    let payload = {};

    if (type === "music") {
      payload = {
        ...base,
        title: meta.title,
        artist_name: meta.subtitle,
        genre: meta.category,
        audio_url: fileUrl,
        cover_url: coverUrl
      };
    }

    if (type === "sports") {
      payload = {
        ...base,
        title: meta.title,
        caption: meta.subtitle,
        file_url: fileUrl,
        thumbnail_url: coverUrl
      };
    }

    // INSERT
    const record = await routeInsert(type, payload);

    // MONETIZE
    await attachMonetization({
      title: meta.title,
      contentId: record.id,
      creatorId: user.id
    });

    return record;
  }

  return {
    upload
  };
}
