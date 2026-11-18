import { useCallback, useState, type CSSProperties, type HTMLAttributes, type ImgHTMLAttributes, type ReactNode } from "react";
import type { AfTone } from "./Tag";

export type AfAvatarSize = "sm" | "md" | "lg" | "xl" | 20 | 24 | 32 | 40 | number;
export type AfAvatarStatus = "online" | "live" | "busy" | "away" | "offline";

export interface AfAvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 姓名（用于提取首字母/单字与无障碍标签；省略时展示中性人形轮廓并设为 aria-hidden）。 */
  name?: string;
  /** 图片地址；加载成功后 180ms 柔和淡入，失败或未传时优雅回退至首字母或标识。 */
  src?: string;
  /** 显式覆盖无障碍描述标签。 */
  alt?: string;
  /** 尺寸档位：sm(20) / md(24) / lg(32) / xl(40) 或像素数值。 */
  size?: AfAvatarSize;
  /** 形状：人物默认 circle，Agent 默认 square。 */
  shape?: "circle" | "square";
  /** 显式语义色调；省略时按 seed ?? name 确定性映射 8 档柔和粉彩。 */
  tone?: AfTone;
  /** 右下角在线状态圆点。 */
  status?: AfAvatarStatus;
  /** 身份类型：person 人物 / agent 智能体（自动切换圆角方块与 3×3 对称像素徽记）。 */
  kind?: "person" | "agent";
  /** 兼容简写：true 渲染静态 Agent 像素矩阵，"working" 启用对角线波浪呼吸。 */
  agent?: boolean | "working";
  /** Agent 是否处于活跃思考/执行态（触发 1.2s 对角线呼吸波浪）。 */
  working?: boolean;
  /** 确定性配色与像素图案哈希种子（如稳定 ID 或邮箱，改名不改色）。 */
  seed?: string;
  /** 显式主题色（自动混合浅底色与前景色）。 */
  color?: string;
  /** 自定义回退节点。 */
  fallback?: ReactNode;
  /** 透传给底层 <img> 的附加属性。 */
  imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;
}

/** FNV-1a 32-bit 哈希：保障同名/同 seed 跨会话色相与像素矩阵稳定一致。 */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const seg =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function firstCluster(word: string): string {
  if (!seg) return [...word][0] ?? "";
  const iter = seg.segment(word)[Symbol.iterator]();
  const next = iter.next();
  return next.done ? "" : next.value.segment;
}

const SUFFIX_RE = /^(?:[ivx]+|jr\.?|sr\.?|\d+)$/i;

/** 提取最多 2 个字素簇：支持 Emoji 完整保留、忽略括号备注与世代后缀、中日韩取首字。 */
export function initialsOf(raw?: string): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[._-]+/g, " ")
    .trim();
  if (!cleaned) return "";

  const first = firstCluster(cleaned);
  if (/\p{Extended_Pictographic}/u.test(first)) return first;

  const words = cleaned.split(/\s+/).filter((w) => w && !SUFFIX_RE.test(w));
  if (words.length === 0) return first.toUpperCase();
  if (words.length === 1) return firstCluster(words[0]).toUpperCase();
  return (firstCluster(words[0]) + firstCluster(words[words.length - 1])).toUpperCase();
}

/** 生成 3×3 左右镜像对称的 Agent 像素阵列（至少点亮 6 格双列/点阵，杜绝 5 点十字伪像）。 */
function agentCells(key: string): boolean[] {
  const norm = (key || "").trim().toLowerCase();
  if (norm === "triage" || norm === "triage-agent" || norm === "support triage") {
    return [true, false, true, true, false, true, true, false, true];
  }
  let bits = hashSeed(`agent:${key || "default"}`);
  const half: boolean[] = [];
  for (let i = 0; i < 6; i += 1) {
    half.push((bits & 1) === 1);
    bits >>>= 1;
  }
  const grid = [
    half[0], half[1], half[0],
    half[2], half[3], half[2],
    half[4], half[5], half[4],
  ];
  // Avoid 5-dot '+' cross [false,true,false, true,true,true, false,true,false]; prefer crisp 6-dot 3x2 columns
  if (!grid[0] && grid[1] && !grid[2] && grid[3] && grid[4] && grid[5] && !grid[6] && grid[7] && !grid[8]) {
    return [true, false, true, true, false, true, true, false, true];
  }
  let lit = grid.filter(Boolean).length;
  const fallbackOrder = [0, 3, 6, 4, 1, 7];
  let idx = 0;
  while (lit < 6 && idx < fallbackOrder.length) {
    const pos = fallbackOrder[idx++];
    if (!grid[pos]) {
      grid[pos] = true;
      const mirror = pos % 3 === 0 ? pos + 2 : pos;
      if (mirror !== pos && !grid[mirror]) {
        grid[mirror] = true;
        lit += 1;
      }
      lit += 1;
    }
  }
  return grid;
}

/** 对角线 (row + col) 呼吸相位延迟（ms）。 */
const WAVE_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

function resolveSize(size: AfAvatarSize): { key: "sm" | "md" | "lg" | "xl"; px: number } {
  if (size === "sm" || size === 20) return { key: "sm", px: 20 };
  if (size === "md" || size === 24) return { key: "md", px: 24 };
  if (size === "lg" || size === 32) return { key: "lg", px: 32 };
  if (size === "xl" || size === 40) return { key: "xl", px: 40 };
  const px = typeof size === "number" && Number.isFinite(size) ? Math.max(16, size) : 24;
  const key = px <= 21 ? "sm" : px <= 28 ? "md" : px <= 36 ? "lg" : "xl";
  return { key, px };
}

function PersonOutline() {
  return (
    <svg className="af-avatar__glyph" width="60%" height="60%" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 13.4c.7-2.2 2.5-3.4 4.8-3.4s4.1 1.2 4.8 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 头像组件（对齐 affectUI Avatar）：
 * - 支持人物圆形头像（8 档确定性柔和色相、智能字素首字母、无名轮廓回退）与图片 180ms 柔和淡入；
 * - 支持 Agent 圆角方块头像（白底发丝描边 + Flexbox 3×3 对称像素标识 + 对角线呼吸波浪）；
 * - 支持右下角在线状态指示点与叠放头像组无缝裁切。
 */
export function AfAvatar({
  name,
  src,
  alt,
  size = "md",
  shape,
  tone,
  status,
  kind,
  agent = false,
  working = false,
  seed,
  color,
  fallback,
  imgProps,
  className,
  style,
  ...props
}: AfAvatarProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const isAgent = kind === "agent" || Boolean(agent);
  const isWorking = Boolean(working || agent === "working");
  const resolvedShape = shape ?? (isAgent ? "square" : "circle");
  const { key: sizeKey, px } = resolveSize(size);

  const seedKey = seed ?? name ?? "";
  const hue = !isAgent && !tone && !color && seedKey ? hashSeed(seedKey) % 8 : undefined;
  const initials = initialsOf(name);
  const showImage = Boolean(src && failedSrc !== src);
  const isImgReady = Boolean(src && loadedSrc === src);
  const label = alt ?? name;
  const normalizedStatus = status === "live" ? "online" : status;

  const handleImgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && src && el.complete && el.naturalWidth > 0 && loadedSrc !== src) {
        setLoadedSrc(src);
      }
    },
    [src, loadedSrc],
  );

  const customVars: Record<string, string> = {
    "--av-s": `${px}px`,
  };
  if (color) {
    customVars["--av-fg"] = color;
    customVars["--av-bg"] = `color-mix(in srgb, ${color} 14%, var(--af-surface))`;
  }

  return (
    <span
      className={["af-avatar", className].filter(Boolean).join(" ")}
      data-size={sizeKey}
      data-shape={resolvedShape}
      data-kind={isAgent ? "agent" : "person"}
      data-tone={tone || undefined}
      data-hue={hue !== undefined ? String(hue) : undefined}
      data-agent={isAgent ? (isWorking ? "working" : "true") : undefined}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={{ ...(customVars as CSSProperties), ...style }}
      {...props}
    >
      <span className="af-avatar__face">
        {isAgent ? (
          <span className="af-avatar__mark" data-working={isWorking || undefined} aria-hidden="true">
            {agentCells(seedKey).map((lit, idx) => (
              <i
                key={idx}
                data-on={lit || undefined}
                style={lit && isWorking ? ({ "--d": `${WAVE_DELAYS[idx]}ms` } as CSSProperties) : undefined}
              />
            ))}
          </span>
        ) : fallback ? (
          <span className="af-avatar__ini" aria-hidden="true">
            {fallback}
          </span>
        ) : initials ? (
          <span className="af-avatar__ini" aria-hidden="true">
            {initials}
          </span>
        ) : (
          <PersonOutline />
        )}
        {showImage ? (
          <img
            ref={handleImgRef}
            src={src}
            alt=""
            aria-hidden="true"
            className="af-avatar__img"
            data-ready={isImgReady || undefined}
            onLoad={() => setLoadedSrc(src!)}
            onError={() => setFailedSrc(src!)}
            {...imgProps}
          />
        ) : null}
      </span>
      {normalizedStatus ? <span className="af-avatar__status" data-status={normalizedStatus} aria-hidden="true" /> : null}
    </span>
  );
}
