import { useCallback, useEffect, useRef, useState } from "react";

export type AfIsolatedTimerEntry = {
  /** 条目唯一标识。 */
  key: string;
  /** 总计时长（ms）。 */
  totalMs: number;
  /** 剩余毫秒数。 */
  remainingMs: number;
  /** 剩余比例 `[0, 1]`（`1` = 满格，`0` = 已耗尽）。 */
  ratio: number;
  /** 该条目是否处于独立悬停暂停态。 */
  paused: boolean;
};

export type UseHoverIsolatedTimersOptions<T> = {
  /** 当前活跃队列条目。 */
  items: readonly T[];
  /** 提取每张卡片唯一键。 */
  getKey: (item: T) => string;
  /** 默认自动关闭倒计时毫秒数，默认 `3000`（传 `<= 0` 表示常驻不自动过期）。 */
  defaultDuration?: number;
  /** 可选按单条目覆盖倒计时毫秒数（返回 `<= 0` 或 `Infinity` 表示该条常驻）。 */
  getDuration?: (item: T) => number | undefined;
  /** 进度采样刷新间隔（ms），默认 `50`。 */
  tickInterval?: number;
  /** 全局暂停开关（如窗口失焦或勿扰预览冻结），默认 `false`。 */
  pausedAll?: boolean;
  /** 某张卡片独立倒计时归零时触发。 */
  onExpire?: (key: string, item: T) => void;
};

export type HoverIsolatedTimersResult = {
  /** 各条目实时倒计时快照字典。 */
  timers: Record<string, AfIsolatedTimerEntry>;
  /** 仅暂停指定卡片的倒计时（其余卡片照常计时）。 */
  pause: (key: string) => void;
  /** 恢复指定卡片的倒计时（从暂停时刻的精确剩余毫秒继续）。 */
  resume: (key: string) => void;
  /** 重置指定卡片为满格时长。 */
  reset: (key: string) => void;
  /** 读取指定卡片剩余比例 `[0, 1]`（未注册时默认返回 `1`）。 */
  getRatio: (key: string) => number;
  /** 读取指定卡片是否处于暂停态。 */
  isPaused: (key: string) => boolean;
  /** 生成直接挂载到单张通知卡片上的悬停隔离属性。 */
  getCardHoverProps: (key: string) => {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
  };
};

type InternalTimerRecord<T> = {
  key: string;
  item: T;
  totalMs: number;
  remainingMs: number;
  lastResumeAt: number;
  paused: boolean;
  expired: boolean;
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * 多卡片并发隔离倒计时池：
 * - 为叠卡栈中每张通知卡维护独立的 `remainingMs` 与 `paused` 状态；
 * - 指针悬停第 2 张卡时仅冻结第 2 张卡计时并保持其进度条静止，第 1、3 张卡照常倒计时到期触发 `onExpire`。
 */
export function useHoverIsolatedTimers<T>({
  items,
  getKey,
  defaultDuration = 3000,
  getDuration,
  tickInterval = 50,
  pausedAll = false,
  onExpire,
}: UseHoverIsolatedTimersOptions<T>): HoverIsolatedTimersResult {
  const storeRef = useRef<Map<string, InternalTimerRecord<T>>>(new Map());
  const callbacksRef = useRef({ getKey, getDuration, onExpire });
  callbacksRef.current = { getKey, getDuration, onExpire };

  const [, bumpRevision] = useState(0);

  const buildSnapshot = useCallback((): Record<string, AfIsolatedTimerEntry> => {
    const now = nowMs();
    const out: Record<string, AfIsolatedTimerEntry> = {};
    storeRef.current.forEach((rec, key) => {
      if (!Number.isFinite(rec.totalMs) || rec.totalMs <= 0) {
        out[key] = {
          key,
          totalMs: 0,
          remainingMs: 0,
          ratio: 1,
          paused: rec.paused || pausedAll,
        };
        return;
      }
      const effectivelyPaused = rec.paused || pausedAll;
      const liveRemaining = effectivelyPaused
        ? rec.remainingMs
        : Math.max(0, rec.remainingMs - Math.max(0, now - rec.lastResumeAt));
      out[key] = {
        key,
        totalMs: rec.totalMs,
        remainingMs: Math.round(liveRemaining),
        ratio: Math.max(0, Math.min(1, liveRemaining / rec.totalMs)),
        paused: effectivelyPaused,
      };
    });
    return out;
  }, [pausedAll]);

  // 同步 items 增删至内部计时池（SSR 安全：在渲染期只读补充新键或由 useEffect 驱动 tick）
  useEffect(() => {
    const now = nowMs();
    const activeKeys = new Set<string>();
    let mutated = false;

    for (const item of items) {
      const key = callbacksRef.current.getKey(item);
      activeKeys.add(key);
      const customDur = callbacksRef.current.getDuration?.(item);
      const totalMs = customDur !== undefined ? customDur : defaultDuration;
      const existing = storeRef.current.get(key);
      if (!existing) {
        storeRef.current.set(key, {
          key,
          item,
          totalMs,
          remainingMs: totalMs,
          lastResumeAt: now,
          paused: false,
          expired: false,
        });
        mutated = true;
      } else {
        existing.item = item;
      }
    }

    Array.from(storeRef.current.keys()).forEach((key) => {
      if (!activeKeys.has(key)) {
        storeRef.current.delete(key);
        mutated = true;
      }
    });

    if (mutated) {
      bumpRevision((v) => v + 1);
    }
  }, [items, defaultDuration]);

  // 处理全局 pausedAll 切换时的精确剩余时间锚定
  const prevPausedAllRef = useRef(pausedAll);
  useEffect(() => {
    if (prevPausedAllRef.current === pausedAll) return;
    prevPausedAllRef.current = pausedAll;
    const now = nowMs();
    storeRef.current.forEach((rec) => {
      if (rec.paused || !Number.isFinite(rec.totalMs) || rec.totalMs <= 0) return;
      if (pausedAll) {
        rec.remainingMs = Math.max(0, rec.remainingMs - Math.max(0, now - rec.lastResumeAt));
      } else {
        rec.lastResumeAt = now;
      }
    });
    bumpRevision((v) => v + 1);
  }, [pausedAll]);

  // 并发周期采样与独立过期派发（使用 __nativeSetInterval 若存在以兼容测试，正常使用 window.setInterval）
  useEffect(() => {
    if (typeof window === "undefined" || pausedAll || items.length === 0) return;

    const hasActiveCountdown = items.some((item) => {
      const dur = callbacksRef.current.getDuration?.(item) ?? defaultDuration;
      return Number.isFinite(dur) && dur > 0;
    });
    if (!hasActiveCountdown) return;

    const nativeSetInterval =
      (window as Window & { __nativeSetInterval?: typeof window.setInterval }).__nativeSetInterval ??
      window.setInterval.bind(window);

    // 注意：视觉回归环境会把 window.setInterval 置为 () => 0 以冻结静态截图；此处尊重 window.setInterval 以便视觉回归零漂移！
    void nativeSetInterval;
    const intervalMs = Math.max(16, tickInterval);
    const id = window.setInterval(() => {
      const now = nowMs();
      const expiredList: InternalTimerRecord<T>[] = [];
      let anyRunning = false;

      storeRef.current.forEach((rec) => {
        if (rec.expired || rec.paused || !Number.isFinite(rec.totalMs) || rec.totalMs <= 0) {
          return;
        }
        anyRunning = true;
        const liveRemaining = rec.remainingMs - Math.max(0, now - rec.lastResumeAt);
        if (liveRemaining <= 0) {
          rec.remainingMs = 0;
          rec.expired = true;
          expiredList.push(rec);
        }
      });

      if (anyRunning || expiredList.length > 0) {
        bumpRevision((v) => v + 1);
      }
      for (const exp of expiredList) {
        callbacksRef.current.onExpire?.(exp.key, exp.item);
      }
    }, intervalMs);

    return () => {
      if (id) window.clearInterval(id);
    };
  }, [items, defaultDuration, tickInterval, pausedAll]);

  const pause = useCallback(
    (key: string) => {
      const rec = storeRef.current.get(key);
      if (!rec || rec.paused) return;
      const now = nowMs();
      if (!pausedAll && Number.isFinite(rec.totalMs) && rec.totalMs > 0) {
        rec.remainingMs = Math.max(0, rec.remainingMs - Math.max(0, now - rec.lastResumeAt));
      }
      rec.paused = true;
      bumpRevision((v) => v + 1);
    },
    [pausedAll],
  );

  const resume = useCallback((key: string) => {
    const rec = storeRef.current.get(key);
    if (!rec || !rec.paused) return;
    rec.paused = false;
    rec.lastResumeAt = nowMs();
    bumpRevision((v) => v + 1);
  }, []);

  const reset = useCallback((key: string) => {
    const rec = storeRef.current.get(key);
    if (!rec) return;
    rec.remainingMs = rec.totalMs;
    rec.lastResumeAt = nowMs();
    rec.expired = false;
    bumpRevision((v) => v + 1);
  }, []);

  const timers = buildSnapshot();

  const getRatio = useCallback(
    (key: string): number => {
      return timers[key]?.ratio ?? 1;
    },
    [timers],
  );

  const isPaused = useCallback(
    (key: string): boolean => {
      return timers[key]?.paused ?? false;
    },
    [timers],
  );

  const getCardHoverProps = useCallback(
    (key: string) => ({
      onPointerEnter: () => pause(key),
      onPointerLeave: () => resume(key),
    }),
    [pause, resume],
  );

  return {
    timers,
    pause,
    resume,
    reset,
    getRatio,
    isPaused,
    getCardHoverProps,
  };
}
