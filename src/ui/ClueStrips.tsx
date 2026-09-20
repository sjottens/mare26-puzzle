"use client";

import { memo } from "react";
import { useT } from "@/i18n/useT";
import { useGame } from "@/store/game";
import { overlayRegistry } from "@/three/registry";
import { Icon } from "./Icon";
import type { StripLayout } from "./stripLayout";

export interface FocusLine {
  axis: "row" | "col";
  index: number;
}

interface LineProps {
  axis: "row" | "col";
  index: number;
  clue: number[];
  done: boolean;
  active: boolean;
  focused: boolean;
  layout: StripLayout;
  label: string;
}

const ClueLine = memo(function ClueLine({ axis, index, clue, done, active, focused, layout, label }: LineProps) {
  const numbers = clue.length === 0 ? [0] : clue;
  const setRef = (el: HTMLDivElement | null) => {
    if (axis === "col") overlayRegistry.cols[index] = el;
    else overlayRegistry.rows[index] = el;
  };
  const highlight = active ? { background: "color-mix(in srgb, var(--brick) 32%, transparent)" } : undefined;
  const common = `rounded-lg ${focused ? "pulse-ring" : ""}`;

  if (axis === "col") {
    return (
      <div
        ref={setRef}
        role="img"
        aria-label={label}
        className={`absolute bottom-0 left-0 flex flex-col items-center justify-end px-1 pb-1 ${common}`}
        style={{ fontSize: layout.fontPx, lineHeight: `${layout.lineH}px`, transform: "translateX(-9999px)", ...highlight }}
      >
        <span className="flex flex-col items-center font-extrabold" style={{ opacity: done ? 0.38 : 1 }}>
          {numbers.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </span>
        <span className="h-4 text-ok" style={{ opacity: done ? 1 : 0 }}>
          <Icon name="check" size={14} />
        </span>
      </div>
    );
  }
  return (
    <div
      ref={setRef}
      role="img"
      aria-label={label}
      className={`absolute right-1 top-0 flex items-center gap-1.5 pl-1 pr-1 ${common}`}
      style={{ fontSize: layout.fontPx, lineHeight: `${layout.lineH}px`, transform: "translateY(-9999px)", ...highlight }}
    >
      <span className="flex items-center gap-1.5 font-extrabold" style={{ opacity: done ? 0.38 : 1 }}>
        {numbers.map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </span>
      <span className="w-4 text-ok" style={{ opacity: done ? 1 : 0 }}>
        <Icon name="check" size={14} />
      </span>
    </div>
  );
});

/**
 * Sticky HTML clue numbers (crisp text, min 13px). Their positions are written by the 3D camera loop
 * (see OverlaySync) so they stay aligned with the grid while zooming/panning.
 */
export function ClueStrips({ layout, focus }: { layout: StripLayout; focus?: FocusLine[] }) {
  const { t } = useT();
  const puzzle = useGame((s) => s.puzzle);
  const rowsDone = useGame((s) => s.rowsDone);
  const colsDone = useGame((s) => s.colsDone);
  const hover = useGame((s) => s.hover);
  const cursor = useGame((s) => s.cursor);
  if (!puzzle) return null;
  const at = hover ?? cursor;
  const isFocus = (axis: "row" | "col", i: number) => !!focus?.some((f) => f.axis === axis && f.index === i);

  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden border-r-2 border-line" style={{ width: layout.left, background: "var(--bg)" }} aria-hidden="true">
        {puzzle.clues.rows.map((clue, i) => (
          <ClueLine key={i} axis="row" index={i} clue={clue} done={!!rowsDone[i]} active={at?.y === i} focused={isFocus("row", i)} layout={layout} label={t("game.clueRow", { n: i + 1, clue: clue.length ? clue.join(" ") : "0" })} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 overflow-hidden border-b-2 border-line" style={{ height: layout.top, background: "var(--bg)" }} aria-hidden="true">
        {puzzle.clues.cols.map((clue, i) => (
          <ClueLine key={i} axis="col" index={i} clue={clue} done={!!colsDone[i]} active={at?.x === i} focused={isFocus("col", i)} layout={layout} label={t("game.clueCol", { n: i + 1, clue: clue.length ? clue.join(" ") : "0" })} />
        ))}
      </div>
    </>
  );
}
