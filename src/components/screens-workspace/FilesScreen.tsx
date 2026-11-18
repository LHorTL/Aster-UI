import { useEffect, useMemo, useRef, useState, type ChangeEvent, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
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

export type AfFilesProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
};

export type AfFolderProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  folder?: string;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
};

const NAV: WksNavItem[] = [
  { label: "New chat", icon: "message" },
  { label: "Folders", icon: "folder" },
  { label: "Integrations", icon: "grid" },
];

const DEFAULT_PROJECTS = ["Q3 Campaign", "Brand assets", "Hiring", "Research"];

type DocKind = "PDF" | "XLS" | "DOC";

type FolderEntry = {
  name: string;
  access: "Shared" | "Private";
  count: number;
};

type FileItem = {
  id: string;
  name: string;
  badge: DocKind;
  typeLabel: "PDF" | "Spreadsheet" | "Document";
  owner: string;
  access: "Shared" | "Private";
  updated: string;
};

const INITIAL_FOLDERS: FolderEntry[] = [
  { name: "Brand assets", access: "Shared", count: 3 },
  { name: "Hiring", access: "Private", count: 4 },
  { name: "Q3 Campaign", access: "Shared", count: 5 },
  { name: "Research", access: "Private", count: 2 },
];

const INITIAL_TEMPLATES: FileItem[] = [
  { id: "t-brand", name: "Brand-Guidelines", badge: "PDF", typeLabel: "PDF", owner: "Jonas Weber", access: "Shared", updated: "Yesterday" },
  { id: "t-budget", name: "Campaign-Budget", badge: "XLS", typeLabel: "Spreadsheet", owner: "Jonas Weber", access: "Shared", updated: "2 days ago" },
  { id: "t-design", name: "Design-Book", badge: "DOC", typeLabel: "Document", owner: "Alex Morgan", access: "Private", updated: "Mar 4" },
  { id: "t-weekly", name: "Weekly-Report", badge: "XLS", typeLabel: "Spreadsheet", owner: "Alex Morgan", access: "Private", updated: "Last week" },
];

const FOLDER_FILES_MAP: Record<string, FileItem[]> = {
  "Q3 Campaign": [
    { id: "f-brief", name: "Campaign-Brief", badge: "DOC", typeLabel: "Document", owner: "Alex Morgan", access: "Shared", updated: "2 hours ago" },
    { id: "f-plan", name: "Launch-Plan", badge: "PDF", typeLabel: "PDF", owner: "Jonas Weber", access: "Shared", updated: "Yesterday" },
    { id: "f-media", name: "Media-Budget", badge: "XLS", typeLabel: "Spreadsheet", owner: "Mara Klein", access: "Shared", updated: "Yesterday" },
    { id: "f-copy", name: "Ad-Copy", badge: "DOC", typeLabel: "Document", owner: "Alex Morgan", access: "Shared", updated: "3 days ago" },
    { id: "f-res", name: "Results-Q2", badge: "XLS", typeLabel: "Spreadsheet", owner: "Lea Braun", access: "Shared", updated: "Last week" },
  ],
  "Brand assets": [
    { id: "b-guide", name: "Brand-Guidelines", badge: "PDF", typeLabel: "PDF", owner: "Jonas Weber", access: "Shared", updated: "Yesterday" },
    { id: "b-voice", name: "Tone-of-Voice", badge: "DOC", typeLabel: "Document", owner: "Mara Klein", access: "Shared", updated: "4 days ago" },
    { id: "b-press", name: "Press-Kit-2026", badge: "PDF", typeLabel: "PDF", owner: "Alex Morgan", access: "Shared", updated: "Last week" },
  ],
  Hiring: [
    { id: "h-eng", name: "Design-Engineer-Loop", badge: "DOC", typeLabel: "Document", owner: "Alex Morgan", access: "Private", updated: "Today" },
    { id: "h-comp", name: "Comp-Bands-2026", badge: "XLS", typeLabel: "Spreadsheet", owner: "Alex Morgan", access: "Private", updated: "3 days ago" },
    { id: "h-onb", name: "First-30-Days", badge: "DOC", typeLabel: "Document", owner: "Lea Braun", access: "Private", updated: "Last week" },
    { id: "h-offer", name: "Offer-Template", badge: "PDF", typeLabel: "PDF", owner: "Alex Morgan", access: "Private", updated: "Feb 26" },
  ],
  Research: [
    { id: "r-int", name: "Customer-Interviews", badge: "DOC", typeLabel: "Document", owner: "Mara Klein", access: "Private", updated: "Yesterday" },
    { id: "r-nps", name: "Q1-NPS-Breakdown", badge: "XLS", typeLabel: "Spreadsheet", owner: "Jonas Weber", access: "Private", updated: "Last week" },
  ],
};

function FilledFolderSvg({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className="af-wks-folder-svg">
      <path
        d="M2.2 5.4C2.2 4.4 3 3.6 4 3.6h3.7c.5 0 1 .22 1.33.6l.88 1.02c.16.18.39.28.63.28H16c1 0 1.8.8 1.8 1.8v7.3c0 1-.8 1.8-1.8 1.8H4c-1 0-1.8-.8-1.8-1.8V5.4Z"
        fill="color-mix(in srgb, var(--af-info) 68%, var(--af-on-accent))"
      />
      <path
        d="M2.2 7.5c0-.77.63-1.4 1.4-1.4h12.8c.77 0 1.4.63 1.4 1.4v7.1c0 1-.8 1.8-1.8 1.8H4c-1 0-1.8-.8-1.8-1.8V7.5Z"
        fill="color-mix(in srgb, var(--af-info) 86%, var(--af-on-accent))"
      />
    </svg>
  );
}

function DocCard({
  item,
  subLeft,
  subRight,
  accessIcon,
  onOpen,
}: {
  item: FileItem;
  subLeft: string;
  subRight?: string;
  accessIcon?: "Shared" | "Private";
  onOpen: (item: FileItem) => void;
}) {
  return (
    <button type="button" className="af-wks-doc-card" onClick={() => onOpen(item)}>
      <span className="af-wks-doc-card__stage" aria-hidden="true">
        <span className="af-wks-doc-sheet">
          <span className="af-wks-doc-sheet__lines">
            <i />
            <i />
            <i />
          </span>
          <span className="af-wks-doc-sheet__badge" data-kind={item.badge}>
            {item.badge}
          </span>
        </span>
      </span>
      <b className="af-wks-doc-card__name">{item.name}</b>
      <span className="af-wks-doc-card__meta">
        <span className="af-wks-doc-card__meta-text">{subLeft}</span>
        {subRight ? (
          <span className="af-wks-doc-card__meta-acc">
            · {accessIcon ? <AfIcon name={accessIcon === "Shared" ? "users" : "lock"} size={10} /> : null}
            <span>{subRight}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function AfFiles(props: AfFilesProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Folders");
  const [folders, setFolders] = useState<FolderEntry[]>(() => (empty ? [] : INITIAL_FOLDERS));
  const [templates, setTemplates] = useState<FileItem[]>(() => (empty ? [] : INITIAL_TEMPLATES));

  const [folderScope, setFolderScope] = useState<"All" | "Shared" | "Private">("All");
  const [folderAsc, setFolderAsc] = useState(true);
  const [folderView, setFolderView] = useState<"grid" | "list">("grid");
  const [folderQuery, setFolderQuery] = useState("");

  const [tplScope, setTplScope] = useState<"All" | "Mine" | "Shared with me">("All");
  const [tplType, setTplType] = useState<"All" | "PDF" | "Spreadsheet" | "Document">("All");
  const [tplAsc, setTplAsc] = useState(true);
  const [tplQuery, setTplQuery] = useState("");

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderAccess, setNewFolderAccess] = useState<"Shared" | "Private">("Shared");

  const [addTplOpen, setAddTplOpen] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [previewDoc, setPreviewDoc] = useState<FileItem | null>(null);

  useEffect(() => {
    setFolders(empty ? [] : INITIAL_FOLDERS);
    setTemplates(empty ? [] : INITIAL_TEMPLATES);
  }, [empty]);

  const groups: WksGroup[] = useMemo(
    () => [
      {
        label: "Projects",
        items: DEFAULT_PROJECTS.map((label) => ({ label, icon: "folder" })),
      },
    ],
    [],
  );

  const visibleFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    return folders
      .filter((f) => (folderScope === "All" ? true : f.access === folderScope))
      .filter((f) => (!q ? true : f.name.toLowerCase().includes(q)))
      .sort((a, b) => (folderAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [folders, folderScope, folderQuery, folderAsc]);

  const visibleTemplates = useMemo(() => {
    const q = tplQuery.trim().toLowerCase();
    return templates
      .filter((t) => {
        if (tplScope === "Mine") return t.owner === user.name;
        if (tplScope === "Shared with me") return t.owner !== user.name;
        return true;
      })
      .filter((t) => (tplType === "All" ? true : t.typeLabel === tplType))
      .filter((t) => (!q ? true : t.name.toLowerCase().includes(q)))
      .sort((a, b) => (tplAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [templates, tplScope, tplType, tplQuery, tplAsc, user.name]);

  const typeMenu: AfMenuItem[] = (["All", "PDF", "Spreadsheet", "Document"] as const).map((t) => ({
    type: "radio",
    id: t,
    label: t === "All" ? "All types" : t,
    checked: tplType === t,
    onSelect: () => setTplType(t),
  }));

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={groups}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <div className="af-wks-scroll">
        <div className="af-wks-page-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WksSidebarExpandButton />
            <h1 className="af-wks-page-title">Files</h1>
          </div>
          <p className="af-wks-page-sub">
            See files you recently used in chats and manage files saved in folders.
            <button type="button" onClick={() => onNavigate?.("Learn more")}>
              Learn more
            </button>
          </p>
        </div>

        {/* Section 1: Folders */}
        <section className="af-wks-sec">
          <h2 className="af-wks-sec__title">
            Folders <span>{folders.length}</span>
          </h2>
          <div className="af-wks-toolbar">
            <div className="af-wks-pills" role="tablist" aria-label="Folder access">
              {(["All", "Shared", "Private"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  className="af-wks-pill-tab"
                  aria-selected={folderScope === tab}
                  onClick={() => setFolderScope(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="af-wks-toolbar__right">
              <button
                type="button"
                className="af-wks-btn"
                aria-label={folderAsc ? "Sorted A to Z – sort Z to A" : "Sorted Z to A – sort A to Z"}
                onClick={() => setFolderAsc((v) => !v)}
              >
                <AfIcon name={folderAsc ? "arrowDown" : "arrowUp"} size={12} />
              </button>

              <div className="af-wks-pills" role="radiogroup" aria-label="View">
                {(["grid", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    className="af-wks-pill-tab"
                    aria-label={mode === "grid" ? "Grid" : "List"}
                    aria-checked={folderView === mode}
                    onClick={() => setFolderView(mode)}
                  >
                    <AfIcon name={mode} size={12} />
                  </button>
                ))}
              </div>

              <label className="af-wks-search-input">
                <AfIcon name="search" size={12} />
                <input
                  type="search"
                  aria-label="Search folders..."
                  placeholder="Search folders..."
                  value={folderQuery}
                  onChange={(e) => setFolderQuery(e.target.value)}
                />
              </label>

              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setCreateFolderOpen(true)}>
                <AfIcon name="plus" size={12} />
                <span>Create folder</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="af-wks-folders">
              {Array.from({ length: 4 }, (_, i) => (
                <AfSkeleton key={i} variant="rect" width={196} height={52} radius={10} />
              ))}
            </div>
          ) : visibleFolders.length === 0 ? (
            <AfEmptyState
              size="sm"
              icon="folder"
              title="No folders yet"
              text="Create a shared or private folder to organize files across chats."
              action={
                <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setCreateFolderOpen(true)}>
                  New folder
                </button>
              }
            />
          ) : (
            <div className="af-wks-folders" data-view={folderView}>
              {visibleFolders.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  className="af-wks-folder-card"
                  onClick={() => onNavigate?.(f.name)}
                >
                  <span className="af-wks-folder-card__icon" aria-hidden="true">
                    <FilledFolderSvg size={22} />
                  </span>
                  <span className="af-wks-folder-card__text">
                    <b>{f.name}</b>
                    <span className="af-wks-folder-card__sub">
                      <AfIcon name={f.access === "Shared" ? "users" : "lock"} size={10} />
                      <span>
                        {f.access} · {f.count} {f.count === 1 ? "file" : "files"}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: File templates */}
        <section className="af-wks-sec" style={{ marginTop: 6 }}>
          <h2 className="af-wks-sec__title">
            File templates <span>{templates.length}</span>
          </h2>
          <div className="af-wks-toolbar">
            <div className="af-wks-pills" role="tablist" aria-label="Template scope">
              {(["All", "Mine", "Shared with me"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  className="af-wks-pill-tab"
                  aria-selected={tplScope === tab}
                  onClick={() => setTplScope(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="af-wks-toolbar__right">
              <AfDropdownMenu items={typeMenu} side="bottom" align="end" width={152}>
                <button type="button" className="af-wks-btn">
                  <AfIcon name="filter" size={11} />
                  <span>{tplType === "All" ? "Type" : tplType}</span>
                  <AfIcon name="chevronDown" size={11} />
                </button>
              </AfDropdownMenu>

              <button
                type="button"
                className="af-wks-btn"
                aria-label={tplAsc ? "Sorted A to Z – sort Z to A" : "Sorted Z to A – sort A to Z"}
                onClick={() => setTplAsc((v) => !v)}
              >
                <AfIcon name={tplAsc ? "arrowDown" : "arrowUp"} size={12} />
              </button>

              <label className="af-wks-search-input">
                <AfIcon name="search" size={12} />
                <input
                  type="search"
                  aria-label="Search templates..."
                  placeholder="Search templates..."
                  value={tplQuery}
                  onChange={(e) => setTplQuery(e.target.value)}
                />
              </label>

              <button type="button" className="af-wks-btn" onClick={() => setAddTplOpen(true)}>
                <AfIcon name="plus" size={12} />
                <span>Add template</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="af-wks-file-list">
              {Array.from({ length: 4 }, (_, i) => (
                <AfSkeleton key={i} variant="rect" width={162} height={132} radius={10} />
              ))}
            </div>
          ) : visibleTemplates.length === 0 ? (
            <AfEmptyState
              size="sm"
              icon="file"
              title="No templates yet"
              text="Save reusable briefs, spreadsheets or decks as workspace templates."
              action={
                <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setAddTplOpen(true)}>
                  Add template
                </button>
              }
            />
          ) : (
            <div className="af-wks-file-list af-wks-file-list--4col">
              {visibleTemplates.map((tpl) => (
                <DocCard
                  key={tpl.id}
                  item={tpl}
                  subLeft={`${tpl.typeLabel} · ${tpl.owner}`}
                  subRight={tpl.access}
                  accessIcon={tpl.access}
                  onOpen={setPreviewDoc}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Folder Modal */}
      <AfModal
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        title="Create folder"
        description="Group project documents and connect them to chats."
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => {
                const trimmed = newFolderName.trim() || `New Folder ${folders.length + 1}`;
                setFolders((prev) => [...prev, { name: trimmed, access: newFolderAccess, count: 0 }]);
                setNewFolderName("");
                setCreateFolderOpen(false);
              }}
            >
              Create folder
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            className="af-wks-field-input"
            placeholder="Folder name (e.g. Q4 Launch)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="af-wks-pills" role="radiogroup" aria-label="Access">
            {(["Shared", "Private"] as const).map((acc) => (
              <button
                key={acc}
                type="button"
                role="radio"
                className="af-wks-pill-tab"
                aria-checked={newFolderAccess === acc}
                onClick={() => setNewFolderAccess(acc)}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>
      </AfModal>

      {/* Add Template Modal */}
      <AfModal
        open={addTplOpen}
        onClose={() => setAddTplOpen(false)}
        title="Add template"
        description="Create a starter document for your workspace."
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn" onClick={() => setAddTplOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => {
                const name = newTplName.trim() || `Project-Brief-${templates.length + 1}`;
                setTemplates((prev) => [
                  ...prev,
                  {
                    id: `tpl-${Date.now()}`,
                    name,
                    badge: "DOC",
                    typeLabel: "Document",
                    owner: user.name,
                    access: "Shared",
                    updated: "Just now",
                  },
                ]);
                setNewTplName("");
                setAddTplOpen(false);
              }}
            >
              Add template
            </button>
          </div>
        }
      >
        <input
          type="text"
          className="af-wks-field-input"
          placeholder="Template name (e.g. Launch-Checklist)"
          value={newTplName}
          onChange={(e) => setNewTplName(e.target.value)}
        />
      </AfModal>

      {/* File Preview Modal */}
      <AfModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name ?? "Preview"}
        description={previewDoc ? `${previewDoc.typeLabel} · ${previewDoc.owner} · ${previewDoc.access}` : undefined}
        closable
        contained
        size="sm"
        footer={
          <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setPreviewDoc(null)}>
            Open in chat
          </button>
        }
      >
        <div style={{ fontSize: 12.5, color: "var(--af-page-muted)", lineHeight: "19px" }}>
          Ready to reference <strong>{previewDoc?.name}</strong> inside {workspace} assistant threads.
        </div>
      </AfModal>
    </WorkspaceInsetShell>
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

export function AfFolder(props: AfFolderProps = {}) {
  const {
    folder: folderProp = "Q3 Campaign",
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [currentFolder, setCurrentFolder] = useState(folderProp);
  const [uploaded, setUploaded] = useState<FileItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState(folderProp);
  const [previewDoc, setPreviewDoc] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyLinkTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyLinkTimerRef.current !== null) window.clearTimeout(copyLinkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentFolder(folderProp);
    setRenameDraft(folderProp);
  }, [folderProp]);

  const projectNames = useMemo(() => {
    return DEFAULT_PROJECTS.includes(currentFolder)
      ? DEFAULT_PROJECTS
      : [currentFolder, ...DEFAULT_PROJECTS];
  }, [currentFolder]);

  const groups: WksGroup[] = useMemo(
    () => [
      {
        label: "Projects",
        items: projectNames.map((label) => ({ label, icon: "folder" })),
      },
    ],
    [projectNames],
  );

  const baseFiles = empty
    ? []
    : FOLDER_FILES_MAP[currentFolder] ?? FOLDER_FILES_MAP["Q3 Campaign"]!;
  const files = [...uploaded, ...baseFiles];

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const added: FileItem[] = selected.map((f, idx) => {
      const lower = f.name.toLowerCase();
      const isPdf = lower.endsWith(".pdf");
      const isSheet = lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv");
      return {
        id: `up-${Date.now()}-${idx}`,
        name: f.name.replace(/\.[^.]+$/, ""),
        badge: isPdf ? "PDF" : isSheet ? "XLS" : "DOC",
        typeLabel: isPdf ? "PDF" : isSheet ? "Spreadsheet" : "Document",
        owner: user.name,
        access: "Shared",
        updated: "Just now",
      };
    });
    setUploaded((prev) => [...added, ...prev]);
    e.target.value = "";
  };

  const moreItems: AfMenuItem[] = [
    {
      id: "rename",
      label: "Rename folder",
      icon: "pencil",
      onSelect: () => {
        setRenameDraft(currentFolder);
        setRenameOpen(true);
      },
    },
    {
      id: "sample",
      label: "Add brief document",
      icon: "plus",
      onSelect: () =>
        setUploaded((prev) => [
          {
            id: `up-${Date.now()}`,
            name: `${currentFolder.replace(/\s+/g, "-")}-Notes`,
            badge: "DOC",
            typeLabel: "Document",
            owner: user.name,
            access: "Shared",
            updated: "Just now",
          },
          ...prev,
        ]),
    },
    { id: "download", label: "Download as ZIP", icon: "download" },
    { type: "separator" },
    { id: "delete", label: "Delete folder", icon: "trash", danger: true, onSelect: () => onNavigate?.("Folders") },
  ];

  const showEmpty = !loading && files.length === 0;

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={groups}
      active={currentFolder}
      onRouteSelect={(label) => {
        if (projectNames.includes(label)) {
          setCurrentFolder(label);
        }
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <nav className="af-wks-topbar" aria-label="Breadcrumb">
        <div className="af-wks-topbar__left">
          <WksSidebarExpandButton />
          <div className="af-wks-crumbs">
            <button type="button" className="af-wks-crumbs__link" onClick={() => onNavigate?.("Folders")}>
              Files
            </button>
            <i className="af-wks-crumbs__sep" aria-hidden="true">/</i>
            <span className="af-wks-crumbs__cur">{currentFolder}</span>
          </div>
        </div>
      </nav>

      <div className="af-wks-scroll">
        <button type="button" className="af-wks-back-btn" onClick={() => onNavigate?.("Folders")}>
          <AfIcon name="arrowLeft" size={12} />
          <span>Files</span>
        </button>

        <header className="af-wks-folder-head">
          <h1 className="af-wks-page-title af-wks-folder-title">
            <FilledFolderSvg size={22} />
            <span>{currentFolder}</span>
          </h1>
          <div className="af-wks-topbar__right">
            <AfDropdownMenu items={moreItems} side="bottom" align="end" width={176}>
              <button type="button" className="af-wks-btn" aria-label="More" style={{ padding: "0 7px" }}>
                <AfIcon name="more" size={13} />
              </button>
            </AfDropdownMenu>

            <button type="button" className="af-wks-btn" onClick={() => setShareOpen(true)}>
              <AfIcon name="users" size={12} />
              <span>Share</span>
            </button>

            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => fileInputRef.current?.click()}
            >
              <AfIcon name="upload" size={12} />
              <span>Upload files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              aria-hidden="true"
              onChange={handleFileUpload}
            />
          </div>
        </header>

        {loading ? (
          <div className="af-wks-file-list">
            {Array.from({ length: 5 }, (_, i) => (
              <AfSkeleton key={i} variant="rect" width={162} height={132} radius={10} />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="af-wks-empty-wrap">
            <AfEmptyState
              icon="folderOpen"
              title="No files yet"
              text="Upload briefs, PDFs or spreadsheets, or start a chat right inside this folder."
              action={
                <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => onNavigate?.("New chat")}>
                  Work in folder
                </button>
              }
            />
          </div>
        ) : (
          <div className="af-wks-file-list af-wks-file-list--4col">
            {files.map((item) => (
              <DocCard
                key={item.id}
                item={item}
                subLeft={`${item.typeLabel} · ${item.updated}`}
                onOpen={setPreviewDoc}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AfModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`Share “${currentFolder}”`}
        description={`Anyone in ${workspace} with this link can view and reference these files in chat.`}
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", width: "100%" }}>
            <button
              type="button"
              className="af-wks-btn"
              onClick={() => {
                const shareUrl = `https://app.${workspace.toLowerCase()}.com/folders/${encodeURIComponent(currentFolder.toLowerCase().replace(/\s+/g, "-"))}`;
                void copyTextSafe(shareUrl).then((ok) => {
                  if (!ok || !mountedRef.current) return;
                  if (copyLinkTimerRef.current !== null) window.clearTimeout(copyLinkTimerRef.current);
                  setCopiedLink(true);
                  copyLinkTimerRef.current = window.setTimeout(() => {
                    copyLinkTimerRef.current = null;
                    if (mountedRef.current) setCopiedLink(false);
                  }, 1600);
                });
              }}
            >
              <AfIcon name={copiedLink ? "check" : "copy"} size={12} />
              <span>{copiedLink ? "Copied link" : "Copy link"}</span>
            </button>
            <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setShareOpen(false)}>
              Done
            </button>
          </div>
        }
      >
        <input
          type="text"
          readOnly
          className="af-wks-field-input"
          value={`https://app.${workspace.toLowerCase()}.com/folders/${encodeURIComponent(currentFolder.toLowerCase().replace(/\s+/g, "-"))}`}
        />
      </AfModal>

      {/* Rename Modal */}
      <AfModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename folder"
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn" onClick={() => setRenameOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => {
                if (renameDraft.trim()) setCurrentFolder(renameDraft.trim());
                setRenameOpen(false);
              }}
            >
              Save
            </button>
          </div>
        }
      >
        <input
          type="text"
          className="af-wks-field-input"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
        />
      </AfModal>

      {/* Document Preview Modal */}
      <AfModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name ?? "Document"}
        description={previewDoc ? `${previewDoc.typeLabel} · Updated ${previewDoc.updated}` : undefined}
        closable
        contained
        size="sm"
        footer={
          <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setPreviewDoc(null)}>
            Close
          </button>
        }
      >
        <div style={{ fontSize: 12.5, color: "var(--af-page-muted)", lineHeight: "19px" }}>
          Saved in <strong>{currentFolder}</strong>. Teammates in {workspace} can cite this file with <code>@{previewDoc?.name}</code>.
        </div>
      </AfModal>
    </WorkspaceInsetShell>
  );
}
