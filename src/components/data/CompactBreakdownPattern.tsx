import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn, useIsomorphicLayoutEffect, useSlidingTabIndicator } from "../../primitives";
import { useTween, useTweens } from "../../ui-pro";
import { COMPACT_DATA, CompactPeriod, Demo, Note, compactTone, formatInt } from "../_shared/data";

export type CompactEntry = (typeof COMPACT_DATA)["30d"]["items"][number];
export type { CompactPeriod };

export interface AfCompactBreakdownPatternProps {
  /** Card title. */
  title?: ReactNode;
  /** Default subtitle below main figure. */
  caption?: ReactNode;
  /** Period breakdown map. */
  dataMap?: Record<CompactPeriod, { delta: number; items: CompactEntry[] }>;
  /** Period selector options. */
  periods?: { key: CompactPeriod; label: string }[];
  /** Default selected period. */
  defaultPeriod?: CompactPeriod;
  /** Value formatter. */
  format?: (value: number) => string;
  /** Period change callback. */
  onPeriodChange?: (period: CompactPeriod) => void;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

const DEFAULT_PERIODS: { key: CompactPeriod; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

const formatDollarInt = (value: number) => `$${formatInt(value)}`;

/**
 * Compact Breakdown (Revenue by channel 1:1): sliding period pill, 24px figure + 20px delta badge,
 * 6px stacked bar, and FLIP rank-gliding channel rows.
 */
function CompactBreakdownDemo({
  title = "Revenue by channel",
  caption = "Total revenue",
  dataMap = COMPACT_DATA,
  periods = DEFAULT_PERIODS,
  defaultPeriod = "7d",
  format = formatDollarInt,
  onPeriodChange,
  showNote = false,
  className,
  style,
}: AfCompactBreakdownPatternProps = {}) {
  const [period, setPeriod] = useState<CompactPeriod>(defaultPeriod);
  const [focusLabel, setFocusLabel] = useState<string | null>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const indicator = useSlidingTabIndicator(switchRef, '[aria-checked="true"]', period);

  /** 建立稳定的条目顺序与固定色板，确保跨周期名次互换时同源颜色与插值槽位稳定对应。 */
  const canonicalLabels = useMemo(() => {
    const seen: string[] = [];
    for (const p of periods) {
      for (const item of dataMap[p.key]?.items ?? []) {
        if (!seen.includes(item.label)) seen.push(item.label);
      }
    }
    return seen;
  }, [dataMap, periods]);

  const data = dataMap[period] ?? dataMap["30d"];
  const targetByLabel = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.items) map.set(item.label, item.value);
    return map;
  }, [data]);

  const canonicalTargets = canonicalLabels.map((label) => targetByLabel.get(label) ?? 0);
  const rawTotal = canonicalTargets.reduce((sum, value) => sum + value, 0);
  const tweenedCanonical = useTweens(canonicalTargets, 500);

  /** 按当前周期目标值降序排列行，触发真实名次交换。 */
  const sortedLabels = useMemo(() => {
    return [...canonicalLabels]
      .filter((label) => targetByLabel.has(label))
      .sort((a, b) => (targetByLabel.get(b) ?? 0) - (targetByLabel.get(a) ?? 0));
  }, [canonicalLabels, targetByLabel]);

  const orderKey = sortedLabels.join("|");
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const prevTopsRef = useRef(new Map<string, number>());

  /** FLIP 行位移动画：名次变化时测量旧 top 与新 top 差值并平滑归位。 */
  useIsomorphicLayoutEffect(() => {
    const nextTops = new Map<string, number>();
    rowRefs.current.forEach((node, label) => {
      nextTops.set(label, node.offsetTop);
    });
    if (prevTopsRef.current.size > 0) {
      const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        nextTops.forEach((nextTop, label) => {
          const prevTop = prevTopsRef.current.get(label);
          const node = rowRefs.current.get(label);
          if (prevTop !== undefined && prevTop !== nextTop && node) {
            const deltaY = prevTop - nextTop;
            node.style.transition = "none";
            node.style.transform = `translateY(${deltaY}px)`;
            node.getBoundingClientRect();
            node.style.transition = "transform 420ms var(--af-ease), background-color var(--af-dt-hover) ease-out, opacity 160ms ease";
            node.style.transform = "";
          }
        });
      }
    }
    prevTopsRef.current = nextTops;
  }, [orderKey]);

  const focusCanonicalIdx = focusLabel ? canonicalLabels.indexOf(focusLabel) : -1;
  const rawBig = focusCanonicalIdx >= 0 ? (canonicalTargets[focusCanonicalIdx] ?? 0) : rawTotal;
  const bigTween = useTween(rawBig, focusCanonicalIdx >= 0 ? 260 : 500);
  const total = tweenedCanonical.reduce((sum, value) => sum + value, 0);
  const largest = sortedLabels[0] ?? "";

  return (
    <Demo>
      <section className={cn("af-dt-cb", className)} style={style} aria-label="Compact breakdown">
        <div className="af-dt-cb__body">
          <header className="af-dt-cb__head">
            <h3 className="af-dt-cb__title">{title}</h3>
            <div ref={switchRef} className="af-dt-cb__switch" role="radiogroup" aria-label="Time range">
              {indicator ? (
                <span
                  className="af-dt-cb__pill"
                  aria-hidden
                  data-ready={indicator.ready || undefined}
                  style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
                />
              ) : null}
              {periods.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={period === item.key}
                  className="af-dt-cb__option"
                  onClick={() => {
                    setPeriod(item.key);
                    onPeriodChange?.(item.key);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>
          <div className="af-dt-cb__figure">
            <span className="af-dt-cb__big">{format(bigTween)}</span>
            <span className="af-dt-cb__delta" data-up={data.delta >= 0 ? "" : undefined}>
              {data.delta >= 0 ? "↑" : "↓"} {Math.abs(data.delta).toFixed(1)}%
            </span>
          </div>
          <p className="af-dt-cb__caption">{focusLabel ?? caption}</p>
          <div
            className="af-dt-cb__bar"
            data-active={focusLabel !== null || undefined}
            role="img"
            aria-label={sortedLabels.map((label) => `${label} ${format(targetByLabel.get(label) ?? 0)}`).join(", ")}
          >
            {canonicalLabels.map((label, cIndex) => {
              if (!targetByLabel.has(label)) return null;
              const value = tweenedCanonical[cIndex] ?? 0;
              return (
                <span
                  key={label}
                  className="af-dt-cb__seg"
                  data-active={focusLabel === label || undefined}
                  style={{ flexGrow: Math.max(value, 1), background: compactTone(cIndex, canonicalLabels.length) }}
                />
              );
            })}
          </div>
          <div className="af-dt-cb__list">
            {sortedLabels.map((label) => {
              const cIndex = canonicalLabels.indexOf(label);
              const val = tweenedCanonical[cIndex] ?? 0;
              return (
                <div
                  key={label}
                  ref={(node) => {
                    if (node) rowRefs.current.set(label, node);
                    else rowRefs.current.delete(label);
                  }}
                  className="af-dt-cb__item"
                  data-active={focusLabel === label || undefined}
                  onPointerEnter={() => setFocusLabel(label)}
                  onPointerLeave={() => setFocusLabel(null)}
                  onFocus={() => setFocusLabel(label)}
                  onBlur={() => setFocusLabel(null)}
                  tabIndex={0}
                >
                  <i className="af-dt-cb__swatch" style={{ background: compactTone(cIndex, canonicalLabels.length) }} aria-hidden />
                  <span className="af-dt-cb__label">{label}</span>
                  <span className="af-dt-cb__value">{format(val)}</span>
                  <span className="af-dt-cb__share">{total ? Math.round((val / total) * 100) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>
        <footer className="af-dt-cb__foot">{focusLabel ?? `Largest: ${largest}`}</footer>
      </section>
      {showNote ? <Note>360px compact breakdown card: sliding period pill, 24px tweened total, and FLIP rank-gliding channel rows.</Note> : null}
    </Demo>
  );
}

export { CompactBreakdownDemo as AfCompactBreakdownPattern, CompactBreakdownDemo as AfCompactBreakdown };
export type { AfCompactBreakdownPatternProps as AfCompactBreakdownProps };
