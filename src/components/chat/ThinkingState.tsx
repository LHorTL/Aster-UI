import { useEffect, useRef, useState } from "react";
import { AfExpand, AfIcon, AfTooltip } from "../../ui";
import { cn } from "../../primitives";
import {
  BrandFavicon,
  SearchGlobeSvg,
  resolveThinkingSource,
  type ThinkingStateProps,
  type ThinkingStep,
  useElapsedSeconds,
} from "../_shared/chat";

const DEFAULT_THINKING_STEPS: ThinkingStep[] = [
  {
    kind: "search",
    label: "Searching",
    sources: [
      { label: "Slack – #team-offsite", domain: "slack.com" },
      { label: "X – @lisbonguide", domain: "x.com" },
      { label: "Notion – Offsite plan", domain: "www.notion.so" },
      { label: "Wikipedia – Lisbon", domain: "en.wikipedia.org/wiki/Lisbon" },
    ],
    more: [
      { label: "Time Out – Lisbon dining", domain: "timeout.com" },
      { label: "Google Flights – LIS", domain: "flights.google.com" },
      { label: "Linear – Q4 budget", domain: "linear.app" },
    ],
  },
  { kind: "read", label: "Comparing Alfama and Chiado hotel availability" },
  { kind: "step", label: "Checking flight arrival windows and workshop capacity" },
  { kind: "step", label: "Drafting recommendation" },
];

function renderThinkingFavicon(label: string, domain: string, icon?: Parameters<typeof AfIcon>[0]["name"]) {
  const probe = `${label} ${domain}`.toLowerCase();
  if (probe.includes("slack")) return <BrandFavicon brand="slack" size={14} />;
  if (probe.startsWith("x ") || probe.includes("x.com") || probe.includes("twitter")) return <BrandFavicon brand="x" size={14} />;
  if (probe.includes("notion")) return <BrandFavicon brand="notion" size={14} />;
  if (probe.includes("wiki")) return <BrandFavicon brand="wikipedia" size={14} />;
  if (probe.includes("linear")) return <BrandFavicon brand="linear" size={14} />;
  if (icon) return <AfIcon name={icon} size={11} />;
  return <span className="af-ch-think__favletter">{label.slice(0, 1).toUpperCase()}</span>;
}

/**
 * Thinking State: borderless canvas cascade with 3x3 diagonal wave PixelMark, shimmer "Thinking" +
 * muted elapsed seconds, hover-reveal chevron, SearchGlobeSvg node, brand-favicon source chips + "+3 more",
 * and final blue check completion step.
 */
function ThinkingState({
  steps = DEFAULT_THINKING_STEPS,
  doneLabel = "Done",
  stepMs = 1300,
  loop = false,
  done: doneProp,
  defaultCollapsed = false,
  collapseOnDone = false,
  onSourceClick,
  onDone,
  className,
}: ThinkingStateProps) {
  const [cycle, setCycle] = useState(0);
  const [revealed, setRevealed] = useState(doneProp ? steps.length : 1);
  const [internalDone, setInternalDone] = useState(Boolean(doneProp));
  const done = doneProp ?? internalDone;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [moreOpen, setMoreOpen] = useState<Record<number, boolean>>({});
  const doneSeconds = useRef(doneProp ? Math.max(1, Math.round((steps.length * stepMs) / 1000)) : 0);
  const seconds = useElapsedSeconds(!done, cycle);
  const secondsRef = useRef(0);
  secondsRef.current = seconds;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (doneProp !== undefined) {
      setInternalDone(doneProp);
      if (doneProp) {
        setRevealed(steps.length);
        if (doneSeconds.current === 0) {
          doneSeconds.current = Math.max(1, secondsRef.current || Math.round((steps.length * stepMs) / 1000));
        }
      }
    }
  }, [doneProp, steps.length, stepMs]);

  useEffect(() => {
    if (done) return;
    if (revealed >= steps.length) {
      const id = window.setTimeout(() => {
        const finalSec = Math.max(1, secondsRef.current || Math.round((steps.length * stepMs) / 1000));
        doneSeconds.current = finalSec;
        setInternalDone(true);
        if (collapseOnDone) setCollapsed(true);
        onDoneRef.current?.(finalSec);
      }, Math.round(stepMs * 0.72));
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setRevealed((value) => Math.min(steps.length, value + 1));
    }, stepMs);
    return () => window.clearTimeout(id);
  }, [revealed, steps.length, stepMs, done, collapseOnDone]);

  useEffect(() => {
    if (!loop || !done || doneProp !== undefined) return;
    const id = window.setTimeout(() => {
      doneSeconds.current = 0;
      setInternalDone(false);
      setRevealed(1);
      setMoreOpen({});
      if (collapseOnDone && !defaultCollapsed) setCollapsed(false);
      setCycle((c) => c + 1);
    }, 2400);
    return () => window.clearTimeout(id);
  }, [loop, done, doneProp, collapseOnDone, defaultCollapsed]);

  const visibleSteps = done ? steps : steps.slice(0, revealed);
  const totalSec = doneSeconds.current || Math.max(1, seconds);

  return (
    <section
      className={cn("af-ch-think", className)}
      data-collapsed={collapsed || undefined}
      data-done={done || undefined}
    >
      <button
        type="button"
        className="af-ch-think__head"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <AfIcon name="chevronDown" size={13} className="af-ch-think__chevron" />
        <span className="af-ch-think__headline" data-done={done || undefined}>
          {done ? (
            <span className="af-ch-think__donetitle">Thought for {totalSec}s</span>
          ) : (
            <>
              <span className="af-ch-think__shimmer" data-text="Thinking">
                Thinking
              </span>
              <span className="af-ch-think__time">{Math.max(1, seconds)}s</span>
            </>
          )}
        </span>
      </button>

      <AfExpand open={!collapsed}>
        <div
          className="af-ch-think__steps"
          role="list"
          aria-live="polite"
          key={cycle}
        >
          {visibleSteps.map((step, index) => {
            const kind = step.kind ?? "step";
            const isStepDone = done || index < visibleSteps.length - 1;
            const state = isStepDone ? "done" : "active";
            const hasNextRow = index < visibleSteps.length - 1 || done;
            const extra = step.more ?? [];
            const expanded = Boolean(moreOpen[index]);

            return (
              <div
                key={`${step.label}-${index}`}
                className="af-ch-think__step"
                data-state={state}
                data-kind={kind}
                role="listitem"
              >
                <span className="af-ch-think__rail" aria-hidden>
                  <span className="af-ch-think__node">
                    {kind === "search" ? (
                      <SearchGlobeSvg size={16} />
                    ) : kind === "read" ? (
                      <AfIcon name="file" size={14} />
                    ) : kind === "code" ? (
                      <AfIcon name="code" size={14} />
                    ) : (
                      <span className="af-ch-think__dot" />
                    )}
                  </span>
                  {hasNextRow ? <span className="af-ch-think__line" /> : null}
                </span>

                <span className="af-ch-think__body">
                  <span
                    className={cn("af-ch-think__label", state === "active" && "af-ch-think__shimmer")}
                    data-text={state === "active" ? step.label : undefined}
                  >
                    {step.label}
                  </span>
                  {step.detail ? <span className="af-ch-think__detail">{step.detail}</span> : null}
                  {step.sources?.length ? (
                    <span className="af-ch-think__sources">
                      {step.sources.map((raw, sIdx) => {
                        const src = resolveThinkingSource(raw);
                        return (
                          <AfTooltip key={src.key} label={src.domain}>
                            <button
                              type="button"
                              className="af-ch-think__source"
                              style={{ animationDelay: `${120 + sIdx * 160}ms` }}
                              onClick={() => onSourceClick?.(src.href ?? src.domain)}
                            >
                              <span className="af-ch-think__favicon" aria-hidden>
                                {renderThinkingFavicon(src.label, src.domain, src.icon)}
                              </span>
                              <span className="af-ch-think__sourcelabel">{src.label}</span>
                            </button>
                          </AfTooltip>
                        );
                      })}
                      {extra.length > 0 && !expanded ? (
                        <button
                          type="button"
                          className="af-ch-think__source af-ch-think__more"
                          aria-expanded={false}
                          style={{ animationDelay: "760ms" }}
                          onClick={() => setMoreOpen((prev) => ({ ...prev, [index]: true }))}
                        >
                          +{extra.length} more
                        </button>
                      ) : null}
                      {expanded
                        ? extra.map((raw, eIdx) => {
                            const src = resolveThinkingSource(raw);
                            return (
                              <AfTooltip key={src.key} label={src.domain}>
                                <button
                                  type="button"
                                  className="af-ch-think__source"
                                  style={{ animationDelay: `${eIdx * 40}ms` }}
                                  onClick={() => onSourceClick?.(src.href ?? src.domain)}
                                >
                                  <span className="af-ch-think__favicon" aria-hidden>
                                    {renderThinkingFavicon(src.label, src.domain, src.icon)}
                                  </span>
                                  <span className="af-ch-think__sourcelabel">{src.label}</span>
                                </button>
                              </AfTooltip>
                            );
                          })
                        : null}
                      {extra.length > 0 && expanded ? (
                        <button
                          type="button"
                          className="af-ch-think__source af-ch-think__more"
                          aria-expanded={true}
                          onClick={() => setMoreOpen((prev) => ({ ...prev, [index]: false }))}
                        >
                          Show less
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}

          {done && doneLabel ? (
            <div className="af-ch-think__step af-ch-think__step--complete" data-state="complete" role="listitem">
              <span className="af-ch-think__rail" aria-hidden>
                <span className="af-ch-think__donebadge">
                  <svg className="af-ch-think__donecheck" viewBox="0 0 16 16" width="10" height="10">
                    <path d="M3.5 8.3 6.5 11.2 12.5 5" pathLength={1} />
                  </svg>
                </span>
              </span>
              <span className="af-ch-think__body">
                <span className="af-ch-think__label af-ch-think__label--done">{doneLabel}</span>
              </span>
            </div>
          ) : null}
        </div>
      </AfExpand>
    </section>
  );
}

export { ThinkingState as AfThinkingState };
