import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";
import { AfRadioGroup } from "./RadioGroup";

/** 独立单选框属性。 */
export type AfRadioProps = {
  /** 受控选中态。 */
  checked?: boolean;
  /** 非受控初始选中态。 */
  defaultChecked?: boolean;
  /** 状态变化回调。 */
  onChange?: (checked: boolean) => void;
  /** `onChange` 别名（对齐 affectUI 命名）。 */
  onCheckedChange?: (checked: boolean) => void;
  /** 主标签。 */
  children?: ReactNode;
  /** `children` 别名。 */
  label?: ReactNode;
  /** 第二行辅助说明。 */
  description?: ReactNode;
  /** 无可见文字时的无障碍名称。 */
  ariaLabel?: string;
  /** 原生无障碍名称（与 `ariaLabel` 等效，`aria-label` 优先）。 */
  "aria-label"?: string;
  /** 原生 radio 分组名。 */
  name?: string;
  /** 原生表单值。 */
  value?: string;
  /** 是否必填。 */
  required?: boolean;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 校验失败态。 */
  invalid?: boolean;
  /** 控件 id。 */
  id?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/**
 * 独立单选原子控件：16px 发丝圆点 + 强调色选中圆心，适合表格单选行或自定义布局单选项。
 */
const AfRadioBase = forwardRef<HTMLInputElement, AfRadioProps>(function AfRadio(
  {
    checked,
    defaultChecked = false,
    onChange,
    onCheckedChange,
    children,
    label,
    description,
    ariaLabel,
    "aria-label": ariaLabelProp,
    name,
    value,
    required,
    disabled: disabledProp,
    invalid,
    id,
    className,
    style,
  },
  forwardedRef,
) {
  const fieldCtx = useAfFormFieldControl();
  const [isChecked, setIsChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked,
    onChange: (next) => {
      onChange?.(next);
      onCheckedChange?.(next);
    },
  });

  const resolvedId = id ?? fieldCtx?.controlId;
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const resolvedRequired = required ?? fieldCtx?.required;
  const content = children ?? label;

  return (
    <label
      className={cn("af-radio", className)}
      style={style}
      data-disabled={disabled || undefined}
      data-invalid={bad || undefined}
    >
      <input
        ref={forwardedRef}
        id={resolvedId}
        type="radio"
        name={name}
        value={value}
        required={resolvedRequired || undefined}
        checked={isChecked}
        disabled={disabled}
        aria-label={ariaLabelProp ?? ariaLabel}
        aria-describedby={fieldCtx?.describedBy}
        aria-invalid={bad || undefined}
        onChange={(event) => setIsChecked(event.target.checked)}
      />
      <span className="af-radio__dot" aria-hidden="true" />
      {content !== undefined && content !== null ? (
        <span className="af-radio__text">
          <span className="af-radio__label">{content}</span>
          {description ? <span className="af-radio__desc">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

/** 复合单选组件：支持 `<AfRadio />` 与 `<AfRadio.Group />`。 */
export const AfRadio = Object.assign(AfRadioBase, {
  Group: AfRadioGroup,
});
