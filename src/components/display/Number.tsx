import { forwardRef, useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { cn, useReducedMotion } from "../../primitives";

export type AfNumberProps = ComponentPropsWithoutRef<"span"> & {
  text: string;
};

type NumberPart =
  | { key: string; digit: number; staggerIdx: number }
  | { key: string; char: string };

function tokenizeByPlaceValue(text: string): NumberPart[] {
  const chars = Array.from(text);
  const dotIdx = chars.indexOf(".");
  const intEnd = dotIdx === -1 ? chars.length : dotIdx;

  const head: NumberPart[] = [];
  let intPlace = 0;
  let headStatic = 0;
  for (let i = intEnd - 1; i >= 0; i--) {
    const ch = chars[i];
    if (ch >= "0" && ch <= "9") {
      const place = intPlace++;
      head.unshift({ key: `i${place}`, digit: ch.charCodeAt(0) - 48, staggerIdx: place });
    } else {
      head.unshift({ key: `s${headStatic++}`, char: ch });
    }
  }

  const tail: NumberPart[] = [];
  let fracPlace = 0;
  let tailStatic = 0;
  if (dotIdx !== -1) {
    for (let i = dotIdx; i < chars.length; i++) {
      const ch = chars[i];
      if (i === dotIdx) {
        tail.push({ key: "dec", char: ch });
      } else if (ch >= "0" && ch <= "9") {
        const place = fracPlace++;
        tail.push({ key: `f${place}`, digit: ch.charCodeAt(0) - 48, staggerIdx: place });
      } else {
        tail.push({ key: `ts${tailStatic++}`, char: ch });
      }
    }
  }

  return [...head, ...tail];
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** 数字滚动：按十进制位权右对齐赋 key，每一位独立滚到新值，进位时既有位保持列身份。 */
export const AfNumber = forwardRef<HTMLSpanElement, AfNumberProps>(function AfNumber(
  { text, className, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setMounted(true);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const parts = useMemo(() => tokenizeByPlaceValue(text), [text]);

  return (
    <span ref={ref} className={cn("af-ticker", className)} aria-label={text} {...rest}>
      {parts.map((part) => {
        if ("char" in part) {
          return (
            <span key={part.key} className="af-ticker__static" aria-hidden="true">
              {part.char}
            </span>
          );
        }
        return (
          <span key={part.key} className="af-ticker__col" aria-hidden="true">
            <span
              className="af-ticker__reel"
              style={{
                transform: `translateY(-${(mounted || reduced ? part.digit : 0) * 10}%)`,
                transitionDelay: reduced ? undefined : `${Math.min(part.staggerIdx, 6) * 25}ms`,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
});
