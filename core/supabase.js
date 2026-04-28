// =========================
// RICH BIZNESS SUPABASE CORE — FINAL REPAIR
// /core/supabase.js
// Shared Supabase client + auth/profile/storage/database helpers
// =========================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
  TABLES,
  STORAGE_BUCKETS
} from "/core/config.js";

export const SUPABASE_URL =
  window.NEXT_PUBLIC_SUPABASE_URL ||
  window.SUPABASE_URL ||
  SUPABASE_PROJECT_URL ||
  "https://ksvdequymkceevocgpdj.supabase.co";

export const SUPABASE_BROWSER_KEY =
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  window.SUPABASE_PUBLISHABLE_KEY ||
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

let browserSupabase = null;

export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_BROWSER_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    },
    global: {
      headers: {
        "x-rich-bizness-client": "web"
      }
    }
  });
}

export function getSupabaseClient() {
  if (!browserSupabase) {
    browserSupabase = createBrowserClient();
  }
  return browserSupabase;
}

export const supabase = getSupabaseClient();

/* =========================
   AUTH HELPERS
========================= */

export async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[core/supabase] getSession:", error.message);
    return null;
  }

  return session || null;
}

export async function getUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[core/supabase] getUser:", error.message);
    return null;
  }

  return user || null;
}

export async function requireUser(redirectTo = "/auth.html") {
  const session = await getSession();
  const user = session?.user || null;

  if (!user && redirectTo) {
    window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.href)}`;
    return null;
  }

  return user;
}

export async function signOut(redirectTo = "/index.html") {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[core/supabase] signOut:", error.message);
    throw error;
  }

  if (redirectTo) window.location.href = redirectTo;
  return true;
}

/* =========================
   PROFILE HELPERS
========================= */

export async function getProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] getProfile:", error.message);
    return null;
  }

  return data || null;
}

export async function getCurrentProfile() {
  const user = await getUser();
  if (!user?.id) return null;
  return getProfile(user.id);
}

export async function upsertProfile(profile = {}) {
  if (!profile?.id) {
    throw new Error("Profile id is required.");
  }

  const payload = {
    ...profile,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(TABLES.profiles)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] upsertProfile:", error.message);
    throw error;
  }

  return data || null;
}

/* =========================
   FOLLOW HELPERS
========================= */

export async function isFollowing(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;

  const { data, error } = await supabase
    .from(TABLES.followers)
    .select("id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] isFollowing:", error.message);
    return false;
  }

  return !!data;
}

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error("Both followerId and followingId are required.");
  }

  if (followerId === followingId) {
    throw new Error("You cannot follow yourself.");
  }

  const { data, error } = await supabase
    .from(TABLES.followers)
    .upsert(
      {
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      },
      { onConflict: "follower_id,following_id" }
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] followUser:", error.message);
    throw error;
  }

  return data || null;
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error("Both followerId and followingId are required.");
  }

  const { error } = await supabase
    .from(TABLES.followers)
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) {
    console.error("[core/supabase] unfollowUser:", error.message);
    throw error;
  }

  return true;
}

/* =========================
   MONEY HELPERS
========================= */

export async function getCreatorBalance(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from(TABLES.creatorAvailableBalances)
    .select("*")
    .eq("artist_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[core/supabase] getCreatorBalance:", error.message);
    return null;
  }

  return data || null;
}

export async function getTipsForCreator(userId, limit = 25) {
  if (!userId) return [];

  return listRows(TABLES.tips, {
    filters: { to_user_id: userId },
    orderBy: "created_at",
    ascending: false,
    limit
  });
}

/* =========================
   GENERIC DATABASE HELPERS
========================= */

export async function listRows(
  table,
  {
    select = "*",
    filters = {},
    orderBy = "created_at",
    ascending = false,
    limit = 50,
    maybe = false
  } = {}
) {
  let query = supabase.from(table).select(select);

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  if (orderBy) query = query.order(orderBy, { ascending });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.warn(`[core/supabase] listRows(${table}):`, error.message);
    return maybe ? null : [];
  }

  return data || [];
}

export async function getRowById(
  table,
  id,
  {
    select = "*",
    idColumn = "id"
  } = {}
) {
  if (id === undefined || id === null) return null;

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(idColumn, id)
    .maybeSingle();

  if (error) {
    console.warn(`[core/supabase] getRowById(${table}):`, error.message);
    return null;
  }

  return data || null;
}

export async function insertRow(table, payload, { single = false } = {}) {
  const query = supabase.from(table).insert(payload).select("*");

  const { data, error } = single
    ? await query.maybeSingle()
    : await query;

  if (error) {
    console.error(`[core/supabase] insertRow(${table}):`, error.message);
    throw error;
  }

  return data || (single ? null : []);
}

export async function upsertRow(
  table,
  payload,
  {
    onConflict = "id",
    single = false
  } = {}
) {
  const query = supabase
    .from(table)
    .upsert(payload, { onConflict })
    .select("*");

  const { data, error } = single
    ? await query.maybeSingle()
    : await query;

  if (error) {
    console.error(`[core/supabase] upsertRow(${table}):`, error.message);
    throw error;
  }

  return data || (single ? null : []);
}

export async function updateRows(table, filters = {}, payload = {}) {
  const updatePayload = {
    ...payload,
    updated_at: payload.updated_at || new Date().toISOString()
  };

  let query = supabase.from(table).update(updatePayload);

  Object.entries(filters || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query.select("*");

  if (error) {
    console.error(`[core/supabase] updateRows(${table}):`, error.message);
    throw error;
  }

  return data || [];
}

export async function deleteRows(table, filters = {}) {
  let query = supabase.from(table).delete();

  Object.entries(filters || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { error } = await query;

  if (error) {
    console.error(`[core/supabase] deleteRows(${table}):`, error.message);
    throw error;
  }

  return true;
}

export async function countRows(table, filters = {}) {
  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  Object.entries(filters || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { count, error } = await query;

  if (error) {
    console.warn(`[core/supabase] countRows(${table}):`, error.message);
    return 0;
  }

  return count || 0;
}

export async function sumColumn(table, column, filters = {}, limit = 1000) {
  let query = supabase.from(table).select(column).limit(limit);

  Object.entries(filters || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query;

  if (error) {
    console.warn(`[core/supabase] sumColumn(${table}.${column}):`, error.message);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + Number(row?.[column] || 0), 0);
}

/* =========================
   STORAGE HELPERS
========================= */

export function getPublicURL(bucket, path = "") {
  if (!bucket || !path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${String(path).replace(/^\/+/, "")}`;
}

export function getStorageObjectUrl(bucket, path = "") {
  return getPublicURL(bucket, path);
}

export function cleanStoragePath(path = "") {
  return String(path || "")
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._/-]/g, "");
}

export async function uploadFile(bucket, path, file, options = {}) {
  if (!bucket || !path || !file) {
    throw new Error("bucket, path, and file are required.");
  }

  const cleanPath = cleanStoragePath(path);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, file, {
      cacheControl: "3600",
      upsert: true,
      ...options
    });

  if (error) {
    console.error(`[core/supabase] uploadFile(${bucket}):`, error.message);
    throw error;
  }

  return {
    ...data,
    publicUrl: getPublicURL(bucket, cleanPath)
  };
}

export async function uploadUserFile({
  bucket = STORAGE_BUCKETS.uploads,
  userId,
  folder = "general",
  file
}) {
  if (!userId) throw new Error("userId is required.");
  if (!file) throw new Error("file is required.");

  const ext = file.name?.split(".").pop() || "bin";
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${folder}/${filename}`;

  return uploadFile(bucket, path, file);
}

/* =========================
   REALTIME HELPER
========================= */

export function subscribeToTable({
  channelName,
  table,
  event = "*",
  filter,
  callback
}) {
  if (!table || typeof callback !== "function") return null;

  const channel = supabase.channel(channelName || `rb-${table}-${Date.now()}`);

  channel.on(
    "postgres_changes",
    {
      event,
      schema: "public",
      table,
      ...(filter ? { filter } : {})
    },
    callback
  );

  channel.subscribe();
  return channel;
}

export async function removeChannel(channel) {
  if (!channel) return;
  await supabase.removeChannel(channel);
}

/* =========================
   SAFE HELPERS
========================= */

export function getErrorMessage(error, fallback = "Something went wrong.") {
  return error?.message || error?.error_description || fallback;
}

export function nowIso() {
  return new Date().toISOString();
}
