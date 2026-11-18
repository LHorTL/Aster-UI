import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

/** Props for AfVoiceOrb. */
export type AfVoiceOrbProps = {
  /** What the assistant is doing – the orb melts from one state into the next */
  state?: VoiceOrbState;
  /** Loudness from 0 to 1 while listening or speaking. Without it the orb makes up a natural-looking level */
  level?: number;
  /** Edge length in px */
  size?: number;
  /** Number of dots – raise it for large sizes */
  dots?: number;
  /** Color the moving dots take on; resting dots use the text color */
  accent?: string;
  /** The line under the orb – false hides it, an object replaces single texts */
  label?: boolean | Partial<Record<VoiceOrbState, string>>;
  /** Dots give way to the mouse pointer */
  interactive?: boolean;
  /** Makes the orb a button, e.g. to start and stop listening */
  onPress?: () => void;
  /** Extra class on the root */
  className?: string;
  /** Inline styles on the root – set color here to change the resting dots */
  style?: CSSProperties;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const NAMED_ACCENTS: Record<string, string> = {
  blue: "var(--ui-vo-accent)",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

function parseRgb(str: string, fallback: [number, number, number]): [number, number, number] {
  const m = str.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return fallback;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** The face of a voice assistant – a sphere of dots that breathes, catches sound, collapses into a spinning ring while thinking and ripples when it speaks. */
export function AfVoiceOrb({
  state = "idle",
  level,
  size = 220,
  dots = 520,
  accent = "blue",
  label = true,
  interactive = true,
  onPress,
  className,
  style,
}: AfVoiceOrbProps = {}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const accentProbeRef = useRef<HTMLSpanElement | null>(null);

  const stateRef = useRef<VoiceOrbState>(state);
  const levelRef = useRef<number | undefined>(level);
  const interactiveRef = useRef<boolean>(interactive);
  stateRef.current = state;
  levelRef.current = level;
  interactiveRef.current = interactive;

  const pointerRef = useRef({ tx: 0, ty: 0, x: 0, y: 0, active: false });
  const pressRef = useRef({ pressed: false, scale: 1 });

  // Precompute Fibonacci sphere unit points
  const sphere = useMemo(() => {
    const count = Math.max(32, Math.floor(dots));
    const pts = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * GOLDEN_ANGLE;
      pts[i * 4] = Math.cos(phi) * r;
      pts[i * 4 + 1] = y;
      pts[i * 4 + 2] = Math.sin(phi) * r;
      pts[i * 4 + 3] = phi;
    }
    return { count, pts };
  }, [dots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2.5, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    let inkRgb: [number, number, number] = [24, 24, 27];
    let accRgb: [number, number, number] = [47, 107, 255];

    const readColors = () => {
      if (typeof window === "undefined") return;
      inkRgb = parseRgb(window.getComputedStyle(canvas).color, [24, 24, 27]);
      if (accentProbeRef.current) {
        accRgb = parseRgb(window.getComputedStyle(accentProbeRef.current).color, [47, 107, 255]);
      }
    };
    readColors();

    const weights = {
      idle: stateRef.current === "idle" ? 1 : 0,
      listening: stateRef.current === "listening" ? 1 : 0,
      thinking: stateRef.current === "thinking" ? 1 : 0,
      speaking: stateRef.current === "speaking" ? 1 : 0,
    };
    let smoothLevel = levelRef.current ?? 0.35;
    let time = 0;
    let rotAngle = reducedCheck();
    let frameCount = 0;
    let lastTs = 0;
    let rafId = 0;
    let inView = true;
    let docVisible = typeof document === "undefined" ? true : !document.hidden;

    function reducedCheck() {
      return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0.42 : 0;
    }

    const mql = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    let reduced = Boolean(mql?.matches);

    const drawList = new Float32Array(sphere.count * 5); // x2d, y2d, z, dotR, accentMix
    const order = new Int32Array(sphere.count);

    const drawFrame = (t: number, dt: number) => {
      const targetState = stateRef.current;
      const blend = reduced ? 1 : 1 - Math.exp(-dt * 9.5);
      weights.idle += ((targetState === "idle" ? 1 : 0) - weights.idle) * blend;
      weights.listening += ((targetState === "listening" ? 1 : 0) - weights.listening) * blend;
      weights.thinking += ((targetState === "thinking" ? 1 : 0) - weights.thinking) * blend;
      weights.speaking += ((targetState === "speaking" ? 1 : 0) - weights.speaking) * blend;

      if (!reduced && dt > 0) {
        rotAngle += dt * (0.34 + 1.38 * weights.thinking);
      }

      const synthLevel =
        0.38 +
        0.26 * Math.sin(t * 4.3) * Math.sin(t * 1.9 + 0.6) +
        0.18 * Math.cos(t * 7.1) * Math.sin(t * 2.7);
      const rawLvl = levelRef.current !== undefined
        ? Math.max(0, Math.min(1, levelRef.current))
        : reduced
          ? 0.52
          : Math.max(0.08, Math.min(0.95, synthLevel));
      smoothLevel += (rawLvl - smoothLevel) * (reduced ? 1 : 1 - Math.exp(-dt * 12));

      // Smooth pointer coordinates
      const p = pointerRef.current;
      const pTargetX = p.active && interactiveRef.current && !reduced ? p.tx : 0;
      const pTargetY = p.active && interactiveRef.current && !reduced ? p.ty : 0;
      p.x += (pTargetX - p.x) * (1 - Math.exp(-dt * 14));
      p.y += (pTargetY - p.y) * (1 - Math.exp(-dt * 14));
      const repulseStrength = p.active && interactiveRef.current && !reduced ? 1 : Math.hypot(p.x, p.y) / (size * 0.5);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size * 0.5;
      const cy = size * 0.5;
      const pressTarget = pressRef.current.pressed && !reduced ? 0.97 : 1;
      pressRef.current.scale += (pressTarget - pressRef.current.scale) * (reduced ? 1 : 1 - Math.exp(-dt * 14));
      const baseR = size * 0.365 * pressRef.current.scale;

      // Soft ambient glow when listening or thinking
      const glowAmt = weights.listening * smoothLevel * 0.16 + weights.thinking * 0.09 + weights.speaking * smoothLevel * 0.08;
      if (glowAmt > 0.005) {
        const grad = ctx.createRadialGradient(cx, cy, baseR * 0.12, cx, cy, baseR * 1.32);
        grad.addColorStop(0, `rgba(${accRgb[0]}, ${accRgb[1]}, ${accRgb[2]}, ${glowAmt.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${accRgb[0]}, ${accRgb[1]}, ${accRgb[2]}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 1.32, 0, Math.PI * 2);
        ctx.fill();
      }

      const cosRot = Math.cos(rotAngle);
      const sinRot = Math.sin(rotAngle);
      const cosTiltX = Math.cos(0.22);
      const sinTiltX = Math.sin(0.22);
      const breathe = 1 + 0.025 * Math.sin(t * 1.65);

      // Thinking volumetric 3D spherical-torus shell (~45 deg X tilt, slight Z roll)
      // Uses the same coherent azimuth phase as Idle/Listening/Speaking so transitions never cancel X
      const cosRingX = Math.cos(0.78);
      const sinRingX = Math.sin(0.78);
      const cosRingZ = Math.cos(-0.24);
      const sinRingZ = Math.sin(-0.24);

      const pts = sphere.pts;
      const count = sphere.count;
      const repulseR = size * 0.25;

      for (let i = 0; i < count; i++) {
        const x0 = pts[i * 4];
        const y0 = pts[i * 4 + 1];
        const z0 = pts[i * 4 + 2];
        const phi = pts[i * 4 + 3];

        // Coherent rotated sphere coordinates (az = phi - rotAngle)
        const rx = x0 * cosRot + z0 * sinRot;
        const rz0 = -x0 * sinRot + z0 * cosRot;
        const ry = y0 * cosTiltX - rz0 * sinTiltX;
        const rz = y0 * sinTiltX + rz0 * cosTiltX;

        // 1. Idle sphere
        const ix = rx * breathe;
        const iy = ry * breathe;
        const iz = rz * breathe;

        // 2. Listening: harmonic outward spikes
        const harmonic =
          Math.max(0, Math.sin(x0 * 3.1 + t * 5.1) * Math.cos(y0 * 2.8 - t * 4.2) + 0.45 * Math.sin(z0 * 3.6 + t * 6.3));
        const lDisp = smoothLevel * (0.08 + 0.22 * harmonic);
        const lScale = 1 + lDisp;
        const lx = rx * lScale;
        const ly = ry * lScale;
        const lz = rz * lScale;
        const lAcc = Math.min(1, lDisp * 3.2 + smoothLevel * 0.28);

        // 3. Thinking: wide volumetric 3D hollow spherical-torus shell with traveling blue wave
        const az = phi - rotAngle;
        const cosAz = Math.cos(az);
        const sinAz = Math.sin(az);
        const tubeAngle = y0 * Math.PI;
        const comet = Math.pow(0.5 + 0.5 * Math.cos(az + t * 2.6 + y0 * 0.65), 3.0);
        const majorR = 0.74 + 0.04 * comet;
        const minorR = 0.25;
        const ringRad = majorR + minorR * Math.cos(tubeAngle);
        const tx0 = ringRad * cosAz;
        const tz0 = ringRad * sinAz;
        const ty0 = minorR * Math.sin(tubeAngle);
        // Tilt around X then Z
        const ty1 = ty0 * cosRingX - tz0 * sinRingX;
        const tz1 = ty0 * sinRingX + tz0 * cosRingX;
        const thx = tx0 * cosRingZ - ty1 * sinRingZ;
        const thy = tx0 * sinRingZ + ty1 * cosRingZ;
        const thz = tz1;
        const thAcc = Math.min(1, 0.1 + comet * 0.92);

        // 4. Speaking: pole-to-pole traveling waves
        const wave = Math.sin(y0 * 6.4 - t * 6.2) * (0.55 + 0.45 * Math.cos(phi * 2 + t * 2.2));
        const sScale = 1 + smoothLevel * 0.15 * wave;
        const sx = rx * sScale;
        const sy = ry * sScale;
        const sz = rz * sScale;
        const sAcc = Math.min(1, Math.max(0, wave) * (0.3 + 0.7 * smoothLevel));

        // Blend 3D position + accent mix
        const bx = ix * weights.idle + lx * weights.listening + thx * weights.thinking + sx * weights.speaking;
        const by = iy * weights.idle + ly * weights.listening + thy * weights.thinking + sy * weights.speaking;
        const bz = iz * weights.idle + lz * weights.listening + thz * weights.thinking + sz * weights.speaking;
        const accMix = Math.max(
          0,
          Math.min(1, lAcc * weights.listening + thAcc * weights.thinking + sAcc * weights.speaking)
        );

        const persp = 2.9 / (2.9 - bz);
        let px = cx + bx * baseR * persp;
        let py = cy + by * baseR * persp;

        if (repulseStrength > 0.01) {
          const dx = px - (cx + p.x);
          const dy = py - (cy + p.y);
          const dist = Math.hypot(dx, dy);
          if (dist < repulseR && dist > 0.001) {
            const push = Math.pow(1 - dist / repulseR, 2) * (size * 0.075) * Math.min(1, repulseStrength);
            px += (dx / dist) * push;
            py += (dy / dist) * push;
          }
        }

        const depth01 = Math.max(0, Math.min(1, (bz + 1.15) / 2.3));
        const dotR = 0.95 + 0.95 * depth01 + 0.42 * accMix;

        const base = i * 5;
        drawList[base] = px;
        drawList[base + 1] = py;
        drawList[base + 2] = bz;
        drawList[base + 3] = dotR;
        drawList[base + 4] = accMix;
        order[i] = i;
      }

      // Back-to-front depth sort
      order.sort((a, b) => drawList[a * 5 + 2] - drawList[b * 5 + 2]);

      for (let k = 0; k < count; k++) {
        const idx = order[k] * 5;
        const px = drawList[idx];
        const py = drawList[idx + 1];
        const bz = drawList[idx + 2];
        const dotR = drawList[idx + 3];
        const accMix = drawList[idx + 4];
        const depth01 = Math.max(0, Math.min(1, (bz + 1.15) / 2.3));
        const alpha = Math.min(1, 0.16 + 0.78 * Math.pow(depth01, 1.32) + 0.14 * accMix);
        const r = Math.round(inkRgb[0] + (accRgb[0] - inkRgb[0]) * accMix);
        const g = Math.round(inkRgb[1] + (accRgb[1] - inkRgb[1]) * accMix);
        const b = Math.round(inkRgb[2] + (accRgb[2] - inkRgb[2]) * accMix);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (ts: number) => {
      rafId = 0;
      if (!inView || !docVisible || reduced) return;
      if ((++frameCount & 15) === 0) readColors();
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;
      time += dt;
      drawFrame(time, dt);
      rafId = requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (reduced) {
        drawFrame(1.25, 1);
        return;
      }
      if (inView && docVisible && !rafId) {
        lastTs = 0;
        rafId = requestAnimationFrame(tick);
      }
    };

    const stopRunning = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    drawFrame(reduced ? 1.25 : 0, 1);
    ensureRunning();

    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          inView = entries[0]?.isIntersecting ?? true;
          if (inView) ensureRunning();
          else stopRunning();
        })
      : null;
    io?.observe(root);

    const onVis = () => {
      docVisible = !document.hidden;
      if (docVisible) ensureRunning();
      else stopRunning();
    };
    document.addEventListener("visibilitychange", onVis);

    const onMotion = () => {
      reduced = Boolean(mql?.matches);
      if (reduced) {
        stopRunning();
        rotAngle = 0.42;
        drawFrame(1.25, 1);
      } else {
        ensureRunning();
      }
    };
    mql?.addEventListener?.("change", onMotion);

    let themeRafId = 0;
    const syncThemeColors = () => {
      readColors();
      drawFrame(reduced ? 1.25 : time, 0);
      if (themeRafId) cancelAnimationFrame(themeRafId);
      themeRafId = requestAnimationFrame(() => {
        themeRafId = 0;
        readColors();
        drawFrame(reduced ? 1.25 : time, 0);
      });
    };

    const mo = typeof MutationObserver !== "undefined"
      ? new MutationObserver(syncThemeColors)
      : null;
    if (mo) {
      const observed = new Set<Element>();
      let n: HTMLElement | null = root;
      while (n) {
        observed.add(n);
        n = n.parentElement;
      }
      if (typeof document !== "undefined") {
        if (document.documentElement) observed.add(document.documentElement);
        if (document.body) observed.add(document.body);
      }
      for (const el of observed) {
        mo.observe(el, { attributes: true, attributeFilter: ["class", "data-theme", "data-accent", "style", "data-vo-tick"] });
      }
    }

    return () => {
      stopRunning();
      if (themeRafId) cancelAnimationFrame(themeRafId);
      io?.disconnect();
      mo?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mql?.removeEventListener?.("change", onMotion);
    };
  }, [size, sphere, accent]);

  // Trigger a redraw when state/level changes under reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      rootRef.current?.setAttribute("data-vo-tick", state);
    }
  }, [state, level]);

  const defaultLabels: Record<VoiceOrbState, string> = {
    idle: onPress ? "Tap to speak" : "Idle",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };
  const customMap = typeof label === "object" && label !== null ? label : undefined;
  const labelText = customMap?.[state] ?? defaultLabels[state];
  const showLabel = label !== false;
  const showDots = state === "thinking" && !customMap?.[state];

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!interactive || e.pointerType === "touch") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerRef.current.tx = e.clientX - (rect.left + rect.width * 0.5);
    pointerRef.current.ty = e.clientY - (rect.top + rect.height * 0.5);
    pointerRef.current.active = true;
  };

  const onPointerLeave = () => {
    pointerRef.current.active = false;
    pressRef.current.pressed = false;
  };

  const resolvedAccent = NAMED_ACCENTS[accent] ?? accent;
  const mergedStyle = {
    "--ui-vo-size": `${size}px`,
    ...(style?.color ? { "--ui-vo-dot": style.color } : undefined),
    ...style,
  } as CSSProperties;

  const inner = (
    <>
      <canvas ref={canvasRef} className="ui-vo__canvas" aria-hidden="true" width={size * 2} height={size * 2} />
      {showLabel && (
        <span className="ui-vo__label" aria-live="polite">
          <span key={state}>
            {labelText}
            {showDots && (
              <span className="ui-vo__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
          </span>
        </span>
      )}
      <span ref={accentProbeRef} style={{ display: "none", color: resolvedAccent }} />
    </>
  );

  if (onPress) {
    return (
      <button
        ref={(el) => {
          rootRef.current = el;
        }}
        type="button"
        className={["ui-vo", className].filter(Boolean).join(" ")}
        data-state={state}
        style={mergedStyle}
        aria-label={!showLabel ? labelText : undefined}
        onClick={onPress}
        onPointerDown={() => {
          pressRef.current.pressed = true;
        }}
        onPointerUp={() => {
          pressRef.current.pressed = false;
        }}
        onPointerCancel={() => {
          pressRef.current.pressed = false;
        }}
        onBlur={() => {
          pressRef.current.pressed = false;
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
      }}
      role="img"
      aria-label={labelText}
      className={["ui-vo", className].filter(Boolean).join(" ")}
      data-state={state}
      style={mergedStyle}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {inner}
    </div>
  );
}
