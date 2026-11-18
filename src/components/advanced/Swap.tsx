import { useIsomorphicLayoutEffect } from "../../primitives";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SwapGhost, reducedMotion } from "./shared";

/**
 * 内容替换：旧内容放大到 1.02 并模糊 10px 淡出，新内容从 0.98 去模糊淡入，
 * 容器高度在 420ms 内同步到新内容高度（内容交换用 --af-ease-swap）。
 * 进入从 40% 透明度起，不从全透明开始。用于页签、视图等整块内容切换。
 */
export function AfSwap({ swapKey, children, className }: { swapKey: string; children: ReactNode; className?: string }) {
  const [ghosts, setGhosts] = useState<SwapGhost[]>([]);
  const last = useRef<SwapGhost>({ key: swapKey, node: children });
  const boxRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  const timers = useRef<number[]>([]);
  const generation = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const box = boxRef.current;
    const current = currentRef.current;
    if (last.current.key === swapKey || !box || !current) return;
    // 快速连续切换：取消上一轮计时器与幽灵，避免旧 timer 清掉新过渡的高度/裁切
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const generationAtSwap = generation.current + 1;
    generation.current = generationAtSwap;
    if (reducedMotion()) {
      setGhosts([]);
      box.style.transition = "";
      box.style.height = "";
      delete box.dataset.swapping;
      return;
    }
    const ghost = last.current;
    setGhosts([ghost]);
    // 正常切换从旧内容高度开始；连续切换则取当前实际高度，避免跳回更早的快照
    const startHeight = box.dataset.swapping !== undefined ? box.offsetHeight : lastHeight.current || box.offsetHeight;
    const targetHeight = current.offsetHeight;
    box.style.transition = "none";
    box.style.height = `${startHeight}px`;
    box.dataset.swapping = "";
    void box.offsetHeight;
    box.style.transition = "";
    box.style.height = `${targetHeight}px`;
    timers.current.push(
      window.setTimeout(() => {
        if (generation.current !== generationAtSwap) return;
        setGhosts([]);
        box.style.height = "";
        delete box.dataset.swapping;
      }, 460),
    );
  }, [swapKey]);

  useIsomorphicLayoutEffect(() => {
    last.current = { key: swapKey, node: children };
    if (boxRef.current && !boxRef.current.dataset.swapping) lastHeight.current = boxRef.current.offsetHeight;
  });

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const inert = { inert: "" } as Record<string, string>;
  return (
    <div className={["af-swap", className].filter(Boolean).join(" ")} ref={boxRef}>
      {ghosts.map((ghost) => (
        <div key={`ghost-${ghost.key}`} className="af-swap__ghost" aria-hidden {...inert}>
          {ghost.node}
        </div>
      ))}
      <div key={swapKey} ref={currentRef} className="af-swap__current" data-entering={ghosts.length > 0 || undefined}>
        {children}
      </div>
    </div>
  );
}
