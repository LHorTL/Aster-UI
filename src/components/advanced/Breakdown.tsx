import { useState } from "react";
import { AfIcon } from "../../icons";
import { AfShareItem, dataTone, useTweens } from "./shared";

/**
 * 紧凑分布：大数 + 6px 分段堆叠条 + 图例表。悬停某一段或某一行时其余降到 0.35，
 * 大数滚到该项的值；切换数据时所有数字与段宽共用同一个 500ms 插值（严禁对 tweened 二次套用 useTween）。
 * 传入 delta 时在行末显示淡底语义胶囊。
 */
export function AfBreakdown({ items, format, totalLabel, restLast = true }: { items: AfShareItem[]; format: (value: number) => string; totalLabel: string; restLast?: boolean }) {
  const [focus, setFocus] = useState<number | null>(null);
  const safeFocus = focus !== null && focus < items.length ? focus : null;
  const tweened = useTweens(items.map((item) => item.value));
  const focusWeights = useTweens(
    items.map((_, index) => (safeFocus === null || safeFocus === index ? 1 : 0)),
    240,
  );
  const total = tweened.reduce((sum, value) => sum + value, 0);
  const bigDisplay = tweened.reduce((sum, value, index) => sum + value * (focusWeights[index] ?? 1), 0);
  const hasDelta = items.some((item) => item.delta !== undefined);
  return (
    <div className="af-bd" onPointerLeave={() => setFocus(null)}>
      <div className="af-bd__head">
        <span className="af-bd__label" key={safeFocus ?? "total"}>
          {safeFocus === null ? totalLabel : items[safeFocus].label}
        </span>
        <span className="af-bd__big">{format(bigDisplay)}</span>
      </div>
      <div className="af-bd__bar" role="img" aria-label={items.map((item) => `${item.label} ${format(item.value)}`).join("，")}>
        {items.map((item, index) => (
          <span
            key={item.label}
            className="af-bd__seg"
            data-tone={dataTone(index, items.length, restLast)}
            data-dim={(safeFocus !== null && safeFocus !== index) || undefined}
            style={{ flexGrow: tweened[index] }}
            onPointerEnter={() => setFocus(index)}
          />
        ))}
      </div>
      <div className="af-bd__rows" role="table">
        {items.map((item, index) => (
          <div
            key={item.label}
            role="row"
            className="af-bd__row"
            data-dim={(safeFocus !== null && safeFocus !== index) || undefined}
            onPointerEnter={() => setFocus(index)}
            onFocus={() => setFocus(index)}
            tabIndex={0}
          >
            <i data-tone={dataTone(index, items.length, restLast)} aria-hidden />
            <span className="af-bd__name">{item.label}</span>
            <span className="af-bd__val">{format(tweened[index])}</span>
            <span className="af-bd__pct">{total ? Math.round((tweened[index] / total) * 100) : 0}%</span>
            {hasDelta ? (
              item.delta === undefined ? (
                <span className="af-bd__delta" aria-hidden />
              ) : (
                <span
                  className="af-bd__delta"
                  data-tone={item.delta >= 0 ? "success" : "danger"}
                  aria-label={`环比${item.delta >= 0 ? "上升" : "下降"} ${Math.abs(item.delta).toFixed(1)}%`}
                >
                  <AfIcon name={item.delta >= 0 ? "arrowUp" : "arrowDown"} size={10} />
                  {Math.abs(item.delta).toFixed(1)}%
                </span>
              )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
