"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/useT";
import { useGame } from "@/store/game";
import { useUi } from "@/store/ui";
import { Icon } from "./Icon";
import { formatTime, Stars } from "./kit";
import { shareResult } from "./share";
import { startEndless, startPuzzle, nextPackPuzzleId } from "./flow";

interface Props {
  /** Replaces the default action buttons (tutorial flow). */
  actions?: ReactNode;
  /** Runs the "slide onto the shelf" hand-off, then the callback. */
  onLeave: (then: () => void) => void;
}

/** Shown once the diorama has popped up: result, share and where to go next. */
export function RevealPanel({ actions, onLeave }: Props) {
  const { t, lang } = useT();
  const puzzle = useGame((s) => s.puzzle);
  const result = useGame((s) => s.result);
  const mode = useGame((s) => s.mode);
  const source = useGame((s) => s.source);
  const hearts = useGame((s) => s.hearts);
  const [shareNote, setShareNote] = useState("");
  const go = useUi((s) => s.go);
  if (!puzzle || !result) return null;

  const name = puzzle.def.name[lang];
  const nextId = source.kind === "pack" ? nextPackPuzzleId(puzzle.def.id) : null;
  const canNext = source.kind === "endless" || nextId !== null;

  const share = async () => {
    const outcome = await shareResult(
      {
        name,
        day: source.kind === "daily" ? source.day : "",
        mode,
        stars: result.stars,
        time: formatTime(result.time),
        heartsLeft: hearts,
        solution: puzzle.solution,
        width: puzzle.width,
      },
      `maré26 · ${name}`,
      mode === "challenge" ? `${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)} · ${formatTime(result.time)}` : "Relax",
    );
    setShareNote(outcome === "shared" ? t("reveal.shared") : outcome === "copied" || outcome === "downloaded" ? t("reveal.copiedText") : "");
  };

  const next = () =>
    onLeave(() => {
      if (source.kind === "endless") startEndless(puzzle.width, mode);
      else if (nextId) startPuzzle(nextId, mode, { kind: "pack", day: "" });
    });

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <section className="card pop-in pointer-events-auto w-full max-w-md p-4 text-center" aria-live="polite" data-testid="reveal-panel">
        <h2 className="text-2xl font-extrabold">{t("reveal.title")}</h2>
        <p className="text-ink-soft">
          {name} · {t("reveal.subtitle")}
        </p>
        {mode === "challenge" && (
          <div className="my-2 flex items-center justify-center gap-4">
            <Stars count={result.stars} size={30} />
            <span className="text-lg font-extrabold tabular-nums">
              {t("reveal.time")} {formatTime(result.time)}
            </span>
          </div>
        )}
        {result.isNewBest && <p className="font-bold text-ok">{t("reveal.newBest")}</p>}
        {shareNote && <p className="text-sm text-ink-soft">{shareNote}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {actions ?? (
            <>
              {canNext && (
                <button className="btn btn-primary col-span-2" onClick={next}>
                  <Icon name="next" /> {t("reveal.next")}
                </button>
              )}
              <button className="btn btn-soft" onClick={share}>
                <Icon name="share" /> {t("reveal.share")}
              </button>
              <button className="btn btn-soft" onClick={() => onLeave(() => go("museum", { replace: true }))}>
                <Icon name="museum" /> {t("reveal.museum")}
              </button>
              <button className="btn btn-soft col-span-2" onClick={() => onLeave(() => go(source.kind === "pack" ? "packs" : "title", { replace: true }))}>
                {t("reveal.menu")}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
