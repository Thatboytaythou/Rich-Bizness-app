// =========================
// RICH BIZNESS — WATCH DM SYSTEM (FINAL ELITE)
// /core/features/live/watch-dm.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

let currentUser = null;
let activeThreadId = null;
let targetUserId = null;

// =========================
// ELEMENTS
// =========================

const els = {
  dmPanel: document.getElementById("watch-dm-panel"),
  dmList: document.getElementById("watch-dm-messages"),
  dmForm: document.getElementById("watch-dm-form"),
  dmInput: document.getElementById("watch-dm-input"),
  dmClose: document.getElementById("watch-dm-close"),
  dmUserLabel: document.getElementById("watch-dm-user")
};

// =========================
// INIT
// =========================

export function initWatchDM() {
  currentUser = getCurrentUserState();

  bindEvents();

  console.log("📩 DM system ready");
}

// =========================
// OPEN DM
// =========================

export async function openDM(userId) {
  if (!currentUser?.id || !userId) return;

  targetUserId = userId;

  // Find existing thread
  let { data: existing } = await supabase
    .from("dm_thread_members")
    .select("thread_id")
    .eq("user_id", currentUser.id);

  let threadId = null;

  if (existing?.length) {
    for (let row of existing) {
      const { data: members } = await supabase
        .from("dm_thread_members")
        .select("user_id")
        .eq("thread_id", row.thread_id);

      const ids = members.map((m) => m.user_id);

      if (ids.includes(userId)) {
        threadId = row.thread_id;
        break;
      }
    }
  }

  // Create thread if none
  if (!threadId) {
    const { data: newThread } = await supabase
      .from("dm_threads")
      .insert({
        created_by: currentUser.id,
        is_group: false
      })
      .select("*")
      .single();

    threadId = newThread.id;

    await supabase.from("dm_thread_members").insert([
      { thread_id: threadId, user_id: currentUser.id },
      { thread_id: threadId, user_id: userId }
    ]);
  }

  activeThreadId = threadId;

  await loadMessages();
  subscribeToThread();

  showPanel();

  await loadTargetUser();
}

// =========================
// LOAD TARGET USER NAME
// =========================

async function loadTargetUser() {
  if (!targetUserId) return;

  const { data } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", targetUserId)
    .maybeSingle();

  if (els.dmUserLabel) {
    els.dmUserLabel.textContent =
      data?.display_name || data?.username || "User";
  }
}

// =========================
// LOAD MESSAGES
// =========================

async function loadMessages() {
  if (!activeThreadId) return;

  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", activeThreadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ load DM failed", error);
    return;
  }

  renderMessages(data || []);
  scrollBottom();
}

// =========================
// SEND MESSAGE
// =========================

async function sendMessage(text) {
  if (!activeThreadId || !currentUser?.id) return;

  const clean = text?.trim();
  if (!clean) return;

  const { error } = await supabase
    .from("dm_messages")
    .insert({
      thread_id: activeThreadId,
      sender_id: currentUser.id,
      body: clean,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ DM send failed", error);
  }
}

// =========================
// REALTIME
// =========================

let channel = null;

function subscribeToThread() {
  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase
    .channel("dm-thread-" + activeThreadId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `thread_id=eq.${activeThreadId}`
      },
      (payload) => {
        appendMessage(payload.new);
        scrollBottom();
      }
    )
    .subscribe();
}

// =========================
// RENDER
// =========================

function renderMessages(messages) {
  if (!els.dmList) return;

  els.dmList.innerHTML = messages.map(renderMessageHTML).join("");
}

function appendMessage(msg) {
  if (!els.dmList) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderMessageHTML(msg);

  els.dmList.appendChild(wrapper.firstElementChild);
}

function renderMessageHTML(msg) {
  const isMe = msg.sender_id === currentUser.id;

  return `
    <div class="dm-message ${isMe ? "me" : "them"}">
      <div class="dm-bubble">
        ${escapeHTML(msg.body)}
      </div>
    </div>
  `;
}

// =========================
// PANEL CONTROL
// =========================

function showPanel() {
  els.dmPanel?.classList.add("active");
}

function hidePanel() {
  els.dmPanel?.classList.remove("active");
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.dmForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const value = els.dmInput?.value;

    await sendMessage(value);

    if (els.dmInput) els.dmInput.value = "";
  });

  els.dmClose?.addEventListener("click", hidePanel);
}

// =========================
// HELPERS
// =========================

function scrollBottom() {
  if (!els.dmList) return;
  els.dmList.scrollTop = els.dmList.scrollHeight;
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
