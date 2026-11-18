import { useState, type RefObject } from "react";
import { useIsomorphicLayoutEffect } from "./cn";
import { useAfLayerContainer } from "./layer";

/** 锚点矩形（已换算到浮层挂载点的布局坐标）。 */
export type AfAnchorRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

/** 浮层展开方向。 */
export type AfPopoverSide = "bottom" | "top" | "left" | "right";

/** 浮层相对锚点的计算结果。 */
export type AfPopoverPlacement = {
  /** 相对挂载点的左上角坐标。 */
  left: number;
  top: number;
  /** 最小宽度，默认与锚点同宽。 */
  minWidth: number;
  /** 容器放不下时的内联最大宽度。 */
  maxWidth: number;
  /** 容器放不下时的内联最大高度（px），内容超出时在浮层内部滚动。 */
  maxHeight: number;
  /** 实际展开方向。 */
  side: AfPopoverSide;
  /** 贴合触发器角落的缩放原点。 */
  origin: string;
};

/**
 * 计算贴锚点浮层的摆放位置（纯函数）：
 * 1. 默认按 preferredSide（默认 bottom）展开；空间不足且对侧更大时自动翻转；
 * 2. 上下或左右都不够时选空间大的一侧，并给出 maxHeight / maxWidth 让内容在浮层内部滚动；
 * 3. 正交轴按 align 对齐后夹在容器 margin 内；
 * 4. 输出贴合触发器角落的 transformOrigin，确保入场缩放从触发器自然展开。
 */
export function computePopoverPlacement(input: {
  anchor: Omit<AfAnchorRect, "height"> & { height?: number };
  layer: { width: number; height: number };
  popWidth: number;
  popHeight: number;
  align?: "start" | "center" | "end";
  preferredSide?: AfPopoverSide;
  gap?: number;
  margin?: number;
  matchWidth?: boolean;
  preserveNaturalWidth?: boolean;
}): AfPopoverPlacement {
  const gap = input.gap ?? 6;
  const margin = input.margin ?? 8;
  const layerWidth = input.layer.width > 0 ? input.layer.width : (typeof window !== "undefined" ? window.innerWidth : 1024) || 1024;
  const layerHeight = input.layer.height > 0 ? input.layer.height : (typeof window !== "undefined" ? window.innerHeight : 768) || 768;
  const maxWidth = Math.max(80, layerWidth - margin * 2);
  const maxLayerHeight = Math.max(80, layerHeight - margin * 2);

  const prefer = input.preferredSide ?? "bottom";
  const align = input.align ?? "start";
  const measuredH = Math.max(input.popHeight, 1);
  const measuredW = Math.max(input.popWidth, 1);

  if (prefer === "left" || prefer === "right") {
    const rightSpace = Math.max(0, layerWidth - input.anchor.right - gap - margin);
    const leftSpace = Math.max(0, input.anchor.left - gap - margin);
    let side: "left" | "right";
    if (prefer === "left") {
      if (measuredW <= leftSpace) side = "left";
      else if (measuredW <= rightSpace) side = "right";
      else side = leftSpace >= rightSpace ? "left" : "right";
    } else {
      if (measuredW <= rightSpace) side = "right";
      else if (measuredW <= leftSpace) side = "left";
      else side = rightSpace >= leftSpace ? "right" : "left";
    }

    const availW = Math.max(80, Math.min(side === "right" ? (rightSpace || maxWidth) : (leftSpace || maxWidth), maxWidth));
    const width = Math.min(measuredW, availW);
    const rawLeft = side === "right" ? input.anchor.right + gap : input.anchor.left - gap - width;
    const left = Math.min(Math.max(rawLeft, margin), Math.max(margin, layerWidth - width - margin));

    const anchorH = input.anchor.height ?? Math.max(0, input.anchor.bottom - input.anchor.top);
    const height = Math.min(measuredH, maxLayerHeight);
    const rawTop =
      align === "end"
        ? input.anchor.bottom - height
        : align === "center"
          ? input.anchor.top + (anchorH - height) / 2
          : input.anchor.top;
    const top = Math.min(Math.max(rawTop, margin), Math.max(margin, layerHeight - height - margin));

    const vOrigin = align === "end" ? "bottom" : align === "center" ? "center" : "top";
    const hOrigin = side === "right" ? "left" : "right";

    return {
      left,
      top,
      minWidth: 0,
      maxWidth: availW,
      maxHeight: maxLayerHeight,
      side,
      origin: `${vOrigin} ${hOrigin}`,
    };
  }

  const width = input.matchWidth
    ? Math.min(input.anchor.width, maxWidth)
    : input.preserveNaturalWidth
      ? Math.min(measuredW, maxWidth)
      : Math.min(Math.max(input.popWidth, input.anchor.width), maxWidth);
  const minWidth = input.matchWidth
    ? width
    : input.preserveNaturalWidth
      ? 0
      : Math.min(input.anchor.width, maxWidth);

  const below = Math.max(0, layerHeight - input.anchor.bottom - gap - margin);
  const above = Math.max(0, input.anchor.top - gap - margin);

  let side: "bottom" | "top";
  if (prefer === "top") {
    if (measuredH <= above) side = "top";
    else if (measuredH <= below) side = "bottom";
    else side = above >= below ? "top" : "bottom";
  } else {
    if (measuredH <= below) side = "bottom";
    else if (measuredH <= above) side = "top";
    else side = below >= above ? "bottom" : "top";
  }

  const space = Math.max(80, Math.min(side === "bottom" ? (below || maxLayerHeight) : (above || maxLayerHeight), maxLayerHeight));
  const height = Math.min(measuredH, space);
  const rawTop = side === "bottom" ? input.anchor.bottom + gap : input.anchor.top - gap - height;
  const top = Math.min(Math.max(rawTop, margin), Math.max(margin, layerHeight - height - margin));

  const rawLeft =
    align === "end"
      ? input.anchor.right - width
      : align === "center"
        ? input.anchor.left + (input.anchor.width - width) / 2
        : input.anchor.left;
  const left = Math.min(Math.max(rawLeft, margin), Math.max(margin, layerWidth - width - margin));

  const vOrigin = side === "bottom" ? "top" : "bottom";
  const hOrigin = align === "end" ? "right" : align === "center" ? "center" : "left";

  return {
    left,
    top,
    minWidth,
    maxWidth,
    maxHeight: space,
    side,
    origin: `${vOrigin} ${hOrigin}`,
  };
}

/** 把元素矩形换算成挂载点的布局坐标，兼容容器 CSS zoom 缩放与无布局测试环境。 */
export function layoutRectOf(rect: DOMRect, layer: HTMLElement, layerRect: DOMRect): AfAnchorRect {
  const zoomX = layer.offsetWidth > 0 && layerRect.width > 0 ? layerRect.width / layer.offsetWidth : 1;
  const zoomY = layer.offsetHeight > 0 && layerRect.height > 0 ? layerRect.height / layer.offsetHeight : 1;
  return {
    left: (rect.left - layerRect.left) / zoomX,
    right: (rect.right - layerRect.left) / zoomX,
    top: (rect.top - layerRect.top) / zoomY,
    bottom: (rect.bottom - layerRect.top) / zoomY,
    width: rect.width / zoomX,
    height: rect.height / zoomY,
  };
}

export type UseAnchoredPopoverOptions = {
  align?: "start" | "center" | "end";
  preferredSide?: AfPopoverSide;
  gap?: number;
  margin?: number;
  matchWidth?: boolean;
  preserveNaturalWidth?: boolean;
  container?: HTMLElement | null;
};

/**
 * 计算浮层位置并持续跟随锚点：窗口缩放、祖先滚动、锚点或浮层尺寸变化都会重新定位。
 * 自动接入统一的 AfLayer / Theme 浮层容器，无需业务方手动包裹 Provider。
 */
export function useAnchoredPopover(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popRef: RefObject<HTMLElement | null>,
  alignOrOptions: "start" | "end" | UseAnchoredPopoverOptions = "start",
  matchWidthLegacy = false,
) {
  const options: UseAnchoredPopoverOptions =
    typeof alignOrOptions === "string"
      ? { align: alignOrOptions, matchWidth: matchWidthLegacy }
      : alignOrOptions;

  const layer = useAfLayerContainer(options.container);
  const [place, setPlace] = useState<AfPopoverPlacement | null>(null);
  const [ready, setReady] = useState(false);

  const {
    align = "start",
    preferredSide = "bottom",
    gap = 6,
    margin = 8,
    matchWidth = false,
    preserveNaturalWidth = false,
  } = options;

  useIsomorphicLayoutEffect(() => {
    if (!open || !layer) {
      setPlace(null);
      setReady(false);
      return;
    }
    let frame = 0;
    const update = () => {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor || !pop) return;
      const layerRect = layer.getBoundingClientRect();
      const layerWidth = layer.offsetWidth || (typeof window !== "undefined" ? window.innerWidth : 1024);
      const layerHeight = layer.offsetHeight || (typeof window !== "undefined" ? window.innerHeight : 768);
      const next = computePopoverPlacement({
        anchor: layoutRectOf(anchor.getBoundingClientRect(), layer, layerRect),
        layer: { width: layerWidth, height: layerHeight },
        popWidth: pop.offsetWidth,
        popHeight: pop.offsetHeight,
        align,
        preferredSide,
        gap,
        margin,
        matchWidth,
        preserveNaturalWidth,
      });
      setPlace((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.side === next.side &&
        prev.minWidth === next.minWidth &&
        prev.maxWidth === next.maxWidth &&
        prev.maxHeight === next.maxHeight &&
        prev.origin === next.origin
          ? prev
          : next,
      );
      setReady(true);
    };
    update();
    frame = requestAnimationFrame(update);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (observer) {
      if (popRef.current) observer.observe(popRef.current);
      if (anchorRef.current) observer.observe(anchorRef.current);
    }
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [open, layer, anchorRef, popRef, align, preferredSide, gap, margin, matchWidth, preserveNaturalWidth]);

  return { layer, place, ready };
}

/**
 * 将视口客户端坐标 `(clientX, clientY)` 换算并夹紧到当前浮层宿主容器内（供右键菜单 ContextMenu 等使用）。
 */
export function clampPointToLayer(
  clientX: number,
  clientY: number,
  popWidth: number,
  popHeight: number,
  layer: HTMLElement,
  margin = 8,
): { left: number; top: number; origin: string } {
  const layerRect = layer.getBoundingClientRect();
  const zoomX = layer.offsetWidth > 0 && layerRect.width > 0 ? layerRect.width / layer.offsetWidth : 1;
  const zoomY = layer.offsetHeight > 0 && layerRect.height > 0 ? layerRect.height / layer.offsetHeight : 1;
  const layerW = layer.offsetWidth || (typeof window !== "undefined" ? window.innerWidth : 1024);
  const layerH = layer.offsetHeight || (typeof window !== "undefined" ? window.innerHeight : 768);
  const localX = (clientX - layerRect.left) / zoomX;
  const localY = (clientY - layerRect.top) / zoomY;
  const flipX = localX + popWidth > layerW - margin && localX - popWidth >= margin;
  const flipY = localY + popHeight > layerH - margin && localY - popHeight >= margin;
  const rawLeft = flipX ? localX - popWidth : localX;
  const rawTop = flipY ? localY - popHeight : localY;
  return {
    left: Math.max(margin, Math.min(rawLeft, Math.max(margin, layerW - popWidth - margin))),
    top: Math.max(margin, Math.min(rawTop, Math.max(margin, layerH - popHeight - margin))),
    origin: `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`,
  };
}
