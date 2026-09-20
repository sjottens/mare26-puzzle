import { describe, expect, it } from "vitest";
import { generateClues } from "@/game";
import { computeStripLayout } from "./stripLayout";

const clues = (size: number) => generateClues(Uint8Array.from({ length: size * size }, (_, i) => (i % 3 === 0 ? 1 : 0)), size, size);

describe("clue strip layout", () => {
  it("keeps numbers at 13-18px and reserves room for the tallest clue", () => {
    for (const size of [5, 10, 15, 20]) {
      const l = computeStripLayout(clues(size), 390, 640);
      expect(l.fontPx).toBeGreaterThanOrEqual(13);
      expect(l.fontPx).toBeLessThanOrEqual(18);
      expect(l.top).toBeGreaterThan(l.lineH);
      expect(l.left).toBeGreaterThan(l.fontPx);
    }
  });

  it("gives small boards bigger numbers than big boards", () => {
    expect(computeStripLayout(clues(5), 390, 640).fontPx).toBeGreaterThan(computeStripLayout(clues(20), 390, 640).fontPx - 1);
    expect(computeStripLayout(clues(5), 390, 640).fontPx).toBe(18);
  });
});
