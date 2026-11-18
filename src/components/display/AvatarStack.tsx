import { Children, cloneElement, isValidElement, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import type { AfTone } from "./Tag";
import { AfAvatar, type AfAvatarProps, type AfAvatarSize } from "./Avatar";

export interface AfAvatarStackItem {
  key?: string;
  name?: string;
  src?: string;
  tone?: AfTone;
  kind?: "person" | "agent";
  agent?: boolean | "working";
  working?: boolean;
  seed?: string;
  color?: string;
}

export interface AfAvatarStackProps extends HTMLAttributes<HTMLDivElement> {
  /** 结构化成员列表。 */
  items?: AfAvatarStackItem[];
  /** 简写字符串列表（向后兼容）。 */
  names?: string[];
  /** 直接传入一组 <AfAvatar /> 子节点（对齐 affectUI AvatarGroup 用法）。 */
  children?: ReactNode;
  /** 最多展示几个头像，超出部分折叠为 +N（超过 99 显示 99+）。 */
  max?: number;
  /** 显式总人数（服务端仅返回前几名成员时用于计算 +N）。 */
  total?: number;
  /** 统一尺寸档位。 */
  size?: AfAvatarSize;
}

function resolveStackSize(size: AfAvatarSize): { key: "sm" | "md" | "lg" | "xl"; px: number } {
  if (size === "sm" || size === 20) return { key: "sm", px: 20 };
  if (size === "md" || size === 24) return { key: "md", px: 24 };
  if (size === "lg" || size === 32) return { key: "lg", px: 32 };
  if (size === "xl" || size === 40) return { key: "xl", px: 40 };
  const px = typeof size === "number" && Number.isFinite(size) ? Math.max(16, size) : 24;
  const key = px <= 21 ? "sm" : px <= 28 ? "md" : px <= 36 ? "lg" : "xl";
  return { key, px };
}

/**
 * 叠放头像组（对齐 affectUI AvatarGroup）：
 * - 支持 items 结构化数组、names 简写或直接包裹 <AfAvatar /> children；
 * - 25% 柔和叠放间距与 2px 表面切口描边，超出 max 显示等宽 +N 计数（>99 显示 99+）。
 */
export function AfAvatarStack({
  items,
  names,
  children,
  max = 4,
  total,
  size = "sm",
  className,
  style,
  ...props
}: AfAvatarStackProps) {
  const { key: sizeKey, px } = resolveStackSize(size);
  const childElements = Children.toArray(children).filter(isValidElement) as ReactElement<AfAvatarProps>[];

  const useChildren = childElements.length > 0;
  const resolvedItems: AfAvatarStackItem[] = useChildren
    ? []
    : items ?? (names ?? []).map((name) => ({ name }));

  const count = useChildren ? childElements.length : resolvedItems.length;
  const safeMax = Math.max(1, max);
  const shownCount = Math.min(count, safeMax);
  const extra = Math.max(0, (total ?? count) - shownCount);
  const moreLabel = extra > 99 ? "99+" : `+${extra}`;

  return (
    <div
      className={["af-avatar-stack", className].filter(Boolean).join(" ")}
      role="group"
      data-size={sizeKey}
      style={{ ...({ "--av-s": `${px}px` } as CSSProperties), ...style }}
      {...props}
    >
      {useChildren
        ? childElements.slice(0, shownCount).map((el, idx) =>
            cloneElement(el, {
              key: el.key ?? idx,
              size: el.props.size ?? size,
            }),
          )
        : resolvedItems.slice(0, shownCount).map((person, index) => (
            <AfAvatar
              key={person.key ?? `${person.name ?? "member"}-${index}`}
              name={person.name}
              src={person.src}
              tone={person.tone}
              kind={person.kind}
              agent={person.agent}
              working={person.working}
              seed={person.seed}
              color={person.color}
              size={size}
            />
          ))}
      {extra > 0 ? (
        <span
          className="af-avatar af-avatar-stack__more"
          data-size={sizeKey}
          data-shape="circle"
          aria-label={`${extra} more`}
          style={{ "--av-s": `${px}px` } as CSSProperties}
        >
          <span>{moreLabel}</span>
        </span>
      ) : null}
    </div>
  );
}

export const AfAvatarGroup = AfAvatarStack;
export type AfAvatarGroupProps = AfAvatarStackProps;
