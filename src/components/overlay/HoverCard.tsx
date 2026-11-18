import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import {
  cn,
  composeRefs,
  useAnchoredPopover,
  useControllableState,
  useExitTransition,
  useOverlayBranch,
  type AfPopoverSide,
} from "../../primitives";

let lastHoverCardClosedAt = 0;
let activeHoverCardCloser: (() => void) | null = null;

/** HoverCard 悬停预览卡片属性（同时兼容 `trigger` + `children` 与 affectUI `content` + `children` 两种写法）。 */
export type AfHoverCardProps = {
  /** 触发元素（Aster 写法：`<AfHoverCard trigger={<a/>}>{card}</AfHoverCard>`）。 */
  trigger?: ReactElement;
  /** 预览卡片内容（affectUI 写法：`<AfHoverCard content={<Card/>}>{trigger}</AfHoverCard>`）。 */
  content?: ReactNode;
  /** 当传入 `content` 时作为触发元素；否则作为预览卡片内容。 */
  children: ReactNode;
  /** 受控显示状态。 */
  open?: boolean;
  /** 非受控初始显示状态。 */
  defaultOpen?: boolean;
  /** 显示状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 首选展开方向，默认 `"bottom"`。 */
  placement?: AfPopoverSide;
  /** `placement` 别名。 */
  side?: AfPopoverSide;
  /** 对齐方式，默认 `"start"`。 */
  align?: "start" | "center" | "end";
  /** 与锚点间距（px），默认 `8`。 */
  offset?: number;
  /** 悬停触发延时（ms），默认 `240`。 */
  openDelay?: number;
  /** 离开关闭宽限期（ms），默认 `180`（配合 `::before` 透明走廊确保指针平稳移入卡片内）。 */
  closeDelay?: number;
  /** 卡片宽度，默认 `280`。 */
  width?: number | string;
  /** 可选覆盖无障碍 role；纯文本卡片默认为 `"tooltip"`，富交互 JSX 卡片默认不挂 `role="tooltip"` 以保留内部可点击链接语义。 */
  role?: string;
  /** 禁用悬停预览。 */
  disabled?: boolean;
  /** 自定义挂载容器。 */
  container?: HTMLElement | null;
  /** 额外类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/**
 * 悬停预览卡（affectUI 1:1 复刻）：
 * - 指针停留或键盘聚焦触发，内置 12px 悬停走廊桥接与双端指针驻留跟踪，从触发器移入卡片或点击卡片内部绝不闪退；
 * - 单例协调 + 320ms 热窗口：相邻触发器切换零延迟且跳过重复缩放动画（`data-instant`）；
 * - 触屏设备自动跳过，不抢占焦点（遵循 WCAG 3.2.1）。
 */
export function AfHoverCard({
  trigger: triggerProp,
  content: contentProp,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom",
  side,
  align = "start",
  offset = 8,
  openDelay = 240,
  closeDelay = 180,
  width = 280,
  role: roleProp,
  disabled = false,
  container,
  className,
  style,
}: AfHoverCardProps) {
  const cardId = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pointerInTriggerRef = useRef(false);
  const pointerInCardRef = useRef(false);
  const [instant, setInstant] = useState(false);

  const isContentMode = contentProp !== undefined;
  const triggerNode = isContentMode ? children : triggerProp;
  const cardBody = isContentMode ? contentProp : children;

  const computedRole =
    roleProp !== undefined
      ? roleProp
      : typeof cardBody === "string" || typeof cardBody === "number"
        ? "tooltip"
        : undefined;

  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const resolvedSide = side ?? placement;
  const resolvedOpen = Boolean(!disabled && open);
  const { mounted, closing } = useExitTransition(resolvedOpen, 120);
  const { OverlayBranchScope, containsNode, hasOpenChild } = useOverlayBranch(cardRef, mounted);
  const { layer, place, ready } = useAnchoredPopover(mounted, triggerRef, cardRef, {
    align,
    preferredSide: resolvedSide,
    gap: offset,
    preserveNaturalWidth: true,
    container,
  });

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const forceCloseNow = useCallback(() => {
    clearTimers();
    pointerInTriggerRef.current = false;
    pointerInCardRef.current = false;
    lastHoverCardClosedAt = Date.now();
    setOpen(false);
  }, [clearTimers, setOpen]);

  useEffect(() => {
    if (!resolvedOpen) {
      if (activeHoverCardCloser === forceCloseNow) {
        activeHoverCardCloser = null;
      }
      return;
    }
    if (activeHoverCardCloser && activeHoverCardCloser !== forceCloseNow) {
      activeHoverCardCloser();
    }
    activeHoverCardCloser = forceCloseNow;
    return () => {
      if (activeHoverCardCloser === forceCloseNow) {
        activeHoverCardCloser = null;
      }
    };
  }, [forceCloseNow, resolvedOpen]);

  const scheduleOpen = useCallback(() => {
    if (disabled) return;
    clearTimers();
    const hasPeerOpen = Boolean(activeHoverCardCloser && activeHoverCardCloser !== forceCloseNow);
    const warmWindow = hasPeerOpen || Date.now() - lastHoverCardClosedAt < 320;
    const delay = warmWindow ? 0 : Math.max(0, openDelay);
    if (delay === 0) {
      if (hasPeerOpen) activeHoverCardCloser?.();
      setInstant(warmWindow);
      setOpen(true);
      return;
    }
    setInstant(false);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpen(true);
    }, delay);
  }, [clearTimers, disabled, forceCloseNow, openDelay, setOpen]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    if (closeDelay <= 0) {
      lastHoverCardClosedAt = Date.now();
      setOpen(false);
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (pointerInTriggerRef.current || pointerInCardRef.current) return;
      lastHoverCardClosedAt = Date.now();
      setOpen(false);
    }, closeDelay);
  }, [clearTimers, closeDelay, setOpen]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !hasOpenChild()) {
        clearTimers();
        lastHoverCardClosedAt = Date.now();
        setOpen(false);
      }
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || containsNode(target)) return;
      clearTimers();
      pointerInTriggerRef.current = false;
      pointerInCardRef.current = false;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [clearTimers, containsNode, hasOpenChild, mounted, setOpen]);

  const triggerProps = isValidElement(triggerNode) ? (triggerNode.props as Record<string, unknown>) : {};
  const existingDescribedBy =
    typeof triggerProps["aria-describedby"] === "string" ? triggerProps["aria-describedby"] : undefined;
  const mergedDescribedBy =
    existingDescribedBy ?? (computedRole === "tooltip" && resolvedOpen ? cardId : computedRole === "tooltip" ? cardId : undefined);

  const enhancedTrigger = isValidElement(triggerNode)
    ? cloneElement(triggerNode as ReactElement<Record<string, unknown>>, {
        ref: composeRefs(triggerRef, (triggerNode as ReactElement & { ref?: Ref<HTMLElement> }).ref),
        ...(mergedDescribedBy ? { "aria-describedby": mergedDescribedBy } : {}),
        onPointerEnter: (event: PointerEvent<HTMLElement>) => {
          (triggerProps.onPointerEnter as ((e: PointerEvent<HTMLElement>) => void) | undefined)?.(event);
          if (event.pointerType === "touch") return;
          pointerInTriggerRef.current = true;
          scheduleOpen();
        },
        onPointerLeave: (event: PointerEvent<HTMLElement>) => {
          (triggerProps.onPointerLeave as ((e: PointerEvent<HTMLElement>) => void) | undefined)?.(event);
          if (event.pointerType === "touch") return;
          pointerInTriggerRef.current = false;
          if (!pointerInCardRef.current) {
            scheduleClose();
          }
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          (triggerProps.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
          scheduleOpen();
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          (triggerProps.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
          if (pointerInCardRef.current || pointerInTriggerRef.current) return;
          const next = event.relatedTarget as Node | null;
          if (next && containsNode(next)) return;
          scheduleClose();
        },
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
          (triggerProps.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
          if (event.key === "Escape" && open) {
            clearTimers();
            setOpen(false);
          }
        },
      })
    : (
        <span
          ref={triggerRef as Ref<HTMLSpanElement>}
          className="af-pop-anchor"
          onPointerEnter={(event) => {
            if (event.pointerType === "touch") return;
            pointerInTriggerRef.current = true;
            scheduleOpen();
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "touch") return;
            pointerInTriggerRef.current = false;
            if (!pointerInCardRef.current) scheduleClose();
          }}
        >
          {triggerNode}
        </span>
      );

  const cssWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <>
      {enhancedTrigger}
      {mounted && layer
        ? createPortal(
            <OverlayBranchScope>
              <div
                ref={cardRef}
                id={cardId}
                role={computedRole}
                className={cn("af-pop af-hovercard", className)}
                data-af-overlay="true"
                data-side={place?.side ?? resolvedSide}
                data-align={align}
                data-ready={ready || undefined}
                data-closing={closing || undefined}
                data-instant={instant || undefined}
                style={
                  place
                    ? ({
                        left: place.left,
                        top: place.top,
                        width: cssWidth,
                        maxWidth: `min(${cssWidth}, ${place.maxWidth}px)`,
                        maxHeight: place.maxHeight,
                        transformOrigin: place.origin,
                        ...style,
                      } as CSSProperties)
                    : {
                        visibility: "hidden",
                        left: 0,
                        top: 0,
                        width: cssWidth,
                        ...style,
                      }
                }
                onPointerEnter={(event) => {
                  if (event.pointerType === "touch") return;
                  pointerInCardRef.current = true;
                  clearTimers();
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "touch") return;
                  pointerInCardRef.current = false;
                  if (!pointerInTriggerRef.current) {
                    scheduleClose();
                  }
                }}
                onBlur={(event) => {
                  if (pointerInCardRef.current || pointerInTriggerRef.current) return;
                  const next = event.relatedTarget as Node | null;
                  if (next && (triggerRef.current?.contains(next) || containsNode(next))) return;
                  scheduleClose();
                }}
              >
                {cardBody}
              </div>
            </OverlayBranchScope>,
            layer,
          )
        : null}
    </>
  );
}
