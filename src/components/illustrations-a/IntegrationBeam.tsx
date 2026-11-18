import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useIsomorphicLayoutEffect } from "../../primitives";

export interface AfIntegrationBeamTool {
  id: string;
  label: string;
  logo: ReactNode;
}

export interface AfIntegrationBeamHub {
  label: string;
  logo: ReactNode;
}

export interface AfIntegrationBeamProps {
  inputs?: AfIntegrationBeamTool[];
  outputs?: AfIntegrationBeamTool[];
  hub?: AfIntegrationBeamHub;
  disabledIds?: string[];
  defaultDisabledIds?: string[];
  onDisabledChange?: (ids: string[]) => void;
  /** Seconds per inbound->hub->outbound pulse cycle. */
  cycle?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_INPUTS: AfIntegrationBeamTool[] = [
  {
    id: "slack",
    label: "Slack",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <svg x="2" y="2" width="20" height="20" viewBox="0 0 2447.6 2452.5">
          <g clipRule="evenodd" fillRule="evenodd">
            <path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0" />
            <path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d" />
            <path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e" />
            <path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a" />
          </g>
        </svg>
      </svg>
    ),
  },
  {
    id: "notion",
    label: "Notion",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"
        />
      </svg>
    ),
  },
  {
    id: "gmail",
    label: "Gmail",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <svg x="2" y="2" width="20" height="20" viewBox="0 49.4 512 399.42">
          <g fill="none" fillRule="evenodd">
            <g fillRule="nonzero">
              <path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z" />
              <path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z" />
              <path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z" />
            </g>
            <path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z" />
            <path fill="#c5221f" fillRule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z" />
          </g>
        </svg>
      </svg>
    ),
  },
];

const DEFAULT_OUTPUTS: AfIntegrationBeamTool[] = [
  {
    id: "hubspot",
    label: "HubSpot",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#FF7A59"
          d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"
        />
      </svg>
    ),
  },
  {
    id: "linear",
    label: "Linear",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#5E6AD2"
          d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"
        />
      </svg>
    ),
  },
  {
    id: "gdrive",
    label: "Google Drive",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <svg x="1" y="2" width="22" height="20" viewBox="0 0 87.3 78">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
        </svg>
      </svg>
    ),
  },
];

const DEFAULT_HUB: AfIntegrationBeamHub = {
  label: "Acme",
  logo: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <g opacity="0.36">
        <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(45 24 24)" />
        <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(135 24 24)" />
        <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(225 24 24)" />
        <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(315 24 24)" />
      </g>
      <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(0 24 24)" />
      <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(90 24 24)" />
      <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(180 24 24)" />
      <path d="M24 24C17.6 19.6 16.4 9.4 24 3.5C31.6 9.4 30.4 19.6 24 24Z" transform="rotate(270 24 24)" />
    </svg>
  ),
};

interface BeamSpec {
  id: string;
  d: string;
  side: "in" | "out";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Interactive tool-to-hub integration diagram with animated SVG gradient beams, tooltips, and pauseable nodes.
 */
export function AfIntegrationBeam(props: AfIntegrationBeamProps = {}) {
  const {
    inputs = DEFAULT_INPUTS,
    outputs = DEFAULT_OUTPUTS,
    hub = DEFAULT_HUB,
    disabledIds: controlledDisabled,
    defaultDisabledIds = [],
    onDisabledChange,
    cycle = 5.2,
    paused = false,
    className,
    style,
  } = props;

  const uid = useId().replace(/:/g, "_");
  const rootRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const centerRingRef = useRef<HTMLSpanElement>(null);
  const chipInnerRef = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const ringRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const pulseGroupRefs = useRef<(SVGGElement | null)[]>([]);
  const glowPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const corePathRefs = useRef<(SVGPathElement | null)[]>([]);
  const gradRefs = useRef<(SVGLinearGradientElement | null)[]>([]);

  const [internalDisabled, setInternalDisabled] = useState<string[]>(defaultDisabledIds);
  const disabledList = controlledDisabled ?? internalDisabled;
  const disabledKey = disabledList.join("\0");
  const disabledSet = useMemo(() => new Set(disabledList), [disabledKey]);
  const disabledSetRef = useRef(disabledSet);
  disabledSetRef.current = disabledSet;

  const [focusId, setFocusId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [chipWidth, setChipWidth] = useState<number | undefined>(undefined);
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const [viewBox, setViewBox] = useState({ w: 620, h: 244 });
  const [beams, setBeams] = useState<BeamSpec[]>(() => [
    { id: inputs[0]?.id ?? "in-0", d: "M30 36C170 36 170 122 310 122", side: "in", x1: 30, y1: 36, x2: 310, y2: 122 },
    { id: inputs[1]?.id ?? "in-1", d: "M30 122C170 122 170 122 310 122", side: "in", x1: 30, y1: 122, x2: 310, y2: 122 },
    { id: inputs[2]?.id ?? "in-2", d: "M30 208C170 208 170 122 310 122", side: "in", x1: 30, y1: 208, x2: 310, y2: 122 },
    { id: outputs[0]?.id ?? "out-0", d: "M310 122C450 122 450 36 590 36", side: "out", x1: 310, y1: 122, x2: 590, y2: 36 },
    { id: outputs[1]?.id ?? "out-1", d: "M310 122C450 122 450 122 590 122", side: "out", x1: 310, y1: 122, x2: 590, y2: 122 },
    { id: outputs[2]?.id ?? "out-2", d: "M310 122C450 122 450 208 590 208", side: "out", x1: 310, y1: 122, x2: 590, y2: 208 },
  ]);

  // Measure actual button & hub centers so SVG curves stay locked at any width (including stacked <460px)
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const hubEl = centerRef.current;
    if (!root || !hubEl) return;

    const measure = () => {
      const rr = root.getBoundingClientRect();
      const hr = hubEl.getBoundingClientRect();
      if (rr.width <= 0 || rr.height <= 0) return;
      const hx = hr.left - rr.left + hr.width / 2;
      const hy = hr.top - rr.top + hr.height / 2;
      const stacked = rr.width < 460;

      const nextBeams: BeamSpec[] = [];
      for (const tool of inputs) {
        const el = btnRefs.current.get(tool.id);
        if (!el) continue;
        const tr = el.getBoundingClientRect();
        const tx = tr.left - rr.left + tr.width / 2;
        const ty = tr.top - rr.top + tr.height / 2;
        const d = stacked
          ? `M${tx.toFixed(1)} ${ty.toFixed(1)}C${tx.toFixed(1)} ${((ty + hy) / 2).toFixed(1)} ${hx.toFixed(1)} ${((ty + hy) / 2).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`
          : `M${tx.toFixed(1)} ${ty.toFixed(1)}C${((tx + hx) / 2).toFixed(1)} ${ty.toFixed(1)} ${((tx + hx) / 2).toFixed(1)} ${hy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
        nextBeams.push({ id: tool.id, d, side: "in", x1: tx, y1: ty, x2: hx, y2: hy });
      }
      for (const tool of outputs) {
        const el = btnRefs.current.get(tool.id);
        if (!el) continue;
        const tr = el.getBoundingClientRect();
        const tx = tr.left - rr.left + tr.width / 2;
        const ty = tr.top - rr.top + tr.height / 2;
        const d = stacked
          ? `M${hx.toFixed(1)} ${hy.toFixed(1)}C${hx.toFixed(1)} ${((hy + ty) / 2).toFixed(1)} ${tx.toFixed(1)} ${((hy + ty) / 2).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`
          : `M${hx.toFixed(1)} ${hy.toFixed(1)}C${((hx + tx) / 2).toFixed(1)} ${hy.toFixed(1)} ${((hx + tx) / 2).toFixed(1)} ${ty.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
        nextBeams.push({ id: tool.id, d, side: "out", x1: hx, y1: hy, x2: tx, y2: ty });
      }
      setViewBox({ w: Math.round(rr.width), h: Math.round(rr.height) });
      if (nextBeams.length > 0) setBeams(nextBeams);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [inputs, outputs]);

  const totalCount = inputs.length + outputs.length;
  const activeInCount = inputs.filter((t) => !disabledSet.has(t.id)).length;
  const activeOutCount = outputs.filter((t) => !disabledSet.has(t.id)).length;
  const connectedCount = activeInCount + activeOutCount;
  const canFlow = activeInCount > 0 && activeOutCount > 0 && !paused;

  const statusText = !canFlow
    ? connectedCount === 0
      ? "Paused"
      : `${connectedCount}\u00A0connected`
    : syncing
      ? "Syncing…"
      : `${connectedCount}\u00A0connected`;

  useIsomorphicLayoutEffect(() => {
    const inner = chipInnerRef.current;
    if (inner) {
      setChipWidth(Math.ceil(inner.getBoundingClientRect().width));
    }
  }, [statusText]);

  // Continuous SVG pulse wave loop (inbound -> hub glow -> outbound)
  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches || !canFlow) {
      setSyncing(false);
      pulseGroupRefs.current.forEach((g) => {
        if (g) g.style.opacity = "0";
      });
      if (centerRingRef.current) centerRingRef.current.style.opacity = "0";
      ringRefs.current.forEach((r) => {
        r.style.opacity = "0";
      });
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const cycleMs = Math.max(2200, cycle * 1000);
    let prevSync = false;

    const tick = (now: number) => {
      const u = ((now - start) % cycleMs) / cycleMs; // 0..1
      // Inbound wave: u in [0.04, 0.44], Hub glow: [0.38, 0.56], Outbound wave: [0.46, 0.86]
      const nowSync = u >= 0.34 && u <= 0.62;
      if (nowSync !== prevSync) {
        prevSync = nowSync;
        setSyncing(nowSync);
      }

      if (centerRingRef.current) {
        const hubBell = u >= 0.36 && u <= 0.58 ? Math.sin(((u - 0.36) / 0.22) * Math.PI) : 0;
        centerRingRef.current.style.opacity = (hubBell * 0.95).toFixed(3);
      }

      beams.forEach((bm, i) => {
        const g = pulseGroupRefs.current[i];
        const glow = glowPathRefs.current[i];
        const core = corePathRefs.current[i];
        const grad = gradRefs.current[i];
        const toolRing = ringRefs.current.get(bm.id);
        const isOff = disabledSetRef.current.has(bm.id);

        if (!g || !glow || !core || !grad) return;
        if (isOff) {
          g.style.opacity = "0";
          if (toolRing) toolRing.style.opacity = "0";
          return;
        }

        const winStart = bm.side === "in" ? 0.04 : 0.46;
        const winDur = 0.38;
        const p = (u - winStart) / winDur;

        if (p < 0 || p > 1) {
          g.style.opacity = "0";
          if (toolRing) toolRing.style.opacity = "0";
          return;
        }

        const totalLen = core.getTotalLength() || 300;
        const segLen = Math.min(92, totalLen * 0.32);
        const headDist = -segLen * 0.2 + p * (totalLen + segLen * 1.1);
        const tailDist = Math.max(0, headDist - segLen);
        const clampedHead = Math.min(totalLen, Math.max(1, headDist));

        const fade = p < 0.14 ? p / 0.14 : p > 0.84 ? (1 - p) / 0.16 : 1;
        g.style.opacity = Math.max(0, Math.min(1, fade)).toFixed(3);

        const dashArray = `${segLen.toFixed(1)}, ${(totalLen + segLen).toFixed(1)}`;
        const dashOffset = `${(segLen - headDist).toFixed(1)}`;
        glow.style.strokeDasharray = dashArray;
        glow.style.strokeDashoffset = dashOffset;
        core.style.strokeDasharray = dashArray;
        core.style.strokeDashoffset = dashOffset;

        const ptTail = core.getPointAtLength(Math.min(totalLen - 0.5, tailDist));
        const ptHead = core.getPointAtLength(clampedHead);
        grad.setAttribute("x1", ptTail.x.toFixed(2));
        grad.setAttribute("y1", ptTail.y.toFixed(2));
        grad.setAttribute("x2", ptHead.x.toFixed(2));
        grad.setAttribute("y2", ptHead.y.toFixed(2));

        if (toolRing) {
          const ringBell =
            bm.side === "in"
              ? p < 0.28
                ? Math.sin((p / 0.28) * Math.PI)
                : 0
              : p > 0.72
                ? Math.sin(((p - 0.72) / 0.28) * Math.PI)
                : 0;
          toolRing.style.opacity = (ringBell * 0.85).toFixed(3);
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [beams, canFlow, cycle]);

  const toggleTool = (tool: AfIntegrationBeamTool) => {
    const next = new Set(disabledSet);
    const willDisable = !next.has(tool.id);
    if (willDisable) next.add(tool.id);
    else next.delete(tool.id);
    const arr = Array.from(next);
    if (controlledDisabled === undefined) setInternalDisabled(arr);
    onDisabledChange?.(arr);
    const nextConnected = totalCount - arr.length;
    setSrAnnouncement(`${tool.label} ${willDisable ? "paused" : "connected"}. ${nextConnected} of ${totalCount} connected.`);
  };

  const allToolsLabel = [...inputs, ...outputs].map((t) => t.label).join(", ");

  const renderToolButton = (tool: AfIntegrationBeamTool) => {
    const isOff = disabledSet.has(tool.id);
    const isFocused = focusId === tool.id;
    return (
      <button
        key={tool.id}
        ref={(el) => {
          if (el) btnRefs.current.set(tool.id, el);
          else btnRefs.current.delete(tool.id);
        }}
        type="button"
        className="ui-ibm__tool"
        aria-pressed={!isOff}
        aria-label={`${tool.label}, ${isOff ? "paused" : "connected"}`}
        data-off={isOff ? "" : undefined}
        data-tip={isFocused ? "" : undefined}
        onMouseEnter={() => setFocusId(tool.id)}
        onMouseLeave={() => setFocusId((cur) => (cur === tool.id ? null : cur))}
        onFocus={() => setFocusId(tool.id)}
        onBlur={() => setFocusId((cur) => (cur === tool.id ? null : cur))}
        onClick={() => toggleTool(tool)}
      >
        <span
          className="ui-ibm__ring"
          ref={(el) => {
            if (el) ringRefs.current.set(tool.id, el);
            else ringRefs.current.delete(tool.id);
          }}
        />
        <span className="ui-ibm__logo" aria-hidden="true">
          {tool.logo}
        </span>
        <span className="ui-ibm__tip" aria-hidden="true">
          {tool.label}
          {isOff ? <span className="ui-ibm__tip-state"> · Paused</span> : null}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className={className ? `ui-ibm ${className}` : "ui-ibm"}
      role="group"
      aria-label={`${hub.label} connected to ${allToolsLabel}`}
      data-focus={focusId ? "" : undefined}
      style={style}
    >
      <svg className="ui-ibm__beams" aria-hidden="true" viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}>
        <defs>
          <filter id={`ui-ibm-${uid}-blur`} filterUnits="userSpaceOnUse" x="-100" y="-100" width="10000" height="10000">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {beams.map((bm, i) => (
            <linearGradient
              key={bm.id}
              ref={(el) => {
                gradRefs.current[i] = el;
              }}
              id={`ui-ibm-${uid}-g${i}`}
              gradientUnits="userSpaceOnUse"
              x1={bm.x1}
              y1={bm.y1}
              x2={bm.x2}
              y2={bm.y2}
            >
              <stop offset="0" className="ui-ibm__stop-tail" />
              <stop offset="0.6" className="ui-ibm__stop-mid" />
              <stop offset="1" className="ui-ibm__stop-head" />
            </linearGradient>
          ))}
        </defs>

        {beams.map((bm) => {
          const isOff = disabledSet.has(bm.id);
          const isHi = focusId === bm.id && !isOff;
          return (
            <path
              key={`line-${bm.id}`}
              className="ui-ibm__line"
              d={bm.d}
              data-off={isOff ? "" : undefined}
              data-focus={isHi ? "" : undefined}
            />
          );
        })}

        {beams.map((bm, i) => {
          const isHi = focusId === bm.id && !disabledSet.has(bm.id);
          return (
            <g
              key={`pulse-${bm.id}`}
              ref={(el) => {
                pulseGroupRefs.current[i] = el;
              }}
              className="ui-ibm__pulse"
              data-focus={isHi ? "" : undefined}
              style={{ opacity: 0 }}
            >
              <path
                ref={(el) => {
                  glowPathRefs.current[i] = el;
                }}
                className="ui-ibm__glow"
                stroke={`url(#ui-ibm-${uid}-g${i})`}
                filter={`url(#ui-ibm-${uid}-blur)`}
                d={bm.d}
              />
              <path
                ref={(el) => {
                  corePathRefs.current[i] = el;
                }}
                className="ui-ibm__core"
                stroke={`url(#ui-ibm-${uid}-g${i})`}
                d={bm.d}
              />
            </g>
          );
        })}
      </svg>

      <div className="ui-ibm__scene">
        <div className="ui-ibm__group ui-ibm__group--in">{inputs.map(renderToolButton)}</div>

        <div className="ui-ibm__center" ref={centerRef} data-syncing={syncing ? "" : undefined}>
          <span className="ui-ibm__ring ui-ibm__ring--center" ref={centerRingRef} />
          <span className="ui-ibm__mark" aria-hidden="true">
            {hub.logo}
          </span>
          <span className="ui-ibm__chip" style={chipWidth ? { width: `${chipWidth}px` } : undefined}>
            <span className="ui-ibm__chip-inner" ref={chipInnerRef}>
              <span className="ui-ibm__dot" data-idle={!canFlow ? "" : undefined} />
              <span key={statusText} className="ui-ibm__status">
                {statusText}
              </span>
            </span>
          </span>
        </div>

        <div className="ui-ibm__group ui-ibm__group--out">{outputs.map(renderToolButton)}</div>
      </div>

      <span className="ui-ibm__sr" aria-live="polite">
        {srAnnouncement}
      </span>
    </div>
  );
}
