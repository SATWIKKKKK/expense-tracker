"use client";

import { Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { CATEGORY_BY_ID, type Expense, formatRupees, formatTime } from "@/lib/expenses";
import { NoteSwatch } from "./Breakdown";

/**
 * Asks before an expense is deleted. While open it is modal: focus starts on
 * Cancel (the safe choice), Tab cycles inside the dialog, and Escape or a
 * click on the backdrop cancels.
 */
export function ConfirmDelete({
  expense,
  onCancel,
  onConfirm,
}: {
  expense: Expense | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const open = expense !== null;

  // Focus Cancel on open, and stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {expense && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-30 grid place-items-center bg-[#2b2620]/35 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            onKeyDown={onKeyDown}
            className="card w-full max-w-[26rem] rounded-3xl p-6 sm:p-7"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid size-11 place-items-center rounded-xl bg-danger/10 text-danger">
              <Trash2 aria-hidden size={20} strokeWidth={2} />
            </div>
            <h2 id="confirm-title" className="mt-5 text-[1.3rem] font-semibold tracking-[-0.01em]">
              Delete this expense?
            </h2>
            <div id="confirm-body">
              <div className="tint mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5">
                <NoteSwatch id={expense.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{expense.name}</p>
                  <p className="text-[0.88rem] text-ink-2">
                    {CATEGORY_BY_ID[expense.category].label} ·{" "}
                    <span className="num">{formatTime(expense.createdAt)}</span>
                  </p>
                </div>
                <p className="num font-bold">{formatRupees(expense.amount)}</p>
              </div>
              <p className="mt-4 text-[0.96rem] leading-relaxed text-ink-2">
                It will be removed from this browser and from your total. This can’t be undone.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="btn h-12 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-danger h-12 rounded-xl font-semibold"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
