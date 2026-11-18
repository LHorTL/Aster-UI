import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfInput } from "../controls/Input";
import { AfTextarea } from "../controls/Textarea";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";

export type AfChatScreenUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type AfShellArtifactKind = "new" | "document" | "sheet" | "folder" | "code" | "image" | "custom";

export type AfShellSheetRow = {
  cells: string[];
  formula?: string;
  total?: boolean;
};

export type AfShellFolderEntry = {
  name: string;
  meta: string;
  preview: string;
  kind?: "image" | "doc" | "sheet";
};

export type AfShellArtifact = {
  id?: string;
  title?: string;
  kind: Exclude<AfShellArtifactKind, "new">;
  subtitle?: string;
  updated?: string;
  doc?: string;
  headers?: string[];
  rows?: AfShellSheetRow[];
  code?: string;
  language?: string;
  files?: AfShellFolderEntry[];
  imageCaption?: string;
  content?: ReactNode;
};

export type AfWorkAreaTabItem = {
  id: string;
  title: string;
  kind: AfShellArtifactKind;
  badge?: number;
  closable?: boolean;
  artifact?: AfShellArtifact;
  content?: ReactNode;
};

export type AfChatSidebarItem = {
  label: string;
  icon: AffectIconKey;
  count?: number;
  dot?: boolean;
};

export type AfChatSidebarThread = {
  id: string;
  title: string;
  project?: string;
  pinned?: boolean;
  meta?: string;
  dot?: boolean;
};

export function initialsOfName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/** Middle-truncate long file names while keeping the end of the stem and extension intact. */
export function middleTruncateFileName(name: string, maxLen = 26): string {
  if (name.length <= maxLen) return name;
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0 && name.length - dotIdx <= 8) {
    const ext = name.slice(dotIdx);
    const stem = name.slice(0, dotIdx);
    const keepEnd = Math.min(6, Math.max(3, Math.floor((maxLen - ext.length - 1) * 0.4)));
    const keepStart = Math.max(4, maxLen - ext.length - keepEnd - 1);
    if (stem.length <= keepStart + keepEnd) return name;
    return `${stem.slice(0, keepStart)}…${stem.slice(-keepEnd)}${ext}`;
  }
  const head = Math.max(6, Math.floor((maxLen - 1) * 0.58));
  const tail = Math.max(4, maxLen - head - 1);
  return `${name.slice(0, head)}…${name.slice(-tail)}`;
}

export function artifactKindIcon(kind: AfShellArtifactKind): AffectIconKey {
  switch (kind) {
    case "sheet":
      return "kanban";
    case "folder":
      return "folder";
    case "code":
      return "code";
    case "image":
      return "sparkle";
    case "document":
      return "file";
    case "custom":
      return "layers";
    default:
      return "plus";
  }
}

export const DEFAULT_SHELL_ARTIFACTS: Record<string, AfShellArtifact> = {
  "launch-checklist.md": {
    id: "launch-checklist.md",
    title: "Launch checklist",
    kind: "document",
    subtitle: "Document · Updated 6m ago",
    updated: "Updated 6m ago",
    doc: `# Q4 Launch Checklist\n\n1. Finalize product positioning & pricing FAQ with Finance\n2. Verify webhook rate limits and fallback retries in staging\n3. Approve paid search & partner webinar budgets\n4. Publish migration guide and changelog entry`,
  },
  "naming-guide.md": {
    id: "naming-guide.md",
    title: "Naming guide",
    kind: "document",
    subtitle: "Document · Yesterday",
    updated: "Updated yesterday",
    doc: `# Product Naming Guide\n\nUse plain nouns that describe what the surface does:\n- Thread — your single conversation with the orchestrator\n- Tasks — background work grouped by project\n- Inbox — decisions and approvals waiting on a person`,
  },
  "launch-budget.csv": {
    id: "launch-budget.csv",
    title: "Q4 launch budget.csv",
    kind: "sheet",
    subtitle: "Sheet · Formulas",
    headers: ["Channel", "Clicks", "Signups", "CAC", "Spend"],
    rows: [
      { cells: ["Paid search", "18,420", "612", "$38.40", "$23,500"] },
      { cells: ["Content & SEO", "42,910", "1,140", "$12.10", "$13,800"] },
      { cells: ["Partner webinars", "6,280", "294", "$31.20", "$9,172"] },
      { cells: ["Developer events", "5,110", "215", "$44.65", "$9,600"] },
      {
        cells: ["Total", "72,720", "2,261", "$24.80", "$56,072"],
        formula: "=SUM(E2:E5)",
        total: true,
      },
    ],
  },
};

function SheetArtifactViewer({ title, artifact }: { title: string; artifact: AfShellArtifact }) {
  const [headers, setHeaders] = useState<string[]>(
    () => artifact.headers ?? ["Item", "Metric", "Target", "Actual"],
  );
  const [rows, setRows] = useState<AfShellSheetRow[]>(
    () =>
      artifact.rows ?? [
        { cells: ["Enterprise", "Net retention", "118%", "122%"] },
        { cells: ["Mid-market", "Net retention", "108%", "111%"] },
        { cells: ["Self-serve", "Net retention", "96%", "98%"] },
        { cells: ["Blended", "Average", "107%", "110%"], formula: "=AVERAGE(D2:D4)", total: true },
      ],
  );
  const [selected, setSelected] = useState<{ r: number; c: number }>({
    r: Math.max(0, (artifact.rows?.length ?? 4) - 1),
    c: Math.max(0, (artifact.headers?.length ?? 4) - 1),
  });

  const activeRow = rows[selected.r];
  const colLetter = String.fromCharCode(65 + Math.min(25, selected.c));
  const cellAddress = `${colLetter}${selected.r + 2}`;
  const cellDisplay =
    activeRow?.formula && selected.c === headers.length - 1
      ? activeRow.formula
      : (activeRow?.cells[selected.c] ?? "");

  const addRow = () => {
    setRows((prev) => {
      const totalIdx = prev.findIndex((r) => r.total);
      const nonTotalCount = totalIdx >= 0 ? totalIdx : prev.length;
      const newCells = headers.map((_, idx) => (idx === 0 ? `Row ${nonTotalCount + 1}` : "—"));
      const nextRow: AfShellSheetRow = { cells: newCells };
      const insertAt = totalIdx >= 0 ? totalIdx : prev.length;
      const next = [...prev.slice(0, insertAt), nextRow, ...prev.slice(insertAt)];
      setSelected({ r: insertAt, c: 0 });
      return next;
    });
  };

  const addColumn = () => {
    const nextIdx = headers.length;
    const nextTitle = nextIdx === 4 && !headers.includes("Notes") ? "Notes" : `Column ${nextIdx + 1}`;
    setHeaders((prev) => [...prev, nextTitle]);
    setRows((prev) => prev.map((row) => ({ ...row, cells: [...row.cells, "—"] })));
    setSelected((s) => ({ r: s.r, c: nextIdx }));
  };

  const deleteRow = (rIdx: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== rIdx)));
    setSelected((s) => ({ ...s, r: Math.max(0, s.r - 1) }));
  };

  const deleteColumn = (cIdx: number) => {
    if (headers.length <= 2) return;
    setHeaders((prev) => prev.filter((_, idx) => idx !== cIdx));
    setRows((prev) => prev.map((row) => ({ ...row, cells: row.cells.filter((_, idx) => idx !== cIdx) })));
    setSelected((s) => ({ ...s, c: Math.max(0, s.c - 1) }));
  };

  const sheetMenuItems: AfMenuItem[] = [
    {
      id: "del-row",
      label: "Delete row",
      icon: "trash",
      onSelect: () => deleteRow(selected.r),
    },
    {
      id: "del-col",
      label: "Delete column",
      icon: "x",
      onSelect: () => deleteColumn(selected.c),
    },
  ];

  return (
    <div className="af-sc-viewer">
      <div className="af-sc-viewer__bar">
        <span className="af-sc-viewer__meta">
          <strong>{title}</strong>
        </span>
        <div className="af-sc-viewer__acts">
          <button type="button" className="af-sc-sheet-act" onClick={addRow}>
            <AfIcon name="plus" size={11} />
            <span>Row</span>
          </button>
          <button type="button" className="af-sc-sheet-act" onClick={addColumn}>
            <AfIcon name="plus" size={11} />
            <span>Column</span>
          </button>
          <AfDropdownMenu items={sheetMenuItems} side="bottom" align="end">
            <button type="button" className="af-sc-icon-btn" aria-label="Sheet actions">
              <AfIcon name="more" size={14} />
            </button>
          </AfDropdownMenu>
        </div>
      </div>
      <div className="af-sc-fx">
        <span className="af-sc-fx__cell">{cellAddress}</span>
        <span className="af-sc-fx__tag">fx</span>
        <span className="af-sc-fx__val">{cellDisplay}</span>
      </div>
      <div className="af-sc-sheet-wrap af-scroll-area" style={{ overflowX: "auto" }}>
        <table className="af-sc-sheet">
          <thead>
            <tr>
              <th className="af-sc-sheet__idx">#</th>
              {headers.map((h, cIdx) => (
                <th key={`${h}-${cIdx}`}>
                  <span>{String.fromCharCode(65 + cIdx)}</span> {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} data-total={row.total || undefined}>
                <td className="af-sc-sheet__idx">{rIdx + 1}</td>
                {row.cells.map((cell, cIdx) => {
                  const isSel = selected.r === rIdx && selected.c === cIdx;
                  const isNumeric = /^[$€£+-]?\d/.test(cell.trim());
                  return (
                    <td
                      key={cIdx}
                      data-selected={isSel || undefined}
                      data-num={isNumeric ? "" : undefined}
                      onClick={() => setSelected({ r: rIdx, c: cIdx })}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentArtifactViewer({ title, artifact }: { title: string; artifact: AfShellArtifact }) {
  const [body, setBody] = useState(
    () =>
      artifact.doc ??
      `# ${title}\n\nStructured notes and source material prepared by your workspace assistant.`,
  );
  const words = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

  return (
    <div className="af-sc-viewer">
      <div className="af-sc-viewer__bar">
        <span className="af-sc-viewer__meta">{artifact.updated ?? "Edited just now"}</span>
        <span className="af-sc-viewer__meta">{words} words</span>
      </div>
      <div className="af-sc-doc-editor">
        <AfTextarea
          aria-label={title}
          resize="none"
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
    </div>
  );
}

function FolderArtifactViewer({ title, artifact }: { title: string; artifact: AfShellArtifact }) {
  const entries = useMemo<AfShellFolderEntry[]>(
    () =>
      artifact.files ?? [
        {
          name: "hero-linen-sand.jpg",
          meta: "2.4 MB · 2400 × 1800",
          preview: "Three-quarter studio shot on warm limestone plinth, natural morning shadow.",
          kind: "image",
        },
        {
          name: "sole-macro-detail.jpg",
          meta: "1.8 MB · 2000 × 2000",
          preview: "Macro weave texture of natural unbleached linen upper with terracotta stitch.",
          kind: "image",
        },
        {
          name: "lookbook- selects.md",
          meta: "4 KB · Markdown",
          preview: "12 approved frames tagged for Instagram carousel and launch landing hero.",
          kind: "doc",
        },
      ],
    [artifact.files],
  );
  const [quickLook, setQuickLook] = useState<AfShellFolderEntry | null>(entries[0] ?? null);

  return (
    <div className="af-sc-viewer">
      <div className="af-sc-viewer__bar">
        <span className="af-sc-viewer__meta">
          <strong>{title}</strong> · {entries.length} items
        </span>
        <span className="af-sc-kbd">Space · Quick Look</span>
      </div>
      <div className="af-sc-folder-list">
        {entries.map((entry) => {
          const active = quickLook?.name === entry.name;
          return (
            <button
              key={entry.name}
              type="button"
              className="af-sc-folder-row"
              data-active={active || undefined}
              onClick={() => setQuickLook(entry)}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  e.preventDefault();
                  setQuickLook((prev) => (prev?.name === entry.name ? null : entry));
                }
              }}
            >
              <AfIcon name={entry.kind === "image" ? "sparkle" : "file"} size={14} />
              <span className="af-sc-folder-row__name">{entry.name}</span>
              <span className="af-sc-folder-row__meta">{entry.meta}</span>
            </button>
          );
        })}
      </div>
      {quickLook ? (
        <div className="af-sc-quicklook" role="region" aria-label={`Quick Look: ${quickLook.name}`}>
          <div className="af-sc-quicklook__head">
            <strong>{quickLook.name}</strong>
            <span>{quickLook.meta}</span>
          </div>
          <div className="af-sc-quicklook__stage">
            <span className="af-sc-quicklook__swatch" aria-hidden="true" />
            <p>{quickLook.preview}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return Boolean(document.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

function CodeArtifactViewer({ title, artifact }: { title: string; artifact: AfShellArtifact }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const code =
    artifact.code ??
    `export async function ingestEvent(batch: EventRecord[]) {\n  return kafkaProducer.send({\n    topic: "events.v2",\n    messages: batch.map((item) => ({ key: item.orgId, value: JSON.stringify(item) })),\n  });\n}`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <div className="af-sc-viewer">
      <div className="af-sc-viewer__bar">
        <span className="af-sc-viewer__meta">{title}</span>
        <button
          type="button"
          className="af-sc-mini-pill"
          onClick={() => {
            void copyTextSafe(code).then((ok) => {
              if (!ok || !mountedRef.current) return;
              if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
              setCopied(true);
              copyTimerRef.current = window.setTimeout(() => {
                copyTimerRef.current = null;
                if (mountedRef.current) setCopied(false);
              }, 1400);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="af-sc-code">{code}</pre>
    </div>
  );
}

function ImageArtifactViewer({ title, artifact }: { title: string; artifact: AfShellArtifact }) {
  return (
    <div className="af-sc-viewer">
      <div className="af-sc-viewer__bar">
        <span className="af-sc-viewer__meta">{title}</span>
        <span className="af-sc-kbd">PNG · 1600×960</span>
      </div>
      <div className="af-sc-chart-preview">
        <div className="af-sc-chart-preview__bars" aria-hidden="true">
          {[38, 52, 46, 68, 74, 62, 88].map((h, idx) => (
            <div key={idx} className="af-sc-chart-preview__col">
              <div className="af-sc-chart-preview__bar" style={{ height: `${h}%` }} />
              <span>W{idx + 1}</span>
            </div>
          ))}
        </div>
        <p className="af-sc-chart-preview__cap">
          {artifact.imageCaption ?? "Q3 net churn fell from 2.4% to 1.6% across enterprise cohorts."}
        </p>
      </div>
    </div>
  );
}

export type ChatInsetShellProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  workspace?: string;
  user?: AfChatScreenUser;
  activeNav?: string;
  onNavigate?: (label: string) => void;
  navItems?: AfChatSidebarItem[];
  sidebarGroups?: { label: string; items: AfChatSidebarItem[] }[];
  showSidebarCards?: boolean;
  projects?: string[];
  threads?: AfChatSidebarThread[];
  activeThreadId?: string;
  onSelectThread?: (thread: AfChatSidebarThread) => void;
  hideThreads?: boolean;
  /** Double-sidebar rail mode (`agent-chat-rail`). */
  rail?: {
    sections: AfChatSidebarItem[];
    activeSection: string;
    selectedProject: string;
    onSelectProject: (project: string) => void;
    emptyText?: string;
  };
  /** Main panel header bar; pass `false` to omit (e.g. centered start screen). */
  mainHeader?: {
    title: ReactNode;
    actions?: ReactNode;
  } | false;
  /** Controlled or initial right work area tabs. */
  workAreaOpen?: boolean;
  defaultWorkAreaOpen?: boolean;
  onWorkAreaOpenChange?: (open: boolean) => void;
  workAreaOpenLabel?: string;
  tabs?: AfWorkAreaTabItem[];
  activeTabId?: string;
  onTabsChange?: (tabs: AfWorkAreaTabItem[]) => void;
  onActiveTabChange?: (id: string) => void;
  suggestedArtifacts?: Record<string, AfShellArtifact>;
  children: ReactNode;
};

const DEFAULT_SIDEBAR_NAV: AfChatSidebarItem[] = [
  { label: "New chat", icon: "pencil" },
  { label: "Folders", icon: "folder" },
  { label: "Integrations", icon: "grid" },
];

const DEFAULT_SIDEBAR_PROJECTS = ["Q3 Campaign", "Brand assets", "Hiring", "Research"];

const DEFAULT_SIDEBAR_THREADS: AfChatSidebarThread[] = [
  { id: "t-q3-msg", title: "Q3 launch messaging", pinned: true },
  { id: "t-hooks", title: "Ad hooks for the linen overshirt", project: "Q3 Campaign", dot: true },
  { id: "t-budget", title: "Q3 budget split by channel", project: "Q3 Campaign" },
  { id: "t-onboard", title: "Onboarding email draft" },
  { id: "t-cal", title: "August content calendar" },
];

export function ChatInsetShell({
  workspace = "Acme",
  user = { name: "Alex Morgan" },
  activeNav = "New chat",
  onNavigate,
  navItems = DEFAULT_SIDEBAR_NAV,
  sidebarGroups,
  showSidebarCards,
  projects = DEFAULT_SIDEBAR_PROJECTS,
  threads = DEFAULT_SIDEBAR_THREADS,
  activeThreadId,
  onSelectThread,
  hideThreads = false,
  rail,
  mainHeader,
  workAreaOpen: workAreaOpenProp,
  defaultWorkAreaOpen = false,
  onWorkAreaOpenChange,
  workAreaOpenLabel = "Open workspace",
  tabs: tabsProp,
  activeTabId: activeTabIdProp,
  onTabsChange,
  onActiveTabChange,
  suggestedArtifacts = DEFAULT_SHELL_ARTIFACTS,
  children,
  className,
  ...rest
}: ChatInsetShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newTabUrl, setNewTabUrl] = useState("");
  const [newsOpen, setNewsOpen] = useState(true);
  const effectiveShowCards = showSidebarCards ?? workspace !== "Fieldwork";

  const [innerWorkOpen, setInnerWorkOpen] = useState(defaultWorkAreaOpen);
  const workOpen = workAreaOpenProp ?? innerWorkOpen;
  const setWorkOpen = (next: boolean) => {
    if (workAreaOpenProp === undefined) setInnerWorkOpen(next);
    onWorkAreaOpenChange?.(next);
  };

  const defaultInitialTabs = useMemo<AfWorkAreaTabItem[]>(
    () => tabsProp ?? [{ id: "tab-new", title: "New tab", kind: "new", closable: true }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [innerTabs, setInnerTabs] = useState<AfWorkAreaTabItem[]>(defaultInitialTabs);
  const tabs = tabsProp ?? innerTabs;
  const updateTabs = (next: AfWorkAreaTabItem[]) => {
    if (tabsProp === undefined) setInnerTabs(next);
    onTabsChange?.(next);
  };

  const [innerActiveTab, setInnerActiveTab] = useState<string>(
    activeTabIdProp ?? defaultInitialTabs[0]?.id ?? "tab-new",
  );
  const activeTabId = activeTabIdProp ?? innerActiveTab;
  const setActiveTab = (id: string) => {
    if (activeTabIdProp === undefined) setInnerActiveTab(id);
    onActiveTabChange?.(id);
  };

  const [workExpanded, setWorkExpanded] = useState(false);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(() => ({
    [projects[0] ?? "Q4 Launch"]: true,
  }));

  // Resizable double-sidebar chat column width
  const [railChatWidth, setRailChatWidth] = useState(224);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const openWorkBtnRef = useRef<HTMLButtonElement | null>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startResizeChatCol = (clientX: number) => {
    dragRef.current = { startX: clientX, startW: railChatWidth };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const next = Math.min(310, Math.max(176, dragRef.current.startW + (ev.clientX - dragRef.current.startX)));
      setRailChatWidth(Math.round(next));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const openArtifactTab = (key: string, art: AfShellArtifact) => {
    const id = art.id ?? `art-${key}`;
    const title = art.title ?? key;
    setWorkOpen(true);
    const found = tabs.find((t) => t.id === id);
    if (found) {
      setActiveTab(found.id);
      return;
    }
    const created: AfWorkAreaTabItem = {
      id,
      title,
      kind: art.kind,
      closable: true,
      artifact: art,
      content: art.content,
    };
    const next =
      tabs.length === 1 && tabs[0]?.kind === "new" ? [created] : [...tabs, created];
    updateTabs(next);
    setActiveTab(id);
  };

  const addNewBlankTab = () => {
    const id = `tab-new-${Date.now()}`;
    const next = [...tabs, { id, title: "New tab", kind: "new" as const, closable: true }];
    updateTabs(next);
    setActiveTab(id);
    setWorkOpen(true);
  };

  const closeWorkTab = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      // Closing the last tab folds the work area and restores primary/new tab for next open
      const fallback = tabsProp?.[0] ?? { id: "tab-new", title: "New tab", kind: "new" as const, closable: true };
      updateTabs([fallback]);
      setActiveTab(fallback.id);
      setWorkOpen(false);
      window.requestAnimationFrame(() => openWorkBtnRef.current?.focus());
      return;
    }
    updateTabs(remaining);
    if (activeTabId === id) {
      const nextActive = remaining[remaining.length - 1]!.id;
      setActiveTab(nextActive);
      window.requestAnimationFrame(() => tabBtnRefs.current[nextActive]?.focus());
    }
  };

  const handleTabKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, idx: number, tab: AfWorkAreaTabItem) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (idx + dir + tabs.length) % tabs.length;
      const nextTab = tabs[nextIdx];
      if (nextTab) {
        setActiveTab(nextTab.id);
        tabBtnRefs.current[nextTab.id]?.focus();
      }
    } else if ((e.key === "Delete" || e.key === "Backspace") && tab.closable !== false) {
      e.preventDefault();
      closeWorkTab(tab.id);
    }
  };

  const wsMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "invite", label: "Invite people", icon: "users", onSelect: () => onNavigate?.("Invite people") },
      { type: "separator" },
      { id: "ws-settings", label: "Workspace settings", icon: "settings", onSelect: () => onNavigate?.("Workspace settings") },
      { id: "analytics", label: "Analytics", icon: "chart", onSelect: () => onNavigate?.("Analytics") },
      { id: "billing", label: "Billing", icon: "creditCard", onSelect: () => onNavigate?.("Billing") },
      { id: "usage", label: "Usage & limits", icon: "sliders", onSelect: () => onNavigate?.("Usage & limits") },
      { id: "members", label: "Members", icon: "user", onSelect: () => onNavigate?.("Members") },
      { type: "separator" },
      { id: "learn", label: "Learn more", icon: "external", onSelect: () => onNavigate?.("Learn more") },
      {
        id: "switch",
        label: "Switch workspace",
        icon: "layers",
        submenu: [
          { id: "ws-1", type: "radio", checked: true, label: workspace },
          { id: "ws-2", type: "radio", checked: false, label: `${workspace} Labs`, onSelect: () => onNavigate?.(`${workspace} Labs`) },
        ],
      },
    ],
    [onNavigate, workspace],
  );

  const userMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { type: "label", label: user.name },
      { id: "prefs", label: "Preferences", icon: "sliders", onSelect: () => onNavigate?.("Preferences") },
      { id: "int", label: "Integrations", icon: "grid", onSelect: () => onNavigate?.("Integrations") },
      { id: "settings", label: "Settings", icon: "settings", kbd: "⌘,", onSelect: () => onNavigate?.("Settings") },
      { type: "separator" },
      { id: "logout", label: "Log out", icon: "arrowLeft", onSelect: () => onNavigate?.("Log out") },
    ],
    [onNavigate, user.name],
  );

  const commands = useMemo<AfCommand[]>(
    () => [
      ...navItems.map((item) => ({
        id: `nav-${item.label}`,
        group: "Navigation",
        label: item.label,
        icon: item.icon,
        onSelect: () => onNavigate?.(item.label),
      })),
      ...Object.entries(suggestedArtifacts).map(([key, art]) => ({
        id: `art-${key}`,
        group: "Artifacts",
        label: art.title ?? key,
        icon: artifactKindIcon(art.kind),
        onSelect: () => openArtifactTab(key, art),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navItems, suggestedArtifacts],
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const renderTabContent = (tab: AfWorkAreaTabItem | undefined) => {
    if (!tab) return null;
    if (tab.content) return <div className="af-sc-viewer__custom">{tab.content}</div>;
    if (tab.artifact) {
      if (tab.artifact.kind === "sheet") return <SheetArtifactViewer title={tab.title} artifact={tab.artifact} />;
      if (tab.artifact.kind === "folder") return <FolderArtifactViewer title={tab.title} artifact={tab.artifact} />;
      if (tab.artifact.kind === "code") return <CodeArtifactViewer title={tab.title} artifact={tab.artifact} />;
      if (tab.artifact.kind === "image") return <ImageArtifactViewer title={tab.title} artifact={tab.artifact} />;
      return <DocumentArtifactViewer title={tab.title} artifact={tab.artifact} />;
    }
    return (
      <div className="af-sc-newtab">
        <div className="af-sc-newtab__addr">
          <AfInput
            icon="search"
            aria-label="Search or open a file"
            placeholder="Search or open a file…"
            value={newTabUrl}
            onChange={(e) => setNewTabUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTabUrl.trim()) {
                openArtifactTab(newTabUrl.trim(), {
                  id: `doc-${Date.now()}`,
                  title: newTabUrl.trim(),
                  kind: "document",
                  doc: `# ${newTabUrl.trim()}\n\nOpened in workspace viewer.`,
                });
                setNewTabUrl("");
              }
            }}
          />
        </div>
        <div className="af-sc-newtab__sec">
          <span className="af-sc-sec-label">Jump back in</span>
          <div className="af-sc-newtab__tools">
            {[
              {
                label: "Terminal",
                icon: "terminal" as AffectIconKey,
                art: {
                  id: "jump-terminal",
                  title: "Terminal",
                  kind: "code" as const,
                  subtitle: "zsh · ~/workspace/q3-launch",
                  code: "$ pnpm test --run\n✓ tests/pricing.test.ts (18 tests) 210ms\n✓ tests/webhooks.test.ts (24 tests) 318ms\n\nTest Files  2 passed (2)",
                },
              },
              {
                label: "Browser",
                icon: "globe" as AffectIconKey,
                art: {
                  id: "jump-browser",
                  title: "Browser",
                  kind: "document" as const,
                  subtitle: "https://preview.acme.dev/q3-launch",
                  doc: `# Q3 Launch Preview\n\nLive staging environment connected to preview.acme.dev/q3-launch.\n\n- Hero copy & enterprise tier pricing synced\n- Lighthouse performance score: 99`,
                },
              },
              {
                label: "Q3 launch",
                icon: "folder" as AffectIconKey,
                art: {
                  id: "jump-q3-launch",
                  title: "Q3 launch",
                  kind: "folder" as const,
                  subtitle: "Folder · 4 items",
                  files: [
                    { name: "launch-checklist.md", meta: "6m ago", preview: "Final launch gates & owner sign-offs", kind: "doc" as const },
                    { name: "q3-launch-budget.csv", meta: "18m ago", preview: "Paid search, content & partner spend", kind: "sheet" as const },
                    { name: "positioning-faq.md", meta: "2h ago", preview: "Enterprise seat tier messaging", kind: "doc" as const },
                  ],
                },
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="af-sc-tool-tile"
                onClick={() => openArtifactTab(item.art.id, item.art)}
              >
                <AfIcon name={item.icon} size={14} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="af-sc-newtab__sec">
          <span className="af-sc-sec-label">Suggested</span>
          <div className="af-sc-newtab__list">
            {Object.entries(suggestedArtifacts).map(([key, art]) => (
              <button
                key={key}
                type="button"
                className="af-sc-suggest-row"
                onClick={() => openArtifactTab(key, art)}
              >
                <span className="af-sc-suggest-row__icon">
                  <AfIcon name={artifactKindIcon(art.kind)} size={13} />
                </span>
                <span className="af-sc-suggest-row__text">
                  <strong>{art.title ?? key}</strong>
                  {art.subtitle ? <span>{art.subtitle}</span> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStandardSidebar = () => {
    const pinned = threads.filter((t) => t.pinned);
    const loose = threads.filter((t) => !t.pinned && !t.project);

    return (
      <div className="af-sc-side__inner">
        <div className="af-sc-side__head">
          <AfDropdownMenu items={wsMenuItems} side="bottom" align="start" width={216}>
            <button type="button" className="af-sc-ws-btn" aria-label={`${workspace} workspace menu`}>
              <span className="af-sc-ws-logo">{workspace.charAt(0).toUpperCase()}</span>
              <span className="af-sc-ws-name" title={workspace}>
                {workspace}
              </span>
              <AfIcon name="chevronDown" size={12} />
            </button>
          </AfDropdownMenu>
          <AfTooltip content="Collapse sidebar" side="right">
            <button
              type="button"
              className="af-sc-icon-btn"
              aria-label="Collapse sidebar"
              onClick={() => setSidebarCollapsed(true)}
            >
              <AfIcon name="panelLeft" size={15} />
            </button>
          </AfTooltip>
        </div>

        <button
          type="button"
          className="af-sc-search-btn"
          aria-keyshortcuts="Meta+K"
          onClick={() => setPaletteOpen(true)}
        >
          <span className="af-sc-search-btn__left">
            <AfIcon name="search" size={13} />
            <span>Search…</span>
          </span>
          <span className="af-sc-kbd">⌘K</span>
        </button>

        <div className="af-sc-side__scroll">
          <nav className="af-sc-side__group" aria-label="Workspace navigation">
            {navItems.map((item) => {
              const isCurrent = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="af-sc-nav-btn"
                  data-active={isCurrent || undefined}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => onNavigate?.(item.label)}
                >
                  <span className="af-sc-nav-btn__main">
                    <AfIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 ? (
                    <span className="af-sc-nav-count">{item.count}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {sidebarGroups?.map((grp) => (
            <div key={grp.label} className="af-sc-side__group">
              <span className="af-sc-sec-label">{grp.label}</span>
              {grp.items.map((item) => {
                const isCurrent = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="af-sc-nav-btn"
                    data-active={isCurrent || undefined}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => onNavigate?.(item.label)}
                  >
                    <span className="af-sc-nav-btn__main">
                      <AfIcon name={item.icon} size={14} />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && item.count > 0 ? (
                      <span className="af-sc-nav-count">{item.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

          {!hideThreads && pinned.length > 0 ? (
            <div className="af-sc-side__group">
              <span className="af-sc-sec-label">Pinned</span>
              {pinned.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="af-sc-thread-btn"
                  data-active={activeThreadId === t.id || undefined}
                  onClick={() => {
                    onSelectThread?.(t);
                    onNavigate?.(t.title);
                  }}
                >
                  <span className="af-sc-thread-btn__label">{t.title}</span>
                  {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {!hideThreads && projects.length > 0 ? (
            <div className="af-sc-side__group">
              <span className="af-sc-sec-label">Projects</span>
              {projects.map((proj) => {
                const expanded = Boolean(openProjects[proj]);
                const projThreads = threads.filter((t) => t.project === proj);
                return (
                  <div key={proj} className="af-sc-proj-block">
                    <button
                      type="button"
                      className="af-sc-nav-btn"
                      onClick={() => {
                        setOpenProjects((p) => ({ ...p, [proj]: !p[proj] }));
                        onNavigate?.(proj);
                      }}
                    >
                      <span className="af-sc-nav-btn__main">
                        <AfIcon name={expanded ? "folderOpen" : "folder"} size={14} />
                        <span>{proj}</span>
                      </span>
                    </button>
                    {expanded && projThreads.length > 0 ? (
                      <div className="af-sc-proj-threads">
                        {projThreads.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="af-sc-thread-btn"
                            data-active={activeThreadId === t.id || undefined}
                            onClick={() => {
                              onSelectThread?.(t);
                              onNavigate?.(t.title);
                            }}
                          >
                            <span className="af-sc-thread-btn__label">{t.title}</span>
                            {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {!hideThreads && loose.length > 0 ? (
            <div className="af-sc-side__group">
              <span className="af-sc-sec-label">Chats</span>
              {loose.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="af-sc-thread-btn"
                  data-active={activeThreadId === t.id || undefined}
                  onClick={() => {
                    onSelectThread?.(t);
                    onNavigate?.(t.title);
                  }}
                >
                  <span className="af-sc-thread-btn__label">{t.title}</span>
                  {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {effectiveShowCards ? (
          <div className="af-sc-side__cards">
            {newsOpen ? (
              <div className="af-sc-news-stack">
                <div className="af-sc-news-peek" aria-hidden="true" />
                <div className="af-sc-news">
                  <div className="af-sc-news__top">
                    <span className="af-sc-news__tag">New in {workspace}</span>
                    <button
                      type="button"
                      className="af-sc-news__close"
                      aria-label="Dismiss announcement"
                      onClick={() => setNewsOpen(false)}
                    >
                      <AfIcon name="x" size={11} />
                    </button>
                  </div>
                  <strong className="af-sc-news__title">Shared folders</strong>
                  <button
                    type="button"
                    className="af-sc-news__foot"
                    onClick={() => onNavigate?.("Changelog")}
                  >
                    <span>Full changelog</span>
                    <AfIcon name="chevronRight" size={11} />
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="af-sc-guide"
              onClick={() => onNavigate?.("Getting started")}
            >
              <div className="af-sc-guide__head">
                <strong>Getting started</strong>
                <AfIcon name="chevronRight" size={11} />
              </div>
              <div className="af-sc-guide__sub">
                <span>13% done · </span>
                <em>Great start!</em>
              </div>
              <div className="af-sc-guide__bar" aria-hidden="true">
                <span style={{ width: "13%" }} />
              </div>
            </button>
          </div>
        ) : null}

        <div className="af-sc-side__foot">
          <AfDropdownMenu items={userMenuItems} side="top" align="start" width={212}>
            <button type="button" className="af-sc-user-btn" aria-label={`Account menu for ${user.name}`}>
              <span className="af-sc-avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : initialsOfName(user.name)}
              </span>
              <span className="af-sc-user-name">{user.name}</span>
              <AfIcon name="chevronDown" size={12} />
            </button>
          </AfDropdownMenu>
        </div>
      </div>
    );
  };

  const renderRailIconBar = () => {
    if (!rail) return null;
    return (
      <nav className="af-sc-rail" aria-label="Apps">
        <AfDropdownMenu items={wsMenuItems} side="right" align="start" width={216}>
          <button
            type="button"
            className="af-sc-rail__logo"
            aria-label={workspace}
            title={workspace}
          >
            {workspace.charAt(0).toUpperCase()}
          </button>
        </AfDropdownMenu>
        <span className="af-sc-rail__divider" aria-hidden="true" />
        {rail.sections.map((sec) => {
          const current = rail.activeSection === sec.label;
          return (
            <AfTooltip key={sec.label} content={sec.label} side="right">
              <button
                type="button"
                className="af-sc-rail__btn"
                aria-label={sec.label}
                aria-current={current ? "page" : undefined}
                data-active={current || undefined}
                onClick={() => onNavigate?.(sec.label)}
              >
                <AfIcon name={sec.icon} size={16} />
                {sec.dot ? <span className="af-sc-rail__dot" aria-hidden="true" /> : null}
              </button>
            </AfTooltip>
          );
        })}
        <AfTooltip content="Search (⌘K)" side="right">
          <button
            type="button"
            className="af-sc-rail__btn"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
          >
            <AfIcon name="search" size={16} />
          </button>
        </AfTooltip>
        <span className="af-sc-rail__spacer" aria-hidden="true" />
        <AfDropdownMenu items={userMenuItems} side="right" align="end" width={212}>
          <button type="button" className="af-sc-rail__avatar" aria-label={user.name} title={user.name}>
            {user.avatar ? <img src={user.avatar} alt="" /> : initialsOfName(user.name)}
          </button>
        </AfDropdownMenu>
      </nav>
    );
  };

  const renderRailChatSubcolumn = () => {
    if (!rail) return null;
    const projectChoices = ["All projects", ...projects];
    const filtered =
      rail.selectedProject === "All projects"
        ? threads
        : threads.filter((t) => t.project === rail.selectedProject);

    const railPinned = filtered.filter((t) => t.pinned);
    const railLoose = filtered.filter((t) => !t.pinned && !t.project);

    const switcherItems: AfMenuItem[] = projectChoices.map((proj) => ({
      id: `proj-${proj}`,
      type: "radio",
      checked: rail.selectedProject === proj,
      label: proj,
      onSelect: () => {
        rail.onSelectProject(proj);
        onNavigate?.(proj);
      },
    }));

    return (
      <div className="af-sc-chatcol" style={{ width: railChatWidth }}>
        <div className="af-sc-chatcol__head">
          <AfDropdownMenu items={switcherItems} side="bottom" align="start" width={200}>
            <button type="button" className="af-sc-projswitch" aria-label="Switch project">
              <span>{rail.selectedProject}</span>
              <AfIcon name="chevronDown" size={12} />
            </button>
          </AfDropdownMenu>
          <AfTooltip content="Search chats (⌘K)" side="bottom">
            <button
              type="button"
              className="af-sc-icon-btn"
              aria-label="Search chats"
              onClick={() => setPaletteOpen(true)}
            >
              <AfIcon name="search" size={14} />
            </button>
          </AfTooltip>
        </div>

        <div className="af-sc-chatcol__list">
          <button
            type="button"
            className="af-sc-nav-btn af-sc-chatcol__new"
            onClick={() => onNavigate?.("New chat")}
          >
            <span className="af-sc-nav-btn__main">
              <AfIcon name="pencil" size={14} />
              <span>New chat</span>
            </span>
          </button>

          {hideThreads || filtered.length === 0 ? (
            <p className="af-sc-chatcol__empty">{rail.emptyText ?? "No chats yet"}</p>
          ) : rail.selectedProject === "All projects" ? (
            <>
              {railPinned.length > 0 ? (
                <div className="af-sc-side__group">
                  <span className="af-sc-sec-label">Pinned</span>
                  {railPinned.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="af-sc-thread-btn"
                      data-active={activeThreadId === t.id || undefined}
                      onClick={() => {
                        onSelectThread?.(t);
                        onNavigate?.(t.title);
                      }}
                    >
                      <span className="af-sc-thread-btn__label">{t.title}</span>
                      {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {projects.length > 0 ? (
                <div className="af-sc-side__group">
                  <span className="af-sc-sec-label">Projects</span>
                  {projects.map((proj) => {
                    const expanded = Boolean(openProjects[proj]);
                    const projThreads = threads.filter((t) => t.project === proj && !t.pinned);
                    return (
                      <div key={proj} className="af-sc-proj-block">
                        <button
                          type="button"
                          className="af-sc-nav-btn"
                          onClick={() => {
                            setOpenProjects((p) => ({ ...p, [proj]: !p[proj] }));
                            onNavigate?.(proj);
                          }}
                        >
                          <span className="af-sc-nav-btn__main">
                            <AfIcon name={expanded ? "folderOpen" : "folder"} size={14} />
                            <span>{proj}</span>
                          </span>
                        </button>
                        {expanded && projThreads.length > 0 ? (
                          <div className="af-sc-proj-threads">
                            {projThreads.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className="af-sc-thread-btn"
                                data-active={activeThreadId === t.id || undefined}
                                onClick={() => {
                                  onSelectThread?.(t);
                                  onNavigate?.(t.title);
                                }}
                              >
                                <span className="af-sc-thread-btn__label">{t.title}</span>
                                {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {railLoose.length > 0 ? (
                <div className="af-sc-side__group">
                  <span className="af-sc-sec-label">Chats</span>
                  {railLoose.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="af-sc-thread-btn"
                      data-active={activeThreadId === t.id || undefined}
                      onClick={() => {
                        onSelectThread?.(t);
                        onNavigate?.(t.title);
                      }}
                    >
                      <span className="af-sc-thread-btn__label">{t.title}</span>
                      {t.dot ? <span className="af-sc-thread-dot" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className="af-sc-chatcol__item"
                data-active={activeThreadId === t.id || undefined}
                onClick={() => {
                  onSelectThread?.(t);
                  onNavigate?.(t.title);
                }}
              >
                <span className="af-sc-chatcol__title">{t.title}</span>
                {t.meta ? <span className="af-sc-chatcol__meta">{t.meta}</span> : null}
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("af-sc-app", className)} data-rail={rail ? "" : undefined} {...rest}>
      {rail ? (
        <div className="af-sc-rail-wrap" data-desktop-only="">
          {renderRailIconBar()}
        </div>
      ) : !sidebarCollapsed ? (
        <aside className="af-sc-side" data-desktop-only="" aria-label="Sidebar">
          {renderStandardSidebar()}
        </aside>
      ) : null}

      <AfDrawer
        open={leftDrawerOpen}
        onOpenChange={setLeftDrawerOpen}
        placement="left"
        width={rail ? 292 : 256}
        title={workspace}
      >
        {rail ? (
          <div className="af-sc-drawer-rail">
            {renderRailIconBar()}
            {renderRailChatSubcolumn()}
          </div>
        ) : (
          renderStandardSidebar()
        )}
      </AfDrawer>

      <AfDrawer
        open={rightDrawerOpen}
        onOpenChange={setRightDrawerOpen}
        placement="right"
        width={360}
        title={activeTab?.title ?? "Workspace"}
      >
        {renderTabContent(activeTab)}
      </AfDrawer>

      <AfCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        placeholder={`Search ${workspace}…`}
      />

      <div className="af-sc-stage">
        <div className="af-sc-main" data-with-chatcol={rail ? "" : undefined}>
          {rail ? (
            <>
              <div className="af-sc-chatcol-desktop" data-desktop-only="">
                {renderRailChatSubcolumn()}
              </div>
              <div
                role="separator"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label="Resize chat column"
                className="af-sc-resizer"
                data-desktop-only=""
                onPointerDown={(e) => {
                  e.preventDefault();
                  startResizeChatCol(e.clientX);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setRailChatWidth((w) => Math.max(176, w - 12));
                  if (e.key === "ArrowRight") setRailChatWidth((w) => Math.min(310, w + 12));
                }}
              />
            </>
          ) : null}

          <div className="af-sc-main__col">
            {mainHeader === false ? (
              <div className="af-sc-float-corners">
                <div className="af-sc-float-corners__left">
                  {sidebarCollapsed && !rail ? (
                    <AfTooltip content="Open sidebar" side="right">
                      <button
                        type="button"
                        className="af-sc-icon-btn"
                        aria-label="Open sidebar"
                        onClick={() => setSidebarCollapsed(false)}
                      >
                        <AfIcon name="panelLeft" size={15} />
                      </button>
                    </AfTooltip>
                  ) : null}
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-mobile-only"
                    aria-label="Open navigation"
                    onClick={() => setLeftDrawerOpen(true)}
                  >
                    <AfIcon name="menu" size={15} />
                  </button>
                </div>
                {!workOpen ? (
                  <AfTooltip content={workAreaOpenLabel} side="left">
                    <button
                      ref={openWorkBtnRef}
                      type="button"
                      className="af-sc-icon-btn"
                      aria-label={workAreaOpenLabel}
                      onClick={() => setWorkOpen(true)}
                    >
                      <AfIcon name="panelRight" size={15} />
                    </button>
                  </AfTooltip>
                ) : null}
              </div>
            ) : mainHeader ? (
              <header className="af-sc-topbar">
                <div className="af-sc-topbar__left">
                  {sidebarCollapsed && !rail ? (
                    <AfTooltip content="Open sidebar" side="right">
                      <button
                        type="button"
                        className="af-sc-icon-btn"
                        aria-label="Open sidebar"
                        onClick={() => setSidebarCollapsed(false)}
                      >
                        <AfIcon name="panelLeft" size={15} />
                      </button>
                    </AfTooltip>
                  ) : null}
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-mobile-only"
                    aria-label="Open navigation"
                    onClick={() => setLeftDrawerOpen(true)}
                  >
                    <AfIcon name="menu" size={15} />
                  </button>
                  <div className="af-sc-topbar__title">{mainHeader.title}</div>
                </div>
                <div className="af-sc-topbar__right">
                  {mainHeader.actions}
                  {!workOpen ? (
                    <AfTooltip content={workAreaOpenLabel} side="bottom">
                      <button
                        ref={openWorkBtnRef}
                        type="button"
                        className="af-sc-icon-btn"
                        aria-label={workAreaOpenLabel}
                        onClick={() => setWorkOpen(true)}
                      >
                        <AfIcon name="panelRight" size={15} />
                      </button>
                    </AfTooltip>
                  ) : null}
                </div>
              </header>
            ) : null}

            <div className="af-sc-main__body">{children}</div>
          </div>
        </div>

        {workOpen ? (
          <aside
            className="af-sc-work"
            data-expanded={workExpanded || undefined}
            data-desktop-only=""
            aria-label="Work area"
          >
            <div className="af-sc-work__bar">
              <div className="af-sc-tabs" role="tablist" aria-label="Work area tabs">
                {tabs.map((tab, idx) => {
                  const selected = tab.id === activeTab?.id;
                  return (
                    <div key={tab.id} className="af-sc-tab" data-active={selected || undefined}>
                      <button
                        ref={(el) => {
                          tabBtnRefs.current[tab.id] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        className="af-sc-tab__btn"
                        onClick={() => setActiveTab(tab.id)}
                        onKeyDown={(e) => handleTabKeyDown(e, idx, tab)}
                      >
                        <AfIcon name={artifactKindIcon(tab.kind)} size={12} />
                        <span className="af-sc-tab__label">{tab.title}</span>
                      </button>
                      {tab.badge !== undefined && tab.badge > 0 ? (
                        <span
                          className="af-sc-tab__badge"
                          aria-hidden="true"
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.badge}
                        </span>
                      ) : null}
                      {tab.closable !== false ? (
                        <button
                          type="button"
                          className="af-sc-tab__close"
                          aria-label={`Close ${tab.title}`}
                          onClick={() => closeWorkTab(tab.id)}
                        >
                          <AfIcon name="x" size={10} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                <AfTooltip content="New tab" side="bottom">
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-icon-btn--sm"
                    aria-label="New tab"
                    onClick={addNewBlankTab}
                  >
                    <AfIcon name="plus" size={13} />
                  </button>
                </AfTooltip>
              </div>
              <div className="af-sc-work__actions">
                <AfTooltip content={workExpanded ? "Restore width" : "Expand"} side="bottom">
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-icon-btn--sm"
                    aria-label={workExpanded ? "Restore work area width" : "Expand work area"}
                    onClick={() => setWorkExpanded((v) => !v)}
                  >
                    <AfIcon name={workExpanded ? "minimize" : "maximize"} size={12} />
                  </button>
                </AfTooltip>
                <AfTooltip content="Close work area" side="bottom">
                  <button
                    type="button"
                    className="af-sc-icon-btn af-sc-icon-btn--sm"
                    aria-label="Close work area"
                    onClick={() => {
                      setWorkOpen(false);
                      window.requestAnimationFrame(() => openWorkBtnRef.current?.focus());
                    }}
                  >
                    <AfIcon name="panelRight" size={13} />
                  </button>
                </AfTooltip>
              </div>
            </div>
            <div className="af-sc-work__body">{renderTabContent(activeTab)}</div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
