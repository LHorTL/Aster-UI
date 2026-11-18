import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark, ToolBrandMark } from "./_marks";

export interface ScheduledRunItem {
  id: string;
  name: string;
  cadence: string;
  nextRun: string;
  lastOutcome: "success" | "warning";
  enabled: boolean;
}

export interface ScheduledSlotCoord {
  day: number;
  session: number;
}

export type ScheduledStatIconKind =
  | "file"
  | "test"
  | "pr"
  | "comment"
  | "issue"
  | "link";

export interface ScheduledTaskStat {
  icon: ScheduledStatIconKind;
  value: number | string;
  label?: string;
}

export interface ScheduledTask {
  id: string;
  title: string;
  /** Share of a single session's usage limit in percent (over 100 splits across sessions). */
  usage: number;
  agent?: string;
  detail?: string;
  tool?: string;
  logo?: ReactNode;
  stats?: ScheduledTaskStat[];
  /** Pre-booked slot; tasks without `at` start in the left stack and fly in when Auto runs. */
  at?: ScheduledSlotCoord;
}

export interface ScheduledPart {
  key: string;
  task: ScheduledTask;
  day: number;
  session: number;
  usage: number;
  part: number;
  parts: number;
  manual?: boolean;
}

export interface AfScheduledRunsProps {
  tasks?: ScheduledTask[];
  days?: Array<string | { name: string; date?: string }>;
  sessions?: string[];
  /** Current running session; earlier ones are dimmed and closed to new tasks. */
  now?: ScheduledSlotCoord;
  /** Capacity per session (default 100%). */
  limit?: number;
  /** Minimum split piece size (default 15%). */
  minPiece?: number;
  agents?: Array<{ name: string; logo?: ReactNode }>;
  defaultMode?: "auto" | "manual";
  autoRun?: boolean | number;
  loop?: boolean;
  title?: ReactNode;
  note?: string;
  onScheduled?: (parts: ScheduledPart[]) => void;
  onPlace?: (task: ScheduledTask, parts: ScheduledPart[]) => void;
  onMove?: (part: ScheduledPart, to: ScheduledSlotCoord) => void;
  /** Legacy compatibility props. */
  initialSchedules?: ScheduledRunItem[];
  onTriggerNow?: (item: ScheduledRunItem) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_DAYS: Array<{ name: string; date: string }> = [
  { name: "Tue", date: "27" },
  { name: "Wed", date: "28" },
  { name: "Thu", date: "29" },
];

const DEFAULT_SESSIONS = ["07:00", "12:00", "17:00"];

const DEFAULT_AGENTS = [
  { name: "Claude Code" },
  { name: "Codex" },
  { name: "Gemini CLI" },
];

const DEFAULT_TASKS: ScheduledTask[] = [
  // Pre-booked in sessions (5 tasks)
  {
    id: "bk-1",
    title: "Upgrade to React 19",
    usage: 30,
    agent: "Claude Code",
    detail: "Bump every package and fix the breaking changes across the app",
    tool: "GitHub",
    stats: [
      { icon: "file", value: 48 },
      { icon: "pr", value: 1 },
    ],
    at: { day: 0, session: 0 },
  },
  {
    id: "bk-2",
    title: "Triage 120 open issues",
    usage: 25,
    agent: "Codex",
    detail: "Label, size and route every issue older than 30 days",
    tool: "Linear",
    stats: [{ icon: "issue", value: 120 }],
    at: { day: 1, session: 0 },
  },
  {
    id: "bk-3",
    title: "Ship the v3.0 release",
    usage: 60,
    agent: "Claude Code",
    detail: "Changelog, migration guide, tags and the npm publish",
    tool: "GitHub",
    stats: [
      { icon: "pr", value: 14 },
      { icon: "file", value: 22 },
    ],
    at: { day: 2, session: 0 },
  },
  {
    id: "bk-4",
    title: "Q4 metrics report",
    usage: 40,
    agent: "Claude Code",
    detail: "Signups, activation and churn with a one-page summary for the board",
    tool: "Drive",
    stats: [
      { icon: "file", value: 6 },
      { icon: "comment", value: 3 },
    ],
    at: { day: 0, session: 1 },
  },
  {
    id: "bk-5",
    title: "Rebuild help center search",
    usage: 20,
    agent: "Gemini CLI",
    detail: "Index 340 articles and tune ranking on the top 50 queries",
    tool: "Notion",
    stats: [
      { icon: "file", value: 340 },
      { icon: "link", value: 50 },
    ],
    at: { day: 1, session: 2 },
  },
  // Unscheduled stack (6 tasks)
  {
    id: "un-1",
    title: "Migrate auth to OAuth 2.1",
    usage: 140,
    agent: "Claude Code",
    detail: "Move every login to PKCE and keep the old tokens working",
    tool: "GitHub",
    stats: [
      { icon: "file", value: 63 },
      { icon: "test", value: 210 },
    ],
  },
  {
    id: "un-2",
    title: "Public API reference",
    usage: 45,
    agent: "Codex",
    detail: "Every endpoint with a curl and an SDK example",
    tool: "Notion",
    stats: [
      { icon: "file", value: 38 },
      { icon: "link", value: 52 },
    ],
  },
  {
    id: "un-3",
    title: "Fix the flaky checkout suite",
    usage: 35,
    agent: "Claude Code",
    detail: "Find why 12 tests fail one run in twenty and fix them",
    tool: "GitHub",
    stats: [
      { icon: "test", value: 12 },
      { icon: "pr", value: 1 },
    ],
  },
  {
    id: "un-4",
    title: "Support themes for October",
    usage: 25,
    agent: "Gemini CLI",
    detail: "Cluster 480 tickets into themes, with quotes for each",
    tool: "Slack",
    stats: [{ icon: "comment", value: 480 }],
  },
  {
    id: "un-5",
    title: "Split billing into a service",
    usage: 90,
    agent: "Claude Code",
    detail: "Move invoices, usage and webhooks out of the monolith",
    tool: "Linear",
    stats: [
      { icon: "file", value: 112 },
      { icon: "pr", value: 3 },
    ],
  },
  {
    id: "un-6",
    title: "November changelog",
    usage: 20,
    agent: "Gemini CLI",
    detail: "Everything merged since November 1, grouped for skimmers",
    tool: "Notion",
    stats: [{ icon: "pr", value: 46 }],
  },
];

function StatGlyph({ kind }: { kind: ScheduledStatIconKind }) {
  if (kind === "test") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="5.5" />
        <path d="m5.75 8.25 1.5 1.5 3-3.25" />
      </svg>
    );
  }
  if (kind === "pr") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="4.5" cy="3.75" r="1.5" />
        <circle cx="4.5" cy="12.25" r="1.5" />
        <circle cx="11.5" cy="12.25" r="1.5" />
        <path d="M4.5 5.25v5.5M11.5 10.75V8a2 2 0 0 0-2-2H7.5" />
      </svg>
    );
  }
  if (kind === "comment") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3.5h10v7.5H7.5L4.5 13.5V11H3z" />
      </svg>
    );
  }
  if (kind === "issue") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="5.5" />
        <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "link") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6.5 9.5 3-3M5.75 7.25l-1 1a2.12 2.12 0 0 0 3 3l1-1M10.25 8.75l1-1a2.12 2.12 0 0 0-3-3l-1 1" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2.5h5l3 3v8H4z" />
      <path d="M9 2.5v3h3" />
    </svg>
  );
}

function isSlotClosed(
  day: number,
  session: number,
  now: ScheduledSlotCoord,
): boolean {
  if (day < now.day) return true;
  if (day === now.day && session < now.session) return true;
  return false;
}

/**
 * Deterministic bin-packing across 5-hour sessions:
 * Pre-booked tasks stay in their anchored slots; unscheduled tasks fill open sessions
 * from `now` onward, splitting tasks larger than remaining slot capacity (>= minPiece).
 */
export function planWeek(
  tasks: ScheduledTask[],
  options: {
    days?: number;
    sessions?: number;
    now?: ScheduledSlotCoord;
    limit?: number;
    minPiece?: number;
  } = {},
): ScheduledPart[] {
  const numDays = options.days ?? 3;
  const numSessions = options.sessions ?? 3;
  const now = options.now ?? { day: 0, session: 1 };
  const limit = options.limit ?? 100;
  const minPiece = options.minPiece ?? 15;

  const used = new Map<string, number>();
  const slotKey = (d: number, s: number) => `${d}:${s}`;
  const out: ScheduledPart[] = [];

  const booked = tasks.filter((t) => t.at !== undefined);
  const queue = tasks.filter((t) => t.at === undefined);

  for (let i = 0; i < booked.length; i += 1) {
    const t = booked[i];
    const d = t.at!.day;
    const s = t.at!.session;
    const k = slotKey(d, s);
    used.set(k, (used.get(k) ?? 0) + t.usage);
    out.push({
      key: `${t.id}-p1`,
      task: t,
      day: d,
      session: s,
      usage: t.usage,
      part: 1,
      parts: 1,
    });
  }

  for (let i = 0; i < queue.length; i += 1) {
    const t = queue[i];
    let rem = t.usage;
    const tempSlices: Array<{ day: number; session: number; usage: number }> = [];

    for (let d = 0; d < numDays && rem > 0; d += 1) {
      for (let s = 0; s < numSessions && rem > 0; s += 1) {
        if (isSlotClosed(d, s, now)) continue;
        const k = slotKey(d, s);
        const free = limit - (used.get(k) ?? 0);
        if (free < minPiece && free < rem) continue;
        const take = Math.min(rem, free);
        if (take <= 0) continue;
        used.set(k, (used.get(k) ?? 0) + take);
        tempSlices.push({ day: d, session: s, usage: take });
        rem -= take;
      }
    }

    const totalParts = tempSlices.length;
    for (let p = 0; p < totalParts; p += 1) {
      const sl = tempSlices[p];
      out.push({
        key: `${t.id}-p${p + 1}`,
        task: t,
        day: sl.day,
        session: sl.session,
        usage: sl.usage,
        part: p + 1,
        parts: totalParts,
      });
    }
  }

  return out;
}

function TaskTile({
  task,
  usage,
  part,
  parts,
  selected,
  disabled,
  fresh,
  onClick,
  onKeyDown,
}: {
  task: ScheduledTask;
  usage: number;
  part?: number;
  parts?: number;
  selected?: boolean;
  disabled?: boolean;
  fresh?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  const metaText =
    task.agent && task.detail
      ? `${task.agent} \u00B7 ${task.detail}`
      : (task.detail ?? task.agent ?? "");

  return (
    <button
      type="button"
      className={cn(
        "af-agc-sch__tile",
        selected && "is-selected",
        disabled && "is-disabled",
        fresh && "is-fresh",
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className="af-agc-sch__card-top">
        <span className="af-agc-sch__card-ico" aria-hidden="true">
          {task.logo ?? <ToolBrandMark name={task.tool ?? "GitHub"} size={12} />}
        </span>
        <span className="af-agc-sch__card-title">{task.title}</span>
        {parts && parts > 1 ? (
          <span className="af-agc-sch__part-tag">
            {part}/{parts}
          </span>
        ) : null}
      </span>

      <span className="af-agc-sch__card-sub" title={task.detail ?? metaText}>
        {metaText}
      </span>

      <span className="af-agc-sch__card-stats">
        {(task.stats ?? []).map((st, idx) => (
          <span key={`${st.icon}-${idx}`} className="af-agc-sch__stat">
            <StatGlyph kind={st.icon} />
            <span>{st.value}</span>
          </span>
        ))}
        <span className="af-agc-sch__usage-pill">{usage}%</span>
      </span>
    </button>
  );
}

export function AfScheduledRuns({
  tasks: propTasks,
  days: propDays = DEFAULT_DAYS,
  sessions = DEFAULT_SESSIONS,
  now = { day: 0, session: 1 },
  limit = 100,
  minPiece = 15,
  agents = DEFAULT_AGENTS,
  defaultMode = "auto",
  autoRun = false,
  title = "This week",
  note = "5-hour sessions",
  onScheduled,
  onPlace,
  onMove,
  initialSchedules,
  className,
  style,
}: AfScheduledRunsProps = {}) {
  const isCustomTasks = Boolean(
    (propTasks && propTasks.length > 0) ||
      (initialSchedules && initialSchedules.length > 0),
  );

  const normalizedTasks = useMemo<ScheduledTask[]>(() => {
    if (propTasks && propTasks.length > 0) return propTasks;
    if (initialSchedules && initialSchedules.length > 0) {
      return initialSchedules.map((item, idx) => ({
        id: item.id,
        title: item.name,
        usage: 35 + (idx % 3) * 15,
        agent: DEFAULT_AGENTS[idx % DEFAULT_AGENTS.length].name,
        detail: `${item.cadence} · ${item.nextRun}`,
        tool: "GitHub",
        at: idx < 2 ? { day: idx, session: 1 } : undefined,
      }));
    }
    return DEFAULT_TASKS;
  }, [initialSchedules, propTasks]);

  const normalizedDays = useMemo(
    () =>
      propDays.map((d) =>
        typeof d === "string" ? { name: d, date: "" } : d,
      ),
    [propDays],
  );

  const [mode, setMode] = useState<"auto" | "manual">(
    autoRun ? "auto" : defaultMode,
  );
  // In default standalone Auto demo, start at step 0 (all 6 in "To schedule") at t=0
  // and deal cards into sessions over ~2.5s matching AffectUI's live auto-scheduler.
  const [autoStep, setAutoStep] = useState<number>(() =>
    isCustomTasks ? 999 : 0,
  );
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [manualPlaced, setManualPlaced] = useState<
    Record<string, ScheduledSlotCoord>
  >({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRun) return;
    const delay = typeof autoRun === "number" ? autoRun : 320;
    const t = window.setTimeout(() => {
      setMode("auto");
      setAutoStep(999);
    }, delay);
    return () => window.clearTimeout(t);
  }, [autoRun]);

  const effectiveTasks = useMemo(() => {
    return normalizedTasks.map((t) =>
      manualPlaced[t.id] ? { ...t, at: manualPlaced[t.id] } : t,
    );
  }, [manualPlaced, normalizedTasks]);

  const queueTotal = useMemo(
    () => effectiveTasks.filter((t) => t.at === undefined).length,
    [effectiveTasks],
  );

  useEffect(() => {
    if (mode !== "auto" || autoStep >= queueTotal) return;
    const delay = autoStep === 0 ? 900 : 320;
    const timer = window.setTimeout(() => {
      setAutoStep((prev) => prev + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [autoStep, mode, queueTotal]);

  const scheduledParts = useMemo(() => {
    const booked = effectiveTasks.filter((t) => t.at !== undefined);
    if (mode === "auto") {
      const queue = effectiveTasks
        .filter((t) => t.at === undefined)
        .slice(0, autoStep);
      return planWeek([...booked, ...queue], {
        days: normalizedDays.length,
        sessions: sessions.length,
        now,
        limit,
        minPiece,
      });
    }
    return planWeek(booked, {
      days: normalizedDays.length,
      sessions: sessions.length,
      now,
      limit,
      minPiece,
    });
  }, [
    autoStep,
    effectiveTasks,
    limit,
    minPiece,
    mode,
    normalizedDays.length,
    now,
    sessions.length,
  ]);

  const scheduledTaskIds = useMemo(
    () => new Set(scheduledParts.map((p) => p.task.id)),
    [scheduledParts],
  );

  const unscheduledTasks = useMemo(
    () =>
      effectiveTasks.filter((t) => {
        if (scheduledTaskIds.has(t.id)) return false;
        if (agentFilter && t.agent !== agentFilter) return false;
        return true;
      }),
    [agentFilter, effectiveTasks, scheduledTaskIds],
  );

  const handleSwitchMode = (next: "auto" | "manual") => {
    setMode(next);
    if (next === "auto") {
      setAutoStep(999);
      const planned = planWeek(effectiveTasks, {
        days: normalizedDays.length,
        sessions: sessions.length,
        now,
        limit,
        minPiece,
      });
      onScheduled?.(planned);
    } else {
      setAutoStep(0);
    }
  };

  const handleCellClick = (dayIdx: number, sessIdx: number) => {
    if (isSlotClosed(dayIdx, sessIdx, now)) return;
    if (!selectedTaskId) return;
    const targetTask = effectiveTasks.find((t) => t.id === selectedTaskId);
    if (!targetTask) return;

    const coord = { day: dayIdx, session: sessIdx };
    setManualPlaced((prev) => ({ ...prev, [selectedTaskId]: coord }));
    setSelectedTaskId(null);

    const existingPart = scheduledParts.find(
      (p) => p.task.id === selectedTaskId,
    );
    if (existingPart) {
      onMove?.(existingPart, coord);
    } else {
      onPlace?.(targetTask, [
        {
          key: `${targetTask.id}-m1`,
          task: targetTask,
          day: dayIdx,
          session: sessIdx,
          usage: Math.min(limit, targetTask.usage),
          part: 1,
          parts: 1,
          manual: true,
        },
      ]);
    }
  };

  const handleCardQuickPlace = (task: ScheduledTask) => {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
      return;
    }
    setSelectedTaskId(task.id);
  };

  const handleStackKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    task: ScheduledTask,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardQuickPlace(task);
    }
  };

  return (
    <div className={cn("af-agc-sch", className)} style={style}>
      <div className="af-agc-sch__bar">
        <div className="af-agc-sch__bar-left">
          <span className="af-agc-sch__title">{title}</span>
          {note ? <span className="af-agc-sch__note">{note}</span> : null}
        </div>

        <div className="af-agc-sch__bar-right">
          <div
            className={cn(
              "af-agc-sch__agents",
              agentFilter !== null && "has-filter",
            )}
            role="group"
            aria-label="Show one agent's tasks"
          >
            {agents.map((ag, idx) => {
              const active = agentFilter === ag.name;
              return (
                <button
                  key={ag.name}
                  type="button"
                  title={ag.name}
                  aria-label={ag.name}
                  aria-pressed={active}
                  style={{ zIndex: agents.length - idx }}
                  className={cn(
                    "af-agc-sch__agent-btn",
                    active && "is-active",
                    agentFilter && !active && "is-dimmed",
                  )}
                  onClick={() =>
                    setAgentFilter((prev) =>
                      prev === ag.name ? null : ag.name,
                    )
                  }
                >
                  {ag.logo ?? <ModelBrandMark model={ag.name} size={14} />}
                </button>
              );
            })}
          </div>

          <span className="af-agc-sch__total-count">
            {effectiveTasks.length} tasks
          </span>

          <div
            className="af-agc-sch__modes"
            role="radiogroup"
            aria-label="Scheduling"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "auto"}
              className={cn(
                "af-agc-sch__mode-btn",
                mode === "auto" && "is-active",
              )}
              onClick={() => handleSwitchMode("auto")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M8 1.75c.3 2.9 1.35 3.95 4.25 4.25C9.35 6.3 8.3 7.35 8 10.25 7.7 7.35 6.65 6.3 3.75 6 6.65 5.7 7.7 4.65 8 1.75Z"
                  fill="currentColor"
                />
                <path
                  d="M12.25 9.5c.15 1.3.6 1.75 1.9 1.9-1.3.15-1.75.6-1.9 1.9-.15-1.3-.6-1.75-1.9-1.9 1.3-.15 1.75-.6 1.9-1.9Z"
                  fill="currentColor"
                />
              </svg>
              <span>Auto</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "manual"}
              className={cn(
                "af-agc-sch__mode-btn",
                mode === "manual" && "is-active",
              )}
              onClick={() => handleSwitchMode("manual")}
            >
              <span>Manual</span>
            </button>
          </div>
        </div>
      </div>

      <div className="af-agc-sch__body">
        {/* Left unscheduled task stack */}
        <section className="af-agc-sch__stack" aria-label="To schedule">
          <header className="af-agc-sch__stack-head">
            <span className="af-agc-sch__stack-label">To schedule</span>
            <span className="af-agc-sch__stack-badge">
              {unscheduledTasks.length}
            </span>
          </header>

          {unscheduledTasks.length > 0 ? (
            <div className="af-agc-sch__stack-list">
              {unscheduledTasks.map((task) => (
                <TaskTile
                  key={task.id}
                  task={task}
                  usage={task.usage}
                  selected={selectedTaskId === task.id}
                  onClick={() => handleCardQuickPlace(task)}
                  onKeyDown={(e) => handleStackKeyDown(e, task)}
                />
              ))}
            </div>
          ) : (
            <div className="af-agc-sch__empty">
              <span>Everything&apos;s scheduled</span>
            </div>
          )}
        </section>

        {/* Right 3-day × 3-session matrix (Flexbox) */}
        <div className="af-agc-sch__matrix" role="grid" aria-label="This week">
          <div role="row" className="af-agc-sch__day-row">
            <span className="af-agc-sch__time-spacer" aria-hidden="true" />
            {normalizedDays.map((d, dIdx) => (
              <span
                key={d.name + dIdx}
                role="columnheader"
                className="af-agc-sch__day-head"
              >
                <span className="af-agc-sch__day-name">{d.name}</span>
                {d.date ? (
                  <b className="af-agc-sch__day-num">{d.date}</b>
                ) : null}
              </span>
            ))}
          </div>

          {sessions.map((sessLabel, sIdx) => (
            <div key={sessLabel} role="row" className="af-agc-sch__sess-row">
              <span role="rowheader" className="af-agc-sch__time-col">
                {sessLabel}
              </span>

              {normalizedDays.map((d, dIdx) => {
                const closed = isSlotClosed(dIdx, sIdx, now);
                const isNowCell = dIdx === now.day && sIdx === now.session;
                const cellParts = scheduledParts.filter(
                  (p) =>
                    p.day === dIdx &&
                    p.session === sIdx &&
                    (!agentFilter || p.task.agent === agentFilter),
                );
                const usedPct = cellParts.reduce((sum, p) => sum + p.usage, 0);
                const meterPct = Math.min(
                  100,
                  Math.round((usedPct / limit) * 100),
                );
                const visibleParts =
                  cellParts.length <= 2 ? cellParts : cellParts.slice(0, 1);
                const hiddenCount =
                  cellParts.length > 2 ? cellParts.length - 1 : 0;

                return (
                  <div
                    key={`${d.name}-${sIdx}`}
                    role="gridcell"
                    className={cn(
                      "af-agc-sch__cell",
                      closed && "is-closed",
                      isNowCell && "is-now",
                      selectedTaskId && !closed && "is-droppable",
                    )}
                    onClick={() => handleCellClick(dIdx, sIdx)}
                  >
                    {isNowCell ? (
                      <span
                        className="af-agc-sch__now-line"
                        aria-hidden="true"
                      />
                    ) : null}

                    <div className="af-agc-sch__cell-cards">
                      {visibleParts.map((part) => (
                        <TaskTile
                          key={part.key}
                          task={part.task}
                          usage={part.usage}
                          part={part.part}
                          parts={part.parts}
                          disabled={closed}
                          fresh={part.task.at === undefined}
                          selected={selectedTaskId === part.task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!closed) {
                              setSelectedTaskId((prev) =>
                                prev === part.task.id ? null : part.task.id,
                              );
                            }
                          }}
                        />
                      ))}
                      {hiddenCount > 0 ? (
                        <div className="af-agc-sch__more">
                          +{hiddenCount} more
                        </div>
                      ) : null}
                    </div>

                    <span className="af-agc-sch__meter" aria-hidden="true">
                      <i
                        className="af-agc-sch__meter-fill"
                        style={{ width: `${meterPct}%` }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const AfScheduledRunsPattern = AfScheduledRuns;
export type AfScheduledRunsPatternProps = AfScheduledRunsProps;
