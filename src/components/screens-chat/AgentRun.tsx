import { useEffect, useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfInlineDiff, type DiffToken } from "../agents/InlineDiffPattern";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  artifactKindIcon,
  type AfChatScreenUser,
  type AfShellArtifact,
  type AfWorkAreaTabItem,
} from "./ChatShell";

export type AfAgentRunToolCall = {
  name: string;
  summary: string;
  icon?: AffectIconKey;
  args?: Record<string, unknown>;
  result?: string;
  duration: string;
};

export type AfAgentRunApproval = {
  title: string;
  description: string;
  risk?: "low" | "medium" | "high";
  details?: { label: string; value: string }[];
};

export type AfAgentRunPlanStep = {
  id: string;
  title: string;
  detail: string;
  tool?: string;
  toolCalls?: AfAgentRunToolCall[];
  approval?: AfAgentRunApproval;
};

export type AfAgentRunDraft = {
  original: string;
  suggested: string;
  label?: string;
};

export type AfAgentRunProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** Goal of the run, in the header and above the plan. */
  title?: string;
  /** Steps with tool calls and optional approval gate. */
  steps?: AfAgentRunPlanStep[];
  /** Text the agent wrote, shown as an inline diff in the work area. */
  draft?: AfAgentRunDraft;
  /** Files the run wrote and pulled, listed under Files on the right and openable in tabs. */
  files?: Record<string, AfShellArtifact>;
  /** Name of the agent in the run details, defaults to `"Board prep"`. */
  agent?: string;
  /** Plays the built-in simulation on mount, defaults to `true`. */
  autoRun?: boolean;
  /** An approval was given; the run carries on. */
  onApprove?: (stepId: string) => void;
  /** An approval was denied; the run stops at that step. */
  onDeny?: (stepId: string) => void;
  /** Stop run pressed. */
  onStop?: () => void;
  /** Every step is done. */
  onDone?: () => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar, defaults to `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton placeholders while the run loads from history; simulation and clock wait. */
  loading?: boolean;
  /** Empty state when no run exists yet; `loading` wins when both are on. */
  empty?: boolean;
};

export const DEFAULT_RUN_STEPS: AfAgentRunPlanStep[] = [
  {
    id: "step-revenue",
    title: "Pull Q3 revenue and churn",
    detail: "From Stripe, July to September",
    tool: "stripe.query",
    toolCalls: [
      {
        name: "stripe.query",
        summary: "Revenue by month, Q3",
        icon: "wallet",
        args: { quarter: "2026-Q3", metric: "revenue_by_month" },
        result: "Q3 revenue $4.3M (+21% QoQ)",
        duration: "0.3s",
      },
      {
        name: "stripe.query",
        summary: "Net logo & revenue churn, Q3",
        icon: "chart",
        args: { quarter: "2026-Q3", metric: "cohort_churn" },
        result: "Enterprise net churn fell from 2.1% to 1.8%",
        duration: "0.4s",
      },
    ],
  },
  {
    id: "step-deck",
    title: "Read last quarter's board memo",
    detail: "Keeps the structure the board knows",
    tool: "search",
    toolCalls: [
      {
        name: "drive.search",
        summary: "Locate Q2 board memo & deck",
        icon: "search",
        args: { query: "Board memo Q2" },
        result: "Matched Q2_Board_Memo.md",
        duration: "0.5s",
      },
      {
        name: "docs.read",
        summary: "Extract section outline and targets",
        icon: "file",
        args: { fileId: "q2-board-memo" },
        result: "Extracted 4 sections and Q3 guidance baseline",
        duration: "0.4s",
      },
    ],
  },
  {
    id: "step-memo",
    title: "Update the memo draft",
    detail: "Revenue, churn and the Q4 outlook",
    tool: "docs.write",
    toolCalls: [
      {
        name: "docs.write",
        summary: "Updated Board memo – Q3 · Revenue",
        icon: "pencil",
        args: { file: "board-memo-q3.md" },
        result: "9 inline edits staged for review",
        duration: "0.8s",
      },
      {
        name: "charts.export",
        summary: "Rendered churn-chart.png (1600×960)",
        icon: "image",
        args: { source: "q3-revenue.csv" },
        result: "Saved churn-chart.png",
        duration: "0.6s",
      },
    ],
  },
  {
    id: "step-approval",
    title: "Send the draft to Maya",
    detail: "Needs your approval first",
    tool: "gmail.send",
    toolCalls: [
      {
        name: "gmail.send",
        summary: "Prepared review draft for Maya",
        icon: "mail",
        args: { to: "maya@acme.com", subject: "Q3 board memo draft" },
        result: "Waiting on your approval",
        duration: "0.3s",
      },
    ],
    approval: {
      title: "Send Q3 board memo draft to Maya",
      description: "Emails board-memo-q3.md and churn-chart.png to Maya Lin before Monday's prep review.",
      risk: "medium",
      details: [
        { label: "To", value: "maya@acme.com" },
        { label: "Attachments", value: "board-memo-q3.md, churn-chart.png" },
      ],
    },
  },
  {
    id: "step-book",
    title: "Book a review with Maya",
    detail: "30 minutes before the board meeting",
    tool: "calendar.create",
    toolCalls: [
      {
        name: "calendar.create",
        summary: "Hold 30 min on Monday 9:30 AM",
        icon: "calendar",
        args: { durationMin: 30, attendee: "maya@acme.com" },
        result: "Invite queued after draft approval",
        duration: "0.4s",
      },
    ],
  },
];

export const DEFAULT_RUN_DRAFT: AfAgentRunDraft = {
  label: "Board memo – Q3 · Revenue",
  original:
    "Revenue grew 18% in Q3 to $4.2M, mostly driven by new enterprise customers. Churn stayed flat at 2.1 %, and we expect the pipeline to carry into Q4 without changes to the plan.",
  suggested:
    "Revenue grew 21% in Q3 to $4.3M, driven by six new enterprise customers. Churn fell to 1.8 %, and the pipeline supports raising the Q4 target by 5%.",
};

const DEFAULT_RUN_DIFF_TOKENS: DiffToken[] = [
  { kind: "text", text: "Revenue grew " },
  { kind: "change", id: 1, del: "18", ins: "21" },
  { kind: "text", text: "% in Q3 to $4." },
  { kind: "change", id: 2, del: "2", ins: "3" },
  { kind: "text", text: "M, " },
  { kind: "change", id: 3, del: "mostly ", ins: "" },
  { kind: "text", text: "driven by " },
  { kind: "change", id: 4, del: "", ins: "six " },
  { kind: "text", text: "new enterprise customers. Churn " },
  { kind: "change", id: 5, del: "stayed flat at ", ins: "fell to " },
  { kind: "change", id: 6, del: "2.1", ins: "1.8" },
  { kind: "text", text: " %, and " },
  { kind: "change", id: 7, del: "we expect ", ins: "" },
  { kind: "text", text: "the pipeline " },
  { kind: "change", id: 8, del: "to carry into ", ins: "supports raising the " },
  { kind: "text", text: "Q4 " },
  { kind: "change", id: 9, del: "without changes to the plan", ins: "target by 5%" },
  { kind: "text", text: "." },
];

export const DEFAULT_RUN_FILES: Record<string, AfShellArtifact> = {
  "board-memo-q3.md": {
    id: "board-memo-q3.md",
    title: "board-memo-q3.md",
    kind: "document",
    subtitle: "Document · Executive summary",
    updated: "Updated 1m ago",
    doc: `# Q3 Board Update — Executive Summary\n\nRevenue grew 21% in Q3 to $4.3M, driven by six new enterprise customers.\n\n- Churn fell from 2.1% to 1.8%\n- Pipeline supports raising the Q4 target by 5%`,
  },
  "q3-revenue.csv": {
    id: "q3-revenue.csv",
    title: "q3-revenue.csv",
    kind: "sheet",
    subtitle: "Sheet · Revenue & churn breakdown",
    headers: ["Segment", "Q2 Actual", "Q3 Target", "Q3 Actual"],
    rows: [
      { cells: ["Enterprise", "$2,540,000", "$2,900,000", "$3,120,000"] },
      { cells: ["Mid-market", "$780,000", "$840,000", "$890,000"] },
      { cells: ["Self-serve", "$230,000", "$280,000", "$290,000"] },
      { cells: ["Total", "$3,550,000", "$4,020,000", "$4,300,000"], formula: "=SUM(D2:D4)", total: true },
    ],
  },
  "churn-chart.png": {
    id: "churn-chart.png",
    title: "churn-chart.png",
    kind: "image",
    subtitle: "Chart · Enterprise cohort retention",
    imageCaption: "Enterprise net churn fell from 2.1% in Q2 to 1.8% across Q3 cohorts.",
  },
};

function RunUsesLogos() {
  return (
    <div className="af-sc-run-uses__icons" aria-label="Stripe, Google Drive, Google Docs, Gmail, Google Calendar">
      <span className="af-sc-app-tile" title="Stripe">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M7.3 5.2c0-.7.6-1 1.5-1 1.3 0 2.9.4 4.2 1.1V1.9C11.6 1.3 10.2 1 8.8 1 5.3 1 3 2.8 3 5.7c0 4.5 6.2 3.8 6.2 5.8 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.5c1.6.7 3.3 1 4.9 1 3.6 0 6.1-1.8 6.1-4.8-.1-4.9-6.3-4-6.3-5.7Z"
            fill="#635BFF"
          />
        </svg>
      </span>
      <span className="af-sc-app-tile" title="Google Drive">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M5.4 2h5.2l4.4 7.6H9.8L5.4 2Z" fill="#FBBC04" />
          <path d="M1 9.6 5.4 2 8 6.5 3.6 14 1 9.6Z" fill="#0F9D58" />
          <path d="M3.6 14h8.8L15 9.6H6.2L3.6 14Z" fill="#4285F4" />
        </svg>
      </span>
      <span className="af-sc-app-tile" title="Google Docs">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3" y="1.5" width="10" height="13" rx="1.8" fill="#4285F4" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3.2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="af-sc-app-tile" title="Gmail">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4.2V12a1 1 0 0 0 1 1h1.5V6.8L8 9.4l3.5-2.6V13H13a1 1 0 0 0 1-1V4.2L8 8.6 2 4.2Z" fill="#EA4335" />
          <path d="M2 4.2a1 1 0 0 1 1.6-.8L8 6.7l4.4-3.3A1 1 0 0 1 14 4.2v1.3L8 10 2 5.5V4.2Z" fill="#FBBC04" />
          <path d="M2 5.5 4.5 7.3V13H3a1 1 0 0 1-1-1V5.5Z" fill="#4285F4" />
          <path d="M14 5.5 11.5 7.3V13H13a1 1 0 0 0 1-1V5.5Z" fill="#34A853" />
        </svg>
      </span>
      <span className="af-sc-app-tile" title="Google Calendar">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2.5" width="12" height="11.5" rx="2" fill="#4285F4" />
          <rect x="4" y="5.5" width="8" height="6.5" rx="1" fill="#fff" />
          <text x="8" y="10.6" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#4285F4">
            31
          </text>
        </svg>
      </span>
    </div>
  );
}

/** AI Chat / Run (`agent-run`): One autonomous agent run — live plan, tool calls, approval gate, inline diff draft, and files. */
export function AfAgentRun(props: AfAgentRunProps = {}) {
  const {
    title = "Prepare the Q3 board update",
    steps = DEFAULT_RUN_STEPS,
    draft = DEFAULT_RUN_DRAFT,
    files = DEFAULT_RUN_FILES,
    agent = "Board prep",
    autoRun = true,
    onApprove,
    onDeny,
    onStop,
    onDone,
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const isEmpty = !loading && empty;
  const firstApprovalIdx = useMemo(() => steps.findIndex((s) => Boolean(s.approval)), [steps]);

  const [currentIdx, setCurrentIdx] = useState<number>(() =>
    autoRun ? 0 : firstApprovalIdx >= 0 ? firstApprovalIdx : Math.min(1, Math.max(0, steps.length - 1)),
  );
  const [runState, setRunState] = useState<"running" | "waiting" | "done" | "stopped">(() =>
    autoRun ? "running" : firstApprovalIdx >= 0 ? "waiting" : "running",
  );
  const [elapsedSec, setElapsedSec] = useState(() => (autoRun ? 0 : 42));
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [openCallKey, setOpenCallKey] = useState<string | null>(null);

  const [workOpen, setWorkOpen] = useState(true);
  const [extraTabs, setExtraTabs] = useState<AfWorkAreaTabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState("tab-needs");

  // Live clock while actively running (waits during loading or empty)
  useEffect(() => {
    if (loading || isEmpty || !autoRun || runState !== "running") return;
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [autoRun, isEmpty, loading, runState]);

  // Advance remaining steps after approval when autoRun is enabled
  useEffect(() => {
    if (loading || isEmpty || !autoRun || runState !== "running") return;
    const step = steps[currentIdx];
    if (!step) {
      setRunState("done");
      onDone?.();
      return;
    }
    if (step.approval) {
      setRunState("waiting");
      return;
    }
    const timer = window.setTimeout(() => {
      if (currentIdx + 1 < steps.length) {
        setCurrentIdx((i) => i + 1);
      } else {
        setRunState("done");
        onDone?.();
      }
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [autoRun, currentIdx, isEmpty, loading, onDone, runState, steps]);

  const pendingApprovalStep = runState === "waiting" ? steps[currentIdx] : undefined;

  const handleApproveGate = () => {
    if (!pendingApprovalStep) return;
    onApprove?.(pendingApprovalStep.id);
    if (currentIdx + 1 < steps.length) {
      setCurrentIdx(currentIdx + 1);
      setRunState("running");
    } else {
      setRunState("done");
      onDone?.();
    }
  };

  const handleDenyGate = () => {
    if (!pendingApprovalStep) return;
    onDeny?.(pendingApprovalStep.id);
    setRunState("stopped");
  };

  const handleStopRun = () => {
    setRunState("stopped");
    onStop?.();
  };

  // Keyboard ⌘+Enter to approve / Esc to deny when waiting on approval
  useEffect(() => {
    if (loading || isEmpty || !pendingApprovalStep) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleApproveGate();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleDenyGate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isEmpty, pendingApprovalStep, currentIdx]);

  const openRunFile = (key: string) => {
    const art = files[key];
    if (!art) return;
    const id = art.id ?? key;
    setWorkOpen(true);
    setExtraTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, { id, title: art.title ?? key, kind: art.kind, closable: true, artifact: art }];
    });
    setActiveTabId(id);
  };

  const doneCount = runState === "done" ? steps.length : currentIdx;
  const totalToolCalls = useMemo(
    () => steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0),
    [steps],
  );
  const mins = Math.floor(elapsedSec / 60);
  const secs = String(elapsedSec % 60).padStart(2, "0");

  const needsCount = !loading && !isEmpty && pendingApprovalStep ? 1 : 0;

  const renderNeedsInputTab = () => {
    if (loading) {
      return (
        <div className="af-sc-runside" aria-label="Loading run panel">
          <AfSkeleton width="100%" height={108} radius={10} />
          <AfSkeleton width={72} height={11} />
          <AfSkeleton width="100%" height={124} radius={10} />
          <AfSkeleton width={56} height={11} />
          <AfSkeleton lines={3} height={14} />
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div className="af-sc-runside">
          <div className="af-sc-runside__calm">
            <span className="af-sc-runside__calm-icon" aria-hidden="true">
              <AfIcon name="bell" size={16} />
            </span>
            <strong>Nothing needs you yet</strong>
            <p>The agent asks here before it sends or books anything.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="af-sc-runside">
        {pendingApprovalStep?.approval ? (
          <div className="af-sc-approval-box" role="region" aria-label={pendingApprovalStep.approval.title}>
            <div className="af-sc-approval-box__top">
              <span className="af-sc-risk-pill" data-risk={pendingApprovalStep.approval.risk ?? "medium"}>
                Needs approval
              </span>
              <span className="af-sc-kbd">⌘↵</span>
            </div>
            <strong>{pendingApprovalStep.approval.title}</strong>
            <p>{pendingApprovalStep.approval.description}</p>
            {pendingApprovalStep.approval.details ? (
              <dl className="af-sc-approval-dl">
                {pendingApprovalStep.approval.details.map((d) => (
                  <div key={d.label} className="af-sc-approval-dl__row">
                    <dt>{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="af-sc-approval-box__actions">
              <AfButton variant="ghost" size="sm" onClick={handleDenyGate}>
                Deny
              </AfButton>
              <AfButton variant="primary" size="sm" onClick={handleApproveGate}>
                Approve & continue
              </AfButton>
            </div>
          </div>
        ) : (
          <div className="af-sc-runside__calm">
            <span className="af-sc-runside__calm-icon" aria-hidden="true">
              <AfIcon name="bell" size={16} />
            </span>
            <strong>Nothing needs you yet</strong>
            <p>
              {runState === "done"
                ? "All steps completed and approved."
                : runState === "stopped"
                  ? "Run stopped at your request."
                  : "The agent asks here before it sends or books anything."}
            </p>
          </div>
        )}

        <div className="af-sc-runside__sec">
          <span className="af-sc-sec-label">Draft</span>
          <AfInlineDiff
            title={draft.label ?? "Board memo – Q3 · Revenue"}
            tokens={
              draft.original === DEFAULT_RUN_DRAFT.original && draft.suggested === DEFAULT_RUN_DRAFT.suggested
                ? DEFAULT_RUN_DIFF_TOKENS
                : undefined
            }
            oldText={draft.original}
            newText={draft.suggested}
          />
        </div>

        <div className="af-sc-runside__sec">
          <span className="af-sc-sec-label">Files</span>
          <div className="af-sc-brief__files">
            {Object.entries(files).map(([key, art]) => (
              <button
                key={key}
                type="button"
                className="af-sc-file-chip"
                onClick={() => openRunFile(key)}
              >
                <AfIcon name={artifactKindIcon(art.kind)} size={13} />
                <span>{art.title ?? key}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const workTabs = useMemo<AfWorkAreaTabItem[]>(
    () => [
      {
        id: "tab-needs",
        title: "Needs your input",
        kind: "custom",
        badge: needsCount,
        closable: true,
        content: renderNeedsInputTab(),
      },
      ...extraTabs,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, isEmpty, pendingApprovalStep, runState, draft, files, extraTabs, needsCount],
  );

  const navItems = useMemo(
    () => [
      { label: "Home", icon: "home" as AffectIconKey },
      { label: "Chat", icon: "message" as AffectIconKey },
      { label: "Runs", icon: "play" as AffectIconKey, count: isEmpty ? 0 : 3 },
      { label: "Analytics", icon: "chart" as AffectIconKey },
      { label: "Deliverables", icon: "folder" as AffectIconKey },
    ],
    [isEmpty],
  );

  const sidebarGroups = useMemo(
    () => [
      {
        label: "Agents",
        items: [
          { label: "Board prep", icon: "kanban" as AffectIconKey },
          { label: "Revenue ops", icon: "wallet" as AffectIconKey },
          { label: "Inbox triage", icon: "mail" as AffectIconKey },
          { label: "Workflows", icon: "workflow" as AffectIconKey },
        ],
      },
    ],
    [],
  );

  return (
    <ChatInsetShell
      workspace={workspace}
      user={user}
      activeNav="Runs"
      navItems={navItems}
      sidebarGroups={sidebarGroups}
      hideThreads
      showSidebarCards={!isEmpty}
      onNavigate={onNavigate}
      mainHeader={{
        title: loading ? (
          <AfSkeleton width={210} height={14} />
        ) : (
          <span className="af-sc-crumb">
            <AfIcon name="play" size={13} />
            <span>Runs</span>
            <span aria-hidden="true">/</span>
            <strong>{isEmpty ? "New run" : title}</strong>
            {!isEmpty ? (
              <span className="af-sc-run-badge" data-state={runState} role="status">
                <span className="af-sc-run-badge__dot" aria-hidden="true" />
                {runState === "waiting"
                  ? "Waiting on you"
                  : runState === "done"
                    ? "Completed"
                    : runState === "stopped"
                      ? "Stopped"
                      : "Running"}
              </span>
            ) : null}
          </span>
        ),
        actions:
          !loading && !isEmpty ? (
            <div className="af-sc-run-head-acts">
              {runState === "running" || runState === "waiting" ? (
                <button type="button" className="af-sc-stop-run-btn" onClick={handleStopRun}>
                  <AfIcon name="stop" size={12} />
                  <span>Stop run</span>
                </button>
              ) : null}
              <button type="button" className="af-sc-icon-btn" aria-label="More run options">
                <AfIcon name="more" size={14} />
              </button>
            </div>
          ) : null,
      }}
      workAreaOpen={workOpen}
      onWorkAreaOpenChange={setWorkOpen}
      workAreaOpenLabel="Open run details"
      data-run-shell=""
      tabs={workTabs}
      activeTabId={activeTabId}
      onTabsChange={(next) => setExtraTabs(next.filter((t) => t.id !== "tab-needs"))}
      onActiveTabChange={setActiveTabId}
      suggestedArtifacts={files}
      className={className}
      {...rest}
    >
      <div className="af-sc-run-scroll">
        {loading ? (
          <div className="af-sc-run-col" aria-label="Loading run">
            <AfSkeleton width={260} height={22} />
            <div className="af-sc-run-metrics">
              <AfSkeleton width={96} height={38} radius={8} />
              <AfSkeleton width={96} height={38} radius={8} />
              <AfSkeleton width={96} height={38} radius={8} />
              <AfSkeleton width={96} height={38} radius={8} />
            </div>
            <AfSkeleton width="100%" height={180} radius={12} />
            <AfSkeleton width="100%" height={120} radius={12} />
          </div>
        ) : isEmpty ? (
          <div className="af-sc-thread-empty">
            <AfEmptyState
              bare
              icon="play"
              title="No runs yet"
              text="Autonomous background runs show their step-by-step plan, tool calls, approvals and drafted files here."
              action={
                <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("Chat")}>
                  New run
                </AfButton>
              }
            />
          </div>
        ) : (
          <div className="af-sc-run-col">
            <div className="af-sc-run-hero">
              <span className="af-sc-run-agent">
                <AfIcon name="bot" size={13} />
                <strong>{agent}</strong>
                <span>· started by {user.name} at 12:08 AM</span>
              </span>
              <h2 className="af-sc-run-title">{title}</h2>
            </div>

            <div className="af-sc-run-uses">
              <span>Uses</span>
              <RunUsesLogos />
            </div>

            <div className="af-sc-run-metrics">
              <div className="af-sc-run-metric">
                <span>Steps</span>
                <strong>
                  {doneCount} / {steps.length}
                </strong>
              </div>
              <div className="af-sc-run-metric">
                <span>Tool calls</span>
                <strong>{totalToolCalls}</strong>
              </div>
              <div className="af-sc-run-metric">
                <span>Time</span>
                <strong>
                  {mins}:{secs}
                </strong>
              </div>
              <div className="af-sc-run-metric">
                <span>Cost</span>
                <strong>$0.14</strong>
              </div>
            </div>

            <section className="af-sc-card-sec" aria-label="Run plan">
              <div className="af-sc-card-sec__head">
                <span className="af-sc-card-sec__title">
                  <AfIcon name="list" size={13} />
                  <strong>Plan</strong>
                </span>
                <span aria-live="polite">{steps.length} steps</span>
              </div>
              <ol className="af-sc-plan-list">
                {steps.map((st, idx) => {
                  const state: "done" | "current" | "waiting" | "pending" | "stopped" =
                    runState === "done" || idx < currentIdx
                      ? "done"
                      : idx === currentIdx
                        ? runState === "waiting"
                          ? "waiting"
                          : runState === "stopped"
                            ? "stopped"
                            : "current"
                        : "pending";
                  const open = expandedStepId === st.id;
                  return (
                    <li
                      key={st.id}
                      className="af-sc-plan-item"
                      data-state={state}
                      aria-current={idx === currentIdx && runState !== "done" ? "step" : undefined}
                    >
                      <button
                        type="button"
                        className="af-sc-plan-item__btn"
                        aria-expanded={open}
                        onClick={() => setExpandedStepId(open ? null : st.id)}
                      >
                        <span className="af-sc-plan-mark" data-state={state} aria-hidden="true">
                          {state === "done" ? (
                            <AfIcon name="check" size={11} />
                          ) : state === "current" ? (
                            <AfIcon name="loader" size={12} />
                          ) : (
                            idx + 1
                          )}
                        </span>
                        <span className="af-sc-plan-item__main">
                          <strong>{st.title}</strong>
                          <small>
                            {st.detail}
                            {st.tool ? <code className="af-sc-plan-tool">{st.tool}</code> : null}
                          </small>
                        </span>
                        <span className="af-sc-plan-item__status">
                          {state === "done"
                            ? st.toolCalls?.[0]?.duration ?? "Done"
                            : state === "waiting"
                              ? "Waiting on approval"
                              : state === "stopped"
                                ? "Stopped"
                                : state === "current"
                                  ? st.toolCalls?.[0]?.duration ?? "0.3s"
                                  : ""}
                        </span>
                      </button>

                      {open ? (
                        <div className="af-sc-plan-item__detail">
                          {st.toolCalls && st.toolCalls.length > 0 ? (
                            <div className="af-sc-plan-calls">
                              {st.toolCalls.map((call, cIdx) => {
                                const ck = `${st.id}:${call.name}:${cIdx}`;
                                const callOpen = openCallKey === ck;
                                return (
                                  <div key={ck} className="af-sc-tc">
                                    <button
                                      type="button"
                                      className="af-sc-tc__btn"
                                      aria-expanded={callOpen}
                                      onClick={() => setOpenCallKey(callOpen ? null : ck)}
                                    >
                                      <AfIcon name={call.icon ?? "terminal"} size={12} />
                                      <code className="af-sc-tc__title af-sc-tc__mono">{call.name}</code>
                                      <span className="af-sc-tc__app">{call.summary}</span>
                                      <span className="af-sc-tc__status" data-status="done">
                                        {call.duration}
                                      </span>
                                    </button>
                                    {callOpen ? (
                                      <div className="af-sc-tc__body">
                                        {call.args ? (
                                          <div className="af-sc-tc__kv">
                                            <span>Args</span>
                                            <pre className="af-sc-tc__pre">
                                              <code>{JSON.stringify(call.args)}</code>
                                            </pre>
                                          </div>
                                        ) : null}
                                        {call.result ? (
                                          <div className="af-sc-tc__kv">
                                            <span>Result</span>
                                            <pre className="af-sc-tc__pre">
                                              <code>{call.result}</code>
                                            </pre>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              <div className="af-sc-plan-foot">
                <span className="af-sc-plan-foot__left">
                  <AfIcon name={runState === "done" ? "check" : "loader"} size={12} />
                  <span>
                    {runState === "done"
                      ? `Completed · ${steps.length} of ${steps.length}`
                      : runState === "waiting"
                        ? `Waiting on approval · ${currentIdx + 1} of ${steps.length}`
                        : runState === "stopped"
                          ? `Stopped · ${currentIdx + 1} of ${steps.length}`
                          : `Running · ${currentIdx + 1} of ${steps.length}`}
                  </span>
                </span>
                <span>{Math.max(1, elapsedSec)}s</span>
              </div>
            </section>

            <section className="af-sc-card-sec" aria-label="Activity">
              <div className="af-sc-card-sec__head">
                <span className="af-sc-card-sec__title">
                  <AfIcon name="chart" size={13} />
                  <strong>Activity</strong>
                </span>
                <span>
                  {Math.min(steps.length, currentIdx + 1)} of {steps.length}
                </span>
              </div>
              <div className="af-sc-act-feed">
                {steps.slice(0, Math.min(steps.length, currentIdx + 1)).map((st, sIdx) => (
                  <div key={st.id} className="af-sc-act-step">
                    <div className="af-sc-act-step__head">
                      <span className="af-sc-act-step__num">{sIdx + 1}</span>
                      <strong>{st.title}</strong>
                    </div>
                    {(st.toolCalls ?? []).slice(0, 1).map((tc, tIdx) => (
                      <div key={`${st.id}-${tc.name}-${tIdx}`} className="af-sc-act-card">
                        <AfIcon name={tc.icon ?? "terminal"} size={13} />
                        <code className="af-sc-act-tool">{tc.name}</code>
                        <span>{tc.summary}</span>
                        <AfIcon name="chevronDown" size={12} />
                      </div>
                    ))}
                    {sIdx === currentIdx && runState === "running" ? (
                      <span className="af-sc-act-running-chip">
                        <AfIcon name="loader" size={11} />
                        <span>{st.title}</span>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </ChatInsetShell>
  );
}
