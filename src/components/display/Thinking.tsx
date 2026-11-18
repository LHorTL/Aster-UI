import { useEffect, useRef, useState } from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";

const THINKING_INTERVAL = 2200;

export type AfThinkingProps = {
  phases: string[];
  done?: boolean;
  seconds?: number;
  className?: string;
};

/**
 * AI 工作中提示：32px 白卡、八道强调色光线依次淡出（不整体旋转）、阶段文字每 2.2s 换一句；
 * 文字盒按新文字宽度 460ms 滑动，旧标签滚出、新标签滚入。
 */
export function AfThinking({ phases, done = false, seconds, className }: AfThinkingProps) {
  const [step, setStep] = useState(0);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState<number | null>(null);

  const spent = elapsed ?? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
  if (done && elapsed === null) setElapsed(spent);
  if (!done && elapsed !== null) {
    setElapsed(null);
    startedAt.current = Date.now();
    setStep(0);
  }

  useEffect(() => {
    if (done || phases.length < 2) return;
    const id = window.setInterval(() => setStep((value) => (value + 1) % phases.length), THINKING_INTERVAL);
    return () => window.clearInterval(id);
  }, [done, phases.length]);

  const label = done ? `思考了 ${seconds ?? spent} 秒` : (phases[Math.min(step, phases.length - 1)] ?? "");

  const [shown, setShown] = useState({ key: 0, text: label });
  const [leaving, setLeaving] = useState<{ key: number; text: string } | null>(null);
  if (label !== shown.text) {
    setLeaving(shown);
    setShown({ key: shown.key + 1, text: label });
  }

  const boxRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const measured = useRef(false);
  useIsomorphicLayoutEffect(() => {
    const box = boxRef.current;
    const current = labelRef.current;
    if (!box || !current) return;
    if (!measured.current) box.style.transition = "none";
    box.style.width = `${current.offsetWidth + 1}px`;
    if (!measured.current) {
      void box.getBoundingClientRect();
      box.style.transition = "";
      measured.current = true;
    }
  }, [shown.key]);

  return (
    <span className={cn("af-thinking", className)} data-done={done || undefined} role="status" aria-live="polite">
      <span className="af-thinking__icon" aria-hidden="true">
        <svg className="af-thinking__rays" viewBox="0 0 16 16">
          {Array.from({ length: 8 }, (_, ray) => (
            <line
              key={ray}
              x1="8"
              y1="1.75"
              x2="8"
              y2="4.75"
              transform={`rotate(${ray * 45} 8 8)`}
              style={{ animationDelay: `${(ray - 8) * 100}ms` }}
            />
          ))}
        </svg>
        <svg className="af-thinking__check" viewBox="0 0 16 16">
          <path d="M3.5 8.4 6.6 11.3 12.5 4.9" pathLength={1} />
        </svg>
      </span>
      <span className="af-thinking__text" ref={boxRef}>
        {leaving ? (
          <span
            key={leaving.key}
            className="af-thinking__label af-thinking__label--out"
            aria-hidden="true"
            onAnimationEnd={() => setLeaving(null)}
          >
            {leaving.text}
          </span>
        ) : null}
        <span
          key={shown.key}
          ref={labelRef}
          className={cn("af-thinking__label", shown.key > 0 && "af-thinking__label--in", !done && "af-thinking__shine")}
          data-text={shown.text}
        >
          {shown.text}
        </span>
      </span>
    </span>
  );
}
