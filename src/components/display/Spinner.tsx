import { useEffect, useState, type HTMLAttributes } from "react";
import type { AfTone } from "./Tag";

export type AfSpinnerSize = number | "xs" | "sm" | "md" | "lg";

export interface AfSpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** 像素尺寸或档位（xs=12, sm=14, md=16, lg=20；默认 16px）。 */
  size?: AfSpinnerSize;
  /**
   * 独立出现时的无障碍状态说明（传入时挂载 role="status" + aria-label；
   * 紧邻文字或位于按钮内时省略，自动设为 aria-hidden="true" 防重复朗读）。
   */
  label?: string;
  /** 视觉形态：arc 经典 18% 底环 + 90° 圆头弧线（默认）/ rays 8 射线呼吸。 */
  variant?: "arc" | "rays";
  /** 可选语义色调（默认继承父级 currentColor）。 */
  tone?: AfTone;
  /** 防闪烁延迟显示毫秒数（默认 0 立即显示）。 */
  delay?: number;
}

function resolveSpinnerPx(size: AfSpinnerSize): number {
  if (typeof size === "number") return size;
  if (size === "xs") return 12;
  if (size === "sm") return 14;
  if (size === "lg") return 20;
  return 16;
}

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * 旋转加载指示器（对齐 affectUI Spinner）：
 * - 默认 arc 采用 18% 柔和轨道环 + 圆头弧线，继承 currentColor，800ms 匀速旋转（reduced-motion 降速至 2.4s）；
 * - 传入 label 时暴露 role="status"，省略 label 时静默 aria-hidden="true"。
 */
export function AfSpinner({
  size = 16,
  label,
  variant = "arc",
  tone,
  delay = 0,
  className,
  style,
  ...props
}: AfSpinnerProps) {
  const [visible, setVisible] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const id = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  if (!visible) return null;

  const px = resolveSpinnerPx(size);
  const hasLabel = Boolean(label);

  return (
    <span
      role={hasLabel ? "status" : undefined}
      aria-label={hasLabel ? label : undefined}
      aria-hidden={hasLabel ? undefined : "true"}
      className={["af-spinner-host", variant === "arc" && "af-spinner", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-tone={tone || undefined}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      {variant === "rays" ? (
        <svg viewBox="0 0 16 16" width={px} height={px} className="af-spinner-rays" aria-hidden="true">
          {RAY_ANGLES.map((angle, idx) => (
            <line
              key={angle}
              x1="8"
              y1="2"
              x2="8"
              y2="4.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 8 8)`}
              style={{ animationDelay: `${-(1 - idx / 8) * 0.8}s` }}
            />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width={px} height={px} fill="none" className="af-spinner__svg" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.75" />
          <path
            d="M14.25 8a6.25 6.25 0 0 0-6.25-6.25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}
