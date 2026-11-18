import {
  createElement,
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { cn, prefersReducedMotion, useIsomorphicLayoutEffect } from "./cn";

/** 订阅系统 `prefers-reduced-motion: reduce` 偏好的 React Hook。 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** 元素首次进入视口时触发一次，挂载时已在视口内则立即触发。 */
export function useInViewOnce<T extends Element>(threshold: number) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** 仅向屏幕阅读器暴露隐藏文本（兼容动效组件无障碍播报）。 */
export function AfSrOnly({ children, live }: { children: ReactNode; live?: boolean }) {
  return createElement("span", { className: "af-mo-sr", "aria-live": live ? "polite" : undefined }, children);
}

/**
 * 字段“从正确变错误”时触发一次短促水平微抖（400ms 内不重复抖），受 reduced-motion 保护。
 */
export function useFieldShake(bad: boolean): boolean {
  const [shake, setShake] = useState(false);
  const wasBad = useRef(bad);
  useEffect(() => {
    if (bad && !wasBad.current && !prefersReducedMotion()) {
      setShake(true);
      const id = window.setTimeout(() => setShake(false), 400);
      wasBad.current = bad;
      return () => window.clearTimeout(id);
    }
    wasBad.current = bad;
  }, [bad]);
  return shake;
}

/**
 * 内容宽度形变：签名变化时把元素宽度从旧值平滑动画到新值（480ms ease-out）。
 * 按钮换标签 / 换图标、日期范围换文案都复用它，保证滑动时长与曲线一致。
 */
export function useWidthMorph(ref: RefObject<HTMLElement | null>, signature: string, duration = 480) {
  const lastWidth = useRef(0);
  const lastSignature = useRef(signature);
  const animRef = useRef<Animation | null>(null);

  useEffect(
    () => () => {
      animRef.current?.cancel();
      animRef.current = null;
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const wasAnimating = animRef.current !== null;
    const inFlightWidth = wasAnimating ? el.offsetWidth : 0;
    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }
    const targetWidth = el.offsetWidth;
    const from = wasAnimating && inFlightWidth > 0 ? inFlightWidth : lastWidth.current;
    const changed = lastSignature.current !== signature;
    lastWidth.current = targetWidth;
    lastSignature.current = signature;
    if (!changed || !from || Math.abs(from - targetWidth) < 0.5 || prefersReducedMotion()) return;
    const anim = el.animate([{ width: `${from}px` }, { width: `${targetWidth}px` }], {
      duration,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    });
    animRef.current = anim;
    const clear = () => {
      if (animRef.current === anim) animRef.current = null;
    };
    anim.onfinish = clear;
    anim.oncancel = clear;
  }, [ref, signature, duration]);
}

export type MenuHighlightThumb = {
  y: number;
  x: number;
  height: number;
  width: number;
};

/**
 * 计算容器内节点相对于容器内容坐标系的包围盒：
 * 自动补偿弹出层 scale 缩放、中间定位父级嵌套及列表滚动偏移，
 * 供 `useMenuHighlight`、`useKeyedHighlight` 与全局 `installAfListHover` 共享。
 */
export function measureRelativeBox(list: HTMLElement, row: HTMLElement): MenuHighlightThumb {
  const listRect = list.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const scaleX = list.offsetWidth > 0 ? listRect.width / list.offsetWidth : 1;
  const scaleY = list.offsetHeight > 0 ? listRect.height / list.offsetHeight : 1;
  const sx = scaleX > 0 ? scaleX : 1;
  const sy = scaleY > 0 ? scaleY : 1;
  return {
    x: (rowRect.left - listRect.left) / sx + list.scrollLeft - list.clientLeft,
    y: (rowRect.top - listRect.top) / sy + list.scrollTop - list.clientTop,
    width: row.offsetWidth || rowRect.width / sx,
    height: row.offsetHeight || rowRect.height / sy,
  };
}

/**
 * affectUI 招牌的 90ms 浮动菜单高亮块测量原语：
 * 根据容器内 `[data-menu-index="${activeIndex}"]` 节点的位置实时返回浮动底块几何尺寸，
 * 供 Select、Menu、ContextMenu、CommandPalette、Combobox、ModelPicker 等下拉浮层共享丝滑跟随效果。
 */
export function useMenuHighlight(
  listRef: RefObject<HTMLElement | null>,
  activeIndex: number,
  open = true,
  depsKey: unknown = null,
): MenuHighlightThumb | null {
  const [thumb, setThumb] = useState<MenuHighlightThumb | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!open || activeIndex < 0) {
      setThumb(null);
      return;
    }
    const measure = () => {
      const list = listRef.current;
      if (!list) {
        setThumb(null);
        return;
      }
      const row =
        list.querySelector<HTMLElement>(`[data-menu-index="${activeIndex}"]`) ??
        list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
      if (!row) {
        setThumb(null);
        return;
      }
      const next = measureRelativeBox(list, row);
      setThumb((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.25 &&
        Math.abs(prev.y - next.y) < 0.25 &&
        Math.abs(prev.width - next.width) < 0.25 &&
        Math.abs(prev.height - next.height) < 0.25
          ? prev
          : next,
      );
    };
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [listRef, activeIndex, open, depsKey]);

  return thumb;
}

/**
 * 按字符串键测量浮动底块的 React Hook：
 * 适用于 Cascader 分栏等按 option value / key 标识当前聚焦项的多列列表。
 */
export function useKeyedHighlight(
  listRef: RefObject<HTMLElement | null>,
  activeKey: string | null,
  open = true,
  depsKey: unknown = null,
  attr = "data-item-key",
): MenuHighlightThumb | null {
  const [thumb, setThumb] = useState<MenuHighlightThumb | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!open || activeKey == null) {
      setThumb(null);
      return;
    }
    const measure = () => {
      const list = listRef.current;
      if (!list) {
        setThumb(null);
        return;
      }
      const escapedKey = activeKey.replace(/["\\]/g, "\\$&");
      const row = list.querySelector<HTMLElement>(`[${attr}="${escapedKey}"]`);
      if (!row) {
        setThumb(null);
        return;
      }
      const next = measureRelativeBox(list, row);
      setThumb((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.25 &&
        Math.abs(prev.y - next.y) < 0.25 &&
        Math.abs(prev.width - next.width) < 0.25 &&
        Math.abs(prev.height - next.height) < 0.25
          ? prev
          : next,
      );
    };
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [listRef, activeKey, open, depsKey, attr]);

  return thumb;
}

type HoverListTone = "hover" | "wash";

type HoverListRule = {
  listSelector: string;
  itemSelector: string;
  tone: HoverListTone;
  radius?: string;
};

const AF_HOVER_LIST_RULES: HoverListRule[] = [
  {
    listSelector: "[data-af-hover-list]",
    itemSelector:
      "[data-af-hover-item], [data-af-hover-list] > button, [data-af-hover-list] > a, [data-af-hover-list] > [role='option'], [data-af-hover-list] > [role='menuitem'], [data-af-hover-list] > li",
    tone: "hover",
  },
  { listSelector: ".af-timepicker__col", itemSelector: ".af-timepicker__cell", tone: "hover" },
  { listSelector: ".af-timepicker__intervals", itemSelector: ".af-timepicker__cell", tone: "hover" },
  { listSelector: ".af-range__presets", itemSelector: ".af-range__preset", tone: "hover" },
  { listSelector: ".af-tree", itemSelector: ".af-tree__row", tone: "hover" },
  { listSelector: ".af-radio-group[data-orientation='vertical']", itemSelector: ".af-radio", tone: "wash" },
  {
    listSelector: ".af-table-wrap:has(> .af-table[data-hoverable])",
    itemSelector: ".af-table__body > .af-table__row:not(.af-table__empty-row):not(.af-table__spacer-row)",
    tone: "wash",
    radius: "0px",
  },
  { listSelector: ".af-bd__rows", itemSelector: ".af-bd__row", tone: "wash" },
  { listSelector: ".af-in-filter__groups", itemSelector: ".af-in-filter__group-head, .af-in-filter__option", tone: "wash" },
  { listSelector: ".af-in-prompt__list", itemSelector: ".af-in-prompt__row", tone: "hover" },
  { listSelector: ".af-in-billing__catalog", itemSelector: ".af-in-billing__catalog-item", tone: "hover" },
  { listSelector: ".af-in-profile__items", itemSelector: ".af-in-profile__item", tone: "hover" },
  { listSelector: ".af-in-inter__list", itemSelector: ".af-in-inter__row", tone: "hover" },
  { listSelector: ".af-ch-comments__sortmenu", itemSelector: ".af-ch-menuitem", tone: "hover" },
  { listSelector: ".af-ch-composer__attachmenu", itemSelector: ".af-ch-menuitem", tone: "hover" },
  { listSelector: ".af-ch-model__settings", itemSelector: ".af-ch-model__toggle", tone: "wash" },
  { listSelector: ".af-notice-pop__list", itemSelector: ".af-notice-pop__item", tone: "wash" },
  { listSelector: ".af-frame-nav", itemSelector: ".af-frame-nav__item", tone: "wash" },
  { listSelector: ".af-gal__nav", itemSelector: ".af-gal__item", tone: "wash" },
  { listSelector: ".af-dt-dtc__scroll", itemSelector: ".af-dt-dtc__table > tbody > tr", tone: "wash", radius: "0px" },
  { listSelector: ".af-dt-bcc__menu", itemSelector: ".af-dt-bcc__option", tone: "wash" },
  { listSelector: ".af-dt-bcc__tbody", itemSelector: ".af-dt-bcc__row", tone: "wash" },
  { listSelector: ".af-dt-pcc__tasks", itemSelector: ".af-dt-pcc__task", tone: "wash" },
  { listSelector: ".af-dt-cs__list", itemSelector: ".af-dt-cs__row", tone: "wash", radius: "0px" },
  { listSelector: ".af-dt-sr__menu", itemSelector: ".af-dt-sr__option", tone: "wash" },
  { listSelector: ".af-dt-setup__tasks", itemSelector: ".af-dt-setup__task", tone: "wash" },
  { listSelector: ".af-dt-mail__menu", itemSelector: "button", tone: "wash" },
  { listSelector: ".af-aga-plan__list", itemSelector: ".af-aga-plan__step", tone: "wash" },
  { listSelector: ".af-aga-queue__jobs", itemSelector: ".af-aga-queue__job", tone: "wash" },
  { listSelector: ".af-aga-steering__steps", itemSelector: ".af-aga-steering__step", tone: "wash" },
  { listSelector: ".af-aga-dial__rows", itemSelector: ".af-aga-dial__row", tone: "wash" },
  { listSelector: ".af-agb-trace__rows", itemSelector: ".af-agb-trace__row", tone: "wash" },
  { listSelector: ".af-agb-mem__list", itemSelector: ".af-agb-mem__row", tone: "wash" },
  { listSelector: ".af-agd-wf__rows", itemSelector: ".af-agd-wf__row", tone: "wash", radius: "0px" },
  { listSelector: ".af-pj-sessions__list", itemSelector: ".af-pj-session__row", tone: "wash", radius: "0px" },
];

const COMBINED_LIST_SELECTOR = AF_HOVER_LIST_RULES.map((rule) => rule.listSelector).join(", ");
const installedHoverRoots = /* @__PURE__ */ new WeakMap<Node, { count: number; cleanup: () => void }>();

function isHoverRowDisabled(row: HTMLElement): boolean {
  const dataDisabled = row.getAttribute("data-disabled");
  return (
    row.matches(":disabled, [disabled], [aria-disabled='true']") ||
    (dataDisabled !== null && dataDisabled !== "false") ||
    Boolean(row.closest(".af-tree__item[data-disabled]"))
  );
}

/**
 * 全局委托式列表滑动悬停底块驱动器：
 * 为库内全部纵向列表、菜单、树、表格行与导航栏提供统一的 GPU 滑动背景底块（无需修改各组件 JSX），
 * 对同一个 `document` / 容器采用引用计数安装与安全卸载。
 */
export function installAfListHover(root?: Document | HTMLElement): () => void {
  const targetRoot: Document | HTMLElement | null = root ?? (typeof document !== "undefined" ? document : null);
  if (!targetRoot) {
    return () => {};
  }

  const release = () => {
    const entry = installedHoverRoots.get(targetRoot);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count <= 0) {
      installedHoverRoots.delete(targetRoot);
      entry.cleanup();
    }
  };

  const existing = installedHoverRoots.get(targetRoot);
  if (existing) {
    existing.count += 1;
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      release();
    };
  }

  const activeState = new WeakMap<HTMLElement, HTMLElement>();
  const activeSizes = new WeakMap<HTMLElement, { lw: number; lh: number; rw: number; rh: number }>();
  const activeLists = new Set<HTMLElement>();
  let lastPointerX = Number.NaN;
  let lastPointerY = Number.NaN;
  let lastMoveTarget: EventTarget | null = null;

  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          for (const list of Array.from(activeLists)) {
            const row = activeState.get(list);
            if (!list.isConnected || !row || !row.isConnected) {
              clearList(list);
              continue;
            }
            const lw = list.clientWidth;
            const lh = list.clientHeight;
            const rw = row.offsetWidth;
            const rh = row.offsetHeight;
            const prevSize = activeSizes.get(list);
            if (prevSize && prevSize.lw === lw && prevSize.lh === lh && prevSize.rw === rw && prevSize.rh === rh) {
              continue;
            }
            activeSizes.set(list, { lw, lh, rw, rh });
            const box = measureRelativeBox(list, row);
            list.style.setProperty("--af-ht-x", `${box.x}px`);
            list.style.setProperty("--af-ht-y", `${box.y}px`);
            list.style.setProperty("--af-ht-w", `${box.width}px`);
            list.style.setProperty("--af-ht-h", `${box.height}px`);
            list.setAttribute("data-af-ht", "snap");
          }
        })
      : null;

  const clearList = (list: HTMLElement) => {
    if (!activeState.has(list) && !list.hasAttribute("data-af-ht")) return;
    const prevRow = activeState.get(list);
    if (prevRow) resizeObserver?.unobserve(prevRow);
    resizeObserver?.unobserve(list);
    activeState.delete(list);
    activeSizes.delete(list);
    activeLists.delete(list);
    list.removeAttribute("data-af-ht");
    list.removeAttribute("data-af-ht-tone");
    list.removeAttribute("data-af-ht-danger");
  };

  const clearOtherLists = (keepList: HTMLElement | null) => {
    for (const activeList of Array.from(activeLists)) {
      if (activeList !== keepList || !activeList.isConnected) {
        clearList(activeList);
      }
    }
  };

  const matchRule = (list: HTMLElement): HoverListRule | undefined => {
    for (const rule of AF_HOVER_LIST_RULES) {
      try {
        if (list.matches(rule.listSelector)) return rule;
      } catch {
        // 忽略旧环境不支持的选择器（如 :has）
      }
    }
    return undefined;
  };

  const applyHoverAtTarget = (target: EventTarget | null) => {
    const el = target instanceof Element ? target : null;
    if (!el) {
      clearOtherLists(null);
      return;
    }

    let list: HTMLElement | null = null;
    try {
      list = el.closest(COMBINED_LIST_SELECTOR) as HTMLElement | null;
    } catch {
      for (const rule of AF_HOVER_LIST_RULES) {
        try {
          const hit = el.closest(rule.listSelector) as HTMLElement | null;
          if (hit) {
            list = hit;
            break;
          }
        } catch {
          // 跳过不支持的选择器
        }
      }
    }

    clearOtherLists(list);
    if (!list) return;

    const rule = matchRule(list);
    if (!rule) return;

    let row: HTMLElement | null = null;
    try {
      row = el.closest(rule.itemSelector) as HTMLElement | null;
    } catch {
      row = null;
    }

    if (row && (!list.contains(row) || row.closest(COMBINED_LIST_SELECTOR) !== list)) {
      row = null;
    }

    if (!row) {
      // 指针滑过行间 1px-4px gap 时保持当前高亮，避免频繁 enter/exit 闪烁
      return;
    }

    if (isHoverRowDisabled(row)) {
      clearList(list);
      return;
    }

    const box = measureRelativeBox(list, row);
    const tone: HoverListTone =
      list.hasAttribute("data-af-hover-list")
        ? list.getAttribute("data-af-hover-list") === "wash"
          ? "wash"
          : "hover"
        : rule.tone;
    const radius = rule.radius ?? (typeof getComputedStyle === "function" ? getComputedStyle(row).borderTopLeftRadius : "") ?? "6px";

    list.style.setProperty("--af-ht-x", `${box.x}px`);
    list.style.setProperty("--af-ht-y", `${box.y}px`);
    list.style.setProperty("--af-ht-w", `${box.width}px`);
    list.style.setProperty("--af-ht-h", `${box.height}px`);
    list.style.setProperty("--af-ht-r", radius || "6px");

    if (tone === "wash") list.setAttribute("data-af-ht-tone", "wash");
    else list.removeAttribute("data-af-ht-tone");

    if (row.hasAttribute("data-danger")) list.setAttribute("data-af-ht-danger", "true");
    else list.removeAttribute("data-af-ht-danger");

    const prevRow = activeState.get(list);
    if (!prevRow) {
      list.setAttribute("data-af-ht", "enter");
      resizeObserver?.observe(list);
      resizeObserver?.observe(row);
    } else if (prevRow !== row) {
      resizeObserver?.unobserve(prevRow);
      resizeObserver?.observe(row);
      list.setAttribute("data-af-ht", "glide");
    }

    activeSizes.set(list, {
      lw: list.clientWidth,
      lh: list.clientHeight,
      rw: row.offsetWidth,
      rh: row.offsetHeight,
    });
    activeState.set(list, row);
    activeLists.add(list);
  };

  const onPointerOver = (event: Event) => {
    const pe = event as PointerEvent;
    if (Number.isFinite(pe.clientX) && Number.isFinite(pe.clientY)) {
      lastPointerX = pe.clientX;
      lastPointerY = pe.clientY;
    }
    lastMoveTarget = event.target;
    applyHoverAtTarget(event.target);
  };

  const onPointerMove = (event: Event) => {
    const pe = event as PointerEvent;
    if (Number.isFinite(pe.clientX) && Number.isFinite(pe.clientY)) {
      lastPointerX = pe.clientX;
      lastPointerY = pe.clientY;
    }
    if (event.target === lastMoveTarget) return;
    lastMoveTarget = event.target;
    applyHoverAtTarget(event.target);
  };

  const onPointerOut = (event: Event) => {
    const pe = event as PointerEvent;
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    let list: HTMLElement | null = null;
    try {
      list = el.closest(COMBINED_LIST_SELECTOR) as HTMLElement | null;
    } catch {
      list = null;
    }
    if (!list) return;
    const related = pe.relatedTarget instanceof Node ? pe.relatedTarget : null;
    if (!related || !list.contains(related)) {
      lastMoveTarget = null;
      clearList(list);
    }
  };

  const onFocusIn = (event: Event) => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    const afRoot = el.closest(".af");
    if (afRoot && afRoot.getAttribute("data-modality") !== "keyboard") return;
    applyHoverAtTarget(el);
  };

  const onFocusOut = (event: Event) => {
    const fe = event as FocusEvent;
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    let list: HTMLElement | null = null;
    try {
      list = el.closest(COMBINED_LIST_SELECTOR) as HTMLElement | null;
    } catch {
      list = null;
    }
    if (!list) return;
    const related = fe.relatedTarget instanceof Node ? fe.relatedTarget : null;
    if (!related || !list.contains(related)) {
      clearList(list);
    }
  };

  const onScroll = () => {
    if (!activeLists.size || typeof document === "undefined") return;
    lastMoveTarget = null;
    if (!Number.isFinite(lastPointerX) || !Number.isFinite(lastPointerY)) {
      clearOtherLists(null);
      return;
    }
    const underPointer = document.elementFromPoint(lastPointerX, lastPointerY);
    applyHoverAtTarget(underPointer);
  };

  targetRoot.addEventListener("pointerover", onPointerOver, true);
  targetRoot.addEventListener("pointermove", onPointerMove, true);
  targetRoot.addEventListener("pointerout", onPointerOut, true);
  targetRoot.addEventListener("focusin", onFocusIn, true);
  targetRoot.addEventListener("focusout", onFocusOut, true);
  targetRoot.addEventListener("scroll", onScroll, true);

  const cleanup = () => {
    clearOtherLists(null);
    resizeObserver?.disconnect();
    targetRoot.removeEventListener("pointerover", onPointerOver, true);
    targetRoot.removeEventListener("pointermove", onPointerMove, true);
    targetRoot.removeEventListener("pointerout", onPointerOut, true);
    targetRoot.removeEventListener("focusin", onFocusIn, true);
    targetRoot.removeEventListener("focusout", onFocusOut, true);
    targetRoot.removeEventListener("scroll", onScroll, true);
  };

  installedHoverRoots.set(targetRoot, { count: 1, cleanup });

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    release();
  };
}

export type AfHoverListProps = HTMLAttributes<HTMLElement> & {
  /** 滑动底块浓度：`hover` 用于浮层/紧凑菜单，`wash` 用于面板/页面内常规列表。 */
  tone?: "hover" | "wash";
  /** 语义标签。 */
  as?: "div" | "ul" | "nav";
  children?: ReactNode;
};

/**
 * 声明式列表滑动悬停底块容器：
 * 业务方只需将列表项包裹在 `<AfHoverList>` 内（子元素或带 `data-af-hover-item`），
 * 即可自动获得 100ms GPU 滑动悬停底块与无障碍键盘跟随，无需逐项编写 hover 样式。
 */
export const AfHoverList = forwardRef<HTMLElement, AfHoverListProps>(function AfHoverList(
  { tone = "hover", as = "div", className, style, children, ...rest },
  ref,
) {
  useEffect(() => installAfListHover(), []);
  return createElement(
    as,
    {
      ...rest,
      ref,
      className: cn("af-hover-list", className),
      style,
      "data-af-hover-list": tone,
    },
    children,
  );
});

export type SlidingIndicatorRect = {
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
};

/**
 * 水平页签 / 分段控件的滑动指示器测量原语：
 * 初次挂载直接落位不闪跳，后续切换与容器宽度缩放通过 CSS 弹簧曲线平滑过渡。
 */
export function useSlidingTabIndicator(
  barRef: RefObject<HTMLElement | null>,
  activeSelector: string,
  activeKey: string,
): SlidingIndicatorRect | null {
  const [rect, setRect] = useState<SlidingIndicatorRect | null>(null);
  const mountedKey = useRef(false);
  const lastSizeRef = useRef<{ bw: number; bh: number; iw: number; ih: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    let resizeFrame = 0;
    const update = (animate: boolean, fromResize = false) => {
      const bar = barRef.current;
      const item = bar?.querySelector<HTMLElement>(activeSelector);
      if (!bar || !item) {
        setRect(null);
        return;
      }
      const bw = bar.clientWidth;
      const bh = bar.clientHeight;
      const iw = item.offsetWidth;
      const ih = item.offsetHeight;
      if (
        fromResize &&
        lastSizeRef.current &&
        lastSizeRef.current.bw === bw &&
        lastSizeRef.current.bh === bh &&
        lastSizeRef.current.iw === iw &&
        lastSizeRef.current.ih === ih
      ) {
        return;
      }
      lastSizeRef.current = { bw, bh, iw, ih };
      const next: SlidingIndicatorRect = {
        x: item.offsetLeft,
        y: item.offsetTop,
        left: item.offsetLeft,
        top: item.offsetTop,
        width: iw,
        height: ih,
        ready: animate,
      };
      setRect((prev) =>
        prev &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.ready === next.ready
          ? prev
          : next,
      );
      if (fromResize && mountedKey.current) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          setRect((prev) => (prev && !prev.ready ? { ...prev, ready: true } : prev));
        });
      }
    };

    update(mountedKey.current, false);
    const frame = requestAnimationFrame(() => {
      mountedKey.current = true;
      update(true, false);
    });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update(false, true)) : null;
    if (observer && barRef.current) observer.observe(barRef.current);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
    };
  }, [barRef, activeSelector, activeKey]);

  return rect;
}
