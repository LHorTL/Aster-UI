import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type UIEvent,
  type WheelEvent,
} from "react";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "./cn";

export interface UseAutoScrollStickOptions {
  /** 当前流式列表项总数（每次递增代表程序追加了新内容）。 */
  itemCount: number;
  /** 流式单行内容增长时的可选变化键（如最后一行字节长度）。 */
  streamVersion?: string | number;
  /** 判定触底粘滞的像素阈值（默认 `24`）。 */
  threshold?: number;
  /** 是否启用自动跟底（默认 `true`）。 */
  enabled?: boolean;
  /** 初始是否处于粘滞触底态（默认 `true`）。 */
  defaultStuck?: boolean;
  /** 外部传入的容器 Ref；未传时内部自动创建。 */
  containerRef?: RefObject<HTMLElement | null>;
}

export interface AutoScrollStickBindProps {
  onScroll: (event: UIEvent<HTMLElement>) => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
}

export interface AutoScrollStickResult<T extends HTMLElement = HTMLDivElement> {
  /** 绑定至可滚动视口容器的 Ref。 */
  containerRef: RefObject<T>;
  /** 绑定至可滚动视口容器的事件处理器（`onScroll` + `onWheel`）。 */
  bindScroll: AutoScrollStickBindProps;
  /** 当前是否处于底部粘滞跟随态。 */
  isStuck: boolean;
  /** 用户主动上滚暂停期间新追加的未读行数。 */
  unreadCount: number;
  /** 一键滚回底部、恢复粘滞并清零 `unreadCount`。 */
  scrollToBottom: (smooth?: boolean) => void;
}

/**
 * 流式内容触底粘滞器（`P2-3`）：
 * - 当滚动条距底 `<= threshold`（默认 `24px`）时保持粘滞，程序追加日志自动贴底且零滞后；
 * - 一旦用户主动向上滚动查阅历史，立即解除粘滞并累加 `unreadCount`；
 * - 调用 `scrollToBottom()` 或手动滚回底部时恢复粘滞并清零计数。
 */
export function useAutoScrollStick<T extends HTMLElement = HTMLDivElement>({
  itemCount,
  streamVersion,
  threshold = 24,
  enabled = true,
  defaultStuck = true,
  containerRef: externalRef,
}: UseAutoScrollStickOptions): AutoScrollStickResult<T> {
  const internalRef = useRef<T>(null);
  const containerRef = (externalRef as RefObject<T> | undefined) ?? internalRef;

  const [isStuck, setIsStuck] = useState<boolean>(defaultStuck);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isStuckRef = useRef<boolean>(defaultStuck);
  isStuckRef.current = isStuck;

  const prevCountRef = useRef<number>(itemCount);
  const programmaticUntilRef = useRef<number>(0);

  const computeNearBottom = useCallback(
    (el: HTMLElement): boolean => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      return distance <= Math.max(2, threshold);
    },
    [threshold],
  );

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = containerRef.current;
      isStuckRef.current = true;
      setIsStuck(true);
      setUnreadCount(0);
      if (!el) return;
      programmaticUntilRef.current = Date.now() + 260;
      const useSmooth = smooth && !prefersReducedMotion();
      if (typeof el.scrollTo === "function") {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: useSmooth ? "smooth" : "auto",
        });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    },
    [containerRef],
  );

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const nearBottom = computeNearBottom(el);
      if (Date.now() < programmaticUntilRef.current) {
        if (nearBottom) {
          isStuckRef.current = true;
          setIsStuck(true);
          setUnreadCount(0);
        }
        return;
      }
      if (nearBottom) {
        if (!isStuckRef.current) {
          isStuckRef.current = true;
          setIsStuck(true);
        }
        setUnreadCount(0);
      } else if (isStuckRef.current) {
        isStuckRef.current = false;
        setIsStuck(false);
      }
    },
    [computeNearBottom],
  );

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    if (event.deltaY < 0 && isStuckRef.current) {
      const el = event.currentTarget;
      if (el.scrollHeight > el.clientHeight + 2) {
        programmaticUntilRef.current = 0;
      }
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!enabled) {
      prevCountRef.current = itemCount;
      return;
    }
    const delta = itemCount - prevCountRef.current;
    prevCountRef.current = itemCount;

    const el = containerRef.current;
    if (isStuckRef.current) {
      if (el) {
        programmaticUntilRef.current = Date.now() + 120;
        el.scrollTop = el.scrollHeight;
      }
      if (unreadCount !== 0) {
        setUnreadCount(0);
      }
    } else if (delta > 0) {
      setUnreadCount((prev) => prev + delta);
    }
  }, [itemCount, streamVersion, enabled, containerRef]);

  useEffect(() => {
    if (!enabled || !defaultStuck) return;
    const el = containerRef.current;
    if (!el) return;
    programmaticUntilRef.current = Date.now() + 120;
    el.scrollTop = el.scrollHeight;
  }, [enabled, defaultStuck, containerRef]);

  return {
    containerRef,
    bindScroll: {
      onScroll,
      onWheel,
    },
    isStuck,
    unreadCount,
    scrollToBottom,
  };
}
