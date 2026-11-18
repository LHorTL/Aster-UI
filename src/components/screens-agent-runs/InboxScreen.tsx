import {
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
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

export type AfInboxOption = {
  id: string;
  title: string;
  summary?: string;
  recommended?: boolean;
  pros?: string[];
  cons?: string[];
};

export type AfInboxItem = {
  id: string;
  kind: "decision" | "pick" | "approval" | "question";
  question: string;
  context?: string;
  task: string;
  at: number;
  ageShort?: string;
  ageLong?: string;
  unread?: boolean;
  options?: AfInboxOption[];
  facts?: { label: string; value: string }[];
  suggestions?: string[];
  done?: { answer: string; at: number; label?: string };
};

export type AfInboxTaskMeta = {
  goal?: string;
  project?: string;
  status?: string;
  started?: string;
  steps?: { label: string; done?: boolean; needsYou?: boolean }[];
  artifacts?: string[];
};

export type AfInboxProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  items?: AfInboxItem[];
  running?: number;
  defaultTab?: "open" | "done";
  defaultSelected?: string;
  onDecide?: (id: string, answer: { option?: string; text?: string } | "approve" | "decline") => void;
  onLater?: (id: string) => void;
  onReopen?: (id: string) => void;
  onSelect?: (id: string | null) => void;
  tasks?: Record<string, AfInboxTaskMeta>;
  artifacts?: Record<string, AfScreenArtifactPayload>;
  defaultOpenArtifacts?: { task: string; name: string }[];
};

export type AfAgentInboxScreenProps = AfInboxProps;

const NOW = Date.now();

const DEFAULT_INBOX_ITEMS: AfInboxItem[] = [
  {
    id: "queue",
    kind: "decision",
    question: "Which queue should the ingest service use?",
    context:
      "Events arrive in bursts of up to 20k a minute. The service needs retries, and a way to replay a day of events after a bad deploy.",
    task: "Ingest pipeline",
    at: NOW - 240_000,
    ageShort: "4m",
    ageLong: "4 minutes ago",
    unread: false,
    options: [
      {
        id: "kafka",
        title: "Kafka",
        recommended: true,
        summary: "A durable log – replay is built in",
        pros: ["Replays any day after a bad deploy", "Takes the bursts with room to spare"],
        cons: ["One more cluster to run", "Overkill below a thousand events a minute"],
      },
      {
        id: "sqs",
        title: "SQS",
        summary: "Managed, nothing to operate",
        pros: ["No servers, pay per message", "Retries and dead letters built in"],
        cons: ["No replay – a message is gone once read", "Ordering only in FIFO queues"],
      },
      {
        id: "pg",
        title: "Postgres queue",
        summary: "Use the database you already have",
        pros: ["Nothing new to deploy", "Jobs and data in one transaction"],
        cons: ["Won't keep up with the bursts", "Replay means writing it yourself"],
      },
    ],
  },
  {
    id: "empty-state",
    kind: "pick",
    question: "Which empty state for the dashboard?",
    context:
      "New accounts land on an empty analytics view until their first integration finishes syncing.",
    task: "Client dashboard",
    at: NOW - 1_080_000,
    ageShort: "18m",
    ageLong: "18 minutes ago",
    unread: true,
    options: [
      {
        id: "sample",
        title: "Interactive sample data",
        recommended: true,
        summary: "Preloaded Northwind metrics with a one-click banner to connect live data",
        pros: ["Shows chart interactions right away", "Zero blank space on first login"],
        cons: ["Needs clear sample badge so numbers aren't mistaken for live data"],
      },
      {
        id: "checklist",
        title: "Guided setup checklist",
        summary: "Three-step card for API key, webhook and first query",
        pros: ["Fastest path to first live event"],
        cons: ["Charts stay hidden until step 2 finishes"],
      },
    ],
  },
  {
    id: "weekly-update",
    kind: "approval",
    question: "Send the weekly update to Northwind?",
    context:
      "Summarized 14 merged pull requests, staging load-test results, and Tuesday's schema rollout window.",
    task: "Weekly update",
    at: NOW - 2_520_000,
    ageShort: "42m",
    ageLong: "42 minutes ago",
    unread: true,
    facts: [
      { label: "Recipients", value: "#northwind-sync · 6 stakeholders" },
      { label: "Highlights", value: "20k/min load test passed, v2 schema ready" },
    ],
  },
  {
    id: "launch-tone",
    kind: "question",
    question: "What tone should the launch post have?",
    context:
      "Writing the announcement for replayable event pipelines aimed at staff and platform engineers.",
    task: "Launch post",
    at: NOW - 3_600_000,
    ageShort: "1h",
    ageLong: "1 hour ago",
    suggestions: ["Direct & benchmark-led", "Customer story first", "Concise changelog"],
  },
  {
    id: "api-v1",
    kind: "decision",
    question: "Keep the old API until March or drop it now?",
    context:
      "Only 3 legacy workspaces still call /v1/events, representing 0.4% of daily ingest volume.",
    task: "API migration",
    at: NOW - 10_800_000,
    ageShort: "3h",
    ageLong: "3 hours ago",
    options: [
      {
        id: "march",
        title: "Keep until March 31",
        recommended: true,
        summary: "Maintain thin compatibility shim for 90 days",
        pros: ["Zero disruption for the 3 remaining customers"],
        cons: ["Keeps v1 adapter tests in CI"],
      },
      {
        id: "drop",
        title: "Sunset in 14 days",
        summary: "Send migration notice and remove shim next sprint",
        pros: ["Deletes 1,800 lines of legacy transform code"],
        cons: ["Requires hands-on migration call this week"],
      },
    ],
  },
];

const DEFAULT_TASK_META: Record<string, AfInboxTaskMeta> = {
  "Ingest pipeline": {
    goal: "Take in Northwind's order events and keep a day of them to replay after a bad deploy.",
    status: "Waiting on you",
    project: "Northwind",
    started: "Mon, Nov 3",
    steps: [
      { label: "Draft the event schema", done: true },
      { label: "Load test at 20k a minute", done: true },
      { label: "Pick a queue", done: false, needsYou: true },
      { label: "Deploy to staging", done: false },
    ],
    artifacts: ["ingest-design.md", "load-test-results.csv", "event-schema.json", "staging"],
  },
  "Client dashboard": {
    goal: "Design and ship the overview analytics view for new Northwind workspaces.",
    status: "Waiting on you",
    project: "Northwind",
    started: "Tue, Nov 4",
    steps: [
      { label: "Audit onboarding funnel", done: true },
      { label: "Choose empty state", done: false, needsYou: true },
      { label: "Wire live metrics query", done: false },
    ],
    artifacts: ["ingest-design.md"],
  },
  "Weekly update": {
    goal: "Compile engineering progress and send Friday stakeholder digest.",
    status: "Ready to send",
    project: "Northwind",
    started: "Fri, Nov 7",
    steps: [
      { label: "Collect merged PRs", done: true },
      { label: "Draft summary", done: true },
      { label: "Approve send", done: false, needsYou: true },
    ],
    artifacts: ["load-test-results.csv"],
  },
};

function InboxKindIcon({ kind }: { kind: AfInboxItem["kind"] }) {
  if (kind === "decision") {
    return (
      <span className="af-ib__kind" data-kind="decision" aria-hidden="true">
        <AfIcon name="gitBranch" size={12} />
      </span>
    );
  }
  if (kind === "pick") {
    return (
      <span className="af-ib__kind" data-kind="pick" aria-hidden="true">
        <AfIcon name="grid" size={12} />
      </span>
    );
  }
  if (kind === "approval") {
    return (
      <span className="af-ib__kind" data-kind="approval" aria-hidden="true">
        <AfIcon name="checkCircle" size={12} />
      </span>
    );
  }
  return (
    <span className="af-ib__kind" data-kind="question" aria-hidden="true">
      <AfIcon name="help" size={12} />
    </span>
  );
}

function formatShortAge(item: AfInboxItem): string {
  if (item.ageShort) return item.ageShort;
  const mins = Math.max(1, Math.round((NOW - item.at) / 60_000));
  return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
}

function formatLongAge(item: AfInboxItem): string {
  if (item.ageLong) return item.ageLong;
  const mins = Math.max(1, Math.round((NOW - item.at) / 60_000));
  return mins < 60 ? `${mins} minutes ago` : `${Math.round(mins / 60)} hours ago`;
}

const INBOX_GROUPS: AfShellGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Settings", icon: "settings" }],
  },
];

/** 编排器待人工拍板收件箱（Agent / Inbox）：对应 affectUI `inbox`。 */
export function AfInbox({
  onNavigate,
  workspace = "Fieldwork",
  items: itemsProp,
  running = 3,
  defaultTab = "open",
  defaultSelected,
  onDecide,
  onLater,
  onReopen,
  onSelect,
  tasks: tasksProp,
  artifacts: artifactsProp,
  defaultOpenArtifacts = [
    { task: "Ingest pipeline", name: "ingest-design.md" },
    { task: "Ingest pipeline", name: "load-test-results.csv" },
  ],
  className,
  ...rest
}: AfInboxProps) {
  const [activeNav, setActiveNav] = useState("Inbox");
  const [items, setItems] = useState<AfInboxItem[]>(() => itemsProp ?? DEFAULT_INBOX_ITEMS);
  const [tab, setTab] = useState<"open" | "done">(defaultTab);

  const openList = useMemo(() => items.filter((i) => !i.done), [items]);
  const doneList = useMemo(() => items.filter((i) => Boolean(i.done)), [items]);
  const visibleList = tab === "open" ? openList : doneList;

  const [selectedId, setSelectedId] = useState<string | null>(
    defaultSelected ?? openList[0]?.id ?? items[0]?.id ?? null,
  );
  const currentItem = useMemo(
    () => visibleList.find((i) => i.id === selectedId) ?? visibleList[0] ?? null,
    [selectedId, visibleList],
  );

  const [pickedOptionMap, setPickedOptionMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (itemsProp ?? DEFAULT_INBOX_ITEMS).forEach((it) => {
      const rec = it.options?.find((o) => o.recommended) ?? it.options?.[0];
      if (rec) map[it.id] = rec.id;
    });
    return map;
  });
  const [replyDraft, setReplyDraft] = useState("");

  // Controlled right work area tabs
  const [panelOpen, setPanelOpen] = useState(true);
  const [openArtNames, setOpenArtNames] = useState<string[]>(() =>
    defaultOpenArtifacts.map((a) => a.name),
  );
  const [activeRightTab, setActiveRightTab] = useState<string>("task-main");

  const taskMetaMap = useMemo(() => ({ ...DEFAULT_TASK_META, ...tasksProp }), [tasksProp]);
  const artifactMap = useMemo(
    () => ({ ...DEFAULT_NORTHWIND_ARTIFACTS, ...artifactsProp }),
    [artifactsProp],
  );

  const navItems = useMemo<AfShellNavItem[]>(
    () => [
      { label: "Thread", icon: "message" },
      { label: "Inbox", icon: "inbox", badge: openList.length > 0 ? openList.length : undefined },
      { label: "Tasks", icon: "checkCircle" },
      { label: "Memory", icon: "database" },
    ],
    [openList.length],
  );

  const selectItem = (item: AfInboxItem) => {
    setSelectedId(item.id);
    setActiveRightTab("task-main");
    if (item.unread) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, unread: false } : x)));
    }
    onSelect?.(item.id);
  };

  const submitAnswer = (customAnswer?: "approve" | "decline") => {
    if (!currentItem) return;
    const pickedOptId = pickedOptionMap[currentItem.id];
    const pickedOpt = currentItem.options?.find((o) => o.id === pickedOptId);
    const label =
      customAnswer === "approve"
        ? "Approved"
        : customAnswer === "decline"
          ? "Declined"
          : replyDraft.trim() || pickedOpt?.title || "Answered";

    if (customAnswer) {
      onDecide?.(currentItem.id, customAnswer);
    } else {
      onDecide?.(currentItem.id, {
        option: pickedOptId,
        text: replyDraft.trim() || undefined,
      });
    }

    setReplyDraft("");
    setItems((prev) =>
      prev.map((x) =>
        x.id === currentItem.id ? { ...x, unread: false, done: { answer: label, at: Date.now(), label } } : x,
      ),
    );
    const nextOpen = openList.find((x) => x.id !== currentItem.id);
    setSelectedId(nextOpen?.id ?? null);
  };

  const deferItem = () => {
    if (!currentItem) return;
    onLater?.(currentItem.id);
    setItems((prev) => {
      const restItems = prev.filter((x) => x.id !== currentItem.id);
      return [...restItems, { ...currentItem, unread: false }];
    });
    const nextOpen = openList.find((x) => x.id !== currentItem.id);
    if (nextOpen) setSelectedId(nextOpen.id);
  };

  const openArtifactTab = (artName: string) => {
    setPanelOpen(true);
    setOpenArtNames((prev) => (prev.includes(artName) ? prev : [...prev, artName]));
    setActiveRightTab(`art:${artName}`);
  };

  const currentTaskName = currentItem?.task ?? "Ingest pipeline";
  const currentTaskMeta = taskMetaMap[currentTaskName] ?? DEFAULT_TASK_META["Ingest pipeline"]!;
  const doneStepsCount = currentTaskMeta.steps?.filter((s) => s.done).length ?? 2;
  const totalStepsCount = currentTaskMeta.steps?.length ?? 4;

  const renderTaskPanel = () => (
    <div className="af-sar-panel">
      {currentTaskMeta.goal ? <p className="af-sar-panel__goal">{currentTaskMeta.goal}</p> : null}

      <dl className="af-sar-props">
        <div className="af-sar-props__row">
          <dt>Status</dt>
          <dd>
            <StepProgressRing done={doneStepsCount} total={totalStepsCount} tone="amber" />
            <span>{currentTaskMeta.status ?? "Waiting on you"}</span>
            <em className="af-sar-props__frac">
              {doneStepsCount}/{totalStepsCount}
            </em>
          </dd>
        </div>
        {currentTaskMeta.project ? (
          <div className="af-sar-props__row">
            <dt>Project</dt>
            <dd>{currentTaskMeta.project}</dd>
          </div>
        ) : null}
        {currentTaskMeta.started ? (
          <div className="af-sar-props__row">
            <dt>Started</dt>
            <dd>{currentTaskMeta.started}</dd>
          </div>
        ) : null}
      </dl>

      {currentTaskMeta.steps && currentTaskMeta.steps.length > 0 ? (
        <div className="af-sar-sec">
          <div className="af-sar-sec__head">
            <span>Steps</span>
          </div>
          <ul className="af-sar-steps">
            {currentTaskMeta.steps.map((s) => (
              <li key={s.label} className="af-sar-step" data-done={s.done || undefined} data-needs={s.needsYou || undefined}>
                <span className="af-sar-step__dot" aria-hidden="true">
                  {s.done ? <AfIcon name="check" size={9} /> : null}
                </span>
                <span className="af-sar-step__label">{s.label}</span>
                {s.needsYou ? <span className="af-sar-badge af-sar-badge--amber">Needs you</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {currentTaskMeta.artifacts && currentTaskMeta.artifacts.length > 0 ? (
        <div className="af-sar-sec">
          <div className="af-sar-sec__head">
            <span>Artifacts</span>
            <em>{currentTaskMeta.artifacts.length}</em>
          </div>
          <div className="af-sar-artchips">
            {currentTaskMeta.artifacts.map((art) => {
              const isFolder = !art.includes(".");
              const isCsv = art.endsWith(".csv");
              return (
                <button
                  key={art}
                  type="button"
                  className="af-sar-artchip"
                  onClick={() => openArtifactTab(art)}
                >
                  <AfIcon name={isFolder ? "folder" : isCsv ? "kanban" : "file"} size={11} />
                  <span>{art}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const workTabs = useMemo<AfWorkAreaTab[]>(() => {
    const list: AfWorkAreaTab[] = [
      {
        id: "task-main",
        title: currentTaskName,
        kind: "custom",
        icon: <AfIcon name="checkCircle" size={12} />,
        content: renderTaskPanel(),
      },
    ];
    openArtNames.forEach((name) => {
      const kind = !name.includes(".") ? "custom" : name.endsWith(".csv") ? "sheet" : name.endsWith(".json") ? "code" : "document";
      list.push({
        id: `art:${name}`,
        title: name,
        kind,
        content: <SharedArtifactPane name={name} artifact={artifactMap[name]} />,
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactMap, currentTaskMeta, currentTaskName, openArtNames]);

  const onDetailKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!currentItem?.options) return;
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const idx = Number(e.key) - 1;
    if (idx >= 0 && idx < currentItem.options.length) {
      const target = currentItem.options[idx];
      if (target) {
        setPickedOptionMap((prev) => ({ ...prev, [currentItem.id]: target.id }));
      }
    }
  };

  return (
    <AfAppShellFlat
      layout="inset"
      header={false}
      workspace={workspace}
      nav={navItems}
      groups={INBOX_GROUPS}
      projects={[]}
      chats={[]}
      sideCards={false}
      active={activeNav}
      onNavigate={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      workArea={{
        open: panelOpen,
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
        onNewTab: () => {
          const allArts = currentTaskMeta.artifacts ?? Object.keys(artifactMap);
          const nextArt = allArts.find((a) => !openArtNames.includes(a)) ?? allArts[0];
          if (nextArt) openArtifactTab(nextArt);
        },
        width: 312,
      }}
      className={cn("af-sar-shell", className)}
      {...rest}
    >
      <div className="af-ib" onKeyDown={onDetailKeyDown}>
        {/* Left Queue Column */}
        <aside className="af-ib__queue" aria-label="Inbox queue">
          <div className="af-ib__qhead">
            <div className="af-ib__qtitle">
              <strong>Inbox</strong>
              <span>{openList.length}</span>
            </div>
            <div className="af-sar-seg" role="tablist" aria-label="Filter inbox">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "open"}
                data-active={tab === "open" || undefined}
                onClick={() => {
                  setTab("open");
                  setSelectedId(openList[0]?.id ?? null);
                }}
              >
                Open
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "done"}
                data-active={tab === "done" || undefined}
                onClick={() => {
                  setTab("done");
                  setSelectedId(doneList[0]?.id ?? null);
                }}
              >
                Done
              </button>
            </div>
          </div>

          <div className="af-ib__qlist" role="listbox" aria-label="Questions">
            {visibleList.map((item) => {
              const selected = item.id === currentItem?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="af-ib__qitem"
                  data-selected={selected || undefined}
                  onClick={() => selectItem(item)}
                >
                  <InboxKindIcon kind={item.kind} />
                  <span className="af-ib__qbody">
                    <span className="af-ib__qq">{item.question}</span>
                    <span className="af-ib__qsub">
                      {item.task} · {formatShortAge(item)}
                    </span>
                  </span>
                  {item.unread ? <span className="af-ib__unread" aria-label="Unread" /> : null}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Decision Detail */}
        <section className="af-ib__main" aria-label="Decision detail">
          {!currentItem ? (
            <div className="af-ib__empty">
              <AfIcon name="checkCircle" size={20} />
              <strong>All caught up</strong>
              <p>{running} tasks continue running in the background.</p>
            </div>
          ) : (
            <>
              <div className="af-ib__scroll">
                <div className="af-ib__meta">
                  <InboxKindIcon kind={currentItem.kind} />
                  <span>
                    {currentItem.task} · {formatLongAge(currentItem)}
                  </span>
                </div>

                <h2 className="af-ib__question">{currentItem.question}</h2>

                {currentItem.context ? <p className="af-ib__context">{currentItem.context}</p> : null}

                {currentItem.options && currentItem.options.length > 0 ? (
                  <div className="af-ib__options" role="radiogroup" aria-label={currentItem.question}>
                    {currentItem.options.map((opt, idx) => {
                      const picked = pickedOptionMap[currentItem.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={picked}
                          className="af-ib__opt"
                          data-picked={picked || undefined}
                          onClick={() => setPickedOptionMap((prev) => ({ ...prev, [currentItem.id]: opt.id }))}
                        >
                          <div className="af-ib__opt-top">
                            <span className="af-ib__keycap">{idx + 1}</span>
                            <div className="af-ib__opt-head">
                              <div className="af-ib__opt-titleline">
                                <strong>{opt.title}</strong>
                                {opt.recommended ? (
                                  <span className="af-sar-badge af-sar-badge--blue">Recommended</span>
                                ) : null}
                              </div>
                              {opt.summary ? <span className="af-ib__opt-sum">{opt.summary}</span> : null}
                            </div>
                          </div>

                          {picked && ((opt.pros && opt.pros.length > 0) || (opt.cons && opt.cons.length > 0)) ? (
                            <div className="af-ib__proscons">
                              {opt.pros?.map((p) => (
                                <div key={p} className="af-ib__pc" data-sign="pro">
                                  <span aria-hidden="true">+</span>
                                  <span>{p}</span>
                                </div>
                              ))}
                              {opt.cons?.map((c) => (
                                <div key={c} className="af-ib__pc" data-sign="con">
                                  <span aria-hidden="true">–</span>
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {currentItem.facts && currentItem.facts.length > 0 ? (
                  <dl className="af-sar-props af-ib__facts">
                    {currentItem.facts.map((f) => (
                      <div key={f.label} className="af-sar-props__row">
                        <dt>{f.label}</dt>
                        <dd>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {currentItem.suggestions && currentItem.suggestions.length > 0 ? (
                  <div className="af-ib__sugs">
                    {currentItem.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="af-sar-artchip"
                        onClick={() => setReplyDraft(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {currentItem.done ? (
                <footer className="af-ib__foot">
                  <span className="af-ib__done-note">Answered: {currentItem.done.answer}</span>
                  <button
                    type="button"
                    className="af-sar-btn"
                    onClick={() => {
                      onReopen?.(currentItem.id);
                      setItems((prev) => prev.map((x) => (x.id === currentItem.id ? { ...x, done: undefined } : x)));
                      setTab("open");
                    }}
                  >
                    Reopen
                  </button>
                </footer>
              ) : (
                <footer className="af-ib__foot">
                  <input
                    type="text"
                    className="af-ib__input"
                    aria-label="Custom instruction"
                    placeholder="Or tell it something else…"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                  />
                  <div className="af-ib__fbtns">
                    <button type="button" className="af-sar-btn" onClick={deferItem}>
                      Later
                    </button>
                    {currentItem.kind === "approval" && !currentItem.options ? (
                      <>
                        <button type="button" className="af-sar-btn" onClick={() => submitAnswer("decline")}>
                          Decline
                        </button>
                        <button
                          type="button"
                          className="af-sar-btn af-sar-btn--solid"
                          onClick={() => submitAnswer("approve")}
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="af-sar-btn af-sar-btn--solid"
                        onClick={() => submitAnswer()}
                      >
                        Send
                      </button>
                    )}
                  </div>
                </footer>
              )}
            </>
          )}
        </section>
      </div>
    </AfAppShellFlat>
  );
}

export const AfAgentInboxScreen = AfInbox;
