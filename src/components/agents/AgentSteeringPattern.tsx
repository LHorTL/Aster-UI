import { useMemo, useRef, useState } from "react";
import {
  HeaderSpark,
  STEERING_STEPS,
  duration,
  useSeconds,
  type Adopted,
} from "../_shared/agents-a";

export type { Adopted };

export type SteeringStep = {
  id: string;
  title: string;
  state: "done" | "current" | "pending";
  time: string;
};

export interface AfAgentSteeringProps {
  title?: string;
  model?: string;
  initialSteps?: SteeringStep[];
  defaultPaused?: boolean;
  className?: string;
}

export type AfAgentSteeringPatternProps = AfAgentSteeringProps;

export function AfAgentSteering({
  title = "Migrate users table",
  model = "Opus 5.5",
  initialSteps = STEERING_STEPS,
  defaultPaused = false,
  className,
}: AfAgentSteeringProps = {}) {
  const [steps, setSteps] = useState<SteeringStep[]>(initialSteps);
  const [paused, setPaused] = useState(defaultPaused);
  const [draft, setDraft] = useState("");
  const [queuedText, setQueuedText] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<Adopted[]>([]);
  const seqRef = useRef(1);

  const liveSeconds = useSeconds(!paused);

  const currentIdx = useMemo(() => {
    const idx = steps.findIndex((s) => s.state === "current");
    return idx >= 0 ? idx : 0;
  }, [steps]);

  const submitInstruction = (mode: "next" | "now", explicitText?: string) => {
    const text = (explicitText ?? draft).trim();
    if (!text) return;
    if (mode === "now") {
      const stepId = steps[currentIdx]?.id ?? steps[0]?.id ?? "s1";
      seqRef.current += 1;
      setAdopted((prev) => [...prev, { id: seqRef.current, stepId, text, mode: "now" }]);
      setQueuedText(null);
    } else {
      setQueuedText(text);
    }
    if (!explicitText) setDraft("");
  };

  const promoteQueuedNow = () => {
    if (!queuedText) return;
    const text = queuedText;
    setQueuedText(null);
    const nextIdx = Math.min(steps.length - 1, currentIdx + 1);
    setSteps((prev) =>
      prev.map((s, idx) => {
        if (idx < nextIdx) return { ...s, state: "done", time: s.time === "—" ? "1.8s" : s.time };
        if (idx === nextIdx) return { ...s, state: "current", time: "0.2s" };
        return s;
      }),
    );
    seqRef.current += 1;
    setAdopted((prev) => [
      ...prev,
      { id: seqRef.current, stepId: steps[nextIdx]?.id ?? "s2", text, mode: "next" },
    ]);
  };

  return (
    <section className={["af-stc", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="af-stc__head">
        <div className="af-stc__head-left">
          <span className="af-stc__spark" aria-hidden="true">
            <HeaderSpark size={14} />
          </span>
          <div className="af-stc__titles">
            <div className="af-stc__title">{title}</div>
            <div className="af-stc__sub">
              {model} · Step {currentIdx + 1} of {steps.length}
            </div>
          </div>
        </div>

        <div className="af-stc__head-right">
          <span className="af-stc__run-pill">
            <span className="af-stc__run-dot" data-paused={paused ? "true" : undefined} aria-hidden="true" />
            <span>{paused ? "Paused" : `Running · ${duration(126 + liveSeconds)}`}</span>
          </span>
          <button
            type="button"
            className="af-stc__icon-btn"
            aria-label={paused ? "Resume agent" : "Pause agent"}
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M5 3.5v9l7.5-4.5L5 3.5Z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="4.2" y="3.4" width="2.6" height="9.2" rx="0.9" fill="currentColor" />
                <rect x="9.2" y="3.4" width="2.6" height="9.2" rx="0.9" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="af-stc__steps" role="list">
        {steps.map((step) => {
          const stepNotes = adopted.filter((a) => a.stepId === step.id);
          return (
            <div key={step.id} role="listitem" className="af-stc__step" data-state={step.state}>
              <div className="af-stc__step-row">
                <span className="af-stc__step-icon" aria-hidden="true">
                  {step.state === "done" ? (
                    <svg width="15" height="15" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="6.5" fill="currentColor" />
                      <path
                        d="m5.4 8.2 1.8 1.8 3.4-3.7"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : step.state === "current" ? (
                    <svg width="15" height="15" viewBox="0 0 16 16" className={paused ? undefined : "af-dbc__spin"}>
                      <circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.6" />
                      <path d="M8 2.2a5.8 5.8 0 0 1 5.8 5.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 16 16">
                      <circle
                        cx="8"
                        cy="8"
                        r="5.2"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.45"
                        strokeWidth="1.35"
                        strokeDasharray="2.2 2.3"
                      />
                    </svg>
                  )}
                </span>

                <span className="af-stc__step-title">{step.title}</span>
                {step.state !== "pending" && step.time !== "—" ? (
                  <span className="af-stc__step-time">{step.time}</span>
                ) : null}
              </div>

              {stepNotes.map((note) => (
                <div key={note.id} className="af-stc__adopted">
                  ↳ {note.mode === "now" ? "Interrupted:" : "Adopted:"} {note.text}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {queuedText ? (
        <div className="af-stc__queued">
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--stc-muted)", marginRight: 6 }}>
              Next step
            </strong>
            <span>{queuedText}</span>
          </div>
          <div style={{ display: "inline-flex", gap: 4 }}>
            <button
              type="button"
              onClick={promoteQueuedNow}
              style={{
                height: 22,
                padding: "0 7px",
                borderRadius: 5,
                border: "1px solid var(--stc-line-strong)",
                background: "var(--stc-bg)",
                color: "var(--stc-ink)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Now
            </button>
            <button
              type="button"
              aria-label="Remove queued instruction"
              onClick={() => setQueuedText(null)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                border: 0,
                background: "transparent",
                color: "var(--stc-muted)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <footer className="af-stc__compose">
        <div className="af-stc__box">
          <textarea
            className="af-stc__input"
            placeholder="Steer the agent…"
            aria-label="Steer the agent"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submitInstruction("now");
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitInstruction("next");
              }
            }}
          />
          <button
            type="button"
            className="af-stc__send"
            aria-label="Send steering instruction"
            disabled={!draft.trim()}
            onClick={() => submitInstruction("next")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 12.6V3.6M4.2 7.2 8 3.4l3.8 3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="af-stc__shortcuts" aria-hidden="true">
          <span>
            <kbd>↵</kbd> next step
          </span>
          <span>
            <kbd>Ctrl</kbd> <kbd>↵</kbd> interrupt now
          </span>
        </div>
      </footer>
    </section>
  );
}

export const AfAgentSteeringPattern = AfAgentSteering;
