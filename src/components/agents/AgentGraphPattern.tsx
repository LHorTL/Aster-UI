import { useEffect, useId, useMemo, useState } from "react";
import {
  BrandLogo,
  GRAPH_EDGES,
  GRAPH_NODES,
  ScaledStage,
  graphEdgePath,
  money,
  usePrefersReducedMotion,
  type AgentState,
  type BrandKey,
} from "../_shared/agents-a";

export type GraphNode = {
  id: string;
  label: string;
  sub: string;
  kind: "hub" | "agent" | "tool" | "human";
  brand?: BrandKey;
  size: number;
  x: number;
  y: number;
  labelPos?: "above" | "below";
  state: AgentState;
  cost: number;
  calls: number;
};

export type GraphEdge = {
  from: string;
  to: string;
  tone: "accent" | "success" | "warning" | "danger";
  path?: string;
};

export type GraphCallRecord = {
  id: string;
  from: string;
  to: string;
  summary: string;
  latencyMs: number;
};

export interface AfAgentGraphProps {
  title?: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  className?: string;
}

export type AfAgentGraphPatternProps = AfAgentGraphProps;

const TONE_COLOR: Record<GraphEdge["tone"], string> = {
  accent: "var(--aggc-call)",
  success: "var(--aggc-answer)",
  warning: "var(--aggc-ask)",
  danger: "var(--aggc-err)",
};

const NODE_TASK_SUMMARY: Record<string, string> = {
  orchestrator: "Splitting the launch into four jobs",
  researcher: "Reading the pricing pages of five competitors",
  analyst: "Counting seats and upgrades per plan",
  coder: "Building the page and shipping PR #512",
  writer: "Drafting the copy for the three plans",
  search: "Fetching live competitor pricing pages",
  notion: "Syncing launch brief and pricing matrix",
  hubspot: "Pulling enterprise pipeline conversion tiers",
  database: "Querying active seat counts by billing plan",
  github: "Running CI checks on pricing PR #512",
  slack: "Posting draft previews to #launch-pricing",
  you: "Reviewing final pricing copy and rollout date",
};

const NODE_CALL_LOGS: Record<string, { dir: "out" | "in"; peerId: string; summary: string; latency: string }[]> = {
  orchestrator: [
    { dir: "out", peerId: "researcher", summary: "Scan five competitor tiers", latency: "900ms" },
    { dir: "out", peerId: "analyst", summary: "Count seat upgrades by plan", latency: "1.4s" },
    { dir: "in", peerId: "coder", summary: "PR #512 ready for review", latency: "620ms" },
    { dir: "out", peerId: "you", summary: "Approve Friday launch window", latency: "1.1s" },
  ],
  researcher: [
    { dir: "out", peerId: "search", summary: "pricing page linear.app", latency: "740ms" },
    { dir: "out", peerId: "search", summary: "enterprise tier notion.so", latency: "880ms" },
    { dir: "out", peerId: "notion", summary: "Write matrix to /Pricing", latency: "410ms" },
    { dir: "in", peerId: "orchestrator", summary: "Scan five competitor tiers", latency: "900ms" },
  ],
  analyst: [
    { dir: "out", peerId: "database", summary: "SELECT plan, count(*) FROM seats", latency: "320ms" },
    { dir: "out", peerId: "hubspot", summary: "List Q3 expansion deals", latency: "680ms" },
    { dir: "in", peerId: "orchestrator", summary: "Count seat upgrades by plan", latency: "1.4s" },
  ],
  coder: [
    { dir: "out", peerId: "github", summary: "Open PR #512 pricing-v2", latency: "540ms" },
    { dir: "in", peerId: "github", summary: "All 14 checks passed", latency: "1.2s" },
    { dir: "in", peerId: "orchestrator", summary: "Ship annual toggle component", latency: "820ms" },
  ],
  writer: [
    { dir: "out", peerId: "notion", summary: "Read competitor notes", latency: "390ms" },
    { dir: "out", peerId: "slack", summary: "Share headline options", latency: "510ms" },
    { dir: "out", peerId: "you", summary: "Confirm Pro plan tagline", latency: "1.0s" },
  ],
};

export function AfAgentGraph({
  title = "Agent graph",
  nodes = GRAPH_NODES,
  edges = GRAPH_EDGES,
  className,
}: AfAgentGraphProps = {}) {
  const uid = useId().replace(/:/g, "");
  const reducedMotion = usePrefersReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveCalls, setLiveCalls] = useState(14);
  const [liveCost, setLiveCost] = useState(() => nodes.reduce((acc, n) => acc + n.cost, 0));

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setLiveCalls((c) => (c >= 34 ? 14 : c + 1));
      setLiveCost((v) => Math.round((v + 0.01) * 100) / 100);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const activeFocusId = selectedId ?? hoveredId;

  const connectedIds = useMemo(() => {
    if (!activeFocusId) return null;
    const set = new Set<string>([activeFocusId]);
    for (const e of edges) {
      if (e.from === activeFocusId) set.add(e.to);
      if (e.to === activeFocusId) set.add(e.from);
    }
    return set;
  }, [activeFocusId, edges]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const agentCount = useMemo(() => nodes.filter((n) => n.kind === "hub" || n.kind === "agent").length, [nodes]);
  const toolCount = useMemo(() => nodes.filter((n) => n.kind === "tool").length, [nodes]);
  const selectedNode = selectedId ? nodeMap.get(selectedId) ?? null : null;

  return (
    <section className={["af-aggc", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="af-aggc__head">
        <div className="af-aggc__head-left">
          <span className="af-aggc__mark" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 8.4 3.2 4M8 8.4l5-4.2M8 8.4l4.4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
              <circle cx="8" cy="8.4" r="2.4" fill="currentColor" />
              <circle cx="3.2" cy="4" r="1.6" fill="currentColor" />
              <circle cx="13" cy="4.2" r="1.6" fill="currentColor" />
              <circle cx="12.4" cy="12.4" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="af-aggc__title">{title}</span>
        </div>

        <span className="af-aggc__meta">
          <span><b>{agentCount}</b> agents</span>
          <span><b>{toolCount}</b> tools</span>
          <span><b>{liveCalls}</b> calls/min</span>
          <b className="af-aggc__meta-cost">{money(liveCost)}</b>
        </span>
      </header>

      <ScaledStage designWidth={756} designHeight={486} className="af-aggc__stage-wrap" innerClassName="af-aggc__stage">
        <svg className="af-aggc__svg" width="756" height="486" aria-hidden="true">
          <defs>
            <radialGradient id={`aggc-glow-${uid}`}>
              <stop offset="0%" stopColor="var(--aggc-glow)" />
              <stop offset="100%" stopColor="var(--aggc-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="378" cy="243" rx="146" ry="86" fill={`url(#aggc-glow-${uid})`} />

          {edges.map((edge, idx) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;
            const d = edge.path ?? graphEdgePath(a, b);
            const dim = Boolean(activeFocusId && edge.from !== activeFocusId && edge.to !== activeFocusId);
            return (
              <g key={`${edge.from}-${edge.to}-${idx}`}>
                <path className="af-aggc__edge" pathLength={1} d={d} data-dim={dim ? "true" : undefined} />
                {!dim && !reducedMotion ? (
                  <path
                    className="af-aggc__streak"
                    pathLength={1}
                    d={d}
                    stroke={TONE_COLOR[edge.tone]}
                    style={{ animationDelay: `${idx * 140}ms` }}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const dim = Boolean(connectedIds && !connectedIds.has(node.id));
          const isSelected = selectedId === node.id;
          const iconSize = node.kind === "hub" ? 24 : node.kind === "agent" ? 20 : 17;
          return (
            <div
              key={node.id}
              className="af-aggc__node"
              data-dim={dim ? "true" : undefined}
              data-above={node.labelPos === "above" ? "true" : undefined}
              style={{ left: node.x, top: node.y }}
            >
              <button
                type="button"
                className="af-aggc__disc"
                data-hub={node.kind === "hub" ? "true" : undefined}
                data-selected={isSelected ? "true" : undefined}
                style={{ width: node.size, height: node.size }}
                aria-label={`${node.label} (${node.sub})`}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId((curr) => (curr === node.id ? null : curr))}
                onClick={() => setSelectedId((curr) => (curr === node.id ? null : node.id))}
              >
                <BrandLogo kind={node.brand ?? "claude"} size={iconSize} />
              </button>
              <div className="af-aggc__caption">
                <span className="af-aggc__name">{node.label}</span>
                {node.kind === "hub" || node.kind === "agent" ? (
                  <span className="af-aggc__sub">{node.sub}</span>
                ) : null}
              </div>
            </div>
          );
        })}

        <div className="af-aggc__legend" aria-hidden="true">
          <span className="af-aggc__leg-item">
            <span className="af-aggc__leg-line" style={{ background: "var(--aggc-call)" }} />
            Call
          </span>
          <span className="af-aggc__leg-item">
            <span className="af-aggc__leg-line" style={{ background: "var(--aggc-answer)" }} />
            Answer
          </span>
          <span className="af-aggc__leg-item">
            <span className="af-aggc__leg-line" style={{ background: "var(--aggc-ask)" }} />
            Needs you
          </span>
          <span className="af-aggc__leg-item">
            <span className="af-aggc__leg-line" style={{ background: "var(--aggc-err)" }} />
            Failed
          </span>
        </div>

        {selectedNode ? (() => {
          const popLeft =
            selectedNode.x < 430
              ? Math.min(756 - 280, Math.round(selectedNode.x + selectedNode.size / 2 + 14))
              : Math.max(12, Math.round(selectedNode.x - selectedNode.size / 2 - 282));
          const popTop = Math.max(12, Math.min(486 - 232, Math.round(selectedNode.y - 84)));
          const fallbackCalls = edges
            .filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
            .slice(0, 3)
            .map((e, i) => {
              const isOut = e.from === selectedNode.id;
              const peerId = isOut ? e.to : e.from;
              return {
                dir: isOut ? ("out" as const) : ("in" as const),
                peerId,
                summary: isOut ? "Synced payload" : "Received update",
                latency: `${420 + i * 190}ms`,
              };
            });
          const callRows = NODE_CALL_LOGS[selectedNode.id] ?? fallbackCalls;
          const isWorking = selectedNode.state === "running";
          const statusLabel = isWorking
            ? "Working"
            : selectedNode.state === "waiting"
              ? "Needs you"
              : selectedNode.state === "failed"
                ? "Failed"
                : "Ready";

          return (
            <div
              key={selectedNode.id}
              className="af-aggc__pop"
              role="dialog"
              aria-label={selectedNode.label}
              style={{ left: popLeft, top: popTop }}
            >
              <div className="af-aggc__pop-head">
                <span className="af-aggc__pop-logo" aria-hidden="true">
                  <BrandLogo kind={selectedNode.brand ?? "claude"} size={15} />
                </span>
                <div className="af-aggc__pop-who">
                  <strong className="af-aggc__pop-name">{selectedNode.label}</strong>
                  <span className="af-aggc__pop-sub">{selectedNode.sub}</span>
                </div>
                <span className="af-aggc__pop-pill" data-working={isWorking ? "true" : undefined}>
                  {statusLabel}
                </span>
                <button
                  type="button"
                  className="af-aggc__pop-close"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>

              <p className="af-aggc__pop-task">
                {NODE_TASK_SUMMARY[selectedNode.id] ?? `Active ${selectedNode.sub.toLowerCase()} node in the launch graph`}
              </p>

              <div className="af-aggc__pop-calls">
                {callRows.map((row, idx) => {
                  const peer = nodeMap.get(row.peerId);
                  return (
                    <div key={`${selectedNode.id}-c-${idx}`} className="af-aggc__pop-call">
                      <span className="af-aggc__pop-dir" aria-hidden="true">
                        {row.dir === "out" ? "↗" : "↙"}
                      </span>
                      <span className="af-aggc__pop-peer-icon" aria-hidden="true">
                        <BrandLogo kind={peer?.brand ?? "claude"} size={12} />
                      </span>
                      <span className="af-aggc__pop-peer">{peer?.label ?? row.peerId}</span>
                      <span className="af-aggc__pop-sum">{row.summary}</span>
                      <span className="af-aggc__pop-lat">{row.latency}</span>
                    </div>
                  );
                })}
              </div>

              <div className="af-aggc__pop-foot">
                <b>{money(selectedNode.cost)}</b>
                <span>{selectedNode.calls} calls in the last minute</span>
              </div>
            </div>
          );
        })() : null}
      </ScaledStage>
    </section>
  );
}

export const AfAgentGraphPattern = AfAgentGraph;
