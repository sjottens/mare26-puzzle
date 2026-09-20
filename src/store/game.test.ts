// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getParsed } from "@/content/catalog";
import { CROSSED, FILLED } from "@/game";
import { gameEvents, type GameEvent } from "./events";
import { useGame } from "./game";
import { useSaveStore } from "./save";

const PLUS = "tutorial-1"; // .#. / ### / .#.
const source = { kind: "pack" as const, day: "" };

function begin(mode: "relax" | "challenge", id = PLUS) {
  useGame.getState().start({ puzzle: getParsed(id)!, mode, source });
}
const g = () => useGame.getState();
const cell = (x: number, y: number) => g().board.cells[y * g().board.width + x];
/** One tap on a cell = one stroke. */
function tap(x: number, y: number, tool?: "fill" | "cross" | "erase") {
  g().strokeStart({ x, y }, tool);
  g().strokeEnd();
}

let events: GameEvent[] = [];
let off: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  useSaveStore.setState({ data: { ...useSaveStore.getState().data, puzzles: {}, current: null } });
  events = [];
  off = gameEvents.on((e) => events.push(e));
});
afterEach(() => {
  off();
  vi.useRealTimers();
});

describe("game session: Relax", () => {
  it("fills, crosses and erases, and mistakes are not punished", () => {
    begin("relax");
    tap(0, 0); // wrong on purpose (empty in the solution)
    expect(cell(0, 0)).toBe(FILLED);
    expect(g().hearts).toBe(3);
    expect(g().mistakes).toBe(0);
    tap(0, 0, "erase");
    expect(cell(0, 0)).toBe(0);
    tap(0, 0, "cross");
    expect(cell(0, 0)).toBe(CROSSED);
  });

  it("undo and redo whole strokes", () => {
    begin("relax");
    g().strokeStart({ x: 0, y: 1 });
    g().strokeMove({ x: 2, y: 1 });
    g().strokeEnd();
    expect([cell(0, 1), cell(1, 1), cell(2, 1)]).toEqual([1, 1, 1]);
    g().undo();
    expect([cell(0, 1), cell(1, 1), cell(2, 1)]).toEqual([0, 0, 0]);
    expect(g().canRedo).toBe(true);
    g().redo();
    expect(cell(1, 1)).toBe(FILLED);
  });

  it("announces line completion and auto-crosses the rest of a finished line (one undo step)", () => {
    useSaveStore.setState((s) => ({ data: { ...s.data, settings: { ...s.data.settings, autoCross: true } } }));
    begin("relax");
    tap(1, 0); // row 0 clue [1] and column 1 progress
    expect(events.some((e) => e.type === "line" && e.axis === "row" && e.index === 0)).toBe(true);
    expect(cell(0, 0)).toBe(CROSSED);
    expect(cell(2, 0)).toBe(CROSSED);
    g().undo();
    expect([cell(0, 0), cell(1, 0), cell(2, 0)]).toEqual([0, 0, 0]);
  });

  it("check finds wrong cells", () => {
    begin("relax");
    tap(0, 0);
    tap(1, 1);
    expect(g().check()).toBe(1);
    expect(events.find((e) => e.type === "check")).toMatchObject({ wrong: [0] });
  });

  it("solves the puzzle, records it, and clears the saved game", () => {
    begin("relax");
    for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) tap(x, y);
    expect(g().status).toBe("solved");
    expect(events.some((e) => e.type === "solved")).toBe(true);
    expect(useSaveStore.getState().data.puzzles[PLUS]?.[0]).toBe(1);
    expect(useSaveStore.getState().data.current).toBeNull();
    expect(g().result?.stars).toBe(0); // Relax has no stars
  });
});

describe("game session: Challenge", () => {
  it("a wrong fill is corrected into a cross and costs one heart", () => {
    begin("challenge");
    tap(0, 0);
    expect(cell(0, 0)).toBe(CROSSED);
    expect(g().hearts).toBe(2);
    expect(g().mistakes).toBe(1);
    expect(events.some((e) => e.type === "mistake")).toBe(true);
  });

  it("a wrong cross on a solution cell is corrected into a fill", () => {
    begin("challenge");
    tap(1, 1, "cross");
    expect(cell(1, 1)).toBe(FILLED);
    expect(g().hearts).toBe(2);
  });

  it("charges at most one heart per stroke", () => {
    begin("challenge");
    g().strokeStart({ x: 0, y: 0 });
    g().strokeMove({ x: 2, y: 0 }); // three wrong cells in one drag
    g().strokeEnd();
    expect(g().hearts).toBe(2);
    expect(g().mistakes).toBe(1);
  });

  it("three mistakes end the game", () => {
    begin("challenge");
    tap(0, 0);
    tap(2, 0);
    tap(0, 2);
    expect(g().hearts).toBe(0);
    expect(g().status).toBe("failed");
    expect(events.some((e) => e.type === "failed")).toBe(true);
    tap(2, 2); // no input after failing
    expect(cell(2, 2)).toBe(0);
  });

  it("awards three stars for a fast, clean solve and stores the best time", () => {
    begin("challenge");
    g().tick(10);
    for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) tap(x, y);
    expect(g().status).toBe("solved");
    expect(g().result).toMatchObject({ stars: 3, mistakes: 0, time: 10, isNewBest: true });
    expect(useSaveStore.getState().data.puzzles[PLUS]).toEqual([1, 10, 3]);
  });

  it("gives fewer stars after mistakes", () => {
    begin("challenge");
    tap(0, 0);
    tap(2, 0);
    for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) tap(x, y);
    expect(g().status).toBe("solved");
    expect(g().result?.stars).toBe(1);
  });
});

describe("hints and time", () => {
  it("a free hint becomes available after 90 seconds and explains itself", () => {
    begin("relax", "tutorial-2");
    expect(g().takeHint()).toBeNull();
    expect(g().hintReady()).toBe(false);
    g().tick(90);
    expect(g().hintReady()).toBe(true);
    const hint = g().takeHint();
    expect(hint).not.toBeNull();
    expect(hint!.cells.length).toBeGreaterThan(0);
    expect(g().hintClock).toBe(0);
    expect(g().hintsUsed).toBe(1);
    for (const c of hint!.cells) expect(cell(c.x, c.y)).toBe(c.state);
    g().undo(); // a hint is one undo step
    for (const c of hint!.cells) expect(cell(c.x, c.y)).toBe(0);
  });

  it("time only advances while playing and not paused", () => {
    begin("challenge");
    g().tick(5);
    g().setPaused(true);
    g().tick(50);
    expect(g().elapsed).toBe(5);
    g().setPaused(false);
    g().tick(2);
    expect(g().elapsed).toBe(7);
  });
});

describe("persistence of the current game", () => {
  it("saves the board while playing and restores it on the next start", () => {
    begin("relax");
    tap(1, 1);
    const saved = useSaveStore.getState().data.current;
    expect(saved).toMatchObject({ id: PLUS, mode: "relax", src: "pack" });
    g().start({ puzzle: getParsed(PLUS)!, mode: "relax", source, restore: saved });
    expect(cell(1, 1)).toBe(FILLED);
  });
});
