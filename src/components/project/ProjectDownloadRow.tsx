import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn, useAnimatedList } from "../../primitives";
import { AfButton, AfTag } from "../../ui";
import { CardHead, useReducedMotion } from "../_shared/project";

/** 下载传输任务 7 态完整枚举（同时兼容历史 `"active" | "done"` 状态名）。 */
export type AfDownloadTaskState =
  | "queued"
  | "downloading"
  | "paused"
  | "verifying"
  | "installing"
  | "completed"
  | "failed"
  | "active"
  | "done";

/** 下载任务条目。 */
export type AfProjectDownloadTask = {
  id: string;
  app: string;
  icon: AfIconSlot;
  version: string;
  size: string;
  speed: string;
  /** 预计剩余时间文案，如 `"00:18"`。 */
  eta?: string;
  /** 失败错误原因或 SHA-256 摘要说明。 */
  statusDetail?: string;
  state: AfDownloadTaskState;
  progress: number;
};

/** 下载任务行组件属性。 */
export type AfProjectDownloadRowProps = {
  tasks?: AfProjectDownloadTask[];
  title?: ReactNode;
  desc?: ReactNode;
  onTogglePause?: (task: AfProjectDownloadTask) => void;
  onRetry?: (task: AfProjectDownloadTask) => void;
  onCancel?: (task: AfProjectDownloadTask) => void;
  onOpen?: (task: AfProjectDownloadTask) => void;
  simulateProgress?: boolean;
  emptyText?: ReactNode;
  className?: string;
};

const DEFAULT_TASKS: AfProjectDownloadTask[] = [
  {
    id: "d1",
    app: "数据看板",
    icon: "chart",
    version: "1.4.2",
    size: "12.4 MB",
    speed: "4.8 MB/s",
    eta: "00:02",
    state: "downloading",
    progress: 56,
  },
  {
    id: "d2",
    app: "多轨视频台",
    icon: "play",
    version: "2.1.0",
    size: "48.2 MB",
    speed: "SHA-256 验签中",
    state: "verifying",
    progress: 100,
  },
  {
    id: "d3",
    app: "服务监控",
    icon: "server",
    version: "0.3.8",
    size: "8.1 MB",
    speed: "已暂停",
    state: "paused",
    progress: 24,
  },
  {
    id: "d4",
    app: "离线词典包",
    icon: "translate",
    version: "0.9.1",
    size: "5.6 MB",
    speed: "校验通过",
    state: "completed",
    progress: 100,
  },
];

function normalizeTaskState(
  raw: AfDownloadTaskState,
): Exclude<AfDownloadTaskState, "active" | "done"> {
  if (raw === "active") return "downloading";
  if (raw === "done") return "completed";
  return raw;
}

/** 下载任务行（7 态完整版）：排队、传输速率/剩余时间、暂停、SHA-256 验签、落盘安装、完成与失败重试，带平滑 FLIP 退场补位。 */
function ProjectDownloadRow({
  tasks: tasksProp,
  title = "下载与安装队列",
  desc = "应用包下载、签名校验与自动安装",
  onTogglePause,
  onRetry,
  onCancel,
  onOpen,
  simulateProgress = false,
  emptyText = "传输队列已全部处理完毕",
  className,
}: AfProjectDownloadRowProps = {}) {
  const [innerTasks, setInnerTasks] = useState<AfProjectDownloadTask[]>(DEFAULT_TASKS);
  const tasks = tasksProp ?? innerTasks;
  const reduced = useReducedMotion();

  const { entries, listRef, flip, requestRemove } = useAnimatedList<AfProjectDownloadTask>({
    items: tasks,
    getKey: (task) => task.id,
    exitDuration: 180,
    flipDuration: 260,
    disabled: reduced,
    onRemove: (_key, task) => {
      if (!tasksProp) {
        setInnerTasks((prev) => prev.filter((item) => item.id !== task.id));
      }
      onCancel?.(task);
    },
  });

  useEffect(() => {
    if (!simulateProgress || tasksProp !== undefined) return;
    const timer = window.setInterval(() => {
      setInnerTasks((prev) =>
        prev.map((task) => {
          const st = normalizeTaskState(task.state);
          if (st !== "downloading") return task;
          const next = Math.min(100, task.progress + (reduced ? 25 : 4));
          return { ...task, progress: next, state: next >= 100 ? "completed" : "downloading" };
        }),
      );
    }, reduced ? 600 : 520);
    return () => window.clearInterval(timer);
  }, [reduced, simulateProgress, tasksProp]);

  const toggle = (task: AfProjectDownloadTask) => {
    if (!tasksProp) {
      setInnerTasks((prev) =>
        prev.map((item) => {
          if (item.id !== task.id) return item;
          const st = normalizeTaskState(item.state);
          if (st === "downloading" || st === "queued") return { ...item, state: "paused" };
          if (st === "paused") return { ...item, state: "downloading" };
          return item;
        }),
      );
    }
    onTogglePause?.(task);
  };

  const retry = (task: AfProjectDownloadTask) => {
    if (!tasksProp) {
      setInnerTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, state: "downloading", progress: Math.max(8, item.progress) } : item,
        ),
      );
    }
    onRetry?.(task);
  };

  const cancel = (task: AfProjectDownloadTask) => {
    if (tasksProp !== undefined) {
      onCancel?.(task);
      return;
    }
    requestRemove(task.id);
  };

  const activeCount = tasks.filter((t) => {
    const st = normalizeTaskState(t.state);
    return st === "queued" || st === "downloading" || st === "verifying" || st === "installing";
  }).length;

  return (
    <div className={cn("af-pj-downloads", className)} ref={listRef as RefObject<HTMLDivElement>}>
      <CardHead
        title={title}
        desc={desc}
        extra={
          <span className="af-pj-pill-group">
            {activeCount > 0 ? (
              <AfTag tone="accent" dot size="sm">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{activeCount} 个活跃任务</span>
              </AfTag>
            ) : (
              <span className="af-pj-count">队列空闲</span>
            )}
            {!tasksProp && tasks.length < DEFAULT_TASKS.length ? (
              <AfButton
                size="xs"
                variant="ghost"
                icon="refresh"
                onClick={() => {
                  flip.capture();
                  setInnerTasks(DEFAULT_TASKS);
                }}
              >
                恢复
              </AfButton>
            ) : null}
          </span>
        }
      />
      {entries.length > 0 ? (
        <ul className="af-pj-downloads__list" role="list" data-af-hover-list="wash">
          {entries.map(({ item: task, key, leaving }) => {
            const st = normalizeTaskState(task.state);
            const statusText =
              st === "completed"
                ? "已完成"
                : st === "queued"
                  ? "排队等待"
                  : st === "verifying"
                    ? "校验中 · 100%"
                    : st === "installing"
                      ? "正在安装"
                      : st === "failed"
                        ? "下载中断"
                        : st === "paused"
                          ? `已暂停 · ${task.progress}%`
                          : `${task.progress}%`;

            const metaText =
              st === "completed"
                ? `${task.size} · 签名校验通过`
                : st === "failed"
                  ? (task.statusDetail ?? `${task.size} · 连接中断，点击重试`)
                  : st === "verifying"
                    ? `${task.size} · 正在校验文件签名`
                    : st === "installing"
                      ? `${task.size} · 正在解压并完成配置`
                      : st === "paused"
                        ? `${task.size} · 已暂停，支持断点续传`
                        : st === "queued"
                          ? `${task.size} · 等待传输队列`
                          : `${task.size} · ${task.speed}${task.eta ? ` · 剩余 ${task.eta}` : ""}`;

            return (
              <li
                className="af-pj-download"
                key={key}
                data-flip={key}
                data-task-state={st}
                data-leaving={leaving ? "true" : undefined}
              >
                <span className="af-pj-sqtile af-pj-sqtile--md" aria-hidden="true">
                  {renderAfIconSlot(task.icon, 16)}
                </span>
                <div className="af-pj-download__main">
                  <div className="af-pj-download__top">
                    <span className="af-pj-download__title">
                      <span className="af-pj-download__name">{task.app}</span>
                      <code className="af-pj-codechip">v{task.version}</code>
                    </span>
                    <span
                      className="af-pj-download__pct"
                      data-state={st === "completed" ? "done" : st === "downloading" ? "active" : st}
                    >
                      {statusText}
                    </span>
                  </div>
                  <div className="af-pj-download__bar-row">
                    <span
                      className="af-pj-download__track"
                      role="progressbar"
                      aria-valuenow={task.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${task.app} 下载进度`}
                      data-state={st === "completed" ? "done" : st === "downloading" ? "active" : st}
                    >
                      <span style={{ width: `${st === "queued" ? 6 : task.progress}%` }} />
                    </span>
                    <span className="af-pj-download__meta">{metaText}</span>
                  </div>
                </div>
                <span className="af-pj-download__actions">
                  {st === "completed" ? (
                    onOpen ? (
                      <AfButton size="xs" variant="secondary" onClick={() => onOpen(task)}>
                        打开
                      </AfButton>
                    ) : (
                      <AfTag tone="success" dot size="sm">
                        已就绪
                      </AfTag>
                    )
                  ) : st === "failed" ? (
                    <AfButton size="xs" variant="primary" icon="refresh" onClick={() => retry(task)}>
                      重试
                    </AfButton>
                  ) : st === "verifying" || st === "installing" ? (
                    <AfTag tone="accent" size="sm">
                      {st === "verifying" ? "验签" : "落盘"}
                    </AfTag>
                  ) : (
                    <button
                      type="button"
                      className="af-pj-iconbtn af-pj-iconbtn--ring"
                      aria-label={st === "paused" ? `继续 ${task.app}` : `暂停 ${task.app}`}
                      onClick={() => toggle(task)}
                    >
                      <AfIcon name={st === "paused" ? "play" : "pause"} size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="af-pj-iconbtn"
                    aria-label={`取消 ${task.app}`}
                    onClick={() => cancel(task)}
                  >
                    <AfIcon name="x" size={12} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="af-pj-downloads__empty">
          <AfIcon name="checkCircle" size={15} />
          <span>{emptyText}</span>
        </div>
      )}
    </div>
  );
}

export { ProjectDownloadRow as AfProjectDownloadRow };
