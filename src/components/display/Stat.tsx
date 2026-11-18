import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";
import { AfSparkline } from "./Sparkline";
import { AfTag, type AfTone } from "./Tag";

/** 统计指标原语属性。 */
export type AfStatProps = ComponentPropsWithoutRef<"div"> & {
  /** 指标标题。 */
  label?: ReactNode;
  /** 核心数值（自动启用 `tabular-nums` 等宽对齐）。 */
  value?: ReactNode;
  /** 数值前缀（如 `¥` / `$`）。 */
  prefix?: ReactNode;
  /** 数值单位后缀（如 `ms` / `tok`）。 */
  suffix?: ReactNode;
  /** 环比或同比变化文案（如 `+12.4%`）。 */
  delta?: ReactNode;
  /** 变化趋势箭头方向。 */
  trend?: "up" | "down" | "flat";
  /** 变化胶囊语义色，默认按 `trend` 自动映射。 */
  deltaTone?: AfTone;
  /** 补充辅助说明。 */
  hint?: ReactNode;
  /** 右侧可选迷你趋势折线。 */
  sparkline?: number[];
  /** 尺寸：sm 紧凑 / md 默认 / lg 大号面板。 */
  size?: "sm" | "md" | "lg";
  /** 是否绘制发丝卡片底与阴影。 */
  bordered?: boolean;
};

/**
 * 统计指标原语：标准化呈现标题、等宽 `tabular-nums` 主数值、迷你趋势折线与趋势环比胶囊。
 */
export const AfStat = forwardRef<HTMLDivElement, AfStatProps>(function AfStat(
  {
    label = "总调用次数",
    value = "128,430",
    prefix,
    suffix,
    delta,
    trend,
    deltaTone,
    hint,
    sparkline,
    size = "md",
    bordered = false,
    className,
    ...rest
  },
  ref,
) {
  const resolvedTone: AfTone =
    deltaTone ?? (trend === "up" ? "success" : trend === "down" ? "danger" : "neutral");
  const trendIcon = trend === "up" ? "arrowUpRight" : trend === "down" ? "arrowDown" : undefined;

  return (
    <div
      ref={ref}
      className={cn("af-stat", className)}
      data-size={size !== "md" ? size : undefined}
      data-bordered={bordered ? "true" : undefined}
      {...rest}
    >
      {label ? <span className="af-stat__label">{label}</span> : null}
      <div className="af-stat__main">
        <div className="af-stat__figure">
          {prefix ? <span className="af-stat__affix">{prefix}</span> : null}
          <span className="af-stat__value">{value}</span>
          {suffix ? <span className="af-stat__affix">{suffix}</span> : null}
        </div>
        {sparkline?.length ? (
          <AfSparkline
            values={sparkline}
            tone={resolvedTone === "danger" ? "danger" : resolvedTone === "success" ? "success" : "accent"}
          />
        ) : null}
      </div>
      {delta !== undefined || hint ? (
        <div className="af-stat__foot">
          {delta !== undefined ? (
            <AfTag size="xs" shape="pill" variant="soft" tone={resolvedTone} icon={trendIcon}>
              {delta}
            </AfTag>
          ) : null}
          {hint ? <span className="af-stat__hint">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
});
