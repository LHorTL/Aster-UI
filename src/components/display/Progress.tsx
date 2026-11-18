import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { cn, useReducedMotion } from "../../primitives";
import type { AfTone } from "./Tag";

export type AfProgressProps = ComponentPropsWithoutRef<"div"> & {
  /** 当前数值（未指定 `max` 时默认按 0~100 百分比解释；`indeterminate` 时可省略）。 */
  value?: number;
  /** 最大值，默认 `100`。 */
  max?: number;
  tone?: AfTone;
  /** 无障碍名称（也可通过 `aria-label` 传入）。 */
  label?: string;
  /** 是否为不确定进度的循环指示条。 */
  indeterminate?: boolean;
  /** 是否在轨道右侧显示等宽百分比读数。 */
  showValue?: boolean;
  /** 轨道厚度：xs 3px / sm 4px（默认）/ md 6px。 */
  size?: "xs" | "sm" | "md";
  /** 数值更新时是否播放高光扫光动画，默认 true；高频实时更新建议设 false。 */
  animated?: boolean;
};

/** 进度条：进入视野时从 0 在 1.1s 内平滑长到目标值，每次增长重放一次扫光（animated=false 或减动效模式下静态更新）。 */
export const AfProgress = forwardRef<HTMLDivElement, AfProgressProps>(function AfProgress(
  {
    value = 0,
    max = 100,
    tone = "accent",
    label,
    indeterminate = false,
    showValue = false,
    size = "sm",
    animated = true,
    className,
    "aria-label": ariaLabelProp,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotion();
  const shouldAnimate = animated && !reduced;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const [shown, setShown] = useState(shouldAnimate ? 0 : pct);
  const resolvedLabel = ariaLabelProp ?? label ?? "进度";

  useEffect(() => {
    if (indeterminate) return;
    if (!shouldAnimate) {
      setShown(pct);
      return;
    }
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct, shouldAnimate, indeterminate]);

  const bar = (
    <div
      ref={showValue ? undefined : ref}
      className={cn("af-progress", !showValue && className)}
      data-tone={tone}
      data-size={size !== "sm" ? size : undefined}
      data-static={!shouldAnimate ? "true" : undefined}
      data-indeterminate={indeterminate ? "true" : undefined}
      role="progressbar"
      aria-label={resolvedLabel}
      aria-valuenow={indeterminate ? undefined : Math.round(value * 100) / 100}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      {...(!showValue ? rest : null)}
    >
      <span
        className="af-progress__fill"
        style={indeterminate ? undefined : { transform: `scaleX(${shown / 100})` }}
      >
        {shouldAnimate && !indeterminate ? (
          <span className="af-progress__shine" key={pct} aria-hidden="true" />
        ) : null}
      </span>
    </div>
  );

  if (!showValue) return bar;

  return (
    <div ref={ref} className={cn("af-progress-row", className)} {...rest}>
      {bar}
      {!indeterminate ? <span className="af-progress-row__val">{Math.round(pct)}%</span> : null}
    </div>
  );
});
