const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export function createInitialBoard() {
  return [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  ];
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function cloneState(state) {
  return {
    ...state,
    board: cloneBoard(state.board),
    capturedWhite: [...(state.capturedWhite || [])],
    capturedBlack: [...(state.capturedBlack || [])],
    moveHistory: [...(state.moveHistory || [])],
    castling: {
      whiteKingSide: state.castling?.whiteKingSide ?? true,
      whiteQueenSide: state.castling?.whiteQueenSide ?? true,
      blackKingSide: state.castling?.blackKingSide ?? true,
      blackQueenSide: state.castling?.blackQueenSide ?? true,
    },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  };
}

export function createInitialGameState(overrides = {}) {
  return {
    board: createInitialBoard(),
    turn: "white",
    winner: null,
    result: null,
    checked: null,
    lastMove: null,
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    moveHistory: [],
    capturedWhite: [],
    capturedBlack: [],
    castling: {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    },
    ...overrides,
  };
}

export function getPieceColor(piece) {
  if (!piece) return null;
  return piece[0] === "w" ? "white" : "black";
}

export function getPieceType(piece) {
  if (!piece) return null;
  return piece[1];
}

export function colorToPrefix(color) {
  return color === "white" ? "w" : "b";
}

export function otherColor(color) {
  return color === "white" ? "black" : "white";
}

export function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function toSquare(row, col) {
  return `${FILES[col]}${8 - row}`;
}

export function fromSquare(square) {
  if (!square || square.length < 2) return null;
  const file = square[0].toLowerCase();
  const rank = Number(square[1]);
  const col = FILES.indexOf(file);
  const row = 8 - rank;
  if (!inBounds(row, col)) return null;
  return { row, col };
}

function makeMoveObject(fromRow, fromCol, toRow, toCol, extras = {}) {
  return {
    fromRow,
    fromCol,
    toRow,
    toCol,
    from: toSquare(fromRow, fromCol),
    to: toSquare(toRow, toCol),
    ...extras,
  };
}

function getCastlingRights(state, color) {
  if (color === "white") {
    return {
      kingSide: !!state.castling?.whiteKingSide,
      queenSide: !!state.castling?.whiteQueenSide,
    };
  }
  return {
    kingSide: !!state.castling?.blackKingSide,
    queenSide: !!state.castling?.blackQueenSide,
  };
}

function pushSlidingMoves(board, row, col, color, directions, moves) {
  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push(makeMoveObject(row, col, r, c));
      } else {
        if (getPieceColor(target) !== color) {
          moves.push(
            makeMoveObject(row, col, r, c, {
              isCapture: true,
              capturedPiece: target,
            })
          );
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function generatePawnMoves(state, row, col, color) {
  const board = state.board;
  const moves = [];
  const dir = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;
  const promotionRow = color === "white" ? 0 : 7;

  const oneRow = row + dir;
  if (inBounds(oneRow, col) && !board[oneRow][col]) {
    if (oneRow === promotionRow) {
      for (const promotion of ["q", "r", "b", "n"]) {
        moves.push(
          makeMoveObject(row, col, oneRow, col, {
            isPromotion: true,
            promotion,
          })
        );
      }
    } else {
      moves.push(makeMoveObject(row, col, oneRow, col));
    }

    const twoRow = row + dir * 2;
    if (row === startRow && inBounds(twoRow, col) && !board[twoRow][col]) {
      moves.push(
        makeMoveObject(row, col, twoRow, col, {
          isDoublePawnPush: true,
        })
      );
    }
  }

  for (const dc of [-1, 1]) {
    const r = row + dir;
    const c = col + dc;
    if (!inBounds(r, c)) continue;

    const target = board[r][c];
    if (target && getPieceColor(target) !== color) {
      if (r === promotionRow) {
        for (const promotion of ["q", "r", "b", "n"]) {
          moves.push(
            makeMoveObject(row, col, r, c, {
              isCapture: true,
              capturedPiece: target,
              isPromotion: true,
              promotion,
            })
          );
        }
      } else {
        moves.push(
          makeMoveObject(row, col, r, c, {
            isCapture: true,
            capturedPiece: target,
          })
        );
      }
    }
  }

  if (state.enPassant) {
    const ep = state.enPassant;
    if (ep.color !== color && ep.row === row + dir && Math.abs(ep.col - col) === 1) {
      const capturedRow = row;
      const capturedCol = ep.col;
      const capturedPiece = board[capturedRow][capturedCol];
      if (capturedPiece && getPieceType(capturedPiece) === "p") {
        moves.push(
          makeMoveObject(row, col, ep.row, ep.col, {
            isCapture: true,
            isEnPassant: true,
            capturedPiece,
            capturedRow,
            capturedCol,
          })
        );
      }
    }
  }

  return moves;
}

function generateKnightMoves(state, row, col, color) {
  const board = state.board;
  const moves = [];
  const deltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  for (const [dr, dc] of deltas) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    const target = board[r][c];
    if (!target) {
      moves.push(makeMoveObject(row, col, r, c));
    } else if (getPieceColor(target) !== color) {
      moves.push(
        makeMoveObject(row, col, r, c, {
          isCapture: true,
          capturedPiece: target,
        })
      );
    }
  }

  return moves;
}

function generateBishopMoves(state, row, col, color) {
  const moves = [];
  pushSlidingMoves(
    state.board,
    row,
    col,
    color,
    [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    moves
  );
  return moves;
}

function generateRookMoves(state, row, col, color) {
  const moves = [];
  pushSlidingMoves(
    state.board,
    row,
    col,
    color,
    [[-1, 0], [1, 0], [0, -1], [0, 1]],
    moves
  );
  return moves;
}

function generateQueenMoves(state, row, col, color) {
  const moves = [];
  pushSlidingMoves(
    state.board,
    row,
    col,
    color,
    [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ],
    moves
  );
  return moves;
}

function generateKingMoves(state, row, col, color) {
  const board = state.board;
  const moves = [];
  const deltas = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [dr, dc] of deltas) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    const target = board[r][c];
    if (!target) {
      moves.push(makeMoveObject(row, col, r, c));
    } else if (getPieceColor(target) !== color) {
      moves.push(
        makeMoveObject(row, col, r, c, {
          isCapture: true,
          capturedPiece: target,
        })
      );
    }
  }

  const rights = getCastlingRights(state, color);
  const homeRow = color === "white" ? 7 : 0;

  if (row === homeRow && col === 4 && !isKingInCheck(state, color)) {
    if (
      rights.kingSide &&
      !board[homeRow][5] &&
      !board[homeRow][6] &&
      board[homeRow][7] === `${colorToPrefix(color)}r` &&
      !isSquareAttacked(state, homeRow, 5, otherColor(color)) &&
      !isSquareAttacked(state, homeRow, 6, otherColor(color))
    ) {
      moves.push(
        makeMoveObject(row, col, homeRow, 6, {
          isCastle: true,
          castleSide: "king",
        })
      );
    }

    if (
      rights.queenSide &&
      !board[homeRow][1] &&
      !board[homeRow][2] &&
      !board[homeRow][3] &&
      board[homeRow][0] === `${colorToPrefix(color)}r` &&
      !isSquareAttacked(state, homeRow, 3, otherColor(color)) &&
      !isSquareAttacked(state, homeRow, 2, otherColor(color))
    ) {
      moves.push(
        makeMoveObject(row, col, homeRow, 2, {
          isCastle: true,
          castleSide: "queen",
        })
      );
    }
  }

  return moves;
}

export function generatePseudoLegalMovesForSquare(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece) return [];

  const color = getPieceColor(piece);
  const type = getPieceType(piece);

  switch (type) {
    case "p":
      return generatePawnMoves(state, row, col, color);
    case "n":
      return generateKnightMoves(state, row, col, color);
    case "b":
      return generateBishopMoves(state, row, col, color);
    case "r":
      return generateRookMoves(state, row, col, color);
    case "q":
      return generateQueenMoves(state, row, col, color);
    case "k":
      return generateKingMoves(state, row, col, color);
    default:
      return [];
  }
}

export function findKing(board, color) {
  const target = `${colorToPrefix(color)}k`;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === target) {
        return { row, col };
      }
    }
  }
  return null;
}

export function isSquareAttacked(state, row, col, byColor) {
  const board = state.board;
  const enemyPrefix = colorToPrefix(byColor);

  const pawnDir = byColor === "white" ? -1 : 1;
  const pawnRow = row - pawnDir;
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (inBounds(pawnRow, c) && board[pawnRow][c] === `${enemyPrefix}p`) {
      return true;
    }
  }

  const knightDeltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightDeltas) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === `${enemyPrefix}n`) {
      return true;
    }
  }

  const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (getPieceColor(piece) === byColor) {
          const type = getPieceType(piece);
          if (type === "r" || type === "q") return true;
          if (type === "k" && Math.max(Math.abs(r - row), Math.abs(c - col)) === 1) return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const diagonalDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagonalDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (getPieceColor(piece) === byColor) {
          const type = getPieceType(piece);
          if (type === "b" || type === "q") return true;
          if (type === "k" && Math.max(Math.abs(r - row), Math.abs(c - col)) === 1) return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isKingInCheck(state, color) {
  const king = findKing(state.board, color);
  if (!king) return false;
  return isSquareAttacked(state, king.row, king.col, otherColor(color));
}

function updateCastlingRights(nextState, piece, move) {
  const color = getPieceColor(piece);

  if (piece === "wk") {
    nextState.castling.whiteKingSide = false;
    nextState.castling.whiteQueenSide = false;
  }
  if (piece === "bk") {
    nextState.castling.blackKingSide = false;
    nextState.castling.blackQueenSide = false;
  }

  if (piece === "wr") {
    if (move.fromRow === 7 && move.fromCol === 0) nextState.castling.whiteQueenSide = false;
    if (move.fromRow === 7 && move.fromCol === 7) nextState.castling.whiteKingSide = false;
  }
  if (piece === "br") {
    if (move.fromRow === 0 && move.fromCol === 0) nextState.castling.blackQueenSide = false;
    if (move.fromRow === 0 && move.fromCol === 7) nextState.castling.blackKingSide = false;
  }

  const captured = move.capturedPiece;
  if (captured === "wr") {
    if (move.toRow === 7 && move.toCol === 0) nextState.castling.whiteQueenSide = false;
    if (move.toRow === 7 && move.toCol === 7) nextState.castling.whiteKingSide = false;
  }
  if (captured === "br") {
    if (move.toRow === 0 && move.toCol === 0) nextState.castling.blackQueenSide = false;
    if (move.toRow === 0 && move.toCol === 7) nextState.castling.blackKingSide = false;
  }

  if (move.isEnPassant && captured) {
    const capturedColor = getPieceColor(captured);
    if (capturedColor !== color) {
      if (captured === "wr") {
        if (move.capturedRow === 7 && move.capturedCol === 0) nextState.castling.whiteQueenSide = false;
        if (move.capturedRow === 7 && move.capturedCol === 7) nextState.castling.whiteKingSide = false;
      }
      if (captured === "br") {
        if (move.capturedRow === 0 && move.capturedCol === 0) nextState.castling.blackQueenSide = false;
        if (move.capturedRow === 0 && move.capturedCol === 7) nextState.castling.blackKingSide = false;
      }
    }
  }
}

export function applyMove(state, move) {
  const nextState = cloneState(state);
  const board = nextState.board;

  const piece = board[move.fromRow][move.fromCol];
  if (!piece) return nextState;

  const color = getPieceColor(piece);
  const enemy = otherColor(color);

  let capturedPiece = move.capturedPiece || board[move.toRow][move.toCol] || null;

  board[move.fromRow][move.fromCol] = null;

  if (move.isEnPassant) {
    board[move.capturedRow][move.capturedCol] = null;
  }

  if (move.isCastle) {
    if (move.castleSide === "king") {
      board[move.toRow][move.toCol] = piece;
      board[move.toRow][5] = board[move.toRow][7];
      board[move.toRow][7] = null;
    } else {
      board[move.toRow][move.toCol] = piece;
      board[move.toRow][3] = board[move.toRow][0];
      board[move.toRow][0] = null;
    }
  } else {
    if (move.isPromotion) {
      board[move.toRow][move.toCol] = `${colorToPrefix(color)}${move.promotion || "q"}`;
    } else {
      board[move.toRow][move.toCol] = piece;
    }
  }

  if (capturedPiece) {
    if (color === "white") nextState.capturedWhite.push(capturedPiece);
    else nextState.capturedBlack.push(capturedPiece);
  }

  updateCastlingRights(nextState, piece, { ...move, capturedPiece });

  if (move.isDoublePawnPush) {
    nextState.enPassant = {
      row: (move.fromRow + move.toRow) / 2,
      col: move.fromCol,
      color,
    };
  } else {
    nextState.enPassant = null;
  }

  const isPawnMove = getPieceType(piece) === "p";
  nextState.halfmoveClock = isPawnMove || capturedPiece ? 0 : (nextState.halfmoveClock || 0) + 1;
  if (color === "black") nextState.fullmoveNumber = (nextState.fullmoveNumber || 1) + 1;

  nextState.lastMove = {
    fromRow: move.fromRow,
    fromCol: move.fromCol,
    toRow: move.toRow,
    toCol: move.toCol,
    piece,
    capturedPiece,
    san: toSimpleNotation(piece, move, capturedPiece),
  };

  nextState.moveHistory.push(nextState.lastMove);
  nextState.turn = enemy;
  nextState.checked = isKingInCheck(nextState, enemy) ? enemy : null;

  if (isCheckmate(nextState, enemy)) {
    nextState.winner = color;
    nextState.result = `${color} wins by checkmate`;
  } else if (isStalemate(nextState, enemy)) {
    nextState.winner = null;
    nextState.result = "draw by stalemate";
  } else if ((nextState.halfmoveClock || 0) >= 100) {
    nextState.winner = null;
    nextState.result = "draw by 50-move rule";
  }

  return nextState;
}

export function getLegalMovesForSquare(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece) return [];
  const color = getPieceColor(piece);
  if (state.turn && color !== state.turn) return [];

  const pseudo = generatePseudoLegalMovesForSquare(state, row, col);
  return pseudo.filter((move) => {
    const nextState = applyMove(state, move);
    return !isKingInCheck(nextState, color);
  });
}

export function generateAllLegalMoves(state, color = state.turn) {
  const moves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = state.board[row][col];
      if (!piece || getPieceColor(piece) !== color) continue;

      const pieceMoves = getLegalMovesForSquare(
        { ...state, turn: color },
        row,
        col
      );
      moves.push(...pieceMoves);
    }
  }
  return moves;
}

export function isCheckmate(state, color = state.turn) {
  if (!isKingInCheck(state, color)) return false;
  return generateAllLegalMoves(state, color).length === 0;
}

export function isStalemate(state, color = state.turn) {
  if (isKingInCheck(state, color)) return false;
  return generateAllLegalMoves(state, color).length === 0;
}

export function hasInsufficientMaterial(board) {
  const pieces = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece) pieces.push(piece);
    }
  }

  const nonKings = pieces.filter((p) => getPieceType(p) !== "k");
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1) {
    const type = getPieceType(nonKings[0]);
    return type === "b" || type === "n";
  }
  return false;
}

export function toSimpleNotation(piece, move, capturedPiece = null) {
  const type = getPieceType(piece);
  if (move.isCastle) return move.castleSide === "king" ? "O-O" : "O-O-O";

  const pieceLetter = type === "p" ? "" : type.toUpperCase();
  const captureMark = capturedPiece ? "x" : "";
  const pawnFile = type === "p" && capturedPiece ? FILES[move.fromCol] : "";
  const promo = move.isPromotion ? `=${(move.promotion || "q").toUpperCase()}` : "";
  return `${pieceLetter || pawnFile}${captureMark}${toSquare(move.toRow, move.toCol)}${promo}`;
}

export function evaluateBoard(board) {
  let score = 0;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const color = getPieceColor(piece);
      const type = getPieceType(piece);
      const value = PIECE_VALUES[type] || 0;
      score += color === "white" ? value : -value;
    }
  }

  return score;
}

export function chooseCpuMove(state, level = "easy") {
  const color = state.turn;
  const legalMoves = generateAllLegalMoves(state, color);
  if (!legalMoves.length) return null;

  if (level === "easy") {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const scored = legalMoves.map((move) => {
    const next = applyMove(state, move);
    const score = evaluateBoard(next.board);
    return { move, score };
  });

  if (color === "white") {
    scored.sort((a, b) => b.score - a.score);
  } else {
    scored.sort((a, b) => a.score - b.score);
  }

  if (level === "medium") {
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  return scored[0].move;
}
