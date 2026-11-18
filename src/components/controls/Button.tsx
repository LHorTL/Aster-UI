import {
  cloneElement,
  forwardRef,
  isValidElement,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { AfSlot, AfSlottable, cn, composeRefs, useWidthMorph } from "../../primitives";

/**
 * 按钮外观：
 * - `primary`：affectUI 标志性高对比近黑实心主按钮（`--af-solid`）；
 * - `accent`：品牌强调色实心按钮（`--af-accent`）；
 * - `secondary`：白底 + 0.5px 发丝环次按钮；
 * - `ghost` / `subtle`：无底轻量按钮；
 * - `destructive` / `danger`：柔红危险按钮；
 * - `outline` / `dashed` / `link`：兼容语义档位。
 */
export type AfButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "subtle"
  | "outline"
  | "dashed"
  | "link"
  | "destructive"
  | "danger";

/** 按钮属性。 */
export type AfButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 外观，默认 secondary。 */
  variant?: AfButtonVariant;
  /** 尺寸：xs 24 / sm 28 / md 32 / lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 左侧图标：图标名或任意 ReactNode。 */
  icon?: AfIconName | ReactNode;
  /** 右侧图标：图标名或任意 ReactNode。 */
  trailingIcon?: AfIconName | ReactNode;
  /** 右侧图标别名。 */
  iconRight?: AfIconName | ReactNode;
  /** 右侧图标别名（对齐 affectUI 命名）。 */
  rightIcon?: AfIconName | ReactNode;
  /** 加载中：显示 spinner，文字降到 50% 并拦截重复点击。 */
  loading?: boolean;
  /** 快捷键提示，显示在文字右侧。 */
  kbd?: string;
  /** 撑满父容器。 */
  block?: boolean;
  /** 原生悬浮提示。 */
  tip?: string;
  /** 强制纯图标方形按钮；默认只有 icon 没有 children 时自动生效。 */
  iconOnly?: boolean;
  /** 将样式、图标与无障碍属性合并到唯一子元素上（例如路由 `<Link>` 或 `<a>`）。 */
  asChild?: boolean;
  /** 传入后自动渲染为语义化 `<a>` 链接按钮。 */
  href?: string;
  /** 链接打开目标（配合 `href` 使用）。 */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  /** 链接关系属性（配合 `href` 使用，`target="_blank"` 时默认补齐 `noopener noreferrer`）。 */
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
};

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join("");
  if (isValidElement(node)) {
    return extractNodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function AfButtonSpinner({ size }: { size: number }) {
  return (
    <svg
      className="af-btn__icon af-btn__spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" opacity={0.2} />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
    </svg>
  );
}

/**
 * Aster UI 统一按钮：按下微缩 0.97；标签或图标切换时宽度 480ms 平滑形变；
 * 支持 `asChild` 多态槽位与 `href` 语义链接，同时保持 `.af-btn` 全部视觉与无障碍特性。
 */
export const AfButton = forwardRef<HTMLButtonElement, AfButtonProps>(function AfButton(
  {
    variant = "secondary",
    size = "md",
    icon,
    trailingIcon,
    iconRight,
    rightIcon: rightIconProp,
    loading,
    kbd,
    block,
    tip,
    iconOnly: iconOnlyProp,
    asChild = false,
    href,
    target,
    rel,
    children,
    className,
    disabled,
    onClick,
    onPointerDown,
    type = "button",
    ...rest
  },
  forwardedRef,
) {
  const btnRef = useRef<HTMLElement>(null);
  const syncPressScale = (el: HTMLElement | null) => {
    if (!el) return;
    const w = el.offsetWidth;
    if (w <= 0) return;
    const scale = w < 160 ? 0.982 : Math.max(0.99, Number((1 - 2.4 / w).toFixed(4)));
    el.style.setProperty("--af-btn-press-scale", String(scale));
  };
  const rightIcon = trailingIcon ?? iconRight ?? rightIconProp;
  const rawLabel =
    asChild && isValidElement(children) ? (children.props as { children?: ReactNode }).children : children;
  const iconOnly = iconOnlyProp ?? !rawLabel;
  const text = typeof rawLabel === "string" ? rawLabel : undefined;
  const labelSig = text ?? extractNodeText(rawLabel);
  const normalizedVariant =
    variant === "danger"
      ? "destructive"
      : variant === "outline" || variant === "dashed"
        ? "secondary"
        : variant;

  const signature = `${labelSig}|${typeof icon === "string" ? icon : icon ? "node" : ""}|${typeof rightIcon === "string" ? rightIcon : rightIcon ? "node" : ""}|${kbd ?? ""}|${Boolean(loading)}`;
  const lastSignature = useRef(signature);
  const morph = lastSignature.current !== signature;
  lastSignature.current = signature;
  useWidthMorph(btnRef, signature);

  const iconSize = size === "xs" ? 13 : size === "sm" ? 14 : 16;
  const renderIcon = (slot: AfIconName | ReactNode, iconClass: string) =>
    typeof slot === "string" ? <AfIcon name={slot as AfIconName} className={iconClass} size={iconSize} /> : slot;

  const isUnavailable = Boolean(disabled || loading);

  const sharedProps = {
    className: cn("af-btn", className),
    "data-variant": normalizedVariant,
    "data-raw-variant": variant !== normalizedVariant ? variant : undefined,
    "data-size": size,
    "data-icon-only": iconOnly || undefined,
    "data-block": block || undefined,
    "data-icon-left": (!iconOnly && Boolean(icon)) || undefined,
    "data-icon-right": (!iconOnly && Boolean(rightIcon)) || undefined,
    "data-loading": loading || undefined,
    "data-morph": morph || undefined,
    "data-disabled": disabled || undefined,
    title: tip,
    "aria-busy": loading || undefined,
  };

  if (asChild && isValidElement(children)) {
    const childElement = children as ReactElement<{ children?: ReactNode }>;
    const wrappedChild = cloneElement(
      childElement,
      undefined,
      rawLabel ? (
        <span className="af-btn__label" data-text={text} data-morph={morph || undefined} key={text}>
          {rawLabel}
        </span>
      ) : null,
    );

    return (
      <AfSlot
        ref={composeRefs(btnRef, forwardedRef as React.Ref<HTMLElement>)}
        {...sharedProps}
        aria-disabled={isUnavailable || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
        onClickCapture={(event: MouseEvent<HTMLElement>) => {
          if (isUnavailable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onClick={(event: MouseEvent<HTMLElement>) => {
          if (isUnavailable) {
            event.preventDefault();
            return;
          }
          onClick?.(event as unknown as MouseEvent<HTMLButtonElement>);
        }}
        {...(rest as Record<string, unknown>)}
      >
        {loading ? <AfButtonSpinner size={iconSize} /> : icon ? renderIcon(icon, "af-btn__icon") : null}
        <AfSlottable>{wrappedChild}</AfSlottable>
        {kbd ? <kbd className="af-kbd af-kbd--inline">{kbd}</kbd> : null}
        {rightIcon ? renderIcon(rightIcon, "af-btn__icon") : null}
      </AfSlot>
    );
  }

  if (href !== undefined) {
    const resolvedRel = target === "_blank" && !rel ? "noopener noreferrer" : rel;
    return (
      <a
        ref={composeRefs(btnRef as React.Ref<HTMLAnchorElement>, forwardedRef as unknown as React.Ref<HTMLAnchorElement>)}
        href={isUnavailable ? undefined : href}
        target={target}
        rel={resolvedRel}
        role={isUnavailable ? "link" : undefined}
        aria-disabled={isUnavailable || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
        {...sharedProps}
        onClick={(event) => {
          if (isUnavailable) {
            event.preventDefault();
            return;
          }
          onClick?.(event as unknown as MouseEvent<HTMLButtonElement>);
        }}
      >
        {loading ? <AfButtonSpinner size={iconSize} /> : icon ? renderIcon(icon, "af-btn__icon") : null}
        {children ? (
          <span className="af-btn__label" data-text={text} data-morph={morph || undefined} key={text}>
            {children}
          </span>
        ) : null}
        {kbd ? <kbd className="af-kbd af-kbd--inline">{kbd}</kbd> : null}
        {rightIcon ? renderIcon(rightIcon, "af-btn__icon") : null}
      </a>
    );
  }

  return (
    <button
      ref={composeRefs(btnRef as React.Ref<HTMLButtonElement>, forwardedRef)}
      type={type}
      {...sharedProps}
      disabled={disabled}
      onPointerDown={(event) => {
        syncPressScale(event.currentTarget);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (isUnavailable) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {loading ? <AfButtonSpinner size={iconSize} /> : icon ? renderIcon(icon, "af-btn__icon") : null}
      {children ? (
        <span className="af-btn__label" data-text={text} data-morph={morph || undefined} key={text}>
          {children}
        </span>
      ) : null}
      {kbd ? <kbd className="af-kbd af-kbd--inline">{kbd}</kbd> : null}
      {rightIcon ? renderIcon(rightIcon, "af-btn__icon") : null}
    </button>
  );
});

/** 图标按钮属性。 */
export type AfIconButtonProps = Omit<AfButtonProps, "iconOnly" | "block" | "kbd" | "trailingIcon" | "iconRight"> & {
  /** 图标键或自定义图标元素。 */
  icon: AfIconName | ReactNode;
  /** 无障碍标签（建议必填，否则自动从 `tip` / `title` 回退）。 */
  label?: string;
  /** 激活高亮态（如工具栏开关）。 */
  active?: boolean;
  /** 开关按下语义（映射到 `aria-pressed`）。 */
  pressed?: boolean;
  /** 形状：圆角方块（默认）或正圆。 */
  shape?: "square" | "circle";
};

/** 纯图标方形操作按钮：固定宽高 24 / 28 / 32 / 36px，默认轻量 ghost 变体并支持激活态。 */
export const AfIconButton = forwardRef<HTMLButtonElement, AfIconButtonProps>(function AfIconButton(
  {
    icon,
    label,
    title,
    tip,
    variant = "ghost",
    size = "sm",
    active = false,
    pressed,
    shape = "square",
    className,
    "aria-label": ariaLabelProp,
    children,
    ...rest
  },
  ref,
) {
  const resolvedLabel = ariaLabelProp ?? label ?? tip ?? (title || undefined);
  const resolvedTip = tip ?? (title === "" ? undefined : (title ?? resolvedLabel));
  return (
    <AfButton
      ref={ref}
      variant={variant}
      size={size}
      icon={icon}
      iconOnly
      tip={resolvedTip}
      aria-label={resolvedLabel}
      aria-pressed={pressed}
      data-active={active || undefined}
      data-pressed={pressed || undefined}
      data-shape={shape}
      className={cn("af-icon-btn", className)}
      {...rest}
    >
      {children}
    </AfButton>
  );
});
