import { useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { CHANGE_DATA, Demo, Note, type ChangeRow } from "../_shared/data";

export type { ChangeRow };

export interface AfChangeSummaryPatternProps {
  /** 面板标题。 */
  title?: ReactNode;
  /** 本周 / 上周变更数据映射。 */
  dataMap?: Record<"week" | "last", ChangeRow[]>;
  /** 初始周期。 */
  defaultRange?: "week" | "last";
  /** 周期切换回调。 */
  onRangeChange?: (range: "week" | "last") => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/** 变化摘要：标题行（图标 + 标题 + 周期切换胶囊）与指标行（20px 趋势小方块 + 句子），行间 0.5px 发丝线。 */
function ChangeSummaryDemo({
  title = "What's changed",
  dataMap = CHANGE_DATA,
  defaultRange = "week",
  onRangeChange,
  showNote = false,
  className,
  style,
}: AfChangeSummaryPatternProps = {}) {
  const [range, setRange] = useState<"week" | "last">(defaultRange);
  const rows = dataMap[range];
  return (
    <Demo>
      <section className={cn("af-dt-cs", className)} style={style} aria-label="Change summary">
        <header className="af-dt-cs__head">
          <span className="af-dt-cs__title">
            <span className="af-dt-cs__icon" aria-hidden><AfIcon name="list" size={16} /></span>
            {title}
          </span>
          <button
            type="button"
            className="af-dt-cs__period"
            onClick={() => {
              const next = range === "week" ? "last" : "week";
              setRange(next);
              onRangeChange?.(next);
            }}
          >
            {range === "week" ? "This week" : "Last week"}
          </button>
        </header>
        <dl className="af-dt-cs__list" key={range}>
          {rows.map((row, index) => (
            <div className="af-dt-cs__row" key={row.label} style={{ animationDelay: `${60 + index * 55}ms` }}>
              <dt className="af-dt-cs__label">{row.label}</dt>
              <dd className="af-dt-cs__change">
                <span className="af-dt-cs__trend" data-tone={row.tone} aria-hidden>
                  {row.tone === "neutral" ? <AfIcon name="minus" size={12} /> : <AfIcon name={row.direction === "down" ? "arrowDown" : "arrowUp"} size={12} />}
                </span>
                <span className="af-dt-cs__text">{row.change}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {showNote ? <Note>480px summary card: 44px header, 48px metric rows separated by 0.5px hairlines, and 20px semantic trend badges.</Note> : null}
    </Demo>
  );
}

export { ChangeSummaryDemo as AfChangeSummaryPattern, ChangeSummaryDemo as AfChangeSummary };
export type { AfChangeSummaryPatternProps as AfChangeSummaryProps };
