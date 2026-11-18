import {
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
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

export type AfModalSize = "sm" | "md" | "lg";

/** 弹窗属性（同时兼容受控 `open + onClose` 与触发器 `trigger + defaultOpen/onOpenChange`）。 */
export type AfModalProps = {
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调（Esc、点击遮罩、关闭或取消按钮）。 */
  onClose?: () => void;
  /** 可选内联触发器元素或 render-prop。 */
  trigger?: ReactNode | ((state: { open: boolean; openModal: () => void; close: () => void }) => ReactNode);
  /** 标题。 */
  title: ReactNode;
  /** 说明。 */
  description?: ReactNode;
  /** 正文。 */
  children?: ReactNode;
  /** 底部操作。 */
  footer?: ReactNode;
  /** 预设尺寸档位（sm=380px, md=440px, lg=560px）。 */
  size?: AfModalSize;
  /** 是否显示右上角关闭按钮，默认 false。 */
  closable?: boolean;
  /** `closable` 的语义别名（affectUI API 对齐）。 */
  closeButton?: boolean;
  /** 右上角关闭按钮无障碍标签，默认 `"关闭弹窗"`。 */
  closeLabel?: string;
  /** 点击遮罩是否关闭，默认 true。 */
  maskClosable?: boolean;
  /** `maskClosable` 的语义别名；设为 `false` 时点击遮罩会触发克制的回弹提醒脉冲。 */
  closeOnBackdrop?: boolean;
  /** 按下 Escape 是否关闭，默认 true。 */
  closeOnEscape?: boolean;
  /** 打开后优先聚焦的元素引用。 */
  initialFocus?: RefObject<HTMLElement | null>;
  /** 打开时是否自动聚焦首个控件，默认 true（舞台静态展开演示可设为 false 避免初始焦点环）。 */
  autoFocus?: boolean;
  /** 限制在相对定位父容器内部展示（舞台局部演示或分栏内嵌模态）。 */
  contained?: boolean;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
  /** 面板宽度（px 或 CSS 长度）。 */
  width?: number | string;
  /** 遮罩附加类名（历史宿主迁移兼容契约）。 */
  maskClassName?: string;
  /** 正文容器附加类名。 */
  bodyClassName?: string;
  /** 正文容器内联样式。 */
  bodyStyle?: CSSProperties;
  /** 正文溢出模式。 */
  bodyOverflow?: "auto" | "hidden" | "visible";
  /** 正文自定义内边距。 */
  padding?: number | string;
  /** 面板加载态。 */
  loading?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 面板内联样式。 */
  style?: CSSProperties;
};

/** 弹窗（Dialog / Modal）：遮罩淡入淡出，面板缩放去模糊，滚动正文自动浮现上下细分隔线，支持 `closeOnBackdrop={false}` 脉冲提示。 */
export function AfModal({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClose,
  trigger,
  title,
  description,
  children,
  footer,
  size,
  closable = false,
  closeButton,
  closeLabel = "Close",
  maskClosable = true,
  closeOnBackdrop,
  closeOnEscape = true,
  initialFocus,
  autoFocus = true,
  contained = false,
  container,
  width,
  maskClassName,
  bodyClassName,
  bodyStyle,
  bodyOverflow,
  padding,
  loading = false,
  className,
  style,
}: AfModalProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);
  const [nudging, setNudging] = useState(false);
  const [scrollTopActive, setScrollTopActive] = useState(false);
  const [scrollBottomActive, setScrollBottomActive] = useState(false);

  const titleId = useId();
  const descId = useId();
  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 160);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, mounted);

  const showCloseButton = closeButton ?? closable;
  const allowBackdropClose = closeOnBackdrop ?? maskClosable;

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
    if (!open || !initialFocus?.current) return;
    const frame = requestAnimationFrame(() => {
      initialFocus.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialFocus, open]);

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

  const resolvedBodyPadding = padding === undefined ? undefined : typeof padding === "number" ? `${padding}px` : padding;
  const mergedBodyStyle: CSSProperties | undefined =
    resolvedBodyPadding !== undefined || bodyOverflow || bodyStyle
      ? {
          ...(resolvedBodyPadding !== undefined ? { padding: resolvedBodyPadding } : null),
          ...(bodyOverflow ? { overflowY: bodyOverflow } : null),
          ...bodyStyle,
        }
      : undefined;

  const resolvedWidth = width === undefined ? undefined : typeof width === "number" ? `${width}px` : width;

  const modalNode =
    mounted && resolvedContainer
      ? createPortal(
          <OverlayBranchScope>
            <div
              className={cn("af-modal", maskClassName)}
              data-af-overlay="true"
              data-contained={contained || undefined}
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
              <div
                className={cn("af-modal__panel", className)}
                data-size={size}
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
                style={
                  resolvedWidth
                    ? { width: resolvedWidth, maxWidth: "calc(100% - 32px)", ...style }
                    : style
                }
              >
                {!autoFocus ? (
                  <span
                    tabIndex={-1}
                    data-autofocus
                    aria-hidden="true"
                    style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", outline: "none" }}
                  />
                ) : null}
                <div className={cn("af-modal__head", showCloseButton && "af-modal__head--closable")}>
                  <div className="af-modal__titles">
                    <h2 id={titleId} className="af-modal__title">
                      {title}
                    </h2>
                    {description ? (
                      <p id={descId} className="af-modal__desc">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  {showCloseButton ? (
                    <button
                      type="button"
                      className="af-modal__close"
                      aria-label={closeLabel}
                      onClick={requestClose}
                    >
                      <AfIcon name="x" size={14} />
                    </button>
                  ) : null}
                </div>
                {children ? (
                  <div ref={bodyRef} className={cn("af-modal__body", bodyClassName)} style={mergedBodyStyle}>
                    {children}
                  </div>
                ) : null}
                {footer ? <div className="af-modal__foot">{footer}</div> : null}
                {loading ? (
                  <div className="af-modal__loading" aria-live="polite">
                    <AfSpinner size={18} />
                  </div>
                ) : null}
              </div>
            </div>
          </OverlayBranchScope>,
          resolvedContainer,
        )
      : null;

  if (trigger === undefined) {
    return modalNode;
  }

  const openModal = () => setOpen(true);
  const renderedTrigger =
    typeof trigger === "function" ? trigger({ open, openModal, close: requestClose }) : trigger;

  return (
    <>
      {typeof trigger === "function" ? (
        renderedTrigger
      ) : isValidElement(renderedTrigger) ? (
        <AfSlot aria-haspopup="dialog" aria-expanded={open} onClick={openModal}>
          {renderedTrigger}
        </AfSlot>
      ) : (
        <span onClick={openModal}>{renderedTrigger}</span>
      )}
      {modalNode}
    </>
  );
}

export type AfDialogProps = AfModalProps;
export const AfDialog = AfModal;
