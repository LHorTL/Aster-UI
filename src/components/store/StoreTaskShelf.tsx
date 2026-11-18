import { useMemo, useRef } from "react";
import { AfIcon, renderAfIconSlot } from "../../icons";
import { cn, useAnimatedList, useControllableState } from "../../primitives";
import { AfButton, AfProgressRing, AfTag } from "../../ui";
import { AfTray, useTween } from "../../ui-pro";
import type { AfProjectDownloadTask } from "../project/ProjectDownloadRow";

/** 全局右下角悬浮传输架属性。 */
export type AfStoreTaskShelfProps = {
  tasks?: AfProjectDownloadTask[];
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** 汇总传输速率文案；省略时自动提取首个活跃任务或汇总说明。 */
  totalSpeedLabel?: string;
  onTogglePause?: (task: AfProjectDownloadTask) => void;
  onCancel?: (task: AfProjectDownloadTask) => void;
  onOpenTasksTab?: () => void;
  className?: string;
};

const DEFAULT_SHELF_TASKS: AfProjectDownloadTask[] = [
  {
    id: "shelf-1",
    app: "多模态截图互译台",
    icon: "translate",
    version: "2.4.0",
    size: "28.6 MB",
    speed: "9.2 MB/s",
    eta: "00:02",
    state: "downloading",
    progress: 72,
  },
  {
    id: "shelf-2",
    app: "非线性多轨剪辑台",
    icon: "play",
    version: "1.0.0",
    size: "48.2 MB",
    speed: "3.4 MB/s",
    eta: "00:11",
    state: "downloading",
    progress: 34,
  },
];

/**
 * 切离商城页时的主窗口右下角紧凑悬浮传输架：
 * 显示汇总 `<AfProgressRing>` + 实时总速率，点击基于 `<AfTray>` 高度弹簧过渡展开迷你传输队列。
 */
export function AfStoreTaskShelf({
  tasks = DEFAULT_SHELF_TASKS,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  totalSpeedLabel,
  onTogglePause,
  onCancel,
  onOpenTasksTab,
  className,
}: AfStoreTaskShelfProps = {}) {
  const [expanded, setExpanded] = useControllableState<boolean>({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });

  const { activeCount, avgProgress, speedSummary } = useMemo(() => {
    if (tasks.length === 0) {
      return { activeCount: 0, avgProgress: 100, speedSummary: "全部已完成" };
    }
    const active = tasks.filter(
      (t) =>
        t.state === "downloading" ||
        t.state === "active" ||
        t.state === "queued" ||
        t.state === "verifying" ||
        t.state === "installing",
    );
    const sum = tasks.reduce((acc, cur) => acc + Math.max(0, Math.min(100, cur.progress)), 0);
    const avg = Math.round(sum / tasks.length);
    const firstDownloading = active.find((t) => t.state === "downloading" || t.state === "active");
    return {
      activeCount: active.length,
      avgProgress: avg,
      speedSummary:
        totalSpeedLabel ??
        (active.length > 0 ? (firstDownloading?.speed ?? "校验安装中") : "队列已就绪"),
    };
  }, [tasks, totalSpeedLabel]);

  const miniListRef = useRef<HTMLDivElement | null>(null);
  const animatedTasks = useAnimatedList<AfProjectDownloadTask>({
    items: tasks,
    getKey: (task) => task.id,
    containerRef: miniListRef,
    exitDuration: 180,
    flipDuration: 240,
  });

  const miniQueueFooter = expanded ? (
    <div className="af-store-shelf__drawer">
      <div ref={miniListRef} className="af-store-shelf__list" data-af-hover-list="wash">
        {animatedTasks.entries.length === 0 ? (
          <div className="af-store-shelf__empty">当前暂无后台传输任务</div>
        ) : (
          animatedTasks.entries.map(({ item: task, key, leaving }) => {
            const isPaused = task.state === "paused";
            const isDone = task.state === "completed" || task.state === "done";
            const isFailed = task.state === "failed";
            const canTogglePause =
              task.state === "downloading" ||
              task.state === "active" ||
              task.state === "queued" ||
              task.state === "paused";
            const statusText = isDone
              ? "完成"
              : isFailed
                ? "传输失败"
                : task.state === "verifying"
                  ? "校验中"
                  : task.state === "installing"
                    ? "安装中"
                    : `${task.progress}%`;
            return (
              <div
                key={key}
                className="af-store-shelf__item"
                data-flip={key}
                data-leaving={leaving ? "true" : undefined}
                data-af-hover-item
              >
                <span className="af-store-shelf__icon" aria-hidden="true">
                  {renderAfIconSlot(task.icon, 14)}
                </span>
                <div className="af-store-shelf__meta">
                  <div className="af-store-shelf__row">
                    <strong>{task.app}</strong>
                    <span>{statusText}</span>
                  </div>
                  <div className="af-store-shelf__bar" aria-hidden="true">
                    <span style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
                <div className="af-store-shelf__ops">
                  {canTogglePause ? (
                    <button
                      type="button"
                      className="af-pj-iconbtn"
                      aria-label={isPaused ? `继续 ${task.app}` : `暂停 ${task.app}`}
                      onClick={() => onTogglePause?.(task)}
                    >
                      <AfIcon name={isPaused ? "play" : "pause"} size={11} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="af-pj-iconbtn"
                    aria-label={`移除 ${task.app}`}
                    onClick={() => onCancel?.(task)}
                  >
                    <AfIcon name="x" size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {onOpenTasksTab ? (
        <div className="af-store-shelf__foot">
          <AfButton size="xs" variant="ghost" icon="external" onClick={onOpenTasksTab}>
            查看全部传输任务
          </AfButton>
        </div>
      ) : null}
    </div>
  ) : null;

  const smoothAvg = Math.round(useTween(avgProgress, 280));

  return (
    <div className={cn("af-store-shelf", className)} data-expanded={expanded ? "true" : undefined}>
      <AfTray footer={miniQueueFooter}>
        <button
          type="button"
          className="af-store-shelf__pill"
          aria-expanded={expanded}
          aria-label={`后台传输任务架，${activeCount} 个活跃任务`}
          onClick={() => setExpanded(!expanded)}
        >
          <AfProgressRing value={smoothAvg} size={26} tone={activeCount > 0 ? "accent" : "success"} showCount={false} />
          <div className="af-store-shelf__summary">
            <strong>
              {activeCount > 0 ? `${activeCount} 项正在传输` : "后台传输已就绪"}
            </strong>
            <span>
              {smoothAvg}% · {speedSummary}
            </span>
          </div>
          <AfTag tone={activeCount > 0 ? "accent" : "neutral"} size="sm">
            {expanded ? "收起" : "队列"}
          </AfTag>
          <AfIcon
            name="chevronUp"
            size={13}
            className="af-store-shelf__chev"
          />
        </button>
      </AfTray>
    </div>
  );
}
