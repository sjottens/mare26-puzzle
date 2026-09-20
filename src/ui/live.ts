"use client";

import { create } from "zustand";

/** Text announced to screen readers through the polite ARIA live region. */
interface LiveState {
  message: string;
  /** Changes on every announcement so identical messages are announced again. */
  tick: number;
  announce: (m: string) => void;
}

export const useLive = create<LiveState>((set) => ({
  message: "",
  tick: 0,
  announce: (message) => set((s) => ({ message, tick: s.tick + 1 })),
}));
