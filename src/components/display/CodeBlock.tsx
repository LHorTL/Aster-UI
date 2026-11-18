import { useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { copyToClipboard } from "../../primitives";

export type AfCodeBlockLanguage =
  | "ts"
  | "tsx"
  | "typescript"
  | "js"
  | "jsx"
  | "javascript"
  | "json"
  | "bash"
  | "sh"
  | "shell"
  | "zsh"
  | "python"
  | "py"
  | "css"
  | "plain"
  | (string & {});

export interface AfCodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "onCopy"> {
  /** 代码文本（自动剥离末尾多余单个换行符）。 */
  code: string;
  /** 语法语言标识（未传 filename 时在顶栏左侧展示人类可读语言名，如 TypeScript / Bash）。 */
  language?: AfCodeBlockLanguage;
  /** 顶栏左侧文件名或路径（如 agents/reviewer.ts）。 */
  filename?: string;
  /** 是否显示等宽粘性行号列（默认：超过 1 行时自动开启，单行或短命令可传 false 关闭）。 */
  showLineNumbers?: boolean;
  /** 需要重点高亮的行号集合（1-based，整行柔和底色 + 左侧 2px 强调竖条贯穿行号槽）。 */
  highlightLines?: number[];
  /** 是否启用软换行（wrap 与 wordWrap 互为别名）。 */
  wrap?: boolean;
  wordWrap?: boolean;
  /** 代码区最大高度（超出后支持纵横滚动并自动授予 tabIndex=0 以支持键盘滚动）。 */
  maxHeight?: number | string;
  /** 是否显示右上角复制按钮（默认 true，保持永不 disabled）。 */
  copyable?: boolean;
  /** 顶栏右侧附加操作插槽。 */
  actions?: ReactNode;
  /** 复制成功回调。 */
  onCopy?: (code: string) => void;
}

type TokenKind = "plain" | "kw" | "str" | "num" | "com" | "fn" | "key" | "var";

interface CodeToken {
  kind: TokenKind;
  text: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  js: "JavaScript",
  jsx: "JSX",
  javascript: "JavaScript",
  json: "JSON",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  py: "Python",
  python: "Python",
  css: "CSS",
  plain: "Text",
};

function formatLanguageName(lang?: string): string {
  if (!lang) return "";
  const norm = lang.trim().toLowerCase();
  return LANGUAGE_LABELS[norm] ?? lang;
}

const JS_TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^\\`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(import|export|from|const|let|var|function|return|async|await|if|else|for|while|switch|case|break|new|class|interface|type|extends|implements|true|false|null|undefined|try|catch|throw|typeof|in|of|as|satisfies)\b|\b(\d+(?:_\d+)*(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\s*\()/g;

const PY_TOKEN_RE =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[A-Za-z_]\w*)|\b(def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|True|False|None|async|await|with|try|except|raise|yield|lambda|pass)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\s*\()/g;

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

const BASH_TOKEN_RE =
  /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\$[A-Za-z_]\w*|\$\{[^}]+\})|((?:^|\s)--?[A-Za-z0-9][\w-]*)|\b(npm|npx|pnpm|yarn|bun|node|git|curl|cd|export|echo|docker|python|pip|aster)\b/gm;

function tokenizeLine(line: string, lang?: string): CodeToken[] {
  const norm = (lang ?? "ts").toLowerCase();
  if (norm === "plain" || norm === "text" || !line) {
    return [{ kind: "plain", text: line }];
  }

  const out: CodeToken[] = [];
  let cursor = 0;
  const pushPlain = (end: number) => {
    if (end > cursor) out.push({ kind: "plain", text: line.slice(cursor, end) });
  };

  if (norm === "json") {
    JSON_TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = JSON_TOKEN_RE.exec(line)) !== null) {
      pushPlain(m.index);
      if (m[1]) {
        out.push({ kind: m[2] ? "key" : "str", text: m[1] });
        if (m[2]) out.push({ kind: "plain", text: m[2] });
      } else if (m[3]) {
        out.push({ kind: "kw", text: m[3] });
      } else if (m[4]) {
        out.push({ kind: "num", text: m[4] });
      }
      cursor = m.index + m[0].length;
    }
    pushPlain(line.length);
    return out;
  }

  if (norm === "bash" || norm === "sh" || norm === "shell" || norm === "zsh") {
    BASH_TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BASH_TOKEN_RE.exec(line)) !== null) {
      pushPlain(m.index);
      if (m[1]) out.push({ kind: "com", text: m[1] });
      else if (m[2]) out.push({ kind: "str", text: m[2] });
      else if (m[3]) out.push({ kind: "var", text: m[3] });
      else if (m[4]) {
        const leadWs = m[4].match(/^\s+/)?.[0] ?? "";
        if (leadWs) out.push({ kind: "plain", text: leadWs });
        out.push({ kind: "key", text: m[4].slice(leadWs.length) });
      } else if (m[5]) out.push({ kind: "fn", text: m[5] });
      cursor = m.index + m[0].length;
    }
    pushPlain(line.length);
    return out;
  }

  if (norm === "py" || norm === "python") {
    PY_TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PY_TOKEN_RE.exec(line)) !== null) {
      pushPlain(m.index);
      if (m[1]) out.push({ kind: "com", text: m[1] });
      else if (m[2]) out.push({ kind: "str", text: m[2] });
      else if (m[3]) out.push({ kind: "key", text: m[3] });
      else if (m[4]) out.push({ kind: "kw", text: m[4] });
      else if (m[5]) out.push({ kind: "num", text: m[5] });
      else if (m[6]) out.push({ kind: "fn", text: m[6] });
      cursor = m.index + m[0].length;
    }
    pushPlain(line.length);
    return out;
  }

  JS_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JS_TOKEN_RE.exec(line)) !== null) {
    pushPlain(m.index);
    if (m[1]) out.push({ kind: "com", text: m[1] });
    else if (m[2]) out.push({ kind: "str", text: m[2] });
    else if (m[3]) out.push({ kind: "kw", text: m[3] });
    else if (m[4]) out.push({ kind: "num", text: m[4] });
    else if (m[5]) out.push({ kind: "fn", text: m[5] });
    cursor = m.index + m[0].length;
  }
  pushPlain(line.length);
  return out;
}

/**
 * 代码展示块（对齐 affectUI CodeBlock）：
 * - 极简清爽顶栏：左侧展示 filename（或映射后的语言名），右侧双层图标（复制 ↔ 对勾）200ms/320ms 交叉变形并在 1400ms 后自动还原，绝不置 disabled；
 * - 粘性不可选中行号槽（user-select: none），拷贝代码永远干净无行号；
 * - highlightLines 贯穿行号槽与整行宽度的柔和底色 + 左侧 2px 强调竖线，溢出时自动开放键盘横向滚动焦点。
 */
export function AfCodeBlock({
  code,
  language = "ts",
  filename,
  showLineNumbers,
  highlightLines,
  wrap,
  wordWrap,
  maxHeight,
  copyable = true,
  actions,
  onCopy,
  className,
  style,
  ...props
}: AfCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const timerRef = useRef<number | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const cleanCode = useMemo(() => code.replace(/\r\n/g, "\n").replace(/\n$/, ""), [code]);
  const lines = useMemo(() => cleanCode.split("\n"), [cleanCode]);
  const highlightSet = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const isWrapped = wrap ?? wordWrap ?? false;
  const displayLineNumbers = showLineNumbers ?? lines.length > 1;
  const headerTitle = filename || formatLanguageName(language);
  const showHeader = Boolean(headerTitle || copyable || actions);

  useEffect(() => {
    const el = preRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const check = () => {
      setScrollable(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cleanCode, isWrapped, maxHeight]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(cleanCode);
    if (!ok) return;
    setCopied(true);
    onCopy?.(cleanCode);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 1400);
  };

  return (
    <div
      className={["af-codeblock", className].filter(Boolean).join(" ")}
      data-wrap={isWrapped ? "true" : undefined}
      style={style}
      {...props}
    >
      {showHeader ? (
        <div className="af-codeblock__head">
          <span className="af-codeblock__title">{headerTitle}</span>
          <div className="af-codeblock__actions">
            {actions}
            {copyable ? (
              <button
                type="button"
                className="af-codeblock__copy"
                data-copied={copied ? "true" : undefined}
                aria-label={copied ? "Copied code" : "Copy code"}
                onClick={() => void handleCopy()}
              >
                <span className="af-codeblock__copy-icons" data-done={copied || undefined} aria-hidden="true">
                  <svg className="af-codeblock__svg af-codeblock__svg--copy" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" stroke="currentColor" strokeWidth="1.3" />
                    <path
                      d="M10.75 5.25V3.75A1.5 1.5 0 0 0 9.25 2.25h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h1.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg className="af-codeblock__svg af-codeblock__svg--check" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.25 8.5 6.5 11.75 12.75 4.75"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            ) : null}
          </div>
          <span className="af-sr-only" role="status" aria-live="polite">
            {copied ? "Copied to clipboard" : ""}
          </span>
        </div>
      ) : null}
      <pre
        ref={preRef}
        className="af-codeblock__pre"
        tabIndex={scrollable ? 0 : undefined}
        style={maxHeight !== undefined ? { maxHeight } : undefined}
      >
        <code className="af-codeblock__code">
          {lines.map((line, index) => {
            const ln = index + 1;
            const highlighted = highlightSet.has(ln);
            const tokens = tokenizeLine(line, language);
            return (
              <span key={ln} className="af-codeblock__line" data-hl={highlighted ? "true" : undefined}>
                {displayLineNumbers ? (
                  <span className="af-codeblock__ln" aria-hidden="true">
                    {ln}
                  </span>
                ) : null}
                <span className="af-codeblock__src">
                  {tokens.length === 0 || line === "" ? "\u200B" : null}
                  {tokens.map((tok, tokIdx) =>
                    tok.kind === "plain" ? (
                      <span key={tokIdx}>{tok.text}</span>
                    ) : (
                      <span key={tokIdx} className={`af-tok-${tok.kind}`}>
                        {tok.text}
                      </span>
                    ),
                  )}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
