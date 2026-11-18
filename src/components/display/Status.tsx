import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";
import type { AfTone } from "./Tag";

export type AfStatusProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AfTone;
  pulse?: boolean;
  /** 仅渲染状态圆点，不含文字。 */
  dotOnly?: boolean;
  /** 圆点尺寸：sm 6px / md 默认 7px。 */
  size?: "sm" | "md";
  /** 纯圆点模式下的无障碍标签。 */
  ariaLabel?: string;
  children?: ReactNode;
};

/** 状态点 + 文字；运行中的点带一圈缓慢呼吸；传入 `dotOnly` 或省略 `children` 时仅渲染纯状态点。 */
export const AfStatus = forwardRef<HTMLSpanElement, AfStatusProps>(function AfStatus(
  { tone = "neutral", pulse, dotOnly, size = "md", ariaLabel, className, children, ...rest },
  ref,
) {
  const isDotOnly = Boolean(dotOnly || children === undefined || children === null || children === "");
  return (
    <span
      ref={ref}
      className={cn("af-status", className)}
      data-tone={tone}
      data-pulse={pulse || undefined}
      data-dot-only={isDotOnly ? "true" : undefined}
      data-size={size !== "md" ? size : undefined}
      aria-label={ariaLabel}
      aria-hidden={isDotOnly && !ariaLabel ? true : undefined}
      {...rest}
    >
      <span className="af-status__dot" aria-hidden="true" />
      {isDotOnly ? null : children}
    </span>
  );
});
