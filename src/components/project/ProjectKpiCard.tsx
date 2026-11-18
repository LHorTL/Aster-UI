import { useId, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { formatMetric, metrics as defaultMetrics, metricSparks, type Metric } from "../../model";
import { cn } from "../../primitives";
import { AfSegmented } from "../../ui";
import { useTweens } from "../advanced/shared";

/** 工作台指标卡条目。 */
export type AfProjectKpiItem = {
  id: string;
  label: string;
  value: number | string;
  format?: Metric["format"];
  delta?: number;
  deltaLabel?: string;
  trend?: string;
  hint?: string;
  spark?: number[];
};

/** 工作台指标卡组件属性。 */
export type AfProjectKpiCardProps = {
  /** 指标列表（默认渲染演示 KPI 数据）。 */
  items?: AfProjectKpiItem[];
  /** 受控时间窗。 */
  range?: "7d" | "30d";
  /** 默认时间窗。 */
  defaultRange?: "7d" | "30d";
  /** 时间窗变化回调。 */
  onRangeChange?: (range: "7d" | "30d") => void;
  /** 可选时间窗选项（传入 `false` 可隐藏切换器）。 */
  rangeOptions?: Array<{ value: "7d" | "30d"; label: string }> | false;
  /** 顶部标题。 */
  title?: ReactNode;
  /** 顶部副标题说明。 */
  subtitle?: ReactNode;
  /** 当前高亮卡片下标或 id。 */
  activeId?: string;
  /** 点击指标卡回调。 */
  onSelect?: (item: AfProjectKpiItem, index: number) => void;
  /** 是否显示底部注释，默认 false。 */
  showNote?: boolean;
  /** 底部说明文案。 */
  note?: ReactNode;
  className?: string;
};

const DEFAULT_ITEMS: AfProjectKpiItem[] = defaultMetrics.map((m, i) => ({
  id: `kpi-${i}`,
  label: m.label,
  value: m.value,
  format: m.format,
  delta: m.delta,
  hint: m.hint,
  spark: metricSparks[i],
}));

/** 平滑面积迷你趋势线（对齐 KpiBoard Clean 视觉层级，支持指针悬停磁吸准星检视）。 */
function KpiMiniSpark({
  values,
  tone,
  gradId,
  activeIndex,
}: {
  values: number[];
  tone: "accent" | "danger" | "neutral";
  gradId: string;
  activeIndex?: number | null;
}) {
  if (values.length < 2) return null;
  const w = 156;
  const h = 34;
  const padX = 3;
  const padY = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, idx) => {
    const x = padX + (idx / (values.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return { x, y };
  });

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  const activePt = activeIndex !== null && activeIndex !== undefined ? pts[activeIndex] : undefined;
  const area = `${d} L ${last.x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`;
  const strokeColor =
    tone === "danger" ? "var(--af-danger)" : tone === "accent" ? "var(--af-accent)" : "var(--af-text)";

  return (
    <svg className="af-pj-kpi__spark-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={tone === "neutral" ? 0.1 : 0.18} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {activePt ? (
        <>
          <line
            x1={activePt.x}
            y1={2}
            x2={activePt.x}
            y2={h - 2}
            stroke="var(--af-line-strong)"
            strokeWidth="1"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={activePt.x} cy={activePt.y} r="3" fill={strokeColor} stroke="var(--af-surface)" strokeWidth="1.5" />
        </>
      ) : (
        <circle cx={last.x} cy={last.y} r="2.3" fill={strokeColor} />
      )}
    </svg>
  );
}

/** 工作台指标卡：tabular-nums 等宽数字 + 柔和渐变走势 + 语义趋势胶囊，支持时间窗切换。 */
function ProjectKpiCard({
  items: itemsProp,
  range: rangeProp,
  defaultRange = "7d",
  onRangeChange,
  rangeOptions = [
    { value: "7d", label: "近 7 天" },
    { value: "30d", label: "近 30 天" },
  ],
  title = "数据概览",
  subtitle = "核心请求量、费用预估与资源使用趋势",
  activeId: activeIdProp,
  onSelect,
  showNote = false,
  note = "数字采用 tabular-nums 等宽对齐；hover 轻阴影强化，点击可锁定焦点的走势指标卡。",
  className,
}: AfProjectKpiCardProps = {}) {
  const uid = useId().replace(/:/g, "");
  const [innerRange, setInnerRange] = useState<"7d" | "30d">(defaultRange);
  const [innerActive, setInnerActive] = useState<string>(DEFAULT_ITEMS[0].id);
  const [scrub, setScrub] = useState<{ cardId: string; index: number } | null>(null);
  const range = rangeProp ?? innerRange;
  const activeId = activeIdProp ?? innerActive;

  const baseItems = itemsProp ?? DEFAULT_ITEMS;
  const displayItems =
    itemsProp || range === "7d"
      ? baseItems
      : baseItems.map((item) => ({
          ...item,
          value:
            typeof item.value === "number" && item.format !== "percent"
              ? Math.round(item.value * 3.8 * 100) / 100
              : item.value,
          delta: item.delta !== undefined ? Number((item.delta * 0.85).toFixed(1)) : undefined,
          spark: item.spark ? item.spark.map((v, idx) => Math.round(v * (0.92 + (idx % 3) * 0.08))) : undefined,
        }));

  const numericTargets = displayItems.map((item) => (typeof item.value === "number" ? item.value : 0));
  const tweenedValues = useTweens(numericTargets, 460);

  const setRange = (next: "7d" | "30d") => {
    if (rangeProp === undefined) setInnerRange(next);
    onRangeChange?.(next);
  };

  const handleSparkMove = (e: ReactPointerEvent<HTMLSpanElement>, cardId: string, len: number) => {
    if (len < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (len - 1));
    setScrub((prev) => (prev?.cardId === cardId && prev.index === idx ? prev : { cardId, index: idx }));
  };

  return (
    <div className={cn("af-pj-kpis-wrap", className)}>
      {title || rangeOptions ? (
        <div className="af-pj-kpis__head">
          <div className="af-pj-cardhead__titles">
            {title ? <span className="af-pj-cardhead__title">{title}</span> : null}
            {subtitle ? <span className="af-pj-cardhead__desc">{subtitle}</span> : null}
          </div>
          {rangeOptions ? (
            <AfSegmented
              size="sm"
              value={range}
              onChange={(next) => setRange(next as "7d" | "30d")}
              options={rangeOptions}
            />
          ) : null}
        </div>
      ) : null}
      <div className="af-pj-kpis">
        {displayItems.map((item, i) => {
          const isActive = activeId === item.id;
          const animNumber =
            typeof item.value === "number"
              ? item.format === "money"
                ? Math.round((tweenedValues[i] ?? item.value) * 100) / 100
                : Math.round(tweenedValues[i] ?? item.value)
              : 0;
          const formatted =
            typeof item.value === "string"
              ? item.value
              : formatMetric(animNumber, item.format ?? "count");
          const isNeg = item.delta !== undefined && item.delta < 0;
          const sparkTone: "accent" | "danger" | "neutral" = isNeg ? "danger" : isActive ? "accent" : "neutral";
          const activeScrubIdx = scrub?.cardId === item.id ? scrub.index : null;
          const scrubSample = activeScrubIdx !== null && item.spark ? item.spark[activeScrubIdx] : undefined;
          const deltaText =
            item.delta !== undefined
              ? item.delta > 0
                ? `+${item.delta}%`
                : `${item.delta}%`
              : (item.deltaLabel ?? item.trend);

          return (
            <button
              key={item.id}
              type="button"
              className="af-pj-kpi"
              data-active={isActive || undefined}
              aria-pressed={isActive}
              onClick={() => {
                if (activeIdProp === undefined) setInnerActive(item.id);
                onSelect?.(item, i);
              }}
            >
              <span className="af-pj-kpi__top">
                <span className="af-pj-kpi__label">{item.label}</span>
                {scrubSample !== undefined && activeScrubIdx !== null ? (
                  <span className="af-pj-kpi__scrub-pill">
                    #{activeScrubIdx + 1} · {scrubSample}
                  </span>
                ) : deltaText ? (
                  <span className="af-pj-delta" data-tone={isNeg ? "danger" : "success"}>
                    {deltaText}
                  </span>
                ) : (
                  <span className="af-pj-kpi__badge">实时</span>
                )}
              </span>
              <span className="af-pj-kpi__value">{formatted}</span>
              {item.spark ? (
                <span
                  className="af-pj-kpi__spark"
                  aria-hidden="true"
                  onPointerMove={(e) => handleSparkMove(e, item.id, item.spark!.length)}
                  onPointerLeave={() => setScrub((prev) => (prev?.cardId === item.id ? null : prev))}
                >
                  <KpiMiniSpark
                    values={item.spark}
                    tone={sparkTone}
                    gradId={`af-pj-kpi-${uid}-${i}`}
                    activeIndex={activeScrubIdx}
                  />
                </span>
              ) : null}
              {item.hint ? (
                <span className="af-pj-kpi__trend">
                  <span className="af-pj-kpi__dot" data-active={isActive || undefined} aria-hidden="true" />
                  <span className="af-pj-kpi__hint">{item.hint}</span>
                </span>
              ) : null}
            </button>
          );
        })}
        {showNote && note ? (
          <p className="af-pj-note">
            <AfIcon name="info" size={13} />
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export { ProjectKpiCard as AfProjectKpiCard };
