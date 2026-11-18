import { useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";

/* ------------------------------------------------------------------ */
/* Decision record                                                     */
/* ------------------------------------------------------------------ */

/**
 * 决定后的单行记录：状态图标 + 结果 + 时间 + 撤销，最小高 48；
 * 底部 2px 计时条按 tone 使用语义色（绿 / 红），指针悬停或键盘聚焦时暂停，走完后撤销消失。
 */
export function AfDecisionRecord({ tone, title, meta, windowMs = 10000, onUndo }: { tone: "success" | "danger"; title: ReactNode; meta: ReactNode; windowMs?: number; onUndo?: () => void }) {
  const [expired, setExpired] = useState(false);
  return (
    <div className="af-record" data-tone={tone} data-expired={expired || undefined} role="status">
      <span className="af-record__icon" aria-hidden>
        <AfIcon name={tone === "success" ? "check" : "x"} size={14} />
      </span>
      <span className="af-record__title">{title}</span>
      <span className="af-record__meta">{expired ? "已生效" : meta}</span>
      {onUndo && !expired ? (
        <button type="button" className="af-record__undo" onClick={onUndo}>
          <AfIcon name="undo" size={12} />
          撤销
        </button>
      ) : null}
      {onUndo && !expired ? <span className="af-record__timer" style={{ animationDuration: `${windowMs}ms` }} onAnimationEnd={() => setExpired(true)} aria-hidden /> : null}
    </div>
  );
}
