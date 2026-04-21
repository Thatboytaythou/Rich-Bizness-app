import {
  cloneBoard,
  coordToSquare,
  getPieceAt,
  getPieceColor,
  getPieceType,
  oppositeColor,
  setPieceAt,
  squareToCoord
} from "./chess-state.js";

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1]
];

const KING_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function pushMove(moves, board, from, to, extras = {}) {
  const captured = getPieceAt(board, to);
  moves.push({
    from,
    to,
    captured: extras.enPassantCapture || captured || null,
    isCapture: Boolean(extras.enPassantCapture || captured),
    promotion: extras.promotion || null,
    enPassant: Boolean(extras.enPassantCapture),
    castle: extras.castle || null
  });
}

function slidingMoves(board, square, color, directions) {
  const coord = squareToCoord(square);
  const moves = [];
  for (const [dr, dc] of directions) {
    let row = coord.row + dr;
    let col = coord.col + dc;
    while (inBounds(row, col)) {
      const targetSquare = coordToSquare(row, col);
      const targetPiece = board[row][col];
      if (!targetPiece) {
        pushMove(moves, board, square, targetSquare);
      } else {
        if (getPieceColor(targetPiece) !== color) {
          pushMove(moves, board, square, targetSquare);
        }
        break;
      }
      row += dr;
      col += dc;
    }
  }
  return moves;
}

function knightMoves(board, square, color) {
  const coord = squareToCoord(square);
  const moves = [];
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const row = coord.row + dr;
    const col = coord.col + dc;
    if (!inBounds(row, col)) continue;
    const piece = board[row][col];
    if (!piece || getPieceColor(piece) !== color) {
      pushMove(moves, board, square, coordToSquare(row, col));
    }
  }
  return moves;
}

function kingMoves(board, square, color, state) {
  const coord = squareToCoord(square);
  const moves = [];
  for (const [dr, dc] of KING_OFFSETS) {
    const row = coord.row + dr;
    const col = coord.col + dc;
    if (!inBounds(row, col)) continue;
    const piece = board[row][col];
    if (!piece || getPieceColor(piece) !== color) {
      pushMove(moves, board, square, coordToSquare(row, col));
    }
  }

  if (state) {
    const isWhite = color === "white";
    const homeRow = isWhite ? 7 : 0;
    const kingMoved = isWhite ? state.castling.whiteKingMoved : state.castling.blackKingMoved;
    if (!kingMoved && coord.row === homeRow && coord.col === 4) {
      const rookHMoved = isWhite ? state.castling.whiteRookH : state.castling.blackRookH;
      const rookAMoved = isWhite ? state.castling.whiteRookA : state.castling.blackRookA;
      if (!rookHMoved && !board[homeRow][5] && !board[homeRow][6]) {
        moves.push({ from: square, to: coordToSquare(homeRow, 6), captured: null, isCapture: false, promotion: null, enPassant: false, castle: "king" });
      }
      if (!rookAMoved && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3]) {
        moves.push({ from: square, to: coordToSquare(homeRow, 2), captured: null, isCapture: false, promotion: null, enPassant: false, castle: "queen" });
      }
    }
  }

  return moves;
}

function pawnMoves(board, square, color, state) {
  const coord = squareToCoord(square);
  const dir = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;
  const promoRow = color === "white" ? 0 : 7;
  const moves = [];

  const oneRow = coord.row + dir;
  if (inBounds(oneRow, coord.col) && !board[oneRow][coord.col]) {
    const to = coordToSquare(oneRow, coord.col);
    if (oneRow === promoRow) {
      ["q", "r", "b", "n"].forEach((promotion) => {
        pushMove(moves, board, square, to, { promotion });
      });
    } else {
      pushMove(moves, board, square, to);
    }

    const twoRow = coord.row + dir * 2;
    if (coord.row === startRow && !board[twoRow][coord.col]) {
      pushMove(moves, board, square, coordToSquare(twoRow, coord.col));
    }
  }

  for (const dc of [-1, 1]) {
    const row = coord.row + dir;
    const col = coord.col + dc;
    if (!inBounds(row, col)) continue;
    const target = board[row][col];
    const to = coordToSquare(row, col);

    if (target && getPieceColor(target) !== color) {
      if (row === promoRow) {
        ["q", "r", "b", "n"].forEach((promotion) => {
          pushMove(moves, board, square, to, { promotion });
        });
      } else {
        pushMove(moves, board, square, to);
      }
    }

    if (state?.enPassant && state.enPassant === to) {
      const captureSquare = coordToSquare(coord.row, col);
      const capturePiece = getPieceAt(board, captureSquare);
      if (capturePiece && getPieceType(capturePiece) === "p" && getPieceColor(capturePiece) !== color) {
        pushMove(moves, board, square, to, { enPassantCapture: capturePiece });
      }
    }
  }

  return moves;
}

function getPseudoMovesForPiece(board, square, piece, state) {
  const color = getPieceColor(piece);
  const type = getPieceType(piece);

  switch (type) {
    case "p":
      return pawnMoves(board, square, color, state);
    case "n":
      return knightMoves(board, square, color);
    case "b":
      return slidingMoves(board, square, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    case "r":
      return slidingMoves(board, square, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "q":
      return slidingMoves(board, square, color, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "k":
      return kingMoves(board, square, color, state);
    default:
      return [];
  }
}

function findKing(board, color) {
  const target = color === "white" ? "wk" : "bk";
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === target) return coordToSquare(row, col);
    }
  }
  return null;
}

export function isSquareAttacked(board, square, byColor, state) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || getPieceColor(piece) !== byColor) continue;
      const from = coordToSquare(row, col);
      const pseudo = getPseudoMovesForPiece(board, from, piece, state);
      if (pseudo.some((move) => move.to === square)) return true;
    }
  }
  return false;
}

export function isKingInCheck(board, color, state) {
  const kingSquare = findKing(board, color);
  if (!kingSquare) return false;
  return isSquareAttacked(board, kingSquare, oppositeColor(color), state);
}

export function applyMoveToBoard(board, move, state) {
  const nextBoard = cloneBoard(board);
  const piece = getPieceAt(nextBoard, move.from);
  if (!piece) return nextBoard;

  setPieceAt(nextBoard, move.from, null);

  if (move.enPassant) {
    const fromCoord = squareToCoord(move.from);
    const toCoord = squareToCoord(move.to);
    const capturedSquare = coordToSquare(fromCoord.row, toCoord.col);
    setPieceAt(nextBoard, capturedSquare, null);
  }

  if (move.castle) {
    const color = getPieceColor(piece);
    const homeRow = color === "white" ? 7 : 0;
    if (move.castle === "king") {
      setPieceAt(nextBoard, coordToSquare(homeRow, 6), piece);
      const rook = getPieceAt(nextBoard, coordToSquare(homeRow, 7));
      setPieceAt(nextBoard, coordToSquare(homeRow, 7), null);
      setPieceAt(nextBoard, coordToSquare(homeRow, 5), rook);
    } else {
      setPieceAt(nextBoard, coordToSquare(homeRow, 2), piece);
      const rook = getPieceAt(nextBoard, coordToSquare(homeRow, 0));
      setPieceAt(nextBoard, coordToSquare(homeRow, 0), null);
      setPieceAt(nextBoard, coordToSquare(homeRow, 3), rook);
    }
    return nextBoard;
  }

  const placedPiece = move.promotion ? `${piece[0]}${move.promotion}` : piece;
  setPieceAt(nextBoard, move.to, placedPiece);
  return nextBoard;
}

function isCastlePathSafe(board, move, color, state) {
  if (!move.castle) return true;
  const homeRow = color === "white" ? 7 : 0;
  const opponent = oppositeColor(color);
  const passSquares = move.castle === "king"
    ? [coordToSquare(homeRow, 4), coordToSquare(homeRow, 5), coordToSquare(homeRow, 6)]
    : [coordToSquare(homeRow, 4), coordToSquare(homeRow, 3), coordToSquare(homeRow, 2)];

  return passSquares.every((sq) => !isSquareAttacked(board, sq, opponent, state));
}

export function getLegalMoves(board, square, state) {
  const piece = getPieceAt(board, square);
  if (!piece) return [];

  const color = getPieceColor(piece);
  const pseudoMoves = getPseudoMovesForPiece(board, square, piece, state);

  return pseudoMoves.filter((move) => {
    if (move.castle && !isCastlePathSafe(board, move, color, state)) return false;
    const nextBoard = applyMoveToBoard(board, move, state);
    return !isKingInCheck(nextBoard, color, state);
  });
}

export function getAllLegalMoves(board, color, state) {
  const moves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || getPieceColor(piece) !== color) continue;
      const square = coordToSquare(row, col);
      moves.push(...getLegalMoves(board, square, state));
    }
  }
  return moves;
}

export function getMoveNotation(board, move) {
  const piece = getPieceAt(board, move.from);
  if (!piece) return `${move.from}-${move.to}`;
  const type = getPieceType(piece);
  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";

  const prefix = type === "p" ? "" : type.toUpperCase();
  const capture = move.isCapture ? "x" : "-";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${prefix}${move.from}${capture}${move.to}${promo}`;
}

export function getGameStatus(board, turn, state) {
  const moves = getAllLegalMoves(board, turn, state);
  const inCheck = isKingInCheck(board, turn, state);

  if (moves.length === 0 && inCheck) {
    return {
      over: true,
      winner: oppositeColor(turn),
      title: "Checkmate",
      text: `${oppositeColor(turn)} wins by checkmate.`
    };
  }

  if (moves.length === 0 && !inCheck) {
    return {
      over: true,
      winner: null,
      title: "Stalemate",
      text: "Draw by stalemate."
    };
  }

  return {
    over: false,
    winner: null,
    title: inCheck ? "Check" : "Match ready",
    text: inCheck ? `${turn} king is in check.` : "Start a game and lock in your first move."
  };
}

export function updateStateAfterMove(state, move, piece) {
  const color = getPieceColor(piece);
  const pieceType = getPieceType(piece);
  const from = squareToCoord(move.from);
  const to = squareToCoord(move.to);

  state.lastMove = { from: move.from, to: move.to };
  state.enPassant = null;

  if (pieceType === "p" && Math.abs(to.row - from.row) === 2) {
    state.enPassant = coordToSquare((from.row + to.row) / 2, from.col);
  }

  if (pieceType === "k") {
    if (color === "white") state.castling.whiteKingMoved = true;
    else state.castling.blackKingMoved = true;
  }

  if (pieceType === "r") {
    if (move.from === "a1") state.castling.whiteRookA = true;
    if (move.from === "h1") state.castling.whiteRookH = true;
    if (move.from === "a8") state.castling.blackRookA = true;
    if (move.from === "h8") state.castling.blackRookH = true;
  }

  if (move.captured) {
    if (getPieceColor(move.captured) === "white") state.blackCaptured.push(move.captured);
    else state.whiteCaptured.push(move.captured);
  }

  state.halfmoveClock = pieceType === "p" || move.captured ? 0 : state.halfmoveClock + 1;
  if (color === "black") state.fullmoveNumber += 1;
}

function evaluateBoard(board) {
  let score = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const value = PIECE_VALUES[getPieceType(piece)] || 0;
      score += getPieceColor(piece) === "white" ? value : -value;
    }
  }
  return score;
}

function minimax(board, depth, maximizingWhite, turn, state, alpha, beta) {
  const status = getGameStatus(board, turn, state);
  if (depth === 0 || status.over) {
    return evaluateBoard(board);
  }

  const moves = getAllLegalMoves(board, turn, state);
  if (maximizingWhite) {
    let best = -Infinity;
    for (const move of moves) {
      const piece = getPieceAt(board, move.from);
      const nextBoard = applyMoveToBoard(board, move, state);
      const nextState = JSON.parse(JSON.stringify({
        ...state,
        board: undefined,
        timerInterval: null
      }));
      updateStateAfterMove(nextState, move, piece);
      const score = minimax(nextBoard, depth - 1, false, oppositeColor(turn), nextState, alpha, beta);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const piece = getPieceAt(board, move.from);
    const nextBoard = applyMoveToBoard(board, move, state);
    const nextState = JSON.parse(JSON.stringify({
      ...state,
      board: undefined,
      timerInterval: null
    }));
    updateStateAfterMove(nextState, move, piece);
    const score = minimax(nextBoard, depth - 1, true, oppositeColor(turn), nextState, alpha, beta);
    best = Math.min(best, score);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseCpuMove(state) {
  const color = state.turn;
  const moves = getAllLegalMoves(state.board, color, state);
  if (!moves.length) return null;

  const difficultyDepth = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  const depth = difficultyDepth[state.cpuDifficulty] || 1;

  if (depth === 1) {
    const captures = moves.filter((move) => move.isCapture);
    return captures[0] || moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = color === "white" ? -Infinity : Infinity;

  for (const move of moves) {
    const piece = getPieceAt(state.board, move.from);
    const nextBoard = applyMoveToBoard(state.board, move, state);
    const nextState = JSON.parse(JSON.stringify({
      ...state,
      board: undefined,
      timerInterval: null
    }));
    updateStateAfterMove(nextState, move, piece);
    const score = minimax(
      nextBoard,
      depth - 1,
      color === "black",
      oppositeColor(color),
      nextState,
      -Infinity,
      Infinity
    );

    if (color === "white") {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
