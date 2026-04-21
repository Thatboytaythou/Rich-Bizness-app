import {
  formatSeconds,
  getOrderedFiles,
  getOrderedRanks,
  PIECES,
  squareToCoord,
  coordToSquare,
  getPieceAt,
  getPieceColor
} from "./chess-state.js";

export function collectChessElements() {
  return {
    error: document.getElementById("chess-error"),
    success: document.getElementById("chess-success"),
    board: document.getElementById("chess-board"),
    roomTitle: document.getElementById("room-title"),
    roomStatus: document.getElementById("room-status"),
    roomTurn: document.getElementById("room-turn"),
    roomRole: document.getElementById("room-role"),
    roomType: document.getElementById("room-type"),
    whiteClock: document.getElementById("white-clock"),
    blackClock: document.getElementById("black-clock"),
    whiteClockCard: document.getElementById("white-clock-card"),
    blackClockCard: document.getElementById("black-clock-card"),
    whiteCaptured: document.getElementById("white-captured"),
    blackCaptured: document.getElementById("black-captured"),
    resultTitle: document.getElementById("game-result-title"),
    resultText: document.getElementById("game-result-text"),
    modeCpu: document.getElementById("mode-cpu"),
    modeLocal: document.getElementById("mode-local"),
    modeRoom: document.getElementById("mode-room"),
    modeView: document.getElementById("mode-view"),
    cpuDifficulty: document.getElementById("cpu-difficulty"),
    playerColor: document.getElementById("player-color"),
    gameTime: document.getElementById("game-time"),
    startCpuBtn: document.getElementById("start-cpu-btn"),
    newLocalBtn: document.getElementById("new-local-btn"),
    joinWhiteBtn: document.getElementById("join-white-btn"),
    joinBlackBtn: document.getElementById("join-black-btn"),
    flipBoardBtn: document.getElementById("flip-board-btn"),
    refreshRoomBtn: document.getElementById("refresh-room-btn"),
    resignBtn: document.getElementById("resign-btn"),
    resetBtn: document.getElementById("reset-btn"),
    rematchBtn: document.getElementById("rematch-btn"),
    createRoomTitle: document.getElementById("create-room-title"),
    createRoomSlug: document.getElementById("create-room-slug"),
    createRoomVisibility: document.getElementById("create-room-visibility"),
    createRoomTime: document.getElementById("create-room-time"),
    createRoomType: document.getElementById("create-room-type"),
    createRoomBtn: document.getElementById("create-room-btn"),
    inviteLink: document.getElementById("invite-link"),
    copyLinkBtn: document.getElementById("copy-link-btn"),
    roomList: document.getElementById("room-list"),
    moveList: document.getElementById("move-list"),
    filesTop: document.getElementById("board-files-top"),
    filesBottom: document.getElementById("board-files-bottom")
  };
}

export function showNotice(el, type, message) {
  const target = type === "error" ? el.error : el.success;
  const other = type === "error" ? el.success : el.error;
  if (other) {
    other.style.display = "none";
    other.textContent = "";
  }
  if (!target) return;
  target.textContent = message;
  target.style.display = "block";
  window.clearTimeout(target._hideTimer);
  target._hideTimer = window.setTimeout(() => {
    target.style.display = "none";
  }, 2400);
}

export function renderFiles(el, orientation) {
  const files = getOrderedFiles(orientation);
  [el.filesTop, el.filesBottom].forEach((row) => {
    if (!row) return;
    row.innerHTML = files.map((file) => `<span>${file}</span>`).join("");
  });
}

export function renderCaptured(el, state) {
  if (el.whiteCaptured) {
    el.whiteCaptured.innerHTML = state.whiteCaptured.map((piece) => `<span>${PIECES[piece] || ""}</span>`).join("");
  }
  if (el.blackCaptured) {
    el.blackCaptured.innerHTML = state.blackCaptured.map((piece) => `<span>${PIECES[piece] || ""}</span>`).join("");
  }
}

export function renderMeta(el, state) {
  if (el.roomTitle) el.roomTitle.textContent = state.roomTitle || "No Room";
  if (el.roomStatus) el.roomStatus.textContent = state.roomStatus || "Ready";
  if (el.roomTurn) el.roomTurn.textContent = state.turn[0].toUpperCase() + state.turn.slice(1);
  if (el.roomRole) el.roomRole.textContent = state.roomRole || "Viewer";
  if (el.roomType) el.roomType.textContent = state.roomType || "CPU";
  if (el.resultTitle) el.resultTitle.textContent = state.result?.title || "Match ready";
  if (el.resultText) el.resultText.textContent = state.result?.text || "Start a game and lock in your first move.";
}

export function renderClocks(el, state) {
  if (el.whiteClock) el.whiteClock.textContent = formatSeconds(state.whiteTime);
  if (el.blackClock) el.blackClock.textContent = formatSeconds(state.blackTime);

  el.whiteClockCard?.classList.toggle("active", state.turn === "white" && !state.gameOver);
  el.blackClockCard?.classList.toggle("active", state.turn === "black" && !state.gameOver);
}

export function renderRooms(el, state) {
  if (!el.roomList) return;
  if (!state.rooms?.length) {
    el.roomList.innerHTML = `<div class="room-item"><strong>No live rooms loaded</strong><span>Create one when you are ready to run live room mode.</span></div>`;
    return;
  }

  el.roomList.innerHTML = state.rooms
    .map((room) => {
      const active = room.id === state.currentRoomId ? "active" : "";
      return `
        <button class="room-item ${active}" data-room-id="${room.id}" type="button">
          <strong>${room.title || room.slug || "Chess Room"}</strong>
          <span>${room.visibility || "public"} • ${room.room_type || room.type || "casual"}</span>
        </button>
      `;
    })
    .join("");
}

export function renderMoves(el, state) {
  if (!el.moveList) return;
  if (!state.moveHistory.length) {
    el.moveList.innerHTML = `<div class="move-item"><strong>No moves yet</strong><span>Live move history for the active match.</span></div>`;
    return;
  }

  el.moveList.innerHTML = state.moveHistory
    .map((move, index) => `
      <div class="move-item">
        <strong>#${index + 1} • ${move.color[0].toUpperCase() + move.color.slice(1)}</strong>
        <span>${move.notation}</span>
      </div>
    `)
    .join("");
}

export function renderModeButtons(el, state) {
  el.modeCpu?.classList.toggle("active", state.mode === "cpu");
  el.modeLocal?.classList.toggle("active", state.mode === "local");
  el.modeRoom?.classList.toggle("active", state.mode === "room");
  el.modeView?.classList.toggle("active", state.mode === "view");
}

export function renderBoard(state, el, onSquareClick) {
  if (!el.board) return;

  const files = getOrderedFiles(state.orientation);
  const ranks = getOrderedRanks(state.orientation);

  const selected = state.selectedSquare;
  const legalSet = new Set(state.legalTargets || []);
  const captureSet = new Set(state.captureTargets || []);
  const lastFrom = state.lastMove?.from;
  const lastTo = state.lastMove?.to;

  const inCheckSquare = (() => {
    if (!state.result?.title?.toLowerCase().includes("check") && !state.result?.text?.toLowerCase().includes("check")) return null;
    for (const rank of ranks) {
      for (const file of files) {
        const square = `${file}${rank}`;
        const piece = getPieceAt(state.board, square);
        if (piece === (state.turn === "white" ? "wk" : "bk")) return square;
      }
    }
    return null;
  })();

  const html = [];

  ranks.forEach((rank) => {
    files.forEach((file) => {
      const square = `${file}${rank}`;
      const coord = squareToCoord(square);
      const piece = state.board[coord.row][coord.col];
      const isLight = (coord.row + coord.col) % 2 === 0;
      const classes = ["square", isLight ? "light" : "dark"];
      if (selected === square) classes.push("selected");
      if (legalSet.has(square)) classes.push("move-dot");
      if (captureSet.has(square)) classes.push("capture-dot");
      if (square === lastFrom || square === lastTo) classes.push("last-move");
      if (square === inCheckSquare) classes.push("in-check");

      html.push(`
        <button class="${classes.join(" ")}" type="button" data-square="${square}">
          <span class="piece">${piece ? PIECES[piece] : ""}</span>
        </button>
      `);
    });
  });

  el.board.innerHTML = html.join("");

  el.board.querySelectorAll("[data-square]").forEach((node) => {
    node.addEventListener("click", () => onSquareClick(node.dataset.square));
  });
}

export function renderAll(state, el, { onSquareClick }) {
  renderFiles(el, state.orientation);
  renderModeButtons(el, state);
  renderMeta(el, state);
  renderClocks(el, state);
  renderCaptured(el, state);
  renderBoard(state, el, onSquareClick);
  renderRooms(el, state);
  renderMoves(el, state);

  if (el.inviteLink) {
    el.inviteLink.textContent = state.roomSlug
      ? `${window.location.origin}/games/chess/index.html?room=${encodeURIComponent(state.roomSlug)}`
      : "Open a live room to generate an invite link.";
  }
}
