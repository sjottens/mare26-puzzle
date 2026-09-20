import { describe, expect, it } from "vitest";
import { createBoard, isSolved, setCell } from "./board";
import { generateClues } from "./clues";
import { generatePuzzle } from "./generate";
import { findHint, overlapRuns, type Hint, type HintKind } from "./hints";
import { CROSSED, FILLED } from "./types";

describe("overlapRuns", () => {
  it("matches the spec example: a run of 7 in 10 cells fills the middle 4", () => {
    expect(overlapRuns([7], 10)).toEqual([{ len: 7, from: 3, to: 7 }]);
  });

  it("handles multiple runs and clues with no overlap", () => {
    expect(overlapRuns([3, 2, 1], 8)).toEqual([
      { len: 3, from: 0, to: 3 },
      { len: 2, from: 4, to: 6 },
      { len: 1, from: 7, to: 8 },
    ]);
    expect(overlapRuns([1, 1], 10)).toEqual([]);
  });
});

describe("findHint", () => {
  it("only ever suggests cells that match the solution on a fresh board", () => {
    const size = 10;
    const solution = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) solution[y * size + x] = (x + y) % 2 === 0 || (y < 3 && x < 8 && x > 0) ? 1 : 0;
    const clues = generateClues(solution, size, size);
    const hint = findHint(clues, createBoard(size, size), solution) as Hint;
    expect(hint).not.toBeNull();
    for (const c of hint.cells) expect(solution[c.y * size + c.x]).toBe(c.state === FILLED ? 1 : 0);
  });

  it("clears a mistaken cell first", () => {
    const solution = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const clues = generateClues(solution, 3, 3);
    const b = createBoard(3, 3);
    setCell(b, 0, 0, FILLED); // wrong
    const hint = findHint(clues, b, solution)!;
    expect(hint.kind).toBe("mistake");
    expect(hint.cells).toEqual([{ x: 0, y: 0, state: 0 }]);
  });

  it("completes a satisfied line by crossing the rest", () => {
    const solution = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const clues = generateClues(solution, 3, 3);
    const b = createBoard(3, 3);
    setCell(b, 1, 0, FILLED); // row 0 [1] done, col 1 has [3]
    const hint = findHint(clues, b, solution)!;
    expect(hint.kind).toBe("complete-line");
    expect(hint.cells.every((c) => c.state === CROSSED)).toBe(true);
  });

  it("falls back to a solution reveal when line logic is stuck", () => {
    const solution = [1, 0, 0, 1];
    const clues = generateClues(solution, 2, 2);
    const hint = findHint(clues, createBoard(2, 2), solution)!;
    expect(hint.kind).toBe("reveal");
    expect(hint.cells).toEqual([{ x: 0, y: 0, state: FILLED }]);
    expect(findHint(clues, createBoard(2, 2))).toBeNull(); // no solution supplied -> nothing to reveal
  });

  it("returns null when the puzzle is complete", () => {
    const solution = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const clues = generateClues(solution, 3, 3);
    const b = createBoard(3, 3);
    for (let i = 0; i < 9; i++) b.cells[i] = solution[i] ? FILLED : CROSSED;
    expect(findHint(clues, b, solution)).toBeNull();
  });

  it("solving a puzzle purely by following hints never gives a wrong cell", () => {
    const kinds = new Set<HintKind>();
    for (const [seed, size] of [["h1", 5], ["h2", 10], ["h3", 10], ["h4", 15]] as const) {
      const puzzle = generatePuzzle({ seed, size })!;
      expect(puzzle, `${seed}`).not.toBeNull();
      const b = createBoard(size, size);
      let guard = size * size * 4;
      while (!isSolved(b, puzzle.clues) && guard-- > 0) {
        const hint = findHint(puzzle.clues, b, puzzle.solution);
        if (!hint) break;
        kinds.add(hint.kind);
        expect(hint.kind, "line-solvable puzzles never need a reveal or mistake fix").not.toMatch(/reveal|mistake/);
        for (const c of hint.cells) {
          const want = puzzle.solution[c.y * size + c.x] === 1 ? FILLED : CROSSED;
          expect(c.state).toBe(want);
          setCell(b, c.x, c.y, c.state);
        }
      }
      expect(isSolved(b, puzzle.clues), `${seed} solved via hints`).toBe(true);
    }
    expect(kinds.has("overlap") || kinds.has("full-line")).toBe(true);
    expect(kinds.has("deduction")).toBe(true);
  });
});
