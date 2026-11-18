import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { ModelVendorMark } from "../_shared/project";

export type RunSpanKind = "agent" | "llm" | "tool";
export type RunSpanStatus = "running" | "done" | "failed";

export interface RunSpan {
  id: string;
  name: string;
  kind: RunSpanKind;
  status: RunSpanStatus;
  start: number;
  end?: number;
  model?: string;
  icon?: ReactNode;
  task?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  input?: string;
  output?: string;
  error?: string;
  children?: RunSpan[];
}

export interface AfRunInspectorProps {
  /** 主编排智能体与全部子智能体/模型/工具调用树。 */
  run?: RunSpan;
  /** 旁路监督智能体（在主编排器右侧通过虚线连接）。 */
  supervisor?: RunSpan;
  /** 当前时钟（相对运行起点的 ms；省略时在运行期间自动推进）。 */
  now?: number;
  /** 运行启动时间戳（epoch ms）。 */
  startedAt?: number;
  /** 受控选中的智能体 id（其余变暗，顶部统计汇总其子树）。 */
  selected?: string | null;
  /** 切换选中智能体回调。 */
  onSelectedChange?: (id: string | null) => void;
  /** 受控展开的工具/模型调用行 id。 */
  call?: string | null;
  /** 展开/收起调用详情回调。 */
  onCallChange?: (id: string | null) => void;
  /** 费用格式化函数。 */
  formatCost?: (amount: number) => string;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfRunInspectorPatternProps = AfRunInspectorProps;

export const DEFAULT_RUN_SPAN: RunSpan = {
  id: "orchestrator",
  name: "Orchestrator",
  kind: "agent",
  status: "running",
  start: 0,
  model: "Opus 5.5",
  task: "Launch the new pricing page by Friday",
  children: [
    {
      id: "call-plan",
      name: "Plan the launch",
      kind: "llm",
      status: "done",
      start: 900,
      end: 4_800,
      model: "Opus 5.5",
      tokensIn: 3_100,
      tokensOut: 400,
      cost: 0.05,
      input: "Split “launch the new pricing page” into research and copy",
      output: "Spawned Researcher and Writer with parallel milestones.",
    },
    {
      id: "call-spawn",
      name: "Spawn agents: Researcher, Writer",
      kind: "tool",
      status: "done",
      start: 4_850,
      end: 5_050,
      tool: "spawn_agents",
      args: { agents: ["Researcher", "Writer"] },
      result: "Started Researcher and Writer in parallel.",
      cost: 0.01,
    },
    {
      id: "agent-researcher",
      name: "Researcher",
      kind: "agent",
      status: "done",
      start: 5_000,
      end: 13_400,
      model: "Sonnet 5.5",
      task: "Compare the pricing of five competitors",
      children: [
        {
          id: "call-web",
          name: "Fetch SaaS pricing tables",
          kind: "tool",
          status: "done",
          start: 5_300,
          end: 9_800,
          tool: "web_fetch",
          args: { urls: ["linear.app/pricing", "notion.com/pricing", "figma.com/pricing"] },
          result: "Extracted 5 seat matrices and annual discount ratios.",
          cost: 0.02,
        },
        {
          id: "call-synth",
          name: "Synthesize tier matrix",
          kind: "llm",
          status: "done",
          start: 10_000,
          end: 13_300,
          model: "Sonnet 5.5",
          tokensIn: 8_400,
          tokensOut: 1_150,
          cost: 0.03,
          output: "Free tier unlimited seats (250 items); Pro $12/seat.",
        },
      ],
    },
    {
      id: "agent-writer",
      name: "Writer",
      kind: "agent",
      status: "done",
      start: 5_100,
      end: 17_200,
      model: "Sonnet 5.5",
      task: "Write the copy for the three plans",
      children: [
        {
          id: "call-draft-copy",
          name: "Draft headline & subhead",
          kind: "llm",
          status: "done",
          start: 5_500,
          end: 10_400,
          model: "Sonnet 5.5",
          tokensIn: 4_800,
          tokensOut: 780,
          cost: 0.03,
          output: "Simple per-seat pricing that scales from first prototype to enterprise.",
        },
        {
          id: "call-save-copy",
          name: "Write src/pricing/copy.ts",
          kind: "tool",
          status: "done",
          start: 10_800,
          end: 17_000,
          tool: "write_file",
          args: { path: "src/pricing/copy.ts" },
          result: "Wrote 68 lines (3 tier descriptors + FAQ copy).",
          cost: 0.02,
        },
      ],
    },
  ],
};

export const DEFAULT_SUPERVISOR_SPAN: RunSpan = {
  id: "inspector",
  name: "Inspector",
  kind: "agent",
  status: "running",
  start: 0,
  model: "Haiku 5.5",
  task: "Watches cost, errors and what reaches main",
  children: [
    {
      id: "call-budget",
      name: "Check budget",
      kind: "tool",
      status: "done",
      start: 6_000,
      end: 8_200,
      tool: "budget_guard",
      result: "Within limits — 37% of $0.50 cap used",
      cost: 0.01,
    },
  ],
};

function sliceSpanAtClock(span: RunSpan, clockMs: number): RunSpan | null {
  if (span.start > clockMs) return null;
  const stillRunning = span.end === undefined || span.end > clockMs;
  const resolvedStatus: RunSpanStatus = stillRunning ? "running" : span.status;
  const children = (span.children ?? [])
    .map((ch) => sliceSpanAtClock(ch, clockMs))
    .filter((ch): ch is RunSpan => ch !== null);
  return {
    ...span,
    status: resolvedStatus,
    end: stillRunning ? undefined : span.end,
    children,
  };
}

interface SummedStats {
  agents: number;
  runningAgents: number;
  cost: number;
  tokens: number;
  llmCalls: number;
  toolCalls: number;
  failed: number;
  durationMs: number;
}

function sumSpan(root: RunSpan, clockMs: number): SummedStats {
  let agents = root.kind === "agent" ? 1 : 0;
  let runningAgents = root.kind === "agent" && root.status === "running" ? 1 : 0;
  let cost = root.cost ?? 0;
  let tokens = (root.tokensIn ?? 0) + (root.tokensOut ?? 0);
  let llmCalls = root.kind === "llm" ? 1 : 0;
  let toolCalls = root.kind === "tool" ? 1 : 0;
  let failed = root.status === "failed" ? 1 : 0;
  let maxEnd = root.end ?? clockMs;

  for (const ch of root.children ?? []) {
    const sub = sumSpan(ch, clockMs);
    agents += sub.agents;
    runningAgents += sub.runningAgents;
    cost += sub.cost;
    tokens += sub.tokens;
    llmCalls += sub.llmCalls;
    toolCalls += sub.toolCalls;
    failed += sub.failed;
    maxEnd = Math.max(maxEnd, ch.end ?? clockMs);
  }
  return {
    agents,
    runningAgents,
    cost,
    tokens,
    llmCalls,
    toolCalls,
    failed,
    durationMs: Math.max(0, maxEnd - root.start),
  };
}

function findAgentSpan(root: RunSpan, targetId: string): RunSpan | null {
  if (root.id === targetId) return root;
  for (const ch of root.children ?? []) {
    const found = findAgentSpan(ch, targetId);
    if (found) return found;
  }
  return null;
}

function fmtDur(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtSecWhole(ms: number): string {
  return `${Math.max(1, Math.round(ms / 1000))}s`;
}

function fmtTok(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * 多智能体单次运行深潜检视（Pro Agent Block）：顶部 6 项汇总指标 + 旁路监督者虚线连接 + 实时工具瀑布展开。
 */
export function AfRunInspector({
  run = DEFAULT_RUN_SPAN,
  supervisor = DEFAULT_SUPERVISOR_SPAN,
  now: nowProp,
  selected: selectedProp,
  onSelectedChange,
  call: callProp,
  onCallChange,
  formatCost = (amount) => (amount === 0 ? "$0" : `$${amount.toFixed(2)}`),
  className,
}: AfRunInspectorProps = {}) {
  const [autoClock, setAutoClock] = useState<number>(2_200);

  useEffect(() => {
    if (typeof nowProp === "number") return;
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setAutoClock(19_200);
      return;
    }
    const id = window.setInterval(() => {
      setAutoClock((prev) => (prev >= 19_200 ? 19_200 : prev + 100));
    }, 100);
    return () => window.clearInterval(id);
  }, [nowProp]);

  const now = typeof nowProp === "number" ? nowProp : autoClock;

  const [selectedId, setSelectedId] = useControllableState<string | null>({
    value: selectedProp,
    defaultValue: null,
    onChange: onSelectedChange,
  });

  const [openCallId, setOpenCallId] = useControllableState<string | null>({
    value: callProp,
    defaultValue: typeof nowProp === "number" ? "call-budget" : null,
    onChange: onCallChange,
  });

  const liveRun = useMemo(
    () => sliceSpanAtClock(run, now) ?? run,
    [run, now],
  );
  const liveSup = useMemo(
    () => (supervisor ? sliceSpanAtClock(supervisor, now) : null),
    [supervisor, now],
  );

  const pickedSpan = useMemo(() => {
    if (!selectedId) return null;
    if (liveSup && liveSup.id === selectedId) return liveSup;
    return findAgentSpan(liveRun, selectedId);
  }, [liveRun, liveSup, selectedId]);

  const stats = useMemo(() => {
    if (pickedSpan) return sumSpan(pickedSpan, now);
    const main = sumSpan(liveRun, now);
    if (!liveSup) return main;
    const sup = sumSpan(liveSup, now);
    return {
      agents: main.agents + sup.agents,
      runningAgents: main.runningAgents + sup.runningAgents,
      cost: main.cost + sup.cost,
      tokens: main.tokens + sup.tokens,
      llmCalls: main.llmCalls + sup.llmCalls,
      toolCalls: main.toolCalls + sup.toolCalls,
      failed: main.failed + sup.failed,
      durationMs: Math.max(main.durationMs, sup.durationMs),
    };
  }, [liveRun, liveSup, pickedSpan, now]);

  const subAgents = useMemo(
    () => (liveRun.children ?? []).filter((c) => c.kind === "agent"),
    [liveRun],
  );

  const renderAgentCard = (agentSpan: RunSpan, isSupervisor = false) => {
    const isPicked = selectedId === agentSpan.id;
    const isDimmed = selectedId !== null && !isPicked;
    const directCalls = (agentSpan.children ?? []).filter(
      (c) => c.kind === "llm" || c.kind === "tool",
    );
    const cardStats = sumSpan(agentSpan, now);

    const handleCardHeadKey = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedId(isPicked ? null : agentSpan.id);
      }
    };

    return (
      <article
        key={agentSpan.id}
        className="af-pj-rin__card"
        data-picked={isPicked ? "" : undefined}
        data-dim={isDimmed ? "" : undefined}
        data-supervisor={isSupervisor ? "" : undefined}
      >
        <div
          tabIndex={0}
          role="button"
          aria-pressed={isPicked}
          className="af-pj-rin__card-head"
          onClick={() => setSelectedId(isPicked ? null : agentSpan.id)}
          onKeyDown={handleCardHeadKey}
        >
          <div className="af-pj-rin__card-who">
            <ModelVendorMark model={agentSpan.model} size={14} />
            <strong>{agentSpan.name}</strong>
            {agentSpan.model && (
              <span className="af-pj-rin__model">{agentSpan.model}</span>
            )}
          </div>
          <span className="af-pj-rin__status" data-status={agentSpan.status}>
            {agentSpan.status === "running" ? (
              <svg className="af-pj-rin__status-spin" width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
                <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : agentSpan.status === "failed" ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.7" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m3.5 8.5 3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {agentSpan.status === "running"
              ? "Running"
              : agentSpan.status === "failed"
                ? "Failed"
                : "Done"}
          </span>
        </div>

        {agentSpan.task && <p className="af-pj-rin__task">{agentSpan.task}</p>}

        {directCalls.length > 0 && (
          <ul className="af-pj-rin__calls">
            {directCalls.map((item) => {
              const dur = Math.max(200, (item.end ?? now) - item.start);
              const leftPct = Math.min(78, (item.start / Math.max(1, now)) * 100);
              const widthPct = Math.max(
                14,
                Math.min(100 - leftPct, (dur / Math.max(1, now)) * 100),
              );
              const isOpen = openCallId === item.id;
              const detailId = `rin-detail-${item.id}`;

              return (
                <li key={item.id} className="af-pj-rin__call-item">
                  <button
                    type="button"
                    className="af-pj-rin__call-btn"
                    data-kind={item.kind}
                    data-status={item.status}
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    aria-label={`${item.name}, ${item.status === "running" ? "running" : fmtDur(dur)}${item.status === "failed" ? ", failed" : ""}`}
                    onClick={() => setOpenCallId(isOpen ? null : item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && isOpen) {
                        e.stopPropagation();
                        setOpenCallId(null);
                      }
                    }}
                  >
                    <span
                      className="af-pj-rin__call-icon"
                      data-kind={item.kind}
                      data-status={item.status}
                    >
                      <AfIcon
                        name={
                          item.status === "failed"
                            ? "alert"
                            : item.kind === "llm"
                              ? "sparkle"
                              : "terminal"
                        }
                        size={11}
                      />
                    </span>
                    <span className="af-pj-rin__call-name">{item.name}</span>
                    <span className="af-pj-rin__bar-track" aria-hidden="true">
                      <span
                        className="af-pj-rin__bar-fill"
                        data-kind={item.kind}
                        data-status={item.status}
                        style={{
                          left: `${leftPct.toFixed(1)}%`,
                          width: `${widthPct.toFixed(1)}%`,
                        }}
                      />
                    </span>
                    <span className="af-pj-rin__call-dur">
                      {item.status === "running" ? "…" : fmtDur(dur)}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={detailId}
                      className="af-pj-rin__detail"
                      role="region"
                      aria-label={`${item.name} details`}
                    >
                      {item.error && (
                        <div className="af-pj-rin__err">
                          <AfIcon name="alert" size={12} />
                          <span>{item.error}</span>
                        </div>
                      )}
                      <div className="af-pj-rin__meta-line">
                        {item.model && <span>{item.model}</span>}
                        {item.tool && <span>tool: {item.tool}</span>}
                        {(item.tokensIn || item.tokensOut) && (
                          <span>
                            {fmtTok(item.tokensIn ?? 0)} in → {fmtTok(item.tokensOut ?? 0)} out
                          </span>
                        )}
                        {typeof item.cost === "number" && (
                          <span>{formatCost(item.cost)}</span>
                        )}
                      </div>
                      {item.input && (
                        <p className="af-pj-rin__out">
                          <strong>Prompt</strong> {item.input}
                        </p>
                      )}
                      {item.args && (
                        <pre className="af-pj-rin__code">
                          {JSON.stringify(item.args)}
                        </pre>
                      )}
                      {(item.result || item.output) && (
                        <p className="af-pj-rin__out">
                          {item.status === "running"
                            ? "Still running…"
                            : item.result ?? item.output}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="af-pj-rin__card-foot">
          <strong className="af-pj-rin__card-cost">
            {formatCost(cardStats.cost)}
          </strong>
          <span className="af-pj-rin__card-time">
            {" "}
            · {fmtSecWhole(cardStats.durationMs)}
          </span>
        </div>
      </article>
    );
  };

  return (
    <section
      className={cn("af-pj-rin", className)}
      aria-label={`Run: ${liveRun.task ?? liveRun.name}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (openCallId) setOpenCallId(null);
          else if (selectedId) setSelectedId(null);
        }
      }}
    >
      <div className="af-pj-rin__top-bar">
        <div className="af-pj-rin__top-title">
          <AfIcon name="sparkle" size={13} />
          <h2 className="af-pj-rin__title">{liveRun.task ?? liveRun.name}</h2>
        </div>
        <div className="af-pj-rin__live-meta" aria-live="polite">
          <span>{stats.agents} agents</span>
          <span className="af-pj-rin__live-run">
            {stats.runningAgents} running
          </span>
          <strong className="af-pj-rin__live-cost">
            {formatCost(stats.cost)}
          </strong>
        </div>
      </div>

      <div className="af-pj-rin__summary">
        <dl className="af-pj-rin__numbers">
          <div className="af-pj-rin__stat">
            <dt>Duration</dt>
            <dd>{fmtDur(stats.durationMs)}</dd>
          </div>
          <div className="af-pj-rin__stat">
            <dt>Cost</dt>
            <dd>${stats.cost.toFixed(2)}</dd>
          </div>
          <div className="af-pj-rin__stat">
            <dt>Tokens</dt>
            <dd>{fmtTok(stats.tokens)}</dd>
          </div>
          <div className="af-pj-rin__stat">
            <dt>Model calls</dt>
            <dd>{stats.llmCalls}</dd>
          </div>
          <div className="af-pj-rin__stat">
            <dt>Tool calls</dt>
            <dd>{stats.toolCalls}</dd>
          </div>
          <div
            className="af-pj-rin__stat"
            data-danger={stats.failed > 0 ? "" : undefined}
          >
            <dt>Errors</dt>
            <dd>{stats.failed}</dd>
          </div>
        </dl>
      </div>

      <div className="af-pj-rin__tree" role="tree" aria-label={liveRun.task ?? liveRun.name}>
        <div className="af-pj-rin__top-tier">
          {renderAgentCard(liveRun, false)}
          {liveSup && (
            <>
              <div className="af-pj-rin__sup-bridge" aria-hidden="true">
                <span className="af-pj-rin__sup-dot" />
                <span className="af-pj-rin__sup-link" />
              </div>
              {renderAgentCard(liveSup, true)}
            </>
          )}
        </div>

        {subAgents.length > 0 && (
          <>
            <div className="af-pj-rin__stem" aria-hidden="true" />
            <div
              className="af-pj-rin__children"
              data-multi={subAgents.length > 1 ? "" : undefined}
            >
              {subAgents.map((sub) => (
                <div key={sub.id} className="af-pj-rin__child-col">
                  <span className="af-pj-rin__child-stem" aria-hidden="true" />
                  {renderAgentCard(sub, false)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** `AfRunInspector` 兼容模式别名。 */
export const AfRunInspectorPattern = AfRunInspector;
export const RunInspector = AfRunInspector;
