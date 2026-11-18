import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import type { StreamAgent, StreamMessage } from "../agents-d/CollaborationStream";
import type { ContextPartKey } from "../../patterns/agents-b";
import { BrandAppTile, ModelVendorMark } from "../_shared/project";

function SessionDotMatrixMark({
  seed,
  size = 12,
  color,
}: {
  seed: string;
  size?: number;
  color?: string;
}) {
  const key = seed.toLowerCase();
  const mask =
    key === "you"
      ? [1, 1, 1, 1, 1, 1, 1, 1, 1]
      : key === "orchestrator"
        ? [0, 0, 0, 1, 1, 1, 1, 1, 1]
        : key.includes("research")
          ? [1, 1, 1, 0, 1, 0, 1, 0, 1]
          : key.includes("write")
            ? [1, 1, 1, 0, 0, 0, 1, 1, 1]
            : [1, 0, 1, 0, 1, 0, 1, 1, 1];
  const fill =
    color ??
    (key === "you"
      ? "var(--af-muted)"
      : key === "orchestrator"
        ? "rgba(0, 96, 226, 0.82)"
        : key.includes("research")
          ? "rgba(166, 81, 240, 0.88)"
          : "rgba(20, 179, 240, 0.86)");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {mask.map((on, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = 2 + col * 4;
        const cy = 2 + row * 4;
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={1.3}
            fill={fill}
            opacity={on ? 1 : 0.16}
          />
        );
      })}
    </svg>
  );
}

export interface SessionStep {
  id: string;
  title: string;
  agent: string;
  status?: "done" | "active" | "pending";
  duration?: number;
  startedAt?: number;
}

export interface SessionContextPart {
  id?: string;
  key?: ContextPartKey | "memory";
  label: string;
  tokens: number;
}

export interface SessionContextConfig {
  parts: SessionContextPart[];
  limit: number;
  model?: string;
  modelIcon?: ReactNode;
}

export interface AfLiveSessionProps {
  /** 参与协作会话的智能体列表（"you" 内置）。 */
  agents?: StreamAgent[];
  /** 多智能体实时消息流。 */
  messages?: StreamMessage[];
  /** 当前团队共同推进的任务名。 */
  task?: string;
  /** 团队执行计划步骤（带所属智能体 id）。 */
  steps?: SessionStep[];
  /** 计划运行状态。 */
  status?: "running" | "paused" | "done";
  /** 会话开始时间戳。 */
  startedAt?: number | Date;
  /** 共享上下文窗口占用。 */
  context?: SessionContextConfig;
  /** 是否处于实时工作中。 */
  live?: boolean;
  /** 消息正文中自动展示徽标的品牌名映射。 */
  logos?: Record<string, ReactNode>;
  /** 受控聚焦的单个智能体 id（同屏淡出无关消息与无关步骤）。 */
  focusAgent?: string | null;
  /** 切换聚焦智能体回调。 */
  onFocusAgentChange?: (id: string | null) => void;
  /** 发送消息回调。 */
  onSend?: (message: { text: string; to: string | string[]; replyTo?: string }) => void;
  /** 暂停计划回调。 */
  onPause?: () => void;
  /** 恢复计划回调。 */
  onResume?: () => void;
  /** 窄屏叠放时消息流最大高度。 */
  maxHeight?: number;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfLiveSessionPatternProps = AfLiveSessionProps;

const DEFAULT_SESSION_AGENTS: StreamAgent[] = [
  { id: "research", name: "Researcher", model: "Gemini 3.8 Flash" },
  { id: "writer", name: "Writer", model: "Sonnet 5.5" },
];

const DEFAULT_SESSION_MESSAGES: StreamMessage[] = [
  {
    id: "m1",
    from: "you",
    to: "orchestrator",
    kind: "ask",
    at: "14:02",
    text: "Launch the new pricing page by Friday – per-seat plans, keep a free tier.",
  },
  {
    id: "m2",
    from: "research",
    to: "orchestrator",
    kind: "reply",
    at: "14:04",
    text: "Linear $10, Notion $12, Figma $15 per seat. All three keep a free tier.",
    attachments: [
      { label: "web_search ×6", kind: "code" },
      { label: "pricing-table.csv", kind: "file" },
    ],
    details: {
      facts: [
        { label: "Model", value: "Gemini 3.8 Flash" },
        { label: "Tokens", value: "41.2k" },
        { label: "Cost", value: "$0.02" },
        { label: "Took", value: "1m 48s" },
      ],
    },
  },
  {
    id: "m3",
    from: "writer",
    to: "orchestrator",
    kind: "handoff",
    at: "14:05",
    text: "Writing…",
  },
];

const DEFAULT_SESSION_STEPS: SessionStep[] = [
  {
    id: "prices",
    title: "Compare per-seat prices",
    agent: "research",
    status: "done",
    duration: 84_000,
  },
  {
    id: "copy",
    title: "Draft the copy for the three plans",
    agent: "writer",
    status: "active",
    duration: 456_000,
  },
  {
    id: "build",
    title: "Build /pricing with the seat picker",
    agent: "orchestrator",
    status: "pending",
  },
  {
    id: "price",
    title: "Pick the Team price",
    agent: "you",
    status: "pending",
  },
  {
    id: "preview",
    title: "Review the preview deploy",
    agent: "writer",
    status: "pending",
  },
];

const DEFAULT_SESSION_CONTEXT: SessionContextConfig = {
  limit: 200_000,
  model: "Opus 5.5",
  parts: [
    { id: "sys", key: "system", label: "System prompt", tokens: 4_200 },
    { id: "tools", key: "tools", label: "Tools", tokens: 12_800 },
    { id: "files", key: "files", label: "Files", tokens: 12_800 },
    { id: "talk", key: "conversation", label: "Conversation", tokens: 18_000 },
    { id: "mem", key: "memory", label: "Memory", tokens: 3_900 },
  ],
};

function formatDurationMs(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatTokensUpperK(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(n);
}

function renderInlineBrands(text: string): ReactNode {
  if (!text.includes("Notion") && !text.includes("Figma")) return text;
  const tokens = text.split(/(Notion|Figma)/g);
  return tokens.map((tok, i) => {
    if (tok === "Notion") {
      return (
        <span key={i} className="af-pj-lvs__inline-brand">
          <BrandAppTile id="notion" name="Notion" size={14} />
          <span>Notion</span>
        </span>
      );
    }
    if (tok === "Figma") {
      return (
        <span key={i} className="af-pj-lvs__inline-brand">
          <BrandAppTile id="figma" name="Figma" size={14} />
          <span>Figma</span>
        </span>
      );
    }
    return tok;
  });
}

/**
 * 多智能体实时协作会话（Pro Agent Block）：左侧流式协作对话 + 右侧团队计划与上下文晶圆矩阵。
 */
export function AfLiveSession({
  agents = DEFAULT_SESSION_AGENTS,
  messages: messagesProp = DEFAULT_SESSION_MESSAGES,
  task = "Launch the new pricing page",
  steps: stepsProp = DEFAULT_SESSION_STEPS,
  status: statusProp = "running",
  context = DEFAULT_SESSION_CONTEXT,
  live = true,
  focusAgent: focusAgentProp,
  onFocusAgentChange,
  onSend,
  onPause,
  onResume,
  maxHeight = 580,
  className,
}: AfLiveSessionProps = {}) {
  const [focusAgent, setFocusAgent] = useControllableState<string | null>({
    value: focusAgentProp,
    defaultValue: null,
    onChange: onFocusAgentChange,
  });

  const [messages, setMessages] = useState<StreamMessage[]>(messagesProp);
  const steps = stepsProp;
  const [runStatus, setRunStatus] = useState<"running" | "paused" | "done">(statusProp);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<StreamMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [extraConvTokens, setExtraConvTokens] = useState(0);

  const agentTabs = useMemo(
    () => [
      { id: "__all__", name: "Everyone", color: "#0190fe" },
      { id: "you", name: "You", color: "#52525b" },
      ...agents.map((a) => ({
        id: a.id,
        name: a.name,
        color: a.id === "research" ? "#a651f0" : "#14b3f0",
      })),
    ],
    [agents],
  );

  const resolveAgentName = (id: string) => {
    if (id === "you") return "You";
    if (id === "orchestrator") return "Orchestrator";
    if (id === "all" || id === "everyone") return "everyone";
    return agents.find((a) => a.id === id)?.name ?? id;
  };

  const isMessageInFocus = (msg: StreamMessage): boolean => {
    if (!focusAgent) return true;
    return msg.from === focusAgent || msg.to === focusAgent;
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = -1;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % agentTabs.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + agentTabs.length) % agentTabs.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = agentTabs.length - 1;
    else if (e.key === "Escape") {
      setFocusAgent(null);
      return;
    }
    if (nextIdx >= 0) {
      e.preventDefault();
      const picked = agentTabs[nextIdx];
      setFocusAgent(picked.id === "__all__" ? null : picked.id);
    }
  };

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean) return;
    const namedAgents = agents
      .filter((a) => clean.toLowerCase().includes(`@${a.name.toLowerCase()}`))
      .map((a) => a.id);
    const primaryTo =
      namedAgents[0] ?? (replyTarget ? replyTarget.from : "everyone");

    const nextMsg: StreamMessage = {
      id: `m-${Date.now()}`,
      from: "you",
      to: primaryTo,
      kind: replyTarget ? "reply" : "ask",
      at: "Now",
      replyTo: replyTarget?.id,
      text: clean,
    };

    setMessages((prev) => [...prev, nextMsg]);
    setExtraConvTokens((t) => t + Math.max(180, clean.length * 6));
    setDraft("");
    setReplyTarget(null);
    setMentionOpen(false);
    onSend?.({
      text: clean,
      to: namedAgents.length > 0 ? namedAgents : primaryTo,
      replyTo: replyTarget?.id,
    });
  };

  const togglePause = () => {
    if (runStatus === "running") {
      setRunStatus("paused");
      onPause?.();
    } else if (runStatus === "paused") {
      setRunStatus("running");
      onResume?.();
    }
  };

  const activeStepIdx = Math.max(
    1,
    steps.findIndex((s) => s.status === "active") + 1 ||
      steps.filter((s) => s.status === "done").length + 1,
  );

  const contextParts = useMemo(() => {
    if (!context) return [];
    return context.parts.map((part) =>
      part.key === "conversation"
        ? { ...part, tokens: part.tokens + extraConvTokens }
        : part,
    );
  }, [context, extraConvTokens]);

  const totalTokens = useMemo(
    () => contextParts.reduce((sum, p) => sum + p.tokens, 0),
    [contextParts],
  );
  const contextLimit = context?.limit ?? 200_000;
  const freeTokens = Math.max(0, contextLimit - totalTokens);
  const contextPct = Math.min(100, Math.round((totalTokens / contextLimit) * 100));

  const partPalette: Record<string, string> = {
    system: "#0190fe",
    tools: "#14b3f0",
    files: "#6366f1",
    conversation: "#a651f0",
    memory: "#ee3e9e",
  };

  const cellColors = useMemo(() => {
    const totalCells = 120; // 30 columns × 4 rows wafer matrix
    const cells: string[] = [];
    for (const part of contextParts) {
      const share = Math.max(1, Math.round((part.tokens / contextLimit) * totalCells));
      const color = (part.key && partPalette[part.key]) || "#0190fe";
      for (let i = 0; i < share && cells.length < totalCells; i += 1) {
        cells.push(color);
      }
    }
    while (cells.length < totalCells) {
      cells.push("var(--af-track)");
    }
    return cells;
  }, [contextParts, contextLimit]);

  return (
    <section
      className={cn("af-pj-lvs", className)}
      role="region"
      aria-label={task}
      onKeyDown={(e) => {
        if (e.key === "Escape" && (focusAgent || expandedMsgId)) {
          setFocusAgent(null);
          setExpandedMsgId(null);
        }
      }}
    >
      <div
        className="af-pj-lvs__stream"
        style={{ "--af-lvs-max-h": `${maxHeight}px` } as Record<string, string>}
      >
        <header className="af-pj-lvs__head">
          <div
            className="af-pj-lvs__tabs"
            role="tablist"
            aria-label="Filter session by participant"
          >
            {agentTabs.map((tab, idx) => {
              const selected =
                tab.id === "__all__" ? focusAgent === null : focusAgent === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className="af-pj-lvs__tab"
                  data-active={selected ? "" : undefined}
                  onClick={() => setFocusAgent(tab.id === "__all__" ? null : tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                >
                  {tab.id !== "__all__" && (
                    <SessionDotMatrixMark seed={tab.id} size={11} color={tab.color} />
                  )}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {live && (
            <span className="af-pj-lvs__live">
              <span className="af-pj-lvs__live-dot" aria-hidden="true" />
              Live
            </span>
          )}
        </header>

        <div className="af-pj-lvs__messages">
          {messages.map((msg, mIdx) => {
            const focused = isMessageInFocus(msg);
            const isOpen = expandedMsgId === msg.id;
            const isYou = msg.from === "you";
            const isWriting = msg.text === "Writing…";

            const promptQuote =
              msg.id === "m2"
                ? "Find out what Linear, Notion and Figma charge per seat, and what their free tiers allow."
                : msg.id === "m3"
                  ? "Draft the copy for Free, Pro and Team – short, one line per plan."
                  : null;

            return (
              <div key={msg.id} className="af-pj-lvs__turn">
                {mIdx === 1 && messagesProp === DEFAULT_SESSION_MESSAGES && (
                  <div className="af-pj-lvs__events" aria-label="Agent spawns">
                    <div className="af-pj-lvs__event">
                      <span>Orchestrator started</span>
                      <b>Researcher</b>
                    </div>
                    <div className="af-pj-lvs__event">
                      <span>Orchestrator started</span>
                      <b>Writer</b>
                    </div>
                  </div>
                )}

                {isYou ? (
                  <article
                    className="af-pj-lvs__msg af-pj-lvs__msg--you"
                    data-dim={!focused ? "" : undefined}
                  >
                    <div className="af-pj-lvs__you-meta">
                      <strong>You</strong>
                      {msg.at && <span>{msg.at}</span>}
                    </div>
                    <div className="af-pj-lvs__you-bubble">
                      {msg.to && (
                        <div className="af-pj-lvs__to-chip">
                          <span>to</span>
                          <SessionDotMatrixMark seed={String(msg.to)} size={10} />
                          <b>{resolveAgentName(String(msg.to))}</b>
                        </div>
                      )}
                      <p className="af-pj-lvs__msg-text">{msg.text}</p>
                    </div>
                  </article>
                ) : (
                  <article
                    className="af-pj-lvs__msg af-pj-lvs__msg--agent-row"
                    data-dim={!focused ? "" : undefined}
                  >
                    <span className="af-pj-lvs__gutter" aria-hidden="true">
                      <SessionDotMatrixMark
                        seed={msg.from}
                        size={13}
                        color={msg.from === "research" ? "#a651f0" : "#14b3f0"}
                      />
                    </span>

                    <div className="af-pj-lvs__msg--agent">
                      <div className="af-pj-lvs__msg-head">
                        <div className="af-pj-lvs__msg-who">
                          <strong>{resolveAgentName(msg.from)}</strong>
                        </div>
                        <div className="af-pj-lvs__msg-right">
                          <button
                            type="button"
                            className="af-pj-lvs__reply-btn"
                            aria-label={`Reply to ${resolveAgentName(msg.from)}`}
                            onClick={() => setReplyTarget(msg)}
                          >
                            Reply
                          </button>
                          {!isWriting && msg.at && (
                            <span className="af-pj-lvs__msg-time">{msg.at}</span>
                          )}
                        </div>
                      </div>

                      <div className="af-pj-lvs__agent-card">
                        {promptQuote && (
                          <div className="af-pj-lvs__quote">
                            <div className="af-pj-lvs__quote-head">
                              {msg.id === "m2" && <span>to</span>}
                              <SessionDotMatrixMark seed="orchestrator" size={10} />
                              <b>Orchestrator</b>
                            </div>
                            <p>{promptQuote}</p>
                          </div>
                        )}

                        {isWriting ? (
                          <p className="af-pj-lvs__writing">{msg.text}</p>
                        ) : (
                          <p className="af-pj-lvs__msg-text">{renderInlineBrands(msg.text)}</p>
                        )}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="af-pj-lvs__atts">
                            {msg.attachments.map((att) => (
                              <button
                                key={att.label}
                                type="button"
                                className="af-pj-lvs__att"
                                onClick={() =>
                                  msg.details && setExpandedMsgId(isOpen ? null : msg.id)
                                }
                              >
                                <AfIcon
                                  name={att.kind === "code" ? "terminal" : "file"}
                                  size={11}
                                />
                                <span>{att.label}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {isOpen && msg.details && (
                          <div className="af-pj-lvs__details">
                            <div className="af-pj-lvs__detail-facts">
                              {msg.details.facts?.map((f) => (
                                <span key={f.label}>
                                  <b>{f.label}</b> {f.value}
                                </span>
                              ))}
                            </div>
                            <div className="af-pj-lvs__detail-rows">
                              <p><b>notion.com/pricing</b> Plus $12 · Business $18 per seat</p>
                              <p><b>figma.com/pricing</b> Professional $15 per editor</p>
                              <p><b>linear.app/pricing</b> Basic $10 per user</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )}
              </div>
            );
          })}
        </div>

        <div className="af-pj-lvs__composer">
          {replyTarget && (
            <div className="af-pj-lvs__reply-bar">
              <span>Replying to {resolveAgentName(replyTarget.from)}</span>
              <button
                type="button"
                aria-label="Cancel reply"
                onClick={() => setReplyTarget(null)}
              >
                <AfIcon name="close" size={11} />
              </button>
            </div>
          )}

          {mentionOpen && (
            <div className="af-pj-lvs__mentions" role="listbox" aria-label="Mention an agent">
              {agents.map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="af-pj-lvs__mention-item"
                  onClick={() => {
                    setDraft((prev) => `${prev}${ag.name} `);
                    setMentionOpen(false);
                  }}
                >
                  <SessionDotMatrixMark seed={ag.id} size={11} />
                  <span>{ag.name}</span>
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={1}
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              setMentionOpen(v.endsWith("@"));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              } else if (e.key === "Escape" && mentionOpen) {
                setMentionOpen(false);
              }
            }}
            placeholder="Message the agents – @ to name one"
            aria-label="Message the agents"
          />

          <div className="af-pj-lvs__composer-foot">
            <span className="af-pj-lvs__to-hint">
              <b>@</b>{" "}
              {replyTarget
                ? `to ${resolveAgentName(replyTarget.from)}`
                : "to everyone"}
            </span>
            <button
              type="button"
              className="af-pj-lvs__send-btn"
              aria-label="Send message"
              onClick={handleSend}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <aside className="af-pj-lvs__side" aria-label="Session plan and shared context">
        <section className="af-pj-lvs__plan" aria-label="Team plan">
          <div className="af-pj-lvs__card-head">
            <div className="af-pj-lvs__plan-brand">
              <span className="af-pj-lvs__plan-glyph" aria-hidden="true">
                <AfIcon name="sparkle" size={13} />
              </span>
              <div>
                <div className="af-pj-lvs__card-title">
                  <strong>Team plan</strong>
                </div>
                <span className="af-pj-lvs__card-sub">
                  4 agents · Step {activeStepIdx} of {steps.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="af-pj-lvs__run-pill"
              data-status={runStatus}
              onClick={togglePause}
            >
              <span className="af-pj-lvs__plan-dot" data-status={runStatus} />
              <span>
                {runStatus === "running" ? "Running · 9m 00s" : "Paused"}
              </span>
            </button>
          </div>

          <ol className="af-pj-lvs__step-list">
            {steps.map((step) => {
              const dimmed = focusAgent !== null && step.agent !== focusAgent;
              return (
                <li
                  key={step.id}
                  className="af-pj-lvs__step"
                  data-status={step.status}
                  data-dim={dimmed ? "" : undefined}
                >
                  <span
                    className="af-pj-lvs__step-icon"
                    data-status={step.status}
                    aria-hidden="true"
                  >
                    {step.status === "done" ? (
                      <span className="af-pj-lvs__step-check">
                        <AfIcon name="check" size={10} />
                      </span>
                    ) : step.status === "active" ? (
                      <span className="af-pj-lvs__step-spin" />
                    ) : (
                      <span className="af-pj-lvs__step-ring" />
                    )}
                  </span>
                  <div className="af-pj-lvs__step-main">
                    <span className="af-pj-lvs__step-title">{step.title}</span>
                  </div>
                  {step.duration ? (
                    <span className="af-pj-lvs__step-dur">
                      {formatDurationMs(step.duration)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="af-pj-lvs__ctx" aria-label="Shared context">
          <div className="af-pj-lvs__ctx-head">
            <strong className="af-pj-lvs__ctx-title">Shared context</strong>
            {context?.model && (
              <span className="af-pj-lvs__model-chip">
                <ModelVendorMark model={context.model} size={12} />
                <span>{context.model}</span>
              </span>
            )}
          </div>

          <div className="af-pj-lvs__ctx-numbers">
            <div>
              <strong className="af-pj-lvs__ctx-used">
                {formatTokensUpperK(totalTokens)}
              </strong>
              <span className="af-pj-lvs__ctx-limit">
                {" "}
                of {formatTokensUpperK(contextLimit)} tokens
              </span>
            </div>
            <span className="af-pj-lvs__ctx-pct">{contextPct}%</span>
          </div>

          <div className="af-pj-lvs__cells" aria-hidden="true">
            {cellColors.map((bg, idx) => (
              <span
                key={idx}
                className="af-pj-lvs__cell"
                style={{ background: bg }}
              />
            ))}
          </div>

          <ul className="af-pj-lvs__parts">
            {contextParts.map((part) => (
              <li key={part.id ?? part.label} className="af-pj-lvs__part">
                <span className="af-pj-lvs__part-name">
                  <i
                    className="af-pj-lvs__part-dot"
                    style={{
                      background:
                        (part.key && partPalette[part.key]) || "#0190fe",
                    }}
                  />
                  {part.label}
                </span>
                <span className="af-pj-lvs__part-val">
                  {formatTokensUpperK(part.tokens)}
                </span>
              </li>
            ))}
          </ul>

          <div className="af-pj-lvs__ctx-foot">
            {formatTokensUpperK(freeTokens)} free
          </div>
        </section>
      </aside>
    </section>
  );
}

/** `AfLiveSession` 兼容模式别名。 */
export const AfLiveSessionPattern = AfLiveSession;
export const LiveSession = AfLiveSession;
