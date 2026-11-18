import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfButton } from "../../ui";
import { useFlip } from "../../ui-pro";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import {
  BoardLayoutIcon,
  INBOX_LABEL,
  INBOX_TASKS,
  InboxCard,
  InboxStatus,
  InboxStatusIcon,
  ListLayoutIcon,
  SearchTinyIcon,
  SparkleDotIcon,
  WrenchTinyIcon,
  formatDuration,
  inboxLane,
  reducedMotion,
  useStopwatch,
} from "../_shared/agents-b";

export type { InboxStatus };
export type AgentInboxTask = (typeof INBOX_TASKS)[number];
export type AgentInboxView = "board" | "list";

export interface AfAgentInboxPatternProps {
  /** Breadcrumb panel title. */
  title?: ReactNode;
  /** Initial tasks list (legacy alias). */
  initialTasks?: AgentInboxTask[];
  /** Controlled or initial tasks list. */
  tasks?: AgentInboxTask[];
  /** Controlled view mode. */
  view?: AgentInboxView;
  /** Default view mode. */
  defaultView?: AgentInboxView;
  /** View change callback. */
  onViewChange?: (view: AgentInboxView) => void;
  /** Optional header action button. */
  action?: { label: string; onClick: () => void };
  /** Approve waiting task callback. */
  onApprove?: (task: AgentInboxTask) => void;
  /** Reject waiting task callback. */
  onReject?: (task: AgentInboxTask) => void;
  /** Retry failed task callback. */
  onRetry?: (task: AgentInboxTask) => void;
  /** Open task thread callback. */
  onOpen?: (task: AgentInboxTask) => void;
  /** Status transition callback. */
  onStatusChange?: (id: string, next: InboxStatus) => void;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

function AgentInboxDemo({
  title = "Agent inbox",
  initialTasks = INBOX_TASKS,
  tasks: tasksProp,
  view: viewProp,
  defaultView = "board",
  onViewChange,
  action,
  onApprove,
  onReject,
  onRetry,
  onOpen,
  onStatusChange,
  className,
  style,
}: AfAgentInboxPatternProps = {}) {
  const [innerView, setInnerView] = useState<AgentInboxView>(defaultView);
  const [items, setItems] = useState<AgentInboxTask[]>(tasksProp ?? initialTasks);
  const [previewStatus, setPreviewStatus] = useState<Record<string, InboxStatus>>({});
  const [lastAction, setLastAction] = useState<{ id: string; prev: InboxStatus; label: string } | null>(null);
  const lanesRef = useRef<HTMLDivElement | null>(null);
  const glideTimer = useRef<number | null>(null);
  const tick = useStopwatch(true);

  const view = viewProp ?? innerView;
  const captureFlip = useFlip(
    lanesRef,
    items.map((t) => `${t.id}:${t.status}`).join(","),
  );

  useEffect(() => {
    if (tasksProp) setItems(tasksProp);
  }, [tasksProp]);

  useEffect(
    () => () => {
      if (glideTimer.current) window.clearTimeout(glideTimer.current);
    },
    [],
  );

  const setView = (next: AgentInboxView) => {
    if (viewProp === undefined) setInnerView(next);
    onViewChange?.(next);
  };

  const change = (id: string, next: InboxStatus, label: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const prev = target.status;

    const commit = () => {
      captureFlip();
      setPreviewStatus((map) => {
        const copy = { ...map };
        delete copy[id];
        return copy;
      });
      setItems((list) =>
        list.map((item) =>
          item.id === id
            ? { ...item, status: next, elapsed: next === "running" ? 12 : item.elapsed || 252 }
            : item,
        ),
      );
      setLastAction({ id, prev, label });
      onStatusChange?.(id, next);
    };

    if (view === "board" && !reducedMotion()) {
      setPreviewStatus((map) => ({ ...map, [id]: next }));
      if (glideTimer.current) window.clearTimeout(glideTimer.current);
      glideTimer.current = window.setTimeout(commit, 180);
    } else {
      commit();
    }
  };

  const undo = () => {
    if (!lastAction) return;
    captureFlip();
    setItems((list) =>
      list.map((item) => (item.id === lastAction.id ? { ...item, status: lastAction.prev } : item)),
    );
    onStatusChange?.(lastAction.id, lastAction.prev);
    setLastAction(null);
  };

  useEffect(() => {
    if (!lastAction) return;
    const timer = window.setTimeout(() => setLastAction(null), 8000);
    return () => window.clearTimeout(timer);
  }, [lastAction]);

  const elapsedOf = (task: AgentInboxTask) => task.elapsed + (task.status === "running" ? tick : 0);

  const lanes: { key: "need" | "running" | "done"; title: string; empty: string }[] = [
    { key: "need", title: "NEEDS YOU", empty: "Nothing waiting on you" },
    { key: "running", title: "RUNNING", empty: "No active tasks" },
    { key: "done", title: "DONE", empty: "No completed tasks yet" },
  ];

  return (
    <div className={cn("af-agb-inbox", className)} style={style}>
      <header className="af-agb-inbox__bar">
        <div className="af-agb-inbox__crumb">
          <span className="af-agb-inbox__crumb-root">Agents</span>
          <span className="af-agb-inbox__crumb-sep" aria-hidden>
            /
          </span>
          <strong className="af-agb-inbox__crumb-current">{title}</strong>
        </div>
        <div className="af-agb-inbox__barright">
          {action ? (
            <AfButton size="sm" variant="secondary" icon="plus" onClick={action.onClick}>
              {action.label}
            </AfButton>
          ) : null}
          <div className="af-agb-inbox__views" role="tablist" aria-label="Inbox layout">
            <button
              type="button"
              role="tab"
              aria-selected={view === "board"}
              className="af-agb-inbox__viewbtn"
              data-active={view === "board" || undefined}
              onClick={() => setView("board")}
            >
              <BoardLayoutIcon size={13} />
              <span>Board</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              className="af-agb-inbox__viewbtn"
              data-active={view === "list" || undefined}
              onClick={() => setView("list")}
            >
              <ListLayoutIcon size={13} />
              <span>List</span>
            </button>
          </div>
        </div>
      </header>

      {view === "board" ? (
        <div className="af-agb-inbox__lanes" ref={lanesRef}>
          {lanes.map((lane) => {
            const list = items.filter((item) => inboxLane(item.status) === lane.key);
            return (
              <section className="af-agb-inbox-lane" key={lane.key} aria-label={lane.title}>
                <header className="af-agb-inbox-lane__head">
                  <span className="af-agb-inbox-lane__spark" aria-hidden>
                    <SparkleDotIcon size={13} />
                  </span>
                  <span className="af-agb-inbox-lane__title">{lane.title}</span>
                  <span className="af-agb-inbox-lane__count">{list.length}</span>
                </header>
                <div className="af-agb-inbox-lane__body">
                  {list.map((task) => {
                    const shownStatus = previewStatus[task.id] ?? task.status;
                    return (
                      <InboxCard
                        key={task.id}
                        flipId={task.id}
                        task={task}
                        status={shownStatus}
                        elapsed={task.elapsed}
                        onApprove={() => {
                          onApprove?.(task);
                          change(task.id, "running", `Approved "${task.title}"`);
                        }}
                        onReject={() => {
                          onReject?.(task);
                          change(task.id, "done", `Rejected "${task.title}"`);
                        }}
                        onRetry={() => {
                          onRetry?.(task);
                          change(task.id, "running", `Retried "${task.title}"`);
                        }}
                        onOpen={
                          onOpen
                            ? () => onOpen(task)
                            : () =>
                                setLastAction({
                                  id: task.id,
                                  prev: task.status,
                                  label: `Opened "${task.title}"`,
                                })
                        }
                      />
                    );
                  })}
                  {list.length === 0 ? <p className="af-agb-inbox-lane__empty">{lane.empty}</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="af-agb-inbox__list af-agb-scroll">
          {items.map((task) => (
            <li key={task.id}>
              <article className="af-agb-inbox-row" data-status={task.status}>
                <span className="af-agb-inbox-card__spark" data-status={task.status} aria-hidden>
                  <SparkleDotIcon size={14} />
                </span>
                <span className="af-agb-inbox-row__main">
                  <span className="af-agb-inbox-row__title">{task.title}</span>
                  <span className="af-agb-inbox-row__desc">{task.description}</span>
                </span>
                <span className="af-agb-state" data-status={task.status}>
                  <span className="af-agb-state__icon" data-status={task.status} aria-hidden>
                    <InboxStatusIcon status={task.status} />
                  </span>
                  <span>
                    {task.status === "running"
                      ? formatDuration(elapsedOf(task))
                      : task.status === "done"
                        ? formatDuration(task.elapsed || 252)
                        : INBOX_LABEL[task.status]}
                  </span>
                </span>
                <span className="af-agb-inbox-card__counts">
                  <span>
                    <SearchTinyIcon />
                    {task.counts[0]}
                  </span>
                  <i aria-hidden />
                  <span>
                    <WrenchTinyIcon />
                    {task.counts[1]}
                  </span>
                </span>
                <span className="af-agb-inbox-row__actions">
                  {task.status === "waiting" ? (
                    <>
                      <button
                        type="button"
                        className="af-agb-aic-btn"
                        onClick={() => {
                          onReject?.(task);
                          change(task.id, "done", `Rejected "${task.title}"`);
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="af-agb-aic-btn af-agb-aic-btn--primary"
                        onClick={() => {
                          onApprove?.(task);
                          change(task.id, "running", `Approved "${task.title}"`);
                        }}
                      >
                        Approve
                      </button>
                    </>
                  ) : task.status === "failed" ? (
                    <button
                      type="button"
                      className="af-agb-aic-btn af-agb-aic-btn--primary"
                      onClick={() => {
                        onRetry?.(task);
                        change(task.id, "running", `Retried "${task.title}"`);
                      }}
                    >
                      Retry
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="af-agb-aic-btn"
                      onClick={() => {
                        if (onOpen) onOpen(task);
                        else setLastAction({ id: task.id, prev: task.status, label: `Opened "${task.title}"` });
                      }}
                    >
                      Open
                    </button>
                  )}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}

      {lastAction ? (
        <div className="af-agb-inbox__undo" role="status" aria-live="polite">
          <AfIcon name="check" size={13} />
          <span>{lastAction.label}</span>
          <button type="button" className="af-agb-aic-btn" onClick={undo}>
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}

export { AgentInboxDemo as AfAgentInboxPattern, AgentInboxDemo as AfAgentInbox };
export type { AfAgentInboxPatternProps as AfAgentInboxProps };
