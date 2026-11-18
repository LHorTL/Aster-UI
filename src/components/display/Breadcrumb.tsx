import {
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfSlot, cn, composeRefs, useIsomorphicLayoutEffect } from "../../primitives";
import { AfPopover } from "../overlay/Popover";

/** 面包屑条目。 */
export type AfBreadcrumbItem = {
  /** 可选稳定键值（用于当前层级滑入过渡识别）。 */
  id?: string;
  /** 文字或路由链接元素（配合 `asChild`）。 */
  label: ReactNode;
  /** 原生跳转链接；传入时渲染为 `<a>`。 */
  href?: string;
  /** 链接打开目标。 */
  target?: string;
  /** 链接安全关系属性。 */
  rel?: string;
  /** 将 `label` 中传入的自定义路由组件合并为面包屑节点。 */
  asChild?: boolean;
  /** 可选前置图标。 */
  icon?: AffectIconKey | ReactNode;
  /** 点击回调；最后一项通常不传。 */
  onClick?: () => void;
};

/** 面包屑分隔符形态（对齐 affectUI `"slash"` / `"chevron"` 或自定义节点）。 */
export type AfBreadcrumbSeparator = "slash" | "chevron" | ReactNode;

/** 面包屑属性。 */
export type AfBreadcrumbProps = ComponentPropsWithoutRef<"nav"> & {
  /** 从根到当前的条目列表。 */
  items: AfBreadcrumbItem[];
  /** 分隔符样式：`"slash"`（默认 `/`）、`"chevron"` 或自定义 ReactNode。 */
  separator?: AfBreadcrumbSeparator;
  /** 超过该数量时自动折叠中间层级到省略号菜单（默认 4，传 0 或 Infinity 不折叠）。 */
  maxItems?: number;
  /** 单项最大宽度（px），默认非末项 200px，仅在实际截断时动态挂载原生 `title`。 */
  maxItemWidth?: number;
};

function labelText(node: ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return undefined;
}

function handleTruncationHover(event: ReactPointerEvent<HTMLElement>, rawLabel: ReactNode) {
  const text = labelText(rawLabel);
  if (!text) return;
  const el = event.currentTarget;
  if (el.scrollWidth > el.clientWidth + 1) {
    el.title = text;
  } else if (el.hasAttribute("title")) {
    el.removeAttribute("title");
  }
}

function renderBreadcrumbContent(item: AfBreadcrumbItem, maxItemWidth?: number, isLast?: boolean) {
  const labelStyle: CSSProperties | undefined = maxItemWidth
    ? { maxWidth: maxItemWidth }
    : !isLast
      ? { maxWidth: 200 }
      : undefined;

  const labelNode = (
    <span
      className="af-crumb__label"
      style={labelStyle}
      onPointerEnter={(e) => handleTruncationHover(e, item.label)}
    >
      {item.label}
    </span>
  );
  if (!item.icon) return labelNode;
  return (
    <>
      {typeof item.icon === "string" ? (
        <AfIcon name={item.icon as AffectIconKey} size={13} className="af-breadcrumb__icon" />
      ) : (
        <span className="af-breadcrumb__icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      {labelNode}
    </>
  );
}

function renderSeparatorNode(separator: AfBreadcrumbSeparator | undefined) {
  if (separator === undefined || separator === "slash") {
    return (
      <span className="af-breadcrumb__sep af-breadcrumb__sep--slash" aria-hidden="true">
        /
      </span>
    );
  }
  if (separator === "chevron") {
    return (
      <span className="af-breadcrumb__sep af-breadcrumb__sep--chevron" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M4.5 2.75 7.75 6 4.5 9.25"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-breadcrumb__sep" aria-hidden="true">
      {separator}
    </span>
  );
}

/**
 * 面包屑导航（对齐 affectUI Breadcrumb）：
 * - 默认安静 `/` 斜杠分隔（可选 `"chevron"` 或自定义节点），当前页深色加粗并带 260ms 柔和滑入过渡；
 * - 超过 `maxItems`（默认 4）或窄屏宽度不足时自动把中间层级折叠进 `…` 阶梯菜单，支持方向键漫游与 Esc 归还焦点；
 * - 仅在文本真实发生省略截断时按需挂载 `title` 提示。
 */
export const AfBreadcrumb = forwardRef<HTMLElement, AfBreadcrumbProps>(function AfBreadcrumb(
  {
    items,
    separator = "slash",
    maxItems = 4,
    maxItemWidth,
    className,
    "aria-label": ariaLabel = "Breadcrumb",
    ...rest
  },
  forwardedRef,
) {
  const navRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const ellipsisWrapRef = useRef<HTMLSpanElement | null>(null);
  const ellipsisBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [navWidth, setNavWidth] = useState<number>(0);

  const baseLimit =
    maxItems && Number.isFinite(maxItems) && maxItems >= 2 ? Math.max(2, Math.floor(maxItems)) : items.length;
  const initialMaxVisible = Math.min(items.length, baseLimit);
  const [visibleBudget, setVisibleBudget] = useState<number>(initialMaxVisible);

  // 当条目数量或容器宽度显著变宽时重置可见预算，再由下方 useLayoutEffect 窄屏自适应收敛
  useEffect(() => {
    setVisibleBudget(Math.min(items.length, baseLimit));
  }, [items.length, baseLimit, navWidth]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? nav.clientWidth);
      if (w > 0) {
        setNavWidth((prev) => (Math.abs(prev - w) >= 16 ? w : prev));
      }
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    const ol = listRef.current;
    if (!nav || !ol) return;
    if (items.length <= 2 || visibleBudget <= 2) return;
    if (nav.clientWidth > 0 && ol.scrollWidth > nav.clientWidth + 2) {
      setVisibleBudget((prev) => Math.max(2, prev - 1));
    }
  }, [visibleBudget, items]);

  const shouldCollapse = items.length > 2 && items.length > visibleBudget;
  const tailCount = shouldCollapse ? Math.max(1, visibleBudget - 2) : 0;

  const visibleEntries: Array<
    | { kind: "item"; item: AfBreadcrumbItem; key: string; isLast: boolean; originalIndex: number }
    | { kind: "overflow"; hidden: Array<{ item: AfBreadcrumbItem; depth: number }> }
  > = shouldCollapse
    ? [
        { kind: "item", item: items[0], key: items[0].id ?? "crumb-0", isLast: false, originalIndex: 0 },
        {
          kind: "overflow",
          hidden: items.slice(1, items.length - tailCount).map((item, idx) => ({
            item,
            depth: idx,
          })),
        },
        ...items.slice(items.length - tailCount).map((item, offset, arr) => {
          const origIdx = items.length - tailCount + offset;
          return {
            kind: "item" as const,
            item,
            key: item.id ?? `crumb-${origIdx}`,
            isLast: offset === arr.length - 1,
            originalIndex: origIdx,
          };
        }),
      ]
    : items.map((item, idx) => ({
        kind: "item" as const,
        item,
        key: item.id ?? `crumb-${idx}`,
        isLast: idx === items.length - 1,
        originalIndex: idx,
      }));

  const sepNode = renderSeparatorNode(separator);

  const focusMenuItem = (idx: number) => {
    window.requestAnimationFrame(() => {
      menuItemRefs.current[idx]?.focus();
    });
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>, count: number) => {
    if (count <= 0) return;
    const activeIdx = menuItemRefs.current.findIndex((el) => el === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = activeIdx < 0 ? 0 : (activeIdx + 1) % count;
      menuItemRefs.current[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = activeIdx <= 0 ? count - 1 : activeIdx - 1;
      menuItemRefs.current[prev]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      menuItemRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      menuItemRefs.current[count - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOverflowOpen(false);
      ellipsisBtnRef.current?.focus();
    }
  };

  if (items.length === 0) return null;

  return (
    <nav
      ref={composeRefs(navRef, forwardedRef)}
      className={cn("af-breadcrumb", className)}
      aria-label={ariaLabel}
      {...rest}
    >
      <ol ref={listRef} className="af-breadcrumb__list">
        {visibleEntries.map((entry) => {
          if (entry.kind === "overflow") {
            const hiddenCount = entry.hidden.length;
            return (
              <li key="crumb-overflow" className="af-breadcrumb__item">
                <span ref={ellipsisWrapRef} className="af-crumb__ellipsis-wrap">
                  <button
                    ref={ellipsisBtnRef}
                    type="button"
                    className="af-crumb__ellipsis-btn"
                    aria-label={`Show ${hiddenCount} more ${hiddenCount === 1 ? "crumb" : "crumbs"}`}
                    title={entry.hidden.map((h) => labelText(h.item.label)).filter(Boolean).join(" / ") || undefined}
                    aria-haspopup="menu"
                    aria-expanded={overflowOpen}
                    onClick={() => {
                      const next = !overflowOpen;
                      setOverflowOpen(next);
                      if (next) focusMenuItem(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOverflowOpen(true);
                        focusMenuItem(0);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
                      <path d="M6 12.5V12m12 .5V12m-6 .5V12m-5 .5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm12 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
                    </svg>
                  </button>
                  <AfPopover
                    open={overflowOpen}
                    anchorRef={ellipsisWrapRef}
                    role="menu"
                    align="start"
                    gap={6}
                    flush
                    preserveNaturalWidth
                    onPointerDownOutside={() => setOverflowOpen(false)}
                    onEscapeKeyDown={() => {
                      setOverflowOpen(false);
                      ellipsisBtnRef.current?.focus();
                    }}
                    onKeyDown={(e) => handleMenuKeyDown(e, hiddenCount)}
                    style={{ minWidth: 168 }}
                  >
                    <div className="af-menu__list af-breadcrumb__menu">
                      {entry.hidden.map(({ item: hItem, depth }, hIdx) => (
                        <button
                          key={hItem.id ?? hIdx}
                          ref={(el) => {
                            menuItemRefs.current[hIdx] = el;
                          }}
                          type="button"
                          role="menuitem"
                          className="af-menu__item af-breadcrumb__menu-item"
                          style={{ "--depth": depth } as CSSProperties}
                          onClick={() => {
                            setOverflowOpen(false);
                            hItem.onClick?.();
                            if (hItem.href && !hItem.onClick && typeof window !== "undefined") {
                              if (hItem.target === "_blank") {
                                window.open(hItem.href, "_blank", "noopener,noreferrer");
                              } else {
                                window.location.assign(hItem.href);
                              }
                            }
                          }}
                        >
                          {depth > 0 ? (
                            <span className="af-breadcrumb__menu-indent" aria-hidden="true">
                              ↳
                            </span>
                          ) : null}
                          <span className="af-breadcrumb__menu-label">{hItem.label}</span>
                        </button>
                      ))}
                    </div>
                  </AfPopover>
                </span>
                {sepNode}
              </li>
            );
          }

          const { item, key, isLast } = entry;
          const content = renderBreadcrumbContent(item, maxItemWidth, isLast);
          const safeRel = item.target === "_blank" && !item.rel ? "noopener noreferrer" : item.rel;
          const currentKey = item.id ?? labelText(item.label) ?? key;

          return (
            <li
              key={isLast ? `current-${currentKey}` : key}
              className="af-breadcrumb__item af-crumb__item"
              data-truncated={maxItemWidth ? true : undefined}
            >
              {isLast ? (
                <span className="af-breadcrumb__current" aria-current="page">
                  {content}
                </span>
              ) : item.asChild && isValidElement(item.label) ? (
                <AfSlot className="af-breadcrumb__link" onClick={item.onClick}>
                  {item.label}
                </AfSlot>
              ) : item.href ? (
                <a
                  className="af-breadcrumb__link"
                  href={item.href}
                  target={item.target}
                  rel={safeRel}
                  onClick={item.onClick}
                >
                  {content}
                </a>
              ) : item.onClick ? (
                <button type="button" className="af-breadcrumb__link" onClick={item.onClick}>
                  {content}
                </button>
              ) : (
                <span className="af-breadcrumb__text">{content}</span>
              )}
              {isLast ? null : sepNode}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
