import { useEffect, useRef, useState } from "react";
import { AfIcon } from "../../ui";
import { cn } from "../../primitives";
import {
  type ReactionBarProps,
  type ReactionItem,
  type ReactionKey,
  ReactionShareSvg,
  RollingCount,
  copyText,
  reactionMeta,
  useTransient,
} from "../_shared/chat";

/**
 * Reaction Bar: bare flex row of 4 individual hairline pill buttons (Like, Comment, Repost, Share)
 * with springy icon pop, rolling digit counter, and paper-plane share morphing to check.
 */
function ReactionBar({
  reactions = {},
  actions = ["like", "comment", "repost", "share"],
  shareUrl = "https://example.com/share/demo-session",
  onReact,
  className,
}: ReactionBarProps) {
  const [state, setState] = useState<Record<ReactionKey, ReactionItem>>(() => ({
    like: { count: 128, active: false, ...reactions.like },
    comment: { count: 24, active: false, ...reactions.comment },
    repost: { count: 9, active: false, ...reactions.repost },
    share: { active: false, ...reactions.share },
  }));
  const [copied, setCopied] = useTransient(1500);
  const [poppingKey, setPoppingKey] = useState<ReactionKey | null>(null);
  const [announce, setAnnounce] = useState("");
  const popTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (popTimer.current) window.clearTimeout(popTimer.current);
    },
    [],
  );

  const triggerPop = (key: ReactionKey) => {
    setPoppingKey(key);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setPoppingKey(null), 340);
  };

  const toggle = (key: ReactionKey) => {
    triggerPop(key);
    const item = state[key];
    if (key === "share") {
      copyText(shareUrl);
      setCopied(true);
      onReact?.("share", { ...item, active: true });
      setAnnounce("Link copied");
      return;
    }
    const active = !item.active;
    const nextItem: ReactionItem = {
      ...item,
      active,
      count: item.count === undefined ? undefined : Math.max(0, item.count + (active ? 1 : -1)),
    };
    setState((prev) => ({
      ...prev,
      [key]: nextItem,
    }));
    onReact?.(key, nextItem);
    setAnnounce(`${reactionMeta[key].label} ${active ? "added" : "removed"}`);
  };

  return (
    <div className={cn("af-ch-reactions", className)} role="group" aria-label="Reactions">
      {actions.map((key) => {
        const item = state[key];
        const meta = reactionMeta[key];
        const isActive = key === "share" ? copied : Boolean(item.active);
        const label = `${meta.label}${item.count !== undefined ? `, ${item.count}` : ""}`;
        const showCheck = key === "share" && copied;
        return (
          <button
            key={key}
            type="button"
            className="af-ch-reaction"
            data-key={key}
            data-active={isActive || undefined}
            data-pop={poppingKey === key || undefined}
            aria-pressed={isActive}
            aria-label={label}
            onClick={() => toggle(key)}
          >
            <span className="af-ch-reaction__icon" aria-hidden>
              {showCheck ? (
                <AfIcon name="check" size={17} />
              ) : key === "share" ? (
                <ReactionShareSvg size={17} />
              ) : (
                <AfIcon name={meta.icon} size={17} />
              )}
            </span>
            {item.count !== undefined ? <RollingCount value={item.count} /> : null}
          </button>
        );
      })}
      <span className="af-ch-live" role="status">
        {announce}
      </span>
    </div>
  );
}

export { ReactionBar as AfReactionBar };
