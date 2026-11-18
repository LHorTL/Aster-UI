import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ToolBrandMark } from "./_marks";

export type CheckpointStatus = "running" | "done" | "failed" | "stopped";

export interface Checkpoint {
  id: string;
  title: string;
  icon?: ReactNode;
  tool?: string;
  parent?: string;
  status?: CheckpointStatus;
  /** Milliseconds from start of run. */
  at?: number;
  files?: number;
  cost?: number;
  attempt?: number;
}

export interface AgentCheckpointItem {
  id: string;
  tag: string;
  title: string;
  time: string;
  filesChanged: number;
  contextTokens: string;
  summary: string;
}

export interface AfAgentCheckpointsProps {
  /** Ordered checkpoints (never removed on rewind; rewinding appends a new branch child). */
  checkpoints?: Checkpoint[] | AgentCheckpointItem[];
  /** Id of the active checkpoint the agent stands on. */
  head?: string;
  onRewind?: (checkpoint: Checkpoint) => void;
  /** Task label shown quietly beside title. */
  task?: string;
  formatTime?: (ms: number) => string;
  formatCost?: (amount: number) => string;
  title?: ReactNode;
  /** Legacy compatibility callbacks. */
  onRestore?: (checkpoint: AgentCheckpointItem) => void;
  onFork?: (checkpoint: AgentCheckpointItem) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  {
    id: "ck-1",
    title: "Read the brief",
    tool: "Slack",
    status: "done",
    at: 9_000,
    files: 0,
    cost: 0.02,
  },
  {
    id: "ck-2",
    title: "Scaffolds pricing page",
    tool: "GitHub",
    parent: "ck-1",
    status: "done",
    at: 38_000,
    files: 3,
    cost: 0.1,
  },
  {
    id: "ck-3",
    title: "Switched to Stripe Elements",
    tool: "Stripe",
    parent: "ck-1",
    status: "done",
    at: 68_000,
    files: 2,
    cost: 0.08,
    attempt: 2,
  },
  {
    id: "ck-4",
    title: "Tests pass · 12 of 12",
    tool: "Vercel",
    parent: "ck-3",
    status: "done",
    at: 83_000,
    files: 0,
    cost: 0.04,
  },
];

function defaultFormatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function defaultFormatCost(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function isLegacyItem(
  item: Checkpoint | AgentCheckpointItem,
): item is AgentCheckpointItem {
  return "filesChanged" in item || "contextTokens" in item;
}

function parseClockMs(text: string, fallbackMs: number): number {
  const m = /^(\d+):(\d{2})$/.exec(text.trim());
  if (!m) return fallbackMs;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}

export function AfAgentCheckpoints({
  checkpoints: propCheckpoints,
  head: controlledHead,
  onRewind,
  task = "Ship the pricing page",
  formatTime = defaultFormatTime,
  formatCost = defaultFormatCost,
  title = "Checkpoints",
  onRestore,
  onFork,
  className,
  style,
}: AfAgentCheckpointsProps = {}) {
  const normalizedInput = useMemo<Checkpoint[]>(() => {
    if (!propCheckpoints || propCheckpoints.length === 0) {
      return DEFAULT_CHECKPOINTS;
    }
    return propCheckpoints.map((item, idx, arr) => {
      if (isLegacyItem(item)) {
        const prev = idx > 0 ? arr[idx - 1].id : undefined;
        return {
          id: item.id,
          title: item.title,
          tool: idx % 2 === 0 ? "GitHub" : "Vercel",
          parent: prev,
          status: "done",
          at: parseClockMs(item.time, (idx + 1) * 24_000),
          files: item.filesChanged,
          cost: 0.08,
        };
      }
      return item;
    });
  }, [propCheckpoints]);

  const [extraNodes, setExtraNodes] = useState<Checkpoint[]>([]);
  const [internalHead, setInternalHead] = useState<string | undefined>(undefined);
  const isAutoStream =
    !propCheckpoints &&
    controlledHead === undefined &&
    internalHead === undefined &&
    extraNodes.length === 0;
  const [streamCount, setStreamCount] = useState<number>(() =>
    !propCheckpoints && controlledHead === undefined ? 1 : normalizedInput.length,
  );
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!isAutoStream) {
      setStreamCount(normalizedInput.length);
      return;
    }
    if (streamCount >= normalizedInput.length) return;
    const timer = window.setInterval(() => {
      setStreamCount((prev) =>
        prev >= normalizedInput.length ? prev : prev + 1,
      );
    }, 520);
    return () => window.clearInterval(timer);
  }, [isAutoStream, normalizedInput.length, streamCount]);

  const items = useMemo(() => {
    const visibleBase = isAutoStream
      ? normalizedInput.slice(0, Math.max(1, streamCount))
      : normalizedInput;
    return [...visibleBase, ...extraNodes];
  }, [extraNodes, isAutoStream, normalizedInput, streamCount]);

  const headId =
    controlledHead ??
    internalHead ??
    (items.length > 0 ? items[items.length - 1].id : "");

  // Compute ancestor chain of `headId` + branch lane assignment (0 = main/live column, 1 = side dead branch)
  const topology = useMemo(() => {
    const byId = new Map<string, Checkpoint>();
    items.forEach((c) => byId.set(c.id, c));

    const liveSet = new Set<string>();
    let cur: string | undefined = headId;
    const guard = new Set<string>();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      liveSet.add(cur);
      cur = byId.get(cur)?.parent;
    }

    // Count children per parent to know how many branch attempts exist
    const childrenByParent = new Map<string, string[]>();
    let branchForks = 0;
    items.forEach((c) => {
      if (!c.parent) return;
      const list = childrenByParent.get(c.parent) ?? [];
      list.push(c.id);
      childrenByParent.set(c.parent, list);
    });
    childrenByParent.forEach((kids) => {
      if (kids.length > 1) branchForks += kids.length - 1;
    });

    const laneById = new Map<string, number>();
    items.forEach((c) => {
      laneById.set(c.id, liveSet.has(c.id) ? 0 : 1);
    });

    const totalCost = items.reduce((acc, c) => acc + (c.cost ?? 0), 0);

    return {
      byId,
      liveSet,
      laneById,
      attempts: 1 + branchForks,
      totalCost,
    };
  }, [headId, items]);

  const handleRewind = (target: Checkpoint, index: number) => {
    setStreamCount(normalizedInput.length);
    const fullBase = [...normalizedInput, ...extraNodes];
    const siblings = fullBase.filter((c) => c.parent === target.id);
    const attemptNum = siblings.length + 1;
    const lastAt = fullBase.reduce((m, c) => Math.max(m, c.at ?? 0), 0);
    const forked: Checkpoint = {
      id: `ck-rw-${Date.now()}`,
      title: `Continue from "${target.title}"`,
      tool: target.tool ?? "GitHub",
      parent: target.id,
      status: "running",
      at: lastAt + 14_000,
      files: target.files ?? 1,
      cost: 0.05,
      attempt: attemptNum >= 2 ? attemptNum : 2,
    };
    setExtraNodes((prev) => [...prev, forked]);
    if (controlledHead === undefined) {
      setInternalHead(forked.id);
    }
    onRewind?.(target);
    if (propCheckpoints && propCheckpoints[index] && isLegacyItem(propCheckpoints[index])) {
      const leg = propCheckpoints[index] as AgentCheckpointItem;
      onRestore?.(leg);
      onFork?.(leg);
    }
  };

  const handleRowKeyDown = (
    e: ReactKeyboardEvent<HTMLLIElement>,
    idx: number,
    ck: Checkpoint,
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      rowRefs.current[Math.min(items.length - 1, idx + 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      rowRefs.current[Math.max(0, idx - 1)]?.focus();
    } else if ((e.key === "Enter" || e.key === " ") && ck.id !== headId) {
      e.preventDefault();
      handleRewind(ck, idx);
    }
  };

  const ROW_H = 30;
  const RAIL_W = 34;
  const xLane0 = 13;
  const xLane1 = 25;
  const svgH = Math.max(ROW_H, items.length * ROW_H);
  const reservedStageMinH =
    !propCheckpoints && extraNodes.length === 0
      ? normalizedInput.length * ROW_H + 54
      : undefined;

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((c, idx) => m.set(c.id, idx));
    return m;
  }, [items]);

  return (
    <div
      className="af-agc-ckp-stage"
      style={reservedStageMinH ? { minHeight: reservedStageMinH } : undefined}
    >
    <div className={cn("af-agc-ckp", className)} style={style}>
      <div className="af-agc-ckp__head">
        <div className="af-agc-ckp__head-left">
          <svg
            className="af-agc-ckp__branch-ico"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="5" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="5" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="11.5" cy="6.5" r="1.75" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M5 5.75v4.5M11.5 8.25c0 2-1.5 2.5-3.5 2.5H6.8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="af-agc-ckp__title">{title}</span>
          {task ? <span className="af-agc-ckp__task">{task}</span> : null}
        </div>

        <span className="af-agc-ckp__meta">
          {items.length} {items.length === 1 ? "checkpoint" : "checkpoints"}
          {topology.attempts > 1 ? ` · ${topology.attempts} attempts` : ""} ·{" "}
          {formatCost(topology.totalCost)}
        </span>
      </div>

      <div className="af-agc-ckp__body">
        <svg
          className="af-agc-ckp__rail"
          width={RAIL_W}
          height={svgH}
          viewBox={`0 0 ${RAIL_W} ${svgH}`}
          aria-hidden="true"
        >
          {/* Draw edges from parent -> child */}
          {items.map((ck, idx) => {
            if (!ck.parent) return null;
            const pIdx = indexById.get(ck.parent);
            if (pIdx === undefined) return null;
            const y1 = pIdx * ROW_H + ROW_H / 2;
            const y2 = idx * ROW_H + ROW_H / 2;
            const x1 = (topology.laneById.get(ck.parent) ?? 0) === 0 ? xLane0 : xLane1;
            const x2 = (topology.laneById.get(ck.id) ?? 0) === 0 ? xLane0 : xLane1;
            const isLiveEdge =
              topology.liveSet.has(ck.id) && topology.liveSet.has(ck.parent);

            let d: string;
            if (x1 === x2) {
              d = `M ${x1} ${y1} L ${x2} ${y2}`;
            } else {
              const midY = y1 + Math.min(14, (y2 - y1) * 0.55);
              d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${y1 + 4}, ${x2} ${midY + 4} L ${x2} ${y2}`;
            }

            return (
              <path
                key={`edge-${ck.id}`}
                d={d}
                fill="none"
                stroke={
                  isLiveEdge
                    ? "var(--af-ckp-wire-live)"
                    : "var(--af-ckp-wire-dead)"
                }
                strokeWidth={isLiveEdge ? "1.6" : "1.35"}
                strokeDasharray={isLiveEdge ? undefined : "2.5 2.5"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Draw checkpoint nodes */}
          {items.map((ck, idx) => {
            const cy = idx * ROW_H + ROW_H / 2;
            const cx = (topology.laneById.get(ck.id) ?? 0) === 0 ? xLane0 : xLane1;
            const isHead = ck.id === headId;
            const isLive = topology.liveSet.has(ck.id);
            const isFailed = ck.status === "failed";

            if (isHead) {
              return (
                <g key={`node-${ck.id}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5.5"
                    fill="var(--af-ckp-head-halo)"
                  />
                  <circle cx={cx} cy={cy} r="3.6" fill="var(--af-ckp-head)" />
                  <circle cx={cx} cy={cy} r="1.35" fill="#ffffff" />
                </g>
              );
            }

            return (
              <circle
                key={`node-${ck.id}`}
                cx={cx}
                cy={cy}
                r="2.8"
                fill="var(--af-ckp-surface)"
                stroke={
                  isFailed
                    ? "var(--af-ckp-danger)"
                    : isLive
                      ? "var(--af-ckp-wire-live)"
                      : "var(--af-ckp-wire-dead)"
                }
                strokeWidth="1.6"
              />
            );
          })}
        </svg>

        <ol className="af-agc-ckp__list" aria-label="Agent checkpoints">
          {items.map((ck, idx) => {
            const isHead = ck.id === headId;
            const isLive = topology.liveSet.has(ck.id);
            const isFailed = ck.status === "failed";

            return (
              <li
                key={ck.id}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                tabIndex={0}
                className={cn(
                  "af-agc-ckp__row",
                  isHead && "is-head",
                  !isLive && "is-dead",
                  isFailed && "is-failed",
                )}
                onKeyDown={(e) => handleRowKeyDown(e, idx, ck)}
              >
                <span className="af-agc-ckp__tile" aria-hidden="true">
                  {ck.icon ?? (
                    <ToolBrandMark name={ck.tool ?? "GitHub"} size={11} />
                  )}
                </span>

                <span className="af-agc-ckp__label">{ck.title}</span>

                {ck.attempt && ck.attempt > 1 ? (
                  <span className="af-agc-ckp__badge is-attempt">
                    Attempt {ck.attempt}
                  </span>
                ) : null}

                {isFailed ? (
                  <span className="af-agc-ckp__badge is-failed">Failed</span>
                ) : null}

                <span className="af-agc-ckp__right">
                  <span className="af-agc-ckp__info">
                    {ck.files && ck.files > 0
                      ? `+ ${ck.files} ${ck.files === 1 ? "file" : "files"} · `
                      : ""}
                    {formatTime(ck.at ?? idx * 20_000)}
                  </span>

                  {!isHead ? (
                    <button
                      type="button"
                      className="af-agc-ckp__rewind"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRewind(ck, idx);
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4.2 3.2 1.8 5.5l2.4 2.3M2.1 5.5h5.4a2.7 2.7 0 0 1 0 5.4H6.2"
                          stroke="currentColor"
                          strokeWidth="1.35"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Rewind</span>
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
    </div>
  );
}

export const AfAgentCheckpointsPattern = AfAgentCheckpoints;
export type AfAgentCheckpointsPatternProps = AfAgentCheckpointsProps;
