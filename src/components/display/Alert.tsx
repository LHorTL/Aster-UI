import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

/** 提示条语义。 */
export type AfAlertTone = "info" | "success" | "warning" | "danger";

/** 提示条属性。 */
export type AfAlertProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  /** 语义色，默认 info。 */
  tone?: AfAlertTone;
  /** 标题。 */
  title: ReactNode;
  /** 说明。 */
  description?: ReactNode;
  /** 操作行。 */
  actions?: ReactNode;
  /** 是否显示关闭按钮。 */
  closable?: boolean;
  /** 关闭回调。 */
  onClose?: () => void;
};

const ALERT_ICONS: Record<AfAlertTone, AffectIconKey> = {
  info: "info",
  success: "check",
  warning: "alert",
  danger: "alert",
};

/** 提示条：淡语义底 + 语义图标，零硬边框；关闭按钮为轻量幽灵态。 */
export const AfAlert = forwardRef<HTMLDivElement, AfAlertProps>(function AfAlert(
  { tone = "info", title, description, actions, closable, onClose, className, ...rest },
  ref,
) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div ref={ref} className={cn("af-alert", className)} data-tone={tone} role={tone === "danger" ? "alert" : "status"} {...rest}>
      <span className="af-alert__icon" aria-hidden="true">
        <AfIcon name={ALERT_ICONS[tone]} size={16} />
      </span>
      <span className="af-alert__body">
        <span className="af-alert__title">{title}</span>
        {description ? <span className="af-alert__desc">{description}</span> : null}
        {actions ? <span className="af-alert__actions">{actions}</span> : null}
      </span>
      {closable ? (
        <button
          type="button"
          className="af-alert__close"
          aria-label="关闭提示"
          onClick={() => {
            setDismissed(true);
            onClose?.();
          }}
        >
          <AfIcon name="x" size={12} />
        </button>
      ) : null}
    </div>
  );
});
