import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn, useReducedMotion } from "../../primitives";

export interface MarqueeLogo {
  /** 品牌名称（无障碍名称，且在 `labels !== "none"` 时展示）。 */
  name: string;
  /** 矢量标志（建议使用 `fill="currentColor"` 以跟随灰阶与悬停着色）。 */
  svg?: ReactNode;
  /** 图片标志地址（开启 `grayscale` 时默认灰阶，悬停恢复原色）。 */
  src?: string;
  /** 悬停时点亮的品牌主色，未传则提亮至组件强前景色。 */
  color?: string;
  /** 视觉字重缩放校正系数（默认 1）。 */
  scale?: number;
  /** 可选跳转链接。 */
  href?: string;
}

export interface AfLogoMarqueeProps {
  /** 品牌标志数组（不传时回退内置 10 项产品标志）。 */
  logos?: MarqueeLogo[];
  /** 每秒滚动像素速度（与容器宽度无关，默认 40）。 */
  speed?: number;
  /** 首行滚动方向；双行模式下第二行反向运行（默认 `"left"`）。 */
  direction?: "left" | "right";
  /** 行数：单行或双行交错反向滚动（默认 1）。 */
  rows?: 1 | 2;
  /** 标志间距（像素，默认 56）。 */
  gap?: number;
  /** 指针悬停或键盘聚焦时平滑减速停驻（默认 true）。 */
  pauseOnHover?: boolean;
  /** 默认静默灰阶并在悬停单项时点亮品牌色（默认 true）。 */
  grayscale?: boolean;
  /** 品牌名显示位置（默认 `"none"`）。 */
  labels?: "none" | "below" | "beside";
  /** 区域无障碍名称。 */
  label?: string;
  /** 可选顶部全大写微标题（如 `"TRUSTED BY TEAMS AT"`）。 */
  eyebrow?: ReactNode;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

type MarqueeRow = {
  logos: MarqueeLogo[];
  dir: 1 | -1;
};

type RowMotionState = {
  x: number;
  v: number;
  w: number;
  drag: null | { id: number; lastX: number; lastT: number; moved: number; captured: boolean };
  seek: number;
};

export const DEFAULT_MARQUEE_LOGOS: MarqueeLogo[] = [
  {
    name: "Vercel",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3 23 21H1L12 3z" />
      </svg>
    ),
  },
  {
    name: "Linear",
    color: "#5E6AD2",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3.2 13.7a9.6 9.6 0 0 0 7.1 7.1L3.2 13.7zm-.2-2.6 9.9 9.9a9.6 9.6 0 0 0 2.1-.4L2.6 8.9c-.2.7-.3 1.4-.4 2.2zm1.2-4.2 12.9 12.9c.6-.4 1.2-.8 1.7-1.3L5.5 5.2c-.5.5-.9 1.1-1.3 1.7zM7.4 3.6l13 13a9.5 9.5 0 0 0 1.2-3.4 9.5 9.5 0 0 0-10.8-10.8c-1.2.2-2.3.6-3.4 1.2z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.5 4.2c.7.6 1 .5 2.4.4l13.2-.8c.3 0 .1-.3 0-.3l-2.2-1.6c-.4-.3-1-.7-2.1-.6L3 2.3c-.5 0-.6.3-.4.5zm.8 3.1v13.9c0 .7.4 1 1.2 1l14.5-.9c.8 0 .9-.5.9-1.1V6.4c0-.6-.2-.9-.7-.9L6 6.4c-.5 0-.7.3-.7.9zm14.3.7c.1.4 0 .8-.4.9l-.7.1v10.3c-.6.3-1.2.5-1.6.5-.8 0-.9-.2-1.5-.9l-4.6-7.2v7l1.4.3s0 .8-1.2.8l-3.2.2c-.1-.2 0-.7.3-.7l.8-.3V9.9l-1.1-.1c-.1-.4.1-1 .8-1.1l3.5-.2 4.7 7.3V9.4l-1.2-.2c-.1-.5.3-.9.8-.9zM1.9 1L15.2 0c1.6-.1 2.1 0 3.1.7l4.2 3c.7.5.9.7.9 1.2v16.4c0 1-.4 1.6-1.7 1.7L6.3 24c-1 0-1.5-.1-2-.8l-3.1-4c-.6-.8-.8-1.3-.8-2V2.7C.4 1.8.8 1.1 1.9 1z" />
      </svg>
    ),
  },
  {
    name: "Stripe",
    color: "#635BFF",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 9.4c-2-.7-3-1.3-3-2.2 0-.8.7-1.2 1.8-1.2 2 0 4.1.8 5.6 1.5l.8-5C16.8 1.5 14.5.7 11.3.7c-2.3 0-4.2.6-5.6 1.7C4.3 3.6 3.5 5.3 3.5 7.4c0 3.7 2.3 5.3 6 6.6 2.4.8 3.2 1.4 3.2 2.4 0 .9-.8 1.4-2.2 1.4-1.7 0-4.6-.8-6.4-1.9l-.8 5.1c1.6.9 4.5 1.8 7.6 1.8 2.4 0 4.5-.6 5.8-1.7 1.5-1.2 2.3-3 2.3-5.3 0-3.8-2.3-5.4-6-6.4z" />
      </svg>
    ),
  },
  {
    name: "Figma",
    color: "#F24E1E",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8.5 2h7a3.5 3.5 0 1 1 0 7h-7a3.5 3.5 0 1 1 0-7zm0 7h7a3.5 3.5 0 1 1 0 7h-3.5V9h-3.5zm0 0h3.5v7H8.5a3.5 3.5 0 1 1 0-7zm0 7h3.5v3.5a3.5 3.5 0 1 1-3.5-3.5z" />
      </svg>
    ),
  },
  {
    name: "Slack",
    color: "#E01E5A",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5zm2-9a2 2 0 1 1 2-2v2H9zm0 1a2 2 0 1 1 0 4H4a2 2 0 1 1 0-4h5zm9 2a2 2 0 1 1 2 2h-2V9zm-1 0a2 2 0 1 1-4 0V4a2 2 0 1 1 4 0v5zm-2 9a2 2 0 1 1-2 2v-2h2zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0-4h-5z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.3 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
      </svg>
    ),
  },
  {
    name: "Shopify",
    color: "#95BF47",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M15.6 5.2c-.1-.8-.8-1.4-1.6-1.5-.7-.1-1.5.2-2 .8-.6-.4-1.3-.5-2-.2-1 .4-1.6 1.4-1.8 2.6l-2.6.8c-.7.2-.8.3-.9 1L3.2 20.5 15.8 23l5-1.1L18.5 5.6c-.1-.3-.3-.4-.6-.4h-2.3zm-3.9 1c.4-.5 1-.7 1.5-.6.4.1.7.4.8.9l-3.4 1c.2-.5.6-1 1.1-1.3zm1.9 6.6c.9.5 1.5 1.2 1.5 2.3 0 1.6-1.3 2.7-3.1 2.7-1 0-1.9-.4-2.4-.8l.5-1.4c.5.4 1.2.7 1.8.7.7 0 1.2-.4 1.2-.9 0-.5-.4-.8-1.3-1.3-1-.5-1.7-1.2-1.7-2.3 0-1.5 1.2-2.6 2.9-2.6.8 0 1.5.2 1.9.5l-.5 1.4c-.4-.2-.9-.4-1.4-.4-.7 0-1.1.4-1.1.8 0 .5.4.8 1.7 1.3z" />
      </svg>
    ),
  },
  {
    name: "Spotify",
    color: "#1DB954",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm4.8 15.1a.7.7 0 0 1-.9.2c-2.5-1.5-5.7-1.9-9.4-1a.7.7 0 1 1-.3-1.3c4.1-.9 7.6-.5 10.4 1.2.3.2.4.6.2.9zm1.3-2.9a.8.8 0 0 1-1.1.3c-2.9-1.8-7.3-2.3-10.7-1.2a.8.8 0 1 1-.5-1.6c3.9-1.2 8.8-.6 12.1 1.4.3.2.4.7.2 1.1zm.1-3C14.8 8.7 9.2 8.5 6 9.5a1 1 0 1 1-.6-1.9c3.7-1.1 9.9-.9 13.8 1.4a1 1 0 0 1-1 1.7z" />
      </svg>
    ),
  },
  {
    name: "Airbnb",
    color: "#FF5A5F",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.2c-1.4 0-2.6.9-3.4 2.5L3.5 15c-.8 1.6-.7 3.4.3 4.8 1 1.3 2.7 2 4.3 1.7 1.5-.2 2.8-1.1 3.9-2.4 1.1 1.3 2.4 2.2 3.9 2.4 1.6.3 3.3-.4 4.3-1.7 1-1.4 1.1-3.2.3-4.8L15.4 4.7C14.6 3.1 13.4 2.2 12 2.2zm0 13.2c-1-1.3-1.7-2.6-1.7-3.6 0-1 .7-1.8 1.7-1.8s1.7.8 1.7 1.8c0 1-.7 2.3-1.7 3.6zm6.9 2.7c-.6.8-1.6 1.2-2.6 1-1.1-.2-2.1-.9-3.1-2.1.9-1.4 1.6-2.9 1.6-4.2 0-1.9-1.3-3.4-3.3-3.4s-3.3 1.5-3.3 3.4c0 1.3.7 2.8 1.6 4.2-1 1.2-2 1.9-3.1 2.1-1 .2-2-.2-2.6-1-.6-.9-.7-2-.2-3.1l5.1-10.3c.5-1 1.2-1.6 2-1.6s1.5.6 2 1.6l5.1 10.3c.5 1.1.4 2.2-.2 3.1z" />
      </svg>
    ),
  },
];

function logoInitial(name: string): string {
  const text = name.trim();
  if (!text) return "?";
  const first =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)[Symbol.iterator]().next().value?.segment
      : Array.from(text)[0];
  return (first ?? "?").toLocaleUpperCase();
}

function LogoMark({ logo, named }: { logo: MarqueeLogo; named: boolean }) {
  const [failed, setFailed] = useState(false);
  const mark =
    logo.svg ??
    (logo.src && !failed ? <img src={logo.src} alt="" draggable={false} onError={() => setFailed(true)} /> : null);
  if (!mark && named) return null;
  return (
    <span className="af-mo-lm__mark" aria-hidden="true">
      {mark ?? <span className="af-mo-lm__tile">{logoInitial(logo.name)}</span>}
    </span>
  );
}

const mod = (n: number, m: number) => (m > 0 ? ((n % m) + m) % m : 0);
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * 无限循环品牌标志走马灯（affectUI Block 1:1）：
 * 单一 `requestAnimationFrame` 速度场驱动无缝折返，悬停/聚焦以指数阻尼平滑停驻，支持指针拖拽惯性滑行与灰阶点亮。
 */
export function AfLogoMarquee({
  logos = DEFAULT_MARQUEE_LOGOS,
  speed = 40,
  direction = "left",
  rows = 1,
  gap = 56,
  pauseOnHover = true,
  grayscale = true,
  labels = "none",
  label = "Companies that use the product",
  eyebrow,
  className,
  style,
}: AfLogoMarqueeProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<(HTMLDivElement | null)[]>([]);
  const setsRef = useRef<(HTMLUListElement | null)[]>([]);
  const viewsRef = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<RowMotionState[]>([]);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const [copies, setCopies] = useState<number[]>([]);
  const reduced = useReducedMotion();

  const split: MarqueeRow[] =
    rows === 2 && logos.length > 1
      ? [
          { logos: logos.filter((_, i) => i % 2 === 0), dir: direction === "left" ? 1 : -1 },
          { logos: logos.filter((_, i) => i % 2 === 1), dir: direction === "left" ? -1 : 1 },
        ]
      : [{ logos, dir: direction === "left" ? 1 : -1 }];

  const liveRef = useRef({ speed, pauseOnHover, split });
  liveRef.current = { speed, pauseOnHover, split };

  useEffect(() => {
    if (reduced) return;
    const measure = () => {
      const next = split.map((_, i) => {
        const set = setsRef.current[i];
        const view = viewsRef.current[i];
        if (!set || !view) return 2;
        const scale = view.getBoundingClientRect().width / (view.offsetWidth || 1) || 1;
        const w = set.getBoundingClientRect().width / scale;
        const s = (stateRef.current[i] ??= { x: i * w * 0.35, v: 0, w, drag: null, seek: 0 });
        if (s.w > 0 && w > 0 && s.w !== w) s.x = (s.x / s.w) * w;
        s.w = w;
        return w > 0 ? Math.min(12, Math.ceil(view.clientWidth / w) + 1) : 2;
      });
      stateRef.current.length = split.length;
      setCopies((prev) => (prev.length === next.length && prev.every((c, i) => c === next[i]) ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    for (const el of [...setsRef.current.slice(0, split.length), ...viewsRef.current.slice(0, split.length)]) {
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, split.length, logos, gap, labels]);

  useEffect(() => {
    const el = rootRef.current;
    if (reduced || !el) return;
    let raf = 0;
    let last = 0;
    let visible = true;

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const { speed: curSpeed, pauseOnHover: curPause, split: curSplit } = liveRef.current;
      const stopped = curPause && (hoverRef.current || focusRef.current);
      curSplit.forEach((row, i) => {
        const s = stateRef.current[i];
        const track = tracksRef.current[i];
        if (!s || !track || s.w <= 0) return;
        if (!s.drag) {
          const target = stopped ? 0 : curSpeed * row.dir;
          const fling = Math.abs(s.v - target) > Math.max(120, curSpeed * 2);
          const tau = fling ? 0.55 : stopped ? 0.32 : 0.7;
          s.v += (target - s.v) * (1 - Math.exp(-dt / tau));
          s.x += s.v * dt;
          if (s.seek) {
            const step = s.seek * (1 - Math.exp(-dt / 0.12));
            s.x += step;
            s.seek = Math.abs(s.seek - step) < 0.5 ? 0 : s.seek - step;
          }
        }
        s.x = mod(s.x, s.w);
        track.style.transform = `translate3d(${-s.x}px, 0, 0)`;
      });
      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      });
      io.observe(el);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const onPointerDown = (i: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stateRef.current[i];
    if (!s || (e.pointerType === "mouse" && e.button !== 0)) return;
    s.drag = { id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, moved: 0, captured: false };
    s.v = 0;
  };

  const onPointerMove = (i: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stateRef.current[i];
    const d = s?.drag;
    if (!s || !d || d.id !== e.pointerId) return;
    const view = e.currentTarget;
    const scale = view.getBoundingClientRect().width / (view.offsetWidth || 1) || 1;
    const dx = (e.clientX - d.lastX) / scale;
    const dt = Math.max(1, e.timeStamp - d.lastT) / 1000;
    d.moved += Math.abs(dx);
    if (!d.captured && d.moved > 4) {
      d.captured = true;
      view.setPointerCapture(e.pointerId);
      view.setAttribute("data-dragging", "");
    }
    s.x -= dx;
    s.v = s.v * 0.6 + (-dx / dt) * 0.4;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };

  const onPointerUp = (i: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stateRef.current[i];
    const d = s?.drag;
    if (!s || !d || d.id !== e.pointerId) return;
    if (e.timeStamp - d.lastT > 80) s.v = 0;
    s.v = clamp(s.v, -2400, 2400);
    s.drag = null;
    e.currentTarget.removeAttribute("data-dragging");
    if (d.captured) {
      const view = e.currentTarget;
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      view.addEventListener("click", stop, { capture: true, once: true });
      window.setTimeout(() => view.removeEventListener("click", stop, { capture: true }), 0);
    }
  };

  const onFocusItem = (i: number) => (e: ReactFocusEvent<HTMLElement>) => {
    const s = stateRef.current[i];
    const view = viewsRef.current[i];
    if (reduced || !s || !view) return;
    const vRect = view.getBoundingClientRect();
    const rRect = e.currentTarget.getBoundingClientRect();
    const pad = Math.min(96, vRect.width * 0.15);
    if (rRect.left < vRect.left + pad) s.seek = rRect.left - (vRect.left + pad);
    else if (rRect.right > vRect.right - pad) s.seek = rRect.right - (vRect.right - pad);
  };

  const renderItem = (logo: MarqueeLogo, rowIdx: number, interactive: boolean, index: number) => {
    const body = (
      <>
        <LogoMark logo={logo} named={labels !== "none"} />
        {labels !== "none" ? (
          <span className="af-mo-lm__name" title={logo.name}>
            {logo.name}
          </span>
        ) : (
          <span className="af-mo-sr">{logo.name}</span>
        )}
      </>
    );
    return (
      <li
        key={`${index}-${logo.name}`}
        className="af-mo-lm__item"
        style={
          {
            "--af-mo-lm-brand": logo.color,
            "--af-mo-lm-scale": logo.scale,
          } as CSSProperties
        }
      >
        {logo.href ? (
          <a
            className="af-mo-lm__link"
            href={logo.href}
            draggable={false}
            tabIndex={interactive ? undefined : -1}
            onFocus={interactive ? onFocusItem(rowIdx) : undefined}
          >
            {body}
          </a>
        ) : (
          <span className="af-mo-lm__link">{body}</span>
        )}
      </li>
    );
  };

  const hasLinks = logos.some((l) => Boolean(l.href));
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const back = e.key === "ArrowLeft";
    if (e.target instanceof HTMLAnchorElement) {
      const list = Array.from(e.target.closest("ul")?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);
      const next = list[list.indexOf(e.target) + (back ? -1 : 1)];
      if (next) {
        e.preventDefault();
        next.focus();
      }
      return;
    }
    if (reduced || e.target !== e.currentTarget) return;
    e.preventDefault();
    for (const s of stateRef.current) if (s) s.seek += back ? -160 : 160;
  };

  if (logos.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={cn("af-mo-lm", "af-mo-marquee", className)}
      style={{ ...style, "--af-mo-lm-gap": `${gap}px` } as CSSProperties}
      role="region"
      aria-label={label}
      tabIndex={!hasLinks && !reduced ? 0 : undefined}
      onKeyDown={onKeyDown}
      data-labels={labels}
      data-grayscale={grayscale || undefined}
      data-static={reduced || undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
      onFocus={(e) => {
        focusRef.current = e.target.matches(":focus-visible");
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusRef.current = false;
      }}
    >
      {eyebrow ? <p className="af-mo-lm__eyebrow">{eyebrow}</p> : null}
      {reduced ? (
        <ul className="af-mo-lm__wrap">{logos.map((l, k) => renderItem(l, 0, true, k))}</ul>
      ) : (
        split.map((row, i) => (
          <div
            key={i}
            ref={(n) => {
              viewsRef.current[i] = n;
            }}
            className="af-mo-lm__row"
            onPointerDown={onPointerDown(i)}
            onPointerMove={onPointerMove(i)}
            onPointerUp={onPointerUp(i)}
            onPointerCancel={onPointerUp(i)}
          >
            <div
              ref={(n) => {
                tracksRef.current[i] = n;
              }}
              className="af-mo-lm__track"
            >
              {Array.from({ length: Math.max(3, copies[i] ?? 3) }, (_, c) => (
                <ul
                  key={c}
                  ref={
                    c === 0
                      ? (n) => {
                          setsRef.current[i] = n;
                        }
                      : undefined
                  }
                  className="af-mo-lm__set"
                  aria-hidden={c > 0 || undefined}
                  {...(c > 0 ? { inert: "true" as unknown as boolean } : undefined)}
                >
                  {row.logos.map((l, k) => renderItem(l, i, c === 0, k))}
                </ul>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
