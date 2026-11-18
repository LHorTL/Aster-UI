import { useRef, useState, type CSSProperties } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { Demo, NOTICES, NOTICE_PEEK, Note, NoticeItem, NoticePatternArt } from "../_shared/data";

export type { NoticeItem };

export interface AfNotificationStackPatternProps {
  /** Initial desktop notice items. */
  initialNotices?: NoticeItem[];
  /** Callback when a notice is dismissed. */
  onDismiss?: (id: string) => void;
  /** Callback when a notice primary action is clicked. */
  onAction?: (notice: NoticeItem) => void;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

/**
 * Desktop notification stack: trailing cards peek 12px below the front card at 0.95 / 0.90 scale
 * with monochrome radial-faded geometric corner art; dismissing slides the next card forward in 320ms.
 */
function NotificationStackDemo({
  initialNotices = NOTICES,
  onDismiss,
  onAction,
  showNote = false,
  className,
  style,
}: AfNotificationStackPatternProps = {}) {
  const [items, setItems] = useState<NoticeItem[]>(initialNotices);
  const [leaving, setLeaving] = useState<string[]>([]);
  const bodyRefs = useRef(new Map<string, HTMLElement>());
  const [heights, setHeights] = useState<Record<string, number>>({});

  useIsomorphicLayoutEffect(() => {
    const sync = () => {
      const next: Record<string, number> = {};
      bodyRefs.current.forEach((node, id) => {
        next[id] = node.offsetHeight;
      });
      setHeights((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
          return prev;
        }
        return next;
      });
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    bodyRefs.current.forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [items, leaving]);

  const dismiss = (id: string) => {
    setLeaving((current) => (current.includes(id) ? current : [...current, id]));
    onDismiss?.(id);
    window.setTimeout(() => {
      setItems((current) => current.filter((notice) => notice.id !== id));
      setLeaving((current) => current.filter((item) => item !== id));
    }, 320);
  };

  const visible = items.filter((notice) => !leaving.includes(notice.id));
  const front = visible[0] ? heights[visible[0].id] ?? 0 : 0;
  const stackHeight = visible.length ? front + Math.min(visible.length - 1, 2) * NOTICE_PEEK : 0;

  return (
    <Demo>
      {items.length ? (
        <section className={cn("af-dt-ns", className)} aria-label="Notifications" style={{ height: stackHeight || undefined, ...style }}>
          {items.map((notice) => {
            const index = visible.findIndex((item) => item.id === notice.id);
            const gone = index === -1;
            const depth = Math.max(0, index);
            const isBehind = !gone && depth > 0;
            const naturalH = heights[notice.id] ?? front;
            const clampedBehindH = isBehind && front > 0 ? Math.min(naturalH, front) : naturalH;
            const y = gone || depth === 0 ? 0 : Math.max(0, front - clampedBehindH) + Math.min(depth, 2) * NOTICE_PEEK;
            const scale = gone ? 1 : 1 - Math.min(depth, 2) * 0.05;
            return (
              <article
                key={notice.id}
                className="af-dt-ns__card"
                data-depth={gone ? undefined : depth}
                data-leaving={gone || undefined}
                aria-hidden={isBehind || undefined}
                {...(isBehind || gone ? { inert: "true" as unknown as boolean } : undefined)}
                style={{
                  zIndex: gone ? 10 : 10 - depth,
                  maxHeight: isBehind && front > 0 ? front : undefined,
                  transform: gone ? undefined : `translateY(${y}px) scale(${scale})`,
                  opacity: depth > 2 ? 0 : undefined,
                }}
              >
                <NoticePatternArt pattern={notice.pattern} />
                <div
                  className="af-dt-ns__body"
                  ref={(node) => {
                    if (node) bodyRefs.current.set(notice.id, node);
                    else bodyRefs.current.delete(notice.id);
                  }}
                >
                  <div className="af-dt-ns__top">
                    <span className="af-dt-ns__badge">{notice.badge}</span>
                    <button type="button" className="af-dt-ns__close" aria-label={`Dismiss: ${notice.title}`} onClick={() => dismiss(notice.id)}>
                      <AfIcon name="x" size={14} />
                    </button>
                  </div>
                  <h3 className="af-dt-ns__title">{notice.title}</h3>
                  <p className="af-dt-ns__text">{notice.text}</p>
                  <button type="button" className="af-dt-ns__btn" onClick={() => onAction?.(notice)}>{notice.action}</button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className={cn("af-dt-ns__empty", className)} style={style}>
          <AfIcon name="check" size={18} />
          <span>All caught up</span>
          <button type="button" className="af-dt-ns__btn" onClick={() => setItems(initialNotices)}>Reset</button>
        </div>
      )}
      {showNote ? <Note>380px card stack with hairline ring; trailing cards peek 12px below at 0.95 / 0.90 scale and promote smoothly on dismiss.</Note> : null}
    </Demo>
  );
}

export { NotificationStackDemo as AfNotificationStackPattern, NotificationStackDemo as AfNotificationStack };
export type { AfNotificationStackPatternProps as AfNotificationStackProps };
