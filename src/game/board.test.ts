import { describe, expect, it } from "vitest";
import { autoCrossCells, cloneBoard, createBoard, findMistakes, getCell, isSolved, lineStatuses, setCell } from "./board";
import { generateClues } from "./clues";
import { History } from "./history";
import { Stroke, strokeRuleFor } from "./paint";
import { parsePuzzle, PuzzleFormatError, type PuzzleDef } from "./puzzle";
import { CROSSED, EMPTY, FILLED } from "./types";

// .#.
// ###
// .#.
const PLUS = [0, 1, 0, 1, 1, 1, 0, 1, 0];
const plusClues = generateClues(PLUS, 3, 3);

describe("board", () => {
  it("tracks line satisfaction and completion", () => {
    const b = createBoard(3, 3);
    for (let x = 0; x < 3; x++) setCell(b, x, 1, FILLED);
    let s = lineStatuses(b, plusClues);
    expect(s.rows).toEqual([false, true, false]);
    expect(s.cols).toEqual([true, false, true]); // the middle row also satisfies the outer [1] columns
    setCell(b, 1, 0, FILLED);
    setCell(b, 1, 2, FILLED);
    s = lineStatuses(b, plusClues);
    expect(s.cols).toEqual([true, true, true]);
    expect(isSolved(b, plusClues)).toBe(true); // the board is now exactly the plus
    setCell(b, 0, 0, FILLED);
    expect(isSolved(b, plusClues)).toBe(false);
  });

  it("ignores crossed cells when checking lines", () => {
    const b = createBoard(3, 3);
    for (let i = 0; i < 9; i++) if (PLUS[i]) b.cells[i] = FILLED;
    setCell(b, 0, 0, CROSSED);
    expect(isSolved(b, plusClues)).toBe(true);
  });

  it("flags mistakes: fill on empty solution cell, cross on filled solution cell", () => {
    const b = createBoard(3, 3);
    setCell(b, 0, 0, FILLED); // wrong
    setCell(b, 1, 1, CROSSED); // wrong
    setCell(b, 1, 0, FILLED); // right
    setCell(b, 0, 2, CROSSED); // right
    expect(findMistakes(b, PLUS)).toEqual([0, 4]);
  });

  it("auto-crosses the empty cells of a satisfied line only", () => {
    const b = createBoard(3, 3);
    setCell(b, 1, 0, FILLED);
    expect(autoCrossCells(b, plusClues, "row", 0)).toEqual([0, 2]);
    expect(autoCrossCells(b, plusClues, "row", 1)).toEqual([]);
    setCell(b, 0, 0, CROSSED);
    expect(autoCrossCells(b, plusClues, "row", 0)).toEqual([2]);
  });
});

describe("history", () => {
  it("undoes and redoes whole strokes and clears redo on new input", () => {
    const b = createBoard(4, 1);
    const h = new History();
    const stroke = new Stroke(b, "fill", { x: 0, y: 0 });
    stroke.move({ x: 3, y: 0 });
    h.record(stroke.changes);
    expect(Array.from(b.cells)).toEqual([1, 1, 1, 1]);

    expect(h.undo(b)).toHaveLength(4);
    expect(Array.from(b.cells)).toEqual([0, 0, 0, 0]);
    expect(h.canRedo).toBe(true);
    h.redo(b);
    expect(Array.from(b.cells)).toEqual([1, 1, 1, 1]);
    h.undo(b);
    const s2 = new Stroke(b, "cross", { x: 1, y: 0 });
    h.record(s2.changes);
    expect(h.canRedo).toBe(false);
    expect(h.redo(b)).toBeNull();
  });

  it("ignores empty strokes and returns null when nothing to undo", () => {
    const h = new History();
    h.record([]);
    expect(h.canUndo).toBe(false);
    expect(h.undo(createBoard(1, 1))).toBeNull();
  });
});

describe("painting", () => {
  it("first cell decides paint vs erase for the drag", () => {
    expect(strokeRuleFor("fill", EMPTY)).toEqual({ from: EMPTY, to: FILLED });
    expect(strokeRuleFor("fill", FILLED)).toEqual({ from: FILLED, to: EMPTY });
    expect(strokeRuleFor("cross", CROSSED)).toEqual({ from: CROSSED, to: EMPTY });
    expect(strokeRuleFor("cross", EMPTY)).toEqual({ from: EMPTY, to: CROSSED });
    expect(strokeRuleFor("erase", FILLED)).toEqual({ from: FILLED, to: EMPTY });
  });

  it("paint drag does not overwrite other marks", () => {
    const b = createBoard(5, 1);
    setCell(b, 2, 0, CROSSED);
    const s = new Stroke(b, "fill", { x: 0, y: 0 });
    s.move({ x: 4, y: 0 });
    expect(Array.from(b.cells)).toEqual([1, 1, 2, 1, 1]);
  });

  it("erase drag only clears cells matching the first cell", () => {
    const b = createBoard(4, 1);
    b.cells.set([1, 1, 2, 1]);
    const s = new Stroke(b, "fill", { x: 0, y: 0 }); // first is filled -> erase filled
    s.move({ x: 3, y: 0 });
    expect(Array.from(b.cells)).toEqual([0, 0, 2, 0]);
  });

  it("locks to the dominant axis on the first move and interpolates skipped cells", () => {
    const b = createBoard(6, 6);
    const s = new Stroke(b, "fill", { x: 1, y: 1 });
    s.move({ x: 4, y: 2 }); // dominant x -> lock to row 1, jump of 3 cells
    expect(s.lockedAxis).toBe("row");
    s.move({ x: 5, y: 5 }); // still row-locked
    const filled: string[] = [];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (getCell(b, x, y) === FILLED) filled.push(`${x},${y}`);
    expect(filled).toEqual(["1,1", "2,1", "3,1", "4,1", "5,1"]);
  });

  it("can drag back over its own path without re-toggling", () => {
    const b = createBoard(5, 1);
    const s = new Stroke(b, "fill", { x: 0, y: 0 });
    s.move({ x: 3, y: 0 });
    s.move({ x: 1, y: 0 });
    expect(Array.from(b.cells)).toEqual([1, 1, 1, 1, 0]);
    expect(s.changes).toHaveLength(4);
  });

  it("clamps to the board", () => {
    const b = createBoard(3, 3);
    const s = new Stroke(b, "fill", { x: 0, y: 0 });
    s.move({ x: 99, y: 0 });
    expect(Array.from(b.cells.slice(0, 3))).toEqual([1, 1, 1]);
    expect(cloneBoard(b).cells).not.toBe(b.cells);
  });
});

describe("puzzle parsing", () => {
  const def: PuzzleDef = {
    id: "t-plus",
    name: { en: "Plus", nl: "Plus" },
    pack: "tutorial",
    size: 3,
    rows: [".#.", "###", ".#."],
    palette: ["#ff8fa3"],
  };

  it("parses rows into a solution and clues", () => {
    const p = parsePuzzle(def);
    expect(Array.from(p.solution)).toEqual(PLUS);
    expect(p.clues.rows).toEqual([[1], [3], [1]]);
  });

  it.each([
    ["wrong row count", { ...def, rows: [".#.", "###"] }],
    ["wrong row length", { ...def, rows: [".#", "###", ".#."] }],
    ["illegal char", { ...def, rows: [".x.", "###", ".#."] }],
    ["bad palette", { ...def, palette: ["pink"] }],
    ["multi colour", { ...def, palette: ["#ff8fa3", "#8fc7ff"] }],
    ["missing dutch name", { ...def, name: { en: "Plus", nl: "" } }],
  ])("rejects %s", (_label, bad) => {
    expect(() => parsePuzzle(bad as PuzzleDef)).toThrow(PuzzleFormatError);
  });
});
