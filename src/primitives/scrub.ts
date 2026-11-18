import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type UsePointerScrubOptions = {
  /** 当前数值。 */
  value: number;
  /** 数值变更回调。 */
  onChange: (nextValue: number) => void;
  /** 起拖时回调起始值。 */
  onScrubStart?: (startValue: number) => void;
  /** 松手或取消时回调最终值。 */
  onScrubEnd?: (finalValue: number) => void;
  /** 最小值下界，默认 `-Infinity`。 */
  min?: number;
  /** 最大值上界，默认 `Infinity`。 */
  max?: number;
  /** 基础步长，默认 `1`。 */
  step?: number;
  /** 每移动多少水平像素推进一个步长（阻尼灵敏度），默认 `6`。 */
  pixelsPerStep?: number;
  /** 按住 `Shift` 键时的粗调倍率，默认 `10`。 */
  shiftMultiplier?: number;
  /** 按住 `Alt` 键时的精调倍率，默认 `0.1`。 */
  altMultiplier?: number;
  /** 禁用拖拽擦除调值。 */
  disabled?: boolean;
};

export type PointerScrubBindProps = {
  role: "spinbutton";
  tabIndex?: number;
  "aria-valuenow": number;
  "aria-valuemin"?: number;
  "aria-valuemax"?: number;
  "aria-disabled"?: boolean;
  "data-scrubbing"?: "true";
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
};

export type PointerScrubResult = {
  /** 是否正处于水平指针拖拽调值中。 */
  scrubbing: boolean;
  /** 直接展开至标签或数值读数节点的无障碍与指针绑定属性。 */
  scrubProps: PointerScrubBindProps;
};

function clampNumber(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getDecimalPlaces(stepVal: number): number {
  if (!Number.isFinite(stepVal) || stepVal <= 0) return 0;
  const str = stepVal.toString();
  if (str.includes("e-")) {
    const parts = str.split("e-");
    return Number.parseInt(parts[1] ?? "0", 10);
  }
  const dotIdx = str.indexOf(".");
  return dotIdx === -1 ? 0 : str.length - dotIdx - 1;
}

function quantizeToStep(raw: number, effectiveStep: number, min: number, max: number): number {
  const safeStep = effectiveStep > 0 && Number.isFinite(effectiveStep) ? effectiveStep : 1;
  const origin = Number.isFinite(min) ? min : 0;
  const snapped = origin + Math.round((raw - origin) / safeStep) * safeStep;
  const decimals = Math.min(8, getDecimalPlaces(safeStep));
  const rounded = Number(snapped.toFixed(decimals));
  return clampNumber(rounded, min, max);
}

/**
 * 水平指针无级擦除调值（Pointer Scrubbing）原语：
 * - 增量累积模型：在拖拽中途按下或松开 `Shift`（×10 粗调）/ `Alt`（×0.1 精调）平滑切换齿轮比，零数值跳变；
 * - 拖拽期间锁定全局 `ew-resize` 光标并屏蔽文本误选，按 `Escape` 立即恢复起拖前初值；
 * - 原生内置 `role="spinbutton"` 与方向键无障碍微调契约。
 */
export function usePointerScrub(options: UsePointerScrubOptions): PointerScrubResult {
  const {
    value,
    onChange,
    onScrubStart,
    onScrubEnd,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    step = 1,
    pixelsPerStep = 6,
    shiftMultiplier = 10,
    altMultiplier = 0.1,
    disabled = false,
  } = options;

  const [scrubbing, setScrubbing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const latestRef = useRef({
    value,
    onChange,
    onScrubStart,
    onScrubEnd,
    min,
    max,
    step,
    pixelsPerStep,
    shiftMultiplier,
    altMultiplier,
    disabled,
  });
  latestRef.current = {
    value,
    onChange,
    onScrubStart,
    onScrubEnd,
    min,
    max,
    step,
    pixelsPerStep,
    shiftMultiplier,
    altMultiplier,
    disabled,
  };

  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const cfg = latestRef.current;
    if (cfg.disabled || e.button !== 0) return;

    e.preventDefault();
    cleanupRef.current?.();

    const targetEl = e.currentTarget;
    const pointerId = e.pointerId;
    const initialValue = cfg.value;
    let prevX = e.clientX;
    let rawAccumulator = initialValue;
    let lastEmitted = initialValue;

    const docStyle = document.documentElement.style;
    const prevCursor = docStyle.cursor;
    const prevUserSelect = docStyle.userSelect;
    docStyle.cursor = "ew-resize";
    docStyle.userSelect = "none";

    try {
      targetEl.setPointerCapture?.(pointerId);
    } catch {
      // Ignore synthetic PointerEvent environments.
    }

    setScrubbing(true);
    cfg.onScrubStart?.(initialValue);

    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("keydown", handleKeyDown, true);
      docStyle.cursor = prevCursor;
      docStyle.userSelect = prevUserSelect;
      try {
        if (targetEl.hasPointerCapture?.(pointerId)) {
          targetEl.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore
      }
      cleanupRef.current = null;
      setScrubbing(false);
    };

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const cur = latestRef.current;
      const dx = ev.clientX - prevX;
      prevX = ev.clientX;
      if (dx === 0) return;

      const mult = ev.shiftKey
        ? cur.shiftMultiplier
        : ev.altKey
          ? cur.altMultiplier
          : 1;
      const effectiveStep = Math.max(1e-6, cur.step * mult);
      const pxPerStep = Math.max(1, cur.pixelsPerStep);

      rawAccumulator = clampNumber(
        rawAccumulator + (dx / pxPerStep) * effectiveStep,
        cur.min,
        cur.max,
      );
      const nextVal = quantizeToStep(rawAccumulator, effectiveStep, cur.min, cur.max);
      if (nextVal !== lastEmitted) {
        lastEmitted = nextVal;
        cur.onChange(nextVal);
      }
    };

    const handleUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      latestRef.current.onScrubEnd?.(lastEmitted);
    };

    const handleCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      latestRef.current.onScrubEnd?.(lastEmitted);
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        cleanup();
        if (lastEmitted !== initialValue) {
          latestRef.current.onChange(initialValue);
        }
        latestRef.current.onScrubEnd?.(initialValue);
      }
    };

    cleanupRef.current = cleanup;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    window.addEventListener("keydown", handleKeyDown, true);
  }, []);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    const cur = latestRef.current;
    if (cur.disabled) return;

    let dir = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") dir = 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") dir = -1;
    if (dir === 0) return;

    e.preventDefault();
    const mult = e.shiftKey
      ? cur.shiftMultiplier
      : e.altKey
        ? cur.altMultiplier
        : 1;
    const effectiveStep = Math.max(1e-6, cur.step * mult);
    const nextVal = quantizeToStep(
      cur.value + dir * effectiveStep,
      effectiveStep,
      cur.min,
      cur.max,
    );
    if (nextVal !== cur.value) {
      cur.onChange(nextVal);
    }
  }, []);

  return {
    scrubbing,
    scrubProps: {
      role: "spinbutton",
      tabIndex: disabled ? undefined : 0,
      "aria-valuenow": value,
      ...(Number.isFinite(min) ? { "aria-valuemin": min } : {}),
      ...(Number.isFinite(max) ? { "aria-valuemax": max } : {}),
      ...(disabled ? { "aria-disabled": true } : {}),
      ...(scrubbing ? { "data-scrubbing": "true" as const } : {}),
      onPointerDown,
      onKeyDown,
      style: {
        cursor: disabled ? undefined : "ew-resize",
        touchAction: disabled ? undefined : "none",
        userSelect: "none",
      },
    },
  };
}
