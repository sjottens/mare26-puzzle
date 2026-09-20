"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ShelfItem } from "@/three/ShelfCanvas";
import { shelfGeometry } from "@/three/shelf";
import { Icon } from "./Icon";
import { useElementSize } from "./kit";

const ShelfCanvas = dynamic(() => import("@/three/ShelfCanvas"), { ssr: false });

export interface ShelfEntry extends ShelfItem {
  label: string;
  locked?: boolean;
  disabled?: boolean;
}

interface Props {
  entries: ShelfEntry[];
  columns: number;
  rows: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** A 3D shelf with DOM buttons on top (accessible, 44px+ targets) laid out with the same linear mapping. */
export function ShelfView({ entries, columns, rows, selectedId, onSelect }: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [hovered, setHovered] = useState<string | null>(null);
  const geo = size.w > 0 ? shelfGeometry(size.w, size.h, columns, rows) : null;

  return (
    <div ref={ref} className="relative mx-auto min-h-0 w-full max-w-xl flex-1">
      {geo && (
        <>
          <ShelfCanvas items={entries} columns={columns} rows={rows} width={size.w} height={size.h} hoveredId={hovered} selectedId={selectedId} />
          {entries.map((e, i) => {
            const c = geo.itemCenter(i % columns, Math.floor(i / columns));
            return (
              <button
                key={e.id}
                className="absolute rounded-2xl outline-offset-2"
                style={{ left: c.x - geo.button / 2, top: c.y - geo.button / 2, width: geo.button, height: geo.button, background: "transparent" }}
                disabled={e.disabled}
                aria-label={e.label}
                aria-pressed={selectedId === e.id}
                onClick={() => onSelect(e.id)}
                onPointerEnter={() => setHovered(e.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(e.id)}
                onBlur={() => setHovered(null)}
              >
                {e.locked && (
                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-bg">
                    <Icon name="lock" size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
