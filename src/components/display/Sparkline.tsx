import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfSparklineTone = "ink" | "accent" | "success" | "danger" | "warning" | "info";

export type AfSparklineProps = {
  /** 数值序列。 */
  values?: number[];
  /** 语义色调，默认 `"ink"`。 */
  tone?: AfSparklineTone;
  /** 画布宽（px），默认 `96`。 */
  width?: number;
  /** 画布高（px），默认 `28`。 */
  height?: number;
  /** 是否绘制底部柔和面积填充，默认 `false`。 */
  showArea?: boolean;
  /** 是否开启指针磁吸检视（最近采样点圆点 + 垂直 1px 发丝参考线 + 等宽数字读数胶囊，初入原地淡入零飞入）。 */
  interactive?: boolean;
  /** 各采样点维度标签（如日期或小时，用于交互读数胶囊）。 */
  labels?: string[];
  /** 自定义读数胶囊格式化。 */
  formatValue?: (value: number, index: number) => ReactNode;
  /** 指针检视采样点变化回调。 */
  onHoverIndexChange?: (index: number | null, value: number | null) => void;
  className?: string;
};

function smoothPath(points: [number, number][]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M0,${points[0][1].toFixed(1)} L${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * 卡片内迷你趋势折线：
 * - 默认静态展示 `pathLength="1"` 匀速描边与末尾圆点；
 * - 开启 `interactive` 时支持指针最近采样点实时磁吸、垂直 `1px` 发丝游标与顶部 `tabular-nums` 读数胶囊（原地淡入，零横穿飞入）。
 */
export function AfSparkline({
  values = [],
  tone = "ink",
  width = 96,
  height = 28,
  showArea = false,
  interactive = false,
  labels,
  formatValue,
  onHoverIndexChange,
  className,
}: AfSparklineProps = {}) {
  const gradId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const w = Math.max(24, width);
  const h = Math.max(14, height);

  if (!values.length) {
    return (
      <svg
        className={cn("af-spark", className)}
        data-tone={tone}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-hidden="true"
      />
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const denom = Math.max(1, values.length - 1);
  const points = values.map(
    (value, index) =>
      [
        values.length === 1 ? w / 2 : (index / denom) * w,
        h - 3 - ((value - min) / (max - min || 1)) * (h - 6),
      ] as [number, number],
  );
  const lineD = smoothPath(points);
  const areaD =
    points.length >= 2
      ? `${lineD} L${points[points.length - 1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`
      : "";
  const last = points[points.length - 1];

  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const activeValue = hoverIdx !== null && values[hoverIdx] !== undefined ? values[hoverIdx] : null;

  const svgNode = (
    <svg
      className={cn("af-spark", !interactive && className)}
      data-tone={tone}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden={!interactive || undefined}
    >
      {showArea && areaD ? (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="af-spark__area" d={areaD} fill={`url(#${gradId})`} />
        </>
      ) : null}
      <path className="af-spark__line" d={lineD} pathLength={1} />
      <circle
        className="af-spark__dot"
        cx={last[0]}
        cy={last[1]}
        r={2.5}
        style={activePoint ? { opacity: 0.35 } : undefined}
      />
      {interactive && activePoint ? (
        <>
          <line
            className="af-spark__cursor"
            x1={activePoint[0]}
            y1={1}
            x2={activePoint[0]}
            y2={h - 1}
          />
          <circle
            className="af-spark__active-dot"
            cx={activePoint[0]}
            cy={activePoint[1]}
            r={3}
          />
        </>
      ) : null}
    </svg>
  );

  if (!interactive) {
    return svgNode;
  }

  const updatePointerIndex = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const el = wrapRef.current;
    if (!el || values.length === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nearest = Math.min(values.length - 1, Math.max(0, Math.round(ratio * denom)));
    if (nearest !== hoverIdx) {
      setHoverIdx(nearest);
      onHoverIndexChange?.(nearest, values[nearest] ?? null);
    }
  };

  const clearPointerIndex = () => {
    if (hoverIdx !== null) {
      setHoverIdx(null);
      onHoverIndexChange?.(null, null);
    }
  };

  const pillLeftPct = activePoint ? Math.min(92, Math.max(8, (activePoint[0] / w) * 100)) : 50;

  return (
    <span
      ref={wrapRef}
      className={cn("af-spark-wrap", className)}
      data-tone={tone}
      data-active={activePoint ? "true" : undefined}
      onPointerEnter={updatePointerIndex}
      onPointerMove={updatePointerIndex}
      onPointerLeave={clearPointerIndex}
    >
      {svgNode}
      {activePoint && activeValue !== null && hoverIdx !== null ? (
        <span className="af-spark__readout" style={{ left: `${pillLeftPct}%` }}>
          {labels?.[hoverIdx] ? <span className="af-spark__readout-label">{labels[hoverIdx]}</span> : null}
          <span className="af-spark__readout-val">
            {formatValue ? formatValue(activeValue, hoverIdx) : activeValue}
          </span>
        </span>
      ) : null}
    </span>
  );
}
