"use client";

import { ArrowRight, CircleCheck, Plus } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import {
  CATEGORY_BY_ID,
  type Expense,
  formatRupees,
  formatTime,
  newestFirst,
  pageCount,
  totalsByCategory,
} from "@/lib/expenses";
import { addExpense, removeExpense, useExpenses, useHydrated } from "@/lib/store";
import { CategoryBand, CategoryLegend, NoteSwatch } from "./Breakdown";
import { ConfirmDelete } from "./ConfirmDelete";
import { ExpenseForm, type NewExpense } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import { NavBar, type SectionId, panelId, tabId } from "./NavBar";
import { RollingTotal } from "./RollingTotal";
import { SpendingChart } from "./SpendingChart";

const LATEST_COUNT = 2;

export function Tracker() {
  const hydrated = useHydrated();
  const { expenses, saved } = useExpenses();
  const [active, setActive] = useState<SectionId>("overview");
  const [pending, setPending] = useState<Expense | null>(null);
  const [lastAdded, setLastAdded] = useState<Expense | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totals = totalsByCategory(expenses);
  const count = expenses.length;
  const latest = newestFirst(expenses).slice(0, LATEST_COUNT);
  // Derived, not stored: deleting the last row on the last page simply lands
  // on the page before it.
  const page = Math.min(requestedPage, pageCount(count));

  function openSection(next: SectionId) {
    if (next === active) return;
    setActive(next);
    if (next !== "add") setLastAdded(null);
  }

  function add(entry: NewExpense) {
    const expense: Expense = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() };
    addExpense(expense);
    setLastAdded(expense);
    // Newest is first, so the list should open on page 1 where it landed.
    setRequestedPage(1);
  }

  function askToDelete(expense: Expense) {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setPending(expense);
  }

  function cancelDelete() {
    setPending(null);
    returnFocusRef.current?.focus();
  }

  function confirmDelete() {
    if (!pending) return;
    const removed = removeExpense(pending.id);
    setPending(null);
    if (!removed) return;
    setAnnouncement(`Deleted ${removed.name}.`);
    // The row's button is gone; keep keyboard focus on the list.
    headingRef.current?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <NavBar active={active} onSelect={openSection} total={total} count={count} hydrated={hydrated} />

      <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
        {/* Switching sections: a short fade with a slight lift. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            id={panelId(active)}
            role="tabpanel"
            aria-labelledby={tabId(active)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === "overview" && (
              <section
                aria-labelledby="total-heading"
                className="card rounded-3xl px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7"
              >
                <h1 id="total-heading" className="text-[1rem] text-ink-2">
                  Total spent
                </h1>
                <div className="mt-3 min-h-[clamp(2.5rem,11vw,4.25rem)]">
                  {hydrated && <RollingTotal paise={total} />}
                </div>
                <p className="mt-3 text-[0.98rem] text-ink-2">
                  {hydrated &&
                    (count === 0 ? (
                      "No expenses yet"
                    ) : (
                      <>
                        Across <span className="num font-semibold text-ink">{count}</span>{" "}
                        {count === 1 ? "expense" : "expenses"} in{" "}
                        <span className="num font-semibold text-ink">{totals.length}</span>{" "}
                        {totals.length === 1 ? "category" : "categories"}
                      </>
                    ))}
                </p>

                <h2 className="sr-only">Spending by category</h2>
                <div className="mt-7">{hydrated && <CategoryBand totals={totals} />}</div>
                <div className="mt-5">
                  {hydrated && <CategoryLegend totals={totals} />}
                </div>

                {hydrated && count === 0 && (
                  <button
                    type="button"
                    onClick={() => openSection("add")}
                    className="btn-primary mt-7 inline-flex h-12 items-center gap-2.5 rounded-xl px-6 font-semibold"
                  >
                    <Plus aria-hidden size={18} strokeWidth={2.4} />
                    Add your first expense
                  </button>
                )}

                {hydrated && count > 0 && (
                  <div className="mt-9">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-[1.1rem] font-semibold">Latest</h2>
                      <button
                        type="button"
                        onClick={() => openSection("expenses")}
                        className="group inline-flex items-center gap-1.5 rounded-lg text-[0.95rem] font-semibold text-ink-2 transition-colors hover:text-ink"
                      >
                        See all <span className="num">{count}</span>
                        <ArrowRight
                          aria-hidden
                          size={16}
                          className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                        />
                      </button>
                    </div>
                    <ul className="tint mt-3 rounded-2xl px-4">
                      {latest.map((e, i) => (
                        <li
                          key={e.id}
                          className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3 ${
                            i < latest.length - 1 ? "divider" : ""
                          }`}
                        >
                          <NoteSwatch id={e.category} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{e.name}</p>
                            <p className="text-[0.85rem] text-ink-2">
                              {CATEGORY_BY_ID[e.category].label} ·{" "}
                              <span className="num">{formatTime(e.createdAt)}</span>
                            </p>
                          </div>
                          <p className="num font-bold">{formatRupees(e.amount)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {active === "add" && (
              <div className="grid gap-5">
                <ExpenseForm onAdd={add} />
                <AnimatePresence mode="popLayout">
                  {lastAdded && (
                    <motion.div
                      key={lastAdded.id}
                      role="status"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-5 py-4"
                    >
                      <CircleCheck aria-hidden size={22} className="shrink-0 text-[#16a34a]" />
                      <p className="min-w-0 flex-1">
                        Added <span className="font-semibold">{lastAdded.name}</span>{" "}
                        <span className="num font-bold">{formatRupees(lastAdded.amount)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openSection("expenses")}
                        className="btn inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[0.95rem] font-semibold"
                      >
                        View expenses
                        <ArrowRight aria-hidden size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {active === "expenses" && hydrated && (
              <div className="grid gap-5">
                {count > 0 && <SpendingChart totals={totals} total={total} />}
                <ExpenseList
                  expenses={expenses}
                  page={page}
                  onPage={setRequestedPage}
                  onDelete={askToDelete}
                  saved={saved}
                  headingRef={headingRef}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      <ConfirmDelete expense={pending} onCancel={cancelDelete} onConfirm={confirmDelete} />
    </MotionConfig>
  );
}
