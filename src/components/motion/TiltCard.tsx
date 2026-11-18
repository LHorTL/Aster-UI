import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn, useReducedMotion } from "../../primitives";

export interface AfTiltCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 最大倾斜角度（度，默认 10）。 */
  maxTilt?: number;
  /** 是否显示跟随指针的柔和光泽层（默认 `true`）。 */
  glare?: boolean;
  /** 悬停缩放比例（默认 1.02）。 */
  scale?: number;
  /** 透视距离（像素，默认 900；越小透视越强）。 */
  perspective?: number;
  /** 卡片内容，直接填充在可倾斜表面内。 */
  children?: ReactNode;
}

/**
 * Tilt Card：纯 3D 倾斜交互容器。
 * 指针移动通过 `requestAnimationFrame` 批量写入 CSS 变量，表面朝指针微倾并带 `soft-light` 径向光斑；
 * 指针离开时沿过冲弹簧曲线（`cubic-bezier(0.34, 1.36, 0.64, 1)`）柔和复位；触控屏与减少动态下自动静止。
 */
export function AfTiltCard(props: AfTiltCardProps = {}) {
  const {
    maxTilt = 10,
    glare = true,
    scale = 1.02,
    perspective = 900,
    children,
    className,
    style,
    onPointerMove: userPointerMove,
    onPointerLeave: userPointerLeave,
    ...rest
  } = props;

  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const trackTimerRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [tracking, setTracking] = useState(false);

  const applyVars = () => {
    frameRef.current = null;
    const node = cardRef.current;
    if (!node) return;
    const { x, y } = targetRef.current;
    node.style.setProperty("--af-mo-rx", `${(-y * maxTilt * 2).toFixed(2)}deg`);
    node.style.setProperty("--af-mo-ry", `${(x * maxTilt * 2).toFixed(2)}deg`);
    node.style.setProperty("--af-mo-gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    node.style.setProperty("--af-mo-gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    userPointerMove?.(event);
    if (reduced || event.pointerType === "touch") return;
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    targetRef.current = {
      x: Math.min(0.5, Math.max(-0.5, (event.clientX - rect.left) / rect.width - 0.5)),
      y: Math.min(0.5, Math.max(-0.5, (event.clientY - rect.top) / rect.height - 0.5)),
    };
    if (!active) {
      setActive(true);
      setTracking(false);
      if (trackTimerRef.current !== null) window.clearTimeout(trackTimerRef.current);
      trackTimerRef.current = window.setTimeout(() => {
        trackTimerRef.current = null;
        setTracking(true);
      }, 150);
    }
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(applyVars);
    }
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    userPointerLeave?.(event);
    if (trackTimerRef.current !== null) {
      window.clearTimeout(trackTimerRef.current);
      trackTimerRef.current = null;
    }
    targetRef.current = { x: 0, y: 0 };
    setActive(false);
    setTracking(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    applyVars();
  };

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (trackTimerRef.current !== null) window.clearTimeout(trackTimerRef.current);
    },
    [],
  );

  return (
    <div
      {...rest}
      className={cn("af-mo-tilt", className)}
      data-active={active && !reduced ? "" : undefined}
      style={
        {
          "--af-mo-perspective": `${perspective}px`,
          "--af-mo-scale": scale,
          ...style,
        } as CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="af-mo-tilt__inner"
        ref={cardRef}
        data-active={active && !reduced ? "" : undefined}
        data-tracking={active && tracking && !reduced ? "" : undefined}
      >
        <div className="af-mo-tilt__surface">
          {children ?? <div className="af-mo-tilt__fallback">Aster UI Pro</div>}
          {glare && !reduced ? <span className="af-mo-tilt__glare" aria-hidden="true" /> : null}
        </div>
      </div>
    </div>
  );
}
