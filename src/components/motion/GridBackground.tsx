import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn, useInViewOnce, useReducedMotion } from "../../primitives";

export interface AfGridBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  /** 网格单元尺寸（像素，默认 48）。 */
  size?: number;
  /** 自定义网格线颜色（默认自动跟随明暗主题发丝色）。 */
  color?: string;
  /** 漂移周期秒数（默认 3，传 0 则静止）。 */
  speed?: number;
  /** 网格漂移方向（默认 `"diagonal"`）。 */
  direction?: "up" | "down" | "left" | "right" | "diagonal";
  /** 边缘径向淡出比例（0–100，默认 70；传 0 关闭边缘渐隐）。 */
  fade?: number;
  /** 是否在进入视口时从中心圆形揭开（默认 `true`）。 */
  reveal?: boolean;
  /** 网格上层内容。 */
  children?: ReactNode;
}

/**
 * Grid Background：细线网格按单格步长无缝循环漂移，边缘径向淡出，进入视口时从中心柔和揭开。
 */
export function AfGridBackground(props: AfGridBackgroundProps = {}) {
  const {
    size = 48,
    color,
    speed = 3,
    direction = "diagonal",
    fade = 70,
    reveal = true,
    children,
    className,
    style,
    ...rest
  } = props;

  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>(0.2);
  const still = reduced || speed <= 0;

  const mergedStyle: CSSProperties = {
    "--af-mo-cell": `${size}px`,
    "--af-mo-speed": `${Math.max(0.2, speed)}s`,
    "--af-mo-fade": `${fade}%`,
    ...(color ? { "--af-mo-grid-line": color } : null),
    ...style,
  } as CSSProperties;

  return (
    <div
      {...rest}
      className={cn("af-mo-grid", className)}
      ref={ref}
      data-direction={direction}
      data-nofade={fade <= 0 ? "" : undefined}
      data-pre-reveal={reveal && !inView && !reduced ? "" : undefined}
      data-reveal={reveal && inView && !reduced ? "" : undefined}
      data-still={still ? "" : undefined}
      style={mergedStyle}
    >
      <span className="af-mo-grid__mask" aria-hidden="true">
        <span className="af-mo-grid__layer" />
      </span>
      <span className="af-mo-grid__content">
        {children ?? (
          <span className="af-mo-grid__demo">
            <span className="af-mo-grid__pill">New</span>
            <strong>Build on a steady grid</strong>
            <span>A quiet backdrop that keeps moving, so your hero never feels static.</span>
          </span>
        )}
      </span>
    </div>
  );
}
