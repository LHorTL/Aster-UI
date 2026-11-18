import {
  forwardRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";

export type AfKbdSize = "sm" | "md";
export type AfKbdPlatform = "mac" | "other";

export type AfKbdProps = Omit<ComponentPropsWithoutRef<"kbd">, "children"> & {
  /** 直接传入文本或元素（如 `<AfKbd>Esc</AfKbd>`）。 */
  children?: ReactNode;
  /** 键名序列：支持 `"mod+k"` 字符串或 `["mod", "K"]` 数组，自动按平台渲染并生成完整无障碍读音。 */
  keys?: string | readonly string[];
  /** 尺寸：`"sm"`（18px 行内提示）或 `"md"`（20px 快捷键表，默认 `"md"`）。 */
  size?: AfKbdSize;
  /** 显式指定目标平台（默认客户端自动检测 Apple / 非 Apple 平台，SSR 安全降级）。 */
  platform?: AfKbdPlatform;
};

type KeyDescriptor = {
  mac: string;
  other: string;
  macSpoken: string;
  otherSpoken: string;
  symbol?: boolean;
};

const KEY_DICTIONARY: Record<string, KeyDescriptor> = {
  mod: { mac: "⌘", other: "Ctrl", macSpoken: "Command", otherSpoken: "Control", symbol: true },
  cmd: { mac: "⌘", other: "Cmd", macSpoken: "Command", otherSpoken: "Command", symbol: true },
  command: { mac: "⌘", other: "Cmd", macSpoken: "Command", otherSpoken: "Command", symbol: true },
  ctrl: { mac: "⌃", other: "Ctrl", macSpoken: "Control", otherSpoken: "Control", symbol: true },
  control: { mac: "⌃", other: "Ctrl", macSpoken: "Control", otherSpoken: "Control", symbol: true },
  shift: { mac: "⇧", other: "Shift", macSpoken: "Shift", otherSpoken: "Shift", symbol: true },
  alt: { mac: "⌥", other: "Alt", macSpoken: "Option", otherSpoken: "Alt", symbol: true },
  opt: { mac: "⌥", other: "Alt", macSpoken: "Option", otherSpoken: "Alt", symbol: true },
  option: { mac: "⌥", other: "Alt", macSpoken: "Option", otherSpoken: "Alt", symbol: true },
  enter: { mac: "↵", other: "Enter", macSpoken: "Enter", otherSpoken: "Enter", symbol: true },
  return: { mac: "↵", other: "Enter", macSpoken: "Return", otherSpoken: "Enter", symbol: true },
  esc: { mac: "Esc", other: "Esc", macSpoken: "Escape", otherSpoken: "Escape" },
  escape: { mac: "Esc", other: "Esc", macSpoken: "Escape", otherSpoken: "Escape" },
  tab: { mac: "⇥", other: "Tab", macSpoken: "Tab", otherSpoken: "Tab", symbol: true },
  space: { mac: "Space", other: "Space", macSpoken: "Space", otherSpoken: "Space" },
  backspace: { mac: "⌫", other: "⌫", macSpoken: "Delete", otherSpoken: "Backspace", symbol: true },
  delete: { mac: "⌦", other: "Del", macSpoken: "Forward Delete", otherSpoken: "Delete", symbol: true },
  up: { mac: "↑", other: "↑", macSpoken: "Up arrow", otherSpoken: "Up arrow", symbol: true },
  arrowup: { mac: "↑", other: "↑", macSpoken: "Up arrow", otherSpoken: "Up arrow", symbol: true },
  down: { mac: "↓", other: "↓", macSpoken: "Down arrow", otherSpoken: "Down arrow", symbol: true },
  arrowdown: { mac: "↓", other: "↓", macSpoken: "Down arrow", otherSpoken: "Down arrow", symbol: true },
  left: { mac: "←", other: "←", macSpoken: "Left arrow", otherSpoken: "Left arrow", symbol: true },
  arrowleft: { mac: "←", other: "←", macSpoken: "Left arrow", otherSpoken: "Left arrow", symbol: true },
  right: { mac: "→", other: "→", macSpoken: "Right arrow", otherSpoken: "Right arrow", symbol: true },
  arrowright: { mac: "→", other: "→", macSpoken: "Right arrow", otherSpoken: "Right arrow", symbol: true },
  "/": { mac: "/", other: "/", macSpoken: "Slash", otherSpoken: "Slash" },
  "?": { mac: "?", other: "?", macSpoken: "Question mark", otherSpoken: "Question mark" },
  ".": { mac: ".", other: ".", macSpoken: "Period", otherSpoken: "Period" },
  ",": { mac: ",", other: ",", macSpoken: "Comma", otherSpoken: "Comma" },
  "[": { mac: "[", other: "[", macSpoken: "Left bracket", otherSpoken: "Left bracket" },
  "]": { mac: "]", other: "]", macSpoken: "Right bracket", otherSpoken: "Right bracket" },
  "`": { mac: "`", other: "`", macSpoken: "Backtick", otherSpoken: "Backtick" },
};

const GLYPH_TO_SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌃": "Control",
  "⇧": "Shift",
  "⌥": "Option",
  "↵": "Enter",
  "⇥": "Tab",
  "⌫": "Backspace",
  "⌦": "Delete",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
};

function subscribeNoop() {
  return () => {};
}

function getClientPlatform(): AfKbdPlatform {
  if (typeof navigator === "undefined") return "mac";
  const plat =
    (navigator as { userAgentData?: { platform?: string }; platform?: string }).userAgentData?.platform ??
    navigator.platform ??
    "";
  return /mac|iphone|ipad|ipod/i.test(plat) ? "mac" : "other";
}

function getServerPlatform(): AfKbdPlatform {
  return "mac";
}

function parseKeysInput(keys: string | readonly string[]): string[] {
  if (typeof keys !== "string") return Array.from(keys).filter(Boolean);
  const trimmed = keys.trim();
  if (!trimmed) return [];
  if (trimmed === "+") return ["+"];
  return trimmed
    .split(/\s*\+\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveToken(raw: string, apple: boolean): { display: string; spoken: string } {
  const lower = raw.toLowerCase();
  const entry = KEY_DICTIONARY[lower];
  if (entry) {
    return {
      display: apple ? entry.mac : entry.other,
      spoken: apple ? entry.macSpoken : entry.otherSpoken,
    };
  }
  if (raw in GLYPH_TO_SPOKEN) {
    return { display: raw, spoken: GLYPH_TO_SPOKEN[raw] };
  }
  const display = raw.length === 1 ? raw.toUpperCase() : raw;
  return { display, spoken: display };
}

/**
 * 键盘快捷键键帽（对齐 affectUI Kbd）：
 * - 单一紧凑键帽承载完整组合键（如 Mac 下 `⌘K`、Windows/Linux 下 `Ctrl K`，告别松散的 `+` 号噪音）；
 * - 采用基于 `currentColor` 的半透明混合表面与 0.5px 微斜角边缘，无论在亮底、暗底还是深色主按钮内部皆自适应和谐；
 * - 内置视觉隐藏 `.af-kbd__sr` 屏幕阅读器全称展开，避免把 `⌘` 误读为地标符号。
 */
export const AfKbd = forwardRef<HTMLElement, AfKbdProps>(function AfKbd(
  { keys, size = "md", platform: platformProp, className, children, "aria-label": ariaLabelProp, ...rest },
  ref,
) {
  const detectedPlatform = useSyncExternalStore(subscribeNoop, getClientPlatform, getServerPlatform);
  const activePlatform = platformProp ?? detectedPlatform;
  const apple = activePlatform === "mac";

  const parsedTokens = keys !== undefined ? parseKeysInput(keys) : [];
  const resolvedTokens = parsedTokens.map((token) => resolveToken(token, apple));
  const hasStructuredKeys = resolvedTokens.length > 0;
  const spokenText = hasStructuredKeys ? resolvedTokens.map((t) => t.spoken).join(" ") : undefined;

  return (
    <kbd
      ref={ref}
      className={cn("af-kbd", className)}
      data-size={size}
      data-platform={activePlatform}
      aria-label={ariaLabelProp}
      {...rest}
    >
      {hasStructuredKeys ? (
        <>
          <span className="af-kbd__keys" aria-hidden="true">
            {resolvedTokens.map((token, idx) => (
              <span key={`${token.display}-${idx}`} className="af-kbd__glyph">
                {token.display}
              </span>
            ))}
          </span>
          {ariaLabelProp === undefined && spokenText ? (
            <span className="af-kbd__sr">{spokenText}</span>
          ) : null}
        </>
      ) : (
        children
      )}
    </kbd>
  );
});
