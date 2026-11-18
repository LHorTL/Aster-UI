import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";
import { AfSpinner } from "../display/Spinner";

/** 时间轴单项条目。 */
export type AfTimelineItem = {
  /** 唯一标识。 */
  key?: string;
  /** 节点标题。 */
  title?: ReactNode;
  /** 说明内容。 */
  description?: ReactNode;
  /** 右侧/时间戳信息。 */
  time?: ReactNode;
  /** 语义色调。 */
  tone?: "accent" | "neutral" | "success" | "warning" | "danger";
  /** 自定义节点圆点或图标。 */
  dot?: ReactNode;
};

/** 时间轴属性。 */
export type AfTimelineProps = ComponentPropsWithoutRef<"ol"> & {
  /** 时间轴数据列表。 */
  items: AfTimelineItem[];
  /** 是否在末尾（或 `reverse` 时在顶部）追加加载中的待定节点。 */
  pending?: boolean | ReactNode;
  /** 是否倒序排列。 */
  reverse?: boolean;
  /** 排布模式：左侧竖轨、交替左右、右侧竖轨。 */
  mode?: "left" | "alternate" | "right";
  /** 连线样式：实线或虚线。 */
  lineStyle?: "solid" | "dashed";
  /** 槽位类名覆盖（历史宿主迁移兼容契约）。 */
  itemClassName?: string;
  dotClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  timeClassName?: string;
};

/**
 * 时间轴：垂直轨道串联节点圆点与发丝连接线，支持 `left` / `alternate` / `right` 三态排版及全部槽位类名定制。
 */
export const AfTimeline = forwardRef<HTMLOListElement, AfTimelineProps>(function AfTimeline(
  {
    items,
    pending = false,
    reverse = false,
    mode = "left",
    lineStyle = "solid",
    itemClassName,
    dotClassName,
    contentClassName,
    titleClassName,
    descriptionClassName,
    timeClassName,
    className,
    ...rest
  },
  ref,
) {
  const ordered = reverse ? [...items].reverse() : items;
  const pendingItem: AfTimelineItem | null = pending
    ? {
        key: "__pending__",
        title: typeof pending === "boolean" ? "处理中…" : pending,
        tone: "accent",
        dot: <AfSpinner size={12} />,
      }
    : null;
  const allItems = pendingItem ? (reverse ? [pendingItem, ...ordered] : [...ordered, pendingItem]) : ordered;

  return (
    <ol
      ref={ref}
      className={cn("af-timeline", className)}
      data-mode={mode}
      data-line-style={lineStyle}
      {...rest}
    >
      {allItems.map((item, idx) => {
        const side = mode === "alternate" ? (idx % 2 === 0 ? "right" : "left") : undefined;
        return (
          <li key={item.key ?? idx} className={cn("af-timeline__item", itemClassName)} data-side={side}>
            <div className="af-timeline__rail" aria-hidden="true">
              <span
                className={cn("af-timeline__dot", dotClassName)}
                data-tone={item.tone ?? "accent"}
                data-custom={Boolean(item.dot) || undefined}
              >
                {item.dot}
              </span>
              <span className="af-timeline__line" />
            </div>
            <div className={cn("af-timeline__content", contentClassName)}>
              {item.title !== undefined || item.time !== undefined ? (
                <div className="af-timeline__head">
                  {item.title !== undefined ? <span className={cn("af-timeline__title", titleClassName)}>{item.title}</span> : null}
                  {item.time !== undefined ? <span className={cn("af-timeline__time", timeClassName)}>{item.time}</span> : null}
                </div>
              ) : null}
              {item.description !== undefined ? (
                <div className={cn("af-timeline__desc", descriptionClassName)}>{item.description}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
});
