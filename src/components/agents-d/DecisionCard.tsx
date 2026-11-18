import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../primitives";

export type DecisionCardKind = "decision" | "pick" | "approval";

export interface DecisionCardOption {
  id: string;
  title: string;
  summary?: string;
  recommended?: boolean;
  preview?: ReactNode;
  blocks?: Array<"bar" | "cards" | "split" | "list">;
  /** Legacy compatible fields. */
  label?: string;
  pros?: string;
  cons?: string;
  eta?: string;
}

/** Legacy option alias. */
export type DecisionTradeoffOption = DecisionCardOption;

export interface DecisionCardFact {
  label: string;
  value: string;
}

export interface DecisionCardItem {
  id: string;
  question: string;
  task?: string;
  kind?: DecisionCardKind;
  options?: DecisionCardOption[];
  facts?: DecisionCardFact[];
}

export type DecisionAnswer =
  | { option: string; constraint?: string }
  | { text: string }
  | "approve"
  | "decline";

export interface DecisionCardLabels {
  needsYou: string;
  later: string;
  show: string;
  recommended: string;
  approve: string;
  decline: string;
  own: string;
  waiting: (n: number) => string;
  of: (i: number, n: number) => string;
}

export interface AfDecisionCardProps {
  /** Open decisions, oldest first — an answered one leaves the card at once. */
  decisions?: DecisionCardItem[];
  /** Legacy single-card question prop. */
  question?: ReactNode;
  /** Legacy single-card options prop. */
  options?: DecisionCardOption[];
  /** Called when an option, approval, or custom answer is submitted. */
  onDecide?: (idOrOptionId: string, answer?: DecisionAnswer) => void;
  /** Called when Later or Escape folds the card to one line. */
  onLater?: (id: string) => void;
  /** Start folded to "N decisions waiting · Show". */
  defaultFolded?: boolean;
  /** Change this number to unfold, pulse gray once, and focus the selected row. */
  reveal?: number;
  /** Customizable UI labels. */
  labels?: Partial<DecisionCardLabels>;
  /** Renders the ambient status line and chat composer frame around the card for showcase stages. */
  demoStage?: boolean;
  /** Extra class on the root. */
  className?: string;
  /** Inline style override. */
  style?: CSSProperties;
}

export type AfDecisionCardPatternProps = AfDecisionCardProps;

const DEFAULT_LABELS: DecisionCardLabels = {
  needsYou: "Needs you",
  later: "Later",
  show: "Show",
  recommended: "Recommended",
  approve: "Approve",
  decline: "Decline",
  own: "Something else…",
  waiting: (n) => `${n} ${n === 1 ? "decision" : "decisions"} waiting`,
  of: (i, n) => `${i} of ${n}`,
};

const DEFAULT_DECISIONS: DecisionCardItem[] = [
  {
    id: "queue",
    task: "Ingest pipeline",
    kind: "decision",
    question: "Which queue should the ingest service use?",
    options: [
      {
        id: "kafka",
        title: "Kafka",
        summary: "A durable log – a day of events to replay after a bad deploy",
        recommended: true,
      },
      {
        id: "sqs",
        title: "SQS",
        summary: "Managed, nothing to run – but no replay",
      },
      {
        id: "pg",
        title: "Postgres queue",
        summary: "The database you already have – won't keep up with the bursts",
      },
      {
        id: "nats",
        title: "NATS JetStream",
        summary: "Light, with replay – a smaller community",
      },
    ],
  },
  {
    id: "layout",
    task: "Pricing page",
    kind: "pick",
    question: "How should the plans sit on the page?",
    options: [
      {
        id: "cards",
        title: "Three cards",
        summary: "Side by side, Pro lifted",
        recommended: true,
        blocks: ["bar", "cards"],
      },
      {
        id: "split",
        title: "Hero + table",
        summary: "Lead with Pro, compare below",
        blocks: ["split", "list"],
      },
      {
        id: "rows",
        title: "Compact rows",
        summary: "One scannable matrix",
        blocks: ["bar", "list"],
      },
    ],
  },
  {
    id: "weekly",
    task: "Weekly update",
    kind: "approval",
    question: "Send the weekly update to Northwind?",
    facts: [
      { label: "To", value: "Dana Reyes, Northwind" },
      { label: "Subject", value: "Week 45: ingest is live, dashboard in review" },
      {
        label: "Body",
        value:
          "Ingest runs on staging and took Tuesday's spike without losing an event…",
      },
    ],
  },
];

function WireframePreview({
  blocks = ["bar", "cards"],
}: {
  blocks?: Array<"bar" | "cards" | "split" | "list">;
}) {
  const hasCards = blocks.includes("cards");
  const hasSplit = blocks.includes("split");
  return (
    <svg className="af-dcc__wire" viewBox="0 0 120 80" fill="none" aria-hidden="true">
      <rect className="af-dcc__wire-page" x="4" y="4" width="112" height="72" rx="5" />
      <rect data-tone="ink" x="12" y="11" width="38" height="4.5" rx="2" />
      <rect data-tone="soft" x="92" y="11" width="16" height="4.5" rx="2" />
      {hasCards ? (
        <>
          <rect data-tone="soft" x="12" y="23" width="29" height="44" rx="3.5" />
          <rect data-tone="mid" x="45.5" y="20" width="29" height="47" rx="3.5" />
          <rect data-tone="ink" x="50" y="26" width="16" height="3.5" rx="1.5" />
          <rect data-tone="soft" x="79" y="23" width="29" height="44" rx="3.5" />
        </>
      ) : hasSplit ? (
        <>
          <rect data-tone="mid" x="12" y="22" width="44" height="45" rx="3.5" />
          <rect data-tone="soft" x="61" y="22" width="47" height="12" rx="3" />
          <rect data-tone="soft" x="61" y="38" width="47" height="12" rx="3" />
          <rect data-tone="soft" x="61" y="54" width="47" height="13" rx="3" />
        </>
      ) : (
        <>
          <rect data-tone="mid" x="12" y="22" width="96" height="11" rx="3" />
          <rect data-tone="soft" x="12" y="37" width="96" height="11" rx="3" />
          <rect data-tone="soft" x="12" y="52" width="96" height="11" rx="3" />
        </>
      )}
    </svg>
  );
}

function HandApprovalIcon() {
  return (
    <svg viewBox="0 0 68.155 68.155" fill="none" aria-hidden="true">
      <path
        d="M52.5305 32.6557V24.8463C52.5305 22.1016 54.7555 19.8766 57.5001 19.8766C60.2448 19.8766 62.4698 22.1016 62.4698 24.8463V42.027C62.4698 53.3194 53.3154 62.4735 42.0233 62.4735H34.2388M22.7127 39.7552L15.94 31.8537C14.8314 30.5602 13.2129 29.8159 11.5094 29.8159H11.1235C8.11379 29.8159 5.67395 32.2558 5.67395 35.2655C5.67395 36.3412 5.99241 37.393 6.58919 38.2881L16.4118 53.0221C20.3482 58.9269 26.9753 62.4735 34.0719 62.4735"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52.534 24.1378V16.3284C52.534 13.5837 50.3091 11.3588 47.5644 11.3588C44.8197 11.3588 42.5948 13.5837 42.5948 16.3284V29.8174"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42.5958 29.8198V10.6513C42.5958 7.90661 40.3708 5.68163 37.6262 5.68163C34.8815 5.68163 32.6565 7.90661 32.6565 10.6513V28.4"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.6576 28.3975V16.3284C32.6576 13.5837 30.4326 11.3588 27.6879 11.3588C24.9433 11.3588 22.7183 13.5837 22.7183 16.3284V39.7567"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Decision Card — compact inline decision prompt above the composer supporting numbered choices, wireframe layout picks, approval facts, custom answers, and single-line folding.
 */
export function AfDecisionCard({
  decisions: decisionsProp,
  question: legacyQuestion,
  options: legacyOptions,
  onDecide,
  onLater,
  defaultFolded = false,
  reveal,
  labels: customLabels,
  demoStage = false,
  className,
  style,
}: AfDecisionCardProps = {}) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  const initialList: DecisionCardItem[] =
    decisionsProp ??
    (legacyOptions?.length
      ? [
          {
            id: "legacy",
            question:
              typeof legacyQuestion === "string"
                ? legacyQuestion
                : "Choose how to proceed",
            kind: "decision",
            options: legacyOptions.map((o) => ({
              ...o,
              title: o.title ?? o.label ?? o.id,
              summary:
                o.summary ??
                (o.pros ? `${o.pros}${o.eta ? ` · ${o.eta}` : ""}` : undefined),
            })),
          },
        ]
      : DEFAULT_DECISIONS);

  const [queue, setQueue] = useState<DecisionCardItem[]>(initialList);
  const [pageIdx, setPageIdx] = useState(0);
  const [focusRow, setFocusRow] = useState(0);
  const [folded, setFolded] = useState(defaultFolded);
  const [ownText, setOwnText] = useState("");
  const [composerText, setComposerText] = useState("");
  const [pulsing, setPulsing] = useState(false);
  const [lastAck, setLastAck] = useState<string | null>(null);
  const [srStatus, setSrStatus] = useState("");

  const ownInputRef = useRef<HTMLInputElement | null>(null);
  const showBtnRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (decisionsProp) setQueue(decisionsProp);
  }, [decisionsProp]);

  useEffect(() => {
    if (reveal === undefined) return;
    setFolded(false);
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 520);
    requestAnimationFrame(() => optionRefs.current[0]?.focus());
    return () => window.clearTimeout(t);
  }, [reveal]);

  const activeList = decisionsProp ?? queue;
  const safePage =
    activeList.length > 0 ? Math.min(pageIdx, activeList.length - 1) : 0;
  const current = activeList[safePage] ?? null;

  const settleCurrent = (
    item: DecisionCardItem,
    answer: DecisionAnswer,
    ackSummary: string,
  ) => {
    if (
      legacyOptions?.length &&
      typeof answer === "object" &&
      answer !== null &&
      "option" in answer
    ) {
      onDecide?.(answer.option, answer);
    } else {
      onDecide?.(item.id, answer);
    }
    setOwnText("");
    setLastAck(`${ackSummary} – on it.`);
    setSrStatus(`Decided: ${ackSummary}`);

    if (!decisionsProp) {
      setQueue((prev) => prev.filter((d) => d.id !== item.id));
      setPageIdx((p) => Math.max(0, Math.min(p, activeList.length - 2)));
      setFocusRow(0);
    }
  };

  const mode: "full" | "min" | "none" = !current
    ? "none"
    : folded
      ? "min"
      : "full";

  const kind = current?.kind ?? "decision";
  const effectiveOpts: DecisionCardOption[] =
    kind === "approval"
      ? [
          { id: "__approve", title: labels.approve },
          { id: "__decline", title: labels.decline },
        ]
      : (current?.options ?? []);
  const ownKeyNumber = effectiveOpts.length + 1;

  const cardElement = (
    <div
      className={cn("af-dcc", !demoStage && className)}
      data-mode={mode}
      style={!demoStage ? style : undefined}
      onKeyDown={(e) => {
        if (!current || folded) return;
        if (e.key === "Escape") {
          e.preventDefault();
          setFolded(true);
          onLater?.(current.id);
          requestAnimationFrame(() => showBtnRef.current?.focus());
          return;
        }
        if ((e.target as HTMLElement)?.tagName === "INPUT") {
          if (e.key === "ArrowUp" && !ownText && effectiveOpts.length > 0) {
            e.preventDefault();
            const last = effectiveOpts.length - 1;
            setFocusRow(last);
            optionRefs.current[last]?.focus();
          }
          return;
        }
        const num = Number(e.key);
        if (num >= 1 && num <= effectiveOpts.length) {
          e.preventDefault();
          const picked = effectiveOpts[num - 1];
          if (picked) {
            if (kind === "approval") {
              const dec = picked.id === "__approve" ? "approve" : "decline";
              settleCurrent(current, dec, picked.title);
            } else {
              settleCurrent(current, { option: picked.id }, picked.title);
            }
          }
          return;
        }
        if (num === ownKeyNumber) {
          e.preventDefault();
          ownInputRef.current?.focus();
          return;
        }
        if (
          (e.key === "ArrowDown" || (kind === "pick" && e.key === "ArrowRight")) &&
          effectiveOpts.length > 0
        ) {
          e.preventDefault();
          if (focusRow >= effectiveOpts.length - 1) {
            ownInputRef.current?.focus();
          } else {
            const next = focusRow + 1;
            setFocusRow(next);
            optionRefs.current[next]?.focus();
          }
        } else if (
          (e.key === "ArrowUp" || (kind === "pick" && e.key === "ArrowLeft")) &&
          effectiveOpts.length > 0
        ) {
          e.preventDefault();
          const prev = Math.max(0, focusRow - 1);
          setFocusRow(prev);
          optionRefs.current[prev]?.focus();
        }
      }}
    >
      <span className="af-dcc__sr" role="status" aria-live="polite">
        {srStatus}
      </span>

      <div className="af-dcc__wrap">
        <div className="af-dcc__inner">
          {mode === "min" && current ? (
            <div className="af-dcc__box af-dcc__box--min">
              <div className="af-dcc__head">
                <span className="af-dcc__badge">{labels.needsYou}</span>
                <span className="af-dcc__task" dir="auto">
                  {labels.waiting(activeList.length)}
                </span>
                <span className="af-dcc__tools">
                  <button
                    ref={showBtnRef}
                    type="button"
                    className="af-dcc__link"
                    onClick={() => {
                      setFolded(false);
                      requestAnimationFrame(() => optionRefs.current[0]?.focus());
                    }}
                  >
                    {labels.show}
                  </button>
                </span>
              </div>
            </div>
          ) : current ? (
            <div
              className="af-dcc__box"
              data-pulse={pulsing || undefined}
              role="group"
              aria-label={current.question}
            >
              <div className="af-dcc__head">
                <span className="af-dcc__badge">{labels.needsYou}</span>
                {current.task ? (
                  <span className="af-dcc__task" dir="auto">
                    {current.task}
                  </span>
                ) : (
                  <span className="af-dcc__task" />
                )}

                <span className="af-dcc__tools">
                  {activeList.length > 1 ? (
                    <span className="af-dcc__pager">
                      <button
                        type="button"
                        className="af-dcc__page"
                        aria-label="Previous decision"
                        onClick={() =>
                          setPageIdx(
                            (p) => (p - 1 + activeList.length) % activeList.length,
                          )
                        }
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M15 6C15 6 9 10.42 9 12C9 13.58 15 18 15 18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                      <span
                        className="af-dcc__num af-dcc__count"
                        style={{ minWidth: "6ch" }}
                      >
                        {labels.of(safePage + 1, activeList.length)}
                      </span>
                      <button
                        type="button"
                        className="af-dcc__page"
                        aria-label="Next decision"
                        onClick={() =>
                          setPageIdx((p) => (p + 1) % activeList.length)
                        }
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M9 6C9 6 15 10.42 15 12C15 13.58 9 18 9 18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    </span>
                  ) : null}

                  <button
                    type="button"
                    className="af-dcc__link"
                    aria-keyshortcuts="Escape"
                    onClick={() => {
                      setFolded(true);
                      onLater?.(current.id);
                    }}
                  >
                    {labels.later}
                  </button>
                </span>
              </div>

              <div className="af-dcc__body">
                <p className="af-dcc__q" dir="auto">
                  {current.question}
                </p>

                {kind === "approval" && current.facts?.length ? (
                  <dl className="af-dcc__facts">
                    {current.facts.map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {kind === "pick" ? (
                  <div
                    className="af-dcc__tiles"
                    role="listbox"
                    aria-label={current.question}
                  >
                    {effectiveOpts.map((opt, idx) => (
                      <button
                        key={opt.id}
                        ref={(el) => {
                          optionRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        className="af-dcc__tile"
                        aria-selected={focusRow === idx}
                        aria-keyshortcuts={String(idx + 1)}
                        tabIndex={focusRow === idx ? 0 : -1}
                        onFocus={() => setFocusRow(idx)}
                        onClick={() =>
                          settleCurrent(current, { option: opt.id }, opt.title)
                        }
                      >
                        <span className="af-dcc__frame">
                          {opt.preview ?? <WireframePreview blocks={opt.blocks} />}
                        </span>
                        {opt.recommended ? (
                          <span className="af-dcc__tag af-dcc__tag--tile">
                            {labels.recommended}
                          </span>
                        ) : null}
                        <span className="af-dcc__row">
                          <span className="af-dcc__key af-dcc__num" aria-hidden="true">
                            {idx + 1}
                          </span>
                          <span className="af-dcc__text">
                            <span className="af-dcc__title" dir="auto">
                              {opt.title}
                            </span>
                            {opt.summary ? (
                              <span className="af-dcc__summary" dir="auto">
                                {opt.summary}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="af-dcc__rows"
                    role="listbox"
                    aria-label={current.question}
                    aria-orientation="vertical"
                  >
                    {effectiveOpts.map((opt, idx) => (
                      <button
                        key={opt.id}
                        ref={(el) => {
                          optionRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        className="af-dcc__opt"
                        aria-selected={focusRow === idx}
                        aria-keyshortcuts={String(idx + 1)}
                        tabIndex={focusRow === idx ? 0 : -1}
                        onFocus={() => setFocusRow(idx)}
                        onClick={() => {
                          if (kind === "approval") {
                            const dec =
                              opt.id === "__approve" ? "approve" : "decline";
                            settleCurrent(current, dec, opt.title);
                          } else {
                            settleCurrent(current, { option: opt.id }, opt.title);
                          }
                        }}
                      >
                        <span className="af-dcc__row">
                          <span className="af-dcc__key af-dcc__num" aria-hidden="true">
                            {idx + 1}
                          </span>
                          <span className="af-dcc__text">
                            <span className="af-dcc__title" dir="auto">
                              {opt.title}
                            </span>
                            {opt.summary ? (
                              <span className="af-dcc__summary" dir="auto">
                                {opt.summary}
                              </span>
                            ) : null}
                          </span>
                          {opt.recommended ? (
                            <span className="af-dcc__tag af-dcc__tag--row">
                              {labels.recommended}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="af-dcc__own"
                  onClick={() => ownInputRef.current?.focus()}
                >
                  <span className="af-dcc__key af-dcc__num" aria-hidden="true">
                    {ownKeyNumber}
                  </span>
                  <input
                    ref={ownInputRef}
                    className="af-dcc__input"
                    placeholder={labels.own}
                    aria-label={`${labels.own}: ${current.question}`}
                    aria-keyshortcuts={String(ownKeyNumber)}
                    dir="auto"
                    value={ownText}
                    onChange={(e) => setOwnText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && ownText.trim()) {
                        e.preventDefault();
                        settleCurrent(
                          current,
                          { text: ownText.trim() },
                          ownText.trim(),
                        );
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="af-dcc__send"
                    aria-label="Send"
                    title="Send"
                    data-shown={Boolean(ownText.trim()) || undefined}
                    aria-disabled={!ownText.trim()}
                    tabIndex={ownText.trim() ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!ownText.trim()) return;
                      settleCurrent(
                        current,
                        { text: ownText.trim() },
                        ownText.trim(),
                      );
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 5.5V19"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.2"
                      />
                      <path
                        d="M18 11C18 11 13.58 5 12 5C10.42 5 6 11 6 11"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : !demoStage ? (
            <div className="af-dcc__box af-dcc__box--min">
              <div className="af-dcc__head">
                <span className="af-dcc__task">
                  {lastAck ?? "All decisions answered – continuing run."}
                </span>
                {!decisionsProp ? (
                  <span className="af-dcc__tools">
                    <button
                      type="button"
                      className="af-dcc__link"
                      onClick={() => {
                        setQueue(initialList);
                        setPageIdx(0);
                        setLastAck(null);
                      }}
                    >
                      Reset
                    </button>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!demoStage) return cardElement;

  const statusLineText = !current
    ? (lastAck ?? "All tasks unblocked – everything keeps running.")
    : lastAck ??
      (activeList.length === 3
        ? "Three tasks wait on you – everything else keeps running."
        : `${activeList.length} ${activeList.length === 1 ? "task waits" : "tasks wait"} on you – everything else keeps running.`);

  return (
    <div className={cn("af-dcc-demo", className)} style={style}>
      <p className="af-dcc-demo__line" aria-live="off">
        <span className="af-dcc-demo__mark" aria-hidden="true">
          <span className="af-dcc-demo__mark-grid">
            <i />
            <i style={{ opacity: 0.25 }} />
            <i />
            <i style={{ opacity: 0.25 }} />
            <i />
            <i style={{ opacity: 0.25 }} />
            <i />
            <i style={{ opacity: 0.25 }} />
            <i />
          </span>
        </span>
        <span className="af-dcc-demo__text">{statusLineText}</span>
        {!current && !decisionsProp ? (
          <button
            type="button"
            className="af-dcc__link"
            onClick={() => {
              setQueue(initialList);
              setPageIdx(0);
              setLastAck(null);
            }}
          >
            Reset
          </button>
        ) : null}
      </p>

      {cardElement}

      <div className="af-dcc-demo__composer">
        <section className="af-dcc-ccc" aria-label="Message composer">
          <div className="af-dcc-ccc__write">
            <textarea
              className="af-dcc-ccc__message"
              placeholder="Ask for anything…"
              aria-label="Message"
              spellCheck={false}
              rows={2}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
            />
            <div className="af-dcc-ccc__tools">
              <div className="af-dcc-ccc__group">
                <button
                  type="button"
                  className="af-dcc-ccc__icon-btn"
                  aria-label="Add"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 2.5c.28 0 .5.22.5.5v4.5H13a.5.5 0 0 1 0 1H8.5V13a.5.5 0 0 1-1 0V8.5H3a.5.5 0 0 1 0-1h4.5V3c0-.28.22-.5.5-.5Z"
                    />
                  </svg>
                </button>
                <button type="button" className="af-dcc-ccc__approval">
                  <span className="af-dcc-ccc__approval-icon" aria-hidden="true">
                    <HandApprovalIcon />
                  </span>
                  <span>Request approval</span>
                </button>
              </div>

              <div className="af-dcc-ccc__group">
                <button type="button" className="af-dcc-ccc__model">
                  <span>Auto</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 9C18 9 13.58 15 12 15C10.42 15 6 9 6 9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="af-dcc-ccc__icon-btn"
                  aria-label="Voice input"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 6.5C7 4.01 9.01 2 11.5 2C13.99 2 16 4.01 16 6.5V11.5C16 13.99 13.99 16 11.5 16C9.01 16 7 13.99 7 11.5V6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M11.5 19H11.08C7.57 19 4.58 16.46 4 13M11.5 19H11.92C15.43 19 18.42 16.46 19 13M11.5 19V22"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="af-dcc-ccc__send"
                  aria-label="Send message"
                  disabled={!composerText.trim()}
                  onClick={() => setComposerText("")}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 5.5V19"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18 11C18 11 13.58 5 12 5C10.42 5 6 11 6 11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export const AfDecisionCardPattern = AfDecisionCard;
export const DecisionCard = AfDecisionCard;
