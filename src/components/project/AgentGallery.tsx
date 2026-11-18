import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";

export interface GalleryItemMetric {
  label: string;
  value: string;
  spark?: number[];
}

export interface GalleryFeedNote {
  author: string;
  initials: string;
  when: string;
  text: string;
}

export interface GalleryItem {
  id: string;
  name: string;
  description: string;
  colors: [string, string];
  trigger: string;
  triggerEvent?: string;
  owner?: string;
  placeholder?: string;
  steps: string[];
  skills: string[];
  guardrail: string;
  metrics?: GalleryItemMetric[];
  contextItems?: string[];
  notes?: [GalleryFeedNote, GalleryFeedNote];
}

export interface AfAgentGalleryProps {
  /** 顶部主标题。 */
  title?: string;
  /** 标题下方的副标题。 */
  subtitle?: string;
  /** 智能体手风琴画廊条目。 */
  items?: GalleryItem[];
  /** 受控打开的面板索引。 */
  index?: number;
  /** 非受控初始打开的面板索引（默认居中条目）。 */
  defaultIndex?: number;
  /** 切换打开面板时回调。 */
  onIndexChange?: (index: number) => void;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfAgentGalleryPatternProps = AfAgentGalleryProps;

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "support-triage",
    name: "Support triage",
    description: "Sorts new tickets by urgency and routes them to the right team.",
    colors: ["#a651f0", "#e9dafa"],
    trigger: "Triggered by “Ticket created” · Owner Lena Hart",
    triggerEvent: "Ticket created",
    owner: "Lena Hart",
    placeholder: "Cannot close tickets",
    steps: [
      "Read the ticket and detect the product area",
      "Set priority from customer plan and sentiment",
      "Assign the team and post a summary in the thread",
    ],
    skills: ["Slack", "HubSpot", "Linear", "Intercom"],
    guardrail: "Cannot close tickets without human sign-off.",
    metrics: [
      { label: "Runs", value: "41", spark: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Success", value: "97%", spark: [11, 10, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Time saved", value: "6.1h", spark: [13, 12, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "7", spark: [8, 9, 7, 8, 6, 7, 5, 6, 5, 4] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Read the ticket and detect the product area.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Set priority from customer plan and sentiment. Assign the team and post a summary in the thread.",
      },
    ],
  },
  {
    id: "lead-enrichment",
    name: "Lead enrichment",
    description: "Fills in company data for every new lead before sales picks it up.",
    colors: ["#4fb0fe", "#c7e6ff"],
    trigger: "Triggered by “Lead added” · Owner Lena Hart",
    triggerEvent: "Lead added",
    owner: "Lena Hart",
    placeholder: "Cannot change lead owner",
    steps: [
      "Look up the company by email domain",
      "Add size, industry and location to the record",
      "Score the lead and notify the owner above 80",
    ],
    skills: ["HubSpot", "Slack", "Clearbit", "LinkedIn"],
    guardrail: "Cannot change lead owner automatically.",
    metrics: [
      { label: "Runs", value: "64", spark: [10, 6, 15, 11, 7, 3, 12, 8, 4, 13] },
      { label: "Success", value: "98%", spark: [11, 9, 8, 7, 6, 6, 5, 4, 4, 3] },
      { label: "Time saved", value: "6.4h", spark: [14, 12, 11, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "3", spark: [9, 8, 9, 7, 6, 7, 5, 5, 4, 4] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Look up the company by email domain.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Add size, industry and location to the record. Score the lead and notify the owner above 80.",
      },
    ],
  },
  {
    id: "meeting-recap",
    name: "Meeting recap",
    description: "Turns call transcripts into notes, decisions and next steps.",
    colors: ["#ee3e9e", "#fad0e7"],
    trigger: "Triggered by “Call ended” · Owner Lena Hart",
    triggerEvent: "Call ended",
    owner: "Lena Hart",
    placeholder: "Cannot email external guests",
    steps: [
      "Pull the transcript from the recording",
      "Write a short recap with decisions and owners",
      "Create follow-up tasks and share the notes",
    ],
    skills: ["Slack", "HubSpot", "Notion", "Linear"],
    guardrail: "Cannot email external guests.",
    metrics: [
      { label: "Runs", value: "163", spark: [13, 11, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Success", value: "95%", spark: [10, 9, 9, 8, 7, 7, 6, 5, 5, 4] },
      { label: "Time saved", value: "8.3h", spark: [14, 13, 11, 10, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "1", spark: [7, 6, 6, 5, 5, 4, 4, 3, 3, 3] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Pull the transcript from the recording.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Write a short recap with decisions and owners. Create follow-up tasks and share the notes.",
      },
    ],
  },
  {
    id: "churn-watch",
    name: "Churn watch",
    description: "Spots accounts that go quiet and suggests a save play.",
    colors: ["#f28a2e", "#fed7aa"],
    trigger: "Triggered by “Usage drops 30%” · Owner Lena Hart",
    triggerEvent: "Usage drops 30%",
    owner: "Lena Hart",
    placeholder: "Cannot offer discounts",
    steps: [
      "Compare weekly usage against the last quarter",
      "Check open tickets and recent NPS answers",
      "Draft a check-in for the account manager",
    ],
    skills: ["Slack", "HubSpot", "Stripe", "PostHog"],
    guardrail: "Cannot offer discounts without executive approval.",
    metrics: [
      { label: "Runs", value: "183", spark: [13, 11, 12, 9, 10, 7, 8, 5, 6, 3] },
      { label: "Success", value: "97%", spark: [9, 8, 7, 7, 6, 6, 5, 4, 4, 3] },
      { label: "Time saved", value: "3.3h", spark: [14, 12, 11, 9, 9, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "7", spark: [6, 8, 7, 9, 6, 8, 5, 7, 5, 6] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Compare weekly usage against the last quarter.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Check open tickets and recent NPS answers. Draft a check-in for the account manager.",
      },
    ],
  },
  {
    id: "onboarding-coach",
    name: "Onboarding coach",
    description: "Guides new workspaces through setup milestones and flags stalled rollouts.",
    colors: ["#13b3a0", "#d6f1ee"],
    trigger: "Triggered by “Workspace created” · Owner Lena Hart",
    triggerEvent: "Workspace created",
    owner: "Lena Hart",
    placeholder: "Cannot change billing",
    steps: [
      "Send a welcome note with the first three steps",
      "Watch for steps that stay open for two days",
      "Offer a short call when setup stalls",
    ],
    skills: ["Slack", "HubSpot", "Intercom", "Notion"],
    guardrail: "Cannot change billing settings.",
    metrics: [
      { label: "Runs", value: "124", spark: [13, 12, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Success", value: "98%", spark: [10, 9, 8, 8, 7, 6, 5, 5, 4, 3] },
      { label: "Time saved", value: "4.4h", spark: [13, 11, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "4", spark: [8, 7, 7, 6, 6, 5, 5, 4, 4, 3] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Send a welcome note with the first three steps.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Watch for steps that stay open for two days. Offer a short call when setup stalls.",
      },
    ],
  },
  {
    id: "content-review",
    name: "Content review",
    description: "Checks drafts for product accuracy, brand voice and broken claims before publish.",
    colors: ["#4fb0fe", "#e0f1ff"],
    trigger: "Triggered by “Draft submitted” · Owner Lena Hart",
    triggerEvent: "Draft submitted",
    owner: "Lena Hart",
    placeholder: "Cannot publish",
    steps: [
      "Check tone against the brand guide",
      "Flag claims that need a source",
      "Suggest fixes inline and tag the author",
    ],
    skills: ["Slack", "HubSpot", "Notion", "GitHub"],
    guardrail: "Cannot publish directly.",
    metrics: [
      { label: "Runs", value: "182", spark: [13, 11, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Success", value: "94%", spark: [10, 10, 9, 8, 8, 7, 6, 5, 5, 4] },
      { label: "Time saved", value: "5.2h", spark: [14, 12, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "5", spark: [8, 7, 8, 6, 7, 5, 6, 4, 5, 4] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Check tone against the brand guide.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Flag claims that need a source. Suggest fixes inline and tag the author.",
      },
    ],
  },
  {
    id: "release-notes",
    name: "Release notes",
    description: "Drafts customer-facing changelogs from merged pull requests.",
    colors: ["#a651f0", "#e6d4fa"],
    trigger: "Triggered by “Release tagged” · Owner Lena Hart",
    triggerEvent: "Release tagged",
    owner: "Lena Hart",
    placeholder: "Cannot post without review",
    steps: [
      "Collect merged pull requests since the last tag",
      "Group them into features, fixes and changes",
      "Draft notes in plain language for review",
    ],
    skills: ["Slack", "HubSpot", "GitHub", "Linear"],
    guardrail: "Cannot post without review.",
    metrics: [
      { label: "Runs", value: "127", spark: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Success", value: "99%", spark: [9, 8, 8, 7, 6, 6, 5, 4, 4, 3] },
      { label: "Time saved", value: "6.7h", spark: [14, 12, 11, 9, 8, 7, 6, 5, 4, 3] },
      { label: "Escalated", value: "6", spark: [8, 8, 7, 7, 6, 6, 5, 5, 4, 4] },
    ],
    notes: [
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "today",
        text: "Collect merged pull requests since the last tag.",
      },
      {
        author: "Jonas Weber",
        initials: "JW",
        when: "2d ago",
        text: "Group them into features, fixes and changes. Draft notes in plain language for review.",
      },
    ],
  },
];

type InnerTab = "runs" | "tools" | "context" | "settings";

function buildMiniSpark(pts: number[]) {
  const path = pts
    .map((y, idx) => `${idx === 0 ? "M" : "L"}${idx * 8} ${y}`)
    .join(" ");
  const lastX = (pts.length - 1) * 8;
  const lastY = pts[pts.length - 1] ?? 4;
  return { path, lastX, lastY };
}

/**
 * 智能体手风琴画廊（Pro Agent Block）：两侧柔和窄幅渐变面板 + 中央展开工作台屏幕。
 */
export function AfAgentGallery({
  title = "Agents that run your playbook",
  subtitle = "Give each agent its steps, tools and limits – then let it work inside the tools your team already uses.",
  items = DEFAULT_GALLERY_ITEMS,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  className,
}: AfAgentGalleryProps = {}) {
  const safeItems = items.length > 0 ? items : DEFAULT_GALLERY_ITEMS;
  const fallbackIndex =
    typeof defaultIndex === "number"
      ? Math.max(0, Math.min(safeItems.length - 1, defaultIndex))
      : Math.floor(safeItems.length / 2);

  const [activeIndex, setActiveIndex] = useControllableState<number>({
    value: indexProp,
    defaultValue: fallbackIndex,
    onChange: onIndexChange,
  });

  const [innerTab, setInnerTab] = useState<InnerTab>("context");
  const [searchText, setSearchText] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [extraNotesByItem, setExtraNotesByItem] = useState<Record<string, GalleryFeedNote[]>>({});

  const clampedIndex = Math.max(0, Math.min(safeItems.length - 1, activeIndex));
  const current = safeItems[clampedIndex] ?? safeItems[0];

  const selectIndex = (next: number) => {
    const wrapped = (next + safeItems.length) % safeItems.length;
    setActiveIndex(wrapped);
  };

  const handlePanelsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectIndex(clampedIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectIndex(clampedIndex + 1);
    }
  };

  const metrics = current.metrics ?? [
    { label: "Runs", value: "183", spark: [13, 11, 12, 9, 10, 7, 8, 5, 6, 3] },
    { label: "Success", value: "97%", spark: [9, 8, 7, 7, 6, 6, 5, 4, 4, 3] },
    { label: "Time saved", value: "3.3h", spark: [14, 12, 11, 9, 9, 7, 6, 5, 4, 3] },
    { label: "Escalated", value: "7", spark: [6, 8, 7, 9, 6, 8, 5, 7, 5, 6] },
  ];

  const defaultNotes: [GalleryFeedNote, GalleryFeedNote] = current.notes ?? [
    {
      author: "Jonas Weber",
      initials: "JW",
      when: "today",
      text: current.steps[0] ? `${current.steps[0]}.` : "Compare weekly usage against the last quarter.",
    },
    {
      author: "Jonas Weber",
      initials: "JW",
      when: "2d ago",
      text: current.steps.slice(1).join(". ") || "Check open tickets and recent NPS answers.",
    },
  ];

  const customNotes = extraNotesByItem[current.id] ?? [];
  const q = searchText.trim().toLowerCase();

  const handleAddContext = () => {
    const clean = draftContext.trim();
    if (!clean) return;
    setExtraNotesByItem((prev) => ({
      ...prev,
      [current.id]: [
        { author: "Lena Hart", initials: "LH", when: "just now", text: clean },
        ...(prev[current.id] ?? []),
      ],
    }));
    setDraftContext("");
  };

  return (
    <section
      className={cn("af-pj-gal", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={title || "Agent gallery"}
    >
      {(title || subtitle) && (
        <header className="af-pj-gal__head">
          {title && <h2 className="af-pj-gal__title">{title}</h2>}
          {subtitle && <p className="af-pj-gal__sub">{subtitle}</p>}
        </header>
      )}

      <div
        className="af-pj-gal__stage"
        role="group"
        aria-label={`Agents, ${clampedIndex + 1} of ${safeItems.length} – use the arrow keys to switch`}
        onKeyDown={handlePanelsKeyDown}
      >
        <div
          className="af-pj-gal__track"
          style={
            {
              "--af-gal-pos": safeItems.length + clampedIndex,
            } as CSSProperties
          }
        >
        {[0, 1, 2].flatMap((copyIdx) =>
          safeItems.map((item, idx) => {
            const pos = copyIdx * safeItems.length + idx;
            const activePos = safeItems.length + clampedIndex;
            const isClone = copyIdx !== 1;
            const isOpen = !isClone && idx === clampedIndex;
            const isFar = Math.abs(pos - activePos) > 1;
            const [strong, soft] = item.colors;
            const panelStyle = {
              "--af-gal-c1": strong,
              "--af-gal-c2": soft,
            } as CSSProperties;

            if (!isOpen) {
              return (
                <button
                  key={`${copyIdx}-${item.id}`}
                  type="button"
                  className="af-pj-gal__panel af-pj-gal__panel--slim"
                  style={panelStyle}
                  data-far={isFar ? "" : undefined}
                  aria-hidden={isClone ? "true" : undefined}
                  tabIndex={isClone ? -1 : undefined}
                  aria-label={`Show ${item.name}`}
                  title={item.name}
                  onClick={() => selectIndex(idx)}
                >
                  <span className="af-pj-gal__art" aria-hidden="true" />
                  <span className="af-pj-gal__slim-label">{item.name}</span>
                </button>
              );
            }

            return (
              <div
                key={`${copyIdx}-${item.id}`}
                className="af-pj-gal__panel af-pj-gal__panel--open"
                style={panelStyle}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${safeItems.length}: ${item.name}`}
              >
              <span className="af-pj-gal__art" aria-hidden="true" />

              <div className="af-pj-gal__screen" aria-label={`${item.name} workspace`}>
                <div className="af-pj-gal__topbar">
                  <div className="af-pj-gal__topbar-left">
                    <span className="af-pj-gal__brand-mark" aria-hidden="true" />
                    <span className="af-pj-gal__crumb">
                      <span className="af-pj-gal__crumb-dot" style={{ background: strong }} />
                      <span>{item.name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m8 10 4-4 4 4M8 14l4 4 4-4" />
                      </svg>
                    </span>
                  </div>
                  <div className="af-pj-gal__topbar-right">
                    <span className="af-pj-gal__new-pill">+ New agent</span>
                    <span className="af-pj-gal__mini-avatar" aria-hidden="true">LH</span>
                  </div>
                </div>

                <div className="af-pj-gal__body">
                  <div className="af-pj-gal__hero">
                    <div className="af-pj-gal__hero-main">
                      <span
                        className="af-pj-gal__glyph"
                        style={{
                          background: `linear-gradient(145deg, ${strong}, color-mix(in srgb, ${strong} 64%, #ffffff))`,
                        }}
                        aria-hidden="true"
                      />
                      <div className="af-pj-gal__hero-titles">
                        <strong className="af-pj-gal__agent-name">{item.name}</strong>
                        <span className="af-pj-gal__schedule">
                          {item.triggerEvent ? (
                            <>
                              Triggered by “<u className="af-pj-gal__u">{item.triggerEvent}</u>” · Owner {item.owner ?? "Lena Hart"}
                            </>
                          ) : (
                            item.trigger
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="af-pj-gal__sync">
                      3m ago
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12a7 7 0 0 1-12.3 4.6M5 12a7 7 0 0 1 12.3-4.6M17.5 4v3.5H14M6.5 20v-3.5H10" />
                      </svg>
                    </span>
                  </div>

                  <div className="af-pj-gal__metrics">
                    {metrics.map((m) => {
                      const sp = buildMiniSpark(m.spark ?? [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
                      return (
                        <div key={m.label} className="af-pj-gal__metric">
                          <span className="af-pj-gal__metric-label">{m.label}</span>
                          <div className="af-pj-gal__metric-row">
                            <strong className="af-pj-gal__metric-val">{m.value}</strong>
                            <svg className="af-pj-gal__spark" viewBox="-2 -2 78 20" aria-hidden="true">
                              <path d={sp.path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx={sp.lastX} cy={sp.lastY} r="2.1" fill="currentColor" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="af-pj-gal__tabs" role="tablist" aria-label="Agent configuration">
                    {(["runs", "tools", "context", "settings"] as const).map((tabId) => (
                      <button
                        key={tabId}
                        type="button"
                        role="tab"
                        aria-selected={innerTab === tabId}
                        className="af-pj-gal__tab"
                        data-active={innerTab === tabId ? "" : undefined}
                        onClick={() => setInnerTab(tabId)}
                      >
                        {tabId === "runs"
                          ? "Runs"
                          : tabId === "tools"
                            ? "Tools"
                            : tabId === "context"
                              ? "Context"
                              : "Settings"}
                      </button>
                    ))}
                  </div>

                  {innerTab === "context" && (
                    <div className="af-pj-gal__pane" role="tabpanel">
                      <div className="af-pj-gal__pane-head">
                        <div>
                          <strong className="af-pj-gal__pane-title">Agent context</strong>
                          <p className="af-pj-gal__pane-sub">
                            Goals, files and rules the agent uses on every run.
                          </p>
                        </div>
                        <div className="af-pj-gal__pane-tools">
                          <label className="af-pj-gal__search">
                            <AfIcon name="search" size={11} />
                            <input
                              type="search"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              placeholder="Search context…"
                              aria-label="Search context"
                            />
                          </label>
                          <span className="af-pj-gal__filter-pill">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M5 7h14M8 12h8M11 17h2" />
                            </svg>
                            All
                          </span>
                        </div>
                      </div>

                      <div className="af-pj-gal__compose">
                        <span className="af-pj-gal__mini-avatar" aria-hidden="true">LH</span>
                        <div className="af-pj-gal__compose-box">
                          <input
                            type="text"
                            value={draftContext}
                            onChange={(e) => setDraftContext(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddContext();
                              }
                            }}
                            placeholder={`Add context, e.g. “${item.placeholder ?? "Cannot offer discounts"}”`}
                            aria-label="Add context rule"
                          />
                          <div className="af-pj-gal__compose-foot">
                            <span className="af-pj-gal__clip" aria-hidden="true">
                              <AfIcon name="paperclip" size={12} />
                            </span>
                            <button
                              type="button"
                              className="af-pj-gal__add-btn"
                              onClick={handleAddContext}
                            >
                              Add context
                            </button>
                          </div>
                        </div>
                      </div>

                      {(customNotes.length > 0 || Boolean(q)) && (
                      <ol className="af-pj-gal__feed">
                        {customNotes.map((n, nIdx) => (
                          <li key={`c-${nIdx}`} className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="message" size={10} />
                            </span>
                            <div className="af-pj-gal__feed-body">
                              <p className="af-pj-gal__feed-line">
                                <span className="af-pj-gal__tiny-av">{n.initials}</span>
                                <b>{n.author}</b> added context · {n.when}
                              </p>
                              <p className="af-pj-gal__feed-card">{n.text}</p>
                            </div>
                          </li>
                        ))}
                        {(Boolean(q) && (defaultNotes[0].text.toLowerCase().includes(q) || defaultNotes[0].author.toLowerCase().includes(q))) && (
                          <li className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="message" size={10} />
                            </span>
                            <div className="af-pj-gal__feed-body">
                              <p className="af-pj-gal__feed-line">
                                <span className="af-pj-gal__tiny-av">{defaultNotes[0].initials}</span>
                                <b>{defaultNotes[0].author}</b> added context · {defaultNotes[0].when}
                              </p>
                              <p className="af-pj-gal__feed-card">{defaultNotes[0].text}</p>
                            </div>
                          </li>
                        )}
                        {(Boolean(q) && "mara lindqvist weekly summary".includes(q)) && (
                          <li className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="chart" size={10} />
                            </span>
                            <p className="af-pj-gal__feed-line">
                              <span className="af-pj-gal__tiny-av">ML</span>
                              <b>Mara Lindqvist</b> generated a <u className="af-pj-gal__u">Weekly summary</u> · 1d ago
                            </p>
                          </li>
                        )}
                        {(Boolean(q) && "mara lindqvist playbook.pdf accounts.csv".includes(q)) && (
                          <li className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="file" size={10} />
                            </span>
                            <p className="af-pj-gal__feed-line">
                              <span className="af-pj-gal__tiny-av">ML</span>
                              <b>Mara Lindqvist</b> added <u className="af-pj-gal__u">playbook.pdf</u>
                              <i className="af-pj-gal__ext" data-kind="pdf">PDF</i> and{" "}
                              <u className="af-pj-gal__u">accounts.csv</u>
                              <i className="af-pj-gal__ext" data-kind="csv">CSV</i> · 2d ago
                            </p>
                          </li>
                        )}
                        {(Boolean(q) && defaultNotes[1].text.toLowerCase().includes(q)) && (
                          <li className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="message" size={10} />
                            </span>
                            <div className="af-pj-gal__feed-body">
                              <p className="af-pj-gal__feed-line">
                                <span className="af-pj-gal__tiny-av">{defaultNotes[1].initials}</span>
                                <b>{defaultNotes[1].author}</b> added context · {defaultNotes[1].when}
                              </p>
                              <p className="af-pj-gal__feed-card">{defaultNotes[1].text}</p>
                            </div>
                          </li>
                        )}
                        {(Boolean(q) && "connected slack hubspot".includes(q)) && (
                          <li className="af-pj-gal__feed-item">
                            <span className="af-pj-gal__feed-dot" aria-hidden="true">
                              <AfIcon name="link" size={10} />
                            </span>
                            <p className="af-pj-gal__feed-line">
                              Connected <u className="af-pj-gal__u">Slack</u> and <u className="af-pj-gal__u">HubSpot</u> · 3d ago
                            </p>
                          </li>
                        )}
                      </ol>
                      )}
                    </div>
                  )}

                  {innerTab === "runs" && (
                    <div className="af-pj-gal__pane" role="tabpanel">
                      <strong className="af-pj-gal__pane-title">Playbook steps</strong>
                      <ol className="af-pj-gal__steps">
                        {item.steps.map((step, sIdx) => (
                          <li key={step} className="af-pj-gal__step">
                            <span className="af-pj-gal__step-num">{sIdx + 1}</span>
                            <span className="af-pj-gal__step-text">{step}</span>
                            <AfIcon name="check" size={12} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {innerTab === "tools" && (
                    <div className="af-pj-gal__pane" role="tabpanel">
                      <strong className="af-pj-gal__pane-title">Connected skills &amp; tools</strong>
                      <div className="af-pj-gal__chips">
                        {item.skills.map((skill) => (
                          <span key={skill} className="af-pj-gal__chip">
                            <AfIcon name="check" size={11} />
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {innerTab === "settings" && (
                    <div className="af-pj-gal__pane" role="tabpanel">
                      <strong className="af-pj-gal__pane-title">Guardrails &amp; schedule</strong>
                      <div className="af-pj-gal__kv">
                        <span>Trigger</span>
                        <strong>{item.trigger}</strong>
                      </div>
                      <div className="af-pj-gal__kv">
                        <span>Hard limit</span>
                        <strong>{item.guardrail}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
        </div>
      </div>

      <footer className="af-pj-gal__foot">
        <p className="af-pj-gal__caption" aria-live="polite">
          <strong>{current.name}.</strong> {current.description}
        </p>
        <div className="af-pj-gal__arrows">
          <button
            type="button"
            className="af-pj-gal__arrow"
            aria-label="Previous agent"
            onClick={() => selectIndex(clampedIndex - 1)}
          >
            <AfIcon name="chevronLeft" size={13} />
          </button>
          <button
            type="button"
            className="af-pj-gal__arrow"
            aria-label="Next agent"
            onClick={() => selectIndex(clampedIndex + 1)}
          >
            <AfIcon name="chevronRight" size={13} />
          </button>
        </div>
      </footer>
    </section>
  );
}

/** `AfAgentGallery` 兼容模式别名。 */
export const AfAgentGalleryPattern = AfAgentGallery;
export const AgentGallery = AfAgentGallery;
