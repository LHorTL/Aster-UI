import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { useIsomorphicLayoutEffect } from "../../primitives";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MARK_PALETTE = [
  "var(--af-accent)",
  "var(--af-info, var(--af-accent))",
  "var(--af-success)",
  "var(--af-warning)",
  "var(--af-strong)",
] as const;

/**
 * Deterministic 3×3 symmetric pixel mark (affectUI signature agent glyph).
 * Uses pure SVG rects (zero CSS Grid) and optional staggered twinkle when `active` / `twinkle`.
 */
export function AgentPixelMark({
  id,
  seed: seedProp,
  active,
  twinkle,
  size = 14,
  color,
  className,
}: {
  id?: string;
  seed?: string;
  active?: boolean;
  twinkle?: boolean;
  size?: number;
  color?: string;
  className?: string;
}) {
  const isActive = Boolean(active ?? twinkle);
  const seed = hashSeed(seedProp || id || "agent");
  const fill = color ?? MARK_PALETTE[seed % MARK_PALETTE.length];
  const cells: Array<{ x: number; y: number; on: boolean; delay: number }> = [];
  let litCount = 0;
  for (let row = 0; row < 3; row += 1) {
    const leftBit = ((seed >> (row * 2)) & 1) === 1;
    const midBit =
      ((seed >> (row * 2 + 1)) & 1) === 1 || (row === 1 && litCount === 0);
    const bits = [leftBit, midBit, leftBit];
    for (let col = 0; col < 3; col += 1) {
      const on = bits[col]!;
      if (on) litCount += 1;
      cells.push({
        x: col * 5 + 0.5,
        y: row * 5 + 0.5,
        on,
        delay: ((row * 3 + col) * 110) % 660,
      });
    }
  }
  if (litCount < 3) {
    cells[1]!.on = true;
    cells[3]!.on = true;
    cells[4]!.on = true;
    cells[5]!.on = true;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className ? `af-agc-mark ${className}` : "af-agc-mark"}
      data-active={isActive ? "true" : undefined}
      data-twinkle={isActive ? "true" : undefined}
      style={{ flex: "none", display: "block" }}
    >
      {cells.map((c, idx) =>
        c.on ? (
          <rect
            key={idx}
            x={c.x}
            y={c.y}
            width={3}
            height={3}
            rx={0.75}
            fill={fill}
            className={isActive ? "af-agc-pxcell" : undefined}
            style={
              isActive
                ? ({ animationDelay: `${c.delay}ms` } as CSSProperties)
                : undefined
            }
          />
        ) : null,
      )}
    </svg>
  );
}

/**
 * Colored vector tool & service micro-marks (Linear, Stripe, Figma, Slack, HubSpot, Vercel, GitHub, Notion, Drive).
 */
export function ToolBrandMark({
  tool,
  name,
  size = 14,
  muted = false,
}: {
  tool?: string;
  name?: string;
  size?: number;
  muted?: boolean;
}) {
  const key = (tool ?? name ?? "tool").toLowerCase();
  const opacity = muted ? 0.45 : 1;

  if (key.includes("linear") || key.includes("issue")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="#5E6AD2"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
      </svg>
    );
  }

  if (key.includes("cursor")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
          opacity,
          color: "var(--af-strong)",
          flex: "none",
          display: "block",
        }}
      >
        <path
          d="M12 2 20.66 7v10L12 22 3.34 17V7L12 2Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 22V12m0 0L20.66 7M12 12 3.34 7m4.66 2.7L16 14.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (key.includes("acme")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        style={{
          opacity,
          flex: "none",
          display: "block",
        }}
      >
        <rect x="1" y="1" width="16" height="16" rx="4.2" fill="var(--af-strong)" />
        <circle cx="9" cy="5.7" r="1.75" fill="var(--af-surface)" />
        <circle cx="12.3" cy="9" r="1.75" fill="var(--af-surface)" />
        <circle cx="9" cy="12.3" r="1.75" fill="var(--af-surface)" />
        <circle cx="5.7" cy="9" r="1.75" fill="var(--af-surface)" />
        <circle cx="9" cy="9" r="1.3" fill="var(--af-strong)" />
      </svg>
    );
  }

  if (key.includes("stripe") || key.includes("pay") || key.includes("bill")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.4" fill="#635BFF" />
        <path
          d="M9.8 5.5c-.5-.3-1.2-.45-1.85-.45-1.1 0-1.85.5-1.85 1.35 0 1.65 3.7 1.05 3.7 3.05 0 1-.88 1.55-2.15 1.55-.8 0-1.55-.2-2.05-.55"
          stroke="#ffffff"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("figma")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <path d="M5.5 1.5h2.5v4H5.5a2 2 0 1 1 0-4Z" fill="#F24E1E" />
        <path d="M8 1.5h2.5a2 2 0 1 1 0 4H8v-4Z" fill="#FF7262" />
        <path d="M8 5.5h2.5a2 2 0 1 1 0 4H8v-4Z" fill="#1ABCFE" />
        <path d="M5.5 5.5H8v4H5.5a2 2 0 1 1 0-4Z" fill="#A259FF" />
        <path
          d="M5.5 9.5H8v2a2 2 0 1 1-2.5-1.94V9.5Z"
          fill="#0ACF83"
        />
      </svg>
    );
  }

  if (key.includes("slack")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 49.883 49.877"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
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
  }

  if (key.includes("hubspot") || key.includes("crm")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <circle
          cx="9.5"
          cy="8.5"
          r="3.2"
          stroke="#FF7A59"
          strokeWidth="1.65"
        />
        <path
          d="M9.5 2.4v2.7M6.9 10.5 3.6 12.8"
          stroke="#FF7A59"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="2.3" r="1.2" fill="#FF7A59" />
        <circle cx="3.3" cy="13" r="1.3" fill="#FF7A59" />
      </svg>
    );
  }

  if (key.includes("vercel") || key.includes("deploy")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <path d="M8 2.4 14.2 13.2H1.8L8 2.4Z" fill="var(--af-strong)" />
      </svg>
    );
  }

  if (key.includes("drive")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="#1FA463"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
      </svg>
    );
  }

  if (key.includes("github") || key.includes("git") || key.includes("pr")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        style={{
          opacity,
          color: "var(--af-strong)",
          flex: "none",
          display: "block",
        }}
      >
        <path d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.2c-1.89.41-2.29-.8-2.29-.8-.31-.78-.75-.99-.75-.99-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.61 1.04 1.6.74 1.99.57.06-.44.24-.74.43-.91-1.51-.17-3.1-.75-3.1-3.36 0-.74.27-1.35.7-1.83-.07-.17-.3-.86.07-1.8 0 0 .57-.18 1.87.7a6.5 6.5 0 0 1 3.4 0c1.3-.88 1.87-.7 1.87-.7.37.94.14 1.63.07 1.8.44.48.7 1.09.7 1.83 0 2.62-1.59 3.19-3.11 3.36.25.21.46.63.46 1.27v1.88c0 .18.12.4.47.33A6.8 6.8 0 0 0 8 1.2Z" />
      </svg>
    );
  }

  if (key.includes("notion") || key.includes("doc") || key.includes("note")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{
          opacity,
          color: "var(--af-strong)",
          flex: "none",
          display: "block",
        }}
      >
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    );
  }

  if (
    key.includes("term") ||
    key.includes("run") ||
    key.includes("test") ||
    key.includes("bash") ||
    key.includes("vitest")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ opacity, flex: "none", display: "block" }}
      >
        <rect
          x="2"
          y="2.6"
          width="12"
          height="10.8"
          rx="2.4"
          stroke="currentColor"
          strokeWidth="1.35"
        />
        <path
          d="m5 6.2 2.2 1.8L5 9.8M8.5 10h2.6"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ opacity, flex: "none", display: "block" }}
    >
      <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    </svg>
  );
}

/**
 * Authentic vector model maker micro-marks (Claude, OpenAI/Codex, Gemini, Grok, DeepSeek, Meta).
 */
export function ModelBrandMark({
  model = "claude",
  size = 11,
  className,
}: {
  model?: string;
  size?: number;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const key = model.toLowerCase();

  if (
    key.includes("claude") ||
    key.includes("anthropic") ||
    key.includes("sonnet") ||
    key.includes("opus") ||
    key.includes("haiku")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 1200 1200"
        aria-hidden="true"
        className={className}
        style={{ flex: "none", display: "block" }}
      >
        <path
          fill="#D97757"
          d="M 233.96 800.21 L 468.64 668.54 L 472.59 657.1 L 468.64 650.74 L 457.21 650.74 L 417.99 648.32 L 283.89 644.7 L 167.6 639.87 L 54.93 633.83 L 26.58 627.79 L 0 592.75 L 2.74 575.28 L 26.58 559.25 L 60.72 562.23 L 136.19 567.38 L 249.42 575.19 L 331.57 580.03 L 453.26 592.67 L 472.59 592.67 L 475.33 584.86 L 468.72 580.03 L 463.57 575.19 L 346.39 495.79 L 219.54 411.87 L 153.1 363.54 L 117.18 339.06 L 99.06 316.11 L 91.25 266.01 L 123.87 230.09 L 167.68 233.07 L 178.87 236.05 L 223.25 270.2 L 318.04 343.57 L 441.83 434.74 L 459.95 449.8 L 467.19 444.64 L 468.08 441.02 L 459.95 427.41 L 392.62 305.72 L 320.78 181.93 L 288.81 130.63 L 280.35 99.87 C 277.37 87.22 275.19 76.59 275.19 63.62 L 312.32 13.21 L 332.86 6.6 L 382.39 13.21 L 403.25 31.33 L 434.01 101.72 L 483.87 212.54 L 561.18 363.22 L 583.81 407.92 L 595.89 449.32 L 600.4 461.96 L 608.21 461.96 L 608.21 454.71 L 614.58 369.83 L 626.34 265.61 L 637.77 131.52 L 641.72 93.75 L 660.4 48.48 L 697.53 24 L 726.52 37.85 L 750.36 72 L 747.06 94.07 L 732.89 186.2 L 705.1 330.52 L 686.98 427.17 L 697.53 427.17 L 709.61 415.09 L 758.5 350.17 L 840.64 247.49 L 876.89 206.74 L 919.17 161.72 L 946.31 140.3 L 997.61 140.3 L 1035.38 196.43 L 1018.47 254.42 L 965.64 321.42 L 921.83 378.2 L 859.01 462.77 L 819.79 530.42 L 823.41 535.81 L 832.75 534.93 L 974.66 504.72 L 1051.33 490.87 L 1142.82 475.17 L 1184.21 494.5 L 1188.72 514.15 L 1172.46 554.34 L 1074.6 578.5 L 959.84 601.45 L 788.94 641.88 L 786.85 643.41 L 789.26 646.39 L 866.26 653.64 L 899.19 655.41 L 979.81 655.41 L 1129.93 666.6 L 1169.15 692.54 L 1192.67 724.27 L 1188.72 748.43 L 1128.32 779.19 L 1046.82 759.87 L 856.59 714.6 L 791.36 698.34 L 782.34 698.34 L 782.34 703.73 L 836.7 756.89 L 936.32 846.85 L 1061.07 962.82 L 1067.44 991.49 L 1051.41 1014.12 L 1034.5 1011.7 L 924.89 929.23 L 882.6 892.11 L 786.85 811.49 L 780.48 811.49 L 780.48 819.95 L 802.55 852.24 L 919.09 1027.41 L 925.13 1081.13 L 916.67 1098.6 L 886.47 1109.15 L 853.29 1103.11 L 785.07 1007.36 L 714.68 899.52 L 657.91 802.87 L 650.98 806.82 L 617.48 1167.7 L 601.77 1186.15 L 565.53 1200 L 535.33 1177.05 L 519.3 1139.92 L 535.33 1066.55 L 554.66 970.79 L 570.36 894.68 L 584.54 800.13 L 592.99 768.72 L 592.43 766.63 L 585.5 767.52 L 514.23 865.37 L 405.83 1011.87 L 320.05 1103.68 L 299.52 1111.81 L 263.92 1093.37 L 267.22 1060.43 L 287.11 1031.11 L 405.83 880.11 L 477.42 786.52 L 523.65 732.48 L 523.33 724.67 L 520.59 724.67 L 205.29 929.4 L 149.15 936.64 L 124.99 914.01 L 127.97 876.89 L 139.41 864.81 L 234.2 799.57 Z"
        />
      </svg>
    );
  }

  if (
    key.includes("gpt") ||
    key.includes("openai") ||
    key.includes("codex") ||
    key.includes("o1") ||
    key.includes("o3") ||
    key.includes("o4")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={className}
        style={{ color: "var(--af-strong)", flex: "none", display: "block" }}
      >
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    );
  }

  if (key.includes("gemini") || key.includes("google") || key.includes("flash")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
        style={{ flex: "none", display: "block" }}
      >
        <defs>
          <linearGradient
            id={`gm-${gradId}`}
            x1="0"
            y1="24"
            x2="24"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#1C7DFF" />
            <stop offset="0.52" stopColor="#1C69FF" />
            <stop offset="1" stopColor="#B04DFF" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#gm-${gradId})`}
          d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"
        />
      </svg>
    );
  }

  if (key.includes("grok") || key.includes("xai")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 33.4 32"
        fill="currentColor"
        aria-hidden="true"
        className={className}
        style={{ color: "var(--af-strong)", flex: "none", display: "block" }}
      >
        <path d="M12.8734 20.5407L23.9549 12.3506C24.4982 11.9491 25.2747 12.1057 25.5336 12.7294C26.896 16.0185 26.2873 19.9712 23.5766 22.6851C20.866 25.3989 17.0944 25.9941 13.6471 24.6386L9.88123 26.3843C15.2826 30.0806 21.8416 29.1665 25.9403 25.0601C29.1914 21.8051 30.1983 17.3683 29.2568 13.3673L29.2653 13.3758C27.9 7.49809 29.601 5.14871 33.0853 0.344576C33.1677 0.230667 33.2502 0.116757 33.3327 0L28.7476 4.59055V4.57631L12.8706 20.5436" />
        <path d="M10.5867 22.5312C6.70979 18.8234 7.37821 13.0852 10.6862 9.77618C13.1323 7.3271 17.14 6.32755 20.6385 7.79698L24.3959 6.05986C23.719 5.57005 22.8514 5.04322 21.8559 4.67301C17.3562 2.81914 11.969 3.7418 8.31115 7.40114C4.79271 10.9238 3.68626 16.3402 5.58628 20.9621C7.0056 24.4164 4.67893 26.8597 2.3352 29.3259C1.50465 30.2001 0.67126 31.0744 0 31.9999L10.5838 22.534" />
      </svg>
    );
  }

  if (key.includes("deepseek")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
        style={{ flex: "none", display: "block" }}
      >
        <path
          d="M4.5 14.2c0-4.6 3.7-8.2 8.5-8.2 3.4 0 6.1 1.7 7.3 4.3-1.6-.6-3.4-.3-4.6.8-1.4 1.3-1.8 3.4-.8 5.2-1.2.8-2.7 1.2-4.3 1.2-3.4 0-6.1-1.5-6.1-3.3Z"
          fill="#4D6BFE"
        />
        <circle cx="14.6" cy="9.6" r="1.2" fill="#ffffff" />
      </svg>
    );
  }

  if (key.includes("llama") || key.includes("meta")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
        style={{ flex: "none", display: "block" }}
      >
        <path
          d="M4.2 15.2c-1.5-2.6-.7-6.4 1.9-7.5 2.2-.9 4.3.7 5.9 3.1 1.6-2.4 3.7-4 5.9-3.1 2.6 1.1 3.4 4.9 1.9 7.5-1.4 2.4-4.3 2.5-6.2.2L12 13.4l-1.6 2c-1.9 2.3-4.8 2.2-6.2-.2Z"
          stroke="#0081FB"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return <AgentPixelMark seed={model} size={size} className={className} />;
}

/**
 * Generates a smooth monotone cubic Bezier SVG stroke path and optional closed area path.
 */
export function buildSmoothChartPath(
  points: ReadonlyArray<{ x: number; y: number }>,
  baselineY?: number,
): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  if (points.length === 1) {
    const p = points[0]!;
    const line = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const area =
      baselineY !== undefined
        ? `${line} L ${p.x.toFixed(1)} ${baselineY.toFixed(1)} Z`
        : line;
    return { line, area };
  }

  let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  if (baselineY === undefined) {
    return { line: d, area: d };
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${d} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  return { line: d, area };
}

export interface FloatingAnchorRect {
  top: number;
  left: number;
  width: number;
}

/**
 * Viewport-clamped floating position hook for `AfPortal` popovers.
 * Supports both 3-arg `(triggerRef, open, options)` and 5-arg `(open, triggerRef, panelRef, onClose, options)` forms.
 */
export function useFloatingAnchor(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  options?: {
    align?: "start" | "end" | "center";
    offset?: number;
    minWidth?: number;
    width?: number;
  },
): FloatingAnchorRect;
export function useFloatingAnchor(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: {
    width?: number;
    align?: "start" | "end" | "center";
    offset?: number;
    anchorKey?: unknown;
  },
): CSSProperties;
export function useFloatingAnchor(
  arg1: boolean | RefObject<HTMLElement | null>,
  arg2: boolean | RefObject<HTMLElement | null>,
  arg3?:
    | RefObject<HTMLElement | null>
    | {
        align?: "start" | "end" | "center";
        offset?: number;
        minWidth?: number;
        width?: number;
      },
  arg4?: () => void,
  arg5?: {
    width?: number;
    align?: "start" | "end" | "center";
    offset?: number;
    anchorKey?: unknown;
  },
): FloatingAnchorRect | CSSProperties {
  const isLegacyFiveArg = typeof arg1 === "boolean";
  const open = isLegacyFiveArg ? arg1 : (arg2 as boolean);
  const triggerRef = (isLegacyFiveArg ? arg2 : arg1) as RefObject<
    HTMLElement | null
  >;
  const panelRef = isLegacyFiveArg
    ? (arg3 as RefObject<HTMLElement | null>)
    : undefined;
  const onClose = isLegacyFiveArg ? arg4 : undefined;
  const opts = (isLegacyFiveArg ? arg5 : arg3) as
    | {
        width?: number;
        minWidth?: number;
        align?: "start" | "end" | "center";
        offset?: number;
        anchorKey?: unknown;
      }
    | undefined;

  const targetWidth = opts?.width ?? opts?.minWidth ?? 340;
  const align = opts?.align ?? "end";
  const offset = opts?.offset ?? 6;
  const anchorKey = opts?.anchorKey;

  const [pos, setPos] = useState<FloatingAnchorRect>({
    top: 0,
    left: 0,
    width: targetWidth,
  });

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;
    const panelH = panelRef?.current?.offsetHeight ?? 260;
    const actualW = Math.min(Math.max(targetWidth, rect.width), vw - 24);

    let left =
      align === "start"
        ? rect.left
        : align === "center"
          ? rect.left + rect.width / 2 - actualW / 2
          : rect.right - actualW;
    left = Math.max(12, Math.min(vw - actualW - 12, left));

    let top = rect.bottom + offset;
    if (top + panelH > vh - 12 && rect.top - panelH - offset > 12) {
      top = rect.top - panelH - offset;
    }
    setPos({ top, left, width: actualW });
  }, [align, offset, panelRef, targetWidth, triggerRef]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, anchorKey, update]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onPointerDown = (e: MouseEvent) => {
      if (!onClose) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (
        triggerRef.current?.contains(target) ||
        panelRef?.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!onClose) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    if (onClose) {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      if (onClose) {
        document.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
      }
    };
  }, [onClose, open, panelRef, triggerRef, update]);

  if (isLegacyFiveArg) {
    return {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: `min(${targetWidth}px, calc(100vw - 24px))`,
      zIndex: 1200,
    };
  }
  return pos;
}
