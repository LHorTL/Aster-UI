import { useEffect, useMemo, useState, type RefObject } from "react";
import { useSortableList } from "../../primitives";
import { PLAN_STEPS, type PlanPhase, type PlanStep } from "../_shared/agents-a";

export type { PlanPhase, PlanStep };

export interface AfAgentPlanProps {
  /** Plan title heading. */
  title?: string;
  /** Optional run identifier metadata. */
  runId?: string;
  /** Initial plan steps. */
  initialSteps?: PlanStep[];
  /** Initial phase. */
  defaultPhase?: PlanPhase;
  className?: string;
}

export type AfAgentPlanPatternProps = AfAgentPlanProps;

export function AfAgentPlan({
  title = "Prepare the Q3 board update",
  runId,
  initialSteps = PLAN_STEPS,
  defaultPhase = "review",
  className,
}: AfAgentPlanProps = {}) {
  const [steps, setSteps] = useState<PlanStep[]>(initialSteps);
  const [phase, setPhase] = useState<PlanPhase>(defaultPhase);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const { listRef, flip, getItemProps, ghostPortal } = useSortableList<PlanStep>({
    items: steps,
    getKey: (s) => s.id,
    onReorder: setSteps,
    direction: "vertical",
    disabled: phase !== "review" || editingId !== null,
  });

  useEffect(() => {
    if (phase !== "running") return;
    const current = steps[activeIndex];
    if (!current) {
      setPhase("done");
      return;
    }
    const ms = Math.max(600, Math.round(current.expected * 650));
    const timer = window.setTimeout(() => {
      if (activeIndex + 1 >= steps.length) {
        setPhase("done");
      } else {
        setActiveIndex((idx) => idx + 1);
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [phase, activeIndex, steps]);

  const estMinutes = useMemo(() => {
    const sum = steps.reduce((acc, s) => acc + s.expected, 0);
    return Math.max(1, Math.round(sum / 4));
  }, [steps]);

  const startRun = () => {
    if (steps.length === 0) return;
    setActiveIndex(0);
    setPhase("running");
  };

  const resetPlan = () => {
    setPhase("review");
    setActiveIndex(0);
  };

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: `p-custom-${Date.now()}`,
        title: `Archive Q3 source sheet #${nextNum}`,
        desc: "Save snapshot to board workspace",
        tool: "drive.copy",
        expected: 1.3,
      },
    ]);
  };

  const removeStep = (id: string) => {
    if (phase === "running") return;
    flip.capture();
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <section
      className={["af-plc", className].filter(Boolean).join(" ")}
      data-run-id={runId}
      aria-label={title}
    >
      <div className="af-plc__top">
        <span className="af-plc__badge">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6.5 4.5h7M6.5 8h7M6.5 11.5h7" />
            <circle cx="3.25" cy="4.5" r="0.8" fill="currentColor" />
            <circle cx="3.25" cy="8" r="0.8" fill="currentColor" />
            <circle cx="3.25" cy="11.5" r="0.8" fill="currentColor" />
          </svg>
          <span>
            {phase === "done"
              ? `Completed · ${steps.length} steps`
              : phase === "running"
                ? `Running · step ${activeIndex + 1} of ${steps.length}`
                : `Plan · ${steps.length} steps`}
          </span>
          {runId ? <span style={{ opacity: 0.7 }}>· {runId}</span> : null}
        </span>

        <span className="af-plc__est">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3.2l2 1.3" />
          </svg>
          <span>~{estMinutes} min</span>
        </span>
      </div>

      <h3 className="af-plc__title">{title}</h3>

      <div className="af-plc__list" role="list" ref={listRef as RefObject<HTMLDivElement>}>
        {steps.map((step, index) => {
          const stepState =
            phase === "done" || (phase === "running" && index < activeIndex)
              ? "done"
              : phase === "running" && index === activeIndex
                ? "active"
                : phase === "failed" && index === activeIndex
                  ? "failed"
                  : "idle";
          const dragProps = getItemProps(step, index);

          return (
            <div
              key={step.id}
              role="listitem"
              className="af-plc__step"
              {...dragProps}
            >
              <span className="af-plc__num" data-state={stepState}>
                {stepState === "done" ? "✓" : index + 1}
              </span>

              <div className="af-plc__body">
                <div className="af-plc__row1">
                  {editingId === step.id ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => {
                        if (draftTitle.trim()) {
                          setSteps((prev) =>
                            prev.map((s) => (s.id === step.id ? { ...s, title: draftTitle.trim() } : s)),
                          );
                        }
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      style={{
                        flex: 1,
                        height: 22,
                        fontSize: 12.5,
                        borderRadius: 5,
                        border: "1px solid var(--plc-accent)",
                        padding: "0 6px",
                        background: "var(--plc-bg)",
                        color: "var(--plc-ink)",
                      }}
                    />
                  ) : (
                    <span
                      className="af-plc__step-title"
                      onDoubleClick={() => {
                        if (phase !== "review") return;
                        setEditingId(step.id);
                        setDraftTitle(step.title);
                      }}
                    >
                      {step.title}
                    </span>
                  )}
                </div>
                {(step.desc || step.tool) ? (
                  <p className="af-plc__desc">
                    {step.desc ? <span>{step.desc}</span> : null}
                    {step.tool ? <span className="af-plc__tool">{step.tool}</span> : null}
                  </p>
                ) : null}
              </div>

              {phase === "review" && steps.length > 1 ? (
                <button
                  type="button"
                  className="af-plc__remove"
                  aria-label={`Remove ${step.title}`}
                  onClick={() => removeStep(step.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                  </svg>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {phase === "review" ? (
        <button type="button" className="af-plc__add" onClick={addStep}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M8 4v8M4 8h8" />
          </svg>
          <span>Add step</span>
        </button>
      ) : null}

      <footer className="af-plc__foot">
        <span className="af-plc__hint">
          {phase === "review"
            ? "Drag to reorder · double-click to rename"
            : phase === "running"
              ? "Executing approved plan…"
              : "All steps finished cleanly"}
        </span>

        <div className="af-plc__actions">
          {phase === "review" ? (
            <>
              <button type="button" className="af-plc__btn" onClick={() => setSteps(initialSteps)}>
                Cancel
              </button>
              <button type="button" className="af-plc__btn af-plc__btn--primary" onClick={startRun}>
                <span>Run plan</span>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M5.5 3.8v8.4L12 8z" />
                </svg>
              </button>
            </>
          ) : phase === "running" ? (
            <button type="button" className="af-plc__btn" onClick={resetPlan}>
              Stop
            </button>
          ) : (
            <button type="button" className="af-plc__btn" onClick={resetPlan}>
              Run again
            </button>
          )}
        </div>
      </footer>
      {ghostPortal}
    </section>
  );
}

export const AfAgentPlanPattern = AfAgentPlan;
