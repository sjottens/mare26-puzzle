"use client";

import { COLLECTIBLES, dailyPuzzleId, endlessId, getEntry, getParsed, PACKS, packPuzzles } from "@/content/catalog";
import { dateKey } from "@/game";
import type { GameMode } from "@/storage";
import { useGame, type SessionSource } from "@/store/game";
import { useSaveStore } from "@/store/save";
import { useStage } from "@/store/stage";
import { useUi } from "@/store/ui";

/** Starts (or resumes) a puzzle and opens the game screen. Returns false if the puzzle does not exist. */
export function startPuzzle(id: string, mode: GameMode, source: SessionSource, screen: "game" | "tutorial" = "game"): boolean {
  const puzzle = getParsed(id);
  if (!puzzle) return false;
  const cur = useSaveStore.getState().data.current;
  const restore = cur && cur.id === id && cur.mode === mode && cur.src === source.kind && screen === "game" ? cur : null;
  useStage.getState().endReveal();
  useGame.getState().start({ puzzle, mode, source, restore });
  useUi.getState().go(screen);
  return true;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function startDaily(mode: GameMode): boolean {
  const day = todayKey();
  return startPuzzle(dailyPuzzleId(day), mode, { kind: "daily", day });
}

/** Resumes an interrupted Endless game of this size/mode, or begins a fresh one. */
export function startEndless(size: number, mode: GameMode): boolean {
  const save = useSaveStore.getState();
  const cur = save.data.current;
  const m = cur && cur.src === "endless" ? /^endless-(\d+)-\d+$/.exec(cur.id) : null;
  if (cur && m && Number(m[1]) === size && cur.mode === mode) return startPuzzle(cur.id, mode, { kind: "endless", day: "" });
  const seed = save.data.endlessSeed;
  save.update((d) => {
    d.endlessSeed += 1;
  });
  return startPuzzle(endlessId(size, seed), mode, { kind: "endless", day: "" });
}

export function continueCurrent(): boolean {
  const cur = useSaveStore.getState().data.current;
  if (!cur) return false;
  return startPuzzle(cur.id, cur.mode, { kind: cur.src, day: cur.day });
}

/** The next free puzzle after this one in shelf order, or null. */
export function nextPackPuzzleId(id: string): string | null {
  const entry = getEntry(id);
  if (!entry || entry.pack === "tutorial") return null;
  const flat = PACKS.flatMap((p) => packPuzzles(p));
  const next = flat[entry.order + 1];
  return next && !next.isPremium ? next.id : null;
}

export function isSolved(id: string): boolean {
  return useSaveStore.getState().data.puzzles[id]?.[0] === 1;
}

export function solvedCollectibles(): string[] {
  const puzzles = useSaveStore.getState().data.puzzles;
  return COLLECTIBLES.filter((e) => puzzles[e.id]?.[0] === 1).map((e) => e.id);
}
