import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";

/** 标签页数据。 */
export type AfTabItem = {
  /** 唯一键。 */
  key: string;
  /** 标签文字。 */
  label: ReactNode;
  /** 标签页正文。 */
  content?: ReactNode;
  /** `content` 的兼容别名。 */
  children?: ReactNode;
  /** 前置图标。 */
  icon?: AfIconName | ReactNode;
  /** 右侧计数徽标。 */
  count?: number;
  /** 是否允许关闭该标签页。 */
  closable?: boolean;
  /** 是否禁用。 */
  disabled?: boolean;
};

/** 标签页属性。 */
export type AfTabsProps = {
  /** 标签页数据。 */
  items: AfTabItem[];
  /** 受控激活键。 */
  activeKey?: string;
  /** 非受控初始激活键。 */
  defaultActiveKey?: string;
  /** 切换回调。 */
  onChange?: (key: string) => void;
  /** 关闭某个可关闭标签页时的回调。 */
  onTabClose?: (key: string) => void;
  /** 视觉样式：下划线 / 胶囊 / 分段，默认 `"line"`。 */
  variant?: "line" | "pill" | "segmented";
  /** 标签条右侧附加操作区。 */
  extra?: ReactNode;
  /** `extra` 的兼容别名。 */
  tabBarExtraContent?: ReactNode;
  /** 切换标签时是否保持未激活面板挂载（使用 `hidden` 保留内部表单状态）。 */
  keepMounted?: boolean;
  /** 标签条居中。 */
  centered?: boolean;
  /** 占满父容器，正文独立滚动。 */
  fill?: boolean;
  /** 标签栏无障碍名称。 */
  ariaLabel?: string;
  /** 标签栏无障碍名称（与 `ariaLabel` 等效，`aria-label` 优先）。 */
  "aria-label"?: string;
  /** 根节点附加类名。 */
  className?: string;
  /** 标签条附加类名。 */
  tabBarClassName?: string;
  /** 正文附加类名。 */
  contentClassName?: string;
  /** 根节点内联样式。 */
  style?: CSSProperties;
};

type StretchIndicatorState = {
  left: number;
  right: number;
  width: number;
  dir: "right" | "left" | "none";
  ready: boolean;
  resizing: boolean;
};

/**
 * 标签页（affectUI 1:1 复刻）：
 * - 三种视觉样式（line / pill / segmented）共享前缘拉伸阻尼滑块（`left` + `right` 异步收敛，零过冲）；
 * - 恒定 `font-weight: 500` 杜绝激活抖动，支持图标、计数徽标、可关闭标签回退、右侧扩展区与键盘漫游。
 */
export const AfTabs = forwardRef<HTMLDivElement, AfTabsProps>(function AfTabs(
  {
    items,
    activeKey,
    defaultActiveKey,
    onChange,
    onTabClose,
    variant = "line",
    extra,
    tabBarExtraContent,
    keepMounted = false,
    centered,
    fill,
    ariaLabel,
    "aria-label": ariaLabelProp,
    className,
    tabBarClassName,
    contentClassName,
    style,
  },
  ref,
) {
  const instanceId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const firstEnabled = useMemo(
    () => items.find((item) => !item.disabled)?.key ?? items[0]?.key ?? "",
    [items],
  );
  const [innerKey, setInnerKey] = useState(defaultActiveKey ?? firstEnabled);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const prevLeftRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ barWidth: number; width: number } | null>(null);
  const initialKeyRef = useRef<string | null>(null);
  const [hasSwitched, setHasSwitched] = useState(false);
  const [indicator, setIndicator] = useState<StretchIndicatorState | null>(null);

  const key = activeKey ?? innerKey;
  const active =
    items.find((item) => item.key === key && !item.disabled) ??
    items.find((item) => item.key === firstEnabled);
  const activeItem = active ?? items[0];
  const resolvedExtra = extra ?? tabBarExtraContent;

  if (initialKeyRef.current === null && activeItem) {
    initialKeyRef.current = activeItem.key;
  }

  useIsomorphicLayoutEffect(() => {
    if (activeItem && initialKeyRef.current !== null && activeItem.key !== initialKeyRef.current && !hasSwitched) {
      setHasSwitched(true);
    }
  }, [activeItem, hasSwitched]);

  const itemsSignature = useMemo(
    () => items.map((it) => `${it.key}:${it.disabled ? 1 : 0}:${it.count ?? ""}:${it.closable ? 1 : 0}`).join("|"),
    [items],
  );

  // Sync uncontrolled innerKey if active tab was closed/removed
  useEffect(() => {
    if (activeKey === undefined && activeItem && innerKey !== activeItem.key) {
      setInnerKey(activeItem.key);
    }
  }, [activeItem, activeKey, innerKey]);

  useIsomorphicLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let resizeSnapFrame = 0;

    const measure = (markReady: boolean, fromResize = false) => {
      const selected = bar.querySelector<HTMLElement>("[data-selected='true']");
      if (!selected) {
        setIndicator(null);
        return;
      }
      const barWidth = bar.clientWidth;
      const left = selected.offsetLeft;
      const width = selected.offsetWidth;
      if (
        fromResize &&
        lastSizeRef.current &&
        lastSizeRef.current.barWidth === barWidth &&
        lastSizeRef.current.width === width
      ) {
        return;
      }
      lastSizeRef.current = { barWidth, width };

      const right = Math.max(0, barWidth - (left + width));
      const prevLeft = prevLeftRef.current;
      const dir: "right" | "left" | "none" =
        fromResize || prevLeft === null || Math.abs(left - prevLeft) < 0.5
          ? "none"
          : left > prevLeft
            ? "right"
            : "left";
      prevLeftRef.current = left;

      setIndicator((prev) => {
        const nextReady = prev?.ready || markReady;
        if (
          prev &&
          prev.left === left &&
          prev.right === right &&
          prev.width === width &&
          prev.ready === nextReady &&
          prev.resizing === fromResize
        ) {
          return prev;
        }
        return {
          left,
          right,
          width,
          dir: dir === "none" ? (prev?.dir ?? "none") : dir,
          ready: Boolean(nextReady),
          resizing: fromResize,
        };
      });

      if (fromResize) {
        cancelAnimationFrame(resizeSnapFrame);
        resizeSnapFrame = requestAnimationFrame(() => {
          setIndicator((prev) => (prev && prev.resizing ? { ...prev, resizing: false } : prev));
        });
      }
    };

    measure(false, false);
    const frame = requestAnimationFrame(() => measure(true, false));
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure(true, true)) : null;
    ro?.observe(bar);
    const selectedEl = bar.querySelector<HTMLElement>("[data-selected='true']");
    if (selectedEl) ro?.observe(selectedEl);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeSnapFrame);
      ro?.disconnect();
    };
  }, [variant, activeItem?.key, itemsSignature, centered]);

  const select = (item: AfTabItem) => {
    if (item.disabled) return;
    if (activeKey === undefined) setInnerKey(item.key);
    onChange?.(item.key);
  };

  const handleTabClose = (closingKey: string, closingIndex: number) => {
    if (closingKey === activeItem?.key) {
      const fallback =
        items
          .slice(0, closingIndex)
          .reverse()
          .find((it) => !it.disabled) ??
        items.slice(closingIndex + 1).find((it) => !it.disabled);
      if (fallback) {
        if (activeKey === undefined) setInnerKey(fallback.key);
        onChange?.(fallback.key);
      }
    }
    onTabClose?.(closingKey);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const currentItem = items[index];
    if ((event.key === "Delete" || event.key === "Backspace") && currentItem?.closable && !currentItem.disabled) {
      event.preventDefault();
      handleTabClose(currentItem.key, index);
      return;
    }

    const enabledIndexes = items
      .map((item, itemIndex) => (!item.disabled ? itemIndex : -1))
      .filter((itemIndex) => itemIndex >= 0);
    if (!enabledIndexes.length) return;
    let target = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      const current = enabledIndexes.indexOf(index);
      target = enabledIndexes[(current + 1) % enabledIndexes.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      const current = enabledIndexes.indexOf(index);
      target = enabledIndexes[(current - 1 + enabledIndexes.length) % enabledIndexes.length];
    } else if (event.key === "Home") {
      target = enabledIndexes[0];
    } else if (event.key === "End") {
      target = enabledIndexes[enabledIndexes.length - 1];
    } else {
      return;
    }
    event.preventDefault();
    select(items[target]);
    tabsRef.current[target]?.focus();
  };

  const tabIdOf = (itemKey: string) => `${instanceId}-tab-${itemKey}`;
  const panelIdOf = (itemKey: string) => `${instanceId}-panel-${itemKey}`;

  const barElement = (
    <div
      ref={barRef}
      className={cn("af-tabs__bar", tabBarClassName)}
      role="tablist"
      aria-label={ariaLabelProp ?? ariaLabel}
      data-centered={centered || undefined}
    >
      {indicator ? (
        <span
          className="af-tabs__indicator"
          data-dir={indicator.dir !== "none" ? indicator.dir : undefined}
          style={
            {
              left: indicator.left,
              right: indicator.right,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      ) : null}
      {items.map((item, index) => {
        const selected = item.key === activeItem?.key;
        return (
          <button
            key={item.key}
            ref={(element) => {
              tabsRef.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabIdOf(item.key)}
            aria-selected={selected}
            aria-controls={keepMounted || selected ? panelIdOf(item.key) : undefined}
            aria-disabled={item.disabled || undefined}
            tabIndex={selected ? 0 : -1}
            className="af-tabs__tab"
            data-selected={selected ? "true" : undefined}
            disabled={item.disabled}
            onClick={() => select(item)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {item.icon ? (
              typeof item.icon === "string" ? (
                <AfIcon name={item.icon} size={14} className="af-tabs__icon" />
              ) : (
                <span className="af-tabs__icon">{item.icon}</span>
              )
            ) : null}
            <span>{item.label}</span>
            {item.count !== undefined ? <span className="af-tabs__count">{item.count}</span> : null}
            {item.closable && !item.disabled ? (
              <span
                role="button"
                tabIndex={-1}
                className="af-tabs__close"
                aria-label={`关闭 ${typeof item.label === "string" ? item.label : item.key}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleTabClose(item.key, index);
                }}
              >
                <AfIcon name="x" size={11} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={ref}
      className={cn("af-tabs", className)}
      style={style}
      data-variant={variant}
      data-fill={fill || undefined}
      data-ready={indicator?.ready ? "true" : undefined}
      data-resizing={indicator?.resizing ? "true" : undefined}
    >
      {resolvedExtra !== undefined ? (
        <div className="af-tabs__head">
          {barElement}
          <div className="af-tabs__extra">{resolvedExtra}</div>
        </div>
      ) : (
        barElement
      )}
      {keepMounted
        ? items.map((item) => {
            const selected = item.key === activeItem?.key;
            const panelBody = item.content ?? item.children;
            if (panelBody === undefined) return null;
            return (
              <div
                key={item.key}
                className={cn("af-tabs__content", contentClassName)}
                id={panelIdOf(item.key)}
                role="tabpanel"
                aria-labelledby={tabIdOf(item.key)}
                hidden={!selected}
                data-entering={selected && hasSwitched ? "true" : undefined}
                tabIndex={selected ? 0 : -1}
              >
                {panelBody}
              </div>
            );
          })
        : activeItem && (activeItem.content ?? activeItem.children) !== undefined ? (
            <div
              key={activeItem.key}
              className={cn("af-tabs__content", contentClassName)}
              id={panelIdOf(activeItem.key)}
              role="tabpanel"
              aria-labelledby={tabIdOf(activeItem.key)}
              data-entering={hasSwitched ? "true" : undefined}
              tabIndex={0}
            >
              {activeItem.content ?? activeItem.children}
            </div>
          ) : null}
    </div>
  );
});
