import {
  forwardRef,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

/** 语义化间距档位（自动随 `AsterThemeProvider` 的 `density="comfortable" | "compact"` 缩放）。 */
export type AfSpaceToken =
  | "none"
  | "micro"
  | "tight"
  | "inline"
  | "group"
  | "block"
  | "section-inner"
  | "section"
  | "page"
  | "page-lg";

const SPACE_VAR_MAP: Record<AfSpaceToken, string> = {
  none: "0px",
  micro: "var(--af-space-micro)",
  tight: "var(--af-space-tight)",
  inline: "var(--af-space-inline)",
  group: "var(--af-space-group)",
  block: "var(--af-space-block)",
  "section-inner": "var(--af-space-section-inner)",
  section: "var(--af-space-section)",
  page: "var(--af-space-page)",
  "page-lg": "var(--af-space-page-lg)",
};

function resolveSpace(value: AfSpaceToken | number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value in SPACE_VAR_MAP ? SPACE_VAR_MAP[value as AfSpaceToken] : value;
}

/* ============================================================================
 * AfStack / AfInline / AfSpacer — 通用 Flexbox 间距与对齐原语
 * ========================================================================== */

export type AfStackAs = "div" | "section" | "article" | "header" | "footer" | "main" | "aside" | "nav" | "ul";

/** 通用 Flexbox 纵向/横向排列容器属性。 */
export type AfStackProps = ComponentPropsWithoutRef<"div"> & {
  /** 语义标签，默认 `"div"`。 */
  as?: AfStackAs;
  /** 排列方向，默认 `"vertical"`。 */
  direction?: "vertical" | "horizontal";
  /** 间距档位或显式数值（默认 `"block"`，即 16px / compact 12px）。 */
  gap?: AfSpaceToken | number | string;
  /** 交叉轴对齐方式。 */
  align?: "stretch" | "start" | "center" | "end" | "baseline";
  /** 主轴分布方式。 */
  justify?: "start" | "center" | "end" | "between" | "around";
  /** 是否允许自动换行。 */
  wrap?: boolean;
  /** 内边距档位或显式长度。 */
  padding?: AfSpaceToken | number | string;
  /** 撑满剩余弹性空间（`flex: 1 1 auto`）。 */
  fill?: boolean;
  children?: ReactNode;
};

const ALIGN_MAP: Record<NonNullable<AfStackProps["align"]>, CSSProperties["alignItems"]> = {
  stretch: "stretch",
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
};

const JUSTIFY_MAP: Record<NonNullable<AfStackProps["justify"]>, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

/**
 * 通用 Flexbox 堆叠容器（默认纵向、`min-width: 0`、响应密度令牌间距）。
 * 用于替代手写 `display: flex; gap: ...`，让纯基础组件拼装拥有稳定统一的节奏。
 */
export const AfStack = forwardRef<HTMLElement, AfStackProps>(function AfStack(
  {
    as = "div",
    direction = "vertical",
    gap = "block",
    align,
    justify,
    wrap = false,
    padding,
    fill = false,
    className,
    style,
    children,
    ...rest
  } = {},
  ref,
) {
  const Tag = as;
  const mergedStyle: CSSProperties = {
    gap: resolveSpace(gap),
    ...(align ? { alignItems: ALIGN_MAP[align] } : null),
    ...(justify ? { justifyContent: JUSTIFY_MAP[justify] } : null),
    ...(padding !== undefined ? { padding: resolveSpace(padding) } : null),
    ...style,
  };
  return (
    <Tag
      ref={ref as never}
      className={cn("af-stack", className)}
      data-direction={direction}
      data-wrap={wrap || undefined}
      data-fill={fill || undefined}
      style={mergedStyle}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
});

/** 水平行内组合容器属性（默认 `direction="horizontal"`、`align="center"`、`gap="inline"`、`wrap`）。 */
export type AfInlineProps = Omit<AfStackProps, "direction">;

/** 水平行内控件/标签/按钮组合容器，默认 `gap="inline"`（8px / compact 6px）并居中对齐。 */
export const AfInline = forwardRef<HTMLElement, AfInlineProps>(function AfInline(
  { gap = "inline", align = "center", wrap = true, ...rest } = {},
  ref,
) {
  return <AfStack ref={ref} direction="horizontal" gap={gap} align={align} wrap={wrap} {...rest} />;
});

/** 弹性占位器：在工具栏或行容器内将左右两侧控件推向两端。 */
export function AfSpacer({ className, ...rest }: ComponentPropsWithoutRef<"span"> = {}) {
  return <span aria-hidden="true" className={cn("af-spacer", className)} {...rest} />;
}

/* ============================================================================
 * AfColumns — 纯 Flexbox 多列等宽/自适应容器（严禁 CSS Grid）
 * ========================================================================== */

/** 纯 Flexbox 多列容器属性。 */
export type AfColumnsProps = ComponentPropsWithoutRef<"div"> & {
  /** 列数：固定 `2 | 3 | 4` 等宽列，或 `"auto"` 按 `minItemWidth` 自适应折行。默认 `"auto"`。 */
  columns?: 1 | 2 | 3 | 4 | "auto";
  /** `columns="auto"` 时的单列最小宽度（px，默认 `220`）。 */
  minItemWidth?: number;
  /** 列与行间距，默认 `"group"`（12px / compact 8px）。 */
  gap?: AfSpaceToken | number | string;
  /** 交叉轴对齐方式，默认 `"stretch"`。 */
  align?: "stretch" | "start" | "center";
  children?: ReactNode;
};

/**
 * 纯 Flexbox 多列排布容器（零 CSS Grid，严格遵循 `DESIGN.md` 布局铁律）。
 * 自动为每个直接子项注入 `min-width: 0` 与等宽/自适应弹性基准，避免卡片或表单列撑破或参差。
 */
export const AfColumns = forwardRef<HTMLDivElement, AfColumnsProps>(function AfColumns(
  { columns = "auto", minItemWidth = 220, gap = "group", align = "stretch", className, style, children, ...rest } = {},
  ref,
) {
  const gapVal = resolveSpace(gap) ?? "var(--af-space-group)";
  const mergedStyle = {
    "--af-cols-gap": gapVal,
    "--af-cols-min": `${minItemWidth}px`,
    alignItems: ALIGN_MAP[align],
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn("af-columns", className)}
      data-columns={String(columns)}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
});

/* ============================================================================
 * AfPage & AfPageHeader & AfSection — 页面骨架与区块节奏原语
 * ========================================================================== */

export type AfPageWidth = "narrow" | "medium" | "wide" | "full";

const PAGE_WIDTH_MAP: Record<AfPageWidth, string | undefined> = {
  narrow: "var(--af-page-max-narrow)",
  medium: "var(--af-page-max-medium)",
  wide: "var(--af-page-max-wide)",
  full: undefined,
};

/** 标准页面容器属性。 */
export type AfPageProps = ComponentPropsWithoutRef<"div"> & {
  /** 内容区最大宽度约束：`narrow(680)` 设置/表单、`medium(960)` 详情、`wide(1200)` 工作台、`full` 满宽。默认 `"wide"`。 */
  maxWidth?: AfPageWidth | number | string;
  /** 居中对齐内容区，默认 `true`。 */
  centered?: boolean;
  /** 页面外围留白，默认 `"page"`（24px / compact 16px）。 */
  padding?: AfSpaceToken | number | string;
  /** 区块间垂直节奏，默认 `"section"`（24px / compact 16px）。 */
  gap?: AfSpaceToken | number | string;
  /** 页面背景表面层级，默认 `"transparent"`（继承外层画布或面板）。 */
  surface?: "transparent" | "canvas" | "panel";
  children?: ReactNode;
};

/** 标准页面根容器：统一页边距、最大阅读宽度与区块垂直节奏。 */
export const AfPage = forwardRef<HTMLDivElement, AfPageProps>(function AfPage(
  {
    maxWidth = "wide",
    centered = true,
    padding = "page",
    gap = "section",
    surface = "transparent",
    className,
    style,
    children,
    ...rest
  } = {},
  ref,
) {
  const resolvedMax =
    typeof maxWidth === "number"
      ? `${maxWidth}px`
      : maxWidth in PAGE_WIDTH_MAP
        ? PAGE_WIDTH_MAP[maxWidth as AfPageWidth]
        : maxWidth;

  const innerStyle: CSSProperties = {
    gap: resolveSpace(gap),
    ...(resolvedMax ? { maxWidth: resolvedMax } : null),
  };

  return (
    <div
      ref={ref}
      className={cn("af-page", className)}
      data-surface={surface !== "transparent" ? surface : undefined}
      style={{ padding: resolveSpace(padding), ...style }}
      {...rest}
    >
      <div className="af-page__inner" data-centered={centered || undefined} style={innerStyle}>
        {children}
      </div>
    </div>
  );
});

/** 页面顶栏属性。 */
export type AfPageHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  /** 顶层面包屑或返回导航。 */
  breadcrumb?: ReactNode;
  /** 页面主标题（默认渲染 20px/600 `h1`）。 */
  title?: ReactNode;
  /** 标题旁徽标或状态标签。 */
  badge?: ReactNode;
  /** 标题下方一句话说明。 */
  description?: ReactNode;
  /** 右侧主次操作按钮组。 */
  actions?: ReactNode;
  /** 底部补充元信息条或标签页。 */
  meta?: ReactNode;
  /** 是否在底部渲染 1px 发丝分隔线。 */
  divider?: boolean;
};

/** 标准页面顶栏：左标题说明 + 右操作组，内置光学对齐与发丝分隔支持。 */
export const AfPageHeader = forwardRef<HTMLElement, AfPageHeaderProps>(function AfPageHeader(
  { breadcrumb, title, badge, description, actions, meta, divider = false, className, children, ...rest } = {},
  ref,
) {
  return (
    <header ref={ref} className={cn("af-page-header", className)} data-divider={divider || undefined} {...rest}>
      {breadcrumb ? <div className="af-page-header__crumb">{breadcrumb}</div> : null}
      <div className="af-page-header__row">
        <div className="af-page-header__titles">
          {(title !== undefined || badge !== undefined) && (
            <div className="af-page-header__titleline">
              {title !== undefined ? <h1 className="af-page-header__title">{title}</h1> : null}
              {badge}
            </div>
          )}
          {description !== undefined ? <p className="af-page-header__desc">{description}</p> : null}
        </div>
        {actions ? <div className="af-page-header__actions">{actions}</div> : null}
      </div>
      {meta ? <div className="af-page-header__meta">{meta}</div> : null}
      {children}
    </header>
  );
});

/** 页面内容区块属性。 */
export type AfSectionProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  /** 区块标题（15px/600）。 */
  title?: ReactNode;
  /** 区块说明文案（12px `--af-muted`）。 */
  description?: ReactNode;
  /** 标题右侧辅助操作。 */
  action?: ReactNode;
  /** 标题与主体内容间距，默认 `"group"`（12px / compact 8px）。 */
  gap?: AfSpaceToken | number | string;
  /** 是否在顶部加 1px 发丝分隔线（用于连续章节间分段）。 */
  divider?: boolean;
  children?: ReactNode;
};

/** 标准页面区块容器：统一区块标题、副标题、右侧操作与正文之间的留白节奏。 */
export const AfSection = forwardRef<HTMLElement, AfSectionProps>(function AfSection(
  { title, description, action, gap = "group", divider = false, className, style, children, ...rest } = {},
  ref,
) {
  const hasHead = title !== undefined || description !== undefined || action !== undefined;
  return (
    <section
      ref={ref}
      className={cn("af-section", className)}
      data-divider={divider || undefined}
      style={{ gap: resolveSpace(gap), ...style }}
      {...rest}
    >
      {hasHead ? (
        <header className="af-section__head">
          <div className="af-section__titles">
            {title !== undefined ? <h2 className="af-section__title">{title}</h2> : null}
            {description !== undefined ? <p className="af-section__desc">{description}</p> : null}
          </div>
          {action ? <div className="af-section__action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
});

/* ============================================================================
 * AfToolbar & AfListRow — 工具栏与发丝分隔列表/设置行原语
 * ========================================================================== */

/** 筛选与操作工具栏属性。 */
export type AfToolbarProps = ComponentPropsWithoutRef<"div"> & {
  /** 左侧筛选/搜索控件区（与 `children` 等价，可二选一或同时传入）。 */
  leading?: ReactNode;
  /** 右侧视图切换/批量操作区。 */
  trailing?: ReactNode;
  /** 控件间距，默认 `"inline"`（8px / compact 6px）。 */
  gap?: AfSpaceToken | number | string;
  /** 是否允许窄容器下自动折行，默认 `true`。 */
  wrap?: boolean;
  /** 可选外观底板：`"none"` 透明贴画布、`"sunken"` 轻槽底、`"card"` 发丝白卡。 */
  surface?: "none" | "sunken" | "card";
  children?: ReactNode;
};

/** 标准筛选/操作工具栏：统一左右推开布局与同排控件光学居中。 */
export const AfToolbar = forwardRef<HTMLDivElement, AfToolbarProps>(function AfToolbar(
  { leading, trailing, gap = "inline", wrap = true, surface = "none", className, style, children, ...rest } = {},
  ref,
) {
  const resolvedGap = resolveSpace(gap);
  return (
    <div
      ref={ref}
      role="toolbar"
      className={cn("af-toolbar", className)}
      data-surface={surface !== "none" ? surface : undefined}
      data-wrap={wrap || undefined}
      style={{ gap: resolvedGap, ...style }}
      {...rest}
    >
      {(leading !== undefined || children !== undefined) && (
        <div className="af-toolbar__group" style={{ gap: resolvedGap }}>
          {leading}
          {children}
        </div>
      )}
      {trailing !== undefined ? (
        <div className="af-toolbar__group af-toolbar__group--trailing" style={{ gap: resolvedGap }}>
          {trailing}
        </div>
      ) : null}
    </div>
  );
});

/** 标准发丝分隔设置/列表行属性。 */
export type AfListRowProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  /** 左侧前置图标（内置图标键或自定义节点，渲染为 30px 柔和磁贴或自定义槽）。 */
  icon?: AffectIconKey | ReactNode;
  /** 主标题。 */
  title?: ReactNode;
  /** 标题旁内联徽标/标签。 */
  badge?: ReactNode;
  /** 标题下方说明文案。 */
  description?: ReactNode;
  /** 控件左侧的辅助元数据（如等宽数值、时间戳）。 */
  meta?: ReactNode;
  /** 右侧交互控件或操作按钮（`control` 与 `action` 互为别名）。 */
  control?: ReactNode;
  /** 右侧操作区（`control` 别名）。 */
  action?: ReactNode;
  /** 垂直对齐：单行/双行默认 `"center"`，多行表单可选 `"start"`。 */
  align?: "center" | "start";
  /** 是否启用滑动悬停项标记（配合外层 `<AfHoverList>` 使用）。 */
  interactive?: boolean;
  /** 选中高亮态。 */
  selected?: boolean;
  /** 禁用态（统一 `opacity: 0.4`）。 */
  disabled?: boolean;
  /** 点击整行回调（有内部按钮时自动校验 `e.target === e.currentTarget` 防冒泡吞键）。 */
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
};

/**
 * 标准发丝分隔列表/设置行：配合 `<AfCard flush>` + `<AfHoverList>` 零样板拼出设置分组、账号列表与资源清单。
 * 自动遵循 52px/44px 密度行高、`1px` 发丝底线、`min-width: 0` 防溢出与复合键盘守卫。
 */
export const AfListRow = forwardRef<HTMLDivElement, AfListRowProps>(function AfListRow(
  {
    icon,
    title,
    badge,
    description,
    meta,
    control,
    action,
    align = "center",
    interactive,
    selected = false,
    disabled = false,
    onClick,
    onKeyDown,
    className,
    children,
    ...rest
  } = {},
  ref,
) {
  const rightSlot = control ?? action;
  const isClickable = Boolean(onClick) && !disabled;
  const isHoverItem = interactive ?? isClickable;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !isClickable) return;
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div
      ref={ref}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-disabled={disabled || undefined}
      data-af-hover-item={isHoverItem ? "" : undefined}
      data-align={align !== "center" ? align : undefined}
      data-clickable={isClickable || undefined}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      className={cn("af-list-row", className)}
      onClick={disabled ? undefined : onClick}
      onKeyDown={isClickable ? handleKeyDown : onKeyDown}
      {...rest}
    >
      {icon !== undefined && icon !== null ? (
        <span className="af-list-row__icon" aria-hidden="true">
          {typeof icon === "string" ? <AfIcon name={icon as AffectIconKey} size={15} /> : icon}
        </span>
      ) : null}
      <div className="af-list-row__main">
        {(title !== undefined || badge !== undefined) && (
          <div className="af-list-row__titleline">
            {title !== undefined ? <span className="af-list-row__title">{title}</span> : null}
            {badge}
          </div>
        )}
        {description !== undefined ? <p className="af-list-row__desc">{description}</p> : null}
        {children}
      </div>
      {(meta !== undefined || rightSlot !== undefined) && (
        <div className="af-list-row__trail">
          {meta !== undefined ? <span className="af-list-row__meta">{meta}</span> : null}
          {rightSlot}
        </div>
      )}
    </div>
  );
});
