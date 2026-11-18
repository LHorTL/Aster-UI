import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** 开关属性。 */
export type AfSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> & {
  /** 受控打开态。 */
  checked?: boolean;
  /** 非受控初始打开态。 */
  defaultChecked?: boolean;
  /** 切换回调。 */
  onChange?: (checked: boolean) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onCheckedChange?: (checked: boolean) => void;
  /** 无障碍名称（在 FormField 内使用时可省略）。 */
  label?: string;
  /** 无障碍名称别名。 */
  ariaLabel?: string;
  /** 原生表单字段名（打开时自动注入隐藏表单值）。 */
  name?: string;
  /** 原生表单值，默认 `"on"`。 */
  value?: string;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 尺寸，默认 md（32×18px）；sm 为紧凑 26×16px。 */
  size?: "sm" | "md";
  /** 轨道色调：accent（默认品牌色）或 solid（高对比近黑）。 */
  tone?: "accent" | "solid";
  /** 带文字字段时的开关位置：`"end"`（默认，文字在左开关在右）或 `"start"`（开关在左文字在右）。 */
  placement?: "start" | "end";
  /** 错误态。 */
  invalid?: boolean;
  /** 打开时轨道内可选短标记。 */
  checkedChildren?: ReactNode;
  /** 关闭时轨道内可选短标记。 */
  unCheckedChildren?: ReactNode;
  /** 可选标签标题（与轨道组合为带文字字段）。 */
  children?: ReactNode;
  /** 可选辅助说明文案。 */
  description?: ReactNode;
};

/** 精致胶囊开关：32×18px（md）/ 26×16px（sm），支持受控/非受控、原生表单提交、配套说明文字与 FormField 无障碍关联。 */
export const AfSwitch = forwardRef<HTMLButtonElement, AfSwitchProps>(function AfSwitch(
  {
    checked,
    defaultChecked = false,
    onChange,
    onCheckedChange,
    label,
    ariaLabel,
    name,
    value = "on",
    disabled: disabledProp,
    size = "md",
    tone = "solid",
    placement = "end",
    invalid,
    checkedChildren,
    unCheckedChildren,
    children,
    description,
    className,
    onClick,
    id: idProp,
    "aria-label": ariaLabelProp,
    "aria-describedby": ariaDescribedByProp,
    ...rest
  },
  ref,
) {
  const fieldCtx = useAfFormFieldControl();
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const [isChecked, setIsChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked,
    onChange: (next) => {
      onChange?.(next);
      onCheckedChange?.(next);
    },
  });

  const resolvedId = idProp ?? fieldCtx?.controlId;
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const resolvedDescribedBy = [ariaDescribedByProp, fieldCtx?.describedBy].filter(Boolean).join(" ") || undefined;
  const trackText = isChecked ? checkedChildren : unCheckedChildren;
  const resolvedAriaLabel = ariaLabelProp ?? ariaLabel ?? label ?? (typeof children === "string" ? children : undefined);
  const fieldTitle = children ?? label;

  const buttonNode = (
    <>
      {name && isChecked && !disabled ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={ref}
        id={resolvedId}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={resolvedAriaLabel}
        aria-describedby={resolvedDescribedBy}
        aria-invalid={bad || undefined}
        className={cn("af-switch", !children && !description ? className : undefined)}
        data-size={size}
        data-tone={tone}
        data-labeled={trackText ? true : undefined}
        data-invalid={bad || undefined}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setIsChecked(!isChecked);
        }}
        {...rest}
      >
        {trackText ? <span className="af-switch__label">{trackText}</span> : null}
        <span className="af-switch__thumb" aria-hidden="true" />
      </button>
    </>
  );

  if (children === undefined && description === undefined) {
    return buttonNode;
  }

  return (
    <label
      className={cn("af-switch-field", className)}
      data-placement={placement !== "end" ? placement : undefined}
      data-disabled={disabled || undefined}
    >
      {placement === "start" ? buttonNode : null}
      <span className="af-switch-field__text">
        {fieldTitle !== undefined ? <span className="af-switch-field__label">{fieldTitle}</span> : null}
        {description !== undefined ? <span className="af-switch-field__desc">{description}</span> : null}
      </span>
      {placement !== "start" ? buttonNode : null}
    </label>
  );
});
