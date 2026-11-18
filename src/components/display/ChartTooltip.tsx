import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

/** 图表浮层数据项。 */
export type AfChartTooltipItem = {
  /** 系列或字段名。 */
  name: string;
  /** 格式化后的值。 */
  value: ReactNode;
  /** 系列指示色。 */
  color?: string;
};

/** 图表浮层卡片容器属性。 */
export type AfChartTooltipSurfaceProps = ComponentPropsWithoutRef<"div"> & {
  /** 浮层标题或日期时间标签。 */
  title?: ReactNode;
  /** 可选指标列表；传入时自动渲染多行键值对。 */
  items?: AfChartTooltipItem[];
  /** 页脚补充说明。 */
  footer?: ReactNode;
  children?: ReactNode;
};

/** 图表专用浮层表面：统一处理高对比背板、发丝描边、等宽数字与图例圆点对齐。 */
export const AfChartTooltipSurface = forwardRef<HTMLDivElement, AfChartTooltipSurfaceProps>(
  function AfChartTooltipSurface({ title, items, footer, className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cn("af-chart-tooltip", className)} role="status" {...rest}>
        {title ? <div className="af-chart-tooltip__title">{title}</div> : null}
        {items && items.length > 0 ? (
          <div className="af-chart-tooltip__list">
            {items.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="af-chart-tooltip__row">
                <span className="af-chart-tooltip__name">
                  {item.color ? (
                    <span className="af-chart-tooltip__dot" style={{ background: item.color }} aria-hidden="true" />
                  ) : null}
                  <span>{item.name}</span>
                </span>
                <span className="af-chart-tooltip__value">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {children}
        {footer ? <div className="af-chart-tooltip__footer">{footer}</div> : null}
      </div>
    );
  },
);

/** 图表浮层（同 `AfChartTooltipSurface`）。 */
export const AfChartTooltip = AfChartTooltipSurface;
export type AfChartTooltipProps = AfChartTooltipSurfaceProps;

/** 历史宿主迁移兼容别名。 */
export const ChartTooltipSurface = AfChartTooltipSurface;
export type ChartTooltipSurfaceProps = AfChartTooltipSurfaceProps;
