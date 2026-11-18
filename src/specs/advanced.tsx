import { useState } from "react";
import { AfBadge, AfButton, AfContextMenu, AfIcon, AfTabs, type AfContextMenuItem, type AfTabItem } from "../index";
import type { ComponentSpec } from "../types";
import "./advanced.css";

/** 标签页预览：默认展示标志性底部下划线（line），并支持切换 pill / segmented、计数徽标、可关闭页签与新增页签。 */
function TabsSpecimen() {
  const [variant, setVariant] = useState<"line" | "pill" | "segmented">("line");
  const [tabs, setTabs] = useState<AfTabItem[]>([
    {
      key: "overview",
      label: "Overview",
      icon: "layers" as const,
      content: (
        <div className="af-adv-panel">
          12 active evaluation sessions this week · median p95 latency dropped by 8.4%.
        </div>
      ),
    },
    {
      key: "runs",
      label: "Runs",
      icon: "play" as const,
      count: 4,
      content: (
        <div className="af-adv-panel">
          Input 1.24M tokens · Output 386K tokens · Prompt cache hit rate 71%.
        </div>
      ),
    },
    {
      key: "logs",
      label: "Logs",
      icon: "terminal" as const,
      content: (
        <div className="af-adv-panel">
          Streaming structured JSON traces from 3 worker regions with zero dropped spans.
        </div>
      ),
    },
    {
      key: "draft",
      label: "Draft",
      closable: true,
      content: (
        <div className="af-adv-panel">
          Scratchpad tab — click × or press Delete/Backspace while focused to close and observe automatic fallback.
        </div>
      ),
    },
    { key: "archived", label: "Archived", disabled: true, content: null },
  ]);

  return (
    <div className="af-base-demo">
      <section className="af-base-panel" data-wide>
        <header className="af-base-panel__head">
          <strong>Workspace Tabs</strong>
          <span>Leading-edge stretch indicator (`line` default / `pill` / `segmented`), counts, and closable tabs</span>
        </header>
        <div className="af-adv-toolbar">
          <button
            type="button"
            className="af-adv-choice"
            data-active={variant === "line" || undefined}
            onClick={() => setVariant("line")}
          >
            Line
          </button>
          <button
            type="button"
            className="af-adv-choice"
            data-active={variant === "pill" || undefined}
            onClick={() => setVariant("pill")}
          >
            Pill
          </button>
          <button
            type="button"
            className="af-adv-choice"
            data-active={variant === "segmented" || undefined}
            onClick={() => setVariant("segmented")}
          >
            Segmented
          </button>
        </div>
        <AfTabs
          variant={variant}
          defaultActiveKey="overview"
          items={tabs}
          onTabClose={(key) => setTabs((prev) => prev.filter((item) => item.key !== key))}
          extra={
            <AfButton
              size="sm"
              variant="ghost"
              icon="plus"
              onClick={() =>
                setTabs((prev) => {
                  const archived = prev[prev.length - 1];
                  const body = prev.slice(0, -1);
                  const idx = body.length + 1;
                  return [
                    ...body,
                    {
                      key: `view-${Date.now()}`,
                      label: `View ${idx}`,
                      closable: true,
                      content: <div className="af-adv-panel">Custom ad-hoc inspection tab #{idx}.</div>,
                    },
                    archived,
                  ];
                })
              }
            >
              New tab
            </AfButton>
          }
        />
      </section>
    </div>
  );
}

type FileEntry = {
  id: string;
  name: string;
  size: string;
  folder: string;
  pinned: boolean;
};

/** 右键菜单预览：1:1 对齐 affectUI 多文件行 + 空白目录区动态 `items(target)`、行高亮锁与多级子菜单。 */
function ContextMenuSpecimen() {
  const [sortBy, setSortBy] = useState<"name" | "modified" | "size">("modified");
  const [status, setStatus] = useState("Right-click a file row or empty folder space (or press Shift+F10)");
  const [files, setFiles] = useState<FileEntry[]>([
    {
      id: "f1",
      name: "Support tickets – weekly summary.pdf",
      size: "1.8 MB",
      folder: "Q4 Reports",
      pinned: true,
    },
    { id: "f2", name: "export.rs", size: "14 KB", folder: "Shared", pinned: false },
    { id: "f3", name: "cost-report-w41.csv", size: "412 KB", folder: "Q4 Reports", pinned: false },
    { id: "f4", name: "latency-by-model.png", size: "890 KB", folder: "Shared", pinned: false },
  ]);

  const buildMenuItems = (target: HTMLElement): AfContextMenuItem[] => {
    const fileRow = target.closest<HTMLElement>("[data-file-id]");
    const fileId = fileRow?.getAttribute("data-file-id");
    const file = files.find((f) => f.id === fileId);

    if (file) {
      return [
        { type: "label", id: "lbl-file", label: file.name },
        {
          id: "open",
          label: "Open",
          icon: "file",
          shortcut: "⌘O",
          onSelect: () => setStatus(`Opened "${file.name}"`),
        },
        {
          id: "duplicate",
          label: "Duplicate",
          icon: "copy",
          shortcut: "⌘D",
          onSelect: () => setStatus(`Duplicated "${file.name}"`),
        },
        {
          id: "move-to",
          label: "Move to",
          icon: "folder",
          submenu: ["Q4 Reports", "Shared", "Archive"].map((dest) => ({
            type: "radio" as const,
            id: `dest-${dest}`,
            label: dest,
            checked: file.folder === dest,
            onSelect: () => {
              setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, folder: dest } : f)));
              setStatus(`Moved "${file.name}" → ${dest}`);
            },
          })),
        },
        {
          type: "checkbox",
          id: "pin",
          divider: true,
          keepOpen: true,
          label: "Pin to top",
          checked: file.pinned,
          onCheckedChange: (checked) => {
            setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, pinned: checked } : f)));
            setStatus(`${checked ? "Pinned" : "Unpinned"} "${file.name}"`);
          },
        },
        {
          id: "delete",
          divider: true,
          danger: true,
          icon: "trash",
          label: "Delete",
          shortcut: "⌘⌫",
          onSelect: () => {
            setFiles((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== file.id) : prev));
            setStatus(`Deleted "${file.name}"`);
          },
        },
      ];
    }

    return [
      { type: "label", id: "lbl-folder", label: "Workspace folder" },
      {
        id: "new-folder",
        label: "New folder",
        icon: "folder",
        shortcut: "⇧⌘N",
        onSelect: () => setStatus("Created new folder"),
      },
      {
        id: "upload",
        label: "Upload artifact…",
        icon: "upload",
        shortcut: "⌘U",
        onSelect: () => setStatus("Opened file picker"),
      },
      {
        id: "sort-sub",
        divider: true,
        label: "Sort by",
        icon: "filter",
        submenu: [
          {
            type: "radio",
            id: "s-mod",
            label: "Date modified",
            checked: sortBy === "modified",
            onSelect: () => {
              setSortBy("modified");
              setStatus("Sorted by date modified");
            },
          },
          {
            type: "radio",
            id: "s-name",
            label: "Name",
            checked: sortBy === "name",
            onSelect: () => {
              setSortBy("name");
              setStatus("Sorted by name");
            },
          },
          {
            type: "radio",
            id: "s-size",
            label: "File size",
            checked: sortBy === "size",
            onSelect: () => {
              setSortBy("size");
              setStatus("Sorted by file size");
            },
          },
        ],
      },
    ];
  };

  return (
    <div className="af-base-demo">
      <section className="af-base-panel" data-wide>
        <header className="af-base-panel__head">
          <strong>Files · {files.length}</strong>
          <span>{status}</span>
        </header>
        <AfContextMenu items={buildMenuItems} aria-label="File actions">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "var(--af-r-md)",
              background: "var(--af-surface)",
              boxShadow: "var(--af-shadow-hairline)",
              overflow: "hidden",
            }}
          >
            {files.map((file, idx) => (
              <div
                key={file.id}
                role="row"
                tabIndex={0}
                data-context-target
                data-file-id={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 12px",
                  cursor: "context-menu",
                  boxShadow: idx < files.length - 1 ? "var(--af-divider-hairline)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <AfIcon name="file" size={14} />
                  <span
                    style={{
                      fontSize: "var(--af-fs-md)",
                      fontWeight: 500,
                      color: "var(--af-ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                  {file.pinned ? <AfBadge tone="accent">Pinned</AfBadge> : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                  <span style={{ fontSize: "var(--af-fs-xs)", color: "var(--af-muted)" }}>{file.folder}</span>
                  <span
                    style={{
                      fontSize: "var(--af-fs-xs)",
                      color: "var(--af-faint)",
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 48,
                      textAlign: "right",
                    }}
                  >
                    {file.size}
                  </span>
                </div>
              </div>
            ))}
            <div
              data-context-target
              tabIndex={0}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                background: "var(--af-surface-sunken)",
                boxShadow: "inset 0 0.5px 0 var(--af-line)",
                fontSize: "var(--af-fs-xs)",
                color: "var(--af-muted)",
                cursor: "context-menu",
              }}
            >
              Empty folder area — right-click here for folder actions
            </div>
          </div>
        </AfContextMenu>
      </section>
    </div>
  );
}

/** 基础导航与上下文浮层组件规格。 */
export const advancedSpecs: ComponentSpec[] = [
  {
    id: "tabs",
    title: "Tabs",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。默认展示底部 line 拉伸指示条，同时支持 pill / segmented、计数徽标、可关闭页签与键盘漫游。",
    render: TabsSpecimen,
    width: 720,
  },
  {
    id: "context-menu",
    title: "Context Menu",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持动态 items(target)、右键激活行高亮锁、Shift+F10/长按触发、斜角安全子菜单与 A–Z 快跳。",
    render: ContextMenuSpecimen,
    width: 720,
    height: 340,
  },
];
