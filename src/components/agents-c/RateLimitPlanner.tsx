import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { AfPortal } from "../../primitives/layer";
import {
  AgentPixelMark,
  buildSmoothChartPath,
  useFloatingAnchor,
} from "./_marks";

export type ThrottlePolicy = "queue" | "downgrade" | "reject";

export interface RateLimitWorker {
  id: string;
  name: string;
  model: string;
  weight: number;
  currentRpm: number;
}

export interface PlannedRun {
  id: string;
  name: string;
  /** Minutes after midnight (0–1440, or within the 24h window). */
  at: number;
  /** Peak tokens per minute. */
  peak: number;
  /** Minutes until reaching peak (default 55). */
  rise?: number;
  /** Minutes until tail halves (default 70). */
  halfLife?: number;
  days?: "daily" | "weekdays" | "weekend";
  color?: string;
}

export interface AfRateLimitPlannerProps {
  /** Controlled planned runs. */
  runs?: PlannedRun[];
  /** Uncontrolled initial runs. */
  defaultRuns?: PlannedRun[];
  onRunsChange?: (runs: PlannedRun[]) => void;
  /** API limit in tokens per minute (default 120_000). */
  limit?: number;
  /** Safe buffer share (default 0.8). */
  buffer?: number;
  /** Hour the 24-hour window starts at (default 6 -> 06:00). */
  startHour?: number;
  /** Fixed milestone to check against, e.g. nightly batch. */
  checkpoint?: { at: number; label: string };
  /** Current time in minutes after midnight. */
  now?: number;
  /** Measured TPM per 15-min bucket up to `now`. */
  actual?: number[];
  today?: "weekdays" | "weekend";
  selected?: string;
  onSelectedChange?: (id: string) => void;
  title?: ReactNode;
  /** Legacy compatibility props. */
  totalTpmLimit?: number;
  totalRpmLimit?: number;
  initialWorkers?: RateLimitWorker[];
  defaultPolicy?: ThrottlePolicy;
  onApply?: (payload: {
    policy: ThrottlePolicy;
    workers: RateLimitWorker[];
  }) => void;
  className?: string;
  style?: CSSProperties;
}

const LANE_COLORS = [
  "#0190fe",
  "#a651f0",
  "#13b3a0",
  "#ee3e9e",
  "#f28a2e",
] as const;

const DEFAULT_RUNS: PlannedRun[] = [
  {
    id: "inbox-triage",
    name: "Inbox triage",
    at: 8 * 60,
    peak: 46_000,
    rise: 50,
    halfLife: 72,
    days: "daily",
    color: "#0190fe",
  },
  {
    id: "lead-research",
    name: "Lead research",
    at: 11 * 60,
    peak: 82_000,
    rise: 60,
    halfLife: 92,
    days: "weekdays",
    color: "#a651f0",
  },
  {
    id: "report-writer",
    name: "Report writer",
    at: 15 * 60 + 30,
    peak: 74_000,
    rise: 58,
    halfLife: 94,
    days: "weekdays",
    color: "#13b3a0",
  },
  {
    id: "code-review",
    name: "Code review",
    at: 18 * 60 + 30,
    peak: 36_000,
    rise: 45,
    halfLife: 68,
    days: "daily",
    color: "#ee3e9e",
  },
];

// Measured 15-min buckets from 06:00 to 10:30 (19 buckets) — ~12% above planned baseline
const DEFAULT_ACTUAL: number[] = [
  4_200, 4_200, 4_300, 4_400, 4_500, 4_700, 5_100, 6_400, 14_000, 38_000,
  52_000, 44_000, 25_000, 19_000, 26_000, 43_000, 41_000, 31_000, 22_800,
];

function toWindowOffset(minAfterMidnight: number, startMin: number): number {
  let diff = minAfterMidnight - startMin;
  while (diff < 0) diff += 1440;
  while (diff >= 1440) diff -= 1440;
  return diff;
}

function fromWindowOffset(offsetMin: number, startMin: number): number {
  const clamped = Math.max(0, Math.min(1380, Math.round(offsetMin / 15) * 15));
  return (startMin + clamped) % 1440;
}

function formatClock24(minAfterMidnight: number): string {
  const norm = ((Math.round(minAfterMidnight) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatCompactK(val: number): string {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  return `${Math.round(val / 1000)}k`;
}

function evaluateRunAt(
  run: PlannedRun,
  offsetMin: number,
  startMin: number,
): number {
  const startOff = toWindowOffset(run.at, startMin);
  const dt = offsetMin - startOff;
  if (dt <= 0) return 0;
  const rise = Math.max(15, run.rise ?? 55);
  const half = Math.max(20, run.halfLife ?? 65);
  if (dt <= rise) {
    const u = dt / rise;
    return run.peak * 0.968 * (u * u * (3 - 2 * u));
  }
  const decay = Math.pow(0.5, (dt - rise) / half);
  return decay < 0.015 ? 0 : run.peak * 0.968 * decay;
}

function computeSpanMinutes(run: PlannedRun): number {
  const rise = Math.max(20, run.rise ?? 55);
  const half = Math.max(25, run.halfLife ?? 65);
  return Math.min(440, Math.max(180, Math.round(rise + half * 4.05)));
}

export function AfRateLimitPlanner({
  runs: controlledRuns,
  defaultRuns,
  onRunsChange,
  limit: propLimit,
  buffer = 0.8,
  startHour = 6,
  checkpoint = { at: 23 * 60, label: "Nightly batch" },
  now = 10 * 60 + 30,
  actual = DEFAULT_ACTUAL,
  today = "weekdays",
  selected: controlledSelected,
  onSelectedChange,
  title = "Rate limit",
  totalTpmLimit,
  initialWorkers,
  className,
  style,
}: AfRateLimitPlannerProps = {}) {
  const uid = useId().replace(/:/g, "");
  const limit = propLimit ?? totalTpmLimit ?? 120_000;
  const startMin = startHour * 60;
  const nowOffset = toWindowOffset(now, startMin);

  const initialList = useMemo<PlannedRun[]>(() => {
    if (defaultRuns && defaultRuns.length > 0) return defaultRuns;
    if (initialWorkers && initialWorkers.length > 0) {
      return initialWorkers.map((w, idx) => ({
        id: w.id,
        name: w.name,
        at: (9 + idx * 3) * 60,
        peak: Math.max(24_000, w.weight * 1_600),
        color: LANE_COLORS[idx % LANE_COLORS.length],
      }));
    }
    return DEFAULT_RUNS;
  }, [defaultRuns, initialWorkers]);

  const [internalRuns, setInternalRuns] = useState<PlannedRun[]>(initialList);
  const [internalSelected, setInternalSelected] =
    useState<string>("lead-research");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editBtnRef = useRef<HTMLButtonElement | null>(null);
  const editMenuRef = useRef<HTMLDivElement | null>(null);
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const runs = controlledRuns ?? internalRuns;
  const selectedId = controlledSelected ?? internalSelected;

  const updateRuns = (next: PlannedRun[]) => {
    if (controlledRuns === undefined) setInternalRuns(next);
    onRunsChange?.(next);
  };

  const selectRun = (id: string) => {
    if (controlledSelected === undefined) setInternalSelected(id);
    onSelectedChange?.(id);
  };

  const activeRuns = useMemo(
    () =>
      runs.filter((r) => !r.days || r.days === "daily" || r.days === today),
    [runs, today],
  );

  // 97 sample points across 24h (every 15 min)
  const buckets = useMemo(() => {
    const count = 97;
    const pts: Array<{
      offset: number;
      clock: number;
      planned: number;
      actualVal: number | null;
      selectedVal: number;
      effective: number;
    }> = [];

    for (let i = 0; i < count; i += 1) {
      const offset = i * 15;
      const clock = (startMin + offset) % 1440;
      const ambient = 3_950;
      let sum = ambient;
      let selVal = 0;
      for (let r = 0; r < activeRuns.length; r += 1) {
        const run = activeRuns[r];
        const v = evaluateRunAt(run, offset, startMin);
        sum += v;
        if (run.id === selectedId) selVal = v;
      }
      const isPast = offset <= nowOffset;
      const measured =
        isPast && i < actual.length ? actual[i] : isPast ? sum * 1.12 : null;
      pts.push({
        offset,
        clock,
        planned: sum,
        actualVal: measured,
        selectedVal: selVal > 0 ? ambient * 0.6 + selVal : 0,
        effective: measured !== null ? Math.max(measured, sum) : sum,
      });
    }
    return pts;
  }, [activeRuns, actual, nowOffset, selectedId, startMin]);

  const stats = useMemo(() => {
    let peakVal = 0;
    let peakClock = now;
    let peakOffset = nowOffset;
    let totalTokens = 0;
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i];
      totalTokens += b.effective * 15;
      if (b.effective > peakVal) {
        peakVal = b.effective;
        peakClock = b.clock;
        peakOffset = b.offset;
      }
    }
    const pct = Math.round((peakVal / limit) * 100);
    let actSum = 0;
    let planSum = 0;
    for (let i = 0; i < buckets.length; i += 1) {
      if (buckets[i].actualVal !== null) {
        actSum += buckets[i].actualVal!;
        planSum += buckets[i].planned;
      }
    }
    const paceRatio = planSum > 0 ? (actSum - planSum) / planSum : 0.12;
    const paceDiffPct = Math.round(paceRatio * 100);
    const projectedPct = Math.min(
      199,
      Math.round(((peakVal * (1 + Math.max(0, paceRatio))) / limit) * 100),
    );
    return {
      peakVal,
      peakClock,
      peakOffset,
      pct,
      projectedPct,
      totalTokens,
      paceDiffPct,
    };
  }, [buckets, limit, now, nowOffset]);

  const handleSpreadOut = () => {
    const ckOffset = toWindowOffset(checkpoint.at, startMin);
    const windowStart = Math.min(ckOffset - 180, nowOffset + 45);
    const windowEnd = Math.max(windowStart + 180, ckOffset - 120);

    const movable = runs.filter((r) => {
      const off = toWindowOffset(r.at, startMin);
      return off > nowOffset;
    });
    if (movable.length <= 1) return;

    const sortedMovable = [...movable].sort(
      (a, b) => toWindowOffset(a.at, startMin) - toWindowOffset(b.at, startMin),
    );
    const step =
      (windowEnd - windowStart) / Math.max(1, sortedMovable.length - 1);
    const nextAtById = new Map<string, number>();
    sortedMovable.forEach((r, idx) => {
      nextAtById.set(
        r.id,
        fromWindowOffset(windowStart + idx * step, startMin),
      );
    });

    updateRuns(
      runs.map((r) =>
        nextAtById.has(r.id) ? { ...r, at: nextAtById.get(r.id)! } : r,
      ),
    );
  };

  const handleDragStart = (
    e: ReactPointerEvent<HTMLDivElement>,
    run: PlannedRun,
    isRunningLane: boolean,
  ) => {
    selectRun(run.id);
    if (isRunningLane) return;
    const track = trackRefs.current[run.id];
    if (!track) return;
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    const origOffset = toWindowOffset(run.at, startMin);

    const onMove = (ev: PointerEvent) => {
      if (rect.width <= 0) return;
      const dx = ev.clientX - startX;
      const dMin = (dx / rect.width) * 1440;
      const minAllowed = nowOffset + 15;
      const nextOffset = Math.max(minAllowed, Math.min(1350, origOffset + dMin));
      const nextClock = fromWindowOffset(nextOffset, startMin);
      updateRuns(
        runs.map((item) =>
          item.id === run.id ? { ...item, at: nextClock } : item,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleBarKeyDown = (
    e: ReactKeyboardEvent<HTMLDivElement>,
    run: PlannedRun,
    isRunningLane: boolean,
  ) => {
    if (isRunningLane) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 30 : -30;
    const curOff = toWindowOffset(run.at, startMin);
    const nextOff = Math.max(nowOffset + 15, Math.min(1350, curOff + delta));
    updateRuns(
      runs.map((item) =>
        item.id === run.id
          ? { ...item, at: fromWindowOffset(nextOff, startMin) }
          : item,
      ),
    );
  };

  const handleAddRun = () => {
    const idx = runs.length;
    const id = `run-${Date.now()}`;
    const candidateOff = Math.min(1260, nowOffset + 180 + (idx % 4) * 90);
    const added: PlannedRun = {
      id,
      name: `Batch sync ${idx + 1}`,
      at: fromWindowOffset(candidateOff, startMin),
      peak: 48_000,
      rise: 45,
      halfLife: 55,
      days: "daily",
      color: LANE_COLORS[idx % LANE_COLORS.length],
    };
    updateRuns([...runs, added]);
    selectRun(id);
  };

  const handleRemoveRun = (id: string) => {
    const next = runs.filter((r) => r.id !== id);
    updateRuns(next);
    if (selectedId === id && next[0]) {
      selectRun(next[0].id);
    }
    if (editingId === id) setEditingId(null);
  };

  const editPos = useFloatingAnchor(editBtnRef, Boolean(editingId), {
    align: "end",
    offset: 6,
    minWidth: 236,
  });

  useEffect(() => {
    if (!editingId) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        editBtnRef.current?.contains(target) ||
        editMenuRef.current?.contains(target)
      ) {
        return;
      }
      setEditingId(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [editingId]);

  const W = 680;
  const H = 148;
  const yTopMax = Math.max(limit * 1.18, stats.peakVal * 1.12);
  const toX = (offsetMin: number) => (offsetMin / 1440) * W;
  const toY = (tpm: number) =>
    H - 4 - (Math.max(0, Math.min(yTopMax, tpm)) / yTopMax) * (H - 20);

  const chartGeom = useMemo(() => {
    const baseY = toY(0);
    const limitY = toY(limit);
    const bufferY = toY(limit * buffer);

    const pastPts = buckets
      .filter((b) => b.offset <= nowOffset)
      .map((b) => ({ x: toX(b.offset), y: toY(b.actualVal ?? b.planned) }));
    const futurePts = buckets
      .filter((b) => b.offset >= nowOffset)
      .map((b) => ({ x: toX(b.offset), y: toY(b.planned) }));
    const selPts = buckets.map((b) => ({
      x: toX(b.offset),
      y: toY(b.selectedVal),
    }));
    const fullEffPts = buckets.map((b) => ({
      x: toX(b.offset),
      y: toY(b.effective),
    }));

    return {
      baseY,
      limitY,
      bufferY,
      pastLine: buildSmoothChartPath(pastPts, baseY).line,
      futureLine: buildSmoothChartPath(futurePts, baseY).line,
      selChart: buildSmoothChartPath(selPts, baseY),
      fullArea: buildSmoothChartPath(fullEffPts, baseY).area,
    };
  }, [buckets, buffer, limit, nowOffset, yTopMax]);

  const selectedRun =
    runs.find((r) => r.id === selectedId) ?? runs[1] ?? runs[0];
  const selectedColor = selectedRun?.color ?? "#a651f0";

  const isOver = stats.peakVal > limit;
  const isClose = !isOver && stats.peakVal > limit * buffer;

  const editingRun = editingId ? runs.find((r) => r.id === editingId) : null;

  const axisHours = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      out.push(formatClock24(startMin + i * 180));
    }
    return out;
  }, [startMin]);

  const nowPct = (nowOffset / 1440) * 100;
  const checkpointPct = (toWindowOffset(checkpoint.at, startMin) / 1440) * 100;
  const peakPct = (stats.peakOffset / 1440) * 100;

  const footerText = useMemo(() => {
    const peakTime = formatClock24(stats.peakClock);
    if (isOver) {
      const overBy = formatCompactK(stats.peakVal - limit);
      return `Projected peak exceeds the ${formatCompactK(limit)}/min limit by ${overBy} at ${peakTime} – drag overlapping runs apart or click Spread out.`;
    }
    const paceAbs = Math.max(4, Math.abs(stats.paceDiffPct || 12));
    const dir = (stats.paceDiffPct || 12) >= 0 ? "above" : "below";
    return `Today runs ${paceAbs}% ${dir} plan – at this pace the peak reaches ${stats.projectedPct}% of the limit at ${peakTime}`;
  }, [
    isOver,
    limit,
    stats.paceDiffPct,
    stats.peakClock,
    stats.peakVal,
    stats.projectedPct,
  ]);

  return (
    <div
      className={cn(
        "af-agc-rlp",
        isOver && "is-over",
        isClose && "is-close",
        className,
      )}
      style={style}
    >
      <div className="af-agc-rlp__head">
        <div className="af-agc-rlp__head-left">
          <span className="af-agc-rlp__title">{title}</span>
          <span className="af-agc-rlp__meta">
            {activeRuns.length} runs · {formatCompactK(stats.totalTokens)} tokens
            {" · "}
            {formatCompactK(limit)} / min
          </span>
        </div>

        <div className="af-agc-rlp__head-right">
          <span
            className={cn(
              "af-agc-rlp__status",
              isOver ? "is-over" : isClose ? "is-warn" : "is-ok",
            )}
          >
            {isOver
              ? `Over limit · peak ${stats.pct}%`
              : isClose
                ? `Close to limit · peak ${stats.pct}%`
                : `Under limit · peak ${stats.pct}%`}
          </span>

          <button
            type="button"
            className="af-agc-rlp__spread-btn"
            onClick={handleSpreadOut}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1.5 9.5c1.8 0 2.2-5 4-5s2.2 5 4 5 1.6-3 3-3"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
            <span>Spread out</span>
          </button>
        </div>
      </div>

      <div className="af-agc-rlp__chart-row">
        <div className="af-agc-rlp__y-col" aria-hidden="true">
          <span
            className="af-agc-rlp__y-tag is-limit"
            style={{ top: `${(chartGeom.limitY / H) * 100}%` }}
          >
            {formatCompactK(limit)}
          </span>
          <span
            className="af-agc-rlp__y-tag is-buffer"
            style={{ top: `${(chartGeom.bufferY / H) * 100}%` }}
          >
            {formatCompactK(limit * buffer)}
          </span>
        </div>

        <div className="af-agc-rlp__stage">
          <div className="af-agc-rlp__plot">
            <svg
              className="af-agc-rlp__svg"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={`rlp-sel-${uid}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={selectedColor}
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor={selectedColor}
                    stopOpacity="0.01"
                  />
                </linearGradient>
                <pattern
                  id={`rlp-hatch-${uid}`}
                  width="7"
                  height="7"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="7"
                    stroke="var(--af-rlp-danger)"
                    strokeOpacity="0.36"
                    strokeWidth="2"
                  />
                </pattern>
                <clipPath id={`rlp-over-${uid}`}>
                  <rect x="0" y="0" width={W} height={chartGeom.limitY} />
                </clipPath>
              </defs>

              <line
                x1="0"
                y1={chartGeom.limitY}
                x2={W}
                y2={chartGeom.limitY}
                stroke="var(--af-rlp-danger)"
                strokeOpacity="0.55"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1={chartGeom.bufferY}
                x2={W}
                y2={chartGeom.bufferY}
                stroke="var(--af-rlp-grid)"
                strokeWidth="1"
                strokeDasharray="2 4"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1={chartGeom.baseY}
                x2={W}
                y2={chartGeom.baseY}
                stroke="var(--af-rlp-grid)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />

              {isOver ? (
                <path
                  d={chartGeom.fullArea}
                  fill={`url(#rlp-hatch-${uid})`}
                  clipPath={`url(#rlp-over-${uid})`}
                />
              ) : null}

              <path
                d={chartGeom.selChart.area}
                fill={`url(#rlp-sel-${uid})`}
              />
              <path
                d={chartGeom.selChart.line}
                fill="none"
                stroke={selectedColor}
                strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
              />

              <path
                d={chartGeom.futureLine}
                fill="none"
                stroke="var(--af-rlp-curve)"
                strokeWidth="1.35"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={chartGeom.pastLine}
                fill="none"
                stroke="var(--af-rlp-actual)"
                strokeWidth="1.65"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div
              className="af-agc-rlp__marker is-now"
              style={{ left: `${nowPct}%` }}
              aria-hidden="true"
            />

            <div
              className="af-agc-rlp__marker is-check"
              style={{ left: `${checkpointPct}%` }}
              aria-hidden="true"
            >
              <span className="af-agc-rlp__marker-label">
                {checkpoint.label} {formatClock24(checkpoint.at)}
              </span>
            </div>

            <div
              className={cn("af-agc-rlp__peak-pill", isOver && "is-over")}
              style={{
                left: `${Math.max(12, Math.min(86, peakPct))}%`,
                top: `${Math.max(6, (toY(stats.peakVal) / H) * 100 - 15)}%`,
              }}
            >
              Peak {formatCompactK(stats.peakVal)} ·{" "}
              {formatClock24(stats.peakClock)}
            </div>
          </div>

          <div className="af-agc-rlp__x-axis" aria-hidden="true">
            {axisHours.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="af-agc-rlp__lanes"
        role="list"
        aria-label="Scheduled runs"
      >
        <div
          className="af-agc-rlp__lanes-backdrop"
          aria-hidden="true"
          style={
            {
              "--af-rlp-lanes-h": `${runs.length * 32 + 4}px`,
            } as CSSProperties
          }
        >
          {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
            <span
              key={pct}
              className="af-agc-rlp__lanes-tick"
              style={{ left: `${pct}%` }}
            />
          ))}
          <span
            className="af-agc-rlp__lanes-check"
            style={{ left: `${checkpointPct}%` }}
          />
          <span
            className="af-agc-rlp__lanes-now"
            style={{ left: `${nowPct}%` }}
          />
        </div>

        {runs.map((run, idx) => {
          const color = run.color ?? LANE_COLORS[idx % LANE_COLORS.length];
          const runOff = toWindowOffset(run.at, startMin);
          const durationMin = computeSpanMinutes(run);
          const isRunningLane =
            runOff <= nowOffset && runOff + durationMin >= nowOffset;
          const isSelected = run.id === selectedId;
          const leftPct = (runOff / 1440) * 100;
          const widthPct = Math.min(100 - leftPct, (durationMin / 1440) * 100);

          return (
            <div
              key={run.id}
              role="listitem"
              className={cn(
                "af-agc-rlp__lane",
                isSelected && "is-selected",
                isRunningLane && "is-locked",
              )}
              style={{ "--af-rlp-lane": color } as CSSProperties}
              onClick={() => selectRun(run.id)}
            >
              <div className="af-agc-rlp__lane-info">
                <AgentPixelMark
                  seed={run.id}
                  size={11}
                  color={color}
                  twinkle={isRunningLane}
                />
                <span className="af-agc-rlp__lane-name">{run.name}</span>
                <span
                  className={cn(
                    "af-agc-rlp__lane-clock",
                    isSelected && !isRunningLane && "is-colored",
                  )}
                  style={
                    isSelected && !isRunningLane
                      ? ({ color } as CSSProperties)
                      : undefined
                  }
                >
                  {isRunningLane ? "Running" : formatClock24(run.at)}
                </span>
              </div>

              <div
                ref={(el) => {
                  trackRefs.current[run.id] = el;
                }}
                className="af-agc-rlp__lane-track"
              >
                <div
                  role="slider"
                  tabIndex={isRunningLane ? -1 : 0}
                  aria-label={`${run.name} start time`}
                  aria-valuemin={0}
                  aria-valuemax={1440}
                  aria-valuenow={run.at}
                  aria-valuetext={`${formatClock24(run.at)}, peak ${formatCompactK(run.peak)}`}
                  className={cn(
                    "af-agc-rlp__bar",
                    isSelected && "is-selected",
                    isRunningLane && "is-running",
                  )}
                  style={
                    {
                      left: `${leftPct}%`,
                      width: `${Math.max(15, widthPct)}%`,
                      "--af-rlp-lane": color,
                    } as CSSProperties
                  }
                  onPointerDown={(e) => handleDragStart(e, run, isRunningLane)}
                  onKeyDown={(e) => handleBarKeyDown(e, run, isRunningLane)}
                >
                  <span className="af-agc-rlp__bar-peak">
                    {formatCompactK(run.peak)}
                  </span>
                </div>

                {!isRunningLane ? (
                  <div className="af-agc-rlp__lane-actions">
                    <button
                      type="button"
                      ref={editingId === run.id ? editBtnRef : undefined}
                      className="af-agc-rlp__icon-btn"
                      aria-label={`Edit ${run.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        editBtnRef.current = e.currentTarget;
                        setEditingId((prev) =>
                          prev === run.id ? null : run.id,
                        );
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle cx="3.5" cy="7" r="1.1" fill="currentColor" />
                        <circle cx="7" cy="7" r="1.1" fill="currentColor" />
                        <circle cx="10.5" cy="7" r="1.1" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="af-agc-rlp__icon-btn"
                      aria-label={`Remove ${run.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRun(run.id);
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 3l6 6M9 3l-6 6"
                          stroke="currentColor"
                          strokeWidth="1.35"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="af-agc-rlp__add-row"
          onClick={handleAddRun}
        >
          <span aria-hidden="true">+</span> Add run
        </button>
      </div>

      <div className="af-agc-rlp__foot">{footerText}</div>

      {editingRun ? (
        <AfPortal>
          <div
            ref={editMenuRef}
            className="af-agc-rlp__pop"
            role="dialog"
            aria-label={`Edit ${editingRun.name}`}
            style={{
              position: "fixed",
              top: editPos.top,
              left: editPos.left,
              width: 244,
              zIndex: 9999,
            }}
          >
            <div className="af-agc-rlp__pop-title">{editingRun.name}</div>
            <label className="af-agc-rlp__pop-field">
              <span>Peak TPM ({formatCompactK(editingRun.peak)})</span>
              <input
                type="range"
                min={20_000}
                max={120_000}
                step={4_000}
                value={editingRun.peak}
                onChange={(e) => {
                  const nextPeak = Number(e.target.value);
                  updateRuns(
                    runs.map((r) =>
                      r.id === editingRun.id ? { ...r, peak: nextPeak } : r,
                    ),
                  );
                }}
              />
            </label>
            <div className="af-agc-rlp__pop-days">
              {(["daily", "weekdays", "weekend"] as const).map((cadence) => (
                <button
                  key={cadence}
                  type="button"
                  className={cn(
                    "af-agc-rlp__pop-chip",
                    (editingRun.days ?? "daily") === cadence && "is-active",
                  )}
                  onClick={() =>
                    updateRuns(
                      runs.map((r) =>
                        r.id === editingRun.id ? { ...r, days: cadence } : r,
                      ),
                    )
                  }
                >
                  {cadence}
                </button>
              ))}
            </div>
          </div>
        </AfPortal>
      ) : null}
    </div>
  );
}

export const AfRateLimitPlannerPattern = AfRateLimitPlanner;
export type AfRateLimitPlannerPatternProps = AfRateLimitPlannerProps;
