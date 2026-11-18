import {
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AfIcon } from "../../icons";
import {
  AfSlot,
  cn,
  composeRefs,
  useAfLayerContainer,
  useControllableState,
  useExitTransition,
  useOverlayBranch,
  useOverlayFocusTrap,
} from "../../primitives";
import { AfButton, type AfButtonProps } from "../controls/Button";
import { AfSpinner } from "../display/Spinner";
import {
  afModal,
  closeStaticModal,
  modalBus,
  type AfModalHandle,
  type AfModalStaticKind,
  type AfModalStaticOptions,
  type StaticModalListener,
  type StaticModalRecord,
} from "./modal-bus";

export { afModal, type AfModalHandle, type AfModalStaticKind, type AfModalStaticOptions };

export type AfModalSize = "sm" | "md" | "lg";

/** 弹窗属性（同时兼容受控 `open + onClose/onCancel`、内置确认页脚 `onOk + okText` 与触发器 `trigger + defaultOpen/onOpenChange`）。 */
export type AfModalProps = {
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调（Esc、点击遮罩、关闭或取消按钮）。 */
  onClose?: () => void;
  /** 取消回调（点击取消按钮、右上角关闭、遮罩或按 Escape 时触发）。 */
  onCancel?: () => void;
  /** 主确认按钮回调（未显式传 `footer` 时自动渲染确认/取消底栏；返回 Promise 时自动显示加载态）。 */
  onOk?: () => void | Promise<unknown>;
  /** 确认按钮文案，默认 `"确定"`。 */
  okText?: ReactNode;
  /** 取消按钮文案，默认 `"取消"`。 */
  cancelText?: ReactNode;
  /** 确认按钮受控加载态。 */
  confirmLoading?: boolean;
  /** 确认按钮附加属性（如 `variant="danger"`、`disabled`）。 */
  okButtonProps?: Partial<AfButtonProps>;
  /** 取消按钮附加属性。 */
  cancelButtonProps?: Partial<AfButtonProps>;
  /** 可选内联触发器元素或 render-prop。 */
  trigger?: ReactNode | ((state: { open: boolean; openModal: () => void; close: () => void }) => ReactNode);
  /** 标题（无标题自定义模态框可省略并配合 `aria-label`）。 */
  title?: ReactNode;
  /** 说明。 */
  description?: ReactNode;
  /** 正文。 */
  children?: ReactNode;
  /** 底部操作；传 `null` 或 `false` 时强制隐藏底栏。 */
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
  /** `closeOnEscape` 兼容别名。 */
  escClosable?: boolean;
  /** 关闭退场完成后卸载子节点（内置 `useExitTransition` 已默认退场后卸载）。 */
  destroyOnClose?: boolean;
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
  /** 遮罩附加类名。 */
  maskClassName?: string;
  /** 遮罩内联样式。 */
  maskStyle?: CSSProperties;
  /** 正文容器附加类名。 */
  bodyClassName?: string;
  /** 正文容器内联样式。 */
  bodyStyle?: CSSProperties;
  /** 正文容器附加 HTML 属性。 */
  bodyProps?: HTMLAttributes<HTMLDivElement>;
  /** 正文溢出模式。 */
  bodyOverflow?: "auto" | "hidden" | "visible";
  /** 正文自定义内边距。 */
  padding?: number | string;
  /** 面板加载态。 */
  loading?: boolean;
  /** 无可见标题时的对话框无障碍名称。 */
  "aria-label"?: string;
  /** 自定义关联标题元素 id。 */
  "aria-labelledby"?: string;
  /** 附加类名。 */
  className?: string;
  /** 面板内联样式。 */
  style?: CSSProperties;
};

/** 弹窗（Dialog / Modal）：遮罩淡入淡出，面板缩放去模糊，滚动正文自动浮现上下细分隔线，支持 `closeOnBackdrop={false}` 脉冲提示。 */
const AfModalBase = forwardRef<HTMLDivElement, AfModalProps>(function AfModal(
  {
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onClose,
    onCancel,
    onOk,
    okText,
    cancelText,
    confirmLoading = false,
    okButtonProps,
    cancelButtonProps,
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
    escClosable,
    initialFocus,
    autoFocus = true,
    contained = false,
    container,
    width,
    maskClassName,
    maskStyle,
    bodyClassName,
    bodyStyle,
    bodyProps,
    bodyOverflow,
    padding,
    loading = false,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledByProp,
    className,
    style,
  },
  forwardedRef,
) {
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
  const [okPending, setOkPending] = useState(false);
  const [scrollTopActive, setScrollTopActive] = useState(false);
  const [scrollBottomActive, setScrollBottomActive] = useState(false);

  const titleId = useId();
  const descId = useId();
  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 160);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, mounted);

  const showCloseButton = closeButton ?? closable;
  const allowBackdropClose = closeOnBackdrop ?? maskClosable;
  const allowEscapeClose = escClosable ?? closeOnEscape;
  const isConfirmBusy = Boolean(confirmLoading || okPending);

  const requestClose = () => {
    if (isConfirmBusy) return;
    setOpen(false);
    onCancel?.();
    onClose?.();
  };

  const handleOkClick = async () => {
    if (isConfirmBusy || !onOk) return;
    try {
      const maybePromise = onOk();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
        setOkPending(true);
        await maybePromise;
      }
    } finally {
      setOkPending(false);
    }
  };

  useOverlayFocusTrap({
    open,
    panelRef,
    container: resolvedContainer,
    onClose: requestClose,
    closeOnEscape: allowEscapeClose && !isConfirmBusy,
    shouldIgnoreEscape: () => isConfirmBusy || hasOpenChild(),
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
    resolvedBodyPadding !== undefined || bodyOverflow || bodyStyle || bodyProps?.style
      ? {
          ...(resolvedBodyPadding !== undefined ? { padding: resolvedBodyPadding } : null),
          ...(bodyOverflow ? { overflowY: bodyOverflow } : null),
          ...bodyProps?.style,
          ...bodyStyle,
        }
      : undefined;

  const resolvedWidth = width === undefined ? undefined : typeof width === "number" ? `${width}px` : width;
  const hasHeader = title !== undefined || description !== undefined || showCloseButton;
  const hasDefaultActions = footer === undefined && (onOk !== undefined || okText !== undefined || cancelText !== undefined);
  const resolvedFooter: ReactNode =
    footer === null || footer === false ? null : footer !== undefined ? (
      footer
    ) : hasDefaultActions ? (
      <>
        <AfButton
          variant="secondary"
          disabled={isConfirmBusy}
          {...cancelButtonProps}
          onClick={(event) => {
            cancelButtonProps?.onClick?.(event);
            if (!event.defaultPrevented) requestClose();
          }}
        >
          {cancelText ?? "取消"}
        </AfButton>
        <AfButton
          variant="primary"
          loading={isConfirmBusy}
          {...okButtonProps}
          onClick={(event) => {
            okButtonProps?.onClick?.(event);
            if (!event.defaultPrevented) void handleOkClick();
          }}
        >
          {okText ?? "确定"}
        </AfButton>
      </>
    ) : null;

  const modalNode =
    mounted && resolvedContainer
      ? createPortal(
          <OverlayBranchScope>
            <div
              className={cn("af-modal", maskClassName)}
              style={maskStyle}
              data-af-overlay="true"
              data-contained={contained || undefined}
              data-closing={closing || undefined}
              {...(closing ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
              onPointerDown={(event) => {
                pointerDownOutsideRef.current = !closing && !isConfirmBusy && event.target === event.currentTarget;
              }}
              onPointerUp={(event) => {
                const startedOutside = pointerDownOutsideRef.current;
                pointerDownOutsideRef.current = false;
                if (startedOutside && !closing && !isConfirmBusy && event.target === event.currentTarget) {
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
                aria-busy={loading || isConfirmBusy || undefined}
                role="dialog"
                aria-modal="true"
                aria-label={title === undefined ? ariaLabelProp : undefined}
                aria-labelledby={ariaLabelledByProp ?? (title !== undefined ? titleId : undefined)}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                ref={composeRefs(panelRef, forwardedRef)}
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
                {hasHeader ? (
                  <div className={cn("af-modal__head", showCloseButton && "af-modal__head--closable")}>
                    <div className="af-modal__titles">
                      {title !== undefined ? (
                        <h2 id={titleId} className="af-modal__title">
                          {title}
                        </h2>
                      ) : null}
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
                ) : null}
                {children ? (
                  <div
                    {...bodyProps}
                    ref={bodyRef}
                    className={cn("af-modal__body", bodyProps?.className, bodyClassName)}
                    style={mergedBodyStyle}
                  >
                    {children}
                  </div>
                ) : null}
                {resolvedFooter ? <div className="af-modal__foot">{resolvedFooter}</div> : null}
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
});

export type AfModalHostProps = {
  /** 可选指定承载全局命令式对话框的浮层容器（默认由顶层 `AsterThemeProvider` 注入 `.af-portal-root`）。 */
  container?: HTMLElement | null;
};

function StaticModalEntry({ item, container }: { item: StaticModalRecord; container: HTMLElement | null }) {
  const [busy, setBusy] = useState(false);
  const showCancel =
    item.kind === "confirm" || item.cancelText !== undefined || item.onCancel !== undefined;
  const confirmAction = item.onOk ?? item.onConfirm;
  const resolvedOkText = item.okText ?? item.confirmText ?? (showCancel ? "确定" : "知道了");
  const resolvedCancelText = item.cancelText ?? "取消";
  const defaultVariant: AfButtonProps["variant"] =
    item.tone === "danger" || item.kind === "error"
      ? "destructive"
      : item.tone === "accent"
        ? "accent"
        : "primary";

  const promoteContentToDesc =
    item.description === undefined &&
    (typeof item.content === "string" || typeof item.content === "number");
  const resolvedDesc = promoteContentToDesc ? item.content : item.description;
  const bodyNode = promoteContentToDesc ? undefined : item.content;

  const handleCancel = () => {
    if (busy) return;
    item.onCancel?.();
    closeStaticModal(item.id, false);
  };

  const handleConfirm = async () => {
    if (busy) return;
    if (!confirmAction) {
      closeStaticModal(item.id, true);
      return;
    }
    try {
      const maybePromise = confirmAction();
      let result: unknown = maybePromise;
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
        setBusy(true);
        result = await maybePromise;
      }
      if (result === false) return;
      closeStaticModal(item.id, true);
    } catch {
      // 异步校验或接口报错时保持弹窗打开以便用户重试或查看提示
    } finally {
      setBusy(false);
    }
  };

  const closeApi = {
    close: () => closeStaticModal(item.id, false),
    destroy: () => closeStaticModal(item.id, false),
  };

  const renderedFooter: ReactNode =
    typeof item.footer === "function" ? (
      item.footer(closeApi)
    ) : item.footer !== undefined ? (
      item.footer
    ) : (
      <>
        {showCancel ? (
          <AfButton
            data-autofocus
            variant="secondary"
            disabled={busy}
            {...item.cancelButtonProps}
            onClick={(event) => {
              item.cancelButtonProps?.onClick?.(event);
              if (!event.defaultPrevented) handleCancel();
            }}
          >
            {resolvedCancelText}
          </AfButton>
        ) : null}
        <AfButton
          data-autofocus={!showCancel ? true : undefined}
          variant={defaultVariant}
          loading={busy}
          {...item.okButtonProps}
          onClick={(event) => {
            item.okButtonProps?.onClick?.(event);
            if (!event.defaultPrevented) void handleConfirm();
          }}
        >
          {resolvedOkText}
        </AfButton>
      </>
    );

  return (
    <AfModalBase
      open={item.open}
      title={item.title}
      description={resolvedDesc}
      width={item.width ?? 420}
      maskClosable={item.maskClosable ?? false}
      maskClassName={item.maskClassName}
      className={cn("af-alert-dialog__panel", item.className)}
      container={container}
      closeOnEscape={!busy}
      onClose={handleCancel}
      footer={renderedFooter}
    >
      {bodyNode}
    </AfModalBase>
  );
}

/** 命令式对话框宿主容器：由顶层 `AsterThemeProvider` 自动挂载，也可按需放置在独立子树内。 */
export function AfModalHost({ container }: AfModalHostProps = {}) {
  const [items, setItems] = useState<StaticModalRecord[]>(() => [...modalBus.queue]);
  const resolvedContainer = useAfLayerContainer(container);

  useEffect(() => {
    const onUpdate: StaticModalListener = (next) => setItems(next);
    modalBus.listeners.add(onUpdate);
    setItems([...modalBus.queue]);
    return () => {
      modalBus.listeners.delete(onUpdate);
    };
  }, []);

  if (!resolvedContainer || items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <StaticModalEntry key={item.id} item={item} container={resolvedContainer} />
      ))}
    </>
  );
}

/** 弹窗复合组件：支持声明式 `<AfModal />` 与命令式 `AfModal.confirm / info / success / warning / error`。 */
export const AfModal = /* @__PURE__ */ Object.assign(AfModalBase, afModal);

export type AfDialogProps = AfModalProps;
export const AfDialog = AfModal;
