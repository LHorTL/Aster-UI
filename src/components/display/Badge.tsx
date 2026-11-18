import { isValidElement, type HTMLAttributes, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import type { AfTone } from "./Tag";

export type AfBadgeTone = AfTone | "purple";

export interface AfBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * 数值或简短计数文本：
   * - 传入 children 时挂载在目标元素右上角（渲染 <sup> 角标）；
   * - 未传 children 时渲染为独立圆润等宽计数胶囊（如侧栏未读数）。
   */
  count?: number | string;
  /** 数值封顶上限（默认 99，超出显示 99+）。 */
  max?: number;
  /**
   * 圆点指示：
   * - 当包裹单个组件元素（如 <AfBadge dot><AfButton /></AfBadge>）且未传 count 时，作为右上角角标小圆点；
   * - 当包裹行内状态文案（如 <AfBadge tone="warning" dot>Needs you</AfBadge>）时，作为胶囊前导 6px 实心状态点。
   */
  dot?: boolean;
  /** 活跃脉冲光晕（用于正在执行中的状态，如 <AfBadge tone="info" live>Running</AfBadge>，触发 1.8s 呼吸环）。 */
  live?: boolean;
  /** 前置 12px 图标（支持内置图标键名或自定义 SVG 节点，与圆点互斥）。 */
  icon?: AffectIconKey | ReactNode;
  /** 尺寸档位：md 默认 20px 高，sm 紧凑 18px 高。 */
  size?: "sm" | "md";
  /** count === 0 时是否仍然显示角标。 */
  showZero?: boolean;
  /** 语义色调：neutral / info / accent / success / warning / danger / purple。 */
  tone?: AfBadgeTone;
  /** 被包裹元素（角标模式）或胶囊内状态文案（行内徽章模式）。 */
  children?: ReactNode;
}

function formatBadgeCount(count: number | string | undefined, max: number): string {
  if (typeof count === "number") {
    return count > max ? `${max}+` : count.toLocaleString();
  }
  return count !== undefined ? String(count) : "";
}

function renderBadgeIcon(icon: AffectIconKey | ReactNode): ReactNode {
  if (typeof icon === "string") {
    return <AfIcon name={icon as AffectIconKey} size={12} />;
  }
  return icon;
}

/**
 * 徽标与状态胶囊（同时对齐 affectUI Badge 行内柔和语义胶囊与右上角计数角标契约）：
 * - 行内状态胶囊：柔和语义淡底、可选 6px 状态点、1.8s 扩散光环（live）、12px 图标与 purple 扩展色；
 * - 独立计数徽标：18px 高圆角胶囊 + tabular-nums 千分位/99+ 截断；
 * - 右上角挂载角标：包裹头像/按钮渲染 <sup> 角标或提示圆点。
 */
export function AfBadge({
  count,
  max = 99,
  dot = false,
  live = false,
  icon,
  size = "md",
  showZero = false,
  tone,
  children,
  className,
  style,
  ...props
}: AfBadgeProps) {
  const hasCount = count !== undefined;
  const isCornerDot = !hasCount && dot && !live && !icon && isValidElement(children);
  const isCornerWrap = children !== undefined && (hasCount || isCornerDot);

  // 角标/独立计数默认沿用醒目 danger 色；行内文本徽章默认采用沉静 neutral 灰底
  const resolvedTone: AfBadgeTone =
    tone ?? (hasCount || (dot && children === undefined) || isCornerDot ? "danger" : "neutral");

  if (isCornerWrap) {
    const hidden =
      !isCornerDot &&
      ((typeof count === "number" && count <= 0 && !showZero) || count === "" || count === undefined);
    const displayText = isCornerDot ? "" : formatBadgeCount(count, max);

    return (
      <span className={["af-badge-wrap", className].filter(Boolean).join(" ")} style={style} {...props}>
        {children}
        {!hidden ? (
          <sup
            className="af-badge af-badge--corner"
            data-tone={resolvedTone}
            data-dot={isCornerDot ? "true" : undefined}
            aria-label={isCornerDot ? "New notification" : `${displayText} notifications`}
          >
            {displayText}
          </sup>
        ) : null}
      </span>
    );
  }

  // 无 children 的独立圆点或独立计数胶囊
  if (children === undefined) {
    const hidden = !dot && ((typeof count === "number" && count <= 0 && !showZero) || count === "" || count === undefined);
    if (hidden) return null;
    const displayText = dot ? "" : formatBadgeCount(count, max);
    return (
      <span
        className={["af-badge", dot ? "af-badge--dot-only" : "af-badge--count", className].filter(Boolean).join(" ")}
        data-tone={resolvedTone}
        data-size={size}
        data-dot={dot ? "true" : undefined}
        style={style}
        {...props}
      >
        {displayText}
      </span>
    );
  }

  // 行内柔和语义状态徽章（对齐 affectUI Badge：<AfBadge tone="info" live>Running</AfBadge>）
  const showLeadingDot = dot || live;
  return (
    <span
      className={["af-badge", "af-badge--pill", className].filter(Boolean).join(" ")}
      data-tone={resolvedTone}
      data-size={size}
      style={style}
      {...props}
    >
      {showLeadingDot ? (
        <span className="af-badge__dot" data-live={live ? "true" : undefined} aria-hidden="true" />
      ) : icon !== undefined ? (
        <span className="af-badge__icon" aria-hidden="true">
          {renderBadgeIcon(icon)}
        </span>
      ) : null}
      <span className="af-badge__text">{children}</span>
    </span>
  );
}
