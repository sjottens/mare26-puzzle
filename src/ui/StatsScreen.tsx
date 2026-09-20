"use client";

import { COLLECTIBLES, PACKS, packPuzzles, TOTAL_PUZZLES } from "@/content/catalog";
import { activeStreak } from "@/game";
import { useT } from "@/i18n/useT";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import { todayKey } from "./flow";
import { formatTime, Page, Stars } from "./kit";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3">
      <div className="text-sm font-bold text-ink-soft">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

export function StatsScreen() {
  const { t, lang } = useT();
  const back = useUi((s) => s.back);
  const data = useSaveStore((s) => s.data);

  const solved = COLLECTIBLES.filter((e) => data.puzzles[e.id]?.[0] === 1);
  const stars = solved.reduce((a, e) => a + (data.puzzles[e.id]?.[2] ?? 0), 0);
  const streak = activeStreak(data.daily, todayKey());
  const minutes = Math.floor(data.stats.playTime / 60);
  const playtime = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  const best = COLLECTIBLES.filter((e) => (data.puzzles[e.id]?.[1] ?? 0) > 0)
    .sort((a, b) => (data.puzzles[a.id]?.[1] ?? 0) - (data.puzzles[b.id]?.[1] ?? 0))
    .slice(0, 8);

  return (
    <Page title={t("stats.title")} onBack={back}>
      <div className="mx-auto grid max-w-md gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Tile label={t("stats.solved")} value={`${solved.length} / ${TOTAL_PUZZLES}`} />
          <Tile label={t("stats.stars")} value={stars} />
          <Tile label={t("stats.streak")} value={streak} />
          <Tile label={t("stats.bestStreak")} value={data.daily.best} />
          <Tile label={t("stats.playtime")} value={playtime} />
          <Tile label={t("stats.hints")} value={data.stats.hintsUsed} />
          <Tile label={t("stats.endless")} value={data.stats.endlessSolved} />
        </div>

        <section aria-labelledby="perpack">
          <h2 id="perpack" className="mb-2 text-lg font-extrabold">{t("stats.perPack")}</h2>
          <div className="grid gap-2">
            {PACKS.map((p) => {
              const list = packPuzzles(p);
              const done = list.filter((e) => data.puzzles[e.id]?.[0] === 1).length;
              const pct = Math.round((done / Math.max(1, Math.max(list.length, 20))) * 100);
              return (
                <div key={p}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t(`pack.${p}`)}</span>
                    <span className="tabular-nums">{done} / {Math.max(list.length, 20)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-bg-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t(`pack.${p}`)}>
                    <div className="h-full bg-brick" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="best">
          <h2 id="best" className="mb-2 text-lg font-extrabold">{t("stats.bestTimes")}</h2>
          {best.length === 0 ? (
            <p className="text-ink-soft">{t("stats.noTimes")}</p>
          ) : (
            <ol className="grid gap-1.5">
              {best.map((e) => (
                <li key={e.id} className="card flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate font-bold">{e.def.name[lang]}</span>
                  <span className="flex items-center gap-3">
                    <Stars count={data.puzzles[e.id]?.[2] ?? 0} size={16} />
                    <span className="font-extrabold tabular-nums">{formatTime(data.puzzles[e.id]?.[1] ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Page>
  );
}
