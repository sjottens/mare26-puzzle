import { FILLED, type Clues } from "./types";

/** Run lengths of FILLED cells in a line. */
export function lineClue(cells: ArrayLike<number>): number[] {
  const clue: number[] = [];
  let run = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === FILLED) run++;
    else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) clue.push(run);
  return clue;
}

/** Row and column clues for a row-major grid where 1 = filled. */
export function generateClues(cells: ArrayLike<number>, width: number, height: number): Clues {
  const rows: number[][] = [];
  const cols: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row = new Array<number>(width);
    for (let x = 0; x < width; x++) row[x] = cells[y * width + x];
    rows.push(lineClue(row));
  }
  for (let x = 0; x < width; x++) {
    const col = new Array<number>(height);
    for (let y = 0; y < height; y++) col[y] = cells[y * width + x];
    cols.push(lineClue(col));
  }
  return { rows, cols };
}

export function cluesEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Minimum cells a clue needs: the runs plus one gap between each pair. */
export function minLineLength(clue: readonly number[]): number {
  if (clue.length === 0) return 0;
  return clue.reduce((a, b) => a + b, 0) + clue.length - 1;
}
