import { daysBetween } from "./daily";

export interface StreakState {
  /** Date key of the last solved daily, "" if none. */
  last: string;
  streak: number;
  best: number;
  /** 1 if a grace day is available. */
  grace: number;
}

/**
 * Daily streak with ONE grace day: missing exactly one day does not break the streak (the grace
 * is used up). A new grace day is earned every time the streak reaches a multiple of 7, and a
 * broken streak starts over with its grace restored.
 */
export function recordDailySolve(s: StreakState, today: string): StreakState {
  if (s.last === today) return s;
  const gap = s.last ? daysBetween(s.last, today) : Infinity;
  let { streak, grace } = s;
  if (gap === 1) {
    streak += 1;
  } else if (gap === 2 && grace >= 1) {
    streak += 1;
    grace = 0;
  } else {
    streak = 1;
    grace = 1;
  }
  if (streak % 7 === 0) grace = 1;
  return { last: today, streak, best: Math.max(s.best, streak), grace };
}

/** The streak to display on `today`: 0 once it can no longer be continued. */
export function activeStreak(s: StreakState, today: string): number {
  if (!s.last || s.streak === 0) return 0;
  const gap = daysBetween(s.last, today);
  if (gap <= 1) return s.streak;
  if (gap === 2 && s.grace >= 1) return s.streak;
  return 0;
}
