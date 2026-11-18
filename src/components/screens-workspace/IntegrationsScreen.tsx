import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfModal } from "../overlay/Modal";
import { BrandAppTile } from "./BrandMarks";
import {
  WksSidebarExpandButton,
  WorkspaceInsetShell,
  type AfWorkspaceUser,
  type WksGroup,
  type WksNavItem,
} from "./WorkspaceShell";

export type AfIntegrationsProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
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

const GROUPS: WksGroup[] = [
  {
    label: "Projects",
    items: [
      { label: "Q3 Campaign", icon: "folder" },
      { label: "Brand assets", icon: "folder" },
      { label: "Hiring", icon: "folder" },
      { label: "Research", icon: "folder" },
    ],
  },
];

type IntegrationApp = {
  id: string;
  name: string;
  desc: string;
  mark: string;
  tone: "purple" | "blue" | "green" | "amber" | "rose" | "solid";
  extra?: boolean;
};

type IntegrationCategory = {
  title: string;
  moreLabel?: string;
  apps: IntegrationApp[];
};

const CATEGORIES: IntegrationCategory[] = [
  {
    title: "Popular",
    moreLabel: "Stripe, Zapier and 2 more",
    apps: [
      { id: "slack", name: "Slack", desc: "Get alerts in your channels and act on them without leaving the conversation.", mark: "S", tone: "purple" },
      { id: "notion", name: "Notion", desc: "Turn records into pages and keep project docs in sync both ways.", mark: "N", tone: "solid" },
      { id: "linear", name: "Linear", desc: "Create issues from customer feedback and track them to release.", mark: "L", tone: "purple" },
      { id: "figma", name: "Figma", desc: "Preview designs inline and link frames to the work they belong to.", mark: "F", tone: "rose" },
      { id: "github", name: "GitHub", desc: "Link pull requests and see deploy status next to every task.", mark: "G", tone: "solid" },
      { id: "hubspot", name: "HubSpot", desc: "Keep contacts, companies and deals matched across both tools.", mark: "H", tone: "amber" },
      { id: "stripe", name: "Stripe", desc: "Look up subscriptions, invoices and refund status directly in chat.", mark: "S", tone: "blue", extra: true },
      { id: "zapier", name: "Zapier", desc: "Trigger multi-step workflows whenever workspace events fire.", mark: "Z", tone: "amber", extra: true },
      { id: "jira", name: "Jira", desc: "Sync engineering sprints and escalate blockers with full context.", mark: "J", tone: "blue", extra: true },
      { id: "asana", name: "Asana", desc: "Mirror project milestones and assign follow-up tasks automatically.", mark: "A", tone: "rose", extra: true },
    ],
  },
  {
    title: "Google",
    apps: [
      { id: "gdrive", name: "Google Drive", desc: "Pick files from Drive and preview them without downloading.", mark: "D", tone: "green" },
      { id: "gcal", name: "Google Calendar", desc: "See upcoming meetings with every contact in one timeline.", mark: "C", tone: "blue" },
      { id: "ga", name: "Google Analytics", desc: "Attribute signups to the campaigns and pages that brought them.", mark: "A", tone: "amber" },
    ],
  },
  {
    title: "Communication",
    moreLabel: "Mixpanel, Make and 1 more",
    apps: [
      { id: "zoom", name: "Zoom", desc: "Start meetings from any record and save the recording link.", mark: "Z", tone: "blue" },
      { id: "discord", name: "Discord", desc: "Post updates to community channels when something ships.", mark: "D", tone: "purple" },
      { id: "intercom", name: "Intercom", desc: "See conversations next to the customer and reply from one place.", mark: "I", tone: "solid" },
      { id: "calendly", name: "Calendly", desc: "Log booked meetings and the answers people gave when booking.", mark: "C", tone: "blue" },
      { id: "typeform", name: "Typeform", desc: "Create records from form answers the moment they come in.", mark: "T", tone: "solid" },
      { id: "dropbox", name: "Dropbox", desc: "Attach files from Dropbox and keep shared folders linked.", mark: "D", tone: "blue" },
      { id: "mixpanel", name: "Mixpanel", desc: "Inspect funnel cohorts and retention curves alongside conversations.", mark: "M", tone: "purple", extra: true },
      { id: "make", name: "Make", desc: "Connect custom webhooks and scenario routers without code.", mark: "M", tone: "rose", extra: true },
      { id: "loom", name: "Loom", desc: "Embed async video walkthroughs with automatic transcripts.", mark: "L", tone: "purple", extra: true },
    ],
  },
];

export function AfIntegrations(props: AfIntegrationsProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Integrations");
  const [tab, setTab] = useState<"All" | "Connected" | "Available">("All");
  const [query, setQuery] = useState("");
  const [connected, setConnected] = useState<string[]>(["slack"]);
  const [expandedSecs, setExpandedSecs] = useState<Record<string, boolean>>({});

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTool, setRequestTool] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const toggleApp = (id: string) => {
    setConnected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.map((cat) => {
      const isExpanded = Boolean(expandedSecs[cat.title]) || q.length > 0 || tab !== "All";
      const pool = cat.apps.filter((app) => {
        const isConn = connected.includes(app.id);
        if (tab === "Connected" && !isConn) return false;
        if (tab === "Available" && isConn) return false;
        if (q && !app.name.toLowerCase().includes(q) && !app.desc.toLowerCase().includes(q)) return false;
        return true;
      });
      const visible = isExpanded ? pool : pool.filter((a) => !a.extra);
      const hiddenExtras = isExpanded ? [] : pool.filter((a) => a.extra);
      return { ...cat, visible, hiddenExtras };
    }).filter((cat) => cat.visible.length > 0);
  }, [query, tab, connected, expandedSecs]);

  // Per audit spec: loading wins when both loading and empty are true
  const showEmpty = empty && !loading;

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={GROUPS}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <div className="af-wks-scroll af-wks-int">
        <div className="af-wks-page-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WksSidebarExpandButton />
            <h1 className="af-wks-page-title">Integrations</h1>
          </div>
          <p className="af-wks-page-sub">
            Connect the tools your team already uses and work with them right in the chat.
          </p>
        </div>

        <div className="af-wks-toolbar af-wks-int__sticky">
          <div className="af-wks-pills" role="tablist" aria-label="Integration filter">
            {(["All", "Connected", "Available"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                className="af-wks-pill-tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="af-wks-toolbar__right">
            <label className="af-wks-search-input">
              <AfIcon name="search" size={12} />
              <input
                type="search"
                aria-label="Search integrations"
                placeholder="Search integrations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setRequestOpen(true)}>
              <AfIcon name="plus" size={12} />
              <span>Request</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[0, 1].map((sec) => (
              <div key={sec} className="af-wks-sec">
                <AfSkeleton width={90} height={12} />
                <div className="af-wks-int__rows">
                  {Array.from({ length: 4 }, (_, idx) => (
                    <AfSkeleton key={idx} variant="rect" width="48%" height={52} radius={10} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="af-wks-empty-wrap">
            <AfEmptyState
              icon="grid"
              title="No integrations yet"
              text="Request an integration for your team's stack and we'll notify you when it launches."
              action={
                <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setRequestOpen(true)}>
                  Request integration
                </button>
              }
            />
          </div>
        ) : filteredSections.length === 0 ? (
          <AfEmptyState
            size="sm"
            icon="search"
            title="No matching integrations"
            text="Try another search term or request a custom connector."
            action={
              <button type="button" className="af-wks-btn" onClick={() => { setQuery(""); setTab("All"); }}>
                Reset filters
              </button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {filteredSections.map((sec) => (
              <section key={sec.title} className="af-wks-sec">
                <h2 className="af-wks-sec__title" style={{ textTransform: "none", fontSize: 13, color: "var(--af-page-strong)" }}>
                  {sec.title}
                </h2>
                <div className="af-wks-int__rows">
                  {sec.visible.map((app) => {
                    const isConn = connected.includes(app.id);
                    const isVerified = sec.title === "Popular" && !app.extra;
                    return (
                      <div key={app.id} className="af-wks-int__row">
                        <BrandAppTile brand={app.id} size={30} radius={8} />
                        <span className="af-wks-int__text">
                          <span className="af-wks-int__name">
                            <span>{app.name}</span>
                            {isVerified ? (
                              <span
                                style={{ display: "inline-flex", color: "var(--af-page-faint)" }}
                                title="Verified integration"
                                aria-hidden="true"
                              >
                                <AfIcon name="checkCircle" size={12} />
                              </span>
                            ) : null}
                          </span>
                          <span className="af-wks-int__desc">{app.desc}</span>
                        </span>
                        <button
                          type="button"
                          className="af-wks-int__toggle"
                          data-connected={isConn || undefined}
                          aria-label={isConn ? `Disconnect ${app.name}` : `Connect ${app.name}`}
                          onClick={() => toggleApp(app.id)}
                        >
                          <AfIcon name={isConn ? "check" : "plus"} size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {sec.hiddenExtras.length > 0 && sec.moreLabel ? (
                  <button
                    type="button"
                    className="af-wks-int__more"
                    onClick={() => setExpandedSecs((prev) => ({ ...prev, [sec.title]: true }))}
                  >
                    <span className="af-wks-int__stack" aria-hidden="true">
                      {sec.hiddenExtras.slice(0, 3).map((ex) => (
                        <BrandAppTile key={ex.id} brand={ex.id} size={15} radius={4} glyphSize={9} />
                      ))}
                    </span>
                    <span>{sec.moreLabel}</span>
                    <AfIcon name="chevronRight" size={11} />
                  </button>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>

      <AfModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request integration"
        description={`Tell us which tool ${workspace} should connect with next.`}
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn" onClick={() => setRequestOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => {
                setRequestTool("");
                setRequestNote("");
                setRequestOpen(false);
              }}
            >
              Submit request
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            className="af-wks-field-input"
            placeholder="Tool or service name (e.g. Linear, Snowflake)"
            value={requestTool}
            onChange={(e) => setRequestTool(e.target.value)}
          />
          <textarea
            className="af-wks-field-area"
            placeholder="How would your team use it in chat?"
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
          />
        </div>
      </AfModal>
    </WorkspaceInsetShell>
  );
}
