import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

/** 描述列表单项配置。 */
export type AfDescriptionItem = {
  /** 唯一键值。 */
  key?: string;
  /** 字段名。 */
  label: ReactNode;
  /** 字段值内容。 */
  children: ReactNode;
  /** 标签前置图标。 */
  icon?: AffectIconKey | ReactNode;
  /** 跨列数（1..columns）。 */
  span?: number;
  /** 值区域是否使用等宽数字字体。 */
  mono?: boolean;
};

/** 多列描述列表属性。 */
export type AfDescriptionsProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  /** 描述项列表（省略时展示默认运行元信息示例）。 */
  items?: AfDescriptionItem[];
  /** 可选区块标题。 */
  title?: ReactNode;
  /** 标题右侧额外操作。 */
  extra?: ReactNode;
  /** 桌面端每行列数：1 / 2 / 3（默认 2，纯 Flexbox 计算宽度，零 CSS Grid）。 */
  columns?: 1 | 2 | 3;
  /** 单项内部排布：horizontal 左右行 / vertical 上标签下值（默认 vertical）。 */
  layout?: "horizontal" | "vertical";
  /** 尺寸：sm / md（默认）。 */
  size?: "sm" | "md";
  /** 是否使用卡片发丝描边包裹，默认 false。 */
  bordered?: boolean;
};

const DEFAULT_DESCRIPTION_ITEMS: AfDescriptionItem[] = [
  { key: "run", label: "Run ID", children: "run-0482-a9f", mono: true },
  { key: "model", label: "当前模型", children: "claude-sonnet-4" },
  { key: "latency", label: "首字延迟", children: "312 ms", mono: true },
  { key: "status", label: "沙箱策略", children: "Workspace Write · 已审计" },
];

/**
 * 多列描述列表（AfKeyValue 的多栏升级版）：纯 Flexbox 折行计算列宽与跨列，零 CSS Grid；适合详情抽屉、运行元信息与审计摘要。
 */
export const AfDescriptions = forwardRef<HTMLElement, AfDescriptionsProps>(function AfDescriptions(
  {
    items = DEFAULT_DESCRIPTION_ITEMS,
    title,
    extra,
    columns = 2,
    layout = "vertical",
    size = "md",
    bordered = false,
    className,
    ...rest
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={cn("af-desc", className)}
      data-columns={columns}
      data-layout={layout}
      data-size={size !== "md" ? size : undefined}
      data-bordered={bordered ? "true" : undefined}
      {...rest}
    >
      {title || extra ? (
        <header className="af-desc__head">
          {title ? <h4 className="af-desc__title">{title}</h4> : <span />}
          {extra ? <div className="af-desc__extra">{extra}</div> : null}
        </header>
      ) : null}

      <div className="af-desc__list">
        {items.map((item, index) => {
          const span = Math.max(1, Math.min(item.span ?? 1, columns));
          const pct = `${(span / columns) * 100}%`;
          return (
            <div
              key={item.key ?? index}
              className="af-desc__item"
              data-span-full={span === columns ? "true" : undefined}
              style={{ flex: `0 0 ${pct}`, maxWidth: pct }}
            >
              <span className="af-desc__label">
                {item.icon ? (
                  typeof item.icon === "string" ? (
                    <AfIcon name={item.icon as AffectIconKey} size={13} />
                  ) : (
                    item.icon
                  )
                ) : null}
                <span>{item.label}</span>
              </span>
              <span className={cn("af-desc__val", item.mono && "af-desc__val--mono")}>{item.children}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
});
