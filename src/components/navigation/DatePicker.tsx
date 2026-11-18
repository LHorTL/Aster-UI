import { forwardRef, useId, useRef, useState, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, composeRefs, getLocalToday, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import {
  type AfDatePickerProps,
  DATE_WEEKDAYS,
  DATE_WEEKDAYS_SUN,
  DATE_WEEKDAYS_SUN_ZH,
  DATE_WEEKDAYS_ZH,
  StagePopover,
  clampDate,
  formatDateLabel,
  formatMonthYear,
  isZhPickerLocale,
  lastDayOfMonth,
  monthCalendarGrid,
  sameDate,
  shiftDate,
  startOfDay,
  toIsoDate,
} from "../_shared/inputs";
import { useAfFormFieldControl } from "../controls/FormField";

/**
 * Date Picker: 32px trigger aligned with `AfInput`, anchored popover with automatic flip/clamp,
 * 6-week 42-cell calendar grid with outside-month muted dates, directional month slide,
 * hidden native form input, and full keyboard navigation.
 */
export const AfDatePicker = forwardRef<HTMLButtonElement, AfDatePickerProps>(function AfDatePicker(
  {
    value,
    defaultValue = null,
    onChange,
    name,
    id: idProp,
    disabled = false,
    invalid = false,
    min,
    max,
    isDateDisabled,
    placeholder: placeholderProp,
    label: labelProp,
    "aria-label": ariaLabelProp,
    showLabel = false,
    hint,
    error,
    optional = false,
    required = false,
    clearable = true,
    allowClear,
    today = getLocalToday(),
    weekStartsOn = 1,
    locale,
    presets,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    showYearNav = false,
    showFooter = false,
    formatDisplay,
    className,
  } = {},
  forwardedRef,
) {
  const isZh = isZhPickerLocale(locale);
  const placeholder = placeholderProp ?? (isZh ? "选择日期" : "Select date");
  const label = ariaLabelProp ?? labelProp ?? (isZh ? "选择日期" : "Select date");
  const canClear = allowClear ?? clearable;
  const fieldCtx = useAfFormFieldControl();
  const [inner, setInner] = useState<Date | null>(() => (defaultValue ? clampDate(defaultValue, min, max) : null));
  const current = value !== undefined ? value : inner;
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [view, setView] = useState(() => {
    const base = current ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [active, setActive] = useState<Date>(() => clampDate(current ?? today, min, max));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const noteId = useId();
  const todayValue = clampDate(today, min, max);

  const resolvedId = idProp ?? fieldCtx?.controlId;
  const bad = Boolean(invalid || error || fieldCtx?.invalid);

  const isDayBlocked = (day: Date) => {
    const d = startOfDay(day);
    if (min && d < startOfDay(min)) return true;
    if (max && d > startOfDay(max)) return true;
    if (isDateDisabled?.(d)) return true;
    return false;
  };

  const commit = (next: Date | null) => {
    const safe = next ? startOfDay(next) : null;
    if (value === undefined) setInner(safe);
    onChange?.(safe);
  };

  const openPanel = () => {
    if (disabled) return;
    const base = current ?? todayValue;
    setSlideDir(null);
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setActive(clampDate(base, min, max));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const select = (date: Date) => {
    if (isDayBlocked(date)) return;
    commit(date);
    close();
  };

  const canShift = (months: number) => {
    const target = new Date(view.getFullYear(), view.getMonth() + months, 1);
    if (min && lastDayOfMonth(target) < startOfDay(min)) return false;
    if (max && target > lastDayOfMonth(max)) return false;
    return true;
  };

  const shiftView = (months: number) => {
    if (!canShift(months)) return;
    setSlideDir(months > 0 ? "right" : "left");
    const next = new Date(view.getFullYear(), view.getMonth() + months, 1);
    setView(next);
    setActive((prev) =>
      clampDate(
        new Date(next.getFullYear(), next.getMonth(), Math.min(prev.getDate(), lastDayOfMonth(next).getDate())),
        min,
        max,
      ),
    );
  };

  const moveActive = (date: Date) => {
    const next = clampDate(date, min, max);
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
      const forward =
        next.getFullYear() > view.getFullYear() ||
        (next.getFullYear() === view.getFullYear() && next.getMonth() > view.getMonth());
      setSlideDir(forward ? "right" : "left");
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    setActive(next);
  };

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(active)}"]`)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, active]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const onDay = target.dataset?.date !== undefined;
    const step =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : event.key === "ArrowDown"
              ? 7
              : 0;
    if (step) {
      event.preventDefault();
      moveActive(shiftDate(active, step));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const offset = weekStartsOn === 1 ? (active.getDay() + 6) % 7 : active.getDay();
      moveActive(shiftDate(active, event.key === "Home" ? -offset : 6 - offset));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const delta = event.shiftKey ? 12 : 1;
      shiftView(event.key === "PageUp" ? -delta : delta);
    } else if ((event.key === "Enter" || event.key === " ") && onDay) {
      event.preventDefault();
      select(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openPanel();
    } else if (open && event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const weeks = monthCalendarGrid(view.getFullYear(), view.getMonth(), weekStartsOn);
  const weekdays = isZh
    ? weekStartsOn === 0
      ? DATE_WEEKDAYS_SUN_ZH
      : DATE_WEEKDAYS_ZH
    : weekStartsOn === 0
      ? DATE_WEEKDAYS_SUN
      : DATE_WEEKDAYS;
  const describedBy = [fieldCtx?.describedBy, error || hint ? noteId : null].filter(Boolean).join(" ") || undefined;
  const displayValue = current
    ? formatDisplay
      ? formatDisplay(current)
      : formatDateLabel(current, locale)
    : placeholder;
  const monthTitle = formatMonthYear(view, locale);

  return (
    <div className={cn("af-in-date", className)}>
      {showLabel && label ? (
        <label className="af-in-date__field-label" htmlFor={resolvedId}>
          <span>{label}</span>
          {optional ? <em>{isZh ? "可选" : "Optional"}</em> : null}
        </label>
      ) : null}
      {name && !disabled ? <input type="hidden" name={name} value={current ? toIsoDate(current) : ""} /> : null}
      <button
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        type="button"
        className="af-in-date__trigger"
        data-open={open || undefined}
        data-invalid={bad || undefined}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required || fieldCtx?.required || undefined}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={bad || undefined}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onTriggerKeyDown}
      >
        <AfIcon name="calendar" size={14} className="af-in-date__icon" />
        <span className="af-in-date__value" data-empty={!current || undefined}>
          {displayValue}
        </span>
        <AfIcon name="chevronDown" size={14} className="af-in-date__chevron" />
      </button>
      {error ? (
        <p id={noteId} className="af-in-date__error" role="alert">
          <AfIcon name="alert" size={12} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={noteId} className="af-in-date__hint">
          {hint}
        </p>
      ) : null}

      <StagePopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} className="af-in-date__pop">
        <div className="af-in-date__pop-layout">
          {presets && presets.length > 0 ? (
            <div className="af-in-date__presets" data-af-hover-list="hover" aria-label={isZh ? "快捷日期" : "Quick dates"}>
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="af-in-date__preset-btn"
                  data-af-hover-item
                  onClick={() => {
                    const target = typeof preset.value === "function" ? preset.value(todayValue) : preset.value;
                    select(clampDate(target, min, max));
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}
          <div
            ref={panelRef}
            className="af-in-date__panel"
            role="dialog"
            aria-label={`${label} calendar`}
            onKeyDown={onPanelKeyDown}
          >
          <div className="af-in-date__head">
            <span className="af-in-date__nav">
              {showYearNav ? (
                <button
                  type="button"
                  className="af-in-date__nav-btn"
                  aria-label="Previous year"
                  disabled={!canShift(-12)}
                  onClick={() => shiftView(-12)}
                >
                  <span className="af-in-date__double" aria-hidden>
                    <AfIcon name="chevronLeft" size={12} />
                    <AfIcon name="chevronLeft" size={12} />
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="af-in-date__nav-btn"
                aria-label="Previous month"
                disabled={!canShift(-1)}
                onClick={() => shiftView(-1)}
              >
                <AfIcon name="chevronLeft" size={14} />
              </button>
            </span>
            <span className="af-in-date__title" aria-live="polite">
              {monthTitle}
            </span>
            <span className="af-in-date__nav">
              <button
                type="button"
                className="af-in-date__nav-btn"
                aria-label="Next month"
                disabled={!canShift(1)}
                onClick={() => shiftView(1)}
              >
                <AfIcon name="chevronRight" size={14} />
              </button>
              {showYearNav ? (
                <button
                  type="button"
                  className="af-in-date__nav-btn"
                  aria-label="Next year"
                  disabled={!canShift(12)}
                  onClick={() => shiftView(12)}
                >
                  <span className="af-in-date__double" aria-hidden>
                    <AfIcon name="chevronRight" size={12} />
                    <AfIcon name="chevronRight" size={12} />
                  </span>
                </button>
              ) : null}
            </span>
          </div>

          <div className="af-in-date__weekdays" aria-hidden>
            {weekdays.map((day) => (
              <span key={day} className="af-in-date__weekday">
                {day}
              </span>
            ))}
          </div>

          <div
            key={`${view.getFullYear()}-${view.getMonth()}`}
            className="af-in-date__weeks"
            data-slide={slideDir ?? undefined}
            role="grid"
            aria-label={monthTitle}
          >
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="af-in-date__week" role="row">
                {week.map(({ date: day, outside }, dayIndex) => {
                  const dayDisabled = isDayBlocked(day);
                  const selected = current ? sameDate(day, current) : false;
                  const isToday = sameDate(day, todayValue);
                  return (
                    <span key={dayIndex} className="af-in-date__cell" role="gridcell">
                      <button
                        type="button"
                        className="af-in-date__day"
                        data-date={toIsoDate(day)}
                        data-outside={outside || undefined}
                        data-selected={selected || undefined}
                        data-today={isToday || undefined}
                        disabled={dayDisabled}
                        aria-pressed={selected}
                        aria-label={formatDateLabel(day, locale)}
                        tabIndex={sameDate(day, active) ? 0 : -1}
                        onClick={() => select(day)}
                      >
                        {day.getDate()}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {showFooter ? (
            <footer className="af-in-date__foot">
              <button
                type="button"
                className="af-in-date__link"
                disabled={isDayBlocked(todayValue)}
                onClick={() => select(todayValue)}
              >
                {isZh ? "今天" : "Today"}
              </button>
              {canClear ? (
                <button
                  type="button"
                  className="af-in-date__link"
                  disabled={!current}
                  onClick={() => {
                    commit(null);
                    close();
                  }}
                >
                  {isZh ? "清空" : "Clear"}
                </button>
              ) : null}
            </footer>
          ) : null}
          </div>
        </div>
      </StagePopover>
    </div>
  );
});
