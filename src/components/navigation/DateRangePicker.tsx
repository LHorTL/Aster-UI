import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import {
  addDays,
  cn,
  daysBetween,
  getLocalToday,
  installAfListHover,
  sameDay,
  useControllableState,
  useWidthMorph,
} from "../../primitives";
import { AfButton } from "../controls/Button";
import { AfSegmented } from "../controls/Segmented";
import { AfPopover } from "../overlay/Popover";
import {
  type AfDateRangeCompare,
  type AfDateRangeValue,
  monthCells,
  previousPeriod,
  previousYear,
} from "../advanced/shared";
import {
  type AfDateRangePickerProps,
  DATE_WEEKDAYS_ZH,
  EN_RANGE_PRESETS,
  ZH_RANGE_PRESETS,
  formatDateLabel,
  formatMonthYear,
  formatRangeEn,
  isZhPickerLocale,
  startOfDay,
} from "../_shared/inputs";

const RANGE_DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/**
 * Date Range Picker: 652px anchored popover with quick presets + Custom on the left,
 * dual linked calendars with continuous range & compare bands on the right, `zh-CN` / `en-US`
 * localization, and a two-row footer with day count, 3-way Compare toggle, and Cancel / Apply commit.
 */
export function AfDateRangePicker({
  value: valueProp,
  defaultValue,
  initialValue,
  onChange,
  min,
  max,
  today = getLocalToday(),
  defaultCompare = false,
  defaultOpen = false,
  locale,
  presets: presetsProp,
  className,
}: AfDateRangePickerProps = {}) {
  const isZh = isZhPickerLocale(locale);
  const activePresets = presetsProp ?? (isZh ? ZH_RANGE_PRESETS : EN_RANGE_PRESETS);
  const dowLabels = isZh ? DATE_WEEKDAYS_ZH : RANGE_DOW;
  const effectiveMax = max;
  const normalizedToday = startOfDay(today);
  const presetBase =
    effectiveMax && startOfDay(effectiveMax) < normalizedToday ? startOfDay(effectiveMax) : normalizedToday;
  const [value, setValue] = useControllableState<AfDateRangeValue>({
    value: valueProp,
    defaultValue:
      defaultValue ??
      initialValue ?? {
        start: addDays(presetBase, -29),
        end: presetBase,
        compare: defaultCompare,
        compareMode: defaultCompare ? "prev" : "off",
      },
    onChange,
  });

  const [open, setOpen] = useState(defaultOpen);
  const [start, setStart] = useState(value.start);
  const [end, setEnd] = useState<Date | null>(value.end);
  const [hover, setHover] = useState<Date | null>(null);
  const [compareMode, setCompareMode] = useState<AfDateRangeCompare>(
    value.compareMode ?? (value.compare ? "prev" : "off"),
  );
  const [custom, setCustom] = useState(false);
  const [view, setView] = useState(() => new Date(value.end.getFullYear(), value.end.getMonth() - 1, 1));
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => installAfListHover(), []);

  const openPanel = () => {
    setStart(value.start);
    setEnd(value.end);
    setCompareMode(value.compareMode ?? (value.compare ? "prev" : "off"));
    setCustom(false);
    setHover(null);
    setView(new Date(value.end.getFullYear(), value.end.getMonth() - 1, 1));
    setSlide(null);
    setOpen(true);
    if (triggerRef.current?.closest(".af")?.getAttribute("data-modality") === "keyboard") {
      window.setTimeout(() => bodyRef.current?.querySelector<HTMLElement>(".af-range__preset")?.focus(), 80);
    }
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const apply = () => {
    if (!end) return;
    setValue({ start, end, compare: compareMode !== "off", compareMode });
    close();
  };

  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && end && (event.target as HTMLElement).tagName !== "BUTTON") {
      event.preventDefault();
      apply();
    }
  };

  const pick = (date: Date) => {
    setCustom(true);
    if (end || !start) {
      setStart(date);
      setEnd(null);
      return;
    }
    if (date < start) {
      setEnd(start);
      setStart(date);
    } else {
      setEnd(date);
    }
  };

  const shift = (step: number) => {
    setSlide(step > 0 ? "right" : "left");
    setView((date) => new Date(date.getFullYear(), date.getMonth() + step, 1));
  };

  const rangeEnd = end ?? (hover && hover >= start ? hover : start);
  const rangeStart = end ? start : hover && hover < start ? hover : start;
  const [cmpStart, cmpEnd] =
    compareMode === "year" ? previousYear(rangeStart, rangeEnd) : previousPeriod(rangeStart, rangeEnd);
  const days = daysBetween(rangeStart, rangeEnd);

  const preset = custom
    ? undefined
    : activePresets.find((item) => {
        const [a, b] = item.make(presetBase);
        return end && sameDay(a, start) && sameDay(b, end);
      })?.key;

  const appliedMode = value.compareMode ?? (value.compare ? "prev" : "off");
  const triggerLabel = formatRangeEn(value.start, value.end, locale);
  useWidthMorph(triggerRef, `${triggerLabel}|${appliedMode}`, 320);

  const renderMonth = (offset: number) => {
    const base = new Date(view.getFullYear(), view.getMonth() + offset, 1);
    const cells = monthCells(base.getFullYear(), base.getMonth());
    const monthTitle = formatMonthYear(base, locale);
    return (
      <div className="af-cal" key={`${base.getFullYear()}-${base.getMonth()}`} data-slide={slide ?? undefined}>
        <div className="af-cal__title">{monthTitle}</div>
        <div className="af-cal__grid" role="grid" aria-label={monthTitle}>
          {dowLabels.map((day) => (
            <span key={day} className="af-cal__dow">
              {day}
            </span>
          ))}
          {cells.map((date, index) => {
            if (!date) return <span key={index} className="af-cal__cell" />;
            const col = index % 7;
            const inRange = date >= rangeStart && date <= rangeEnd;
            const inCompare = compareMode !== "off" && date >= cmpStart && date <= cmpEnd;
            const isStart = sameDay(date, rangeStart);
            const isEnd = sameDay(date, rangeEnd);
            const lastOfMonth = date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const dayStart = startOfDay(date);
            const disabled =
              Boolean(effectiveMax && dayStart > startOfDay(effectiveMax)) ||
              Boolean(min && dayStart < startOfDay(min));
            return (
              <span
                key={index}
                className="af-cal__cell"
                data-band={inRange ? "range" : inCompare ? "compare" : undefined}
                data-preview={(inRange && !end) || undefined}
                data-cap-start={
                  (inRange ? isStart : sameDay(date, cmpStart)) || col === 0 || date.getDate() === 1 || undefined
                }
                data-cap-end={
                  (inRange ? isEnd : sameDay(date, cmpEnd)) || col === 6 || lastOfMonth || undefined
                }
              >
                <button
                  type="button"
                  className="af-cal__day"
                  data-edge={(inRange && (isStart || isEnd)) || undefined}
                  data-today={sameDay(date, normalizedToday) || undefined}
                  disabled={disabled}
                  aria-pressed={inRange && (isStart || isEnd)}
                  aria-label={formatDateLabel(date, locale)}
                  onPointerEnter={() => setHover(date)}
                  onClick={() => pick(date)}
                >
                  {date.getDate()}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("af-in-range", className)}>
      <div className="af-range" onKeyDown={onPanelKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          className="af-range__trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-open={open || undefined}
          onClick={() => (open ? close() : openPanel())}
        >
          <AfIcon name="calendar" size={14} />
          <span className="af-range__text" key={`${value.start.getTime()}-${value.end.getTime()}-${appliedMode}`}>
            {triggerLabel}
            {appliedMode !== "off" ? (
              <span className="af-range__vs">
                {appliedMode === "year"
                  ? isZh
                    ? "同比去年"
                    : "vs prev. year"
                  : isZh
                    ? "环比上期"
                    : "vs prev. period"}
              </span>
            ) : null}
          </span>
          <AfIcon name="chevronDown" size={14} className="af-range__chevron" />
        </button>

        <AfPopover
          open={open}
          anchorRef={triggerRef}
          align="start"
          role="dialog"
          label={isZh ? "选择日期范围" : "Select date range"}
          className="af-range__pop"
          onKeyDown={onPanelKeyDown}
          onPointerDownOutside={() => setOpen(false)}
        >
          <div className="af-range__body" ref={bodyRef} onPointerLeave={() => setHover(null)}>
            <div className="af-range__presets" role="listbox" aria-label={isZh ? "快捷时间范围" : "Quick ranges"}>
              {activePresets.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={preset === item.key}
                  className="af-range__preset"
                  onClick={() => {
                    const [a, b] = item.make(presetBase);
                    setStart(a);
                    setEnd(b);
                    setCustom(false);
                    setView(new Date(b.getFullYear(), b.getMonth() - 1, 1));
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                role="option"
                aria-selected={custom}
                className="af-range__preset af-range__preset--custom"
                onClick={() => setCustom(true)}
              >
                {isZh ? "自定义" : "Custom"}
              </button>
            </div>
            <div className="af-range__months">
              <div className="af-range__nav">
                <AfButton size="sm" variant="ghost" icon="chevronLeft" aria-label="Previous month" onClick={() => shift(-1)} />
                <AfButton
                  size="sm"
                  variant="ghost"
                  icon="chevronRight"
                  aria-label="Next month"
                  onClick={() => shift(1)}
                />
              </div>
              {renderMonth(0)}
              {renderMonth(1)}
            </div>
          </div>

          <div className="af-range__foot">
            <div className="af-in-range__foot-left">
              <div className="af-range__summary">
                <span className="af-in-range__range-text">{formatRangeEn(rangeStart, rangeEnd, locale)}</span>
                <span className="af-in-range__day-count" key={days}>
                  {isZh ? `${days} 天` : `${days} ${days === 1 ? "day" : "days"}`}
                </span>
                {compareMode !== "off" ? (
                  <span className="af-range__cmp" key={`${compareMode}-${cmpStart.getTime()}`}>
                    <i aria-hidden />
                    {compareMode === "year"
                      ? isZh
                        ? "去年同期"
                        : "Prev. year"
                      : isZh
                        ? "上一周期"
                        : "Prev. period"}
                    : {formatRangeEn(cmpStart, cmpEnd, locale)}
                  </span>
                ) : null}
              </div>
              <div className="af-in-range__compare-row">
                <span className="af-in-range__cmp-label">{isZh ? "对比" : "Compare"}</span>
                <AfSegmented
                  label={isZh ? "对比" : "Compare"}
                  value={compareMode}
                  onChange={(next) => setCompareMode(next)}
                  options={[
                    { value: "off", label: isZh ? "关闭" : "Off" },
                    { value: "prev", label: isZh ? "上一周期" : "Previous period" },
                    { value: "year", label: isZh ? "去年同期" : "Previous year" },
                  ]}
                />
              </div>
            </div>
            <div className="af-in-range__foot-btns">
              <AfButton size="sm" onClick={close}>
                {isZh ? "取消" : "Cancel"}
              </AfButton>
              <AfButton size="sm" variant="primary" disabled={!end} onClick={apply}>
                {isZh ? "确定" : "Apply"}
              </AfButton>
            </div>
          </div>
        </AfPopover>
      </div>
    </div>
  );
}
