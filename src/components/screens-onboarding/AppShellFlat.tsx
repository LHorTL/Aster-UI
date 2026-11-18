import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfPortal, cn } from "../../primitives";
import { AfInput } from "../controls/Input";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfModal } from "../overlay/Modal";
import { AfTooltip } from "../overlay/Tooltip";

export type AfShellNavItem = {
  label: string;
  icon?: AffectIconKey | ReactNode;
  badge?: string | number;
};

export type AfShellChat = {
  id: string;
  title: string;
  folder?: string;
  pinned?: boolean;
  unread?: boolean;
};

export type AfShellGroup = {
  label: string;
  items: { label: string; icon?: AffectIconKey | ReactNode }[];
};

export type AfShellUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type AfWorkAreaArtifactKind =
  | "new"
  | "terminal"
  | "document"
  | "sheet"
  | "code"
  | "browser"
  | "notes"
  | "custom";

export type AfWorkAreaArtifact = {
  id: string;
  title: string;
  kind: Exclude<AfWorkAreaArtifactKind, "new" | "custom">;
  subtitle?: string;
  mark?: string;
  content?: ReactNode;
};

export type AfWorkAreaTab = {
  id: string;
  title: string;
  kind: AfWorkAreaArtifactKind;
  icon?: ReactNode;
  content?: ReactNode;
};

export type AfWorkAreaOptions = {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  tabs?: AfWorkAreaTab[];
  defaultActiveTabId?: string;
  activeTabId?: string;
  onActiveTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onNewTab?: () => void;
  allowNewTab?: boolean;
  width?: number;
  suggestions?: AfWorkAreaArtifact[];
};

export type AfAppShellFlatProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** 外壳布局模式：`"flat"` 单发丝线全贴合（默认），`"inset"` 灰底内嵌圆角卡片。 */
  layout?: "flat" | "inset";
  /** 中央主页面顶栏配置；传 `false` 隐藏主区顶栏（`inset` 模式下缺省隐藏）。 */
  header?: { title: ReactNode; actions?: ReactNode } | false;
  /** 主页面区内容；缺省展示与 affectUI 一致的居中占位提示。 */
  children?: ReactNode;
  /** 当前打开的菜单项、项目或会话名称。 */
  active?: string;
  /** 点击菜单项、项目或切换导航时回调。 */
  onNavigate?: (label: string) => void;
  /** 工作区名称（首字母作为方形徽标），默认 `"Acme"`。 */
  workspace?: string;
  /** 侧栏底部账号信息及多级账户菜单，默认 `{ name: "Alex Morgan" }`。 */
  user?: AfShellUser;
  /** 主菜单项列表，默认 `New chat`、`Folders`、`Integrations`。 */
  nav?: AfShellNavItem[];
  /** 项目列表；与 `chats` 同传时自动变为可折叠会话文件夹。 */
  projects?: string[];
  /** 侧栏会话列表（支持项目文件夹归档、Pinned、悬停图钉、`⋯` 管理菜单与拖拽移动）。 */
  chats?: AfShellChat[];
  /** 点击会话时触发（未传时回退调用 `onNavigate(chat.title)`）。 */
  onOpenChat?: (chat: AfShellChat) => void;
  /** 替代 `projects` 的自定义侧栏分组列表（如 Tools / Pipelines）。 */
  groups?: AfShellGroup[];
  /** 是否显示侧栏底部的 New in Acme 与 Getting started 卡片，默认 `true`。 */
  sideCards?: boolean;
  /** 右侧多标签工作区（传 `false` 可关闭）。 */
  workArea?: AfWorkAreaOptions | boolean;
  /** 右侧工作区极简模式单页内容（与 `panelTitle` 配合生成一个标签）。 */
  panel?: ReactNode;
  /** `panel` 对应的标签标题，默认 `"Workspace"`。 */
  panelTitle?: string;
};

/* ---------- Exact affectUI Shell SVGs ---------- */

export function ShellPanelLeftSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12C2 8.31087 2 6.4663 2.81382 5.15877C3.1149 4.67502 3.48891 4.25427 3.91891 3.91554C5.08116 3 6.72077 3 10 3H14C17.2792 3 18.9188 3 20.0811 3.91554C20.5111 4.25427 20.8851 4.67502 21.1862 5.15877C22 6.4663 22 8.31087 22 12C22 15.6891 22 17.5337 21.1862 18.8412C20.8851 19.325 20.5111 19.7457 20.0811 20.0845C18.9188 21 17.2792 21 14 21H10C6.72077 21 5.08116 21 3.91891 20.0845C3.48891 19.7457 3.1149 19.325 2.81382 18.8412C2 17.5337 2 15.6891 2 12Z" />
      <path d="M9.5 3L9.5 21" />
      <path d="M5 7H6M5 10H6" />
    </svg>
  );
}

export function ShellPanelRightSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12C2 8.31087 2 6.4663 2.81382 5.15877C3.1149 4.67502 3.48891 4.25427 3.91891 3.91554C5.08116 3 6.72077 3 10 3H14C17.2792 3 18.9188 3 20.0811 3.91554C20.5111 4.25427 20.8851 4.67502 21.1862 5.15877C22 6.4663 22 8.31087 22 12C22 15.6891 22 17.5337 21.1862 18.8412C20.8851 19.325 20.5111 19.7457 20.0811 20.0845C18.9188 21 17.2792 21 14 21H10C6.72077 21 5.08116 21 3.91891 20.0845C3.48891 19.7457 3.1149 19.325 2.81382 18.8412C2 17.5337 2 15.6891 2 12Z" />
      <path d="M14.5 3L14.5 21" />
      <path d="M18 7H19M18 10H19" />
    </svg>
  );
}

export function ShellProjectFolderSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 20V8.87695C2.5 7.58945 2.5 6.9457 2.78533 6.47048C2.9541 6.18939 3.18939 5.9541 3.47048 5.78533C3.9457 5.5 4.59449 5.5 5.89206 5.5C6.52339 5.5 6.83906 5.5 7.12612 5.58819C7.31759 5.64702 7.49914 5.73428 7.66469 5.84705C7.91289 6.01611 8.10859 6.26074 8.5 6.75C8.89141 7.23926 9.08711 7.48389 9.33531 7.65295C9.50086 7.76572 9.68241 7.85298 9.87388 7.91181C10.1609 8 10.4742 8 11.1008 8H15C16.4045 8 17.1067 8 17.6111 8.33706C17.8295 8.48298 18.017 8.67048 18.1629 8.88886C18.5 9.39331 18.5 10.0955 18.5 11.5" />
      <path d="M4.42028 14.0144L3.63368 16.0144C2.65618 18.4998 2.16743 19.7425 2.7524 20.6213C3.33737 21.5 4.65337 21.5 7.28537 21.5H15.1903C16.4249 21.5 17.0422 21.5 17.5295 21.1795C18.0169 20.859 18.2702 20.2865 18.7769 19.1415L19.6618 17.1415C20.7866 14.5992 21.349 13.3281 20.7679 12.4141C20.1868 11.5 18.8163 11.5 16.0752 11.5H8.07196C6.78232 11.5 6.1375 11.5 5.63811 11.8439C5.13872 12.1877 4.89924 12.7966 4.42028 14.0144Z" />
      <path d="M11.5 4.51456C12.4151 3.28409 13.6662 2.55594 15.5125 2.50161C16.1155 2.48386 16.7152 2.61395 17.2682 2.85544C18.5748 3.42601 19.4185 4.15644 20 5.5L21.5 3" />
    </svg>
  );
}

function ComposeChatSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3H8C5.17157 3 3.75736 3 2.87868 3.87868C2 4.75736 2 6.17157 2 9V15C2 17.8284 2 19.2426 2.87868 20.1213C3.75736 21 5.17157 21 8 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15V12" />
      <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L13.5 13.5L9.5 14.5L10.5 10.5L18.5 2.5Z" />
    </svg>
  );
}

function PlaceholderPageSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H7C5.34315 2 4 3.34315 4 5V19C4 20.6569 5.34315 22 7 22H17C18.6569 22 20 20.6569 20 19V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M8 13H16M8 17H13" />
    </svg>
  );
}

function ShareNodesSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" />
    </svg>
  );
}

const DEFAULT_NAV: AfShellNavItem[] = [
  { label: "New chat", icon: <ComposeChatSvg /> },
  { label: "Folders", icon: "folder" },
  { label: "Integrations", icon: "grid" },
];

const DEFAULT_PROJECTS_STATIC = ["Q3 Campaign", "Brand assets", "Hiring", "Research"];

const DEFAULT_SUGGESTIONS: AfWorkAreaArtifact[] = [
  {
    id: "art-geo",
    title: "GEO: Generative Engine Optimization",
    kind: "document",
    subtitle: "arxiv.org",
    mark: "A",
  },
  {
    id: "art-tokens",
    title: "Design tokens – naming guide",
    kind: "document",
    subtitle: "notion.so",
    mark: "N",
  },
  {
    id: "art-checklist",
    title: "Q3 launch checklist",
    kind: "code",
    subtitle: "linear.app",
    mark: "L",
  },
  {
    id: "art-budget",
    title: "Q3 launch budget",
    kind: "sheet",
    subtitle: "sheets.google.com",
    mark: "S",
  },
];

const CHANGELOG_CARDS = [
  { id: "shared-folders", title: "Shared folders" },
  { id: "work-area-tabs", title: "Pinned work-area tabs" },
];

const BUDGET_ROWS: { channel: string; clicks: string; signups: string; cac: string; spend: string; total?: boolean }[] = [
  { channel: "Paid search", clicks: "18,420", signups: "612", cac: "$38.40", spend: "$23,500" },
  { channel: "Content & SEO", clicks: "42,910", signups: "1,140", cac: "$12.10", spend: "$13,800" },
  { channel: "Partner webinars", clicks: "6,280", signups: "294", cac: "$31.20", spend: "$9,172" },
  { channel: "Outbound", clicks: "3,940", signups: "148", cac: "$54.00", spend: "$7,992" },
  { channel: "Developer events", clicks: "5,110", signups: "215", cac: "$44.65", spend: "$9,600" },
  { channel: "Total", clicks: "76,660", signups: "2,409", cac: "$26.59", spend: "$64,064", total: true },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function iconForKind(kind: AfWorkAreaArtifactKind): AffectIconKey {
  switch (kind) {
    case "terminal":
      return "terminal";
    case "sheet":
      return "kanban";
    case "code":
      return "code";
    case "browser":
    case "new":
      return "globe";
    case "notes":
      return "file";
    case "document":
      return "file";
    default:
      return "plus";
  }
}

/* ---------- Reusable Sidebar Stacked Cards (New in Acme + Getting started) ---------- */

export function AfShellSidebarCards({
  workspace,
  onSelectChangelog,
  onSelectGettingStarted,
}: {
  workspace: string;
  onSelectChangelog?: () => void;
  onSelectGettingStarted?: () => void;
}) {
  const [deckIndex, setDeckIndex] = useState(0);
  const currentCard = CHANGELOG_CARDS[deckIndex];
  const hasBackCard = deckIndex + 1 < CHANGELOG_CARDS.length;

  return (
    <div className="af-asf__cards">
      {currentCard ? (
        <div className="af-asf__deck">
          {hasBackCard ? (
            <div className="af-asf__deck-back" aria-hidden="true">
              <span className="af-asf__deck-tag">New in {workspace}</span>
              <span className="af-asf__deck-x">
                <AfIcon name="x" size={10} />
              </span>
            </div>
          ) : null}
          <div className="af-asf__deck-front">
            <div className="af-asf__deck-head">
              <span className="af-asf__deck-tag">New in {workspace}</span>
              <button
                type="button"
                className="af-asf__mini-btn"
                aria-label={`Dismiss ${currentCard.title}`}
                onClick={() => setDeckIndex((i) => i + 1)}
              >
                <AfIcon name="x" size={10} />
              </button>
            </div>
            <div className="af-asf__deck-title">{currentCard.title}</div>
            <button
              type="button"
              className="af-asf__deck-link"
              onClick={() => onSelectChangelog?.()}
            >
              <span>Full changelog</span>
              <AfIcon name="chevronRight" size={11} />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="af-asf__gs-card"
        onClick={() => onSelectGettingStarted?.()}
      >
        <div className="af-asf__gs-top">
          <span>Getting started</span>
          <AfIcon name="chevronRight" size={11} />
        </div>
        <div className="af-asf__gs-sub">
          <span>13% done</span>
          <span aria-hidden="true">·</span>
          <em>Great start!</em>
        </div>
        <div className="af-asf__gs-track" aria-hidden="true">
          <div className="af-asf__gs-fill" style={{ width: "13%" }} />
        </div>
      </button>
    </div>
  );
}

/** 三栏应用工作台外壳（App Shell Flat / App Shell Inset）：可折叠工作区侧栏 + 主画布 + 右侧多标签工作区。 */
export function AfAppShellFlat(props: AfAppShellFlatProps = {}) {
  const {
    layout = "flat",
    header,
    children,
    active: activeProp,
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan", email: "alex@acme.com" },
    nav = DEFAULT_NAV,
    projects: projectsProp,
    chats: chatsProp,
    onOpenChat,
    groups,
    sideCards = true,
    workArea = true,
    panel,
    panelTitle = "Workspace",
    className,
    ...rest
  } = props;

  const showMainHeader = header === undefined ? layout === "flat" : header !== false;
  const hasExplicitChats = chatsProp !== undefined;
  const projects = projectsProp ?? (groups ? [] : DEFAULT_PROJECTS_STATIC);

  const [internalActive, setInternalActive] = useState(activeProp ?? nav[0]?.label ?? "New chat");
  const currentActive = activeProp ?? internalActive;

  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [chatItems, setChatItems] = useState<AfShellChat[]>(() => chatsProp ?? []);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    projects.forEach((p, idx) => {
      map[p] = idx === 0;
    });
    return map;
  });
  const [dragChatId, setDragChatId] = useState<string | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [chatGhost, setChatGhost] = useState<{ title: string; x: number; y: number } | null>(null);
  const chatDragCleanupRef = useRef<(() => void) | null>(null);
  const [renamingChat, setRenamingChat] = useState<AfShellChat | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => () => chatDragCleanupRef.current?.(), []);

  // Work Area state
  const workOpts: AfWorkAreaOptions | null =
    workArea === false
      ? null
      : typeof workArea === "object"
        ? workArea
        : panel
          ? {
              defaultOpen: true,
              tabs: [{ id: "panel-tab", title: panelTitle, kind: "custom", content: panel }],
            }
          : { defaultOpen: true };

  const initialTabs: AfWorkAreaTab[] = useMemo(() => {
    if (!workOpts) return [];
    if (workOpts.tabs && workOpts.tabs.length > 0) return workOpts.tabs;
    return [{ id: "tab-new-1", title: "New tab", kind: "new" }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [internalPanelOpen, setInternalPanelOpen] = useState<boolean>(
    workOpts ? workOpts.defaultOpen !== false : false,
  );
  const panelOpen = workOpts?.open !== undefined ? workOpts.open : internalPanelOpen;
  const setPanelOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(panelOpen) : next;
    setInternalPanelOpen(resolved);
    workOpts?.onOpenChange?.(resolved);
  };

  const [panelExpanded] = useState(false);
  const [internalTabs, setInternalTabs] = useState<AfWorkAreaTab[]>(initialTabs);
  const isTabsControlled = Boolean(
    workOpts?.tabs && (workOpts.activeTabId !== undefined || workOpts.onTabClose || workOpts.onActiveTabChange),
  );
  const tabs = isTabsControlled ? (workOpts?.tabs ?? []) : internalTabs;

  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(
    workOpts?.defaultActiveTabId ?? initialTabs[0]?.id ?? "tab-new-1",
  );
  const activeTabId = workOpts?.activeTabId !== undefined ? workOpts.activeTabId : internalActiveTabId;
  const setActiveTabId = (id: string) => {
    setInternalActiveTabId(id);
    workOpts?.onActiveTabChange?.(id);
  };

  const [urlDraft, setUrlDraft] = useState("");
  const [notesText, setNotesText] = useState(
    "Q3 Launch checklist:\n- Finalize pricing FAQ copy with Finance\n- Verify rate-limit webhooks in staging\n- Publish migration guide before Tuesday",
  );
  const [language, setLanguage] = useState("English");
  const [appearance, setAppearance] = useState("System");

  const suggestions = workOpts?.suggestions ?? DEFAULT_SUGGESTIONS;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const selectRoute = (label: string) => {
    setInternalActive(label);
    onNavigate?.(label);
  };

  const openArtifactInTab = (artifact: AfWorkAreaArtifact) => {
    setPanelOpen(true);
    const existing = tabs.find((t) => t.id === artifact.id);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const nextTab: AfWorkAreaTab = {
      id: artifact.id,
      title: artifact.title,
      kind: artifact.kind,
      content: artifact.content,
    };
    setInternalTabs((prev) => {
      if (prev.length === 1 && prev[0]?.kind === "new") {
        return [nextTab];
      }
      return [...prev, nextTab];
    });
    setActiveTabId(nextTab.id);
  };

  const addBlankTab = (kind: AfWorkAreaArtifactKind = "new", title = "New tab") => {
    if (workOpts?.onNewTab) {
      workOpts.onNewTab();
      setPanelOpen(true);
      return;
    }
    const id = `tab-${kind}-${Date.now()}`;
    const created: AfWorkAreaTab = { id, title, kind };
    setInternalTabs((prev) => [...prev, created]);
    setActiveTabId(id);
    setPanelOpen(true);
  };

  const closeTab = (id: string) => {
    if (workOpts?.onTabClose) {
      workOpts.onTabClose(id);
      return;
    }
    setInternalTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fallback: AfWorkAreaTab = { id: `tab-new-${Date.now()}`, title: "New tab", kind: "new" };
        setActiveTabId(fallback.id);
        return [fallback];
      }
      if (activeTabId === id) {
        setActiveTabId(next[next.length - 1]!.id);
      }
      return next;
    });
  };

  const toggleChatPin = (id: string) => {
    setChatItems((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  };

  const buildChatMenu = (chat: AfShellChat): AfMenuItem[] => [
    {
      id: "rename",
      label: "Rename",
      icon: "pencil",
      onSelect: () => {
        setRenamingChat(chat);
        setRenameDraft(chat.title);
      },
    },
    {
      id: "pin",
      label: chat.pinned ? "Unpin chat" : "Pin chat",
      icon: "bookmark",
      onSelect: () => toggleChatPin(chat.id),
    },
    {
      id: "unread",
      label: chat.unread ? "Mark as read" : "Mark as unread",
      icon: "mail",
      onSelect: () =>
        setChatItems((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: !c.unread } : c))),
    },
    {
      id: "project",
      label: "Move to project",
      icon: "folder",
      submenu: [
        ...projects.map((proj) => ({
          id: `mv-${proj}`,
          label: proj,
          onSelect: () =>
            setChatItems((prev) =>
              prev.map((c) => (c.id === chat.id ? { ...c, folder: proj, pinned: false } : c)),
            ),
        })),
        { type: "separator" as const },
        {
          id: "mv-none",
          label: "No project",
          onSelect: () =>
            setChatItems((prev) => prev.map((c) => (c.id === chat.id ? { ...c, folder: undefined } : c))),
        },
      ],
    },
    { type: "separator" },
    { id: "share", label: "Share", icon: "share", onSelect: () => onNavigate?.(`Share:${chat.title}`) },
    { id: "copy", label: "Copy link", icon: "copy", onSelect: () => onNavigate?.(`Copy:${chat.title}`) },
    { id: "newwin", label: "Open in new window", icon: "external", onSelect: () => onNavigate?.(chat.title) },
    { type: "separator" },
    {
      id: "archive",
      label: "Archive",
      icon: "trash",
      danger: true,
      onSelect: () => setChatItems((prev) => prev.filter((c) => c.id !== chat.id)),
    },
  ];

  const workspaceMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "invite", label: "Invite people", icon: "users", onSelect: () => selectRoute("Invite people") },
      { type: "separator" },
      { id: "ws-settings", label: "Workspace settings", icon: "settings", onSelect: () => selectRoute("Workspace settings") },
      { id: "analytics", label: "Analytics", icon: "chart", onSelect: () => selectRoute("Analytics") },
      { id: "billing", label: "Billing", icon: "creditCard", onSelect: () => selectRoute("Billing") },
      { id: "usage", label: "Usage & limits", icon: "sliders", onSelect: () => selectRoute("Usage & limits") },
      { id: "members", label: "Members", icon: "user", onSelect: () => selectRoute("Members") },
      { type: "separator" },
      { id: "learn", label: "Learn more", icon: "external", onSelect: () => selectRoute("Learn more") },
      {
        id: "switch-ws",
        label: "Switch workspace",
        icon: "layers",
        submenu: [
          { id: "ws-acme", type: "radio", checked: true, label: workspace },
          { id: "ws-labs", type: "radio", checked: false, label: `${workspace} Staging`, onSelect: () => selectRoute(`${workspace} Staging`) },
          { type: "separator" },
          { id: "ws-create", label: "Create workspace…", icon: "plus", onSelect: () => selectRoute("Create workspace") },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace],
  );

  const userMenuItems = useMemo<AfMenuItem[]>(
    () => [
      {
        type: "label",
        label: `${user.name}${user.email ? ` · ${user.email}` : ""}`,
      },
      {
        id: "lang",
        label: "Language",
        icon: "globe",
        submenu: ["English", "简体中文", "日本語"].map((lang) => ({
          id: `lang-${lang}`,
          type: "radio" as const,
          checked: language === lang,
          label: lang,
          onSelect: () => setLanguage(lang),
        })),
      },
      {
        id: "theme",
        label: "Appearance",
        icon: "sun",
        submenu: ["System", "Light", "Dark"].map((mode) => ({
          id: `mode-${mode}`,
          type: "radio" as const,
          checked: appearance === mode,
          label: mode,
          onSelect: () => setAppearance(mode),
        })),
      },
      { id: "u-int", label: "Integrations", icon: "grid", onSelect: () => selectRoute("Integrations") },
      { id: "u-settings", label: "Settings", icon: "settings", kbd: "⌘,", onSelect: () => selectRoute("Settings") },
      { id: "u-apps", label: "Desktop & mobile apps", icon: "download", onSelect: () => selectRoute("Apps") },
      { type: "separator" },
      { id: "u-changelog", label: "Changelog", icon: "sparkle", onSelect: () => selectRoute("Changelog") },
      { id: "u-help", label: "Help & support", icon: "help", onSelect: () => selectRoute("Help") },
      { type: "separator" },
      { id: "u-logout", label: "Log out", icon: "arrowLeft", onSelect: () => selectRoute("Log out") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appearance, language, user.email, user.name],
  );

  const pageMoreItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "p-copy", label: "Copy page link", icon: "link", kbd: "⌘L" },
      { id: "p-dup", label: "Duplicate view", icon: "copy" },
      { id: "p-export", label: "Export as Markdown", icon: "download" },
      { type: "separator" },
      {
        id: "p-work",
        label: panelOpen ? "Hide work area" : "Show work area",
        icon: "panelRight",
        onSelect: () => setPanelOpen((v) => !v),
      },
    ],
    [panelOpen],
  );

  const paletteCommands = useMemo<AfCommand[]>(
    () => [
      ...nav.map((item) => ({
        id: `nav-${item.label}`,
        group: "Navigation",
        label: item.label,
        icon: typeof item.icon === "string" ? item.icon : ("message" as AffectIconKey),
        onSelect: () => selectRoute(item.label),
      })),
      ...suggestions.map((art) => ({
        id: `open-${art.id}`,
        group: "Suggested",
        label: `Open ${art.title}`,
        icon: iconForKind(art.kind),
        onSelect: () => openArtifactInTab(art),
      })),
      ...chatItems.map((c) => ({
        id: `chat-${c.id}`,
        group: "Chats",
        label: c.title,
        icon: "message" as AffectIconKey,
        onSelect: () => {
          setInternalActive(c.title);
          if (onOpenChat) onOpenChat(c);
          else onNavigate?.(c.title);
        },
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatItems, nav, suggestions],
  );

  const pinnedChats = chatItems.filter((c) => c.pinned && !c.folder);
  const looseChats = chatItems.filter((c) => !c.pinned && !c.folder);

  const startChatPointerDrag = (chat: AfShellChat, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    if ((e.target as HTMLElement | null)?.closest(".af-asf__chat-tools")) return;
    const rowEl = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false;
    let currentFolder: string | null = null;

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      if (active && rowEl.hasPointerCapture?.(pointerId)) {
        try {
          rowEl.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
      }
      setDragChatId(null);
      setDropFolder(null);
      setChatGhost(null);
      chatDragCleanupRef.current = null;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
        active = true;
        try {
          rowEl.setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        setDragChatId(chat.id);
      }
      ev.preventDefault();
      setChatGhost({ title: chat.title, x: ev.clientX + 10, y: ev.clientY - 14 });
      let hitFolder: string | null = null;
      if (typeof document.elementsFromPoint === "function") {
        for (const node of document.elementsFromPoint(ev.clientX, ev.clientY)) {
          const folderBtn = (node as HTMLElement | null)?.closest?.("[data-asf-folder]") as HTMLElement | null;
          const folderName = folderBtn?.getAttribute("data-asf-folder");
          if (folderName) {
            hitFolder = folderName;
            break;
          }
        }
      }
      if (hitFolder !== currentFolder) {
        currentFolder = hitFolder;
        setDropFolder(hitFolder);
      }
    };

    const finish = (cancelled: boolean) => {
      const wasActive = active;
      const targetFolder = currentFolder;
      cleanup();
      if (!wasActive) return;
      const suppressClick = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
        window.removeEventListener("click", suppressClick, true);
      };
      window.addEventListener("click", suppressClick, true);
      window.setTimeout(() => window.removeEventListener("click", suppressClick, true), 80);
      if (!cancelled && targetFolder) {
        setChatItems((prev) =>
          prev.map((c) => (c.id === chat.id ? { ...c, folder: targetFolder, pinned: false } : c)),
        );
        setOpenFolders((prev) => ({ ...prev, [targetFolder]: true }));
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(false);
    };
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(true);
    };
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === "Escape" && active) {
        ev.preventDefault();
        ev.stopPropagation();
        finish(true);
      }
    };

    chatDragCleanupRef.current?.();
    chatDragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  };

  const renderChatRow = (chat: AfShellChat) => {
    const isActive = currentActive === chat.title;
    return (
      <div
        key={chat.id}
        className="af-asf__chat-row"
        data-active={isActive || undefined}
        data-pinned={chat.pinned || undefined}
        data-af-dragging={dragChatId === chat.id ? "true" : undefined}
        onPointerDown={(e) => startChatPointerDrag(chat, e)}
      >
        <button
          type="button"
          className="af-asf__chat-btn"
          onClick={() => {
            setInternalActive(chat.title);
            if (chat.unread) {
              setChatItems((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: false } : c)));
            }
            if (onOpenChat) onOpenChat(chat);
            else onNavigate?.(chat.title);
          }}
        >
          {chat.unread ? <span className="af-asf__unread-dot" aria-label="Unread" /> : null}
          <span className="af-asf__nav-label">{chat.title}</span>
        </button>
        <div className="af-asf__chat-tools">
          <button
            type="button"
            className="af-asf__mini-btn"
            data-pinned={chat.pinned || undefined}
            aria-label={chat.pinned ? `Unpin ${chat.title}` : `Pin ${chat.title}`}
            onClick={() => toggleChatPin(chat.id)}
          >
            <AfIcon name="bookmark" size={11} />
          </button>
          <AfDropdownMenu items={buildChatMenu(chat)} side="bottom" align="end">
            <button type="button" className="af-asf__mini-btn" aria-label={`More actions for ${chat.title}`}>
              <AfIcon name="more" size={12} />
            </button>
          </AfDropdownMenu>
        </div>
      </div>
    );
  };

  const renderSidebarBody = (collapsed: boolean) => (
    <>
      <div className="af-asf__side-head">
        {!collapsed ? (
          <AfDropdownMenu items={workspaceMenuItems} side="bottom" align="start" width={220}>
            <button type="button" className="af-asf__ws-btn" aria-label={`${workspace} workspace menu`}>
              <span className="af-asf__ws-logo">{workspace.charAt(0).toUpperCase()}</span>
              <span className="af-asf__ws-name" title={workspace}>
                {workspace}
              </span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          </AfDropdownMenu>
        ) : null}
        <AfTooltip content={collapsed ? "Open sidebar" : "Collapse sidebar"} side="right">
          <button
            type="button"
            className="af-asf__icon-btn"
            aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <ShellPanelLeftSvg />
          </button>
        </AfTooltip>
      </div>

      <div className="af-asf__side-scroll">
        {collapsed ? (
          <AfTooltip content="Search…" kbd="⌘K" side="right">
            <button
              type="button"
              className="af-asf__rail-btn"
              aria-label="Search…"
              onClick={() => setPaletteOpen(true)}
            >
              <AfIcon name="search" size={15} />
            </button>
          </AfTooltip>
        ) : (
          <button type="button" className="af-asf__search-btn" onClick={() => setPaletteOpen(true)}>
            <span className="af-asf__search-left">
              <AfIcon name="search" size={13} />
              <span>Search…</span>
            </span>
            <span className="af-asf__kbd">⌘K</span>
          </button>
        )}

        <nav className="af-asf__nav-group" aria-label="Primary">
          {nav.map((item) => {
            const active = currentActive === item.label;
            const iconNode =
              typeof item.icon === "string" ? (
                <AfIcon name={item.icon} size={14} />
              ) : item.icon ? (
                item.icon
              ) : (
                <AfIcon name="square" size={14} />
              );

            if (collapsed) {
              return (
                <AfTooltip key={item.label} content={item.label} side="right">
                  <button
                    type="button"
                    className="af-asf__rail-btn"
                    data-active={active || undefined}
                    aria-label={item.label}
                    onClick={() => selectRoute(item.label)}
                  >
                    {iconNode}
                  </button>
                </AfTooltip>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className="af-asf__nav-btn"
                data-active={active || undefined}
                onClick={() => selectRoute(item.label)}
              >
                <span className="af-asf__nav-main">
                  {iconNode}
                  <span className="af-asf__nav-label">{item.label}</span>
                </span>
                {item.badge !== undefined ? <span className="af-asf__kbd">{item.badge}</span> : null}
              </button>
            );
          })}
        </nav>

        {!collapsed && groups && groups.length > 0
          ? groups.map((grp) => (
              <div key={grp.label} className="af-asf__nav-group">
                <div className="af-asf__sec-head">
                  <span>{grp.label}</span>
                </div>
                {grp.items.map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    className="af-asf__nav-btn"
                    data-active={currentActive === entry.label || undefined}
                    onClick={() => selectRoute(entry.label)}
                  >
                    <span className="af-asf__nav-main">
                      {typeof entry.icon === "string" ? (
                        <AfIcon name={entry.icon} size={14} />
                      ) : (
                        (entry.icon ?? <AfIcon name="layers" size={14} />)
                      )}
                      <span className="af-asf__nav-label">{entry.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))
          : null}

        {!collapsed && !groups && projects.length > 0 ? (
          <div className="af-asf__nav-group">
            <div className="af-asf__sec-head">
              <span>Projects</span>
            </div>
            {hasExplicitChats
              ? projects.map((proj) => {
                  const folderChats = chatItems.filter((c) => c.folder === proj);
                  const expanded = Boolean(openFolders[proj]);
                  const isDropTarget = dropFolder === proj;
                  return (
                    <div key={proj} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        type="button"
                        className="af-asf__nav-btn"
                        data-asf-folder={proj}
                        data-active={currentActive === proj || undefined}
                        style={
                          isDropTarget
                            ? { boxShadow: "inset 0 0 0 1px var(--af-accent)", background: "var(--af-accent-soft)" }
                            : undefined
                        }
                        onClick={() => {
                          setOpenFolders((prev) => ({ ...prev, [proj]: !prev[proj] }));
                          selectRoute(proj);
                        }}
                      >
                        <span className="af-asf__nav-main">
                          <AfIcon name={expanded ? "chevronDown" : "chevronRight"} size={11} />
                          <ShellProjectFolderSvg />
                          <span className="af-asf__nav-label">{proj}</span>
                        </span>
                        {folderChats.length > 0 ? <span className="af-asf__kbd">{folderChats.length}</span> : null}
                      </button>

                      {expanded && folderChats.length > 0 ? (
                        <div className="af-asf__folder-children">{folderChats.map(renderChatRow)}</div>
                      ) : null}
                    </div>
                  );
                })
              : projects.map((proj) => (
                  <button
                    key={proj}
                    type="button"
                    className="af-asf__nav-btn"
                    data-active={currentActive === proj || undefined}
                    onClick={() => selectRoute(proj)}
                  >
                    <span className="af-asf__nav-main">
                      <ShellProjectFolderSvg />
                      <span className="af-asf__nav-label">{proj}</span>
                    </span>
                  </button>
                ))}
          </div>
        ) : null}

        {!collapsed && hasExplicitChats && pinnedChats.length > 0 ? (
          <div className="af-asf__nav-group">
            <div className="af-asf__sec-head">
              <span>Pinned</span>
            </div>
            {pinnedChats.map(renderChatRow)}
          </div>
        ) : null}

        {!collapsed && hasExplicitChats && looseChats.length > 0 ? (
          <div className="af-asf__nav-group">
            <div className="af-asf__sec-head">
              <span>Chats</span>
            </div>
            {looseChats.map(renderChatRow)}
          </div>
        ) : null}
      </div>

      {!collapsed && sideCards ? (
        <AfShellSidebarCards
          workspace={workspace}
          onSelectChangelog={() => selectRoute("Changelog")}
          onSelectGettingStarted={() => selectRoute("Getting started")}
        />
      ) : null}

      <div className="af-asf__side-foot">
        <AfDropdownMenu
          items={userMenuItems}
          side="top"
          align="start"
          width={232}
          header={
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 4px" }}>
              <span className="af-asf__avatar" style={{ width: 28, height: 28, fontSize: 11.5 }}>
                {user.avatar ? <img src={user.avatar} alt="" /> : initialsOf(user.name)}
              </span>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <strong style={{ fontSize: 12.5, color: "var(--af-page-strong)", lineHeight: "16px" }}>
                  {user.name}
                </strong>
                {user.email ? (
                  <span style={{ fontSize: 11, color: "var(--af-page-muted)", lineHeight: "15px" }}>{user.email}</span>
                ) : null}
              </div>
            </div>
          }
        >
          {collapsed ? (
            <AfTooltip content={user.name} side="right">
              <button type="button" className="af-asf__rail-btn" aria-label={user.name}>
                <span className="af-asf__avatar">
                  {user.avatar ? <img src={user.avatar} alt="" /> : initialsOf(user.name)}
                </span>
              </button>
            </AfTooltip>
          ) : (
            <button type="button" className="af-asf__user-btn" aria-label={`Account menu for ${user.name}`}>
              <span className="af-asf__avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : initialsOf(user.name)}
              </span>
              <span className="af-asf__nav-label" style={{ flex: 1 }}>
                {user.name}
              </span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          )}
        </AfDropdownMenu>
      </div>
    </>
  );

  const renderWorkAreaBody = () => {
    if (!activeTab) return null;
    if (activeTab.content) {
      return <div className="af-asf__viewer">{activeTab.content}</div>;
    }

    if (activeTab.kind === "new") {
      return (
        <div className="af-asf__newtab">
          <form
            className="af-asf__nt-url"
            onSubmit={(e) => {
              e.preventDefault();
              if (!urlDraft.trim()) return;
              openArtifactInTab({
                id: `url-${urlDraft.trim()}`,
                title: urlDraft.trim(),
                kind: "browser",
              });
              setUrlDraft("");
            }}
          >
            <AfIcon name="search" size={13} />
            <input
              type="text"
              aria-label="Search or enter URL"
              placeholder="Search or enter URL"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
            />
          </form>

          <div className="af-asf__nt-group">
            <span className="af-asf__nt-label">Tools</span>
            <div className="af-asf__nt-tools">
              {[
                { kind: "terminal" as const, label: "Terminal", icon: "terminal" as AffectIconKey, kbd: "⌃`" },
                { kind: "browser" as const, label: "Browser", icon: "globe" as AffectIconKey, kbd: "⌘⇧B" },
                { kind: "notes" as const, label: "Notes", icon: "file" as AffectIconKey, kbd: "⌘⇧N" },
              ].map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  className="af-asf__nt-tool"
                  onClick={() =>
                    openArtifactInTab({
                      id: `tool-${item.kind}`,
                      title: item.label,
                      kind: item.kind,
                    })
                  }
                >
                  <span className="af-asf__nt-left">
                    <span className="af-asf__nt-toolicon">
                      <AfIcon name={item.icon} size={13} />
                    </span>
                    <span className="af-asf__nt-text">
                      <strong>{item.label}</strong>
                    </span>
                  </span>
                  <span className="af-asf__nt-kbd">{item.kbd}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="af-asf__nt-group">
            <span className="af-asf__nt-label">Suggested</span>
            <div className="af-asf__nt-suggested">
              {suggestions.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  className="af-asf__nt-item"
                  onClick={() => openArtifactInTab(art)}
                >
                  <span className="af-asf__nt-left">
                    <span className="af-asf__nt-mark" aria-hidden="true">
                      {art.mark ?? art.title.charAt(0).toUpperCase()}
                    </span>
                    <span className="af-asf__nt-text">
                      <strong>{art.title}</strong>
                      {art.subtitle ? <span>{art.subtitle}</span> : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab.kind === "terminal") {
      return (
        <div className="af-asf__viewer">
          <div className="af-asf__viewer-meta">
            <span>~/workspace/acme</span>
            <span className="af-asf__kbd">zsh</span>
          </div>
          <pre className="af-asf__code">
            {`$ pnpm test --filter @acme/agents\n✓ 24 passed (418ms)\n$ acme deploy --preview\n↗ Ready at https://staging.acme.app`}
          </pre>
        </div>
      );
    }

    if (activeTab.kind === "sheet") {
      return (
        <div className="af-asf__viewer">
          <div className="af-asf__viewer-meta">
            <span>6 rows · 5 cols</span>
            <span className="af-asf__kbd">Sheet</span>
          </div>
          <div className="af-asf__sheet-wrap">
            <table className="af-asf__sheet">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>A Channel</th>
                  <th>B Clicks</th>
                  <th>C Signups</th>
                  <th>D CAC</th>
                  <th>E Spend</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_ROWS.map((row, idx) => (
                  <tr key={row.channel} data-total={row.total || undefined}>
                    <td>{idx + 1}</td>
                    <td>{row.channel}</td>
                    <td data-num="">{row.clicks}</td>
                    <td data-num="">{row.signups}</td>
                    <td data-num="">{row.cac}</td>
                    <td data-num="">{row.spend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab.kind === "code") {
      return (
        <div className="af-asf__viewer">
          <div className="af-asf__viewer-meta">
            <span>linear.app/acme/q3-checklist</span>
            <span className="af-asf__kbd">Checklist</span>
          </div>
          <pre className="af-asf__code">
            {`[x] Finalize pricing FAQ copy with Finance\n[x] Verify rate-limit webhooks in staging\n[ ] Publish Q3 changelog post\n[ ] Enable shared folders for Pro tier`}
          </pre>
        </div>
      );
    }

    if (activeTab.kind === "notes") {
      return (
        <div className="af-asf__viewer">
          <div className="af-asf__viewer-meta">
            <span>Personal scratchpad</span>
            <span>Saved</span>
          </div>
          <textarea
            className="af-asf__notes-area"
            aria-label="Scratchpad notes"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
          />
        </div>
      );
    }

    if (activeTab.kind === "browser") {
      return (
        <div className="af-asf__viewer">
          <div className="af-asf__viewer-meta">
            <span>https://docs.acme.com/changelog</span>
            <AfIcon name="external" size={12} />
          </div>
          <div className="af-asf__doc">
            <h3>Acme v2.4 Release Notes</h3>
            <p>
              Shared folders let teams group related threads, pinned specs and live agent runs into a single workspace
              collection.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="af-asf__viewer">
        <div className="af-asf__viewer-meta">
          <span>Document</span>
          <span>Updated just now</span>
        </div>
        <div className="af-asf__doc">
          <h3>{activeTab.title}</h3>
          <p>
            Generative retrieval engines weight structured product tables, unambiguous pricing tiers, and direct API
            examples significantly higher than marketing prose.
          </p>
          <p>
            Keep canonical answers under 120 words per section and expose clean copyable snippets alongside every SDK
            parameter.
          </p>
        </div>
      </div>
    );
  };

  const renderWorkAreaColumn = () => (
    <>
      <div className="af-asf__work-bar">
        <div className="af-asf__tabs" role="tablist" aria-label="Work area tabs">
          {tabs.map((tab) => {
            const isTabActive = tab.id === activeTab?.id;
            return (
              <div key={tab.id} className="af-asf__tab" data-active={isTabActive || undefined}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isTabActive}
                  className="af-asf__tab-trigger"
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.icon ?? <AfIcon name={iconForKind(tab.kind)} size={12} />}
                  <span className="af-asf__tab-title">{tab.title}</span>
                </button>
                <button
                  type="button"
                  className="af-asf__tab-close"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => closeTab(tab.id)}
                >
                  <AfIcon name="x" size={10} />
                </button>
              </div>
            );
          })}
          {workOpts?.allowNewTab !== false ? (
            <AfTooltip content="New tab" side="bottom">
              <button
                type="button"
                className="af-asf__icon-btn"
                style={{ width: 24, height: 24 }}
                aria-label="New tab"
                onClick={() => addBlankTab("new", "New tab")}
              >
                <AfIcon name="plus" size={12} />
              </button>
            </AfTooltip>
          ) : null}
        </div>

        <div className="af-asf__head-actions">
          <AfTooltip content="Close work area" side="bottom">
            <button
              type="button"
              className="af-asf__icon-btn"
              aria-label="Close workspace"
              onClick={() => setPanelOpen(false)}
            >
              <ShellPanelRightSvg />
            </button>
          </AfTooltip>
        </div>
      </div>
      <div className="af-asf__work-body">{renderWorkAreaBody()}</div>
    </>
  );

  const resolvedHeaderTitle = header && typeof header === "object" ? header.title : currentActive;
  const placeholderDesc =
    layout === "inset"
      ? "The shell brings both sidebars and the scroll container – put any screen inside."
      : "The flat shell brings both sidebars and the scroll container – put any screen inside.";

  return (
    <div ref={setShellEl} className={cn("af-asf", className)} data-shell={layout} {...rest}>
      <aside
        className="af-asf__side"
        data-desktop-only=""
        data-collapsed={sidebarCollapsed || undefined}
        aria-label="Sidebar"
      >
        {renderSidebarBody(sidebarCollapsed)}
      </aside>

      <AfDrawer
        open={leftDrawerOpen}
        onOpenChange={setLeftDrawerOpen}
        placement="left"
        width={268}
        title={workspace}
        container={shellEl}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>{renderSidebarBody(false)}</div>
      </AfDrawer>

      <AfDrawer
        open={rightDrawerOpen}
        onOpenChange={setRightDrawerOpen}
        placement="right"
        width={340}
        title={activeTab?.title ?? panelTitle}
        container={shellEl}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>{renderWorkAreaBody()}</div>
      </AfDrawer>

      <AfCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={paletteCommands}
        placeholder={`Search ${workspace} chats, pages and artifacts…`}
        container={shellEl}
      />

      <AfModal
        open={Boolean(renamingChat)}
        onOpenChange={(open) => {
          if (!open) setRenamingChat(null);
        }}
        title="Rename chat"
        width={380}
        container={shellEl}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="af-ob__ghost-btn" onClick={() => setRenamingChat(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-ob__primary-btn"
              onClick={() => {
                if (renamingChat && renameDraft.trim()) {
                  setChatItems((prev) =>
                    prev.map((c) => (c.id === renamingChat.id ? { ...c, title: renameDraft.trim() } : c)),
                  );
                }
                setRenamingChat(null);
              }}
            >
              Save
            </button>
          </div>
        }
      >
        <AfInput
          label="Title"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          autoFocus
        />
      </AfModal>

      <main className="af-asf__center">
        {showMainHeader ? (
          <header className="af-asf__bar">
            <div className="af-asf__main-head">
              {sidebarCollapsed ? (
                <button
                  type="button"
                  className="af-asf__icon-btn"
                  aria-label="Open sidebar"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <ShellPanelLeftSvg />
                </button>
              ) : null}
              <button
                type="button"
                className="af-asf__icon-btn af-asf__mobile-menu"
                aria-label="Open sidebar drawer"
                onClick={() => setLeftDrawerOpen(true)}
              >
                <AfIcon name="menu" size={15} />
              </button>
              <button type="button" className="af-asf__title-pick">
                <span>{resolvedHeaderTitle}</span>
                <AfIcon name="chevronDown" size={11} />
              </button>
            </div>

            <div className="af-asf__head-actions">
              {header && typeof header === "object" && header.actions ? (
                header.actions
              ) : (
                <>
                  <AfTooltip content="Share" side="bottom">
                    <button
                      type="button"
                      className="af-asf__icon-btn"
                      aria-label="Share"
                      onClick={() => onNavigate?.(`Share:${String(currentActive)}`)}
                    >
                      <ShareNodesSvg />
                    </button>
                  </AfTooltip>
                  <AfDropdownMenu items={pageMoreItems} side="bottom" align="end">
                    <button type="button" className="af-asf__icon-btn" aria-label="Page actions">
                      <AfIcon name="more" size={15} />
                    </button>
                  </AfDropdownMenu>
                </>
              )}

              {workOpts && !panelOpen ? (
                <AfTooltip content="Open workspace" side="bottom">
                  <button
                    type="button"
                    className="af-asf__icon-btn"
                    aria-label="Open workspace"
                    onClick={() => setPanelOpen(true)}
                  >
                    <ShellPanelRightSvg />
                  </button>
                </AfTooltip>
              ) : null}
            </div>
          </header>
        ) : !panelOpen && workOpts ? (
          <div className="af-asf__floating-reopen">
            <AfTooltip content="Open workspace" side="bottom">
              <button
                type="button"
                className="af-asf__icon-btn"
                aria-label="Open workspace"
                onClick={() => setPanelOpen(true)}
              >
                <ShellPanelRightSvg />
              </button>
            </AfTooltip>
          </div>
        ) : null}

        <div className="af-asf__page">
          {children ?? (
            <div className="af-asf__placeholder">
              <span className="af-asf__placeholder-icon" aria-hidden="true">
                <PlaceholderPageSvg />
              </span>
              <strong>{currentActive === "New chat" ? "Your page goes here" : currentActive}</strong>
              <p>{placeholderDesc}</p>
            </div>
          )}
        </div>
      </main>

      {workOpts && panelOpen ? (
        <aside
          className="af-asf__work"
          data-desktop-only=""
          data-expanded={panelExpanded || undefined}
          style={workOpts.width ? { flexBasis: workOpts.width } : undefined}
          aria-label="Work area"
        >
          {renderWorkAreaColumn()}
        </aside>
      ) : null}
      {chatGhost ? (
        <AfPortal>
          <div
            className="af-drag-ghost"
            aria-hidden="true"
            style={{
              transform: `translate3d(${chatGhost.x}px, ${chatGhost.y}px, 0)`,
              padding: "5px 10px",
              borderRadius: 8,
              background: "var(--af-surface)",
              color: "var(--af-strong)",
              fontSize: 12,
              fontWeight: 500,
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {chatGhost.title}
          </div>
        </AfPortal>
      ) : null}
    </div>
  );
}

/** 灰底内嵌圆角三栏应用外壳（App Shell Inset）：对应 affectUI `app-shell`。 */
export function AfAppShellInset(props: Omit<AfAppShellFlatProps, "layout"> = {}) {
  return <AfAppShellFlat layout="inset" header={props.header ?? false} {...props} />;
}
