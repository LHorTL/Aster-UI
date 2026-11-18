import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { AfIcon } from "../../icons";
import { cn, composeRefs, useControllableState } from "../../primitives";
import { type AfOtpInputProps, type OtpStatus } from "../_shared/inputs";
import { useAfFormFieldControl } from "../controls/FormField";

/**
 * OTP Input (Clean): one real transparent input sits over 6 cells so typing, Backspace,
 * arrow jumping, paste stagger and SMS autofill work natively.
 * Gliding focus ring, shimmer verification, shake + reverse clear on error, and converging "Verified" chip.
 */
export const AfOtpInput = forwardRef<HTMLInputElement, AfOtpInputProps>(function AfOtpInput(
  {
    length = 6,
    value,
    defaultValue = "",
    onChange,
    onComplete,
    status: statusProp,
    separator = true,
    numeric = true,
    clearOnError = true,
    resendIn = 30,
    align = "center",
    autoFocus = false,
    subtitle,
    name,
    id: idProp,
    disabled = false,
    invalid = false,
    showResend = true,
    onResend,
    label: labelProp,
    successLabel: successLabelProp,
    errorMessage,
    locale = "en-US",
    validCode,
    maxTries = 4,
    className,
  },
  forwardedRef,
) {
  const isZh = locale === "zh-CN";
  const label = labelProp ?? (isZh ? "安全验证码" : "Verification code");
  const successLabel = successLabelProp ?? (isZh ? "验证通过" : "Verified");
  const fieldCtx = useAfFormFieldControl();
  const [code, setCode] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  });
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(() => Math.min(defaultValue.length, Math.max(0, length - 1)));
  const [pastedFrom, setPastedFrom] = useState<number | null>(null);
  const [innerStatus, setInnerStatus] = useState<OtpStatus>("idle");
  const [persistError, setPersistError] = useState(false);
  const [triesLeft, setTriesLeft] = useState(maxTries);
  const [shake, setShake] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [left, setLeft] = useState(() => Math.max(0, resendIn));

  const inputRef = useRef<HTMLInputElement>(null);
  const boxesRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const lastCompletedRef = useRef<string>("");
  const prevLenRef = useRef<number>(code.length);
  const messageId = useId();

  const isDemoMode = value === undefined && onComplete === undefined && statusProp === undefined;
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const status: OtpStatus = statusProp ?? (bad && innerStatus === "idle" ? "error" : innerStatus);
  const showErrorMsg = status === "error" || persistError;
  const resolvedId = idProp ?? fieldCtx?.controlId;
  const resolvedErrorMessage =
    errorMessage ??
    (isZh
      ? triesLeft > 0
        ? `验证码有误，还剩 ${triesLeft} 次尝试机会。`
        : "尝试次数过多，请下方重新获取验证码。"
      : triesLeft > 0
        ? `That code didn't work. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
        : "Too many attempts. Request a new code below.");

  const busy = disabled || status === "verifying" || status === "success";
  const clampedCursor = Math.max(0, Math.min(cursor, Math.min(code.length, length - 1)));
  const sepAt =
    separator === false ? -1 : typeof separator === "number" ? separator : Math.floor(length / 2);
  const ringOffset = (index: number) => index * (40 + 8) + (sepAt > 0 && index >= sepAt ? 16 : 0);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = code.length;
    if (code.length - prev > 1) {
      setPastedFrom(prev);
      const t = window.setTimeout(() => setPastedFrom(null), 420);
      timers.current.push(t);
    }
    setCursor(Math.min(code.length, Math.max(0, length - 1)));
  }, [code, length]);

  useEffect(() => {
    if (code.length < length) {
      lastCompletedRef.current = "";
      return;
    }
    if (code.length === length && lastCompletedRef.current !== code) {
      lastCompletedRef.current = code;
      onComplete?.(code);
    }
  }, [code, length, onComplete]);

  useEffect(() => {
    if (statusProp !== "error") return;
    setShake(true);
    const shakeTimer = window.setTimeout(() => setShake(false), 420);
    timers.current.push(shakeTimer);
    if (clearOnError && code.length > 0 && value === undefined) {
      const clearTimer = window.setTimeout(() => setClearing(true), 520);
      const doneTimer = window.setTimeout(() => {
        setClearing(false);
        setCode("");
      }, 900);
      timers.current.push(clearTimer, doneTimer);
    }
  }, [statusProp]);

  useEffect(() => {
    if (!isDemoMode || code.length !== length || innerStatus !== "idle") return;
    const isWrong = validCode !== undefined ? code !== validCode : code === "0".repeat(length);
    if (isWrong) {
      setTriesLeft((prev) => Math.max(0, prev - 1));
      setInnerStatus("error");
      setPersistError(true);
      setShake(true);
      if (clearOnError) {
        timers.current.push(window.setTimeout(() => setClearing(true), 560));
        timers.current.push(
          window.setTimeout(() => {
            setClearing(false);
            setShake(false);
            setCode("");
            setInnerStatus("idle");
            setCursor(0);
            inputRef.current?.focus();
          }, 980),
        );
      } else {
        timers.current.push(window.setTimeout(() => setShake(false), 420));
      }
      return;
    }
    setPersistError(false);
    setInnerStatus("verifying");
    timers.current.push(window.setTimeout(() => setInnerStatus("success"), 780));
  }, [clearOnError, code, innerStatus, isDemoMode, length, setCode, validCode]);

  useEffect(() => {
    if (!showResend || left <= 0) return;
    const timer = window.setTimeout(() => setLeft((val) => val - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, showResend]);

  const syncSelectionToSlot = (slot: number) => {
    const safe = Math.max(0, Math.min(slot, Math.min(code.length, length - 1)));
    setCursor(safe);
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      try {
        el.setSelectionRange(safe, Math.min(code.length, safe + 1));
      } catch {
        // Ignore selection range limits in headless environments
      }
    }
  };

  const onFieldPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (busy) return;
    const boxes = boxesRef.current;
    if (!boxes) return;
    const slotEls = Array.from(boxes.querySelectorAll<HTMLElement>(".af-in-otp__box"));
    const x = event.clientX;
    let bestIndex = Math.min(code.length, length - 1);
    let bestDist = Number.POSITIVE_INFINITY;
    slotEls.forEach((slotEl, idx) => {
      const rect = slotEl.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(x - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = idx;
      }
    });
    const targetSlot = Math.min(bestIndex, code.length, length - 1);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      syncSelectionToSlot(targetSlot);
    });
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (busy) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      syncSelectionToSlot(clampedCursor - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      syncSelectionToSlot(clampedCursor + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      syncSelectionToSlot(0);
    } else if (event.key === "End") {
      event.preventDefault();
      syncSelectionToSlot(Math.min(code.length, length - 1));
    }
  };

  return (
    <div
      className={cn("af-in-otp", className)}
      data-status={status}
      data-align={align}
      data-disabled={disabled || undefined}
      style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
    >
      {subtitle ? <p className="af-in-otp__subtitle">{subtitle}</p> : null}
      <div
        className="af-in-otp__field"
        data-focus={focused || undefined}
        data-clearing={clearing || undefined}
        data-shake={shake || undefined}
        onPointerDown={onFieldPointerDown}
      >
        <div ref={boxesRef} className="af-in-otp__boxes" aria-hidden>
          {Array.from({ length }, (_, index) => {
            const staggerMs =
              pastedFrom !== null && index >= pastedFrom ? (index - pastedFrom) * 35 : 0;
            const revStaggerMs = (length - 1 - index) * 30;
            return (
              <Fragment key={index}>
                {index === sepAt ? <span className="af-in-otp__sep" /> : null}
                <span
                  className="af-in-otp__box"
                  data-filled={code[index] ? "" : undefined}
                  data-active={(focused && !busy && index === clampedCursor) || undefined}
                  style={
                    {
                      "--i": index,
                      "--n": length,
                      "--stagger": `${staggerMs}ms`,
                      "--rev-stagger": `${revStaggerMs}ms`,
                    } as CSSProperties
                  }
                >
                  <span key={code[index] ? `${index}-${code[index]}` : `blank-${index}`} className="af-in-otp__char">
                    {code[index] ?? ""}
                  </span>
                </span>
              </Fragment>
            );
          })}
          <span
            className="af-in-otp__ring"
            data-show={(focused && !busy) || undefined}
            style={{ transform: `translateX(${ringOffset(clampedCursor)}px)` }}
          >
            <span
              className="af-in-otp__caret"
              data-show={(focused && !busy && !code[clampedCursor]) || undefined}
            />
          </span>
          {status === "success" ? (
            <span className="af-in-otp__pill">
              <svg
                className="af-in-otp__check-svg"
                viewBox="0 0 14 14"
                width={14}
                height={14}
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 7.4L5.7 10.6L11.5 3.8"
                  pathLength={1}
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {successLabel}
            </span>
          ) : null}
        </div>
        <input
          ref={composeRefs(inputRef, forwardedRef)}
          id={resolvedId}
          name={name}
          className="af-in-otp__input"
          value={code}
          inputMode={numeric ? "numeric" : "text"}
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          required={fieldCtx?.required || undefined}
          aria-label={
            isZh
              ? `${label}，${length} 位${numeric ? "数字" : "字符"}`
              : `${label}, ${length} ${numeric ? "digits" : "characters"}`
          }
          aria-invalid={showErrorMsg || undefined}
          aria-describedby={
            [fieldCtx?.describedBy, showErrorMsg ? messageId : null].filter(Boolean).join(" ") || undefined
          }
          readOnly={busy}
          onKeyDown={onInputKeyDown}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            const cleaned = (numeric ? raw.replace(/\D/g, "") : raw.replace(/\s/g, "").toUpperCase()).slice(0, length);
            if (persistError) setPersistError(false);
            if (innerStatus === "error") setInnerStatus("idle");
            setCode(cleaned);
          }}
          onFocus={() => {
            setFocused(true);
            setCursor(Math.min(code.length, Math.max(0, length - 1)));
          }}
          onBlur={() => setFocused(false)}
        />
      </div>

      <div className="af-in-otp__msg" data-show={showErrorMsg || undefined} role="alert">
        <div className="af-in-otp__msg-inner">
          <p id={messageId}>
            <AfIcon name="alert" size={14} />
            <span>{resolvedErrorMessage}</span>
          </p>
        </div>
      </div>
      {status === "verifying" ? (
        <p className="af-in-otp__status">{isZh ? "正在核验…" : "Verifying…"}</p>
      ) : null}

      {showResend ? (
        <div className="af-in-otp__foot">
          <span className="af-in-otp__wait-label">
            {isZh ? "未收到验证码？" : "Didn't get a code?"}
          </span>
          {left > 0 ? (
            <span className="af-in-otp__wait">
              {isZh ? (
                <>
                  <span className="af-in-otp__time">
                    {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                  </span>{" "}
                  后可重发
                </>
              ) : (
                <>
                  Resend in{" "}
                  <span className="af-in-otp__time">
                    {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                  </span>
                </>
              )}
            </span>
          ) : (
            <button
              type="button"
              className="af-in-otp__link"
              onClick={() => {
                setLeft(resendIn);
                setTriesLeft(maxTries);
                setPersistError(false);
                if (isDemoMode && innerStatus === "success") {
                  setInnerStatus("idle");
                  setCode("");
                  setCursor(0);
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }
                onResend?.();
              }}
            >
              {isZh ? "重新发送验证码" : "Resend code"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
});
