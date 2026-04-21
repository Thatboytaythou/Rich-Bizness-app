// src/gaming/chess-state.js

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS_WHITE = [8, 7, 6, 5, 4, 3, 2, 1];
export const RANKS_BLACK = [1, 2, 3, 4, 5, 6, 7, 8];

export const START_BOARD = [
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
];

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100
};

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function createInitialBoard() {
  return cloneBoard(START_BOARD);
}

export function getPieceColor(piece) {
  if (!piece) return null;
  return piece[0] === "w" ? "white" : "black";
}

export function getPieceSide(piece) {
  if (!piece) return null;
  return piece[0];
}

export function getPieceType(piece) {
  if (!piece) return null;
  return piece[1];
}

export function isWhitePiece(piece) {
  return getPieceSide(piece) === "w";
}

export function isBlackPiece(piece) {
  return getPieceSide(piece) === "b";
}

export function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

export function coordsToSquare(row, col) {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return `${FILES[col]}${8 - row}`;
}

export function squareToCoords(square) {
  if (!square || square.length < 2) return null;
  const file = square[0].toLowerCase();
  const rank = Number(square.slice(1));
  const col = FILES.indexOf(file);
  const row = 8 - rank;

  if (col < 0 || row < 0 || row > 7) return null;
  return { row, col };
}

export function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function getPieceAt(board, row, col) {
  if (!inBounds(row, col)) return null;
  return board[row][col];
}

export function setPieceAt(board, row, col, piece) {
  if (!inBounds(row, col)) return;
  board[row][col] = piece;
}

export function boardToFlatSquares(board) {
  const list = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      list.push({
        row,
        col,
        square: coordsToSquare(row, col),
        piece: board[row][col]
      });
    }
  }
  return list;
}

export function createMoveRecord({
  from,
  to,
  piece,
  captured = null,
  promotion = null,
  san = null,
  color = null,
  moveNumber = null,
  isCastle = false,
  isEnPassant = false,
  isCheck = false,
  isCheckmate = false
}) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    from,
    to,
    piece,
    captured,
    promotion,
    san: san || `${from}-${to}`,
    color,
    moveNumber,
    isCastle,
    isEnPassant,
    isCheck,
    isCheckmate,
    createdAt: new Date().toISOString()
  };
}

export function applyMoveToBoard(board, move) {
  const next = cloneBoard(board);

  const fromCoords = squareToCoords(move.from);
  const toCoords = squareToCoords(move.to);

  if (!fromCoords || !toCoords) return next;

  const movingPiece = move.piece || getPieceAt(next, fromCoords.row, fromCoords.col);
  const finalPiece = move.promotion
    ? `${movingPiece?.[0] || "w"}${move.promotion}`
    : movingPiece;

  setPieceAt(next, fromCoords.row, fromCoords.col, null);
  setPieceAt(next, toCoords.row, toCoords.col, finalPiece);

  if (move.isCastle) {
    if (move.to === "g1") {
      setPieceAt(next, 7, 7, null);
      setPieceAt(next, 7, 5, "wr");
    }
    if (move.to === "c1") {
      setPieceAt(next, 7, 0, null);
      setPieceAt(next, 7, 3, "wr");
    }
    if (move.to === "g8") {
      setPieceAt(next, 0, 7, null);
      setPieceAt(next, 0, 5, "br");
    }
    if (move.to === "c8") {
      setPieceAt(next, 0, 0, null);
      setPieceAt(next, 0, 3, "br");
    }
  }

  if (move.isEnPassant) {
    const dir = getPieceColor(movingPiece) === "white" ? 1 : -1;
    setPieceAt(next, toCoords.row + dir, toCoords.col, null);
  }

  return next;
}

export function getCapturedPiecesFromMoves(moves = []) {
  const whiteCaptured = [];
  const blackCaptured = [];

  for (const move of moves) {
    if (!move?.captured) continue;

    const capturedColor = getPieceColor(move.captured);
    if (capturedColor === "black") {
      whiteCaptured.push(move.captured);
    } else if (capturedColor === "white") {
      blackCaptured.push(move.captured);
    }
  }

  return { whiteCaptured, blackCaptured };
}

export function getMaterialScore(capturedPieces = []) {
  return capturedPieces.reduce((sum, piece) => {
    const type = getPieceType(piece);
    return sum + (PIECE_VALUES[type] || 0);
  }, 0);
}

export function findKingSquare(board, color) {
  const target = color === "white" ? "wk" : "bk";
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === target) {
        return coordsToSquare(row, col);
      }
    }
  }
  return null;
}

export function createInitialGameState(overrides = {}) {
  return {
    board: createInitialBoard(),
    moves: [],
    turn: "white",
    selectedSquare: null,
    legalMoves: [],
    lastMove: null,
    whiteCaptured: [],
    blackCaptured: [],
    whiteTime: 300,
    blackTime: 300,
    timerBase: 300,
    increment: 0,
    cpuDifficulty: "easy",
    mode: "cpu",
    playerColor: "white",
    orientation: "white",
    status: "ready",
    roomTitle: "CPU Arena",
    roomStatus: "Ready",
    roomType: "CPU",
    roomRole: "White",
    roomVisibility: "public",
    resultTitle: "Match ready",
    resultText: "Start a game and lock in your first move.",
    checkSquare: null,
    ...overrides
  };
}

export function resetGameState(state = {}, overrides = {}) {
  const next = createInitialGameState({
    timerBase: state.timerBase || 300,
    cpuDifficulty: state.cpuDifficulty || "easy",
    playerColor: state.playerColor || "white",
    orientation: state.playerColor || "white",
    mode: state.mode || "cpu",
    ...overrides
  });

  next.whiteTime = next.timerBase;
  next.blackTime = next.timerBase;
  return next;
}

export default {
  FILES,
  RANKS_WHITE,
  RANKS_BLACK,
  START_BOARD,
  cloneBoard,
  createInitialBoard,
  getPieceColor,
  getPieceSide,
  getPieceType,
  isWhitePiece,
  isBlackPiece,
  oppositeColor,
  coordsToSquare,
  squareToCoords,
  inBounds,
  getPieceAt,
  setPieceAt,
  boardToFlatSquares,
  createMoveRecord,
  applyMoveToBoard,
  getCapturedPiecesFromMoves,
  getMaterialScore,
  findKingSquare,
  createInitialGameState,
  resetGameState
};
