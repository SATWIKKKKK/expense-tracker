"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatPaise, formatRupees } from "@/lib/expenses";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const roll = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** Advance width of each digit, in em, as the figure's own font renders it. */
type DigitWidths = number[] | null;

/**
 * The figures are proportional, so a "1" is narrower than a "0". Each column
 * animates its width to the digit it is rolling to; tabular cells would leave
 * a hole beside every 1.
 */
function useDigitWidths() {
  const ref = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<DigitWidths>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fires on mount, when the web font swaps in, and when the size changes.
    const observer = new ResizeObserver(() => {
      const size = parseFloat(getComputedStyle(el).fontSize);
      const next = [...el.children].map((c) => (c as HTMLElement).getBoundingClientRect().width / size);
      setWidths((prev) => (prev && prev.every((w, i) => Math.abs(w - next[i]) < 0.001) ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const probe = (
    // Zero-size and clipped, so the probe never widens the page.
    <span aria-hidden className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden">
      <span ref={ref} className="inline-flex whitespace-nowrap">
      {DIGITS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  );
  return { widths, probe };
}

function DigitColumn({ digit, widths }: { digit: number; widths: DigitWidths }) {
  return (
    <span
      className="digit-column relative inline-block h-[1em] overflow-hidden align-top"
      style={widths ? { width: `${widths[digit]}em` } : { fontVariantNumeric: "tabular-nums" }}
    >
      {/* Invisible copy holds the column open until widths are measured. */}
      <span className={widths ? "invisible absolute" : "invisible block h-[1em] leading-none"}>0</span>
      <motion.span
        className="absolute left-1/2 top-0 flex flex-col items-center"
        // Renders at its value; only a change rolls.
        initial={false}
        animate={{ x: "-50%", y: `${-digit}em` }}
        transition={roll}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * Columns are keyed by their distance from the right edge, so the units digit
 * stays the same element as the number grows, and only new leading columns
 * enter.
 */
function Figures({ text, widths }: { text: string; widths: DigitWidths }) {
  const chars = [...text];
  return (
    <AnimatePresence initial={false}>
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        const isDigit = ch >= "0" && ch <= "9";
        return (
          <motion.span
            key={`${fromRight}-${isDigit ? "d" : ch}`}
            className="inline-block overflow-hidden align-top"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ width: roll, opacity: { duration: 0.25 } }}
          >
            {isDigit ? (
              <DigitColumn digit={Number(ch)} widths={widths} />
            ) : (
              <span className="block h-[1em] leading-none">{ch}</span>
            )}
          </motion.span>
        );
      })}
    </AnimatePresence>
  );
}

export function RollingTotal({ paise }: { paise: number }) {
  const [whole, fraction] = formatPaise(paise).split(".");
  const main = useDigitWidths();
  const small = useDigitWidths();
  // Font size shrinks with the digit count so a lakh-sized total still fits
  // its panel; 0.6 and 1.1 approximate Manrope's figure advance plus the
  // symbol and paise.
  const size = `min(4.25rem, calc(100cqi / (${whole.length} * 0.6 + 1.1)))`;

  return (
    <div className="[container-type:inline-size]">
      <p className="sr-only" aria-live="polite">
        Total spent {formatRupees(paise)}
      </p>
      <p
        aria-hidden
        className="total-figure num relative flex items-start font-extrabold leading-none tracking-[-0.035em] text-ink transition-[font-size] duration-500 ease-out-expo"
        // Proportional figures: each column takes its own digit's width.
        style={{ fontSize: size, fontVariantNumeric: "proportional-nums" }}
      >
        {main.probe}
        <span className="mr-[0.06em] mt-[0.1em] text-[0.42em] font-bold text-ink-2">₹</span>
        <Figures text={whole} widths={main.widths} />
        <span className="relative ml-[0.03em] mt-[0.1em] flex text-[0.36em] font-bold text-ink-2">
          {small.probe}
          <span className="block h-[1em] leading-none">.</span>
          <Figures text={fraction} widths={small.widths} />
        </span>
      </p>
    </div>
  );
}
