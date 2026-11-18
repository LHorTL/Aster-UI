import {
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfAppShellFlat, type AfShellGroup, type AfShellNavItem } from "../screens-onboarding/AppShellFlat";
import { AgentPixelMark, ProviderMarkSvg, formatDurationSec, formatTokensCompact } from "./shared";

export type AfOrchestrationStatus = "queued" | "running" | "waiting" | "done" | "failed" | "stopped";

export type AfOrchestrationAgent = {
  id: string;
  parent?: string;
  name: string;
  role: string;
  task: string;
  model: string;
  maker?: string;
  mark?: string;
  tools?: string[];
  status: AfOrchestrationStatus;
  start?: number;
  end?: number;
  durationLabel?: string;
  tokensIn?: number;
  tokensOut?: number;
  tokensCached?: number;
  cost?: number;
  rate?: { tokens: number; cost: number };
  ask?: string;
  error?: string;
  retryOf?: string;
  tasks?: { label: string; done?: boolean }[];
  context?: string;
  x?: number;
  y?: number;
  depth?: number;
};

export type AfOrchestrationTool = {
  id: string;
  label: string;
  icon?: AffectIconKey | string;
};

export type AfOrchestrationSpan = {
  id: string;
  agent: string;
  name: string;
  kind: "agent" | "llm" | "tool";
  start: number;
  end?: number;
  status?: string;
  detail?: string;
};

export type AfOrchestrationEvent = {
  id: string;
  at: number;
  agent: string;
  type: "start" | "handoff" | "tool" | "approval" | "error" | "retry" | "done";
  text: string;
};

export type AfAgentOrchestrationProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  project?: string;
  runId?: string;
  agents?: AfOrchestrationAgent[];
  tools?: AfOrchestrationTool[];
  spans?: AfOrchestrationSpan[];
  events?: AfOrchestrationEvent[];
  elapsed?: number;
  live?: boolean;
  defaultTab?: "Trace" | "Tokens & cost" | "Events";
  onSelect?: (agent: AfOrchestrationAgent | null) => void;
  onResolve?: (agent: AfOrchestrationAgent, answer: "approve" | "reject") => void;
  onRunControl?: (action: "start" | "pause" | "resume" | "stop" | "restart") => void;
  labels?: {
    start?: string;
    pause?: string;
    resume?: string;
    stop?: string;
    restart?: string;
  };
  user?: { name: string; avatar?: string };
  loading?: boolean;
  empty?: boolean;
};

const AO_NAV: AfShellNavItem[] = [
  { label: "Orchestrations", icon: "gitBranch" },
  { label: "Runs", icon: "clock", badge: 3 },
  { label: "Agents", icon: "sparkle" },
  { label: "Traces", icon: "chart" },
  { label: "Datasets", icon: "database" },
];

const AO_GROUPS: AfShellGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Knowledge", icon: "file" },
      { label: "Settings", icon: "settings" },
    ],
  },
];

const DEFAULT_TOOLS: AfOrchestrationTool[] = [
  { id: "web", label: "Web search", icon: "globe" },
  { id: "filings", label: "Filings", icon: "file" },
  { id: "sql", label: "SQL", icon: "database" },
  { id: "charts", label: "Charts", icon: "chart" },
];

const DEFAULT_AGENTS: AfOrchestrationAgent[] = [
  {
    id: "orch",
    name: "Orchestrator",
    role: "ORCHESTRATOR",
    task: "Write the Q4 market report on European e-bike makers",
    model: "Opus 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "running",
    start: 0,
    end: 94,
    durationLabel: "1m 34s",
    tokensIn: 142000,
    tokensOut: 18400,
    cost: 2.17,
    x: 472,
    y: 0,
    depth: 0,
  },
  {
    id: "res",
    parent: "orch",
    name: "Researcher",
    role: "RESEARCH",
    task: "Find what each maker sold, at what price, and why",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#a651f0",
    status: "done",
    start: 2,
    end: 43,
    durationLabel: "41s",
    tokensIn: 84000,
    tokensOut: 9200,
    cost: 0.41,
    x: 0,
    y: 106,
    depth: 1,
  },
  {
    id: "web",
    parent: "res",
    name: "Web search",
    role: "RESEARCH",
    task: "Find 2025 sales figures for the twelve largest makers",
    model: "Gemini 3.8 Flash",
    maker: "google",
    mark: "#3b82f6",
    status: "done",
    start: 4,
    end: 16,
    durationLabel: "12s",
    cost: 0.06,
    x: 16,
    y: 200,
    depth: 2,
  },
  {
    id: "reader",
    parent: "web",
    name: "Page reader",
    role: "RESEARCH",
    task: "Read the 18 best sources in full and pull the numbers",
    model: "Gemini 3.8 Flash",
    maker: "google",
    mark: "#3b82f6",
    status: "done",
    start: 8,
    end: 15.1,
    durationLabel: "7.1s",
    cost: 0.04,
    x: 32,
    y: 294,
    depth: 3,
  },
  {
    id: "comp",
    parent: "res",
    name: "Competitor scan",
    role: "RESEARCH",
    task: "Compare price, range and channels across nine makers",
    model: "GPT-6 Mini",
    maker: "openai",
    mark: "#71717a",
    status: "done",
    start: 6,
    end: 42,
    durationLabel: "36s",
    cost: 0.08,
    x: 16,
    y: 388,
    depth: 2,
  },
  {
    id: "price",
    parent: "comp",
    name: "Pricing scraper",
    role: "RESEARCH",
    task: "Collect retail prices across DE, NL and FR",
    model: "Gemini 3.8 Flash",
    maker: "google",
    mark: "#3b82f6",
    status: "done",
    start: 18,
    end: 35,
    durationLabel: "17s",
    cost: 0.03,
    x: 32,
    y: 482,
    depth: 3,
  },
  {
    id: "analyst",
    parent: "orch",
    name: "Data analyst",
    role: "ANALYSIS",
    task: "Size the market and model its growth up to 2028",
    model: "GPT-6 Sol",
    maker: "openai",
    mark: "#71717a",
    status: "done",
    start: 4,
    end: 63,
    durationLabel: "59s",
    tokensIn: 128000,
    tokensOut: 14100,
    cost: 0.62,
    x: 236,
    y: 106,
    depth: 1,
  },
  {
    id: "filings",
    parent: "analyst",
    name: "Filings reader",
    role: "ANALYSIS",
    task: "Pull revenue and margins from seven annual reports",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "done",
    start: 7,
    end: 27,
    durationLabel: "20s",
    cost: 0.19,
    x: 252,
    y: 200,
    depth: 2,
  },
  {
    id: "sizing",
    parent: "analyst",
    name: "Market sizing",
    role: "ANALYSIS",
    task: "Estimate the 2025 market size for each country",
    model: "GPT-6 Mini",
    maker: "openai",
    mark: "#71717a",
    status: "done",
    start: 27,
    end: 52,
    durationLabel: "25s",
    cost: 0.04,
    x: 252,
    y: 294,
    depth: 2,
  },
  {
    id: "charts",
    parent: "analyst",
    name: "Chart builder",
    role: "ANALYSIS",
    task: "Draw the six charts for the report",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "done",
    start: 52,
    end: 63,
    durationLabel: "11s",
    cost: 0.08,
    x: 252,
    y: 388,
    depth: 2,
  },
  {
    id: "writer",
    parent: "orch",
    name: "Writer",
    role: "WRITING",
    task: "Draft the report from the findings and the charts",
    model: "Opus 5.5",
    maker: "anthropic",
    mark: "#13b3a0",
    status: "waiting",
    ask: "Include UK & Switzerland alongside EU-27 totals?",
    start: 44,
    end: 94,
    durationLabel: "50s",
    tokensIn: 96000,
    tokensOut: 11200,
    cost: 0.39,
    x: 472,
    y: 106,
    depth: 1,
  },
  {
    id: "outline",
    parent: "writer",
    name: "Outline",
    role: "WRITING",
    task: "Outline six sections and the executive summary",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "done",
    start: 45,
    end: 52.7,
    durationLabel: "7.7s",
    cost: 0.05,
    x: 488,
    y: 200,
    depth: 2,
  },
  {
    id: "drafter",
    parent: "writer",
    name: "Section drafter",
    role: "WRITING",
    task: "Write sections 1–6 with a citation for every number",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "queued",
    x: 488,
    y: 294,
    depth: 2,
  },
  {
    id: "fact",
    parent: "orch",
    name: "Fact-checker",
    role: "REVIEW",
    task: "Check every number and quote in the findings",
    model: "Sonnet 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "running",
    start: 72,
    end: 94,
    durationLabel: "22s",
    tokensIn: 62000,
    tokensOut: 5800,
    cost: 0.13,
    x: 708,
    y: 106,
    depth: 1,
  },
  {
    id: "claim1",
    parent: "fact",
    name: "Claim check",
    role: "REVIEW",
    task: "Check 58 claims against their sources",
    model: "GPT-6 Mini",
    maker: "openai",
    mark: "#71717a",
    status: "failed",
    error: "HTTP 504 gateway timeout",
    start: 74,
    end: 82.5,
    durationLabel: "8.5s",
    cost: 0.03,
    x: 724,
    y: 200,
    depth: 2,
  },
  {
    id: "claim2",
    parent: "fact",
    name: "Claim check · retry",
    role: "REVIEW · RETRY",
    task: "Check the 17 claims that are left, with backoff",
    model: "GPT-6 Mini",
    maker: "openai",
    mark: "#71717a",
    status: "running",
    start: 83,
    end: 94,
    durationLabel: "11s",
    cost: 0.01,
    x: 724,
    y: 294,
    depth: 2,
  },
  {
    id: "rev",
    parent: "orch",
    name: "Reviewer",
    role: "REVIEW",
    task: "Read the draft end to end and sign it off",
    model: "Opus 5.5",
    maker: "anthropic",
    mark: "#D97757",
    status: "queued",
    x: 944,
    y: 106,
    depth: 1,
  },
];

const DEFAULT_EVENTS: AfOrchestrationEvent[] = [
  { id: "ev-1", at: 82.5, agent: "Claim check", type: "error", text: "HTTP 504 fetching Accell Q3 deck — spawned retry on cached PDF" },
  { id: "ev-2", at: 63, agent: "Data analyst", type: "done", text: "Completed market sizing tables and 4 share charts ($0.62)" },
  { id: "ev-3", at: 53, agent: "Writer", type: "approval", text: "Waiting on you: Include UK & Switzerland alongside EU-27 totals?" },
];

const CARD_W = 212;
const CARD_H = 86;
const TOTAL_AXIS_SEC = 105;

function statusBadgeMeta(status: AfOrchestrationStatus): { label: string; tone: "blue" | "green" | "amber" | "red" | "muted" } {
  switch (status) {
    case "running":
      return { label: "Running", tone: "blue" };
    case "done":
      return { label: "Done", tone: "green" };
    case "waiting":
      return { label: "Needs you", tone: "amber" };
    case "failed":
      return { label: "Failed", tone: "red" };
    default:
      return { label: "Queued", tone: "muted" };
  }
}

/** 多智能体实时编排树画布（Agent / Orchestration）：对应 affectUI `agent-orchestration`。 */
export function AfAgentOrchestration({
  onNavigate,
  workspace = "Northwind",
  project = "Market research",
  runId = "run_8f3a2c",
  agents: agentsProp,
  tools = DEFAULT_TOOLS,
  events = DEFAULT_EVENTS,
  elapsed = 94_000,
  live = true,
  defaultTab = "Trace",
  onSelect,
  onResolve,
  onRunControl,
  labels,
  user = { name: "Alex Morgan" },
  loading = false,
  empty = false,
  className,
  ...rest
}: AfAgentOrchestrationProps) {
  const [activeNav, setActiveNav] = useState("Orchestrations");
  const [agents, setAgents] = useState<AfOrchestrationAgent[]>(() => (empty ? [] : (agentsProp ?? DEFAULT_AGENTS)));
  const [isPaused, setIsPaused] = useState(!live);
  const [isStopped, setIsStopped] = useState(false);

  const [zoom, setZoom] = useState(0.68);
  const [pan, setPan] = useState({ x: 42, y: 26 });
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"Trace" | "Tokens & cost" | "Events">(defaultTab);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const elapsedSec = Math.round(elapsed / 1000);
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const doneCount = useMemo(() => agents.filter((a) => a.status === "done").length, [agents]);

  const runMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "r1", type: "radio", checked: true, label: `${runId} (LIVE)` },
      { id: "r2", type: "radio", checked: false, label: "run_7d19b0 · 2h ago" },
      { type: "separator" },
      { id: "dl", label: "Download trace JSON", icon: "download" },
    ],
    [runId],
  );

  const onCanvasMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-ao-stop]")) return;
    setSelectedAgentId(null);
    onSelect?.(null);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
  };

  const onCanvasMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  };

  const onCanvasMouseUp = () => {
    dragRef.current = null;
  };

  const onCanvasWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.45, Math.min(1.4, Number((z - e.deltaY * 0.001).toFixed(2)))));
    }
  };

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      user={user}
      nav={AO_NAV}
      groups={AO_GROUPS}
      projects={[]}
      chats={[]}
      sideCards={false}
      workArea={false}
      active={activeNav}
      onNavigate={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      className={cn("af-sar-shell", className)}
      {...rest}
    >
      <div className="af-ao">
        {/* Top Floating Run Bar */}
        <div className="af-ao__top" data-ao-stop="">
          <div className="af-wb__crumbs">
            <button type="button" className="af-wb__crumb-btn">
              <span>{project}</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
            <span className="af-wb__sep" aria-hidden="true">/</span>
            <AfDropdownMenu items={runMenuItems} side="bottom" align="start">
              <button type="button" className="af-wb__crumb-btn">
                <span className="af-ao__mono">{runId}</span>
                {!isStopped ? (
                  <span className="af-ao__env-badge">{isPaused ? "PAUSED" : "LIVE"}</span>
                ) : (
                  <span className="af-ao__env-badge">STOPPED</span>
                )}
                <AfIcon name="chevronDown" size={11} />
              </button>
            </AfDropdownMenu>
          </div>

          <div className="af-wb__top-actions">
            <button
              type="button"
              className="af-ao__ctrl-btn"
              onClick={() => {
                const next = !isPaused;
                setIsPaused(next);
                onRunControl?.(next ? "pause" : "resume");
              }}
            >
              <AfIcon name={isPaused ? "play" : "pause"} size={11} />
              <span>{isPaused ? (labels?.resume ?? "Resume run") : (labels?.pause ?? "Pause run")}</span>
            </button>
            <button
              type="button"
              className="af-ao__ctrl-btn"
              onClick={() => {
                setIsStopped(true);
                onRunControl?.("stop");
              }}
            >
              <span className="af-ao__stop-sq" aria-hidden="true" />
              <span>{labels?.stop ?? "Stop"}</span>
            </button>
          </div>
        </div>

        {/* Agent Tree Canvas */}
        <div
          className="af-ao__canvas"
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onWheel={onCanvasWheel}
        >
          <div
            className="af-ao__world"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <svg className="af-wb__edges" width="2200" height="1400" viewBox="-200 -80 2200 1400" fill="none" aria-hidden="true">
              {agents.map((ag) => {
                if (!ag.parent) return null;
                const parent = agents.find((p) => p.id === ag.parent);
                if (!parent) return null;
                const px = parent.x ?? 0;
                const py = parent.y ?? 0;
                const cx = ag.x ?? 0;
                const cy = ag.y ?? 0;
                const isActive = ag.status === "running";

                if (parent.id === "orch") {
                  const sx = px + CARD_W / 2;
                  const sy = py + CARD_H;
                  const tx = cx + CARD_W / 2;
                  const ty = cy;
                  const busY = Math.round((sy + ty) / 2);
                  const d = `M ${sx} ${sy} V ${busY} H ${tx} V ${ty}`;
                  return (
                    <g key={`edge-${ag.id}`}>
                      <path
                        d={d}
                        stroke={isActive ? "var(--sar-blue)" : "var(--sar-edge)"}
                        strokeWidth={isActive ? "1.9" : "1.4"}
                        strokeLinejoin="round"
                      />
                      <circle cx={tx} cy={busY} r="2.2" fill={isActive ? "var(--sar-blue)" : "var(--sar-edge)"} />
                    </g>
                  );
                }

                const trunkX = px + 8;
                const startY = py + CARD_H;
                const tapY = cy + 40;
                const d = `M ${trunkX} ${startY} V ${tapY} H ${cx}`;
                return (
                  <path
                    key={`edge-${ag.id}`}
                    d={d}
                    stroke={isActive ? "var(--sar-blue)" : "var(--sar-edge)"}
                    strokeWidth={isActive ? "1.8" : "1.35"}
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>

            {agents.map((ag) => {
              const st = statusBadgeMeta(ag.status);
              const selected = ag.id === selectedAgentId;
              return (
                <div
                  key={ag.id}
                  className="af-ao__node-wrap"
                  style={{ left: ag.x ?? 0, top: ag.y ?? 0, width: CARD_W }}
                  data-ao-stop=""
                >
                  <div className="af-ao__role">{ag.role}</div>
                  <button
                    type="button"
                    className="af-ao__card"
                    data-status={ag.status}
                    data-selected={selected || undefined}
                    onClick={() => {
                      setSelectedAgentId(ag.id);
                      onSelect?.(ag);
                    }}
                  >
                    {loading ? (
                      <div className="af-wb__skel" />
                    ) : (
                      <>
                        <div className="af-ao__chead">
                          <span className="af-ao__cname">
                            <AgentPixelMark name={ag.name} color={ag.mark} running={ag.status === "running"} />
                            <strong>{ag.name}</strong>
                          </span>
                          <span className={`af-sar-badge af-sar-badge--${st.tone}`}>
                            {ag.status === "running" ? (
                              <span className="af-aib__spin" aria-hidden="true" style={{ width: 8, height: 8, borderWidth: 1.35 }} />
                            ) : ag.status === "done" ? (
                              <AfIcon name="check" size={9} />
                            ) : ag.status === "waiting" ? (
                              <AfIcon name="clock" size={9} />
                            ) : ag.status === "failed" ? (
                              <AfIcon name="alertTriangle" size={9} />
                            ) : (
                              <span aria-hidden="true" style={{ fontSize: 8.5 }}>○</span>
                            )}
                            <span>{st.label}</span>
                          </span>
                        </div>

                        <p className="af-ao__ctask">{ag.task}</p>

                        {ag.tools && ag.tools.length > 0 ? (
                          <div className="af-ao__ctools">
                            {ag.tools.map((tid) => {
                              const t = tools.find((x) => x.id === tid);
                              return (
                                <span key={tid} className="af-wb__nchip">
                                  {t?.label ?? tid}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className="af-ao__cfoot">
                          <span className="af-ao__cmodel">
                            <ProviderMarkSvg model={ag.model} maker={ag.maker} />
                            <span>{ag.model}</span>
                          </span>
                          <span className="af-ao__ccost">
                            {ag.cost !== undefined
                              ? `$${ag.cost.toFixed(2)} · ${ag.durationLabel ?? formatDurationSec((ag.end ?? 0) - (ag.start ?? 0))}`
                              : "–"}
                          </span>
                        </div>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Agent Approval / Detail Popover Card */}
        {selectedAgent ? (
          <aside className="af-wb__inspector" aria-label="Agent details" data-ao-stop="">
            <div className="af-wb__pal-head">
              <strong>{selectedAgent.name}</strong>
              <button
                type="button"
                className="af-asf__mini-btn"
                aria-label="Close inspector"
                onClick={() => {
                  setSelectedAgentId(null);
                  onSelect?.(null);
                }}
              >
                <AfIcon name="x" size={12} />
              </button>
            </div>
            <div className="af-wb__insp-body">
              <p className="af-ao__insp-task">{selectedAgent.ask ?? selectedAgent.task}</p>
              {selectedAgent.status === "waiting" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="af-sar-btn af-sar-btn--solid"
                    onClick={() => {
                      onResolve?.(selectedAgent, "approve");
                      setAgents((prev) =>
                        prev.map((a) => (a.id === selectedAgent.id ? { ...a, status: "running" } : a)),
                      );
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="af-sar-btn"
                    onClick={() => {
                      onResolve?.(selectedAgent, "reject");
                      setAgents((prev) =>
                        prev.map((a) => (a.id === selectedAgent.id ? { ...a, status: "stopped" } : a)),
                      );
                    }}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}

        {/* Floating Canvas Zoom Bar */}
        <div className="af-wb__toolbar" data-ao-stop="" style={{ bottom: drawerOpen ? 222 : 46 }}>
          <button
            type="button"
            className="af-wb__tbtn"
            aria-label="Fit view"
            onClick={() => {
              setZoom(0.68);
              setPan({ x: 42, y: 38 });
            }}
          >
            <AfIcon name="maximize" size={12} />
          </button>
          <button
            type="button"
            className="af-wb__tbtn"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))}
          >
            <AfIcon name="minus" size={12} />
          </button>
          <span className="af-wb__zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="af-wb__tbtn"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
          >
            <AfIcon name="plus" size={12} />
          </button>
        </div>

        {/* Bottom Run Trace & Cost Drawer */}
        <section className="af-ao__drawer" data-open={drawerOpen || undefined} aria-label="Run telemetry" data-ao-stop="">
          <div className="af-ao__dbar">
            <div className="af-wb__runtabs" role="tablist">
              {(["Trace", "Tokens & cost", "Events"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === t}
                  className="af-wb__runtab"
                  data-active={drawerTab === t || undefined}
                  onClick={() => {
                    setDrawerTab(t);
                    setDrawerOpen(true);
                  }}
                >
                  <span>{t}</span>
                  {t === "Events" ? <em className="af-wb__err-pill">1</em> : null}
                </button>
              ))}
            </div>

            <div className="af-ao__dstats">
              <span>◐ {doneCount}/{agents.length}</span>
              <span>🕒 01:34</span>
              <span>✦ {formatTokensCompact(578_900)}</span>
              <strong>$2.17</strong>
              <button
                type="button"
                className="af-asf__mini-btn"
                aria-label={drawerOpen ? "Collapse telemetry" : "Expand telemetry"}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                <AfIcon name={drawerOpen ? "chevronDown" : "chevronUp"} size={12} />
              </button>
            </div>
          </div>

          {drawerOpen ? (
            <div className="af-ao__dbody">
              {drawerTab === "Trace" ? (
                <div className="af-ao__trace">
                  <div className="af-ao__trace-axis">
                    <span className="af-ao__trace-labelcol af-ao__trace-headcol">AGENT · CALL</span>
                    <div className="af-ao__trace-ticks">
                      {["0s", "15s", "30s", "45s", "1m", "1m 15s", "1m 30s", "1m 45s"].map((tk) => (
                        <span key={tk}>{tk}</span>
                      ))}
                    </div>
                    <span className="af-ao__trace-durcol" />
                  </div>
                  <div className="af-ao__trace-rows">
                    <div
                      className="af-ao__nowline"
                      style={{ left: `calc(174px + (100% - 224px) * ${(elapsedSec / TOTAL_AXIS_SEC).toFixed(3)})` }}
                      aria-hidden="true"
                    />
                    {agents
                      .filter((a) => a.start !== undefined)
                      .slice(0, 8)
                      .map((ag, rowIdx) => {
                        const leftPct = ((ag.start ?? 0) / TOTAL_AXIS_SEC) * 100;
                        const widthPct = Math.max(2.5, (((ag.end ?? elapsedSec) - (ag.start ?? 0)) / TOTAL_AXIS_SEC) * 100);
                        const segPattern =
                          ag.status === "failed"
                            ? [{ w: 58, t: "llm" }, { w: 42, t: "failed" }]
                            : rowIdx === 0
                              ? [{ w: 18, t: "synth" }, { w: 52, t: "llm" }, { w: 30, t: "synth" }]
                              : rowIdx === 1
                                ? [{ w: 40, t: "synth" }, { w: 60, t: "llm" }]
                                : rowIdx % 2 === 0
                                  ? [{ w: 52, t: "tool" }, { w: 48, t: "llm" }]
                                  : [{ w: 34, t: "llm" }, { w: 38, t: "tool" }, { w: 28, t: "synth" }];
                        return (
                          <div key={ag.id} className="af-ao__trow">
                            <span className="af-ao__trace-labelcol" style={{ paddingLeft: 6 + (ag.depth ?? 0) * 12 }}>
                              {(ag.depth ?? 0) <= 2 ? (
                                <span className="af-ao__tchev" aria-hidden="true">›</span>
                              ) : null}
                              <AgentPixelMark name={ag.name} color={ag.mark} />
                              <span className="af-ao__tname">{ag.name}</span>
                            </span>
                            <div className="af-ao__ttrack">
                              <span
                                className="af-ao__tbar"
                                data-status={ag.status}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              >
                                {segPattern.map((seg, si) => (
                                  <i key={si} className="af-ao__tseg" data-tone={seg.t} style={{ width: `${seg.w}%` }} />
                                ))}
                              </span>
                            </div>
                            <span className="af-ao__trace-durcol">{ag.durationLabel}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : drawerTab === "Tokens & cost" ? (
                <div className="af-ao__events">
                  {agents
                    .filter((a) => a.cost !== undefined)
                    .slice(0, 6)
                    .map((a) => (
                      <div key={a.id} className="af-ao__evrow">
                        <strong>{a.name}</strong>
                        <span>{a.model}</span>
                        <em style={{ marginLeft: "auto" }}>${a.cost?.toFixed(2)}</em>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="af-ao__events">
                  {events.map((ev) => (
                    <div key={ev.id} className="af-ao__evrow" data-type={ev.type}>
                      <span className="af-ao__mono">+{ev.at}s</span>
                      <strong>{ev.agent}</strong>
                      <span>{ev.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </AfAppShellFlat>
  );
}
