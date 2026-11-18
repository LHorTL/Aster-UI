import { useMemo, useState, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { BrandAppTile, ModelVendorMark } from "../_shared/project";
import {
  DEFAULT_MISSION_EVENTS,
  buildSmoothMountainCurve,
  type MissionAgent,
  type MissionEvent,
  type MissionFilter,
  type MissionStatus,
} from "./MissionControl";

export interface MissionLaneTask {
  id: string;
  title: string;
  status: MissionStatus;
  start: number;
  end?: number;
  tools?: string[];
}

export interface MissionTimelineAgent extends Omit<MissionAgent, "children"> {
  tasks?: MissionLaneTask[];
  children?: MissionTimelineAgent[];
}

export interface AfMissionTimelineProps {
  /** 智能体及其泳道时间片任务。 */
  agents?: MissionTimelineAgent[];
  /** 自上次查看以来的活动曲线事件。 */
  events?: MissionEvent[];
  /** 上次查看时间戳（epoch ms）。 */
  since?: number;
  /** 当前时钟时间戳（epoch ms）。 */
  now?: number;
  /** 泳道向左回溯的时间跨度（ms，默认 30 分钟）。 */
  span?: number;
  /** 受控筛选器。 */
  filter?: MissionFilter;
  /** 非受控初始筛选器。 */
  defaultFilter?: MissionFilter;
  /** 切换筛选回调。 */
  onFilterChange?: (filter: MissionFilter) => void;
  /** 批准等待智能体回调。 */
  onApprove?: (agent: MissionTimelineAgent) => void;
  /** 驳回等待智能体回调。 */
  onReject?: (agent: MissionTimelineAgent) => void;
  /** 重试失败智能体回调。 */
  onRetry?: (agent: MissionTimelineAgent) => void;
  /** 顶部标题。 */
  title?: string;
  /** 根节点附加类名。 */
  className?: string;
}

export type AfMissionTimelinePatternProps = AfMissionTimelineProps;

const DEMO_NOW = 1_763_165_040_000;
const DEMO_SINCE = DEMO_NOW - 45 * 60_000;
const DEFAULT_SPAN = 30 * 60_000;

export const DEFAULT_TIMELINE_AGENTS: MissionTimelineAgent[] = [
  {
    id: "launch",
    name: "Launch lead",
    model: "Opus 5.5",
    status: "running",
    task: "Coordinate the team",
    tasks: [
      {
        id: "t-plan",
        title: "Plan the launch",
        status: "done",
        tools: ["notion"],
        start: DEMO_NOW - 26 * 60_000,
        end: DEMO_NOW - 19 * 60_000,
      },
      {
        id: "t-coord",
        title: "Coordinate the team",
        status: "running",
        tools: ["slack"],
        start: DEMO_NOW - 18 * 60_000,
      },
    ],
    children: [
      {
        id: "researcher",
        name: "Researcher",
        model: "Sonnet 5.5",
        status: "done",
        task: "Competitor pricing",
        tasks: [
          {
            id: "t-comp",
            title: "Competitor pricing",
            status: "done",
            tools: ["notion"],
            start: DEMO_NOW - 24 * 60_000,
            end: DEMO_NOW - 14 * 60_000,
          },
        ],
      },
      {
        id: "writer",
        name: "Writer",
        model: "Sonnet 5.5",
        status: "running",
        task: "Draft plan copy",
        tasks: [
          {
            id: "t-copy",
            title: "Draft plan copy",
            status: "running",
            tools: ["figma", "notion"],
            start: DEMO_NOW - 18 * 60_000,
          },
        ],
      },
      {
        id: "deployer",
        name: "Release",
        model: "GPT-6 Sol",
        status: "waiting",
        task: "Merge the checkout fix",
        ask: "All 212 tests are green – merge to main?",
        tasks: [
          {
            id: "t-merge",
            title: "Merge the checkout fix",
            status: "waiting",
            tools: ["gear"],
            start: DEMO_NOW - 13.8 * 60_000,
          },
        ],
      },
    ],
  },
  {
    id: "support",
    name: "Support lead",
    model: "Sonnet 5.5",
    status: "running",
    task: "Answer 38 tickets",
    tasks: [
      {
        id: "t-queue",
        title: "Answer 38 tickets",
        status: "running",
        tools: ["hubspot"],
        start: DEMO_NOW - 24.5 * 60_000,
      },
    ],
    children: [
      {
        id: "billing",
        name: "Billing",
        model: "Sonnet 5.5",
        status: "failed",
        task: "Refund $240 to Acme Corp",
        error: "Stripe declined the refund – the card on file expired",
        tasks: [
          {
            id: "t-refund",
            title: "Refund…",
            status: "failed",
            tools: ["stripe"],
            start: DEMO_NOW - 20 * 60_000,
            end: DEMO_NOW - 15 * 60_000,
          },
        ],
      },
    ],
  },
  {
    id: "ops",
    name: "Ops",
    model: "Gemini 3.8 Flash",
    status: "waiting",
    task: "Rotate the API keys",
    ask: "Rotate the Stripe keys in production now?",
    tasks: [
      {
        id: "t-sync",
        title: "Sync CRM",
        status: "done",
        tools: ["hubspot"],
        start: DEMO_NOW - 24.5 * 60_000,
        end: DEMO_NOW - 18.8 * 60_000,
      },
      {
        id: "t-rot",
        title: "Rotate API keys",
        status: "waiting",
        tools: ["stripe", "github"],
        start: DEMO_NOW - 12.8 * 60_000,
      },
    ],
  },
];

interface FlatLaneRow {
  agent: MissionTimelineAgent;
  depth: number;
}

function flattenLaneRows(
  list: MissionTimelineAgent[],
  depth = 0,
): FlatLaneRow[] {
  const out: FlatLaneRow[] = [];
  for (const ag of list) {
    out.push({ agent: ag, depth });
    if (ag.children) {
      out.push(...flattenLaneRows(ag.children, depth + 1));
    }
  }
  return out;
}

function matchesFilter(status: MissionStatus, filter: MissionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "running") return status === "running";
  if (filter === "waiting") return status === "waiting" || status === "failed";
  if (filter === "failed") return status === "failed";
  return true;
}

/**
 * 统一时钟多泳道总览（Pro Agent Block）：回溯活动曲线 + 30 分钟多智能体甘特泳道 + 右侧待批收件箱。
 */
export function AfMissionTimeline({
  agents: agentsProp = DEFAULT_TIMELINE_AGENTS,
  events: eventsProp = DEFAULT_MISSION_EVENTS,
  since = DEMO_SINCE,
  now = DEMO_NOW,
  span = DEFAULT_SPAN,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  onApprove,
  onReject,
  onRetry,
  title = "Mission timeline",
  className,
}: AfMissionTimelineProps = {}) {
  const [filter, setFilter] = useControllableState<MissionFilter>({
    value: filterProp,
    defaultValue: defaultFilter,
    onChange: onFilterChange,
  });

  const [statusOverrides, setStatusOverrides] = useState<Record<string, MissionStatus>>({});
  const [openInboxId, setOpenInboxId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  const hydratedTree = useMemo(() => {
    const apply = (ag: MissionTimelineAgent): MissionTimelineAgent => {
      const nextSt = statusOverrides[ag.id] ?? ag.status;
      return {
        ...ag,
        status: nextSt,
        tasks: ag.tasks?.map((t, idx, arr) =>
          idx === arr.length - 1 ? { ...t, status: nextSt } : t,
        ),
        children: ag.children?.map(apply),
      };
    };
    return agentsProp.map(apply);
  }, [agentsProp, statusOverrides]);

  const allRows = useMemo(() => flattenLaneRows(hydratedTree), [hydratedTree]);
  const allAgents = useMemo(() => allRows.map((r) => r.agent), [allRows]);

  const counts = useMemo(() => {
    const running = allAgents.filter((a) => a.status === "running").length;
    const waitingOnly = allAgents.filter((a) => a.status === "waiting").length;
    const waiting = allAgents.filter(
      (a) => a.status === "waiting" || a.status === "failed",
    ).length;
    const failed = allAgents.filter((a) => a.status === "failed").length;
    const doneEvents = eventsProp.filter((e) => e.kind === "done").length;
    const done = Math.max(doneEvents, allAgents.filter((a) => a.status === "done").length);
    return { all: allAgents.length, running, waitingOnly, waiting, failed, done };
  }, [allAgents, eventsProp]);

  const visibleRows = useMemo(
    () => allRows.filter((row) => matchesFilter(row.agent.status, filter)),
    [allRows, filter],
  );

  const inboxItems = useMemo(
    () =>
      allAgents.filter(
        (ag) =>
          (ag.status === "waiting" || ag.status === "failed") &&
          matchesFilter(ag.status, filter),
      ),
    [allAgents, filter],
  );

  const visibleEvents = useMemo(
    () =>
      eventsProp.filter((ev) => {
        if (filter === "all") return true;
        const found = allAgents.find((a) => a.id === ev.agent);
        if (found) return matchesFilter(found.status, filter);
        if (filter === "failed") return ev.kind === "failed";
        if (filter === "waiting") return ev.kind === "needs" || ev.kind === "failed";
        return ev.kind === "done";
      }),
    [eventsProp, filter, allAgents],
  );

  const updateStatus = (
    agent: MissionTimelineAgent,
    next: MissionStatus,
    cb?: (a: MissionTimelineAgent) => void,
  ) => {
    setStatusOverrides((prev) => ({ ...prev, [agent.id]: next }));
    cb?.({ ...agent, status: next });
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

  const recapSpan = Math.max(60_000, now - since);
  const recapMins = Math.max(1, Math.round(recapSpan / 60_000));
  const laneStart = now - Math.max(60_000, span);
  const spanMin = Math.round(span / 60_000);

  const curveW = 720;
  const curveH = 102;
  const { line: curveLine, area: curveArea, sampleYAtRatio } = useMemo(
    () => buildSmoothMountainCurve(curveW, curveH),
    [],
  );

  return (
    <section className={cn("af-pj-mtl", className)} aria-label={title}>
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
            <span className="af-pj-msn__recap-pill">{recapMins}m</span>
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
              <linearGradient id="af-mtl-curve-fill" x1="0" y1="0" x2="0" y2="1">
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
            <path d={curveArea} fill="url(#af-mtl-curve-fill)" />
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
              const ratio = Math.max(
                0.06,
                Math.min(0.94, (ev.at - since) / recapSpan),
              );
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
                  onMouseEnter={() => setHoveredAgentId(ev.agent)}
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
        <section className="af-pj-mtl__lanes" aria-label="Agent timeline lanes">
          <header className="af-pj-msn__card-head">
            <div className="af-pj-msn__card-title">
              <AfIcon name="sparkle" size={13} />
              <strong>Agents</strong>
              <span className="af-pj-msn__meta">
                <span className="af-pj-mtl__dot af-pj-mtl__dot--blue" aria-hidden="true" />
                {counts.running} running
                <span className="af-pj-mtl__dot af-pj-mtl__dot--amber" aria-hidden="true" />
                <span>{counts.waitingOnly} need you</span>
              </span>
            </div>
            <span className="af-pj-mtl__span-tag">Last {spanMin}m</span>
          </header>

          <div className="af-pj-mtl__axis-row" aria-hidden="true">
            <span className="af-pj-mtl__name-col" />
            <div className="af-pj-mtl__ticks">
              <span style={{ left: "16.67%" }}>−25m</span>
              <span style={{ left: "33.33%" }}>−20m</span>
              <span style={{ left: "50%" }}>−15m</span>
              <span style={{ left: "66.67%" }}>−10m</span>
              <span style={{ left: "83.33%" }}>−5m</span>
              <span className="af-pj-mtl__now-pill">now</span>
            </div>
          </div>

          <div className="af-pj-mtl__rows">
            {visibleRows.map(({ agent }) => {
              const dimmed =
                hoveredAgentId !== null && hoveredAgentId !== agent.id;
              const laneTasks: MissionLaneTask[] =
                agent.tasks && agent.tasks.length > 0
                  ? agent.tasks
                  : [
                      {
                        id: `${agent.id}-default`,
                        title: agent.task,
                        status: agent.status,
                        start: now - 16 * 60_000,
                      },
                    ];
              const isIdle = agent.status === "done" || agent.status === "failed";

              return (
                <div
                  key={agent.id}
                  className="af-pj-mtl__row"
                  data-dim={dimmed ? "" : undefined}
                >
                  <div className="af-pj-mtl__who">
                    <span className="af-pj-mtl__who-icon">
                      <ModelVendorMark model={agent.model} size={13} />
                    </span>
                    <div className="af-pj-mtl__who-meta">
                      <div className="af-pj-mtl__who-top">
                        <span className="af-pj-mtl__who-name">{agent.name}</span>
                        {agent.status === "waiting" && (
                          <span className="af-pj-mtl__who-badge" data-tone="waiting">
                            Needs you
                          </span>
                        )}
                        {isIdle && (
                          <span className="af-pj-mtl__who-badge" data-tone="idle">
                            Idle
                          </span>
                        )}
                      </div>
                      {agent.model && (
                        <span className="af-pj-mtl__who-model">{agent.model}</span>
                      )}
                    </div>
                  </div>

                  <div className="af-pj-mtl__track">
                    <span className="af-pj-mtl__grid" style={{ left: "16.67%" }} aria-hidden="true" />
                    <span className="af-pj-mtl__grid" style={{ left: "33.33%" }} aria-hidden="true" />
                    <span className="af-pj-mtl__grid" style={{ left: "50%" }} aria-hidden="true" />
                    <span className="af-pj-mtl__grid" style={{ left: "66.67%" }} aria-hidden="true" />
                    <span className="af-pj-mtl__grid" style={{ left: "83.33%" }} aria-hidden="true" />
                    {laneTasks.map((t) => {
                      const s = Math.max(laneStart, t.start);
                      const e = Math.min(now, t.end ?? now);
                      const leftPct = Math.max(0, ((s - laneStart) / span) * 100);
                      const widthPct = Math.max(
                        16,
                        Math.min(100 - leftPct, ((e - s) / span) * 100),
                      );
                      const actionable =
                        t.status === "waiting" || t.status === "failed";

                      return (
                        <button
                          key={t.id}
                          type="button"
                          className="af-pj-mtl__bar"
                          data-status={t.status}
                          style={{
                            left: `${leftPct.toFixed(1)}%`,
                            width: `${widthPct.toFixed(1)}%`,
                          }}
                          aria-label={`${agent.name}: ${t.title} (${t.status})`}
                          onClick={() => {
                            if (actionable) setOpenInboxId(agent.id);
                          }}
                        >
                          {t.tools && t.tools.length > 0 && (
                            <span className="af-pj-mtl__bar-apps" aria-hidden="true">
                              {t.tools.map((appId) =>
                                appId === "stripe" ? (
                                  <svg
                                    key={appId}
                                    width="13"
                                    height="13"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    style={{ display: "block", flexShrink: 0 }}
                                  >
                                    <rect x="1" y="1" width="14" height="14" rx="3.4" fill="#635BFF" />
                                    <path
                                      d="M7.8 6.05c0-.46.38-.66 1.02-.66.88 0 1.98.27 2.86.74V4.06a7.4 7.4 0 0 0-2.86-.54c-2.34 0-3.9 1.22-3.9 3.24 0 3.16 4.35 2.66 4.35 4.02 0 .54-.47.72-1.13.72-.98 0-2.24-.4-3.22-.94v2.1c1.08.47 2.18.67 3.22.67 2.4 0 4.05-1.18 4.05-3.23-.01-3.41-4.39-2.8-4.39-4.05Z"
                                      fill="#ffffff"
                                    />
                                  </svg>
                                ) : appId === "gear" ? (
                                  <svg
                                    key={appId}
                                    width="12"
                                    height="12"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    style={{ display: "block", flexShrink: 0, color: "var(--af-muted)" }}
                                  >
                                    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                                    <path
                                      d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                    />
                                    <circle cx="8" cy="8" r="4.6" stroke="currentColor" strokeWidth="1.2" />
                                  </svg>
                                ) : (
                                  <BrandAppTile key={appId} id={appId} name={appId} size={13} />
                                ),
                              )}
                            </span>
                          )}
                          <span className="af-pj-mtl__bar-label">{t.title}</span>
                          {t.status === "waiting" && (
                            <span className="af-pj-mtl__bar-needs">▲ Needs you</span>
                          )}
                        </button>
                      );
                    })}
                    <span className="af-pj-mtl__now-line" aria-hidden="true" />
                  </div>
                </div>
              );
            })}
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
              <span>All swimlanes healthy.</span>
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
                      : "10m 00s";

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
                          ? item.error ?? "Task failed"
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
                                updateStatus(item, "done", onReject)
                              }
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="af-pj-msn__act af-pj-msn__act--primary"
                              onClick={() =>
                                updateStatus(item, "running", onApprove)
                              }
                            >
                              Approve
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="af-pj-msn__act af-pj-msn__act--primary"
                            onClick={() => updateStatus(item, "running", onRetry)}
                          >
                            Retry
                          </button>
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

/** `AfMissionTimeline` 兼容模式别名。 */
export const AfMissionTimelinePattern = AfMissionTimeline;
export const MissionTimeline = AfMissionTimeline;
