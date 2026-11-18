import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrandLogo,
  CURSOR_AGENTS,
  money,
  usePrefersReducedMotion,
  type AgentState,
  type BrandKey,
  type SuggestStatus,
} from "../_shared/agents-a";

export type { SuggestStatus };

export type CursorSuggestion = {
  from: string;
  to: string;
};

export type CursorAgent = {
  id: string;
  name: string;
  model: string;
  brand?: BrandKey;
  cost: number;
  state: AgentState;
  action: string;
  left: number;
  top: number;
  suggestion?: CursorSuggestion;
};

export type CursorComment = {
  id: string;
  author: string;
  brand?: BrandKey;
  when: string;
  text: string;
};

export type CursorDocBlock = {
  id: string;
  kind: "h2" | "h3" | "p" | "code" | "ul";
  text?: string;
  items?: string[];
};

export interface AfAgentCursorsProps {
  /** Breadcrumb shown in the document bar. */
  breadcrumb?: string;
  /** Document title. */
  docTitle?: string;
  /** Collaborating agents. */
  agents?: CursorAgent[];
  /** Default view mode ("doc" | "table"). */
  defaultView?: "doc" | "table";
  className?: string;
}

export type AfAgentCursorsPatternProps = AfAgentCursorsProps;

export function acceptSuggestion(
  body: string,
  suggestion?: CursorSuggestion,
  status: SuggestStatus = "pending",
): string {
  if (!suggestion) return body;
  if (status === "accepted") return body.replace(suggestion.from, suggestion.to);
  return body;
}

type LaunchTaskRow = {
  id: string;
  task: string;
  owner: string;
  due: string;
  status: string;
  tone: "blue" | "gray" | "amber" | "green";
};

const INITIAL_TABLE_ROWS: LaunchTaskRow[] = [
  { id: "t1", task: "Write the launch post", owner: "Writer", due: "Nov 3", status: "Doing", tone: "blue" },
  { id: "t2", task: "Record the demo video", owner: "Designer", due: "Nov 5", status: "To do", tone: "gray" },
  { id: "t3", task: "Email the waitlist", owner: "Ops", due: "Nov 12", status: "To do", tone: "gray" },
  { id: "t4", task: "Live Q&A", owner: "—", due: "Nov 14", status: "Idea", tone: "amber" },
];

const TABLE_CURSOR_AGENTS: CursorAgent[] = [
  {
    id: "reviewer",
    name: "Reviewer",
    model: "GPT-6 Sol",
    brand: "openai",
    cost: 0.14,
    state: "running",
    action: "Checking the video",
    left: 20,
    top: 43,
  },
  {
    id: "ops",
    name: "Ops",
    model: "Gemini 3.8 Flash",
    brand: "gemini",
    cost: 0.12,
    state: "running",
    action: "Updating the status",
    left: 66,
    top: 45,
  },
  {
    id: "planner",
    name: "Planner",
    model: "Opus 5.5",
    brand: "claude",
    cost: 0.21,
    state: "running",
    action: "Setting a date",
    left: 52,
    top: 57,
  },
  {
    id: "analyst",
    name: "Analyst",
    model: "Mistral Large",
    brand: "mistral",
    cost: 0.19,
    state: "running",
    action: "Finding an owner",
    left: 36,
    top: 65,
  },
];

const WAYPOINTS: Record<string, { left: number; top: number; free?: boolean }[]> = {
  researcher: [
    { left: 20.5, top: 20.5 },
    { left: 31, top: 20.5 },
    { left: 46, top: 24 },
  ],
  designer: [
    { left: 26.5, top: 41.5, free: true },
    { left: 31, top: 42, free: true },
    { left: 23, top: 40.5, free: true },
  ],
  coder: [
    { left: 25.5, top: 64.5 },
    { left: 34, top: 64.5 },
    { left: 22.5, top: 61 },
  ],
};

const TABLE_WAYPOINTS: Record<string, { left: number; top: number; free?: boolean }[]> = {
  reviewer: [
    { left: 20, top: 43, free: true },
    { left: 25, top: 44, free: true },
    { left: 17, top: 42, free: true },
  ],
  ops: [
    { left: 66, top: 45, free: true },
    { left: 68, top: 53, free: true },
    { left: 65, top: 44, free: true },
  ],
  planner: [
    { left: 52, top: 57, free: true },
    { left: 55, top: 63, free: true },
    { left: 50, top: 56, free: true },
  ],
  analyst: [
    { left: 36, top: 65, free: true },
    { left: 40, top: 66, free: true },
    { left: 34, top: 64, free: true },
  ],
};

export function AfAgentCursors({
  breadcrumb = "Product / Launches",
  docTitle = "Pulse 2.0 – launch brief",
  agents = CURSOR_AGENTS,
  defaultView = "doc",
  className,
}: AfAgentCursorsProps = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const [view, setView] = useState<"doc" | "table">(defaultView);
  const [statuses, setStatuses] = useState<Record<string, SuggestStatus>>({});
  const [openSugId, setOpenSugId] = useState<string | null>(null);
  const [followedId, setFollowedId] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [threadOpen, setThreadOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replies, setReplies] = useState<CursorComment[]>([
    {
      id: "c1",
      author: "Coder",
      brand: "mistral",
      when: "now",
      text: 'Should waitlist and everyone share one date format? I\'d use "Nov 3" everywhere.',
    },
  ]);
  const [figWidthPct, setFigWidthPct] = useState(48);
  const [figHeld, setFigHeld] = useState(false);
  const [rows, setRows] = useState<LaunchTaskRow[]>(INITIAL_TABLE_ROWS);
  const [pinTop, setPinTop] = useState(324);
  const stageRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (view !== "doc") return;
    const syncPin = () => {
      const stageEl = stageRef.current;
      const preEl = preRef.current;
      if (!stageEl || !preEl) return;
      const sRect = stageEl.getBoundingClientRect();
      const pRect = preEl.getBoundingClientRect();
      if (sRect.height > 0 && pRect.height > 0) {
        setPinTop(Math.round(pRect.top - sRect.top - 10));
      }
    };
    syncPin();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(syncPin);
    if (stageRef.current) ro.observe(stageRef.current);
    if (preRef.current) ro.observe(preRef.current);
    return () => ro.disconnect();
  }, [view, statuses, figWidthPct]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setStepIdx((v) => v + 1);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const rosterAgents = view === "table" ? TABLE_CURSOR_AGENTS : agents;
  const activeAgents = useMemo(() => rosterAgents.filter((a) => a.state === "running"), [rosterAgents]);
  const totalCost = useMemo(() => rosterAgents.reduce((acc, a) => acc + a.cost, 0), [rosterAgents]);

  const pendingAgentIds = useMemo(
    () =>
      agents
        .filter((a) => a.suggestion && (statuses[a.id] ?? "pending") === "pending")
        .map((a) => a.id),
    [agents, statuses],
  );

  const acceptAll = () => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of pendingAgentIds) next[id] = "accepted";
      return next;
    });
    setOpenSugId(null);
  };

  const researcherSug = agents.find((a) => a.id === "researcher")?.suggestion ?? {
    from: "about 40% of their week",
    to: "38% of their workweek",
  };
  const writerSug = agents.find((a) => a.id === "writer")?.suggestion ?? {
    from: "without a status meeting",
    to: "with zero Monday syncs",
  };

  const rStatus = statuses.researcher ?? "pending";
  const wStatus = statuses.writer ?? "pending";

  const startResize = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setFigHeld(true);
    const startX = e.clientX;
    const startPct = figWidthPct;
    const move = (ev: PointerEvent) => {
      const deltaPct = ((ev.clientX - startX) / 600) * 100;
      setFigWidthPct(Math.max(34, Math.min(62, Math.round(startPct + deltaPct))));
    };
    const up = () => {
      setFigHeld(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const renderInlineSuggestion = (
    agentId: string,
    authorName: string,
    brand: BrandKey,
    note: string,
    sug: CursorSuggestion,
    status: SuggestStatus,
  ) => {
    if (status === "accepted") return <span className="af-acuc__accepted">{sug.to}</span>;
    if (status === "rejected") return <span>{sug.from}</span>;
    const isOpen = openSugId === agentId;
    return (
      <span className="af-acuc__sug-wrap">
        <span
          role="button"
          tabIndex={0}
          className="af-acuc__sug"
          data-open={isOpen ? "true" : undefined}
          onClick={() => setOpenSugId((curr) => (curr === agentId ? null : agentId))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenSugId((curr) => (curr === agentId ? null : agentId));
            }
          }}
        >
          <del className="af-acuc__del">{sug.from}</del>{" "}
          <ins className="af-acuc__ins">{sug.to}</ins>
        </span>

        {isOpen ? (
          <span key={agentId} className="af-acuc__pop" role="dialog" aria-label={`Suggestion from ${authorName}`}>
            <span className="af-acuc__pop-head">
              <span className="af-acuc__pop-mark">
                <BrandLogo kind={brand} />
              </span>
              <b>{authorName}</b>
              <span>Suggested edit</span>
            </span>
            <span className="af-acuc__pop-note">{note}</span>
            <span className="af-acuc__pop-actions">
              <button
                type="button"
                className="af-acuc__btn"
                onClick={() => {
                  setStatuses((s) => ({ ...s, [agentId]: "rejected" }));
                  setOpenSugId(null);
                }}
              >
                Reject
              </button>
              <button
                type="button"
                className="af-acuc__btn af-acuc__btn--primary"
                onClick={() => {
                  setStatuses((s) => ({ ...s, [agentId]: "accepted" }));
                  setOpenSugId(null);
                }}
              >
                Accept
              </button>
            </span>
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <div
      className={["af-acuc", className].filter(Boolean).join(" ")}
      data-fade={view === "doc" ? "true" : undefined}
    >
      {/* Top Doc | Table Switcher */}
      <div className="af-acuc__tabs" role="tablist" aria-label="Views">
        <button
          type="button"
          role="tab"
          className="af-acuc__tab"
          aria-selected={view === "doc"}
          onClick={() => setView("doc")}
        >
          Doc
        </button>
        <button
          type="button"
          role="tab"
          className="af-acuc__tab"
          aria-selected={view === "table"}
          onClick={() => setView("table")}
        >
          Table
        </button>
      </div>

      {/* Stage & Paper Sheet */}
      <div ref={stageRef} className="af-acuc__stage">
        <div className="af-acuc__shade" aria-hidden="true">
          <span />
        </div>

        <section className="af-acuc__sheet" aria-label={docTitle}>
          <header className="af-acuc__bar">
            <span className="af-acuc__doc" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2.5H7.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z" />
                <path d="M14 2.5V7h4.5M9 12.5h6M9 16h4" />
              </svg>
            </span>
            <span className="af-acuc__title" title={breadcrumb}>
              {breadcrumb}
            </span>

            <div className="af-acuc__people" role="group" aria-label="Agents in this document">
              {rosterAgents.map((agent) => {
                const isHere = agent.state === "running";
                const isPressed = followedId === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className="af-acuc__face"
                    data-here={isHere ? "true" : undefined}
                    aria-pressed={isPressed}
                    aria-label={
                      isHere
                        ? `Follow ${agent.name} – ${agent.action}`
                        : `Follow ${agent.name} (not in the document)`
                    }
                    onClick={() => {
                      if (view === "doc" && agent.id === "coder") {
                        setResolved(false);
                        setThreadOpen((o) => !o);
                      } else {
                        setFollowedId((curr) => (curr === agent.id ? null : agent.id));
                      }
                    }}
                  >
                    <span className="af-acuc__face-mark">
                      <BrandLogo kind={agent.brand ?? "claude"} />
                    </span>
                    <span className="af-acuc__face-tip" aria-hidden="true">
                      <b>{agent.name}</b>
                      <span>{agent.action}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="af-acuc__sum">
              {activeAgents.length} here
              <b className="af-acuc__spent" data-zero={totalCost <= 0 ? "true" : undefined}>
                {money(totalCost)}
              </b>
            </span>

            {view === "doc" ? (
              <button
                type="button"
                className="af-acuc__accept-all"
                disabled={pendingAgentIds.length === 0}
                onClick={acceptAll}
              >
                Accept all
              </button>
            ) : null}
          </header>

          {view === "doc" ? (
            <div className="af-acuc__doc-body">
              <h2 className="af-acuc__h2">{docTitle}</h2>

              <p className="af-acuc__p">
                Teams lose{" "}
                {renderInlineSuggestion(
                  "researcher",
                  "Researcher",
                  "claude",
                  "Updated Q3 telemetry puts weekly status overhead at 38%.",
                  researcherSug,
                  rStatus,
                )}{" "}
                to status updates. Pulse turns that work into a short daily brief, so nobody has to
                write one.
              </p>

              {/* Calm Neutral Shimmer Hero Figure (1:1 AffectUI Light & Dark) */}
              <figure
                className="af-acuc__fig"
                data-float="left"
                style={{ width: `${figWidthPct}%` }}
                onMouseEnter={() => setFigHeld(true)}
                onMouseLeave={() => setFigHeld(false)}
              >
                <div
                  className="af-acuc__img"
                  data-held={figHeld ? "true" : undefined}
                  role="img"
                  aria-label="Image loading"
                >
                  <span className="af-acuc__shimmer" aria-hidden="true" />
                  {figHeld ? (
                    <>
                      <span className="af-acuc__handle" data-at="tl" onPointerDown={startResize} />
                      <span className="af-acuc__handle" data-at="tr" onPointerDown={startResize} />
                      <span className="af-acuc__handle" data-at="bl" onPointerDown={startResize} />
                      <span className="af-acuc__handle" data-at="br" onPointerDown={startResize} />
                      <span className="af-acuc__size">{figWidthPct}%</span>
                    </>
                  ) : null}
                </div>
              </figure>

              <p className="af-acuc__p">
                The hero is the brief itself: one calm screen a team lead reads on Monday morning.
                Short, current and written from the work, so the week starts{" "}
                {renderInlineSuggestion(
                  "writer",
                  "Writer",
                  "openai",
                  "Sharper phrasing aligned with the Monday launch headline.",
                  writerSug,
                  wStatus,
                )}
                .
              </p>

              <h3 className="af-acuc__h3">Rollout</h3>

              <pre ref={preRef} className="af-acuc__pre">
                <code>{`const rollout = {\n  waitlist: "Nov 3",\n  everyone: "second week of November",\n};`}</code>
              </pre>

              <p className="af-acuc__p">
                Launch week: one short post, a demo video and an email to the waitlist.
              </p>

              <h3 className="af-acuc__h3">What ships</h3>
              <ul className="af-acuc__ul">
                <li>Daily briefs for every project, written from the work itself</li>
                <li>Nudges when a task has been quiet for too long</li>
              </ul>
            </div>
          ) : (
            <div className="af-acuc__table-wrap">
              <h2 className="af-acuc__h2">Pulse 2.0 – launch tasks</h2>
              <div className="af-acuc__table-card">
                <div className="af-acuc__table" role="table" aria-label="Pulse 2.0 launch tasks">
                  <div className="af-acuc__trow af-acuc__trow--head" role="row">
                    <div className="af-acuc__tcell af-acuc__tcell--wide" role="columnheader">
                      Task
                    </div>
                    <div className="af-acuc__tcell" role="columnheader">
                      Owner
                    </div>
                    <div className="af-acuc__tcell" role="columnheader">
                      Due
                    </div>
                    <div className="af-acuc__tcell" role="columnheader">
                      Status
                    </div>
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="af-acuc__trow"
                      role="row"
                    >
                      <div className="af-acuc__tcell af-acuc__tcell--wide" role="cell">
                        {row.task}
                      </div>
                      <div className="af-acuc__tcell" role="cell">
                        {row.owner}
                      </div>
                      <div className="af-acuc__tcell" role="cell">
                        {row.due}
                      </div>
                      <div className="af-acuc__tcell" role="cell">
                        <span className="af-acuc__pill" data-tone={row.tone}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="af-acuc__tfoot">
                    <button
                      type="button"
                      className="af-acuc__add-row"
                      onClick={() =>
                        setRows((prev) => [
                          ...prev,
                          {
                            id: `t-${prev.length + 1}`,
                            task: "Publish changelog note",
                            owner: "Writer",
                            due: "Nov 15",
                            status: "Idea",
                            tone: "amber",
                          },
                        ])
                      }
                    >
                      + Add row
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Mistral Comment Pin & In-Place Thread on Left Margin of Rollout */}
        {view === "doc" && !resolved ? (
          <div className="af-acuc__notes">
            <div
              className="af-acuc__pin-wrap"
              data-open={threadOpen ? "true" : undefined}
              style={{ top: pinTop }}
              onMouseEnter={() => setThreadOpen(true)}
              onMouseLeave={() => setThreadOpen(false)}
            >
              <div className="af-acuc__pin-box">
                <span className="af-acuc__pin-mark">
                  <BrandLogo kind="mistral" />
                </span>
                <button
                  type="button"
                  className="af-acuc__pin-hit"
                  aria-label="Coder comment thread"
                  aria-expanded={threadOpen}
                  onClick={() => setThreadOpen((o) => !o)}
                />

                {threadOpen ? (
                  <div className="af-acuc__pin-body" role="region" aria-label="Comment from Coder">
                    <div className="af-acuc__note-head">
                      <b>Coder</b>
                      <span>now</span>
                    </div>

                    {replies.map((item) => (
                      <p key={item.id} className="af-acuc__note-text">
                        {item.text}
                      </p>
                    ))}

                    <form
                      className="af-acuc__pin-actions"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = replyDraft.trim();
                        if (!trimmed) return;
                        setReplies((prev) => [
                          ...prev,
                          { id: `r-${Date.now()}`, author: "You", when: "just now", text: trimmed },
                        ]);
                        setReplyDraft("");
                      }}
                    >
                      <input
                        className="af-acuc__reply"
                        placeholder="Reply"
                        aria-label="Reply to Coder"
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        className="af-acuc__resolve"
                        aria-label="Resolve"
                        title="Resolve"
                        onClick={() => {
                          setResolved(true);
                          setThreadOpen(false);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Live Gliding Agent Cursors with 2-Line Rainbow-Edged Flags */}
        <div className="af-acuc__cursors" aria-hidden="true">
          {activeAgents.map((agent) => {
            const wpMap = view === "table" ? TABLE_WAYPOINTS : WAYPOINTS;
            const pts = wpMap[agent.id];
            const pt = pts ? pts[stepIdx % pts.length]! : { left: agent.left, top: agent.top, free: view === "table" };
            const isDim = followedId !== null && followedId !== agent.id;
            return (
              <div
                key={`${view}-${agent.id}`}
                className="af-acuc__cursor"
                data-free={pt.free ? "true" : undefined}
                data-dim={isDim ? "true" : undefined}
                style={{ left: `${pt.left}%`, top: `${pt.top}%` }}
              >
                <span className="af-acuc__caret" />
                <svg className="af-acuc__arrow" viewBox="-2.186 -0.256 18.514 22.277">
                  <path
                    transform="rotate(21.37)"
                    d="M13.92 4.07c1.69.66 3.03 1.18 3.94 1.68.46.25.87.53 1.16.86.31.35.51.79.48 1.29-.03.51-.27.92-.62 1.23-.33.3-.77.53-1.25.74-.96.4-2.36.78-4.12 1.26-.56.15-.98.27-1.26.37-.26.1-.38.18-.47.27-.09.09-.17.21-.27.47-.1.28-.22.7-.37 1.26-.48 1.76-.86 3.16-1.26 4.12-.2.49-.44.93-.74 1.25-.32.35-.72.6-1.23.62-.51.03-.94-.17-1.29-.48-.33-.29-.61-.7-.86-1.16-.5-.91-1.02-2.25-1.68-3.94L1.66 7.76C.96 5.99.41 4.59.16 3.51-.09 2.44-.12 1.39.63.63 1.39-.12 2.44-.09 3.51.16c1.08.25 2.48.8 4.25 1.5l6.16 2.41Z"
                  />
                </svg>
                <div className="af-acuc__flag">
                  <span className="af-acuc__flag-row">
                    <span className="af-acuc__flag-name">{agent.name}</span>
                    {agent.cost > 0 ? (
                      <span className="af-acuc__flag-tag">{money(agent.cost)}</span>
                    ) : null}
                  </span>
                  <span className="af-acuc__flag-doing">{agent.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const AfAgentCursorsPattern = AfAgentCursors;
