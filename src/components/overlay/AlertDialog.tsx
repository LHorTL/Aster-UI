import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type Context,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AfSlot,
  cn,
  useAfLayerContainer,
  useControllableState,
  useExitTransition,
  useIsomorphicLayoutEffect,
  useOverlayBranch,
  useOverlayFocusTrap,
} from "../../primitives";
import { AfButton } from "../controls/Button";

export type AfAlertDialogTone = "danger" | "primary" | "accent";

/** 确认警示对话框属性。 */
export type AfAlertDialogProps = {
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调（取消或操作完成后触发）。 */
  onClose?: () => void;
  /** 可选内联触发器元素或 render-prop。 */
  trigger?: ReactNode | ((state: { open: boolean; openDialog: () => void; close: () => void }) => ReactNode);
  /** 确认回调；若返回 Promise 则自动在确认按钮上展示加载态并在完成后关闭。 */
  onConfirm: () => void | Promise<unknown>;
  /** 取消回调。 */
  onCancel?: () => void;
  /** 标题。 */
  title: ReactNode;
  /** 风险或影响说明。 */
  description?: ReactNode;
  /** 可选补充正文（如输入二次确认文本）。 */
  children?: ReactNode;
  /** 确认按钮文案，默认 `"确认"`。 */
  confirmText?: ReactNode;
  /** 取消按钮文案，默认 `"取消"`。 */
  cancelText?: ReactNode;
  /** 主动作语义色调，默认 `"danger"`（高风险确认）。 */
  tone?: AfAlertDialogTone;
  /** 外部受控加载态。 */
  loading?: boolean;
  /** 禁用确认按钮（例如未输入确认词）。 */
  confirmDisabled?: boolean;
  /** 点击遮罩是否允许取消关闭，默认 false（遵循 WAI-ARIA alertdialog 规范防止误触）。 */
  maskClosable?: boolean;
  /** `maskClosable` 的语义别名。 */
  closeOnBackdrop?: boolean;
  /** 按下 Escape 是否允许取消关闭，默认 true。 */
  closeOnEscape?: boolean;
  /** 限制在相对定位父容器内部展示。 */
  contained?: boolean;
  /** 可选指定挂载容器。 */
  container?: HTMLElement | null;
  /** 面板宽度（px），默认 400。 */
  width?: number;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/**
 * 危险或关键操作二次确认对话框（`role="alertdialog"`）：
 * - 默认将初始焦点（`data-autofocus`）置于安全的「取消」按钮上，防止用户惯性回车误删数据；
 * - 遮罩采用按下+释放双端防误触守卫，默认 `maskClosable=false` 时点击外部仅做轻微脉冲提示；
 * - 原生支持异步 `onConfirm` Promise 自动进入加载防重态。
 */
export function AfAlertDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClose,
  trigger,
  onConfirm,
  onCancel,
  title,
  description,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  loading: loadingProp,
  confirmDisabled = false,
  maskClosable = false,
  closeOnBackdrop,
  closeOnEscape = true,
  contained = false,
  container,
  width = 400,
  className,
  style,
}: AfAlertDialogProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);
  const titleId = useId();
  const descId = useId();
  const [pending, setPending] = useState(false);
  const [nudging, setNudging] = useState(false);
  const isBusy = Boolean(loadingProp || pending);
  const allowBackdropClose = closeOnBackdrop ?? maskClosable;

  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 160);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, mounted);

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current !== null) window.clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  const closeDialog = () => {
    setOpen(false);
    onClose?.();
  };

  const triggerCancel = () => {
    if (isBusy) return;
    onCancel?.();
    closeDialog();
  };

  useOverlayFocusTrap({
    open,
    panelRef,
    container: resolvedContainer,
    onClose: triggerCancel,
    closeOnEscape: closeOnEscape && !isBusy,
    shouldIgnoreEscape: () => isBusy || hasOpenChild(),
  });

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

  const confirmVariant = tone === "danger" ? "destructive" : tone === "accent" ? "accent" : "primary";

  const handleConfirm = async () => {
    if (isBusy || confirmDisabled) return;
    try {
      const maybePromise = onConfirm();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
        setPending(true);
        await maybePromise;
      }
      setPending(false);
      closeDialog();
    } catch {
      setPending(false);
    }
  };

  const dialogNode =
    mounted && resolvedContainer
      ? createPortal(
          <OverlayBranchScope>
            <div
              className="af-modal af-alert-dialog"
              data-af-overlay="true"
              data-contained={contained || undefined}
              data-closing={closing || undefined}
              {...(closing ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
              onPointerDown={(event) => {
                pointerDownOutsideRef.current = !closing && !isBusy && event.target === event.currentTarget;
              }}
              onPointerUp={(event) => {
                const startedOutside = pointerDownOutsideRef.current;
                pointerDownOutsideRef.current = false;
                if (startedOutside && !closing && !isBusy && event.target === event.currentTarget) {
                  if (allowBackdropClose) triggerCancel();
                  else triggerNudge();
                }
              }}
            >
              <div
                ref={panelRef}
                className={cn("af-modal__panel af-alert-dialog__panel", className)}
                data-closing={closing || undefined}
                data-nudge={nudging ? "true" : undefined}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                style={{ width, maxWidth: "calc(100% - 32px)", ...style }}
              >
                <div className="af-modal__head">
                  <h2 id={titleId} className="af-modal__title">
                    {title}
                  </h2>
                  {description ? (
                    <p id={descId} className="af-modal__desc">
                      {description}
                    </p>
                  ) : null}
                </div>
                {children ? <div className="af-modal__body">{children}</div> : null}
                <div className="af-modal__foot">
                  <AfButton data-autofocus variant="secondary" disabled={isBusy} onClick={triggerCancel}>
                    {cancelText}
                  </AfButton>
                  <AfButton
                    variant={confirmVariant}
                    loading={isBusy}
                    disabled={confirmDisabled}
                    onClick={() => void handleConfirm()}
                  >
                    {confirmText}
                  </AfButton>
                </div>
              </div>
            </div>
          </OverlayBranchScope>,
          resolvedContainer,
        )
      : null;

  if (trigger === undefined) {
    return dialogNode;
  }

  const openDialog = () => setOpen(true);
  const renderedTrigger =
    typeof trigger === "function" ? trigger({ open, openDialog, close: triggerCancel }) : trigger;

  return (
    <>
      {typeof trigger === "function" ? (
        renderedTrigger
      ) : isValidElement(renderedTrigger) ? (
        <AfSlot aria-haspopup="dialog" aria-expanded={open} onClick={openDialog}>
          {renderedTrigger}
        </AfSlot>
      ) : (
        <span onClick={openDialog}>{renderedTrigger}</span>
      )}
      {dialogNode}
    </>
  );
}

/** 命令式 `confirm()` 参数。 */
export type AfConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  tone?: AfAlertDialogTone;
  onConfirm?: () => void | Promise<unknown>;
};

export type AfConfirmFn = (options: AfConfirmOptions) => Promise<boolean>;

function getConfirmSingleton<T>(key: string, create: () => T): T {
  const sym = Symbol.for(key);
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = create();
  }
  return g[sym] as T;
}

const NOOP_CONFIRM: AfConfirmFn = () => Promise.resolve(false);

const ConfirmContext: Context<AfConfirmFn | null> = getConfirmSingleton(
  "aster-ui.AfConfirmContext.v1",
  () => createContext<AfConfirmFn | null>(null),
);

const hostConfirmStack = getConfirmSingleton<{ stack: AfConfirmFn[] }>("aster-ui.HostConfirmBridge.v1", () => ({
  stack: [],
}));

/** 读取命令式确认对话框钩子：`const confirm = useAfConfirm(); const ok = await confirm({ ... });` */
export function useAfConfirm(): AfConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return hostConfirmStack.stack[hostConfirmStack.stack.length - 1] ?? NOOP_CONFIRM;
}

export type AfConfirmProviderProps = {
  children: ReactNode;
  /** 可选指定挂载容器。 */
  container?: HTMLElement | null;
};

/** 命令式确认框宿主容器。 */
export function AfConfirmProvider(props: AfConfirmProviderProps) {
  const { children, container } = props;
  const [current, setCurrent] = useState<(AfConfirmOptions & { open: boolean }) | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<AfConfirmFn>((options) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setCurrent({ ...options, open: true });
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    hostConfirmStack.stack = [...hostConfirmStack.stack.filter((entry) => entry !== confirm), confirm];
    return () => {
      hostConfirmStack.stack = hostConfirmStack.stack.filter((entry) => entry !== confirm);
    };
  }, [confirm]);

  const settle = (confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setCurrent((prev) => (prev ? { ...prev, open: false } : null));
    resolve?.(confirmed);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current ? (
        <AfAlertDialog
          open={current.open}
          title={current.title}
          description={current.description}
          confirmText={current.confirmText}
          cancelText={current.cancelText}
          tone={current.tone}
          container={container}
          onCancel={() => settle(false)}
          onClose={() => {
            if (resolverRef.current) settle(false);
          }}
          onConfirm={async () => {
            await current.onConfirm?.();
            settle(true);
          }}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}
