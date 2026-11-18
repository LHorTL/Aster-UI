import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfAvatar } from "../display/Avatar";
import { AfSkeleton } from "../display/Skeleton";
import { AfModal } from "../overlay/Modal";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  AppBrandTile,
  DEFAULT_AGENT_OPS_USER,
  MiniDailyBars,
  ModelMakerMark,
  formatCompactCount,
  formatCurrencyValue,
  isTypingTarget,
  usePrefersReducedMotion,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type AgentStatus = "working" | "idle" | "paused";

export type AgentRecentTask = {
  title: string;
  state: string;
  at: string;
};

export type AgentMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  model: string;
  status: AgentStatus;
  doing?: string;
  lastRun?: string;
  runs: number;
  cost: number;
  daily?: number[];
  owner?: string;
  instructions?: string;
  skills?: string[];
  apps?: string[];
  recent?: AgentRecentTask[];
};

export type AgentsLabels = {
  agents?: string;
  all?: string;
  working?: string;
  idle?: string;
  paused?: string;
  newAgent?: string;
  message?: string;
  pause?: string;
  resume?: string;
  instructions?: string;
  skills?: string;
  apps?: string;
  recent?: string;
  grid?: string;
  list?: string;
};

export type AfAgentsProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  agents?: AgentMember[];
  defaultView?: "grid" | "list";
  defaultOpen?: string | null;
  onPause?: (agent: AgentMember, paused: boolean) => void;
  onMessage?: (agent: AgentMember) => void;
  onCreate?: (agent: AgentMember) => void;
  onSelect?: (id: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  currency?: string;
  loading?: boolean;
  empty?: boolean;
  labels?: AgentsLabels;
  className?: string;
  style?: CSSProperties;
};

const MODEL_CHOICES = [
  "Opus 5.5",
  "Sonnet 5.5",
  "GPT-6 mini",
  "Gemini 3.1 Pro",
] as const;

const COLOR_SWATCHES = [
  { label: "Cobalt", value: "#2563EB" },
  { label: "Emerald", value: "#10B981" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Rose", value: "#EC4899" },
  { label: "Sky", value: "#0EA5E9" },
] as const;

const APP_CHOICES = [
  "GitHub",
  "Linear",
  "Slack",
  "Notion",
  "Google Drive",
  "Gmail",
  "Google Calendar",
] as const;

export const DEFAULT_AGENTS_TEAM: AgentMember[] = [
  {
    id: "builder",
    name: "Builder",
    role: "Writes and ships code",
    color: "#2563EB",
    model: "Opus 5.5",
    status: "working",
    doing: "Running the migration on staging",
    runs: 38,
    cost: 46.2,
    daily: [1, 1, 2, 1, 2, 1, 3, 2, 1, 9, 7, 4, 8, 5],
    owner: "Alex Morgan",
    instructions:
      "You work in the Fieldwork monorepo. Keep pull requests small, write tests first and never deploy to production without a person approving it. When a migration touches users or billing tables, run it against staging and post the diff in #engineering before merging.",
    skills: ["Code review", "Release notes", "Spreadsheet analysis"],
    apps: ["GitHub", "Linear", "Slack"],
    recent: [
      { title: "Migrate users table", state: "Running", at: "now" },
      { title: "Fix flaky checkout test", state: "Done", at: "3 hours ago" },
      { title: "Billing webhooks", state: "Done", at: "yesterday" },
    ],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "Reviews pull requests",
    color: "#8B5CF6",
    model: "Sonnet 5.5",
    status: "working",
    doing: "Reviewing PR #482",
    runs: 64,
    cost: 22,
    daily: [3, 4, 5, 4, 6, 2, 1, 5, 6, 5, 7, 4, 5, 7],
    owner: "Alex Morgan",
    instructions:
      "Review pull requests for type safety, migration rollback paths and edge-case coverage before requesting human sign-off.",
    skills: ["Code review"],
    apps: ["GitHub", "Slack"],
    recent: [
      { title: "Review PR #482", state: "Running", at: "now" },
      { title: "Approve API v2 types", state: "Done", at: "2 hours ago" },
    ],
  },
  {
    id: "writer",
    name: "Writer",
    role: "Drafts posts, emails and notes",
    color: "#EC4899",
    model: "Sonnet 5.5",
    status: "working",
    doing: "Drafting weekly update",
    runs: 27,
    cost: 12,
    daily: [1, 2, 2, 1, 3, 0, 1, 2, 3, 2, 2, 3, 2, 3],
    owner: "Alex Morgan",
    instructions:
      "Keep client updates under one page, lead with what shipped, use plain verbs, British spelling and euro spacing.",
    skills: ["Brand voice", "Release notes"],
    apps: ["Google Drive", "Notion", "Gmail"],
    recent: [
      { title: "Draft weekly customer update", state: "Running", at: "now" },
      { title: "v2.14 customer release notes", state: "Done", at: "yesterday" },
    ],
  },
  {
    id: "ops",
    name: "Ops",
    role: "Keeps data and tools tidy",
    color: "#10B981",
    model: "GPT-6 mini",
    status: "idle",
    lastRun: "38m ago",
    runs: 112,
    cost: 9,
    daily: [8, 9, 7, 10, 8, 4, 3, 9, 11, 8, 10, 7, 9, 9],
    owner: "Lena Weber",
    instructions:
      "Sync issue labels across Linear and GitHub, archive stale branches, and route urgent operational threads to Inbox.",
    skills: ["Meeting notes", "Spreadsheet analysis"],
    apps: ["Slack", "Linear", "GitHub"],
    recent: [
      { title: "Sync Linear triage queue", state: "Done", at: "38m ago" },
      { title: "Archive merged staging branches", state: "Done", at: "yesterday" },
    ],
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Reads widely, writes cited briefs",
    color: "#F59E0B",
    model: "Gemini 3.1 Pro",
    status: "idle",
    lastRun: "2h ago",
    runs: 9,
    cost: 32,
    daily: [1, 0, 1, 1, 2, 0, 0, 1, 1, 0, 1, 0, 1, 0],
    owner: "Lena Weber",
    instructions:
      "Cross-check primary documentation, changelogs and pricing pages across at least two independent sources before citing numbers in a brief.",
    skills: ["Deep research", "Competitor watch"],
    apps: ["Notion", "Google Drive"],
    recent: [
      { title: "Competitor pricing diff – Northwind", state: "Done", at: "2 hours ago" },
      { title: "Webhook retry reliability brief", state: "Done", at: "yesterday" },
    ],
  },
  {
    id: "support",
    name: "Support",
    role: "Answers customer questions",
    color: "#0EA5E9",
    model: "Grok 5",
    status: "paused",
    lastRun: "Paused",
    runs: 0,
    cost: 0,
    daily: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    owner: "Tom Becker",
    instructions:
      "Draft warm first replies to customer questions in Fieldwork's voice and escalate billing or refund requests to Inbox.",
    skills: ["Brand voice"],
    apps: ["Gmail", "Slack"],
    recent: [
      { title: "Inbox FAQ sync", state: "Paused", at: "2 days ago" },
    ],
  },
];

type StatusFilter = "all" | AgentStatus;

/**
 * AfAgents — Agent Ops Team & Roster Screen (`/screens/agents`).
 * Shows every agent on the team, live working status with twinkling pixel marks,
 * Grid/List switch, New agent studio modal with live pixel identity preview,
 * and right-hand Agent inspector with daily runs, instructions, skills, apps & recent tasks.
 */
export function AfAgents(props: AfAgentsProps = {}) {
  const {
    agents: agentsProp,
    defaultView = "grid",
    defaultOpen = "builder",
    onPause,
    onMessage,
    onCreate,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 2,
    currency = "EUR",
    loading = false,
    empty = false,
    labels,
    className,
    style,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();

  const copy = {
    agents: labels?.agents ?? "Agents",
    all: labels?.all ?? "All agents",
    working: labels?.working ?? "Working",
    idle: labels?.idle ?? "Idle",
    paused: labels?.paused ?? "Paused",
    newAgent: labels?.newAgent ?? "New agent",
    message: labels?.message ?? "Message",
    pause: labels?.pause ?? "Pause",
    resume: labels?.resume ?? "Resume",
    instructions: labels?.instructions ?? "Instructions",
    skills: labels?.skills ?? "Skills",
    apps: labels?.apps ?? "Can use",
    recent: labels?.recent ?? "Recent tasks",
    grid: labels?.grid ?? "Grid view",
    list: labels?.list ?? "List view",
  };

  const [internalAgents, setInternalAgents] = useState<AgentMember[]>(() =>
    empty ? [] : agentsProp ?? DEFAULT_AGENTS_TEAM,
  );

  useEffect(() => {
    if (empty) {
      setInternalAgents([]);
    } else if (agentsProp) {
      setInternalAgents(agentsProp);
    }
  }, [agentsProp, empty]);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<"grid" | "list">(defaultView);
  const [openId, setOpenId] = useState<string | null>(empty ? null : defaultOpen);
  const [panelOpen, setPanelOpen] = useState<boolean>(!empty && defaultOpen !== null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  // New Agent modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const [draftModel, setDraftModel] = useState<string>(MODEL_CHOICES[0]);
  const [draftColor, setDraftColor] = useState<string>(COLOR_SWATCHES[0].value);
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftApps, setDraftApps] = useState<string[]>(["Slack", "Google Drive"]);

  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const waveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (waveTimerRef.current !== null) window.clearTimeout(waveTimerRef.current);
    };
  }, []);

  const counts = useMemo(() => {
    let working = 0;
    let idle = 0;
    let paused = 0;
    for (const a of internalAgents) {
      if (a.status === "working") working += 1;
      else if (a.status === "idle") idle += 1;
      else paused += 1;
    }
    return {
      all: internalAgents.length,
      working,
      idle,
      paused,
    };
  }, [internalAgents]);

  const summaryStatusLine = useMemo(
    () => `${counts.working} working · ${counts.idle} idle · ${counts.paused} paused`,
    [counts.idle, counts.paused, counts.working],
  );

  const visibleAgents = useMemo(() => {
    if (filter === "all") return internalAgents;
    return internalAgents.filter((a) => a.status === filter);
  }, [filter, internalAgents]);

  const selectedAgent = useMemo(
    () => internalAgents.find((a) => a.id === openId) ?? null,
    [internalAgents, openId],
  );

  const selectAgent = useCallback(
    (id: string, focusCard = false) => {
      setOpenId(id);
      setPanelOpen(true);
      onSelect?.(id);
      if (focusCard) {
        const btn = cardRefs.current.get(id);
        btn?.focus();
      }
    },
    [onSelect],
  );

  // Global J/K / Arrow navigation across agents when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (createOpen || loading || empty) return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" || e.key === "k") {
        if (visibleAgents.length === 0) return;
        e.preventDefault();
        const idx = visibleAgents.findIndex((a) => a.id === openId);
        const delta = e.key === "j" ? 1 : -1;
        const nextIdx =
          idx === -1 ? 0 : (idx + delta + visibleAgents.length) % visibleAgents.length;
        const next = visibleAgents[nextIdx];
        if (next) selectAgent(next.id, true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, empty, loading, openId, selectAgent, visibleAgents]);

  const handleCollectionKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (visibleAgents.length === 0) return;
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    const activeEl = document.activeElement;
    let currentIdx = visibleAgents.findIndex(
      (a) => cardRefs.current.get(a.id) === activeEl,
    );
    if (currentIdx === -1) {
      currentIdx = visibleAgents.findIndex((a) => a.id === openId);
    }
    if (currentIdx === -1) currentIdx = 0;

    e.preventDefault();
    const cols = view === "grid" ? 2 : 1;
    let delta = 0;
    if (e.key === "ArrowRight") delta = 1;
    else if (e.key === "ArrowLeft") delta = -1;
    else if (e.key === "ArrowDown") delta = cols;
    else if (e.key === "ArrowUp") delta = -cols;

    const nextIdx = Math.max(0, Math.min(visibleAgents.length - 1, currentIdx + delta));
    const next = visibleAgents[nextIdx];
    if (next) {
      cardRefs.current.get(next.id)?.focus();
    }
  };

  const handleFilterTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const order: StatusFilter[] = ["all", "working", "idle", "paused"];
    const idx = order.indexOf(filter);
    const nextIdx =
      e.key === "ArrowRight"
        ? (idx + 1) % order.length
        : (idx - 1 + order.length) % order.length;
    setFilter(order[nextIdx]);
  };

  const handleViewSwitchKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setView((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const handleTogglePause = useCallback(
    (agent: AgentMember) => {
      const nextPaused = agent.status !== "paused";
      const nextStatus: AgentStatus = nextPaused ? "paused" : "idle";
      setInternalAgents((prev) =>
        prev.map((item) =>
          item.id === agent.id
            ? {
                ...item,
                status: nextStatus,
                doing: nextPaused ? undefined : item.doing,
                lastRun: nextPaused ? "Paused just now" : "Resumed just now",
              }
            : item,
        ),
      );
      setLiveAnnouncement(
        nextPaused ? `${agent.name} paused` : `${agent.name} resumed`,
      );
      onPause?.(agent, nextPaused);
    },
    [onPause],
  );

  const handleMessage = useCallback(
    (agent: AgentMember) => {
      if (onMessage) {
        onMessage(agent);
      } else {
        onNavigate?.("Thread");
      }
      setLiveAnnouncement(`Messaging ${agent.name}`);
    },
    [onMessage, onNavigate],
  );

  const resetCreateForm = () => {
    setDraftName("");
    setDraftRole("");
    setDraftModel(MODEL_CHOICES[0]);
    setDraftColor(COLOR_SWATCHES[0].value);
    setDraftInstructions("");
    setDraftApps(["Slack", "Google Drive"]);
  };

  const handleCreateSubmit = useCallback(() => {
    const cleanName = draftName.trim() || "Scout";
    const cleanRole = draftRole.trim() || "Monitors tasks and summarizes updates";
    const id = `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36).slice(-4)}`;
    const created: AgentMember = {
      id,
      name: cleanName,
      role: cleanRole,
      color: draftColor,
      model: draftModel,
      status: "idle",
      lastRun: "Added just now",
      runs: 0,
      cost: 0,
      daily: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      owner: user.name,
      instructions:
        draftInstructions.trim() ||
        `Help ${workspace} with ${cleanRole.toLowerCase()} and ask in Inbox before external actions.`,
      skills: ["Brand voice"],
      apps: draftApps.length > 0 ? draftApps : ["Slack"],
      recent: [{ title: "Joined the team", state: "Ready", at: "Just now" }],
    };

    setInternalAgents((prev) => [created, ...prev]);
    setFilter("all");
    setOpenId(created.id);
    setPanelOpen(true);
    setCreateOpen(false);
    resetCreateForm();
    setLiveAnnouncement(`Created agent ${created.name}`);
    onCreate?.(created);

    if (!reducedMotion) {
      setJustCreatedId(created.id);
      if (waveTimerRef.current !== null) window.clearTimeout(waveTimerRef.current);
      waveTimerRef.current = window.setTimeout(() => {
        setJustCreatedId(null);
      }, 1500);
    }

    window.requestAnimationFrame(() => {
      const el = cardRefs.current.get(created.id);
      el?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    });
  }, [
    draftApps,
    draftColor,
    draftInstructions,
    draftModel,
    draftName,
    draftRole,
    onCreate,
    reducedMotion,
    user.name,
    workspace,
  ]);

  const toggleDraftApp = (app: string) => {
    setDraftApps((prev) =>
      prev.includes(app) ? prev.filter((x) => x !== app) : [...prev, app],
    );
  };

  const renderInspector = () => {
    if (loading) {
      return (
        <div className="af-aops-panel-body">
          <div className="af-aops-skel-stack">
            <div className="af-aops-row-inline">
              <AfSkeleton width={40} height={40} radius={10} />
              <div className="af-aops-skel-col">
                <AfSkeleton width="55%" height={15} />
                <AfSkeleton width="80%" height={12} />
              </div>
            </div>
            <AfSkeleton width="100%" height={36} radius={8} />
            <AfSkeleton width="100%" height={76} radius={8} />
            <AfSkeleton width="100%" height={68} radius={8} />
            <AfSkeleton width="90%" height={14} />
            <AfSkeleton width="75%" height={14} />
          </div>
        </div>
      );
    }

    if (!selectedAgent) {
      return (
        <div className="af-aops-panel-empty">
          <p className="af-aops-muted">Select an agent to inspect its instructions, skills and recent tasks.</p>
        </div>
      );
    }

    const isWorking = selectedAgent.status === "working";
    const isPaused = selectedAgent.status === "paused";
    const dailyValues = selectedAgent.daily ?? [1, 2, 1, 3, 2, 1, 0, 2, 3, 2, 1, 2, 3, 2];
    const ownerName = selectedAgent.owner || user.name;
    const statusLine = isWorking
      ? selectedAgent.doing || "Working now"
      : isPaused
        ? selectedAgent.lastRun || "Paused"
        : selectedAgent.lastRun
          ? `Idle · ${selectedAgent.lastRun}`
          : "Idle";

    return (
      <div className="af-aops-panel-body af-agt-insp">
        <div className="af-agt-insp__head">
          <div className="af-agt-insp__id">
            <AfAvatar
              kind="agent"
              working={isWorking && !reducedMotion}
              seed={`${selectedAgent.id}:${selectedAgent.name}`}
              color={selectedAgent.color}
              size={34}
            />
            <div className="af-aops-agent-head__meta">
              <h2 className="af-aops-panel-title">{selectedAgent.name}</h2>
              <p className="af-aops-panel-sub">{selectedAgent.role}</p>
            </div>
          </div>

          <div className="af-agt-insp__actions">
            <AfButton
              variant="primary"
              size="sm"
              icon={<AfIcon name="message" size={13} />}
              onClick={() => handleMessage(selectedAgent)}
            >
              {copy.message}
            </AfButton>
            <AfTooltip label={isPaused ? copy.resume : copy.pause}>
              <button
                type="button"
                className="af-agt-pause-btn"
                aria-label={isPaused ? copy.resume : copy.pause}
                onClick={() => handleTogglePause(selectedAgent)}
              >
                <AfIcon name={isPaused ? "play" : "pause"} size={13} />
              </button>
            </AfTooltip>
          </div>
        </div>

        <div className="af-agt-props">
          <div className="af-agt-prop-row">
            <span className="af-agt-prop-row__label">Status</span>
            <span
              className="af-agt-prop-row__val"
              data-breathing={isWorking && !reducedMotion ? "true" : undefined}
            >
              <span className="af-aops-status-dot" data-status={selectedAgent.status} aria-hidden="true" />
              <span className="af-aops-ellipsis">{statusLine}</span>
            </span>
          </div>
          <div className="af-agt-prop-row">
            <span className="af-agt-prop-row__label">Model</span>
            <span className="af-agt-prop-row__val af-aops-model-inline">
              <ModelMakerMark model={selectedAgent.model} size={13} />
              <span>{selectedAgent.model}</span>
            </span>
          </div>
          <div className="af-agt-prop-row">
            <span className="af-agt-prop-row__label">Reports to</span>
            <span className="af-agt-prop-row__val">
              <AfAvatar name={ownerName} size={16} />
              <span>{ownerName}</span>
            </span>
          </div>
        </div>

        <section className="af-agt-sec">
          <div className="af-aops-panel-sec__head">
            <span className="af-aops-panel-sec__title">Runs</span>
            <span className="af-aops-muted af-aops-tabular">
              {formatCompactCount(selectedAgent.runs)} this week · {formatCurrencyValue(selectedAgent.cost, currency)}
            </span>
          </div>
          <div className="af-agt-runs-chart">
            <div className="af-agt-runs-ticks" aria-hidden="true">
              <span>10</span>
              <span>5</span>
              <span>0</span>
            </div>
            <div className="af-agt-runs-plot">
              <MiniDailyBars
                values={dailyValues}
                color={selectedAgent.color}
                animateKey={selectedAgent.id}
                height={46}
                formatTip={(v, idx) => `Day ${idx + 1}: ${v} ${v === 1 ? "run" : "runs"}`}
              />
              <div className="af-agt-runs-axis" aria-hidden="true">
                <span>2 weeks ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </section>

        {selectedAgent.instructions ? (
          <section className="af-agt-sec">
            <div className="af-aops-panel-sec__head">
              <span className="af-aops-panel-sec__title">{copy.instructions}</span>
            </div>
            <p
              className="af-aops-prose af-agt-prose"
              data-clamped={instructionsExpanded ? undefined : "true"}
            >
              {selectedAgent.instructions}
            </p>
            <button
              type="button"
              className="af-agt-show-btn"
              onClick={() => setInstructionsExpanded((prev) => !prev)}
            >
              {instructionsExpanded ? "Show less" : "Show all"}
            </button>
          </section>
        ) : null}

        {selectedAgent.skills && selectedAgent.skills.length > 0 ? (
          <section className="af-agt-sec">
            <div className="af-aops-panel-sec__head">
              <span className="af-aops-panel-sec__title">{copy.skills}</span>
              <button
                type="button"
                className="af-agt-sec-link"
                onClick={() => onNavigate?.("Skills")}
              >
                <span>Skills</span>
                <AfIcon name="chevronRight" size={11} />
              </button>
            </div>
            <div className="af-aops-chip-wrap">
              {selectedAgent.skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="af-aops-chip-btn"
                  onClick={() => onNavigate?.("Skills")}
                >
                  <AfIcon name="sparkle" size={11} />
                  <span>{skill}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {selectedAgent.apps && selectedAgent.apps.length > 0 ? (
          <section className="af-agt-sec">
            <div className="af-aops-panel-sec__head">
              <span className="af-aops-panel-sec__title">{copy.apps}</span>
              <button
                type="button"
                className="af-agt-sec-link"
                onClick={() => onNavigate?.("Permissions")}
              >
                <span>Permissions</span>
                <AfIcon name="chevronRight" size={11} />
              </button>
            </div>
            <div className="af-aops-chip-wrap">
              {selectedAgent.apps.map((app) => (
                <button
                  key={app}
                  type="button"
                  className="af-aops-chip-btn"
                  onClick={() => onNavigate?.("Permissions")}
                >
                  <AppBrandTile name={app} size={15} />
                  <span>{app}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {selectedAgent.recent && selectedAgent.recent.length > 0 ? (
          <section className="af-agt-sec">
            <div className="af-aops-panel-sec__head">
              <span className="af-aops-panel-sec__title">{copy.recent}</span>
            </div>
            <div className="af-agt-task-list">
              {selectedAgent.recent.map((task, idx) => {
                const stateNorm = task.state.toLowerCase();
                const kind = stateNorm.includes("run")
                  ? "running"
                  : stateNorm.includes("pause") || stateNorm.includes("need")
                    ? "paused"
                    : "done";
                return (
                  <div key={`${task.title}-${idx}`} className="af-agt-task-row">
                    <span className="af-agt-task-row__left">
                      <span className="af-agt-task-glyph" data-kind={kind} aria-hidden="true">
                        {kind === "done" ? (
                          <AfIcon name="checkCircle" size={12} />
                        ) : (
                          <span className="af-agt-task-ring" />
                        )}
                      </span>
                      <span className="af-agt-task-row__title">{task.title}</span>
                    </span>
                    <span className="af-agt-task-row__at af-aops-tabular">{task.at}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const shellClassName = ["af-aops--agents", className].filter(Boolean).join(" ");

  return (
    <AgentOpsShell
      activeNav="Agents"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      maxWidth={860}
      panel={empty ? null : renderInspector()}
      panelTitle={selectedAgent?.name ?? copy.agents}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={352}
      liveMessage={liveAnnouncement || summaryStatusLine}
      className={shellClassName}
      style={style}
      {...rest}
    >
      <div className="af-aops-toolbar af-agt-toolbar">
        <div
          className="af-aops-tabs"
          role="tablist"
          aria-label="Filter agents by status"
          onKeyDown={handleFilterTabKeyDown}
        >
          {(
            [
              { id: "all", label: copy.all, count: counts.all },
              { id: "working", label: copy.working, count: counts.working },
              { id: "idle", label: copy.idle, count: counts.idle },
              { id: "paused", label: copy.paused, count: counts.paused },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                className="af-aops-tab"
                data-active={active || undefined}
                onClick={() => setFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="af-aops-tab__count af-aops-tabular">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="af-agt-toolbar__right">
          <div
            className="af-aops-view-toggle"
            role="group"
            aria-label="View layout"
            onKeyDown={handleViewSwitchKeyDown}
          >
            <AfTooltip label={copy.grid}>
              <button
                type="button"
                className="af-aops-view-btn"
                data-active={view === "grid" || undefined}
                aria-label={copy.grid}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <AfIcon name="grid" size={14} />
              </button>
            </AfTooltip>
            <AfTooltip label={copy.list}>
              <button
                type="button"
                className="af-aops-view-btn"
                data-active={view === "list" || undefined}
                aria-label={copy.list}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <AfIcon name="list" size={14} />
              </button>
            </AfTooltip>
          </div>

          <AfButton
            variant="primary"
            size="sm"
            icon={<AfIcon name="plus" size={14} />}
            aria-label={copy.newAgent}
            onClick={() => setCreateOpen(true)}
          >
            <span className="af-aops-btn-label">{copy.newAgent}</span>
          </AfButton>
        </div>
      </div>

      {loading ? (
        <div className="af-aops-agents-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="af-aops-agent-card af-aops-agent-card--skel">
              <div className="af-aops-row-inline">
                <AfSkeleton width={34} height={34} radius={9} />
                <div className="af-aops-skel-col">
                  <AfSkeleton width="48%" height={14} />
                  <AfSkeleton width="76%" height={12} />
                </div>
              </div>
              <AfSkeleton width="66%" height={12} />
              <div className="af-aops-row-between">
                <AfSkeleton width={90} height={14} />
                <AfSkeleton width={70} height={14} />
              </div>
            </div>
          ))}
        </div>
      ) : empty || internalAgents.length === 0 ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="bot" size={22} />
          </div>
          <h2 className="af-aops-empty__title">No agents yet</h2>
          <p className="af-aops-empty__desc">
            Create an agent with its own role, model and connected apps to work alongside your team.
          </p>
          <AfButton
            variant="primary"
            size="sm"
            icon={<AfIcon name="plus" size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            {copy.newAgent}
          </AfButton>
        </div>
      ) : visibleAgents.length === 0 ? (
        <div className="af-aops-empty af-aops-empty--compact">
          <p className="af-aops-empty__desc">No {filter} agents right now.</p>
          <AfButton variant="secondary" size="sm" onClick={() => setFilter("all")}>
            Show all agents
          </AfButton>
        </div>
      ) : view === "grid" ? (
        <div
          className="af-aops-agents-grid"
          role="region"
          aria-label="Agent team cards"
          onKeyDown={handleCollectionKeyDown}
        >
          {visibleAgents.map((agent) => {
            const isSelected = openId === agent.id;
            const isWorking = agent.status === "working";
            const statusText = isWorking
              ? agent.doing || "Working"
              : agent.status === "paused"
                ? agent.lastRun || "Paused"
                : agent.lastRun
                  ? `Idle · ${agent.lastRun}`
                  : "Idle";
            const statusPillText =
              agent.status === "working"
                ? copy.working
                : agent.status === "paused"
                  ? copy.paused
                  : copy.idle;
            const appList = agent.apps ?? [];
            const fullAria = `${agent.name}, ${agent.role}, ${statusText}`;

            return (
              <button
                key={agent.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(agent.id, el);
                  else cardRefs.current.delete(agent.id);
                }}
                type="button"
                className="af-aops-agent-card"
                data-selected={isSelected || undefined}
                data-status={agent.status}
                data-new-wave={justCreatedId === agent.id ? "true" : undefined}
                aria-current={isSelected ? "true" : undefined}
                aria-label={fullAria}
                onClick={() => selectAgent(agent.id)}
              >
                <div className="af-aops-agent-card__top">
                  <AfAvatar
                    kind="agent"
                    working={isWorking && !reducedMotion}
                    seed={`${agent.id}:${agent.name}`}
                    color={agent.color}
                    size={32}
                  />
                  <div className="af-aops-agent-card__id">
                    <span className="af-aops-agent-card__name">{agent.name}</span>
                    <span className="af-aops-agent-card__role">{agent.role}</span>
                  </div>
                  <span className="af-agt-status-pill" data-status={agent.status}>
                    {statusPillText}
                  </span>
                </div>

                <div className="af-agt-apps-line">
                  {appList.length > 0 ? (
                    <span className="af-aops-app-stack" aria-hidden="true">
                      {appList.slice(0, 3).map((app) => (
                        <AppBrandTile key={app} name={app} size={15} />
                      ))}
                    </span>
                  ) : null}
                  <span className="af-agt-apps-line__text">
                    Access to {appList.length} {appList.length === 1 ? "app" : "apps"}
                  </span>
                </div>

                <div className="af-aops-agent-card__foot">
                  <span className="af-aops-model-inline">
                    <ModelMakerMark model={agent.model} size={13} />
                    <span className="af-aops-agent-card__model">{agent.model}</span>
                  </span>

                  <span className="af-aops-agent-card__stats af-aops-tabular">
                    <span>{formatCompactCount(agent.runs)} runs</span>
                    <span>
                      {formatCurrencyValue(Math.round(agent.cost), currency).replace(/\.00$/, "")}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="af-aops-agents-list"
          role="region"
          aria-label="Agent team list"
          onKeyDown={handleCollectionKeyDown}
        >
          {visibleAgents.map((agent) => {
            const isSelected = openId === agent.id;
            const isWorking = agent.status === "working";
            const statusText = isWorking
              ? agent.doing || "Working"
              : agent.status === "paused"
                ? agent.lastRun || "Paused"
                : agent.lastRun || "Idle";

            return (
              <button
                key={agent.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(agent.id, el);
                  else cardRefs.current.delete(agent.id);
                }}
                type="button"
                className="af-aops-agent-row"
                data-selected={isSelected || undefined}
                data-status={agent.status}
                data-new-wave={justCreatedId === agent.id ? "true" : undefined}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${agent.name}, ${agent.role}, ${statusText}`}
                onClick={() => selectAgent(agent.id)}
              >
                <AfAvatar
                  kind="agent"
                  working={isWorking && !reducedMotion}
                  seed={`${agent.id}:${agent.name}`}
                  color={agent.color}
                  size={28}
                />
                <span className="af-aops-agent-row__name">{agent.name}</span>
                <span className="af-aops-agent-row__role">{agent.role}</span>
                <span className="af-aops-agent-row__status">
                  <span className="af-aops-status-dot" data-status={agent.status} aria-hidden="true" />
                  <span>{statusText}</span>
                </span>
                <span className="af-aops-agent-row__model af-aops-model-inline">
                  <ModelMakerMark model={agent.model} size={13} />
                  <span>{agent.model}</span>
                </span>
                <span className="af-aops-agent-row__nums af-aops-tabular">
                  {formatCompactCount(agent.runs)} · {formatCurrencyValue(agent.cost, currency)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <AfModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={copy.newAgent}
        width={460}
        contained
        footer={
          <div className="af-aops-modal-foot">
            <span className="af-aops-muted af-aops-kbd-hint">⌘ Enter to create</span>
            <div className="af-aops-modal-foot__btns">
              <AfButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </AfButton>
              <AfButton variant="primary" size="sm" onClick={handleCreateSubmit}>
                Create agent
              </AfButton>
            </div>
          </div>
        }
      >
        <div
          className="af-aops-form"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleCreateSubmit();
            }
          }}
        >
          <div className="af-aops-agent-preview">
            <AfAvatar
              kind="agent"
              working={!reducedMotion && Boolean(draftName.trim())}
              seed={`draft:${draftName.trim() || "scout"}`}
              color={draftColor}
              size={44}
            />
            <div className="af-aops-agent-preview__meta">
              <span className="af-aops-agent-preview__name">
                {draftName.trim() || "New agent"}
              </span>
              <span className="af-aops-agent-preview__role">
                {draftRole.trim() || "Describe what this agent owns"}
              </span>
            </div>
          </div>

          <label className="af-aops-field">
            <span className="af-aops-field__label">Name</span>
            <input
              type="text"
              className="af-aops-input"
              placeholder="e.g. Reviewer, Support lead, Billing ops"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="af-aops-field">
            <span className="af-aops-field__label">What it does</span>
            <input
              type="text"
              className="af-aops-input"
              placeholder="One plain sentence on its job"
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
            />
          </label>

          <div className="af-aops-field">
            <span className="af-aops-field__label">Model</span>
            <div className="af-aops-model-grid" role="radiogroup" aria-label="Agent model">
              {MODEL_CHOICES.map((model) => {
                const checked = draftModel === model;
                return (
                  <button
                    key={model}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className="af-aops-model-choice"
                    data-active={checked || undefined}
                    onClick={() => setDraftModel(model)}
                  >
                    <ModelMakerMark model={model} size={14} />
                    <span>{model}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="af-aops-field">
            <span className="af-aops-field__label">Color</span>
            <div className="af-aops-swatches" role="radiogroup" aria-label="Agent color">
              {COLOR_SWATCHES.map((swatch) => {
                const checked = draftColor === swatch.value;
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={swatch.label}
                    className="af-aops-swatch"
                    data-active={checked || undefined}
                    style={{ "--swatch": swatch.value } as CSSProperties}
                    onClick={() => setDraftColor(swatch.value)}
                  />
                );
              })}
            </div>
          </div>

          <div className="af-aops-field">
            <span className="af-aops-field__label">Connected apps</span>
            <div className="af-aops-chip-wrap">
              {APP_CHOICES.map((app) => {
                const active = draftApps.includes(app);
                return (
                  <button
                    key={app}
                    type="button"
                    className="af-aops-chip-btn"
                    data-active={active || undefined}
                    aria-pressed={active}
                    onClick={() => toggleDraftApp(app)}
                  >
                    <AppBrandTile name={app} size={15} />
                    <span>{app}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="af-aops-field">
            <span className="af-aops-field__label">Instructions (optional)</span>
            <textarea
              className="af-aops-textarea"
              rows={2}
              placeholder="Boundaries, tone or when it should ask first…"
              value={draftInstructions}
              onChange={(e) => setDraftInstructions(e.target.value)}
            />
          </label>
        </div>
      </AfModal>
    </AgentOpsShell>
  );
}
