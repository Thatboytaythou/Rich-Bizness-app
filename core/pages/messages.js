// =========================
// RICH BIZNESS MESSAGES SYSTEM
// /core/pages/messages.js
// =========================

import { initApp, getSupabase, getCurrentUserState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";

await initApp();

const supabase = getSupabase();
let currentUser = getCurrentUserState();

// =========================
// ELEMENTS
// =========================
const $ = (id) => document.getElementById(id);

const els = {
  nav: $("elite-platform-nav"),
  status: $("messages-status"),

  threadList: $("thread-list"),
  refreshBtn: $("refresh-threads-btn"),

  newUserId: $("new-message-user-id"),
  startBtn: $("start-message-btn"),

  chatTitle: $("chat-title"),
  chatSubtitle: $("chat-subtitle"),
  chatAvatar: $("chat-avatar"),
  chatProfileLink: $("chat-profile-link"),

  messageList: $("message-list"),
  messageForm: $("message-form"),
  messageBody: $("message-body"),
  sendBtn: $("send-message-btn")
};

mountEliteNav({
  target: "#elite-platform-nav"
});

// =========================
// STATE
// =========================
let activeThreadId = null;
let activeOtherUser = null;

// =========================
// HELPERS
// =========================
function setStatus(msg, type = "normal") {
  if (!els.status) return;
  els.status.textContent = msg;

  els.status.style.color =
    type === "error" ? "#ff6b6b" :
    type === "success" ? "#69ffb4" :
    "#f3fff8";
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// =========================
// AUTH CHECK
// =========================
async function requireAuth() {
  if (!currentUser?.id) {
    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || null;
  }

  if (!currentUser?.id) {
    window.location.href = "/auth.html";
    return false;
  }

  return true;
}

// =========================
// THREAD LOAD
// =========================
async function loadThreads() {
  if (!currentUser?.id) return;

  setStatus("Loading threads...");

  const { data, error } = await supabase
    .from("dm_thread_members")
    .select(`
      thread_id,
      dm_threads!inner (
        id,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", currentUser.id);

  if (error) {
    setStatus("Failed to load threads", "error");
    return;
  }

  if (!data?.length) {
    els.threadList.innerHTML = `
      <div class="message-empty">
        <strong>No conversations yet.</strong>
        <span>Start messaging someone.</span>
      </div>
    `;
    setStatus("No threads yet");
    return;
  }

  const threadIds = data.map(t => t.thread_id);

  // get members for names
  const { data: members } = await supabase
    .from("dm_thread_members")
    .select("thread_id, user_id")
    .in("thread_id", threadIds);

  // get profiles
  const userIds = [...new Set(members.map(m => m.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  // map threads
  els.threadList.innerHTML = data.map(t => {
    const threadId = t.thread_id;

    const people = members
      .filter(m => m.thread_id === threadId && m.user_id !== currentUser.id)
      .map(m => profiles.find(p => p.id === m.user_id));

    const name = people[0]?.display_name || people[0]?.username || "Conversation";

    return `
      <div class="thread-item" data-thread="${threadId}">
        <strong>${name}</strong>
        <span>Tap to open</span>
      </div>
    `;
  }).join("");

  // bind clicks
  document.querySelectorAll(".thread-item").forEach(el => {
    el.onclick = () => openThread(el.dataset.thread);
  });

  setStatus("Threads loaded", "success");
}

// =========================
// OPEN THREAD
// =========================
async function openThread(threadId) {
  activeThreadId = threadId;

  els.messageBody.disabled = false;
  els.sendBtn.disabled = false;

  await loadMessages();
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
    setStatus("Failed to load messages", "error");
    return;
  }

  if (!data?.length) {
    els.messageList.innerHTML = `
      <div class="message-empty">
        <strong>No messages yet.</strong>
        <span>Send the first one.</span>
      </div>
    `;
    return;
  }

  els.messageList.innerHTML = data.map(msg => {
    const mine = msg.sender_id === currentUser.id;

    return `
      <div class="message-bubble ${mine ? "mine" : "theirs"}">
        <p>${msg.body}</p>
        <span>${formatTime(msg.created_at)}</span>
      </div>
    `;
  }).join("");

  els.messageList.scrollTop = els.messageList.scrollHeight;
}

// =========================
// SEND MESSAGE
// =========================
async function sendMessage(e) {
  e.preventDefault();

  if (!activeThreadId) return;

  const body = els.messageBody.value.trim();
  if (!body) return;

  els.messageBody.value = "";

  const { error } = await supabase
    .from("dm_messages")
    .insert({
      thread_id: activeThreadId,
      sender_id: currentUser.id,
      body
    });

  if (error) {
    setStatus("Failed to send message", "error");
    return;
  }

  await loadMessages();
}

// =========================
// START THREAD
// =========================
async function startThreadWith(userId) {
  if (!userId || userId === currentUser.id) return;

  setStatus("Starting conversation...");

  // create thread
  const { data: thread, error } = await supabase
    .from("dm_threads")
    .insert({})
    .select("*")
    .single();

  if (error) {
    setStatus("Failed to create thread", "error");
    return;
  }

  // add members
  await supabase.from("dm_thread_members").insert([
    { thread_id: thread.id, user_id: currentUser.id },
    { thread_id: thread.id, user_id: userId }
  ]);

  setStatus("Conversation created", "success");

  await loadThreads();
  openThread(thread.id);
}

// =========================
// INIT
// =========================
async function bootMessages() {
  const ok = await requireAuth();
  if (!ok) return;

  // query support
  const threadParam = getQueryParam("thread");
  const userParam = getQueryParam("user");

  await loadThreads();

  if (threadParam) {
    openThread(threadParam);
  }

  if (userParam) {
    await startThreadWith(userParam);
  }

  els.refreshBtn.onclick = loadThreads;
  els.startBtn.onclick = () => startThreadWith(els.newUserId.value.trim());

  els.messageForm.addEventListener("submit", sendMessage);

  // realtime updates
  supabase
    .channel("messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dm_messages"
      },
      (payload) => {
        if (payload.new.thread_id === activeThreadId) {
          loadMessages();
        }
      }
    )
    .subscribe();

  console.log("💬 Messages system ready");
}

bootMessages();
