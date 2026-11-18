import "../patterns/agents-d.css";
import type { ComponentSpec } from "../types";
import { AfApprovalGates } from "../components/agents-d/ApprovalGates";
import { AfCollaborationStream } from "../components/agents-d/CollaborationStream";
import { AfConflictRadar } from "../components/agents-d/ConflictRadar";
import { AfContextMap } from "../components/agents-d/ContextMap";
import { AfCostWaterfall } from "../components/agents-d/CostWaterfall";
import { AfDecisionCard } from "../components/agents-d/DecisionCard";
import { AfFallbackChain } from "../components/agents-d/FallbackChain";
import { AfFanOutGrid } from "../components/agents-d/FanOutGrid";
import { AfJudgeBracket } from "../components/agents-d/JudgeBracket";
import { AfParallelAttempts } from "../components/agents-d/ParallelAttempts";
import { AfPlanVsActual } from "../components/agents-d/PlanVsActual";
import { AfRootCauseTree } from "../components/agents-d/RootCauseTree";
import { AfToolAccessMap } from "../components/agents-d/ToolAccessMap";
import { AfAgentCrew } from "../components/agents-d/AgentCrew";
import { AfAgentSequence } from "../components/agents-d/AgentSequence";
import { AfFlowBuilder } from "../components/agents-d/FlowBuilder";

/** Agents Group D Specimens (16 Pro Agent Governance, Routing & Topology Components). */
export const agentsDSpecs: ComponentSpec[] = [
  {
    id: "agent-crew",
    title: "Agent Crew",
    group: "Agents",
    source: "pro",
    note: "Persistent multi-agent team org topology with rounded orthogonal handoff wires, gradient floor illumination, project switcher, and agent inspector.",
    render: AfAgentCrew,
    width: 780,
    height: 520,
  },
  {
    id: "agent-sequence",
    title: "Agent Sequence",
    group: "Agents",
    source: "pro",
    note: "Multi-agent and tool sequence diagram with call/return arrows, self-loops, parallel blocks, lifeline execution bars, and live wire draw.",
    render: AfAgentSequence,
    width: 780,
    height: 520,
  },
  {
    id: "flow-builder",
    title: "Flow Builder",
    group: "Agents",
    source: "pro",
    note: "Top-down agent automation and branching flow builder with inline + step insertion, side-by-side If/else branches, undo stack, and live test run.",
    render: AfFlowBuilder,
    width: 780,
    height: 500,
  },
  {
    id: "approval-gates",
    title: "Approval Gates",
    group: "Agents",
    source: "pro",
    note: "Stacked human-in-the-loop approval gates with summary tray, inline diff/parameter editing, reject shake feedback, and collapsible decided history.",
    render: AfApprovalGates,
    width: 620,
    height: 500,
  },
  {
    id: "collaboration-stream",
    title: "Collaboration Stream",
    group: "Agents",
    source: "pro",
    note: "Live multi-agent collaboration stream with participant filter pills, reply jumps, attachment preview modal, detail drawer, and @-mention composer.",
    render: AfCollaborationStream,
    width: 760,
    height: 520,
  },
  {
    id: "conflict-radar",
    title: "Conflict Radar",
    group: "Agents",
    source: "pro",
    note: "Parallel branch file-by-agent overlap matrix with travelling conflict link, agent KPI hover cards, line-range tooltips, and side-by-side resolution.",
    render: AfConflictRadar,
    width: 760,
    height: 540,
  },
  {
    id: "context-map",
    title: "Context Map",
    group: "Agents",
    source: "pro",
    note: "Pure Flexbox proportional treemap of context window usage with hatched free capacity, before/after compaction toggle, and hover breakdowns.",
    render: AfContextMap,
    width: 760,
    height: 440,
  },
  {
    id: "cost-waterfall",
    title: "Cost Waterfall",
    group: "Agents",
    source: "pro",
    note: "Cumulative step-by-step cost and token waterfall with sub-agent folding, top-spender jump, and input/output inspector drawer.",
    render: AfCostWaterfall,
    width: 780,
    height: 440,
  },
  {
    id: "decision-card",
    title: "Decision Card",
    group: "Agents",
    source: "pro",
    note: "Compact multi-question agent decision card supporting numeric hotkeys, layout thumbnail picks, fact approval, and single-line collapse.",
    render: () => <AfDecisionCard demoStage />,
    width: 600,
    height: 440,
  },
  {
    id: "fallback-chain",
    title: "Fallback Chain",
    group: "Agents",
    source: "pro",
    note: "Cross-provider model fallback router with tripped error wires, live takeover glint, request/response hover cards, and one-click replay.",
    render: AfFallbackChain,
    width: 780,
    height: 420,
  },
  {
    id: "fan-out-grid",
    title: "Fan-Out Grid",
    group: "Agents",
    source: "pro",
    note: "High-density 240-shard concurrent execution matrix with live shimmer cells, arrow-key inspection card, and failed-shard retry.",
    render: AfFanOutGrid,
    width: 760,
    height: 400,
  },
  {
    id: "judge-bracket",
    title: "Judge Bracket",
    group: "Agents",
    source: "pro",
    note: "Single-elimination LLM-as-a-Judge tournament bracket with quarterfinal/semifinal/final connectors, side-by-side diff comparison, and manual override.",
    render: AfJudgeBracket,
    width: 780,
    height: 500,
  },
  {
    id: "parallel-attempts",
    title: "Parallel Attempts",
    group: "Agents",
    source: "pro",
    note: "Best-of-N parallel attempt race with live progress sheen, automatic winner crowning, expandable diffs, and one-click adoption.",
    render: AfParallelAttempts,
    width: 760,
    height: 380,
  },
  {
    id: "plan-vs-actual",
    title: "Plan vs Actual",
    group: "Agents",
    source: "pro",
    note: "Dependency-aware planned vs actual Gantt timeline with dashed plan boxes, amber overrun highlights, and dynamic ETA projection.",
    render: AfPlanVsActual,
    width: 760,
    height: 400,
  },
  {
    id: "root-cause-tree",
    title: "Root Cause Tree",
    group: "Agents",
    source: "pro",
    note: "Top-down OR/AND fault-tree analyzer with ruled-out dashed branches, illuminated root-cause path, log/diff evidence panel, and one-click fix.",
    render: AfRootCauseTree,
    width: 780,
    height: 520,
  },
  {
    id: "tool-access-map",
    title: "Tool Access Map",
    group: "Agents",
    source: "pro",
    note: "Bipartite agent-to-tool permission and call topology with live blue call wires, disabled dashed rails, and interactive JSON replay inspector.",
    render: AfToolAccessMap,
    width: 780,
    height: 440,
  },
];
