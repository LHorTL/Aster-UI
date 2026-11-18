import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { AfIcon } from "../../icons";
import { cn, composeRefs, useControllableState } from "../../primitives";

/** 手风琴单项定义。 */
export type AfAccordionItem = {
  /** 唯一标识。 */
  key: string;
  /** 标题（直接渲染在 `<summary>` 内，切勿嵌套 `h1-h6` 以保障屏幕阅读器按钮语义）。 */
  title: ReactNode;
  /** 次级简短说明。 */
  subtitle?: ReactNode;
  /** 右侧附加信息（如标签、状态计数）。 */
  extra?: ReactNode;
  /** 展开面板内容。 */
  content?: ReactNode;
  /** `content` 的同义别名。 */
  children?: ReactNode;
  /** 是否禁用该项切换。 */
  disabled?: boolean;
};

/** 手风琴外观变体。 */
export type AfAccordionVariant = "bordered" | "flush" | "separated";

/** 手风琴属性。 */
export type AfAccordionProps = Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> & {
  /** 面板条目列表。 */
  items: AfAccordionItem[];
  /**
   * 展开模式：
   * - `"multiple"`（默认）：允许同时展开多项，避免内容跳变；
   * - `"single"`：互斥手风琴，使用原生 `<details name>` 并带低版本回退。
   */
  type?: "multiple" | "single";
  /** 受控展开项 key（支持单个字符串或数组）。 */
  value?: string | string[];
  /** 非受控初始展开项 key（支持单个字符串或数组）。 */
  defaultValue?: string | string[];
  /** 展开项变化回调。 */
  onChange?: (openKeys: string[]) => void;
  /** 在 `type="single"` 模式下是否允许将最后打开的一项也收起，默认 `true`。 */
  collapsible?: boolean;
  /** 在 `type="multiple"` 模式下是否显示“全部展开 / 全部收起”按钮。 */
  showToggleAll?: boolean;
  /** 自定义全部展开/收起按钮文案。 */
  toggleAllLabels?: { expand?: string; collapse?: string };
  /** 视觉变体：发丝边框卡片 / 极简分割线 / 独立卡片间距。 */
  variant?: AfAccordionVariant;
  /** 组无障碍名称（可选）。 */
  label?: string;
};

function normalizeKeys(input: string | string[] | undefined, single: boolean): string[] {
  if (input === undefined) return [];
  const arr = Array.isArray(input) ? input : [input];
  return single ? arr.slice(0, 1) : arr;
}

/**
 * 原生语义手风琴：基于 `<details>` + `<summary>` 与 `::details-content` 尺寸插值过渡构建。
 * 遵循无障碍规范：指示箭头紧邻文字左侧、不在 `<summary>` 内嵌套标题元素、支持互斥 `name` 回退与全部展开同步。
 */
export const AfAccordion = forwardRef<HTMLDivElement, AfAccordionProps>(function AfAccordion(
  {
    items,
    type = "multiple",
    value: valueProp,
    defaultValue,
    onChange,
    collapsible = true,
    showToggleAll = false,
    toggleAllLabels,
    variant = "bordered",
    label,
    className,
    ...rest
  },
  forwardedRef,
) {
  const isSingle = type === "single";
  const groupId = useId();
  const groupName = `af-acc-${groupId.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const isControlled = valueProp !== undefined;

  const normalizedControlled = useMemo(
    () => (valueProp !== undefined ? normalizeKeys(valueProp, isSingle) : undefined),
    [valueProp, isSingle],
  );

  const [openKeys, setOpenKeys] = useControllableState<string[]>({
    value: normalizedControlled,
    defaultValue: normalizeKeys(defaultValue, isSingle),
    onChange,
  });

  const openSet = useMemo(() => new Set(openKeys), [openKeys]);

  // Fallback for browsers where HTMLDetailsElement.prototype.name is unavailable
  useEffect(() => {
    if (!isSingle || typeof HTMLDetailsElement === "undefined") return;
    if (Object.hasOwn(HTMLDetailsElement.prototype, "name")) return;
    const root = rootRef.current;
    if (!root) return;

    const handleCaptureToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      if (target.getAttribute("name") !== groupName) return;
      const peers = root.querySelectorAll<HTMLDetailsElement>(`details[name="${CSS.escape(groupName)}"]`);
      for (const peer of peers) {
        if (peer !== target && peer.open) {
          peer.open = false;
        }
      }
    };

    root.addEventListener("toggle", handleCaptureToggle, { capture: true });
    return () => root.removeEventListener("toggle", handleCaptureToggle, { capture: true });
  }, [isSingle, groupName]);

  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const allEnabledOpen = enabledItems.length > 0 && enabledItems.every((item) => openSet.has(item.key));

  const commitKeys = (nextKeys: string[]) => {
    const deduped = Array.from(new Set(nextKeys));
    setOpenKeys(isSingle ? deduped.slice(0, 1) : deduped);
  };

  const handleSummaryClick = (event: MouseEvent<HTMLElement>, item: AfAccordionItem, isOpen: boolean) => {
    const lockedOpen = isSingle && !collapsible && isOpen;
    if (item.disabled || lockedOpen) {
      event.preventDefault();
      return;
    }
    if (isControlled) {
      event.preventDefault();
      if (isOpen) {
        commitKeys(openKeys.filter((k) => k !== item.key));
      } else if (isSingle) {
        commitKeys([item.key]);
      } else {
        commitKeys([...openKeys, item.key]);
      }
    }
  };

  const handleDetailsToggle = (event: SyntheticEvent<HTMLDetailsElement>, item: AfAccordionItem) => {
    if (isControlled) return;
    const nextOpen = event.currentTarget.open;
    if (nextOpen) {
      if (isSingle) {
        commitKeys([item.key]);
      } else if (!openSet.has(item.key)) {
        commitKeys([...openKeys, item.key]);
      }
    } else if (openSet.has(item.key)) {
      commitKeys(openKeys.filter((k) => k !== item.key));
    }
  };

  const handleToggleAll = () => {
    const shouldExpand = !allEnabledOpen;
    const disabledOpenKeys = items.filter((item) => item.disabled && openSet.has(item.key)).map((item) => item.key);
    const nextKeys = shouldExpand
      ? [...disabledOpenKeys, ...enabledItems.map((item) => item.key)]
      : disabledOpenKeys;

    if (!isControlled && rootRef.current) {
      const nodes = rootRef.current.querySelectorAll<HTMLDetailsElement>(":scope > .af-accordion__list > details.af-accordion__item");
      nodes.forEach((node) => {
        const key = node.dataset.itemKey;
        if (key && !items.find((i) => i.key === key)?.disabled) {
          node.open = shouldExpand;
        }
      });
    }
    commitKeys(nextKeys);
  };

  const expandText = toggleAllLabels?.expand ?? "全部展开";
  const collapseText = toggleAllLabels?.collapse ?? "全部收起";

  return (
    <div
      ref={composeRefs(rootRef, forwardedRef)}
      className={cn("af-accordion", className)}
      data-variant={variant}
      data-type={type}
      aria-label={label}
      {...rest}
    >
      {!isSingle && showToggleAll && enabledItems.length > 0 ? (
        <div className="af-accordion__toolbar">
          <button
            type="button"
            className="af-accordion__toggle-all"
            aria-expanded={allEnabledOpen}
            onClick={handleToggleAll}
          >
            {allEnabledOpen ? collapseText : expandText}
          </button>
        </div>
      ) : null}
      <div className="af-accordion__list">
        {items.map((item) => {
          const isOpen = openSet.has(item.key);
          const lockedOpen = isSingle && !collapsible && isOpen;
          const summaryDisabled = Boolean(item.disabled || lockedOpen);
          const body = item.content ?? item.children;

          return (
            <details
              key={item.key}
              className="af-accordion__item"
              data-item-key={item.key}
              data-disabled={item.disabled || undefined}
              name={isSingle ? groupName : undefined}
              open={isOpen}
              onToggle={(event) => handleDetailsToggle(event, item)}
            >
              <summary
                className="af-accordion__summary"
                aria-disabled={summaryDisabled ? "true" : undefined}
                onClick={(event) => handleSummaryClick(event, item, isOpen)}
              >
                <AfIcon name="chevronDown" size={14} className="af-accordion__chevron" />
                <span className="af-accordion__heading">
                  <span className="af-accordion__title">{item.title}</span>
                  {item.subtitle ? <span className="af-accordion__subtitle">{item.subtitle}</span> : null}
                </span>
                {item.extra ? <span className="af-accordion__extra">{item.extra}</span> : null}
              </summary>
              <div className="af-accordion__panel">
                <div className="af-accordion__body">{body}</div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
});

/** `AfAccordion` 的语义别名（兼容 `Collapse` 导出契约）。 */
export type AfCollapseItem = AfAccordionItem;
export type AfCollapseProps = AfAccordionProps;
export const AfCollapse = AfAccordion;
