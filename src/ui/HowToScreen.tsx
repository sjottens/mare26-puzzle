"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/useT";
import { useUi } from "@/store/ui";
import { startPuzzle } from "./flow";
import { Icon } from "./Icon";
import { Page } from "./kit";

function Cell({ kind }: { kind: "on" | "off" | "x" }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${kind === "on" ? "border-brick-dark bg-brick" : "border-line bg-bg-soft"}`}
      aria-hidden="true"
    >
      {kind === "x" && <Icon name="cross" size={16} />}
    </span>
  );
}

function Mini({ clue, cells }: { clue: string; cells: ("on" | "off" | "x")[] }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={clue}>
      <span className="w-12 text-right font-extrabold tabular-nums">{clue}</span>
      <div className="flex gap-1">
        {cells.map((c, i) => (
          <Cell key={i} kind={c} />
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="card flex gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brick font-extrabold text-on-brick">{n}</span>
      <div className="grid gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="leading-snug text-ink-soft">{text}</p>
        {children}
      </div>
    </li>
  );
}

export function HowToScreen() {
  const { t } = useT();
  const back = useUi((s) => s.back);
  return (
    <Page title={t("howto.title")} onBack={back}>
      <ol className="mx-auto grid max-w-md gap-3">
        <Step n={1} title={t("howto.s1t")} text={t("howto.s1")}>
          <Mini clue="3 1" cells={["on", "on", "on", "off", "on"]} />
        </Step>
        <Step n={2} title={t("howto.s2t")} text={t("howto.s2")}>
          <Mini clue="2" cells={["x", "on", "on", "x", "x"]} />
        </Step>
        <Step n={3} title={t("howto.s3t")} text={t("howto.s3")}>
          <Mini clue="4" cells={["off", "on", "on", "on", "off"]} />
        </Step>
        <Step n={4} title={t("howto.s4t")} text={t("howto.s4")}>
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 2, 1].map((h, i) => (
              <div key={i} className="flex flex-col-reverse gap-0.5">
                {Array.from({ length: h }, (_, k) => (
                  <span key={k} className="block h-5 w-8 rounded-md border-2 border-brick-dark bg-brick" />
                ))}
              </div>
            ))}
          </div>
        </Step>
        <li className="list-none">
          <button className="btn btn-primary w-full" onClick={() => startPuzzle("tutorial-1", "relax", { kind: "tutorial", day: "" }, "tutorial")}>
            <Icon name="play" /> {t("howto.tutorial")}
          </button>
        </li>
      </ol>
    </Page>
  );
}
