import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { useAfLayerContainer, useIsomorphicLayoutEffect } from "../../primitives";

/* ================================================================== */
/* Shared Utilities: Formatting, Timers, Collapse & Stage Popover     */
/* ================================================================== */

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes ? `${minutes}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
}

export function formatTenths(seconds: number) {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

export function formatUntil(seconds: number) {
  const date = new Date(Date.now() + seconds * 1000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function useStopwatch(running: boolean, initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return seconds;
}

export function useTenthsStopwatch(running: boolean, initialMs = 0) {
  const [ms, setMs] = useState(initialMs);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setMs((value) => value + 100), 100);
    return () => window.clearInterval(timer);
  }, [running]);
  return ms;
}

export function useCountdown(total: number, key: number, paused: boolean) {
  const [remaining, setRemaining] = useState(total);
  useEffect(() => {
    setRemaining(total);
  }, [total, key]);
  useEffect(() => {
    if (paused || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [paused, remaining > 0]);
  return remaining;
}

export function useTweenNumber(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (reducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = from + (target - from) * eased;
      current.current = next;
      setValue(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [ready, setReady] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const update = () => setHeight(inner.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(inner);
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [children]);
  const inert = (open ? {} : { inert: "true" as unknown as boolean }) as Record<string, unknown>;
  return (
    <div
      className="af-agb-collapse"
      data-ready={ready || undefined}
      style={{ height: open ? height : 0 }}
      aria-hidden={!open}
      {...inert}
    >
      <div ref={innerRef} className="af-agb-collapse__inner">
        {children}
      </div>
    </div>
  );
}

export type Placement = {
  x: number;
  width: number;
  below: number;
  above: number;
  anchor: HTMLElement;
};

export function stageBox(stage: HTMLElement) {
  const rect = stage.getBoundingClientRect();
  const scale = stage.offsetWidth ? rect.width / stage.offsetWidth : 1;
  return { rect, scale, width: stage.clientWidth, height: stage.clientHeight };
}

export function useStagePlacement(explicitStage?: HTMLElement | null) {
  const stage = useAfLayerContainer(explicitStage);
  const [place, setPlace] = useState<Placement | null>(null);
  const show = useCallback(
    (element: HTMLElement, width: number, gap = 8) => {
      if (!stage) return;
      const box = stageBox(stage);
      const anchor = element.getBoundingClientRect();
      const localLeft = (anchor.left - box.rect.left) / box.scale;
      const localTop = (anchor.top - box.rect.top) / box.scale;
      const localBottom = (anchor.bottom - box.rect.top) / box.scale;
      const maxWidth = box.width || window.innerWidth;
      const x = Math.min(Math.max(8, localLeft), Math.max(8, maxWidth - width - 8));
      setPlace({ x, width, below: localBottom + gap, above: localTop - gap, anchor: element });
    },
    [stage],
  );
  const hide = useCallback(() => setPlace(null), []);
  return { stage, place, show, hide };
}

export function StagePopover({
  stage: explicitStage,
  place,
  preferSide = "bottom",
  label,
  onClose,
  children,
}: {
  stage?: HTMLElement | null;
  place: Placement | null;
  preferSide?: "top" | "bottom";
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const stage = useAfLayerContainer(explicitStage);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!place) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [place, onClose]);
  useIsomorphicLayoutEffect(() => {
    if (!place) return;
    ref.current?.querySelector<HTMLElement>("button, textarea, [tabindex='0']")?.focus({ preventScroll: true });
  }, [place]);

  const [frame, setFrame] = useState<{ left: number; top: number; maxHeight: number } | null>(null);

  const recalc = useCallback(() => {
    if (!place || !stage) {
      setFrame(null);
      return;
    }
    const element = ref.current;
    if (!element) return;
    const box = stageBox(stage);
    let below = place.below;
    let above = place.above;
    let x = place.x;
    if (place.anchor.isConnected) {
      const anchor = place.anchor.getBoundingClientRect();
      const localLeft = (anchor.left - box.rect.left) / box.scale;
      const localTop = (anchor.top - box.rect.top) / box.scale;
      const localBottom = (anchor.bottom - box.rect.top) / box.scale;
      below = localBottom + 8;
      above = localTop - 8;
      x = Math.min(Math.max(8, localLeft), Math.max(8, box.width - place.width - 8));
    }
    const topLimit = Math.max(8, (8 - box.rect.top) / box.scale);
    const bottomLimit = Math.min(box.height - 8, (window.innerHeight - 8 - box.rect.top) / box.scale);
    const leftLimit = Math.max(8, (8 - box.rect.left) / box.scale);
    const rightLimit = Math.min(box.width - 8, (window.innerWidth - 8 - box.rect.left) / box.scale);
    const maxHeight = Math.max(96, bottomLimit - topLimit - 8);
    element.style.maxHeight = `${maxHeight}px`;
    const height = Math.min(element.offsetHeight, maxHeight);
    const clampedBelow = Math.max(topLimit, below);
    const clampedAboveBottom = Math.min(bottomLimit, above);
    let top: number;
    if (preferSide === "top") {
      if (clampedAboveBottom - height >= topLimit) top = clampedAboveBottom - height;
      else if (clampedBelow + height <= bottomLimit) top = clampedBelow;
      else top = Math.max(topLimit, Math.min(clampedAboveBottom - height, Math.max(topLimit, bottomLimit - height)));
    } else {
      if (clampedBelow + height <= bottomLimit) top = clampedBelow;
      else if (clampedAboveBottom - height >= topLimit) top = clampedAboveBottom - height;
      else top = Math.max(topLimit, Math.min(clampedBelow, Math.max(topLimit, bottomLimit - height)));
    }
    const left = Math.max(leftLimit, Math.min(x, Math.max(leftLimit, rightLimit - place.width)));
    setFrame({ left, top, maxHeight });
  }, [place, preferSide, stage]);

  useIsomorphicLayoutEffect(recalc, [recalc]);

  useEffect(() => {
    if (!place) return;
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(recalc) : null;
    if (observer && stage) observer.observe(stage);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
      observer?.disconnect();
    };
  }, [place, recalc, stage]);

  if (!stage || !place) return null;
  return createPortal(
    <div
      ref={ref}
      className="af-agb-pop"
      role="dialog"
      aria-label={label}
      style={{
        left: frame?.left ?? place.x,
        top: frame?.top ?? place.below,
        width: place.width,
        maxHeight: frame?.maxHeight,
      }}
    >
      {children}
    </div>,
    stage,
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="af-agb-fact">
      <span className="af-agb-fact__label">{label}</span>
      <span className="af-agb-fact__value">{children}</span>
    </div>
  );
}

export function GlyphButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: AffectIconKey;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="af-agb-glyph"
      data-danger={danger || undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <AfIcon name={icon} size={14} />
    </button>
  );
}

/* ================================================================== */
/* Official Brand & UI Micro-Icons (Verbatim AffectUI Paths)          */
/* ================================================================== */

export type AgbBrandKey =
  | "claude"
  | "openai"
  | "github"
  | "vercel"
  | "statuspage"
  | "slack"
  | "launchdarkly"
  | "sentry"
  | "notion"
  | "hubspot"
  | "stripe"
  | "search"
  | "file"
  | "rocket";

const CLAUDE_STARBURST_PATH =
  "M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z";

const OPENAI_KNOT_PATH =
  "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";

const GITHUB_MARK_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

export function AgbBrandLogo({
  brand,
  size = 14,
  className,
}: {
  brand: AgbBrandKey;
  size?: number;
  className?: string;
}) {
  switch (brand) {
    case "claude":
      return (
        <svg width={size} height={size} viewBox="0 0 1200 1200" aria-hidden="true" className={className}>
          <path fill="#D97757" d={CLAUDE_STARBURST_PATH} />
        </svg>
      );
    case "openai":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d={OPENAI_KNOT_PATH} />
        </svg>
      );
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d={GITHUB_MARK_PATH} />
        </svg>
      );
    case "vercel":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      );
    case "statuspage":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path
            fill="#0052CC"
            d="M12.008 9.597a5.623 5.623 0 1 1 0 11.245 5.623 5.623 0 0 1 0-11.245zM.154 8.717l3.02 3.574a.639.639 0 0 0 .913.068c4.885-4.379 10.97-4.379 15.84 0a.642.642 0 0 0 .916-.068l3.006-3.574a.646.646 0 0 0-.075-.906c-7.1-6.204-16.462-6.204-23.555 0a.65.65 0 0 0-.065.906z"
          />
        </svg>
      );
    case "slack":
      return (
        <svg width={size} height={size} viewBox="0 0 49.883 49.877" fill="none" aria-hidden="true" className={className}>
          <g transform="translate(0 0)">
            <path d="M18.3549 10.4784C15.4713 10.4784 13.1157 8.12279 13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V10.4784H18.3549Z" fill="#36C5F0" />
            <path d="M18.3575 13.12C21.2411 13.12 23.5967 15.4756 23.5967 18.3592C23.5967 21.2428 21.2411 23.5984 18.3575 23.5984H5.2392C2.35561 23.5984 0 21.2428 0 18.3592C0 15.4756 2.35561 13.12 5.2392 13.12H18.3575Z" fill="#36C5F0" />
          </g>
          <g transform="translate(26.28 0)">
            <path d="M13.1244 18.3592C13.1244 15.4756 15.48 13.12 18.3636 13.12C21.2472 13.12 23.6028 15.4756 23.6028 18.3592C23.6028 21.2428 21.2472 23.5984 18.3636 23.5984H13.1244V18.3592Z" fill="#2EB67D" />
            <path d="M10.4785 18.3575C10.4785 21.2411 8.12286 23.5967 5.23927 23.5967C2.35568 23.5967 7.4362e-05 21.2411 7.4362e-05 18.3575V5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0C8.12286 0 10.4785 2.35561 10.4785 5.2392V18.3575Z" fill="#2EB67D" />
          </g>
          <g transform="translate(0 26.28)">
            <path d="M10.4784 5.2392C10.4784 8.12279 8.12279 10.4784 5.2392 10.4784C2.35561 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35561 0 5.2392 0H10.4784V5.2392Z" fill="#E01E5A" />
            <path d="M13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V18.3575C23.5941 21.2411 21.2385 23.5967 18.3549 23.5967C15.4713 23.5967 13.1157 21.2411 13.1157 18.3575V5.2392Z" fill="#E01E5A" />
          </g>
          <g transform="translate(26.28 26.28)">
            <path d="M5.23927 13.1157C8.12286 13.1157 10.4785 15.4713 10.4785 18.3549C10.4785 21.2385 8.12286 23.5941 5.23927 23.5941C2.35568 23.5941 7.4362e-05 21.2385 7.4362e-05 18.3549V13.1157H5.23927Z" fill="#ECB22E" />
            <path d="M5.23927 10.4784C2.35568 10.4784 7.4362e-05 8.12279 7.4362e-05 5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0H18.3576C21.2412 0 23.5968 2.35561 23.5968 5.2392C23.5968 8.12279 21.2412 10.4784 18.3576 10.4784H5.23927Z" fill="#ECB22E" />
          </g>
        </svg>
      );
    case "launchdarkly":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M9.854 14.5 5 9.647.854 5.5A.5.5 0 0 0 0 5.854V8.44a.5.5 0 0 0 .146.353L5 13.647l.147.146L9.854 18.5l.146.147v-.049c.065.03.134.049.207.049h2.586a.5.5 0 0 0 .353-.854L9.854 14.5zm0-5-4-4a.487.487 0 0 0-.409-.144.515.515 0 0 0-.356.21.493.493 0 0 0-.089.288V8.44a.5.5 0 0 0 .147.353l9 9a.5.5 0 0 0 .853-.354v-2.585a.5.5 0 0 0-.146-.354l-5-5zm1-4a.5.5 0 0 0-.854.354V8.44a.5.5 0 0 0 .147.353l4 4a.5.5 0 0 0 .853-.354V9.854a.5.5 0 0 0-.146-.354l-4-4zm12.647 11.515a3.863 3.863 0 0 1-2.232-1.1l-4.708-4.707a.5.5 0 0 0-.854.354v6.585a.5.5 0 0 0 .5.5H23.5a.5.5 0 0 0 .5-.5v-.6c0-.276-.225-.497-.499-.532zm-5.394.032a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zM.854 15.5a.5.5 0 0 0-.854.354v2.293a.5.5 0 0 0 .5.5h2.293c.222 0 .39-.135.462-.309a.493.493 0 0 0-.109-.545L.854 15.501zM5 14.647.854 10.5a.5.5 0 0 0-.854.353v2.586a.5.5 0 0 0 .146.353L4.854 18.5l.146.147h2.793a.5.5 0 0 0 .353-.854L5 14.647z" />
        </svg>
      );
    case "sentry":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 7.92a15.478 15.478 0 0 1 8.53 12.811h-2.221A13.301 13.301 0 0 0 5.784 9.814l-2.926 5.06a7.65 7.65 0 0 1 4.435 5.848H2.194a.365.365 0 0 1-.298-.534l1.413-2.402a5.16 5.16 0 0 0-1.614-.913L.296 19.275a2.182 2.182 0 0 0 .812 2.999 2.24 2.24 0 0 0 1.086.288h6.983a9.322 9.322 0 0 0-3.845-8.318l1.11-1.922a11.47 11.47 0 0 1 4.95 10.24h5.915a17.242 17.242 0 0 0-7.885-15.28l2.244-3.845a.37.37 0 0 1 .504-.13c.255.14 9.75 16.708 9.928 16.9a.365.365 0 0 1-.327.543h-2.287c.029.612.029 1.223 0 1.831h2.297a2.206 2.206 0 0 0 1.922-3.31z" />
        </svg>
      );
    case "notion":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
        </svg>
      );
    case "hubspot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path
            fill="#FF7A59"
            d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"
          />
        </svg>
      );
    case "stripe":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path
            fill="#635BFF"
            d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
          />
        </svg>
      );
    case "file":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <path
            d="M4 12.0001V8.00008C4 5.17166 4 3.75744 4.87868 2.87876C5.75736 2.00008 7.17157 2.00008 10 2.00008H14C16.8284 2.00008 18.2426 2.00008 19.1213 2.87876C20 3.75744 20 5.17166 20 8.00008V16.0001C20 18.8285 20 20.2427 19.1213 21.1214C18.2426 22.0001 16.8284 22.0001 14 22.0001H10C7.17157 22.0001 5.75736 22.0001 4.87868 21.1214C4 20.2427 4 18.8285 4 16.0001V12.0001Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 7H16M8 12H16M8 17H12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
      );
    case "rocket":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <path
            d="M12.9998 17L11.9998 21L9.99977 19L6.99977 17L4.99977 15L2.99977 12L6.99977 11M14.9998 6.50009C16.9998 4.50009 18.9998 3.00009 20.9998 3.00009C20.9998 5.00009 19.4998 7.00009 17.4998 9.00009C16.4998 10.0001 14.5998 12.4001 12.9998 13.0001L11.4998 13.5001L10.4998 12.5001L10.9998 11.0001C11.5998 9.40009 13.9998 7.50009 14.9998 6.50009Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "search":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
          <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.4" />
          <path d="m10.25 10.25 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}

export function SparkleDotIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}>
      <path
        d="M7 1.2c.4 2.9 1.9 4.4 4.8 4.8-2.9.4-4.4 1.9-4.8 4.8C6.6 7.9 5.1 6.4 2.2 6 5.1 5.6 6.6 4.1 7 1.2Z"
        fill="currentColor"
      />
      <circle cx="11.6" cy="11.4" r="1.1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function DoubleSparkleIcon({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 1.75c.3 2.9 1.35 3.95 4.25 4.25-2.9.3-3.95 1.35-4.25 4.25C7.7 7.35 6.65 6.3 3.75 6 6.65 5.7 7.7 4.65 8 1.75Z" />
      <path d="M12.5 10.25c.15 1.25.6 1.7 1.75 1.75-1.15.15-1.6.6-1.75 1.75-.15-1.15-.6-1.6-1.75-1.75 1.15-.05 1.6-.5 1.75-1.75Z" />
    </svg>
  );
}

export function RosetteCheckIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M18.9905 19H19M18.9905 19C18.3678 19.6175 17.2393 19.4637 16.4479 19.4637C15.4765 19.4637 15.0087 19.6537 14.3154 20.347C13.7251 20.9374 12.9337 22 12 22C11.0663 22 10.2749 20.9374 9.68457 20.347C8.99128 19.6537 8.52349 19.4637 7.55206 19.4637C6.76068 19.4637 5.63218 19.6175 5.00949 19C4.38181 18.3776 4.53628 17.2444 4.53628 16.4479C4.53628 15.4414 4.31616 14.9786 3.59938 14.2618C2.53314 13.1956 2.00002 12.6624 2 12C2.00001 11.3375 2.53312 10.8044 3.59935 9.73817C4.2392 9.09832 4.53628 8.46428 4.53628 7.55206C4.53628 6.76065 4.38249 5.63214 5 5.00944C5.62243 4.38178 6.7556 4.53626 7.55208 4.53626C8.46427 4.53626 9.09832 4.2392 9.73815 3.59937C10.8044 2.53312 11.3375 2 12 2C12.6625 2 13.1956 2.53312 14.2618 3.59937C14.9015 4.23907 15.5355 4.53626 16.4479 4.53626C17.2393 4.53626 18.3679 4.38247 18.9906 5C19.6182 5.62243 19.4637 6.75559 19.4637 7.55206C19.4637 8.55858 19.6839 9.02137 20.4006 9.73817C21.4669 10.8044 22 11.3375 22 12C22 12.6624 21.4669 13.1956 20.4006 14.2618C19.6838 14.9786 19.4637 15.4414 19.4637 16.4479C19.4637 17.2444 19.6182 18.3776 18.9905 19Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 12.8929C9 12.8929 10.2 13.5447 10.8 14.5C10.8 14.5 12.6 10.75 15 9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function DecisionBranchIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <circle cx="3.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 8H7.5C8.3 8 8.5 7.6 8.5 6.8V5C8.5 4 9 3.5 10 3.5H10.5M8.5 8.2V11C8.5 12 9 12.5 10 12.5H10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function RiskTriangleIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M13.9248 21H10.0752C5.44476 21 3.12955 21 2.27636 19.4939C1.42317 17.9879 2.60736 15.9914 4.97574 11.9985L6.90057 8.75333C9.17559 4.91778 10.3131 3 12 3C13.6869 3 14.8244 4.91777 17.0994 8.75332L19.0243 11.9985C21.3926 15.9914 22.5768 17.9879 21.7236 19.4939C20.8704 21 18.5552 21 13.9248 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="M12 9V13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      <circle cx="12" cy="16.75" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function CompactArrowsIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 1.5v3m0 0L4.6 3.1M6 4.5l1.4-1.4M6 10.5v-3m0 0L4.6 8.9M6 7.5l1.4 1.4M2 6h8"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BoardLayoutIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1.8" y="2.2" width="3.2" height="9.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8.9" y="2.2" width="3.2" height="6.4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListLayoutIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.2 3.6h9.6M2.2 7h9.6M2.2 10.4h9.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InboxStatusIcon({ status }: { status: "waiting" | "running" | "failed" | "done" }) {
  if (status === "waiting") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1.6 11 10.2H1L6 1.6Z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.8" fill="currentColor" />
        <path d="M6 3.6v2.8M6 8.3v.1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "running") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="af-agb-spin-svg">
        <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.6" />
        <path d="M6 1.4a4.6 4.6 0 0 1 4.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="3.4" fill="currentColor" />
    </svg>
  );
}

export function SearchTinyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="5.2" cy="5.2" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7.7 7.7 2.6 2.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WrenchTinyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M7.6 1.6a2.6 2.6 0 0 0-2.4 3.5L1.7 8.6a1.1 1.1 0 0 0 1.6 1.6l3.5-3.5a2.6 2.6 0 0 0 3.5-2.4l-1.5 1.1-1.5-.4-.4-1.5 1.1-1.5c-.1 0-.3-.4-.4-.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================================================================== */
/* 1. Agent Inbox                                                      */
/* ================================================================== */

export type InboxStatus = "waiting" | "running" | "failed" | "done";

export type InboxStep = {
  text: string;
  state: "done" | "active" | "waiting";
  when?: string;
};

export type InboxTask = {
  id: string;
  title: string;
  description: string;
  model: string;
  counts: [number, number];
  steps: InboxStep[];
};

export const INBOX_TASKS: (InboxTask & { status: InboxStatus; elapsed: number })[] = [
  {
    id: "migrate",
    title: "Migrate users table",
    description: "Split users into accounts and profiles on Postgres 17. The dry run on staging passed.",
    model: "Opus 5.5",
    counts: [9, 14],
    status: "waiting",
    elapsed: 372,
    steps: [
      { text: "Read schema and 14 migrations", state: "done", when: "6m ago" },
      { text: "Wrote migration 0042_split_users", state: "done", when: "4m ago" },
      { text: "Dry run on staging – no errors", state: "done", when: "2m ago" },
      { text: "Wants to run it on production", state: "waiting", when: "1m ago" },
    ],
  },
  {
    id: "crm",
    title: "Clean up CRM contacts",
    description: "Matched 1,312 likely duplicates, then the merge hit the API rate limit.",
    model: "Haiku 5.5",
    counts: [2, 6],
    status: "failed",
    elapsed: 0,
    steps: [
      { text: "Loaded 18,240 contacts", state: "done", when: "9m ago" },
      { text: "Matched 1,312 likely duplicates", state: "done", when: "8m ago" },
      { text: "Merge stopped – API rate limit (429)", state: "waiting", when: "7m ago" },
    ],
  },
  {
    id: "review",
    title: "Review PR #482",
    description: "Billing webhooks: reading the diff and the test run, writing comments.",
    model: "Sonnet 5.5",
    counts: [12, 21],
    status: "running",
    elapsed: 220,
    steps: [
      { text: "Read 12 changed files", state: "done", when: "2m ago" },
      { text: "Ran the test suite – 214 passed", state: "done", when: "1m ago" },
      { text: "Writing review comments", state: "active", when: "now" },
    ],
  },
  {
    id: "notes",
    title: "Release notes v2.4",
    description: "Grouping 23 merged pull requests into features and fixes.",
    model: "Sonnet 5.5",
    counts: [23, 5],
    status: "running",
    elapsed: 78,
    steps: [
      { text: "Collected 23 merged pull requests", state: "done", when: "1m ago" },
      { text: "Drafting the highlights", state: "active", when: "now" },
    ],
  },
  {
    id: "digest",
    title: "Weekly metrics digest",
    description: "Pulled numbers from three dashboards and posted the summary to #metrics.",
    model: "Haiku 5.5",
    counts: [3, 8],
    status: "done",
    elapsed: 252,
    steps: [
      { text: "Pulled numbers from 3 dashboards", state: "done", when: "22m ago" },
      { text: "Posted to #metrics", state: "done", when: "18m ago" },
    ],
  },
];

export const INBOX_LABEL: Record<InboxStatus, string> = {
  waiting: "Waiting for you",
  running: "Running",
  failed: "Failed",
  done: "Done in",
};

export const inboxLane = (status: InboxStatus) =>
  status === "waiting" || status === "failed" ? "need" : status === "running" ? "running" : "done";

export function InboxCard({
  task,
  status,
  elapsed = 0,
  flipId,
  defaultOpen = false,
  onApprove,
  onReject,
  onRetry,
  onOpen,
}: {
  task: InboxTask;
  status: InboxStatus;
  elapsed?: number;
  flipId?: string;
  defaultOpen?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRetry: () => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tick = useStopwatch(status === "running", elapsed);
  const displayElapsed = status === "running" ? tick : elapsed;

  return (
    <article
      className="af-agb-inbox-card"
      data-flip={flipId}
      data-status={status}
      data-open={open || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="af-agb-inbox-card__main"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="af-agb-inbox-card__titlerow">
          <span className="af-agb-inbox-card__spark" data-status={status} aria-hidden>
            <SparkleDotIcon size={14} />
          </span>
          <span className="af-agb-inbox-card__title" title={task.title}>
            {task.title}
          </span>
        </span>
        <span className="af-agb-inbox-card__desc">{task.description}</span>
        <span className="af-agb-inbox-card__foot">
          <span className="af-agb-state" data-status={status}>
            <span className="af-agb-state__icon" data-status={status} aria-hidden>
              <InboxStatusIcon status={status} />
            </span>
            {status === "waiting" ? (
              <>
                <span className="af-agb-state__word">Waiting for you ·</span>
                <span className="af-agb-state__time">{formatDuration(displayElapsed || 372)}</span>
              </>
            ) : status === "failed" ? (
              <span className="af-agb-state__word">Failed</span>
            ) : status === "running" ? (
              <span className="af-agb-state__time">{formatDuration(displayElapsed || 120)}</span>
            ) : (
              <span className="af-agb-state__time">{formatDuration(displayElapsed || 252)}</span>
            )}
          </span>
          <span className="af-agb-inbox-card__counts">
            <span title={`Sources read: ${task.counts[0]}`}>
              <SearchTinyIcon />
              {task.counts[0]}
            </span>
            <i aria-hidden />
            <span title={`Tool calls: ${task.counts[1]}`}>
              <WrenchTinyIcon />
              {task.counts[1]}
            </span>
          </span>
        </span>
      </button>
      <Collapse open={open}>
        <div className="af-agb-inbox-detail">
          <div className="af-agb-inbox-detail__agent">{task.model}</div>
          <ol className="af-agb-steps">
            {task.steps.map((step, index) => (
              <li
                key={step.text}
                className="af-agb-steps__item"
                data-state={step.state}
                data-last={index === task.steps.length - 1 || undefined}
              >
                <span className="af-agb-steps__text">{step.text}</span>
                {step.when ? <time className="af-agb-steps__time">{step.when}</time> : null}
              </li>
            ))}
          </ol>
          <div className="af-agb-inbox-detail__actions">
            {status === "waiting" ? (
              <>
                <button type="button" className="af-agb-aic-btn" onClick={onReject}>
                  Reject
                </button>
                <button type="button" className="af-agb-aic-btn af-agb-aic-btn--primary" onClick={onApprove}>
                  Approve
                </button>
              </>
            ) : status === "failed" ? (
              <button type="button" className="af-agb-aic-btn af-agb-aic-btn--primary" onClick={onRetry}>
                Retry
              </button>
            ) : (
              <button type="button" className="af-agb-aic-btn" onClick={onOpen}>
                Open
              </button>
            )}
          </div>
        </div>
      </Collapse>
    </article>
  );
}

/* ================================================================== */
/* 2 & 3. Approval Card & Permission Request                           */
/* ================================================================== */

export type ApprovalPhase = "pending" | "busy" | "approved" | "denied" | "rejected" | "expired";
export type PermissionGrant = "once" | "hour" | "always";

/* ================================================================== */
/* 4. Context Window                                                   */
/* ================================================================== */

export type ContextPartKey = "system" | "tools" | "files" | "conversation" | "memory";

export type ContextPart = {
  key: ContextPartKey;
  label: string;
  tokens: number;
  files?: { name: string; size?: string; tokens: number }[];
};

export const CONTEXT_LIMIT = 200_000;
export const CONTEXT_COLS = 36;
export const CONTEXT_ROWS = 6;
export const CONTEXT_CELLS = CONTEXT_COLS * CONTEXT_ROWS;

export const CONTEXT_INITIAL: ContextPart[] = [
  { key: "system", label: "System prompt", tokens: 4_200 },
  { key: "tools", label: "Tools", tokens: 12_800 },
  {
    key: "files",
    label: "Files",
    tokens: 46_100,
    files: [
      { name: "schema.prisma", size: "12.4 KB", tokens: 9_400 },
      { name: "billing.ts", size: "28.1 KB", tokens: 21_300 },
      { name: "meeting-notes.md", size: "19.8 KB", tokens: 15_400 },
    ],
  },
  { key: "conversation", label: "Conversation", tokens: 108_600 },
  { key: "memory", label: "Memory", tokens: 3_900 },
];

export function formatTokens(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  const k = value / 1000;
  return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}K`;
}

/* ================================================================== */
/* 5. Trace Waterfall                                                  */
/* ================================================================== */

export type SpanKind = "agent" | "llm" | "tool";

export type TraceSpan = {
  id: string;
  name: string;
  detail: string;
  kind: SpanKind;
  brand?: AgbBrandKey;
  start: number;
  duration: number;
  depth: number;
  parent?: string;
  running?: boolean;
  cost?: number;
  tokensIn?: number;
  tokensOut?: number;
  input?: string;
  output?: string;
};

export const TRACE_INITIAL: TraceSpan[] = [
  {
    id: "root",
    name: "Orchestrator",
    detail: "Opus 5.5",
    kind: "agent",
    brand: "claude",
    start: 0,
    duration: 10.8,
    depth: 0,
    cost: 0.2,
    tokensIn: 3200,
    tokensOut: 349,
    input: "Launch the new pricing page by Friday",
    output: "Opened PR #518 with new 3-tier pricing layout and verified Stripe price IDs.",
  },
  {
    id: "plan",
    name: "Plan the launch",
    detail: "Opus 5.5",
    kind: "llm",
    brand: "claude",
    start: 0.9,
    duration: 2.6,
    depth: 1,
    parent: "root",
    cost: 0.06,
    tokensIn: 2400,
    tokensOut: 1200,
    input: "Break down pricing launch tasks across copy, Stripe price IDs, and layout.",
    output: "3 steps: inspect Stripe tiers, generate React pricing grid, open pull request.",
  },
  {
    id: "stripe",
    name: "Read active price tiers",
    detail: "stripe.prices",
    kind: "tool",
    brand: "stripe",
    start: 3.5,
    duration: 1.1,
    depth: 1,
    parent: "root",
    cost: 0,
    tokensIn: 180,
    tokensOut: 620,
    input: '{ "product": "prod_aster_pro", "active": true }',
    output: "Returned Starter ($19), Team ($49), Enterprise (custom).",
  },
  {
    id: "coder",
    name: "Build pricing page",
    detail: "GPT-6 Sol",
    kind: "agent",
    brand: "openai",
    start: 4.6,
    duration: 4.4,
    depth: 1,
    parent: "root",
    cost: 0.1,
    tokensIn: 4800,
    tokensOut: 2100,
    input: "Implement responsive pricing comparison table and annual billing toggle.",
    output: "Updated src/pages/pricing.tsx and verified Lighthouse layout shift = 0.",
  },
  {
    id: "gen",
    name: "Write pricing.tsx",
    detail: "GPT-6 Sol",
    kind: "llm",
    brand: "openai",
    start: 4.9,
    duration: 3.3,
    depth: 2,
    parent: "coder",
    cost: 0.09,
    tokensIn: 4100,
    tokensOut: 1920,
    input: "Generate accessible tier cards + FAQ disclosure rows.",
    output: "Wrote 218 lines in src/pages/pricing.tsx.",
  },
  {
    id: "check",
    name: "Search competitor plans",
    detail: "web.search",
    kind: "tool",
    brand: "search",
    start: 5.4,
    duration: 1.4,
    depth: 2,
    parent: "coder",
    cost: 0.01,
    tokensIn: 140,
    tokensOut: 540,
    input: '{ "query": "B2B SaaS seat pricing annual discount 2026" }',
    output: "20% annual discount is standard across 4 comparable tools.",
  },
  {
    id: "pr",
    name: "Open pull request",
    detail: "github.create_pr",
    kind: "tool",
    brand: "github",
    start: 9.1,
    duration: 1.7,
    depth: 1,
    parent: "root",
    cost: 0,
    tokensIn: 260,
    tokensOut: 190,
    input: '{ "repo": "acme/web", "head": "feat/pricing-v3", "base": "main" }',
    output: "Created PR #518 — CI checks queued.",
  },
];

export function buildTrace(nowSec: number, baseSpans: TraceSpan[] = TRACE_INITIAL) {
  const totalEnd = baseSpans.reduce((max, s) => Math.max(max, s.start + s.duration), 10.8);
  const clampedNow = Math.min(Math.max(0.4, nowSec), totalEnd);
  const done = clampedNow >= totalEnd - 0.02;

  const visible = baseSpans
    .filter((s) => s.start <= clampedNow)
    .map((s) => {
      if (s.id === "root" || (s.kind === "agent" && s.depth === 0)) {
        return {
          ...s,
          duration: done ? totalEnd : clampedNow,
          running: !done,
        };
      }
      const end = s.start + s.duration;
      const isRunning = !done && clampedNow < end;
      return {
        ...s,
        duration: isRunning ? Math.max(0.15, clampedNow - s.start) : s.duration,
        running: isRunning,
      };
    });

  return { spans: visible, end: done ? totalEnd : clampedNow, totalEnd, done };
}

/* ================================================================== */
/* 6. Decision Tree                                                    */
/* ================================================================== */

export type DecisionEffect = string | { text: string; note: string; source?: string };

export type DecisionOption = {
  label: string;
  pick?: boolean;
  icon?: AgbBrandKey;
  apps?: AgbBrandKey[];
  effects?: DecisionEffect[];
  next?: {
    question: string;
    options: DecisionOption[];
  };
};

export type Decision = {
  id: string;
  agent: string;
  model: string;
  brand?: AgbBrandKey;
  risk: "high" | "medium" | "low";
  question: string;
  context: string;
  options: DecisionOption[];
};

export const DECISIONS: Decision[] = [
  {
    id: "incident",
    agent: "Incident agent",
    model: "Opus 5.5",
    brand: "claude",
    risk: "high",
    question: "Checkout errors jumped to 18% after deploy #482 – what should I do?",
    context: "2,140 errors in 12 minutes · about $3.2k in orders an hour at risk.",
    options: [
      {
        label: "Roll back to #481",
        pick: true,
        icon: "vercel",
        effects: [],
        next: {
          question: "Tell customers about it?",
          options: [
            {
              label: "Post on the status page",
              pick: true,
              icon: "statuspage",
              apps: ["statuspage", "slack"],
              effects: ["Public · updates every 15 min"],
            },
            {
              label: "Only tell the team",
              icon: "slack",
              apps: ["slack"],
              effects: ["#incidents only · nothing public"],
            },
          ],
        },
      },
      {
        label: "Ship a hotfix",
        icon: "github",
        effects: [],
        next: {
          question: "Wait for the test run?",
          options: [
            {
              label: "Ship right away",
              apps: ["github", "vercel"],
              effects: [
                {
                  text: "Skips 1,284 tests",
                  note: "Skipping the regression suite leaves coupon & tax edge cases unverified.",
                  source: "Release policy §2.1",
                },
              ],
            },
            {
              label: "After the tests",
              apps: ["github"],
              effects: ["14 min · errors keep coming"],
            },
          ],
        },
      },
      {
        label: "Turn the flag off",
        icon: "launchdarkly",
        apps: ["launchdarkly", "sentry"],
        effects: ["New checkout off for 30%", "The old one takes over"],
      },
    ],
  },
  {
    id: "renewal",
    agent: "Sales agent",
    model: "Sonnet 5.5",
    brand: "claude",
    risk: "medium",
    question: "Acme asked for 25% off their $84k renewal – how should I reply?",
    context: "Renews in 9 days · 210 seats · added two new product teams this quarter.",
    options: [
      {
        label: "Counter at 15% off",
        pick: true,
        icon: "hubspot",
        effects: [],
        next: {
          question: "Tie it to a multi-year term?",
          options: [
            {
              label: "2-year commitment only",
              pick: true,
              apps: ["hubspot", "stripe"],
              effects: ["$71.4k/yr · locked through 2028"],
            },
            {
              label: "Keep 1-year renewal",
              apps: ["hubspot"],
              effects: ["$71.4k · resets next year"],
            },
          ],
        },
      },
      {
        label: "Escalate to VP of Sales",
        icon: "slack",
        effects: [],
        next: {
          question: "Which brief should I attach?",
          options: [
            {
              label: "Call summary only",
              apps: ["slack"],
              effects: ["Yesterday's renewal call notes"],
            },
            {
              label: "Usage & margin model",
              apps: ["notion", "slack"],
              effects: [
                {
                  text: "Gross margin drops to 61%",
                  note: "Below the 65% enterprise floor; requires VP sign-off.",
                  source: "Pricing playbook §3.4",
                },
              ],
            },
          ],
        },
      },
      {
        label: "Accept 25% discount",
        icon: "stripe",
        apps: ["stripe", "hubspot"],
        effects: [
          {
            text: "$63k/yr · needs exec approval",
            note: "Exceeds the 15% AE self-serve discount cap.",
            source: "Deal desk matrix",
          },
        ],
      },
    ],
  },
  {
    id: "dupes",
    agent: "Billing agent",
    model: "Haiku 5.5",
    brand: "openai",
    risk: "low",
    question: "3 customers have duplicate active subscriptions – what should I do?",
    context: "All three double-submitted checkout during Tuesday's webhook retry spike.",
    options: [
      {
        label: "Cancel newer subscription",
        pick: true,
        icon: "stripe",
        apps: ["stripe"],
        effects: ["Cancels 3 duplicates · reversible", "Sends 3 confirmation emails"],
      },
      {
        label: "Refund & cancel newer",
        icon: "stripe",
        apps: ["stripe", "slack"],
        effects: [
          "Refunds $147 · permanent",
          {
            text: "Cancels 3 subscriptions",
            note: "One account already accrued seat overages on the second subscription.",
            source: "Billing rules §4.2",
          },
        ],
      },
      {
        label: "Ask customers first",
        icon: "notion",
        apps: ["slack"],
        effects: ["Sends 3 emails · waits for reply", "No changes if unanswered in 48h"],
      },
    ],
  },
];

/* ================================================================== */
/* 7. Inline Diff                                                      */
/* ================================================================== */

export type DiffToken = { kind: "text"; text: string } | { kind: "change"; id: number; del: string; ins: string };

export const DIFF_TOKENS: DiffToken[] = [
  { kind: "text", text: "Hi everyone, " },
  { kind: "change", id: 1, del: "we are very excited to announce that ", ins: "" },
  { kind: "text", text: "the new dashboard is now " },
  { kind: "change", id: 2, del: "available", ins: "live" },
  { kind: "text", text: " for all users. It loads " },
  { kind: "change", id: 3, del: "a lot faster than before", ins: "twice as fast" },
  { kind: "text", text: ", and you can now export any report to CSV " },
  { kind: "change", id: 4, del: "with just a single", ins: "in one" },
  { kind: "text", text: " click. Let us know what you think!" },
];

export type DiffStatus = "accepted" | "rejected";

/* ================================================================== */
/* 8. Memory Panel                                                     */
/* ================================================================== */

export type MemoryCategory = "preference" | "work" | "project";

export type MemoryItem = {
  id: string;
  category: MemoryCategory;
  text: string;
  source: string;
  date: string;
  paused?: boolean;
};

export const MEMORY_CATEGORY: Record<MemoryCategory, string> = {
  preference: "Preferences",
  work: "Work",
  project: "Projects",
};

export const MEMORY_INITIAL: MemoryItem[] = [
  {
    id: "ts",
    category: "preference",
    text: "Prefers TypeScript examples over plain JavaScript",
    source: "From chat",
    date: "Oct 12",
  },
  {
    id: "short",
    category: "preference",
    text: "Likes short answers first, details only when asked",
    source: "You added",
    date: "Oct 2",
  },
  {
    id: "inter",
    category: "preference",
    text: "Designs with Inter and a 4px spacing grid",
    source: "From Figma",
    date: "Oct 7",
  },
  {
    id: "role",
    category: "work",
    text: "Product designer and front-end developer at a small studio",
    source: "From chat",
    date: "Sep 28",
  },
  {
    id: "stack",
    category: "work",
    text: "Ships with React, Vite and Tailwind; deploys on Vercel",
    source: "From chat",
    date: "Oct 3",
  },
  {
    id: "friday",
    category: "work",
    text: "Sends release notes to clients every Friday",
    source: "From chat",
    date: "Oct 9",
  },
  {
    id: "fintech",
    category: "project",
    text: "Redesigning the onboarding flow for a fintech client, due Oct 24",
    source: "From chat",
    date: "Oct 11",
  },
  {
    id: "tokens",
    category: "project",
    text: "Keeps design tokens in one tokens.json shared with the code",
    source: "From chat",
    date: "Oct 5",
  },
];

/* ================================================================== */
/* 9. Review Center                                                    */
/* ================================================================== */

export type ReviewText = string | { text: string; note?: string; source?: string };
export type ReviewValue = ReviewText | ReviewText[];
export type ReviewField = { label: string; value: ReviewValue };
export type ReviewDiffLine = {
  n: number;
  text: string;
  kind: "ctx" | "add" | "del";
  flag?: string;
  flagSpan?: string;
};
export type ReviewFile = {
  path: string;
  added: number;
  removed: number;
  collapsed?: boolean;
  lines: ReviewDiffLine[];
};

export type ReviewSource = {
  brand: AgbBrandKey;
  label: string;
};

export type ReviewItem = {
  id: string;
  title: string;
  agent: string;
  model: string;
  brand?: AgbBrandKey;
  type: string;
  risk: "high" | "medium" | "low";
  confidence: number;
  waiting: number;
  reasoning: string;
  sources?: ReviewSource[];
  files?: ReviewFile[];
  fields?: ReviewField[];
  body?: ReviewText[];
};

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "merge-511",
    title: "Merge #511 – retries for webhook delivery",
    agent: "Coder",
    model: "GPT-6 Sol",
    brand: "openai",
    type: "Code change",
    risk: "high",
    confidence: 0.41,
    waiting: 28,
    reasoning: "Deliveries time out under load – I added retries with backoff. Tests pass.",
    sources: [
      { brand: "github", label: "PR #511" },
      { brand: "github", label: "CI run 1204" },
    ],
    files: [
      {
        path: "src/webhooks/deliver.ts",
        added: 3,
        removed: 2,
        lines: [
          { n: 38, text: "  const endpoint = await getEndpoint(event.accountId);", kind: "ctx" },
          {
            n: 39,
            text: "  if (!endpoint) return;",
            kind: "del",
            flagSpan: "if (!endpoint) return;",
            flag: "Removing the null guard assumes every active account has an endpoint configured.",
          },
          { n: 39, text: "  // endpoint is always set for active accounts", kind: "add" },
          { n: 40, text: "  const body = JSON.stringify(event.payload);", kind: "ctx" },
          { n: 41, text: "  for (let i = 0; i < 3; i++) {", kind: "del" },
          {
            n: 41,
            text: "  for (let i = 0; i < 10; i++) {",
            kind: "add",
            flagSpan: "i < 10",
            flag: "10 attempts with exponential backoff reaches 128s, exceeding the 60s worker timeout.",
          },
          { n: 42, text: "    const res = await post(endpoint.url, body);", kind: "ctx" },
          { n: 43, text: "    await sleep(250 * 2 ** i);", kind: "add" },
        ],
      },
      {
        path: "src/webhooks/deliver.test.ts",
        added: 14,
        removed: 0,
        collapsed: true,
        lines: [{ n: 1, text: '  it("retries on 503 with exponential backoff", async () => {', kind: "add" }],
      },
      {
        path: "src/queue/config.ts",
        added: 1,
        removed: 1,
        collapsed: true,
        lines: [{ n: 12, text: "  maxDeliveryAttempts: 10,", kind: "add" }],
      },
    ],
  },
  {
    id: "redline-7",
    title: "Redline §7.2 Limitation of liability",
    agent: "Legal agent",
    model: "Opus 5.5",
    brand: "claude",
    type: "Contract clause",
    risk: "high",
    confidence: 0.58,
    waiting: 18,
    reasoning: "Counterparty lowered the liability cap from 12 months of fees to a flat $10,000.",
    sources: [{ brand: "notion", label: "MSA Playbook v3" }],
    fields: [
      { label: "Current clause", value: "Liability shall not exceed the fees paid in the preceding 12 months." },
      {
        label: "Proposed redline",
        value: [
          {
            text: "Liability shall not exceed 1.5× the fees paid in the preceding 12 months.",
            note: "Playbook allows 1×–2× annual fees depending on data processing scope.",
            source: "MSA Playbook §7.2",
          },
        ],
      },
    ],
  },
  {
    id: "split-name",
    title: "Split customers.name into first and last name",
    agent: "Data agent",
    model: "Opus 5.5",
    brand: "claude",
    type: "Migration",
    risk: "medium",
    confidence: 0.64,
    waiting: 14,
    reasoning: "Backfills 48,210 customer rows before switching the CRM sync to structured names.",
    sources: [{ brand: "github", label: "Migration 0048" }],
    files: [
      {
        path: "prisma/migrations/0048_split_customer_name.sql",
        added: 9,
        removed: 1,
        lines: [
          { n: 1, text: "ALTER TABLE customers ADD COLUMN first_name TEXT, ADD COLUMN last_name TEXT;", kind: "add" },
          {
            n: 2,
            text: "UPDATE customers SET first_name = split_part(name, ' ', 1), last_name = split_part(name, ' ', 2);",
            kind: "add",
            flagSpan: "split_part(name, ' ', 2)",
            flag: "Multi-word surnames will be truncated to the second token; consider strpos + substr.",
          },
        ],
      },
    ],
  },
  {
    id: "stripe-keys",
    title: "Rotate the Stripe API keys",
    agent: "Ops agent",
    model: "Sonnet 5.5",
    brand: "claude",
    type: "Plan",
    risk: "medium",
    confidence: 0.72,
    waiting: 11,
    reasoning: "Restricted key sk_live_…91a reaches its 90-day rotation policy tomorrow.",
    sources: [{ brand: "stripe", label: "Key policy" }],
    body: [
      "1. Issue new restricted key with Charges + Webhooks write scope.",
      "2. Update Vercel production secret STRIPE_SECRET_KEY and trigger rolling redeploy.",
      "3. Expire previous key after 24h zero-traffic verification.",
    ],
  },
  {
    id: "refund-4821",
    title: "Refund order #4821 for Maya Chen",
    agent: "Support agent",
    model: "Sonnet 5.5",
    brand: "claude",
    type: "Refund",
    risk: "medium",
    confidence: 0.62,
    waiting: 9,
    reasoning: "Blender arrived cracked — damaged items within 30 days qualify for full replacement or refund.",
    sources: [{ brand: "stripe", label: "ch_3Q91kL" }],
    fields: [
      {
        label: "Amount",
        value: [
          {
            text: "$184.00",
            note: "Includes $20 express shipping; standard policy refunds item subtotal ($164) unless carrier fault.",
            source: "Refund policy §4",
          },
          " ($164.00 item + $20.00 shipping)",
        ],
      },
      { label: "Order", value: "#4821 · Visa ···· 4242" },
    ],
    body: [
      "Hi Maya, so sorry the blender arrived damaged. We've issued a full refund back to your Visa ending in 4242 (3–5 business days).",
    ],
  },
  {
    id: "triage-14",
    title: "Tag 14 tickets as Billing",
    agent: "Triage agent",
    model: "Haiku 5.5",
    brand: "claude",
    type: "Triage",
    risk: "low",
    confidence: 0.97,
    waiting: 6,
    reasoning: "Matched invoice, receipt, and VAT keywords across 14 unassigned inbox threads.",
    sources: [{ brand: "hubspot", label: "Inbox queue" }],
    body: ["Routes 14 threads to the Billing queue and assigns SLA tier Standard (4h)."],
  },
  {
    id: "bump-stripe",
    title: "Bump @stripe/stripe-js to 4.2.1",
    agent: "Coder",
    model: "GPT-6 Sol",
    brand: "openai",
    type: "Code change",
    risk: "low",
    confidence: 0.95,
    waiting: 4,
    reasoning: "Patch release fixing Safari Apple Pay sheet dismissal; 214/214 tests pass.",
    sources: [{ brand: "github", label: "PR #514" }],
    files: [
      {
        path: "package.json",
        added: 1,
        removed: 1,
        lines: [
          { n: 24, text: '    "@stripe/stripe-js": "4.2.0",', kind: "del" },
          { n: 24, text: '    "@stripe/stripe-js": "4.2.1",', kind: "add" },
        ],
      },
    ],
  },
  {
    id: "post-notes",
    title: "Post release notes to #announcements",
    agent: "Release agent",
    model: "GPT-6 Sol",
    brand: "openai",
    type: "Slack message",
    risk: "low",
    confidence: 0.91,
    waiting: 2,
    reasoning: "v2.4 is live in production and smoke checks are green.",
    sources: [{ brand: "slack", label: "#announcements" }],
    body: [
      "v2.4 is live: faster CSV report exports, webhook delivery retries, and compact context window controls.",
    ],
  },
];

/* ================================================================== */
/* 10. Tool Call Card                                                  */
/* ================================================================== */

export type ToolCallStatus = "running" | "success" | "error";

export type ToolCall = {
  id: string;
  name: string;
  icon?: AffectIconKey;
  summary: string;
  status: ToolCallStatus;
  duration?: number;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
};

export function resolveToolIcon(call: { name: string; icon?: AffectIconKey }): AffectIconKey {
  if (call.icon) return call.icon;
  const n = call.name.toLowerCase();
  if (n.includes("search") || n.includes("find") || n.includes("query")) return "search";
  if (n.includes("read") || n.includes("write") || n.includes("file") || n.includes("doc")) return "file";
  if (n.includes("http") || n.includes("web") || n.includes("fetch") || n.includes("browser")) return "globe";
  if (n.includes("db") || n.includes("sql") || n.includes("store") || n.includes("hubspot") || n.includes("deal")) return "database";
  if (n.includes("git") || n.includes("branch")) return "gitBranch";
  return "terminal";
}

export const TOOL_CALLS: ToolCall[] = [
  {
    id: "t1",
    name: "search_web",
    icon: "search",
    summary: "Searched the web for 'CRM pricing 2026'",
    status: "success",
    duration: 1500,
    args: { query: "CRM pricing 2026 small sales team", max_results: 5 },
    result: {
      results: [
        { title: "HubSpot Sales Hub pricing", url: "https://www.hubspot.com/pricing/sales", price_per_seat: 90 },
        { title: "Pipedrive plans and pricing", url: "https://www.pipedrive.com/en/pricing", price_per_seat: 49 },
        { title: "Attio Plus plan", url: "https://attio.com/pricing", price_per_seat: 34 },
      ],
    },
  },
  {
    id: "t2",
    name: "hubspot.list_deals",
    icon: "database",
    summary: "Checked 6 open deals ($84,200 pipeline)",
    status: "success",
    duration: 700,
    args: { stage: "open", team_size: 10 },
    result: { open_deals: 6, pipeline_usd: 84200, closing_this_month: 2 },
  },
  {
    id: "t3",
    name: "fetch_page",
    icon: "file",
    summary: "Reading hubspot.com/pricing…",
    status: "running",
    args: { url: "https://www.hubspot.com/pricing/sales", timeout_ms: 8000 },
  },
];

export function toJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return String(value);
  }
}

export function highlightJson(text: string) {
  return text.split("\n").map((line, index) => {
    const match = /^(\s*)("[^"]+")(: )(.*)$/.exec(line);
    if (!match) return <span key={index}>{line || " "}</span>;
    const [, indent, key, colon, rest] = match;
    const isString = rest.startsWith('"');
    return (
      <span key={index}>
        {indent}
        <span className="af-agb-tcc-key">{key}</span>
        {colon}
        <span className={isString ? "af-agb-tcc-str" : "af-agb-tcc-num"}>{rest}</span>
      </span>
    );
  });
}

export function ToolStatus({ call, elapsedMs }: { call: ToolCall; elapsedMs: number }) {
  if (call.status === "running") {
    return (
      <span className="af-agb-tcc__status" data-status="running">
        <InboxStatusIcon status="running" />
        <span className="af-agb-tcc__time">{formatTenths(elapsedMs / 1000)}</span>
      </span>
    );
  }
  if (call.status === "error") {
    return (
      <span className="af-agb-tcc__status" data-status="error">
        <span className="af-agb-tcc__dot" data-tone="error" aria-hidden />
        <span className="af-agb-tcc__time">Failed</span>
      </span>
    );
  }
  return (
    <span className="af-agb-tcc__status" data-status="success">
      <span className="af-agb-tcc__dot" data-tone="success" aria-hidden />
      <span className="af-agb-tcc__time">{formatTenths((call.duration ?? 600) / 1000)}</span>
    </span>
  );
}

export function ToolCallCard({
  call,
  onRetry,
  open,
  onToggle,
  maxCodeHeight,
}: {
  call: ToolCall;
  onRetry: () => void;
  open: boolean;
  onToggle: () => void;
  maxCodeHeight?: number;
}) {
  const id = useId();
  const elapsedMs = useTenthsStopwatch(call.status === "running", 600);
  const [copied, setCopied] = useState<"args" | "result" | null>(null);
  const copyTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const iconName = resolveToolIcon(call);
  const codeStyle = maxCodeHeight ? { maxHeight: `${maxCodeHeight}px`, overflowY: "auto" as const } : undefined;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = async (kind: "args" | "result", text: string) => {
    let ok = false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // Fall through to execCommand fallback
      }
    }
    if (!ok && typeof document !== "undefined" && document.body) {
      let textarea: HTMLTextAreaElement | null = null;
      try {
        textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        ok = Boolean(document.execCommand?.("copy"));
      } catch {
        ok = false;
      } finally {
        if (textarea?.parentNode) {
          textarea.parentNode.removeChild(textarea);
        }
      }
    }
    if (!ok || !mountedRef.current) return;
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    setCopied(kind);
    copyTimer.current = window.setTimeout(() => {
      copyTimer.current = null;
      if (mountedRef.current) setCopied(null);
    }, 1600);
  };

  return (
    <div className="af-agb-tcc" data-status={call.status} data-open={open || undefined}>
      <button
        type="button"
        className="af-agb-tcc__head"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={onToggle}
      >
        <span className="af-agb-tcc__icon" aria-hidden>
          <AfIcon name={iconName} size={15} />
        </span>
        <span className="af-agb-tcc__main">
          <code className="af-agb-tcc__name" title={call.name}>
            {call.name}
          </code>
          <span className="af-agb-tcc__summary" title={call.summary}>
            {call.summary}
          </span>
        </span>
        <ToolStatus call={call} elapsedMs={elapsedMs} />
        <AfIcon name="chevronDown" size={12} className="af-agb-tcc__chevron" />
      </button>
      <Collapse open={open}>
        <div className="af-agb-tcc__body" id={`${id}-body`}>
          {call.status === "error" ? (
            <div className="af-agb-tcc__error">
              <AfIcon name="alert" size={14} />
              <p>{call.error}</p>
              <button type="button" className="af-agb-tcc__retry" onClick={onRetry}>
                <AfIcon name="refresh" size={12} />
                <span>Retry</span>
              </button>
            </div>
          ) : null}
          <div className="af-agb-tcc__section">
            <div className="af-agb-tcc__sectionhead">
              <span className="af-agb-tcc__seclabel">Arguments</span>
              <button
                type="button"
                className="af-agb-tcc__copy"
                aria-label="Copy arguments"
                title="Copy arguments"
                data-copied={copied === "args" || undefined}
                onClick={() => copy("args", toJson(call.args))}
              >
                <AfIcon name={copied === "args" ? "check" : "copy"} size={13} />
              </button>
            </div>
            <pre className="af-agb-tcc__code" style={codeStyle}>
              <code>{highlightJson(toJson(call.args))}</code>
            </pre>
          </div>
          {call.status !== "error" || call.result !== undefined ? (
            <div className="af-agb-tcc__section">
              <div className="af-agb-tcc__sectionhead">
                <span className="af-agb-tcc__seclabel">Result</span>
                {call.result !== undefined ? (
                  <button
                    type="button"
                    className="af-agb-tcc__copy"
                    aria-label="Copy result"
                    title="Copy result"
                    data-copied={copied === "result" || undefined}
                    onClick={() => copy("result", toJson(call.result))}
                  >
                    <AfIcon name={copied === "result" ? "check" : "copy"} size={13} />
                  </button>
                ) : null}
              </div>
              {call.result !== undefined ? (
                <pre className="af-agb-tcc__code" style={codeStyle}>
                  <code>{highlightJson(toJson(call.result))}</code>
                </pre>
              ) : (
                <p className="af-agb-tcc__pending">Waiting for result…</p>
              )}
            </div>
          ) : null}
        </div>
      </Collapse>
    </div>
  );
}
