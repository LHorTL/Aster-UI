import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { AfInput } from "../controls/Input";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfModal } from "../overlay/Modal";
import {
  AfAppShellFlat,
  type AfShellGroup,
  type AfShellNavItem,
  type AfWorkAreaTab,
} from "../screens-onboarding/AppShellFlat";
import { AgentPixelMark, WrenchIconSvg } from "./shared";

export type AfInboxBoardStatus = "waiting" | "failed" | "running" | "done" | "stopped";

export type AfInboxBoardAgent = {
  id: string;
  name: string;
  color?: string;
};

export type AfInboxBoardTask = {
  id: string;
  title: string;
  description?: string;
  agent: string;
  status: AfInboxBoardStatus;
  startedAt?: number;
  elapsed?: string;
  sources?: number;
  tools?: number;
  steps?: { label: string; time?: string }[];
};

export type AfAgentInboxBoardProps = HTMLAttributes<HTMLDivElement> & {
  tasks?: AfInboxBoardTask[];
  agents?: AfInboxBoardAgent[];
  defaultView?: "board" | "list";
  defaultOpen?: string | null;
  onApprove?: (task: AfInboxBoardTask) => void;
  onReject?: (task: AfInboxBoardTask) => void;
  onRetry?: (task: AfInboxBoardTask) => void;
  onOpen?: (task: AfInboxBoardTask) => void;
  onCreate?: (task: AfInboxBoardTask) => void;
  loading?: boolean;
  empty?: boolean;
  onNavigate?: (label: string) => void;
  workspace?: string;
};

const DEFAULT_AGENTS: AfInboxBoardAgent[] = [
  { id: "builder", name: "Builder", color: "#0190fe" },
  { id: "data", name: "Data", color: "#13b3a0" },
  { id: "reviewer", name: "Reviewer", color: "#a651f0" },
  { id: "writer", name: "Writer", color: "#ee3e9e" },
];

const DEFAULT_TASKS: AfInboxBoardTask[] = [
  {
    id: "migrate",
    title: "Migrate users table",
    description: "Split users into accounts and profiles on Postgres 17. The dry run on staging passed.",
    agent: "builder",
    status: "waiting",
    elapsed: "6m 12s",
    sources: 9,
    tools: 14,
    steps: [
      { label: "Read the schema and 14 migrations", time: "6m ago" },
      { label: "Wrote migration 0042_split_users", time: "4m ago" },
      { label: "Dry run on staging – no errors", time: "2m ago" },
      { label: "Wants to run it on production", time: "1m ago" },
    ],
  },
  {
    id: "crm",
    title: "Clean up CRM contacts",
    description: "Matched 1,312 likely duplicates, then the merge hit the API rate limit.",
    agent: "data",
    status: "failed",
    elapsed: "2m 14s",
    sources: 2,
    tools: 6,
    steps: [
      { label: "Scanned 8,400 contact records", time: "3m ago" },
      { label: "Matched 1,312 likely duplicates", time: "2m ago" },
      { label: "Merge batch hit 429 rate limit", time: "1m ago" },
    ],
  },
  {
    id: "pr-482",
    title: "Review PR #482",
    description: "Billing webhooks: reading the diff and the test run, writing comments.",
    agent: "reviewer",
    status: "running",
    elapsed: "3m 40s",
    sources: 12,
    tools: 21,
    steps: [
      { label: "Checked 19 changed files in PR #482", time: "3m ago" },
      { label: "Verified webhook signature tests", time: "1m ago" },
      { label: "Drafting inline review comments", time: "now" },
    ],
  },
  {
    id: "rel-24",
    title: "Release notes v2.4",
    description: "Grouping 23 merged pull requests into features and fixes.",
    agent: "writer",
    status: "running",
    elapsed: "1m 18s",
    sources: 23,
    tools: 5,
    steps: [
      { label: "Fetched 23 merged PRs since v2.3", time: "1m ago" },
      { label: "Grouping highlights by area", time: "now" },
    ],
  },
  {
    id: "dep-audit",
    title: "Dependency audit",
    description: "Checking 214 packages for known vulnerabilities and outdated majors.",
    agent: "data",
    status: "running",
    elapsed: "42s",
    sources: 3,
    tools: 4,
    steps: [{ label: "Scanning lockfile advisories", time: "now" }],
  },
  {
    id: "metrics",
    title: "Weekly metrics digest",
    description: "Pulled numbers from three dashboards and posted the summary to #metrics.",
    agent: "writer",
    status: "done",
    elapsed: "4m 12s",
    sources: 3,
    tools: 8,
    steps: [
      { label: "Queried activation, retention and MRR", time: "18m ago" },
      { label: "Posted summary to #metrics", time: "14m ago" },
    ],
  },
  {
    id: "welcome",
    title: "Onboarding emails",
    description: "Rewrote the three welcome emails in the brand voice and scheduled them.",
    agent: "writer",
    status: "done",
    elapsed: "7m 03s",
    sources: 5,
    tools: 11,
    steps: [
      { label: "Aligned copy with brand tone guide", time: "1h ago" },
      { label: "Scheduled 3 drip sequence templates", time: "54m ago" },
    ],
  },
];

const AIB_GROUPS: AfShellGroup[] = [
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

function StatusIndicator({ status, elapsed, detailed = false }: { status: AfInboxBoardStatus; elapsed?: string; detailed?: boolean }) {
  if (status === "waiting") {
    return (
      <span className="af-aib__status" data-tone="amber" data-detailed={detailed || undefined}>
        <span className="af-aib__status-glyph" aria-hidden="true">▲</span>
        {detailed ? (
          <>
            <span>Waiting for you</span>
            {elapsed ? <em>{elapsed}</em> : null}
          </>
        ) : (
          <span className="af-aib__status-time">{elapsed ?? "6m 12s"}</span>
        )}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="af-aib__status" data-tone="red" data-detailed={detailed || undefined}>
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "block", flex: "none" }}>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M7 4.2v3.3M7 9.7h.01" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>Failed</span>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="af-aib__status" data-tone="blue" data-detailed={detailed || undefined}>
        <span className="af-aib__spin" aria-hidden="true" />
        {detailed ? (
          <>
            <span>Running</span>
            {elapsed ? <em>{elapsed}</em> : null}
          </>
        ) : (
          <span className="af-aib__status-time">{elapsed ?? "1m 18s"}</span>
        )}
      </span>
    );
  }
  return (
    <span className="af-aib__status" data-tone="green" data-detailed={detailed || undefined}>
      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "block", flex: "none" }}>
        <circle cx="7" cy="7" r="6" fill="currentColor" />
        <path d="M4.5 7.2L6.2 8.85L9.55 5.35" stroke="#ffffff" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {detailed ? (
        <>
          <span>Done</span>
          {elapsed ? <em>{elapsed}</em> : null}
        </>
      ) : (
        <span className="af-aib__status-time">{elapsed ?? "4m 12s"}</span>
      )}
    </span>
  );
}

/** 后台 Agent 任务三列看板（Agent / Inbox Board）：对应 affectUI `agent-inbox-board`。 */
export function AfAgentInboxBoard({
  tasks: tasksProp,
  agents = DEFAULT_AGENTS,
  defaultView = "board",
  defaultOpen = "migrate",
  onApprove,
  onReject,
  onRetry,
  onOpen,
  onCreate,
  loading = false,
  empty = false,
  onNavigate,
  workspace = "Fieldwork",
  className,
  ...rest
}: AfAgentInboxBoardProps) {
  const [activeNav, setActiveNav] = useState("Inbox");
  const [tasks, setTasks] = useState<AfInboxBoardTask[]>(() => (empty ? [] : (tasksProp ?? DEFAULT_TASKS)));
  const [filterTab, setFilterTab] = useState<"all" | "needs" | "running" | "done">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">(defaultView);
  const [selectedId, setSelectedId] = useState<string | null>(defaultOpen);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const agentMap = useMemo(() => {
    const map: Record<string, AfInboxBoardAgent> = {};
    agents.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [agents]);

  const agentFilteredTasks = useMemo(
    () => (agentFilter === "all" ? tasks : tasks.filter((t) => t.agent === agentFilter)),
    [agentFilter, tasks],
  );

  const needsTasks = useMemo(
    () => agentFilteredTasks.filter((t) => t.status === "waiting" || t.status === "failed"),
    [agentFilteredTasks],
  );
  const runningTasks = useMemo(
    () => agentFilteredTasks.filter((t) => t.status === "running"),
    [agentFilteredTasks],
  );
  const doneTasks = useMemo(
    () => agentFilteredTasks.filter((t) => t.status === "done" || t.status === "stopped"),
    [agentFilteredTasks],
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [selectedId, tasks],
  );

  const navItems = useMemo<AfShellNavItem[]>(
    () => [
      { label: "Thread", icon: "message" },
      { label: "Inbox", icon: "inbox", badge: needsTasks.length > 0 ? needsTasks.length : undefined },
      { label: "Tasks", icon: "checkCircle" },
      { label: "Memory", icon: "database" },
      { label: "Skills", icon: "sparkle" },
    ],
    [needsTasks.length],
  );

  const agentMenuItems = useMemo<AfMenuItem[]>(
    () => [
      {
        id: "ag-all",
        type: "radio",
        checked: agentFilter === "all",
        label: "All agents",
        onSelect: () => setAgentFilter("all"),
      },
      { type: "separator" },
      ...agents.map((a) => ({
        id: `ag-${a.id}`,
        type: "radio" as const,
        checked: agentFilter === a.id,
        label: a.name,
        onSelect: () => setAgentFilter(a.id),
      })),
    ],
    [agentFilter, agents],
  );

  const updateStatus = (task: AfInboxBoardTask, nextStatus: AfInboxBoardStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
  };

  const renderInspector = (task: AfInboxBoardTask) => {
    const ag = agentMap[task.agent] ?? { id: task.agent, name: task.agent, color: "#0190fe" };
    return (
      <div className="af-sar-panel">
        <div className="af-aib__insp-head">
          <h3>{task.title}</h3>
          {task.description ? <p>{task.description}</p> : null}

          <div className="af-aib__insp-btns">
            {task.status === "waiting" ? (
              <>
                <button
                  type="button"
                  className="af-sar-btn af-sar-btn--solid"
                  onClick={() => {
                    onApprove?.(task);
                    updateStatus(task, "running");
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="af-sar-btn"
                  onClick={() => {
                    onReject?.(task);
                    updateStatus(task, "stopped");
                  }}
                >
                  Reject
                </button>
              </>
            ) : null}

            {task.status === "failed" ? (
              <button
                type="button"
                className="af-sar-btn af-sar-btn--solid"
                onClick={() => {
                  onRetry?.(task);
                  updateStatus(task, "running");
                }}
              >
                Retry
              </button>
            ) : null}

            {onOpen && (task.status === "running" || task.status === "done") ? (
              <button type="button" className="af-sar-btn" onClick={() => onOpen(task)}>
                Open
              </button>
            ) : null}
          </div>
        </div>

        <dl className="af-sar-props">
          <div className="af-sar-props__row">
            <dt>Status</dt>
            <dd>
              <StatusIndicator status={task.status} elapsed={task.elapsed} detailed />
            </dd>
          </div>
          <div className="af-sar-props__row">
            <dt>Agent</dt>
            <dd>
              <AgentPixelMark name={ag.name} color={ag.color} running={task.status === "running"} />
              <span>{ag.name}</span>
            </dd>
          </div>
          {task.sources !== undefined ? (
            <div className="af-sar-props__row">
              <dt>Sources</dt>
              <dd>
                <AfIcon name="search" size={11} />
                <span>{task.sources} read</span>
              </dd>
            </div>
          ) : null}
          {task.tools !== undefined ? (
            <div className="af-sar-props__row">
              <dt>Tools</dt>
              <dd>
                <WrenchIconSvg size={11} />
                <span>{task.tools} calls</span>
              </dd>
            </div>
          ) : null}
        </dl>

        {task.steps && task.steps.length > 0 ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>What it did</span>
              <em>{task.steps.length}</em>
            </div>
            <ul className="af-aib__log">
              {task.steps.map((s) => (
                <li key={s.label}>
                  <span className="af-aib__log-dot" aria-hidden="true" />
                  <span className="af-aib__log-text">{s.label}</span>
                  {s.time ? <time>{s.time}</time> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  const workTabs = useMemo<AfWorkAreaTab[]>(() => {
    if (!selectedTask) return [];
    const ag = agentMap[selectedTask.agent] ?? { id: selectedTask.agent, name: selectedTask.agent, color: "#0190fe" };
    return [
      {
        id: selectedTask.id,
        title: selectedTask.title,
        kind: "custom",
        icon: <AgentPixelMark name={ag.name} color={ag.color} />,
        content: renderInspector(selectedTask),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentMap, selectedTask]);

  const renderCard = (task: AfInboxBoardTask) => {
    const ag = agentMap[task.agent] ?? { id: task.agent, name: task.agent, color: "#0190fe" };
    const isSelected = selectedTask?.id === task.id;
    return (
      <button
        key={task.id}
        type="button"
        className="af-aib__card"
        data-selected={isSelected || undefined}
        onClick={() => setSelectedId(task.id)}
      >
        <div className="af-aib__card-top">
          <AgentPixelMark name={ag.name} color={ag.color} running={task.status === "running"} />
          <strong>{task.title}</strong>
        </div>
        {task.description ? <p className="af-aib__card-desc">{task.description}</p> : null}
        <div className="af-aib__card-foot">
          <StatusIndicator status={task.status} elapsed={task.elapsed} />
          <span className="af-aib__counts">
            {task.sources !== undefined ? (
              <span>
                <AfIcon name="search" size={10} />
                {task.sources}
              </span>
            ) : null}
            {task.tools !== undefined ? (
              <span>
                <WrenchIconSvg size={10} />
                {task.tools}
              </span>
            ) : null}
          </span>
        </div>
      </button>
    );
  };

  const columns = [
    { key: "needs" as const, label: "NEEDS YOU", tone: "amber", items: needsTasks },
    { key: "running" as const, label: "RUNNING", tone: "blue", items: runningTasks },
    { key: "done" as const, label: "DONE", tone: "green", items: doneTasks },
  ].filter((col) => filterTab === "all" || filterTab === col.key);

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      nav={navItems}
      groups={AIB_GROUPS}
      projects={[]}
      chats={[]}
      sideCards={false}
      active={activeNav}
      onNavigate={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      workArea={{
        open: Boolean(selectedTask),
        onOpenChange: (open) => {
          if (!open) setSelectedId(null);
          else if (!selectedId && tasks[0]) setSelectedId(tasks[0].id);
        },
        tabs: workTabs,
        activeTabId: selectedTask?.id,
        onTabClose: () => setSelectedId(null),
        allowNewTab: false,
        width: 300,
      }}
      className={cn("af-sar-shell", className)}
      {...rest}
    >
      <div className="af-aib">
        <header className="af-aib__bar">
          <div className="af-aib__filters" role="tablist" aria-label="Filter status">
            {[
              { id: "all" as const, label: "All tasks", count: agentFilteredTasks.length },
              { id: "needs" as const, label: "Needs you", count: needsTasks.length },
              { id: "running" as const, label: "Running", count: runningTasks.length },
              { id: "done" as const, label: "Done", count: doneTasks.length },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filterTab === f.id}
                className="af-aib__ftab"
                data-active={filterTab === f.id || undefined}
                onClick={() => setFilterTab(f.id)}
              >
                <span>{f.label}</span>
                <em>{f.count}</em>
              </button>
            ))}
          </div>

          <div className="af-aib__actions">
            <AfDropdownMenu items={agentMenuItems} side="bottom" align="end">
              <button type="button" className="af-sar-btn">
                <AfIcon name="filter" size={11} />
                <span>Agents</span>
              </button>
            </AfDropdownMenu>

            <div className="af-sar-seg" role="group" aria-label="View mode">
              <button
                type="button"
                aria-label="Board view"
                data-active={viewMode === "board" || undefined}
                onClick={() => setViewMode("board")}
              >
                <AfIcon name="kanban" size={12} />
              </button>
              <button
                type="button"
                aria-label="List view"
                data-active={viewMode === "list" || undefined}
                onClick={() => setViewMode("list")}
              >
                <AfIcon name="list" size={12} />
              </button>
            </div>

            <button
              type="button"
              className="af-sar-btn af-sar-btn--solid"
              onClick={() => setCreateOpen(true)}
            >
              <AfIcon name="plus" size={11} />
              <span>New task</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="af-aib__board">
            {[1, 2, 3].map((k) => (
              <div key={k} className="af-aib__col">
                <div className="af-wb__skel" style={{ height: 112 }} />
                <div className="af-wb__skel" style={{ height: 112 }} />
              </div>
            ))}
          </div>
        ) : viewMode === "board" ? (
          <div className="af-aib__board">
            {columns.map((col) => (
              <section key={col.key} className="af-aib__col" aria-label={col.label}>
                <div className="af-aib__col-head" data-tone={col.tone}>
                  <span className="af-aib__col-glyph" aria-hidden="true">
                    {col.key === "needs" ? (
                      "▲"
                    ) : col.key === "running" ? (
                      <span className="af-aib__spin" style={{ width: 9, height: 9 }} />
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ display: "block" }}>
                        <circle cx="7" cy="7" r="6" fill="currentColor" />
                        <path d="M4.5 7.2L6.2 8.85L9.55 5.35" stroke="#ffffff" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <strong className="af-aib__col-title">{col.label}</strong>
                  <em className="af-aib__col-count">{col.items.length}</em>
                </div>
                <div className="af-aib__col-list">{col.items.map(renderCard)}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="af-aib__list">{agentFilteredTasks.map(renderCard)}</div>
        )}

        <AfModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="New background task"
          width={380}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="af-sar-btn" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="af-sar-btn af-sar-btn--solid"
                onClick={() => {
                  if (!newTitle.trim()) return;
                  const created: AfInboxBoardTask = {
                    id: `task-${Date.now()}`,
                    title: newTitle.trim(),
                    description: newDesc.trim() || "Queued for background agent execution.",
                    agent: agents[0]?.id ?? "builder",
                    status: "running",
                    elapsed: "1s",
                    sources: 0,
                    tools: 0,
                  };
                  setTasks((prev) => [created, ...prev]);
                  onCreate?.(created);
                  setSelectedId(created.id);
                  setNewTitle("");
                  setNewDesc("");
                  setCreateOpen(false);
                }}
              >
                Start task
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AfInput label="Task" placeholder="e.g. Backfill billing events" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <AfInput label="Instructions" placeholder="What should the agent verify first?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
        </AfModal>
      </div>
    </AfAppShellFlat>
  );
}
