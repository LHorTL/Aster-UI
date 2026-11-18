import {
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { cn, copyToClipboard } from "../../primitives";

export type AfTypographyTone = "default" | "strong" | "muted" | "secondary" | "accent" | "success" | "warning" | "danger";

export type AfTextCopyableConfig = {
  /** 指定实际写入剪贴板的文本；省略时自动提取子节点纯文本。 */
  text?: string;
  /** 复制成功回调。 */
  onCopy?: () => void;
};

function extractPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractPlainText).join("");
  if (isValidElement(node)) {
    return extractPlainText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** 行内文字属性。 */
export type AfTextProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AfTypographyTone;
  type?: AfTypographyTone;
  strong?: boolean;
  code?: boolean;
  numeric?: boolean;
  /** 单行省略截断（自动声明 `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`）。 */
  ellipsis?: boolean;
  /** 右侧附加轻量一键复制按钮（反馈期保持可聚焦不设 `disabled`）。 */
  copyable?: boolean | AfTextCopyableConfig;
  children?: ReactNode;
};

/** 语义化行内排版文本，支持 `tabular-nums`、单行省略截断与非抢焦一键复制。 */
export const AfText = forwardRef<HTMLSpanElement, AfTextProps>(function AfText(
  { tone, type, strong, code, numeric, ellipsis, copyable, className, style, children, ...rest },
  ref,
) {
  const resolvedTone = tone ?? type ?? "default";
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copyConfig = typeof copyable === "object" ? copyable : undefined;
  const handleCopy = async () => {
    const targetText = copyConfig?.text ?? extractPlainText(children);
    if (!targetText) return;
    const ok = await copyToClipboard(targetText);
    if (!ok) return;
    copyConfig?.onCopy?.();
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setCopied(false);
    }, 1500);
  };

  const textSpan = (
    <span
      ref={copyable ? undefined : ref}
      className={cn("af-typo-text", !copyable && className)}
      data-tone={resolvedTone}
      data-code={code || undefined}
      data-numeric={numeric || undefined}
      data-ellipsis={ellipsis || undefined}
      style={!copyable ? (strong ? { fontWeight: 600, ...style } : style) : strong ? { fontWeight: 600 } : undefined}
      {...(!copyable ? rest : null)}
    >
      {children}
    </span>
  );

  if (!copyable) return textSpan;

  return (
    <span
      ref={ref}
      className={cn("af-typo-text-copywrap", className)}
      data-ellipsis={ellipsis || undefined}
      style={style}
      {...rest}
    >
      {textSpan}
      <button
        type="button"
        className="af-typo-text__copy"
        data-copied={copied ? "true" : undefined}
        aria-label={copied ? "已复制" : "复制文本"}
        onClick={(event) => {
          event.stopPropagation();
          void handleCopy();
        }}
      >
        <AfIcon name={copied ? "check" : "copy"} size={12} />
      </button>
    </span>
  );
});

/** 标题属性。 */
export type AfTitleProps = ComponentPropsWithoutRef<"h2"> & {
  level?: 1 | 2 | 3 | 4 | 5;
  children?: ReactNode;
};

/** affectUI 层级标题（h1–h5，对齐页面 22 / 20 / 16 / 15 / 13px 阶梯）。 */
export const AfTitle = forwardRef<HTMLHeadingElement, AfTitleProps>(function AfTitle(
  { level = 3, className, children, ...rest },
  ref,
) {
  const Tag = (`h${level}` as "h1" | "h2" | "h3" | "h4" | "h5");
  return (
    <Tag ref={ref} className={cn("af-typo-title", className)} data-level={level} {...rest}>
      {children}
    </Tag>
  );
});

/** 段落属性。 */
export type AfParagraphProps = ComponentPropsWithoutRef<"p"> & {
  ellipsis?: boolean | { rows?: number };
  tone?: AfTypographyTone;
  children?: ReactNode;
};

/** 正文段落：支持行高 21px 标准阅读舒适度与多行省略控制。 */
export const AfParagraph = forwardRef<HTMLParagraphElement, AfParagraphProps>(function AfParagraph(
  { ellipsis, tone = "default", className, style, children, ...rest },
  ref,
) {
  const rows = typeof ellipsis === "object" ? (ellipsis.rows ?? 2) : ellipsis ? 2 : undefined;
  return (
    <p
      ref={ref}
      className={cn("af-typo-paragraph", className)}
      data-tone={tone}
      data-ellipsis={Boolean(ellipsis) || undefined}
      style={rows ? { WebkitLineClamp: rows, ...style } : style}
      {...rest}
    >
      {children}
    </p>
  );
});

export type AfTypographyProps = ComponentPropsWithoutRef<"div"> & {
  children?: ReactNode;
};

function AfTypographyBase({ className, children, ...rest }: AfTypographyProps = {}) {
  return (
    <div className={cn("af-typography", className)} {...rest}>
      {children}
    </div>
  );
}

/** affectUI 排版命名空间组件：`AfTypography.Text` / `AfTypography.Title` / `AfTypography.Paragraph`。 */
export const AfTypography = Object.assign(AfTypographyBase, {
  Text: AfText,
  Title: AfTitle,
  Paragraph: AfParagraph,
});
