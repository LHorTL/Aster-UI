import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn, composeRefs, useFieldShake, useImeEnterGuard } from "../../primitives";
import { AfExpand } from "../display/Expand";
import { useAfFormFieldControl } from "./FormField";
import { AfTextarea } from "./Textarea";

/** 输入框属性。 */
export type AfInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
  /** 前置图标：图标名或任意 ReactNode。 */
  icon?: AfIconName | ReactNode;
  /** 前置图标别名：图标名或任意 ReactNode。 */
  leadingIcon?: AfIconName | ReactNode;
  /** 后置图标：图标名或任意 ReactNode。 */
  trailingIcon?: AfIconName | ReactNode;
  /** 输入框内左侧静态内容。 */
  prefix?: ReactNode;
  /** 后置快捷键或单位。 */
  suffix?: ReactNode;
  /** 顶部可见字段标题（与 FormField 独立使用时便捷渲染）。 */
  label?: ReactNode;
  /** 可选标记（配合 `label` 显示 `"可选"` 或自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 底部辅助说明文案。 */
  hint?: ReactNode;
  /** 校验失败。 */
  invalid?: boolean;
  /** 校验说明；传入后在输入框下方展开红字，并在出现瞬间左右抖动一次。 */
  error?: ReactNode;
  /** 高度：xs 24px，sm 28px，md 32px（默认），lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 外观变体：outline（默认发丝描边）/ filled（轻灰填充）/ borderless（无边框行内嵌入）。 */
  variant?: "outline" | "filled" | "borderless";
  /** 内部 `<input>` 元素附加类名。 */
  inputClassName?: string;
  /** 值非空时显示清除按钮（同时支持按 Escape 清空）。 */
  allowClear?: boolean;
  /** `allowClear` 的同义属性（affectUI API 兼容）。 */
  clearable?: boolean;
  /** 显示字数统计；设置 maxLength 时显示 N / max。 */
  showCount?: boolean;
  /** `showCount` 的同义属性（affectUI API 兼容）。 */
  counter?: boolean;
  /** 密码输入显示显隐切换按钮。 */
  revealable?: boolean;
  /** 右侧提供一键复制按钮。 */
  copyable?: boolean;
  /** 值变化便捷回调。 */
  onValueChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  /** 点击清除按钮后的回调。 */
  onClear?: () => void;
  /** IME 安全的回车回调；中文输入法选词上屏回车不会误触。 */
  onPressEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * 输入框：外层发丝环承载全部视觉（底色、0.5px 发丝描边与焦点外圈），
 * 内部原生 input 完全透明，内置中文 IME 防误触回车与无障碍字段联动。
 */
const AfInputBase = forwardRef<HTMLInputElement, AfInputProps>(function AfInput(
  {
    icon,
    leadingIcon,
    trailingIcon,
    prefix,
    suffix,
    label,
    optional,
    hint,
    invalid,
    error,
    size = "md",
    variant = "outline",
    inputClassName,
    className,
    disabled: disabledProp,
    style,
    allowClear,
    clearable,
    showCount,
    counter,
    revealable,
    copyable = false,
    onValueChange,
    onClear,
    onPressEnter,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    maxLength,
    type = "text",
    id: idProp,
    required: requiredProp,
    "aria-describedby": ariaDescribedByProp,
    ...rest
  },
  forwardedRef,
) {
  const fieldCtx = useAfFormFieldControl();
  const inlineErrorId = useId();
  const inlineHintId = `${inlineErrorId}-hint`;
  const autoInputId = `${inlineErrorId}-input`;
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const canClear = Boolean(allowClear || clearable);
  const hasCounter = Boolean(showCount || counter);
  const hasInlineError = error !== undefined && error !== null && error !== "";
  const hasInlineHint = hint !== undefined && hint !== null && hint !== "";
  const hasWrapper = label !== undefined || hint !== undefined || error !== undefined || hasCounter;
  const bad = Boolean(invalid || hasInlineError || fieldCtx?.invalid);
  const shake = useFieldShake(bad);
  const ime = useImeEnterGuard();

  const controlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(() => String(defaultValue ?? ""));
  const currentValue = controlled ? String(value ?? "") : innerValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const lastCopyRef = useRef("");
  const copyTimerRef = useRef<number | null>(null);

  const handleCopy = async () => {
    if (!currentValue) return;
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    let ok = true;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentValue);
      } else {
        inputRef.current?.select();
        ok = document.execCommand ? document.execCommand("copy") : false;
      }
    } catch {
      ok = false;
    }
    let msg = ok ? "Copied" : "Copy failed";
    if (msg === lastCopyRef.current) msg += "\u00A0";
    lastCopyRef.current = msg;
    setCopied(ok);
    setCopyStatus(msg);
    copyTimerRef.current = window.setTimeout(() => {
      copyTimerRef.current = null;
      setCopied(false);
      setCopyStatus("");
    }, 1600);
  };

  const leading = leadingIcon ?? icon;
  const renderIcon = (slot: AfIconName | ReactNode) =>
    typeof slot === "string" ? <AfIcon name={slot as AfIconName} className="af-field__icon" size={14} /> : slot;
  const inputType = revealable && type === "password" ? (revealed ? "text" : "password") : type;

  const resolvedId = idProp ?? fieldCtx?.controlId ?? (label !== undefined ? autoInputId : undefined);
  const resolvedRequired = requiredProp ?? fieldCtx?.required;
  const resolvedDescribedBy =
    [
      ariaDescribedByProp,
      fieldCtx?.describedBy,
      hasInlineHint && !hasInlineError ? inlineHintId : null,
      hasInlineError ? inlineErrorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const clear = () => {
    if (!controlled) setInnerValue("");
    const input = inputRef.current;
    if (input) {
      const fake = { target: { value: "" }, currentTarget: input } as unknown as ChangeEvent<HTMLInputElement>;
      onChange?.(fake);
    }
    onValueChange?.("", undefined);
    onClear?.();
    inputRef.current?.focus();
  };

  const field = (
    <label
      className={cn("af-field", !hasWrapper && className)}
      style={!hasWrapper ? style : undefined}
      data-size={size}
      data-variant={variant !== "outline" ? variant : undefined}
      data-invalid={bad || undefined}
      data-shake={shake || undefined}
      data-revealed={revealed || undefined}
      data-disabled={disabled || undefined}
    >
      {leading ? renderIcon(leading) : null}
      {prefix ? <span className="af-field__prefix">{prefix}</span> : null}
      <input
        ref={composeRefs(inputRef, forwardedRef)}
        id={resolvedId}
        className={cn("af-field__input", inputClassName)}
        aria-invalid={bad ? true : "false"}
        aria-describedby={resolvedDescribedBy}
        required={resolvedRequired || undefined}
        disabled={disabled}
        value={currentValue}
        maxLength={maxLength}
        type={inputType}
        onCompositionStart={(event) => {
          ime.onCompositionStart(event);
          onCompositionStart?.(event);
        }}
        onCompositionEnd={(event) => {
          ime.onCompositionEnd(event);
          onCompositionEnd?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === "Escape" && canClear && currentValue.length > 0 && !disabled && !rest.readOnly) {
            event.preventDefault();
            clear();
            return;
          }
          if (event.key === "Enter" && !ime.shouldBlockEnter(event)) {
            onPressEnter?.(event);
          }
        }}
        onChange={(event) => {
          if (!controlled) setInnerValue(event.target.value);
          onChange?.(event);
          onValueChange?.(event.target.value, event);
        }}
        {...rest}
      />
      {canClear && currentValue.length > 0 && !disabled ? (
        <button
          type="button"
          className="af-field__clear"
          aria-label="Clear input"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            clear();
          }}
        >
          <svg
            width={9}
            height={9}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3.25 3.25 8.75 8.75M8.75 3.25 3.25 8.75" />
          </svg>
        </button>
      ) : null}
      {revealable && type === "password" ? (
        <button
          type="button"
          className="af-field__reveal"
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          data-revealed={revealed || undefined}
          onClick={(event) => {
            event.preventDefault();
            setRevealed((val) => !val);
          }}
        >
          {revealed ? (
            <svg
              className="af-icon"
              width={13}
              height={13}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.2 2.2 13.8 13.8" />
              <path d="M6.7 6.75a1.85 1.85 0 0 0 2.55 2.55" />
              <path d="M4.2 4.35C2.8 5.3 1.8 6.8 1.5 8c.65 2.45 3.1 4.5 6.5 4.5 1.25 0 2.4-.3 3.35-.8" />
              <path d="M9.9 3.75A6.7 6.7 0 0 0 8 3.5c-1.1 0-2.1.22-3 .62" />
              <path d="M12.6 5.45C13.6 6.2 14.25 7.1 14.5 8c-.25.92-.82 1.82-1.65 2.58" />
            </svg>
          ) : (
            <AfIcon name="eye" size={13} />
          )}
        </button>
      ) : null}
      {copyable && currentValue.length > 0 ? (
        <span className="af-field__copy-wrap">
          <button
            type="button"
            className="af-field__copy"
            aria-label="Copy value"
            data-copied={copied || undefined}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleCopy();
            }}
          >
            {copied ? (
              <svg
                className="af-icon af-field__copy-check"
                width={13}
                height={13}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path pathLength={1} d="M3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
            ) : (
              <AfIcon name="copy" size={13} />
            )}
          </button>
          <span className="af-field__copy-status" role="status">
            {copyStatus}
          </span>
        </span>
      ) : null}
      {trailingIcon ? renderIcon(trailingIcon) : null}
      {suffix ? <span className="af-field__suffix">{suffix}</span> : null}
    </label>
  );

  if (!hasWrapper) return field;
  return (
    <span className={cn("af-field-wrap", className)} style={style}>
      {label !== undefined ? (
        <span className="af-field-wrap__head">
          <label className="af-field-wrap__label" htmlFor={resolvedId}>
            {label}
          </label>
          {optional ? (
            <span className="af-field-wrap__optional">{optional === true ? "Optional" : optional}</span>
          ) : null}
        </span>
      ) : null}
      {field}
      {hasInlineHint && !hasInlineError && !hasCounter ? (
        <span id={inlineHintId} className="af-field-wrap__hint">
          {hint}
        </span>
      ) : null}
      {hasCounter && !hasInlineError ? (
        <span className="af-field-wrap__foot">
          {hasInlineHint ? (
            <span id={inlineHintId} className="af-field-wrap__hint">
              {hint}
            </span>
          ) : (
            <span />
          )}
          <span className="af-field__count" data-near-limit={maxLength && currentValue.length >= maxLength * 0.9 ? true : undefined}>
            {currentValue.length.toLocaleString("en-US")}
            {maxLength ? `/${maxLength.toLocaleString("en-US")}` : ""}
          </span>
        </span>
      ) : null}
      {hasCounter && hasInlineError ? (
        <span className="af-field__count" data-near-limit={maxLength && currentValue.length >= maxLength * 0.9 ? true : undefined}>
          {currentValue.length.toLocaleString("en-US")}
          {maxLength ? `/${maxLength.toLocaleString("en-US")}` : ""}
        </span>
      ) : null}
      {error !== undefined ? (
        <AfExpand open={hasInlineError}>
          <span id={inlineErrorId} className="af-field-wrap__error" role="alert" aria-live="polite">
            {error}
          </span>
        </AfExpand>
      ) : null}
    </span>
  );
});

/** 密码输入框属性（默认开启显隐切换）。 */
export type AfPasswordInputProps = AfInputProps;

/** 密码输入框：默认启用 `revealable`，也可通过 `AfInput.Password` 访问。 */
export const AfPasswordInput = forwardRef<HTMLInputElement, AfPasswordInputProps>(function AfPasswordInput(
  { revealable = true, type = "password", ...rest },
  ref,
) {
  return <AfInputBase ref={ref} type={type} revealable={revealable} {...rest} />;
});

/** 复合导出：支持 `<AfInput />`、`AfInput.Password` 与 `AfInput.TextArea`。 */
export const AfInput = Object.assign(AfInputBase, {
  Password: AfPasswordInput,
  TextArea: AfTextarea,
});

export type AfTextFieldProps = AfInputProps;
export const AfTextField = AfInput;
