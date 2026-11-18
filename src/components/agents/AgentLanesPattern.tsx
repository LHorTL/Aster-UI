import { useMemo, useState } from "react";
import {
  BrandLogo,
  HeaderSpark,
  LANE_AGENTS,
  LANE_HANDOFFS,
  LANE_ROW,
  LANE_TASKS,
  LANE_WINDOW,
  type AgentState,
  type BrandKey,
  type LaneTask,
} from "../_shared/agents-a";

export type { LaneTask };

export type LaneAgent = {
  id: string;
  name: string;
  model: string;
  brand?: BrandKey;
  state: AgentState;
};

export type LaneHandoff = {
  from: string;
  to: string;
  lane: string;
  at: number;
};

export interface AfAgentLanesProps {
  title?: string;
  agents?: LaneAgent[];
  initialTasks?: LaneTask[];
  handoffs?: LaneHandoff[];
  className?: string;
}

export type AfAgentLanesPatternProps = AfAgentLanesProps;

export function AfAgentLanes({
  title = "Agents",
  agents = LANE_AGENTS,
  initialTasks = LANE_TASKS,
  handoffs = LANE_HANDOFFS,
  className,
}: AfAgentLanesProps = {}) {
  const [tasks, setTasks] = useState<LaneTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const runningCount = useMemo(() => tasks.filter((t) => t.state === "running").length, [tasks]);
  const waitingCount = useMemo(() => tasks.filter((t) => t.state === "waiting").length, [tasks]);
  const selectedTask = useMemo(() => (selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null), [tasks, selectedId]);

  const laneIndexMap = useMemo(() => new Map(agents.map((a, idx) => [a.id, idx])), [agents]);

  const resolveTaskDecision = (taskId: string, decision: "approve" | "reject" | "retry") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        if (decision === "approve" || decision === "retry") return { ...t, state: "running", reason: undefined };
        return { ...t, state: "failed", reason: "Rejected by operator." };
      }),
    );
    setSelectedId(null);
  };

  return (
    <section className={["af-alc", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="af-alc__head">
        <div className="af-alc__head-left">
          <span className="af-alc__spark" aria-hidden="true">
            <HeaderSpark size={14} />
          </span>
          <span className="af-alc__title">{title}</span>
          {runningCount > 0 ? (
            <span className="af-alc__stat">
              <i className="af-alc__stat-dot" aria-hidden="true" />
              {runningCount} running
            </span>
          ) : null}
          {waitingCount > 0 ? (
            <span className="af-alc__stat" data-tone="warn">
              <i className="af-alc__stat-dot" aria-hidden="true" />
              {waitingCount} needs you
            </span>
          ) : null}
        </div>
        <span className="af-alc__window">Last 30m</span>
      </header>

      <div className="af-alc__axis" aria-hidden="true">
        <span>-25m</span>
        <span>-20m</span>
        <span>-15m</span>
        <span>-10m</span>
        <span>-5m</span>
        <span className="af-alc__now-pill">now</span>
      </div>

      <div className="af-alc__body">
        <div className="af-alc__roster">
          {agents.map((agent) => (
            <div key={agent.id} className="af-alc__agent">
              <span className="af-alc__avatar" aria-hidden="true">
                <BrandLogo kind={agent.brand ?? "claude"} />
              </span>
              <div className="af-alc__who">
                <div className="af-alc__name-row">
                  <span className="af-alc__name">{agent.name}</span>
                  {agent.state === "idle" ? (
                    <span className="af-alc__state-pill">Idle</span>
                  ) : agent.state === "waiting" ? (
                    <span className="af-alc__state-pill" data-tone="warn">
                      Needs you
                    </span>
                  ) : null}
                </div>
                <div className="af-alc__model">{agent.model}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="af-alc__timeline">
          <div className="af-alc__tracks" style={{ height: agents.length * LANE_ROW }}>
            {agents.map((agent) => (
              <div key={`row-${agent.id}`} className="af-alc__row-line" style={{ height: LANE_ROW }} />
            ))}

            {[5, 10, 15, 20, 25].map((min) => (
              <div
                key={`tick-${min}`}
                className="af-alc__tick-line"
                style={{ left: `${(min / LANE_WINDOW) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            <div className="af-alc__now-line" aria-hidden="true" />

            {/* S-Curve Handoff Connectors */}
            <svg
              className="af-alc__curves"
              viewBox={`0 0 1000 ${agents.length * LANE_ROW}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {handoffs.map((h, idx) => {
                const fromTask = tasks.find((t) => t.id === h.from);
                const toTask = tasks.find((t) => t.id === h.to);
                if (!fromTask || !toTask) return null;
                const r1 = laneIndexMap.get(fromTask.lane) ?? 0;
                const r2 = laneIndexMap.get(toTask.lane) ?? 1;
                const x1 = ((fromTask.start + fromTask.span) / LANE_WINDOW) * 1000;
                const y1 = r1 * LANE_ROW + LANE_ROW / 2;
                const x2 = (toTask.start / LANE_WINDOW) * 1000;
                const y2 = r2 * LANE_ROW + LANE_ROW / 2;
                const cx = (x1 + x2) / 2;
                return (
                  <path
                    key={`h-${idx}`}
                    d={`M ${x1} ${y1} C ${cx + 12} ${y1}, ${cx - 12} ${y2}, ${x2} ${y2}`}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Task Bars */}
            {tasks.map((task) => {
              const rowIdx = laneIndexMap.get(task.lane) ?? 0;
              const leftPct = (task.start / LANE_WINDOW) * 100;
              const widthPct = Math.max(8, (task.span / LANE_WINDOW) * 100 - 1.2);
              return (
                <button
                  key={task.id}
                  type="button"
                  className="af-alc__bar"
                  data-state={task.state}
                  style={{
                    top: rowIdx * LANE_ROW + 8,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                  onClick={() => setSelectedId((curr) => (curr === task.id ? null : task.id))}
                >
                  {task.brands && task.brands.length > 0 ? (
                    <span className="af-alc__tools" aria-hidden="true">
                      {task.brands.map((b, i) => (
                        <span key={`${task.id}-b-${i}`} className="af-alc__tool">
                          <BrandLogo kind={b} />
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="af-alc__bar-label">{task.label}</span>
                  {task.state === "waiting" ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "#d97706",
                      }}
                    >
                      ▲ Needs you
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTask ? (
        <div key={selectedTask.id} className="af-alc__pop" role="dialog" aria-label={selectedTask.label}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <strong style={{ fontSize: 12.5 }}>{selectedTask.label}</strong>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{ border: 0, background: "transparent", color: "var(--alc-muted)", cursor: "pointer", fontSize: 12 }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 11.5, lineHeight: 1.45, color: "var(--alc-muted)" }}>
            {selectedTask.reason ?? `${selectedTask.span}m window on ${selectedTask.lane} lane · status: ${selectedTask.state}.`}
          </p>
          {selectedTask.state === "waiting" ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => resolveTaskDecision(selectedTask.id, "approve")}
                style={{
                  flex: 1,
                  height: 27,
                  borderRadius: 7,
                  border: 0,
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => resolveTaskDecision(selectedTask.id, "reject")}
                style={{
                  flex: 1,
                  height: 27,
                  borderRadius: 7,
                  border: "1px solid var(--alc-line)",
                  background: "transparent",
                  color: "var(--alc-ink)",
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          ) : selectedTask.state === "failed" ? (
            <button
              type="button"
              onClick={() => resolveTaskDecision(selectedTask.id, "retry")}
              style={{
                width: "100%",
                height: 27,
                borderRadius: 7,
                border: "1px solid var(--alc-line)",
                background: "var(--alc-well)",
                color: "var(--alc-ink)",
                fontSize: 11.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry step
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export const AfAgentLanesPattern = AfAgentLanes;
