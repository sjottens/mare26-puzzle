import type { Analysis } from "./solver";

export interface Difficulty {
  /** Continuous score, useful for sorting. */
  score: number;
  /** 1 (relaxed) .. 5 (brain-burner). */
  level: 1 | 2 | 3 | 4 | 5;
}

/**
 * Difficulty from what the solver had to do:
 *  - grid size tier (5 / 10 / 15 / 20),
 *  - propagation passes needed (more passes = longer chains of deductions),
 *  - whether pure line logic gets stuck and guessing is required.
 */
export function rateDifficulty(a: Pick<Analysis, "passes" | "lineSolvable" | "guessDepth">, size: number): Difficulty {
  const sizeTier = size <= 5 ? 0 : size <= 10 ? 1 : size <= 15 ? 2 : 3;
  const passTier = Math.min(3, Math.floor(Math.max(0, a.passes - 1) / 2));
  const guess = a.lineSolvable ? 0 : 1.5 + Math.min(1, a.guessDepth * 0.25);
  const score = 0.6 * sizeTier + 0.8 * passTier + guess;
  const level = Math.max(1, Math.min(5, 1 + Math.round(score))) as Difficulty["level"];
  return { score, level };
}
