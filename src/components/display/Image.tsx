import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ImgHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { AfIcon } from "../../icons";
import {
  AfPortal,
  cn,
  useAfLayerContainer,
  useControllableState,
  useExitTransition,
  useOverlayBranch,
  useOverlayFocusTrap,
} from "../../primitives";

/** 灯箱单图条目。 */
export type AfImagePreviewItem = {
  src: string;
  alt?: string;
  /** 可选缩略图地址（默认回退至 `src`）。 */
  thumb?: string;
};

/** 全屏灯箱图片预览属性。 */
export type AfImagePreviewProps = {
  /** 是否显示预览灯箱。 */
  open?: boolean;
  /** 关闭回调。 */
  onClose?: () => void;
  /** 单张图片地址。 */
  src?: string;
  /** 多图轮播地址集合（支持字符串或含标题/缩略图对象）。 */
  images?: (string | AfImagePreviewItem)[];
  /** 多图模式当前索引。 */
  currentIndex?: number;
  /** 索引切换回调。 */
  onIndexChange?: (index: number) => void;
  /** 图片替代文本。 */
  alt?: string;
  /** 最小缩放倍率，默认 `0.25`。 */
  minScale?: number;
  /** 最大缩放倍率，默认 `8`。 */
  maxScale?: number;
  /** 多图时是否显示底部胶片缩略图导航条，默认 `true`。 */
  showFilmstrip?: boolean;
  /** 受控透明棋盘格衬底开关。 */
  checkerboard?: boolean;
  /** 非受控初始透明棋盘格衬底开关，默认 `false`。 */
  defaultCheckerboard?: boolean;
  /** 透明棋盘格衬底变化回调。 */
  onCheckerboardChange?: (enabled: boolean) => void;
  /** 是否在工具栏显示透明棋盘格切换按钮，默认 `true`。 */
  showCheckerboardToggle?: boolean;
  /** 顶部栏自定义附加操作插槽（如复制原图、打开所在文件夹、查看 EXIF）。 */
  toolbarExtra?: ReactNode;
  /** 可选指定浮层容器。 */
  container?: HTMLElement | null;
};

/**
 * 全屏图片灯箱预览：
 * - 支持 `0.25x–8x` 光标锚点滚轮无级缩放、双击图像 `1x <-> 2x` 切换/复位、旋转（-90°/+90°）、左右镜像与 2D 拖拽平移；
 * - 支持多图底部胶片缩略图条、透明 PNG/WebP 棋盘格衬底切换与顶部 `toolbarExtra` 扩展槽；
 * - 严格采用“按住并释放均落在背景遮罩”判定防误关，且带有 Electron `-webkit-app-region: no-drag`。
 */
export function AfImagePreview({
  open = false,
  onClose = () => {},
  src,
  images,
  currentIndex = 0,
  onIndexChange,
  alt = "图片预览",
  minScale = 0.25,
  maxScale = 8,
  showFilmstrip = true,
  checkerboard: checkerboardProp,
  defaultCheckerboard = false,
  onCheckerboardChange,
  showCheckerboardToggle = true,
  toolbarExtra,
  container,
}: AfImagePreviewProps = {}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const wheelTimerRef = useRef<number | null>(null);
  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 180);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, open);

  const [isCheckerboard, setIsCheckerboard] = useControllableState<boolean>({
    value: checkerboardProp,
    defaultValue: defaultCheckerboard,
    onChange: onCheckerboardChange,
  });

  const normalizedList: AfImagePreviewItem[] = images?.length
    ? images.map((item) =>
        typeof item === "string"
          ? { src: item, alt }
          : { src: item.src, alt: item.alt ?? alt, thumb: item.thumb },
      )
    : src
      ? [{ src, alt }]
      : [];

  const [innerIndex, setInnerIndex] = useState(currentIndex);
  const activeIndex =
    images && onIndexChange ? currentIndex : Math.min(innerIndex, Math.max(0, normalizedList.length - 1));
  const currentItem = normalizedList[activeIndex];

  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [wheeling, setWheeling] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    setInnerIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (!open) return;
    setScale(1);
    setRotate(0);
    setFlipX(false);
    setOffset({ x: 0, y: 0 });
  }, [open, activeIndex]);

  useEffect(() => {
    return () => {
      if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    };
  }, []);

  useOverlayFocusTrap({
    open,
    panelRef,
    container: resolvedContainer,
    onClose,
    closeOnEscape: true,
    shouldIgnoreEscape: hasOpenChild,
  });

  if (!mounted || !resolvedContainer || !currentItem) return null;

  const total = normalizedList.length;
  const goTo = (nextIdx: number) => {
    if (total <= 1) return;
    const bounded = (nextIdx + total) % total;
    setInnerIndex(bounded);
    onIndexChange?.(bounded);
  };

  const clampScale = (next: number) =>
    Math.round(Math.min(maxScale, Math.max(minScale, next)) * 100) / 100;

  const zoomAtPoint = (nextScaleRaw: number, clientX?: number, clientY?: number) => {
    const nextScale = clampScale(nextScaleRaw);
    if (nextScale === scale) return;
    const stageEl = stageRef.current;
    if (!stageEl || clientX === undefined || clientY === undefined) {
      setScale(nextScale);
      if (nextScale <= 1) setOffset({ x: 0, y: 0 });
      return;
    }
    const rect = stageEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const ratio = nextScale / scale;
    setScale(nextScale);
    setOffset((prev) => ({
      x: Math.round((dx - (dx - prev.x) * ratio) * 100) / 100,
      y: Math.round((dy - (dy - prev.y) * ratio) * 100) / 100,
    }));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setWheeling(true);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      setWheeling(false);
      wheelTimerRef.current = null;
    }, 120);

    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomAtPoint(scale * factor, event.clientX, event.clientY);
  };

  const handleImageDoubleClick = (event: ReactMouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    setWheeling(false);
    if (Math.abs(scale - 1) > 0.04 || offset.x !== 0 || offset.y !== 0) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    zoomAtPoint(Math.min(maxScale, 2), event.clientX, event.clientY);
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const isBackdrop = event.target === event.currentTarget;
    pointerDownOutsideRef.current = isBackdrop;
    if (isBackdrop || event.button !== 0) return;
    event.preventDefault();
    setDragging(true);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragStateRef.current) return;
      setOffset({
        x: dragStateRef.current.originX + (moveEvent.clientX - dragStateRef.current.startX),
        y: dragStateRef.current.originY + (moveEvent.clientY - dragStateRef.current.startY),
      });
    };
    const onUp = () => {
      dragStateRef.current = null;
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startedOutside = pointerDownOutsideRef.current;
    pointerDownOutsideRef.current = false;
    if (startedOutside && event.target === event.currentTarget) {
      onClose();
    }
  };

  const transformValue = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${flipX ? -scale : scale}, ${scale}) rotate(${rotate}deg)`;

  return (
    <AfPortal container={resolvedContainer}>
      <OverlayBranchScope>
        <div
          ref={panelRef}
          className="af-image-preview"
          data-closing={closing || undefined}
          role="dialog"
          aria-modal="true"
          aria-label={currentItem.alt ?? "图片预览"}
          tabIndex={-1}
          data-af-overlay="true"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && total > 1) {
              event.preventDefault();
              goTo(activeIndex - 1);
            } else if (event.key === "ArrowRight" && total > 1) {
              event.preventDefault();
              goTo(activeIndex + 1);
            }
          }}
        >
          <div className="af-image-preview__top">
            {total > 1 ? (
              <span className="af-image-preview__counter">
                {activeIndex + 1} / {total}
              </span>
            ) : (
              <span />
            )}
            <div className="af-image-preview__top-actions">
              {toolbarExtra}
              <button type="button" className="af-image-preview__toolbtn" aria-label="关闭预览" onClick={onClose}>
                <AfIcon name="x" size={16} />
              </button>
            </div>
          </div>

          <div
            ref={stageRef}
            className="af-image-preview__stage"
            onWheel={handleWheel}
            onPointerDown={handleStagePointerDown}
            onPointerUp={handleStagePointerUp}
          >
            {total > 1 ? (
              <button
                type="button"
                className="af-image-preview__nav af-image-preview__nav--prev"
                aria-label="上一张"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex - 1);
                }}
              >
                <AfIcon name="chevronLeft" size={18} />
              </button>
            ) : null}
            <img
              src={currentItem.src}
              alt={currentItem.alt}
              className="af-image-preview__img"
              data-dragging={dragging || wheeling || undefined}
              data-checkerboard={isCheckerboard || undefined}
              draggable={false}
              style={{ transform: transformValue }}
              onDoubleClick={handleImageDoubleClick}
            />
            {total > 1 ? (
              <button
                type="button"
                className="af-image-preview__nav af-image-preview__nav--next"
                aria-label="下一张"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex + 1);
                }}
              >
                <AfIcon name="chevronRight" size={18} />
              </button>
            ) : null}
          </div>

          <div className="af-image-preview__bottom">
            {showFilmstrip && total > 1 ? (
              <div className="af-image-preview__thumbs" role="group" aria-label="缩略图导航">
                {normalizedList.map((item, idx) => {
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={`${item.src}-${idx}`}
                      type="button"
                      className="af-image-preview__thumb"
                      data-active={active || undefined}
                      aria-label={item.alt ? `第 ${idx + 1} 张：${item.alt}` : `第 ${idx + 1} 张`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => goTo(idx)}
                    >
                      <img src={item.thumb ?? item.src} alt="" draggable={false} />
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="af-image-preview__toolbar">
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="缩小"
                onClick={() => zoomAtPoint(scale - 0.25)}
              >
                <AfIcon name="zoomOut" size={15} />
              </button>
              <span className="af-image-preview__zoom">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="放大"
                onClick={() => zoomAtPoint(scale + 0.25)}
              >
                <AfIcon name="zoomIn" size={15} />
              </button>
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="逆时针旋转 90 度"
                onClick={() => setRotate((r) => r - 90)}
              >
                <AfIcon name="rotateLeft" size={15} />
              </button>
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="顺时针旋转 90 度"
                onClick={() => setRotate((r) => r + 90)}
              >
                <AfIcon name="rotateRight" size={15} />
              </button>
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="水平镜像"
                onClick={() => setFlipX((f) => !f)}
              >
                <AfIcon name="arrowRight" size={15} />
              </button>
              {showCheckerboardToggle ? (
                <button
                  type="button"
                  className="af-image-preview__toolbtn"
                  data-active={isCheckerboard || undefined}
                  aria-label="切换透明棋盘格衬底"
                  aria-pressed={isCheckerboard}
                  onClick={() => setIsCheckerboard(!isCheckerboard)}
                >
                  <AfIcon name="grid" size={15} />
                </button>
              ) : null}
              <button
                type="button"
                className="af-image-preview__toolbtn"
                aria-label="重置视图"
                onClick={() => {
                  setScale(1);
                  setRotate(0);
                  setFlipX(false);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                <AfIcon name="refresh" size={15} />
              </button>
            </div>
          </div>
        </div>
      </OverlayBranchScope>
    </AfPortal>
  );
}

/** 增强图片组件属性。 */
export type AfImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> & {
  /** 宽（px 或 CSS 长度）。 */
  width?: number | string;
  /** 高（px 或 CSS 长度）。 */
  height?: number | string;
  /** 圆角。 */
  radius?: number | string;
  /** 对象填充方式，默认 cover。 */
  fit?: CSSProperties["objectFit"];
  /** 是否开启点击灯箱预览，默认 true。 */
  preview?: boolean;
  /** 多图预览时传入完整图集。 */
  previewImages?: (string | AfImagePreviewItem)[];
  /** 加载失败时自定义回退内容或备用图地址。 */
  fallback?: ReactNode;
  fallbackSrc?: string;
  /** 预览挂载容器。 */
  container?: HTMLElement | null;
};

/** 增强图片组件：内置加载失败回退与点击灯箱大图预览。 */
export const AfImage = forwardRef<HTMLImageElement, AfImageProps>(function AfImage(
  {
    src,
    alt = "",
    width,
    height,
    radius,
    fit = "cover",
    preview = true,
    previewImages,
    fallback,
    fallbackSrc,
    container,
    className,
    style,
    loading = "lazy",
    onError,
    onLoad,
    ...rest
  } = {},
  ref,
) {
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeSrc = failed && fallbackSrc ? fallbackSrc : src;
  const canPreview = Boolean(preview && activeSrc && (!failed || fallbackSrc));

  const wrapperStyle: CSSProperties = {
    width,
    height,
    borderRadius: radius,
    ...style,
  };

  return (
    <>
      <span
        className={cn("af-image", className)}
        style={wrapperStyle}
        data-previewable={canPreview || undefined}
        role={canPreview ? "button" : undefined}
        tabIndex={canPreview ? 0 : undefined}
        aria-label={canPreview ? (alt ? `预览图片：${alt}` : "预览图片") : undefined}
        onClick={() => {
          if (canPreview) setPreviewOpen(true);
        }}
        onKeyDown={(event) => {
          if (canPreview && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setPreviewOpen(true);
          }
        }}
      >
        {failed && !fallbackSrc ? (
          <span className="af-image__fallback">
            {fallback ?? (
              <>
                <AfIcon name="image" size={18} />
                <span>图片不可用</span>
              </>
            )}
          </span>
        ) : (
          <img
            ref={ref}
            src={activeSrc}
            alt={alt}
            loading={loading}
            className="af-image__img"
            style={{ objectFit: fit }}
            onLoad={(event) => {
              setFailed(false);
              onLoad?.(event);
            }}
            onError={(event) => {
              setFailed(true);
              onError?.(event);
            }}
            {...rest}
          />
        )}
        {canPreview ? (
          <span className="af-image__overlay" aria-hidden="true">
            <AfIcon name="zoomIn" size={16} />
          </span>
        ) : null}
      </span>
      {canPreview ? (
        <AfImagePreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          src={activeSrc}
          images={previewImages}
          alt={alt}
          container={container}
        />
      ) : null}
    </>
  );
});

/** 雪碧图切片属性（按帧索引切割展示序列图集）。 */
export type AfSpriteImageProps = ComponentPropsWithoutRef<"div"> & {
  /** 雪碧图资源路径。 */
  src?: string;
  /** 目标切片宽（px）。 */
  width?: number;
  /** 目标切片高（px）。 */
  height?: number;
  /** 在整张雪碧图中的横/纵坐标偏移或切片下标。 */
  x?: number;
  y?: number;
  col?: number;
  row?: number;
  /** 整张雪碧图原始宽高，用于高分屏等比缩放。 */
  sheetWidth?: number;
  sheetHeight?: number;
};

/** 雪碧图切片展示容器。 */
export function AfSpriteImage({
  src = "",
  width = 32,
  height = 32,
  x,
  y,
  col = 0,
  row = 0,
  sheetWidth,
  sheetHeight,
  className,
  style,
  ...rest
}: AfSpriteImageProps = {}) {
  const offsetX = x ?? col * width;
  const offsetY = y ?? row * height;
  return (
    <div
      className={cn("af-sprite-image", className)}
      style={{
        width,
        height,
        flex: "none",
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${offsetX}px -${offsetY}px`,
        backgroundSize: sheetWidth && sheetHeight ? `${sheetWidth}px ${sheetHeight}px` : undefined,
        ...style,
      }}
      {...rest}
    />
  );
}

/** 分层叠加图属性。 */
export type AfLayeredImageLayer = {
  src: string;
  alt?: string;
  opacity?: number;
  zIndex?: number;
};

export type AfLayeredImageProps = ComponentPropsWithoutRef<"div"> & {
  layers?: AfLayeredImageLayer[];
  width?: number | string;
  height?: number | string;
};

/** 多层图像叠加合成器（保持定位贴合，常用于角色立绘/图层组合）。 */
export function AfLayeredImage({
  layers = [],
  width,
  height,
  className,
  style,
  ...rest
}: AfLayeredImageProps = {}) {
  return (
    <div
      className={cn("af-layered-image", className)}
      style={{ position: "relative", overflow: "hidden", width, height, ...style }}
      {...rest}
    >
      {layers.map((layer, index) => (
        <img
          key={`${layer.src}-${index}`}
          src={layer.src}
          alt={layer.alt ?? ""}
          aria-hidden={!layer.alt || undefined}
          style={{
            position: index === 0 ? "relative" : "absolute",
            inset: index === 0 ? undefined : 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: layer.opacity,
            zIndex: layer.zIndex ?? index,
          }}
        />
      ))}
    </div>
  );
}
