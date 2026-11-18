import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { AfPortal } from "../../primitives/layer";
import { AgentPixelMark, useFloatingAnchor } from "./_marks";

export type RunControlPhase =
  | "running"
  | "paused"
  | "cancelling"
  | "stopped"
  | "completed";
export type RunControlStatus =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "error"
  | "done";
export type RunControlMode = "chat" | "act";
export type RunControlPermission = "ask" | "edits" | "full";

export interface RunControlDirective {
  id: string;
  text: string;
  at: string | number;
}

export interface RunControlSteer {
  id?: string;
  at: number;
  text: string;
}

export interface RunControlQueueItem {
  id: string;
  text: string;
}

export interface AfRunControlsProps {
  /** Agent identity (gives deterministic pixel mark). */
  agent?: { id: string; name: string };
  /** User prompt for the current turn. */
  prompt?: string;
  /** Streamed answer text (controlled or demo-streamed when omitted). */
  answer?: string;
  /** Official affectUI run status. */
  status?: RunControlStatus;
  /** Legacy initial phase compatibility. */
  defaultPhase?: RunControlPhase;
  /** Inline steering notes anchored by character offset in `answer`. */
  steers?: RunControlSteer[];
  /** Messages queued to run after the current turn finishes. */
  queue?: RunControlQueueItem[];
  /** Controlled composer mode ("chat" | "act"). */
  mode?: RunControlMode;
  defaultMode?: RunControlMode;
  onModeChange?: (mode: RunControlMode) => void;
  /** Controlled permission level ("ask" | "edits" | "full"). */
  permission?: RunControlPermission;
  defaultPermission?: RunControlPermission;
  onPermissionChange?: (permission: RunControlPermission) => void;
  /** Context window share in use (0–1). Turns amber >= 0.8. */
  context?: number;
  /** Elapsed seconds for "Done in 0:14". */
  took?: number;
  onSend?: (text: string) => void;
  onSteer?: (text: string) => void;
  onQueue?: (text: string) => void;
  onUnqueue?: (id: string) => void;
  onStop?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  placeholder?: string;
  /** Legacy compatibility props. */
  title?: ReactNode;
  runMeta?: ReactNode;
  currentStep?: ReactNode;
  progress?: number;
  initialTokens?: number;
  initialCost?: number;
  initialDirectives?: RunControlDirective[];
  onPhaseChange?: (phase: RunControlPhase) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_PROMPT =
  "Plan four days in Lisbon in March – good food, one day trip, nothing too touristy.";

const DEFAULT_FULL_ANSWER =
  "March in Lisbon sits around 18°C with crisp Atlantic light and quiet mornings before Easter crowds arrive.\n\n" +
  "Day 1 — Alfama & Mouraria: Start with an espresso at a neighborhood pastelaria in Graça, wander down through the steep tiled alleys of Alfama, and book a late lunch at Taberna da Rua das Flores (arrive by 12:15 since they don't take reservations).\n\n" +
  "Day 2 — Príncipe Real & Alcântara: Browse the Saturday organic market in Príncipe Real, walk down through São Bento for natural wine and petiscos at Velho Eurico, then catch sunset along the riverfront toward Belém.\n\n" +
  "Day 3 — Setúbal & Arrábida day trip: Skip Sintra's tour buses and take the Fertagus train across the bridge to Setúbal for choco frito and fresh grilled fish by the harbor.";

const INITIAL_STREAM_WORDS = 22;

const DEFAULT_QUEUE: RunControlQueueItem[] = [
  { id: "q-1", text: "Add a packing list for March weather" },
];

const PERMISSION_OPTIONS: Array<{
  value: RunControlPermission;
  label: string;
  hint: string;
}> = [
  {
    value: "ask",
    label: "Ask first",
    hint: "Confirm before edits or external tools",
  },
  {
    value: "edits",
    label: "Auto-edit",
    hint: "Edit workspace files, ask before commands",
  },
  {
    value: "full",
    label: "Full access",
    hint: "Run tools and edits without prompting",
  },
];

function phaseToStatus(phase?: RunControlPhase): RunControlStatus {
  if (!phase || phase === "running") return "running";
  if (phase === "paused") return "paused";
  if (phase === "completed") return "done";
  return "stopped";
}

function statusToPhase(status: RunControlStatus): RunControlPhase {
  if (status === "running") return "running";
  if (status === "paused") return "paused";
  if (status === "done") return "completed";
  return "stopped";
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function AfRunControls({
  agent = { id: "trip-planner", name: "Trip planner" },
  prompt = DEFAULT_PROMPT,
  answer: controlledAnswer,
  status: controlledStatus,
  defaultPhase,
  steers: controlledSteers,
  queue: controlledQueue,
  mode: controlledMode,
  defaultMode = "act",
  onModeChange,
  permission: controlledPermission,
  defaultPermission = "ask",
  onPermissionChange,
  context = 0.34,
  took = 14,
  onSend,
  onSteer,
  onQueue,
  onUnqueue,
  onStop,
  onResume,
  onRetry,
  onDismiss,
  placeholder,
  title,
  initialDirectives,
  onPhaseChange,
  className,
  style,
}: AfRunControlsProps = {}) {
  const menuId = useId();
  const words = useMemo(() => DEFAULT_FULL_ANSWER.split(/(\s+)/), []);
  const initialIndex = useMemo(() => {
    let seen = 0;
    for (let i = 0; i < words.length; i += 1) {
      if (words[i].trim()) seen += 1;
      if (seen >= INITIAL_STREAM_WORDS) return i + 1;
    }
    return words.length;
  }, [words]);

  const [internalStatus, setInternalStatus] = useState<RunControlStatus>(() =>
    phaseToStatus(defaultPhase),
  );
  const [tokenIdx, setTokenIdx] = useState<number>(initialIndex);
  const [internalSteers, setInternalSteers] = useState<RunControlSteer[]>(() => {
    if (initialDirectives && initialDirectives.length > 0) {
      return initialDirectives.map((d, idx) => ({
        id: d.id,
        at: typeof d.at === "number" ? d.at : 180 + idx * 60,
        text: d.text,
      }));
    }
    return [];
  });
  const [internalQueue, setInternalQueue] =
    useState<RunControlQueueItem[]>(DEFAULT_QUEUE);
  const [internalMode, setInternalMode] = useState<RunControlMode>(defaultMode);
  const [internalPerm, setInternalPerm] =
    useState<RunControlPermission>(defaultPermission);
  const [draft, setDraft] = useState("");
  const [permOpen, setPermOpen] = useState(false);
  const [livePrompt, setLivePrompt] = useState(prompt);

  const permTriggerRef = useRef<HTMLButtonElement | null>(null);
  const permMenuRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLivePrompt(prompt);
  }, [prompt]);

  const status = controlledStatus ?? internalStatus;
  const mode = controlledMode ?? internalMode;
  const permission = controlledPermission ?? internalPerm;
  const steers = controlledSteers ?? internalSteers;
  const queueItems = controlledQueue ?? internalQueue;

  const streamedAnswer = useMemo(
    () => words.slice(0, tokenIdx).join(""),
    [words, tokenIdx],
  );
  const visibleAnswer = controlledAnswer ?? streamedAnswer;
  const wordCount = useMemo(() => countWords(visibleAnswer), [visibleAnswer]);

  useEffect(() => {
    if (controlledAnswer !== undefined || status !== "running") return;
    if (tokenIdx >= words.length) {
      if (controlledStatus === undefined) {
        setInternalStatus("done");
        onPhaseChange?.("completed");
      }
      return;
    }
    const timer = window.setInterval(() => {
      setTokenIdx((prev) => {
        if (prev >= words.length) return prev;
        return Math.min(words.length, prev + 2);
      });
    }, 160);
    return () => window.clearInterval(timer);
  }, [controlledAnswer, controlledStatus, onPhaseChange, status, tokenIdx, words.length]);

  const permPos = useFloatingAnchor(permTriggerRef, permOpen, {
    align: "start",
    offset: 6,
    minWidth: 224,
  });

  useEffect(() => {
    if (!permOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        permTriggerRef.current?.contains(target) ||
        permMenuRef.current?.contains(target)
      ) {
        return;
      }
      setPermOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPermOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [permOpen]);

  const setNextStatus = (next: RunControlStatus) => {
    if (controlledStatus === undefined) {
      setInternalStatus(next);
    }
    onPhaseChange?.(statusToPhase(next));
  };

  const handleStop = () => {
    setNextStatus("stopped");
    onStop?.();
  };

  const handleResume = () => {
    if (controlledAnswer === undefined && tokenIdx >= words.length) {
      setTokenIdx(Math.max(12, Math.floor(words.length * 0.45)));
    }
    setNextStatus("running");
    onResume?.();
  };

  const handleRetry = () => {
    if (controlledAnswer === undefined) {
      setTokenIdx(10);
    }
    if (controlledSteers === undefined) {
      setInternalSteers([]);
    }
    setNextStatus("running");
    onRetry?.();
  };

  const handleDismiss = () => {
    setNextStatus("idle");
    onDismiss?.();
  };

  const handleSteerOrSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (status === "running") handleStop();
      return;
    }
    if (status === "running") {
      const offset = visibleAnswer.length;
      if (controlledSteers === undefined) {
        setInternalSteers((prev) => [
          ...prev,
          { id: `st-${Date.now()}`, at: offset, text: trimmed },
        ]);
      }
      onSteer?.(trimmed);
    } else {
      setLivePrompt(trimmed);
      if (controlledAnswer === undefined) {
        setTokenIdx(8);
      }
      if (controlledSteers === undefined) {
        setInternalSteers([]);
      }
      setNextStatus("running");
      onSend?.(trimmed);
    }
    setDraft("");
  };

  const handleQueueAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const item: RunControlQueueItem = {
      id: `q-${Date.now()}`,
      text: trimmed,
    };
    if (controlledQueue === undefined) {
      setInternalQueue((prev) => [...prev, item]);
    }
    onQueue?.(trimmed);
    setDraft("");
  };

  const handleQueueRemove = (id: string) => {
    if (controlledQueue === undefined) {
      setInternalQueue((prev) => prev.filter((item) => item.id !== id));
    }
    onUnqueue?.(id);
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && status === "running") {
      e.preventDefault();
      handleStop();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey) && status === "running") {
        handleQueueAdd();
      } else {
        handleSteerOrSend();
      }
    }
  };

  const selectMode = (next: RunControlMode) => {
    if (controlledMode === undefined) setInternalMode(next);
    onModeChange?.(next);
  };

  const selectPerm = (next: RunControlPermission) => {
    if (controlledPermission === undefined) setInternalPerm(next);
    onPermissionChange?.(next);
    setPermOpen(false);
  };

  // Build inline segments with steer chips anchored at character offsets
  const segments = useMemo(() => {
    const text = visibleAnswer;
    if (!steers.length) {
      return [{ kind: "text" as const, value: text, key: "t-0" }];
    }
    const sorted = [...steers]
      .map((s, idx) => ({
        ...s,
        key: s.id ?? `s-${idx}`,
        clampedAt: Math.max(0, Math.min(text.length, s.at)),
      }))
      .sort((a, b) => a.clampedAt - b.clampedAt);

    const out: Array<
      | { kind: "text"; value: string; key: string }
      | { kind: "steer"; value: string; key: string }
    > = [];
    let cursor = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      const s = sorted[i];
      if (s.clampedAt > cursor) {
        out.push({
          kind: "text",
          value: text.slice(cursor, s.clampedAt),
          key: `t-${i}`,
        });
      }
      out.push({ kind: "steer", value: s.text, key: s.key });
      cursor = s.clampedAt;
    }
    if (cursor < text.length) {
      out.push({ kind: "text", value: text.slice(cursor), key: "t-end" });
    }
    return out;
  }, [steers, visibleAnswer]);

  const statusLabel = useMemo(() => {
    if (status === "running") {
      if (!visibleAnswer.trim()) return "Thinking";
      return steers.length > 0 ? "Writing · steered" : "Writing";
    }
    if (status === "paused") return `Paused at ${wordCount} words`;
    if (status === "stopped") return `Stopped at ${wordCount} words`;
    if (status === "error") return "Run interrupted";
    if (status === "done") return `Done in ${formatDuration(took)}`;
    return "Ready";
  }, [status, steers.length, took, visibleAnswer, wordCount]);

  const pct = Math.max(0, Math.min(100, Math.round(context * 100)));
  const ringR = 5;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - pct / 100);
  const currentPerm =
    PERMISSION_OPTIONS.find((p) => p.value === permission) ??
    PERMISSION_OPTIONS[0];

  const effectivePlaceholder =
    placeholder ??
    (status === "running"
      ? "Steer the agent, or queue what's next…"
      : `Ask ${typeof title === "string" ? title : agent.name} anything…`);

  const hasDraft = draft.trim().length > 0;

  return (
    <div
      className={cn(
        "af-agc-runc",
        status === "running" && "is-running",
        status === "stopped" && "is-stopped",
        status === "paused" && "is-paused",
        status === "done" && "is-done",
        className,
      )}
      data-status={status}
      style={style}
    >
      <div
        ref={logRef}
        className="af-agc-runc__log"
        role="log"
        aria-live="polite"
      >
        <div className="af-agc-runc__user-row">
          <div className="af-agc-runc__user">{livePrompt}</div>
        </div>

        {status !== "idle" ? (
          <div className="af-agc-runc__turn">
            <div className="af-agc-runc__head">
              <AgentPixelMark
                seed={agent.id}
                size={13}
                color="#0190fe"
                twinkle={status === "running"}
              />
              <span className="af-agc-runc__agent">
                {title ?? agent.name}
              </span>
              <span
                className={cn(
                  "af-agc-runc__state",
                  status === "running" && "is-live",
                  (status === "stopped" || status === "paused") && "is-muted",
                  status === "error" && "is-error",
                )}
              >
                {statusLabel}
              </span>
            </div>

            <div className="af-agc-runc__body">
              {status === "running" && !visibleAnswer.trim() ? (
                <span className="af-agc-runc__dots" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <div className="af-agc-runc__prose">
                  {segments.map((seg) =>
                    seg.kind === "steer" ? (
                      <span key={seg.key} className="af-agc-runc__steer">
                        <span aria-hidden="true">↳</span> {seg.value}
                      </span>
                    ) : (
                      <span key={seg.key}>{seg.value}</span>
                    ),
                  )}
                  {status === "running" ? (
                    <span className="af-agc-runc__caret" aria-hidden="true" />
                  ) : null}
                </div>
              )}
            </div>

            <div className="af-agc-runc__after">
              {status === "running" ? (
                <span className="af-agc-runc__hint">
                  <kbd>Esc</kbd> to stop
                </span>
              ) : status === "stopped" ||
                status === "paused" ||
                status === "error" ? (
                <div className="af-agc-runc__actions">
                  <button
                    type="button"
                    className="af-agc-runc__ghost-btn is-primary"
                    onClick={handleResume}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="af-agc-runc__ghost-btn"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    className="af-agc-runc__ghost-btn"
                    onClick={handleDismiss}
                  >
                    Dismiss
                  </button>
                </div>
              ) : status === "done" ? (
                <div className="af-agc-runc__actions">
                  <button
                    type="button"
                    className="af-agc-runc__ghost-btn"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="af-agc-runc__composer">
        {queueItems.length > 0 ? (
          <div className="af-agc-runc__queue" aria-label="Queued messages">
            {queueItems.map((item, idx) => (
              <div key={item.id} className="af-agc-runc__queue-item">
                <svg
                  className="af-agc-runc__queue-ico"
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2.25 4h9.5M2.25 7h9.5M2.25 10h6.25"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="af-agc-runc__queue-text">{item.text}</span>
                <span className="af-agc-runc__queue-tag">
                  {idx === 0 ? "Next" : `#${idx + 1}`}
                </span>
                <button
                  type="button"
                  className="af-agc-runc__queue-rm"
                  aria-label="Remove queued message"
                  onClick={() => handleQueueRemove(item.id)}
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
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="af-agc-runc__write">
          <textarea
            className="af-agc-runc__input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={effectivePlaceholder}
            aria-label="Message or steering note"
          />

          <div className="af-agc-runc__bar">
            <div className="af-agc-runc__bar-left">
              <div
                className="af-agc-runc__modes"
                role="radiogroup"
                aria-label="Agent mode"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "chat"}
                  className={cn(
                    "af-agc-runc__mode-btn",
                    mode === "chat" && "is-active",
                  )}
                  onClick={() => selectMode("chat")}
                >
                  Chat
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "act"}
                  className={cn(
                    "af-agc-runc__mode-btn",
                    mode === "act" && "is-active",
                  )}
                  onClick={() => selectMode("act")}
                >
                  Act
                </button>
              </div>

              <button
                ref={permTriggerRef}
                type="button"
                className="af-agc-runc__perm-btn"
                aria-haspopup="menu"
                aria-expanded={permOpen}
                aria-controls={permOpen ? menuId : undefined}
                onClick={() => setPermOpen((v) => !v)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1.6 2.6 3.4v3.4c0 2.9 1.9 4.9 4.4 5.7 2.5-.8 4.4-2.8 4.4-5.7V3.4L7 1.6Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{currentPerm.label}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3.25 4.75 6 7.5l2.75-2.75"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="af-agc-runc__bar-right">
              <span
                className={cn("af-agc-runc__ctx", pct >= 80 && "is-warn")}
                title={`${pct}% of context window used`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                >
                  <circle
                    cx="7"
                    cy="7"
                    r={ringR}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeWidth="1.6"
                  />
                  <circle
                    cx="7"
                    cy="7"
                    r={ringR}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc.toFixed(2)}
                    strokeDashoffset={ringOffset.toFixed(2)}
                    transform="rotate(-90 7 7)"
                  />
                </svg>
                <span>{pct}%</span>
              </span>

              {status === "running" && hasDraft ? (
                <button
                  type="button"
                  className="af-agc-runc__queue-btn"
                  onClick={handleQueueAdd}
                >
                  Queue
                </button>
              ) : null}

              {status === "running" && !hasDraft ? (
                <button
                  type="button"
                  className="af-agc-runc__submit is-stop"
                  aria-label="Stop run"
                  onClick={handleStop}
                >
                  <span className="af-agc-runc__stop-sq" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "af-agc-runc__submit",
                    !hasDraft && "is-disabled",
                  )}
                  disabled={!hasDraft}
                  aria-label={
                    status === "running" ? "Steer agent" : "Send message"
                  }
                  onClick={handleSteerOrSend}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 11.2V2.8M3.5 6.3 7 2.8l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {permOpen ? (
        <AfPortal>
          <div
            ref={permMenuRef}
            id={menuId}
            role="menu"
            aria-label="Permission level"
            className="af-agc-runc__menu"
            style={{
              position: "fixed",
              top: permPos.top,
              left: permPos.left,
              minWidth: permPos.width,
              zIndex: 9999,
            }}
          >
            {PERMISSION_OPTIONS.map((opt) => {
              const active = opt.value === permission;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={cn(
                    "af-agc-runc__menu-item",
                    active && "is-active",
                  )}
                  onClick={() => selectPerm(opt.value)}
                >
                  <div className="af-agc-runc__menu-copy">
                    <span className="af-agc-runc__menu-label">{opt.label}</span>
                    <span className="af-agc-runc__menu-hint">{opt.hint}</span>
                  </div>
                  {active ? (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m3 7.2 2.6 2.6L11 4.4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </AfPortal>
      ) : null}
    </div>
  );
}

export const AfRunControlsPattern = AfRunControls;
export type AfRunControlsPatternProps = AfRunControlsProps;
