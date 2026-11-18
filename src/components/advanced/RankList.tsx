import { useState } from "react";
import { AfShareItem, dataTone, useTweens } from "./shared";

/** 排行：占比条直接作为行背景，悬停聚焦当前行。 */
export function AfRankList({ items, format }: { items: AfShareItem[]; format: (value: number) => string }) {
  const [focus, setFocus] = useState<number | null>(null);
  const tweened = useTweens(items.map((item) => item.value));
  const max = Math.max(...tweened, 1);
  const total = tweened.reduce((sum, value) => sum + value, 0);
  return (
    <div className="af-rank" onPointerLeave={() => setFocus(null)}>
      {items.map((item, index) => (
        <div key={item.label} className="af-rank__row" data-dim={(focus !== null && focus !== index) || undefined} onPointerEnter={() => setFocus(index)}>
          <span className="af-rank__bar" data-tone={dataTone(index, items.length, true)} style={{ transform: `scaleX(${tweened[index] / max})` }} aria-hidden />
          <span className="af-rank__name">{item.label}</span>
          <span className="af-rank__val">{format(tweened[index])}</span>
          <span className="af-rank__pct">{total ? ((tweened[index] / total) * 100).toFixed(1) : 0}%</span>
        </div>
      ))}
    </div>
  );
}
