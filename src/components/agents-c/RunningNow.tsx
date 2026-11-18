import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { AfPortal } from "../../primitives/layer";
import { ToolBrandMark, useFloatingAnchor } from "./_marks";

export interface ActiveRunItem {
  id: string;
  agent: string;
  task: string;
  step: string;
  pct: number;
  elapsed: number;
  paused?: boolean;
  tail: string;
}

export type RunningTaskState = "running" | "paused" | "needs-you" | "done";

export interface RunningTask {
  id: string;
  title: string;
  step: string;
  done: number;
  total: number;
  state: RunningTaskState;
}

export interface RunningNowLabels {
  title: string;
  running: string;
  needsYou: string;
  needsYouOne: string;
  needsYouBadge: string;
  paused: string;
  pausedCount: string;
  done: string;
  pause: string;
  resume: string;
  open: string;
  openAll: string;
  empty: string;
  idle: string;
}

export interface AfRunningNowProps {
  /** Ordered background tasks (rows keep stable order, never swapping places). */
  tasks?: RunningTask[];
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onOpen?: (id: string) => void;
  onOpenAll?: () => void;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "end";
  labels?: Partial<RunningNowLabels>;
  /** Render inside a realistic app header bar (enabled by default for standalone showcase). */
  withHeaderShell?: boolean;
  /** Legacy compatibility props. */
  title?: ReactNode;
  initialRuns?: ActiveRunItem[];
  onStopRun?: (runId: string) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_TASKS: RunningTask[] = [
  {
    id: "rn-1",
    title: "Ingest pipeline",
    step: "Embedding chunks",
    done: 2,
    total: 4,
    state: "running",
  },
  {
    id: "rn-2",
    title: "Refund review",
    step: "Approve a $240 refund to Acme",
    done: 1,
    total: 3,
    state: "needs-you",
  },
  {
    id: "rn-3",
    title: "Weekly report",
    step: "Drafting the summary",
    done: 1,
    total: 5,
    state: "running",
  },
  {
    id: "rn-4",
    title: "Dependency upgrade",
    step: "Running 212 tests",
    done: 1,
    total: 4,
    state: "paused",
  },
  {
    id: "rn-5",
    title: "Lead enrichment",
    step: "Loading 420 leads",
    done: 0,
    total: 6,
    state: "running",
  },
];

const DEFAULT_LABELS: RunningNowLabels = {
  title: "BACKGROUND TASKS",
  running: "running",
  needsYou: "need you",
  needsYouOne: "needs you",
  needsYouBadge: "Needs you",
  paused: "Paused",
  pausedCount: "paused",
  done: "Done",
  pause: "Pause task",
  resume: "Resume task",
  open: "Open",
  openAll: "Open Tasks",
  empty: "No background tasks running",
  idle: "All tasks idle",
};

function TaskProgressRing({
  done,
  total,
  state,
}: {
  done: number;
  total: number;
  state: RunningTaskState;
}) {
  const safeTotal = Math.max(1, total);
  const frac = Math.max(0, Math.min(1, done / safeTotal));
  const r = 6.2;
  const wedgeR = 4.6;

  const buildWedge = (ratio: number) => {
    if (ratio <= 0.01) return null;
    if (ratio >= 0.999) {
      return (
        <circle cx="8" cy="8" r={wedgeR} fill="currentColor" opacity="0.88" />
      );
    }
    const angle = ratio * Math.PI * 2 - Math.PI / 2;
    const x = 8 + wedgeR * Math.cos(angle);
    const y = 8 + wedgeR * Math.sin(angle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    return (
      <path
        d={`M 8 8 L 8 ${8 - wedgeR} A ${wedgeR} ${wedgeR} 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`}
        fill="currentColor"
        opacity="0.88"
      />
    );
  };

  return (
    <span className={cn("af-agc-rn__ring", `is-${state}`)} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle
          cx="8"
          cy="8"
          r={r}
          stroke="currentColor"
          strokeOpacity="0.62"
          strokeWidth="1.35"
        />
        {buildWedge(state === "needs-you" ? Math.max(0.33, frac) : frac)}
      </svg>
    </span>
  );
}

export function AfRunningNow({
  tasks: propTasks,
  onPause,
  onResume,
  onOpen,
  onOpenAll,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  align = "end",
  labels: labelOverrides,
  withHeaderShell = true,
  initialRuns,
  onStopRun,
  className,
  style,
}: AfRunningNowProps = {}) {
  const popoverId = useId();
  const L = { ...DEFAULT_LABELS, ...labelOverrides };

  const initialList = useMemo<RunningTask[]>(() => {
    if (propTasks && propTasks.length > 0) return propTasks;
    if (initialRuns && initialRuns.length > 0) {
      return initialRuns.map((r) => ({
        id: r.id,
        title: r.task,
        step: r.step,
        done: Math.round((r.pct / 100) * 5),
        total: 5,
        state: r.paused ? "paused" : "running",
      }));
    }
    return DEFAULT_TASKS;
  }, [initialRuns, propTasks]);

  const [stateMap, setStateMap] = useState<Record<string, RunningTaskState>>(
    {},
  );
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [darkScoped, setDarkScoped] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const tasks = useMemo(
    () =>
      initialList.map((t) =>
        stateMap[t.id] ? { ...t, state: stateMap[t.id] } : t,
      ),
    [initialList, stateMap],
  );

  const counts = useMemo(() => {
    let running = 0;
    let needs = 0;
    let paused = 0;
    for (let i = 0; i < tasks.length; i += 1) {
      if (tasks[i].state === "running") running += 1;
      else if (tasks[i].state === "needs-you") needs += 1;
      else if (tasks[i].state === "paused") paused += 1;
    }
    return { running, needs, paused };
  }, [tasks]);

  const pos = useFloatingAnchor(triggerRef, isOpen, {
    align,
    offset: 8,
    minWidth: 340,
  });

  useEffect(() => {
    if (!isOpen) return;
    const el = triggerRef.current;
    if (el) {
      const darkAncestor = el.closest(
        '[data-theme="dark"], .dark, .af-dark, [data-color-scheme="dark"]',
      );
      setDarkScoped(Boolean(darkAncestor));
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleToggleRun = (task: RunningTask) => {
    if (task.state === "running") {
      setStateMap((prev) => ({ ...prev, [task.id]: "paused" }));
      onPause?.(task.id);
      onStopRun?.(task.id);
    } else if (task.state === "paused") {
      setStateMap((prev) => ({ ...prev, [task.id]: "running" }));
      onResume?.(task.id);
    }
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const triggerPill = (
    <button
      ref={triggerRef}
      type="button"
      className={cn("af-agc-rn__trigger", isOpen && "is-open")}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={isOpen ? popoverId : undefined}
      onClick={() => setOpen(!isOpen)}
      onKeyDown={handleTriggerKeyDown}
    >
      <span className="af-agc-rn__teal-ring" aria-hidden="true" />
      <span className="af-agc-rn__trig-run">
        {counts.running > 0
          ? `${counts.running} ${L.running}`
          : counts.paused > 0
            ? `${counts.paused} ${L.pausedCount}`
            : L.idle}
      </span>

      {counts.needs > 0 ? (
        <>
          <span className="af-agc-rn__sep" aria-hidden="true">
            ·
          </span>
          <span className="af-agc-rn__amber-dot" aria-hidden="true" />
          <span className="af-agc-rn__trig-needs">
            {counts.needs}{" "}
            {counts.needs === 1 ? L.needsYouOne : L.needsYou}
          </span>
        </>
      ) : null}

      <svg
        className={cn("af-agc-rn__chev", isOpen && "is-open")}
        width="11"
        height="11"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3.25 4.75 6 7.5l2.75-2.75"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <div
      className={cn(
        "af-agc-rn",
        withHeaderShell && "has-shell",
        isOpen && "has-open-popover",
        className,
      )}
      style={style}
    >
      {withHeaderShell ? (
        <div className="af-agc-rn__shell">
          <div className="af-agc-rn__brand">
            <span className="af-agc-rn__logo" aria-hidden="true">
              <ToolBrandMark name="Acme" size={18} />
            </span>
            <span className="af-agc-rn__org">Acme</span>
            <span className="af-agc-rn__slash" aria-hidden="true">
              /
            </span>
            <span className="af-agc-rn__section">Agents</span>
          </div>
          {triggerPill}
        </div>
      ) : (
        triggerPill
      )}

      {isOpen ? (
        <AfPortal>
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label="Background tasks"
            className={cn("af-agc-rn__popover", darkScoped && "is-dark")}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: 340,
              zIndex: 9999,
            }}
          >
            <div className="af-agc-rn__pop-head">
              <span className="af-agc-rn__pop-title">{L.title}</span>
              <span className="af-agc-rn__pop-count">{tasks.length}</span>
            </div>

            <div className="af-agc-rn__rows" role="list">
              {tasks.map((task) => {
                const isNeeds = task.state === "needs-you";
                const isPaused = task.state === "paused";
                return (
                  <div
                    key={task.id}
                    role="listitem"
                    className={cn("af-agc-rn__row", `is-${task.state}`)}
                  >
                    <TaskProgressRing
                      done={task.done}
                      total={task.total}
                      state={task.state}
                    />

                    <div className="af-agc-rn__row-copy">
                      <div className="af-agc-rn__row-top">
                        <span className="af-agc-rn__row-title">
                          {task.title}
                        </span>
                      </div>
                      <div className="af-agc-rn__row-step">
                        {isPaused ? `${L.paused} · ${task.step}` : task.step}
                      </div>
                    </div>

                    {isNeeds ? (
                      <div className="af-agc-rn__row-right">
                        <span className="af-agc-rn__needs-pill">
                          {L.needsYouBadge}
                        </span>
                        <button
                          type="button"
                          className="af-agc-rn__open-btn"
                          onClick={() => onOpen?.(task.id)}
                        >
                          {L.open}
                        </button>
                      </div>
                    ) : (
                      <div className="af-agc-rn__row-right">
                        <span className="af-agc-rn__row-frac">
                          {task.done}/{task.total}
                        </span>
                        <button
                          type="button"
                          className="af-agc-rn__act-btn"
                          aria-label={isPaused ? L.resume : L.pause}
                          onClick={() => handleToggleRun(task)}
                        >
                          {isPaused ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M3.5 2.45 9.25 6 3.5 9.55V2.45Z"
                                stroke="currentColor"
                                strokeWidth="1.15"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <rect
                                x="2.65"
                                y="2.35"
                                width="2.2"
                                height="7.3"
                                rx="0.65"
                                stroke="currentColor"
                                strokeWidth="1.15"
                              />
                              <rect
                                x="7.15"
                                y="2.35"
                                width="2.2"
                                height="7.3"
                                rx="0.65"
                                stroke="currentColor"
                                strokeWidth="1.15"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="af-agc-rn__foot-btn"
              onClick={() => onOpenAll?.()}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="2.25"
                  y="1.75"
                  width="9.5"
                  height="10.5"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M4.6 5h4.8M4.6 7.3h4.8M4.6 9.6h3"
                  stroke="currentColor"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
              </svg>
              <span>{L.openAll}</span>
              <svg
                className="af-agc-rn__foot-chev"
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4.5 2.75 7.75 6 4.5 9.25"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </AfPortal>
      ) : null}
    </div>
  );
}

export const AfRunningNowPattern = AfRunningNow;
export type AfRunningNowPatternProps = AfRunningNowProps;
