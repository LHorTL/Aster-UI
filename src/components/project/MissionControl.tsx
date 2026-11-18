import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { BrandAppTile, ModelVendorMark } from "../_shared/project";

export type MissionStatus = "running" | "waiting" | "failed" | "done";
export type MissionFilter = "all" | "running" | "waiting" | "failed";

export interface MissionAgent {
  id: string;
  name: string;
  model?: string;
  avatar?: ReactNode;
  status: MissionStatus;
  task: string;
  ask?: string;
  error?: string;
  cost?: number;
  elapsed?: string;
  started?: number;
  ended?: number;
  tools?: string[];
  children?: MissionAgent[];
}

export interface MissionEvent {
  id: string;
  agent: string;
  at: number;
  kind: "done" | "needs" | "failed";
  title: string;
  detail?: string;
  logo?: ReactNode;
  count?: number;
}

export interface AfMissionControlProps {
  /** 智能体及子智能体编队树。 */
  agents?: MissionAgent[];
  /** 自上次查看以来的活动事件曲线锚点。 */
  events?: MissionEvent[];
  /** 上次查看时间戳（epoch ms）。 */
  since?: number;
  /** 当前时钟时间戳（epoch ms）。 */
  now?: number;
  /** 受控筛选状态（同步作用于曲线、编队与收件箱）。 */
  filter?: MissionFilter;
  /** 非受控初始筛选状态。 */
  defaultFilter?: MissionFilter;
  /** 切换筛选回调。 */
  onFilterChange?: (filter: MissionFilter) => void;
  /** 批准等待智能体回调。 */
  onApprove?: (agent: MissionAgent) => void;
  /** 驳回等待智能体回调。 */
  onReject?: (agent: MissionAgent) => void;
  /** 重试失败智能体回调。 */
  onRetry?: (agent: MissionAgent) => void;
  /** 忽略失败智能体回调（归入已完成）。 */
  onDismiss?: (agent: MissionAgent) => void;
  /** 顶部主标题。 */
  title?: string;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfMissionControlPatternProps = AfMissionControlProps;

const DEMO_NOW = 1_763_165_040_000;
const DEMO_SINCE = DEMO_NOW - 45 * 60_000;

export const DEFAULT_MISSION_AGENTS: MissionAgent[] = [
  {
    id: "launch",
    name: "Launch lead",
    model: "Opus 5.5",
    status: "running",
    task: "Launch the new pricing page by Friday",
    cost: 1.42,
    elapsed: "26m 09s",
    started: DEMO_NOW - 26 * 60_000,
    tools: ["slack", "notion"],
    children: [
      {
        id: "researcher",
        name: "Researcher",
        model: "Sonnet 5.5",
        status: "done",
        task: "Compare the pricing of five competitors",
        tools: ["notion"],
        cost: 0.18,
        elapsed: "15m 00s",
      },
      {
        id: "writer",
        name: "Writer",
        model: "Sonnet 5.5",
        status: "running",
        task: "Write the copy for the three plans",
        tools: ["figma"],
        cost: 0.21,
        elapsed: "18m 09s",
      },
      {
        id: "deployer",
        name: "Release",
        model: "GPT-6 Sol",
        status: "waiting",
        task: "Merge the checkout fix",
        tools: ["github"],
        ask: "All 212 tests are green – merge to main?",
        cost: 0.34,
        elapsed: "14m 09s",
      },
    ],
  },
  {
    id: "support",
    name: "Support lead",
    model: "Sonnet 5.5",
    status: "running",
    task: "Answer the open tickets in the queue",
    tools: ["hubspot", "slack"],
    cost: 0.84,
    elapsed: "29m 09s",
    started: DEMO_NOW - 29 * 60_000,
    children: [
      {
        id: "billing",
        name: "Billing",
        model: "Sonnet 5.5",
        status: "failed",
        task: "Refund $240 to Acme Corp",
        tools: ["stripe"],
        error: "Stripe declined the refund – the card on file expired",
        cost: 0.18,
        elapsed: "12m 00s",
      },
    ],
  },
  {
    id: "ops",
    name: "Ops",
    model: "Gemini 3.8 Flash",
    status: "waiting",
    task: "Rotate the API keys",
    tools: ["stripe", "github"],
    ask: "Rotate the Stripe keys in production now?",
    cost: 0.05,
    elapsed: "11m 09s",
    started: DEMO_NOW - 11 * 60_000,
  },
];

export const DEFAULT_MISSION_EVENTS: MissionEvent[] = [
  {
    id: "ev-1",
    agent: "launch",
    at: DEMO_SINCE + Math.round(0.11 * 45 * 60_000),
    kind: "done",
    title: "Planned launch tasks",
  },
  {
    id: "ev-2",
    agent: "ops",
    at: DEMO_SINCE + Math.round(0.2 * 45 * 60_000),
    kind: "done",
    title: "Synced CRM accounts",
  },
  {
    id: "ev-3",
    agent: "researcher",
    at: DEMO_SINCE + Math.round(0.48 * 45 * 60_000),
    kind: "done",
    title: "Compared competitor pricing",
  },
  {
    id: "ev-4",
    agent: "support",
    at: DEMO_SINCE + Math.round(0.61 * 45 * 60_000),
    kind: "done",
    title: "Resolved 19 support tickets",
  },
  {
    id: "ev-5",
    agent: "deployer",
    at: DEMO_SINCE + Math.round(0.68 * 45 * 60_000),
    kind: "needs",
    title: "Merge the checkout fix",
  },
  {
    id: "ev-6",
    agent: "billing",
    at: DEMO_SINCE + Math.round(0.73 * 45 * 60_000),
    kind: "failed",
    title: "Refund $240 to Acme Corp",
  },
  {
    id: "ev-7",
    agent: "ops",
    at: DEMO_SINCE + Math.round(0.78 * 45 * 60_000),
    kind: "needs",
    title: "Rotate the API keys",
  },
];

/** 构建平滑三次贝塞尔山峰曲线（供 MissionControl 与 MissionTimeline 共享）。 */
export function buildSmoothMountainCurve(width = 720, height = 102) {
  const anchors: [number, number][] = [
    [0.0, 0.02],
    [0.06, 0.03],
    [0.115, 0.62],
    [0.16, 0.09],
    [0.2, 0.42],
    [0.26, 0.03],
    [0.43, 0.03],
    [0.485, 0.96],
    [0.545, 0.04],
    [0.61, 0.4],
    [0.65, 0.22],
    [0.68, 0.45],
    [0.73, 0.28],
    [0.78, 0.47],
    [0.85, 0.03],
    [1.0, 0.02],
  ];
  const pts = anchors.map(([rx, ry]) => ({
    x: rx * width,
    y: height - 5 - ry * (height - 11),
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const sampleYAtRatio = (r: number) => {
    const clamped = Math.max(0, Math.min(1, r));
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const [x0, y0] = anchors[i];
      const [x1, y1] = anchors[i + 1];
      if (clamped >= x0 && clamped <= x1) {
        const t = (clamped - x0) / Math.max(0.0001, x1 - x0);
        const smoothT = t * t * (3 - 2 * t);
        const yNorm = y0 + (y1 - y0) * smoothT;
        return height - 5 - yNorm * (height - 11);
      }
    }
    return height - 7;
  };
  const area = `${d} L ${width} ${height - 4} L 0 ${height - 4} Z`;
  return { line: d, area, sampleYAtRatio };
}

function flattenAgents(list: MissionAgent[]): MissionAgent[] {
  const out: MissionAgent[] = [];
  for (const ag of list) {
    out.push(ag);
    if (ag.children) out.push(...flattenAgents(ag.children));
  }
  return out;
}

function matchesMissionFilter(status: MissionStatus, filter: MissionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "running") return status === "running";
  if (filter === "waiting") return status === "waiting" || status === "failed";
  if (filter === "failed") return status === "failed";
  return true;
}

function sumBranchCost(lead: MissionAgent): number {
  return (lead.cost ?? 0) + (lead.children ?? []).reduce((s, c) => s + (c.cost ?? 0), 0);
}

/**
 * 智能体总控台（Pro Agent Block）：顶部回溯活动曲线 + 中部双列编队连接树 + 右侧待批收件箱。
 */
export function AfMissionControl({
  agents: agentsProp = DEFAULT_MISSION_AGENTS,
  events: eventsProp = DEFAULT_MISSION_EVENTS,
  since = DEMO_SINCE,
  now = DEMO_NOW,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  onApprove,
  onReject,
  onRetry,
  onDismiss,
  title = "Mission control",
  className,
}: AfMissionControlProps = {}) {
  const [filter, setFilter] = useControllableState<MissionFilter>({
    value: filterProp,
    defaultValue: defaultFilter,
    onChange: onFilterChange,
  });

  const [statusOverrides, setStatusOverrides] = useState<Record<string, MissionStatus>>({});
  const [focusedLeadId, setFocusedLeadId] = useState<string>("launch");
  const [openInboxId, setOpenInboxId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  const hydratedLeads = useMemo(() => {
    const apply = (item: MissionAgent): MissionAgent => ({
      ...item,
      status: statusOverrides[item.id] ?? item.status,
      children: item.children?.map(apply),
    });
    return agentsProp.map(apply);
  }, [agentsProp, statusOverrides]);

  const allFlat = useMemo(() => flattenAgents(hydratedLeads), [hydratedLeads]);

  const counts = useMemo(() => {
    const running = allFlat.filter((a) => a.status === "running").length;
    const waitingOnly = allFlat.filter((a) => a.status === "waiting").length;
    const waitingOrFailed = allFlat.filter(
      (a) => a.status === "waiting" || a.status === "failed",
    ).length;
    const failed = allFlat.filter((a) => a.status === "failed").length;
    const doneEvents = eventsProp.filter((e) => e.kind === "done").length;
    const done = Math.max(doneEvents, allFlat.filter((a) => a.status === "done").length);
    const totalCost = allFlat.reduce((s, a) => s + (a.cost ?? 0), 0);
    const subCount = hydratedLeads.reduce((s, l) => s + (l.children?.length ?? 0), 0);
    return {
      all: allFlat.length,
      leads: hydratedLeads.length,
      subs: subCount,
      running,
      waitingOnly,
      waiting: waitingOrFailed,
      failed,
      done,
      totalCost,
    };
  }, [allFlat, eventsProp, hydratedLeads]);

  const parentLeadMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const lead of hydratedLeads) {
      map[lead.id] = lead.id;
      for (const ch of lead.children ?? []) {
        map[ch.id] = lead.id;
      }
    }
    return map;
  }, [hydratedLeads]);

  const inboxItems = useMemo(
    () =>
      allFlat.filter((ag) => {
        if (ag.status !== "waiting" && ag.status !== "failed") return false;
        return matchesMissionFilter(ag.status, filter);
      }),
    [allFlat, filter],
  );

  const visibleLeads = useMemo(() => {
    return hydratedLeads
      .map((lead): MissionAgent | null => {
        const filteredChildren = (lead.children ?? []).filter((ch) =>
          matchesMissionFilter(ch.status, filter),
        );
        const selfMatch = matchesMissionFilter(lead.status, filter);
        if (!selfMatch && filteredChildren.length === 0) return null;
        return {
          ...lead,
          children: filter === "all" ? lead.children : filteredChildren,
        };
      })
      .filter((item): item is MissionAgent => item !== null);
  }, [hydratedLeads, filter]);

  const activeLead =
    visibleLeads.find((l) => l.id === focusedLeadId) ?? visibleLeads[0] ?? null;
  const activeChildren = activeLead?.children ?? [];

  const visibleEvents = useMemo(() => {
    return eventsProp.filter((ev) => {
      if (filter === "all") return true;
      const ag = allFlat.find((a) => a.id === ev.agent);
      if (ag) return matchesMissionFilter(ag.status, filter);
      if (filter === "failed") return ev.kind === "failed";
      if (filter === "waiting") return ev.kind === "needs" || ev.kind === "failed";
      return ev.kind === "done";
    });
  }, [eventsProp, filter, allFlat]);

  const updateAgentStatus = (
    agent: MissionAgent,
    nextStatus: MissionStatus,
    cb?: (a: MissionAgent) => void,
  ) => {
    setStatusOverrides((prev) => ({ ...prev, [agent.id]: nextStatus }));
    cb?.({ ...agent, status: nextStatus });
  };

  const filterOpts: { id: MissionFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "running", label: "Running", count: counts.running },
    { id: "waiting", label: "Needs you", count: counts.waiting },
    { id: "failed", label: "Failed", count: counts.failed },
  ];

  const handleFilterKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % filterOpts.length;
    else if (e.key === "ArrowLeft")
      next = (idx - 1 + filterOpts.length) % filterOpts.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = filterOpts.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setFilter(filterOpts[next].id);
    }
  };

  const spanMs = Math.max(60_000, now - since);
  const spanMins = Math.max(1, Math.round(spanMs / 60_000));
  const curveW = 720;
  const curveH = 102;
  const { line: curveLine, area: curveArea, sampleYAtRatio } = useMemo(
    () => buildSmoothMountainCurve(curveW, curveH),
    [],
  );

  const renderMissionStatusIcon = (st: MissionStatus) => {
    if (st === "running") {
      return (
        <svg className="af-pj-msn__status-spin" width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
          <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (st === "done") {
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m3.5 8.5 3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.65" />
        <path d="M8 5v3.4M8 10.9h.01" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  };

  const activeLeadFromHover = hoveredAgentId ? parentLeadMap[hoveredAgentId] : null;

  return (
    <section className={cn("af-pj-msn", className)} aria-label={title}>
      <header className="af-pj-msn__top">
        <h2 className="af-pj-msn__title">{title}</h2>

        <div
          className="af-pj-msn__filters"
          role="radiogroup"
          aria-label="Show agents"
        >
          {filterOpts.map((opt, idx) => {
            const checked = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={checked}
                className="af-pj-msn__filter"
                data-active={checked ? "" : undefined}
                onClick={() => setFilter(opt.id)}
                onKeyDown={(e) => handleFilterKeyDown(e, idx)}
              >
                <span>{opt.label}</span>
                <span className="af-pj-msn__filter-count">{opt.count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <section className="af-pj-msn__recap" role="region" aria-label="Since you looked">
        <div className="af-pj-msn__recap-head">
          <div className="af-pj-msn__recap-left">
            <strong>Since you looked</strong>
            <span className="af-pj-msn__recap-sub">Since 23:19</span>
            <span className="af-pj-msn__recap-pill">{spanMins}m</span>
          </div>
          <div className="af-pj-msn__recap-stats">
            <span data-tone="done">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
                <path d="m5.4 8.1 1.8 1.8 3.5-3.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <b>{counts.done}</b> done
            </span>
            <span data-tone="waiting">
              <AfIcon name="user" size={11} /> <b>{counts.waitingOnly}</b> need you
            </span>
            <span data-tone="failed">
              <AfIcon name="alert" size={11} /> <b>{counts.failed}</b> failed
            </span>
          </div>
        </div>

        <div className="af-pj-msn__curve-wrap">
          <svg
            className="af-pj-msn__curve"
            viewBox={`0 0 ${curveW} ${curveH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="af-msn-curve-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--af-ink)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--af-ink)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1={curveH * 0.34}
              x2={curveW}
              y2={curveH * 0.34}
              stroke="var(--af-line)"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1={curveH * 0.67}
              x2={curveW}
              y2={curveH * 0.67}
              stroke="var(--af-line)"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1={curveH - 4}
              x2={curveW}
              y2={curveH - 4}
              stroke="var(--af-line)"
              vectorEffect="non-scaling-stroke"
            />
            <path d={curveArea} fill="url(#af-msn-curve-fill)" />
            <path
              d={curveLine}
              fill="none"
              stroke="color-mix(in srgb, var(--af-ink) 44%, transparent)"
              strokeWidth={1.45}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="af-pj-msn__dots">
            {visibleEvents.map((ev) => {
              const ratio = Math.max(0.06, Math.min(0.94, (ev.at - since) / spanMs));
              const yPx = sampleYAtRatio(ratio);
              const topPct = (yPx / curveH) * 100;
              return (
                <button
                  key={ev.id}
                  type="button"
                  className="af-pj-msn__dot"
                  data-kind={ev.kind}
                  style={{
                    left: `${(ratio * 100).toFixed(1)}%`,
                    top: `${topPct.toFixed(1)}%`,
                  }}
                  aria-label={`${ev.title} (${ev.kind})`}
                  title={ev.title}
                  onMouseEnter={() => {
                    setHoveredAgentId(ev.agent);
                    const pLead = parentLeadMap[ev.agent];
                    if (pLead) setFocusedLeadId(pLead);
                  }}
                  onMouseLeave={() => setHoveredAgentId(null)}
                  onFocus={() => setHoveredAgentId(ev.agent)}
                  onBlur={() => setHoveredAgentId(null)}
                />
              );
            })}
          </div>

          <div className="af-pj-msn__axis" aria-hidden="true">
            <span>23:19</span>
            <span>0:04</span>
          </div>
        </div>
      </section>

      <div className="af-pj-msn__split">
        <section className="af-pj-msn__fleet" aria-label="Agents">
          <header className="af-pj-msn__card-head">
            <div className="af-pj-msn__card-title">
              <AfIcon name="sparkle" size={13} />
              <strong>Agents</strong>
            </div>
            <div className="af-pj-msn__fleet-stats">
              <span>
                {counts.leads} agents / {counts.subs} sub-agents
              </span>
              <span className="af-pj-msn__stat-blue">{counts.running} running</span>
              <span className="af-pj-msn__stat-amber">
                {counts.waitingOnly} needs you
              </span>
              <strong className="af-pj-msn__cost">
                ${counts.totalCost.toFixed(2)}
              </strong>
            </div>
          </header>

          <div className="af-pj-msn__tree">
            <div className="af-pj-msn__parents">
              {visibleLeads.map((lead) => {
                const isSelected = activeLead?.id === lead.id;
                const hoverDim =
                  activeLeadFromHover !== null && activeLeadFromHover !== lead.id;
                const childWaiting = (lead.children ?? []).filter(
                  (c) => c.status === "waiting",
                ).length;
                const childFailed = (lead.children ?? []).filter(
                  (c) => c.status === "failed",
                ).length;
                const branchCost = sumBranchCost(lead);

                return (
                  <button
                    key={lead.id}
                    type="button"
                    className="af-pj-msn__node"
                    data-selected={isSelected ? "" : undefined}
                    data-inactive={!isSelected ? "" : undefined}
                    data-dim={hoverDim ? "" : undefined}
                    onClick={() => setFocusedLeadId(lead.id)}
                  >
                    <div className="af-pj-msn__node-top">
                      <span className="af-pj-msn__node-mark">
                        <ModelVendorMark model={lead.model} size={14} />
                      </span>
                      <div className="af-pj-msn__node-who">
                        <strong>{lead.name}</strong>
                        {lead.model && (
                          <span className="af-pj-msn__model">{lead.model}</span>
                        )}
                      </div>
                      <span className="af-pj-msn__status" data-status={lead.status}>
                        {renderMissionStatusIcon(lead.status)}
                        {lead.status === "running"
                          ? "Running"
                          : lead.status === "waiting"
                            ? "Needs you"
                            : lead.status === "failed"
                              ? "Failed"
                              : "Done"}
                      </span>
                    </div>

                    <div className="af-pj-msn__task-row">
                      {lead.tools && lead.tools.length > 0 && (
                        <span className="af-pj-msn__task-apps" aria-hidden="true">
                          {lead.tools.slice(0, 2).map((appId) => (
                            <BrandAppTile key={appId} id={appId} name={appId} size={14} />
                          ))}
                        </span>
                      )}
                      <p className="af-pj-msn__task">{lead.task}</p>
                    </div>

                    <div className="af-pj-msn__node-foot">
                      <span
                        className="af-pj-msn__sub-hint"
                        data-tone={
                          childFailed > 0
                            ? "failed"
                            : childWaiting > 0
                              ? "waiting"
                              : undefined
                        }
                      >
                        {(childFailed > 0 || childWaiting > 0) && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <circle cx="8" cy="8" r="5.8" />
                            <path d="M8 5v3.2M8 10.8h.01" strokeLinecap="round" />
                          </svg>
                        )}
                        {childFailed > 0
                          ? `${childFailed} failed`
                          : childWaiting > 0
                            ? `${childWaiting} needs you`
                            : (lead.children?.length ?? 0) === 0
                              ? "No sub-agents"
                              : `${lead.children?.length} sub-agents`}
                      </span>
                      <span className="af-pj-msn__node-cost">
                        <b>${branchCost.toFixed(2)}</b>
                        {lead.elapsed ? ` · ${lead.elapsed}` : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeChildren.length > 0 && (
              <>
                <div className="af-pj-msn__wires" aria-hidden="true">
                  <svg viewBox="0 0 44 300" preserveAspectRatio="none">
                    <path
                      d="M 6 52 H 19 Q 23 52 23 56 V 244 Q 23 248 27 248 H 44 M 23 52 H 44 M 23 150 H 44"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.6"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="af-pj-msn__wire-port" />
                </div>

                <div className="af-pj-msn__subs">
                  {activeChildren.map((ch) => {
                    const childDim =
                      hoveredAgentId !== null &&
                      hoveredAgentId !== ch.id &&
                      hoveredAgentId !== activeLead?.id;

                    return (
                      <div
                        key={ch.id}
                        className="af-pj-msn__node af-pj-msn__node--sub"
                        data-dim={childDim ? "" : undefined}
                      >
                        <div className="af-pj-msn__node-top">
                          <span className="af-pj-msn__node-mark">
                            <ModelVendorMark model={ch.model} size={14} />
                          </span>
                          <div className="af-pj-msn__node-who">
                            <strong>{ch.name}</strong>
                            {ch.model && (
                              <span className="af-pj-msn__model">{ch.model}</span>
                            )}
                          </div>
                          <span className="af-pj-msn__status" data-status={ch.status}>
                            {renderMissionStatusIcon(ch.status)}
                            {ch.status === "done"
                              ? "Done"
                              : ch.status === "running"
                                ? "Running"
                                : ch.status === "waiting"
                                  ? "Needs you"
                                  : "Failed"}
                          </span>
                        </div>

                        <div className="af-pj-msn__task-row">
                          {ch.tools && ch.tools.length > 0 && (
                            <span className="af-pj-msn__task-apps" aria-hidden="true">
                              {ch.tools.slice(0, 2).map((appId) => (
                                <BrandAppTile key={appId} id={appId} name={appId} size={14} />
                              ))}
                            </span>
                          )}
                          <p className="af-pj-msn__task">{ch.task}</p>
                        </div>

                        <div className="af-pj-msn__node-foot">
                          <span className="af-pj-msn__node-cost">
                            <b>${(ch.cost ?? 0).toFixed(2)}</b>
                            {ch.elapsed ? ` · ${ch.elapsed}` : ""}
                          </span>
                          {ch.status === "waiting" && (
                            <button
                              type="button"
                              className="af-pj-msn__answer-btn"
                              onClick={() => setOpenInboxId(ch.id)}
                            >
                              Answer
                            </button>
                          )}
                          {ch.status === "failed" && (
                            <button
                              type="button"
                              className="af-pj-msn__answer-btn"
                              onClick={() => updateAgentStatus(ch, "running", onRetry)}
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="af-pj-msn__inbox" aria-label="Needs you">
          <header className="af-pj-msn__inbox-head">
            <span className="af-pj-msn__inbox-spark" aria-hidden="true">
              <AfIcon name="sparkle" size={11} />
            </span>
            <span>NEEDS YOU</span>
            <span className="af-pj-msn__inbox-count">{inboxItems.length}</span>
          </header>

          {inboxItems.length === 0 ? (
            <div className="af-pj-msn__inbox-empty">
              <AfIcon name="check" size={15} />
              <span>All clear — no agents waiting on you.</span>
            </div>
          ) : (
            <div className="af-pj-msn__inbox-list">
              {inboxItems.map((item) => {
                const isOpen = openInboxId === item.id;
                const dimmed =
                  hoveredAgentId !== null && hoveredAgentId !== item.id;
                const waitLabel =
                  item.id === "deployer"
                    ? "14m 00s"
                    : item.id === "ops"
                      ? "11m 00s"
                      : item.elapsed ?? "10m 00s";

                return (
                  <div
                    key={item.id}
                    className="af-pj-msn__inbox-card"
                    data-open={isOpen ? "" : undefined}
                    data-dim={dimmed ? "" : undefined}
                  >
                    <button
                      type="button"
                      className="af-pj-msn__inbox-btn"
                      aria-expanded={isOpen}
                      onClick={() => setOpenInboxId(isOpen ? null : item.id)}
                    >
                      <div className="af-pj-msn__inbox-top">
                        <span className="af-pj-msn__inbox-mark" aria-hidden="true">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M8 1.8c.5 3.6 2.6 5.7 6.2 6.2-3.6.5-5.7 2.6-6.2 6.2-.5-3.6-2.6-5.7-6.2-6.2 3.6-.5 5.7-2.6 6.2-6.2Z"
                              fill={item.status === "failed" ? "#ef4444" : "#f59e0b"}
                            />
                          </svg>
                        </span>
                        <strong>{item.task}</strong>
                      </div>
                      <p className="af-pj-msn__inbox-detail">
                        {item.status === "failed"
                          ? item.error ?? "Run failed"
                          : item.ask ?? "Waiting for your confirmation."}
                      </p>
                      <div
                        className="af-pj-msn__inbox-foot"
                        data-status={item.status}
                      >
                        {item.status === "failed" ? (
                          <span className="af-pj-msn__inbox-foot-row">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <circle cx="8" cy="8" r="6.5" fill="#ef4444" />
                              <path d="M8 4.8v3.6M8 11.1h.01" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="af-pj-msn__inbox-foot-row">
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M8 2.4 14.2 13H1.8L8 2.4Z" fill="#f59e0b" />
                            </svg>
                            <span>Waiting for you · {waitLabel}</span>
                          </span>
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="af-pj-msn__inbox-actions">
                        {item.status === "waiting" ? (
                          <>
                            <button
                              type="button"
                              className="af-pj-msn__act"
                              onClick={() =>
                                updateAgentStatus(item, "done", onReject)
                              }
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="af-pj-msn__act af-pj-msn__act--primary"
                              onClick={() =>
                                updateAgentStatus(item, "running", onApprove)
                              }
                            >
                              Approve
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="af-pj-msn__act af-pj-msn__act--primary"
                              onClick={() =>
                                updateAgentStatus(item, "running", onRetry)
                              }
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              className="af-pj-msn__act"
                              onClick={() =>
                                updateAgentStatus(item, "done", onDismiss)
                              }
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

/** `AfMissionControl` 兼容模式别名。 */
export const AfMissionControlPattern = AfMissionControl;
export const MissionControl = AfMissionControl;
