import { useEffect, useId, useRef, type CSSProperties } from "react";

export interface AfCloudSharedProps {
  /** Sky palette ("blue" or "orange"). */
  color?: "blue" | "orange";
  /** Render the full sky gradient background. */
  background?: boolean;
  /** Follow pointer movement with the eyes. */
  followPointer?: boolean;
  /** Accessible description of the cloud. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export type AfFrostCloudProps = AfCloudSharedProps;
export type AfGlowCloudProps = AfCloudSharedProps;

interface CloudRefs {
  rootRef: React.RefObject<HTMLDivElement | null>;
  shadowRef: React.RefObject<SVGEllipseElement | null>;
  bobGroupRef: React.RefObject<SVGGElement | null>;
  bodyGroupRef: React.RefObject<SVGGElement | null>;
  shineRef: React.RefObject<SVGEllipseElement | null>;
  eyesGroupRef: React.RefObject<SVGGElement | null>;
  leftEyeRef: React.RefObject<SVGGElement | null>;
  rightEyeRef: React.RefObject<SVGGElement | null>;
}

function useCloudAnimation(refs: CloudRefs, followPointer: boolean) {
  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) return;

    let rafId = 0;
    const pointer = { active: false, x: 0, y: 0 };
    const look = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    const squish = { v: 0, vel: 0 }; // positive = squished wider/shorter
    let nextGlanceAt = performance.now() + 1400;
    let nextBlinkAt = performance.now() + 2100;
    let blinkStart = -1;
    let blinkDur = 150;
    let blinkDouble = false;
    let winkSide: 0 | -1 | 1 = 0;
    let winkUntil = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!followPointer) return;
      const el = refs.rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const nx = Math.max(-1, Math.min(1, ((e.clientX - (r.left + r.width / 2)) / (r.width * 0.45))));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - (r.top + r.height / 2)) / (r.height * 0.45))));
      pointer.active = true;
      pointer.x = nx;
      pointer.y = ny;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const triggerSquish = () => {
      squish.vel = 3.4;
      winkSide = Math.random() > 0.5 ? 1 : -1;
      winkUntil = performance.now() + 320;
    };

    const el = refs.rootRef.current;
    if (el) {
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerleave", onPointerLeave);
      el.addEventListener("pointerdown", triggerSquish);
    }

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // Idle random glances when pointer is not steering
      if (pointer.active) {
        look.tx = pointer.x * 11;
        look.ty = pointer.y * 7;
      } else if (now >= nextGlanceAt) {
        const roll = Math.random();
        if (roll < 0.35) {
          look.tx = 0;
          look.ty = 0;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const mag = 4 + Math.random() * 6.5;
          look.tx = Math.cos(ang) * mag;
          look.ty = Math.sin(ang) * mag * 0.62;
        }
        nextGlanceAt = now + 1500 + Math.random() * 2100;
      }

      // Smooth spring for look vector
      const lkStiff = 120;
      const lkDamp = 16;
      look.vx += ((look.tx - look.x) * lkStiff - look.vx * lkDamp) * dt;
      look.vy += ((look.ty - look.y) * lkStiff - look.vy * lkDamp) * dt;
      look.x += look.vx * dt;
      look.y += look.vy * dt;

      // Squish spring on click
      squish.vel += (-260 * squish.v - 15 * squish.vel) * dt;
      squish.v += squish.vel * dt;

      // Blink scheduler
      if (blinkStart < 0 && now >= nextBlinkAt) {
        blinkStart = now;
        blinkDur = 145;
        blinkDouble = Math.random() < 0.24;
      }
      let eyeScaleL = 1;
      let eyeScaleR = 1;
      if (blinkStart >= 0) {
        const p = (now - blinkStart) / blinkDur;
        if (p <= 1) {
          const closed = Math.sin(p * Math.PI);
          eyeScaleL = Math.max(0.08, 1 - closed * 0.92);
          eyeScaleR = eyeScaleL;
        } else if (blinkDouble && p <= 2.3) {
          if (p >= 1.3) {
            const p2 = (p - 1.3) / 1.0;
            const closed = Math.sin(Math.min(1, p2) * Math.PI);
            eyeScaleL = Math.max(0.08, 1 - closed * 0.92);
            eyeScaleR = eyeScaleL;
          }
        } else {
          blinkStart = -1;
          nextBlinkAt = now + 2200 + Math.random() * 2800;
        }
      }

      if (now < winkUntil) {
        const wp = Math.sin(((winkUntil - now) / 320) * Math.PI);
        const ws = Math.max(0.1, 1 - wp * 0.9);
        if (winkSide < 0) eyeScaleL = Math.min(eyeScaleL, ws);
        else if (winkSide > 0) eyeScaleR = Math.min(eyeScaleR, ws);
      }

      // Gentle vertical float + breath
      const bobY = Math.sin(t * 2.05) * 4.8;
      const breath = Math.sin(t * 2.05 + 0.6) * 0.012;
      const sx = 1 + breath + squish.v * 0.14;
      const sy = 1 - breath - squish.v * 0.14;

      const shadowScale = 0.91 + ((bobY + 4.8) / 9.6) * 0.09;
      const shadowOpacity = 0.23 + ((bobY + 4.8) / 9.6) * 0.08;

      if (refs.shadowRef.current) {
        refs.shadowRef.current.setAttribute(
          "transform",
          `translate(120 210) scale(${shadowScale.toFixed(3)} 1) translate(-120 -210)`
        );
        refs.shadowRef.current.setAttribute("opacity", shadowOpacity.toFixed(3));
      }
      if (refs.bobGroupRef.current) {
        refs.bobGroupRef.current.setAttribute(
          "transform",
          `translate(0 ${bobY.toFixed(2)}) translate(120 180) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-120 -180)`
        );
      }
      if (refs.bodyGroupRef.current) {
        const bodyTx = look.x * 0.28;
        const bodyTy = look.y * 0.22;
        const rot = look.x * 0.36;
        const perspX = 1 - Math.abs(look.x) * 0.0022;
        refs.bodyGroupRef.current.setAttribute(
          "transform",
          `translate(${bodyTx.toFixed(2)} ${bodyTy.toFixed(2)}) translate(120 120) rotate(${rot.toFixed(2)}) scale(${perspX.toFixed(4)} 1) translate(-120 -120)`
        );
      }
      if (refs.shineRef.current) {
        refs.shineRef.current.setAttribute(
          "transform",
          `translate(${(-look.x * 0.35).toFixed(2)} ${(-look.y * 0.25).toFixed(2)})`
        );
      }
      if (refs.eyesGroupRef.current) {
        refs.eyesGroupRef.current.setAttribute(
          "transform",
          `translate(${look.x.toFixed(2)} ${look.y.toFixed(2)})`
        );
      }
      if (refs.leftEyeRef.current) {
        refs.leftEyeRef.current.setAttribute(
          "transform",
          `translate(105.5 121.5) scale(1 ${eyeScaleL.toFixed(3)}) translate(-105.5 -121.5)`
        );
      }
      if (refs.rightEyeRef.current) {
        refs.rightEyeRef.current.setAttribute(
          "transform",
          `translate(136.5 121.5) scale(1 ${eyeScaleR.toFixed(3)}) translate(-136.5 -121.5)`
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (el) {
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerleave", onPointerLeave);
        el.removeEventListener("pointerdown", triggerSquish);
      }
    };
  }, [followPointer, refs]);
}

const CLOUD_PUFFS = (
  <>
    <circle cx="115" cy="93" r="43" />
    <circle cx="163" cy="111" r="39" />
    <circle cx="156" cy="155" r="31" />
    <circle cx="107" cy="155" r="35" />
    <circle cx="72" cy="126" r="34" />
    <rect x="80" y="100" width="80" height="65" />
  </>
);

/**
 * Frosted white metaball cloud that floats, glances around, blinks, tracks the pointer, and squishes + winks on click.
 */
export function AfFrostCloud(props: AfFrostCloudProps = {}) {
  const {
    color = "blue",
    background = true,
    followPointer = true,
    label = "A frosted white cloud with eyes that floats, looks around and blinks",
    className,
    style,
  } = props;

  const uid = useId().replace(/:/g, "_");
  const rootRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const bobGroupRef = useRef<SVGGElement>(null);
  const bodyGroupRef = useRef<SVGGElement>(null);
  const shineRef = useRef<SVGEllipseElement>(null);
  const eyesGroupRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);

  useCloudAnimation(
    { rootRef, shadowRef, bobGroupRef, bodyGroupRef, shineRef, eyesGroupRef, leftEyeRef, rightEyeRef },
    followPointer
  );

  return (
    <div
      ref={rootRef}
      className={className ? `ui-fc ${className}` : "ui-fc"}
      data-bg={background ? "true" : undefined}
      data-color={color}
      role="img"
      aria-label={label}
      style={style}
    >
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <filter id={`fc-${uid}-goo`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3.5" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" />
          </filter>
          <filter id={`fc-${uid}-soft`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id={`fc-${uid}-halo`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`fc-${uid}-edge`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={`fc-${uid}-shade`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <g id={`fc-${uid}-shape`} filter={`url(#fc-${uid}-goo)`}>
            {CLOUD_PUFFS}
          </g>
          <mask id={`fc-${uid}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
            <use href={`#fc-${uid}-shape`} fill="#fff" />
          </mask>
          <linearGradient id={`fc-${uid}-frost`} x1="0" y1="50" x2="0" y2="192" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--ui-fc-white)" }} />
            <stop offset="1" style={{ stopColor: "var(--ui-fc-frost)", stopOpacity: 0.97 }} />
          </linearGradient>
          <linearGradient id={`fc-${uid}-hole`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ui-fc-hole-1)" }} />
            <stop offset="1" style={{ stopColor: "var(--ui-fc-hole-2)" }} />
          </linearGradient>
        </defs>

        <ellipse
          ref={shadowRef}
          className="ui-fc__shadow"
          cx="120"
          cy="210"
          rx="54"
          ry="7"
          filter={`url(#fc-${uid}-shade)`}
          transform="translate(120 210) scale(0.92 1) translate(-120 -210)"
          opacity="0.26"
        />
        <g ref={bobGroupRef}>
          <g ref={bodyGroupRef}>
            <use href={`#fc-${uid}-shape`} className="ui-fc__halo" filter={`url(#fc-${uid}-halo)`} />
            <use href={`#fc-${uid}-shape`} className="ui-fc__edge" filter={`url(#fc-${uid}-edge)`} />
            <g mask={`url(#fc-${uid}-mask)`}>
              <rect width="240" height="240" fill={`url(#fc-${uid}-frost)`} />
              <g
                filter={`url(#fc-${uid}-soft)`}
                className="ui-fc__tint"
                transform="translate(-6 18) translate(120 120) scale(0.84 0.78) translate(-120 -120)"
              >
                {CLOUD_PUFFS}
              </g>
              <ellipse
                ref={shineRef}
                cx="108"
                cy="78"
                rx="34"
                ry="14"
                fill="#fff"
                opacity="0.75"
                filter={`url(#fc-${uid}-shade)`}
              />
            </g>
            <g ref={eyesGroupRef}>
              <g ref={leftEyeRef}>
                <rect x="95" y="105" width="21" height="34" rx="10.5" className="ui-fc__eye-drop" filter={`url(#fc-${uid}-edge)`} />
                <rect x="96.5" y="106" width="18" height="31" rx="9" fill={`url(#fc-${uid}-hole)`} />
                <clipPath id={`fc-${uid}-clip-l`}>
                  <rect x="96.5" y="106" width="18" height="31" rx="9" />
                </clipPath>
                <rect
                  x="96.5"
                  y="108.5"
                  width="18"
                  height="31"
                  rx="9"
                  className="ui-fc__eye-shade"
                  fill="none"
                  strokeWidth="5"
                  filter={`url(#fc-${uid}-edge)`}
                  clipPath={`url(#fc-${uid}-clip-l)`}
                />
              </g>
              <g ref={rightEyeRef}>
                <rect x="126" y="105" width="21" height="34" rx="10.5" className="ui-fc__eye-drop" filter={`url(#fc-${uid}-edge)`} />
                <rect x="127.5" y="106" width="18" height="31" rx="9" fill={`url(#fc-${uid}-hole)`} />
                <clipPath id={`fc-${uid}-clip-r`}>
                  <rect x="127.5" y="106" width="18" height="31" rx="9" />
                </clipPath>
                <rect
                  x="127.5"
                  y="108.5"
                  width="18"
                  height="31"
                  rx="9"
                  className="ui-fc__eye-shade"
                  fill="none"
                  strokeWidth="5"
                  filter={`url(#fc-${uid}-edge)`}
                  clipPath={`url(#fc-${uid}-clip-r)`}
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * Glowing inner-lit metaball cloud that floats, glances around, blinks, tracks the pointer, and squishes + winks on click.
 */
export function AfGlowCloud(props: AfGlowCloudProps = {}) {
  const {
    color = "orange",
    background = true,
    followPointer = true,
    label = "A glowing cloud with eyes that floats, looks around and blinks",
    className,
    style,
  } = props;

  const uid = useId().replace(/:/g, "_");
  const rootRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const bobGroupRef = useRef<SVGGElement>(null);
  const bodyGroupRef = useRef<SVGGElement>(null);
  const shineRef = useRef<SVGEllipseElement>(null);
  const eyesGroupRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);

  useCloudAnimation(
    { rootRef, shadowRef, bobGroupRef, bodyGroupRef, shineRef, eyesGroupRef, leftEyeRef, rightEyeRef },
    followPointer
  );

  return (
    <div
      ref={rootRef}
      className={className ? `ui-glw ${className}` : "ui-glw"}
      data-bg={background ? "true" : undefined}
      data-color={color}
      role="img"
      aria-label={label}
      style={style}
    >
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <filter id={`gc-${uid}-goo`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3.5" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" />
          </filter>
          <filter id={`gc-${uid}-soft`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={`gc-${uid}-halo`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`gc-${uid}-edge`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={`gc-${uid}-shade`} x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <g id={`gc-${uid}-shape`} filter={`url(#gc-${uid}-goo)`}>
            {CLOUD_PUFFS}
          </g>
          <mask id={`gc-${uid}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
            <use href={`#gc-${uid}-shape`} fill="#fff" />
          </mask>
          <linearGradient id={`gc-${uid}-rim`} x1="0" y1="56" x2="0" y2="182" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--ui-glw-rim)" }} />
            <stop offset="1" style={{ stopColor: "var(--ui-glw-white)" }} />
          </linearGradient>
          <radialGradient id={`gc-${uid}-body`} cx="120" cy="108" r="78" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--ui-glw-body-1)" }} />
            <stop offset="0.6" style={{ stopColor: "var(--ui-glw-body-2)" }} />
            <stop offset="1" style={{ stopColor: "var(--ui-glw-body-3)" }} />
          </radialGradient>
          <linearGradient id={`gc-${uid}-eye`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ui-glw-white)" }} />
            <stop offset="1" style={{ stopColor: "var(--ui-glw-eye)" }} />
          </linearGradient>
        </defs>

        <ellipse
          ref={shadowRef}
          className="ui-glw__shadow"
          cx="120"
          cy="210"
          rx="54"
          ry="7"
          filter={`url(#gc-${uid}-shade)`}
          transform="translate(120 210) scale(0.92 1) translate(-120 -210)"
          opacity="0.27"
        />
        <g ref={bobGroupRef}>
          <g ref={bodyGroupRef}>
            <use href={`#gc-${uid}-shape`} className="ui-glw__halo" filter={`url(#gc-${uid}-halo)`} />
            <use href={`#gc-${uid}-shape`} className="ui-glw__edge" filter={`url(#gc-${uid}-edge)`} />
            <g mask={`url(#gc-${uid}-mask)`}>
              <rect width="240" height="240" fill={`url(#gc-${uid}-rim)`} />
              <g
                filter={`url(#gc-${uid}-soft)`}
                fill={`url(#gc-${uid}-body)`}
                transform="translate(0 2) translate(120 120) scale(0.9 0.87) translate(-120 -120)"
              >
                {CLOUD_PUFFS}
              </g>
              <ellipse
                ref={shineRef}
                cx="104"
                cy="80"
                rx="30"
                ry="12"
                fill="#fff"
                opacity="0.32"
                filter={`url(#gc-${uid}-shade)`}
              />
            </g>
            <g ref={eyesGroupRef}>
              <g ref={leftEyeRef}>
                <rect x="96.5" y="106" width="18" height="31" rx="9" fill={`url(#gc-${uid}-eye)`} />
                <clipPath id={`gc-${uid}-clip-l`}>
                  <rect x="96.5" y="106" width="18" height="31" rx="9" />
                </clipPath>
                <rect
                  x="96.5"
                  y="108.5"
                  width="18"
                  height="31"
                  rx="9"
                  className="ui-glw__eye-shade"
                  fill="none"
                  strokeWidth="5"
                  filter={`url(#gc-${uid}-edge)`}
                  clipPath={`url(#gc-${uid}-clip-l)`}
                />
              </g>
              <g ref={rightEyeRef}>
                <rect x="127.5" y="106" width="18" height="31" rx="9" fill={`url(#gc-${uid}-eye)`} />
                <clipPath id={`gc-${uid}-clip-r`}>
                  <rect x="127.5" y="106" width="18" height="31" rx="9" />
                </clipPath>
                <rect
                  x="127.5"
                  y="108.5"
                  width="18"
                  height="31"
                  rx="9"
                  className="ui-glw__eye-shade"
                  fill="none"
                  strokeWidth="5"
                  filter={`url(#gc-${uid}-edge)`}
                  clipPath={`url(#gc-${uid}-clip-r)`}
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
