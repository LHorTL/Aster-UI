import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type FocusEvent as ReactFocusEvent,
  type RefObject,
} from "react";
import { prefersReducedMotion } from "./cn";
import { getAfHostPortalRoot } from "./layer";

/* ======================================================================== */
/* 1. useWindowAutoSize                                                     */
/* ======================================================================== */

export type AfWindowSize = {
  width: number;
  height: number;
};

export type UseWindowAutoSizeOptions = {
  /** 是否启用自动测量，默认 `true`。 */
  enabled?: boolean;
  /** 最小窗口宽度（px），默认 `80`。 */
  minWidth?: number;
  /** 最小窗口高度（px），默认 `40`。 */
  minHeight?: number;
  /** 最大窗口宽度（px）。 */
  maxWidth?: number;
  /** 最大窗口高度（px）。 */
  maxHeight?: number;
  /** 外围安全留白（px，用于容纳浮层投影环），默认 `0`。 */
  padding?: number | { x?: number; y?: number };
  /** 尺寸稳定后回调（双 rAF 防闪门禁通过后触发）。 */
  onResize?: (size: AfWindowSize) => void;
  /** 首次双 rAF 尺寸就绪时触发一次（通知宿主可安全 show 透明窗口）。 */
  onReady?: (size: AfWindowSize) => void;
};

export type WindowAutoSizeResult = {
  /** 当前测得的整数窗口宽高。 */
  size: AfWindowSize | null;
  /** 首帧双 rAF 就绪标记。 */
  ready: boolean;
  /** 手动立即触发一次重测。 */
  measureNow: () => AfWindowSize | null;
};

function resolvePadding(padding?: number | { x?: number; y?: number }): { x: number; y: number } {
  if (typeof padding === "number") {
    return { x: padding * 2, y: padding * 2 };
  }
  return {
    x: (padding?.x ?? 0) * 2,
    y: (padding?.y ?? 0) * 2,
  };
}

function clampDim(val: number, min: number, max?: number): number {
  const floored = Math.max(min, Math.ceil(val));
  return typeof max === "number" && Number.isFinite(max) ? Math.min(max, floored) : floored;
}

/**
 * 透明子窗口内容自适应尺寸测量原语：
 * - 基于 `ResizeObserver` 监听根容器自然宽高变化；
 * - 内置双 `requestAnimationFrame` 首帧稳定门禁，彻底消除透明无边框小窗首帧白闪与小数像素裁切。
 */
export function useWindowAutoSize(
  containerRef: RefObject<HTMLElement | null>,
  optionsOrCallback?: UseWindowAutoSizeOptions | ((size: AfWindowSize) => void),
  maybeOptions?: Omit<UseWindowAutoSizeOptions, "onResize">,
): WindowAutoSizeResult {
  const resolvedOptions: UseWindowAutoSizeOptions =
    typeof optionsOrCallback === "function"
      ? { ...maybeOptions, onResize: optionsOrCallback }
      : (optionsOrCallback ?? {});

  const {
    enabled = true,
    minWidth = 80,
    minHeight = 40,
    maxWidth,
    maxHeight,
    padding,
    onResize,
    onReady,
  } = resolvedOptions;

  const [size, setSize] = useState<AfWindowSize | null>(null);
  const [ready, setReady] = useState(false);

  const lastSizeRef = useRef<AfWindowSize | null>(null);
  const readyFiredRef = useRef(false);
  const callbacksRef = useRef({ onResize, onReady });
  callbacksRef.current = { onResize, onReady };

  const pad = resolvePadding(padding);

  const readSize = useCallback((): AfWindowSize | null => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return null;
    const rect = el.getBoundingClientRect();
    const rawW = Math.max(rect.width, el.scrollWidth, el.offsetWidth);
    const rawH = Math.max(rect.height, el.scrollHeight, el.offsetHeight);
    if (rawW <= 0 && rawH <= 0) return null;
    return {
      width: clampDim(rawW + pad.x, minWidth, maxWidth),
      height: clampDim(rawH + pad.y, minHeight, maxHeight),
    };
  }, [containerRef, minWidth, minHeight, maxWidth, maxHeight, pad.x, pad.y]);

  const commitSize = useCallback(
    (next: AfWindowSize | null) => {
      if (!next) return;
      const prev = lastSizeRef.current;
      const changed = !prev || prev.width !== next.width || prev.height !== next.height;
      if (changed) {
        lastSizeRef.current = next;
        setSize(next);
        callbacksRef.current.onResize?.(next);
      }
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        setReady(true);
        callbacksRef.current.onReady?.(next);
      }
    },
    [],
  );

  const measureNow = useCallback((): AfWindowSize | null => {
    const measured = readSize();
    commitSize(measured);
    return measured;
  }, [readSize, commitSize]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let disposed = false;

    const scheduleDoubleRaf = () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      raf1 = window.requestAnimationFrame(() => {
        raf1 = 0;
        raf2 = window.requestAnimationFrame(() => {
          raf2 = 0;
          if (disposed) return;
          commitSize(readSize());
        });
      });
    };

    scheduleDoubleRaf();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleDoubleRaf();
          })
        : null;
    ro?.observe(el);

    return () => {
      disposed = true;
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      ro?.disconnect();
    };
  }, [enabled, containerRef, readSize, commitSize]);

  return { size, ready, measureNow };
}

/* ======================================================================== */
/* 2. useWindowPointerDrag                                                  */
/* ======================================================================== */

export type AfWindowDragMovePayload = {
  /** 相对上一帧的水平屏幕坐标增量（px）。 */
  dx: number;
  /** 相对上一帧的垂直屏幕坐标增量（px）。 */
  dy: number;
  /** 相对按下起点的累计水平屏幕位移（px）。 */
  totalDx: number;
  /** 相对按下起点的累计垂直屏幕位移（px）。 */
  totalDy: number;
  /** 当前屏幕绝对 X 坐标。 */
  screenX: number;
  /** 当前屏幕绝对 Y 坐标。 */
  screenY: number;
};

export type AfWindowDragEndPayload = {
  totalDx: number;
  totalDy: number;
  screenX: number;
  screenY: number;
  cancelled: boolean;
};

export type UseWindowPointerDragOptions = {
  /** 起拖防误触阈值（px），默认 `4`（小于阈值视为普通点击）。 */
  threshold?: number;
  /** 是否禁用窗口拖拽。 */
  disabled?: boolean;
  /** 突破阈值正式起拖时触发。 */
  onDragStart?: (pos: { screenX: number; screenY: number }) => void;
  /** 拖拽过程中按屏幕坐标差逐帧回调。 */
  onMove?: (payload: AfWindowDragMovePayload) => void;
  /** 松手或取消时触发（可用于执行屏幕边缘磁吸计算）。 */
  onDragEnd?: (payload: AfWindowDragEndPayload) => void;
};

export type WindowPointerDragBindProps = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
};

export type WindowPointerDragResult = {
  /** 是否正处于窗口拖拽态。 */
  dragging: boolean;
  /** 绑定到拖拽手柄或悬浮球元素的事件属性组。 */
  bindTarget: WindowPointerDragBindProps;
  /** 主动中止当前拖拽。 */
  cancelDrag: () => void;
};

function readScreenCoords(e: { screenX: number; screenY: number; clientX: number; clientY: number }) {
  // 在部分合成测试事件未传 screenX/Y（全 0）而传了 clientX/Y 时安全回退，真实窗口下始终优先采用绝对 screenX/Y
  const useClient = e.screenX === 0 && e.screenY === 0 && (e.clientX !== 0 || e.clientY !== 0);
  return {
    x: useClient ? e.clientX : e.screenX,
    y: useClient ? e.clientY : e.screenY,
  };
}

/**
 * 无标题栏宿主窗口指针捕获拖拽原语：
 * - 严格基于屏幕绝对坐标 `screenX / screenY` 计算位移差，避免移动系统窗口导致窗口内 `clientX` 自激震荡；
 * - 内置 `4px` 点击防抖阈值与拖拽后合成 `click` 拦截。
 */
export function useWindowPointerDrag(options: UseWindowPointerDragOptions = {}): WindowPointerDragResult {
  const { threshold = 4, disabled = false, onDragStart, onMove, onDragEnd } = options;
  const [dragging, setDragging] = useState(false);

  const callbacksRef = useRef({ onDragStart, onMove, onDragEnd });
  callbacksRef.current = { onDragStart, onMove, onDragEnd };

  const suppressClickUntilRef = useRef(0);
  const sessionRef = useRef<{
    pointerId: number;
    target: HTMLElement;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);

  const finishSession = useCallback((endX: number, endY: number, cancelled: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    try {
      if (session.target.hasPointerCapture?.(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId);
      }
    } catch {
      // 忽略部分环境不支持 pointer capture 释放异常
    }
    if (session.moved) {
      suppressClickUntilRef.current = Date.now() + 260;
      setDragging(false);
      callbacksRef.current.onDragEnd?.({
        totalDx: endX - session.startX,
        totalDy: endY - session.startY,
        screenX: endX,
        screenY: endY,
        cancelled,
      });
    }
  }, []);

  const cancelDrag = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    finishSession(session.lastX, session.lastY, true);
  }, [finishSession]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (disabled || e.button !== 0) return;
      const pt = readScreenCoords(e);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // 忽略无头或合成事件未关联活跃指针异常
      }
      sessionRef.current = {
        pointerId: e.pointerId,
        target: e.currentTarget,
        startX: pt.x,
        startY: pt.y,
        lastX: pt.x,
        lastY: pt.y,
        moved: false,
      };
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== e.pointerId) return;
      const pt = readScreenCoords(e);
      const totalDx = pt.x - session.startX;
      const totalDy = pt.y - session.startY;

      if (!session.moved) {
        if (Math.hypot(totalDx, totalDy) < threshold) return;
        session.moved = true;
        session.lastX = session.startX;
        session.lastY = session.startY;
        setDragging(true);
        callbacksRef.current.onDragStart?.({ screenX: session.startX, screenY: session.startY });
      }

      const dx = pt.x - session.lastX;
      const dy = pt.y - session.lastY;
      session.lastX = pt.x;
      session.lastY = pt.y;
      if (dx !== 0 || dy !== 0) {
        callbacksRef.current.onMove?.({
          dx,
          dy,
          totalDx,
          totalDy,
          screenX: pt.x,
          screenY: pt.y,
        });
      }
    },
    [threshold],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== e.pointerId) return;
      const pt = readScreenCoords(e);
      finishSession(pt.x, pt.y, false);
    },
    [finishSession],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== e.pointerId) return;
      const pt = readScreenCoords(e);
      finishSession(pt.x, pt.y, true);
    },
    [finishSession],
  );

  const onClickCapture = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      suppressClickUntilRef.current = 0;
      if ((e.target as Element | null)?.closest?.('[data-no-drag="true"]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const bindTarget = useMemo<WindowPointerDragBindProps>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture],
  );

  return { dragging, bindTarget, cancelDrag };
}

/* ======================================================================== */
/* 3. useHitAreaCollector & hitTestPoint                                    */
/* ======================================================================== */

export type AfHitRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type UseHitAreaCollectorOptions = {
  /** 根容器引用。 */
  rootRef: RefObject<HTMLElement | null>;
  /** 是否同时收集 `.af-portal-root` 内当前打开的 Popover / ContextMenu / Dialog 浮层矩形，默认 `true`。 */
  includePortals?: boolean;
  /** 可交互热区选择器，默认 `"[data-af-hit-area]"`。 */
  selector?: string;
  /** 热区外扩安全边距（px），默认 `0`。 */
  padding?: number;
  /** 是否启用热区收集，默认 `true`。 */
  enabled?: boolean;
  /** 热区矩形列表变化时回调（已自动去重与序列化比对，不产生冗余空触发）。 */
  onAreasChange?: (rects: AfHitRect[]) => void;
};

export type HitAreaCollectorResult = {
  /** 当前活跃的可交互视口矩形列表。 */
  rects: AfHitRect[];
  /** 手动立即重新扫描并返回最新热区列表。 */
  refresh: () => AfHitRect[];
  /** 判断视口坐标 `(clientX, clientY)` 是否命中任一交互热区。 */
  hitTest: (clientX: number, clientY: number) => boolean;
};

const PORTAL_INTERACTIVE_SELECTOR =
  '[data-af-hit-area], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], .af-popover, .af-context-menu, .af-modal__panel, .af-drawer__panel, .af-select__pop';

/** 判断视口点 `(x, y)` 是否落在任一可交互热区矩形内。 */
export function hitTestPoint(rects: readonly AfHitRect[], x: number, y: number): boolean {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.right && y >= r.y && y <= r.bottom) {
      return true;
    }
  }
  return false;
}

function isElementInteractable(el: HTMLElement): boolean {
  if (el.hasAttribute("inert") || el.closest("[inert]")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
    return false;
  }
  if (Number.parseFloat(style.opacity || "1") <= 0.01) {
    return false;
  }
  return true;
}

function serializeRects(rects: readonly AfHitRect[]): string {
  return rects.map((r) => `${r.x},${r.y},${r.width},${r.height}`).join("|");
}

/**
 * 透明穿透窗口热区矩形收集器：
 * - 自动扫描宿主容器内的 `[data-af-hit-area]` 元素以及 `.af-portal-root` 内当前弹出的菜单、气泡与弹窗；
 * - 供桌面宿主配合 `setIgnoreMouseEvents(ignore, { forward: true })` 实现像素级异形窗口点击穿透。
 */
export function useHitAreaCollector(
  optionsOrRootRef: UseHitAreaCollectorOptions | RefObject<HTMLElement | null>,
  maybeOnChange?: (rects: AfHitRect[]) => void,
  maybeOptions?: Omit<UseHitAreaCollectorOptions, "rootRef" | "onAreasChange">,
): HitAreaCollectorResult {
  const resolved: UseHitAreaCollectorOptions =
    "current" in optionsOrRootRef
      ? { ...maybeOptions, rootRef: optionsOrRootRef, onAreasChange: maybeOnChange }
      : optionsOrRootRef;

  const {
    rootRef,
    includePortals = true,
    selector = "[data-af-hit-area]",
    padding = 0,
    enabled = true,
    onAreasChange,
  } = resolved;

  const [rects, setRects] = useState<AfHitRect[]>([]);
  const sigRef = useRef<string>("");
  const onChangeRef = useRef(onAreasChange);
  onChangeRef.current = onAreasChange;

  const collectNow = useCallback((): AfHitRect[] => {
    if (typeof window === "undefined" || !enabled) return [];
    const candidates = new Set<HTMLElement>();
    const root = rootRef.current;

    if (root) {
      if (root.matches?.(selector)) {
        candidates.add(root);
      }
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => candidates.add(el));
    }

    if (includePortals) {
      const portals = new Set<HTMLElement>();
      const hostPortal = getAfHostPortalRoot();
      if (hostPortal) portals.add(hostPortal);
      document.querySelectorAll<HTMLElement>(".af-portal-root").forEach((p) => portals.add(p));
      portals.forEach((portal) => {
        portal.querySelectorAll<HTMLElement>(PORTAL_INTERACTIVE_SELECTOR).forEach((el) => {
          candidates.add(el);
        });
      });
    }

    const next: AfHitRect[] = [];
    const seenKeys = new Set<string>();

    candidates.forEach((el) => {
      if (!isElementInteractable(el)) return;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      const x = Math.round(box.left - padding);
      const y = Math.round(box.top - padding);
      const right = Math.round(box.right + padding);
      const bottom = Math.round(box.bottom + padding);
      const width = Math.max(0, right - x);
      const height = Math.max(0, bottom - y);
      if (width < 1 || height < 1) return;
      const key = `${x}:${y}:${width}:${height}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      next.push({ x, y, width, height, right, bottom });
    });

    const nextSig = serializeRects(next);
    if (nextSig !== sigRef.current) {
      sigRef.current = nextSig;
      setRects(next);
      onChangeRef.current?.(next);
    }
    return next;
  }, [enabled, rootRef, includePortals, selector, padding]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        collectNow();
      });
    };

    collectNow();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(schedule) : null;

    if (rootRef.current) {
      ro?.observe(rootRef.current);
      mo?.observe(rootRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    if (includePortals && typeof document !== "undefined") {
      mo?.observe(document.body, {
        attributes: true,
        attributeFilter: ["style", "class", "data-closing", "inert", "aria-hidden"],
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [enabled, rootRef, includePortals, collectNow]);

  const hitTest = useCallback(
    (clientX: number, clientY: number) => hitTestPoint(rects, clientX, clientY),
    [rects],
  );

  return { rects, refresh: collectNow, hitTest };
}

/* ======================================================================== */
/* 4. useTwoPhaseWindowTransition                                           */
/* ======================================================================== */

export type AfTwoPhaseWindowState =
  | "collapsed"
  | "expanding-window"
  | "entering"
  | "expanded"
  | "exiting"
  | "shrinking-window";

export type UseTwoPhaseWindowTransitionOptions = {
  /** 目标展开状态。 */
  expanded: boolean;
  /** 第一阶段（展开前）：请求宿主放大原生透明窗口尺寸，返回 Promise 在窗口就位后 resolve。 */
  expandWindow?: () => void | Promise<void>;
  /** 第二阶段（收起动画完成后）：请求宿主缩小原生透明窗口尺寸。 */
  shrinkWindow?: () => void | Promise<void>;
  /** CSS 进退场过渡时长（ms），默认 `200`。 */
  duration?: number;
  /** 禁用过渡动画（直接同步切换）。 */
  disabled?: boolean;
};

export type TwoPhaseWindowTransitionResult = {
  /** 当前两阶段状态机相位。 */
  phase: AfTwoPhaseWindowState;
  /** 子面板是否应挂载在 DOM 中。 */
  panelMounted: boolean;
  /** 子面板是否处于视觉展开态（控制 CSS 入场动画触发）。 */
  panelOpen: boolean;
  /** 子面板是否正处于退场阶段（供挂载 `data-closing="true"`）。 */
  closing: boolean;
  /** 可选绑定至面板 `onTransitionEnd` / `onAnimationEnd` 提前完成阶段握手。 */
  notifyTransitionEnd: () => void;
};

/**
 * 透明小窗两阶段扩缩握手原语：
 * - **展开时**：先请求宿主扩大原生窗口边界 → 下一帧再触发 `panelOpen=true` 播放 CSS 入场动画；
 * - **收起时**：先置 `closing=true` 播放 CSS 退场动画 → 动画结束后卸载面板并调用 `shrinkWindow()` 缩小原生窗口。
 */
export function useTwoPhaseWindowTransition({
  expanded,
  expandWindow,
  shrinkWindow,
  duration = 200,
  disabled = false,
}: UseTwoPhaseWindowTransitionOptions): TwoPhaseWindowTransitionResult {
  const [phase, setPhase] = useState<AfTwoPhaseWindowState>(expanded ? "expanded" : "collapsed");
  const seqRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const finishStepRef = useRef<(() => void) | null>(null);
  const prevExpandedRef = useRef(expanded);

  const callbacksRef = useRef({ expandWindow, shrinkWindow });
  callbacksRef.current = { expandWindow, shrinkWindow };

  const clearPending = useCallback(() => {
    if (timerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    finishStepRef.current = null;
  }, []);

  const notifyTransitionEnd = useCallback(() => {
    const fn = finishStepRef.current;
    if (fn) {
      finishStepRef.current = null;
      fn();
    }
  }, []);

  useEffect(() => {
    if (prevExpandedRef.current === expanded) return;
    prevExpandedRef.current = expanded;

    const seq = ++seqRef.current;
    clearPending();

    if (typeof window === "undefined") {
      setPhase(expanded ? "expanded" : "collapsed");
      return;
    }

    const instant = disabled || prefersReducedMotion() || duration <= 0;

    if (expanded) {
      setPhase("expanding-window");
      Promise.resolve(callbacksRef.current.expandWindow?.())
        .catch(() => {})
        .then(() => {
          if (seqRef.current !== seq) return;
          if (instant) {
            setPhase("expanded");
            return;
          }
          rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = 0;
            if (seqRef.current !== seq) return;
            setPhase("entering");
            const done = () => {
              if (seqRef.current !== seq) return;
              clearPending();
              setPhase("expanded");
            };
            finishStepRef.current = done;
            timerRef.current = window.setTimeout(done, duration);
          });
        });
    } else {
      if (instant) {
        setPhase("shrinking-window");
        Promise.resolve(callbacksRef.current.shrinkWindow?.())
          .catch(() => {})
          .then(() => {
            if (seqRef.current !== seq) return;
            setPhase("collapsed");
          });
        return;
      }

      setPhase("exiting");
      const doneExit = () => {
        if (seqRef.current !== seq) return;
        clearPending();
        setPhase("shrinking-window");
        Promise.resolve(callbacksRef.current.shrinkWindow?.())
          .catch(() => {})
          .then(() => {
            if (seqRef.current !== seq) return;
            setPhase("collapsed");
          });
      };
      finishStepRef.current = doneExit;
      timerRef.current = window.setTimeout(doneExit, duration);
    }

    return () => {
      clearPending();
    };
  }, [expanded, duration, disabled, clearPending]);

  const panelMounted =
    phase === "expanding-window" ||
    phase === "entering" ||
    phase === "expanded" ||
    phase === "exiting";
  const panelOpen = phase === "entering" || phase === "expanded";
  const closing = phase === "exiting";

  return {
    phase,
    panelMounted,
    panelOpen,
    closing,
    notifyTransitionEnd,
  };
}

/* ======================================================================== */
/* 5. useReversibleEdgePeek                                                 */
/* ======================================================================== */

export type AfEdgePeekSide = "left" | "right" | "top";

export type UseReversibleEdgePeekOptions = {
  /** 贴靠的屏幕边缘方向，默认 `"right"`。 */
  edge?: AfEdgePeekSide;
  /** 收起半隐时的露头比例（`0–1`，例如 `0.5` 表示露出 50%、隐藏 50%），默认 `0.5`。 */
  collapsedRatio?: number;
  /** 指针移入后延迟探出毫秒数，默认 `70`。 */
  enterDelay?: number;
  /** 指针离开后延迟缩回毫秒数，默认 `320`。 */
  leaveDelay?: number;
  /** 单程完整探出/缩回动画时长（ms），默认 `220`。 */
  duration?: number;
  /** 外部强制保持完全探出（如子面板展开或正在拖拽中）。 */
  pinnedOpen?: boolean;
  /** 是否禁用半隐探出（始终保持 `progress = 1`）。 */
  disabled?: boolean;
  /** 初始进度，默认 `pinnedOpen || disabled ? 1 : 0`。 */
  defaultProgress?: number;
  /** 实时插值进度变化回调（`0` 为半隐，`1` 为完全探出）。 */
  onProgressChange?: (progress: number) => void;
  /** 探出目标布尔态切换回调。 */
  onPeekChange?: (peeking: boolean) => void;
};

export type ReversibleEdgePeekBindProps = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: (e: ReactFocusEvent<HTMLElement>) => void;
  onBlur: (e: ReactFocusEvent<HTMLElement>) => void;
};

export type ReversibleEdgePeekResult = {
  /** 当前实时探出进度 `[0, 1]`（`0` = 半隐露头态，`1` = 完全探出态）。 */
  progress: number;
  /** 目标是否处于探出意图态。 */
  peeking: boolean;
  /** 供 `translate3d` 使用的带符号边缘隐藏百分比（如右缘半隐时为 `+50` -> `0`，左缘为 `-50` -> `0`）。 */
  offsetPercent: number;
  /** 触发探出（支持缩回途中零跳变无缝折返）。 */
  enter: () => void;
  /** 触发延迟缩回。 */
  leave: () => void;
  /** 立即无延迟完全探出。 */
  forceOpen: () => void;
  /** 立即无延迟缩回半隐态。 */
  forceCollapse: () => void;
  /** 直接展开到边缘容器上的指针与焦点事件绑定属性。 */
  bindPeek: ReversibleEdgePeekBindProps;
};

function easeOutCubic(t: number): number {
  const inv = 1 - Math.max(0, Math.min(1, t));
  return 1 - inv * inv * inv;
}

/**
 * 屏幕边缘半隐露头与中途可逆探出插值器：
 * - 指针移入 `70ms` 探出、离开 `320ms` 延迟缩回；
 * - 当缩回动画播到一半指针再次移入（或探出途中离开）时，直接从当前实时位移 `progress` 反算剩余时长平滑反向折返，零瞬移跳变。
 */
export function useReversibleEdgePeek(options: UseReversibleEdgePeekOptions = {}): ReversibleEdgePeekResult {
  const {
    edge = "right",
    collapsedRatio = 0.5,
    enterDelay = 70,
    leaveDelay = 320,
    duration = 220,
    pinnedOpen = false,
    disabled = false,
    defaultProgress,
    onProgressChange,
    onPeekChange,
  } = options;

  const clampedRatio = Math.max(0.1, Math.min(1, collapsedRatio));
  const initialProg = disabled || pinnedOpen ? 1 : (defaultProgress ?? 0);

  const [progress, setProgress] = useState<number>(initialProg);
  const [peeking, setPeeking] = useState<boolean>(initialProg > 0.5);

  const progressRef = useRef<number>(initialProg);
  const pointerInsideRef = useRef<boolean>(false);
  const prevPinnedRef = useRef<boolean>(pinnedOpen);
  const delayTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const callbacksRef = useRef({ onProgressChange, onPeekChange });
  callbacksRef.current = { onProgressChange, onPeekChange };

  const clearTimers = useCallback(() => {
    if (delayTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (rafRef.current && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const updateProgress = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(val * 10000) / 10000));
    progressRef.current = clamped;
    setProgress(clamped);
    callbacksRef.current.onProgressChange?.(clamped);
  }, []);

  const animateTo = useCallback(
    (target: 0 | 1) => {
      if (typeof window === "undefined") {
        updateProgress(target);
        return;
      }
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      const from = progressRef.current;
      const dist = Math.abs(target - from);
      if (dist < 0.002 || prefersReducedMotion() || duration <= 0) {
        updateProgress(target);
        return;
      }

      // 按剩余行程比例反算动画时长，确保中途折返速度连续无突兀加速或跳帧
      const effectiveDuration = Math.max(16, duration * dist);
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / effectiveDuration);
        const eased = easeOutCubic(t);
        const nextVal = from + (target - from) * eased;
        updateProgress(nextVal);
        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          rafRef.current = 0;
          updateProgress(target);
        }
      };

      rafRef.current = window.requestAnimationFrame(step);
    },
    [duration, updateProgress],
  );

  const forceOpen = useCallback(() => {
    clearTimers();
    setPeeking(true);
    callbacksRef.current.onPeekChange?.(true);
    animateTo(1);
  }, [clearTimers, animateTo]);

  const forceCollapse = useCallback(() => {
    if (pinnedOpen || disabled) return;
    clearTimers();
    setPeeking(false);
    callbacksRef.current.onPeekChange?.(false);
    animateTo(0);
  }, [pinnedOpen, disabled, clearTimers, animateTo]);

  const enter = useCallback(() => {
    if (disabled) return;
    if (delayTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    setPeeking(true);
    callbacksRef.current.onPeekChange?.(true);

    // 若正处于缩回半途（0 < progress < 1），立即从当前实时位移无缝折返，不等延迟导致继续缩回
    if (progressRef.current > 0.02 && progressRef.current < 0.998) {
      animateTo(1);
      return;
    }
    if (progressRef.current >= 0.998 || typeof window === "undefined" || enterDelay <= 0) {
      animateTo(1);
      return;
    }
    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      animateTo(1);
    }, enterDelay);
  }, [disabled, enterDelay, animateTo]);

  const leave = useCallback(() => {
    if (disabled || pinnedOpen) return;
    if (delayTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (typeof window === "undefined" || leaveDelay <= 0) {
      setPeeking(false);
      callbacksRef.current.onPeekChange?.(false);
      animateTo(0);
      return;
    }
    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      setPeeking(false);
      callbacksRef.current.onPeekChange?.(false);
      animateTo(0);
    }, leaveDelay);
  }, [disabled, pinnedOpen, leaveDelay, animateTo]);

  useEffect(() => {
    const wasPinned = prevPinnedRef.current;
    prevPinnedRef.current = pinnedOpen;
    if (disabled || pinnedOpen) {
      clearTimers();
      setPeeking(true);
      animateTo(1);
    } else if (wasPinned && !pointerInsideRef.current) {
      leave();
    }
  }, [disabled, pinnedOpen, clearTimers, animateTo, leave]);

  useEffect(() => clearTimers, [clearTimers]);

  const bindPeek = useMemo<ReversibleEdgePeekBindProps>(
    () => ({
      onPointerEnter: () => {
        pointerInsideRef.current = true;
        enter();
      },
      onPointerLeave: () => {
        pointerInsideRef.current = false;
        leave();
      },
      onFocus: () => enter(),
      onBlur: (e: ReactFocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !pointerInsideRef.current) {
          leave();
        }
      },
    }),
    [enter, leave],
  );

  const hiddenFraction = (1 - clampedRatio) * (1 - progress);
  const sign = edge === "right" ? 1 : -1;
  const offsetPercent = Math.round(sign * hiddenFraction * 10000) / 100;

  return {
    progress,
    peeking,
    offsetPercent,
    enter,
    leave,
    forceOpen,
    forceCollapse,
    bindPeek,
  };
}
