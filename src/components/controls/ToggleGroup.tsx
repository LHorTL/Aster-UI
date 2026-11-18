import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn, composeRefs, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** ToggleGroup 单项配置。 */
export type AfToggleGroupOption<T extends string = string> = {
  /** 选项唯一值。 */
  value: T;
  /** 可见文字标签（纯图标按钮时可省略并传入 `ariaLabel`）。 */
  label?: ReactNode;
  /** 可选计数徽标。 */
  count?: ReactNode;
  /** 图标键名或自定义元素。 */
  icon?: AfIconName | ReactNode;
  /** 纯图标模式下的无障碍名称。 */
  ariaLabel?: string;
  /** 悬浮提示文案。 */
  tip?: string;
  /** 禁用此项（保持键盘方向键可达但不可点击）。 */
  disabled?: boolean;
};

/** ToggleGroup 共享属性。 */
type AfToggleGroupSharedProps<T extends string = string> = {
  /** 选项列表（与 `items` 二选一，优先使用 `options`）。 */
  options?: AfToggleGroupOption<T>[];
  /** `options` 的同义属性（affectUI API 兼容）。 */
  items?: AfToggleGroupOption<T>[];
  /** 外观：`"tray"` 紧凑托盘（单选带滑动指示胶囊） | `"buttons"` / `"chips"` 独立发丝按钮组。 */
  variant?: "tray" | "buttons" | "chips";
  /** 尺寸：xs 24 / sm 28 / md 32 / lg 36。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 排列方向：横向或纵向。 */
  orientation?: "horizontal" | "vertical";
  /** 无障碍工具栏名称。 */
  label?: string;
  /** 原生 `aria-label`。 */
  "aria-label"?: string;
  /** 关联外部标题元素的 id。 */
  "aria-labelledby"?: string;
  /** 整组禁用。 */
  disabled?: boolean;
  /** 原生表单字段名（渲染隐藏字段以支持原生提交）。 */
  name?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

export type AfToggleGroupSingleProps<T extends string = string> = AfToggleGroupSharedProps<T> & {
  /** 单选模式（默认）。 */
  type?: "single";
  /** 受控当前值（传 `null` 或 `""` 表示清空）。 */
  value?: T | null;
  /** 非受控初始值。 */
  defaultValue?: T | null;
  /** 变化回调。 */
  onChange?: (value: T | null) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: T | null) => void;
  /** 再次点击已选项时是否允许取消选中，默认 `true`。 */
  allowClear?: boolean;
};

export type AfToggleGroupMultipleProps<T extends string = string> = AfToggleGroupSharedProps<T> & {
  /** 多选模式。 */
  type: "multiple";
  /** 受控已选值数组。 */
  value?: T[];
  /** 非受控初始已选值数组。 */
  defaultValue?: T[];
  /** 变化回调。 */
  onChange?: (value: T[]) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: T[]) => void;
  allowClear?: boolean;
};

export type AfToggleGroupProps<T extends string = string> =
  | AfToggleGroupSingleProps<T>
  | AfToggleGroupMultipleProps<T>;

export type AfToggleGroupComponent = {
  <T extends string = string>(props: AfToggleGroupProps<T> & RefAttributes<HTMLDivElement>): ReactElement | null;
  displayName?: string;
};

function renderIconNode(icon: AfIconName | ReactNode, size: number) {
  return typeof icon === "string" ? (
    <AfIcon name={icon as AfIconName} size={size} className="af-toggle-group__icon" />
  ) : (
    <span className="af-toggle-group__icon" aria-hidden="true">
      {icon}
    </span>
  );
}

function AfToggleGroupInner<T extends string>(
  props: AfToggleGroupProps<T>,
  forwardedRef: Ref<HTMLDivElement>,
) {
  const {
    options: optionsProp,
    items,
    variant = "tray",
    size = "md",
    orientation = "horizontal",
    label,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledByProp,
    disabled = false,
    name,
    className,
    style,
  } = props;
  const options = optionsProp ?? items ?? [];
  const resolvedVariant = variant === "buttons" ? "chips" : variant;
  const resolvedAriaLabel = ariaLabelProp ?? (ariaLabelledByProp ? undefined : (label ?? "切换选项组"));
  const fieldCtx = useAfFormFieldControl();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const prevSingleIdxRef = useRef<number>(-1);
  const isMultiple = props.type === "multiple";
  const allowClear = isMultiple ? true : (props.allowClear ?? true);

  const [singleValue, setSingleValue] = useControllableState<T | null>({
    value: !isMultiple ? props.value : undefined,
    defaultValue: !isMultiple ? (props.defaultValue ?? null) : null,
    onChange: !isMultiple
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });

  const [multiValue, setMultiValue] = useControllableState<T[]>({
    value: isMultiple ? props.value : undefined,
    defaultValue: isMultiple ? (props.defaultValue ?? []) : [],
    onChange: isMultiple
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });

  const [focusIdx, setFocusIdx] = useState<number>(() => {
    if (!isMultiple && singleValue) {
      const idx = options.findIndex((opt) => opt.value === singleValue);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const [ready, setReady] = useState(false);
  const [pill, setPill] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    right: number;
    useInset: boolean;
  } | null>(null);
  const supportsFocusGroup = typeof HTMLElement !== "undefined" && "focusGroup" in HTMLElement.prototype;

  const isSelected = (val: T) => (isMultiple ? multiValue.includes(val) : singleValue === val);

  const activeSingleIdx = !isMultiple && singleValue ? options.findIndex((o) => o.value === singleValue) : -1;
  const optionSignature = options.map((o) => `${o.value}:${Boolean(o.disabled)}`).join("|");

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (prevSingleIdxRef.current >= 0 && activeSingleIdx >= 0 && activeSingleIdx !== prevSingleIdxRef.current) {
      setDir(activeSingleIdx > prevSingleIdxRef.current ? "right" : "left");
    }
    prevSingleIdxRef.current = activeSingleIdx;
  }, [activeSingleIdx]);

  useIsomorphicLayoutEffect(() => {
    if (resolvedVariant !== "tray" || isMultiple || orientation !== "horizontal" || activeSingleIdx < 0) {
      setPill(null);
      return;
    }
    const root = rootRef.current;
    const target = itemRefs.current[activeSingleIdx];
    if (!root || !target) {
      setPill(null);
      return;
    }
    const update = () => {
      const rootW = root.clientWidth;
      const x = target.offsetLeft;
      const y = target.offsetTop;
      const w = target.offsetWidth;
      const h = target.offsetHeight;
      const useInset = rootW > 0 && w > 0;
      const right = useInset ? Math.max(0, rootW - x - w) : 0;
      setPill((prev) =>
        prev &&
        prev.x === x &&
        prev.y === y &&
        prev.w === w &&
        prev.h === h &&
        prev.right === right &&
        prev.useInset === useInset
          ? prev
          : { x, y, w, h, right, useInset },
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(root);
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeSingleIdx, resolvedVariant, isMultiple, orientation, optionSignature, size]);

  const toggleOption = (opt: AfToggleGroupOption<T>) => {
    if (disabled || opt.disabled) return;
    if (isMultiple) {
      const exists = multiValue.includes(opt.value);
      setMultiValue(exists ? multiValue.filter((item) => item !== opt.value) : [...multiValue, opt.value]);
      return;
    }
    if (singleValue === opt.value) {
      if (allowClear) setSingleValue(null);
    } else {
      setSingleValue(opt.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    const isVert = orientation === "vertical";
    const rtl = typeof window !== "undefined" && rootRef.current ? getComputedStyle(rootRef.current).direction === "rtl" : false;

    let step = 0;
    if (isVert) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") step = 1;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") step = -1;
    } else {
      if (event.key === "ArrowRight") step = rtl ? -1 : 1;
      else if (event.key === "ArrowLeft") step = rtl ? 1 : -1;
      else if (event.key === "ArrowDown") step = 1;
      else if (event.key === "ArrowUp") step = -1;
    }

    let nextIdx: number | null = null;
    if (step !== 0) {
      nextIdx = (focusIdx + step + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIdx = 0;
    } else if (event.key === "End") {
      nextIdx = options.length - 1;
    }

    if (nextIdx !== null) {
      event.preventDefault();
      setFocusIdx(nextIdx);
      itemRefs.current[nextIdx]?.focus();
    }
  };

  const iconSize = size === "xs" || size === "sm" ? 13 : 14;
  const focusGroupAttr = orientation === "vertical" ? "toolbar wrap block" : "toolbar wrap";

  return (
    <div
      ref={composeRefs(rootRef, forwardedRef)}
      role="toolbar"
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledByProp}
      aria-describedby={fieldCtx?.describedBy}
      aria-orientation={orientation}
      aria-disabled={disabled || undefined}
      {...({ focusgroup: focusGroupAttr } as Record<string, string>)}
      className={cn("af-toggle-group", className)}
      data-variant={resolvedVariant}
      data-size={size}
      data-orientation={orientation}
      data-ready={ready || undefined}
      data-dir={dir ?? undefined}
      data-disabled={disabled || undefined}
      style={style}
      onKeyDown={handleKeyDown}
    >
      {name && !disabled
        ? isMultiple
          ? multiValue.map((val) => <input key={val} type="hidden" name={name} value={val} />)
          : singleValue !== null && singleValue !== ""
            ? <input type="hidden" name={name} value={singleValue} />
            : null
        : null}

      {resolvedVariant === "tray" && !isMultiple && orientation === "horizontal" && pill ? (
        <span
          className="af-toggle-group__pill"
          data-inset={pill.useInset || undefined}
          aria-hidden="true"
          style={
            pill.useInset
              ? {
                  left: pill.x,
                  right: pill.right,
                  top: pill.y,
                  height: pill.h,
                }
              : {
                  transform: `translate(${pill.x}px, ${pill.y}px)`,
                  width: pill.w,
                  height: pill.h,
                }
          }
        />
      ) : null}

      {options.map((opt, index) => {
        const selected = isSelected(opt.value);
        const itemDisabled = Boolean(disabled || opt.disabled);
        const iconOnly = !opt.label && Boolean(opt.icon);
        return (
          <button
            key={opt.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            id={index === 0 ? fieldCtx?.controlId : undefined}
            className="af-toggle-group__item"
            data-icon-only={iconOnly || undefined}
            aria-pressed={selected}
            aria-label={opt.ariaLabel}
            aria-disabled={itemDisabled || undefined}
            title={opt.tip ?? (iconOnly ? opt.ariaLabel : undefined)}
            tabIndex={supportsFocusGroup ? undefined : index === focusIdx ? 0 : -1}
            onFocus={() => setFocusIdx(index)}
            onClick={(event) => {
              if (itemDisabled) {
                event.preventDefault();
                return;
              }
              toggleOption(opt);
            }}
          >
            {opt.icon ? renderIconNode(opt.icon, iconSize) : null}
            {opt.label ? <span className="af-toggle-group__label">{opt.label}</span> : null}
            {opt.count !== undefined ? <span className="af-toggle-group__count">{opt.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * ToggleGroup 切换按钮组（affectUI 1:1 复刻）：
 * - 支持单选/多选、`tray` 紧凑托盘（单选带平滑滑动胶囊）与 `chips` 独立按钮；
 * - 单一 Tab 停靠点与方向键游标导航（优先原生 `focusgroup`，不支持时自动降级 roving tabindex）；
 * - 通过 `[aria-pressed="true"]` 驱动状态样式，确保可访问状态与视觉零偏差。
 */
export const AfToggleGroup = forwardRef(AfToggleGroupInner) as AfToggleGroupComponent;
AfToggleGroup.displayName = "AfToggleGroup";
