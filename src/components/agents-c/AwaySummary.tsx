import {
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { AgentPixelMark } from "./_marks";

export type AwayBucket = "done" | "attention" | "blocked";

export interface AwayDigestItem {
  id: string;
  bucket: AwayBucket;
  title: string;
  detail: string;
  time: string;
}

export type AwayItemKind = "needs-you" | "failed" | "done";

export interface AwayItem {
  id: string;
  title: string;
  kind: AwayItemKind;
  detail?: string;
  /** Custom button text, or `false` for no button. */
  action?: string | false;
}

export interface AwaySummaryLabels {
  title: string;
  needsYou: (n: number) => string;
  failed: (n: number) => string;
  done: (n: number) => string;
  decide: string;
  retry: string;
  open: string;
  showMore: (n: number) => string;
  showLess: string;
  gotIt: string;
  divider: (awayText: string, total: number) => string;
}

export interface AfAwaySummaryProps {
  /** When the user left (Date, epoch ms, ISO string, or duration text). */
  since?: Date | number | string;
  /** Catch-up items in any order (`needs-you` automatically sorts first). */
  items?: AwayItem[];
  onAction?: (id: string, item: AwayItem) => void | Promise<void>;
  onDismiss?: () => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Rows shown before "Show N more" (default 5). */
  limit?: number;
  timeStyle?: "duration" | "clock";
  now?: Date | number;
  labels?: Partial<AwaySummaryLabels>;
  /** Render subtle before/after chat thread context around the inline card. */
  showThreadContext?: boolean;
  /** Legacy compatibility props. */
  title?: ReactNode;
  windowText?: ReactNode;
  initialItems?: AwayDigestItem[];
  onInspect?: (item: AwayDigestItem) => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_ITEMS: AwayItem[] = [
  {
    id: "aw-1",
    title: "Ingest pipeline",
    kind: "needs-you",
    detail: "Waiting on: Which queue – Kafka or SQS?",
    action: "Decide",
  },
  {
    id: "aw-2",
    title: "Weekly report",
    kind: "needs-you",
    detail: "Waiting on: Send it to Dana or the whole team?",
    action: "Decide",
  },
  {
    id: "aw-3",
    title: "Billing sync",
    kind: "failed",
    detail: "Failed: rate limit on Stripe after 1,284 invoices",
    action: "Retry",
  },
  {
    id: "aw-4",
    title: "Auth refactor",
    kind: "done",
    detail: "Opened PR #482 · on staging",
    action: "Open",
  },
  {
    id: "aw-5",
    title: "Usage page",
    kind: "done",
    detail: "Shipped to Northwind",
    action: "Open",
  },
  {
    id: "aw-6",
    title: "Evalkit docs",
    kind: "done",
    detail: "Published 14 pages",
    action: "Open",
  },
  {
    id: "aw-7",
    title: "Load test",
    kind: "done",
    detail: "Passed at 20k events a minute",
    action: "Open",
  },
  {
    id: "aw-8",
    title: "Flaky tests",
    kind: "done",
    detail: "Quarantined 3 tests in checkout",
    action: "Open",
  },
];

const DEFAULT_LABELS: AwaySummaryLabels = {
  title: "While you were away",
  needsYou: (n) => `${n} ${n === 1 ? "needs you" : "need you"}`,
  failed: (n) => `${n} failed`,
  done: (n) => `${n} done`,
  decide: "Decide",
  retry: "Retry",
  open: "Open",
  showMore: (n) => `Show ${n} more`,
  showLess: "Show less",
  gotIt: "Got it",
  divider: (awayText, total) =>
    `You were away ${awayText} · ${total} ${total === 1 ? "update" : "updates"}`,
};

function formatAwaySpan(
  since: Date | number | string | undefined,
  now: Date | number | undefined,
): string {
  if (!since) return "2h 14m";
  if (typeof since === "string" && /^\d+\s*[hm]/i.test(since.trim())) {
    return since.trim();
  }
  const sinceMs =
    since instanceof Date
      ? since.getTime()
      : typeof since === "number"
        ? since
        : Date.parse(since);
  if (Number.isNaN(sinceMs)) return String(since);
  const nowMs =
    now instanceof Date
      ? now.getTime()
      : typeof now === "number"
        ? now
        : sinceMs + (2 * 60 + 14) * 60_000;
  const diffMin = Math.max(1, Math.round((nowMs - sinceMs) / 60_000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function ItemStatusIcon({ kind }: { kind: AwayItemKind }) {
  if (kind === "needs-you") {
    return (
      <span className="af-agc-away__ico is-needs" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle
            className="af-agc-away__halo"
            cx="7"
            cy="7"
            r="5.25"
            fill="var(--af-away-needs)"
          />
          <circle
            cx="7"
            cy="7"
            r="5.25"
            fill="none"
            stroke="var(--af-away-needs)"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="7" r="2.25" fill="var(--af-away-needs)" />
        </svg>
      </span>
    );
  }
  if (kind === "failed") {
    return (
      <span className="af-agc-away__ico is-failed" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6" fill="var(--af-away-failed)" />
          <path
            d="M7 4v3.4"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.8" r="0.85" fill="#fff" />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-agc-away__ico is-done" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="6" fill="var(--af-away-done)" />
        <path
          d="M4.3 7.2 6.1 9 9.7 5.2"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function AfAwaySummary({
  since,
  items: propItems,
  onAction,
  onDismiss,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  limit = 5,
  now,
  labels: labelOverrides,
  showThreadContext = true,
  title,
  windowText,
  initialItems,
  onInspect,
  className,
  style,
}: AfAwaySummaryProps = {}) {
  const L = { ...DEFAULT_LABELS, ...labelOverrides };

  const normalizedItems = useMemo<AwayItem[]>(() => {
    const raw: AwayItem[] =
      propItems && propItems.length > 0
        ? propItems
        : initialItems && initialItems.length > 0
          ? initialItems.map((it) => ({
              id: it.id,
              title: it.title,
              detail: it.detail,
              kind:
                it.bucket === "attention"
                  ? "needs-you"
                  : it.bucket === "blocked"
                    ? "failed"
                    : "done",
            }))
          : DEFAULT_ITEMS;

    const order: Record<AwayItemKind, number> = {
      "needs-you": 0,
      failed: 1,
      done: 2,
    };
    return [...raw].sort((a, b) => order[a.kind] - order[b.kind]);
  }, [initialItems, propItems]);

  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [expandedAll, setExpandedAll] = useState(false);
  const [actedIds, setActedIds] = useState<Set<string>>(() => new Set());
  const [replyDraft, setReplyDraft] = useState("");
  const [sentReplies, setSentReplies] = useState<string[]>([]);

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (next: boolean) => {
    if (controlledCollapsed === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  const displayItems = useMemo(
    () =>
      normalizedItems.map((item) =>
        actedIds.has(item.id) && item.kind !== "done"
          ? {
              ...item,
              kind: "done" as const,
              detail:
                item.kind === "needs-you"
                  ? "Decision sent · continuing run"
                  : "Retrying Stripe sync batch",
              action: "Open",
            }
          : item,
      ),
    [actedIds, normalizedItems],
  );

  const counts = useMemo(() => {
    let needs = 0;
    let failed = 0;
    let done = 0;
    for (let i = 0; i < displayItems.length; i += 1) {
      const k = displayItems[i].kind;
      if (k === "needs-you") needs += 1;
      else if (k === "failed") failed += 1;
      else done += 1;
    }
    return { needs, failed, done };
  }, [displayItems]);

  const visibleRows = expandedAll
    ? displayItems
    : displayItems.slice(0, Math.max(1, limit));
  const hiddenCount = Math.max(0, displayItems.length - limit);

  const awayText =
    typeof windowText === "string"
      ? windowText
      : formatAwaySpan(since, now);

  const handleRowAction = (item: AwayItem) => {
    if (item.kind !== "done") {
      setActedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    }
    onAction?.(item.id, item);
    if (initialItems) {
      const match = initialItems.find((x) => x.id === item.id);
      if (match) onInspect?.(match);
    }
  };

  const handleReplySubmit = () => {
    const trimmed = replyDraft.trim();
    if (!trimmed) return;
    setSentReplies((prev) => [...prev, trimmed]);
    setReplyDraft("");
  };

  const handleReplyKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleReplySubmit();
    }
  };

  const summaryCard = isCollapsed ? (
    <button
      type="button"
      className="af-agc-away__divider"
      onClick={() => setCollapsed(false)}
    >
      <span className="af-agc-away__div-line" aria-hidden="true" />
      <span className="af-agc-away__div-pill">
        <span className="af-agc-away__div-dot" aria-hidden="true" />
        <span>{L.divider(awayText, displayItems.length)}</span>
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
      </span>
      <span className="af-agc-away__div-line" aria-hidden="true" />
    </button>
  ) : (
    <div className="af-agc-away">
      <div className="af-agc-away__head">
        <div className="af-agc-away__head-left">
          <span className="af-agc-away__title">{title ?? L.title}</span>
          <span className="af-agc-away__dur">· {awayText}</span>
        </div>

        <div className="af-agc-away__counts">
          {counts.needs > 0 ? (
            <span className="af-agc-away__cnt is-needs">
              <span className="af-agc-away__dot is-needs" aria-hidden="true" />
              {L.needsYou(counts.needs)}
            </span>
          ) : null}
          {counts.failed > 0 ? (
            <span className="af-agc-away__cnt is-failed">
              {counts.needs > 0 ? (
                <span className="af-agc-away__sep" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span className="af-agc-away__dot is-failed" aria-hidden="true" />
              {L.failed(counts.failed)}
            </span>
          ) : null}
          {counts.done > 0 ? (
            <span className="af-agc-away__cnt is-done">
              {counts.needs > 0 || counts.failed > 0 ? (
                <span className="af-agc-away__sep" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span className="af-agc-away__dot is-done" aria-hidden="true" />
              {L.done(counts.done)}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="af-agc-away__list" aria-label="Away updates">
        {visibleRows.map((item) => {
          const btnText =
            item.action === false
              ? null
              : (item.action ??
                (item.kind === "needs-you"
                  ? L.decide
                  : item.kind === "failed"
                    ? L.retry
                    : L.open));

          return (
            <li
              key={item.id}
              className={cn("af-agc-away__row", `is-${item.kind}`)}
            >
              <ItemStatusIcon kind={item.kind} />

              <div className="af-agc-away__row-copy">
                <span className="af-agc-away__row-title">{item.title}</span>
                {item.detail ? (
                  <span className="af-agc-away__row-detail">{item.detail}</span>
                ) : null}
              </div>

              {btnText ? (
                <button
                  type="button"
                  className={cn(
                    "af-agc-away__row-btn",
                    item.kind === "needs-you" && "is-elevated",
                  )}
                  onClick={() => handleRowAction(item)}
                >
                  {btnText}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="af-agc-away__foot">
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="af-agc-away__more-btn"
            onClick={() => setExpandedAll((v) => !v)}
          >
            <span>
              {expandedAll ? L.showLess : L.showMore(hiddenCount)}
            </span>
            <svg
              className={cn("af-agc-away__chev", expandedAll && "is-up")}
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
        ) : (
          <span />
        )}

        <button
          type="button"
          className="af-agc-away__got-btn"
          onClick={() => {
            setCollapsed(true);
            onDismiss?.();
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
              d="m2.4 6.2 2.2 2.2 4.9-5"
              stroke="currentColor"
              strokeWidth="1.45"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{L.gotIt}</span>
        </button>
      </div>
    </div>
  );

  if (!showThreadContext) {
    return (
      <div className={cn("af-agc-away-wrap", className)} style={style}>
        {summaryCard}
      </div>
    );
  }

  return (
    <div className={cn("af-agc-away-wrap", className)} style={style}>
      <div className="af-agc-away__user-row">
        <div className="af-agc-away__user-bubble">
          Get ingest onto staging today – ping me if you need anything.
        </div>
      </div>

      <div className="af-agc-away__agent-row">
        <span className="af-agc-away__avatar" aria-hidden="true">
          <AgentPixelMark seed="ops-lead" size={11} color="#a651f0" />
        </span>
        <span className="af-agc-away__agent-msg">
          On it. I&apos;ll split it into tasks and keep going while you&apos;re
          out.
        </span>
      </div>

      {summaryCard}

      {sentReplies.map((msg, idx) => (
        <div key={idx} className="af-agc-away__user-row">
          <div className="af-agc-away__user-bubble">{msg}</div>
        </div>
      ))}

      <div className="af-agc-away__composer">
        <input
          type="text"
          className="af-agc-away__input"
          value={replyDraft}
          onChange={(e) => setReplyDraft(e.target.value)}
          onKeyDown={handleReplyKey}
          placeholder="Reply to the agent…"
          aria-label="Reply to the agent"
        />
        <button
          type="button"
          className={cn(
            "af-agc-away__send",
            !replyDraft.trim() && "is-disabled",
          )}
          disabled={!replyDraft.trim()}
          aria-label="Send reply"
          onClick={handleReplySubmit}
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
      </div>
    </div>
  );
}

export const AfAwaySummaryPattern = AfAwaySummary;
export type AfAwaySummaryPatternProps = AfAwaySummaryProps;
