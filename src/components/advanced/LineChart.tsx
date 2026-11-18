import { useIsomorphicLayoutEffect } from "../../primitives";
import { useRef, useState } from "react";
import { AfLineChartProps, AfLineSeries, lineSwatch, linearPath, niceMax, smooth } from "./shared";

/**
 * KPI 折线图：支持任意多序列（默认调色板，末序列固定灰），直线段、无面积；
 * 轴 11px muted、浅虚线网格、tooltip 160/r10/8×8 色块、吸附 90ms、画线 1.1s；
 * 悬停图例时其余序列降到 0.3。挂载时从左到右画出。
 */
export function AfLineChart({
  labels,
  series,
  format,
  formatAxis = format,
  height = 220,
  label,
  curve = "linear",
  area = false,
  showLegend = true,
  restingDot = true,
  yMax,
}: AfLineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const lastHoverRef = useRef(Math.max(0, labels.length - 1));
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const [glide, setGlide] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [tipW, setTipW] = useState(160);

  useIsomorphicLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) {
        setWidth((prev) => (prev === el.clientWidth ? prev : el.clientWidth));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (tipRef.current) setTipW(tipRef.current.offsetWidth);
  }, [hover, series]);

  const count = labels.length;
  if (count === 0 || series.length === 0) {
    return <div className="af-line" style={{ minHeight: height }} role="img" aria-label={label} />;
  }

  const padLeft = 44;
  const padTop = 10;
  const padBottom = 26;
  const plotW = Math.max(10, width - padLeft - 4);
  const plotH = Math.max(10, height - padTop - padBottom);
  const rawMax = Math.max(0, ...series.flatMap((item) => item.values));
  const max = yMax ?? (niceMax(rawMax * 1.05) || 1);
  const x = (index: number) => padLeft + (count === 1 ? plotW / 2 : (index / (count - 1)) * plotW);
  const y = (value: number) => padTop + plotH - (value / max) * plotH;
  const ticks = [0, max / 2, max];
  // 对比序列永远画在最后；其余保持调用方顺序
  const ordered = [...series].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "compare" ? 1 : -1));
  // 默认调色板：前 N-1 条取 --af-series-1..4，末序列固定灰；对比序列固定灰色虚线
  const colorOf = (item: AfLineSeries, index: number) => {
    if (item.color) return item.color;
    if (item.kind === "compare") return "var(--af-series-5)";
    if (ordered.length === 1) return "var(--af-series-1)";
    if (index === ordered.length - 1) return "var(--af-series-5)";
    return `var(--af-series-${(index % 4) + 1})`;
  };
  const paths = ordered.map((item, index) => {
    const color = colorOf(item, index);
    const points = item.values.map((value, pointIndex) => [x(pointIndex), y(value)] as [number, number]);
    const line = curve === "smooth" ? smooth(points) : linearPath(points);
    const areaPath = `${line} L${x(count - 1).toFixed(1)},${padTop + plotH} L${x(0).toFixed(1)},${padTop + plotH} Z`;
    return { item, color, points, line, areaPath, dashed: item.kind === "compare" };
  });

  /** 根据指针横坐标找到最近的数据点：初入 0ms 原地淡入，跨点 90ms 平滑磁吸。 */
  const onMove = (event: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const zoom = rect.width / (wrapRef.current!.offsetWidth || 1);
    const localX = (event.clientX - rect.left) / zoom;
    const ratio = (localX - padLeft) / plotW;
    const nextIdx = count <= 1 ? 0 : Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
    if (hover === null) {
      setGlide(false);
      setHover(nextIdx);
    } else if (nextIdx !== hover) {
      setGlide(true);
      setHover(nextIdx);
    }
  };

  const onLeave = () => {
    setHover(null);
    setGlide(false);
  };

  if (hover !== null) {
    lastHoverRef.current = hover;
  }
  const shown = Math.max(0, Math.min(count - 1, hover ?? lastHoverRef.current));
  const px = x(shown);
  const flip = px + 14 + tipW > width;
  const tipX = flip ? px - 14 - tipW : px + 14;
  const middle = Math.round((count - 1) / 2);
  const tailPoint = paths[0]?.points[count - 1];

  return (
    <div className="af-line">
      {showLegend ? (
        <div className="af-line__legend" role="list">
          {paths.map(({ item, color, dashed }) => (
            <span
              key={item.name}
              role="listitem"
              className="af-line__key"
              data-dim={(focus !== null && focus !== item.name) || undefined}
              onPointerEnter={() => setFocus(item.name)}
              onPointerLeave={() => setFocus(null)}
            >
              <i style={lineSwatch(color, dashed)} aria-hidden />
              {item.name}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className="af-line__plot"
        ref={wrapRef}
        style={{ height }}
        data-glide={glide ? "true" : undefined}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        role="img"
        aria-label={label}
      >
        <svg width={width} height={height} className="af-line__svg">
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="af-line__grid" x1={padLeft} x2={width} y1={y(tick)} y2={y(tick)} />
              <text className="af-line__tick" x={padLeft - 10} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {/* 序列数量或长度变化时重新挂载，通过 pathLength="1" + stroke-dashoffset 匀速描边；数值变化则平滑形变 */}
          <g className="af-line__series" key={`${count}-${ordered.length}`}>
            {paths.map(({ item, color, line, areaPath, dashed }) => (
              <g key={item.name} className="af-line__s" data-dim={(focus !== null && focus !== item.name) || undefined}>
                {area && !dashed ? <path className="af-line__area" style={{ d: `path("${areaPath}")`, fill: color } as React.CSSProperties} /> : null}
                <path
                  className="af-line__path"
                  pathLength={dashed ? undefined : 1}
                  data-dash={dashed || undefined}
                  style={{ d: `path("${line}")`, stroke: color } as React.CSSProperties}
                />
              </g>
            ))}
          </g>
          {restingDot && tailPoint ? (
            <circle
              className="af-line__rest-dot"
              cx={tailPoint[0]}
              cy={tailPoint[1]}
              r={3.5}
              style={{ fill: paths[0].color }}
              data-hidden={hover !== null || undefined}
            />
          ) : null}
          <line className="af-line__guide" x1={0} x2={0} y1={padTop} y2={padTop + plotH} style={{ transform: `translateX(${px}px)` }} data-visible={hover !== null || undefined} />
          {paths.map(({ item, color, points, dashed }) => {
            const pt = points[shown] ?? [px, y(0)];
            return (
              <circle
                key={item.name}
                className="af-line__dot"
                data-dash={dashed || undefined}
                data-visible={hover !== null || undefined}
                r={3.5}
                style={{ transform: `translate(${pt[0]}px, ${pt[1]}px)`, fill: color }}
              />
            );
          })}
        </svg>
        <div className="af-line__labels" aria-hidden>
          {[0, middle, count - 1]
            .filter((value, index, list) => list.indexOf(value) === index)
            .map((index) => (
              <span key={index} data-edge={index === 0 ? "start" : index === count - 1 ? "end" : undefined} style={{ left: x(index) }}>
                {labels[index]}
              </span>
            ))}
        </div>
        <div className="af-line__tip" ref={tipRef} data-visible={hover !== null || undefined} style={{ transform: `translateX(${tipX}px)` }}>
          <span className="af-line__tip-title">{labels[shown]}</span>
          {paths.map(({ item, color, dashed }) => (
            <span key={item.name} className="af-line__tip-row">
              <i style={lineSwatch(color, dashed)} aria-hidden />
              <span>{item.name}</span>
              <b>{format(item.values[shown] ?? 0)}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
