/** Player/solver cell states. In the solver, 0 = unknown and 2 = known empty. */
export const EMPTY = 0;
export const FILLED = 1;
export const CROSSED = 2;
export type CellState = 0 | 1 | 2;

export type Axis = "row" | "col";

export interface Point {
  x: number;
  y: number;
}

/**
 * Run-length clues per line. An empty line has the clue `[]` (the UI shows "0").
 * Single-colour only for now; multi-colour would turn `number` into `{ len; color }`.
 */
export interface Clues {
  rows: number[][];
  cols: number[][];
}
