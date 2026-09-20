import type { Clues } from "@/game";

export interface StripLayout {
  fontPx: number;
  /** Height of the column-clue strip (px). */
  top: number;
  /** Width of the row-clue strip (px). */
  left: number;
  lineH: number;
}

const GAP = 6;
const CHECK = 16;

const numberWidth = (n: number, fontPx: number) => String(n).length * fontPx * 0.6 + 2;

function measure(clues: Clues, fontPx: number): { top: number; left: number; lineH: number } {
  const lineH = Math.round(fontPx * 1.22);
  const colLen = Math.max(1, ...clues.cols.map((c) => Math.max(1, c.length)));
  const rowW = Math.max(
    fontPx,
    ...clues.rows.map((r) => (r.length === 0 ? fontPx : r.reduce((a, n) => a + numberWidth(n, fontPx), 0) + GAP * (r.length - 1))),
  );
  return { top: colLen * lineH + CHECK + 10, left: Math.ceil(rowW) + CHECK + 14, lineH };
}

/**
 * Sizes the sticky clue strips. The font follows the cell size the board will get (bigger boards
 * on small screens get smaller numbers, but never below 13px), so numbers stay crisp and readable.
 */
export function computeStripLayout(clues: Clues, viewW: number, viewH: number, bottomReserve = 8): StripLayout {
  const cols = clues.cols.length;
  const rows = clues.rows.length;
  let fontPx = 16;
  let m = measure(clues, fontPx);
  for (let i = 0; i < 3; i++) {
    const cell = Math.min((viewW - m.left) / cols, ((viewH - m.top - bottomReserve) * 0.92) / rows);
    const next = Math.round(Math.min(18, Math.max(13, cell * 0.66)));
    if (next === fontPx) break;
    fontPx = next;
    m = measure(clues, fontPx);
  }
  return { fontPx, ...m };
}
