import { useId, useRef, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfChatComposer } from "../chat/ChatComposer";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfDrawer } from "../overlay/Drawer";
import {
  ChatInsetShell,
  middleTruncateFileName,
  type AfChatScreenUser,
  type AfChatSidebarThread,
} from "./ChatShell";

export type AfAgentChatProgressProps = HTMLAttributes<HTMLDivElement> & {
  /** Called with the label of a sidebar item – and with `"Folders"` from an output. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar, defaults to `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton loading placeholders for messages, tool calls, steps, outputs and used session items. */
  loading?: boolean;
  /** Empty state when there are no chats yet; `loading` wins when both are on. */
  empty?: boolean;
};

type InlineToolCall = {
  id: string;
  title: string;
  app: string;
  status: "done" | "running";
  args: string;
  result: string;
};

const INITIAL_TOOL_CALLS: InlineToolCall[] = [
  {
    id: "tc-notion",
    title: "Read last 4 sales call notes",
    app: "Notion",
    status: "done",
    args: '{ "database": "Sales Calls Q4", "limit": 4 }',
    result: "4 pages read · Northwind, Globex, Soylent, Initech",
  },
  {
    id: "tc-sheets",
    title: "Lookup internal reps in Team Directory",
    app: "Google Sheets",
    status: "done",
    args: '{ "sheet": "Team Directory", "columns": ["Name", "Email"] }',
    result: "28 internal @acme.com addresses matched",
  },
  {
    id: "tc-gmail",
    title: "Create draft follow-up for Northwind",
    app: "Gmail",
    status: "done",
    args: '{ "to": "claire@northwind.com", "subject": "Northwind: follow-up" }',
    result: "Saved in Drafts · Ready for your review",
  },
];

const EARLIER_STEPS = [
  { id: "s1", label: "Connect Sales Calls database in Notion", status: "done" as const },
  { id: "s2", label: "Extract action items and promised pricing tiers", status: "done" as const },
  { id: "s3", label: "Pull standard Offer template.docx sections", status: "done" as const },
];

const OUTPUT_FILES: { name: string; app: string; icon: AffectIconKey }[] = [
  { name: "Northwind – follow-up email", app: "Google Docs", icon: "file" },
  { name: "Team Directory", app: "Google Sheets", icon: "kanban" },
  { name: "Offer-enterprise-2026-template.docx", app: "Word", icon: "file" },
  { name: "call-notes-northwind-summary.md", app: "Markdown", icon: "code" },
];

const PROGRESS_PROJECTS = ["Q3 Launch", "Customer Support", "Research"];

const PROGRESS_THREADS: AfChatSidebarThread[] = [
  { id: "t-q3-msg", title: "Q3 launch messaging", pinned: true },
  { id: "t-hooks", title: "Ad hooks for the linen overshirt", project: "Q3 Launch" },
  { id: "t-follow", title: "Follow up after sales calls" },
  { id: "t-onboard", title: "Onboarding email draft" },
];

/** AI Chat / Progress (`agent-chat-progress`): Plain chat with inline hairline-split Progress, Outputs and Used in session panel. */
export function AfAgentChatProgress(props: AfAgentChatProgressProps = {}) {
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
  const panelRegionId = useId();
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  const [panelOpen, setPanelOpen] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [openToolIds, setOpenToolIds] = useState<Record<string, boolean>>({});
  const [showEarlier, setShowEarlier] = useState(false);
  const [secOpen, setSecOpen] = useState<{ progress: boolean; outputs: boolean; used: boolean }>({
    progress: true,
    outputs: true,
    used: true,
  });

  const [draft, setDraft] = useState("");
  const [dynamicSteps, setDynamicSteps] = useState<{ id: string; label: string; status: "done" | "running" }[]>([
    { id: "s4", label: "Draft a test email for Northwind", status: "done" },
    { id: "s5", label: "Fix how team and customer are told apart", status: "done" },
  ]);
  const [extraMessages, setExtraMessages] = useState<{ id: string; user: string; reply: string }[]>([]);

  const outputCount = isEmpty ? 0 : OUTPUT_FILES.length;
  const panelToggleLabel = `Progress panel, ${panelOpen ? "open" : "closed"}${
    outputCount > 0 ? `, ${outputCount} outputs` : ""
  }`;

  const renderProgressAsideContent = () => (
    <div className="af-sc-prog__inner">
      {/* 1. Progress section */}
      <div className="af-sc-prog__sec">
        <button
          type="button"
          className="af-sc-prog__head"
          aria-expanded={secOpen.progress}
          onClick={() => setSecOpen((p) => ({ ...p, progress: !p.progress }))}
        >
          <span>Progress</span>
          <AfIcon name={secOpen.progress ? "chevronDown" : "chevronRight"} size={12} />
        </button>

        <div
          className="af-sc-prog__fold"
          {...(!secOpen.progress ? ({ inert: "" } as Record<string, string>) : {})}
          hidden={!secOpen.progress}
        >
          {loading ? (
            <AfSkeleton lines={3} height={13} />
          ) : isEmpty ? (
            <p className="af-sc-prog__muted">No steps yet</p>
          ) : (
            <>
              <button
                type="button"
                className="af-sc-earlier-btn"
                aria-expanded={showEarlier}
                onClick={() => setShowEarlier((v) => !v)}
              >
                <AfIcon name={showEarlier ? "chevronDown" : "chevronRight"} size={11} />
                <span>3 earlier steps</span>
              </button>
              <ol className="af-sc-step-list" aria-live="polite">
                {showEarlier
                  ? EARLIER_STEPS.map((st) => (
                      <li key={st.id} className="af-sc-step-row" data-status={st.status}>
                        <span className="af-sc-step-mark" data-status={st.status} aria-hidden="true">
                          <AfIcon name="check" size={10} />
                        </span>
                        <span className="af-sc-step-text">{st.label}</span>
                        <span className="af-sc-step-word">done</span>
                      </li>
                    ))
                  : null}
                {dynamicSteps.map((st) => (
                  <li key={st.id} className="af-sc-step-row" data-status={st.status}>
                    <span className="af-sc-step-mark" data-status={st.status} aria-hidden="true">
                      {st.status === "done" ? <AfIcon name="check" size={10} /> : null}
                    </span>
                    <span className="af-sc-step-text">{st.label}</span>
                    <span className="af-sc-step-word">{st.status}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* 2. Outputs section (hidden when empty) */}
      {!isEmpty ? (
        <div className="af-sc-prog__sec">
          <button
            type="button"
            className="af-sc-prog__head"
            aria-expanded={secOpen.outputs}
            onClick={() => setSecOpen((p) => ({ ...p, outputs: !p.outputs }))}
          >
            <span>Outputs</span>
            <AfIcon name={secOpen.outputs ? "chevronDown" : "chevronRight"} size={12} />
          </button>

          <div
            className="af-sc-prog__fold"
            {...(!secOpen.outputs ? ({ inert: "" } as Record<string, string>) : {})}
            hidden={!secOpen.outputs}
          >
            {loading ? (
              <>
                <AfSkeleton width="100%" height={64} radius={10} />
                <AfSkeleton lines={3} height={13} />
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="af-sc-out-hero"
                  onClick={() => onNavigate?.("Folders")}
                >
                  <strong>Northwind: follow-up</strong>
                  <span>
                    Thanks for the demo today – here is what we agreed on and the offer we promised.
                  </span>
                </button>
                <div className="af-sc-out-list">
                  {OUTPUT_FILES.map((out) => (
                    <button
                      key={out.name}
                      type="button"
                      className="af-sc-out-row"
                      title={out.name}
                      onClick={() => onNavigate?.("Folders")}
                    >
                      <AfIcon name={out.icon} size={13} />
                      <span className="af-sc-out-row__name" aria-label={out.name}>
                        {middleTruncateFileName(out.name, 23)}
                      </span>
                      <span className="af-sc-out-row__app">{out.app}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* 3. Used in this session (hidden when empty) */}
      {!isEmpty ? (
        <div className="af-sc-prog__sec">
          <button
            type="button"
            className="af-sc-prog__head"
            aria-expanded={secOpen.used}
            onClick={() => setSecOpen((p) => ({ ...p, used: !p.used }))}
          >
            <span>Used in this session</span>
            <AfIcon name={secOpen.used ? "chevronDown" : "chevronRight"} size={12} />
          </button>

          <div
            className="af-sc-prog__fold"
            {...(!secOpen.used ? ({ inert: "" } as Record<string, string>) : {})}
            hidden={!secOpen.used}
          >
            {loading ? (
              <AfSkeleton lines={4} height={12} />
            ) : (
              <dl className="af-sc-used-dl">
                <div className="af-sc-used-row">
                  <dt>Uploads</dt>
                  <dd>call-screenshot.png +1</dd>
                </div>
                <div className="af-sc-used-row">
                  <dt>Connectors</dt>
                  <dd>Notion, Gmail, Sheets</dd>
                </div>
                <div className="af-sc-used-row">
                  <dt>Web search</dt>
                  <dd>2 pages</dd>
                </div>
                <div className="af-sc-used-row">
                  <dt>Skills</dt>
                  <dd>
                    <code>sales-follow-up</code>
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <ChatInsetShell
      workspace={workspace}
      user={user}
      activeNav="New chat"
      projects={PROGRESS_PROJECTS}
      threads={PROGRESS_THREADS}
      activeThreadId={isEmpty ? undefined : "t-follow"}
      hideThreads={isEmpty}
      showSidebarCards={!isEmpty}
      onNavigate={onNavigate}
      workAreaOpen={false}
      mainHeader={{
        title: loading ? (
          <AfSkeleton width={180} height={14} />
        ) : isEmpty ? (
          "New chat"
        ) : (
          "Follow up after sales calls"
        ),
        actions: (
          <>
            <button
              ref={toggleBtnRef}
              type="button"
              className="af-sc-panel-pill"
              aria-expanded={panelOpen}
              aria-controls={panelRegionId}
              aria-label={panelToggleLabel}
              data-desktop-only=""
              onClick={() => setPanelOpen((v) => !v)}
            >
              <AfIcon name="panelRight" size={14} />
              {outputCount > 0 && !loading ? <span>{outputCount}</span> : null}
            </button>
            <button
              type="button"
              className="af-sc-panel-pill af-sc-mobile-only"
              aria-expanded={mobilePanelOpen}
              aria-label={panelToggleLabel}
              onClick={() => setMobilePanelOpen(true)}
            >
              <AfIcon name="panelRight" size={14} />
              {outputCount > 0 && !loading ? <span>{outputCount}</span> : null}
            </button>
          </>
        ),
      }}
      className={className}
      {...rest}
    >
      <AfDrawer
        open={mobilePanelOpen}
        onOpenChange={(open) => {
          setMobilePanelOpen(open);
          if (!open) window.requestAnimationFrame(() => toggleBtnRef.current?.focus());
        }}
        placement="right"
        width={310}
        title="Progress"
      >
        {renderProgressAsideContent()}
      </AfDrawer>

      <div className="af-sc-split-body">
        <div className="af-sc-thread-layout">
          <div className="af-sc-thread-scroll">
            {loading ? (
              <div className="af-sc-thread-col" aria-label="Loading chat">
                <div className="af-sc-bubble-skel">
                  <AfSkeleton width={280} height={38} radius={16} />
                </div>
                <AfSkeleton lines={3} height={13} />
                <AfSkeleton width="100%" height={92} radius={10} />
                <AfSkeleton lines={2} height={13} />
              </div>
            ) : isEmpty ? (
              <div className="af-sc-thread-empty">
                <AfEmptyState
                  bare
                  icon="message"
                  title="No chats yet"
                  text="Ask the assistant to work through a task with tools — its step-by-step progress and outputs will stay beside the conversation."
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
                  <div className="af-sc-user-bubble">
                    Can you automate the follow-up after our sales calls? The notes live in Notion.
                  </div>
                </div>

                <div className="af-sc-agent-msg">
                  <p>
                    I read your last four call notes in Notion. Every follow-up has the same three parts:
                    a thank-you, what you agreed on and the offer or link.
                  </p>

                  <div className="af-sc-tc-stack" role="group" aria-label="Tool calls">
                    {INITIAL_TOOL_CALLS.map((tc) => {
                      const expanded = Boolean(openToolIds[tc.id]);
                      return (
                        <div key={tc.id} className="af-sc-tc">
                          <button
                            type="button"
                            className="af-sc-tc__btn"
                            aria-expanded={expanded}
                            onClick={() =>
                              setOpenToolIds((prev) => ({ ...prev, [tc.id]: !prev[tc.id] }))
                            }
                          >
                            <AfIcon name={expanded ? "chevronDown" : "chevronRight"} size={12} />
                            <span className="af-sc-tc__title">{tc.title}</span>
                            <span className="af-sc-tc__app">{tc.app}</span>
                            <span className="af-sc-tc__status" data-status={tc.status}>
                              {tc.status === "done" ? "Done" : "Running"}
                            </span>
                          </button>
                          <div
                            className="af-sc-tc__body"
                            {...(!expanded ? ({ inert: "" } as Record<string, string>) : {})}
                            hidden={!expanded}
                          >
                            <div className="af-sc-tc__kv">
                              <span>Arguments</span>
                              <pre className="af-sc-tc__pre">
                                <code>{tc.args}</code>
                              </pre>
                            </div>
                            <div className="af-sc-tc__kv">
                              <span>Result</span>
                              <pre className="af-sc-tc__pre">
                                <code>{tc.result}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p>
                    <strong>What happens after each call now:</strong>
                  </p>
                  <ul className="af-sc-bullets">
                    <li>Reads the new call page in Notion and separates internal reps via Team Directory</li>
                    <li>Fills your Offer template and saves a Gmail draft ready for your OK</li>
                  </ul>
                </div>

                {extraMessages.map((m) => (
                  <div key={m.id} className="af-sc-turn-pair">
                    <div className="af-sc-user-msg">
                      <div className="af-sc-user-bubble">{m.user}</div>
                    </div>
                    <div className="af-sc-agent-msg">
                      <p>{m.reply}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="af-sc-thread-foot">
            <div className="af-sc-thread-col">
              <AfChatComposer
                value={draft}
                onValueChange={setDraft}
                placeholder="Ask a follow-up…"
                disabled={loading || isEmpty}
                loading={loading}
                onSend={(text) => {
                  if (loading || isEmpty) return;
                  const stepId = `step-${Date.now()}`;
                  setDynamicSteps((prev) => [
                    ...prev,
                    { id: stepId, label: text.slice(0, 48), status: "running" },
                  ]);
                  setExtraMessages((prev) => [
                    ...prev,
                    {
                      id: `m-${Date.now()}`,
                      user: text,
                      reply: `Updated the follow-up workflow and synced Northwind – follow-up email.`,
                    },
                  ]);
                  setDraft("");
                  window.setTimeout(() => {
                    setDynamicSteps((prev) =>
                      prev.map((s) => (s.id === stepId ? { ...s, status: "done" } : s)),
                    );
                  }, 900);
                }}
              />
            </div>
          </div>
        </div>

        {panelOpen ? (
          <aside
            id={panelRegionId}
            className="af-sc-prog"
            data-desktop-only=""
            aria-label="Assistant progress"
          >
            {renderProgressAsideContent()}
          </aside>
        ) : null}
      </div>
    </ChatInsetShell>
  );
}
