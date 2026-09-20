"use client";

import { create } from "zustand";
import { getDifficulty } from "@/content/catalog";
import {
  autoCrossCells,
  createBoard,
  CROSSED,
  EMPTY,
  FILLED,
  findHint,
  findMistakes,
  HINT_INTERVAL_SECONDS,
  History,
  isLineSatisfied,
  isMistake,
  isSolved,
  lineCells,
  lineCellIndex,
  lineStatuses,
  MAX_HEARTS,
  rateStars,
  Stroke,
  type Axis,
  type Board,
  type CellChange,
  type CellState,
  type Hint,
  type ParsedPuzzle,
  type Point,
  type Tool,
} from "@/game";
import { packCells, unpackCells, type CurrentGame, type GameMode, type GameSourceKind } from "@/storage";
import { gameEvents } from "./events";
import { useSaveStore } from "./save";

export interface SessionSource {
  kind: GameSourceKind;
  /** Date key for daily puzzles. */
  day: string;
}

export interface GameResult {
  stars: number;
  time: number;
  mistakes: number;
  hintsUsed: number;
  isNewBest: boolean;
  firstSolve: boolean;
}

export type GameStatus = "idle" | "playing" | "solved" | "failed";

export interface StartOptions {
  puzzle: ParsedPuzzle;
  mode: GameMode;
  source: SessionSource;
  restore?: CurrentGame | null;
}

interface GameState {
  puzzle: ParsedPuzzle | null;
  source: SessionSource;
  mode: GameMode;
  tool: Tool;
  board: Board;
  status: GameStatus;
  hearts: number;
  mistakes: number;
  hintsUsed: number;
  /** Seconds of play towards the next free hint. */
  hintClock: number;
  /** Seconds of play. */
  elapsed: number;
  /** Bumped on every board change; the 3D scene and overlays key off it. */
  version: number;
  rowsDone: boolean[];
  colsDone: boolean[];
  hover: Point | null;
  cursor: Point | null;
  activeHint: Hint | null;
  /** Result of the last "check my board" (Relax): number of wrong cells. */
  checkResult: { wrong: number; at: number } | null;
  result: GameResult | null;
  paused: boolean;
  canUndo: boolean;
  canRedo: boolean;

  start: (opts: StartOptions) => void;
  restart: () => void;
  setTool: (t: Tool) => void;
  setHover: (p: Point | null) => void;
  setPaused: (p: boolean) => void;
  strokeStart: (cell: Point, tool?: Tool) => boolean;
  strokeMove: (cell: Point) => void;
  strokeEnd: () => void;
  /** Reverts the stroke in progress completely (multi-touch, long-press). */
  strokeCancel: () => void;
  /** Reverts the last finished stroke as if it never happened (double-tap). */
  undoLastTap: () => void;
  undo: () => void;
  redo: () => void;
  takeHint: () => Hint | null;
  clearHint: () => void;
  check: () => number;
  tick: (dtSeconds: number) => void;
  moveCursor: (dx: number, dy: number) => void;
  cursorAct: (tool: Tool) => void;
  hintReady: () => boolean;
  /** Persists the current game immediately (used when leaving the screen). */
  saveNow: () => void;
}

interface StrokeInfo {
  stroke: Stroke;
  processed: number;
  snapshot: { hearts: number; mistakes: number };
  charged: boolean;
  rows: Set<number>;
  cols: Set<number>;
}

// Non-reactive session internals.
let active: StrokeInfo | null = null;
let history = new History();
let lastStrokeSnapshot: { hearts: number; mistakes: number } | null = null;
let combo = { count: 0, at: 0 };
let lastPersist = 0;

const emptyBoard = createBoard(1, 1);

function nextCombo(): number {
  const now = performance.now();
  combo = { count: now - combo.at < 3000 ? combo.count + 1 : 1, at: now };
  return combo.count;
}

export const useGame = create<GameState>((set, get) => {
  const setBoardState = () => {
    const { puzzle, board } = get();
    if (!puzzle) return;
    const s = lineStatuses(board, puzzle.clues);
    set((st) => ({ rowsDone: s.rows, colsDone: s.cols, version: st.version + 1, canUndo: history.canUndo, canRedo: history.canRedo }));
  };

  const persist = (force = false) => {
    const st = get();
    if (!st.puzzle || st.status !== "playing") return;
    const now = performance.now();
    if (!force && now - lastPersist < 8000) return;
    lastPersist = now;
    useSaveStore.getState().setCurrent({
      id: st.puzzle.def.id,
      mode: st.mode,
      src: st.source.kind,
      day: st.source.day,
      cells: packCells(st.board.cells),
      time: Math.round(st.elapsed),
      hearts: st.hearts,
      hintClock: Math.round(st.hintClock),
      hintsUsed: st.hintsUsed,
      mistakes: st.mistakes,
    });
  };

  const complete = () => {
    const st = get();
    const puzzle = st.puzzle;
    if (!puzzle || st.status !== "playing") return;
    active = null;
    const level = getDifficulty(puzzle.def.id).level;
    const stars = st.mode === "challenge" ? rateStars({ size: puzzle.width, difficultyLevel: level, seconds: st.elapsed, mistakes: st.mistakes }) : 0;
    const outcome = useSaveStore.getState().recordSolve({
      id: puzzle.def.id,
      src: st.source.kind,
      day: st.source.day,
      mode: st.mode,
      time: st.elapsed,
      stars,
      playSeconds: st.elapsed,
      hintsUsed: st.hintsUsed,
    });
    set({
      status: "solved",
      activeHint: null,
      result: { stars, time: Math.round(st.elapsed), mistakes: st.mistakes, hintsUsed: st.hintsUsed, ...outcome },
    });
    gameEvents.emit({ type: "solved" });
  };

  const fail = () => {
    active = null;
    set({ status: "failed", activeHint: null });
    useSaveStore.getState().setCurrent(null);
    gameEvents.emit({ type: "failed" });
  };

  /** Applies mistake rules + emits events for stroke changes that have not been processed yet. */
  const processStroke = () => {
    const info = active;
    const st = get();
    if (!info || !st.puzzle) return;
    const { puzzle } = st;
    let hearts = st.hearts;
    let mistakes = st.mistakes;
    let failed = false;
    for (; info.processed < info.stroke.changes.length; info.processed++) {
      const c = info.stroke.changes[info.processed];
      if (st.mode === "challenge" && isMistake(puzzle.solution, c.index, c.after)) {
        // Wrong moves are corrected on the board: a wrong fill becomes a cross, a wrong cross becomes a fill.
        const fixed: CellState = c.after === FILLED ? CROSSED : FILLED;
        st.board.cells[c.index] = fixed;
        c.after = fixed;
        gameEvents.emit({ type: "mistake", index: c.index });
        if (!info.charged) {
          info.charged = true;
          hearts -= 1;
          mistakes += 1;
          if (hearts <= 0) failed = true;
        }
      }
      if (c.before !== c.after) gameEvents.emit({ type: "cell", index: c.index, from: c.before, to: c.after, source: "input" });
      info.rows.add(Math.floor(c.index / st.board.width));
      info.cols.add(c.index % st.board.width);
    }
    // Line completion: detect lines that just became satisfied.
    const rowsDone = st.rowsDone.slice();
    const colsDone = st.colsDone.slice();
    for (const y of info.rows) {
      const sat = isLineSatisfied(lineCells(st.board, "row", y), puzzle.clues.rows[y]);
      if (sat && !rowsDone[y]) gameEvents.emit({ type: "line", axis: "row", index: y, streak: nextCombo() });
      rowsDone[y] = sat;
    }
    for (const x of info.cols) {
      const sat = isLineSatisfied(lineCells(st.board, "col", x), puzzle.clues.cols[x]);
      if (sat && !colsDone[x]) gameEvents.emit({ type: "line", axis: "col", index: x, streak: nextCombo() });
      colsDone[x] = sat;
    }
    set((s) => ({ rowsDone, colsDone, hearts, mistakes, version: s.version + 1 }));
    if (failed) {
      fail();
      return;
    }
    if (isSolved(st.board, puzzle.clues)) complete();
  };

  return {
    puzzle: null,
    source: { kind: "pack", day: "" },
    mode: "relax",
    tool: "fill",
    board: emptyBoard,
    status: "idle",
    hearts: MAX_HEARTS,
    mistakes: 0,
    hintsUsed: 0,
    hintClock: 0,
    elapsed: 0,
    version: 0,
    rowsDone: [],
    colsDone: [],
    hover: null,
    cursor: null,
    activeHint: null,
    checkResult: null,
    result: null,
    paused: false,
    canUndo: false,
    canRedo: false,

    start({ puzzle, mode, source, restore }) {
      active = null;
      history = new History();
      lastStrokeSnapshot = null;
      combo = { count: 0, at: 0 };
      lastPersist = 0;
      const board = createBoard(puzzle.width, puzzle.height);
      let resumed = false;
      if (restore && restore.id === puzzle.def.id) {
        const cells = unpackCells(restore.cells, board.cells.length);
        if (cells) {
          board.cells.set(cells);
          resumed = true;
        }
      }
      const s = lineStatuses(board, puzzle.clues);
      set((st) => ({
        puzzle,
        source,
        mode,
        board,
        status: "playing",
        hearts: resumed && restore ? Math.max(1, restore.hearts) : MAX_HEARTS,
        mistakes: resumed && restore ? restore.mistakes : 0,
        hintsUsed: resumed && restore ? restore.hintsUsed : 0,
        hintClock: resumed && restore ? restore.hintClock : 0,
        elapsed: resumed && restore ? restore.time : 0,
        rowsDone: s.rows,
        colsDone: s.cols,
        version: st.version + 1,
        hover: null,
        cursor: null,
        activeHint: null,
        checkResult: null,
        result: null,
        paused: false,
        canUndo: false,
        canRedo: false,
      }));
      gameEvents.emit({ type: "reset" });
    },

    restart() {
      const { puzzle, mode, source } = get();
      if (puzzle) get().start({ puzzle, mode, source });
    },

    setTool: (tool) => set({ tool }),
    setHover: (hover) => {
      const cur = get().hover;
      if (cur?.x === hover?.x && cur?.y === hover?.y) return;
      set({ hover });
    },
    setPaused: (paused) => set({ paused }),

    strokeStart(cell, tool) {
      const st = get();
      if (!st.puzzle || st.status !== "playing" || st.paused) return false;
      if (active) get().strokeEnd();
      if (st.activeHint) set({ activeHint: null });
      const stroke = new Stroke(st.board, tool ?? st.tool, cell);
      active = { stroke, processed: 0, snapshot: { hearts: st.hearts, mistakes: st.mistakes }, charged: false, rows: new Set(), cols: new Set() };
      processStroke();
      return true;
    },

    strokeMove(cell) {
      if (!active || get().status !== "playing") return;
      active.stroke.move(cell);
      processStroke();
    },

    strokeEnd() {
      const info = active;
      const st = get();
      if (!info || !st.puzzle) return;
      active = null;
      const changes: CellChange[] = info.stroke.changes.filter((c) => c.before !== c.after);
      lastStrokeSnapshot = info.snapshot;
      if (st.status !== "playing") {
        history.record(changes);
        setBoardState();
        return;
      }
      // Auto-cross the empty cells of lines completed by this stroke (part of the same undo step).
      if (useSaveStore.getState().data.settings.autoCross) {
        const lines: [Axis, number][] = [
          ...[...info.rows].map((y): [Axis, number] => ["row", y]),
          ...[...info.cols].map((x): [Axis, number] => ["col", x]),
        ];
        const { solution } = st.puzzle;
        for (const [axis, index] of lines) {
          // Only cross around a line that is really right: a wrong fill that happens to satisfy a
          // clue must never cause a correct cell to be crossed out.
          const line = lineCells(st.board, axis, index);
          const correct = line.every((v, i) => (v === FILLED) === (solution[lineCellIndex(st.board, axis, index, i)] === 1));
          if (!correct) continue;
          for (const i of autoCrossCells(st.board, st.puzzle.clues, axis, index)) {
            if (st.board.cells[i] !== EMPTY) continue;
            st.board.cells[i] = CROSSED;
            changes.push({ index: i, before: EMPTY, after: CROSSED });
            gameEvents.emit({ type: "cell", index: i, from: EMPTY, to: CROSSED, source: "auto" });
          }
        }
      }
      history.record(changes);
      setBoardState();
      persist(true);
    },

    strokeCancel() {
      const info = active;
      const st = get();
      if (!info || st.status !== "playing") return;
      active = null;
      for (let i = info.stroke.changes.length - 1; i >= 0; i--) {
        const c = info.stroke.changes[i];
        st.board.cells[c.index] = c.before;
        if (c.before !== c.after) gameEvents.emit({ type: "cell", index: c.index, from: c.after, to: c.before, source: "undo" });
      }
      set({ hearts: info.snapshot.hearts, mistakes: info.snapshot.mistakes });
      setBoardState();
    },

    undoLastTap() {
      const st = get();
      if (st.status !== "playing" || !history.canUndo) return;
      get().undo();
      if (lastStrokeSnapshot) set({ hearts: lastStrokeSnapshot.hearts, mistakes: lastStrokeSnapshot.mistakes });
    },

    undo() {
      const st = get();
      if (st.status !== "playing" || st.paused) return;
      if (active) get().strokeEnd();
      const changes = history.undo(st.board);
      if (!changes) return;
      for (const c of changes) gameEvents.emit({ type: "cell", index: c.index, from: c.after, to: c.before, source: "undo" });
      set({ activeHint: null });
      setBoardState();
      persist(true);
    },

    redo() {
      const st = get();
      if (st.status !== "playing" || st.paused) return;
      const changes = history.redo(st.board);
      if (!changes) return;
      for (const c of changes) gameEvents.emit({ type: "cell", index: c.index, from: c.before, to: c.after, source: "redo" });
      set({ activeHint: null });
      setBoardState();
      persist(true);
    },

    hintReady: () => get().hintClock >= HINT_INTERVAL_SECONDS,
    saveNow: () => persist(true),

    takeHint() {
      const st = get();
      if (!st.puzzle || st.status !== "playing" || st.paused || st.hintClock < HINT_INTERVAL_SECONDS) return null;
      if (active) get().strokeEnd();
      const hint = findHint(st.puzzle.clues, st.board, st.puzzle.solution);
      if (!hint) return null;
      const changes: CellChange[] = [];
      for (const c of hint.cells) {
        const index = c.y * st.board.width + c.x;
        const before = st.board.cells[index] as CellState;
        if (before === c.state) continue;
        st.board.cells[index] = c.state;
        changes.push({ index, before, after: c.state });
        gameEvents.emit({ type: "cell", index, from: before, to: c.state, source: "hint" });
      }
      history.record(changes);
      set({ activeHint: hint, hintClock: 0, hintsUsed: st.hintsUsed + 1 });
      gameEvents.emit({ type: "hint", hint });
      // A hint can finish a line (or the puzzle): reuse the stroke pipeline for detection.
      const rows = new Set(hint.cells.map((c) => c.y));
      const cols = new Set(hint.cells.map((c) => c.x));
      const rowsDone = get().rowsDone.slice();
      const colsDone = get().colsDone.slice();
      for (const y of rows) {
        const sat = isLineSatisfied(lineCells(st.board, "row", y), st.puzzle.clues.rows[y]);
        if (sat && !rowsDone[y]) gameEvents.emit({ type: "line", axis: "row", index: y, streak: nextCombo() });
        rowsDone[y] = sat;
      }
      for (const x of cols) {
        const sat = isLineSatisfied(lineCells(st.board, "col", x), st.puzzle.clues.cols[x]);
        if (sat && !colsDone[x]) gameEvents.emit({ type: "line", axis: "col", index: x, streak: nextCombo() });
        colsDone[x] = sat;
      }
      set((s) => ({ rowsDone, colsDone, version: s.version + 1, canUndo: history.canUndo, canRedo: history.canRedo }));
      if (isSolved(st.board, st.puzzle.clues)) complete();
      else persist(true);
      return hint;
    },

    clearHint: () => set({ activeHint: null }),

    check() {
      const st = get();
      if (!st.puzzle || st.status !== "playing") return 0;
      const wrong = findMistakes(st.board, st.puzzle.solution);
      set({ checkResult: { wrong: wrong.length, at: performance.now() } });
      gameEvents.emit({ type: "check", wrong });
      return wrong.length;
    },

    tick(dt) {
      const st = get();
      if (st.status !== "playing" || st.paused || dt <= 0) return;
      set({ elapsed: st.elapsed + dt, hintClock: Math.min(HINT_INTERVAL_SECONDS, st.hintClock + dt) });
      persist();
    },

    moveCursor(dx, dy) {
      const st = get();
      if (!st.puzzle) return;
      const c = st.cursor ?? { x: 0, y: 0 };
      const moved = st.cursor ? { x: c.x + dx, y: c.y + dy } : c;
      set({ cursor: { x: Math.min(st.board.width - 1, Math.max(0, moved.x)), y: Math.min(st.board.height - 1, Math.max(0, moved.y)) }, hover: null });
    },

    cursorAct(tool) {
      const st = get();
      const cell = st.cursor;
      if (!cell) return;
      if (get().strokeStart(cell, tool)) get().strokeEnd();
    },
  };
});
