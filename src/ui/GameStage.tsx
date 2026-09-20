"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useT } from "@/i18n/useT";
import { useGame } from "@/store/game";
import { useStage } from "@/store/stage";
import { overlayRegistry, sceneSignals } from "@/three/registry";
import { ClueStrips, type FocusLine } from "./ClueStrips";
import { useElementSize } from "./kit";
import { useLive } from "./live";
import { computeStripLayout } from "./stripLayout";

// The 3D canvas is lazy-loaded; until it paints, a 2D skeleton of the board is shown.
const GameCanvas = dynamic(() => import("@/three/GameCanvas"), { ssr: false });

function Skeleton() {
  const puzzle = useGame((s) => s.puzzle);
  const n = puzzle?.width ?? 5;
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="grid animate-pulse gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, width: "min(78%, 60vh)" }}>
        {Array.from({ length: n * (puzzle?.height ?? n) }, (_, i) => (
          <span key={i} className="aspect-square rounded-md bg-bg-soft" />
        ))}
      </div>
    </div>
  );
}

interface Props {
  focus?: FocusLine[];
  leaving?: boolean;
  onEscape?: () => void;
}

/** The board area: 3D canvas + sticky clue strips + keyboard controls. */
export function GameStage({ focus, leaving, onEscape }: Props) {
  const { t } = useT();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const puzzle = useGame((s) => s.puzzle);
  const revealing = useStage((s) => s.revealing);
  const sceneReady = useStage((s) => s.sceneReady);
  const announce = useLive((s) => s.announce);
  const filled = useGame((s) => s.board.cells.reduce((a, v) => a + (v === 1 ? 1 : 0), 0));

  const layout = useMemo(() => (puzzle && size.w > 0 ? computeStripLayout(puzzle.clues, size.w, size.h) : null), [puzzle, size.w, size.h]);

  useEffect(() => {
    if (!layout) return;
    overlayRegistry.metrics = { left: layout.left, top: layout.top, bottom: 6, right: 6 };
    sceneSignals.requestFit();
  }, [layout]);

  // Announce the keyboard cursor cell to screen readers.
  useEffect(() => {
    return useGame.subscribe((s, prev) => {
      if (!s.cursor || !s.puzzle) return;
      if (s.cursor === prev.cursor || s.version !== prev.version) {
        const v = s.board.cells[s.cursor.y * s.board.width + s.cursor.x];
        const key = v === 1 ? "game.cellFilled" : v === 2 ? "game.cellCrossed" : "game.cellEmpty";
        announce(t(key, { line: t("game.row", { n: s.cursor.y + 1 }), c: s.cursor.x + 1 }));
      }
    });
  }, [announce, t]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const g = useGame.getState();
    const key = e.key.toLowerCase();
    let handled = true;
    if (key === "arrowleft") g.moveCursor(-1, 0);
    else if (key === "arrowright") g.moveCursor(1, 0);
    else if (key === "arrowup") g.moveCursor(0, -1);
    else if (key === "arrowdown") g.moveCursor(0, 1);
    else if (key === " " || key === "enter") g.cursorAct("fill");
    else if (key === "x") g.cursorAct("cross");
    else if (key === "backspace" || key === "delete" || key === "e") g.cursorAct("erase");
    else if (key === "z") g.undo();
    else if (key === "y") g.redo();
    else if (key === "h") {
      const hint = g.takeHint();
      if (!hint) announce(t("game.hintIn", { s: Math.max(0, Math.ceil(90 - g.hintClock)) }));
    } else if (key === "escape") onEscape?.();
    else handled = false;
    if (handled) e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="game-surface relative min-h-0 flex-1 overflow-hidden outline-none focus-visible:outline-offset-[-4px]"
      tabIndex={0}
      role="application"
      aria-label={puzzle ? t("game.board", { w: puzzle.width, h: puzzle.height }) : ""}
      aria-describedby="game-keys"
      onKeyDown={onKeyDown}
      data-testid="game-stage"
      data-filled={filled}
    >
      <p id="game-keys" className="sr-only">
        {t("game.keys")}
      </p>
      {!sceneReady && <Skeleton />}
      <div className={`absolute inset-0 ${leaving ? "diorama-leave" : ""}`}>{puzzle && <GameCanvas />}</div>
      {!revealing && layout && puzzle && <ClueStrips layout={layout} focus={focus} />}
    </div>
  );
}
