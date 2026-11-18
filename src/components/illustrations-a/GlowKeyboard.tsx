import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useReducedMotion } from "../../primitives";

export interface AfGlowKeyboardProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Auto-type demo prompts until the user interacts. */
  demo?: boolean;
  /** Prompts cycled during the demo loop. */
  prompts?: string[];
  className?: string;
  style?: CSSProperties;
}

interface KeyDef {
  k?: string;
  label?: string;
  cls?: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const KEYS: KeyDef[] = [
  // Row 0: Function keys + Touch ID
  { k: "Escape", label: "esc", cls: "ui-gk-key--mod ui-gk-key--sm", left: 24, top: 24, width: 149, height: 56 },
  { k: "F1", label: "F1", cls: "ui-gk-key--fkey", left: 183, top: 24, width: 96, height: 56 },
  { k: "F2", label: "F2", cls: "ui-gk-key--fkey", left: 289, top: 24, width: 96, height: 56 },
  { k: "F3", label: "F3", cls: "ui-gk-key--fkey", left: 395, top: 24, width: 96, height: 56 },
  { k: "F4", label: "F4", cls: "ui-gk-key--fkey", left: 501, top: 24, width: 96, height: 56 },
  { k: "F5", label: "F5", cls: "ui-gk-key--fkey", left: 607, top: 24, width: 96, height: 56 },
  { k: "F6", label: "F6", cls: "ui-gk-key--fkey", left: 713, top: 24, width: 96, height: 56 },
  { k: "F7", label: "F7", cls: "ui-gk-key--fkey", left: 819, top: 24, width: 96, height: 56 },
  { k: "F8", label: "F8", cls: "ui-gk-key--fkey", left: 925, top: 24, width: 96, height: 56 },
  { k: "F9", label: "F9", cls: "ui-gk-key--fkey", left: 1031, top: 24, width: 96, height: 56 },
  { k: "F10", label: "F10", cls: "ui-gk-key--fkey", left: 1137, top: 24, width: 96, height: 56 },
  { k: "F11", label: "F11", cls: "ui-gk-key--fkey", left: 1243, top: 24, width: 96, height: 56 },
  { k: "F12", label: "F12", cls: "ui-gk-key--fkey", left: 1349, top: 24, width: 96, height: 56 },
  { cls: "ui-gk-key--touchid", left: 1455, top: 24, width: 96, height: 56 },

  // Row 1: Numbers + Backspace
  { k: "^", label: "^", left: 24, top: 90, width: 96, height: 96 },
  { k: "1", label: "1", left: 130, top: 90, width: 96, height: 96 },
  { k: "2", label: "2", left: 236, top: 90, width: 96, height: 96 },
  { k: "3", label: "3", left: 342, top: 90, width: 96, height: 96 },
  { k: "4", label: "4", left: 448, top: 90, width: 96, height: 96 },
  { k: "5", label: "5", left: 554, top: 90, width: 96, height: 96 },
  { k: "6", label: "6", left: 660, top: 90, width: 96, height: 96 },
  { k: "7", label: "7", left: 766, top: 90, width: 96, height: 96 },
  { k: "8", label: "8", left: 872, top: 90, width: 96, height: 96 },
  { k: "9", label: "9", left: 978, top: 90, width: 96, height: 96 },
  { k: "0", label: "0", left: 1084, top: 90, width: 96, height: 96 },
  { k: "ß", label: "ß", left: 1190, top: 90, width: 96, height: 96 },
  { k: "´", label: "´", left: 1296, top: 90, width: 96, height: 96 },
  { k: "Backspace", label: "⌫", cls: "ui-gk-key--mod", left: 1402, top: 90, width: 149, height: 96 },

  // Row 2: Top alpha + ISO Enter
  { k: "Tab", label: "⇥", cls: "ui-gk-key--mod", left: 24, top: 196, width: 149, height: 96 },
  { k: "q", label: "q", left: 183, top: 196, width: 96, height: 96 },
  { k: "w", label: "w", left: 289, top: 196, width: 96, height: 96 },
  { k: "e", label: "e", left: 395, top: 196, width: 96, height: 96 },
  { k: "r", label: "r", left: 501, top: 196, width: 96, height: 96 },
  { k: "t", label: "t", left: 607, top: 196, width: 96, height: 96 },
  { k: "z", label: "z", left: 713, top: 196, width: 96, height: 96 },
  { k: "u", label: "u", left: 819, top: 196, width: 96, height: 96 },
  { k: "i", label: "i", left: 925, top: 196, width: 96, height: 96 },
  { k: "o", label: "o", left: 1031, top: 196, width: 96, height: 96 },
  { k: "p", label: "p", left: 1137, top: 196, width: 96, height: 96 },
  { k: "ü", label: "ü", left: 1243, top: 196, width: 96, height: 96 },
  { k: "+", label: "+", left: 1349, top: 196, width: 96, height: 96 },
  { k: "Enter", label: "↩", cls: "ui-gk-key--mod ui-gk-key--enter", left: 1455, top: 196, width: 96, height: 202 },

  // Row 3: Home row
  { k: "CapsLock", label: "⇪", cls: "ui-gk-key--mod", left: 24, top: 302, width: 149, height: 96 },
  { k: "a", label: "a", left: 183, top: 302, width: 96, height: 96 },
  { k: "s", label: "s", left: 289, top: 302, width: 96, height: 96 },
  { k: "d", label: "d", left: 395, top: 302, width: 96, height: 96 },
  { k: "f", label: "f", left: 501, top: 302, width: 96, height: 96 },
  { k: "g", label: "g", left: 607, top: 302, width: 96, height: 96 },
  { k: "h", label: "h", left: 713, top: 302, width: 96, height: 96 },
  { k: "j", label: "j", left: 819, top: 302, width: 96, height: 96 },
  { k: "k", label: "k", left: 925, top: 302, width: 96, height: 96 },
  { k: "l", label: "l", left: 1031, top: 302, width: 96, height: 96 },
  { k: "ö", label: "ö", left: 1137, top: 302, width: 96, height: 96 },
  { k: "ä", label: "ä", left: 1243, top: 302, width: 96, height: 96 },
  { k: "#", label: "#", left: 1349, top: 302, width: 96, height: 96 },

  // Row 4: Bottom alpha + Shifts
  { k: "ShiftLeft", label: "⇧", cls: "ui-gk-key--mod", left: 24, top: 408, width: 122.5, height: 96 },
  { k: "<", label: "<", left: 156.5, top: 408, width: 96, height: 96 },
  { k: "y", label: "y", left: 262.5, top: 408, width: 96, height: 96 },
  { k: "x", label: "x", left: 368.5, top: 408, width: 96, height: 96 },
  { k: "c", label: "c", left: 474.5, top: 408, width: 96, height: 96 },
  { k: "v", label: "v", left: 580.5, top: 408, width: 96, height: 96 },
  { k: "b", label: "b", left: 686.5, top: 408, width: 96, height: 96 },
  { k: "n", label: "n", left: 792.5, top: 408, width: 96, height: 96 },
  { k: "m", label: "m", left: 898.5, top: 408, width: 96, height: 96 },
  { k: ",", label: ",", left: 1004.5, top: 408, width: 96, height: 96 },
  { k: ".", label: ".", left: 1110.5, top: 408, width: 96, height: 96 },
  { k: "-", label: "-", left: 1216.5, top: 408, width: 96, height: 96 },
  { k: "ShiftRight", label: "⇧", cls: "ui-gk-key--mod", left: 1322.5, top: 408, width: 228.5, height: 96 },

  // Row 5: Modifiers + Space + Arrows
  { k: "Fn", label: "fn", cls: "ui-gk-key--mod ui-gk-key--sm", left: 24, top: 514, width: 96, height: 96 },
  { k: "ControlLeft", label: "⌃", cls: "ui-gk-key--mod", left: 130, top: 514, width: 96, height: 96 },
  { k: "AltLeft", label: "⌥", cls: "ui-gk-key--mod", left: 236, top: 514, width: 96, height: 96 },
  { k: "MetaLeft", label: "⌘", cls: "ui-gk-key--mod", left: 342, top: 514, width: 122.5, height: 96 },
  { k: "Space", label: "", cls: "ui-gk-key--space", left: 474.5, top: 514, width: 520, height: 96 },
  { k: "MetaRight", label: "⌘", cls: "ui-gk-key--mod", left: 1004.5, top: 514, width: 122.5, height: 96 },
  { k: "AltRight", label: "⌥", cls: "ui-gk-key--mod", left: 1137, top: 514, width: 96, height: 96 },
  { k: "ArrowLeft", label: "←", cls: "ui-gk-key--mod ui-gk-key--arrow", left: 1243, top: 514, width: 96, height: 96 },
  { k: "ArrowUp", label: "↑", cls: "ui-gk-key--mod ui-gk-key--arrow ui-gk-key--half", left: 1349, top: 514, width: 96, height: 45.5 },
  { k: "ArrowDown", label: "↓", cls: "ui-gk-key--mod ui-gk-key--arrow ui-gk-key--half", left: 1349, top: 564.5, width: 96, height: 45.5 },
  { k: "ArrowRight", label: "→", cls: "ui-gk-key--mod ui-gk-key--arrow", left: 1455, top: 514, width: 96, height: 96 },
];

const KEY_GEOM_BY_K = new Map<string, { frameX: number; frameY: number; boardX: number; boardY: number }>();
for (const kd of KEYS) {
  if (kd.k) {
    const boardX = kd.left + kd.width / 2;
    const boardY = kd.top + kd.height / 2;
    KEY_GEOM_BY_K.set(kd.k, {
      frameX: 312.5 + boardX,
      frameY: 440 + boardY,
      boardX,
      boardY,
    });
  }
}

const DEFAULT_PROMPTS = [
  "Find a quiet hike near Innsbruck",
  "Plan a sunrise climb for Saturday",
  "Pack list for a hut-to-hut trail",
];

interface HitWave {
  id: number;
  x: number;
  boardX: number;
  boardY: number;
  svgCx: number;
  svgCy: number;
  color: string;
}

const WAVE_COLORS = [
  "radial-gradient(closest-side, rgba(255, 59, 43, 0.92), rgba(255, 59, 43, 0))",
  "radial-gradient(closest-side, rgba(255, 119, 0, 0.9), rgba(255, 119, 0, 0))",
  "radial-gradient(closest-side, rgba(255, 42, 115, 0.85), rgba(255, 42, 115, 0))",
];

function mapKeyboardEventToKey(e: KeyboardEvent<HTMLInputElement>): string {
  if (e.code === "Space" || e.key === " ") return "Space";
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") return e.code;
  if (e.code === "MetaLeft" || e.code === "MetaRight") return e.code;
  if (e.code === "AltLeft" || e.code === "AltRight") return e.code;
  if (e.code === "ControlLeft") return "ControlLeft";
  if (KEY_GEOM_BY_K.has(e.key)) return e.key;
  const lower = e.key.toLowerCase();
  if (KEY_GEOM_BY_K.has(lower)) return lower;
  return e.key;
}

/**
 * Interactive AI prompt bar above a translucent glass keyboard and drifting colour floor.
 */
export function AfGlowKeyboard(props: AfGlowKeyboardProps = {}) {
  const {
    value: controlledValue,
    defaultValue = "",
    onChange,
    onSubmit,
    placeholder = "Ask AI anything...",
    demo = true,
    prompts = DEFAULT_PROMPTS,
    className,
    style,
  } = props;

  const uid = useId().replace(/:/g, "_");
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalVal, setInternalVal] = useState(defaultValue);
  const text = controlledValue !== undefined ? controlledValue : internalVal;

  const reducedMotion = useReducedMotion();
  const [entered] = useState(true);
  const [userTookOver, setUserTookOver] = useState(false);
  const [downKeys, setDownKeys] = useState<Set<string>>(() => new Set());
  const [hits, setHits] = useState<HitWave[]>([]);
  const hitIdRef = useRef(0);
  const waveTimersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = waveTimersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  const spawnHit = useCallback((keyId: string) => {
    const geom = KEY_GEOM_BY_K.get(keyId) ?? {
      frameX: 1100,
      frameY: 684,
      boardX: 787.5,
      boardY: 244,
    };
    const clampedX = Math.max(605, Math.min(1235, geom.frameX - 170));
    const id = ++hitIdRef.current;
    const color = WAVE_COLORS[id % WAVE_COLORS.length];
    const svgCx = geom.frameX + 581.3;
    const svgCy = geom.frameY - 461.7;
    setHits((prev) => [...prev.slice(-4), { id, x: clampedX, boardX: geom.boardX, boardY: geom.boardY, svgCx, svgCy, color }]);
    const tid = window.setTimeout(() => {
      waveTimersRef.current.delete(tid);
      setHits((prev) => prev.filter((h) => h.id !== id));
    }, 560);
    waveTimersRef.current.add(tid);
  }, []);

  const tapKey = useCallback(
    (keyId: string, holdMs = 110, emitWave = true) => {
      setDownKeys((prev) => {
        const next = new Set(prev);
        next.add(keyId);
        return next;
      });
      if (emitWave) spawnHit(keyId);
      const tid = window.setTimeout(() => {
        waveTimersRef.current.delete(tid);
        setDownKeys((prev) => {
          if (!prev.has(keyId)) return prev;
          const next = new Set(prev);
          next.delete(keyId);
          return next;
        });
      }, holdMs);
      waveTimersRef.current.add(tid);
    },
    [spawnHit]
  );

  // Auto-typing demo loop (stops immediately when user clicks/focuses)
  useEffect(() => {
    if (!demo || userTookOver || controlledValue !== undefined || prompts.length === 0) return;
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) return;

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };

    let pIdx = 0;

    const typePrompt = () => {
      const target = prompts[pIdx % prompts.length];
      let current = "";
      let i = 0;
      let madeTypo = false;
      const typoAt = Math.min(target.length - 3, Math.max(5, Math.floor(target.length * 0.55)));

      const step = () => {
        if (i < target.length) {
          // Occasional realistic typo + backspace correction
          if (!madeTypo && i === typoAt && /[a-z]/.test(target[i])) {
            madeTypo = true;
            const wrong = target[i] === "e" ? "r" : "e";
            current += wrong;
            setInternalVal(current);
            tapKey(wrong, 95);
            wait(180, () => {
              current = current.slice(0, -1);
              setInternalVal(current);
              tapKey("Backspace", 110);
              wait(130, step);
            });
            return;
          }

          const ch = target[i];
          i += 1;
          current += ch;
          setInternalVal(current);

          if (ch === " ") {
            tapKey("Space", 105);
          } else {
            const lower = ch.toLowerCase();
            if (ch !== lower && /[A-Z]/.test(ch)) {
              const shiftKey = "qwertasdfgyxcvb".includes(lower) ? "ShiftRight" : "ShiftLeft";
              tapKey(shiftKey, 150, false);
            }
            tapKey(KEY_GEOM_BY_K.has(lower) ? lower : ch, 115);
          }

          const nextDelay = ch === " " ? 105 : 58 + ((i * 19) % 44);
          wait(nextDelay, step);
        } else {
          // Submit with Enter, clear, and advance to next prompt
          wait(680, () => {
            tapKey("Enter", 160);
            wait(220, () => {
              setInternalVal("");
              pIdx += 1;
              wait(900, typePrompt);
            });
          });
        }
      };

      wait(260, step);
    };

    typePrompt();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [controlledValue, demo, prompts, tapKey, userTookOver]);

  const stopDemoAndFocus = () => {
    if (!userTookOver) {
      setUserTookOver(true);
      if (controlledValue === undefined && demo) {
        setInternalVal("");
      }
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!userTookOver) setUserTookOver(true);
    const k = mapKeyboardEventToKey(e);
    setDownKeys((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
    spawnHit(k);
    if (e.key === "Enter") {
      onSubmit?.(text);
      if (controlledValue === undefined) {
        setInternalVal("");
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    const k = mapKeyboardEventToKey(e);
    setDownKeys((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  };

  return (
    <div
      className={className ? `ui-gk ${className}` : "ui-gk"}
      role="group"
      aria-label="AI chat input above a glass keyboard and a moving colour gradient"
      data-in={entered ? "" : undefined}
      style={style}
      onClick={stopDemoAndFocus}
    >
      <div className="ui-gk-frame">
        <div className="ui-gk-floor ui-gk-floor--color" aria-hidden="true">
          <div className="ui-gk-bleed">
            <svg viewBox="0 0 3447.1 1514.1" preserveAspectRatio="none">
              <defs>
                <linearGradient
                  id={`ui-gk-${uid}-floor`}
                  x1="1723.8"
                  y1="423.3"
                  x2="1723.8"
                  y2="894.3"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#FF7700" />
                  <stop offset="0.302885" stopColor="#FF0055" />
                  <stop offset="0.673077" stopColor="#0073FF" />
                </linearGradient>
              </defs>
              <path
                d="M926.8 525.9C926.8 525.9 302.1 337.3 291.3 331.3V1222.8H3155.8V345.2L2493.8 610.8H2189.3V610.8L1898.8 415.2H1510.8V415.2L1230.8 525.9H926.8V525.9Z"
                fill={`url(#ui-gk-${uid}-floor)`}
              />
              {hits.map((h) => (
                <ellipse
                  key={`floor-${h.id}`}
                  className="ui-gk-floor-wave"
                  cx={h.svgCx}
                  cy={h.svgCy + 45}
                  rx="230"
                  ry="320"
                  fill="#FF7700"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className="ui-gk-floor ui-gk-floor--light" aria-hidden="true">
          <div className="ui-gk-bleed">
            <svg viewBox="0 0 2904.96 1275.97" preserveAspectRatio="none">
              <path
                d="M781.039 443.2C781.039 443.2 254.588 284.2 245.486 279.2V1030.49H2659.48V290.9L2101.59 514.7H1844.98V514.7L1600.17 349.9H1273.19V349.9L1037.23 443.2H781.039V443.2Z"
                fill="#fff"
                fillOpacity="0.8"
              />
            </svg>
          </div>
        </div>

        <div className="ui-gk-composer">
          <div className="ui-gk-glow ui-gk-glow--soft" aria-hidden="true" />
          <div className="ui-gk-glow-mid" aria-hidden="true" />
          <div className="ui-gk-hit-zone" aria-hidden="true">
            {hits.map((h) => (
              <div
                key={h.id}
                className="ui-gk-hit"
                style={{
                  left: `calc(${h.x - 577} * var(--ui-gk-u))`,
                  background: h.color,
                  filter: reducedMotion ? undefined : "blur(calc(22 * var(--ui-gk-u)))",
                }}
              />
            ))}
          </div>
          <div className="ui-gk-glow ui-gk-glow--hard" aria-hidden="true" />
          <div className="ui-gk-ring" aria-hidden="true" />
          <div className="ui-gk-input">
            <div className="ui-gk-glass" aria-hidden="true" />
            <svg className="ui-gk-orb" viewBox="0 0 95.5862 95.5862" aria-hidden="true">
              <defs>
                <radialGradient
                  id={`ui-gk-${uid}-orb`}
                  cx="0"
                  cy="0"
                  r="1"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(47.7931 9.55862) rotate(90) scale(86.0276)"
                >
                  <stop offset="0.221154" stopColor="#FF7700" />
                  <stop offset="1" stopColor="#FF2A91" />
                </radialGradient>
                <filter
                  id={`ui-gk-${uid}-orb-glow`}
                  x="0"
                  y="0"
                  width="95.5862"
                  height="95.5862"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="alpha"
                  />
                  <feGaussianBlur stdDeviation="21.3703" />
                  <feComposite in2="alpha" operator="arithmetic" k2="-1" k3="1" />
                  <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
                  <feBlend mode="normal" in2="SourceGraphic" />
                </filter>
              </defs>
              <circle
                cx="47.7931"
                cy="47.7931"
                r="47.7931"
                fill={`url(#ui-gk-${uid}-orb)`}
                filter={`url(#ui-gk-${uid}-orb-glow)`}
              />
            </svg>
            <span className="ui-gk-field">
              <span className="ui-gk-caret" aria-hidden="true" />
              <input
                ref={inputRef}
                className="ui-gk-prompt"
                type="text"
                value={text}
                placeholder={placeholder}
                aria-label={placeholder}
                autoComplete="off"
                spellCheck={false}
                onFocus={() => {
                  if (!userTookOver) {
                    setUserTookOver(true);
                    if (controlledValue === undefined && demo) setInternalVal("");
                  }
                }}
                onBlur={() => setDownKeys(new Set())}
                onChange={(e) => {
                  if (!userTookOver) setUserTookOver(true);
                  const next = e.target.value;
                  if (controlledValue === undefined) setInternalVal(next);
                  onChange?.(next);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
              />
            </span>
            <div className="ui-gk-glass ui-gk-glass--inner" aria-hidden="true" />
          </div>
        </div>

        <div className="ui-gk-keyboard" aria-hidden="true">
          <div className="ui-gk-key-glows" aria-hidden="true">
            {hits.map((h) => (
              <span
                key={`kg-${h.id}`}
                className="ui-gk-key-glow"
                style={{
                  left: `calc(${h.boardX} * var(--ui-gk-u))`,
                  top: `calc(${h.boardY} * var(--ui-gk-u))`,
                }}
              />
            ))}
          </div>
          {KEYS.map((kd, idx) => (
            <span
              key={kd.k ?? `key-${idx}`}
              className={kd.cls ? `ui-gk-key ${kd.cls}` : "ui-gk-key"}
              data-k={kd.k}
              data-down={kd.k && downKeys.has(kd.k) ? "" : undefined}
              style={{
                left: `calc(${kd.left} * var(--ui-gk-u))`,
                top: `calc(${kd.top} * var(--ui-gk-u))`,
                width: `calc(${kd.width} * var(--ui-gk-u))`,
                height: `calc(${kd.height} * var(--ui-gk-u))`,
              }}
            >
              {kd.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
