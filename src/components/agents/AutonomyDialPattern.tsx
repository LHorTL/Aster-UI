import { useMemo, useState } from "react";
import {
  AUTO_ACTIONS,
  BrandLogo,
  HeaderSpark,
  TIER_LABEL,
  type AutoAction,
} from "../_shared/agents-a";

export type { AutoAction };

export interface AfAutonomyDialProps {
  title?: string;
  subtitle?: string;
  actions?: AutoAction[];
  defaultTier?: 0 | 1 | 2;
  className?: string;
}

export type AfAutonomyDialPatternProps = AfAutonomyDialProps;

export function asksFirst(
  action: AutoAction,
  tier: number,
  pinned: Set<string> | Record<string, boolean> = new Set(),
): boolean {
  const isPinned = pinned instanceof Set ? pinned.has(action.id) : Boolean(pinned[action.id]);
  if (isPinned) return true;
  if (tier <= 0) return true;
  if (tier === 1) return action.risk !== "safe";
  return false;
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14.5V17.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {locked ? (
        <path
          d="M7.5 9V6.5C7.5 4.01 9.51 2 12 2C14.49 2 16.5 4.01 16.5 6.5V9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M7.5 9V6.5C7.5 4.01 9.51 2 12 2C13.96 2 15.87 3.25 16.5 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
      <rect x="4.5" y="9" width="15" height="12.5" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function AfAutonomyDial({
  title = "Sales agent",
  subtitle = "What it may do without asking you",
  actions = AUTO_ACTIONS,
  defaultTier = 1,
  className,
}: AfAutonomyDialProps = {}) {
  const [tier, setTier] = useState<0 | 1 | 2>(defaultTier);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(actions.filter((a) => a.defaultPinned).map((a) => a.id)),
  );

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { autoList, askList } = useMemo(() => {
    const auto: AutoAction[] = [];
    const ask: AutoAction[] = [];
    for (const act of actions) {
      if (asksFirst(act, tier, pinnedIds)) ask.push(act);
      else auto.push(act);
    }
    return { autoList: auto, askList: ask };
  }, [actions, tier, pinnedIds]);

  const renderRow = (action: AutoAction) => {
    const isPinned = pinnedIds.has(action.id);
    return (
      <div key={action.id} className="af-adlc__row">
        <span className="af-adlc__icon" aria-hidden="true">
          <BrandLogo kind={action.brand ?? "notion"} />
        </span>
        <span className="af-adlc__label">{action.label}</span>
        {action.risk !== "safe" ? (
          <span className="af-adlc__risk" data-risk={action.risk}>
            {action.risk === "risky" ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2.4 14.2 13.2H1.8L8 2.4Z" />
                <path d="M8 6.5v2.8M8 11.4h.01" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 1.8 14.2 8 8 14.2 1.8 8 8 1.8Z" />
                <path d="M8 5.4v3M8 10.7h.01" />
              </svg>
            )}
            {action.risk === "risky" ? "Risky" : "Destructive"}
          </span>
        ) : null}
        <button
          type="button"
          className="af-adlc__pin"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${action.label}` : `Always ask before ${action.label}`}
          title={isPinned ? "Pinned: always asks first" : "Pin to always ask first"}
          onClick={() => togglePin(action.id)}
        >
          <LockIcon locked={isPinned} />
        </button>
      </div>
    );
  };

  return (
    <section className={["af-adlc", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="af-adlc__head">
        <span className="af-adlc__spark" aria-hidden="true">
          <HeaderSpark size={14} />
        </span>
        <div>
          <div className="af-adlc__title">{title}</div>
          <div className="af-adlc__sub">{subtitle}</div>
        </div>
      </header>

      <div className="af-adlc__seg" role="radiogroup" aria-label="Autonomy level">
        {TIER_LABEL.map((label, idx) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={tier === idx}
            className="af-adlc__seg-opt"
            onClick={() => setTier(idx as 0 | 1 | 2)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="af-adlc__group">
        <div className="af-adlc__group-head">
          <span>Runs on its own</span>
          <span className="af-adlc__count">{autoList.length}</span>
        </div>
        <div className="af-adlc__rows">
          {autoList.length > 0 ? (
            autoList.map(renderRow)
          ) : (
            <div style={{ fontSize: 12, color: "var(--adlc-muted)", padding: "6px 2px" }}>
              Nothing runs without approval
            </div>
          )}
        </div>
      </div>

      <div className="af-adlc__group" style={{ marginTop: 14 }}>
        <div className="af-adlc__group-head">
          <span>Asks you first</span>
          <span className="af-adlc__count">{askList.length}</span>
        </div>
        <div className="af-adlc__rows">
          {askList.length > 0 ? (
            askList.map(renderRow)
          ) : (
            <div style={{ fontSize: 12, color: "var(--adlc-muted)", padding: "6px 2px" }}>
              Every action runs automatically
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const AfAutonomyDialPattern = AfAutonomyDial;
