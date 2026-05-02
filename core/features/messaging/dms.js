// =========================
// RICH BIZNESS DM SYSTEM
// /core/features/messages/dm.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== INIT =====
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;
let currentThreadId = null;

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function safe(v, f = "") {
  return v ?? f;
}

// =========================
// INIT
// =========================
export async function initDM() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// CREATE OR GET THREAD
// =========================
export async function openDM(otherUserId) {
  if (!currentUser) {
    alert("Sign in first");
    return;
  }

  // 1. try to find existing thread
  const { data: existing } = await supabase
    .from("dm_thread_members")
    .select("thread_id")
    .eq("user_id", currentUser.id);

  if (existing?.length) {
    for (const row of existing) {
      const { data: members } = await supabase
        .from("dm_thread_members")
        .select("*")
        .eq("thread_id", row.thread_id);

      const hasBoth =
        members.some(m => m.user_id === currentUser.id) &&
        members.some(m => m.user_id === otherUserId);

      if (hasBoth) {
        currentThreadId = row.thread_id;
        await loadMessages();
        return row.thread_id;
      }
    }
  }

  // 2. create new thread
  const threadId = crypto.randomUUID();

  await supabase.from("dm_thread_members").insert([
    { thread_id: threadId, user_id: currentUser.id },
    { thread_id: threadId, user_id: otherUserId }
  ]);

  currentThreadId = threadId;

  await loadMessages();

  return threadId;
}

// =========================
// LOAD MESSAGES
// =========================
export async function loadMessages() {
  if (!currentThreadId) return;

  const container = $("dmMessages");

  if (!container) return;

  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", currentThreadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  renderMessages(data || []);
}

// =========================
// RENDER MESSAGES
// =========================
function renderMessages(messages) {
  const container = $("dmMessages");
  if (!container) return;

  if (!messages.length) {
    container.innerHTML = `<div>No messages yet</div>`;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isMe = msg.sender_id === currentUser?.id;

    return `
      <div class="dm-msg ${isMe ? "me" : "them"}">
        <div class="dm-bubble">
          ${safe(msg.content)}
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

// =========================
// SEND MESSAGE
// =========================
export async function sendMessage(content) {
  if (!currentUser || !currentThreadId) return;

  if (!content.trim()) return;

  const { error } = await supabase
    .from("dm_messages")
    .insert([
      {
        thread_id: currentThreadId,
        sender_id: currentUser.id,
        content
      }
    ]);

  if (error) {
    console.error("Send message error:", error);
    return;
  }

  await loadMessages();
}

// =========================
// REALTIME LISTENER
// =========================
export function subscribeToMessages() {
  if (!currentThreadId) return;

  supabase
    .channel("dm-" + currentThreadId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `thread_id=eq.${currentThreadId}`
      },
      () => {
        loadMessages();
      }
    )
    .subscribe();
}

// =========================
// INPUT BINDING
// =========================
export function bindDMInput(inputId, buttonId) {
  const input = $(inputId);
  const button = $(buttonId);

  if (!input || !button) return;

  button.onclick = () => {
    sendMessage(input.value);
    input.value = "";
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage(input.value);
      input.value = "";
    }
  });
}
