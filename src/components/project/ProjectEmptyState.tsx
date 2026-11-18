import { isValidElement, useState, type ReactNode } from "react";
import { renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn } from "../../primitives";
import { AfButton, AfEmptyState, AfSegmented } from "../../ui";
import { AfSwap } from "../../ui-pro";
import { emptyVariants } from "../_shared/project";

/** 空状态操作描述对象（向后兼容旧版配置式 action）。 */
export type AfProjectEmptyStateAction = {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: AfIconSlot;
};

/** 空状态组件属性。 */
export type AfProjectEmptyStateProps = {
  /** 指定图标名或自定义图标节点。 */
  icon?: AfIconSlot;
  /** 自定义图标节点插槽。 */
  iconNode?: ReactNode;
  /** 标题。 */
  title?: ReactNode;
  /** 描述文案。 */
  description?: ReactNode;
  /** 主操作槽位（ReactNode 或配置式操作对象）。 */
  action?: ReactNode | AfProjectEmptyStateAction;
  /** 预设场景模式（未传 title 时生效）。 */
  mode?: "welcome" | "search";
  /** 是否在演示模式下显示模式切换条。 */
  showVariantSwitch?: boolean;
  /** 兼容别名：同 `showVariantSwitch`。 */
  showVariantSwitcher?: boolean;
  /** 卡片形态。 */
  surface?: "bare" | "framed";
  className?: string;
};

/** 宿主空状态：支持裸画布嵌入或边框卡片展示，带精致双环圆角徽标与场景引导。 */
function ProjectEmptyState({
  icon,
  iconNode,
  title,
  description,
  action,
  mode: modeProp,
  showVariantSwitch,
  showVariantSwitcher,
  surface = "bare",
  className,
}: AfProjectEmptyStateProps = {}) {
  const [innerMode, setInnerMode] = useState<"welcome" | "search">(modeProp ?? "welcome");
  const mode = modeProp ?? innerMode;
  const allowSwitch = showVariantSwitch ?? showVariantSwitcher ?? (title === undefined && modeProp === undefined);

  const preset =
    mode === "search"
      ? {
          icon: "search" as const,
          title: "未找到匹配的内容",
          desc: "当前筛选条件下暂无对应记录，试试缩短关键词或清除过滤项。",
          cta: "重置筛选条件",
          ctaIcon: "refresh" as const,
          secondary: "查看全部列表",
        }
      : {
          icon: "sparkle" as const,
          title: "还没有创建任何项目",
          desc: "新建空白文档或从本地文件夹导入示例模板，即可开始日常整理与协作。",
          cta: "新建项目",
          ctaIcon: "plus" as const,
          secondary: "导入示例",
        };

  const resolvedAction =
    action !== undefined &&
    action !== null &&
    typeof action === "object" &&
    !isValidElement(action) &&
    "label" in action ? (
      <AfButton
        size="sm"
        variant={(action as AfProjectEmptyStateAction).variant ?? "primary"}
        icon={(action as AfProjectEmptyStateAction).icon as ReactNode}
        onClick={(action as AfProjectEmptyStateAction).onClick}
      >
        {(action as AfProjectEmptyStateAction).label}
      </AfButton>
    ) : (
      (action as ReactNode) ?? (
        <span className="af-pj-empty__actions">
          <AfButton size="sm" variant="primary" icon={preset.ctaIcon}>
            {preset.cta}
          </AfButton>
          <AfButton size="sm" variant="secondary">
            {preset.secondary}
          </AfButton>
        </span>
      )
    );

  const defaultArt = (
    <span className="af-pj-empty__emblem" aria-hidden="true">
      <span className="af-pj-empty__emblem-core">
        {renderAfIconSlot(icon ?? preset.icon, 20)}
      </span>
    </span>
  );

  const body = (
    <AfEmptyState
      variant="bare"
      art={iconNode ?? defaultArt}
      title={title ?? preset.title}
      description={description ?? preset.desc}
      actions={resolvedAction}
    />
  );

  return (
    <div className={cn("af-pj-empty", surface === "framed" && "af-pj-empty--framed", className)}>
      {allowSwitch ? (
        <div className="af-pj-empty__bar">
          <span className="af-pj-empty__bar-label">空状态预设场景</span>
          <AfSegmented
            size="sm"
            value={mode}
            onChange={(next) => setInnerMode(next as "welcome" | "search")}
            options={emptyVariants}
          />
        </div>
      ) : null}
      {allowSwitch ? (
        <AfSwap swapKey={mode} className="af-pj-empty__swap">
          {body}
        </AfSwap>
      ) : (
        body
      )}
    </div>
  );
}

export { ProjectEmptyState as AfProjectEmptyState };
