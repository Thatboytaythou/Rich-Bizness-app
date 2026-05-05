// =========================
// AVATAR SYSTEM — STATE
// =========================

import { getSupabase } from "/core/app.js";

export async function saveAvatar(file) {
  const supabase = getSupabase();

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const filePath = `avatars/${user.id}-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file);

  if (uploadError) {
    console.error(uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = data.publicUrl;

  // SAVE TO PROFILE
  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  return avatarUrl;
}

// 🔥 GET AVATAR
export async function getAvatar() {
  const supabase = getSupabase();

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  return data?.avatar_url || null;
}
