import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { usePointerDragBoard } from "../../primitives";
import {
  BOARD_AGENTS,
  BOARD_TASKS,
  BrandLogo,
  HeaderSpark,
  clockText,
  money,
  type BoardAgent,
  type BoardTask,
} from "../_shared/agents-a";

export type { BoardAgent, BoardTask };

export interface AfDelegateBoardProps {
  title?: string;
  initialTasks?: BoardTask[];
  initialAgents?: BoardAgent[];
  defaultAuto?: boolean;
  onAssign?: (taskId: string, agentId: string) => void;
  onUnassign?: (agentId: string, chipId: string) => void;
  onReorderTasks?: (tasks: BoardTask[]) => void;
  className?: string;
}

export type AfDelegateBoardPatternProps = AfDelegateBoardProps;

export function AfDelegateBoard({
  title = "Delegate",
  initialTasks = BOARD_TASKS,
  initialAgents = BOARD_AGENTS,
  defaultAuto = false,
  onAssign,
  onUnassign,
  onReorderTasks,
  className,
}: AfDelegateBoardProps = {}) {
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [agents, setAgents] = useState<BoardAgent[]>(initialAgents);
  const [autoMode, setAutoMode] = useState(defaultAuto);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  const columnIds = useMemo(
    () => ["unassigned", ...agents.map((a) => a.id)],
    [agents],
  );

  const getColumnItems = useCallback(
    (colId: string) => (colId === "unassigned" ? tasks : []),
    [tasks],
  );

  const assignTaskToAgent = (
    taskId: string,
    agentId: string,
    opts?: { skipFlipCapture?: boolean },
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (!opts?.skipFlipCapture) {
      flip.capture();
    }
    setTasks((prev) => {
      const rest = prev.filter((t) => t.id !== taskId);
      if (selectedTaskId === taskId) setSelectedTaskId(rest[0]?.id ?? null);
      return rest;
    });
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        const isFirst = a.queue.length === 0;
        return {
          ...a,
          minutes: a.minutes + task.minutes,
          queue: [
            ...a.queue,
            {
              id: task.id,
              title: task.title,
              icon: task.icon,
              brands: task.brands,
              minutes: task.minutes,
              cost: task.minutes * a.rate,
              state: isFirst ? "running" : "queued",
            },
          ],
        };
      }),
    );
    onAssign?.(taskId, agentId);
  };

  const {
    boardRef,
    flip,
    activeId,
    overColumnId,
    getColumnProps,
    getItemProps,
    ghostPortal,
  } = usePointerDragBoard<BoardTask, string>({
    columnIds,
    getColumnItems,
    getKey: (t) => t.id,
    requireDirectColumnHit: true,
    onMove: ({ itemId, fromIndex, toColumnId, toIndex }) => {
      if (toColumnId === "unassigned") {
        setTasks((prev) => {
          if (fromIndex < 0 || fromIndex >= prev.length) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          if (!moved) return prev;
          const clamped = Math.max(0, Math.min(toIndex, next.length));
          next.splice(clamped, 0, moved);
          onReorderTasks?.(next);
          return next;
        });
      } else {
        assignTaskToAgent(itemId, toColumnId, { skipFlipCapture: true });
      }
    },
  });

  // Auto mode drains unassigned tasks into whichever agent is free first
  useEffect(() => {
    if (!autoMode || tasks.length === 0) return;
    const timer = window.setTimeout(() => {
      const nextTask = tasks[0];
      if (!nextTask) return;
      const best = [...agents].sort((a, b) => a.minutes - b.minutes)[0];
      if (best) assignTaskToAgent(nextTask.id, best.id);
    }, 520);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, tasks, agents]);

  const unassignChip = (agentId: string, chipId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    const chip = agent?.queue.find((c) => c.id === chipId);
    if (!agent || !chip) return;
    const mins = chip.minutes ?? 12;
    flip.capture();
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        const remaining = a.queue.filter((c) => c.id !== chipId).map((c, i) => ({
          ...c,
          state: i === 0 ? ("running" as const) : ("queued" as const),
        }));
        return { ...a, minutes: Math.max(0, a.minutes - mins), queue: remaining };
      }),
    );
    setTasks((prev) => [
      ...prev,
      {
        id: chip.id,
        title: chip.title,
        icon: chip.icon,
        brands: chip.brands,
        minutes: mins,
        cost: mins * agent.rate,
      },
    ]);
    onUnassign?.(agentId, chipId);
  };

  const totalQueueCost = useMemo(
    () =>
      agents.reduce(
        (acc, a) =>
          acc +
          a.queue.reduce((sum, chip) => sum + (chip.cost ?? (chip.minutes ?? 0) * a.rate), 0),
        0,
      ),
    [agents],
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === (activeId ?? selectedTaskId)) ?? null,
    [tasks, activeId, selectedTaskId],
  );

  return (
    <section
      className={["af-dbc", className].filter(Boolean).join(" ")}
      aria-label={title}
      onKeyDown={(e) => {
        if (!selectedTaskId) return;
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < agents.length) {
          e.preventDefault();
          assignTaskToAgent(selectedTaskId, agents[idx]!.id);
        }
      }}
    >
      <header className="af-dbc__head">
        <div className="af-dbc__head-left">
          <span style={{ display: "inline-flex", color: "#3b82f6" }} aria-hidden="true">
            <HeaderSpark size={14} />
          </span>
          <span className="af-dbc__title">{title}</span>
          <span className="af-dbc__sub">
            {autoMode ? "New tasks go to whoever is free first" : "Drag a task onto an agent"}
          </span>
        </div>

        <div className="af-dbc__auto" onClick={() => setAutoMode((v) => !v)}>
          <span>Auto</span>
          <button
            type="button"
            role="switch"
            aria-label="Auto delegate"
            aria-checked={autoMode}
            className="af-dbc__switch"
            onClick={(e) => {
              e.stopPropagation();
              setAutoMode((v) => !v);
            }}
          >
            <span className="af-dbc__switch-thumb" />
          </button>
        </div>
      </header>

      <div className="af-dbc__cols" ref={boardRef as RefObject<HTMLDivElement>}>
        <div className="af-dbc__left" {...getColumnProps("unassigned")}>
          <div className="af-dbc__col-head af-dbc__col-head--left">
            <span>Unassigned</span>
            <span className="af-dbc__count">{tasks.length}</span>
          </div>

          {tasks.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--dbc-muted)", padding: "12px 4px" }}>
              All tasks assigned
            </div>
          ) : (
            tasks.map((task, index) => {
              const dragProps = getItemProps(task, "unassigned", index);
              return (
                <button
                  key={task.id}
                  type="button"
                  className="af-dbc__task"
                  {...dragProps}
                  data-selected={selectedTaskId === task.id ? "true" : undefined}
                  onClick={() => setSelectedTaskId((curr) => (curr === task.id ? null : task.id))}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="af-dbc__grip">
                    <circle cx="4.3" cy="3" r="0.95" fill="currentColor" />
                    <circle cx="7.7" cy="3" r="0.95" fill="currentColor" />
                    <circle cx="4.3" cy="6" r="0.95" fill="currentColor" />
                    <circle cx="7.7" cy="6" r="0.95" fill="currentColor" />
                    <circle cx="4.3" cy="9" r="0.95" fill="currentColor" />
                    <circle cx="7.7" cy="9" r="0.95" fill="currentColor" />
                  </svg>

                  <span className="af-dbc__task-body">
                    <span className="af-dbc__task-title">{task.title}</span>
                    <span className="af-dbc__task-meta">
                      {(task.brands ?? []).map((b, i) => (
                        <span key={`${task.id}-b-${i}`} className="af-dbc__task-brand">
                          <BrandLogo kind={b} size={12} />
                        </span>
                      ))}
                      <span className="af-dbc__task-min">~{task.minutes} min</span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="af-dbc__right">
          <div className="af-dbc__col-head">
            <span>Agents</span>
            <span>{money(totalQueueCost)} in queues</span>
          </div>

          {agents.map((agent) => {
            const isDropHover = activeId !== null && overColumnId === agent.id;
            const isHover = (hoveredAgentId === agent.id || isDropHover) && activeTask !== null;
            const addCost = activeTask ? activeTask.minutes * agent.rate : 0;

            return (
              <div
                key={agent.id}
                className="af-dbc__agent"
                {...getColumnProps(agent.id)}
                data-drop={isDropHover ? "true" : undefined}
                onMouseEnter={() => setHoveredAgentId(agent.id)}
                onMouseLeave={() => setHoveredAgentId((curr) => (curr === agent.id ? null : curr))}
                onClick={() => {
                  if (selectedTaskId) assignTaskToAgent(selectedTaskId, agent.id);
                }}
              >
                <div className="af-dbc__agent-top">
                  <div className="af-dbc__agent-who">
                    <span className="af-dbc__agent-logo">
                      <BrandLogo kind={agent.brand ?? "claude"} size={16} />
                    </span>
                    <div className="af-dbc__agent-meta">
                      <strong className="af-dbc__agent-name">{agent.name}</strong>
                      <span className="af-dbc__agent-sub">
                        {agent.model} &nbsp; ${agent.rate.toFixed(2)}/min
                      </span>
                    </div>
                  </div>

                  <span className="af-dbc__busy" data-free={agent.minutes === 0 ? "true" : undefined}>
                    {isHover
                      ? `+${money(addCost)} · until ${clockText(agent.minutes + (activeTask?.minutes ?? 0))}`
                      : agent.minutes === 0
                        ? "Free"
                        : `Busy until ${clockText(agent.minutes)}`}
                  </span>
                </div>

                {agent.queue.length > 0 ? (
                  <div className="af-dbc__chips">
                    {agent.queue.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="af-dbc__chip"
                        data-flip={chip.id}
                        data-state={chip.state}
                        title="Click to return to Unassigned"
                        onClick={(e) => {
                          e.stopPropagation();
                          unassignChip(agent.id, chip.id);
                        }}
                      >
                        {chip.state === "running" ? (
                          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="af-dbc__spin">
                            <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.6" />
                            <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        ) : (
                          (chip.brands ?? []).map((b, bi) => (
                            <span key={`${chip.id}-cb-${bi}`} className="af-dbc__chip-brand">
                              <BrandLogo kind={b} size={11} />
                            </span>
                          ))
                        )}
                        <span>{chip.title}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {ghostPortal}
    </section>
  );
}

export const AfDelegateBoardPattern = AfDelegateBoard;
