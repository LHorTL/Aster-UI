import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn, composeRefs, useControllableState } from "../../primitives";

/** 分页属性（对齐 affectUI Pagination 与 Aster 契约）。 */
export type AfPaginationProps = Omit<ComponentPropsWithoutRef<"nav">, "onChange" | "defaultValue"> & {
  /** 受控当前页（从 1 开始）。 */
  page?: number;
  /** 非受控初始页（从 1 开始），默认 1。 */
  defaultPage?: number;
  /** 总页数；若提供 `total` 与 `pageSize` 可自动推导。 */
  totalPages?: number;
  /** 总页数别名（affectUI `pageCount`）。 */
  pageCount?: number;
  /** 数据总条数（可选；传入后左侧自动显示实时条目区间 `1–25 of 1,284`）。 */
  total?: number;
  /** 是否显示总条数摘要，或自定义渲染函数；传 `false` 可隐藏左侧区间文本。 */
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode);
  /** 受控每页条数。 */
  pageSize?: number;
  /** 非受控初始每页条数，默认 10。 */
  defaultPageSize?: number;
  /** 可选每页条数档位（传入后显示每页行数切换器）。 */
  pageSizeOptions?: readonly number[];
  /** 可选每页条数档位别名（affectUI `pageSizes`）。 */
  pageSizes?: readonly number[];
  /** 每页条数切换回调。 */
  onPageSizeChange?: (pageSize: number) => void;
  /** 翻页回调。 */
  onChange?: (page: number) => void;
  /** 翻页回调别名（affectUI `onPageChange`）。 */
  onPageChange?: (page: number) => void;
  /** 当前页两侧各显示几个页码，默认 1。 */
  siblingCount?: number;
  /** 当前页两侧页码数别名（affectUI `siblings`）。 */
  siblings?: number;
  /** 紧凑模式：隐藏数字槽，仅保留页码摘要与前后翻页箭头。 */
  compact?: boolean;
  /** 是否整体禁用。 */
  disabled?: boolean;
};

type PageSlot = number | "dots-l" | "dots-r";

/**
 * 恒定槽位页码序列：当总页数大于 `2 * sib + 5` 时始终输出固定 `2 * sib + 5` 个槽位，
 * 确保翻页过程中左右箭头绝不发生水平位移抖动。
 */
function buildFixedSlots(page: number, count: number, sib: number): PageSlot[] {
  const totalSlots = 2 * sib + 5;
  if (count <= totalSlots) {
    return Array.from({ length: count }, (_, idx) => idx + 1);
  }
  const leftSib = Math.max(page - sib, 2);
  const rightSib = Math.min(page + sib, count - 1);
  const showLeftDots = leftSib > 3;
  const showRightDots = rightSib < count - 2;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + 2 * sib;
    const out: PageSlot[] = [];
    for (let i = 1; i <= leftCount; i += 1) out.push(i);
    out.push("dots-r", count);
    return out;
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + 2 * sib;
    const out: PageSlot[] = [1, "dots-l"];
    for (let i = count - rightCount + 1; i <= count; i += 1) out.push(i);
    return out;
  }

  const out: PageSlot[] = [1, "dots-l"];
  for (let i = leftSib; i <= rightSib; i += 1) out.push(i);
  out.push("dots-r", count);
  return out;
}

function ChevronSvg({ dir }: { dir: "left" | "right" | "down" }) {
  const d =
    dir === "left"
      ? "M9.5 3.5 5.5 8l4 4.5"
      : dir === "right"
        ? "M6.5 3.5 10.5 8l-4 4.5"
        : "M4.25 6.25 8 10l3.75-3.75";
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 分页器（对齐 affectUI Pagination）：
 * - 左侧可选每页行数选择器（切换每页条数时自动保留当前首条可见记录位置）+ `aria-live="polite"` 实时区间摘要；
 * - 右侧恒定槽位页码表（等宽数字、中性选中柔灰底、边界按钮 `aria-disabled` 不丢焦点、焦点跟随槽位更新、窄屏自动折叠）。
 */
export const AfPagination = forwardRef<HTMLElement, AfPaginationProps>(function AfPagination(
  {
    page: pageProp,
    defaultPage = 1,
    totalPages,
    pageCount,
    total,
    showTotal,
    pageSize: pageSizeProp,
    defaultPageSize = 10,
    pageSizeOptions,
    pageSizes,
    onPageSizeChange,
    onChange,
    onPageChange,
    siblingCount,
    siblings,
    compact = false,
    disabled = false,
    className,
    "aria-label": ariaLabel = "Pagination",
    ...rest
  },
  forwardedRef,
) {
  const navRef = useRef<HTMLElement | null>(null);
  const resolvedSizes = pageSizes ?? pageSizeOptions;
  const resolvedSiblings = Math.max(0, siblings ?? siblingCount ?? 1);

  const [currentPageSize, setCurrentPageSize] = useControllableState<number>({
    value: pageSizeProp,
    defaultValue: resolvedSizes?.[0] ?? defaultPageSize,
    onChange: onPageSizeChange,
  });

  const explicitCount = pageCount ?? totalPages;
  const derivedTotalPages =
    explicitCount ?? (total !== undefined ? Math.max(1, Math.ceil(total / Math.max(1, currentPageSize))) : 1);
  const safeTotal = Math.max(1, derivedTotalPages);

  const [rawPage, setPage] = useControllableState<number>({
    value: pageProp,
    defaultValue: defaultPage,
    onChange: (next) => {
      onChange?.(next);
      onPageChange?.(next);
    },
  });

  const current = Math.min(Math.max(rawPage, 1), safeTotal);
  const [narrowCompact, setNarrowCompact] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      if (width > 0) {
        setNarrowCompact((prev) => (prev ? width < 440 : width < 400));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isCompact = compact || narrowCompact;
  const rangeStart = total === undefined || total <= 0 ? 0 : (current - 1) * currentPageSize + 1;
  const rangeEnd = total === undefined || total <= 0 ? 0 : Math.min(total, current * currentPageSize);

  let rangeNode: ReactNode = null;
  if (showTotal === false) {
    rangeNode = null;
  } else if (typeof showTotal === "function" && total !== undefined) {
    rangeNode = showTotal(total, [rangeStart, rangeEnd]);
  } else if (showTotal === true && total !== undefined) {
    rangeNode =
      total > 0
        ? `${rangeStart.toLocaleString("en-US")}–${rangeEnd.toLocaleString("en-US")} · 共 ${total} 条`
        : `共 ${total} 条`;
  } else if (total !== undefined) {
    rangeNode =
      total > 0
        ? `${rangeStart.toLocaleString("en-US")}–${rangeEnd.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`
        : "0 of 0";
  } else if (isCompact) {
    rangeNode = `Page ${current} of ${safeTotal}`;
  }

  const hasSizes = Boolean(resolvedSizes && resolvedSizes.length > 0);
  const showInfo = hasSizes || rangeNode !== null;
  const atStart = disabled || current <= 1;
  const atEnd = disabled || current >= safeTotal;
  const slots = isCompact ? [] : buildFixedSlots(current, safeTotal, resolvedSiblings);
  const digitCount = Math.max(1, String(safeTotal).length);

  const goToPage = (target: number, keepPageButtonFocus = false) => {
    if (disabled) return;
    const clamped = Math.min(Math.max(1, target), safeTotal);
    if (clamped === current) return;
    setPage(clamped);
    if (keepPageButtonFocus && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const nextBtn = navRef.current?.querySelector<HTMLButtonElement>(`button[data-page="${clamped}"]`);
        nextBtn?.focus({ preventScroll: true });
      });
    }
  };

  return (
    <nav
      ref={composeRefs(navRef, forwardedRef)}
      className={cn("af-pagination", className)}
      data-disabled={disabled || undefined}
      data-compact={isCompact || undefined}
      data-sole={!showInfo || undefined}
      aria-label={ariaLabel}
      {...rest}
    >
      {showInfo ? (
        <div className="af-pagination__info">
          {hasSizes && resolvedSizes ? (
            <label className="af-pagination__size">
              <span className="af-pagination__size-label">Rows per page</span>
              <span className="af-pagination__select-wrap">
                <select
                  className="af-pagination__select"
                  aria-label="Rows per page"
                  value={currentPageSize}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextSize = Number(event.target.value);
                    if (!Number.isFinite(nextSize) || nextSize <= 0) return;
                    const firstRowIndex = (current - 1) * currentPageSize;
                    setCurrentPageSize(nextSize);
                    const nextMaxPage =
                      explicitCount ??
                      (total !== undefined ? Math.max(1, Math.ceil(total / nextSize)) : safeTotal);
                    const mappedPage = Math.min(nextMaxPage, Math.max(1, Math.floor(firstRowIndex / nextSize) + 1));
                    if (mappedPage !== current) {
                      setPage(mappedPage);
                    }
                  }}
                >
                  {resolvedSizes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="af-pagination__select-chevron" aria-hidden="true">
                  <ChevronSvg dir="down" />
                </span>
              </span>
            </label>
          ) : null}
          {rangeNode !== null ? (
            <span className="af-pagination__range af-pagination__total" role="status" aria-live="polite">
              {rangeNode}
            </span>
          ) : null}
        </div>
      ) : null}

      <ul
        className="af-pagination__pages"
        style={{ "--af-pg-digits": digitCount } as CSSProperties}
      >
        <li className="af-pagination__slot">
          <button
            type="button"
            className="af-pagination__page af-pagination__arrow"
            aria-label="Previous page"
            disabled={disabled || undefined}
            aria-disabled={atStart || undefined}
            onClick={() => {
              if (!atStart) goToPage(current - 1);
            }}
          >
            <ChevronSvg dir="left" />
          </button>
        </li>

        {slots.map((slot) =>
          slot === "dots-l" || slot === "dots-r" ? (
            <li key={slot} className="af-pagination__slot" aria-hidden="true">
              <span className="af-pagination__gap">…</span>
            </li>
          ) : (
            <li key={`p-${slot}`} className="af-pagination__slot">
              <button
                type="button"
                data-page={slot}
                className="af-pagination__page"
                data-current={slot === current || undefined}
                aria-current={slot === current ? "page" : undefined}
                aria-label={`Page ${slot}`}
                disabled={disabled || undefined}
                onClick={(event) => {
                  const keyboardTriggered = event.detail === 0;
                  goToPage(slot, keyboardTriggered || document.activeElement === event.currentTarget);
                }}
              >
                {slot}
              </button>
            </li>
          ),
        )}

        <li className="af-pagination__slot">
          <button
            type="button"
            className="af-pagination__page af-pagination__arrow"
            aria-label="Next page"
            disabled={disabled || undefined}
            aria-disabled={atEnd || undefined}
            onClick={() => {
              if (!atEnd) goToPage(current + 1);
            }}
          >
            <ChevronSvg dir="right" />
          </button>
        </li>
      </ul>
    </nav>
  );
});
