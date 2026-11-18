import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn } from "../../primitives";

/** 标签语义。 */
export type AfTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

/** 标签尺寸：md 为默认 24px（页面 / 卡片状态），sm 为 22px 紧凑档（控件行内），xs 为 20px 微型胶囊。 */
export type AfTagSize = "xs" | "sm" | "md";

export type AfTagProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AfTone;
  dot?: boolean;
  /** 前置图标名称或自定义节点。 */
  icon?: AfIconName | ReactNode;
  /** 是否显示移除按钮。 */
  closable?: boolean;
  /** `closable` 兼容别名。 */
  removable?: boolean;
  /** 点击移除按钮回调。 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** `onClose` 兼容别名。 */
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 移除按钮无障碍说明。 */
  closeLabel?: string;
  size?: AfTagSize;
  /** 圆角形态：rounded（默认微圆角）或 pill（全圆角胶囊）。 */
  shape?: "rounded" | "pill";
  /** 外观变体：ring（默认发丝描边）或 soft（纯柔和底色无描边）。 */
  variant?: "ring" | "soft";
  /** 是否保留发丝描边环（传 `false` 时自动切换至 `variant="soft"`）。 */
  bordered?: boolean;
  children: ReactNode;
};

/** 小号标签：文字色 + 同色 8~12% 底色，零硬边框；支持前置图标与可关闭操作。 */
export const AfTag = forwardRef<HTMLSpanElement, AfTagProps>(function AfTag(
  {
    tone = "neutral",
    dot,
    icon,
    closable,
    removable,
    onClose,
    onRemove,
    closeLabel,
    size = "md",
    shape = "rounded",
    variant,
    bordered,
    className,
    children,
    ...rest
  },
  ref,
) {
  const canClose = Boolean(closable ?? removable);
  const resolvedVariant = variant ?? (bordered === false ? "soft" : "ring");
  const resolvedCloseLabel =
    closeLabel ?? (typeof children === "string" || typeof children === "number" ? `移除 ${children}` : "移除标签");

  return (
    <span
      ref={ref}
      className={cn("af-tag", canClose && "af-tag--closable", className)}
      data-tone={tone}
      data-size={size}
      data-shape={shape !== "rounded" ? shape : undefined}
      data-variant={resolvedVariant !== "ring" ? resolvedVariant : undefined}
      {...rest}
    >
      {dot ? <span className="af-tag__dot" aria-hidden="true" /> : null}
      {icon ? (
        typeof icon === "string" ? (
          <AfIcon name={icon} size={size === "xs" || size === "sm" ? 11 : 12} className="af-tag__icon" />
        ) : (
          <span className="af-tag__icon" aria-hidden="true">
            {icon}
          </span>
        )
      ) : null}
      <span className="af-tag__label">{children}</span>
      {canClose ? (
        <button
          type="button"
          className="af-tag__close"
          aria-label={resolvedCloseLabel}
          onClick={(event) => {
            event.stopPropagation();
            onClose?.(event);
            onRemove?.(event);
          }}
        >
          <AfIcon name="x" size={10} />
        </button>
      ) : null}
    </span>
  );
});
