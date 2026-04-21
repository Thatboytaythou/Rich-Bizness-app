// src/gaming/chess-ui.js

import {
  FILES,
  RANKS_WHITE,
  RANKS_BLACK,
  coordsToSquare,
  squareToCoords,
  getCapturedPiecesFromMoves,
  getMaterialScore
} from "./chess-state.js";

export const PIECE_ICONS = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚"
};

function safeText(el, value) {
  if (!el) return;
  el.textContent = value ?? "";
}

function safeHTML(el, value) {
  if (!el) return;
  el.innerHTML = value ?? "";
}

export function formatClock(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function updateClockUI(state, el = {}) {
  safeText(el.whiteClock, formatClock(state.whiteTime));
  safeText(el.blackClock, formatClock(state.blackTime));

  el.whiteClockCard?.classList.toggle("active", state.turn === "white");
  el.blackClockCard?.classList.toggle("active", state.turn === "black");
}

export function updateMetaUI(state, el = {}) {
  safeText(el.roomTitle, state.roomTitle || "No Room");
  safeText(el.roomStatus, state.roomStatus || state.status || "Waiting");
  safeText(
    el.roomTurn,
    state.turn ? state.turn.charAt(0).toUpperCase() + state.turn.slice(1) : "White"
  );
  safeText(el.roomRole, state.roomRole || "Viewer");
  safeText(el.roomType, state.roomType || state.mode || "Casual");

  safeText(el.gameResultTitle, state.resultTitle || "Match ready");
  safeText(
    el.gameResultText,
    state.resultText || "Start a game and lock in your first move."
  );
}

export function updateInviteLink(link, el = {}) {
  safeText(
    el.inviteLink,
    link || "Open a live room to generate an invite link."
  );
}

export function updateModeButtons(state, el = {}) {
  const map = {
    cpu: el.modeCpu,
    local: el.modeLocal,
    room: el.modeRoom,
    view: el.modeView
  };

  Object.entries(map).forEach(([key, node]) => {
    node?.classList.toggle("active", state.mode === key);
  });
}

export function updateCapturedUI(state, el = {}) {
  const captured =
    state.whiteCaptured && state.blackCaptured
      ? { whiteCaptured: state.whiteCaptured, blackCaptured: state.blackCaptured }
      : getCapturedPiecesFromMoves(state.moves || []);

  const whiteIcons = captured.whiteCaptured.map((p) => PIECE_ICONS[p] || "");
  const blackIcons = captured.blackCaptured.map((p) => PIECE_ICONS[p] || "");

  safeHTML(
    el.whiteCaptured,
    whiteIcons.length
      ? whiteIcons.map((icon) => `<span>${icon}</span>`).join("")
      : `<span style="opacity:.45;font-size:14px;">—</span>`
  );

  safeHTML(
    el.blackCaptured,
    blackIcons.length
      ? blackIcons.map((icon) => `<span>${icon}</span>`).join("")
      : `<span style="opacity:.45;font-size:14px;">—</span>`
  );

  const whiteScore = getMaterialScore(captured.whiteCaptured);
  const blackScore = getMaterialScore(captured.blackCaptured);

  if (el.whiteCapturedLabel) {
    el.whiteCapturedLabel.textContent =
      whiteScore > 0 ? `Captured by White (+${whiteScore})` : "Captured by White";
  }

  if (el.blackCapturedLabel) {
    el.blackCapturedLabel.textContent =
      blackScore > 0 ? `Captured by Black (+${blackScore})` : "Captured by Black";
  }
}

export function renderMoves(moves = [], container) {
  if (!container) return;

  if (!moves.length) {
    safeHTML(
      container,
      `<div class="move-item"><strong>No moves yet</strong><span>Start a match to build history.</span></div>`
    );
    return;
  }

  container.innerHTML = moves
    .map((move, index) => {
      const side = move.color
        ? move.color.charAt(0).toUpperCase() + move.color.slice(1)
        : index % 2 === 0
          ? "White"
          : "Black";

      return `
        <div class="move-item">
          <strong>#${index + 1} • ${side}</strong>
          <span>${move.san || `${move.from}-${move.to}`}</span>
        </div>
      `;
    })
    .join("");
}

export function renderRooms(rooms = [], activeRoomId, container, onSelect) {
  if (!container) return;

  if (!rooms.length) {
    safeHTML(
      container,
      `<div class="room-item"><strong>No live rooms loaded</strong><span>Create one when you are ready to run live chess.</span></div>`
    );
    return;
  }

  container.innerHTML = "";
  rooms.forEach((room) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "room-item";
    if (room.id === activeRoomId) item.classList.add("active");

    item.innerHTML = `
      <strong>${room.title || room.slug || "Untitled Room"}</strong>
      <span>
        ${(room.visibility || "public")} • ${(room.room_type || room.type || "casual")} •
        ${(room.status || "waiting")}
      </span>
    `;

    item.addEventListener("click", () => {
      if (typeof onSelect === "function") onSelect(room);
    });

    container.appendChild(item);
  });
}

export function showNotice(type, message, el = {}) {
  const errorEl = el.errorNotice;
  const successEl = el.successNotice;

  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }

  if (successEl) {
    successEl.style.display = "none";
    successEl.textContent = "";
  }

  if (!message) return;

  if (type === "error" && errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }

  if (type === "success" && successEl) {
    successEl.textContent = message;
    successEl.style.display = "block";
  }
}

export function clearNotices(el = {}) {
  showNotice(null, "", el);
}

export function renderBoard(state, boardEl, handlers = {}) {
  if (!boardEl) return;

  const orientation = state.orientation === "black" ? "black" : "white";
  const rankOrder = orientation === "white" ? RANKS_WHITE : RANKS_BLACK;
  const fileOrder = orientation === "white" ? FILES : [...FILES].reverse();

  boardEl.innerHTML = "";

  rankOrder.forEach((rank, visualRow) => {
    fileOrder.forEach((file, visualCol) => {
      const square = `${file}${rank}`;
      const coords = squareToCoords(square);
      const piece = coords ? state.board[coords.row][coords.col] : null;

      const squareEl = document.createElement("button");
      squareEl.type = "button";
      squareEl.className = "square";

      const actualCol = FILES.indexOf(file);
      const actualRow = 8 - rank;
      const isLight = (actualRow + actualCol) % 2 === 0;

      squareEl.classList.add(isLight ? "light" : "dark");
      squareEl.dataset.square = square;
      squareEl.dataset.row = String(visualRow);
      squareEl.dataset.col = String(visualCol);

      if (state.selectedSquare === square) {
        squareEl.classList.add("selected");
      }

      const legalMoves = Array.isArray(state.legalMoves) ? state.legalMoves : [];
      const legalForSquare = legalMoves.find((m) => m.to === square);

      if (legalForSquare) {
        if (legalForSquare.capture) {
          squareEl.classList.add("capture-dot");
        } else {
          squareEl.classList.add("move-dot");
        }
      }

      if (state.lastMove && (state.lastMove.from === square || state.lastMove.to === square)) {
        squareEl.classList.add("last-move");
      }

      if (state.checkSquare === square) {
        squareEl.classList.add("in-check");
      }

      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.className = "piece";
        pieceEl.textContent = PIECE_ICONS[piece] || "";
        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener("click", () => {
        if (typeof handlers.onSquareClick === "function") {
          handlers.onSquareClick(square);
        }
      });

      boardEl.appendChild(squareEl);
    });
  });
}

export function updateBoardFileLabels(state, topEl, bottomEl) {
  const files = state.orientation === "black" ? [...FILES].reverse() : FILES;

  const render = (node) => {
    if (!node) return;
    node.innerHTML = files.map((f) => `<span>${f}</span>`).join("");
  };

  render(topEl);
  render(bottomEl);
}

export function collectChessElements() {
  return {
    board: document.getElementById("chess-board"),
    whiteClock: document.getElementById("white-clock"),
    blackClock: document.getElementById("black-clock"),
    whiteClockCard: document.getElementById("white-clock-card"),
    blackClockCard: document.getElementById("black-clock-card"),

    roomTitle: document.getElementById("room-title"),
    roomStatus: document.getElementById("room-status"),
    roomTurn: document.getElementById("room-turn"),
    roomRole: document.getElementById("room-role"),
    roomType: document.getElementById("room-type"),

    whiteCaptured: document.getElementById("white-captured"),
    blackCaptured: document.getElementById("black-captured"),

    gameResultTitle: document.getElementById("game-result-title"),
    gameResultText: document.getElementById("game-result-text"),

    roomList: document.getElementById("room-list"),
    moveList: document.getElementById("move-list"),

    inviteLink: document.getElementById("invite-link"),

    errorNotice: document.getElementById("chess-error"),
    successNotice: document.getElementById("chess-success"),

    modeCpu: document.getElementById("mode-cpu"),
    modeLocal: document.getElementById("mode-local"),
    modeRoom: document.getElementById("mode-room"),
    modeView: document.getElementById("mode-view"),

    boardFilesTop: document.getElementById("board-files-top"),
    boardFilesBottom: document.getElementById("board-files-bottom")
  };
}

export function renderAll(state, el, handlers = {}) {
  renderBoard(state, el.board, handlers);
  updateClockUI(state, el);
  updateMetaUI(state, el);
  updateCapturedUI(state, el);
  renderMoves(state.moves || [], el.moveList);
  updateBoardFileLabels(state, el.boardFilesTop, el.boardFilesBottom);
  updateModeButtons(state, el);
}

export default {
  PIECE_ICONS,
  formatClock,
  updateClockUI,
  updateMetaUI,
  updateInviteLink,
  updateModeButtons,
  updateCapturedUI,
  renderMoves,
  renderRooms,
  showNotice,
  clearNotices,
  renderBoard,
  updateBoardFileLabels,
  collectChessElements,
  renderAll
};
