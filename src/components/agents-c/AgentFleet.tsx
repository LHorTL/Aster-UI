import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark, ToolBrandMark } from "./_marks";

export type FleetStatus = "busy" | "idle" | "error";

export interface FleetWorkerItem {
  id: string;
  name: string;
  role: string;
  model: string;
  status: FleetStatus;
  load: number;
  completed: number;
}

export type FleetAgentStatus =
  | "queued"
  | "running"
  | "waiting"
  | "done"
  | "failed"
  | "stopped";

export interface FleetStep {
  title: string;
  status?: "done" | "running" | "waiting" | "failed" | "queued" | "skipped";
  tool?: string;
  took?: string;
}

export interface FleetAgent {
  id: string;
  name: string;
  task: string;
  model?: string;
  avatar?: ReactNode;
  tools?: string[];
  status: FleetAgentStatus;
  steps?: FleetStep[];
  cost?: number;
  started?: number;
  ended?: number;
  durationLabel?: string;
  taskCount?: number;
  ask?: string;
  error?: string;
  children?: FleetAgent[];
}

export interface AfAgentFleetProps {
  /** Main lead agents, each summing up its sub-agent branch. */
  agents?: FleetAgent[];
  /** Controlled open main agent id (`null` folds all trees). */
  open?: string | null;
  defaultOpen?: string | null;
  onOpenChange?: (id: string | null) => void;
  onResolve?: (
    agent: FleetAgent,
    action: "approve" | "reject" | "retry" | "dismiss",
  ) => void;
  onSelect?: (agent: FleetAgent) => void;
  now?: number;
  formatCost?: (amount: number) => string;
  title?: ReactNode;
  /** Legacy compatibility props. */
  initialWorkers?: FleetWorkerItem[];
  onToggleWorker?: (worker: FleetWorkerItem) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_FLEET: FleetAgent[] = [
  {
    id: "launch-lead",
    name: "Launch lead",
    model: "Opus 5.5",
    task: "Launch the new pricing page by Friday",
    tools: ["Slack", "Notion", "GitHub"],
    status: "running",
    cost: 1.65,
    durationLabel: "14m 00s",
    children: [
      {
        id: "sub-researcher",
        name: "Researcher",
        model: "Sonnet 5.5",
        task: "Compare the pricing of five competitors",
        tools: ["Linear", "Cursor"],
        status: "done",
        cost: 0.31,
        durationLabel: "7m 00s",
        taskCount: 4,
      },
      {
        id: "sub-writer",
        name: "Writer",
        model: "Sonnet 5.5",
        task: "Write the copy for the three plans",
        tools: ["Notion", "Figma"],
        status: "waiting",
        cost: 0.18,
        durationLabel: "12m 00s",
        ask: "Lead the Pro tier card with annual billing (−20%) or monthly default?",
      },
      {
        id: "sub-coder",
        name: "Coder",
        model: "GPT-6 Sol",
        task: "Build the page and wire up checkout",
        tools: ["GitHub", "Stripe", "Figma"],
        status: "running",
        cost: 0.73,
        durationLabel: "11m 00s",
        taskCount: 4,
        children: [
          {
            id: "sub-tester",
            name: "Tester",
            model: "GPT-6 Mini",
            task: "Run the checkout tests",
            tools: ["GitHub", "Stripe"],
            status: "running",
            cost: 0.07,
            durationLabel: "3m 00s",
            taskCount: 3,
          },
        ],
      },
    ],
  },
  {
    id: "support-lead",
    name: "Support lead",
    model: "Sonnet 5.5",
    task: "Answer the 48 open tickets in the queue",
    tools: ["HubSpot", "Slack"],
    status: "running",
    cost: 0.78,
    durationLabel: "26m 00s",
    children: [
      {
        id: "sup-1",
        name: "Classifier",
        model: "Sonnet 5.5",
        task: "Group billing vs API bug threads",
        tools: ["HubSpot", "Linear"],
        status: "done",
        cost: 0.19,
        durationLabel: "6m 00s",
        taskCount: 3,
      },
      {
        id: "sup-2",
        name: "Responder A",
        model: "Sonnet 5.5",
        task: "Draft replies for 22 billing tickets",
        tools: ["HubSpot", "Slack"],
        status: "running",
        cost: 0.31,
        durationLabel: "14m 00s",
        taskCount: 5,
      },
      {
        id: "sup-3",
        name: "Responder B",
        model: "GPT-6 Mini",
        task: "Link engineering issues on 14 bug reports",
        tools: ["Linear", "GitHub"],
        status: "running",
        cost: 0.18,
        durationLabel: "11m 00s",
        taskCount: 4,
      },
      {
        id: "sup-4",
        name: "Escalation",
        model: "Sonnet 5.5",
        task: "Summarize 3 enterprise SLA threads",
        tools: ["Slack", "Notion"],
        status: "done",
        cost: 0.1,
        durationLabel: "5m 00s",
        taskCount: 2,
      },
    ],
  },
  {
    id: "release-mgr",
    name: "Release manager",
    model: "GPT-6 Sol",
    task: "Ship version 2.4 to the App Store",
    tools: ["GitHub", "Slack"],
    status: "running",
    cost: 0.57,
    durationLabel: "38m 00s",
    children: [
      {
        id: "rel-1",
        name: "Build runner",
        model: "GPT-6 Sol",
        task: "Archive iOS build #814 and symbols",
        tools: ["GitHub"],
        status: "done",
        cost: 0.24,
        durationLabel: "18m 00s",
        taskCount: 3,
      },
      {
        id: "rel-2",
        name: "Signer",
        model: "GPT-6 Mini",
        task: "Upload notarized bundle to TestFlight",
        tools: ["GitHub", "Slack"],
        status: "failed",
        cost: 0.19,
        durationLabel: "9m 00s",
        error: "Provisioning profile expired for Push extension",
      },
      {
        id: "rel-3",
        name: "Notes writer",
        model: "Sonnet 5.5",
        task: "Localize What's New copy into 5 locales",
        tools: ["Notion", "Slack"],
        status: "done",
        cost: 0.14,
        durationLabel: "11m 00s",
        taskCount: 5,
      },
    ],
  },
  {
    id: "market-analyst",
    name: "Market analyst",
    model: "Gemini 3.8 Pro",
    task: "Write the weekly competitor report",
    tools: ["Notion", "Slack"],
    status: "done",
    cost: 0.82,
    durationLabel: "42m 00s",
    children: [
      {
        id: "mkt-1",
        name: "Changelog scraper",
        model: "Gemini 3.8 Pro",
        task: "Collect 19 release posts across 6 competitors",
        tools: ["Notion", "GitHub"],
        status: "done",
        cost: 0.28,
        durationLabel: "14m 00s",
        taskCount: 4,
      },
      {
        id: "mkt-2",
        name: "Win-loss reader",
        model: "Gemini 3.8 Pro",
        task: "Extract objections from 34 HubSpot call notes",
        tools: ["HubSpot", "Notion"],
        status: "done",
        cost: 0.32,
        durationLabel: "16m 00s",
        taskCount: 3,
      },
      {
        id: "mkt-3",
        name: "Briefing editor",
        model: "Sonnet 5.5",
        task: "Publish Monday executive digest in Notion",
        tools: ["Notion", "Slack"],
        status: "done",
        cost: 0.22,
        durationLabel: "12m 00s",
        taskCount: 2,
      },
    ],
  },
];

function defaultFormatCost(v: number): string {
  return `$${v.toFixed(2)}`;
}

function flattenDescendants(agent: FleetAgent): FleetAgent[] {
  const out: FleetAgent[] = [];
  const visit = (nodes?: FleetAgent[]) => {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i += 1) {
      out.push(nodes[i]);
      visit(nodes[i].children);
    }
  };
  visit(agent.children);
  return out;
}

function StatusBadge({ status }: { status: FleetAgentStatus }) {
  if (status === "done") {
    return (
      <span className="af-agc-flt__pill is-done">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 13.5 9.2 17.7 19 7.8"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Done</span>
      </span>
    );
  }
  if (status === "waiting") {
    return (
      <span className="af-agc-flt__pill is-warn">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="M12 7.5v5.2"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.3" r="1.25" fill="currentColor" />
        </svg>
        <span>Needs you</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="af-agc-flt__pill is-danger">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="m9 9 6 6m0-6-6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <span>Failed</span>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="af-agc-flt__pill is-live">
        <svg
          className="af-agc-flt__spin"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="2.6"
          />
          <path
            d="M12 3.5A8.5 8.5 0 0 1 20.5 12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
        </svg>
        <span>Running</span>
      </span>
    );
  }
  return (
    <span className="af-agc-flt__pill is-muted">
      <span>{status}</span>
    </span>
  );
}

function SubProgressPie({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="6"
        cy="6"
        r="4.9"
        stroke="currentColor"
        strokeWidth="1.35"
        opacity="0.72"
      />
      {clamped > 0 ? (
        <circle
          cx="6"
          cy="6"
          r="1.95"
          pathLength={1}
          stroke="currentColor"
          strokeWidth="3.9"
          strokeDasharray="1 1"
          strokeDashoffset={1 - clamped}
          transform="rotate(-90 6 6)"
        />
      ) : null}
    </svg>
  );
}

function ToolMicroStack({ tools }: { tools?: string[] }) {
  if (!tools || tools.length === 0) return null;
  return (
    <span className="af-agc-flt__mini-tools" aria-hidden="true">
      {tools.slice(0, 3).map((t) => (
        <span key={t} className="af-agc-flt__mini-tool">
          <ToolBrandMark name={t} size={10} />
        </span>
      ))}
    </span>
  );
}

export function AfAgentFleet({
  agents: propAgents,
  open: controlledOpen,
  defaultOpen = "launch-lead",
  onOpenChange,
  onResolve,
  onSelect,
  formatCost = defaultFormatCost,
  title = "Fleet",
  initialWorkers,
  className,
  style,
}: AfAgentFleetProps = {}) {
  const baseAgents = useMemo<FleetAgent[]>(() => {
    if (propAgents && propAgents.length > 0) return propAgents;
    if (initialWorkers && initialWorkers.length > 0) {
      return initialWorkers.map((w) => ({
        id: w.id,
        name: w.name,
        model: w.model,
        task: w.role,
        tools: ["GitHub", "Linear"],
        status:
          w.status === "error"
            ? "failed"
            : w.status === "busy"
              ? "running"
              : "done",
        cost: 0.45,
        durationLabel: "12m 00s",
      }));
    }
    return DEFAULT_FLEET;
  }, [initialWorkers, propAgents]);

  const [internalOpen, setInternalOpen] = useState<string | null>(defaultOpen);
  const [statusMap, setStatusMap] = useState<Record<string, FleetAgentStatus>>(
    {},
  );
  const [activePromptAgentId, setActivePromptAgentId] = useState<string | null>(
    null,
  );

  const openId = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpenLead = (next: string | null) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const applyOverrides = (list: FleetAgent[]): FleetAgent[] =>
    list.map((a) => ({
      ...a,
      status: statusMap[a.id] ?? a.status,
      children: a.children ? applyOverrides(a.children) : undefined,
    }));

  const agents = useMemo(
    () => applyOverrides(baseAgents),
    [baseAgents, statusMap],
  );

  const fleetSummary = useMemo(() => {
    let subTotal = 0;
    let running = 0;
    let needs = 0;
    let totalCost = 0;

    agents.forEach((lead) => {
      totalCost += lead.cost ?? 0;
      if (lead.status === "running") running += 1;
      if (lead.status === "waiting") needs += 1;
      const subs = flattenDescendants(lead);
      subTotal += subs.length;
      subs.forEach((s) => {
        if (s.status === "running") running += 1;
        if (s.status === "waiting") needs += 1;
      });
    });

    return {
      leads: agents.length,
      subs: subTotal,
      running,
      needs,
      totalCost,
    };
  }, [agents]);

  const openIndex = useMemo(
    () => agents.findIndex((a) => a.id === openId),
    [agents, openId],
  );
  const openLead = openIndex >= 0 ? agents[openIndex] : null;

  // Vertical anchor positions for lead cards & sub-agent cards
  const LEAD_CARD_STEP = 108;
  const SUB_CARD_STEP = 104;
  const subCount = openLead?.children?.length ?? 0;
  const wireHeight = Math.max(
    agents.length * LEAD_CARD_STEP,
    subCount * SUB_CARD_STEP +
      (openLead?.children?.some((c) => c.children?.length) ? 92 : 0),
  );

  const leadAnchorY = openIndex >= 0 ? openIndex * LEAD_CARD_STEP + 50 : 50;

  const resolveSubAgent = (
    sub: FleetAgent,
    action: "approve" | "reject" | "retry" | "dismiss",
  ) => {
    const nextStatus: FleetAgentStatus =
      action === "approve" || action === "retry" ? "running" : "stopped";
    setStatusMap((prev) => ({ ...prev, [sub.id]: nextStatus }));
    setActivePromptAgentId(null);
    onResolve?.(sub, action);
  };

  return (
    <div className={cn("af-agc-flt", className)} style={style}>
      {/* Frameless top summary bar */}
      <div className="af-agc-flt__bar">
        <div className="af-agc-flt__bar-left">
          <svg
            className="af-agc-flt__spark"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m7.2 2 1.35 3.7L12.25 7l-3.7 1.35L7.2 12.05 5.85 8.35 2.15 7l3.7-1.3L7.2 2Z"
              fill="currentColor"
            />
            <circle cx="12.4" cy="11.8" r="1.05" fill="currentColor" opacity="0.65" />
          </svg>
          <span className="af-agc-flt__title">{title}</span>
        </div>

        <div className="af-agc-flt__bar-right">
          <span>
            {fleetSummary.leads} agents / {fleetSummary.subs} sub-agents
          </span>
          <span className="af-agc-flt__stat-run">
            {fleetSummary.running} running
          </span>
          {fleetSummary.needs > 0 ? (
            <span className="af-agc-flt__stat-warn">
              {fleetSummary.needs} needs you
            </span>
          ) : null}
          <span className="af-agc-flt__stat-cost">
            {formatCost(fleetSummary.totalCost)}
          </span>
        </div>
      </div>

      <div className="af-agc-flt__stage">
        {/* Left column: Lead agent summary cards */}
        <div className="af-agc-flt__leads" role="list" aria-label="Lead agents">
          {agents.map((lead) => {
            const isOpen = lead.id === openId;
            const isDimmed = openId !== null && !isOpen;
            const subs = flattenDescendants(lead);
            const subWaiting = subs.filter((s) => s.status === "waiting").length;
            const subFailed = subs.filter((s) => s.status === "failed").length;
            const subRunning = subs.filter((s) => s.status === "running").length;
            const subDone = subs.filter((s) => s.status === "done").length;
            const doneRatio =
              subs.length > 0
                ? (subDone + subFailed) / subs.length
                : lead.status === "done"
                  ? 1
                  : 0.25;

            let summaryLabel: string;
            if (subWaiting > 0) {
              summaryLabel = `${subWaiting} needs you`;
            } else if (subFailed > 0) {
              summaryLabel = `${subFailed} failed`;
            } else if (subRunning > 0) {
              summaryLabel = `${subRunning}/${subs.length} running`;
            } else if (subs.length > 0) {
              summaryLabel = `All ${subs.length} done`;
            } else {
              summaryLabel = `${subDone} done`;
            }

            return (
              <button
                key={lead.id}
                type="button"
                className={cn(
                  "af-agc-flt__lead-card",
                  isOpen && "is-open",
                  isDimmed && "is-dimmed",
                )}
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenLead(isOpen ? null : lead.id);
                  onSelect?.(lead);
                }}
              >
                <div className="af-agc-flt__card-top">
                  <span className="af-agc-flt__model-tile" aria-hidden="true">
                    {lead.avatar ?? (
                      <ModelBrandMark
                        model={lead.model ?? lead.name}
                        size={13}
                      />
                    )}
                  </span>
                  <div className="af-agc-flt__card-ident">
                    <span className="af-agc-flt__card-name">{lead.name}</span>
                    {lead.model ? (
                      <span className="af-agc-flt__card-model">
                        {lead.model}
                      </span>
                    ) : null}
                  </div>
                  <StatusBadge status={lead.status} />
                </div>

                <div className="af-agc-flt__task-row">
                  <ToolMicroStack tools={lead.tools} />
                  <span className="af-agc-flt__task-text">{lead.task}</span>
                </div>

                <div className="af-agc-flt__card-foot">
                  <span className="af-agc-flt__sub-stat">
                    <SubProgressPie ratio={doneRatio} />
                    <span>{summaryLabel}</span>
                  </span>
                  <span className="af-agc-flt__cost-time">
                    <b className="af-agc-flt__cost-val">
                      {formatCost(lead.cost ?? 0)}
                    </b>
                    {lead.durationLabel ? ` · ${lead.durationLabel}` : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center orthogonal rounded-elbow blue SVG connector column + Right sub-agent tree */}
        {openLead && openLead.children && openLead.children.length > 0 ? (
          <>
            <svg
              className="af-agc-flt__wires"
              width="48"
              height={wireHeight}
              viewBox={`0 0 48 ${wireHeight}`}
              aria-hidden="true"
            >
              {openLead.children.map((child, cIdx) => {
                const targetY = cIdx * SUB_CARD_STEP + 44;
                const midX = 24;
                const r = 8;
                let d: string;
                if (Math.abs(targetY - leadAnchorY) < 4) {
                  d = `M 4 ${leadAnchorY} L 44 ${targetY}`;
                } else {
                  const dir = targetY > leadAnchorY ? 1 : -1;
                  const rad = Math.min(r, Math.abs(targetY - leadAnchorY) / 2);
                  d =
                    `M 4 ${leadAnchorY} L ${midX - rad} ${leadAnchorY} ` +
                    `Q ${midX} ${leadAnchorY} ${midX} ${leadAnchorY + dir * rad} ` +
                    `L ${midX} ${targetY - dir * rad} ` +
                    `Q ${midX} ${targetY} ${midX + rad} ${targetY} ` +
                    `L 44 ${targetY}`;
                }
                return (
                  <g key={child.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--af-flt-wire)"
                      strokeWidth="1.45"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="44"
                      cy={targetY}
                      r="3"
                      fill="var(--af-flt-surface)"
                      stroke="var(--af-flt-wire)"
                      strokeWidth="1.45"
                    />
                  </g>
                );
              })}

              <circle
                cx="4"
                cy={leadAnchorY}
                r="3.2"
                fill="var(--af-flt-surface)"
                stroke="var(--af-flt-wire)"
                strokeWidth="1.55"
              />
            </svg>

            <div
              className="af-agc-flt__subs"
              role="list"
              aria-label={`${openLead.name} sub-agents`}
            >
              {openLead.children.map((sub) => {
                const isPromptOpen = activePromptAgentId === sub.id;
                return (
                  <div key={sub.id} className="af-agc-flt__sub-group">
                    <div
                      className={cn(
                        "af-agc-flt__sub-card",
                        `is-${sub.status}`,
                      )}
                      onClick={() => onSelect?.(sub)}
                    >
                      <div className="af-agc-flt__card-top">
                        <span
                          className="af-agc-flt__model-tile is-sm"
                          aria-hidden="true"
                        >
                          <ModelBrandMark
                            model={sub.model ?? sub.name}
                            size={11}
                          />
                        </span>
                        <div className="af-agc-flt__card-ident">
                          <span className="af-agc-flt__card-name">
                            {sub.name}
                          </span>
                          {sub.model ? (
                            <span className="af-agc-flt__card-model">
                              {sub.model}
                            </span>
                          ) : null}
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>

                      <div className="af-agc-flt__task-row">
                        <ToolMicroStack tools={sub.tools} />
                        <span className="af-agc-flt__sub-task">{sub.task}</span>
                      </div>

                      {sub.status === "failed" && sub.error ? (
                        <div className="af-agc-flt__sub-err">{sub.error}</div>
                      ) : null}

                      <div className="af-agc-flt__card-foot">
                        <span className="af-agc-flt__cost-time">
                          <b className="af-agc-flt__cost-val">
                            {formatCost(sub.cost ?? 0)}
                          </b>
                          {sub.durationLabel ? ` · ${sub.durationLabel}` : ""}
                        </span>

                        {sub.status === "waiting" ? (
                          <button
                            type="button"
                            className="af-agc-flt__act-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePromptAgentId((prev) =>
                                prev === sub.id ? null : sub.id,
                              );
                            }}
                          >
                            Answer
                          </button>
                        ) : sub.status === "failed" ? (
                          <button
                            type="button"
                            className="af-agc-flt__act-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveSubAgent(sub, "retry");
                            }}
                          >
                            Retry
                          </button>
                        ) : sub.taskCount ? (
                          <span className="af-agc-flt__tasks-cnt">
                            {sub.taskCount} tasks
                          </span>
                        ) : null}
                      </div>

                      {isPromptOpen && sub.status === "waiting" ? (
                        <div
                          className="af-agc-flt__prompt"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="af-agc-flt__prompt-q">
                            {sub.ask ?? "Approve this sub-agent decision?"}
                          </p>
                          <div className="af-agc-flt__prompt-btns">
                            <button
                              type="button"
                              className="af-agc-flt__act-btn is-primary"
                              onClick={() => resolveSubAgent(sub, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="af-agc-flt__ghost-btn"
                              onClick={() => resolveSubAgent(sub, "reject")}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Nested 3rd-tier child sub-agents (e.g. Coder -> Tester) */}
                    {sub.children && sub.children.length > 0 ? (
                      <div className="af-agc-flt__nested">
                        {sub.children.map((leaf) => (
                          <div key={leaf.id} className="af-agc-flt__nested-row">
                            <svg
                              className="af-agc-flt__nested-wire"
                              width="28"
                              height="46"
                              viewBox="0 0 28 46"
                              aria-hidden="true"
                            >
                              <path
                                d="M 8 2 L 8 25 Q 8 33 16 33 L 25 33"
                                fill="none"
                                stroke="var(--af-flt-wire)"
                                strokeWidth="1.45"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="8"
                                cy="3"
                                r="2.6"
                                fill="var(--af-flt-surface)"
                                stroke="var(--af-flt-wire)"
                                strokeWidth="1.4"
                              />
                              <circle
                                cx="25"
                                cy="33"
                                r="2.6"
                                fill="var(--af-flt-surface)"
                                stroke="var(--af-flt-wire)"
                                strokeWidth="1.4"
                              />
                            </svg>

                            <div
                              className={cn(
                                "af-agc-flt__sub-card is-leaf",
                                `is-${leaf.status}`,
                              )}
                            >
                              <div className="af-agc-flt__card-top">
                                <span
                                  className="af-agc-flt__model-tile is-sm"
                                  aria-hidden="true"
                                >
                                  <ModelBrandMark
                                    model={leaf.model ?? leaf.name}
                                    size={11}
                                  />
                                </span>
                                <div className="af-agc-flt__card-ident">
                                  <span className="af-agc-flt__card-name">
                                    {leaf.name}
                                  </span>
                                  {leaf.model ? (
                                    <span className="af-agc-flt__card-model">
                                      {leaf.model}
                                    </span>
                                  ) : null}
                                </div>
                                <StatusBadge status={leaf.status} />
                              </div>

                              <div className="af-agc-flt__task-row">
                                <ToolMicroStack tools={leaf.tools} />
                                <span className="af-agc-flt__sub-task">
                                  {leaf.task}
                                </span>
                              </div>

                              <div className="af-agc-flt__card-foot">
                                <span className="af-agc-flt__cost-time">
                                  <b className="af-agc-flt__cost-val">
                                    {formatCost(leaf.cost ?? 0)}
                                  </b>
                                  {leaf.durationLabel
                                    ? ` · ${leaf.durationLabel}`
                                    : ""}
                                </span>
                                {leaf.taskCount ? (
                                  <span className="af-agc-flt__tasks-cnt">
                                    {leaf.taskCount} tasks
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const AfAgentFleetPattern = AfAgentFleet;
export type AfAgentFleetPatternProps = AfAgentFleetProps;
