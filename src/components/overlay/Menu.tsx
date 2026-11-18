import {
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfSlot, cn, useControllableState, useMenuHighlight, type AfPopoverSide } from "../../primitives";
import { AfPopover } from "./Popover";

/** 统一菜单项协议（同时兼容下拉菜单与右键菜单，支持 Aster `key` 与 affectUI `id`/`submenu`/`keepOpen`/`divider`）。 */
export type AfMenuItem =
  | {
      type?: "item";
      key?: string;
      id?: string;
      label?: ReactNode;
      description?: ReactNode;
      icon?: AffectIconKey | ReactNode;
      logo?: ReactNode;
      kbd?: ReactNode;
      shortcut?: ReactNode;
      danger?: boolean;
      disabled?: boolean;
      keepOpen?: boolean;
      divider?: boolean;
      onSelect?: () => void;
      children?: AfMenuItem[];
      submenu?: AfMenuItem[];
    }
  | {
      type: "checkbox";
      key?: string;
      id?: string;
      label: ReactNode;
      description?: ReactNode;
      checked: boolean;
      onCheckedChange?: (checked: boolean) => void;
      onSelect?: () => void;
      closeOnSelect?: boolean;
      keepOpen?: boolean;
      divider?: boolean;
      icon?: AffectIconKey | ReactNode;
      logo?: ReactNode;
      kbd?: ReactNode;
      shortcut?: ReactNode;
      disabled?: boolean;
    }
  | {
      type: "radio";
      key?: string;
      id?: string;
      label: ReactNode;
      description?: ReactNode;
      checked: boolean;
      onSelect?: () => void;
      closeOnSelect?: boolean;
      keepOpen?: boolean;
      divider?: boolean;
      icon?: AffectIconKey | ReactNode;
      logo?: ReactNode;
      kbd?: ReactNode;
      shortcut?: ReactNode;
      disabled?: boolean;
    }
  | {
      type: "separator" | "divider";
      key?: string;
      id?: string;
    }
  | {
      type: "label";
      key?: string;
      id?: string;
      label: ReactNode;
    };

export type AfActionableMenuItem = Exclude<AfMenuItem, { type: "separator" | "divider" } | { type: "label" }>;

export function getMenuItemKey(item: AfMenuItem, fallbackIndex = 0): string {
  return item.key ?? item.id ?? `item-${fallbackIndex}`;
}

export function getMenuSubItems(item: AfActionableMenuItem): AfMenuItem[] | undefined {
  if (item.type === "checkbox" || item.type === "radio") return undefined;
  return item.children ?? item.submenu;
}

export function isMenuSeparator(item: AfMenuItem): item is Extract<AfMenuItem, { type: "separator" | "divider" }> {
  return item.type === "separator" || item.type === "divider";
}

export function isMenuLabel(item: AfMenuItem): item is Extract<AfMenuItem, { type: "label" }> {
  return item.type === "label";
}

export function isActionableMenuItem(item: AfMenuItem): item is AfActionableMenuItem {
  return !isMenuSeparator(item) && !isMenuLabel(item);
}

function extractPlainLabel(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractPlainLabel).join("");
  if (isValidElement(node)) {
    return extractPlainLabel((node.props as { children?: ReactNode }).children);
  }
  return "";
}

export function findMenuTypeaheadIndex(
  actionable: AfActionableMenuItem[],
  query: string,
  currentIndex: number,
): number {
  if (!query || !actionable.length) return -1;
  const lower = query.toLowerCase();
  const start = currentIndex >= 0 ? (currentIndex + 1) % actionable.length : 0;
  for (let offset = 0; offset < actionable.length; offset++) {
    const idx = (start + offset) % actionable.length;
    const text = extractPlainLabel(actionable[idx].label).trim().toLowerCase();
    if (text.startsWith(lower)) return idx;
  }
  return -1;
}

function renderMenuSlotIcon(icon: AffectIconKey | ReactNode | undefined, logo?: ReactNode) {
  if (logo) return <span className="af-menu__logo">{logo}</span>;
  if (!icon) return null;
  if (typeof icon === "string") {
    return <AfIcon name={icon as AffectIconKey} size={14} className="af-menu__icon" />;
  }
  return <span className="af-menu__icon">{icon}</span>;
}

function renderAnimatedCheck(checked: boolean) {
  return (
    <span className="af-menu__check-wrap" data-checked={checked ? "true" : undefined} aria-hidden="true">
      <svg className="af-menu__check-svg" viewBox="0 0 14 14">
        <path className="af-menu__tick" d="M2.75 7.25 5.6 10.1 11.25 4.1" pathLength={1} />
      </svg>
    </span>
  );
}

export type AfMenuListProps = {
  items: AfMenuItem[];
  open: boolean;
  active: number;
  setActive: (next: number | ((prev: number) => number)) => void;
  onSelectKey?: (key: string) => void;
  onRequestClose: (viaPointer: boolean) => void;
  container?: HTMLElement | null;
  itemClassName?: string;
  onReturnToParent?: () => void;
  empty?: ReactNode;
  onSubmenuHoverBridge?: () => void;
};

/** 递归菜单列表内核：承载 90ms 浮动底块高亮、右侧描线勾选动画、A–Z 快速检索与安全斜角子菜单走廊。 */
export function AfMenuList({
  items,
  open,
  active,
  setActive,
  onSelectKey,
  onRequestClose,
  container,
  itemClassName,
  onReturnToParent,
  empty,
  onSubmenuHoverBridge,
}: AfMenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const subMenuHostRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const subCloseTimerRef = useRef<number | null>(null);
  const subTypeaheadRef = useRef<{ buf: string; timer: number | null }>({ buf: "", timer: null });
  const [openSubKey, setOpenSubKey] = useState<string | null>(null);
  const [subActive, setSubActive] = useState(-1);
  const subAnchorRef = useRef<HTMLElement | null>(null);

  const actionable = items.filter((item): item is AfActionableMenuItem => isActionableMenuItem(item) && !item.disabled);
  const hasLeadingGutter = items.some(
    (item) => isActionableMenuItem(item) && Boolean(item.icon || item.logo || item.type === "radio"),
  );
  const thumb = useMenuHighlight(listRef, active, open, `${items.length}:${openSubKey ?? ""}`);

  const clearSubCloseTimer = () => {
    if (subCloseTimerRef.current !== null) {
      window.clearTimeout(subCloseTimerRef.current);
      subCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearSubCloseTimer();
      if (subTypeaheadRef.current.timer !== null) {
        window.clearTimeout(subTypeaheadRef.current.timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      clearSubCloseTimer();
      setOpenSubKey(null);
      setSubActive(-1);
    }
  }, [open]);

  const scheduleSubClose = () => {
    clearSubCloseTimer();
    subCloseTimerRef.current = window.setTimeout(() => {
      subCloseTimerRef.current = null;
      setOpenSubKey(null);
      setSubActive(-1);
    }, 145);
  };

  const activeItem = active >= 0 ? actionable[active] : undefined;
  const activeDanger = Boolean(
    activeItem && activeItem.type !== "checkbox" && activeItem.type !== "radio" && activeItem.danger,
  );

  const activateItem = (item: AfActionableMenuItem, itemKey: string, viaPointer: boolean) => {
    if (item.disabled) return;
    if (item.type === "checkbox") {
      item.onCheckedChange?.(!item.checked);
      item.onSelect?.();
      onSelectKey?.(itemKey);
      const shouldClose = item.keepOpen ? false : Boolean(item.closeOnSelect);
      if (shouldClose) onRequestClose(viaPointer);
      return;
    }
    if (item.type === "radio") {
      item.onSelect?.();
      onSelectKey?.(itemKey);
      const shouldClose = item.keepOpen ? false : item.closeOnSelect !== false;
      if (shouldClose) onRequestClose(viaPointer);
      return;
    }
    const subItems = getMenuSubItems(item);
    if (subItems?.length) {
      clearSubCloseTimer();
      subAnchorRef.current = rowRefs.current.get(itemKey) ?? null;
      setOpenSubKey(itemKey);
      setSubActive(viaPointer ? -1 : 0);
      return;
    }
    item.onSelect?.();
    onSelectKey?.(itemKey);
    if (!item.keepOpen) {
      onRequestClose(viaPointer);
    }
  };

  const openSubEntry = openSubKey
    ? items
        .map((it, idx) => ({ item: it, key: getMenuItemKey(it, idx) }))
        .find(
          (entry): entry is { item: Extract<AfMenuItem, { type?: "item" }>; key: string } =>
            entry.key === openSubKey &&
            isActionableMenuItem(entry.item) &&
            entry.item.type !== "checkbox" &&
            entry.item.type !== "radio",
        )
    : undefined;

  const openSubChildren = openSubEntry ? getMenuSubItems(openSubEntry.item) : undefined;
  const lastSubChildrenRef = useRef<AfMenuItem[]>([]);
  if (openSubChildren?.length) {
    lastSubChildrenRef.current = openSubChildren;
  }
  const hasAnySubmenu = items.some((it) => isActionableMenuItem(it) && Boolean(getMenuSubItems(it)?.length));
  const subOpen = Boolean(open && openSubKey && openSubChildren?.length);
  const subDisplayItems = openSubChildren?.length ? openSubChildren : lastSubChildrenRef.current;
  const subActionable =
    openSubChildren?.filter((it): it is AfActionableMenuItem => isActionableMenuItem(it) && !it.disabled) ?? [];

  useEffect(() => {
    if (!openSubKey || subActive < 0) return;
    const frame = requestAnimationFrame(() => {
      subMenuHostRef.current?.closest<HTMLElement>("[role='menu']")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [openSubKey, subActive]);

  const handleSubKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      clearSubCloseTimer();
      setOpenSubKey(null);
      setSubActive(-1);
      listRef.current?.closest<HTMLElement>("[role='menu']")?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!subActionable.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSubActive((idx) => (idx < 0 ? 0 : (idx + step + subActionable.length) % subActionable.length));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      if (subActionable.length) setSubActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      if (subActionable.length) setSubActive(subActionable.length - 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && subActive >= 0 && subActionable[subActive]) {
      event.preventDefault();
      event.stopPropagation();
      const child = subActionable[subActive];
      const childIdx = openSubChildren ? openSubChildren.indexOf(child) : subActive;
      const childKey = getMenuItemKey(child, childIdx);
      activateItem(child, childKey, false);
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && /\S/.test(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (subTypeaheadRef.current.timer !== null) window.clearTimeout(subTypeaheadRef.current.timer);
      subTypeaheadRef.current.buf += event.key;
      subTypeaheadRef.current.timer = window.setTimeout(() => {
        subTypeaheadRef.current.buf = "";
        subTypeaheadRef.current.timer = null;
      }, 500);
      const match = findMenuTypeaheadIndex(subActionable, subTypeaheadRef.current.buf, subActive);
      if (match >= 0) setSubActive(match);
    }
  };

  if (items.length === 0 && empty !== undefined) {
    return <div className="af-menu__empty">{empty}</div>;
  }

  return (
    <div
      className="af-menu__list"
      ref={(node) => {
        (listRef as { current: HTMLDivElement | null }).current = node;
        subMenuHostRef.current = node;
      }}
      onPointerEnter={() => {
        onSubmenuHoverBridge?.();
      }}
      onPointerLeave={() => {
        if (!openSubKey) setActive(-1);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && onReturnToParent) {
          event.preventDefault();
          event.stopPropagation();
          onReturnToParent();
          return;
        }
        if (event.key === "ArrowRight" && activeItem) {
          const subItems = getMenuSubItems(activeItem);
          if (subItems?.length) {
            const activeKey = getMenuItemKey(activeItem, items.indexOf(activeItem));
            event.preventDefault();
            event.stopPropagation();
            clearSubCloseTimer();
            subAnchorRef.current = rowRefs.current.get(activeKey) ?? null;
            setOpenSubKey(activeKey);
            setSubActive(0);
          }
        }
      }}
    >
      {thumb ? (
        <span
          className="af-menu__thumb"
          data-danger={activeDanger || undefined}
          style={
            {
              transform: `translate(${thumb.x}px, ${thumb.y}px)`,
              width: thumb.width,
              height: thumb.height,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      ) : null}
      {items.map((item, rawIdx) => {
        const itemKey = getMenuItemKey(item, rawIdx);
        if (isMenuSeparator(item)) {
          return <hr key={itemKey} className="af-menu__sep" role="separator" />;
        }
        if (isMenuLabel(item)) {
          return (
            <div key={itemKey} className="af-menu__label" role="presentation">
              {item.label}
            </div>
          );
        }

        const index = actionable.indexOf(item);
        const isCheckbox = item.type === "checkbox";
        const isRadio = item.type === "radio";
        const subItems = getMenuSubItems(item);
        const hasSubmenu = Boolean(subItems?.length);
        const role = isCheckbox ? "menuitemcheckbox" : isRadio ? "menuitemradio" : "menuitem";
        const shortcutText = item.kbd ?? item.shortcut;
        const isDanger = !isCheckbox && !isRadio && Boolean(item.danger);

        return (
          <Fragment key={itemKey}>
            {item.divider ? <hr className="af-menu__sep" role="separator" /> : null}
            <div
              ref={(node) => {
                if (node) rowRefs.current.set(itemKey, node);
                else rowRefs.current.delete(itemKey);
              }}
              role={role}
              aria-checked={isCheckbox || isRadio ? item.checked : undefined}
              aria-haspopup={hasSubmenu ? "menu" : undefined}
              aria-expanded={hasSubmenu ? openSubKey === itemKey : undefined}
              aria-disabled={item.disabled || undefined}
              tabIndex={-1}
              className={cn("af-menu__item", itemClassName)}
              data-menu-index={index >= 0 ? index : undefined}
              data-active={(index >= 0 && index === active) || openSubKey === itemKey ? "true" : undefined}
              data-checked={isCheckbox || isRadio ? (item.checked ? "true" : undefined) : undefined}
              data-danger={isDanger || undefined}
              data-disabled={item.disabled || undefined}
              data-has-desc={item.description ? "true" : undefined}
              onPointerEnter={() => {
                if (item.disabled || index < 0) {
                  if (active !== -1) setActive(-1);
                  if (openSubKey) scheduleSubClose();
                  return;
                }
                if (active !== index) setActive(index);
                if (hasSubmenu) {
                  clearSubCloseTimer();
                  subAnchorRef.current = rowRefs.current.get(itemKey) ?? null;
                  setOpenSubKey(itemKey);
                  setSubActive(-1);
                } else if (openSubKey && openSubKey !== itemKey) {
                  scheduleSubClose();
                }
              }}
              onPointerMove={() => {
                const nextIdx = item.disabled || index < 0 ? -1 : index;
                if (active !== nextIdx) setActive(nextIdx);
                if (hasSubmenu && openSubKey === itemKey) {
                  clearSubCloseTimer();
                }
              }}
              onPointerDown={(event) => {
                if (hasSubmenu) {
                  event.stopPropagation();
                }
              }}
              onClick={(event) => {
                if (hasSubmenu) {
                  event.preventDefault();
                  event.stopPropagation();
                }
                activateItem(item, itemKey, true);
              }}
            >
              <span className="af-menu__main">
                {hasLeadingGutter ? (
                  <span className="af-menu__icon-slot" aria-hidden="true">
                    {isRadio && !item.icon && !item.logo ? (
                      <span className="af-menu__radio-indicator" data-checked={item.checked ? "true" : undefined} />
                    ) : (
                      renderMenuSlotIcon(item.icon, item.logo)
                    )}
                  </span>
                ) : null}
                <span className="af-menu__text">
                  <span className="af-menu__item-label">{item.label}</span>
                  {item.description ? <span className="af-menu__desc">{item.description}</span> : null}
                </span>
              </span>
              {hasSubmenu ? (
                <AfIcon name="chevronRight" size={13} className="af-menu__sub-arrow" />
              ) : isCheckbox || (isRadio && Boolean(item.icon || item.logo)) ? (
                <span className="af-menu__trailing">
                  {shortcutText ? (
                    <span className="af-menu__kbd" aria-hidden="true">
                      {shortcutText}
                    </span>
                  ) : null}
                  {renderAnimatedCheck(item.checked)}
                </span>
              ) : shortcutText ? (
                <span className="af-menu__kbd" aria-hidden="true">
                  {shortcutText}
                </span>
              ) : null}
            </div>
          </Fragment>
        );
      })}
      {hasAnySubmenu ? (
        <AfPopover
          open={subOpen}
          anchorRef={subAnchorRef}
          preferredSide="right"
          align="start"
          gap={2}
          animateExit
          role="menu"
          preserveNaturalWidth
          container={container}
          className="af-menu__pop af-menu__subpop"
          onKeyDown={handleSubKeyDown}
          onPointerDownOutside={() => {
            clearSubCloseTimer();
            setOpenSubKey(null);
            setSubActive(-1);
          }}
        >
          <div
            className="af-menu__sub-bridge"
            tabIndex={-1}
            onPointerEnter={clearSubCloseTimer}
            onPointerMove={clearSubCloseTimer}
          >
            <AfMenuList
              items={subDisplayItems}
              open={subOpen}
              active={subActive}
              setActive={setSubActive}
              onSelectKey={onSelectKey}
              onRequestClose={onRequestClose}
              container={container}
              itemClassName={itemClassName}
              onSubmenuHoverBridge={clearSubCloseTimer}
              onReturnToParent={() => {
                clearSubCloseTimer();
                setOpenSubKey(null);
                setSubActive(-1);
                listRef.current?.closest<HTMLElement>("[role='menu']")?.focus({ preventScroll: true });
              }}
            />
          </div>
        </AfPopover>
      ) : null}
    </div>
  );
}

export type AfMenuProps = {
  /** 菜单项列表（支持普通项、分隔线、分组标题、多选框、单选框与多级子菜单）。 */
  items: AfMenuItem[];
  /** 选中回调（也可在单项上直接配置 `onSelect` / `onCheckedChange`）。 */
  onSelect?: (key: string) => void;
  /** 触发器（可选用 `trigger` 属性或 `children` 传入）。 */
  trigger?: ReactNode | ((props: { open: boolean; toggle: () => void }) => ReactNode);
  /** 触发器：支持 render-prop 或直接传入单个按钮元素。 */
  children?: ReactNode | ((props: { open: boolean; toggle: () => void }) => ReactNode);
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 首选弹出方向，默认 `"bottom"`。 */
  side?: AfPopoverSide;
  /** 水平对齐方式，默认 `"end"`。 */
  align?: "start" | "center" | "end";
  /** 与触发器间距（px），默认 `6`。 */
  offset?: number;
  /** 可选指定菜单宽度。 */
  width?: number | string;
  /** 顶部结构化标题。 */
  title?: ReactNode;
  /** 顶部自定义插槽（位于列表上方并带细分隔线）。 */
  header?: ReactNode;
  /** `items` 为空时的占位提示。 */
  empty?: ReactNode;
  /** 根容器额外类名。 */
  className?: string;
  /** 弹出面板额外类名。 */
  menuClassName?: string;
  /** 可选指定浮层挂载容器。 */
  container?: HTMLElement | null;
};

/** 下拉菜单（DropdownMenu）：共享 90ms 浮动底块高亮、右侧描线打勾动画、A–Z 快速跳转、多级子菜单斜角安全走廊与退场微缩。 */
export function AfMenu({
  items,
  onSelect,
  trigger: triggerProp,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "end",
  offset = 6,
  width,
  title,
  header,
  empty,
  className,
  menuClassName,
  container,
}: AfMenuProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef<{ buf: string; timer: number | null }>({ buf: "", timer: null });

  const actionable = items.filter((item): item is AfActionableMenuItem => isActionableMenuItem(item) && !item.disabled);

  useEffect(() => {
    return () => {
      if (typeaheadRef.current.timer !== null) {
        window.clearTimeout(typeaheadRef.current.timer);
      }
    };
  }, []);

  /** 关闭后把焦点归还触发按钮；指针触发时不亮键盘焦点环。 */
  const close = (viaPointer = false) => {
    setOpen(false);
    setActive(-1);
    const triggerEl = rootRef.current?.querySelector<HTMLElement>("button, a, [tabindex]");
    if (!triggerEl) return;
    try {
      (triggerEl as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
        preventScroll: true,
        focusVisible: !viaPointer,
      });
    } catch {
      triggerEl.focus({ preventScroll: true });
    }
  };

  /** 键盘导航只在可操作项之间移动；关闭状态下按 ↓ / ↑ 直接打开，打开态支持 A–Z 首字母快跳。 */
  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(event.key === "ArrowDown" ? 0 : Math.max(0, actionable.length - 1));
        setOpen(true);
      }
      return;
    }
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(false);
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!actionable.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index < 0 ? 0 : (index + step + actionable.length) % actionable.length));
    } else if (event.key === "Home") {
      event.preventDefault();
      if (actionable.length) setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      if (actionable.length) setActive(actionable.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && active >= 0 && actionable[active]) {
      event.preventDefault();
      const target = actionable[active];
      const targetKey = getMenuItemKey(target, items.indexOf(target));
      if (target.type === "checkbox") {
        target.onCheckedChange?.(!target.checked);
        target.onSelect?.();
        onSelect?.(targetKey);
        if (!target.keepOpen && target.closeOnSelect) close(false);
      } else if (target.type === "radio") {
        target.onSelect?.();
        onSelect?.(targetKey);
        if (!target.keepOpen && target.closeOnSelect !== false) close(false);
      } else if (!getMenuSubItems(target)?.length) {
        target.onSelect?.();
        onSelect?.(targetKey);
        if (!target.keepOpen) close(false);
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

  const toggle = () => {
    setActive(-1);
    setOpen((value) => !value);
  };

  const triggerSource = triggerProp ?? children;

  return (
    <div className={cn("af-menu", className)} ref={rootRef} onKeyDown={onKeyDown}>
      {typeof triggerSource === "function" ? (
        triggerSource({ open, toggle })
      ) : isValidElement(triggerSource) ? (
        <AfSlot aria-haspopup="menu" aria-expanded={open} onClick={() => toggle()}>
          {triggerSource}
        </AfSlot>
      ) : (
        <span onClick={() => toggle()}>{triggerSource}</span>
      )}
      <AfPopover
        open={open}
        anchorRef={rootRef}
        preferredSide={side}
        align={align}
        gap={offset}
        width={width}
        animateExit
        role="menu"
        preserveNaturalWidth
        container={container}
        className={cn("af-menu__pop", menuClassName)}
        onKeyDown={onKeyDown}
        onPointerDownOutside={() => {
          setOpen(false);
          setActive(-1);
        }}
      >
        {header ? <div className="af-menu__header">{header}</div> : null}
        {title ? <div className="af-menu__title">{title}</div> : null}
        <AfMenuList
          items={items}
          open={open}
          active={active}
          setActive={setActive}
          onSelectKey={onSelect}
          onRequestClose={(viaPointer) => close(viaPointer)}
          container={container}
          empty={empty}
        />
      </AfPopover>
    </div>
  );
}

export type AfDropdownMenuProps = AfMenuProps;
export const AfDropdownMenu = AfMenu;
