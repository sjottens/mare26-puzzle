"use client";

import { useEffect } from "react";
import { installFeedback } from "@/audio/bridge";
import { useLang, useT } from "@/i18n/useT";
import { useGame } from "@/store/game";
import { useSaveStore } from "@/store/save";
import { useStage } from "@/store/stage";
import { installHistorySync, useUi } from "@/store/ui";
import { GameScreen } from "./GameScreen";
import { HowToScreen } from "./HowToScreen";
import { Icon } from "./Icon";
import { useLive } from "./live";
import { MuseumScreen } from "./MuseumScreen";
import { PackSelect } from "./PackSelect";
import { SettingsScreen } from "./SettingsScreen";
import { StartSheet } from "./StartSheet";
import { StatsScreen } from "./StatsScreen";
import { TitleScreen } from "./TitleScreen";
import { TitleSkeleton } from "./TitleSkeleton";
import { TutorialScreen } from "./TutorialScreen";
import { useIsDark, useReducedMotion } from "./useTheme";

function Toasts() {
  const { t } = useT();
  const toast = useUi((s) => s.toast);
  if (!toast) return null;
  const tone = toast.tone === "good" ? "border-ok" : toast.tone === "bad" ? "border-danger" : "border-line";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[6.25rem] z-[60] flex justify-center px-4">
      <div key={toast.id} className={`card pop-in border-2 px-4 py-2 font-bold shadow-lg ${tone}`} role="status">
        {t(toast.key, toast.params)}
      </div>
    </div>
  );
}

/** Save-data notices and the first-run privacy note. */
function Notices() {
  const { t } = useT();
  const recovered = useSaveStore((s) => s.recoveredFromCorruption);
  const lastWrite = useSaveStore((s) => s.lastWrite);
  const privacyAck = useSaveStore((s) => s.data.settings.privacyAck);
  const screen = useUi((s) => s.screen);
  const dismiss = useSaveStore((s) => s.dismissRecovery);
  const setSetting = useSaveStore((s) => s.setSetting);

  let text: string | null = null;
  let onClose: (() => void) | null = null;
  if (recovered) {
    text = t("notice.corrupt");
    onClose = dismiss;
  } else if (lastWrite && !lastWrite.ok) {
    text = lastWrite.error === "too-large" ? t("notice.saveTooLarge") : t("notice.saveFailed");
  } else if (!privacyAck && screen === "title") {
    text = t("privacy.short");
    onClose = () => setSetting("privacyAck", true);
  }
  if (!text) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="status">
      <div className="card pop-in flex max-w-md items-center gap-3 p-3 text-sm font-semibold shadow-lg">
        <p className="flex-1">{text}</p>
        {onClose && (
          <button className="btn btn-primary" style={{ minHeight: 44 }} onClick={onClose}>
            {t("common.ok")}
          </button>
        )}
      </div>
    </div>
  );
}

function LiveRegion() {
  const message = useLive((s) => s.message);
  const tick = useLive((s) => s.tick);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      <span key={tick}>{message}</span>
    </div>
  );
}

/** Applies settings to the document: language, theme, contrast, motion. */
function useSettingsEffects() {
  const lang = useLang();
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const highContrast = useSaveStore((s) => s.data.settings.highContrast);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.theme = dark ? "dark" : "light";
    if (highContrast) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
    if (reduced) root.dataset.motion = "reduce";
    else delete root.dataset.motion;
    useStage.getState().setReducedMotion(reduced);
  }, [lang, dark, reduced, highContrast]);
}

export function App() {
  const hydrated = useSaveStore((s) => s.hydrated);
  const screen = useUi((s) => s.screen);
  const sheet = useUi((s) => s.sheet);
  const puzzle = useGame((s) => s.puzzle);
  useSettingsEffects();

  useEffect(() => {
    void useSaveStore.getState().hydrate();
    const offHistory = installHistorySync();
    const offFeedback = installFeedback();
    return () => {
      offHistory();
      offFeedback();
    };
  }, []);

  if (!hydrated) return <TitleSkeleton />;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg text-ink">
      {screen === "title" && <TitleScreen />}
      {screen === "packs" && <PackSelect />}
      {screen === "game" && puzzle && <GameScreen />}
      {screen === "tutorial" && puzzle && <TutorialScreen />}
      {screen === "museum" && <MuseumScreen />}
      {screen === "stats" && <StatsScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "howto" && <HowToScreen />}
      {(screen === "game" || screen === "tutorial") && !puzzle && (
        <div className="flex flex-1 items-center justify-center"><Icon name="restart" /></div>
      )}
      {sheet && <StartSheet key={`${sheet.kind}-${sheet.id}`} target={sheet} />}
      <Toasts />
      <Notices />
      <LiveRegion />
    </div>
  );
}
