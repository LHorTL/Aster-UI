import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn, useControllableState } from "../../primitives";
import { AgentPixelMark, ModelBrandMark } from "../agents-c/_marks";

export type AttemptStatus = "running" | "done" | "failed";

export interface Attempt {
  id: string;
  name: string;
  approach: string;
  model?: string;
  icon?: ReactNode;
  status: AttemptStatus;
  progress?: number;
  step?: string;
  score?: number;
  note?: string;
  took?: number | string;
  cost?: number;
}

/** Legacy compatibility interface. */
export interface AttemptCandidate {
  id: string;
  label: string;
  passedTests: number;
  totalTests: number;
  diffStat: string;
  duration: string;
  snippet: string;
}

export interface AfParallelAttemptsProps {
  /** One entry per parallel attempt, in display order. */
  attempts?: Array<Attempt | AttemptCandidate>;
  /** Shared task shown next to the title. */
  task?: string;
  /** Controlled picked attempt ID (defaults to highest-scoring finished attempt). */
  picked?: string | null;
  /** Fired when switching to another finished attempt with "Use this one". */
  onPick?: (attempt: Attempt) => void;
  /** Legacy adopt callback. */
  onAdopt?: (attempt: AttemptCandidate) => void;
  /** Formats attempt and total costs. */
  formatCost?: (amount: number) => string;
  /** Heading of the top bar (defaults to "Best of N"). */
  title?: ReactNode;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style on the root element. */
  style?: CSSProperties;
}

export type AfParallelAttemptsPatternProps = AfParallelAttemptsProps;

interface DemoTrack {
  id: string;
  name: string;
  modelKey: string;
  approach: string;
  finishAt: number;
  finalStatus: "done" | "failed";
  stopProgress: number;
  score?: number;
  note: string;
  tookLabel: string;
  finalCost: number;
  steps: Array<{ at: number; text: string }>;
}

const DEMO_DURATION_MS = 6400;

const DEMO_TRACKS: DemoTrack[] = [
  {
    id: "opus",
    name: "Opus 5.5",
    modelKey: "claude",
    approach: "Add a retry with backoff",
    finishAt: 5400,
    finalStatus: "done",
    stopProgress: 1,
    score: 96,
    note: "12/12 tests pass · 0 flakes in 20 runs",
    tookLabel: "6.4s",
    finalCost: 0.14,
    steps: [
      { at: 0, text: "Reading checkout.spec.ts" },
      { at: 1500, text: "Writing the retry" },
      { at: 3200, text: "Running 20 checkout runs" },
    ],
  },
  {
    id: "gpt6",
    name: "GPT-6 Sol",
    modelKey: "openai",
    approach: "Mock the payment API",
    finishAt: 4100,
    finalStatus: "done",
    stopProgress: 1,
    score: 82,
    note: "12/12 tests pass · skips real webhook check",
    tookLabel: "4.8s",
    finalCost: 0.09,
    steps: [
      { at: 0, text: "Reading payment.ts" },
      { at: 1300, text: "Stubbing Stripe webhook" },
      { at: 2700, text: "Running checkout.spec.ts" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini 3.8 Pro",
    modelKey: "gemini",
    approach: "Wait for the network to settle",
    finishAt: 4800,
    finalStatus: "failed",
    stopProgress: 0.62,
    note: "Timed out after 10s on SSE stream",
    tookLabel: "10.0s",
    finalCost: 0.06,
    steps: [
      { at: 0, text: "Reading checkout.spec.ts" },
      { at: 1600, text: "Adding the wait" },
      { at: 3100, text: "Waiting on /api/checkout/events" },
    ],
  },
];

function buildDemoAttempts(elapsedMs: number): Attempt[] {
  return DEMO_TRACKS.map((tr) => {
    const finished = elapsedMs >= tr.finishAt;
    const ratio = Math.min(1, Math.max(0.08, elapsedMs / tr.finishAt));
    const progress = finished ? tr.stopProgress : ratio * tr.stopProgress;
    const activeStep =
      [...tr.steps].reverse().find((s) => elapsedMs >= s.at)?.text ?? tr.steps[0].text;
    const cost = finished
      ? tr.finalCost
      : Math.max(0.02, Number((tr.finalCost * (0.2 + 0.8 * ratio)).toFixed(2)));

    return {
      id: tr.id,
      name: tr.name,
      approach: tr.approach,
      icon: <ModelBrandMark model={tr.modelKey} size={14} />,
      status: finished ? tr.finalStatus : "running",
      progress,
      step: finished ? undefined : activeStep,
      score: finished ? tr.score : undefined,
      note: finished ? tr.note : undefined,
      took: finished ? tr.tookLabel : undefined,
      cost,
    };
  });
}

function isLegacyAttempt(item: Attempt | AttemptCandidate): item is AttemptCandidate {
  return "passedTests" in item;
}

function formatTookValue(took: number | string | undefined): string | null {
  if (took === undefined) return null;
  if (typeof took === "string") return took;
  if (took >= 1000) return `${(took / 1000).toFixed(1)}s`;
  return `${Math.round(took)}ms`;
}

function resolveAttemptIcon(att: Attempt): ReactNode {
  if (att.icon) return att.icon;
  const hint = `${att.name} ${att.model ?? ""}`.toLowerCase();
  if (
    hint.includes("claude") ||
    hint.includes("opus") ||
    hint.includes("sonnet") ||
    hint.includes("haiku") ||
    hint.includes("gpt") ||
    hint.includes("openai") ||
    hint.includes("o1") ||
    hint.includes("o3") ||
    hint.includes("o4") ||
    hint.includes("gemini") ||
    hint.includes("grok") ||
    hint.includes("deepseek") ||
    hint.includes("llama")
  ) {
    return <ModelBrandMark model={hint} size={14} />;
  }
  return <AgentPixelMark seed={att.name} active={att.status === "running"} size={14} />;
}

/**
 * Parallel Attempts (affectUI Pro 1:1 `.af-pac`):
 * Best-of-N parallel race where attempts run side-by-side with live sheen bars,
 * score automatically on completion, highlight the Best winner, and let users switch picks.
 */
export function AfParallelAttempts({
  attempts: attemptsProp,
  task = "Fix the flaky checkout test",
  picked: pickedProp,
  onPick,
  onAdopt,
  formatCost = (amt) => `$${amt.toFixed(2)}`,
  title,
  className,
  style,
}: AfParallelAttemptsProps = {}) {
  const titleId = useId();
  const isDemo = !attemptsProp?.length;
  // Start at DEMO_DURATION_MS so SSR and initial static snapshot show the rich settled race,
  // while client mount runs a smooth live race replay on demand or first interactive cycle.
  const [demoElapsed, setDemoElapsed] = useState<number>(DEMO_DURATION_MS);

  useEffect(() => {
    if (!isDemo) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDemoElapsed(DEMO_DURATION_MS);
      return;
    }
    let raf = 0;
    let timer = 0;
    let startTs = performance.now() - 1100;
    setDemoElapsed(1100);

    const tick = (now: number) => {
      const next = now - startTs;
      if (next >= DEMO_DURATION_MS) {
        setDemoElapsed(DEMO_DURATION_MS);
        return;
      }
      setDemoElapsed(next);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [isDemo]);

  const normalized = useMemo<Attempt[]>(() => {
    if (isDemo) return buildDemoAttempts(demoElapsed);
    return (attemptsProp ?? []).map((item) => {
      if (!isLegacyAttempt(item)) return item;
      const ratio = item.totalTests > 0 ? item.passedTests / item.totalTests : 1;
      const allPassed = item.passedTests >= item.totalTests;
      return {
        id: item.id,
        name: item.label,
        approach: item.diffStat,
        took: item.duration,
        status: allPassed ? "done" : "failed",
        progress: ratio,
        score: Math.round(ratio * 100),
        note: `${item.passedTests}/${item.totalTests} tests pass`,
      };
    });
  }, [attemptsProp, demoElapsed, isDemo]);

  const bestId = useMemo(() => {
    let topId: string | null = null;
    let topScore = -Infinity;
    for (const a of normalized) {
      if (a.status === "done") {
        const sc = a.score ?? 0;
        if (sc > topScore) {
          topScore = sc;
          topId = a.id;
        }
      }
    }
    return topId;
  }, [normalized]);

  const [userPickedId, setUserPickedId] = useControllableState<string | null>({
    value: pickedProp,
    defaultValue: null,
  });

  const effectivePicked = useMemo(() => {
    if (pickedProp !== undefined) return pickedProp;
    if (userPickedId && normalized.some((a) => a.id === userPickedId && a.status === "done")) {
      return userPickedId;
    }
    return bestId;
  }, [bestId, normalized, pickedProp, userPickedId]);

  const finishedCount = useMemo(
    () => normalized.filter((a) => a.status !== "running").length,
    [normalized],
  );
  const allSettled = finishedCount === normalized.length && normalized.length > 0;
  const totalCost = useMemo(
    () => normalized.reduce((sum, a) => sum + (a.cost ?? 0), 0),
    [normalized],
  );
  const hasAnyCost = useMemo(() => normalized.some((a) => a.cost !== undefined), [normalized]);

  const resolvedTitle = title ?? `Best of ${normalized.length}`;

  const selectAttempt = (att: Attempt) => {
    if (att.status !== "done") return;
    setUserPickedId(att.id);
    onPick?.(att);
    if (attemptsProp) {
      const raw = attemptsProp.find((x) => x.id === att.id);
      if (raw && isLegacyAttempt(raw)) onAdopt?.(raw);
    }
  };

  return (
    <div className={cn("af-pac", className)} style={style}>
      <header className="af-pac__bar">
        <span className="af-pac__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="9" height="2.4" rx="1.2" fill="currentColor" />
            <rect
              x="1.5"
              y="6.8"
              width="12"
              height="2.4"
              rx="1.2"
              fill="currentColor"
              opacity="0.55"
            />
            <rect
              x="1.5"
              y="11.1"
              width="6"
              height="2.4"
              rx="1.2"
              fill="currentColor"
              opacity="0.3"
            />
          </svg>
        </span>
        <span className="af-pac__title" id={titleId} dir="auto">
          {resolvedTitle}
        </span>
        {task ? (
          <span className="af-pac__task" dir="auto" title={task}>
            {task}
          </span>
        ) : null}
        <span className="af-pac__sum">
          <span>
            <b>{finishedCount}</b> of {normalized.length} done
          </span>
          {hasAnyCost ? (
            <span>
              <b>{formatCost(totalCost)}</b>
            </span>
          ) : null}
        </span>
      </header>

      <div className="af-pac__panel" role="radiogroup" aria-labelledby={titleId}>
        {normalized.map((att, idx) => {
          const isBest = att.id === bestId && att.status === "done";
          const isPicked = effectivePicked !== null && att.id === effectivePicked && att.status === "done";
          const isQuiet =
            allSettled && effectivePicked !== null && !isPicked && att.status !== "running";

          const rawProgress =
            att.progress !== undefined
              ? att.progress
              : att.status === "done"
                ? 1
                : att.status === "failed"
                  ? 0.5
                  : 0.35;
          const clampedProgress = Math.min(1, Math.max(0.04, rawProgress));
          const pctLabel = `${Math.round(clampedProgress * 100)}%`;

          const subLine =
            att.status === "running"
              ? att.step ?? "Running…"
              : att.note ?? (att.status === "done" ? "Completed" : "Failed");

          const tookText = formatTookValue(att.took);
          const costText = att.cost !== undefined ? formatCost(att.cost) : null;
          const metaParts = [tookText, costText].filter(Boolean).join(" · ");

          return (
            <div
              key={att.id}
              className="af-pac__row"
              data-status={att.status}
              data-best={isBest || undefined}
              data-picked={isPicked || undefined}
              data-quiet={isQuiet || undefined}
              style={
                {
                  "--i": idx,
                  "--p": clampedProgress,
                } as CSSProperties
              }
            >
              <span className="af-pac__icon" aria-hidden="true">
                {resolveAttemptIcon(att)}
              </span>

              <div className="af-pac__who">
                <span
                  className="af-pac__name"
                  title={att.approach ? `${att.name} · ${att.approach}` : att.name}
                >
                  <span className="af-pac__name-text" dir="auto">
                    {att.name}
                  </span>
                  {att.model ? (
                    <span className="af-pac__model" dir="auto">
                      {att.model}
                    </span>
                  ) : null}
                  {att.approach ? (
                    <span className="af-pac__approach" dir="auto">
                      {att.approach}
                    </span>
                  ) : null}
                </span>
                <span className="af-pac__line" dir="auto" title={subLine}>
                  {subLine}
                </span>
              </div>

              <div className="af-pac__lane" aria-hidden="true">
                <span className="af-pac__fill" />
              </div>

              <div className="af-pac__end">
                <span className="af-pac__score">
                  {att.status === "running" ? (
                    <span className="af-pac__pct">{pctLabel}</span>
                  ) : att.status === "failed" ? (
                    <span className="af-pac__failed">
                      {att.score !== undefined ? `${att.score} · Failed` : "Failed"}
                    </span>
                  ) : (
                    <>
                      {isBest ? <span className="af-pac__best">Best</span> : null}
                      {att.score !== undefined ? <span>{att.score}</span> : <span>Done</span>}
                    </>
                  )}
                </span>

                <span className="af-pac__meta-slot">
                  {metaParts ? (
                    <span
                      className="af-pac__meta"
                      data-hide={att.status === "done" || undefined}
                    >
                      {metaParts}
                    </span>
                  ) : null}

                  {att.status === "done" ? (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isPicked}
                      aria-label={
                        att.score !== undefined
                          ? `${att.name}, score ${att.score}`
                          : att.name
                      }
                      className="af-pac__use"
                      data-on={isPicked || undefined}
                      onClick={() => selectAttempt(att)}
                    >
                      {isPicked ? (
                        <>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M3.2 8.4L6.5 11.6L12.8 4.8"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Using
                        </>
                      ) : (
                        "Use this one"
                      )}
                    </button>
                  ) : null}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ParallelAttempts = AfParallelAttempts;
export const AfParallelAttemptsPattern = AfParallelAttempts;
