import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ========================================================================== *
 * Shared Inspector SVGs
 * ========================================================================== */

const CURSOR_HAND_SVG = (
  <path
    d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v1.5m0 0a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2L4.6 16.4a1.6 1.6 0 0 1 2.4-2.1L9 16V11"
    fill="#fff"
    stroke="#111"
    strokeWidth="1.3"
    strokeLinejoin="round"
  />
);

const FRAME_TAG_ICON = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="1.5" y="2" width="9" height="3" rx="1" />
    <rect x="1.5" y="7" width="6" height="3" rx="1" />
  </svg>
);

const CLAUDE_BURST_SVG = (
  <svg viewBox="0 0 1200 1200" aria-hidden="true">
    <path
      fill="#D97757"
      d="M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z"
    />
  </svg>
);

const OPENAI_KNOT_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--ui-iac-strong)" }}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

const NOTION_ICON_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--ui-iac-strong)" }}>
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
);

const SLACK_ICON_SVG = (
  <svg viewBox="0 0 49.883 49.877" fill="none" aria-hidden="true">
    <g>
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

const GITHUB_ICON_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--ui-iac-strong)" }}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const STRIPE_ICON_SVG = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#635BFF" />
    <path
      fill="#fff"
      transform="translate(5 5) scale(0.5833)"
      d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
    />
  </svg>
);

/* ========================================================================== *
 * 1. AfInspectAgentCard
 * ========================================================================== */

export interface AfInspectAgent {
  name: string;
  model: string;
  status: "running" | "done" | "waiting";
  task: string;
  cost: string;
  time: string;
  avatar?: ReactNode;
  tools?: ReactNode[];
}

export interface AfInspectAgentCardProps {
  agent?: AfInspectAgent;
  above?: AfInspectAgent | null;
  /** Walks the selection through the rows; false holds it on the header. */
  playing?: boolean;
  /** Milliseconds each row remains selected. */
  hold?: number;
  /** Initial delay before the first selection appears, in ms. */
  delay?: number;
  /** Mirror the 3D tilt angle. */
  mirror?: boolean;
  /** Render flat without 3D perspective. */
  flat?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_ABOVE_AGENT: AfInspectAgent = {
  name: "Researcher",
  model: "Sonnet 5.5",
  status: "done",
  task: "Compare the pricing of five competitors",
  cost: "$0.18",
  time: "55s",
  avatar: CLAUDE_BURST_SVG,
  tools: [NOTION_ICON_SVG, SLACK_ICON_SVG],
};

const DEFAULT_MAIN_AGENT: AfInspectAgent = {
  name: "Coder",
  model: "GPT-6 Sol",
  status: "running",
  task: "Build the page and wire up checkout",
  cost: "$0.42",
  time: "48s",
  avatar: OPENAI_KNOT_SVG,
  tools: [GITHUB_ICON_SVG, STRIPE_ICON_SVG],
};

interface AgentMarkStep {
  name: string;
  ft: number;
  fh: number;
  rx: number;
  rw: number;
  padTop: number;
  padSide: number;
  edgeGap: number;
  last?: boolean;
}

const AGENT_STEPS: AgentMarkStep[] = [
  { name: "Header", ft: 0, fh: 42, rx: 10, rw: 236, padTop: 10, padSide: 10, edgeGap: 0 },
  { name: "Task", ft: 38, fh: 40, rx: 10, rw: 300, padTop: 6, padSide: 10, edgeGap: 0 },
  { name: "Meta", ft: 74, fh: 32, rx: 10, rw: 68, padTop: 6, padSide: 10, edgeGap: 0, last: true },
];

function renderAgentStatus(status: AfInspectAgent["status"]) {
  if (status === "done") {
    return (
      <span className="ui-iac__status" data-status="done">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 14L8.5 17.5L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        </svg>
        Done
      </span>
    );
  }
  if (status === "waiting") {
    return <span className="ui-iac__status" data-status="waiting">Waiting</span>;
  }
  return (
    <span className="ui-iac__status" data-status="running">
      <svg className="ui-iac__spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
      Running
    </span>
  );
}

/**
 * Tilted 3D design-mode inspector walking through the rows of a running agent card.
 */
export function AfInspectAgentCard(props: AfInspectAgentCardProps = {}) {
  const {
    agent = DEFAULT_MAIN_AGENT,
    above = DEFAULT_ABOVE_AGENT,
    playing = true,
    hold = 1600,
    delay = 600,
    mirror = false,
    flat = false,
    className,
    style,
  } = props;

  const mainWrapRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const row0Ref = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLParagraphElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [shown, setShown] = useState(() => !playing || delay <= 0);
  const [measured, setMeasured] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    steps: AgentMarkStep[];
  } | null>(null);

  useEffect(() => {
    const measure = () => {
      const wrap = mainWrapRef.current;
      const card = mainCardRef.current;
      const r0 = row0Ref.current;
      const r1 = row1Ref.current;
      const r2 = row2Ref.current;
      if (!wrap || !card || !r0 || !r1 || !r2) return;
      const x = card.offsetLeft;
      const y = card.offsetTop;
      const w = card.offsetWidth || 320;
      const h = card.offsetHeight || 110;
      const f0End = r0.offsetTop + r0.offsetHeight + 10;
      const f1Top = Math.max(0, r1.offsetTop - 6);
      const f1End = f1Top + r1.offsetHeight + 12;
      const f2Top = Math.max(0, r2.offsetTop - 6);
      const steps: AgentMarkStep[] = [
        {
          name: "Header",
          ft: 0,
          fh: f0End,
          rx: r0.offsetLeft,
          rw: Math.min(w - 20, 236),
          padTop: 10,
          padSide: 10,
          edgeGap: Math.max(0, f1Top - f0End),
        },
        {
          name: "Task",
          ft: f1Top,
          fh: r1.offsetHeight + 12,
          rx: r1.offsetLeft,
          rw: r1.offsetWidth,
          padTop: 6,
          padSide: 10,
          edgeGap: Math.max(0, f2Top - f1End),
        },
        {
          name: "Meta",
          ft: f2Top,
          fh: h - f2Top,
          rx: r2.offsetLeft,
          rw: Math.max(64, r2.offsetWidth),
          padTop: 6,
          padSide: 10,
          edgeGap: 0,
          last: true,
        },
      ];
      setMeasured({ x, y, w, h, steps });
    };
    measure();
  }, [agent]);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (!playing || mq?.matches) {
      setStepIdx(0);
      setShown(true);
      return;
    }
    let cancelled = false;
    let t0 = 0;
    let t1 = 0;
    let t2 = 0;
    const cycle = () => {
      setShown(true);
      t1 = window.setTimeout(() => {
        if (cancelled) return;
        setShown(false);
        t2 = window.setTimeout(() => {
          if (cancelled) return;
          setStepIdx((prev) => (prev + 1) % 3);
          cycle();
        }, 240);
      }, Math.max(500, hold));
    };
    if (delay > 0) {
      setShown(false);
      t0 = window.setTimeout(() => {
        if (!cancelled) cycle();
      }, delay);
    } else {
      cycle();
    }
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [playing, hold, delay]);

  const activeSteps = measured?.steps ?? AGENT_STEPS;
  const cur = activeSteps[stepIdx] ?? AGENT_STEPS[0];
  const mx = measured?.x ?? 10;
  const my = measured?.y ?? 22;
  const mw = measured?.w ?? 320;
  const mh = measured?.h ?? 110;

  return (
    <div
      className={className ? `ui-iac ${className}` : "ui-iac"}
      data-mirror={mirror ? "" : undefined}
      data-flat={flat ? "" : undefined}
      aria-hidden="true"
      style={style}
    >
      <div className="ui-iac__stage">
        <div className="ui-iac__main" ref={mainWrapRef}>
          {above ? (
            <div className="ui-iac__above">
              <div className="ui-iac__card" data-card="">
                <div className="ui-iac__top">
                  <span className="ui-iac__avatar">{above.avatar ?? CLAUDE_BURST_SVG}</span>
                  <span className="ui-iac__who">
                    <span className="ui-iac__name">{above.name}</span>
                    <span className="ui-iac__model">{above.model}</span>
                  </span>
                  {renderAgentStatus(above.status)}
                </div>
                <p className="ui-iac__task">
                  {above.tools && above.tools.length > 0 ? (
                    <span className="ui-iac__tools">
                      {above.tools.map((tl, idx) => (
                        <span key={idx} className="ui-iac__tool">
                          {tl}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {above.task}
                </p>
                <div className="ui-iac__meta">
                  <span className="ui-iac__cost">
                    {above.cost}
                    <span className="ui-iac__time"> · {above.time}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="ui-iac__card" data-card="" data-main="" ref={mainCardRef}>
            <div className="ui-iac__top" data-row="Header" data-order="0" ref={row0Ref}>
              <span className="ui-iac__avatar">{agent.avatar ?? OPENAI_KNOT_SVG}</span>
              <span className="ui-iac__who">
                <span className="ui-iac__name">{agent.name}</span>
                <span className="ui-iac__model">{agent.model}</span>
              </span>
              {renderAgentStatus(agent.status)}
            </div>
            <p className="ui-iac__task" data-row="Task" data-order="1" ref={row1Ref}>
              {agent.tools && agent.tools.length > 0 ? (
                <span className="ui-iac__tools">
                  {agent.tools.map((tl, idx) => (
                    <span key={idx} className="ui-iac__tool">
                      {tl}
                    </span>
                  ))}
                </span>
              ) : null}
              {agent.task}
            </p>
            <div className="ui-iac__meta" data-row="Meta" data-order="2" ref={row2Ref}>
              <span className="ui-iac__cost">
                {agent.cost}
                <span className="ui-iac__time"> · {agent.time}</span>
              </span>
            </div>
          </div>

          <div
            className="ui-iac__marks"
            style={
              {
                "--x": `${mx}px`,
                "--y": `${my}px`,
                "--w": `${mw}px`,
                "--h": `${mh}px`,
                "--cx": "0px",
                "--cy": "0px",
                "--cw": `${mw}px`,
                "--ch": `${mh}px`,
                "--ft": `${cur.ft}px`,
                "--fh": `${cur.fh}px`,
                "--rx": `${cur.rx}px`,
                "--rw": `${cur.rw}px`,
              } as CSSProperties
            }
          >
            <div
              className="ui-iac__select"
              data-shown={shown ? "" : undefined}
              data-last={cur.last ? "" : undefined}
            >
              <span className="ui-iac__frame">
                <span className="ui-iac__box" />
                <span className="ui-iac__tag">
                  {FRAME_TAG_ICON}
                  {cur.name}
                </span>
                <span className="ui-iac__handle ui-iac__handle--tl" />
                <span className="ui-iac__handle ui-iac__handle--tr" />
                <span className="ui-iac__handle ui-iac__handle--br" />
                <span className="ui-iac__handle ui-iac__handle--bl" />
                <span className="ui-iac__badge ui-iac__badge--blue ui-iac__badge--pad-top">{cur.padTop}</span>
                <span className="ui-iac__badge ui-iac__badge--blue ui-iac__badge--pad-side">{cur.padSide}</span>
              </span>
              <span className="ui-iac__guide" />
              <span className="ui-iac__badge ui-iac__badge--red ui-iac__badge--edge">{cur.edgeGap}</span>
              <svg className="ui-iac__cursor" viewBox="0 0 24 24">
                {CURSOR_HAND_SVG}
              </svg>
              <span className="ui-iac__size">
                W Fill <b>{Math.round(cur.rw)}px</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * 2. AfInspectComposer
 * ========================================================================== */

export interface AfInspectComposerProps {
  message?: string;
  above?: string | null;
  aboveMessage?: string;
  mode?: string;
  approval?: string;
  folderLabel?: string;
  appsLabel?: string;
  /** Walks the selection through the rows; false holds it on the message. */
  playing?: boolean;
  /** Milliseconds each row remains selected. */
  hold?: number;
  /** Initial delay before the first selection appears, in ms. */
  delay?: number;
  /** Mirror the 3D tilt angle (default true). */
  mirror?: boolean;
  /** Render flat without 3D perspective. */
  flat?: boolean;
  className?: string;
  style?: CSSProperties;
}

function ComposerAppsLogos({ prefix }: { prefix: string }) {
  return (
    <span className="ui-icp__logos">
      <svg viewBox="0 0 56.4108 44.8722" fill="none" aria-hidden="true">
        <path
          d="M44.2255 5.76727H56.4051V41.0239C56.4051 43.148 54.683 44.8701 52.5589 44.8701H46.1486C45.8961 44.8701 45.646 44.8204 45.4127 44.7237C45.1794 44.6271 44.9674 44.4854 44.7888 44.3069C44.6102 44.1283 44.4686 43.9163 44.3719 43.683C44.2753 43.4497 44.2255 43.1996 44.2255 42.947V5.76727Z"
          fill={`url(#${prefix}-gm-0)`}
        />
        <path
          d="M12.1796 5.76727H0V41.0239C0 43.148 1.72213 44.8701 3.84618 44.8701H10.2565C10.509 44.8701 10.7591 44.8204 10.9924 44.7237C11.2257 44.6271 11.4377 44.4854 11.6163 44.3069C11.7949 44.1283 11.9365 43.9163 12.0332 43.683C12.1298 43.4497 12.1796 43.1996 12.1796 42.947V5.76727Z"
          fill="#FC413D"
        />
        <path
          d="M10.0085 1.42778C7.43377 -0.736342 3.5924 -0.403647 1.42828 2.17105C-0.735843 4.74543 -0.403148 8.58681 2.17155 10.7512L26.5557 31.2479C27.0178 31.6362 27.602 31.8492 28.2056 31.8492C28.8091 31.8492 29.3934 31.6362 29.8554 31.2479L54.2396 10.7509C56.814 8.58681 57.1467 4.74543 54.9825 2.17073C52.8184 -0.403648 48.977 -0.736342 46.4027 1.42778L28.2054 16.724L10.0085 1.42778Z"
          fill={`url(#${prefix}-gm-1)`}
        />
        <defs>
          <linearGradient id={`${prefix}-gm-0`} x1="50.3153" y1="5.76727" x2="50.3153" y2="44.8701" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60D673" />
            <stop offset="0.17" stopColor="#42C868" />
            <stop offset="0.39" stopColor="#0EBC5F" />
            <stop offset="0.62" stopColor="#00A9BB" />
            <stop offset="0.86" stopColor="#3C90FF" />
            <stop offset="1" stopColor="#3186FF" />
          </linearGradient>
          <linearGradient id={`${prefix}-gm-1`} x1="0" y1="6.45153" x2="56.4107" y2="6.45153" gradientUnits="userSpaceOnUse">
            <stop offset="0.08" stopColor="#FF63A0" />
            <stop offset="0.3" stopColor="#FC413D" />
            <stop offset="0.65" stopColor="#FC413D" />
            <stop offset="0.72" stopColor="#FC5C30" />
            <stop offset="0.86" stopColor="#FEB10C" />
            <stop offset="0.96" stopColor="#FFDB0F" />
          </linearGradient>
        </defs>
      </svg>
      {SLACK_ICON_SVG}
      <svg viewBox="0 0 49.7096 59.6884" fill="none" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 45.9002L9.1618 38.8247C14.0602 45.1745 19.2307 48.1679 24.9455 48.1679C30.6603 48.1679 35.7401 45.2652 40.3663 38.9154L49.7096 45.8094C42.997 54.8805 34.6516 59.6882 24.9455 59.6882C15.3301 59.6882 6.89403 54.8805 0 45.9002Z"
          fill={`url(#${prefix}-cu-0)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M24.9535 15.3301L8.62558 29.3903L1.09657 20.5914L25.0442 0L48.8105 20.5914L41.1908 29.2996L24.9535 15.3301Z"
          fill={`url(#${prefix}-cu-1)`}
        />
        <defs>
          <linearGradient id={`${prefix}-cu-0`} x1="0" y1="49.2666" x2="49.75" y2="49.2666" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8930FD" />
            <stop offset="1" stopColor="#49CCF9" />
          </linearGradient>
          <linearGradient id={`${prefix}-cu-1`} x1="1.09231" y1="14.6901" x2="48.7603" y2="14.6901" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF02F0" />
            <stop offset="1" stopColor="#FFC800" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

const FOLDER_BLUE_SVG = (
  <svg viewBox="0 0 67 67" fill="none" aria-hidden="true">
    <path d="M11.17 15.35v15.36h44.67v-6.98c0-3.86-3.13-6.98-6.98-6.98H33.5l-3.93-5.89a5.58 5.58 0 0 0-4.64-2.49h-6.78c-3.86 0-6.98 3.13-6.98 6.98Z" fill="#00A1FF" />
    <path d="M33.5 16.75l-3.93-5.89a5.58 5.58 0 0 0-4.64-2.49h-6.78c-3.86 0-6.98 3.13-6.98 6.98v15.36h44.67v-6.98c0-3.86-3.13-6.98-6.98-6.98H33.5Zm0 0h-9.77" stroke="#00A1FF" strokeWidth="4.19" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.59 42.38c-1.05-5.26-1.57-7.89-.08-9.67l.31-.34c1.66-1.66 4.59-1.66 10.45-1.66h32.46c5.86 0 8.79 0 10.45 1.66l.31.34c1.49 1.78.97 4.41-.08 9.67-1.51 7.56-2.26 11.34-5.1 13.66l-.6.46c-3.01 2.13-7.23 2.13-15.66 2.13h-11.1c-8.43 0-12.64 0-15.66-2.13l-.6-.46c-2.84-2.32-3.6-6.1-5.1-13.66Z" fill="#3CC7FF" stroke="#3CC7FF" strokeWidth="4.19" />
  </svg>
);

function ComposerToolbar({ approval }: { approval: string }) {
  return (
    <>
      <span className="ui-icp__group">
        <span className="ui-icp__icon">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2.5c.28 0 .5.22.5.5v4.5H13a.5.5 0 0 1 0 1H8.5V13a.5.5 0 0 1-1 0V8.5H3a.5.5 0 0 1 0-1h4.5V3c0-.28.22-.5.5-.5Z" />
          </svg>
        </span>
        <span className="ui-icp__approval">
          <span className="ui-icp__approval-icon">
            <svg viewBox="0 0 68.155 68.155" fill="none" aria-hidden="true">
              <path d="M52.5305 32.6557V24.8463C52.5305 22.1016 54.7555 19.8766 57.5001 19.8766C60.2448 19.8766 62.4698 22.1016 62.4698 24.8463V42.027C62.4698 53.3194 53.3154 62.4735 42.0233 62.4735H34.2388M22.7127 39.7552L15.94 31.8537C14.8314 30.5602 13.2129 29.8159 11.5094 29.8159H11.1235C8.11379 29.8159 5.67395 32.2558 5.67395 35.2655C5.67395 36.3412 5.99241 37.393 6.58919 38.2881L16.4118 53.0221C20.3482 58.9269 26.9753 62.4735 34.0719 62.4735" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M52.534 24.1378V16.3284C52.534 13.5837 50.3091 11.3588 47.5644 11.3588C44.8197 11.3588 42.5948 13.5837 42.5948 16.3284V29.8174" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M42.5958 29.8198V10.6513C42.5958 7.90661 40.3708 5.68163 37.6262 5.68163C34.8815 5.68163 32.6565 7.90661 32.6565 10.6513V28.4" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M32.6576 28.3975V16.3284C32.6576 13.5837 30.4326 11.3588 27.6879 11.3588C24.9433 11.3588 22.7183 13.5837 22.7183 16.3284V39.7567" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {approval}
          <span className="ui-icp__chevron">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </span>
      <span className="ui-icp__group">
        <span className="ui-icp__icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 6.5C7 4.01472 9.01472 2 11.5 2C13.9853 2 16 4.01472 16 6.5V11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.5 19H11.0828C7.57267 19 4.57706 16.4623 4 13M11.5 19H11.9172C15.4273 19 18.4229 16.4623 19 13M11.5 19V22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="ui-icp__send">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5.5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </>
  );
}

interface ComposerMarkStep {
  name: string;
  ft: number;
  fh: number;
  rx: number;
  rw: number;
  padTop: number;
  padSide: number;
  edgeGap: number;
  other?: boolean;
  last?: boolean;
}

const COMPOSER_STEPS: ComposerMarkStep[] = [
  { name: "Message", ft: 4, fh: 60, rx: 14, rw: 292, padTop: 10, padSide: 10, edgeGap: 0 },
  { name: "Toolbar", ft: 58, fh: 48, rx: 10, rw: 300, padTop: 8, padSide: 10, edgeGap: 0, last: true },
  { name: "Footer", ft: -46, fh: 36, rx: 10, rw: 308, padTop: 5, padSide: 6, edgeGap: 10, other: true, last: true },
];

/**
 * Tilted 3D design-mode inspector walking through the rows of a chat composer.
 */
export function AfInspectComposer(props: AfInspectComposerProps = {}) {
  const {
    message = "Ask the agents to ship the new pricing page",
    above,
    aboveMessage = "Summarize the pricing research for the team",
    mode,
    approval = "Auto",
    folderLabel = "Work in a folder",
    appsLabel = "Connect apps",
    playing = true,
    hold = 1600,
    delay = 600,
    mirror = true,
    flat = false,
    className,
    style,
  } = props;

  const resolvedAbove = above === null ? null : (above ?? aboveMessage);
  const resolvedApproval = mode ?? approval;

  const uid = useId().replace(/:/g, "_");
  const mainBodyRef = useRef<HTMLDivElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [shown, setShown] = useState(() => !playing || delay <= 0);
  const [boxMetrics, setBoxMetrics] = useState({ x: 0, y: 22, w: 320, h: 142 });

  useEffect(() => {
    const el = mainBodyRef.current;
    if (!el) return;
    setBoxMetrics({
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth || 320,
      h: el.offsetHeight || 142,
    });
  }, [message]);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (!playing || mq?.matches) {
      setStepIdx(0);
      setShown(true);
      return;
    }
    let cancelled = false;
    let t0 = 0;
    let t1 = 0;
    let t2 = 0;
    const cycle = () => {
      setShown(true);
      t1 = window.setTimeout(() => {
        if (cancelled) return;
        setShown(false);
        t2 = window.setTimeout(() => {
          if (cancelled) return;
          setStepIdx((prev) => (prev + 1) % COMPOSER_STEPS.length);
          cycle();
        }, 240);
      }, Math.max(500, hold));
    };
    if (delay > 0) {
      setShown(false);
      t0 = window.setTimeout(() => {
        if (!cancelled) cycle();
      }, delay);
    } else {
      cycle();
    }
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [playing, hold, delay]);

  const cur = COMPOSER_STEPS[stepIdx] ?? COMPOSER_STEPS[0];

  return (
    <div
      className={className ? `ui-icp ${className}` : "ui-icp"}
      data-mirror={mirror ? "" : undefined}
      data-flat={flat ? "" : undefined}
      aria-hidden="true"
      style={style}
    >
      <div className="ui-icp__stage">
        <div className="ui-icp__main">
          {resolvedAbove !== null ? (
            <div className="ui-icp__above">
              <div className="ui-icp__body" data-card="">
                <div className="ui-icp__write">
                  <div className="ui-icp__field">
                    <span className="ui-icp__message">{resolvedAbove}</span>
                  </div>
                  <div className="ui-icp__tools">
                    <ComposerToolbar approval={resolvedApproval} />
                  </div>
                </div>
                <div className="ui-icp__foot" data-row="Footer" data-order="2">
                  <span className="ui-icp__row">
                    <span className="ui-icp__folder">{FOLDER_BLUE_SVG}</span>
                    {folderLabel}
                  </span>
                  <span className="ui-icp__row ui-icp__row--apps">
                    {appsLabel}
                    <ComposerAppsLogos prefix={`ui-icp-${uid}-a`} />
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="ui-icp__body" data-card="" data-main="" ref={mainBodyRef}>
            <div className="ui-icp__write">
              <div className="ui-icp__field" data-row="Message" data-order="0">
                <span className="ui-icp__message">{message}</span>
              </div>
              <div className="ui-icp__tools" data-row="Toolbar" data-order="1">
                <ComposerToolbar approval={resolvedApproval} />
              </div>
            </div>
            <div className="ui-icp__foot">
              <span className="ui-icp__row">
                <span className="ui-icp__folder">{FOLDER_BLUE_SVG}</span>
                {folderLabel}
              </span>
              <span className="ui-icp__row ui-icp__row--apps">
                {appsLabel}
                <ComposerAppsLogos prefix={`ui-icp-${uid}-m`} />
              </span>
            </div>
          </div>

          <div
            className="ui-icp__marks"
            style={
              {
                "--x": `${boxMetrics.x}px`,
                "--y": `${boxMetrics.y}px`,
                "--w": `${boxMetrics.w}px`,
                "--h": `${boxMetrics.h}px`,
                "--cx": cur.other ? "-24px" : "0px",
                "--cy": cur.other ? "-56px" : "0px",
                "--cw": `${boxMetrics.w}px`,
                "--ch": `${boxMetrics.h}px`,
                "--ft": `${cur.ft}px`,
                "--fh": `${cur.fh}px`,
                "--rx": `${cur.rx}px`,
                "--rw": `${cur.rw}px`,
              } as CSSProperties
            }
          >
            <div
              className="ui-icp__select"
              data-shown={shown ? "" : undefined}
              data-other={cur.other ? "" : undefined}
              data-last={cur.last ? "" : undefined}
            >
              <span className="ui-icp__frame">
                <span className="ui-icp__box" />
                <span className="ui-icp__tag">
                  {FRAME_TAG_ICON}
                  {cur.name}
                </span>
                <span className="ui-icp__handle ui-icp__handle--tl" />
                <span className="ui-icp__handle ui-icp__handle--tr" />
                <span className="ui-icp__handle ui-icp__handle--br" />
                <span className="ui-icp__handle ui-icp__handle--bl" />
                <span className="ui-icp__badge ui-icp__badge--blue ui-icp__badge--pad-top">{cur.padTop}</span>
                <span className="ui-icp__badge ui-icp__badge--blue ui-icp__badge--pad-side">{cur.padSide}</span>
              </span>
              <span className="ui-icp__guide" />
              <span className="ui-icp__badge ui-icp__badge--red ui-icp__badge--edge">{cur.edgeGap}</span>
              <svg className="ui-icp__cursor" viewBox="0 0 24 24">
                {CURSOR_HAND_SVG}
              </svg>
              <span className="ui-icp__size">
                W Fill <b>{cur.rw}px</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
