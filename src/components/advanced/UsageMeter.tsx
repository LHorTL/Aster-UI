import { useEffect, useState } from "react";

/** 额度条：已用 / 上限 + 细进度条；接近上限变琥珀并带小圆点，超过 90% 变红；不限量为斜纹空轨道。 */
export function AfUsageMeter({ items, format }: { items: { name: string; used: number; limit: number | null }[]; format: (value: number) => string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="af-meter">
      {items.map((item) => {
        const pct = item.limit ? Math.min(100, (item.used / item.limit) * 100) : 0;
        const tone = !item.limit ? "neutral" : pct >= 90 ? "danger" : pct >= 75 ? "warning" : "neutral";
        return (
          <div key={item.name} className="af-meter__row" data-tone={tone}>
            <div className="af-meter__line">
              <span className="af-meter__name">
                {tone === "warning" || tone === "danger" ? <span className="af-meter__dot" aria-hidden /> : null}
                {item.name}
              </span>
              <span className="af-meter__nums">
                {format(item.used)}
                <span>{item.limit ? ` / ${format(item.limit)}` : " · 不限量"}</span>
              </span>
              {item.limit ? <span className="af-meter__pill">{Math.round(pct)}%</span> : null}
            </div>
            <div className="af-meter__track" data-unlimited={!item.limit || undefined} role="progressbar" aria-label={`${item.name} 额度`} aria-valuenow={Math.round(pct)}>
              {item.limit ? <span style={{ transform: `scaleX(${mounted ? pct / 100 : 0})` }} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
