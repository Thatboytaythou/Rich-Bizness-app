import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueShowSlug(title) {
  const base = slugify(title) || `podcast-${Date.now()}`;
  let slug = base;
  let attempt = 1;

  while (attempt < 20) {
    const { data, error } = await supabase
      .from("podcast_shows")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return slug;

    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

export async function getPodcastShows({ creatorId = null, search = "", limit = 50 } = {}) {
  let query = supabase
    .from("podcast_shows")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (creatorId) query = query.eq("creator_id", creatorId);
  if (search?.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPodcastShowById(showId) {
  const { data, error } = await supabase
    .from("podcast_shows")
    .select("*")
    .eq("id", showId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPodcastShow(payload) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Log in first.");

  const slug = await ensureUniqueShowSlug(payload.title || "podcast-show");

  const { data, error } = await supabase
    .from("podcast_shows")
    .insert({
      creator_id: user.id,
      title: payload.title?.trim() || "Untitled Podcast",
      slug,
      description: payload.description?.trim() || "",
      cover_url: payload.cover_url?.trim() || null,
      category: payload.category?.trim() || "talk",
      is_featured: !!payload.is_featured,
      visibility: payload.visibility || "public"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPodcastEpisodes(showId) {
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*")
    .eq("show_id", showId)
    .order("episode_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function uploadPodcastAudio(file, userId) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const filePath = `${userId}/episodes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("podcasts")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("podcasts").getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export async function createPodcastEpisode(payload) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Log in first.");

  const { data, error } = await supabase
    .from("podcast_episodes")
    .insert({
      show_id: payload.show_id,
      creator_id: user.id,
      title: payload.title?.trim() || "Untitled Episode",
      description: payload.description?.trim() || "",
      audio_url: payload.audio_url,
      cover_url: payload.cover_url?.trim() || null,
      episode_number: Number(payload.episode_number || 1),
      duration_seconds: Number(payload.duration_seconds || 0),
      is_featured: !!payload.is_featured,
      is_published: payload.is_published !== false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
