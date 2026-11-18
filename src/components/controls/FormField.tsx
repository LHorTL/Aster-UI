import { createContext, forwardRef, useContext, useId, useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfFormFieldContextValue = {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
};

const AfFormFieldContext = createContext<AfFormFieldContextValue | null>(null);

/** 供 Input / Textarea / Select / NumberInput 自动消费外层 FormField 的无障碍关联属性。 */
export function useAfFormFieldControl() {
  return useContext(AfFormFieldContext);
}

/** 表单字段包裹属性。 */
export type AfFormFieldProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** 字段标签。 */
  label: ReactNode;
  /** 标签下方的说明。 */
  hint?: ReactNode;
  /** 校验错误文字；有值时以 danger 色显示。 */
  error?: ReactNode;
  /** 右侧字符计数或辅助配额节点（自动关联 `aria-describedby`）。 */
  counter?: ReactNode;
  /** 是否显示必填星号。 */
  required?: boolean;
  /** 可选标记（传 `true` 显示 `"可选"`，也可自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 整段字段禁用态（通过上下文自动传递给内部 Aster 表单控件）。 */
  disabled?: boolean;
  /** 关联控件的 id；不传时自动生成并通过上下文注入内部 Aster 表单控件。 */
  htmlFor?: string;
  /** 字段控件（支持直接传节点或 render-prop 函数读取无障碍关联上下文）。 */
  children: ReactNode | ((field: AfFormFieldContextValue) => ReactNode);
};

/** 表单字段包裹：label 12/500、hint 12 muted、error 12 danger，自动完成 label / aria-describedby 绑定。 */
export const AfFormField = forwardRef<HTMLDivElement, AfFormFieldProps>(function AfFormField(
  {
    label,
    hint,
    error,
    counter,
    required = false,
    optional,
    disabled = false,
    htmlFor,
    className,
    children,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const controlId = htmlFor ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const counterId = `${controlId}-counter`;
  const hasHint = hint !== undefined && hint !== null && hint !== "";
  const hasError = error !== undefined && error !== null && error !== "";
  const hasCounter = counter !== undefined && counter !== null && counter !== "";
  const describedBy =
    [hasHint ? hintId : null, hasError ? errorId : null, hasCounter ? counterId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const ctx = useMemo<AfFormFieldContextValue>(
    () => ({
      controlId,
      describedBy,
      invalid: hasError,
      required,
      disabled,
    }),
    [controlId, describedBy, hasError, required, disabled],
  );

  const labelNode = (
    <label className="af-form-field__label" htmlFor={controlId}>
      {label}
      {required ? (
        <span className="af-form-field__required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );

  return (
    <AfFormFieldContext.Provider value={ctx}>
      <div
        ref={ref}
        className={cn("af-form-field", className)}
        data-invalid={hasError || undefined}
        data-disabled={disabled || undefined}
        {...rest}
      >
        {optional ? (
          <div className="af-form-field__head">
            {labelNode}
            <span className="af-form-field__optional">{optional === true ? "Optional" : optional}</span>
          </div>
        ) : (
          labelNode
        )}
        <div className="af-form-field__control">{typeof children === "function" ? children(ctx) : children}</div>
        {hasCounter ? (
          <div className="af-form-field__foot">
            <div className="af-form-field__messages">
              {hasHint ? (
                <span id={hintId} className="af-form-field__hint">
                  {hint}
                </span>
              ) : null}
              {hasError ? (
                <span id={errorId} className="af-form-field__error" role="alert" aria-live="polite">
                  {error}
                </span>
              ) : null}
            </div>
            <span id={counterId} className="af-form-field__counter">
              {counter}
            </span>
          </div>
        ) : (
          <>
            {hasHint ? (
              <span id={hintId} className="af-form-field__hint">
                {hint}
              </span>
            ) : null}
            {hasError ? (
              <span id={errorId} className="af-form-field__error" role="alert" aria-live="polite">
                {error}
              </span>
            ) : null}
          </>
        )}
      </div>
    </AfFormFieldContext.Provider>
  );
});
