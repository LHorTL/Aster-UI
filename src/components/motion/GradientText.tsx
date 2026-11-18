import {
  createElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn, useInViewOnce, useReducedMotion } from "../../primitives";

export interface AfGradientTextProps extends HTMLAttributes<HTMLElement> {
  /** 需要填充流动多色渐变的文字内容。 */
  children?: ReactNode;
  /** 自定义 2–4 个渐变色块（默认由主题强调色与多序列色推导）。 */
  colors?: [string, string, string?, string?];
  /** 多色团流动周期（秒，默认 8；传 0 静止）。 */
  speed?: number;
  /** 首次 60% 进入视口时是否从左向右扫入揭开（默认 `true`）。 */
  sweep?: boolean;
  /** 渲染内联标签（默认 `"span"`）。 */
  as?: "span" | "em" | "strong";
}

/**
 * Gradient Text：多层径向色团有机游走的流动渐变文字，
 * 60% 进入视口时由左侧平滑扫入染色，无障碍树仅保留一份真实文本。
 */
export function AfGradientText(props: AfGradientTextProps = {}) {
  const {
    children = "Aster UI",
    colors,
    speed = 8,
    sweep = true,
    as = "span",
    className,
    style,
    ...rest
  } = props;

  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLElement>(0.6);
  const still = reduced || speed <= 0;
  const activeState = !sweep || inView || reduced ? "in" : "idle";

  const mergedStyle: CSSProperties = {
    "--af-mo-gt-speed": `${Math.max(0.5, speed)}s`,
    ...(colors?.[0] ? { "--af-mo-gt-c1": colors[0] } : null),
    ...(colors?.[1] ? { "--af-mo-gt-c2": colors[1] } : null),
    ...(colors?.[2] ? { "--af-mo-gt-c3": colors[2] } : null),
    ...(colors?.[3] ? { "--af-mo-gt-c4": colors[3] } : null),
    ...style,
  } as CSSProperties;

  return createElement(
    as,
    {
      ...rest,
      ref,
      className: cn("af-mo-gradtext", className),
      "data-state": activeState,
      "data-sweep": sweep ? "" : undefined,
      "data-still": still ? "" : undefined,
      style: mergedStyle,
    },
    createElement("span", { className: "af-mo-gradtext__base" }, children),
    createElement("span", { className: "af-mo-gradtext__color", "aria-hidden": true }, children),
  );
}
