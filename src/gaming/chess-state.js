export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

export const PIECES = {
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

export function coordToSquare(row, col) {
  return `${FILES[col]}${8 - row}`;
}

export function squareToCoord(square) {
  if (!square || square.length < 2) return null;
  const file = square[0];
  const rank = Number(square.slice(1));
  const col = FILES.indexOf(file);
  const row = 8 - rank;
  if (col < 0 || row < 0 || row > 7) return null;
  return { row, col };
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function createInitialBoard() {
  return [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
  ];
}

export function createInitialState() {
  return {
    mode: "cpu",
    orientation: "white",
    playerColor: "white",
    cpuDifficulty: "easy",
    timerBase: 300,
    whiteTime: 300,
    blackTime: 300,
    timerInterval: null,
    board: createInitialBoard(),
    turn: "white",
    selectedSquare: null,
    legalTargets: [],
    captureTargets: [],
    moveHistory: [],
    whiteCaptured: [],
    blackCaptured: [],
    lastMove: null,
    result: null,
    statusText: "Ready",
    roomTitle: "CPU Arena",
    roomStatus: "Ready",
    roomRole: "White",
    roomType: "CPU",
    currentRoomId: null,
    roomSlug: null,
    rooms: [],
    currentUser: null,
    gameRecord: null,
    gameOver: false,
    cpuThinking: false,
    boardLocked: false,
    boardFlipped: false,
    castling: {
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteRookA: false,
      whiteRookH: false,
      blackRookA: false,
      blackRookH: false
    },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    liveSyncEnabled: false
  };
}

export function resetBoardState(state, overrides = {}) {
  const fresh = createInitialState();
  const preserved = {
    mode: overrides.mode ?? state.mode,
    orientation: overrides.orientation ?? state.orientation,
    playerColor: overrides.playerColor ?? state.playerColor,
    cpuDifficulty: overrides.cpuDifficulty ?? state.cpuDifficulty,
    timerBase: overrides.timerBase ?? state.timerBase,
    roomTitle: overrides.roomTitle ?? state.roomTitle,
    roomStatus: overrides.roomStatus ?? state.roomStatus,
    roomRole: overrides.roomRole ?? state.roomRole,
    roomType: overrides.roomType ?? state.roomType,
    currentRoomId: overrides.currentRoomId ?? state.currentRoomId,
    roomSlug: overrides.roomSlug ?? state.roomSlug,
    rooms: overrides.rooms ?? state.rooms,
    currentUser: overrides.currentUser ?? state.currentUser,
    gameRecord: overrides.gameRecord ?? state.gameRecord,
    liveSyncEnabled: overrides.liveSyncEnabled ?? state.liveSyncEnabled
  };

  Object.assign(state, fresh, preserved);
  state.whiteTime = preserved.timerBase;
  state.blackTime = preserved.timerBase;
  return state;
}

export function getPieceColor(piece) {
  if (!piece) return null;
  return piece[0] === "w" ? "white" : "black";
}

export function getPieceType(piece) {
  return piece ? piece[1] : null;
}

export function getPieceAt(board, square) {
  const coord = squareToCoord(square);
  if (!coord) return null;
  return board[coord.row][coord.col];
}

export function setPieceAt(board, square, piece) {
  const coord = squareToCoord(square);
  if (!coord) return;
  board[coord.row][coord.col] = piece;
}

export function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

export function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function getOrderedFiles(orientation = "white") {
  return orientation === "black" ? [...FILES].reverse() : FILES;
}

export function getOrderedRanks(orientation = "white") {
  return orientation === "black" ? [...RANKS].reverse() : RANKS;
}
