import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfTypographyTone = "default" | "strong" | "muted" | "secondary" | "accent" | "success" | "warning" | "danger";

/** 行内文字属性。 */
export type AfTextProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AfTypographyTone;
  type?: AfTypographyTone;
  strong?: boolean;
  code?: boolean;
  numeric?: boolean;
  children?: ReactNode;
};

/** 语义化行内排版文本，支持 `tabular-nums` 与状态色调。 */
export const AfText = forwardRef<HTMLSpanElement, AfTextProps>(function AfText(
  { tone, type, strong, code, numeric, className, style, children, ...rest },
  ref,
) {
  const resolvedTone = tone ?? type ?? "default";
  return (
    <span
      ref={ref}
      className={cn("af-typo-text", className)}
      data-tone={resolvedTone}
      data-code={code || undefined}
      data-numeric={numeric || undefined}
      style={strong ? { fontWeight: 600, ...style } : style}
      {...rest}
    >
      {children}
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
