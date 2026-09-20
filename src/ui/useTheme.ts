"use client";

import { useSyncExternalStore } from "react";
import { useSaveStore } from "@/store/save";

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Dark if the player forces it, or if the system prefers it and the theme follows the system. */
export function useIsDark(): boolean {
  const theme = useSaveStore((s) => s.data.settings.theme);
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  return theme === "dark" || (theme === "auto" && systemDark);
}

/** prefers-reduced-motion, overridable in Settings. */
export function useReducedMotion(): boolean {
  const setting = useSaveStore((s) => s.data.settings.reducedMotion);
  const system = useMedia("(prefers-reduced-motion: reduce)");
  return setting === "on" || (setting === "auto" && system);
}
