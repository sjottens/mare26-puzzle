import { describe, expect, it } from "vitest";
import { buildShareText } from "./share";

describe("share text", () => {
  const base = { name: "Tulp", day: "", mode: "challenge" as const, stars: 2, time: "2:31", heartsLeft: 2, solution: [1, 0, 1, 0, 1, 0, 1, 1, 1], width: 3 };

  it("builds a Wordle-style challenge result", () => {
    expect(buildShareText(base)).toBe(["maré26 · Tulp", "★★☆ · 2:31 · ♥♥♡", "", "🟪⬜🟪", "⬜🟪⬜", "🟪🟪🟪"].join("\n"));
  });

  it("includes the date for daily puzzles and skips stats in Relax", () => {
    const text = buildShareText({ ...base, mode: "relax", day: "2026-09-20" });
    expect(text.split("\n")[0]).toBe("maré26 · Tulp · 2026-09-20");
    expect(text.split("\n")[1]).toBe("Relax");
  });
});
