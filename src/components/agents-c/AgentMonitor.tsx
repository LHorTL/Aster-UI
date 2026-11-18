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

export type MonitorView = "throughput" | "latency" | "errors";

export type AgentMonitorState =
  | "idle"
  | "running"
  | "waiting"
  | "paused"
  | "finished"
  | "failed"
  | "cancelled";

export type AgentMonitorStepKind =
  | "read"
  | "search"
  | "edit"
  | "run"
  | "think"
  | "web";

export interface AgentRunStep {
  id: string;
  label: string;
  kind?: AgentMonitorStepKind;
  icon?: ReactNode;
  tool?: string;
  detail?: string;
  output?: string;
  state: "queued" | "running" | "done" | "failed";
  since?: number;
  /** Duration in ms. */
  took?: number;
}

export interface AfAgentMonitorProps {
  /** Current run state. */
  state?: AgentMonitorState;
  /** Agent identity (name, role/model, optional mark). */
  agent?: { name: string; role?: string; mark?: ReactNode; id?: string };
  /** Ordered steps (oldest first). */
  steps?: AgentRunStep[];
  /** Override current step shown in the sunken well. */
  current?: {
    label: string;
    kind?: AgentMonitorStepKind;
    icon?: ReactNode;
    tool?: string;
  };
  /** Epoch ms when run started / ended. */
  since?: number;
  until?: number;
  /** Time spent paused in ms. */
  pausedFor?: number;
  /** USD spent so far. */
  cost?: number;
  /** Approval prompt shown in the well when `state === "waiting"`. */
  ask?: { title: string; command?: string; icon?: ReactNode; tool?: string };
  /** Outcome summary once finished. */
  outcome?: { added?: number; removed?: number; files?: number; note?: string };
  /** Short failure reason when `state === "failed"`. */
  error?: string;
  onAllow?: () => void;
  onDecline?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onOpenLog?: () => void;
  /** Start folded into a compact single-line pill bar. */
  defaultFolded?: boolean;
  /** Legacy compatibility props. */
  title?: ReactNode;
  defaultView?: MonitorView;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_STEPS: AgentRunStep[] = [
  {
    id: "st-1",
    label: "Collecting the v3.2 issues",
    tool: "Linear",
    kind: "search",
    state: "running",
    took: 11_000,
    output: "Cross-checking 18 Linear issues tagged v3.2 against PR commits",
  },
  {
    id: "st-2",
    label: "Checked tag v3.1.4",
    tool: "GitHub",
    kind: "read",
    state: "queued",
    took: 8_000,
    output: "Resolved base tag v3.1.4 (commit 94b21e0) across 14 merged PRs",
  },
  {
    id: "st-3",
    label: "Merged 14 release PRs",
    tool: "GitHub",
    kind: "edit",
    state: "queued",
    took: 19_000,
    output: "Fast-forwarded release/v3.2 branch cleanly with 0 conflicts",
  },
  {
    id: "st-4",
    label: "Drafted changelog notes",
    tool: "Notion",
    kind: "edit",
    state: "queued",
    took: 15_000,
    output: "Grouped highlights into Features (6), Fixes (5), Performance (3)",
  },
  {
    id: "st-5",
    label: "Deploy preview build",
    tool: "Vercel",
    kind: "run",
    state: "queued",
    took: 12_000,
    output: "Preview deployed to web-app-v3-2.vercel.app",
  },
  {
    id: "st-6",
    label: "Post release announcement",
    tool: "Slack",
    kind: "web",
    state: "queued",
    took: 8_000,
    output: "Posted v3.2 changelog summary in #releases",
  },
];

const DEMO_STEP_COSTS = [0.002, 0.048, 0.14, 0.24, 0.32, 0.38];

function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function formatStepSec(ms?: number): string {
  if (!ms) return "—";
  const sec = Math.max(1, Math.round(ms / 1000));
  return `${sec}s`;
}

export function AfAgentMonitor({
  state: controlledState,
  agent = {
    id: "claude-opus-5.5",
    name: "Claude Opus 5.5",
    role: "Release agent · web-app v3.2",
  },
  steps: propSteps,
  current,
  cost: propCost,
  ask = {
    title: "Publish release tag v3.2.0",
    command: "git push origin v3.2.0",
    tool: "GitHub",
  },
  outcome = { added: 142, removed: 28, files: 9, note: "Release v3.2 ready" },
  error = "Preview build timed out on Vercel edge check",
  onAllow,
  onDecline,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onOpenLog,
  defaultFolded = false,
  title,
  className,
  style,
}: AfAgentMonitorProps = {}) {
  const isDefaultDemo =
    !propSteps && controlledState === undefined && !current;
  const [internalState, setInternalState] =
    useState<AgentMonitorState>("running");
  const [folded, setFolded] = useState(defaultFolded);
  const [elapsedSec, setElapsedSec] = useState(() => (isDefaultDemo ? 0 : 56));
  const [demoStepIdx, setDemoStepIdx] = useState(0);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

  const state = controlledState ?? internalState;

  useEffect(() => {
    if (state !== "running") return;
    const t = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (!isDefaultDemo || state !== "running") return;
    const t = window.setInterval(() => {
      setDemoStepIdx((prev) => {
        if (prev + 1 >= DEFAULT_STEPS.length) {
          setElapsedSec(0);
          return 0;
        }
        return prev + 1;
      });
    }, 1600);
    return () => window.clearInterval(t);
  }, [isDefaultDemo, state]);

  const steps = useMemo<AgentRunStep[]>(() => {
    if (propSteps && propSteps.length > 0) return propSteps;
    return DEFAULT_STEPS.map((st, idx) => ({
      ...st,
      state:
        idx < demoStepIdx
          ? "done"
          : idx === demoStepIdx
            ? "running"
            : "queued",
    }));
  }, [demoStepIdx, propSteps]);

  const cost = useMemo(() => {
    if (propCost !== undefined) return propCost;
    if (!isDefaultDemo) return 0.38;
    const base = DEMO_STEP_COSTS[demoStepIdx] ?? 0.38;
    return base + Math.min(0.009, elapsedSec * 0.001);
  }, [demoStepIdx, elapsedSec, isDefaultDemo, propCost]);

  const formattedCost =
    propCost === undefined && cost < 0.1
      ? `$${cost.toFixed(3)}`
      : `$${cost.toFixed(2)}`;

  const setNextState = (next: AgentMonitorState) => {
    if (controlledState === undefined) setInternalState(next);
  };

  const activeStep = useMemo(() => {
    if (current) {
      return {
        id: "cur",
        label: current.label,
        tool: current.tool ?? "Linear",
        icon: current.icon,
        state: "running" as const,
      };
    }
    return (
      steps.find((s) => s.state === "running") ??
      steps[steps.length - 1] ??
      DEFAULT_STEPS[3]
    );
  }, [current, steps]);

  const completedSteps = useMemo(
    () => steps.filter((s) => s.state === "done" || s.state === "failed"),
    [steps],
  );

  const doneCount = useMemo(
    () => steps.filter((s) => s.state === "done").length,
    [steps],
  );

  const focusedStep = useMemo(
    () => (focusedStepId ? steps.find((s) => s.id === focusedStepId) ?? null : null),
    [focusedStepId, steps],
  );

  const uniqueTools = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      const t = steps[i].tool;
      if (t && !seen.has(t)) {
        seen.add(t);
        list.push(t);
      }
    }
    return list.slice(0, 4);
  }, [steps]);

  const statusMeta = useMemo(() => {
    switch (state) {
      case "running":
        return { label: "Running", tone: "live" };
      case "waiting":
        return { label: "Approval", tone: "warn" };
      case "paused":
        return { label: "Paused", tone: "muted" };
      case "finished":
        return { label: "Done", tone: "ok" };
      case "failed":
        return { label: "Failed", tone: "danger" };
      case "cancelled":
        return { label: "Cancelled", tone: "muted" };
      default:
        return { label: "Idle", tone: "muted" };
    }
  }, [state]);

  const handleSegKey = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === "ArrowRight" && steps[idx + 1]) {
      e.preventDefault();
      setFocusedStepId(steps[idx + 1].id);
    } else if (e.key === "ArrowLeft" && steps[idx - 1]) {
      e.preventDefault();
      setFocusedStepId(steps[idx - 1].id);
    } else if (e.key === "Escape") {
      setFocusedStepId(null);
    }
  };

  if (folded) {
    return (
      <div
        className={cn("af-agc-mon is-folded", `is-${state}`, className)}
        style={style}
      >
        <span className="af-agc-mon__brand-tile" aria-hidden="true">
          {agent.mark ?? <ModelBrandMark model={agent.name} size={15} />}
        </span>
        <span className="af-agc-mon__folded-name">
          {title ?? agent.name}
        </span>

        <div className="af-agc-mon__tool-stack" aria-label="Tools in use">
          {uniqueTools.map((tool) => (
            <span
              key={tool}
              className="af-agc-mon__stack-tile"
              title={tool}
            >
              <ToolBrandMark name={tool} size={12} />
            </span>
          ))}
        </div>

        <span className="af-agc-mon__folded-clock">
          {formatElapsed(elapsedSec)}
        </span>

        <button
          type="button"
          className="af-agc-mon__fold-btn"
          aria-label="Expand monitor"
          onClick={() => setFolded(false)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m5 6 3-3 3 3M5 10l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="af-agc-mon-stage"
      style={isDefaultDemo ? { minHeight: 316 } : undefined}
    >
    <div
      className={cn("af-agc-mon", `is-${state}`, className)}
      style={style}
    >
      <div className="af-agc-mon__top">
        <span className="af-agc-mon__brand-tile" aria-hidden="true">
          {agent.mark ?? <ModelBrandMark model={agent.name} size={15} />}
        </span>

        <div className="af-agc-mon__ident">
          <div className="af-agc-mon__name-row">
            <span className="af-agc-mon__name">{title ?? agent.name}</span>
          </div>
          {agent.role ? (
            <div className="af-agc-mon__role">{agent.role}</div>
          ) : null}
        </div>

        <span
          className={cn(
            "af-agc-mon__cost",
            state === "running" && "is-shimmer",
          )}
        >
          {formattedCost}
        </span>

        <span className={cn("af-agc-mon__chip", `is-${statusMeta.tone}`)}>
          <span className="af-agc-mon__chip-dot" aria-hidden="true" />
          {statusMeta.label}
        </span>

        <button
          type="button"
          className="af-agc-mon__fold-btn"
          aria-label="Fold monitor"
          onClick={() => setFolded(true)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m5 3 3 3 3-3M5 13l3-3 3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Sunken current-step well */}
      <div className="af-agc-mon__well">
        {state === "waiting" ? (
          <div className="af-agc-mon__ask">
            <span className="af-agc-mon__well-tile" aria-hidden="true">
              {ask.icon ?? (
                <ToolBrandMark name={ask.tool ?? "GitHub"} size={13} />
              )}
            </span>
            <div className="af-agc-mon__ask-copy">
              <span className="af-agc-mon__ask-title">{ask.title}</span>
              {ask.command ? (
                <code className="af-agc-mon__ask-cmd">{ask.command}</code>
              ) : null}
            </div>
            <div className="af-agc-mon__ask-btns">
              <button
                type="button"
                className="af-agc-mon__mini-btn is-primary"
                onClick={() => {
                  setNextState("running");
                  onAllow?.();
                }}
              >
                Allow
              </button>
              <button
                type="button"
                className="af-agc-mon__mini-btn"
                onClick={() => {
                  setNextState("cancelled");
                  onDecline?.();
                }}
              >
                Deny
              </button>
            </div>
          </div>
        ) : state === "failed" ? (
          <div className="af-agc-mon__well-row is-error">
            <span className="af-agc-mon__well-text">{error}</span>
          </div>
        ) : state === "finished" ? (
          <div className="af-agc-mon__well-row">
            <span className="af-agc-mon__well-text">
              {outcome.note ?? "Completed all release checks"}
            </span>
            {outcome.added !== undefined ? (
              <span className="af-agc-mon__well-diff">
                <span className="is-add">+{outcome.added}</span>{" "}
                <span className="is-del">−{outcome.removed ?? 0}</span>
              </span>
            ) : null}
          </div>
        ) : (
          <div className="af-agc-mon__well-row">
            <span className="af-agc-mon__well-tile" aria-hidden="true">
              {activeStep.icon ?? (
                <ToolBrandMark name={activeStep.tool ?? "Linear"} size={13} />
              )}
            </span>
            <span
              className={cn(
                "af-agc-mon__well-text",
                state === "running" && "is-shimmer",
              )}
            >
              {state === "paused"
                ? `Paused · ${activeStep.label}`
                : state === "cancelled"
                  ? "Run cancelled"
                  : activeStep.label}
            </span>
            <span className="af-agc-mon__clock">
              {formatElapsed(elapsedSec)}
            </span>
          </div>
        )}
      </div>

      {/* Proportional step segment strip */}
      <div className="af-agc-mon__segs" role="list" aria-label="Step progress">
        {steps.map((step, idx) => {
          const weight = Math.max(1, Math.round((step.took ?? 10_000) / 4000));
          const isFocused = focusedStepId === step.id;
          return (
            <button
              key={step.id}
              type="button"
              className={cn(
                "af-agc-mon__seg",
                `is-${step.state}`,
                isFocused && "is-focused",
              )}
              style={{ flex: `${weight} 1 0%` }}
              aria-label={`${step.label} (${step.state})`}
              onClick={() =>
                setFocusedStepId((prev) => (prev === step.id ? null : step.id))
              }
              onKeyDown={(e) => handleSegKey(e, idx)}
            />
          );
        })}
      </div>

      {focusedStep ? (
        <div className="af-agc-mon__info">
          <div className="af-agc-mon__info-head">
            <span className="af-agc-mon__info-label">{focusedStep.label}</span>
            <span className="af-agc-mon__info-time">
              {formatStepSec(focusedStep.took)}
            </span>
          </div>
          {focusedStep.output ? (
            <div className="af-agc-mon__info-out">{focusedStep.output}</div>
          ) : null}
        </div>
      ) : null}

      {/* Completed steps list */}
      {completedSteps.length > 0 ? (
        <div className="af-agc-mon__steps">
          {completedSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={cn(
                "af-agc-mon__step",
                focusedStepId === step.id && "is-active",
              )}
              onClick={() =>
                setFocusedStepId((prev) => (prev === step.id ? null : step.id))
              }
            >
              <span className="af-agc-mon__step-tile" aria-hidden="true">
                {step.icon ?? (
                  <ToolBrandMark name={step.tool ?? "GitHub"} size={11} />
                )}
              </span>
              <span className="af-agc-mon__step-label">{step.label}</span>
              <span className="af-agc-mon__step-took">
                {formatStepSec(step.took)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Inside-card bottom footer */}
      <div className="af-agc-mon__foot">
        <div className="af-agc-mon__foot-left">
          {state === "running" ? (
            <button
              type="button"
              className="af-agc-mon__ctrl-btn"
              onClick={() => {
                setNextState("paused");
                onPause?.();
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <rect x="2.5" y="2.2" width="2.2" height="7.6" rx="0.8" fill="currentColor" />
                <rect x="7.3" y="2.2" width="2.2" height="7.6" rx="0.8" fill="currentColor" />
              </svg>
              <span>Pause</span>
            </button>
          ) : state === "paused" ? (
            <button
              type="button"
              className="af-agc-mon__ctrl-btn is-primary"
              onClick={() => {
                setNextState("running");
                onResume?.();
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path d="M3.2 2.3 9.5 6l-6.3 3.7V2.3Z" fill="currentColor" />
              </svg>
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              className="af-agc-mon__ctrl-btn"
              onClick={() => {
                setElapsedSec(12);
                setNextState("running");
                onRetry?.();
              }}
            >
              <span>Retry</span>
            </button>
          )}

          {state === "running" || state === "paused" || state === "waiting" ? (
            <button
              type="button"
              className="af-agc-mon__ctrl-btn"
              onClick={() => {
                setNextState("cancelled");
                onCancel?.();
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.2 3.2 8.8 8.8M8.8 3.2 3.2 8.8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <span>Cancel</span>
            </button>
          ) : null}
        </div>

        <div className="af-agc-mon__foot-right">
          <span className="af-agc-mon__fraction">
            {doneCount + (state === "running" ? 1 : 0)}/{steps.length}
          </span>
          <button
            type="button"
            className="af-agc-mon__log-btn"
            onClick={() => onOpenLog?.()}
          >
            <span>Log</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.5 9.5 9.75 4.25M5.25 4.25h4.5v4.5"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

export const AfAgentMonitorPattern = AfAgentMonitor;
export type AfAgentMonitorPatternProps = AfAgentMonitorProps;
