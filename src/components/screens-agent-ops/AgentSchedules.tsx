import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfSwitch } from "../controls/Switch";
import { AfBadge } from "../display/Badge";
import { AfSkeleton } from "../display/Skeleton";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  DEFAULT_AGENT_OPS_USER,
  formatCurrencyValue,
  isTypingTarget,
  usePrefersReducedMotion,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type ScheduleHistoryItem = {
  at: string;
  outcome: "done" | "needs" | "failed";
  summary: string;
  cost?: number;
};

export type AgentScheduleItem = {
  id: string;
  name: string;
  project?: string;
  tone?: string;
  prompt?: string;
  cadence: string;
  runs: number[];
  duration?: number;
  paused?: boolean;
  history?: ScheduleHistoryItem[];
  cost?: number;
};

export type AgentSchedulesLabels = {
  schedules?: string;
  aroundNow?: string;
  runningNow?: string;
  next?: string;
  pause?: string;
  resume?: string;
  runNow?: string;
  skip?: string;
  restore?: string;
};

export type AfAgentSchedulesProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  schedules?: AgentScheduleItem[];
  defaultSelected?: string | null;
  onPause?: (id: string, paused: boolean) => void;
  onRunNow?: (id: string) => void;
  onSkip?: (id: string, at: number, skipped: boolean) => void;
  onSelect?: (id: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  labels?: AgentSchedulesLabels;
  loading?: boolean;
  empty?: boolean;
  className?: string;
  style?: CSSProperties;
};

// Reference anchor: Sunday, Nov 15, 2026 00:08 local demo clock
const BASE_ANCHOR_MS = new Date(2026, 10, 15, 0, 8, 0).getTime();
const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export const DEFAULT_AGENT_SCHEDULES: AgentScheduleItem[] = [
  {
    id: "scan",
    name: "Competitor scan",
    project: "Northwind",
    tone: "var(--af-warning)",
    cadence: "Every Sunday at 00:09",
    prompt:
      "Check the nine makers' sites and shops for new prices, models and campaigns – and tell me what changed since last week.",
    runs: [
      BASE_ANCHOR_MS + 1 * MIN_MS,
      new Date(2026, 10, 22, 0, 9, 0).getTime(),
      new Date(2026, 10, 29, 0, 9, 0).getTime(),
    ],
    duration: 5000,
    cost: 3.1,
    history: [
      { at: "Nov 8 00:09", outcome: "done", summary: "2 makers cut prices, 1 new model", cost: 3.42 },
      { at: "Nov 1 00:09", outcome: "done", summary: "Nothing changed", cost: 2.8 },
      { at: "Oct 25 00:09", outcome: "failed", summary: "Three shops blocked the browser", cost: 1.2 },
    ],
  },
  {
    id: "triage",
    name: "Inbox triage",
    tone: "var(--af-accent)",
    cadence: "Every 2 hours, 8:00 – 20:00",
    prompt:
      "Label incoming customer and vendor threads, surface urgent billing or contract asks into Agent Inbox, and draft replies for routine status checks.",
    runs: [
      new Date(2026, 10, 15, 8, 0, 0).getTime(),
      new Date(2026, 10, 15, 10, 0, 0).getTime(),
      new Date(2026, 10, 15, 12, 0, 0).getTime(),
    ],
    duration: 3800,
    cost: 0.18,
    history: [
      { at: "Nov 14 20:00", outcome: "done", summary: "Labeled 14 threads, drafted 2 replies", cost: 0.19 },
      { at: "Nov 14 18:00", outcome: "done", summary: "9 threads sorted, nothing urgent", cost: 0.16 },
    ],
  },
  {
    id: "numbers",
    name: "Northwind numbers",
    project: "Northwind",
    tone: "var(--af-warning)",
    cadence: "Every weekday at 7:45",
    prompt:
      "Pull Stripe MRR, ingest throughput and failed webhook counts into the Northwind morning sheet before 8:30 CET.",
    runs: [
      new Date(2026, 10, 16, 7, 45, 0).getTime(),
      new Date(2026, 10, 17, 7, 45, 0).getTime(),
    ],
    duration: 4200,
    cost: 0.42,
    history: [
      { at: "Nov 13 07:45", outcome: "done", summary: "Updated 18 rows in Q4 Board Sheet", cost: 0.42 },
    ],
  },
  {
    id: "standup",
    name: "Standup notes",
    tone: "var(--af-series-3)",
    cadence: "Every weekday at 16:30",
    prompt: "Collect merged PRs, open blockers and Linear status moves into a calm 5-bullet standup note in #platform.",
    runs: [
      new Date(2026, 10, 16, 16, 30, 0).getTime(),
      new Date(2026, 10, 17, 16, 30, 0).getTime(),
    ],
    duration: 3600,
    cost: 0.26,
    history: [
      { at: "Nov 13 16:30", outcome: "done", summary: "Posted 4 shipped PRs and 1 staging note", cost: 0.26 },
    ],
  },
  {
    id: "weekly",
    name: "Weekly update",
    tone: "var(--af-series-2)",
    cadence: "Every Friday at 16:00",
    prompt: "Draft the one-page Friday client update and hold for approval in Agent Inbox.",
    runs: [
      new Date(2026, 10, 20, 16, 0, 0).getTime(),
      new Date(2026, 10, 27, 16, 0, 0).getTime(),
    ],
    duration: 4800,
    cost: 0.55,
    history: [
      { at: "Nov 13 16:00", outcome: "needs", summary: "Waiting on your OK to send to Priya Shah", cost: 0.55 },
    ],
  },
  {
    id: "invoices",
    name: "Invoice reminders",
    project: "Billing webhooks",
    tone: "var(--af-series-4)",
    cadence: "On the 1st of every month",
    prompt: "Check overdue Stripe invoices past 14 days and prepare polite reminders for finance approval.",
    runs: [
      new Date(2026, 11, 1, 9, 0, 0).getTime(),
      new Date(2027, 0, 1, 9, 0, 0).getTime(),
    ],
    duration: 4000,
    cost: 0.3,
    history: [
      { at: "Nov 1 09:00", outcome: "failed", summary: "Stripe test key expired on staging check", cost: 0.12 },
    ],
  },
  {
    id: "evals",
    name: "Nightly evals",
    project: "Evalkit",
    tone: "var(--af-series-5)",
    cadence: "Every night at 2:00",
    paused: true,
    prompt: "Run the 120-case regression suite across active prompts and flag any accuracy drop below 0.88.",
    runs: [
      new Date(2026, 10, 15, 2, 0, 0).getTime(),
      new Date(2026, 10, 16, 2, 0, 0).getTime(),
    ],
    duration: 6000,
    cost: 4.8,
    history: [
      { at: "Nov 12 02:00", outcome: "done", summary: "94.2% pass rate across 120 cases", cost: 4.8 },
    ],
  },
];

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatTimeOnly(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatClockLabel(ms: number): string {
  const d = new Date(ms);
  const hhmm = formatTimeOnly(ms);
  const dayDiff = Math.round((startOfLocalDay(ms) - startOfLocalDay(BASE_ANCHOR_MS)) / DAY_MS);
  if (dayDiff === 0) return `Today ${hhmm}`;
  if (dayDiff === 1) return `Tomorrow ${hhmm}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const wd = d.toLocaleDateString("en-US", { weekday: "short" });
    return `${wd} ${hhmm}`;
  }
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${md} ${hhmm}`;
}

function formatRelativeDelta(ms: number): string {
  const diffMin = Math.round((ms - BASE_ANCHOR_MS) / MIN_MS);
  if (diffMin <= 3) return "in a moment";
  if (diffMin < 60) return `in ${diffMin} min`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 48) return `in ${hrs} h`;
  return `in ${Math.round(diffMin / (60 * 24))} days`;
}

function outcomeBadge(outcome: ScheduleHistoryItem["outcome"]) {
  if (outcome === "done") return <AfBadge tone="neutral" size="sm">Done</AfBadge>;
  if (outcome === "needs") return <AfBadge tone="warning" size="sm">Needs you</AfBadge>;
  return <AfBadge tone="danger" size="sm">Failed</AfBadge>;
}

/**
 * Agent / Schedules (`/screens/agent-schedules`):
 * Live "Around now" timeline with filling run markers, schedule cadence table with switches,
 * and a right-hand Schedule inspector supporting `Run now`, `Pause`, and per-occurrence `Skip`.
 */
export function AfAgentSchedules(props: AfAgentSchedulesProps = {}) {
  const {
    schedules: schedulesProp,
    defaultSelected = "scan",
    onPause,
    onRunNow,
    onSkip,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 5,
    labels,
    loading = false,
    empty = false,
    className,
    style,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const [items, setItems] = useState<AgentScheduleItem[]>(() => schedulesProp ?? DEFAULT_AGENT_SCHEDULES);
  useEffect(() => {
    if (schedulesProp) setItems(schedulesProp);
  }, [schedulesProp]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultSelected !== null);
  const [skippedRuns, setSkippedRuns] = useState<Record<string, boolean>>({});
  const [liveRun, setLiveRun] = useState<{ scheduleId: string; progress: number } | null>(null);
  const [briefExpanded, setBriefExpanded] = useState<Record<string, boolean>>({});
  const [liveMsg, setLiveMsg] = useState("");
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const copy = {
    schedules: labels?.schedules ?? "Schedules",
    aroundNow: labels?.aroundNow ?? "Around now",
    runningNow: labels?.runningNow ?? "Running now",
    next: labels?.next ?? "Next",
    pause: labels?.pause ?? "Pause",
    resume: labels?.resume ?? "Resume",
    runNow: labels?.runNow ?? "Run now",
    skip: labels?.skip ?? "Skip",
    restore: labels?.restore ?? "Restore",
  };

  useEffect(() => {
    if (!liveRun) return;
    const sched = items.find((s) => s.id === liveRun.scheduleId);
    const dur = Math.max(1200, sched?.duration ?? 4200);
    if (reducedMotion) {
      setLiveRun({ scheduleId: liveRun.scheduleId, progress: 100 });
      const t = window.setTimeout(() => {
        setLiveRun(null);
      }, 900);
      return () => window.clearTimeout(t);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / dur) * 100));
      setLiveRun({ scheduleId: liveRun.scheduleId, progress: pct });
      if (pct < 100) {
        raf = window.requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          setItems((prev) =>
            prev.map((s) =>
              s.id === liveRun.scheduleId
                ? {
                    ...s,
                    history: [
                      {
                        at: "Just now",
                        outcome: "done",
                        summary: "Completed manual run from Schedules",
                        cost: s.cost,
                      },
                      ...(s.history ?? []),
                    ],
                  }
                : s,
            ),
          );
          setLiveRun(null);
        }, 420);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [liveRun?.scheduleId, reducedMotion]);

  const handleTogglePause = useCallback(
    (id: string, nextPaused: boolean) => {
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, paused: nextPaused } : s)));
      const sched = items.find((s) => s.id === id);
      setLiveMsg(`${sched?.name ?? "Schedule"}: ${nextPaused ? "Paused" : "Active"}`);
      onPause?.(id, nextPaused);
    },
    [items, onPause],
  );

  const handleTriggerRunNow = useCallback(
    (id: string) => {
      const sched = items.find((s) => s.id === id);
      setLiveRun({ scheduleId: id, progress: reducedMotion ? 100 : 8 });
      setLiveMsg(`${copy.runningNow}: ${sched?.name ?? id}`);
      onRunNow?.(id);
    },
    [copy.runningNow, items, onRunNow, reducedMotion],
  );

  const handleToggleSkip = useCallback(
    (id: string, at: number) => {
      const key = `${id}:${at}`;
      const nextSkipped = !skippedRuns[key];
      setSkippedRuns((prev) => ({ ...prev, [key]: nextSkipped }));
      onSkip?.(id, at, nextSkipped);
      setLiveMsg(`${nextSkipped ? "Skipped" : "Restored"} run at ${formatClockLabel(at)}`);
    },
    [onSkip, skippedRuns],
  );

  const selectedSchedule = useMemo(
    () => (empty ? null : items.find((s) => s.id === selectedId) ?? null),
    [empty, items, selectedId],
  );

  const activeCount = useMemo(() => items.filter((s) => !s.paused).length, [items]);

  // 12-hour window: Sat 20:30 -> Sun 08:30 so 22:00..08:00 ticks align cleanly and 00:08 sits at ~30%
  const windowStart = new Date(2026, 10, 14, 20, 30, 0).getTime();
  const windowEnd = new Date(2026, 10, 15, 8, 30, 0).getTime();
  const nowPct = ((BASE_ANCHOR_MS - windowStart) / (windowEnd - windowStart)) * 100;

  const timelineMarks = useMemo(() => {
    if (empty) return [];
    const out: {
      key: string;
      scheduleId: string;
      scheduleName: string;
      tone: string;
      at: number;
      pct: number;
      past: boolean;
    }[] = [];
    for (const s of items) {
      if (s.paused) continue;
      for (const r of s.runs) {
        if (r >= windowStart && r <= windowEnd && Math.abs(r - BASE_ANCHOR_MS) <= 2.5 * HOUR_MS) {
          out.push({
            key: `${s.id}-${r}`,
            scheduleId: s.id,
            scheduleName: s.name,
            tone: s.tone ?? "var(--af-warning)",
            at: r,
            pct: ((r - windowStart) / (windowEnd - windowStart)) * 100,
            past: r <= BASE_ANCHOR_MS,
          });
        }
      }
    }
    return out.sort((a, b) => a.at - b.at);
  }, [empty, items, windowEnd, windowStart]);

  const nextUpcoming = useMemo(() => {
    let best: { schedule: AgentScheduleItem; at: number } | null = null;
    for (const s of items) {
      if (s.paused) continue;
      for (const r of s.runs) {
        if (r > BASE_ANCHOR_MS && !skippedRuns[`${s.id}:${r}`]) {
          if (!best || r < best.at) best = { schedule: s, at: r };
        }
      }
    }
    return best;
  }, [items, skippedRuns]);

  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target) || items.length === 0) return;
    if (e.key === "j" || e.key === "J" || e.key === "ArrowDown" || e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "j" || e.key === "J" || e.key === "ArrowDown" ? 1 : -1;
      const cur = items.findIndex((s) => s.id === selectedId);
      const next = items[(cur + delta + items.length) % items.length];
      if (next) {
        setSelectedId(next.id);
        setPanelOpen(true);
        onSelect?.(next.id);
        rowRefs.current[next.id]?.focus();
      }
    }
  };

  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="af-aops-inspector">
          <AfSkeleton lines={3} />
          <AfSkeleton lines={4} />
          <AfSkeleton lines={3} />
        </div>
      );
    }

    if (!selectedSchedule) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="schedule" size={18} />
          <span>Select a schedule to inspect its prompt, upcoming runs and history.</span>
        </div>
      );
    }

    const upcomingTwo = selectedSchedule.runs.filter((r) => r > BASE_ANCHOR_MS).slice(0, 2);
    const isRunningThis = liveRun?.scheduleId === selectedSchedule.id;
    const promptLines = (selectedSchedule.prompt ?? "").split("\n");
    const isLongBrief = promptLines.length > 5 || (selectedSchedule.prompt?.length ?? 0) > 260;
    const expanded = Boolean(briefExpanded[selectedSchedule.id]);

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-inspector__head">
          <span
            className="af-aops-sched-swatch af-aops-sched-swatch--lg"
            data-paused={selectedSchedule.paused ? "true" : undefined}
            style={
              selectedSchedule.paused
                ? undefined
                : { background: selectedSchedule.tone ?? "var(--af-warning)" }
            }
            aria-hidden="true"
          />
          <div className="af-aops-inspector__titles">
            <h3 className="af-aops-inspector__title">{selectedSchedule.name}</h3>
            <div className="af-aops-inspector__sub af-aops-sched-cadence-line">
              <AfIcon name="refresh" size={11} />
              <span>{selectedSchedule.cadence}</span>
              {selectedSchedule.project ? <span> · {selectedSchedule.project}</span> : null}
            </div>
          </div>
        </div>

        <div className="af-aops-inspector__actions af-aops-sched-actions">
          <AfButton
            variant="primary"
            size="sm"
            icon="play"
            loading={isRunningThis}
            onClick={() => handleTriggerRunNow(selectedSchedule.id)}
          >
            {copy.runNow}
          </AfButton>
          <AfButton
            variant="secondary"
            size="sm"
            icon={selectedSchedule.paused ? "play" : "pause"}
            onClick={() => handleTogglePause(selectedSchedule.id, !selectedSchedule.paused)}
          >
            {selectedSchedule.paused ? copy.resume : copy.pause}
          </AfButton>
          {selectedSchedule.cost !== undefined ? (
            <span className="af-aops-sched-per-run af-aops-tabular">
              {formatCurrencyValue(selectedSchedule.cost, "EUR")} per run
            </span>
          ) : null}
        </div>

        {selectedSchedule.prompt ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">What it does</div>
            <div className="af-aops-preview-box" data-clamped={isLongBrief && !expanded ? "true" : undefined}>
              {selectedSchedule.prompt}
            </div>
            {isLongBrief ? (
              <button
                type="button"
                className="af-aops-text-btn"
                onClick={() => setBriefExpanded((p) => ({ ...p, [selectedSchedule.id]: !expanded }))}
              >
                {expanded ? "Show less" : "Show all"}
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="af-aops-sec">
          <div className="af-aops-sec__title">Next runs</div>
          {selectedSchedule.paused ? (
            <div className="af-aops-status-note" data-tone="muted">
              <AfIcon name="pause" size={13} />
              <span>Paused – resume to schedule upcoming runs.</span>
            </div>
          ) : (
            <div className="af-aops-flat-list">
              {upcomingTwo.map((at) => {
                const isSkipped = Boolean(skippedRuns[`${selectedSchedule.id}:${at}`]);
                return (
                  <div key={at} className="af-aops-flat-row" data-skipped={isSkipped ? "true" : undefined}>
                    <div className="af-aops-upcoming-row__when af-aops-tabular">
                      <span>{formatClockLabel(at)}</span>
                      <span className="af-aops-faint">{formatRelativeDelta(at)}</span>
                    </div>
                    <button
                      type="button"
                      className="af-aops-link-muted"
                      onClick={() => handleToggleSkip(selectedSchedule.id, at)}
                    >
                      {isSkipped ? copy.restore : copy.skip}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {selectedSchedule.history && selectedSchedule.history.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">Last runs</div>
            <div className="af-aops-flat-list">
              {selectedSchedule.history.map((h, idx) => (
                <div key={idx} className="af-aops-flat-row af-aops-flat-row--history">
                  <div className="af-aops-flat-row__body">
                    <div className="af-aops-flat-row__title">{h.summary}</div>
                    <div className="af-aops-faint af-aops-tabular">
                      {h.at}
                      {h.cost !== undefined ? ` · ${formatCurrencyValue(h.cost, "EUR")}` : ""}
                    </div>
                  </div>
                  {outcomeBadge(h.outcome)}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const activeLiveSchedule = liveRun ? items.find((s) => s.id === liveRun.scheduleId) : null;
  const nowX = (nowPct / 100) * 600;
  const headY = activeLiveSchedule ? 28 : 50;

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.schedules}</h1>
        {!empty ? (
          <span className="af-aops-topbar__count af-aops-tabular">
            {activeCount} / {items.length}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Schedules"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={780}
      panelTitle="Schedule"
      panelTab={selectedSchedule ? selectedSchedule.name : undefined}
      panelTabIcon={selectedSchedule ? <AfIcon name="refresh" size={12} /> : undefined}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={348}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      className={className}
      style={style}
      onKeyDown={handleRootKeyDown}
      {...rest}
    >
      {loading ? (
        <div className="af-aops-group-stack">
          <AfSkeleton variant="rect" height={148} radius={12} />
          <AfSkeleton variant="rect" height={280} radius={12} />
        </div>
      ) : empty ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="schedule" size={20} />
          </div>
          <h2 className="af-aops-empty__title">No schedules yet</h2>
          <p className="af-aops-empty__desc">
            Tell your agent in Thread what to check every morning, every two hours or on the first of the month.
          </p>
          <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("Thread")}>
            Ask in Thread
          </AfButton>
        </div>
      ) : (
        <div className="af-aops-group-stack">
          <section className="af-aops-sec" aria-label={copy.aroundNow}>
            <div className="af-aops-sec__title">{copy.aroundNow}</div>

            <div className="af-aops-timeline-card">
              <div className="af-aops-timeline-card__head">
                <span className="af-aops-faint">Agent activity</span>
                <span className="af-aops-faint af-aops-tabular">
                  <strong className="af-aops-ink">2</strong> actions / 10 min
                </span>
              </div>

              <div className="af-aops-timeline-stage">
                <svg
                  viewBox="0 0 600 68"
                  preserveAspectRatio="none"
                  className="af-aops-timeline-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="af-sched-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--af-accent)" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="var(--af-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Full subtle baseline */}
                  <line x1="0" y1="56" x2="600" y2="56" stroke="var(--af-page-line)" strokeWidth="1" />
                  {/* Past activity area & curve */}
                  <path
                    d={`M 0 54 C 28 42, 48 55, 76 53 C 102 44, 122 54, 148 52 C 162 50, 172 47, ${nowX.toFixed(1)} ${headY} L ${nowX.toFixed(1)} 56 L 0 56 Z`}
                    fill="url(#af-sched-fill)"
                  />
                  <path
                    d={`M 0 54 C 28 42, 48 55, 76 53 C 102 44, 122 54, 148 52 C 162 50, 172 47, ${nowX.toFixed(1)} ${headY}`}
                    fill="none"
                    stroke="var(--af-accent)"
                    strokeWidth="1.6"
                  />
                  {/* Upcoming marker dashed stems */}
                  {timelineMarks
                    .filter((m) => !m.past)
                    .map((m) => {
                      const mx = (m.pct / 100) * 600;
                      return (
                        <line
                          key={`stem-${m.key}`}
                          x1={mx}
                          y1="16"
                          x2={mx}
                          y2="56"
                          stroke={m.tone}
                          strokeOpacity="0.55"
                          strokeWidth="1"
                          strokeDasharray="2.5 2.5"
                        />
                      );
                    })}
                </svg>

                {/* Current now dot on blue curve */}
                <span
                  className="af-aops-timeline-head"
                  data-running={activeLiveSchedule ? "true" : undefined}
                  style={{ left: `${nowPct}%`, top: `${(headY / 68) * 100}%` }}
                  aria-hidden="true"
                />

                {/* Interactive run markers */}
                {timelineMarks.map((mark) => {
                  const isThisRunning = liveRun?.scheduleId === mark.scheduleId && !mark.past;
                  const statusWord = isThisRunning
                    ? `running, ${liveRun!.progress}%`
                    : mark.past
                      ? "ran"
                      : "upcoming";
                  return (
                    <span
                      key={mark.key}
                      className="af-aops-run-mark-anchor"
                      data-upcoming={!mark.past ? "true" : undefined}
                      style={{ left: `${mark.pct}%` }}
                    >
                      <AfTooltip
                        label={`${mark.scheduleName} · ${formatClockLabel(mark.at)}`}
                        delay={140}
                      >
                        <button
                          type="button"
                          className="af-aops-run-mark"
                          data-past={mark.past ? "true" : undefined}
                          data-active={selectedId === mark.scheduleId ? "true" : undefined}
                          style={{ "--mark-color": mark.tone } as CSSProperties}
                          aria-label={`${mark.scheduleName}, ${formatClockLabel(mark.at)}, ${statusWord}`}
                          onClick={() => {
                            setSelectedId(mark.scheduleId);
                            setPanelOpen(true);
                            onSelect?.(mark.scheduleId);
                          }}
                        >
                          <span className="af-aops-run-mark__dot" />
                        </button>
                      </AfTooltip>
                    </span>
                  );
                })}
              </div>

              <div className="af-aops-timeline-ticks af-aops-timeline-ticks--inset af-aops-tabular" aria-hidden="true">
                <span>22:00</span>
                <span>00:00</span>
                <span>02:00</span>
                <span>04:00</span>
                <span>06:00</span>
                <span>08:00</span>
              </div>

              <div className="af-aops-timeline-status" role="status">
                {activeLiveSchedule && liveRun ? (
                  <span className="af-aops-running-chip af-aops-tabular">
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--af-track)" strokeWidth="2" />
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        fill="none"
                        stroke="var(--af-accent)"
                        strokeWidth="2"
                        strokeDasharray={37.7}
                        strokeDashoffset={37.7 * (1 - liveRun.progress / 100)}
                        transform="rotate(-90 8 8)"
                      />
                    </svg>
                    <span>
                      {copy.runningNow}: <strong>{activeLiveSchedule.name}</strong> · {liveRun.progress}%
                    </span>
                  </span>
                ) : nextUpcoming ? (
                  <span className="af-aops-next-line af-aops-tabular">
                    <span className="af-aops-faint">{copy.next}:</span>{" "}
                    <strong>{nextUpcoming.schedule.name}</strong>{" "}
                    <span className="af-aops-faint">
                      · {formatTimeOnly(nextUpcoming.at)}, {formatRelativeDelta(nextUpcoming.at)}
                    </span>
                  </span>
                ) : (
                  <span className="af-aops-faint">All schedules paused</span>
                )}
              </div>
            </div>
          </section>

          <section className="af-aops-sec" aria-label={copy.schedules}>
            <div className="af-aops-sec__title">{copy.schedules}</div>
            <div className="af-aops-list-card">
              {items.map((sched) => {
                const nextAt = sched.runs.find((r) => r > BASE_ANCHOR_MS && !skippedRuns[`${sched.id}:${r}`]);
                const lastOutcome = sched.history?.[0]?.outcome ?? "done";
                const isSelected = selectedId === sched.id;

                return (
                  <div
                    key={sched.id}
                    className="af-aops-sched-row"
                    data-selected={isSelected ? "true" : undefined}
                    data-paused={sched.paused ? "true" : undefined}
                  >
                    <button
                      ref={(el) => {
                        rowRefs.current[sched.id] = el;
                      }}
                      type="button"
                      className="af-aops-sched-row__main"
                      onClick={() => {
                        setSelectedId(sched.id);
                        setPanelOpen(true);
                        onSelect?.(sched.id);
                      }}
                    >
                      <span
                        className="af-aops-sched-swatch"
                        data-paused={sched.paused ? "true" : undefined}
                        style={sched.paused ? undefined : { background: sched.tone ?? "var(--af-accent)" }}
                        aria-hidden="true"
                      />
                      <span className="af-aops-sched-row__ident">
                        <span className="af-aops-sched-row__name">{sched.name}</span>
                        <span className="af-aops-sched-row__cadence">{sched.cadence}</span>
                      </span>
                      <span className="af-aops-sched-row__next af-aops-tabular">
                        {sched.paused ? (
                          <span className="af-aops-faint">Paused</span>
                        ) : nextAt ? (
                          <>
                            <span>{formatClockLabel(nextAt)}</span>
                            <span className="af-aops-faint"> {formatRelativeDelta(nextAt)}</span>
                          </>
                        ) : (
                          <span className="af-aops-faint">—</span>
                        )}
                      </span>
                      <span className="af-aops-sched-row__outcome">{outcomeBadge(lastOutcome)}</span>
                      <span className="af-aops-sched-row__cost af-aops-tabular">
                        {sched.cost !== undefined
                          ? formatCurrencyValue(sched.cost, "EUR", { compact: sched.cost >= 1000 })
                          : "—"}
                      </span>
                    </button>

                    <div className="af-aops-sched-row__switch">
                      <AfSwitch
                        size="sm"
                        tone="accent"
                        checked={!sched.paused}
                        aria-label={`${sched.name} (${sched.cadence})`}
                        onCheckedChange={(on) => handleTogglePause(sched.id, !on)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AgentOpsShell>
  );
}
