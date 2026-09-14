"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface Box {
  id: string;
  label: string;
  bbox: readonly [number, number, number, number];
  description: string;
}

const LOUPE = 150;
const ZOOM = 2.4;

/**
 * The creative with finding regions drawn on in blue pencil. Boxes trace in when
 * they appear; the active one crawls. Optional loupe magnifies under the cursor.
 * Regions are also listed as text for screen readers.
 */
export function CreativeWithBoxes({
  src,
  alt,
  boxes,
  activeId,
  onActivate,
  sizes = "(min-width: 1024px) 360px, 100vw",
  priority,
  loupe = false,
  dark = false,
  className = "",
  drawDelay = 0,
}: {
  src: string;
  alt: string;
  boxes: readonly Box[];
  activeId?: string | null;
  onActivate?: (id: string | null) => void;
  sizes?: string;
  priority?: boolean;
  loupe?: boolean;
  dark?: boolean;
  className?: string;
  drawDelay?: number;
}) {
  const [ratio, setRatio] = useState(4 / 5);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pencil = dark ? "var(--table-pencil)" : "var(--pencil)";

  return (
    <figure className={className}>
      <div
        ref={frame}
        className={`relative w-full overflow-hidden rounded-[3px] ${dark ? "" : "border border-rule"} bg-sheet ${loupe ? "cursor-none [@media(pointer:coarse)]:cursor-auto" : ""}`}
        style={{ aspectRatio: ratio }}
        onPointerMove={(e) => {
          if (!loupe || e.pointerType !== "mouse" || !frame.current) return;
          const r = frame.current.getBoundingClientRect();
          setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
        }}
        onPointerLeave={() => setLens(null)}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={src.startsWith("blob:")}
          className="object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}
        />

        {boxes.length > 0 && size && (
          // Drawn in real pixels (not a stretched 0–100 viewBox) so the stroke draw-in stays even on every side.
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
            {boxes.map((b, i) => {
              const [x, y, w, h] = b.bbox;
              const active = activeId === b.id;
              const inset = 1.5;
              const rect = {
                x: x * size.w + inset,
                y: y * size.h + inset,
                width: Math.max(0, Math.min(w, 1 - x) * size.w - inset * 2),
                height: Math.max(0, Math.min(h, 1 - y) * size.h - inset * 2),
              };
              return (
                <g key={b.id}>
                  <rect {...rect} fill={pencil} fillOpacity={active ? 0.14 : 0} style={{ transition: "fill-opacity 180ms ease" }} />
                  <motion.rect
                    {...rect}
                    fill="none"
                    stroke={active ? "var(--paper)" : pencil}
                    strokeWidth={2.5}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: drawDelay + i * 0.25 }}
                  />
                  {active && <rect {...rect} fill="none" stroke={pencil} strokeWidth={2.5} className="marching-ants" />}
                </g>
              );
            })}
          </svg>
        )}

        {boxes.map((b, i) => {
          const [x, y] = b.bbox;
          return (
            <motion.button
              key={b.id}
              type="button"
              tabIndex={onActivate ? 0 : -1}
              aria-label={`Finding ${b.label}: ${b.description}`}
              onMouseEnter={() => onActivate?.(b.id)}
              onMouseLeave={() => onActivate?.(null)}
              onFocus={() => onActivate?.(b.id)}
              onBlur={() => onActivate?.(null)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26, delay: drawDelay + 0.5 + i * 0.25 }}
              className="absolute z-10 flex h-6 min-w-6 origin-top-left items-center justify-center px-1.5 text-xs font-semibold"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, background: pencil, color: dark ? "var(--table)" : "var(--paper)" }}
            >
              {b.label}
            </motion.button>
          );
        })}

        {loupe && lens && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-20 rounded-full border-2 border-paper shadow-[0_0_0_1px_var(--ink)]"
            style={{
              width: LOUPE,
              height: LOUPE,
              left: lens.x - LOUPE / 2,
              top: lens.y - LOUPE / 2,
              backgroundImage: `url("${src}")`,
              backgroundRepeat: "no-repeat",
              backgroundColor: "var(--sheet)",
              backgroundSize: `${lens.w * ZOOM}px ${lens.h * ZOOM}px`,
              backgroundPosition: `${-(lens.x * ZOOM - LOUPE / 2)}px ${-(lens.y * ZOOM - LOUPE / 2)}px`,
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-ink/60" />
            <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-ink/60" />
          </div>
        )}
      </div>
      {boxes.length > 0 && (
        <figcaption className="sr-only">Marked regions: {boxes.map((b) => `${b.label}: ${b.description}`).join("; ")}</figcaption>
      )}
    </figure>
  );
}
