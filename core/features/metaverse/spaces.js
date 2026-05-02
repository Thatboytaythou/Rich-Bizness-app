// =========================
// RICH BIZNESS META SPACE — FINAL SYNCED
// /core/features/metaverse/space.js
// =========================

import { getSupabase } from "/core/app.js";

const supabase = getSupabase();

/* =========================
   ELEMENTS
========================= */

const canvas = document.getElementById("meta-canvas");
const ctx = canvas?.getContext("2d");

/* =========================
   STATE
========================= */

let player = null;
let players = {};
let channel = null;

/* =========================
   CANVAS SETUP
========================= */

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

/* =========================
   LOAD AVATAR (FROM AUTH)
========================= */

function loadAvatar() {
  try {
    const raw = localStorage.getItem("rb_meta_avatar");
    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* =========================
   INIT PLAYER
========================= */

function createPlayer() {
  const avatar = loadAvatar();

  const id = avatar?.id || crypto.randomUUID();

  player = {
    id,
    name: avatar?.name || "Rich Player",
    avatar: avatar?.avatar || null,

    x: window.innerWidth / 2,
    y: window.innerHeight / 2,

    vx: 0,
    vy: 0,
    speed: 4
  };

  players[id] = player;
}

/* =========================
   DRAW PLAYER
========================= */

function drawPlayer(p) {
  if (!ctx) return;

  // body
  ctx.beginPath();
  ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#69ffb4";
  ctx.fill();

  // name
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(p.name, p.x, p.y - 30);
}

/* =========================
   DRAW LOOP
========================= */

function draw() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  Object.values(players).forEach(drawPlayer);

  requestAnimationFrame(draw);
}

/* =========================
   MOVEMENT
========================= */

const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function updateMovement() {
  if (!player) return;

  player.vx = 0;
  player.vy = 0;

  if (keys["w"] || keys["arrowup"]) player.vy = -player.speed;
  if (keys["s"] || keys["arrowdown"]) player.vy = player.speed;
  if (keys["a"] || keys["arrowleft"]) player.vx = -player.speed;
  if (keys["d"] || keys["arrowright"]) player.vx = player.speed;

  player.x += player.vx;
  player.y += player.vy;

  broadcastPosition();

  requestAnimationFrame(updateMovement);
}

/* =========================
   REALTIME PRESENCE
========================= */

function initPresence() {
  channel = supabase.channel("meta-space", {
    config: { presence: { key: player.id } }
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();

    players = {};

    Object.values(state).forEach((entries) => {
      entries.forEach((p) => {
        players[p.id] = p;
      });
    });
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track(player);
    }
  });
}

/* =========================
   BROADCAST POSITION
========================= */

async function broadcastPosition() {
  if (!channel) return;

  await channel.track({
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y
  });
}

/* =========================
   OPTIONAL: LIVE ROOM HOOK
========================= */

async function loadLiveRooms() {
  // 🔥 this connects meta to live system later
  const { data } = await supabase
    .from("live_streams")
    .select("id, title, livekit_room_name, status")
    .eq("status", "live");

  console.log("🌍 Live rooms in meta:", data);
}

/* =========================
   BOOT
========================= */

function bootSpace() {
  if (!canvas) {
    console.warn("Meta canvas not found");
    return;
  }

  resizeCanvas();

  createPlayer();

  initPresence();

  draw();
  updateMovement();

  loadLiveRooms();

  console.log("🌍 Meta Space Active");
}

bootSpace();
