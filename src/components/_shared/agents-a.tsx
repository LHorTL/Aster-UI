import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AffectIconKey } from "../../model";
import { AfTag } from "../../ui";
import { AfIcon } from "../../icons";
import { useAfLayerContainer, useOverlayFocusTrap, useIsomorphicLayoutEffect } from "../../primitives";

/* ------------------------------------------------------------------ */
/* Shared State, Formatting & Timers                                  */
/* ------------------------------------------------------------------ */

export type AgentState = "running" | "waiting" | "done" | "failed" | "idle";

export const STATE_LABEL: Record<AgentState, string> = {
  running: "Running",
  waiting: "Needs you",
  done: "Done",
  failed: "Failed",
  idle: "Idle",
};

export const STATE_TONE: Record<AgentState, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  running: "accent",
  waiting: "warning",
  done: "success",
  failed: "danger",
  idle: "neutral",
};

export const STATE_ICON: Record<AgentState, AffectIconKey> = {
  running: "loader",
  waiting: "clock",
  done: "check",
  failed: "alert",
  idle: "pause",
};

export const money = (value: number) => `$${value.toFixed(2)}`;

export const duration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
};

export const tenths = (seconds: number) => `${seconds.toFixed(1)}s`;

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function useSeconds(active = true) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return seconds;
}

export function useElapsedTicker(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setElapsed((value) => value + delta);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active]);
  return elapsed;
}

export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ------------------------------------------------------------------ */
/* Verbatim Official Brand & Tool Micro-Logos                         */
/* ------------------------------------------------------------------ */

export type BrandKey =
  | "claude"
  | "openai"
  | "gemini"
  | "mistral"
  | "notion"
  | "github"
  | "slack"
  | "hubspot"
  | "stripe"
  | "linear"
  | "figma"
  | "google"
  | "gmail"
  | "drive"
  | "postgres"
  | "database"
  | "search"
  | "you"
  | "llm"
  | "tool"
  | "agent"
  | "human"
  | "slides"
  | "docs";

export function HeaderSpark({ size = 14, className }: { size?: number; className?: string }) {
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

export function BrandLogo({
  kind,
  size,
  className,
  style,
}: {
  kind: BrandKey;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const dim = size ? { width: size, height: size } : {};

  switch (kind) {
    case "claude":
      return (
        <svg {...dim} viewBox="0 0 1200 1200" aria-hidden="true" className={className} style={style}>
          <path
            fill="#D97757"
            d="M 233.96 800.21 L 468.64 668.54 L 472.59 657.1 L 468.64 650.74 L 457.21 650.74 L 417.99 648.32 L 283.89 644.7 L 167.6 639.87 L 54.93 633.83 L 26.58 627.79 L 0 592.75 L 2.74 575.28 L 26.58 559.25 L 60.72 562.23 L 136.19 567.38 L 249.42 575.19 L 331.57 580.03 L 453.26 592.67 L 472.59 592.67 L 475.33 584.86 L 468.72 580.03 L 463.57 575.19 L 346.39 495.79 L 219.54 411.87 L 153.1 363.54 L 117.18 339.06 L 99.06 316.11 L 91.25 266.01 L 123.87 230.09 L 167.68 233.07 L 178.87 236.05 L 223.25 270.2 L 318.04 343.57 L 441.83 434.74 L 459.95 449.8 L 467.19 444.64 L 468.08 441.02 L 459.95 427.41 L 392.62 305.72 L 320.78 181.93 L 288.81 130.63 L 280.35 99.87 C 277.37 87.22 275.19 76.59 275.19 63.62 L 312.32 13.21 L 332.86 6.6 L 382.39 13.21 L 403.25 31.33 L 434.01 101.72 L 483.87 212.54 L 561.18 363.22 L 583.81 407.92 L 595.89 449.32 L 600.4 461.96 L 608.21 461.96 L 608.21 454.71 L 614.58 369.83 L 626.34 265.61 L 637.77 131.52 L 641.72 93.75 L 660.4 48.48 L 697.53 24 L 726.52 37.85 L 750.36 72 L 747.06 94.07 L 732.89 186.2 L 705.1 330.52 L 686.98 427.17 L 697.53 427.17 L 709.61 415.09 L 758.5 350.17 L 840.64 247.49 L 876.89 206.74 L 919.17 161.72 L 946.31 140.3 L 997.61 140.3 L 1035.38 196.43 L 1018.47 254.42 L 965.64 321.42 L 921.83 378.2 L 859.01 462.77 L 819.79 530.42 L 823.41 535.81 L 832.75 534.93 L 974.66 504.72 L 1051.33 490.87 L 1142.82 475.17 L 1184.21 494.5 L 1188.72 514.15 L 1172.46 554.34 L 1074.6 578.5 L 959.84 601.45 L 788.94 641.88 L 786.85 643.41 L 789.26 646.39 L 866.26 653.64 L 899.19 655.41 L 979.81 655.41 L 1129.93 666.6 L 1169.15 692.54 L 1192.67 724.27 L 1188.72 748.43 L 1128.32 779.19 L 1046.82 759.87 L 856.59 714.6 L 791.36 698.34 L 782.34 698.34 L 782.34 703.73 L 836.7 756.89 L 936.32 846.85 L 1061.07 962.82 L 1067.44 991.49 L 1051.41 1014.12 L 1034.5 1011.7 L 924.89 929.23 L 882.6 892.11 L 786.85 811.49 L 780.48 811.49 L 780.48 819.95 L 802.55 852.24 L 919.09 1027.41 L 925.13 1081.13 L 916.67 1098.6 L 886.47 1109.15 L 853.29 1103.11 L 785.07 1007.36 L 714.68 899.52 L 657.91 802.87 L 650.98 806.82 L 617.48 1167.7 L 601.77 1186.15 L 565.53 1200 L 535.33 1177.05 L 519.3 1139.92 L 535.33 1066.55 L 554.66 970.79 L 570.36 894.68 L 584.54 800.13 L 592.99 768.72 L 592.43 766.63 L 585.5 767.52 L 514.23 865.37 L 405.83 1011.87 L 320.05 1103.68 L 299.52 1111.81 L 263.92 1093.37 L 267.22 1060.43 L 287.11 1031.11 L 405.83 880.11 L 477.42 786.52 L 523.65 732.48 L 523.33 724.67 L 520.59 724.67 L 205.29 929.4 L 149.15 936.64 L 124.99 914.01 L 127.97 876.89 L 139.41 864.81 L 234.2 799.57 Z"
          />
        </svg>
      );

    case "openai":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      );

    case "gemini":
      return (
        <svg {...dim} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
          <defs>
            <linearGradient id={`gm-${uid}`} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1C7DFF" />
              <stop offset="0.52" stopColor="#1C69FF" />
              <stop offset="1" stopColor="#B04DFF" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#gm-${uid})`}
            d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"
          />
        </svg>
      );

    case "mistral":
      return (
        <svg {...dim} viewBox="-2 -2 29 29" aria-hidden="true" className={className} style={style}>
          <rect x="0" y="0" width="5" height="5" fill="#FFD800" />
          <rect x="20" y="0" width="5" height="5" fill="#FFD800" />
          <rect x="0" y="5" width="5" height="5" fill="#FFAF00" />
          <rect x="5" y="5" width="5" height="5" fill="#FFAF00" />
          <rect x="15" y="5" width="5" height="5" fill="#FFAF00" />
          <rect x="20" y="5" width="5" height="5" fill="#FFAF00" />
          <rect x="0" y="10" width="5" height="5" fill="#FF8205" />
          <rect x="5" y="10" width="5" height="5" fill="#FF8205" />
          <rect x="10" y="10" width="5" height="5" fill="#FF8205" />
          <rect x="15" y="10" width="5" height="5" fill="#FF8205" />
          <rect x="20" y="10" width="5" height="5" fill="#FF8205" />
          <rect x="0" y="15" width="5" height="5" fill="#FA500F" />
          <rect x="10" y="15" width="5" height="5" fill="#FA500F" />
          <rect x="20" y="15" width="5" height="5" fill="#FA500F" />
          <rect x="0" y="20" width="5" height="5" fill="#E10500" />
          <rect x="20" y="20" width="5" height="5" fill="#E10500" />
        </svg>
      );

    case "notion":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
        </svg>
      );

    case "github":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );

    case "slack":
      return (
        <svg {...dim} viewBox="0 0 49.883 49.877" fill="none" aria-hidden="true" className={className} style={style}>
          <g>
            <path d="M18.3549 10.4784C15.4713 10.4784 13.1157 8.12279 13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V10.4784H18.3549Z" fill="#36C5F0" />
            <path d="M18.3575 13.12C21.2411 13.12 23.5967 15.4756 23.5967 18.3592C23.5967 21.2428 21.2411 23.5984 18.3575 23.5984H5.2392C2.35561 23.5984 0 21.2428 0 18.3592C0 15.4756 2.35561 13.12 5.2392 13.12H18.3575Z" fill="#36C5F0" />
          </g>
          <g transform="translate(26.28 0)">
            <path d="M13.1244 18.3592C13.1244 15.4756 15.48 13.12 18.3636 13.12C21.2472 13.12 23.6028 15.4756 23.6028 18.3592C23.6028 21.2428 21.2472 23.5984 18.3636 23.5984H13.1244V18.3592Z" fill="#2EB67D" />
            <path d="M10.4785 18.3575C10.4785 21.2411 8.12286 23.5967 5.23927 23.5967C2.35568 23.5967 0 21.2411 0 18.3575V5.2392C0 2.35561 2.35568 0 5.23927 0C8.12286 0 10.4785 2.35561 10.4785 5.2392V18.3575Z" fill="#2EB67D" />
          </g>
          <g transform="translate(0 26.28)">
            <path d="M10.4784 5.2392C10.4784 8.12279 8.12279 10.4784 5.2392 10.4784C2.35561 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35561 0 5.2392 0H10.4784V5.2392Z" fill="#E01E5A" />
            <path d="M13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V18.3575C23.5941 21.2411 21.2385 23.5967 18.3549 23.5967C15.4713 23.5967 13.1157 21.2411 13.1157 18.3575V5.2392Z" fill="#E01E5A" />
          </g>
          <g transform="translate(26.28 26.28)">
            <path d="M5.23927 13.1157C8.12286 13.1157 10.4785 15.4713 10.4785 18.3549C10.4785 21.2385 8.12286 23.5941 5.23927 23.5941C2.35568 23.5941 0 21.2385 0 18.3549V13.1157H5.23927Z" fill="#ECB22E" />
            <path d="M5.23927 10.4784C2.35568 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35568 0 5.23927 0H18.3576C21.2412 0 23.5968 2.35561 23.5968 5.2392C23.5968 8.12279 21.2412 10.4784 18.3576 10.4784H5.23927Z" fill="#ECB22E" />
          </g>
        </svg>
      );

    case "hubspot":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="#FF7A59" aria-hidden="true" className={className} style={style}>
          <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z" />
        </svg>
      );

    case "stripe":
      return (
        <svg {...dim} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
          <rect width="24" height="24" rx="6" fill="#635BFF" />
          <path
            fill="#fff"
            transform="translate(5 5) scale(0.5833)"
            d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
          />
        </svg>
      );

    case "linear":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="#5E6AD2" aria-hidden="true" className={className} style={style}>
          <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
        </svg>
      );

    case "figma":
      return (
        <svg {...dim} viewBox="0 0 38 57" aria-hidden="true" className={className} style={style}>
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
        </svg>
      );

    case "google":
      return (
        <svg {...dim} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.81Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
        </svg>
      );

    case "gmail":
      return (
        <svg {...dim} viewBox="0 0 56.4108 44.8722" fill="none" aria-hidden="true" className={className} style={style}>
          <defs>
            <linearGradient id={`gml0-${uid}`} x1="50.3153" y1="5.76727" x2="50.3153" y2="44.8701" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60D673" />
              <stop offset="0.17" stopColor="#42C868" />
              <stop offset="0.39" stopColor="#0EBC5F" />
              <stop offset="0.62" stopColor="#00A9BB" />
              <stop offset="0.86" stopColor="#3C90FF" />
              <stop offset="1" stopColor="#3186FF" />
            </linearGradient>
            <linearGradient id={`gml1-${uid}`} x1="0" y1="6.45153" x2="56.4107" y2="6.45153" gradientUnits="userSpaceOnUse">
              <stop offset="0.08" stopColor="#FF63A0" />
              <stop offset="0.3" stopColor="#FC413D" />
              <stop offset="0.65" stopColor="#FC413D" />
              <stop offset="0.72" stopColor="#FC5C30" />
              <stop offset="0.86" stopColor="#FEB10C" />
              <stop offset="0.96" stopColor="#FFDB0F" />
            </linearGradient>
          </defs>
          <path d="M44.2255 5.76727H56.4051V41.0239C56.4051 43.148 54.683 44.8701 52.5589 44.8701H46.1486C45.08 44.8701 44.2255 44.01 44.2255 42.947V5.76727Z" fill={`url(#gml0-${uid})`} />
          <path d="M12.1796 5.76727H0V41.0239C0 43.148 1.72213 44.8701 3.84618 44.8701H10.2565C11.32 44.8701 12.1796 44.01 12.1796 42.947V5.76727Z" fill="#FC413D" />
          <path d="M10.0085 1.42778C7.43377 -0.736342 3.5924 -0.403647 1.42828 2.17105C-0.735843 4.74543 -0.403148 8.58681 2.17155 10.7512L26.5557 31.2479C27.51 32.04 28.9 32.04 29.8554 31.2479L54.2396 10.7509C56.814 8.58681 57.1467 4.74543 54.9825 2.17073C52.8184 -0.403648 48.977 -0.736342 46.4027 1.42778L28.2054 16.724L10.0085 1.42778Z" fill={`url(#gml1-${uid})`} />
        </svg>
      );

    case "drive":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="#1FA463" aria-hidden="true" className={className} style={style}>
          <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
        </svg>
      );

    case "postgres":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ color: "#0070d6", ...style }}>
          <ellipse cx="12" cy="6" rx="7.5" ry="3" stroke="currentColor" strokeWidth="2" />
          <path d="M4.5 6V18C4.5 19.66 7.86 21 12 21C16.14 21 19.5 19.66 19.5 18V6" stroke="currentColor" strokeWidth="2" />
          <path d="M4.5 12C4.5 13.66 7.86 15 12 15C16.14 15 19.5 13.66 19.5 12" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case "database":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ color: "#13b3a0", ...style }}>
          <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
          <path d="M20 12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12" stroke="currentColor" strokeWidth="2" />
          <path d="M20 5V19C20 20.6569 16.4183 22 12 22C7.58172 22 4 20.6569 4 19V5" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case "search":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ color: "#4fb0fe", ...style }}>
          <path d="M17.5 17.5L22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case "you":
      return (
        <svg {...dim} viewBox="0 0 107 107" fill="currentColor" aria-hidden="true" className={className} style={style}>
          <path d="M106.447 67.3367C106.447 69.7104 104.523 71.6348 102.149 71.6348H75.928C73.5542 71.6348 71.6299 73.5591 71.6299 75.9329V102.16C71.6299 104.534 69.7056 106.458 67.3318 106.458H35.8198H4.29811C1.92433 106.463 0 104.539 0 102.165V39.1262C0 36.7525 1.92433 34.8281 4.29811 34.8281H30.5193C32.8931 34.8281 34.8174 32.9038 34.8174 30.53V4.29812C34.8174 1.92433 36.7417 0 39.1155 0H102.149C104.523 0 106.447 1.92433 106.447 4.29811V67.3367ZM35.8174 66.3425C35.8174 68.7163 37.7417 70.6406 40.1155 70.6406H66.3318C68.7056 70.6406 70.6299 68.7163 70.6299 66.3425V40.1155C70.6299 37.7417 68.7056 35.8174 66.3318 35.8174H40.1155C37.7417 35.8174 35.8174 37.7417 35.8174 40.1155V66.3425Z" />
        </svg>
      );

    case "slides":
      return (
        <svg {...dim} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
          <rect x="4" y="2" width="16" height="20" rx="2.5" fill="#FBBC04" />
          <rect x="7" y="8" width="10" height="7" rx="1" fill="#fff" />
        </svg>
      );

    case "docs":
      return (
        <svg {...dim} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
          <rect x="4" y="2" width="16" height="20" rx="2.5" fill="#4285F4" />
          <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "llm":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
          <path
            d="M12 2.5C12.7 7.4 15.1 9.8 20 10.5C15.1 11.2 12.7 13.6 12 18.5C11.3 13.6 8.9 11.2 4 10.5C8.9 9.8 11.3 7.4 12 2.5Z"
            fill="currentColor"
          />
          <circle cx="19" cy="18.5" r="1.8" fill="currentColor" opacity="0.65" />
        </svg>
      );

    case "tool":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
          <path d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9l-5.3 5.3a1.6 1.6 0 0 0 2.3 2.3l5.3-5.3a4.5 4.5 0 0 0 5.9-5.9l-2.6 2.6-2.3-.6-.6-2.3 2.6-2.6Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "agent":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
          <rect x="4" y="7" width="16" height="12" rx="4" stroke="currentColor" strokeWidth="1.9" />
          <path d="M12 3v4M9 12.5v1M15 12.5v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "human":
      return (
        <svg {...dim} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
          <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.9" />
          <path d="M5 19.5c1.4-3.1 4-4.5 7-4.5s5.6 1.4 7 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Proportional Stage Wrapper for Fixed-Coordinate Canvases           */
/* ------------------------------------------------------------------ */

export function ScaledStage({
  designWidth,
  designHeight,
  className,
  innerClassName,
  children,
}: {
  designWidth: number;
  designHeight: number;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  const [wrapRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const scale = measuredWidth > 0 && measuredWidth < designWidth ? measuredWidth / designWidth : 1;

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: Math.round(designHeight * scale * 100) / 100,
      }}
    >
      <div
        className={innerClassName}
        style={{
          position: "relative",
          width: designWidth,
          height: designHeight,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legacy Shared Shell & Overlay Helpers (Kept for Compatibility)     */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  icon,
  meta,
  extra,
  footer,
  className,
  children,
}: {
  title: ReactNode;
  icon?: AffectIconKey;
  meta?: ReactNode;
  extra?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={["af-aga-panel", className].filter(Boolean).join(" ")}>
      <header className="af-aga-panel__head">
        {icon ? (
          <span className="af-aga-panel__icon" aria-hidden>
            <AfIcon name={icon} size={16} />
          </span>
        ) : null}
        <div className="af-aga-panel__titles">
          <h3 className="af-aga-panel__title">{title}</h3>
          {meta ? <p className="af-aga-panel__meta">{meta}</p> : null}
        </div>
        {extra ? <div className="af-aga-panel__extra">{extra}</div> : null}
      </header>
      {children}
      {footer ? <footer className="af-aga-panel__foot">{footer}</footer> : null}
    </section>
  );
}

export function StateTag({ state, label }: { state: AgentState; label?: ReactNode }) {
  return (
    <AfTag tone={STATE_TONE[state]} dot={state === "running" || state === "waiting"}>
      {label ?? STATE_LABEL[state]}
    </AfTag>
  );
}

export function StageLayer({
  stage: explicitStage,
  label,
  tone = "light",
  onClose,
  children,
}: {
  stage?: HTMLElement | null;
  label: string;
  tone?: "light" | "dark";
  onClose: () => void;
  children: ReactNode;
}) {
  const stage = useAfLayerContainer(explicitStage);
  const cardRef = useRef<HTMLDivElement>(null);
  useOverlayFocusTrap({ open: Boolean(stage), panelRef: cardRef, container: stage, onClose });
  const [region, setRegion] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!stage) return;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      const margin = 8;
      const top = Math.max(0, Math.min(rect.height, Math.max(rect.top, margin) - rect.top));
      const bottom = Math.max(0, Math.min(rect.height - top, rect.bottom - Math.min(rect.bottom, window.innerHeight - margin)));
      const left = Math.max(0, Math.min(rect.width, Math.max(rect.left, margin) - rect.left));
      const right = Math.max(0, Math.min(rect.width - left, rect.right - Math.min(rect.right, window.innerWidth - margin)));
      setRegion((prev) =>
        prev && prev.top === top && prev.bottom === bottom && prev.left === left && prev.right === right
          ? prev
          : { top, bottom, left, right },
      );
    };
    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(stage);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [stage]);
  if (!stage) return null;
  return createPortal(
    <div
      className="af-aga-layer"
      style={region ?? undefined}
      data-clamped={region && (region.top > 0 || region.bottom > 0 || region.left > 0 || region.right > 0) ? "" : undefined}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={cardRef} className="af-aga-layer__card" data-tone={tone} role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="af-aga-layer__close" aria-label="Close" onClick={onClose}>
          <AfIcon name="x" size={14} />
        </button>
        {children}
      </div>
    </div>,
    stage,
  );
}

/* ------------------------------------------------------------------ */
/* 1. Agent Cursors Seeds                                             */
/* ------------------------------------------------------------------ */

export type SuggestStatus = "pending" | "accepted" | "rejected";

type CursorAgentSeed = {
  id: string;
  name: string;
  model: string;
  brand?: BrandKey;
  cost: number;
  state: AgentState;
  action: string;
  left: number;
  top: number;
  suggestion?: { from: string; to: string };
};

export const CURSOR_AGENTS: CursorAgentSeed[] = [
  {
    id: "researcher",
    name: "Researcher",
    model: "Opus 5.5",
    brand: "claude",
    cost: 0.13,
    state: "running",
    action: "Checking the numbers",
    left: 20,
    top: 21,
    suggestion: { from: "about 40% of their week", to: "38% of their workweek" },
  },
  {
    id: "designer",
    name: "Designer",
    model: "Gemini 3.8 Pro",
    brand: "gemini",
    cost: 0.11,
    state: "running",
    action: "Waiting for the render",
    left: 34,
    top: 40,
  },
  {
    id: "coder",
    name: "Coder",
    model: "Mistral Large",
    brand: "mistral",
    cost: 0.08,
    state: "running",
    action: "Reading the config",
    left: 26,
    top: 61,
  },
  {
    id: "writer",
    name: "Writer",
    model: "GPT-6 Sol",
    brand: "openai",
    cost: 0.01,
    state: "idle",
    action: "Away",
    left: 72,
    top: 84,
    suggestion: { from: "without a status meeting", to: "with zero Monday syncs" },
  },
];

/* ------------------------------------------------------------------ */
/* 2. Agent Graph Seeds                                               */
/* ------------------------------------------------------------------ */

type GraphNodeSeed = {
  id: string;
  label: string;
  sub: string;
  kind: "hub" | "agent" | "tool" | "human";
  brand?: BrandKey;
  size: number;
  x: number;
  y: number;
  labelPos?: "above" | "below";
  state: AgentState;
  cost: number;
  calls: number;
};

export const GRAPH_NODES: GraphNodeSeed[] = [
  { id: "orchestrator", label: "Orchestrator", sub: "Opus 5.5", kind: "hub", brand: "claude", size: 56, x: 378, y: 243, state: "running", cost: 0.08, calls: 12 },
  { id: "researcher", label: "Researcher", sub: "Sonnet 5.5", kind: "agent", brand: "claude", size: 46, x: 474, y: 171.9, state: "running", cost: 0.03, calls: 5 },
  { id: "analyst", label: "Analyst", sub: "Gemini 3.8 Pro", kind: "agent", brand: "gemini", size: 46, x: 474, y: 314.1, state: "running", cost: 0.02, calls: 4 },
  { id: "coder", label: "Coder", sub: "GPT-6 Sol", kind: "agent", brand: "openai", size: 46, x: 282, y: 314.1, state: "done", cost: 0.03, calls: 3 },
  { id: "writer", label: "Writer", sub: "Sonnet 5.5", kind: "agent", brand: "claude", size: 46, x: 282, y: 171.9, state: "running", cost: 0.02, calls: 4 },
  { id: "search", label: "Web search", sub: "Tool", kind: "tool", brand: "search", size: 38, x: 639.9, y: 171.9, state: "done", cost: 0.01, calls: 6 },
  { id: "notion", label: "Notion", sub: "Tool", kind: "tool", brand: "notion", size: 38, x: 474, y: 65.7, labelPos: "above", state: "done", cost: 0, calls: 4 },
  { id: "hubspot", label: "HubSpot", sub: "Tool", kind: "tool", brand: "hubspot", size: 38, x: 642.7, y: 314.1, state: "done", cost: 0, calls: 3 },
  { id: "database", label: "Database", sub: "Tool", kind: "tool", brand: "database", size: 38, x: 474, y: 419.9, state: "done", cost: 0, calls: 5 },
  { id: "github", label: "GitHub", sub: "Tool", kind: "tool", brand: "github", size: 38, x: 213.8, y: 396.3, state: "done", cost: 0, calls: 2 },
  { id: "slack", label: "Slack", sub: "Tool", kind: "tool", brand: "slack", size: 38, x: 65, y: 171.9, state: "done", cost: 0, calls: 3 },
  { id: "you", label: "You", sub: "Human", kind: "human", brand: "you", size: 42, x: 210.3, y: 91, labelPos: "above", state: "done", cost: 0, calls: 1 },
];

export const GRAPH_EDGES: { from: string; to: string; tone: "accent" | "success" | "warning" | "danger"; path?: string }[] = [
  { from: "orchestrator", to: "you", tone: "warning", path: "M378 243L378 99Q378 91 370 91L210.3 91" },
  { from: "orchestrator", to: "researcher", tone: "accent", path: "M386 243L386 179.9Q386 171.9 394 171.9L474 171.9" },
  { from: "orchestrator", to: "analyst", tone: "accent", path: "M382 243L382 306.1Q382 314.1 390 314.1L474 314.1" },
  { from: "orchestrator", to: "coder", tone: "success", path: "M374 243L374 306.1Q374 314.1 366 314.1L282 314.1" },
  { from: "orchestrator", to: "writer", tone: "accent", path: "M370 243L370 179.9Q370 171.9 362 171.9L282 171.9" },
  { from: "orchestrator", to: "slack", tone: "success", path: "M378 243L73 243Q65 243 65 235L65 171.9" },
  { from: "researcher", to: "search", tone: "accent", path: "M474 171.9L639.9 171.9" },
  { from: "researcher", to: "notion", tone: "success", path: "M474 171.9L474 65.7" },
  { from: "analyst", to: "database", tone: "accent", path: "M474 314.1L474 419.9" },
  { from: "analyst", to: "hubspot", tone: "success", path: "M474 314.1L642.7 314.1" },
  { from: "coder", to: "github", tone: "success", path: "M282 314.1L221.8 314.1Q213.8 314.1 213.8 322.1L213.8 396.3" },
  { from: "writer", to: "notion", tone: "accent", path: "M282 171.9L282 73.7Q282 65.7 290 65.7L474 65.7" },
  { from: "writer", to: "slack", tone: "success", path: "M282 175.9L65 175.9" },
  { from: "writer", to: "you", tone: "warning", path: "M282 167.9L218.3 167.9Q210.3 167.9 210.3 159.9L210.3 91" },
];

export const nodeCenter = (node: { x: number; y: number; size: number }) => ({ x: node.x, y: node.y });

export function graphEdgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 2 || Math.abs(dy) < 2) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  const r = Math.min(8, Math.abs(dx) / 2, Math.abs(dy) / 2);
  const sy = dy > 0 ? 1 : -1;
  const sx = dx > 0 ? 1 : -1;
  return `M${a.x} ${a.y}L${a.x} ${b.y - sy * r}Q${a.x} ${b.y} ${a.x + sx * r} ${b.y}L${b.x} ${b.y}`;
}

/* ------------------------------------------------------------------ */
/* 3. Agent Lanes Seeds                                               */
/* ------------------------------------------------------------------ */

export type LaneTask = {
  id: string;
  lane: string;
  label: string;
  apps: AffectIconKey[];
  brands?: BrandKey[];
  start: number;
  span: number;
  state: AgentState;
  reason?: string;
};

export const LANE_AGENTS: { id: string; name: string; model: string; brand?: BrandKey; state: AgentState }[] = [
  { id: "researcher", name: "Researcher", model: "Opus 5.5", brand: "claude", state: "running" },
  { id: "writer", name: "Writer", model: "Sonnet 5.5", brand: "claude", state: "running" },
  { id: "reviewer", name: "Reviewer", model: "GPT-6 Sol", brand: "openai", state: "idle" },
  { id: "ops", name: "Ops", model: "Gemini 3.8 Flash", brand: "gemini", state: "waiting" },
];

export const LANE_WINDOW = 30;
export const LANE_ROW = 48;

export const LANE_TASKS: LaneTask[] = [
  { id: "r1", lane: "researcher", label: "Competitor pricing", apps: ["globe", "file"], brands: ["google", "notion"], start: 1, span: 13, state: "done" },
  { id: "r2", lane: "researcher", label: "Customer interviews", apps: ["file", "message"], brands: ["notion", "slack"], start: 15.5, span: 14.5, state: "running" },
  { id: "w1", lane: "writer", label: "Draft pricing page", apps: ["sliders", "file"], brands: ["figma", "notion"], start: 15, span: 15, state: "running" },
  { id: "v1", lane: "reviewer", label: "PR #482 billing", apps: ["gitBranch", "layers"], brands: ["github", "linear"], start: 5, span: 12, state: "done" },
  { id: "o1", lane: "ops", label: "Sync CRM", apps: ["database"], brands: ["hubspot"], start: 3, span: 7.5, state: "failed", reason: "HubSpot rate limit exceeded (429) after 3 retries." },
  { id: "o2", lane: "ops", label: "Rotate API keys", apps: ["shield", "gitBranch"], brands: ["stripe", "github"], start: 13.5, span: 13.5, state: "waiting", reason: "Production Stripe secret rotation requires approval before revoking live key." },
];

export const LANE_HANDOFFS: { from: string; to: string; lane: string; at: number }[] = [
  { from: "r1", to: "w1", lane: "writer", at: 14 },
];

/* ------------------------------------------------------------------ */
/* 4. Agent Plan Seeds                                                */
/* ------------------------------------------------------------------ */

export type PlanStep = {
  id: string;
  title: string;
  desc: string;
  tool: string;
  expected: number;
};

export const PLAN_STEPS: PlanStep[] = [
  { id: "p1", title: "Pull Q3 revenue and ARR", desc: "Monthly revenue, ARR and net retention", tool: "stripe.query", expected: 1.4 },
  { id: "p2", title: "Summarize product launches", desc: "Shipped projects and adoption", tool: "linear.search", expected: 1.8 },
  { id: "p3", title: "Build the KPI slides", desc: "Six charts in the board template", tool: "slides.create", expected: 2.2 },
  { id: "p4", title: "Draft the board memo", desc: "One page, wins, risks and asks", tool: "docs.write", expected: 1.9 },
  { id: "p5", title: "Send the draft to Maya for review", desc: "", tool: "gmail.draft", expected: 1.2 },
];

export type PlanPhase = "review" | "running" | "failed" | "done";

/* ------------------------------------------------------------------ */
/* 5. Agent Queue Seeds                                               */
/* ------------------------------------------------------------------ */

export type QueueKind = "llm" | "tool" | "agent" | "human";

export type QueueJob = {
  id: string;
  name: string;
  kind: QueueKind;
  priority: "high" | "normal" | "low";
  brand?: BrandKey;
  waitedSec?: number;
  attempt?: number;
};

export const KIND_META: Record<QueueKind, { label: string; icon: AffectIconKey }> = {
  llm: { label: "LLM", icon: "sparkle" },
  tool: { label: "Tool", icon: "terminal" },
  agent: { label: "Sub-agent", icon: "users" },
  human: { label: "Human", icon: "eye" },
};

export type RunningJob = {
  slot: number;
  job: QueueJob;
  progress: number;
};

export type QueueState = {
  queued: QueueJob[];
  running: RunningJob[];
  done: number;
  failed: number;
  paused: boolean;
  limit: number;
  depth: number[];
};

export const QUEUE_SEED: QueueJob[] = [
  { id: "q1", name: "Score lead – Tailspin", kind: "llm", brand: "llm", priority: "normal", waitedSec: 6, attempt: 1 },
  { id: "q2", name: "Post digest to #support", kind: "tool", brand: "slack", priority: "normal", waitedSec: 11, attempt: 1 },
  { id: "q3", name: "Classify 12 support emails", kind: "llm", brand: "llm", priority: "normal", waitedSec: 13, attempt: 1 },
];

export const QUEUE_WORKERS: { name: string; icon: AffectIconKey; brand: BrandKey }[] = [
  { name: "Sonnet 5.5", icon: "sparkle", brand: "claude" },
  { name: "GPT-6 Sol", icon: "message", brand: "openai" },
  { name: "Gemini 3.8 Flash", icon: "bolt", brand: "gemini" },
  { name: "Haiku 5", icon: "terminal", brand: "claude" },
  { name: "GPT-6 Mini", icon: "message", brand: "openai" },
  { name: "Mistral Large", icon: "bolt", brand: "mistral" },
];

export const QUEUE_RUNNING: RunningJob[] = [
  { slot: 0, job: { id: "r1", name: "Update roadmap page", kind: "tool", brand: "notion", priority: "normal", waitedSec: 3, attempt: 1 }, progress: 0.44 },
  { slot: 1, job: { id: "r2", name: "Embed 240 docs · 5/5", kind: "tool", brand: "postgres", priority: "normal", waitedSec: 5, attempt: 1 }, progress: 0.72 },
  { slot: 2, job: { id: "r3", name: "Open PR #500", kind: "tool", brand: "github", priority: "normal", waitedSec: 4, attempt: 1 }, progress: 0.36 },
  { slot: 3, job: { id: "r4", name: "Draft reply – Acme VIP", kind: "llm", brand: "llm", priority: "high", waitedSec: 2, attempt: 1 }, progress: 0.58 },
];

export const DEPTH_POINTS = 48;
export const BACKPRESSURE = 12;
export const DEPTH_MAX = 24;

export function queueStep(state: QueueState, slots: number): QueueState {
  const depth = [...state.depth, state.queued.length + state.running.length].slice(-DEPTH_POINTS);
  if (state.paused) return { ...state, depth };
  if (state.limit > 0) return { ...state, limit: state.limit - 1, depth };
  const nextRunning: RunningJob[] = [];
  let done = state.done;
  for (const item of state.running) {
    const speed = item.job.kind === "llm" ? 0.16 : item.job.kind === "tool" ? 0.22 : item.job.kind === "agent" ? 0.1 : 0.14;
    const progress = item.progress + speed;
    if (progress >= 1) done += 1;
    else nextRunning.push({ ...item, progress });
  }
  const queued = [...state.queued];
  while (nextRunning.length < slots && queued.length) {
    const job = queued.shift()!;
    nextRunning.push({ slot: nextRunning.length, job, progress: 0.02 });
  }
  const relabeled = nextRunning.map((item, index) => ({ ...item, slot: index }));
  return { ...state, queued, running: relabeled, done, depth };
}

/* ------------------------------------------------------------------ */
/* 6. Agent Steering Seeds                                            */
/* ------------------------------------------------------------------ */

type SteeringStepSeed = { id: string; title: string; state: "done" | "current" | "pending"; time: string };

export type Adopted = { id: number; stepId: string; text: string; mode: "next" | "now" };

export const STEERING_STEPS: SteeringStepSeed[] = [
  { id: "s1", title: "Read schema and 14 migrations", state: "done", time: "1.4s" },
  { id: "s2", title: "Plan the split into accounts and profiles", state: "current", time: "0.6s" },
  { id: "s3", title: "Write migration 0042_split_users", state: "pending", time: "—" },
  { id: "s4", title: "Dry run on staging", state: "pending", time: "—" },
  { id: "s5", title: "Open a pull request for review", state: "pending", time: "—" },
];

/* ------------------------------------------------------------------ */
/* 7. Agent Tree Seeds                                                */
/* ------------------------------------------------------------------ */

export type TreeNode = {
  id: string;
  name: string;
  model: string;
  brand?: BrandKey;
  state: AgentState;
  cost: number;
  calls: number;
  elapsed?: string;
  desc: string;
  tools: AffectIconKey[];
  toolBrands?: BrandKey[];
  parent: string | null;
  x: number;
  y: number;
};

export const TREE_W = 236;
export const TREE_H = 108;
export const TREE_CANVAS_W = 720;

export const TREE_NODES: TreeNode[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    model: "Opus 5.5",
    brand: "claude",
    state: "running",
    cost: 0.09,
    calls: 8,
    elapsed: "18s",
    desc: "Launch the new pricing page by Friday",
    tools: ["message", "file", "gitBranch"],
    toolBrands: ["slack", "notion", "github"],
    parent: null,
    x: 242,
    y: 12,
  },
  {
    id: "researcher",
    name: "Researcher",
    model: "Sonnet 5.5",
    brand: "claude",
    state: "running",
    cost: 0.04,
    calls: 4,
    elapsed: "7s",
    desc: "Compare the pricing of five competitors",
    tools: ["globe", "file"],
    toolBrands: ["search", "notion"],
    parent: "orchestrator",
    x: 104,
    y: 154,
  },
  {
    id: "writer",
    name: "Writer",
    model: "Sonnet 5.5",
    brand: "claude",
    state: "running",
    cost: 0.06,
    calls: 5,
    elapsed: "6s",
    desc: "Write the copy for the three plans",
    tools: ["file", "sliders"],
    toolBrands: ["notion", "figma"],
    parent: "orchestrator",
    x: 380,
    y: 154,
  },
  {
    id: "scraper",
    name: "Scraper",
    model: "Gemini 3.8 Flash",
    brand: "gemini",
    state: "running",
    cost: 0.02,
    calls: 3,
    elapsed: "4s",
    desc: "Read pricing pages across five competitors",
    tools: ["globe"],
    toolBrands: ["search"],
    parent: "researcher",
    x: 24,
    y: 296,
  },
  {
    id: "analyst",
    name: "Analyst",
    model: "Sonnet 5.5",
    brand: "claude",
    state: "done",
    cost: 0.02,
    calls: 2,
    elapsed: "3s",
    desc: "Summarise 120 customer pricing reviews",
    tools: ["file"],
    toolBrands: ["notion"],
    parent: "researcher",
    x: 280,
    y: 296,
  },
];

export function treeDescendants(id: string): string[] {
  const out: string[] = [];
  const walk = (parent: string) => {
    for (const node of TREE_NODES) {
      if (node.parent !== parent) continue;
      out.push(node.id);
      walk(node.id);
    }
  };
  walk(id);
  return out;
}

export function treeAncestors(id: string): string[] {
  const out: string[] = [];
  let current = TREE_NODES.find((node) => node.id === id) ?? null;
  while (current?.parent) {
    out.push(current.parent);
    current = TREE_NODES.find((node) => node.id === current!.parent) ?? null;
  }
  return out;
}

export function treeEdgePath(parent: TreeNode, child: TreeNode, w = TREE_W, h = TREE_H) {
  const px = parent.x + w / 2;
  const py = parent.y + h;
  const cx = child.x + w / 2;
  const cy = child.y;
  const midY = py + (cy - py) / 2;
  if (Math.abs(px - cx) < 2) return `M${px} ${py}V${cy}`;
  const r = Math.min(8, Math.abs(cx - px) / 2, Math.abs(cy - py) / 4);
  const dir = cx > px ? 1 : -1;
  return `M${px} ${py}V${midY - r}Q${px} ${midY} ${px + dir * r} ${midY}H${cx - dir * r}Q${cx} ${midY} ${cx} ${midY + r}V${cy}`;
}

/* ------------------------------------------------------------------ */
/* 8. Autonomy Dial Seeds                                             */
/* ------------------------------------------------------------------ */

export type AutoAction = {
  id: string;
  label: string;
  risk: "safe" | "risky" | "destructive";
  icon: AffectIconKey;
  brand?: BrandKey;
  defaultPinned?: boolean;
};

export const AUTO_ACTIONS: AutoAction[] = [
  { id: "read", label: "Read files and docs", risk: "safe", icon: "file", brand: "notion" },
  { id: "draft", label: "Draft emails", risk: "safe", icon: "mail", brand: "gmail" },
  { id: "crm", label: "Update CRM records", risk: "risky", icon: "database", brand: "hubspot" },
  { id: "send", label: "Send emails", risk: "risky", icon: "send", brand: "gmail" },
  { id: "delete", label: "Delete files", risk: "destructive", icon: "trash", brand: "drive" },
  { id: "spend", label: "Spend money", risk: "destructive", icon: "creditCard", brand: "stripe", defaultPinned: true },
];

export const TIER_LABEL = ["Always ask", "If risky", "Full auto"] as const;

export const TIER_HINT = [
  "Every action pauses for your approval first.",
  "Safe actions run on their own; risky and destructive ones ask first.",
  "Everything unpinned runs automatically; pinned actions always ask.",
] as const;

export const DIAL_CX = 110;
export const DIAL_CY = 104;
export const DIAL_R = 82;

/* ------------------------------------------------------------------ */
/* 9. Delegate Board Seeds                                            */
/* ------------------------------------------------------------------ */

export type BoardTask = {
  id: string;
  title: string;
  icon: AffectIconKey;
  brands?: BrandKey[];
  minutes: number;
  cost: number;
};

export type BoardChip = {
  id: string;
  title: string;
  icon: AffectIconKey;
  brands?: BrandKey[];
  minutes?: number;
  cost?: number;
  state: "running" | "queued";
};

export type BoardAgent = {
  id: string;
  name: string;
  model: string;
  brand?: BrandKey;
  rate: number;
  minutes: number;
  queue: BoardChip[];
};

export const BOARD_TASKS: BoardTask[] = [
  { id: "b1", title: "Write release notes", icon: "file", brands: ["notion", "github"], minutes: 12, cost: 0.36 },
  { id: "b2", title: "Fix flaky checkout test", icon: "gitBranch", brands: ["github"], minutes: 20, cost: 1.2 },
  { id: "b3", title: "Summarize churn calls", icon: "message", brands: ["slack", "notion"], minutes: 15, cost: 0.45 },
  { id: "b4", title: "Update pricing page", icon: "sliders", brands: ["figma"], minutes: 10, cost: 0.3 },
  { id: "b5", title: "Clean up CRM duplicates", icon: "database", brands: ["hubspot"], minutes: 18, cost: 0.18 },
];

export const BOARD_AGENTS: BoardAgent[] = [
  {
    id: "researcher",
    name: "Researcher",
    model: "Opus 5.5",
    brand: "claude",
    rate: 0.08,
    minutes: 11,
    queue: [{ id: "c1", title: "Competitor scan", icon: "globe", brands: ["google", "notion"], minutes: 11, cost: 0.6, state: "running" }],
  },
  {
    id: "writer",
    name: "Writer",
    model: "Sonnet 5.5",
    brand: "claude",
    rate: 0.03,
    minutes: 0,
    queue: [],
  },
  {
    id: "coder",
    name: "Coder",
    model: "GPT-6 Sol",
    brand: "openai",
    rate: 0.06,
    minutes: 27,
    queue: [
      { id: "c2", title: "Refactor auth", icon: "gitBranch", brands: ["github"], minutes: 15, cost: 0.72, state: "running" },
      { id: "c3", title: "Upgrade Stripe SDK", icon: "creditCard", brands: ["stripe", "github"], minutes: 12, cost: 0.48, state: "queued" },
    ],
  },
  {
    id: "ops",
    name: "Ops",
    model: "Gemini 3.8 Flash",
    brand: "gemini",
    rate: 0.01,
    minutes: 0,
    queue: [],
  },
];

export const BOARD_BASE_MINUTES = 0;

export function clockText(minutes: number) {
  const value = Math.max(0, Math.round(BOARD_BASE_MINUTES + minutes));
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
