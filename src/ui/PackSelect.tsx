"use client";

import { useMemo } from "react";
import { getParsed, PACKS, packPuzzles } from "@/content/catalog";
import { useT } from "@/i18n/useT";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import { Icon } from "./Icon";
import { Page } from "./kit";
import { ShelfView, type ShelfEntry } from "./ShelfView";

const PACK_SLOTS = 20;
const ENDLESS_SIZES = [5, 10, 15, 20];

export function PackSelect() {
  const { t, lang } = useT();
  const back = useUi((s) => s.back);
  const pack = useUi((s) => s.pack);
  const setPack = useUi((s) => s.setPack);
  const openSheet = useUi((s) => s.openSheet);
  const sheet = useUi((s) => s.sheet);
  const puzzles = useSaveStore((s) => s.data.puzzles);
  const isEndless = pack === "endless";

  const entries = useMemo<ShelfEntry[]>(() => {
    if (isEndless) return [];
    const list = packPuzzles(pack);
    return Array.from({ length: PACK_SLOTS }, (_, i): ShelfEntry => {
      const e = list[i];
      if (!e) return { id: `${pack}-empty-${i}`, puzzle: null, variant: "silhouette", label: t("pack.empty"), disabled: true };
      const solved = puzzles[e.id]?.[0] === 1;
      const name = e.def.name[lang];
      const num = t("puzzle.select", { n: i + 1 });
      return {
        id: e.id,
        puzzle: getParsed(e.id) ?? null,
        variant: solved ? "color" : "silhouette",
        locked: e.isPremium,
        label: e.isPremium ? `${num}: ${t("puzzle.locked")}` : `${num}: ${solved ? name : t("puzzle.unsolved")}`,
      };
    });
  }, [pack, isEndless, puzzles, lang, t]);

  const collected = isEndless ? 0 : packPuzzles(pack).filter((e) => puzzles[e.id]?.[0] === 1).length;
  const selected = sheet?.kind === "pack" ? sheet.id : null;

  return (
    <Page title={t("packs.title")} onBack={back}>
      <div className="flex h-full min-h-[480px] flex-col">
        <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("packs.title")}>
          {[...PACKS, "endless" as const].map((p) => (
            <button key={p} role="tab" aria-selected={pack === p} className={`btn btn-soft shrink-0 ${pack === p ? "is-active" : ""}`} style={{ minHeight: 44, fontSize: "0.9rem" }} onClick={() => setPack(p)}>
              {p === "endless" ? <Icon name="infinity" size={20} /> : null}
              {p === "endless" ? t("menu.endless") : t(`pack.${p}`)}
            </button>
          ))}
        </div>

        {isEndless ? (
          <div className="grid gap-3">
            <p className="text-ink-soft">{t("endless.desc")}</p>
            <div className="grid grid-cols-2 gap-3">
              {ENDLESS_SIZES.map((n) => (
                <button key={n} className="card flex min-h-[96px] flex-col items-center justify-center gap-1 text-lg font-extrabold" onClick={() => openSheet({ id: `endless-${n}`, kind: "endless" })} data-testid={`endless-${n}`}>
                  <Icon name="infinity" />
                  {t("endless.size", { n })}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-1 text-sm font-bold text-ink-soft">{t("pack.progress", { n: collected, total: PACK_SLOTS })}</p>
            <ShelfView
              entries={entries}
              columns={5}
              rows={4}
              selectedId={selected}
              onSelect={(id) => {
                if (packPuzzles(pack).some((x) => x.id === id)) openSheet({ id, kind: "pack" });
              }}
            />
          </>
        )}
      </div>
    </Page>
  );
}
