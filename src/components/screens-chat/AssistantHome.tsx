import { useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfChatComposer } from "../chat/ChatComposer";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  DEFAULT_SHELL_ARTIFACTS,
  type AfChatScreenUser,
  type AfWorkAreaTabItem,
} from "./ChatShell";

export type AfAssistantHomeProps = HTMLAttributes<HTMLDivElement> & {
  /** Called with the label of a sidebar item or project. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar, defaults to `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton loading state for quick prompts and connected apps while composer stays mounted. */
  loading?: boolean;
};

const QUICK_PROMPTS: { id: string; label: string; prompt: string; icon: AffectIconKey }[] = [
  {
    id: "knowledge",
    label: "Company knowledge",
    prompt: "Search our company knowledge base for Q3 launch messaging and positioning guidelines.",
    icon: "layers",
  },
  {
    id: "doc",
    label: "Create document",
    prompt: "Draft a concise Q3 launch brief using our naming guide and campaign notes.",
    icon: "file",
  },
  {
    id: "deck",
    label: "Create presentation",
    prompt: "Outline a 10-slide Q3 campaign kickoff presentation with key milestones.",
    icon: "kanban",
  },
  {
    id: "table",
    label: "Create table",
    prompt: "Create a channel budget comparison table across paid search, creators, and email.",
    icon: "grid",
  },
  {
    id: "image",
    label: "Generate image",
    prompt: "Generate studio hero moodboard directions for the unbleached linen overshirt.",
    icon: "image",
  },
  {
    id: "research",
    label: "Deep research",
    prompt: "Run a deep research pass on European linen mill lead times and pricing benchmarks.",
    icon: "globe",
  },
  {
    id: "visualize",
    label: "Visualize data",
    prompt: "Visualize weekly CAC and ROAS trends from launch-budget.csv.",
    icon: "chart",
  },
];

const CONNECTED_APPS = [
  { id: "gmail", name: "Gmail", mark: "M", tone: "mail" as const, connected: true },
  { id: "slack", name: "Slack", mark: "#", tone: "chat" as const, connected: true },
  { id: "clickup", name: "ClickUp", mark: "C", tone: "docs" as const, connected: true },
  { id: "notion", name: "Notion", mark: "N", tone: "docs" as const, connected: false },
];

/** AI Chat / Start (`assistant-home`): Greeting, prompt box with tools & connected apps, quick suggestions, and folded Work Area. */
export function AfAssistantHome(props: AfAssistantHomeProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    className,
    ...rest
  } = props;

  const [draft, setDraft] = useState("");
  const [workOpen, setWorkOpen] = useState(false);
  const [tabs, setTabs] = useState<AfWorkAreaTabItem[]>([
    { id: "tab-new", title: "New tab", kind: "new", closable: true },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-new");
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);

  const openSuggestedArtifact = (key: string) => {
    const art = DEFAULT_SHELL_ARTIFACTS[key];
    if (!art) return;
    const id = art.id ?? key;
    setWorkOpen(true);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      const created: AfWorkAreaTabItem = {
        id,
        title: art.title ?? key,
        kind: art.kind,
        closable: true,
        artifact: art,
      };
      return prev.length === 1 && prev[0]?.kind === "new" ? [created] : [...prev, created];
    });
    setActiveTabId(id);
  };

  return (
    <ChatInsetShell
      data-home-shell=""
      workspace={workspace}
      user={user}
      activeNav="New chat"
      onNavigate={onNavigate}
      mainHeader={false}
      workAreaOpen={workOpen}
      onWorkAreaOpenChange={setWorkOpen}
      workAreaOpenLabel="Open workspace"
      tabs={tabs}
      activeTabId={activeTabId}
      onTabsChange={setTabs}
      onActiveTabChange={setActiveTabId}
      suggestedArtifacts={DEFAULT_SHELL_ARTIFACTS}
      className={className}
      {...rest}
    >
      <div className="af-sc-start">
        <div className="af-sc-start__center">
          <h2 className="af-sc-start__greeting">Good morning! What’s next on your list?</h2>

          <div className="af-sc-start__composer">
            <AfChatComposer
              value={draft}
              onValueChange={setDraft}
              placeholder="Help me brainstorm ideas for..."
              apps={CONNECTED_APPS}
              folders={["Q3 Campaign", "Brand assets", "Research"]}
              disabled={loading}
              loading={loading}
              onSend={(text) => {
                if (loading) return;
                setSubmittedPrompt(text);
                setDraft("");
              }}
            />

            {loading ? (
              <div className="af-sc-start__tray-skel" aria-label="Loading connected apps">
                <AfSkeleton width={92} height={20} radius={999} />
                <AfSkeleton width={76} height={20} radius={999} />
                <AfSkeleton width={84} height={20} radius={999} />
                <AfSkeleton width={72} height={20} radius={999} />
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="af-sc-start__prompts" aria-hidden="true">
              <AfSkeleton width={132} height={30} radius={999} />
              <AfSkeleton width={136} height={30} radius={999} />
              <AfSkeleton width={140} height={30} radius={999} />
              <AfSkeleton width={144} height={30} radius={999} />
            </div>
          ) : (
            <div className="af-sc-start__prompts">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="af-sc-prompt-chip"
                  onClick={() => setDraft(item.prompt)}
                >
                  <AfIcon name={item.icon} size={13} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {submittedPrompt && !loading ? (
            <div className="af-sc-start__reply" role="status" aria-live="polite">
              <div className="af-sc-start__reply-top">
                <span>Started thread · {submittedPrompt}</span>
                <button
                  type="button"
                  className="af-sc-mini-pill"
                  onClick={() => setSubmittedPrompt(null)}
                >
                  Clear
                </button>
              </div>
              <p>
                Pulled context from <strong>Q4 Launch</strong> and prepared{" "}
                <button
                  type="button"
                  className="af-sc-inline-link"
                  onClick={() => openSuggestedArtifact("launch-checklist.md")}
                >
                  Launch checklist
                </button>{" "}
                in the work area.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </ChatInsetShell>
  );
}
