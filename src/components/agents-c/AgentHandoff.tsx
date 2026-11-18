import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark, ToolBrandMark } from "./_marks";

export interface HandoffArtifact {
  id: string;
  label: string;
  checked: boolean;
}

export interface HandoffAgent {
  id: string;
  name: string;
  model?: string;
  avatar?: ReactNode;
  description?: string;
  cost?: string;
  status?: "idle" | "working";
}

export interface HandoffItem {
  id: string;
  label: string;
  kind?: "file" | "source" | "fact" | "decision" | "note";
  /** Marked true when context got dropped at the handoff boundary. */
  lost?: boolean;
  /** Short explanation of why the item didn't make it. */
  why?: string;
}

export interface Handoff {
  id: string;
  from: string;
  to: string;
  task: string;
  tool?: string;
  logo?: ReactNode;
  summary?: string;
  items: HandoffItem[];
}

export interface HandoffTask {
  id: string;
  title: string;
  logo?: ReactNode;
  tool?: string;
  status: "todo" | "working" | "done" | "warning";
  agent?: string;
  note?: string;
}

export interface AfAgentHandoffProps {
  /** Relay agents in pipeline order. */
  agents?: HandoffAgent[];
  /** Handoff packages passed between adjacent agents. */
  handoffs?: Handoff[];
  /** Tasks travelling down the relay. */
  tasks?: HandoffTask[];
  onAssign?: (task: HandoffTask, agent: HandoffAgent) => void;
  onRestore?: (handoff: Handoff, item: HandoffItem) => void;
  /** Legacy compatibility props. */
  title?: ReactNode;
  fromAgent?: string;
  toAgent?: string;
  initialArtifacts?: HandoffArtifact[];
  defaultNote?: string;
  onDecision?: (decision: "accepted" | "returned", note: string) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_AGENTS: HandoffAgent[] = [
  {
    id: "researcher",
    name: "Researcher",
    model: "Opus 5.5",
    cost: "$1.24",
    status: "idle",
    description: "Finds the sources, pulls the facts and decides the angle.",
  },
  {
    id: "writer",
    name: "Writer",
    model: "GPT-5",
    cost: "$0.57",
    status: "idle",
    description: "Turns the brief into a first draft in the team\u2019s voice.",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    model: "Gemini Pro",
    cost: "$0.30",
    status: "idle",
    description: "Checks every claim against its source before it ships.",
  },
];

const DEFAULT_TASKS: HandoffTask[] = [
  {
    id: "ht-1",
    title: "Changelog v2",
    tool: "GitHub",
    status: "todo",
    agent: "researcher",
    note: "+3",
  },
];

const DEFAULT_HANDOFFS: Handoff[] = [
  {
    id: "ho-1",
    from: "researcher",
    to: "writer",
    task: "Support macro for refunds",
    tool: "Slack",
    items: [
      { id: "i-1", label: "50 good replies", kind: "source" },
      { id: "i-2", label: "refund-policy.md", kind: "file" },
      {
        id: "i-3",
        label: "2 edge cases",
        kind: "fact",
        lost: true,
        why: "Dropped when handoff summary compressed above 4k tokens",
      },
    ],
  },
  {
    id: "ho-2",
    from: "researcher",
    to: "writer",
    task: "API release notes",
    tool: "GitHub",
    items: [
      { id: "i-4", label: "endpoints.yaml", kind: "file" },
      { id: "i-5", label: "3 examples", kind: "source" },
      { id: "i-6", label: "Write for integrators", kind: "decision" },
    ],
  },
  {
    id: "ho-3",
    from: "researcher",
    to: "writer",
    task: "Onboarding email",
    tool: "Notion",
    items: [
      { id: "i-7", label: "first-run.md", kind: "file" },
      { id: "i-8", label: "Where teams drop off", kind: "fact" },
      { id: "i-9", label: "One step only", kind: "decision" },
    ],
  },
  {
    id: "ho-4",
    from: "writer",
    to: "reviewer",
    task: "Support macro for refunds",
    tool: "Slack",
    items: [
      { id: "i-10", label: "Macro draft", kind: "file" },
      { id: "i-11", label: "Tone: warm", kind: "note" },
    ],
  },
  {
    id: "ho-5",
    from: "writer",
    to: "reviewer",
    task: "API release notes",
    tool: "GitHub",
    items: [
      { id: "i-12", label: "Draft v2", kind: "file" },
      { id: "i-13", label: "3 examples", kind: "source" },
    ],
  },
  {
    id: "ho-6",
    from: "writer",
    to: "reviewer",
    task: "Onboarding email",
    tool: "Notion",
    items: [
      { id: "i-14", label: "Email draft", kind: "file" },
      { id: "i-15", label: "Tone: friendly", kind: "note" },
    ],
  },
];

function HandoffKindIcon({
  kind = "file",
  isLost = false,
}: {
  kind?: HandoffItem["kind"];
  isLost?: boolean;
}) {
  if (isLost) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="4" />
        <path d="m3.2 8.8 5.6-5.6" />
      </svg>
    );
  }
  if (kind === "source") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 7a1.8 1.8 0 0 0 2.6 0l1.4-1.4a1.8 1.8 0 0 0-2.6-2.6l-.4.4M7 5a1.8 1.8 0 0 0-2.6 0L3 6.4A1.8 1.8 0 0 0 5.6 9l.4-.4" />
      </svg>
    );
  }
  if (kind === "decision") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m3 6.2 2 2L9.2 4" />
      </svg>
    );
  }
  if (kind === "fact") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 9.5v-3M5 9.5v-6M7.5 9.5V5M10 9.5V2.5" />
      </svg>
    );
  }
  if (kind === "note") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 3h7M2.5 6h7M2.5 9h4" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 1.5H3.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4Zm0 0V4h2.5" />
    </svg>
  );
}

export function AfAgentHandoff({
  agents: propAgents,
  handoffs: propHandoffs,
  tasks = DEFAULT_TASKS,
  onRestore,
  fromAgent,
  toAgent,
  initialArtifacts,
  className,
  style,
}: AfAgentHandoffProps = {}) {
  const agents = useMemo<HandoffAgent[]>(() => {
    if (propAgents && propAgents.length >= 2) return propAgents;
    if (fromAgent || toAgent) {
      return [
        {
          id: "from",
          name: fromAgent ?? "Researcher",
          model: "Opus 5.5",
          cost: "$1.24",
          status: "idle",
          description: "Prepares context package for downstream execution.",
        },
        {
          id: "to",
          name: toAgent ?? "Writer",
          model: "GPT-5",
          cost: "$0.57",
          status: "working",
          description: "Picks up the handoff package and ships the draft.",
        },
      ];
    }
    return DEFAULT_AGENTS;
  }, [fromAgent, propAgents, toAgent]);

  const handoffs = useMemo<Handoff[]>(() => {
    if (propHandoffs && propHandoffs.length > 0) return propHandoffs;
    if (initialArtifacts && initialArtifacts.length > 0 && agents.length >= 2) {
      return [
        {
          id: "ho-legacy",
          from: agents[0].id,
          to: agents[1].id,
          task: "Handoff package",
          items: initialArtifacts.map((art) => ({
            id: art.id,
            label: art.label,
            lost: !art.checked,
            why: !art.checked ? "Unchecked at handoff boundary" : undefined,
          })),
        },
      ];
    }
    return DEFAULT_HANDOFFS;
  }, [agents, initialArtifacts, propHandoffs]);

  const [restoredKeys, setRestoredKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [openCards, setOpenCards] = useState<Set<string>>(() => new Set());

  const toggleCard = (id: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = (handoff: Handoff, item: HandoffItem) => {
    const key = `${handoff.id}:${item.id}`;
    setRestoredKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    onRestore?.(handoff, item);
  };

  // Build adjacent agent pairs -> lanes
  const pairs = useMemo(() => {
    const out: Array<{
      key: string;
      from: HandoffAgent;
      to: HandoffAgent;
      packages: Handoff[];
    }> = [];
    for (let i = 0; i < agents.length - 1; i += 1) {
      const from = agents[i];
      const to = agents[i + 1];
      out.push({
        key: `${from.id}->${to.id}`,
        from,
        to,
        packages: handoffs.filter(
          (h) => h.from === from.id && h.to === to.id,
        ),
      });
    }
    return out;
  }, [agents, handoffs]);

  return (
    <div className={cn("af-agc-hnd", className)} style={style}>
      {/* Top Tier: Relay Agent Cards */}
      <div className="af-agc-hnd__agents">
        {agents.map((ag) => {
          const agTask = tasks.find((t) => t.agent === ag.id);
          const isWorking =
            ag.status === "working" || agTask?.status === "working";
          return (
            <div
              key={ag.id}
              className={cn(
                "af-agc-hnd__agent-card",
                isWorking && "is-working",
              )}
            >
              <div className="af-agc-hnd__agent-top">
                <span className="af-agc-hnd__brand-tile" aria-hidden="true">
                  {ag.avatar ?? (
                    <ModelBrandMark model={ag.model ?? ag.name} size={14} />
                  )}
                </span>

                <div className="af-agc-hnd__agent-ident">
                  <span className="af-agc-hnd__agent-name">{ag.name}</span>
                  {ag.model ? (
                    <span className="af-agc-hnd__agent-model">{ag.model}</span>
                  ) : null}
                </div>

                {ag.cost ? (
                  <span className="af-agc-hnd__agent-cost">{ag.cost}</span>
                ) : null}

                <span
                  className={cn(
                    "af-agc-hnd__status-pill",
                    isWorking ? "is-working" : "is-idle",
                  )}
                >
                  {isWorking ? (
                    <span className="af-agc-hnd__status-dot" aria-hidden="true" />
                  ) : null}
                  {isWorking ? "Working" : "Idle"}
                </span>
              </div>

              {ag.description ? (
                <p className="af-agc-hnd__agent-desc">{ag.description}</p>
              ) : null}

              <div className="af-agc-hnd__well">
                {agTask ? (
                  <>
                    {!isWorking ? (
                      <span className="af-agc-hnd__well-tag">Up next</span>
                    ) : null}
                    <span className="af-agc-hnd__well-ico" aria-hidden="true">
                      {agTask.logo ?? (
                        <ToolBrandMark
                          name={agTask.tool ?? "GitHub"}
                          size={10}
                        />
                      )}
                    </span>
                    <span className="af-agc-hnd__well-title">
                      {agTask.title}
                    </span>
                    {agTask.note ? (
                      <span
                        className={cn(
                          "af-agc-hnd__well-note",
                          isWorking && "is-live",
                        )}
                      >
                        {agTask.note}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="af-agc-hnd__well-idle">
                    Ready for a task
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle SVG Relay Connector Wires with white-filled joint circles */}
      {agents.length >= 3 ? (
        <div className="af-agc-hnd__wire-band" aria-hidden="true">
          <svg
            className="af-agc-hnd__wire-svg"
            viewBox="0 0 804 72"
            preserveAspectRatio="none"
          >
            <path
              d="M 134 0 V 26 Q 134 36 144 36 H 244 Q 254 36 254 46 V 72"
              fill="none"
              stroke="var(--af-hnd-wire)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 282 72 V 46 Q 282 36 292 36 H 392 Q 402 36 402 26 V 0"
              fill="none"
              stroke="var(--af-hnd-wire)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="af-agc-hnd__wire-pulse"
              d="M 282 72 V 46 Q 282 36 292 36 H 392 Q 402 36 402 26 V 0"
              fill="none"
              stroke="var(--af-hnd-wire-live)"
              strokeWidth="1.8"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 402 0 V 26 Q 402 36 412 36 H 512 Q 522 36 522 46 V 72"
              fill="none"
              stroke="var(--af-hnd-wire)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 550 72 V 46 Q 550 36 560 36 H 660 Q 670 36 670 26 V 0"
              fill="none"
              stroke="var(--af-hnd-wire)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="af-agc-hnd__joint" style={{ left: "16.6667%", top: "0px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "31.592%", top: "72px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "35.075%", top: "72px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "50%", top: "0px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "64.925%", top: "72px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "68.408%", top: "72px" }} />
          <span className="af-agc-hnd__joint" style={{ left: "83.3333%", top: "0px" }} />
        </div>
      ) : null}

      {/* Bottom Tier: Sunken Handoff Package Lanes */}
      <div
        className={cn(
          "af-agc-hnd__lanes",
          pairs.length === 2 && "is-staggered",
        )}
      >
        {pairs.map((pair) => {
          const laneHasOpen = pair.packages.some((p) => openCards.has(p.id));
          return (
            <div
              key={pair.key}
              className={cn("af-agc-hnd__lane", laneHasOpen && "has-open")}
            >
              <div className="af-agc-hnd__lane-head">
                <div className="af-agc-hnd__lane-pair">
                  <span className="af-agc-hnd__mini-tile" aria-hidden="true">
                    <ModelBrandMark
                      model={pair.from.model ?? pair.from.name}
                      size={10}
                    />
                  </span>
                  <span className="af-agc-hnd__lane-name">{pair.from.name}</span>
                  <span className="af-agc-hnd__lane-arrow" aria-hidden="true">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 6h7M7 3.5 9.5 6 7 8.5" />
                    </svg>
                  </span>
                  <span className="af-agc-hnd__mini-tile" aria-hidden="true">
                    <ModelBrandMark
                      model={pair.to.model ?? pair.to.name}
                      size={10}
                    />
                  </span>
                  <span className="af-agc-hnd__lane-name">{pair.to.name}</span>
                </div>

                <span className="af-agc-hnd__lane-cnt">
                  {pair.packages.length}
                </span>
              </div>

              <div className="af-agc-hnd__pkg-list">
                {pair.packages.map((pkg) => {
                  const isOpen = openCards.has(pkg.id);
                  const activeLostCount = pkg.items.filter(
                    (it) => it.lost && !restoredKeys.has(`${pkg.id}:${it.id}`),
                  ).length;
                  const summaryText =
                    pkg.summary ??
                    pkg.items
                      .filter(
                        (it) =>
                          !it.lost || restoredKeys.has(`${pkg.id}:${it.id}`),
                      )
                      .map((it) => it.label)
                      .join(", ");

                  return (
                    <div
                      key={pkg.id}
                      className={cn(
                        "af-agc-hnd__pkg",
                        isOpen && "is-open",
                        activeLostCount > 0 && "has-lost",
                      )}
                    >
                      <button
                        type="button"
                        className="af-agc-hnd__pkg-head"
                        aria-expanded={isOpen}
                        onClick={() => toggleCard(pkg.id)}
                      >
                        <span className="af-agc-hnd__card-top">
                          <span
                            className="af-agc-hnd__card-mark"
                            aria-hidden="true"
                          >
                            {pkg.logo ?? (
                              <ToolBrandMark
                                name={pkg.tool ?? "GitHub"}
                                size={12}
                              />
                            )}
                          </span>
                          <span className="af-agc-hnd__pkg-title">
                            {pkg.task}
                          </span>
                        </span>

                        {summaryText ? (
                          <span className="af-agc-hnd__card-desc">
                            {summaryText}
                          </span>
                        ) : null}

                        <span className="af-agc-hnd__card-foot">
                          <span className="af-agc-hnd__card-state">
                            <span
                              className="af-agc-hnd__state-icon"
                              aria-hidden="true"
                            >
                              <svg width="11" height="11" viewBox="0 0 12 12">
                                <circle
                                  cx="6"
                                  cy="6"
                                  r="3.4"
                                  fill="currentColor"
                                />
                              </svg>
                            </span>
                            <span>Looks good</span>
                          </span>
                        </span>
                      </button>

                      {isOpen ? (
                        <ul className="af-agc-hnd__items">
                          {pkg.items.map((item) => {
                            const key = `${pkg.id}:${item.id}`;
                            const isLost =
                              Boolean(item.lost) && !restoredKeys.has(key);
                            return (
                              <li
                                key={item.id}
                                className={cn(
                                  "af-agc-hnd__item",
                                  isLost && "is-lost",
                                )}
                              >
                                <div className="af-agc-hnd__item-main">
                                  <span
                                    className={cn(
                                      "af-agc-hnd__item-mark",
                                      isLost ? "is-lost" : "is-ok",
                                    )}
                                    aria-hidden="true"
                                  >
                                    <HandoffKindIcon
                                      kind={item.kind}
                                      isLost={isLost}
                                    />
                                  </span>
                                  <span className="af-agc-hnd__item-label">
                                    {item.label}
                                  </span>
                                  {isLost ? (
                                    <button
                                      type="button"
                                      className="af-agc-hnd__restore-btn"
                                      onClick={() => handleRestore(pkg, item)}
                                    >
                                      Restore
                                    </button>
                                  ) : null}
                                </div>
                                {isLost && item.why ? (
                                  <div className="af-agc-hnd__item-why">
                                    {item.why}
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const AfAgentHandoffPattern = AfAgentHandoff;
export type AfAgentHandoffPatternProps = AfAgentHandoffProps;
