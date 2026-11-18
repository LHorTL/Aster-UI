import { useEffect, useLayoutEffect, type MutableRefObject, type Ref, type RefCallback } from "react";

/** SSR 安全的同构 LayoutEffect：浏览器端同步执行测量，服务端回退到 useEffect 消除警告。 */
export const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

/** 组合条件类名，自动过滤空值与布尔假值。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 合并多个 React ref（支持函数 ref 与对象 ref），供 forwardRef 组件内部同时持有 DOM 引用。 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as MutableRefObject<T | null>).current = node;
      }
    }
  };
}

/** 检测系统是否开启了“减少动态效果”。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
