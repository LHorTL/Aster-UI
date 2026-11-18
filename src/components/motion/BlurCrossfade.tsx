import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn, useReducedMotion } from "../../primitives";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface AfBlurCrossfadeProps extends Omit<HTMLAttributes<HTMLElement>, "id"> {
  /** 当前内容的唯一标识键；变化时触发交叉模糊与尺寸平滑过渡。 */
  id?: string | number;
  /** 兼容旧版属性名（等同于 `id`）。 */
  swapKey?: string | number;
  /** 过渡时长（毫秒，默认 420）。 */
  duration?: number;
  /** 模糊半径（像素，默认 10）。 */
  blur?: number;
  /** 尺寸形变模式：`"height"` 仅高度平滑过渡，`"both"` 宽高同步平滑过渡（适合行内按钮文案切换），`"none"` 不锁定尺寸。 */
  morph?: "height" | "both" | "none";
  /** 容器标签（默认 `"div"`，行内场景传 `"span"`）。 */
  as?: "div" | "span";
  /** 当前渲染内容。 */
  children?: ReactNode;
}

/**
 * Blur Crossfade：旧内容轻微放大并模糊淡出，新内容从 98% 缩放与模糊中清晰浮现；
 * 容器按 `morph` 平滑过渡高度或宽高，快速连点时最多只保留一份离场副本。
 */
export function AfBlurCrossfade(props: AfBlurCrossfadeProps = {}) {
  const {
    id,
    swapKey,
    duration = 420,
    blur = 10,
    morph = "height",
    as = "div",
    children,
    className,
    style,
    ...rest
  } = props;

  const activeKey = id ?? swapKey ?? "default";
  const reduced = useReducedMotion();

  const rootRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);
  const pendingFromRef = useRef<{ width: number; height: number } | null>(null);
  const sizeTimerRef = useRef<number | null>(null);

  const [state, setState] = useState<{
    current: { key: string | number; node: ReactNode };
    leaving: { key: string | number; node: ReactNode } | null;
    swapped: boolean;
  }>({
    current: { key: activeKey, node: children },
    leaving: null,
    swapped: false,
  });
  const [busy, setBusy] = useState(false);

  if (activeKey !== state.current.key) {
    const liveRoot = rootRef.current;
    const liveContent = contentRef.current;
    const measuredFrom = liveRoot
      ? { width: liveRoot.offsetWidth, height: liveRoot.offsetHeight }
      : liveContent
        ? { width: liveContent.offsetWidth, height: liveContent.offsetHeight }
        : prevSizeRef.current;
    pendingFromRef.current = measuredFrom;
    setState({
      current: { key: activeKey, node: children },
      leaving: state.current,
      swapped: true,
    });
  } else if (state.current.node !== children) {
    setState((prev) => ({
      ...prev,
      current: { key: activeKey, node: children },
    }));
  }

  useIsomorphicLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    prevSizeRef.current = { width: content.offsetWidth, height: content.offsetHeight };
  });

  useEffect(
    () => () => {
      if (sizeTimerRef.current !== null) window.clearTimeout(sizeTimerRef.current);
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const fromSize = pendingFromRef.current;
    pendingFromRef.current = null;

    if (!state.swapped || !root || !content || !fromSize) return;

    if (sizeTimerRef.current !== null) {
      window.clearTimeout(sizeTimerRef.current);
      sizeTimerRef.current = null;
    }

    if (reduced || morph === "none") {
      root.style.height = "";
      root.style.width = "";
      setBusy(false);
      return;
    }

    const toWidth = content.offsetWidth;
    const toHeight = content.offsetHeight;

    setBusy(true);
    root.style.transition = "none";
    root.style.height = `${fromSize.height}px`;
    if (morph === "both") {
      root.style.width = `${fromSize.width}px`;
    }
    // Force layout flush so CSS transitions cleanly from old natural size to new natural size
    void root.offsetHeight;
    root.style.transition = "";
    root.style.height = `${toHeight}px`;
    if (morph === "both") {
      root.style.width = `${toWidth}px`;
    }

    sizeTimerRef.current = window.setTimeout(() => {
      sizeTimerRef.current = null;
      if (rootRef.current) {
        rootRef.current.style.height = "";
        rootRef.current.style.width = "";
      }
      setBusy(false);
    }, duration + 36);
  }, [state.current.key, state.swapped, reduced, morph, duration]);

  useEffect(() => {
    if (!state.leaving) return;
    const timerId = window.setTimeout(
      () => setState((prev) => ({ ...prev, leaving: null })),
      reduced ? 0 : duration + 20,
    );
    return () => window.clearTimeout(timerId);
  }, [state.leaving, reduced, duration]);

  const inlineStyle: CSSProperties = {
    "--af-mo-cf-dur": `${duration}ms`,
    "--af-mo-cf-blur": `${blur}px`,
    ...style,
  } as CSSProperties;

  const InnerTag = as === "span" ? "span" : "div";

  return createElement(
    as,
    {
      ...rest,
      ref: rootRef,
      className: cn("af-mo-cf__box", as === "span" && "af-mo-cf__box--inline", className),
      "data-swapped": state.swapped ? "" : undefined,
      "data-busy": busy ? "" : undefined,
      "data-morph": morph,
      style: inlineStyle,
    },
    state.leaving
      ? createElement(
          InnerTag,
          {
            key: `ghost-${state.leaving.key}`,
            className: "af-mo-cf__ghost",
            "aria-hidden": true,
            inert: "" as unknown as boolean,
          },
          state.leaving.node,
        )
      : null,
    createElement(
      InnerTag,
      {
        className: "af-mo-cf__current",
        ref: contentRef,
        key: state.current.key,
      },
      state.current.node,
    ),
  );
}
