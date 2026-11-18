import {
  memo,
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
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfBadge } from "../display/Badge";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  DEFAULT_AGENT_OPS_USER,
  formatCompactCount,
  isTypingTarget,
  usePrefersReducedMotion,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type AgentMemorySource = {
  kind: "thread" | "decision" | "told" | "file";
  at: string;
  quote?: string;
  question?: string;
  file?: string;
  who?: string;
};

export type AgentMemoryItem = {
  id: string;
  text: string;
  project?: string;
  source: AgentMemorySource;
  uses?: number;
  usedAt?: string;
  usedAtLong?: string;
  usedIn?: { task: string; how: string; at: string }[];
  review?: boolean;
};

export type AgentMemoryLabels = {
  memory?: string;
  saved?: string;
  review?: string;
  reviewShort?: string;
  aboutYou?: string;
  everywhere?: string;
  remember?: string;
  keep?: string;
  dontKeep?: string;
  forget?: string;
  undo?: string;
  appliesTo?: string;
  cameFrom?: string;
  usedWhere?: string;
  searchPlaceholder?: string;
};

export type AfAgentMemoryProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "onChange"> & {
  memories?: AgentMemoryItem[];
  projects?: string[];
  defaultTab?: "saved" | "review";
  defaultSelected?: string | null;
  inboxCount?: number;
  onSelect?: (id: string) => void;
  onCreate?: (memory: AgentMemoryItem) => void;
  onChange?: (memory: AgentMemoryItem) => void;
  onForget?: (id: string) => void;
  onRestore?: (memory: AgentMemoryItem, index: number) => void;
  onKeep?: (id: string) => void;
  onOpenSource?: (memory: AgentMemoryItem) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  labels?: AgentMemoryLabels;
  user?: AgentOpsUser;
  loading?: boolean;
  empty?: boolean;
  className?: string;
  style?: CSSProperties;
};

export const DEFAULT_AGENT_MEMORIES: AgentMemoryItem[] = [
  {
    id: "lead",
    text: "Lead with the decision, then the reasons – three lines or fewer",
    source: {
      kind: "thread",
      at: "20 days ago",
      quote: "Put the answer in sentence one, then at most two lines of why.",
    },
    uses: 34,
    usedAt: "26m",
    usedAtLong: "26 minutes ago",
    usedIn: [{ task: "Weekly update", how: "Led with staging status in line one", at: "26 minutes ago" }],
  },
  {
    id: "vienna",
    text: "Works from Vienna – times in CET, nothing booked before 9:00",
    source: {
      kind: "told",
      at: "24 days ago",
      quote: "Keep mornings clear until 9:00 CET.",
    },
    uses: 12,
    usedAt: "5h",
    usedAtLong: "5 hours ago",
    usedIn: [{ task: "Onboarding emails", how: "Offered Thursday 10:30 CET to Tom Becker", at: "5 hours ago" }],
  },
  {
    id: "friday",
    text: "Nothing goes out to clients on a Friday afternoon",
    source: {
      kind: "decision",
      at: "16 days ago",
      question: "Send the weekly update to Northwind now?",
      quote: "Not on a Friday afternoon – Monday at 9:00.",
      who: "You, in the Inbox",
    },
    uses: 6,
    usedAt: "2d",
    usedAtLong: "2 days ago",
    usedIn: [
      { task: "Weekly update", how: "Held it until Monday 9:00", at: "2 days ago" },
      { task: "Client dashboard", how: "Moved the launch email to Monday", at: "9 days ago" },
    ],
  },
  {
    id: "currency",
    text: "Prices in euros with the sign after the number: 1 240 €",
    source: {
      kind: "file",
      at: "27 days ago",
      file: "writing-style.md",
    },
    uses: 9,
    usedAt: "1d",
    usedAtLong: "yesterday",
    usedIn: [{ task: "Billing webhooks", how: "Formatted Hannah Kim's 38 € refund notice", at: "yesterday" }],
  },
  {
    id: "english",
    text: "Writes in British English – colour, organise, analyse",
    source: {
      kind: "told",
      at: "1 month ago",
      quote: "Default to British spelling across threads and docs.",
    },
    uses: 21,
    usedAt: "1h",
    usedAtLong: "1 hour ago",
  },
  {
    id: "nw-legal",
    project: "Northwind",
    text: "Priya Shah signs off on anything that reaches Northwind's customers",
    source: {
      kind: "thread",
      at: "12 days ago",
      quote: "Loop Priya in before any customer-facing copy goes live.",
    },
    uses: 8,
    usedAt: "42m",
    usedAtLong: "42 minutes ago",
    usedIn: [{ task: "Weekly update", how: "Addressed status brief directly to Priya Shah", at: "42 minutes ago" }],
  },
  {
    id: "nw-events",
    project: "Northwind",
    text: "Order events are JSON with a version field",
    source: {
      kind: "decision",
      at: "9 days ago",
      question: "Include schema version on order events?",
      quote: "Yes – every payload carries a version field.",
    },
    uses: 5,
    usedAt: "4h",
    usedAtLong: "4 hours ago",
  },
  {
    id: "nw-dash",
    project: "Northwind",
    text: "Their team opens the dashboard at 8:30 – the numbers are ready by 8:00",
    source: {
      kind: "thread",
      at: "15 days ago",
      quote: "Refresh Northwind metrics by 8:00 before their 8:30 standup.",
    },
    uses: 3,
    usedAt: "3d",
    usedAtLong: "3 days ago",
  },
  {
    id: "pf-staging",
    project: "Platform",
    text: "Staging gets a deploy only once every test passes – no skipping, not even for a hotfix",
    source: {
      kind: "told",
      at: "11 days ago",
      quote: "Never bypass failing checks on staging, even for a hotfix.",
    },
    uses: 14,
    usedAt: "6m",
    usedAtLong: "6 minutes ago",
  },
  {
    id: "pf-v1",
    project: "Platform",
    text: "Two clients still call API v1 – write to them before anything changes",
    source: {
      kind: "file",
      at: "5 days ago",
      file: "v1-traffic.csv",
    },
    uses: 2,
    usedAt: "3h",
    usedAtLong: "3 hours ago",
  },
  {
    id: "ek-score",
    project: "Evalkit",
    text: "Scores show one decimal – 87.4, never 87.38",
    source: {
      kind: "decision",
      at: "4 days ago",
      question: "Round benchmark scores to one decimal?",
      quote: "One decimal everywhere – 87.4, never 87.38.",
    },
    uses: 4,
    usedAt: "2d",
    usedAtLong: "2 days ago",
  },
  // To review (2)
  {
    id: "rv-tom",
    project: "Northwind",
    text: "Tom Becker prefers short bullet summaries in email rather than PDF attachments",
    source: {
      kind: "thread",
      at: "Today 11:58",
      quote: "Bullets right in the email body are easiest for me to scan.",
    },
    review: true,
  },
  {
    id: "rv-lumen",
    text: "Lumen Studio invoices go to billing@lumen.studio with PO #4419",
    source: {
      kind: "file",
      at: "Yesterday",
      file: "Lumen_PO_4419.pdf",
    },
    review: true,
  },
];

function sourceLabel(kind: AgentMemorySource["kind"]): string {
  switch (kind) {
    case "told":
      return "You told it";
    case "decision":
      return "From a decision";
    case "file":
      return "From a file";
    default:
      return "From a thread";
  }
}

function sourceShortLabel(src: AgentMemorySource): string {
  if (src.kind === "file") return src.file ?? "File";
  if (src.kind === "told") return "You";
  if (src.kind === "decision") return "Decision";
  return "Thread";
}

function sourceIcon(kind: AgentMemorySource["kind"]): AffectIconKey {
  switch (kind) {
    case "told":
      return "user";
    case "decision":
      return "checkCircle";
    case "file":
      return "file";
    default:
      return "message";
  }
}

type MemoryRowProps = {
  item: AgentMemoryItem;
  selected: boolean;
  recalled: boolean;
  justAdded: boolean;
  isReviewTab: boolean;
  keepLabel: string;
  dontKeepLabel: string;
  onOpen: (id: string) => void;
  onKeepItem: (id: string) => void;
  onForgetItem: (id: string) => void;
  registerRef: (key: string, el: HTMLElement | null) => void;
};

const MemoryTreeRow = memo(function MemoryTreeRow({
  item,
  selected,
  recalled,
  justAdded,
  isReviewTab,
  keepLabel,
  dontKeepLabel,
  onOpen,
  onKeepItem,
  onForgetItem,
  registerRef,
}: MemoryRowProps) {
  const srcText = sourceLabel(item.source.kind);
  const usesCount = item.uses ?? 0;
  const fullName = `${item.text}. ${srcText}${
    usesCount > 0 ? `, used ${usesCount} times` : ""
  }${item.usedAt ? `, last used ${item.usedAt}` : ""}`;

  return (
    <div
      ref={(el) => registerRef(`row:${item.id}`, el)}
      role="treeitem"
      aria-level={2}
      aria-selected={selected}
      aria-label={fullName}
      tabIndex={selected ? 0 : -1}
      className="af-aops-mem-row"
      data-selected={selected ? "true" : undefined}
      data-recalled={recalled ? "true" : undefined}
      data-added={justAdded ? "true" : undefined}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onForgetItem(item.id);
        }
      }}
    >
      <span className="af-aops-mem-row__sheen" aria-hidden="true" />
      <span className="af-aops-mem-row__glyph" aria-hidden="true">
        <AfIcon name={sourceIcon(item.source.kind)} size={14} />
      </span>
      <span className="af-aops-mem-row__text-cell">
        <AfTooltip label={item.text} delay={420}>
          <span className="af-aops-mem-row__text" dir="auto">
            {item.text}
          </span>
        </AfTooltip>
      </span>

      {isReviewTab ? (
        <span className="af-aops-mem-row__actions">
          <button
            type="button"
            tabIndex={-1}
            className="af-aops-mini-btn af-aops-mini-btn--solid"
            onClick={(e) => {
              e.stopPropagation();
              onKeepItem(item.id);
            }}
          >
            {keepLabel}
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="af-aops-mini-btn"
            onClick={(e) => {
              e.stopPropagation();
              onForgetItem(item.id);
            }}
          >
            {dontKeepLabel}
          </button>
        </span>
      ) : (
        <span className="af-aops-mem-row__cols" aria-hidden="true">
          <span className="af-aops-mem-col-src">{sourceShortLabel(item.source)}</span>
          <span className="af-aops-mem-col-uses af-aops-tabular">
            {usesCount > 0 ? `${formatCompactCount(usesCount)}×` : "—"}
          </span>
          <span className="af-aops-mem-col-time af-aops-tabular">{item.usedAt ?? item.source.at}</span>
        </span>
      )}
    </div>
  );
});

/**
 * Agent / Memory (`/screens/agent-memory`):
 * Persistent memories grouped by scope (`About you` + projects) as an accessible tree,
 * with live recall sheen, inline `Remember` composer, review queue, and 5-second Undo.
 */
export function AfAgentMemory(props: AfAgentMemoryProps = {}) {
  const {
    memories: memoriesProp,
    projects: projectsProp,
    defaultTab = "saved",
    defaultSelected = "friday",
    inboxCount = 5,
    onSelect,
    onCreate,
    onChange,
    onForget,
    onRestore,
    onKeep,
    onOpenSource,
    onNavigate,
    workspace = "Fieldwork",
    labels,
    user = DEFAULT_AGENT_OPS_USER,
    loading = false,
    empty = false,
    className,
    style,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const [items, setItems] = useState<AgentMemoryItem[]>(() => memoriesProp ?? DEFAULT_AGENT_MEMORIES);
  const prevUsedAtMap = useRef<Map<string, string | undefined>>(new Map());

  const [tab, setTab] = useState<"saved" | "review">(defaultTab);
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultSelected !== null);
  const [query, setQuery] = useState("");
  const [rememberOpen, setRememberOpen] = useState(false);
  const [rememberText, setRememberText] = useState("");
  const [rememberProject, setRememberProject] = useState<string | undefined>(undefined);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [recalledId, setRecalledId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [undoEntry, setUndoEntry] = useState<{ item: AgentMemoryItem; index: number; kind: "forget" | "keep" } | null>(
    null,
  );
  const undoTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rememberInputRef = useRef<HTMLInputElement>(null);
  const treeNodeRefs = useRef<Record<string, HTMLElement | null>>({});

  // Sync incoming controlled memories & detect usedAt advances to light up row
  useEffect(() => {
    if (!memoriesProp) return;
    setItems(memoriesProp);
    for (const m of memoriesProp) {
      const prev = prevUsedAtMap.current.get(m.id);
      if (prev !== undefined && m.usedAt !== prev && !reducedMotion) {
        setRecalledId(m.id);
        window.setTimeout(() => setRecalledId((cur) => (cur === m.id ? null : cur)), 1300);
      }
      prevUsedAtMap.current.set(m.id, m.usedAt);
    }
  }, [memoriesProp, reducedMotion]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const copy = {
    memory: labels?.memory ?? "Memory",
    saved: labels?.saved ?? "Saved",
    review: labels?.review ?? "To review",
    reviewShort: labels?.reviewShort ?? "Review",
    aboutYou: labels?.aboutYou ?? "About you",
    everywhere: labels?.everywhere ?? "Everywhere",
    remember: labels?.remember ?? "Remember",
    keep: labels?.keep ?? "Keep",
    dontKeep: labels?.dontKeep ?? "Don't keep",
    forget: labels?.forget ?? "Forget",
    undo: labels?.undo ?? "Undo",
    appliesTo: labels?.appliesTo ?? "Applies to",
    cameFrom: labels?.cameFrom ?? "Where it came from",
    usedWhere: labels?.usedWhere ?? "Where it was used",
    searchPlaceholder: labels?.searchPlaceholder ?? "Search memory",
  };

  const projects = useMemo(() => {
    if (projectsProp && projectsProp.length > 0) return projectsProp;
    const seen = new Set<string>();
    for (const it of items) {
      if (it.project) seen.add(it.project);
    }
    return Array.from(seen);
  }, [items, projectsProp]);

  const savedCount = useMemo(() => (empty ? 0 : items.filter((m) => !m.review).length), [empty, items]);
  const reviewCount = useMemo(() => (empty ? 0 : items.filter((m) => Boolean(m.review)).length), [empty, items]);

  const visibleItems = useMemo(() => {
    if (empty) return [];
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (tab === "saved" && m.review) return false;
      if (tab === "review" && !m.review) return false;
      if (!q) return true;
      return (
        m.text.toLowerCase().includes(q) ||
        (m.project ?? copy.aboutYou).toLowerCase().includes(q) ||
        (m.source.quote ?? "").toLowerCase().includes(q)
      );
    });
  }, [copy.aboutYou, empty, items, query, tab]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; project?: string; rows: AgentMemoryItem[] }[] = [];
    const aboutRows = visibleItems.filter((m) => !m.project);
    if (aboutRows.length > 0) {
      out.push({ key: "__about__", label: copy.aboutYou, rows: aboutRows });
    }
    for (const proj of projects) {
      const rows = visibleItems.filter((m) => m.project === proj);
      if (rows.length > 0) {
        out.push({ key: proj, label: proj, project: proj, rows });
      }
    }
    // Any remaining unlisted project
    for (const m of visibleItems) {
      if (m.project && !projects.includes(m.project) && !out.some((g) => g.key === m.project)) {
        out.push({
          key: m.project,
          label: m.project,
          project: m.project,
          rows: visibleItems.filter((x) => x.project === m.project),
        });
      }
    }
    return out;
  }, [copy.aboutYou, projects, visibleItems]);

  const selectedMemory = useMemo(
    () => (empty ? null : items.find((m) => m.id === selectedId) ?? null),
    [empty, items, selectedId],
  );

  useEffect(() => {
    setEditDraft(selectedMemory?.text ?? "");
    setEditingTitle(false);
  }, [selectedMemory?.id, selectedMemory?.text]);

  const registerTreeRef = useCallback((key: string, el: HTMLElement | null) => {
    treeNodeRefs.current[key] = el;
  }, []);

  const openMemory = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      onSelect?.(id);
    },
    [onSelect],
  );

  const scheduleUndoBar = useCallback(
    (entry: { item: AgentMemoryItem; index: number; kind: "forget" | "keep" }) => {
      setUndoEntry(entry);
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => {
        setUndoEntry(null);
        undoTimerRef.current = null;
      }, 5000);
    },
    [],
  );

  const handleForget = useCallback(
    (id: string) => {
      const idx = items.findIndex((m) => m.id === id);
      if (idx < 0) return;
      const target = items[idx]!;
      setItems((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) {
        const fallback = visibleItems.find((m) => m.id !== id)?.id ?? null;
        setSelectedId(fallback);
      }
      setLiveMsg(`Forgotten: ${target.text}`);
      scheduleUndoBar({ item: target, index: idx, kind: "forget" });
      onForget?.(id);
    },
    [items, onForget, scheduleUndoBar, selectedId, visibleItems],
  );

  const handleKeep = useCallback(
    (id: string) => {
      const idx = items.findIndex((m) => m.id === id);
      if (idx < 0) return;
      const target = items[idx]!;
      const kept: AgentMemoryItem = { ...target, review: false, uses: target.uses ?? 1, usedAt: "Just now" };
      setItems((prev) => prev.map((m) => (m.id === id ? kept : m)));
      setLiveMsg("Kept – it uses this from now on");
      scheduleUndoBar({ item: target, index: idx, kind: "keep" });
      onKeep?.(id);
    },
    [items, onKeep, scheduleUndoBar],
  );

  const handleUndoAction = useCallback(() => {
    if (!undoEntry) return;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    if (undoEntry.kind === "forget") {
      setItems((prev) => {
        const copyList = [...prev];
        copyList.splice(Math.min(undoEntry.index, copyList.length), 0, undoEntry.item);
        return copyList;
      });
      setSelectedId(undoEntry.item.id);
      onRestore?.(undoEntry.item, undoEntry.index);
      setLiveMsg(`Restored: ${undoEntry.item.text}`);
    } else {
      const reverted: AgentMemoryItem = { ...undoEntry.item, review: true };
      setItems((prev) => prev.map((m) => (m.id === reverted.id ? reverted : m)));
      onChange?.(reverted);
      setLiveMsg(`Moved back to review: ${reverted.text}`);
    }
    setUndoEntry(null);
  }, [onChange, onRestore, undoEntry]);

  const handleCreateRemember = useCallback(() => {
    const trimmed = rememberText.trim();
    if (!trimmed) return;
    const created: AgentMemoryItem = {
      id: `mem-${Date.now()}`,
      text: trimmed,
      project: rememberProject,
      source: { kind: "told", at: "Just now", quote: trimmed },
      uses: 0,
      usedAt: "Just now",
    };
    setItems((prev) => [created, ...prev]);
    setTab("saved");
    setSelectedId(created.id);
    setPanelOpen(true);
    setRememberText("");
    if (!reducedMotion) {
      setJustAddedId(created.id);
      window.setTimeout(() => setJustAddedId((cur) => (cur === created.id ? null : cur)), 900);
    }
    setLiveMsg(`Remembered: ${created.text}`);
    onCreate?.(created);
  }, [onCreate, reducedMotion, rememberProject, rememberText]);

  const commitTextEdit = useCallback(() => {
    if (!selectedMemory) return;
    const nextText = editDraft.trim();
    if (!nextText || nextText === selectedMemory.text) {
      setEditDraft(selectedMemory.text);
      return;
    }
    const updated: AgentMemoryItem = { ...selectedMemory, text: nextText };
    setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setLiveMsg(`Updated memory: ${nextText}`);
    onChange?.(updated);
  }, [editDraft, onChange, selectedMemory]);

  const changeProjectScope = useCallback(
    (nextProj: string | undefined) => {
      if (!selectedMemory) return;
      const updated: AgentMemoryItem = { ...selectedMemory, project: nextProj };
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setLiveMsg(`${copy.appliesTo}: ${nextProj ?? copy.everywhere}`);
      onChange?.(updated);
    },
    [copy.appliesTo, copy.everywhere, onChange, selectedMemory],
  );

  // Ordered navigable keys in the tree (group headers + visible rows)
  const flatTreeKeys = useMemo(() => {
    const keys: string[] = [];
    for (const g of groups) {
      keys.push(`group:${g.key}`);
      if (!collapsedGroups[g.key]) {
        for (const r of g.rows) keys.push(`row:${r.id}`);
      }
    }
    return keys;
  }, [collapsedGroups, groups]);

  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target)) return;
    if (e.key === "/") {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      setRememberOpen(true);
      window.requestAnimationFrame(() => rememberInputRef.current?.focus());
      return;
    }
    if (e.key === "j" || e.key === "J" || e.key === "k" || e.key === "K") {
      const rowsOnly = groups.flatMap((g) => (collapsedGroups[g.key] ? [] : g.rows));
      if (rowsOnly.length === 0) return;
      e.preventDefault();
      const delta = e.key === "j" || e.key === "J" ? 1 : -1;
      const curIdx = rowsOnly.findIndex((r) => r.id === selectedId);
      const next = rowsOnly[(curIdx + delta + rowsOnly.length) % rowsOnly.length];
      if (next) {
        openMemory(next.id);
        treeNodeRefs.current[`row:${next.id}`]?.focus();
      }
    }
  };

  const handleTreeKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (flatTreeKeys.length === 0) return;
    const activeEl = document.activeElement as HTMLElement | null;
    const curIdx = flatTreeKeys.findIndex((k) => treeNodeRefs.current[k] === activeEl);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = curIdx < 0 ? 0 : (curIdx + delta + flatTreeKeys.length) % flatTreeKeys.length;
      const key = flatTreeKeys[nextIdx]!;
      treeNodeRefs.current[key]?.focus();
      if (key.startsWith("row:")) openMemory(key.slice(4));
    } else if (e.key === "Home") {
      e.preventDefault();
      treeNodeRefs.current[flatTreeKeys[0]!]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      treeNodeRefs.current[flatTreeKeys[flatTreeKeys.length - 1]!]?.focus();
    } else if (e.key === "ArrowLeft" && curIdx >= 0) {
      const key = flatTreeKeys[curIdx]!;
      if (key.startsWith("group:")) {
        const gKey = key.slice(6);
        if (!collapsedGroups[gKey]) {
          e.preventDefault();
          setCollapsedGroups((p) => ({ ...p, [gKey]: true }));
        }
      } else if (key.startsWith("row:")) {
        const rowId = key.slice(4);
        const parent = groups.find((g) => g.rows.some((r) => r.id === rowId));
        if (parent) {
          e.preventDefault();
          treeNodeRefs.current[`group:${parent.key}`]?.focus();
        }
      }
    } else if (e.key === "ArrowRight" && curIdx >= 0) {
      const key = flatTreeKeys[curIdx]!;
      if (key.startsWith("group:")) {
        const gKey = key.slice(6);
        if (collapsedGroups[gKey]) {
          e.preventDefault();
          setCollapsedGroups((p) => ({ ...p, [gKey]: false }));
        } else {
          const g = groups.find((x) => x.key === gKey);
          if (g?.rows[0]) {
            e.preventDefault();
            openMemory(g.rows[0].id);
            treeNodeRefs.current[`row:${g.rows[0].id}`]?.focus();
          }
        }
      }
    }
  };

  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="af-aops-inspector">
          <AfSkeleton lines={3} />
          <AfSkeleton lines={3} />
          <AfSkeleton lines={4} />
        </div>
      );
    }

    if (!selectedMemory) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="layers" size={18} />
          <span>Select a memory to edit its wording, scope or source.</span>
        </div>
      );
    }

    const scopeMenuItems: AfMenuItem[] = [
      {
        type: "radio",
        id: "__everywhere__",
        label: `${copy.everywhere} (${copy.aboutYou})`,
        icon: "user",
        checked: !selectedMemory.project,
        onSelect: () => changeProjectScope(undefined),
      },
      { type: "separator" },
      ...projects.map<AfMenuItem>((proj) => ({
        type: "radio",
        id: `proj-${proj}`,
        label: proj,
        icon: "folder",
        checked: selectedMemory.project === proj,
        onSelect: () => changeProjectScope(proj),
      })),
    ];

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-mem-title-block">
          {editingTitle ? (
            <textarea
              id="af-mem-edit-box"
              className="af-aops-mem-editor"
              rows={2}
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={() => {
                commitTextEdit();
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextEdit();
                  setEditingTitle(false);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditDraft(selectedMemory.text);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="af-aops-mem-heading-btn"
              title="Click to edit wording"
              onClick={() => setEditingTitle(true)}
            >
              {selectedMemory.text}
            </button>
          )}
        </div>

        <div className="af-aops-kv-flat">
          <div className="af-aops-kv-flat__row">
            <span className="af-aops-kv-key">{copy.appliesTo}</span>
            <AfDropdownMenu items={scopeMenuItems} side="bottom" align="end">
              <button
                type="button"
                className="af-aops-scope-btn"
                aria-label={`${copy.appliesTo}: ${selectedMemory.project ?? copy.everywhere}`}
              >
                <AfIcon name={selectedMemory.project ? "folder" : "globe"} size={13} />
                <span>{selectedMemory.project ?? copy.everywhere}</span>
                <AfIcon name="chevronDown" size={11} />
              </button>
            </AfDropdownMenu>
          </div>
          <div className="af-aops-kv-flat__row">
            <span className="af-aops-kv-key">Learned</span>
            <span className="af-aops-kv-val af-aops-row-cluster">
              <AfIcon name={sourceIcon(selectedMemory.source.kind)} size={13} />
              <span>{sourceLabel(selectedMemory.source.kind)}</span>
              <span className="af-aops-faint">· {selectedMemory.source.at}</span>
            </span>
          </div>
          <div className="af-aops-kv-flat__row">
            <span className="af-aops-kv-key">Used</span>
            <span className="af-aops-kv-val af-aops-tabular">
              <strong>{(selectedMemory.uses ?? 0).toLocaleString()} times</strong>
              {selectedMemory.usedAtLong || selectedMemory.usedAt ? (
                <span className="af-aops-faint">
                  {" "}
                  · last {selectedMemory.usedAtLong ?? selectedMemory.usedAt}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <section className="af-aops-sec">
          <div className="af-aops-sec__title af-aops-sec__title--muted">{copy.cameFrom}</div>
          <div className="af-aops-source-card">
            {selectedMemory.source.question ? (
              <div className="af-aops-source-card__question">{selectedMemory.source.question}</div>
            ) : null}
            {selectedMemory.source.quote ? (
              <blockquote className="af-aops-source-card__quote">{selectedMemory.source.quote}</blockquote>
            ) : null}
            {selectedMemory.source.file ? (
              <div className="af-aops-source-card__detail">{selectedMemory.source.file}</div>
            ) : null}
            <div className="af-aops-source-card__foot">
              <span className="af-aops-source-card__who">
                <AfIcon name={selectedMemory.source.who ? "user" : sourceIcon(selectedMemory.source.kind)} size={12} />
                <span>{selectedMemory.source.who ?? sourceLabel(selectedMemory.source.kind)}</span>
                <span>· {selectedMemory.source.at}</span>
              </span>
              <button
                type="button"
                className="af-aops-inline-link af-aops-inline-link--muted"
                onClick={() => {
                  if (onOpenSource) onOpenSource(selectedMemory);
                  else if (selectedMemory.source.kind === "decision") onNavigate?.("Inbox");
                  else if (selectedMemory.source.kind === "file") onNavigate?.("Folders");
                  else onNavigate?.("Thread");
                }}
              >
                <span>Open</span>
                <AfIcon name="chevronRight" size={11} />
              </button>
            </div>
          </div>
        </section>

        {selectedMemory.usedIn && selectedMemory.usedIn.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-day-head">
              <span className="af-aops-sec__title af-aops-sec__title--muted">{copy.usedWhere}</span>
              <span className="af-aops-faint af-aops-tabular">{selectedMemory.usedIn.length}</span>
            </div>
            <div className="af-aops-used-plain">
              {selectedMemory.usedIn.map((u, idx) => (
                <div key={idx} className="af-aops-used-plain__item">
                  <span className="af-aops-used-plain__arrow" aria-hidden="true">
                    <AfIcon name="arrowUpRight" size={12} />
                  </span>
                  <div className="af-aops-used-plain__body">
                    <div className="af-aops-used-item__task">{u.task}</div>
                    <div className="af-aops-used-item__how">
                      {u.how}
                      {u.at ? ` · ${u.at}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="af-aops-inspector__actions af-aops-inspector__actions--foot">
          {selectedMemory.review ? (
            <>
              <AfButton variant="primary" size="sm" onClick={() => handleKeep(selectedMemory.id)}>
                {copy.keep}
              </AfButton>
              <AfButton variant="secondary" size="sm" onClick={() => handleForget(selectedMemory.id)}>
                {copy.dontKeep}
              </AfButton>
            </>
          ) : (
            <button
              type="button"
              className="af-aops-forget-btn"
              onClick={() => handleForget(selectedMemory.id)}
            >
              <AfIcon name="trash" size={13} />
              <span>{copy.forget}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const rememberScopeItems: AfMenuItem[] = [
    {
      type: "radio",
      id: "new-about",
      label: copy.aboutYou,
      checked: !rememberProject,
      onSelect: () => setRememberProject(undefined),
    },
    ...projects.map<AfMenuItem>((p) => ({
      type: "radio",
      id: `new-${p}`,
      label: p,
      checked: rememberProject === p,
      onSelect: () => setRememberProject(p),
    })),
  ];

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.memory}</h1>
        <span className="af-aops-topbar__count af-aops-tabular">{savedCount}</span>
        <div className="af-aops-pills af-aops-pills--compact" role="tablist" aria-label="Memory lists">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "saved"}
            className="af-aops-pill"
            data-active={tab === "saved" ? "true" : undefined}
            onClick={() => setTab("saved")}
          >
            <span>{copy.saved}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "review"}
            className="af-aops-pill"
            data-active={tab === "review" ? "true" : undefined}
            onClick={() => setTab("review")}
          >
            <span className="af-aops-label-full">{copy.review}</span>
            <span className="af-aops-label-short">{copy.reviewShort}</span>
            {reviewCount > 0 ? <AfBadge count={reviewCount} tone="warning" size="sm" /> : null}
          </button>
        </div>
      </div>

      <div className="af-aops-topbar__right">
        <div className="af-aops-search af-aops-search--compact">
          <AfIcon name="search" size={13} />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown" && visibleItems[0]) {
                e.preventDefault();
                openMemory(visibleItems[0].id);
                treeNodeRefs.current[`row:${visibleItems[0].id}`]?.focus();
              }
            }}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
          />
        </div>

        <AfButton
          variant="secondary"
          size="xs"
          icon="plus"
          onClick={() => {
            setRememberOpen((prev) => !prev);
            window.requestAnimationFrame(() => rememberInputRef.current?.focus());
          }}
        >
          {copy.remember}
        </AfButton>
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Memory"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={780}
      panelTitle={copy.memory}
      panelTab={selectedMemory ? selectedMemory.text : copy.memory}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={340}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      floatingBar={
        undoEntry ? (
          <div className="af-aops-undo-toast" role="status">
            <span>
              {undoEntry.kind === "forget" ? "Forgotten" : "Kept"}:{" "}
              <strong>{undoEntry.item.text.slice(0, 44)}{undoEntry.item.text.length > 44 ? "…" : ""}</strong>
            </span>
            <button type="button" className="af-aops-undo-toast__btn" onClick={handleUndoAction}>
              {copy.undo}
            </button>
          </div>
        ) : null
      }
      className={className}
      style={style}
      onKeyDown={handleRootKeyDown}
      {...rest}
    >
      {rememberOpen ? (
        <div className="af-aops-remember-bar">
          <AfIcon name="quote" size={14} />
          <input
            ref={rememberInputRef}
            type="text"
            className="af-aops-remember-bar__input"
            placeholder="Tell your agent something to keep in mind…"
            value={rememberText}
            onChange={(e) => setRememberText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateRemember();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setRememberOpen(false);
              }
            }}
          />
          <AfDropdownMenu items={rememberScopeItems} side="bottom" align="end">
            <button type="button" className="af-aops-choice-btn">
              <span>{rememberProject ?? copy.aboutYou}</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          </AfDropdownMenu>
          <AfButton variant="primary" size="xs" onClick={handleCreateRemember} disabled={!rememberText.trim()}>
            Save
          </AfButton>
        </div>
      ) : null}

      {loading ? (
        <div className="af-aops-group-stack">
          {[0, 1, 2].map((g) => (
            <div key={g} className="af-aops-day-group">
              <div className="af-aops-day-head">
                <AfSkeleton width={96} height={11} />
              </div>
              <div className="af-aops-list-card">
                {[0, 1, 2].map((r) => (
                  <div key={r} className="af-aops-mem-row af-aops-mem-row--skeleton">
                    <AfSkeleton variant="circle" width={16} height={16} />
                    <AfSkeleton line="64%" />
                    <AfSkeleton width={76} height={11} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : empty || groups.length === 0 ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="layers" size={20} />
          </div>
          <h2 className="af-aops-empty__title">
            {tab === "review" ? "Nothing to review" : "Nothing remembered yet"}
          </h2>
          <p className="af-aops-empty__desc">
            {tab === "review"
              ? "Anything your agent picks up on its own waits here until you say Keep."
              : "Memories come from threads, your decisions and rules you tell your agent directly."}
          </p>
          {tab === "saved" ? (
            <AfButton
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => {
                setRememberOpen(true);
                window.requestAnimationFrame(() => rememberInputRef.current?.focus());
              }}
            >
              {copy.remember}
            </AfButton>
          ) : null}
        </div>
      ) : (
        <div
          role="tree"
          aria-label={copy.memory}
          className="af-aops-group-stack"
          onKeyDown={handleTreeKeyDown}
        >
          {groups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.key]);
            return (
              <div key={group.key} className="af-aops-tree-group" role="none">
                <div
                  ref={(el) => registerTreeRef(`group:${group.key}`, el)}
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={!isCollapsed}
                  tabIndex={selectedId === null && group === groups[0] ? 0 : -1}
                  className="af-aops-tree-head"
                  onClick={() => setCollapsedGroups((p) => ({ ...p, [group.key]: !isCollapsed }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCollapsedGroups((p) => ({ ...p, [group.key]: !isCollapsed }));
                    }
                  }}
                >
                  <span className="af-aops-tree-head__icon" aria-hidden="true">
                    <AfIcon name={group.project ? "folder" : "user"} size={13} />
                  </span>
                  <span className="af-aops-tree-head__title">{group.label}</span>
                  <span className="af-aops-tree-head__count af-aops-tabular">{group.rows.length}</span>
                </div>

                {!isCollapsed ? (
                  <div role="group" className="af-aops-list-card">
                    {group.rows.map((item) => (
                      <MemoryTreeRow
                        key={item.id}
                        item={item}
                        selected={selectedId === item.id}
                        recalled={recalledId === item.id}
                        justAdded={justAddedId === item.id}
                        isReviewTab={tab === "review"}
                        keepLabel={copy.keep}
                        dontKeepLabel={copy.dontKeep}
                        onOpen={openMemory}
                        onKeepItem={handleKeep}
                        onForgetItem={handleForget}
                        registerRef={registerTreeRef}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AgentOpsShell>
  );
}
