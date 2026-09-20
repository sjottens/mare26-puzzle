import type { Board } from "./board";
import type { CellState } from "./types";

export interface CellChange {
  index: number;
  before: CellState;
  after: CellState;
}

/** Undo/redo of strokes. One entry = one drag stroke (or one hint), so undo feels natural. */
export class History {
  private undoStack: CellChange[][] = [];
  private redoStack: CellChange[][] = [];

  constructor(private readonly limit = 2000) {}

  /** Records changes that were ALREADY applied to the board. Clears the redo stack. */
  record(changes: readonly CellChange[]): void {
    const real = changes.filter((c) => c.before !== c.after);
    if (real.length === 0) return;
    this.undoStack.push(real.slice());
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Reverts the last entry on `board`; returns the reverted changes (in their original direction). */
  undo(board: Board): CellChange[] | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    for (let i = entry.length - 1; i >= 0; i--) board.cells[entry[i].index] = entry[i].before;
    this.redoStack.push(entry);
    return entry;
  }

  redo(board: Board): CellChange[] | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    for (const c of entry) board.cells[c.index] = c.after;
    this.undoStack.push(entry);
    return entry;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
