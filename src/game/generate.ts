import { generateClues } from "./clues";
import { computeQuality, recognizabilityIssues } from "./quality";
import { hashString, mulberry32 } from "./rng";
import { analyze, propagate, type Analysis } from "./solver";
import type { Clues } from "./types";

export interface GenerateOptions {
  /** Same seed + size = same puzzle. */
  seed: number | string;
  size: 5 | 10 | 15 | 20 | number;
  maxAttempts?: number;
  /** Accept puzzles that need guessing (still proven unique). Default false: line-logic only. */
  allowGuessing?: boolean;
}

export interface GeneratedPuzzle {
  id: string;
  size: number;
  /** 1 = filled. */
  solution: Uint8Array;
  clues: Clues;
  analysis: Analysis;
  attempts: number;
}

/** A left-right symmetric, blobby random picture. */
function randomSymmetricGrid(size: number, rng: () => number): Uint8Array {
  const density = 0.5 + rng() * 0.15;
  const grid = new Uint8Array(size * size);
  const half = Math.ceil(size / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < half; x++) {
      const v = rng() < density ? 1 : 0;
      grid[y * size + x] = v;
      grid[y * size + (size - 1 - x)] = v;
    }
  }
  if (size < 10) return grid;
  // One majority-smoothing pass makes shapes blobby instead of noisy; it preserves symmetry.
  const out = new Uint8Array(grid.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < size && yy < size) n += grid[yy * size + xx];
        }
      }
      out[y * size + x] = n >= 5 ? 1 : 0;
    }
  }
  return out;
}

/**
 * Endless-mode generator: procedural symmetric puzzles whose uniqueness is proven by the solver.
 * Returns null if no acceptable puzzle was found within `maxAttempts`.
 */
export function generatePuzzle(opts: GenerateOptions): GeneratedPuzzle | null {
  const { size, maxAttempts = 500, allowGuessing = false } = opts;
  const seed = typeof opts.seed === "number" ? opts.seed : hashString(opts.seed);
  const rng = mulberry32(seed);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solution = randomSymmetricGrid(size, rng);
    const issues = recognizabilityIssues(computeQuality(solution, size, size), size, size);
    if (issues.length > 0) continue;
    const clues = generateClues(solution, size, size);

    if (!allowGuessing) {
      // Cheap pre-check: pure propagation must finish the puzzle (which also proves uniqueness).
      if (propagate(clues, new Uint8Array(size * size)).status !== "solved") continue;
    }
    const analysis = analyze(clues);
    if (!analysis.unique) continue;
    return { id: `endless-${size}-${seed}`, size, solution, clues, analysis, attempts: attempt };
  }
  return null;
}
