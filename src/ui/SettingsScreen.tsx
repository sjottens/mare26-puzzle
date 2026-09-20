"use client";

import { useState } from "react";
import { useT } from "@/i18n/useT";
import { useSaveStore } from "@/store/save";
import { useUi } from "@/store/ui";
import { Icon } from "./Icon";
import { Page, Segmented, Sheet, Toggle } from "./kit";

const VERSION = "0.1.0";

function SaveData() {
  const { t } = useT();
  const exportCode = useSaveStore((s) => s.exportCode);
  const importCode = useSaveStore((s) => s.importCode);
  const resetAll = useSaveStore((s) => s.resetAll);
  const showToast = useUi((s) => s.showToast);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [confirm, setConfirm] = useState(false);

  const copy = async () => {
    const c = code || exportCode();
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      showToast("common.copied", "good");
    } catch {
      /* the code stays visible for manual copying */
    }
  };

  return (
    <section className="card grid gap-3 p-4" aria-labelledby="save-h">
      <h2 id="save-h" className="text-lg font-extrabold">{t("settings.saveData")}</h2>
      <div>
        <div className="font-bold">{t("settings.export")}</div>
        <p className="mb-2 text-sm text-ink-soft">{t("settings.exportDesc")}</p>
        {code && <textarea readOnly value={code} rows={3} className="mb-2 w-full break-all rounded-xl border-2 border-line bg-bg-soft p-2 font-mono text-xs" aria-label={t("settings.export")} onFocus={(e) => e.currentTarget.select()} />}
        <button className="btn btn-soft" onClick={copy} data-testid="export-code">
          <Icon name="share" /> {code ? t("common.copy") : t("settings.export")}
        </button>
      </div>
      <div>
        <label className="font-bold" htmlFor="import-code">{t("settings.import")}</label>
        <textarea id="import-code" value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder={t("settings.importPlaceholder")} className="my-2 w-full rounded-xl border-2 border-line bg-bg-soft p-2 font-mono text-xs" />
        <button
          className="btn btn-soft"
          disabled={!input.trim()}
          onClick={() => {
            const ok = importCode(input);
            showToast(ok ? "settings.importOk" : "settings.importBad", ok ? "good" : "bad");
            if (ok) setInput("");
          }}
        >
          {t("settings.importButton")}
        </button>
      </div>
      <button className="btn btn-soft text-danger" onClick={() => setConfirm(true)}>
        {t("settings.reset")}
      </button>
      {confirm && (
        <Sheet title={t("settings.reset")} onClose={() => setConfirm(false)}>
          <p className="mb-3">{t("settings.resetConfirm")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-soft" onClick={() => setConfirm(false)}>{t("common.cancel")}</button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await resetAll();
                setConfirm(false);
                setCode("");
                showToast("settings.resetDone", "good");
              }}
            >
              {t("settings.reset")}
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

export function SettingsScreen() {
  const { t, lang } = useT();
  const back = useUi((s) => s.back);
  const s = useSaveStore((st) => st.data.settings);
  const set = useSaveStore((st) => st.setSetting);
  const otherLang = lang === "nl" ? "en" : "nl";

  return (
    <Page title={t("settings.title")} onBack={back}>
      <div className="mx-auto grid max-w-md gap-4">
        <section className="card p-4" aria-label={t("settings.title")}>
          <Segmented
            label={t("settings.language")}
            value={s.lang}
            onChange={(v) => set("lang", v)}
            options={[{ value: "auto", label: t("settings.langAuto") }, { value: "nl", label: "Nederlands" }, { value: "en", label: "English" }]}
          />
          <Segmented
            label={t("settings.theme")}
            value={s.theme}
            onChange={(v) => set("theme", v)}
            options={[{ value: "auto", label: t("settings.themeAuto") }, { value: "light", label: t("settings.themeLight") }, { value: "dark", label: t("settings.themeDark") }]}
          />
          <Toggle label={t("settings.sound")} checked={s.sound} onChange={(v) => set("sound", v)} />
          <Toggle label={t("settings.music")} checked={s.music} onChange={(v) => set("music", v)} />
          <Toggle label={t("settings.haptics")} checked={s.haptics} onChange={(v) => set("haptics", v)} />
          <Toggle label={t("settings.autoCross")} checked={s.autoCross} onChange={(v) => set("autoCross", v)} />
          <Toggle label={t("settings.colorblind")} desc={t("settings.colorblindDesc")} checked={s.colorblind} onChange={(v) => set("colorblind", v)} />
          <Toggle label={t("settings.highContrast")} checked={s.highContrast} onChange={(v) => set("highContrast", v)} />
          <Segmented
            label={t("settings.reducedMotion")}
            value={s.reducedMotion}
            onChange={(v) => set("reducedMotion", v)}
            options={[{ value: "auto", label: t("settings.motionAuto") }, { value: "on", label: t("settings.motionOn") }, { value: "off", label: t("settings.motionOff") }]}
          />
        </section>

        <SaveData />

        <section className="card p-4" aria-labelledby="privacy-h">
          <h2 id="privacy-h" className="mb-1 text-lg font-extrabold">{t("settings.privacyTitle")}</h2>
          <p className="text-sm leading-relaxed">{t("settings.privacy")}</p>
          <details className="mt-2 text-sm text-ink-soft">
            <summary className="min-h-[44px] cursor-pointer py-2 font-bold">{otherLang === "nl" ? "Nederlands" : "English"}</summary>
            <p className="leading-relaxed" lang={otherLang}>
              {otherLang === "nl"
                ? "maré26 bewaart je voortgang in een paar kleine functionele cookies op dit apparaat. Er is geen analytics, geen tracking en geen script van derden. Er wordt niets naar een server gestuurd."
                : "maré26 stores your progress in a few small functional cookies on this device. There are no analytics, no tracking, and no third-party scripts. Nothing is sent to any server."}
            </p>
          </details>
        </section>
        <p className="pb-2 text-center text-sm text-ink-soft">{t("settings.version", { v: VERSION })}</p>
      </div>
    </Page>
  );
}
