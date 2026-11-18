import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { cn, composeRefs, useControllableState, useFieldShake, useMenuHighlight } from "../../primitives";
import { AfPopover } from "../overlay/Popover";
import { AfButton, AfIconButton } from "./Button";
import { useAfFormFieldControl } from "./FormField";
import { AfSegmented } from "./Segmented";

function isZhLocale(locale?: string): boolean {
  return Boolean(locale && /^zh\b/i.test(locale.trim()));
}

const WEEKDAY_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"];

/** 日历节假日或班休标记。 */
export type AfCalendarHolidayInfo = {
  label: string;
  type?: "rest" | "work";
};

/** 独立月历组件属性（纯 Flexbox 7 列布局，零原生 `<input type="date">`）。 */
export type AfCalendarProps = Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
  /** 受控日期 `YYYY-MM-DD`。 */
  value?: string;
  /** 非受控初始日期。 */
  defaultValue?: string;
  /** 选中回调。 */
  onChange?: (dateKey: string) => void;
  /** 受控浏览月份 `YYYY-MM`。 */
  month?: string;
  /** 非受控初始浏览月份 `YYYY-MM`。 */
  defaultMonth?: string;
  /** 月份切换回调。 */
  onMonthChange?: (monthKey: string) => void;
  /** 禁用特定日期判断函数。 */
  disabledDate?: (dateKey: string) => boolean;
  /** 自定义节假日/班休映射，键为 `YYYY-MM-DD`。 */
  holidays?: Record<string, AfCalendarHolidayInfo>;
  /** 区域语言（`"zh-CN"` | `"en-US"`）。 */
  locale?: string;
  /** 嵌入到组合弹窗内时去除外卡片阴影。 */
  embedded?: boolean;
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (match) {
    return { year: Number(match[1]), monthIndex: Math.min(11, Math.max(0, Number(match[2]) - 1)) };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function buildMonthGridCells(year: number, monthIndex: number) {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // 周一作为每周首日（0 = 周一 .. 6 = 周日）
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - startOffset);
  const cells: { key: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    cells.push({
      key: toDateKey(cur),
      day: cur.getDate(),
      outside: cur.getMonth() !== monthIndex,
    });
  }
  return cells;
}

/**
 * 独立日历面板：基于 7 列 Flexbox 折行布局与 `tabular-nums`，支持月份切换、今/节假日角标与日期禁用。
 */
export const AfCalendar = forwardRef<HTMLDivElement, AfCalendarProps>(function AfCalendar(
  {
    value: valueProp,
    defaultValue = "",
    onChange,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    disabledDate,
    holidays,
    locale,
    embedded = false,
    className,
    ...rest
  } = {},
  ref,
) {
  const isZh = isZhLocale(locale);
  const weekdayLabels = isZh ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS;
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const initialMonth = defaultMonth ?? (defaultValue ? defaultValue.slice(0, 7) : toMonthKey(new Date()));

  const [selected, setSelected] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });

  const [viewMonth, setViewMonth] = useControllableState<string>({
    value: monthProp,
    defaultValue: initialMonth,
    onChange: onMonthChange,
  });

  const { year, monthIndex } = useMemo(() => parseMonthKey(viewMonth), [viewMonth]);
  const cells = useMemo(() => buildMonthGridCells(year, monthIndex), [year, monthIndex]);
  const headerTitle = isZh ? `${year}年 ${monthIndex + 1}月` : `${MONTH_NAMES[monthIndex]} ${year}`;

  const stepMonth = (delta: number) => {
    const next = new Date(year, monthIndex + delta, 1);
    setViewMonth(toMonthKey(next));
  };

  return (
    <div ref={ref} className={cn("af-calendar", embedded && "af-calendar--embedded", className)} {...rest}>
      <div className="af-calendar__head">
        <span className="af-calendar__title">
          {headerTitle}
        </span>
        <span className="af-calendar__nav">
          <AfIconButton size="xs" icon="chevronLeft" label="Previous month" onClick={() => stepMonth(-1)} />
          <AfButton
            size="xs"
            variant="ghost"
            onClick={() => {
              setViewMonth(toMonthKey(new Date()));
              if (!disabledDate?.(todayKey)) setSelected(todayKey);
            }}
          >
            {isZh ? "今天" : "Today"}
          </AfButton>
          <AfIconButton size="xs" icon="chevronRight" label="Next month" onClick={() => stepMonth(1)} />
        </span>
      </div>
      <div className="af-calendar__weekdays" aria-hidden="true">
        {weekdayLabels.map((w) => (
          <span key={w} className="af-calendar__weekday">
            {w}
          </span>
        ))}
      </div>
      <div className="af-calendar__days" role="grid" aria-label={headerTitle}>
        {cells.map((cell) => {
          const isDisabled = Boolean(disabledDate?.(cell.key));
          const isSelected = selected === cell.key;
          const isToday = cell.key === todayKey;
          const holiday = holidays?.[cell.key];
          return (
            <span key={cell.key} className="af-calendar__cell" role="gridcell" aria-selected={isSelected}>
              <button
                type="button"
                className="af-calendar__day"
                disabled={isDisabled}
                data-outside={cell.outside || undefined}
                data-today={isToday || undefined}
                data-selected={isSelected || undefined}
                data-holiday={holiday?.type ?? (holiday ? "rest" : undefined)}
                aria-label={holiday ? `${cell.key} ${holiday.label}` : cell.key}
                onClick={() => {
                  setSelected(cell.key);
                  if (cell.outside) setViewMonth(cell.key.slice(0, 7));
                }}
              >
                <span>{cell.day}</span>
                {holiday ? <span className="af-calendar__holiday">{holiday.label}</span> : null}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
});

/** 时间选择器属性（禁止原生 `<input type="time">`）。 */
export type AfTimePickerProps = {
  /** 受控时间字符串，例如 `"09:30"` 或 `"09:30:00"`。 */
  value?: string;
  /** 非受控初始时间。 */
  defaultValue?: string;
  /** 时间确认变化回调。 */
  onChange?: (value: string) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: string) => void;
  /** 原生表单字段名（渲染隐藏提交项）。 */
  name?: string;
  /** 占位文字。 */
  placeholder?: string;
  /** 无障碍标签。 */
  label?: string;
  /** 顶部可见字段标题（与 FormField 独立使用时便捷渲染）。 */
  fieldLabel?: ReactNode;
  /** 可选标记（配合 `fieldLabel` 显示 `"Optional"` / `"可选"` 或自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 是否必填。 */
  required?: boolean;
  /** 区域设置（如 `"en-US"`、`"zh-CN"`）。 */
  locale?: string;
  /** 辅助说明文案。 */
  hint?: ReactNode;
  /** 错误提示文案（非空时自动激活红框与轻微抖动）。 */
  error?: ReactNode;
  /** 是否显示秒列（也可通过 `format` 包含 `ss` 自动启用）。 */
  showSecond?: boolean;
  /** `showSecond` 的同义属性。 */
  showSeconds?: boolean;
  /** 格式标识，默认 `"HH:mm:ss"`（或 `"HH:mm"`）。 */
  format?: string;
  /** 分钟步进（列表模式下默认 15 分钟，滚轮模式下默认 1 分钟）。 */
  minuteStep?: number;
  /** `minuteStep` 的同义属性（affectUI API 兼容）。 */
  step?: number;
  /** 秒钟步进。 */
  secondStep?: number;
  /** 尺寸：xs 24px，sm 28px，md 32px，lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 最小宽度。 */
  width?: number | string;
  /** 是否允许清除。 */
  allowClear?: boolean;
  /** `allowClear` 的同义属性。 */
  clearable?: boolean;
  /** 禁用。 */
  disabled?: boolean;
  /** 错误态。 */
  invalid?: boolean;
  /** 是否采用 12 小时制（AM/PM）。 */
  use12Hours?: boolean;
  /** 小时制式：`12` 或 `24`（affectUI API 兼容，优先级高于 `use12Hours`）。 */
  hourCycle?: 12 | 24;
  /** 最早可选时间（`HH:mm` 或 `HH:mm:ss`）。 */
  minTime?: string;
  /** 最晚可选时间（`HH:mm` 或 `HH:mm:ss`）。 */
  maxTime?: string;
  /** 是否允许在面板顶部快速输入自然时间（如 `9:30 pm`、`930`）。 */
  editable?: boolean;
  /** 面板选择模式：单列时段列表（默认，1:1 affectUI）或多列滚轮。 */
  mode?: "list" | "intervals" | "columns" | "dial" | "wheel";
  /** 指定浮层挂载容器。 */
  container?: HTMLElement | null;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

/** 自然语言时间解析：支持 `930`、`3pm`、`9:30 pm`、`21.30`、`9p`、`noon`、`midnight`、`14:05:30` 等常见写法，解析失败返回 `null`。 */
export function parseNaturalTime(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === "noon") return "12:00";
  if (trimmed === "midnight") return "00:00";
  const ampmMatch = /(?:\s*(am|pm|a|p))$/.exec(trimmed);
  const period = ampmMatch?.[1]?.startsWith("p") ? "pm" : ampmMatch?.[1]?.startsWith("a") ? "am" : null;
  const core = ampmMatch ? trimmed.slice(0, trimmed.length - ampmMatch[0].length).trim() : trimmed;
  let h = 0;
  let m = 0;
  let s = 0;
  let hasSeconds = false;

  const sepMatch = /^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/.exec(core);
  if (sepMatch) {
    h = Number.parseInt(sepMatch[1], 10);
    m = Number.parseInt(sepMatch[2], 10);
    if (sepMatch[3] !== undefined) {
      hasSeconds = true;
      s = Number.parseInt(sepMatch[3], 10);
    }
  } else if (/^\d{3,4}$/.test(core)) {
    const padded = core.padStart(4, "0");
    h = Number.parseInt(padded.slice(0, 2), 10);
    m = Number.parseInt(padded.slice(2, 4), 10);
  } else if (/^\d{1,2}$/.test(core)) {
    h = Number.parseInt(core, 10);
    m = 0;
  } else {
    return null;
  }

  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s) || m > 59 || s > 59) return null;
  if (period === "pm" && h < 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  if (h > 23) return null;

  return hasSeconds ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(h)}:${pad2(m)}`;
}

function toSeconds(val?: string): number | null {
  if (!val) return null;
  const parsed = parseTimeParts(val);
  return parsed.h * 3600 + parsed.m * 60 + parsed.s;
}

function parseTimeParts(val: string) {
  const [hStr = "0", mStr = "0", sStr = "0"] = val.split(":");
  const h = Math.min(23, Math.max(0, Number.parseInt(hStr, 10) || 0));
  const m = Math.min(59, Math.max(0, Number.parseInt(mStr, 10) || 0));
  const s = Math.min(59, Math.max(0, Number.parseInt(sStr, 10) || 0));
  return { h, m, s };
}

function makeSteps(maxExclusive: number, step = 1): number[] {
  const safeStep = Math.max(1, step);
  const res: number[] = [];
  for (let i = 0; i < maxExclusive; i += safeStep) res.push(i);
  return res;
}

/**
 * affectUI 时间选择器：定制多列滚动时分秒浮层 + `tabular-nums`，严禁使用原生 `<input type="time">`。
 */
export const AfTimePicker = forwardRef<HTMLDivElement, AfTimePickerProps>(function AfTimePicker(
  {
    value: valueProp,
    defaultValue = "",
    onChange,
    onValueChange,
    name,
    placeholder: placeholderProp,
    label,
    fieldLabel,
    optional,
    required,
    locale,
    hint,
    error,
    showSecond: showSecondProp,
    showSeconds: showSecondsProp,
    format = "HH:mm",
    minuteStep = 1,
    step: stepProp,
    secondStep = 1,
    size = "md",
    width = 160,
    allowClear = false,
    clearable = false,
    disabled: disabledProp = false,
    invalid,
    use12Hours = false,
    hourCycle,
    minTime,
    maxTime,
    editable = false,
    mode: modeProp,
    container,
    id: idProp,
    className,
    style,
  } = {},
  forwardedRef,
) {
  const isZh = isZhLocale(locale);
  const placeholder = placeholderProp ?? (isZh ? "选择时间…" : "Select time…");
  const fieldCtx = useAfFormFieldControl();
  const popId = useId();
  const hintId = `${popId}-hint`;
  const errorId = `${popId}-err`;
  const triggerRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const showSeconds = showSecondsProp ?? showSecondProp ?? format.includes("s");
  const resolvedMode = modeProp ?? (showSeconds ? "columns" : "list");
  const isListMode = resolvedMode === "list" || resolvedMode === "intervals";
  const is12Hours = hourCycle ? hourCycle === 12 : use12Hours;
  const canClear = Boolean(allowClear || clearable);
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);

  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      onChange?.(next);
      onValueChange?.(next);
    },
  });
  const [open, setOpen] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [activeSlotIdx, setActiveSlotIdx] = useState(-1);

  const initialParts = useMemo(() => parseTimeParts(value || "09:00:00"), [value]);
  const [draft, setDraft] = useState(initialParts);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const containerEl = colsRef.current;
      if (!containerEl) return;
      if (isListMode) {
        const selectedCell = containerEl.querySelector<HTMLElement>('.af-timepicker__cell[data-selected="true"]');
        if (selectedCell) {
          containerEl.scrollTop = Math.max(
            0,
            selectedCell.offsetTop - Math.round((containerEl.clientHeight - selectedCell.offsetHeight) / 2),
          );
        }
        return;
      }
      containerEl.querySelectorAll<HTMLElement>('.af-timepicker__cell[data-selected="true"]').forEach((cell) => {
        cell.scrollIntoView?.({ block: "nearest" });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, isListMode]);

  const minSec = useMemo(() => toSeconds(minTime), [minTime]);
  const maxSec = useMemo(() => toSeconds(maxTime), [maxTime]);
  const isOutOfRange = (h: number, m: number, s: number) => {
    const sec = h * 3600 + m * 60 + s;
    if (minSec !== null && sec < minSec) return true;
    if (maxSec !== null && sec > maxSec) return true;
    return false;
  };

  const hours = useMemo(() => makeSteps(is12Hours ? 12 : 24, 1), [is12Hours]);
  const minutes = useMemo(() => makeSteps(60, stepProp ?? minuteStep), [stepProp, minuteStep]);
  const seconds = useMemo(() => makeSteps(60, secondStep), [secondStep]);
  const intervalSlots = useMemo(() => {
    const step = Math.max(1, stepProp ?? (minuteStep > 1 ? minuteStep : 15));
    const slots: string[] = [];
    for (let total = 0; total < 24 * 60; total += step) {
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (!isOutOfRange(h, m, 0)) {
        slots.push(`${pad2(h)}:${pad2(m)}`);
      }
    }
    return slots;
  }, [stepProp, minuteStep, minSec, maxSec]);

  const intervalThumb = useMenuHighlight(
    colsRef,
    activeSlotIdx,
    open && isListMode,
    String(intervalSlots.length),
  );

  useEffect(() => {
    if (!open) {
      setActiveSlotIdx(-1);
      return;
    }
    if (isListMode) {
      const idx = intervalSlots.indexOf(value);
      setActiveSlotIdx(idx >= 0 ? idx : -1);
    }
  }, [open, isListMode, value, intervalSlots]);

  const formatDisplay = (raw: string) => {
    if (!raw) return "";
    if (!is12Hours) return raw;
    const parts = parseTimeParts(raw);
    const period = parts.h >= 12 ? "PM" : "AM";
    const h12 = parts.h % 12 === 0 ? 12 : parts.h % 12;
    return showSeconds
      ? `${pad2(h12)}:${pad2(parts.m)}:${pad2(parts.s)} ${period}`
      : `${pad2(h12)}:${pad2(parts.m)} ${period}`;
  };

  const hasError = error !== undefined && error !== null && error !== "";
  const bad = Boolean(invalid || hasError || fieldCtx?.invalid);
  const shake = useFieldShake(bad);
  const resolvedId = idProp ?? fieldCtx?.controlId;
  const resolvedDescribedBy =
    [fieldCtx?.describedBy, hint && !hasError ? hintId : undefined, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  const commitDraft = (parts: { h: number; m: number; s: number }, closeAfter = true, viaPointer = true) => {
    const formatted = showSeconds ? `${pad2(parts.h)}:${pad2(parts.m)}:${pad2(parts.s)}` : `${pad2(parts.h)}:${pad2(parts.m)}`;
    setValue(formatted);
    if (closeAfter) {
      setOpen(false);
      const trigger = triggerRef.current;
      if (!trigger) return;
      const suppressVisible = viaPointer || trigger.dataset.pointerFocus === "true";
      try {
        (trigger as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
          preventScroll: true,
          focusVisible: !suppressVisible,
        });
      } catch {
        trigger.focus({ preventScroll: true });
      }
    }
  };

  return (
    <div className={cn("af-timepicker", className)} style={{ minWidth: width, ...style }}>
      {name && !disabled ? <input type="hidden" name={name} value={value} /> : null}
      {fieldLabel ? (
        <div className="af-select__head">
          <span
            className="af-select__label"
            onClick={() => {
              if (!disabled) triggerRef.current?.focus();
            }}
          >
            {fieldLabel}
          </span>
          {optional ? (
            <span className="af-select__optional">
              {optional === true ? (isZh ? "可选" : "Optional") : optional}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        role="combobox"
        aria-haspopup={isListMode ? "listbox" : "dialog"}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={label ?? (typeof fieldLabel === "string" ? fieldLabel : "Select time")}
        aria-required={required || fieldCtx?.required || undefined}
        aria-invalid={bad ? true : "false"}
        aria-describedby={resolvedDescribedBy}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className="af-select__trigger"
        data-size={size}
        data-open={open || undefined}
        data-invalid={bad || undefined}
        data-shake={shake || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pointerFocus = "true";
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            delete event.currentTarget.dataset.pointerFocus;
          }
        }}
        onClick={() => {
          if (disabled) return;
          if (!open) setDraft(parseTimeParts(value || "09:00:00"));
          setOpen((v) => !v);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setDraft(parseTimeParts(value || "09:00:00"));
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span className="af-select__content">
          <AfIcon name="clock" size={14} className="af-field__icon" />
          <span className="af-select__value" data-placeholder={!value || undefined} style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDisplay(value) || placeholder}
          </span>
        </span>
        {canClear && value && !disabled ? (
          <button
            type="button"
            className="af-select__clear"
            aria-label="Clear time"
            onClick={(event) => {
              event.stopPropagation();
              setValue("");
            }}
          >
            <AfIcon name="x" size={11} />
          </button>
        ) : null}
        <AfIcon name="chevronDown" size={14} className="af-select__chevron" />
      </div>
      <AfPopover
        id={popId}
        open={open}
        anchorRef={triggerRef}
        role={isListMode ? "listbox" : "dialog"}
        label={label ?? (isZh ? "时间选项" : "Time options")}
        animateExit
        container={container}
        className="af-timepicker__pop"
        matchAnchorWidth={isListMode}
        preserveNaturalWidth={!isListMode}
        onPointerDownOutside={() => setOpen(false)}
      >
        {editable ? (
          <div className="af-timepicker__quick-row">
            <input
              type="text"
              className="af-timepicker__quick-input"
              aria-label="Quick time input"
              placeholder="e.g. 9:30 pm or 930"
              value={quickInput}
              onChange={(event) => setQuickInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const parsed = parseNaturalTime(quickInput);
                  if (parsed) {
                    const parts = parseTimeParts(parsed);
                    if (!isOutOfRange(parts.h, parts.m, parts.s)) {
                      setDraft(parts);
                      commitDraft(parts, true, false);
                      setQuickInput("");
                    }
                  }
                }
              }}
            />
          </div>
        ) : null}
        {isListMode ? (
          <div
            ref={colsRef}
            className="af-timepicker__intervals"
            role="listbox"
            aria-label="Time slots"
            onPointerLeave={() => setActiveSlotIdx(-1)}
          >
            {intervalThumb ? (
              <span
                className="af-menu__thumb"
                style={
                  {
                    transform: `translate(${intervalThumb.x}px, ${intervalThumb.y}px)`,
                    width: intervalThumb.width,
                    height: intervalThumb.height,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ) : null}
            {intervalSlots.map((slot, slotIdx) => {
              const slotSelected = value === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={slotSelected}
                  className="af-timepicker__cell af-timepicker__cell--interval"
                  data-menu-index={slotIdx}
                  data-active={activeSlotIdx === slotIdx || undefined}
                  data-selected={slotSelected || undefined}
                  onPointerMove={() => {
                    if (activeSlotIdx !== slotIdx) setActiveSlotIdx(slotIdx);
                  }}
                  onClick={() => {
                    const parts = parseTimeParts(slot);
                    setDraft(parts);
                    commitDraft(parts, true);
                  }}
                >
                  <span>{formatDisplay(slot)}</span>
                  {slotSelected ? (
                    <svg
                      className="af-icon af-menu__check"
                      width={13}
                      height={13}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path pathLength={1} d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div ref={colsRef} className="af-timepicker__cols">
            {is12Hours ? (
              <div className="af-timepicker__col" aria-label="上下午">
                {(["AM", "PM"] as const).map((period) => {
                  const isPm = draft.h >= 12;
                  const active = (period === "PM") === isPm;
                  return (
                    <button
                      key={period}
                      type="button"
                      className="af-timepicker__cell"
                      data-selected={active || undefined}
                      onClick={() => {
                        const h = period === "PM" ? (draft.h % 12) + 12 : draft.h % 12;
                        const next = { ...draft, h };
                        setDraft(next);
                        commitDraft(next, false);
                      }}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="af-timepicker__col" aria-label="小时">
              {hours.map((rawH) => {
                const displayH = is12Hours ? (rawH === 0 ? 12 : rawH) : rawH;
                const actualH = is12Hours ? (draft.h >= 12 ? rawH + 12 : rawH) : rawH;
                const disabledCell = isOutOfRange(actualH, draft.m, draft.s);
                return (
                  <button
                    key={rawH}
                    type="button"
                    className="af-timepicker__cell"
                    data-selected={draft.h === actualH || undefined}
                    disabled={disabledCell}
                    onClick={() => {
                      const next = { ...draft, h: actualH };
                      setDraft(next);
                      commitDraft(next, false);
                    }}
                  >
                    {pad2(displayH)}
                  </button>
                );
              })}
            </div>
            <div className="af-timepicker__col" aria-label="分钟">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="af-timepicker__cell"
                  data-selected={draft.m === m || undefined}
                  disabled={isOutOfRange(draft.h, m, draft.s)}
                  onClick={() => {
                    const next = { ...draft, m };
                    setDraft(next);
                    commitDraft(next, false);
                  }}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
            {showSeconds ? (
              <div className="af-timepicker__col" aria-label="秒">
                {seconds.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="af-timepicker__cell"
                    data-selected={draft.s === s || undefined}
                    disabled={isOutOfRange(draft.h, draft.m, s)}
                    onClick={() => {
                      const next = { ...draft, s };
                      setDraft(next);
                      commitDraft(next, false);
                    }}
                  >
                    {pad2(s)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
        {!isListMode ? (
          <div className="af-picker__foot">
            <AfButton
              size="xs"
              variant="ghost"
              onClick={() => {
                const now = new Date();
                const next = { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
                setDraft(next);
                commitDraft(next, true, true);
              }}
            >
              {isZh ? "此刻" : "Now"}
            </AfButton>
            <AfButton size="xs" variant="primary" onClick={() => commitDraft(draft, true, true)}>
              {isZh ? "确定" : "Apply"}
            </AfButton>
          </div>
        ) : null}
      </AfPopover>
      {hint && !hasError ? (
        <div id={hintId} className="af-timepicker__hint">
          {hint}
        </div>
      ) : null}
      {hasError ? (
        <div id={errorId} className="af-timepicker__error" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
    </div>
  );
});

/** 单点日期时间快捷预设项。 */
export type AfDateTimePreset = {
  key?: string;
  label: ReactNode;
  value: string | ((now: Date) => string);
};

/** 日期时间联合选择器属性。 */
export type AfDateTimePickerProps = {
  /** 受控日期时间字符串（`YYYY-MM-DD HH:mm` 或 `YYYY-MM-DD HH:mm:ss`）。 */
  value?: string;
  /** 非受控初始日期时间。 */
  defaultValue?: string;
  /** 变更回调。 */
  onChange?: (value: string) => void;
  /** 占位提示。 */
  placeholder?: string;
  /** 无障碍标签。 */
  label?: string;
  /** 区域语言（`"zh-CN"` | `"en-US"`）。 */
  locale?: string;
  /** 是否显示秒。 */
  showSecond?: boolean;
  /** `showSecond` 的同义属性。 */
  showSeconds?: boolean;
  /** 左侧快捷时间预设列表。 */
  presets?: ReadonlyArray<AfDateTimePreset>;
  /** 日期禁用钩子。 */
  disabledDate?: (dateKey: string) => boolean;
  /** 节假日角标。 */
  holidays?: Record<string, AfCalendarHolidayInfo>;
  size?: "xs" | "sm" | "md" | "lg";
  width?: number | string;
  allowClear?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  container?: HTMLElement | null;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * 日期时间组合选择器：左侧可选快捷预设 + 7 列 Flexbox 日历 + 右侧滚轮式时分秒面板，零原生日期时间表单依赖。
 */
export const AfDateTimePicker = forwardRef<HTMLDivElement, AfDateTimePickerProps>(function AfDateTimePicker(
  {
    value: valueProp,
    defaultValue = "",
    onChange,
    placeholder: placeholderProp,
    label,
    locale,
    showSecond: showSecondProp,
    showSeconds: showSecondsProp,
    presets,
    disabledDate,
    holidays,
    size = "md",
    width = 216,
    allowClear = false,
    disabled = false,
    invalid,
    container,
    id: idProp,
    className,
    style,
  } = {},
  forwardedRef,
) {
  const isZh = isZhLocale(locale);
  const showSecond = showSecondsProp ?? showSecondProp ?? false;
  const placeholder = placeholderProp ?? (isZh ? "选择日期与时间…" : "Select date & time…");
  const fieldCtx = useAfFormFieldControl();
  const popId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const [open, setOpen] = useState(false);

  const splitValue = (v: string) => {
    const [datePart = toDateKey(new Date()), timePart = "09:00:00"] = v.trim() ? v.trim().split(/\s+/) : [];
    return { datePart, timeParts: parseTimeParts(timePart) };
  };

  const [draftDate, setDraftDate] = useState(() => splitValue(value).datePart);
  const [draftTime, setDraftTime] = useState(() => splitValue(value).timeParts);

  const hours = useMemo(() => makeSteps(24, 1), []);
  const minutes = useMemo(() => makeSteps(60, 1), []);
  const seconds = useMemo(() => makeSteps(60, 1), []);

  const bad = Boolean(invalid || fieldCtx?.invalid);
  const resolvedId = idProp ?? fieldCtx?.controlId;

  const commitValue = (dateStr: string, time: { h: number; m: number; s: number }, closeAfter = true) => {
    const timeStr = showSecond ? `${pad2(time.h)}:${pad2(time.m)}:${pad2(time.s)}` : `${pad2(time.h)}:${pad2(time.m)}`;
    setValue(`${dateStr} ${timeStr}`);
    if (closeAfter) {
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div className={cn("af-datetimepicker", className)} style={{ minWidth: width, ...style }}>
      <div
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={label ?? (isZh ? "选择日期和时间" : "Select date and time")}
        aria-invalid={bad ? true : "false"}
        aria-describedby={fieldCtx?.describedBy}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className="af-select__trigger"
        data-size={size}
        data-open={open || undefined}
        data-invalid={bad || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pointerFocus = "true";
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            delete event.currentTarget.dataset.pointerFocus;
          }
        }}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            const parts = splitValue(value);
            setDraftDate(parts.datePart);
            setDraftTime(parts.timeParts);
          }
          setOpen((v) => !v);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            const parts = splitValue(value);
            setDraftDate(parts.datePart);
            setDraftTime(parts.timeParts);
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span className="af-select__content">
          <AfIcon name="calendar" size={14} className="af-field__icon" />
          <span className="af-select__value" data-placeholder={!value || undefined} style={{ fontVariantNumeric: "tabular-nums" }}>
            {value || placeholder}
          </span>
        </span>
        {allowClear && value && !disabled ? (
          <button
            type="button"
            className="af-select__clear"
            aria-label={isZh ? "清除日期时间" : "Clear date and time"}
            onClick={(event) => {
              event.stopPropagation();
              setValue("");
            }}
          >
            <AfIcon name="x" size={11} />
          </button>
        ) : null}
        <AfIcon name="chevronDown" size={14} className="af-select__chevron" />
      </div>
      <AfPopover
        id={popId}
        open={open}
        anchorRef={triggerRef}
        role="dialog"
        label={label ?? (isZh ? "日期时间面板" : "Date and time panel")}
        animateExit
        container={container}
        className="af-datetimepicker__pop"
        preserveNaturalWidth
        onPointerDownOutside={() => setOpen(false)}
      >
        <div className="af-datetimepicker__body">
          {presets && presets.length > 0 ? (
            <div
              className="af-datetimepicker__presets"
              data-af-hover-list="hover"
              aria-label={isZh ? "快捷时间" : "Quick presets"}
            >
              {presets.map((preset, idx) => (
                <button
                  key={preset.key ?? idx}
                  type="button"
                  className="af-datetimepicker__preset"
                  data-af-hover-item
                  onClick={() => {
                    const resolved = typeof preset.value === "function" ? preset.value(new Date()) : preset.value;
                    const parts = splitValue(resolved);
                    setDraftDate(parts.datePart);
                    setDraftTime(parts.timeParts);
                    commitValue(parts.datePart, parts.timeParts, true);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}
          <AfCalendar
            embedded
            locale={locale}
            value={draftDate}
            month={draftDate.slice(0, 7)}
            onMonthChange={(m) => {
              // keep calendar browsable while preserving selected day
              const [yStr, mStr] = m.split("-");
              if (yStr && mStr) {
                const dayNum = Math.min(28, Number.parseInt(draftDate.slice(8, 10), 10) || 1);
                setDraftDate(`${yStr}-${mStr}-${pad2(dayNum)}`);
              }
            }}
            disabledDate={disabledDate}
            holidays={holidays}
            onChange={(nextDate) => {
              setDraftDate(nextDate);
              commitValue(nextDate, draftTime, false);
            }}
          />
          <div className="af-timepicker__cols">
            <div className="af-timepicker__col" aria-label={isZh ? "小时" : "Hours"}>
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="af-timepicker__cell"
                  data-selected={draftTime.h === h || undefined}
                  onClick={() => {
                    const next = { ...draftTime, h };
                    setDraftTime(next);
                    commitValue(draftDate, next, false);
                  }}
                >
                  {pad2(h)}
                </button>
              ))}
            </div>
            <div className="af-timepicker__col" aria-label={isZh ? "分钟" : "Minutes"}>
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="af-timepicker__cell"
                  data-selected={draftTime.m === m || undefined}
                  onClick={() => {
                    const next = { ...draftTime, m };
                    setDraftTime(next);
                    commitValue(draftDate, next, false);
                  }}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
            {showSecond ? (
              <div className="af-timepicker__col" aria-label={isZh ? "秒" : "Seconds"}>
                {seconds.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="af-timepicker__cell"
                    data-selected={draftTime.s === s || undefined}
                    onClick={() => {
                      const next = { ...draftTime, s };
                      setDraftTime(next);
                      commitValue(draftDate, next, false);
                    }}
                  >
                    {pad2(s)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="af-picker__foot">
          <AfButton
            size="xs"
            variant="ghost"
            onClick={() => {
              const now = new Date();
              const d = toDateKey(now);
              const t = { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
              setDraftDate(d);
              setDraftTime(t);
              commitValue(d, t, true);
            }}
          >
            {isZh ? "此刻" : "Now"}
          </AfButton>
          <AfButton size="xs" variant="primary" onClick={() => commitValue(draftDate, draftTime, true)}>
            {isZh ? "确定" : "Apply"}
          </AfButton>
        </div>
      </AfPopover>
    </div>
  );
});

/** 日期时间范围值元组 `[startDateTime, endDateTime]`。 */
export type AfDateTimeRangeValue = [string, string] | null;
export type AfDateTimeRangeInput = [string | Date, string | Date] | null;

/** 日期时间范围快捷预设。 */
export type AfDateTimeRangePreset = {
  key: string;
  label: ReactNode;
  value: [string, string] | ((now: Date, showSecond: boolean) => [string, string]);
};

/** 日期时间范围联合选择器属性（面向日志审计、任务窗口、监控时间段）。 */
export type AfDateTimeRangePickerProps = {
  /** 受控日期时间范围（如 `["2026-11-16 08:00:00", "2026-11-16 09:00:00"]` 或 `[Date, Date]`）。 */
  value?: AfDateTimeRangeInput;
  /** 非受控初始日期时间范围。 */
  defaultValue?: AfDateTimeRangeInput;
  /** 变更回调。 */
  onChange?: (value: AfDateTimeRangeValue) => void;
  /** 占位提示文案。 */
  placeholder?: string;
  /** 无障碍标签。 */
  label?: string;
  /** 区域语言（`"zh-CN"` | `"en-US"`）。 */
  locale?: string;
  /** 是否精确到秒，默认 `true`（日志检索默认需要秒级精度）。 */
  showSecond?: boolean;
  /** `showSecond` 的同义属性。 */
  showSeconds?: boolean;
  /** 左侧快捷时间窗预设（传 `false` 隐藏预设栏；默认内置 近1小时 / 近6小时 / 今日 / 近24小时 / 近7天 / 近30天）。 */
  presets?: ReadonlyArray<AfDateTimeRangePreset> | false;
  /** 基准当前时间（用于测试确定性快照，默认 `new Date()`）。 */
  now?: Date;
  /** `now` 的同义属性。 */
  today?: Date;
  /** 日期禁用钩子。 */
  disabledDate?: (dateKey: string) => boolean;
  /** 节假日角标。 */
  holidays?: Record<string, AfCalendarHolidayInfo>;
  /** 初始默认展开浮层。 */
  defaultOpen?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  width?: number | string;
  allowClear?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  container?: HTMLElement | null;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

function formatDateTimeStamp(d: Date, showSecond: boolean): string {
  const datePart = toDateKey(d);
  const timePart = showSecond
    ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `${datePart} ${timePart}`;
}

function buildDefaultDateTimeRangePresets(isZh: boolean): AfDateTimeRangePreset[] {
  return [
    {
      key: "1h",
      label: isZh ? "近 1 小时" : "Last 1 hour",
      value: (now, sec) => [formatDateTimeStamp(new Date(now.getTime() - 3600_000), sec), formatDateTimeStamp(now, sec)],
    },
    {
      key: "6h",
      label: isZh ? "近 6 小时" : "Last 6 hours",
      value: (now, sec) => [formatDateTimeStamp(new Date(now.getTime() - 6 * 3600_000), sec), formatDateTimeStamp(now, sec)],
    },
    {
      key: "today",
      label: isZh ? "今日" : "Today",
      value: (now, sec) => {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return [formatDateTimeStamp(start, sec), formatDateTimeStamp(now, sec)];
      },
    },
    {
      key: "24h",
      label: isZh ? "近 24 小时" : "Last 24 hours",
      value: (now, sec) => [formatDateTimeStamp(new Date(now.getTime() - 24 * 3600_000), sec), formatDateTimeStamp(now, sec)],
    },
    {
      key: "7d",
      label: isZh ? "近 7 天" : "Last 7 days",
      value: (now, sec) => [formatDateTimeStamp(new Date(now.getTime() - 7 * 86_400_000), sec), formatDateTimeStamp(now, sec)],
    },
    {
      key: "30d",
      label: isZh ? "近 30 天" : "Last 30 days",
      value: (now, sec) => [formatDateTimeStamp(new Date(now.getTime() - 30 * 86_400_000), sec), formatDateTimeStamp(now, sec)],
    },
  ];
}

function splitDateTimeEndpoint(raw: string | undefined, fallbackDate: Date) {
  if (!raw || !raw.trim()) {
    return {
      datePart: toDateKey(fallbackDate),
      timeParts: {
        h: fallbackDate.getHours(),
        m: fallbackDate.getMinutes(),
        s: fallbackDate.getSeconds(),
      },
    };
  }
  const [datePart = toDateKey(fallbackDate), timePart = "00:00:00"] = raw.trim().split(/\s+/);
  return { datePart, timeParts: parseTimeParts(timePart) };
}

function composeDateTimeEndpoint(datePart: string, time: { h: number; m: number; s: number }, showSecond: boolean): string {
  const t = showSecond ? `${pad2(time.h)}:${pad2(time.m)}:${pad2(time.s)}` : `${pad2(time.h)}:${pad2(time.m)}`;
  return `${datePart} ${t}`;
}

function normalizeDateTimeRangeInput(
  input: AfDateTimeRangeInput | undefined,
  showSecond: boolean,
): AfDateTimeRangeValue | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  const toStamp = (v: string | Date) => (v instanceof Date ? formatDateTimeStamp(v, showSecond) : v);
  return [toStamp(input[0]), toStamp(input[1])];
}

/**
 * 日期时间范围联合选择器：专为日志检索、审计追踪与监控查询打造，
 * 内置左侧快捷时间窗（近 1 小时 / 今日 / 近 7 天 / 近 30 天）、起止端点分段切换、7 列 Flexbox 月历与时分秒滚轮。
 */
export const AfDateTimeRangePicker = forwardRef<HTMLDivElement, AfDateTimeRangePickerProps>(
  function AfDateTimeRangePicker(
    {
      value: valueProp,
      defaultValue = null,
      onChange,
      placeholder: placeholderProp,
      label,
      locale,
      showSecond: showSecondProp,
      showSeconds: showSecondsProp,
      presets: presetsProp,
      now: nowProp,
      today: todayProp,
      disabledDate,
      holidays,
      defaultOpen = false,
      size = "md",
      width = 332,
      allowClear = true,
      disabled = false,
      invalid,
      container,
      id: idProp,
      className,
      style,
    } = {},
    forwardedRef,
  ) {
    const isZh = isZhLocale(locale);
    const showSecond = showSecondsProp ?? showSecondProp ?? true;
    const placeholder =
      placeholderProp ?? (isZh ? "选择开始与结束时间…" : "Select start & end date-time…");
    const fieldCtx = useAfFormFieldControl();
    const popId = useId();
    const triggerRef = useRef<HTMLDivElement>(null);

    const normalizedValueProp = normalizeDateTimeRangeInput(valueProp, showSecond);
    const normalizedDefaultValue = normalizeDateTimeRangeInput(defaultValue, showSecond) ?? null;

    const [value, setValue] = useControllableState<AfDateTimeRangeValue>({
      value: normalizedValueProp,
      defaultValue: normalizedDefaultValue,
      onChange,
    });

    const [open, setOpen] = useState(defaultOpen);
    const [activeEnd, setActiveEnd] = useState<"start" | "end">("start");
    const [activePresetKey, setActivePresetKey] = useState<string | null>(null);

    const getRefNow = () => nowProp ?? todayProp ?? new Date();

    const initDraft = (val: AfDateTimeRangeValue) => {
      const refNow = getRefNow();
      const fallbackStart = new Date(refNow.getTime() - 3600_000);
      return {
        start: splitDateTimeEndpoint(val?.[0], fallbackStart),
        end: splitDateTimeEndpoint(val?.[1], refNow),
      };
    };

    const [draft, setDraft] = useState(() => initDraft(value));
    const [browseMonth, setBrowseMonth] = useState(() => draft.start.datePart.slice(0, 7));

    const resolvedPresets = useMemo(() => {
      if (presetsProp === false) return [];
      return presetsProp ?? buildDefaultDateTimeRangePresets(isZh);
    }, [presetsProp, isZh]);

    const hours = useMemo(() => makeSteps(24, 1), []);
    const minutes = useMemo(() => makeSteps(60, 1), []);
    const seconds = useMemo(() => makeSteps(60, 1), []);

    const bad = Boolean(invalid || fieldCtx?.invalid);
    const resolvedId = idProp ?? fieldCtx?.controlId;

    const currentSlot = draft[activeEnd];
    const startPreview = composeDateTimeEndpoint(draft.start.datePart, draft.start.timeParts, showSecond);
    const endPreview = composeDateTimeEndpoint(draft.end.datePart, draft.end.timeParts, showSecond);

    const openPanel = () => {
      if (disabled) return;
      const nextDraft = initDraft(value);
      setDraft(nextDraft);
      setActiveEnd("start");
      setBrowseMonth(nextDraft.start.datePart.slice(0, 7));
      setOpen(true);
    };

    const applyRange = (customPair?: [string, string]) => {
      const pair: [string, string] = customPair ?? [startPreview, endPreview];
      const ordered: [string, string] = pair[0] <= pair[1] ? pair : [pair[1], pair[0]];
      setValue(ordered);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    const displayText = value ? `${value[0]} → ${value[1]}` : placeholder;

    return (
      <div className={cn("af-datetimepicker af-datetimerangepicker", className)} style={{ minWidth: width, ...style }}>
        <div
          ref={composeRefs(triggerRef, forwardedRef)}
          id={resolvedId}
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          aria-label={label ?? (isZh ? "选择日期时间范围" : "Select date and time range")}
          aria-invalid={bad ? true : "false"}
          aria-describedby={fieldCtx?.describedBy}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          className="af-select__trigger"
          data-size={size}
          data-open={open || undefined}
          data-invalid={bad || undefined}
          data-disabled={disabled || undefined}
          onPointerDown={(event) => {
            event.currentTarget.dataset.pointerFocus = "true";
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              delete event.currentTarget.dataset.pointerFocus;
            }
          }}
          onClick={() => {
            if (disabled) return;
            if (open) setOpen(false);
            else openPanel();
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
              event.preventDefault();
              openPanel();
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <span className="af-select__content">
            <AfIcon name="calendar" size={14} className="af-field__icon" />
            <span
              className="af-select__value"
              data-placeholder={!value || undefined}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {displayText}
            </span>
          </span>
          {allowClear && value && !disabled ? (
            <button
              type="button"
              className="af-select__clear"
              aria-label={isZh ? "清除时间范围" : "Clear date-time range"}
              onClick={(event) => {
                event.stopPropagation();
                setActivePresetKey(null);
                setValue(null);
              }}
            >
              <AfIcon name="x" size={11} />
            </button>
          ) : null}
          <AfIcon name="chevronDown" size={14} className="af-select__chevron" />
        </div>

        <AfPopover
          id={popId}
          open={open}
          anchorRef={triggerRef}
          role="dialog"
          label={label ?? (isZh ? "日期时间范围面板" : "Date and time range panel")}
          animateExit
          container={container}
          className="af-datetimepicker__pop af-datetimerangepicker__pop"
          preserveNaturalWidth
          onPointerDownOutside={() => setOpen(false)}
        >
          <div className="af-datetimerangepicker__layout">
            {resolvedPresets.length > 0 ? (
              <div
                className="af-datetimepicker__presets"
                data-af-hover-list="hover"
                role="listbox"
                aria-label={isZh ? "快捷时间窗" : "Quick time windows"}
              >
                {resolvedPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    role="option"
                    aria-selected={activePresetKey === preset.key}
                    className="af-datetimepicker__preset"
                    data-selected={activePresetKey === preset.key || undefined}
                    data-af-hover-item
                    onClick={() => {
                      const pair =
                        typeof preset.value === "function"
                          ? preset.value(getRefNow(), showSecond)
                          : preset.value;
                      const refNow = getRefNow();
                      const nextStart = splitDateTimeEndpoint(pair[0], refNow);
                      const nextEnd = splitDateTimeEndpoint(pair[1], refNow);
                      setDraft({ start: nextStart, end: nextEnd });
                      setActivePresetKey(preset.key);
                      setBrowseMonth(nextStart.datePart.slice(0, 7));
                      applyRange(pair);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="af-datetimerangepicker__main">
              <div className="af-datetimerangepicker__tabs">
                <AfSegmented
                  size="xs"
                  label={isZh ? "编辑起止端点" : "Active endpoint"}
                  value={activeEnd}
                  onChange={(next) => {
                    setActiveEnd(next);
                    setBrowseMonth(draft[next].datePart.slice(0, 7));
                  }}
                  options={[
                    { value: "start", label: `${isZh ? "开始" : "Start"} · ${startPreview}` },
                    { value: "end", label: `${isZh ? "结束" : "End"} · ${endPreview}` },
                  ]}
                />
              </div>

              <div className="af-datetimepicker__body">
                <AfCalendar
                  embedded
                  locale={locale}
                  value={currentSlot.datePart}
                  month={browseMonth}
                  onMonthChange={setBrowseMonth}
                  disabledDate={disabledDate}
                  holidays={holidays}
                  onChange={(nextDate) => {
                    setActivePresetKey(null);
                    setDraft((prev) => ({
                      ...prev,
                      [activeEnd]: { ...prev[activeEnd], datePart: nextDate },
                    }));
                    setBrowseMonth(nextDate.slice(0, 7));
                  }}
                />

                <div className="af-timepicker__cols">
                  <div className="af-timepicker__col" aria-label={isZh ? "小时" : "Hours"}>
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className="af-timepicker__cell"
                        data-selected={currentSlot.timeParts.h === h || undefined}
                        onClick={() => {
                          setActivePresetKey(null);
                          setDraft((prev) => ({
                            ...prev,
                            [activeEnd]: {
                              ...prev[activeEnd],
                              timeParts: { ...prev[activeEnd].timeParts, h },
                            },
                          }));
                        }}
                      >
                        {pad2(h)}
                      </button>
                    ))}
                  </div>
                  <div className="af-timepicker__col" aria-label={isZh ? "分钟" : "Minutes"}>
                    {minutes.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="af-timepicker__cell"
                        data-selected={currentSlot.timeParts.m === m || undefined}
                        onClick={() => {
                          setActivePresetKey(null);
                          setDraft((prev) => ({
                            ...prev,
                            [activeEnd]: {
                              ...prev[activeEnd],
                              timeParts: { ...prev[activeEnd].timeParts, m },
                            },
                          }));
                        }}
                      >
                        {pad2(m)}
                      </button>
                    ))}
                  </div>
                  {showSecond ? (
                    <div className="af-timepicker__col" aria-label={isZh ? "秒" : "Seconds"}>
                      {seconds.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="af-timepicker__cell"
                          data-selected={currentSlot.timeParts.s === s || undefined}
                          onClick={() => {
                            setActivePresetKey(null);
                            setDraft((prev) => ({
                              ...prev,
                              [activeEnd]: {
                                ...prev[activeEnd],
                                timeParts: { ...prev[activeEnd].timeParts, s },
                              },
                            }));
                          }}
                        >
                          {pad2(s)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="af-picker__foot af-datetimerangepicker__foot">
                <span className="af-datetimerangepicker__summary">
                  {startPreview} → {endPreview}
                </span>
                <span className="af-datetimerangepicker__actions">
                  <AfButton size="xs" variant="ghost" onClick={() => setOpen(false)}>
                    {isZh ? "取消" : "Cancel"}
                  </AfButton>
                  <AfButton size="xs" variant="primary" onClick={() => applyRange()}>
                    {isZh ? "确定" : "Apply"}
                  </AfButton>
                </span>
              </div>
            </div>
          </div>
        </AfPopover>
      </div>
    );
  },
);

export const DateTimeRangePicker = AfDateTimeRangePicker;
