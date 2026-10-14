# Kharcha

**Live:** https://satwikkkkk.github.io/expense-tracker/
A browser-based expense tracker. Log an expense (name, amount, category), see the running total and how it splits by category. Everything is saved to `localStorage`, so a reload loses nothing.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

## What it does

- Form with Expense Name, Amount (₹, up to two decimal places) and Category. Fields clear after a successful add, and errors are shown inline.
- Expenses listed newest first, grouped by day with a subtotal for each day, 5 per page.
- Live total, animated digit by digit.
- Saved to `localStorage` (key `kharcha:expenses:v1`), and synced across open tabs.
- Delete on every row, behind a confirmation pop-up, and removed from `localStorage` too.
- Spending by category: a stacked band plus a ranked list with share bars on one fixed scale.
- A navbar with three sections (Overview, Add expense, Expenses), one on screen at a time; a bottom tab bar on phones.
- Warm cream look, light theme only; neumorphism kept only for the navbar tabs; minimal animation.

For a full walkthrough of the logic, file by file, plus likely review questions with answers, see [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

Category colours are taken from rupee notes: Food ₹200 yellow, Travel ₹100 lavender, Utilities ₹50 blue, Shopping ₹2000 magenta, Health ₹10 brown, Entertainment ₹20 green-yellow, Other ₹500 grey.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Motion · Lucide icons · Anek Latin (text) and Manrope (numbers).

## Code map

- `src/lib/expenses.ts`: types, categories, amount parsing (stored as whole paise), formatting, grouping
- `src/lib/store.ts`: the `localStorage` store, read through `useSyncExternalStore`
- `src/components/`: `Tracker` (page), `ExpenseForm`, `ExpenseList`, `RollingTotal`, `Breakdown`, `ConfirmDelete`, `NavBar`
