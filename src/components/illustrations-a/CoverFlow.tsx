import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

export interface AfCoverFlowItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  alt?: string;
  children?: ReactNode;
}

export interface AfCoverFlowProps {
  items?: AfCoverFlowItem[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  onSelect?: (item: AfCoverFlowItem, index: number) => void;
  /** Center card width in px. */
  itemWidth?: number;
  /** Center card height in px. */
  itemHeight?: number;
  /** Side card Y-rotation angle in degrees. */
  angle?: number;
  /** Show floor reflection below each card. */
  reflection?: boolean;
  /** Show counter, tick bar, Prev/Next buttons and caption. */
  controls?: boolean;
  /** Enable horizontal wheel scrubbing. */
  wheel?: boolean;
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_ITEMS: AfCoverFlowItem[] = [
  {
    id: "stone",
    title: "Stone",
    subtitle: "#F4F4F5 → #D4D4D8",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F4F4F5, #D4D4D8)" }} />,
  },
  {
    id: "mint",
    title: "Mint",
    subtitle: "#F0FBF7 → #B6E4D3",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F0FBF7, #B6E4D3)" }} />,
  },
  {
    id: "sky",
    title: "Sky",
    subtitle: "#EFF6FF → #BCD6FB",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #EFF6FF, #BCD6FB)" }} />,
  },
  {
    id: "sage",
    title: "Sage",
    subtitle: "#F0F7F2 → #BFDCC8",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F0F7F2, #BFDCC8)" }} />,
  },
  {
    id: "blush",
    title: "Blush",
    subtitle: "#FDF2F8 → #F5B5D6",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #FDF2F8, #F5B5D6)" }} />,
  },
  {
    id: "sand",
    title: "Sand",
    subtitle: "#FDFAF3 → #EAD9B8",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #FDFAF3, #EAD9B8)" }} />,
  },
  {
    id: "lilac",
    title: "Lilac",
    subtitle: "#F5F3FF → #CDC3F5",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F5F3FF, #CDC3F5)" }} />,
  },
  {
    id: "ice",
    title: "Ice",
    subtitle: "#F0FAFF → #B8E0F0",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F0FAFF, #B8E0F0)" }} />,
  },
  {
    id: "peach",
    title: "Peach",
    subtitle: "#FFF7ED → #F6C9A4",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #FFF7ED, #F6C9A4)" }} />,
  },
  {
    id: "mist",
    title: "Mist",
    subtitle: "#F8FAFC → #CBD5E1",
    children: <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #F8FAFC, #CBD5E1)" }} />,
  },
];

function computeCardStyle(d: number, itemWidth: number, angle: number): CSSProperties | null {
  const absD = Math.abs(d);
  if (absD > 6.2) return null;
  const sign = d === 0 ? 0 : d > 0 ? 1 : -1;

  // Smooth interpolation between center (d = 0) and first side stack (|d| = 1), linear fan beyond |d| >= 1
  const firstX = 0.78 * itemWidth;
  const stepX = 0.27 * itemWidth;
  const sideZ = -0.7 * itemWidth;

  let x: number;
  let z: number;
  let rotY: number;
  let scale: number;

  if (absD <= 1) {
    const ease = 1 - Math.pow(1 - absD, 1.65);
    x = sign * firstX * ease;
    z = sideZ * ease;
    rotY = -sign * angle * ease;
    scale = 1 - 0.08 * ease;
  } else {
    x = sign * (firstX + (absD - 1) * stepX);
    z = sideZ;
    rotY = -sign * angle;
    scale = Math.max(0.8, 0.92 - (absD - 1) * 0.015);
  }

  const opacity = absD > 5.2 ? Math.max(0, 1 - (absD - 5.2) * 1.1) : 1;
  const zIndex = Math.round(1000 - absD * 10);
  const t = Math.min(1, absD);
  const drift = Math.max(-1.5, Math.min(1.5, d));

  return {
    transform: `translate3d(${x.toFixed(2)}px, 0px, ${z.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
    opacity,
    zIndex,
    "--ui-cf-t": t.toFixed(3),
    "--ui-cf-d": drift.toFixed(3),
  } as CSSProperties;
}

/**
 * 3D Cover Flow carousel with pointer drag + flick momentum, wheel scrub, keyboard navigation, and floor reflection.
 */
export function AfCoverFlow(props: AfCoverFlowProps = {}) {
  const {
    items = DEFAULT_ITEMS,
    index: controlledIndex,
    defaultIndex = Math.min(4, Math.max(0, (props.items ?? DEFAULT_ITEMS).length - 1)),
    onIndexChange,
    onSelect,
    itemWidth = 240,
    itemHeight = 320,
    angle = 50,
    reflection = true,
    controls = true,
    wheel = true,
    "aria-label": ariaLabel = "Cover Flow",
    className,
    style,
  } = props;

  const count = items.length;
  const clampIdx = useCallback((n: number) => Math.max(0, Math.min(Math.max(0, count - 1), n)), [count]);

  const [uncontrolledIdx, setUncontrolledIdx] = useState(() => clampIdx(defaultIndex));
  const activeIndex = controlledIndex !== undefined ? clampIdx(controlledIndex) : clampIdx(uncontrolledIdx);

  const [pos, setPos] = useState(activeIndex);
  const [dragging, setDragging] = useState(false);
  const [dir, setDir] = useState<"next" | "prev">("next");

  const posRef = useRef(pos);
  posRef.current = pos;
  const targetRef = useRef(activeIndex);
  const velRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevActiveRef = useRef(activeIndex);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startPos: number;
    lastX: number;
    lastT: number;
    vx: number;
    moved: boolean;
  } | null>(null);
  const wheelAccumRef = useRef(0);

  const startSpring = useCallback(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      velRef.current = 0;
      setPos(targetRef.current);
      return;
    }
    if (rafRef.current !== null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const stiffness = 210;
      const damping = 26;
      const displacement = posRef.current - targetRef.current;
      const force = -stiffness * displacement - damping * velRef.current;
      velRef.current += force * dt;
      const next = posRef.current + velRef.current * dt;
      if (Math.abs(next - targetRef.current) < 0.0015 && Math.abs(velRef.current) < 0.008) {
        velRef.current = 0;
        posRef.current = targetRef.current;
        setPos(targetRef.current);
        rafRef.current = null;
        return;
      }
      posRef.current = next;
      setPos(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const commitIndex = useCallback(
    (nextRaw: number, flickVel = 0) => {
      const next = clampIdx(nextRaw);
      if (next !== activeIndex) {
        setDir(next > activeIndex ? "next" : "prev");
      }
      if (controlledIndex === undefined) {
        setUncontrolledIdx(next);
      }
      if (next !== activeIndex) {
        onIndexChange?.(next);
      }
      targetRef.current = next;
      if (flickVel !== 0) {
        velRef.current = flickVel;
      }
      startSpring();
    },
    [activeIndex, clampIdx, controlledIndex, onIndexChange, startSpring]
  );

  useEffect(() => {
    if (activeIndex !== prevActiveRef.current) {
      setDir(activeIndex > prevActiveRef.current ? "next" : "prev");
      prevActiveRef.current = activeIndex;
    }
    targetRef.current = activeIndex;
    if (!dragging) {
      startSpring();
    }
  }, [activeIndex, dragging, startSpring]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    velRef.current = 0;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startPos: posRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    if (!st.moved && Math.abs(dx) > 5) {
      st.moved = true;
      setDragging(true);
    }
    if (!st.moved) return;
    const now = performance.now();
    const dt = Math.max(1, now - st.lastT);
    const instVx = (e.clientX - st.lastX) / dt; // px per ms
    st.vx = st.vx * 0.65 + instVx * 0.35;
    st.lastX = e.clientX;
    st.lastT = now;

    const pxPerCard = Math.max(90, itemWidth * 0.62);
    let raw = st.startPos - dx / pxPerCard;
    // Rubber-band at ends
    if (raw < 0) raw = raw * 0.28;
    if (raw > count - 1) raw = count - 1 + (raw - (count - 1)) * 0.28;
    posRef.current = raw;
    setPos(raw);
  };

  const finishPointer = (e: PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    if (st.moved) {
      setDragging(false);
      const pxPerCard = Math.max(90, itemWidth * 0.62);
      const cardsPerSec = (-st.vx * 1000) / pxPerCard;
      const projected = posRef.current + cardsPerSec * 0.18;
      commitIndex(Math.round(projected), cardsPerSec * 0.55);
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!wheel) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (delta === 0) return;
    e.preventDefault();
    wheelAccumRef.current += delta;
    if (Math.abs(wheelAccumRef.current) >= 42) {
      const step = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      commitIndex(activeIndex + step);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      commitIndex(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      commitIndex(activeIndex + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      commitIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      commitIndex(count - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      const current = items[activeIndex];
      if (current && onSelect) {
        e.preventDefault();
        onSelect(current, activeIndex);
      }
    }
  };

  const currentItem = items[activeIndex];

  return (
    <div
      className={className ? `ui-cf ${className}` : "ui-cf"}
      data-reflection={reflection ? "true" : undefined}
      style={
        {
          "--ui-cf-w": `${itemWidth}px`,
          "--ui-cf-h": `${itemHeight}px`,
          ...style,
        } as CSSProperties
      }
    >
      <div
        className="ui-cf__viewport"
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        data-dragging={dragging ? "" : undefined}
        data-selectable={onSelect ? "" : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={onWheel}
      >
        <div className="ui-cf__stage" style={{ perspective: "1000px" }}>
          {items.map((item, i) => {
            const d = i - pos;
            const cardStyle = computeCardStyle(d, itemWidth, angle);
            if (!cardStyle) return null;
            const isActive = i === activeIndex;
            const side = d < 0 ? "left" : "right";
            const renderBody = () =>
              item.image ? (
                <img className="ui-cf__media" src={item.image} alt={item.alt ?? item.title} draggable={false} />
              ) : (
                <div className="ui-cf__media">{item.children}</div>
              );

            return (
              <div
                key={item.id}
                className="ui-cf__item"
                data-cf-index={i}
                data-active={isActive ? "true" : undefined}
                data-side={side}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${item.title}`}
                aria-hidden={isActive ? undefined : true}
                style={cardStyle}
                onClick={() => {
                  if (dragStateRef.current?.moved) return;
                  if (i !== activeIndex) {
                    commitIndex(i);
                  } else {
                    onSelect?.(item, i);
                  }
                }}
              >
                <div className="ui-cf__ground" aria-hidden="true" />
                <div className="ui-cf__card">{renderBody()}</div>
                {reflection ? (
                  <div className="ui-cf__reflection" aria-hidden="true">
                    <div className="ui-cf__card">{renderBody()}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {controls && count > 0 ? (
        <div className="ui-cf__footer">
          <div className="ui-cf__row">
            <button
              type="button"
              className="ui-cf__nav"
              aria-label="Previous"
              disabled={activeIndex <= 0}
              onClick={() => commitIndex(activeIndex - 1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>

            {currentItem ? (
              <div className="ui-cf__caption" aria-live="polite" aria-atomic="true">
                <div key={currentItem.id} className="ui-cf__caption-in" data-dir={dir}>
                  <div className="ui-cf__title">{currentItem.title}</div>
                  {currentItem.subtitle ? <div className="ui-cf__subtitle">{currentItem.subtitle}</div> : null}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="ui-cf__nav"
              aria-label="Next"
              disabled={activeIndex >= count - 1}
              onClick={() => commitIndex(activeIndex + 1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </div>

          <div className="ui-cf__ticks">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                tabIndex={-1}
                className="ui-cf__tick"
                aria-label={`Show ${item.title}`}
                aria-current={i === activeIndex ? "true" : undefined}
                onClick={() => commitIndex(i)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
