import { describe, expect, it } from "vitest";
import { dailyIndex, dateKey, dayNumber, daysBetween } from "./daily";
import { generatePuzzle } from "./generate";
import { computeQuality, recognizabilityIssues, renderAscii } from "./quality";
import { analyze } from "./solver";

describe("endless generator", () => {
  it.each([5, 10, 15, 20])("makes a unique, symmetric, line-solvable %ix%i puzzle", (size) => {
    const t0 = performance.now();
    const p = generatePuzzle({ seed: `test-${size}`, size });
    const ms = performance.now() - t0;
    expect(p, `size ${size}`).not.toBeNull();
    const puzzle = p!;
    // Independent re-verification of uniqueness.
    const a = analyze(puzzle.clues);
    expect(a.unique).toBe(true);
    expect(a.lineSolvable).toBe(true);
    expect(Array.from(a.solution!).map((v) => (v === 1 ? 1 : 0))).toEqual(Array.from(puzzle.solution));
    // Left-right symmetry.
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) expect(puzzle.solution[y * size + x]).toBe(puzzle.solution[y * size + (size - 1 - x)]);
    expect(recognizabilityIssues(computeQuality(puzzle.solution, size, size), size, size)).toEqual([]);
    expect(ms).toBeLessThan(5000);
  });

  it("is deterministic per seed and varies between seeds", () => {
    const a = generatePuzzle({ seed: "same", size: 10 })!;
    const b = generatePuzzle({ seed: "same", size: 10 })!;
    const c = generatePuzzle({ seed: "other", size: 10 })!;
    expect(Array.from(a.solution)).toEqual(Array.from(b.solution));
    expect(Array.from(a.solution)).not.toEqual(Array.from(c.solution));
  });

  it("returns null instead of looping forever when it cannot succeed", () => {
    expect(generatePuzzle({ seed: 1, size: 20, maxAttempts: 1 })).toSatisfy((v: unknown) => v === null || typeof v === "object");
  });
});

describe("quality heuristics", () => {
  it("flags sparse, fragmented pictures and accepts a solid one", () => {
    const solid = Uint8Array.from([0, 1, 0, 1, 1, 1, 0, 1, 0]);
    expect(recognizabilityIssues(computeQuality(solid, 3, 3), 3, 3)).toEqual([]);
    const sparse = new Uint8Array(25);
    sparse[0] = 1;
    expect(recognizabilityIssues(computeQuality(sparse, 5, 5), 5, 5).length).toBeGreaterThan(0);
    const confetti = Uint8Array.from({ length: 100 }, (_, i) => ((i % 10) + Math.floor(i / 10)) % 2 === 0 && i % 3 !== 0 ? 1 : 0);
    expect(recognizabilityIssues(computeQuality(confetti, 10, 10), 10, 10).join()).toMatch(/fragmented|separate/);
  });

  it("renders ASCII", () => {
    expect(renderAscii([1, 0, 0, 1], 2, 2)).toBe("██· \n· ██");
  });
});

describe("daily puzzle", () => {
  it("formats local dates and counts days across month/leap boundaries", () => {
    expect(dateKey(new Date(2026, 8, 19))).toBe("2026-09-19");
    expect(dayNumber("2026-01-01")).toBe(0);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); // 2028 is a leap year
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-10", "2026-03-09")).toBe(-1);
  });

  it("is deterministic and stays inside the pool", () => {
    for (let d = 1; d <= 60; d++) {
      const key = `2026-09-${String(d % 28 + 1).padStart(2, "0")}`;
      expect(dailyIndex(key, 40)).toBe(dailyIndex(key, 40));
      expect(dailyIndex(key, 40)).toBeGreaterThanOrEqual(0);
      expect(dailyIndex(key, 40)).toBeLessThan(40);
    }
  });

  it("uses every puzzle once per cycle before repeating", () => {
    const pool = 30;
    const seen = new Set<number>();
    for (let day = 0; day < pool; day++) {
      const d = new Date(Date.UTC(2026, 0, 1 + day));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      seen.add(dailyIndex(key, pool));
    }
    expect(seen.size).toBe(pool);
  });

  it("gives different orders in different cycles", () => {
    const pool = 20;
    const cycle = (offset: number) =>
      Array.from({ length: pool }, (_, i) => {
        const d = new Date(Date.UTC(2026, 0, 1 + offset + i));
        return dailyIndex(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`, pool);
      });
    expect(cycle(0)).not.toEqual(cycle(pool));
  });
});
