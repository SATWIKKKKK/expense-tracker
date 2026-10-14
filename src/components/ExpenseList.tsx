"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import {
  CATEGORY_BY_ID,
  type Expense,
  PAGE_SIZE,
  formatRupees,
  formatTime,
  groupByDay,
  newestFirst,
  pageCount,
  pageNumbers,
  pageSlice,
} from "@/lib/expenses";
import { NoteSwatch } from "./Breakdown";

const ease = [0.22, 1, 0.36, 1] as const;
const collapse = { duration: 0.28, ease } as const;

function Row({ expense, onDelete }: { expense: Expense; onDelete: (expense: Expense) => void }) {
  const category = CATEGORY_BY_ID[expense.category];
  return (
    <motion.li
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={collapse}
      // Clips while its height animates; side padding (cancelled by the
      // negative margin) keeps the delete button's focus ring visible.
      className="-mx-1 overflow-hidden px-1"
    >
      <div className="divider grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 py-3.5">
        <NoteSwatch id={expense.category} />
        <div className="min-w-0">
          <p className="truncate text-[1.06rem] font-medium leading-snug">{expense.name}</p>
          <p className="mt-0.5 text-[0.9rem] text-ink-2">
            {category.label} · <span className="num">{formatTime(expense.createdAt)}</span>
          </p>
        </div>
        <p className="num text-right text-[1.05rem] font-bold">{formatRupees(expense.amount)}</p>
        <button
          type="button"
          onClick={() => onDelete(expense)}
          aria-label={`Delete ${expense.name}, ${formatRupees(expense.amount)}`}
          title="Delete"
          className="btn my-1 ml-1 grid size-9 place-items-center rounded-lg border-danger/25 text-danger hover:border-danger/50 hover:bg-danger/10"
        >
          <Trash2 aria-hidden size={16} strokeWidth={2} />
        </button>
      </div>
    </motion.li>
  );
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav aria-label="Expense pages" className="mt-6 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="btn grid size-10 place-items-center rounded-xl"
      >
        <ChevronLeft aria-hidden size={18} strokeWidth={2.25} />
      </button>
      <ol className="flex items-center gap-2">
        {pageNumbers(page, pages).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="num w-6 text-center text-ink-2">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                onClick={() => onPage(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={`num grid size-10 place-items-center rounded-xl text-[0.95rem] font-bold ${
                  n === page ? "btn is-current" : "btn text-ink-2"
                }`}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
        className="btn grid size-10 place-items-center rounded-xl"
      >
        <ChevronRight aria-hidden size={18} strokeWidth={2.25} />
      </button>
    </nav>
  );
}

export function ExpenseList({
  expenses,
  page,
  onPage,
  onDelete,
  saved,
  headingRef,
}: {
  expenses: Expense[];
  /** 1-based; already clamped to the available pages by the caller. */
  page: number;
  onPage: (page: number) => void;
  onDelete: (expense: Expense) => void;
  saved: boolean;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const sorted = newestFirst(expenses);
  const count = sorted.length;
  const pages = pageCount(count);
  const onThisPage = pageSlice(sorted, page);
  const groups = groupByDay(onThisPage, sorted);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + onThisPage.length - 1;

  return (
    <section aria-labelledby="expenses-heading" className="card rounded-3xl px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="expenses-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-[1.35rem] font-semibold tracking-[-0.01em] focus-visible:outline-none"
        >
          Expenses
        </h2>
        <p className="text-[0.95rem] text-ink-2" aria-live="polite">
          {count === 0 ? (
            "No entries"
          ) : (
            <>
              <span className="num font-semibold text-ink">
                {first}–{last}
              </span>{" "}
              of <span className="num font-semibold text-ink">{count}</span>
            </>
          )}
        </p>
      </div>

      {!saved && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[0.95rem] text-danger">
          This browser refused to save. Your last change will be lost when you reload.
        </p>
      )}

      <AnimatePresence initial={false}>
        {count === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.25 }}
            className="tint mt-5 rounded-2xl px-5 py-6"
          >
            <p className="text-[1.1rem] font-medium">Nothing logged yet.</p>
            <p className="mt-1.5 max-w-[46ch] text-[0.98rem] leading-relaxed text-ink-2">
              Add your first expense above. It stays in this browser, so it will still be here after a reload.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A page change is a short cross-fade. */}
      <AnimatePresence initial={false} mode="wait">
        {count > 0 && (
          <motion.div
            key={page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnimatePresence initial={false}>
              {groups.map((group) => (
                <motion.section
                  key={group.key}
                  aria-label={group.label}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={collapse}
                  className="-mx-1 overflow-hidden px-1"
                >
                  <div className="mt-5 flex items-baseline justify-between border-b border-line-strong pb-2.5 text-[0.95rem]">
                    <h3 className="font-semibold">{group.label}</h3>
                    <p className="num font-semibold text-ink-2">{formatRupees(group.total)}</p>
                  </div>
                  <ul>
                    <AnimatePresence initial={false}>
                      {group.items.map((expense) => (
                        <Row key={expense.id} expense={expense} onDelete={onDelete} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.section>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {pages > 1 && <Pagination page={page} pages={pages} onPage={onPage} />}
    </section>
  );
}
