"use client";

import { captureSnapshot } from "@/three/snapshot";

export interface ShareInput {
  name: string;
  /** "" for none, else a date key for daily puzzles. */
  day: string;
  mode: "relax" | "challenge";
  stars: number;
  time: string;
  heartsLeft: number;
  /** 1 = filled, row-major. */
  solution: ArrayLike<number>;
  width: number;
}

/** Wordle-style result: header line, stats line, then the picture as an emoji grid. */
export function buildShareText(i: ShareInput): string {
  const head = `maré26 · ${i.name}${i.day ? ` · ${i.day}` : ""}`;
  const stats =
    i.mode === "challenge"
      ? `${"★".repeat(i.stars)}${"☆".repeat(3 - i.stars)} · ${i.time} · ${"♥".repeat(i.heartsLeft)}${"♡".repeat(3 - i.heartsLeft)}`
      : "Relax";
  const rows: string[] = [];
  for (let y = 0; y * i.width < i.solution.length; y++) {
    let row = "";
    for (let x = 0; x < i.width; x++) row += i.solution[y * i.width + x] === 1 ? "🟪" : "⬜";
    rows.push(row);
  }
  return [head, stats, "", ...rows].join("\n");
}

/** Frames the 3D snapshot on a square card with the title, ready to post. */
export async function composeSharePng(snapshotUrl: string, title: string, subtitle: string): Promise<Blob | null> {
  const img = new Image();
  img.src = snapshotUrl;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const S = 1080;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, "#fdf6ee");
  bg.addColorStop(1, "#f6e0cc");
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  const areaY = 150;
  const areaH = 800;
  const k = Math.min(S / img.width, areaH / img.height) * 1.0;
  const w = img.width * k;
  const h = img.height * k;
  g.drawImage(img, (S - w) / 2, areaY + (areaH - h) / 2, w, h);
  g.fillStyle = "#2b2d5b";
  g.textAlign = "center";
  g.font = "800 68px ui-rounded, 'Segoe UI', system-ui, sans-serif";
  g.fillText(title, S / 2, 100);
  g.fillStyle = "#5b5e8f";
  g.font = "700 40px ui-rounded, 'Segoe UI', system-ui, sans-serif";
  g.fillText(subtitle, S / 2, 1010);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled" | "failed";

/** navigator.share when available (with the PNG when files are supported), else clipboard + download. */
export async function shareResult(input: ShareInput, title: string, subtitle: string): Promise<ShareOutcome> {
  const text = buildShareText(input);
  const snap = captureSnapshot();
  const blob = snap ? await composeSharePng(snap, title, subtitle) : null;
  const file = blob ? new File([blob], "mare26.png", { type: "image/png" }) : null;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const data: ShareData = { title, text };
    if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
    }
  }
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    /* clipboard may be unavailable */
  }
  if (blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mare26.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return copied ? "copied" : "downloaded";
  }
  return copied ? "copied" : "failed";
}
