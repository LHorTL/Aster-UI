import { useCallback, useRef, useState } from "react";

export type UseControllableStateOptions<T> = {
  /** 受控值；传入非 undefined 时由外部接管状态。 */
  value?: T;
  /** 非受控初始值。 */
  defaultValue: T;
  /** 值变化回调。 */
  onChange?: (next: T) => void;
};

/**
 * 统一受控 / 非受控双模状态原语：
 * - 传入 `value !== undefined` 时作为受控组件运行；
 * - 未传 `value` 时使用内部状态，并在变化时同步触发 `onChange`。
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const [inner, setInner] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : inner;
  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const resolved = typeof updater === "function" ? (updater as (prev: T) => T)(currentRef.current) : updater;
      currentRef.current = resolved;
      if (!isControlled) {
        setInner(resolved);
      }
      onChangeRef.current?.(resolved);
    },
    [isControlled],
  );

  return [current, setValue];
}
