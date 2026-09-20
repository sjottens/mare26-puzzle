import { cluesEqual, lineClue } from "./clues";
import { CROSSED, EMPTY, FILLED, type Axis, type CellState, type Clues } from "./types";

export interface Board {
  readonly width: number;
  readonly height: number;
  /** Row-major cell states (EMPTY / FILLED / CROSSED). */
  readonly cells: Uint8Array;
}

export function createBoard(width: number, height: number): Board {
  return { width, height, cells: new Uint8Array(width * height) };
}

export function cloneBoard(b: Board): Board {
  return { width: b.width, height: b.height, cells: b.cells.slice() };
}

export const cellIndex = (b: Board, x: number, y: number): number => y * b.width + x;

export function inBounds(b: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < b.width && y < b.height;
}

export function getCell(b: Board, x: number, y: number): CellState {
  return b.cells[y * b.width + x] as CellState;
}

/** Sets a cell; returns true if the state changed. */
export function setCell(b: Board, x: number, y: number, state: CellState): boolean {
  const i = y * b.width + x;
  if (b.cells[i] === state) return false;
  b.cells[i] = state;
  return true;
}

/** Copy of a row (axis "row") or column (axis "col"). */
export function lineCells(b: Board, axis: Axis, index: number): Uint8Array {
  if (axis === "row") return b.cells.slice(index * b.width, (index + 1) * b.width);
  const out = new Uint8Array(b.height);
  for (let y = 0; y < b.height; y++) out[y] = b.cells[y * b.width + index];
  return out;
}

/** Board cell index of the i-th cell of a line. */
export function lineCellIndex(b: Board, axis: Axis, index: number, i: number): number {
  return axis === "row" ? index * b.width + i : i * b.width + index;
}

/** A line is satisfied when its filled runs equal the clue exactly (crossed cells are ignored). */
export function isLineSatisfied(line: ArrayLike<number>, clue: readonly number[]): boolean {
  return cluesEqual(lineClue(line), clue);
}

export interface LineStatus {
  rows: boolean[];
  cols: boolean[];
}

export function lineStatuses(b: Board, clues: Clues): LineStatus {
  return {
    rows: clues.rows.map((c, y) => isLineSatisfied(lineCells(b, "row", y), c)),
    cols: clues.cols.map((c, x) => isLineSatisfied(lineCells(b, "col", x), c)),
  };
}

export function isSolved(b: Board, clues: Clues): boolean {
  const s = lineStatuses(b, clues);
  return s.rows.every(Boolean) && s.cols.every(Boolean);
}

/** A mistake: filling a cell that is empty in the solution, or crossing one that is filled. */
export function isMistake(solution: ArrayLike<number>, index: number, state: number): boolean {
  if (state === FILLED) return solution[index] !== 1;
  if (state === CROSSED) return solution[index] === 1;
  return false;
}

export function findMistakes(b: Board, solution: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.cells.length; i++) if (isMistake(solution, i, b.cells[i])) out.push(i);
  return out;
}

/** Cell indices to cross when auto-cross is on and this line has just been satisfied. */
export function autoCrossCells(b: Board, clues: Clues, axis: Axis, index: number): number[] {
  const clue = axis === "row" ? clues.rows[index] : clues.cols[index];
  const line = lineCells(b, axis, index);
  if (!isLineSatisfied(line, clue)) return [];
  const out: number[] = [];
  for (let i = 0; i < line.length; i++) if (line[i] === EMPTY) out.push(lineCellIndex(b, axis, index, i));
  return out;
}
