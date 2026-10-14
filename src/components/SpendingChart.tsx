"use client";

import { useState } from "react";
import {
  CATEGORY_BY_ID,
  type CategoryId,
  type CategoryTotal,
  categoryColor,
  formatRupees,
} from "@/lib/expenses";
import { NoteSwatch } from "./Breakdown";

const RADIUS = 46;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Gap between neighbouring arcs, in the same units as the circumference. */
const GAP = 2;

const percent = (share: number) =>
  share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

/**
 * Each arc's visible length and where it starts on the ring: an arc starts
 * where the previous one ended (a running sum of the shares before it).
 */
function arcsFor(totals: CategoryTotal[], gap: number) {
  const arcs = [];
  let start = 0;
  for (const t of totals) {
    arcs.push({ ...t, length: Math.max(t.share * CIRCUMFERENCE - gap, 0.001), offset: start });
    start += t.share * CIRCUMFERENCE;
  }
  return arcs;
}

/**
 * Donut chart of each category's share of total spending, drawn as SVG
 * circles. Each arc is one circle whose visible dash length is its share of
 * the circumference, rotated into place by a dash offset.
 */
export function SpendingChart({ totals, total }: { totals: CategoryTotal[]; total: number }) {
  const [focus, setFocus] = useState<CategoryId | null>(null);
  const focused = totals.find((t) => t.id === focus) ?? null;
  const gap = totals.length > 1 ? GAP : 0;

  const arcs = arcsFor(totals, gap);

  const summary = totals
    .map((t) => `${CATEGORY_BY_ID[t.id].label} ${percent(t.share)}`)
    .join(", ");

  return (
    <section
      aria-labelledby="split-heading"
      className="card rounded-3xl px-5 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-7"
    >
      <h2 id="split-heading" className="text-[1.35rem] font-semibold tracking-[-0.01em]">
        Spending split
      </h2>

      <div className="mt-5 grid items-center gap-x-10 gap-y-6 sm:grid-cols-[auto_1fr]">
        <div className="relative mx-auto size-44 sm:mx-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`Share of spending: ${summary}`}>
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--tint)" strokeWidth={STROKE} />
            {arcs.map((a) => (
              <circle
                key={a.id}
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke={categoryColor(a.id)}
                strokeWidth={focus === a.id ? STROKE + 3 : STROKE}
                strokeDasharray={`${a.length} ${CIRCUMFERENCE - a.length}`}
                strokeDashoffset={-a.offset}
                opacity={focus && focus !== a.id ? 0.3 : 1}
                onMouseEnter={() => setFocus(a.id)}
                onMouseLeave={() => setFocus(null)}
                className="cursor-pointer transition-[stroke-dasharray,stroke-dashoffset,stroke-width,opacity] duration-500 ease-out-expo"
              />
            ))}
          </svg>
          {/* Centre label: the hovered category's share, or the total. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            {focused ? (
              <>
                <span className="num text-[1.6rem] font-extrabold leading-none">{percent(focused.share)}</span>
                <span className="mt-1 text-[0.85rem] text-ink-2">{CATEGORY_BY_ID[focused.id].label}</span>
              </>
            ) : (
              <>
                <span className="num text-[1.15rem] font-extrabold leading-none">{formatRupees(total)}</span>
                <span className="mt-1 text-[0.85rem] text-ink-2">total</span>
              </>
            )}
          </div>
        </div>

        <ul className="grid gap-x-6 sm:grid-cols-2">
          {totals.map((t) => (
            <li
              key={t.id}
              tabIndex={0}
              onMouseEnter={() => setFocus(t.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(t.id)}
              onBlur={() => setFocus(null)}
              className={`divider grid cursor-default grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-md px-1 py-2.5 transition-opacity duration-200 ${
                focus && focus !== t.id ? "opacity-45" : ""
              }`}
            >
              <NoteSwatch id={t.id} />
              <span className="min-w-0 truncate">
                {CATEGORY_BY_ID[t.id].label}
                <span className="num ml-2 text-[0.85rem] text-ink-2">{formatRupees(t.total)}</span>
              </span>
              <span className="num text-[1.05rem] font-extrabold">{percent(t.share)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
