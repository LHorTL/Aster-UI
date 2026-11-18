import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, useControllableState } from "../../primitives";
import { AfCheckbox } from "./Checkbox";
import { useAfFormFieldControl } from "./FormField";

/** 复选框组选项。 */
export type AfCheckboxGroupOption = {
  /** 选项值。 */
  value: string;
  /** 选项文字。 */
  label: ReactNode;
  /** 第二行说明（在列表或卡片形态下展示）。 */
  description?: ReactNode;
  /** 卡片形态左侧图标。 */
  icon?: AffectIconKey | ReactNode;
  /** 卡片形态右上角徽标文本。 */
  badge?: ReactNode;
  /** 是否禁用。 */
  disabled?: boolean;
};

/** 复选框组属性。 */
export type AfCheckboxGroupProps = {
  /** 选项列表。 */
  options: AfCheckboxGroupOption[];
  /** 受控已选值。 */
  value?: string[];
  /** `value` 的兼容别名。 */
  values?: string[];
  /** 非受控初始已选值。 */
  defaultValue?: string[];
  /** 变化回调。 */
  onChange?: (value: string[]) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: string[]) => void;
  /** 原生表单字段名。 */
  name?: string;
  /** 组标签。 */
  label?: string;
  /** 视觉形态：`list` 为常规复选列表，`card` 为发丝边框可选卡片。 */
  variant?: "list" | "card";
  /** 排列方向。 */
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

/** 复选框组：统一处理受控/非受控多选数组、发丝可选卡片形态与原生表单提交。 */
export const AfCheckboxGroup = forwardRef<HTMLDivElement, AfCheckboxGroupProps>(function AfCheckboxGroup(
  {
    options,
    value,
    values,
    defaultValue = [],
    onChange,
    onValueChange,
    name,
    label,
    variant = "list",
    orientation = "vertical",
    disabled: disabledProp,
    invalid,
    className,
    style,
  },
  ref,
) {
  const fieldCtx = useAfFormFieldControl();
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const [current, setCurrent] = useControllableState<string[]>({
    value: value ?? values,
    defaultValue,
    onChange: (next) => {
      onChange?.(next);
      onValueChange?.(next);
    },
  });
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const selected = new Set(current);

  const toggleOption = (optionValue: string, checked: boolean) => {
    if (checked) {
      setCurrent(current.includes(optionValue) ? current : [...current, optionValue]);
    } else {
      setCurrent(current.filter((item) => item !== optionValue));
    }
  };

  return (
    <div
      ref={ref}
      id={fieldCtx?.controlId}
      className={cn("af-check-group", variant === "card" && "af-choice-cards", className)}
      style={style}
      role="group"
      aria-label={label}
      aria-describedby={fieldCtx?.describedBy}
      data-orientation={orientation}
      data-variant={variant}
      data-disabled={disabled || undefined}
      data-invalid={bad || undefined}
    >
      {options.map((option) => {
        const isChecked = selected.has(option.value);
        const itemDisabled = Boolean(disabled || option.disabled);

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
                type="checkbox"
                name={name}
                value={option.value}
                checked={isChecked}
                disabled={itemDisabled}
                onChange={(event) => toggleOption(option.value, event.target.checked)}
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
                <span className="af-choice-card__title-row">
                  <span className="af-choice-card__title">{option.label}</span>
                  {option.badge ? <span className="af-choice-card__badge">{option.badge}</span> : null}
                </span>
                {option.description ? <span className="af-choice-card__desc">{option.description}</span> : null}
              </span>
              <span className="af-check__box af-choice-card__indicator" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path pathLength={1} d="M3.75 8.25 6.5 11l5.75-6" />
                </svg>
              </span>
            </label>
          );
        }

        return (
          <AfCheckbox
            key={option.value}
            name={name}
            value={option.value}
            checked={isChecked}
            disabled={itemDisabled}
            invalid={bad}
            description={option.description}
            onChange={(checked) => toggleOption(option.value, checked)}
          >
            {option.label}
          </AfCheckbox>
        );
      })}
    </div>
  );
});
