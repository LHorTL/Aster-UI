import { useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { quotaModels as defaultQuotaModels } from "../../model";
import { cn } from "../../primitives";
import { AfSegmented, AfTag } from "../../ui";
import { CardHead, ModelVendorMark, quotaText } from "../_shared/project";
import { useTweens } from "../advanced/shared";

/** 订阅与模型额度条目。 */
export type AfProjectQuotaItem = {
  id?: string;
  name: string;
  used: number;
  limit: number | null;
  /** 可选重置窗口文案。 */
  resetHint?: string;
  /** 可选标签。 */
  tag?: string;
};

/** 订阅与模型额度行属性。 */
export type AfProjectQuotaRowProps = {
  items?: AfProjectQuotaItem[];
  title?: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
  className?: string;
};

const DEFAULT_ITEMS: AfProjectQuotaItem[] = defaultQuotaModels.map((item) => ({
  id: item.name,
  name: item.name,
  used: item.used,
  limit: item.limit,
  tag: item.name.includes("Opus") ? "主力通道" : item.name.includes("Sonnet") ? "标准通道" : "高速并发",
}));

/** 订阅与模型额度：厂商徽标磁贴、双层清晰配额轨道、阈值语义色与重置倒计时摘要。 */
function ProjectQuotaRow({
  items: itemsProp,
  title = "资源配额用量",
  desc = "按周期统计各通道额度消耗，临近上限时自动预警",
  extra,
  className,
}: AfProjectQuotaRowProps = {}) {
  const [windowMode, setWindowMode] = useState<"5h" | "7d">("5h");
  const baseItems = itemsProp ?? DEFAULT_ITEMS;
  const items =
    itemsProp || windowMode === "5h"
      ? baseItems
      : baseItems.map((item, idx) =>
          item.limit === null || item.limit <= 0
            ? item
            : {
                ...item,
                used: Math.min(item.limit, Math.round(item.used * (idx === 0 ? 0.68 : 1.38))),
              },
        );

  const usedTargets = items.map((item) => item.used);
  const tweenedUsed = useTweens(usedTargets, 460);

  const defaultExtra = (
    <span className="af-pj-pill-group">
      {!itemsProp ? (
        <AfSegmented
          size="xs"
          aria-label="配额统计周期"
          value={windowMode}
          onChange={(v) => setWindowMode(v as "5h" | "7d")}
          options={[
            { value: "5h", label: "今日窗口" },
            { value: "7d", label: "本周汇总" },
          ]}
        />
      ) : (
        <>
          <AfTag tone="accent" size="sm">
            标准套餐
          </AfTag>
          <span className="af-pj-count">{items.length} 个通道</span>
        </>
      )}
    </span>
  );

  return (
    <div className={cn("af-pj-quota", className)}>
      <CardHead title={title} desc={desc} extra={extra ?? defaultExtra} />
      <div className="af-pj-quota__rows" role="list" data-af-hover-list="wash">
        {items.map((item, idx) => {
          const unlimited = item.limit === null || item.limit <= 0;
          const currentUsed = Math.round(tweenedUsed[idx] ?? item.used);
          const targetPct = unlimited ? 0 : Math.min(100, Math.round((item.used / item.limit!) * 100));
          const displayPct = unlimited ? 0 : Math.min(100, Math.round((currentUsed / item.limit!) * 100));
          const state = unlimited ? "unlimited" : targetPct >= 90 ? "danger" : targetPct >= 75 ? "warning" : "normal";
          return (
            <div key={item.id ?? `${item.name}-${idx}`} className="af-pj-quota__row" role="listitem" data-af-hover-item>
              <span className="af-pj-sqtile" aria-hidden="true">
                <ModelVendorMark model={item.name} size={15} />
              </span>
              <div className="af-pj-quota__body">
                <div className="af-pj-quota__top">
                  <span className="af-pj-quota__name">
                    <span>{item.name}</span>
                    {item.tag ? <span className="af-pj-chip">{item.tag}</span> : null}
                  </span>
                  <span className="af-pj-quota__stats">
                    <span className="af-pj-quota__value">
                      {quotaText(currentUsed)}
                      <em>{unlimited ? " / ∞" : ` / ${quotaText(item.limit!)}`}</em>
                    </span>
                    <span className="af-pj-quota__pct" data-state={state}>
                      <span className="af-pj-quota__dot" aria-hidden="true" />
                      {item.resetHint ? item.resetHint : unlimited ? "不限" : `${displayPct}%`}
                    </span>
                  </span>
                </div>
                <div
                  className="af-pj-quota__track"
                  data-state={state}
                  role="progressbar"
                  aria-valuenow={unlimited ? 100 : targetPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={unlimited ? `${item.name} 不限量` : `${item.name} 额度已用 ${targetPct}%`}
                >
                  {unlimited ? (
                    <span className="af-pj-quota__stripes" />
                  ) : (
                    <span className="af-pj-quota__fill" style={{ width: `${targetPct}%` }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="af-pj-quota__foot">
        <span className="af-pj-quota__foot-item">
          <AfIcon name="clock" size={12} />
          <span>{windowMode === "7d" && !itemsProp ? "本周统计窗口将于周日 00:00 重置" : "下个统计窗口将于 2 小时后自动重置"}</span>
        </span>
        <span className="af-pj-quota__foot-tag">超额自动转按量计费</span>
      </div>
    </div>
  );
}

export { ProjectQuotaRow as AfProjectQuotaRow };
