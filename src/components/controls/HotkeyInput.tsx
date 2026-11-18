import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { AfKbd } from "../display/Kbd";

export type AfHotkeyInputProps = {
  /** 受控快捷键字符串（如 `"Ctrl+Shift+Space"`、`"Alt+S"`；空字符串代表未绑定）。 */
  value?: string;
  /** 非受控初始快捷键字符串。 */
  defaultValue?: string;
  /** 系统默认快捷键；传入且与当前值不同时展示「重置」动作。 */
  defaultShortcut?: string;
  /** `defaultShortcut` 的同义属性。 */
  resetValue?: string;
  /** 快捷键录制完成或清除时回调。 */
  onChange?: (shortcut: string) => void;
  /** 进入录制态回调。 */
  onRecordStart?: () => void;
  /** 结束录制态回调。 */
  onRecordEnd?: (shortcut: string) => void;
  /** 点击重置为系统默认快捷键回调。 */
  onReset?: (defaultShortcut: string) => void;
  /** 未绑定时的占位提示。 */
  placeholder?: string;
  /** 聚焦录制时的占位提示。 */
  recordingPlaceholder?: string;
  /** 快捷键冲突提示文案（柔和琥珀色告警态）。 */
  conflict?: ReactNode;
  /** 实时冲突检测钩子；返回非空文案时拦截录制并展示冲突告警。 */
  checkConflict?: (shortcut: string) => ReactNode | null | undefined;
  /** 校验错误提示文案（柔红错误态）。 */
  error?: ReactNode;
  /** 常驻辅助说明文案。 */
  hint?: ReactNode;
  /** 非功能键（`F1–F12` 以外）是否强制要求至少包含一个修饰键（`Ctrl`/`Alt`/`Shift`/`Meta`）。 */
  requireModifier?: boolean;
  /** 平台键名风格，默认 `"win"`（`Meta` 显示为 `Win`，`"mac"` 下显示为 `Cmd`）。 */
  platform?: "win" | "mac";
  /** 是否允许 `Backspace` / `Delete` 及清除按钮清空快捷键，默认 `true`。 */
  allowClear?: boolean;
  /** 是否捕获 `Tab` 作为快捷键组成部分（默认 `false`，保留无障碍焦点遍历）。 */
  captureTab?: boolean;
  /** 尺寸档位：sm 28 / md 32 / lg 36px。 */
  size?: "sm" | "md" | "lg";
  /** 禁用状态。 */
  disabled?: boolean;
  /** 只读状态。 */
  readOnly?: boolean;
  /** 控件 id。 */
  id?: string;
  /** 无障碍标签。 */
  "aria-label"?: string;
  /** 附加类名。 */
  className?: string;
  /** 附加内联样式。 */
  style?: CSSProperties;
};

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

const SPECIAL_KEY_MAP: Record<string, string> = {
  " ": "Space",
  Spacebar: "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Insert: "Ins",
  Return: "Enter",
  "`": "`",
  "-": "-",
  "=": "=",
  "[": "[",
  "]": "]",
  "\\": "\\",
  ";": ";",
  "'": "'",
  ",": ",",
  ".": ".",
  "/": "/",
};

function normalizeMainKey(event: ReactKeyboardEvent<HTMLElement>): string | null {
  const { key, code } = event;
  if (!key || key === "Unidentified" || key === "Dead" || key === "Process") return null;
  if (MODIFIER_KEYS.has(key)) return null;

  if (SPECIAL_KEY_MAP[key]) return SPECIAL_KEY_MAP[key]!;

  // 优先基于物理键码归一化字母与主键盘数字（避免 Shift+1 变成 "!"、Alt+字母在 macOS 下变成特殊符号）
  if (code && /^Key([A-Z])$/.test(code)) {
    return code.slice(3);
  }
  if (code && /^Digit([0-9])$/.test(code)) {
    return code.slice(5);
  }
  if (code && /^Numpad([0-9])$/.test(code)) {
    return `Num${code.slice(6)}`;
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(key)) {
    return key.toUpperCase();
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

function collectModifiers(
  event: Pick<ReactKeyboardEvent<HTMLElement>, "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
  platform: "win" | "mac",
): string[] {
  const mods: string[] = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.altKey) mods.push(platform === "mac" ? "Opt" : "Alt");
  if (event.shiftKey) mods.push("Shift");
  if (event.metaKey) mods.push(platform === "mac" ? "Cmd" : "Win");
  return mods;
}

/** 将快捷键字符串拆分为独立键帽数组（兼容 `"Ctrl+Shift+Space"` 与 `"+"` 主键）。 */
export function splitShortcutTokens(shortcut: string): string[] {
  const trimmed = shortcut.trim();
  if (!trimmed) return [];
  const raw = trimmed.split("+");
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i]!.trim();
    if (token) {
      out.push(token);
    } else if (i > 0 && raw[i + 1] === "") {
      out.push("+");
      i += 1;
    }
  }
  return out;
}

/**
 * 桌面级全局快捷键录制框（`AfHotkeyInput`）：
 * - 点击或键盘聚焦进入录制态，实时反馈按住的修饰键（`Ctrl` / `Alt` / `Shift` / `Win` / `Cmd`）与主键组合；
 * - 独立按键自动渲染为紧凑 `<AfKbd>` 键帽胶囊；
 * - 支持 `Backspace` / `Delete` 一键清空、`Escape` 取消录制、冲突告警（`conflict`）与恢复系统默认（`defaultShortcut`）。
 */
export function AfHotkeyInput({
  value: valueProp,
  defaultValue = "",
  defaultShortcut: defaultShortcutProp,
  resetValue,
  onChange,
  onRecordStart,
  onRecordEnd,
  onReset,
  placeholder = "点击录制快捷键",
  recordingPlaceholder = "请按下快捷键组合…",
  conflict,
  checkConflict,
  error,
  hint,
  requireModifier = false,
  platform = "win",
  allowClear = true,
  captureTab = false,
  size = "md",
  disabled = false,
  readOnly = false,
  id: idProp,
  "aria-label": ariaLabel,
  className,
  style,
}: AfHotkeyInputProps = {}) {
  const defaultShortcut = defaultShortcutProp ?? resetValue;
  const autoId = useId();
  const fieldId = idProp ?? autoId;
  const msgId = `${fieldId}-msg`;
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const [shortcut, setShortcut] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });

  const [recording, setRecording] = useState(false);
  const [liveMods, setLiveMods] = useState<string[]>([]);
  const [transientHint, setTransientHint] = useState<string | null>(null);
  const [detectedConflict, setDetectedConflict] = useState<ReactNode | null>(null);

  const canInteract = !disabled && !readOnly;
  const committedTokens = splitShortcutTokens(shortcut);
  const displayTokens = recording && liveMods.length > 0 ? liveMods : committedTokens;
  const showReset =
    canInteract &&
    defaultShortcut !== undefined &&
    shortcut !== defaultShortcut;
  const showClear = canInteract && allowClear && shortcut.length > 0;
  const activeConflict = conflict ?? detectedConflict;
  const statusMessage = error ?? activeConflict ?? transientHint ?? hint;
  const statusTone = error || transientHint ? "err" : activeConflict ? "warn" : undefined;

  const finishRecording = (nextValue: string, blurField = false) => {
    setLiveMods([]);
    setRecording(false);
    onRecordEnd?.(nextValue);
    if (blurField) {
      triggerRef.current?.blur();
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!canInteract) return;

    // 保留无障碍焦点遍历（除非显式开启 captureTab）
    if (event.key === "Tab" && !captureTab && !event.ctrlKey && !event.altKey && !event.metaKey) {
      setLiveMods([]);
      setRecording(false);
      return;
    }

    // 未进入录制态时按 Enter / Space 开启录制
    if (!recording && (event.key === "Enter" || event.key === " ") && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      setTransientHint(null);
      setDetectedConflict(null);
      setRecording(true);
      onRecordStart?.();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setTransientHint(null);
      setDetectedConflict(null);
      finishRecording(shortcut, true);
      return;
    }

    const mods = collectModifiers(event, platform);

    // 无修饰键按下 Backspace / Delete 时执行清空
    if (
      mods.length === 0 &&
      (event.key === "Backspace" || event.key === "Delete") &&
      allowClear
    ) {
      event.preventDefault();
      setTransientHint(null);
      setDetectedConflict(null);
      setShortcut("");
      finishRecording("");
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!recording) {
      setRecording(true);
      onRecordStart?.();
    }

    const mainKey = normalizeMainKey(event);
    if (!mainKey) {
      setLiveMods(mods);
      return;
    }

    const isFunctionKey = /^F([1-9]|1[0-9]|2[0-4])$/.test(mainKey);
    if (requireModifier && mods.length === 0 && !isFunctionKey) {
      setLiveMods([]);
      setTransientHint("请至少搭配 Ctrl / Alt / Shift 等修饰键");
      return;
    }

    setTransientHint(null);
    const nextShortcut = [...mods, mainKey].join("+");
    if (checkConflict) {
      const modNormalized = nextShortcut.replace(/^(Ctrl|Cmd|Win)(?=\+)/, "Mod");
      const conflictMsg =
        checkConflict(nextShortcut) ??
        (modNormalized !== nextShortcut ? checkConflict(modNormalized) : null);
      if (conflictMsg) {
        setDetectedConflict(conflictMsg);
        finishRecording(shortcut);
        return;
      }
    }
    setDetectedConflict(null);
    setShortcut(nextShortcut);
    finishRecording(nextShortcut);
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!canInteract || !recording) return;
    const mods = collectModifiers(event, platform);
    setLiveMods(mods);
  };

  return (
    <div
      className={cn("af-hotkey", className)}
      data-size={size}
      data-recording={recording ? "true" : undefined}
      data-status={statusTone}
      data-disabled={disabled ? "true" : undefined}
      style={style}
    >
      <div className="af-hotkey__row">
        <div
          ref={triggerRef}
          id={fieldId}
          role="textbox"
          aria-readonly={readOnly || undefined}
          aria-disabled={disabled || undefined}
          aria-invalid={Boolean(error || transientHint) || undefined}
          aria-describedby={statusMessage ? msgId : undefined}
          aria-label={ariaLabel ?? "快捷键录制输入框"}
          tabIndex={disabled ? -1 : 0}
          className="af-hotkey__field"
          onClick={() => {
            if (!canInteract) return;
            setTransientHint(null);
            if (!recording) {
              setRecording(true);
              onRecordStart?.();
            }
            triggerRef.current?.focus();
          }}
          onFocus={() => {
            if (!canInteract) return;
            if (!recording) {
              setRecording(true);
              onRecordStart?.();
            }
          }}
          onBlur={() => {
            if (recording || liveMods.length > 0) {
              finishRecording(shortcut);
            }
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        >
          <span className="af-hotkey__indicator" aria-hidden="true" />
          <div className="af-hotkey__tokens">
            {displayTokens.length > 0 ? (
              displayTokens.map((token, idx) => (
                <span key={`${token}-${idx}`} className="af-hotkey__token-wrap">
                  {idx > 0 ? <span className="af-hotkey__plus">+</span> : null}
                  <AfKbd className="af-hotkey__kbd">{token}</AfKbd>
                </span>
              ))
            ) : (
              <span className="af-hotkey__placeholder">
                {recording ? recordingPlaceholder : placeholder}
              </span>
            )}
            {recording && liveMods.length > 0 ? (
              <span className="af-hotkey__waiting">+ …</span>
            ) : null}
          </div>

          {showClear ? (
            <button
              type="button"
              className="af-hotkey__clear"
              aria-label="清空快捷键"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setTransientHint(null);
                setDetectedConflict(null);
                setShortcut("");
                finishRecording("");
              }}
            >
              <AfIcon name="x" size={12} />
            </button>
          ) : null}
        </div>

        {showReset && defaultShortcut !== undefined ? (
          <button
            type="button"
            className="af-hotkey__reset"
            aria-label={`恢复默认快捷键 ${defaultShortcut}`}
            onClick={() => {
              setTransientHint(null);
              setDetectedConflict(null);
              setShortcut(defaultShortcut);
              onReset?.(defaultShortcut);
            }}
          >
            <AfIcon name="refresh" size={12} />
            <span>默认</span>
          </button>
        ) : null}
      </div>

      {statusMessage ? (
        <div
          id={msgId}
          className="af-hotkey__msg"
          data-tone={statusTone}
          role={statusTone === "err" ? "alert" : "status"}
        >
          {statusTone ? (
            <AfIcon name={statusTone === "err" ? "alertCircle" : "alertTriangle"} size={12} />
          ) : null}
          <span>{statusMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

export { AfHotkeyInput as HotkeyInput };
