import { inBounds, type Board } from "./board";
import type { CellChange } from "./history";
import { CROSSED, EMPTY, FILLED, type Axis, type CellState, type Point } from "./types";

export type Tool = "fill" | "cross" | "erase";

export function toolTarget(tool: Tool): CellState {
  return tool === "fill" ? FILLED : tool === "cross" ? CROSSED : EMPTY;
}

/** A drag only touches cells currently in state `from` and turns them into `to`. */
export interface StrokeRule {
  from: CellState;
  to: CellState;
}

/**
 * The first cell decides the drag mode: pressing the tool on a cell that already has the
 * tool's mark clears it (the drag erases that mark); otherwise the drag paints the tool's
 * mark onto cells that are in the same state as the first cell.
 */
export function strokeRuleFor(tool: Tool, firstState: CellState): StrokeRule {
  const target = toolTarget(tool);
  if (tool === "erase") return { from: firstState, to: EMPTY };
  if (firstState === target) return { from: target, to: EMPTY };
  return { from: firstState, to: target };
}

/**
 * One pointer drag. Mutates the board as it goes and collects the changes so the caller
 * can record them as a single undo entry. After the first move the drag locks to the
 * row or column of its start cell; cells skipped between pointer events are filled in.
 */
export class Stroke {
  readonly rule: StrokeRule;
  readonly changes: CellChange[] = [];
  private lock: Axis | null = null;
  private last: Point;

  constructor(
    private readonly board: Board,
    tool: Tool,
    private readonly origin: Point,
  ) {
    const first = board.cells[origin.y * board.width + origin.x] as CellState;
    this.rule = strokeRuleFor(tool, first);
    this.last = origin;
    this.paint(origin.x, origin.y);
  }

  get lockedAxis(): Axis | null {
    return this.lock;
  }

  /** Feeds a pointer cell; returns the changes this move caused. */
  move(p: Point): CellChange[] {
    const start = this.changes.length;
    if (!this.lock) {
      const dx = p.x - this.origin.x;
      const dy = p.y - this.origin.y;
      if (dx === 0 && dy === 0) return [];
      this.lock = Math.abs(dx) >= Math.abs(dy) ? "row" : "col";
    }
    const target: Point = this.lock === "row" ? { x: p.x, y: this.origin.y } : { x: this.origin.x, y: p.y };
    const t = {
      x: Math.min(this.board.width - 1, Math.max(0, target.x)),
      y: Math.min(this.board.height - 1, Math.max(0, target.y)),
    };
    const stepX = Math.sign(t.x - this.last.x);
    const stepY = Math.sign(t.y - this.last.y);
    let { x, y } = this.last;
    while (x !== t.x || y !== t.y) {
      x += stepX;
      y += stepY;
      this.paint(x, y);
    }
    this.last = t;
    return this.changes.slice(start);
  }

  private paint(x: number, y: number): void {
    if (!inBounds(this.board, x, y)) return;
    const i = y * this.board.width + x;
    const before = this.board.cells[i] as CellState;
    if (before !== this.rule.from || this.rule.from === this.rule.to) return;
    this.board.cells[i] = this.rule.to;
    this.changes.push({ index: i, before, after: this.rule.to });
  }
}
