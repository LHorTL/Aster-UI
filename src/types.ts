import type { ComponentType } from "react";

/** 组件库分组。顺序即侧栏展示顺序。 */
export type GalleryGroup =
  | "基础控件"
  | "输入与导航"
  | "对话"
  | "数据展示"
  | "反馈"
  | "Agents"
  | "Blocks"
  | "Screens"
  | "定制组件"
  | "动效"
  | "插画";

/** 组件来源：affectUI 免费 / affectUI Pro / Aster 自研。 */
export type ComponentSource = "free" | "pro" | "project";

/** 组件库条目：每个条目都是可直接迁移的 React 组件。 */
export type ComponentSpec = {
  /** 唯一标识，对应 affectUI 的 slug 或 Aster UI 组件名。 */
  id: string;
  /** 中文显示名。 */
  title: string;
  /** 所属分组。 */
  group: GalleryGroup;
  /** 来源。 */
  source: ComponentSource;
  /** 一句话说明：affectUI 参照与业务场景定位。 */
  note: string;
  /** 预览用的 React 组件。 */
  render: ComponentType;
  /** 预览舞台建议宽度（px）。 */
  width?: number;
  /** 预览舞台最小高度（px）。 */
  height?: number;
};

/** 分组顺序。 */
export const GROUPS: GalleryGroup[] = [
  "基础控件",
  "输入与导航",
  "对话",
  "数据展示",
  "反馈",
  "Agents",
  "Blocks",
  "Screens",
  "定制组件",
  "动效",
  "插画",
];

/** 覆盖清单状态：组件已进库 / 已由宿主场景适配 / 待补 / 不复刻（营销素材）。 */
export type CoverageStatus = "gallery" | "adapted" | "planned" | "skip";

/** affectUI 全量条目的覆盖记录。 */
export type CoverageEntry = {
  /** 条目标识。 */
  id: string;
  /** 英文名称。 */
  title: string;
  /** affectUI 站点分类：components / screens / blocks / illustrations / motion。 */
  kind: string;
  /** 免费或 Pro。 */
  price: string;
  /** affectUI 分类（如 Agents、Inputs）。 */
  category: string;
  /** 当前覆盖状态。 */
  status: CoverageStatus;
  /** 覆盖说明。 */
  note?: string;
};

/** 判断组件是否来自 affectUI 免费组。 */
export const isFree = (spec: ComponentSpec) => spec.source === "free";
