import {
  CATEGORY_BY_ID,
  type CategoryId,
  type CategoryTotal,
  categoryColor,
  formatRupees,
} from "@/lib/expenses";

const percent = (share: number) =>
  share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

export function NoteSwatch({ id, className = "" }: { id: CategoryId; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[11px] w-[18px] shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] ${className}`}
      style={{ background: categoryColor(id) }}
    />
  );
}

/** One strip; each category's share is its own length of it (flex-grow = its total). */
export function CategoryBand({ totals }: { totals: CategoryTotal[] }) {
  return (
    <div className="track flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
      {totals.map((t) => (
        <div
          key={t.id}
          className="h-full min-w-0 transition-[flex-grow] duration-500 ease-out-expo"
          style={{ background: categoryColor(t.id), flexGrow: t.total }}
        />
      ))}
    </div>
  );
}

export function CategoryLegend({ totals }: { totals: CategoryTotal[] }) {
  if (totals.length === 0) {
    return (
      <p className="text-[0.95rem] leading-snug text-ink-2">
        Categories rank here by how much you spend on them.
      </p>
    );
  }

  return (
    <ol className="grid gap-x-8 sm:grid-cols-2">
      {totals.map((t, rank) => (
        <li
          key={t.id}
          className="divider grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3"
        >
          <NoteSwatch id={t.id} />
          <span className="min-w-0 truncate text-[0.98rem]">
            <span className="sr-only">Rank {rank + 1}: </span>
            {CATEGORY_BY_ID[t.id].label}
            <span className="num ml-2 text-[0.88rem] font-semibold text-ink-2">{percent(t.share)}</span>
          </span>
          <span className="num text-[0.95rem] font-bold">{formatRupees(t.total)}</span>
          {/* Fixed scale: every bar is a share of the same whole. */}
          <span className="track col-span-3 mt-2 block h-[4px] overflow-hidden rounded-full">
            <span
              className="block h-full origin-left rounded-full transition-transform duration-500 ease-out-expo"
              style={{ background: categoryColor(t.id), transform: `scaleX(${t.share})` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
