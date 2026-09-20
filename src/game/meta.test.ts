import { describe, expect, it } from "vitest";
import { dioramaHeights } from "./heights";
import { rateStars, threeStarSeconds } from "./scoring";
import { activeStreak, recordDailySolve, type StreakState } from "./streak";

const fresh: StreakState = { last: "", streak: 0, best: 0, grace: 1 };

describe("stars", () => {
  it("gives budgets that grow with size and difficulty", () => {
    expect(threeStarSeconds(5, 1)).toBe(63);
    expect(threeStarSeconds(10, 2)).toBe(300);
    expect(threeStarSeconds(20, 4)).toBeGreaterThan(threeStarSeconds(10, 4));
  });

  it("rates by mistakes and time", () => {
    const base = { size: 10, difficultyLevel: 2 };
    const T = threeStarSeconds(10, 2);
    expect(rateStars({ ...base, seconds: T, mistakes: 0 })).toBe(3);
    expect(rateStars({ ...base, seconds: T + 1, mistakes: 0 })).toBe(2);
    expect(rateStars({ ...base, seconds: 9999, mistakes: 0 })).toBe(2);
    expect(rateStars({ ...base, seconds: 10, mistakes: 1 })).toBe(2);
    expect(rateStars({ ...base, seconds: T * 2 + 1, mistakes: 1 })).toBe(1);
    expect(rateStars({ ...base, seconds: 10, mistakes: 2 })).toBe(1);
  });
});

describe("daily streak with one grace day", () => {
  it("starts and extends on consecutive days", () => {
    let s = recordDailySolve(fresh, "2026-09-01");
    expect(s).toMatchObject({ streak: 1, best: 1, last: "2026-09-01" });
    s = recordDailySolve(s, "2026-09-02");
    s = recordDailySolve(s, "2026-09-03");
    expect(s.streak).toBe(3);
  });

  it("ignores a second solve on the same day", () => {
    const s = recordDailySolve(fresh, "2026-09-01");
    expect(recordDailySolve(s, "2026-09-01")).toBe(s);
  });

  it("forgives exactly one missed day, once", () => {
    let s = recordDailySolve(fresh, "2026-09-01");
    s = recordDailySolve(s, "2026-09-02");
    s = recordDailySolve(s, "2026-09-04"); // missed the 3rd: grace used
    expect(s).toMatchObject({ streak: 3, grace: 0 });
    s = recordDailySolve(s, "2026-09-06"); // missed again with no grace: streak resets
    expect(s).toMatchObject({ streak: 1, grace: 1 });
    expect(s.best).toBe(3);
  });

  it("breaks after two or more missed days", () => {
    let s = recordDailySolve(fresh, "2026-09-01");
    s = recordDailySolve(s, "2026-09-02");
    s = recordDailySolve(s, "2026-09-05");
    expect(s.streak).toBe(1);
  });

  it("earns a grace day back every 7 days of streak", () => {
    let s: StreakState = { last: "2026-09-01", streak: 6, best: 6, grace: 0 };
    s = recordDailySolve(s, "2026-09-02");
    expect(s).toMatchObject({ streak: 7, grace: 1 });
  });

  it("crosses month and year boundaries", () => {
    let s = recordDailySolve(fresh, "2026-12-31");
    s = recordDailySolve(s, "2027-01-01");
    expect(s.streak).toBe(2);
  });

  it("shows the streak as alive until it can no longer be continued", () => {
    const s: StreakState = { last: "2026-09-10", streak: 5, best: 5, grace: 1 };
    expect(activeStreak(s, "2026-09-10")).toBe(5);
    expect(activeStreak(s, "2026-09-11")).toBe(5);
    expect(activeStreak(s, "2026-09-12")).toBe(5); // grace covers one missed day
    expect(activeStreak(s, "2026-09-13")).toBe(0);
    expect(activeStreak({ ...s, grace: 0 }, "2026-09-12")).toBe(0);
    expect(activeStreak(fresh, "2026-09-12")).toBe(0);
  });
});

describe("diorama heights", () => {
  it("makes the middle of a shape taller than its edge and leaves empties at 0", () => {
    const size = 7;
    const solution = new Uint8Array(size * size).fill(1);
    solution[0] = 0;
    const h = dioramaHeights(solution, size, size);
    expect(h[0]).toBe(0);
    expect(h[1]).toBe(1); // next to an empty cell
    expect(h[3 * size + 3]).toBeGreaterThan(h[size + 1]);
    expect(Math.max(...h)).toBeLessThanOrEqual(4);
  });

  it("treats the border as empty and keeps thin lines at height 1", () => {
    const h = dioramaHeights([0, 1, 0, 0, 1, 0, 0, 1, 0], 3, 3);
    expect([...h]).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
  });
});
