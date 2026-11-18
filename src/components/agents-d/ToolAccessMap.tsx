import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { AgentPixelMark, ModelBrandMark, ToolBrandMark } from "../agents-c/_marks";

export type MapAgentStatus = "queued" | "running" | "waiting" | "done" | "failed";
export type ToolCallState = "running" | "done" | "failed";

/** Legacy compatibility permission type. */
export type ToolPermissionMode = "allow" | "ask" | "deny";

export interface ToolAccessCall {
  id: string;
  status: ToolCallState;
  input: unknown;
  output?: unknown;
  error?: string;
  at?: number;
  duration?: number;
  replay?: boolean;
}

export interface AgentTool {
  id: string;
  name?: string;
  calls?: ToolAccessCall[];
}

export interface AccessTool {
  id: string;
  name: string;
  icon?: ReactNode;
  description?: string;
}

export interface MapAgent {
  id: string;
  name: string;
  model?: string;
  avatar?: ReactNode;
  status: MapAgentStatus;
  task?: string;
  tools: AgentTool[];
}

/** Legacy compatibility role interface. */
export interface ToolAccessRole {
  id: string;
  role: string;
  permissions: Record<string, ToolPermissionMode>;
}

export interface AfToolAccessMapProps {
  /** Agents in the run with their accessible tools and call history. */
  agents?: MapAgent[];
  /** Every tool in the run (left half on the left, right half on the right). */
  tools?: AccessTool[];
  /** Legacy roles prop. */
  roles?: ToolAccessRole[];
  /** Controlled active agent ID. */
  agent?: string;
  /** Default active agent ID when uncontrolled. */
  defaultAgent?: string;
  /** Fired when an agent tab is picked. */
  onAgentChange?: (id: string) => void;
  /** Fired when "Replay" is pressed inside a tool's call inspector. */
  onReplay?: (
    call: ToolAccessCall,
    input: unknown,
    tool: AccessTool,
    agent: MapAgent,
  ) => void;
  /** Legacy permission callback. */
  onChangePermission?: (roleId: string, tool: string, next: ToolPermissionMode) => void;
  /** Formats `at` timestamps on calls (default `0:42`). */
  formatTime?: (ms: number) => string;
  /** Heading of the top bar (default `"Tool access"`). */
  title?: ReactNode;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style on the root element. */
  style?: CSSProperties;
}

export type AfToolAccessMapPatternProps = AfToolAccessMapProps;

function ToolVectorLogo({ id }: { id: string }) {
  const k = id.toLowerCase();
  if (k === "github") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{ color: "var(--af-tamc-strong, #181717)" }}
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }
  if (k === "terminal") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: "var(--af-tamc-strong, #000)" }}
      >
        <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 9.5l3 2.5-3 2.5M12.5 15H17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (k === "stripe") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#635BFF" />
        <path
          fill="#fff"
          transform="translate(5 5) scale(0.5833)"
          d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
        />
      </svg>
    );
  }
  if (k === "figma") {
    return (
      <svg viewBox="0 0 38 57" aria-hidden="true">
        <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
        <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
        <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
        <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
        <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
      </svg>
    );
  }
  if (k === "db" || k === "database") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: "rgb(19, 179, 160)" }}
      >
        <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M20 12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M20 5V19C20 20.6569 16.4183 22 12 22C7.58172 22 4 20.6569 4 19V5"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (k === "web" || k === "search") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: "rgb(79, 176, 254)" }}
      >
        <path
          d="M17.5 17.5L22 22"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C15.9706 20 20 15.9706 20 11Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (k === "notion") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{ color: "var(--af-tamc-strong, #000)" }}
      >
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    );
  }
  if (k === "slack") {
    return (
      <svg viewBox="0 0 49.883 49.877" fill="none" aria-hidden="true">
        <g transform="translate(0 0)">
          <path
            d="M18.3549 10.4784C15.4713 10.4784 13.1157 8.12279 13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V10.4784H18.3549Z"
            fill="#36C5F0"
          />
          <path
            d="M18.3575 13.12C21.2411 13.12 23.5967 15.4756 23.5967 18.3592C23.5967 21.2428 21.2411 23.5984 18.3575 23.5984H5.2392C2.35561 23.5984 0 21.2428 0 18.3592C0 15.4756 2.35561 13.12 5.2392 13.12H18.3575Z"
            fill="#36C5F0"
          />
        </g>
        <g transform="translate(26.28 0)">
          <path
            d="M13.1244 18.3592C13.1244 15.4756 15.48 13.12 18.3636 13.12C21.2472 13.12 23.6028 15.4756 23.6028 18.3592C23.6028 21.2428 21.2472 23.5984 18.3636 23.5984H13.1244V18.3592Z"
            fill="#2EB67D"
          />
          <path
            d="M10.4785 18.3575C10.4785 21.2411 8.12286 23.5967 5.23927 23.5967C2.35568 23.5967 7.4362e-05 21.2411 7.4362e-05 18.3575V5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0C8.12286 0 10.4785 2.35561 10.4785 5.2392V18.3575Z"
            fill="#2EB67D"
          />
        </g>
        <g transform="translate(0 26.28)">
          <path
            d="M10.4784 5.2392C10.4784 8.12279 8.12279 10.4784 5.2392 10.4784C2.35561 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35561 0 5.2392 0H10.4784V5.2392Z"
            fill="#E01E5A"
          />
          <path
            d="M13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V18.3575C23.5941 21.2411 21.2385 23.5967 18.3549 23.5967C15.4713 23.5967 13.1157 21.2411 13.1157 18.3575V5.2392Z"
            fill="#E01E5A"
          />
        </g>
        <g transform="translate(26.28 26.28)">
          <path
            d="M5.23927 13.1157C8.12286 13.1157 10.4785 15.4713 10.4785 18.3549C10.4785 21.2385 8.12286 23.5941 5.23927 23.5941C2.35568 23.5941 7.4362e-05 21.2385 7.4362e-05 18.3549V13.1157H5.23927Z"
            fill="#ECB22E"
          />
          <path
            d="M5.23927 10.4784C2.35568 10.4784 7.4362e-05 8.12279 7.4362e-05 5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0H18.3576C21.2412 0 23.5968 2.35561 23.5968 5.2392C23.5968 8.12279 21.2412 10.4784 18.3576 10.4784H5.23927Z"
            fill="#ECB22E"
          />
        </g>
      </svg>
    );
  }
  if (k === "hubspot") {
    return (
      <svg viewBox="0 0 24 24" fill="#FF7A59" aria-hidden="true">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z" />
      </svg>
    );
  }
  return <ToolBrandMark tool={id} size={11} />;
}

const DEFAULT_TOOLS: AccessTool[] = [
  { id: "github", name: "GitHub", description: "Branches, pull requests and code diffs" },
  { id: "terminal", name: "Terminal", description: "Sandboxed shell and test runner" },
  { id: "stripe", name: "Stripe", description: "Test-mode prices, products and checkout sessions" },
  { id: "figma", name: "Figma", description: "Design frames, tokens and layout specs" },
  { id: "db", name: "Database", description: "Read-only SQL queries on staging" },
  { id: "web", name: "Web search", description: "Public docs and competitor pages" },
  { id: "notion", name: "Notion", description: "Product specs and launch docs" },
  { id: "slack", name: "Slack", description: "Post updates to #launch and #pricing" },
  { id: "hubspot", name: "HubSpot", description: "Customer tiers and deal notes" },
];

const DEFAULT_MAP_AGENTS: MapAgent[] = [
  {
    id: "researcher",
    name: "Researcher",
    model: "Opus 5.5",
    avatar: <ModelBrandMark model="claude" size={13} />,
    status: "running",
    task: "Compare the pricing of five competitors",
    tools: [
      {
        id: "web",
        calls: [
          {
            id: "r-web-1",
            status: "done",
            at: 8000,
            duration: 480,
            input: { query: "Linear enterprise seat pricing 2026" },
            output: { results: 6, topUrl: "https://linear.app/pricing" },
          },
          {
            id: "r-web-2",
            status: "done",
            at: 19000,
            duration: 510,
            input: { query: "Vercel Pro team seat billing" },
            output: { results: 5, topUrl: "https://vercel.com/pricing" },
          },
          {
            id: "r-web-3",
            status: "running",
            at: 34000,
            input: { query: "Raycast team vs enterprise SSO" },
          },
        ],
      },
      {
        id: "notion",
        calls: [
          {
            id: "r-not-1",
            status: "done",
            at: 14000,
            duration: 390,
            input: { page: "Pricing 2026 Brief" },
            output: { blocks: 28, owner: "maya@acme.dev" },
          },
        ],
      },
      {
        id: "db",
        calls: [
          {
            id: "r-db-1",
            status: "done",
            at: 26000,
            duration: 210,
            input: { sql: "SELECT plan, count(*) FROM subscriptions GROUP BY 1" },
            output: { rows: [{ plan: "starter", count: 1840 }, { plan: "pro", count: 612 }] },
          },
        ],
      },
      {
        id: "hubspot",
        calls: [
          {
            id: "r-hs-1",
            status: "done",
            at: 29000,
            duration: 640,
            input: { filter: "dealstage = closedlost AND reason = pricing" },
            output: { deals: 19 },
          },
        ],
      },
      { id: "figma" },
    ],
  },
  {
    id: "coder",
    name: "Coder",
    model: "GPT-6 Sol",
    avatar: <ModelBrandMark model="openai" size={13} />,
    status: "running",
    task: "Build the pricing page and wire up checkout",
    tools: [
      {
        id: "github",
        calls: [
          {
            id: "c-gh-1",
            status: "done",
            at: 9000,
            duration: 410,
            input: { repo: "acme/web", action: "create_branch", ref: "feat/pricing-v2" },
            output: { branch: "feat/pricing-v2", baseSha: "84f19a2" },
          },
          {
            id: "c-gh-2",
            status: "done",
            at: 24000,
            duration: 520,
            input: { repo: "acme/web", path: "app/pricing/page.tsx" },
            output: { lines: 186, sha: "c912b40" },
          },
        ],
      },
      {
        id: "terminal",
        calls: [
          {
            id: "c-sh-1",
            status: "failed",
            at: 31000,
            duration: 1420,
            input: { cmd: "pnpm vitest run tests/pricing.test.tsx" },
            error: "AssertionError: expected annual toggle discount '20%' to equal '17%'",
          },
        ],
      },
      {
        id: "stripe",
        calls: [
          {
            id: "c-st-1",
            status: "done",
            at: 18000,
            duration: 730,
            input: { product: "prod_pro_2026", currency: "usd" },
            output: { monthly: "price_1QvM", annual: "price_1QvY" },
          },
        ],
      },
      {
        id: "figma",
        calls: [
          {
            id: "c-fg-1",
            status: "done",
            at: 6000,
            duration: 1200,
            input: { fileKey: "kP92xPricing", nodeId: "402:18" },
            output: { frame: "Pricing / Desktop · 3 columns", tokens: 14 },
          },
        ],
      },
      {
        id: "db",
        calls: [
          {
            id: "c-db-1",
            status: "done",
            at: 14000,
            duration: 280,
            input: { sql: "SELECT code, percent_off FROM coupons WHERE active = true" },
            output: { rows: [{ code: "LAUNCH20", percent_off: 20 }] },
          },
        ],
      },
      { id: "web" },
    ],
  },
  {
    id: "writer",
    name: "Writer",
    model: "Sonnet 5.0",
    avatar: <ModelBrandMark model="claude" size={13} />,
    status: "waiting",
    task: "Write the copy for the three plans",
    tools: [
      { id: "figma" },
      {
        id: "web",
        calls: [
          {
            id: "w-web-1",
            status: "done",
            at: 11000,
            duration: 460,
            input: { query: "SaaS SOC2 compliance tier copy examples" },
            output: { snippets: 4 },
          },
        ],
      },
      {
        id: "notion",
        calls: [
          {
            id: "w-not-1",
            status: "done",
            at: 17000,
            duration: 500,
            input: { page: "Plan Comparison Copy", section: "FAQ" },
            output: { updated: true, words: 380 },
          },
          {
            id: "w-not-2",
            status: "done",
            at: 28000,
            duration: 340,
            input: { page: "Launch Checklist", status: "Ready for review" },
            output: { ok: true },
          },
        ],
      },
      {
        id: "slack",
        calls: [
          {
            id: "w-sl-1",
            status: "done",
            at: 33000,
            duration: 290,
            input: { channel: "#pricing", text: "Draft copy ready — waiting on approval." },
            output: { ts: "1763192044.0012" },
          },
        ],
      },
    ],
  },
  {
    id: "analyst",
    name: "Analyst",
    model: "Gemini 3.8 Pro",
    avatar: <ModelBrandMark model="gemini" size={13} />,
    status: "running",
    task: "Sum up 120 G2 reviews that mention price",
    tools: [
      {
        id: "db",
        calls: [
          {
            id: "a-db-1",
            status: "done",
            at: 10000,
            duration: 320,
            input: { sql: "SELECT rating, body FROM g2_reviews WHERE body ILIKE '%price%'" },
            output: { count: 120 },
          },
          {
            id: "a-db-2",
            status: "running",
            at: 36000,
            input: { sql: "SELECT segment, avg(nps) FROM review_cohorts GROUP BY 1" },
          },
        ],
      },
      { id: "web" },
      {
        id: "hubspot",
        calls: [
          {
            id: "a-hs-1",
            status: "done",
            at: 21000,
            duration: 1100,
            input: { list: "enterprise-renewals-q4" },
            output: { accounts: 48, medianSeats: 34 },
          },
        ],
      },
    ],
  },
];

function fmtDuration(ms: number | undefined): string {
  if (ms === undefined) return "240ms";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function fmtJson(val: unknown): string {
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val ?? {}, null, 2);
  } catch {
    return String(val);
  }
}

function summarizeInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>);
    if (entries.length > 0) {
      const [k, v] = entries[0];
      return `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`;
    }
  }
  return JSON.stringify(input ?? {});
}

function resolveAgentAvatar(ag: MapAgent, size: number): ReactNode {
  if (ag.avatar) return ag.avatar;
  const hint = `${ag.name} ${ag.model ?? ""}`.toLowerCase();
  if (
    hint.includes("claude") ||
    hint.includes("opus") ||
    hint.includes("sonnet") ||
    hint.includes("gpt") ||
    hint.includes("openai") ||
    hint.includes("gemini") ||
    hint.includes("grok")
  ) {
    return <ModelBrandMark model={hint} size={size} />;
  }
  return <AgentPixelMark seed={ag.name} active={ag.status === "running"} size={size} />;
}

const TOOL_W = 130;
const TOOL_H = 46;
const TOOL_GAP = 12;
const CARD_W = 200;

/**
 * Tool Access Map (affectUI Pro 1:1 `.af-tamc`):
 * Bilateral hub-and-spoke tool map with solid accessible lines, dashed blocked lines,
 * live travelling call glints, agent tab switching, and slide-over call replay inspector.
 * Preserves `.af-agd-tam__table` on the tabpanel stage for SSR contract tests.
 */
export function AfToolAccessMap({
  agents: agentsProp,
  tools: toolsProp,
  roles: legacyRoles,
  agent: agentProp,
  defaultAgent,
  onAgentChange,
  onReplay,
  formatTime = (ms) => {
    const sec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  },
  title = "Tool access",
  className,
  style,
}: AfToolAccessMapProps = {}) {
  const isDemo = !agentsProp && !legacyRoles?.length;

  const normalized = useMemo(() => {
    if (legacyRoles?.length && !agentsProp) {
      const toolSet = new Map<string, AccessTool>();
      const convAgents: MapAgent[] = legacyRoles.map((r) => {
        const agTools: AgentTool[] = [];
        for (const [tName, mode] of Object.entries(r.permissions)) {
          toolSet.set(tName, { id: tName, name: tName });
          if (mode !== "deny") {
            agTools.push({
              id: tName,
              calls:
                mode === "allow"
                  ? [
                      {
                        id: `${r.id}-${tName}-1`,
                        status: "done",
                        duration: 280,
                        input: { role: r.role, permission: mode },
                        output: { allowed: true },
                      },
                    ]
                  : undefined,
            });
          }
        }
        return {
          id: r.id,
          name: r.role,
          status: "done",
          task: "Role tool access policy",
          tools: agTools,
        };
      });
      return { agents: convAgents, tools: [...toolSet.values()] };
    }
    const resolvedAgents = agentsProp ?? DEFAULT_MAP_AGENTS;
    if (toolsProp?.length) {
      return { agents: resolvedAgents, tools: toolsProp };
    }
    if (agentsProp) {
      const union = new Map<string, AccessTool>();
      for (const ag of agentsProp) {
        for (const t of ag.tools) {
          if (!union.has(t.id)) {
            const known = DEFAULT_TOOLS.find((d) => d.id === t.id);
            union.set(t.id, known ?? { id: t.id, name: t.name ?? t.id });
          }
        }
      }
      return { agents: resolvedAgents, tools: union.size ? [...union.values()] : DEFAULT_TOOLS };
    }
    return { agents: DEFAULT_MAP_AGENTS, tools: DEFAULT_TOOLS };
  }, [agentsProp, legacyRoles, toolsProp]);

  const [internalAgents, setInternalAgents] = useState<MapAgent[]>(normalized.agents);
  const [hasSwitchedTab, setHasSwitchedTab] = useState<boolean>(false);

  const agents = agentsProp ? normalized.agents : internalAgents;
  const tools = normalized.tools;

  const initialDefaultAgent =
    defaultAgent ??
    (isDemo ? "coder" : agents[0]?.id ?? "coder");

  const [activeAgentId, setActiveAgentId] = useControllableState<string>({
    value: agentProp,
    defaultValue: initialDefaultAgent,
    onChange: onAgentChange,
  });

  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? agents[0];

  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [draftInput, setDraftInput] = useState<string>("");
  const [jsonInvalid, setJsonInvalid] = useState<boolean>(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const toolRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const backBtnRef = useRef<HTMLButtonElement | null>(null);
  const [stageWidth, setStageWidth] = useState<number>(680);

  useIsomorphicLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setStageWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrow = stageWidth < 540;

  const layout = useMemo(() => {
    const leftCount = Math.ceil(tools.length / 2);
    const rightCount = tools.length - leftCount;
    const maxCol = Math.max(1, leftCount, rightCount);
    const contentH = maxCol * TOOL_H + Math.max(0, maxCol - 1) * TOOL_GAP;
    const mapH = Math.max(220, contentH + 28);
    const midY = mapH / 2;

    const w = Math.max(540, stageWidth);
    const cardLeft = (w - CARD_W) / 2;
    const cardRight = cardLeft + CARD_W;
    const leftMidX = (TOOL_W + cardLeft) / 2;
    const rightStartX = w - TOOL_W;
    const rightMidX = (cardRight + rightStartX) / 2;

    const leftSpan = leftCount * TOOL_H + Math.max(0, leftCount - 1) * TOOL_GAP;
    const leftStartTop = (mapH - leftSpan) / 2;

    const rightSpan = rightCount * TOOL_H + Math.max(0, rightCount - 1) * TOOL_GAP;
    const rightStartTop = (mapH - rightSpan) / 2;

    const items = tools.map((tool, i) => {
      const isLeft = i < leftCount;
      const sideIdx = isLeft ? i : i - leftCount;
      const top = (isLeft ? leftStartTop : rightStartTop) + sideIdx * (TOOL_H + TOOL_GAP);
      const left = isLeft ? 0 : rightStartX;
      const ty = top + TOOL_H / 2;

      let d: string;
      const dy = midY - ty;
      if (Math.abs(dy) < 1) {
        d = isLeft ? `M${TOOL_W} ${ty}H${cardLeft}` : `M${rightStartX} ${ty}H${cardRight}`;
      } else {
        const r = Math.min(8, Math.abs(dy) / 2);
        const dir = dy > 0 ? 1 : -1;
        if (isLeft) {
          d = `M${TOOL_W} ${ty}H${(leftMidX - r).toFixed(1)}Q${leftMidX.toFixed(1)} ${ty} ${leftMidX.toFixed(1)} ${(ty + dir * r).toFixed(1)}V${(midY - dir * r).toFixed(1)}Q${leftMidX.toFixed(1)} ${midY} ${(leftMidX + r).toFixed(1)} ${midY}H${cardLeft}`;
        } else {
          d = `M${rightStartX} ${ty}H${(rightMidX + r).toFixed(1)}Q${rightMidX.toFixed(1)} ${ty} ${rightMidX.toFixed(1)} ${(ty + dir * r).toFixed(1)}V${(midY - dir * r).toFixed(1)}Q${rightMidX.toFixed(1)} ${midY} ${(rightMidX - r).toFixed(1)} ${midY}H${cardRight}`;
        }
      }

      return {
        tool,
        isLeft,
        sideIdx,
        left,
        top,
        d,
      };
    });

    return {
      w,
      mapH,
      midY,
      cardLeft,
      cardRight,
      items,
    };
  }, [stageWidth, tools]);

  const { accessibleCount, totalCalls, runningCallCount } = useMemo(() => {
    if (!activeAgent) return { accessibleCount: 0, totalCalls: 0, runningCallCount: 0 };
    let callsSum = 0;
    let runSum = 0;
    for (const at of activeAgent.tools) {
      const list = at.calls ?? [];
      callsSum += list.length;
      runSum += list.filter((c) => c.status === "running").length;
    }
    return {
      accessibleCount: activeAgent.tools.length,
      totalCalls: callsSum,
      runningCallCount: runSum,
    };
  }, [activeAgent]);

  const openTool = tools.find((t) => t.id === openToolId) ?? null;
  const openAgentTool = openToolId
    ? activeAgent?.tools.find((at) => at.id === openToolId)
    : undefined;
  const calls = openAgentTool?.calls ?? [];
  const activeCall =
    calls.find((c) => c.id === selectedCallId) ?? calls[calls.length - 1] ?? null;

  const openInspector = (tool: AccessTool) => {
    const entry = activeAgent?.tools.find((at) => at.id === tool.id);
    if (!entry) return;
    setOpenToolId(tool.id);
    const last = entry.calls?.[entry.calls.length - 1] ?? null;
    setSelectedCallId(last?.id ?? null);
    setDraftInput(fmtJson(last?.input ?? {}));
    setJsonInvalid(false);
    requestAnimationFrame(() => backBtnRef.current?.focus());
  };

  const closeInspector = () => {
    const prev = openToolId;
    setOpenToolId(null);
    setJsonInvalid(false);
    if (prev) {
      requestAnimationFrame(() => toolRefs.current[prev]?.focus());
    }
  };

  const handleReplay = () => {
    if (!openTool || !activeAgent) return;
    const expectsObject =
      activeCall === null || (typeof activeCall.input === "object" && activeCall.input !== null);
    let parsed: unknown = draftInput;
    if (expectsObject) {
      try {
        parsed = JSON.parse(draftInput);
        setJsonInvalid(false);
      } catch {
        setJsonInvalid(true);
        return;
      }
    }

    const baseCall: ToolAccessCall = activeCall ?? {
      id: `call-${Date.now()}`,
      status: "done",
      input: parsed,
    };
    onReplay?.(baseCall, parsed, openTool, activeAgent);

    if (!agentsProp) {
      const replayCall: ToolAccessCall = {
        id: `replay-${Date.now()}`,
        status: "done",
        input: parsed,
        output: { ok: true, replayed: true, rowsAffected: 1 },
        at: 42000,
        duration: 210,
        replay: true,
      };
      setInternalAgents((prev) =>
        prev.map((ag) => {
          if (ag.id !== activeAgent.id) return ag;
          return {
            ...ag,
            tools: ag.tools.map((at) =>
              at.id === openTool.id
                ? { ...at, calls: [...(at.calls ?? []), replayCall] }
                : at,
            ),
          };
        }),
      );
      setSelectedCallId(replayCall.id);
    }
  };

  const handleCallListKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (!calls.length) return;
    const idx = calls.findIndex((c) => c.id === activeCall?.id);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = calls[Math.min(calls.length - 1, idx + 1)];
      if (next) {
        setSelectedCallId(next.id);
        setDraftInput(fmtJson(next.input));
        setJsonInvalid(false);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = calls[Math.max(0, idx - 1)];
      if (prev) {
        setSelectedCallId(prev.id);
        setDraftInput(fmtJson(prev.input));
        setJsonInvalid(false);
      }
    }
  };

  const leftHasAccess = layout.items.some(
    (it) => it.isLeft && activeAgent?.tools.some((at) => at.id === it.tool.id),
  );
  const rightHasAccess = layout.items.some(
    (it) => !it.isLeft && activeAgent?.tools.some((at) => at.id === it.tool.id),
  );

  const stageHeight = openTool ? Math.max(layout.mapH, 324) : layout.mapH;

  return (
    <div
      ref={rootRef}
      className={cn("af-tamc", className)}
      data-narrow={isNarrow || undefined}
      data-switched={hasSwitchedTab || undefined}
      style={style}
      onKeyDown={(e) => {
        if (openToolId && e.key === "Escape") {
          e.preventDefault();
          closeInspector();
        }
      }}
    >
      <header className="af-tamc__head">
        <span className="af-tamc__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M5.6 8H2.8M10.4 8h2.8M8 5.6V3M8 10.4V13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.45"
            />
            <rect x="5.2" y="5.2" width="5.6" height="5.6" rx="1.6" fill="currentColor" />
            <circle cx="2.2" cy="8" r="1.4" fill="currentColor" />
            <circle cx="13.8" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </span>

        <span className="af-tamc__title" dir="auto">
          {title}
        </span>

        <span
          className="af-tamc__live"
          data-on={runningCallCount > 0 || undefined}
          aria-hidden="true"
        >
          <svg
            className="af-tamc__spin"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="3"
            />
            <path
              d="M12 3.5A8.5 8.5 0 0 1 20.5 12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          {Math.max(1, runningCallCount)}
          <span className="af-tamc__live-word"> running</span>
        </span>

        <span className="af-tamc__sum" aria-live="polite">
          <span className="af-tamc__sum-tools">
            {accessibleCount}/{tools.length} tools
          </span>
          <span className="af-tamc__sum-calls">
            <span className="af-tamc__sum-dot">· </span>
            {totalCalls} {totalCalls === 1 ? "call" : "calls"}
          </span>
        </span>
      </header>

      <div
        className="af-tamc__agents"
        role="tablist"
        aria-label="Agents"
        onKeyDown={(e) => {
          const idx = agents.findIndex((a) => a.id === activeAgent?.id);
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const delta = e.key === "ArrowRight" ? 1 : -1;
            const next = agents[(idx + delta + agents.length) % agents.length];
            if (next) {
              setHasSwitchedTab(true);
              setActiveAgentId(next.id);
              setOpenToolId(null);
              tabRefs.current[next.id]?.focus();
            }
          }
        }}
      >
        {agents.map((ag) => {
          const selected = ag.id === activeAgent?.id;
          return (
            <button
              key={ag.id}
              ref={(el) => {
                tabRefs.current[ag.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="af-tamc__agent-tab"
              onClick={() => {
                setHasSwitchedTab(true);
                setActiveAgentId(ag.id);
                setOpenToolId(null);
              }}
            >
              <span className="af-tamc__tab-avatar" data-logo="">
                {resolveAgentAvatar(ag, 11)}
              </span>
              <span className="af-tamc__tab-name" dir="auto" title={ag.name}>
                {ag.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Preserves .af-agd-tam__table for SSR contract assertion */}
      <div
        className="af-tamc__stage af-agd-tam__table"
        role="tabpanel"
        aria-label={`Tools of ${activeAgent?.name ?? "Agent"}`}
        style={{ "--af-tamc-map-h": `${stageHeight}px` } as CSSProperties}
      >
        <div className="af-tamc__map" aria-hidden={openTool ? "true" : undefined}>
          {!isNarrow ? (
            <svg
              className="af-tamc__lines"
              width={layout.w}
              height={layout.mapH}
              aria-hidden="true"
            >
              <g>
                {layout.items.map((it) => {
                  const hasAccess = activeAgent?.tools.some(
                    (at) => at.id === it.tool.id,
                  );
                  if (hasAccess && !hasSwitchedTab) return null;
                  return (
                    <path
                      key={`base-${it.tool.id}`}
                      className="af-tamc__base"
                      d={it.d}
                      pathLength={1}
                    />
                  );
                })}
              </g>
              <g key={activeAgent?.id ?? "lines"}>
                {layout.items.map((it) => {
                  const entry = activeAgent?.tools.find((at) => at.id === it.tool.id);
                  if (!entry) return null;
                  const isCalling = Boolean(
                    entry.calls?.some((c) => c.status === "running"),
                  );

                  return (
                    <g key={`active-${it.tool.id}`}>
                      <path
                        className="af-tamc__line"
                        d={it.d}
                        pathLength={1}
                        style={{ "--af-tamc-k": it.sideIdx } as CSSProperties}
                      />
                      {isCalling ? (
                        <path
                          className="af-tamc__glint"
                          d={it.d}
                          pathLength={1}
                          style={{ "--af-tamc-l": 0.22 } as CSSProperties}
                        />
                      ) : null}
                    </g>
                  );
                })}
              </g>
              <circle
                className="af-tamc__joint"
                data-on={leftHasAccess ? "" : undefined}
                cx={layout.cardLeft}
                cy={layout.midY}
                r={3}
              />
              <circle
                className="af-tamc__joint"
                data-on={rightHasAccess ? "" : undefined}
                cx={layout.cardRight}
                cy={layout.midY}
                r={3}
              />
            </svg>
          ) : null}

          {activeAgent ? (
            <div
              className="af-tamc__card"
              data-status={activeAgent.status}
              style={
                !isNarrow
                  ? { left: `${layout.cardLeft}px`, top: `${layout.midY}px` }
                  : undefined
              }
            >
              <div className="af-tamc__card-body" key={activeAgent.id}>
                <div className="af-tamc__card-top">
                  <span className="af-tamc__avatar" data-logo="">
                    {resolveAgentAvatar(activeAgent, 13)}
                  </span>
                  <span className="af-tamc__who">
                    <span className="af-tamc__name" dir="auto" title={activeAgent.name}>
                      {activeAgent.name}
                    </span>
                    {activeAgent.model ? (
                      <span className="af-tamc__model" title={activeAgent.model}>
                        {activeAgent.model}
                      </span>
                    ) : null}
                  </span>
                  <span className="af-tamc__status" data-status={activeAgent.status}>
                    {activeAgent.status === "running" ? (
                      <svg
                        className="af-tamc__spin"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="8.5"
                          stroke="currentColor"
                          strokeOpacity="0.25"
                          strokeWidth="3"
                        />
                        <path
                          d="M12 3.5A8.5 8.5 0 0 1 20.5 12"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="3"
                        />
                      </svg>
                    ) : null}
                    {activeAgent.status === "waiting"
                      ? "Needs you"
                      : activeAgent.status === "running"
                        ? "Running"
                        : activeAgent.status === "failed"
                          ? "Failed"
                          : activeAgent.status === "queued"
                            ? "Queued"
                            : "Done"}
                  </span>
                </div>
                {activeAgent.task ? (
                  <p className="af-tamc__task" dir="auto" title={activeAgent.task}>
                    {activeAgent.task}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="af-tamc__tools">
            {layout.items.map((it) => {
              const { tool, isLeft, sideIdx, left, top } = it;
              const entry = activeAgent?.tools.find((at) => at.id === tool.id);
              const hasAccess = Boolean(entry);
              const toolCalls = entry?.calls ?? [];
              const hasRunning = toolCalls.some((c) => c.status === "running");
              const hasFailed = toolCalls.some((c) => c.status === "failed");
              const lastCall = toolCalls[toolCalls.length - 1];

              const state = !hasAccess
                ? "blocked"
                : hasRunning
                  ? "running"
                  : hasFailed
                    ? "failed"
                    : toolCalls.length > 0
                      ? "used"
                      : "idle";

              const ariaDesc = !hasAccess
                ? `${tool.name}, no access`
                : `${tool.name}, ${
                    state === "idle" ? "not used yet" : state
                  }, ${toolCalls.length} ${toolCalls.length === 1 ? "call" : "calls"} – open its calls`;

              return (
                <button
                  key={tool.id}
                  ref={(el) => {
                    toolRefs.current[tool.id] = el;
                  }}
                  type="button"
                  className="af-tamc__tool"
                  data-tool={tool.id}
                  data-state={state}
                  aria-disabled={!hasAccess || undefined}
                  tabIndex={!hasAccess || openTool ? -1 : 0}
                  aria-label={ariaDesc}
                  style={
                    !isNarrow
                      ? ({
                          "--af-tamc-k": sideIdx,
                          "--af-tamc-from": isLeft ? "-14px 0" : "14px 0",
                          left: `${left}px`,
                          top: `${top}px`,
                        } as CSSProperties)
                      : ({
                          "--af-tamc-k": sideIdx,
                        } as CSSProperties)
                  }
                  onClick={() => {
                    if (hasAccess) openInspector(tool);
                  }}
                >
                  <span className="af-tamc__tool-top">
                    <span className="af-tamc__tile">
                      {tool.icon ?? <ToolVectorLogo id={tool.id} />}
                    </span>
                    <span className="af-tamc__tool-name" dir="auto" title={tool.name}>
                      {tool.name}
                    </span>
                    {hasAccess && toolCalls.length > 0 ? (
                      <span className="af-tamc__count">{toolCalls.length}×</span>
                    ) : null}
                  </span>

                  <span className="af-tamc__tool-meta">
                    {!hasAccess ? (
                      "No access"
                    ) : hasRunning ? (
                      <span className="af-tamc__badge" data-kind="running">
                        Running
                      </span>
                    ) : hasFailed ? (
                      <span className="af-tamc__badge" data-kind="failed">
                        Failed
                      </span>
                    ) : lastCall ? (
                      `Last call ${fmtDuration(lastCall.duration)}`
                    ) : (
                      "Not used yet"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {openTool ? (
          <div className="af-tamc__panel" role="region" aria-label={`${openTool.name} calls`}>
            <div className="af-tamc__panel-head">
              <button
                ref={backBtnRef}
                type="button"
                className="af-tamc__back"
                aria-label="Back to tool map"
                onClick={closeInspector}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M10 3.5L5.5 8L10 12.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="af-tamc__tile">
                {openTool.icon ?? <ToolVectorLogo id={openTool.id} />}
              </span>
              <span className="af-tamc__panel-name">{openTool.name}</span>
              {openTool.description ? (
                <span className="af-tamc__panel-desc">{openTool.description}</span>
              ) : null}
              <span className="af-tamc__panel-sum">
                {calls.length} {calls.length === 1 ? "call" : "calls"}
              </span>
            </div>

            <div className="af-tamc__panel-body">
              <ul
                className="af-tamc__calls"
                tabIndex={0}
                aria-label="Tool calls"
                onKeyDown={handleCallListKeyDown}
              >
                {calls.length === 0 ? (
                  <li className="af-tamc__empty">
                    No calls yet — edit input on the right and press Replay.
                  </li>
                ) : (
                  calls.map((c) => {
                    const pressed = activeCall?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="af-tamc__call"
                          aria-pressed={pressed}
                          onClick={() => {
                            setSelectedCallId(c.id);
                            setDraftInput(fmtJson(c.input));
                            setJsonInvalid(false);
                          }}
                        >
                          <span className="af-tamc__call-icon" data-status={c.status}>
                            {c.status === "failed" ? "!" : c.status === "running" ? "…" : "✓"}
                          </span>
                          <span className="af-tamc__call-text">{summarizeInput(c.input)}</span>
                          {c.replay ? <span className="af-tamc__chip">Replayed</span> : null}
                          <span className="af-tamc__call-time">
                            {c.at !== undefined ? formatTime(c.at) : fmtDuration(c.duration)}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="af-tamc__detail" key={activeCall?.id ?? "empty"}>
                <div className="af-tamc__label">
                  <span>Input</span>
                  <span className="af-tamc__label-meta">⌘+Enter to replay</span>
                </div>
                <textarea
                  className="af-tamc__code af-tamc__edit"
                  value={draftInput}
                  aria-label="Tool call input JSON"
                  aria-invalid={jsonInvalid || undefined}
                  rows={4}
                  onChange={(e) => {
                    setDraftInput(e.target.value);
                    if (jsonInvalid) setJsonInvalid(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleReplay();
                    }
                  }}
                />

                <div className="af-tamc__label">
                  <span>{activeCall?.error ? "Error" : "Output"}</span>
                  {activeCall?.duration !== undefined ? (
                    <span className="af-tamc__label-meta">{fmtDuration(activeCall.duration)}</span>
                  ) : null}
                </div>
                <pre
                  className="af-tamc__code"
                  data-error={Boolean(activeCall?.error) || undefined}
                >
                  {activeCall?.status === "running" ? (
                    <span className="af-tamc__waiting">Waiting for response…</span>
                  ) : (
                    activeCall?.error ?? fmtJson(activeCall?.output ?? { ready: true })
                  )}
                </pre>

                <div className="af-tamc__actions">
                  {jsonInvalid ? (
                    <span className="af-tamc__invalid">Valid JSON required</span>
                  ) : null}
                  <button
                    type="button"
                    className="af-tamc__btn af-tamc__btn--primary"
                    onClick={handleReplay}
                  >
                    Replay
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const ToolAccessMap = AfToolAccessMap;
export const AfToolAccessMapPattern = AfToolAccessMap;
