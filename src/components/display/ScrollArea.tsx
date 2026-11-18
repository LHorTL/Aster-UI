import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { cn, composeRefs } from "../../primitives";

/** 滚动方向。 */
export type AfScrollAreaOrientation = "vertical" | "horizontal" | "both";

/** 滚动条显示时机策略（对齐 affectUI ScrollArea `type`）。 */
export type AfScrollAreaType = "hover" | "scroll" | "always";

/** 滚动区域属性。 */
export type AfScrollAreaProps = ComponentPropsWithoutRef<"div"> & {
  /** 最大高度（数字按 px 处理）。 */
  maxHeight?: number | string;
  /** 固定高度（数字按 px 处理）。 */
  height?: number | string;
  /** 最大宽度（数字按 px 处理）。 */
  maxWidth?: number | string;
  /** 允许滚动的轴向，默认 `"vertical"`。 */
  orientation?: AfScrollAreaOrientation;
  /** 叠加滚动条显现策略：悬停时淡入 / 仅滚动时显现 / 常驻可见（默认 `"hover"`）。 */
  type?: AfScrollAreaType;
  /** 是否启用边缘柔和渐隐遮罩（与 `fadeEdges` 互为别名，默认 `true`）。 */
  fade?: boolean;
  /** 是否在存在可滚动溢出内容时启用边缘柔和渐隐遮罩，默认 `true`。 */
  fadeEdges?: boolean;
  /** 边缘渐隐带宽（px），默认 24。 */
  fadeSize?: number;
  /** 滚动条样式策略：自定义纤细浮层轨道 / 隐藏 / 系统原生默认。 */
  scrollbar?: "thin" | "hidden" | "auto";
  /** 获取内部真实滚动视口节点。 */
  viewportRef?: Ref<HTMLDivElement>;
};

function toCssDimension(val: number | string | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === "number" ? `${val}px` : val;
}

type ScrollMetrics = {
  canScrollY: boolean;
  canScrollX: boolean;
  yThumbSize: number;
  yThumbOffset: number;
  xThumbSize: number;
  xThumbOffset: number;
  fadeTop: number;
  fadeBottom: number;
  fadeLeft: number;
  fadeRight: number;
};

const EMPTY_METRICS: ScrollMetrics = {
  canScrollY: false,
  canScrollX: false,
  yThumbSize: 0,
  yThumbOffset: 0,
  xThumbSize: 0,
  xThumbOffset: 0,
  fadeTop: 0,
  fadeBottom: 0,
  fadeLeft: 0,
  fadeRight: 0,
};

/**
 * 细腻滚动容器（对齐 affectUI ScrollArea）：
 * - 纤细跨平台悬浮胶囊滚动条（5px 静置，悬停轨道增宽至 7px，悬停/滚动 140ms 淡入、静置 800ms 后 280ms 淡出）；
 * - 支持拇指指针捕获拖拽与轨道点击平滑翻页；
 * - 基于 CSS `mask-image` 的比例连续软边缘渐隐（随滚动距离从 0px 平滑过渡到 `fadeSize`，绝不生硬跳变，不遮挡任意底色）。
 */
export const AfScrollArea = forwardRef<HTMLDivElement, AfScrollAreaProps>(function AfScrollArea(
  {
    maxHeight,
    height,
    maxWidth,
    orientation = "vertical",
    type = "hover",
    fade,
    fadeEdges,
    fadeSize = 24,
    scrollbar = "thin",
    viewportRef: externalViewportRef,
    className,
    style,
    onScroll,
    onPointerEnter,
    onPointerLeave,
    children,
    ...rest
  },
  forwardedRef,
) {
  const innerViewportRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY_METRICS);
  const [scrolling, setScrolling] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draggingAxis, setDraggingAxis] = useState<"y" | "x" | null>(null);

  const useEdgeFade = fade ?? fadeEdges ?? true;
  const allowY = orientation === "vertical" || orientation === "both";
  const allowX = orientation === "horizontal" || orientation === "both";

  const measure = useCallback(() => {
    const el = innerViewportRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = el;
    const yMax = Math.max(0, scrollHeight - clientHeight);
    const xMax = Math.max(0, scrollWidth - clientWidth);
    const canScrollY = allowY && yMax > 1;
    const canScrollX = allowX && xMax > 1;

    const trackPad = 6;
    const yTrack = Math.max(0, clientHeight - trackPad);
    const xTrack = Math.max(0, clientWidth - trackPad);

    const yThumbSize = canScrollY
      ? Math.max(24, Math.min(yTrack, Math.round((clientHeight / scrollHeight) * yTrack)))
      : 0;
    const yThumbOffset =
      canScrollY && yMax > 0
        ? Math.round((scrollTop / yMax) * Math.max(0, yTrack - yThumbSize))
        : 0;

    const xThumbSize = canScrollX
      ? Math.max(24, Math.min(xTrack, Math.round((clientWidth / scrollWidth) * xTrack)))
      : 0;
    const xThumbOffset =
      canScrollX && xMax > 0
        ? Math.round((scrollLeft / xMax) * Math.max(0, xTrack - xThumbSize))
        : 0;

    const fSize = useEdgeFade ? Math.max(0, fadeSize) : 0;
    const fadeTop = canScrollY && fSize > 0 ? Math.min(fSize, Math.round(scrollTop)) : 0;
    const fadeBottom = canScrollY && fSize > 0 ? Math.min(fSize, Math.round(yMax - scrollTop)) : 0;
    const fadeLeft = canScrollX && fSize > 0 ? Math.min(fSize, Math.round(scrollLeft)) : 0;
    const fadeRight = canScrollX && fSize > 0 ? Math.min(fSize, Math.round(xMax - scrollLeft)) : 0;

    setMetrics((prev) =>
      prev.canScrollY === canScrollY &&
      prev.canScrollX === canScrollX &&
      prev.yThumbSize === yThumbSize &&
      prev.yThumbOffset === yThumbOffset &&
      prev.xThumbSize === xThumbSize &&
      prev.xThumbOffset === xThumbOffset &&
      prev.fadeTop === fadeTop &&
      prev.fadeBottom === fadeBottom &&
      prev.fadeLeft === fadeLeft &&
      prev.fadeRight === fadeRight
        ? prev
        : {
            canScrollY,
            canScrollX,
            yThumbSize,
            yThumbOffset,
            xThumbSize,
            xThumbOffset,
            fadeTop,
            fadeBottom,
            fadeLeft,
            fadeRight,
          },
    );
  }, [allowX, allowY, fadeSize, useEdgeFade]);

  useEffect(() => {
    measure();
    const el = innerViewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  const pulseScrolling = () => {
    setScrolling(true);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      setScrolling(false);
      idleTimerRef.current = null;
    }, 800);
  };

  const handleThumbPointerDown = (axis: "y" | "x", event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const vp = innerViewportRef.current;
    if (!vp) return;

    const thumbEl = event.currentTarget;
    thumbEl.setPointerCapture?.(event.pointerId);
    setDraggingAxis(axis);

    const startCoord = axis === "y" ? event.clientY : event.clientX;
    const startScroll = axis === "y" ? vp.scrollTop : vp.scrollLeft;
    const clientSpan = axis === "y" ? vp.clientHeight : vp.clientWidth;
    const scrollSpan = axis === "y" ? vp.scrollHeight : vp.scrollWidth;
    const thumbSpan = axis === "y" ? metrics.yThumbSize : metrics.xThumbSize;
    const trackTravel = Math.max(1, clientSpan - 6 - thumbSpan);
    const scrollTravel = Math.max(1, scrollSpan - clientSpan);

    const onMove = (moveEvent: PointerEvent) => {
      const coord = axis === "y" ? moveEvent.clientY : moveEvent.clientX;
      const delta = coord - startCoord;
      const nextScroll = startScroll + (delta / trackTravel) * scrollTravel;
      if (axis === "y") {
        vp.scrollTop = nextScroll;
      } else {
        vp.scrollLeft = nextScroll;
      }
    };

    const onUp = () => {
      setDraggingAxis(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handleTrackPointerDown = (axis: "y" | "x", event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    const vp = innerViewportRef.current;
    if (!vp) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (axis === "y") {
      const clickOffset = event.clientY - rect.top;
      const thumbCenter = metrics.yThumbOffset + metrics.yThumbSize / 2;
      const dir = clickOffset < thumbCenter ? -1 : 1;
      vp.scrollBy({ top: dir * vp.clientHeight * 0.85, behavior: "smooth" });
    } else {
      const clickOffset = event.clientX - rect.left;
      const thumbCenter = metrics.xThumbOffset + metrics.xThumbSize / 2;
      const dir = clickOffset < thumbCenter ? -1 : 1;
      vp.scrollBy({ left: dir * vp.clientWidth * 0.85, behavior: "smooth" });
    }
  };

  // 将内联传入的 padding 转发给内部滚动视口，保证滚动内容紧贴外框上下渐隐且保留内边距呼吸感
  const {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    paddingInline,
    paddingBlock,
    ...outerRestStyle
  } = style ?? {};

  const outerStyle: CSSProperties = {
    maxHeight: toCssDimension(maxHeight),
    height: toCssDimension(height),
    maxWidth: toCssDimension(maxWidth),
    "--af-scroll-fade": `${fadeSize}px`,
    "--af-sa-y-start": `${metrics.fadeTop}px`,
    "--af-sa-y-end": `${metrics.fadeBottom}px`,
    "--af-sa-x-start": `${metrics.fadeLeft}px`,
    "--af-sa-x-end": `${metrics.fadeRight}px`,
    ...outerRestStyle,
  } as CSSProperties;

  const viewportStyle: CSSProperties = {
    ...(padding !== undefined ? { padding } : null),
    ...(paddingTop !== undefined ? { paddingTop } : null),
    ...(paddingRight !== undefined ? { paddingRight } : null),
    ...(paddingBottom !== undefined ? { paddingBottom } : null),
    ...(paddingLeft !== undefined ? { paddingLeft } : null),
    ...(paddingInline !== undefined ? { paddingInline } : null),
    ...(paddingBlock !== undefined ? { paddingBlock } : null),
    ...(maxHeight !== undefined && height === undefined ? { maxHeight: toCssDimension(maxHeight) } : null),
  };

  const showCustomBars = scrollbar === "thin";
  const barVisible =
    type === "always" ||
    draggingAxis !== null ||
    scrolling ||
    (type === "hover" && hovered);
  const hasAnyOverflow = metrics.canScrollY || metrics.canScrollX;

  return (
    <div
      ref={forwardedRef}
      className={cn("af-scroll-area", className)}
      data-orientation={orientation}
      data-scrollbar={scrollbar}
      data-type={type}
      data-bar-visible={barVisible || undefined}
      data-dragging={draggingAxis || undefined}
      data-fade-top={metrics.fadeTop > 1 || undefined}
      data-fade-bottom={metrics.fadeBottom > 1 || undefined}
      data-fade-left={metrics.fadeLeft > 1 || undefined}
      data-fade-right={metrics.fadeRight > 1 || undefined}
      style={outerStyle}
      onPointerEnter={(event) => {
        setHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        onPointerLeave?.(event);
      }}
      {...rest}
    >
      <div
        ref={composeRefs(innerViewportRef, externalViewportRef)}
        className="af-scroll-area__viewport"
        tabIndex={hasAnyOverflow ? 0 : undefined}
        style={viewportStyle}
        onScroll={(event) => {
          measure();
          pulseScrolling();
          onScroll?.(event);
        }}
      >
        {children}
      </div>

      {showCustomBars && metrics.canScrollY ? (
        <div
          className="af-scroll-area__bar"
          data-axis="y"
          data-both={metrics.canScrollX || undefined}
          aria-hidden="true"
          onPointerDown={(e) => handleTrackPointerDown("y", e)}
        >
          <div
            className="af-scroll-area__thumb"
            style={{
              height: `${metrics.yThumbSize}px`,
              transform: `translate3d(0, ${metrics.yThumbOffset}px, 0)`,
            }}
            onPointerDown={(e) => handleThumbPointerDown("y", e)}
          />
        </div>
      ) : null}

      {showCustomBars && metrics.canScrollX ? (
        <div
          className="af-scroll-area__bar"
          data-axis="x"
          data-both={metrics.canScrollY || undefined}
          aria-hidden="true"
          onPointerDown={(e) => handleTrackPointerDown("x", e)}
        >
          <div
            className="af-scroll-area__thumb"
            style={{
              width: `${metrics.xThumbSize}px`,
              transform: `translate3d(${metrics.xThumbOffset}px, 0, 0)`,
            }}
            onPointerDown={(e) => handleThumbPointerDown("x", e)}
          />
        </div>
      ) : null}
    </div>
  );
});
