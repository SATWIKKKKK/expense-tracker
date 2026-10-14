"use client";

import { type LucideIcon, PieChart, Plus, ReceiptText } from "lucide-react";
import { motion } from "motion/react";
import { type KeyboardEvent, useRef } from "react";
import { formatRupees } from "@/lib/expenses";

export const SECTIONS = [
  { id: "overview", label: "Overview", icon: PieChart },
  { id: "add", label: "Add expense", icon: Plus },
  { id: "expenses", label: "Expenses", icon: ReceiptText },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

export type SectionId = (typeof SECTIONS)[number]["id"];

export const tabId = (id: SectionId) => `tab-${id}`;
export const panelId = (id: SectionId) => `panel-${id}`;

const slide = { type: "spring", stiffness: 380, damping: 36 } as const;

function CountBadge({ count, className }: { count: number; className: string }) {
  return (
    <span
      aria-hidden
      className={`num h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-accent px-1 text-[0.7rem] font-bold leading-none text-white shadow-[0_1px_3px_rgba(229,56,59,0.45)] ${className}`}
    >
      {count}
    </span>
  );
}

/**
 * The three sections as tabs (WAI-ARIA tabs pattern). Arrow keys move between
 * tabs, Home/End jump to the ends. On phones the same tab list docks to the
 * bottom of the screen, where a thumb can reach it.
 */
function Tabs({
  active,
  count,
  onSelect,
}: {
  active: SectionId;
  count: number;
  onSelect: (id: SectionId) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = SECTIONS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onSelect(SECTIONS[next].id);
  }

  return (
    <div
      role="tablist"
      aria-label="Sections"
      className="neu-tray grid grid-cols-3 gap-1 rounded-2xl p-1.5 sm:flex sm:gap-1.5"
    >
      {SECTIONS.map((s, i) => {
        const selected = s.id === active;
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(s.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(s.id)}
            // Explicit name, so the badge's position never changes what is read.
            aria-label={s.id === "expenses" && count > 0 ? `${s.label}, ${count} entries` : s.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(s.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.8rem] transition-colors duration-300 sm:h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-[0.98rem] ${
              selected ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {/* One raised key that slides to whichever section is open. */}
            {selected && (
              <motion.span
                layoutId="nav-active"
                aria-hidden
                className="neu-raised absolute inset-0 rounded-xl"
                transition={slide}
              />
            )}
            <span className="relative">
              <Icon
                aria-hidden
                size={18}
                strokeWidth={selected ? 2.4 : 2}
                className={`transition-colors duration-200 ${selected ? "text-accent" : ""}`}
              />
              {/* Phones: the count rides on the icon. */}
              {s.id === "expenses" && count > 0 && (
                <CountBadge count={count} className="absolute -right-3.5 -top-2 grid sm:hidden" />
              )}
            </span>
            <span className="relative whitespace-nowrap">{s.label}</span>
            {s.id === "expenses" && count > 0 && (
              <CountBadge count={count} className="relative hidden sm:grid" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function NavBar({
  active,
  onSelect,
  total,
  count,
  hydrated,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  total: number;
  count: number;
  hydrated: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
      <div className="card mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-[1.4rem] py-2.5 pl-5 pr-2.5 sm:py-2.5">
        <p className="shrink-0 text-[1.45rem] font-semibold tracking-[-0.01em]">Kharcha</p>

        {/* One tab list. On phones CSS docks it to the bottom of the screen,
            within thumb reach; from sm up it sits here in the bar. */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:p-0"
        >
          <div className="card rounded-[1.4rem] p-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Tabs active={active} count={count} onSelect={onSelect} />
          </div>
        </nav>

        {/* The running total stays in view whichever section is open. */}
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-xl px-1 sm:px-2">
          <span className="text-[0.85rem] text-ink-2">Spent</span>
          <span className="num text-[1rem] font-extrabold">{hydrated ? formatRupees(total) : "₹—"}</span>
        </div>
      </div>
    </header>
  );
}
