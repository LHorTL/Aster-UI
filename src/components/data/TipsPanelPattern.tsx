import { useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { Demo, Note, TIPS } from "../_shared/data";

export type TipCard = (typeof TIPS)[number];

export interface AfTipsPanelPatternProps {
  /** 面板标题。 */
  title?: ReactNode;
  /** 提示磁贴列表。 */
  tips?: TipCard[];
  /** 初始已完成项 ID。 */
  initialDone?: string[];
  /** 执行某条提示行动按钮时触发。 */
  onAction?: (tip: TipCard) => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/**
 * 上手提示：标题 + 计数、三列 Flexbox 磁贴（0.5px 发丝线描边），点行动按钮即标记完成；
 * 只有磁贴列表滚动，标题与收起行固定。
 */
function TipsPanelDemo({
  title = "Tips",
  tips = TIPS,
  initialDone = [],
  onAction,
  showNote = false,
  className,
  style,
}: AfTipsPanelPatternProps = {}) {
  const [done, setDone] = useState<string[]>(initialDone);
  const [closed, setClosed] = useState(false);

  if (closed) {
    return (
      <Demo>
        <div className={cn("af-dt-tp__closed", className)} style={style}>
          <AfIcon name="info" size={14} />
          <span>Tips dismissed.</span>
          <button type="button" className="af-dt-tp__btn" onClick={() => { setClosed(false); setDone([]); }}>Reopen</button>
        </div>
      </Demo>
    );
  }

  return (
    <Demo>
      <section className={cn("af-dt-tp", className)} style={style} aria-label="Tips">
        <header className="af-dt-tp__head">
          <h3 className="af-dt-tp__title">{title}</h3>
          <span className="af-dt-tp__count" aria-live="polite">{done.length}/{tips.length} done</span>
        </header>
        <div className="af-dt-tp__body">
          <ul className="af-dt-tp__grid">
            {tips.map((tip) => {
              const finished = done.includes(tip.id);
              return (
                <li className="af-dt-tp__tip" data-done={finished || undefined} key={tip.id}>
                  <p className="af-dt-tp__tip-title">{tip.title}</p>
                  <p className="af-dt-tp__tip-text">{tip.description}</p>
                  {finished ? (
                    <span className="af-dt-tp__done" role="status"><AfIcon name="check" size={14} />{tip.doneLabel}</span>
                  ) : (
                    <button
                      type="button"
                      className={cn("af-dt-tp__btn", tip.primary && "af-dt-tp__btn--primary")}
                      onClick={() => {
                        setDone((current) => [...current, tip.id]);
                        onAction?.(tip);
                      }}
                    >
                      {tip.action}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <footer className="af-dt-tp__foot">
          <button type="button" className="af-dt-tp__btn" onClick={() => setClosed(true)}>Close</button>
        </footer>
      </section>
      {showNote ? <Note>760px tips panel: 3-column 8px-gap tiles with scrollable body and pinned header/footer.</Note> : null}
    </Demo>
  );
}

export { TipsPanelDemo as AfTipsPanelPattern, TipsPanelDemo as AfTipsPanel };
export type { AfTipsPanelPatternProps as AfTipsPanelProps };
