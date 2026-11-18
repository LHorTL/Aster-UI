import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark } from "./_marks";

export type FindingSeverity =
  | "high"
  | "warning"
  | "suggestion"
  | "critical"
  | "note";

export interface AgentFindingItem {
  id: string;
  severity: FindingSeverity;
  title: string;
  location: string;
  snippet: string;
  fixHint: string;
}

export interface FindingAgent {
  id: string;
  name: string;
  model?: string;
  avatar?: ReactNode;
  step?: string;
  done: number;
  total: number;
  status?: "running" | "done";
}

export interface Finding {
  id: string;
  agentId: string;
  title: string;
  severity: "critical" | "warning" | "note";
  location?: string;
  /** Epoch ms or short relative label like "1m". */
  at: number | string;
  snippet?: string;
  detail?: string;
}

export interface AfAgentFindingsProps {
  /** Parallel verification agents with check progress. */
  agents?: FindingAgent[];
  /** Findings stream (newest first). */
  findings?: Finding[];
  title?: ReactNode;
  /** Max visible rows in the feed before scrolling (default 4). */
  rows?: number;
  now?: number;
  onOpen?: (finding: Finding) => void;
  /** Legacy compatibility props. */
  initialFindings?: AgentFindingItem[];
  onAcceptFix?: (finding: AgentFindingItem) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_AGENTS: FindingAgent[] = [
  {
    id: "auditor",
    name: "Auditor",
    model: "Opus 5.5",
    step: "Tracing calls in Vault.withdraw",
    done: 24,
    total: 24,
    status: "running",
  },
  {
    id: "fuzzer",
    name: "Fuzzer",
    model: "GPT-6",
    step: "Fuzzing transfer with 10k inputs",
    done: 18,
    total: 18,
    status: "running",
  },
  {
    id: "prover",
    name: "Prover",
    model: "Gemini 3.8 Pro",
    step: "Proving totalSupply invariant",
    done: 12,
    total: 12,
    status: "running",
  },
  {
    id: "gas",
    name: "Gas review",
    model: "Sonnet 5.5",
    step: "Profiling storage reads",
    done: 10,
    total: 10,
    status: "running",
  },
];

const DEFAULT_FINDINGS: Finding[] = [
  {
    id: "fn-1",
    agentId: "auditor",
    severity: "critical",
    title: "Unchecked callback before LP reserve update",
    location: "Pool.sol:142",
    at: "4s",
    snippet:
      "IMakerHook(msg.sender).onSwap(delta);\n_updateReserves(balance0, balance1);",
    detail:
      "External hook executes before reserve state is committed, enabling read-only reentrancy against LP share pricing.",
  },
  {
    id: "fn-2",
    agentId: "prover",
    severity: "warning",
    title: "Rounding dust favors withdrawer on odd shares",
    location: "VaultMath.sol:87",
    at: "12s",
    snippet: "assets = Math.mulDiv(shares, totalAssets + 1, totalSupply, Up);",
    detail:
      "Counterexample found when totalSupply == 3 and shares == 1: rounding up leaks 1 wei from remaining depositors.",
  },
  {
    id: "fn-3",
    agentId: "auditor",
    severity: "warning",
    title: "Oracle staleness window allows 24h stale price",
    location: "OracleRouter.sol:64",
    at: "24s",
    snippet: "require(block.timestamp - updatedAt <= 86400, 'STALE');",
    detail:
      "Chainlink heartbeat for ETH/USD is 3600s; a 24h threshold accepts stale feed rounds during volatility.",
  },
  {
    id: "fn-4",
    agentId: "gas",
    severity: "note",
    title: "Constant could be immutable",
    location: "Pool.sol:12",
    at: "41s",
    snippet: "address public feeRecipient; // set once in constructor",
    detail:
      "Marking feeRecipient immutable saves 2,100 gas per swap by avoiding cold SLOAD.",
  },
];

const TOTAL_DEMO_TICKS = 32;

function formatRelative(at: number | string, now?: number): string {
  if (typeof at === "string") return at;
  const ref = now ?? at + 60_000;
  const sec = Math.max(1, Math.round((ref - at) / 1000));
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

function SeverityMark({
  severity,
  size = 10,
  className,
}: {
  severity: "critical" | "warning" | "note";
  size?: number;
  className?: string;
}) {
  const ops =
    severity === "critical"
      ? [1, 1, 1, 0.6]
      : severity === "warning"
        ? [1, 0.6, 0.6, 0.3]
        : [0.6, 0.3, 0.3, 0.3];

  return (
    <svg
      className={cn("af-agc-fnd__sev-mark", `is-${severity}`, className)}
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="4.5" height="4.5" rx="1" fill="currentColor" fillOpacity={ops[0]} />
      <rect x="5.5" y="0" width="4.5" height="4.5" rx="1" fill="currentColor" fillOpacity={ops[1]} />
      <rect x="0" y="5.5" width="4.5" height="4.5" rx="1" fill="currentColor" fillOpacity={ops[2]} />
      <rect x="5.5" y="5.5" width="4.5" height="4.5" rx="1" fill="currentColor" fillOpacity={ops[3]} />
    </svg>
  );
}

export function AfAgentFindings({
  agents: propAgents,
  findings: propFindings,
  title = "Verification",
  rows = 4,
  now,
  onOpen,
  initialFindings,
  onAcceptFix,
  className,
  style,
}: AfAgentFindingsProps = {}) {
  const isLiveDemo =
    propAgents === undefined &&
    propFindings === undefined &&
    initialFindings === undefined;

  const [demoTick, setDemoTick] = useState<number>(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return TOTAL_DEMO_TICKS;
    }
    return 0;
  });

  useEffect(() => {
    if (!isLiveDemo) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDemoTick(TOTAL_DEMO_TICKS);
      return;
    }
    const timer = window.setInterval(() => {
      setDemoTick((prev) => {
        if (prev >= TOTAL_DEMO_TICKS) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 240);
    return () => window.clearInterval(timer);
  }, [isLiveDemo]);

  const agents = useMemo<FindingAgent[]>(() => {
    const base = propAgents ?? DEFAULT_AGENTS;
    if (!isLiveDemo) return base;
    const progress = demoTick / TOTAL_DEMO_TICKS;
    return base.map((ag, idx) => {
      const rateBoost = idx === 3 ? 1.28 : idx === 0 ? 1.06 : idx === 1 ? 0.96 : 0.92;
      const done = Math.min(
        ag.total,
        Math.round(ag.total * Math.min(1, progress * rateBoost)),
      );
      const isComplete = done >= ag.total;
      return {
        ...ag,
        done,
        status: isComplete ? "done" : "running",
        step:
          ag.id === "gas" && isComplete
            ? "Profiled 10 storage reads"
            : ag.step,
      };
    });
  }, [demoTick, isLiveDemo, propAgents]);

  const findings = useMemo<Finding[]>(() => {
    if (propFindings && propFindings.length > 0) return propFindings;
    if (initialFindings && initialFindings.length > 0) {
      return initialFindings.map((it, idx) => ({
        id: it.id,
        agentId: agents[idx % agents.length]?.id ?? "auditor",
        severity:
          it.severity === "high" || it.severity === "critical"
            ? "critical"
            : it.severity === "warning"
              ? "warning"
              : "note",
        title: it.title,
        location: it.location,
        at: `${idx + 1}m`,
        snippet: it.snippet,
        detail: it.fixHint,
      }));
    }
    if (!isLiveDemo) return DEFAULT_FINDINGS;
    // Stream findings in newest-first order as verification checks progress
    const visible: Finding[] = [DEFAULT_FINDINGS[3]]; // fn-4 at t=0 ("Constant could be immutable")
    if (demoTick >= 5) visible.unshift(DEFAULT_FINDINGS[2]);
    if (demoTick >= 11) visible.unshift(DEFAULT_FINDINGS[1]);
    if (demoTick >= 18) visible.unshift(DEFAULT_FINDINGS[0]);
    return visible;
  }, [agents, demoTick, initialFindings, isLiveDemo, propFindings]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(
    null,
  );

  const agentById = useMemo(() => {
    const m = new Map<string, FindingAgent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  const totals = useMemo(() => {
    let done = 0;
    let total = 0;
    agents.forEach((a) => {
      done += a.done;
      total += a.total;
    });
    let critical = 0;
    let warnings = 0;
    findings.forEach((f) => {
      if (f.severity === "critical") critical += 1;
      else if (f.severity === "warning") warnings += 1;
    });
    return { done, total, critical, warnings };
  }, [agents, findings]);

  const perAgentCounts = useMemo(() => {
    const m = new Map<
      string,
      { critical: number; warning: number; note: number }
    >();
    findings.forEach((f) => {
      const cur = m.get(f.agentId) ?? { critical: 0, warning: 0, note: 0 };
      cur[f.severity] += 1;
      m.set(f.agentId, cur);
    });
    return m;
  }, [findings]);

  const filteredFindings = useMemo(
    () =>
      selectedAgentId
        ? findings.filter((f) => f.agentId === selectedAgentId)
        : findings,
    [findings, selectedAgentId],
  );

  const selectedAgent = selectedAgentId
    ? agentById.get(selectedAgentId) ?? null
    : null;

  const feedSlotHeight = rows * 38 + 8;

  return (
    <div className={cn("af-agc-fnd", className)} style={style}>
      <div className="af-agc-fnd__head">
        <div className="af-agc-fnd__head-left">
          <svg
            className="af-agc-fnd__spark"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m7.2 2 1.35 3.7L12.25 7l-3.7 1.35L7.2 12.05 5.85 8.35 2.15 7l3.7-1.3L7.2 2Z"
              fill="currentColor"
            />
            <circle cx="12.4" cy="11.8" r="1.05" fill="currentColor" opacity="0.65" />
          </svg>
          <span className="af-agc-fnd__title">{title}</span>
          <span className="af-agc-fnd__checks">
            {totals.done} of {totals.total} checks
          </span>
        </div>

        <div className="af-agc-fnd__head-right">
          <span
            className={cn(
              "af-agc-fnd__sev-stat",
              totals.critical > 0 ? "is-critical" : "is-zero",
            )}
          >
            <span
              className={cn(
                "af-agc-fnd__sev-dot",
                totals.critical > 0 ? "is-critical" : "is-zero",
              )}
              aria-hidden="true"
            />
            <b>{totals.critical}</b> critical
          </span>
          <span
            className={cn(
              "af-agc-fnd__sev-stat",
              totals.warnings > 0 ? "is-warning" : "is-zero",
            )}
          >
            <span
              className={cn(
                "af-agc-fnd__sev-dot",
                totals.warnings > 0 ? "is-warning" : "is-zero",
              )}
              aria-hidden="true"
            />
            <b>{totals.warnings}</b>{" "}
            {totals.warnings === 1 ? "warning" : "warnings"}
          </span>
        </div>
      </div>

      {/* Parallel verification agent rows */}
      <div
        className="af-agc-fnd__agents"
        role="list"
        aria-label="Verification agents"
      >
        {agents.map((ag) => {
          const pct =
            ag.total > 0
              ? Math.min(100, Math.round((ag.done / ag.total) * 100))
              : 0;
          const isRunning =
            (ag.status ?? (ag.done < ag.total ? "running" : "done")) ===
            "running";
          const active = selectedAgentId === ag.id;
          const dimmed = selectedAgentId !== null && !active;
          const counts = perAgentCounts.get(ag.id);
          const critCount = counts?.critical ?? 0;
          const warnCount = counts?.warning ?? 0;

          return (
            <button
              key={ag.id}
              type="button"
              title={ag.model ? `${ag.name} · ${ag.model}` : ag.name}
              className={cn(
                "af-agc-fnd__agent-row",
                active && "is-selected",
                dimmed && "is-dimmed",
              )}
              aria-pressed={active}
              onClick={() =>
                setSelectedAgentId((prev) => (prev === ag.id ? null : ag.id))
              }
            >
              <span className="af-agc-fnd__agent-tile" aria-hidden="true">
                {ag.avatar ?? (
                  <ModelBrandMark model={ag.model ?? ag.name} size={13} />
                )}
              </span>

              <div className="af-agc-fnd__agent-copy">
                <div className="af-agc-fnd__agent-top">
                  <span className="af-agc-fnd__agent-name">{ag.name}</span>
                </div>
                {ag.step ? (
                  <div className="af-agc-fnd__agent-step">{ag.step}</div>
                ) : null}
              </div>

              <div className="af-agc-fnd__prog" aria-hidden="true">
                <span
                  className={cn(
                    "af-agc-fnd__prog-fill",
                    isRunning && "is-running",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <span className="af-agc-fnd__agent-frac">
                {ag.done}/{ag.total}
              </span>

              <div className="af-agc-fnd__agent-badges" aria-hidden="true">
                <span
                  className={cn(
                    "af-agc-fnd__found-pair",
                    critCount === 0 && "is-zero",
                  )}
                >
                  <SeverityMark severity="critical" size={9} />
                  <span>{critCount}</span>
                </span>
                <span
                  className={cn(
                    "af-agc-fnd__found-pair",
                    warnCount === 0 && "is-zero",
                  )}
                >
                  <SeverityMark severity="warning" size={9} />
                  <span>{warnCount}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Latest findings stream */}
      <div className="af-agc-fnd__subhead">
        <span className="af-agc-fnd__sub-label">Latest findings</span>
        {selectedAgent ? (
          <button
            type="button"
            className="af-agc-fnd__filter-chip"
            onClick={() => setSelectedAgentId(null)}
          >
            <span>{selectedAgent.name}</span>
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      <div
        className="af-agc-fnd__feed"
        style={{
          minHeight: isLiveDemo ? feedSlotHeight : undefined,
          maxHeight: feedSlotHeight + (expandedFindingId ? 132 : 0),
        }}
      >
        {filteredFindings.length === 0 ? (
          <div className="af-agc-fnd__empty">
            No findings reported by this agent yet.
          </div>
        ) : (
          filteredFindings.map((fn) => {
            const author = agentById.get(fn.agentId)?.name ?? fn.agentId;
            const isExpanded = expandedFindingId === fn.id;
            return (
              <div
                key={fn.id}
                className={cn(
                  "af-agc-fnd__item",
                  `is-${fn.severity}`,
                  isExpanded && "is-open",
                )}
              >
                <button
                  type="button"
                  className="af-agc-fnd__item-btn"
                  aria-expanded={isExpanded}
                  onClick={() => {
                    setExpandedFindingId((prev) =>
                      prev === fn.id ? null : fn.id,
                    );
                    onOpen?.(fn);
                  }}
                >
                  <SeverityMark severity={fn.severity} size={10} />
                  <span className="af-agc-fnd__item-main">
                    <span className="af-agc-fnd__item-title">{fn.title}</span>
                    <span className="af-agc-fnd__item-loc">
                      {author}
                      {fn.location ? ` · ${fn.location}` : ""}
                    </span>
                  </span>
                  <span className="af-agc-fnd__item-age">
                    {formatRelative(fn.at, now)}
                  </span>
                </button>

                {isExpanded && (fn.snippet || fn.detail) ? (
                  <div className="af-agc-fnd__detail">
                    {fn.snippet ? (
                      <pre className="af-agc-fnd__code">
                        <code>{fn.snippet}</code>
                      </pre>
                    ) : null}
                    {fn.detail ? (
                      <div className="af-agc-fnd__detail-row">
                        <p className="af-agc-fnd__detail-text">{fn.detail}</p>
                        {initialFindings ? (
                          <button
                            type="button"
                            className="af-agc-fnd__fix-btn"
                            onClick={() => {
                              const leg = initialFindings.find(
                                (x) => x.id === fn.id,
                              );
                              if (leg) onAcceptFix?.(leg);
                            }}
                          >
                            Apply fix
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const AfAgentFindingsPattern = AfAgentFindings;
export type AfAgentFindingsPatternProps = AfAgentFindingsProps;
