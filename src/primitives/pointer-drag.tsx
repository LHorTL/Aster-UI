import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "./cn";
import { AfPortal, useAfLayerContainer } from "./layer";
import { useListFlip, type ListFlipController } from "./list-animation";

const INTERACTIVE_DESCENDANT_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [contenteditable="true"], [data-no-drag="true"]';

const SPRING_DROP_EASING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const DISPLACE_TRANSITION = "transform 200ms var(--af-ease, cubic-bezier(0.22, 1, 0.36, 1))";

function isNestedInteractiveTarget(target: EventTarget | null, itemRoot: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-no-drag="true"]')) return true;
  const interactive = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
  return Boolean(interactive && interactive !== itemRoot && itemRoot.contains(interactive));
}

function createSanitizedGhostClone(sourceEl: HTMLElement): HTMLElement {
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.removeAttribute("data-flip");
  clone.removeAttribute("data-af-dragging");
  clone.removeAttribute("data-drag-item-id");
  clone.removeAttribute("tabindex");
  clone.querySelectorAll("[id], [data-flip], [data-drag-item-id]").forEach((child) => {
    child.removeAttribute("id");
    child.removeAttribute("data-flip");
    child.removeAttribute("data-drag-item-id");
  });
  clone.style.transform = "none";
  clone.style.transition = "none";
  clone.style.opacity = "1";
  clone.style.margin = "0";
  clone.style.width = "100%";
  clone.style.height = "100%";
  clone.style.pointerEvents = "none";
  return clone;
}

function findScrollableAncestors(startEl: HTMLElement | null): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (typeof window === "undefined") return result;
  let cur: HTMLElement | null = startEl;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const style = window.getComputedStyle(cur);
    const ox = style.overflowX;
    const oy = style.overflowY;
    const canScrollX = (ox === "auto" || ox === "scroll") && cur.scrollWidth > cur.clientWidth + 1;
    const canScrollY = (oy === "auto" || oy === "scroll") && cur.scrollHeight > cur.clientHeight + 1;
    if (canScrollX || canScrollY) {
      result.push(cur);
    }
    cur = cur.parentElement;
  }
  return result;
}

function autoScrollNearEdges(
  scrollables: readonly HTMLElement[],
  clientX: number,
  clientY: number,
  edgeThreshold = 44,
  maxSpeed = 12,
): boolean {
  let scrolled = false;
  for (const scroller of scrollables) {
    const rect = scroller.getBoundingClientRect();
    if (
      clientX < rect.left - edgeThreshold ||
      clientX > rect.right + edgeThreshold ||
      clientY < rect.top - edgeThreshold ||
      clientY > rect.bottom + edgeThreshold
    ) {
      continue;
    }

    if (scroller.scrollHeight > scroller.clientHeight + 1) {
      if (clientY < rect.top + edgeThreshold) {
        const ratio = Math.min(1, (rect.top + edgeThreshold - clientY) / edgeThreshold);
        const prev = scroller.scrollTop;
        scroller.scrollTop = Math.max(0, prev - Math.ceil(ratio * maxSpeed));
        if (scroller.scrollTop !== prev) scrolled = true;
      } else if (clientY > rect.bottom - edgeThreshold) {
        const ratio = Math.min(1, (clientY - (rect.bottom - edgeThreshold)) / edgeThreshold);
        const prev = scroller.scrollTop;
        scroller.scrollTop = Math.min(
          scroller.scrollHeight - scroller.clientHeight,
          prev + Math.ceil(ratio * maxSpeed),
        );
        if (scroller.scrollTop !== prev) scrolled = true;
      }
    }

    if (scroller.scrollWidth > scroller.clientWidth + 1) {
      if (clientX < rect.left + edgeThreshold) {
        const ratio = Math.min(1, (rect.left + edgeThreshold - clientX) / edgeThreshold);
        const prev = scroller.scrollLeft;
        scroller.scrollLeft = Math.max(0, prev - Math.ceil(ratio * maxSpeed));
        if (scroller.scrollLeft !== prev) scrolled = true;
      } else if (clientX > rect.right - edgeThreshold) {
        const ratio = Math.min(1, (clientX - (rect.right - edgeThreshold)) / edgeThreshold);
        const prev = scroller.scrollLeft;
        scroller.scrollLeft = Math.min(
          scroller.scrollWidth - scroller.clientWidth,
          prev + Math.ceil(ratio * maxSpeed),
        );
        if (scroller.scrollLeft !== prev) scrolled = true;
      }
    }
  }
  return scrolled;
}

function computePortalTransform(
  portalEl: HTMLElement | null,
  viewportLeft: number,
  viewportTop: number,
): string {
  if (!portalEl) {
    return `translate3d(${Math.round(viewportLeft)}px, ${Math.round(viewportTop)}px, 0)`;
  }
  const cs = typeof window !== "undefined" ? window.getComputedStyle(portalEl) : null;
  if (cs && cs.position === "fixed") {
    const r = portalEl.getBoundingClientRect();
    const scaleX = portalEl.offsetWidth > 0 ? r.width / portalEl.offsetWidth : 1;
    const scaleY = portalEl.offsetHeight > 0 ? r.height / portalEl.offsetHeight : 1;
    const x = (viewportLeft - r.left) / (scaleX > 0 ? scaleX : 1);
    const y = (viewportTop - r.top) / (scaleY > 0 ? scaleY : 1);
    return `translate3d(${x}px, ${y}px, 0)`;
  }
  const r = portalEl.getBoundingClientRect();
  const x = viewportLeft - r.left + portalEl.scrollLeft;
  const y = viewportTop - r.top + portalEl.scrollTop;
  return `translate3d(${x}px, ${y}px, 0)`;
}

/* ======================================================================== */
/* 1D Sortable List (`useSortableList`)                                     */
/* ======================================================================== */

export type SortableDirection = "vertical" | "horizontal";

export type SortableDragState<T> = {
  /** 正在拖拽的条目唯一键。 */
  activeId: string;
  /** 正在拖拽的条目数据。 */
  activeItem: T;
  /** 起拖初始索引。 */
  sourceIndex: number;
  /** 当前悬停的目标插入索引。 */
  overIndex: number;
  /** 浮层宽度（px）。 */
  width: number;
  /** 浮层高度（px）。 */
  height: number;
};

export type UseSortableListOptions<T> = {
  /** 当前有序列表项。 */
  items: readonly T[];
  /** 提取每项稳定唯一键。 */
  getKey: (item: T) => string;
  /** 拖拽或键盘调序完成时回调新数组及起止索引。 */
  onReorder: (nextItems: T[], meta: { activeId: string; fromIndex: number; toIndex: number }) => void;
  /** 排列方向，默认 `"vertical"`。 */
  direction?: SortableDirection;
  /** 起拖判定阈值（px），默认 `4`（小于阈值保留原生点击事件）。 */
  activationDistance?: number;
  /** 禁用拖拽与键盘调序。 */
  disabled?: boolean;
  /** 自定义拖拽浮层内容；省略时自动克隆原节点并挂载至 `.af-portal-root`。 */
  renderGhost?: (state: SortableDragState<T>) => ReactNode;
  /** 可选指定浮层 Portal 容器；省略时自动接入 `.af-portal-root`。 */
  portalContainer?: HTMLElement | null;
};

export type SortableItemBindProps = {
  "data-flip": string;
  "data-drag-item-id": string;
  "data-af-dragging"?: "true";
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
};

export type SortableListResult<T> = {
  /** 绑定至列表父容器的 Ref。 */
  listRef: RefObject<HTMLElement | null>;
  /** 当前活跃拖拽状态；未拖拽时为 `null`。 */
  dragState: SortableDragState<T> | null;
  /** 当前正在拖拽的条目 ID。 */
  activeId: string | null;
  /** 为单行或手柄生成拖拽、兄弟实时让位与 `Alt+Arrow` 键盘调序属性。 */
  getItemProps: (item: T, index: number, options?: { disabled?: boolean }) => SortableItemBindProps;
  /** 挂载在 `.af-portal-root` 内的跟手浮层节点（直接渲染在组件树内即可）。 */
  ghostPortal: JSX.Element | null;
  /** 底层 `useListFlip` 控制器。 */
  flip: ListFlipController;
  /** 编程式移动指定索引项（自动带 FLIP 动画）。 */
  moveItem: (fromIndex: number, toIndex: number) => void;
};

/**
 * 一维列表指针弹簧拖拽与 `Alt+Arrow` 无障碍调序原语：
 * - `Pointer Events + setPointerCapture` 驱动，彻底告别 HTML5 `draggable` 原生半透明幽灵图；
 * - `4px` 阈值防误触，跟手浮层通过 `<AfPortal>` 挂载至 `.af-portal-root`（赋予 `--af-shadow-pop`）；
 * - 拖拽中兄弟项按精确高度差执行 `200ms var(--af-ease)` 平滑让位，松手以 `240ms var(--af-ease-spring)` 弹簧落位，支持 `Escape` 取消与边缘自动滚屏。
 */
export function useSortableList<T>(options: UseSortableListOptions<T>): SortableListResult<T> {
  const {
    items,
    getKey,
    onReorder,
    direction = "vertical",
    activationDistance = 4,
    disabled = false,
    renderGhost,
    portalContainer: explicitPortal,
  } = options;

  const listRef = useRef<HTMLElement | null>(null);
  const resolvedPortal = useAfLayerContainer(explicitPortal);
  const flip = useListFlip(listRef, {
    duration: 260,
    axis: direction === "horizontal" ? "x" : "y",
    disabled,
  });

  const [dragState, setDragState] = useState<SortableDragState<T> | null>(null);
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostCloneHostRef = useRef<HTMLDivElement | null>(null);
  const clonedNodeRef = useRef<HTMLElement | null>(null);
  const itemMetricsRef = useRef<Array<{ top: number; bottom: number; left: number; right: number }>>([]);
  const pendingSettleOriginRef = useRef<{
    id: string;
    left: number;
    top: number;
    duration: number;
    easing: string;
  } | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const activeCleanupRef = useRef<(() => void) | null>(null);

  const latestRef = useRef({ items, getKey, onReorder, direction, disabled, resolvedPortal });
  latestRef.current = { items, getKey, onReorder, direction, disabled, resolvedPortal };

  // Replay custom spring drop settle or Escape snap-back origin on commit.
  useIsomorphicLayoutEffect(() => {
    const settle = pendingSettleOriginRef.current;
    if (settle) {
      pendingSettleOriginRef.current = null;
      const map = new Map([
        [
          settle.id,
          {
            left: settle.left,
            top: settle.top,
            duration: settle.duration,
            easing: settle.easing,
          },
        ],
      ]);
      flip.play({ customOrigins: map });
    }
    if (pendingFocusIdRef.current && listRef.current) {
      const targetId = pendingFocusIdRef.current;
      pendingFocusIdRef.current = null;
      const el = listRef.current.querySelector<HTMLElement>(
        `[data-drag-item-id="${CSS.escape(targetId)}"]`,
      );
      el?.focus({ preventScroll: true });
    }
  });

  // Mount sanitized DOM clone into ghost portal when custom renderGhost is not provided.
  useIsomorphicLayoutEffect(() => {
    if (!dragState || renderGhost) return;
    const host = ghostCloneHostRef.current;
    const clone = clonedNodeRef.current;
    if (host && clone && !host.contains(clone)) {
      host.replaceChildren(clone);
    }
  }, [dragState, renderGhost]);

  useEffect(() => {
    const onCaptureClick = (e: MouseEvent) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      if (!listRef.current || !(e.target instanceof Node) || !listRef.current.contains(e.target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", onCaptureClick, true);
    return () => {
      window.removeEventListener("click", onCaptureClick, true);
      activeCleanupRef.current?.();
    };
  }, []);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      const curItems = latestRef.current.items;
      if (
        fromIndex < 0 ||
        fromIndex >= curItems.length ||
        toIndex < 0 ||
        toIndex >= curItems.length ||
        fromIndex === toIndex
      ) {
        return;
      }
      const next = [...curItems];
      const [moved] = next.splice(fromIndex, 1);
      if (moved === undefined) return;
      next.splice(toIndex, 0, moved);
      const activeId = latestRef.current.getKey(moved);
      flip.capture();
      latestRef.current.onReorder(next, { activeId, fromIndex, toIndex });
    },
    [flip],
  );

  const measureItemSlots = useCallback(() => {
    const root = listRef.current;
    if (!root) return [];
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-drag-item-id]"));
    return nodes.map((node) => {
      const prevTransform = node.style.transform;
      const prevTransition = node.style.transition;
      node.style.transition = "none";
      node.style.transform = "none";
      const r = node.getBoundingClientRect();
      node.style.transform = prevTransform;
      node.style.transition = prevTransition;
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
  }, []);

  const computeOverIndex = useCallback(
    (pointerCenter: number, sourceIndex: number): number => {
      const metrics = itemMetricsRef.current;
      if (metrics.length === 0) return sourceIndex;
      const isHoriz = latestRef.current.direction === "horizontal";
      let target = sourceIndex;
      if (pointerCenter < (isHoriz ? metrics[sourceIndex]!.left : metrics[sourceIndex]!.top)) {
        for (let i = 0; i < sourceIndex; i += 1) {
          const m = metrics[i]!;
          const mid = isHoriz ? (m.left + m.right) / 2 : (m.top + m.bottom) / 2;
          if (pointerCenter < mid) {
            target = i;
            break;
          }
        }
      } else {
        for (let i = metrics.length - 1; i > sourceIndex; i -= 1) {
          const m = metrics[i]!;
          const mid = isHoriz ? (m.left + m.right) / 2 : (m.top + m.bottom) / 2;
          if (pointerCenter > mid) {
            target = i;
            break;
          }
        }
      }
      return target;
    },
    [],
  );

  const getItemProps = useCallback<SortableListResult<T>["getItemProps"]>(
    (item, index, itemOptions) => {
      const id = getKey(item);
      const itemDisabled = disabled || Boolean(itemOptions?.disabled);
      const isDraggingSelf = dragState?.activeId === id;

      let displaceStyle: CSSProperties = {
        touchAction: itemDisabled ? undefined : "none",
      };

      if (dragState && itemMetricsRef.current.length > dragState.sourceIndex) {
        const { sourceIndex, overIndex } = dragState;
        const metrics = itemMetricsRef.current;
        const isHoriz = direction === "horizontal";
        const reduced = prefersReducedMotion();
        const transitionVal = reduced ? "none" : DISPLACE_TRANSITION;

        if (index === sourceIndex) {
          let shift = 0;
          if (overIndex > sourceIndex && metrics[overIndex] && metrics[sourceIndex]) {
            shift = isHoriz
              ? metrics[overIndex]!.right - metrics[sourceIndex]!.right
              : metrics[overIndex]!.bottom - metrics[sourceIndex]!.bottom;
          } else if (overIndex < sourceIndex && metrics[overIndex] && metrics[sourceIndex]) {
            shift = isHoriz
              ? metrics[overIndex]!.left - metrics[sourceIndex]!.left
              : metrics[overIndex]!.top - metrics[sourceIndex]!.top;
          }
          displaceStyle = {
            ...displaceStyle,
            transform: isHoriz ? `translate3d(${shift}px, 0, 0)` : `translate3d(0, ${shift}px, 0)`,
            transition: transitionVal,
          };
        } else if (sourceIndex < overIndex && index > sourceIndex && index <= overIndex) {
          const step =
            metrics[sourceIndex + 1] && metrics[sourceIndex]
              ? isHoriz
                ? -(metrics[sourceIndex + 1]!.left - metrics[sourceIndex]!.left)
                : -(metrics[sourceIndex + 1]!.top - metrics[sourceIndex]!.top)
              : isHoriz
                ? -dragState.width
                : -dragState.height;
          displaceStyle = {
            ...displaceStyle,
            transform: isHoriz ? `translate3d(${step}px, 0, 0)` : `translate3d(0, ${step}px, 0)`,
            transition: transitionVal,
          };
        } else if (sourceIndex > overIndex && index >= overIndex && index < sourceIndex) {
          const step =
            metrics[sourceIndex] && metrics[sourceIndex - 1]
              ? isHoriz
                ? metrics[sourceIndex]!.right - metrics[sourceIndex - 1]!.right
                : metrics[sourceIndex]!.bottom - metrics[sourceIndex - 1]!.bottom
              : isHoriz
                ? dragState.width
                : dragState.height;
          displaceStyle = {
            ...displaceStyle,
            transform: isHoriz ? `translate3d(${step}px, 0, 0)` : `translate3d(0, ${step}px, 0)`,
            transition: transitionVal,
          };
        } else {
          displaceStyle = {
            ...displaceStyle,
            transform: "translate3d(0, 0, 0)",
            transition: transitionVal,
          };
        }
      }

      const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
        if (itemDisabled || e.button !== 0) return;
        const itemEl = e.currentTarget;
        if (isNestedInteractiveTarget(e.target, itemEl)) return;

        activeCleanupRef.current?.();
        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startY = e.clientY;
        const originRect = itemEl.getBoundingClientRect();
        const grabOffsetX = startX - originRect.left;
        const grabOffsetY = startY - originRect.top;

        let started = false;
        let currentOver = index;
        let lastClientX = startX;
        let lastClientY = startY;
        let rafId: number | null = null;
        let scrollables: HTMLElement[] = [];

        const syncGhostAndHitTest = () => {
          const ghostLeft = lastClientX - grabOffsetX;
          const ghostTop = lastClientY - grabOffsetY;
          if (ghostElRef.current) {
            ghostElRef.current.style.transform = computePortalTransform(
              latestRef.current.resolvedPortal,
              ghostLeft,
              ghostTop,
            );
          }
          const isHoriz = latestRef.current.direction === "horizontal";
          const center = isHoriz
            ? ghostLeft + originRect.width / 2
            : ghostTop + originRect.height / 2;
          const nextOver = computeOverIndex(center, index);
          if (nextOver !== currentOver) {
            currentOver = nextOver;
            setDragState((prev) => (prev ? { ...prev, overIndex: nextOver } : null));
          }
        };

        const tickAutoScroll = () => {
          if (!started) return;
          if (autoScrollNearEdges(scrollables, lastClientX, lastClientY)) {
            itemMetricsRef.current = measureItemSlots();
            syncGhostAndHitTest();
          }
          rafId = window.requestAnimationFrame(tickAutoScroll);
        };

        const cleanupListeners = () => {
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
          }
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("pointercancel", handleCancel);
          window.removeEventListener("keydown", handleEsc, true);
          try {
            if (itemEl.hasPointerCapture?.(pointerId)) {
              itemEl.releasePointerCapture(pointerId);
            }
          } catch {
            // Ignore synthetic PointerEvent environments.
          }
          document.documentElement.removeAttribute("data-af-sorting");
          activeCleanupRef.current = null;
        };

        const finishDrag = (commit: boolean) => {
          if (!started) {
            cleanupListeners();
            return;
          }
          const finalLeft = lastClientX - grabOffsetX;
          const finalTop = lastClientY - grabOffsetY;
          cleanupListeners();
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 80);

          flip.capture();
          pendingSettleOriginRef.current = {
            id,
            left: finalLeft,
            top: finalTop,
            duration: commit ? 240 : 200,
            easing: commit ? SPRING_DROP_EASING : "cubic-bezier(0.22, 1, 0.36, 1)",
          };
          clonedNodeRef.current = null;
          setDragState(null);

          if (commit && currentOver !== index) {
            const curItems = [...latestRef.current.items];
            const [moved] = curItems.splice(index, 1);
            if (moved !== undefined) {
              curItems.splice(currentOver, 0, moved);
              latestRef.current.onReorder(curItems, {
                activeId: id,
                fromIndex: index,
                toIndex: currentOver,
              });
            }
          }
        };

        const handleMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;
          if (!started) {
            if (Math.hypot(lastClientX - startX, lastClientY - startY) < activationDistance) {
              return;
            }
            started = true;
            try {
              itemEl.setPointerCapture?.(pointerId);
            } catch {
              // Ignore synthetic events
            }
            document.documentElement.setAttribute("data-af-sorting", "true");
            itemMetricsRef.current = measureItemSlots();
            scrollables = findScrollableAncestors(itemEl);
            if (!renderGhost) {
              clonedNodeRef.current = createSanitizedGhostClone(itemEl);
            }
            setDragState({
              activeId: id,
              activeItem: item,
              sourceIndex: index,
              overIndex: index,
              width: originRect.width,
              height: originRect.height,
            });
            rafId = window.requestAnimationFrame(tickAutoScroll);
          }
          ev.preventDefault();
          syncGhostAndHitTest();
        };

        const handleUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;
          if (started) syncGhostAndHitTest();
          finishDrag(true);
        };

        const handleCancel = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          finishDrag(false);
        };

        const handleEsc = (ev: KeyboardEvent) => {
          if (ev.key === "Escape" && started) {
            ev.preventDefault();
            ev.stopPropagation();
            finishDrag(false);
          }
        };

        activeCleanupRef.current = cleanupListeners;
        window.addEventListener("pointermove", handleMove, { passive: false });
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleCancel);
        window.addEventListener("keydown", handleEsc, true);
      };

      const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
        if (itemDisabled || !e.altKey) return;
        const isHoriz = direction === "horizontal";
        const prevKey = isHoriz ? "ArrowLeft" : "ArrowUp";
        const nextKey = isHoriz ? "ArrowRight" : "ArrowDown";
        if (e.key === prevKey && index > 0) {
          e.preventDefault();
          pendingFocusIdRef.current = id;
          moveItem(index, index - 1);
        } else if (e.key === nextKey && index < items.length - 1) {
          e.preventDefault();
          pendingFocusIdRef.current = id;
          moveItem(index, index + 1);
        }
      };

      return {
        "data-flip": id,
        "data-drag-item-id": id,
        ...(isDraggingSelf ? { "data-af-dragging": "true" as const } : {}),
        onPointerDown,
        onKeyDown,
        style: displaceStyle,
      };
    },
    [
      activationDistance,
      computeOverIndex,
      direction,
      disabled,
      dragState,
      flip,
      getKey,
      items.length,
      measureItemSlots,
      moveItem,
      renderGhost,
    ],
  );

  const ghostPortal = useMemo(() => {
    if (!dragState) return null;
    return (
      <AfPortal container={explicitPortal}>
        <div
          ref={ghostElRef}
          className="af-drag-ghost"
          data-af-drag-ghost="true"
          aria-hidden="true"
          style={{
            width: dragState.width,
            height: dragState.height,
          }}
        >
          {renderGhost ? (
            renderGhost(dragState)
          ) : (
            <div ref={ghostCloneHostRef} className="af-drag-ghost__clone" />
          )}
        </div>
      </AfPortal>
    );
  }, [dragState, explicitPortal, renderGhost]);

  return {
    listRef,
    dragState,
    activeId: dragState?.activeId ?? null,
    getItemProps,
    ghostPortal,
    flip,
    moveItem,
  };
}

/* ======================================================================== */
/* 2D Multi-Column Kanban / Delegate Board (`usePointerDragBoard`)          */
/* ======================================================================== */

export type DragBoardMovePayload<TItem, TCol extends string = string> = {
  /** 被移动的卡片唯一键。 */
  itemId: string;
  /** 被移动的卡片数据。 */
  item: TItem;
  /** 来源列 ID。 */
  fromColumnId: TCol;
  /** 来源列中的初始索引。 */
  fromIndex: number;
  /** 目标列 ID。 */
  toColumnId: TCol;
  /** 插入目标列中的目标索引。 */
  toIndex: number;
};

export type DragBoardState<TItem, TCol extends string = string> = {
  /** 正在拖拽的卡片唯一键。 */
  activeId: string;
  /** 正在拖拽的卡片数据。 */
  activeItem: TItem;
  /** 起拖所在列 ID。 */
  sourceColumnId: TCol;
  /** 起拖所在列初始索引。 */
  sourceIndex: number;
  /** 当前指针命中的目标列 ID（若指针移出所有列且 `allowDropOutside` 为假，则保持最近有效列）。 */
  overColumnId: TCol | null;
  /** 当前目标列内的插入槽位索引。 */
  overIndex: number;
  /** 浮层宽度（px）。 */
  width: number;
  /** 浮层高度（px）。 */
  height: number;
};

export type UsePointerDragBoardOptions<TItem, TCol extends string = string> = {
  /** 有序的看板列 ID 列表（用于跨列 `Alt+ArrowLeft/Right` 键盘转移与命中检测）。 */
  columnIds: readonly TCol[];
  /** 读取指定列当前展示的卡片数组。 */
  getColumnItems: (columnId: TCol) => readonly TItem[];
  /** 提取卡片稳定唯一键。 */
  getKey: (item: TItem) => string;
  /** 卡片跨列或同列落位回调。 */
  onMove: (payload: DragBoardMovePayload<TItem, TCol>) => void;
  /** 起拖判定阈值（px），默认 `4`（确保单击打开详情抽屉或选中卡片零冲突）。 */
  activationDistance?: number;
  /** 当指针未直接悬停在某列上方时是否清除 `overColumnId`（适用于“拖向指定 Agent/文件夹才高亮”的场景），默认 `false`（看板模式保持最近命中列）。 */
  requireDirectColumnHit?: boolean;
  /** 禁用拖拽与键盘移动。 */
  disabled?: boolean;
  /** 自定义浮层内容；省略时自动克隆原卡片节点并挂载至 `.af-portal-root`。 */
  renderGhost?: (state: DragBoardState<TItem, TCol>) => ReactNode;
  /** 可选指定浮层 Portal 容器。 */
  portalContainer?: HTMLElement | null;
};

export type DragBoardColumnBindProps = {
  "data-drag-col-id": string;
  "data-drop-target"?: "true";
};

export type DragBoardItemBindProps = {
  "data-flip": string;
  "data-drag-item-id": string;
  "data-af-dragging"?: "true";
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
};

export type PointerDragBoardResult<TItem, TCol extends string = string> = {
  /** 绑定至整个看板根容器的 Ref（统一协调跨列二维 FLIP 与列命中测量）。 */
  boardRef: RefObject<HTMLDivElement | null>;
  /** 当前活跃拖拽状态；未拖拽时为 `null`。 */
  dragState: DragBoardState<TItem, TCol> | null;
  /** 当前正在拖拽的卡片 ID。 */
  activeId: string | null;
  /** 当前悬停命中的目标列 ID。 */
  overColumnId: TCol | null;
  /** 绑定至列容器的属性（含 `data-drag-col-id` 与 `data-drop-target`）。 */
  getColumnProps: (columnId: TCol) => DragBoardColumnBindProps;
  /** 绑定至卡片节点的属性（含指针捕获拖拽、兄弟实时让位、`Alt+Arrow` 跨列/同列移动）。 */
  getItemProps: (
    item: TItem,
    columnId: TCol,
    index: number,
    options?: { disabled?: boolean },
  ) => DragBoardItemBindProps;
  /** 挂载在 `.af-portal-root` 内的跟手浮层节点。 */
  ghostPortal: JSX.Element | null;
  /** 底层二维 `useListFlip` 控制器。 */
  flip: ListFlipController;
};

type MeasuredColSlot = {
  rect: DOMRect;
  gap: number;
  items: Array<{ id: string; top: number; bottom: number; height: number }>;
};

/**
 * 二维多列看板 / 任务委派面板指针弹簧拖拽原语：
 * - `Pointer Events + setPointerCapture` 跟手驱动，`4px` 起拖阈值确保卡片单击抽屉/多选零干扰；
 * - 浮层通过 `<AfPortal>` 挂载于 `.af-portal-root`（`--af-shadow-pop`），杜绝 `overflow` 裁切与原生 HTML5 幽灵残影；
 * - 同列重排与跨列拖入时，源列自动合拢、目标列兄弟卡片 `200ms var(--af-ease)` 平滑分流让出槽位；
 * - 松手执行 `240ms var(--af-ease-spring)` 弹簧落位，`Escape` 优雅回弹取消，原生内置横纵双向边缘自动滚屏与 `Alt+方向键` 无障碍移卡。
 */
export function usePointerDragBoard<TItem, TCol extends string = string>(
  options: UsePointerDragBoardOptions<TItem, TCol>,
): PointerDragBoardResult<TItem, TCol> {
  const {
    columnIds,
    getColumnItems,
    getKey,
    onMove,
    activationDistance = 4,
    requireDirectColumnHit = false,
    disabled = false,
    renderGhost,
    portalContainer: explicitPortal,
  } = options;

  const boardRef = useRef<HTMLDivElement | null>(null);
  const resolvedPortal = useAfLayerContainer(explicitPortal);
  const flip = useListFlip(boardRef, {
    duration: 260,
    axis: "both",
    disabled,
  });

  const [dragState, setDragState] = useState<DragBoardState<TItem, TCol> | null>(null);
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostCloneHostRef = useRef<HTMLDivElement | null>(null);
  const clonedNodeRef = useRef<HTMLElement | null>(null);
  const colMetricsRef = useRef<Map<TCol, MeasuredColSlot>>(new Map());
  const pendingSettleOriginRef = useRef<{
    id: string;
    left: number;
    top: number;
    duration: number;
    easing: string;
  } | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const activeCleanupRef = useRef<(() => void) | null>(null);

  const latestRef = useRef({
    columnIds,
    getColumnItems,
    getKey,
    onMove,
    requireDirectColumnHit,
    disabled,
    resolvedPortal,
  });
  latestRef.current = {
    columnIds,
    getColumnItems,
    getKey,
    onMove,
    requireDirectColumnHit,
    disabled,
    resolvedPortal,
  };

  useIsomorphicLayoutEffect(() => {
    const settle = pendingSettleOriginRef.current;
    if (settle) {
      pendingSettleOriginRef.current = null;
      flip.play({
        customOrigins: new Map([
          [
            settle.id,
            {
              left: settle.left,
              top: settle.top,
              duration: settle.duration,
              easing: settle.easing,
            },
          ],
        ]),
      });
    }
    if (pendingFocusIdRef.current && boardRef.current) {
      const targetId = pendingFocusIdRef.current;
      pendingFocusIdRef.current = null;
      const el = boardRef.current.querySelector<HTMLElement>(
        `[data-drag-item-id="${CSS.escape(targetId)}"]`,
      );
      el?.focus({ preventScroll: true });
    }
  });

  useIsomorphicLayoutEffect(() => {
    if (!dragState || renderGhost) return;
    const host = ghostCloneHostRef.current;
    const clone = clonedNodeRef.current;
    if (host && clone && !host.contains(clone)) {
      host.replaceChildren(clone);
    }
  }, [dragState, renderGhost]);

  useEffect(() => {
    const onCaptureClick = (e: MouseEvent) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      if (!boardRef.current || !(e.target instanceof Node) || !boardRef.current.contains(e.target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", onCaptureClick, true);
    return () => {
      window.removeEventListener("click", onCaptureClick, true);
      activeCleanupRef.current?.();
    };
  }, []);

  const measureBoardColumns = useCallback((): Map<TCol, MeasuredColSlot> => {
    const map = new Map<TCol, MeasuredColSlot>();
    const root = boardRef.current;
    if (!root) return map;

    const colNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-drag-col-id]"));
    for (const colEl of colNodes) {
      const colId = colEl.getAttribute("data-drag-col-id") as TCol | null;
      if (!colId) continue;
      const colRect = colEl.getBoundingClientRect();
      const itemNodes = Array.from(colEl.querySelectorAll<HTMLElement>("[data-drag-item-id]"));

      const items = itemNodes.map((node) => {
        const prevTransform = node.style.transform;
        const prevTransition = node.style.transition;
        node.style.transition = "none";
        node.style.transform = "none";
        const r = node.getBoundingClientRect();
        node.style.transform = prevTransform;
        node.style.transition = prevTransition;
        return {
          id: node.getAttribute("data-drag-item-id") ?? "",
          top: r.top,
          bottom: r.bottom,
          height: r.height,
        };
      });

      let gap = 8;
      if (items.length >= 2) {
        const measuredGap = items[1]!.top - items[0]!.bottom;
        if (measuredGap >= 0 && measuredGap <= 48) {
          gap = measuredGap;
        }
      }

      map.set(colId, { rect: colRect, gap, items });
    }
    return map;
  }, []);

  const hitTestBoard = useCallback(
    (
      clientX: number,
      clientY: number,
      ghostCenterY: number,
      sourceCol: TCol,
      sourceIdx: number,
      fallbackCol: TCol | null,
    ): { overColumnId: TCol | null; overIndex: number } => {
      const cols = colMetricsRef.current;
      if (cols.size === 0) {
        return {
          overColumnId: latestRef.current.requireDirectColumnHit ? null : sourceCol,
          overIndex: sourceIdx,
        };
      }

      let hitCol: TCol | null = null;
      let nearestCol: TCol | null = fallbackCol;
      let nearestDist = Number.POSITIVE_INFINITY;

      for (const [colId, slot] of cols.entries()) {
        const r = slot.rect;
        const insideX = clientX >= r.left && clientX <= r.right;
        const insideY = clientY >= r.top && clientY <= r.bottom;
        if (insideX && insideY) {
          hitCol = colId;
          break;
        }
        const dx = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
        const dy = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
        const dist = Math.hypot(dx, dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCol = colId;
        }
      }

      const targetCol = hitCol ?? (latestRef.current.requireDirectColumnHit ? null : nearestCol);
      if (!targetCol) {
        return { overColumnId: null, overIndex: 0 };
      }

      const colSlot = cols.get(targetCol);
      if (!colSlot || colSlot.items.length === 0) {
        return { overColumnId: targetCol, overIndex: 0 };
      }

      if (targetCol === sourceCol) {
        const list = colSlot.items;
        let idx = sourceIdx;
        if (list[sourceIdx] && ghostCenterY < list[sourceIdx]!.top) {
          for (let i = 0; i < sourceIdx; i += 1) {
            const mid = (list[i]!.top + list[i]!.bottom) / 2;
            if (ghostCenterY < mid) {
              idx = i;
              break;
            }
          }
        } else {
          for (let i = list.length - 1; i > sourceIdx; i -= 1) {
            const mid = (list[i]!.top + list[i]!.bottom) / 2;
            if (ghostCenterY > mid) {
              idx = i;
              break;
            }
          }
        }
        return { overColumnId: targetCol, overIndex: idx };
      }

      // Cross-column insertion slot: 0 .. colSlot.items.length
      let insertIdx = colSlot.items.length;
      for (let i = 0; i < colSlot.items.length; i += 1) {
        const mid = (colSlot.items[i]!.top + colSlot.items[i]!.bottom) / 2;
        if (ghostCenterY < mid) {
          insertIdx = i;
          break;
        }
      }
      return { overColumnId: targetCol, overIndex: insertIdx };
    },
    [],
  );

  const getColumnProps = useCallback<PointerDragBoardResult<TItem, TCol>["getColumnProps"]>(
    (columnId) => {
      const isDropTarget =
        dragState !== null &&
        dragState.overColumnId === columnId &&
        (dragState.overColumnId !== dragState.sourceColumnId ||
          dragState.overIndex !== dragState.sourceIndex ||
          requireDirectColumnHit);
      return {
        "data-drag-col-id": columnId,
        ...(isDropTarget ? { "data-drop-target": "true" as const } : {}),
      };
    },
    [dragState, requireDirectColumnHit],
  );

  const getItemProps = useCallback<PointerDragBoardResult<TItem, TCol>["getItemProps"]>(
    (item, columnId, index, itemOptions) => {
      const id = getKey(item);
      const itemDisabled = disabled || Boolean(itemOptions?.disabled);
      const isDraggingSelf = dragState?.activeId === id;

      let displaceStyle: CSSProperties = {
        touchAction: itemDisabled ? undefined : "none",
      };

      if (dragState) {
        const { sourceColumnId, sourceIndex, overColumnId, overIndex, height: dragH } = dragState;
        const reduced = prefersReducedMotion();
        const transitionVal = reduced ? "none" : DISPLACE_TRANSITION;
        const colSlot = colMetricsRef.current.get(columnId);
        const gap = colSlot?.gap ?? 8;
        const stride = dragH + gap;

        if (columnId === sourceColumnId && overColumnId === sourceColumnId) {
          const items = colSlot?.items ?? [];
          if (index === sourceIndex) {
            let shift = 0;
            if (overIndex > sourceIndex && items[overIndex] && items[sourceIndex]) {
              shift = items[overIndex]!.bottom - items[sourceIndex]!.bottom;
            } else if (overIndex < sourceIndex && items[overIndex] && items[sourceIndex]) {
              shift = items[overIndex]!.top - items[sourceIndex]!.top;
            }
            displaceStyle = {
              ...displaceStyle,
              transform: `translate3d(0, ${shift}px, 0)`,
              transition: transitionVal,
            };
          } else if (sourceIndex < overIndex && index > sourceIndex && index <= overIndex) {
            const step =
              items[sourceIndex + 1] && items[sourceIndex]
                ? -(items[sourceIndex + 1]!.top - items[sourceIndex]!.top)
                : -stride;
            displaceStyle = {
              ...displaceStyle,
              transform: `translate3d(0, ${step}px, 0)`,
              transition: transitionVal,
            };
          } else if (sourceIndex > overIndex && index >= overIndex && index < sourceIndex) {
            const step =
              items[sourceIndex] && items[sourceIndex - 1]
                ? items[sourceIndex]!.bottom - items[sourceIndex - 1]!.bottom
                : stride;
            displaceStyle = {
              ...displaceStyle,
              transform: `translate3d(0, ${step}px, 0)`,
              transition: transitionVal,
            };
          } else {
            displaceStyle = {
              ...displaceStyle,
              transform: "translate3d(0, 0, 0)",
              transition: transitionVal,
            };
          }
        } else if (columnId === sourceColumnId && overColumnId !== sourceColumnId && overColumnId !== null) {
          // Card left source column: close gap below sourceIndex.
          if (index > sourceIndex) {
            displaceStyle = {
              ...displaceStyle,
              transform: `translate3d(0, ${-stride}px, 0)`,
              transition: transitionVal,
            };
          } else {
            displaceStyle = {
              ...displaceStyle,
              transform: "translate3d(0, 0, 0)",
              transition: transitionVal,
            };
          }
        } else if (columnId === overColumnId && overColumnId !== sourceColumnId) {
          // Card hovering foreign column: open landing slot at overIndex.
          if (index >= overIndex) {
            displaceStyle = {
              ...displaceStyle,
              transform: `translate3d(0, ${stride}px, 0)`,
              transition: transitionVal,
            };
          } else {
            displaceStyle = {
              ...displaceStyle,
              transform: "translate3d(0, 0, 0)",
              transition: transitionVal,
            };
          }
        } else {
          displaceStyle = {
            ...displaceStyle,
            transform: "translate3d(0, 0, 0)",
            transition: transitionVal,
          };
        }
      }

      const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
        if (itemDisabled || e.button !== 0) return;
        const itemEl = e.currentTarget;
        if (isNestedInteractiveTarget(e.target, itemEl)) return;

        activeCleanupRef.current?.();
        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startY = e.clientY;
        const originRect = itemEl.getBoundingClientRect();
        const grabOffsetX = startX - originRect.left;
        const grabOffsetY = startY - originRect.top;

        let started = false;
        let currentOverCol: TCol | null = requireDirectColumnHit ? null : columnId;
        let currentOverIdx = index;
        let lastClientX = startX;
        let lastClientY = startY;
        let rafId: number | null = null;
        let scrollables: HTMLElement[] = [];

        const syncGhostAndHitTest = () => {
          const ghostLeft = lastClientX - grabOffsetX;
          const ghostTop = lastClientY - grabOffsetY;
          if (ghostElRef.current) {
            ghostElRef.current.style.transform = computePortalTransform(
              latestRef.current.resolvedPortal,
              ghostLeft,
              ghostTop,
            );
          }

          // Also include any scrollable inside the hovered column for vertical auto-scroll.
          colMetricsRef.current = measureBoardColumns();
          const hit = hitTestBoard(
            lastClientX,
            lastClientY,
            ghostTop + originRect.height / 2,
            columnId,
            index,
            currentOverCol,
          );
          if (hit.overColumnId !== currentOverCol || hit.overIndex !== currentOverIdx) {
            currentOverCol = hit.overColumnId;
            currentOverIdx = hit.overIndex;
            setDragState((prev) =>
              prev
                ? {
                    ...prev,
                    overColumnId: hit.overColumnId,
                    overIndex: hit.overIndex,
                  }
                : null,
            );
          }
        };

        const tickAutoScroll = () => {
          if (!started) return;
          const hoveredEl =
            typeof document !== "undefined" && typeof document.elementFromPoint === "function"
              ? (document.elementFromPoint(lastClientX, lastClientY) as HTMLElement | null)
              : null;
          const dynamicScrollables = hoveredEl
            ? Array.from(new Set([...scrollables, ...findScrollableAncestors(hoveredEl)]))
            : scrollables;
          if (autoScrollNearEdges(dynamicScrollables, lastClientX, lastClientY)) {
            syncGhostAndHitTest();
          }
          rafId = window.requestAnimationFrame(tickAutoScroll);
        };

        const cleanupListeners = () => {
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
          }
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("pointercancel", handleCancel);
          window.removeEventListener("keydown", handleEsc, true);
          try {
            if (itemEl.hasPointerCapture?.(pointerId)) {
              itemEl.releasePointerCapture(pointerId);
            }
          } catch {
            // Ignore synthetic PointerEvents
          }
          document.documentElement.removeAttribute("data-af-sorting");
          activeCleanupRef.current = null;
        };

        const finishDrag = (commit: boolean) => {
          if (!started) {
            cleanupListeners();
            return;
          }
          const finalLeft = lastClientX - grabOffsetX;
          const finalTop = lastClientY - grabOffsetY;
          cleanupListeners();
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 80);

          const hasValidMove =
            commit &&
            currentOverCol !== null &&
            (currentOverCol !== columnId || currentOverIdx !== index);

          flip.capture();
          pendingSettleOriginRef.current = {
            id,
            left: finalLeft,
            top: finalTop,
            duration: hasValidMove ? 240 : 200,
            easing: hasValidMove ? SPRING_DROP_EASING : "cubic-bezier(0.22, 1, 0.36, 1)",
          };
          clonedNodeRef.current = null;
          setDragState(null);

          if (hasValidMove && currentOverCol !== null) {
            latestRef.current.onMove({
              itemId: id,
              item,
              fromColumnId: columnId,
              fromIndex: index,
              toColumnId: currentOverCol,
              toIndex: currentOverIdx,
            });
          }
        };

        const handleMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;
          if (!started) {
            if (Math.hypot(lastClientX - startX, lastClientY - startY) < activationDistance) {
              return;
            }
            started = true;
            try {
              itemEl.setPointerCapture?.(pointerId);
            } catch {
              // Ignore synthetic events
            }
            document.documentElement.setAttribute("data-af-sorting", "true");
            colMetricsRef.current = measureBoardColumns();
            scrollables = findScrollableAncestors(boardRef.current ?? itemEl);
            if (!renderGhost) {
              clonedNodeRef.current = createSanitizedGhostClone(itemEl);
            }
            setDragState({
              activeId: id,
              activeItem: item,
              sourceColumnId: columnId,
              sourceIndex: index,
              overColumnId: currentOverCol,
              overIndex: currentOverIdx,
              width: originRect.width,
              height: originRect.height,
            });
            rafId = window.requestAnimationFrame(tickAutoScroll);
          }
          ev.preventDefault();
          syncGhostAndHitTest();
        };

        const handleUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;
          if (started) syncGhostAndHitTest();
          finishDrag(true);
        };

        const handleCancel = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          finishDrag(false);
        };

        const handleEsc = (ev: KeyboardEvent) => {
          if (ev.key === "Escape" && started) {
            ev.preventDefault();
            ev.stopPropagation();
            finishDrag(false);
          }
        };

        activeCleanupRef.current = cleanupListeners;
        window.addEventListener("pointermove", handleMove, { passive: false });
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleCancel);
        window.addEventListener("keydown", handleEsc, true);
      };

      const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
        if (itemDisabled || !e.altKey) return;
        const cols = latestRef.current.columnIds;
        const colIdx = cols.indexOf(columnId);
        const curColItems = latestRef.current.getColumnItems(columnId);

        if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault();
          pendingFocusIdRef.current = id;
          flip.capture();
          latestRef.current.onMove({
            itemId: id,
            item,
            fromColumnId: columnId,
            fromIndex: index,
            toColumnId: columnId,
            toIndex: index - 1,
          });
        } else if (e.key === "ArrowDown" && index < curColItems.length - 1) {
          e.preventDefault();
          pendingFocusIdRef.current = id;
          flip.capture();
          latestRef.current.onMove({
            itemId: id,
            item,
            fromColumnId: columnId,
            fromIndex: index,
            toColumnId: columnId,
            toIndex: index + 1,
          });
        } else if (e.key === "ArrowLeft" && colIdx > 0) {
          e.preventDefault();
          const prevCol = cols[colIdx - 1]!;
          const targetLen = latestRef.current.getColumnItems(prevCol).length;
          pendingFocusIdRef.current = id;
          flip.capture();
          latestRef.current.onMove({
            itemId: id,
            item,
            fromColumnId: columnId,
            fromIndex: index,
            toColumnId: prevCol,
            toIndex: Math.min(index, targetLen),
          });
        } else if (e.key === "ArrowRight" && colIdx >= 0 && colIdx < cols.length - 1) {
          e.preventDefault();
          const nextCol = cols[colIdx + 1]!;
          const targetLen = latestRef.current.getColumnItems(nextCol).length;
          pendingFocusIdRef.current = id;
          flip.capture();
          latestRef.current.onMove({
            itemId: id,
            item,
            fromColumnId: columnId,
            fromIndex: index,
            toColumnId: nextCol,
            toIndex: Math.min(index, targetLen),
          });
        }
      };

      return {
        "data-flip": id,
        "data-drag-item-id": id,
        ...(isDraggingSelf ? { "data-af-dragging": "true" as const } : {}),
        onPointerDown,
        onKeyDown,
        style: displaceStyle,
      };
    },
    [
      activationDistance,
      disabled,
      dragState,
      flip,
      getKey,
      hitTestBoard,
      measureBoardColumns,
      renderGhost,
      requireDirectColumnHit,
    ],
  );

  const ghostPortal = useMemo(() => {
    if (!dragState) return null;
    return (
      <AfPortal container={explicitPortal}>
        <div
          ref={ghostElRef}
          className="af-drag-ghost"
          data-af-drag-ghost="true"
          aria-hidden="true"
          style={{
            width: dragState.width,
            height: dragState.height,
          }}
        >
          {renderGhost ? (
            renderGhost(dragState)
          ) : (
            <div ref={ghostCloneHostRef} className="af-drag-ghost__clone" />
          )}
        </div>
      </AfPortal>
    );
  }, [dragState, explicitPortal, renderGhost]);

  return {
    boardRef,
    dragState,
    activeId: dragState?.activeId ?? null,
    overColumnId: dragState?.overColumnId ?? null,
    getColumnProps,
    getItemProps,
    ghostPortal,
    flip,
  };
}
