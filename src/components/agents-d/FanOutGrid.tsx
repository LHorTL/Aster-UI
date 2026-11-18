import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";

export type FanoutTaskStatus = "queued" | "running" | "retrying" | "done" | "failed";

/** Legacy shard status alias. */
export type ShardState = "done" | "running" | "failed" | "queued" | "retrying";

export interface FanoutTask {
  id: string;
  label: string;
  status: FanoutTaskStatus;
  worker?: string;
  start?: number;
  end?: number;
  cost?: number;
  attempts?: number;
  result?: string;
  error?: string;
}

/** Legacy shard interface alias. */
export interface FanOutShard {
  id: string;
  target: string;
  state: ShardState;
  duration: string;
  error?: string;
}

export interface AfFanOutGridProps {
  /** Full list of parallel tasks. */
  tasks?: FanoutTask[];
  /** Legacy shards prop. */
  shards?: FanOutShard[];
  /** Batch job description. */
  job?: string;
  /** Concurrent worker count. */
  workers?: number;
  /** Elapsed time in ms. */
  now?: number;
  /** Retry callback receiving failed task IDs. */
  onRetry?: (ids: string[]) => void;
  /** Legacy retry-all callback. */
  onRetryFailed?: () => void;
  /** Fired when a cell is pinned or cleared. */
  onSelect?: (task: FanoutTask | null) => void;
  /** Currency formatter. */
  formatCost?: (amount: number) => string;
  /** Header title. */
  title?: ReactNode;
  /** Custom mark icon. */
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export type AfFanOutGridPatternProps = AfFanOutGridProps;

const LEAD_COMPANIES = [
  "linear.app",
  "vercel.com",
  "supabase.com",
  "raycast.com",
  "resend.com",
  "posthog.com",
  "clerk.com",
  "railway.app",
  "turso.tech",
  "neon.tech",
  "upstash.com",
  "planetscale.com",
  "workos.com",
  "dub.co",
  "trigger.dev",
  "inngest.com",
];

const TOTAL_DEMO_TASKS = 240;
const FAILED_INDICES = new Set([42, 117, 193]);

function buildDemoWaveTasks(completedCutoff: number, retriedFixed: boolean): FanoutTask[] {
  const list: FanoutTask[] = [];
  const activeWindow = 16;

  for (let i = 0; i < TOTAL_DEMO_TASKS; i += 1) {
    const base = LEAD_COMPANIES[i % LEAD_COMPANIES.length];
    const batch = Math.floor(i / LEAD_COMPANIES.length) + 1;
    const label = batch === 1 ? base : `${base.split(".")[0]}-${batch}.io`;

    let status: FanoutTaskStatus = "queued";
    let attempts = 1;
    let error: string | undefined;
    let result: string | undefined;

    if (i < completedCutoff) {
      if (!retriedFixed && FAILED_INDICES.has(i)) {
        status = "failed";
        attempts = 3;
        error =
          i === 117
            ? "Clearbit 429 – rate limit after 3 retries"
            : "WHOIS lookup timed out after 5.0s";
      } else {
        status = "done";
        attempts = FAILED_INDICES.has(i) ? 4 : 1;
        const seats = ((i * 7) % 18 + 2) * 15;
        result = `${seats} employees · Series ${i % 3 === 0 ? "B" : "A"} · B2B SaaS`;
      }
    } else if (i < completedCutoff + activeWindow) {
      if (i === completedCutoff + 8) {
        status = "retrying";
        attempts = 2;
      } else {
        status = "running";
      }
    }

    list.push({
      id: `lead-${i + 1}`,
      label,
      status,
      worker: `worker-${(i % 16) + 1}`,
      start: Math.floor(i / 16) * 380,
      end:
        status === "done" || status === "failed"
          ? Math.floor(i / 16) * 380 + 620 + (i % 5) * 95
          : undefined,
      cost: status === "queued" ? 0 : 0.0075,
      attempts,
      result,
      error,
    });
  }
  return list;
}

const STATUS_LABEL: Record<FanoutTaskStatus, string> = {
  done: "Done",
  running: "Running",
  retrying: "Retrying",
  failed: "Failed",
  queued: "Queued",
};

function FanoutMarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="3" cy="8" r="1.9" fill="currentColor" />
      <rect x="10.2" y="1.6" width="3.6" height="3.6" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="10.2" y="6.2" width="3.6" height="3.6" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="10.2" y="10.8" width="3.6" height="3.6" rx="1" fill="currentColor" opacity="0.3" />
      <path
        d="M4.9 8H7c.6 0 .9-.3 1-.9l.4-2.4c.1-.6.4-.9 1-.9h.6M4.9 8h5.1M4.9 8H7c.6 0 .9.3 1 .9l.4 2.4c.1.6.4.9 1 .9h.6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Fan-Out Grid — 1:1 high-density 240-cell pure-Flexbox batch execution grid
 * with diagonal running sheen, status filter legend, cell hover popover, and retry-failed action.
 */
export function AfFanOutGrid({
  tasks: tasksProp,
  shards: legacyShards,
  job = "Enrich 240 leads",
  workers = 16,
  onRetry,
  onRetryFailed,
  onSelect,
  formatCost = (amt) => `$${amt.toFixed(2)}`,
  title = "Fan-out",
  icon,
  className,
  style,
}: AfFanOutGridProps = {}) {
  const isDefaultDemo = !tasksProp && !legacyShards;
  const [cutoff, setCutoff] = useState<number>(isDefaultDemo ? 0 : TOTAL_DEMO_TASKS);
  const [retriedFixed, setRetriedFixed] = useState(false);
  const [retryingWave, setRetryingWave] = useState(false);

  useEffect(() => {
    if (!isDefaultDemo) return;
    const iv = window.setInterval(() => {
      setCutoff((prev) => {
        if (prev >= TOTAL_DEMO_TASKS) {
          window.clearInterval(iv);
          return TOTAL_DEMO_TASKS;
        }
        return Math.min(TOTAL_DEMO_TASKS, prev + 24);
      });
    }, 520);
    return () => window.clearInterval(iv);
  }, [isDefaultDemo]);

  const [customTasks, setCustomTasks] = useState<FanoutTask[] | null>(() => {
    if (legacyShards?.length && !tasksProp) {
      return legacyShards.map((s, idx) => ({
        id: s.id,
        label: s.target,
        status: s.state,
        worker: `worker-${(idx % 4) + 1}`,
        cost: 0.008,
        result: s.state === "done" ? `Completed in ${s.duration}` : undefined,
        error: s.error,
      }));
    }
    return null;
  });

  const tasks = useMemo<FanoutTask[]>(() => {
    if (tasksProp) return tasksProp;
    if (customTasks) return customTasks;
    const base = buildDemoWaveTasks(cutoff, retriedFixed);
    if (retryingWave) {
      return base.map((t) =>
        t.status === "failed" ? { ...t, status: "running", error: undefined } : t,
      );
    }
    return base;
  }, [customTasks, cutoff, retriedFixed, retryingWave, tasksProp]);

  const [filterState, setFilterState] = useState<FanoutTaskStatus | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number; below: boolean }>({
    left: 16,
    top: 16,
    below: false,
  });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    },
    [],
  );

  const counts = useMemo(() => {
    const acc = { done: 0, running: 0, retrying: 0, failed: 0, queued: 0, cost: 0 };
    for (const t of tasks) {
      acc[t.status] += 1;
      acc.cost += t.cost ?? 0;
    }
    return acc;
  }, [tasks]);

  const failedIds = useMemo(
    () => tasks.filter((t) => t.status === "failed").map((t) => t.id),
    [tasks],
  );

  const remaining = counts.running + counts.retrying + counts.queued;
  const etaSec = remaining > 0 ? Math.max(1, Math.ceil((remaining / Math.max(1, workers)) * 1.1)) : 0;

  const activeTask = useMemo(() => {
    if (pinnedId) return tasks.find((t) => t.id === pinnedId) ?? null;
    if (hoverIdx !== null) return tasks[hoverIdx] ?? null;
    return null;
  }, [hoverIdx, pinnedId, tasks]);

  const updateTipFromCell = (el: HTMLElement) => {
    const panel = panelRef.current;
    if (!panel) return;
    const pRect = panel.getBoundingClientRect();
    const cRect = el.getBoundingClientRect();
    const cx = cRect.left - pRect.left + cRect.width / 2;
    const cy = cRect.top - pRect.top;
    const left = Math.min(Math.max(12, cx - 110), Math.max(12, pRect.width - 252));
    const below = cy < 92;
    const top = below ? cy + cRect.height + 8 : cy - 8;
    setTipPos({ left, top, below });
  };

  const handleRetryFailed = () => {
    if (failedIds.length === 0) return;
    onRetry?.(failedIds);
    onRetryFailed?.();
    if (tasksProp) return;

    if (customTasks) {
      setCustomTasks((prev) =>
        (prev ?? []).map((t) =>
          t.status === "failed" ? { ...t, status: "running", error: undefined } : t,
        ),
      );
      retryTimerRef.current = window.setTimeout(() => {
        setCustomTasks((prev) =>
          (prev ?? []).map((t) =>
            failedIds.includes(t.id)
              ? { ...t, status: "done", result: "Retried cleanly", error: undefined }
              : t,
          ),
        );
      }, 850);
      return;
    }

    setRetryingWave(true);
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = window.setTimeout(() => {
      setRetryingWave(false);
      setRetriedFixed(true);
      if (filterState === "failed") setFilterState(null);
    }, 850);
  };

  return (
    <div
      className={cn("af-fogc", className)}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Escape" && pinnedId) {
          setPinnedId(null);
          onSelect?.(null);
        }
      }}
    >
      {/* Header bar */}
      <header className="af-fogc__bar">
        <span className="af-fogc__mark" aria-hidden="true">
          {icon ?? <FanoutMarkIcon />}
        </span>

        <span className="af-fogc__title">{title}</span>
        {job ? (
          <span className="af-fogc__job" dir="auto" title={job}>
            {job}
          </span>
        ) : null}

        <span className="af-fogc__sum">
          <span>
            <b>{counts.done}</b> / {tasks.length}
          </span>
          <span>
            <b>{formatCost(Math.max(0.11, counts.cost))}</b>
          </span>
          <span className="af-fogc__time" data-done={remaining === 0 ? "" : undefined}>
            {remaining === 0
              ? counts.failed > 0
                ? `${counts.failed} failed`
                : "Done in 8.4s"
              : counts.done === 0
                ? "752ms so far"
                : `~${etaSec}s left`}
          </span>
        </span>
      </header>

      {/* Pure Flexbox cell matrix panel */}
      <div ref={panelRef} className="af-fogc__panel">
        <div
          className="af-fogc__grid"
          role="group"
          aria-label={`${tasks.length} tasks – arrow keys move, Enter keeps the details`}
          tabIndex={0}
          onKeyDown={(e) => {
            const cols = 40;
            let next = focusIdx;
            if (e.key === "ArrowRight") next = Math.min(tasks.length - 1, focusIdx + 1);
            else if (e.key === "ArrowLeft") next = Math.max(0, focusIdx - 1);
            else if (e.key === "ArrowDown") next = Math.min(tasks.length - 1, focusIdx + cols);
            else if (e.key === "ArrowUp") next = Math.max(0, focusIdx - cols);
            else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const t = tasks[focusIdx];
              if (!t) return;
              const nextPin = pinnedId === t.id ? null : t.id;
              setPinnedId(nextPin);
              onSelect?.(nextPin ? t : null);
              const el = cellRefs.current[focusIdx];
              if (el) updateTipFromCell(el);
              return;
            } else {
              return;
            }
            e.preventDefault();
            setFocusIdx(next);
            setHoverIdx(next);
            const el = cellRefs.current[next];
            if (el) updateTipFromCell(el);
          }}
          onPointerLeave={() => {
            if (!pinnedId) setHoverIdx(null);
          }}
        >
          {tasks.map((task, idx) => {
            const dimmed = filterState !== null && task.status !== filterState;
            const isPinned = pinnedId === task.id;
            const isOn = hoverIdx === idx && !pinnedId;
            return (
              <span
                key={task.id}
                ref={(el) => {
                  cellRefs.current[idx] = el;
                }}
                className="af-fogc__cell"
                data-status={task.status}
                data-dim={dimmed || undefined}
                data-pinned={isPinned || undefined}
                data-on={isOn || undefined}
                style={{ "--i": idx, "--d": idx % 48 } as CSSProperties}
                aria-label={`${task.label}, ${STATUS_LABEL[task.status]}`}
                onPointerEnter={(e) => {
                  if (!pinnedId) {
                    setHoverIdx(idx);
                    updateTipFromCell(e.currentTarget);
                  }
                }}
                onClick={(e) => {
                  updateTipFromCell(e.currentTarget);
                  const next = isPinned ? null : task.id;
                  setPinnedId(next);
                  setHoverIdx(next ? idx : null);
                  onSelect?.(next ? task : null);
                }}
              />
            );
          })}
        </div>

        {/* Footer status legend & Retry failed action */}
        <div className="af-fogc__foot">
          <div className="af-fogc__legend" role="group" aria-label="Show only">
            {(
              [
                { key: "done", count: counts.done, label: "done", alwaysShow: true },
                { key: "running", count: counts.running, label: "running", alwaysShow: false },
                { key: "retrying", count: counts.retrying, label: "retrying", alwaysShow: false },
                { key: "failed", count: counts.failed, label: "failed", alwaysShow: false },
              ] as const
            ).map((item) => {
              const isZero = item.count === 0 && !item.alwaysShow && filterState !== item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="af-fogc__key"
                  data-status={item.key}
                  data-zero={isZero ? "" : undefined}
                  data-off={filterState !== null && filterState !== item.key ? "" : undefined}
                  aria-pressed={filterState === item.key}
                  onClick={() =>
                    setFilterState((cur) => (cur === item.key ? null : item.key))
                  }
                >
                  <span className="af-fogc__swatch" aria-hidden="true" />
                  <span className="af-fogc__n">{item.count}</span> {item.label}
                </button>
              );
            })}
          </div>

          {failedIds.length > 0 ? (
            <button type="button" className="af-fogc__retry" onClick={handleRetryFailed}>
              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.4 7a4.6 4.6 0 1 1 1.2 3.1M2.2 3.2v3.3h3.3"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Retry {failedIds.length} failed
            </button>
          ) : null}
        </div>

        {/* Floating cell detail tooltip */}
        {activeTask ? (
          <div
            className="af-fogc__tip"
            data-status={activeTask.status}
            data-side={tipPos.below ? "below" : "above"}
            style={{
              left: tipPos.left,
              top: tipPos.top,
              transform: tipPos.below ? undefined : "translateY(-100%)",
            }}
            role="tooltip"
          >
            <div className="af-fogc__tip-head">
              <span className="af-fogc__tip-label">{activeTask.label}</span>
              <span className="af-fogc__pill" data-status={activeTask.status}>
                {STATUS_LABEL[activeTask.status]}
              </span>
            </div>

            <div className="af-fogc__tip-meta">
              {activeTask.worker ?? "worker-1"}
              {activeTask.end && activeTask.start !== undefined
                ? ` · ${((activeTask.end - activeTask.start) / 1000).toFixed(1)}s`
                : ""}
              {activeTask.attempts && activeTask.attempts > 1
                ? ` · attempt ${activeTask.attempts}`
                : ""}
            </div>

            {activeTask.error ? (
              <div className="af-fogc__tip-error">{activeTask.error}</div>
            ) : activeTask.result ? (
              <div className="af-fogc__tip-result">{activeTask.result}</div>
            ) : (
              <div className="af-fogc__tip-result">
                {activeTask.status === "queued"
                  ? "Waiting for a free worker…"
                  : "Fetching company headcount & funding data…"}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="af-fogc__sr" aria-live="polite" aria-atomic="true">
        {counts.done} of {tasks.length} done.
      </div>
    </div>
  );
}

export const FanoutGrid = AfFanOutGrid;
export const FanOutGrid = AfFanOutGrid;
export const AfFanOutGridPattern = AfFanOutGrid;
