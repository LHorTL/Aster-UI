import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn, composeRefs, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";

/** 分栏方向。 */
export type AfResizableDirection = "horizontal" | "vertical";

type PanelConstraint = {
  mode: "percent" | "pixel" | "flex";
  defaultSize?: number;
  minSize: number;
  maxSize: number;
  collapsible: boolean;
  collapsedSize: number;
  defaultPx: number;
  minPx: number;
  maxPx: number;
  collapsedPx: number;
  defaultCollapsed: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
};

type ResizableContextValue = {
  direction: AfResizableDirection;
  hasPixelMode: boolean;
  sizes: number[];
  pxSizes: Record<number, number>;
  constraints: PanelConstraint[];
  keyboardStep: number;
  moveSplitter: (handleIndex: number, deltaPercent: number, deltaPixels: number, fromDrag?: boolean) => void;
  jumpSplitter: (handleIndex: number, target: "min" | "max" | "reset" | "toggle") => void;
  getGroupPixelSpan: () => number;
  setDraggingState: (dragging: boolean) => void;
};

const ResizableContext = createContext<ResizableContextValue | null>(null);

function readResizableStorage<T>(key: string | undefined): T | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeResizableStorage(key: string | undefined, payload: unknown) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // 忽略无痕窗口或沙盒环境配额异常
  }
}

/** 可调分栏组属性（对齐 affectUI ResizablePanelGroup 与 Aster 契约）。 */
export type AfResizableGroupProps = ComponentPropsWithoutRef<"div"> & {
  /** 排列方向：水平左右分栏或垂直上下分栏，默认 `"horizontal"`。 */
  direction?: AfResizableDirection;
  /** 受控各面板百分比数组（总和约等于 100）。 */
  sizes?: number[];
  /** 非受控初始各面板百分比数组；省略时从子 `AfResizablePanel` 的 `defaultSize` 自动归一化。 */
  defaultSizes?: number[];
  /** 面板比例变化回调。 */
  onSizesChange?: (sizes: number[]) => void;
  /** 面板比例变化回调别名（对齐 affectUI `onLayout`）。 */
  onLayout?: (sizes: number[]) => void;
  /** 像素混合模式下各像素面板尺寸变化回调。 */
  onPixelSizesChange?: (pxSizes: Record<number, number>) => void;
  /** 键盘方向键单次调节百分比步长（默认 5，按住 Shift 翻倍为 10；像素模式下单步默认 16px）。 */
  keyboardStep?: number;
  /** 本地持久化键名（自动将百分比或像素宽度记忆至 `localStorage`）。 */
  storageKey?: string;
};

export type AfResizablePanelGroupProps = AfResizableGroupProps;

/** 可调分栏面板属性。 */
export type AfResizablePanelProps = ComponentPropsWithoutRef<"div"> & {
  /** 初始宽度/高度占比（0~100）。 */
  defaultSize?: number;
  /** 最小占比（0~100），默认 15。 */
  minSize?: number;
  /** 最大占比（0~100），默认 85。 */
  maxSize?: number;
  /** 像素混合模式：初始固定像素尺寸（宽度或高度）。 */
  defaultWidthPx?: number;
  /** 像素混合模式：初始固定像素尺寸别名。 */
  defaultSizePx?: number;
  /** 像素混合模式：最小像素尺寸，默认 160。 */
  minWidthPx?: number;
  /** 像素混合模式：最小像素尺寸别名。 */
  minSizePx?: number;
  /** 像素混合模式：最大像素尺寸，默认 640。 */
  maxWidthPx?: number;
  /** 像素混合模式：最大像素尺寸别名。 */
  maxSizePx?: number;
  /** 像素混合模式：收拢后保留像素尺寸，默认 0。 */
  collapsedWidthPx?: number;
  /** 像素混合模式：收拢后保留像素尺寸别名。 */
  collapsedSizePx?: number;
  /** 像素混合模式：声明为中间自适应 `flex: 1` 弹性主画布面板。 */
  flex?: boolean;
  /** 非受控初始是否处于折叠收拢态。 */
  defaultCollapsed?: boolean;
  /** 是否允许拖过最小阈值中点或按 Enter 键吸附收拢。 */
  collapsible?: boolean;
  /** 收拢后的保留占比（0~100），默认 0。 */
  collapsedSize?: number;
  /** 面板折叠状态变化回调。 */
  onCollapseChange?: (collapsed: boolean) => void;
  /** 内部注入面板序号。 */
  _panelIndex?: number;
};

/** 可调分栏拖拽分隔条属性。 */
export type AfResizableHandleProps = ComponentPropsWithoutRef<"div"> & {
  /** 是否显示中央胶囊握把指示器（默认 `false` 为安静发丝线，可传 `true` 显示中央握把）。 */
  withHandle?: boolean;
  /** 是否禁用拖拽与键盘调节。 */
  disabled?: boolean;
  /** 无障碍名称，默认 `"Resize panels"`。 */
  label?: string;
  /** 内部注入分隔条序号。 */
  _handleIndex?: number;
};

const PANEL_TAG = "AfResizablePanel";
const HANDLE_TAG = "AfResizableHandle";

function normalizeInitialSizes(constraints: PanelConstraint[], explicitDefaults?: number[]): number[] {
  const count = constraints.length;
  if (count === 0) return [];
  if (explicitDefaults && explicitDefaults.length === count) {
    const sum = explicitDefaults.reduce((acc, n) => acc + n, 0) || 100;
    return explicitDefaults.map((n) => (n / sum) * 100);
  }
  const specifiedSum = constraints.reduce((acc, c) => acc + (c.defaultSize ?? 0), 0);
  const unspecifiedCount = constraints.filter((c) => c.defaultSize === undefined).length;
  const fallbackEach = unspecifiedCount > 0 ? Math.max(0, 100 - specifiedSum) / unspecifiedCount : 0;
  const raw = constraints.map((c) => (c.defaultCollapsed && c.collapsible ? c.collapsedSize : (c.defaultSize ?? fallbackEach)));
  const total = raw.reduce((acc, n) => acc + n, 0) || 100;
  return raw.map((n) => (n / total) * 100);
}

function buildInitialPxMap(constraints: PanelConstraint[]): Record<number, number> {
  const map: Record<number, number> = {};
  constraints.forEach((c, idx) => {
    if (c.mode === "pixel") {
      map[idx] =
        c.defaultCollapsed && c.collapsible
          ? c.collapsedPx
          : Math.round(Math.min(c.maxPx, Math.max(c.minPx, c.defaultPx)));
    }
  });
  return map;
}

function clampSnapPx(rawPx: number, c: PanelConstraint): number {
  if (c.collapsible && c.minPx > c.collapsedPx) {
    const mid = (c.collapsedPx + c.minPx) / 2;
    if (rawPx < c.minPx) {
      return rawPx <= mid ? c.collapsedPx : c.minPx;
    }
  }
  const floor = c.collapsible ? c.collapsedPx : c.minPx;
  return Math.round(Math.min(c.maxPx, Math.max(floor, rawPx)));
}

function applyPairMove(
  leftSize: number,
  rightSize: number,
  leftC: PanelConstraint,
  rightC: PanelConstraint,
  requestedDelta: number,
): [number, number] {
  const pairTotal = leftSize + rightSize;
  let nextLeft = leftSize + requestedDelta;
  let nextRight = pairTotal - nextLeft;

  const leftFloor = leftC.collapsible ? leftC.collapsedSize : leftC.minSize;
  const rightFloor = rightC.collapsible ? rightC.collapsedSize : rightC.minSize;

  nextLeft = Math.max(leftFloor, Math.min(leftC.maxSize, nextLeft));
  nextRight = pairTotal - nextLeft;
  nextRight = Math.max(rightFloor, Math.min(rightC.maxSize, nextRight));
  nextLeft = pairTotal - nextRight;

  if (leftC.collapsible && leftC.minSize > leftC.collapsedSize) {
    const mid = (leftC.collapsedSize + leftC.minSize) / 2;
    if (nextLeft < leftC.minSize) {
      nextLeft = nextLeft <= mid ? leftC.collapsedSize : Math.min(leftC.minSize, pairTotal - rightFloor);
      nextRight = pairTotal - nextLeft;
    }
  }

  if (rightC.collapsible && rightC.minSize > rightC.collapsedSize) {
    const mid = (rightC.collapsedSize + rightC.minSize) / 2;
    if (nextRight < rightC.minSize) {
      nextRight = nextRight <= mid ? rightC.collapsedSize : Math.min(rightC.minSize, pairTotal - leftFloor);
      nextLeft = pairTotal - nextRight;
    }
  }

  return [Number(nextLeft.toFixed(2)), Number(nextRight.toFixed(2))];
}

type StoredGroupState = {
  sizes?: number[];
  pxSizes?: Record<string, number>;
};

/**
 * 可调分栏容器（对齐 affectUI ResizablePanelGroup）：
 * - 支持纯百分比分栏与多栏像素限位 + 中间 `flex: 1` 混合分栏模式；
 * - 支持水平/垂直任意嵌套、指针 1:1 跟手拖拽、低于最小宽度自动磁吸折叠、双击分隔线复位默认宽度、Enter 展开/收拢切换与 `storageKey` 本地持久化。
 */
export const AfResizableGroup = forwardRef<HTMLDivElement, AfResizableGroupProps>(function AfResizableGroup(
  {
    direction = "horizontal",
    sizes: sizesProp,
    defaultSizes,
    onSizesChange,
    onLayout,
    onPixelSizesChange,
    keyboardStep = 5,
    storageKey,
    className,
    children,
    ...rest
  } = {},
  forwardedRef,
) {
  const fullStorageKey = storageKey ? `af-resizable:${storageKey}` : undefined;
  const groupRef = useRef<HTMLDivElement>(null);
  const lastOpenSizesRef = useRef<Record<number, number>>({});
  const lastOpenPxRef = useRef<Record<number, number>>({});
  const snapTimerRef = useRef<number | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  const triggerSnapGlide = useCallback(() => {
    if (typeof window === "undefined") return;
    setSnapping(true);
    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      setSnapping(false);
      snapTimerRef.current = null;
    }, 240);
  }, []);

  const { decoratedChildren, constraints, hasPixelMode } = useMemo(() => {
    const list = Children.toArray(children);
    const rawPanelProps: AfResizablePanelProps[] = [];
    list.forEach((child) => {
      if (!isValidElement(child)) return;
      if ((child.type as { displayName?: string }).displayName === PANEL_TAG) {
        rawPanelProps.push(child.props as AfResizablePanelProps);
      }
    });

    const anyExplicitPixel = rawPanelProps.some(
      (p) =>
        p.flex ||
        p.defaultWidthPx !== undefined ||
        p.defaultSizePx !== undefined ||
        p.minWidthPx !== undefined ||
        p.minSizePx !== undefined ||
        p.maxWidthPx !== undefined ||
        p.maxSizePx !== undefined,
    );

    const panelConstraints: PanelConstraint[] = [];
    let panelIdx = 0;
    let handleIdx = 0;

    const mapped = list.map((child) => {
      if (!isValidElement(child)) return child;
      const typeName = (child.type as { displayName?: string }).displayName;
      if (typeName === PANEL_TAG) {
        const props = child.props as AfResizablePanelProps;
        const explicitPx = props.defaultWidthPx ?? props.defaultSizePx;
        const minPx = props.minWidthPx ?? props.minSizePx ?? 140;
        const maxPx = props.maxWidthPx ?? props.maxSizePx ?? 640;
        const collapsedPx = props.collapsedWidthPx ?? props.collapsedSizePx ?? 0;
        const isFlexPane =
          anyExplicitPixel &&
          (Boolean(props.flex) ||
            (explicitPx === undefined &&
              props.minWidthPx === undefined &&
              props.minSizePx === undefined &&
              props.maxWidthPx === undefined &&
              props.maxSizePx === undefined));
        const mode: PanelConstraint["mode"] = !anyExplicitPixel
          ? "percent"
          : isFlexPane
            ? "flex"
            : "pixel";

        panelConstraints.push({
          mode,
          defaultSize: props.defaultSize,
          minSize: props.minSize ?? 15,
          maxSize: props.maxSize ?? 85,
          collapsible: Boolean(props.collapsible),
          collapsedSize: props.collapsedSize ?? 0,
          defaultPx: explicitPx ?? Math.max(minPx, 240),
          minPx,
          maxPx: Math.max(minPx, maxPx),
          collapsedPx,
          defaultCollapsed: Boolean(props.defaultCollapsed),
          onCollapseChange: props.onCollapseChange,
        });
        const cloned = cloneElement(child as ReactElement<AfResizablePanelProps>, {
          _panelIndex: panelIdx,
        });
        panelIdx += 1;
        return cloned;
      }
      if (typeName === HANDLE_TAG) {
        const cloned = cloneElement(child as ReactElement<AfResizableHandleProps>, {
          _handleIndex: handleIdx,
        });
        handleIdx += 1;
        return cloned;
      }
      return child;
    });

    return { decoratedChildren: mapped, constraints: panelConstraints, hasPixelMode: anyExplicitPixel };
  }, [children]);

  const storedInitial = useMemo(() => readResizableStorage<StoredGroupState>(fullStorageKey), [fullStorageKey]);

  const initialSizes = useMemo(() => {
    if (storedInitial?.sizes && storedInitial.sizes.length === constraints.length) {
      return storedInitial.sizes;
    }
    return normalizeInitialSizes(constraints, defaultSizes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constraints.length]);

  const [sizes, setSizes] = useControllableState<number[]>({
    value: sizesProp,
    defaultValue: initialSizes,
    onChange: (next) => {
      onSizesChange?.(next);
      onLayout?.(next);
      if (fullStorageKey && !hasPixelMode) {
        writeResizableStorage(fullStorageKey, { sizes: next });
      }
    },
  });

  const [pxSizes, setPxSizes] = useState<Record<number, number>>(() => {
    const defaults = buildInitialPxMap(constraints);
    if (storedInitial?.pxSizes) {
      for (const [k, val] of Object.entries(storedInitial.pxSizes)) {
        const idx = Number(k);
        if (Number.isFinite(idx) && typeof val === "number" && constraints[idx]?.mode === "pixel") {
          defaults[idx] = clampSnapPx(val, constraints[idx]);
        }
      }
    }
    return defaults;
  });

  const updatePxSizes = useCallback(
    (updater: (prev: Record<number, number>) => Record<number, number>) => {
      setPxSizes((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        onPixelSizesChange?.(next);
        if (fullStorageKey) {
          writeResizableStorage(fullStorageKey, { pxSizes: next });
        }
        return next;
      });
    },
    [fullStorageKey, onPixelSizesChange],
  );

  const resolvedSizes = sizes.length === constraints.length ? sizes : normalizeInitialSizes(constraints, defaultSizes);

  // 触发可折叠面板变化通知
  const prevCollapsedMapRef = useRef<Record<number, boolean>>({});
  useEffect(() => {
    constraints.forEach((c, idx) => {
      if (!c.collapsible) return;
      const isCol =
        c.mode === "pixel"
          ? (pxSizes[idx] ?? c.defaultPx) <= c.collapsedPx + 1
          : (resolvedSizes[idx] ?? 50) <= c.collapsedSize + 0.5;
      if (prevCollapsedMapRef.current[idx] !== undefined && prevCollapsedMapRef.current[idx] !== isCol) {
        c.onCollapseChange?.(isCol);
      }
      prevCollapsedMapRef.current[idx] = isCol;
    });
  }, [constraints, pxSizes, resolvedSizes]);

  const moveSplitter = useCallback(
    (handleIndex: number, deltaPercent: number, deltaPixels: number, fromDrag = false) => {
      if (handleIndex < 0 || handleIndex >= constraints.length - 1) return;
      if (!fromDrag) triggerSnapGlide();

      if (hasPixelMode) {
        const leftC = constraints[handleIndex];
        const rightC = constraints[handleIndex + 1];
        const hasAnyFlex = constraints.some((c) => c.mode === "flex");

        updatePxSizes((prev) => {
          const next = { ...prev };
          if (leftC.mode === "pixel" && (rightC.mode === "flex" || hasAnyFlex)) {
            const cur = next[handleIndex] ?? leftC.defaultPx;
            if (cur >= leftC.minPx) lastOpenPxRef.current[handleIndex] = cur;
            const updated = clampSnapPx(cur + deltaPixels, leftC);
            if (updated === cur) return prev;
            next[handleIndex] = updated;
            return next;
          }
          if (leftC.mode === "flex" && rightC.mode === "pixel") {
            const rightIdx = handleIndex + 1;
            const cur = next[rightIdx] ?? rightC.defaultPx;
            if (cur >= rightC.minPx) lastOpenPxRef.current[rightIdx] = cur;
            const updated = clampSnapPx(cur - deltaPixels, rightC);
            if (updated === cur) return prev;
            next[rightIdx] = updated;
            return next;
          }
          if (leftC.mode === "pixel" && rightC.mode === "pixel") {
            const curL = next[handleIndex] ?? leftC.defaultPx;
            const curR = next[handleIndex + 1] ?? rightC.defaultPx;
            if (curL >= leftC.minPx) lastOpenPxRef.current[handleIndex] = curL;
            if (curR >= rightC.minPx) lastOpenPxRef.current[handleIndex + 1] = curR;
            const pairSum = curL + curR;
            const nextL = clampSnapPx(curL + deltaPixels, leftC);
            const nextR = clampSnapPx(pairSum - nextL, rightC);
            const settledL = pairSum - nextR;
            if (settledL === curL && nextR === curR) return prev;
            next[handleIndex] = settledL;
            next[handleIndex + 1] = nextR;
            return next;
          }
          return prev;
        });
        return;
      }

      setSizes((prev) => {
        const base = prev.length === constraints.length ? [...prev] : normalizeInitialSizes(constraints, defaultSizes);
        const leftC = constraints[handleIndex];
        const rightC = constraints[handleIndex + 1];
        if (base[handleIndex] >= leftC.minSize) {
          lastOpenSizesRef.current[handleIndex] = base[handleIndex];
        }
        if (base[handleIndex + 1] >= rightC.minSize) {
          lastOpenSizesRef.current[handleIndex + 1] = base[handleIndex + 1];
        }
        const [nextLeft, nextRight] = applyPairMove(
          base[handleIndex],
          base[handleIndex + 1],
          leftC,
          rightC,
          deltaPercent,
        );
        if (Math.abs(nextLeft - base[handleIndex]) < 0.01) return base;
        base[handleIndex] = nextLeft;
        base[handleIndex + 1] = nextRight;
        return base;
      });
    },
    [constraints, defaultSizes, hasPixelMode, setSizes, triggerSnapGlide, updatePxSizes],
  );

  const jumpSplitter = useCallback(
    (handleIndex: number, target: "min" | "max" | "reset" | "toggle") => {
      if (handleIndex < 0 || handleIndex >= constraints.length - 1) return;
      triggerSnapGlide();

      if (hasPixelMode) {
        const leftC = constraints[handleIndex];
        const rightC = constraints[handleIndex + 1];
        if (target === "reset") {
          updatePxSizes(() => buildInitialPxMap(constraints));
          return;
        }
        if (target === "toggle") {
          const targetIdx =
            leftC.mode === "pixel" && leftC.collapsible
              ? handleIndex
              : rightC.mode === "pixel" && rightC.collapsible
                ? handleIndex + 1
                : -1;
          if (targetIdx === -1) {
            updatePxSizes(() => buildInitialPxMap(constraints));
            return;
          }
          const c = constraints[targetIdx];
          updatePxSizes((prev) => {
            const cur = prev[targetIdx] ?? c.defaultPx;
            const isCollapsed = cur <= c.collapsedPx + 1;
            const next = { ...prev };
            if (isCollapsed) {
              next[targetIdx] = Math.min(
                c.maxPx,
                Math.max(c.minPx, lastOpenPxRef.current[targetIdx] ?? c.defaultPx),
              );
            } else {
              lastOpenPxRef.current[targetIdx] = cur;
              next[targetIdx] = c.collapsedPx;
            }
            return next;
          });
          return;
        }
        const extreme = target === "min" ? -10000 : 10000;
        moveSplitter(handleIndex, 0, extreme, false);
        return;
      }

      if (target === "reset") {
        setSizes(normalizeInitialSizes(constraints, defaultSizes));
        return;
      }
      if (target === "toggle") {
        const leftC = constraints[handleIndex];
        const rightC = constraints[handleIndex + 1];
        if (!leftC.collapsible && !rightC.collapsible) {
          setSizes(normalizeInitialSizes(constraints, defaultSizes));
          return;
        }
        setSizes((prev) => {
          const base = prev.length === constraints.length ? [...prev] : normalizeInitialSizes(constraints, defaultSizes);
          const defaults = normalizeInitialSizes(constraints, defaultSizes);
          const collapseIdx = leftC.collapsible ? handleIndex : handleIndex + 1;
          const otherIdx = collapseIdx === handleIndex ? handleIndex + 1 : handleIndex;
          const c = constraints[collapseIdx];
          const otherC = constraints[otherIdx];
          const pairTotal = base[handleIndex] + base[handleIndex + 1];
          const isCollapsed = base[collapseIdx] <= c.collapsedSize + 0.5;

          if (isCollapsed) {
            const desired = Math.max(
              c.minSize,
              Math.min(c.maxSize, lastOpenSizesRef.current[collapseIdx] ?? defaults[collapseIdx] ?? c.minSize),
            );
            const nextOther = Math.max(otherC.minSize, pairTotal - desired);
            base[otherIdx] = Number(nextOther.toFixed(2));
            base[collapseIdx] = Number((pairTotal - nextOther).toFixed(2));
          } else {
            lastOpenSizesRef.current[collapseIdx] = base[collapseIdx];
            const nextCollapsed = c.collapsedSize;
            base[collapseIdx] = Number(nextCollapsed.toFixed(2));
            base[otherIdx] = Number((pairTotal - nextCollapsed).toFixed(2));
          }
          return base;
        });
        return;
      }
      const requested = target === "min" ? -100 : 100;
      moveSplitter(handleIndex, requested, 0, false);
    },
    [constraints, defaultSizes, hasPixelMode, moveSplitter, setSizes, triggerSnapGlide, updatePxSizes],
  );

  const getGroupPixelSpan = useCallback(() => {
    const el = groupRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return direction === "horizontal" ? rect.width : rect.height;
  }, [direction]);

  const ctx = useMemo<ResizableContextValue>(
    () => ({
      direction,
      hasPixelMode,
      sizes: resolvedSizes,
      pxSizes,
      constraints,
      keyboardStep,
      moveSplitter,
      jumpSplitter,
      getGroupPixelSpan,
      setDraggingState: setDragging,
    }),
    [
      direction,
      hasPixelMode,
      resolvedSizes,
      pxSizes,
      constraints,
      keyboardStep,
      moveSplitter,
      jumpSplitter,
      getGroupPixelSpan,
    ],
  );

  return (
    <ResizableContext.Provider value={ctx}>
      <div
        ref={composeRefs(groupRef, forwardedRef)}
        className={cn("af-resizable", className)}
        data-direction={direction}
        data-mode={hasPixelMode ? "pixel" : "percent"}
        data-snap={snapping || undefined}
        data-dragging={dragging || undefined}
        {...rest}
      >
        {decoratedChildren}
      </div>
    </ResizableContext.Provider>
  );
});

export const AfResizablePanelGroup = AfResizableGroup;

/** 可调分栏面板单元。 */
export const AfResizablePanel = forwardRef<HTMLDivElement, AfResizablePanelProps>(function AfResizablePanel(
  {
    defaultSize,
    minSize,
    maxSize,
    defaultWidthPx,
    defaultSizePx,
    minWidthPx,
    minSizePx,
    maxWidthPx,
    maxSizePx,
    collapsedWidthPx,
    collapsedSizePx,
    flex,
    defaultCollapsed,
    collapsible = false,
    collapsedSize = 0,
    onCollapseChange,
    _panelIndex = 0,
    className,
    style,
    children,
    ...rest
  } = {},
  forwardedRef,
) {
  const ctx = useContext(ResizableContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const constraint = ctx?.constraints[_panelIndex];

  const isPixelPane = constraint?.mode === "pixel";
  const isFlexPane = constraint?.mode === "flex";
  const pxVal = isPixelPane ? (ctx?.pxSizes[_panelIndex] ?? defaultWidthPx ?? defaultSizePx ?? 240) : 0;
  const collapsedPxVal = collapsedWidthPx ?? collapsedSizePx ?? 0;

  const pct = ctx?.sizes[_panelIndex] ?? defaultSize ?? 50;
  const isCollapsed = isPixelPane
    ? collapsible && pxVal <= collapsedPxVal + 1
    : !isFlexPane && collapsible && pct <= collapsedSize + 0.5;
  const isZeroCollapsed = isPixelPane
    ? isCollapsed && collapsedPxVal <= 1
    : isCollapsed && collapsedSize <= 0.5;

  useIsomorphicLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.inert = isZeroCollapsed;
  }, [isZeroCollapsed]);

  const panelStyle: CSSProperties = isPixelPane
    ? {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: `${pxVal}px`,
        minWidth: 0,
        minHeight: 0,
        ...(isZeroCollapsed ? { overflow: "hidden", padding: 0, borderWidth: 0 } : null),
        ...style,
      }
    : isFlexPane
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: "0%",
          minWidth: 0,
          minHeight: 0,
          ...style,
        }
      : {
          flexGrow: pct,
          flexShrink: 1,
          flexBasis: "0%",
          ...style,
        };

  void minSize;
  void maxSize;
  void minWidthPx;
  void minSizePx;
  void maxWidthPx;
  void maxSizePx;
  void defaultCollapsed;
  void onCollapseChange;

  return (
    <div
      ref={composeRefs(panelRef, forwardedRef)}
      className={cn("af-resizable__panel", className)}
      data-collapsed={isCollapsed || undefined}
      data-pane-mode={constraint?.mode}
      aria-hidden={isZeroCollapsed || undefined}
      style={panelStyle}
      {...rest}
    >
      {children}
    </div>
  );
});
AfResizablePanel.displayName = PANEL_TAG;

/** 可调分栏拖拽柄：具备标准 WAI-ARIA `role="separator"` 键盘、双击复位、Enter 折叠切换与 12px 隐形热区。 */
export const AfResizableHandle = forwardRef<HTMLDivElement, AfResizableHandleProps>(function AfResizableHandle(
  {
    withHandle = false,
    disabled = false,
    label = "Resize panels",
    _handleIndex = 0,
    className,
    onPointerDown,
    onKeyDown,
    onDoubleClick,
    ...rest
  } = {},
  ref,
) {
  const ctx = useContext(ResizableContext);
  const dragOriginRef = useRef<{ startCoord: number } | null>(null);

  const direction = ctx?.direction ?? "horizontal";
  const leftC = ctx?.constraints[_handleIndex];
  const rightC = ctx?.constraints[_handleIndex + 1];
  const activePixelIdx =
    leftC?.mode === "pixel" ? _handleIndex : rightC?.mode === "pixel" ? _handleIndex + 1 : -1;
  const activePixelConstraint = activePixelIdx >= 0 ? ctx?.constraints[activePixelIdx] : undefined;

  const valueNow = activePixelConstraint
    ? (ctx?.pxSizes[activePixelIdx] ?? activePixelConstraint.defaultPx)
    : (ctx?.sizes[_handleIndex] ?? 50);
  const valueMin = activePixelConstraint
    ? activePixelConstraint.collapsible
      ? activePixelConstraint.collapsedPx
      : activePixelConstraint.minPx
    : leftC?.collapsible
      ? leftC.collapsedSize
      : (leftC?.minSize ?? 15);
  const valueMax = activePixelConstraint ? activePixelConstraint.maxPx : (leftC?.maxSize ?? 85);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || !ctx || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    target.dataset.dragging = "true";
    ctx.setDraggingState(true);
    dragOriginRef.current = {
      startCoord: direction === "horizontal" ? event.clientX : event.clientY,
    };
    let lastCoord = dragOriginRef.current.startCoord;

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragOriginRef.current) return;
      const currentPos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const deltaPx = currentPos - lastCoord;
      if (ctx.hasPixelMode) {
        if (Math.abs(deltaPx) >= 1) {
          lastCoord = currentPos;
          ctx.moveSplitter(_handleIndex, 0, deltaPx, true);
        }
        return;
      }
      const span = ctx.getGroupPixelSpan();
      if (span <= 0) return;
      const deltaPct = (deltaPx / span) * 100;
      if (Math.abs(deltaPct) >= 0.1) {
        lastCoord = currentPos;
        ctx.moveSplitter(_handleIndex, deltaPct, deltaPx, true);
      }
    };

    const onUp = () => {
      dragOriginRef.current = null;
      delete target.dataset.dragging;
      ctx.setDraggingState(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (disabled || !ctx || event.defaultPrevented) return;
    const baseStep = ctx.keyboardStep || 5;
    const stepPct = event.shiftKey ? baseStep * 2 : baseStep;
    const stepPx = event.shiftKey ? 32 : 16;
    const isHorizontal = direction === "horizontal";

    if ((isHorizontal && event.key === "ArrowLeft") || (!isHorizontal && event.key === "ArrowUp")) {
      event.preventDefault();
      ctx.moveSplitter(_handleIndex, -stepPct, -stepPx, false);
    } else if ((isHorizontal && event.key === "ArrowRight") || (!isHorizontal && event.key === "ArrowDown")) {
      event.preventDefault();
      ctx.moveSplitter(_handleIndex, stepPct, stepPx, false);
    } else if (event.key === "Home") {
      event.preventDefault();
      ctx.jumpSplitter(_handleIndex, "min");
    } else if (event.key === "End") {
      event.preventDefault();
      ctx.jumpSplitter(_handleIndex, "max");
    } else if (event.key === "Enter") {
      event.preventDefault();
      ctx.jumpSplitter(_handleIndex, "toggle");
    }
  };

  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={Math.round(valueMin)}
      aria-valuemax={Math.round(valueMax)}
      aria-disabled={disabled || undefined}
      className={cn("af-resizable__handle", className)}
      data-direction={direction}
      data-with-handle={withHandle || undefined}
      data-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        if (!disabled) ctx?.jumpSplitter(_handleIndex, "reset");
      }}
      {...rest}
    >
      {withHandle ? <span className="af-resizable__grip" aria-hidden="true" /> : null}
    </div>
  );
});
AfResizableHandle.displayName = HANDLE_TAG;

/** 像素分割器面板属性（供 `AfSplitter.Panel` 使用）。 */
export type AfSplitterPanelProps = ComponentPropsWithoutRef<"div"> & {
  children?: ReactNode;
};

/** 像素分割器面板单元。 */
export const AfSplitterPanel = forwardRef<HTMLDivElement, AfSplitterPanelProps>(function AfSplitterPanel(
  { className, children, ...rest } = {},
  ref,
) {
  return (
    <div ref={ref} className={cn("af-splitter__panel", className)} {...rest}>
      {children}
    </div>
  );
});

/** 像素受控分割器属性（兼容 `Splitter` 契约，支持固定像素首栏 + 弹性余宽次栏）。 */
export type AfSplitterProps = Omit<ComponentPropsWithoutRef<"div">, "onChange" | "value" | "defaultValue"> & {
  /** 方向，默认 horizontal（左右分栏）。 */
  direction?: AfResizableDirection;
  /** 受控主栏像素值。 */
  value?: number;
  /** 受控主栏像素值别名。 */
  size?: number;
  /** 非受控初始主栏像素值，默认 260。 */
  defaultSize?: number;
  /** 主栏像素值变化回调。 */
  onChange?: (nextPx: number) => void;
  /** 主栏像素值变化回调别名。 */
  onSizeChange?: (nextPx: number) => void;
  /** 拖拽实时尺寸变化回调（与 `onChange` 等效）。 */
  onResize?: (nextPx: number) => void;
  /** 拖拽松手、键盘步进或双击复位结束提交回调。 */
  onResizeEnd?: (finalPx: number) => void;
  /** 主栏最小像素，默认 120。 */
  min?: number;
  /** 主栏最大像素，默认 720。 */
  max?: number;
  /** 次栏最小像素尺寸（可选，默认 0）。 */
  secondMin?: number;
  /** 哪一侧承接像素尺寸（默认 start：左或上；end：右或下）。 */
  side?: "start" | "end";
  /** 受控是否折叠主栏到 0px。 */
  collapsed?: boolean;
  /** 非受控初始是否折叠。 */
  defaultCollapsed?: boolean;
  /** 是否允许拖过最小宽度半程自动吸附折叠（保留拖拽柄供双击/拖拽恢复）。 */
  collapsible?: boolean;
  /** 折叠状态变化回调。 */
  onCollapseChange?: (collapsed: boolean) => void;
  /** 本地持久化键名（自动将像素宽度与折叠态保存至 `localStorage`）。 */
  storageKey?: string;
  /** 是否禁用拖拽柄。 */
  disabled?: boolean;
  /** 拖拽柄无障碍标签。 */
  label?: string;
  /** 第一面板（未传时读取前两个 children）。 */
  first?: ReactNode;
  /** 第二面板。 */
  second?: ReactNode;
  /** 第一面板容器附加类名。 */
  firstPaneClassName?: string;
  /** 第一面板容器附加样式。 */
  firstPaneStyle?: CSSProperties;
  /** 第二面板容器附加类名。 */
  secondPaneClassName?: string;
  /** 第二面板容器附加样式。 */
  secondPaneStyle?: CSSProperties;
  /** 拖拽分隔条附加类名。 */
  handleClassName?: string;
  /** 自定义拖拽分隔条内部握把节点。 */
  handle?: ReactNode;
  /** 拖拽分隔条透传 HTML 属性。 */
  handleProps?: ComponentPropsWithoutRef<"div">;
};

function clampPixel(value: number, min: number, max: number) {
  return Math.round(Math.min(Math.max(value, min), max));
}

const AfSplitterBase = forwardRef<HTMLDivElement, AfSplitterProps>(function AfSplitter(
  {
    direction = "horizontal",
    value,
    size,
    defaultSize = 260,
    onChange,
    onSizeChange,
    onResize,
    onResizeEnd,
    min = 120,
    max = 720,
    secondMin = 0,
    side = "start",
    collapsed: collapsedProp,
    defaultCollapsed = false,
    collapsible = false,
    onCollapseChange,
    storageKey,
    disabled = false,
    label = "调整分栏宽度",
    first,
    second,
    firstPaneClassName,
    firstPaneStyle,
    secondPaneClassName,
    secondPaneStyle,
    handleClassName,
    handle: customHandle,
    handleProps,
    children,
    className,
    ...rest
  } = {},
  forwardedRef,
) {
  const fullStorageKey = storageKey ? `af-splitter:${storageKey}` : undefined;
  const stored = useMemo(
    () => readResizableStorage<{ px?: number; collapsed?: boolean }>(fullStorageKey),
    [fullStorageKey],
  );

  const controlledPx = value ?? size;
  const [innerPx, setInnerPx] = useControllableState<number>({
    value: controlledPx,
    defaultValue: clampPixel(stored?.px ?? defaultSize, min, max),
    onChange: (next) => {
      onChange?.(next);
      onSizeChange?.(next);
      onResize?.(next);
    },
  });

  const [isCollapsed, setIsCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: stored?.collapsed ?? defaultCollapsed,
    onChange: onCollapseChange,
  });

  const resolvedPx = clampPixel(innerPx, min, max);
  const childList = Children.toArray(children);
  const firstNode = first ?? childList[0] ?? null;
  const secondNode = second ?? childList[1] ?? null;
  const dragRef = useRef<{ originPos: number; originSize: number } | null>(null);
  const latestPxRef = useRef(resolvedPx);
  latestPxRef.current = isCollapsed ? 0 : resolvedPx;
  const firstPaneRef = useRef<HTMLDivElement>(null);
  const secondPaneRef = useRef<HTMLDivElement>(null);

  const persistSplitter = (nextPx: number, nextCollapsed: boolean) => {
    if (fullStorageKey) {
      writeResizableStorage(fullStorageKey, { px: nextPx, collapsed: nextCollapsed });
    }
  };

  const commitPx = (next: number, nextCol = isCollapsed, emitEnd = false) => {
    const clamped = clampPixel(next, min, max);
    latestPxRef.current = nextCol ? 0 : clamped;
    setInnerPx(clamped);
    if (nextCol !== isCollapsed) setIsCollapsed(nextCol);
    persistSplitter(clamped, nextCol);
    if (emitEnd) onResizeEnd?.(nextCol ? 0 : clamped);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    handleProps?.onPointerDown?.(event);
    if (event.defaultPrevented || disabled || (isCollapsed && !collapsible) || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    target.dataset.dragging = "true";
    dragRef.current = {
      originPos: direction === "horizontal" ? event.clientX : event.clientY,
      originSize: isCollapsed ? 0 : resolvedPx,
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragRef.current) return;
      const pos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const delta = pos - dragRef.current.originPos;
      const signedDelta = side === "end" ? -delta : delta;
      const candidate = dragRef.current.originSize + signedDelta;

      if (collapsible && candidate < min) {
        if (candidate <= min / 2) {
          if (!isCollapsed) {
            latestPxRef.current = 0;
            setIsCollapsed(true);
            persistSplitter(resolvedPx, true);
          }
          return;
        }
        commitPx(min, false);
        return;
      }
      commitPx(candidate, false);
    };

    const onUp = () => {
      dragRef.current = null;
      delete target.dataset.dragging;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      onResizeEnd?.(latestPxRef.current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    handleProps?.onKeyDown?.(event);
    if (disabled || (isCollapsed && !collapsible) || event.defaultPrevented) return;
    const step = event.shiftKey ? 24 : 8;
    const sign = side === "end" ? -1 : 1;
    const isH = direction === "horizontal";
    if ((isH && event.key === "ArrowLeft") || (!isH && event.key === "ArrowUp")) {
      event.preventDefault();
      commitPx(resolvedPx - step * sign, false, true);
    } else if ((isH && event.key === "ArrowRight") || (!isH && event.key === "ArrowDown")) {
      event.preventDefault();
      commitPx(resolvedPx + step * sign, false, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      commitPx(min, false, true);
    } else if (event.key === "End") {
      event.preventDefault();
      commitPx(max, false, true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (collapsible) {
        const nextCol = !isCollapsed;
        setIsCollapsed(nextCol);
        persistSplitter(resolvedPx, nextCol);
        onResizeEnd?.(nextCol ? 0 : resolvedPx);
      } else {
        commitPx(defaultSize, false, true);
      }
    }
  };

  const primaryBasis = isCollapsed ? 0 : resolvedPx;
  const firstCollapsed = side === "start" && isCollapsed;
  const secondCollapsed = side === "end" && isCollapsed;
  const showSeparator = !isCollapsed || collapsible;

  useIsomorphicLayoutEffect(() => {
    if (firstPaneRef.current) firstPaneRef.current.inert = firstCollapsed;
    if (secondPaneRef.current) secondPaneRef.current.inert = secondCollapsed;
  }, [firstCollapsed, secondCollapsed]);

  const fluidMinProp = direction === "horizontal" ? { minWidth: secondMin } : { minHeight: secondMin };

  const primaryStyle: CSSProperties =
    side === "start"
      ? {
          flex: `0 0 ${primaryBasis}px`,
          minWidth: 0,
          minHeight: 0,
          overflow: isCollapsed ? "hidden" : undefined,
          ...(isCollapsed ? { padding: 0, borderWidth: 0 } : null),
          ...firstPaneStyle,
        }
      : { flex: "1 1 0%", minWidth: 0, minHeight: 0, ...fluidMinProp, ...firstPaneStyle };
  const secondaryStyle: CSSProperties =
    side === "end"
      ? {
          flex: `0 0 ${primaryBasis}px`,
          minWidth: 0,
          minHeight: 0,
          overflow: isCollapsed ? "hidden" : undefined,
          ...(isCollapsed ? { padding: 0, borderWidth: 0 } : null),
          ...secondPaneStyle,
        }
      : { flex: "1 1 0%", minWidth: 0, minHeight: 0, ...fluidMinProp, ...secondPaneStyle };

  return (
    <div
      ref={forwardedRef}
      className={cn("af-resizable af-splitter", className)}
      data-direction={direction}
      data-collapsed={isCollapsed || undefined}
      {...rest}
    >
      <div
        ref={firstPaneRef}
        className={cn("af-splitter__pane", firstPaneClassName)}
        data-role={side === "start" ? "primary" : "fluid"}
        data-collapsed={firstCollapsed || undefined}
        aria-hidden={firstCollapsed || undefined}
        style={primaryStyle}
      >
        {firstNode}
      </div>
      {showSeparator ? (
        <div
          {...handleProps}
          role="separator"
          tabIndex={disabled ? -1 : (handleProps?.tabIndex ?? 0)}
          aria-label={handleProps?.["aria-label"] ?? label}
          aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
          aria-valuenow={primaryBasis}
          aria-valuemin={collapsible ? 0 : min}
          aria-valuemax={max}
          aria-disabled={disabled || undefined}
          className={cn("af-resizable__handle af-splitter__handle", handleProps?.className, handleClassName)}
          data-direction={direction}
          data-with-handle="true"
          data-disabled={disabled || undefined}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onDoubleClick={(event) => {
            handleProps?.onDoubleClick?.(event);
            if (!event.defaultPrevented && !disabled) commitPx(defaultSize, false, true);
          }}
        >
          {customHandle ?? <span className="af-resizable__grip" aria-hidden="true" />}
        </div>
      ) : null}
      <div
        ref={secondPaneRef}
        className={cn("af-splitter__pane", secondPaneClassName)}
        data-role={side === "end" ? "primary" : "fluid"}
        data-collapsed={secondCollapsed || undefined}
        aria-hidden={secondCollapsed || undefined}
        style={secondaryStyle}
      >
        {secondNode}
      </div>
    </div>
  );
});

/** 像素受控分栏器：支持受控 px、拖过半程自动折叠、双击复位与 `storageKey` 持久化（兼容 `Splitter` 组件契约）。 */
export const AfSplitter = Object.assign(AfSplitterBase, {
  Panel: AfSplitterPanel,
});
