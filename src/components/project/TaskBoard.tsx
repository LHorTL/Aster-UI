import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { AfIcon } from "../../icons";
import { AfPortal, cn, usePointerDragBoard } from "../../primitives";
import { useFloatingAnchor } from "../agents-c/_marks";
import { ProjectPersonAvatar } from "./_avatars";

export type TaskPriority = 0 | 1 | 2 | 3 | 4;

export interface TaskStatusColumn {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface TaskLabelItem {
  id: string;
  label: string;
  color: string;
}

export interface TaskPersonItem {
  id: string;
  name: string;
  avatar?: string;
}

export interface BoardTaskItem {
  key: string;
  title: string;
  status: string;
  priority?: TaskPriority;
  estimate?: number | string;
  labels?: string[];
  assignee?: string;
  dueIn?: string;
  subtasks?: { done: number; total: number };
  pullRequest?: string;
  created?: string;
}

export interface AfTaskBoardProps {
  /** 看板任务卡片列表。 */
  tasks?: BoardTaskItem[];
  /** 状态列定义（顺序排列）。 */
  statuses?: TaskStatusColumn[];
  /** 标签字典。 */
  labels?: TaskLabelItem[];
  /** 成员列表。 */
  people?: TaskPersonItem[];
  /** 顶部面包屑路径。 */
  path?: string[];
  /** 任意移动、编辑、新增或删除后的全量任务回调。 */
  onChange?: (tasks: BoardTaskItem[]) => void;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfTaskBoardPatternProps = AfTaskBoardProps;

export const DEFAULT_BOARD_STATUSES: TaskStatusColumn[] = [
  { id: "todo", label: "Todo" },
  { id: "in-review", label: "In review" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export const DEFAULT_BOARD_LABELS: TaskLabelItem[] = [
  { id: "website", label: "Website", color: "#4fb0fe" },
  { id: "feature", label: "Feature", color: "#7cc4ff" },
  { id: "billing", label: "Billing", color: "#a651f0" },
  { id: "bug", label: "Bug", color: "#ee3e9e" },
  { id: "mobile", label: "Mobile", color: "#13b3a0" },
];

export const DEFAULT_BOARD_PEOPLE: TaskPersonItem[] = [
  { id: "mara", name: "Mara Lindqvist" },
  { id: "theo", name: "Theo Brandt" },
  { id: "sofia", name: "Sofia Marin" },
  { id: "lena", name: "Lena Hart" },
  { id: "jonas", name: "Jonas Weber" },
  { id: "maya", name: "Maya Lin" },
];

export const DEFAULT_BOARD_TASKS: BoardTaskItem[] = [
  {
    key: "NW-214",
    title: "Add the launch banner to the marketing site",
    status: "todo",
    priority: 2,
    estimate: "M",
    labels: ["website", "feature"],
    assignee: "mara",
    created: "Oct 2",
  },
  {
    key: "NW-209",
    title: "Currency rounding in annual invoices",
    status: "todo",
    priority: 4,
    labels: ["billing", "bug"],
    assignee: "theo",
    dueIn: "2d",
    created: "Sep 28",
  },
  {
    key: "NW-197",
    title: "Follow up with the beta customers about pricing",
    status: "todo",
    priority: 1,
    labels: [],
    assignee: "sofia",
    subtasks: { done: 2, total: 4 },
    created: "Sep 24",
  },
  {
    key: "NW-221",
    title: "Review the onboarding copy for the new plans",
    status: "in-review",
    priority: 2,
    labels: ["website"],
    assignee: "lena",
    dueIn: "1d",
    created: "Oct 2",
  },
  {
    key: "NW-205",
    title: "Add usage limits to the plan comparison table",
    status: "in-review",
    priority: 3,
    estimate: "L",
    labels: ["website", "feature"],
    assignee: "jonas",
    created: "Sep 27",
  },
  {
    key: "NW-188",
    title: "Push notification opt-in on iOS",
    status: "in-review",
    priority: 2,
    labels: ["mobile"],
    assignee: "mara",
    pullRequest: "412",
    created: "Sep 21",
  },
  {
    key: "NW-230",
    title: "Export guide for the help center",
    status: "in-progress",
    priority: 2,
    labels: ["website"],
    assignee: "sofia",
    created: "Sep 30",
  },
  {
    key: "NW-201",
    title: "Proration when teams add seats mid-month",
    status: "in-progress",
    priority: 4,
    labels: ["billing"],
    assignee: "theo",
    dueIn: "4d",
    created: "Sep 23",
  },
  {
    key: "NW-176",
    title: "Offline mode for the task list",
    status: "in-progress",
    priority: 1,
    estimate: "XL",
    labels: ["mobile", "feature"],
    assignee: "lena",
    pullRequest: "398",
    created: "Sep 16",
  },
  {
    key: "NW-160",
    title: "Dark mode for the dashboard",
    status: "done",
    priority: 2,
    labels: ["website", "feature"],
    assignee: "jonas",
    created: "Sep 12",
  },
  {
    key: "NW-171",
    title: "Fix crash when uploading large avatars",
    status: "done",
    priority: 4,
    labels: ["mobile", "bug"],
    assignee: "mara",
    created: "Sep 15",
  },
];

const PRIORITY_NAMES: Record<TaskPriority, string> = {
  0: "No priority",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

function PrioritySignal({ priority = 2 }: { priority?: TaskPriority }) {
  const activeColor =
    priority >= 4
      ? "#ef4444"
      : priority === 3
        ? "#f59e0b"
        : priority === 2
          ? "#16a34a"
          : "var(--af-muted)";
  const bars = priority >= 4 ? 3 : Math.max(1, priority);
  return (
    <svg className="af-pj-tb__prio-bars" width="13" height="12" viewBox="0 0 14 12" aria-hidden="true">
      <rect x="1.2" y="7.5" width="2.3" height="3.5" rx="0.8" fill={bars >= 1 ? activeColor : "var(--af-track)"} />
      <rect x="5.4" y="4.8" width="2.3" height="6.2" rx="0.8" fill={bars >= 2 ? activeColor : "var(--af-track)"} />
      <rect x="9.6" y="1.8" width="2.3" height="9.2" rx="0.8" fill={bars >= 3 ? activeColor : "var(--af-track)"} />
    </svg>
  );
}

function StatusRingIcon({ colId }: { colId: string }) {
  if (colId === "done") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" fill="currentColor" fillOpacity="0.85" />
        <path d="m5.3 8.1 1.8 1.8 3.6-3.7" stroke="var(--af-surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (colId === "in-progress") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.45" strokeDasharray="2.4 2" />
      </svg>
    );
  }
  if (colId === "in-review") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4" />
        <path d="M8 4.8V8l2.1 1.4" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.3" y="2.3" width="11.4" height="11.4" rx="2.8" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * 敏捷任务看板（Pro Workspace Block）：四列状态泳道、原生拖拽、列内速建、标签筛选与详情滑出面板。
 */
export function AfTaskBoard({
  tasks: tasksProp,
  statuses = DEFAULT_BOARD_STATUSES,
  labels = DEFAULT_BOARD_LABELS,
  people = DEFAULT_BOARD_PEOPLE,
  path = ["Northwind", "Launch", "Sprint 12"],
  onChange,
  className,
}: AfTaskBoardProps = {}) {
  const [innerTasks, setInnerTasks] = useState<BoardTaskItem[]>(
    () => tasksProp ?? DEFAULT_BOARD_TASKS,
  );
  const isControlled = tasksProp !== undefined && onChange !== undefined;
  const tasks = isControlled ? tasksProp : innerTasks;

  const [starred, setStarred] = useState(false);
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const addBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const filterStyle = useFloatingAnchor(
    filterOpen,
    filterBtnRef,
    filterMenuRef,
    () => setFilterOpen(false),
    { width: 184, align: "end" },
  );

  const commitTasks = (next: BoardTaskItem[]) => {
    if (!isControlled) {
      setInnerTasks(next);
    }
    onChange?.(next);
  };

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (
        activeLabels.length > 0 &&
        !activeLabels.some((lid) => t.labels?.includes(lid))
      ) {
        return false;
      }
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !t.key.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, activeLabels, query]);

  const columnIds = useMemo(() => statuses.map((s) => s.id), [statuses]);

  const getColumnItems = useCallback(
    (colId: string) => visibleTasks.filter((t) => t.status === colId),
    [visibleTasks],
  );

  const {
    boardRef,
    activeId,
    overColumnId,
    getColumnProps,
    getItemProps,
    ghostPortal,
  } = usePointerDragBoard<BoardTaskItem, string>({
    columnIds,
    getColumnItems,
    getKey: (t) => t.key,
    onMove: ({ itemId, item, toColumnId, toIndex }) => {
      const movedUpdated: BoardTaskItem = { ...item, status: toColumnId };
      const destVisible = visibleTasks.filter(
        (t) => t.status === toColumnId && t.key !== itemId,
      );
      const clampedIdx = Math.max(0, Math.min(toIndex, destVisible.length));
      const afterVisible = destVisible[clampedIdx];
      const without = tasks.filter((t) => t.key !== itemId);
      if (afterVisible) {
        const insertAt = without.findIndex((t) => t.key === afterVisible.key);
        if (insertAt >= 0) {
          commitTasks([
            ...without.slice(0, insertAt),
            movedUpdated,
            ...without.slice(insertAt),
          ]);
          return;
        }
      }
      let lastColIdx = -1;
      for (let i = 0; i < without.length; i += 1) {
        if (without[i]?.status === toColumnId) lastColIdx = i;
      }
      if (lastColIdx >= 0) {
        commitTasks([
          ...without.slice(0, lastColIdx + 1),
          movedUpdated,
          ...without.slice(lastColIdx + 1),
        ]);
      } else {
        commitTasks([...without, movedUpdated]);
      }
    },
  });

  const selectedTask = useMemo(
    () => tasks.find((t) => t.key === selectedKey) ?? null,
    [tasks, selectedKey],
  );

  const updateSelected = (patch: Partial<BoardTaskItem>) => {
    if (!selectedTask) return;
    commitTasks(
      tasks.map((t) => (t.key === selectedTask.key ? { ...t, ...patch } : t)),
    );
  };

  const handleAddTask = (statusId: string) => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      setAddingColumn(null);
      return;
    }
    const nextNum = 231 + tasks.length;
    const key = `NW-${nextNum}`;
    const created: BoardTaskItem = {
      key,
      title: clean,
      status: statusId,
      priority: 2,
      created: "Today",
    };
    commitTasks([created, ...tasks]);
    setNewTaskTitle("");
    setAddingColumn(null);
    window.setTimeout(() => {
      cardRefs.current[key]?.focus();
    }, 0);
  };

  const handleDeleteSelected = () => {
    if (!selectedTask) return;
    const idx = visibleTasks.findIndex((t) => t.key === selectedTask.key);
    const neighbour = visibleTasks[idx + 1] ?? visibleTasks[idx - 1] ?? null;
    commitTasks(tasks.filter((t) => t.key !== selectedTask.key));
    setSelectedKey(null);
    if (neighbour) {
      window.setTimeout(() => {
        cardRefs.current[neighbour.key]?.focus();
      }, 0);
    }
  };

  const closePanel = () => {
    const prevKey = selectedKey;
    setSelectedKey(null);
    if (prevKey) {
      window.setTimeout(() => {
        cardRefs.current[prevKey]?.focus();
      }, 0);
    }
  };

  const handleRadioCycle = <T,>(
    e: KeyboardEvent<HTMLButtonElement>,
    options: T[],
    currentIdx: number,
    onPick: (val: T) => void,
  ) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onPick(options[(currentIdx + 1) % options.length]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPick(options[(currentIdx - 1 + options.length) % options.length]);
    }
  };

  return (
    <section className={cn("af-pj-tb", className)} aria-label="Task board">
      <header className="af-pj-tb__bar">
        <nav className="af-pj-tb__crumbs" aria-label="Breadcrumb">
          {path.map((seg, idx) => {
            const isLast = idx === path.length - 1;
            return (
              <span key={seg} className="af-pj-tb__crumb">
                {idx > 0 && <span className="af-pj-tb__slash">/</span>}
                <span aria-current={isLast ? "page" : undefined}>{seg}</span>
              </span>
            );
          })}
          <button
            type="button"
            className="af-pj-tb__icon-toggle"
            aria-pressed={starred}
            aria-label="Star sprint board"
            onClick={() => setStarred((s) => !s)}
          >
            <AfIcon name="star" size={13} />
          </button>
        </nav>

        <div className="af-pj-tb__tools">
          <span className="af-pj-tb__total-count">{visibleTasks.length} tasks</span>

          <label className="af-pj-tb__search">
            <AfIcon name="search" size={13} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search tasks"
            />
          </label>

          <button
            ref={filterBtnRef}
            type="button"
            className="af-pj-tb__tool-btn"
            aria-pressed={activeLabels.length > 0}
            aria-haspopup="menu"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setFilterOpen(true);
              }
            }}
          >
            <AfIcon name="filter" size={13} />
            <span>
              Filter{activeLabels.length > 0 ? ` · ${activeLabels.length}` : ""}
            </span>
          </button>

          {filterOpen && (
            <AfPortal>
              <div
                ref={filterMenuRef}
                className="af-pj-tb__menu"
                role="menu"
                aria-label="Filter by label"
                style={filterStyle}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setFilterOpen(false);
                    filterBtnRef.current?.focus();
                  }
                }}
              >
                {labels.map((lbl) => {
                  const checked = activeLabels.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      className="af-pj-tb__menu-item"
                      onClick={() =>
                        setActiveLabels((prev) =>
                          checked
                            ? prev.filter((x) => x !== lbl.id)
                            : [...prev, lbl.id],
                        )
                      }
                    >
                      <span
                        className="af-pj-tb__lbl-dot"
                        style={{ background: lbl.color }}
                      />
                      <span>{lbl.label}</span>
                      {checked && <AfIcon name="check" size={12} />}
                    </button>
                  );
                })}
              </div>
            </AfPortal>
          )}

          <button
            type="button"
            className="af-pj-tb__tool-btn"
            aria-pressed={compact}
            onClick={() => setCompact((c) => !c)}
          >
            <AfIcon name="list" size={13} />
            <span>Compact</span>
          </button>
        </div>
      </header>

      <div className="af-pj-tb__body">
        <div className="af-pj-tb__cols" ref={boardRef as RefObject<HTMLDivElement>}>
          {statuses.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
            const countText = colTasks.length > 999 ? "999+" : String(colTasks.length);
            const isDrop = activeId !== null && overColumnId === col.id;
            const colProps = getColumnProps(col.id);

            return (
              <div
                key={col.id}
                className="af-pj-tb__col"
                {...colProps}
                data-drop={isDrop ? "" : undefined}
              >
                <header className="af-pj-tb__col-head">
                  {col.icon ?? <StatusRingIcon colId={col.id} />}
                  <strong className="af-pj-tb__col-name" title={col.label}>
                    {col.label}
                  </strong>
                  <span className="af-pj-tb__col-count">{countText}</span>
                  <button
                    ref={(el) => {
                      addBtnRefs.current[col.id] = el;
                    }}
                    type="button"
                    className="af-pj-tb__add-btn"
                    aria-label={`Add task to ${col.label}`}
                    onClick={() => {
                      setAddingColumn(col.id);
                      setNewTaskTitle("");
                    }}
                  >
                    <AfIcon name="plus" size={12} />
                  </button>
                </header>

                {isDrop && <div className="af-pj-tb__drop-line" aria-hidden="true" />}

                {addingColumn === col.id && (
                  <div className="af-pj-tb__new-card">
                    <input
                      type="text"
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title…"
                      aria-label={`New task title in ${col.label}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTask(col.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setAddingColumn(null);
                          addBtnRefs.current[col.id]?.focus();
                        }
                      }}
                    />
                  </div>
                )}

                <div className="af-pj-tb__cards">
                  {colTasks.map((task, index) => {
                    const person = people.find((p) => p.id === task.assignee);
                    const isPicked = selectedKey === task.key;
                    const taskLabels = (task.labels ?? [])
                      .map((lid) => labels.find((l) => l.id === lid))
                      .filter((x): x is TaskLabelItem => Boolean(x));
                    const dragProps = getItemProps(task, col.id, index);

                    return (
                      <div
                        key={task.key}
                        ref={(el) => {
                          cardRefs.current[task.key] = el;
                        }}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isPicked}
                        className="af-pj-tb__card"
                        data-flip={dragProps["data-flip"]}
                        data-drag-item-id={dragProps["data-drag-item-id"]}
                        data-af-dragging={dragProps["data-af-dragging"]}
                        data-active={isPicked ? "" : undefined}
                        data-compact={compact ? "" : undefined}
                        style={dragProps.style}
                        onPointerDown={dragProps.onPointerDown}
                        onClick={() =>
                          setSelectedKey(isPicked ? null : task.key)
                        }
                        onKeyDown={(e) => {
                          dragProps.onKeyDown(e);
                          if (e.defaultPrevented) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedKey(isPicked ? null : task.key);
                          }
                        }}
                      >
                        <div className="af-pj-tb__card-head">
                          <PrioritySignal priority={task.priority} />
                          <p className="af-pj-tb__card-title" title={task.title}>
                            {task.title}
                          </p>
                        </div>

                        {!compact && (
                          <>
                            <div className="af-pj-tb__card-sub">
                              <span className="af-pj-tb__key">{task.key}</span>
                              {task.estimate !== undefined && (
                                <span>· Estimate {task.estimate}</span>
                              )}
                              {task.created && (
                                <span>· Created {task.created}</span>
                              )}
                            </div>

                            <div className="af-pj-tb__card-tags">
                              {taskLabels.length > 0 ? (
                                taskLabels.map((lbl) => (
                                  <span key={lbl.id} className="af-pj-tb__chip">
                                    <i style={{ background: lbl.color }} />
                                    <span>{lbl.label}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="af-pj-tb__no-labels">No labels</span>
                              )}
                            </div>
                          </>
                        )}

                        <div className="af-pj-tb__card-foot">
                          <span className="af-pj-tb__card-status">
                            <StatusRingIcon colId={col.id} />
                            <span>{col.label}</span>
                          </span>

                          <div className="af-pj-tb__card-meta-right">
                            {task.dueIn && (
                              <span
                                className="af-pj-tb__due"
                                data-soon={
                                  task.dueIn === "1d" || task.dueIn === "2d"
                                    ? ""
                                    : undefined
                                }
                              >
                                <AfIcon name="clock" size={10} />
                                {task.dueIn}
                              </span>
                            )}
                            {task.subtasks && (
                              <span className="af-pj-tb__meta">
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                  <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4" />
                                  <path d="M8 2.2A5.8 5.8 0 0 1 13.8 8H8V2.2Z" fill="currentColor" fillOpacity="0.65" />
                                </svg>
                                {task.subtasks.done}/{task.subtasks.total}
                              </span>
                            )}
                            {task.pullRequest && (
                              <span className="af-pj-tb__meta">
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="4.5" cy="4.2" r="1.7" />
                                  <circle cx="4.5" cy="11.8" r="1.7" />
                                  <circle cx="11.5" cy="11.8" r="1.7" />
                                  <path d="M4.5 5.9v4.2M11.5 10.1V6.5a2 2 0 0 0-2-2H7.5" />
                                </svg>
                                #{task.pullRequest.replace(/^#/, "")}
                              </span>
                            )}
                            {person && (
                              <span className="af-pj-tb__avatar" title={person.name}>
                                <ProjectPersonAvatar
                                  name={person.name}
                                  avatar={person.avatar}
                                  size={20}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="af-pj-tb__col-plus"
                    aria-label={`Add task in ${col.label}`}
                    onClick={() => {
                      setAddingColumn(col.id);
                      setNewTaskTitle("");
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTask && (
          <aside
            className="af-pj-tb__drawer"
            role="dialog"
            aria-label={`${selectedTask.key} details`}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closePanel();
              }
            }}
          >
            <div className="af-pj-tb__drawer-head">
              <span className="af-pj-tb__key">{selectedTask.key}</span>
              <div className="af-pj-tb__drawer-acts">
                <button
                  type="button"
                  className="af-pj-iconbtn"
                  aria-label="Delete task"
                  onClick={handleDeleteSelected}
                >
                  <AfIcon name="trash" size={14} />
                </button>
                <button
                  type="button"
                  className="af-pj-iconbtn"
                  aria-label="Close detail panel"
                  onClick={closePanel}
                >
                  <AfIcon name="close" size={14} />
                </button>
              </div>
            </div>

            <input
              type="text"
              className="af-pj-tb__drawer-title"
              value={selectedTask.title}
              aria-label="Task title"
              onChange={(e) => updateSelected({ title: e.target.value })}
            />

            <div className="af-pj-tb__field">
              <span className="af-pj-tb__field-label">Status</span>
              <div className="af-pj-tb__radios" role="radiogroup" aria-label="Status">
                {statuses.map((st, idx) => {
                  const checked = selectedTask.status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className="af-pj-tb__radio"
                      data-active={checked ? "" : undefined}
                      onClick={() => updateSelected({ status: st.id })}
                      onKeyDown={(e) =>
                        handleRadioCycle(e, statuses, idx, (picked) =>
                          updateSelected({ status: picked.id }),
                        )
                      }
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="af-pj-tb__field">
              <span className="af-pj-tb__field-label">Priority</span>
              <div className="af-pj-tb__radios" role="radiogroup" aria-label="Priority">
                {([0, 1, 2, 3, 4] as TaskPriority[]).map((p, idx, arr) => {
                  const checked = (selectedTask.priority ?? 0) === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className="af-pj-tb__radio"
                      data-active={checked ? "" : undefined}
                      onClick={() => updateSelected({ priority: p })}
                      onKeyDown={(e) =>
                        handleRadioCycle(e, arr, idx, (picked) =>
                          updateSelected({ priority: picked }),
                        )
                      }
                    >
                      {PRIORITY_NAMES[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="af-pj-tb__field">
              <span className="af-pj-tb__field-label">Assignee</span>
              <div className="af-pj-tb__radios" role="radiogroup" aria-label="Assignee">
                {people.map((person, idx) => {
                  const checked = selectedTask.assignee === person.id;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className="af-pj-tb__radio"
                      data-active={checked ? "" : undefined}
                      onClick={() => updateSelected({ assignee: person.id })}
                      onKeyDown={(e) =>
                        handleRadioCycle(e, people, idx, (picked) =>
                          updateSelected({ assignee: picked.id }),
                        )
                      }
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="af-pj-tb__field">
              <span className="af-pj-tb__field-label">Labels</span>
              <div className="af-pj-tb__radios">
                {labels.map((lbl) => {
                  const active = Boolean(selectedTask.labels?.includes(lbl.id));
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      aria-pressed={active}
                      className="af-pj-tb__radio"
                      data-active={active ? "" : undefined}
                      onClick={() => {
                        const prev = selectedTask.labels ?? [];
                        const next = active
                          ? prev.filter((x) => x !== lbl.id)
                          : [...prev, lbl.id];
                        updateSelected({ labels: next });
                      }}
                    >
                      <span
                        className="af-pj-tb__lbl-dot"
                        style={{ background: lbl.color }}
                      />
                      <span>{lbl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
      {ghostPortal}
    </section>
  );
}

/** `AfTaskBoard` 兼容模式别名。 */
export const AfTaskBoardPattern = AfTaskBoard;
export const TaskBoard = AfTaskBoard;
