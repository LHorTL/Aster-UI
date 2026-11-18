import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "./cn";

export type UseListFlipOptions = {
  /** 参与位移测量的子元素选择器，默认 `"[data-flip]"`。 */
  selector?: string;
  /** 补位动画时长（毫秒），默认 `260`。 */
  duration?: number;
  /** 补位缓动曲线，默认 `"cubic-bezier(0.22, 1, 0.36, 1)"`。 */
  easing?: string;
  /** 位移测量轴向，默认 `"both"`（同时支持纵向升位与跨列二维平移）。 */
  axis?: "both" | "x" | "y";
  /** 禁用补位动画。 */
  disabled?: boolean;
  /** 可选重排签名：传入且此前调用过 `capture()` 时，在提交后自动执行补位动画。 */
  signature?: string | number;
};

export type ListFlipController = {
  /** 在状态更新或 DOM 变更前捕获当前所有 `[data-flip]` 子项的屏幕坐标快照。 */
  capture: () => void;
  /** 在 DOM 提交后基于最近一次快照计算二维差值并触发 WAAPI 平滑补位。 */
  play: (
    overrideOptions?: Partial<Pick<UseListFlipOptions, "duration" | "easing" | "axis">> & {
      customOrigins?: ReadonlyMap<string, { left: number; top: number; duration?: number; easing?: string }>;
    },
  ) => void;
  /** 立即取消所有进行中的补位动画并清空待消费快照。 */
  cancel: () => void;
};

type FlipPoint = {
  left: number;
  top: number;
};

const DEFAULT_FLIP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * 二维列表与看板 FLIP 补位原语：
 * - 优先按非空 `data-flip="<id>"` 匹配（原生支持跨列移动或重挂载节点），对裸 `data-flip` 自动回退至 DOM 引用匹配；
 * - 支持半途连续打断：在取消旧 WAAPI 动画前先读取实时视觉位置作为新起点，杜绝闪跳；
 * - 同时支持手动 `flip.play()` 与提交后 `useIsomorphicLayoutEffect` 自动触发，严格遵守 `prefers-reduced-motion`。
 */
export function useListFlip(
  ref: RefObject<HTMLElement | null>,
  options: UseListFlipOptions = {},
): ListFlipController {
  const {
    selector = "[data-flip]",
    duration = 260,
    easing = DEFAULT_FLIP_EASING,
    axis = "both",
    disabled = false,
    signature,
  } = options;

  const keyedSnapshotRef = useRef<Map<string, FlipPoint>>(new Map());
  const elementSnapshotRef = useRef<Map<HTMLElement, FlipPoint>>(new Map());
  const hasSnapshotRef = useRef(false);
  const runningAnimsRef = useRef<Map<HTMLElement, Animation>>(new Map());

  const cancel = useCallback(() => {
    hasSnapshotRef.current = false;
    keyedSnapshotRef.current.clear();
    elementSnapshotRef.current.clear();
    runningAnimsRef.current.forEach((anim) => {
      try {
        anim.cancel();
      } catch {
        // Ignore environment-specific Animation cancellation errors.
      }
    });
    runningAnimsRef.current.clear();
  }, []);

  const capture = useCallback(() => {
    const root = ref.current;
    keyedSnapshotRef.current = new Map();
    elementSnapshotRef.current = new Map();
    if (!root || disabled || prefersReducedMotion()) {
      hasSnapshotRef.current = false;
      return;
    }
    const nodes = root.querySelectorAll<HTMLElement>(selector);
    nodes.forEach((el) => {
      if (el.getAttribute("data-leaving") === "true") return;
      const rect = el.getBoundingClientRect();
      const point: FlipPoint = { left: rect.left, top: rect.top };
      const key = el.getAttribute("data-flip") ?? "";
      if (key) {
        keyedSnapshotRef.current.set(key, point);
      }
      elementSnapshotRef.current.set(el, point);
    });
    hasSnapshotRef.current = keyedSnapshotRef.current.size > 0 || elementSnapshotRef.current.size > 0;
  }, [disabled, ref, selector]);

  const play = useCallback<ListFlipController["play"]>(
    (overrideOptions) => {
      const customOrigins = overrideOptions?.customOrigins;
      if (!hasSnapshotRef.current && (!customOrigins || customOrigins.size === 0)) {
        return;
      }
      const keyedBefore = keyedSnapshotRef.current;
      const elementBefore = elementSnapshotRef.current;
      hasSnapshotRef.current = false;
      keyedSnapshotRef.current = new Map();
      elementSnapshotRef.current = new Map();

      const root = ref.current;
      if (!root || disabled || prefersReducedMotion()) {
        return;
      }

      const activeDuration = overrideOptions?.duration ?? duration;
      const activeEasing = overrideOptions?.easing ?? easing;
      const activeAxis = overrideOptions?.axis ?? axis;

      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));

      // Cancel in-flight WAAPI animations before measuring resting layout coordinates.
      nodes.forEach((el) => {
        const prior = runningAnimsRef.current.get(el);
        if (prior) {
          try {
            prior.cancel();
          } catch {
            // Ignore
          }
          runningAnimsRef.current.delete(el);
        }
      });

      nodes.forEach((el) => {
        if (
          el.getAttribute("data-leaving") === "true" ||
          el.getAttribute("data-af-dragging") === "true" ||
          el.hasAttribute("data-dragging")
        ) {
          return;
        }
        const rawKey = el.getAttribute("data-flip") ?? "";
        const customOrigin = rawKey && customOrigins ? customOrigins.get(rawKey) : undefined;
        const prev: FlipPoint | undefined =
          customOrigin ??
          (rawKey ? keyedBefore.get(rawKey) ?? elementBefore.get(el) : elementBefore.get(el));
        if (!prev) return;

        const rect = el.getBoundingClientRect();
        const scaleX = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
        const scaleY = el.offsetHeight > 0 ? rect.height / el.offsetHeight : 1;
        const rawDx = activeAxis === "y" ? 0 : (prev.left - rect.left) / (scaleX > 0 ? scaleX : 1);
        const rawDy = activeAxis === "x" ? 0 : (prev.top - rect.top) / (scaleY > 0 ? scaleY : 1);

        if (Math.abs(rawDx) < 0.5 && Math.abs(rawDy) < 0.5) return;
        if (typeof el.animate !== "function") return;

        const itemDuration = customOrigin?.duration ?? activeDuration;
        const itemEasing = customOrigin?.easing ?? activeEasing;
        const prevZIndex = el.style.zIndex;
        if (customOrigin) {
          el.style.zIndex = "10";
        }

        const anim = el.animate(
          [
            { transform: `translate3d(${rawDx}px, ${rawDy}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: itemDuration,
            easing: itemEasing,
          },
        );

        runningAnimsRef.current.set(el, anim);
        const cleanup = () => {
          if (runningAnimsRef.current.get(el) === anim) {
            runningAnimsRef.current.delete(el);
          }
          if (customOrigin) {
            el.style.zIndex = prevZIndex;
          }
        };
        anim.onfinish = cleanup;
        anim.oncancel = cleanup;
      });
    },
    [axis, disabled, duration, easing, ref, selector],
  );

  useIsomorphicLayoutEffect(() => {
    if (hasSnapshotRef.current) {
      play();
    }
  });

  useIsomorphicLayoutEffect(() => {
    if (signature !== undefined && hasSnapshotRef.current) {
      play();
    }
  }, [play, signature]);

  useEffect(() => () => cancel(), [cancel]);

  return useMemo(() => ({ capture, play, cancel }), [cancel, capture, play]);
}

/**
 * 声明式签名驱动 FLIP 快捷 Hook（兼容 `src/ui-pro` 既有调用签名，并升级二维跨容器平滑过渡）：
 * 返回 `capture` 函数，在触发重排状态更新前调用即可。
 */
export function useFlip(
  ref: RefObject<HTMLElement | null>,
  signature?: string | number,
  options?: Omit<UseListFlipOptions, "signature">,
): () => void {
  const controller = useListFlip(ref, {
    duration: 520,
    ...options,
    signature,
  });
  return controller.capture;
}

export type AnimatedListEntry<T> = {
  /** 列表项稳定唯一键。 */
  key: string;
  /** 列表项数据快照（即使外部受控数组已移除，退场窗口期内仍保留最后一次有效快照）。 */
  item: T;
  /** 是否正处于 `180ms–220ms` 退场阶段（对应 DOM `data-leaving="true"`）。 */
  leaving: boolean;
};

export type UseAnimatedListOptions<T> = {
  /** 受控列表数据源；省略时切换为内部非受控状态。 */
  items?: readonly T[];
  /** 非受控初始列表数据。 */
  defaultItems?: readonly T[];
  /** 提取每项稳定唯一键。 */
  getKey: (item: T) => string;
  /** 退场过渡时长（毫秒），默认 `190`（位于 `180ms–220ms` 标准区间）。 */
  exitDuration?: number;
  /** 退场结束后剩余兄弟节点的 FLIP 升位时长（毫秒），默认 `260`。 */
  flipDuration?: number;
  /** 可选外部列表容器 Ref；省略时使用返回对象中的 `listRef`。 */
  containerRef?: RefObject<HTMLElement | null>;
  /** 单项触发移除时回调（点击删除时立即通知外部，退场快照由内部平滑托管）。 */
  onRemove?: (key: string, item: T) => void;
  /** 列表集合变更回调（支持受控与非受控同步）。 */
  onItemsChange?: (nextItems: T[]) => void;
  /** 禁用退场与补位动画。 */
  disabled?: boolean;
};

export type AnimatedListResult<T> = {
  /** 含退场快照项的完整渲染序列（按原槽位顺序保留 `leaving: true` 节点，杜绝 `0ms` 瞬删跳变）。 */
  entries: AnimatedListEntry<T>[];
  /** 当前排除退场项后的有效数据列表。 */
  items: T[];
  /** 当前处于退场过渡中的键值集合。 */
  leavingKeys: ReadonlySet<string>;
  /** 绑定至列表父容器以驱动 `[data-flip]` 升位动画的 Ref。 */
  listRef: RefObject<HTMLElement | null>;
  /** 底层 `useListFlip` 控制器（供手动重排时调用 `flip.capture()`）。 */
  flip: ListFlipController;
  /** 请求平滑移除单个条目（先标 `leaving: true` 退场，到期后 `flip.capture()` 升位）。 */
  requestRemove: (key: string) => void;
  /** 请求平滑批量移除多个条目。 */
  requestRemoveMany: (keys: readonly string[], onSettled?: () => void) => void;
  /** 请求平滑清空全部当前条目。 */
  requestClear: (onSettled?: () => void) => void;
  /** 查询指定键是否正在退场。 */
  isLeaving: (key: string) => boolean;
};

/**
 * 受控与非受控双模列表退场 + FLIP 升位协调器：
 * - 彻底解决受控模式下外部 `items` 数组缩短导致的 `0ms` 瞬删硬切：当外部数组移除某项或调用 `requestRemove` 时，
 *   自动在原索引槽位冻结该项快照并标记 `leaving: true` 维持 `180ms–220ms` 退场动画，退场完成后再执行 `flip.capture()` 驱动兄弟项平滑升位；
 * - 若退场期间同一 `key` 重新回到受控 `items` 中，立即取消退场定时器并无缝恢复显示。
 */
export function useAnimatedList<T>(options: UseAnimatedListOptions<T>): AnimatedListResult<T> {
  const {
    items: controlledItems,
    defaultItems = [],
    getKey,
    exitDuration = 190,
    flipDuration = 260,
    containerRef,
    onRemove,
    onItemsChange,
    disabled = false,
  } = options;

  const isControlled = controlledItems !== undefined;
  const internalRef = useRef<HTMLElement | null>(null);
  const listRef = containerRef ?? internalRef;

  const flip = useListFlip(listRef, {
    duration: flipDuration,
    disabled,
  });

  const [uncontrolledItems, setUncontrolledItems] = useState<T[]>(() => [...defaultItems]);
  const logicalSource = isControlled ? controlledItems : uncontrolledItems;

  const [, bumpRender] = useState(0);
  const forceUpdate = useCallback(() => {
    bumpRender((n) => (n + 1) | 0);
  }, []);

  const manualLeavingRef = useRef<Set<string>>(new Set());
  const retainedGhostsRef = useRef<Map<string, T>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevRenderedOrderRef = useRef<AnimatedListEntry<T>[]>([]);

  const latestCallbacksRef = useRef({ onRemove, onItemsChange, getKey });
  latestCallbacksRef.current = { onRemove, onItemsChange, getKey };

  const currentMap = new Map<string, T>();
  const currentKeys: string[] = [];
  for (const item of logicalSource) {
    const key = getKey(item);
    currentMap.set(key, item);
    currentKeys.push(key);
  }

  const instantMode = disabled || exitDuration <= 0 || prefersReducedMotion();

  // Reconcile external removals synchronously during render so there is zero 1-frame vanish gap.
  if (!instantMode) {
    // 0. Once a manually leaving key has actually disappeared from logicalSource, hand ownership
    //    purely to retainedGhostsRef so a subsequent Undo re-insertion within exitDuration revives it.
    for (const key of Array.from(manualLeavingRef.current)) {
      if (!currentMap.has(key)) {
        manualLeavingRef.current.delete(key);
      }
    }

    // 1. If a retained ghost re-appeared in logicalSource (and wasn't manually leaving), revive it.
    for (const key of currentKeys) {
      if (retainedGhostsRef.current.has(key) && !manualLeavingRef.current.has(key)) {
        retainedGhostsRef.current.delete(key);
        const timer = timersRef.current.get(key);
        if (timer !== undefined) {
          clearTimeout(timer);
          timersRef.current.delete(key);
        }
      }
    }

    // 2. Any previously rendered non-leaving item that vanished from logicalSource becomes a retained leaving ghost.
    for (const prevEntry of prevRenderedOrderRef.current) {
      if (!currentMap.has(prevEntry.key) && !retainedGhostsRef.current.has(prevEntry.key)) {
        retainedGhostsRef.current.set(prevEntry.key, prevEntry.item);
      }
    }
  } else {
    retainedGhostsRef.current.clear();
    manualLeavingRef.current.clear();
  }

  // Merge active logicalSource items with retained leaving ghosts in their original relative slots.
  const entries: AnimatedListEntry<T>[] = [];
  const emitted = new Set<string>();
  const activeGhostKeys = new Set<string>(retainedGhostsRef.current.keys());

  if (activeGhostKeys.size === 0) {
    for (const item of logicalSource) {
      const key = getKey(item);
      if (emitted.has(key)) continue;
      emitted.add(key);
      entries.push({
        key,
        item,
        leaving: manualLeavingRef.current.has(key),
      });
    }
  } else {
    // Anchor ghosts relative to previous rendered order while respecting any new ordering/additions in logicalSource.
    const prevOrder = prevRenderedOrderRef.current;
    let currentCursor = 0;

    for (const prev of prevOrder) {
      if (activeGhostKeys.has(prev.key) && !currentMap.has(prev.key)) {
        if (!emitted.has(prev.key)) {
          emitted.add(prev.key);
          entries.push({
            key: prev.key,
            item: retainedGhostsRef.current.get(prev.key) ?? prev.item,
            leaving: true,
          });
        }
        continue;
      }

      if (currentMap.has(prev.key)) {
        // Emit any newly inserted items in logicalSource that appear before prev.key.
        const targetIdx = currentKeys.indexOf(prev.key, currentCursor);
        if (targetIdx >= currentCursor) {
          for (let i = currentCursor; i <= targetIdx; i += 1) {
            const k = currentKeys[i]!;
            if (emitted.has(k)) continue;
            const it = currentMap.get(k)!;
            emitted.add(k);
            entries.push({
              key: k,
              item: it,
              leaving: manualLeavingRef.current.has(k),
            });
          }
          currentCursor = targetIdx + 1;
        } else if (!emitted.has(prev.key)) {
          emitted.add(prev.key);
          entries.push({
            key: prev.key,
            item: currentMap.get(prev.key)!,
            leaving: manualLeavingRef.current.has(prev.key),
          });
        }
      }
    }

    // Append any remaining items from logicalSource.
    for (let i = 0; i < currentKeys.length; i += 1) {
      const k = currentKeys[i]!;
      if (emitted.has(k)) continue;
      emitted.add(k);
      entries.push({
        key: k,
        item: currentMap.get(k)!,
        leaving: manualLeavingRef.current.has(k),
      });
    }
  }

  prevRenderedOrderRef.current = entries;

  const scheduleExitTimer = useCallback(
    (keysToSchedule: readonly string[], onSettled?: () => void) => {
      const pendingKeys = keysToSchedule.filter((k) => !timersRef.current.has(k));
      if (pendingKeys.length === 0) {
        if (onSettled) {
          setTimeout(onSettled, exitDuration);
        }
        return;
      }

      let remaining = pendingKeys.length;
      for (const key of pendingKeys) {
        const timer = setTimeout(() => {
          timersRef.current.delete(key);
          flip.capture();
          manualLeavingRef.current.delete(key);
          retainedGhostsRef.current.delete(key);
          if (!isControlled) {
            setUncontrolledItems((prev) =>
              prev.filter((it) => latestCallbacksRef.current.getKey(it) !== key),
            );
          } else {
            // Remove from prevRenderedOrderRef so a pruned ghost isn't re-captured on the next render!
            prevRenderedOrderRef.current = prevRenderedOrderRef.current.filter((e) => e.key !== key);
            forceUpdate();
          }
          remaining -= 1;
          if (remaining === 0) {
            onSettled?.();
          }
        }, exitDuration);
        timersRef.current.set(key, timer);
      }
    },
    [exitDuration, flip, forceUpdate, isControlled],
  );

  // Schedule exit timers for any externally removed controlled items captured as ghosts during render.
  useIsomorphicLayoutEffect(() => {
    if (instantMode) return;
    const unscheduledGhosts: string[] = [];
    retainedGhostsRef.current.forEach((_val, key) => {
      if (!timersRef.current.has(key)) {
        unscheduledGhosts.push(key);
      }
    });
    if (unscheduledGhosts.length > 0) {
      scheduleExitTimer(unscheduledGhosts);
    }
  });

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    },
    [],
  );

  const requestRemoveMany = useCallback(
    (keys: readonly string[], onSettled?: () => void) => {
      const uniqueKeys = Array.from(new Set(keys)).filter(
        (k) => currentMap.has(k) || retainedGhostsRef.current.has(k),
      );
      if (uniqueKeys.length === 0) {
        onSettled?.();
        return;
      }

      const keySet = new Set(uniqueKeys);
      const removedPairs: Array<[string, T]> = [];
      for (const k of uniqueKeys) {
        const found = currentMap.get(k) ?? retainedGhostsRef.current.get(k);
        if (found !== undefined) {
          removedPairs.push([k, found]);
        }
      }
      const nextItems = Array.from(logicalSource).filter(
        (it) => !keySet.has(latestCallbacksRef.current.getKey(it)) && !manualLeavingRef.current.has(latestCallbacksRef.current.getKey(it)),
      );

      if (disabled || exitDuration <= 0 || prefersReducedMotion()) {
        flip.capture();
        if (!isControlled) {
          setUncontrolledItems(nextItems);
        }
        for (const [k, item] of removedPairs) {
          latestCallbacksRef.current.onRemove?.(k, item);
        }
        latestCallbacksRef.current.onItemsChange?.(nextItems);
        onSettled?.();
        return;
      }

      for (const [k, item] of removedPairs) {
        manualLeavingRef.current.add(k);
        retainedGhostsRef.current.set(k, item);
      }
      scheduleExitTimer(uniqueKeys, onSettled);
      forceUpdate();

      for (const [k, item] of removedPairs) {
        latestCallbacksRef.current.onRemove?.(k, item);
      }
      latestCallbacksRef.current.onItemsChange?.(nextItems);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, exitDuration, flip, forceUpdate, isControlled, logicalSource, scheduleExitTimer],
  );

  const requestRemove = useCallback(
    (key: string) => {
      requestRemoveMany([key]);
    },
    [requestRemoveMany],
  );

  const requestClear = useCallback(
    (onSettled?: () => void) => {
      const activeKeys = Array.from(logicalSource)
        .map((it) => latestCallbacksRef.current.getKey(it))
        .filter((k) => !manualLeavingRef.current.has(k));
      requestRemoveMany(activeKeys, onSettled);
    },
    [logicalSource, requestRemoveMany],
  );

  const leavingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      if (entry.leaving) set.add(entry.key);
    }
    return set;
  }, [entries]);

  const activeItems = useMemo(
    () => entries.filter((e) => !e.leaving).map((e) => e.item),
    [entries],
  );

  const isLeaving = useCallback((key: string) => leavingKeys.has(key), [leavingKeys]);

  return {
    entries,
    items: activeItems,
    leavingKeys,
    listRef,
    flip,
    requestRemove,
    requestRemoveMany,
    requestClear,
    isLeaving,
  };
}
