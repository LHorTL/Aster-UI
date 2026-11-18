import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  cn,
  layoutRectOf,
  useAfLayerContainer,
  useExitTransition,
  useIsomorphicLayoutEffect,
} from "../../primitives";

export type AfTooltipSide = "top" | "bottom" | "left" | "right";
export type AfTooltipAlign = "start" | "center" | "end";

let lastTooltipClosedAt = 0;
let activeTooltipCloser: (() => void) | null = null;

/** Tooltip 属性。 */
export type AfTooltipProps = Omit<HTMLAttributes<HTMLSpanElement>, "title" | "content"> & {
  /** 提示文字。 */
  label?: ReactNode;
  /** label 的等价别名。 */
  content?: ReactNode;
  /** content 的等价别名。 */
  title?: ReactNode;
  /** 右侧快捷键提示。 */
  kbd?: string;
  /** `kbd` 的语义别名（affectUI API 对齐）。 */
  shortcut?: string;
  /** 方向。 */
  side?: AfTooltipSide;
  /** 正交轴对齐方式，默认 `"center"`。 */
  align?: AfTooltipAlign;
  /** 与触发器间距（px），默认 `6`。 */
  offset?: number;
  /** 方向别名，支持 topLeft 等细分名称并按主方向与对齐定位。 */
  placement?: "top" | "bottom" | "left" | "right" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  /** 悬浮出现延时，默认 260ms（300ms 热窗口内相邻切换为 0ms）。 */
  delay?: number;
  /** 离开关闭延时，默认 100ms。 */
  closeDelay?: number;
  /** 禁用提示。 */
  disabled?: boolean;
  /** 受控显示。 */
  open?: boolean;
  /** 非受控初始显示。 */
  defaultOpen?: boolean;
  /** 显示状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 气泡额外类名。 */
  className?: string;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根，避免被 overflow:hidden 裁切。 */
  container?: HTMLElement | null;
  children: ReactNode;
};

type TooltipCoords = {
  left: number;
  top: number;
  actualSide: AfTooltipSide;
  origin: string;
};

/**
 * 悬停/聚焦出现的小提示（affectUI 1:1 复刻）：
 * - 统一 Portal 渲染，支持四方向翻转、对齐偏移、2px 方向微移与 Esc 关闭；
 * - 300ms 相邻热窗口与单例协调：从相邻按钮滑过时零延迟跟随且跳过重复淡入动画（`data-instant`）；
 * - 触屏点击自动跳过，避免移动端悬停粘滞。
 */
export const AfTooltip = forwardRef<HTMLSpanElement, AfTooltipProps>(function AfTooltip(
  {
    label,
    content,
    title,
    kbd,
    shortcut,
    side = "top",
    align: alignProp,
    offset = 6,
    placement,
    delay = 260,
    closeDelay = 100,
    disabled,
    open,
    defaultOpen = false,
    onOpenChange,
    className,
    container,
    children,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...rest
  },
  forwardedRef,
) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [instant, setInstant] = useState(false);
  const [instantClose, setInstantClose] = useState(false);
  const timer = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const setTriggerNode = useCallback(
    (node: HTMLSpanElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const touchIgnoreRef = useRef(false);
  const tipId = useId();

  const text = content ?? title ?? label;
  const shortcutText = kbd ?? shortcut;
  const hasText = text !== undefined && text !== null && text !== "";

  const resolvedSide: AfTooltipSide = placement
    ? placement.startsWith("top")
      ? "top"
      : placement.startsWith("bottom")
        ? "bottom"
        : (placement as AfTooltipSide)
    : side;

  const resolvedAlign: AfTooltipAlign =
    alignProp ??
    (placement === "topLeft" || placement === "bottomLeft"
      ? "start"
      : placement === "topRight" || placement === "bottomRight"
        ? "end"
        : "center");

  const visible = Boolean(!disabled && hasText && (open ?? innerOpen));
  const { mounted, closing } = useExitTransition(visible, instant || instantClose ? 0 : 115);
  const layer = useAfLayerContainer(container);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const snapshotRef = useRef<{ text: ReactNode; shortcutText?: string }>({ text, shortcutText });
  if (visible && hasText) {
    snapshotRef.current = { text, shortcutText };
  }

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const setVisible = useCallback(
    (next: boolean) => {
      if (next) {
        setInstantClose(false);
      } else if (visible) {
        lastTooltipClosedAt = Date.now();
      }
      if (open === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, open, visible],
  );

  const forceCloseNow = useCallback(() => {
    clearTimer();
    lastTooltipClosedAt = Date.now();
    setInstantClose(true);
    if (open === undefined) setInnerOpen(false);
    onOpenChange?.(false);
  }, [clearTimer, onOpenChange, open]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!visible) {
      if (activeTooltipCloser === forceCloseNow) {
        activeTooltipCloser = null;
      }
      return;
    }
    if (activeTooltipCloser && activeTooltipCloser !== forceCloseNow) {
      activeTooltipCloser();
    }
    activeTooltipCloser = forceCloseNow;
    return () => {
      if (activeTooltipCloser === forceCloseNow) {
        activeTooltipCloser = null;
      }
    };
  }, [forceCloseNow, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearTimer();
        setVisible(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clearTimer, setVisible, visible]);

  useIsomorphicLayoutEffect(() => {
    if (!mounted || !layer) {
      setCoords(null);
      return;
    }
    if (!visible) return;
    const update = () => {
      const anchorEl = triggerRef.current;
      const bubbleEl = bubbleRef.current;
      if (!anchorEl || !bubbleEl) return;
      const layerRect = layer.getBoundingClientRect();
      const layerW = layer.offsetWidth || (typeof window !== "undefined" ? window.innerWidth : 1024);
      const layerH = layer.offsetHeight || (typeof window !== "undefined" ? window.innerHeight : 768);
      const anchor = layoutRectOf(anchorEl.getBoundingClientRect(), layer, layerRect);
      const bw = bubbleEl.offsetWidth || 80;
      const bh = bubbleEl.offsetHeight || 26;
      const gap = offset;
      const margin = 6;

      let actualSide: AfTooltipSide = resolvedSide;
      if (resolvedSide === "top" && anchor.top - gap - bh < margin && layerH - anchor.bottom - gap >= bh) {
        actualSide = "bottom";
      } else if (resolvedSide === "bottom" && anchor.bottom + gap + bh > layerH - margin && anchor.top - gap >= bh) {
        actualSide = "top";
      } else if (resolvedSide === "left" && anchor.left - gap - bw < margin && layerW - anchor.right - gap >= bw) {
        actualSide = "right";
      } else if (resolvedSide === "right" && anchor.right + gap + bw > layerW - margin && anchor.left - gap >= bw) {
        actualSide = "left";
      }

      const alignedHorizontal =
        resolvedAlign === "start"
          ? anchor.left
          : resolvedAlign === "end"
            ? anchor.right - bw
            : anchor.left + (anchor.width - bw) / 2;

      const alignedVertical =
        resolvedAlign === "start"
          ? anchor.top
          : resolvedAlign === "end"
            ? anchor.bottom - bh
            : anchor.top + (anchor.height - bh) / 2;

      const alignOriginX = resolvedAlign === "start" ? "left" : resolvedAlign === "end" ? "right" : "center";
      const alignOriginY = resolvedAlign === "start" ? "top" : resolvedAlign === "end" ? "bottom" : "center";

      let rawLeft = alignedHorizontal;
      let rawTop = anchor.top - gap - bh;
      let origin = `bottom ${alignOriginX}`;

      if (actualSide === "bottom") {
        rawTop = anchor.bottom + gap;
        origin = `top ${alignOriginX}`;
      } else if (actualSide === "left") {
        rawLeft = anchor.left - gap - bw;
        rawTop = alignedVertical;
        origin = `${alignOriginY} right`;
      } else if (actualSide === "right") {
        rawLeft = anchor.right + gap;
        rawTop = alignedVertical;
        origin = `${alignOriginY} left`;
      }

      const left = Math.min(Math.max(rawLeft, margin), Math.max(margin, layerW - bw - margin));
      const top = Math.min(Math.max(rawTop, margin), Math.max(margin, layerH - bh - margin));
      setCoords((prev) =>
        prev && prev.left === left && prev.top === top && prev.actualSide === actualSide && prev.origin === origin
          ? prev
          : { left, top, actualSide, origin },
      );
    };

    update();
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [mounted, visible, layer, resolvedSide, resolvedAlign, offset, text, shortcutText]);

  const handleOpenTrigger = () => {
    if (disabled || open !== undefined) return;
    clearTimer();
    const hasPeerOpen = Boolean(activeTooltipCloser && activeTooltipCloser !== forceCloseNow);
    const warmWindow = hasPeerOpen || Date.now() - lastTooltipClosedAt < 300;
    const waitMs = warmWindow ? 0 : Math.max(0, delay);
    if (waitMs === 0) {
      if (hasPeerOpen) activeTooltipCloser?.();
      setInstant(warmWindow);
      setVisible(true);
      return;
    }
    setInstant(false);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setVisible(true);
    }, waitMs);
  };

  return (
    <span
      {...rest}
      ref={setTriggerNode}
      className="af-tip"
      aria-describedby={visible ? tipId : undefined}
      data-side={coords?.actualSide ?? resolvedSide}
      data-visible={visible || undefined}
      data-disabled={disabled || undefined}
      onPointerDown={(event) => {
        touchIgnoreRef.current = event.pointerType === "touch";
        onPointerDown?.(event);
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType === "touch") {
          touchIgnoreRef.current = true;
          return;
        }
        touchIgnoreRef.current = false;
        handleOpenTrigger();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (event.pointerType === "touch" || disabled || open !== undefined) return;
        clearTimer();
        timer.current = window.setTimeout(() => setVisible(false), closeDelay);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (touchIgnoreRef.current || disabled || open !== undefined) return;
        clearTimer();
        const hasPeerOpen = Boolean(activeTooltipCloser && activeTooltipCloser !== forceCloseNow);
        const warmWindow = hasPeerOpen || Date.now() - lastTooltipClosedAt < 300;
        if (hasPeerOpen) activeTooltipCloser?.();
        setInstant(warmWindow);
        setVisible(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (disabled || open !== undefined) return;
        clearTimer();
        setVisible(false);
      }}
    >
      {children}
      {mounted && layer
        ? createPortal(
            <span
              ref={bubbleRef}
              id={tipId}
              className={cn("af-tip__bubble af-tip__bubble--portal", className)}
              role="tooltip"
              data-side={coords?.actualSide ?? resolvedSide}
              data-ready={coords ? "true" : undefined}
              data-instant={instant ? "true" : undefined}
              data-closing={closing ? "true" : undefined}
              onPointerEnter={(event) => {
                if (closing || event.pointerType === "touch" || open !== undefined) return;
                clearTimer();
              }}
              onPointerLeave={(event) => {
                if (closing || event.pointerType === "touch" || open !== undefined) return;
                clearTimer();
                timer.current = window.setTimeout(() => setVisible(false), closeDelay);
              }}
              style={
                coords
                  ? ({
                      left: coords.left,
                      top: coords.top,
                      transformOrigin: coords.origin,
                    } as CSSProperties)
                  : { visibility: "hidden", left: 0, top: 0 }
              }
            >
              {closing ? snapshotRef.current.text : text}
              {(closing ? snapshotRef.current.shortcutText : shortcutText) ? (
                <kbd className="af-kbd af-kbd--tip" aria-hidden="true">
                  {closing ? snapshotRef.current.shortcutText : shortcutText}
                </kbd>
              ) : null}
            </span>,
            layer,
          )
        : null}
    </span>
  );
});
