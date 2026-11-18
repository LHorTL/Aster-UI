import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AfSrOnly, cn, useReducedMotion } from "../../primitives";

export interface AfNumberTickerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "prefix"> {
  /** 目标数值（默认 0）。 */
  value?: number;
  /** `Intl.NumberFormat` 格式化选项，如 `{ style: "currency", currency: "USD" }`。 */
  format?: Intl.NumberFormatOptions;
  /** 区域语言标识（如 `"en-US"`、`"zh-CN"`；默认跟随环境）。 */
  locale?: string;
  /** 单次滚动时长（毫秒，默认 900）。 */
  duration?: number;
  /** 首次进入视口后的启动延迟（毫秒，默认 0）。 */
  delay?: number;
  /** 是否在初次挂载时从 0 滚动到初始值（默认 true）。 */
  animateOnMount?: boolean;
  /** 前缀节点（不参与滚轮）。 */
  prefix?: ReactNode;
  /** 后缀节点（不参与滚轮）。 */
  suffix?: ReactNode;
}

type TickerPart = { key: string; digit: number } | { key: string; char: string };

/**
 * 按十进制位权分配稳定 key：整数位从小数点（或末尾）向左赋 `i0`（个位）、`i1`（十位）…，
 * 小数位向右赋 `f0`（十分位）、`f1`（百分位）…，使得 `9,999 → 10,000` 与 `12.5 → 12.50`
 * 时既有数位列保持身份平滑进位滚动，新增最高位从左侧滑入。
 */
function splitParts(
  value: number,
  locale?: string,
  format?: Intl.NumberFormatOptions,
): { text: string; parts: TickerPart[] } {
  if (!Number.isFinite(value)) {
    return { text: "–", parts: [{ key: "s-nan", char: "–" }] };
  }
  const formatter = new Intl.NumberFormat(locale, format);
  if (typeof formatter.formatToParts !== "function") {
    const fallbackText = formatter.format(value);
    const chars = Array.from(fallbackText);
    const out: TickerPart[] = [];
    let dIdx = 0;
    let sIdx = 0;
    for (let i = chars.length - 1; i >= 0; i--) {
      const ch = chars[i];
      if (ch >= "0" && ch <= "9") out.unshift({ key: `i${dIdx++}`, digit: ch.charCodeAt(0) - 48 });
      else out.unshift({ key: `s${sIdx++}`, char: ch });
    }
    return { text: fallbackText, parts: out };
  }

  const rawParts = formatter.formatToParts(value);
  const fullText = rawParts.map((p) => p.value).join("");
  const decPartIdx = rawParts.findIndex((p) => p.type === "decimal");
  const intEnd = decPartIdx === -1 ? rawParts.length : decPartIdx;

  const headParts: TickerPart[] = [];
  let intDigitIdx = 0;
  let groupIdx = 0;
  let headSymIdx = 0;
  for (let pIdx = intEnd - 1; pIdx >= 0; pIdx--) {
    const part = rawParts[pIdx];
    const chars = Array.from(part.value);
    for (let cIdx = chars.length - 1; cIdx >= 0; cIdx--) {
      const ch = chars[cIdx];
      if (part.type === "integer" && ch >= "0" && ch <= "9") {
        headParts.unshift({ key: `i${intDigitIdx++}`, digit: ch.charCodeAt(0) - 48 });
      } else if (part.type === "group") {
        headParts.unshift({ key: `g${groupIdx++}`, char: ch });
      } else {
        headParts.unshift({ key: `pre${headSymIdx++}`, char: ch });
      }
    }
  }

  const tailParts: TickerPart[] = [];
  let fracDigitIdx = 0;
  let tailSymIdx = 0;
  if (decPartIdx !== -1) {
    for (let pIdx = decPartIdx; pIdx < rawParts.length; pIdx++) {
      const part = rawParts[pIdx];
      const chars = Array.from(part.value);
      for (let cIdx = 0; cIdx < chars.length; cIdx++) {
        const ch = chars[cIdx];
        if (part.type === "decimal") {
          tailParts.push({ key: `dec${cIdx}`, char: ch });
        } else if (part.type === "fraction" && ch >= "0" && ch <= "9") {
          tailParts.push({ key: `f${fracDigitIdx++}`, digit: ch.charCodeAt(0) - 48 });
        } else if (ch >= "0" && ch <= "9") {
          tailParts.push({ key: `fd${fracDigitIdx++}`, digit: ch.charCodeAt(0) - 48 });
        } else {
          tailParts.push({ key: `post${tailSymIdx++}`, char: ch });
        }
      }
    }
  }

  return { text: fullText, parts: [...headParts, ...tailParts] };
}

const mod10 = (n: number) => ((n % 10) + 10) % 10;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** 11 格条带 `[0..9, 0]` 定位，使 `9 → 0` 跨圈无缝衔接。 */
function placeStack(el: HTMLElement, pos: number) {
  el.style.transform = `translateY(${(-mod10(pos) / 11) * 100}%)`;
}

type RollState = { pos: number; from: number; to: number };

const DIGITS_STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

/**
 * Number Ticker：里程表逐位滚动数字。
 * 数值变大时向上滚、数值变小时向下滚；首次进入视口从 0 滚入，货币符号与千分位保持静止。
 */
export function AfNumberTicker(props: AfNumberTickerProps = {}) {
  const {
    value = 0,
    format,
    locale,
    duration = 900,
    delay = 0,
    animateOnMount = true,
    prefix,
    suffix,
    className,
    style,
    ...rest
  } = props;

  const reduced = useReducedMotion();
  const fmtKey = JSON.stringify(format ?? {});
  const { text, parts } = useMemo(
    () => splitParts(value, locale, format),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, locale, fmtKey],
  );

  const rootRef = useRef<HTMLSpanElement>(null);
  const rollsRef = useRef(new Map<string, RollState>());
  const stacksRef = useRef(new Map<string, HTMLElement>());
  const prevValueRef = useRef(animateOnMount ? 0 : value);
  const upRef = useRef(true);
  const mountedRef = useRef(false);
  const initialMountSkippedRef = useRef(!animateOnMount);
  const enteringRef = useRef(new Set<string>());
  const seenKeysRef = useRef(new Set<string>());
  const [started, setStarted] = useState(!animateOnMount);

  const keysNow = new Set(
    parts.filter((p): p is { key: string; digit: number } => "digit" in p).map((p) => p.key),
  );
  for (const k of keysNow) {
    if (mountedRef.current && !seenKeysRef.current.has(k)) {
      enteringRef.current.add(k);
    }
  }
  for (const k of enteringRef.current) {
    if (!keysNow.has(k)) enteringRef.current.delete(k);
  }
  seenKeysRef.current = keysNow;

  useEffect(() => {
    mountedRef.current = true;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setStarted(true), delay);
      return () => window.clearTimeout(id);
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const id = window.setTimeout(() => setStarted(true), delay);
      return () => window.clearTimeout(id);
    }
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        timer = window.setTimeout(() => setStarted(true), delay);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const skipInitialRoll = initialMountSkippedRef.current;
    if (skipInitialRoll) {
      initialMountSkippedRef.current = false;
    }
    if (value !== prevValueRef.current) {
      upRef.current = value >= prevValueRef.current;
    }
    prevValueRef.current = value;

    const activeKeys = new Set<string>();
    for (const p of parts) {
      if (!("digit" in p)) continue;
      activeKeys.add(p.key);
      const roll = rollsRef.current.get(p.key) ?? (skipInitialRoll ? { pos: p.digit, from: p.digit, to: p.digit } : { pos: 0, from: 0, to: 0 });
      const delta = upRef.current ? mod10(p.digit - roll.pos) : -mod10(roll.pos - p.digit);
      roll.from = roll.pos;
      roll.to = roll.pos + delta;
      if (reduced || duration <= 0 || skipInitialRoll) {
        roll.pos = roll.from = roll.to;
      }
      rollsRef.current.set(p.key, roll);
    }
    for (const k of rollsRef.current.keys()) {
      if (!activeKeys.has(k)) rollsRef.current.delete(k);
    }

    const applyAll = () => {
      for (const [k, r] of rollsRef.current) {
        const el = stacksRef.current.get(k);
        if (el) placeStack(el, r.pos);
      }
    };

    if (reduced || duration <= 0 || skipInitialRoll) {
      applyAll();
      return;
    }

    let rafId = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = easeOutQuart(t);
      for (const r of rollsRef.current.values()) {
        r.pos = t >= 1 ? mod10(r.to) : r.from + (r.to - r.from) * eased;
      }
      applyAll();
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [parts, started, value, duration, reduced]);

  return (
    <span
      {...rest}
      ref={rootRef}
      className={cn("af-mo-ticker", className)}
      style={style}
      aria-label={rest["aria-label"] ?? text}
    >
      <AfSrOnly live>{text}</AfSrOnly>
      {prefix !== undefined ? <span className="af-mo-ticker__affix" aria-hidden="true">{prefix}</span> : null}
      <span className="af-mo-ticker__digits" aria-hidden="true">
        {parts.map((part) =>
          "digit" in part ? (
            <span
              key={part.key}
              className="af-mo-ticker__col"
              data-enter={enteringRef.current.has(part.key) ? "" : undefined}
            >
              <span
                className="af-mo-ticker__reel"
                style={
                  !started && !reduced
                    ? { transform: "translateY(0%)" }
                    : { transform: `translateY(${(-mod10(rollsRef.current.get(part.key)?.pos ?? part.digit) / 11) * 100}%)` }
                }
                ref={(el) => {
                  if (el) {
                    stacksRef.current.set(part.key, el);
                    placeStack(el, started ? (rollsRef.current.get(part.key)?.pos ?? part.digit) : 0);
                  } else {
                    stacksRef.current.delete(part.key);
                  }
                }}
              >
                {DIGITS_STRIP.map((n, idx) => (
                  <span key={idx}>{n}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={part.key} className="af-mo-ticker__static">
              {part.char}
            </span>
          ),
        )}
      </span>
      {suffix !== undefined ? <span className="af-mo-ticker__affix" aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}
