import {
  createInitialGameState,
  applyMove,
  generateAllLegalMoves,
  isCheckmate,
  isStalemate
} from "./chess-engine.js";

export const state = {
  game: createInitialGameState(),

  // modes
  mode: "cpu", // cpu | local | room | viewer
  cpuDifficulty: "easy",
  playerColor: "white",

  // ui
  selectedSquare: null,
  legalMoves: [],

  // board orientation
  orientation: "white",

  // timers
  timerBase: 300,
  whiteTime: 300,
  blackTime: 300,
  timerInterval: null,

  // room
  roomId: null,
  roomData: null,

  // user
  user: null,
};
