"use client";

import { gameEvents } from "@/store/events";
import { useSaveStore } from "@/store/save";
import { haptics, setHapticsEnabled, setMusicEnabled, setSfxEnabled, sfx, unlockAudio } from "./engine";

let lastClick = 0;

/** Connects game events and settings to sound + haptics. Returns a cleanup function. */
export function installFeedback(): () => void {
  const apply = () => {
    const s = useSaveStore.getState().data.settings;
    setSfxEnabled(s.sound);
    setMusicEnabled(s.music);
    setHapticsEnabled(s.haptics);
  };
  apply();
  const unsubSettings = useSaveStore.subscribe((state, prev) => {
    if (state.data.settings !== prev.data.settings) apply();
  });

  const unlock = () => unlockAudio();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);

  const unsubEvents = gameEvents.on((e) => {
    switch (e.type) {
      case "cell": {
        // Undo/redo, hints and auto-cross are silent; only direct input clicks.
        if (e.source !== "input") return;
        const now = performance.now();
        if (now - lastClick < 28) return; // a fast drag should tick, not machine-gun
        lastClick = now;
        if (e.to === 1) {
          sfx.fill();
          haptics.fill();
        } else if (e.to === 2) {
          sfx.cross();
          haptics.cross();
        } else {
          sfx.erase();
          haptics.erase();
        }
        break;
      }
      case "line":
        sfx.line(e.streak);
        haptics.line();
        break;
      case "mistake":
        sfx.mistake();
        haptics.mistake();
        break;
      case "hint":
        sfx.hint();
        haptics.hint();
        break;
      case "check":
        sfx.check();
        break;
      case "solved":
        sfx.victory();
        haptics.win();
        break;
      case "failed":
        sfx.fail();
        haptics.fail();
        break;
    }
  });

  return () => {
    unsubSettings();
    unsubEvents();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}
