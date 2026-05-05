import { supabase } from "/core/supabase.js";

export async function distributeContent({
  type,
  userId,
  title,
  description,
  fileUrl
}) {
  // 1. ALWAYS insert into global feed
  await supabase.from("posts").insert({
    user_id: userId,
    title,
    description,
    media_url: fileUrl,
    content_type: type,
    created_at: new Date()
  });

  // 2. Route to specific systems
  if (type === "music") {
    await supabase.from("music_uploads").insert({
      user_id: userId,
      title,
      audio_url: fileUrl
    });
  }

  if (type === "gaming") {
    await supabase.from("gaming_uploads").insert({
      user_id: userId,
      title,
      file_url: fileUrl
    });
  }

  if (type === "sports") {
    await supabase.from("sports_uploads").insert({
      user_id: userId,
      title,
      file_url: fileUrl
    });
  }

  if (type === "gallery") {
    await supabase.from("artworks").insert({
      user_id: userId,
      title,
      image_url: fileUrl
    });
  }

  // 3. Profile auto-sync (no extra insert needed if using posts)
  // Profile reads from posts table
}
