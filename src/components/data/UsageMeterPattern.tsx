import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTween, useTweens } from "../../ui-pro";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { Demo, Note, USAGE_PERIODS, type UsagePeriod, formatInt } from "../_shared/data";

export interface AfUsageMeterPatternProps {
  /** Workspace or product name. */
  title?: string;
  /** Plan tier label. */
  planName?: string;
  /** Usage period definitions. */
  periods?: typeof USAGE_PERIODS;
  /** Default selected period. */
  defaultPeriod?: UsagePeriod;
  /** Auto-cycle periods for showcase playback (default false). */
  autoPlay?: boolean;
  /** Footer upgrade/credits button callback. */
  onActionClick?: (period: UsagePeriod) => void;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

/**
 * Usage Meter (1:1 affectui.com): smoothly interpolates credits, category breakdown, and daily bars
 * across periods with bidirectional bar/legend hover and keyboard day-by-day inspection.
 */
function UsageMeterDemo({
  title = "Acme AI",
  planName = "Pro plan",
  periods = USAGE_PERIODS,
  defaultPeriod = "month",
  autoPlay: defaultAutoPlay = false,
  onActionClick,
  showNote = false,
  className,
  style,
}: AfUsageMeterPatternProps = {}) {
  const [period, setPeriod] = useState<UsagePeriod>(defaultPeriod);
  const data = periods.find((item) => item.key === period) ?? periods[0];
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activePart, setActivePart] = useState<number | null>(null);
  const [tipX, setTipX] = useState(50);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(defaultAutoPlay);
  const autoIndex = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);

  const used = useTween(data.used, 500);
  const percent = useTween((data.used / data.total) * 100, 500);
  const avg = useTween(data.avg, 500);
  const categoryValues = useTweens(
    data.categories.map((item) => item.value),
    500,
  );
  const seatValue = useTween(data.seats.used, 500);
  const storageValue = useTween(data.storage.used, 500);
  const projectValue = useTween(data.projects.used, 500);

  const selectPeriod = (next: UsagePeriod) => {
    setAutoPlay(false);
    setPeriod(next);
  };

  useIsomorphicLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const sync = () => setMeasuredHeight(el.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [period, data.categories.length]);

  useIsomorphicLayoutEffect(() => {
    const el = optionRefs.current[period];
    if (el) setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  }, [period, data.label]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = optionRefs.current[period];
      if (el) setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    const timer = window.setTimeout(measure, 30);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [period]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(() => {
      autoIndex.current = (autoIndex.current + 1) % periods.length;
      setPeriod(periods[autoIndex.current].key);
    }, 2800);
    return () => window.clearInterval(id);
  }, [autoPlay, periods]);

  useEffect(() => {
    setActivePart(null);
    setActiveDay(null);
  }, [period]);

  const segments = data.categories.map((category, index) => ({
    ...category,
    color: `var(--af-data-${index + 1})`,
    width: (category.value / data.total) * 100,
    share: (category.value / data.used) * 100,
  }));
  const ratioTotal = data.used / Math.max(data.total, 1);
  const state = data.limit || ratioTotal >= 1 ? "limit" : ratioTotal >= 0.8 ? "warn" : "ok";
  const active = activePart !== null ? segments[activePart] : null;
  const dailyScale = data.used / Math.max(1, data.days.reduce((sum, day) => sum + (day.future ? 0 : day.height), 0));
  const dayValue = (index: number) => Math.max(1, Math.round(data.days[index].height * dailyScale));
  const dayLabel = (index: number) => {
    const day = data.key === "7d" ? index + 17 : index + 1;
    return `${data.key === "last" ? "Sep" : "Oct"} ${day}`;
  };

  const activateAt = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    let acc = 0;
    let index: number | null = null;
    for (let itemIndex = 0; itemIndex < segments.length; itemIndex += 1) {
      acc += (segments[itemIndex].width / 100) * rect.width;
      if (x <= acc) {
        index = itemIndex;
        break;
      }
    }
    if (index === null) {
      setActivePart(null);
      return;
    }
    setActivePart(index);
    setTipX((x / rect.width) * 100);
  };

  const moveActive = (step: number) => {
    const next = activePart === null ? (step > 0 ? 0 : segments.length - 1) : (activePart + step + segments.length) % segments.length;
    setActivePart(next);
    const before = segments.slice(0, next).reduce((sum, item) => sum + item.width, 0);
    setTipX(before + segments[next].width / 2);
  };

  const activateDay = (clientX: number) => {
    const spark = sparkRef.current;
    if (!spark) return;
    const rect = spark.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setActiveDay(Math.min(data.days.length - 1, Math.max(0, Math.floor(ratio * data.days.length))));
  };

  return (
    <Demo>
      <section
        className={cn("af-dt-um", className)}
        style={style}
        data-state={state}
        aria-label="Usage meter"
        onPointerDown={() => setAutoPlay(false)}
        onKeyDown={() => setAutoPlay(false)}
      >
        <div className="af-dt-um__card" style={{ height: measuredHeight ?? data.height }}>
          <div ref={innerRef} className="af-dt-um__inner">
            <header className="af-dt-um__head">
              <div className="af-dt-um__heading">
                <h3 className="af-dt-um__title">{title}</h3>
                <p className="af-dt-um__sub">
                  {planName}
                  <span className="af-dt-um__sep">·</span>
                  {data.sub.replace(/^.*·\s*/, "")}
                </p>
              </div>
              <div
                className="af-dt-um__switch"
                role="radiogroup"
                aria-label="Billing period"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const index = periods.findIndex((item) => item.key === period);
                  const next = periods[(index + (event.key === "ArrowRight" ? 1 : -1) + periods.length) % periods.length];
                  selectPeriod(next.key);
                  optionRefs.current[next.key]?.focus();
                }}
              >
                {pill ? (
                  <span
                    className="af-dt-um__pill"
                    data-ready={mounted || undefined}
                    aria-hidden
                    style={{ width: pill.width, height: pill.height, transform: `translate(${pill.left}px, ${pill.top}px)` }}
                  />
                ) : null}
                {periods.map((item) => (
                  <button
                    key={item.key}
                    ref={(node) => {
                      optionRefs.current[item.key] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={item.key === period}
                    tabIndex={item.key === period ? 0 : -1}
                    className="af-dt-um__option"
                    onClick={() => selectPeriod(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="af-dt-um__figure">
              <p className="af-dt-um__amount">
                <span className="af-dt-um__big">{formatInt(used)}</span>
                <span className="af-dt-um__of">of {formatInt(data.total)} credits</span>
              </p>
              <span className="af-dt-um__pct" data-state={state}>
                {state !== "ok" ? <span className="af-dt-um__dot" aria-hidden /> : null}
                {Math.round(percent)}%
              </span>
            </div>

            <div
              className="af-dt-um__bar"
              ref={barRef}
              data-active={activePart !== null || undefined}
              tabIndex={0}
              role="group"
              aria-label={`${formatInt(data.used)} of ${formatInt(data.total)} credits used, use arrow keys to inspect categories`}
              onPointerMove={(event) => activateAt(event.clientX)}
              onPointerLeave={() => setActivePart(null)}
              onBlur={() => setActivePart(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveActive(1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveActive(-1);
                } else if (event.key === "Escape") {
                  setActivePart(null);
                }
              }}
            >
              <div className="af-dt-um__track">
                {segments.map((segment, index) => (
                  <span
                    key={segment.label}
                    className="af-dt-um__seg"
                    data-active={activePart === index || undefined}
                    style={{ width: `${segment.width}%`, background: segment.color }}
                  />
                ))}
              </div>
              {active ? (
                <span className="af-dt-um__tip" data-open style={{ left: `clamp(80px, ${tipX}%, calc(100% - 80px))` }}>
                  <span className="af-dt-um__tip-label">
                    <i style={{ background: active.color }} aria-hidden />
                    {active.label}
                  </span>
                  <span className="af-dt-um__tip-value">
                    <b>{formatInt(active.value)}</b> credits · {Math.round(active.share)}%
                  </span>
                </span>
              ) : null}
            </div>

            <ul className="af-dt-um__legend" aria-label="Usage by category" data-active={activePart !== null || undefined}>
              {segments.map((segment, index) => (
                <li key={segment.label} className="af-dt-um__row">
                  <div
                    className="af-dt-um__item"
                    data-active={activePart === index || undefined}
                    onPointerEnter={() => {
                      setActivePart(index);
                      const before = segments.slice(0, index).reduce((sum, item) => sum + item.width, 0);
                      setTipX(before + segment.width / 2);
                    }}
                    onPointerLeave={() => setActivePart(null)}
                  >
                    <span className="af-dt-um__swatch" style={{ background: segment.color }} aria-hidden />
                    <span className="af-dt-um__label">{segment.label}</span>
                    <span className="af-dt-um__value">{formatInt(categoryValues[index] ?? segment.value)}</span>
                    <span className="af-dt-um__share">{Math.round(segment.share)}%</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="af-dt-um__daily">
              <div className="af-dt-um__daily-head">
                <span>Per day</span>
                <span className="af-dt-um__daily-read" data-active={activeDay !== null || undefined}>
                  {activeDay !== null
                    ? data.days[activeDay].future
                      ? `${dayLabel(activeDay)} · Upcoming`
                      : `${dayLabel(activeDay)} · ${formatInt(dayValue(activeDay))} credits`
                    : (
                        <>
                          Avg <b>{Math.round(avg)}</b> / day
                        </>
                      )}
                </span>
              </div>
              <div
                className="af-dt-um__spark"
                data-few={data.days.length <= 7 || undefined}
                data-hover={activeDay !== null || undefined}
                ref={sparkRef}
                tabIndex={0}
                role="img"
                aria-label={`${title} daily usage, average ${data.avg} per day, use arrow keys to inspect`}
                onPointerMove={(event) => activateDay(event.clientX)}
                onPointerLeave={() => setActiveDay(null)}
                onBlur={() => setActiveDay(null)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveDay((day) => (day === null ? 0 : Math.min(data.days.length - 1, day + 1)));
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveDay((day) => (day === null ? 0 : Math.max(0, day - 1)));
                  } else if (event.key === "Escape") {
                    setActiveDay(null);
                  }
                }}
              >
                {data.days.map((day, index) => (
                  <span
                    key={`${data.key}-${index}`}
                    className="af-dt-um__day"
                    data-future={day.future || undefined}
                    data-active={activeDay === index || undefined}
                    style={{ "--i": index } as CSSProperties}
                  >
                    <span style={{ height: day.future ? 2 : `${day.height}%` }} />
                  </span>
                ))}
              </div>
            </div>

            <ul className="af-dt-um__limits" aria-label="Plan limits">
              {[
                { label: "Seats", value: seatValue, limit: data.seats.limit, used: data.seats.used, format: (value: number) => formatInt(value), unit: "" },
                { label: "Storage", value: storageValue, limit: data.storage.limit, used: data.storage.used, format: (value: number) => value.toFixed(1), unit: " GB" },
                { label: "Projects", value: projectValue, limit: data.projects.limit, used: data.projects.used, format: (value: number) => formatInt(value), unit: "" },
              ].map((item) => {
                const ratio = item.limit ? item.used / item.limit : 0;
                const limitState = item.limit === null ? "ok" : ratio >= 1 ? "limit" : ratio >= 0.7 ? "warn" : "ok";
                return (
                  <li key={item.label} className="af-dt-um__limit" data-state={limitState}>
                    <span className="af-dt-um__limit-label">
                      {item.label}
                      {limitState !== "ok" ? <span className="af-dt-um__dot" aria-label="Approaching or at limit" /> : null}
                    </span>
                    <span className="af-dt-um__limit-value">
                      {item.format(item.value)}
                      {item.limit === null ? (
                        <span className="af-dt-um__muted"> of ∞</span>
                      ) : (
                        <span className="af-dt-um__muted">
                          {" "}
                          of {formatInt(item.limit)}
                          {item.unit}
                        </span>
                      )}
                    </span>
                    <span
                      className="af-dt-um__thin"
                      data-unlimited={item.limit === null || undefined}
                      role={item.limit === null ? "img" : "meter"}
                      aria-label={item.label}
                      aria-valuemin={0}
                      aria-valuemax={item.limit ?? undefined}
                      aria-valuenow={item.limit === null ? undefined : item.used}
                    >
                      {item.limit !== null ? <span style={{ width: `${Math.min(100, ratio * 100)}%` }} /> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="af-dt-um__foot">
          <span className="af-dt-um__status">
            {data.limit ? <span className="af-dt-um__dot" aria-hidden /> : null}
            {data.status}
          </span>
          <button
            type="button"
            className="af-dt-um__action"
            data-strong={data.limit || undefined}
            onClick={() => onActionClick?.(period)}
          >
            <span className="af-dt-um__action-inner">{data.action}</span>
          </button>
        </div>
        <span className="af-dt-um__live" aria-live="polite">
          {data.label}: {formatInt(data.used)} / {formatInt(data.total)} credits, {data.status}
        </span>
      </section>
      {showNote ? <Note>460px usage meter: sliding period pill, tweened credit totals, segment tooltip, daily bars, and plan limit meters.</Note> : null}
    </Demo>
  );
}

export { UsageMeterDemo as AfUsageMeterPattern, UsageMeterDemo as AfUsageMeter };
export type { AfUsageMeterPatternProps as AfUsageMeterProps };
