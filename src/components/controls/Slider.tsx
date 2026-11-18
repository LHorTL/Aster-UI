import {
  forwardRef,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { cn, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** 滑块基础属性。 */
export type AfSliderBaseProps = {
  /** 可见标签；不传时使用 ariaLabel 作为无障碍名称。 */
  label?: string;
  /** 无障碍名称；区间模式可分别传入起点/终点名称。 */
  ariaLabel?: string | [string, string];
  /** 原生表单字段名。 */
  name?: string;
  /** 控件 id。 */
  id?: string;
  /** 最小值，默认 0。 */
  min?: number;
  /** 最大值，默认 100。 */
  max?: number;
  /** 步长，默认 1。 */
  step?: number;
  /** 数值展示格式。 */
  format?: (value: number) => string;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 校验失败态。 */
  invalid?: boolean;
  /** 是否显示当前值，默认 true。 */
  showValue?: boolean;
  /** 悬停/拖拽/聚焦时是否在拇指上方显示刻度气泡，默认 true。 */
  tooltip?: boolean;
  /** 刻度标记。 */
  marks?: Record<number, ReactNode>;
  /** 尺寸：sm 紧凑轨 / md 默认。 */
  size?: "sm" | "md";
  /** 行内纯滑轨模式：省略顶部标题/数值行与底部两端刻度。 */
  inline?: boolean;
  /** 语义色调；colors 存在时被覆盖。 */
  tone?: "accent" | "success" | "warning" | "danger";
  /** 渐变色数组，按位置插值填充轨道。 */
  colors?: string[];
  /** 指针抬起回调。 */
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  /** 根节点附加样式。 */
  className?: string;
  style?: CSSProperties;
};

/** 单值滑块属性。 */
export type AfSliderSingleProps = AfSliderBaseProps & {
  /** 受控当前值。 */
  value?: number;
  /** 非受控初始值。 */
  defaultValue?: number;
  /** 变化回调。 */
  onChange?: (value: number) => void;
  /** `onChange` 别名（对齐 affectUI 命名）。 */
  onValueChange?: (value: number) => void;
  /** 单值模式。 */
  range?: false;
};

/** 区间滑块属性。 */
export type AfSliderRangeProps = AfSliderBaseProps & {
  /** 受控当前区间 [低值, 高值]。 */
  value?: [number, number];
  /** 非受控初始区间 [低值, 高值]。 */
  defaultValue?: [number, number];
  /** 变化回调。 */
  onChange?: (value: [number, number]) => void;
  /** `onChange` 别名（对齐 affectUI 命名）。 */
  onValueChange?: (value: [number, number]) => void;
  /** 区间模式。 */
  range: true;
};

/** 滑块属性。 */
export type AfSliderProps = AfSliderSingleProps | AfSliderRangeProps;

export type AfSliderComponent = {
  (props: AfSliderSingleProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  (props: AfSliderRangeProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  displayName?: string;
};

function AfSliderInner(props: AfSliderProps, forwardedRef: Ref<HTMLDivElement>) {
  const {
    min = 0,
    max = 100,
    step = 1,
    format,
    name,
    id: idProp,
    disabled: disabledProp,
    invalid,
    showValue = true,
    tooltip = true,
    marks,
    size = "md",
    inline = false,
    tone = "accent",
    colors,
    onPointerUp,
    className,
    style,
  } = props;
  const autoId = useId();
  const fieldCtx = useAfFormFieldControl();
  const id = idProp ?? fieldCtx?.controlId ?? autoId;
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const bad = Boolean(invalid || fieldCtx?.invalid);

  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"low" | "high" | null>(null);
  const [singleDragging, setSingleDragging] = useState(false);
  const [focusedThumb, setFocusedThumb] = useState<"low" | "high" | null>(null);
  const isRange = props.range === true;
  const [singleState, setSingleState] = useControllableState<number>({
    value: !isRange ? props.value : undefined,
    defaultValue: !isRange ? (props.defaultValue ?? min) : min,
    onChange: !isRange
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });
  const [rangeState, setRangeState] = useControllableState<[number, number]>({
    value: isRange ? props.value : undefined,
    defaultValue: isRange ? (props.defaultValue ?? [min, max]) : [min, max],
    onChange: isRange
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });
  const rangeValue = isRange ? rangeState : undefined;
  const singleValue = !isRange ? singleState : undefined;

  const normalize = (next: number) => {
    const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
    let val = Math.min(Math.max(next, min), max);
    val = min + Math.round((val - min) / safeStep) * safeStep;
    return Math.min(Math.max(Number(val.toFixed(10)), min), max);
  };

  const percent = (next: number) => (max > min ? ((Math.min(Math.max(next, min), max) - min) / (max - min)) * 100 : 0);

  const low = isRange ? normalize((rangeValue as [number, number])[0]) : normalize(singleValue as number);
  const high = isRange ? normalize((rangeValue as [number, number])[1]) : low;
  const sortedLow = Math.min(low, high);
  const sortedHigh = Math.max(low, high);
  const lowPct = percent(sortedLow);
  const highPct = percent(sortedHigh);
  const ariaLabel = props.ariaLabel;
  const singleLabel = typeof ariaLabel === "string" ? ariaLabel : props.label ?? "Slider";
  const lowLabel = Array.isArray(ariaLabel) ? ariaLabel[0] : props.label ?? "Minimum";
  const highLabel = Array.isArray(ariaLabel) ? ariaLabel[1] : props.label ?? "Maximum";
  const displayValue = isRange
    ? `${format ? format(sortedLow) : sortedLow} – ${format ? format(sortedHigh) : sortedHigh}`
    : format
      ? format(sortedLow)
      : String(sortedLow);
  const gradient = colors?.length ? `linear-gradient(90deg, ${colors.join(", ")})` : undefined;

  const emitSingle = (next: number) => setSingleState(normalize(next));
  const emitRange = (nextLow: number, nextHigh: number) => {
    const start = normalize(Math.min(nextLow, nextHigh));
    const end = normalize(Math.max(nextLow, nextHigh));
    setRangeState([start, end]);
  };

  const updateFromClientX = (clientX: number, which: "low" | "high") => {
    if (!railRef.current || !isRange) return;
    const rect = railRef.current.getBoundingClientRect();
    const ratio = rect.width ? Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) : 0;
    const next = normalize(min + ratio * (max - min));
    if (which === "low") emitRange(Math.min(next, sortedHigh), sortedHigh);
    else emitRange(sortedLow, Math.max(next, sortedLow));
  };

  const startDrag = (which: "low" | "high", event: ReactPointerEvent<HTMLElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      railRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // 忽略合成事件无 pointerCapture 的环境
    }
    setDragging(which);
    updateFromClientX(event.clientX, which);
  };

  const onThumbKeyDown = (which: "low" | "high", event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const current = which === "low" ? sortedLow : sortedHigh;
    const page = Number.isFinite(step) && step > 0 ? step * 10 : 10;
    let next = current;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next += step;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key === "PageDown") next -= page;
    else if (event.key === "PageUp") next += page;
    else return;
    event.preventDefault();
    if (which === "low") emitRange(normalize(next), sortedHigh);
    else emitRange(sortedLow, normalize(next));
  };

  const goToMark = (next: number) => {
    if (disabled) return;
    setDragging(null);
    if (isRange) {
      if (Math.abs(next - sortedLow) <= Math.abs(next - sortedHigh)) emitRange(next, sortedHigh);
      else emitRange(sortedLow, next);
    } else emitSingle(next);
  };

  const lowText = format ? format(sortedLow) : String(sortedLow);
  const highText = format ? format(sortedHigh) : String(sortedHigh);

  return (
    <div
      ref={forwardedRef}
      className={cn("af-slider", className)}
      style={style}
      data-size={size !== "md" ? size : undefined}
      data-inline={inline || undefined}
      data-disabled={disabled || undefined}
      data-invalid={bad || undefined}
      data-tone={bad ? "danger" : tone}
      data-dragging={dragging ?? (singleDragging ? "single" : undefined)}
    >
      {isRange && name && !disabled ? (
        <>
          <input type="hidden" name={name} value={String(sortedLow)} />
          <input type="hidden" name={name} value={String(sortedHigh)} />
        </>
      ) : null}
      {!inline && (props.label || showValue) ? (
        <div className="af-slider__head">
          {props.label ? (
            <label className="af-slider__label" htmlFor={isRange ? undefined : id}>
              {props.label}
            </label>
          ) : (
            <span />
          )}
          {showValue ? <span className="af-slider__value">{displayValue}</span> : null}
        </div>
      ) : null}
      <div
        className="af-slider__control"
        onPointerMove={(event) => {
          if (dragging) updateFromClientX(event.clientX, dragging);
        }}
        onPointerUp={(event) => {
          if (dragging) {
            setDragging(null);
            onPointerUp?.(event);
          }
        }}
        onPointerCancel={() => setDragging(null)}
      >
        <div
          className="af-slider__rail"
          ref={railRef}
          onPointerDown={(event) => {
            if (disabled || !isRange) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
            startDrag(Math.abs(ratio * 100 - lowPct) <= Math.abs(ratio * 100 - highPct) ? "low" : "high", event);
          }}
        >
          <span className="af-slider__track" aria-hidden="true" />
          <span
            className="af-slider__fill"
            style={{
              left: isRange ? `${lowPct}%` : 0,
              width: isRange ? `${Math.max(0, highPct - lowPct)}%` : `${percent(sortedLow)}%`,
              background: gradient,
            }}
            aria-hidden="true"
          />
          {isRange ? (
            <>
              {tooltip ? (
                <>
                  <span
                    className="af-slider__bubble"
                    data-active={dragging === "low" || focusedThumb === "low" || (!dragging && !focusedThumb) || undefined}
                    style={{ left: `${lowPct}%` }}
                    aria-hidden="true"
                  >
                    {lowText}
                  </span>
                  <span
                    className="af-slider__bubble"
                    data-active={dragging === "high" || focusedThumb === "high" || (!dragging && !focusedThumb) || undefined}
                    style={{ left: `${highPct}%` }}
                    aria-hidden="true"
                  >
                    {highText}
                  </span>
                </>
              ) : null}
              <button
                id={id}
                type="button"
                className="af-slider__range-thumb"
                style={{ left: `${lowPct}%` }}
                role="slider"
                aria-label={lowLabel}
                aria-describedby={fieldCtx?.describedBy}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={sortedLow}
                disabled={disabled}
                onFocus={() => setFocusedThumb("low")}
                onBlur={() => setFocusedThumb((prev) => (prev === "low" ? null : prev))}
                onPointerDown={(event) => startDrag("low", event)}
                onKeyDown={(event) => onThumbKeyDown("low", event)}
              />
              <button
                type="button"
                className="af-slider__range-thumb"
                style={{ left: `${highPct}%` }}
                role="slider"
                aria-label={highLabel}
                aria-describedby={fieldCtx?.describedBy}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={sortedHigh}
                disabled={disabled}
                onFocus={() => setFocusedThumb("high")}
                onBlur={() => setFocusedThumb((prev) => (prev === "high" ? null : prev))}
                onPointerDown={(event) => startDrag("high", event)}
                onKeyDown={(event) => onThumbKeyDown("high", event)}
              />
            </>
          ) : (
            <>
              {tooltip ? (
                <span
                  className="af-slider__bubble"
                  data-active="true"
                  style={{ left: `${lowPct}%` }}
                  aria-hidden="true"
                >
                  {lowText}
                </span>
              ) : null}
              <span className="af-slider__thumb" style={{ left: `${lowPct}%` }} aria-hidden="true" />
              <input
                id={id}
                name={name}
                className="af-slider__input"
                type="range"
                min={min}
                max={max}
                step={step}
                value={sortedLow}
                disabled={disabled}
                aria-label={singleLabel}
                aria-describedby={fieldCtx?.describedBy}
                aria-invalid={bad || undefined}
                aria-valuetext={displayValue}
                onChange={(event) => emitSingle(Number(event.target.value))}
                onPointerDown={() => {
                  if (!disabled) setSingleDragging(true);
                }}
                onPointerUp={(event) => {
                  setSingleDragging(false);
                  onPointerUp?.(event as unknown as ReactPointerEvent<HTMLDivElement>);
                }}
                onPointerCancel={() => setSingleDragging(false)}
                onBlur={() => setSingleDragging(false)}
              />
            </>
          )}
          {marks ? (
            <div className="af-slider__marks">
              {Object.entries(marks).map(([raw, content]) => {
                const markValue = Number(raw);
                const markPct = percent(markValue);
                const edge = markPct <= 2 ? "start" : markPct >= 98 ? "end" : undefined;
                const activeMark = isRange ? markValue >= sortedLow && markValue <= sortedHigh : markValue <= sortedLow;
                return (
                  <button
                    key={raw}
                    type="button"
                    className="af-slider__mark"
                    data-active={activeMark || undefined}
                    data-edge={edge}
                    style={{ left: `${markPct}%` }}
                    onClick={() => goToMark(markValue)}
                    aria-label={`Jump to ${format ? format(markValue) : markValue}`}
                    tabIndex={-1}
                  >
                    <span className="af-slider__mark-dot" aria-hidden="true" />
                    <span className="af-slider__mark-label">{content}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      {inline || marks ? null : (
        <div className="af-slider__ends" aria-hidden="true">
          <span>{format ? format(min) : min}</span>
          <span>{format ? format(max) : max}</span>
        </div>
      )}
    </div>
  );
}

/** 精细滑块：4px 发丝轨道 + 14px 纯白微浮雕拇指，支持单值、双拇指区间、刻度点与键盘全操作。 */
export const AfSlider = forwardRef(AfSliderInner) as AfSliderComponent;
AfSlider.displayName = "AfSlider";
