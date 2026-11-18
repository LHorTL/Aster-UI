import { forwardRef, useEffect, useId, useRef, useState, type ChangeEvent, type ComponentPropsWithoutRef, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, composeRefs, copyToClipboard, useControllableState, useFieldShake, useImeEnterGuard, useIsomorphicLayoutEffect } from "../../primitives";
import { AfExpand } from "../display/Expand";
import { useAfFormFieldControl } from "./FormField";

/** 代码高亮内置语言。 */
export type AfCodeLanguage =
  | "text"
  | "json"
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "html"
  | "xml"
  | "css"
  | "scss"
  | "python"
  | "sql"
  | "bash"
  | "yaml"
  | "markdown";

const AF_CODE_LABELS: Record<AfCodeLanguage, string> = {
  text: "TEXT",
  json: "JSON",
  javascript: "JS",
  typescript: "TS",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  xml: "XML",
  css: "CSS",
  scss: "SCSS",
  python: "PY",
  sql: "SQL",
  bash: "BASH",
  yaml: "YAML",
  markdown: "MD",
};

const AF_CODE_KEYWORDS: Record<string, Set<string>> = {
  javascript: new Set(
    "const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of delete void yield static get set super this".split(
      " ",
    ),
  ),
  typescript: new Set(
    "const let var function return if else for while do switch case break continue new class extends implements interface type enum import from export default async await try catch finally throw typeof instanceof in of delete void yield static get set super this public private protected readonly declare abstract as satisfies keyof infer namespace".split(
      " ",
    ),
  ),
  python: new Set(
    "def class return if elif else for while in not and or is import from as pass break continue try except finally raise with lambda yield async await global nonlocal del assert match case".split(
      " ",
    ),
  ),
  sql: new Set(
    "select from where and or not insert into values update set delete create table alter drop join left right inner outer on group by order having limit offset union as distinct null is like between exists case when then else end".split(
      " ",
    ),
  ),
  bash: new Set("if then else elif fi for while do done case esac function in export local readonly return echo cd pwd source alias".split(" ")),
  yaml: new Set("true false null yes no on off".split(" ")),
  css: new Set("important media import supports keyframes font-face root".split(" ")),
  scss: new Set("mixin include extend if else each for while function return use forward important".split(" ")),
};

const AF_CODE_LITERALS = new Set("true false null undefined NaN Infinity this".split(" "));

function escapeCodeText(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function codeToken(kind: string, text: string) {
  return `<span class="af-codearea__token af-codearea__token--${kind}">${escapeCodeText(text)}</span>`;
}

function highlightMarkup(code: string) {
  let html = "";
  let index = 0;
  while (index < code.length) {
    if (code.startsWith("<!--", index)) {
      const end = code.indexOf("-->", index + 4);
      const next = end < 0 ? code.length : end + 3;
      html += codeToken("comment", code.slice(index, next));
      index = next;
      continue;
    }
    if (code[index] === "<") {
      let end = index + 1;
      let quote: string | null = null;
      while (end < code.length) {
        const char = code[end];
        if (quote) {
          if (char === quote) quote = null;
        } else if (char === '"' || char === "'") {
          quote = char;
        } else if (char === ">") {
          end += 1;
          break;
        }
        end += 1;
      }
      html += codeToken("tag", code.slice(index, end));
      index = end;
      continue;
    }
    html += escapeCodeText(code[index]);
    index += 1;
  }
  return html;
}

function highlightMarkdown(code: string) {
  return code
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) return codeToken("comment", line);
      if (/^#{1,6}\s/.test(line)) return codeToken("heading", line);
      let html = escapeCodeText(line);
      html = html.replace(/`([^`]+)`/g, (_match, inner: string) => `<span class="af-codearea__token af-codearea__token--string">${inner}</span>`);
      html = html.replace(/\*\*([^*]+)\*\*/g, '<span class="af-codearea__token af-codearea__token--strong">$1</span>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="af-codearea__token af-codearea__token--link">$1</span>');
      return html;
    })
    .join("\n");
}

function highlightCode(code: string, language: AfCodeLanguage) {
  if (language === "text") return escapeCodeText(code);
  if (language === "html" || language === "xml") return highlightMarkup(code);
  if (language === "markdown") return highlightMarkdown(code);
  const keyword = language === "jsx" || language === "tsx" ? AF_CODE_KEYWORDS.javascript : AF_CODE_KEYWORDS[language];
  const literals = language === "python" ? new Set([...AF_CODE_LITERALS, "True", "False", "None"]) : AF_CODE_LITERALS;
  const lineComment =
    language === "python" || language === "bash" || language === "yaml"
      ? "#"
      : language === "sql"
        ? "--"
        : language === "css" || language === "scss" || language === "json"
          ? null
          : "//";
  let html = "";
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (char === "/" && code[index + 1] === "*" && lineComment !== null) {
      const end = code.indexOf("*/", index + 2);
      const next = end < 0 ? code.length : end + 2;
      html += codeToken("comment", code.slice(index, next));
      index = next;
      continue;
    }
    if (lineComment && code.startsWith(lineComment, index)) {
      const end = code.indexOf("\n", index);
      const next = end < 0 ? code.length : end;
      html += codeToken("comment", code.slice(index, next));
      index = next;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const triple = code.startsWith(char.repeat(3), index);
      const quote = triple ? char.repeat(3) : char;
      let end = index + quote.length;
      while (end < code.length) {
        if (code.startsWith(quote, end) && code[end - 1] !== "\\") {
          end += quote.length;
          break;
        }
        end += 1;
      }
      const raw = code.slice(index, end);
      const next = code.slice(end).trimStart()[0];
      const kind = language === "json" && next === ":" ? "property" : "string";
      html += codeToken(kind, raw);
      index = end;
      continue;
    }
    if (/[0-9]/.test(char) || (char === "-" && /[0-9]/.test(code[index + 1] ?? ""))) {
      const match = code.slice(index).match(/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if (match) {
        html += codeToken("number", match[0]);
        index += match[0].length;
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      const match = code.slice(index).match(/^[A-Za-z_$][\w$]*/);
      if (match) {
        const word = match[0];
        const lower = word.toLowerCase();
        const after = code.slice(index + word.length).match(/^\s*(.)/)?.[1];
        const kind =
          keyword?.has(word) || keyword?.has(lower)
            ? "keyword"
            : literals.has(word) || literals.has(lower)
              ? "literal"
              : (language === "css" || language === "scss") && after === ":"
                ? "property"
                : after === "("
                  ? "function"
                  : null;
        html += kind ? codeToken(kind, word) : escapeCodeText(word);
        index += word.length;
        continue;
      }
    }
    html += escapeCodeText(char);
    index += 1;
  }
  return html;
}

/** Textarea 可拉伸方向：vertical / bottom 只拉下边，horizontal / right 只拉右边，both 拉右下角。 */
export type AfTextareaResize = "none" | "vertical" | "bottom" | "horizontal" | "right" | "both";

/** Textarea 拉伸触点：corner 显示自定义右下角图标；edge 不显示图标，直接拖动边缘；none 关闭拉伸。 */
export type AfTextareaResizeHandle = "corner" | "edge" | "none";

/** 自适应内容高度配置。 */
export type AfTextareaAutoSize =
  | boolean
  | {
      /** 最小行数，默认 2。 */
      minRows?: number;
      /** 最大行数；超出后在内部滚动。 */
      maxRows?: number;
    };

/** 多行输入属性。 */
export type AfTextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  /** 外观变体：outline（默认发丝描边）/ filled（轻灰填充）/ borderless（无边框行内嵌入）。 */
  variant?: "outline" | "filled" | "borderless";
  /** 内部 `<textarea>` 元素附加类名。 */
  inputClassName?: string;
  /** 顶部可见字段标题。 */
  label?: ReactNode;
  /** 可选标记（配合 `label` 显示 `"可选"` 或自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 底部辅助说明文案。 */
  hint?: ReactNode;
  /** 校验失败。 */
  invalid?: boolean;
  /** 校验说明；传入后在下方展开红字，并在出现瞬间左右抖动一次。 */
  error?: ReactNode;
  /** 值非空时在右上角显示清除按钮。 */
  allowClear?: boolean;
  /** `allowClear` 的同义属性（affectUI API 兼容）。 */
  clearable?: boolean;
  /** 显示字数统计。 */
  showCount?: boolean;
  /** `showCount` 的同义属性（affectUI API 兼容）。 */
  counter?: boolean;
  /** 随输入内容自动调整高度（现代浏览器优先使用 `field-sizing: content`，其余引擎自动回退到 scrollHeight 测量）。 */
  autoSize?: AfTextareaAutoSize;
  /** 自适应最小行数快捷属性（等价于 `autoSize={{ minRows }}`）。 */
  minRows?: number;
  /** 自适应最大行数快捷属性（等价于 `autoSize={{ maxRows }}`）。 */
  maxRows?: number;
  /** 值变化便捷回调。 */
  onValueChange?: (value: string, event?: ChangeEvent<HTMLTextAreaElement>) => void;
  /** 点击清除按钮后的回调。 */
  onClear?: () => void;
  /** 内置代码高亮语言；传入后切换为代码编辑器形态。 */
  language?: AfCodeLanguage;
  /** 自定义语言标签；不传时使用内置标签。 */
  languageLabel?: string;
  /** 代码模式显示行号，默认 true。 */
  showLineNumbers?: boolean;
  /** 代码模式显示复制按钮，默认 true。 */
  copyable?: boolean;
  /** 代码模式是否软换行，默认 false。 */
  softWrap?: boolean;
  /** 可拉伸方向，默认 vertical。 */
  resize?: AfTextareaResize;
  /** 拉伸触点，默认 corner。 */
  resizeHandle?: AfTextareaResizeHandle;
  /** 拉伸后的最小高度。 */
  resizeMinHeight?: number;
  /** 拉伸后的最小宽度。 */
  resizeMinWidth?: number;
  /** 是否在右上角显示快捷展开/收起高度按钮（26×26px）。 */
  expandable?: boolean;
  /** 受控展开状态。 */
  expanded?: boolean;
  /** 非受控初始展开状态。 */
  defaultExpanded?: boolean;
  /** 展开后的目标最小行数，默认 12 行。 */
  expandedRows?: number;
  /** 展开/收起切换回调。 */
  onExpandedChange?: (expanded: boolean) => void;
  /** `Cmd/Ctrl + Enter` 快捷键提交回调。 */
  onSubmitShortcut?: (value: string) => void;
};

/**
 * 多行输入与安静代码块输入：外层发丝环承载焦点与错误态，内部 textarea 零边框；
 * 设置 language 后切换为 affectUI 安静沉降表面的语法高亮编辑器（带 Tab 缩进与复制反馈）。
 */
export const AfTextarea = forwardRef<HTMLTextAreaElement, AfTextareaProps>(function AfTextarea(
  {
    variant = "outline",
    inputClassName,
    label,
    optional,
    hint,
    invalid,
    error,
    className,
    disabled: disabledProp,
    style,
    allowClear,
    clearable,
    showCount,
    counter,
    autoSize,
    minRows,
    maxRows,
    onValueChange,
    onClear,
    language,
    languageLabel,
    showLineNumbers = true,
    copyable = true,
    softWrap,
    resize: resizeProp,
    resizeHandle = "corner",
    resizeMinHeight,
    resizeMinWidth = 160,
    expandable = false,
    expanded: expandedProp,
    defaultExpanded = false,
    expandedRows = 12,
    onExpandedChange,
    onSubmitShortcut,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    maxLength,
    rows,
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
  const autoAreaId = `${inlineErrorId}-area`;
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
  const [expanded, setExpanded] = useControllableState<boolean>({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLLabelElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    axis: "vertical" | "horizontal" | "both";
    x: number;
    y: number;
    width: number;
    height: number;
    pointerId: number;
  } | null>(null);

  const [manualSize, setManualSize] = useState<{ width?: number; height?: number }>({});
  const [autoCodeHeight, setAutoCodeHeight] = useState<number>();
  const [resizing, setResizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const isCode = Boolean(language);
  const resolvedAutoSize: AfTextareaAutoSize | undefined =
    autoSize !== undefined
      ? autoSize
      : minRows !== undefined || maxRows !== undefined
        ? { minRows, maxRows }
        : undefined;
  const autoSizeEnabled = Boolean(resolvedAutoSize) && !isCode;
  const minAutoRows =
    typeof resolvedAutoSize === "object" ? Math.max(1, resolvedAutoSize.minRows ?? minRows ?? 3) : Math.max(1, minRows ?? 3);
  const resolvedMaxRows = typeof resolvedAutoSize === "object" ? (resolvedAutoSize.maxRows ?? maxRows) : maxRows;
  const maxAutoRows = resolvedMaxRows ? Math.max(minAutoRows, resolvedMaxRows) : undefined;
  const resize: AfTextareaResize = resizeProp ?? (autoSizeEnabled ? "none" : "vertical");
  const resizeAxis: "vertical" | "horizontal" | "both" =
    resize === "horizontal" || resize === "right" ? "horizontal" : resize === "both" ? "both" : "vertical";
  const resizable = resize !== "none" && resizeHandle !== "none" && !disabled;
  const minHeight = resizeMinHeight ?? (isCode ? 160 : autoSizeEnabled ? minAutoRows * 20 + 16 : 88);

  const resolvedId = idProp ?? fieldCtx?.controlId ?? (label !== undefined ? autoAreaId : undefined);
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

  useIsomorphicLayoutEffect(() => {
    if (!isCode || manualSize.height) return;
    const area = areaRef.current;
    if (!area) return;
    setAutoCodeHeight(area.offsetHeight);
  }, [isCode, rows, softWrap, manualSize.height]);

  useIsomorphicLayoutEffect(() => {
    if (!autoSizeEnabled || manualSize.height) return;
    if (typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content")) {
      return;
    }
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    const effectiveMinRows = expanded ? Math.max(minAutoRows, expandedRows) : minAutoRows;
    const minPx = effectiveMinRows * 20;
    const maxPx = maxAutoRows && !expanded ? maxAutoRows * 20 : Number.POSITIVE_INFINITY;
    const measured = Math.min(Math.max(area.scrollHeight, minPx), maxPx);
    area.style.height = `${measured}px`;
  }, [autoSizeEnabled, currentValue, minAutoRows, maxAutoRows, expanded, expandedRows, manualSize.height]);

  const clear = () => {
    if (!controlled) setInnerValue("");
    const area = areaRef.current;
    if (area) {
      const fake = { target: { value: "" }, currentTarget: area } as unknown as ChangeEvent<HTMLTextAreaElement>;
      onChange?.(fake);
    }
    onValueChange?.("", undefined);
    onClear?.();
    areaRef.current?.focus();
  };

  const syncCodeScroll = () => {
    const area = areaRef.current;
    if (!area) return;
    if (preRef.current) {
      preRef.current.scrollTop = area.scrollTop;
      preRef.current.scrollLeft = area.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.style.transform = `translateY(${-area.scrollTop}px)`;
    }
  };

  const copyCode = async () => {
    const ok = await copyToClipboard(currentValue);
    if (!ok) return;
    setCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 1400);
  };

  const emitCodeValue = (next: string, selectionStart: number, selectionEnd: number) => {
    const area = areaRef.current;
    if (!controlled) setInnerValue(next);
    const fake = { target: { value: next }, currentTarget: area } as unknown as ChangeEvent<HTMLTextAreaElement>;
    onChange?.(fake);
    onValueChange?.(next, undefined);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      area.setSelectionRange(selectionStart, selectionEnd);
      syncCodeScroll();
    });
  };

  const onCodeKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !ime.shouldBlockEnter(event)) {
      onSubmitShortcut?.(currentValue);
      return;
    }
    if (event.defaultPrevented || ime.shouldBlockEnter(event)) return;
    const area = areaRef.current;
    if (!area) return;
    if (event.key === "Tab") {
      event.preventDefault();
      const start = area.selectionStart;
      const end = area.selectionEnd;
      if (event.shiftKey) {
        const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
        const indent = currentValue.slice(lineStart, start).match(/^[ \t]{1,2}/)?.[0].length ?? 0;
        if (!indent) return;
        emitCodeValue(currentValue.slice(0, start - indent) + currentValue.slice(start), start - indent, end - indent);
      } else {
        emitCodeValue(currentValue.slice(0, start) + "  " + currentValue.slice(end), start + 2, start + 2);
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
      const linePrefix = currentValue.slice(lineStart, start);
      const indent = linePrefix.match(/^[ \t]*/)?.[0] ?? "";
      const extra = /[{[(:]$/.test(linePrefix) ? "  " : "";
      const insert = `\n${indent}${extra}`;
      emitCodeValue(currentValue.slice(0, start) + insert + currentValue.slice(end), start + insert.length, start + insert.length);
    }
  };

  const startResize = (axis: "vertical" | "horizontal" | "both", event: ReactPointerEvent<HTMLElement>) => {
    if (!resizable) return;
    event.preventDefault();
    event.stopPropagation();
    const area = areaRef.current;
    const root = isCode ? codeRef.current : fieldRef.current;
    const rect = area?.getBoundingClientRect();
    resizeRef.current = {
      axis,
      x: event.clientX,
      y: event.clientY,
      width: manualSize.width ?? root?.getBoundingClientRect().width ?? resizeMinWidth,
      height: manualSize.height ?? rect?.height ?? minHeight,
      pointerId: event.pointerId,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 忽略无指针捕获的合成事件
    }
    setResizing(true);
  };

  const moveResize = (event: ReactPointerEvent<HTMLElement>) => {
    const start = resizeRef.current;
    if (!start || event.pointerId !== start.pointerId) return;
    const next = { ...manualSize };
    if (start.axis !== "horizontal") next.height = Math.max(minHeight, start.height + event.clientY - start.y);
    if (start.axis !== "vertical") next.width = Math.max(resizeMinWidth, start.width + event.clientX - start.x);
    setManualSize(next);
  };

  const endResize = (event: ReactPointerEvent<HTMLElement>) => {
    if (!resizeRef.current) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 忽略
    }
    resizeRef.current = null;
    setResizing(false);
  };

  const resizer = resizable ? (
    <span
      className="af-textarea-resize"
      data-axis={resizeAxis}
      data-handle={resizeHandle}
      data-resizing={resizing || undefined}
      aria-hidden="true"
    >
      {resizeAxis !== "horizontal" ? (
        <span
          className="af-textarea-resize__edge"
          data-edge="bottom"
          onPointerDown={(event) => startResize("vertical", event)}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ) : null}
      {resizeAxis !== "vertical" ? (
        <span
          className="af-textarea-resize__edge"
          data-edge="right"
          onPointerDown={(event) => startResize("horizontal", event)}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ) : null}
      {resizeHandle === "corner" ? (
        <span
          className="af-textarea-resize__handle"
          onPointerDown={(event) => startResize(resizeAxis, event)}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M5.75 11.25 11.25 5.75M8.5 11.25 11.25 8.5" />
          </svg>
        </span>
      ) : null}
    </span>
  ) : null;

  const expandedMinPx = Math.max(minAutoRows, expandedRows) * 20;
  const areaSizeStyle: CSSProperties = {
    ...(autoSizeEnabled && !manualSize.height
      ? ({
          "--af-area-min": `${(expanded ? Math.max(minAutoRows, expandedRows) : minAutoRows) * 20}px`,
          "--af-area-max": maxAutoRows && !expanded ? `${maxAutoRows * 20}px` : "none",
        } as CSSProperties)
      : null),
    ...(expanded && !manualSize.height ? { minHeight: expandedMinPx } : null),
    ...(manualSize.height ? { height: manualSize.height, minHeight: manualSize.height } : null),
    ...(manualSize.width ? { width: manualSize.width, minWidth: manualSize.width } : null),
  };

  const commonTextareaProps = {
    ref: composeRefs(areaRef, forwardedRef),
    id: resolvedId,
    className: cn("af-textarea", inputClassName),
    "aria-invalid": (bad ? true : "false") as true | "false",
    "aria-describedby": resolvedDescribedBy,
    "aria-keyshortcuts": onSubmitShortcut ? "Meta+Enter Control+Enter" : undefined,
    required: resolvedRequired || undefined,
    disabled,
    value: currentValue,
    maxLength,
    onCompositionStart: (event: React.CompositionEvent<HTMLTextAreaElement>) => {
      ime.onCompositionStart(event);
      onCompositionStart?.(event);
    },
    onCompositionEnd: (event: React.CompositionEvent<HTMLTextAreaElement>) => {
      ime.onCompositionEnd(event);
      onCompositionEnd?.(event);
    },
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (!controlled) setInnerValue(event.target.value);
      onChange?.(event);
      onValueChange?.(event.target.value, event);
    },
    ...rest,
  };

  const lineCount = currentValue.split("\n").length;
  const rootStyle: CSSProperties = {
    ...(!hasWrapper ? style : undefined),
    ...(manualSize.width ? { width: manualSize.width, maxWidth: "100%" } : null),
  };

  const field = isCode ? (
    <div
      ref={codeRef}
      className={cn("af-field af-codearea", !hasWrapper && className)}
      style={rootStyle}
      data-invalid={bad || undefined}
      data-shake={shake || undefined}
      data-disabled={disabled || undefined}
      data-language={language}
      data-soft-wrap={softWrap || undefined}
      data-resize={resizable ? resizeAxis : undefined}
      data-resizing={resizing || undefined}
    >
      <div className="af-codearea__head">
        <span className="af-codearea__lang">{languageLabel ?? AF_CODE_LABELS[language as AfCodeLanguage] ?? "TEXT"}</span>
        <span className="af-codearea__meta">
          {lineCount} lines · {currentValue.length} chars
        </span>
        <span className="af-codearea__actions">
          {copyable ? (
            <button
              type="button"
              className="af-codearea__action"
              onClick={() => void copyCode()}
              aria-label={copied ? "Copied" : "Copy code"}
            >
              <AfIcon name={copied ? "check" : "copy"} size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
          {canClear && currentValue.length > 0 && !disabled ? (
            <button type="button" className="af-codearea__action" onClick={clear} aria-label="Clear code">
              <AfIcon name="x" size={11} />
              Clear
            </button>
          ) : null}
        </span>
      </div>
      <div
        className="af-codearea__body"
        style={{ height: manualSize.height ?? autoCodeHeight, flex: "none", minHeight: 0, overflow: "hidden" }}
      >
        {showLineNumbers ? (
          <div
            className="af-codearea__gutter"
            aria-hidden="true"
            onWheel={(event) => {
              const area = areaRef.current;
              if (!area) return;
              area.scrollTop += event.deltaY;
              syncCodeScroll();
            }}
          >
            <div ref={gutterRef} className="af-codearea__gutter-inner">
              {Array.from({ length: lineCount }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="af-codearea__canvas" style={manualSize.height ? { minHeight: manualSize.height } : undefined}>
          <pre ref={preRef} className="af-codearea__highlight" aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: highlightCode(currentValue, language as AfCodeLanguage) }} />
          </pre>
          <textarea
            {...commonTextareaProps}
            className={cn("af-textarea af-codearea__input", inputClassName)}
            rows={rows ?? 8}
            wrap={softWrap ? "soft" : "off"}
            spellCheck={false}
            style={areaSizeStyle}
            onScroll={syncCodeScroll}
            onKeyDown={onCodeKeyDown}
          />
        </div>
      </div>
      {resizer}
    </div>
  ) : (
    <label
      ref={fieldRef}
      className={cn("af-field af-field--area", !hasWrapper && className)}
      style={rootStyle}
      data-variant={variant !== "outline" ? variant : undefined}
      data-invalid={bad || undefined}
      data-shake={shake || undefined}
      data-disabled={disabled || undefined}
      data-autosize={(autoSizeEnabled && !manualSize.height) || undefined}
      data-expandable={expandable || undefined}
      data-expanded={expanded || undefined}
      data-clear={(canClear && currentValue.length > 0 && !disabled) || undefined}
      data-resize={resizable ? resizeAxis : undefined}
      data-resizing={resizing || undefined}
    >
      <textarea
        {...commonTextareaProps}
        data-autosize={(autoSizeEnabled && !manualSize.height) || undefined}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !ime.shouldBlockEnter(event)) {
            onSubmitShortcut?.(currentValue);
          }
        }}
        rows={autoSizeEnabled && rows === undefined ? (expanded ? Math.max(minAutoRows, expandedRows) : minAutoRows) : rows}
        style={areaSizeStyle}
      />
      {expandable && !disabled ? (
        <button
          type="button"
          className="af-field--area__expand"
          aria-label={expanded ? "Collapse textarea" : "Expand textarea"}
          aria-expanded={expanded}
          aria-pressed={expanded}
          data-expanded={expanded || undefined}
          title={expanded ? "Collapse" : "Expand"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7.5 1.75V4.5H10.25M10.25 1.75 7.5 4.5M4.5 10.25V7.5H1.75M1.75 10.25 4.5 7.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7.5 1.75H10.25V4.5M10.25 1.75 6.9 5.1M4.5 10.25H1.75V7.5M1.75 10.25 5.1 6.9" />
            </svg>
          )}
        </button>
      ) : null}
      {canClear && currentValue.length > 0 && !disabled ? (
        <button
          type="button"
          className="af-field__clear af-field__clear--area"
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
      {resizer}
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
      {hasInlineHint && !hasInlineError && !(hasCounter && !isCode) ? (
        <span id={inlineHintId} className="af-field-wrap__hint">
          {hint}
        </span>
      ) : null}
      {hasCounter && !isCode && !hasInlineError ? (
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
      {hasCounter && !isCode && hasInlineError ? (
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

export type AfTextAreaProps = AfTextareaProps;
export const AfTextArea = AfTextarea;
