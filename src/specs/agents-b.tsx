import "../patterns/agents-b.css";
import type { ComponentSpec } from "../types";
import { AfAgentInboxPattern as AgentInboxDemo } from "../components/agents/AgentInboxPattern";
import { AfApprovalCardPattern as ApprovalCardDemo } from "../components/agents/ApprovalCardPattern";
import { AfContextWindowPattern as ContextWindowDemo } from "../components/agents/ContextWindowPattern";
import { AfDecisionTreePattern as DecisionTreeDemo } from "../components/agents/DecisionTreePattern";
import { AfInlineDiffPattern as InlineDiffDemo } from "../components/agents/InlineDiffPattern";
import { AfMemoryPanelPattern as MemoryPanelDemo } from "../components/agents/MemoryPanelPattern";
import { AfPermissionRequestPattern as PermissionRequestDemo } from "../components/agents/PermissionRequestPattern";
import { AfReviewCenterPattern as ReviewCenterDemo } from "../components/agents/ReviewCenterPattern";
import { AfToolCallCardPattern as ToolCallCardDemo } from "../components/agents/ToolCallCardPattern";
import { AfTraceWaterfallPattern as TraceWaterfallDemo } from "../components/agents/TraceWaterfallPattern";

function ApprovalCardSpecimen() {
  return (
    <div className="af-agb-ap-demo">
      <div className="af-agb-ap-demo__msg">
        <span className="af-agb-ap-demo__dot" aria-hidden>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2.2c.32 3.1 1.48 4.26 4.58 4.58-3.1.32-4.26 1.48-4.58 4.58-.32-3.1-1.48-4.26-4.58-4.58 3.1-.32 4.26-1.48 4.58-4.58Z" />
          </svg>
        </span>
        <p className="af-agb-ap-demo__bubble">I drafted the October newsletter. Ready to send?</p>
      </div>
      <ApprovalCardDemo variant="official" />
    </div>
  );
}

function PermissionRequestSpecimen() {
  return (
    <div className="af-agb-specimen-stack">
      <PermissionRequestDemo />
    </div>
  );
}

function ToolCallCardSpecimen() {
  return (
    <div className="af-agb-tc-demo">
      <div className="af-agb-tc-demo__user">
        Compare CRM pricing for our 10-person team and check open deals.
      </div>
      <ToolCallCardDemo />
    </div>
  );
}

/** Agents (Approval / Context / Trace / Review) — 10 components. */
export const agentsBSpecs: ComponentSpec[] = [
  {
    id: "agent-inbox",
    title: "Agent Inbox",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: background agent task board and list with status-only icon tinting, live stopwatch, source/tool counters, inline step disclosure, and FLIP lane transitions.",
    render: AgentInboxDemo,
    width: 780,
    height: 460,
  },
  {
    id: "approval-card",
    title: "Approval Card",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: inline pre-execution approval card with risk pill, recipient avatar stack, Ctrl/⌘+Enter & Esc shortcuts, and 0.52s collapse into an undoable receipt.",
    render: ApprovalCardSpecimen,
    width: 520,
    height: 420,
  },
  {
    id: "context-window",
    title: "Context Window",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: 216-cell waffle field showing context token utilization with hover isolation, removable files, and animated conversation compaction.",
    render: ContextWindowDemo,
    width: 440,
    height: 520,
  },
  {
    id: "decision-tree",
    title: "Decision Tree",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: branching decision tree with orthogonal step connectors, Agent's pick highlight, two-stage follow-up branches, flagged consequence notes, and 1–4 hotkeys.",
    render: DecisionTreeDemo,
    width: 780,
    height: 500,
  },
  {
    id: "inline-diff",
    title: "Inline Diff",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: inline prose suggestions with strikethrough deletions, mint insertions, floating Y/N review popover, and undoable batch actions.",
    render: InlineDiffDemo,
    width: 560,
    height: 320,
  },
  {
    id: "memory-panel",
    title: "Memory Panel",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: categorized assistant memories with master switch, count chips, inline edit / pause / soft-forget, and 10-second undo bar.",
    render: MemoryPanelDemo,
    width: 480,
    height: 540,
  },
  {
    id: "permission-request",
    title: "Permission Request",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: scoped permission prompt showing who, why, exact file/deploy impact, three duration pills, and 56px receipt collapse with live expiry drain.",
    render: PermissionRequestSpecimen,
    width: 520,
    height: 430,
  },
  {
    id: "review-center",
    title: "Review Center",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: batch human-in-the-loop review workbench with risk-sorted queue, flagged code/contract diffs, source chips, and A/E/R/S single-key triage.",
    render: ReviewCenterDemo,
    width: 820,
    height: 560,
  },
  {
    id: "trace-waterfall",
    title: "Trace Waterfall",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro Agents: live execution trace with 6-column telemetry strip, collapsible brand-badged span tree, streaming bars & now-line, and anchored span inspector.",
    render: TraceWaterfallDemo,
    width: 780,
    height: 500,
  },
  {
    id: "tool-call-card",
    title: "Tool Call Card",
    group: "Agents",
    source: "free",
    note: "affectUI Clean Agents: collapsible tool invocation group with live tenths timer, JSON syntax inspection, one-click copy, and inline error retry.",
    render: ToolCallCardSpecimen,
    width: 560,
    height: 380,
  },
];
