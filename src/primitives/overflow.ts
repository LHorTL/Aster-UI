import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useIsomorphicLayoutEffect } from "./cn";

export type UseOverflowCollapseOptions = {
  /** 待展示的总条目数量。 */
  itemCount: number;
  /** 子项水平间距（px）；省略时自动读取容器 `column-gap`（回退 `6`）。 */
  gap?: number;
  /** 折叠触发时为尾部 `+N` 徽标预留的宽度（px），默认 `52`（若挂载了 `[data-overflow-indicator]` 则优先读取其实测宽度）。 */
  reservedWidth?: number;
  /** 即使空间极窄时也至少保留的可见项数，默认 `0`。 */
  minVisible?: number;
  /** 参与宽度测量的子项选择器，默认 `"[data-overflow-item]"`。 */
  itemSelector?: string;
  /** 溢出指示器选择器，默认 `"[data-overflow-indicator]"`。 */
  indicatorSelector?: string;
  /** 禁用折叠计算，始终完整展示全部条目。 */
  disabled?: boolean;
};

export type OverflowCollapseResult = {
  /** 绑定至水平弹性容器的 Ref。 */
  containerRef: RefObject<HTMLDivElement>;
  /** 当前可完整容纳的子项数量。 */
  visibleCount: number;
  /** 溢出被折叠的子项数量（等于 `itemCount - visibleCount`）。 */
  overflowCount: number;
  /** 是否发生了溢出折叠（`overflowCount > 0`）。 */
  isCollapsed: boolean;
  /** 手动触发一次同步重测。 */
  remeasure: () => void;
};

/**
 * 水平工具栏 / 面包屑 / 标签组响应式防闪烁溢出折叠原语：
 * - 基于 `useIsomorphicLayoutEffect` + `ResizeObserver` 同步累加 `[data-overflow-item]` 宽度，首帧绘制前即完成裁切，零闪烁；
 * - 内置历史子项宽度缓存：即使溢出项已从 DOM 卸载为 `+N` 徽标，容器重新拉宽时仍能按精确缓存宽度逐项平滑恢复。
 */
export function useOverflowCollapse(options: UseOverflowCollapseOptions): OverflowCollapseResult {
  const {
    itemCount,
    gap: explicitGap,
    reservedWidth = 52,
    minVisible = 0,
    itemSelector = "[data-overflow-item]",
    indicatorSelector = "[data-overflow-indicator]",
    disabled = false,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const cachedWidthsRef = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(itemCount);

  const remeasure = useCallback(() => {
    if (disabled || itemCount <= 0) {
      setVisibleCount((prev) => (prev === itemCount ? prev : itemCount));
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth || Math.floor(container.getBoundingClientRect().width);
    if (containerWidth <= 0) {
      // Hidden or unlaid-out container (e.g. SSR / JSDOM without layout): keep all visible.
      return;
    }

    let resolvedGap = explicitGap;
    if (resolvedGap === undefined && typeof window !== "undefined") {
      const cs = window.getComputedStyle(container);
      const parsed = Number.parseFloat(cs.columnGap || cs.gap || "6");
      resolvedGap = Number.isFinite(parsed) ? parsed : 6;
    }
    const gapPx = resolvedGap ?? 6;

    const mountedItems = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    if (cachedWidthsRef.current.length > itemCount) {
      cachedWidthsRef.current.length = itemCount;
    }
    mountedItems.forEach((el, idx) => {
      const explicitIdxAttr = el.getAttribute("data-overflow-index");
      const slotIdx = explicitIdxAttr !== null ? Number.parseInt(explicitIdxAttr, 10) : idx;
      if (!Number.isFinite(slotIdx) || slotIdx < 0 || slotIdx >= itemCount) return;
      const w = Math.ceil(el.getBoundingClientRect().width || el.offsetWidth);
      if (w > 0) {
        cachedWidthsRef.current[slotIdx] = w;
      }
    });

    const fallbackWidth =
      cachedWidthsRef.current.find((w) => w > 0) ?? 64;
    const widths: number[] = [];
    for (let i = 0; i < itemCount; i += 1) {
      widths.push(cachedWidthsRef.current[i] ?? fallbackWidth);
    }

    // 1. Check whether all items fit without needing an overflow badge.
    const fullWidth =
      widths.reduce((sum, w) => sum + w, 0) + Math.max(0, itemCount - 1) * gapPx;
    if (fullWidth <= containerWidth + 0.5) {
      setVisibleCount((prev) => (prev === itemCount ? prev : itemCount));
      return;
    }

    // 2. Reserve badge width and greedily fit from left to right.
    const indicatorEl = container.querySelector<HTMLElement>(indicatorSelector);
    const measuredBadge = indicatorEl
      ? Math.ceil(indicatorEl.getBoundingClientRect().width || indicatorEl.offsetWidth)
      : 0;
    const badgeWidth = measuredBadge > 0 ? measuredBadge : reservedWidth;
    const budget = Math.max(0, containerWidth - badgeWidth - gapPx);

    let used = 0;
    let fit = 0;
    for (let i = 0; i < itemCount; i += 1) {
      const needed = (fit > 0 ? gapPx : 0) + widths[i]!;
      if (used + needed <= budget + 0.5) {
        used += needed;
        fit += 1;
      } else {
        break;
      }
    }

    const clampedMin = Math.min(Math.max(0, minVisible), itemCount);
    const nextVisible = Math.min(Math.max(clampedMin, fit), Math.max(clampedMin, itemCount - 1));
    setVisibleCount((prev) => (prev === nextVisible ? prev : nextVisible));
  }, [disabled, explicitGap, indicatorSelector, itemCount, itemSelector, minVisible, reservedWidth]);

  useIsomorphicLayoutEffect(() => {
    remeasure();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      remeasure();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [disabled, remeasure]);

  const effectiveVisible = disabled ? itemCount : Math.min(visibleCount, itemCount);
  const overflowCount = Math.max(0, itemCount - effectiveVisible);

  return {
    containerRef,
    visibleCount: effectiveVisible,
    overflowCount,
    isCollapsed: overflowCount > 0,
    remeasure,
  };
}
