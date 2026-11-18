import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

/** 标签语义。 */
export type AfTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

/** 标签尺寸：md 为默认 24px（页面 / 卡片状态），sm 为 22px 紧凑档（控件行内），xs 为 20px 微型胶囊。 */
export type AfTagSize = "xs" | "sm" | "md";

export type AfTagProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AfTone;
  dot?: boolean;
  /** 前置图标名称或自定义节点。 */
  icon?: AffectIconKey | ReactNode;
  /** 是否显示移除按钮。 */
  closable?: boolean;
  /** 点击移除按钮回调。 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 移除按钮无障碍说明。 */
  closeLabel?: string;
  size?: AfTagSize;
  /** 圆角形态：rounded（默认微圆角）或 pill（全圆角胶囊）。 */
  shape?: "rounded" | "pill";
  /** 外观变体：ring（默认发丝描边）或 soft（纯柔和底色无描边）。 */
  variant?: "ring" | "soft";
  children: ReactNode;
};

/** 小号标签：文字色 + 同色 8~12% 底色，零硬边框；支持前置图标与可关闭操作。 */
export const AfTag = forwardRef<HTMLSpanElement, AfTagProps>(function AfTag(
  {
    tone = "neutral",
    dot,
    icon,
    closable,
    onClose,
    closeLabel,
    size = "md",
    shape = "rounded",
    variant = "ring",
    className,
    children,
    ...rest
  },
  ref,
) {
  const resolvedCloseLabel =
    closeLabel ?? (typeof children === "string" || typeof children === "number" ? `移除 ${children}` : "移除标签");

  return (
    <span
      ref={ref}
      className={cn("af-tag", closable && "af-tag--closable", className)}
      data-tone={tone}
      data-size={size}
      data-shape={shape !== "rounded" ? shape : undefined}
      data-variant={variant !== "ring" ? variant : undefined}
      {...rest}
    >
      {dot ? <span className="af-tag__dot" aria-hidden="true" /> : null}
      {icon ? (
        typeof icon === "string" ? (
          <AfIcon name={icon as AffectIconKey} size={size === "xs" || size === "sm" ? 11 : 12} className="af-tag__icon" />
        ) : (
          <span className="af-tag__icon" aria-hidden="true">
            {icon}
          </span>
        )
      ) : null}
      <span className="af-tag__label">{children}</span>
      {closable ? (
        <button
          type="button"
          className="af-tag__close"
          aria-label={resolvedCloseLabel}
          onClick={(event) => {
            event.stopPropagation();
            onClose?.(event);
          }}
        >
          <AfIcon name="x" size={10} />
        </button>
      ) : null}
    </span>
  );
});
