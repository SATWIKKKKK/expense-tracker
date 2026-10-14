// Each category borrows the colour of a rupee note, so colour on the page
// only ever means "which category".
export const CATEGORIES = [
  { id: "food", label: "Food", note: "₹200" },
  { id: "travel", label: "Travel", note: "₹100" },
  { id: "utilities", label: "Utilities", note: "₹50" },
  { id: "shopping", label: "Shopping", note: "₹2000" },
  { id: "health", label: "Health", note: "₹10" },
  { id: "fun", label: "Entertainment", note: "₹20" },
  { id: "other", label: "Other", note: "₹500" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, (typeof CATEGORIES)[number]>;

export const categoryColor = (id: CategoryId) => `var(--cat-${id})`;

export interface Expense {
  id: string;
  name: string;
  /** Whole paise, so totals never pick up floating-point drift. */
  amount: number;
  category: CategoryId;
  createdAt: number;
}

export const NAME_MAX = 60;
const AMOUNT_MAX_PAISE = 1_00_00_000 * 100; // ₹1 crore

export function isExpense(value: unknown): value is Expense {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    Number.isInteger(e.amount) &&
    (e.amount as number) > 0 &&
    typeof e.category === "string" &&
    e.category in CATEGORY_BY_ID &&
    typeof e.createdAt === "number"
  );
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseName(input: string): Parsed<string> {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Give it a name, like “Groceries”." };
  if (name.length > NAME_MAX)
    return { ok: false, error: `Keep the name under ${NAME_MAX} characters.` };
  return { ok: true, value: name };
}

export function parseAmount(input: string): Parsed<number> {
  const cleaned = input.replace(/[,\s₹]/g, "");
  if (!cleaned) return { ok: false, error: "Enter an amount, like 120 or 89.50." };
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === ".")
    return { ok: false, error: "Use digits only, like 120 or 89.50." };

  const [rupees, paise = ""] = cleaned.split(".");
  if (paise.length > 2)
    return { ok: false, error: "Paise go up to two digits, like 89.50." };

  const tooLarge = "That’s over ₹1,00,00,000. Split it into smaller entries.";
  if (rupees.replace(/^0+/, "").length > 8) return { ok: false, error: tooLarge };

  const total = Number(rupees || "0") * 100 + Number(paise.padEnd(2, "0"));
  if (total <= 0) return { ok: false, error: "The amount has to be more than ₹0." };
  if (total > AMOUNT_MAX_PAISE) return { ok: false, error: tooLarge };
  return { ok: true, value: total };
}

const grouped = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234550 → "12,345.50" (Indian digit grouping, no symbol). */
export const formatPaise = (paise: number) => grouped.format(paise / 100);

export const formatRupees = (paise: number) => `₹${formatPaise(paise)}`;

const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const dayThisYear = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const dayOtherYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatTime = (ms: number) => time.format(ms);

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function dayLabel(ms: number, now: Date) {
  const d = new Date(ms);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.getFullYear() === now.getFullYear()
    ? dayThisYear.format(d)
    : dayOtherYear.format(d);
}

export interface DayGroup {
  key: string;
  label: string;
  /** The whole day's spend, even when only part of the day is on this page. */
  total: number;
  items: Expense[];
}

export const newestFirst = (expenses: Expense[]) =>
  [...expenses].sort((a, b) => b.createdAt - a.createdAt);

/**
 * Buckets already-sorted expenses by calendar day (viewer's timezone).
 * `all` supplies day totals, so a day split across two pages still shows its
 * full subtotal on both.
 */
export function groupByDay(items: Expense[], all: Expense[] = items, now = new Date()): DayGroup[] {
  const dayTotals = new Map<string, number>();
  for (const e of all) {
    const key = dayKey(new Date(e.createdAt));
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + e.amount);
  }

  const groups: DayGroup[] = [];
  for (const e of items) {
    const key = dayKey(new Date(e.createdAt));
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, label: dayLabel(e.createdAt, now), total: dayTotals.get(key) ?? 0, items: [] };
      groups.push(group);
    }
    group.items.push(e);
  }
  return groups;
}

export const PAGE_SIZE = 5;

export const pageCount = (itemCount: number) => Math.max(1, Math.ceil(itemCount / PAGE_SIZE));

/** Items on a 1-based page. */
export const pageSlice = <T,>(items: T[], page: number) =>
  items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/** Page buttons to show: every page when few, otherwise ends + neighbours with gaps. */
export function pageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const out: (number | "gap")[] = [];
  for (let n = 1; n <= total; n++) {
    if (keep.has(n)) out.push(n);
    else if (out.at(-1) !== "gap") out.push("gap");
  }
  return out;
}

export interface CategoryTotal {
  id: CategoryId;
  total: number;
  share: number;
}

/** Categories with any spend, largest first. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const sums = new Map<CategoryId, number>();
  let all = 0;
  for (const e of expenses) {
    sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
    all += e.amount;
  }
  return [...sums]
    .map(([id, total]) => ({ id, total, share: all ? total / all : 0 }))
    .sort((a, b) => b.total - a.total);
}
