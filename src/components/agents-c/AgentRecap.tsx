import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ToolBrandMark, buildSmoothChartPath } from "./_marks";

export type RecapEventKind = "needs" | "failed" | "done";

export interface RecapEvent {
  id: string;
  /** ISO string, Date, or epoch ms (or short clock label like "2:14 AM"). */
  at: Date | string | number;
  kind: RecapEventKind;
  title: string;
  detail?: string;
  logo?: ReactNode;
  tool?: string;
  count?: number;
  action?: string;
  doneLabel?: string;
}

export interface AfAgentRecapProps {
  /** Overnight / away events in any order. */
  events?: RecapEvent[];
  /** Start and end of the away window. */
  since?: Date | string | number;
  until?: Date | string | number;
  /** Main action ("primary") or "review" callback; supports async Promises. */
  onAction?:
    | ((event: RecapEvent, action: "primary" | "review") => void | Promise<void>)
    | ((action: "pr" | "rerun") => void);
  onUndo?: (event: RecapEvent) => void;
  onRedo?: (event: RecapEvent) => void;
  /** Max cards shown per lane (every lane keeps equal height). */
  limit?: number;
  replay?: number;
  title?: ReactNode;
  locale?: string;
  /** Legacy compatibility props. */
  summary?: ReactNode;
  stats?: Array<{ label: string; value: string }>;
  achievements?: string[];
  caveats?: string[];
  className?: string;
  style?: CSSProperties;
}

// Away window: 6:40 PM (18:40) -> 8:10 AM (08:10 next day) = 13h 30m (810 min)
const BASE_START_MS = Date.UTC(2026, 10, 14, 18, 40, 0);
const BASE_END_MS = BASE_START_MS + (13 * 60 + 30) * 60 * 1000;

const DEFAULT_EVENTS: RecapEvent[] = [
  {
    id: "rc-1",
    at: BASE_START_MS + 25 * 60 * 1000, // 7:05 PM
    kind: "done",
    title: "Answered support tickets",
    detail: "first reply in 2 min",
    tool: "Slack",
    count: 38,
    doneLabel: "Done",
  },
  {
    id: "rc-2",
    at: BASE_START_MS + 90 * 60 * 1000, // 8:10 PM
    kind: "done",
    title: "Closed stale pull requests",
    detail: "",
    tool: "GitHub",
    count: 6,
    doneLabel: "Done",
  },
  {
    id: "rc-3",
    at: BASE_START_MS + 230 * 60 * 1000, // 10:30 PM
    kind: "done",
    title: "Triaged new issues",
    detail: "4 marked urgent",
    tool: "Linear",
    count: 17,
    doneLabel: "Done",
  },
  {
    id: "rc-4",
    at: BASE_START_MS + 454 * 60 * 1000, // 2:14 AM
    kind: "needs",
    title: "Refund $240 to Acme Corp",
    detail: "Support agent \u00B7 over the $200 auto-approve limit",
    tool: "Slack",
    action: "Approve",
    doneLabel: "Approved",
  },
  {
    id: "rc-5",
    at: BASE_START_MS + 502 * 60 * 1000, // 3:02 AM
    kind: "failed",
    title: "Contact sync to the CRM",
    detail: "Token expired after 1,284 of 3,900 contacts",
    tool: "Drive",
    action: "Retry",
    doneLabel: "Synced",
  },
  {
    id: "rc-6",
    at: BASE_START_MS + 597 * 60 * 1000, // 4:37 AM
    kind: "needs",
    title: "Merge the checkout fix",
    detail: "All 212 tests green \u00B7 needs a code owner",
    tool: "GitHub",
    action: "Merge",
    doneLabel: "Merged",
  },
];

function RecapKindIcon({ kind }: { kind: RecapEventKind }) {
  if (kind === "needs") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="5.25" r="2.5" />
        <path d="M3.25 13.25c.6-2.35 2.45-3.75 4.75-3.75s4.15 1.4 4.75 3.75" />
      </svg>
    );
  }
  if (kind === "failed") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7.13 2.75a1 1 0 0 1 1.74 0l5.2 9.25a1 1 0 0 1-.87 1.5H2.8a1 1 0 0 1-.87-1.5z" />
        <path d="M8 6.5v2.75M8 11.25v.01" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="5.75" />
      <path d="m5.6 8.2 1.6 1.6 3.2-3.4" />
    </svg>
  );
}

function toEpochMs(v: Date | string | number, fallback: number): number {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) return parsed;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(v.trim());
  if (m) {
    let h = Number(m[1]);
    const mins = Number(m[2]);
    const mer = m[3]?.toUpperCase();
    if (mer === "PM" && h < 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    let deltaMin = (h - 18) * 60 + (mins - 40);
    if (deltaMin < 0) deltaMin += 1440;
    return BASE_START_MS + deltaMin * 60 * 1000;
  }
  return fallback;
}

function formatClock12(ms: number): string {
  const d = new Date(ms);
  const h24 = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const mer = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${mer}`;
}

function formatSpanPill(msSpan: number): string {
  const totalMin = Math.max(1, Math.round(msSpan / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function AfAgentRecap({
  events: propEvents,
  since = BASE_START_MS,
  until = BASE_END_MS,
  onAction,
  onUndo,
  onRedo,
  limit = 3,
  title = "While you were away",
  achievements,
  caveats,
  className,
  style,
}: AfAgentRecapProps = {}) {
  const uid = useId().replace(/:/g, "");
  const chartRef = useRef<HTMLDivElement | null>(null);

  const startMs = toEpochMs(since, BASE_START_MS);
  const endMs = Math.max(startMs + 60_000, toEpochMs(until, BASE_END_MS));
  const spanMs = endMs - startMs;

  const baseEvents = useMemo<RecapEvent[]>(() => {
    if (propEvents && propEvents.length > 0) return propEvents;
    if (
      (achievements && achievements.length > 0) ||
      (caveats && caveats.length > 0)
    ) {
      const list: RecapEvent[] = [];
      (achievements ?? []).forEach((txt, idx) => {
        list.push({
          id: `ach-${idx}`,
          at: startMs + (idx + 1) * 90 * 60_000,
          kind: "done",
          title: txt,
          tool: "GitHub",
        });
      });
      (caveats ?? []).forEach((txt, idx) => {
        list.push({
          id: `cav-${idx}`,
          at: startMs + (idx + 4) * 95 * 60_000,
          kind: "needs",
          title: txt,
          tool: "Linear",
          action: "Approve",
        });
      });
      return list;
    }
    return DEFAULT_EVENTS;
  }, [achievements, caveats, propEvents, startMs]);

  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [undoneIds, setUndoneIds] = useState<Set<string>>(() => new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      baseEvents.map((ev, idx) => {
        const ms = toEpochMs(ev.at, startMs + (idx + 1) * 60 * 60_000);
        const ratio = Math.max(0.02, Math.min(0.98, (ms - startMs) / spanMs));
        return {
          event: ev,
          ms,
          ratio,
          timeLabel:
            typeof ev.at === "string" && /AM|PM/i.test(ev.at)
              ? ev.at
              : formatClock12(ms),
        };
      }),
    [baseEvents, spanMs, startMs],
  );

  const lanes = useMemo(() => {
    const needs = enriched.filter((x) => x.event.kind === "needs");
    const failed = enriched.filter((x) => x.event.kind === "failed");
    const done = enriched.filter((x) => x.event.kind === "done");
    return { needs, failed, done };
  }, [enriched]);

  const summaryCounts = useMemo(() => {
    const pendingNeeds = lanes.needs.filter(
      (x) => !resolvedIds.has(x.event.id),
    ).length;
    const pendingFailed = lanes.failed.filter(
      (x) => !resolvedIds.has(x.event.id),
    ).length;
    const activeDone =
      lanes.done.filter((x) => !undoneIds.has(x.event.id)).length +
      resolvedIds.size;
    return {
      done: activeDone,
      needs: pendingNeeds,
      failed: pendingFailed,
    };
  }, [lanes, resolvedIds, undoneIds]);

  const W = 1000;
  const H = 100;
  const baseY = 95.68;

  const chartData = useMemo(() => {
    const samples = 180;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= samples; i += 1) {
      const u = i / samples;
      let amp = 0;
      for (let e = 0; e < enriched.length; e += 1) {
        const dist = (u - enriched[e].ratio) / 0.0175;
        const c = enriched[e].event.count ?? 1;
        const weight =
          enriched[e].event.kind === "done"
            ? Math.min(0.88, 0.36 + Math.sqrt(c) * 0.088)
            : 0.62;
        amp += weight * Math.exp(-0.5 * dist * dist);
      }
      const norm = Math.min(0.9, amp);
      pts.push({
        x: u * W,
        y: baseY - norm * 84,
      });
    }
    const built = buildSmoothChartPath(pts, baseY);

    const dots = enriched.map((item) => {
      const x = item.ratio * W;
      const idx = Math.round(item.ratio * samples);
      const y = pts[Math.max(0, Math.min(samples, idx))].y;
      return { ...item, x, y };
    });

    return { line: built.line, area: built.area, dots };
  }, [enriched]);

  const vGridCols = useMemo(
    () => Array.from({ length: 14 }, (_, i) => 24.691 + i * 74.074),
    [],
  );

  const hoveredDot = useMemo(
    () =>
      hoveredId
        ? (chartData.dots.find((d) => d.event.id === hoveredId) ?? null)
        : null,
    [chartData.dots, hoveredId],
  );

  const handleChartMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = chartRef.current;
    if (!el || !chartData.dots.length) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let best = chartData.dots[0];
    let bestDist = Infinity;
    for (let i = 0; i < chartData.dots.length; i += 1) {
      const d = Math.abs(chartData.dots[i].ratio - u);
      if (d < bestDist) {
        bestDist = d;
        best = chartData.dots[i];
      }
    }
    if (bestDist < 0.12) setHoveredId(best.event.id);
  };

  const invokePrimary = (ev: RecapEvent) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(ev.id);
      return next;
    });
    if (onAction) {
      (onAction as (e: RecapEvent, a: "primary" | "review") => void)(
        ev,
        "primary",
      );
    }
  };

  const invokeReview = (ev: RecapEvent) => {
    if (onAction) {
      (onAction as (e: RecapEvent, a: "primary" | "review") => void)(
        ev,
        "review",
      );
    }
  };

  const toggleUndoDone = (ev: RecapEvent) => {
    if (resolvedIds.has(ev.id)) {
      setResolvedIds((prev) => {
        const next = new Set(prev);
        next.delete(ev.id);
        return next;
      });
      onUndo?.(ev);
      return;
    }
    setUndoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(ev.id)) {
        next.delete(ev.id);
        onRedo?.(ev);
      } else {
        next.add(ev.id);
        onUndo?.(ev);
      }
      return next;
    });
  };

  return (
    <div className={cn("af-agc-rcp", className)} style={style}>
      <div className="af-agc-rcp__head">
        <div className="af-agc-rcp__head-left">
          <div className="af-agc-rcp__title">{title}</div>
          <div className="af-agc-rcp__window">
            <span>Since {formatClock12(startMs)}</span>
            <span className="af-agc-rcp__span-pill">
              {formatSpanPill(spanMs)}
            </span>
          </div>
        </div>

        <div className="af-agc-rcp__summary" aria-label="Overnight totals">
          <span className="af-agc-rcp__sum-item">
            <RecapKindIcon kind="done" />
            <b className="af-agc-rcp__sum-num">{summaryCounts.done}</b>
            <span>done</span>
          </span>

          <span className="af-agc-rcp__sum-item">
            <RecapKindIcon kind="needs" />
            <b className="af-agc-rcp__sum-num">{summaryCounts.needs}</b>
            <span>{summaryCounts.needs === 1 ? "needs you" : "need you"}</span>
          </span>

          <span className="af-agc-rcp__sum-item">
            <RecapKindIcon kind="failed" />
            <b className="af-agc-rcp__sum-num">{summaryCounts.failed}</b>
            <span>failed</span>
          </span>
        </div>
      </div>

      {/* Framed overnight activity sparkline */}
      <div
        ref={chartRef}
        className="af-agc-rcp__chart"
        onPointerMove={handleChartMove}
        onPointerLeave={() => setHoveredId(null)}
      >
        <svg
          className="af-agc-rcp__svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`rcp-wash-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--af-rcp-wash)" />
              <stop offset="100%" stopColor="var(--af-rcp-wash)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[25, 50, 75].map((y) => (
            <line
              key={`h-${y}`}
              x1="0"
              y1={y}
              x2={W}
              y2={y}
              stroke="var(--af-rcp-grid)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {vGridCols.map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2={H}
              stroke="var(--af-rcp-grid)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={chartData.area} fill={`url(#rcp-wash-${uid})`} />
          <path
            d={chartData.line}
            fill="none"
            stroke="var(--af-rcp-stroke)"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {chartData.dots.map((d) => {
          const isActive = hoveredId === d.event.id;
          return (
            <button
              key={d.event.id}
              type="button"
              className={cn(
                "af-agc-rcp__dot",
                `is-${d.event.kind}`,
                isActive && "is-active",
              )}
              style={{
                left: `${(d.x / W) * 100}%`,
                top: `${(d.y / H) * 100}%`,
              }}
              aria-label={`${d.timeLabel}: ${d.event.title}`}
              onMouseEnter={() => setHoveredId(d.event.id)}
              onFocus={() => setHoveredId(d.event.id)}
              onBlur={() => setHoveredId(null)}
            />
          );
        })}

        {hoveredDot ? (
          <div
            className="af-agc-rcp__tip"
            style={{
              left: `${Math.max(14, Math.min(86, hoveredDot.ratio * 100))}%`,
            }}
          >
            <span className="af-agc-rcp__tip-time">{hoveredDot.timeLabel}</span>
            <span>{hoveredDot.event.title}</span>
          </div>
        ) : null}
      </div>

      <div className="af-agc-rcp__axis" aria-hidden="true">
        <span>{formatClock12(startMs)}</span>
        <span>{formatClock12(endMs)}</span>
      </div>

      {/* 3 Equal-Height Lanes: Needs you / Failed / Done */}
      <div className="af-agc-rcp__lanes">
        {/* Needs you lane */}
        <section className="af-agc-rcp__lane" aria-label="Needs you">
          <div className="af-agc-rcp__lane-head">
            <span className="af-agc-rcp__lane-ico" aria-hidden="true">
              <RecapKindIcon kind="needs" />
            </span>
            <span className="af-agc-rcp__lane-title">Needs you</span>
            <span className="af-agc-rcp__lane-count">{lanes.needs.length}</span>
          </div>

          <div
            className="af-agc-rcp__cards"
            style={{ minHeight: `calc(${limit} * 90px + ${Math.max(0, limit - 1)} * 4px)` }}
          >
            {lanes.needs.slice(0, limit).map(({ event: ev, timeLabel }) => {
              const resolved = resolvedIds.has(ev.id);
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "af-agc-rcp__card",
                    hoveredId === ev.id && "is-highlighted",
                    resolved && "is-resolved",
                  )}
                  onMouseEnter={() => setHoveredId(ev.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="af-agc-rcp__card-top">
                    <span className="af-agc-rcp__tile" aria-hidden="true">
                      {ev.logo ?? (
                        <ToolBrandMark name={ev.tool ?? "Slack"} size={12} />
                      )}
                    </span>
                    <span className="af-agc-rcp__card-title">{ev.title}</span>
                  </div>

                  <div className="af-agc-rcp__card-meta">
                    <span className="af-agc-rcp__card-detail">
                      {ev.detail ?? ""}
                    </span>
                    <time className="af-agc-rcp__time">{timeLabel}</time>
                  </div>

                  <div className="af-agc-rcp__card-foot">
                    <span className="af-agc-rcp__status">
                      {resolved ? (
                        <span className="af-agc-rcp__done-pill">
                          {ev.doneLabel ?? "Approved"}
                        </span>
                      ) : null}
                    </span>
                    <div className="af-agc-rcp__btns">
                      {resolved ? (
                        <button
                          type="button"
                          className="af-agc-rcp__ghost-btn"
                          onClick={() => toggleUndoDone(ev)}
                        >
                          Undo
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="af-agc-rcp__ghost-btn"
                            onClick={() => invokeReview(ev)}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="af-agc-rcp__act-btn"
                            onClick={() => invokePrimary(ev)}
                          >
                            {ev.action ?? "Approve"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Failed lane */}
        <section className="af-agc-rcp__lane" aria-label="Failed">
          <div className="af-agc-rcp__lane-head">
            <span className="af-agc-rcp__lane-ico" aria-hidden="true">
              <RecapKindIcon kind="failed" />
            </span>
            <span className="af-agc-rcp__lane-title">Failed</span>
            <span className="af-agc-rcp__lane-count">
              {lanes.failed.length}
            </span>
          </div>

          <div
            className="af-agc-rcp__cards"
            style={{ minHeight: `calc(${limit} * 90px + ${Math.max(0, limit - 1)} * 4px)` }}
          >
            {lanes.failed.slice(0, limit).map(({ event: ev, timeLabel }) => {
              const resolved = resolvedIds.has(ev.id);
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "af-agc-rcp__card",
                    hoveredId === ev.id && "is-highlighted",
                    resolved && "is-resolved",
                  )}
                  onMouseEnter={() => setHoveredId(ev.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="af-agc-rcp__card-top">
                    <span className="af-agc-rcp__tile" aria-hidden="true">
                      {ev.logo ?? (
                        <ToolBrandMark name={ev.tool ?? "Drive"} size={12} />
                      )}
                    </span>
                    <span className="af-agc-rcp__card-title">{ev.title}</span>
                  </div>

                  <div className="af-agc-rcp__card-meta">
                    <span
                      className={cn(
                        "af-agc-rcp__card-detail",
                        !resolved && "is-error",
                      )}
                    >
                      {resolved
                        ? "Reconnected token and completed sync"
                        : (ev.detail ?? "")}
                    </span>
                    <time className="af-agc-rcp__time">{timeLabel}</time>
                  </div>

                  <div className="af-agc-rcp__card-foot">
                    <span className="af-agc-rcp__status">
                      {resolved ? (
                        <span className="af-agc-rcp__done-pill">
                          {ev.doneLabel ?? "Retried"}
                        </span>
                      ) : null}
                    </span>
                    <div className="af-agc-rcp__btns">
                      {resolved ? (
                        <button
                          type="button"
                          className="af-agc-rcp__ghost-btn"
                          onClick={() => toggleUndoDone(ev)}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="af-agc-rcp__act-btn"
                          onClick={() => invokePrimary(ev)}
                        >
                          {ev.action ?? "Retry"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Done lane */}
        <section className="af-agc-rcp__lane" aria-label="Done">
          <div className="af-agc-rcp__lane-head">
            <span className="af-agc-rcp__lane-ico" aria-hidden="true">
              <RecapKindIcon kind="done" />
            </span>
            <span className="af-agc-rcp__lane-title">Done</span>
            <span className="af-agc-rcp__lane-count">{lanes.done.length}</span>
          </div>

          <div
            className="af-agc-rcp__cards"
            style={{ minHeight: `calc(${limit} * 90px + ${Math.max(0, limit - 1)} * 4px)` }}
          >
            {lanes.done.slice(0, limit).map(({ event: ev, timeLabel }) => {
              const undone = undoneIds.has(ev.id);
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "af-agc-rcp__card",
                    hoveredId === ev.id && "is-highlighted",
                    undone && "is-undone",
                  )}
                  onMouseEnter={() => setHoveredId(ev.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="af-agc-rcp__card-top">
                    <span className="af-agc-rcp__tile" aria-hidden="true">
                      {ev.logo ?? (
                        <ToolBrandMark name={ev.tool ?? "Slack"} size={12} />
                      )}
                    </span>
                    <span className="af-agc-rcp__card-title">{ev.title}</span>
                  </div>

                  <div className="af-agc-rcp__card-meta">
                    <span className="af-agc-rcp__card-detail">
                      {ev.detail ?? ""}
                    </span>
                    {ev.count !== undefined ? (
                      <span className="af-agc-rcp__count-tag">{ev.count}</span>
                    ) : null}
                    <time className="af-agc-rcp__time">{timeLabel}</time>
                  </div>

                  <div className="af-agc-rcp__card-foot">
                    <span className="af-agc-rcp__status">
                      {!undone ? (
                        <span className="af-agc-rcp__done-pill">
                          {ev.doneLabel ?? "Done"}
                        </span>
                      ) : null}
                    </span>
                    <div className="af-agc-rcp__btns">
                      <button
                        type="button"
                        className="af-agc-rcp__ghost-btn"
                        onClick={() => toggleUndoDone(ev)}
                      >
                        {undone ? "Redo" : "Undo"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export const AfAgentRecapPattern = AfAgentRecap;
export type AfAgentRecapPatternProps = AfAgentRecapProps;
