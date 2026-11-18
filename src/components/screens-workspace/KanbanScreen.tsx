import { useCallback, useMemo, useState, type HTMLAttributes, type KeyboardEvent, type RefObject } from "react";
import { AfIcon } from "../../icons";
import { usePointerDragBoard } from "../../primitives";
import { AfSwitch } from "../controls/Switch";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfModal } from "../overlay/Modal";
import {
  WksSidebarExpandButton,
  WorkspaceInsetShell,
  type AfWorkspaceUser,
  type WksGroup,
  type WksNavItem,
} from "./WorkspaceShell";

export type AfKanbanTone = "low" | "medium" | "high" | "done";
export type AfKanbanStatus = "review" | "attention" | "progress" | "fixed";

export type AfKanbanColumn = {
  id: string;
  label: string;
  tone: AfKanbanTone;
};

export type AfKanbanCard = {
  id: string;
  column: string;
  title: string;
  description?: string;
  status?: AfKanbanStatus;
  comments?: number;
  attachments?: number;
  assignee?: string;
  labels?: string[];
  project?: string;
};

export type AfKanbanProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
  columns?: AfKanbanColumn[];
  cards?: AfKanbanCard[];
};

const NAV: WksNavItem[] = [
  { label: "Inbox", icon: "mail", count: 3 },
  { label: "Activity", icon: "clock", count: 2 },
  { label: "My issues", icon: "task" },
  { label: "Board", icon: "kanban" },
  { label: "Projects", icon: "folder" },
];

const GROUPS: WksGroup[] = [
  {
    label: "Problems",
    items: [
      { label: "Password reset emails failing", icon: "alert" },
      { label: "Payments failing for some users", icon: "creditCard" },
      { label: "Dashboard loads slowly", icon: "clock" },
    ],
  },
];

function PriorityGlyph({ tone, size = 12 }: { tone?: AfKanbanTone; size?: number }) {
  if (tone === "done") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" className="af-wks-kbn__prio" data-tone="done">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.6 7.1 6.3 8.8 9.6 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const bars = tone === "high" ? 3 : tone === "medium" ? 2 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" className="af-wks-kbn__prio" data-tone={tone ?? "low"}>
      <rect x="2" y="8.5" width="2.2" height="3.5" rx="0.8" fill="currentColor" />
      <rect x="5.9" y="5.8" width="2.2" height="6.2" rx="0.8" fill={bars >= 2 ? "currentColor" : "var(--af-line-strong)"} />
      <rect x="9.8" y="2.8" width="2.2" height="9.2" rx="0.8" fill={bars >= 3 ? "currentColor" : "var(--af-line-strong)"} />
    </svg>
  );
}

function StatusGlyph({ status }: { status: AfKanbanStatus }) {
  if (status === "attention") {
    return (
      <svg width={11} height={11} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="af-wks-kbn__status-svg">
        <path d="M6 1.8 10.7 10H1.3L6 1.8Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "review") {
    return (
      <svg width={11} height={11} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="af-wks-kbn__status-svg">
        <circle cx="6" cy="6" r="4.4" stroke="currentColor" strokeWidth="1.25" />
        <path d="M6 1.6A4.4 4.4 0 0 1 10.4 6H6V1.6Z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "progress") {
    return (
      <svg width={11} height={11} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="af-wks-kbn__status-svg">
        <circle cx="6" cy="6" r="4.4" stroke="currentColor" strokeWidth="1.25" />
        <path d="M6 1.6a4.4 4.4 0 0 1 0 8.8V1.6Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={11} height={11} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="af-wks-kbn__status-svg">
      <circle cx="6" cy="6" r="3.4" fill="currentColor" />
    </svg>
  );
}

const DEFAULT_COLUMNS: AfKanbanColumn[] = [
  { id: "low", label: "Low priority", tone: "low" },
  { id: "medium", label: "Medium priority", tone: "medium" },
  { id: "high", label: "High priority", tone: "high" },
  { id: "done", label: "Completed", tone: "done" },
];

const DEFAULT_CARDS: AfKanbanCard[] = [
  { id: "k-1", column: "low", title: "Reset password flow issue", description: "Users who signed up with Google but later added a password can't reset it.", status: "review", comments: 32, attachments: 1, assignee: "Mara Klein", labels: ["Auth"], project: "Core App" },
  { id: "k-2", column: "low", title: "Avatar upload ignores crop", description: "The cropped area is shown in the editor, but the full image is saved.", status: "progress", comments: 8, attachments: 2, assignee: "Jonas Weber", labels: ["UI"], project: "Profile" },
  { id: "k-3", column: "low", title: "Export settings to CSV", description: "Admins want to download the workspace settings as a CSV for their audits.", status: "progress", comments: 6, attachments: 1, assignee: "Lea Braun", labels: ["Enterprise"], project: "Admin" },
  { id: "k-4", column: "medium", title: "Session tokens expire too early", description: "Sessions end after 20 minutes instead of the expected 24 hours, so people sign in again and again.", status: "attention", comments: 32, attachments: 1, assignee: "Mara Klein", labels: ["Auth", "Bug"], project: "Core App" },
  { id: "k-5", column: "medium", title: "Broken password reset link", description: "Reset emails go out, but the magic link opens a 404 page.", status: "review", comments: 32, attachments: 1, assignee: "Jonas Weber", labels: ["Auth"], project: "Core App" },
  { id: "k-6", column: "medium", title: "Slow dashboard load", description: "The analytics dashboard takes 6–8 seconds to render.", status: "review", comments: 14, attachments: 1, assignee: "Lea Braun", labels: ["Perf"], project: "Analytics" },
  { id: "k-7", column: "high", title: "Checkout fails on Safari", description: "Customers on Safari 17 can't complete a purchase in the checkout flow.", status: "attention", comments: 32, attachments: 1, assignee: "Mara Klein", labels: ["Billing", "Bug"], project: "Checkout" },
  { id: "k-8", column: "high", title: "Video calls drop after 10 minutes", description: "Calls with more than four people end without a warning after about ten minutes.", status: "attention", comments: 18, attachments: 2, assignee: "Tom Fischer", labels: ["Realtime"], project: "Calls" },
  { id: "k-9", column: "high", title: "Webhook retries pile up", description: "Failed deliveries retry every second instead of backing off, and the queue keeps growing.", status: "review", comments: 9, attachments: 1, assignee: "Jonas Weber", labels: ["API"], project: "Platform" },
  { id: "k-10", column: "done", title: "WebSocket disconnects", description: "Live updates stopped after the connection idled for a minute.", status: "fixed", comments: 32, assignee: "Tom Fischer", labels: ["Realtime"], project: "Platform" },
  { id: "k-11", column: "done", title: "Mobile app crash on login", description: "Order creation failed now and then, leaving people with lost carts.", status: "fixed", comments: 32, assignee: "Lea Braun", labels: ["Mobile"], project: "Core App" },
];

const STATUS_LABEL: Record<AfKanbanStatus, string> = {
  attention: "Needs attention",
  review: "Ready for review",
  progress: "In progress",
  fixed: "Fixed",
};

const ASSIGNEES = ["Mara Klein", "Jonas Weber", "Lea Braun", "Tom Fischer", "Alex Morgan"];
const PROJECTS = ["Core App", "Checkout", "Platform", "Analytics", "Admin"];
const LABEL_POOL = ["Bug", "Auth", "Billing", "Perf", "UI", "API"];

export function AfKanban(props: AfKanbanProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    columns = DEFAULT_COLUMNS,
    cards: cardsProp,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Board");
  const [starred, setStarred] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [scope, setScope] = useState<"all" | "open" | "done">("all");
  const [statusFilters, setStatusFilters] = useState<AfKanbanStatus[]>([]);
  const [sortBy, setSortBy] = useState<"manual" | "comments" | "title">("manual");

  const [items, setItems] = useState<AfKanbanCard[]>(() => (empty && !cardsProp ? [] : cardsProp ?? DEFAULT_CARDS));

  // Composer Modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCol, setNewCol] = useState("medium");
  const [newStatus, setNewStatus] = useState<AfKanbanStatus>("progress");
  const [newAssignee, setNewAssignee] = useState("Mara Klein");
  const [newProject, setNewProject] = useState("Core App");
  const [newLabels, setNewLabels] = useState<string[]>(["Bug"]);
  const [createAnother, setCreateAnother] = useState(false);

  // Detail Modal state
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [activityMap, setActivityMap] = useState<Record<string, { text: string; time: string }[]>>({});
  const [commentDraft, setCommentDraft] = useState("");

  const openCard = items.find((c) => c.id === openCardId) ?? null;

  const doneColIds = useMemo(
    () => new Set(columns.filter((c) => c.tone === "done").map((c) => c.id)),
    [columns],
  );

  const openCount = items.filter((c) => !doneColIds.has(c.column)).length;
  const doneCount = items.filter((c) => doneColIds.has(c.column)).length;

  const visibleItems = useMemo(() => {
    let list = items.filter((c) => {
      const isDone = doneColIds.has(c.column);
      if (scope === "open" && isDone) return false;
      if (scope === "done" && !isDone) return false;
      if (statusFilters.length > 0 && (!c.status || !statusFilters.includes(c.status))) return false;
      return true;
    });
    if (sortBy === "comments") {
      list = [...list].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
    } else if (sortBy === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [items, doneColIds, scope, statusFilters, sortBy]);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const getColumnItems = useCallback(
    (colId: string) => visibleItems.filter((c) => c.column === colId),
    [visibleItems],
  );

  const {
    boardRef,
    activeId,
    overColumnId,
    getColumnProps,
    getItemProps,
    ghostPortal,
  } = usePointerDragBoard<AfKanbanCard, string>({
    columnIds,
    getColumnItems,
    getKey: (c) => c.id,
    disabled: loading || viewMode !== "board",
    onMove: ({ itemId, item, toColumnId, toIndex }) => {
      if (sortBy !== "manual") setSortBy("manual");
      const updatedCard: AfKanbanCard = {
        ...item,
        column: toColumnId,
        status: doneColIds.has(toColumnId)
          ? "fixed"
          : item.status === "fixed"
            ? "review"
            : item.status,
      };
      const destVisible = visibleItems.filter(
        (c) => c.column === toColumnId && c.id !== itemId,
      );
      const clampedIdx = Math.max(0, Math.min(toIndex, destVisible.length));
      const afterVisible = destVisible[clampedIdx];
      setItems((prev) => {
        const without = prev.filter((c) => c.id !== itemId);
        if (afterVisible) {
          const insertAt = without.findIndex((c) => c.id === afterVisible.id);
          if (insertAt >= 0) {
            return [...without.slice(0, insertAt), updatedCard, ...without.slice(insertAt)];
          }
        }
        let lastColIdx = -1;
        for (let i = 0; i < without.length; i += 1) {
          if (without[i]?.column === toColumnId) lastColIdx = i;
        }
        if (lastColIdx >= 0) {
          return [...without.slice(0, lastColIdx + 1), updatedCard, ...without.slice(lastColIdx + 1)];
        }
        return [...without, updatedCard];
      });
    },
  });

  const openComposer = (colId = "medium") => {
    setNewCol(colId);
    setNewStatus(doneColIds.has(colId) ? "fixed" : "progress");
    setComposerOpen(true);
  };

  const submitNewTask = () => {
    const title = newTitle.trim() || "Untitled issue";
    const created: AfKanbanCard = {
      id: `k-${Date.now()}`,
      column: newCol,
      title,
      description: newDesc.trim() || "Added from board composer.",
      status: newStatus,
      comments: 0,
      attachments: 0,
      assignee: newAssignee,
      labels: newLabels,
      project: newProject,
    };
    setItems((prev) => [created, ...prev]);
    setNewTitle("");
    setNewDesc("");
    if (!createAnother) setComposerOpen(false);
  };

  const updateOpenCard = (patch: Partial<AfKanbanCard>, logText?: string) => {
    if (!openCard) return;
    setItems((prev) => prev.map((c) => (c.id === openCard.id ? { ...c, ...patch } : c)));
    if (logText) {
      setActivityMap((prev) => ({
        ...prev,
        [openCard.id]: [...(prev[openCard.id] ?? []), { text: `${user.name} ${logText}`, time: "Just now" }],
      }));
    }
  };

  const filterMenu: AfMenuItem[] = (Object.keys(STATUS_LABEL) as AfKanbanStatus[]).map((st) => ({
    type: "checkbox",
    id: st,
    label: STATUS_LABEL[st],
    checked: statusFilters.includes(st),
    keepOpen: true,
    onCheckedChange: (checked) =>
      setStatusFilters((prev) => (checked ? [...prev, st] : prev.filter((x) => x !== st))),
  }));

  const sortMenu: AfMenuItem[] = [
    { type: "radio", id: "manual", label: "Manual", checked: sortBy === "manual", onSelect: () => setSortBy("manual") },
    { type: "radio", id: "comments", label: "Most comments", checked: sortBy === "comments", onSelect: () => setSortBy("comments") },
    { type: "radio", id: "title", label: "Title A–Z", checked: sortBy === "title", onSelect: () => setSortBy("title") },
  ];

  const showEmpty = !loading && items.length === 0;

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={GROUPS}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <header className="af-wks-topbar">
        <div className="af-wks-topbar__left">
          <WksSidebarExpandButton />
          <span className="af-wks-crumbs">
            <span>Inbox</span>
            <i className="af-wks-crumbs__sep" aria-hidden="true">/</i>
            <b className="af-wks-crumbs__cur">Overview</b>
          </span>
          <button
            type="button"
            className="af-wks-icon-btn"
            aria-label="Add to favorites"
            aria-pressed={starred}
            data-active={starred || undefined}
            onClick={() => setStarred((s) => !s)}
          >
            <AfIcon name="star" size={13} />
          </button>
        </div>

        <div className="af-wks-topbar__right">
          <AfDropdownMenu items={filterMenu} side="bottom" align="end" width={176}>
            <button type="button" className="af-wks-btn">
              <AfIcon name="filter" size={12} />
              <span>Filter{statusFilters.length > 0 ? ` (${statusFilters.length})` : ""}</span>
            </button>
          </AfDropdownMenu>

          <AfDropdownMenu items={sortMenu} side="bottom" align="end" width={164}>
            <button type="button" className="af-wks-btn">
              <AfIcon name="sliders" size={12} />
              <span>Sort by</span>
            </button>
          </AfDropdownMenu>

          <div className="af-wks-pills" role="radiogroup" aria-label="View">
            {(["board", "list"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                className="af-wks-pill-tab"
                aria-checked={viewMode === m}
                onClick={() => setViewMode(m)}
              >
                {m === "board" ? "Board" : "List"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="af-wks-kbn__subbar">
        <div className="af-wks-pills" role="tablist" aria-label="Issues">
          {(
            [
              { id: "all", label: "All tasks", count: items.length },
              { id: "open", label: "Open", count: openCount },
              { id: "done", label: "Completed", count: doneCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className="af-wks-pill-tab"
              aria-selected={scope === tab.id}
              onClick={() => setScope(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="af-wks-pill-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => openComposer("medium")}>
          <AfIcon name="plus" size={12} />
          <span>New task</span>
        </button>
      </div>

      {showEmpty ? (
        <div className="af-wks-empty-wrap">
          <AfEmptyState
            icon="kanban"
            title="No tasks yet"
            text="Create your first issue to triage priorities, owners and review status across the team."
            action={
              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => openComposer("medium")}>
                New task
              </button>
            }
          />
        </div>
      ) : viewMode === "list" ? (
        <div className="af-wks-kbn__list">
          {visibleItems.map((card) => {
            const col = columns.find((c) => c.id === card.column);
            const st = card.status ?? "progress";
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                className="af-wks-kbn__list-row"
                onClick={() => setOpenCardId(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setOpenCardId(card.id);
                }}
              >
                <div className="af-wks-kbn__list-main">
                  <PriorityGlyph tone={col?.tone} size={12} />
                  <strong className="af-wks-kbn__card-title">{card.title}</strong>
                  <span style={{ color: "var(--af-page-muted)", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.description}
                  </span>
                </div>
                <span className="af-wks-kbn__state" data-status={st}>
                  <StatusGlyph status={st} />
                  <span>{STATUS_LABEL[st]}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="af-wks-kbn__board" ref={boardRef as RefObject<HTMLDivElement>}>
          {columns.map((col) => {
            const colCards = visibleItems.filter((c) => c.column === col.id);
            const isColDrop = activeId !== null && overColumnId === col.id;
            const colProps = getColumnProps(col.id);
            return (
              <section
                key={col.id}
                className="af-wks-kbn__col"
                aria-label={col.label}
                {...colProps}
                data-drop={isColDrop || undefined}
              >
                <header className="af-wks-kbn__col-head">
                  <span className="af-wks-kbn__col-title">
                    <PriorityGlyph tone={col.tone} size={12} />
                    <span>{col.label}</span>
                  </span>
                  <span className="af-wks-kbn__col-count">{colCards.length}</span>
                </header>

                <div className="af-wks-kbn__cards">
                  {loading
                    ? Array.from({ length: 3 }, (_, idx) => (
                        <AfSkeleton key={idx} variant="rect" width="100%" height={84} radius={9} />
                      ))
                    : colCards.map((card, index) => {
                        const st = card.status ?? "progress";
                        const dragProps = getItemProps(card, col.id, index);
                        return (
                          <article
                            key={card.id}
                            role="button"
                            tabIndex={0}
                            aria-label={card.title}
                            className="af-wks-kbn__card"
                            data-flip={dragProps["data-flip"]}
                            data-drag-item-id={dragProps["data-drag-item-id"]}
                            data-af-dragging={dragProps["data-af-dragging"]}
                            data-dragging={activeId === card.id || undefined}
                            style={dragProps.style}
                            onPointerDown={dragProps.onPointerDown}
                            onClick={() => setOpenCardId(card.id)}
                            onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
                              dragProps.onKeyDown(e);
                              if (e.defaultPrevented) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpenCardId(card.id);
                              }
                            }}
                          >
                            <b className="af-wks-kbn__card-title">
                              <PriorityGlyph tone={col.tone} size={11} />
                              <span>{card.title}</span>
                            </b>
                            {card.description ? <p className="af-wks-kbn__card-desc">{card.description}</p> : null}
                            <span className="af-wks-kbn__card-foot">
                              <span className="af-wks-kbn__state" data-status={st}>
                                <StatusGlyph status={st} />
                                <span>{STATUS_LABEL[st]}</span>
                              </span>
                              <span className="af-wks-kbn__counts">
                                {card.comments !== undefined ? (
                                  <span>
                                    <AfIcon name="message" size={10} />
                                    {card.comments}
                                  </span>
                                ) : null}
                                {card.attachments ? (
                                  <span>
                                    <AfIcon name="paperclip" size={10} />
                                    {card.attachments}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </article>
                        );
                      })}

                  {isColDrop ? <span className="af-wks-kbn__drop-line" aria-hidden="true" /> : null}

                  <button
                    type="button"
                    className="af-wks-kbn__col-add"
                    aria-label={`New task in ${col.label}`}
                    onClick={() => openComposer(col.id)}
                  >
                    <AfIcon name="plus" size={12} />
                    <span>New task</span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* New Task Composer Modal */}
      <AfModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Create task"
        closable
        contained
        size="lg"
        footer={
          <div className="af-wks-modal-foot">
            <AfSwitch size="sm" checked={createAnother} onChange={setCreateAnother}>
              Create another
            </AfSwitch>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="af-wks-btn" onClick={() => setComposerOpen(false)}>
                Cancel
              </button>
              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={submitNewTask}>
                <span>Create task</span>
                <kbd className="af-wks-kbd" style={{ color: "inherit", background: "transparent" }}>⌘↵</kbd>
              </button>
            </div>
          </div>
        }
      >
        <div
          className="af-wks-modal-split"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submitNewTask();
            }
          }}
        >
          <div className="af-wks-modal-main">
            <input
              type="text"
              className="af-wks-field-input"
              placeholder="Short summary"
              aria-label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="af-wks-field-area"
              placeholder="Steps, expected behaviour, anything useful..."
              aria-label="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button type="button" className="af-wks-btn" style={{ alignSelf: "flex-start" }}>
              <AfIcon name="paperclip" size={12} />
              <span>Attach files</span>
            </button>
          </div>

          <div className="af-wks-modal-rail">
            <div className="af-wks-prop-row">
              <span>Status</span>
              <AfDropdownMenu
                items={(Object.keys(STATUS_LABEL) as AfKanbanStatus[]).map((st) => ({
                  type: "radio",
                  id: st,
                  label: STATUS_LABEL[st],
                  checked: newStatus === st,
                  onSelect: () => setNewStatus(st),
                }))}
                side="bottom"
                align="end"
              >
                <button type="button" className="af-wks-btn">{STATUS_LABEL[newStatus]}</button>
              </AfDropdownMenu>
            </div>

            <div className="af-wks-prop-row">
              <span>Priority</span>
              <AfDropdownMenu
                items={columns.map((c) => ({
                  type: "radio",
                  id: c.id,
                  label: c.label,
                  checked: newCol === c.id,
                  onSelect: () => setNewCol(c.id),
                }))}
                side="bottom"
                align="end"
              >
                <button type="button" className="af-wks-btn">
                  {columns.find((c) => c.id === newCol)?.label ?? "Priority"}
                </button>
              </AfDropdownMenu>
            </div>

            <div className="af-wks-prop-row">
              <span>Assignee</span>
              <AfDropdownMenu
                items={ASSIGNEES.map((a) => ({
                  type: "radio",
                  id: a,
                  label: a,
                  checked: newAssignee === a,
                  onSelect: () => setNewAssignee(a),
                }))}
                side="bottom"
                align="end"
              >
                <button type="button" className="af-wks-btn">{newAssignee}</button>
              </AfDropdownMenu>
            </div>

            <div className="af-wks-prop-row">
              <span>Labels</span>
              <AfDropdownMenu
                items={LABEL_POOL.map((lb) => ({
                  type: "checkbox",
                  id: lb,
                  label: lb,
                  checked: newLabels.includes(lb),
                  keepOpen: true,
                  onCheckedChange: (ch) =>
                    setNewLabels((prev) => (ch ? [...prev, lb] : prev.filter((x) => x !== lb))),
                }))}
                side="bottom"
                align="end"
              >
                <button type="button" className="af-wks-btn">
                  {newLabels.length > 0 ? newLabels.join(", ") : "None"}
                </button>
              </AfDropdownMenu>
            </div>

            <div className="af-wks-prop-row">
              <span>Project</span>
              <AfDropdownMenu
                items={PROJECTS.map((p) => ({
                  type: "radio",
                  id: p,
                  label: p,
                  checked: newProject === p,
                  onSelect: () => setNewProject(p),
                }))}
                side="bottom"
                align="end"
              >
                <button type="button" className="af-wks-btn">{newProject}</button>
              </AfDropdownMenu>
            </div>
          </div>
        </div>
      </AfModal>

      {/* Open Issue Detail Modal */}
      <AfModal
        open={Boolean(openCard)}
        onClose={() => setOpenCardId(null)}
        title={openCard?.title ?? "Issue"}
        closable
        contained
        size="lg"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setOpenCardId(null)}>
              Done
            </button>
          </div>
        }
      >
        {openCard ? (
          <div className="af-wks-modal-split">
            <div className="af-wks-modal-main">
              <input
                type="text"
                className="af-wks-field-input"
                aria-label="Issue title"
                value={openCard.title}
                onChange={(e) => updateOpenCard({ title: e.target.value })}
              />
              <textarea
                className="af-wks-field-area"
                aria-label="Issue description"
                value={openCard.description ?? ""}
                onChange={(e) => updateOpenCard({ description: e.target.value })}
              />

              <div className="af-wks-activity">
                <strong style={{ fontSize: 11.5, color: "var(--af-page-strong)" }}>Activity</strong>
                <div className="af-wks-activity__item">
                  <span>{openCard.assignee ?? "Mara Klein"} opened this issue</span>
                  <span>2d ago</span>
                </div>
                {(activityMap[openCard.id] ?? []).map((entry, idx) => (
                  <div key={idx} className="af-wks-activity__item">
                    <span>{entry.text}</span>
                    <span>{entry.time}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    className="af-wks-field-input"
                    placeholder="Leave a comment… (⌘↵)"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === "Enter" && commentDraft.trim()) {
                        e.preventDefault();
                        updateOpenCard(
                          { comments: (openCard.comments ?? 0) + 1 },
                          `commented: “${commentDraft.trim()}”`,
                        );
                        setCommentDraft("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="af-wks-btn af-wks-btn--solid"
                    onClick={() => {
                      if (!commentDraft.trim()) return;
                      updateOpenCard(
                        { comments: (openCard.comments ?? 0) + 1 },
                        `commented: “${commentDraft.trim()}”`,
                      );
                      setCommentDraft("");
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            <div className="af-wks-modal-rail">
              <div className="af-wks-prop-row">
                <span>Status</span>
                <AfDropdownMenu
                  items={(Object.keys(STATUS_LABEL) as AfKanbanStatus[]).map((st) => ({
                    type: "radio",
                    id: st,
                    label: STATUS_LABEL[st],
                    checked: (openCard.status ?? "progress") === st,
                    onSelect: () => updateOpenCard({ status: st }, `set status to ${STATUS_LABEL[st]}`),
                  }))}
                  side="bottom"
                  align="end"
                >
                  <button type="button" className="af-wks-btn">
                    {STATUS_LABEL[openCard.status ?? "progress"]}
                  </button>
                </AfDropdownMenu>
              </div>

              <div className="af-wks-prop-row">
                <span>Priority</span>
                <AfDropdownMenu
                  items={columns.map((c) => ({
                    type: "radio",
                    id: c.id,
                    label: c.label,
                    checked: openCard.column === c.id,
                    onSelect: () => updateOpenCard({ column: c.id }, `moved to ${c.label}`),
                  }))}
                  side="bottom"
                  align="end"
                >
                  <button type="button" className="af-wks-btn">
                    {columns.find((c) => c.id === openCard.column)?.label ?? openCard.column}
                  </button>
                </AfDropdownMenu>
              </div>

              <div className="af-wks-prop-row">
                <span>Assignee</span>
                <AfDropdownMenu
                  items={ASSIGNEES.map((a) => ({
                    type: "radio",
                    id: a,
                    label: a,
                    checked: (openCard.assignee ?? "Mara Klein") === a,
                    onSelect: () => updateOpenCard({ assignee: a }, `assigned to ${a}`),
                  }))}
                  side="bottom"
                  align="end"
                >
                  <button type="button" className="af-wks-btn">{openCard.assignee ?? "Mara Klein"}</button>
                </AfDropdownMenu>
              </div>

              <div className="af-wks-prop-row">
                <span>Project</span>
                <AfDropdownMenu
                  items={PROJECTS.map((p) => ({
                    type: "radio",
                    id: p,
                    label: p,
                    checked: (openCard.project ?? "Core App") === p,
                    onSelect: () => updateOpenCard({ project: p }, `moved to project ${p}`),
                  }))}
                  side="bottom"
                  align="end"
                >
                  <button type="button" className="af-wks-btn">{openCard.project ?? "Core App"}</button>
                </AfDropdownMenu>
              </div>
            </div>
          </div>
        ) : null}
      </AfModal>
      {ghostPortal}
    </WorkspaceInsetShell>
  );
}

export const AfKanbanBoard = AfKanban;
