import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Chess } from "https://esm.sh/chess.js@1.0.0";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PIECES = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚"
};

const state = {
  session: null,
  user: null,
  rooms: [],
  activeRoom: null,
  moves: [],
  selectedSquare: null,
  chess: new Chess(),
  realtimeChannel: null,
  clockInterval: null
};

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = el("chess-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const success = el("chess-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("chess-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
  const error = el("chess-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRoleForUser(room) {
  if (!state.user?.id || !room) return "Viewer";
  if (room.white_player_id === state.user.id) return "White";
  if (room.black_player_id === state.user.id) return "Black";
  if (room.host_id === state.user.id) return "Host";
  return "Viewer";
}

function getTurnLabel(turn) {
  return turn === "b" ? "Black" : "White";
}

function formatClock(ms = 0) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getLiveClockState(room) {
  if (!room) {
    return { white: 300000, black: 300000 };
  }

  let white = Number(room.white_time_ms || 0);
  let black = Number(room.black_time_ms || 0);

  if (room.status === "active" && room.last_clock_at) {
    const delta = Math.max(0, Date.now() - new Date(room.last_clock_at).getTime());
    if (room.turn === "w") white -= delta;
    if (room.turn === "b") black -= delta;
  }

  return {
    white: Math.max(0, white),
    black: Math.max(0, black)
  };
}

function setInviteLink() {
  const room = state.activeRoom;
  const box = el("invite-link");
  if (!box) return;

  if (!room?.slug) {
    box.textContent = "Open a room to generate an invite link.";
    return;
  }

  const url = `${window.location.origin}/games/chess/index.html?room=${encodeURIComponent(room.slug)}`;
  box.textContent = url;
}

function setMeta() {
  const room = state.activeRoom;
  el("room-title").textContent = room?.title || "No Room";
  el("room-status").textContent = room?.status || "Waiting";
  el("room-turn").textContent = getTurnLabel(room?.turn || "w");
  el("room-role").textContent = getRoleForUser(room);
  setInviteLink();
  updateClockDisplay();
}

function updateClockDisplay() {
  const room = state.activeRoom;
  const whiteCard = el("white-clock-card");
  const blackCard = el("black-clock-card");
  const whiteClock = el("white-clock");
  const blackClock = el("black-clock");

  if (!whiteClock || !blackClock) return;

  const clocks = getLiveClockState(room);
  whiteClock.textContent = formatClock(clocks.white);
  blackClock.textContent = formatClock(clocks.black);

  whiteCard?.classList.toggle("active", room?.turn === "w" && room?.status === "active");
  blackCard?.classList.toggle("active", room?.turn === "b" && room?.status === "active");
}

function startClockTicker() {
  stopClockTicker();
  state.clockInterval = setInterval(() => {
    updateClockDisplay();
  }, 250);
}

function stopClockTicker() {
  if (state.clockInterval) {
    clearInterval(state.clockInterval);
    state.clockInterval = null;
  }
}

function canMovePiece(pieceColor) {
  if (!state.activeRoom || !state.user) return false;
  const role = getRoleForUser(state.activeRoom);
  if (state.activeRoom.status !== "active") return false;
  if (role === "White" && pieceColor === "w" && state.activeRoom.turn === "w") return true;
  if (role === "Black" && pieceColor === "b" && state.activeRoom.turn === "b") return true;
  return false;
}

function renderBoard() {
  const board = el("chess-board");
  if (!board) return;

  const position = state.chess.board();
  const legalMoves = state.selectedSquare
    ? state.chess.moves({ square: state.selectedSquare, verbose: true })
    : [];

  const legalTargets = new Set(legalMoves.map((move) => move.to));

  let html = "";

  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const squareName = "abcdefgh"[file] + (8 - rank);
      const square = position[rank][file];
      const colorClass = (rank + file) % 2 === 0 ? "light" : "dark";
      const isSelected = state.selectedSquare === squareName;
      const canMoveHere = legalTargets.has(squareName);

      let pieceHtml = "";
      if (square) {
        const code = `${square.color}${square.type}`;
        pieceHtml = `<span class="piece">${PIECES[code] || ""}</span>`;
      }

      html += `
        <button
          type="button"
          class="square ${colorClass} ${isSelected ? "selected" : ""} ${canMoveHere ? "move-dot" : ""}"
          data-square="${squareName}"
        >
          ${pieceHtml}
        </button>
      `;
    }
  }

  board.innerHTML = html;

  board.querySelectorAll("[data-square]").forEach((button) => {
    button.addEventListener("click", () => onSquareClick(button.getAttribute("data-square")));
  });
}

function renderRooms() {
  const list = el("room-list");
  if (!list) return;

  if (!state.rooms.length) {
    list.innerHTML = `<div class="room-item"><strong>No rooms yet</strong><span>Create the first chess room.</span></div>`;
    return;
  }

  list.innerHTML = state.rooms.map((room) => `
    <button type="button" class="room-item ${state.activeRoom?.id === room.id ? "active" : ""}" data-room-id="${room.id}">
      <strong>${room.title}</strong>
      <span>${room.slug} • ${room.status} • ${room.time_control}</span>
    </button>
  `).join("");

  list.querySelectorAll("[data-room-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const roomId = button.getAttribute("data-room-id");
      await openRoom(roomId);
    });
  });
}

function renderMoves() {
  const list = el("move-list");
  if (!list) return;

  if (!state.moves.length) {
    list.innerHTML = `<div class="move-item"><strong>No moves yet</strong><span>Open a room and start playing.</span></div>`;
    return;
  }

  list.innerHTML = state.moves.map((move) => `
    <div class="move-item">
      <strong>#${move.move_number} • ${move.san}</strong>
      <span>${move.color === "w" ? "White" : "Black"} • ${move.from_square} → ${move.to_square}</span>
    </div>
  `).join("");
}

async function loadSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  state.session = data.session || null;
  state.user = data.session?.user || null;
}

async function loadRooms() {
  const { data, error } = await supabase
    .from("chess_rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.rooms = data || [];
  renderRooms();

  if (!state.activeRoom && state.rooms[0]) {
    await openRoom(state.rooms[0].id);
  }
}

async function loadMoves(roomId) {
  const { data, error } = await supabase
    .from("chess_moves")
    .select("*")
    .eq("room_id", roomId)
    .order("move_number", { ascending: true });

  if (error) throw error;
  state.moves = data || [];
  renderMoves();
}

async function openRoom(roomId) {
  clearMessages();

  const { data, error } = await supabase
    .from("chess_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error) throw error;

  state.activeRoom = data;
  state.chess = new Chess(data.fen === "start" ? undefined : data.fen);
  state.selectedSquare = null;

  setMeta();
  renderBoard();
  renderRooms();
  await loadMoves(roomId);
  subscribeToRoom(roomId);
}

async function openRoomBySlug(slug) {
  const { data, error } = await supabase
    .from("chess_rooms")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  await openRoom(data.id);
}

function subscribeToRoom(roomId) {
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }

  const channel = supabase
    .channel(`chess-room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chess_rooms", filter: `id=eq.${roomId}` },
      async () => {
        await openRoom(roomId);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chess_moves", filter: `room_id=eq.${roomId}` },
      async () => {
        await loadMoves(roomId);
      }
    )
    .subscribe();

  state.realtimeChannel = channel;
}

async function createRoom() {
  clearMessages();

  if (!state.user?.id) {
    showError("Log in first to create a room.");
    return;
  }

  const title = el("create-room-title").value.trim() || "Chess Room";
  const slugInput = el("create-room-slug").value.trim();
  const visibility = el("create-room-visibility").value || "public";
  const timeControl = el("create-room-time").value || "5|0";
  const slug = slugify(slugInput || title || `room-${Date.now()}`);

  const [minutesText, incrementText] = timeControl.split("|");
  const minutes = Number(minutesText || 5);
  const incrementSeconds = Number(incrementText || 0);

  const { data, error } = await supabase
    .from("chess_rooms")
    .insert({
      title,
      slug,
      host_id: state.user.id,
      visibility,
      fen: "start",
      turn: "w",
      status: "waiting",
      time_control: timeControl,
      increment_ms: incrementSeconds * 1000,
      white_time_ms: minutes * 60 * 1000,
      black_time_ms: minutes * 60 * 1000,
      last_clock_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    showError(error.message || "Could not create room.");
    return;
  }

  showSuccess("Chess room created.");
  el("create-room-title").value = "";
  el("create-room-slug").value = "";
  await loadRooms();
  await openRoom(data.id);
}

async function joinColor(color) {
  clearMessages();

  if (!state.user?.id) {
    showError("Log in first to join a side.");
    return;
  }

  if (!state.activeRoom) {
    showError("Open a room first.");
    return;
  }

  const patch = {};
  if (color === "w") patch.white_player_id = state.user.id;
  if (color === "b") patch.black_player_id = state.user.id;

  const nextStatus =
    (color === "w" ? state.activeRoom.black_player_id : state.activeRoom.white_player_id)
      ? "active"
      : state.activeRoom.status;

  const { error } = await supabase
    .from("chess_rooms")
    .update({
      ...patch,
      status: nextStatus,
      last_clock_at: new Date().toISOString()
    })
    .eq("id", state.activeRoom.id);

  if (error) {
    showError(error.message || "Could not join side.");
    return;
  }

  showSuccess(color === "w" ? "Joined white." : "Joined black.");
  await openRoom(state.activeRoom.id);
}

async function resignGame() {
  clearMessages();

  if (!state.activeRoom || !state.user?.id) {
    showError("Open a room first.");
    return;
  }

  const role = getRoleForUser(state.activeRoom);
  if (role !== "White" && role !== "Black") {
    showError("Only players can resign.");
    return;
  }

  const winner = role === "White" ? "b" : "w";

  const { error } = await supabase
    .from("chess_rooms")
    .update({
      status: "finished",
      winner,
      ended_reason: "resignation"
    })
    .eq("id", state.activeRoom.id);

  if (error) {
    showError(error.message || "Could not resign.");
    return;
  }

  showSuccess(`${role} resigned. ${winner === "w" ? "White" : "Black"} wins.`);
}

async function requestRematch() {
  clearMessages();

  if (!state.activeRoom || !state.user?.id) {
    showError("Open a room first.");
    return;
  }

  if (state.activeRoom.rematch_requested_by && state.activeRoom.rematch_requested_by !== state.user.id) {
    const { error: resetMovesError } = await supabase
      .from("chess_moves")
      .delete()
      .eq("room_id", state.activeRoom.id);

    if (resetMovesError) {
      showError(resetMovesError.message || "Could not clear old moves.");
      return;
    }

    const [minutesText, incrementText] = String(state.activeRoom.time_control || "5|0").split("|");
    const minutes = Number(minutesText || 5);
    const incrementSeconds = Number(incrementText || 0);

    const { error } = await supabase
      .from("chess_rooms")
      .update({
        fen: "start",
        turn: "w",
        winner: null,
        status: "active",
        move_count: 0,
        last_move: null,
        ended_reason: null,
        rematch_requested_by: null,
        white_time_ms: minutes * 60 * 1000,
        black_time_ms: minutes * 60 * 1000,
        increment_ms: incrementSeconds * 1000,
        last_clock_at: new Date().toISOString()
      })
      .eq("id", state.activeRoom.id);

    if (error) {
      showError(error.message || "Could not start rematch.");
      return;
    }

    showSuccess("Rematch started.");
    return;
  }

  const { error } = await supabase
    .from("chess_rooms")
    .update({
      rematch_requested_by: state.user.id
    })
    .eq("id", state.activeRoom.id);

  if (error) {
    showError(error.message || "Could not request rematch.");
    return;
  }

  showSuccess("Rematch requested.");
}

async function onSquareClick(squareName) {
  if (!state.activeRoom) return;

  const piece = state.chess.get(squareName);

  if (state.selectedSquare) {
    const move = state.chess.move({
      from: state.selectedSquare,
      to: squareName,
      promotion: "q"
    });

    if (move) {
      await persistMove(move);
      state.selectedSquare = null;
      renderBoard();
      return;
    }

    if (piece && canMovePiece(piece.color)) {
      state.selectedSquare = squareName;
      renderBoard();
      return;
    }

    state.selectedSquare = null;
    renderBoard();
    return;
  }

  if (!piece) return;
  if (!canMovePiece(piece.color)) return;

  state.selectedSquare = squareName;
  renderBoard();
}

async function persistMove(move) {
  clearMessages();

  if (!state.user?.id) {
    showError("Log in first to move pieces.");
    return;
  }

  if (!state.activeRoom) {
    showError("No room selected.");
    return;
  }

  const clocksBefore = getLiveClockState(state.activeRoom);
  const nowIso = new Date().toISOString();

  let whiteTime = clocksBefore.white;
  let blackTime = clocksBefore.black;

  if (move.color === "w") whiteTime += Number(state.activeRoom.increment_ms || 0);
  if (move.color === "b") blackTime += Number(state.activeRoom.increment_ms || 0);

  const nextFen = state.chess.fen();
  const nextTurn = state.chess.turn();
  const nextMoveNumber = Number(state.activeRoom.move_count || 0) + 1;

  const winner =
    state.chess.isCheckmate()
      ? (move.color === "w" ? "w" : "b")
      : null;

  const nextStatus = winner ? "finished" : "active";

  const { error: roomError } = await supabase
    .from("chess_rooms")
    .update({
      fen: nextFen,
      turn: nextTurn,
      move_count: nextMoveNumber,
      last_move: move.san,
      winner,
      status: nextStatus,
      white_time_ms: Math.max(0, Math.floor(whiteTime)),
      black_time_ms: Math.max(0, Math.floor(blackTime)),
      last_clock_at: nowIso,
      ended_reason: winner ? "checkmate" : null
    })
    .eq("id", state.activeRoom.id);

  if (roomError) {
    showError(roomError.message || "Could not update board state.");
    return;
  }

  const { error: moveError } = await supabase
    .from("chess_moves")
    .insert({
      room_id: state.activeRoom.id,
      move_number: nextMoveNumber,
      by_user_id: state.user.id,
      color: move.color,
      san: move.san,
      from_square: move.from,
      to_square: move.to,
      fen_after: nextFen
    });

  if (moveError) {
    showError(moveError.message || "Could not save move.");
    return;
  }

  if (winner) {
    showSuccess(`Checkmate. ${winner === "w" ? "White" : "Black"} wins.`);
  }
}

function bindUI() {
  el("create-room-btn")?.addEventListener("click", createRoom);
  el("join-white-btn")?.addEventListener("click", () => joinColor("w"));
  el("join-black-btn")?.addEventListener("click", () => joinColor("b"));
  el("refresh-room-btn")?.addEventListener("click", async () => {
    if (state.activeRoom?.id) await openRoom(state.activeRoom.id);
    else await loadRooms();
  });
  el("resign-btn")?.addEventListener("click", resignGame);
  el("rematch-btn")?.addEventListener("click", requestRematch);
}

async function boot() {
  try {
    bindUI();
    await loadSession();
    await loadRooms();

    const params = new URLSearchParams(window.location.search);
    const roomSlug = params.get("room");
    if (roomSlug) {
      await openRoomBySlug(roomSlug);
    }

    startClockTicker();
    showSuccess("Upgraded multiplayer chess pack loaded.");
  } catch (error) {
    console.error("[chess-client] boot error:", error);
    showError(error.message || "Failed to load chess.");
  }
}

window.addEventListener("beforeunload", () => {
  stopClockTicker();
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
  }
});

document.addEventListener("DOMContentLoaded", boot);
