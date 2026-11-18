import { forwardRef, useId, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** 单选选项。 */
export type AfRadioOption = {
  /** 选项值。 */
  value: string;
  /** 选项文字。 */
  label: ReactNode;
  /** 第二行说明。 */
  description?: ReactNode;
  /** 卡片形态左侧图标。 */
  icon?: AffectIconKey | ReactNode;
  /** 右侧附加角标（如推荐标签或价格）。 */
  badge?: ReactNode;
  /** 该选项是否禁用。 */
  disabled?: boolean;
};

/** 单选组属性。 */
export type AfRadioGroupProps = {
  /** 无障碍名称（在 FormField 内使用时可省略）。 */
  label?: string;
  /** 受控当前值。 */
  value?: string;
  /** 非受控初始值。 */
  defaultValue?: string;
  /** 切换回调。 */
  onChange?: (value: string) => void;
  /** `onChange` 别名（对齐 affectUI 命名）。 */
  onValueChange?: (value: string) => void;
  /** 原生表单字段名。 */
  name?: string;
  /** 选项列表。 */
  options: AfRadioOption[];
  /** 视觉形态：`list` 为默认列表，`card` 为发丝边框单选卡片。 */
  variant?: "list" | "card";
  /** 排列方向，默认纵向。 */
  orientation?: "horizontal" | "vertical";
  /** 整组禁用。 */
  disabled?: boolean;
  /** 校验失败态。 */
  invalid?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/** 单选组：原生 radio 承载键盘切换与 roving tabindex，支持列表与发丝可选卡片两种形态。 */
export const AfRadioGroup = forwardRef<HTMLDivElement, AfRadioGroupProps>(function AfRadioGroup(
  {
    label,
    value,
    defaultValue,
    onChange,
    onValueChange,
    name: nameProp,
    options,
    variant = "list",
    orientation = "vertical",
    disabled: disabledProp,
    invalid,
    className,
    style,
  },
  ref,
) {
  const autoName = useId();
  const fieldCtx = useAfFormFieldControl();
  const groupName = nameProp ?? autoName;
  const [current, setCurrent] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? options.find((opt) => !opt.disabled)?.value ?? "",
    onChange: (next) => {
      onChange?.(next);
      onValueChange?.(next);
    },
  });
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const bad = Boolean(invalid || fieldCtx?.invalid);

  return (
    <div
      ref={ref}
      id={fieldCtx?.controlId}
      className={cn("af-radio-group", variant === "card" && "af-choice-cards", className)}
      style={style}
      role="radiogroup"
      aria-label={label}
      aria-describedby={fieldCtx?.describedBy}
      aria-invalid={bad || undefined}
      data-orientation={orientation}
      data-variant={variant}
      data-disabled={disabled || undefined}
      data-invalid={bad || undefined}
    >
      {options.map((option) => {
        const isChecked = option.value === current;
        const itemDisabled = Boolean(option.disabled || disabled);

        if (variant === "card") {
          return (
            <label
              key={option.value}
              className="af-choice-card"
              data-checked={isChecked || undefined}
              data-disabled={itemDisabled || undefined}
              data-invalid={bad || undefined}
            >
              <input
                className="af-choice-card__input"
                type="radio"
                name={groupName}
                value={option.value}
                required={fieldCtx?.required || undefined}
                checked={isChecked}
                disabled={itemDisabled}
                onChange={() => setCurrent(option.value)}
              />
              {option.icon ? (
                <span className="af-choice-card__icon" aria-hidden="true">
                  {typeof option.icon === "string" ? (
                    <AfIcon name={option.icon as AffectIconKey} size={16} />
                  ) : (
                    option.icon
                  )}
                </span>
              ) : null}
              <span className="af-choice-card__body">
                <span className="af-choice-card__head">
                  <span className="af-choice-card__title">{option.label}</span>
                  {option.badge ? <span className="af-choice-card__badge">{option.badge}</span> : null}
                </span>
                {option.description ? <span className="af-choice-card__desc">{option.description}</span> : null}
              </span>
              <span className="af-radio__dot af-choice-card__indicator" aria-hidden="true" />
            </label>
          );
        }

        return (
          <label
            key={option.value}
            className="af-radio"
            data-disabled={itemDisabled || undefined}
            data-invalid={bad || undefined}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              required={fieldCtx?.required || undefined}
              checked={isChecked}
              disabled={itemDisabled}
              onChange={() => setCurrent(option.value)}
            />
            <span className="af-radio__dot" aria-hidden="true" />
            <span className="af-radio__text">
              <span className="af-radio__label">{option.label}</span>
              {option.description ? <span className="af-radio__desc">{option.description}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
});
