import { useCallback, useRef, type CompositionEvent, type KeyboardEvent } from "react";

/**
 * 判断一次按键事件是否处于中文/日文/韩文等输入法（IME）候选词上屏阶段：
 * 1. 标准浏览器 `nativeEvent.isComposing === true`；
 * 2. 兼容 Safari WebKit 事件顺序缺陷的 `keyCode === 229`（VK_PROCESSKEY）。
 */
export function isImeComposing(event: KeyboardEvent<Element> | globalThis.KeyboardEvent): boolean {
  const native = "nativeEvent" in event ? event.nativeEvent : event;
  const legacyKeyCode = (native as globalThis.KeyboardEvent & { keyCode?: number }).keyCode;
  return Boolean(native.isComposing || legacyKeyCode === 229);
}

/**
 * 输入法安全的回车提交守卫 Hook：
 * 同时结合组合态引用、`isComposing`、`keyCode === 229` 与 `compositionend` 50ms 时间窗，
 * 避免中文输入法按回车确认拼音/候选词时误触发发送或提交。
 */
export function useImeEnterGuard() {
  const composingRef = useRef(false);
  const lastCompositionEndAt = useRef<number | null>(null);

  const onCompositionStart = useCallback((_event?: CompositionEvent<Element>) => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback((event?: CompositionEvent<Element>) => {
    composingRef.current = false;
    lastCompositionEndAt.current = event?.nativeEvent.timeStamp ?? performance.now();
  }, []);

  const shouldBlockEnter = useCallback((event: KeyboardEvent<Element>): boolean => {
    if (composingRef.current || isImeComposing(event)) return true;
    const endedAt = lastCompositionEndAt.current;
    const eventTime = event.nativeEvent.timeStamp || performance.now();
    if (endedAt !== null && eventTime >= endedAt && eventTime - endedAt < 50) {
      return true;
    }
    return false;
  }, []);

  return {
    onCompositionStart,
    onCompositionEnd,
    shouldBlockEnter,
    isComposingEnter: shouldBlockEnter,
  };
}
