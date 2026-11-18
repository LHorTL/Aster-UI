import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn, useReducedMotion } from "../../primitives";

export interface AfGradientFloorProps extends HTMLAttributes<HTMLDivElement> {
  /** 自定义底部色场三段渐变色（默认由主题色推导）。 */
  colors?: [string, string, string];
  /** 漂移周期秒数（默认 2.5，传 0 则静止）。 */
  speed?: number;
  /** 容器高度（默认 360）。 */
  height?: number | string;
  /** 上层承载内容；不传时展示默认示例文案。 */
  children?: ReactNode;
}

/**
 * Gradient Floor：底部双层多峰矢量色场 + `plus-lighter` 柔光层反向呼吸漂移，
 * 滚出视口时自动暂停 `animation-play-state` 节省合成开销。
 */
export function AfGradientFloor(props: AfGradientFloorProps = {}) {
  const {
    colors,
    speed = 2.5,
    height = 360,
    children,
    className,
    style,
    ...rest
  } = props;

  const reduced = useReducedMotion();
  const rawId = useId();
  const gradId = `af-gf-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setOffscreen(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const still = reduced || speed <= 0;
  const mergedStyle: CSSProperties = {
    height: typeof height === "number" ? `${height}px` : height,
    "--af-mo-speed": `${Math.max(0.5, speed)}s`,
    ...(colors?.[0] ? { "--af-mo-gf-c1": colors[0] } : null),
    ...(colors?.[1] ? { "--af-mo-gf-c2": colors[1] } : null),
    ...(colors?.[2] ? { "--af-mo-gf-c3": colors[2] } : null),
    ...style,
  } as CSSProperties;

  return (
    <div
      {...rest}
      ref={rootRef}
      className={cn("af-mo-floor", className)}
      data-still={still ? "" : undefined}
      data-paused={offscreen ? "" : undefined}
      style={mergedStyle}
    >
      <div className="af-mo-floor__layer af-mo-floor__layer--color" aria-hidden="true">
        <div className="af-mo-floor__bleed">
          <svg viewBox="0 0 3447.1 1514.1" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradId} x1="1723.8" y1="423.3" x2="1723.8" y2="894.3" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--af-mo-gf-c1)" />
                <stop offset="0.303" stopColor="var(--af-mo-gf-c2)" />
                <stop offset="0.673" stopColor="var(--af-mo-gf-c3)" />
              </linearGradient>
            </defs>
            <path
              d="M926.8 531.4C926.8 531.4 302.1 212.8 291.3 206.8V1222.8H3155.8V256.4L2493.8 561.4H2189.3V561.4L1898.8 536.7H1510.8V536.7L1230.8 531.4H926.8V531.4Z"
              fill={`url(#${gradId})`}
            />
          </svg>
        </div>
      </div>

      <div className="af-mo-floor__layer af-mo-floor__layer--light" aria-hidden="true">
        <div className="af-mo-floor__bleed">
          <svg viewBox="0 0 2904.96 1275.97" preserveAspectRatio="none">
            <path
              d="M781.039 417.3C781.039 417.3 254.588 228.5 245.486 223.5V1030.49H2659.48V216.8L2101.59 513.8H1844.98V513.8L1600.17 423.9H1273.19V423.9L1037.23 417.3H781.039V417.3Z"
              fill="var(--af-mo-gf-shine)"
            />
          </svg>
        </div>
      </div>

      {children != null ? <div className="af-mo-floor__content">{children}</div> : null}
    </div>
  );
}
