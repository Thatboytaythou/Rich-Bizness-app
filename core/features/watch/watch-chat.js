// =========================
// RICH BIZNESS — WATCH CHAT (FINAL ELITE)
// /core/features/live/watch-chat.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let streamId = null;

// =========================
// ELEMENTS
// =========================

const els = {
  chatList: document.getElementById("watch-chat-list"),
  chatForm: document.getElementById("watch-chat-form"),
  chatInput: document.getElementById("watch-chat-input")
};

// =========================
// INIT
// =========================

export async function initWatchChat({ stream }) {
  currentUser = getCurrentUserState();
  streamId = stream?.id;

  if (!streamId) {
    console.warn("❌ chat missing stream id");
    return;
  }

  bindEvents();

  await loadMessages();
  subscribeToChat();

  console.log("💬 Chat Ready");
}

// =========================
// SEND MESSAGE
// =========================

async function sendMessage(text) {
  if (!currentUser?.id || !streamId) return;

  const clean = text?.trim();

  if (!clean || clean.length < 1) return;
  if (clean.length > 2000) return;

  const { error } = await supabase
    .from("live_chat_messages")
    .insert({
      stream_id: streamId,
      user_id: currentUser.id,
      message: clean,
      message_type: "text",
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ send message failed", error);
  }
}

// =========================
// LOAD MESSAGES
// =========================

async function loadMessages() {
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select(`
      id,
      message,
      user_id,
      created_at,
      is_deleted,
      profiles:profiles(display_name, username, avatar_url)
    `)
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("❌ load messages failed", error);
    return;
  }

  renderMessages(data || []);
  scrollToBottom();
}

// =========================
// REALTIME SUBSCRIBE
// =========================

function subscribeToChat() {
  supabase
    .channel("live-chat-" + streamId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`
      },
      async (payload) => {
        const msg = payload.new;

        if (!msg || msg.is_deleted) return;

        const enriched = await enrichMessage(msg);

        appendMessage(enriched);
        scrollToBottom();
      }
    )
    .subscribe();
}

// =========================
// ENRICH MESSAGE (GET USER)
// =========================

async function enrichMessage(msg) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", msg.user_id)
    .maybeSingle();

  return {
    ...msg,
    profiles: data || null
  };
}

// =========================
// RENDER MESSAGES
// =========================

function renderMessages(messages = []) {
  if (!els.chatList) return;

  els.chatList.innerHTML = messages
    .filter((m) => !m.is_deleted)
    .map(renderMessageHTML)
    .join("");
}

// =========================
// APPEND SINGLE MESSAGE
// =========================

function appendMessage(message) {
  if (!els.chatList) return;

  const html = renderMessageHTML(message);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  els.chatList.appendChild(wrapper.firstElementChild);
}

// =========================
// MESSAGE TEMPLATE
// =========================

function renderMessageHTML(msg) {
  const user = msg.profiles || {};

  const name =
    user.display_name ||
    user.username ||
    "User";

  const avatar =
    user.avatar_url ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png";

  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `
    <div class="chat-message">
      <img class="chat-avatar" src="${avatar}" />

      <div class="chat-body">
        <div class="chat-meta">
          <strong class="chat-name">${name}</strong>
          <span class="chat-time">${time}</span>
        </div>

        <div class="chat-text">
          ${escapeHTML(msg.message)}
        </div>
      </div>
    </div>
  `;
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  if (!els.chatForm) return;

  els.chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const value = els.chatInput?.value;

    await sendMessage(value);

    if (els.chatInput) {
      els.chatInput.value = "";
    }
  });
}

// =========================
// HELPERS
// =========================

function scrollToBottom() {
  if (!els.chatList) return;

  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
