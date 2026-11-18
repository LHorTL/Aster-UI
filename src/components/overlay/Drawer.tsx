import {
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AfIcon } from "../../icons";
import {
  AfSlot,
  cn,
  useAfLayerContainer,
  useControllableState,
  useExitTransition,
  useOverlayBranch,
  useOverlayFocusTrap,
} from "../../primitives";
import { AfSpinner } from "../display/Spinner";

/** 抽屉弹出方向。 */
export type AfDrawerPlacement = "right" | "left" | "bottom";

/** 抽屉 / Sheet 属性。 */
export type AfDrawerProps = {
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调（Esc、点击遮罩、关闭按钮）。 */
  onClose?: () => void;
  /** 可选内联触发器元素或 render-prop。 */
  trigger?: ReactNode | ((state: { open: boolean; openDrawer: () => void; close: () => void }) => ReactNode);
  /** 标题。 */
  title: ReactNode;
  /** 说明。 */
  description?: ReactNode;
  /** 标题栏右侧附加操作槽（位于关闭按钮左侧）。 */
  extra?: ReactNode;
  /** 正文；超出高度时独立滚动，标题与底部操作保持不动。 */
  children?: ReactNode;
  /** 底部常驻操作区。 */
  footer?: ReactNode;
  /** 弹出方向，默认 right。 */
  placement?: AfDrawerPlacement;
  /** `placement` 的语义别名（affectUI Sheet API 对齐）。 */
  side?: AfDrawerPlacement;
  /** 是否显示右上角关闭按钮，默认 true。 */
  closable?: boolean;
  /** `closable` 别名。 */
  closeButton?: boolean;
  /** 关闭按钮无障碍名称。 */
  closeLabel?: string;
  /** 点击遮罩是否关闭，默认 true。 */
  maskClosable?: boolean;
  /** `maskClosable` 别名。 */
  closeOnBackdrop?: boolean;
  /** 按下 Escape 是否关闭，默认 true。 */
  closeOnEscape?: boolean;
  /** 关闭退场完成后卸载子节点（内置 `useExitTransition` 已默认退场后卸载）。 */
  destroyOnClose?: boolean;
  /** 限制在局部容器内展示。 */
  contained?: boolean;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
  /** 尺寸档位（`sm=360px` / `md=460px` / `lg=640px`）或自定义宽度/高度长度。 */
  size?: "sm" | "md" | "lg" | number | string;
  /** 左右抽屉宽度（px 或 CSS 长度），默认 420。 */
  width?: number | string;
  /** 底部抽屉高度（px 或 CSS 长度），仅在 placement="bottom" 时生效。 */
  height?: number | string;
  /** 遮罩附加类名（历史宿主迁移兼容契约）。 */
  maskClassName?: string;
  /** 正文容器附加类名。 */
  bodyClassName?: string;
  /** 正文容器内联样式。 */
  bodyStyle?: CSSProperties;
  /** 正文溢出滚动策略。 */
  bodyOverflow?: "auto" | "hidden" | "visible";
  /** 面板加载态。 */
  loading?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 面板内联样式。 */
  style?: CSSProperties;
};

/**
 * 悬浮圆角抽屉（Drawer / Sheet）：
 * - 支持 right / left / bottom 三个方向平滑滑入与对应方向滑出退场；
 * - 正文滚动时头部与底部自动浮现动态细分隔线；
 * - 支持遮罩按下+释放防误关与 `closeOnBackdrop={false}` 脉冲提示。
 */
export function AfDrawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClose,
  trigger,
  title,
  description,
  extra,
  children,
  footer,
  placement = "right",
  side,
  closable = true,
  closeButton,
  closeLabel = "Close",
  maskClosable = true,
  closeOnBackdrop,
  closeOnEscape = true,
  contained = false,
  container,
  size,
  width,
  height,
  maskClassName,
  bodyClassName,
  bodyStyle,
  bodyOverflow,
  loading = false,
  className,
  style,
}: AfDrawerProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const resolvedPlacement = side ?? placement;
  const showCloseButton = closeButton ?? closable;
  const allowBackdropClose = closeOnBackdrop ?? maskClosable;

  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);
  const [nudging, setNudging] = useState(false);
  const [scrollTopActive, setScrollTopActive] = useState(false);
  const [scrollBottomActive, setScrollBottomActive] = useState(false);

  const titleId = useId();
  const descId = useId();
  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 180);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, mounted);

  const requestClose = () => {
    setOpen(false);
    onClose?.();
  };

  useOverlayFocusTrap({
    open,
    panelRef,
    container: resolvedContainer,
    onClose: requestClose,
    closeOnEscape,
    shouldIgnoreEscape: hasOpenChild,
  });

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current !== null) window.clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      setScrollTopActive(false);
      setScrollBottomActive(false);
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const syncScrollHairlines = () => {
      setScrollTopActive(el.scrollTop > 1);
      setScrollBottomActive(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };
    syncScrollHairlines();
    el.addEventListener("scroll", syncScrollHairlines, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncScrollHairlines) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", syncScrollHairlines);
      ro?.disconnect();
    };
  }, [mounted, children]);

  const triggerNudge = () => {
    if (nudgeTimerRef.current !== null) window.clearTimeout(nudgeTimerRef.current);
    setNudging(false);
    requestAnimationFrame(() => {
      setNudging(true);
      nudgeTimerRef.current = window.setTimeout(() => {
        nudgeTimerRef.current = null;
        setNudging(false);
      }, 190);
    });
  };

  const sizePresetPx = size === "sm" ? "360px" : size === "md" ? "460px" : size === "lg" ? "640px" : undefined;
  const fallbackSize =
    sizePresetPx ?? (size === undefined ? undefined : typeof size === "number" ? `${size}px` : size);
  const rawWidth = width ?? (resolvedPlacement !== "bottom" ? fallbackSize : undefined);
  const rawHeight = height ?? (resolvedPlacement === "bottom" ? fallbackSize : undefined);
  const resolvedWidth = rawWidth === undefined ? undefined : typeof rawWidth === "number" ? `${rawWidth}px` : rawWidth;
  const resolvedHeight =
    rawHeight === undefined ? undefined : typeof rawHeight === "number" ? `${rawHeight}px` : rawHeight;
  const mergedBodyStyle: CSSProperties | undefined =
    bodyOverflow || bodyStyle
      ? {
          ...(bodyOverflow ? { overflowY: bodyOverflow } : null),
          ...bodyStyle,
        }
      : undefined;

  const panelSizeStyle: CSSProperties | undefined =
    resolvedPlacement === "bottom"
      ? resolvedHeight
        ? { height: resolvedHeight, maxHeight: "calc(100% - 16px)", ...style }
        : style
      : resolvedWidth
        ? { width: resolvedWidth, maxWidth: "calc(100% - 16px)", ...style }
        : style;

  const drawerNode =
    mounted && resolvedContainer
      ? createPortal(
          <OverlayBranchScope>
            <div
              className={cn("af-drawer", maskClassName)}
              data-af-drawer
              data-af-overlay="true"
              data-contained={contained || undefined}
              data-placement={resolvedPlacement}
              data-closing={closing || undefined}
              {...(closing ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
              onPointerDown={(event) => {
                pointerDownOutsideRef.current = !closing && event.target === event.currentTarget;
              }}
              onPointerUp={(event) => {
                const startedOutside = pointerDownOutsideRef.current;
                pointerDownOutsideRef.current = false;
                if (startedOutside && !closing && event.target === event.currentTarget) {
                  if (allowBackdropClose) requestClose();
                  else triggerNudge();
                }
              }}
            >
              <aside
                className={cn("af-drawer__panel", className)}
                data-placement={resolvedPlacement}
                data-closing={closing || undefined}
                data-loading={loading || undefined}
                data-nudge={nudging ? "true" : undefined}
                data-scroll-top={scrollTopActive ? "true" : undefined}
                data-scroll-bottom={scrollBottomActive ? "true" : undefined}
                aria-busy={loading || undefined}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                ref={panelRef}
                style={panelSizeStyle}
              >
                <header className="af-drawer__head">
                  <div className="af-drawer__titles">
                    <h2 id={titleId} className="af-drawer__title">
                      {title}
                    </h2>
                    {description ? (
                      <p id={descId} className="af-drawer__desc">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  {extra ? <div className="af-drawer__extra">{extra}</div> : null}
                  {showCloseButton ? (
                    <button
                      type="button"
                      className="af-drawer__close"
                      aria-label={closeLabel}
                      onClick={requestClose}
                    >
                      <AfIcon name="x" size={14} />
                    </button>
                  ) : null}
                </header>
                <div ref={bodyRef} className={cn("af-drawer__body", bodyClassName)} style={mergedBodyStyle}>
                  {children}
                </div>
                {footer ? <footer className="af-drawer__foot">{footer}</footer> : null}
                {loading ? (
                  <div className="af-drawer__loading" aria-live="polite">
                    <AfSpinner size={18} />
                  </div>
                ) : null}
              </aside>
            </div>
          </OverlayBranchScope>,
          resolvedContainer,
        )
      : null;

  if (trigger === undefined) {
    return drawerNode;
  }

  const openDrawer = () => setOpen(true);
  const renderedTrigger =
    typeof trigger === "function" ? trigger({ open, openDrawer, close: requestClose }) : trigger;

  return (
    <>
      {typeof trigger === "function" ? (
        renderedTrigger
      ) : isValidElement(renderedTrigger) ? (
        <AfSlot aria-haspopup="dialog" aria-expanded={open} onClick={openDrawer}>
          {renderedTrigger}
        </AfSlot>
      ) : (
        <span onClick={openDrawer}>{renderedTrigger}</span>
      )}
      {drawerNode}
    </>
  );
}

export type AfSheetProps = AfDrawerProps;
export const AfSheet = AfDrawer;
