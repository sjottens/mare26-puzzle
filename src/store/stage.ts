"use client";

import { create } from "zustand";

/** Scene-level flags shared by the DOM screens and the 3D canvas. */
interface StageState {
  /** The reveal sequence (extrusion, swoop, confetti) has been triggered. */
  revealing: boolean;
  /** Timestamp (performance.now) the reveal started. */
  revealAt: number;
  /** The reveal animation has finished and the panel may show. */
  revealDone: boolean;
  /** The 3D canvas has painted its first frame (hides the 2D skeleton). */
  sceneReady: boolean;
  /** Set by the app from settings + system preference. */
  reducedMotion: boolean;
  startReveal: () => void;
  endReveal: () => void;
  setDone: (d: boolean) => void;
  setReady: (r: boolean) => void;
  setReducedMotion: (r: boolean) => void;
}

export const useStage = create<StageState>((set) => ({
  revealing: false,
  revealAt: 0,
  revealDone: false,
  sceneReady: false,
  reducedMotion: false,
  startReveal: () => set({ revealing: true, revealAt: performance.now(), revealDone: false }),
  endReveal: () => set({ revealing: false, revealDone: false }),
  setDone: (revealDone) => set({ revealDone }),
  setReady: (sceneReady) => set({ sceneReady }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
