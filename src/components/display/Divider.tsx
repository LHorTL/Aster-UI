import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

/** 分割线属性（对齐 affectUI Separator 与 Aster Divider 契约）。 */
export type AfDividerProps = ComponentPropsWithoutRef<"div"> & {
  /** 可选的居中标签（渲染为 `发丝线 · 标签 · 发丝线`）。 */
  label?: ReactNode;
  /** 上下外边距：`"none"`（无外边距，由父级 Flex gap 控制）/ `"sm"` 8px / `"md"` 16px。 */
  spacing?: "none" | "sm" | "md";
  /** 方向：水平（默认）或垂直（16px 行内竖向发丝线）。 */
  orientation?: "horizontal" | "vertical";
  /** 纯视觉装饰时设为 `true`（渲染 `role="none"`），语义分节时设为 `false`（渲染 `role="separator"`）。 */
  decorative?: boolean;
};

export type AfSeparatorProps = AfDividerProps;

/**
 * 1px 整数像素发丝分割线（对齐 affectUI Separator 与 Windows 1x/1.25x DPI 防消失契约）：
 * - 横向采用 `1px` + `var(--af-line)` 发丝线规避亚像素消失，纵向采用 16px 居中竖向发丝；
 * - 支持居中标签（`line · label · line`）与 `decorative` 无障碍语义切换。
 */
export const AfDivider = forwardRef<HTMLDivElement, AfDividerProps>(function AfDivider(
  { label, spacing = "none", orientation = "horizontal", decorative = false, className, ...rest },
  ref,
) {
  const roleAttr = decorative ? "none" : "separator";
  const orientationAttr = decorative ? undefined : orientation;
  const ariaLabelAttr =
    !decorative && rest["aria-label"] === undefined && typeof label === "string" ? label : rest["aria-label"];

  if (label === undefined || orientation === "vertical") {
    return (
      <div
        ref={ref}
        className={cn("af-divider", className)}
        role={roleAttr}
        aria-orientation={orientationAttr}
        aria-label={ariaLabelAttr}
        data-orientation={orientation}
        data-spacing={spacing}
        {...rest}
      />
    );
  }
  return (
    <div
      ref={ref}
      className={cn("af-divider af-divider--label", className)}
      role={roleAttr}
      aria-orientation={orientationAttr}
      aria-label={ariaLabelAttr}
      data-orientation={orientation}
      data-spacing={spacing}
      {...rest}
    >
      <span className="af-divider__line" aria-hidden="true" />
      <span className="af-divider__text">{label}</span>
      <span className="af-divider__line" aria-hidden="true" />
    </div>
  );
});

/** affectUI 标准命名导出：`AfSeparator` 默认纯装饰（`decorative = true`）且无外边距。 */
export const AfSeparator = forwardRef<HTMLDivElement, AfSeparatorProps>(function AfSeparator(
  { decorative = true, spacing = "none", ...props },
  ref,
) {
  return <AfDivider ref={ref} decorative={decorative} spacing={spacing} {...props} />;
});
