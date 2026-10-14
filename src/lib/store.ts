"use client";

import { useSyncExternalStore } from "react";
import { type Expense, isExpense } from "./expenses";

export const STORAGE_KEY = "kharcha:expenses:v1";

interface Snapshot {
  expenses: Expense[];
  /** False when the last write to localStorage threw (quota, private mode). */
  saved: boolean;
}

const SERVER_SNAPSHOT: Snapshot = { expenses: [], saved: true };

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function read(): Expense[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isExpense) : [];
  } catch {
    // Unparseable data can't be recovered; start from an empty list.
    return [];
  }
}

function getSnapshot(): Snapshot {
  snapshot ??= { expenses: read(), saved: true };
  return snapshot;
}

function emit() {
  for (const listener of listeners) listener();
}

// Another tab wrote to the same key: adopt its list.
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  snapshot = { expenses: read(), saved: true };
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function commit(expenses: Expense[]) {
  let saved = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    saved = false;
  }
  snapshot = { expenses, saved };
  emit();
}

export const addExpense = (expense: Expense) =>
  commit([...getSnapshot().expenses, expense]);

export function removeExpense(id: string): Expense | undefined {
  const { expenses } = getSnapshot();
  const removed = expenses.find((e) => e.id === id);
  if (removed) commit(expenses.filter((e) => e.id !== id));
  return removed;
}

export function useExpenses(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

const noopSubscribe = () => () => {};

/** False during the server render and hydration, true once the client owns the page. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
