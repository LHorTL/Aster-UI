import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfSwitch } from "../controls/Switch";
import { AfChatComposer } from "../chat/ChatComposer";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  artifactKindIcon,
  type AfChatScreenUser,
  type AfChatSidebarThread,
  type AfShellArtifact,
  type AfWorkAreaTabItem,
} from "./ChatShell";

export type AfAgentChatProps = HTMLAttributes<HTMLDivElement> & {
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar, defaults to `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton loading state for chat title, thread, agents at work and brief sections. */
  loading?: boolean;
  /** Empty state when there are no chats yet; `loading` wins when both are on. */
  empty?: boolean;
};

const CAMPAIGN_FILES: Record<string, AfShellArtifact> = {
  "brand-guide.md": {
    id: "brand-guide.md",
    title: "brand-guide.md",
    kind: "document",
    subtitle: "Document · Brand palette & voice",
    updated: "Edited 2d ago",
    doc: `# Acme Summer Footwear — Brand Guide\n\n## Palette\n- Obsidian (#18181B) — primary typography\n- Unbleached Linen (#F4F0E8) — backgrounds & packaging\n- Terracotta (#D96B43) — seasonal campaign accent\n\n## Voice\nDirect, tactile, and unhurried. Name real materials (12 oz Belgian linen, natural crepe rubber) instead of superlatives.`,
  },
  "launch-budget.csv": {
    id: "launch-budget.csv",
    title: "launch-budget.csv",
    kind: "sheet",
    subtitle: "Sheet · Paid & creator allocation",
    headers: ["Channel", "Share", "Target ROAS", "Budget"],
    rows: [
      { cells: ["Instagram Reels", "42%", "3.4x", "$18,900"] },
      { cells: ["Creator seeding", "28%", "4.1x", "$12,600"] },
      { cells: ["Editorial email", "18%", "6.8x", "$8,100"] },
      { cells: ["Lookbook print", "12%", "2.0x", "$5,400"] },
      { cells: ["Total", "100%", "3.9x", "$45,000"], formula: "=SUM(D2:D5)", total: true },
    ],
  },
  "product-photos": {
    id: "product-photos",
    title: "product-photos",
    kind: "folder",
    subtitle: "Folder · 3 studio selects",
    files: [
      {
        name: "linen-low-terracotta.jpg",
        meta: "3.1 MB · 2800 × 2100",
        preview: "Side profile of the unbleached linen low-top with terracotta heel tab on travertine.",
        kind: "image",
      },
      {
        name: "crepe-outsole-detail.jpg",
        meta: "1.9 MB · 2000 × 2000",
        preview: "Close-up of pebbled natural crepe outsole and stitched welt.",
        kind: "image",
      },
      {
        name: "box-tissue-unboxing.jpg",
        meta: "2.2 MB · 2400 × 1800",
        preview: "Kraft shoebox with warm terracotta woven label and care card.",
        kind: "image",
      },
    ],
  },
};

type AgentWorker = {
  id: string;
  name: string;
  status: "done" | "running";
  summary: string;
  time: string;
};

const WORKERS: AgentWorker[] = [
  {
    id: "brand",
    name: "Brand strategist",
    status: "done",
    summary: "Compared brand-guide.md against live Shopify theme tokens; flagged missing terracotta accent.",
    time: "2.1s",
  },
  {
    id: "copy",
    name: "Copywriter",
    status: "running",
    summary: "Drafting hero headline variants and 3 Instagram caption hooks.",
    time: "Running",
  },
  {
    id: "audience",
    name: "Audience research",
    status: "done",
    summary: "Mapped repeat linen apparel buyers to high-LTV lookalike segments.",
    time: "1.8s",
  },
];

const AGENT_CHAT_PROJECTS = ["Q3 Launch", "Brand assets", "Research"];

const AGENT_CHAT_THREADS: AfChatSidebarThread[] = [
  { id: "t-campaign", title: "Campaign for our summer sneaker", pinned: true },
  { id: "t-hooks", title: "Ad hooks for the linen overshirt", project: "Q3 Launch", dot: true },
  { id: "t-budget", title: "Q3 budget split by channel", project: "Q3 Launch" },
  { id: "t-follow", title: "Follow up after sales calls" },
  { id: "t-notes", title: "Competitor notes" },
];

/** AI Chat / Agents (`agent-chat`): Orchestrating agent chat, sub-agents at work, and interactive Campaign Brief beside it. */
export function AfAgentChat(props: AfAgentChatProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const isEmpty = !loading && empty;

  const [draft, setDraft] = useState("");
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [briefSubTab, setBriefSubTab] = useState<"Brief" | "Assets" | "Activity">("Brief");
  const [productName, setProductName] = useState("Linen Low — Summer Drop");
  const [channels, setChannels] = useState<Record<string, boolean>>({
    Instagram: true,
    TikTok: true,
    Newsletter: true,
    "Paid search": false,
  });
  const [selectedAccent, setSelectedAccent] = useState("#D96B43");
  const [briefLaunched, setBriefLaunched] = useState(false);

  const [extraReplies, setExtraReplies] = useState<{ id: string; user: string; reply: string }[]>([]);

  const [workOpen, setWorkOpen] = useState(true);
  const [extraTabs, setExtraTabs] = useState<AfWorkAreaTabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState("tab-brief");

  const openCampaignFile = (key: string) => {
    const art = CAMPAIGN_FILES[key];
    if (!art) return;
    const id = art.id ?? key;
    setWorkOpen(true);
    setExtraTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          title: art.title ?? key,
          kind: art.kind,
          closable: true,
          artifact: art,
        },
      ];
    });
    setActiveTabId(id);
  };

  const renderBriefPanel = () => {
    return (
      <div className="af-sc-brief">
        <div className="af-sc-subtabs" role="tablist" aria-label="Brief sections">
          {(["Brief", "Assets", "Activity"] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              role="tab"
              aria-selected={briefSubTab === sec}
              className="af-sc-subtab"
              data-active={briefSubTab === sec || undefined}
              onClick={() => setBriefSubTab(sec)}
            >
              {sec}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="af-sc-brief__body" aria-label="Loading brief">
            <AfSkeleton width={96} height={11} />
            <AfSkeleton width="100%" height={32} radius={8} />
            <AfSkeleton width={88} height={11} />
            <AfSkeleton lines={3} height={14} />
            <AfSkeleton width="100%" height={76} radius={10} />
          </div>
        ) : isEmpty ? (
          <div className="af-sc-brief__empty">
            {briefSubTab === "Brief" ? (
              <p>Goals, target channels, brand palette and source files filled in by the orchestrator will appear here.</p>
            ) : briefSubTab === "Assets" ? (
              <p>Drafted headlines, email copy and social visuals produced by sub-agents will collect here.</p>
            ) : (
              <p>Every handoff, file read and tool run across your creative agents will stream here.</p>
            )}
          </div>
        ) : briefSubTab === "Brief" ? (
          <div className="af-sc-brief__body">
            <div className="af-sc-brief__field">
              <span className="af-sc-sec-label">Campaign</span>
              <AfInput
                aria-label="Campaign product"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="af-sc-brief__field">
              <span className="af-sc-sec-label">Channels</span>
              <div className="af-sc-brief__rows">
                {Object.entries(channels).map(([ch, enabled]) => (
                  <div key={ch} className="af-sc-brief__switch-row">
                    <span>{ch}</span>
                    <AfSwitch
                      checked={enabled}
                      aria-label={ch}
                      onCheckedChange={(v) => setChannels((prev) => ({ ...prev, [ch]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="af-sc-brief__field">
              <span className="af-sc-sec-label">Colorway</span>
              <div className="af-sc-colorway-dots" role="radiogroup" aria-label="Colorway">
                {[
                  { hex: "#18181B", label: "Obsidian" },
                  { hex: "#F4F0E8", label: "Linen" },
                  { hex: "#D96B43", label: "Terracotta" },
                ].map((sw) => (
                  <button
                    key={`dot-${sw.hex}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedAccent === sw.hex}
                    aria-label={sw.label}
                    className="af-sc-colorway-dot"
                    data-active={selectedAccent === sw.hex || undefined}
                    style={{ background: sw.hex }}
                    onClick={() => setSelectedAccent(sw.hex)}
                  />
                ))}
              </div>
              <div className="af-sc-swatches">
                {[
                  { hex: "#18181B", label: "Obsidian" },
                  { hex: "#F4F0E8", label: "Linen" },
                  { hex: "#D96B43", label: "Terracotta" },
                ].map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    className="af-sc-swatch"
                    data-active={selectedAccent === sw.hex || undefined}
                    onClick={() => setSelectedAccent(sw.hex)}
                  >
                    <span className="af-sc-swatch__dot" style={{ background: sw.hex }} aria-hidden="true" />
                    <span>{sw.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="af-sc-brief__field">
              <span className="af-sc-sec-label">Files</span>
              <div className="af-sc-brief__files">
                {Object.entries(CAMPAIGN_FILES).map(([key, art]) => (
                  <button
                    key={key}
                    type="button"
                    className="af-sc-file-chip"
                    onClick={() => openCampaignFile(key)}
                  >
                    <AfIcon name={artifactKindIcon(art.kind)} size={13} />
                    <span>{art.title ?? key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="af-sc-brief__cta">
              <AfButton
                variant="primary"
                size="sm"
                onClick={() => setBriefLaunched(true)}
              >
                {briefLaunched ? "Brief approved · Generating" : "Approve & generate assets"}
              </AfButton>
            </div>
          </div>
        ) : briefSubTab === "Assets" ? (
          <div className="af-sc-brief__body">
            {[
              { title: "Hero copy — 3 variants", meta: "Copywriter · Ready to review", file: "brand-guide.md" },
              { title: "Channel budget split", meta: "Strategist · $45,000 total", file: "launch-budget.csv" },
              { title: "Studio selects (3 frames)", meta: "Folder · Quick Look", file: "product-photos" },
            ].map((asset) => (
              <button
                key={asset.title}
                type="button"
                className="af-sc-suggest-row"
                onClick={() => openCampaignFile(asset.file)}
              >
                <span className="af-sc-suggest-row__text">
                  <strong>{asset.title}</strong>
                  <span>{asset.meta}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="af-sc-brief__body">
            {[
              { who: "Orchestrator", what: "Read brand-guide.md and launch-budget.csv", at: "2m ago" },
              { who: "Brand strategist", what: "Flagged terracotta accent mismatch on Shopify", at: "1m ago" },
              { who: "Copywriter", what: "Drafting summer drop hero lines", at: "Now" },
            ].map((ev, i) => (
              <div key={i} className="af-sc-act-item">
                <strong>{ev.who}</strong>
                <span>{ev.what}</span>
                <small>{ev.at}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const allTabs = useMemo<AfWorkAreaTabItem[]>(
    () => [
      {
        id: "tab-brief",
        title: "Campaign brief",
        kind: "custom",
        closable: true,
        content: renderBriefPanel(),
      },
      ...extraTabs,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [briefSubTab, loading, isEmpty, productName, channels, selectedAccent, briefLaunched, extraTabs],
  );

  return (
    <ChatInsetShell
      workspace={workspace}
      user={user}
      activeNav="New chat"
      projects={AGENT_CHAT_PROJECTS}
      threads={AGENT_CHAT_THREADS}
      activeThreadId={isEmpty ? undefined : "t-campaign"}
      hideThreads={isEmpty}
      showSidebarCards={!isEmpty}
      onNavigate={onNavigate}
      mainHeader={{
        title: loading ? (
          <AfSkeleton width={196} height={14} />
        ) : isEmpty ? (
          "New chat"
        ) : (
          "Campaign for our summer sneaker"
        ),
        actions: !isEmpty && !loading ? (
          <button
            type="button"
            className="af-sc-mini-pill"
            onClick={() => {
              setWorkOpen(true);
              setActiveTabId("tab-brief");
            }}
          >
            Create asset
          </button>
        ) : null,
      }}
      workAreaOpen={workOpen}
      onWorkAreaOpenChange={setWorkOpen}
      workAreaOpenLabel="Open brief"
      tabs={allTabs}
      activeTabId={activeTabId}
      onTabsChange={(next) => {
        const restTabs = next.filter((t) => t.id !== "tab-brief");
        setExtraTabs(restTabs);
      }}
      onActiveTabChange={setActiveTabId}
      suggestedArtifacts={CAMPAIGN_FILES}
      className={className}
      {...rest}
    >
      <div className="af-sc-thread-layout">
        <div className="af-sc-thread-scroll">
          {loading ? (
            <div className="af-sc-thread-col" aria-label="Loading conversation">
              <div className="af-sc-bubble-skel">
                <AfSkeleton width={248} height={36} radius={16} />
              </div>
              <div className="af-sc-agent-skel">
                <AfSkeleton lines={3} height={13} />
                <div className="af-sc-worker-row">
                  <AfSkeleton width={132} height={28} radius={999} />
                  <AfSkeleton width={118} height={28} radius={999} />
                  <AfSkeleton width={140} height={28} radius={999} />
                </div>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="af-sc-thread-empty">
              <AfEmptyState
                bare
                icon="message"
                title="No chats yet"
                text="Describe a launch, report or research task — your orchestrator will coordinate specialist agents and build the brief beside you."
                action={
                  <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("New chat")}>
                    Start a chat
                  </AfButton>
                }
              />
            </div>
          ) : (
            <div className="af-sc-thread-col">
              <div className="af-sc-user-msg">
                <div className="af-sc-user-bubble">Create launch assets for our summer sneaker</div>
              </div>

              <div className="af-sc-agent-msg">
                <p>
                  I’ll put your campaign brief together first, then spin up the creative generators.
                </p>
                <p>
                  <strong>One thing before I finalize the visuals:</strong> your{" "}
                  <button
                    type="button"
                    className="af-sc-inline-link"
                    onClick={() => openCampaignFile("brand-guide.md")}
                  >
                    brand-guide.md
                  </button>{" "}
                  lists three colors, while the live Shopify theme only uses two — terracotta is missing.
                  Should I keep terracotta as the accent across the launch assets, or stick to the two on
                  the site?
                </p>

                <div className="af-sc-worker-row" role="list" aria-label="Agents at work">
                  {WORKERS.map((w) => {
                    const open = expandedWorker === w.id;
                    return (
                      <div key={w.id} role="listitem" className="af-sc-worker-wrap">
                        <button
                          type="button"
                          className="af-sc-worker-pill"
                          aria-expanded={open}
                          data-status={w.status}
                          onClick={() => setExpandedWorker(open ? null : w.id)}
                        >
                          <span className="af-sc-worker-dot" data-status={w.status} aria-hidden="true" />
                          <strong>{w.name}</strong>
                          <span>{w.time}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {expandedWorker ? (
                  <div className="af-sc-worker-detail">
                    {WORKERS.find((w) => w.id === expandedWorker)?.summary}
                  </div>
                ) : null}
              </div>

              {extraReplies.map((item) => (
                <div key={item.id} className="af-sc-turn-pair">
                  <div className="af-sc-user-msg">
                    <div className="af-sc-user-bubble">{item.user}</div>
                  </div>
                  <div className="af-sc-agent-msg">
                    <p>{item.reply}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="af-sc-thread-foot">
          <div className="af-sc-thread-col">
            <div className="af-sc-orch-bar">
              <span className="af-sc-worker-dot" data-status="done" aria-hidden="true" />
              <span>Orchestrator · Reviews before external actions</span>
            </div>
            <AfChatComposer
              value={draft}
              onValueChange={setDraft}
              placeholder="Reply to Orchestrator…"
              disabled={loading || isEmpty}
              loading={loading}
              onSend={(text) => {
                if (loading || isEmpty) return;
                setExtraReplies((prev) => [
                  ...prev,
                  {
                    id: `r-${Date.now()}`,
                    user: text,
                    reply: `Got it — updated the Campaign brief (${productName}) with "${text}" and synced the Copywriter agent.`,
                  },
                ]);
                setDraft("");
              }}
            />
          </div>
        </div>
      </div>
    </ChatInsetShell>
  );
}
