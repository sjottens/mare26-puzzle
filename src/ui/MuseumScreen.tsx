"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { COLLECTIBLES, getParsed } from "@/content/catalog";
import { useT } from "@/i18n/useT";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import { formatTime, Page, Sheet, Stars } from "./kit";
import { Icon } from "./Icon";
import { shareResult } from "./share";
import { ShelfView, type ShelfEntry } from "./ShelfView";

const DioramaCanvas = dynamic(() => import("@/three/DioramaCanvas"), { ssr: false });

const COLS = 5;
const ROWS = 3;
const PER_PAGE = COLS * ROWS;

function Viewer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, lang } = useT();
  const rec = useSaveStore((s) => s.data.puzzles[id]);
  const [note, setNote] = useState("");
  const puzzle = getParsed(id);
  if (!puzzle) return null;
  const name = puzzle.def.name[lang];
  const challenge = (rec?.[1] ?? 0) > 0;

  const share = async () => {
    const outcome = await shareResult(
      { name, day: "", mode: challenge ? "challenge" : "relax", stars: rec?.[2] ?? 0, time: formatTime(rec?.[1] ?? 0), heartsLeft: 3, solution: puzzle.solution, width: puzzle.width },
      `maré26 · ${name}`,
      challenge ? `${"★".repeat(rec?.[2] ?? 0)}${"☆".repeat(3 - (rec?.[2] ?? 0))} · ${formatTime(rec?.[1] ?? 0)}` : "Relax",
    );
    setNote(outcome === "shared" ? t("reveal.shared") : outcome === "copied" || outcome === "downloaded" ? t("reveal.copiedText") : "");
  };

  return (
    <Sheet title={name} onClose={onClose} wide>
      <div className="relative h-[46vh] min-h-[240px] overflow-hidden rounded-2xl bg-bg-soft">
        <DioramaCanvas puzzle={puzzle} interactive snapshot spin={0.5} />
      </div>
      <p className="mt-1 text-center text-sm text-ink-soft">{t("reveal.subtitle")}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 font-bold">
          {(rec?.[2] ?? 0) > 0 && <Stars count={rec?.[2] ?? 0} />}
          {challenge && <span className="tabular-nums">{t("puzzle.best", { t: formatTime(rec?.[1] ?? 0) })}</span>}
        </div>
        <button className="btn btn-primary" onClick={share}>
          <Icon name="share" /> {t("common.share")}
        </button>
      </div>
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
    </Sheet>
  );
}

export function MuseumScreen() {
  const { t, lang } = useT();
  const back = useUi((s) => s.back);
  const go = useUi((s) => s.go);
  const viewing = useUi((s) => s.viewing);
  const view = useUi((s) => s.view);
  const puzzles = useSaveStore((s) => s.data.puzzles);
  const [page, setPage] = useState(0);

  const collected = useMemo(() => COLLECTIBLES.filter((e) => puzzles[e.id]?.[0] === 1), [puzzles]);
  const pages = Math.max(1, Math.ceil(collected.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const entries: ShelfEntry[] = collected.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE).map((e) => ({
    id: e.id,
    puzzle: getParsed(e.id) ?? null,
    variant: "color",
    label: e.def.name[lang],
  }));

  return (
    <Page title={t("museum.title")} onBack={back}>
      {collected.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="max-w-xs text-lg text-ink-soft">{t("museum.empty")}</p>
          <button className="btn btn-primary" onClick={() => go("packs")}>
            <Icon name="play" /> {t("menu.play")}
          </button>
        </div>
      ) : (
        <div className="flex h-full min-h-[440px] flex-col">
          <p className="text-sm font-bold text-ink-soft">{t("museum.count", { n: collected.length })}</p>
          <ShelfView entries={entries} columns={COLS} rows={ROWS} selectedId={viewing} onSelect={(id) => view(id)} />
          {pages > 1 && (
            <div className="mt-2 flex items-center justify-center gap-3">
              <button className="btn btn-soft" style={{ padding: 0, width: 48 }} disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label={t("common.back")}>
                <Icon name="back" />
              </button>
              <span className="font-bold tabular-nums">{t("museum.page", { p: safePage + 1, n: pages })}</span>
              <button className="btn btn-soft" style={{ padding: 0, width: 48 }} disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label={t("common.next")}>
                <Icon name="next" />
              </button>
            </div>
          )}
        </div>
      )}
      {viewing && <Viewer id={viewing} onClose={() => view(null)} />}
    </Page>
  );
}
