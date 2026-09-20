import type { Axis, CellState, Hint } from "@/game";

/** Things that happen during play. The 3D scene, audio and haptics all listen to this one bus. */
export type GameEvent =
  | { type: "reset" }
  | { type: "cell"; index: number; from: CellState; to: CellState; source: "input" | "undo" | "redo" | "hint" | "auto" }
  | { type: "line"; axis: Axis; index: number; streak: number }
  | { type: "mistake"; index: number }
  | { type: "check"; wrong: number[] }
  | { type: "hint"; hint: Hint }
  | { type: "solved" }
  | { type: "failed" };

type Listener = (e: GameEvent) => void;

const listeners = new Set<Listener>();

export const gameEvents = {
  on(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  emit(e: GameEvent): void {
    for (const fn of [...listeners]) fn(e);
  },
};
