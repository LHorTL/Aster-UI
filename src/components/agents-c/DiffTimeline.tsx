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
import { AgentPixelMark, buildSmoothChartPath } from "./_marks";

export interface DiffTimelineHunk {
  file: string;
  lines: Array<{ kind: "add" | "del" | "ctx"; no: string; code: string }>;
}

export interface DiffTimelinePoint {
  id: string;
  seq: string;
  time: string;
  agent: string;
  title: string;
  added: number;
  removed: number;
  hunks: DiffTimelineHunk[];
}

export interface DiffEdit {
  id?: string;
  /** Seconds since the run started. */
  at: number;
  file: string;
  added: number;
  removed: number;
  summary?: string;
  diff?: Array<{ type: "add" | "del" | "ctx"; text: string; line?: number }>;
}

export interface AfDiffTimelineProps {
  /** Agent identity (pixel mark). */
  agent?: { id: string; name: string };
  /** Quiet context text after agent name, e.g. "PR #214". */
  context?: string;
  /** Official affectUI edit stream. */
  edits?: DiffEdit[];
  /** Seconds elapsed since the run started (later edits stay hidden). */
  elapsed?: number;
  /** Live indicator: breathing line ends + twinkling mark + active file readout. */
  live?: boolean;
  /** Total axis duration in seconds. */
  duration?: number;
  /** Max file rows before scrolling. */
  maxRows?: number;
  /** Legacy compatibility props. */
  title?: ReactNode;
  points?: DiffTimelinePoint[];
  onRevert?: (point: DiffTimelinePoint) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_EDITS: DiffEdit[] = [
  {
    id: "e-1",
    at: 28,
    file: "src/cart/discount.ts",
    added: 26,
    removed: 4,
    summary: "Guard percentage coupons against empty subtotals",
    diff: [
      { type: "ctx", line: 18, text: "export function applyCoupon(sub: number, pct: number) {" },
      { type: "del", line: 19, text: "  return Math.round(sub * (1 - pct / 100));" },
      { type: "add", line: 19, text: "  if (sub <= 0) return 0;" },
      { type: "add", line: 20, text: "  return Math.max(0, Math.round(sub * (1 - pct / 100)));" },
    ],
  },
  {
    id: "e-2",
    at: 68,
    file: "src/cart/totals.ts",
    added: 38,
    removed: 9,
    summary: "Recompute tax after line-level discount clamp",
    diff: [
      { type: "ctx", line: 42, text: "const discounted = applyCoupon(subtotal, couponPct);" },
      { type: "del", line: 43, text: "const tax = Math.round(subtotal * taxRate);" },
      { type: "add", line: 43, text: "const tax = Math.round(discounted * taxRate);" },
      { type: "add", line: 44, text: "const shipping = discounted >= FREE_SHIP ? 0 : 690;" },
    ],
  },
  {
    id: "e-3",
    at: 112,
    file: "src/cart/CartDrawer.tsx",
    added: 48,
    removed: 9,
    summary: "Render empty-cart state and savings breakdown row",
    diff: [
      { type: "del", line: 84, text: "  if (!items.length) return null;" },
      { type: "add", line: 84, text: "  if (!items.length) return <EmptyCartState />;" },
      { type: "add", line: 85, text: "  const saved = subtotal - totals.discounted;" },
    ],
  },
  {
    id: "e-4",
    at: 156,
    file: "public/empty-cart.svg",
    added: 4,
    removed: 2,
    summary: "Align stroke opacity on empty bag illustration",
    diff: [
      { type: "del", line: 6, text: '<path stroke="#111" stroke-width="1.5" />' },
      { type: "add", line: 6, text: '<path stroke="currentColor" stroke-opacity="0.55" stroke-width="1.4" />' },
    ],
  },
  {
    id: "e-5",
    at: 194,
    file: "src/cart/totals.ts",
    added: 26,
    removed: 5,
    summary: "Normalize currency rounding across multi-item bundles",
    diff: [
      { type: "add", line: 71, text: "export const formatCents = (c: number) => (c / 100).toFixed(2);" },
      { type: "add", line: 72, text: "export const clampZero = (c: number) => (c < 0 ? 0 : c);" },
    ],
  },
  {
    id: "e-6",
    at: 226,
    file: "src/cart/totals.test.ts",
    added: 16,
    removed: 0,
    summary: "Add regression cases for 100% promo codes and empty cart",
    diff: [
      { type: "add", line: 31, text: 'it("returns zero tax when subtotal is zero", () => {' },
      { type: "add", line: 32, text: "  expect(computeTotals([], 25).total).toBe(0);" },
      { type: "add", line: 33, text: "});" },
    ],
  },
];

function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function parseClockToSec(label: string, fallback: number): number {
  const m = /^(\d+):(\d{2})$/.exec(label.trim());
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fileKind(path: string): "image" | "sheet" | "code" {
  const lower = path.toLowerCase();
  if (/\.(svg|png|jpg|jpeg|webp|gif)$/.test(lower)) return "image";
  if (/\.(csv|json|ya?ml|sql)$/.test(lower)) return "sheet";
  return "code";
}

function splitPath(path: string): { dir: string; base: string } {
  const idx = path.lastIndexOf("/");
  if (idx < 0) return { dir: "", base: path };
  return { dir: path.slice(0, idx + 1), base: path.slice(idx + 1) };
}

function FileTypeGlyph({ path }: { path: string }) {
  const kind = fileKind(path);
  if (kind === "image") {
    return (
      <span className="af-agc-dtl__file-ico is-image" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect
            x="1.75"
            y="2.25"
            width="10.5"
            height="9.5"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <circle cx="5" cy="5.25" r="1" fill="currentColor" />
          <path
            d="m2.5 10.2 3.1-2.8 2.2 2 1.8-1.5 2 2.3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (kind === "sheet") {
    return (
      <span className="af-agc-dtl__file-ico is-sheet" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect
            x="2"
            y="2"
            width="10"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M2.4 5.5h9.2M5.8 5.5v6.1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-agc-dtl__file-ico is-code" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path
          d="M5.2 4.3 2.5 7l2.7 2.7M8.8 4.3 11.5 7l-2.7 2.7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function AfDiffTimeline({
  agent = { id: "frontend-agent", name: "Frontend agent" },
  context = "PR #214",
  edits: propEdits,
  elapsed,
  live: propLive,
  duration = 240,
  maxRows = 6,
  title,
  points,
  className,
  style,
}: AfDiffTimelineProps = {}) {
  const uid = useId().replace(/:/g, "");
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const isAutoDemo =
    propEdits === undefined && points === undefined && elapsed === undefined;

  const normalizedEdits = useMemo<DiffEdit[]>(() => {
    if (propEdits && propEdits.length > 0) {
      return [...propEdits].sort((a, b) => a.at - b.at);
    }
    if (points && points.length > 0) {
      return points.map((p, idx) => ({
        id: p.id,
        at: parseClockToSec(p.time, (idx + 1) * 42),
        file: p.hunks[0]?.file ?? `src/module-${idx + 1}.ts`,
        added: p.added,
        removed: p.removed,
        summary: p.title,
        diff: p.hunks[0]?.lines.map((l) => ({
          type: l.kind,
          text: l.code,
          line: Number(l.no) || undefined,
        })),
      }));
    }
    return DEFAULT_EDITS;
  }, [points, propEdits]);

  const [demoCount, setDemoCount] = useState<number>(() =>
    isAutoDemo ? 1 : normalizedEdits.length,
  );

  useEffect(() => {
    if (!isAutoDemo) {
      setDemoCount(normalizedEdits.length);
      return;
    }
    if (demoCount >= normalizedEdits.length) return;
    const timer = window.setInterval(() => {
      setDemoCount((prev) =>
        prev >= normalizedEdits.length ? prev : prev + 1,
      );
    }, 520);
    return () => window.clearInterval(timer);
  }, [demoCount, isAutoDemo, normalizedEdits.length]);

  const visibleEdits = useMemo(() => {
    if (elapsed !== undefined) {
      return normalizedEdits.filter((e) => e.at <= elapsed);
    }
    if (isAutoDemo && demoCount < normalizedEdits.length) {
      return normalizedEdits.slice(0, Math.max(1, demoCount));
    }
    return normalizedEdits;
  }, [demoCount, elapsed, isAutoDemo, normalizedEdits]);

  const live = propLive ?? (isAutoDemo && demoCount < normalizedEdits.length);

  const totalUniqueFileCount = useMemo(() => {
    const s = new Set<string>();
    normalizedEdits.forEach((e) => s.add(e.file));
    return s.size;
  }, [normalizedEdits]);

  const totalDuration = useMemo(() => {
    const maxAt = normalizedEdits.reduce((m, e) => Math.max(m, e.at), 0);
    return Math.max(duration, maxAt, 60);
  }, [duration, normalizedEdits]);

  const cumulative = useMemo(() => {
    let sumAdd = 0;
    let sumDel = 0;
    const pts: Array<{
      at: number;
      add: number;
      del: number;
      net: number;
      edit: DiffEdit;
      index: number;
    }> = [];
    for (let i = 0; i < visibleEdits.length; i += 1) {
      const e = visibleEdits[i];
      sumAdd += e.added;
      sumDel += e.removed;
      pts.push({
        at: e.at,
        add: sumAdd,
        del: sumDel,
        net: Math.max(0, sumAdd - sumDel),
        edit: e,
        index: i,
      });
    }
    return pts;
  }, [visibleEdits]);

  const totalAdded = cumulative.length ? cumulative[cumulative.length - 1].add : 0;
  const totalRemoved = cumulative.length ? cumulative[cumulative.length - 1].del : 0;
  const netDelta = totalAdded - totalRemoved;

  // Aggregate per-file rows in stable order of appearance
  const fileRows = useMemo(() => {
    const map = new Map<
      string,
      { file: string; added: number; removed: number; lastIdx: number }
    >();
    for (let i = 0; i < visibleEdits.length; i += 1) {
      const e = visibleEdits[i];
      const prev = map.get(e.file);
      if (prev) {
        prev.added += e.added;
        prev.removed += e.removed;
        prev.lastIdx = i;
      } else {
        map.set(e.file, {
          file: e.file,
          added: e.added,
          removed: e.removed,
          lastIdx: i,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.added + b.removed - (a.added + a.removed),
    );
  }, [visibleEdits]);

  const maxFileTotal = useMemo(
    () => fileRows.reduce((m, r) => Math.max(m, r.added + r.removed), 1),
    [fileRows],
  );

  // Y-axis nice scale (official: 400, 300, 200, 100, 0 or scaled to max)
  const yMax = useMemo(() => {
    const raw = Math.max(totalAdded, totalRemoved, 160);
    if (raw <= 400) return 400;
    return Math.ceil(raw / 100) * 100;
  }, [totalAdded, totalRemoved]);

  const yTicks = useMemo(
    () => [yMax, (yMax * 3) / 4, yMax / 2, yMax / 4, 0].map(Math.round),
    [yMax],
  );

  const W = 500;
  const H = 148;
  const padTop = 8;
  const padBottom = 6;
  const innerH = H - padTop - padBottom;

  const toX = (sec: number) =>
    Math.max(0, Math.min(W, (sec / totalDuration) * W));
  const toY = (val: number) =>
    padTop + innerH * (1 - Math.max(0, Math.min(yMax, val)) / yMax);

  const chartGeom = useMemo(() => {
    const baseY = toY(0);
    const addPts = [
      { x: 0, y: baseY },
      ...cumulative.map((c) => ({ x: toX(c.at), y: toY(c.add) })),
    ];
    const delPts = [
      { x: 0, y: baseY },
      ...cumulative.map((c) => ({ x: toX(c.at), y: toY(c.del) })),
    ];
    const netPts = [
      { x: 0, y: baseY },
      ...cumulative.map((c) => ({ x: toX(c.at), y: toY(c.net) })),
    ];
    const addChart = buildSmoothChartPath(addPts, baseY);
    const delChart = buildSmoothChartPath(delPts, baseY);
    const netChart = buildSmoothChartPath(netPts, baseY);
    return {
      baseY,
      addLine: addChart.line,
      addArea: addChart.area,
      delLine: delChart.line,
      delArea: delChart.area,
      netLine: netChart.line,
      lastAdd: addPts[addPts.length - 1],
      lastDel: delPts[delPts.length - 1],
    };
  }, [cumulative, totalDuration, yMax]);

  const xTicks = useMemo(() => {
    const count = 5;
    const out: Array<{ sec: number; label: string; pct: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const sec = (totalDuration * i) / (count - 1);
      out.push({
        sec,
        label: formatClock(sec),
        pct: (i / (count - 1)) * 100,
      });
    }
    return out;
  }, [totalDuration]);

  const inspectedIdx = pinnedIdx ?? activeIdx;
  const inspected =
    inspectedIdx !== null && cumulative[inspectedIdx]
      ? cumulative[inspectedIdx]
      : null;

  const findNearestIndex = (clientX: number) => {
    const el = plotRef.current;
    if (!el || !cumulative.length) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const sec = ratio * totalDuration;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cumulative.length; i += 1) {
      const d = Math.abs(cumulative[i].at - sec);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const nearest = findNearestIndex(e.clientX);
    if (nearest !== null) setActiveIdx(nearest);
  };

  const handlePointerLeave = () => {
    setActiveIdx(null);
  };

  const handlePlotClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    const nearest = findNearestIndex(e.clientX);
    if (nearest === null) return;
    setPinnedIdx((prev) => (prev === nearest ? null : nearest));
  };

  const handlePlotKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!cumulative.length) return;
    const cur = inspectedIdx ?? cumulative.length - 1;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPinnedIdx(Math.max(0, cur - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPinnedIdx(Math.min(cumulative.length - 1, cur + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPinnedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPinnedIdx(cumulative.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPinnedIdx(null);
      setActiveIdx(null);
    }
  };

  const statusSubtitle = useMemo<ReactNode>(() => {
    if (!visibleEdits.length) return "Waiting for the first edit…";
    if (live) {
      const latest = visibleEdits[visibleEdits.length - 1];
      const parts = splitPath(latest.file);
      return (
        <>
          Editing{" "}
          <span className="af-agc-dtl__sub-path">
            {parts.dir ? (
              <span className="af-agc-dtl__file-dir">{parts.dir}</span>
            ) : null}
            <span className="af-agc-dtl__file-base">{parts.base}</span>
          </span>
        </>
      );
    }
    return `Edited ${fileRows.length} ${fileRows.length === 1 ? "file" : "files"}`;
  }, [fileRows.length, live, visibleEdits]);

  const inspectedPct = inspected ? (inspected.at / totalDuration) * 100 : 0;
  const reservedFilesMinH = isAutoDemo
    ? Math.min(maxRows, totalUniqueFileCount) * 30 + 8
    : undefined;

  return (
    <div
      className={cn("af-agc-dtl", live && "is-live", className)}
      style={style}
    >
      <div className="af-agc-dtl__head">
        <div className="af-agc-dtl__head-left">
          <AgentPixelMark
            seed={agent.id}
            size={14}
            color="#0190fe"
            twinkle={live}
          />
          <div className="af-agc-dtl__ident">
            <div className="af-agc-dtl__title-row">
              <span className="af-agc-dtl__title">{title ?? agent.name}</span>
              {context ? (
                <span className="af-agc-dtl__ctx">· {context}</span>
              ) : null}
            </div>
            <div className="af-agc-dtl__sub">{statusSubtitle}</div>
          </div>
        </div>

        <div className="af-agc-dtl__totals">
          <span className="af-agc-dtl__pill is-add">+{totalAdded}</span>
          <span className="af-agc-dtl__pill is-del">−{totalRemoved}</span>
          <span className="af-agc-dtl__across">
            across {fileRows.length} {fileRows.length === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      <div className="af-agc-dtl__chart-wrap">
        <div className="af-agc-dtl__y-scale" aria-hidden="true">
          {yTicks.map((val) => (
            <span key={val}>{val}</span>
          ))}
        </div>

        <div className="af-agc-dtl__plot-col">
          <div
            ref={plotRef}
            className="af-agc-dtl__plot"
            tabIndex={0}
            role="slider"
            aria-label="Inspect edit timeline"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, cumulative.length - 1)}
            aria-valuenow={inspectedIdx ?? Math.max(0, cumulative.length - 1)}
            aria-valuetext={
              inspected
                ? `${inspected.edit.file} at ${formatClock(inspected.at)}`
                : `${fileRows.length} files edited`
            }
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handlePlotClick}
            onKeyDown={handlePlotKeyDown}
          >
            <svg
              className="af-agc-dtl__svg"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={`dtl-add-${uid}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="var(--af-dtl-add)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--af-dtl-add)" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient
                  id={`dtl-del-${uid}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="var(--af-dtl-del)" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="var(--af-dtl-del)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {yTicks.slice(0, -1).map((val) => {
                const y = toY(val);
                return (
                  <line
                    key={val}
                    x1={0}
                    y1={y}
                    x2={W}
                    y2={y}
                    stroke="var(--af-dtl-grid)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <line
                x1={0}
                y1={chartGeom.baseY}
                x2={W}
                y2={chartGeom.baseY}
                stroke="var(--af-dtl-baseline)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />

              {cumulative.length > 0 ? (
                <>
                  <path d={chartGeom.addArea} fill={`url(#dtl-add-${uid})`} />
                  <path d={chartGeom.delArea} fill={`url(#dtl-del-${uid})`} />
                  <path
                    d={chartGeom.netLine}
                    fill="none"
                    stroke="var(--af-dtl-net)"
                    strokeWidth="1.25"
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={chartGeom.delLine}
                    fill="none"
                    stroke="var(--af-dtl-del)"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={chartGeom.addLine}
                    fill="none"
                    stroke="var(--af-dtl-add)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
            </svg>

            {cumulative.length > 0 ? (
              <>
                <span
                  className={cn("af-agc-dtl__end-dot is-add", live && "is-live")}
                  style={{
                    left: `${(chartGeom.lastAdd.x / W) * 100}%`,
                    top: `${(chartGeom.lastAdd.y / H) * 100}%`,
                  }}
                />
                <span
                  className={cn("af-agc-dtl__end-dot is-del", live && "is-live")}
                  style={{
                    left: `${(chartGeom.lastDel.x / W) * 100}%`,
                    top: `${(chartGeom.lastDel.y / H) * 100}%`,
                  }}
                />
              </>
            ) : null}

            {inspected ? (
              <>
                <div
                  className="af-agc-dtl__guide"
                  style={{ left: `${inspectedPct}%` }}
                />
                <span
                  className="af-agc-dtl__focus-dot is-add"
                  style={{
                    left: `${inspectedPct}%`,
                    top: `${(toY(inspected.add) / H) * 100}%`,
                  }}
                />
                <span
                  className="af-agc-dtl__focus-dot is-del"
                  style={{
                    left: `${inspectedPct}%`,
                    top: `${(toY(inspected.del) / H) * 100}%`,
                  }}
                />
                <div
                  className={cn(
                    "af-agc-dtl__tip",
                    inspectedPct > 56 && "is-right",
                  )}
                  style={{
                    left:
                      inspectedPct > 56
                        ? `calc(${inspectedPct}% - 246px)`
                        : `calc(${inspectedPct}% + 10px)`,
                  }}
                >
                  <div className="af-agc-dtl__tip-head">
                    <span className="af-agc-dtl__tip-file">
                      {splitPath(inspected.edit.file).base}
                    </span>
                    <span className="af-agc-dtl__tip-time">
                      {formatClock(inspected.at)}
                    </span>
                  </div>
                  <div className="af-agc-dtl__tip-counts">
                    <span className="is-add">+{inspected.edit.added}</span>
                    <span className="is-del">−{inspected.edit.removed}</span>
                    <span className="af-agc-dtl__tip-path">
                      {inspected.edit.file}
                    </span>
                  </div>
                  {inspected.edit.summary ? (
                    <div className="af-agc-dtl__tip-note">
                      {inspected.edit.summary}
                    </div>
                  ) : null}
                  {inspected.edit.diff && inspected.edit.diff.length > 0 ? (
                    <div className="af-agc-dtl__tip-diff">
                      {inspected.edit.diff.slice(0, 3).map((line, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "af-agc-dtl__tip-line",
                            `is-${line.type}`,
                          )}
                        >
                          <span className="af-agc-dtl__tip-sig">
                            {line.type === "add"
                              ? "+"
                              : line.type === "del"
                                ? "−"
                                : " "}
                          </span>
                          <code>{line.text}</code>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="af-agc-dtl__x-scale" aria-hidden="true">
            {xTicks.map((tick) => (
              <span key={tick.sec}>{tick.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="af-agc-dtl__files"
        style={{
          maxHeight: maxRows * 30 + 8,
          minHeight: reservedFilesMinH,
        }}
      >
        {fileRows.map((row) => {
          const parts = splitPath(row.file);
          const addWidth = (row.added / maxFileTotal) * 100;
          const delWidth = (row.removed / maxFileTotal) * 100;
          const isSelected = inspected?.edit.file === row.file;
          return (
            <button
              key={row.file}
              type="button"
              className={cn("af-agc-dtl__file-row", isSelected && "is-selected")}
              onClick={() =>
                setPinnedIdx((prev) =>
                  prev === row.lastIdx ? null : row.lastIdx,
                )
              }
            >
              <FileTypeGlyph path={row.file} />
              <span className="af-agc-dtl__file-name">
                {parts.dir ? (
                  <span className="af-agc-dtl__file-dir">{parts.dir}</span>
                ) : null}
                <span className="af-agc-dtl__file-base">{parts.base}</span>
              </span>
              <span className="af-agc-dtl__bar" aria-hidden="true">
                {row.added > 0 ? (
                  <span
                    className="af-agc-dtl__bar-add"
                    style={{ width: `${Math.max(6, addWidth)}%` }}
                  />
                ) : null}
                {row.removed > 0 ? (
                  <span
                    className="af-agc-dtl__bar-del"
                    style={{ width: `${Math.max(4, delWidth)}%` }}
                  />
                ) : null}
              </span>
              <span className="af-agc-dtl__file-nums">
                <span className="is-add">+{row.added}</span>
                <span className="is-del">−{row.removed}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="af-agc-dtl__foot">
        <span className="af-agc-dtl__key">
          <span className="af-agc-dtl__key-line is-add" />
          Added
        </span>
        <span className="af-agc-dtl__key">
          <span className="af-agc-dtl__key-line is-del" />
          Removed
        </span>
        <span className="af-agc-dtl__key">
          <span className="af-agc-dtl__key-line is-net" />
          Net {netDelta >= 0 ? `+${netDelta}` : `−${Math.abs(netDelta)}`}
        </span>
      </div>
    </div>
  );
}

export const AfDiffTimelinePattern = AfDiffTimeline;
export type AfDiffTimelinePatternProps = AfDiffTimelineProps;
