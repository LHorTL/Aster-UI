import {
  Children,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfSpinner } from "./Spinner";

export type AfCardAs = "div" | "section" | "article" | "li";

/** 卡片属性（对齐 affectUI Card 与 Aster 契约）。 */
export type AfCardProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  /** 渲染根语义标签，默认 `"section"`。 */
  as?: AfCardAs;
  /** 标题。 */
  title?: ReactNode;
  /** 标题下方的次要说明。 */
  description?: ReactNode;
  /** 标题左侧前置图标（支持内置图标键名或任意节点）。 */
  icon?: AffectIconKey | ReactNode;
  /** 标题行右侧操作（与 `action` 互为别名）。 */
  extra?: ReactNode;
  /** 标题行右侧操作（对齐 affectUI `action`）。 */
  action?: ReactNode;
  /** 底部操作栏或附加元数据区。 */
  footer?: ReactNode;
  /** 标题对齐方式。 */
  titleAlign?: "start" | "center";
  /** 正文或组合子组件（`AfCardHeader` / `AfCardContent` / `AfCardFooter`）。 */
  children?: ReactNode;
  /** 正文是否去掉内边距（列表或满幅媒体内容）。 */
  flush?: boolean;
  /** 卡片撑满剩余高度并允许正文独立滚动（历史宿主迁移兼容 `fill` 契约）。 */
  fill?: boolean;
  /** 自定义正文内边距。 */
  padding?: number | string | "none" | "sm" | "md" | "lg";
  /** 正文布局模式：纵向栈（默认）、横向弹性行或自适应填充。 */
  bodyLayout?: "stack" | "row" | "fill";
  /** 正文溢出处理。 */
  bodyOverflow?: "visible" | "auto" | "hidden";
  /** 正文容器附加类名。 */
  bodyClassName?: string;
  /** 正文容器内联样式。 */
  bodyStyle?: CSSProperties;
  /** 正文容器透传 HTML 属性。 */
  bodyProps?: HTMLAttributes<HTMLDivElement>;
  /** 加载状态：在卡片内显示轻量等待指示。 */
  loading?: boolean;
  /** 是否在加载态时保留正文并用遮罩覆盖（默认 true）。 */
  loadingOverlay?: boolean;
  /** 可交互悬浮深化阴影与拉伸点击区支持（对齐 affectUI Card `interactive`）。 */
  interactive?: boolean;
  /** 选中高亮态（克制中性柔灰底 + 加深发丝边缘，零刺眼静态蓝环）。 */
  selected?: boolean;
};

export type AfCardHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  icon?: AffectIconKey | ReactNode;
  action?: ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
};

export type AfCardTitleProps = ComponentPropsWithoutRef<"h3"> & {
  as?: "h2" | "h3" | "h4" | "p";
};

export type AfCardDescriptionProps = ComponentPropsWithoutRef<"p">;

export type AfCardContentProps = ComponentPropsWithoutRef<"div"> & {
  flush?: boolean;
};

export type AfCardFooterProps = ComponentPropsWithoutRef<"footer">;

const CARD_PADDING_TOKENS: Record<"none" | "sm" | "md" | "lg", string> = {
  none: "0px",
  sm: "10px 12px 12px",
  md: "12px 16px 16px",
  lg: "16px 20px 20px",
};

const COMPOUND_SLOTS = new Set(["AfCardHeader", "AfCardContent", "AfCardFooter"]);

function renderCardIcon(icon: AffectIconKey | ReactNode | undefined) {
  if (icon === undefined || icon === null) return null;
  return (
    <span className="af-card__icon" aria-hidden="true">
      {typeof icon === "string" ? <AfIcon name={icon as AffectIconKey} size={15} /> : icon}
    </span>
  );
}

/** 组合式卡片标题。 */
export const AfCardTitle = forwardRef<HTMLHeadingElement, AfCardTitleProps>(function AfCardTitle(
  { as: Tag = "h3", className, children, ...rest },
  ref,
) {
  return (
    <Tag ref={ref as never} className={cn("af-card__title", className)} {...rest}>
      {children}
    </Tag>
  );
});
AfCardTitle.displayName = "AfCardTitle";

/** 组合式卡片说明。 */
export const AfCardDescription = forwardRef<HTMLParagraphElement, AfCardDescriptionProps>(function AfCardDescription(
  { className, children, ...rest },
  ref,
) {
  return (
    <p ref={ref} className={cn("af-card__desc", className)} {...rest}>
      {children}
    </p>
  );
});
AfCardDescription.displayName = "AfCardDescription";

/** 组合式卡片头部（支持快捷传入 `title` / `description` / `icon` / `action`，或直接放置自定义子节点）。 */
export const AfCardHeader = forwardRef<HTMLElement, AfCardHeaderProps>(function AfCardHeader(
  { title, description, icon, action, titleAs = "h3", className, children, ...rest },
  ref,
) {
  const TitleTag = titleAs;
  const hasStructured = title !== undefined || description !== undefined || icon !== undefined || action !== undefined;
  return (
    <header ref={ref} className={cn("af-card__head", className)} {...rest}>
      {hasStructured ? (
        <>
          <div className="af-card__lead">
            {renderCardIcon(icon)}
            <div className="af-card__titles">
              {title !== undefined ? <TitleTag className="af-card__title">{title}</TitleTag> : null}
              {description !== undefined ? <p className="af-card__desc">{description}</p> : null}
              {children}
            </div>
          </div>
          {action !== undefined ? <div className="af-card__extra">{action}</div> : null}
        </>
      ) : (
        children
      )}
    </header>
  );
});
AfCardHeader.displayName = "AfCardHeader";

/** 组合式卡片正文区。 */
export const AfCardContent = forwardRef<HTMLDivElement, AfCardContentProps>(function AfCardContent(
  { flush, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn("af-card__body", className)} data-flush={flush || undefined} {...rest}>
      {children}
    </div>
  );
});
AfCardContent.displayName = "AfCardContent";

/** 组合式卡片底部栏。 */
export const AfCardFooter = forwardRef<HTMLElement, AfCardFooterProps>(function AfCardFooter(
  { className, children, ...rest },
  ref,
) {
  return (
    <footer ref={ref} className={cn("af-card__footer", className)} {...rest}>
      {children}
    </footer>
  );
});
AfCardFooter.displayName = "AfCardFooter";

/**
 * 卡片容器（对齐 affectUI Card）：
 * - 干净表面、0.5px 发丝轮廓与克制微阴影，头部与正文靠留白分层而不画生硬分割线；
 * - 同时支持快捷属性模式（`title`/`description`/`icon`/`action`/`footer`）与组合式原语（`AfCardHeader`/`AfCardContent`/`AfCardFooter`）；
 * - `interactive` 支持标题内的链接/按钮通过伪元素拉伸覆盖整卡热区，同时确保次级操作按钮独立可点。
 */
export const AfCard = forwardRef<HTMLElement, AfCardProps>(function AfCard(
  {
    as = "section",
    title,
    description,
    icon,
    extra,
    action,
    footer,
    titleAlign = "start",
    children,
    className,
    flush,
    fill = false,
    padding,
    bodyLayout = "stack",
    bodyOverflow,
    bodyClassName,
    bodyStyle,
    bodyProps,
    loading = false,
    loadingOverlay = true,
    interactive = false,
    selected = false,
    ...rest
  },
  ref,
) {
  const RootTag = as;
  const headerAction = action ?? extra;
  const hasHeader = title !== undefined || description !== undefined || icon !== undefined || headerAction !== undefined;

  const isCompound =
    !hasHeader &&
    Children.toArray(children).some(
      (child) => isValidElement(child) && COMPOUND_SLOTS.has((child.type as { displayName?: string }).displayName ?? ""),
    );

  const resolvedPadding =
    padding === undefined
      ? undefined
      : typeof padding === "number"
        ? `${padding}px`
        : padding in CARD_PADDING_TOKENS
          ? CARD_PADDING_TOKENS[padding as keyof typeof CARD_PADDING_TOKENS]
          : padding;

  const mergedBodyStyle: CSSProperties | undefined =
    resolvedPadding !== undefined || bodyOverflow || bodyStyle
      ? {
          ...(resolvedPadding !== undefined ? { padding: resolvedPadding } : null),
          ...(bodyOverflow ? { overflow: bodyOverflow } : null),
          ...bodyStyle,
        }
      : undefined;

  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <RootTag
      ref={ref as never}
      className={cn("af-card", className)}
      data-fill={fill || undefined}
      data-loading={loading || undefined}
      data-interactive={interactive || undefined}
      data-selected={selected || undefined}
      data-compound={isCompound || undefined}
      data-title-align={titleAlign !== "start" ? titleAlign : undefined}
      aria-busy={loading || undefined}
      {...(rest as Record<string, unknown>)}
    >
      {hasHeader ? (
        <header className="af-card__head">
          <div className="af-card__lead">
            {renderCardIcon(icon)}
            <div className="af-card__titles">
              {title !== undefined ? <h3 className="af-card__title">{title}</h3> : null}
              {description !== undefined ? <p className="af-card__desc">{description}</p> : null}
            </div>
          </div>
          {headerAction !== undefined ? <div className="af-card__extra">{headerAction}</div> : null}
        </header>
      ) : null}

      {isCompound ? (
        loading && !loadingOverlay ? (
          <div className="af-card__loading-inline">
            <AfSpinner size={16} />
          </div>
        ) : (
          children
        )
      ) : hasBody || (loading && !loadingOverlay) ? (
        <div
          {...bodyProps}
          className={cn("af-card__body", bodyClassName, bodyProps?.className)}
          data-flush={flush || padding === "none" || padding === 0 || undefined}
          data-layout={bodyLayout !== "stack" ? bodyLayout : undefined}
          style={{ ...mergedBodyStyle, ...bodyProps?.style }}
        >
          {loading && !loadingOverlay ? (
            <div className="af-card__loading-inline">
              <AfSpinner size={16} />
            </div>
          ) : (
            children
          )}
        </div>
      ) : null}

      {footer !== undefined ? <footer className="af-card__footer">{footer}</footer> : null}

      {loading && loadingOverlay ? (
        <div className="af-card__loading" aria-live="polite">
          <AfSpinner size={16} />
        </div>
      ) : null}
    </RootTag>
  );
});
