import { useRef, useState } from "react";
import { AfIcon } from "../../icons";
import { daysBetween, formatRange, sameDay, useWidthMorph } from "../../primitives";
import { AfButton } from "../controls/Button";
import { AfSegmented } from "../controls/Segmented";
import { AfPopover } from "../overlay/Popover";
import { AfDateRangeCompare, AfDateRangeValue, monthCells, previousPeriod, previousYear, rangePresets } from "./shared";

/**
 * 日期范围选择：652px 面板（圆角 10）；左侧 140px 十项预设、右侧双月历；
 * footer 两行——上行为区间 + 天数 + 对比说明，下行为对比三档 + 取消 / 应用。
 * 第一次点击定起点，指针移动时区间带以浅色预览，第二次点击定终点；只有点“应用”才提交。
 * 区间带按周换行、每行首尾圆角；对比区间用强调色淡带、端点描边。
 */
export function AfDateRange({ value, onChange, min, max }: { value: AfDateRangeValue; onChange: (value: AfDateRangeValue) => void; min: Date; max: Date }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value.start);
  const [end, setEnd] = useState<Date | null>(value.end);
  const [hover, setHover] = useState<Date | null>(null);
  const [compareMode, setCompareMode] = useState<AfDateRangeCompare>(value.compareMode ?? (value.compare ? "prev" : "off"));
  const [custom, setCustom] = useState(false);
  const [view, setView] = useState(() => new Date(value.end.getFullYear(), value.end.getMonth() - 1, 1));
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /** 打开时用当前值重置草稿；键盘打开时把焦点移入弹层，避免 Tab 顺序跳到窗口末尾。 */
  const openPanel = () => {
    setStart(value.start);
    setEnd(value.end);
    setCompareMode(value.compareMode ?? (value.compare ? "prev" : "off"));
    setCustom(false);
    setHover(null);
    setView(new Date(value.end.getFullYear(), value.end.getMonth() - 1, 1));
    setSlide(null);
    setOpen(true);
    // 弹层首帧是隐藏测量状态，等定位完成后（约 2 帧）再把焦点放进第一个预设
    if (triggerRef.current?.closest(".af")?.getAttribute("data-modality") === "keyboard") {
      window.setTimeout(() => bodyRef.current?.querySelector<HTMLElement>(".af-range__preset")?.focus(), 80);
    }
  };

  /** 关闭并把焦点还给触发器。 */
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  /** 提交草稿：compare 为旧字段，与 compareMode 同步。 */
  const apply = () => {
    if (!end) return;
    onChange({ start, end, compare: compareMode !== "off", compareMode });
    close();
  };

  /**
   * 弹层内的键盘行为：弹层是 portal 出来的，事件不会冒泡回触发器外层，
   * 所以这里单独接一份 Esc（关闭并还焦）与 Enter（不在按钮上时应用草稿）。
   */
  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && end && (event.target as HTMLElement).tagName !== "BUTTON") {
      event.preventDefault();
      apply();
    }
  };

  /** 点选日期：没有起点或区间已完整时重新定起点，否则定终点（早于起点则互换）。 */
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
    } else setEnd(date);
  };

  /** 翻月：内容从移动方向一侧滑入。 */
  const shift = (step: number) => {
    setSlide(step > 0 ? "right" : "left");
    setView((date) => new Date(date.getFullYear(), date.getMonth() + step, 1));
  };

  const rangeEnd = end ?? (hover && hover >= start ? hover : start);
  const rangeStart = end ? start : hover && hover < start ? hover : start;
  const [cmpStart, cmpEnd] = compareMode === "year" ? previousYear(rangeStart, rangeEnd) : previousPeriod(rangeStart, rangeEnd);
  const days = daysBetween(rangeStart, rangeEnd);
  const preset = custom
    ? undefined
    : rangePresets.find((item) => {
        const [a, b] = item.make(max);
        return end && sameDay(a, start) && sameDay(b, end);
      })?.key;
  const appliedPreset = rangePresets.find((item) => {
    const [a, b] = item.make(max);
    return sameDay(a, value.start) && sameDay(b, value.end);
  });
  const appliedMode = value.compareMode ?? (value.compare ? "prev" : "off");
  const triggerLabel = appliedPreset ? appliedPreset.label : formatRange(value.start, value.end);
  // 触发器文字宽度随文案 320ms 滑动，而不是瞬间跳变
  useWidthMorph(triggerRef, `${triggerLabel}|${appliedMode}`, 320);

  /** 渲染一个月。 */
  const month = (offset: number) => {
    const base = new Date(view.getFullYear(), view.getMonth() + offset, 1);
    const cells = monthCells(base.getFullYear(), base.getMonth());
    return (
      <div className="af-cal" key={`${base.getFullYear()}-${base.getMonth()}`} data-slide={slide ?? undefined}>
        <div className="af-cal__title">
          {base.getFullYear()} 年 {base.getMonth() + 1} 月
        </div>
        <div className="af-cal__grid" role="grid">
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
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
            const disabled = date > max || date < min;
            return (
              <span
                key={index}
                className="af-cal__cell"
                data-band={inRange ? "range" : inCompare ? "compare" : undefined}
                data-preview={(inRange && !end) || undefined}
                data-cap-start={(inRange ? isStart : sameDay(date, cmpStart)) || col === 0 || date.getDate() === 1 || undefined}
                data-cap-end={(inRange ? isEnd : sameDay(date, cmpEnd)) || col === 6 || lastOfMonth || undefined}
              >
                <button
                  type="button"
                  className="af-cal__day"
                  data-edge={(inRange && (isStart || isEnd)) || undefined}
                  data-today={sameDay(date, max) || undefined}
                  disabled={disabled}
                  aria-pressed={inRange && (isStart || isEnd)}
                  aria-label={`${date.getMonth() + 1}月${date.getDate()}日`}
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
    <div className="af-range" onKeyDown={onPanelKeyDown}>
      <button ref={triggerRef} type="button" className="af-range__trigger" aria-haspopup="dialog" aria-expanded={open} data-open={open || undefined} onClick={() => (open ? close() : openPanel())}>
        <AfIcon name="calendar" size={14} />
        <span className="af-range__text" key={`${value.start.getTime()}-${value.end.getTime()}-${appliedMode}`}>
          {triggerLabel}
          {appliedMode !== "off" ? <span className="af-range__vs">{appliedMode === "year" ? "对比去年同期" : "对比上一周期"}</span> : null}
        </span>
        <AfIcon name="chevronDown" size={14} className="af-range__chevron" />
      </button>
      <AfPopover
        open={open}
        anchorRef={triggerRef}
        align="end"
        role="dialog"
        label="选择日期范围"
        className="af-range__pop"
        onKeyDown={onPanelKeyDown}
        onPointerDownOutside={() => setOpen(false)}
      >
        <div className="af-range__body" ref={bodyRef} onPointerLeave={() => setHover(null)}>
          <div className="af-range__presets" role="listbox" aria-label="快捷范围">
            {rangePresets.map((item) => (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={preset === item.key}
                className="af-range__preset"
                onClick={() => {
                  const [a, b] = item.make(max);
                  setStart(a);
                  setEnd(b);
                  setCustom(false);
                  setView(new Date(b.getFullYear(), b.getMonth() - 1, 1));
                }}
              >
                {item.label}
              </button>
            ))}
            {/* 自定义：清空预设高亮，随后在月历上点选区间 */}
            <button type="button" role="option" aria-selected={custom} className="af-range__preset" onClick={() => setCustom(true)}>
              自定义
            </button>
          </div>
          <div className="af-range__months">
            <div className="af-range__nav">
              <AfButton size="sm" variant="ghost" icon="chevronLeft" aria-label="上个月" onClick={() => shift(-1)} />
              <AfButton size="sm" variant="ghost" icon="chevronRight" aria-label="下个月" onClick={() => shift(1)} disabled={new Date(view.getFullYear(), view.getMonth() + 2, 1) > max} />
            </div>
            {month(0)}
            {month(1)}
          </div>
        </div>
        <div className="af-range__foot">
          <div className="af-range__summary">
            <span className="af-range__days" key={days}>
              {formatRange(rangeStart, rangeEnd)} · {days} 天
            </span>
            {compareMode !== "off" ? (
              <span className="af-range__cmp" key={`${compareMode}-${cmpStart.getTime()}`}>
                <i aria-hidden />
                {compareMode === "year" ? "去年同期" : "上一周期"}：{formatRange(cmpStart, cmpEnd)}
              </span>
            ) : null}
          </div>
          <div className="af-range__actions">
            <AfSegmented
              label="对比"
              value={compareMode}
              onChange={(next) => setCompareMode(next)}
              options={[
                { value: "off", label: "不对比" },
                { value: "prev", label: "上一周期" },
                { value: "year", label: "去年同期" },
              ]}
            />
            <span className="af-range__spacer" />
            <AfButton size="sm" onClick={close}>
              取消
            </AfButton>
            <AfButton size="sm" variant="primary" disabled={!end} onClick={apply}>
              应用
            </AfButton>
          </div>
        </div>
      </AfPopover>
    </div>
  );
}
