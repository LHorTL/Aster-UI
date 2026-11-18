import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfChatComposer } from "../chat/ChatComposer";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  type AfChatScreenUser,
  type AfChatSidebarItem,
  type AfChatSidebarThread,
  type AfShellArtifact,
  type AfWorkAreaTabItem,
} from "./ChatShell";

export type AfAgentChatRailProps = HTMLAttributes<HTMLDivElement> & {
  /** Called with the label of an icon, a sidebar item or a project. */
  onNavigate?: (label: string) => void;
  /** The workspace – its initial tops the icon column and opens its menu, defaults to `"Acme"`. */
  workspace?: string;
  /** The account – its picture/initials at the bottom of the icon column, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton loading state for thread messages and Task/artifact panel while sending waits. */
  loading?: boolean;
  /** Empty state when there are no chats yet; `loading` wins when both are on. */
  empty?: boolean;
};

const RAIL_SECTIONS: AfChatSidebarItem[] = [
  { label: "Chats", icon: "message" },
  { label: "Tasks", icon: "checkCircle" },
  { label: "Runs", icon: "play" },
  { label: "Inbox", icon: "inbox", dot: true },
  { label: "Folders", icon: "folder" },
];

const RAIL_PROJECTS = ["Summer collection", "Website refresh"];

const RAIL_CHATS: AfChatSidebarThread[] = [
  {
    id: "rc-voice",
    title: "Tone of voice, in five rules",
    pinned: true,
    meta: "Pinned",
  },
  {
    id: "rc-linen",
    title: "Best fabric for a summer overshirt",
    project: "Summer collection",
    meta: "Just now",
  },
  {
    id: "rc-moq",
    title: "Supplier shortlist – Portugal",
    project: "Summer collection",
    meta: "2h ago",
  },
  {
    id: "rc-care",
    title: "Wash test notes",
    project: "Summer collection",
    meta: "Yesterday",
  },
  {
    id: "rc-checkout",
    title: "Homepage hero copy",
    project: "Website refresh",
    meta: "Nov 12",
  },
];

const FABRIC_ARTIFACTS: Record<string, AfShellArtifact> = {
  "fabric-comparison.csv": {
    id: "fabric-comparison.csv",
    title: "fabric-comparison.csv",
    kind: "sheet",
    subtitle: "Just now",
    headers: ["Fabric", "GSM", "Airflow", "Drape"],
    rows: [
      { cells: ["Linen", "185", "Very high", "Relaxed"] },
      { cells: ["55/45 Linen-cotton", "195", "High", "Clean"] },
      { cells: ["Cotton seersucker", "150", "High", "Crisp"] },
      { cells: ["Tencel-linen twill", "210", "Med-high", "Smooth"] },
    ],
  },
  "sources.md": {
    id: "sources.md",
    title: "sources.md",
    kind: "document",
    subtitle: "Document · 3 web sources",
    updated: "Searched just now",
    doc: `# European Mill Notes — Summer Overshirt\n\n- **Libeco (Belgium)**: Masters of Linen certified 185–205 gsm plain weave; pre-washed enzyme finish cuts shrinkage below 2%.\n- **Somelos (Portugal)**: 55/45 linen-combed cotton 195 gsm oxford weave; holds collar structure over a tee.`,
  },
};

const SEARCH_SOURCES = [
  { title: "Masters of Linen — Apparel GSM weight guide", domain: "celc.eu", time: "1.1s" },
  { title: "Libeco Belgian Linen — Shirt & overshirt specs", domain: "libeco.com", time: "1.0s" },
  { title: "Somelos Tecidos — Linen/cotton blended shirting", domain: "somelos.pt", time: "1.0s" },
];

/** AI Chat / Double Sidebar (`agent-chat-rail`): Outer icon column + resizable project chat column + web search chat + Work Area. */
export function AfAgentChatRail(props: AfAgentChatRailProps = {}) {
  const {
    onNavigate,
    workspace = "Fieldwork",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const isEmpty = !loading && empty;

  const [selectedProject, setSelectedProject] = useState("All projects");
  const [activeChatId, setActiveChatId] = useState("rc-linen");
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  const [replies, setReplies] = useState<{ id: string; user: string; text: string; stopped?: boolean }[]>([]);
  const streamTimerRef = useRef<number | null>(null);

  const [workOpen, setWorkOpen] = useState(!isEmpty);
  const [tabs, setTabs] = useState<AfWorkAreaTabItem[]>(() => [
    {
      id: "fabric-comparison.csv",
      title: "fabric-comparison.csv",
      kind: "sheet",
      closable: true,
      artifact: FABRIC_ARTIFACTS["fabric-comparison.csv"],
    },
    {
      id: "sources.md",
      title: "sources.md",
      kind: "document",
      closable: true,
      artifact: FABRIC_ARTIFACTS["sources.md"],
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("fabric-comparison.csv");

  useEffect(
    () => () => {
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    },
    [],
  );

  const effectiveTabs = useMemo<AfWorkAreaTabItem[]>(
    () =>
      isEmpty
        ? [{ id: "tab-empty-new", title: "New tab", kind: "new", closable: true }]
        : tabs,
    [isEmpty, tabs],
  );

  const openFabricFile = (key: string) => {
    const art = FABRIC_ARTIFACTS[key];
    if (!art) return;
    setWorkOpen(true);
    setTabs((prev) => {
      if (prev.some((t) => t.id === key)) return prev;
      return [...prev, { id: key, title: art.title ?? key, kind: art.kind, closable: true, artifact: art }];
    });
    setActiveTabId(key);
  };

  const stopStreaming = () => {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (streamingReply !== null) {
      setReplies((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) {
          copy[copy.length - 1] = { ...last, text: streamingReply, stopped: true };
        }
        return copy;
      });
      setStreamingReply(null);
    }
  };

  const handleSend = (text: string) => {
    if (loading || isEmpty || !text.trim()) return;
    const fullAnswer = `For "${text.trim()}", pre-washed 195 gsm 55/45 linen-cotton keeps collar structure over a T-shirt while staying breathable above 28°C. I updated fabric-comparison.csv in the work area.`;
    const words = fullAnswer.split(" ");
    const replyId = `rep-${Date.now()}`;
    setReplies((prev) => [...prev, { id: replyId, user: text.trim(), text: "" }]);
    setDraft("");
    let idx = 0;
    setStreamingReply("");
    if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    streamTimerRef.current = window.setInterval(() => {
      idx += 2;
      const slice = words.slice(0, idx).join(" ");
      setStreamingReply(slice);
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, text: slice } : r)),
      );
      if (idx >= words.length) {
        if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setStreamingReply(null);
      }
    }, 55);
  };

  return (
    <ChatInsetShell
      workspace={workspace}
      user={user}
      activeThreadId={isEmpty ? undefined : activeChatId}
      threads={RAIL_CHATS}
      projects={RAIL_PROJECTS}
      hideThreads={isEmpty}
      onSelectThread={(t) => setActiveChatId(t.id)}
      onNavigate={onNavigate}
      rail={{
        sections: RAIL_SECTIONS,
        activeSection: "Chats",
        selectedProject,
        onSelectProject: setSelectedProject,
        emptyText: "No chats yet",
      }}
      mainHeader={false}
      workAreaOpen={isEmpty ? false : workOpen}
      onWorkAreaOpenChange={setWorkOpen}
      workAreaOpenLabel="Open artifacts"
      tabs={effectiveTabs}
      activeTabId={isEmpty ? "tab-empty-new" : activeTabId}
      onTabsChange={setTabs}
      onActiveTabChange={setActiveTabId}
      suggestedArtifacts={ isEmpty ? {} : FABRIC_ARTIFACTS }
      className={className}
      {...rest}
    >
      <div className="af-sc-thread-layout">
        <div className="af-sc-thread-scroll">
          {loading ? (
            <div className="af-sc-thread-col" aria-label="Loading chat">
              <div className="af-sc-bubble-skel">
                <AfSkeleton width={260} height={36} radius={16} />
              </div>
              <AfSkeleton width={172} height={24} radius={8} />
              <AfSkeleton lines={4} height={13} />
              <div className="af-sc-bubble-skel">
                <AfSkeleton width={220} height={34} radius={16} />
              </div>
              <AfSkeleton lines={3} height={13} />
            </div>
          ) : isEmpty ? (
            <div className="af-sc-thread-empty">
              <AfEmptyState
                bare
                icon="search"
                title="No chats yet"
                text="Start a conversation in any project — web searches fold into one line and tables or notes open in the work area."
              />
            </div>
          ) : (
            <div className="af-sc-thread-col">
              <div className="af-sc-user-msg">
                <div className="af-sc-user-bubble">
                  What’s the best fabric for a summer overshirt – linen, cotton or a blend?
                </div>
              </div>

              <div className="af-sc-agent-msg">
                <div className="af-sc-orch-msg__head">
                  <span className="af-sc-orch-mark" aria-hidden="true" />
                  <strong>Assistant</strong>
                  <span>12:02 AM</span>
                </div>

                <div className="af-sc-fold-group">
                  <button
                    type="button"
                    className="af-sc-fold-pill"
                    aria-expanded={searchOpen}
                    onClick={() => setSearchOpen((v) => !v)}
                  >
                    <AfIcon name="check" size={12} />
                    <span>Ran 3 tools · 3.1s</span>
                    <AfIcon name={searchOpen ? "chevronDown" : "chevronRight"} size={11} />
                  </button>
                  <div
                    className="af-sc-fold-list"
                    {...(!searchOpen ? ({ inert: "" } as Record<string, string>) : {})}
                    hidden={!searchOpen}
                  >
                    {SEARCH_SOURCES.map((src) => (
                      <div key={src.title} className="af-sc-fold-item">
                        <AfIcon name="check" size={11} />
                        <span className="af-sc-fold-item__title">{src.title}</span>
                        <span className="af-sc-fold-item__meta">
                          {src.domain} · {src.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p>
                  A <strong>55% Belgian linen / 45% combed cotton blend</strong> hits the sweet spot for an
                  overshirt: linen vents heat fast, while cotton keeps the collar and placket from collapsing
                  after an hour of wear.
                </p>

                <div className="af-sc-chip-row">
                  <button
                    type="button"
                    className="af-sc-file-chip"
                    onClick={() => openFabricFile("fabric-comparison.csv")}
                  >
                    <AfIcon name="kanban" size={13} />
                    <span>fabric-comparison.csv</span>
                  </button>
                  <button
                    type="button"
                    className="af-sc-file-chip"
                    onClick={() => openFabricFile("sources.md")}
                  >
                    <AfIcon name="file" size={13} />
                    <span>sources.md</span>
                  </button>
                </div>
              </div>

              <div className="af-sc-user-msg">
                <div className="af-sc-user-bubble">
                  Which weight in GSM would you pick so it layers cleanly over a T-shirt?
                </div>
              </div>

              <div className="af-sc-agent-msg">
                <p>
                  Aim for <strong>185–205 gsm</strong>. Lighter shirting (130–150 gsm) clings to a tee’s
                  shoulder seams, whereas anything past 240 gsm wears like a chore coat indoors.
                </p>
              </div>

              {replies.map((r) => (
                <div key={r.id} className="af-sc-turn-pair">
                  <div className="af-sc-user-msg">
                    <div className="af-sc-user-bubble">{r.user}</div>
                  </div>
                  <div className="af-sc-agent-msg">
                    <p>
                      {r.text}
                      {streamingReply !== null && replies[replies.length - 1]?.id === r.id ? (
                        <span className="af-sc-caret" aria-hidden="true" />
                      ) : null}
                    </p>
                    {r.stopped ? <span className="af-sc-stopped-tag">Stopped</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="af-sc-thread-foot">
          <div className="af-sc-thread-col">
            {streamingReply !== null ? (
              <div className="af-sc-stop-bar">
                <AfButton variant="ghost" size="sm" onClick={stopStreaming}>
                  Stop generating
                </AfButton>
              </div>
            ) : null}
            <AfChatComposer
              value={draft}
              onValueChange={setDraft}
              placeholder="Ask anything · Web search enabled…"
              disabled={loading || isEmpty}
              loading={loading}
              onSend={(text) => handleSend(text)}
            />
          </div>
        </div>
      </div>
    </ChatInsetShell>
  );
}
