"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/useT";
import { Icon } from "./Icon";

/** Observes an element's size in CSS px. */
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

export function Stars({ count, max = 3, size = 20 }: { count: number; max?: number; size?: number }) {
  const { t } = useT();
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={t("reveal.stars", { n: count })}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < count ? "#ffb400" : "var(--line)" }}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}

export function Hearts({ left, max = 3 }: { left: number; max?: number }) {
  const { t } = useT();
  return (
    <span key={left} className="inline-flex gap-0.5" role="img" aria-label={t("game.hearts", { n: left })}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i === left ? "shake" : ""} style={{ color: i < left ? "var(--danger)" : "var(--line)" }}>
          <Icon name="heart" size={22} />
        </span>
      ))}
    </span>
  );
}

/** Bottom sheet dialog. Closes on backdrop tap and Escape. */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { t } = useT();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button aria-label={t("common.close")} className="absolute inset-0 cursor-default bg-black/40" style={{ minHeight: 0, minWidth: 0 }} onClick={onClose} tabIndex={-1} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`card pop-in relative m-0 w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-b-[1.25rem]`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t("common.close")} style={{ minHeight: 44, minWidth: 44, padding: 0 }}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-bold">{label}</span>
        {desc && <span className="block text-sm text-ink-soft">{desc}</span>}
      </span>
      <span className="relative inline-block h-8 w-14 shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full border-2 border-line bg-bg-soft transition-colors peer-checked:border-brick-dark peer-checked:bg-brick peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-sky" />
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-ink transition-transform peer-checked:translate-x-6" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="py-2">
      <div className="mb-1.5 font-bold">{label}</div>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={`btn btn-soft flex-1 ${value === o.value ? "is-active" : ""}`} style={{ minHeight: 44, padding: "0 0.5rem", fontSize: "0.9rem" }} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Page frame for the secondary screens (stats, settings, how to play, ...). */
export function Page({ title, onBack, children, right }: { title: string; onBack: () => void; children: ReactNode; right?: ReactNode }) {
  const { t } = useT();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button className="btn btn-soft" onClick={onBack} aria-label={t("common.back")} style={{ padding: 0, width: 48 }}>
          <Icon name="back" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold">{title}</h1>
        {right}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
