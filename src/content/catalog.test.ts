import { describe, expect, it } from "vitest";
import { analyze } from "@/game";
import { CATALOG, dailyPoolIds, dailyPuzzleId, endlessPuzzle, FREE_PUZZLE_COUNT, getEntry, getParsed, PACKS, packPuzzles, TOTAL_PUZZLES, TUTORIAL_IDS } from "./catalog";

describe("catalog", () => {
  it("ships 6 packs of 20 puzzles plus a 3 puzzle tutorial", () => {
    expect(PACKS).toHaveLength(6);
    for (const p of PACKS) expect(packPuzzles(p), p).toHaveLength(20);
    expect(TOTAL_PUZZLES).toBe(120);
    expect(TUTORIAL_IDS).toHaveLength(3);
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
  });

  it("puts everything after the first 30 puzzles behind the premium flag", () => {
    const shelf = PACKS.flatMap((p) => packPuzzles(p));
    expect(shelf.filter((e) => !e.isPremium)).toHaveLength(FREE_PUZZLE_COUNT);
    expect(shelf.slice(0, FREE_PUZZLE_COUNT).every((e) => !e.isPremium)).toBe(true);
    expect(shelf.slice(FREE_PUZZLE_COUNT).every((e) => e.isPremium)).toBe(true);
    expect(TUTORIAL_IDS.every((id) => !getEntry(id)?.isPremium)).toBe(true);
  });

  it("every shipped puzzle parses, is unique and solvable by line logic", () => {
    for (const e of CATALOG) {
      const p = getParsed(e.id);
      expect(p, e.id).toBeDefined();
      const a = analyze(p!.clues);
      expect(a.unique && a.lineSolvable, `${e.id} unique + guess-free`).toBe(true);
    }
  });

  it("uses a valid daily pool and picks the same puzzle for the same date", () => {
    const pool = dailyPoolIds();
    expect(pool.length).toBeGreaterThanOrEqual(30);
    expect(pool.every((id) => getEntry(id))).toBe(true);
    expect(dailyPuzzleId("2026-09-20")).toBe(dailyPuzzleId("2026-09-20"));
    expect(pool).toContain(dailyPuzzleId("2026-09-21"));
  });

  it("generates deterministic endless puzzles", () => {
    const a = endlessPuzzle(10, 7);
    const b = endlessPuzzle(10, 7);
    expect(a).toBeDefined();
    expect(a).toBe(b);
    expect(analyze(a!.clues).unique).toBe(true);
  });
});
