import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import {
  cn,
  composeRefs,
  useControllableState,
  useFieldShake,
  useImeEnterGuard,
  usePointerScrub,
} from "../../primitives";
import { AfPopover } from "../overlay/Popover";
import { useAfFormFieldControl } from "./FormField";

/** 数字输入变化回调；兼容只接收 number 与接收 number | null 两种写法。 */
export type AfNumberInputChangeHandler = ((value: number | null) => void) | ((value: number) => void);

/** 紧凑单位下拉选项。 */
export type AfNumberUnitOption = string | { value: string; label?: ReactNode };

/** 数字输入属性。 */
export type AfNumberInputProps = {
  /** 当前值；不传时使用 defaultValue 的非受控模式。 */
  value?: number | null;
  /** 非受控初始值。 */
  defaultValue?: number | null;
  /** 变化回调；清空时回传 null。 */
  onChange?: AfNumberInputChangeHandler;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: AfNumberInputChangeHandler;
  /** 原生表单字段名（始终提交规范化后的纯数字字符串）。 */
  name?: string;
  /** 是否必填。 */
  required?: boolean;
  /** 可选标记（传 `true` 显示 `"可选"`，也可自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 最小值。 */
  min?: number;
  /** 最大值。 */
  max?: number;
  /** 步长，默认 1（Shift + ↑/↓ 或 PageUp/PageDown 按 `largeStep` 调整）。 */
  step?: number;
  /** 大步长，默认 `step * 10`（用于 Shift + ↑/↓ 与 PageUp / PageDown）。 */
  largeStep?: number;
  /** 小数位数；提交时按该精度四舍五入。 */
  precision?: number;
  /** 自定义展示格式化（如千分位或货币符号）。 */
  formatter?: (value: number | null) => string;
  /** 自定义输入解析函数（配合 formatter 将展示文本还原为数值）。 */
  parser?: (displayValue: string) => number;
  /** `Intl.NumberFormat` 语言区域（失焦时格式化展示，聚焦时自动还原纯数字编辑）。 */
  locale?: string;
  /** `Intl.NumberFormat` 格式化选项（如货币、百分比、紧凑计数）。 */
  formatOptions?: Intl.NumberFormatOptions;
  /** 是否显示 −/+ 步进按钮，默认 true（支持长按加速连发）。 */
  controls?: boolean;
  /** 步进器排布：`"end"`（默认，右侧紧凑并排 −/+，对齐 affectUI）或 `"split"`（左右分置）。 */
  stepperPlacement?: "end" | "split";
  /** 前置内容。 */
  prefix?: ReactNode;
  /** 紧邻数值右侧的单位标签（如 `"px"`、`"%"`、`"s"`、`"帧"`、`"¥"`）。 */
  unit?: ReactNode;
  /** 可切换的紧凑单位列表（如 `["px", "%", "rem"]`）；传入时自动渲染轻量单位切换浮层。 */
  unitOptions?: ReadonlyArray<AfNumberUnitOption>;
  /** 受控当前单位值（配合 `unitOptions`）。 */
  unitValue?: string;
  /** 非受控初始单位值（配合 `unitOptions`）。 */
  defaultUnit?: string;
  /** 切换单位回调（配合 `unitOptions`）。 */
  onUnitChange?: (unit: string) => void;
  /** 单位或后缀内容。 */
  suffix?: ReactNode;
  /**
   * 键入提交策略：
   * - `"change"`（默认）：键入合法数字时实时触发 `onChange`；
   * - `"blur"`：键入过程仅维护草稿字符串，失焦、按 `Enter`、步进或指针擦洗时才夹取并提交。
   */
  commitMode?: "change" | "blur";
  /** 失焦、回车、步进或擦洗结束时的确认提交回调。 */
  onCommit?: (value: number | null) => void;
  /** 是否启用指针水平拖拽擦洗微调（`Shift` 粗调 ×10，`Alt` 精调 ×0.1，`Escape` 取消回退）。 */
  scrubbable?: boolean;
  /** 指针水平擦洗灵敏度（每移动多少像素推进 1 个 `step`，默认 `6`）。 */
  scrubSensitivity?: number;
  /** 指针擦洗开始回调。 */
  onScrubStart?: (startValue: number) => void;
  /** 指针擦洗结束回调。 */
  onScrubEnd?: (finalValue: number) => void;
  /** 占位文字。 */
  placeholder?: string;
  /** 尺寸，与 AfInput 一致：xs 24px，sm 28px，md 32px，lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 是否只读。 */
  readOnly?: boolean;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 校验失败。 */
  invalid?: boolean;
  /** 辅助说明文案。 */
  hint?: ReactNode;
  /** 错误提示文案（传入非空内容自动激活错误态与轻微抖动）。 */
  error?: ReactNode;
  /** 可见标签与无障碍名称。 */
  label?: string;
  /** 仅注入无障碍名称（不渲染顶部可见标题）。 */
  ariaLabel?: string;
  /** 原生 `aria-label`。 */
  "aria-label"?: string;
  /** 关联外部说明元素 id。 */
  "aria-describedby"?: string;
  /** 原生校验状态标记。 */
  "aria-invalid"?: boolean | "true" | "false";
  /** 控件 id。 */
  id?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
  /** 聚焦回调。 */
  onFocus?: FocusEventHandler<HTMLInputElement>;
  /** 失焦回调（在数值夹取提交后触发）。 */
  onBlur?: FocusEventHandler<HTMLInputElement>;
  /** 回车回调；会在值提交后触发（IME 安全）。 */
  onPressEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function defaultFormatNumber(next: number | null, digits?: number) {
  if (next === null || !Number.isFinite(next)) return "";
  return digits === undefined ? String(next) : next.toFixed(digits);
}

/**
 * 数字输入：32px 发丝环字段内置轻量 −/+ 步进动作（支持长按加速连发与 Shift/PageUp 10× 步进）；
 * 输入框允许临时空值/负号，失焦或回车时夹取并回写合法值，支持 Intl formatOptions / formatter / parser 与原生表单提交。
 */
export const AfNumberInput = forwardRef<HTMLInputElement, AfNumberInputProps>(function AfNumberInput(
  {
    value,
    defaultValue,
    onChange,
    onValueChange,
    name,
    required: requiredProp,
    optional,
    min,
    max,
    step = 1,
    largeStep,
    precision,
    formatter,
    parser,
    locale,
    formatOptions,
    controls = true,
    stepperPlacement = "end",
    prefix,
    unit,
    unitOptions,
    unitValue: unitValueProp,
    defaultUnit,
    onUnitChange,
    suffix,
    commitMode = "change",
    onCommit,
    scrubbable = false,
    scrubSensitivity = 6,
    onScrubStart,
    onScrubEnd,
    placeholder,
    size = "md",
    readOnly,
    disabled: disabledProp,
    invalid,
    hint,
    error,
    label,
    ariaLabel,
    "aria-label": ariaLabelAttr,
    "aria-describedby": ariaDescribedByAttr,
    "aria-invalid": ariaInvalidAttr,
    id: idProp,
    className,
    style,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    onPressEnter,
  },
  forwardedRef,
) {
  const autoId = useId();
  const fieldCtx = useAfFormFieldControl();
  const id = idProp ?? fieldCtx?.controlId ?? autoId;
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const hasError = Boolean(error);
  const bad = Boolean(
    invalid || ariaInvalidAttr === true || ariaInvalidAttr === "true" || hasError || fieldCtx?.invalid,
  );
  const shaking = useFieldShake(bad);
  const resolvedRequired = requiredProp ?? fieldCtx?.required;
  const resolvedLargeMultiplier = largeStep !== undefined && step !== 0 ? largeStep / step : 10;
  const ime = useImeEnterGuard();
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;

  const intlFormatter = useMemo(() => {
    if (!formatOptions) return null;
    try {
      return new Intl.NumberFormat(locale, formatOptions);
    } catch {
      return null;
    }
  }, [locale, formatOptions]);

  const formatDisplay = (next: number | null) => {
    if (formatter) return formatter(next);
    if (intlFormatter && next !== null && Number.isFinite(next)) return intlFormatter.format(next);
    return defaultFormatNumber(next, precision);
  };
  const parseDisplay = (raw: string) => {
    if (parser) return parser(raw);
    const cleaned = intlFormatter ? raw.replace(/[^\d.-]/g, "") : raw.replace(/,/g, "");
    return Number(cleaned.trim());
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const unitTriggerRef = useRef<HTMLButtonElement>(null);
  const editing = useRef(false);
  const controlled = value !== undefined;
  const [innerValue, setInnerValue] = useState<number | null>(defaultValue ?? null);
  const current = controlled ? (value ?? null) : innerValue;
  const [text, setText] = useState(() => formatDisplay(controlled ? (value ?? null) : (defaultValue ?? null)));

  const normalizedUnits = useMemo(
    () =>
      (unitOptions ?? []).map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label ?? opt.value },
      ),
    [unitOptions],
  );
  const [selectedUnit, setSelectedUnit] = useControllableState<string>({
    value: unitValueProp ?? (typeof unit === "string" && normalizedUnits.length > 0 ? unit : undefined),
    defaultValue: defaultUnit ?? normalizedUnits[0]?.value ?? "",
    onChange: onUnitChange,
  });
  const [unitOpen, setUnitOpen] = useState(false);
  const effectiveUnit: ReactNode =
    normalizedUnits.length > 0
      ? (normalizedUnits.find((item) => item.value === selectedUnit)?.label ?? selectedUnit)
      : unit;

  const formatRef = useRef(formatDisplay);
  formatRef.current = formatDisplay;

  useEffect(() => {
    if (!editing.current) {
      const val = controlled ? (value ?? null) : innerValue;
      setText(formatRef.current(val));
    }
  }, [controlled, value, innerValue, precision, intlFormatter]);

  const clamp = (next: number) => {
    let result = next;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    if (precision !== undefined) result = Number(result.toFixed(precision));
    else result = Number(result.toFixed(10));
    return result;
  };

  const emit = (next: number | null) => {
    if (!controlled) setInnerValue(next);
    (onChange as ((val: number | null) => void) | undefined)?.(next);
    (onValueChange as ((val: number | null) => void) | undefined)?.(next);
  };

  const commit = (next: number | null, notifyCommit = false) => {
    if (next === null) {
      emit(null);
      if (notifyCommit) onCommit?.(null);
      setText("");
      return null;
    }
    const result = clamp(next);
    emit(result);
    if (notifyCommit) onCommit?.(result);
    setText(editing.current && intlFormatter && !formatter ? defaultFormatNumber(result, precision) : formatDisplay(result));
    return result;
  };

  const canScrub = Boolean(scrubbable && !disabled && !readOnly);
  const { scrubbing, scrubProps } = usePointerScrub({
    value: current ?? min ?? 0,
    onChange: (nextVal) => {
      commit(nextVal, false);
    },
    onScrubStart,
    onScrubEnd: (finalVal) => {
      const clamped = clamp(finalVal);
      onScrubEnd?.(clamped);
      onCommit?.(clamped);
    },
    min,
    max,
    step,
    pixelsPerStep: scrubSensitivity,
    shiftMultiplier: resolvedLargeMultiplier,
    altMultiplier: 0.1,
    disabled: !canScrub,
  });

  const [stepAnim, setStepAnim] = useState<"up-a" | "up-b" | "down-a" | "down-b" | null>(null);

  const nudge = (direction: number, multiplier = 1) => {
    if (readOnly || disabled) return;
    const prevVal = current;
    const nextVal = commit((current ?? min ?? 0) + direction * step * multiplier, true);
    if (nextVal !== prevVal) {
      setStepAnim((prev) =>
        direction > 0 ? (prev === "up-a" ? "up-b" : "up-a") : prev === "down-a" ? "down-b" : "down-a",
      );
    }
  };

  const nudgeRef = useRef(nudge);
  nudgeRef.current = nudge;

  const holdTimeoutRef = useRef<number | null>(null);
  const holdSteppedRef = useRef(false);

  const stopHold = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  useEffect(() => stopHold, []);

  const startHold = (direction: 1 | -1, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || disabled || readOnly) return;
    event.preventDefault();
    stopHold();
    holdSteppedRef.current = true;
    nudgeRef.current(direction);
    let ticks = 0;
    const scheduleNext = (delay: number) => {
      holdTimeoutRef.current = window.setTimeout(() => {
        ticks += 1;
        nudgeRef.current(direction);
        scheduleNext(ticks >= 6 ? 42 : 85);
      }, delay);
    };
    scheduleNext(400);
  };

  const atMin = min !== undefined && current !== null && current <= min;
  const atMax = max !== undefined && current !== null && current >= max;
  const describedBy =
    [ariaDescribedByAttr, fieldCtx?.describedBy, hint ? hintId : undefined, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  const valueText = useMemo(() => {
    if (current === null) return undefined;
    const formatted = formatDisplay(current);
    const unitStr = typeof effectiveUnit === "string" || typeof effectiveUnit === "number" ? ` ${effectiveUnit}` : "";
    const suffixStr = typeof suffix === "string" || typeof suffix === "number" ? ` ${suffix}` : "";
    const prefixStr = typeof prefix === "string" || typeof prefix === "number" ? `${prefix}` : "";
    const combined = `${prefixStr}${formatted}${unitStr}${suffixStr}`.trim();
    return combined !== String(current) ? combined : undefined;
  }, [current, effectiveUnit, suffix, prefix, intlFormatter, precision]);

  const decButton = (
    <button
      type="button"
      className="af-number__btn"
      tabIndex={-1}
      aria-label="Decrease"
      disabled={disabled || readOnly || atMin}
      onPointerDown={(event) => startHold(-1, event)}
      onPointerUp={stopHold}
      onPointerCancel={stopHold}
      onPointerLeave={stopHold}
      onClick={() => {
        if (holdSteppedRef.current) {
          holdSteppedRef.current = false;
          return;
        }
        nudge(-1);
      }}
    >
      <AfIcon name="minus" size={12} />
    </button>
  );

  const incButton = (
    <button
      type="button"
      className="af-number__btn"
      tabIndex={-1}
      aria-label="Increase"
      disabled={disabled || readOnly || atMax}
      onPointerDown={(event) => startHold(1, event)}
      onPointerUp={stopHold}
      onPointerCancel={stopHold}
      onPointerLeave={stopHold}
      onClick={() => {
        if (holdSteppedRef.current) {
          holdSteppedRef.current = false;
          return;
        }
        nudge(1);
      }}
    >
      <AfIcon name="plus" size={12} />
    </button>
  );

  return (
    <div className={cn("af-number-wrap", className)} style={style}>
      {name ? <input type="hidden" name={name} value={current !== null ? String(current) : ""} disabled={disabled} /> : null}
      {label ? (
        <div className="af-number__head">
          <label
            className="af-number__label"
            htmlFor={id}
            data-scrub-handle={canScrub ? "true" : undefined}
            onPointerDown={canScrub ? scrubProps.onPointerDown : undefined}
          >
            {label}
          </label>
          {optional ? (
            <span className="af-number__optional">{optional === true ? "Optional" : optional}</span>
          ) : null}
        </div>
      ) : null}
      <div
        className="af-field af-number"
        data-size={size}
        data-controls={controls || undefined}
        data-stepper={stepperPlacement}
        data-has-unit={Boolean(effectiveUnit) || undefined}
        data-scrubbable={canScrub ? "true" : undefined}
        data-scrubbing={scrubbing ? "true" : undefined}
        data-invalid={bad || undefined}
        data-shake={shaking || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("button") && !target.closest("[data-scrub-handle]")) inputRef.current?.focus();
        }}
      >
        {controls && stepperPlacement === "split" ? decButton : null}
        {prefix ? (
          <span
            className="af-field__prefix"
            data-scrub-handle={canScrub ? "true" : undefined}
            onPointerDown={canScrub ? scrubProps.onPointerDown : undefined}
          >
            {prefix}
          </span>
        ) : canScrub && !label ? (
          <span
            className="af-number__scrub-grip"
            data-scrub-handle="true"
            aria-hidden="true"
            title="左右拖拽微调数值（Shift ×10 / Alt ×0.1）"
            onPointerDown={scrubProps.onPointerDown}
          >
            <svg viewBox="0 0 14 14" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 4.5 2 7l2.5 2.5M9.5 4.5 12 7l-2.5 2.5" />
            </svg>
          </span>
        ) : null}
        <input
          ref={composeRefs(inputRef, forwardedRef)}
          id={id}
          className="af-field__input af-number__input"
          data-step-anim={stepAnim ?? undefined}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-label={ariaLabelAttr ?? ariaLabel ?? label}
          aria-invalid={bad ? true : "false"}
          aria-describedby={describedBy}
          aria-valuenow={current ?? undefined}
          aria-valuetext={valueText}
          aria-valuemin={min}
          aria-valuemax={max}
          required={resolvedRequired || undefined}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          value={text}
          onCompositionStart={ime.onCompositionStart}
          onCompositionEnd={ime.onCompositionEnd}
          onFocus={(event) => {
            editing.current = true;
            if (intlFormatter && !formatter && current !== null) {
              setText(defaultFormatNumber(current, precision));
            }
            onFocusProp?.(event);
          }}
          onChange={(event) => {
            const raw = event.target.value;
            setText(raw);
            if (commitMode === "blur") return;
            if (raw.trim() === "") {
              emit(null);
              return;
            }
            const parsed = parseDisplay(raw);
            if (Number.isFinite(parsed)) emit(clamp(parsed));
          }}
          onBlur={(event) => {
            editing.current = false;
            const parsed = parseDisplay(text);
            if (text.trim() === "" || !Number.isFinite(parsed)) {
              commit(null, true);
            } else {
              commit(parsed, true);
            }
            onBlurProp?.(event);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              nudge(event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? resolvedLargeMultiplier : 1);
            } else if (event.key === "PageUp" || event.key === "PageDown") {
              event.preventDefault();
              nudge(event.key === "PageUp" ? 1 : -1, resolvedLargeMultiplier);
            } else if (event.key === "Home" && min !== undefined && !readOnly && !disabled) {
              event.preventDefault();
              commit(min, true);
            } else if (event.key === "End" && max !== undefined && !readOnly && !disabled) {
              event.preventDefault();
              commit(max, true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setText(
                editing.current && intlFormatter && !formatter
                  ? defaultFormatNumber(current, precision)
                  : formatDisplay(current),
              );
            } else if (event.key === "Enter" && !ime.shouldBlockEnter(event)) {
              event.preventDefault();
              const parsed = parseDisplay(text);
              commit(text.trim() === "" || !Number.isFinite(parsed) ? null : parsed, true);
              onPressEnter?.(event);
            }
          }}
        />
        {normalizedUnits.length > 0 ? (
          <>
            <button
              ref={unitTriggerRef}
              type="button"
              className="af-number__unit-select"
              disabled={disabled || readOnly}
              aria-haspopup="listbox"
              aria-expanded={unitOpen}
              aria-label="切换单位"
              onClick={(event) => {
                event.stopPropagation();
                if (!disabled && !readOnly) setUnitOpen((prev) => !prev);
              }}
            >
              <span>{effectiveUnit}</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
            <AfPopover
              open={unitOpen}
              anchorRef={unitTriggerRef}
              align="end"
              gap={5}
              animateExit
              preserveNaturalWidth
              role="listbox"
              label="选择单位"
              className="af-number__unit-pop"
              onPointerDownOutside={() => setUnitOpen(false)}
              onEscapeKeyDown={() => setUnitOpen(false)}
            >
              <div className="af-number__unit-list" data-af-hover-list="hover">
                {normalizedUnits.map((item) => {
                  const isActive = item.value === selectedUnit;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className="af-number__unit-option"
                      data-af-hover-item
                      data-selected={isActive ? "true" : undefined}
                      onClick={() => {
                        setSelectedUnit(item.value);
                        setUnitOpen(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {isActive ? <AfIcon name="check" size={12} /> : null}
                    </button>
                  );
                })}
              </div>
            </AfPopover>
          </>
        ) : effectiveUnit ? (
          <span
            className="af-number__unit"
            data-scrub-handle={canScrub ? "true" : undefined}
            onPointerDown={canScrub ? scrubProps.onPointerDown : undefined}
          >
            {effectiveUnit}
          </span>
        ) : null}
        {suffix ? <span className="af-field__suffix">{suffix}</span> : null}
        {controls && stepperPlacement === "end" ? (
          <span className="af-number__actions">
            {decButton}
            {incButton}
          </span>
        ) : null}
        {controls && stepperPlacement === "split" ? incButton : null}
      </div>
      {hint && !hasError ? (
        <div id={hintId} className="af-number__hint">
          {hint}
        </div>
      ) : null}
      {hasError ? (
        <div id={errorId} className="af-number__error" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
    </div>
  );
});
