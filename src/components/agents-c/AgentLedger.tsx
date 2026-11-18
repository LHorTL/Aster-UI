import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ToolBrandMark } from "./_marks";

export type LedgerCategory = "inference" | "tool" | "cache";

export interface LedgerEntry {
  id: string;
  /** What the agent changed, e.g. "Changed plan price". */
  action?: string;
  /** Target entity, e.g. "Pro seat". */
  target?: string;
  /** External system, e.g. "Stripe", "HubSpot", "GitHub". */
  system?: string;
  icon?: ReactNode;
  /** Epoch ms when the change occurred. */
  at?: number;
  /** `[before, after]` values rendered as `before (struck) → after`. */
  change?: [string, string];
  /** Single-line detail when `change` tuple is omitted. */
  detail?: string;
  /** `false` for irreversible external actions (sent email, payout). */
  reversible?: boolean;
  /** Upstream change ids this entry builds on; undoing upstream cascades here. */
  dependsOn?: string[];
  /** Legacy compatibility fields. */
  actor?: string;
  model?: string;
  category?: LedgerCategory;
  calls?: number;
  tokens?: number;
  costUsd?: number;
}

export interface AfAgentLedgerProps {
  /** External changes made by the agent (any order; newest displays first). */
  entries?: LedgerEntry[];
  /** Agent name shown quietly next to the title. */
  agent?: string;
  /** Clock in epoch ms for relative times. */
  now?: number;
  /** Controlled undone entry ids. */
  undone?: string[];
  defaultUndone?: string[];
  onUndo?: (ids: string[]) => void;
  onRedo?: (ids: string[]) => void;
  /** Highlight a specific entry's cascade chain (for walkthroughs). */
  pointAt?: string | null;
  title?: ReactNode;
  /** Legacy compatibility prop. */
  budgetUsd?: number;
  className?: string;
  style?: CSSProperties;
}

const BASE_NOW = 1_762_000_000_000;

const DEFAULT_ENTRIES: LedgerEntry[] = [
  {
    id: "ldg-5",
    action: "Sent launch announcement",
    target: "3,812 customers",
    system: "HubSpot",
    at: BASE_NOW,
    detail: "Campaign #84 · delivered to 3,812 recipients",
    reversible: false,
    dependsOn: ["ldg-3", "ldg-1"],
  },
  {
    id: "ldg-4",
    action: "Updated 212 open deals",
    target: "Q4 renewals",
    system: "HubSpot",
    at: BASE_NOW - 5_000,
    change: ["$29 / seat", "$39 / seat"],
    reversible: true,
    dependsOn: ["ldg-3"],
  },
  {
    id: "ldg-3",
    action: "Changed price",
    target: "Pro plan",
    system: "Stripe",
    at: BASE_NOW - 10_000,
    change: ["$29 / month", "$39 / month"],
    reversible: true,
    dependsOn: ["ldg-1"],
  },
  {
    id: "ldg-2",
    action: "Deployed",
    target: "affectui.com",
    system: "Vercel",
    at: BASE_NOW - 15_000,
    change: ["#481", "#482 in production"],
    reversible: true,
    dependsOn: ["ldg-1"],
  },
  {
    id: "ldg-1",
    action: "Merged PR #482",
    target: "Pricing page v2",
    system: "GitHub",
    at: BASE_NOW - 20_000,
    detail: "pricing-v2 → main",
    reversible: true,
  },
];

function formatRelativeAgo(at: number | undefined, now: number): string {
  if (!at || now - at < 2500) return "just now";
  const sec = Math.max(1, Math.round((now - at) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

export function AfAgentLedger({
  entries: propEntries,
  agent = "Launch agent",
  now = BASE_NOW,
  undone: controlledUndone,
  defaultUndone = [],
  onUndo,
  onRedo,
  pointAt = null,
  title = "Ledger",
  className,
  style,
}: AfAgentLedgerProps = {}) {
  const entries = useMemo<LedgerEntry[]>(() => {
    const raw =
      propEntries && propEntries.length > 0 ? propEntries : DEFAULT_ENTRIES;
    return [...raw]
      .map((item, idx) => {
        if (!item.action && item.actor) {
          return {
            ...item,
            action: `Executed ${item.category ?? "tool"} batch`,
            target: item.actor,
            system: "Stripe",
            at: now - (idx + 1) * 120_000,
            detail: `${item.calls ?? 1} calls · $${(item.costUsd ?? 0.12).toFixed(2)}`,
          };
        }
        return item;
      })
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  }, [now, propEntries]);

  const [internalUndone, setInternalUndone] =
    useState<string[]>(defaultUndone);
  const [hoveredUndoId, setHoveredUndoId] = useState<string | null>(null);
  const isAutoStream =
    !propEntries &&
    controlledUndone === undefined &&
    defaultUndone.length === 0 &&
    internalUndone.length === 0 &&
    pointAt === null;
  const [streamCount, setStreamCount] = useState<number>(() =>
    !propEntries && controlledUndone === undefined && defaultUndone.length === 0
      ? 1
      : entries.length,
  );

  useEffect(() => {
    if (!isAutoStream) {
      setStreamCount(entries.length);
      return;
    }
    if (streamCount >= entries.length) return;
    const timer = window.setInterval(() => {
      setStreamCount((prev) => (prev >= entries.length ? prev : prev + 1));
    }, 620);
    return () => window.clearInterval(timer);
  }, [entries.length, isAutoStream, streamCount]);

  const visibleEntries = useMemo(() => {
    if (!isAutoStream || streamCount >= entries.length) return entries;
    return entries.slice(entries.length - Math.max(1, streamCount));
  }, [entries, isAutoStream, streamCount]);

  const undoneSet = useMemo(
    () => new Set(controlledUndone ?? internalUndone),
    [controlledUndone, internalUndone],
  );

  const activeTriggerId = hoveredUndoId ?? pointAt;

  // Compute transitive downstream dependents of a given entry id
  const getDownstreamChain = (rootId: string) => {
    const alsoUndo = new Set<string>();
    const blocked = new Set<string>();
    const visited = new Set<string>([rootId]);
    const queue = [rootId];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (let i = 0; i < entries.length; i += 1) {
        const candidate = entries[i];
        if (visited.has(candidate.id)) continue;
        if (candidate.dependsOn && candidate.dependsOn.includes(cur)) {
          visited.add(candidate.id);
          if (candidate.reversible === false) {
            blocked.add(candidate.id);
          } else {
            alsoUndo.add(candidate.id);
            queue.push(candidate.id);
          }
        }
      }
    }
    return { alsoUndo, blocked };
  };

  const previewCascade = useMemo(() => {
    if (!activeTriggerId || undoneSet.has(activeTriggerId)) {
      return { alsoUndo: new Set<string>(), blocked: new Set<string>() };
    }
    return getDownstreamChain(activeTriggerId);
  }, [activeTriggerId, entries, undoneSet]);

  const handleToggleUndo = (entry: LedgerEntry) => {
    setStreamCount(entries.length);
    if (entry.reversible === false) return;

    if (undoneSet.has(entry.id)) {
      // Redo this entry (plus any upstream prerequisite that was undone)
      const idsToRedo = [
        entry.id,
        ...(entry.dependsOn ?? []).filter((id) => undoneSet.has(id)),
      ];
      if (controlledUndone === undefined) {
        setInternalUndone((prev) => prev.filter((id) => !idsToRedo.includes(id)));
      }
      onRedo?.(idsToRedo);
    } else {
      const { alsoUndo } = getDownstreamChain(entry.id);
      const idsToUndo = [
        entry.id,
        ...[...alsoUndo].filter((id) => !undoneSet.has(id)),
      ];
      if (controlledUndone === undefined) {
        setInternalUndone((prev) => [
          ...prev,
          ...idsToUndo.filter((id) => !prev.includes(id)),
        ]);
      }
      onUndo?.(idsToUndo);
      setHoveredUndoId(null);
    }
  };

  const undoneCount = visibleEntries.filter((e) => undoneSet.has(e.id)).length;
  const reservedStageMinH = !propEntries ? entries.length * 58 + 44 : undefined;
  const effectiveNow = !propEntries ? (visibleEntries[0]?.at ?? now) : now;

  return (
    <div
      className={cn("af-agc-ldg", className)}
      style={{
        ...(reservedStageMinH ? { minHeight: reservedStageMinH } : undefined),
        ...style,
      }}
    >
      {/* Frameless top bar */}
      <div className="af-agc-ldg__bar">
        <div className="af-agc-ldg__bar-left">
          <svg
            className="af-agc-ldg__ico"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="2.5"
              y="2"
              width="11"
              height="12"
              rx="2.2"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
          </svg>
          <span className="af-agc-ldg__title">{title}</span>
          {agent ? <span className="af-agc-ldg__agent">{agent}</span> : null}
        </div>

        <div className="af-agc-ldg__bar-right">
          <span>
            <strong className="af-agc-ldg__cnt-num">
              {visibleEntries.length}
            </strong>{" "}
            {visibleEntries.length === 1 ? "change" : "changes"}
          </span>
          {undoneCount > 0 ? (
            <span className="af-agc-ldg__undone-cnt">
              · {undoneCount} undone
            </span>
          ) : null}
        </div>
      </div>

      {/* Single elevated white card panel */}
      <div
        className="af-agc-ldg__panel"
        role="list"
        aria-label="External changes"
      >
        {visibleEntries.map((entry) => {
          const isUndone = undoneSet.has(entry.id);
          const isReversible = entry.reversible !== false;
          const isAlsoUndo =
            !isUndone && previewCascade.alsoUndo.has(entry.id);
          const isCantUndo = previewCascade.blocked.has(entry.id);

          return (
            <div
              key={entry.id}
              role="listitem"
              className={cn(
                "af-agc-ldg__row",
                isUndone && "is-undone",
                isAlsoUndo && "is-cascade-undo",
                isCantUndo && "is-cascade-blocked",
              )}
            >
              <span className="af-agc-ldg__sys-tile" aria-hidden="true">
                {entry.icon ?? (
                  <ToolBrandMark name={entry.system ?? "Stripe"} size={13} />
                )}
              </span>

              <div className="af-agc-ldg__copy">
                <div className="af-agc-ldg__top-line">
                  <span className="af-agc-ldg__action-wrap">
                    <span className="af-agc-ldg__action">{entry.action}</span>
                    {entry.target ? (
                      <span className="af-agc-ldg__target">{entry.target}</span>
                    ) : null}
                  </span>

                  {isAlsoUndo ? (
                    <span className="af-agc-ldg__cascade-pill is-also">
                      Also undone
                    </span>
                  ) : null}

                  {isCantUndo ? (
                    <span className="af-agc-ldg__cascade-pill is-blocked">
                      Can&apos;t undo
                    </span>
                  ) : null}
                </div>

                <div className="af-agc-ldg__sub-line">
                  {entry.change ? (
                    <span className="af-agc-ldg__diff">
                      <span className="af-agc-ldg__before">
                        {entry.change[0]}
                      </span>
                      <span className="af-agc-ldg__arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="af-agc-ldg__after">
                        {entry.change[1]}
                      </span>
                    </span>
                  ) : entry.detail ? (
                    <span className="af-agc-ldg__detail">{entry.detail}</span>
                  ) : null}
                </div>
              </div>

              <div className="af-agc-ldg__right">
                <span className="af-agc-ldg__meta">
                  {formatRelativeAgo(entry.at, effectiveNow)}
                  {entry.system ? ` · ${entry.system}` : ""}
                </span>

                {isReversible ? (
                  <button
                    type="button"
                    className={cn(
                      "af-agc-ldg__undo-btn",
                      isUndone && "is-redo",
                    )}
                    onMouseEnter={() => {
                      setStreamCount(entries.length);
                      if (!isUndone) setHoveredUndoId(entry.id);
                    }}
                    onMouseLeave={() => setHoveredUndoId(null)}
                    onFocus={() => {
                      if (!isUndone) setHoveredUndoId(entry.id);
                    }}
                    onBlur={() => setHoveredUndoId(null)}
                    onClick={() => handleToggleUndo(entry)}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.2 3.2 1.8 5.5l2.4 2.3M2.1 5.5h5.4a2.7 2.7 0 0 1 0 5.4H6.2"
                        stroke="currentColor"
                        strokeWidth="1.35"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{isUndone ? "Redo" : "Undo"}</span>
                  </button>
                ) : (
                  <span className="af-agc-ldg__sent-tag">Sent</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const AfAgentLedgerPattern = AfAgentLedger;
export type AfAgentLedgerPatternProps = AfAgentLedgerProps;
