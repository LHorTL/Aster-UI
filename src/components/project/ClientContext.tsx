import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { AfPortal, cn } from "../../primitives";
import { AfSwitch } from "../../ui";
import { useFloatingAnchor } from "../agents-c/_marks";
import { BrandAppTile } from "../_shared/project";
import { ProjectPersonAvatar } from "./_avatars";

export interface ClientKpiItem {
  id: string;
  label: string;
  value: string;
  previous?: string;
  delta?: string;
  positive?: boolean;
  series: number[];
}

export interface ClientReportItem {
  id: string;
  title: string;
  period: string;
  summary: string;
  updatedAt: string;
}

export interface ClientFileAttachment {
  name: string;
  type: "pdf" | "xlsx" | "csv" | "doc";
}

export interface ContextEntry {
  id: string;
  kind: "note" | "report" | "files" | "integration";
  author?: string;
  at: string;
  text?: string;
  reportTitle?: string;
  files?: ClientFileAttachment[];
  integration?: { app: string; connected: boolean };
}

export interface ContextClient {
  id: string;
  name: string;
  meta: string;
  mark?: ReactNode;
  color?: string;
  kpis: ClientKpiItem[];
  reports: ClientReportItem[];
  context: ContextEntry[];
}

export interface AfClientContextProps {
  /** 客户工作区列表。 */
  clients?: ContextClient[];
  /** 覆盖当前客户的时间线条目。 */
  contextEntries?: ContextEntry[];
  /** 当前操作者信息。 */
  me?: { name: string; avatar?: string };
  /** 新增上下文回调。 */
  onAddContext?: (clientId: string, text: string, files: ClientFileAttachment[]) => void;
  /** 新建客户回调。 */
  onCreateClient?: (name: string) => void;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfClientContextPatternProps = AfClientContextProps;

export const DEFAULT_CONTEXT_CLIENTS: ContextClient[] = [
  {
    id: "northwind",
    name: "Northwind Logistics",
    meta: "Northwind Logistics GmbH · EUR · Fiscal year ends Dec 31",
    color: "#0190fe",
    kpis: [
      {
        id: "mrr",
        label: "MRR",
        value: "€48.2k",
        previous: "Previous month €44.5k",
        delta: "+8.4%",
        positive: true,
        series: [34, 35.5, 34.8, 37.2, 36.5, 40.5, 39.8, 43.5, 42.8, 46.2, 48.2],
      },
      {
        id: "cash",
        label: "Cash",
        value: "€612k",
        previous: "Previous month €636k",
        delta: "-3.8%",
        positive: false,
        series: [665, 658, 661, 648, 652, 636, 640, 624, 628, 616, 612],
      },
      {
        id: "margin",
        label: "Gross margin",
        value: "64.1%",
        previous: "Previous month 61.9%",
        delta: "+2.2%",
        positive: true,
        series: [58.5, 60.8, 59.4, 62.1, 60.6, 63.2, 61.8, 63.9, 62.7, 64.4, 64.1],
      },
      {
        id: "burn",
        label: "Net burn",
        value: "€36.0k",
        previous: "Previous month €41.0k",
        delta: "-12.2%",
        positive: true,
        series: [46, 43.5, 44.8, 40.5, 41.8, 38.2, 39.4, 36.8, 37.9, 35.6, 36.0],
      },
    ],
    reports: [
      {
        id: "r1",
        title: "Monthly P&L",
        period: "Oct 2026",
        updatedAt: "Updated 1d ago",
        summary: "Consolidated EUR statement across Hamburg HQ and Danish entity; gross margin expanded 220 bps.",
      },
      {
        id: "r2",
        title: "Cash runway",
        period: "16-week rolling",
        updatedAt: "Updated 3d ago",
        summary: "Runway stands at 17.0 months assuming the Nordics pilot converts on schedule.",
      },
      {
        id: "r3",
        title: "Q3 Board Pack",
        period: "Q3 2026",
        updatedAt: "Updated 6d ago",
        summary: "Fleet utilization hit 88%; DACH enterprise renewals tracked at 107% net retention.",
      },
    ],
    context: [
      {
        id: "c1",
        kind: "note",
        author: "Lena Hart",
        at: "today",
        text: "CFO wants every figure in the @Monthly P&L in EUR, also for the Danish entity – no converted totals.",
      },
      {
        id: "c2",
        kind: "report",
        author: "Jonas Weber",
        at: "1d ago",
        reportTitle: "Monthly P&L",
      },
      {
        id: "c3",
        kind: "files",
        author: "Jonas Weber",
        at: "2d ago",
        files: [
          { name: "budget-2027.pdf", type: "pdf" },
          { name: "fleet-costs-Q3.xlsx", type: "xlsx" },
        ],
      },
      {
        id: "c4",
        kind: "note",
        author: "Lena Hart",
        at: "4d ago",
        text: "Renewal talks start in November. They'll ask for a lower rate if the Nordics pilot slips – keep the @Cash runway current.",
      },
      {
        id: "c5",
        kind: "integration",
        at: "1w ago",
        integration: { app: "Stripe", connected: true },
      },
    ],
  },
  {
    id: "lumen",
    name: "Lumen Labs",
    meta: "Lumen BioAI Inc. · USD · Fiscal year ends Mar 31",
    color: "#13b3a0",
    kpis: [
      {
        id: "mrr",
        label: "MRR",
        value: "$92.4k",
        previous: "Previous month $81.0k",
        delta: "+14.1%",
        positive: true,
        series: [62, 66, 70, 74, 79, 83, 88, 92.4],
      },
      {
        id: "cash",
        label: "Cash",
        value: "$2.41M",
        previous: "Previous month $2.49M",
        delta: "-3.2%",
        positive: true,
        series: [2.62, 2.58, 2.55, 2.52, 2.49, 2.46, 2.44, 2.41],
      },
      {
        id: "margin",
        label: "Gross margin",
        value: "78.6%",
        previous: "Previous month 77.2%",
        delta: "+1.4%",
        positive: true,
        series: [74, 75, 75.8, 76.4, 77, 77.6, 78.1, 78.6],
      },
      {
        id: "burn",
        label: "Net burn",
        value: "$64.0k",
        previous: "Previous month $71.0k",
        delta: "-9.8%",
        positive: true,
        series: [80, 77, 75, 72, 70, 68, 66, 64],
      },
    ],
    reports: [
      {
        id: "lr1",
        title: "GPU Spend Audit",
        period: "Oct 2026",
        updatedAt: "Updated yesterday",
        summary: "Batch inference migration cut per-1k token compute cost by 28%.",
      },
    ],
    context: [
      {
        id: "lc1",
        kind: "note",
        author: "Lena Hart",
        at: "yesterday",
        text: "Highlight inference savings from @GPU Spend Audit on slide 4 before Friday's partner sync.",
      },
      {
        id: "lc2",
        kind: "integration",
        at: "4d ago",
        integration: { app: "Stripe", connected: true },
      },
    ],
  },
];

function buildSparklinePath(values: number[], width = 54, height = 18): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - 2.5 - ((v - min) / range) * (height - 5);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderTextWithMentions(text: string, reportTitles: string[]) {
  if (!text.includes("@")) return text;
  const sorted = [...reportTitles].sort((a, b) => b.length - a.length);
  const parts: ReactNode[] = [];
  let rest = text;
  let keyIdx = 0;

  while (rest.length > 0) {
    const atPos = rest.indexOf("@");
    if (atPos === -1) {
      parts.push(rest);
      break;
    }
    if (atPos > 0) {
      parts.push(rest.slice(0, atPos));
    }
    const afterAt = rest.slice(atPos + 1);
    const matched = sorted.find((title) => afterAt.startsWith(title));
    if (matched) {
      parts.push(
        <span key={`m-${keyIdx++}`} className="af-pj-ctx__mention">
          <AfIcon name="file" size={11} />
          <span>{matched}</span>
        </span>,
      );
      rest = afterAt.slice(matched.length);
    } else {
      const wordMatch = afterAt.match(/^[A-Za-z0-9_&.-]+/);
      if (wordMatch) {
        parts.push(
          <span key={`m-${keyIdx++}`} className="af-pj-ctx__mention">
            <AfIcon name="file" size={11} />
            <span>{wordMatch[0]}</span>
          </span>,
        );
        rest = afterAt.slice(wordMatch[0].length);
      } else {
        parts.push("@");
        rest = afterAt;
      }
    }
  }
  return parts;
}

type ClientTab = "context" | "reports" | "financials" | "settings";
type EntryFilter = "all" | "note" | "report" | "files" | "integration";

/**
 * 客户共享上下文工作区（Pro Workspace Block）：顶栏客户切换器 + 4 枚微走势 KPI 卡 + `@Report` 时间线。
 */
export function AfClientContext({
  clients: clientsProp = DEFAULT_CONTEXT_CLIENTS,
  contextEntries,
  me = { name: "Sofia" },
  onAddContext,
  onCreateClient,
  className,
}: AfClientContextProps = {}) {
  const [clients, setClients] = useState<ContextClient[]>(clientsProp);
  const [clientId, setClientId] = useState<string>(clientsProp[0]?.id ?? "northwind");
  const [activeTab, setActiveTab] = useState<ClientTab>("context");
  const [pinnedKpis, setPinnedKpis] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [openReports, setOpenReports] = useState<Record<string, boolean>>({ r1: true });
  const [noteDraft, setNoteDraft] = useState("");
  const [stagedFiles, setStagedFiles] = useState<ClientFileAttachment[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [lockCurrency, setLockCurrency] = useState(true);

  const switcherBtnRef = useRef<HTMLButtonElement | null>(null);
  const switcherMenuRef = useRef<HTMLDivElement | null>(null);
  const switcherStyle = useFloatingAnchor(
    switcherOpen,
    switcherBtnRef,
    switcherMenuRef,
    () => setSwitcherOpen(false),
    { width: 224, align: "end" },
  );

  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterStyle = useFloatingAnchor(
    filterOpen,
    filterBtnRef,
    filterMenuRef,
    () => setFilterOpen(false),
    { width: 176, align: "end" },
  );

  const client = useMemo(
    () => clients.find((c) => c.id === clientId) ?? clients[0],
    [clients, clientId],
  );

  const entries = contextEntries ?? client?.context ?? [];
  const reportTitles = useMemo(
    () => (client?.reports ?? []).map((r) => r.title),
    [client],
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((item) => {
      if (entryFilter !== "all" && item.kind !== entryFilter) return false;
      if (!q) return true;
      const hay = [
        item.text ?? "",
        item.author ?? "",
        item.reportTitle ?? "",
        item.integration?.app ?? "",
        ...(item.files?.map((f) => f.name) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, entryFilter, search]);

  const handleSubmitContext = () => {
    const clean = noteDraft.trim();
    if (!clean && stagedFiles.length === 0) return;
    const newEntry: ContextEntry =
      stagedFiles.length > 0 && !clean
        ? {
            id: `ctx-${Date.now()}`,
            kind: "files",
            author: me.name,
            at: "just now",
            files: stagedFiles,
          }
        : {
            id: `ctx-${Date.now()}`,
            kind: "note",
            author: me.name,
            at: "just now",
            text: clean,
            files: stagedFiles.length > 0 ? stagedFiles : undefined,
          };

    setClients((prev) =>
      prev.map((c) =>
        c.id === client.id ? { ...c, context: [newEntry, ...c.context] } : c,
      ),
    );
    onAddContext?.(client.id, clean, stagedFiles);
    setNoteDraft("");
    setStagedFiles([]);
    setMentionOpen(false);
  };

  const handleStageSampleFile = () => {
    const sample: ClientFileAttachment =
      stagedFiles.length % 2 === 0
        ? { name: "board-notes-q4.pdf", type: "pdf" }
        : { name: "cohort-retention.csv", type: "csv" };
    setStagedFiles((prev) => [...prev, sample]);
  };

  const handleCreateClient = () => {
    const clean = newClientName.trim();
    if (!clean) return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `c-${Date.now()}`;
    const created: ContextClient = {
      id,
      name: clean,
      meta: `${clean} · EUR · Fiscal year ends Dec 31`,
      color: "#7c3aed",
      kpis: client.kpis,
      reports: client.reports,
      context: [],
    };
    setClients((prev) => [...prev, created]);
    setClientId(id);
    setNewClientName("");
    setSwitcherOpen(false);
    onCreateClient?.(clean);
  };

  const tabOrder: ClientTab[] = ["context", "reports", "financials", "settings"];

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabOrder.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabOrder.length) % tabOrder.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabOrder.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setActiveTab(tabOrder[next]);
    }
  };

  if (!client) return null;

  return (
    <section className={cn("af-pj-ctx", className)} aria-label={`${client.name} context`}>
      <header className="af-pj-ctx__head">
        <div className="af-pj-ctx__brand">
          <span
            className="af-pj-ctx__mark"
            style={{ background: client.color ?? "#0190fe" }}
          >
            {client.mark ?? client.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="af-pj-ctx__titles">
            <h2 className="af-pj-ctx__name">{client.name}</h2>
            <p className="af-pj-ctx__meta">{client.meta}</p>
          </div>
        </div>

        <div className="af-pj-ctx__head-actions">
          <button type="button" className="af-pj-ctx__sync-chip" aria-label="Sync status: Synced 3m ago">
            <span className="af-pj-ctx__sync-dot" aria-hidden="true" />
            <span>Synced 3m ago</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12a7 7 0 0 1-12.3 4.6M5 12a7 7 0 0 1 12.3-4.6M17.5 4v3.5H14M6.5 20v-3.5H10" />
            </svg>
          </button>

          <button
            ref={switcherBtnRef}
            type="button"
            className="af-pj-ctx__switch-btn"
            aria-haspopup="dialog"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen((o) => !o)}
          >
            <span>Switch client</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m8 10 4-4 4 4M8 14l4 4 4-4" />
            </svg>
          </button>

          {switcherOpen && (
            <AfPortal>
              <div
                ref={switcherMenuRef}
                className="af-pj-ctx__pop"
                role="dialog"
                aria-label="Switch client"
                style={switcherStyle}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSwitcherOpen(false);
                    switcherBtnRef.current?.focus();
                  }
                }}
              >
                <div className="af-pj-ctx__pop-list">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="af-pj-ctx__pop-item"
                      data-active={c.id === client.id ? "" : undefined}
                      onClick={() => {
                        setClientId(c.id);
                        setSwitcherOpen(false);
                      }}
                    >
                      <span
                        className="af-pj-ctx__pop-dot"
                        style={{ background: c.color ?? "#0190fe" }}
                      />
                      <span className="af-pj-ctx__pop-label">{c.name}</span>
                      {c.id === client.id && <AfIcon name="check" size={12} />}
                    </button>
                  ))}
                </div>
                <div className="af-pj-ctx__pop-new">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateClient();
                      }
                    }}
                    placeholder="New client…"
                    aria-label="New client name"
                  />
                  <button type="button" onClick={handleCreateClient}>
                    Add
                  </button>
                </div>
              </div>
            </AfPortal>
          )}
        </div>
      </header>

      <div className="af-pj-ctx__kpis">
        {client.kpis.map((kpi) => {
          const pinned = Boolean(pinnedKpis[kpi.id]);
          const path = buildSparklinePath(kpi.series);
          return (
            <button
              key={kpi.id}
              type="button"
              className="af-pj-ctx__kpi"
              data-active={pinned ? "" : undefined}
              aria-pressed={pinned}
              onClick={() =>
                setPinnedKpis((prev) => ({ ...prev, [kpi.id]: !prev[kpi.id] }))
              }
            >
              <span className="af-pj-ctx__kpi-label">{kpi.label}</span>
              <div className="af-pj-ctx__kpi-row">
                <strong className="af-pj-ctx__kpi-val">{kpi.value}</strong>
                {path && (
                  <svg
                    className="af-pj-ctx__spark"
                    width="54"
                    height="18"
                    viewBox="0 0 54 18"
                    aria-hidden="true"
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke="#0190fe"
                      strokeWidth={1.55}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="af-pj-ctx__card">
        <div className="af-pj-ctx__bar">
          <div className="af-pj-ctx__tabs" role="tablist" aria-label="Client sections">
            {tabOrder.map((tabId, idx) => (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={activeTab === tabId}
                className="af-pj-ctx__tab"
                data-active={activeTab === tabId ? "" : undefined}
                onClick={() => setActiveTab(tabId)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                {tabId === "context"
                  ? "Context"
                  : tabId === "reports"
                    ? "Reports"
                    : tabId === "financials"
                      ? "Financials"
                      : "Settings"}
              </button>
            ))}
          </div>

          {activeTab === "context" && (
            <div className="af-pj-ctx__tools">
              <label className="af-pj-ctx__search">
                <AfIcon name="search" size={13} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  aria-label="Search timeline"
                />
              </label>

              <button
                ref={filterBtnRef}
                type="button"
                className="af-pj-ctx__filter-btn"
                aria-haspopup="menu"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((o) => !o)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M7 12h10M10 17h4" />
                </svg>
                <span>
                  {entryFilter === "all"
                    ? "All"
                    : entryFilter === "note"
                      ? "Notes"
                      : entryFilter === "report"
                        ? "Reports"
                        : entryFilter === "files"
                          ? "Files"
                          : "Integrations"}
                </span>
                <AfIcon name="chevronDown" size={11} />
              </button>

              {filterOpen && (
                <AfPortal>
                  <div
                    ref={filterMenuRef}
                    className="af-pj-ctx__pop"
                    role="menu"
                    aria-label="Filter timeline entries"
                    style={filterStyle}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setFilterOpen(false);
                        filterBtnRef.current?.focus();
                      }
                    }}
                  >
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "note", label: "Notes" },
                        { id: "report", label: "Reports" },
                        { id: "files", label: "Files" },
                        { id: "integration", label: "Integrations" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={entryFilter === opt.id}
                        className="af-pj-ctx__pop-item"
                        onClick={() => {
                          setEntryFilter(opt.id);
                          setFilterOpen(false);
                        }}
                      >
                        <span className="af-pj-ctx__pop-label">{opt.label}</span>
                        {entryFilter === opt.id && <AfIcon name="check" size={12} />}
                      </button>
                    ))}
                  </div>
                </AfPortal>
              )}
            </div>
          )}
        </div>

        {activeTab === "context" && (
          <div className="af-pj-ctx__panel" role="tabpanel">
            <div className="af-pj-ctx__composer-row-outer">
              <span className="af-pj-ctx__me-avatar" aria-hidden="true">
                <ProjectPersonAvatar name={me.name} avatar={me.avatar} size={28} />
              </span>
              <div className="af-pj-ctx__composer">
                <textarea
                  rows={2}
                  value={noteDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteDraft(val);
                    setMentionOpen(val.endsWith("@"));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                      e.preventDefault();
                      handleSubmitContext();
                    } else if (e.key === "Escape" && mentionOpen) {
                      setMentionOpen(false);
                    }
                  }}
                  placeholder="Add a goal, request or decision – type @ to mention a report"
                  aria-label="Add context note"
                />

                {mentionOpen && client.reports.length > 0 && (
                  <div className="af-pj-ctx__mentions" role="listbox" aria-label="Mention a report">
                    {client.reports.map((rep) => (
                      <button
                        key={rep.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="af-pj-ctx__mention-opt"
                        onClick={() => {
                          setNoteDraft((prev) => `${prev}${rep.title} `);
                          setMentionOpen(false);
                        }}
                      >
                        <AfIcon name="file" size={12} />
                        <span>{rep.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {stagedFiles.length > 0 && (
                  <div className="af-pj-ctx__staged">
                    {stagedFiles.map((f, idx) => (
                      <span key={`${f.name}-${idx}`} className="af-pj-ctx__file-chip">
                        <AfIcon name="file" size={11} />
                        <span>{f.name}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="af-pj-ctx__composer-foot">
                  <button
                    type="button"
                    className="af-pj-ctx__attach-btn"
                    aria-label="Attach file"
                    onClick={handleStageSampleFile}
                  >
                    <AfIcon name="paperclip" size={14} />
                  </button>
                  <div className="af-pj-ctx__composer-submit">
                    <span className="af-pj-ctx__kbd" aria-hidden="true">
                      <kbd>⌘</kbd>
                      <kbd>Enter</kbd>
                    </span>
                    <button
                      type="button"
                      className="af-pj-ctx__submit-btn"
                      data-empty={!noteDraft.trim() && stagedFiles.length === 0 ? "" : undefined}
                      onClick={handleSubmitContext}
                    >
                      Add context
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ol className="af-pj-ctx__timeline">
              {filteredEntries.map((entry) => (
                <li key={entry.id} className="af-pj-ctx__entry">
                  <span className="af-pj-ctx__entry-node" data-kind={entry.kind} aria-hidden="true">
                    {entry.kind === "integration" ? (
                      <BrandAppTile
                        id={(entry.integration?.app ?? "stripe").toLowerCase()}
                        name={entry.integration?.app ?? "Stripe"}
                        size={22}
                      />
                    ) : entry.kind === "report" ? (
                      <AfIcon name="chart" size={12} />
                    ) : entry.kind === "files" ? (
                      <AfIcon name="folder" size={12} />
                    ) : (
                      <AfIcon name="message" size={12} />
                    )}
                  </span>

                  <div className="af-pj-ctx__entry-body">
                    <div className="af-pj-ctx__entry-meta">
                      {entry.author && (
                        <>
                          <span className="af-pj-ctx__entry-av" aria-hidden="true">
                            <ProjectPersonAvatar name={entry.author} size={20} />
                          </span>
                          <strong>{entry.author}</strong>
                        </>
                      )}
                      {entry.kind === "note" && <span>added context</span>}
                      {entry.kind === "report" && (
                        <>
                          <span>generated</span>
                          <strong className="af-pj-ctx__inline-strong">{entry.reportTitle}</strong>
                        </>
                      )}
                      {entry.kind === "files" && entry.files && (
                        <>
                          <span>added</span>
                          {entry.files.map((f, fIdx) => (
                            <span key={f.name} className="af-pj-ctx__inline-file-wrap">
                              {fIdx > 0 && <span>and </span>}
                              <span className="af-pj-ctx__file-chip">
                                {f.type === "pdf" ? (
                                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M4 2h5.5L13 5.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" fill="#ef4444" fillOpacity="0.16" stroke="#ef4444" strokeWidth="1.2" />
                                    <path d="M9.2 2v3.6H13" stroke="#ef4444" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : (
                                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <rect x="2.5" y="2.5" width="11" height="11" rx="1.8" fill="#16a34a" fillOpacity="0.16" stroke="#16a34a" strokeWidth="1.2" />
                                    <path d="M2.5 6.5h11M6.5 6.5v7" stroke="#16a34a" strokeWidth="1.15" />
                                  </svg>
                                )}
                                <span>{f.name}</span>
                              </span>
                            </span>
                          ))}
                        </>
                      )}
                      {entry.kind === "integration" && entry.integration && (
                        <>
                          <span>Connected</span>
                          <strong>{entry.integration.app}</strong>
                        </>
                      )}
                      <span className="af-pj-ctx__entry-when">{entry.at}</span>
                    </div>

                    {entry.text && (
                      <div className="af-pj-ctx__entry-bubble">
                        <p className="af-pj-ctx__entry-text">
                          {renderTextWithMentions(entry.text, reportTitles)}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="af-pj-ctx__reports" role="tabpanel">
            {client.reports.map((rep) => {
              const isOpen = Boolean(openReports[rep.id]);
              return (
                <div key={rep.id} className="af-pj-ctx__report" data-open={isOpen ? "" : undefined}>
                  <button
                    type="button"
                    className="af-pj-ctx__report-head"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenReports((prev) => ({ ...prev, [rep.id]: !prev[rep.id] }))
                    }
                  >
                    <AfIcon name="file" size={14} />
                    <strong className="af-pj-ctx__report-title">{rep.title}</strong>
                    <span className="af-pj-ctx__report-period">{rep.period}</span>
                    <span className="af-pj-ctx__report-updated">{rep.updatedAt}</span>
                    <AfIcon name={isOpen ? "chevronDown" : "chevronRight"} size={13} />
                  </button>
                  {isOpen && <p className="af-pj-ctx__report-body">{rep.summary}</p>}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "financials" && (
          <div className="af-pj-ctx__fin-list" role="tabpanel">
            {client.kpis.map((kpi) => {
              const pinned = Boolean(pinnedKpis[kpi.id]);
              return (
                <button
                  key={kpi.id}
                  type="button"
                  className="af-pj-ctx__fin-row"
                  data-active={pinned ? "" : undefined}
                  aria-pressed={pinned}
                  onClick={() =>
                    setPinnedKpis((prev) => ({ ...prev, [kpi.id]: !prev[kpi.id] }))
                  }
                >
                  <div className="af-pj-ctx__fin-main">
                    <div className="af-pj-ctx__fin-top">
                      <strong>{kpi.label}</strong>
                      {kpi.previous && <span>{kpi.previous}</span>}
                    </div>
                    <div className="af-pj-ctx__fin-bar">
                      <span style={{ width: pinned ? "82%" : "64%" }} />
                    </div>
                  </div>
                  <div className="af-pj-ctx__fin-right">
                    <strong>{kpi.value}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="af-pj-ctx__settings" role="tabpanel">
            <div className="af-pj-ctx__setting-row">
              <div>
                <strong>Hourly ledger &amp; billing sync</strong>
                <p>Pull new Stripe and ERP journal entries automatically.</p>
              </div>
              <AfSwitch checked={autoSync} onChange={setAutoSync} />
            </div>
            <div className="af-pj-ctx__setting-row">
              <div>
                <strong>Lock reporting currency</strong>
                <p>Keep consolidated figures in entity functional currency.</p>
              </div>
              <AfSwitch checked={lockCurrency} onChange={setLockCurrency} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** `AfClientContext` 兼容模式别名。 */
export const AfClientContextPattern = AfClientContext;
export const ClientContext = AfClientContext;
