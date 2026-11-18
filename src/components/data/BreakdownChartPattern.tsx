import { AfPortal, cn, useIsomorphicLayoutEffect } from "../../primitives";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useAsterThemeOptional } from "../../theme";
import {
  BCC_OWNER,
  BCC_PRIORITY,
  BCC_PRIORITY_COLORS,
  BCC_RECORDS,
  BCC_STATUS,
  BCC_TYPE,
  BCC_TYPE_COLORS,
  BccPicker,
  BccSegment,
  BccSlice,
  BccSliceGlyph,
  BreakdownRecord,
  Demo,
  Note,
  formatCompact,
  formatInt,
} from "../_shared/data";

export type { BccSegment, BccSlice, BreakdownRecord };

const BCC_PRIORITY_SWATCHES: readonly string[] = [
  "var(--af-bcc-p0)",
  "var(--af-bcc-p1)",
  "var(--af-bcc-p2)",
  "var(--af-bcc-p3)",
  "var(--af-bcc-p4)",
  ...BCC_PRIORITY_COLORS.slice(5),
];

export interface AfBreakdownChartPatternProps {
  /** Card title. */
  title?: ReactNode;
  /** Atomic breakdown records. */
  records?: BreakdownRecord[];
  /** Default measure ("Tasks" | "Points"). */
  defaultMeasure?: string;
  /** Default slice dimension. */
  defaultSlice?: BccSlice;
  /** Default segment dimension. */
  defaultSegment?: BccSegment;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

/**
 * Breakdown Chart (Sprint 24 1:1): title + total count, three dimension pickers (Measure / Slice by / Segment),
 * right-aligned Y-axis stacked bars, and legend-as-header interactive breakdown table.
 */
function BreakdownChartDemo({
  title = "Sprint 24",
  records = BCC_RECORDS,
  defaultMeasure = "Task count",
  defaultSlice = "status",
  defaultSegment = "priority",
  showNote = false,
  className,
  style,
}: AfBreakdownChartPatternProps = {}) {
  const [measure, setMeasure] = useState(defaultMeasure);
  const [slice, setSlice] = useState<BccSlice>(defaultSlice);
  const [segment, setSegment] = useState<BccSegment>(defaultSegment);
  const [hoverBar, setHoverBar] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [tipAnchor, setTipAnchor] = useState<HTMLElement | null>(null);
  const [tipStyle, setTipStyle] = useState<CSSProperties | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useAsterThemeOptional();
  const themeContainer = theme?.container ?? null;

  const sliceValues = useMemo(() => {
    const base = slice === "status" ? BCC_STATUS : BCC_OWNER;
    const extras = Array.from(new Set(records.map((r) => r[slice]))).filter((v) => !base.includes(v));
    return [...base.filter((v) => records.some((r) => r[slice] === v)), ...extras];
  }, [records, slice]);

  const segmentValues = segment === "priority" ? BCC_PRIORITY : BCC_TYPE;
  const segmentColors = segment === "priority" ? BCC_PRIORITY_SWATCHES : BCC_TYPE_COLORS;
  const isTasksMeasure = measure === "Tasks" || measure !== "Points";
  const measureOf = (record: BreakdownRecord) => (isTasksMeasure ? record.count : record.points);

  const bars = useMemo(() => {
    return sliceValues.map((sliceValue) => {
      const parts = segmentValues.map((segmentValue, index) => ({
        name: segmentValue,
        color: segmentColors[index] ?? "var(--af-data-rest)",
        value: records
          .filter((record) => record[slice] === sliceValue && record[segment] === segmentValue)
          .reduce((sum, record) => sum + measureOf(record), 0),
      }));
      const activeTotal = parts
        .filter((part) => !hidden.includes(part.name))
        .reduce((sum, part) => sum + part.value, 0);
      return {
        key: sliceValue,
        label: sliceValue,
        parts,
        total: parts.reduce((sum, part) => sum + part.value, 0),
        activeTotal,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, slice, segment, measure, sliceValues, segmentValues, segmentColors, hidden]);

  const max = Math.max(...bars.map((bar) => bar.activeTotal), 1);
  const grandTotal = bars.reduce((sum, bar) => sum + bar.activeTotal, 0);
  const ceilMax = max <= 10 ? Math.max(5, Math.ceil(max / 5) * 5) : Math.ceil(max / 20) * 20;
  const ticks = [ceilMax, Math.round(ceilMax * 0.8), Math.round(ceilMax * 0.6), Math.round(ceilMax * 0.4), Math.round(ceilMax * 0.2), 0];
  const focus = hoverBar ? bars.find((bar) => bar.key === hoverBar) ?? null : null;
  const unit = isTasksMeasure ? "tasks" : "pts";
  const visibleParts = (bar: (typeof bars)[number]) => bar.parts.filter((part) => !hidden.includes(part.name));

  const showTip = (key: string, anchor?: HTMLElement | null) => {
    const target = anchor ?? chartRef.current?.querySelector<HTMLElement>(`[data-bar-key="${key}"]`) ?? null;
    setHoverBar(key);
    setTipAnchor(target);
  };

  const hideTip = () => {
    setHoverBar(null);
    setTipAnchor(null);
    setTipStyle(null);
  };

  const focusKey = focus?.key ?? null;
  const focusActiveTotal = focus?.activeTotal ?? null;

  useIsomorphicLayoutEffect(() => {
    if (!focusKey || !tipAnchor || !tipRef.current) {
      setTipStyle((prev) => (prev === null ? prev : null));
      return;
    }
    const update = () => {
      const element = tipRef.current;
      if (!element) return;
      const anchorRect = tipAnchor.getBoundingClientRect();
      const tipRect = element.getBoundingClientRect();
      const gap = 10;
      const margin = 8;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const chartTop = chartRef.current?.getBoundingClientRect().top ?? margin;
      const placeTop = anchorRect.top - tipRect.height - gap >= Math.max(margin, chartTop + margin);
      const rawTop = placeTop ? anchorRect.top - tipRect.height - gap : anchorRect.bottom + gap;
      const nextLeft = Math.round(
        Math.max(margin, Math.min(anchorRect.left + anchorRect.width / 2 - tipRect.width / 2, viewportWidth - tipRect.width - margin)) * 2,
      ) / 2;
      const nextTop = Math.round(Math.max(margin, Math.min(rawTop, viewportHeight - tipRect.height - margin)) * 2) / 2;
      setTipStyle((prev) => {
        if (
          prev &&
          typeof prev.left === "number" &&
          typeof prev.top === "number" &&
          Math.abs(prev.left - nextLeft) < 0.25 &&
          Math.abs(prev.top - nextTop) < 0.25
        ) {
          return prev;
        }
        return { left: nextLeft, top: nextTop };
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [focusKey, focusActiveTotal, tipAnchor, hidden.length]);

  return (
    <Demo>
      <section className={cn("af-dt-bcc", className)} style={style} aria-label="Breakdown chart">
        <header className="af-dt-bcc__head">
          <h3 className="af-dt-bcc__title">{title}</h3>
          <p className="af-dt-bcc__total"><b>{formatInt(grandTotal)}</b><span>{unit}</span></p>
        </header>
        <div className="af-dt-bcc__controls">
          <BccPicker label="Measure" value={isTasksMeasure ? "Task count" : "Points"} options={["Task count", "Points"]} onChange={setMeasure} />
          <BccPicker label="Slice" value={slice === "status" ? "Status" : "Assignee"} options={["Status", "Assignee"]} onChange={(value) => setSlice(value === "Status" ? "status" : "owner")} />
          <BccPicker label="Segment" value={segment === "priority" ? "Priority" : "Type"} options={["Priority", "Type"]} onChange={(value) => { setSegment(value === "Priority" ? "priority" : "type"); setHidden([]); }} />
        </div>
        <div className="af-dt-bcc__chart" ref={chartRef} onPointerLeave={hideTip}>
          <div className="af-dt-bcc__plot">
            {ticks.map((tick, idx) => (
              <div key={`${idx}-${tick}`} className="af-dt-bcc__grid" style={{ bottom: `${(tick / ceilMax) * 100}%` }}>
                <span className="af-dt-bcc__yaxis">{formatCompact(tick)}</span>
              </div>
            ))}
            <div className="af-dt-bcc__bars">
              {bars.map((bar) => (
                <div key={bar.key} className="af-dt-bcc__col" data-dim={hoverBar !== null && hoverBar !== bar.key ? "" : undefined}>
                  <button
                    type="button"
                    className="af-dt-bcc__bar"
                    data-bar-key={bar.key}
                    aria-label={`${bar.label}: ${formatInt(bar.activeTotal)} ${unit}`}
                    onPointerEnter={(event) => showTip(bar.key, event.currentTarget)}
                    onFocus={(event) => showTip(bar.key, event.currentTarget)}
                    onPointerLeave={hideTip}
                    onBlur={hideTip}
                  >
                    <span className="af-dt-bcc__stack" style={{ height: bar.activeTotal > 0 ? `${Math.max(3, (bar.activeTotal / ceilMax) * 100)}%` : "2px" }}>
                      {visibleParts(bar).filter((part) => part.value > 0).map((part) => (
                        <span key={part.name} className="af-dt-bcc__seg" style={{ flexGrow: part.value, background: part.color }} />
                      ))}
                    </span>
                  </button>
                  <span className="af-dt-bcc__icon" aria-hidden><BccSliceGlyph value={bar.label} size={15} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="af-dt-bcc__table" role="table" aria-label="Breakdown table">
          <div className="af-dt-bcc__thead" role="row">
            <span role="columnheader">{slice === "status" ? "Status" : "Assignee"}</span>
            <span role="columnheader" className="af-dt-bcc__num">{isTasksMeasure ? "Task count" : "Points"}</span>
            {segmentValues.map((value, index) => (
              <button
                key={value}
                type="button"
                role="columnheader"
                className="af-dt-bcc__legend"
                aria-pressed={!hidden.includes(value)}
                onClick={() => setHidden((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))}
              >
                <i style={{ background: segmentColors[index] ?? "var(--af-data-rest)" }} aria-hidden />
                {value}
              </button>
            ))}
          </div>
          <div className="af-dt-bcc__tbody">
            {bars.map((bar) => (
              <div
                key={bar.key}
                role="row"
                className="af-dt-bcc__row"
                data-active={hoverBar === bar.key || undefined}
                data-dim={hoverBar !== null && hoverBar !== bar.key ? "" : undefined}
                onPointerEnter={() => showTip(bar.key)}
                onPointerLeave={hideTip}
              >
                <button type="button" className="af-dt-bcc__name" onClick={() => (hoverBar === bar.key ? hideTip() : showTip(bar.key))}>
                  <BccSliceGlyph value={bar.label} size={15} />
                  {bar.label}
                </button>
                <span role="cell" className="af-dt-bcc__num af-dt-bcc__total">{formatInt(bar.activeTotal)}</span>
                {bar.parts.map((part) => (
                  <span key={part.name} role="cell" className="af-dt-bcc__num" data-hidden={hidden.includes(part.name) || undefined}>
                    {hidden.includes(part.name) ? "—" : formatInt(part.value)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <footer className="af-dt-bcc__foot" aria-label="Segment legend">
          {segmentValues.map((value, index) => (
            <button
              key={value}
              type="button"
              className="af-dt-bcc__foot-key"
              aria-pressed={!hidden.includes(value)}
              onClick={() => setHidden((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))}
            >
              <i style={{ background: segmentColors[index] ?? "var(--af-data-rest)" }} aria-hidden />
              <span>{value}</span>
            </button>
          ))}
        </footer>
        {focus ? (
          <AfPortal container={themeContainer}>
            <div
              ref={tipRef}
              className="af-dt-bcc__tip af-dt-bcc__tip--floating"
              role="status"
              style={tipStyle ?? { left: 0, top: 0, visibility: "hidden" }}
            >
              <span className="af-dt-bcc__tip-title">{focus.label} · {unit}</span>
              {visibleParts(focus).map((part) => (
                <span key={part.name} className="af-dt-bcc__tip-row">
                  <i style={{ background: part.color }} aria-hidden />
                  <span>{part.name}</span>
                  <b>{formatInt(part.value)}</b>
                </span>
              ))}
              <span className="af-dt-bcc__tip-total"><span>Total</span><b>{formatInt(focus.activeTotal)}</b></span>
            </div>
          </AfPortal>
        ) : null}
      </section>
      {showNote ? <Note>Title + total, three dimension pickers, skewed stacked bars, and legend-as-header interactive breakdown table.</Note> : null}
    </Demo>
  );
}

export { BreakdownChartDemo as AfBreakdownChartPattern, BreakdownChartDemo as AfBreakdownChart };
export type { AfBreakdownChartPatternProps as AfBreakdownChartProps };
