import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

export interface AfSkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /** 形态：line 文本行 / circle 圆形头像 / rect 圆角块。 */
  variant?: "line" | "circle" | "rect";
  /** 布尔简写：圆形占位（等价于 variant="circle"）。 */
  circle?: boolean;
  /**
   * 行高对齐模式（对齐 affectUI Skeleton line 属性）：
   * 设为 true 或宽度值（如 "72%"）时，外层占据真实 1lh 行高并在内部垂直居中渲染骨架条，消除真实文案替换时的高度跳变。
   */
  line?: boolean | number | string;
  /** 宽度（数字按 px，默认 "100%"）。 */
  width?: number | string;
  /** 高度（数字按 px，默认 12px）。 */
  height?: number | string;
  /** 自定义圆角。 */
  radius?: number | string;
  /** 多行段落简写（>1 时渲染多条行骨架，末行自动收窄至 68%）。 */
  lines?: number;
  /** 是否开启 1.6s 同步微光扫过动画（默认 true；prefers-reduced-motion 下自动静默）。 */
  animated?: boolean;
}

function toCssLength(val: number | string | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === "number" ? `${val}px` : val;
}

/**
 * 骨架占位原语（对齐 affectUI Skeleton）：
 * - 同一容器内多块骨架共享同步 1.6s 微光扫过相位，整体呼吸一致；
 * - 支持 line 模式按真实行高 1lh 占位，circle 头像占位，以及自定义尺寸圆角块。
 */
export function AfSkeleton({
  variant = "line",
  circle = false,
  line,
  width,
  height,
  radius,
  lines = 1,
  animated = true,
  className,
  style,
  ...props
}: AfSkeletonProps) {
  const isCircle = circle || variant === "circle";
  const resolvedVariant = isCircle ? "circle" : variant;

  if (!isCircle && lines > 1) {
    return (
      <span
        className={["af-skeleton-group", className].filter(Boolean).join(" ")}
        aria-hidden="true"
        style={style}
        {...props}
      >
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className="af-skeleton-line" style={{ width: index === lines - 1 ? "68%" : toCssLength(width) ?? "100%" }}>
            <span
              className="af-skeleton"
              data-variant="line"
              data-static={!animated ? "true" : undefined}
              style={{ height: toCssLength(height) ?? "11px", borderRadius: toCssLength(radius) }}
            />
          </span>
        ))}
      </span>
    );
  }

  if (line !== undefined && line !== false) {
    const lineWidth = typeof line === "boolean" ? toCssLength(width) ?? "100%" : toCssLength(line);
    return (
      <span
        className={["af-skeleton-line", className].filter(Boolean).join(" ")}
        aria-hidden="true"
        style={{ width: lineWidth, ...style }}
        {...props}
      >
        <span
          className="af-skeleton"
          data-variant="line"
          data-static={!animated ? "true" : undefined}
          style={{
            width: "100%",
            height: toCssLength(height) ?? "10px",
            borderRadius: toCssLength(radius),
          }}
        />
      </span>
    );
  }

  const defaultSize = isCircle ? "32px" : undefined;
  const resolvedW = toCssLength(width) ?? defaultSize ?? "100%";
  const resolvedH = toCssLength(height) ?? (isCircle ? resolvedW : variant === "rect" ? "64px" : "12px");

  const mergedStyle: CSSProperties = {
    width: resolvedW,
    height: resolvedH,
    ...(radius !== undefined ? { borderRadius: toCssLength(radius) } : null),
    ...style,
  };

  return (
    <span
      aria-hidden="true"
      className={["af-skeleton", className].filter(Boolean).join(" ")}
      data-variant={resolvedVariant}
      data-static={!animated ? "true" : undefined}
      style={mergedStyle}
      {...props}
    />
  );
}

export interface AfSkeletonLoadingProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否处于加载态。 */
  loading: boolean;
  /** 加载期间渲染的骨架布局。 */
  skeleton: ReactNode;
  /** 加载完成后的真实内容。 */
  children: ReactNode;
  /** 加载期间屏幕阅读器状态文案（默认 "Loading…"）。 */
  label?: string;
  /** 是否延迟 150ms 淡入骨架以避免极快请求闪烁（默认 false 立即展示以便切换预览；传 true 开启 150ms 防闪）。 */
  delay?: boolean;
}

/**
 * 骨架切换包裹容器（对齐 affectUI Loading）：
 * - 加载态标记 aria-busy="true" 并向读屏器静默播报单条状态，内部骨架统一 aria-hidden；
 * - 支持可选 150ms 延迟淡入，加载完成后切换真实内容。
 */
export function AfSkeletonLoading({
  loading,
  skeleton,
  children,
  label = "Loading…",
  delay = false,
  className,
  ...props
}: AfSkeletonLoadingProps) {
  return (
    <div
      className={["af-skeleton-wrap", delay && loading ? "af-skeleton-wrap--delayed" : undefined, className]
        .filter(Boolean)
        .join(" ")}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="af-sr-only" role="status">
            {label}
          </span>
          {skeleton}
        </>
      ) : (
        children
      )}
    </div>
  );
}

export const AfLoading = AfSkeletonLoading;
export type AfLoadingProps = AfSkeletonLoadingProps;
