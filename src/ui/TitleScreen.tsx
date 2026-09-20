"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { dailyPuzzleId, getParsed } from "@/content/catalog";
import { activeStreak } from "@/game";
import { useT } from "@/i18n/useT";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import { continueCurrent, solvedCollectibles, startPuzzle, todayKey } from "./flow";
import { Icon } from "./Icon";
import { TitleSkeleton } from "./TitleSkeleton";

const DioramaCanvas = dynamic(() => import("@/three/DioramaCanvas"), { ssr: false });

export function TitleScreen() {
  const { t, lang } = useT();
  const go = useUi((s) => s.go);
  const openSheet = useUi((s) => s.openSheet);
  const current = useSaveStore((s) => s.data.current);
  const tutorialDone = useSaveStore((s) => s.data.settings.tutorialDone);
  const daily = useSaveStore((s) => s.data.daily);
  const puzzles = useSaveStore((s) => s.data.puzzles);
  const today = todayKey();
  const streak = activeStreak(daily, today);
  const doneToday = daily.last === today;

  // Showcase the most recent collectible; a tulip until the first solve.
  const showcase = useMemo(() => {
    const solved = solvedCollectibles();
    return getParsed(solved[solved.length - 1] ?? "tutorial-3") ?? getParsed("tutorial-3");
  }, [puzzles]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = () => {
    if (!tutorialDone) startPuzzle("tutorial-1", "relax", { kind: "tutorial", day: "" }, "tutorial");
    else go("packs");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md items-center justify-between">
        {streak > 0 ? (
          <span className="card flex items-center gap-1.5 px-3 py-1.5 font-extrabold" title={daily.grace ? t("daily.grace") : undefined}>
            <span className="text-brick-dark"><Icon name="flame" size={20} /></span>
            {t("daily.streak", { n: streak })}
          </span>
        ) : (
          <span />
        )}
        <button className="btn btn-soft" style={{ padding: 0, width: 48 }} onClick={() => go("settings")} aria-label={t("menu.settings")}>
          <Icon name="settings" />
        </button>
      </div>

      <div className="relative my-1 min-h-[200px] w-full max-w-md flex-1">
        <div className="absolute inset-0 flex items-center justify-center"><div className="scale-75 opacity-60"><TitleSkeleton compact /></div></div>
        {showcase && (
          <div className="absolute inset-0" aria-hidden="true">
            <DioramaCanvas puzzle={showcase} spin={0.45} interactive />
          </div>
        )}
      </div>

      <h1 className="text-5xl font-extrabold tracking-tight">{t("app.name")}</h1>
      <p className="mb-4 mt-1 max-w-xs text-center text-ink-soft">{t("app.tagline")}</p>

      <div className="grid w-full max-w-sm gap-2.5">
        {current && tutorialDone && (
          <button className="btn btn-primary" onClick={() => continueCurrent()} data-testid="continue">
            <Icon name="play" /> {t("menu.continue")}
            <span className="text-sm opacity-80">· {current.id.startsWith("endless") ? t("menu.endless") : (getParsed(current.id)?.def.name[lang] ?? "")}</span>
          </button>
        )}
        <button className={`btn ${current && tutorialDone ? "btn-soft" : "btn-primary"} text-lg`} onClick={play} data-testid="play">
          <Icon name="play" /> {t("menu.play")}
        </button>
        <button className="btn btn-soft" onClick={() => openSheet({ id: dailyPuzzleId(today), kind: "daily", day: today })} data-testid="daily">
          <Icon name="calendar" /> {t("menu.daily")}
          {doneToday && <span className="text-ok"><Icon name="check" size={18} /></span>}
        </button>
        <div className="grid grid-cols-3 gap-2.5">
          <button className="btn btn-soft flex-col gap-0.5 text-sm" style={{ minHeight: 60 }} onClick={() => go("museum")}>
            <Icon name="museum" /> {t("menu.museum")}
          </button>
          <button className="btn btn-soft flex-col gap-0.5 text-sm" style={{ minHeight: 60 }} onClick={() => go("stats")}>
            <Icon name="chart" /> {t("menu.stats")}
          </button>
          <button className="btn btn-soft flex-col gap-0.5 text-sm" style={{ minHeight: 60 }} onClick={() => go("howto")}>
            <Icon name="help" /> {t("menu.howto")}
          </button>
        </div>
      </div>
    </div>
  );
}
