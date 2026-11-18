import { type AfTone } from "../../ui";
import type { AfIconSlot } from "../../icons";

/** 一个可切换的 App。 */
export type AfAppEntry = {
  /** 唯一标识。 */
  id: string;
  /** 展示名称。 */
  name: string;
  /** 图标（内置图标名或自定义节点，如 `<AfAppMark />`）。 */
  icon: AfIconSlot;
};

/** 一条通知。 */
export type AfNotice = {
  /** 唯一标识。 */
  id: string;
  /** 标题。 */
  title: string;
  /** 第二行说明。 */
  description?: string;
  /** 时间或来源。 */
  time?: string;
  /** 语义色。 */
  tone?: AfTone;
  /** 图标，默认按 tone 取。 */
  icon?: AfIconSlot;
  /** 是否未读。 */
  unread?: boolean;
};
