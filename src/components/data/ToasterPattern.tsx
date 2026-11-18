import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AfButton, AfKbd } from "../../ui";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { Demo, Note, ToastItem, ToastPhase, ToastSpinner, ToastTimer, ToastTone } from "../_shared/data";

export type { ToastItem, ToastPhase, ToastTone };

export type ToastPosition = "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center";

export interface AfToastOptions {
  description?: string;
  tone?: ToastTone;
  phase?: ToastPhase;
  action?: { label: string; run: () => void };
  duration?: number;
}

type ToastBusEvent =
  | { type: "push"; id: number; title: string; opts: AfToastOptions }
  | { type: "settle"; id: number; patch: Partial<ToastItem>; duration: number }
  | { type: "dismiss"; id?: number };

let globalToastSeed = 1000;
const toastListeners = new Set<(event: ToastBusEvent) => void>();
const emitToast = (event: ToastBusEvent) => toastListeners.forEach((fn) => fn(event));

/** Imperative toast trigger aligned 1:1 with affectui.com toast() / toast.promise(). */
export const afToast = Object.assign(
  (title: string, opts: AfToastOptions = {}) => {
    const id = ++globalToastSeed;
    emitToast({ type: "push", id, title, opts });
    return id;
  },
  {
    success: (title: string, opts: AfToastOptions = {}) => afToast(title, { ...opts, tone: "success" }),
    error: (title: string, opts: AfToastOptions = {}) => afToast(title, { ...opts, tone: "danger" }),
    info: (title: string, opts: AfToastOptions = {}) => afToast(title, { ...opts, tone: "info" }),
    loading: (title: string, opts: AfToastOptions = {}) => afToast(title, { ...opts, tone: "info", phase: "loading", duration: opts.duration ?? 15000 }),
    dismiss: (id?: number) => emitToast({ type: "dismiss", id }),
    promise: <T,>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      messages: { loading: string; success: string | ((val: T) => string); error: string | ((err: unknown) => string); description?: string },
    ) => {
      const id = ++globalToastSeed;
      emitToast({ type: "push", id, title: messages.loading, opts: { description: messages.description, tone: "info", phase: "loading", duration: 20000 } });
      const task = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
      task.then(
        (val) => {
          const nextTitle = typeof messages.success === "function" ? messages.success(val) : messages.success;
          emitToast({ type: "settle", id, patch: { title: nextTitle, tone: "success", phase: "success" }, duration: 3800 });
        },
        (err) => {
          const nextTitle = typeof messages.error === "function" ? messages.error(err) : messages.error;
          emitToast({ type: "settle", id, patch: { title: nextTitle, tone: "danger", phase: "error" }, duration: 5000 });
        },
      );
      return task;
    },
  },
);

export interface AfToasterPatternProps {
  /** Seed initial notification on mount (default true). */
  seedInitial?: boolean;
  /** Initial notification payload. */
  initialToast?: { title: string; description?: string; tone?: ToastTone; duration?: number };
  /** Maximum visible stacked toasts (default 3). */
  visibleToasts?: number;
  /** Stack anchor position (default "bottom-right"). */
  position?: ToastPosition;
  /** Keep stack expanded at rest (default false). */
  expand?: boolean;
  /** Hairline ring shadow (default true). */
  hairline?: boolean;
  /** Top-left floating close button on hover (default true). */
  closeButton?: boolean;
  /** Keyboard focus shortcut (default "F8"). */
  hotkey?: string;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

const TOAST_GAP = 10;
const TOAST_PEEK = 10;

/**
 * Toaster notification stack: 356px wide / r10 cards, measured-height fan-out on hover,
 * pointer swipe-to-dismiss with spring snap-back, timer pause on hover, and promise spinner-to-check morph.
 */
function ToasterDemo({
  seedInitial = false,
  initialToast = { title: "Draft saved", description: "Q3 Board Report · all changes kept", tone: "success", duration: 6400 },
  visibleToasts = 3,
  position = "bottom-right",
  expand: expandProp = false,
  hairline = true,
  closeButton = true,
  hotkey = "F8",
  showNote = false,
  className,
  style,
}: AfToasterPatternProps = {}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [promiseBusy, setPromiseBusy] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [dragState, setDragState] = useState<{ id: number; dx: number; dy: number; swiping: boolean } | null>(null);
  const [swipeOut, setSwipeOut] = useState<Record<number, { dx: number; dy: number }>>({});

  const seed = useRef(0);
  const timers = useRef(new Map<number, ToastTimer>());
  const pausedRef = useRef(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const hoverTimer = useRef<number | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const gestureRef = useRef<{ id: number; startX: number; startY: number; startTime: number } | null>(null);
  const seeded = useRef(false);

  const expanded = expandProp || hoverExpanded;
  const isTop = position.startsWith("top");

  useIsomorphicLayoutEffect(() => {
    const sync = () => {
      const next: Record<number, number> = {};
      cardRefs.current.forEach((node, id) => {
        next[id] = node.offsetHeight;
      });
      setHeights((prev) => {
        const keys = Object.keys(next);
        if (keys.length === Object.keys(prev).length && keys.every((k) => prev[Number(k)] === next[Number(k)])) return prev;
        return next;
      });
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    cardRefs.current.forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [items]);

  const dismiss = (id: number, vector?: { dx: number; dy: number }) => {
    const timer = timers.current.get(id);
    if (timer?.handle) window.clearTimeout(timer.handle);
    timers.current.delete(id);
    if (vector) setSwipeOut((prev) => ({ ...prev, [id]: vector }));
    setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
      setSwipeOut((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 300);
  };

  const arm = (id: number, ms: number) => {
    const timer: ToastTimer = { remaining: ms, start: performance.now() };
    timers.current.set(id, timer);
    if (!pausedRef.current) timer.handle = window.setTimeout(() => dismiss(id), ms);
  };

  const push = (
    input: { title: string; description?: string; tone?: ToastTone; phase?: ToastPhase; action?: { label: string; run: () => void }; duration?: number },
    explicitId?: number,
  ) => {
    const id = explicitId ?? ++seed.current;
    const duration = input.duration ?? (input.action ? 6000 : 4500);
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? "neutral",
      phase: input.phase,
      action: input.action,
      duration,
    };
    setItems((current) => [...current, item].slice(-Math.max(visibleToasts + 1, 4)));
    arm(id, duration);
    return id;
  };

  const settle = (id: number, patch: Partial<ToastItem>, duration: number) => {
    const timer = timers.current.get(id);
    if (timer?.handle) window.clearTimeout(timer.handle);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch, duration } : item)));
    arm(id, duration);
  };

  useEffect(() => {
    const listener = (event: ToastBusEvent) => {
      if (event.type === "push") push({ title: event.title, ...event.opts }, event.id);
      else if (event.type === "settle") settle(event.id, event.patch, event.duration);
      else if (event.type === "dismiss") {
        if (event.id !== undefined) dismiss(event.id);
        else setItems((cur) => { cur.forEach((item) => dismiss(item.id)); return cur; });
      }
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyHover = (hover: boolean) => {
    if (pausedRef.current === hover) return;
    setHoverExpanded(hover);
    setPaused(hover);
    pausedRef.current = hover;
    const now = performance.now();
    timers.current.forEach((timer, id) => {
      if (hover) {
        if (timer.handle) window.clearTimeout(timer.handle);
        timer.handle = undefined;
        timer.remaining = Math.max(450, timer.remaining - (now - timer.start));
      } else {
        timer.start = now;
        timer.handle = window.setTimeout(() => dismiss(id), timer.remaining);
      }
    });
  };

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const pointerInsideStack = (point?: { x: number; y: number } | null) => {
    const target = point ?? lastPointer.current;
    const rect = stackRef.current?.getBoundingClientRect();
    if (!target || !rect) return false;
    const pad = 14;
    return target.x >= rect.left - pad && target.x <= rect.right + pad && target.y >= rect.top - pad && target.y <= rect.bottom + pad;
  };

  const handlePointerEnter = () => {
    clearHoverTimer();
    applyHover(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null;
      if (pointerInsideStack(lastPointer.current)) return;
      applyHover(false);
    }, 150);
  };

  useEffect(
    () => () => {
      timers.current.forEach((timer) => {
        if (timer.handle) window.clearTimeout(timer.handle);
      });
      clearHoverTimer();
    },
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === hotkey) {
        event.preventDefault();
        clearHoverTimer();
        applyHover(true);
        stackRef.current?.querySelector<HTMLElement>(".af-dt-toast")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotkey]);

  useEffect(() => {
    if (!seedInitial || seeded.current) return;
    seeded.current = true;
    push(initialToast);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSuccess = () => push({ title: "Draft saved", description: "Q3 Board Report · all changes kept", tone: "success" });
  const showUndo = () =>
    push({
      title: "File moved to trash",
      description: "Q3 Board Report.pdf",
      tone: "neutral",
      action: { label: "Undo", run: () => push({ title: "File restored", description: "Q3 Board Report.pdf returned to Finance", tone: "success", duration: 3200 }) },
    });
  const runPromise = () => {
    if (promiseBusy) return;
    setPromiseBusy(true);
    const id = push({ title: "Uploading report…", description: "Q3 Board Report · 4.2 MB", tone: "info", phase: "loading", duration: 14000 });
    window.setTimeout(() => {
      settle(id, { title: "Report uploaded", description: "Share link ready for reviewers", tone: "success", phase: "success" }, 4000);
      setPromiseBusy(false);
    }, 1450);
  };
  const showSyncOrError = () => {
    push({ title: "Sync failed", description: "Finance data source timed out. Retrying shortly.", tone: "danger" });
  };

  const onToastPointerDown = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { id, startX: event.clientX, startY: event.clientY, startTime: performance.now() };
    setDragState({ id, dx: 0, dy: 0, swiping: true });
  };

  const onToastPointerMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    const g = gestureRef.current;
    if (!g || g.id !== id) return;
    const dx = event.clientX - g.startX;
    const rawDy = event.clientY - g.startY;
    const dy = isTop ? Math.min(rawDy * 0.85, 18) : Math.max(rawDy * 0.85, -18);
    setDragState({ id, dx, dy, swiping: true });
  };

  const onToastPointerUp = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    const g = gestureRef.current;
    if (!g || g.id !== id) return;
    gestureRef.current = null;
    const dt = Math.max(16, performance.now() - g.startTime);
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    const vx = Math.abs(dx) / dt;
    const vy = (isTop ? -dy : dy) / dt;
    const dismissByX = Math.abs(dx) > 58 || (Math.abs(dx) > 24 && vx > 0.45);
    const dismissByY = (isTop ? -dy > 42 : dy > 42) || ((isTop ? -dy > 18 : dy > 18) && vy > 0.42);
    setDragState(null);
    if (dismissByX) {
      dismiss(id, { dx: dx > 0 ? 180 : -180, dy: dy * 0.3 });
    } else if (dismissByY) {
      dismiss(id, { dx: dx * 0.3, dy: isTop ? -96 : 96 });
    }
  };

  const activeOrdered = [...items].reverse();
  const visibleSlice = activeOrdered.slice(0, visibleToasts);
  const frontHeight = visibleSlice[0] ? heights[visibleSlice[0].id] ?? 68 : 68;

  let accOffset = 0;
  const cardMetrics = activeOrdered.map((item, index) => {
    const h = heights[item.id] ?? frontHeight;
    const clampedDepth = Math.min(index, visibleToasts - 1);
    let y = 0;
    let scale = 1;
    if (expanded) {
      y = isTop ? accOffset : -accOffset;
      accOffset += h + TOAST_GAP;
    } else {
      const peek = clampedDepth * TOAST_PEEK;
      y = isTop ? peek : -peek;
      scale = 1 - clampedDepth * 0.05;
    }
    return { item, index, h, y, scale, hidden: index >= visibleToasts };
  });

  const expandedTotalHeight = Math.max(frontHeight + 20, accOffset);

  return (
    <Demo>
      <div className={cn("af-dt-toaster", className)} style={style} data-position={position}>
        <div className="af-dt-toaster__screen">
          <div className="af-dt-toaster__top">
            <div className="af-dt-toaster__doc">
              <div className="af-dt-toaster__doc-head">
                <span className="af-dt-toaster__doc-icon" aria-hidden><AfIcon name="file" size={16} /></span>
                <div className="af-dt-toaster__doc-meta">
                  <strong>Q3 Board Report</strong>
                  <span>Finance · edited 2 min ago</span>
                </div>
              </div>
              <div className="af-dt-toaster__toolbar">
                <AfButton size="sm" variant="secondary" onClick={showSuccess}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3.5 2.5h7.3L13.5 5.2v7.3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
                    <path d="M5.5 2.5v3.5h4.5V2.5M5 13.5V9.5h6v4" />
                  </svg>
                  <span>Save draft</span>
                </AfButton>
                <AfButton size="sm" variant="secondary" onClick={showUndo}>
                  <AfIcon name="trash" size={13} />
                  <span>Delete file</span>
                </AfButton>
                <AfButton size="sm" variant="secondary" loading={promiseBusy} onClick={runPromise}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M8 10.5V3m0 0L5.25 5.75M8 3l2.75 2.75M3 12.5h10" />
                  </svg>
                  <span>Upload report</span>
                </AfButton>
                <AfButton size="sm" variant="secondary" onClick={showSyncOrError}>
                  <AfIcon name="refresh" size={13} />
                  <span>Sync</span>
                </AfButton>
              </div>
            </div>
            <p className="af-dt-toaster__hint">
              Press <AfKbd>{hotkey}</AfKbd> to jump to notifications
            </p>
          </div>

          <div
            ref={stackRef}
            className="af-dt-toasts"
            role="region"
            aria-label={`Notifications (${hotkey})`}
            aria-live="polite"
            data-position={position}
            data-expanded={expanded || undefined}
            data-paused={paused || undefined}
            data-hairline={hairline || undefined}
            data-count={visibleSlice.length}
            style={{ height: visibleSlice.length ? (expanded ? expandedTotalHeight : frontHeight + Math.min(visibleSlice.length - 1, 2) * TOAST_PEEK) : 0 }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerMove={(event) => {
              lastPointer.current = { x: event.clientX, y: event.clientY };
            }}
            onFocusCapture={handlePointerEnter}
            onBlurCapture={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              clearHoverTimer();
              if (!pointerInsideStack()) applyHover(false);
            }}
          >
            {cardMetrics.map(({ item, index, y, scale, hidden }) => {
              const behind = index > 0 && !expanded;
              const draggingThis = dragState?.id === item.id ? dragState : null;
              const flyOut = swipeOut[item.id];
              const dx = flyOut ? flyOut.dx : draggingThis ? draggingThis.dx : 0;
              const dy = (flyOut ? flyOut.dy : draggingThis ? draggingThis.dy : 0) + y;
              const dragOpacity = draggingThis ? Math.max(0.25, 1 - Math.abs(draggingThis.dx) / 180) : undefined;

              return (
                <article
                  key={item.id}
                  ref={(node) => {
                    if (node) cardRefs.current.set(item.id, node);
                    else cardRefs.current.delete(item.id);
                  }}
                  className="af-dt-toast"
                  data-depth={Math.min(index, 2)}
                  data-tone={item.tone}
                  data-phase={item.phase}
                  data-leaving={item.leaving || undefined}
                  data-behind={behind || undefined}
                  data-swiping={draggingThis?.swiping || undefined}
                  tabIndex={behind || hidden ? -1 : 0}
                  aria-live={item.tone === "danger" ? "assertive" : "polite"}
                  style={{
                    zIndex: 20 - index,
                    maxHeight: behind ? frontHeight : undefined,
                    transform: item.leaving && !flyOut
                      ? `translate3d(0, ${y + (isTop ? -10 : 10)}px, 0) scale(0.96)`
                      : `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
                    opacity: hidden ? 0 : item.leaving ? 0 : dragOpacity,
                    pointerEvents: hidden || item.leaving ? "none" : undefined,
                  }}
                  onPointerDown={(event) => onToastPointerDown(event, item.id)}
                  onPointerMove={(event) => onToastPointerMove(event, item.id)}
                  onPointerUp={(event) => onToastPointerUp(event, item.id)}
                  onPointerCancel={() => {
                    gestureRef.current = null;
                    setDragState(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      dismiss(item.id);
                    }
                  }}
                >
                  {closeButton ? (
                    <span className="af-dt-toast__close-pin">
                      <button
                        type="button"
                        className="af-dt-toast__close"
                        aria-label="Dismiss notification"
                        onClick={() => dismiss(item.id)}
                        tabIndex={behind ? -1 : 0}
                      >
                        <AfIcon name="x" size={10} />
                      </button>
                    </span>
                  ) : null}
                  <span className="af-dt-toast__icon" aria-hidden>
                    {item.phase ? (
                      <ToastSpinner phase={item.phase} />
                    ) : item.tone === "success" ? (
                      <AfIcon name="check" size={16} />
                    ) : item.tone === "danger" ? (
                      <AfIcon name="x" size={16} />
                    ) : (
                      <AfIcon name="bell" size={16} />
                    )}
                  </span>
                  <span className="af-dt-toast__body">
                    <span className="af-dt-toast__title" key={`${item.title}-${item.phase ?? ""}`}>{item.title}</span>
                    {item.description ? (
                      <span className="af-dt-toast__desc" key={`${item.description}-${item.phase ?? ""}`}>{item.description}</span>
                    ) : null}
                  </span>
                  {item.action ? (
                    <button
                      type="button"
                      className="af-dt-toast__action"
                      onClick={() => {
                        item.action?.run();
                        dismiss(item.id);
                      }}
                      tabIndex={behind ? -1 : 0}
                    >
                      {item.action.label}
                    </button>
                  ) : null}
                  <i className="af-dt-toast__timer" style={{ animationDuration: `${item.duration}ms` }} aria-hidden />
                </article>
              );
            })}
          </div>
        </div>
      </div>
      {showNote ? <Note>356px notification stack: measured-height fan-out on hover, timer pause, swipe-to-dismiss, promise morph, and undo action.</Note> : null}
    </Demo>
  );
}

export { ToasterDemo as AfToasterPattern, ToasterDemo as AfToaster };
export type { AfToasterPatternProps as AfToasterProps };
