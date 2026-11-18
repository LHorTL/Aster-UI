import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useIsomorphicLayoutEffect } from "./cn";
import { useControllableState } from "./controllable";

export interface AfCanvasPanPoint {
  x: number;
  y: number;
}

export interface UseCanvasZoomPanOptions {
  /** 受控缩放倍率（默认范围 `0.25 ~ 8`）。 */
  zoom?: number;
  /** 非受控初始缩放倍率（默认 `1`）。 */
  defaultZoom?: number;
  /** 缩放变化回调。 */
  onZoomChange?: (nextZoom: number) => void;
  /** 受控平移偏移（px）。 */
  pan?: AfCanvasPanPoint;
  /** 非受控初始平移偏移。 */
  defaultPan?: AfCanvasPanPoint;
  /** 平移变化回调。 */
  onPanChange?: (nextPan: AfCanvasPanPoint) => void;
  /** 最小缩放倍率（默认 `0.25`）。 */
  minZoom?: number;
  /** 最大缩放倍率（默认 `8`）。 */
  maxZoom?: number;
  /** 自适应充满基准倍率（双击复位目标，默认 `1`）。 */
  fitZoom?: number;
  /** 滚轮缩放灵敏度（默认 `0.0018`）。 */
  wheelSensitivity?: number;
  /** 是否允许直接左键拖拽平移（无需按住空格，默认 `false`）。 */
  allowLeftDragPan?: boolean;
  /** 禁用全部缩放平移交互。 */
  disabled?: boolean;
  /** 外部传入的视口容器 Ref。 */
  viewportRef?: RefObject<HTMLElement | null>;
  /** 双栏同步缩放模式下的第二视口容器 Ref（同样挂载非被动原生滚轮缩放）。 */
  secondaryViewportRef?: RefObject<HTMLElement | null>;
}

export interface CanvasZoomPanBindProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onDoubleClick: (event: ReactMouseEvent<HTMLElement>) => void;
}

export interface CanvasZoomPanResult<T extends HTMLElement = HTMLDivElement> {
  /** 绑定至外层画布视口容器的 Ref。 */
  viewportRef: RefObject<T>;
  /** 绑定至外层画布视口容器的指针与双击事件。 */
  bindViewport: CanvasZoomPanBindProps;
  /** 直接赋给内层变换画布层的 `transformOrigin: "0 0"` + `translate3d(...) scale(...)` 样式。 */
  canvasStyle: CSSProperties;
  /** 当前缩放倍率。 */
  zoom: number;
  /** 当前平移坐标。 */
  pan: AfCanvasPanPoint;
  /** 当前是否按住空格平移键。 */
  spacePressed: boolean;
  /** 当前是否处于拖拽平移中。 */
  dragging: boolean;
  /** 以视口内局部坐标 `(cursorX, cursorY)` 为不动点缩放到指定倍率。 */
  zoomAtPoint: (cursorX: number, cursorY: number, targetZoom: number) => void;
  /** 以视口中心为不动点放大一级。 */
  zoomIn: () => void;
  /** 以视口中心为不动点缩小一级。 */
  zoomOut: () => void;
  /** 复位至自适应充满状态（`zoom = fitZoom`, `pan = {0, 0}`）。 */
  resetFit: () => void;
  /** 切换至 `100%` 1:1 像素级检视。 */
  zoomTo100: () => void;
}

function clampZoom(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return 1;
  return Math.min(max, Math.max(min, Math.round(val * 10000) / 10000));
}

/**
 * 计算以光标局部坐标 `(cursorX, cursorY)` 为不动点的缩放后新偏移：
 * `nextPanX = cursorX - (cursorX - panX) * (nextZoom / currentZoom)`
 */
export function computeCursorAnchoredPan(
  cursorX: number,
  cursorY: number,
  currentPan: AfCanvasPanPoint,
  currentZoom: number,
  nextZoom: number,
): AfCanvasPanPoint {
  const safeCurrent = currentZoom > 0 ? currentZoom : 1;
  const ratio = nextZoom / safeCurrent;
  return {
    x: Math.round((cursorX - (cursorX - currentPan.x) * ratio) * 100) / 100,
    y: Math.round((cursorY - (cursorY - currentPan.y) * ratio) * 100) / 100,
  };
}

/**
 * 画布光标锚点缩放与平移物理原语（`P3-1`）：
 * - 滚轮缩放以光标所在画布点为严格不动点（`0.25x – 8x`）；
 * - 支持按住空格左键拖拽、鼠标中键拖拽与可选直接左键平移；
 * - 双击在「自适应复位 `fit`」与「`200%` / `100%` 细节检视」间切换。
 */
export function useCanvasZoomPan<T extends HTMLElement = HTMLDivElement>({
  zoom: zoomProp,
  defaultZoom = 1,
  onZoomChange,
  pan: panProp,
  defaultPan = { x: 0, y: 0 },
  onPanChange,
  minZoom = 0.25,
  maxZoom = 8,
  fitZoom = 1,
  wheelSensitivity = 0.0018,
  allowLeftDragPan = false,
  disabled = false,
  viewportRef: externalRef,
  secondaryViewportRef,
}: UseCanvasZoomPanOptions = {}): CanvasZoomPanResult<T> {
  const internalRef = useRef<T>(null);
  const viewportRef = (externalRef as RefObject<T> | undefined) ?? internalRef;

  const [zoom, setZoom] = useControllableState<number>({
    value: zoomProp,
    defaultValue: clampZoom(defaultZoom, minZoom, maxZoom),
    onChange: onZoomChange,
  });

  const [pan, setPan] = useControllableState<AfCanvasPanPoint>({
    value: panProp,
    defaultValue: defaultPan,
    onChange: onPanChange,
  });

  const [spacePressed, setSpacePressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mountedEl, setMountedEl] = useState<HTMLElement | null>(null);
  const [mountedSecondaryEl, setMountedSecondaryEl] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const cur = viewportRef.current;
    if (cur !== mountedEl) {
      setMountedEl(cur);
    }
    const sec = secondaryViewportRef?.current ?? null;
    if (sec !== mountedSecondaryEl) {
      setMountedSecondaryEl(sec);
    }
  });

  const stateRef = useRef({ zoom, pan, disabled, minZoom, maxZoom, wheelSensitivity });
  stateRef.current = { zoom, pan, disabled, minZoom, maxZoom, wheelSensitivity };

  const dragSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);

  const zoomAtPoint = useCallback(
    (cursorX: number, cursorY: number, rawTargetZoom: number) => {
      const { zoom: curZoom, pan: curPan, minZoom: minZ, maxZoom: maxZ } = stateRef.current;
      const nextZoom = clampZoom(rawTargetZoom, minZ, maxZ);
      if (nextZoom === curZoom) return;
      const nextPan = computeCursorAnchoredPan(cursorX, cursorY, curPan, curZoom, nextZoom);
      setZoom(nextZoom);
      setPan(nextPan);
    },
    [setZoom, setPan],
  );

  // 非被动原生 wheel 监听（自动跟随条件渲染挂载/重挂）：避免整页滚动且零被动监听器警告
  useEffect(() => {
    if (disabled) return;
    const targets = [mountedEl, mountedSecondaryEl].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const cleanups = targets.map((el) => {
      const handleWheel = (event: WheelEvent) => {
        if (stateRef.current.disabled) return;
        event.preventDefault();
        const rect = el.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const factor = Math.exp(-event.deltaY * stateRef.current.wheelSensitivity);
        zoomAtPoint(cursorX, cursorY, stateRef.current.zoom * factor);
      };
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [mountedEl, mountedSecondaryEl, disabled, zoomAtPoint]);

  // 监听空格键按住进入抓手平移态（忽略输入框内打字与 inert 容器）
  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const isEditable = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]'),
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (mountedEl?.closest("[inert]")) return;
      if (e.code === "Space" && !isEditable(e.target)) {
        setSpacePressed((prev) => (prev ? prev : true));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed((prev) => (prev ? false : prev));
      }
    };
    const onBlur = () => setSpacePressed((prev) => (prev ? false : prev));

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [disabled, mountedEl]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return;
      const isMiddle = event.button === 1;
      const isSpaceLeft = event.button === 0 && (spacePressed || allowLeftDragPan);
      if (!isMiddle && !isSpaceLeft) return;

      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 兼容合成测试事件无硬件 pointerId 场景
      }
      dragSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originPanX: stateRef.current.pan.x,
        originPanY: stateRef.current.pan.y,
      };
      setDragging(true);
    },
    [disabled, spacePressed, allowLeftDragPan],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const dx = event.clientX - session.startClientX;
      const dy = event.clientY - session.startClientY;
      setPan({
        x: Math.round((session.originPanX + dx) * 100) / 100,
        y: Math.round((session.originPanY + dy) * 100) / 100,
      });
    },
    [setPan],
  );

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }
    dragSessionRef.current = null;
    setDragging(false);
  }, []);

  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (disabled) return;
      const { zoom: curZoom, pan: curPan } = stateRef.current;
      const isAtFit =
        Math.abs(curZoom - fitZoom) < 0.01 &&
        Math.abs(curPan.x) < 1 &&
        Math.abs(curPan.y) < 1;

      if (!isAtFit) {
        setZoom(clampZoom(fitZoom, minZoom, maxZoom));
        setPan({ x: 0, y: 0 });
      } else {
        const rect = event.currentTarget.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const target = Math.abs(fitZoom - 1) > 0.05 ? 1 : 2;
        zoomAtPoint(cursorX, cursorY, target);
      }
    },
    [disabled, fitZoom, minZoom, maxZoom, setZoom, setPan, zoomAtPoint],
  );

  const centerPoint = useCallback((): AfCanvasPanPoint => {
    const el = viewportRef.current;
    if (!el) return { x: 200, y: 150 };
    return { x: el.clientWidth / 2, y: el.clientHeight / 2 };
  }, [viewportRef]);

  const zoomIn = useCallback(() => {
    const c = centerPoint();
    zoomAtPoint(c.x, c.y, stateRef.current.zoom * 1.25);
  }, [centerPoint, zoomAtPoint]);

  const zoomOut = useCallback(() => {
    const c = centerPoint();
    zoomAtPoint(c.x, c.y, stateRef.current.zoom / 1.25);
  }, [centerPoint, zoomAtPoint]);

  const resetFit = useCallback(() => {
    setZoom(clampZoom(fitZoom, minZoom, maxZoom));
    setPan({ x: 0, y: 0 });
  }, [fitZoom, minZoom, maxZoom, setZoom, setPan]);

  const zoomTo100 = useCallback(() => {
    const c = centerPoint();
    zoomAtPoint(c.x, c.y, 1);
  }, [centerPoint, zoomAtPoint]);

  const canvasStyle = useMemo<CSSProperties>(
    () => ({
      transformOrigin: "0 0",
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
      transition: dragging ? "none" : undefined,
    }),
    [pan.x, pan.y, zoom, dragging],
  );

  return {
    viewportRef,
    bindViewport: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onDoubleClick,
    },
    canvasStyle,
    zoom,
    pan,
    spacePressed,
    dragging,
    zoomAtPoint,
    zoomIn,
    zoomOut,
    resetFit,
    zoomTo100,
  };
}
