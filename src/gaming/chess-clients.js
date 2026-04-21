import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PIECES = {
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
  bk: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS_WHITE = [8, 7, 6, 5, 4, 3, 2, 1];
const RANKS_BLACK = [1, 2, 3, 4, 5, 6, 7, 8];
const FILES_WHITE = ["a", "b", "c", "d", "e", "f", "g", "h"];
const FILES_BLACK = ["h", "g", "f", "e", "d", "c", "b", "a"];

const START_BOARD = [
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
];

const state = {
  mode: "cpu", // cpu | local | room | view
  cpuDifficulty: "easy",
  playerColor: "white",
  orientation: "white",
  board: cloneBoard(START_BOARD),
  turn: "white",
  selected: null,
  validMoves: [],
  moveHistory: [],
  capturedByWhite: [],
  capturedByBlack: [],
  whiteTime: 300,
  blackTime: 300,
  timerBase: 300,
  timerInterval: null,
  gameOver: false,
  winner: null,
  resultReason: "",
  activeRoomId: null,
  activeRoomSlug: null,
  activeRoomTitle: "",
  activeRoomVisibility: "public",
  activeRoomType: "casual",
  liveRooms: [],
  liveRoomChannel: null,
  user: null,
  gamerProfile: null,
  gameRecord: null,
  sessionId: null,
  currentMoveNumber: 1,
  roomLoadedFromRealtime: false,
  whiteJoinId: null,
  blackJoinId: null,
  lastMove: null,
};

const el = {
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
};

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showNotice(type, message) {
  const target = type === "error" ? el.error : el.success;
  const other = type === "error" ? el.success : el.error;

  other.style.display = "none";
  other.textContent = "";

  if (!message) {
    target.style.display = "none";
    target.textContent = "";
    return;
  }

  target.textContent = message;
  target.style.display = "block";

  clearTimeout(target._hideTimer);
  target._hideTimer = setTimeout(() => {
    target.style.display = "none";
  }, 3200);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function capitalize(value = "") {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function isWhite(piece) {
  return !!piece && piece[0] === "w";
}

function isBlack(piece) {
  return !!piece && piece[0] === "b";
}

function colorOf(piece) {
  if (!piece) return null;
  return isWhite(piece) ? "white" : "black";
}

function enemyColor(color) {
  return color === "white" ? "black" : "white";
}

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function positionLabel(row, col) {
  return `${FILES[col]}${8 - row}`;
}

function inside(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function pieceValue(piece) {
  if (!piece) return 0;
  const map = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
  };
  return map[piece[1]] || 0;
}

function evaluateBoard(board) {
  let total = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece) continue;
      const value = pieceValue(piece);
      total += colorOf(piece) === "white" ? value : -value;
    }
  }
  return total;
}

function moveNotation(piece, fromRow, fromCol, toRow, toCol, captured) {
  const pieceType = piece[1];
  const pieceLabel = pieceType === "p" ? "" : pieceType.toUpperCase();
  const captureMarker = captured ? "x" : "-";
  return `${pieceLabel}${positionLabel(fromRow, fromCol)}${captureMarker}${positionLabel(toRow, toCol)}`;
}

function boardToSimpleString(board) {
  return board.map((row) => row.map((cell) => cell || "..").join(",")).join("|");
}

function simpleStringToBoard(str) {
  if (!str) return cloneBoard(START_BOARD);
  const rows = str.split("|");
  return rows.map((row) =>
    row.split(",").map((cell) => (cell === ".." ? null : cell))
  );
}

function findKing(board, color) {
  const king = color === "white" ? "wk" : "bk";
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] === king) return { row: r, col: c };
    }
  }
  return null;
}

function rawMovesForPiece(board, row, col, attackOnly = false) {
  const piece = board[row][col];
  if (!piece) return [];

  const type = piece[1];
  const color = colorOf(piece);
  const moves = [];

  const push = (r, c, meta = {}) => {
    if (inside(r, c)) moves.push({ row: r, col: c, ...meta });
  };

  if (type === "p") {
    const dir = color === "white" ? -1 : 1;
    const startRow = color === "white" ? 6 : 1;

    if (!attackOnly) {
      const one = row + dir;
      if (inside(one, col) && !board[one][col]) {
        push(one, col);
        const two = row + dir * 2;
        if (row === startRow && inside(two, col) && !board[two][col]) {
          push(two, col);
        }
      }
    }

    for (const dc of [-1, 1]) {
      const r = row + dir;
      const c = col + dc;
      if (!inside(r, c)) continue;
      const target = board[r][c];
      if (attackOnly) {
        push(r, c, { attack: true });
      } else if (target && colorOf(target) !== color) {
        push(r, c, { capture: true });
      }
    }
  }

  if (type === "n") {
    const jumps = [
      [-2, -1], [-2, 1],
      [-1, -2], [-1, 2],
      [1, -2], [1, 2],
      [2, -1], [2, 1],
    ];
    for (const [dr, dc] of jumps) {
      const r = row + dr;
      const c = col + dc;
      if (!inside(r, c)) continue;
      const target = board[r][c];
      if (!target || colorOf(target) !== color) {
        push(r, c, { capture: !!target });
      }
    }
  }

  if (type === "b" || type === "r" || type === "q") {
    const dirs = [];
    if (type === "b" || type === "q") {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === "r" || type === "q") {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const target = board[r][c];
        if (!target) {
          push(r, c);
        } else {
          if (colorOf(target) !== color) {
            push(r, c, { capture: true });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        const r = row + dr;
        const c = col + dc;
        if (!inside(r, c)) continue;
        const target = board[r][c];
        if (!target || colorOf(target) !== color) {
          push(r, c, { capture: !!target });
        }
      }
    }
  }

  return moves;
}

function applyMoveToBoard(board, fromRow, fromCol, toRow, toCol) {
  const next = cloneBoard(board);
  const piece = next[fromRow][fromCol];
  next[toRow][toCol] = piece;
  next[fromRow][fromCol] = null;

  if (piece === "wp" && toRow === 0) next[toRow][toCol] = "wq";
  if (piece === "bp" && toRow === 7) next[toRow][toCol] = "bq";

  return next;
}

function isSquareAttacked(board, targetRow, targetCol, byColor) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece || colorOf(piece) !== byColor) continue;
      const moves = rawMovesForPiece(board, r, c, true);
      if (moves.some((move) => move.row === targetRow && move.col === targetCol)) {
        return true;
      }
    }
  }
  return false;
}

function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos.row, kingPos.col, enemyColor(color));
}

function legalMovesForPiece(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = colorOf(piece);

  return rawMovesForPiece(board, row, col, false).filter((move) => {
    const next = applyMoveToBoard(board, row, col, move.row, move.col);
    return !isInCheck(next, color);
  });
}

function allLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece || colorOf(piece) !== color) continue;

      const pieceMoves = legalMovesForPiece(board, r, c);
      for (const move of pieceMoves) {
        moves.push({
          fromRow: r,
          fromCol: c,
          toRow: move.row,
          toCol: move.col,
          capture: move.capture || false,
        });
      }
    }
  }
  return moves;
}

function setMode(mode) {
  state.mode = mode;

  el.modeCpu.classList.toggle("active", mode === "cpu");
  el.modeLocal.classList.toggle("active", mode === "local");
  el.modeRoom.classList.toggle("active", mode === "room");
  el.modeView.classList.toggle("active", mode === "view");

  if (mode === "cpu") {
    updateStatusBanner("CPU mode", "Start a CPU match.");
  } else if (mode === "local") {
    updateStatusBanner("Local mode", "Pass and play on one board.");
  } else if (mode === "room") {
    updateStatusBanner("Live room mode", "Create or open a room.");
  } else {
    updateStatusBanner("Viewer mode", "Board is watch-only.");
  }

  renderMeta();
  renderBoard();
}

function resetSelection() {
  state.selected = null;
  state.validMoves = [];
}

function updateStatusBanner(title, text) {
  el.resultTitle.textContent = title;
  el.resultText.textContent = text;
}

function currentRoleText() {
  if (state.mode === "cpu") return `${capitalize(state.playerColor)} vs CPU`;
  if (state.mode === "local") return "Local Match";
  if (state.mode === "room") {
    if (state.playerColor === "white") return "White Seat";
    if (state.playerColor === "black") return "Black Seat";
    return "Viewer";
  }
  return "Viewer";
}

function renderMeta() {
  el.roomTurn.textContent = capitalize(state.turn);
  el.whiteClock.textContent = formatClock(state.whiteTime);
  el.blackClock.textContent = formatClock(state.blackTime);

  el.whiteClockCard.classList.toggle("active", state.turn === "white" && !state.gameOver);
  el.blackClockCard.classList.toggle("active", state.turn === "black" && !state.gameOver);

  if (state.mode === "cpu") {
    el.roomTitle.textContent = "CPU Arena";
    el.roomStatus.textContent = state.gameOver ? "Finished" : "Active";
    el.roomType.textContent = `CPU ${capitalize(state.cpuDifficulty)}`;
  } else if (state.mode === "local") {
    el.roomTitle.textContent = "Local Match";
    el.roomStatus.textContent = state.gameOver ? "Finished" : "Active";
    el.roomType.textContent = "Local";
  } else if (state.mode === "room") {
    el.roomTitle.textContent = state.activeRoomTitle || state.activeRoomSlug || "Live Room";
    el.roomStatus.textContent = state.gameOver ? "Finished" : "Live";
    el.roomType.textContent = capitalize(state.activeRoomType || "casual");
  } else {
    el.roomTitle.textContent = state.activeRoomTitle || "Viewer Board";
    el.roomStatus.textContent = "Watching";
    el.roomType.textContent = "Viewer";
  }

  el.roomRole.textContent = currentRoleText();
}

function renderCaptured() {
  el.whiteCaptured.innerHTML = state.capturedByWhite.map((piece) => `<span>${PIECES[piece]}</span>`).join("");
  el.blackCaptured.innerHTML = state.capturedByBlack.map((piece) => `<span>${PIECES[piece]}</span>`).join("");
}

function renderMoveList() {
  if (!state.moveHistory.length) {
    el.moveList.innerHTML = `
      <div class="move-item">
        <strong>No moves yet</strong>
        <span>Open with a clean first move.</span>
      </div>
    `;
    return;
  }

  el.moveList.innerHTML = state.moveHistory.map((move, index) => `
    <div class="move-item">
      <strong>#${index + 1} • ${move.color}</strong>
      <span>${escapeHtml(move.notation)}</span>
    </div>
  `).join("");
}

function squareClass(row, col, legalMoves, kingInCheckPosition) {
  const classes = ["square", (row + col) % 2 === 0 ? "light" : "dark"];

  if (state.selected && state.selected.row === row && state.selected.col === col) {
    classes.push("selected");
  }

  if (state.lastMove) {
    const isFrom = state.lastMove.fromRow === row && state.lastMove.fromCol === col;
    const isTo = state.lastMove.toRow === row && state.lastMove.toCol === col;
    if (isFrom || isTo) classes.push("last-move");
  }

  if (kingInCheckPosition && kingInCheckPosition.row === row && kingInCheckPosition.col === col) {
    classes.push("in-check");
  }

  const legal = legalMoves.find((move) => move.row === row && move.col === col);
  if (legal) {
    classes.push(legal.capture ? "capture-dot" : "move-dot");
  }

  return classes.join(" ");
}

function renderBoard() {
  const displayRanks = state.orientation === "white" ? RANKS_WHITE : RANKS_BLACK;
  const displayFiles = state.orientation === "white" ? FILES_WHITE : FILES_BLACK;

  const checkColor = isInCheck(state.board, state.turn) ? state.turn : null;
  const kingInCheckPosition = checkColor ? findKing(state.board, checkColor) : null;

  el.board.innerHTML = "";

  for (const displayRank of displayRanks) {
    for (const displayFile of displayFiles) {
      const row = 8 - displayRank;
      const col = FILES.indexOf(displayFile);
      const piece = state.board[row][col];

      const square = document.createElement("button");
      square.type = "button";
      square.className = squareClass(row, col, state.validMoves, kingInCheckPosition);
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      square.title = positionLabel(row, col);
      square.innerHTML = piece ? `<span class="piece">${PIECES[piece]}</span>` : "";

      square.addEventListener("click", () => onSquareClick(row, col));
      el.board.appendChild(square);
    }
  }

  renderMeta();
  renderCaptured();
  renderMoveList();
}

function isPlayerTurn() {
  if (state.gameOver) return false;
  if (state.mode === "local") return true;
  if (state.mode === "view") return false;
  if (state.mode === "room") return state.playerColor === state.turn;
  if (state.mode === "cpu") return state.playerColor === state.turn;
  return false;
}

function selectSquare(row, col) {
  const piece = state.board[row][col];
  if (!piece || colorOf(piece) !== state.turn) return;
  if (state.mode === "cpu" && colorOf(piece) !== state.playerColor) return;
  if (state.mode === "room" && colorOf(piece) !== state.playerColor) return;

  state.selected = { row, col };
  state.validMoves = legalMovesForPiece(state.board, row, col);
  renderBoard();
}

function onSquareClick(row, col) {
  if (!isPlayerTurn()) return;

  const clickedPiece = state.board[row][col];

  if (state.selected) {
    const selectedPiece = state.board[state.selected.row][state.selected.col];
    if (clickedPiece && selectedPiece && colorOf(clickedPiece) === colorOf(selectedPiece)) {
      selectSquare(row, col);
      return;
    }

    const move = state.validMoves.find((item) => item.row === row && item.col === col);
    if (move) {
      void makeMove(state.selected.row, state.selected.col, row, col);
      return;
    }

    resetSelection();
    renderBoard();
    return;
  }

  if (!clickedPiece) return;
  if (colorOf(clickedPiece) !== state.turn) return;
  selectSquare(row, col);
}

function startTimerLoop() {
  stopTimerLoop();
  state.timerInterval = setInterval(() => {
    if (state.gameOver) return;

    if (state.turn === "white") {
      state.whiteTime = Math.max(0, state.whiteTime - 1);
      if (state.whiteTime === 0) {
        void finishGame("black", "White clock hit zero.");
      }
    } else {
      state.blackTime = Math.max(0, state.blackTime - 1);
      if (state.blackTime === 0) {
        void finishGame("white", "Black clock hit zero.");
      }
    }

    renderMeta();
  }, 1000);
}

function stopTimerLoop() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

async function ensureCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return;
    state.user = data?.user || null;
  } catch {
    state.user = null;
  }
}

async function loadGamerProfile() {
  if (!state.user) {
    state.gamerProfile = null;
    return;
  }

  try {
    const { data } = await supabase
      .from("gamer_profiles")
      .select("*")
      .eq("user_id", state.user.id)
      .maybeSingle();

    state.gamerProfile = data || null;
  } catch {
    state.gamerProfile = null;
  }
}

async function loadGameRecord() {
  try {
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("slug", "chess")
      .maybeSingle();

    state.gameRecord = data || null;
  } catch {
    state.gameRecord = null;
  }
}

async function createSessionRecord(modeLabel) {
  if (!state.user || !state.gameRecord) {
    state.sessionId = null;
    return;
  }

  try {
    const payload = {
      user_id: state.user.id,
      game_id: state.gameRecord.id,
      status: "active",
      started_at: new Date().toISOString(),
      metadata: {
        mode: modeLabel,
        player_color: state.playerColor,
        cpu_difficulty: state.cpuDifficulty,
      },
    };

    const { data } = await supabase
      .from("game_sessions")
      .insert(payload)
      .select("id")
      .single();

    state.sessionId = data?.id || null;
  } catch {
    state.sessionId = null;
  }
}

async function closeSessionRecord(result) {
  if (!state.sessionId) return;

  try {
    await supabase
      .from("game_sessions")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
        result,
        metadata: {
          mode: state.mode,
          winner: state.winner,
          reason: state.resultReason,
          move_count: state.moveHistory.length,
        },
      })
      .eq("id", state.sessionId);
  } catch {
    // non-blocking
  }
}

async function saveScoreRecord() {
  if (!state.user || !state.gameRecord) return;

  try {
    const baseScore = state.winner === state.playerColor ? 100 : state.winner === "draw" ? 40 : 10;

    await supabase.from("game_scores").insert({
      user_id: state.user.id,
      game_id: state.gameRecord.id,
      score: baseScore,
      metadata: {
        mode: state.mode,
        winner: state.winner,
        move_count: state.moveHistory.length,
        cpu_difficulty: state.cpuDifficulty,
      },
    });
  } catch {
    // non-blocking
  }
}

async function updateGamerProfileResult() {
  if (!state.user || !state.gamerProfile) return;

  const currentWins = Number(state.gamerProfile.wins || 0);
  const currentLosses = Number(state.gamerProfile.losses || 0);
  const currentDraws = Number(state.gamerProfile.draws || 0);

  let wins = currentWins;
  let losses = currentLosses;
  let draws = currentDraws;

  if (state.mode === "cpu" || state.mode === "local") {
    if (state.winner === state.playerColor) wins += 1;
    else if (state.winner === "draw") draws += 1;
    else losses += 1;
  }

  try {
    await supabase
      .from("gamer_profiles")
      .update({
        wins,
        losses,
        draws,
        favorite_game: "Chess",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", state.user.id);

    state.gamerProfile = {
      ...state.gamerProfile,
      wins,
      losses,
      draws,
      favorite_game: "Chess",
    };
  } catch {
    // non-blocking
  }
}

async function finishGame(winner, reason) {
  state.gameOver = true;
  state.winner = winner;
  state.resultReason = reason;
  stopTimerLoop();

  if (winner === "draw") {
    updateStatusBanner("Draw", reason);
  } else {
    updateStatusBanner(`${capitalize(winner)} wins`, reason);
  }

  renderMeta();
  renderBoard();

  await closeSessionRecord(winner);
  await saveScoreRecord();
  await updateGamerProfileResult();

  if (state.mode === "room") {
    await pushRoomStateToRealtime();
  }
}

function checkForEndgame() {
  const nextColor = state.turn;
  const legal = allLegalMoves(state.board, nextColor);

  if (legal.length > 0) {
    if (isInCheck(state.board, nextColor)) {
      updateStatusBanner(`${capitalize(nextColor)} in check`, "Make the next legal move.");
    } else {
      updateStatusBanner("Match active", `${capitalize(nextColor)} to move.`);
    }
    return;
  }

  if (isInCheck(state.board, nextColor)) {
    void finishGame(enemyColor(nextColor), `${capitalize(nextColor)} is checkmated.`);
  } else {
    void finishGame("draw", "Stalemate.");
  }
}

async function pushRoomStateToRealtime() {
  if (!state.activeRoomId || state.mode !== "room") return;

  try {
    const payload = {
      board_state: boardToSimpleString(state.board),
      turn: state.turn,
      move_history: deepClone(state.moveHistory),
      white_time: state.whiteTime,
      black_time: state.blackTime,
      white_captured: deepClone(state.capturedByWhite),
      black_captured: deepClone(state.capturedByBlack),
      status: state.gameOver ? "finished" : "active",
      winner: state.winner,
      result_reason: state.resultReason,
      last_move: state.lastMove,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("chess_rooms")
      .update(payload)
      .eq("id", state.activeRoomId);
  } catch {
    // keep local mode working even if room sync fails
  }
}

async function makeMove(fromRow, fromCol, toRow, toCol) {
  if (state.gameOver) return;

  const piece = state.board[fromRow][fromCol];
  if (!piece) return;

  const target = state.board[toRow][toCol];
  const captured = !!target;

  if (captured) {
    if (colorOf(piece) === "white") state.capturedByWhite.push(target);
    else state.capturedByBlack.push(target);
  }

  state.board = applyMoveToBoard(state.board, fromRow, fromCol, toRow, toCol);
  state.lastMove = { fromRow, fromCol, toRow, toCol };

  const notation = moveNotation(piece, fromRow, fromCol, toRow, toCol, captured);
  state.moveHistory.push({
    move_number: state.currentMoveNumber,
    color: capitalize(state.turn),
    notation,
  });

  if (state.turn === "black") state.currentMoveNumber += 1;

  resetSelection();
  state.turn = enemyColor(state.turn);

  renderBoard();
  checkForEndgame();

  if (!state.gameOver && state.mode === "room") {
    await pushRoomStateToRealtime();
  }

  if (state.mode === "cpu" && !state.gameOver && state.turn !== state.playerColor) {
    window.setTimeout(() => {
      void cpuMove();
    }, 280);
  }
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function cpuMove() {
  if (state.mode !== "cpu" || state.gameOver) return;

  const color = state.turn;
  const moves = allLegalMoves(state.board, color);
  if (!moves.length) {
    checkForEndgame();
    return;
  }

  let chosen = moves[0];

  if (state.cpuDifficulty === "easy") {
    chosen = randomItem(moves);
  }

  if (state.cpuDifficulty === "medium") {
    const captures = moves.filter((move) => !!state.board[move.toRow][move.toCol]);
    chosen = captures.length ? randomItem(captures) : randomItem(moves);
  }

  if (state.cpuDifficulty === "hard") {
    let bestScore = color === "white" ? -Infinity : Infinity;

    for (const move of moves) {
      const nextBoard = applyMoveToBoard(
        state.board,
        move.fromRow,
        move.fromCol,
        move.toRow,
        move.toCol
      );
      const score = evaluateBoard(nextBoard);

      if (color === "white" && score > bestScore) {
        bestScore = score;
        chosen = move;
      }

      if (color === "black" && score < bestScore) {
        bestScore = score;
        chosen = move;
      }
    }
  }

  await makeMove(chosen.fromRow, chosen.fromCol, chosen.toRow, chosen.toCol);
}

async function newGame() {
  stopTimerLoop();
  state.board = cloneBoard(START_BOARD);
  state.turn = "white";
  state.selected = null;
  state.validMoves = [];
  state.moveHistory = [];
  state.capturedByWhite = [];
  state.capturedByBlack = [];
  state.gameOver = false;
  state.winner = null;
  state.resultReason = "";
  state.lastMove = null;
  state.currentMoveNumber = 1;

  state.whiteTime = state.timerBase;
  state.blackTime = state.timerBase;

  updateStatusBanner("Match ready", "Start a game and lock in your first move.");
  renderBoard();
  startTimerLoop();

  await createSessionRecord(state.mode);

  if (state.mode === "cpu" && state.playerColor === "black") {
    window.setTimeout(() => {
      void cpuMove();
    }, 320);
  }

  if (state.mode === "room") {
    await pushRoomStateToRealtime();
  }
}

async function createLiveRoom() {
  const title = el.createRoomTitle.value.trim();
  const slug = slugify(el.createRoomSlug.value.trim() || title);
  const visibility = el.createRoomVisibility.value;
  const timeRaw = el.createRoomTime.value;
  const type = el.createRoomType.value;

  if (!title || !slug) {
    showNotice("error", "Room title and slug are required.");
    return;
  }

  const minutes = Number(String(timeRaw).split("|")[0] || 5);
  const seconds = minutes * 60;

  const localRoom = {
    id: crypto.randomUUID(),
    title,
    slug,
    visibility,
    type,
    time_control: timeRaw,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("chess_rooms")
      .insert({
        title,
        slug,
        visibility,
        type,
        board_state: boardToSimpleString(START_BOARD),
        turn: "white",
        status: "active",
        white_time: seconds,
        black_time: seconds,
        move_history: [],
        white_captured: [],
        black_captured: [],
      })
      .select("*")
      .single();

    if (error) throw error;

    state.activeRoomId = data.id;
    state.activeRoomSlug = data.slug;
    state.activeRoomTitle = data.title;
    state.activeRoomVisibility = data.visibility;
    state.activeRoomType = data.type;
    state.liveRooms.unshift({
      id: data.id,
      title: data.title,
      slug: data.slug,
      visibility: data.visibility,
      type: data.type,
      created_at: data.created_at,
    });

    state.timerBase = seconds;
    state.playerColor = "white";
    state.orientation = "white";
    setMode("room");
    await newGame();
    renderRooms();

    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(data.slug)}`;
    el.inviteLink.textContent = inviteUrl;
    showNotice("success", "Live room created.");
  } catch (error) {
    console.warn("[chess] create room fallback:", error);

    state.liveRooms.unshift(localRoom);
    state.activeRoomId = localRoom.id;
    state.activeRoomSlug = localRoom.slug;
    state.activeRoomTitle = localRoom.title;
    state.activeRoomVisibility = localRoom.visibility;
    state.activeRoomType = localRoom.type;

    state.timerBase = seconds;
    state.playerColor = "white";
    state.orientation = "white";
    setMode("room");
    await newGame();
    renderRooms();

    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(localRoom.slug)}`;
    el.inviteLink.textContent = inviteUrl;
    showNotice("success", "Client room created.");
  }
}

async function fetchRooms() {
  try {
    const { data } = await supabase
      .from("chess_rooms")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (Array.isArray(data) && data.length) {
      state.liveRooms = data.map((room) => ({
        id: room.id,
        title: room.title,
        slug: room.slug,
        visibility: room.visibility,
        type: room.type,
        created_at: room.created_at,
      }));
      return;
    }
  } catch {
    // fallback below
  }

  if (!Array.isArray(state.liveRooms)) state.liveRooms = [];
}

async function openLiveRoom(roomIdOrSlug) {
  try {
    let room = null;

    if (String(roomIdOrSlug).includes("-") || String(roomIdOrSlug).length > 12) {
      const { data } = await supabase
        .from("chess_rooms")
        .select("*")
        .or(`id.eq.${roomIdOrSlug},slug.eq.${roomIdOrSlug}`)
        .maybeSingle();

      room = data || null;
    } else {
      const { data } = await supabase
        .from("chess_rooms")
        .select("*")
        .eq("id", roomIdOrSlug)
        .maybeSingle();

      room = data || null;
    }

    if (room) {
      state.activeRoomId = room.id;
      state.activeRoomSlug = room.slug;
      state.activeRoomTitle = room.title;
      state.activeRoomVisibility = room.visibility;
      state.activeRoomType = room.type;
      state.mode = "room";
      state.board = simpleStringToBoard(room.board_state);
      state.turn = room.turn || "white";
      state.moveHistory = Array.isArray(room.move_history) ? room.move_history : [];
      state.capturedByWhite = Array.isArray(room.white_captured) ? room.white_captured : [];
      state.capturedByBlack = Array.isArray(room.black_captured) ? room.black_captured : [];
      state.whiteTime = Number(room.white_time || state.timerBase);
      state.blackTime = Number(room.black_time || state.timerBase);
      state.gameOver = room.status === "finished";
      state.winner = room.winner || null;
      state.resultReason = room.result_reason || "";
      state.lastMove = room.last_move || null;
      resetSelection();

      setMode("room");
      renderRooms();
      renderBoard();

      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room.slug)}`;
      el.inviteLink.textContent = inviteUrl;
      showNotice("success", `Opened room ${room.title}.`);
      await subscribeToRoom(room.id);
      return;
    }
  } catch {
    // fallback below
  }

  const localRoom = state.liveRooms.find(
    (item) => item.id === roomIdOrSlug || item.slug === roomIdOrSlug
  );

  if (localRoom) {
    state.activeRoomId = localRoom.id;
    state.activeRoomSlug = localRoom.slug;
    state.activeRoomTitle = localRoom.title;
    state.activeRoomVisibility = localRoom.visibility;
    state.activeRoomType = localRoom.type;
    setMode("room");
    renderRooms();

    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(localRoom.slug)}`;
    el.inviteLink.textContent = inviteUrl;
    showNotice("success", `Opened room ${localRoom.title}.`);
  }
}

async function subscribeToRoom(roomId) {
  if (!roomId) return;

  if (state.liveRoomChannel) {
    await supabase.removeChannel(state.liveRoomChannel);
    state.liveRoomChannel = null;
  }

  try {
    state.liveRoomChannel = supabase
      .channel(`chess-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chess_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const room = payload.new;
          state.board = simpleStringToBoard(room.board_state);
          state.turn = room.turn || "white";
          state.moveHistory = Array.isArray(room.move_history) ? room.move_history : [];
          state.capturedByWhite = Array.isArray(room.white_captured) ? room.white_captured : [];
          state.capturedByBlack = Array.isArray(room.black_captured) ? room.black_captured : [];
          state.whiteTime = Number(room.white_time || state.timerBase);
          state.blackTime = Number(room.black_time || state.timerBase);
          state.gameOver = room.status === "finished";
          state.winner = room.winner || null;
          state.resultReason = room.result_reason || "";
          state.lastMove = room.last_move || null;
          resetSelection();
          renderBoard();
        }
      )
      .subscribe();
  } catch {
    // non-blocking
  }
}

async function joinSeat(color) {
  state.playerColor = color;
  state.orientation = color;
  renderBoard();

  if (state.mode === "room" && state.activeRoomId && state.user) {
    try {
      const field = color === "white" ? "white_player_id" : "black_player_id";
      await supabase
        .from("chess_rooms")
        .update({ [field]: state.user.id })
        .eq("id", state.activeRoomId);
    } catch {
      // non-blocking
    }
  }

  showNotice("success", `Joined ${color} side.`);
}

function playCurrent() {
  const current = state.selectedEpisodes?.[state.currentEpisodeIndex];
  if (!current || !current.audio_url) return;
}

function bindEvents() {
  el.modeCpu.addEventListener("click", () => setMode("cpu"));
  el.modeLocal.addEventListener("click", () => setMode("local"));
  el.modeRoom.addEventListener("click", () => setMode("room"));
  el.modeView.addEventListener("click", () => setMode("view"));

  el.cpuDifficulty.addEventListener("change", () => {
    state.cpuDifficulty = el.cpuDifficulty.value;
    renderMeta();
  });

  el.playerColor.addEventListener("change", () => {
    state.playerColor = el.playerColor.value;
    state.orientation = state.playerColor;
    renderBoard();
  });

  el.gameTime.addEventListener("change", () => {
    state.timerBase = Number(el.gameTime.value || 300);
    state.whiteTime = state.timerBase;
    state.blackTime = state.timerBase;
    renderMeta();
  });

  el.startCpuBtn.addEventListener("click", async () => {
    state.cpuDifficulty = el.cpuDifficulty.value;
    state.playerColor = el.playerColor.value;
    state.orientation = state.playerColor;
    state.timerBase = Number(el.gameTime.value || 300);
    setMode("cpu");
    await newGame();
    showNotice("success", `CPU ${capitalize(state.cpuDifficulty)} match started.`);
  });

  el.newLocalBtn.addEventListener("click", async () => {
    state.orientation = "white";
    state.timerBase = Number(el.gameTime.value || 300);
    setMode("local");
    await newGame();
    showNotice("success", "Local match started.");
  });

  el.joinWhiteBtn.addEventListener("click", async () => {
    await joinSeat("white");
  });

  el.joinBlackBtn.addEventListener("click", async () => {
    await joinSeat("black");
  });

  el.flipBoardBtn.addEventListener("click", () => {
    state.orientation = state.orientation === "white" ? "black" : "white";
    renderBoard();
  });

  el.refreshRoomBtn.addEventListener("click", async () => {
    await fetchRooms();
    renderRooms();
    renderBoard();
    showNotice("success", "Board refreshed.");
  });

  el.resignBtn.addEventListener("click", async () => {
    if (state.gameOver) return;
    await finishGame(enemyColor(state.turn), `${capitalize(state.turn)} resigned.`);
    showNotice("success", "Match ended by resignation.");
  });

  el.resetBtn.addEventListener("click", async () => {
    await newGame();
    showNotice("success", "Board reset.");
  });

  el.rematchBtn.addEventListener("click", async () => {
    await newGame();
    showNotice("success", "Rematch started.");
  });

  el.createRoomBtn.addEventListener("click", async () => {
    await createLiveRoom();
  });

  el.copyLinkBtn.addEventListener("click", async () => {
    const value = el.inviteLink.textContent.trim();
    if (!value || value.startsWith("Open")) {
      showNotice("error", "No live room invite link yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showNotice("success", "Invite link copied.");
    } catch {
      showNotice("error", "Could not copy invite link.");
    }
  });
}

function renderRooms() {
  if (!state.liveRooms.length) {
    el.roomList.innerHTML = `
      <div class="room-item">
        <strong>No live rooms loaded</strong>
        <span>Create one when you are ready to run live room mode.</span>
      </div>
    `;
    return;
  }

  el.roomList.innerHTML = state.liveRooms.map((room) => {
    const active = String(room.id) === String(state.activeRoomId) ? "active" : "";
    return `
      <button class="room-item ${active}" data-room-id="${escapeHtml(room.id)}" type="button">
        <strong>${escapeHtml(room.title || room.slug || "Untitled Room")}</strong>
        <span>${escapeHtml(room.visibility || "public")} • ${escapeHtml(room.type || "casual")}</span>
      </button>
    `;
  }).join("");

  Array.from(el.roomList.querySelectorAll("[data-room-id]")).forEach((button) => {
    button.addEventListener("click", async () => {
      const roomId = button.dataset.roomId;
      await openLiveRoom(roomId);
    });
  });
}

async function loadRoomFromQuery() {
  const roomSlug = new URLSearchParams(window.location.search).get("room");
  if (!roomSlug) return;
  await openLiveRoom(roomSlug);
}

async function boot() {
  try {
    bindEvents();

    await ensureCurrentUser();
    await Promise.all([
      loadGamerProfile(),
      loadGameRecord(),
      fetchRooms(),
    ]);

    state.timerBase = Number(el.gameTime.value || 300);
    state.whiteTime = state.timerBase;
    state.blackTime = state.timerBase;
    state.cpuDifficulty = el.cpuDifficulty.value;
    state.playerColor = el.playerColor.value;
    state.orientation = state.playerColor;

    renderRooms();
    renderBoard();
    startTimerLoop();
    await loadRoomFromQuery();

    showNotice("success", "Rich Chess Elite loaded.");
  } catch (error) {
    console.error("[chess] boot error", error);
    showNotice("error", error?.message || "Could not load chess client.");
  }
}

boot();
