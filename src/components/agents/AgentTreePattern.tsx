import { useMemo, useState } from "react";
import {
  BrandLogo,
  HeaderSpark,
  ScaledStage,
  TREE_CANVAS_W,
  TREE_H,
  TREE_NODES,
  TREE_W,
  money,
  treeEdgePath,
  type TreeNode,
} from "../_shared/agents-a";

export type { TreeNode };

export interface AfAgentTreeProps {
  title?: string;
  nodes?: TreeNode[];
  className?: string;
}

export type AfAgentTreePatternProps = AfAgentTreeProps;

export function AfAgentTree({
  title = "Agents",
  nodes = TREE_NODES,
  className,
}: AfAgentTreeProps = {}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const childrenMap = useMemo(() => {
    const map = new Map<string, TreeNode[]>();
    for (const n of nodes) {
      if (!n.parent) continue;
      const arr = map.get(n.parent) ?? [];
      arr.push(n);
      map.set(n.parent, arr);
    }
    return map;
  }, [nodes]);

  const hiddenIds = useMemo(() => {
    const set = new Set<string>();
    const walk = (id: string) => {
      const kids = childrenMap.get(id) ?? [];
      for (const k of kids) {
        set.add(k.id);
        walk(k.id);
      }
    };
    for (const id of collapsedIds) walk(id);
    return set;
  }, [collapsedIds, childrenMap]);

  const visibleNodes = useMemo(() => nodes.filter((n) => !hiddenIds.has(n.id)), [nodes, hiddenIds]);

  const stageHeight = useMemo(() => {
    const maxBottom = visibleNodes.reduce((m, n) => Math.max(m, n.y + TREE_H), 200);
    return maxBottom + 24;
  }, [visibleNodes]);

  const runningCount = useMemo(() => nodes.filter((n) => n.state === "running").length, [nodes]);
  const totalCost = useMemo(() => nodes.reduce((acc, n) => acc + n.cost, 0), [nodes]);

  const toggleFold = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countSubtree = (id: string): { count: number; cost: number } => {
    let count = 0;
    let cost = 0;
    const walk = (pid: string) => {
      for (const child of childrenMap.get(pid) ?? []) {
        count += 1;
        cost += child.cost;
        walk(child.id);
      }
    };
    walk(id);
    return { count, cost };
  };

  return (
    <section className={["af-agtc", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="af-agtc__head">
        <div className="af-agtc__head-left">
          <span style={{ display: "inline-flex", color: "#3b82f6" }} aria-hidden="true">
            <HeaderSpark size={14} />
          </span>
          <strong style={{ fontSize: 13.5 }}>{title}</strong>
        </div>

        <div className="af-agtc__stats">
          <span>{nodes.length} agents</span>
          <span className="af-agtc__stat-run">{runningCount} running</span>
          <b className="af-agtc__stat-cost">{money(totalCost)}</b>
        </div>
      </header>

      <ScaledStage
        designWidth={TREE_CANVAS_W}
        designHeight={stageHeight}
        className="af-agtc__stage-wrap"
      >
        <svg
          width={TREE_CANVAS_W}
          height={stageHeight}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          aria-hidden="true"
        >
          {visibleNodes.map((child) => {
            if (!child.parent) return null;
            const parent = visibleNodes.find((p) => p.id === child.parent);
            if (!parent) return null;
            const d = treeEdgePath(parent, child, TREE_W, TREE_H);
            return (
              <g key={`${parent.id}-${child.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--agtc-link)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        {visibleNodes.map((node) => {
          const kids = childrenMap.get(node.id) ?? [];
          const isFolded = collapsedIds.has(node.id);
          const sub = countSubtree(node.id);

          return (
            <div
              key={node.id}
              className="af-agtc__card"
              role="button"
              tabIndex={0}
              data-selected={selectedId === node.id ? "true" : undefined}
              style={{ left: node.x, top: node.y }}
              onClick={() => setSelectedId((curr) => (curr === node.id ? null : node.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId((curr) => (curr === node.id ? null : node.id));
                }
              }}
            >
              <div className="af-agtc__card-top">
                <span className="af-agtc__card-logo" aria-hidden="true">
                  <BrandLogo kind={node.brand ?? "claude"} />
                </span>
                <div className="af-agtc__card-who">
                  <span className="af-agtc__card-name">{node.name}</span>
                  <span className="af-agtc__card-model">{node.model}</span>
                </div>
                <span className="af-agtc__status" data-state={node.state}>
                  <i className="af-agtc__status-dot" aria-hidden="true" />
                  {node.state === "running"
                    ? "Running"
                    : node.state === "waiting"
                      ? "Needs you"
                      : node.state === "failed"
                        ? "Failed"
                        : "Done"}
                </span>
              </div>

              <div className="af-agtc__card-mid">
                {(node.toolBrands ?? []).length > 0 ? (
                  <span className="af-agtc__tools" aria-hidden="true">
                    {(node.toolBrands ?? []).map((b, i) => (
                      <span key={`${node.id}-tb-${i}`} className="af-agtc__tool-chip">
                        <BrandLogo kind={b} size={11} />
                      </span>
                    ))}
                  </span>
                ) : null}
                <p className="af-agtc__card-desc">{node.desc}</p>
              </div>

              <div className="af-agtc__card-foot">
                <span className="af-agtc__cost-line">
                  <b>{money(node.cost + (isFolded ? sub.cost : 0))}</b>
                  {node.elapsed ? <span> · {node.elapsed}</span> : null}
                </span>

                {kids.length > 0 ? (
                  <button
                    type="button"
                    className="af-agtc__fold"
                    data-folded={isFolded ? "true" : undefined}
                    aria-expanded={!isFolded}
                    aria-label={isFolded ? `Expand ${node.name} children` : `Collapse ${node.name} children`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFold(node.id);
                    }}
                  >
                    <span>{isFolded ? `+${sub.count}` : `-${kids.length}`}</span>
                    <svg
                      className="af-agtc__fold-chev"
                      width="9"
                      height="9"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 3.75 5 6.25 7.5 3.75"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </ScaledStage>
    </section>
  );
}

export const AfAgentTreePattern = AfAgentTree;
