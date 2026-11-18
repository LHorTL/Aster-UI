import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { copyToClipboard } from "../../primitives";

export interface AfCopyButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onCopy"> {
  /** 要写入剪贴板的文本。 */
  text: string;
  /** 常态无障碍名称与文案。 */
  label?: string;
  /** 复制成功后的反馈文案。 */
  copiedLabel?: string;
  /** 外观变体。 */
  variant?: "ghost" | "secondary";
  /** 尺寸档位。 */
  size?: "sm" | "md";
  /** 是否在图标旁显示文字。 */
  showText?: boolean;
  /** 成功对勾保持时长（ms，默认 1400ms 对齐 affectUI）。 */
  duration?: number;
  /** 复制成功回调。 */
  onCopy?: (text: string) => void;
}

/**
 * 一键剪贴板复制按钮：
 * - 双层图标（copy ↔ check）200ms 透明度 + 320ms 弹性缩放交叉变形，1400ms 后自动还原；
 * - 严禁在复制成功期间设为 disabled，确保焦点不丢失且支持连续再次复制。
 */
export function AfCopyButton({
  text,
  label = "复制",
  copiedLabel = "已复制",
  variant = "ghost",
  size = "sm",
  showText = false,
  duration = 1400,
  onCopy,
  className,
  onClick,
  ...props
}: AfCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    onCopy?.(text);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, duration);
  };

  const iconPx = size === "sm" ? 13 : 14;

  return (
    <button
      type="button"
      className={["af-btn", "af-copy", !showText && "af-btn--icon", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-copied={copied || undefined}
      aria-label={showText ? undefined : copied ? copiedLabel : label}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          void handleCopy();
        }
      }}
      {...props}
    >
      <span className="af-copy__icons" data-done={copied || undefined} aria-hidden="true">
        <span className="af-copy__icon af-copy__icon--copy">
          <AfIcon name="copy" size={iconPx} />
        </span>
        <span className="af-copy__icon af-copy__icon--check">
          <AfIcon name="check" size={iconPx} />
        </span>
      </span>
      {showText ? <span>{copied ? copiedLabel : label}</span> : null}
      <span className="af-sr-only" role="status" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
