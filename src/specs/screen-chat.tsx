import {
  AfAgentChat,
  AfAgentChatProgress,
  AfAgentChatRail,
  AfAgentRun,
  AfAgentThread,
  AfAssistantHome,
  AfAssistantOverview,
} from "../components/screens-chat";
import type { ComponentSpec } from "../types";

function AssistantHomeSpecimen() {
  return <AfAssistantHome />;
}

function AssistantOverviewSpecimen() {
  return <AfAssistantOverview />;
}

function AgentChatSpecimen() {
  return <AfAgentChat />;
}

function AgentChatProgressSpecimen() {
  return <AfAgentChatProgress />;
}

function AgentChatRailSpecimen() {
  return <AfAgentChatRail />;
}

function AgentRunSpecimen() {
  return <AfAgentRun />;
}

function AgentThreadSpecimen() {
  return <AfAgentThread />;
}

export const screenChatSpecs: ComponentSpec[] = [
  {
    id: "assistant-home",
    title: "AI Chat / Start",
    group: "Screens",
    source: "pro",
    note: "Centered AI assistant start screen with greeting, folder & connected-apps composer tray, quick-action pills, and a collapsible tabbed work area.",
    render: AssistantHomeSpecimen,
    height: 672,
  },
  {
    id: "assistant-overview",
    title: "AI Chat / Overview",
    group: "Screens",
    source: "pro",
    note: "AI workspace overview pairing the composer with a keyboard-navigable daily activity heatmap, recent chats, plan usage, generated files, and monthly delta.",
    render: AssistantOverviewSpecimen,
    height: 672,
  },
  {
    id: "agent-chat",
    title: "AI Chat / Agents",
    group: "Screens",
    source: "pro",
    note: "Multi-agent collaborative chat with proactive brand-palette clarification, expandable specialist status pills, and a live Campaign Brief work area.",
    render: AgentChatSpecimen,
    height: 672,
  },
  {
    id: "agent-chat-progress",
    title: "AI Chat / Progress",
    group: "Screens",
    source: "pro",
    note: "Tool-assisted conversation with inline expandable tool calls and a hairline-split side panel for step progress, outputs, and session resources.",
    render: AgentChatProgressSpecimen,
    height: 672,
  },
  {
    id: "agent-chat-rail",
    title: "AI Chat / Double Sidebar",
    group: "Screens",
    source: "pro",
    note: "Double-sidebar project chat combining an app icon rail, resizable project thread list, folded tool/search turns, and a spreadsheet artifact viewer.",
    render: AgentChatRailSpecimen,
    height: 672,
  },
  {
    id: "agent-run",
    title: "AI Chat / Run",
    group: "Screens",
    source: "pro",
    note: "Autonomous single-run view with live step plan, connected tool badges, run metrics, and a right work area for human approvals, inline diffs, and files.",
    render: AgentRunSpecimen,
    height: 760,
  },
  {
    id: "agent-thread",
    title: "Agent / Thread",
    group: "Screens",
    source: "pro",
    note: "Continuous orchestrator thread featuring folded parallel tool runs, inline background task cards, resilient composer, and a keyboard-driven decision dock.",
    render: AgentThreadSpecimen,
    height: 672,
  },
];
