# Kharcha: Project Guide

How this expense tracker is built, how every part works, and the questions you are likely to be asked about it, with answers.

---

## 1. What the project does

Kharcha is a browser-based expense tracker. You enter an expense (name, amount, category). It shows up in a list, the total updates straight away, and a breakdown shows how your spending splits across categories. All data is saved in the browser's `localStorage`, so it survives a page reload. There is no server and no database.

### Requirement checklist

| Requirement | Where it is done |
|---|---|
| Form with Expense Name, Amount, Category | `src/components/ExpenseForm.tsx` |
| Render expenses as a list | `src/components/ExpenseList.tsx` |
| Total calculated and shown live | `Tracker.tsx` (`expenses.reduce(...)`) → `RollingTotal.tsx` |
| Save to `localStorage`, persist on reload | `src/lib/store.ts` (`commit`, `read`) |
| Clear the inputs after a successful submit | `ExpenseForm.tsx` → `submit()` calls `setName("")`, `setAmount("")` |
| **Stretch:** Delete button that also removes from `localStorage` | `ExpenseList.tsx` (button) → `ConfirmDelete.tsx` (pop-up) → `store.ts` (`removeExpense`) |
| **Stretch:** Spending by category visual | `src/components/Breakdown.tsx` (`CategoryBand` + `CategoryLegend`) on Overview, and `src/components/SpendingChart.tsx` (donut chart with percentages) on Expenses |
| **Extra:** Confirmation pop-up before delete | `src/components/ConfirmDelete.tsx` |
| **Extra:** Pagination, 5 expenses per page | `ExpenseList.tsx` + helpers in `src/lib/expenses.ts` |
| **Extra:** Grouped by day with day subtotals | `groupByDay()` in `src/lib/expenses.ts` |
| **Extra:** Sync across open tabs | `onStorage()` in `src/lib/store.ts` |
| **Extra:** Navbar with 3 sections (Overview, Add expense, Expenses) | `src/components/NavBar.tsx` + `Tracker.tsx` |

---

## 2. Tech stack and why

| Tool | Why it is used |
|---|---|
| **Next.js 16 (App Router)** | React framework. Gives routing, a production build, font loading and static pre-rendering. |
| **React 19** | The UI is built as components with state. |
| **TypeScript** | Types catch mistakes before the code runs (for example, passing a string where a number is expected). |
| **Tailwind CSS v4** | Utility classes for styling, plus a design-token theme in `globals.css`. |
| **Motion** (`motion/react`, the library formerly called Framer Motion) | A few short, quiet animations: rows fading in and out, section and page cross-fades, the sliding navbar tab, the dialog fade. |
| **lucide-react** | Icon set (trash, chevrons, enter key). |
| **@fontsource-variable** | The font files (Anek Latin for text, Manrope for numbers) ship inside the project, so nothing is downloaded from Google and the fonts can never fall back to Arial. |

---

## 3. Folder and file map

```
src/
├── app/
│   ├── layout.tsx       Root HTML shell: loads fonts, sets <html lang>, page title, theme colour
│   ├── page.tsx         The "/" route. Just renders <Tracker />
│   └── globals.css      Design tokens (cream palette, light only), the component classes (card, field, btn…), the navbar's neumorphic tray, the number font utility
├── lib/
│   ├── expenses.ts      PURE LOGIC: types, categories, validation, money formatting,
│   │                    day grouping, category totals, pagination helpers
│   └── store.ts         STATE + PERSISTENCE: reads and writes localStorage, notifies React
└── components/
    ├── Tracker.tsx      The page. Wires everything together, owns the UI state, shows one section at a time
    ├── NavBar.tsx       Top bar: brand, the 3 section tabs, the running total (tabs dock to the bottom on phones)
    ├── RollingTotal.tsx The big animated total
    ├── Breakdown.tsx    Category band + ranked category list (+ the NoteSwatch colour chip)
    ├── SpendingChart.tsx Donut chart of each category's % share (Expenses tab)
    ├── ExpenseForm.tsx  The add-expense form, with validation and error messages
    ├── ExpenseList.tsx  The paginated list grouped by day, with a delete button per row
    └── ConfirmDelete.tsx The "Delete this expense?" pop-up
```

**Design rule followed:** logic is kept apart from UI.
- `lib/expenses.ts` holds pure functions only: no React, no browser APIs. They are easy to test and to explain.
- `lib/store.ts` is the only file that touches `localStorage`.
- Components only display data and call functions.

---

## 4. The data model

```ts
// src/lib/expenses.ts
interface Expense {
  id: string;          // unique id from crypto.randomUUID()
  name: string;        // "Chai and samosa"
  amount: number;      // in PAISE, a whole number: ₹45.50 is stored as 4550
  category: CategoryId; // "food" | "travel" | "utilities" | "shopping" | "health" | "fun" | "other"
  createdAt: number;   // timestamp in milliseconds (Date.now())
}
```

**Why paise and not rupees?** Computers store decimals in binary, so `0.1 + 0.2` gives `0.30000000000000004`. If we stored ₹0.10 and ₹0.20 as decimals, totals could pick up tiny errors. Storing **whole paise** (integers) keeps every sum exact. We only divide by 100 when **displaying** the value.

What `localStorage` actually holds (key `kharcha:expenses:v1`):
```json
[{"id":"3f2a…","name":"Chai and samosa","amount":4500,"category":"food","createdAt":1760345678901}]
```

The `v1` in the key is a **version**. If the data shape ever changes, a `v2` key can be used and old data migrated, with no crashes on old saved data.

---

## 5. End-to-end flows (file by file)

### 5.1 Page load

1. **`app/page.tsx`** renders `<Tracker />`.
2. **`Tracker.tsx`** is a client component (`"use client"`), because it uses state and the browser's storage.
3. Next.js **pre-renders the page on the server** as static HTML. The server has no `localStorage`, so during that server render the list is empty.
4. Once the browser **hydrates** the page (React takes over the HTML), `useExpenses()` in **`store.ts`** reads `localStorage` and the real data appears.
5. `useHydrated()` tells the page when it is running in the browser. Only then does it render the total, breakdown and list, so the server HTML and the first browser render match (no "hydration mismatch" error).
6. The page appears without a big entrance: animation is kept for changes the user makes, not for loading.

### 5.2 Adding an expense

```
ExpenseForm.submit()
  ├─ parseName(name)        ─┐ lib/expenses.ts: validate + clean
  ├─ parseAmount(amount)    ─┘
  ├─ if invalid → setErrors(...), focus the bad field, STOP
  └─ if valid  → onAdd({ name, amount, category })
                  │
Tracker.add()     ▼
  ├─ addExpense({ ...entry, id: crypto.randomUUID(), createdAt: Date.now() })   → store.ts
  ├─ setLastAdded(expense)  → "Added X ₹Y · View expenses" confirmation under the form
  └─ go to page 1           → the newest expense is always first
                  │
store.addExpense  ▼
  └─ commit([...current, newExpense])
        ├─ localStorage.setItem(KEY, JSON.stringify(list))   ← persisted
        ├─ snapshot = { expenses: list, saved }
        └─ emit()  → tells React "data changed"
                  │
React             ▼
  └─ useExpenses() returns the new snapshot → Tracker re-renders
        ├─ total recalculated → navbar "Spent" figure updates (and RollingTotal on Overview)
        ├─ navbar Expenses badge count goes up
        ├─ totalsByCategory() → band + legend animate
        └─ ExpenseList → new row fades and expands in
Back in ExpenseForm:
  └─ setName(""), setAmount(""), setErrors({}), focus the name field   ← "clear inputs"
```

### 5.3 Deleting an expense (with confirmation)

```
ExpenseList Row: trash button onClick → onDelete(expense)
Tracker.askToDelete(expense)
  ├─ remember which element had focus (to restore it on cancel)
  └─ setPending(expense)  → ConfirmDelete opens
ConfirmDelete
  ├─ focus goes to "Cancel" (the safe choice)
  ├─ Esc / backdrop click / Cancel → Tracker.cancelDelete() → close, focus returns to the trash button
  └─ "Delete" → Tracker.confirmDelete()
        ├─ removeExpense(id)   → store.ts: filter it out, commit() → localStorage updated
        ├─ setPending(null)    → dialog closes
        ├─ screen-reader announcement "Deleted X."
        └─ focus moves to the "Expenses" heading (the row's button no longer exists)
```

### 5.4 Reload

`store.ts` → `getSnapshot()` → `read()` → `localStorage.getItem(KEY)` → `JSON.parse` → keep only valid items (`isExpense`) → the list is shown again.

---

## 6. Core logic explained

### 6.1 The store (`src/lib/store.ts`)

This file is a small **external store**, connected to React with React's built-in `useSyncExternalStore` hook.

| Piece | What it does |
|---|---|
| `snapshot` | In-memory copy of `{ expenses, saved }`. Read from storage once, then kept in memory. |
| `read()` | Reads the JSON from `localStorage`. If it is missing, returns `[]`. If it is corrupt, it catches the parse error and returns `[]`. It also filters out malformed items with `isExpense()`. |
| `commit(list)` | Writes to `localStorage` inside `try/catch`. If the browser refuses (storage full, some private modes), `saved` becomes `false` and the UI shows a red warning. It then updates `snapshot` and calls `emit()`. |
| `subscribe(listener)` | React registers here to hear about changes. It also starts listening to the browser's `storage` event. |
| `onStorage(event)` | Fires when **another tab** changes our key. The data is re-read so both tabs stay in sync. |
| `addExpense`, `removeExpense` | Build a new array (never mutate the old one) and `commit` it. |
| `useExpenses()` | `useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)`. The third argument is what the server renders: an empty list. |

**Why not `useState` + `useEffect`?** That common pattern (load in an effect, save in another effect) works, but:
- the first render always shows empty data, then flips;
- it can cause an extra save right after loading;
- it does not sync across tabs on its own.

`useSyncExternalStore` is React's official tool for reading from an outside source such as `localStorage`. It is safe with server rendering and with concurrent rendering.

**Immutability:** we never do `expenses.push(x)`. We always create a new array (`[...expenses, x]`, `expenses.filter(...)`). React notices changes by comparing references, so a new array means "something changed".

### 6.2 Validation (`parseName`, `parseAmount` in `expenses.ts`)

Both functions return either `{ ok: true, value }` or `{ ok: false, error }`. The form uses `error` directly as the on-screen message.

**Name:**
- trimmed, and repeated spaces collapsed ("  Chai   tea " → "Chai tea")
- must not be empty
- maximum 60 characters

**Amount** (`parseAmount`):
1. Remove commas, spaces and "₹", so "₹1,200" works.
2. Empty → "Enter an amount…"
3. Only digits with at most one dot (regex `^\d*\.?\d*$`) → otherwise "Use digits only…"
4. Split into rupees and paise. More than 2 paise digits → error.
5. More than 8 rupee digits → too large.
6. `paise = rupees × 100 + paise` (e.g. "89.5" → 89×100 + 50 = 8950).
7. Must be > 0, and not over ₹1 crore.

**Why `type="text"` with `inputMode="decimal"` instead of `type="number"`?**
- Number inputs accept "e" (as in 1e5), behave differently between browsers, and change value when you scroll over them.
- `inputMode="decimal"` still opens the numeric keypad on phones, and we validate the text ourselves.

### 6.3 Total and category maths

- **Total:** `expenses.reduce((sum, e) => sum + e.amount, 0)` in `Tracker.tsx`. It is calculated on every render, never stored. Derived data that is never stored can never go out of sync.
- **By category:** `totalsByCategory()` adds up amounts per category with a `Map`, computes `share = categoryTotal / total`, and sorts biggest first.
- **Percentages:** `Math.round(share * 100)`. Anything above 0% but below 1% shows "<1%", so a small category never misleadingly reads "0%".

### 6.4 Formatting money (Indian style)

`Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` formats 123456.5 as **1,23,456.50** (Indian lakh grouping). We add "₹" ourselves. `formatPaise(paise)` divides by 100 first.

Times use `Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" })` → "2:45 pm".

### 6.5 Grouping by day (`groupByDay`)

1. The list is sorted newest first (`newestFirst`).
2. Each expense gets a day key (`year-month-date` in the user's own timezone).
3. Consecutive expenses with the same key go into the same group.
4. The label is "Today", "Yesterday", or a date like "Sun, 11 Oct" (the year is added if it differs from now).
5. **Day totals come from the full list**, not just the current page. If a day's expenses are split across pages 1 and 2, both pages show the correct total for that day.

### 6.6 Pagination (5 per page)

Helpers in `expenses.ts`:
- `PAGE_SIZE = 5`
- `pageCount(n) = max(1, ceil(n / 5))`. There is always at least 1 page.
- `pageSlice(items, page) = items.slice((page-1)*5, page*5)`
- `pageNumbers(current, total)`:
  - with 7 or fewer pages, show them all;
  - otherwise show the first, the last and the neighbours of the current page, with "…" in the gaps (e.g. `1 … 4 5 6 … 12`).

In `Tracker.tsx`:
- The **requested** page is kept in state (`requestedPage`).
- The **shown** page is *derived*: `page = Math.min(requestedPage, pageCount(count))`.
  - So if you delete the only expense on the last page, you land on the previous page automatically. No extra code or effect is needed.
- Adding an expense jumps to page 1, because the newest expense is shown first.

In `ExpenseList.tsx`:
- sort → slice the page → group by day → render;
- the header shows "6–10 of 23";
- the "Previous" and "Next" buttons are disabled on the first and last page;
- the current page button has `aria-current="page"` and is filled dark.

### 6.7 The rolling total (`RollingTotal.tsx`)

- The number is split into characters. Each digit is a **column** holding a vertical strip of 0–9. The column is a 1-digit-tall window with `overflow: hidden`.
- To show digit `d`, the strip is moved up by `d` lines (`y: -d em`). When the total changes, it eases there in 0.45s, like a car odometer. It does **not** roll on first appearance, only on change.
- Columns are keyed by **their position from the right**, so the units digit stays the same element as the number grows. Only new leading digits fade in.
- A "1" is narrower than a "0". An invisible probe measures each digit's real width once, and each column eases to the width of its digit. That keeps "11,263" from looking like "1 1,263".
- For screen readers, a hidden `aria-live` line reads "Total spent ₹11,263.25". The animated version is `aria-hidden`.

### 6.8 Category visual (`Breakdown.tsx`)

- **CategoryBand:** one horizontal bar. Each category is a segment whose `flex-grow` equals its total, so the widths are proportional automatically. A CSS transition eases the widths when totals change.
- **CategoryLegend:** a ranked list. Each row has the colour chip, name, %, amount, and a thin bar scaled to its share of the **same whole**, so bars can be compared directly.
- **Colours:** each category uses the colour of a real rupee note: Food = ₹200 yellow, Travel = ₹100 lavender, Utilities = ₹50 blue, Shopping = ₹2000 magenta, Health = ₹10 brown, Entertainment = ₹20 green-yellow, Other = ₹500 grey.

### 6.9 The percentage donut chart (`SpendingChart.tsx`)

It is drawn with plain SVG, with no chart library.

- Every arc is an SVG `<circle>` with a thick stroke. A circle's outline length is its **circumference**, `2 × π × r`.
- `stroke-dasharray="L rest"` draws only the first `L` units of that outline. We set `L = share × circumference`, so a category with 40% of spending draws 40% of the ring.
- `stroke-dashoffset = -start` moves the arc to where the previous arc ended. `arcsFor()` computes each `start` as a running sum of the shares before it. A tiny gap is subtracted so the arcs don't touch.
- The SVG is rotated −90° so the first arc starts at 12 o'clock.
- **Centre label:** the total by default. Hovering or focusing a category (on the ring or in the legend) shows its % and name, and fades the other arcs.
- Arc lengths and positions ease with a CSS transition when the numbers change, for example after a delete.
- **Accessibility:** the SVG has `role="img"` and an `aria-label` listing every category's %, and the legend repeats the numbers as text.

**Why not Chart.js?** The brief lists it as optional ("a library like Chart.js or a simple CSS progress bar"). A hand-drawn SVG donut is about 60 lines, adds no dependency, matches the app's colours exactly, and is easy to explain.

### 6.10 The confirmation pop-up (`ConfirmDelete.tsx`)

- It is an **accessible modal**:
  - `role="alertdialog"` and `aria-modal="true"`;
  - labelled by its title and described by its body text.
- Focus starts on **Cancel**, so pressing Enter by accident never deletes.
- **Focus trap:** pressing Tab on the last button jumps to the first, and Shift+Tab on the first jumps to the last.
- **Escape** or clicking the dark backdrop cancels.
- Page scrolling is locked while it is open.
- On cancel, focus returns to the trash button that opened the dialog.
- It shows exactly what will be deleted (name, category, time, amount).

---

## 7. UI and animation

### 7.1 Layout: a navbar with three sections

The page is **one page with a navbar**, not three stacked panels. Only one section is on screen at a time:

| Tab | Shows |
|---|---|
| **Overview** | Big rolling total, category band, ranked category list, the 2 latest expenses with "See all". It fits one screen without scrolling. When empty: an "Add your first expense" button |
| **Add expense** | The form. After each add: a confirmation "Added X ₹Y" with a "View expenses" shortcut |
| **Expenses** | The "Spending split" donut chart (% per category), then the full list grouped by day, 5 per page, with delete |

How it works (`NavBar.tsx` + `Tracker.tsx`):
- `Tracker` stores the open section in state (`active`). Clicking a tab calls `openSection(id)`.
- The tabs follow the **WAI-ARIA tabs pattern**:
  - `role="tablist"`, `role="tab"` with `aria-selected`, and `role="tabpanel"` linked by `aria-controls` / `aria-labelledby`;
  - **← / →** move between tabs, and **Home / End** jump to the ends.
- The **active tab is one raised key that slides** to the tab you pick (Motion `layoutId="nav-active"`).
- Section change: `AnimatePresence mode="wait"`. The old section fades out, then the new one fades in with a 6px lift (0.18s).
- The navbar always shows the **running total** ("Spent ₹…") and an **entry-count badge** on the Expenses tab, so feedback is visible from any section.
- **Phones:** the same single tab list is moved by CSS (`fixed bottom-0`, then `sm:static`) into a bottom tab bar within thumb reach. There is only one copy in the HTML, so ids never repeat.
- Light theme only: there is no dark mode, whatever the system setting is (`color-scheme: light`).

### 7.2 Look and classes (`globals.css`)

**Palette:**

| Role | Colour |
|---|---|
| Page | beige `#f4eee3` |
| Cards | cream `#fbf8f1` |
| Quiet fills | `#f1eadc` |
| Text | warm dark brown `#2b2620` |
| Hairlines | `#e6ddcc` |

Colour otherwise appears only as the category note colours.

| Class | Used for | How |
|---|---|---|
| `.card` | The panels, the top bar, the dialog | Cream fill, 1px hairline border, a very soft shadow |
| `.field` | Text inputs | Light fill + border; darker border and a soft ring on focus; red when invalid |
| `.btn` | Secondary buttons, category chips, pagination, the delete icon | Outlined; the fill tints on hover |
| `.btn-primary` / `.btn-danger` | "Add expense" / "Delete" | Solid dark brown / solid red |
| `.is-current` | Selected category, current page | Filled dark with cream text |
| `.track`, `.tint` | Bar troughs, the latest list, note boxes | Flat quiet fill |
| `.divider` | Row separators | 1px bottom border |
| `.neu-tray` + `.neu-raised` | **Only the navbar tabs** | The one neumorphic detail: an inset tray, with a raised key on the active tab |

Neumorphism is deliberately limited to the navbar. Everywhere else it made the screen busy, so those areas are flat.

### 7.3 Size

`html { font-size: 90% }` in `globals.css`. Every size in the app is in `rem`, which is relative to that root size, so this one line scales the whole UI. At 100% browser zoom it looks the way it used to at 90%. It is a percentage (not `px`), so a user who sets a larger default font in their browser still gets it.

### 7.4 Fonts

- **Anek Latin**: all text, including the "Kharcha" name, in its normal width.
- **Manrope**: **every number** (the `.num` utility). It uses tabular figures, so amounts line up in columns.
- Both are **self-hosted** with `@fontsource-variable/*` packages, imported at the top of `layout.tsx`. We first used `next/font/google`, which downloads the fonts when the dev server starts. On a network hiccup it silently falls back to Arial, which happened once. Bundling the files removes that dependency.
- Each package includes the `latin-ext` subset, because that is where the **₹ symbol** lives. Without it, the ₹ would come from a different font.

### 7.5 Animations (minimal, and off for "reduce motion")

| Where | Animation |
|---|---|
| Navbar | The raised key slides to the selected tab |
| Switching sections | Short fade with a 6px lift (0.18s) |
| List | Added rows fade and expand; deleted rows fade and collapse (0.28s) |
| Pagination | Short cross-fade between pages (0.15s) |
| Dialog | Backdrop and dialog fade in, the dialog from 98% scale (0.18s) |
| Totals, bars and donut | Total digits roll, category bars and donut arcs ease, **only when a value changes**; hovering a category highlights it in the donut |
| Add confirmation | The "Added X" card fades in |
| Buttons and fields | Colour and border transitions only, no movement |

`<MotionConfig reducedMotion="user">` in `Tracker.tsx` turns off movement for users who enable "reduce motion" in their OS. The CSS transitions are disabled in a `prefers-reduced-motion` block too.

### 7.6 Accessibility summary

- Real `<label>`s for every input.
- Errors are linked with `aria-describedby` and fields marked `aria-invalid`.
- The category is a real radio group, so arrow keys work.
- The delete buttons say what they delete, e.g. "Delete Chai and samosa, ₹45.00".
- The pagination is a `<nav>` with `aria-current`.
- Live announcements cover the total and deletions.
- Every control has a visible focus ring.
- Borders are added in Windows high-contrast mode (`forced-colors`).

---

## 8. Questions you may be asked, with answers

### About the requirements

**Q1. Where is the data stored, and why does it survive a reload?**
In the browser's `localStorage`, under the key `kharcha:expenses:v1`, as a JSON string. `localStorage` is permanent storage for each website: it stays until the user or the code clears it. On load, `store.ts` reads it back with `JSON.parse`.

**Q2. `localStorage` only stores strings. How do you store an array of objects?**
`JSON.stringify(list)` when saving and `JSON.parse(raw)` when reading (`commit()` and `read()` in `store.ts`).

**Q3. How is the total calculated? Is it stored?**
It is not stored. It is derived on every render with `reduce` over all expenses (`Tracker.tsx`). Storing it separately could let it drift out of sync with the list.

**Q4. How do the inputs clear after submit?**
They are **controlled inputs**: their value comes from React state (`name`, `amount`). After a successful add, `submit()` sets both to `""`, so the inputs empty. Focus goes back to the name field for quick next entry. The category is kept on purpose, because the next expense is often the same type.

**Q5. What happens if the user submits an empty or wrong amount?**
`parseAmount` returns an error message. The form shows it under the field with a red border and focuses that field. Nothing is saved.

**Q6. How does delete also remove the item from `localStorage`?**
`removeExpense(id)` filters the item out and calls `commit()`, which writes the new list to `localStorage`. The same function updates the screen and the storage, so they can never disagree.

**Q7. Why a confirmation pop-up?**
Deleting cannot be undone, and the trash button sits next to the amount, so a misclick is easy. The dialog shows exactly which expense will go, and defaults to Cancel.

### About the logic

**Q8. Why store money in paise?**
Floating-point maths: `0.1 + 0.2 = 0.30000000000000004`. Whole numbers are exact, so totals are always exact. We divide by 100 only for display.

**Q9. How do you create unique ids?**
`crypto.randomUUID()`, built into browsers, gives a random 128-bit id like `3f2a9c1e-…`. Ids are needed so React can track each row (`key`), and so delete removes exactly one item even if two have the same name and amount.

**Q10. Why does every list item need a `key`?**
React uses keys to match items between renders. With stable ids, React (and Motion) know which row was added or removed, so the right row animates. Using the array index would break when items are removed.

**Q11. How does pagination handle deleting the last item on the last page?**
The shown page is calculated as `Math.min(requestedPage, totalPages)`. When the last page disappears, the shown page automatically becomes the new last page.

**Q12. Why does adding an expense go to page 1?**
The list is newest first, so the new expense is always the first row of page 1. Jumping there shows the user their entry was added.

**Q13. A day's expenses are split across two pages. Is the day subtotal wrong?**
No. `groupByDay(items, all)` groups only the page's items, but takes each day's total from the **full** list.

**Q14. What if `localStorage` has corrupted or edited data?**
`read()` wraps `JSON.parse` in `try/catch` (corrupt → empty list). It also runs every item through `isExpense()`, which checks every field's type, so a malformed entry is dropped instead of crashing the app.

**Q15. What if `localStorage` is full or blocked?**
`setItem` throws. `commit()` catches it and sets `saved: false`, and the list shows a red warning that the last change won't survive a reload. The app keeps working in memory.

**Q16. What is `useSyncExternalStore` and why use it?**
A React hook for reading data that lives outside React (here, `localStorage`). You give it:
1. `subscribe`: how React hears about changes;
2. `getSnapshot`: how it reads the current value;
3. the value to use on the server.

It avoids the "flash of empty data then load" problem of the `useEffect` approach, it is safe with server rendering, and it lets us sync tabs.

**Q17. How do two open tabs stay in sync?**
The browser fires a `storage` event in **other** tabs when `localStorage` changes. `onStorage()` listens for it, re-reads the data and notifies React.

**Q18. Why is there a "hydrated" check?**
Next.js renders HTML on the server, where `localStorage` doesn't exist. The browser's first render must match that HTML. `useHydrated()` returns `false` on the server and during hydration, and `true` afterwards, so data-dependent parts render only in the browser.

**Q19. Why `"use client"` at the top of some files?**
In the Next.js App Router, components are server components by default. Anything using state, effects, event handlers or browser APIs must be a client component.

**Q20. Where is state kept, and why there?**

| State | Where it lives | Why |
|---|---|---|
| The expense list | `store.ts` (the single source of truth) | Shared by everything and saved to storage |
| Which section is open; which expense is waiting for delete confirmation; the current page; the last added expense | `Tracker.tsx` | Used by several children, so it is lifted to the common parent |
| The form's field values and errors | `ExpenseForm.tsx` | Only the form needs them |

**Q21. How do category percentages work?**
`share = categoryTotal / grandTotal`, shown as `Math.round(share × 100)%`. Very small but non-zero shares show "<1%".

**Q22. How is Indian number formatting (1,23,456) done?**
`Intl.NumberFormat("en-IN")`, the browser's built-in formatter, which knows the lakh/crore grouping.

### About the UI

**Q23. How does the rolling number animation work?**
Each digit is a hidden window over a 0–9 strip. When the total changes, the strip eases up by the digit value. Columns are keyed from the right so existing digits roll rather than re-appear (§6.7).

**Q24. What is neumorphism and where is it used?**
"Soft UI": an element looks pressed into, or raised out of, the same surface. It uses a light shadow on one side and a dark shadow on the other (`inset` for pressed).

Here it is used **only for the navbar tabs**: the tray is pressed in (`.neu-tray`), and the active tab is a raised key (`.neu-raised`) that slides between tabs. Everything else is flat cream cards, on purpose, so the page stays calm.

**Q25. Is there a dark mode?**
No. The project is light theme only, a design decision. All colours are CSS variables in one `:root` block, so adding a dark theme later would mean adding one override block, without touching components.

**Q26. Why is the delete button always visible?**
Hiding it until hover made it invisible on touch screens and hard to find. It is now a raised button with readable contrast, and it turns red on hover.

**Q27. How does the active navbar tab slide?**
Motion's `layoutId`. One raised element with `layoutId="nav-active"` is rendered only inside the selected tab. When the selection changes, Motion animates it from the old tab's position to the new one.

**Q28. Are animations bad for accessibility?**
They respect the OS "reduce motion" setting (`MotionConfig reducedMotion="user"` plus the CSS media query), so users who are sensitive to motion get none.

**Q29. Is it responsive?**
Yes. It is a single column with a max width:
- on phones the navbar tabs become a bottom tab bar;
- on phones the form fields stack and the buttons go full width;
- the category list goes from 2 columns to 1;
- the big total shrinks its font size to always fit (a container-query formula in `RollingTotal.tsx`).

### About decisions and limits

**Q30. Why not use a database?**
The brief is a browser-only tracker focused on state and browser storage. A backend would add login, an API and hosting with no requirement asking for them.

**Q31. Limits of `localStorage`?**
- About 5 MB per site.
- Only strings.
- Synchronous, so it slightly blocks the page while reading or writing.
- Per browser and per device: no sync between phone and laptop.
- Cleared if the user clears site data.

For this app's size (small JSON objects), that is fine: thousands of expenses fit easily.

**Q32. How would you add editing or filters?**
- **Edit:** add `updateExpense(id, changes)` in `store.ts` (map over the list, replace the matching item, then `commit`). Reuse the form in an edit mode.
- **Filter by category or month:** filter the array before `pageSlice`. Nothing else changes, because the total and grouping are derived.

**Q33. How would you test it?**
- **Unit tests:** `parseAmount`, `groupByDay`, `totalsByCategory` and `pageNumbers` are pure functions, so they can be tested with plain inputs and outputs.
- **End-to-end:** a browser test (e.g. Playwright). During development it was checked with a scripted browser:
  - empty submit shows errors;
  - inputs clear;
  - data saves and survives a reload;
  - the delete button is visible;
  - the dialog cancels, closes on Escape and confirms;
  - pages show 5, 5 and 2 items;
  - an emptied last page falls back to the previous page;
  - adding jumps to page 1;
  - there are no console errors.

**Q34. What does `noValidate` on the form do?**
It turns off the browser's built-in validation bubbles so our own consistent messages show instead.

**Q35. Why does pressing Enter submit?**
The inputs are inside a `<form>` with a `type="submit"` button. Enter in any field submits the form, and `onSubmit` calls `event.preventDefault()` so the page does not reload.


**Q36. Why a navbar with sections instead of everything on one long page?**
Each section has one job: see the summary, add, or manage the list. Showing one at a time keeps the screen calm. The running total and the entry count stay in the navbar, so you never lose that information.

**Q37. How do the navbar sections work without separate pages or routes?**
- It is client-side state, not routing. `Tracker` keeps `active` (which section) in `useState` and renders only that section.
- The tabs follow the ARIA tabs pattern, so screen readers announce "tab, selected", and arrow keys work.
- No page reload happens, so switching is instant and animated.

**Q38. Why so few animations?**
Animation is used only where it explains a change: a row appearing or disappearing, which tab is active, a dialog opening. Decorative motion (entrance effects, bounces, shakes) was removed to keep the app quiet and fast. Everything respects the OS "reduce motion" setting.


**Q39. How is the percentage chart drawn without a chart library?**
It is an SVG donut where each category is a circle stroke. `stroke-dasharray` sets how much of the ring an arc covers (its share × circumference). `stroke-dashoffset` starts it where the previous arc ended (§6.9).

**Q40. How does the percentage stay correct after adding or deleting?**
Nothing is stored. `totalsByCategory()` recomputes every category's share from the current list on each render, and the chart, the Overview band and the legend all read from that one result.

**Q41. How did you make the app look smaller ("90%") by default?**
The root font size is 90%, and every size is in `rem`, so everything scales together (§7.3).

---

## 9. Run, build and check

```bash
npm install
npm run dev      # development server at http://localhost:3000
npm run build    # production build (also type-checks)
npm run start    # serve the production build
npm run lint     # ESLint
```

To see the saved data: open DevTools → **Application** → **Local Storage** → `http://localhost:3000` → key `kharcha:expenses:v1`. Delete the key to reset the app.
