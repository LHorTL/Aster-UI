import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  clampPointToLayer,
  cn,
  useAfLayerContainer,
  useExitTransition,
  useIsomorphicLayoutEffect,
  useOverlayBranch,
} from "../../primitives";
import {
  AfMenuList,
  findMenuTypeaheadIndex,
  getMenuItemKey,
  getMenuSubItems,
  isActionableMenuItem,
  type AfActionableMenuItem,
  type AfMenuItem,
} from "../overlay/Menu";

/** 右键菜单项（完全兼容并共享 `AfMenuItem` 的分隔线、分组标题、复选、单选、右侧描线勾选与多级子菜单能力）。 */
export type AfContextMenuItem = AfMenuItem;

/** 右键菜单属性。 */
export type AfContextMenuProps = {
  /** 菜单项数组，或按实际右键命中的目标节点动态返回菜单项列表的函数。 */
  items: AfContextMenuItem[] | ((target: HTMLElement) => AfContextMenuItem[]);
  /** 选中回调（也可在单项上配置 `onSelect` / `onCheckedChange`）。 */
  onSelect?: (key: string) => void;
  /** 任意触发区域内容。 */
  children: ReactNode;
  /** 禁用后恢复浏览器原生右键菜单。 */
  disabled?: boolean;
  /** 面板最小宽度，默认 188。 */
  minWidth?: number;
  /** 可选指定固定面板宽度。 */
  width?: number | string;
  /** 顶部可选分组/上下文标题。 */
  title?: ReactNode;
  /** 菜单无障碍标签。 */
  "aria-label"?: string;
  /** 菜单面板额外类名。 */
  menuClassName?: string;
  /** 菜单开合变化回调，第二个参数返回触发时的目标元素（关闭时为 `null`）。 */
  onOpenChange?: (open: boolean, target: HTMLElement | null) => void;
  /** 可选指定浮层挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
};

function isNativeEditableTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  return Boolean(el.closest('input, textarea, [contenteditable="true"], [contenteditable=""]'));
}

function findHighlightTarget(target: HTMLElement, boundary: HTMLElement | null): HTMLElement | null {
  const row = target.closest<HTMLElement>(
    '[data-context-target], [role="row"], [role="listitem"], [role="treeitem"], li, tr, [tabindex]',
  );
  if (row && (!boundary || boundary.contains(row))) return row;
  if (boundary && boundary !== target && boundary.contains(target)) return target;
  return null;
}

/**
 * 桌面级上下文菜单（affectUI 1:1 复刻）：
 * - 支持静态或 `items(target)` 动态菜单、触发行 `data-context-open="true"` 高亮锁、原生输入框自动放行；
 * - 支持鼠标右键、键盘 `Shift+F10` / `ContextMenu`、触屏 500ms 长按与 A–Z 首字母快跳；
 * - 内部滚动与斜角划入子菜单绝不误关根菜单，关闭时带平滑缩回过渡并归还焦点。
 */
export function AfContextMenu({
  items,
  onSelect,
  children,
  disabled,
  minWidth = 168,
  width,
  title,
  "aria-label": ariaLabel,
  menuClassName,
  onOpenChange,
  container,
}: AfContextMenuProps) {
  const layer = useAfLayerContainer(container);
  const [open, setOpen] = useState(false);
  const [contextTarget, setContextTarget] = useState<HTMLElement | null>(null);
  const [rawClient, setRawClient] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState<{ left: number; top: number; origin: string } | null>(null);
  const [active, setActive] = useState(-1);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const highlightedRowRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const typeaheadRef = useRef<{ buf: string; timer: number | null }>({ buf: "", timer: null });

  const { mounted, closing } = useExitTransition(open, 115);
  const { OverlayBranchScope, containsNode } = useOverlayBranch(panelRef, mounted);

  const resolvedItems = useMemo(() => {
    if (typeof items === "function") {
      return contextTarget ? items(contextTarget) : [];
    }
    return items;
  }, [contextTarget, items]);

  const lastItemsRef = useRef<AfContextMenuItem[]>([]);
  if (open && resolvedItems.length > 0) {
    lastItemsRef.current = resolvedItems;
  }
  const displayItems = open ? resolvedItems : (lastItemsRef.current.length > 0 ? lastItemsRef.current : resolvedItems);

  const actionable = useMemo(
    () => resolvedItems.filter((item): item is AfActionableMenuItem => isActionableMenuItem(item) && !item.disabled),
    [resolvedItems],
  );

  const clearHighlightedRow = () => {
    if (highlightedRowRef.current) {
      highlightedRowRef.current.removeAttribute("data-context-open");
      highlightedRowRef.current = null;
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearHighlightedRow();
      clearLongPress();
      if (typeaheadRef.current.timer !== null) {
        window.clearTimeout(typeaheadRef.current.timer);
      }
    };
  }, []);

  const close = (restoreFocus = true, viaPointer = false) => {
    clearHighlightedRow();
    setOpen(false);
    setActive(-1);
    onOpenChange?.(false, null);
    if (restoreFocus && focusRef.current?.isConnected) {
      try {
        (focusRef.current as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
          preventScroll: true,
          focusVisible: !viaPointer,
        });
      } catch {
        focusRef.current.focus({ preventScroll: true });
      }
    }
  };

  useEffect(() => {
    if (!mounted && !open) {
      setContextTarget(null);
      lastItemsRef.current = [];
    }
  }, [mounted, open]);

  const tryOpenForTarget = (
    targetEl: HTMLElement,
    clientX: number,
    clientY: number,
    viaKeyboard: boolean,
  ): boolean => {
    if (disabled || isNativeEditableTarget(targetEl)) return false;
    const nextItems = typeof items === "function" ? items(targetEl) : items;
    if (!nextItems.length) return false;

    const nextActionable = nextItems.filter(
      (item): item is AfActionableMenuItem => isActionableMenuItem(item) && !item.disabled,
    );

    clearHighlightedRow();
    const rowEl = findHighlightTarget(targetEl, triggerRef.current);
    if (rowEl) {
      rowEl.setAttribute("data-context-open", "true");
      highlightedRowRef.current = rowEl;
    }

    focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : targetEl;
    setContextTarget(targetEl);
    setRawClient({ x: clientX, y: clientY });
    setActive(viaKeyboard && nextActionable.length ? 0 : -1);
    setOpen(true);
    onOpenChange?.(true, targetEl);
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return true;
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (containsNode(target)) return;
      close(false, true);
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && containsNode(event.target)) return;
      close(false, true);
    };
    const onResize = () => close(false, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, containsNode]);

  useEffect(() => {
    if (disabled && open) close(false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, open]);

  useIsomorphicLayoutEffect(() => {
    if (!mounted || !panelRef.current || !layer) {
      if (!mounted) setPlaced(null);
      return;
    }
    const next = clampPointToLayer(
      rawClient.x,
      rawClient.y,
      panelRef.current.offsetWidth || minWidth,
      panelRef.current.offsetHeight || 120,
      layer,
      8,
    );
    setPlaced((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.origin === next.origin ? prev : next,
    );
  }, [mounted, open, rawClient.x, rawClient.y, layer, minWidth, resolvedItems.length]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true, false);
      return;
    }
    if (event.key === "Tab") {
      close(false, false);
      return;
    }
    if (!actionable.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index < 0 ? 0 : (index + step + actionable.length) % actionable.length));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : actionable.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = actionable[active];
      if (!item) return;
      const itemKey = getMenuItemKey(item, resolvedItems.indexOf(item));
      if (item.type === "checkbox") {
        item.onCheckedChange?.(!item.checked);
        item.onSelect?.();
        onSelect?.(itemKey);
        if (!item.keepOpen && item.closeOnSelect) close(true, false);
      } else if (item.type === "radio") {
        item.onSelect?.();
        onSelect?.(itemKey);
        if (!item.keepOpen && item.closeOnSelect !== false) close(true, false);
      } else if (!getMenuSubItems(item)?.length) {
        item.onSelect?.();
        onSelect?.(itemKey);
        if (!item.keepOpen) close(true, false);
      }
    } else if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      /\S/.test(event.key)
    ) {
      event.preventDefault();
      if (typeaheadRef.current.timer !== null) window.clearTimeout(typeaheadRef.current.timer);
      typeaheadRef.current.buf += event.key;
      typeaheadRef.current.timer = window.setTimeout(() => {
        typeaheadRef.current.buf = "";
        typeaheadRef.current.timer = null;
      }, 500);
      const match = findMenuTypeaheadIndex(actionable, typeaheadRef.current.buf, active);
      if (match >= 0) setActive(match);
    }
  };

  const resolvedWidth = width === undefined ? undefined : typeof width === "number" ? `${width}px` : width;

  return (
    <>
      <span
        ref={triggerRef}
        className="af-context-menu__trigger"
        onContextMenu={(event) => {
          if (disabled) return;
          const rawTarget =
            event.target instanceof HTMLElement
              ? event.target
              : (triggerRef.current?.firstElementChild as HTMLElement | null);
          if (!rawTarget) return;
          const viaKeyboard = event.clientX === 0 && event.clientY === 0;
          let x = event.clientX;
          let y = event.clientY;
          if (viaKeyboard) {
            const rect = rawTarget.getBoundingClientRect();
            x = rect.left + Math.min(24, Math.max(8, rect.width / 3));
            y = rect.bottom - 4;
          }
          if (tryOpenForTarget(rawTarget, x, y, viaKeyboard)) {
            event.preventDefault();
          }
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            const target =
              event.target instanceof HTMLElement
                ? event.target
                : (triggerRef.current?.firstElementChild as HTMLElement | null);
            if (!target) return;
            const rect = target.getBoundingClientRect();
            if (tryOpenForTarget(target, rect.left + 16, rect.bottom - 4, true)) {
              event.preventDefault();
              event.stopPropagation();
            }
          }
        }}
        onPointerDown={(event: ReactPointerEvent<HTMLSpanElement>) => {
          if (disabled || event.pointerType !== "touch") return;
          const target = event.target instanceof HTMLElement ? event.target : null;
          if (!target || isNativeEditableTarget(target)) return;
          clearLongPress();
          const { clientX, clientY } = event;
          longPressStartRef.current = { x: clientX, y: clientY };
          longPressTimerRef.current = window.setTimeout(() => {
            longPressTimerRef.current = null;
            tryOpenForTarget(target, clientX, clientY, false);
          }, 500);
        }}
        onPointerMove={(event: ReactPointerEvent<HTMLSpanElement>) => {
          if (!longPressStartRef.current) return;
          if (Math.hypot(event.clientX - longPressStartRef.current.x, event.clientY - longPressStartRef.current.y) > 10) {
            clearLongPress();
          }
        }}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
      >
        {children}
      </span>
      {mounted && layer
        ? createPortal(
            <OverlayBranchScope>
              <div
                ref={panelRef}
                className={cn("af-context-menu", menuClassName)}
                role="menu"
                aria-label={ariaLabel}
                tabIndex={-1}
                data-af-overlay="true"
                data-ready={placed ? "true" : undefined}
                data-closing={closing || undefined}
                style={
                  placed
                    ? ({
                        left: placed.left,
                        top: placed.top,
                        minWidth,
                        width: resolvedWidth,
                        transformOrigin: placed.origin,
                      } as CSSProperties)
                    : { visibility: "hidden", left: 0, top: 0, minWidth, width: resolvedWidth }
                }
                onKeyDown={onMenuKeyDown}
                onContextMenu={(event) => event.preventDefault()}
              >
                {title ? <div className="af-menu__title">{title}</div> : null}
                <AfMenuList
                  items={displayItems}
                  open={open && !closing}
                  active={active}
                  setActive={setActive}
                  onSelectKey={onSelect}
                  onRequestClose={(viaPointer) => close(true, viaPointer)}
                  container={container}
                  itemClassName="af-context-menu__item"
                />
              </div>
            </OverlayBranchScope>,
            layer,
          )
        : null}
    </>
  );
}
