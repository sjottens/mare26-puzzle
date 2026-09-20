import { CROSSED, FILLED } from "./types";

/**
 * Exact single-line solver. `line` holds 0 = unknown, 1 = filled, 2 = known empty.
 * Returns a new line where every cell that has the same value in ALL arrangements
 * consistent with the clue and the known cells is fixed, or `null` if no arrangement fits.
 *
 * Uses prefix/suffix reachability tables, so it is O(n * k) per table plus O(k * n * run).
 */
export function solveLine(line: ArrayLike<number>, clue: readonly number[]): Uint8Array | null {
  const n = line.length;
  const k = clue.length;

  const filledPre = new Int32Array(n + 1);
  const emptyPre = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) {
    filledPre[i + 1] = filledPre[i] + (line[i] === FILLED ? 1 : 0);
    emptyPre[i + 1] = emptyPre[i] + (line[i] === CROSSED ? 1 : 0);
  }
  const noFilled = (s: number, e: number) => filledPre[e] - filledPre[s] === 0;
  const noEmpty = (s: number, e: number) => emptyPre[e] - emptyPre[s] === 0;

  const W = k + 1;
  // suf[i*W + j]: cells [i, n) can host runs j..k-1 (starting fresh at i).
  const suf = new Uint8Array((n + 1) * W);
  for (let i = n; i >= 0; i--) {
    for (let j = k; j >= 0; j--) {
      let v = false;
      if (j === k) v = noFilled(i, n);
      else if (i < n) {
        if (line[i] !== FILLED) v = suf[(i + 1) * W + j] === 1;
        if (!v) {
          const e = i + clue[j];
          if (e <= n && noEmpty(i, e) && (e === n || line[e] !== FILLED)) {
            v = suf[(e === n ? n : e + 1) * W + j + 1] === 1;
          }
        }
      }
      suf[i * W + j] = v ? 1 : 0;
    }
  }

  // pre[i*W + j]: cells [0, i) can host exactly runs 0..j-1.
  const pre = new Uint8Array((n + 1) * W);
  pre[0] = 1;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= k; j++) {
      let v = false;
      if (line[i - 1] !== FILLED) v = pre[(i - 1) * W + j] === 1;
      if (!v && j > 0) {
        const s = i - clue[j - 1];
        if (s >= 0 && noEmpty(s, i) && (s === 0 || line[s - 1] !== FILLED)) {
          v = pre[(s === 0 ? 0 : s - 1) * W + j - 1] === 1;
        }
      }
      pre[i * W + j] = v ? 1 : 0;
    }
  }

  const canFill = new Uint8Array(n);
  const canEmpty = new Uint8Array(n);

  for (let c = 0; c < n; c++) {
    if (line[c] === FILLED) continue;
    for (let j = 0; j <= k; j++) {
      if (pre[c * W + j] === 1 && suf[(c + 1) * W + j] === 1) {
        canEmpty[c] = 1;
        break;
      }
    }
  }

  for (let j = 0; j < k; j++) {
    const len = clue[j];
    for (let s = 0; s + len <= n; s++) {
      const e = s + len;
      if (!noEmpty(s, e)) continue;
      if (s > 0 && line[s - 1] === FILLED) continue;
      if (e < n && line[e] === FILLED) continue;
      if (pre[(s === 0 ? 0 : s - 1) * W + j] !== 1) continue;
      if (suf[(e === n ? n : e + 1) * W + j + 1] !== 1) continue;
      for (let c = s; c < e; c++) canFill[c] = 1;
    }
  }

  const out = new Uint8Array(n);
  for (let c = 0; c < n; c++) {
    if (canFill[c] && canEmpty[c]) out[c] = 0;
    else if (canFill[c]) out[c] = FILLED;
    else if (canEmpty[c]) out[c] = CROSSED;
    else return null;
  }
  return out;
}
