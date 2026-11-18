import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";
import { ModelBrandMark } from "../agents-c/_marks";

export type ApprovalGateKind = "tool" | "file" | "agent" | "message";
export type ApprovalGateStatus = "open" | "approved" | "edited" | "rejected";
export type ApprovalGateDecision = "approved" | "edited" | "rejected";

/** Legacy compatible status union. */
export type GateStatus = ApprovalGateStatus | "pending" | "waived";

export interface ApprovalGateDiffLine {
  type: "add" | "del" | "ctx";
  text: string;
}

export interface ApprovalGateDiffFile {
  file: string;
  lines: ApprovalGateDiffLine[];
}

export interface ApprovalGate {
  id: string;
  agent: string;
  avatar?: ReactNode;
  kind: ApprovalGateKind;
  action: string;
  reason: string;
  status: ApprovalGateStatus;
  at?: string;
  input?: string;
  diff?: ApprovalGateDiffFile[];
  files?: string[];
  context?: string[];
  holds?: string[];
  note?: string;
}

/** Legacy compatible item alias. */
export type ApprovalGateItem = ApprovalGate;

export interface AfApprovalGatesProps {
  /** Every gate of the run, in the order they came up — open ones form the stack, the rest the Decided list. */
  gates?: ApprovalGate[];
  /** What the run is about — shown muted next to the title. */
  task?: string;
  /** The run is still going: with nothing open it reads Running, and new requests slide in behind the stack. */
  live?: boolean;
  /** Called when a gate is decided — with edited, value is the changed input or note. */
  onDecide?: (id: string, decision: ApprovalGateDecision, value?: string) => void;
  /** Heading of the summary block on top. */
  title?: string;
  /** Extra class on the root. */
  className?: string;
  /** Inline style override. */
  style?: CSSProperties;
}

export type AfApprovalGatesPatternProps = AfApprovalGatesProps;

const DEFAULT_GATES: ApprovalGate[] = [
  {
    id: "migrate",
    agent: "Coder",
    avatar: <ModelBrandMark model="claude" size={12} />,
    kind: "tool",
    action: "Run the database migration",
    reason: "Writes to the production database",
    status: "approved",
    at: "6m ago",
    input: JSON.stringify(
      {
        migration: "2026_11_05_add_seat_prices",
        database: "prod-eu-1",
        dry_run: false,
      },
      null,
      2,
    ),
  },
  {
    id: "prices",
    agent: "Coder",
    avatar: <ModelBrandMark model="claude" size={12} />,
    kind: "file",
    action: "Change prices in pricing.ts",
    reason: "Changes what customers pay from Monday",
    status: "open",
    at: "1m ago",
    diff: [
      {
        file: "src/billing/pricing.ts",
        lines: [
          { type: "ctx", text: "export const plans = {" },
          { type: "del", text: '  pro: { seat: 8, currency: "usd" },' },
          { type: "add", text: '  pro: { seat: 10, currency: "usd" },' },
          { type: "del", text: '  team: { seat: 12, currency: "usd" },' },
          { type: "add", text: '  team: { seat: 15, currency: "usd", minSeats: 3 },' },
          { type: "ctx", text: "};" },
        ],
      },
    ],
    context: [
      "Migration approved",
      "Created the Stripe prices in test mode",
      "Checkout tests passed",
    ],
    files: ["src/billing/pricing.ts"],
    holds: ["Deploy to production", "Post to #launch"],
  },
  {
    id: "outreach",
    agent: "Growth agent",
    kind: "message",
    action: "Email 1,284 trial users",
    reason: "Sends to customers outside the team",
    status: "open",
    at: "just now",
    input:
      "Subject: New plans, same price for you\n\nHi {{first_name}}, we're changing our plans on Monday. As a trial user you keep today's price for a year.",
    context: [
      "Segmented 1,284 active trial workspaces",
      "Verified unsubscribe link and reply-to header",
    ],
    holds: ["Schedule the send"],
  },
];

const FOLLOWUP_LIVE_GATE: ApprovalGate = {
  id: "webhook-live",
  agent: "Coder",
  avatar: <ModelBrandMark model="claude" size={12} />,
  kind: "tool",
  action: "Enable live Stripe billing webhook",
  reason: "Starts charging live cards on plan upgrades",
  status: "open",
  at: "just now",
  input: JSON.stringify(
    {
      endpoint: "https://api.acme.dev/webhooks/stripe",
      events: ["customer.subscription.updated", "invoice.paid"],
    },
    null,
    2,
  ),
  context: ["Staging webhook verified", "Idempotency keys enabled"],
  holds: ["Verify first live event", "Close launch checklist"],
};

const KIND_LABEL: Record<ApprovalGateKind, string> = {
  tool: "Tool call",
  file: "File change",
  agent: "Sub-agent",
  message: "Message",
};

const SECTION_LABEL: Record<ApprovalGateKind, string> = {
  tool: "Arguments",
  file: "Changes",
  agent: "Prompt",
  message: "Message",
};

function agentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function StackMarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.4" y="1.6" width="9.2" height="3" rx="1.2" fill="currentColor" opacity="0.3" />
      <rect x="2.2" y="3.6" width="11.6" height="3.4" rx="1.3" fill="currentColor" opacity="0.55" />
      <rect x="1" y="6.2" width="14" height="8.2" rx="2" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.27 18.84C4.49 20.52 5.88 21.82 7.56 21.9C8.98 21.97 10.42 22 12 22C13.58 22 15.02 21.97 16.44 21.9C18.12 21.82 19.51 20.52 19.73 18.84C19.88 17.75 20 16.64 20 15.5C20 14.36 19.88 13.25 19.73 12.16C19.51 10.49 18.12 9.18 16.44 9.1C15.02 9.03 13.58 9 12 9C10.42 9 8.98 9.03 7.56 9.1C5.88 9.18 4.49 10.49 4.27 12.16C4.12 13.25 4 14.36 4 15.5C4 16.64 4.12 17.75 4.27 18.84Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M7.5 9V6.5C7.5 4.01 9.51 2 12 2C14.49 2 16.5 4.01 16.5 6.5V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.07 3.89C14.82 3.08 15.19 2.67 15.59 2.44C16.54 1.87 17.72 1.85 18.69 2.39C19.09 2.62 19.48 3.01 20.25 3.79C21.01 4.58 21.4 4.97 21.62 5.38C22.14 6.37 22.13 7.57 21.57 8.55C21.34 8.96 20.94 9.34 20.15 10.1L10.75 19.15C9.25 20.6 8.5 21.32 7.57 21.68C6.63 22.05 5.6 22.02 3.55 21.97L3.27 21.96C2.64 21.94 2.33 21.94 2.14 21.73C1.96 21.52 1.99 21.2 2.04 20.57L2.06 20.22C2.2 18.42 2.27 17.53 2.62 16.72C2.97 15.91 3.58 15.26 4.79 13.94L14.07 3.89Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13 4L20 11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path
        d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/**
 * Approval Gates — stacked approval cards with summary bar, inline diff/edit, hold counter, and collapsible Decided history.
 */
export function AfApprovalGates({
  gates: controlledGates,
  task = "Launch the new pricing page",
  live = true,
  onDecide,
  title = "Approvals",
  className,
  style,
}: AfApprovalGatesProps = {}) {
  const [internalGates, setInternalGates] = useState<ApprovalGate[]>(
    controlledGates ?? DEFAULT_GATES,
  );
  const gates = controlledGates ?? internalGates;

  const openGates = gates.filter((g) => g.status === "open");
  const decidedGates = gates.filter((g) => g.status !== "open");

  const [cursor, setCursor] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [contextOpenId, setContextOpenId] = useState<string | null>(null);
  const [motionState, setMotionState] = useState<{
    id: string;
    kind: "shake" | "drop";
  } | null>(null);
  const [openDecidedId, setOpenDecidedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const spawnedFollowupRef = useRef(false);

  const approveBtnRef = useRef<HTMLButtonElement | null>(null);
  const editBtnRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current);
    },
    [],
  );

  const safeIdx = openGates.length > 0 ? Math.min(cursor, openGates.length - 1) : 0;
  const activeGate = openGates[safeIdx] ?? null;
  const backGates = openGates.filter((_, idx) => idx !== safeIdx).slice(0, 2);
  const isEditing = activeGate !== null && editingId === activeGate.id;
  const isContextOpen = activeGate !== null && contextOpenId === activeGate.id;
  const stoppedByReject = decidedGates.some((g) => g.status === "rejected");

  const totalHolds = openGates.reduce((sum, g) => sum + (g.holds?.length ?? 0), 0);
  const stateAttr = stoppedByReject
    ? "stopped"
    : openGates.length > 0
      ? "waiting"
      : live
        ? "running"
        : "done";

  const commitDecision = (gate: ApprovalGate, decision: ApprovalGateDecision, value?: string) => {
    if (motionState) return;

    const finalize = () => {
      const trimmed = value?.trim();
      const nextNote =
        decision === "edited"
          ? gate.kind === "file"
            ? trimmed || "Approved with requested changes"
            : "Edited before approval"
          : decision === "rejected"
            ? "Rejected — stopped downstream steps"
            : undefined;

      if (!controlledGates) {
        setInternalGates((prev) =>
          prev.map((item) =>
            item.id === gate.id
              ? {
                  ...item,
                  status: decision,
                  at: "just now",
                  note: nextNote,
                  input:
                    decision === "edited" && trimmed && item.kind !== "file"
                      ? trimmed
                      : item.input,
                }
              : item,
          ),
        );

        if (live && decision !== "rejected" && !spawnedFollowupRef.current) {
          spawnedFollowupRef.current = true;
          liveTimerRef.current = window.setTimeout(() => {
            setInternalGates((prev) =>
              prev.some((g) => g.id === FOLLOWUP_LIVE_GATE.id)
                ? prev
                : [...prev, FOLLOWUP_LIVE_GATE],
            );
          }, 1200);
        }
      }

      onDecide?.(gate.id, decision, value);
      setMotionState(null);
      setEditingId(null);
      setDraftValue("");

      const remaining = Math.max(0, openGates.length - 1);
      const outcomeWord =
        decision === "approved"
          ? "Approved"
          : decision === "edited"
            ? "Approved with changes"
            : "Rejected";
      setAnnouncement(
        `${outcomeWord}: ${gate.action}. ${remaining} ${remaining === 1 ? "request" : "requests"} left.`,
      );
      setCursor((c) => Math.max(0, Math.min(c, remaining - 1)));
      requestAnimationFrame(() => approveBtnRef.current?.focus());
    };

    if (decision === "rejected") {
      setMotionState({ id: gate.id, kind: "shake" });
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(finalize, 320);
      return;
    }

    setMotionState({ id: gate.id, kind: "drop" });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(finalize, 220);
  };

  const startEdit = (gate: ApprovalGate) => {
    setEditingId(gate.id);
    if (gate.kind === "file") {
      setDraftValue("");
    } else {
      setDraftValue(gate.input ?? "");
    }
  };

  const summaryPillLabel = stoppedByReject
    ? "Stopped"
    : openGates.length > 0
      ? "Waiting on you"
      : live
        ? "Running"
        : "Completed";

  const runSummaryText = stoppedByReject
    ? "Stopped at rejected gate"
    : openGates.length > 0
      ? `Paused – ${totalHolds} ${totalHolds === 1 ? "step waits" : "steps wait"} on ${openGates.length} ${openGates.length === 1 ? "gate" : "gates"}`
      : live
        ? "Running – no gates waiting"
        : "All gates cleared";

  const orderedDecided = [...decidedGates].reverse();

  return (
    <div
      className={cn("af-gatec", className)}
      data-state={stateAttr}
      style={style}
      onKeyDown={(event) => {
        if (!activeGate) return;
        if (isEditing) {
          if (event.key === "Escape") {
            event.preventDefault();
            setEditingId(null);
            requestAnimationFrame(() => editBtnRef.current?.focus());
          } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commitDecision(activeGate, "edited", draftValue);
          }
          return;
        }
        if ((event.target as HTMLElement)?.tagName === "TEXTAREA") return;
        if (event.key === "ArrowLeft" && openGates.length > 1) {
          event.preventDefault();
          setCursor((c) => (c - 1 + openGates.length) % openGates.length);
          requestAnimationFrame(() => approveBtnRef.current?.focus());
        } else if (event.key === "ArrowRight" && openGates.length > 1) {
          event.preventDefault();
          setCursor((c) => (c + 1) % openGates.length);
          requestAnimationFrame(() => approveBtnRef.current?.focus());
        }
      }}
    >
      {/* 1. Summary block */}
      <div className="af-gatec__summary">
        <header className="af-gatec__bar">
          <span className="af-gatec__mark">
            <StackMarkIcon />
          </span>
          <span className="af-gatec__title">{title}</span>
          {task ? (
            <span className="af-gatec__task" dir="auto" title={task}>
              {task}
            </span>
          ) : (
            <span className="af-gatec__task" />
          )}
          <span className="af-gatec__pill" data-state={stateAttr}>
            {(stateAttr === "waiting" || stateAttr === "running") && (
              <span className="af-gatec__pulse" aria-hidden="true" />
            )}
            {summaryPillLabel}
          </span>
        </header>

        <dl className="af-gatec__stats">
          <div className="af-gatec__stat">
            <dt>Waiting on you</dt>
            <dd>{openGates.length}</dd>
          </div>
          <div className="af-gatec__stat">
            <dt>Decided</dt>
            <dd>
              {decidedGates.length}/{gates.length}
            </dd>
          </div>
          <div className="af-gatec__stat" data-wide="">
            <dt>Run</dt>
            <dd>
              <span className="af-gatec__run" dir="auto" title={runSummaryText}>
                {runSummaryText}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* 2. Open stack + holds/pager + decided list */}
      <div className="af-gatec__body">
        {activeGate ? (
          <>
            <div
              className="af-gatec__stack"
              tabIndex={-1}
              role="group"
              aria-roledescription="stack"
              aria-label={`${openGates.length} ${openGates.length === 1 ? "request" : "requests"} waiting – ${safeIdx + 1} of ${openGates.length}`}
              data-count={openGates.length}
            >
              <div className="af-gatec__pile" data-has-back={backGates.length > 0 || undefined}>
                {backGates
                  .slice()
                  .reverse()
                  .map((bg, revIdx) => {
                    const depth = backGates.length - revIdx;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        className="af-gatec__back"
                        tabIndex={-1}
                        aria-label={`Show request: ${bg.action}`}
                        style={{ "--af-gatec-k": depth } as CSSProperties}
                        onClick={() => {
                          const targetIdx = openGates.findIndex((g) => g.id === bg.id);
                          if (targetIdx >= 0) setCursor(targetIdx);
                        }}
                      >
                        <span className="af-gatec__back-text" dir="auto">
                          {bg.action}
                        </span>
                      </button>
                    );
                  })}

                <section
                  key={activeGate.id}
                  className="af-gatec__card"
                  aria-label={`${activeGate.action} – waiting for you`}
                  data-motion={
                    motionState?.id === activeGate.id ? motionState.kind : undefined
                  }
                >
                  <div className="af-gatec__card-top">
                    <span
                      className="af-gatec__avatar"
                      data-logo={Boolean(activeGate.avatar) || undefined}
                    >
                      {activeGate.avatar ?? agentInitials(activeGate.agent)}
                    </span>
                    <span className="af-gatec__card-who" dir="auto">
                      <span className="af-gatec__card-agent">{activeGate.agent}</span>
                      {` · ${KIND_LABEL[activeGate.kind]}`}
                      {activeGate.at ? ` · ${activeGate.at}` : ""}
                    </span>
                    <span className="af-gatec__badge" data-status="open">
                      <LockIcon />
                      Blocking
                    </span>
                  </div>

                  <div className="af-gatec__card-body">
                    <h3 className="af-gatec__card-action" dir="auto">
                      {activeGate.action}
                    </h3>
                    <p className="af-gatec__card-why" dir="auto">
                      {activeGate.reason}
                    </p>

                    {isEditing ? (
                      <div className="af-gatec__section">
                        <label
                          className="af-gatec__label"
                          htmlFor={`af-gatec-edit-${activeGate.id}`}
                        >
                          {activeGate.kind === "file"
                            ? "What should change?"
                            : SECTION_LABEL[activeGate.kind]}
                        </label>
                        <textarea
                          id={`af-gatec-edit-${activeGate.id}`}
                          className="af-gatec__editor"
                          data-mono={activeGate.kind === "tool" || undefined}
                          value={draftValue}
                          autoFocus
                          rows={activeGate.kind === "file" ? 3 : 4}
                          placeholder={
                            activeGate.kind === "file"
                              ? "Describe what to adjust before applying…"
                              : undefined
                          }
                          onChange={(e) => setDraftValue(e.target.value)}
                        />
                      </div>
                    ) : activeGate.diff?.length ? (
                      <div className="af-gatec__section">
                        <span className="af-gatec__label">Changes</span>
                        <div className="af-gatec__diff" tabIndex={0} aria-label="Changes">
                          {activeGate.diff.map((file) => (
                            <div key={file.file} className="af-gatec__file">
                              <span
                                className="af-gatec__file-name"
                                dir="auto"
                                title={file.file}
                              >
                                {file.file}
                              </span>
                              <pre>
                                {file.lines.map((line, lineIdx) => (
                                  <span
                                    key={`${file.file}-${lineIdx}`}
                                    className="af-gatec__dl"
                                    data-type={line.type}
                                  >
                                    <span className="af-gatec__dl-sign" aria-hidden="true">
                                      {line.type === "add"
                                        ? "+"
                                        : line.type === "del"
                                          ? "−"
                                          : " "}
                                    </span>
                                    {line.type !== "ctx" ? (
                                      <span className="af-gatec__sr">
                                        {line.type === "add" ? "Added: " : "Removed: "}
                                      </span>
                                    ) : null}
                                    {line.text}
                                  </span>
                                ))}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : activeGate.input ? (
                      <div className="af-gatec__section">
                        <span className="af-gatec__label">
                          {SECTION_LABEL[activeGate.kind]}
                        </span>
                        <pre
                          className="af-gatec__data"
                          data-mono={activeGate.kind === "tool" || undefined}
                          dir="auto"
                          tabIndex={0}
                        >
                          {activeGate.input}
                        </pre>
                      </div>
                    ) : null}

                    {(activeGate.context?.length || activeGate.files?.length) ? (
                      <div className="af-gatec__extra">
                        <button
                          type="button"
                          className="af-gatec__more"
                          aria-expanded={isContextOpen}
                          onClick={() =>
                            setContextOpenId((cur) =>
                              cur === activeGate.id ? null : activeGate.id,
                            )
                          }
                        >
                          {isContextOpen ? "Less context" : "Full context"}
                          <span
                            className="af-gatec__more-chev"
                            data-open={isContextOpen || undefined}
                          >
                            <ChevronDownIcon />
                          </span>
                        </button>

                        {isContextOpen ? (
                          <div className="af-gatec__fold" data-open="">
                            <div className="af-gatec__fold-in">
                              {activeGate.context?.length ? (
                                <div className="af-gatec__section">
                                  <span className="af-gatec__label">Before this</span>
                                  <ol
                                    className="af-gatec__context"
                                    tabIndex={0}
                                    aria-label="Steps before this"
                                  >
                                    {activeGate.context.map((step, i) => (
                                      <li key={i} dir="auto">
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              ) : null}
                              {activeGate.files?.length ? (
                                <div className="af-gatec__section">
                                  <span className="af-gatec__label">Touches</span>
                                  <ul className="af-gatec__files">
                                    {activeGate.files.map((f) => (
                                      <li key={f} dir="auto" title={f}>
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="af-gatec__actions">
                    {isEditing ? (
                      <>
                        <span className="af-gatec__spacer" />
                        <button
                          type="button"
                          className="af-gatec__btn"
                          onClick={() => {
                            setEditingId(null);
                            requestAnimationFrame(() => editBtnRef.current?.focus());
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="af-gatec__btn"
                          data-primary=""
                          onClick={() => commitDecision(activeGate, "edited", draftValue)}
                        >
                          Approve with changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          ref={editBtnRef}
                          type="button"
                          className="af-gatec__btn"
                          data-quiet=""
                          data-edit=""
                          onClick={() => startEdit(activeGate)}
                        >
                          <PencilIcon />
                          {activeGate.kind === "file" ? "Ask for changes" : "Edit"}
                        </button>
                        <span className="af-gatec__spacer" />
                        <button
                          type="button"
                          className="af-gatec__btn"
                          onClick={() => commitDecision(activeGate, "rejected")}
                        >
                          Reject
                        </button>
                        <button
                          ref={approveBtnRef}
                          type="button"
                          className="af-gatec__btn"
                          data-primary=""
                          data-approve=""
                          onClick={() => commitDecision(activeGate, "approved")}
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="af-gatec__after">
              {activeGate.holds?.length ? (
                <p
                  className="af-gatec__holds"
                  title={activeGate.holds.join(", ")}
                >
                  <LockIcon />
                  <span>
                    Holds {activeGate.holds.length}{" "}
                    {activeGate.holds.length === 1 ? "step" : "steps"}:{" "}
                    <span className="af-gatec__held">
                      {activeGate.holds.join(", ")}
                    </span>
                  </span>
                </p>
              ) : (
                <span />
              )}

              {openGates.length > 1 ? (
                <div className="af-gatec__pager">
                  <button
                    type="button"
                    className="af-gatec__page"
                    aria-label="Previous request"
                    onClick={() =>
                      setCursor((c) => (c - 1 + openGates.length) % openGates.length)
                    }
                  >
                    <ChevronDownIcon style={{ transform: "rotate(90deg)" }} />
                  </button>
                  <span className="af-gatec__page-n" aria-hidden="true">
                    {safeIdx + 1} of {openGates.length}
                  </span>
                  <button
                    type="button"
                    className="af-gatec__page"
                    aria-label="Next request"
                    onClick={() => setCursor((c) => (c + 1) % openGates.length)}
                  >
                    <ChevronDownIcon style={{ transform: "rotate(-90deg)" }} />
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="af-gatec__calm">
            {stoppedByReject
              ? "Run stopped — rejected gate recorded below."
              : live
                ? "Running — new approval requests will appear here."
                : "Every approval gate has been decided."}
          </div>
        )}

        {/* 3. Decided list */}
        {orderedDecided.length > 0 ? (
          <div className="af-gatec__done">
            <span className="af-gatec__label">Decided</span>
            <ol className="af-gatec__rows">
              {orderedDecided.map((gate) => {
                const isOpen = openDecidedId === gate.id;
                const outcomeText =
                  gate.status === "approved"
                    ? "Approved"
                    : gate.status === "edited"
                      ? "Edited"
                      : "Stopped the run";
                return (
                  <li
                    key={gate.id}
                    className="af-gatec__row"
                    data-status={gate.status}
                  >
                    <button
                      type="button"
                      className="af-gatec__row-head"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenDecidedId((cur) => (cur === gate.id ? null : gate.id))
                      }
                    >
                      <span
                        className="af-gatec__row-mark"
                        data-status={gate.status}
                        aria-hidden="true"
                      >
                        {gate.status === "rejected" ? (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M6 6L18 18M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 14.5C5 14.5 6.5 14.5 8.5 18C8.5 18 14.06 8.83 19 7"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className="af-gatec__row-action"
                        dir="auto"
                        title={gate.action}
                      >
                        {gate.action}
                      </span>
                      <span className="af-gatec__row-who" dir="auto">
                        {gate.agent}
                      </span>
                      <span
                        className="af-gatec__row-outcome"
                        data-status={gate.status}
                      >
                        {outcomeText}
                        {gate.at ? (
                          <span className="af-gatec__row-at">{` · ${gate.at}`}</span>
                        ) : null}
                      </span>
                      <span
                        className="af-gatec__row-chev"
                        data-open={isOpen || undefined}
                      >
                        <ChevronDownIcon />
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="af-gatec__fold" data-open="">
                        <div className="af-gatec__fold-in af-gatec__row-body">
                          <p className="af-gatec__card-why" dir="auto">
                            {gate.reason}
                          </p>
                          {gate.note ? (
                            <p className="af-gatec__row-note" dir="auto">
                              {gate.note}
                            </p>
                          ) : null}
                          {gate.diff?.length ? (
                            <div className="af-gatec__section">
                              <span className="af-gatec__label">Changes</span>
                              <div className="af-gatec__diff" tabIndex={0}>
                                {gate.diff.map((file) => (
                                  <div key={file.file} className="af-gatec__file">
                                    <span className="af-gatec__file-name" dir="auto">
                                      {file.file}
                                    </span>
                                    <pre>
                                      {file.lines.map((l, idx) => (
                                        <span
                                          key={idx}
                                          className="af-gatec__dl"
                                          data-type={l.type}
                                        >
                                          <span className="af-gatec__dl-sign" aria-hidden="true">
                                            {l.type === "add"
                                              ? "+"
                                              : l.type === "del"
                                                ? "−"
                                                : " "}
                                          </span>
                                          {l.text}
                                        </span>
                                      ))}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : gate.input ? (
                            <div className="af-gatec__section">
                              <span className="af-gatec__label">
                                {SECTION_LABEL[gate.kind]}
                              </span>
                              <pre
                                className="af-gatec__data"
                                data-mono={gate.kind === "tool" || undefined}
                                dir="auto"
                                tabIndex={0}
                              >
                                {gate.input}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>

      <span className="af-gatec__sr" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

export const AfApprovalGatesPattern = AfApprovalGates;
export const ApprovalGates = AfApprovalGates;
