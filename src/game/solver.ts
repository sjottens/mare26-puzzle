import { solveLine } from "./line-solver";
import { CROSSED, FILLED, type Clues } from "./types";

/** Grid knowledge: 0 = unknown, 1 = filled, 2 = empty (row-major). */
export type Grid = Uint8Array;

export interface PropagateResult {
  status: "solved" | "stuck" | "contradiction";
  grid: Grid;
  /** Number of (row sweep + column sweep) rounds that made progress. */
  passes: number;
  /** Total number of single-line deductions that changed a line. */
  lineDeductions: number;
}

export function dimensions(clues: Clues): { width: number; height: number } {
  return { width: clues.cols.length, height: clues.rows.length };
}

/**
 * Constraint propagation: repeatedly runs the exact line solver over all rows and columns
 * until nothing changes. Mutates `grid` in place.
 */
export function propagate(clues: Clues, grid: Grid): PropagateResult {
  const { width, height } = dimensions(clues);
  let passes = 0;
  let lineDeductions = 0;
  const rowBuf = new Uint8Array(width);
  const colBuf = new Uint8Array(height);

  const result = (status: PropagateResult["status"]): PropagateResult => ({ status, grid, passes, lineDeductions });

  for (;;) {
    let changed = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) rowBuf[x] = grid[y * width + x];
      const solved = solveLine(rowBuf, clues.rows[y]);
      if (!solved) return result("contradiction");
      let lineChanged = false;
      for (let x = 0; x < width; x++) {
        if (solved[x] !== rowBuf[x]) {
          grid[y * width + x] = solved[x];
          lineChanged = true;
        }
      }
      if (lineChanged) {
        changed = true;
        lineDeductions++;
      }
    }

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) colBuf[y] = grid[y * width + x];
      const solved = solveLine(colBuf, clues.cols[x]);
      if (!solved) return result("contradiction");
      let lineChanged = false;
      for (let y = 0; y < height; y++) {
        if (solved[y] !== colBuf[y]) {
          grid[y * width + x] = solved[y];
          lineChanged = true;
        }
      }
      if (lineChanged) {
        changed = true;
        lineDeductions++;
      }
    }

    if (!changed) break;
    passes++;
  }

  return result(grid.includes(0) ? "stuck" : "solved");
}

export interface SearchResult {
  /** Solutions found, capped at `limit`. */
  count: number;
  /** False when the node budget ran out before the search space was exhausted. */
  exhausted: boolean;
  nodes: number;
  /** Deepest branching depth needed. */
  maxDepth: number;
  firstSolution: Grid | null;
}

/**
 * Bounded backtracking on top of propagation. Branches on an unknown cell in the line with the
 * fewest unknowns. Stops after `limit` solutions or `maxNodes` search nodes.
 */
export function search(clues: Clues, start: Grid, limit = 2, maxNodes = 200_000): SearchResult {
  const { width, height } = dimensions(clues);
  const res: SearchResult = { count: 0, exhausted: true, nodes: 0, maxDepth: 0, firstSolution: null };

  const pickBranchCell = (grid: Grid): number => {
    let best = -1;
    let bestUnknown = Infinity;
    for (let y = 0; y < height; y++) {
      let unknown = 0;
      let first = -1;
      for (let x = 0; x < width; x++) {
        if (grid[y * width + x] === 0) {
          unknown++;
          if (first < 0) first = y * width + x;
        }
      }
      if (unknown > 0 && unknown < bestUnknown) {
        bestUnknown = unknown;
        best = first;
      }
    }
    for (let x = 0; x < width; x++) {
      let unknown = 0;
      let first = -1;
      for (let y = 0; y < height; y++) {
        if (grid[y * width + x] === 0) {
          unknown++;
          if (first < 0) first = y * width + x;
        }
      }
      if (unknown > 0 && unknown < bestUnknown) {
        bestUnknown = unknown;
        best = first;
      }
    }
    return best;
  };

  const visit = (grid: Grid, depth: number): void => {
    if (res.count >= limit || !res.exhausted) return;
    if (++res.nodes > maxNodes) {
      res.exhausted = false;
      return;
    }
    const r = propagate(clues, grid);
    if (r.status === "contradiction") return;
    if (r.status === "solved") {
      res.count++;
      res.maxDepth = Math.max(res.maxDepth, depth);
      res.firstSolution ??= grid.slice();
      return;
    }
    const cell = pickBranchCell(grid);
    for (const value of [FILLED, CROSSED]) {
      const branch = grid.slice();
      branch[cell] = value;
      visit(branch, depth + 1);
      if (res.count >= limit || !res.exhausted) return;
    }
  };

  visit(start.slice(), 0);
  return res;
}

export interface Analysis {
  /** 0, 1, or 2 (meaning "two or more"). */
  solutionCount: 0 | 1 | 2;
  /** False if the search hit its node budget, so uniqueness is unproven. */
  exhaustive: boolean;
  /** Exactly one solution, proven. */
  unique: boolean;
  /** Solvable by line logic alone (no guessing). */
  lineSolvable: boolean;
  passes: number;
  lineDeductions: number;
  /** Branching depth needed if line logic alone is not enough (0 otherwise). */
  guessDepth: number;
  nodes: number;
  solution: Grid | null;
}

/** Full uniqueness + difficulty-input analysis of a clue set. */
export function analyze(clues: Clues, maxNodes = 200_000): Analysis {
  const { width, height } = dimensions(clues);
  const grid: Grid = new Uint8Array(width * height);
  const p = propagate(clues, grid);

  if (p.status === "contradiction") {
    return { solutionCount: 0, exhaustive: true, unique: false, lineSolvable: false, passes: p.passes, lineDeductions: p.lineDeductions, guessDepth: 0, nodes: 0, solution: null };
  }
  if (p.status === "solved") {
    return { solutionCount: 1, exhaustive: true, unique: true, lineSolvable: true, passes: p.passes, lineDeductions: p.lineDeductions, guessDepth: 0, nodes: 0, solution: grid.slice() };
  }
  const s = search(clues, grid, 2, maxNodes);
  const count = Math.min(s.count, 2) as 0 | 1 | 2;
  return {
    solutionCount: count,
    exhaustive: s.exhausted,
    unique: count === 1 && s.exhausted,
    lineSolvable: false,
    passes: p.passes,
    lineDeductions: p.lineDeductions,
    guessDepth: s.maxDepth,
    nodes: s.nodes,
    solution: s.firstSolution,
  };
}
