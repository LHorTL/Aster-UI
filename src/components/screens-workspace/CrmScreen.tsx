import { useMemo, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { BrandAppTile, BrandGlyph } from "./BrandMarks";
import {
  WksSidebarExpandButton,
  WorkspaceInsetShell,
  type AfWorkspaceUser,
  type WksGroup,
  type WksNavItem,
} from "./WorkspaceShell";

export type AfCrmCompany = {
  id: string;
  name: string;
  category: string;
  domain: string;
  owner: string;
  value: number;
  stage: string;
  contact: string;
};

export type AfCrmProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
  onAdd?: (view: string) => void;
  companies?: AfCrmCompany[];
};

const NAV: WksNavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Companies", icon: "store", count: 284 },
  { label: "Contacts", icon: "users" },
  { label: "Deals", icon: "wallet" },
  { label: "Reports", icon: "chart" },
];

const GROUPS: WksGroup[] = [
  {
    label: "Pipelines",
    items: [
      { label: "New business", icon: "sparkle" },
      { label: "Renewals", icon: "refresh" },
      { label: "Partnerships", icon: "users" },
    ],
  },
];

const DEFAULT_COMPANIES: AfCrmCompany[] = [
  { id: "c-notion", name: "Notion", category: "Productivity", domain: "notion.so", owner: "Mara Klein", value: 48000, stage: "Negotiation", contact: "Today" },
  { id: "c-linear", name: "Linear", category: "Planning", domain: "linear.app", owner: "Jonas Weber", value: 12500, stage: "Proposal", contact: "Yesterday" },
  { id: "c-figma", name: "Figma", category: "Design", domain: "figma.com", owner: "Mara Klein", value: 86000, stage: "Won", contact: "Mar 6" },
  { id: "c-stripe", name: "Stripe", category: "Payments", domain: "stripe.com", owner: "Lea Braun", value: 124000, stage: "Qualified", contact: "Mar 5" },
  { id: "c-shopify", name: "Shopify", category: "E-commerce", domain: "shopify.com", owner: "Jonas Weber", value: 9800, stage: "New", contact: "Mar 4" },
  { id: "c-vercel", name: "Vercel", category: "Developer Tools", domain: "vercel.com", owner: "Lea Braun", value: 62000, stage: "Proposal", contact: "Mar 3" },
  { id: "c-airtable", name: "Airtable", category: "Productivity", domain: "airtable.com", owner: "Mara Klein", value: 37500, stage: "Qualified", contact: "Mar 1" },
  { id: "c-hubspot", name: "HubSpot", category: "CRM", domain: "hubspot.com", owner: "Tom Fischer", value: 21000, stage: "New", contact: "Feb 27" },
  { id: "c-clickup", name: "ClickUp", category: "Planning", domain: "clickup.com", owner: "Tom Fischer", value: 6400, stage: "Lost", contact: "Feb 25" },
  { id: "c-webflow", name: "Webflow", category: "Design", domain: "webflow.com", owner: "Lea Braun", value: 18900, stage: "Negotiation", contact: "Feb 24" },
];

type EditableField = "name" | "category" | "domain" | "owner" | "value" | "stage" | "contact";

const COLUMNS: { key: EditableField; label: string; icon: AffectIconKey; align?: "right" }[] = [
  { key: "name", label: "Company", icon: "list" },
  { key: "category", label: "Category", icon: "tag" },
  { key: "domain", label: "Domain", icon: "globe" },
  { key: "owner", label: "Owner", icon: "user" },
  { key: "value", label: "Value", icon: "wallet", align: "right" },
  { key: "stage", label: "Stage", icon: "sidebar" },
  { key: "contact", label: "Last contact", icon: "calendar" },
];

function stageTone(stage: string): string | undefined {
  const s = stage.toLowerCase();
  if (s === "won") return "success";
  if (s === "negotiation") return "warning";
  if (s === "proposal") return "info";
  if (s === "qualified") return "purple";
  if (s === "lost") return "danger";
  return undefined;
}

function categoryTone(category: string): string | undefined {
  const c = category.toLowerCase();
  if (c === "planning" || c === "crm") return "info";
  if (c === "payments") return "purple";
  if (c === "design") return "danger";
  if (c === "e-commerce") return "warning";
  return undefined;
}

const EMPTY_META: Record<string, { title: string; btn: string }> = {
  "Company CRM": { title: "No companies yet", btn: "Add company" },
  Deals: { title: "No deals yet", btn: "Add deal" },
  Contacts: { title: "No contacts yet", btn: "Add contact" },
  Renewals: { title: "No renewals yet", btn: "Add renewal" },
};

export function AfCrm(props: AfCrmProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    onAdd,
    companies: companiesProp,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Companies");
  const [views, setViews] = useState<string[]>(["Company CRM", "Deals", "Contacts", "Renewals"]);
  const [activeView, setActiveView] = useState("Company CRM");
  const [roleFilter, setRoleFilter] = useState("Head of Sales");
  const [starred, setStarred] = useState(false);

  const [rows, setRows] = useState<AfCrmCompany[]>(() => companiesProp ?? DEFAULT_COMPANIES);
  const [past, setPast] = useState<AfCrmCompany[][]>([]);
  const [future, setFuture] = useState<AfCrmCompany[][]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<EditableField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<{ id: string; field: EditableField } | null>(null);
  const [draft, setDraft] = useState("");

  const commitRows = (next: AfCrmCompany[]) => {
    setPast((p) => [...p.slice(-19), rows]);
    setFuture([]);
    setRows(next);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [rows, ...f]);
    setRows(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, rows]);
    setRows(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && !editing) {
      if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
  };

  const startEdit = (row: AfCrmCompany, field: EditableField) => {
    setEditing({ id: row.id, field });
    setDraft(field === "value" ? String(row.value) : String(row[field]));
  };

  const saveEdit = () => {
    if (!editing) return;
    const { id, field } = editing;
    setEditing(null);
    const next = rows.map((r) => {
      if (r.id !== id) return r;
      if (field === "value") {
        const parsed = Number(draft.replace(/[^0-9.-]/g, ""));
        return { ...r, value: Number.isFinite(parsed) ? parsed : r.value };
      }
      return { ...r, [field]: draft.trim() || r[field] };
    });
    commitRows(next);
  };

  const addRow = () => {
    const idx = rows.length + 1;
    const created: AfCrmCompany = {
      id: `c-new-${Date.now()}`,
      name: `New company ${idx}`,
      category: "SaaS",
      domain: `company${idx}.com`,
      owner: "Mara Klein",
      value: 15000,
      stage: activeView === "Renewals" ? "Won" : "New",
      contact: "Just now",
    };
    commitRows([...rows, created]);
    onAdd?.(activeView);
  };

  const visibleRows = useMemo(() => {
    let list = rows;
    if (roleFilter !== "Head of Sales") {
      list = list.filter((r) => r.owner === roleFilter);
    }
    if (activeView === "Deals") {
      list = list.filter((r) => r.stage === "Negotiation" || r.stage === "Proposal" || r.stage === "Qualified");
    } else if (activeView === "Renewals") {
      list = list.filter((r) => r.stage === "Won" || r.stage === "Negotiation");
    }
    if (!sortCol) return list;
    return [...list].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, roleFilter, activeView, sortCol, sortDir]);

  const roleMenu: AfMenuItem[] = ["Head of Sales", "Mara Klein", "Jonas Weber", "Lea Braun", "Tom Fischer"].map(
    (label) => ({
      type: "radio",
      id: label,
      label,
      checked: roleFilter === label,
      onSelect: () => setRoleFilter(label),
    }),
  );

  const allViewsMenu: AfMenuItem[] = views.map((v) => ({
    type: "radio",
    id: v,
    label: v,
    checked: activeView === v,
    onSelect: () => setActiveView(v),
  }));

  const showEmpty = empty && !loading && rows === (companiesProp ?? DEFAULT_COMPANIES);
  const emptyInfo = EMPTY_META[activeView] ?? { title: "No records yet", btn: "Add row" };

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={GROUPS}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        if (label === "Deals" || label === "Contacts" || label === "Renewals") setActiveView(label);
        if (label === "Companies") setActiveView("Company CRM");
        onNavigate?.(label);
      }}
      className={className}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <header className="af-wks-topbar">
        <div className="af-wks-topbar__left">
          <WksSidebarExpandButton />
          <div className="af-wks-crumbs">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <AfIcon name="folder" size={13} />
              <span>Sales</span>
            </span>
            <i className="af-wks-crumbs__sep" aria-hidden="true">/</i>
            <AfDropdownMenu items={roleMenu} side="bottom" align="start" width={176}>
              <button type="button" className="af-wks-btn af-wks-btn--ghost" style={{ height: 24, padding: "0 6px" }}>
                <b className="af-wks-crumbs__cur">{roleFilter}</b>
                <AfIcon name="chevronDown" size={11} />
              </button>
            </AfDropdownMenu>
          </div>
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
          <button
            type="button"
            className="af-wks-icon-btn"
            aria-label="Undo (Ctrl Z)"
            title="Undo (Ctrl+Z)"
            disabled={past.length === 0}
            onClick={undo}
          >
            <AfIcon name="undo" size={13} />
          </button>
          <button
            type="button"
            className="af-wks-icon-btn"
            aria-label="Redo (Ctrl Shift Z)"
            title="Redo (Ctrl+Shift+Z)"
            disabled={future.length === 0}
            onClick={redo}
          >
            <AfIcon name="redo" size={13} />
          </button>
        </div>
      </header>

      <nav className="af-wks-crm__views" aria-label="Open views">
        <div className="af-wks-crm__views-left">
          <AfDropdownMenu items={allViewsMenu} side="bottom" align="start" width={172}>
            <button type="button" className="af-wks-icon-btn" aria-label="All views">
              <AfIcon name="sidebar" size={13} />
            </button>
          </AfDropdownMenu>
          <button
            type="button"
            className="af-wks-icon-btn"
            aria-label="New view"
            onClick={() => {
              const name = `View ${views.length + 1}`;
              setViews((prev) => [...prev, name]);
              setActiveView(name);
            }}
          >
            <AfIcon name="grid" size={13} />
          </button>
          <span className="af-wks-crm__vsep" aria-hidden="true" />
          <div className="af-wks-crm__tablist" role="tablist" aria-label="Views">
            {views.map((view) => {
              const viewBrand =
                view === "Company CRM"
                  ? "hubspot"
                  : view === "Deals"
                    ? "stripe"
                    : view === "Contacts"
                      ? "airtable"
                      : view === "Renewals"
                        ? "notion"
                        : null;
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  className="af-wks-crm__tab"
                  aria-selected={activeView === view}
                  onClick={() => setActiveView(view)}
                >
                  {viewBrand ? (
                    <BrandAppTile brand={viewBrand} size={15} radius={4} glyphSize={10} />
                  ) : (
                    <AfIcon name="grid" size={12} />
                  )}
                  <span>{view}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {showEmpty ? (
        <div className="af-wks-empty-wrap">
          <AfEmptyState
            icon="store"
            title={emptyInfo.title}
            text="Import accounts from CSV, HubSpot or Stripe, or add rows directly into your spreadsheet."
            action={
              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={addRow}>
                {emptyInfo.btn}
              </button>
            }
          />
        </div>
      ) : (
        <div className="af-wks-crm__sheet" role="tabpanel" aria-label={activeView}>
          <div className="af-wks-crm__table-wrap">
            <table className="af-wks-crm__table">
              <thead>
                <tr>
                  <th className="af-wks-crm__check-col">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={visibleRows.length > 0 && selectedIds.length === visibleRows.length}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? visibleRows.map((r) => r.id) : [])
                      }
                    />
                  </th>
                  {COLUMNS.map((col) => (
                    <th key={col.key}>
                      <button
                        type="button"
                        className="af-wks-crm__th-btn"
                        style={col.align === "right" ? { justifyContent: "flex-end" } : undefined}
                        onClick={() => {
                          if (sortCol === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortCol(col.key);
                            setSortDir("asc");
                          }
                        }}
                      >
                        <AfIcon name={col.icon} size={11} />
                        <span>{col.label}</span>
                        {sortCol === col.key ? (
                          <AfIcon name={sortDir === "asc" ? "arrowUp" : "arrowDown"} size={10} />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }, (_, idx) => (
                      <tr key={idx}>
                        <td className="af-wks-crm__check-col">
                          <AfSkeleton width={12} height={12} radius={3} />
                        </td>
                        {COLUMNS.map((col) => (
                          <td key={col.key}>
                            <AfSkeleton width={col.key === "name" ? 96 : 68} height={12} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : visibleRows.map((row) => {
                      const isSelected = selectedIds.includes(row.id);
                      return (
                        <tr key={row.id} data-selected={isSelected || undefined}>
                          <td className="af-wks-crm__check-col">
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.name}`}
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked ? [...prev, row.id] : prev.filter((x) => x !== row.id),
                                )
                              }
                            />
                          </td>
                          {COLUMNS.map((col) => {
                            const isEditing = editing?.id === row.id && editing.field === col.key;
                            return (
                              <td
                                key={col.key}
                                tabIndex={0}
                                data-editing={isEditing || undefined}
                                className={col.align === "right" ? "af-wks-crm__num" : col.key === "domain" || col.key === "contact" ? "af-wks-crm__muted" : undefined}
                                onDoubleClick={() => startEdit(row, col.key)}
                                onKeyDown={(e) => {
                                  if (!isEditing && e.key === "Enter") {
                                    e.preventDefault();
                                    startEdit(row, col.key);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="af-wks-crm__cell-input"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        saveEdit();
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        setEditing(null);
                                      }
                                    }}
                                  />
                                ) : col.key === "name" ? (
                                  <span className="af-wks-crm__company">
                                    <BrandGlyph brand={row.name} size={15} />
                                    <span>{row.name}</span>
                                  </span>
                                ) : col.key === "domain" ? (
                                  <span
                                    style={{
                                      textDecoration: "underline",
                                      textUnderlineOffset: "2px",
                                      textDecorationColor: "var(--af-line-strong)",
                                    }}
                                  >
                                    {row.domain}
                                  </span>
                                ) : col.key === "category" ? (
                                  <span className="af-wks-pill-badge" data-tone={categoryTone(row.category)}>
                                    {row.category}
                                  </span>
                                ) : col.key === "stage" ? (
                                  <span className="af-wks-pill-badge" data-tone={stageTone(row.stage)}>
                                    {row.stage}
                                  </span>
                                ) : col.key === "value" ? (
                                  row.value.toLocaleString("en-US")
                                ) : (
                                  row[col.key]
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
              </tbody>
            </table>

            <footer className="af-wks-crm__foot">
              <button type="button" className="af-wks-crm__add" onClick={addRow}>
                <AfIcon name="plus" size={12} />
                <span>Add row</span>
              </button>
              <span className="af-wks-crm__hint">Double-click a cell to edit</span>
            </footer>
          </div>
        </div>
      )}
    </WorkspaceInsetShell>
  );
}
