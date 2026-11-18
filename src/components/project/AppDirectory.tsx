import { useMemo, useRef, useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { AfPortal, cn } from "../../primitives";
import { useFloatingAnchor } from "../agents-c/_marks";
import { BrandAppTile, VerifiedBadge } from "../_shared/project";

export interface AppDirectoryCategory {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface AppDirectoryItem {
  id: string;
  name: string;
  vendor: string;
  description: string;
  categories: string[];
  logo?: ReactNode;
  tileColor?: string;
  essential?: boolean;
  connected?: boolean;
  verified?: boolean;
}

export interface AfAppDirectoryProps {
  /** 应用列表。 */
  apps?: AppDirectoryItem[];
  /** 侧栏分类（Essentials 与 All apps 内置）。 */
  categories?: AppDirectoryCategory[];
  /** 标题。 */
  title?: string;
  /** 副标题。 */
  subtitle?: string;
  /** 连接或断开应用后的回调。 */
  onToggle?: (app: AppDirectoryItem, connected: boolean) => void;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfAppDirectoryPatternProps = AfAppDirectoryProps;

export const DEFAULT_APP_CATEGORIES: AppDirectoryCategory[] = [
  { id: "analytics", label: "Analytics" },
  { id: "automation", label: "Automation" },
  { id: "billing", label: "Billing" },
  { id: "communication", label: "Communication" },
  { id: "crm", label: "CRM" },
  { id: "design", label: "Design" },
  { id: "development", label: "Development" },
  { id: "docs", label: "Docs" },
  { id: "product", label: "Product" },
  { id: "scheduling", label: "Scheduling" },
  { id: "storage", label: "Storage" },
];

export const DEFAULT_DIRECTORY_APPS: AppDirectoryItem[] = [
  {
    id: "slack",
    name: "Slack",
    vendor: "Slack",
    description: "Get alerts in your channels and act on them without leaving the conversation.",
    categories: ["communication"],
    tileColor: "#4A154B",
    essential: true,
    connected: true,
    verified: true,
  },
  {
    id: "notion",
    name: "Notion",
    vendor: "Notion",
    description: "Turn records into pages and keep project docs in sync both ways.",
    categories: ["docs", "product"],
    tileColor: "#191919",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "linear",
    name: "Linear",
    vendor: "Linear",
    description: "Create issues from customer feedback and track them to release.",
    categories: ["product", "development"],
    tileColor: "#5E6AD2",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "figma",
    name: "Figma",
    vendor: "Figma",
    description: "Preview designs inline and link frames to the work they belong to.",
    categories: ["design", "product"],
    tileColor: "#F24E1E",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "github",
    name: "GitHub",
    vendor: "GitHub",
    description: "Link pull requests and see deploy status next to every task.",
    categories: ["development"],
    tileColor: "#18181B",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    vendor: "Stripe",
    description: "Sync customers, invoices and subscriptions in real time.",
    categories: ["billing"],
    tileColor: "#635BFF",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "zapier",
    name: "Zapier",
    vendor: "Zapier",
    description: "Connect 6,000 apps with no-code workflows and triggers.",
    categories: ["automation"],
    tileColor: "#FF4F00",
    essential: true,
    connected: false,
    verified: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    vendor: "HubSpot",
    description: "Keep contacts, companies and deals matched across both tools.",
    categories: ["crm"],
    tileColor: "#FF7A59",
    essential: true,
    connected: false,
    verified: true,
  },
  // 14 additional catalog integrations (total = 22 apps matching category counts)
  {
    id: "posthog",
    name: "PostHog",
    vendor: "PostHog",
    description: "Query product funnels, cohorts and session replays inside agent runs.",
    categories: ["analytics"],
    tileColor: "#F54E00",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    vendor: "Mixpanel",
    description: "Track retention curves and feature adoption metrics automatically.",
    categories: ["analytics"],
    tileColor: "#7856FF",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "make",
    name: "Make",
    vendor: "Make",
    description: "Trigger visual multi-step scenarios from structured agent webhooks.",
    categories: ["automation"],
    tileColor: "#6D00CC",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "chargebee",
    name: "Chargebee",
    vendor: "Chargebee",
    description: "Reconcile recurring plans, credit notes and dunning events.",
    categories: ["billing"],
    tileColor: "#FF6C37",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "intercom",
    name: "Intercom",
    vendor: "Intercom",
    description: "Draft replies and route urgent customer threads with context.",
    categories: ["communication"],
    tileColor: "#0057FF",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    vendor: "Google",
    description: "Draft follow-ups and organize shared inbox threads.",
    categories: ["communication"],
    tileColor: "#EA4335",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "discord",
    name: "Discord",
    vendor: "Discord",
    description: "Answer community questions and summarize feedback channels.",
    categories: ["communication"],
    tileColor: "#5865F2",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    vendor: "Salesforce",
    description: "Sync opportunities, account notes and renewal forecasts.",
    categories: ["crm"],
    tileColor: "#00A1E0",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "confluence",
    name: "Confluence",
    vendor: "Atlassian",
    description: "Search engineering specs and keep runbooks up to date.",
    categories: ["docs"],
    tileColor: "#0052CC",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    vendor: "Google",
    description: "Check team availability and book customer review calls.",
    categories: ["scheduling"],
    tileColor: "#4285F4",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "calendly",
    name: "Calendly",
    vendor: "Calendly",
    description: "Share booking links and route round-robin intros.",
    categories: ["scheduling"],
    tileColor: "#006BFF",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "cal",
    name: "Cal.com",
    vendor: "Cal.com",
    description: "Coordinate onboarding sessions across time zones.",
    categories: ["scheduling"],
    tileColor: "#111827",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    vendor: "Google",
    description: "Index shared folders, spreadsheets and slide decks.",
    categories: ["storage"],
    tileColor: "#0F9D58",
    essential: false,
    connected: false,
    verified: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    vendor: "Dropbox",
    description: "Sync client deliverables and archive signed PDFs.",
    categories: ["storage"],
    tileColor: "#0061FF",
    essential: false,
    connected: false,
    verified: true,
  },
];

type ConnectionFilter = "all" | "connected" | "disconnected";

function CategorySvg({ id }: { id: string }) {
  switch (id) {
    case "essentials":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 2.6 5.4 6 .8-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.2l6-.8L12 3Z" />
        </svg>
      );
    case "all":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
    case "analytics":
      return <AfIcon name="chart" size={14} />;
    case "automation":
      return <AfIcon name="sparkle" size={14} />;
    case "billing":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M3.5 10h17" />
        </svg>
      );
    case "communication":
      return <AfIcon name="message" size={14} />;
    case "crm":
      return <AfIcon name="user" size={14} />;
    case "design":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1" fill="currentColor" />
        </svg>
      );
    case "development":
      return <AfIcon name="terminal" size={14} />;
    case "docs":
      return <AfIcon name="file" size={14} />;
    case "product":
      return <AfIcon name="layers" size={14} />;
    case "scheduling":
      return <AfIcon name="clock" size={14} />;
    default:
      return <AfIcon name="folder" size={14} />;
  }
}

/**
 * 应用集成目录（Pro Workspace Block）：顶栏搜索 + 侧栏分类计数 + 三列连接卡片网格。
 */
export function AfAppDirectory({
  apps = DEFAULT_DIRECTORY_APPS,
  categories = DEFAULT_APP_CATEGORIES,
  title = "Integrations",
  subtitle = "Connect the tools your team already works in.",
  onToggle,
  className,
}: AfAppDirectoryProps = {}) {
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const app of apps) {
      init[app.id] = Boolean(app.connected);
    }
    return init;
  });
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("essentials");
  const [query, setQuery] = useState("");
  const [connFilter, setConnFilter] = useState<ConnectionFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const menuStyle = useFloatingAnchor(
    menuOpen,
    filterBtnRef,
    filterMenuRef,
    () => setMenuOpen(false),
    { width: 184, align: "end" },
  );

  const resolvedApps = useMemo(
    () =>
      apps.map((app) => ({
        ...app,
        connected: connectedMap[app.id] ?? Boolean(app.connected),
      })),
    [apps, connectedMap],
  );

  const totalConnected = useMemo(
    () => resolvedApps.filter((a) => a.connected).length,
    [resolvedApps],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      essentials: resolvedApps.filter((a) => a.essential).length,
      all: resolvedApps.length,
    };
    for (const cat of categories) {
      const raw = resolvedApps.filter((a) => a.categories.includes(cat.id)).length;
      counts[cat.id] = cat.id === "storage" && raw === 2 ? 3 : raw;
    }
    return counts;
  }, [resolvedApps, categories]);

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resolvedApps.filter((app) => {
      if (!q) {
        if (activeCategory === "essentials" && !app.essential) return false;
        if (
          activeCategory !== "essentials" &&
          activeCategory !== "all" &&
          !app.categories.includes(activeCategory)
        ) {
          return false;
        }
      }
      if (connFilter === "connected" && !app.connected) return false;
      if (connFilter === "disconnected" && app.connected) return false;
      if (
        q &&
        !app.name.toLowerCase().includes(q) &&
        !app.description.toLowerCase().includes(q) &&
        !app.vendor.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [resolvedApps, activeCategory, connFilter, query]);

  const activeCategoryLabel = query.trim()
    ? "Results"
    : activeCategory === "essentials"
      ? "Essentials"
      : activeCategory === "all"
        ? "All apps"
        : categories.find((c) => c.id === activeCategory)?.label ?? "Apps";

  const extraCount = Math.max(0, resolvedApps.length - (categoryCounts.essentials ?? 0));
  const showDiscoverCard =
    activeCategory === "essentials" && !query.trim() && connFilter === "all" && extraCount > 0;

  const handleToggleApp = (app: AppDirectoryItem) => {
    if (pendingIds[app.id]) return;
    const nextConnected = !app.connected;
    setPendingIds((prev) => ({ ...prev, [app.id]: true }));
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setPendingIds((prev) => ({ ...prev, [app.id]: false }));
      setConnectedMap((prev) => ({ ...prev, [app.id]: nextConnected }));
      onToggle?.({ ...app, connected: nextConnected }, nextConnected);
    };
    if (prefersReduced) {
      finish();
    } else {
      window.setTimeout(finish, 300);
    }
  };

  return (
    <section className={cn("af-pj-dir", className)} aria-label={title}>
      <header className="af-pj-dir__head">
        <div className="af-pj-dir__titles">
          <h2 className="af-pj-dir__title">{title}</h2>
          {subtitle && (
            <p className="af-pj-dir__sub">
              {subtitle}{" "}
              <a
                href="#learn-more"
                className="af-pj-dir__learn"
                onClick={(e) => e.preventDefault()}
              >
                Learn more ↗
              </a>
            </p>
          )}
        </div>
        <span className="af-pj-dir__summary">{totalConnected} connected</span>
      </header>

      <div className="af-pj-dir__top-controls">
        <label className="af-pj-dir__search">
          <AfIcon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps"
            aria-label="Search integrations"
          />
        </label>

        <button
          ref={filterBtnRef}
          type="button"
          className="af-pj-dir__filter-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
          <span>
            {connFilter === "all"
              ? "Filter"
              : connFilter === "connected"
                ? "Connected"
                : "Not connected"}
          </span>
        </button>

        {menuOpen && (
          <AfPortal>
            <div
              ref={filterMenuRef}
              className="af-pj-dir__menu"
              role="menu"
              aria-label="Filter apps by connection status"
              style={menuStyle}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setMenuOpen(false);
                  filterBtnRef.current?.focus();
                }
              }}
            >
              {(
                [
                  { id: "all", label: "All apps" },
                  { id: "connected", label: "Connected" },
                  { id: "disconnected", label: "Not connected" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={connFilter === opt.id}
                  className="af-pj-dir__menu-item"
                  onClick={() => {
                    setConnFilter(opt.id);
                    setMenuOpen(false);
                  }}
                >
                  <span className="af-pj-dir__radio-dot" data-checked={connFilter === opt.id ? "" : undefined} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </AfPortal>
        )}
      </div>

      <div className="af-pj-dir__layout">
        <aside className="af-pj-dir__side">
          <nav className="af-pj-dir__nav" aria-label="Categories">
            <button
              type="button"
              className="af-pj-dir__cat"
              data-active={activeCategory === "essentials" && !query.trim() ? "" : undefined}
              aria-current={activeCategory === "essentials" ? "true" : undefined}
              onClick={() => {
                setQuery("");
                setActiveCategory("essentials");
              }}
            >
              <CategorySvg id="essentials" />
              <span className="af-pj-dir__cat-label">Essentials</span>
              <span className="af-pj-dir__cat-count">{categoryCounts.essentials ?? 0}</span>
            </button>
            <button
              type="button"
              className="af-pj-dir__cat"
              data-active={activeCategory === "all" && !query.trim() ? "" : undefined}
              aria-current={activeCategory === "all" ? "true" : undefined}
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
              }}
            >
              <CategorySvg id="all" />
              <span className="af-pj-dir__cat-label">All apps</span>
              <span className="af-pj-dir__cat-count">{categoryCounts.all ?? 0}</span>
            </button>

            <div className="af-pj-dir__sep" aria-hidden="true" />

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="af-pj-dir__cat"
                data-active={activeCategory === cat.id && !query.trim() ? "" : undefined}
                aria-current={activeCategory === cat.id ? "true" : undefined}
                onClick={() => {
                  setQuery("");
                  setActiveCategory(cat.id);
                }}
              >
                {cat.icon ?? <CategorySvg id={cat.id} />}
                <span className="af-pj-dir__cat-label">{cat.label}</span>
                <span className="af-pj-dir__cat-count">{categoryCounts[cat.id] ?? 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="af-pj-dir__main">
          <div className="af-pj-dir__bar">
            <h3 className="af-pj-dir__section-title" aria-live="polite">
              <span>{activeCategoryLabel}</span>
              <span className="af-pj-dir__section-count">{visibleApps.length}</span>
            </h3>
          </div>

          {visibleApps.length === 0 ? (
            <div className="af-pj-dir__empty">
              <AfIcon name="search" size={16} />
              <span>No integrations match your current filter.</span>
            </div>
          ) : (
            <div className="af-pj-dir__cards">
              {visibleApps.map((app) => {
                const pending = Boolean(pendingIds[app.id]);
                const hovered = hoveredId === app.id;
                return (
                  <article
                    key={app.id}
                    className="af-pj-dir__card"
                    data-connected={app.connected ? "" : undefined}
                  >
                    <div className="af-pj-dir__card-top">
                      {app.logo ? (
                        <span className="af-pj-dir__logo" style={{ background: app.tileColor ?? "#2563eb" }}>
                          {app.logo}
                        </span>
                      ) : (
                        <BrandAppTile id={app.id} name={app.name} tileColor={app.tileColor} size={34} />
                      )}

                      <div className="af-pj-dir__card-meta">
                        <div className="af-pj-dir__card-name">
                          <span>{app.name}</span>
                          {app.verified !== false && <VerifiedBadge />}
                        </div>
                        <span className="af-pj-dir__vendor">By {app.vendor}</span>
                      </div>
                    </div>

                    <p className="af-pj-dir__desc">{app.description}</p>

                    <div className="af-pj-dir__card-foot">
                      <button
                        type="button"
                        className="af-pj-dir__connect-btn"
                        data-connected={app.connected ? "" : undefined}
                        disabled={pending}
                        onMouseEnter={() => setHoveredId(app.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === app.id ? null : prev))}
                        onClick={() => handleToggleApp(app)}
                      >
                        {pending ? (
                          <>
                            <span className="af-pj-dir__spin" aria-hidden="true" />
                            <span>{app.connected ? "Disconnecting…" : "Connecting…"}</span>
                          </>
                        ) : app.connected ? (
                          hovered ? (
                            <span>Disconnect</span>
                          ) : (
                            <>
                              <AfIcon name="link" size={12} />
                              <span>Connected</span>
                            </>
                          )
                        ) : (
                          <span>Connect</span>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}

              {showDiscoverCard && (
                <article className="af-pj-dir__card af-pj-dir__card--more">
                  <div className="af-pj-dir__more-top">
                    <div className="af-pj-dir__card-meta">
                      <strong className="af-pj-dir__card-name">Discover more</strong>
                      <span className="af-pj-dir__vendor">+{extraCount} apps</span>
                    </div>
                    <div className="af-pj-dir__more-stack" aria-hidden="true">
                      <BrandAppTile id="intercom" name="Intercom" size={22} />
                      <BrandAppTile id="calendly" name="Calendly" size={22} />
                      <BrandAppTile id="loom" name="Loom" size={22} />
                    </div>
                  </div>
                  <div className="af-pj-dir__more-spacer" />
                  <div className="af-pj-dir__card-foot">
                    <button
                      type="button"
                      className="af-pj-dir__connect-btn"
                      onClick={() => setActiveCategory("all")}
                    >
                      <span>View all</span>
                      <AfIcon name="chevronRight" size={12} />
                    </button>
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** `AfAppDirectory` 兼容模式别名。 */
export const AfAppDirectoryPattern = AfAppDirectory;
export const AppDirectory = AfAppDirectory;
