import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { cn, composeRefs, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

export type AfRatingVariant = "stars" | "thumbs";
export type AfRatingSize = "sm" | "md" | "lg";
export type AfThumbValue = "up" | "down";

type AfRatingBaseProps = Omit<ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> & {
  /** 是否允许再次点击当前选中值以清空评分，默认 `true`。 */
  allowClear?: boolean;
  /** 只读展示态（切换为 `role="img"`，星级模式支持 `0.5` 等小数裁切展示）。 */
  readOnly?: boolean;
  /** 禁用态。 */
  disabled?: boolean;
  /** 尺寸：`sm` (14px) / `md` (18px，默认) / `lg` (24px)。 */
  size?: AfRatingSize;
  /** 原生表单字段名（非只读且未禁用时输出隐藏 `<input type="hidden">`）。 */
  name?: string;
  /** 无障碍名称便捷属性（等价于 `aria-label`）。 */
  label?: string;
};

export type AfRatingStarsProps = AfRatingBaseProps & {
  /** 外观变体：默认 `"stars"` 星级评分。 */
  variant?: "stars";
  /** 受控当前分值（`null` 或 `0` 表示未评分）。 */
  value?: number | null;
  /** 非受控初始分值。 */
  defaultValue?: number | null;
  /** 评分变化回调（affectUI 标准命名）。 */
  onValueChange?: (value: number | null) => void;
  /** `onValueChange` 兼容别名。 */
  onChange?: (value: number | null) => void;
  /** 最大星数（1..50，默认 `5`）。 */
  max?: number;
  /** 自定义分值无障碍读屏文案。 */
  getValueLabel?: (value: number, max: number) => string;
};

export type AfRatingThumbsProps = AfRatingBaseProps & {
  /** 外观变体：`"thumbs"` 赞/踩二元反馈（AI 回答评价）。 */
  variant: "thumbs";
  /** 受控当前反馈值。 */
  value?: AfThumbValue | null;
  /** 非受控初始反馈值。 */
  defaultValue?: AfThumbValue | null;
  /** 反馈变化回调（affectUI 标准命名）。 */
  onValueChange?: (value: AfThumbValue | null) => void;
  /** `onValueChange` 兼容别名。 */
  onChange?: (value: AfThumbValue | null) => void;
  /** 自定义赞/踩按钮的无障碍标签与悬浮提示。 */
  labels?: {
    up?: string;
    down?: string;
  };
};

export type AfRatingProps = AfRatingStarsProps | AfRatingThumbsProps;

const STAR_PATH =
  "M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z";

function StarSvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} focusable="false" aria-hidden="true">
      <path d={STAR_PATH} fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function ThumbUpSvg() {
  return (
    <svg viewBox="0 0 24 24" className="af-rating__icon" focusable="false" aria-hidden="true">
      <path
        d="M2 12.5C2 11.3954 2.89543 10.5 4 10.5C5.65685 10.5 7 11.8431 7 13.5V17.5C7 19.1569 5.65685 20.5 4 20.5C2.89543 20.5 2 19.6046 2 18.5V12.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4787 7.80626L15.2124 8.66634C14.9942 9.37111 14.8851 9.72349 14.969 10.0018C15.0369 10.2269 15.1859 10.421 15.389 10.5487C15.64 10.7065 16.0197 10.7065 16.7791 10.7065H17.1831C19.7532 10.7065 21.0382 10.7065 21.6452 11.4673C21.7145 11.5542 21.7762 11.6467 21.8296 11.7437C22.2965 12.5921 21.7657 13.7351 20.704 16.0211C19.7297 18.1189 19.2425 19.1678 18.338 19.7852C18.2505 19.8449 18.1605 19.9013 18.0683 19.9541C17.116 20.5 15.9362 20.5 13.5764 20.5H13.0646C10.2057 20.5 8.77628 20.5 7.88814 19.6395C7 18.7789 7 17.3939 7 14.6239V13.6503C7 12.1946 7 11.4668 7.25834 10.8006C7.51668 10.1344 8.01135 9.58664 9.00069 8.49112L13.0921 3.96056C13.1947 3.84694 13.246 3.79012 13.2913 3.75075C13.7135 3.38328 14.3652 3.42464 14.7344 3.84235C14.774 3.8871 14.8172 3.94991 14.9036 4.07554C15.0388 4.27205 15.1064 4.37031 15.1654 4.46765C15.6928 5.33913 15.8524 6.37436 15.6108 7.35715C15.5838 7.46692 15.5488 7.5801 15.4787 7.80626Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownSvg() {
  return (
    <svg viewBox="0 0 24 24" className="af-rating__icon" focusable="false" aria-hidden="true">
      <path
        d="M2 11.5C2 12.6046 2.89543 13.5 4 13.5C5.65685 13.5 7 12.1569 7 10.5V6.5C7 4.84315 5.65685 3.5 4 3.5C2.89543 3.5 2 4.39543 2 5.5V11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4787 16.1937L15.2124 15.3337C14.9942 14.6289 14.8851 14.2765 14.969 13.9982C15.0369 13.7731 15.1859 13.579 15.389 13.4513C15.64 13.2935 16.0197 13.2935 16.7791 13.2935H17.1831C19.7532 13.2935 21.0382 13.2935 21.6452 12.5327C21.7145 12.4458 21.7762 12.3533 21.8296 12.2563C22.2965 11.4079 21.7657 10.2649 20.704 7.9789C19.7297 5.88111 19.2425 4.83222 18.338 4.21485C18.2505 4.15508 18.1605 4.0987 18.0683 4.04586C17.116 3.5 15.9362 3.5 13.5764 3.5H13.0646C10.2057 3.5 8.77628 3.5 7.88814 4.36053C7 5.22106 7 6.60607 7 9.37607V10.3497C7 11.8054 7 12.5332 7.25834 13.1994C7.51668 13.8656 8.01135 14.4134 9.00069 15.5089L13.0921 20.0394C13.1947 20.1531 13.246 20.2099 13.2913 20.2493C13.7135 20.6167 14.3652 20.5754 14.7344 20.1577C14.774 20.1129 14.8172 20.0501 14.9036 19.9245C15.0388 19.728 15.1064 19.6297 15.1654 19.5323C15.6928 18.6609 15.8524 17.6256 15.6108 16.6429C15.5838 16.5331 15.5488 16.4199 15.4787 16.1937Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function defaultStarLabel(value: number, max: number) {
  return `${value} out of ${max}`;
}

/**
 * AfRating 评分与反馈控件（affectUI Clean 1:1 复刻）：
 * - `stars` 星级模式：圆角琥珀星标，悬停预览放大 1.12x，点选后 40ms 错峰弹性回弹，只读态支持半星/任意小数 `clip-path` 裁切；
 * - `thumbs` 赞/踩模式：AI 回答二元评价，点选后 ±12° 倾斜轻弹；
 * - 完整键盘无障碍：`role="radiogroup"` 游标导航（方向键含 RTL 翻转、Home/End、Space/Enter 切换、Backspace/Delete 清空）。
 */
export const AfRating = forwardRef<HTMLDivElement, AfRatingProps>(function AfRating(props, forwardedRef) {
  const fieldCtx = useAfFormFieldControl();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popTimerRef = useRef<number | null>(null);
  const popRafRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current);
      if (popRafRef.current !== null) window.cancelAnimationFrame(popRafRef.current);
    },
    [],
  );

  const isThumbs = props.variant === "thumbs";
  const {
    allowClear = true,
    readOnly = false,
    disabled = false,
    size = "md",
    name,
    label,
    className,
    style,
    id: idProp,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledByProp,
    "aria-describedby": ariaDescribedByProp,
  } = props;

  // Extract variant-specific props so `rest` only carries clean HTML div attributes
  const starsProps = !isThumbs ? (props as AfRatingStarsProps) : undefined;
  const thumbsProps = isThumbs ? (props as AfRatingThumbsProps) : undefined;

  const safeMax = Math.min(50, Math.max(1, Math.floor(starsProps?.max ?? 5)));
  const getValueLabel = starsProps?.getValueLabel ?? defaultStarLabel;
  const upLabel = thumbsProps?.labels?.up ?? "Good response";
  const downLabel = thumbsProps?.labels?.down ?? "Bad response";

  const [starValue, setStarValue] = useControllableState<number | null>({
    value: !isThumbs ? (starsProps?.value === 0 ? null : starsProps?.value) : undefined,
    defaultValue: !isThumbs ? (starsProps?.defaultValue === 0 ? null : (starsProps?.defaultValue ?? null)) : null,
    onChange: !isThumbs
      ? (next) => {
          starsProps?.onValueChange?.(next);
          starsProps?.onChange?.(next);
        }
      : undefined,
  });

  const [thumbValue, setThumbValue] = useControllableState<AfThumbValue | null>({
    value: isThumbs ? thumbsProps?.value : undefined,
    defaultValue: isThumbs ? (thumbsProps?.defaultValue ?? null) : null,
    onChange: isThumbs
      ? (next) => {
          thumbsProps?.onValueChange?.(next);
          thumbsProps?.onChange?.(next);
        }
      : undefined,
  });

  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const [popTarget, setPopTarget] = useState<{ seq: number; star?: number; thumb?: AfThumbValue } | null>(null);

  const triggerPop = (next: { star?: number; thumb?: AfThumbValue }, durationMs: number) => {
    if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current);
    if (popRafRef.current !== null) window.cancelAnimationFrame(popRafRef.current);
    if (popTarget !== null) {
      setPopTarget(null);
      popRafRef.current = window.requestAnimationFrame(() => {
        popRafRef.current = null;
        setPopTarget((prev) => ({ seq: (prev?.seq ?? 0) + 1, ...next }));
      });
    } else {
      setPopTarget((prev) => ({ seq: (prev?.seq ?? 0) + 1, ...next }));
    }
    popTimerRef.current = window.setTimeout(() => {
      popTimerRef.current = null;
      setPopTarget(null);
    }, durationMs);
  };

  const resolvedId = idProp ?? fieldCtx?.controlId;
  const resolvedDescribedBy = [ariaDescribedByProp, fieldCtx?.describedBy].filter(Boolean).join(" ") || undefined;
  const resolvedAriaLabel = ariaLabelProp ?? label ?? (ariaLabelledByProp ? undefined : isThumbs ? "Rate this answer" : "Rating");

  // Clean HTML attributes to forward onto root <div>
  const restDivProps: Record<string, unknown> = { ...(props as Record<string, unknown>) };
  delete restDivProps.variant;
  delete restDivProps.value;
  delete restDivProps.defaultValue;
  delete restDivProps.onValueChange;
  delete restDivProps.onChange;
  delete restDivProps.max;
  delete restDivProps.allowClear;
  delete restDivProps.readOnly;
  delete restDivProps.disabled;
  delete restDivProps.size;
  delete restDivProps.getValueLabel;
  delete restDivProps.labels;
  delete restDivProps.name;
  delete restDivProps.label;
  delete restDivProps.className;
  delete restDivProps.style;
  delete restDivProps.id;
  delete restDivProps["aria-label"];
  delete restDivProps["aria-labelledby"];
  delete restDivProps["aria-describedby"];

  const isRtl = () =>
    typeof window !== "undefined" && rootRef.current ? getComputedStyle(rootRef.current).direction === "rtl" : false;

  if (isThumbs) {
    const thumbOrder: AfThumbValue[] = ["up", "down"];
    const activeThumbIndex = thumbValue ? thumbOrder.indexOf(thumbValue) : 0;

    const commitThumb = (target: AfThumbValue) => {
      if (disabled || readOnly) return;
      if (thumbValue === target) {
        if (allowClear) setThumbValue(null);
      } else {
        setThumbValue(target);
        triggerPop({ thumb: target }, 500);
      }
    };

    const handleThumbKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || readOnly) return;
      const rtl = isRtl();
      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        const curIdx = thumbValue ? thumbOrder.indexOf(thumbValue) : 0;
        const delta =
          event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowUp"
              ? -1
              : event.key === "ArrowRight"
                ? rtl
                  ? -1
                  : 1
                : rtl
                  ? 1
                  : -1;
        const nextIdx = (curIdx + delta + 2) % 2;
        const nextVal = thumbOrder[nextIdx];
        setThumbValue(nextVal);
        triggerPop({ thumb: nextVal }, 500);
        itemRefs.current[nextIdx]?.focus();
      } else if ((event.key === "Backspace" || event.key === "Delete") && allowClear && thumbValue !== null) {
        event.preventDefault();
        setThumbValue(null);
      }
    };

    const readOnlyThumbLabel =
      thumbValue === "up" ? upLabel : thumbValue === "down" ? downLabel : (ariaLabelProp ?? label ?? "No feedback");

    return (
      <div
        ref={composeRefs(rootRef, forwardedRef)}
        id={resolvedId}
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? readOnlyThumbLabel : resolvedAriaLabel}
        aria-labelledby={!readOnly ? ariaLabelledByProp : undefined}
        aria-describedby={resolvedDescribedBy}
        aria-disabled={!readOnly && disabled ? true : undefined}
        className={cn("af-rating af-rating--thumbs", className)}
        data-variant="thumbs"
        data-size={size}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        style={style}
        onKeyDown={!readOnly ? handleThumbKeyDown : undefined}
        {...restDivProps}
      >
        {name && !disabled && !readOnly && thumbValue ? <input type="hidden" name={name} value={thumbValue} /> : null}
        {thumbOrder.map((kind, idx) => {
          const isOn = thumbValue === kind;
          const itemLabel = kind === "up" ? upLabel : downLabel;
          const isPopping = popTarget?.thumb === kind;
          if (readOnly) {
            return (
              <span
                key={kind}
                className="af-rating__thumb"
                data-dir={kind}
                data-selected={isOn ? "" : undefined}
                aria-hidden="true"
              >
                {kind === "up" ? <ThumbUpSvg /> : <ThumbDownSvg />}
              </span>
            );
          }
          return (
            <button
              key={kind}
              ref={(node) => {
                itemRefs.current[idx] = node;
              }}
              type="button"
              role="radio"
              className="af-rating__thumb"
              data-dir={kind}
              data-selected={isOn ? "" : undefined}
              data-pop={isPopping ? "" : undefined}
              aria-checked={isOn}
              aria-label={itemLabel}
              title={itemLabel}
              disabled={disabled || undefined}
              tabIndex={disabled ? -1 : idx === (activeThumbIndex >= 0 ? activeThumbIndex : 0) ? 0 : -1}
              onClick={() => commitThumb(kind)}
            >
              {kind === "up" ? <ThumbUpSvg /> : <ThumbDownSvg />}
            </button>
          );
        })}
      </div>
    );
  }

  // Stars mode
  const numericVal = starValue !== null && Number.isFinite(starValue) ? Math.min(safeMax, Math.max(0, starValue)) : 0;
  const effectiveVal = !readOnly && hoverStar !== null ? hoverStar : numericVal;
  const activeStarIndex = numericVal >= 1 ? Math.min(safeMax, Math.round(numericVal)) - 1 : 0;

  const commitStar = (starNumber: number, viaKeyboard = false) => {
    if (disabled || readOnly) return;
    if (!viaKeyboard && numericVal === starNumber && allowClear) {
      setStarValue(null);
      setHoverStar(null);
      return;
    }
    setStarValue(starNumber);
    triggerPop({ star: starNumber }, 460 + starNumber * 40);
  };

  const handleStarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
    const rtl = isRtl();
    let nextStar: number | null = null;
    const currentInt = numericVal >= 1 ? Math.round(numericVal) : 0;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      const dir = event.key === "ArrowRight" && rtl ? -1 : 1;
      nextStar = dir > 0 ? Math.min(safeMax, currentInt + 1) : Math.max(1, (currentInt || 2) - 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      const dir = event.key === "ArrowLeft" && rtl ? 1 : -1;
      if (dir < 0) {
        if (currentInt <= 1) {
          if (allowClear && currentInt === 1 && event.key === "ArrowLeft" && !rtl) {
            event.preventDefault();
            setStarValue(null);
            return;
          }
          nextStar = 1;
        } else {
          nextStar = currentInt - 1;
        }
      } else {
        nextStar = Math.min(safeMax, currentInt + 1);
      }
    } else if (event.key === "Home") {
      nextStar = 1;
    } else if (event.key === "End") {
      nextStar = safeMax;
    } else if ((event.key === "Backspace" || event.key === "Delete") && allowClear && numericVal > 0) {
      event.preventDefault();
      setStarValue(null);
      return;
    }

    if (nextStar !== null) {
      event.preventDefault();
      commitStar(nextStar, true);
      itemRefs.current[nextStar - 1]?.focus();
    }
  };

  const readOnlyAriaLabel =
    ariaLabelProp ??
    label ??
    (numericVal > 0 ? getValueLabel(Number(numericVal.toFixed(2)), safeMax) : `0 out of ${safeMax}`);

  return (
    <div
      ref={composeRefs(rootRef, forwardedRef)}
      id={resolvedId}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? readOnlyAriaLabel : resolvedAriaLabel}
      aria-labelledby={!readOnly ? ariaLabelledByProp : undefined}
      aria-describedby={resolvedDescribedBy}
      aria-disabled={!readOnly && disabled ? true : undefined}
      className={cn("af-rating", className)}
      data-variant="stars"
      data-size={size}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-pop={popTarget?.star !== undefined ? "" : undefined}
      style={style}
      onPointerLeave={() => {
        if (hoverStar !== null) setHoverStar(null);
      }}
      onKeyDown={!readOnly ? handleStarKeyDown : undefined}
      {...restDivProps}
    >
      {name && !disabled && !readOnly && numericVal > 0 ? (
        <input type="hidden" name={name} value={String(numericVal)} />
      ) : null}
      {Array.from({ length: safeMax }, (_, idx) => {
        const starNum = idx + 1;
        const fraction = Math.min(1, Math.max(0, effectiveVal - idx));
        const isFilled = fraction > 0;
        const isPartial = fraction > 0 && fraction < 1;
        const isChecked = Math.round(numericVal) === starNum && numericVal > 0;
        const isHovered = hoverStar === starNum;
        const starStyle = {
          "--af-rtg-f": fraction,
          "--af-rtg-i": idx,
        } as CSSProperties;

        if (readOnly) {
          return (
            <span
              key={starNum}
              className="af-rating__star"
              data-filled={isFilled ? "" : undefined}
              data-partial={isPartial ? "" : undefined}
              style={starStyle}
              aria-hidden="true"
            >
              <span className="af-rating__glyph">
                <StarSvg className="af-rating__svg af-rating__svg--base" />
                <StarSvg className="af-rating__svg af-rating__svg--fill" />
              </span>
            </span>
          );
        }

        return (
          <button
            key={starNum}
            ref={(node) => {
              itemRefs.current[idx] = node;
            }}
            type="button"
            role="radio"
            className="af-rating__star"
            data-filled={isFilled ? "" : undefined}
            data-partial={isPartial ? "" : undefined}
            data-hover={isHovered ? "" : undefined}
            style={starStyle}
            aria-checked={isChecked}
            aria-label={getValueLabel(starNum, safeMax)}
            disabled={disabled || undefined}
            tabIndex={disabled ? -1 : idx === activeStarIndex ? 0 : -1}
            onPointerEnter={(event) => {
              if (!disabled && event.pointerType === "mouse") {
                setHoverStar(starNum);
              }
            }}
            onClick={() => commitStar(starNum, false)}
          >
            <span className="af-rating__glyph" aria-hidden="true">
              <StarSvg className="af-rating__svg af-rating__svg--base" />
              <StarSvg className="af-rating__svg af-rating__svg--fill" />
            </span>
          </button>
        );
      })}
    </div>
  );
});
AfRating.displayName = "AfRating";
