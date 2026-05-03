// =========================
// RICH BIZNESS — MUSIC UPLOAD SYSTEM
// /core/pages/upload.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
const user = getCurrentUserState();

mountEliteNav({ target: "#elite-platform-nav" });

const form = document.getElementById("upload-form");
const statusEl = document.getElementById("upload-status");
const player = document.getElementById("preview-player");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!user) {
    alert("You must be signed in");
    return;
  }

  statusEl.innerText = "Uploading...";

  try {
    const title = document.getElementById("title").value;
    const artist = document.getElementById("artist").value;
    const genre = document.getElementById("genre").value;

    const audioFile = document.getElementById("audio").files[0];
    const coverFile = document.getElementById("cover").files[0];

    // =========================
    // 1. Upload AUDIO
    // =========================

    const audioPath = `${user.id}/${Date.now()}-${audioFile.name}`;

    const { error: audioError } = await supabase.storage
      .from("music-files")
      .upload(audioPath, audioFile);

    if (audioError) throw audioError;

    const { data: audioUrlData } = supabase.storage
      .from("music-files")
      .getPublicUrl(audioPath);

    const audioUrl = audioUrlData.publicUrl;

    // =========================
    // 2. Upload COVER (optional)
    // =========================

    let coverUrl = null;

    if (coverFile) {
      const coverPath = `${user.id}/${Date.now()}-${coverFile.name}`;

      const { error: coverError } = await supabase.storage
        .from("music-covers")
        .upload(coverPath, coverFile);

      if (coverError) throw coverError;

      const { data: coverUrlData } = supabase.storage
        .from("music-covers")
        .getPublicUrl(coverPath);

      coverUrl = coverUrlData.publicUrl;
    }

    // =========================
    // 3. INSERT INTO DATABASE
    // =========================

    const { error: dbError } = await supabase
      .from("tracks")
      .insert({
        creator_id: user.id,
        title,
        artist_name: artist,
        genre,
        audio_url: audioUrl,
        cover_url: coverUrl,
        is_explicit: false,
        is_featured: false,
        play_count: 0,
        like_count: 0
      });

    if (dbError) throw dbError;

    // =========================
    // 4. SUCCESS
    // =========================

    statusEl.innerText = "🔥 Uploaded successfully";

    player.src = audioUrl;
    player.style.display = "block";
    player.play();

  } catch (err) {
    console.error(err);
    statusEl.innerText = "❌ Upload failed";
  }
});
