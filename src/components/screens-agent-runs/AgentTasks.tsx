import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { AfInput } from "../controls/Input";
import { AfModal } from "../overlay/Modal";
import {
  AfAppShellFlat,
  type AfShellGroup,
  type AfShellNavItem,
  type AfWorkAreaTab,
} from "../screens-onboarding/AppShellFlat";
import {
  DEFAULT_NORTHWIND_ARTIFACTS,
  SharedArtifactPane,
  StepProgressRing,
  type AfScreenArtifactPayload,
} from "./shared";

export type AfAgentTaskAsk = {
  id: string;
  question: string;
  kind?: "decision" | "pick" | "approval" | "question";
};

export type AfAgentTaskItem = {
  id: string;
  title: string;
  project: string;
  status?: "planning" | "running" | "paused" | "done";
  statusText?: string;
  steps?: { label: string; done?: boolean; needsYou?: boolean }[];
  stepFraction?: [number, number];
  artifactCount?: number;
  artifacts?: string[];
  asks?: AfAgentTaskAsk[];
  needs?: number;
  updatedAt: number;
  ageShort?: string;
  done?: string | boolean;
  goal?: string;
  started?: string;
  history?: { text: string; at?: string }[];
  decided?: { question: string; answer: string; at: string }[];
};

export type AfAgentTasksProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  tasks?: AfAgentTaskItem[];
  projects?: string[];
  artifacts?: Record<string, AfScreenArtifactPayload>;
  defaultTab?: "active" | "done";
  defaultSelected?: string | null;
  onSelect?: (id: string) => void;
  onCreate?: (task: AfAgentTaskItem) => void;
  onOpenInbox?: (taskId: string, itemId?: string) => void;
  onOpenArtifact?: (task: string, name: string) => void;
  onArtifactChange?: (name: string, content: string) => void;
};

const BASE_TS = Date.now();

const DEFAULT_TASK_ITEMS: AfAgentTaskItem[] = [
  {
    id: "ingest",
    title: "Ingest pipeline",
    project: "Northwind",
    status: "running",
    statusText: "Picking a queue",
    updatedAt: BASE_TS - 240_000,
    ageShort: "4m",
    stepFraction: [2, 4],
    artifactCount: 4,
    goal: "Take in Northwind's order events and keep a day of them to replay after a bad deploy.",
    started: "Mon, Nov 3",
    asks: [{ id: "queue", question: "Which queue should the ingest service use?", kind: "decision" }],
    steps: [
      { label: "Draft the event schema", done: true },
      { label: "Load test at 20k a minute", done: true },
      { label: "Pick a queue", done: false, needsYou: true },
      { label: "Deploy to staging", done: false },
    ],
    artifacts: ["ingest-design.md", "load-test-results.csv", "event-schema.json", "staging"],
    history: [
      { text: "Asked you which queue to use" },
      { text: "Load test passed at 20k events a minute" },
      { text: "Wrote the design doc and the event schema" },
    ],
    decided: [{ question: "Which format for the events?", answer: "JSON with a version field", at: "3 days ago" }],
  },
  {
    id: "dashboard",
    title: "Client dashboard",
    project: "Northwind",
    status: "running",
    statusText: "Choosing an empty state",
    updatedAt: BASE_TS - 1_080_000,
    ageShort: "18m",
    stepFraction: [1, 3],
    artifactCount: 3,
    started: "Tue, Nov 4",
    goal: "Ship the customer-facing analytics overview for Northwind workspaces.",
    asks: [{ id: "empty-state", question: "Which empty state for the dashboard?", kind: "pick" }],
    steps: [
      { label: "Audit onboarding funnel", done: true },
      { label: "Choose an empty state", done: false, needsYou: true },
      { label: "Connect live metrics", done: false },
    ],
    artifacts: ["ingest-design.md", "load-test-results.csv", "event-schema.json"],
  },
  {
    id: "weekly",
    title: "Weekly update",
    project: "Northwind",
    status: "running",
    statusText: "Ready to send",
    updatedAt: BASE_TS - 2_520_000,
    ageShort: "42m",
    stepFraction: [2, 3],
    artifactCount: 1,
    started: "Fri, Nov 7",
    goal: "Summarize merged PRs and load test benchmarks for #northwind-sync.",
    asks: [{ id: "weekly-update", question: "Send the weekly update to Northwind?", kind: "approval" }],
    steps: [
      { label: "Collect merged pull requests", done: true },
      { label: "Draft stakeholder digest", done: true },
      { label: "Send update", done: false, needsYou: true },
    ],
    artifacts: ["ingest-design.md"],
  },
  {
    id: "emails",
    title: "Onboarding emails",
    project: "Northwind",
    status: "running",
    statusText: "Writing the draft",
    updatedAt: BASE_TS - 720_000,
    ageShort: "12m",
    stepFraction: [1, 3],
    artifactCount: 1,
    started: "Fri, Nov 7",
    goal: "Rewrite the three welcome emails in Northwind's updated tone.",
    steps: [
      { label: "Review tone guide", done: true },
      { label: "Write welcome sequence", done: false },
      { label: "Schedule templates", done: false },
    ],
    artifacts: ["ingest-design.md"],
  },
  {
    id: "billing",
    title: "Billing webhooks",
    project: "Platform",
    status: "running",
    statusText: "Deploying to staging",
    updatedAt: BASE_TS - 360_000,
    ageShort: "6m",
    stepFraction: [3, 4],
    artifactCount: 2,
    started: "Thu, Nov 6",
    goal: "Verify idempotency keys and deploy Stripe webhook retries to staging.",
    steps: [
      { label: "Add signature verification", done: true },
      { label: "Write replay integration tests", done: true },
      { label: "Open PR #482", done: true },
      { label: "Deploy to staging", done: false },
    ],
    artifacts: ["event-schema.json", "staging"],
  },
  {
    id: "api-mig",
    title: "API migration",
    project: "Platform",
    status: "running",
    statusText: "Deciding the v1 end date",
    updatedAt: BASE_TS - 10_800_000,
    ageShort: "3h",
    stepFraction: [2, 4],
    artifactCount: 2,
    started: "Mon, Nov 3",
    goal: "Migrate remaining v1 callers to /v2/events and sunset legacy handlers.",
    asks: [{ id: "api-v1", question: "Keep the old API until March or drop it now?", kind: "decision" }],
    steps: [
      { label: "Measure remaining v1 traffic", done: true },
      { label: "Draft customer migration guide", done: true },
      { label: "Confirm sunset date", done: false, needsYou: true },
      { label: "Remove v1 compatibility shim", done: false },
    ],
    artifacts: ["ingest-design.md", "event-schema.json"],
  },
  {
    id: "triage",
    title: "Support triage",
    project: "Platform",
    status: "running",
    statusText: "Rolling out to all queues",
    updatedAt: BASE_TS - 1_500_000,
    ageShort: "25m",
    stepFraction: [2, 3],
    artifactCount: 2,
    started: "Wed, Nov 5",
    goal: "Route incoming tickets with automatic log attachment and severity tags.",
    steps: [
      { label: "Backtest classifier on 500 tickets", done: true },
      { label: "Enable shadow tagging", done: true },
      { label: "Roll out to all queues", done: false },
    ],
    artifacts: ["load-test-results.csv", "staging"],
  },
  {
    id: "launch",
    title: "Launch post",
    project: "Evalkit",
    status: "running",
    statusText: "Picking the tone",
    updatedAt: BASE_TS - 3_600_000,
    ageShort: "1h",
    stepFraction: [1, 4],
    artifactCount: 2,
    started: "Thu, Nov 6",
    goal: "Draft technical launch post and benchmark charts for Evalkit 1.0.",
    asks: [{ id: "launch-tone", question: "What tone should the launch post have?", kind: "question" }],
    steps: [
      { label: "Collect benchmark figures", done: true },
      { label: "Pick announcement tone", done: false, needsYou: true },
      { label: "Write first draft", done: false },
      { label: "Publish blog & changelog", done: false },
    ],
    artifacts: ["ingest-design.md", "load-test-results.csv"],
  },
  {
    id: "bench",
    title: "Benchmark suite",
    project: "Evalkit",
    status: "running",
    statusText: "Running the evals",
    updatedAt: BASE_TS - 120_000,
    ageShort: "2m",
    stepFraction: [3, 5],
    artifactCount: 1,
    started: "Fri, Nov 7",
    goal: "Run latency and accuracy evals across 5 candidate models.",
    steps: [
      { label: "Freeze 240-prompt dataset", done: true },
      { label: "Warm model endpoints", done: true },
      { label: "Run pass 1/2", done: true },
      { label: "Score structured outputs", done: false },
      { label: "Export comparison CSV", done: false },
    ],
    artifacts: ["load-test-results.csv"],
  },
  {
    id: "auth-keys",
    title: "Rotate webhook signing keys",
    project: "Platform",
    status: "done",
    done: true,
    statusText: "Completed",
    updatedAt: BASE_TS - 86_400_000,
    ageShort: "1d",
    stepFraction: [3, 3],
    artifactCount: 1,
    started: "Mon, Nov 3",
    goal: "Roll out dual-header HMAC key rotation with zero dropped deliveries.",
    steps: [
      { label: "Generate secondary signing key", done: true },
      { label: "Verify dual-signature consumers", done: true },
      { label: "Retire primary key", done: true },
    ],
    artifacts: ["event-schema.json"],
  },
];

const DEFAULT_PROJECTS = ["Northwind", "Platform", "Evalkit"];

const AT_GROUPS: AfShellGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Settings", icon: "settings" }],
  },
];

/** 按项目分组的任务总览（Agent / Tasks）：对应 affectUI `agent-tasks`。 */
export function AfAgentTasks({
  onNavigate,
  workspace = "Fieldwork",
  tasks: tasksProp,
  projects: projectsProp = DEFAULT_PROJECTS,
  artifacts: artifactsProp,
  defaultTab = "active",
  defaultSelected = "ingest",
  onSelect,
  onCreate,
  onOpenInbox,
  onOpenArtifact,
  onArtifactChange,
  className,
  ...rest
}: AfAgentTasksProps) {
  const [activeNav, setActiveNav] = useState("Tasks");
  const [tasks, setTasks] = useState<AfAgentTaskItem[]>(() => tasksProp ?? DEFAULT_TASK_ITEMS);
  const [tab, setTab] = useState<"active" | "done">(defaultTab);
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState(projectsProp[0] ?? "Northwind");

  const [panelOpen, setPanelOpen] = useState(true);
  const [openArtNames, setOpenArtNames] = useState<string[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<string>("task-main");

  const artifactMap = useMemo(
    () => ({ ...DEFAULT_NORTHWIND_ARTIFACTS, ...artifactsProp }),
    [artifactsProp],
  );

  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => Boolean(t.done)), [tasks]);
  const visibleTasks = tab === "active" ? activeTasks : doneTasks;

  const totalNeedsCount = useMemo(
    () => activeTasks.filter((t) => (t.asks && t.asks.length > 0) || (t.needs ?? 0) > 0).length,
    [activeTasks],
  );

  const selectedTask = useMemo(
    () => visibleTasks.find((t) => t.id === selectedId) ?? visibleTasks[0] ?? null,
    [selectedId, visibleTasks],
  );

  const navItems = useMemo<AfShellNavItem[]>(
    () => [
      { label: "Thread", icon: "message" },
      { label: "Inbox", icon: "inbox", badge: totalNeedsCount > 0 ? totalNeedsCount : undefined },
      { label: "Tasks", icon: "checkCircle" },
      { label: "Memory", icon: "database" },
    ],
    [totalNeedsCount],
  );

  const projectOrder = useMemo(() => {
    const seen = new Set<string>(projectsProp);
    visibleTasks.forEach((t) => seen.add(t.project));
    return Array.from(seen).filter((p) => visibleTasks.some((t) => t.project === p));
  }, [projectsProp, visibleTasks]);

  const openArtifactTab = (taskTitle: string, artName: string) => {
    setPanelOpen(true);
    setOpenArtNames((prev) => (prev.includes(artName) ? prev : [...prev, artName]));
    setActiveRightTab(`art:${artName}`);
    onOpenArtifact?.(taskTitle, artName);
  };

  const renderTaskInspector = (task: AfAgentTaskItem) => {
    const doneSteps = task.stepFraction?.[0] ?? task.steps?.filter((s) => s.done).length ?? 0;
    const totalSteps = task.stepFraction?.[1] ?? task.steps?.length ?? 1;
    const hasAsk = (task.asks && task.asks.length > 0) || (task.needs ?? 0) > 0;
    const firstAsk = task.asks?.[0];

    return (
      <div className="af-sar-panel af-at__panel">
        {task.goal ? <p className="af-sar-panel__goal">{task.goal}</p> : null}

        {hasAsk ? (
          <div className="af-at__callout">
            <div className="af-at__callout-top">
              <span className="af-sar-badge af-sar-badge--amber">Needs you</span>
              <span>{task.asks?.length ?? task.needs ?? 1} decision waiting</span>
            </div>
            <div className="af-at__callout-row">
              <strong>{firstAsk?.question ?? "Waiting for your input"}</strong>
              <button
                type="button"
                className="af-sar-btn af-sar-btn--solid"
                onClick={() => {
                  if (onOpenInbox) onOpenInbox(task.id, firstAsk?.id);
                  else onNavigate?.("Inbox");
                }}
              >
                Decide
              </button>
            </div>
          </div>
        ) : null}

        <dl className="af-sar-props">
          <div className="af-sar-props__row">
            <dt>Status</dt>
            <dd>
              <StepProgressRing done={doneSteps} total={totalSteps} tone={hasAsk ? "amber" : "blue"} />
              <span>{task.statusText ?? "Running"}</span>
              <em className="af-sar-props__frac">
                {doneSteps}/{totalSteps}
              </em>
            </dd>
          </div>
          <div className="af-sar-props__row">
            <dt>Project</dt>
            <dd>{task.project}</dd>
          </div>
          {task.started ? (
            <div className="af-sar-props__row">
              <dt>Started</dt>
              <dd>{task.started}</dd>
            </div>
          ) : null}
        </dl>

        {task.steps && task.steps.length > 0 ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>Steps</span>
            </div>
            <ul className="af-sar-steps">
              {task.steps.map((s) => (
                <li key={s.label} className="af-sar-step" data-done={s.done || undefined} data-needs={s.needsYou || undefined}>
                  <span className="af-sar-step__dot" aria-hidden="true">
                    {s.done ? <AfIcon name="check" size={9} /> : null}
                  </span>
                  <span className="af-sar-step__label">{s.label}</span>
                  {s.needsYou ? (
                    <span className="af-at__warn-tri" aria-label="Needs you">
                      <AfIcon name="alertTriangle" size={12} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {task.history && task.history.length > 0 ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>What happened so far</span>
            </div>
            <ul className="af-at__hist">
              {task.history.map((h) => (
                <li key={h.text}>{h.text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {task.artifacts && task.artifacts.length > 0 ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>Artifacts</span>
              <em>{task.artifacts.length}</em>
            </div>
            <div className="af-sar-artchips">
              {task.artifacts.map((art) => {
                const isFolder = !art.includes(".");
                const isCsv = art.endsWith(".csv");
                return (
                  <button
                    key={art}
                    type="button"
                    className="af-sar-artchip"
                    data-ftype={isFolder ? "folder" : isCsv ? "sheet" : "doc"}
                    onClick={() => openArtifactTab(task.title, art)}
                  >
                    <AfIcon name={isFolder ? "folder" : isCsv ? "kanban" : "file"} size={11} />
                    <span>{art}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {task.decided && task.decided.length > 0 ? (
          <div className="af-sar-sec">
            <div className="af-sar-sec__head">
              <span>Decided</span>
            </div>
            {task.decided.map((d) => (
              <div key={d.question} className="af-at__decided">
                <div className="af-at__dec-q">
                  <AfIcon name="check" size={11} />
                  <strong>{d.question}</strong>
                </div>
                <span className="af-at__dec-a">
                  {d.answer} · {d.at}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="af-at__show-agents">
          <button type="button" onClick={() => onNavigate?.("Agents")}>
            <span>Show agents</span>
            <AfIcon name="chevronRight" size={11} />
          </button>
        </div>
      </div>
    );
  };

  const workTabs = useMemo<AfWorkAreaTab[]>(() => {
    const list: AfWorkAreaTab[] = [];
    if (selectedTask) {
      list.push({
        id: "task-main",
        title: selectedTask.title,
        kind: "custom",
        icon: <AfIcon name="checkCircle" size={12} />,
        content: renderTaskInspector(selectedTask),
      });
    }
    openArtNames.forEach((name) => {
      const kind = !name.includes(".") ? "custom" : name.endsWith(".csv") ? "sheet" : name.endsWith(".json") ? "code" : "document";
      list.push({
        id: `art:${name}`,
        title: name,
        kind,
        content: (
          <SharedArtifactPane
            name={name}
            artifact={artifactMap[name]}
            onDocChange={(txt) => onArtifactChange?.(name, txt)}
          />
        ),
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactMap, openArtNames, selectedTask]);

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      nav={navItems}
      groups={AT_GROUPS}
      projects={[]}
      chats={[]}
      sideCards={false}
      active={activeNav}
      onNavigate={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      workArea={{
        open: panelOpen && workTabs.length > 0,
        onOpenChange: setPanelOpen,
        tabs: workTabs,
        activeTabId: activeRightTab,
        onActiveTabChange: setActiveRightTab,
        onTabClose: (id) => {
          if (id === "task-main") {
            setPanelOpen(false);
            return;
          }
          const artName = id.replace(/^art:/, "");
          setOpenArtNames((prev) => prev.filter((n) => n !== artName));
          if (activeRightTab === id) setActiveRightTab("task-main");
        },
        width: 316,
      }}
      className={cn("af-sar-shell", className)}
      {...rest}
    >
      <div className="af-at">
        <header className="af-at__bar">
          <div className="af-at__bleft">
            <div className="af-ib__qtitle">
              <strong>Tasks</strong>
              <span>{visibleTasks.length}</span>
            </div>
            <div className="af-sar-seg" role="tablist" aria-label="Task status">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "active"}
                data-active={tab === "active" || undefined}
                onClick={() => setTab("active")}
              >
                Active
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "done"}
                data-active={tab === "done" || undefined}
                onClick={() => setTab("done")}
              >
                Done
              </button>
            </div>
          </div>

          <button type="button" className="af-sar-btn" onClick={() => setCreateOpen(true)}>
            <AfIcon name="plus" size={11} />
            <span>New task</span>
          </button>
        </header>

        <div className="af-at__groups">
          {projectOrder.map((proj) => {
            const projTasks = visibleTasks.filter((t) => t.project === proj);
            const collapsed = Boolean(collapsedGroups[proj]);
            return (
              <section key={proj} className="af-at__group" aria-label={proj}>
                <button
                  type="button"
                  className="af-at__ghead"
                  aria-expanded={!collapsed}
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [proj]: !prev[proj] }))}
                >
                  <AfIcon name={collapsed ? "chevronRight" : "chevronDown"} size={11} />
                  <AfIcon name="folder" size={13} />
                  <strong>{proj}</strong>
                  <em>{projTasks.length}</em>
                </button>

                {!collapsed ? (
                  <div className="af-at__rows" role="listbox" aria-label={`${proj} tasks`}>
                    {projTasks.map((task) => {
                      const selected = task.id === selectedTask?.id;
                      const doneS = task.stepFraction?.[0] ?? task.steps?.filter((s) => s.done).length ?? 0;
                      const totalS = task.stepFraction?.[1] ?? task.steps?.length ?? 1;
                      const hasNeeds = (task.asks && task.asks.length > 0) || (task.needs ?? 0) > 0;
                      const artCount = task.artifactCount ?? task.artifacts?.length ?? 0;

                      return (
                        <button
                          key={task.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className="af-at__row"
                          data-selected={selected || undefined}
                          onClick={() => {
                            setSelectedId(task.id);
                            setPanelOpen(true);
                            setActiveRightTab("task-main");
                            onSelect?.(task.id);
                          }}
                        >
                          <span className="af-at__rleft">
                            <StepProgressRing done={doneS} total={totalS} tone={hasNeeds ? "amber" : "green"} />
                            <strong>{task.title}</strong>
                            {task.statusText ? <span className="af-at__rstatus">{task.statusText}</span> : null}
                          </span>

                          <span className="af-at__rright">
                            {hasNeeds ? (
                              <span className="af-sar-badge af-sar-badge--amber">Needs you</span>
                            ) : null}
                            <span className="af-at__rmeta">
                              {doneS}/{totalS}
                            </span>
                            {artCount > 0 ? (
                              <span className="af-at__rmeta">
                                <AfIcon name="file" size={10} />
                                {artCount}
                              </span>
                            ) : null}
                            <span className="af-at__rage">{task.ageShort ?? "5m"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <AfModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="New task"
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
                  const created: AfAgentTaskItem = {
                    id: `t-${Date.now()}`,
                    title: newTitle.trim(),
                    project: newProject.trim() || "Northwind",
                    status: "running",
                    statusText: "Planning steps",
                    updatedAt: Date.now(),
                    ageShort: "now",
                    stepFraction: [0, 3],
                    steps: [
                      { label: "Understand goal & context", done: false },
                      { label: "Execute changes", done: false },
                      { label: "Verify output", done: false },
                    ],
                  };
                  setTasks((prev) => [created, ...prev]);
                  onCreate?.(created);
                  setSelectedId(created.id);
                  setNewTitle("");
                  setCreateOpen(false);
                }}
              >
                Create task
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AfInput label="Goal" placeholder="What should Fieldwork handle?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <AfInput label="Project" value={newProject} onChange={(e) => setNewProject(e.target.value)} />
          </div>
        </AfModal>
      </div>
    </AfAppShellFlat>
  );
}
