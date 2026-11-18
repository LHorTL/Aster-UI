import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AfContextMenu, type AfContextMenuItem } from "../../context-menu";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { dockApps as defaultDockApps } from "../../model";
import { cn, composeRefs, useControllableState, useSortableList } from "../../primitives";

/** Dock 导航条目。 */
export type AfAppDockItem = {
  id: string;
  name: string;
  icon: AfIconSlot;
  group?: "日常" | "工具" | string;
  badge?: number;
  running?: boolean;
  pinned?: boolean;
};

/** Dock 布局形态：`rail`（默认可折叠宽轨 218px/60px）、`compact`（46px 纯图标极窄轨）、`stage`（内嵌卡片轨）。 */
export type AfAppDockVariant = "rail" | "compact" | "stage";

/** 桌面应用导航 Dock 属性。 */
export type AfAppDockProps = {
  items?: AfAppDockItem[];
  defaultItems?: AfAppDockItem[];
  activeId?: string;
  defaultActiveId?: string;
  onSelect?: (item: AfAppDockItem) => void;
  onTogglePin?: (item: AfAppDockItem, nextPinned: boolean) => void;
  /** 形态模式，新增 `"compact"` 对应 46px 纯图标窄轨。 */
  variant?: AfAppDockVariant;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** 是否允许指针捕获拖拽排序与 `Alt + ArrowUp/Down` 键盘调序，默认 `true`。 */
  reorderable?: boolean;
  /** 拖拽、键盘或右键菜单重排顺序时触发。 */
  onReorder?: (nextItems: AfAppDockItem[]) => void;
  /** 是否启用右键上下文菜单（置顶、上移、下移、独立子窗口打开），默认 `true`。 */
  contextMenu?: boolean;
  /** 右键选择“在独立子窗口打开”时触发。 */
  onOpenSubwindow?: (item: AfAppDockItem) => void;
  /** 底部应用商城可更新数量角标。 */
  storeBadgeCount?: number;
  /** 点击底部常驻商城入口回调。 */
  onOpenStore?: () => void;
  /** 点击底部常驻设置入口回调。 */
  onOpenSettings?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const DEFAULT_DOCK_ITEMS: AfAppDockItem[] = defaultDockApps.map((app) => ({
  id: app.id,
  name: app.name,
  icon: app.icon,
  group: app.group,
  badge: app.badge,
  running: app.id === "overview" || app.id === "inbox" || app.id === "monitor",
  pinned: app.id === "overview" || app.id === "translate",
}));

/**
 * 宿主左侧 App Dock 完整版：
 * - 支持 218px/60px 可折叠标准轨与 `46px` 纯图标紧凑窄轨（上下滚动溢出自动挂载 `24px` 渐隐 `mask-image`）；
 * - 接入 `useSortableList` 真指针捕获弹簧拖拽（`4px` 阈值、兄弟平滑让位、`Alt+Arrow` 键盘调序，零点击缩小）；
 * - 内置右键 `AfContextMenu` 与底栏常驻应用商城（含可更新角标）/ 设置槽位。
 */
export function AfAppDock({
  items: itemsProp,
  defaultItems = DEFAULT_DOCK_ITEMS,
  activeId: activeIdProp,
  defaultActiveId = "overview",
  onSelect,
  onTogglePin,
  variant = "rail",
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  reorderable = true,
  onReorder,
  contextMenu = true,
  onOpenSubwindow,
  storeBadgeCount,
  onOpenStore,
  onOpenSettings,
  header,
  footer,
  className,
}: AfAppDockProps = {}) {
  const [orderedItems, setOrderedItems] = useControllableState<AfAppDockItem[]>({
    value: itemsProp,
    defaultValue: defaultItems,
    onChange: onReorder,
  });

  const [activeId, setActiveId] = useControllableState<string>({
    value: activeIdProp,
    defaultValue: defaultActiveId,
  });

  const [rawCollapsed, setRawCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const isCompactRail = variant === "compact";
  const collapsed = isCompactRail ? true : rawCollapsed;

  // 按首次出现的分组顺序展开，确保 DOM 渲染顺序与 useSortableList 索引 1:1 严格对齐
  const { groups, displayItems, indexById } = useMemo(() => {
    const groupOrder = Array.from(new Set(orderedItems.map((item) => item.group ?? "应用")));
    const bucketed: Array<{ group: string; entries: AfAppDockItem[] }> = groupOrder.map((group) => ({
      group,
      entries: orderedItems.filter((item) => (item.group ?? "应用") === group),
    }));
    const flat = bucketed.flatMap((b) => b.entries);
    const idxMap = new Map<string, number>();
    flat.forEach((it, idx) => idxMap.set(it.id, idx));
    return { groups: bucketed, displayItems: flat, indexById: idxMap };
  }, [orderedItems]);

  const runningCount = useMemo(() => displayItems.filter((i) => i.running).length, [displayItems]);

  const applyReorder = useCallback(
    (nextFlat: AfAppDockItem[], movedId?: string, toIndex?: number) => {
      let normalized = nextFlat;
      if (movedId !== undefined && toIndex !== undefined && nextFlat.length > 1) {
        const neighbor = nextFlat[toIndex > 0 ? toIndex - 1 : 1];
        if (neighbor && neighbor.id !== movedId) {
          normalized = nextFlat.map((entry) =>
            entry.id === movedId ? { ...entry, group: neighbor.group } : entry,
          );
        }
      }
      setOrderedItems(normalized);
    },
    [setOrderedItems],
  );

  const sortable = useSortableList<AfAppDockItem>({
    items: displayItems,
    getKey: (item) => item.id,
    direction: "vertical",
    activationDistance: 4,
    disabled: !reorderable,
    onReorder: (nextItems, meta) => {
      applyReorder(nextItems, meta.activeId, meta.toIndex);
    },
  });

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const mergedGroupsRef = useMemo(
    () => composeRefs<HTMLDivElement>(scrollBoxRef, sortable.listRef as React.Ref<HTMLDivElement>),
    [sortable.listRef],
  );

  const syncScrollMask = useCallback(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 2) {
      setFadeTop(false);
      setFadeBottom(false);
      return;
    }
    setFadeTop(el.scrollTop > 2);
    setFadeBottom(el.scrollTop < maxScroll - 2);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = scrollBoxRef.current;
    if (!el) return;
    syncScrollMask();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncScrollMask) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [displayItems.length, collapsed, variant, syncScrollMask]);

  const toggleCollapse = () => {
    if (isCompactRail) return;
    setRawCollapsed(!rawCollapsed);
  };

  const handleSelectItem = useCallback(
    (item: AfAppDockItem) => {
      setActiveId(item.id);
      onSelect?.(item);
    },
    [setActiveId, onSelect],
  );

  const resolveItemPinned = useCallback(
    (item: AfAppDockItem) =>
      itemsProp !== undefined ? Boolean(item.pinned) : (pinnedMap[item.id] ?? Boolean(item.pinned)),
    [itemsProp, pinnedMap],
  );

  const handleTogglePinItem = useCallback(
    (item: AfAppDockItem) => {
      const currentPinned = resolveItemPinned(item);
      const nextPinned = !currentPinned;
      if (itemsProp === undefined) {
        setPinnedMap((prev) => ({ ...prev, [item.id]: nextPinned }));
      }
      onTogglePin?.(item, nextPinned);
    },
    [resolveItemPinned, itemsProp, onTogglePin],
  );

  const buildContextMenuItems = useCallback(
    (target: HTMLElement): AfContextMenuItem[] => {
      const row = target.closest<HTMLElement>("[data-dock-id]");
      const id = row?.dataset.dockId;
      if (!id) return [];
      const idx = indexById.get(id) ?? -1;
      const item = idx >= 0 ? displayItems[idx] : undefined;
      if (!item) return [];
      const isPinned = resolveItemPinned(item);
      const lastIdx = displayItems.length - 1;

      return [
        {
          key: "pin",
          label: isPinned ? "取消固定" : "固定到常驻栏",
          icon: "star",
          onSelect: () => handleTogglePinItem(item),
        },
        { type: "separator", key: "sep-move" },
        {
          key: "move-top",
          label: "移到最前",
          icon: "arrowUp",
          disabled: !reorderable || idx <= 0,
          onSelect: () => sortable.moveItem(idx, 0),
        },
        {
          key: "move-up",
          label: "上移一位",
          disabled: !reorderable || idx <= 0,
          shortcut: "Alt+↑",
          onSelect: () => sortable.moveItem(idx, idx - 1),
        },
        {
          key: "move-down",
          label: "下移一位",
          disabled: !reorderable || idx >= lastIdx,
          shortcut: "Alt+↓",
          onSelect: () => sortable.moveItem(idx, idx + 1),
        },
        {
          key: "move-bottom",
          label: "移到最后",
          icon: "arrowDown",
          disabled: !reorderable || idx >= lastIdx,
          onSelect: () => sortable.moveItem(idx, lastIdx),
        },
        { type: "separator", key: "sep-win" },
        {
          key: "open-subwindow",
          label: "在独立子窗口打开",
          icon: "external",
          onSelect: () => onOpenSubwindow?.(item),
        },
      ];
    },
    [indexById, displayItems, resolveItemPinned, reorderable, handleTogglePinItem, sortable, onOpenSubwindow],
  );

  const hasQuickActions = Boolean(onOpenStore || onOpenSettings || storeBadgeCount !== undefined);

  const groupsContent = (
    <div
      ref={mergedGroupsRef}
      className="af-shell-dock__groups"
      data-af-hover-list="hover"
      data-fade-top={fadeTop ? "true" : undefined}
      data-fade-bottom={fadeBottom ? "true" : undefined}
      onScroll={syncScrollMask}
    >
      {groups.map(({ group, entries }) => (
        <div className="af-shell-dock__group" key={group}>
          <div className="af-shell-dock__label" aria-hidden={collapsed || undefined}>
            <span className="af-shell-dock__label-text">{group}</span>
          </div>
          {entries.map((item) => {
            const current = item.id === activeId;
            const pinned = resolveItemPinned(item);
            const globalIndex = indexById.get(item.id) ?? 0;
            const dragProps = sortable.getItemProps(item, globalIndex);

            const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.target !== e.currentTarget) return;
              dragProps.onKeyDown(e);
              if (e.defaultPrevented) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelectItem(item);
              }
            };

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="af-shell-dock__row"
                aria-current={current ? "page" : undefined}
                aria-label={item.name}
                title={collapsed ? item.name : undefined}
                data-af-hover-item
                data-context-target
                data-dock-id={item.id}
                data-current={current ? "true" : undefined}
                data-pinned={pinned ? "true" : undefined}
                data-flip={dragProps["data-flip"]}
                data-drag-item-id={dragProps["data-drag-item-id"]}
                data-af-dragging={dragProps["data-af-dragging"]}
                style={dragProps.style}
                onPointerDown={dragProps.onPointerDown}
                onKeyDown={handleRowKeyDown}
                onClick={() => handleSelectItem(item)}
              >
                <span className="af-shell-dock__item" data-current={current ? "true" : undefined}>
                  <span className="af-shell-dock__icon" aria-hidden="true">
                    {renderAfIconSlot(item.icon, 14)}
                    {item.running ? <span className="af-shell-dock__dot" /> : null}
                  </span>
                  <span className="af-shell-dock__name" aria-hidden={collapsed || undefined}>
                    {item.name}
                  </span>
                  {item.badge ? (
                    <span className="af-shell-dock__badge" aria-hidden={collapsed || undefined}>
                      {item.badge}
                    </span>
                  ) : null}
                  {collapsed && item.badge ? (
                    <span className="af-shell-dock__mini-badge" aria-hidden="true">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                {onTogglePin ? (
                  <button
                    type="button"
                    className="af-shell-dock__pin"
                    data-no-drag="true"
                    aria-label={pinned ? `取消固定 ${item.name}` : `固定 ${item.name}`}
                    aria-pressed={Boolean(pinned)}
                    tabIndex={collapsed ? -1 : undefined}
                    {...(collapsed ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePinItem(item);
                    }}
                  >
                    <AfIcon name="star" size={12} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <nav
      className={cn("af-shell-dock", className)}
      data-variant={variant}
      data-collapsed={collapsed ? "true" : undefined}
      data-dragging={sortable.activeId ? "true" : undefined}
      aria-label="应用导航栏"
    >
      {!isCompactRail ? (
        <div className="af-shell-dock__head">
          <div
            className="af-shell-dock__head-main"
            aria-hidden={collapsed || undefined}
            {...(collapsed ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
          >
            {header ?? (
              <span className="af-shell-dock__brand">
                <span className="af-shell-dock__logo" aria-hidden="true">
                  <AfIcon name="sparkle" size={13} />
                </span>
                <span className="af-shell-dock__brand-meta">
                  <strong>工作台</strong>
                  <small>{runningCount} 个运行中</small>
                </span>
              </span>
            )}
          </div>
          <button
            type="button"
            className="af-shell-dock__collapse"
            aria-label={collapsed ? "展开应用栏" : "收起应用栏"}
            aria-expanded={!collapsed}
            onClick={toggleCollapse}
          >
            <AfIcon name={collapsed ? "chevronRight" : "panelLeft"} size={13} />
          </button>
        </div>
      ) : null}

      {contextMenu ? (
        <AfContextMenu items={buildContextMenuItems} aria-label="应用操作菜单">
          {groupsContent}
        </AfContextMenu>
      ) : (
        groupsContent
      )}

      {sortable.ghostPortal}

      {footer !== undefined ? (
        footer ? <div className="af-shell-dock__foot">{footer}</div> : null
      ) : hasQuickActions ? (
        <div className="af-shell-dock__foot af-shell-dock__foot--actions" data-af-hover-list="hover">
          {(onOpenStore || storeBadgeCount !== undefined) && (
            <button
              type="button"
              className="af-shell-dock__utility"
              data-af-hover-item
              aria-label={
                storeBadgeCount ? `应用商城（${storeBadgeCount} 项可更新）` : "应用商城"
              }
              title={collapsed ? "应用商城" : undefined}
              onClick={onOpenStore}
            >
              <span className="af-shell-dock__icon" aria-hidden="true">
                <AfIcon name="grid" size={14} />
                {collapsed && storeBadgeCount ? (
                  <span className="af-shell-dock__utility-dot" />
                ) : null}
              </span>
              <span className="af-shell-dock__name" aria-hidden={collapsed || undefined}>
                应用商城
              </span>
              {storeBadgeCount ? (
                <span
                  className="af-shell-dock__badge af-shell-dock__badge--accent"
                  aria-hidden={collapsed || undefined}
                >
                  {storeBadgeCount}
                </span>
              ) : null}
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              className="af-shell-dock__utility"
              data-af-hover-item
              aria-label="全局设置"
              title={collapsed ? "全局设置" : undefined}
              onClick={onOpenSettings}
            >
              <span className="af-shell-dock__icon" aria-hidden="true">
                <AfIcon name="settings" size={14} />
              </span>
              <span className="af-shell-dock__name" aria-hidden={collapsed || undefined}>
                全局设置
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="af-shell-dock__foot">
          <div className="af-shell-dock__status" title={collapsed ? "本地守护进程正常" : undefined}>
            <span className="af-shell-dock__status-dot" aria-hidden="true" />
            <span className="af-shell-dock__status-text" aria-hidden={collapsed || undefined}>
              本地守护进程正常
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
