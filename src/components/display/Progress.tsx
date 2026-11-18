import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { cn, useReducedMotion } from "../../primitives";
import type { AfTone } from "./Tag";

export type AfProgressProps = ComponentPropsWithoutRef<"div"> & {
  value: number;
  tone?: AfTone;
  label: string;
  /** 轨道厚度：xs 3px / sm 4px（默认）/ md 6px。 */
  size?: "xs" | "sm" | "md";
  /** 数值更新时是否播放高光扫光动画，默认 true；高频实时更新建议设 false。 */
  animated?: boolean;
};

/** 进度条：进入视野时从 0 在 1.1s 内平滑长到目标值，每次增长重放一次扫光（animated=false 或减动效模式下静态更新）。 */
export const AfProgress = forwardRef<HTMLDivElement, AfProgressProps>(function AfProgress(
  { value, tone = "accent", label, size = "sm", animated = true, className, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const shouldAnimate = animated && !reduced;
  const clamped = Math.min(100, Math.max(0, value));
  const [shown, setShown] = useState(shouldAnimate ? 0 : clamped);
  useEffect(() => {
    if (!shouldAnimate) {
      setShown(clamped);
      return;
    }
    const id = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped, shouldAnimate]);
  return (
    <div
      ref={ref}
      className={cn("af-progress", className)}
      data-tone={tone}
      data-size={size !== "sm" ? size : undefined}
      data-static={!shouldAnimate ? "true" : undefined}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <span className="af-progress__fill" style={{ transform: `scaleX(${shown / 100})` }}>
        {shouldAnimate ? <span className="af-progress__shine" key={clamped} aria-hidden="true" /> : null}
      </span>
    </div>
  );
});
