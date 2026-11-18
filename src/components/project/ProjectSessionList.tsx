import { useRef, useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import {
  compactTokens,
  sessionStatusLabel,
  sessions as defaultSessions,
  sessionSteps as defaultSessionSteps,
  type SessionStatus,
  type SessionStep,
} from "../../model";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfButton, AfSegmented, AfStatus, AfTag } from "../../ui";
import { CardHead, ModelVendorMark, sessionTone, useListFlip } from "../_shared/project";

/** 会话列表条目。 */
export type AfProjectSessionItem = {
  id: string;
  title: string;
  project: string;
  model: string;
  status: SessionStatus;
  tokens: number;
  time: string;
  steps?: SessionStep[];
};

/** 会话列表组件属性。 */
export type AfProjectSessionListProps = {
  /** 会话数据集（默认展示最近 4 条示例会话）。 */
  sessions?: AfProjectSessionItem[];
  /** 卡片标题。 */
  title?: ReactNode;
  /** 卡片副标题。 */
  desc?: ReactNode;
  /** 默认展开的会话 id（非受控）。 */
  defaultOpenId?: string | null;
  /** 当前展开的会话 id（受控）。 */
  openId?: string | null;
  /** 展开状态变化回调。 */
  onOpenChange?: (id: string | null) => void;
  /** 打开会话回调。 */
  onOpenSession?: (session: AfProjectSessionItem) => void;
  /** 重试失败会话回调。 */
  onRetrySession?: (session: AfProjectSessionItem) => void;
  /** 查看日志回调。 */
  onViewLogs?: (session: AfProjectSessionItem) => void;
  className?: string;
};

type FilterKey = "all" | "active" | "issue";

/** 会话列表：模型图标磁贴 + 结构化双行摘要 + 可折叠步骤时间轴与快捷筛选。 */
function ProjectSessionList({
  sessions: sessionsProp,
  title = "最近任务记录",
  desc = "工作区 · 最近 2 小时执行历史",
  defaultOpenId = "s2",
  openId: openIdProp,
  onOpenChange,
  onOpenSession,
  onRetrySession,
  onViewLogs,
  className,
}: AfProjectSessionListProps = {}) {
  const [innerOpenId, setInnerOpenId] = useState<string | null>(defaultOpenId);
  const [filter, setFilter] = useState<FilterKey>("all");
  const openId = openIdProp !== undefined ? openIdProp : innerOpenId;
  const setOpenId = (next: string | null) => {
    if (openIdProp === undefined) setInnerOpenId(next);
    onOpenChange?.(next);
  };
  const [ready, setReady] = useState(false);
  const [stepHeights, setStepHeights] = useState<Record<string, number>>({});
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const flip = useListFlip(rootRef);
  const allSessions: AfProjectSessionItem[] = sessionsProp ?? defaultSessions.slice(0, 4);

  const list = allSessions.filter((s) => {
    if (filter === "active") return s.status === "running" || s.status === "waiting";
    if (filter === "issue") return s.status === "failed";
    return true;
  });

  useIsomorphicLayoutEffect(() => {
    flip.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const measure = (id: string | null) => {
    if (!id) return;
    const node = stepRefs.current[id];
    if (!node) return;
    const height = node.scrollHeight;
    setStepHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  };

  useIsomorphicLayoutEffect(() => {
    measure(openId);
    const activeNode = openId ? stepRefs.current[openId] : null;
    const ro = activeNode && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure(openId)) : null;
    if (activeNode) ro?.observe(activeNode);
    const onResize = () => measure(openId);
    window.addEventListener("resize", onResize);
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [openId, filter]);

  return (
    <div className={cn("af-pj-sessions", className)} ref={rootRef}>
      <CardHead
        title={title}
        desc={desc}
        extra={
          <AfSegmented
            size="xs"
            aria-label="会话状态筛选"
            value={filter}
            onChange={(next) => {
              flip.capture();
              setFilter(next as FilterKey);
            }}
            options={[
              { value: "all", label: `全部 ${allSessions.length}` },
              { value: "active", label: "活跃" },
              { value: "issue", label: "异常" },
            ]}
          />
        }
      />
      <ul className="af-pj-sessions__list" role="list">
        {list.map((session) => {
          const open = openId === session.id;
          const steps = session.steps ?? defaultSessionSteps[session.id] ?? [];
          const measured = stepHeights[session.id];
          return (
            <li key={session.id} className="af-pj-session" data-flip data-open={open || undefined}>
              <button
                type="button"
                className="af-pj-session__row"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : session.id)}
              >
                <span className="af-pj-sqtile" aria-hidden="true">
                  <ModelVendorMark model={session.model} size={15} />
                </span>
                <span className="af-pj-session__main">
                  <span className="af-pj-session__title">{session.title}</span>
                  <span className="af-pj-session__meta">
                    <code className="af-pj-codechip">{session.project}</code>
                    <span>{session.model}</span>
                    <span>·</span>
                    <span className="af-pj-tabular">{compactTokens(session.tokens)} Token</span>
                    <span>·</span>
                    <span>{session.time}</span>
                  </span>
                </span>
                {session.status === "running" ? (
                  <AfStatus tone="accent" pulse>
                    运行中
                  </AfStatus>
                ) : (
                  <AfTag tone={sessionTone[session.status]} dot>
                    {sessionStatusLabel[session.status]}
                  </AfTag>
                )}
                <AfIcon name="chevronRight" size={14} className="af-pj-session__chev" />
              </button>
              <div
                className="af-pj-session__steps"
                data-open={open || undefined}
                data-ready={ready || undefined}
                aria-hidden={!open || undefined}
                {...(!open ? { inert: "true" as unknown as boolean } : undefined)}
                style={{ height: open ? (measured === undefined ? "auto" : `${measured}px`) : 0 }}
              >
                <div
                  className="af-pj-session__steps-inner"
                  ref={(node) => {
                    stepRefs.current[session.id] = node;
                  }}
                >
                  <div className="af-pj-session__tray">
                    <div className="af-pj-step-list">
                      {steps.map((step, index) => (
                        <div className="af-pj-step" key={`${session.id}-${step.text}`}>
                          <span className="af-pj-step__index" data-state={step.state} aria-hidden="true">
                            {step.state === "active" ? (
                              <AfIcon name="loader" size={11} />
                            ) : step.state === "done" ? (
                              <AfIcon name="check" size={11} />
                            ) : step.state === "failed" ? (
                              <AfIcon name="x" size={11} />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span className="af-pj-step__text" data-state={step.state}>
                            {step.text}
                          </span>
                          <span className="af-pj-step__time">{step.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="af-pj-session__actions">
                      <AfButton size="xs" variant="secondary" icon="external" onClick={() => onOpenSession?.(session)}>
                        打开会话
                      </AfButton>
                      {session.status === "failed" ? (
                        <AfButton size="xs" variant="ghost" icon="refresh" onClick={() => onRetrySession?.(session)}>
                          重试执行
                        </AfButton>
                      ) : (
                        <AfButton size="xs" variant="ghost" onClick={() => onViewLogs?.(session)}>
                          查看日志
                        </AfButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { ProjectSessionList as AfProjectSessionList };
