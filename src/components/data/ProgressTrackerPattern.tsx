import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";
import { Demo, Note, PROGRESS_STEPS } from "../_shared/data";

export interface AfProgressTrackerPatternProps {
  /** 卡片标题。 */
  title?: ReactNode;
  /** 步骤标签列表。 */
  steps?: string[];
  /** 初始已完成步骤列表。 */
  initialDone?: string[];
  /** 完成列表变更回调。 */
  onDoneChange?: (done: string[]) => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/**
 * 上手进度：标题 + 翻牌计数、4px 蓝色进度条（每次勾选扫过一道流光）、圆形描边打勾与逐字删除线。
 */
function ProgressTrackerDemo({
  title = "Getting started",
  steps = PROGRESS_STEPS,
  initialDone,
  onDoneChange,
  showNote = false,
  className,
  style,
}: AfProgressTrackerPatternProps = {}) {
  const [done, setDone] = useState<string[]>(() => initialDone ?? steps.slice(-1));

  const toggle = (label: string) => {
    setDone((current) => {
      const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
      onDoneChange?.(next);
      return next;
    });
  };

  const count = done.length;
  const progress = steps.length ? count / steps.length : 0;

  return (
    <Demo>
      <section className={cn("af-dt-pt", className)} style={style} aria-label="Getting started">
        <div className="af-dt-pt__head">
          <h3 className="af-dt-pt__title">{title}</h3>
          <span className="af-dt-pt__count" aria-hidden>
            <span className="af-dt-pt__digit" key={count}>{count}</span>/{steps.length}
          </span>
        </div>
        <div className="af-dt-pt__bar" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={count}>
          <span className="af-dt-pt__fill" style={{ transform: `scaleX(${progress})` }}>
            <span className="af-dt-pt__shine" key={count} />
          </span>
        </div>
        <ul className="af-dt-pt__list">
          {steps.map((label) => {
            const checked = done.includes(label);
            return (
              <li key={label}>
                <button type="button" role="checkbox" aria-checked={checked} className="af-dt-pt__step" onClick={() => toggle(label)}>
                  <span className="af-dt-pt__check" aria-hidden>
                    <svg viewBox="0 0 24 24"><path d="M6.5 12.5l3.5 3.5 7.5-8" pathLength={1} /></svg>
                  </span>
                  <span className="af-dt-pt__label"><span>{label}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {showNote ? <Note>340px progress tracker: 4px shimmer progress bar, spring checkmark, and animated strikethrough.</Note> : null}
    </Demo>
  );
}

export { ProgressTrackerDemo as AfProgressTrackerPattern, ProgressTrackerDemo as AfProgressTracker };
export type { AfProgressTrackerPatternProps as AfProgressTrackerProps };
