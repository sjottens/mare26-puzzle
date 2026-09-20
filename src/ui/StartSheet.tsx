"use client";

import { getDifficulty, getEntry, getParsed } from "@/content/catalog";
import { useT } from "@/i18n/useT";
import type { GameMode } from "@/storage";
import { useSaveStore } from "@/store/save";
import { useUi, type StartTarget } from "@/store/ui";
import { startDaily, startEndless, startPuzzle } from "./flow";
import { Icon } from "./Icon";
import { formatTime, Sheet, Stars } from "./kit";

/** Chooses Relax or Challenge for a puzzle (also handles Daily and Endless starts). */
export function StartSheet({ target }: { target: StartTarget }) {
  const { t, lang } = useT();
  const close = useUi((s) => s.openSheet);
  const rec = useSaveStore((s) => s.data.puzzles[target.id]);
  const current = useSaveStore((s) => s.data.current);

  const endlessSize = target.kind === "endless" ? Number(target.id.split("-")[1]) : 0;
  const entry = getEntry(target.id);
  const parsed = target.kind === "endless" ? null : getParsed(target.id);
  const premiumLocked = target.kind === "pack" && !!entry?.isPremium;
  const title = target.kind === "endless" ? t("endless.title") : (parsed?.def.name[lang] ?? "");
  const size = target.kind === "endless" ? endlessSize : (parsed?.width ?? 0);
  const level = target.kind === "endless" ? 0 : getDifficulty(target.id).level;
  const resumeMode: GameMode | null = current && current.id === target.id ? current.mode : null;

  const begin = (mode: GameMode) => {
    close(null);
    if (target.kind === "endless") startEndless(endlessSize, mode);
    else if (target.kind === "daily") startDaily(mode);
    else startPuzzle(target.id, mode, { kind: "pack", day: "" });
  };

  return (
    <Sheet title={title} onClose={() => close(null)}>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-ink-soft">
        <span>{t("puzzle.size", { n: size })}</span>
        {level > 0 && <span>{t("puzzle.difficulty", { n: level })}</span>}
        {rec?.[0] === 1 && <span className="text-ok">{t("puzzle.solved")}</span>}
        {rec && rec[1] > 0 && <span>{t("puzzle.best", { t: formatTime(rec[1]) })}</span>}
        {rec && rec[2] > 0 && <Stars count={rec[2]} size={16} />}
      </div>
      {target.kind === "endless" && <p className="mb-3 text-ink-soft">{t("endless.desc")}</p>}
      {target.kind === "daily" && <p className="mb-3 text-ink-soft">{t("daily.today")}</p>}
      {premiumLocked ? (
        <p className="card flex items-start gap-2 p-3 font-semibold">
          <Icon name="lock" /> {t("puzzle.lockedNote")}
        </p>
      ) : (
        <div className="grid gap-2">
          {resumeMode && (
            <button className="btn btn-primary" onClick={() => begin(resumeMode)}>
              <Icon name="play" /> {t("menu.continue")} · {resumeMode === "challenge" ? t("mode.challenge") : t("mode.relax")}
            </button>
          )}
          <button className={`btn ${resumeMode ? "btn-soft" : "btn-primary"} flex-col items-start gap-0.5 py-2 text-left`} onClick={() => begin("relax")} data-testid="start-relax">
            <span>{t("mode.relax")}</span>
            <span className="text-sm font-semibold opacity-80">{t("mode.relaxDesc")}</span>
          </button>
          <button className="btn btn-soft flex-col items-start gap-0.5 py-2 text-left" onClick={() => begin("challenge")} data-testid="start-challenge">
            <span>{t("mode.challenge")}</span>
            <span className="text-sm font-semibold opacity-80">{t("mode.challengeDesc")}</span>
          </button>
        </div>
      )}
    </Sheet>
  );
}
