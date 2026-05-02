// =========================
// RICH BIZNESS METAVERSE SPACE — FULL SYNCED
// /core/features/metaverse/space.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

/* =========================
   ELEMENTS
========================= */

const $ = (id) => document.getElementById(id);

const els = {
  canvas: $("metaverse-canvas"),
  status: $("metaverse-status"),

  joinBtn: $("enter-meta-vision-btn"),
  exitBtn: $("exit-meta-vision-btn"),

  usersList: $("metaverse-users"),
  chatList: $("metaverse-chat-list"),
  chatInput: $("metaverse-chat-input"),
  chatSendBtn: $("metaverse-chat-send-btn")
};

/* =========================
   STATE
========================= */

let currentUser = getCurrentUserState();
let spaceChannel = null;
let presenceChannel = null;
let chatChannel = null;

let players = {};
let ctx = null;
let running = false;

/* =========================
   HELPERS
========================= */

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

function randPos() {
  return {
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 300)
  };
}

/* =========================
   CANVAS ENGINE
========================= */

function draw() {
  if (!ctx || !els.canvas) return;

  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);

  Object.values(players).forEach((p) => {
    ctx.fillStyle = p.color || "#7dff71";
    ctx.fillRect(p.x, p.y, 20, 20);

    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.fillText(p.name || "user", p.x, p.y - 5);
  });
}

function loop() {
  if (!running) return;
  draw();
  requestAnimationFrame(loop);
}

/* =========================
   PRESENCE (PLAYERS)
========================= */

function subscribePresence() {
  presenceChannel = supabase.channel("metaverse-presence");

  presenceChannel.on("presence", { event: "sync" }, () => {
    const state = presenceChannel.presenceState();

    players = {};

    Object.values(state).forEach((arr) => {
      arr.forEach((p) => {
        players[p.user_id] = p;
      });
    });

    renderUsers();
  });

  presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      const pos = randPos();

      await presenceChannel.track({
        user_id: currentUser?.id || crypto.randomUUID(),
        name: currentUser?.email?.split("@")[0] || "guest",
        x: pos.x,
        y: pos.y,
        color: "#7dff71"
      });
    }
  });
}

/* =========================
   CHAT
========================= */

function appendChat(msg) {
  if (!els.chatList) return;

  const el = document.createElement("div");
  el.className = "meta-chat-msg";
  el.innerHTML = `<strong>${msg.name}</strong>: ${msg.text}`;
  els.chatList.appendChild(el);
  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function subscribeChat() {
  chatChannel = supabase.channel("metaverse-chat");

  chatChannel.on("broadcast", { event: "message" }, ({ payload }) => {
    appendChat(payload);
  });

  chatChannel.subscribe();
}

async function sendChat() {
  const text = els.chatInput?.value?.trim();
  if (!text) return;

  const msg = {
    name: currentUser?.email?.split("@")[0] || "guest",
    text
  };

  chatChannel.send({
    type: "broadcast",
    event: "message",
    payload: msg
  });

  appendChat(msg);
  els.chatInput.value = "";
}

/* =========================
   USERS UI
========================= */

function renderUsers() {
  if (!els.usersList) return;

  els.usersList.innerHTML = Object.values(players)
    .map((p) => `<div class="meta-user">${p.name}</div>`)
    .join("");
}

/* =========================
   MOVEMENT
========================= */

function bindMovement() {
  document.addEventListener("keydown", (e) => {
    const id = currentUser?.id;
    if (!players[id]) return;

    const speed = 5;

    if (e.key === "ArrowUp") players[id].y -= speed;
    if (e.key === "ArrowDown") players[id].y += speed;
    if (e.key === "ArrowLeft") players[id].x -= speed;
    if (e.key === "ArrowRight") players[id].x += speed;

    presenceChannel.track(players[id]); // update position
  });
}

/* =========================
   SPACE CONTROL
========================= */

async function enterSpace() {
  currentUser = getCurrentUserState();

  if (!els.canvas) return;

  ctx = els.canvas.getContext("2d");
  running = true;

  subscribePresence();
  subscribeChat();
  bindMovement();

  loop();

  setStatus("Entered Meta Vision 🌐");
}

async function exitSpace() {
  running = false;

  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }

  if (chatChannel) {
    await supabase.removeChannel(chatChannel);
    chatChannel = null;
  }

  players = {};

  setStatus("Exited Meta Vision");
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  els.joinBtn?.addEventListener("click", enterSpace);
  els.exitBtn?.addEventListener("click", exitSpace);
  els.chatSendBtn?.addEventListener("click", sendChat);

  els.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });
}

/* =========================
   BOOT
========================= */

export function bootMetaverseSpace() {
  bindEvents();
  setStatus("Meta Vision Ready");
}
