import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AffectIconKey } from "../../model";
import {
  BACKPRESSURE,
  BrandLogo,
  DEPTH_MAX,
  QUEUE_RUNNING,
  QUEUE_SEED,
  QUEUE_WORKERS,
  ScaledStage,
  usePrefersReducedMotion,
  type BrandKey,
  type QueueJob,
  type QueueKind,
  type QueueState,
} from "../_shared/agents-a";

export type { QueueJob, QueueState };

export type QueueWorkerItem = {
  name: string;
  icon?: AffectIconKey;
  brand?: BrandKey;
};

export interface AfAgentQueueProps {
  /** Queue slug shown in the header. */
  queueName?: string;
  /** Initial worker count (1..6). */
  defaultSlots?: number;
  /** Initial queued jobs. */
  initialQueued?: QueueJob[];
  /** Worker definitions. */
  workers?: QueueWorkerItem[];
  /** Pause live simulation initially. */
  defaultPaused?: boolean;
  className?: string;
}

export type AfAgentQueuePatternProps = AfAgentQueueProps;

type LiveCard = {
  job: QueueJob;
  phase: "queued" | "running" | "done" | "failed";
  slot: number;
  progress: number;
  elapsedSec: number;
  waitedSec: number;
};

const KIND_SUBTITLE: Record<QueueKind, string> = {
  llm: "LLM call",
  tool: "Tool call",
  agent: "Sub-agent",
  human: "Human review",
};

const APP_BRANDS = new Set<BrandKey>([
  "claude",
  "openai",
  "gemini",
  "mistral",
  "notion",
  "github",
  "slack",
  "hubspot",
  "stripe",
  "linear",
  "figma",
  "google",
  "gmail",
  "drive",
  "postgres",
  "database",
  "search",
]);

const JOB_POOL: Omit<QueueJob, "id">[] = [
  { name: "Summarize ticket #4964", kind: "llm", brand: "llm", priority: "normal", attempt: 1 },
  { name: "Sync CRM contacts", kind: "tool", brand: "hubspot", priority: "normal", attempt: 1 },
  { name: "Update roadmap page", kind: "tool", brand: "notion", priority: "normal", attempt: 1 },
  { name: "Draft reply – Acme VIP", kind: "llm", brand: "llm", priority: "high", attempt: 1 },
  { name: "Embed 240 docs · 5/5", kind: "tool", brand: "postgres", priority: "normal", attempt: 1 },
  { name: "Open PR #500", kind: "tool", brand: "github", priority: "normal", attempt: 1 },
  { name: "Post digest to #support", kind: "tool", brand: "slack", priority: "normal", attempt: 1 },
  { name: "Approve enterprise discount", kind: "human", brand: "human", priority: "high", attempt: 1 },
  { name: "Plan Q4 migration", kind: "agent", brand: "agent", priority: "normal", attempt: 1 },
  { name: "Score lead – Tailspin", kind: "llm", brand: "llm", priority: "normal", attempt: 1 },
  { name: "Classify 12 support emails", kind: "llm", brand: "llm", priority: "normal", attempt: 2 },
];

// 64-point 96s history matching AffectUI's organic rate-limit bursts & drains
const INITIAL_DEPTH: number[] = [
  12, 13, 14, 15, 16, 15, 14, 12,
  11, 8, 9, 7, 6, 4, 5, 3,
  2, 0, 4, 4, 2, 0, 0, 1,
  3, 10, 11, 13, 14, 13, 11, 10,
  8, 7, 6, 5, 4, 3, 4, 2,
  1, 2, 5, 5, 3, 3, 4, 5,
  8, 15, 16, 18, 20, 19, 17, 16,
  13, 11, 12, 9, 7, 4, 5, 3,
];

const HISTORY_POINTS = INITIAL_DEPTH.length;

const INITIAL_BANDS: boolean[] = INITIAL_DEPTH.map(
  (_, idx) => idx <= 4 || (idx >= 23 && idx <= 29) || (idx >= 47 && idx <= 53),
);

const INITIAL_ELAPSED = [1.0, 1.4, 0.5, 1.4, 0.8, 0.6];
const INITIAL_WAITED = [2.1, 0.9, 0.3, 0.2, 0.1];

function resolveJobBrand(job: QueueJob): BrandKey {
  if (job.brand) return job.brand;
  return job.kind;
}

function buildSmoothStepPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)}`;
  let d = `M${pts[0]!.x.toFixed(2)},${pts[0]!.y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i]!;
    const p1 = pts[i + 1]!;
    const mx = ((p0.x + p1.x) / 2).toFixed(2);
    d += ` C${mx},${p0.y.toFixed(2)} ${mx},${p1.y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }
  return d;
}

export function AfAgentQueue({
  queueName = "agent-jobs",
  defaultSlots = 4,
  initialQueued = QUEUE_SEED,
  workers = QUEUE_WORKERS,
  defaultPaused = false,
  className,
}: AfAgentQueueProps = {}) {
  const uid = useId().replace(/:/g, "");
  const reducedMotion = usePrefersReducedMotion();

  const [slots, setSlots] = useState(() => Math.max(1, Math.min(6, defaultSlots)));
  const [paused, setPaused] = useState(defaultPaused);
  const [limitSec, setLimitSec] = useState(0);
  const [doneCount, setDoneCount] = useState(132);
  const [failedCount, setFailedCount] = useState(3);
  const [pulseBin, setPulseBin] = useState<"done" | "failed" | null>(null);
  const [depth, setDepth] = useState<number[]>(INITIAL_DEPTH);
  const [bands, setBands] = useState<boolean[]>(INITIAL_BANDS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const seqRef = useRef(100);
  const poolIdxRef = useRef(0);
  const tickCountRef = useRef(0);

  const [cards, setCards] = useState<LiveCard[]>(() => {
    const clampedSlots = Math.max(1, Math.min(6, defaultSlots));
    const seededRunning: LiveCard[] = QUEUE_RUNNING.slice(0, clampedSlots).map((r, idx) => ({
      job: r.job,
      phase: "running",
      slot: r.slot,
      progress: r.progress,
      elapsedSec: INITIAL_ELAPSED[idx] ?? Number((r.progress * 1.8).toFixed(1)),
      waitedSec: INITIAL_WAITED[idx] ?? 0.6,
    }));
    const seededQueued: LiveCard[] = initialQueued.map((q, idx) => ({
      job: q,
      phase: "queued",
      slot: -1,
      progress: 0,
      elapsedSec: 0,
      waitedSec:
        q === QUEUE_SEED[idx]
          ? (INITIAL_WAITED[idx] ?? 0.4)
          : q.waitedSec !== undefined
            ? q.waitedSec
            : Number(Math.max(0.2, 2.1 - idx * 0.6).toFixed(1)),
    }));
    return [...seededQueued, ...seededRunning];
  });

  // Live simulation loop: single-overlay flights Queue -> Workers -> Done/Failed
  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      tickCountRef.current += 1;
      const tick = tickCountRef.current;

      setLimitSec((prevLimit) => {
        const nextLimit = prevLimit > 0 ? prevLimit - 1 : tick % 24 === 16 ? 4 : 0;

        setCards((prev) => {
          let next = prev.filter((c) => c.phase === "queued" || c.phase === "running");

          if (nextLimit > 0) {
            next = next.map((c) =>
              c.phase === "queued" ? { ...c, waitedSec: Number((c.waitedSec + 0.6).toFixed(1)) } : c,
            );
            const qCount = next.filter((c) => c.phase === "queued").length;
            if (qCount < 7 && tick % 2 === 0) {
              const tpl = JOB_POOL[poolIdxRef.current % JOB_POOL.length]!;
              poolIdxRef.current += 1;
              seqRef.current += 1;
              next.push({
                job: { ...tpl, id: `job-${seqRef.current}` },
                phase: "queued",
                slot: -1,
                progress: 0,
                elapsedSec: 0,
                waitedSec: 0.2,
              });
            }
          } else {
            let addDone = 0;
            let addFail = 0;
            const busySlots = new Set<number>();

            next = next.map((c) => {
              if (c.phase === "queued") {
                return { ...c, waitedSec: Number((c.waitedSec + 0.5).toFixed(1)) };
              }
              if (c.slot >= slots) {
                return { ...c, phase: "queued", slot: -1, progress: 0 };
              }
              const speed: Record<QueueKind, number> = {
                llm: 0.2,
                tool: 0.26,
                agent: 0.16,
                human: 0.18,
              };
              const nextProg = c.progress + speed[c.job.kind];
              if (nextProg >= 1) {
                const shouldFail = seqRef.current % 13 === 0 && c.job.kind === "tool";
                if (shouldFail) addFail += 1;
                else addDone += 1;
                return {
                  ...c,
                  phase: shouldFail ? "failed" : "done",
                  progress: 1,
                };
              }
              busySlots.add(c.slot);
              return {
                ...c,
                progress: nextProg,
                elapsedSec: Number((c.elapsedSec + 0.4).toFixed(1)),
              };
            });

            if (addDone > 0) {
              setDoneCount((d) => d + addDone);
              setPulseBin("done");
              window.setTimeout(() => setPulseBin((p) => (p === "done" ? null : p)), 420);
            }
            if (addFail > 0) {
              setFailedCount((f) => f + addFail);
              setPulseBin("failed");
              window.setTimeout(() => setPulseBin((p) => (p === "failed" ? null : p)), 420);
            }

            // Promote queued cards into free worker slots
            for (let s = 0; s < slots; s += 1) {
              if (busySlots.has(s)) continue;
              const qIdx = next.findIndex((c) => c.phase === "queued");
              if (qIdx === -1) break;
              const promoted = next[qIdx]!;
              next[qIdx] = {
                ...promoted,
                phase: "running",
                slot: s,
                progress: 0.14,
                elapsedSec: 0.2,
              };
              busySlots.add(s);
            }

            // Replenish queue smoothly so stage stays lively
            const remainingQueued = next.filter((c) => c.phase === "queued").length;
            if (remainingQueued < 3) {
              const tpl = JOB_POOL[poolIdxRef.current % JOB_POOL.length]!;
              poolIdxRef.current += 1;
              seqRef.current += 1;
              next.push({
                job: { ...tpl, id: `job-${seqRef.current}` },
                phase: "queued",
                slot: -1,
                progress: 0,
                elapsedSec: 0,
                waitedSec: 0.2,
              });
            }
          }

          const waitingDepth = next.filter((c) => c.phase === "queued").length;
          const plotted = nextLimit > 0 ? Math.min(DEPTH_MAX, waitingDepth + 9) : waitingDepth;
          setDepth((d) => [...d.slice(-(HISTORY_POINTS - 1)), Math.min(DEPTH_MAX, plotted)]);
          setBands((b) => [...b.slice(-(HISTORY_POINTS - 1)), nextLimit > 0]);

          return next;
        });

        return nextLimit;
      });
    }, 1350);

    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slots]);

  const updateSlots = (delta: number) => {
    setSlots((prev) => {
      const nextSlots = Math.max(1, Math.min(6, prev + delta));
      setCards((curr) =>
        curr.map((c) =>
          c.phase === "running" && c.slot >= nextSlots
            ? { ...c, phase: "queued", slot: -1, progress: 0 }
            : c,
        ),
      );
      return nextSlots;
    });
  };

  const queuedCards = useMemo(() => cards.filter((c) => c.phase === "queued"), [cards]);
  const runningCards = useMemo(() => cards.filter((c) => c.phase === "running"), [cards]);
  const orderedCards = useMemo(() => {
    const active = cards.filter((c) => c.phase === "queued" || c.phase === "running");
    const exiting = cards.filter((c) => c.phase === "done" || c.phase === "failed");
    return [...active, ...exiting];
  }, [cards]);

  const slotStride = slots <= 4 ? 46 : slots === 5 ? 36 : 30;
  const slotHeight = slots <= 4 ? 40 : slots === 5 ? 32 : 26;
  const railHeight = Math.max(20, slotHeight - 12);
  const railOffsetY = Math.round((slotHeight - railHeight) / 2);

  const throughput = paused ? 0 : limitSec > 0 ? 22 : Math.round(slots * 19.5);
  const p95Wait = useMemo(() => {
    if (limitSec > 0) return 19;
    if (queuedCards.length === 0) return 6;
    return Math.min(42, Math.max(13, Math.round(10 + queuedCards.length)));
  }, [queuedCards.length, limitSec]);

  const selectedCard = useMemo(
    () =>
      selectedId
        ? (cards.find((c) => c.job.id === selectedId && (c.phase === "queued" || c.phase === "running")) ?? null)
        : null,
    [cards, selectedId],
  );

  const moveToFront = (jobId: string) => {
    setCards((prev) => {
      const target = prev.find((c) => c.job.id === jobId && c.phase === "queued");
      if (!target) return prev;
      const rest = prev.filter((c) => c.job.id !== jobId);
      const firstQ = rest.findIndex((c) => c.phase === "queued");
      const promoted: LiveCard = { ...target, job: { ...target.job, priority: "high" } };
      if (firstQ === -1) return [promoted, ...rest];
      return [...rest.slice(0, firstQ), promoted, ...rest.slice(firstQ)];
    });
  };

  const cancelJob = (jobId: string) => {
    setCards((prev) => prev.filter((c) => c.job.id !== jobId));
    setSelectedId(null);
  };

  // Build 698x112 SVG area + stroke + warm rate-limit bands + backpressure line
  const chartGeom = useMemo(() => {
    const W = 698;
    const H = 112;
    const n = Math.max(2, depth.length);
    const pts = depth.map((val, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - (Math.min(DEPTH_MAX, Math.max(0, val)) / DEPTH_MAX) * H;
      return { x, y };
    });
    const lineD = buildSmoothStepPath(pts);
    const areaD = `${lineD} L${W.toFixed(1)},${H} L0,${H} Z`;
    const lastVal = depth[depth.length - 1] ?? 3;
    const lastBottomPct = (Math.min(DEPTH_MAX, Math.max(0, lastVal)) / DEPTH_MAX) * 100;

    const bandRects: { x: number; w: number }[] = [];
    let startIdx = -1;
    for (let i = 0; i <= bands.length; i += 1) {
      const on = Boolean(bands[i]);
      if (on && startIdx === -1) startIdx = i;
      if (!on && startIdx !== -1) {
        const x1 = (startIdx / (n - 1)) * W;
        const x2 = (Math.min(n - 1, i) / (n - 1)) * W;
        bandRects.push({ x: x1, w: Math.max(8, x2 - x1) });
        startIdx = -1;
      }
    }

    return {
      W,
      H,
      lineD,
      areaD,
      lastBottomPct,
      bandRects,
      backY: H - (BACKPRESSURE / DEPTH_MAX) * H,
    };
  }, [depth, bands]);

  const pillTone = paused ? "paused" : limitSec > 0 ? "amber" : "live";
  const pillLabel = paused ? "Paused" : limitSec > 0 ? `Rate limited · ${limitSec}s` : "Live";

  const selectedQueuedIndex = selectedCard
    ? queuedCards.findIndex((q) => q.job.id === selectedCard.job.id)
    : -1;

  return (
    <section
      className={["af-agqc", className].filter(Boolean).join(" ")}
      data-state={pillTone}
      aria-label={`Queue ${queueName}`}
    >
      {/* Header: Queue + agent-jobs + blue Live pill + Pause/Resume + Workers stepper */}
      <header className="af-agqc__head">
        <div className="af-agqc__head-left">
          <span className="af-agqc__mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 18H6C5.06 18 4.59 18 4.29 17.71C4 17.41 4 16.94 4 16C4 15.06 4 14.59 4.29 14.29C4.59 14 5.06 14 6 14H18C18.94 14 19.41 14 19.71 14.29C20 14.59 20 15.06 20 16C20 16.94 20 17.41 19.71 17.71C19.41 18 18.94 18 18 18Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M4 10H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="af-agqc__title">Queue</span>
          <span className="af-agqc__slug">{queueName}</span>
          <span className="af-agqc__pill" data-tone={pillTone}>
            {pillTone !== "paused" ? <span className="af-agqc__dot" aria-hidden="true" /> : null}
            {pillLabel}
          </span>
        </div>

        <div className="af-agqc__controls">
          <button
            type="button"
            className="af-agqc__btn"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
          >
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7C4 5.59 4 4.88 4.44 4.44C4.88 4 5.59 4 7 4C8.41 4 9.12 4 9.56 4.44C10 4.88 10 5.59 10 7V17C10 18.41 10 19.12 9.56 19.56C9.12 20 8.41 20 7 20C5.59 20 4.88 20 4.44 19.56C4 19.12 4 18.41 4 17V7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M14 7C14 5.59 14 4.88 14.44 4.44C14.88 4 15.59 4 17 4C18.41 4 19.12 4 19.56 4.44C20 4.88 20 5.59 20 7V17C20 18.41 20 19.12 19.56 19.56C19.12 20 18.41 20 17 20C15.59 20 14.88 20 14.44 19.56C14 19.12 14 18.41 14 17V7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            )}
            <span>{paused ? "Resume" : "Pause"}</span>
          </button>

          <div className="af-agqc__stepper" role="group" aria-label="Workers">
            <button
              type="button"
              className="af-agqc__step-btn"
              aria-label="Decrease workers"
              disabled={slots <= 1}
              onClick={() => updateSlots(-1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <span className="af-agqc__step-val">{slots}</span>
            <button
              type="button"
              className="af-agqc__step-btn"
              aria-label="Increase workers"
              disabled={slots >= 6}
              onClick={() => updateSlots(1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 4-Column Stats Bar */}
      <div className="af-agqc__stats">
        <div className="af-agqc__stat">
          <span className="af-agqc__stat-label">Waiting</span>
          <span
            className="af-agqc__stat-val"
            data-warn={queuedCards.length >= BACKPRESSURE ? "true" : undefined}
          >
            {queuedCards.length}
          </span>
        </div>
        <div className="af-agqc__stat">
          <span className="af-agqc__stat-label">Running</span>
          <span className="af-agqc__stat-val">
            {runningCards.length}
            <span className="af-agqc__of">/{slots}</span>
          </span>
        </div>
        <div className="af-agqc__stat">
          <span className="af-agqc__stat-label">Throughput</span>
          <span className="af-agqc__stat-val">
            {throughput}
            <span className="af-agqc__of">/min</span>
          </span>
        </div>
        <div className="af-agqc__stat">
          <span className="af-agqc__stat-label">Wait p95</span>
          <span className="af-agqc__stat-val">{p95Wait}s</span>
        </div>
      </div>

      {/* 756x236 Scaled Single-Overlay Flow Stage */}
      <ScaledStage designWidth={756} designHeight={236} className="af-agqc__stage-wrap" innerClassName="af-agqc__stage">
        <div className="af-agqc__col-head" style={{ left: 16, width: 197 }}>
          <span>Queue</span>
          <b className="af-agqc__col-count">{queuedCards.length}</b>
          {queuedCards.length > 5 ? (
            <span className="af-agqc__col-more">+{queuedCards.length - 5}</span>
          ) : null}
        </div>
        <div className="af-agqc__col-head" style={{ left: 237, width: 387 }}>
          <span>Workers</span>
          <b className="af-agqc__col-count">
            {runningCards.length}/{slots}
          </b>
        </div>

        {/* Queue empty state well */}
        {queuedCards.length === 0 ? (
          <div className="af-agqc__well" aria-hidden="true">
            Queue clear
          </div>
        ) : null}

        {/* Worker Slot Rows: Left = [Model Logo + Model Name], Right = [Job Rail] */}
        {Array.from({ length: slots }).map((_, idx) => {
          const worker = workers[idx % workers.length] ?? {
            name: `Worker ${idx + 1}`,
            brand: "claude" as const,
          };
          const isBusy = runningCards.some((c) => c.slot === idx);
          return (
            <div
              key={`slot-${idx}`}
              className="af-agqc__slot"
              data-busy={isBusy ? "true" : undefined}
              data-compact={slots >= 5 ? "true" : undefined}
              style={{ top: 40 + idx * slotStride, height: slotHeight }}
            >
              <span className="af-agqc__who">
                <span className="af-agqc__logo">
                  <BrandLogo kind={worker.brand ?? "claude"} />
                </span>
                <span className="af-agqc__who-name">{worker.name}</span>
              </span>
              <span
                className="af-agqc__rail"
                style={{ top: railOffsetY, height: railHeight }}
                aria-hidden="true"
              >
                {!isBusy && paused ? "Paused" : null}
              </span>
            </div>
          );
        })}

        {/* Done & Failed Neutral Wash Bins */}
        <div className="af-agqc__bin" data-kind="done" data-pulse={pulseBin === "done" ? "true" : undefined}>
          <div className="af-agqc__bin-top">
            <span className="af-agqc__bin-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 14L8.5 17.5L19 6.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="af-agqc__bin-label">Done</span>
          </div>
          <span className="af-agqc__bin-num">{doneCount}</span>
        </div>

        <div className="af-agqc__bin" data-kind="failed" data-pulse={pulseBin === "failed" ? "true" : undefined}>
          <div className="af-agqc__bin-top">
            <span className="af-agqc__bin-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M18 18L6 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="af-agqc__bin-label">Failed</span>
          </div>
          <span className="af-agqc__bin-num">{failedCount}</span>
        </div>

        {/* Single-Overlay Flying Job Pills */}
        {orderedCards.map((card) => {
          let x = 16;
          let y = 40;
          let w = 197;
          let h = 28;
          let opacity = 1;

          if (card.phase === "queued") {
            const qIndex = queuedCards.findIndex((q) => q.job.id === card.job.id);
            if (qIndex >= 5) {
              x = 16;
              y = 40 + 5 * 32;
              opacity = 0;
            } else {
              x = 16;
              y = 40 + Math.max(0, qIndex) * 32;
              w = 197;
              h = 28;
            }
          } else if (card.phase === "running") {
            x = 392;
            y = 40 + card.slot * slotStride + railOffsetY;
            w = 226;
            h = railHeight;
          } else if (card.phase === "done") {
            x = 660;
            y = 52;
            w = 16;
            h = 16;
            opacity = 0;
          } else {
            x = 660;
            y = 145;
            w = 16;
            h = 16;
            opacity = 0;
          }

          const brand = resolveJobBrand(card.job);
          const hasLogoTile = APP_BRANDS.has(brand);
          const isHalted = card.phase === "running" && (paused || limitSec > 0);
          const progPct = card.phase === "running" ? Math.max(0.06, Math.min(1, card.progress)) : 0;

          return (
            <div
              key={card.job.id}
              role="button"
              tabIndex={opacity === 0 ? -1 : 0}
              className="af-agqc__job"
              data-kind={card.job.kind}
              data-phase={card.phase}
              data-halted={isHalted ? "true" : undefined}
              data-limited={card.phase === "running" && limitSec > 0 ? "true" : undefined}
              data-selected={selectedId === card.job.id ? "true" : undefined}
              style={
                {
                  transform: `translate(${x}px, ${y}px)`,
                  width: w,
                  height: h,
                  opacity,
                  pointerEvents: opacity === 0 ? "none" : undefined,
                  "--p": progPct,
                } as CSSProperties
              }
              onClick={() => setSelectedId((curr) => (curr === card.job.id ? null : card.job.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId((curr) => (curr === card.job.id ? null : card.job.id));
                }
              }}
            >
              {card.phase === "running" ? (
                <span
                  className="af-agqc__job-fill"
                  style={{ width: `${Math.round(progPct * 100)}%` }}
                  aria-hidden="true"
                />
              ) : null}

              <span className="af-agqc__job-in">
                <span className="af-agqc__job-icon" data-logo={hasLogoTile ? "true" : undefined}>
                  <BrandLogo kind={brand} />
                </span>

                <span className="af-agqc__job-name">{card.job.name}</span>

                {card.job.priority === "high" ? (
                  <span className="af-agqc__prio" title="High priority">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 5.5V19M18 11L12 5L6 11"
                        stroke="currentColor"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : null}

                <span className="af-agqc__job-meta">
                  {card.phase === "queued"
                    ? `${card.waitedSec.toFixed(1)}s`
                    : `${card.elapsedSec.toFixed(1)}s`}
                </span>
              </span>
            </div>
          );
        })}

        {/* Two-Column Job Detail Popover */}
        {selectedCard ? (
          <div
            key={`${selectedCard.phase}-${selectedCard.job.id}`}
            className="af-agqc__pop"
            role="dialog"
            data-kind={selectedCard.job.kind}
            aria-label={selectedCard.job.name}
            style={{
              left: selectedCard.phase === "queued" ? 222 : 126,
              top: 36,
            }}
          >
            <div className="af-agqc__pop-head">
              <span
                className="af-agqc__pop-icon"
                data-logo={APP_BRANDS.has(resolveJobBrand(selectedCard.job)) ? "true" : undefined}
              >
                <BrandLogo kind={resolveJobBrand(selectedCard.job)} />
              </span>
              <div className="af-agqc__pop-who">
                <span className="af-agqc__pop-title">{selectedCard.job.name}</span>
                <span className="af-agqc__pop-kind">{KIND_SUBTITLE[selectedCard.job.kind]}</span>
              </div>
              <span className="af-agqc__pop-state">
                {selectedCard.phase === "queued"
                  ? "Waiting"
                  : limitSec > 0 || paused
                    ? "Paused"
                    : "Running"}
              </span>
              <button
                type="button"
                className="af-agqc__pop-close"
                aria-label="Close details"
                onClick={() => setSelectedId(null)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="af-agqc__pop-meta">
              <div className="af-agqc__pop-kv">
                <span className="af-agqc__pop-k">
                  {selectedCard.phase === "queued" ? "Waiting" : "Running"}
                </span>
                <span className="af-agqc__pop-v">
                  {selectedCard.phase === "queued"
                    ? `${selectedCard.waitedSec.toFixed(1)}s`
                    : `${selectedCard.elapsedSec.toFixed(1)}s`}
                </span>
              </div>
              <div className="af-agqc__pop-kv">
                <span className="af-agqc__pop-k">
                  {selectedCard.phase === "queued" ? "Position" : "Worker"}
                </span>
                <span className="af-agqc__pop-v">
                  {selectedCard.phase === "queued"
                    ? `${Math.max(1, selectedQueuedIndex + 1)} of ${Math.max(1, queuedCards.length)}`
                    : (workers[selectedCard.slot % workers.length]?.name ??
                      `Worker ${selectedCard.slot + 1}`)}
                </span>
              </div>
              <div className="af-agqc__pop-kv">
                <span className="af-agqc__pop-k">Priority</span>
                <span className="af-agqc__pop-v" style={{ textTransform: "capitalize" }}>
                  {selectedCard.job.priority}
                </span>
              </div>
              <div className="af-agqc__pop-kv">
                <span className="af-agqc__pop-k">Attempt</span>
                <span className="af-agqc__pop-v">{selectedCard.job.attempt ?? 1} of 3</span>
              </div>
            </div>

            <div className="af-agqc__pop-actions">
              {selectedCard.phase === "queued" ? (
                <button
                  type="button"
                  className="af-agqc__pop-btn"
                  onClick={() => moveToFront(selectedCard.job.id)}
                >
                  Move to front
                </button>
              ) : null}
              <button
                type="button"
                className="af-agqc__pop-btn"
                data-danger="true"
                onClick={() => cancelJob(selectedCard.job.id)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </ScaledStage>

      {/* Bottom Queue Depth Chart */}
      <div className="af-agqc__chart">
        <div className="af-agqc__chart-head">
          <span className="af-agqc__chart-title">Queue depth</span>
        </div>

        <div className="af-agqc__chart-plot">
          <span className="af-agqc__grid-line" data-at="top" aria-hidden="true">
            <span>{DEPTH_MAX}</span>
          </span>
          <span className="af-agqc__bp-label" aria-hidden="true">
            {BACKPRESSURE}
          </span>
          <span className="af-agqc__grid-line" data-at="zero" aria-hidden="true">
            <span>0</span>
          </span>

          <svg
            className="af-agqc__chart-svg"
            viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`agq-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--agq-depth-fill)" />
                <stop offset="100%" stopColor="var(--agq-depth-fade)" />
              </linearGradient>
            </defs>

            {chartGeom.bandRects.map((b, idx) => (
              <rect
                key={`band-${idx}`}
                x={b.x}
                y={0}
                width={b.w}
                height={chartGeom.H}
                fill="var(--agq-warn)"
                opacity="0.075"
              />
            ))}

            <line
              x1={0}
              y1={chartGeom.backY}
              x2={chartGeom.W}
              y2={chartGeom.backY}
              stroke="var(--agq-faint)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />

            <path d={chartGeom.areaD} fill={`url(#agq-area-${uid})`} />
            <path
              d={chartGeom.lineD}
              fill="none"
              stroke="var(--agq-depth)"
              strokeWidth="1.25"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span
            className="af-agqc__chart-dot"
            style={{ bottom: `calc(${chartGeom.lastBottomPct.toFixed(2)}% - 3px)` }}
            aria-hidden="true"
          />
        </div>

        <div className="af-agqc__chart-foot" aria-hidden="true">
          <span>96s ago</span>
          <span>now</span>
        </div>
      </div>
    </section>
  );
}

export const AfAgentQueuePattern = AfAgentQueue;
