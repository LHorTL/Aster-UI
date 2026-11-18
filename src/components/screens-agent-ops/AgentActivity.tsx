import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfBadge } from "../display/Badge";
import { AfSkeleton } from "../display/Skeleton";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  AppBrandTile,
  DEFAULT_AGENT_OPS_USER,
  DEFAULT_FIELDWORK_APPS,
  isTypingTarget,
  usePrefersReducedMotion,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type ActivityApp = {
  id: string;
  name: string;
  account?: string;
  logo?: ReactNode;
  tile?: string;
  icon?: AffectIconKey | ReactNode;
};

export type ActivityItem = {
  id: string;
  at: string | number;
  day?: string;
  app: string;
  text: string;
  task?: string;
  by: "auto" | "approved";
  rule?: string;
  approvedAt?: string;
  details?: { label: string; value: string }[];
  preview?: string;
  undo?: { until: string; how: string };
  final?: string;
  undone?: boolean;
  cost?: number;
};

export type ActivityLabels = {
  activity?: string;
  all?: string;
  auto?: string;
  approved?: string;
  undo?: string;
  undone?: string;
  final?: string;
  why?: string;
  details?: string;
  preview?: string;
  undoTitle?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyBody?: string;
  setPermissions?: string;
  stepPanel?: string;
};

export type AfAgentActivityProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  apps?: ActivityApp[];
  items?: ActivityItem[];
  defaultSelected?: string | null;
  onUndo?: (item: ActivityItem) => void;
  onOpenTask?: (task: string) => void;
  onSelect?: (id: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  labels?: ActivityLabels;
  loading?: boolean;
  empty?: boolean;
  className?: string;
  style?: CSSProperties;
};

type ActivityFilter = "all" | "auto" | "approved" | "undone";

export const DEFAULT_ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: "a1",
    at: "14:45",
    day: "Today",
    app: "gmail",
    text: "Sent the weekly update to Priya Shah",
    task: "Weekly update",
    by: "approved",
    approvedAt: "14 minutes ago",
    details: [
      { label: "To", value: "Priya Shah · priya@northwind.io" },
      { label: "Subject", value: "Fieldwork – week 46" },
    ],
    preview:
      "Hi Priya —\n\nThree things from this week: the webhook retry queue is on staging, onboarding drafts are with Tom, and the ingest doc is in Clients. Latency across billing retries dropped from 1.8s to 310ms.\n\nWant the raw numbers before Friday's sync?",
    undo: {
      until: "46 minutes left to undo",
      how: "Cancels the scheduled send in Gmail before it leaves your outbox.",
    },
    cost: 0.08,
  },
  {
    id: "a2",
    at: "14:19",
    day: "Today",
    app: "stripe",
    text: "Refunded 38 € to Hannah Kim",
    task: "Billing webhooks",
    by: "auto",
    rule: "Stripe · Issue refunds up to €50",
    details: [
      { label: "Charge", value: "ch_3Q9kL2 · €38.00" },
      { label: "Customer", value: "hannah.kim@lumen.io" },
      { label: "Reason", value: "Duplicate webhook retry" },
    ],
    final: "Card refunds settle with the payment network right away and cannot be reversed.",
    cost: 0.04,
  },
  {
    id: "a3",
    at: "13:53",
    day: "Today",
    app: "slack",
    text: "Posted the staging link in #platform",
    task: "Billing webhooks",
    by: "auto",
    rule: "Slack · Post updates in project channels",
    details: [
      { label: "Channel", value: "#platform" },
      { label: "Thread", value: "Staging deploy v2.14" },
    ],
    preview:
      "Staging is green on v2.14.2 — webhook replay latency dropped from 1.8s to 310ms across 480 test events. Preview: https://staging.fieldwork.co/webhooks",
    undo: {
      until: "15:30",
      how: "Deletes the message from #platform so only the thread history remains.",
    },
    cost: 0.03,
  },
  {
    id: "a4",
    at: "13:22",
    day: "Today",
    app: "github",
    text: "Opened pull request #482 – Retry failed billing webhooks",
    task: "Billing webhooks",
    by: "auto",
    rule: "GitHub · Open pull requests on feature branches",
    details: [
      { label: "Repository", value: "fieldwork-labs/api" },
      { label: "Branch", value: "fix/webhook-backoff → main" },
      { label: "Checks", value: "14 / 14 passing" },
    ],
    undo: {
      until: "18:00",
      how: "Closes pull request #482 without deleting the branch.",
    },
    cost: 0.19,
  },
  {
    id: "a5",
    at: "11:57",
    day: "Today",
    app: "calendar",
    text: "Booked a review call with Tom Becker for Thursday 10:30",
    task: "Onboarding emails",
    by: "approved",
    approvedAt: "You approved · Today 11:56",
    details: [
      { label: "When", value: "Thu, Nov 16 · 10:30 – 11:00 CET" },
      { label: "Guests", value: "tom@northwind.co, alex@fieldwork.co" },
    ],
    undo: {
      until: "17:00",
      how: "Cancels the calendar invite and lets Tom Becker know.",
    },
    cost: 0.05,
  },
  {
    id: "a6",
    at: "10:57",
    day: "Today",
    app: "drive",
    text: "Created “Northwind – ingest design” in Clients",
    task: "Ingest pipeline",
    by: "auto",
    rule: "Google Drive · Create docs in Shared drive · Clients",
    details: [
      { label: "Folder", value: "Shared drive / Clients / Northwind" },
      { label: "Sharing", value: "Fieldwork workspace" },
    ],
    undo: {
      until: "16:30",
      how: "Moves “Northwind – ingest design” to Google Drive trash.",
    },
    cost: 0.11,
  },
  {
    id: "a7",
    at: "12:57",
    day: "Yesterday",
    app: "github",
    text: "Merged #479 – Move our apps to API v2",
    task: "API migration",
    by: "approved",
    approvedAt: "You approved · Yesterday 12:55",
    details: [
      { label: "Repository", value: "fieldwork-labs/api" },
      { label: "Commit", value: "9d4e21a on main" },
    ],
    final: "Merged into main and already deployed to production.",
    cost: 0.24,
  },
  {
    id: "a8",
    at: "09:57",
    day: "Yesterday",
    app: "gmail",
    text: "Sent an invoice reminder to Lumen Studio",
    task: "Billing webhooks",
    by: "approved",
    approvedAt: "You approved · Yesterday 09:56",
    details: [
      { label: "To", value: "billing@lumen.studio" },
      { label: "Status", value: "Cancelled before delivery" },
    ],
    undone: true,
    cost: 0.04,
  },
  {
    id: "a9",
    at: "07:57",
    day: "Yesterday",
    app: "slack",
    text: "Asked Tom Becker for the staging keys",
    task: "Billing webhooks",
    by: "approved",
    approvedAt: "You approved · Yesterday 07:55",
    details: [
      { label: "Recipient", value: "@tom.becker" },
      { label: "Status", value: "Read and replied" },
    ],
    final: "Direct message was already read and replied to.",
    cost: 0.02,
  },
];

function formatStepTime(at: string | number): string {
  if (typeof at === "string") return at;
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function inferStepDay(item: ActivityItem): string {
  if (item.day) return item.day;
  if (typeof item.at === "number") {
    const diff = Date.now() - item.at;
    if (diff < 86_400_000) return "Today";
    if (diff < 172_800_000) return "Yesterday";
    return new Date(item.at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return "Today";
}

/**
 * Agent / Activity (`/screens/agent-activity`):
 * Chronological sentence log of every action your agent took across connected apps,
 * with reversible Undo strike-through animation and a contextual Step inspector.
 */
export function AfAgentActivity(props: AfAgentActivityProps = {}) {
  const {
    apps = DEFAULT_FIELDWORK_APPS,
    items: itemsProp,
    defaultSelected = "a1",
    onUndo,
    onOpenTask,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 5,
    labels,
    loading = false,
    empty = false,
    className,
    style,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const [localItems, setLocalItems] = useState<ActivityItem[]>(() => itemsProp ?? DEFAULT_ACTIVITY_ITEMS);
  useEffect(() => {
    if (itemsProp) setLocalItems(itemsProp);
  }, [itemsProp]);

  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultSelected !== null);
  const [justUndoneId, setJustUndoneId] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const copy = {
    activity: labels?.activity ?? "Activity",
    all: labels?.all ?? "All",
    auto: labels?.auto ?? "On its own",
    approved: labels?.approved ?? "You approved",
    undo: labels?.undo ?? "Undo",
    undone: labels?.undone ?? "Undone",
    final: labels?.final ?? "Final",
    why: labels?.why ?? "Why it could",
    details: labels?.details ?? "What happened",
    preview: labels?.preview ?? "Preview",
    undoTitle: labels?.undoTitle ?? "What Undo does",
    searchPlaceholder: labels?.searchPlaceholder ?? "Search",
    emptyTitle: labels?.emptyTitle ?? "Nothing yet",
    emptyBody:
      labels?.emptyBody ??
      "Every email, pull request, refund and message your agent takes on its own or with your OK shows up here.",
    setPermissions: labels?.setPermissions ?? "Set permissions",
    stepPanel: labels?.stepPanel ?? "Step",
  };

  const appMap = useMemo(() => {
    const m = new Map<string, ActivityApp>();
    for (const a of apps) m.set(a.id.toLowerCase(), a);
    return m;
  }, [apps]);

  const filteredItems = useMemo(() => {
    if (empty) return [];
    const q = query.trim().toLowerCase();
    return localItems.filter((item) => {
      if (filter === "auto" && item.by !== "auto") return false;
      if (filter === "approved" && item.by !== "approved") return false;
      if (filter === "undone" && !item.undone) return false;
      if (!q) return true;
      const appInfo = appMap.get(item.app.toLowerCase());
      const hay = `${item.text} ${item.task ?? ""} ${appInfo?.name ?? item.app} ${item.rule ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [appMap, empty, filter, localItems, query]);

  const groupedDays = useMemo(() => {
    const groups: { day: string; items: ActivityItem[] }[] = [];
    const indexByDay = new Map<string, number>();
    for (const item of filteredItems) {
      const day = inferStepDay(item);
      const existing = indexByDay.get(day);
      if (existing === undefined) {
        indexByDay.set(day, groups.length);
        groups.push({ day, items: [item] });
      } else {
        groups[existing]!.items.push(item);
      }
    }
    return groups;
  }, [filteredItems]);

  const selectedItem = useMemo(
    () => (empty ? null : localItems.find((it) => it.id === selectedId) ?? null),
    [empty, localItems, selectedId],
  );

  const openStep = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      onSelect?.(id);
    },
    [onSelect],
  );

  const handleUndo = useCallback(
    (item: ActivityItem) => {
      if (item.undone || !item.undo) return;
      setLocalItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, undone: true } : entry)));
      if (!reducedMotion) {
        setJustUndoneId(item.id);
        window.setTimeout(() => {
          setJustUndoneId((cur) => (cur === item.id ? null : cur));
        }, 900);
      }
      setLiveMsg(`${copy.undone}: ${item.text}`);
      onUndo?.({ ...item, undone: true });
    },
    [copy.undone, onUndo, reducedMotion],
  );

  const handleTaskLink = useCallback(
    (task: string) => {
      if (onOpenTask) onOpenTask(task);
      else onNavigate?.("Tasks");
    },
    [onNavigate, onOpenTask],
  );

  // Global J/K/U and `/` keyboard navigation within the screen
  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target)) return;
    if (e.key === "/") {
      e.preventDefault();
      setSearchOpen(true);
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }
    if (e.key === "j" || e.key === "J" || e.key === "ArrowDown" || e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
      if (filteredItems.length === 0) return;
      // Let filter tablist handle horizontal arrows, step rows handle vertical
      const delta = e.key === "j" || e.key === "J" || e.key === "ArrowDown" ? 1 : -1;
      const curIdx = filteredItems.findIndex((it) => it.id === selectedId);
      const nextIdx = curIdx < 0 ? 0 : (curIdx + delta + filteredItems.length) % filteredItems.length;
      const next = filteredItems[nextIdx];
      if (next) {
        e.preventDefault();
        openStep(next.id);
        rowRefs.current[next.id]?.focus();
      }
      return;
    }
    if ((e.key === "u" || e.key === "U") && selectedItem && selectedItem.undo && !selectedItem.undone) {
      e.preventDefault();
      handleUndo(selectedItem);
    }
  };

  const filterTabs: { id: ActivityFilter; label: string; count?: number }[] = [
    { id: "all", label: copy.all },
    { id: "auto", label: copy.auto },
    { id: "approved", label: copy.approved },
    { id: "undone", label: copy.undone },
  ];

  const handleFilterArrow = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = filterTabs.findIndex((t) => t.id === filter);
    const nextIdx =
      e.key === "ArrowRight"
        ? (idx + 1) % filterTabs.length
        : (idx - 1 + filterTabs.length) % filterTabs.length;
    setFilter(filterTabs[nextIdx]!.id);
  };

  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="af-aops-inspector">
          <div className="af-aops-inspector__head">
            <AfSkeleton variant="rect" width={32} height={32} radius={8} />
            <div className="af-aops-flex-1">
              <AfSkeleton line="82%" />
              <AfSkeleton line="48%" />
            </div>
          </div>
          <AfSkeleton lines={3} />
          <AfSkeleton lines={4} />
        </div>
      );
    }

    if (!selectedItem) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="clock" size={18} />
          <span>Select a step to inspect why it ran and what Undo does.</span>
        </div>
      );
    }

    const appInfo = appMap.get(selectedItem.app.toLowerCase());
    const previewLines = selectedItem.preview ? selectedItem.preview.split("\n") : [];
    const isLongPreview = previewLines.length > 6 || (selectedItem.preview?.length ?? 0) > 260;
    const isExpanded = Boolean(previewExpanded[selectedItem.id]);

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-inspector__head">
          <AppBrandTile
            appId={selectedItem.app}
            name={appInfo?.name ?? selectedItem.app}
            logo={appInfo?.logo}
            tile={appInfo?.tile}
            icon={appInfo?.icon}
            size={32}
          />
          <div className="af-aops-inspector__titles">
            <h3 className="af-aops-inspector__title" data-undone={selectedItem.undone ? "true" : undefined}>
              {selectedItem.text}
            </h3>
            <div className="af-aops-inspector__sub">
              <span>{appInfo?.name ?? selectedItem.app}</span>
              {appInfo?.account ? <span> · {appInfo.account}</span> : null}
            </div>
          </div>
        </div>

        <div className="af-aops-kv-flat">
          <div className="af-aops-kv-flat__row">
            <span className="af-aops-kv-key">When</span>
            <span className="af-aops-kv-val">
              {inferStepDay(selectedItem)}, {formatStepTime(selectedItem.at)}
            </span>
          </div>
          {selectedItem.task ? (
            <div className="af-aops-kv-flat__row">
              <span className="af-aops-kv-key">Task</span>
              <button
                type="button"
                className="af-aops-inline-link af-aops-inline-link--muted"
                onClick={() => handleTaskLink(selectedItem.task!)}
              >
                <span>{selectedItem.task}</span>
                <AfIcon name="chevronRight" size={12} />
              </button>
            </div>
          ) : null}
        </div>

        {(selectedItem.details && selectedItem.details.length > 0) || selectedItem.preview ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title af-aops-sec__title--muted">{copy.details}</div>
            {selectedItem.details && selectedItem.details.length > 0 ? (
              <div className="af-aops-kv-flat">
                {selectedItem.details.map((d) => (
                  <div key={d.label} className="af-aops-kv-flat__row">
                    <span className="af-aops-kv-key">{d.label}</span>
                    <span className="af-aops-kv-val">{d.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedItem.preview ? (
              <>
                <div className="af-aops-preview-box" data-clamped={isLongPreview && !isExpanded ? "true" : undefined}>
                  {selectedItem.preview}
                </div>
                {isLongPreview ? (
                  <button
                    type="button"
                    className="af-aops-text-btn"
                    onClick={() =>
                      setPreviewExpanded((prev) => ({ ...prev, [selectedItem.id]: !isExpanded }))
                    }
                  >
                    {isExpanded ? "Show less" : "Show all"}
                  </button>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        <section className="af-aops-sec">
          <div className="af-aops-sec__head">
            <span className="af-aops-sec__title af-aops-sec__title--muted">{copy.why}</span>
            <button
              type="button"
              className="af-aops-inline-link af-aops-inline-link--muted"
              onClick={() => onNavigate?.("Permissions")}
            >
              <span>Permissions</span>
              <AfIcon name="chevronRight" size={12} />
            </button>
          </div>
          <div className="af-aops-why-box">
            <span
              className="af-aops-by-dot"
              data-by={selectedItem.by}
              aria-hidden="true"
            />
            <div className="af-aops-why-text">
              <div className="af-aops-why-primary">
                {selectedItem.by === "auto" ? copy.auto : copy.approved}
              </div>
              <div className="af-aops-why-secondary">
                {selectedItem.rule ??
                  selectedItem.approvedAt ??
                  (selectedItem.by === "auto"
                    ? "Allowed under your workspace autonomy rules"
                    : "Approved in Agent Inbox")}
              </div>
            </div>
          </div>
        </section>

        <section className="af-aops-sec">
          <div className="af-aops-sec__title af-aops-sec__title--muted">{copy.undoTitle}</div>
          {selectedItem.undone ? (
            <div className="af-aops-status-note" data-tone="muted">
              <AfIcon name="undo" size={14} />
              <span>This step was undone and taken back.</span>
            </div>
          ) : selectedItem.undo ? (
            <div className="af-aops-undo-block">
              <p className="af-aops-undo-card__desc">{selectedItem.undo.how}</p>
              <span className="af-aops-faint af-aops-tabular">
                {selectedItem.undo.until.includes("left")
                  ? selectedItem.undo.until
                  : `Until ${selectedItem.undo.until}`}
              </span>
              <div className="af-aops-undo-block__cta">
                <AfButton
                  variant="secondary"
                  size="sm"
                  icon="undo"
                  kbd="U"
                  onClick={() => handleUndo(selectedItem)}
                >
                  Undo this step
                </AfButton>
              </div>
            </div>
          ) : (
            <div className="af-aops-status-note" data-tone="locked">
              <AfIcon name="lock" size={14} />
              <span>{selectedItem.final ?? "This step has already settled and cannot be undone."}</span>
            </div>
          )}
        </section>
      </div>
    );
  };

  const selectedAppInfo = selectedItem ? appMap.get(selectedItem.app.toLowerCase()) : undefined;

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.activity}</h1>
        <span className="af-aops-topbar__count af-aops-tabular">{localItems.length}</span>
        <div
          className="af-aops-pills af-aops-pills--compact"
          role="tablist"
          aria-label="Filter activity"
          onKeyDown={handleFilterArrow}
        >
          {filterTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              className="af-aops-pill"
              data-active={filter === t.id ? "true" : undefined}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="af-aops-topbar__right">
        <div
          className="af-aops-search af-aops-search--compact"
          data-open={searchOpen || Boolean(query) ? "true" : undefined}
        >
          <AfIcon name="search" size={13} />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => {
              if (!query) setSearchOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown" && filteredItems[0]) {
                e.preventDefault();
                openStep(filteredItems[0].id);
                rowRefs.current[filteredItems[0].id]?.focus();
              }
            }}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
          />
        </div>
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Activity"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={740}
      panelTitle={copy.stepPanel}
      panelTab={selectedItem ? selectedItem.text : copy.stepPanel}
      panelTabIcon={
        selectedItem ? (
          <AppBrandTile
            appId={selectedItem.app}
            name={selectedAppInfo?.name ?? selectedItem.app}
            logo={selectedAppInfo?.logo}
            tile={selectedAppInfo?.tile}
            icon={selectedAppInfo?.icon}
            size={15}
            className="af-aops-tab-tile"
          />
        ) : null
      }
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={360}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      className={className}
      style={style}
      onKeyDown={handleRootKeyDown}
      {...rest}
    >

      {loading ? (
        <div className="af-aops-group-stack">
          {[0, 1].map((g) => (
            <div key={g} className="af-aops-day-group">
              <div className="af-aops-day-head">
                <AfSkeleton width={72} height={11} />
              </div>
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="af-aops-act-row af-aops-act-row--skeleton">
                  <AfSkeleton width={38} height={11} />
                  <AfSkeleton variant="rect" width={24} height={24} radius={6} />
                  <div className="af-aops-flex-1">
                    <AfSkeleton line="74%" />
                    <AfSkeleton line="42%" />
                  </div>
                  <AfSkeleton width={52} height={24} radius={6} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="clock" size={20} />
          </div>
          <h2 className="af-aops-empty__title">{copy.emptyTitle}</h2>
          <p className="af-aops-empty__desc">{copy.emptyBody}</p>
          <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("Permissions")}>
            {copy.setPermissions}
          </AfButton>
        </div>
      ) : groupedDays.length === 0 ? (
        <div className="af-aops-empty">
          <h2 className="af-aops-empty__title">No matching steps</h2>
          <p className="af-aops-empty__desc">Try clearing the filter or search terms.</p>
          <AfButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Show all activity
          </AfButton>
        </div>
      ) : (
        <div className="af-aops-group-stack">
          {groupedDays.map((group) => (
            <section key={group.day} className="af-aops-day-group" aria-label={group.day}>
              <div className="af-aops-day-head">
                <span className="af-aops-day-head__title">{group.day}</span>
                <span className="af-aops-day-head__count af-aops-tabular">{group.items.length}</span>
              </div>
              <div className="af-aops-list-card">
                {group.items.map((item) => {
                  const appInfo = appMap.get(item.app.toLowerCase());
                  const timeStr = formatStepTime(item.at);
                  const whoLabel = item.by === "auto" ? copy.auto : copy.approved;
                  const fullAria = `${timeStr}, ${item.text}, ${appInfo?.name ?? item.app}${
                    item.task ? `, task ${item.task}` : ""
                  }, ${whoLabel}${item.undone ? `, ${copy.undone}` : ""}`;
                  const isCurrent = selectedId === item.id;
                  const isAnimatingUndo = justUndoneId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="af-aops-act-row"
                      data-selected={isCurrent ? "true" : undefined}
                      data-undone={item.undone ? "true" : undefined}
                      data-just-undone={isAnimatingUndo ? "true" : undefined}
                    >
                      <button
                        ref={(el) => {
                          rowRefs.current[item.id] = el;
                        }}
                        type="button"
                        className="af-aops-act-row__main"
                        aria-label={fullAria}
                        aria-current={isCurrent ? "true" : undefined}
                        onClick={() => openStep(item.id)}
                      >
                        <span className="af-aops-act-time af-aops-tabular">{timeStr}</span>
                        <AppBrandTile
                          appId={item.app}
                          name={appInfo?.name ?? item.app}
                          logo={appInfo?.logo}
                          tile={appInfo?.tile}
                          icon={appInfo?.icon}
                          size={24}
                        />
                        <span className="af-aops-act-body">
                          <span className="af-aops-act-sentence-wrap">
                            <AfTooltip label={item.text} delay={420}>
                              <span className="af-aops-act-sentence">
                                <span className="af-aops-act-words">{item.text}</span>
                                <span className="af-aops-act-strike" aria-hidden="true" />
                              </span>
                            </AfTooltip>
                          </span>
                          <span className="af-aops-act-meta" aria-hidden="true">
                            <span className="af-aops-by-dot" data-by={item.by} />
                            <span>{whoLabel}</span>
                            {item.task ? <span className="af-aops-act-task">· {item.task}</span> : null}
                          </span>
                        </span>
                      </button>

                      <div className="af-aops-act-row__end">
                        {item.undone ? (
                          <span className="af-aops-undone-pill">
                            <AfBadge tone="neutral" size="sm">
                              {copy.undone}
                            </AfBadge>
                          </span>
                        ) : item.undo ? (
                          <button
                            type="button"
                            className="af-aops-undo-btn"
                            aria-label={`${copy.undo}: ${item.text}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndo(item);
                            }}
                          >
                            <AfIcon name="undo" size={13} />
                            <span className="af-aops-undo-btn__label">{copy.undo}</span>
                          </button>
                        ) : (
                          <span className="af-aops-final-tag" title={item.final}>
                            <AfIcon name="lock" size={11} />
                            <span>{copy.final}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </AgentOpsShell>
  );
}
