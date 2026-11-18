import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfAvatar } from "../display/Avatar";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";

export type AgentOpsUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type AgentOpsNavId =
  | "Thread"
  | "Inbox"
  | "Tasks"
  | "Agents"
  | "Activity"
  | "Schedules"
  | "Skills"
  | "Memory"
  | "Permissions"
  | "Usage"
  | "Settings";

export type AppBrandDefinition = {
  id: string;
  name: string;
  account?: string;
  logo?: ReactNode;
  tile?: string;
  icon?: AffectIconKey | ReactNode;
};

export const DEFAULT_AGENT_OPS_USER: AgentOpsUser = {
  name: "Alex Morgan",
  email: "alex@fieldwork.co",
};

export const DEFAULT_FIELDWORK_APPS: AppBrandDefinition[] = [
  { id: "gmail", name: "Gmail", account: "alex@fieldwork.co" },
  { id: "slack", name: "Slack", account: "Fieldwork workspace" },
  { id: "github", name: "GitHub", account: "fieldwork-labs" },
  { id: "drive", name: "Google Drive", account: "Shared drive · Clients" },
  { id: "stripe", name: "Stripe", account: "Fieldwork GmbH" },
  { id: "calendar", name: "Google Calendar", account: "alex@fieldwork.co" },
  { id: "web", name: "Web", account: "Browser", icon: "globe" },
];

const SIDEBAR_PRIMARY_BASE: { label: AgentOpsNavId; icon: AffectIconKey }[] = [
  { label: "Thread", icon: "message" },
  { label: "Inbox", icon: "inbox" },
  { label: "Tasks", icon: "task" },
  { label: "Memory", icon: "layers" },
];

const SIDEBAR_WORKSPACE_ITEMS: { label: AgentOpsNavId; icon: AffectIconKey }[] = [
  { label: "Schedules", icon: "schedule" },
  { label: "Activity", icon: "clock" },
  { label: "Usage", icon: "wallet" },
  { label: "Permissions", icon: "shield" },
  { label: "Settings", icon: "settings" },
];

const PALETTE_AGENT_ITEMS: { label: AgentOpsNavId; icon: AffectIconKey }[] = [
  { label: "Agents", icon: "bot" },
  { label: "Skills", icon: "sparkle" },
  ...SIDEBAR_WORKSPACE_ITEMS,
];

/** Detect user reduced-motion preference reactively. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** Check if keyboard focus is currently inside a text entry element. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** Format large counts compactly (e.g. 12500 -> "12.5K"). */
export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 100 ? Math.round(v) : Number(v.toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    const v = n / 1_000;
    return `${v >= 100 ? Math.round(v) : Number(v.toFixed(1))}K`;
  }
  return String(Math.round(n));
}

/** Format currency honoring ISO 4217 decimal rules (EUR -> €270.40, JPY -> ¥43,264). */
export function formatCurrencyValue(
  amount: number,
  currency = "EUR",
  opts?: { compact?: boolean; signed?: boolean },
): string {
  const code = (currency || "EUR").toUpperCase();
  const zeroDecimal = code === "JPY" || code === "KRW";
  if (opts?.compact && Math.abs(amount) >= 1_000) {
    const sym =
      code === "EUR" ? "€" : code === "USD" ? "$" : code === "GBP" ? "£" : code === "JPY" ? "¥" : `${code} `;
    const sign = opts.signed && amount > 0 ? "+" : amount < 0 ? "-" : "";
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
    return `${sign}${sym}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
      signDisplay: opts?.signed ? "exceptZero" : "auto",
    })
      .format(amount)
      .replace("EUR", "€");
  } catch {
    const sign = opts?.signed && amount > 0 ? "+" : "";
    return `${sign}€${amount.toFixed(zeroDecimal ? 0 : 2)}`;
  }
}

/** Crisp brand mark on a rounded tile for connected workspace apps. */
export function AppBrandTile({
  appId,
  name,
  logo,
  tile,
  icon,
  size = 24,
  className,
}: {
  appId?: string;
  name?: string;
  logo?: ReactNode;
  tile?: string;
  icon?: AffectIconKey | ReactNode;
  size?: number;
  className?: string;
}) {
  const norm = (appId ?? name ?? "").toLowerCase();
  const isStripe = !logo && norm.includes("stripe");
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(isStripe ? { background: "#635BFF", boxShadow: "none", color: "#fff" } : null),
    ...(tile ? { background: tile, color: "#fff" } : null),
  };

  let content: ReactNode = logo ?? null;
  if (!content) {
    if (norm.includes("gmail") || norm === "mail") {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7.2V18a1.5 1.5 0 0 0 1.5 1.5H7V11l5 3.75L17 11v8.5h2.5A1.5 1.5 0 0 0 21 18V7.2a1.7 1.7 0 0 0-2.72-1.36L12 10.56 5.72 5.84A1.7 1.7 0 0 0 3 7.2Z" fill="#EA4335" />
          <path d="M3 7.2V11l4 3V6.1L5.72 5.84A1.7 1.7 0 0 0 3 7.2Z" fill="#C5221F" />
          <path d="M21 7.2V11l-4 3V6.1l1.28-.26A1.7 1.7 0 0 1 21 7.2Z" fill="#FBBC04" />
          <path d="M17 14v5.5h2.5A1.5 1.5 0 0 0 21 18v-7l-4 3Z" fill="#34A853" />
          <path d="M3 11v7a1.5 1.5 0 0 0 1.5 1.5H7V14l-4-3Z" fill="#4285F4" />
        </svg>
      );
    } else if (norm.includes("stripe")) {
      content = (
        <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M11.15 8.88c0-.8.66-1.12 1.74-1.12 1.54 0 3.48.47 5.02 1.3V5.56C16.24 4.9 14.58 4.54 12.89 4.54c-4.1 0-6.82 2.14-6.82 5.7 0 5.56 7.66 4.68 7.66 7.08 0 .94-.82 1.25-1.96 1.25-1.7 0-3.88-.7-5.6-1.63v3.56c1.9.82 3.82 1.18 5.6 1.18 4.21 0 7.11-2.08 7.11-5.68-.02-6.01-7.73-4.95-7.73-7.12Z"
            fill="#fff"
          />
        </svg>
      );
    } else if (norm.includes("slack")) {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6.2 14.6a2 2 0 1 1-2-2h2v2Zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5Z" fill="#E01E5A" />
          <path d="M9.4 6.2a2 2 0 1 1 2-2v2h-2Zm0 1a2 2 0 1 1 0 4h-5a2 2 0 1 1 0-4h5Z" fill="#36C5F0" />
          <path d="M17.8 9.4a2 2 0 1 1 2 2h-2v-2Zm-1 0a2 2 0 1 1-4 0v-5a2 2 0 1 1 4 0v5Z" fill="#2EB67D" />
          <path d="M14.6 17.8a2 2 0 1 1-2 2v-2h2Zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5Z" fill="#ECB22E" />
        </svg>
      );
    } else if (norm.includes("github") || norm === "gh") {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.2a9.8 9.8 0 0 0-3.1 19.1c.5.1.68-.21.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.56 1.38.21 2.4.11 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A9.8 9.8 0 0 0 12 2.2Z" />
        </svg>
      );
    } else if (norm.includes("drive")) {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8.8 3.5h6.4l6 10.4h-6.4l-6-10.4Z" fill="#FBBC04" />
          <path d="M2.8 13.9 8.8 3.5l3.2 5.5-6 10.4-3.2-5.5Z" fill="#0F9D58" />
          <path d="M6 19.4h12l3.2-5.5H9.2L6 19.4Z" fill="#4285F4" />
        </svg>
      );
    } else if (norm.includes("calendar") || norm === "cal") {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="3.5" fill="#4285F4" />
          <rect x="6" y="9" width="12" height="9" rx="1.5" fill="#fff" />
          <path d="M9.5 15.6h1.8v-3.8H9.8v-1h2.9v4.8h1.6v1.1H9.5v-1.1Z" fill="#1A73E8" />
        </svg>
      );
    } else if (norm.includes("linear")) {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" fill="#5E6AD2" />
          <path d="M5.6 14.2 9.8 18.4M4.8 10.8l8.4 8.4M6.6 7.4l10 10" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    } else if (norm.includes("notion")) {
      content = (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8.5 16.5v-9l7 9v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else if (typeof icon === "string") {
      content = <AfIcon name={icon as AffectIconKey} size={Math.round(size * 0.58)} />;
    } else if (icon) {
      content = icon;
    } else if (norm.includes("web") || norm.includes("browser")) {
      content = <AfIcon name="globe" size={Math.round(size * 0.58)} />;
    } else if (name) {
      content = <span className="af-aops-app-initial">{name.trim().charAt(0).toUpperCase()}</span>;
    } else {
      content = <AfIcon name="layers" size={Math.round(size * 0.58)} />;
    }
  }

  return (
    <span className={cn("af-aops-app-tile", className)} style={style} aria-hidden="true">
      {content}
    </span>
  );
}

/** Crisp maker glyph for LLM providers (Claude / GPT / Gemini / Grok). */
export function ModelMakerMark({ model, size = 14 }: { model: string; size?: number }) {
  const norm = model.toLowerCase();
  if (norm.includes("claude") || norm.includes("sonnet") || norm.includes("opus") || norm.includes("haiku")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="af-aops-maker">
        <circle cx="12" cy="12" r="10" fill="rgba(217, 119, 87, 0.16)" />
        <path d="M12 5.5v13M6.4 8.8l11.2 6.4M17.6 8.8 6.4 15.2" stroke="#D97757" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (norm.includes("gpt") || norm.includes("o3") || norm.includes("o4") || norm.includes("openai")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="af-aops-maker">
        <circle cx="12" cy="12" r="9" stroke="#10A37F" strokeWidth="1.9" />
        <circle cx="12" cy="12" r="3.4" fill="#10A37F" />
      </svg>
    );
  }
  if (norm.includes("gemini") || norm.includes("google")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="af-aops-maker">
        <path d="M12 3c.7 4.9 4.1 8.3 9 9-4.9.7-8.3 4.1-9 9-.7-4.9-4.1-8.3-9-9 4.9-.7 8.3-4.1 9-9Z" fill="#4285F4" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="af-aops-maker">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 16 16 8M9.5 8H16v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Baseline-growing vertical bar chart used inside right-hand inspector panels. */
export function MiniDailyBars({
  values,
  color = "var(--af-accent)",
  animateKey,
  height = 68,
  bare = false,
  formatTip,
}: {
  values: number[];
  color?: string;
  animateKey?: string;
  height?: number;
  bare?: boolean;
  formatTip?: (val: number, index: number) => string;
}) {
  const max = Math.max(1, ...values);
  const innerH = Math.max(24, bare ? height - 6 : height - 18);
  return (
    <div
      className={cn("af-aops-bars", bare && "af-aops-bars--bare")}
      key={animateKey}
      style={{ height }}
      role="img"
      aria-label="Daily activity bars"
    >
      {values.map((v, idx) => {
        const barH = v === 0 ? 2 : Math.max(4, Math.round((v / max) * innerH));
        const tip = formatTip ? formatTip(v, idx) : `${v}`;
        return (
          <span key={idx} className="af-aops-bars__slot">
            <AfTooltip label={tip} delay={120}>
              <span className="af-aops-bars__hit">
                <span
                  className="af-aops-bars__bar"
                  style={
                    {
                      height: `${barH}px`,
                      background: v === 0 ? "var(--af-track)" : color,
                      "--bar-idx": idx,
                    } as CSSProperties
                  }
                />
              </span>
            </AfTooltip>
          </span>
        );
      })}
    </div>
  );
}

export type AgentOpsShellProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  activeNav: AgentOpsNavId;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  onNavigate?: (label: string) => void;
  /** Optional 44px full-width top bar above the center scroll canvas. */
  topBar?: ReactNode;
  /** Center column max-width (px), defaults to 720. */
  maxWidth?: number;
  /** Right inspector panel header & body; pass null to hide content. */
  panel?: ReactNode;
  panelTitle?: string;
  /** Optional AffectUI closable tab label + leading glyph in the right inspector header. */
  panelTab?: ReactNode;
  panelTabIcon?: ReactNode;
  panelOpen?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
  panelWidth?: number;
  /** Polite aria-live announcement string. */
  liveMessage?: string;
  /** Optional floating Undo / status bar at bottom of center pane. */
  floatingBar?: ReactNode;
  children: ReactNode;
};

/**
 * Shared 3-pane Fieldwork Agent Ops App Shell:
 * - Left collapsible Fieldwork workspace sidebar (mobile AfDrawer below 920px) + Cmd+K AfCommandPalette
 * - Center scrollable canvas with responsive max-width column & floating undo bar
 * - Right contextual inspector split by 1px hairline (responsive AfDrawer sheet on narrow viewports)
 */
export function AgentOpsShell({
  activeNav,
  workspace = "Fieldwork",
  user = DEFAULT_AGENT_OPS_USER,
  inboxCount = 5,
  onNavigate,
  topBar,
  maxWidth = 720,
  panel,
  panelTitle = "Details",
  panelTab,
  panelTabIcon,
  panelOpen = true,
  onPanelOpenChange,
  panelWidth = 380,
  liveMessage,
  floatingBar,
  className,
  style,
  children,
  ...rest
}: AgentOpsShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [mobileSideOpen, setMobileSideOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1180);
  const [mainWidth, setMainWidth] = useState(564);

  useEffect(() => {
    const el = rootRef.current;
    const mainEl = mainRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (!w || w <= 0) continue;
        if (entry.target === el) setContainerWidth(w);
        else if (entry.target === mainEl) setMainWidth(w);
      }
    });
    ro.observe(el);
    if (mainEl) ro.observe(mainEl);
    return () => ro.disconnect();
  }, []);

  const isCompactSide = containerWidth < 920;
  const isSheetPanel = containerWidth < 760;

  const triggerNav = useCallback(
    (label: string) => {
      setMobileSideOpen(false);
      onNavigate?.(label);
    },
    [onNavigate],
  );

  const setOpenPanel = useCallback(
    (next: boolean) => {
      onPanelOpenChange?.(next);
    },
    [onPanelOpenChange],
  );

  const workspaceMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "invite", label: "Invite people", icon: "users", onSelect: () => triggerNav("Members") },
      { type: "separator" },
      { id: "ws-settings", label: "Workspace settings", icon: "settings", onSelect: () => triggerNav("Settings") },
      { id: "analytics", label: "Analytics", icon: "chart", onSelect: () => triggerNav("Analytics") },
      { id: "billing", label: "Billing", icon: "creditCard", onSelect: () => triggerNav("Billing") },
      { id: "usage", label: "Usage & limits", icon: "wallet", onSelect: () => triggerNav("Usage") },
      { id: "members", label: "Members", icon: "users", onSelect: () => triggerNav("Members") },
      { type: "separator" },
      { id: "learn", label: "Learn more", icon: "external", onSelect: () => triggerNav("Docs") },
      { type: "separator" },
      { id: "switch-ws", label: "Switch workspace", icon: "building", onSelect: () => triggerNav("Workspaces") },
    ],
    [triggerNav],
  );

  const userMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { type: "label", label: `${user.name}${user.email ? ` · ${user.email}` : ""}` },
      { id: "profile", label: "Profile", icon: "user", onSelect: () => triggerNav("Profile") },
      { id: "preferences", label: "Preferences", icon: "sliders", onSelect: () => triggerNav("Preferences") },
      { id: "integrations", label: "Integrations", icon: "grid", onSelect: () => triggerNav("Integrations") },
      { type: "separator" },
      { id: "logout", label: "Log out", icon: "x", danger: true, onSelect: () => triggerNav("Log out") },
    ],
    [triggerNav, user.email, user.name],
  );

  const primaryNavItems = useMemo(() => {
    if (activeNav === "Agents") {
      return [
        { label: "Thread" as const, icon: "message" as const },
        { label: "Inbox" as const, icon: "inbox" as const },
        { label: "Agents" as const, icon: "bot" as const },
        { label: "Tasks" as const, icon: "task" as const },
        { label: "Memory" as const, icon: "layers" as const },
        { label: "Skills" as const, icon: "sparkle" as const },
      ];
    }
    const list = [...SIDEBAR_PRIMARY_BASE];
    if (activeNav === "Skills") list.push({ label: "Skills", icon: "sparkle" });
    return list;
  }, [activeNav]);

  const commands = useMemo<AfCommand[]>(
    () => [
      ...SIDEBAR_PRIMARY_BASE.map((item) => ({
        id: `nav-${item.label}`,
        group: workspace,
        label: item.label,
        icon: item.icon,
        onSelect: () => triggerNav(item.label),
      })),
      ...PALETTE_AGENT_ITEMS.map((item) => ({
        id: `ws-${item.label}`,
        group: "Workspace",
        label: item.label,
        icon: item.icon,
        onSelect: () => triggerNav(item.label),
      })),
    ],
    [triggerNav, workspace],
  );

  const renderSidebarBody = (inSheet: boolean) => (
    <div className="af-aops-side__inner">
      <header className="af-aops-side__head">
        <AfDropdownMenu items={workspaceMenuItems} side="bottom" align="start">
          <button type="button" className="af-aops-ws-btn" aria-label={`${workspace} workspace menu`}>
            <span className="af-aops-ws-logo">{workspace.trim().charAt(0).toUpperCase() || "F"}</span>
            <span className="af-aops-ws-name" title={workspace}>
              {workspace}
            </span>
            <AfIcon name="chevronDown" size={11} />
          </button>
        </AfDropdownMenu>
        <AfTooltip label={inSheet ? "Close sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            className="af-aops-icon-btn"
            aria-label={inSheet ? "Close sidebar" : "Collapse sidebar"}
            onClick={() => (inSheet ? setMobileSideOpen(false) : setSideCollapsed(true))}
          >
            <AfIcon name="panelLeft" size={15} />
          </button>
        </AfTooltip>
      </header>

      <button type="button" className="af-aops-side__search" onClick={() => setPaletteOpen(true)}>
        <AfIcon name="search" size={13} />
        <span className="af-aops-side__search-text">Search…</span>
        <kbd className="af-aops-kbd">⌘K</kbd>
      </button>

      <nav className="af-aops-side__nav" aria-label={`${workspace} navigation`}>
        <div className="af-aops-side__group">
          {primaryNavItems.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                type="button"
                className="af-aops-side__item"
                data-active={isActive || undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={() => triggerNav(item.label)}
              >
                <AfIcon name={item.icon} size={15} />
                <span className="af-aops-side__item-label">{item.label}</span>
                {item.label === "Inbox" && inboxCount > 0 ? (
                  <span className="af-aops-side__count af-aops-tabular">{inboxCount}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="af-aops-side__group">
          <div className="af-aops-side__section">Workspace</div>
          {SIDEBAR_WORKSPACE_ITEMS.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                type="button"
                className="af-aops-side__item"
                data-active={isActive || undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={() => triggerNav(item.label)}
              >
                <AfIcon name={item.icon} size={15} />
                <span className="af-aops-side__item-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="af-aops-side__foot">
        <AfDropdownMenu items={userMenuItems} side="top" align="start">
          <button type="button" className="af-aops-user-btn" aria-label={`Account menu for ${user.name}`}>
            <AfAvatar name={user.name} src={user.avatar} size={20} className="af-aops-user-avatar" />
            <span className="af-aops-user-name">{user.name}</span>
          </button>
        </AfDropdownMenu>
      </footer>
    </div>
  );

  const showCornerLeft = isCompactSide || sideCollapsed;
  const showCornerRight = Boolean(panel) && (!panelOpen || isSheetPanel);

  return (
    <div
      ref={rootRef}
      className={cn("af-aops", className)}
      data-compact={mainWidth < 460 ? "true" : undefined}
      data-narrow={mainWidth < 390 ? "true" : undefined}
      style={style}
      {...rest}
    >
      <div className="af-sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage ?? ""}
      </div>

      {!isCompactSide && !sideCollapsed ? (
        <aside className="af-aops-side" aria-label={`${workspace} sidebar`}>
          {renderSidebarBody(false)}
        </aside>
      ) : null}

      {isCompactSide ? (
        <AfDrawer
          open={mobileSideOpen}
          onOpenChange={setMobileSideOpen}
          placement="left"
          width={264}
          contained
          title={workspace}
          closable={false}
          bodyStyle={{ padding: 0 }}
        >
          {renderSidebarBody(true)}
        </AfDrawer>
      ) : null}

      <main ref={mainRef} className="af-aops-main">
        {topBar ? (
          <header className="af-aops-topbar">
            {showCornerLeft ? (
              <AfTooltip label="Open sidebar">
                <button
                  type="button"
                  className="af-aops-icon-btn af-aops-topbar__nav-btn"
                  aria-label="Open sidebar"
                  onClick={() => (isCompactSide ? setMobileSideOpen(true) : setSideCollapsed(false))}
                >
                  <AfIcon name="panelLeft" size={15} />
                </button>
              </AfTooltip>
            ) : null}
            <div className="af-aops-topbar__body">{topBar}</div>
            {showCornerRight ? (
              <AfTooltip label={`Open ${panelTitle.toLowerCase()}`}>
                <button
                  type="button"
                  className="af-aops-icon-btn af-aops-topbar__nav-btn"
                  aria-label={`Open ${panelTitle.toLowerCase()}`}
                  onClick={() => setOpenPanel(true)}
                >
                  <AfIcon name="panelRight" size={15} />
                </button>
              </AfTooltip>
            ) : null}
          </header>
        ) : showCornerLeft || showCornerRight ? (
          <div className="af-aops-corners">
            {showCornerLeft ? (
              <AfTooltip label="Open sidebar">
                <button
                  type="button"
                  className="af-aops-icon-btn af-aops-corner-btn"
                  aria-label="Open sidebar"
                  onClick={() => (isCompactSide ? setMobileSideOpen(true) : setSideCollapsed(false))}
                >
                  <AfIcon name="panelLeft" size={15} />
                </button>
              </AfTooltip>
            ) : (
              <span />
            )}
            {showCornerRight ? (
              <AfTooltip label={`Open ${panelTitle.toLowerCase()}`}>
                <button
                  type="button"
                  className="af-aops-icon-btn af-aops-corner-btn"
                  aria-label={`Open ${panelTitle.toLowerCase()}`}
                  onClick={() => setOpenPanel(true)}
                >
                  <AfIcon name="panelRight" size={15} />
                </button>
              </AfTooltip>
            ) : null}
          </div>
        ) : null}

        <div className="af-aops-scroll">
          <div className="af-aops-col" style={{ maxWidth }}>
            {children}
          </div>
        </div>

        {floatingBar ? <div className="af-aops-float-wrap">{floatingBar}</div> : null}
      </main>

      {panel && !isSheetPanel && panelOpen ? (
        <aside
          className={cn("af-aops-panel", panelTab !== undefined && "af-aops-panel--tabbed")}
          style={{ width: panelWidth }}
          aria-label={panelTitle}
        >
          <div className="af-aops-panel__top">
            {panelTab !== undefined ? (
              <>
                <div className="af-aops-panel__tab">
                  {panelTabIcon ? <span className="af-aops-panel__tab-icon">{panelTabIcon}</span> : null}
                  <span className="af-aops-panel__tab-label">{panelTab}</span>
                  <button
                    type="button"
                    className="af-aops-panel__tab-close"
                    aria-label={`Close ${panelTitle.toLowerCase()}`}
                    onClick={() => setOpenPanel(false)}
                  >
                    <AfIcon name="x" size={11} />
                  </button>
                </div>
                <AfTooltip label={`Collapse ${panelTitle.toLowerCase()}`}>
                  <button
                    type="button"
                    className="af-aops-icon-btn"
                    aria-label={`Collapse ${panelTitle.toLowerCase()}`}
                    onClick={() => setOpenPanel(false)}
                  >
                    <AfIcon name="panelRight" size={15} />
                  </button>
                </AfTooltip>
              </>
            ) : (
              <>
                <span className="af-aops-panel__eyebrow">{panelTitle}</span>
                <AfTooltip label={`Close ${panelTitle.toLowerCase()}`}>
                  <button
                    type="button"
                    className="af-aops-icon-btn"
                    aria-label={`Close ${panelTitle.toLowerCase()}`}
                    onClick={() => setOpenPanel(false)}
                  >
                    <AfIcon name="x" size={14} />
                  </button>
                </AfTooltip>
              </>
            )}
          </div>
          <div className="af-aops-panel__scroll">{panel}</div>
        </aside>
      ) : null}

      {panel && isSheetPanel ? (
        <AfDrawer
          open={panelOpen}
          onOpenChange={setOpenPanel}
          placement="right"
          width={Math.min(panelWidth, Math.max(300, containerWidth - 28))}
          contained
          title={panelTitle}
        >
          {panel}
        </AfDrawer>
      ) : null}

      <AfCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        placeholder="Jump to page or project…"
      />
    </div>
  );
}
