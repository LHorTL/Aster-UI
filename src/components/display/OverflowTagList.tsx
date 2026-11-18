import { useEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import type { AfIconName } from "../../icons";
import { cn, useOverflowCollapse } from "../../primitives";
import { AfPopover } from "../overlay/Popover";
import { AfTag, type AfTone } from "./Tag";

export type AfOverflowTagColor =
  | AfTone
  | "blue"
  | "emerald"
  | "violet"
  | "amber"
  | "cyan"
  | "rose";

export type AfOverflowTagVariant = "soft" | "ring" | "outline" | "solid";

export type AfOverflowTagItem = {
  /** 唯一键值（省略时按索引兜底）。 */
  id?: string;
  /** `id` 的兼容别名。 */
  key?: string;
  /** 标签显示内容。 */
  label: ReactNode;
  /** 标签语义色。 */
  tone?: AfTone;
  /** 标签色板别名（自动映射至 `AfTone`）。 */
  color?: AfOverflowTagColor;
  /** 标签外观变体。 */
  variant?: AfOverflowTagVariant;
  /** 标签前置图标。 */
  icon?: AfIconName;
  /** 是否显示前置圆点。 */
  dot?: boolean;
  /** 标签移除回调。 */
  onRemove?: () => void;
  /** 标签点击回调。 */
  onClick?: () => void;
};

export type AfOverflowTagListProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** 标签数据数组（支持纯字符串简写或完整配置对象）。 */
  items?: ReadonlyArray<AfOverflowTagItem | string>;
  /** 统一标签尺寸，默认 `"sm"`。 */
  size?: "xs" | "sm" | "md";
  /** 默认标签外观，默认 `"soft"`。 */
  variant?: AfOverflowTagVariant;
  /** 默认标签语义色，默认 `"neutral"`。 */
  tone?: AfTone;
  /** 标签水平间距（px），默认 `6`。 */
  gap?: number;
  /** 空间极窄时至少保留的可见标签数，默认 `0`。 */
  minVisible?: number;
  /** 显式最大可见标签数上限（与容器响应式折叠取较小值）。 */
  maxVisible?: number;
  /** 溢出 `+N` 徽标展开交互模式，默认 `"both"`（支持悬停预览与点击/键盘固定展开）。 */
  popoverTrigger?: "hover" | "click" | "both";
  /** 溢出浮层顶部标题。 */
  popoverTitle?: ReactNode;
  /** 自定义 `+N` 折叠徽标文案。 */
  renderOverflowLabel?: (overflowCount: number, hiddenItems: AfOverflowTagItem[]) => ReactNode;
  /** 禁用折叠，完整展示全部标签。 */
  disabled?: boolean;
};

const COLOR_TO_TONE: Record<AfOverflowTagColor, AfTone> = {
  neutral: "neutral",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  blue: "accent",
  emerald: "success",
  violet: "info",
  amber: "warning",
  cyan: "info",
  rose: "danger",
};

function resolveTagTone(item: AfOverflowTagItem, fallback: AfTone): AfTone {
  if (item.tone) return item.tone;
  if (item.color) return COLOR_TO_TONE[item.color] ?? fallback;
  return fallback;
}

function resolveTagVariant(v: AfOverflowTagVariant | undefined, fallback: AfOverflowTagVariant): "ring" | "soft" {
  const raw = v ?? fallback;
  return raw === "soft" ? "soft" : "ring";
}

function normalizeTagItem(raw: AfOverflowTagItem | string, idx: number): AfOverflowTagItem & { resolvedKey: string } {
  if (typeof raw === "string") {
    return {
      resolvedKey: `tag-${idx}-${raw}`,
      label: raw,
    };
  }
  return {
    ...raw,
    resolvedKey: raw.id ?? raw.key ?? `tag-${idx}`,
  };
}

/**
 * 响应式单行溢出折叠标签列表（`AfOverflowTagList`）：
 * - 基于 `useOverflowCollapse`（`ResizeObserver` + 宽度缓存）实时测量容器可用宽度；
 * - 超出部分自动收敛为等宽数字 `+N` 胶囊，悬停或点击弹出具备退场过渡的 `AfPopover` 展示完整隐藏标签。
 */
export function AfOverflowTagList({
  items = [],
  size = "sm",
  variant = "soft",
  tone = "neutral",
  gap = 6,
  minVisible = 0,
  maxVisible,
  popoverTrigger = "both",
  popoverTitle,
  renderOverflowLabel,
  disabled = false,
  className,
  style,
  ...rest
}: AfOverflowTagListProps = {}) {
  const normalized = useMemo(() => items.map(normalizeTagItem), [items]);
  const { containerRef, visibleCount: measuredVisible } = useOverflowCollapse({
    itemCount: normalized.length,
    gap,
    reservedWidth: size === "xs" ? 38 : 44,
    minVisible,
    disabled,
  });

  const effectiveVisible = disabled
    ? normalized.length
    : maxVisible !== undefined
      ? Math.min(measuredVisible, Math.max(minVisible, maxVisible))
      : measuredVisible;

  const visibleItems = normalized.slice(0, effectiveVisible);
  const hiddenItems = normalized.slice(effectiveVisible);
  const overflowCount = hiddenItems.length;

  const badgeRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinnedByClick, setPinnedByClick] = useState(false);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (overflowCount === 0 && open) {
      setOpen(false);
      setPinnedByClick(false);
    }
  }, [overflowCount, open]);

  const scheduleHoverClose = () => {
    if (pinnedByClick || typeof window === "undefined") return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };

  const allowHover = popoverTrigger === "hover" || popoverTrigger === "both";
  const allowClick = popoverTrigger === "click" || popoverTrigger === "both";

  return (
    <div
      {...rest}
      ref={containerRef}
      className={cn("af-overflow-tags", className)}
      data-size={size}
      data-collapsed={overflowCount > 0 ? "true" : undefined}
      style={
        {
          "--af-overflow-tags-gap": `${gap}px`,
          ...style,
        } as CSSProperties
      }
    >
      {visibleItems.map((item, idx) => (
        <span
          key={item.resolvedKey}
          className="af-overflow-tags__item"
          data-overflow-item
          data-overflow-index={idx}
        >
          <AfTag
            size={size === "xs" ? "sm" : size}
            tone={resolveTagTone(item, tone)}
            variant={resolveTagVariant(item.variant, variant)}
            icon={item.icon}
            dot={item.dot}
            closable={Boolean(item.onRemove)}
            onClose={item.onRemove ? () => item.onRemove?.() : undefined}
            onClick={item.onClick}
          >
            {item.label}
          </AfTag>
        </span>
      ))}

      {overflowCount > 0 ? (
        <button
          ref={badgeRef}
          type="button"
          className="af-overflow-tags__more"
          data-overflow-indicator
          data-size={size}
          data-open={open ? "true" : undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`还有 ${overflowCount} 个标签`}
          onPointerEnter={() => {
            if (!allowHover) return;
            clearCloseTimer();
            setOpen(true);
          }}
          onPointerLeave={() => {
            if (!allowHover) return;
            scheduleHoverClose();
          }}
          onClick={() => {
            if (!allowClick) return;
            clearCloseTimer();
            setOpen((prev) => {
              const next = !prev || !pinnedByClick;
              setPinnedByClick(next);
              return next;
            });
          }}
        >
          {renderOverflowLabel ? renderOverflowLabel(overflowCount, hiddenItems) : `+${overflowCount}`}
        </button>
      ) : null}

      <AfPopover
        open={open && overflowCount > 0}
        anchorRef={badgeRef}
        side="bottom"
        align="start"
        gap={6}
        animateExit
        preserveNaturalWidth
        focusOnOpen={pinnedByClick}
        title={popoverTitle}
        label="隐藏标签列表"
        className="af-overflow-tags__pop"
        onPointerDownOutside={() => {
          setPinnedByClick(false);
          setOpen(false);
        }}
        onEscapeKeyDown={() => {
          setPinnedByClick(false);
          setOpen(false);
        }}
      >
        <div
          className="af-overflow-tags__pop-list"
          onPointerEnter={() => {
            if (allowHover) clearCloseTimer();
          }}
          onPointerLeave={() => {
            if (allowHover) scheduleHoverClose();
          }}
        >
          {hiddenItems.map((item) => (
            <AfTag
              key={item.resolvedKey}
              size={size === "xs" ? "sm" : size}
              tone={resolveTagTone(item, tone)}
              variant={resolveTagVariant(item.variant, variant)}
              icon={item.icon}
              dot={item.dot}
              closable={Boolean(item.onRemove)}
              onClose={item.onRemove ? () => item.onRemove?.() : undefined}
              onClick={item.onClick}
            >
              {item.label}
            </AfTag>
          ))}
        </div>
      </AfPopover>
    </div>
  );
}

export { AfOverflowTagList as OverflowTagList };
