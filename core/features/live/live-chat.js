import { supabase } from "/core/supabase.js";

let chatChannel = null;
let activeStreamId = null;
let activeUserId = null;
let activeListEl = null;
let activeFormEl = null;
let activeInputEl = null;
let activeCountEl = null;
let onMessageCallback = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function normalizeProfile(profile) {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
}

function getAuthorName(message = {}) {
  const profile = normalizeProfile(message.profiles);
  return (
    profile?.display_name ||
    profile?.username ||
    message?.author_name ||
    "Rich Bizness User"
  );
}

function getAuthorAvatar(message = {}) {
  const profile = normalizeProfile(message.profiles);
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    message?.author_avatar ||
    "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png"
  );
}

function scrollChatToBottom() {
  if (!activeListEl) return;
  activeListEl.scrollTop = activeListEl.scrollHeight;
}

function renderEmptyState(message = "No chat messages yet.") {
  if (!activeListEl) return;
  activeListEl.innerHTML = `
    <div class="rb-live-chat-empty">
      <strong>${escapeHtml(message)}</strong>
      <span>Start the conversation in the room.</span>
    </div>
  `;
  updateMessageCount(0);
}

function updateMessageCount(count = 0) {
  if (!activeCountEl) return;
  activeCountEl.textContent = Number(count || 0).toLocaleString();
}

function messageTemplate(message = {}) {
  const mine = activeUserId && message.user_id === activeUserId;
  const author = getAuthorName(message);
  const avatar = getAuthorAvatar(message);
  const text = escapeHtml(message.message || message.text || "");
  const time = safeDate(message.created_at);

  return `
    <article class="rb-live-chat-message ${mine ? "is-mine" : ""}" data-message-id="${escapeHtml(message.id || "")}">
      <img class="rb-live-chat-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" />
      <div class="rb-live-chat-bubble">
        <div class="rb-live-chat-meta">
          <strong>${escapeHtml(author)}</strong>
          <span>${escapeHtml(time)}</span>
        </div>
        <p>${text}</p>
      </div>
    </article>
  `;
}

function renderMessages(messages = []) {
  if (!activeListEl) return;

  if (!messages.length) {
    renderEmptyState();
    return;
  }

  activeListEl.innerHTML = messages.map(messageTemplate).join("");
  updateMessageCount(messages.length);
  scrollChatToBottom();
}

function appendMessage(message = {}) {
  if (!activeListEl) return;

  const empty = activeListEl.querySelector(".rb-live-chat-empty");
  if (empty) activeListEl.innerHTML = "";

  activeListEl.insertAdjacentHTML("beforeend", messageTemplate(message));
  const total = activeListEl.querySelectorAll(".rb-live-chat-message").length;
  updateMessageCount(total);
  scrollChatToBottom();

  if (typeof onMessageCallback === "function") {
    onMessageCallback(message);
  }
}

async function bumpStreamChatCount(streamId) {
  if (!streamId) return;

  const { data } = await supabase
    .from("live_streams")
    .select("total_chat_messages")
    .eq("id", streamId)
    .single();

  const nextCount = Number(data?.total_chat_messages || 0) + 1;

  await supabase
    .from("live_streams")
    .update({
      total_chat_messages: nextCount,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", streamId);
}

export async function fetchLiveChatMessages(streamId, limit = 100) {
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select(`
      id,
      stream_id,
      user_id,
      message,
      created_at,
      profiles:user_id (
        id,
        display_name,
        username,
        avatar_url,
        profile_image_url
      )
    `)
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[live-chat] fetchLiveChatMessages error:", error);
    throw error;
  }

  return data || [];
}

export async function sendLiveChatMessage({
  streamId,
  userId,
  message
}) {
  const cleanMessage = String(message || "").trim();

  if (!streamId) {
    throw new Error("Missing stream id.");
  }

  if (!userId) {
    throw new Error("You must be logged in to chat.");
  }

  if (!cleanMessage) {
    throw new Error("Message is empty.");
  }

  const { data, error } = await supabase
    .from("live_chat_messages")
    .insert({
      stream_id: streamId,
      user_id: userId,
      message: cleanMessage
    })
    .select(`
      id,
      stream_id,
      user_id,
      message,
      created_at,
      profiles:user_id (
        id,
        display_name,
        username,
        avatar_url,
        profile_image_url
      )
    `)
    .single();

  if (error) {
    console.error("[live-chat] sendLiveChatMessage error:", error);
    throw new Error(error.message || "Could not send chat message.");
  }

  await bumpStreamChatCount(streamId);
  return data;
}

function removeExistingChannel() {
  if (chatChannel) {
    supabase.removeChannel(chatChannel);
    chatChannel = null;
  }
}

function bindRealtime(streamId) {
  removeExistingChannel();

  chatChannel = supabase
    .channel(`rb-live-chat-${streamId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`
      },
      async () => {
        try {
          const messages = await fetchLiveChatMessages(streamId);
          renderMessages(messages);
        } catch (error) {
          console.error("[live-chat] realtime refresh error:", error);
        }
      }
    )
    .subscribe((status) => {
      console.log("[live-chat] realtime status:", status);
    });
}

function bindForm() {
  if (!activeFormEl || !activeInputEl) return;

  activeFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = activeFormEl.querySelector('button[type="submit"]');
    const draft = activeInputEl.value;

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      await sendLiveChatMessage({
        streamId: activeStreamId,
        userId: activeUserId,
        message: draft
      });

      activeInputEl.value = "";
      activeInputEl.focus();
    } catch (error) {
      console.error("[live-chat] submit error:", error);
      window.alert(error.message || "Could not send message.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

export async function bootLiveChat({
  streamId,
  userId = null,
  listElementId = "live-chat-list",
  formElementId = "live-chat-form",
  inputElementId = "live-chat-input",
  countElementId = "live-chat-count",
  onMessage = null
} = {}) {
  activeStreamId = streamId || null;
  activeUserId = userId || null;
  activeListEl = document.getElementById(listElementId);
  activeFormEl = document.getElementById(formElementId);
  activeInputEl = document.getElementById(inputElementId);
  activeCountEl = document.getElementById(countElementId);
  onMessageCallback = onMessage;

  if (!activeListEl) {
    console.warn("[live-chat] Missing chat list element.");
    return;
  }

  if (!activeStreamId) {
    renderEmptyState("No stream loaded for chat.");
    return;
  }

  try {
    const messages = await fetchLiveChatMessages(activeStreamId);
    renderMessages(messages);
    bindRealtime(activeStreamId);
    bindForm();
  } catch (error) {
    console.error("[live-chat] boot error:", error);
    renderEmptyState("Chat could not load right now.");
  }
}

export function destroyLiveChat() {
  removeExistingChannel();

  activeStreamId = null;
  activeUserId = null;
  activeListEl = null;
  activeFormEl = null;
  activeInputEl = null;
  activeCountEl = null;
  onMessageCallback = null;
}
