import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./cn";

export type AfPresencePhase = "open" | "closing";

/**
 * 浮层 / 模态框退场过渡生命周期：
 * - `open = true` 时立即挂载并处于 `"open"` 态；
 * - `open = false` 时若未开启减少动态效果，则保留挂载 `durationMs` 毫秒并标记 `"closing"` 供 CSS 退场动画播放，随后自动卸载。
 */
export function useExitTransition(open: boolean, durationMs = 160): {
  mounted: boolean;
  closing: boolean;
  phase: AfPresencePhase;
} {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) {
    setMounted(true);
  }

  const canAnimate = durationMs > 0 && typeof window !== "undefined" && !prefersReducedMotion();

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (!canAnimate) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, durationMs, canAnimate]);

  const isClosing = !open && mounted && canAnimate;
  const isMounted = open || (mounted && canAnimate);

  return {
    mounted: isMounted,
    closing: isClosing,
    phase: isClosing ? "closing" : "open",
  };
}
