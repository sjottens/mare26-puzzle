"use client";

import { useCallback } from "react";
import type { Hint } from "@/game";
import { useSaveStore } from "@/store/save";
import { resolveLang, translate, type Lang, type MessageKey, type Params, type TFn } from "./index";

/** Current language: English until the save has been read on the client (no hydration mismatch). */
export function useLang(): Lang {
  const hydrated = useSaveStore((s) => s.hydrated);
  const setting = useSaveStore((s) => s.data.settings.lang);
  if (!hydrated) return "en";
  return resolveLang(setting, typeof navigator === "undefined" ? undefined : navigator.language);
}

export function useT(): { t: TFn; lang: Lang } {
  const lang = useLang();
  const t = useCallback((key: MessageKey, params?: Params) => translate(lang, key, params), [lang]);
  return { t, lang };
}

/** Turns language-neutral hint data from the game engine into a one-line explanation. */
export function hintSentence(t: TFn, h: Hint): string {
  const line = t(h.axis === "row" ? "game.row" : "game.col", { n: h.index + 1 });
  const p = h.params;
  switch (h.kind) {
    case "mistake":
      return t("hint.mistake");
    case "empty-line":
      return t("hint.empty", { line });
    case "complete-line":
      return t("hint.complete", { line });
    case "full-line":
      return t("hint.full", { line, size: p.n });
    case "overlap":
      return p.single
        ? t("hint.overlapSingle", { line, len: p.len ?? 0, size: p.n, count: p.count ?? 0 })
        : t("hint.overlapMulti", { line, len: p.len ?? 0, size: p.n, count: p.count ?? 0, min: p.min });
    case "deduction":
      return t("hint.deduction", { line });
    case "reveal":
      return t("hint.reveal");
  }
}
