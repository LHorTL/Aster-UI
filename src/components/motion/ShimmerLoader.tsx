import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../primitives";

const cssLen = (v: number | string | undefined) => (typeof v === "number" ? `${v}px` : v);

export interface AfSkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /** 骨架宽度（数字按 px 处理，字符串按原样输出；默认 `"100%"`）。 */
  width?: number | string;
  /** 骨架高度（默认 12）。 */
  height?: number | string;
  /** 圆角半径（默认 6）。 */
  radius?: number | string;
  /** 圆形头像占位（宽高对齐）。 */
  circle?: boolean;
}

export interface AfShimmerTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** 流光扫过的提示文案。 */
  children?: ReactNode;
  /** 单次流光扫过周期（秒，默认 2）。 */
  duration?: number;
}

export interface AfShimmerLoaderProps extends HTMLAttributes<HTMLSpanElement> {
  /** 骨架宽度（像素或百分比字符串，默认 120）。 */
  width?: number | string;
  /** 骨架高度（像素或长度字符串，默认 12）。 */
  height?: number | string;
  /** 圆角半径（默认 6）。 */
  radius?: number | string;
  /** 是否渲染为圆形头像占位。 */
  circle?: boolean;
  /** 若提供文本，则渲染带扫光效果的加载提示文案而非块级骨架。 */
  text?: string;
  /** 文字扫光周期（秒，默认 2）。 */
  duration?: number;
}

/**
 * Skeleton：基于伪元素 GPU `translate3d` 扫光的骨架块占位，
 * 在 Modal / Drawer / TiltCard 等含 `transform` 的宿主内仍保持 60fps 零重绘扫掠。
 */
export function AfSkeleton(props: AfSkeletonProps = {}) {
  const { width = "100%", height = 12, radius = 6, circle = false, className, style, ...rest } = props;
  const w = cssLen(width);
  const h = cssLen(height);
  return (
    <span
      {...rest}
      className={cn("af-mo-skel", className)}
      aria-hidden={rest["aria-hidden"] ?? true}
      style={{
        flexShrink: circle || typeof width === "number" ? 0 : undefined,
        width: circle ? (typeof width === "number" ? w : h) : w,
        height: circle ? (typeof width === "number" ? w : h) : h,
        borderRadius: circle ? "50%" : cssLen(radius),
        ...style,
      }}
    />
  );
}

/**
 * Shimmer Text：高光光带沿字母平滑掠过的加载提示文字（如 AI "Thinking…" 状态）。
 */
export function AfShimmerText(props: AfShimmerTextProps = {}) {
  const { children = "Thinking…", duration = 2, className, style, ...rest } = props;
  return (
    <span
      {...rest}
      className={cn("af-mo-shimmertext", className)}
      style={{ "--af-mo-shimmer-dur": `${duration}s`, ...style } as CSSProperties}
    >
      {children}
    </span>
  );
}

/**
 * Shimmer Loader：统一入口——传入 `text` 时渲染流光文字，否则渲染共享视口光束的骨架占位。
 */
export function AfShimmerLoader(props: AfShimmerLoaderProps = {}) {
  const {
    width = 120,
    height = 12,
    radius = 6,
    circle = false,
    text,
    duration = 2,
    className,
    style,
    ...rest
  } = props;

  if (text !== undefined) {
    return (
      <AfShimmerText {...rest} duration={duration} className={className} style={style}>
        {text}
      </AfShimmerText>
    );
  }
  return (
    <AfSkeleton
      {...rest}
      width={width}
      height={height}
      radius={radius}
      circle={circle}
      className={className}
      style={style}
    />
  );
}
