import { forwardRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";
import type { AfTone } from "./Tag";

/** 多段计量条单片配置。 */
export type AfMeterSegment = {
  /** 唯一键值。 */
  key: string;
  /** 分段名称。 */
  label: ReactNode;
  /** 分段数值。 */
  value: number;
  /** 语义色调。 */
  tone?: AfTone;
  /** 自定义填充色（优先使用 CSS 变量如 `var(--af-data-1)`）。 */
  color?: string;
};

/** 多段计量条属性。 */
export type AfMeterBarProps = {
  /** 各分段数据（省略时展示默认用量示例）。 */
  segments?: AfMeterSegment[];
  /** 总量分母；省略时自动按各分段之和计算。 */
  total?: number;
  /** 轨道高度：xs 4px / sm 6px（默认）/ md 8px。 */
  size?: "xs" | "sm" | "md";
  /** 是否在下方展示交互式图例，默认 false。 */
  showLegend?: boolean;
  /** 悬停或聚焦图例时是否淡化其他分段；传入 `showLegend` 时默认 true。 */
  interactive?: boolean;
  /** 图例数值格式化函数。 */
  formatValue?: (value: number, pct: number) => ReactNode;
  /** 无障碍名称。 */
  label?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

const DEFAULT_SEGMENTS: AfMeterSegment[] = [
  { key: "input", label: "输入 Token", value: 46, color: "var(--af-data-1)" },
  { key: "cache", label: "缓存复用", value: 28, color: "var(--af-data-2)" },
  { key: "output", label: "输出生成", value: 14, color: "var(--af-data-3)" },
];

const FALLBACK_COLORS = [
  "var(--af-data-1)",
  "var(--af-data-2)",
  "var(--af-data-3)",
  "var(--af-data-4)",
  "var(--af-data-rest)",
];

function resolveSegmentColor(seg: AfMeterSegment, index: number): string {
  if (seg.color) return seg.color;
  if (seg.tone === "success") return "var(--af-success)";
  if (seg.tone === "warning") return "var(--af-warning)";
  if (seg.tone === "danger") return "var(--af-danger)";
  if (seg.tone === "info" || seg.tone === "accent") return "var(--af-accent)";
  if (seg.tone === "neutral") return "var(--af-data-rest)";
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * 多段比例计量条：纯 Flexbox 分段轨道，支持各语义色/数据色比例切分、剩余空轨与悬停高亮联动图例。
 */
export const AfMeterBar = forwardRef<HTMLDivElement, AfMeterBarProps>(function AfMeterBar(
  {
    segments = DEFAULT_SEGMENTS,
    total,
    size = "sm",
    showLegend = false,
    interactive,
    formatValue,
    label = "用量构成",
    className,
    style,
  },
  ref,
) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const canHover = interactive ?? showLegend;
  const sum = segments.reduce((acc, seg) => acc + Math.max(0, seg.value), 0);
  const denom = Math.max(total ?? sum, sum, 1);

  return (
    <div
      ref={ref}
      className={cn("af-meter-bar", className)}
      style={style}
      data-size={size !== "sm" ? size : undefined}
      role="group"
      aria-label={label}
    >
      <div className="af-meter-bar__track">
        {segments.map((seg, index) => {
          const val = Math.max(0, seg.value);
          if (val <= 0) return null;
          const pct = (val / denom) * 100;
          const bg = resolveSegmentColor(seg, index);
          const dimmed = hoveredKey !== null && hoveredKey !== seg.key;
          return (
            <span
              key={seg.key}
              className="af-meter-bar__seg"
              data-tone={seg.tone}
              data-dim={dimmed ? "true" : undefined}
              style={{ width: `${pct}%`, background: bg }}
              title={typeof seg.label === "string" ? `${seg.label}: ${Math.round(pct)}%` : undefined}
              onPointerEnter={canHover ? () => setHoveredKey(seg.key) : undefined}
              onPointerLeave={canHover ? () => setHoveredKey(null) : undefined}
            />
          );
        })}
      </div>

      {showLegend ? (
        <div className="af-meter-bar__legend">
          {segments.map((seg, index) => {
            const val = Math.max(0, seg.value);
            const pct = denom > 0 ? Math.round((val / denom) * 100) : 0;
            const bg = resolveSegmentColor(seg, index);
            const dimmed = hoveredKey !== null && hoveredKey !== seg.key;
            const valueNode = formatValue ? formatValue(val, pct) : `${pct}%`;
            return (
              <span
                key={seg.key}
                className="af-meter-bar__item"
                data-dim={dimmed ? "true" : undefined}
                tabIndex={canHover ? 0 : undefined}
                onPointerEnter={canHover ? () => setHoveredKey(seg.key) : undefined}
                onPointerLeave={canHover ? () => setHoveredKey(null) : undefined}
                onFocus={canHover ? () => setHoveredKey(seg.key) : undefined}
                onBlur={canHover ? () => setHoveredKey(null) : undefined}
              >
                <i className="af-meter-bar__swatch" style={{ background: bg }} aria-hidden="true" />
                <span className="af-meter-bar__name">{seg.label}</span>
                <span className="af-meter-bar__val">{valueNode}</span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});
