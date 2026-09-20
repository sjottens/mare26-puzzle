export const MAX_HEARTS = 3;
/** A free hint becomes available after this many seconds of play. */
export const HINT_INTERVAL_SECONDS = 90;

/** Time budget for the top star. Bigger and harder puzzles get more time. */
export function threeStarSeconds(size: number, difficultyLevel: number): number {
  return Math.round(2.5 * size * size * (0.8 + 0.2 * difficultyLevel));
}

export interface StarInput {
  size: number;
  difficultyLevel: number;
  seconds: number;
  /** Hearts lost (each mistake stroke costs one). */
  mistakes: number;
}

/**
 * Challenge rating.
 *  3 stars: no mistakes and within the time budget.
 *  2 stars: no mistakes (slow), or at most one mistake within twice the budget.
 *  1 star : solved.
 */
export function rateStars(a: StarInput): 1 | 2 | 3 {
  const budget = threeStarSeconds(a.size, a.difficultyLevel);
  if (a.mistakes === 0 && a.seconds <= budget) return 3;
  if (a.mistakes === 0 || (a.mistakes <= 1 && a.seconds <= budget * 2)) return 2;
  return 1;
}
