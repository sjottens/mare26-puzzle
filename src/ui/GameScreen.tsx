"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { hintSentence, useT } from "@/i18n/useT";
import type { Tool } from "@/game";
import { gameEvents } from "@/store/events";
import { useGame } from "@/store/game";
import { useStage } from "@/store/stage";
import { useUi } from "@/store/ui";
import type { FocusLine } from "./ClueStrips";
import { startEndless, startPuzzle } from "./flow";
import { GameStage } from "./GameStage";
import { Icon, type IconName } from "./Icon";
import { formatTime, Hearts, Sheet } from "./kit";
import { useLive } from "./live";
import { RevealPanel } from "./RevealPanel";

interface Props {
  /** Coach/instruction banner under the HUD (tutorial). */
  banner?: ReactNode;
  focus?: FocusLine[];
  /** Skip the reveal and call `onSolved` shortly after the puzzle is finished. */
  skipReveal?: boolean;
  onSolved?: () => void;
  /** Replaces the reveal panel's buttons (tutorial). */
  resultActions?: ReactNode;
  /** Back button target override. */
  onBack?: () => void;
}

const TOOLS: { tool: Tool; icon: IconName; label: "game.fill" | "game.cross" | "game.erase" }[] = [
  { tool: "fill", icon: "fill", label: "game.fill" },
  { tool: "cross", icon: "cross", label: "game.cross" },
  { tool: "erase", icon: "erase", label: "game.erase" },
];

export function GameScreen({ banner, focus, skipReveal, onSolved, resultActions, onBack }: Props) {
  const { t, lang } = useT();
  const puzzle = useGame((s) => s.puzzle);
  const status = useGame((s) => s.status);
  const mode = useGame((s) => s.mode);
  const tool = useGame((s) => s.tool);
  const hearts = useGame((s) => s.hearts);
  const seconds = useGame((s) => Math.floor(s.elapsed));
  const hintLeft = useGame((s) => Math.max(0, Math.ceil(90 - s.hintClock)));
  const canUndo = useGame((s) => s.canUndo);
  const canRedo = useGame((s) => s.canRedo);
  const activeHint = useGame((s) => s.activeHint);
  const paused = useGame((s) => s.paused);
  const source = useGame((s) => s.source);
  const revealDone = useStage((s) => s.revealDone);
  const revealing = useStage((s) => s.revealing);
  const announce = useLive((s) => s.announce);
  const showToast = useUi((s) => s.showToast);
  const back = useUi((s) => s.back);
  const [leaving, setLeaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const solvedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer: counts play time only while the screen is visible and the game is running.
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (!document.hidden) useGame.getState().tick(dt);
    }, 250);
    return () => {
      clearInterval(id);
      useGame.getState().saveNow();
    };
  }, []);

  // Screen-reader announcements.
  useEffect(() => {
    return gameEvents.on((e) => {
      const g = useGame.getState();
      if (e.type === "line") announce(t("game.lineDone", { line: t(e.axis === "row" ? "game.row" : "game.col", { n: e.index + 1 }) }));
      else if (e.type === "mistake") announce(t("game.mistake"));
      else if (e.type === "hint") announce(hintSentence(t, e.hint));
      else if (e.type === "check") announce(e.wrong.length ? t("game.checkWrong", { n: e.wrong.length }) : t("game.checkOk"));
      else if (e.type === "solved") announce(`${t("reveal.title")} ${g.puzzle?.def.name[lang] ?? ""}`);
    });
  }, [announce, t, lang]);

  // When solved: let the last line-wave play, then start the reveal (or the quick tutorial flow).
  useEffect(() => {
    if (status !== "solved") return;
    solvedTimer.current = setTimeout(() => {
      if (skipReveal) onSolved?.();
      else useStage.getState().startReveal();
    }, skipReveal ? 900 : 850);
    return () => {
      if (solvedTimer.current) clearTimeout(solvedTimer.current);
    };
  }, [status, skipReveal, onSolved]);

  // Hint banner disappears on its own.
  useEffect(() => {
    if (!activeHint) return;
    const id = setTimeout(() => useGame.getState().clearHint(), 14000);
    return () => clearTimeout(id);
  }, [activeHint]);

  const leave = useCallback((then: () => void) => {
    setLeaving(true);
    setTimeout(() => {
      then();
      setLeaving(false);
    }, 560);
  }, []);

  const requestHint = () => {
    const g = useGame.getState();
    if (!g.takeHint()) showToast("game.hintIn", "info", { s: Math.max(0, Math.ceil(90 - g.hintClock)) });
  };
  const requestCheck = () => {
    const wrong = useGame.getState().check();
    showToast(wrong === 0 ? "game.checkOk" : "game.checkWrong", wrong === 0 ? "good" : "bad", { n: wrong });
  };

  if (!puzzle) return null;
  const hintReady = hintLeft === 0;
  const playing = status === "playing";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* HUD */}
      <header className={`flex items-center gap-2 px-2 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] transition-opacity ${revealing ? "opacity-0" : ""}`}>
        <button className="btn btn-soft" style={{ padding: 0, width: 48 }} onClick={onBack ?? back} aria-label={t("common.back")}>
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <div className="truncate text-lg font-extrabold">{puzzle.def.name[lang]}</div>
          <div className="text-xs font-bold text-ink-soft">
            {puzzle.width} × {puzzle.height} · {mode === "challenge" ? t("mode.challenge") : t("mode.relax")}
          </div>
        </div>
        <div className="flex min-w-[76px] flex-col items-end justify-center gap-0.5">
          {mode === "challenge" ? (
            <>
              <Hearts left={hearts} />
              <span className="text-sm font-extrabold tabular-nums" aria-label={t("game.time", { t: formatTime(seconds) })}>
                {formatTime(seconds)}
              </span>
            </>
          ) : (
            <span className="text-sm font-bold text-ink-soft">{t("mode.relax")}</span>
          )}
        </div>
        <button className="btn btn-soft" style={{ padding: 0, width: 48 }} onClick={() => { useGame.getState().setPaused(true); setMenuOpen(true); }} aria-label={t("game.pause")}>
          <Icon name="pause" />
        </button>
      </header>

      {banner && !revealing && <div className="px-3 pb-1">{banner}</div>}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <GameStage focus={focus} leaving={leaving} onEscape={() => { useGame.getState().setPaused(true); setMenuOpen(true); }} />

        {activeHint && !revealing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-3">
            <div className="card pop-in pointer-events-auto flex max-w-md items-start gap-2 p-3" role="status">
              <span className="mt-0.5 text-brick-dark"><Icon name="bulb" /></span>
              <p className="flex-1 font-semibold leading-snug">{hintSentence(t, activeHint)}</p>
              <button className="btn btn-ghost" style={{ minHeight: 44, minWidth: 44, padding: 0 }} onClick={() => useGame.getState().clearHint()} aria-label={t("notice.dismiss")}>
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>
        )}
        {revealing && revealDone && <RevealPanel onLeave={leave} actions={resultActions} />}
      </div>

      {/* Toolbar */}
      {!revealing && (
        <nav className="flex items-center justify-between gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1" aria-label="Tools">
          <div className="flex gap-1.5" role="radiogroup" aria-label="Tool">
            {TOOLS.map((x) => (
              <button
                key={x.tool}
                role="radio"
                aria-checked={tool === x.tool}
                className={`btn btn-soft flex-col gap-0 ${tool === x.tool ? "is-active" : ""}`}
                style={{ width: 54, minHeight: 56, padding: 0, fontSize: 10 }}
                disabled={!playing}
                onClick={() => useGame.getState().setTool(x.tool)}
              >
                <Icon name={x.icon} size={22} />
                <span>{t(x.label)}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button className="btn btn-soft" style={{ width: 46, minHeight: 56, padding: 0 }} disabled={!playing || !canUndo} onClick={() => useGame.getState().undo()} aria-label={t("game.undo")}>
              <Icon name="undo" />
            </button>
            <button className="btn btn-soft" style={{ width: 46, minHeight: 56, padding: 0 }} disabled={!playing || !canRedo} onClick={() => useGame.getState().redo()} aria-label={t("game.redo")}>
              <Icon name="redo" />
            </button>
            <button
              className={`btn btn-soft flex-col gap-0 ${hintReady ? "pulse-ring" : ""}`}
              style={{ width: 54, minHeight: 56, padding: 0, fontSize: 11 }}
              disabled={!playing}
              onClick={requestHint}
              aria-label={hintReady ? t("game.hint") : t("game.hintIn", { s: hintLeft })}
              data-testid="hint-button"
            >
              <Icon name="bulb" size={22} />
              <span className="tabular-nums">{hintReady ? t("game.hint") : `${hintLeft}s`}</span>
            </button>
            {mode === "relax" && (
              <button className="btn btn-soft" style={{ width: 46, minHeight: 56, padding: 0 }} disabled={!playing} onClick={requestCheck} aria-label={t("game.check")}>
                <Icon name="check" />
              </button>
            )}
          </div>
        </nav>
      )}

      {menuOpen && paused && (
        <Sheet title={t("game.paused")} onClose={() => { useGame.getState().setPaused(false); setMenuOpen(false); }}>
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => { useGame.getState().setPaused(false); setMenuOpen(false); }}>
              <Icon name="play" /> {t("game.resume")}
            </button>
            <button className="btn btn-soft" onClick={() => { setMenuOpen(false); useGame.getState().restart(); }}>
              <Icon name="restart" /> {t("game.restart")}
            </button>
            <button className="btn btn-soft" onClick={() => { setMenuOpen(false); useGame.getState().setPaused(false); (onBack ?? back)(); }}>
              {t("game.quit")}
            </button>
          </div>
        </Sheet>
      )}

      {status === "failed" && (
        <Sheet title={t("game.failed")} onClose={() => useGame.getState().restart()}>
          <p className="mb-3 text-ink-soft">{t("game.failedBody")}</p>
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => useGame.getState().restart()}>
              <Icon name="restart" /> {t("game.tryAgain")}
            </button>
            <button
              className="btn btn-soft"
              onClick={() => {
                if (source.kind === "endless") startEndless(puzzle.width, "relax");
                else startPuzzle(puzzle.def.id, "relax", source, source.kind === "tutorial" ? "tutorial" : "game");
              }}
            >
              {t("game.switchRelax")}
            </button>
            <button className="btn btn-soft" onClick={onBack ?? back}>
              {t("reveal.menu")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
