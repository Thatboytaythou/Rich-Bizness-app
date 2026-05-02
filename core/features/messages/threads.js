// =========================
// RICH BIZNESS DM THREAD SYSTEM
// /core/features/messages/threads.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;

// =========================
// INIT
// =========================
export async function initThreads() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// GET OR CREATE THREAD
// =========================
export async function getOrCreateThread(otherUserId) {
  if (!currentUser) return null;

  // check existing thread
  const { data: existingThreads } = await supabase
    .from("dm_thread_members")
    .select("thread_id")
    .eq("user_id", currentUser.id);

  const threadIds = existingThreads?.map(t => t.thread_id) || [];

  if (threadIds.length) {
    const { data: match } = await supabase
      .from("dm_thread_members")
      .select("*")
      .in("thread_id", threadIds)
      .eq("user_id", otherUserId);

    if (match?.length) {
      return match[0].thread_id;
    }
  }

  // create new thread
  const { data: newThread } = await supabase
    .from("dm_threads")
    .insert([{}])
    .select()
    .single();

  const threadId = newThread.id;

  // add members
  await supabase.from("dm_thread_members").insert([
    { thread_id: threadId, user_id: currentUser.id },
    { thread_id: threadId, user_id: otherUserId }
  ]);

  return threadId;
}

// =========================
// LOAD USER THREADS (INBOX)
// =========================
export async function loadThreads() {
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from("dm_thread_members")
    .select(`
      thread_id,
      dm_threads (
        id,
        created_at
      )
    `)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Thread load error:", error);
    return [];
  }

  const threadIds = data.map(t => t.thread_id);

  // get last messages
  const { data: messages } = await supabase
    .from("dm_messages")
    .select("*")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  // group latest message per thread
  const latestMap = {};
  for (const msg of messages) {
    if (!latestMap[msg.thread_id]) {
      latestMap[msg.thread_id] = msg;
    }
  }

  return threadIds.map(id => ({
    thread_id: id,
    last_message: latestMap[id] || null
  }));
}

// =========================
// LOAD THREAD MESSAGES
// =========================
export async function loadThreadMessages(threadId) {
  if (!threadId) return [];

  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Message load error:", error);
    return [];
  }

  return data || [];
}

// =========================
// SEND MESSAGE
// =========================
export async function sendMessage(threadId, content) {
  if (!currentUser || !content) return;

  await supabase.from("dm_messages").insert([
    {
      thread_id: threadId,
      sender_id: currentUser.id,
      content
    }
  ]);
}

// =========================
// REALTIME THREAD UPDATES
// =========================
export function subscribeToThread(threadId, onUpdate) {
  supabase
    .channel("thread-" + threadId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `thread_id=eq.${threadId}`
      },
      () => {
        if (onUpdate) onUpdate();
      }
    )
    .subscribe();
}

// =========================
// MARK AS READ (optional future)
// =========================
export async function markThreadRead(threadId) {
  // placeholder (depends on your unread system)
}
