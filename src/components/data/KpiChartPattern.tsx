import { useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "../../primitives";
import type { AfLineSeries } from "../../ui-pro";
import { Demo, KPI_DAY_NAMES, KPI_LABELS, KPI_SERIES, Note, formatCompact } from "../_shared/data";

export interface AfKpiChartPatternProps {
  /** 卡片标题。 */
  title?: ReactNode;
  /** 显式覆盖顶部主数字（默认汇总 7 日总营收 $96.4k）。 */
  value?: ReactNode;
  /** 显式覆盖环比胶囊。 */
  delta?: { value: ReactNode; tone?: "up" | "down" | "flat" };
  /** 数值单位后缀。 */
  unit?: ReactNode;
  /** X 轴刻度标签。 */
  labels?: string[];
  /** 折线序列数据。 */
  series?: AfLineSeries[];
  /** 空序列时的占位文案。 */
  emptyText?: ReactNode;
  /** 底部托盘说明文案。 */
  footer?: ReactNode;
  /** 图表区域高度（px）。 */
  height?: number;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

const formatDollarCompact = (value: number) => `$${formatCompact(value)}`;

const seriesColor = (index: number, total: number, explicit?: string) => {
  if (explicit) return explicit;
  if (total > 1 && index === total - 1) return "var(--af-series-5)";
  const palette = ["var(--af-series-1)", "var(--af-series-2)", "var(--af-series-3)", "var(--af-series-4)"];
  return palette[index % palette.length]!;
};

/**
 * KPI Chart (Revenue by channel 1:1): 15/500 title, 24px figure + 20px delta pill,
 * 5-series straight-line chart with left Y-axis ($6k/$3k/$0), 0..100% full-width polylines,
 * magnetic crosshair & ranked tooltip, and hairline footer tray ("Top 5 channels").
 */
function KpiChartDemo({
  title = "Revenue",
  value: valueProp,
  delta: deltaProp,
  unit,
  labels = KPI_LABELS,
  series = KPI_SERIES,
  emptyText = "No series data",
  footer = "Top 5 channels",
  height = 124,
  showNote = false,
  className,
  style,
}: AfKpiChartPatternProps = {}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const count = labels.length;
  const isDefaultSeries = series === KPI_SERIES;
  const sumAll = series.reduce((acc, item) => acc + item.values.reduce((s, v) => s + v, 0), 0);
  const lastTotal = series.reduce((sum, item) => sum + (item.values[count - 1] ?? 0), 0);
  const firstTotal = series.reduce((sum, item) => sum + (item.values[0] ?? 0), 0);
  const diff = isDefaultSeries ? 7900 : lastTotal - firstTotal;
  const headlineTotal = isDefaultSeries ? 96400 : sumAll || lastTotal;
  const computedTone: "up" | "down" | "flat" = diff > 0 ? "up" : diff < 0 ? "down" : "flat";

  const rawMax = Math.max(...series.flatMap((s) => s.values), 1);
  const ceilMax = rawMax <= 6000 ? 6000 : Math.ceil(rawMax / 2000) * 2000;
  const midTick = Math.round(ceilMax / 2);
  const midLabelIdx = Math.floor(Math.max(0, count - 1) / 2);

  const onPlotMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || count <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(ratio * Math.max(0, count - 1)));
  };

  const onPlotKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (count <= 0) return;
    const cur = hoverIdx ?? count - 1;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHoverIdx(Math.max(0, cur - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setHoverIdx(Math.min(count - 1, cur + 1));
    } else if (e.key === "Escape") {
      setHoverIdx(null);
    }
  };

  const activePctX = hoverIdx !== null && count > 1 ? (hoverIdx / (count - 1)) * 100 : 50;
  const rankedAtHover =
    hoverIdx !== null
      ? series
          .map((item, idx) => ({
            name: item.name,
            color: seriesColor(idx, series.length, item.color),
            val: item.values[hoverIdx] ?? 0,
          }))
          .sort((a, b) => b.val - a.val)
      : [];

  return (
    <Demo>
      <section className={cn("af-dt-kpi", className)} style={style} aria-label="KPI line chart">
        <div className="af-dt-kpi__body">
          <h3 className="af-dt-kpi__title">{title}</h3>
          <p className="af-dt-kpi__value">
            <span className="af-dt-kpi__num">{valueProp ?? formatDollarCompact(headlineTotal)}</span>
            {deltaProp ? (
              <span className="af-dt-delta" data-tone={deltaProp.tone ?? "up"}>{deltaProp.value}</span>
            ) : (
              <span className="af-dt-delta" data-tone={computedTone}>
                {diff >= 0 ? "+" : "−"}{formatDollarCompact(Math.abs(diff))}
              </span>
            )}
            {unit ? <span className="af-dt-kpi__unit">{unit}</span> : null}
          </p>
          <div className="af-dt-kpi__chart">
            {series.length ? (
              <div className="af-dt-kpi__chart-wrap">
                <div className="af-dt-kpi__yaxis" style={{ height }} aria-hidden>
                  <span>{formatDollarCompact(ceilMax)}</span>
                  <span>{formatDollarCompact(midTick)}</span>
                  <span>$0</span>
                </div>
                <div className="af-dt-kpi__main">
                  <div
                    className="af-dt-kpi__plot"
                    style={{ height }}
                    tabIndex={0}
                    role="img"
                    aria-label="Revenue by channel over the last 7 days"
                    onPointerMove={onPlotMove}
                    onPointerLeave={() => setHoverIdx(null)}
                    onKeyDown={onPlotKey}
                    onBlur={() => setHoverIdx(null)}
                  >
                    <span className="af-dt-kpi__grid af-dt-kpi__grid--dashed" style={{ top: "0%" }} aria-hidden />
                    <span className="af-dt-kpi__grid af-dt-kpi__grid--dashed" style={{ top: "50%" }} aria-hidden />
                    <span className="af-dt-kpi__grid af-dt-kpi__grid--solid" style={{ top: "100%" }} aria-hidden />
                    <svg className="af-dt-kpi__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                      {series.map((item, idx) => {
                        const stroke = seriesColor(idx, series.length, item.color);
                        const points = item.values
                          .slice(0, count)
                          .map((v, i) => {
                            const x = count > 1 ? (i / (count - 1)) * 100 : 50;
                            const y = 100 - Math.max(0, Math.min(1, v / ceilMax)) * 100;
                            return `${x.toFixed(2)},${y.toFixed(2)}`;
                          })
                          .join(" ");
                        return (
                          <polyline
                            key={item.name}
                            points={points}
                            fill="none"
                            stroke={stroke}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>
                    {hoverIdx !== null ? (
                      <>
                        <span className="af-dt-kpi__guide" style={{ left: `${activePctX}%` }} aria-hidden />
                        {series.map((item, idx) => {
                          const v = item.values[hoverIdx] ?? 0;
                          const pctY = 100 - Math.max(0, Math.min(1, v / ceilMax)) * 100;
                          return (
                            <span
                              key={item.name}
                              className="af-dt-kpi__dot"
                              style={{
                                left: `${activePctX}%`,
                                top: `${pctY}%`,
                                borderColor: seriesColor(idx, series.length, item.color),
                              }}
                              aria-hidden
                            />
                          );
                        })}
                        <div
                          className="af-dt-kpi__tip"
                          data-side={activePctX > 55 ? "left" : "right"}
                          style={{ left: `${activePctX}%` }}
                          role="status"
                        >
                          <span className="af-dt-kpi__tip-head">
                            {isDefaultSeries && KPI_DAY_NAMES[hoverIdx] ? KPI_DAY_NAMES[hoverIdx] : labels[hoverIdx]}
                          </span>
                          {rankedAtHover.map((entry) => (
                            <span key={entry.name} className="af-dt-kpi__tip-row">
                              <i style={{ background: entry.color }} aria-hidden />
                              <span>{entry.name}</span>
                              <b>{formatDollarCompact(entry.val)}</b>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                  {count > 0 ? (
                    <div className="af-dt-kpi__xaxis" aria-hidden>
                      <span>{labels[0]}</span>
                      {count > 2 ? <span>{labels[midLabelIdx]}</span> : null}
                      {count > 1 ? <span>{labels[count - 1]}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="af-dt-kpi__empty" style={{ height }}>{emptyText}</div>
            )}
          </div>
        </div>
        {footer ? <footer className="af-dt-kpi__foot">{footer}</footer> : null}
      </section>
      {showNote ? <Note>440px KPI chart: 5 straight-line series with neutral tail, dashed gridlines, and magnetic crosshair tooltip.</Note> : null}
    </Demo>
  );
}

export { KpiChartDemo as AfKpiChartPattern, KpiChartDemo as AfKpiChart };
export type { AfKpiChartPatternProps as AfKpiChartProps };
