import "../patterns/agents-c.css";
import type { ComponentSpec } from "../types";
import { AfRunControls } from "../components/agents-c/RunControls";
import { AfDiffTimeline } from "../components/agents-c/DiffTimeline";
import { AfRateLimitPlanner } from "../components/agents-c/RateLimitPlanner";
import { AfAgentCheckpoints } from "../components/agents-c/AgentCheckpoints";
import { AfAgentMonitor } from "../components/agents-c/AgentMonitor";
import { AfAgentTrail } from "../components/agents-c/AgentTrail";
import { AfRunningNow } from "../components/agents-c/RunningNow";
import { AfScheduledRuns } from "../components/agents-c/ScheduledRuns";
import { AfAgentRecap } from "../components/agents-c/AgentRecap";
import { AfAwaySummary } from "../components/agents-c/AwaySummary";
import { AfAgentFindings } from "../components/agents-c/AgentFindings";
import { AfAgentFleet } from "../components/agents-c/AgentFleet";
import { AfAgentHandoff } from "../components/agents-c/AgentHandoff";
import { AfAgentLedger } from "../components/agents-c/AgentLedger";

function RunningNowSpecimen() {
  return <AfRunningNow defaultOpen />;
}

/** Agents Group C Specimens (14 Pro Agent Runtime, Scheduling & Oversight Components). */
export const agentsCSpecs: ComponentSpec[] = [
  {
    id: "run-controls",
    title: "Run Controls",
    group: "Agents",
    source: "pro",
    note: "Streamed agent turn and steering composer with mid-stream steering notes, queued follow-ups, Chat/Act switch, permission menu, and context ring.",
    render: AfRunControls,
    width: 560,
    height: 460,
  },
  {
    id: "diff-timeline",
    title: "Diff Timeline",
    group: "Agents",
    source: "pro",
    note: "Cumulative added/removed diff curves over an agent run with pointer/keyboard scrub inspection and per-file proportional edit bars.",
    render: AfDiffTimeline,
    width: 620,
    height: 490,
  },
  {
    id: "rate-limit-planner",
    title: "Rate Limit Planner",
    group: "Agents",
    source: "pro",
    note: "24-hour TPM capacity planner with limit/buffer thresholds, hatched overflow warning, one-click Spread out, and draggable run lanes.",
    render: AfRateLimitPlanner,
    width: 780,
    height: 480,
  },
  {
    id: "agent-checkpoints",
    title: "Agent Checkpoints",
    group: "Agents",
    source: "pro",
    note: "Git-style state checkpoint rail where rewinding from any step forks a new live attempt branch while preserving earlier attempts.",
    render: AfAgentCheckpoints,
    width: 520,
    height: 320,
  },
  {
    id: "agent-monitor",
    title: "Agent Monitor",
    group: "Agents",
    source: "pro",
    note: "Compact live agent monitor card with sunken active-step well, proportional step progress segments, completed tool trail, and pill fold mode.",
    render: AfAgentMonitor,
    width: 380,
    height: 360,
  },
  {
    id: "agent-trail",
    title: "Agent Trail",
    group: "Agents",
    source: "pro",
    note: "Lightweight execution step trail with curved blue substep branch wire, live pulse spark, and inline approval gate.",
    render: AfAgentTrail,
    width: 420,
    height: 360,
  },
  {
    id: "running-now",
    title: "Running Now",
    group: "Agents",
    source: "pro",
    note: "App header background-tasks pill and portaled task popover with progress rings, pause/resume controls, and Needs you actions.",
    render: RunningNowSpecimen,
    width: 740,
    height: 420,
  },
  {
    id: "scheduled-runs",
    title: "Scheduled Runs",
    group: "Agents",
    source: "pro",
    note: "Weekly 5-hour session planner with unscheduled task stack, agent brand filters, Auto bin-packing across split sessions, and capacity meters.",
    render: AfScheduledRuns,
    width: 860,
    height: 500,
  },
  {
    id: "agent-recap",
    title: "Agent Recap",
    group: "Agents",
    source: "pro",
    note: "Overnight catch-up board pairing a framed event-density sparkline with Needs you, Failed, and Done action lanes.",
    render: AfAgentRecap,
    width: 840,
    height: 500,
  },
  {
    id: "away-summary",
    title: "Away Summary",
    group: "Agents",
    source: "pro",
    note: "Inline chat catch-up card sorting Needs you items first, expanding hidden updates, and collapsing into a quiet hairline divider.",
    render: AfAwaySummary,
    width: 600,
    height: 520,
  },
  {
    id: "agent-findings",
    title: "Agent Findings",
    group: "Agents",
    source: "pro",
    note: "Parallel verification agents card where clicking an agent row filters the live severity-tagged findings and expandable code snippets below.",
    render: AfAgentFindings,
    width: 660,
    height: 460,
  },
  {
    id: "agent-fleet",
    title: "Agent Fleet",
    group: "Agents",
    source: "pro",
    note: "Two-column lead and sub-agent topology connected by orthogonal rounded-elbow wires with o-joints and inline approval prompts.",
    render: AfAgentFleet,
    width: 700,
    height: 480,
  },
  {
    id: "agent-handoff",
    title: "Agent Handoff",
    group: "Agents",
    source: "pro",
    note: "Two-tier multi-agent relay showing top pipeline agents, relay wires with joint circles, and handoff packages highlighting dropped context.",
    render: AfAgentHandoff,
    width: 820,
    height: 500,
  },
  {
    id: "agent-ledger",
    title: "Agent Ledger",
    group: "Agents",
    source: "pro",
    note: "External system audit ledger with before → after diffs and cascade Undo preview highlighting dependent and irreversible actions.",
    render: AfAgentLedger,
    width: 640,
    height: 400,
  },
];
