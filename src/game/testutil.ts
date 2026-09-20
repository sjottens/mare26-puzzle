/** Brute-force helpers used only by tests to cross-check the real solver. */
import { lineClue } from "./clues";
import { CROSSED, FILLED, type Clues } from "./types";

/** All 0/1 lines of length n whose clue equals `clue`. */
export function allArrangements(n: number, clue: readonly number[]): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const line = new Uint8Array(n);
    for (let i = 0; i < n; i++) line[i] = (mask >> i) & 1;
    const c = lineClue(line);
    if (c.length === clue.length && c.every((v, i) => v === clue[i])) out.push(line);
  }
  return out;
}

/** Reference implementation of solveLine: intersect every arrangement consistent with `known`. */
export function bruteSolveLine(known: ArrayLike<number>, clue: readonly number[]): Uint8Array | null {
  const n = known.length;
  const fit = allArrangements(n, clue).filter((arr) =>
    Array.from(arr).every((v, i) => known[i] === 0 || (known[i] === FILLED ? v === 1 : v === 0)),
  );
  if (fit.length === 0) return null;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const all1 = fit.every((a) => a[i] === 1);
    const all0 = fit.every((a) => a[i] === 0);
    out[i] = all1 ? FILLED : all0 ? CROSSED : 0;
  }
  return out;
}

/** Number of grids (capped at `cap`) matching the clues, by exhaustive enumeration. Small grids only. */
export function bruteCountSolutions(clues: Clues, width: number, height: number, cap = 2): number {
  const rowOptions = clues.rows.map((c) => allArrangements(width, c));
  let count = 0;
  const cols: number[][] = Array.from({ length: width }, () => []);
  const visit = (y: number): void => {
    if (count >= cap) return;
    if (y === height) {
      let ok = true;
      for (let x = 0; x < width && ok; x++) {
        const c = lineClue(cols[x]);
        ok = c.length === clues.cols[x].length && c.every((v, i) => v === clues.cols[x][i]);
      }
      if (ok) count++;
      return;
    }
    for (const row of rowOptions[y]) {
      for (let x = 0; x < width; x++) cols[x][y] = row[x];
      visit(y + 1);
    }
  };
  visit(0);
  return count;
}
