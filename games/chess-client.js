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
  realtimeChannel: null
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

function canMovePiece(pieceColor) {
  if (!state.activeRoom || !state.user) return false;
  const role = getRoleForUser(state.activeRoom);
  if (role === "White" && pieceColor === "w" && state.activeRoom.turn === "w") return true;
  if (role === "Black" && pieceColor === "b" && state.activeRoom.turn === "b") return true;
  return false;
}

function setMeta() {
  const room = state.activeRoom;
  el("room-title").textContent = room?.title || "No Room";
  el("room-status").textContent = room?.status || "Waiting";
  el("room-turn").textContent = getTurnLabel(room?.turn || "w");
  el("room-role").textContent = getRoleForUser(room);
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
      <span>${room.slug} • ${room.status} • ${getTurnLabel(room.turn)}</span>
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
  const slug = slugify(slugInput || title || `room-${Date.now()}`);

  const { data, error } = await supabase
    .from("chess_rooms")
    .insert({
      title,
      slug,
      host_id: state.user.id,
      visibility,
      fen: "start",
      turn: "w",
      status: "waiting"
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
      status: nextStatus
    })
    .eq("id", state.activeRoom.id);

  if (error) {
    showError(error.message || "Could not join side.");
    return;
  }

  showSuccess(color === "w" ? "Joined white." : "Joined black.");
  await openRoom(state.activeRoom.id);
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

  const nextFen = state.chess.fen();
  const nextTurn = state.chess.turn();
  const nextMoveNumber = Number(state.activeRoom.move_count || 0) + 1;

  const winner =
    state.chess.isCheckmate()
      ? (move.color === "w" ? "w" : "b")
      : null;

  const nextStatus = winner
    ? "finished"
    : "active";

  const { error: roomError } = await supabase
    .from("chess_rooms")
    .update({
      fen: nextFen,
      turn: nextTurn,
      move_count: nextMoveNumber,
      last_move: move.san,
      winner,
      status: nextStatus
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
}

async function boot() {
  try {
    bindUI();
    await loadSession();
    await loadRooms();
    showSuccess("Multiplayer chess pack loaded.");
  } catch (error) {
    console.error("[chess-client] boot error:", error);
    showError(error.message || "Failed to load chess.");
  }
}

document.addEventListener("DOMContentLoaded", boot);
