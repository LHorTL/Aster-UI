import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfTextarea } from "../controls/Textarea";
import { AfModelPicker } from "../chat/ModelPicker";
import type { PickerModel } from "../_shared/chat";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  artifactKindIcon,
  type AfChatScreenUser,
  type AfChatSidebarItem,
  type AfShellArtifact,
  type AfWorkAreaTabItem,
} from "./ChatShell";

export type AfThreadAttachment = {
  id: string;
  name: string;
  size?: string;
  progress?: number;
  status?: "uploading" | "done" | "failed";
};

export type AfThreadToolItem = {
  id: string;
  label: string;
  icon?: AffectIconKey;
  status: "running" | "done" | "failed" | "stopped";
  startedAt?: number;
  ms?: number;
  error?: string;
};

export type AfThreadTaskSummary = {
  id: string;
  title: string;
  status: string;
  steps?: { done: number; total: number };
  done?: boolean;
};

export type AfThreadDecisionAsk = {
  id: string;
  question: string;
  task: string;
  kind?: "decision" | "pick" | "approval";
};

export type AfThreadAgentPart =
  | { kind: "text"; text: string }
  | { kind: "tools"; id: string; tools: AfThreadToolItem[] }
  | { kind: "task"; task: AfThreadTaskSummary }
  | { kind: "decision"; ask: AfThreadDecisionAsk }
  | { kind: "artifacts"; names: string[] }
  | { kind: "error"; text: string; retry?: boolean };

export type AfThreadMessage =
  | {
      id: string;
      role: "user";
      text: string;
      at: string;
      answered?: string;
      attachments?: AfThreadAttachment[];
      status?: "sent" | "queued" | "sending" | "failed";
    }
  | {
      id: string;
      role: "agent";
      at: string;
      parts: AfThreadAgentPart[];
      streaming?: boolean;
      stopped?: boolean;
    };

export type AfThreadDecisionOption = {
  id: string;
  title: string;
  summary?: string;
  recommended?: boolean;
  wireframe?: boolean;
};

export type AfThreadDecision = {
  id: string;
  kind?: "decision" | "pick" | "approval";
  question: string;
  task: string;
  taskId?: string;
  options?: AfThreadDecisionOption[];
  facts?: { label: string; value: string }[];
};

export type AfThreadTaskDetail = {
  goal?: string;
  project?: string;
  started?: string;
  steps?: { label: string; done?: boolean }[];
  history?: { text: string; at: string }[];
  artifacts?: string[];
  decided?: { question: string; answer: string }[];
};

export type AfAgentThreadLabels = {
  title?: string;
  orchestrator?: string;
  placeholder?: string;
  offline?: string;
  backOnline?: string;
  waiting?: string;
  away?: string;
  markRead?: string;
  jump?: string;
  needsYou?: string;
  decide?: string;
  open?: string;
  retry?: string;
};

export type AfAgentThreadProps = HTMLAttributes<HTMLDivElement> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  messages?: AfThreadMessage[];
  onSend?: (text: string, attachments: AfThreadAttachment[]) => void;
  onStop?: () => void;
  onRetry?: (messageId: string) => void;
  connection?: "online" | "offline" | "reconnecting";
  onReconnect?: () => void;
  lastSeen?: number;
  awayAfter?: number;
  onMarkRead?: () => void;
  decisions?: AfThreadDecision[];
  onDecide?: (
    id: string,
    answer: { option?: string; text?: string } | "approve" | "decline",
  ) => void;
  onLater?: (id: string) => void;
  tasks?: Record<string, AfThreadTaskDetail>;
  onShowTask?: (taskId: string) => void;
  running?: { running: number; needs: number };
  onOpenTask?: (taskId: string) => void;
  onOpenInbox?: (itemId?: string) => void;
  artifacts?: Record<string, AfShellArtifact>;
  suggested?: { name: string; kind: AfShellArtifact["kind"]; subtitle?: string }[];
  models?: PickerModel[];
  upload?: (
    file: File,
    progress: (p: number) => void,
    signal: AbortSignal,
  ) => Promise<void>;
  transcribe?: (clip: AfThreadAttachment) => Promise<string>;
  simulate?: "live" | "scrolled" | "offline" | "uploading" | "dictating" | "away" | "error";
  labels?: AfAgentThreadLabels;
  user?: AfChatScreenUser;
  loading?: boolean;
  empty?: boolean;
};

const DEFAULT_THREAD_ARTIFACTS: Record<string, AfShellArtifact> = {
  "ingest-design.md": {
    id: "ingest-design.md",
    title: "ingest-design.md",
    kind: "document",
    subtitle: "Document · Event pipeline design",
    updated: "Updated 4m ago",
    doc: `# Ingest Service — Bridge Design\n\n## Throughput\nSustained 14,200 events/sec in staging with p99 publish latency under 92 ms.\n\n## Ordering & Replay\nPartition by org_id so tenant webhooks replay deterministically for 7 days without cross-tenant head-of-line blocking.`,
  },
  "load-test-results.csv": {
    id: "load-test-results.csv",
    title: "load-test-results.csv",
    kind: "sheet",
    subtitle: "Sheet · Staging k6 benchmark",
    headers: ["RPS", "p50 (ms)", "p99 (ms)", "Error rate"],
    rows: [
      { cells: ["5,000", "18", "44", "0.00%"] },
      { cells: ["10,000", "24", "68", "0.01%"] },
      { cells: ["14,200", "31", "92", "0.02%"] },
      { cells: ["Peak summary", "24", "68", "0.01%"], formula: "=AVERAGE(B2:B4)", total: true },
    ],
  },
};

const DEFAULT_TASKS: Record<string, AfThreadTaskDetail> = {
  "client-dashboard": {
    goal: "Design and build empty, loading and error states across Northwind's client dashboard.",
    project: "Northwind",
    started: "24m ago",
    steps: [
      { label: "Audit 6 dashboard views and empty states", done: true },
      { label: "Draw empty state components and copy", done: false },
      { label: "Wire sample dataset toggle", done: false },
    ],
    artifacts: ["ingest-design.md"],
  },
  "api-migration": {
    goal: "Move internal apps and webhook ingest onto the partitioned v2 event pipeline.",
    project: "Core Platform",
    started: "38m ago",
    steps: [
      { label: "Shadow traffic mirror in staging", done: true },
      { label: "Move billing & analytics workers", done: false },
      { label: "Choose production queue backend", done: false },
      { label: "Flip 10% canary traffic", done: false },
    ],
    artifacts: ["load-test-results.csv", "ingest-design.md"],
  },
};

const DEFAULT_DECISIONS: AfThreadDecision[] = [
  {
    id: "dec-queue",
    kind: "decision",
    question: "Which queue should back the ingest service?",
    task: "API migration",
    taskId: "api-migration",
    options: [
      {
        id: "Kafka",
        title: "Kafka (MSK)",
        summary: "7-day replay window and strict per-tenant partition ordering.",
        recommended: true,
      },
      {
        id: "SQS + SNS",
        title: "SQS FIFO + SNS",
        summary: "Zero broker ops, capped at 3,000 msg/s per message group.",
      },
      {
        id: "Redis Streams",
        title: "Redis Streams",
        summary: "Sub-5ms latency, memory-bound retention.",
      },
    ],
  },
  {
    id: "dec-canary",
    kind: "approval",
    question: "Roll out 10% staging-verified traffic to EU-West canary?",
    task: "API migration",
    taskId: "api-migration",
    facts: [
      { label: "Region", value: "eu-west-1 (10% of enterprise webhooks)" },
      { label: "Rollback", value: "Automatic on >0.1% 5xx over 60s" },
    ],
  },
];

const INITIAL_MESSAGES: AfThreadMessage[] = [
  {
    id: "m-0",
    role: "user",
    text: "Morning. Northwind first this week – the ingest pipeline, the client dashboard and the weekly update. Keep the API migration moving on the side.",
    at: "8:19 PM",
  },
  {
    id: "m-1",
    role: "agent",
    at: "8:20 PM",
    parts: [
      {
        kind: "tools",
        id: "tg-0",
        tools: [
          { id: "tl-01", label: "Read Northwind weekly roadmap", status: "done", ms: 700 },
          { id: "tl-02", label: "Created 4 background tasks", status: "done", ms: 700 },
          { id: "tl-03", label: "Assigned repo & staging scopes", status: "done", ms: 700 },
        ],
      },
      {
        kind: "text",
        text: "On it. I split it into four tasks and started them side by side – you’ll only hear from me when something needs a decision.",
      },
      {
        kind: "task",
        task: {
          id: "client-dashboard",
          title: "Client dashboard",
          status: "Drawing the empty states",
          steps: { done: 1, total: 3 },
        },
      },
      {
        kind: "task",
        task: {
          id: "api-migration",
          title: "API migration",
          status: "Moving our own apps",
          steps: { done: 1, total: 4 },
        },
      },
    ],
  },
  {
    id: "m-2",
    role: "user",
    text: "How did the ingest load test go?",
    at: "10:59 PM",
  },
  {
    id: "m-3",
    role: "agent",
    at: "11:00 PM",
    parts: [
      {
        kind: "tools",
        id: "tg-1",
        tools: [
          { id: "tl-1", label: "Read Grafana k6 staging run", status: "done", ms: 550 },
          { id: "tl-2", label: "Exported load-test-results.csv & design notes", status: "done", ms: 550 },
        ],
      },
      {
        kind: "text",
        text: "It passed at 20k events a minute: p95 stayed under 100 ms and errors at 0.02%. Past 30k it starts to fall behind – well above Northwind’s bursts.",
      },
      {
        kind: "artifacts",
        names: ["load-test-results.csv", "ingest-design.md"],
      },
    ],
  },
];

/** Agent / Thread (`agent-thread`): Single orchestrator conversation with parallel tool folding, inline task cards, resilient composer and docked decisions. */
export function AfAgentThread(props: AfAgentThreadProps = {}) {
  const {
    onNavigate,
    workspace = "Fieldwork",
    messages: messagesProp,
    onSend,
    onStop,
    onRetry,
    connection: connectionProp,
    onReconnect,
    lastSeen,
    awayAfter: _awayAfter = 5,
    onMarkRead,
    decisions: decisionsProp,
    onDecide,
    onLater,
    tasks = DEFAULT_TASKS,
    onShowTask,
    running = { running: 9, needs: 5 },
    onOpenTask,
    onOpenInbox,
    artifacts = DEFAULT_THREAD_ARTIFACTS,
    models,
    upload: _upload,
    transcribe,
    simulate,
    labels,
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const isEmpty = !loading && empty;
  const dockQuestionId = useId();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaWrapRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const streamIntervalRef = useRef<number | null>(null);

  const [internalMessages, setInternalMessages] = useState<AfThreadMessage[]>(() =>
    simulate === "error"
      ? [
          ...INITIAL_MESSAGES,
          {
            id: "m-err",
            role: "agent",
            at: "14:21",
            parts: [{ kind: "error", text: "Stream interrupted while reading staging logs.", retry: true }],
          },
        ]
      : INITIAL_MESSAGES,
  );
  const messages = messagesProp ?? internalMessages;

  const [internalDecisions, setInternalDecisions] = useState<AfThreadDecision[]>(DEFAULT_DECISIONS);
  const pendingDecisions = decisionsProp ?? internalDecisions;
  const [decisionPage, setDecisionPage] = useState(0);
  const [dockHidden, setDockHidden] = useState<boolean>(decisionsProp === undefined);
  const [dockFolded, setDockFolded] = useState(false);
  const [dockPulse, setDockPulse] = useState(false);
  const [requestApproval, setRequestApproval] = useState(false);
  const [focusedOptionIdx, setFocusedOptionIdx] = useState(0);
  const [customAnswerText, setCustomAnswerText] = useState("");
  const [showingCustomInput, setShowingCustomInput] = useState(false);
  const [answeredMap, setAnsweredMap] = useState<Record<string, string>>({});
  const [answeredDelta, setAnsweredDelta] = useState(0);

  const [openToolGroups, setOpenToolGroups] = useState<Record<string, boolean>>({});
  const [awayVisible, setAwayVisible] = useState<boolean>(
    Boolean(lastSeen !== undefined || simulate === "away"),
  );
  const [isScrolledUp, setIsScrolledUp] = useState(simulate === "scrolled");
  const [livePoliteText, setLivePoliteText] = useState("");

  const [draft, setDraft] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(models?.[0]?.id ?? "");
  const [attachments, setAttachments] = useState<AfThreadAttachment[]>(() =>
    simulate === "uploading"
      ? [{ id: "att-1", name: "staging-trace.json", size: "1.8 MB", progress: 0.62, status: "uploading" }]
      : [],
  );
  const [dictating, setDictating] = useState(simulate === "dictating");

  const [workOpen, setWorkOpen] = useState(false);
  const [tabs, setTabs] = useState<AfWorkAreaTabItem[]>([
    { id: "tab-new", title: "New tab", kind: "new", closable: true },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-new");

  const effectiveConnection: "online" | "offline" | "reconnecting" =
    connectionProp ?? (simulate === "offline" ? "offline" : "online");

  const isStreaming = messages.some((m) => m.role === "agent" && m.streaming);
  const currentNeeds = Math.max(0, running.needs - answeredDelta);
  const activeDecision = pendingDecisions[Math.min(decisionPage, Math.max(0, pendingDecisions.length - 1))];

  useEffect(
    () => () => {
      if (streamIntervalRef.current) window.clearInterval(streamIntervalRef.current);
    },
    [],
  );

  // Flush queued messages when connection returns online
  useEffect(() => {
    if (effectiveConnection !== "online") return;
    setInternalMessages((prev) =>
      prev.map((m) =>
        m.role === "user" && m.status === "queued"
          ? { ...m, status: "sent" }
          : m,
      ),
    );
  }, [effectiveConnection]);

  const scrollToLatest = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    setIsScrolledUp(false);
  };

  const focusComposerInput = () => {
    textareaWrapRef.current?.querySelector("textarea")?.focus();
  };

  const stopActiveStream = () => {
    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setInternalMessages((prev) =>
      prev.map((m) =>
        m.role === "agent" && m.streaming ? { ...m, streaming: false, stopped: true } : m,
      ),
    );
    setLivePoliteText("Stopped");
    onStop?.();
  };

  const submitDecisionAnswer = (
    dec: AfThreadDecision,
    choiceLabel: string,
    payload: { option?: string; text?: string } | "approve" | "decline",
    fromKeyboard = false,
  ) => {
    onDecide?.(dec.id, payload);
    setAnsweredMap((prev) => ({ ...prev, [dec.id]: choiceLabel }));
    setAnsweredDelta((d) => d + 1);
    setLivePoliteText(`Answered: ${choiceLabel}`);
    setShowingCustomInput(false);
    setCustomAnswerText("");

    if (!messagesProp) {
      setInternalMessages((prev) => [
        ...prev,
        {
          id: `ans-${Date.now()}`,
          role: "user",
          answered: dec.question,
          text: choiceLabel,
          at: "Now",
          status: "sent",
        },
      ]);
    }
    if (!decisionsProp) {
      setInternalDecisions((prev) => prev.filter((item) => item.id !== dec.id));
    }
    setDecisionPage(0);
    setFocusedOptionIdx(0);
    if (fromKeyboard) {
      window.requestAnimationFrame(focusComposerInput);
    }
  };

  // Global keyboard shortcuts when not typing (`/` focuses field, `End` jumps to latest, `1`–`5` answers dock)
  useEffect(() => {
    if (loading || isEmpty) return;
    const onGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (e.key === "/") {
        e.preventDefault();
        focusComposerInput();
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        scrollToLatest();
        return;
      }
      if (activeDecision && !dockHidden && !dockFolded && /^[1-5]$/.test(e.key)) {
        const num = Number(e.key);
        const opts = activeDecision.options ?? [];
        if (num >= 1 && num <= opts.length) {
          e.preventDefault();
          const chosen = opts[num - 1]!;
          submitDecisionAnswer(activeDecision, chosen.title, { option: chosen.id }, true);
        } else if (num === opts.length + 1) {
          e.preventDefault();
          setShowingCustomInput(true);
        }
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDecision, dockFolded, isEmpty, loading]);

  const openTaskInWorkArea = (taskId: string, fallbackTitle?: string) => {
    onOpenTask?.(taskId);
    const detail = tasks[taskId] ?? DEFAULT_TASKS["api-migration"]!;
    const tabContent = (
      <div className="af-sc-tasktab">
        <div className="af-sc-tasktab__head">
          <span className="af-sc-sec-label">{detail.project ?? "Background task"}</span>
          <button
            type="button"
            className="af-sc-more-link"
            onClick={() => (onShowTask ? onShowTask(taskId) : onNavigate?.("Tasks"))}
          >
            Show in Tasks
          </button>
        </div>
        {detail.goal ? <p className="af-sc-tasktab__goal">{detail.goal}</p> : null}
        {detail.steps ? (
          <ol className="af-sc-step-list">
            {detail.steps.map((st, idx) => (
              <li key={idx} className="af-sc-step-row" data-status={st.done ? "done" : "running"}>
                <span className="af-sc-step-mark" data-status={st.done ? "done" : "running"} aria-hidden="true">
                  {st.done ? <AfIcon name="check" size={10} /> : null}
                </span>
                <span className="af-sc-step-text">{st.label}</span>
                <span className="af-sc-step-word">{st.done ? "done" : "pending"}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {detail.artifacts && detail.artifacts.length > 0 ? (
          <div className="af-sc-brief__files">
            {detail.artifacts.map((name) => (
              <button
                key={name}
                type="button"
                className="af-sc-file-chip"
                onClick={() => openArtifactInWorkArea(name)}
              >
                <AfIcon name={artifactKindIcon(artifacts[name]?.kind ?? "document")} size={13} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );

    const taskTab: AfWorkAreaTabItem = {
      id: "tab-task",
      title: fallbackTitle ?? "Task",
      kind: "custom",
      closable: true,
      content: tabContent,
    };

    setWorkOpen(true);
    setTabs((prev) => {
      const withoutOldTask = prev.filter((t) => t.id !== "tab-task" && t.kind !== "new");
      return [taskTab, ...withoutOldTask];
    });
    setActiveTabId("tab-task");
  };

  const openArtifactInWorkArea = (name: string) => {
    const art = artifacts[name] ?? {
      id: name,
      title: name,
      kind: "document",
      doc: `# ${name}\n\nGenerated in conversation.`,
    };
    setWorkOpen(true);
    setTabs((prev) => {
      const cleaned = prev.length === 1 && prev[0]?.kind === "new" ? [] : prev;
      if (cleaned.some((t) => t.id === name)) return cleaned;
      return [...cleaned, { id: name, title: art.title ?? name, kind: art.kind, closable: true, artifact: art }];
    });
    setActiveTabId(name);
  };

  const sendThreadMessage = () => {
    const text = draft.trim();
    if (loading || isEmpty || (!text && attachments.length === 0)) return;
    const doneAtts = attachments.filter((a) => a.status !== "uploading");

    if (effectiveConnection === "offline") {
      setLivePoliteText(labels?.waiting ?? "Waiting to send");
      if (!messagesProp) {
        setInternalMessages((prev) => [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: "user",
            text,
            at: "Now",
            attachments: doneAtts,
            status: "queued",
          },
        ]);
      }
      setDraft("");
      setAttachments([]);
      return;
    }

    onSend?.(text, doneAtts);
    setDraft("");
    setAttachments([]);

    if (messagesProp) return;

    const userMsgId = `u-${Date.now()}`;
    const agentMsgId = `a-${Date.now() + 1}`;
    const toolGroupId = `tg-${Date.now()}`;
    const replyWords =
      `Checked the staging metrics and updated ingest-design.md for "${text}". Ready whenever you want to roll the canary forward.`.split(
        " ",
      );

    setInternalMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text, at: "Now", attachments: doneAtts, status: "sent" },
      {
        id: agentMsgId,
        role: "agent",
        at: "Now",
        streaming: true,
        parts: [
          {
            kind: "tools",
            id: toolGroupId,
            tools: [
              { id: `${toolGroupId}-1`, label: "Checking task state", status: "running" },
              { id: `${toolGroupId}-2`, label: "Syncing ingest-design.md", status: "running" },
            ],
          },
          { kind: "text", text: "" },
        ],
      },
    ]);
    setOpenToolGroups((p) => ({ ...p, [toolGroupId]: true }));

    // Parallel tools finish at staggered moments, then fold into one summary line!
    window.setTimeout(() => {
      setInternalMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId && m.role === "agent"
            ? {
                ...m,
                parts: m.parts.map((pt) =>
                  pt.kind === "tools"
                    ? {
                        ...pt,
                        tools: pt.tools.map((tl, idx) =>
                          idx === 0 ? { ...tl, status: "done", ms: 420 } : tl,
                        ),
                      }
                    : pt,
                ),
              }
            : m,
        ),
      );
    }, 360);

    window.setTimeout(() => {
      setInternalMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId && m.role === "agent"
            ? {
                ...m,
                parts: m.parts.map((pt) =>
                  pt.kind === "tools"
                    ? {
                        ...pt,
                        tools: pt.tools.map((tl) => ({ ...tl, status: "done", ms: tl.ms ?? 680 })),
                      }
                    : pt,
                ),
              }
            : m,
        ),
      );
      window.setTimeout(() => {
        setOpenToolGroups((p) => ({ ...p, [toolGroupId]: false }));
      }, 320);

      let wIdx = 0;
      if (streamIntervalRef.current) window.clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = window.setInterval(() => {
        wIdx += 2;
        const nextText = replyWords.slice(0, wIdx).join(" ");
        const done = wIdx >= replyWords.length;
        setInternalMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId && m.role === "agent"
              ? {
                  ...m,
                  streaming: !done,
                  parts: m.parts.map((pt) => (pt.kind === "text" ? { kind: "text", text: nextText } : pt)),
                }
              : m,
          ),
        );
        if (done && streamIntervalRef.current) {
          window.clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
      }, 55);
    }, 720);
  };

  const attachSampleFile = () => {
    const newAtt: AfThreadAttachment = {
      id: `att-${Date.now()}`,
      name: "webhook-payload-sample.json",
      size: "48 KB",
      progress: 1,
      status: "done",
    };
    setAttachments((prev) => [...prev, newAtt]);
  };

  const toggleVoiceDictation = async () => {
    if (dictating) {
      setDictating(false);
      const clip: AfThreadAttachment = { id: `clip-${Date.now()}`, name: "Voice note" };
      const text = transcribe
        ? await transcribe(clip)
        : "Use Kafka with 7-day retention and start the 10% EU canary.";
      setDraft((prev) => (prev ? `${prev} ${text}` : text));
    } else {
      setDictating(true);
    }
  };

  const sidebarNav = useMemo<AfChatSidebarItem[]>(
    () => [
      { label: "Thread", icon: "message" },
      { label: "Inbox", icon: "inbox", count: currentNeeds },
      { label: "Tasks", icon: "list" },
      { label: "Memory", icon: "bulb" },
    ],
    [currentNeeds],
  );

  const sidebarGroups = useMemo(
    () => [
      {
        label: "Workspace",
        items: [{ label: "Settings", icon: "settings" as AffectIconKey }],
      },
    ],
    [],
  );

  const bringUpDock = () => {
    if (pendingDecisions.length === 0) {
      if (onOpenInbox) onOpenInbox();
      else onNavigate?.("Inbox");
      return;
    }
    setDockHidden(false);
    setDockFolded(false);
    setDockPulse(true);
    window.setTimeout(() => setDockPulse(false), 600);
    window.requestAnimationFrame(() => optionRefs.current[0]?.focus());
  };

  const handleDockKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!activeDecision) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setDockFolded(true);
      onLater?.(activeDecision.id);
      return;
    }
    const opts = activeDecision.options ?? [];
    if (opts.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = (focusedOptionIdx + 1) % opts.length;
      setFocusedOptionIdx(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = (focusedOptionIdx - 1 + opts.length) % opts.length;
      setFocusedOptionIdx(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedOptionIdx(0);
      optionRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = opts.length - 1;
      setFocusedOptionIdx(last);
      optionRefs.current[last]?.focus();
    }
  };

  return (
    <ChatInsetShell
      workspace={workspace}
      user={user}
      activeNav="Thread"
      navItems={sidebarNav}
      sidebarGroups={sidebarGroups}
      hideThreads
      data-thread-shell=""
      onNavigate={onNavigate}
      mainHeader={{
        title: labels?.title ?? "",
        actions: !loading && !isEmpty ? (
          <div className="af-sc-head-counts">
            <button
              type="button"
              className="af-sc-quiet-stat"
              onClick={() => onNavigate?.("Tasks")}
            >
              <span className="af-sc-run-ring" aria-hidden="true" />
              <span>{running.running} running</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="af-sc-quiet-stat af-sc-quiet-stat--needs"
              onClick={bringUpDock}
            >
              <span className="af-sc-need-dot" aria-hidden="true" />
              <span>
                {currentNeeds} {labels?.needsYou ?? "need you"}
              </span>
            </button>
          </div>
        ) : null,
      }}
      workAreaOpen={workOpen}
      onWorkAreaOpenChange={setWorkOpen}
      workAreaOpenLabel="Open artifacts"
      tabs={tabs}
      activeTabId={activeTabId}
      onTabsChange={setTabs}
      onActiveTabChange={setActiveTabId}
      suggestedArtifacts={artifacts}
      className={className}
      {...rest}
    >
      <div className="af-sc-thread-layout">
        {effectiveConnection !== "online" ? (
          <div className="af-sc-conn-banner" role="status">
            <span>
              {effectiveConnection === "reconnecting"
                ? "Reconnecting to orchestrator…"
                : (labels?.offline ?? "You’re offline — new messages will wait and send once you’re back.")}
            </span>
            <button
              type="button"
              className="af-sc-mini-pill"
              onClick={() => onReconnect?.()}
            >
              {labels?.retry ?? "Retry now"}
            </button>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="af-sc-thread-scroll"
          role="log"
          aria-live="polite"
          aria-busy={isStreaming || undefined}
          onScroll={(e) => {
            const el = e.currentTarget;
            const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
            setIsScrolledUp(dist > 80);
          }}
        >
          {loading ? (
            <div className="af-sc-th-col" aria-label="Loading thread">
              <AfSkeleton lines={2} height={13} />
              <AfSkeleton width="100%" height={54} radius={10} />
              <div className="af-sc-bubble-skel">
                <AfSkeleton width={220} height={36} radius={16} />
              </div>
              <AfSkeleton width={148} height={24} radius={8} />
              <AfSkeleton lines={3} height={13} />
            </div>
          ) : isEmpty ? (
            <div className="af-sc-thread-empty">
              <AfEmptyState
                bare
                icon="message"
                title="No chats yet"
                text="Talk to your orchestrator in one continuous thread — background tasks, folded tool runs and decisions show up inline."
                action={
                  <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("New chat")}>
                    Start a chat
                  </AfButton>
                }
              />
            </div>
          ) : (
            <div className="af-sc-th-col">
              {awayVisible ? (
                <div className="af-sc-away-card">
                  <div className="af-sc-away-card__top">
                    <strong>{labels?.away ?? "While you were away"}</strong>
                    <button
                      type="button"
                      className="af-sc-more-link"
                      onClick={() => (onOpenInbox ? onOpenInbox() : onNavigate?.("Inbox"))}
                    >
                      Open Inbox
                    </button>
                  </div>
                  <p>2 tasks finished · {currentNeeds} items waiting on your call.</p>
                  <button
                    type="button"
                    className="af-sc-away-card__read"
                    onClick={() => {
                      setAwayVisible(false);
                      onMarkRead?.();
                    }}
                  >
                    {labels?.markRead ?? "Mark as read"}
                  </button>
                </div>
              ) : null}

              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="af-sc-user-msg">
                      {msg.answered ? (
                        <span className="af-sc-answered-cap">Answered: {msg.answered}</span>
                      ) : null}
                      <div className="af-sc-user-bubble">{msg.text}</div>
                      {msg.attachments && msg.attachments.length > 0 ? (
                        <div className="af-sc-chip-row">
                          {msg.attachments.map((att) => (
                            <span key={att.id} className="af-sc-att-pill">
                              <AfIcon name="paperclip" size={11} />
                              <span>{att.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {msg.status === "queued" ? (
                        <span className="af-sc-msg-meta">{labels?.waiting ?? "Waiting to send"}</span>
                      ) : msg.status === "failed" ? (
                        <button
                          type="button"
                          className="af-sc-retry-inline"
                          onClick={() => onRetry?.(msg.id)}
                        >
                          Failed to send · {labels?.retry ?? "Retry"}
                        </button>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="af-sc-orch-msg">
                    <div className="af-sc-orch-msg__head">
                      <span className="af-sc-orch-mark" aria-hidden="true" />
                      <strong>{labels?.orchestrator ?? "Orchestrator"}</strong>
                      <span>{msg.at}</span>
                    </div>

                    {msg.parts.map((part, pIdx) => {
                      if (part.kind === "text") {
                        const isLastText = pIdx === msg.parts.length - 1;
                        return (
                          <p key={pIdx} className="af-sc-orch-text">
                            {part.text}
                            {msg.streaming && isLastText ? (
                              <span className="af-sc-caret" aria-hidden="true" />
                            ) : null}
                          </p>
                        );
                      }

                      if (part.kind === "tools") {
                        const anyRunning = part.tools.some((t) => t.status === "running");
                        const isOpen = openToolGroups[part.id] ?? anyRunning;
                        const totalSec = (
                          part.tools.reduce((s, t) => s + (t.ms ?? 800), 0) / 1000
                        ).toFixed(1);
                        return (
                          <div key={part.id} className="af-sc-fold-group">
                            <button
                              type="button"
                              className="af-sc-fold-pill"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setOpenToolGroups((p) => ({ ...p, [part.id]: !isOpen }))
                              }
                            >
                              <AfIcon name={anyRunning ? "refresh" : "check"} size={12} />
                              <span>
                                {anyRunning
                                  ? `Running ${part.tools.length} tools…`
                                  : `Ran ${part.tools.length} tools · ${totalSec}s`}
                              </span>
                              <AfIcon name={isOpen ? "chevronDown" : "chevronRight"} size={11} />
                            </button>
                            <div
                              className="af-sc-fold-list"
                              {...(!isOpen ? ({ inert: "" } as Record<string, string>) : {})}
                              hidden={!isOpen}
                            >
                              {part.tools.map((tl) => (
                                <div
                                  key={tl.id}
                                  className="af-sc-fold-item"
                                  data-status={tl.status}
                                >
                                  <AfIcon
                                    name={tl.status === "done" ? "check" : tl.status === "failed" ? "alert" : "sparkle"}
                                    size={11}
                                  />
                                  <span className="af-sc-fold-item__title">{tl.label}</span>
                                  <span className="af-sc-fold-item__meta">
                                    {tl.status === "running"
                                      ? "running"
                                      : tl.status === "failed"
                                        ? "failed"
                                        : `${((tl.ms ?? 900) / 1000).toFixed(1)}s · done`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (part.kind === "task") {
                        const { task } = part;
                        return (
                          <div key={task.id} className="af-sc-task-card">
                            <div className="af-sc-task-card__left">
                              <span className="af-sc-task-pie" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.6" />
                                  <path d="M8 2a6 6 0 0 1 5.2 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                              </span>
                              <div className="af-sc-task-card__info">
                                <strong>{task.title}</strong>
                                <span>{task.status}</span>
                              </div>
                            </div>
                            <div className="af-sc-task-card__right">
                              {task.steps ? (
                                <span className="af-sc-task-card__prog">
                                  {task.steps.done}/{task.steps.total}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="af-sc-task-open-btn"
                                aria-label={`Open ${task.title}, ${task.status}`}
                                onClick={() => openTaskInWorkArea(task.id, task.title)}
                              >
                                {labels?.open ?? "Open"}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (part.kind === "artifacts") {
                        return (
                          <div key={pIdx} className="af-sc-chip-row">
                            {part.names.map((n) => (
                              <button
                                key={n}
                                type="button"
                                className="af-sc-file-chip"
                                onClick={() => openArtifactInWorkArea(n)}
                              >
                                <AfIcon
                                  name={artifactKindIcon(artifacts[n]?.kind ?? "document")}
                                  size={13}
                                />
                                <span>{n}</span>
                              </button>
                            ))}
                          </div>
                        );
                      }

                      if (part.kind === "decision") {
                        const answered = answeredMap[part.ask.id];
                        return (
                          <button
                            key={part.ask.id}
                            type="button"
                            className="af-sc-asked-line"
                            onClick={bringUpDock}
                          >
                            <span>
                              Asked: {part.ask.question} ·{" "}
                              <strong>{answered ? `answered (${answered})` : "waiting"}</strong>
                            </span>
                          </button>
                        );
                      }

                      if (part.kind === "error") {
                        return (
                          <div key={pIdx} className="af-sc-err-line" role="alert">
                            <span>{part.text}</span>
                            {part.retry !== false ? (
                              <button
                                type="button"
                                className="af-sc-mini-pill"
                                onClick={() => onRetry?.(msg.id)}
                              >
                                {labels?.retry ?? "Retry"}
                              </button>
                            ) : null}
                          </div>
                        );
                      }

                      return null;
                    })}

                    {msg.stopped ? <span className="af-sc-stopped-tag">Stopped</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Dock + Composer sharing --th-col (680px) */}
        <div className="af-sc-th-bottom">
          <div className="af-sc-th-col">
            {isScrolledUp && !loading && !isEmpty ? (
              <div className="af-sc-jump-row">
                <button
                  type="button"
                  className="af-sc-jump-pill"
                  aria-keyshortcuts="End"
                  aria-label={`Jump to latest${isStreaming ? ", still writing" : ""}`}
                  onClick={scrollToLatest}
                >
                  <span>{labels?.jump ?? "Jump to latest"}</span>
                  <span className="af-sc-kbd">End</span>
                </button>
              </div>
            ) : null}

            {/* Decision Dock: sits 8px above composer, never an overlay */}
            {!loading && !isEmpty && !dockHidden && activeDecision ? (
              dockFolded ? (
                <div className="af-sc-dock-folded">
                  <span>
                    {pendingDecisions.length}{" "}
                    {pendingDecisions.length === 1 ? "decision waiting" : "decisions waiting"}
                  </span>
                  <button
                    type="button"
                    className="af-sc-more-link"
                    onClick={() => setDockFolded(false)}
                  >
                    Show
                  </button>
                </div>
              ) : (
                <div
                  className="af-sc-dock"
                  data-pulse={dockPulse || undefined}
                  role="group"
                  aria-labelledby={dockQuestionId}
                  onKeyDown={handleDockKeyDown}
                >
                  <div className="af-sc-dock__head">
                    <div className="af-sc-dock__meta">
                      <span className="af-sc-dock__task">{activeDecision.task}</span>
                      {pendingDecisions.length > 1 ? (
                        <span className="af-sc-dock__pager">
                          <button
                            type="button"
                            className="af-sc-pager-btn"
                            aria-label="Previous decision"
                            disabled={decisionPage === 0}
                            onClick={() => setDecisionPage((p) => Math.max(0, p - 1))}
                          >
                            ‹
                          </button>
                          <span>
                            {decisionPage + 1} of {pendingDecisions.length}
                          </span>
                          <button
                            type="button"
                            className="af-sc-pager-btn"
                            aria-label="Next decision"
                            disabled={decisionPage >= pendingDecisions.length - 1}
                            onClick={() =>
                              setDecisionPage((p) => Math.min(pendingDecisions.length - 1, p + 1))
                            }
                          >
                            ›
                          </button>
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="af-sc-later-btn"
                      onClick={() => {
                        setDockFolded(true);
                        onLater?.(activeDecision.id);
                      }}
                    >
                      Later
                    </button>
                  </div>

                  <strong id={dockQuestionId} className="af-sc-dock__q">
                    {activeDecision.question}
                  </strong>

                  {activeDecision.kind === "approval" ? (
                    <div className="af-sc-dock__approval">
                      {activeDecision.facts ? (
                        <dl className="af-sc-approval-dl">
                          {activeDecision.facts.map((f) => (
                            <div key={f.label} className="af-sc-approval-dl__row">
                              <dt>{f.label}</dt>
                              <dd>{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <div className="af-sc-approval-box__actions">
                        <AfButton
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            submitDecisionAnswer(activeDecision, "Declined", "decline")
                          }
                        >
                          Decline
                        </AfButton>
                        <AfButton
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            submitDecisionAnswer(activeDecision, "Approved", "approve")
                          }
                        >
                          Approve
                        </AfButton>
                      </div>
                    </div>
                  ) : (
                    <div className="af-sc-dock__opts" role="listbox" aria-labelledby={dockQuestionId}>
                      {(activeDecision.options ?? []).map((opt, idx) => (
                        <button
                          key={opt.id}
                          ref={(el) => {
                            optionRefs.current[idx] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={focusedOptionIdx === idx}
                          aria-keyshortcuts={String(idx + 1)}
                          tabIndex={focusedOptionIdx === idx ? 0 : -1}
                          className="af-sc-dock__opt"
                          onClick={() =>
                            submitDecisionAnswer(activeDecision, opt.title, { option: opt.id })
                          }
                        >
                          <span className="af-sc-dock__num">{idx + 1}</span>
                          <span className="af-sc-dock__opt-body">
                            <strong>
                              {opt.title}
                              {opt.recommended ? (
                                <em className="af-sc-rec-tag">Recommended</em>
                              ) : null}
                            </strong>
                            {opt.summary ? <small>{opt.summary}</small> : null}
                          </span>
                        </button>
                      ))}

                      {showingCustomInput ? (
                        <div className="af-sc-dock__custom">
                          <AfInput
                            aria-label="Your own answer"
                            placeholder="Type your own direction…"
                            value={customAnswerText}
                            autoFocus
                            onChange={(e) => setCustomAnswerText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customAnswerText.trim()) {
                                e.preventDefault();
                                submitDecisionAnswer(
                                  activeDecision,
                                  customAnswerText.trim(),
                                  { text: customAnswerText.trim() },
                                  true,
                                );
                              } else if (e.key === "Escape") {
                                e.stopPropagation();
                                setShowingCustomInput(false);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="af-sc-dock__opt af-sc-dock__opt--other"
                          aria-keyshortcuts={String((activeDecision.options?.length ?? 0) + 1)}
                          onClick={() => setShowingCustomInput(true)}
                        >
                          <span className="af-sc-dock__num">
                            {(activeDecision.options?.length ?? 0) + 1}
                          </span>
                          <span className="af-sc-dock__opt-body">
                            <span>Something else…</span>
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : null}

            {/* Deliberately minimal orchestrator composer (no model picker unless `models` passed) */}
            <div ref={textareaWrapRef} className="af-sc-th-composer">
              {attachments.length > 0 ? (
                <div className="af-sc-th-composer__atts">
                  {attachments.map((att) => (
                    <span key={att.id} className="af-sc-att-pill">
                      <AfIcon name="paperclip" size={11} />
                      <span>
                        {att.name}
                        {att.status === "uploading"
                          ? ` · ${Math.round((att.progress ?? 0.5) * 100)}%`
                          : ""}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${att.name}`}
                        onClick={() =>
                          setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                        }
                      >
                        <AfIcon name="x" size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <AfTextarea
                aria-label={labels?.placeholder ?? "Ask for anything…"}
                placeholder={
                  dictating
                    ? "Listening… press Esc to discard or click mic to finish"
                    : (labels?.placeholder ?? "Ask for anything…")
                }
                resize="none"
                rows={2}
                value={draft}
                disabled={loading || isEmpty}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendThreadMessage();
                  } else if (e.key === "Escape") {
                    if (dictating) {
                      e.preventDefault();
                      setDictating(false);
                    } else if (isStreaming) {
                      e.preventDefault();
                      stopActiveStream();
                    }
                  }
                }}
              />

              <div className="af-sc-th-composer__bar">
                <div className="af-sc-th-composer__left">
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-icon-btn--sm"
                    aria-label="Attach file"
                    disabled={loading || isEmpty}
                    onClick={attachSampleFile}
                  >
                    <AfIcon name="plus" size={14} />
                  </button>
                  <button
                    type="button"
                    className="af-sc-req-btn"
                    aria-pressed={requestApproval}
                    data-active={requestApproval || undefined}
                    disabled={loading || isEmpty}
                    onClick={() => setRequestApproval((v) => !v)}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 2.2v5.3M10.2 3v4.5M5.8 3.5v4.5M12.4 5v4.5c0 2.5-1.9 4.3-4.4 4.3-2.2 0-3.7-1.1-4.6-2.9L2.3 8.8a1 1 0 0 1 1.7-.9l1.8 1.5" />
                    </svg>
                    <span>Request approval</span>
                  </button>
                  {models && models.length > 0 ? (
                    <AfModelPicker
                      models={models}
                      value={selectedModel}
                      onChange={setSelectedModel}
                    />
                  ) : null}
                </div>

                <div className="af-sc-th-composer__right">
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-icon-btn--sm"
                    data-active={dictating || undefined}
                    aria-label={dictating ? "Finish dictation" : "Voice note"}
                    disabled={loading || isEmpty}
                    onClick={() => void toggleVoiceDictation()}
                  >
                    <AfIcon name="mic" size={14} />
                  </button>
                  {isStreaming ? (
                    <button
                      type="button"
                      className="af-sc-stop-pill"
                      onClick={stopActiveStream}
                    >
                      <span className="af-sc-stop-sq" aria-hidden="true" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="af-sc-send-btn"
                      aria-label="Send message"
                      disabled={loading || isEmpty || (!draft.trim() && attachments.length === 0)}
                      onClick={sendThreadMessage}
                    >
                      <AfIcon name="arrowUp" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <span className="af-sr-only" aria-live="polite">
              {livePoliteText}
            </span>
          </div>
        </div>
      </div>
    </ChatInsetShell>
  );
}
