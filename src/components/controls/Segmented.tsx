import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, composeRefs, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** 分段选项。 */
export type AfSegmentOption<T extends string = string> = {
  /** 选项值。 */
  value: T;
  /** 选项文字；纯图标分段可省略并传入 `ariaLabel`。 */
  label?: ReactNode;
  /** 左侧图标：图标名或任意 ReactNode。 */
  icon?: AffectIconKey | ReactNode;
  /** 纯图标选项的无障碍名称。 */
  ariaLabel?: string;
  /** 可选的计数徽标。 */
  count?: number;
  /** 紧凑胶囊附加标签（affectUI Segmented 兼容字段）。 */
  badge?: ReactNode;
  /** 关联受控面板 id（tabs 模式下映射为 `aria-controls`）。 */
  controls?: string;
  /** 该选项是否禁用（单项降到 40%）。 */
  disabled?: boolean;
};

/** 分段控件属性。 */
export type AfSegmentedProps<T extends string = string> = {
  /** 选项列表。 */
  options: AfSegmentOption<T>[];
  /** 受控当前值。 */
  value?: T;
  /** 非受控初始值。 */
  defaultValue?: T;
  /** 切换回调。 */
  onChange?: (value: T) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: T) => void;
  /** 原生表单字段名。 */
  name?: string;
  /**
   * tray（默认）为灰托盘上的白滑块；buttons 为 Clean 的独立发丝 chip；
   * tabs（capsule 为旧别名）为页面级 #f5f5f5 页签；underline（line 为旧别名）为下划线页签。
   */
  variant?: "tray" | "pill" | "buttons" | "tabs" | "capsule" | "underline" | "line";
  /** 语义模式：`tabs`（默认，渲染 `tablist`/`tab`）或 `radio`（表单枚举单选，渲染 `radiogroup`/`radio`）。 */
  kind?: "tabs" | "radio";
  /** 高度尺寸：xs 24 / sm 26 / md 30（默认保持 tray 紧凑比例）/ lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 是否等宽撑满整行。 */
  block?: boolean;
  /** `block` 的同义属性（affectUI API 兼容）。 */
  fullWidth?: boolean;
  /** 无障碍名称。 */
  label?: string;
  /** 原生 `aria-label`（优先级高于默认 `label`）。 */
  "aria-label"?: string;
  /** 关联外部标题元素的 id。 */
  "aria-labelledby"?: string;
  /** 整组禁用：整组降到 50%。 */
  disabled?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

export type AfSegmentedComponent = {
  <T extends string = string>(props: AfSegmentedProps<T> & RefAttributes<HTMLDivElement>): ReactElement | null;
  displayName?: string;
};

function AfSegmentedInner<T extends string>(
  {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    onValueChange,
    name,
    variant = "tray",
    kind = "tabs",
    size = "md",
    block = false,
    fullWidth = false,
    label,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledByProp,
    disabled,
    className,
    style,
  }: AfSegmentedProps<T>,
  forwardedRef: Ref<HTMLDivElement>,
) {
  const fieldCtx = useAfFormFieldControl();
  const isBlock = Boolean(block || fullWidth);
  const isRadio = kind === "radio";
  const resolvedAriaLabel = ariaLabelProp ?? (ariaLabelledByProp ? undefined : (label ?? "分段切换"));
  const fallbackValue = (defaultValue ?? options.find((opt) => !opt.disabled)?.value ?? options[0]?.value ?? "") as T;
  const [value, setValue] = useControllableState<T>({
    value: valueProp,
    defaultValue: fallbackValue,
    onChange: (next) => {
      onChange?.(next);
      onValueChange?.(next);
    },
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const prevIndexRef = useRef<number>(-1);
  const lastSizeRef = useRef<{ rootW: number; x: number; w: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number; right: number; useInset: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const optionKey = options
    .map(
      (option) =>
        `${option.value}:${typeof option.label === "string" ? option.label : "node"}:${typeof option.icon === "string" ? option.icon : option.icon ? "icon" : ""}:${option.count ?? ""}:${option.disabled ? 1 : 0}`,
    )
    .join("|");

  useIsomorphicLayoutEffect(() => {
    if (prevIndexRef.current >= 0 && activeIndex >= 0 && activeIndex !== prevIndexRef.current) {
      setDir(activeIndex > prevIndexRef.current ? "right" : "left");
    }
    if (activeIndex >= 0) {
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let resizeFrame = 0;
    const measure = (fromResize = false) => {
      const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
      const active = root.querySelector<HTMLElement>(`[data-value="${escaped}"]`);
      if (!active) return;
      const rootW = root.clientWidth;
      const x = active.offsetLeft;
      const w = active.offsetWidth;
      if (
        fromResize &&
        lastSizeRef.current &&
        lastSizeRef.current.rootW === rootW &&
        lastSizeRef.current.x === x &&
        lastSizeRef.current.w === w
      ) {
        return;
      }
      lastSizeRef.current = { rootW, x, w };
      const useInset = rootW > 0 && w > 0;
      const right = useInset ? Math.max(0, rootW - x - w) : 0;
      if (fromResize) {
        setResizing(true);
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => setResizing(false));
      }
      setThumb((prev) =>
        prev && prev.x === x && prev.w === w && prev.right === right && prev.useInset === useInset
          ? prev
          : { x, w, right, useInset },
      );
    };
    measure(false);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure(true)) : null;
    observer?.observe(root);
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
    };
  }, [value, optionKey, size, isBlock]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const enabled = options.filter((option) => !option.disabled && !disabled);
    if (!enabled.length) return;
    const rtl =
      typeof window !== "undefined" && rootRef.current
        ? getComputedStyle(rootRef.current).direction === "rtl"
        : false;
    const index = enabled.findIndex((option) => option.value === value);
    let next: AfSegmentOption<T> | undefined;
    if (event.key === "ArrowRight" || (isRadio && event.key === "ArrowDown")) {
      const step = event.key === "ArrowRight" && rtl ? -1 : 1;
      next = enabled[(index + step + enabled.length) % enabled.length];
    } else if (event.key === "ArrowLeft" || (isRadio && event.key === "ArrowUp")) {
      const step = event.key === "ArrowLeft" && rtl ? 1 : -1;
      next = enabled[(index + step + enabled.length) % enabled.length];
    } else if (event.key === "Home") {
      next = enabled[0];
    } else if (event.key === "End") {
      next = enabled[enabled.length - 1];
    }
    if (!next) return;
    event.preventDefault();
    setValue(next.value);
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(next.value) : next.value.replace(/"/g, '\\"');
    rootRef.current?.querySelector<HTMLElement>(`[data-value="${escaped}"]`)?.focus();
  };

  const iconSize = size === "xs" || size === "sm" ? 13 : 14;
  const scrubSupported = !disabled;

  const pickScrubValue = (clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof document.elementFromPoint === "function") {
      const hit = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(".af-seg__item");
      const val = hit?.dataset.value as T | undefined;
      if (hit && val && root.contains(hit)) {
        const opt = options.find((o) => o.value === val);
        if (opt && !opt.disabled) {
          setValue(val);
          return;
        }
      }
    }
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".af-seg__item"));
    for (const btn of buttons) {
      if (btn.disabled) continue;
      const rect = btn.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        const val = btn.dataset.value as T | undefined;
        if (val) setValue(val);
        return;
      }
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubSupported || event.button !== 0) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const hitItem = (event.target as HTMLElement | null)?.closest<HTMLElement>(".af-seg__item");
    if (hitItem && hitItem.dataset.value === value && !hitItem.hasAttribute("disabled")) {
      setPressed(true);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || pointerStartRef.current.id !== event.pointerId || !scrubSupported) return;
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - pointerStartRef.current.x, event.clientY - pointerStartRef.current.y) < 4) return;
      draggingRef.current = true;
      setDragging(true);
      setPressed(false);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore synthetic events
      }
    }
    pickScrubValue(event.clientX, event.clientY);
  };

  const endScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    setPressed(false);
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={composeRefs(rootRef, forwardedRef)}
      id={fieldCtx?.controlId}
      className={cn("af-seg", className)}
      style={style}
      data-variant={variant}
      data-kind={isRadio ? "radio" : undefined}
      data-size={size !== "md" ? size : undefined}
      data-block={isBlock || undefined}
      data-ready={ready || undefined}
      data-resizing={resizing || undefined}
      data-dir={dir ?? undefined}
      data-pressed={pressed || undefined}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      role={isRadio ? "radiogroup" : "tablist"}
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledByProp}
      aria-describedby={fieldCtx?.describedBy}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onPointerLeave={() => {
        if (!draggingRef.current) setPressed(false);
      }}
      onKeyDown={onKeyDown}
    >
      {name && !disabled ? <input type="hidden" name={name} value={value} /> : null}
      {thumb ? (
        <span
          className="af-seg__thumb"
          data-inset={thumb.useInset || undefined}
          style={
            thumb.useInset
              ? { left: thumb.x, right: thumb.right }
              : { transform: `translateX(${thumb.x}px)`, width: thumb.w }
          }
          aria-hidden="true"
        />
      ) : null}
      {options.map((option) => {
        const iconOnly = Boolean(option.icon) && (option.label === undefined || option.label === null || option.label === "");
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={isRadio ? "radio" : "tab"}
            className="af-seg__item"
            data-value={option.value}
            data-icon-only={iconOnly || undefined}
            aria-label={option.ariaLabel}
            aria-selected={isRadio ? undefined : selected}
            aria-checked={isRadio ? selected : undefined}
            aria-controls={!isRadio ? option.controls : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled || disabled || undefined}
            onClick={() => setValue(option.value)}
          >
            {option.icon ? (
              typeof option.icon === "string" ? (
                <AfIcon name={option.icon as AffectIconKey} size={iconSize} className="af-seg__icon" />
              ) : (
                <span className="af-seg__icon">{option.icon}</span>
              )
            ) : null}
            {!iconOnly ? option.label : null}
            {option.count !== undefined ? <span className="af-seg__count">{option.count}</span> : null}
            {option.badge !== undefined ? <span className="af-seg__badge">{option.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** 滑块会在选项之间平滑滑动并轻微拉伸，支持图标项、等宽撑满与受控/非受控模式。 */
export const AfSegmented = forwardRef(AfSegmentedInner) as AfSegmentedComponent;
AfSegmented.displayName = "AfSegmented";
