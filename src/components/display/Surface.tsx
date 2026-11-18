import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";

const SURFACE_PADDING_PRESETS: Record<string, number> = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
};

const SURFACE_RADIUS_PRESETS: Record<string, string> = {
  none: "0px",
  sm: "var(--af-r-sm)",
  md: "var(--af-r-md)",
  lg: "var(--af-r-lg)",
  full: "9999px",
};

/** 表面层级容器属性。 */
export type AfSurfaceProps = ComponentPropsWithoutRef<"div"> & {
  /** 表面语义层级。 */
  level?: "canvas" | "surface" | "raised" | "sunken" | "overlay";
  /** 历史宿主迁移兼容表面变体（如 `"floating"` 对应高浮层卡片，`"flat"` 无描边）。 */
  variant?: "default" | "floating" | "sunken" | "raised" | "canvas" | "flat";
  /** 语义色调。 */
  tone?: "default" | "accent" | "success" | "warn" | "danger";
  /** 是否显示发丝卡片描边。 */
  bordered?: boolean;
  /** 圆角（支持预设档位 `none|sm|md|lg|full` 或数值/CSS 长度）。 */
  radius?: "none" | "sm" | "md" | "lg" | "full" | number | string;
  /** 内边距（支持预设档位 `none|xs|sm|md|lg` 或数值/CSS 长度）。 */
  padding?: "none" | "xs" | "sm" | "md" | "lg" | number | string;
  /** 局部注入 `--af-*` CSS 变量覆盖。 */
  tokens?: Record<`--af-${string}`, string | number>;
  /** 撑满容器剩余空间。 */
  fill?: boolean;
  children?: ReactNode;
};

/** 通用层级表面容器：统一管理 canvas / surface / raised / sunken / overlay 背景与发丝描边。 */
export const AfSurface = forwardRef<HTMLDivElement, AfSurfaceProps>(function AfSurface(
  {
    level,
    variant = "default",
    tone = "default",
    bordered,
    radius,
    padding,
    tokens,
    fill = false,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const resolvedLevel =
    level ??
    (variant === "floating"
      ? "overlay"
      : variant === "sunken" || variant === "raised" || variant === "canvas"
        ? variant
        : "surface");
  const resolvedBordered = bordered ?? variant !== "flat";
  const resolvedRadius =
    radius === undefined
      ? undefined
      : typeof radius === "string" && radius in SURFACE_RADIUS_PRESETS
        ? SURFACE_RADIUS_PRESETS[radius]
        : radius;
  const resolvedPadding =
    padding === undefined
      ? undefined
      : typeof padding === "string" && padding in SURFACE_PADDING_PRESETS
        ? SURFACE_PADDING_PRESETS[padding]
        : padding;

  const mergedStyle: CSSProperties = {
    ...(tokens as CSSProperties | undefined),
    ...(resolvedRadius !== undefined ? { borderRadius: resolvedRadius } : null),
    ...(resolvedPadding !== undefined ? { padding: resolvedPadding } : null),
    ...style,
  };
  return (
    <div
      ref={ref}
      className={cn("af-surface", className)}
      data-level={resolvedLevel}
      data-variant={variant !== "default" ? variant : undefined}
      data-tone={tone !== "default" ? tone : undefined}
      data-bordered={resolvedBordered || undefined}
      data-fill={fill || undefined}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
});

/** 历史宿主迁移兼容别名。 */
export const Surface = AfSurface;
export type SurfaceProps = AfSurfaceProps;
