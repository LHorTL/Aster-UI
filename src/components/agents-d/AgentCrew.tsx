import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfPortal } from "../../primitives/layer";
import { ModelBrandMark } from "../agents-c/_marks";

export type CrewAgentStatus = "active" | "idle" | "paused" | "waiting" | "done" | "failed";

export type CrewSteerAction = "message" | "pause" | "stop" | "resume" | "approve" | "decline" | "retry";

export interface CrewTool {
  logo?: ReactNode;
  name: string;
  icon?: string;
}

export interface CrewLastHandoff {
  from: string;
  text: string;
}

export interface CrewAgent {
  id: string;
  name: string;
  model?: string;
  modelLogo?: ReactNode;
  logo?: ReactNode;
  status: CrewAgentStatus;
  activity: string;
  task?: string;
  context?: number;
  contextLimit?: number;
  tools?: CrewTool[];
  last?: CrewLastHandoff;
  started?: number;
  ended?: number;
  cost?: number;
  children?: CrewAgent[];
}

export interface CrewHandoff {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface CrewProject {
  id: string;
  name: string;
  working?: number;
  needsYou?: number;
}

export interface AfAgentCrewProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onSelect"> {
  /** Lead agent root; children render side-by-side below, grandchildren hang as compact helper cards. */
  root?: CrewAgent;
  /** Live handoff events; each new id sends a travelling light along connectors and lights the destination card. */
  handoffs?: CrewHandoff[];
  /** Header title when `projects` is not provided. */
  title?: string;
  /** Switchable project list shown in the top-left folder switcher. */
  projects?: CrewProject[];
  /** Controlled active project id. */
  project?: string;
  /** Called when a project is chosen in the switcher. */
  onProjectChange?: (projectId: string) => void;
  /** Steering callback for Message, Pause, Stop, Resume, Approve, Decline, Retry. */
  onSteer?: (agent: CrewAgent, action: CrewSteerAction, message?: string) => void;
  /** Called when an agent card is clicked or activated with Enter/Space. */
  onSelect?: (agent: CrewAgent) => void;
  /** Formats dollar cost in the details dialog. */
  formatCost?: (amount: number) => string;
  /** Extra class name on the root element. */
  className?: string;
  /** Inline style overrides. */
  style?: CSSProperties;
}

export type AfAgentCrewPatternProps = AfAgentCrewProps;

const SUB_AGENT_PALETTE = [
  "var(--af-acrc-purple)",
  "var(--af-acrc-cyan)",
  "var(--af-acrc-green)",
  "var(--af-acrc-amber)",
  "var(--af-acrc-rose)",
];

const PIXEL_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

const NAMED_PATTERNS: Record<string, number[]> = {
  lead: [0, 0, 0, 1, 1, 1, 1, 0, 1],
  researcher: [1, 1, 1, 0, 1, 0, 1, 0, 1],
  "web-search": [0, 1, 0, 1, 1, 1, 0, 1, 1],
  coder: [1, 0, 1, 1, 0, 1, 0, 1, 0],
  linter: [0, 0, 0, 1, 0, 1, 0, 0, 1],
  "test-runner": [1, 0, 1, 1, 1, 0, 0, 1, 0],
  reviewer: [0, 1, 0, 1, 1, 0, 1, 0, 1],
  "docs-writer": [1, 1, 1, 0, 1, 0, 1, 1, 0],
};

const FALLBACK_PATTERNS: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 0, 0, 1, 0],
];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ---------------- Authentic Brand & Tool Logos ---------------- */

function ClaudeStarburst() {
  return (
    <svg viewBox="0 0 1200 1200" aria-hidden="true">
      <path
        fill="#D97757"
        d="M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z"
      />
    </svg>
  );
}

function renderModelLogo(model: string | undefined, explicit?: ReactNode): ReactNode {
  if (explicit) return explicit;
  if (!model) return null;
  const lower = model.toLowerCase();
  if (lower.includes("claude") || lower.includes("opus") || lower.includes("sonnet") || lower.includes("haiku")) {
    return <ClaudeStarburst />;
  }
  return <ModelBrandMark model={model} size={13} />;
}

function renderToolSvg(tool: CrewTool): ReactNode {
  if (tool.logo) return tool.logo;
  const key = (tool.icon || tool.name).toLowerCase();
  if (key.includes("linear")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#5E6AD2" />
        <path
          fill="#ffffff"
          d="M6.4 7.2A7.4 7.4 0 0 1 12 4.6c4.09 0 7.4 3.31 7.4 7.4 0 2.24-.99 4.25-2.57 5.61L6.4 7.2ZM5.68 8.21l10.11 10.11c-.33.2-.68.38-1.05.53L5.15 9.26c.15-.37.33-.72.53-1.05Zm-.92 2.21 8.82 8.82c-.44.1-.9.17-1.37.19L4.57 11.79c.02-.47.09-.93.19-1.37Zm-.1 3.01 5.91 5.91a7.42 7.42 0 0 1-5.91-5.91Z"
        />
      </svg>
    );
  }
  if (key.includes("github") || key.includes("git")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--af-acrc-strong)" }}>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }
  if (key.includes("notion") || key.includes("doc")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--af-acrc-strong)" }}>
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    );
  }
  if (key.includes("vercel") || key.includes("deploy")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--af-acrc-strong)" }}>
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    );
  }
  if (key.includes("postgres") || key.includes("db") || key.includes("sql") || key.includes("database")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#336791" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </svg>
    );
  }
  if (key.includes("slack")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#E01E5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
        <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
        <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CrewPixelMark({ id, busy }: { id: string; busy: boolean }) {
  const mask = useMemo(() => {
    const clean = id.toLowerCase();
    if (NAMED_PATTERNS[clean]) return NAMED_PATTERNS[clean];
    for (const [k, pat] of Object.entries(NAMED_PATTERNS)) {
      if (clean.includes(k)) return pat;
    }
    return FALLBACK_PATTERNS[hashSeed(id) % FALLBACK_PATTERNS.length];
  }, [id]);

  return (
    <span className="af-acrc__mark" data-busy={busy ? "" : undefined} aria-hidden="true">
      {mask.map((on, idx) => (
        <i
          key={idx}
          data-on={on ? "" : undefined}
          style={{ animationDelay: `${PIXEL_DELAYS[idx]}ms` }}
        />
      ))}
    </span>
  );
}

/* ---------------- Formatting Helpers ---------------- */

function clampContext(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatTokenShort(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0";
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m >= 10 ? Math.round(m) : Number(m.toFixed(1))}M`;
  }
  if (tokens >= 1000) {
    const k = Math.round(tokens / 1000);
    return `${k}k`;
  }
  return String(Math.round(tokens));
}

function formatContextPair(ratio?: number, limit?: number): string {
  const r = clampContext(ratio);
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    const used = Math.round(r * limit);
    return `${formatTokenShort(used)} / ${formatTokenShort(limit)}`;
  }
  return `${Math.round(r * 100)}%`;
}

function defaultFormatCost(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return `$${amount.toFixed(2)}`;
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  if (days > 0) {
    const hrs = Math.floor((totalSec % 86400) / 3600);
    return `${days}d ${hrs}h`;
  }
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}

function statusLabel(status: CrewAgentStatus): string {
  switch (status) {
    case "active":
      return "Working";
    case "idle":
      return "Idle";
    case "paused":
      return "Paused";
    case "waiting":
      return "Needs you";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
  }
}

function StatusGlyph({ status }: { status: CrewAgentStatus }) {
  if (status === "active") {
    return (
      <svg className="af-acrc__spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5a8.5 8.5 0 1 1-6.5 3.04"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.6"
        />
      </svg>
    );
  }
  if (status === "paused") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 6.5V17.5M15 6.5V17.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "done") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.5 12.5L10 17L18.5 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 7.5V13M12 16.5H12.01" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

/* ---------------- Official Multi-Project Demo Data ---------------- */

const DEMO_PROJECTS: CrewProject[] = [
  { id: "checkout", name: "Fix the checkout crash", working: 1 },
  { id: "launch", name: "Write the launch post", working: 1 },
  { id: "postgres", name: "Migrate to Postgres 17", working: 2 },
];

function buildInitialDemoCrews(now: number): Record<string, CrewAgent> {
  return {
    checkout: {
      id: "lead",
      name: "Lead",
      model: "Claude Opus",
      status: "active",
      activity: "Planning the fix",
      task: "Fix the checkout crash on empty carts, get it reviewed and merged",
      context: 0.18,
      contextLimit: 200_000,
      started: now - 14_000,
      cost: 0.18,
      tools: [{ name: "Linear" }, { name: "GitHub" }],
      children: [
        {
          id: "researcher",
          name: "Researcher",
          model: "Claude Sonnet",
          status: "idle",
          activity: "Waiting for work",
          task: "Find where and why empty carts crash the checkout",
          context: 0.04,
          contextLimit: 200_000,
          cost: 0.03,
          tools: [{ name: "Linear" }, { name: "Notion" }],
          children: [
            {
              id: "web-search",
              name: "Web search",
              model: "Claude Haiku",
              status: "idle",
              activity: "Idle",
              task: "Look for known issues with empty payment sessions",
              context: 0.02,
              contextLimit: 64_000,
              cost: 0.004,
            },
          ],
        },
        {
          id: "coder",
          name: "Coder",
          model: "Claude Sonnet",
          status: "idle",
          activity: "Waiting for work",
          task: "Guard empty carts in cart.ts, add tests and open a pull request",
          context: 0.06,
          contextLimit: 200_000,
          cost: 0.04,
          tools: [{ name: "GitHub" }, { name: "Vercel" }],
          children: [
            {
              id: "linter",
              name: "Linter",
              model: "Claude Haiku",
              status: "idle",
              activity: "Idle",
              task: "Run ESLint and strict type checks on touched checkout files",
              context: 0.03,
              contextLimit: 32_000,
              cost: 0.003,
            },
            {
              id: "test-runner",
              name: "Test runner",
              model: "Claude Haiku",
              status: "idle",
              activity: "Idle",
              task: "Run unit and cart checkout integration suites",
              context: 0.05,
              contextLimit: 64_000,
              cost: 0.008,
            },
          ],
        },
        {
          id: "reviewer",
          name: "Reviewer",
          model: "Claude Opus",
          status: "idle",
          activity: "Waiting for work",
          task: "Audit edge cases, verify test coverage and approve the PR",
          context: 0.03,
          contextLimit: 200_000,
          cost: 0.02,
          tools: [{ name: "GitHub" }],
          children: [
            {
              id: "docs-writer",
              name: "Docs writer",
              model: "Claude Haiku",
              status: "idle",
              activity: "Idle",
              task: "Update changelog and storefront cart API notes",
              context: 0.05,
              contextLimit: 128_000,
              cost: 0.006,
            },
          ],
        },
      ],
    },
    launch: {
      id: "launch-lead",
      name: "Lead",
      model: "Claude Opus",
      status: "active",
      activity: "Shaping the outline",
      task: "Draft the v2.4 launch post with real benchmarks and customer quotes",
      context: 0.24,
      contextLimit: 200_000,
      started: now - 42_000,
      cost: 0.28,
      tools: [{ name: "Notion" }, { name: "Linear" }],
      children: [
        {
          id: "launch-researcher",
          name: "Researcher",
          model: "Claude Sonnet",
          status: "done",
          activity: "Gathered release metrics",
          task: "Collect latency wins and migration numbers from shipped issues",
          context: 0.31,
          contextLimit: 200_000,
          started: now - 90_000,
          ended: now - 20_000,
          cost: 0.14,
          tools: [{ name: "Linear" }, { name: "GitHub" }],
          last: { from: "Lead", text: "Pull latency numbers from v2.4" },
        },
        {
          id: "launch-writer",
          name: "Writer",
          model: "Claude Opus",
          status: "idle",
          activity: "Waiting for outline",
          task: "Write the announcement post in house voice with code samples",
          context: 0.11,
          contextLimit: 200_000,
          cost: 0.09,
          tools: [{ name: "Notion" }],
          children: [
            {
              id: "launch-fact",
              name: "Fact checker",
              model: "Claude Haiku",
              status: "idle",
              activity: "Idle",
              task: "Cross-check every benchmark number against merged commits",
              context: 0.04,
              contextLimit: 64_000,
              cost: 0.005,
            },
          ],
        },
        {
          id: "launch-editor",
          name: "Editor",
          model: "Claude Sonnet",
          status: "waiting",
          activity: "Approve headline choice",
          task: "Tighten copy and pick the final headline with you",
          context: 0.16,
          contextLimit: 200_000,
          cost: 0.07,
          tools: [{ name: "Notion" }],
          last: { from: "Lead", text: "Two headline options ready" },
        },
      ],
    },
    postgres: {
      id: "pg-lead",
      name: "Lead",
      model: "Claude Opus",
      status: "active",
      activity: "Coordinating cutover",
      task: "Upgrade staging and production clusters to Postgres 17 with zero downtime",
      context: 0.34,
      contextLimit: 200_000,
      started: now - 115_000,
      cost: 0.54,
      tools: [{ name: "Linear" }, { name: "GitHub" }, { name: "Postgres" }],
      children: [
        {
          id: "pg-schema",
          name: "Schema auditor",
          model: "Claude Sonnet",
          status: "done",
          activity: "Verified 42 migrations",
          task: "Check extension compatibility and index changes for PG 17",
          context: 0.48,
          contextLimit: 200_000,
          started: now - 180_000,
          ended: now - 55_000,
          cost: 0.22,
          tools: [{ name: "Postgres" }, { name: "GitHub" }],
        },
        {
          id: "pg-rehearsal",
          name: "Rehearsal runner",
          model: "Claude Sonnet",
          status: "active",
          activity: "Replaying logical replica",
          task: "Run dual-write rehearsal on staging snapshot and measure lag",
          context: 0.62,
          contextLimit: 200_000,
          started: now - 68_000,
          cost: 0.31,
          tools: [{ name: "Postgres" }, { name: "Vercel" }],
          last: { from: "Lead", text: "Verify replication lag < 50ms" },
          children: [
            {
              id: "pg-bench",
              name: "Query bench",
              model: "Claude Haiku",
              status: "idle",
              activity: "98.4% within budget",
              task: "Compare p99 query plans between PG 15 and PG 17",
              context: 0.19,
              contextLimit: 64_000,
              cost: 0.02,
            },
          ],
        },
        {
          id: "pg-rollback",
          name: "Rollback guard",
          model: "Claude Opus",
          status: "idle",
          activity: "Standing by",
          task: "Monitor error rates and hold instant failover script ready",
          context: 0.09,
          contextLimit: 200_000,
          cost: 0.06,
          tools: [{ name: "GitHub" }],
        },
      ],
    },
  };
}

interface DemoStep {
  from: string;
  to: string;
  label: string;
  patchFrom?: Partial<CrewAgent>;
  patchTo: Partial<CrewAgent>;
}

const CHECKOUT_DEMO_STEPS: DemoStep[] = [
  {
    from: "lead",
    to: "researcher",
    label: "Find where empty carts crash",
    patchFrom: { status: "active", activity: "Delegating", context: 0.22 },
    patchTo: {
      status: "active",
      activity: "Reading the bug report",
      context: 0.16,
      cost: 0.1,
      last: { from: "Lead", text: "Find where empty carts crash" },
    },
  },
  {
    from: "researcher",
    to: "web-search",
    label: "Check empty payment sessions",
    patchTo: {
      status: "active",
      activity: "Searching Stripe session docs",
      context: 0.18,
      cost: 0.01,
      last: { from: "Researcher", text: "Check empty payment sessions" },
    },
  },
  {
    from: "web-search",
    to: "researcher",
    label: "line_items cannot be empty",
    patchFrom: { status: "done", activity: "Found Stripe constraint", context: 0.24 },
    patchTo: {
      status: "done",
      activity: "Found unguarded items[0] in cart.ts",
      context: 0.28,
      last: { from: "Web search", text: "line_items cannot be empty" },
    },
  },
  {
    from: "lead",
    to: "coder",
    label: "Guard empty carts in cart.ts",
    patchFrom: { status: "idle", activity: "Waiting on patch", context: 0.26 },
    patchTo: {
      status: "active",
      activity: "Editing cart.ts",
      context: 0.38,
      cost: 0.14,
      last: { from: "Lead", text: "Guard empty carts in cart.ts" },
    },
  },
  {
    from: "coder",
    to: "test-runner",
    label: "Run cart.test.ts",
    patchTo: {
      status: "active",
      activity: "Running 14 checkout tests",
      context: 0.29,
      cost: 0.02,
      last: { from: "Coder", text: "Run cart.test.ts" },
    },
  },
  {
    from: "coder",
    to: "reviewer",
    label: "Review PR #418",
    patchFrom: { status: "done", activity: "Opened PR #418", context: 0.46 },
    patchTo: {
      status: "active",
      activity: "Reviewing diff in PR #418",
      context: 0.21,
      cost: 0.11,
      last: { from: "Coder", text: "Review PR #418" },
    },
  },
];

function updateTreeAgent(
  node: CrewAgent,
  targetId: string,
  updater: (prev: CrewAgent) => CrewAgent,
): CrewAgent {
  if (node.id === targetId) return updater(node);
  if (!node.children?.length) return node;
  let changed = false;
  const nextChildren = node.children.map((ch) => {
    const updated = updateTreeAgent(ch, targetId, updater);
    if (updated !== ch) changed = true;
    return updated;
  });
  return changed ? { ...node, children: nextChildren } : node;
}

/* ---------------- Flattening & Graph Path Helpers ---------------- */

interface FlatCrewNode {
  agent: CrewAgent;
  depth: number;
  parentId: string | null;
  color: string;
  small: boolean;
}

function flattenCrew(root: CrewAgent): FlatCrewNode[] {
  const out: FlatCrewNode[] = [];
  const walk = (node: CrewAgent, depth: number, parentId: string | null, branchColor: string) => {
    const color = depth === 0 ? "var(--af-acrc-blue)" : branchColor;
    out.push({
      agent: node,
      depth,
      parentId,
      color,
      small: depth >= 2,
    });
    node.children?.forEach((child, idx) => {
      const nextColor =
        depth === 0 ? SUB_AGENT_PALETTE[idx % SUB_AGENT_PALETTE.length] : color;
      walk(child, depth + 1, node.id, nextColor);
    });
  };
  walk(root, 0, null, "var(--af-acrc-blue)");
  return out;
}

function findHopPath(
  flat: FlatCrewNode[],
  fromId: string,
  toId: string,
): Array<{ edgeKey: string; reverse: boolean; targetId: string; incomingEdge: "top" | "bottom" | "left" }> {
  if (fromId === toId) return [];
  const byId = new Map(flat.map((f) => [f.agent.id, f]));
  if (!byId.has(fromId) || !byId.has(toId)) return [];

  const ancestorsOf = (startId: string): string[] => {
    const chain: string[] = [];
    let cur: string | null = startId;
    while (cur) {
      chain.push(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
    return chain;
  };

  const aChain = ancestorsOf(fromId);
  const bChain = ancestorsOf(toId);
  const bSet = new Set(bChain);
  const lca = aChain.find((id) => bSet.has(id));
  if (!lca) return [];

  const hops: Array<{
    edgeKey: string;
    reverse: boolean;
    targetId: string;
    incomingEdge: "top" | "bottom" | "left";
  }> = [];

  let cur = fromId;
  while (cur !== lca) {
    const parentId = byId.get(cur)!.parentId!;
    hops.push({
      edgeKey: `${parentId}->${cur}`,
      reverse: true,
      targetId: parentId,
      incomingEdge: "bottom",
    });
    cur = parentId;
  }

  const downChain: string[] = [];
  let walk = toId;
  while (walk !== lca) {
    downChain.push(walk);
    walk = byId.get(walk)!.parentId!;
  }
  downChain.reverse();

  let prev = lca;
  for (const next of downChain) {
    const nextNode = byId.get(next)!;
    hops.push({
      edgeKey: `${prev}->${next}`,
      reverse: false,
      targetId: next,
      incomingEdge: nextNode.depth >= 2 ? "left" : "top",
    });
    prev = next;
  }

  return hops;
}

interface MeasuredWire {
  key: string;
  parentId: string;
  childId: string;
  d: string;
  color: string;
  dotX: number;
  dotY: number;
}

interface MeasuredJointDot {
  id: string;
  cx: number;
  cy: number;
  color: string;
  rest: boolean;
}

interface ActivePulse {
  uid: string;
  edgeKey: string;
  reverse: boolean;
  color: string;
}

interface FloorGlow {
  uid: string;
  edge: "top" | "bottom" | "left";
}

/* ---------------- Gradient Floor Component ---------------- */

function CrewGradientFloor({ edge }: { edge: "top" | "bottom" | "left" }) {
  const uid = useId().replace(/:/g, "");
  return (
    <span className="af-acrc__got" data-edge={edge} aria-hidden="true">
      <span className="af-acrc__floor">
        <span className="af-acrc__gf af-acrc__gf--color">
          <span className="af-acrc__gf-bleed">
            <svg viewBox="0 0 256 96" preserveAspectRatio="none">
              <defs>
                <radialGradient id={`acrc-gfc-${uid}`} cx="50%" cy="85%" r="65%">
                  <stop offset="0%" stopColor="var(--af-acrc-floor-2)" />
                  <stop offset="55%" stopColor="var(--af-acrc-floor-1)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <ellipse cx="128" cy="76" rx="124" ry="52" fill={`url(#acrc-gfc-${uid})`} />
            </svg>
          </span>
        </span>
        <span className="af-acrc__gf af-acrc__gf--light">
          <span className="af-acrc__gf-bleed">
            <svg viewBox="0 0 256 96" preserveAspectRatio="none">
              <defs>
                <radialGradient id={`acrc-gfl-${uid}`} cx="50%" cy="90%" r="55%">
                  <stop offset="0%" stopColor="var(--af-acrc-floor-3)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <ellipse cx="128" cy="82" rx="96" ry="38" fill={`url(#acrc-gfl-${uid})`} />
            </svg>
          </span>
        </span>
      </span>
    </span>
  );
}

/* ---------------- Main Component ---------------- */

export function AfAgentCrew({
  root: rootProp,
  handoffs: handoffsProp,
  title,
  projects: projectsProp,
  project: projectProp,
  onProjectChange,
  onSteer,
  onSelect,
  formatCost = defaultFormatCost,
  className,
  style,
  ...restProps
}: AfAgentCrewProps) {
  const isDemo = !rootProp;
  const mountTimeRef = useRef<number>(Date.now());

  const [demoCrews, setDemoCrews] = useState<Record<string, CrewAgent>>(() =>
    buildInitialDemoCrews(mountTimeRef.current),
  );
  const [internalProject, setInternalProject] = useState<string>("checkout");
  const [demoHandoffs, setDemoHandoffs] = useState<CrewHandoff[]>([]);

  const activeProjects = projectsProp ?? (isDemo ? DEMO_PROJECTS : undefined);
  const currentProjectId = projectProp ?? internalProject;

  const activeRoot = useMemo<CrewAgent>(() => {
    if (rootProp) return rootProp;
    return demoCrews[currentProjectId] ?? demoCrews.checkout;
  }, [rootProp, demoCrews, currentProjectId]);

  const activeHandoffs = handoffsProp ?? demoHandoffs;
  const flatNodes = useMemo(() => flattenCrew(activeRoot), [activeRoot]);
  const flatById = useMemo(() => new Map(flatNodes.map((n) => [n.agent.id, n])), [flatNodes]);

  // Live ticker when any agent is actively working without an `ended` timestamp
  const hasRunning = useMemo(
    () => flatNodes.some((n) => n.agent.status === "active"),
    [flatNodes],
  );
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!hasRunning) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  // Built-in realistic demo handoff loop when `root` is omitted
  const demoStepRef = useRef(0);
  useEffect(() => {
    if (!isDemo || currentProjectId !== "checkout") return;
    const timer = window.setInterval(() => {
      const idx = demoStepRef.current % CHECKOUT_DEMO_STEPS.length;
      demoStepRef.current += 1;
      const step = CHECKOUT_DEMO_STEPS[idx];
      const ts = Date.now();

      setDemoCrews((prev) => {
        if (idx === 0 && demoStepRef.current > 1) {
          const fresh = buildInitialDemoCrews(ts);
          let resetTree = fresh.checkout;
          if (step.patchFrom) {
            resetTree = updateTreeAgent(resetTree, step.from, (a) => ({ ...a, ...step.patchFrom }));
          }
          resetTree = updateTreeAgent(resetTree, step.to, (a) => ({
            ...a,
            started: a.started ?? ts,
            ...step.patchTo,
          }));
          return { ...prev, checkout: resetTree };
        }
        let nextTree = prev.checkout;
        if (step.patchFrom) {
          nextTree = updateTreeAgent(nextTree, step.from, (a) => ({ ...a, ...step.patchFrom }));
        }
        nextTree = updateTreeAgent(nextTree, step.to, (a) => ({
          ...a,
          started: a.started ?? ts,
          ...step.patchTo,
        }));
        return { ...prev, checkout: nextTree };
      });

      setDemoHandoffs((prev) => [
        ...prev.slice(-8),
        {
          id: `demo-ho-${demoStepRef.current}`,
          from: step.from,
          to: step.to,
          label: step.label,
        },
      ]);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [isDemo, currentProjectId]);

  // Container width measurement for wide vs narrow indented layout
  const rootElRef = useRef<HTMLElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isWide, setIsWide] = useState(true);

  const subAgents = activeRoot.children ?? [];
  const useWideTree = isWide && subAgents.length > 0 && subAgents.length <= 3;

  useIsomorphicLayoutEffect(() => {
    const el = rootElRef.current;
    if (!el) return;
    const check = () => {
      const w = el.clientWidth;
      if (w > 0) setIsWide(w >= 620);
    };
    check();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(check);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  // Measure exact SVG rounded connectors and joint circles
  const [svgBox, setSvgBox] = useState<{ w: number; h: number }>({ w: 760, h: 462 });
  const [wires, setWires] = useState<MeasuredWire[]>([]);
  const [dots, setDots] = useState<MeasuredJointDot[]>([]);

  const measureConnectors = useCallback(() => {
    const treeEl = treeRef.current;
    if (!treeEl) return;
    const tRect = treeEl.getBoundingClientRect();
    if (tRect.width <= 0 || tRect.height <= 0) return;

    const nextWires: MeasuredWire[] = [];
    const dotMap = new Map<string, MeasuredJointDot>();

    for (const node of flatNodes) {
      if (!node.parentId) continue;
      const parentInfo = flatById.get(node.parentId);
      const pEl = cardRefs.current.get(node.parentId);
      const cEl = cardRefs.current.get(node.agent.id);
      if (!parentInfo || !pEl || !cEl) continue;

      const pRect = pEl.getBoundingClientRect();
      const cRect = cEl.getBoundingClientRect();

      if (useWideTree && node.depth === 1) {
        // Lead bottom-center -> rounded orthogonal elbow -> sub-agent top-center
        const x0 = pRect.left - tRect.left + pRect.width / 2;
        const y0 = pRect.bottom - tRect.top;
        const x1 = cRect.left - tRect.left + cRect.width / 2;
        const y1 = cRect.top - tRect.top;
        const midY = y0 + Math.max(12, (y1 - y0) * 0.41);

        let d: string;
        if (Math.abs(x1 - x0) < 2) {
          d = `M${x0} ${y0}V${y1}`;
        } else {
          const r = Math.min(8, Math.abs(x1 - x0) / 2, Math.max(2, (midY - y0) / 2));
          const dir = x1 > x0 ? 1 : -1;
          d = `M${x0} ${y0}V${midY - r}Q${x0} ${midY} ${x0 + dir * r} ${midY}H${x1 - dir * r}Q${x1} ${midY} ${x1} ${midY + r}V${y1}`;
        }

        nextWires.push({
          key: `${node.parentId}->${node.agent.id}`,
          parentId: node.parentId,
          childId: node.agent.id,
          d,
          color: parentInfo.color,
          dotX: x0,
          dotY: y0,
        });

        if (!dotMap.has(node.parentId)) {
          dotMap.set(node.parentId, {
            id: node.parentId,
            cx: x0,
            cy: y0,
            color: parentInfo.color,
            rest: parentInfo.agent.status !== "active",
          });
        }
      } else {
        // Left-rail vertical drop from parent bottom-left + rounded L-hook into helper left edge
        const x0 = pRect.left - tRect.left + 25;
        const y0 = pRect.bottom - tRect.top;
        const x1 = cRect.left - tRect.left;
        const y1 = cRect.top - tRect.top + cRect.height / 2;
        const r = Math.min(3.5, Math.max(1.5, Math.abs(x1 - x0) / 2), Math.max(1.5, (y1 - y0) / 2));
        const d = `M${x0} ${y0}V${y1 - r}Q${x0} ${y1} ${x0 + r} ${y1}H${x1}`;

        nextWires.push({
          key: `${node.parentId}->${node.agent.id}`,
          parentId: node.parentId,
          childId: node.agent.id,
          d,
          color: parentInfo.color,
          dotX: x0,
          dotY: y0,
        });

        const dotKey = `${node.parentId}-rail`;
        if (!dotMap.has(dotKey)) {
          dotMap.set(dotKey, {
            id: dotKey,
            cx: x0,
            cy: y0,
            color: parentInfo.color,
            rest: parentInfo.agent.status !== "active",
          });
        }
      }
    }

    setSvgBox({ w: Math.round(tRect.width), h: Math.round(tRect.height) });
    setWires(nextWires);
    setDots(Array.from(dotMap.values()));
  }, [flatNodes, flatById, useWideTree]);

  useIsomorphicLayoutEffect(() => {
    measureConnectors();
    const raf = window.requestAnimationFrame(measureConnectors);
    const treeEl = treeRef.current;
    if (treeEl && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measureConnectors);
      ro.observe(treeEl);
      return () => {
        window.cancelAnimationFrame(raf);
        ro.disconnect();
      };
    }
    return () => window.cancelAnimationFrame(raf);
  }, [measureConnectors, currentProjectId]);

  // Travelling handoff light pulses & destination Gradient Floor
  const seenHandoffIds = useRef<Set<string>>(
    new Set((handoffsProp ?? []).map((h) => h.id)),
  );
  const [pulses, setPulses] = useState<ActivePulse[]>([]);
  const [floors, setFloors] = useState<Record<string, FloorGlow>>({});
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  useEffect(() => {
    if (!activeHandoffs.length) return;
    const fresh = activeHandoffs.filter((h) => !seenHandoffIds.current.has(h.id));
    if (!fresh.length) return;

    const timers: number[] = [];
    for (const ho of fresh) {
      seenHandoffIds.current.add(ho.id);
      const fromInfo = flatById.get(ho.from);
      const toInfo = flatById.get(ho.to);
      if (fromInfo && toInfo) {
        setLiveAnnouncement(
          `${fromInfo.agent.name} handed to ${toInfo.agent.name}${ho.label ? `: ${ho.label}` : ""}`,
        );
      }

      const hops = findHopPath(flatNodes, ho.from, ho.to);
      hops.forEach((hop, hopIdx) => {
        const startDelay = hopIdx * 340;
        const uid = `${ho.id}-${hopIdx}`;
        const t1 = window.setTimeout(() => {
          const edgeOwnerId = hop.edgeKey.split("->")[0];
          const color = flatById.get(edgeOwnerId)?.color ?? "var(--af-acrc-blue)";
          setPulses((prev) => [
            ...prev,
            { uid, edgeKey: hop.edgeKey, reverse: hop.reverse, color },
          ]);
        }, startDelay);
        timers.push(t1);

        const t2 = window.setTimeout(() => {
          setPulses((prev) => prev.filter((p) => p.uid !== uid));
          if (hopIdx === hops.length - 1) {
            const glowId = `${ho.id}-floor`;
            setFloors((prev) => ({
              ...prev,
              [hop.targetId]: { uid: glowId, edge: hop.incomingEdge },
            }));
            const t3 = window.setTimeout(() => {
              setFloors((prev) => {
                if (prev[hop.targetId]?.uid !== glowId) return prev;
                const copy = { ...prev };
                delete copy[hop.targetId];
                return copy;
              });
            }, 980);
            timers.push(t3);
          }
        }, startDelay + 440);
        timers.push(t2);
      });
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [activeHandoffs, flatNodes, flatById]);

  // Roving tabindex & open details popover state
  const [focusId, setFocusId] = useState<string>(() => activeRoot.id);
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const msgInputRef = useRef<HTMLInputElement | null>(null);
  const [panelPos, setPanelPos] = useState<{
    left: number;
    top: number;
    width: number;
    up: boolean;
  } | null>(null);

  useEffect(() => {
    if (!flatById.has(focusId)) {
      setFocusId(activeRoot.id);
    }
  }, [flatById, focusId, activeRoot.id]);

  const openNode = openAgentId ? flatById.get(openAgentId) ?? null : null;

  const updatePanelPosition = useCallback(() => {
    if (!openAgentId) {
      setPanelPos(null);
      return;
    }
    const cardEl = cardRefs.current.get(openAgentId);
    if (!cardEl) {
      setPanelPos(null);
      return;
    }
    const rect = cardEl.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight ?? 236;
    const roomBelow = window.innerHeight - rect.bottom - 12;
    const up = roomBelow < panelH && rect.top > panelH + 12;
    const width = Math.max(200, Math.round(rect.width));
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, Math.round(rect.left)));
    const top = up ? Math.max(8, Math.round(rect.top - panelH - 6)) : Math.round(rect.bottom + 6);
    setPanelPos({ left, top, width, up });
  }, [openAgentId]);

  useIsomorphicLayoutEffect(() => {
    if (!openAgentId) return;
    updatePanelPosition();
    const raf = window.requestAnimationFrame(updatePanelPosition);
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openAgentId, msgOpen, updatePanelPosition]);

  // Project switcher popover state
  const [projMenuOpen, setProjMenuOpen] = useState(false);
  const projBtnRef = useRef<HTMLButtonElement | null>(null);
  const projMenuRef = useRef<HTMLDivElement | null>(null);
  const [projMenuPos, setProjMenuPos] = useState<{ left: number; top: number; minW: number } | null>(
    null,
  );

  useIsomorphicLayoutEffect(() => {
    if (!projMenuOpen || !projBtnRef.current) {
      setProjMenuPos(null);
      return;
    }
    const update = () => {
      const btn = projBtnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setProjMenuPos({
        left: Math.max(8, Math.round(r.left)),
        top: Math.round(r.bottom + 6),
        minW: Math.max(236, Math.round(r.width)),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [projMenuOpen]);

  // Close popovers on outside pointer down
  useEffect(() => {
    if (!openAgentId && !projMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (projMenuOpen) {
        if (!projBtnRef.current?.contains(target) && !projMenuRef.current?.contains(target)) {
          setProjMenuOpen(false);
        }
      }
      if (openAgentId) {
        const cardEl = cardRefs.current.get(openAgentId);
        if (!cardEl?.contains(target) && !panelRef.current?.contains(target)) {
          setOpenAgentId(null);
          setMsgOpen(false);
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openAgentId, projMenuOpen]);

  // Steer handler (updates built-in demo state when uncontrolled and always fires `onSteer`)
  const canSteer = Boolean(onSteer) || isDemo;
  const triggerSteer = useCallback(
    (agent: CrewAgent, action: CrewSteerAction, message?: string) => {
      onSteer?.(agent, action, message);
      const verbMap: Record<CrewSteerAction, string> = {
        message: `Messaged ${agent.name}`,
        pause: `Paused ${agent.name}`,
        stop: `Stopped ${agent.name}`,
        resume: `Resumed ${agent.name}`,
        approve: `Approved ${agent.name}`,
        decline: `Declined ${agent.name}`,
        retry: `Retrying ${agent.name}`,
      };
      setLiveAnnouncement(verbMap[action]);

      if (isDemo) {
        const ts = Date.now();
        setDemoCrews((prev) => {
          const curTree = prev[currentProjectId];
          if (!curTree) return prev;
          const updated = updateTreeAgent(curTree, agent.id, (a) => {
            if (action === "message" && message) {
              return {
                ...a,
                status: "active",
                activity: message,
                started: a.started ?? ts,
                last: { from: "You", text: message },
              };
            }
            if (action === "pause") return { ...a, status: "paused", activity: "Paused" };
            if (action === "stop") return { ...a, status: "idle", activity: "Stopped", ended: ts };
            if (action === "resume" || action === "retry" || action === "approve") {
              return { ...a, status: "active", activity: "Working…", started: ts, ended: undefined };
            }
            if (action === "decline") return { ...a, status: "idle", activity: "Declined" };
            return a;
          });
          return { ...prev, [currentProjectId]: updated };
        });
      }

      if (action === "message") {
        setMsgText("");
        setMsgOpen(false);
      }
    },
    [onSteer, isDemo, currentProjectId],
  );

  // Header counts & active title
  const counts = useMemo(() => {
    let working = 0;
    let needsYou = 0;
    let failed = 0;
    for (const n of flatNodes) {
      if (n.agent.status === "active") working += 1;
      if (n.agent.status === "waiting") needsYou += 1;
      if (n.agent.status === "failed") failed += 1;
    }
    return { working, needsYou, failed, total: flatNodes.length };
  }, [flatNodes]);

  const currentProjectObj = activeProjects?.find((p) => p.id === currentProjectId) ?? activeProjects?.[0];
  const headerName = currentProjectObj?.name ?? title ?? "Fix the checkout crash";

  // Card keyboard navigation
  const handleCardKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, node: FlatCrewNode) => {
    const idx = flatNodes.findIndex((n) => n.agent.id === node.agent.id);
    if (idx < 0) return;

    const moveFocus = (nextIdx: number) => {
      const clamped = (nextIdx + flatNodes.length) % flatNodes.length;
      const nextId = flatNodes[clamped].agent.id;
      setFocusId(nextId);
      cardRefs.current.get(nextId)?.focus();
    };

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(idx + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(flatNodes.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(node.agent);
      setOpenAgentId((prev) => (prev === node.agent.id ? null : node.agent.id));
      setMsgOpen(false);
    } else if (e.key === "Escape" && openAgentId === node.agent.id) {
      e.preventDefault();
      setOpenAgentId(null);
      setMsgOpen(false);
    }
  };

  const renderCard = (node: FlatCrewNode) => {
    const { agent, color, small } = node;
    const isBusy = agent.status === "active";
    const isRest = agent.status === "idle" || agent.status === "paused" || agent.status === "done";
    const isOpen = openAgentId === agent.id;
    const ratio = clampContext(agent.context);
    const pct = Math.round(ratio * 100);
    const meterTone = ratio >= 0.95 ? "crit" : ratio >= 0.8 ? "warn" : undefined;
    const floorGlow = floors[agent.id];
    const tools = agent.tools ?? [];
    const shownTools = tools.length > 4 ? tools.slice(0, 3) : tools;
    const extraTools = tools.length > 4 ? tools.length - 3 : 0;

    return (
      <div
        ref={(el) => {
          if (el) cardRefs.current.set(agent.id, el);
          else cardRefs.current.delete(agent.id);
        }}
        className="af-acrc__node"
        data-status={agent.status}
        data-rest={isRest ? "" : undefined}
        data-small={small ? "" : undefined}
        data-open={isOpen ? "" : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        tabIndex={focusId === agent.id ? 0 : -1}
        aria-label={`${agent.name}: ${statusLabel(agent.status)}, ${agent.activity}, context ${pct}%`}
        style={{ "--af-acrc-c": color } as CSSProperties}
        onFocus={() => setFocusId(agent.id)}
        onClick={() => {
          setFocusId(agent.id);
          onSelect?.(agent);
          setOpenAgentId((prev) => (prev === agent.id ? null : agent.id));
          setMsgOpen(false);
        }}
        onKeyDown={(e) => handleCardKeyDown(e, node)}
      >
        {floorGlow ? <CrewGradientFloor key={floorGlow.uid} edge={floorGlow.edge} /> : null}

        <div className="af-acrc__top">
          <span className="af-acrc__avatar" aria-hidden="true">
            {agent.logo ? (
              <span className="af-acrc__custom-logo">{agent.logo}</span>
            ) : (
              <CrewPixelMark id={agent.id} busy={isBusy} />
            )}
          </span>
          <span className="af-acrc__who">
            <span className="af-acrc__name" dir="auto" title={agent.name}>
              {agent.name}
            </span>
            {!small && agent.model ? (
              <span className="af-acrc__model" title={agent.model}>
                {agent.model}
              </span>
            ) : null}
          </span>
          <span
            className="af-acrc__status"
            data-status={agent.status}
            data-icon={small ? "" : undefined}
            title={small ? statusLabel(agent.status) : undefined}
          >
            <StatusGlyph status={agent.status} />
            {small ? null : statusLabel(agent.status)}
          </span>
        </div>

        <p
          className="af-acrc__act"
          dir="auto"
          data-live={isBusy ? "" : undefined}
          title={agent.activity}
        >
          {agent.activity}
        </p>

        <div className="af-acrc__ctx">
          <span className="af-acrc__meter" data-tone={meterTone} aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
          <span className="af-acrc__num">{formatContextPair(agent.context, agent.contextLimit)}</span>
        </div>

        {!small && (tools.length > 0 || agent.last) ? (
          <div className="af-acrc__foot">
            {tools.length > 0 ? (
              <span className="af-acrc__tools" aria-hidden="true">
                {shownTools.map((t, idx) => (
                  <span key={`${t.name}-${idx}`} className="af-acrc__tool" title={t.name}>
                    {renderToolSvg(t)}
                  </span>
                ))}
                {extraTools > 0 ? (
                  <span className="af-acrc__tool af-acrc__tool--more">+{extraTools}</span>
                ) : null}
              </span>
            ) : null}
            {agent.last ? (
              <span
                className="af-acrc__last"
                dir="auto"
                title={`${agent.last.from}: ${agent.last.text}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 5V10.5C5 12.433 6.567 14 8.5 14H19M19 14L15 10M19 14L15 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                <b>{agent.last.from}</b>
                <span>{agent.last.text}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderIndentedSubtree = (agent: CrewAgent): ReactNode => {
    const info = flatById.get(agent.id);
    if (!info) return null;
    const children = agent.children ?? [];
    return (
      <div key={agent.id} className="af-acrc__hang" role="treeitem" aria-label={agent.name}>
        {renderCard(info)}
        {children.length > 0 ? (
          <div className="af-acrc__below" role="group">
            {children.map((ch) => renderIndentedSubtree(ch))}
          </div>
        ) : null}
      </div>
    );
  };

  const leadNode = flatById.get(activeRoot.id)!;

  return (
    <section
      ref={rootElRef}
      className={cn("af-acrc", className)}
      data-wide={useWideTree ? "" : undefined}
      aria-label={headerName}
      style={style}
      {...restProps}
    >
      <header className="af-acrc__bar">
        {activeProjects && activeProjects.length > 0 ? (
          <div className="af-acrc__proj">
            <button
              ref={projBtnRef}
              type="button"
              className="af-acrc__proj-btn"
              aria-haspopup="listbox"
              aria-expanded={projMenuOpen}
              onClick={() => setProjMenuOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && projMenuOpen) {
                  e.preventDefault();
                  setProjMenuOpen(false);
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2.5 7.5C2.5 6.12 3.62 5 5 5H8.9C9.5 5 10.07 5.27 10.45 5.74L11.6 7.2C11.98 7.67 12.55 7.94 13.15 7.94H19C20.38 7.94 21.5 9.06 21.5 10.44V16.5C21.5 17.88 20.38 19 19 19H5C3.62 19 2.5 17.88 2.5 16.5V7.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="af-acrc__proj-name" dir="auto">
                {headerName}
              </span>
              <svg className="af-acrc__chev" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 9C18 9 13.58 15 12 15C10.42 15 6 9 6 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </div>
        ) : (
          <h3 className="af-acrc__title" dir="auto">
            {headerName}
          </h3>
        )}

        <span className="af-acrc__sum">
          {counts.working > 0 ? (
            <span className="af-acrc__sum-run">{counts.working} working</span>
          ) : null}
          {counts.needsYou > 0 ? (
            <span className="af-acrc__sum-wait">{counts.needsYou} need you</span>
          ) : null}
          {counts.failed > 0 ? (
            <span className="af-acrc__sum-fail">{counts.failed} failed</span>
          ) : null}
          <span>
            {counts.total} {counts.total === 1 ? "agent" : "agents"}
          </span>
        </span>
      </header>

      <div
        ref={treeRef}
        key={currentProjectId}
        className="af-acrc__tree"
        role="tree"
        aria-label={headerName}
      >
        <svg className="af-acrc__links" width={svgBox.w} height={svgBox.h} aria-hidden="true">
          {wires.map((w) => (
            <path
              key={w.key}
              d={w.d}
              pathLength={1}
              className="af-acrc__link"
              style={{ "--af-acrc-lc": w.color } as CSSProperties}
            />
          ))}
          {pulses.map((p) => {
            const wire = wires.find((w) => w.key === p.edgeKey);
            if (!wire) return null;
            return (
              <path
                key={p.uid}
                d={wire.d}
                pathLength={1}
                className="af-acrc__pulse"
                data-reverse={p.reverse ? "" : undefined}
                style={{ "--af-acrc-lc": p.color } as CSSProperties}
              />
            );
          })}
        </svg>

        <svg className="af-acrc__links af-acrc__dots" width={svgBox.w} height={svgBox.h} aria-hidden="true">
          {dots.map((d) => (
            <circle
              key={d.id}
              cx={d.cx}
              cy={d.cy}
              r={3}
              className="af-acrc__dot"
              data-rest={d.rest ? "" : undefined}
              style={{ "--af-acrc-lc": d.color } as CSSProperties}
            />
          ))}
        </svg>

        {useWideTree ? (
          <>
            <div className="af-acrc__root" role="treeitem" aria-label={activeRoot.name}>
              {renderCard(leadNode)}
            </div>
            <div className="af-acrc__level" role="group">
              {subAgents.map((sub) => {
                const subInfo = flatById.get(sub.id)!;
                const helpers = sub.children ?? [];
                return (
                  <div
                    key={sub.id}
                    className="af-acrc__hang"
                    role="treeitem"
                    aria-label={sub.name}
                    style={{ "--af-acrc-col": 1 } as CSSProperties}
                  >
                    {renderCard(subInfo)}
                    {helpers.length > 0 ? (
                      <div className="af-acrc__below" role="group">
                        {helpers.map((h) => renderIndentedSubtree(h))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          renderIndentedSubtree(activeRoot)
        )}
      </div>

      <span className="af-acrc__sr" aria-live="polite">
        {liveAnnouncement}
      </span>

      {/* Project Switcher Listbox Popover */}
      {projMenuOpen && activeProjects && projMenuPos ? (
        <AfPortal>
          <div
            ref={projMenuRef}
            role="listbox"
            aria-label="Projects"
            className="af-acrc__proj-menu"
            style={{
              left: `${projMenuPos.left}px`,
              top: `${projMenuPos.top}px`,
              minWidth: `${projMenuPos.minW}px`,
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setProjMenuOpen(false);
                projBtnRef.current?.focus();
              }
            }}
          >
            {activeProjects.map((proj) => {
              const selected = proj.id === currentProjectId;
              const liveCrew = isDemo ? demoCrews[proj.id] : undefined;
              const workingCount =
                proj.working ??
                (liveCrew ? flattenCrew(liveCrew).filter((n) => n.agent.status === "active").length : 0);
              const waitCount =
                proj.needsYou ??
                (liveCrew ? flattenCrew(liveCrew).filter((n) => n.agent.status === "waiting").length : 0);
              return (
                <button
                  key={proj.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="af-acrc__proj-opt"
                  data-selected={selected ? "" : undefined}
                  onClick={() => {
                    setOpenAgentId(null);
                    setMsgOpen(false);
                    setProjMenuOpen(false);
                    if (projectProp === undefined) {
                      setInternalProject(proj.id);
                    }
                    onProjectChange?.(proj.id);
                    projBtnRef.current?.focus();
                  }}
                >
                  <span className="af-acrc__proj-opt-main">
                    <span className="af-acrc__proj-opt-name" dir="auto">
                      {proj.name}
                    </span>
                    <span className="af-acrc__proj-opt-meta">
                      {workingCount > 0 ? (
                        <span className="af-acrc__sum-run">{workingCount} working</span>
                      ) : null}
                      {waitCount > 0 ? (
                        <span className="af-acrc__sum-wait">{waitCount} need you</span>
                      ) : null}
                      {workingCount === 0 && waitCount === 0 ? <span>Idle</span> : null}
                    </span>
                  </span>
                  {selected ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12.5L10 17.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </AfPortal>
      ) : null}

      {/* Agent Details Dialog Popover */}
      {openNode && panelPos ? (
        <AfPortal>
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${openNode.agent.name} – details`}
            className="af-acrc__panel"
            data-up={panelPos.up ? "" : undefined}
            style={
              {
                left: `${panelPos.left}px`,
                top: `${panelPos.top}px`,
                width: `${panelPos.width}px`,
                "--af-acrc-c": openNode.color,
              } as CSSProperties
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                if (msgOpen) {
                  setMsgOpen(false);
                } else {
                  const id = openNode.agent.id;
                  setOpenAgentId(null);
                  cardRefs.current.get(id)?.focus();
                }
              }
            }}
          >
            <div className="af-acrc__panel-head">
              <span className="af-acrc__panel-name" dir="auto">
                {openNode.agent.name}
              </span>
              <button
                type="button"
                className="af-acrc__panel-close"
                aria-label="Close"
                onClick={() => {
                  const id = openNode.agent.id;
                  setOpenAgentId(null);
                  setMsgOpen(false);
                  cardRefs.current.get(id)?.focus();
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {openNode.agent.task ? (
              <p className="af-acrc__panel-task" dir="auto" title={openNode.agent.task}>
                {openNode.agent.task}
              </p>
            ) : null}

            {openNode.agent.model ? (
              <div className="af-acrc__panel-tools">
                <span className="af-acrc__chip" title={openNode.agent.model}>
                  <span className="af-acrc__chip-logo" aria-hidden="true">
                    {renderModelLogo(openNode.agent.model, openNode.agent.modelLogo)}
                  </span>
                  <span dir="auto">{openNode.agent.model}</span>
                </span>
              </div>
            ) : null}

            {(() => {
              const a = openNode.agent;
              const hasTime = typeof a.started === "number" && Number.isFinite(a.started);
              const elapsedMs = hasTime
                ? Math.max(0, (typeof a.ended === "number" ? a.ended : nowTick) - (a.started as number))
                : null;
              const formattedCost =
                typeof a.cost === "number" && Number.isFinite(a.cost) ? formatCost(a.cost) : "";
              const usedTokens =
                typeof a.contextLimit === "number" && Number.isFinite(a.contextLimit)
                  ? formatTokenShort(Math.round(clampContext(a.context) * a.contextLimit))
                  : "";
              if (elapsedMs === null && !formattedCost && !usedTokens) return null;
              return (
                <dl className="af-acrc__usage">
                  {elapsedMs !== null ? (
                    <div>
                      <dt>{a.status === "active" ? "Running" : "Ran"}</dt>
                      <dd>{formatDurationMs(elapsedMs)}</dd>
                    </div>
                  ) : null}
                  {formattedCost ? (
                    <div>
                      <dt>Cost</dt>
                      <dd>{formattedCost}</dd>
                    </div>
                  ) : null}
                  {usedTokens ? (
                    <div>
                      <dt>Tokens</dt>
                      <dd>{usedTokens}</dd>
                    </div>
                  ) : null}
                </dl>
              );
            })()}

            {openNode.agent.tools && openNode.agent.tools.length > 0 ? (
              <div className="af-acrc__panel-tools">
                {openNode.agent.tools.map((t, idx) => (
                  <span key={`${t.name}-${idx}`} className="af-acrc__chip">
                    <span className="af-acrc__chip-logo" aria-hidden="true">
                      {renderToolSvg(t)}
                    </span>
                    <span dir="auto">{t.name}</span>
                  </span>
                ))}
              </div>
            ) : null}

            {openNode.agent.last ? (
              <p className="af-acrc__panel-last" dir="auto">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 5V10.5C5 12.433 6.567 14 8.5 14H19M19 14L15 10M19 14L15 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                <span>
                  <b>{openNode.agent.last.from}</b> {openNode.agent.last.text}
                </span>
              </p>
            ) : null}

            {canSteer ? (
              <>
                <div className="af-acrc__acts">
                  <button
                    type="button"
                    className="af-acrc__btn"
                    data-active={msgOpen ? "" : undefined}
                    onClick={() => {
                      setMsgOpen((v) => !v);
                      window.requestAnimationFrame(() => msgInputRef.current?.focus());
                    }}
                  >
                    Message
                  </button>
                  {openNode.agent.status === "active" ? (
                    <>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        onClick={() => triggerSteer(openNode.agent, "pause")}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        onClick={() => triggerSteer(openNode.agent, "stop")}
                      >
                        Stop
                      </button>
                    </>
                  ) : null}
                  {openNode.agent.status === "paused" ? (
                    <>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        data-primary=""
                        onClick={() => triggerSteer(openNode.agent, "resume")}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        onClick={() => triggerSteer(openNode.agent, "stop")}
                      >
                        Stop
                      </button>
                    </>
                  ) : null}
                  {openNode.agent.status === "waiting" ? (
                    <>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        data-primary=""
                        onClick={() => triggerSteer(openNode.agent, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="af-acrc__btn"
                        onClick={() => triggerSteer(openNode.agent, "decline")}
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {openNode.agent.status === "failed" ? (
                    <button
                      type="button"
                      className="af-acrc__btn"
                      data-primary=""
                      onClick={() => triggerSteer(openNode.agent, "retry")}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>

                {msgOpen ? (
                  <form
                    className="af-acrc__msg-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = msgText.trim();
                      if (clean) triggerSteer(openNode.agent, "message", clean);
                    }}
                  >
                    <input
                      ref={msgInputRef}
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder={`Message ${openNode.agent.name}…`}
                      aria-label={`Message ${openNode.agent.name}`}
                    />
                    <button type="submit" disabled={!msgText.trim()}>
                      Send
                    </button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        </AfPortal>
      ) : null}
    </section>
  );
}

export const AfAgentCrewPattern = AfAgentCrew;
export const AgentCrew = AfAgentCrew;
