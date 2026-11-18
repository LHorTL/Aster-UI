import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";

export interface PlanStep {
  id: string;
  title: string;
  /** Planned duration in ms. */
  plan: number;
  /** Prerequisite step IDs that must finish first. */
  deps?: string[];
  /** Actual start offset in ms from run start (omit while waiting). */
  start?: number;
  /** Actual end offset in ms from run start (omit while running or waiting). */
  end?: number;
  /** Optional planned cost in USD. */
  planCost?: number;
  /** Optional actual or accrued cost in USD. */
  cost?: number;
  icon?: ReactNode;
}

/** Legacy compatibility row interface. */
export interface PlanDeltaRow {
  id: string;
  planned: string;
  plannedSec: string;
  actual: string;
  actualSec: string;
  delta: "match" | "inserted" | "skipped" | "delayed";
  reason?: string;
}

export interface AfPlanVsActualProps {
  /** Ordered steps (each step listed after the steps it waits for). */
  steps?: PlanStep[];
  /** Legacy rows prop. */
  rows?: PlanDeltaRow[];
  /** Current run offset in ms from start. */
  now?: number;
  /** What the run is for, shown next to the heading. */
  task?: string;
  /** Formats axis labels, step durations, and finish flags (default `0:42`). */
  formatTime?: (ms: number) => string;
  /** Heading of the top bar (default `"Plan vs actual"`). */
  title?: ReactNode;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style on the root element. */
  style?: CSSProperties;
}

export type AfPlanVsActualPatternProps = AfPlanVsActualProps;

interface DemoStepSpec {
  id: string;
  title: string;
  plan: number;
  deps?: string[];
  realDuration: number;
  planCost: number;
  realCost: number;
}

const DEMO_SPECS: DemoStepSpec[] = [
  { id: "brief", title: "Read the brief", plan: 20000, realDuration: 16000, planCost: 0.04, realCost: 0.03 },
  { id: "copy", title: "Draft the copy", plan: 40000, deps: ["brief"], realDuration: 38000, planCost: 0.14, realCost: 0.13 },
  { id: "layout", title: "Build the layout", plan: 60000, deps: ["brief"], realDuration: 85000, planCost: 0.32, realCost: 0.44 },
  { id: "tests", title: "Write the tests", plan: 30000, deps: ["copy"], realDuration: 28000, planCost: 0.16, realCost: 0.15 },
  { id: "stripe", title: "Wire up Stripe", plan: 45000, deps: ["layout"], realDuration: 47000, planCost: 0.21, realCost: 0.22 },
  { id: "verify", title: "Run tests and fix", plan: 35000, deps: ["tests", "stripe"], realDuration: 35000, planCost: 0.12, realCost: 0.12 },
  { id: "pr", title: "Open the pull request", plan: 15000, deps: ["verify"], realDuration: 14000, planCost: 0.04, realCost: 0.04 },
];

function buildDemoTimeline(simNow: number): PlanStep[] {
  const realEnds = new Map<string, number>();
  return DEMO_SPECS.map((sp) => {
    const depReady = (sp.deps ?? []).reduce((mx, d) => Math.max(mx, realEnds.get(d) ?? 0), 0);
    const fullEnd = depReady + sp.realDuration;
    realEnds.set(sp.id, fullEnd);

    if (simNow < depReady) {
      return {
        id: sp.id,
        title: sp.title,
        plan: sp.plan,
        deps: sp.deps,
        planCost: sp.planCost,
      };
    }
    if (simNow < fullEnd) {
      const ratio = (simNow - depReady) / Math.max(1, sp.realDuration);
      return {
        id: sp.id,
        title: sp.title,
        plan: sp.plan,
        deps: sp.deps,
        start: depReady,
        planCost: sp.planCost,
        cost: Number((sp.realCost * ratio).toFixed(2)),
      };
    }
    return {
      id: sp.id,
      title: sp.title,
      plan: sp.plan,
      deps: sp.deps,
      start: depReady,
      end: fullEnd,
      planCost: sp.planCost,
      cost: sp.realCost,
    };
  });
}

function defaultFormatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface ComputedRow {
  idx: number;
  step: PlanStep;
  status: "done" | "running" | "waiting";
  planStart: number;
  planEnd: number;
  actualStart: number;
  actualEnd: number;
  expectedEnd: number;
  elapsedMs: number;
  deltaMs: number;
}

function pickNiceRange(maxMs: number): { range: number; stepMs: number } {
  const target = Math.max(60000, maxMs * 1.25);
  if (target <= 120000) return { range: Math.ceil(target / 15000) * 15000, stepMs: 15000 };
  if (target <= 300000) return { range: Math.ceil(target / 30000) * 30000, stepMs: 30000 };
  return { range: Math.ceil(target / 60000) * 60000, stepMs: 60000 };
}

/**
 * Plan vs Actual (affectUI Pro 1:1 `.af-pvac`):
 * Planned dashed ghosts vs actual execution bars with live overrun amber segments,
 * cascading dependency forecast shifts, interactive dependency connectors, and Plan/ETA flags.
 */
export function AfPlanVsActual({
  steps: stepsProp,
  rows: legacyRows,
  now: nowProp,
  task = "Ship the pricing page",
  formatTime = defaultFormatTime,
  title = "Plan vs actual",
  className,
  style,
}: AfPlanVsActualProps = {}) {
  const titleId = useId();
  const isDemo = !stepsProp && !legacyRows?.length;
  const [demoNow, setDemoNow] = useState<number>(nowProp ?? 5000);

  useEffect(() => {
    if (!isDemo || nowProp !== undefined) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setDemoNow((prev) => {
        const next = prev + 3200;
        return next > 205000 ? 5000 : next;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [isDemo, nowProp]);

  const effectiveNow = isDemo ? (nowProp ?? demoNow) : (nowProp ?? 78000);

  const steps = useMemo<PlanStep[]>(() => {
    if (legacyRows?.length && !stepsProp) {
      let prevId: string | undefined;
      let acc = 0;
      return legacyRows.map((r) => {
        const pMs = Math.max(5000, (parseFloat(r.plannedSec) || 8) * 1000);
        const aMs = Math.max(4000, (parseFloat(r.actualSec) || 8) * 1000);
        const item: PlanStep = {
          id: r.id,
          title: r.actual || r.planned,
          plan: pMs,
          deps: prevId ? [prevId] : undefined,
          start: acc,
          end: acc + aMs,
        };
        acc += aMs;
        prevId = r.id;
        return item;
      });
    }
    if (stepsProp) return stepsProp;
    return buildDemoTimeline(effectiveNow);
  }, [effectiveNow, legacyRows, stepsProp]);

  const [focusedId, setFocusedId] = useState<string | null>(null);

  const {
    computed,
    plannedFinish,
    expectedFinish,
    range,
    ticks,
    hasLiveRun,
    totalPlanCost,
    totalActualCost,
    hasCostData,
  } = useMemo(() => {
    const planEndMap = new Map<string, number>();
    const expEndMap = new Map<string, number>();
    const rows: ComputedRow[] = [];

    let pCostSum = 0;
    let aCostSum = 0;
    let anyCost = false;

    steps.forEach((st, idx) => {
      if (st.planCost !== undefined || st.cost !== undefined) {
        anyCost = true;
        pCostSum += st.planCost ?? st.cost ?? 0;
        aCostSum += st.cost ?? 0;
      }

      const planStart = (st.deps ?? []).reduce(
        (mx, depId) => Math.max(mx, planEndMap.get(depId) ?? 0),
        0,
      );
      const planEnd = planStart + st.plan;
      planEndMap.set(st.id, planEnd);

      const depExpectedReady = (st.deps ?? []).reduce(
        (mx, depId) => Math.max(mx, expEndMap.get(depId) ?? 0),
        0,
      );

      let status: "done" | "running" | "waiting" = "waiting";
      let actualStart = Math.max(effectiveNow, depExpectedReady);
      let actualEnd = actualStart;
      let expectedEnd = actualStart + st.plan;

      if (st.start !== undefined && st.end !== undefined) {
        status = "done";
        actualStart = st.start;
        actualEnd = st.end;
        expectedEnd = st.end;
      } else if (st.start !== undefined) {
        status = "running";
        actualStart = st.start;
        actualEnd = Math.max(actualStart + 500, effectiveNow);
        expectedEnd = Math.max(actualEnd, actualStart + st.plan);
      }

      expEndMap.set(st.id, expectedEnd);
      const elapsedMs =
        status === "done"
          ? actualEnd - actualStart
          : status === "running"
            ? Math.max(0, effectiveNow - actualStart)
            : st.plan;

      rows.push({
        idx,
        step: st,
        status,
        planStart,
        planEnd,
        actualStart,
        actualEnd,
        expectedEnd,
        elapsedMs,
        deltaMs: elapsedMs - st.plan,
      });
    });

    const pFin = Math.max(10000, ...planEndMap.values());
    const eFin = Math.max(10000, ...expEndMap.values());
    const { range: niceRange, stepMs } = pickNiceRange(Math.max(pFin, eFin));
    const tickList: number[] = [];
    for (let v = stepMs; v < niceRange; v += stepMs) {
      tickList.push(v);
    }

    const live = rows.some((r) => r.status !== "done");
    return {
      computed: rows,
      plannedFinish: pFin,
      expectedFinish: eFin,
      range: niceRange,
      ticks: tickList,
      hasLiveRun: live,
      totalPlanCost: pCostSum,
      totalActualCost: aCostSum,
      hasCostData: anyCost,
    };
  }, [effectiveNow, steps]);

  const slipSec = Math.round((expectedFinish - plannedFinish) / 1000);
  const verdictState: "on" | "late" | "early" =
    slipSec > 2 ? "late" : slipSec < -2 ? "early" : "on";
  const verdictText =
    verdictState === "late"
      ? `${slipSec}s behind`
      : verdictState === "early"
        ? `${Math.abs(slipSec)}s ahead`
        : "On plan";

  const { litSet, links } = useMemo(() => {
    if (!focusedId) {
      return { litSet: new Set<string>(), links: [] as Array<{ key: string; from: number; to: number; a0: number; a1: number; b0: number }> };
    }
    const rowById = new Map(computed.map((r) => [r.step.id, r]));
    const focusRow = rowById.get(focusedId);
    if (!focusRow) {
      return { litSet: new Set<string>(), links: [] };
    }
    const lit = new Set<string>([focusedId]);
    const builtLinks: Array<{ key: string; from: number; to: number; a0: number; a1: number; b0: number }> = [];

    for (const depId of focusRow.step.deps ?? []) {
      const parent = rowById.get(depId);
      if (parent && parent.idx < focusRow.idx) {
        lit.add(depId);
        builtLinks.push({
          key: `${depId}->${focusRow.step.id}`,
          from: parent.idx,
          to: focusRow.idx,
          a0: parent.actualStart,
          a1: parent.expectedEnd,
          b0: focusRow.actualStart,
        });
      }
    }

    for (const candidate of computed) {
      if (candidate.step.deps?.includes(focusedId) && focusRow.idx < candidate.idx) {
        lit.add(candidate.step.id);
        builtLinks.push({
          key: `${focusedId}->${candidate.step.id}`,
          from: focusRow.idx,
          to: candidate.idx,
          a0: focusRow.actualStart,
          a1: focusRow.expectedEnd,
          b0: candidate.actualStart,
        });
      }
    }

    return { litSet: lit, links: builtLinks };
  }, [computed, focusedId]);

  const gapStart = Math.min(plannedFinish, expectedFinish);
  const gapSpan = Math.abs(expectedFinish - plannedFinish);
  const etaHidden = Math.abs(slipSec) <= 2;

  return (
    <div
      className={cn("af-pvac", className)}
      style={
        {
          "--af-pvac-range": range,
          "--af-pvac-rows": computed.length,
          ...style,
        } as CSSProperties
      }
    >
      <header className="af-pvac__head">
        <span className="af-pvac__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="7" height="3" rx="1.5" fill="currentColor" />
            <rect
              x="5"
              y="6.5"
              width="8"
              height="3"
              rx="1.5"
              fill="currentColor"
              opacity="0.6"
            />
            <rect
              x="8.5"
              y="10.5"
              width="6"
              height="3"
              rx="1.5"
              fill="currentColor"
              opacity="0.32"
            />
          </svg>
        </span>

        <span
          className="af-pvac__title"
          id={titleId}
          dir="auto"
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </span>

        {task ? (
          <span className="af-pvac__task" dir="auto" title={task}>
            {task}
          </span>
        ) : null}

        <dl className="af-pvac__stats">
          <div className="af-pvac__stat" data-over={effectiveNow > plannedFinish || undefined}>
            <dt>Time</dt>
            <dd>
              <b className="af-pvac__live" data-live={hasLiveRun || undefined}>
                {formatTime(Math.min(effectiveNow, expectedFinish))}
              </b>
              <span> / {formatTime(plannedFinish)}</span>
            </dd>
          </div>
          {hasCostData ? (
            <div
              className="af-pvac__stat"
              data-over={totalActualCost > totalPlanCost + 0.01 || undefined}
            >
              <dt>Cost</dt>
              <dd>
                <b className="af-pvac__live" data-live={hasLiveRun || undefined}>
                  ${totalActualCost.toFixed(2)}
                </b>
                <span> / ${totalPlanCost.toFixed(2)}</span>
              </dd>
            </div>
          ) : null}
        </dl>

        <span className="af-pvac__verdict" data-state={verdictState}>
          {verdictText}
        </span>
      </header>

      <div
        className="af-pvac__body"
        role="list"
        aria-labelledby={titleId}
        data-focus={focusedId ? "" : undefined}
      >
        <div className="af-pvac__layer" aria-hidden="true">
          {ticks.map((v) => (
            <span
              key={v}
              className="af-pvac__tick"
              data-flip={v / range > 0.88 || undefined}
              style={{ "--v": v } as CSSProperties}
            >
              <span>{formatTime(v)}</span>
            </span>
          ))}

          {!etaHidden ? (
            <span
              className="af-pvac__gap"
              data-state={verdictState}
              style={{ "--s": gapStart, "--d": gapSpan } as CSSProperties}
            />
          ) : null}

          <span
            className="af-pvac__finish"
            data-kind="plan"
            data-side={expectedFinish >= plannedFinish ? "left" : "right"}
            style={{ "--v": plannedFinish } as CSSProperties}
          >
            <span>Plan {formatTime(plannedFinish)}</span>
          </span>

          <span
            className="af-pvac__finish"
            data-kind="eta"
            data-side={expectedFinish >= plannedFinish ? "right" : "left"}
            data-state={verdictState}
            data-hidden={etaHidden ? "" : undefined}
            style={{ "--v": expectedFinish } as CSSProperties}
          >
            <span>ETA {formatTime(expectedFinish)}</span>
          </span>

          {hasLiveRun ? (
            <span
              className="af-pvac__now"
              style={{ "--v": Math.min(range, effectiveNow) } as CSSProperties}
            />
          ) : null}
        </div>

        <div className="af-pvac__axis" aria-hidden="true">
          Step
        </div>

        {computed.map((row) => {
          const {
            step,
            status,
            planStart,
            actualStart,
            actualEnd,
            expectedEnd,
            elapsedMs,
            deltaMs,
          } = row;
          const plannedCapEnd = actualStart + step.plan;
          const normalActualDur = Math.max(
            0,
            Math.min(actualEnd, plannedCapEnd) - actualStart,
          );
          const overDur = Math.max(0, actualEnd - plannedCapEnd);
          const remainingForecast =
            status === "running" ? Math.max(0, plannedCapEnd - actualEnd) : 0;

          const deltaSec = Math.round(deltaMs / 1000);
          const showDiff =
            (status === "done" && Math.abs(deltaSec) >= 2) ||
            (status === "running" && deltaSec >= 2);
          const diffLabel = deltaSec > 0 ? `+${deltaSec}s` : `${deltaSec}s`;

          const tagEdge = Math.max(planStart + step.plan, expectedEnd);
          const isFocused = focusedId === step.id;
          const isLit = litSet.has(step.id);

          const ariaSummary =
            status === "done"
              ? `${step.title}: finished in ${formatTime(elapsedMs)} of ${formatTime(step.plan)} planned${
                  showDiff ? ` (${diffLabel})` : ""
                }`
              : status === "running"
                ? `${step.title}: running for ${formatTime(elapsedMs)} of ${formatTime(step.plan)} planned`
                : `${step.title}: starts in about ${formatTime(Math.max(0, actualStart - effectiveNow))}`;

          return (
            <div
              key={step.id}
              className="af-pvac__row"
              role="listitem"
              tabIndex={0}
              data-status={status}
              data-focus={isFocused || undefined}
              data-lit={isLit || undefined}
              aria-label={ariaSummary}
              onPointerEnter={() => setFocusedId(step.id)}
              onPointerLeave={() => setFocusedId((cur) => (cur === step.id ? null : cur))}
              onFocus={() => setFocusedId(step.id)}
              onBlur={() => setFocusedId((cur) => (cur === step.id ? null : cur))}
            >
              <span className="af-pvac__name">
                <span className="af-pvac__state" data-status={status}>
                  {status === "done" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M3.2 7.3L5.8 9.9L10.8 4.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : status === "running" ? (
                    <svg
                      className="af-pvac__spin"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 2a5 5 0 1 1-3.82 1.78"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle
                        cx="7"
                        cy="7"
                        r="4.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    </svg>
                  )}
                </span>

                {step.icon ? <span className="af-pvac__icon">{step.icon}</span> : null}

                <span className="af-pvac__label" dir="auto" title={step.title}>
                  {step.title}
                </span>
              </span>

              <span className="af-pvac__track" aria-hidden="true">
                {status === "waiting" ? (
                  <span
                    className="af-pvac__bar"
                    data-kind="forecast"
                    style={{ "--s": actualStart, "--d": step.plan } as CSSProperties}
                  />
                ) : null}

                {remainingForecast > 0 ? (
                  <span
                    className="af-pvac__bar"
                    data-kind="forecast"
                    data-rest=""
                    style={{ "--s": actualEnd, "--d": remainingForecast } as CSSProperties}
                  />
                ) : null}

                {status !== "waiting" && normalActualDur > 0 ? (
                  <span
                    className="af-pvac__bar"
                    data-kind="actual"
                    data-status={status}
                    data-over={overDur > 0 || undefined}
                    style={{ "--s": actualStart, "--d": normalActualDur } as CSSProperties}
                  />
                ) : null}

                {status !== "waiting" && overDur > 0 ? (
                  <span
                    className="af-pvac__bar"
                    data-kind="over"
                    data-status={status}
                    style={{ "--s": plannedCapEnd, "--d": overDur } as CSSProperties}
                  />
                ) : null}

                <span
                  className="af-pvac__ghost"
                  style={{ "--s": planStart, "--d": step.plan } as CSSProperties}
                />

                <span
                  className="af-pvac__tag"
                  data-side={tagEdge / range > 0.84 ? "before" : "after"}
                  data-status={status}
                  style={
                    {
                      "--s": tagEdge / range > 0.84 ? Math.min(planStart, actualStart) : tagEdge,
                      "--tw": showDiff ? 76 : 42,
                    } as CSSProperties
                  }
                >
                  {status === "waiting" ? (
                    formatTime(step.plan)
                  ) : (
                    <>
                      <span className="af-pvac__took">{formatTime(elapsedMs)}</span>
                      {showDiff ? (
                        <span
                          className="af-pvac__diff"
                          data-late={deltaSec > 0 || undefined}
                        >
                          {diffLabel}
                        </span>
                      ) : null}
                      {status === "done" && step.cost !== undefined ? (
                        <span className="af-pvac__cost">${step.cost.toFixed(2)}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </span>
            </div>
          );
        })}

        <div className="af-pvac__links" aria-hidden="true">
          {links.map((lk) => (
            <span
              key={lk.key}
              className="af-pvac__link"
              style={
                {
                  "--from": lk.from,
                  "--to": lk.to,
                  "--a0": lk.a0,
                  "--a1": lk.a1,
                  "--b0": lk.b0,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="af-pvac__foot" aria-hidden="true">
          <span className="af-pvac__key" data-kind="plan">
            Plan
          </span>
          <span className="af-pvac__key" data-kind="actual">
            Actual
          </span>
          <span className="af-pvac__key" data-kind="over">
            Over plan
          </span>
        </div>
      </div>
    </div>
  );
}

export const PlanVsActual = AfPlanVsActual;
export const AfPlanVsActualPattern = AfPlanVsActual;
