"use client";

import { useEffect } from "react";
import { TUTORIAL_IDS } from "@/content/catalog";
import { useT } from "@/i18n/useT";
import { useGame } from "@/store/game";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import type { FocusLine } from "./ClueStrips";
import { startPuzzle } from "./flow";
import { GameScreen } from "./GameScreen";
import { Icon } from "./Icon";

/** Three tiny guided puzzles (3x3, 5x5, 5x5) that teach the rules by playing. */
export function TutorialScreen() {
  const { t } = useT();
  const puzzleId = useGame((s) => s.puzzle?.def.id ?? "");
  const rowsDone = useGame((s) => s.rowsDone);
  const filled = useGame((s) => s.board.cells.reduce((a, v) => a + (v === 1 ? 1 : 0), 0));
  const go = useUi((s) => s.go);
  const showToast = useUi((s) => s.showToast);
  const setSetting = useSaveStore((s) => s.setSetting);
  const step = Math.max(0, TUTORIAL_IDS.indexOf(puzzleId));
  const last = step === TUTORIAL_IDS.length - 1;

  // The last tutorial puzzle teaches hints, so the first one is available immediately.
  useEffect(() => {
    if (last) useGame.setState({ hintClock: 90 });
  }, [last, puzzleId]);

  const finish = () => {
    setSetting("tutorialDone", true);
    showToast("tutorial.ready", "good");
    go("packs", { replace: true });
  };

  let message = "";
  let focus: FocusLine[] = [];
  if (step === 0) {
    message = rowsDone[1] ? t("tutorial.t1b") : t("tutorial.t1a");
    focus = [rowsDone[1] ? { axis: "col", index: 1 } : { axis: "row", index: 1 }];
  } else if (step === 1) {
    const full = rowsDone[1] && rowsDone[2];
    message = full ? t("tutorial.t2b") : t("tutorial.t2a");
    focus = full ? [] : [{ axis: "row", index: 1 }, { axis: "row", index: 2 }];
  } else {
    message = filled === 0 ? t("tutorial.t3a") : t("tutorial.t3b");
  }

  const banner = (
    <div className="card flex items-start gap-3 p-3" role="status" data-testid="coach">
      <div className="flex-1">
        <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{t("tutorial.step", { n: step + 1, total: TUTORIAL_IDS.length })}</div>
        <p className="text-sm font-bold leading-snug">{message}</p>
      </div>
      <button className="btn btn-ghost text-sm" style={{ minHeight: 44 }} onClick={finish}>
        {t("tutorial.skip")}
      </button>
    </div>
  );

  return (
    <GameScreen
      banner={banner}
      focus={focus}
      skipReveal={!last}
      onSolved={() => {
        showToast("tutorial.nice", "good");
        startPuzzle(TUTORIAL_IDS[step + 1], "relax", { kind: "tutorial", day: "" }, "tutorial");
      }}
      resultActions={
        <button className="btn btn-primary col-span-2" onClick={finish} data-testid="tutorial-finish">
          <Icon name="play" /> {t("menu.play")}
        </button>
      }
      onBack={() => go("title")}
    />
  );
}
