import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark, ToolBrandMark } from "./_marks";

export type TrailKind = "thought" | "tool" | "edit" | "verify";

export interface AgentTrailEvent {
  id: string;
  kind: TrailKind;
  time: string;
  title: string;
  duration: string;
  payload: string;
}

export type TrailStepState =
  | "done"
  | "running"
  | "pending"
  | "waiting"
  | "failed"
  | "declined";

export interface TrailSubstep {
  id?: string;
  title: string;
  state?: "done" | "running" | "pending";
  detail?: string;
}

export interface TrailStep {
  id: string;
  title: string;
  state: TrailStepState;
  /** Duration in ms or formatted text. */
  duration?: number | string;
  /** One-word present status on a running step, e.g. "Editing". */
  status?: string;
  /** Epoch ms when running step started. */
  startedAt?: number;
  /** Requires approval before proceeding. */
  gate?: boolean;
  /** Prompt shown when waiting for approval. */
  ask?: string;
  tool?: { logo?: ReactNode; name: string };
  substeps?: TrailSubstep[];
}

export interface AgentTrailLabels {
  title: string;
  running: string;
  approval: string;
  waiting: string;
  failed: string;
  declined: string;
  done: string;
  pending: string;
  empty: string;
  untitled: string;
  earlier: (n: number) => string;
  more: (n: number) => string;
  fewer: string;
  approve: string;
  decline: string;
}

export interface AfAgentTrailProps {
  /** Ordered steps the agent walks through. */
  steps?: TrailStep[];
  /** Task header above the trail (omit for headless list). */
  title?: ReactNode;
  /** Optional agent mark & name in the header. */
  agent?: { name: string; logo?: ReactNode; id?: string };
  /** Controlled expanded step ids. */
  expanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  onApprove?: (step: TrailStep) => void;
  onDecline?: (step: TrailStep) => void;
  labels?: Partial<AgentTrailLabels>;
  /** Legacy compatibility prop. */
  events?: AgentTrailEvent[];
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_STEPS: TrailStep[] = [
  {
    id: "tr-1",
    title: "Read the bug report",
    state: "done",
    duration: "8s",
    tool: { name: "Linear" },
    substeps: [
      {
        id: "tr-1a",
        title: "Fetched issue ENG-842 and stack trace",
        state: "done",
        detail: "ENG-842",
      },
    ],
  },
  {
    id: "tr-2",
    title: "Reproduce the crash",
    state: "done",
    duration: "34s",
    tool: { name: "Vercel" },
    substeps: [
      {
        id: "tr-2a",
        title: "Triggered TypeError on empty cart submit",
        state: "done",
        detail: "1 failing",
      },
    ],
  },
  {
    id: "tr-3",
    title: "Patch the checkout form",
    state: "running",
    status: "Editing",
    duration: "21s",
    tool: { name: "GitHub" },
    substeps: [
      {
        id: "tr-3a",
        title: "Found the empty-cart case",
        state: "done",
        detail: "cart.ts:142",
      },
      {
        id: "tr-3b",
        title: "Added a guard and 2 tests",
        state: "running",
        detail: "+18 −3",
      },
    ],
  },
  {
    id: "tr-4",
    title: "Write the release note",
    state: "pending",
    tool: { name: "Notion" },
  },
  {
    id: "tr-5",
    title: "Open a pull request",
    state: "waiting",
    gate: true,
    ask: "Push branch fix/empty-cart and open PR against main?",
    tool: { name: "GitHub" },
  },
];

const DEFAULT_LABELS: AgentTrailLabels = {
  title: "Fix the checkout crash",
  running: "Running",
  approval: "Approval",
  waiting: "Waiting",
  failed: "Failed",
  declined: "Declined",
  done: "Done",
  pending: "Pending",
  empty: "No steps recorded",
  untitled: "Step",
  earlier: (n) => `${n} earlier`,
  more: (n) => `${n} more`,
  fewer: "Show less",
  approve: "Approve",
  decline: "Decline",
};

function formatDurationValue(val?: number | string): string | null {
  if (val === undefined) return null;
  if (typeof val === "string") return val;
  const sec = Math.max(1, Math.round(val / 1000));
  return `${sec}s`;
}

function StepStateGlyph({
  state,
  gate,
}: {
  state: TrailStepState;
  gate?: boolean;
}) {
  if (state === "done") {
    return (
      <span className="af-agc-trl__node is-done" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="var(--af-trl-done-bg)"
            stroke="var(--af-trl-done-ring)"
            strokeWidth="1.2"
          />
          <path
            d="m5.3 8.1 1.85 1.85 3.6-3.7"
            stroke="var(--af-trl-done-fg)"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className="af-agc-trl__node is-running" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="var(--af-trl-live)"
            strokeOpacity="0.22"
            strokeWidth="1.4"
          />
          <path
            className="af-agc-trl__spin"
            d="M8 1.75A6.25 6.25 0 0 1 14.25 8"
            stroke="var(--af-trl-live)"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="2.1" fill="var(--af-trl-live)" />
        </svg>
      </span>
    );
  }
  if (state === "waiting" || gate) {
    return (
      <span className="af-agc-trl__node is-gate" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="var(--af-trl-warn)"
            strokeWidth="1.35"
            strokeDasharray="2.4 2.2"
          />
          <circle cx="8" cy="8" r="2" fill="var(--af-trl-warn)" />
        </svg>
      </span>
    );
  }
  if (state === "failed" || state === "declined") {
    return (
      <span className="af-agc-trl__node is-failed" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="var(--af-trl-danger)"
            strokeWidth="1.3"
          />
          <path
            d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2"
            stroke="var(--af-trl-danger)"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-agc-trl__node is-pending" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle
          cx="8"
          cy="8"
          r="5.75"
          stroke="var(--af-trl-muted-ring)"
          strokeWidth="1.25"
        />
      </svg>
    </span>
  );
}

export function AfAgentTrail({
  steps: propSteps,
  title,
  agent = { id: "claude-code", name: "Claude Code" },
  expanded: controlledExpanded,
  onExpandedChange,
  onApprove,
  onDecline,
  labels: labelOverrides,
  events,
  className,
  style,
}: AfAgentTrailProps = {}) {
  const L = { ...DEFAULT_LABELS, ...labelOverrides };

  const initialSteps = useMemo<TrailStep[]>(() => {
    if (propSteps && propSteps.length > 0) return propSteps;
    if (events && events.length > 0) {
      return events.map((ev, idx) => ({
        id: ev.id,
        title: ev.title,
        state: idx < events.length - 1 ? "done" : "running",
        duration: ev.duration,
        tool: { name: ev.kind === "verify" ? "Vercel" : "GitHub" },
        substeps: [{ id: `${ev.id}-s`, title: ev.payload, state: "done" }],
      }));
    }
    return DEFAULT_STEPS;
  }, [events, propSteps]);

  const [overrides, setOverrides] = useState<Record<string, TrailStepState>>({});
  const [internalExpanded, setInternalExpanded] = useState<string[]>(["tr-3"]);
  const [openGateId, setOpenGateId] = useState<string | null>(null);

  const steps = useMemo(
    () =>
      initialSteps.map((s) =>
        overrides[s.id] ? { ...s, state: overrides[s.id] } : s,
      ),
    [initialSteps, overrides],
  );

  const expandedIds = controlledExpanded ?? internalExpanded;
  const toggleStep = (id: string) => {
    const next = expandedIds.includes(id)
      ? expandedIds.filter((x) => x !== id)
      : [...expandedIds, id];
    if (controlledExpanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const doneCount = useMemo(
    () => steps.filter((s) => s.state === "done").length,
    [steps],
  );

  const heading = title !== undefined ? title : L.title;

  return (
    <div className={cn("af-agc-trl", className)} style={style}>
      {heading !== null ? (
        <div className="af-agc-trl__head">
          <span className="af-agc-trl__title">{heading}</span>
          <div className="af-agc-trl__head-right">
            {agent ? (
              <span className="af-agc-trl__agent-pill">
                {agent.logo ?? (
                  <ModelBrandMark model={agent.name} size={11} />
                )}
                <span>{agent.name}</span>
              </span>
            ) : null}
            <span className="af-agc-trl__count">
              {doneCount}/{steps.length}
            </span>
          </div>
        </div>
      ) : null}

      <ol className="af-agc-trl__list" aria-label="Execution steps">
        {steps.map((step, idx) => {
          const hasSubs = Boolean(step.substeps && step.substeps.length > 0);
          const isOpen = hasSubs && expandedIds.includes(step.id);
          const durText = formatDurationValue(step.duration);
          const isGate =
            step.state === "waiting" ||
            (Boolean(step.gate) &&
              step.state !== "done" &&
              step.state !== "declined");
          const isLast = idx === steps.length - 1;
          const subCount = step.substeps?.length ?? 0;
          const spineH = Math.max(0, subCount * 26);

          return (
            <li
              key={step.id}
              className={cn(
                "af-agc-trl__item",
                `is-${step.state}`,
                isOpen && "is-open",
              )}
            >
              <div className="af-agc-trl__row">
                <div className="af-agc-trl__rail-cell">
                  <span
                    className={cn(
                      "af-agc-trl__stem-top",
                      idx === 0 && "is-hidden",
                      idx <= 2 && "is-done",
                    )}
                    aria-hidden="true"
                  />
                  <StepStateGlyph state={step.state} gate={isGate} />
                  {!isLast && !isOpen ? (
                    <span
                      className={cn(
                        "af-agc-trl__stem",
                        step.state === "done" && "is-done",
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                <button
                  type="button"
                  className={cn(
                    "af-agc-trl__main",
                    (hasSubs || isGate) && "is-interactive",
                  )}
                  aria-expanded={hasSubs ? isOpen : undefined}
                  onClick={() => {
                    if (isGate) {
                      setOpenGateId((prev) =>
                        prev === step.id ? null : step.id,
                      );
                    } else if (hasSubs) {
                      toggleStep(step.id);
                    }
                  }}
                >
                  {step.tool ? (
                    <span className="af-agc-trl__tool-tile" aria-hidden="true">
                      {step.tool.logo ?? (
                        <ToolBrandMark name={step.tool.name} size={11} />
                      )}
                    </span>
                  ) : null}

                  <span className="af-agc-trl__step-title">{step.title}</span>

                  {hasSubs ? (
                    <svg
                      className={cn(
                        "af-agc-trl__chev",
                        isOpen && "is-open",
                      )}
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.25 2.75 7.5 6l-3.25 3.25"
                        stroke="currentColor"
                        strokeWidth="1.35"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}

                  <span className="af-agc-trl__meta">
                    {step.state === "running" && step.status ? (
                      <span className="af-agc-trl__status">{step.status}</span>
                    ) : null}
                    {isGate ? (
                      <span className="af-agc-trl__gate-pill">
                        {L.approval}
                      </span>
                    ) : null}
                    {step.state === "declined" ? (
                      <span className="af-agc-trl__declined-pill">
                        {L.declined}
                      </span>
                    ) : null}
                    {durText ? (
                      <span className="af-agc-trl__dur">{durText}</span>
                    ) : null}
                  </span>
                </button>
              </div>

              {/* Curved blue wire + nested substeps */}
              {isOpen && step.substeps ? (
                <div className="af-agc-trl__branch">
                  <svg
                    className="af-agc-trl__wire"
                    width="30"
                    height={spineH + 24}
                    viewBox={`0 0 30 ${spineH + 24}`}
                    aria-hidden="true"
                  >
                    {!isLast ? (
                      <line
                        x1="8"
                        y1="0"
                        x2="8"
                        y2={spineH + 24}
                        stroke="var(--af-trl-stem)"
                        strokeWidth="1.2"
                      />
                    ) : null}
                    <path
                      d={`M 8 0 C 8 8, 21 5, 21 13 L 21 ${spineH - 3} ${
                        !isLast
                          ? `C 21 ${spineH + 6}, 8 ${spineH + 4}, 8 ${spineH + 14}`
                          : ""
                      }`}
                      fill="none"
                      stroke="var(--af-trl-wire)"
                      strokeWidth="1.45"
                      strokeLinecap="round"
                    />
                    {step.state === "running" ? (
                      <path
                        className="af-agc-trl__wire-spark"
                        d={`M 8 0 C 8 8, 21 5, 21 13 L 21 ${spineH - 3}`}
                        fill="none"
                        stroke="var(--af-trl-live)"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    ) : null}
                  </svg>

                  <ul className="af-agc-trl__subs">
                    {step.substeps.map((sub, sIdx) => {
                      const subState = sub.state ?? "done";
                      return (
                        <li
                          key={sub.id ?? `${step.id}-${sIdx}`}
                          className={cn("af-agc-trl__sub", `is-${subState}`)}
                        >
                          <span
                            className={cn(
                              "af-agc-trl__sub-dot",
                              `is-${subState}`,
                            )}
                            aria-hidden="true"
                          />
                          <span className="af-agc-trl__sub-title">
                            {sub.title}
                          </span>
                          {sub.detail ? (
                            <code className="af-agc-trl__sub-detail">
                              {sub.detail}
                            </code>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {/* Inline gate approval prompt */}
              {isGate && openGateId === step.id ? (
                <div className="af-agc-trl__gate-box">
                  <span className="af-agc-trl__gate-ask">
                    {step.ask ?? `Allow "${step.title}" to run?`}
                  </span>
                  <div className="af-agc-trl__gate-btns">
                    <button
                      type="button"
                      className="af-agc-trl__gate-btn is-primary"
                      onClick={() => {
                        setOverrides((prev) => ({ ...prev, [step.id]: "done" }));
                        setOpenGateId(null);
                        onApprove?.(step);
                      }}
                    >
                      {L.approve}
                    </button>
                    <button
                      type="button"
                      className="af-agc-trl__gate-btn"
                      onClick={() => {
                        setOverrides((prev) => ({
                          ...prev,
                          [step.id]: "declined",
                        }));
                        setOpenGateId(null);
                        onDecline?.(step);
                      }}
                    >
                      {L.decline}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const AfAgentTrailPattern = AfAgentTrail;
export type AfAgentTrailPatternProps = AfAgentTrailProps;
