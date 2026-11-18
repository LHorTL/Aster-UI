import {
  isValidElement,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  AfSlot,
  cn,
  useAnchoredPopover,
  useControllableState,
  useExitTransition,
  useIsomorphicLayoutEffect,
  useOverlayBranch,
  type AfPopoverSide,
} from "../../primitives";

export type AfPopoverPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "leftTop"
  | "leftBottom"
  | "rightTop"
  | "rightBottom";

type AfPopoverSharedProps = {
  /** 正交轴对齐方式。 */
  align?: "start" | "center" | "end";
  /** 首选展开方向，默认 bottom；空间不足时自动翻转。 */
  preferredSide?: AfPopoverSide;
  /** `preferredSide` 的简写别名。 */
  side?: AfPopoverSide;
  /** 复合方向简写（如 `"bottomRight"` 自动推导 `side="bottom"` + `align="end"`）。 */
  placement?: AfPopoverPosition;
  /** 与锚点间距（px），默认 6。 */
  gap?: number;
  /** `gap` 的语义别名（affectUI API 对齐）。 */
  offset?: number;
  /** 可选结构化标题（渲染 `.af-pop__head` 并自动关联 `aria-labelledby`）。 */
  title?: ReactNode;
  /** 可选结构化副标题/说明（自动关联 `aria-describedby`）。 */
  description?: ReactNode;
  /** 可选指定浮层宽度（数值按 px 处理）。 */
  width?: number | string;
  /** 打开后是否将焦点移入浮层内首个可交互元素。 */
  focusOnOpen?: boolean;
  /** 移除默认边框、背景、圆角与阴影（完全自定义卡片壳体时使用）。 */
  unstyled?: boolean;
  /** 关闭回调（点击外部或按 Escape 时触发）。 */
  onClose?: () => void;
  /** 额外类名。 */
  className?: string;
  /** 浮层额外类名别名。 */
  overlayClassName?: string;
  /** 额外内联样式。 */
  style?: CSSProperties;
  /** 元素 id（供 aria-controls 关联）。 */
  id?: string;
  /** 无障碍名称。 */
  label?: string;
  /** 浮层内键盘事件。 */
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  /** 浮层内容。 */
  children?: ReactNode;
  /** 浮层宽度严格等于锚点宽度。 */
  matchAnchorWidth?: boolean;
  /** 保持浮层自身自然宽度，不强行撑到锚点同宽。 */
  preserveNaturalWidth?: boolean;
  /** 去除浮层默认内边距（适合菜单 / 复合选择器）。 */
  flush?: boolean;
  /** 是否启用退场淡出动画。 */
  animateExit?: boolean;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
};

/** 底层受控锚点浮层模式（供 Select / Menu 等原语使用，100% 向后兼容）。 */
export type AfPopoverAnchoredProps = AfPopoverSharedProps & {
  trigger?: undefined;
  anchor?: undefined;
  /** 是否打开。 */
  open: boolean;
  /** 锚点元素，位置实时跟随它。 */
  anchorRef: RefObject<HTMLElement | null>;
  /** 无障碍 role。 */
  role?: string;
  /** 点击外部时关闭。 */
  onPointerDownOutside?: () => void;
  /** 按下 Escape 键时关闭。 */
  onEscapeKeyDown?: () => void;
};

/** 父容器或显式 `anchor` 锚定模式（affectUI `<Popover open onClose>` 直挂触发容器内部或传 `anchor={ref}`）。 */
export type AfPopoverParentProps = AfPopoverSharedProps & {
  trigger?: undefined;
  anchorRef?: undefined;
  /** 显式锚点 ref；省略时自动锚定所在父元素。 */
  anchor?: RefObject<HTMLElement | null>;
  /** 是否打开。 */
  open: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 无障碍 role，默认 `"dialog"`。 */
  role?: string;
  /** 点击外部时回调。 */
  onPointerDownOutside?: () => void;
  /** 按下 Escape 键时回调。 */
  onEscapeKeyDown?: () => void;
};

/** 高阶自包含触发器模式：直接传入 `trigger` 即可获得受控/非受控开合、Escape 关闭与焦点归还。 */
export type AfPopoverTriggerProps = AfPopoverSharedProps & {
  /** 触发器元素或 render-prop。 */
  trigger: ReactNode | ((state: { open: boolean; toggle: () => void; close: () => void }) => ReactNode);
  anchorRef?: undefined;
  anchor?: undefined;
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 无障碍 role，默认 `"dialog"`。 */
  role?: string;
  /** 点击外部附加回调。 */
  onPointerDownOutside?: () => void;
};

export type AfPopoverProps = AfPopoverAnchoredProps | AfPopoverParentProps | AfPopoverTriggerProps;

function isTriggerPopover(props: AfPopoverProps): props is AfPopoverTriggerProps {
  return props.trigger !== undefined;
}

function isExplicitAnchorRefPopover(props: AfPopoverProps): props is AfPopoverAnchoredProps {
  return !isTriggerPopover(props) && props.anchorRef !== undefined;
}

/**
 * 渲染到统一浮层层的锚定弹出面板：
 * - 底层模式（传入 `anchorRef`）：供 Select / Menu 等复合控件精确驱动；
 * - 父元素/anchor 模式（传入 `open` + `onClose` / `anchor`）：自动锚定父节点或指定 ref；
 * - 高阶触发模式（传入 `trigger`）：开箱支持点击切换、受控/非受控、四向自动翻转、结构化标题头、Escape 关闭与焦点归还。
 */
export function AfPopover(props: AfPopoverProps) {
  const isTriggerMode = isTriggerPopover(props);
  const isParentMode = !isTriggerMode && !isExplicitAnchorRefPopover(props);
  const triggerAnchorRef = useRef<HTMLElement>(null);
  const parentProbeRef = useRef<HTMLSpanElement>(null);
  const resolvedParentRef = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const titleId = `${autoId}-title`;
  const descId = `${autoId}-desc`;

  const [triggerOpen, setTriggerOpen] = useControllableState<boolean>({
    value: isTriggerPopover(props) ? props.open : undefined,
    defaultValue: isTriggerPopover(props) ? (props.defaultOpen ?? false) : false,
    onChange: isTriggerPopover(props) ? props.onOpenChange : undefined,
  });

  useIsomorphicLayoutEffect(() => {
    if (!isParentMode) return;
    resolvedParentRef.current =
      (props as AfPopoverParentProps).anchor?.current ?? parentProbeRef.current?.parentElement ?? null;
  });

  const open: boolean = isTriggerPopover(props) ? triggerOpen : props.open;
  const anchorRef: RefObject<HTMLElement | null> = isTriggerPopover(props)
    ? triggerAnchorRef
    : isExplicitAnchorRefPopover(props)
      ? props.anchorRef
      : ((props as AfPopoverParentProps).anchor ?? resolvedParentRef);

  const placementSide: AfPopoverSide | undefined = props.placement
    ? props.placement.startsWith("top")
      ? "top"
      : props.placement.startsWith("bottom")
        ? "bottom"
        : props.placement.startsWith("left")
          ? "left"
          : "right"
    : undefined;
  const placementAlign: "start" | "center" | "end" | undefined = props.placement
    ? props.placement.endsWith("Left") || props.placement.endsWith("Top")
      ? "start"
      : props.placement.endsWith("Right") || props.placement.endsWith("Bottom")
        ? "end"
        : "center"
    : undefined;

  const align = props.align ?? placementAlign ?? "start";
  const resolvedSide = props.side ?? props.preferredSide ?? placementSide ?? "bottom";
  const gap = props.offset ?? props.gap ?? 6;
  const role = props.role ?? "dialog";
  const hasHeader = Boolean(props.title || props.description);
  const popId = props.id ?? (isTriggerMode || isParentMode ? autoId : undefined);
  const preserveNaturalWidth = props.preserveNaturalWidth ?? (isTriggerMode || isParentMode);
  const useExit = props.animateExit ?? true;

  // Keep exit <= 120ms so rapid Escape assertions and directional scale-out feel crisp
  const { mounted, closing } = useExitTransition(open, useExit ? 115 : 0);
  const lastChildrenRef = useRef<ReactNode>(props.children);
  if (open) {
    lastChildrenRef.current = props.children;
  } else if (!mounted) {
    lastChildrenRef.current = null;
  }
  const renderedChildren = closing ? (lastChildrenRef.current ?? props.children) : props.children;
  const outsideRef = useRef(props.onPointerDownOutside);
  outsideRef.current = props.onPointerDownOutside;
  const closeCallbackRef = useRef(props.onClose);
  closeCallbackRef.current = props.onClose;
  const parentOpenChangeRef = useRef(isParentMode ? (props as AfPopoverParentProps).onOpenChange : undefined);
  parentOpenChangeRef.current = isParentMode ? (props as AfPopoverParentProps).onOpenChange : undefined;
  const escapeRef = useRef(isTriggerPopover(props) ? undefined : props.onEscapeKeyDown);
  escapeRef.current = isTriggerPopover(props) ? undefined : props.onEscapeKeyDown;

  const { OverlayBranchScope, containsNode, hasOpenChild } = useOverlayBranch(popRef, mounted);
  const { layer, place, ready } = useAnchoredPopover(mounted, anchorRef, popRef, {
    align,
    preferredSide: resolvedSide,
    gap,
    matchWidth: props.matchAnchorWidth ?? false,
    preserveNaturalWidth,
    container: props.container,
  });

  const restoreAnchorFocus = (viaPointer: boolean) => {
    const host = anchorRef.current;
    if (!host) return;
    const target = host.matches("button, a, input, [tabindex]")
      ? host
      : (host.querySelector<HTMLElement>("button, a, input, [tabindex]") ?? host);
    try {
      (target as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
        preventScroll: true,
        focusVisible: !viaPointer,
      });
    } catch {
      target.focus({ preventScroll: true });
    }
  };

  const closeTriggerPopover = (restoreFocus = false, viaPointer = false) => {
    closeCallbackRef.current?.();
    if (isTriggerMode) {
      setTriggerOpen(false);
    } else if (isParentMode) {
      parentOpenChangeRef.current?.(false);
    }
    if (restoreFocus) {
      restoreAnchorFocus(viaPointer);
    }
  };

  useEffect(() => {
    if (!open || !ready || !props.focusOnOpen) return;
    const panel = popRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (first ?? panel).focus({ preventScroll: true });
  }, [open, ready, props.focusOnOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (containsNode(target) || (target && anchorRef.current?.contains(target))) return;
      outsideRef.current?.();
      closeCallbackRef.current?.();
      if (isTriggerMode) setTriggerOpen(false);
      else if (isParentMode) parentOpenChangeRef.current?.(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || hasOpenChild()) return;
      if (isTriggerMode) {
        event.preventDefault();
        event.stopPropagation();
        closeTriggerPopover(true, false);
      } else if (escapeRef.current || closeCallbackRef.current || parentOpenChangeRef.current) {
        event.stopPropagation();
        escapeRef.current?.();
        closeCallbackRef.current?.();
        parentOpenChangeRef.current?.(false);
        if (isParentMode) restoreAnchorFocus(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef, containsNode, hasOpenChild, isTriggerMode, isParentMode]);

  const resolvedWidth =
    props.width !== undefined
      ? typeof props.width === "number"
        ? `${props.width}px`
        : props.width
      : props.matchAnchorWidth
        ? place?.minWidth
        : undefined;

  const portalNode =
    mounted && layer
      ? createPortal(
          <OverlayBranchScope>
            <div
              ref={popRef}
              id={popId}
              className={cn("af-pop", props.overlayClassName, props.className)}
              role={role}
              tabIndex={props.focusOnOpen ? -1 : undefined}
              aria-label={props.label}
              aria-labelledby={!props.label && props.title ? titleId : undefined}
              aria-describedby={props.description ? descId : undefined}
              data-af-overlay="true"
              data-side={place?.side ?? resolvedSide}
              data-align={align}
              data-flush={props.flush || undefined}
              data-headed={hasHeader || undefined}
              data-unstyled={props.unstyled || undefined}
              data-ready={ready || undefined}
              data-closing={closing || undefined}
              onKeyDown={props.onKeyDown}
              style={
                place
                  ? ({
                      left: place.left,
                      top: place.top,
                      width: resolvedWidth,
                      minWidth: props.width !== undefined ? undefined : place.minWidth || undefined,
                      maxWidth: place.maxWidth,
                      transformOrigin: place.origin,
                      "--af-pop-max-h": `${place.maxHeight}px`,
                      ...props.style,
                    } as CSSProperties)
                  : { visibility: "hidden", left: 0, top: 0, width: resolvedWidth, ...props.style }
              }
            >
              {hasHeader ? (
                <div className="af-pop__head">
                  {props.title ? (
                    <div id={titleId} className="af-pop__title">
                      {props.title}
                    </div>
                  ) : null}
                  {props.description ? (
                    <div id={descId} className="af-pop__desc">
                      {props.description}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {hasHeader ? <div className="af-pop__body">{renderedChildren}</div> : renderedChildren}
            </div>
          </OverlayBranchScope>,
          layer,
        )
      : null;

  if (isExplicitAnchorRefPopover(props)) {
    return portalNode;
  }

  if (isParentMode) {
    return (
      <>
        {(props as AfPopoverParentProps).anchor ? null : (
          <span ref={parentProbeRef} style={{ display: "none" }} aria-hidden="true" />
        )}
        {portalNode}
      </>
    );
  }

  const toggle = () => {
    const next = !open;
    setTriggerOpen(next);
    if (!next) closeCallbackRef.current?.();
  };
  const close = () => closeTriggerPopover(true, false);
  const renderedTrigger =
    typeof props.trigger === "function" ? props.trigger({ open, toggle, close }) : props.trigger;

  return (
    <>
      {typeof props.trigger === "function" ? (
        <span ref={triggerAnchorRef as RefObject<HTMLSpanElement>} className="af-pop-anchor">
          {renderedTrigger}
        </span>
      ) : isValidElement(renderedTrigger) ? (
        <AfSlot
          ref={triggerAnchorRef}
          aria-haspopup={role === "listbox" || role === "menu" ? role : "dialog"}
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          onClick={() => toggle()}
        >
          {renderedTrigger}
        </AfSlot>
      ) : (
        <span
          ref={triggerAnchorRef as RefObject<HTMLSpanElement>}
          className="af-pop-anchor"
          onClick={() => toggle()}
        >
          {renderedTrigger}
        </span>
      )}
      {portalNode}
    </>
  );
}
