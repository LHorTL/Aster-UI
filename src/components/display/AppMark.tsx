import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn } from "../../primitives";

export type AfAppMarkNumericSize = 20 | 28 | 36 | 48 | 64;
export type AfAppMarkSizeAlias = "xs" | "sm" | "md" | "lg" | "xl";
export type AfAppMarkSize = number | AfAppMarkSizeAlias;

export type AfAppMarkTone =
  | "neutral"
  | "accent"
  | "info"
  | "ok"
  | "warn"
  | "err"
  | "purple"
  | "warm";

export type AfAppMarkStatus =
  | "running"
  | "online"
  | "busy"
  | "offline"
  | "update"
  | "error";

export type AfAppMarkProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** 图标磁贴尺寸（支持像素档 `20 | 28 | 36 | 48 | 64` 或语义别名 `xs..xl`，默认 `36`）。 */
  size?: AfAppMarkSize;
  /** 应用或插件真实 PNG / SVG / WebP 图标地址；加载失败时自动平滑降级为 `icon` 或首字母徽标。 */
  src?: string;
  /** 无障碍文本；省略时回退至 `name`，均未提供时作为纯装饰节点隐藏。 */
  alt?: string;
  /** 应用/模型名称；用于在无图片与无图标时提取 1–2 字品牌首字母徽标。 */
  name?: string;
  /** 显式指定 1–2 字首字母缩写（优先于从 `name` 自动提取）。 */
  monogram?: string;
  /** 内置 `AfIcon` 图标名或自定义图标节点（当未提供 `src` 或图片加载失败时显示）。 */
  icon?: AfIconSlot;
  /** 品牌底色语义档位。 */
  tone?: AfAppMarkTone;
  /** 根据 `name` 哈希自动分配柔和品牌底色。 */
  autoTone?: boolean;
  /** 右下角运行/在线状态指示圆点。 */
  status?: AfAppMarkStatus;
  /** `status` 的同义属性。 */
  statusBadge?: AfAppMarkStatus;
  /** 右上角微型计数或角标节点。 */
  badge?: ReactNode;
  /** 右上角数值计数快捷属性（大于 99 自动折叠为 `"99+"`）。 */
  badgeCount?: number;
  /** 外轮廓圆角形态，默认 `"squircle"`。 */
  shape?: "squircle" | "rounded" | "circle";
  /** 图片裁剪模式，默认 `"cover"`。 */
  fit?: "cover" | "contain";
  /** 是否为图片保留内边距（适合透明底 SVG 品牌标志）。 */
  padded?: boolean;
  /** 图片加载失败回调。 */
  onImageError?: () => void;
};

const SIZE_MAP: Record<AfAppMarkSizeAlias, AfAppMarkNumericSize> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

const ICON_SCALE: Record<AfAppMarkNumericSize, number> = {
  20: 12,
  28: 15,
  36: 18,
  48: 22,
  64: 28,
};

const AUTO_TONES: AfAppMarkTone[] = ["accent", "purple", "ok", "warm", "info"];

const BUCKET_SIZES: readonly AfAppMarkNumericSize[] = [20, 28, 36, 48, 64];

function resolveNumericSize(size: AfAppMarkSize | undefined): { px: number; bucket: AfAppMarkNumericSize } {
  const raw =
    typeof size === "number" && Number.isFinite(size) && size > 0
      ? Math.round(size)
      : typeof size === "string" && size in SIZE_MAP
        ? SIZE_MAP[size]
        : 36;
  let nearest: AfAppMarkNumericSize = 36;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const b of BUCKET_SIZES) {
    const diff = Math.abs(b - raw);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = b;
    }
  }
  return { px: raw, bucket: nearest };
}

function pickAutoTone(seed: string | undefined): AfAppMarkTone {
  if (!seed) return "neutral";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AUTO_TONES[hash % AUTO_TONES.length] ?? "accent";
}

function extractMonogram(name: string | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";
  // 含中文/日韩字符时取首字；纯拉丁词组取前两个单词首字母大写
  const cjkMatch = trimmed.match(/[一-鿿぀-ヿ가-힯]/);
  if (cjkMatch) return cjkMatch[0]!;
  const words = trimmed.split(/[\s._/-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * 应用 / 插件 / 模型标准圆角图标磁贴（`AfAppMark`）：
 * - 支持 `20 / 28 / 36 / 48 / 64` 五档标准尺寸；
 * - 支持真实 PNG/SVG `src`、破图平滑降级、`AfIcon` 内置图标与品牌首字母底色回退；
 * - 统一采用整数 `1px` 内嵌发丝环（`inset 0 0 0 1px var(--af-ring)`），在浅色 `#f7f7f7` 与深色 `#0e0e0e` 画布上清晰闭合。
 */
export function AfAppMark({
  size = 36,
  src,
  alt,
  name,
  monogram,
  icon,
  tone,
  autoTone = false,
  status,
  statusBadge,
  badge,
  badgeCount,
  shape = "squircle",
  fit = "cover",
  padded = false,
  onImageError,
  className,
  style,
  ...rest
}: AfAppMarkProps = {}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { px, bucket } = resolveNumericSize(size);
  const iconPx = px === bucket ? ICON_SCALE[bucket] : Math.max(10, Math.round(px * 0.5));
  const resolvedStatus = status ?? statusBadge;
  const resolvedBadge: ReactNode =
    badge !== undefined
      ? badge
      : badgeCount !== undefined && badgeCount > 0
        ? badgeCount > 99
          ? "99+"
          : badgeCount
        : undefined;
  const resolvedTone: AfAppMarkTone = tone ?? (autoTone ? pickAutoTone(name ?? alt) : "neutral");
  const showImage = Boolean(src && failedSrc !== src);
  const initials = monogram?.trim().slice(0, 2) || extractMonogram(name ?? alt);
  const accessibleLabel = alt !== undefined ? alt : undefined;

  let fallbackContent: ReactNode;
  if (icon !== undefined && icon !== null && icon !== false) {
    fallbackContent = renderAfIconSlot(icon, iconPx, "af-app-mark__svg");
  } else if (initials) {
    fallbackContent = <span className="af-app-mark__monogram">{initials}</span>;
  } else {
    fallbackContent = <AfIcon name="sparkle" size={iconPx} className="af-app-mark__svg" />;
  }

  return (
    <span
      {...rest}
      className={cn("af-app-mark", className)}
      data-size={bucket}
      data-tone={resolvedTone}
      data-shape={shape}
      data-has-img={showImage ? "true" : undefined}
      data-padded={padded ? "true" : undefined}
      role={accessibleLabel ? "img" : rest.role}
      aria-label={accessibleLabel || rest["aria-label"]}
      aria-hidden={accessibleLabel || rest["aria-label"] ? undefined : (rest["aria-hidden"] ?? true)}
      style={
        {
          "--af-app-mark-size": `${px}px`,
          ...style,
        } as CSSProperties
      }
    >
      <span className="af-app-mark__surface">
        {showImage ? (
          <img
            className="af-app-mark__img"
            src={src}
            alt=""
            draggable={false}
            data-fit={fit}
            onError={() => {
              if (src) setFailedSrc(src);
              onImageError?.();
            }}
          />
        ) : (
          fallbackContent
        )}
      </span>
      {resolvedStatus ? <span className="af-app-mark__status" data-status={resolvedStatus} aria-hidden="true" /> : null}
      {resolvedBadge !== undefined && resolvedBadge !== null && resolvedBadge !== false ? (
        <span className="af-app-mark__badge">{resolvedBadge}</span>
      ) : null}
    </span>
  );
}

export { AfAppMark as AppMark };
