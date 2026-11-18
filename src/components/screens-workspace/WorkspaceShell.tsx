import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfLineChart } from "../advanced/LineChart";
import type { AfLineSeries } from "../advanced/shared";
import { AfSkeleton } from "../display/Skeleton";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfModal } from "../overlay/Modal";

export type AfWorkspaceUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type WksNavItem = {
  label: string;
  icon: AffectIconKey;
  count?: number;
};

export type WksGroupItem = {
  label: string;
  icon?: AffectIconKey;
  dot?: "accent" | "success" | "warning" | "danger" | "purple";
};

export type WksGroup = {
  label: string;
  items: WksGroupItem[];
};

type WksShellCtx = {
  showExpand: boolean;
  openSidebar: () => void;
};

const ShellContext = createContext<WksShellCtx>({
  showExpand: false,
  openSidebar: () => {},
});

export function WksSidebarExpandButton() {
  const { showExpand, openSidebar } = useContext(ShellContext);
  if (!showExpand) return null;
  return (
    <button
      type="button"
      className="af-wks-icon-btn"
      aria-label="Open sidebar"
      title="Open sidebar"
      onClick={openSidebar}
    >
      <AfIcon name="sidebar" size={14} />
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

export type WorkspaceInsetShellProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  workspace?: string;
  user?: AfWorkspaceUser;
  nav: WksNavItem[];
  groups?: WksGroup[];
  active: string;
  onRouteSelect?: (label: string) => void;
  children: ReactNode;
};

export function WorkspaceInsetShell({
  workspace = "Acme",
  user = { name: "Alex Morgan" },
  nav,
  groups = [],
  active,
  onRouteSelect,
  children,
  className,
  onKeyDown,
  ...rest
}: WorkspaceInsetShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showNews, setShowNews] = useState(true);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [doneSteps, setDoneSteps] = useState<string[]>(["ws"]);
  const [pointerMode, setPointerMode] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setCompact(el.clientWidth > 0 && el.clientWidth < 760);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleShellKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      (e.key === "Tab" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight")
    ) {
      setPointerMode(false);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setPaletteOpen(true);
    }
    onKeyDown?.(e);
  };

  const triggerNav = (label: string) => {
    onRouteSelect?.(label);
    if (compact) setDrawerOpen(false);
  };

  const workspaceMenu: AfMenuItem[] = useMemo(
    () => [
      { id: "invite", label: "Invite people", icon: "users", onSelect: () => triggerNav("Invite people") },
      { type: "separator" },
      { id: "settings", label: "Workspace settings", icon: "settings", onSelect: () => triggerNav("Workspace settings") },
      { id: "analytics", label: "Analytics", icon: "chart", onSelect: () => triggerNav("Analytics") },
      { id: "billing", label: "Billing", icon: "creditCard", onSelect: () => triggerNav("Billing") },
      { id: "usage", label: "Usage & limits", icon: "sliders", onSelect: () => triggerNav("Usage & limits") },
      { id: "members", label: "Members", icon: "user", onSelect: () => triggerNav("Members") },
      { type: "separator" },
      { id: "learn", label: "Learn more", icon: "info", onSelect: () => setChangelogOpen(true) },
      { id: "switch", label: "Switch workspace", icon: "windowRestore", onSelect: () => triggerNav("Switch workspace") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compact, onRouteSelect],
  );

  const userMenu: AfMenuItem[] = useMemo(
    () => [
      { id: "profile", label: "Profile & account", icon: "user", onSelect: () => triggerNav("Profile") },
      { id: "prefs", label: "Preferences", icon: "sliders", kbd: "⌘,", onSelect: () => triggerNav("Preferences") },
      { id: "cmd", label: "Command menu", icon: "search", kbd: "⌘K", onSelect: () => setPaletteOpen(true) },
      { type: "separator" },
      { id: "logout", label: "Log out", icon: "external", danger: true, onSelect: () => triggerNav("Log out") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compact, onRouteSelect],
  );

  const commands: AfCommand[] = useMemo(
    () => [
      { id: "act-email", group: "Actions", label: "Write an email", icon: "mail", kbd: "E" },
      { id: "act-ask", group: "Actions", label: "Ask assistant", icon: "sparkle", kbd: "A" },
      { id: "act-sum", group: "Actions", label: "Summarize this page", icon: "file", kbd: "S" },
      { id: "act-meet", group: "Actions", label: "Schedule a meeting", icon: "calendar", kbd: "M" },
      { id: "act-post", group: "Actions", label: "Post an update", icon: "send" },
      { id: "act-task", group: "Actions", label: "Create a task", icon: "plus", kbd: "C" },
      ...nav.map((item) => ({
        id: `nav-${item.label}`,
        group: "Navigation",
        label: item.label,
        icon: item.icon,
      })),
      ...groups.flatMap((g) =>
        g.items.map((item) => ({
          id: `grp-${g.label}-${item.label}`,
          group: g.label,
          label: item.label,
          icon: item.icon ?? "folder",
        })),
      ),
    ],
    [nav, groups],
  );

  const progressPct = Math.round((doneSteps.length / 8) * 100) || 13;

  const renderSidebarContent = (inDrawer: boolean) => (
    <div className={cn("af-wks-side", inDrawer && "af-wks-side--drawer")}>
      <div className="af-wks-side__top">
        <AfDropdownMenu items={workspaceMenu} side="bottom" align="start" width={212}>
          <button type="button" className="af-wks-ws-btn" aria-label={`${workspace} workspace menu`}>
            <span className="af-wks-ws-mark" aria-hidden="true">
              {workspace.charAt(0).toUpperCase()}
            </span>
            <span className="af-wks-ws-name">{workspace}</span>
            <AfIcon name="chevronDown" size={12} />
          </button>
        </AfDropdownMenu>
        <button
          type="button"
          className="af-wks-icon-btn"
          aria-label={inDrawer ? "Close sidebar" : "Collapse sidebar"}
          onClick={() => (inDrawer ? setDrawerOpen(false) : setCollapsed(true))}
        >
          <AfIcon name={inDrawer ? "x" : "sidebar"} size={14} />
        </button>
      </div>

      <button
        type="button"
        className="af-wks-search-btn"
        onClick={() => {
          if (inDrawer) setDrawerOpen(false);
          setPaletteOpen(true);
        }}
      >
        <span className="af-wks-search-btn__left">
          <AfIcon name="search" size={13} />
          <span>Search…</span>
        </span>
        <kbd className="af-wks-kbd">⌘K</kbd>
      </button>

      <div className="af-wks-side__scroll">
        <nav className="af-wks-nav-list" aria-label="Main navigation">
          {nav.map((item) => {
            const isCurrent = active === item.label;
            return (
              <button
                key={item.label}
                type="button"
                className="af-wks-nav-item"
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => triggerNav(item.label)}
              >
                <span className="af-wks-nav-item__left">
                  <span className="af-wks-nav-item__icon" aria-hidden="true">
                    <AfIcon name={item.icon} size={14} />
                  </span>
                  <span className="af-wks-nav-item__label">{item.label}</span>
                </span>
                {item.count !== undefined ? (
                  <span className="af-wks-nav-item__count">{item.count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {groups.map((group) => (
          <div key={group.label} className="af-wks-nav-list">
            <span className="af-wks-group-label">{group.label}</span>
            {group.items.map((item) => {
              const isCurrent = active === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="af-wks-nav-item"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => triggerNav(item.label)}
                >
                  <span className="af-wks-nav-item__left">
                    {item.icon ? (
                      <span className="af-wks-nav-item__icon" aria-hidden="true">
                        <AfIcon name={item.icon} size={13} />
                      </span>
                    ) : (
                      <span className="af-wks-nav-dot" data-tone={item.dot} aria-hidden="true" />
                    )}
                    <span className="af-wks-nav-item__label">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="af-wks-side__foot">
        {showNews ? (
          <div className="af-wks-news-stack">
            <div className="af-wks-news-peek" aria-hidden="true">
              <span className="af-wks-news__kicker">New in {workspace}</span>
              <span className="af-wks-news-peek__x">
                <AfIcon name="x" size={10} />
              </span>
            </div>
            <div className="af-wks-news">
              <div className="af-wks-news__top">
                <div className="af-wks-news__head">
                  <span className="af-wks-news__kicker">New in {workspace}</span>
                  <button
                    type="button"
                    className="af-wks-news__close"
                    aria-label="Dismiss"
                    onClick={() => setShowNews(false)}
                  >
                    <AfIcon name="x" size={11} />
                  </button>
                </div>
                <p className="af-wks-news__headline">Shared folders</p>
              </div>
              <button type="button" className="af-wks-news__more" onClick={() => setChangelogOpen(true)}>
                <span>Full changelog</span>
                <AfIcon name="chevronRight" size={11} />
              </button>
            </div>
          </div>
        ) : null}

        <button type="button" className="af-wks-guide" onClick={() => setGuideOpen(true)}>
          <div className="af-wks-guide__top">
            <span className="af-wks-guide__title">Getting started</span>
            <span className="af-wks-guide__chev" aria-hidden="true">
              <AfIcon name="chevronRight" size={11} />
            </span>
          </div>
          <span className="af-wks-guide__sub">
            {progressPct}% done · <b>Great start!</b>
          </span>
          <span className="af-wks-guide__bar" aria-hidden="true">
            <span className="af-wks-guide__fill" style={{ width: `${progressPct}%` }} />
          </span>
        </button>

        <AfDropdownMenu items={userMenu} side="top" align="start" width={204}>
          <button type="button" className="af-wks-user-btn">
            <span className="af-wks-user-btn__left">
              <span className="af-wks-avatar" aria-hidden="true">
                {user.avatar || initialsOf(user.name)}
              </span>
              <span className="af-wks-ws-name">{user.name}</span>
            </span>
            <AfIcon name="chevronDown" size={12} />
          </button>
        </AfDropdownMenu>
      </div>
    </div>
  );

  const showExpand = compact || collapsed;
  const openSidebar = () => {
    if (compact) setDrawerOpen(true);
    else setCollapsed(false);
  };

  return (
    <ShellContext.Provider value={{ showExpand, openSidebar }}>
      <div
        ref={shellRef}
        className={cn("af-wks-shell", className)}
        data-collapsed={collapsed || undefined}
        data-compact={compact || undefined}
        data-wks-pointer={pointerMode ? "true" : undefined}
        onPointerDownCapture={() => setPointerMode(true)}
        onKeyDown={handleShellKeyDown}
        {...rest}
      >
        {!compact && !collapsed ? renderSidebarContent(false) : null}

        <main className="af-wks-main">{children}</main>

        <AfDrawer
          open={compact && drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={236}
          contained
          closable={false}
          title={`${workspace} navigation`}
          bodyStyle={{ padding: 0 }}
        >
          {renderSidebarContent(true)}
        </AfDrawer>

        <AfCommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={commands}
          placeholder="Type a command or search…"
          onRun={(cmd) => {
            setPaletteOpen(false);
            triggerNav(cmd.label);
          }}
        />

        <AfModal
          open={changelogOpen}
          onClose={() => setChangelogOpen(false)}
          title={`What's new in ${workspace}`}
          description="Recent updates shipped to your workspace."
          closable
          contained
          size="sm"
          footer={
            <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setChangelogOpen(false)}>
              Got it
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            <div>
              <strong style={{ color: "var(--af-page-strong)" }}>Prompt Evals v12</strong> — Inline diff review with Y/N keyboard shortcuts and latency tracking.
            </div>
            <div>
              <strong style={{ color: "var(--af-page-strong)" }}>Shared Folders &amp; Templates</strong> — Organize briefs, spreadsheets and PDFs right next to chat.
            </div>
            <div>
              <strong style={{ color: "var(--af-page-strong)" }}>Spreadsheet CRM</strong> — Double-click any cell to edit in place with full Undo/Redo history.
            </div>
          </div>
        </AfModal>

        <AfModal
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          title="Getting started"
          description={`${progressPct}% completed · Check off steps as your team sets up ${workspace}.`}
          closable
          contained
          size="sm"
          footer={
            <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setGuideOpen(false)}>
              Done
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { id: "ws", label: `Create ${workspace} workspace` },
              { id: "int", label: "Connect Slack or Notion" },
              { id: "inv", label: "Invite your first teammate" },
              { id: "doc", label: "Upload a project brief" },
            ].map((step) => {
              const checked = doneSteps.includes(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  className="af-wks-nav-item"
                  onClick={() =>
                    setDoneSteps((prev) =>
                      prev.includes(step.id) ? prev.filter((x) => x !== step.id) : [...prev, step.id],
                    )
                  }
                >
                  <span className="af-wks-nav-item__left">
                    <AfIcon name={checked ? "checkCircle" : "square"} size={14} />
                    <span>{step.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </AfModal>
      </div>
    </ShellContext.Provider>
  );
}

export type WksKpiCardProps = {
  title: string;
  amount: string;
  delta: string;
  deltaTone?: "up" | "down" | "flat";
  labels: string[];
  series: AfLineSeries[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
  showLegend?: boolean;
  restingDot?: boolean;
  yMax?: number;
  footer: string;
  loading?: boolean;
  className?: string;
};

export function WksKpiCard({
  title,
  amount,
  delta,
  deltaTone = "up",
  labels,
  series,
  format,
  formatAxis,
  height = 128,
  showLegend = false,
  restingDot = false,
  yMax,
  footer,
  loading = false,
  className,
}: WksKpiCardProps) {
  return (
    <section className={cn("af-wks-kpi", className)}>
      <div className="af-wks-kpi__body">
        <h3 className="af-wks-kpi__title">{title}</h3>
        {loading ? (
          <>
            <AfSkeleton width={96} height={20} radius={5} />
            <AfSkeleton variant="rect" width="100%" height={height} radius={8} style={{ marginTop: 6 }} />
          </>
        ) : (
          <>
            <p className="af-wks-kpi__metric">
              <span className="af-wks-kpi__amount">{amount}</span>
              <span className="af-wks-kpi__delta" data-tone={deltaTone}>
                {delta}
              </span>
            </p>
            <div className="af-wks-kpi__plot">
              <AfLineChart
                labels={labels}
                series={series}
                format={format}
                formatAxis={formatAxis ?? format}
                height={height}
                showLegend={showLegend}
                restingDot={restingDot}
                yMax={yMax}
                label={`${title} chart`}
              />
            </div>
          </>
        )}
      </div>
      <p className="af-wks-kpi__foot">
        {loading ? <AfSkeleton width={132} height={10} /> : footer}
      </p>
    </section>
  );
}
