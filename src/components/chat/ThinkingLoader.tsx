import { useEffect, useRef, useState } from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { type ThinkingLoaderProps, loaderPhases, useElapsedSeconds } from "../_shared/chat";

/**
 * 思考胶囊：八道光线依次淡入淡出（整体不旋转），文字带高光扫掠并在阶段间上滚模糊切换，
 * 胶囊宽度随新文案平滑伸缩；完成后光线缩成描线对勾并显示完成文案。
 */
function ThinkingLoader({
  phases = loaderPhases,
  phase: phaseProp,
  interval = 2200,
  loop = false,
  done = false,
  doneLabel,
  size = "md",
  variant = "pill",
  className,
}: ThinkingLoaderProps) {
  const [innerPhase, setInnerPhase] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const wasDone = useRef(done);
  const activePhase = phaseProp !== undefined ? Math.max(0, Math.min(phases.length - 1, phaseProp)) : innerPhase;
  const seconds = useElapsedSeconds(!done, resetKey);

  const doneText =
    typeof doneLabel === "function"
      ? doneLabel(seconds)
      : typeof doneLabel === "string"
        ? doneLabel
        : `Thought for ${Math.max(1, seconds)}s`;

  const text = done ? doneText : (phases[activePhase] ?? phases[0] ?? "Thinking");
  const prevTextRef = useRef(text);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [ghost, setGhost] = useState<string | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelWidth, setLabelWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (wasDone.current && !done) {
      setInnerPhase(0);
      setResetKey((k) => k + 1);
    }
    wasDone.current = done;
  }, [done]);

  useEffect(() => {
    if (done || phaseProp !== undefined || phases.length <= 1) return;
    const id = window.setInterval(() => {
      setInnerPhase((value) => (value + 1 < phases.length ? value + 1 : loop ? 0 : value));
    }, interval);
    return () => window.clearInterval(id);
  }, [done, phaseProp, interval, loop, phases.length]);

  useEffect(() => {
    const previous = prevTextRef.current;
    if (previous === text) return;
    prevTextRef.current = text;
    setHasAnimated(true);
    if (done) {
      setGhost(null);
      return;
    }
    setGhost(previous);
    const id = window.setTimeout(() => setGhost(null), 340);
    return () => window.clearTimeout(id);
  }, [text, done]);

  useIsomorphicLayoutEffect(() => {
    const node = labelRef.current;
    if (node) setLabelWidth(node.offsetWidth);
  }, [text]);

  const iconSize = size === "sm" ? 14 : 16;
  const normalizedVariant = variant === "inline" ? "plain" : variant;

  return (
    <span
      className={cn("af-ch-loader", className)}
      data-size={size}
      data-variant={normalizedVariant}
      data-done={done || undefined}
      role="status"
      aria-live="polite"
    >
      <span className="af-ch-loader__icon" aria-hidden>
        <svg className="af-ch-loader__rays" viewBox="0 0 16 16" width={iconSize} height={iconSize}>
          {Array.from({ length: 8 }, (_, ray) => (
            <line
              key={ray}
              x1="8"
              y1="1.8"
              x2="8"
              y2="4.4"
              transform={`rotate(${ray * 45} 8 8)`}
              style={{ animationDelay: `${(ray - 8) * 100}ms` }}
            />
          ))}
        </svg>
        <svg className="af-ch-check af-ch-loader__check" viewBox="0 0 16 16" width={iconSize} height={iconSize}>
          <path d="M3.5 8.3 6.5 11.2 12.5 5" pathLength={1} />
        </svg>
      </span>
      <span className="af-ch-loader__labelbox" style={labelWidth !== undefined ? { width: labelWidth } : undefined}>
        <span
          ref={labelRef}
          className="af-ch-loader__label"
          key={done ? "done" : `${activePhase}:${text}`}
          data-animate={hasAnimated || undefined}
          data-shimmer={!done || undefined}
          data-text={text}
        >
          {text}
        </span>
        {ghost ? (
          <span className="af-ch-loader__ghost" aria-hidden>
            {ghost}
          </span>
        ) : null}
      </span>
      <span className="af-ch-sr">{text}</span>
    </span>
  );
}

export { ThinkingLoader as AfThinkingLoader };
