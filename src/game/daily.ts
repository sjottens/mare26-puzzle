import { mulberry32, shuffledRange } from "./rng";

const EPOCH = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;

/** Local calendar date as "YYYY-MM-DD" (what the player experiences as "today"). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days since 2026-01-01 for a "YYYY-MM-DD" key (timezone-independent). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS);
}

/** Whole days from key `a` to key `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

/**
 * Index into the curated daily pool for a date. Everyone gets the same puzzle on the same date.
 * The pool is walked in a seeded shuffled order and reshuffled each full cycle, so no puzzle
 * repeats until the whole pool has been used.
 */
export function dailyIndex(key: string, poolSize: number): number {
  if (poolSize <= 0) throw new Error("daily pool is empty");
  const day = dayNumber(key);
  const cycle = Math.floor(day / poolSize);
  const pos = ((day % poolSize) + poolSize) % poolSize;
  const order = shuffledRange(poolSize, mulberry32(0x9e3779b1 ^ (cycle + 1)));
  return order[pos];
}
