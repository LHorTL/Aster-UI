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
import { AfTooltip } from "../overlay/Tooltip";
import { AfAppShellFlat, type AfShellGroup, type AfShellNavItem } from "../screens-onboarding/AppShellFlat";

export type AfWorkflowNodeKind = "trigger" | "agent" | "tool" | "logic" | "action";

export type AfWorkflowNode = {
  id: string;
  type: string;
  title: string;
  sub?: string;
  subTone?: "default" | "warn";
  badge?: string;
  badgeTone?: "default" | "warn" | "mono";
  well?: string;
  chips?: { label: string; tone?: "default" | "purple" }[];
  kind?: AfWorkflowNodeKind;
  x: number;
  y: number;
  config?: Record<string, string>;
};

export type AfWorkflowEdge = {
  id: string;
  from: string;
  port: "out" | "yes" | "no";
  to: string;
};

export type AfWorkflowComment = {
  id: string;
  x: number;
  y: number;
  text: string;
  author?: string;
};

export type AfWorkflowStepResult = {
  ms?: number;
  credits?: number;
  error?: string;
};

export type AfWorkflowPaletteItem = {
  type: string;
  label: string;
  kind: AfWorkflowNodeKind;
  icon?: AffectIconKey | string;
  sub: string;
  description: string;
};

export type AfWorkflowPaletteGroup = {
  id: string;
  label: string;
  items: AfWorkflowPaletteItem[];
};

export type AfWorkflowBuilderProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  project?: string;
  user?: { name: string; avatar?: string };
  loading?: boolean;
  empty?: boolean;
  nodes?: AfWorkflowNode[];
  edges?: AfWorkflowEdge[];
  branch?: string;
  comments?: AfWorkflowComment[];
  stepResults?: Record<string, AfWorkflowStepResult>;
  labels?: { publish?: string };
  palette?: AfWorkflowPaletteGroup[];
};

const WB_NAV: AfShellNavItem[] = [
  { label: "Workflows", icon: "gitBranch" },
  { label: "Runs", icon: "clock", badge: 3 },
  { label: "Templates", icon: "grid" },
  { label: "Integrations", icon: "layers" },
  { label: "Variables", icon: "code" },
  { label: "Data tables", icon: "kanban" },
];

const WB_GROUPS: AfShellGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Knowledge", icon: "file" },
      { label: "Settings", icon: "settings" },
    ],
  },
];

const DEFAULT_PALETTE: AfWorkflowPaletteGroup[] = [
  {
    id: "triggers",
    label: "Triggers",
    items: [
      {
        type: "signup",
        label: "New signup",
        kind: "trigger",
        icon: "user",
        sub: "When a user signs up",
        description: "Starts a run when someone creates an account.",
      },
      {
        type: "upload",
        label: "Document upload",
        kind: "trigger",
        icon: "upload",
        sub: "Choose where events come from",
        description: "Starts a run when a file lands in a folder or a form.",
      },
      {
        type: "schedule",
        label: "Schedule",
        kind: "trigger",
        icon: "clock",
        sub: "Every Monday · 09:00",
        description: "Starts a run at set times, e.g. every Monday at 9:00.",
      },
      {
        type: "webhook",
        label: "Webhook",
        kind: "trigger",
        icon: "link",
        sub: "POST /hooks/events",
        description: "Starts a run when another app calls its URL.",
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      {
        type: "agent",
        label: "AI Agent",
        kind: "agent",
        icon: "sparkle",
        sub: "Decides or calls tools",
        description: "Reads the run's data and decides, writes or calls tools with a model.",
      },
      {
        type: "http",
        label: "HTTP request",
        kind: "tool",
        icon: "globe",
        sub: "GET / POST request",
        description: "Calls any API and passes its answer on.",
      },
      {
        type: "calc",
        label: "Calculation",
        kind: "tool",
        icon: "sliders",
        sub: "Formula expression",
        description: "Works out a value from the run's data.",
      },
      {
        type: "parser",
        label: "File parser",
        kind: "tool",
        icon: "file",
        sub: "PDF / sheet / doc",
        description: "Turns a PDF, sheet or document into fields.",
      },
      {
        type: "validation",
        label: "Validation",
        kind: "tool",
        icon: "shield",
        sub: "Schema rules",
        description: "Checks the data against rules and stops bad input.",
      },
    ],
  },
  {
    id: "logic",
    label: "Logic",
    items: [
      {
        type: "branch",
        label: "Branch",
        kind: "logic",
        icon: "gitBranch",
        sub: "Condition check",
        description: "Sends the run one way or the other, by a condition.",
      },
      {
        type: "merge",
        label: "Merge",
        kind: "logic",
        icon: "layers",
        sub: "Join branches",
        description: "Waits for several paths and joins their data.",
      },
      {
        type: "wait",
        label: "Wait",
        kind: "logic",
        icon: "clock",
        sub: "Delay or timestamp",
        description: "Pauses the run for a while, or until a set time.",
      },
      {
        type: "loop",
        label: "Loop",
        kind: "logic",
        icon: "refresh",
        sub: "For each item",
        description: "Runs the next steps once for every item in a list.",
      },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      {
        type: "database",
        label: "Database",
        kind: "action",
        icon: "database",
        sub: "Insert or update row",
        description: "Creates or updates a record in one of your data tables.",
      },
      {
        type: "notify",
        label: "Notification",
        kind: "action",
        icon: "bell",
        sub: "Post to channel",
        description: "Posts a message to a channel or a person.",
      },
      {
        type: "email",
        label: "Send email",
        kind: "action",
        icon: "mail",
        sub: "Template email",
        description: "Sends an email from one of your templates.",
      },
      {
        type: "webhook-call",
        label: "Webhook call",
        kind: "action",
        icon: "external",
        sub: "POST JSON",
        description: "Sends the run's data to a webhook URL, then ends the run.",
      },
      {
        type: "end",
        label: "End",
        kind: "action",
        icon: "check",
        sub: "Stop run",
        description: "Ends the run here.",
      },
    ],
  },
];

const DEFAULT_NODES: AfWorkflowNode[] = [
  {
    id: "n1",
    type: "signup",
    kind: "trigger",
    title: "New signup",
    badge: "Ready",
    sub: "When a user signs up",
    well: "auth.user_created · Sign-up form",
    x: 0,
    y: 0,
  },
  {
    id: "n2",
    type: "upload",
    kind: "trigger",
    title: "Document upload",
    badge: "Not configured",
    badgeTone: "warn",
    sub: "Choose where events come from",
    subTone: "warn",
    chips: [{ label: ".pdf" }, { label: ".docx" }],
    x: 292,
    y: 0,
  },
  {
    id: "n3",
    type: "agent",
    kind: "agent",
    title: "Classify customer",
    badge: "2 tools",
    sub: "Classifies plan and size",
    chips: [{ label: "✦ Auto", tone: "purple" }, { label: "CRM lookup" }, { label: "Web search" }],
    x: 0,
    y: 120,
  },
  {
    id: "n4",
    type: "http",
    kind: "tool",
    title: "Enrich company",
    badge: "GET",
    badgeTone: "mono",
    sub: "Looks the company up by its domain",
    well: "GET api.clearbit.com/v2/companies/find?domain={{user.domain}} · 3 fields",
    x: 0,
    y: 238,
  },
  {
    id: "n5",
    type: "branch",
    kind: "logic",
    title: "Branch",
    badge: "2 paths",
    sub: "plan = Pro",
    well: "Yes → Notify team · No → Create record",
    x: 0,
    y: 356,
  },
  {
    id: "n6",
    type: "notify",
    kind: "action",
    title: "Notify team",
    badge: "Ready",
    sub: "#sales on Slack",
    well: "New Pro signup: {{user.name}} from {{company.name}}",
    x: -146,
    y: 504,
  },
  {
    id: "n7",
    type: "database",
    kind: "action",
    title: "Create record",
    badge: "Ready",
    sub: "Adds the customer",
    well: "customers · insert",
    x: 146,
    y: 504,
  },
];

const DEFAULT_EDGES: AfWorkflowEdge[] = [
  { id: "e1", from: "n1", port: "out", to: "n3" },
  { id: "e2", from: "n3", port: "out", to: "n4" },
  { id: "e3", from: "n4", port: "out", to: "n5" },
  { id: "e4", from: "n5", port: "yes", to: "n6" },
  { id: "e5", from: "n5", port: "no", to: "n7" },
];

const NODE_W = 252;
const NODE_OVERLINE_H = 17;
const NODE_WRAP_H = 105;

function nodeIconName(node: AfWorkflowNode): AffectIconKey {
  switch (node.type) {
    case "signup":
      return "user";
    case "upload":
      return "upload";
    case "agent":
      return "sparkle";
    case "http":
      return "globe";
    case "branch":
      return "gitBranch";
    case "notify":
      return "bell";
    case "database":
      return "database";
    default:
      return "layers";
  }
}

function kindLabel(kind: AfWorkflowNodeKind = "tool"): string {
  switch (kind) {
    case "trigger":
      return "TRIGGER";
    case "agent":
      return "AGENT";
    case "logic":
      return "LOGIC";
    case "action":
      return "ACTION";
    default:
      return "TOOL";
  }
}

function CursorToolSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.2 2.2L12.8 7.4L8.4 8.7L6.7 13.2L3.2 2.2Z" />
    </svg>
  );
}

function RocketPublishSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 11.5L4.5 6.5C6.2 3.4 9.5 2 13.5 2.5C14 6.5 12.6 9.8 9.5 11.5Z" />
      <path d="M4.5 6.5L2 7.8L4.2 10M9.5 11.5L8.2 14L6 11.8" />
    </svg>
  );
}

/** 可视化节点工作流编排画布（Workflow Builder）：对应 affectUI `workflow-builder`。 */
export function AfWorkflowBuilder({
  onNavigate,
  workspace = "Northwind",
  project = "Customer onboarding",
  user = { name: "Alex Morgan" },
  loading = false,
  empty = false,
  nodes: nodesProp,
  edges: edgesProp,
  branch: branchProp = "Main",
  comments: commentsProp = [],
  stepResults,
  labels,
  palette = DEFAULT_PALETTE,
  className,
  ...rest
}: AfWorkflowBuilderProps) {
  const [activeNav, setActiveNav] = useState("Workflows");
  const [currentProject, setCurrentProject] = useState(project);
  const [currentBranch, setCurrentBranch] = useState(branchProp);
  const [published, setPublished] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(true);
  const [toolMode, setToolMode] = useState<"select" | "comment">("select");
  const [nodes, setNodes] = useState<AfWorkflowNode[]>(() => (empty ? [] : (nodesProp ?? DEFAULT_NODES)));
  const [edges, setEdges] = useState<AfWorkflowEdge[]>(() => (empty ? [] : (edgesProp ?? DEFAULT_EDGES)));
  const [comments, setComments] = useState<AfWorkflowComment[]>(commentsProp);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(0.83);
  const [pan, setPan] = useState({ x: 372, y: 38 });
  const [runOpen, setRunOpen] = useState(false);
  const [runTab, setRunTab] = useState<"Payload" | "Triggers" | "Errors" | "Timeline" | "Runs">("Payload");
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [doneStepIds, setDoneStepIds] = useState<string[]>([]);

  const dragRef = useRef<
    | { type: "pan"; startX: number; startY: number; origX: number; origY: number }
    | { type: "node"; id: string; startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const outgoingSet = useMemo(() => new Set(edges.map((e) => e.from)), [edges]);

  const projectMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "wf-onboard", type: "radio", checked: currentProject === "Customer onboarding", label: "Customer onboarding", onSelect: () => setCurrentProject("Customer onboarding") },
      { id: "wf-invoice", type: "radio", checked: currentProject === "Invoice triage", label: "Invoice triage", onSelect: () => setCurrentProject("Invoice triage") },
      { id: "wf-churn", type: "radio", checked: currentProject === "Renewal alerts", label: "Renewal alerts", onSelect: () => setCurrentProject("Renewal alerts") },
    ],
    [currentProject],
  );

  const branchMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "br-main", type: "radio", checked: currentBranch === "Main", label: "Main (Production)", onSelect: () => setCurrentBranch("Main") },
      { id: "br-stg", type: "radio", checked: currentBranch === "Staging", label: "Staging", onSelect: () => setCurrentBranch("Staging") },
    ],
    [currentBranch],
  );

  const appendPaletteItem = (item: AfWorkflowPaletteItem, afterNodeId?: string) => {
    const parent = afterNodeId ? nodes.find((n) => n.id === afterNodeId) : nodes[nodes.length - 1];
    const id = `n-${Date.now()}`;
    const nextNode: AfWorkflowNode = {
      id,
      type: item.type,
      kind: item.kind,
      title: item.label,
      badge: "Ready",
      sub: item.sub,
      well: item.description,
      x: parent ? parent.x : 0,
      y: parent ? parent.y + 138 : 0,
    };
    setNodes((prev) => [...prev, nextNode]);
    if (parent && parent.kind !== "trigger") {
      setEdges((prev) => [...prev, { id: `e-${Date.now()}`, from: parent.id, port: "out", to: id }]);
    } else if (afterNodeId) {
      setEdges((prev) => [...prev, { id: `e-${Date.now()}`, from: afterNodeId, port: "out", to: id }]);
    }
    setSelectedNodeId(id);
  };

  const runTestSimulation = () => {
    setRunOpen(true);
    setDoneStepIds([]);
    const seq = ["n1", "n3", "n4", "n5", "n6"];
    seq.forEach((id, idx) => {
      window.setTimeout(() => {
        setRunningStepId(id);
        if (idx > 0) {
          const prev = seq[idx - 1]!;
          setDoneStepIds((d) => (d.includes(prev) ? d : [...d, prev]));
        }
      }, idx * 260);
    });
    window.setTimeout(() => {
      setRunningStepId(null);
      setDoneStepIds(seq);
    }, seq.length * 260 + 200);
  };

  const onCanvasMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-wb-stop]")) return;
    if (toolMode === "comment") {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = Math.round((e.clientX - rect.left - pan.x) / zoom);
      const cy = Math.round((e.clientY - rect.top - pan.y) / zoom);
      setComments((prev) => [...prev, { id: `c-${Date.now()}`, x: cx, y: cy, text: "Check edge-case payload", author: "AM" }]);
      setToolMode("select");
      return;
    }
    setSelectedNodeId(null);
    dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
  };

  const onCanvasMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.type === "pan") {
      setPan({ x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) });
    } else {
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === d.id ? { ...n, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) } : n)),
      );
    }
  };

  const onCanvasMouseUp = () => {
    dragRef.current = null;
  };

  const onCanvasWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.5, Math.min(1.5, Number((z - e.deltaY * 0.001).toFixed(2)))));
    }
  };

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      user={user}
      nav={WB_NAV}
      groups={WB_GROUPS}
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
      <div className="af-wb">
        {/* Floating Top Breadcrumb Pill & Publish */}
        <div className="af-wb__top" data-wb-stop="">
          <div className="af-wb__crumbs">
            <button type="button" className="af-wb__crumb-btn">
              <span className="af-wb__ws-mark">{workspace.charAt(0).toUpperCase()}</span>
              <span>{workspace}</span>
              <span className="af-wb__pill af-wb__pill--blue">Team</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
            <span className="af-wb__sep" aria-hidden="true">/</span>
            <AfDropdownMenu items={projectMenuItems} side="bottom" align="start">
              <button type="button" className="af-wb__crumb-btn">
                <span>{currentProject}</span>
                <AfIcon name="chevronDown" size={11} />
              </button>
            </AfDropdownMenu>
            <span className="af-wb__sep" aria-hidden="true">/</span>
            <AfDropdownMenu items={branchMenuItems} side="bottom" align="start">
              <button type="button" className="af-wb__crumb-btn">
                <span>{currentBranch}</span>
                {currentBranch === "Main" ? <span className="af-wb__pill">Production</span> : null}
                <AfIcon name="chevronDown" size={11} />
              </button>
            </AfDropdownMenu>
          </div>

          <div className="af-wb__top-actions">
            <button
              type="button"
              className="af-wb__publish-btn"
              onClick={() => setPublished(true)}
            >
              <RocketPublishSvg />
              <span>{published ? "Published" : (labels?.publish ?? "Publish")}</span>
            </button>
          </div>
        </div>

        {/* Left Collapsible Nodes Palette */}
        {paletteOpen ? (
          <aside className="af-wb__palette" aria-label="Nodes" data-wb-stop="">
            <div className="af-wb__pal-head">
              <strong>Nodes</strong>
              <button
                type="button"
                className="af-asf__mini-btn"
                aria-label="Close nodes panel"
                onClick={() => setPaletteOpen(false)}
              >
                <AfIcon name="x" size={12} />
              </button>
            </div>
            <div className="af-wb__pal-scroll">
              {palette.map((group) => (
                <div key={group.id} className="af-wb__pal-group">
                  <div className="af-wb__pal-ghead">
                    <span>{group.label}</span>
                    <em>{group.items.length}</em>
                  </div>
                  <div className="af-wb__pal-list">
                    {group.items.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        className="af-wb__pal-item"
                        title={item.description}
                        onClick={() => appendPaletteItem(item)}
                      >
                        <span className="af-wb__pal-icon">
                          <AfIcon name={(item.icon as AffectIconKey) ?? "layers"} size={12} />
                        </span>
                        <span className="af-wb__pal-copy">
                          <strong>{item.label}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {/* Interactive Dot-Grid Canvas */}
        <div
          className="af-wb__canvas"
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onWheel={onCanvasWheel}
        >
          {empty && nodes.length === 0 ? (
            <div className="af-wb__empty" data-wb-stop="">
              <strong>Start a workflow</strong>
              <p>Pick a trigger on the left to start building.</p>
              <button
                type="button"
                className="af-sar-btn af-sar-btn--solid"
                onClick={() => appendPaletteItem(palette[0]!.items[0]!)}
              >
                <AfIcon name="plus" size={12} />
                <span>Add a trigger</span>
              </button>
            </div>
          ) : (
            <div
              className="af-wb__world"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <svg className="af-wb__edges" width="2400" height="1800" viewBox="-600 -200 2400 1800" fill="none" aria-hidden="true">
                {edges.map((edge) => {
                  const fromNode = nodes.find((n) => n.id === edge.from);
                  const toNode = nodes.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const sx =
                    edge.port === "yes"
                      ? fromNode.x + Math.round(NODE_W * 0.31)
                      : edge.port === "no"
                        ? fromNode.x + Math.round(NODE_W * 0.69)
                        : fromNode.x + NODE_W / 2;
                  const sy = fromNode.y + NODE_WRAP_H;
                  const tx = toNode.x + NODE_W / 2;
                  const ty = toNode.y + NODE_OVERLINE_H;
                  const midY = (sy + ty) / 2;
                  const pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
                  const activeEdge = doneStepIds.includes(edge.from) && (doneStepIds.includes(edge.to) || runningStepId === edge.to);

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathD}
                        stroke={activeEdge ? "var(--sar-blue)" : "var(--sar-edge)"}
                        strokeWidth={activeEdge ? "1.8" : "1.35"}
                      />
                    </g>
                  );
                })}
              </svg>

              {edges.map((edge) => {
                if (edge.port === "out") return null;
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const sx =
                  edge.port === "yes"
                    ? fromNode.x + Math.round(NODE_W * 0.31)
                    : fromNode.x + Math.round(NODE_W * 0.69);
                const sy = fromNode.y + NODE_WRAP_H;
                const tx = toNode.x + NODE_W / 2;
                const ty = toNode.y + NODE_OVERLINE_H;
                const tagX = Math.round(sx * 0.56 + tx * 0.44);
                const tagY = Math.round(sy + (ty - sy) * 0.43);
                return (
                  <span
                    key={`tag-${edge.id}`}
                    className="af-wb__edge-tag"
                    aria-hidden="true"
                    style={{ left: tagX, top: tagY }}
                  >
                    {edge.port.toUpperCase()}
                  </span>
                );
              })}

              {nodes.map((node) => {
                const kind = node.kind ?? "tool";
                const isSelected = node.id === selectedNodeId;
                const isRunning = node.id === runningStepId;
                const isDone = doneStepIds.includes(node.id);
                const result = stepResults?.[node.id];
                const isLeaf = !outgoingSet.has(node.id);

                return (
                  <div
                    key={node.id}
                    className="af-wb__node-wrap"
                    style={{ left: node.x, top: node.y, width: NODE_W }}
                    data-wb-stop=""
                  >
                    <div className="af-wb__overline" data-kind={kind}>
                      {kindLabel(kind)}
                    </div>

                    {kind !== "trigger" ? <span className="af-wb__port af-wb__port--in" aria-hidden="true" /> : null}

                    <div
                      role="button"
                      tabIndex={0}
                      className="af-wb__node"
                      data-selected={isSelected || undefined}
                      data-running={isRunning || undefined}
                      data-done={isDone || undefined}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        setSelectedNodeId(node.id);
                        dragRef.current = {
                          type: "node",
                          id: node.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: node.x,
                          origY: node.y,
                        };
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedNodeId(node.id);
                        }
                      }}
                    >
                      {loading ? (
                        <div className="af-wb__skel" />
                      ) : (
                        <>
                          <div className="af-wb__nhead">
                            <span className="af-wb__ntitle">
                              <span className="af-wb__nicon" data-kind={kind}>
                                <AfIcon name={nodeIconName(node)} size={12} />
                              </span>
                              <strong>{node.title}</strong>
                            </span>
                            {result?.ms ? (
                              <span className="af-wb__nbadge">{result.ms}ms</span>
                            ) : node.badge ? (
                              <span className="af-wb__nbadge" data-tone={node.badgeTone}>
                                {node.badge}
                              </span>
                            ) : null}
                          </div>

                          {node.sub ? (
                            <div className="af-wb__nsub" data-tone={node.subTone}>
                              {node.sub}
                            </div>
                          ) : null}

                          {node.chips && node.chips.length > 0 ? (
                            <div className="af-wb__nchips">
                              {node.chips.map((c) => (
                                <span key={c.label} className="af-wb__nchip" data-tone={c.tone}>
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          ) : node.well ? (
                            <div className="af-wb__nwell">{node.well}</div>
                          ) : null}
                        </>
                      )}
                    </div>

                    {node.type === "branch" ? (
                      <>
                        <span className="af-wb__port af-wb__port--out" style={{ left: "31%" }} aria-hidden="true" />
                        <span className="af-wb__port af-wb__port--out" style={{ left: "69%" }} aria-hidden="true" />
                      </>
                    ) : !isLeaf ? (
                      <span className="af-wb__port af-wb__port--out" aria-hidden="true" />
                    ) : null}

                    {isLeaf ? (
                      <span className="af-wb__leaf-tail">
                        <i className="af-wb__leaf-stem" aria-hidden="true" />
                        <button
                          type="button"
                          className="af-wb__leaf-add"
                          aria-label={`Add step after ${node.title}`}
                          onClick={() => appendPaletteItem(palette[3]!.items[1]!, node.id)}
                        >
                          <AfIcon name="plus" size={10} />
                        </button>
                      </span>
                    ) : null}
                  </div>
                );
              })}

              {comments.map((c) => (
                <div key={c.id} className="af-wb__comment" style={{ left: c.x, top: c.y }} data-wb-stop="">
                  <strong>{c.author ?? "AM"}</strong>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Node Quick Inspector */}
        {selectedNode ? (
          <aside className="af-wb__inspector" aria-label="Step configuration" data-wb-stop="">
            <div className="af-wb__pal-head">
              <strong>{selectedNode.title}</strong>
              <button
                type="button"
                className="af-asf__mini-btn"
                aria-label="Close step inspector"
                onClick={() => setSelectedNodeId(null)}
              >
                <AfIcon name="x" size={12} />
              </button>
            </div>
            <div className="af-wb__insp-body">
              <label className="af-wb__field">
                <span>Step title</span>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n)));
                  }}
                />
              </label>
              <label className="af-wb__field">
                <span>Summary</span>
                <input
                  type="text"
                  value={selectedNode.sub ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, sub: val, subTone: "default", badge: "Ready", badgeTone: "default" } : n)),
                    );
                  }}
                />
              </label>
            </div>
          </aside>
        ) : null}

        {/* Bottom Run Test Drawer */}
        {runOpen ? (
          <section className="af-wb__rundrawer" aria-label="Test run" data-wb-stop="">
            <div className="af-wb__runbar">
              <div className="af-wb__runtabs">
                {(["Payload", "Triggers", "Errors", "Timeline", "Runs"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="af-wb__runtab"
                    data-active={runTab === t || undefined}
                    onClick={() => setRunTab(t)}
                  >
                    <span>{t}</span>
                    {t === "Errors" ? <em className="af-wb__err-pill">1</em> : null}
                  </button>
                ))}
              </div>
              <div className="af-wb__runactions">
                <button type="button" className="af-sar-btn af-sar-btn--solid" onClick={runTestSimulation}>
                  Start test run
                </button>
                <button type="button" className="af-asf__mini-btn" aria-label="Close test drawer" onClick={() => setRunOpen(false)}>
                  <AfIcon name="x" size={12} />
                </button>
              </div>
            </div>
            <pre className="af-wb__runbody">
              {runTab === "Errors"
                ? `Document upload: Choose where events come from before publishing.`
                : `{\n  "event": "auth.user_created",\n  "user": { "name": "Elena Rostova", "domain": "velo-nord.eu" },\n  "plan": "Pro"\n}`}
            </pre>
          </section>
        ) : null}

        {/* Bottom Floating Canvas Toolbar */}
        <div className="af-wb__toolbar" data-wb-stop="" style={runOpen ? { bottom: 158 } : undefined}>
          <AfTooltip content="Toggle nodes" side="top">
            <button
              type="button"
              className="af-wb__tbtn"
              data-active={paletteOpen || undefined}
              aria-label="Toggle nodes"
              onClick={() => setPaletteOpen((v) => !v)}
            >
              <AfIcon name="plus" size={13} />
            </button>
          </AfTooltip>
          <span className="af-wb__tdiv" aria-hidden="true" />
          <AfTooltip content="Select" side="top">
            <button
              type="button"
              className="af-wb__tbtn"
              data-active={toolMode === "select" || undefined}
              aria-label="Select tool"
              onClick={() => setToolMode("select")}
            >
              <CursorToolSvg />
            </button>
          </AfTooltip>
          <AfTooltip content="Comment" side="top">
            <button
              type="button"
              className="af-wb__tbtn"
              data-active={toolMode === "comment" || undefined}
              aria-label="Add comment"
              onClick={() => setToolMode("comment")}
            >
              <AfIcon name="message" size={13} />
            </button>
          </AfTooltip>
          <span className="af-wb__tdiv" aria-hidden="true" />
          <AfTooltip content="Fit view" side="top">
            <button
              type="button"
              className="af-wb__tbtn"
              aria-label="Fit view"
              onClick={() => {
                setZoom(0.94);
                setPan({ x: 306, y: 74 });
              }}
            >
              <AfIcon name="maximize" size={12} />
            </button>
          </AfTooltip>
          <button
            type="button"
            className="af-wb__tbtn"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
          >
            <AfIcon name="minus" size={12} />
          </button>
          <span className="af-wb__zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="af-wb__tbtn"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
          >
            <AfIcon name="plus" size={12} />
          </button>
          <span className="af-wb__tdiv" aria-hidden="true" />
          <AfTooltip content="Test run" side="top">
            <button
              type="button"
              className="af-wb__play"
              aria-label="Run workflow"
              onClick={runTestSimulation}
            >
              <AfIcon name="play" size={12} />
            </button>
          </AfTooltip>
        </div>
      </div>
    </AfAppShellFlat>
  );
}
