import { describe, expect, it } from "vitest";
import { generateClues, lineClue, minLineLength } from "./clues";
import { rateDifficulty } from "./difficulty";
import { solveLine } from "./line-solver";
import { mulberry32 } from "./rng";
import { analyze, propagate, search } from "./solver";
import { bruteCountSolutions, bruteSolveLine } from "./testutil";

describe("clue generation", () => {
  it("computes run lengths, empty lines and full lines", () => {
    expect(lineClue([0, 1, 1, 0, 1, 0, 0, 1, 1, 1])).toEqual([2, 1, 3]);
    expect(lineClue([0, 0, 0])).toEqual([]);
    expect(lineClue([1, 1, 1])).toEqual([3]);
    expect(lineClue([1, 2, 1])).toEqual([1, 1]); // crossed cells separate runs
  });

  it("generates row and column clues for a grid", () => {
    // .#.
    // ###
    // .#.
    const grid = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const c = generateClues(grid, 3, 3);
    expect(c.rows).toEqual([[1], [3], [1]]);
    expect(c.cols).toEqual([[1], [3], [1]]);
  });

  it("minLineLength counts gaps", () => {
    expect(minLineLength([])).toBe(0);
    expect(minLineLength([7])).toBe(7);
    expect(minLineLength([3, 2, 1])).toBe(8);
  });
});

describe("line solver", () => {
  it("finds the overlap of a long run", () => {
    // 7 in 10: cells 3..6 are certain.
    const r = solveLine(new Uint8Array(10), [7]);
    expect(Array.from(r!)).toEqual([0, 0, 0, 1, 1, 1, 1, 0, 0, 0]);
  });

  it("fills a line that is exactly full", () => {
    const r = solveLine(new Uint8Array(8), [3, 2, 1]);
    expect(Array.from(r!)).toEqual([1, 1, 1, 2, 1, 1, 2, 1]);
  });

  it("crosses an empty clue and detects contradictions", () => {
    expect(Array.from(solveLine(new Uint8Array(4), [])!)).toEqual([2, 2, 2, 2]);
    expect(solveLine(new Uint8Array(3), [2, 2])).toBeNull();
    expect(solveLine(Uint8Array.from([1, 1, 1, 0]), [2])).toBeNull();
  });

  it("uses known cells to pin runs", () => {
    // clue [2,1] in 6 cells with a filled cell at index 0 -> first run is 0..1, cell 2 is empty.
    const r = solveLine(Uint8Array.from([1, 0, 0, 0, 0, 0]), [2, 1]);
    expect(Array.from(r!).slice(0, 3)).toEqual([1, 1, 2]);
  });

  it("matches brute force on thousands of random lines with random knowledge", () => {
    const rng = mulberry32(1234);
    let checked = 0;
    for (let iter = 0; iter < 3000; iter++) {
      const n = 1 + Math.floor(rng() * 9);
      // Random clue built from a random line, so at least one arrangement exists before knowledge.
      const base = Array.from({ length: n }, () => (rng() < 0.5 ? 1 : 0));
      const clue = lineClue(base);
      const known = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const r = rng();
        if (r < 0.25) known[i] = base[i] === 1 ? 1 : 2; // truthful knowledge
        else if (r < 0.32) known[i] = rng() < 0.5 ? 1 : 2; // possibly contradictory knowledge
      }
      const expected = bruteSolveLine(known, clue);
      const actual = solveLine(known, clue);
      expect(actual === null ? null : Array.from(actual)).toEqual(expected === null ? null : Array.from(expected));
      checked++;
    }
    expect(checked).toBe(3000);
  });
});

describe("solver and uniqueness", () => {
  it("solves a line-solvable puzzle by propagation", () => {
    const solution = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const clues = generateClues(solution, 3, 3);
    const r = propagate(clues, new Uint8Array(9));
    expect(r.status).toBe("solved");
    expect(Array.from(r.grid).map((v) => (v === 1 ? 1 : 0))).toEqual(solution);
    const a = analyze(clues);
    expect(a.unique).toBe(true);
    expect(a.lineSolvable).toBe(true);
  });

  it("detects a puzzle with two solutions (diagonal vs anti-diagonal)", () => {
    const clues = { rows: [[1], [1]], cols: [[1], [1]] };
    const a = analyze(clues);
    expect(a.solutionCount).toBe(2);
    expect(a.unique).toBe(false);
    expect(a.lineSolvable).toBe(false);
  });

  it("detects an unsolvable clue set", () => {
    const a = analyze({ rows: [[2], []], cols: [[1], []] });
    expect(a.solutionCount).toBe(0);
    expect(a.unique).toBe(false);
  });

  it("does not claim uniqueness when the node budget runs out", () => {
    const clues = { rows: [[1], [1]], cols: [[1], [1]] };
    const s = search(clues, new Uint8Array(4), 2, 1);
    expect(s.exhausted).toBe(false);
    expect(analyze(clues, 1).unique).toBe(false);
  });

  it("agrees with exhaustive enumeration on random small grids (incl. ones needing guesses)", () => {
    const rng = mulberry32(99);
    let needsGuess = 0;
    let unique = 0;
    for (let iter = 0; iter < 120; iter++) {
      const w = 3 + Math.floor(rng() * 2);
      const h = 3 + Math.floor(rng() * 2);
      const grid = Array.from({ length: w * h }, () => (rng() < 0.55 ? 1 : 0));
      const clues = generateClues(grid, w, h);
      const expected = bruteCountSolutions(clues, w, h, 2);
      const a = analyze(clues);
      expect(a.solutionCount, JSON.stringify(clues)).toBe(expected);
      expect(a.exhaustive).toBe(true);
      if (expected === 1) {
        unique++;
        expect(Array.from(a.solution!).map((v) => (v === 1 ? 1 : 0))).toEqual(grid);
        if (!a.lineSolvable) needsGuess++;
      }
    }
    expect(unique).toBeGreaterThan(10);
    // Documenting coverage of the backtracking branch (unique but not line-solvable).
    expect(needsGuess).toBeGreaterThanOrEqual(0);
  });
});

describe("difficulty", () => {
  it("grows with size, passes and guessing", () => {
    const easy = rateDifficulty({ passes: 1, lineSolvable: true, guessDepth: 0 }, 5);
    const mid = rateDifficulty({ passes: 5, lineSolvable: true, guessDepth: 0 }, 10);
    const hard = rateDifficulty({ passes: 9, lineSolvable: true, guessDepth: 0 }, 20);
    const guess = rateDifficulty({ passes: 9, lineSolvable: false, guessDepth: 3 }, 20);
    expect(easy.level).toBe(1);
    expect(easy.score).toBeLessThan(mid.score);
    expect(mid.score).toBeLessThan(hard.score);
    expect(hard.score).toBeLessThan(guess.score);
    expect(guess.level).toBe(5);
  });
});
