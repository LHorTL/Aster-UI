import { useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useAnimatedList, type AnimatedListEntry } from "../../primitives";
import { AfButton } from "../../ui";
import { useReducedMotion } from "../_shared/project";

/** 更新说明条目。 */
export type AfProjectUpdateItem = {
  id: number | string;
  version: string;
  title: string;
  desc: string;
  time: string;
  linkLabel?: string;
};

/** 更新说明叠卡属性。 */
export type AfProjectUpdateStackProps = {
  items?: AfProjectUpdateItem[];
  onDismiss?: (item: AfProjectUpdateItem) => void;
  onAction?: (item: AfProjectUpdateItem) => void;
  onReset?: () => void;
  badgePrefix?: ReactNode;
  className?: string;
};

const DEFAULT_UPDATES: AfProjectUpdateItem[] = [
  {
    id: 1,
    version: "1.5.0",
    title: "新增多视图看板与快捷筛选",
    desc: "支持在列表与卡片网格之间平滑切换，并保存个人常用排序偏好。",
    time: "今天 14:20",
    linkLabel: "查看更新说明",
  },
  {
    id: 2,
    version: "1.4.2",
    title: "优化大体积文档离线检索速度",
    desc: "改进本地全文索引缓存机制，长篇文档打开与跳转响应更快。",
    time: "昨天",
    linkLabel: "查看细节",
  },
  {
    id: 3,
    version: "1.4.0",
    title: "支持自定义主题色与圆角档位",
    desc: "可在外观面板内自由搭配明暗模式、强调色与紧凑排版密度。",
    time: "3 天前",
    linkLabel: "了解改进",
  },
];

/** 更新说明叠卡：三层空间透视叠放，点击知道了后卡平滑升位补齐。 */
function ProjectUpdateStack({
  items: itemsProp,
  onDismiss,
  onAction,
  onReset,
  badgePrefix = "更新 v",
  className,
}: AfProjectUpdateStackProps = {}) {
  const [innerItems, setInnerItems] = useState<AfProjectUpdateItem[]>(DEFAULT_UPDATES);
  const reduced = useReducedMotion();
  const items = itemsProp ?? innerItems;

  const { entries, leavingKeys, requestRemove } = useAnimatedList<AfProjectUpdateItem>({
    items,
    getKey: (it) => String(it.id),
    exitDuration: 190,
    disabled: reduced,
    onRemove: (_key, item) => {
      if (!itemsProp) {
        setInnerItems((prev) => prev.filter((it) => it.id !== item.id));
      }
      onDismiss?.(item);
    },
  });

  const frontEntry = entries[0];
  const backEntry = entries[1];
  const deepEntry = entries[2];

  const dismissFront = () => {
    const activeFront = entries.find((e) => !e.leaving);
    if (!activeFront || leavingKeys.size > 0) return;
    requestRemove(activeFront.key);
  };

  const stackEntries: Array<{ entry: AnimatedListEntry<AfProjectUpdateItem>; role: "deep" | "back" | "front" }> = [];
  if (deepEntry) stackEntries.push({ entry: deepEntry, role: "deep" });
  if (backEntry) stackEntries.push({ entry: backEntry, role: "back" });
  if (frontEntry) stackEntries.push({ entry: frontEntry, role: "front" });

  return (
    <div className={cn("af-pj-updates", className)}>
      <div className="af-pj-updates__stage" data-count={Math.min(3, entries.length)}>
        {frontEntry ? (
          stackEntries.map(({ entry: { item, key, leaving }, role }) => {
            const isFront = role === "front";
            return (
              <article
                key={key}
                className="af-pj-update"
                data-role={role}
                data-leaving={leaving ? "true" : undefined}
                aria-hidden={!isFront ? "true" : undefined}
                {...(!isFront ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
              >
                <div className="af-pj-update__head">
                  <span className="af-pj-update__kicker">
                    <AfIcon name="sparkle" size={11} />
                    <span>
                      {badgePrefix}
                      {item.version}
                    </span>
                  </span>
                  {isFront && items.length > 1 ? (
                    <span className="af-pj-update__counter">剩余 {items.length} 条</span>
                  ) : null}
                  <span className="af-pj-update__time">{item.time}</span>
                </div>
                <h4 className="af-pj-update__title">{item.title}</h4>
                <p className="af-pj-update__desc">{item.desc}</p>
                <div className="af-pj-updates__foot">
                  <button
                    type="button"
                    className="af-pj-update__link af-pj-textbtn"
                    onClick={() => onAction?.(item)}
                  >
                    <span>{item.linkLabel ?? "查看详情"}</span>
                    <AfIcon name="arrowUpRight" size={12} />
                  </button>
                  <AfButton size="xs" variant="secondary" onClick={dismissFront}>
                    知道了
                  </AfButton>
                </div>
              </article>
            );
          })
        ) : (
          <div className="af-pj-updates__done">
            <span className="af-pj-sqtile" aria-hidden="true">
              <AfIcon name="check" size={15} />
            </span>
            <div className="af-pj-updates__done-text">
              <strong>所有版本公告已读</strong>
              <span>当前已是最新版本 v1.5.0</span>
            </div>
            <AfButton
              size="xs"
              variant="secondary"
              icon="refresh"
              onClick={() => {
                if (!itemsProp) setInnerItems(DEFAULT_UPDATES);
                onReset?.();
              }}
            >
              重新查看
            </AfButton>
          </div>
        )}
      </div>
    </div>
  );
}

export { ProjectUpdateStack as AfProjectUpdateStack };
