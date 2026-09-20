import { findMistakes, isLineSatisfied, lineCells, type Board } from "./board";
import { minLineLength } from "./clues";
import { solveLine } from "./line-solver";
import { CROSSED, EMPTY, FILLED, type Axis, type CellState, type Clues } from "./types";

export type HintKind =
  /** A placed cell contradicts the solution; the hint clears it. */
  | "mistake"
  /** Clue is empty: the whole line is empty. */
  | "empty-line"
  /** All runs are already placed: the rest of the line is empty. */
  | "complete-line"
  /** Runs plus gaps fill the line exactly. */
  | "full-line"
  /** Runs are long relative to the slack, so their middle overlaps. */
  | "overlap"
  /** Forced by combining the clue with cells already placed in this line. */
  | "deduction"
  /** No single-line logic left: a cell straight from the solution. */
  | "reveal";

export interface HintCell {
  x: number;
  y: number;
  /** The state the hint sets (EMPTY clears a mistaken cell). */
  state: CellState;
}

/** Language-neutral hint data; the UI turns it into a sentence via i18n. */
export interface Hint {
  kind: HintKind;
  axis: Axis;
  /** 0-based line index (the UI shows index + 1). */
  index: number;
  cells: HintCell[];
  params: {
    clue: number[];
    /** Line length. */
    n: number;
    /** Minimum length the clue needs (runs + gaps). */
    min: number;
    /** Overlap hints: the run length that overlaps. */
    len?: number;
    /** Overlap hints: how many cells overlap in the middle. */
    count?: number;
    /** True if the clue has exactly one run. */
    single: boolean;
  };
}

const RANK: Record<HintKind, number> = {
  mistake: -1,
  "empty-line": 0,
  "complete-line": 0,
  "full-line": 1,
  overlap: 2,
  deduction: 3,
  reveal: 4,
};

interface OverlapRun {
  len: number;
  from: number;
  /** Exclusive. */
  to: number;
}

/** For each run, the cells it must cover no matter how it slides (ignoring anything already placed). */
export function overlapRuns(clue: readonly number[], n: number): OverlapRun[] {
  const k = clue.length;
  const out: OverlapRun[] = [];
  let leftStart = 0;
  for (let j = 0; j < k; j++) {
    let suffixLen = k - 1 - j;
    for (let t = j; t < k; t++) suffixLen += clue[t];
    const from = n - suffixLen;
    const to = leftStart + clue[j];
    if (to > from) out.push({ len: clue[j], from, to });
    leftStart += clue[j] + 1;
  }
  return out;
}

function cellAt(axis: Axis, index: number, i: number, state: CellState): HintCell {
  return axis === "row" ? { x: i, y: index, state } : { x: index, y: i, state };
}

interface Candidate {
  hint: Hint;
  unknown: number;
}

/**
 * Finds the simplest logically-forced move for the current board, with the data for a one-line
 * explanation. Player marks are treated as facts, so mistakes are reported first (they would
 * make deductions invalid). `solution` is only used for mistakes and the last-resort "reveal".
 * Returns null when the puzzle is complete.
 */
export function findHint(clues: Clues, board: Board, solution?: ArrayLike<number>): Hint | null {
  if (solution) {
    const bad = findMistakes(board, solution);
    if (bad.length > 0) {
      const i = bad[0];
      const x = i % board.width;
      const y = Math.floor(i / board.width);
      const clue = clues.rows[y];
      return {
        kind: "mistake",
        axis: "row",
        index: y,
        cells: [{ x, y, state: EMPTY }],
        params: { clue, n: board.width, min: minLineLength(clue), single: clue.length === 1 },
      };
    }
  }

  const candidates: Candidate[] = [];
  const consider = (axis: Axis, index: number) => {
    const clue = axis === "row" ? clues.rows[index] : clues.cols[index];
    const line = lineCells(board, axis, index);
    const n = line.length;
    const unknown = line.reduce((a, v) => a + (v === EMPTY ? 1 : 0), 0);
    if (unknown === 0) return;
    const solved = solveLine(line, clue);
    if (!solved) return;

    const deduced: HintCell[] = [];
    for (let i = 0; i < n; i++) {
      if (line[i] === EMPTY && solved[i] !== EMPTY) deduced.push(cellAt(axis, index, i, solved[i] as CellState));
    }
    if (deduced.length === 0) return;

    const min = minLineLength(clue);
    const base = { clue: clue.slice(), n, min, single: clue.length === 1 };
    const push = (kind: HintKind, cells: HintCell[], extra: Partial<Hint["params"]> = {}) =>
      candidates.push({ hint: { kind, axis, index, cells, params: { ...base, ...extra } }, unknown });

    if (clue.length === 0) {
      push("empty-line", deduced);
      return;
    }
    if (isLineSatisfied(line, clue)) {
      push("complete-line", deduced);
      return;
    }
    if (min === n) push("full-line", deduced);

    let best: { run: OverlapRun; cells: HintCell[] } | null = null;
    for (const run of overlapRuns(clue, n)) {
      const cells: HintCell[] = [];
      for (let i = run.from; i < run.to; i++) if (line[i] === EMPTY) cells.push(cellAt(axis, index, i, FILLED));
      if (cells.length > 0 && (!best || cells.length > best.cells.length)) best = { run, cells };
    }
    if (best) push("overlap", best.cells, { len: best.run.len, count: best.run.to - best.run.from });

    push("deduction", deduced);
  };

  for (let y = 0; y < board.height; y++) consider("row", y);
  for (let x = 0; x < board.width; x++) consider("col", x);

  if (candidates.length > 0) {
    candidates.sort(
      (a, b) =>
        RANK[a.hint.kind] - RANK[b.hint.kind] ||
        a.unknown - b.unknown ||
        (a.hint.axis === b.hint.axis ? 0 : a.hint.axis === "row" ? -1 : 1) ||
        a.hint.index - b.hint.index,
    );
    return candidates[0].hint;
  }

  // Line logic is stuck (the puzzle needs a guess): reveal one cell from the solution.
  if (solution) {
    for (let i = 0; i < board.cells.length; i++) {
      if (board.cells[i] !== EMPTY) continue;
      const x = i % board.width;
      const y = Math.floor(i / board.width);
      const clue = clues.rows[y];
      return {
        kind: "reveal",
        axis: "row",
        index: y,
        cells: [{ x, y, state: solution[i] === 1 ? FILLED : CROSSED }],
        params: { clue, n: board.width, min: minLineLength(clue), single: clue.length === 1 },
      };
    }
  }
  return null;
}
