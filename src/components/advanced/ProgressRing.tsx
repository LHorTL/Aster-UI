
/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */

/** 分段进度环：每一步一段弧，完成的段依次描出；中心可放计数。 */
import type { AfTone } from "../display/Tag";

/** 环形进度属性：支持分段计数模式 (`segments` / `done`) 与连续百分比模式 (`value` / `max`)。 */
export type AfProgressRingProps = {
  /** 分段总数（分段模式，默认 4）。 */
  segments?: number;
  /** 已完成段数（分段模式，默认 2）。 */
  done?: number;
  /** 连续进度值（传入后切换为连续百分比模式）。 */
  value?: number;
  /** 连续进度最大值（默认 100）。 */
  max?: number;
  /** 语义色调。 */
  tone?: AfTone;
  /** 直径（px，默认 36）。 */
  size?: number;
  /** 无障碍标签。 */
  label?: string;
  /** 是否在中心显示数字（分段模式显示 `done`，连续模式显示百分比）。 */
  showCount?: boolean;
  /** 额外类名。 */
  className?: string;
};

/** 环形进度指示器（分段式 / 连续百分比双模式）。 */
export function AfProgressRing({
  segments = 4,
  done = 2,
  value,
  max = 100,
  tone,
  size = 36,
  label = "进度",
  showCount = true,
  className,
}: AfProgressRingProps = {}) {
  const stroke = size >= 32 ? 3 : 2.5;
  const r = size / 2 - stroke;
  const circumference = 2 * Math.PI * r;
  const isContinuous = value !== undefined;
  const safeMax = max > 0 ? max : 100;
  const clampedValue = isContinuous ? Math.max(0, Math.min(safeMax, value)) : 0;
  const pct = isContinuous ? Math.round((clampedValue / safeMax) * 100) : 0;
  const safeSegments = Math.max(1, segments);
  const gap = safeSegments > 1 ? 3.2 : 0;
  const seg = circumference / safeSegments - gap;
  const dash = isContinuous ? (pct / 100) * circumference : 0;

  return (
    <span
      className={className ? `af-ring2 ${className}` : "af-ring2"}
      data-tone={tone}
      data-continuous={isContinuous ? "true" : undefined}
      style={{ width: size, height: size }}
    >
      <progress
        className="af-sr-only"
        aria-label={label}
        value={isContinuous ? clampedValue : Math.max(0, Math.min(safeSegments, done))}
        max={isContinuous ? safeMax : safeSegments}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {isContinuous ? (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              data-done="true"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={circumference / 4}
              style={{ opacity: pct > 0 ? 1 : 0 }}
            />
          </>
        ) : (
          Array.from({ length: safeSegments }, (_, index) => (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              data-done={index < done || undefined}
              strokeDasharray={`${seg} ${circumference - seg}`}
              strokeDashoffset={-(index * (seg + gap)) + circumference / 4}
              style={{ animationDelay: `${index * 60}ms` }}
            />
          ))
        )}
      </svg>
      {showCount ? (
        <span className="af-ring2__count" key={isContinuous ? "continuous" : done} aria-hidden="true">
          {isContinuous ? `${pct}%` : done}
        </span>
      ) : null}
    </span>
  );
}
