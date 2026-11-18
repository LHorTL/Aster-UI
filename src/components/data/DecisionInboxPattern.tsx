import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfButton } from "../../ui";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { DECISIONS, DecisionItem, Demo, Note } from "../_shared/data";

export type { DecisionItem };

export interface AfDecisionInboxPatternProps {
  /** 自定义标题模板，默认显示待决定条目数。 */
  title?: (pendingCount: number) => ReactNode;
  /** 初始待决定事项。 */
  initialItems?: DecisionItem[];
  /** 用户做出决策（确认折叠移除）时触发。 */
  onDecide?: (item: DecisionItem, kind: "primary" | "secondary") => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/** 决策收件箱：行内快捷答复，答后显示绿色确认胶囊并平滑收拢高度，底部保留撤销。 */
function DecisionInboxDemo({
  title,
  initialItems = DECISIONS,
  onDecide,
  showNote = false,
  className,
  style,
}: AfDecisionInboxPatternProps = {}) {
  const [pending, setPending] = useState<DecisionItem[]>(initialItems);
  const [answered, setAnswered] = useState<{ id: string; kind: "primary" | "secondary"; label: string }[]>([]);
  const [collapsing, setCollapsing] = useState<string[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const answer = (item: DecisionItem, kind: "primary" | "secondary") => {
    setAnswered((current) => [
      ...current.filter((entry) => entry.id !== item.id),
      { id: item.id, kind, label: kind === "primary" ? item.primary : item.secondary },
    ]);
    const timer = window.setTimeout(() => {
      setCollapsing((cur) => [...cur, item.id]);
      const removeTimer = window.setTimeout(() => {
        timers.current.delete(item.id);
        setPending((current) => current.filter((entry) => entry.id !== item.id));
        setAnswered((current) => current.filter((entry) => entry.id !== item.id));
        setCollapsing((cur) => cur.filter((id) => id !== item.id));
        onDecide?.(item, kind);
      }, 280);
      timers.current.set(item.id, removeTimer);
    }, 1450);
    timers.current.set(item.id, timer);
  };

  const undoAnswer = (id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setCollapsing((cur) => cur.filter((x) => x !== id));
    setAnswered((current) => current.filter((entry) => entry.id !== id));
  };

  const reset = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
    setPending(initialItems);
    setAnswered([]);
    setCollapsing([]);
  };

  const activeCount = pending.length - answered.length;

  return (
    <Demo>
      <section className={cn("af-dt-decision", className)} style={style} aria-label="Decision inbox">
        <header className="af-dt-decision__head">
          <AfIcon name="alert" size={16} />
          <h3 aria-live="polite">{title ? title(Math.max(0, activeCount)) : `${Math.max(0, activeCount)} need${activeCount === 1 ? "s" : ""} your input`}</h3>
        </header>
        {pending.length ? (
          <div className="af-dt-decision__rows">
            {pending.map((item) => {
              const answeredRow = answered.find((entry) => entry.id === item.id);
              const isCollapsing = collapsing.includes(item.id);
              return (
                <div
                  className="af-dt-decision__row"
                  data-answered={answeredRow ? true : undefined}
                  data-collapsing={isCollapsing || undefined}
                  key={item.id}
                >
                  <div className="af-dt-decision__text">
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  {answeredRow ? (
                    <span className="af-dt-decision__done" role="status">
                      <AfIcon name="check" size={12} />
                      {answeredRow.label} · {answeredRow.kind === "primary" ? "Applied" : "Saved"}
                      <button type="button" onClick={() => undoAnswer(item.id)}>Undo</button>
                    </span>
                  ) : (
                    <div className="af-dt-decision__actions">
                      <AfButton size="sm" variant="primary" onClick={() => answer(item, "primary")}>{item.primary}</AfButton>
                      <AfButton size="sm" variant="secondary" onClick={() => answer(item, "secondary")}>{item.secondary}</AfButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="af-dt-decision__empty">
            <AfIcon name="check" size={20} />
            <strong>All caught up for today</strong>
            <span>New items will appear here when something needs your sign-off.</span>
            <AfButton size="sm" onClick={reset}>Reset demo</AfButton>
          </div>
        )}
      </section>
      {showNote ? <Note>460px decision inbox: inline quick replies with confirmation pill, undo window, and smooth row collapse.</Note> : null}
    </Demo>
  );
}

export { DecisionInboxDemo as AfDecisionInboxPattern, DecisionInboxDemo as AfDecisionInbox };
export type { AfDecisionInboxPatternProps as AfDecisionInboxProps };
