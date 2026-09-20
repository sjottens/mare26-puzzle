"use client";

import { create } from "zustand";
import type { ShelfPackId } from "@/content/catalog";
import type { MessageKey } from "@/i18n";

export type Screen = "title" | "packs" | "game" | "museum" | "stats" | "settings" | "howto" | "tutorial";

export interface Toast {
  id: number;
  key: MessageKey;
  params?: Record<string, string | number>;
  tone: "info" | "good" | "bad";
}

/** What the "start puzzle" sheet is showing. */
export interface StartTarget {
  id: string;
  kind: "pack" | "daily" | "endless";
  day?: string;
}

interface UiState {
  screen: Screen;
  pack: ShelfPackId | "endless";
  /** Museum: the diorama being viewed. */
  viewing: string | null;
  sheet: StartTarget | null;
  toast: Toast | null;
  go: (screen: Screen, opts?: { pack?: ShelfPackId; replace?: boolean }) => void;
  back: () => void;
  setPack: (p: ShelfPackId | "endless") => void;
  openSheet: (t: StartTarget | null) => void;
  view: (id: string | null) => void;
  showToast: (key: MessageKey, tone?: Toast["tone"], params?: Toast["params"]) => void;
  clearToast: () => void;
}

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUi = create<UiState>((set, get) => ({
  screen: "title",
  pack: "dutch-icons",
  viewing: null,
  sheet: null,
  toast: null,

  go(screen, opts) {
    const cur = get().screen;
    if (screen === cur && !opts?.pack) return;
    set({ screen, sheet: null, viewing: null, ...(opts?.pack ? { pack: opts.pack } : {}) });
    if (typeof window !== "undefined") {
      const state = { screen };
      // Each screen gets its own hash URL: browsers collapse pushState calls that reuse the same URL,
      // which would make "back" skip screens.
      const url = `#${screen}`;
      if (opts?.replace) window.history.replaceState(state, "", url);
      else window.history.pushState(state, "", url);
    }
  },

  back() {
    if (typeof window !== "undefined" && window.history.state?.screen) window.history.back();
    else set({ screen: "title", sheet: null, viewing: null });
  },

  setPack: (pack) => set({ pack }),
  openSheet: (sheet) => set({ sheet }),
  view: (viewing) => set({ viewing }),

  showToast(key, tone = "info", params) {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: ++toastId, key, params, tone } });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  clearToast: () => set({ toast: null }),
}));

/** Browser/Android back button support: history entries carry the screen name. */
export function installHistorySync(): () => void {
  window.history.replaceState({ screen: "title" }, "", `${window.location.pathname}${window.location.search}`);
  const onPop = (e: PopStateEvent) => {
    const screen = (e.state?.screen as Screen | undefined) ?? "title";
    useUi.setState({ screen, sheet: null, viewing: null });
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
