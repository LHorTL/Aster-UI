import { forwardRef, useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { cn, composeRefs, useControllableState } from "../../primitives";
import { useAfFormFieldControl } from "./FormField";

/** 复选框属性。 */
export type AfCheckboxProps = {
  /** 受控选中态。 */
  checked?: boolean;
  /** 非受控初始选中态。 */
  defaultChecked?: boolean;
  /** 切换回调。 */
  onChange?: (checked: boolean) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onCheckedChange?: (checked: boolean) => void;
  /** 半选态，用于“全选”组。 */
  indeterminate?: boolean;
  /** 文字标签；纯勾选框场景可省略并传入 ariaLabel。 */
  children?: ReactNode;
  /** `children` 的快捷标签属性（affectUI API 兼容）。 */
  label?: ReactNode;
  /** 第二行辅助说明。 */
  description?: ReactNode;
  /** 错误提示文案（传入后在下方渲染警报说明并激活红框）。 */
  error?: ReactNode;
  /** 无文字标签时的无障碍名称。 */
  ariaLabel?: string;
  /** 原生表单字段名。 */
  name?: string;
  /** 原生表单提交值。 */
  value?: string;
  /** 是否必填。 */
  required?: boolean;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 是否错误态。 */
  invalid?: boolean;
  /** 控件 id。 */
  id?: string;
  /** 尺寸：sm 14px 紧凑方框（适合表格/行内）/ md 默认 16px。 */
  size?: "sm" | "md";
  /** 外观变体：默认紧致行、纯内联无底纹（plain）或卡片描边样式（card）。 */
  variant?: "default" | "plain" | "card";
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/** 发丝方框复选控件：未选态 0.5px 细环，勾选时对勾以笔画动画浮现；支持受控/非受控与 FormField 上下文。 */
export const AfCheckbox = forwardRef<HTMLInputElement, AfCheckboxProps>(function AfCheckbox(
  {
    checked,
    defaultChecked = false,
    onChange,
    onCheckedChange,
    indeterminate,
    children,
    label,
    description,
    error,
    ariaLabel,
    name,
    value,
    required,
    disabled: disabledProp,
    invalid,
    id,
    size = "md",
    variant = "default",
    className,
    style,
  },
  forwardedRef,
) {
  const fieldCtx = useAfFormFieldControl();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isChecked, setIsChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked,
    onChange: (next) => {
      onChange?.(next);
      onCheckedChange?.(next);
    },
  });

  const content = children ?? label;
  const resolvedId = id ?? fieldCtx?.controlId;
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const hasError = error !== undefined && error !== null && error !== "";
  const bad = Boolean(invalid || hasError || fieldCtx?.invalid);
  const resolvedRequired = required ?? fieldCtx?.required;
  const standalone = (content === undefined || content === null || content === false) && !description;
  const resolvedDescribedBy =
    [fieldCtx?.describedBy, hasError ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const checkLabel = (
    <label
      className={cn(
        "af-check",
        variant === "card" && "af-check--card",
        variant === "plain" && "af-check--plain",
        description ? "af-check--with-desc" : undefined,
        error === undefined && className,
      )}
      style={error === undefined ? style : undefined}
      data-size={size !== "md" ? size : undefined}
      data-standalone={standalone ? "true" : undefined}
      data-variant={variant !== "default" ? variant : undefined}
      data-disabled={disabled || undefined}
      data-invalid={bad || undefined}
    >
      <input
        ref={composeRefs(inputRef, forwardedRef)}
        id={resolvedId}
        name={name}
        value={value}
        required={resolvedRequired || undefined}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={resolvedDescribedBy}
        aria-invalid={bad || undefined}
        aria-checked={indeterminate ? "mixed" : isChecked}
        onChange={(event) => setIsChecked(event.target.checked)}
      />
      <span className="af-check__box" data-indeterminate={indeterminate || undefined} aria-hidden="true">
        {indeterminate ? (
          <span className="af-check__dash" />
        ) : (
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path pathLength={1} d="M3.75 8.25 6.5 11l5.75-6" />
          </svg>
        )}
      </span>
      {content !== undefined && content !== null ? (
        description ? (
          <span className="af-check__text">
            <span className="af-check__label">{content}</span>
            <span className="af-check__desc">{description}</span>
          </span>
        ) : (
          <span>{content}</span>
        )
      ) : null}
    </label>
  );

  if (error === undefined) return checkLabel;

  return (
    <span className={cn("af-check-wrap", className)} style={style}>
      {checkLabel}
      {hasError ? (
        <span id={errorId} className="af-check__error" role="alert" aria-live="polite">
          {error}
        </span>
      ) : null}
    </span>
  );
});
