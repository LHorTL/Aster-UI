import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn, useSlidingTabIndicator } from "../../primitives";
import { useTweens } from "../../ui-pro";

export type MetricsRangeId = "7d" | "30d" | "90d";
export type MetricsKey = "revenue" | "orders" | "aov" | "refunds";

export interface MetricsDailyPoint {
  date: Date | string;
  revenue: number;
  orders: number;
  refunded: number;
}

export interface MetricsShareItem {
  name: string;
  share: number;
}

export interface AfMetricsDashboardProps {
  /** 顶栏主标题（默认 `"销售概览"`）。 */
  title?: string;
  /** 店铺或工作区副标题（默认 `"Northwind Store"`）。 */
  site?: string;
  /** 默认统计周期（默认 `"30d"`）。 */
  defaultRange?: MetricsRangeId;
  /** 默认激活指标卡（默认 `"revenue"`）。 */
  defaultMetric?: MetricsKey;
  /** 点击导出回调。 */
  onExport?: (range: MetricsRangeId, metric: MetricsKey) => void;
  /** 每日明细序列（最早在前，建议 180 天以提供完整上周期对比）。 */
  data?: MetricsDailyPoint[];
  /** 热门商品占比列表（0–1）。 */
  products?: MetricsShareItem[];
  /** 销售渠道占比列表（0–1）。 */
  channels?: MetricsShareItem[];
  /** ISO 货币代码（默认 `"USD"`）。 */
  currency?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

export type AfMetricsDashboardPatternProps = AfMetricsDashboardProps;

const LAST_30_REVENUE = [
  11722, 11728, 8440, 9061, 8605, 8552, 10990, 12410, 9970, 8415,
  9153, 8582, 9434, 10147, 13414, 11099, 8782, 8525, 8423, 8222,
  11836, 12018, 10326, 7362, 8169, 9280, 8244, 10210, 14067, 13433,
];

function generateDefaultMetricsData(): MetricsDailyPoint[] {
  const out: MetricsDailyPoint[] = [];
  for (let i = 0; i < 120; i++) {
    const d = new Date(2026, 10, 15 - 179 + i);
    const trend = 0.86 + (i / 120) * 0.12;
    const wave = Math.sin(i * 0.42) * 0.14 + Math.cos(i * 0.19) * 0.08;
    const orders = Math.max(82, Math.round((128 + (i % 7 === 0 || i % 7 === 6 ? 22 : 0)) * trend * (1 + wave * 0.7)));
    const revenue = Math.round(orders * (65.1 + Math.sin(i * 0.31) * 2.4));
    const refunded = Math.max(1, Math.round(orders * 0.021));
    out.push({ date: d, revenue, orders, refunded });
  }

  // Prior 30 days (Sep 17 .. Oct 16): exact totals rev=270,828, ord=4,140, ref=88
  const prvRev = LAST_30_REVENUE.map((r, j) => Math.round(r * 0.9009 * (1 + Math.sin(j * 0.7) * 0.03)));
  prvRev[0]! += 270828 - prvRev.reduce((s, v) => s + v, 0);
  const prvOrd = prvRev.map((r) => Math.max(90, Math.round(r / 65.417)));
  prvOrd[0]! += 4140 - prvOrd.reduce((s, v) => s + v, 0);
  const prvRef = prvOrd.map((o) => Math.max(1, Math.round(o * 0.0212)));
  prvRef[0]! += 88 - prvRef.reduce((s, v) => s + v, 0);
  for (let j = 0; j < 30; j++) {
    out.push({
      date: new Date(2026, 10, 15 - 59 + j),
      revenue: prvRev[j]!,
      orders: prvOrd[j]!,
      refunded: prvRef[j]!,
    });
  }

  // Last 30 days (Oct 17 .. Nov 15): exact totals rev=300,619, ord=4,558 ($65.95 aov), ref=96 (2.1%)
  const curOrd = LAST_30_REVENUE.map((r) => Math.max(96, Math.round(r / 65.954)));
  curOrd[0]! += 4558 - curOrd.reduce((s, v) => s + v, 0);
  const curRef = curOrd.map((o) => Math.max(1, Math.round(o * 0.021)));
  curRef[0]! += 96 - curRef.reduce((s, v) => s + v, 0);
  for (let j = 0; j < 30; j++) {
    out.push({
      date: new Date(2026, 10, 15 - 29 + j),
      revenue: LAST_30_REVENUE[j]!,
      orders: curOrd[j]!,
      refunded: curRef[j]!,
    });
  }

  return out;
}

const DEFAULT_DAILY_DATA = generateDefaultMetricsData();

const DEFAULT_PRODUCTS: MetricsShareItem[] = [
  { name: "Linen overshirt", share: 0.22 },
  { name: "Everyday tote", share: 0.16 },
  { name: "Merino crew", share: 0.13 },
  { name: "Canvas sneaker", share: 0.09 },
  { name: "Wool beanie", share: 0.06 },
];

const DEFAULT_CHANNELS: MetricsShareItem[] = [
  { name: "Online store", share: 0.46 },
  { name: "Instagram", share: 0.21 },
  { name: "Marketplace", share: 0.14 },
  { name: "Wholesale", share: 0.11 },
  { name: "Pop-up", share: 0.05 },
];

const RANGE_META: { id: MetricsRangeId; label: string; sub: string; days: number }[] = [
  { id: "7d", label: "Week", sub: "Last 7 days", days: 7 },
  { id: "30d", label: "Month", sub: "Last 30 days", days: 30 },
  { id: "90d", label: "Quarter", sub: "Last 90 days", days: 90 },
];

function formatDateShort(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function makeMoneyFormatter(currency: string) {
  try {
    const intl = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    const intlCents = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      whole: (v: number) => intl.format(Math.round(v)),
      cents: (v: number) => intlCents.format(v),
      compact: (v: number) => (v >= 1000 ? `${intl.format(Math.round(v / 1000))}K` : intl.format(Math.round(v))),
    };
  } catch {
    return {
      whole: (v: number) => `$${Math.round(v).toLocaleString("en-US")}`,
      cents: (v: number) => `$${v.toFixed(2)}`,
      compact: (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${Math.round(v)}`),
    };
  }
}

function buildSmoothSvg(values: number[], maxVal: number) {
  const w = 600;
  const h = 200;
  const safeMax = Math.max(maxVal, 1);
  const pts = values.map((v, i) => ({
    x: values.length > 1 ? (i / (values.length - 1)) * w : w / 2,
    y: h - Math.max(0, Math.min(1, v / safeMax)) * h,
    pctX: values.length > 1 ? (i / (values.length - 1)) * 100 : 50,
    pctY: 100 - Math.max(0, Math.min(1, v / safeMax)) * 100,
  }));
  if (pts.length === 0) return { line: "", area: "", pts: [] };
  let d = `M${pts[0]!.x.toFixed(2)},${pts[0]!.y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]!;
    const p1 = pts[i + 1]!;
    const cx = (p0.x + p1.x) / 2;
    d += `C${cx.toFixed(2)},${p0.y.toFixed(2)} ${cx.toFixed(2)},${p1.y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }
  const area = `${d}L${w},${h}L0,${h}Z`;
  return { line: d, area, pts };
}

/**
 * 经营指标仪表盘（affectUI Pro Block 1:1，纯 Flexbox 实现）：
 * 顶部周期切换与导出、4 张可切换主序列的 KPI 卡片、支持折线/柱状与同比开关的交互主图，以及底部双栏占比榜单。
 */
export function AfMetricsDashboard({
  title = "Sales",
  site = "Northwind Store",
  defaultRange = "30d",
  defaultMetric = "revenue",
  onExport,
  data = DEFAULT_DAILY_DATA,
  products = DEFAULT_PRODUCTS,
  channels = DEFAULT_CHANNELS,
  currency = "USD",
  className,
  style,
}: AfMetricsDashboardProps = {}) {
  const [range, setRange] = useState<MetricsRangeId>(defaultRange);
  const [metric, setMetric] = useState<MetricsKey>(defaultMetric);
  const [chartKind, setChartKind] = useState<"line" | "bar">("line");
  const [compare, setCompare] = useState(false);
  const [ exported, setExported ] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rangeRef = useRef<HTMLDivElement>(null);
  const kindRef = useRef<HTMLDivElement>(null);
  const rangeThumb = useSlidingTabIndicator(rangeRef, '[aria-checked="true"]', range);
  const kindThumb = useSlidingTabIndicator(kindRef, '[aria-checked="true"]', chartKind);

  const uid = useId().replace(/:/g, "");
  const money = useMemo(() => makeMoneyFormatter(currency), [currency]);
  const meta = RANGE_META.find((r) => r.id === range) ?? RANGE_META[1]!;

  const { currentSlice, prevSlice } = useMemo(() => {
    const days = meta.days;
    const end = data.length;
    const curStart = Math.max(0, end - days);
    const prvStart = Math.max(0, curStart - days);
    const cur = data.slice(curStart, end);
    const prv = curStart > 0 ? data.slice(prvStart, curStart) : [];
    // 90 天按 3 天聚合为 30 个点，让折线圆点与柱状图密度舒适一致
    if (days === 90 && cur.length > 30) {
      const bucket = (arr: MetricsDailyPoint[]) => {
        const res: MetricsDailyPoint[] = [];
        for (let i = 0; i < arr.length; i += 3) {
          const chunk = arr.slice(i, i + 3);
          res.push({
            date: chunk[chunk.length - 1]!.date,
            revenue: chunk.reduce((s, x) => s + (x.revenue || 0), 0),
            orders: chunk.reduce((s, x) => s + (x.orders || 0), 0),
            refunded: chunk.reduce((s, x) => s + (x.refunded || 0), 0),
          });
        }
        return res;
      };
      return { currentSlice: bucket(cur), prevSlice: bucket(prv) };
    }
    return { currentSlice: cur, prevSlice: prv };
  }, [data, meta.days]);

  const calcTotals = (slice: MetricsDailyPoint[]) => {
    const rev = slice.reduce((s, d) => s + (d.revenue || 0), 0);
    const ord = slice.reduce((s, d) => s + (d.orders || 0), 0);
    const ref = slice.reduce((s, d) => s + (d.refunded || 0), 0);
    const aov = ord > 0 ? rev / ord : 0;
    const refRate = ord > 0 ? (ref / ord) * 100 : 0;
    return { rev, ord, aov, refRate };
  };

  const curTotals = useMemo(() => calcTotals(currentSlice), [currentSlice]);
  const prvTotals = useMemo(() => calcTotals(prevSlice), [prevSlice]);
  const hasPrev = prevSlice.length > 0;

  const animKpis = useTweens([curTotals.rev, curTotals.ord, curTotals.aov, curTotals.refRate], 480);

  const kpiCards = [
    {
      id: "revenue" as const,
      label: "Revenue",
      display: money.whole(animKpis[0] ?? curTotals.rev),
      delta: hasPrev && prvTotals.rev > 0 ? ((curTotals.rev - prvTotals.rev) / prvTotals.rev) * 100 : null,
      unit: "%",
      lowerIsBetter: false,
    },
    {
      id: "orders" as const,
      label: "Orders",
      display: Math.round(animKpis[1] ?? curTotals.ord).toLocaleString("en-US"),
      delta: hasPrev && prvTotals.ord > 0 ? ((curTotals.ord - prvTotals.ord) / prvTotals.ord) * 100 : null,
      unit: "%",
      lowerIsBetter: false,
    },
    {
      id: "aov" as const,
      label: "Avg. order",
      display: money.cents(animKpis[2] ?? curTotals.aov),
      delta: hasPrev && prvTotals.aov > 0 ? ((curTotals.aov - prvTotals.aov) / prvTotals.aov) * 100 : null,
      unit: "%",
      lowerIsBetter: false,
    },
    {
      id: "refunds" as const,
      label: "Refund rate",
      display: `${(animKpis[3] ?? curTotals.refRate).toFixed(1)}%`,
      delta: hasPrev ? curTotals.refRate - prvTotals.refRate : null,
      unit: " pts",
      lowerIsBetter: true,
    },
  ];

  const pointValue = (pt: MetricsDailyPoint, m: MetricsKey): number => {
    if (m === "revenue") return pt.revenue || 0;
    if (m === "orders") return pt.orders || 0;
    if (m === "aov") return pt.orders > 0 ? pt.revenue / pt.orders : 0;
    return pt.orders > 0 ? (pt.refunded / pt.orders) * 100 : 0;
  };

  const formatMetricVal = (v: number, m: MetricsKey = metric): string => {
    if (m === "revenue") return money.whole(v);
    if (m === "orders") return Math.round(v).toLocaleString("en-US");
    if (m === "aov") return money.cents(v);
    return `${v.toFixed(1)}%`;
  };

  const formatAxisVal = (v: number): string => {
    if (metric === "revenue") return money.compact(v);
    if (metric === "orders") return Math.round(v).toLocaleString("en-US");
    if (metric === "aov") return money.whole(v);
    return `${v.toFixed(1)}%`;
  };

  const curSeries = useMemo(() => currentSlice.map((d) => pointValue(d, metric)), [currentSlice, metric]);
  const prvSeries = useMemo(() => prevSlice.map((d) => pointValue(d, metric)), [prevSlice, metric]);
  const rawMax = Math.max(...curSeries, ...(compare ? prvSeries : []), 1);
  const niceMax =
    metric === "refunds"
      ? Math.max(4, Math.ceil(rawMax * 2) / 2)
      : metric === "revenue"
        ? rawMax <= 20000
          ? 20000
          : Math.ceil(rawMax / 10000) * 10000
        : metric === "orders"
          ? Math.ceil(rawMax / 100) * 100
          : Math.ceil(rawMax / 20) * 20;

  const curSvg = useMemo(() => buildSmoothSvg(curSeries, niceMax), [curSeries, niceMax]);
  const prvSvg = useMemo(() => buildSmoothSvg(prvSeries, niceMax), [prvSeries, niceMax]);

  const lastIdx = Math.max(0, curSeries.length - 1);
  const activeIdx = hoverIdx !== null ? Math.min(hoverIdx, lastIdx) : null;
  const activeCurPt = activeIdx !== null ? curSvg.pts[activeIdx] : null;
  const activePrvPt = compare && activeIdx !== null ? prvSvg.pts[activeIdx] : null;

  const xTicks = useMemo(() => {
    if (currentSlice.length === 0) return [];
    const step = Math.max(1, Math.floor((currentSlice.length - 1) / 5));
    const list: { idx: number; pct: number; label: string }[] = [];
    for (let i = 0; i < currentSlice.length; i += step) {
      list.push({
        idx: i,
        pct: currentSlice.length > 1 ? (i / (currentSlice.length - 1)) * 100 : 0,
        label: formatDateShort(currentSlice[i]!.date),
      });
    }
    return list;
  }, [currentSlice]);

  const maxProdShare = Math.max(...products.map((p) => p.share), 0.01);
  const maxChanShare = Math.max(...channels.map((c) => c.share), 0.01);
  const prodAmounts = useTweens(
    products.map((p) => curTotals.rev * p.share),
    500,
  );
  const chanAmounts = useTweens(
    channels.map((c) => curTotals.rev * c.share),
    500,
  );

  const activeKpiMeta = kpiCards.find((k) => k.id === metric) ?? kpiCards[0]!;

  const handleExport = () => {
    onExport?.(range, metric);
    setExported(true);
    window.setTimeout(() => setExported(false), 1800);
  };

  const onPlotMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || curSeries.length === 0) return;
    const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(r * lastIdx));
  };

  const onPlotKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (curSeries.length === 0) return;
    const cur = activeIdx ?? lastIdx;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHoverIdx(Math.max(0, cur - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setHoverIdx(Math.min(lastIdx, cur + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHoverIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHoverIdx(lastIdx);
    } else if (e.key === "Escape") {
      setHoverIdx(null);
    }
  };

  return (
    <div className={cn("af-dt-mdc", className)} style={style}>
      <div className="af-dt-mdc__bar">
        <div className="af-dt-mdc__heading">
          <span className="af-dt-mdc__title" title={title}>
            {title}
          </span>
          <span className="af-dt-mdc__site" title={`${site} · ${meta.sub}`}>
            {site} · {meta.sub}
          </span>
        </div>
        <div className="af-dt-mdc__actions">
          <div ref={rangeRef} className="af-dt-mdc__range" role="radiogroup" aria-label="Date range">
            {rangeThumb ? (
              <span
                className="af-dt-mdc__thumb"
                aria-hidden="true"
                data-ready={rangeThumb.ready || undefined}
                style={{ width: rangeThumb.width, transform: `translateX(${rangeThumb.x}px)` }}
              />
            ) : null}
            {RANGE_META.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={range === item.id}
                tabIndex={range === item.id ? 0 : -1}
                onClick={() => {
                  setRange(item.id);
                  setHoverIdx(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="af-dt-mdc__export" onClick={handleExport}>
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              {exported ? (
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              ) : (
                <path d="M12 14.5V3.5m0 11c-.7 0-2.03-1.94-2.5-2.5M12 14.5c.7 0 2.03-1.94 2.5-2.5M20.5 16.5c0 2.48-.52 3-3 3h-11c-2.48 0-3-.52-3-3" />
              )}
            </svg>
            <span aria-live="polite">{exported ? "Exported" : "Export"}</span>
          </button>
        </div>
      </div>

      <div className="af-dt-mdc__kpis" role="tablist" aria-label="Key metrics">
        {kpiCards.map((card) => {
          const selected = metric === card.id;
          const up = (card.delta ?? 0) >= 0;
          const good = card.lowerIsBetter ? (card.delta ?? 0) <= 0 : up;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${card.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-chart`}
              tabIndex={selected ? 0 : -1}
              className="af-dt-mdc__kpi"
              onClick={() => {
                setMetric(card.id);
                setHoverIdx(null);
              }}
            >
              <span className="af-dt-mdc__kpi-label">{card.label}</span>
              <span className="af-dt-mdc__kpi-value">{card.display}</span>
              <span
                className="af-dt-mdc__delta"
                data-good={good || undefined}
                data-none={card.delta === null || undefined}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  aria-hidden="true"
                  style={!up ? { transform: "scaleY(-1)" } : undefined}
                >
                  <path d="M4 1.2 7.2 6.4H.8L4 1.2Z" fill="currentColor" />
                </svg>
                {card.delta !== null ? `${Math.abs(card.delta).toFixed(1)}${card.unit}` : "0.0%"}
                <span className="af-dt-mdc__sr">{up ? " up vs prior period" : " down vs prior period"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="af-dt-mdc__card">
        <div className="af-dt-mdc__chart" id={`${uid}-chart`} role="tabpanel" aria-labelledby={`${uid}-tab-${metric}`}>
          <div className="af-dt-mdc__chart-head">
            <span className="af-dt-mdc__legend">
              <i aria-hidden="true" />
              {activeKpiMeta.label}
            </span>
            <div className="af-dt-mdc__chart-tools">
              <div ref={kindRef} className="af-dt-mdc__kind" role="radiogroup" aria-label="Chart type">
                {kindThumb ? (
                  <span
                    className="af-dt-mdc__thumb"
                    aria-hidden="true"
                    data-ready={kindThumb.ready || undefined}
                    style={{ width: kindThumb.width, transform: `translateX(${kindThumb.x}px)` }}
                  />
                ) : null}
                <button
                  type="button"
                  role="radio"
                  aria-checked={chartKind === "line"}
                  tabIndex={chartKind === "line" ? 0 : -1}
                  aria-label="Line chart"
                  onClick={() => setChartKind("line")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3.5 16.5 9 11l4 3.5 7.5-8" />
                    <circle cx="9" cy="11" r="1.6" />
                    <circle cx="13" cy="14.5" r="1.6" />
                  </svg>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chartKind === "bar"}
                  tabIndex={chartKind === "bar" ? 0 : -1}
                  aria-label="Bar chart"
                  onClick={() => setChartKind("bar")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5.5 19.5v-6M10 19.5V8M14.5 19.5v-9M19 19.5V5" />
                  </svg>
                </button>
              </div>
              <label className="af-dt-mdc__compare">
                <input
                  role="switch"
                  type="checkbox"
                  checked={compare}
                  onChange={(e) => setCompare(e.target.checked)}
                />
                <span className="af-dt-mdc__switch" aria-hidden="true" />
                <span className="af-dt-mdc__compare-label">Compare to previous period</span>
              </label>
            </div>
          </div>

          <div className="af-dt-mdc__plot-wrap">
            <div className="af-dt-mdc__axis" aria-hidden="true">
              <span>{formatAxisVal(niceMax)}</span>
              <span>{formatAxisVal(niceMax / 2)}</span>
              <span>{formatAxisVal(0)}</span>
            </div>
            <div className="af-dt-mdc__plot-col">
              <div
                className="af-dt-mdc__plot"
                tabIndex={0}
                role="img"
                aria-label={`${activeKpiMeta.label} (${meta.sub}), use left and right arrow keys to inspect daily points`}
                onPointerMove={onPlotMove}
                onPointerLeave={() => setHoverIdx(null)}
                onBlur={() => setHoverIdx(null)}
                onKeyDown={onPlotKey}
              >
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--af-accent)" stopOpacity="0.14" />
                      <stop offset="100%" stopColor="var(--af-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line className="af-dt-mdc__grid" x1="0" x2="600" y1="200" y2="200" />
                  <line className="af-dt-mdc__grid" x1="0" x2="600" y1="100" y2="100" />
                  <line className="af-dt-mdc__grid" x1="0" x2="600" y1="0" y2="0" />
                  {chartKind === "line" ? (
                    <g key={`${range}-${metric}`} className="af-dt-mdc__series">
                      <path d={curSvg.area} fill={`url(#${uid}-area)`} />
                      {compare && prvSvg.line ? <path className="af-dt-mdc__prev" d={prvSvg.line} /> : null}
                      <path className="af-dt-mdc__line" d={curSvg.line} />
                    </g>
                  ) : null}
                  {activeCurPt ? (
                    <line
                      className="af-dt-mdc__guide"
                      x1={activeCurPt.x}
                      x2={activeCurPt.x}
                      y1="0"
                      y2="200"
                    />
                  ) : null}
                </svg>

                {chartKind === "line" ? (
                  <div key={`${range}-${metric}-dots`} className="af-dt-mdc__dots" aria-hidden="true">
                    {curSvg.pts.map((pt, i) => (
                      <span
                        key={i}
                        style={{
                          left: `${pt.pctX}%`,
                          top: `${pt.pctY}%`,
                          animationDelay: `${i * 18}ms`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    key={`${range}-${metric}-bars`}
                    className="af-dt-mdc__bars"
                    data-compare={compare || undefined}
                    aria-hidden="true"
                  >
                    {curSeries.map((val, i) => {
                      const hPct = Math.max(3, (val / Math.max(niceMax, 1)) * 92);
                      const prvVal = prvSeries[i] ?? 0;
                      const prvPct = Math.max(3, (prvVal / Math.max(niceMax, 1)) * 92);
                      return (
                        <div key={i} className="af-dt-mdc__bar-slot" data-active={activeIdx === i || undefined}>
                          {compare ? (
                            <span
                              className="af-dt-mdc__col af-dt-mdc__col--prev"
                              style={{ height: `${prvPct}%`, "--af-mdc-d": `${i * 14}ms` } as CSSProperties}
                            />
                          ) : null}
                          <span
                            className="af-dt-mdc__col"
                            style={{ height: `${hPct}%`, "--af-mdc-d": `${i * 14}ms` } as CSSProperties}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeCurPt && activeIdx !== null ? (
                  <>
                    {chartKind === "line" ? (
                      <>
                        {activePrvPt ? (
                          <span
                            className="af-dt-mdc__dot af-dt-mdc__dot--prev"
                            style={{ left: `${activePrvPt.pctX}%`, top: `${activePrvPt.pctY}%` }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span
                          className="af-dt-mdc__dot"
                          style={{ left: `${activeCurPt.pctX}%`, top: `${activeCurPt.pctY}%` }}
                          aria-hidden="true"
                        />
                      </>
                    ) : null}
                    <div
                      className="af-dt-mdc__tip"
                      role="status"
                      data-side={activeCurPt.pctX > 56 ? "left" : "right"}
                      style={{ left: `${activeCurPt.pctX}%` }}
                    >
                      <div className="af-dt-mdc__tip-date">
                        {formatDateShort(currentSlice[activeIdx]?.date ?? "")}
                      </div>
                      <div className="af-dt-mdc__tip-row">
                        <i aria-hidden="true" />
                        <span>Current</span>
                        <b>{formatMetricVal(curSeries[activeIdx] ?? 0)}</b>
                      </div>
                      {compare && prvSeries[activeIdx] !== undefined ? (
                        <div className="af-dt-mdc__tip-row af-dt-mdc__tip-row--prev">
                          <i aria-hidden="true" />
                          <span>Previous</span>
                          <b>{formatMetricVal(prvSeries[activeIdx] ?? 0)}</b>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="af-dt-mdc__dates" aria-hidden="true">
                {xTicks.map((t, idx) => (
                  <span
                    key={t.idx}
                    data-start={idx === 0 ? "" : undefined}
                    data-end={idx === xTicks.length - 1 && t.pct > 90 ? "" : undefined}
                    data-even={idx % 2 === 1 ? "" : undefined}
                    style={{ left: `${t.pct}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="af-dt-mdc__lists">
        <div className="af-dt-mdc__list">
          <div className="af-dt-mdc__list-head">
            <span>Top products</span>
            <span>Revenue</span>
          </div>
          {products.length === 0 ? (
            <p className="af-dt-mdc__empty">No product data</p>
          ) : (
            <ul>
              {products.map((item, i) => (
                <li key={item.name} className="af-dt-mdc__row">
                  <span
                    className="af-dt-mdc__row-bar"
                    aria-hidden="true"
                    style={{ width: `${Math.min(100, (item.share / maxProdShare) * 100)}%` }}
                  />
                  <span className="af-dt-mdc__row-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="af-dt-mdc__row-value">{money.whole(prodAmounts[i] ?? curTotals.rev * item.share)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="af-dt-mdc__list">
          <div className="af-dt-mdc__list-head">
            <span>Channels</span>
            <span>Revenue</span>
          </div>
          {channels.length === 0 ? (
            <p className="af-dt-mdc__empty">No channel data</p>
          ) : (
            <ul>
              {channels.map((item, i) => (
                <li key={item.name} className="af-dt-mdc__row">
                  <span
                    className="af-dt-mdc__row-bar"
                    aria-hidden="true"
                    style={{ width: `${Math.min(100, (item.share / maxChanShare) * 100)}%` }}
                  />
                  <span className="af-dt-mdc__row-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="af-dt-mdc__row-value">{money.whole(chanAmounts[i] ?? curTotals.rev * item.share)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export const AfMetricsDashboardPattern = AfMetricsDashboard;
