import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import {
  AfAppShellFlat,
  type AfShellGroup,
  type AfShellNavItem,
  type AfWorkAreaTab,
} from "../screens-onboarding/AppShellFlat";
import { AgentPixelMark, CopyButtonInline, ToolAppBadge } from "./shared";

export type AfAgentRunStep = {
  id: string;
  label: string;
  kind: "llm" | "tool" | "agent";
  start: number;
  duration?: number;
  depth?: number;
  app?: string;
  agent?: string;
  agentColor?: string;
  failed?: boolean;
  error?: string;
  tokens?: { in: number; out: number };
  cost?: number;
  input?: string;
  output?: string;
};

export type AfAgentRunDetailData = {
  id: string;
  title: string;
  agent: { id: string; name: string; color: string };
  model: string;
  startedAt: string;
  total?: number;
  costSymbol?: string;
  totalCost?: string;
  totalTokens?: string;
  steps: AfAgentRunStep[];
};

export type AfAgentRunDetailProps = HTMLAttributes<HTMLDivElement> & {
  run?: AfAgentRunDetailData;
  elapsed?: number;
  defaultOpen?: string | null;
  onStop?: () => void;
  onRerun?: () => void;
  loading?: boolean;
  empty?: boolean;
  onNavigate?: (label: string) => void;
  workspace?: string;
};

const ARD_NAV: AfShellNavItem[] = [
  { label: "Thread", icon: "message" },
  { label: "Inbox", icon: "inbox", badge: 2 },
  { label: "Agents", icon: "sparkle" },
  { label: "Tasks", icon: "checkCircle" },
  { label: "Memory", icon: "database" },
  { label: "Skills", icon: "layers" },
];

const ARD_GROUPS: AfShellGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Schedules", icon: "clock" },
      { label: "Activity", icon: "chart" },
      { label: "Usage", icon: "sliders" },
      { label: "Permissions", icon: "shield" },
      { label: "Settings", icon: "settings" },
    ],
  },
];

const DEFAULT_RUN: AfAgentRunDetailData = {
  id: "run_0042_mig",
  title: "Migrate users table",
  agent: { id: "builder", name: "Builder", color: "#0190fe" },
  model: "Opus 5.5",
  startedAt: "started 00:08",
  total: 70,
  costSymbol: "€",
  totalCost: "€0.76",
  totalTokens: "46.6K",
  steps: [
    {
      id: "plan",
      label: "Plan the migration",
      kind: "llm",
      start: 0,
      duration: 3.2,
      tokens: { in: 6420, out: 810 },
      cost: 0.08,
      input: "Split public.users into accounts and profiles on Postgres 17 without downtime.",
      output: "1. Read schema and 14 migrations\n2. Write 0042_split_users\n3. Open PR and run staging dry run",
    },
    {
      id: "schema",
      label: "Read the schema",
      kind: "tool",
      app: "GitHub",
      start: 3.2,
      duration: 1.4,
      cost: 0.01,
      input: "GET /repos/fieldwork/core/contents/db/schema.sql",
      output: "200 OK · 412 lines",
    },
    {
      id: "migs",
      label: "Read 14 migrations",
      kind: "tool",
      app: "GitHub",
      start: 4.6,
      duration: 3.2,
      cost: 0.02,
      input: "GET /repos/fieldwork/core/contents/db/migrations",
      output: "14 files read (0028..0041)",
    },
    {
      id: "write",
      label: "Write migration 0042",
      kind: "llm",
      start: 7.8,
      duration: 6.3,
      tokens: { in: 18640, out: 2104 },
      cost: 0.41,
      input:
        "Write 0042_split_users with an up and a down step. Copy in batches of 5,000 and keep a view named users for old reads.",
      output:
        "CREATE TABLE accounts (…);\nCREATE TABLE profiles (…);\nINSERT INTO accounts SELECT … LIMIT 5000;\nCREATE VIEW users AS SELECT … ;",
    },
    {
      id: "pr-open",
      label: "Open pull request #491",
      kind: "tool",
      app: "GitHub",
      start: 14.1,
      duration: 0.9,
      cost: 0.01,
      input: "POST /repos/fieldwork/core/pulls",
      output: "Opened #491: Split users into accounts & profiles",
    },
    {
      id: "rev-agent",
      label: "Reviewer checks the diff",
      kind: "agent",
      agent: "Reviewer",
      agentColor: "#a651f0",
      start: 15.0,
      duration: 7.4,
      cost: 0.11,
      input: "Verify migration 0042 backwards compatibility and index coverage.",
      output: "Test suite green; noted missing index on profiles(account_id).",
    },
    {
      id: "rev-test",
      label: "Run the test suite",
      kind: "tool",
      app: "GitHub",
      depth: 1,
      start: 15.4,
      duration: 5.2,
      input: "gh workflow run ci-db.yml --ref pr-491",
      output: "148/148 assertions passed",
    },
    {
      id: "rev-write",
      label: "Write the review",
      kind: "llm",
      depth: 1,
      start: 20.6,
      duration: 1.6,
      tokens: { in: 4100, out: 380 },
      cost: 0.04,
      input: "Summarize diff findings for PR #491.",
      output: "Approved with suggestion: add CONCURRENTLY index before view swap.",
    },
    {
      id: "dry-fail",
      label: "Dry run on staging",
      kind: "tool",
      app: "Postgres",
      start: 22.4,
      duration: 3.1,
      failed: true,
      error: "lock timeout on users_pkey",
      input: "psql $STAGING_DB -f 0042_split_users.sql",
      output: "ERROR: canceling statement due to lock timeout",
    },
    {
      id: "dry-retry",
      label: "Dry run on staging · retry",
      kind: "tool",
      app: "Postgres",
      start: 25.5,
      duration: 9.6,
      input: "psql $STAGING_DB -v lock_timeout=15s -f 0042_split_users.sql",
      output: "COMMIT · migrated 124,800 rows in 25 batches",
    },
    {
      id: "add-idx",
      label: "Add the missing index",
      kind: "llm",
      start: 35.1,
      duration: 2.5,
      tokens: { in: 5200, out: 420 },
      cost: 0.05,
      input: "Append idx_profiles_account_id to 0042_split_users.sql",
      output: "CREATE INDEX CONCURRENTLY idx_profiles_account_id ON profiles(account_id);",
    },
    {
      id: "pr-upd",
      label: "Update pull request #491",
      kind: "tool",
      app: "GitHub",
      start: 37.6,
      duration: 0.9,
      input: "git push origin pr-491",
      output: "Updated head to 9c4e12a",
    },
    {
      id: "test-again",
      label: "Run the test suite again",
      kind: "tool",
      app: "GitHub",
      start: 37.5,
      input: "gh workflow run ci-db.yml --ref 9c4e12a",
      output: "Running integration suite…",
    },
    {
      id: "guard",
      label: "Guard checks the data rules",
      kind: "agent",
      agent: "Guard",
      agentColor: "#13b3a0",
      start: 37.9,
      cost: 0.03,
      input: "Verify PII masking and row-level access policies.",
      output: "Scanning staging logs and view permissions…",
    },
    {
      id: "scan-logs",
      label: "Scan the logs for personal data",
      kind: "tool",
      app: "Postgres",
      depth: 1,
      start: 38.2,
      duration: 3.4,
      input: "SELECT count(*) FROM pg_stat_statements WHERE query ~* 'email';",
      output: "0 leaked PII literals",
    },
    {
      id: "access-rules",
      label: "Check the access rules",
      kind: "llm",
      depth: 1,
      start: 41.7,
      tokens: { in: 3100, out: 190 },
      input: "Audit GRANT statements on accounts, profiles and users view.",
      output: "Verifying roleapp_readonly permissions…",
    },
  ],
};

function StepIcon({ step }: { step: AfAgentRunStep }) {
  if (step.kind === "llm") {
    return (
      <span className="af-ard__sicon" data-kind="llm" aria-hidden="true">
        <AfIcon name="sparkle" size={11} />
      </span>
    );
  }
  if (step.kind === "agent") {
    return <AgentPixelMark name={step.agent ?? step.label} color={step.agentColor ?? "#a651f0"} />;
  }
  return (
    <span className="af-ard__sicon" data-kind="tool" aria-hidden="true">
      <ToolAppBadge app={step.app} />
    </span>
  );
}

/** 单次 Agent 运行时间轴剖析（Agent / Run Detail）：对应 affectUI `agent-run-detail`。 */
export function AfAgentRunDetail({
  run = DEFAULT_RUN,
  elapsed = 42,
  defaultOpen = "write",
  onStop,
  onRerun,
  loading = false,
  empty = false,
  onNavigate,
  workspace = "Fieldwork",
  className,
  ...rest
}: AfAgentRunDetailProps) {
  const [activeNav, setActiveNav] = useState("Agents");
  const [stopped, setStopped] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(defaultOpen);

  const steps = empty ? [] : run.steps;
  const axisMax = run.total ?? 70;
  const nowSec = Math.min(axisMax, elapsed);
  const isRunning = !stopped && steps.some((s) => s.duration === undefined || s.start + s.duration > nowSec);

  const failedCount = useMemo(() => steps.filter((s) => s.failed).length, [steps]);
  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId) ?? null,
    [selectedStepId, steps],
  );

  const sym = run.costSymbol ?? "€";

  const renderStepInspector = (step: AfAgentRunStep) => {
    const stepDone = step.duration !== undefined && step.start + step.duration <= nowSec;
    const durSec = step.duration ?? Math.max(0.1, Number((nowSec - step.start).toFixed(1)));
    const kindSubtitle = step.kind === "llm" ? "Thinking" : step.kind === "agent" ? "Sub-agent" : (step.app ?? "Tool call");

    return (
      <div className="af-sar-panel">
        <div className="af-ard__insp-top">
          <div className="af-ard__insp-title">
            <StepIcon step={step} />
            <div>
              <strong>{step.label}</strong>
              <span>{kindSubtitle}</span>
            </div>
          </div>
          <span
            className={`af-sar-badge af-sar-badge--${step.failed ? "red" : stepDone ? "green" : "blue"}`}
          >
            {step.failed ? "Failed" : stepDone ? "Done" : "Running"}
          </span>
        </div>

        <dl className="af-sar-props">
          <div className="af-sar-props__row">
            <dt>Started</dt>
            <dd>+{step.start.toFixed(1)}s</dd>
          </div>
          <div className="af-sar-props__row">
            <dt>Took</dt>
            <dd>{durSec.toFixed(1)}s</dd>
          </div>
          {step.tokens ? (
            <div className="af-sar-props__row">
              <dt>Tokens</dt>
              <dd>
                {step.tokens.in.toLocaleString("en-US")} in · {step.tokens.out.toLocaleString("en-US")} out
              </dd>
            </div>
          ) : null}
          {step.cost !== undefined ? (
            <div className="af-sar-props__row">
              <dt>Cost</dt>
              <dd>
                {sym}
                {step.cost.toFixed(2)}
              </dd>
            </div>
          ) : null}
        </dl>

        {step.input ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>Input</span>
              <CopyButtonInline text={step.input} label="Copy input" />
            </div>
            <pre className="af-ard__code">{step.input}</pre>
          </div>
        ) : null}

        {step.output ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>Output</span>
              <CopyButtonInline text={step.output} label="Copy output" />
            </div>
            <pre className="af-ard__code">{step.output}</pre>
          </div>
        ) : null}
      </div>
    );
  };

  const workTabs = useMemo<AfWorkAreaTab[]>(() => {
    if (!selectedStep) return [];
    return [
      {
        id: selectedStep.id,
        title: selectedStep.label,
        kind: "custom",
        icon: <StepIcon step={selectedStep} />,
        content: renderStepInspector(selectedStep),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowSec, selectedStep, sym]);

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      nav={ARD_NAV}
      groups={ARD_GROUPS}
      projects={[]}
      chats={[]}
      sideCards={false}
      active={activeNav}
      onNavigate={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      workArea={{
        open: Boolean(selectedStep),
        onOpenChange: (open) => {
          if (!open) setSelectedStepId(null);
          else if (!selectedStepId && steps[0]) setSelectedStepId(steps[0].id);
        },
        tabs: workTabs,
        activeTabId: selectedStep?.id,
        onTabClose: () => setSelectedStepId(null),
        allowNewTab: false,
        width: 304,
      }}
      className={cn("af-sar-shell", className)}
      {...rest}
    >
      <div className="af-ard">
        {/* Run Header */}
        <header className="af-ard__head">
          <div className="af-ard__hleft">
            <AgentPixelMark name={run.agent.name} color={run.agent.color} running={isRunning} />
            <div className="af-ard__htitles">
              <h1>{run.title}</h1>
              <span>
                {run.agent.name} · {run.model} · {run.startedAt}
              </span>
            </div>
          </div>

          <div className="af-ard__hright">
            <span className={`af-sar-badge af-sar-badge--${isRunning ? "blue" : "green"}`}>
              {isRunning ? (
                <span className="af-aib__spin" aria-hidden="true" />
              ) : (
                <AfIcon name="check" size={10} />
              )}
              <span>{isRunning ? "Running" : "Done"}</span>
            </span>
            {isRunning ? (
              <button
                type="button"
                className="af-sar-btn"
                onClick={() => {
                  setStopped(true);
                  onStop?.();
                }}
              >
                <span className="af-ao__stop-sq" aria-hidden="true" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="af-sar-btn"
                onClick={() => {
                  setStopped(false);
                  onRerun?.();
                }}
              >
                <AfIcon name="refresh" size={11} />
                <span>Rerun</span>
              </button>
            )}
          </div>
        </header>

        {/* 4-Column Summary Stats Card */}
        <dl className="af-ard__stats">
          <div>
            <dt>Time</dt>
            <dd>{Math.round(nowSec)}s</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd>{run.totalCost ?? `${sym}0.76`}</dd>
          </div>
          <div>
            <dt>Tokens</dt>
            <dd>{run.totalTokens ?? "46.6K"}</dd>
          </div>
          <div>
            <dt>Steps</dt>
            <dd>
              <span>{steps.length}</span>
              {failedCount > 0 ? (
                <>
                  <span> · </span>
                  <em className="af-ard__fail">{failedCount} failed</em>
                </>
              ) : null}
            </dd>
          </div>
        </dl>

        {/* Legend */}
        <div className="af-ard__legend" aria-hidden="true">
          <span>
            <i data-tone="llm" />
            Thinking
          </span>
          <span>
            <i data-tone="tool" />
            Tool call
          </span>
          <span>
            <i data-tone="agent" />
            Sub-agent
          </span>
          <span>
            <i data-tone="failed" />
            Failed
          </span>
        </div>

        {/* Waterfall Timeline */}
        <div className="af-ard__wf">
          <div className="af-ard__axis">
            <span className="af-ard__label-col" />
            <div className="af-ard__ticks">
              {["0s", "10s", "20s", "30s", "40s", "50s", "1m", "1m 10s"].map((tk) => (
                <span key={tk}>{tk}</span>
              ))}
            </div>
          </div>

          <div className="af-ard__rows" role="listbox" aria-label="Run steps">
            <div
              className="af-ard__now"
              style={{ left: `calc(204px + (100% - 216px) * ${(nowSec / axisMax).toFixed(4)})` }}
              aria-hidden="true"
            />
            {loading ? (
              <div className="af-wb__skel" style={{ height: 180 }} />
            ) : (
              steps.map((step) => {
                const selected = step.id === selectedStep?.id;
                const stepRunning = step.duration === undefined || step.start + step.duration > nowSec;
                const dur = step.duration ?? Math.max(0.3, Number((nowSec - step.start).toFixed(1)));
                const leftPct = (step.start / axisMax) * 100;
                const widthPct = Math.max(1.2, (dur / axisMax) * 100);
                const tone = step.failed ? "failed" : step.kind;

                return (
                  <button
                    key={step.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="af-ard__row"
                    data-selected={selected || undefined}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <span
                      className="af-ard__label-col"
                      style={{ paddingLeft: step.depth ? 8 + step.depth * 14 : 8 }}
                    >
                      <StepIcon step={step} />
                      <span className="af-ard__rtitle">{step.label}</span>
                    </span>

                    <span className="af-ard__track">
                      <span
                        className="af-ard__bar"
                        data-tone={tone}
                        data-running={stepRunning || undefined}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                      <span
                        className="af-ard__dur"
                        data-failed={step.failed || undefined}
                        style={{ left: `calc(${leftPct + widthPct}% + 5px)` }}
                      >
                        {step.failed ? "failed" : `${dur.toFixed(1)}s`}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AfAppShellFlat>
  );
}
