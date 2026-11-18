import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { AfPortal, useIsomorphicLayoutEffect } from "../../primitives";
import type { AfTone } from "../display/Tag";

/** 通知上的单个动作（例如撤销）。 */
export type AfToastAction = { label: string; onClick: () => void };

export type AfToastState = "loading" | "success" | "error";

export type AfToastPlacement = "bottom-right" | "bottom-center" | "top-right" | "top-center";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: AfTone;
  action?: AfToastAction;
  state?: AfToastState;
  duration: number;
  leaving?: boolean;
  swipeExitX?: number;
};

/** 新建通知的参数。 */
export type AfToastInput = {
  /** 标题。 */
  title: string;
  /** 第二行说明。 */
  description?: string;
  /** 语义色。 */
  tone?: AfTone;
  /** 可选动作。 */
  action?: AfToastAction;
  /** 状态图标（如 loading / success / error）。 */
  state?: AfToastState;
  /** 展示时长（ms）；传入 `0` 或 `Infinity` 表示常驻不自动消失。 */
  duration?: number;
};

/** 更新已有通知的参数。 */
export type AfToastPatch = Partial<AfToastInput>;

/** promise 通知各阶段的文案。 */
export type AfToastPromiseText = {
  /** 进行中标题。 */
  loading: string;
  /** 成功标题。 */
  success: string;
  /** 失败标题。 */
  error: string;
  /** 成功后的说明。 */
  description?: string;
};

/** 通知接口。 */
export type ToastApi = {
  /** 简写：标题 + 语义色 + 动作。 */
  show: (text: string, tone?: AfTone, action?: AfToastAction) => number;
  /** 完整参数新建通知，返回通知 id。 */
  push: (input: AfToastInput) => number;
  /** 动态更新指定 id 的通知内容、状态或时长。 */
  update: (id: number, patch: AfToastPatch) => void;
  /** 手动关闭指定 id 的通知。 */
  dismiss: (id: number) => void;
  /** 清空当前所有通知。 */
  dismissAll: () => void;
  /** 跟随一个异步任务：转圈 → 闭合成对勾（或叉），完成后才开始计时。 */
  promise: (task: Promise<unknown>, text: AfToastPromiseText) => number;
};

function getToastSingleton<T>(key: string, create: () => T): T {
  const sym = Symbol.for(key);
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = create();
  }
  return g[sym] as T;
}

const NOOP_TOAST_API: ToastApi = {
  show: () => 0,
  push: () => 0,
  update: () => {},
  dismiss: () => {},
  dismissAll: () => {},
  promise: () => 0,
};

const ToastContext: Context<ToastApi | null> = getToastSingleton(
  "aster-ui.AfToastContext.v1",
  () => createContext<ToastApi | null>(null),
);

const hostToastStack = getToastSingleton<{ stack: ToastApi[] }>("aster-ui.HostToastBridge.v1", () => ({
  stack: [],
}));

/** 读取通知接口（支持同树 Context 与同窗口隔离 `createRoot` 插件自动桥接宿主 Toast 栈）。 */
export const useAfToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return hostToastStack.stack[hostToastStack.stack.length - 1] ?? NOOP_TOAST_API;
};

type ToastTimer = { remaining: number; start: number; handle?: number };

type SwipeSession = {
  id: number;
  pointerId: number;
  startX: number;
  startTime: number;
  dx: number;
};

const TOAST_PEEK = 10;
const TOAST_GAP = 11;
const TOAST_DURATION = 4000;
const TOAST_DURATION_ACTION = 6000;

function resolveDuration(duration: number | undefined, hasAction: boolean): number {
  if (duration === undefined) return hasAction ? TOAST_DURATION_ACTION : TOAST_DURATION;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return duration;
}

function ToastStateSpinner({ state }: { state: AfToastState }) {
  return (
    <svg className="af-spin" data-state={state} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path
        d={state === "error" ? "M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" : "M5.25 8.25 7.1 10l3.65-4"}
        pathLength={1}
      />
    </svg>
  );
}

export type AfToastProviderProps = {
  children: ReactNode;
  /** 停靠方位，默认 `"bottom-right"`。 */
  placement?: AfToastPlacement;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
};

/**
 * 通知容器：默认右下角 356px 堆叠，支持四个停靠方位、悬停展开暂停、横向拖拽滑出关闭、F8 聚焦最新通知、
 * `update(id, patch)` 动态状态流转以及 `dismiss(id)` / `dismissAll()` 编程式关闭。
 */
export function AfToastProvider({ children, placement = "bottom-right", container }: AfToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [swipe, setSwipe] = useState<SwipeSession | null>(null);
  const seed = useRef(0);
  const timers = useRef(new Map<number, ToastTimer>());
  const paused = useRef(false);
  const nodes = useRef(new Map<number, HTMLDivElement>());
  const stackRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer?.handle) window.clearTimeout(timer.handle);
    timers.current.delete(id);
  }, []);

  const dismissWithSwipe = useCallback(
    (id: number, swipeExitX?: number) => {
      clearTimer(id);
      setItems((list) =>
        list.map((item) => (item.id === id ? { ...item, leaving: true, swipeExitX } : item)),
      );
      window.setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 300);
    },
    [clearTimer],
  );

  const dismiss = useCallback((id: number) => dismissWithSwipe(id), [dismissWithSwipe]);

  const dismissAll = useCallback(() => {
    timers.current.forEach((timer) => {
      if (timer.handle) window.clearTimeout(timer.handle);
    });
    timers.current.clear();
    setItems((list) => list.map((item) => ({ ...item, leaving: true })));
    window.setTimeout(() => setItems([]), 300);
  }, []);

  const arm = useCallback(
    (id: number, ms: number) => {
      clearTimer(id);
      if (!Number.isFinite(ms) || ms <= 0) return;
      const timer: ToastTimer = { remaining: ms, start: performance.now() };
      timers.current.set(id, timer);
      if (!paused.current) timer.handle = window.setTimeout(() => dismiss(id), ms);
    },
    [clearTimer, dismiss],
  );

  const push = useCallback(
    (input: AfToastInput) => {
      const id = ++seed.current;
      const duration =
        input.state === "loading" && input.duration === undefined
          ? 0
          : resolveDuration(input.duration, Boolean(input.action));
      setItems((list) => [
        ...list.filter((item) => !item.leaving).slice(-4),
        {
          id,
          title: input.title,
          description: input.description,
          tone: input.tone ?? "neutral",
          action: input.action,
          state: input.state,
          duration,
        },
      ]);
      if (duration > 0) arm(id, duration);
      return id;
    },
    [arm],
  );

  const update = useCallback(
    (id: number, patch: AfToastPatch) => {
      let nextDuration: number | null = null;
      setItems((list) =>
        list.map((item) => {
          if (item.id !== id) return item;
          const mergedAction = patch.action !== undefined ? patch.action : item.action;
          const mergedState = patch.state !== undefined ? patch.state : item.state;
          const duration =
            patch.duration !== undefined
              ? resolveDuration(patch.duration, Boolean(mergedAction))
              : patch.state && patch.state !== "loading" && item.duration === 0
                ? resolveDuration(undefined, Boolean(mergedAction))
                : item.duration;
          nextDuration = duration;
          return {
            ...item,
            ...(patch.title !== undefined ? { title: patch.title } : null),
            ...(patch.description !== undefined ? { description: patch.description } : null),
            ...(patch.tone !== undefined ? { tone: patch.tone } : null),
            action: mergedAction,
            state: mergedState,
            duration,
          };
        }),
      );
      if (nextDuration !== null) {
        if (nextDuration > 0) arm(id, nextDuration);
        else clearTimer(id);
      }
    },
    [arm, clearTimer],
  );

  const show = useCallback(
    (text: string, tone: AfTone = "neutral", action?: AfToastAction) => push({ title: text, tone, action }),
    [push],
  );

  const promise = useCallback(
    (task: Promise<unknown>, text: AfToastPromiseText) => {
      const id = push({ title: text.loading, tone: "neutral", state: "loading", duration: 0 });
      task.then(
        () => {
          update(id, {
            title: text.success,
            description: text.description,
            tone: "success",
            state: "success",
            duration: 3200,
          });
        },
        () => {
          update(id, { title: text.error, tone: "danger", state: "error", duration: 5000 });
        },
      );
      return id;
    },
    [push, update],
  );

  const applyHover = (hover: boolean) => {
    if (paused.current === hover) return;
    setExpanded(hover);
    paused.current = hover;
    const now = performance.now();
    timers.current.forEach((timer, id) => {
      if (hover) {
        if (timer.handle) window.clearTimeout(timer.handle);
        timer.handle = undefined;
        timer.remaining = Math.max(400, timer.remaining - (now - timer.start));
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
    const pad = 12;
    return (
      target.x >= rect.left - pad &&
      target.x <= rect.right + pad &&
      target.y >= rect.top - pad &&
      target.y <= rect.bottom + pad
    );
  };

  const handlePointerEnter = () => {
    clearHoverTimer();
    applyHover(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    lastPointer.current = { x: event.clientX, y: event.clientY };
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null;
      if (pointerInsideStack(lastPointer.current)) return;
      applyHover(false);
    }, 140);
  };

  useIsomorphicLayoutEffect(() => {
    return () => clearHoverTimer();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const next: Record<number, number> = {};
    nodes.current.forEach((node, id) => (next[id] = node.offsetHeight));
    setHeights((prev) =>
      Object.keys(next).length === Object.keys(prev).length &&
      Object.entries(next).every(([key, value]) => prev[Number(key)] === value)
        ? prev
        : next,
    );
  }, [items]);

  useEffect(() => {
    if (items.length === 0 && expanded) {
      clearHoverTimer();
      applyHover(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    if (!items.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "F8") {
        const newest = [...items].reverse().find((item) => !item.leaving);
        if (newest) {
          event.preventDefault();
          applyHover(true);
          const card = nodes.current.get(newest.id);
          const focusTarget = card?.querySelector<HTMLElement>(".af-toast__action, .af-toast__close");
          focusTarget?.focus({ preventScroll: true });
        }
        return;
      }
      if (event.key !== "Escape") return;
      const frontItem = [...items].reverse().find((item) => !item.leaving);
      if (frontItem) {
        event.preventDefault();
        dismiss(frontItem.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dismiss]);

  const isTop = placement.startsWith("top");
  const isRightAligned = placement.endsWith("right");
  const front = [...items].reverse();
  const live = front.filter((item) => !item.leaving);
  let offset = 0;
  const layout = front.map((item) => {
    const depth = Math.max(0, live.indexOf(item));
    const y = isTop ? (expanded ? offset : -depth * TOAST_PEEK) : expanded ? -offset : depth * TOAST_PEEK;
    if (!item.leaving) offset += (heights[item.id] ?? 52) + TOAST_GAP;
    return { item, depth, y, scale: expanded ? 1 : 1 - depth * 0.05, opacity: !expanded && depth > 2 ? 0 : 1 };
  });
  const api = useMemo<ToastApi>(
    () => ({ show, push, update, dismiss, dismissAll, promise }),
    [show, push, update, dismiss, dismissAll, promise],
  );

  useIsomorphicLayoutEffect(() => {
    hostToastStack.stack = [...hostToastStack.stack.filter((entry) => entry !== api), api];
    return () => {
      hostToastStack.stack = hostToastStack.stack.filter((entry) => entry !== api);
    };
  }, [api]);

  const frontH = heights[live[0]?.id] ?? 52;
  const areaH =
    live.length === 0 ? 0 : expanded ? offset - TOAST_GAP : frontH + Math.min(live.length - 1, 2) * TOAST_PEEK;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <AfPortal container={container}>
        <section
          ref={stackRef}
          className="af-toasts"
          aria-label="Notifications"
          aria-live="polite"
          data-placement={placement}
          data-count={live.length}
          data-expanded={expanded || undefined}
          style={{ "--af-toasts-h": `${areaH}px` } as CSSProperties}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerMove={(event) => {
            lastPointer.current = { x: event.clientX, y: event.clientY };
          }}
          onFocusCapture={handlePointerEnter}
          onBlurCapture={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            clearHoverTimer();
            if (!pointerInsideStack()) applyHover(false);
          }}
        >
          {layout.map(({ item, depth, y, scale, opacity }) => {
            const activeSwipe = swipe?.id === item.id ? swipe : null;
            const swiping = Boolean(activeSwipe && Math.abs(activeSwipe.dx) > 3);
            const swipeProgressOpacity = swiping
              ? Math.max(0.25, 1 - Math.abs(activeSwipe!.dx) / 220)
              : opacity;

            return (
              <div
                key={item.id}
                ref={(node) => {
                  if (node) nodes.current.set(item.id, node);
                  else nodes.current.delete(item.id);
                }}
                className="af-toast"
                data-tone={item.tone}
                data-leaving={item.leaving || undefined}
                data-swiping={swiping ? "true" : undefined}
                data-behind={(!expanded && depth > 0) || undefined}
                style={
                  {
                    "--y": `${y}px`,
                    "--s": scale,
                    "--o": swipeProgressOpacity,
                    "--swipe-x": swiping ? `${activeSwipe!.dx}px` : "0px",
                    ...(item.swipeExitX !== undefined ? { "--swipe-end-x": `${item.swipeExitX}px` } : null),
                    zIndex: 10 - depth,
                  } as CSSProperties
                }
                onPointerDown={(event) => {
                  if (item.leaving || event.button !== 0) return;
                  const targetEl = event.target as HTMLElement | null;
                  if (targetEl?.closest("button, a, input")) return;
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  setSwipe({
                    id: item.id,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startTime: performance.now(),
                    dx: 0,
                  });
                }}
                onPointerMove={(event) => {
                  setSwipe((prev) => {
                    if (!prev || prev.id !== item.id || prev.pointerId !== event.pointerId) return prev;
                    const rawDx = event.clientX - prev.startX;
                    const constrainedDx = isRightAligned && rawDx < 0 ? rawDx * 0.25 : rawDx;
                    return { ...prev, dx: constrainedDx };
                  });
                }}
                onPointerUp={(event) => {
                  if (!swipe || swipe.id !== item.id || swipe.pointerId !== event.pointerId) return;
                  const elapsed = Math.max(1, performance.now() - swipe.startTime);
                  const velocity = Math.abs(swipe.dx) / elapsed;
                  const shouldDismiss = isRightAligned
                    ? swipe.dx > 76 || (swipe.dx > 32 && velocity > 0.55)
                    : Math.abs(swipe.dx) > 76 || (Math.abs(swipe.dx) > 32 && velocity > 0.55);
                  const exitDir = swipe.dx >= 0 ? 180 : -180;
                  setSwipe(null);
                  if (shouldDismiss) {
                    dismissWithSwipe(item.id, exitDir);
                  }
                }}
                onPointerCancel={() => {
                  setSwipe((prev) => (prev?.id === item.id ? null : prev));
                }}
              >
                <button type="button" className="af-toast__close" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>
                  <AfIcon name="x" size={10} />
                </button>
                <span className="af-toast__icon">
                  {item.state ? (
                    <ToastStateSpinner state={item.state} />
                  ) : item.tone === "success" ? (
                    <AfIcon name="check" size={16} />
                  ) : item.tone === "danger" ? (
                    <AfIcon name="x" size={16} />
                  ) : (
                    <AfIcon name="bell" size={14} />
                  )}
                </span>
                <span className="af-toast__body">
                  <span className="af-toast__title" key={item.title}>
                    {item.title}
                  </span>
                  {item.description ? <span className="af-toast__desc">{item.description}</span> : null}
                </span>
                {item.action ? (
                  <button
                    type="button"
                    className="af-toast__action"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
                {item.state !== "loading" && item.duration > 0 ? (
                  <span
                    className="af-toast__time"
                    key={`${item.id}-${item.state ?? "plain"}-${item.duration}`}
                    style={{ animationDuration: `${item.duration}ms` }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );
          })}
        </section>
      </AfPortal>
    </ToastContext.Provider>
  );
}
