"use client";

import { CornerDownLeft } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import {
  CATEGORIES,
  type CategoryId,
  NAME_MAX,
  parseAmount,
  parseName,
} from "@/lib/expenses";
import { NoteSwatch } from "./Breakdown";

export interface NewExpense {
  name: string;
  amount: number;
  category: CategoryId;
}

type Errors = Partial<Record<"name" | "amount", string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="pt-2 text-[0.9rem] text-danger">
      {message}
    </p>
  );
}

export function ExpenseForm({ onAdd }: { onAdd: (expense: NewExpense) => void }) {
  const uid = useId();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>("food");
  const [errors, setErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedName = parseName(name);
    const parsedAmount = parseAmount(amount);

    if (!parsedName.ok || !parsedAmount.ok) {
      setErrors({
        name: parsedName.ok ? undefined : parsedName.error,
        amount: parsedAmount.ok ? undefined : parsedAmount.error,
      });
      (parsedName.ok ? amountRef : nameRef).current?.focus();
      return;
    }

    onAdd({ name: parsedName.value, amount: parsedAmount.value, category });
    // Clear the inputs after a successful add; the category stays, since the
    // next expense is often the same kind.
    setName("");
    setAmount("");
    setErrors({});
    nameRef.current?.focus();
  }

  const nameErrorId = `${uid}-name-error`;
  const amountErrorId = `${uid}-amount-error`;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={`${uid}-title`}
      className="card rounded-3xl px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7"
    >
      <h2 id={`${uid}-title`} className="text-[1.35rem] font-semibold leading-tight tracking-[-0.01em]">
        Add an expense
      </h2>

      <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-[1fr_minmax(11rem,14rem)]">
        <div>
          <label htmlFor={`${uid}-name`} className="text-[0.95rem] text-ink-2">
            What was it for?
          </label>
          <div className="field mt-2 rounded-xl" data-invalid={!!errors.name}>
            <input
              ref={nameRef}
              id={`${uid}-name`}
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              maxLength={NAME_MAX + 20}
              autoComplete="off"
              placeholder="Auto to campus"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? nameErrorId : undefined}
              className="h-14 w-full bg-transparent px-4 text-[1.15rem] font-medium outline-none placeholder:text-ink-2/60 focus-visible:outline-none"
            />
          </div>
          <FieldError id={nameErrorId} message={errors.name} />
        </div>

        <div>
          <label htmlFor={`${uid}-amount`} className="text-[0.95rem] text-ink-2">
            Amount
          </label>
          <div
            className="field mt-2 flex h-14 items-center gap-1.5 rounded-xl px-4"
            data-invalid={!!errors.amount}
          >
            <span aria-hidden className="num text-[1.2rem] font-bold text-ink-2">
              ₹
            </span>
            <input
              ref={amountRef}
              id={`${uid}-amount`}
              name="amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? amountErrorId : undefined}
              className="num h-full w-full min-w-0 bg-transparent text-[1.45rem] font-bold outline-none placeholder:text-ink-2/45 focus-visible:outline-none"
            />
          </div>
          <FieldError id={amountErrorId} message={errors.amount} />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="text-[0.95rem] text-ink-2">Category</legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => {
              const checked = c.id === category;
              return (
                <label
                  key={c.id}
                  className={`btn flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-xl px-4 text-[0.98rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-[var(--focus)] ${
                    checked ? "is-current font-semibold" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.id}
                    checked={checked}
                    onChange={() => setCategory(c.id)}
                    className="sr-only"
                  />
                  <NoteSwatch id={c.id} />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="hidden text-[0.92rem] text-ink-2 sm:block">
          Press{" "}
          <kbd className="rounded-md border border-line-strong bg-card px-1.5 py-0.5 font-sans text-[0.85rem] text-ink">Enter</kbd> in any
          field to add.
        </p>
        <button
          type="submit"
          className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl px-6 text-[1.02rem] font-semibold sm:w-auto"
        >
          Add expense
          <CornerDownLeft aria-hidden size={17} strokeWidth={2.25} />
        </button>
      </div>
    </form>
  );
}
