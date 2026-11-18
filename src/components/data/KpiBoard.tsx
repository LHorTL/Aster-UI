import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { useTween, useTweens } from "../../ui-pro";

export interface KpiStatCardData {
  id: string;
  label: string;
  series: number[];
  previous: number;
  dates?: string[];
  format?: "money" | "number";
  lowerIsBetter?: boolean;
}

export interface KpiOverviewSeries {
  current: number[];
  previous: number[];
  dates?: string[];
}

export interface KpiFocusCardData {
  productName: string;
  productMeta?: string;
  metricLabel: string;
  unit: string;
  unitOne?: string;
  series: number[];
  previous: number;
  dates?: string[];
}

export interface KpiBoardRangeData {
  stats: KpiStatCardData[];
  overview: {
    label: string;
    current: number[];
    previous: number[];
    dates?: string[];
    segments?: Record<string, KpiOverviewSeries>;
  };
  focus: KpiFocusCardData;
}

export interface AfKpiBoardProps {
  /** 按范围 ID 映射的看板数据集。 */
  data?: Record<string, KpiBoardRangeData>;
  /** 顶部日期范围选项。 */
  ranges?: { id: string; label: string }[];
  /** 受控日期范围 ID。 */
  range?: string;
  /** 非受控初始日期范围 ID。 */
  defaultRange?: string;
  /** 日期范围变更回调。 */
  onRangeChange?: (id: string) => void;
  /** 总览卡内部细分筛选选项。 */
  segments?: { id: string; label: string }[];
  /** 受控细分筛选 ID。 */
  segment?: string;
  /** 非受控初始细分筛选 ID。 */
  defaultSegment?: string;
  /** 细分筛选变更回调。 */
  onSegmentChange?: (id: string) => void;
  /** 环比后缀文案（默认 `"较上周期"`）。 */
  compareLabel?: string;
  /** 本周期折线名称（默认 `"本周期"`）。 */
  currentLabel?: string;
  /** 上周期对比线名称（默认 `"上周期"`）。 */
  previousLabel?: string;
  /** 货币格式化函数。 */
  formatMoney?: (value: number) => string;
  /** 聚焦卡左上角图标。 */
  icon?: ReactNode;
  /** 顶部栏左侧标题（默认 `"核心经营看板"`）。 */
  title?: string;
  /** 聚焦卡右上角配置按钮。 */
  setup?: { label: string; onClick?: () => void };
  /** 聚焦卡底部操作按钮。 */
  action?: { label: string; onClick?: () => void };
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

export type AfKpiBoardPatternProps = AfKpiBoardProps;

const DEFAULT_RANGES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

const DEFAULT_SEGMENTS = [
  { id: "all", label: "All items" },
  { id: "pro", label: "Pro license" },
  { id: "team", label: "Team plan" },
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function makeDates(count: number, stepDays = 1): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    if (i === 0) {
      out.push("Today");
    } else {
      const d = new Date(2026, 9, 12 - i * stepDays);
      out.push(`${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`);
    }
  }
  return out;
}

const DATES_7 = makeDates(7, 1);
const DATES_30 = makeDates(30, 1);
const DATES_13 = makeDates(13, 7);

export const DEFAULT_KPI_BOARD_DATA: Record<string, KpiBoardRangeData> = {
  "7d": {
    stats: [
      {
        id: "revenue",
        label: "Total revenue",
        format: "money",
        previous: 1310,
        dates: DATES_7,
        series: [196, 218, 205, 244, 232, 261, 284],
      },
      {
        id: "emails",
        label: "Emails sent",
        format: "number",
        previous: 10920,
        dates: DATES_7,
        series: [1640, 1720, 1690, 1850, 1910, 1980, 2060],
      },
      {
        id: "refunds",
        label: "Refunds",
        format: "number",
        lowerIsBetter: true,
        previous: 29,
        dates: DATES_7,
        series: [5, 4, 4, 3, 2, 2, 1],
      },
    ],
    overview: {
      label: "Sales overview",
      dates: DATES_7,
      current: [168, 192, 184, 215, 208, 236, 259],
      previous: [142, 148, 151, 149, 158, 162, 168],
      segments: {
        pro: { current: [108, 124, 118, 142, 136, 154, 171], previous: [88, 92, 95, 94, 101, 104, 109], dates: DATES_7 },
        team: { current: [60, 68, 66, 73, 72, 82, 88], previous: [54, 56, 56, 55, 57, 58, 59], dates: DATES_7 },
      },
    },
    focus: {
      productName: "Pro license",
      productMeta: "One-time",
      metricLabel: "Licenses sold",
      unit: "licenses",
      unitOne: "license",
      dates: DATES_7,
      previous: 182,
      series: [24, 28, 26, 31, 33, 35, 38],
    },
  },
  "30d": {
    stats: [
      {
        id: "revenue",
        label: "Total revenue",
        format: "money",
        previous: 5031,
        dates: DATES_30,
        series: [
          156, 189, 170, 170, 167, 169, 153, 179, 164, 188, 197, 227, 193, 205, 182, 203, 194, 205, 208, 207, 226, 229,
          218, 234, 237, 229, 234, 240, 243, 245,
        ],
      },
      {
        id: "emails",
        label: "Emails sent",
        format: "number",
        previous: 46200,
        dates: DATES_30,
        series: [
          1604, 1564, 1574, 1714, 1594, 1364, 1614, 1334, 1514, 1234, 1574, 1764, 2284, 1754, 1434, 1804, 1644, 1634,
          1474, 1844, 1854, 1864, 1872, 1792, 1802, 1742, 1782, 1992, 2062, 1704,
        ],
      },
      {
        id: "refunds",
        label: "Refunds",
        format: "number",
        lowerIsBetter: true,
        previous: 144,
        dates: DATES_30,
        series: [4, 3, 4, 4, 5, 5, 3, 2, 2, 2, 4, 3, 5, 5, 4, 6, 5, 4, 5, 3, 3, 3, 2, 3, 3, 4, 3, 4, 3, 1],
      },
    ],
    overview: {
      label: "Sales overview",
      dates: DATES_30,
      current: [
        122, 129, 132, 123, 126, 129, 133, 127, 158, 156, 159, 163, 164, 168, 184, 172, 182, 173, 183, 184, 188, 205,
        209, 199, 203, 213, 207, 220, 236, 245,
      ],
      previous: [
        102, 97, 98, 104, 95, 111, 106, 110, 107, 115, 120, 114, 110, 120, 122, 121, 124, 128, 129, 130, 124, 131, 125,
        124, 125, 128, 139, 136, 140, 148,
      ],
      segments: {
        pro: {
          dates: DATES_30,
          current: [
            74, 79, 82, 76, 78, 81, 84, 80, 104, 102, 106, 110, 112, 115, 128, 118, 126, 119, 128, 130, 134, 148, 152,
            144, 148, 156, 151, 162, 176, 184,
          ],
          previous: [
            58, 54, 55, 60, 52, 66, 62, 65, 63, 70, 74, 69, 66, 74, 76, 75, 78, 81, 82, 84, 78, 84, 79, 78, 80, 82,
            91, 88, 92, 98,
          ],
        },
        team: {
          dates: DATES_30,
          current: [
            48, 50, 50, 47, 48, 48, 49, 47, 54, 54, 53, 53, 52, 53, 56, 54, 56, 54, 55, 54, 54, 57, 57, 55, 55, 57,
            56, 58, 60, 61,
          ],
          previous: [
            44, 43, 43, 44, 43, 45, 44, 45, 44, 45, 46, 45, 44, 46, 46, 46, 46, 47, 47, 46, 46, 47, 46, 46, 45, 46,
            48, 48, 48, 50,
          ],
        },
      },
    },
    focus: {
      productName: "Pro license",
      productMeta: "One-time",
      metricLabel: "Licenses sold",
      unit: "licenses",
      unitOne: "license",
      dates: DATES_30,
      previous: 786,
      series: [
        23, 21, 23, 25, 26, 23, 25, 23, 25, 27, 25, 25, 28, 30, 32, 32, 34, 32, 32, 29, 30, 33, 34, 34, 34, 36, 35,
        35, 36, 36,
      ],
    },
  },
  "90d": {
    stats: [
      {
        id: "revenue",
        label: "Total revenue",
        format: "money",
        previous: 14680,
        dates: DATES_13,
        series: [1120, 1180, 1240, 1210, 1320, 1390, 1440, 1410, 1520, 1590, 1660, 1740, 1820],
      },
      {
        id: "emails",
        label: "Emails sent",
        format: "number",
        previous: 129400,
        dates: DATES_13,
        series: [9800, 10200, 10450, 10900, 11200, 11600, 11400, 12100, 12400, 12800, 13100, 13500, 13950],
      },
      {
        id: "refunds",
        label: "Refunds",
        format: "number",
        lowerIsBetter: true,
        previous: 412,
        dates: DATES_13,
        series: [34, 32, 31, 29, 30, 27, 26, 25, 24, 23, 22, 20, 18],
      },
    ],
    overview: {
      label: "Sales overview",
      dates: DATES_13,
      current: [940, 990, 1040, 1020, 1120, 1190, 1250, 1220, 1330, 1410, 1480, 1560, 1640],
      previous: [810, 830, 845, 860, 880, 910, 925, 940, 965, 990, 1015, 1040, 1070],
      segments: {
        pro: {
          dates: DATES_13,
          current: [610, 645, 680, 665, 735, 785, 825, 805, 880, 935, 985, 1040, 1095],
          previous: [515, 530, 540, 550, 565, 585, 595, 605, 625, 640, 660, 675, 695],
        },
        team: {
          dates: DATES_13,
          current: [330, 345, 360, 355, 385, 405, 425, 415, 450, 475, 495, 520, 545],
          previous: [295, 300, 305, 310, 315, 325, 330, 335, 340, 350, 355, 365, 375],
        },
      },
    },
    focus: {
      productName: "Pro license",
      productMeta: "One-time",
      metricLabel: "Licenses sold",
      unit: "licenses",
      unitOne: "license",
      dates: DATES_13,
      previous: 2140,
      series: [165, 172, 178, 184, 190, 196, 202, 208, 215, 222, 229, 236, 245],
    },
  },
};

function defaultFormatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeSum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

function buildSparkPaths(series: number[], extraSeries?: number[]) {
  const clean = series.map((v) => (Number.isFinite(v) ? v : 0));
  const all = extraSeries ? [...clean, ...extraSeries.map((v) => (Number.isFinite(v) ? v : 0))] : clean;
  const max = Math.max(...all, 1);
  const rawMin = Math.min(...all);
  const min = rawMin > 0 ? rawMin * 0.8 : Math.min(rawMin, 0);
  const span = Math.max(max - min, 1);
  const pts = clean.map((v, i) => {
    const x = clean.length > 1 ? (i / (clean.length - 1)) * 100 : 50;
    const y = 88 - ((v - min) / span) * 73;
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("");
  const fill = `${line}L100,100L0,100Z`;
  return { pts, line, fill };
}

interface PickerMenuProps {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  icon: "calendar" | "filter";
}

function KpiPicker({ label, options, value, onChange, icon }: PickerMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const openMenu = () => {
    const idx = Math.max(0, options.findIndex((o) => o.id === value));
    setActiveIdx(idx);
    setOpen(true);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = options[activeIdx];
      if (picked) onChange(picked.id);
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="af-dt-kbc__pick" data-open={open || undefined}>
      <button
        type="button"
        className="af-dt-kbc__pick-btn"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="af-dt-kbc__pick-icon" aria-hidden="true">
          {icon === "calendar" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2.8" width="10" height="9.2" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 5.8h10M4.8 1.6v2.2M9.2 1.6v2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.2 3.5h9.6M3.9 7h6.2M5.6 10.5h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span title={selected?.label}>{selected?.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="m2.5 3.8 2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul id={listId} className="af-dt-kbc__menu" data-af-hover-list="wash" role="listbox" aria-label={label}>
          {options.map((opt, idx) => (
            <li
              key={opt.id}
              role="option"
              aria-selected={opt.id === value}
              data-active={idx === activeIdx || undefined}
              className="af-dt-kbc__option"
              onPointerEnter={() => setActiveIdx(idx)}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.id === value ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface MiniSparkProps {
  label: string;
  series: number[];
  dates: string[];
  formatPoint: (v: number) => string;
  gradId: string;
  drawKey: string;
  showAxis?: boolean;
}

function MiniSparkPlot({ label, series, dates, formatPoint, gradId, drawKey, showAxis = true }: MiniSparkProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { pts, line, fill } = useMemo(() => buildSparkPaths(series), [series]);
  const lastIdx = Math.max(0, series.length - 1);
  const activeIdx = hoverIdx !== null ? Math.min(hoverIdx, lastIdx) : null;
  const activePt = activeIdx !== null ? pts[activeIdx] : null;
  const activeVal = activeIdx !== null ? series[activeIdx] : series[lastIdx] ?? 0;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || series.length === 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(ratio * lastIdx));
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (series.length === 0) return;
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
    <>
      <div
        className="af-dt-kbc__plot af-dt-kbc__plot--small"
        tabIndex={0}
        role="slider"
        aria-label={`${label} daily trend`}
        aria-valuemin={0}
        aria-valuemax={lastIdx}
        aria-valuenow={activeIdx ?? lastIdx}
        aria-valuetext={`${dates[activeIdx ?? lastIdx] ?? ""}: ${ Number.isFinite(activeVal) ? formatPoint(activeVal) : "—"}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHoverIdx(null)}
      >
        <svg key={drawKey} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="af-dt-kbc__fill" d={fill} fill={`url(#${gradId})`} />
          <path className="af-dt-kbc__line" d={line} />
        </svg>
        {activePt ? (
          <>
            <span className="af-dt-kbc__rule" style={{ left: `${activePt.x}%`, top: `${activePt.y}%` }} aria-hidden="true" />
            <span className="af-dt-kbc__dot" style={{ left: `${activePt.x}%`, top: `${activePt.y}%` }} aria-hidden="true" />
            <span
              className="af-dt-kbc__tag"
              data-side={activePt.x > 64 ? "left" : undefined}
              style={{ left: `${activePt.x}%`, top: `${activePt.y}%` }}
              aria-hidden="true"
            >
              <b>{Number.isFinite(activeVal) ? formatPoint(activeVal) : "—"}</b>
            </span>
          </>
        ) : null}
      </div>
      {showAxis ? (
        <div className="af-dt-kbc__axis" aria-hidden="true">
          <span>{dates[0] ?? ""}</span>
          <span>{dates[lastIdx] ?? "Today"}</span>
          {activePt && activeIdx !== null ? (
            <span
              className="af-dt-kbc__axis-tag"
              style={{ left: `${Math.max(10, Math.min(90, activePt.x))}%` }}
            >
              {dates[activeIdx]}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * KPI 经营看板（affectUI Pro Block 1:1，纯 Flexbox 实现）：
 * 顶部三张趋势卡 + 左下双序列对比总览图（独立细分筛选）+ 右下席位聚焦卡；
 * 切换日期范围时全部指标共享平滑滚动插值，折线重新左起绘制，支持指针与键盘逐日探查。
 */
export function AfKpiBoard({
  data = DEFAULT_KPI_BOARD_DATA,
  ranges = DEFAULT_RANGES,
  range: controlledRange,
  defaultRange,
  onRangeChange,
  segments = DEFAULT_SEGMENTS,
  segment: controlledSegment,
  defaultSegment,
  onSegmentChange,
  compareLabel = "vs. last period",
  currentLabel = "This period",
  previousLabel = "Last period",
  formatMoney = defaultFormatMoney,
  icon,
  title = "Dashboard",
  setup = { label: "Set up" },
  action = { label: "See full analytics" },
  className,
  style,
}: AfKpiBoardProps = {}) {
  const fallbackRange = defaultRange ?? ranges[1]?.id ?? ranges[0]?.id ?? "30d";
  const [innerRange, setInnerRange] = useState(fallbackRange);
  const activeRange = controlledRange ?? innerRange;

  const fallbackSeg = defaultSegment ?? segments[0]?.id ?? "all";
  const [innerSeg, setInnerSeg] = useState(fallbackSeg);
  const activeSeg = controlledSegment ?? innerSeg;

  const [ovHoverIdx, setOvHoverIdx] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [redrawScope, setRedrawScope] = useState<"all" | "overview" | null>(null);
  const gradId = useId().replace(/:/g, "");

  const board = data[activeRange] ?? Object.values(data)[0]!;
  const ovSource: KpiOverviewSeries =
    (activeSeg !== "all" && board.overview.segments?.[activeSeg]) || {
      current: board.overview.current,
      previous: board.overview.previous,
      dates: board.overview.dates,
    };

  const statTotals = board.stats.map((s) => safeSum(s.series));
  const statDeltas = board.stats.map((s, i) => statTotals[i]! - s.previous);
  const ovCurrTotal = safeSum(ovSource.current);
  const ovPrevTotal = safeSum(ovSource.previous);
  const ovPct = ovPrevTotal > 0 ? ((ovCurrTotal - ovPrevTotal) / ovPrevTotal) * 100 : 0;
  const focusTotal = safeSum(board.focus.series);
  const focusPct = board.focus.previous > 0 ? ((focusTotal - board.focus.previous) / board.focus.previous) * 100 : 0;

  const tweenStats = useTweens(statTotals, 520);
  const tweenDeltas = useTweens(statDeltas, 520);
  const tweenOv = useTween(ovCurrTotal, 520);
  const tweenOvPct = useTween(ovPct, 520);
  const tweenFocus = useTween(focusTotal, 520);
  const tweenFocusPrev = useTween(board.focus.previous, 520);
  const tweenFocusPct = useTween(focusPct, 520);

  const ovPaths = useMemo(() => {
    const curr = buildSparkPaths(ovSource.current, ovSource.previous);
    const prev = buildSparkPaths(ovSource.previous, ovSource.current);
    return { curr, prev };
  }, [ovSource]);

  const ovDates = ovSource.dates ?? board.overview.dates ?? makeDates(ovSource.current.length);
  const ovLast = Math.max(0, ovSource.current.length - 1);
  const ovIdx = ovHoverIdx !== null ? Math.min(ovHoverIdx, ovLast) : null;
  const ovCurrPt = ovIdx !== null ? ovPaths.curr.pts[ovIdx] : null;
  const ovPrevPt = ovIdx !== null ? ovPaths.prev.pts[ovIdx] : null;

  const handleRange = (id: string) => {
    if (controlledRange === undefined) setInnerRange(id);
    setOvHoverIdx(null);
    setRedrawScope("all");
    onRangeChange?.(id);
  };

  const handleSeg = (id: string) => {
    if (controlledSegment === undefined) setInnerSeg(id);
    setOvHoverIdx(null);
    setRedrawScope("overview");
    onSegmentChange?.(id);
  };

  const triggerNotice = (msg: string, cb?: () => void) => {
    cb?.();
    setNotice(msg);
    window.setTimeout(() => setNotice((prev) => (prev === msg ? null : prev)), 1800);
  };

  const focusCountRound = Math.round(tweenFocus);
  const focusUnitText = focusCountRound === 1 && board.focus.unitOne ? board.focus.unitOne : board.focus.unit;

  return (
    <div
      className={cn("af-dt-kbc", className)}
      data-redraw={redrawScope === "all" ? "" : undefined}
      style={style}
    >
      <div className="af-dt-kbc__bar">
        <h2 className="af-dt-kbc__heading" title={title}>
          {title}
        </h2>
        {notice ? (
          <span className="af-dt-kbc__toast" role="status">
            {notice}
          </span>
        ) : null}
        <KpiPicker label="Date range" options={ranges} value={activeRange} onChange={handleRange} icon="calendar" />
      </div>

      <div className="af-dt-kbc__stats">
        {board.stats.map((stat, idx) => {
          const val = tweenStats[idx] ?? statTotals[idx] ?? 0;
          const rawDiff = statTotals[idx]! - stat.previous;
          const animDiff = tweenDeltas[idx] ?? rawDiff;
          const good = stat.lowerIsBetter ? rawDiff <= 0 : rawDiff >= 0;
          const fmt = (n: number) =>
            stat.format === "money" ? formatMoney(n) : Math.round(n).toLocaleString("en-US");
          const statDates = stat.dates ?? makeDates(stat.series.length);

          return (
            <section
              key={stat.id}
              className="af-dt-kbc__card af-dt-kbc__stat"
              aria-label={stat.label}
              style={{ "--af-kbc-n": idx } as CSSProperties}
            >
              <header className="af-dt-kbc__row">
                <span className="af-dt-kbc__pair af-dt-kbc__pair--main">
                  <b>{fmt(val)}</b>
                  <span title={stat.label}>{stat.label}</span>
                </span>
                {stat.previous > 0 ? (
                  <span className="af-dt-kbc__pair af-dt-kbc__pair--end">
                    <span className="af-dt-kbc__change" data-good={good || undefined}>
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        aria-hidden="true"
                        style={rawDiff < 0 ? { transform: "scaleY(-1)" } : undefined}
                      >
                        <path d="M4 1.2 7.2 6.4H.8L4 1.2Z" fill="currentColor" />
                      </svg>
                      {fmt(Math.abs(animDiff))}
                    </span>
                    <span title={compareLabel}>{compareLabel}</span>
                  </span>
                ) : null}
              </header>
              <MiniSparkPlot
                label={stat.label}
                series={stat.series}
                dates={statDates}
                formatPoint={(v) => (stat.format === "money" ? formatMoney(v) : Math.round(v).toLocaleString("en-US"))}
                gradId={`${gradId}-fade`}
                drawKey={`${activeRange}-${stat.id}`}
              />
            </section>
          );
        })}
      </div>

      <div className="af-dt-kbc__lower">
        <section
          className="af-dt-kbc__card af-dt-kbc__overview"
          aria-label={board.overview.label}
          data-redraw={redrawScope === "overview" ? "" : undefined}
          style={{ "--af-kbc-n": 3 } as CSSProperties}
        >
          <header className="af-dt-kbc__row af-dt-kbc__row--top">
            <div className="af-dt-kbc__head">
              <div className="af-dt-kbc__label" title={board.overview.label}>
                {board.overview.label}
              </div>
              <div className="af-dt-kbc__figure">
                <b>{formatMoney(tweenOv)}</b>
                {ovPrevTotal > 0 ? (
                  <span className="af-dt-kbc__vs">
                    <span className="af-dt-kbc__change" data-good={ovPct >= 0 || undefined}>
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        aria-hidden="true"
                        style={ovPct < 0 ? { transform: "scaleY(-1)" } : undefined}
                      >
                        <path d="M4 1.2 7.2 6.4H.8L4 1.2Z" fill="currentColor" />
                      </svg>
                      {Math.abs(tweenOvPct).toFixed(1)}%
                    </span>
                    <span className="af-dt-kbc__vs-text" title={compareLabel}>
                      {compareLabel}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
            {segments.length > 0 ? (
              <KpiPicker label="Segment" options={segments} value={activeSeg} onChange={handleSeg} icon="filter" />
            ) : null}
          </header>

          <div
            className="af-dt-kbc__plot af-dt-kbc__plot--large"
            tabIndex={0}
            role="slider"
            aria-label={`${board.overview.label}: ${currentLabel} vs ${previousLabel}`}
            aria-valuemin={0}
            aria-valuemax={ovLast}
            aria-valuenow={ovIdx ?? ovLast}
            aria-valuetext={`${ovDates[ovIdx ?? ovLast] ?? ""}: ${currentLabel} ${formatMoney(ovSource.current[ovIdx ?? ovLast] ?? 0)}`}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setOvHoverIdx(Math.round(r * ovLast));
            }}
            onPointerLeave={() => setOvHoverIdx(null)}
            onBlur={() => setOvHoverIdx(null)}
            onKeyDown={(e) => {
              const cur = ovIdx ?? ovLast;
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setOvHoverIdx(Math.max(0, cur - 1));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setOvHoverIdx(Math.min(ovLast, cur + 1));
              } else if (e.key === "Home") {
                e.preventDefault();
                setOvHoverIdx(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setOvHoverIdx(ovLast);
              } else if (e.key === "Escape") {
                setOvHoverIdx(null);
              }
            }}
          >
            <svg key={`${activeRange}-${activeSeg}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`${gradId}-fade`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--af-accent)" stopOpacity="0.12" />
                  <stop offset="1" stopColor="var(--af-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="af-dt-kbc__grid" d="M0,25H100" />
              <path className="af-dt-kbc__grid" d="M0,50H100" />
              <path className="af-dt-kbc__grid" d="M0,75H100" />
              <path d={ovPaths.curr.fill} fill={`url(#${gradId}-fade)`} />
              <path className="af-dt-kbc__line af-dt-kbc__line--soft" d={ovPaths.prev.line} />
              <path className="af-dt-kbc__line" d={ovPaths.curr.line} />
            </svg>

            {ovCurrPt && ovPrevPt && ovIdx !== null ? (
              <>
                <span
                  className="af-dt-kbc__rule"
                  style={{ left: `${ovCurrPt.x}%`, top: `${Math.min(ovCurrPt.y, ovPrevPt.y)}%` }}
                  aria-hidden="true"
                />
                <span
                  className="af-dt-kbc__dot af-dt-kbc__dot--soft"
                  style={{ left: `${ovPrevPt.x}%`, top: `${ovPrevPt.y}%` }}
                  aria-hidden="true"
                />
                <span
                  className="af-dt-kbc__dot"
                  style={{ left: `${ovCurrPt.x}%`, top: `${ovCurrPt.y}%` }}
                  aria-hidden="true"
                />
                <div
                  className="af-dt-kbc__tip"
                  data-side={ovCurrPt.x > 58 ? "left" : undefined}
                  style={{ left: `${ovCurrPt.x}%`, top: `${Math.max(18, ovCurrPt.y)}%` }}
                  aria-hidden="true"
                >
                  <div className="af-dt-kbc__tip-head">
                    <b>{ovDates[ovIdx]}</b>
                  </div>
                  <div className="af-dt-kbc__tip-row">
                    <i />
                    <span>{currentLabel}</span>
                    <b>{formatMoney(ovSource.current[ovIdx] ?? 0)}</b>
                  </div>
                  <div className="af-dt-kbc__tip-row" data-soft="">
                    <i />
                    <span>{previousLabel}</span>
                    <b>{formatMoney(ovSource.previous[ovIdx] ?? 0)}</b>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="af-dt-kbc__axis" aria-hidden="true">
            <span>{ovDates[0] ?? ""}</span>
            <span>{ovDates[ovLast] ?? "Today"}</span>
          </div>
        </section>

        <section
          className="af-dt-kbc__card af-dt-kbc__focus"
          aria-label={board.focus.productName}
          style={{ "--af-kbc-n": 4 } as CSSProperties}
        >
          <header className="af-dt-kbc__row af-dt-kbc__row--top">
            <div className="af-dt-kbc__product">
              <span className="af-dt-kbc__icon" aria-hidden="true">
                {icon ?? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.9 13.3 4.8v6.4L8 14.1 2.7 11.2V4.8L8 1.9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M2.9 4.9 8 7.7l5.1-2.8M8 7.7V14" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="af-dt-kbc__pair">
                <b title={board.focus.productName}>{board.focus.productName}</b>
                {board.focus.productMeta ? <span title={board.focus.productMeta}>{board.focus.productMeta}</span> : null}
              </span>
            </div>
            {setup ? (
              <button
                type="button"
                className="af-dt-kbc__setup"
                onClick={() => triggerNotice(`Opened ${board.focus.productName} settings`, setup.onClick)}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 4.2h5.2M10.2 4.2H12M2 9.8h1.8M6.8 9.8H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="8.7" cy="4.2" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="5.3" cy="9.8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                <span title={setup.label}>{setup.label}</span>
              </button>
            ) : null}
          </header>

          <div className="af-dt-kbc__label af-dt-kbc__label--muted" title={board.focus.metricLabel}>
            {board.focus.metricLabel}
          </div>
          <div className="af-dt-kbc__figure af-dt-kbc__figure--small">
            <b>
              {focusCountRound.toLocaleString("en-US")} {focusUnitText}
            </b>
            {board.focus.previous > 0 ? (
              <span className="af-dt-kbc__vs">
                <span className="af-dt-kbc__change" data-good={focusPct >= 0 || undefined}>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    aria-hidden="true"
                    style={focusPct < 0 ? { transform: "scaleY(-1)" } : undefined}
                  >
                    <path d="M4 1.2 7.2 6.4H.8L4 1.2Z" fill="currentColor" />
                  </svg>
                  {Math.round(Math.abs(tweenFocusPct))}%
                </span>
                <span className="af-dt-kbc__vs-text" title={compareLabel}>
                  {compareLabel}
                </span>
              </span>
            ) : null}
          </div>

          <MiniSparkPlot
            label={board.focus.metricLabel}
            series={board.focus.series}
            dates={board.focus.dates ?? makeDates(board.focus.series.length)}
            formatPoint={(v) => `${Math.round(v).toLocaleString("en-US")} ${focusUnitText}`}
            gradId={`${gradId}-fade`}
            drawKey={`${activeRange}-focus`}
            showAxis={false}
          />

          <div className="af-dt-kbc__legend">
            <span>{previousLabel}</span>
            <b data-soft="">{Math.round(tweenFocusPrev).toLocaleString("en-US")}</b>
            <span>{currentLabel}</span>
            <b>{focusCountRound.toLocaleString("en-US")}</b>
          </div>

          {action ? (
            <button
              type="button"
              className="af-dt-kbc__action"
              onClick={() => triggerNotice("Opening full analytics report", action.onClick)}
            >
              <span title={action.label}>{action.label}</span>
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export const AfKpiBoardPattern = AfKpiBoard;
