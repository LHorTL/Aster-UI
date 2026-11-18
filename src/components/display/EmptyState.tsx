import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

/** 空状态属性（对齐 affectUI EmptyState 与 Aster 契约）。 */
export type AfEmptyStateProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  /** 前置图标槽：支持内置图标键名、自定义 SVG 节点；传 `null` 可隐藏图标方块并上提标题。 */
  icon?: AffectIconKey | ReactNode | null;
  /** 向后兼容别名：等价于 `icon`。 */
  art?: ReactNode;
  /** 标题（渲染为 `<p>`，不绑架页面标题层级）。 */
  title: ReactNode;
  /** 说明文案（对齐 affectUI `text`）。 */
  text?: ReactNode;
  /** 向后兼容别名：等价于 `text`。 */
  description?: ReactNode;
  /** 操作按钮槽（对齐 affectUI `action`）。 */
  action?: ReactNode;
  /** 向后兼容别名：等价于 `action`。 */
  actions?: ReactNode;
  /** 已经位于卡片内时去框去底（默认 `false` 显示柔和浅洗底 + 0.5px 内嵌发丝框）。 */
  bare?: boolean;
  /** 页面级大留白高度档位。 */
  tall?: boolean;
  /** 尺寸：`"md"` 标准档 / `"sm"` 紧凑档。 */
  size?: "sm" | "md";
  /** 向后兼容容器外观：`"framed"` 或 `"bare"`。 */
  variant?: "bare" | "framed";
};

function DefaultEmptyGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.5 2.75h5.8L15.25 6.7v9.55a1.5 1.5 0 0 1-1.5 1.5h-8.25a1.5 1.5 0 0 1-1.5-1.5V4.25a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M11 2.9V6.8h3.9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.25 10.75h5.5M7.25 13.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 空状态容器（对齐 affectUI EmptyState）：
 * - 默认具备安静柔和浅洗底与 0.5px 内嵌发丝边缘（`bare` 或 `variant="bare"` 时去框融入外层卡片）；
 * - 42×42 圆角 11px 图标柔底方块（`icon={null}` 可显式隐藏），正文限制在 320px 最佳阅读宽度。
 */
export const AfEmptyState = forwardRef<HTMLDivElement, AfEmptyStateProps>(function AfEmptyState(
  {
    icon,
    art,
    title,
    text,
    description,
    action,
    actions,
    bare,
    tall = false,
    size = "md",
    variant,
    className,
    ...rest
  },
  ref,
) {
  const isBare = bare !== undefined ? bare : variant !== undefined ? variant === "bare" : false;
  const resolvedVariant = isBare ? "bare" : "framed";
  const resolvedDesc = text ?? description;
  const resolvedAction = action ?? actions;
  const hideIcon = icon === null;
  const iconSource = icon !== undefined ? icon : art;
  const glyphSize = size === "sm" ? 18 : 20;

  return (
    <div
      ref={ref}
      className={cn("af-empty-state", className)}
      data-size={size}
      data-variant={resolvedVariant}
      data-bare={isBare || undefined}
      data-tall={tall || undefined}
      {...rest}
    >
      {!hideIcon ? (
        <span className="af-empty-state__art af-empty-state__icon" aria-hidden="true">
          {iconSource === undefined ? (
            <DefaultEmptyGlyph size={glyphSize} />
          ) : typeof iconSource === "string" ? (
            <AfIcon name={iconSource as AffectIconKey} size={glyphSize} />
          ) : (
            iconSource
          )}
        </span>
      ) : null}
      <p className="af-empty-state__title">{title}</p>
      {resolvedDesc !== undefined && resolvedDesc !== null ? (
        <p className="af-empty-state__desc">{resolvedDesc}</p>
      ) : null}
      {resolvedAction !== undefined && resolvedAction !== null ? (
        <div className="af-empty-state__actions">{resolvedAction}</div>
      ) : null}
    </div>
  );
});
