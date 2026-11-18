import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn, useControllableState } from "../../primitives";
import { ModelBrandMark } from "../agents-c/_marks";

export type ContextBlockKind =
  | "system"
  | "tools"
  | "memory"
  | "file"
  | "chat"
  | "result"
  | "summary";

export interface ContextBlockItem {
  label: string;
  icon?: ReactNode;
}

export interface ContextBlock {
  id: string;
  label: string;
  kind: ContextBlockKind;
  tokens: number;
  detail?: string;
  icon?: ReactNode;
  items?: ContextBlockItem[];
  /** Legacy compatibility flag. */
  pinned?: boolean;
}

/** Legacy block alias. */
export type ContextMapBlock = ContextBlock;

export interface ContextCompaction {
  before: ContextBlock[];
  summarized?: string[];
  dropped?: string[];
  summary?: ContextBlock;
}

export interface ContextAgent {
  id: string;
  name: string;
  model?: string;
  logo?: ReactNode;
  limit: number;
  blocks: ContextBlock[];
  compaction?: ContextCompaction | null;
}

export interface AfContextMapProps {
  /** Blocks inside the context window. */
  blocks?: ContextBlock[];
  /** Total token limit of the context window. */
  limit?: number;
  /** Legacy budget alias. */
  budget?: number;
  /** Model name and optional icon when rendering a single window. */
  model?: string;
  modelIcon?: ReactNode;
  /** Multiple agents to switch between in the top picker. */
  agents?: ContextAgent[];
  /** Controlled active agent ID. */
  agent?: string;
  /** Agent picker change handler. */
  onAgentChange?: (id: string) => void;
  /** Compaction state enabling the Before | After toggle. */
  compaction?: ContextCompaction | null;
  /** Controlled Before | After view. */
  view?: "before" | "after";
  /** View toggle handler. */
  onViewChange?: (view: "before" | "after") => void;
  /** Live status pill text (e.g. "Compacting…"). */
  status?: string;
  /** Fired when a block is pinned or cleared (clicking Free passes null). */
  onSelect?: (block: ContextBlock | null) => void;
  /** Legacy eviction callback. */
  onEvict?: (blockId: string) => void;
  /** Header title. */
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export type AfContextMapPatternProps = AfContextMapProps;

const KIND_LABEL: Record<ContextBlockKind, string> = {
  system: "System prompt",
  tools: "Tools",
  memory: "Memory",
  file: "File",
  chat: "Conversation",
  result: "Tool result",
  summary: "Summary",
};

function FileMiniIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 1.75h3.9L9.5 4.35v5.9a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-7.5A.75.75 0 0 1 3 1.75Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6.75 1.9v2.6h2.6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function ToolMiniIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M4.2 3.5 1.8 6l2.4 2.5M7.8 3.5 10.2 6 7.8 8.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FIXER_INITIAL_BLOCKS: ContextBlock[] = [
  {
    id: "system",
    label: "System prompt",
    kind: "system",
    tokens: 6200,
    detail: "Coding conventions, safety boundaries, and test-before-commit rules.",
  },
  {
    id: "tools",
    label: "Tool definitions",
    kind: "tools",
    tokens: 14800,
    detail: "18 workspace, git, browser, and Stripe inspection tool schemas.",
    items: [
      { label: "read_file", icon: <ToolMiniIcon /> },
      { label: "edit_file", icon: <ToolMiniIcon /> },
      { label: "run_vitest", icon: <ToolMiniIcon /> },
      { label: "stripe_events", icon: <ToolMiniIcon /> },
    ],
  },
  {
    id: "memory",
    label: "Project memory",
    kind: "memory",
    tokens: 9400,
    detail: "Persistent notes from AGENTS.md and payment retry architecture.",
  },
];

const FIXER_GROWING_BLOCKS_1: ContextBlock[] = [
  ...FIXER_INITIAL_BLOCKS,
  {
    id: "spec",
    label: "checkout.spec.ts",
    kind: "file",
    tokens: 18600,
    detail: "Integration suite covering coupon stacking, webhook retries, and 3DS.",
    items: [
      { label: "tests/checkout.spec.ts", icon: <FileMiniIcon /> },
      { label: "tests/fixtures/stripe.json", icon: <FileMiniIcon /> },
    ],
  },
  {
    id: "payment",
    label: "payment.ts",
    kind: "file",
    tokens: 15800,
    detail: "PaymentIntent creation, idempotency keys, and error normalization.",
    items: [
      { label: "src/checkout/payment.ts", icon: <FileMiniIcon /> },
      { label: "src/lib/stripe.ts", icon: <FileMiniIcon /> },
    ],
  },
];

const FIXER_BEFORE_COMPACTION: ContextBlock[] = [
  ...FIXER_GROWING_BLOCKS_1,
  {
    id: "chat",
    label: "Chat · 14 turns",
    kind: "chat",
    tokens: 64000,
    detail: "Debugging turns 1–14 tracing duplicate idempotency headers on retry.",
  },
  {
    id: "results",
    label: "Test run · 20×",
    kind: "result",
    tokens: 42200,
    detail: "Raw stack traces and verbose HTTP fixture dumps from 20 test runs.",
  },
];

const FIXER_SUMMARY_BLOCK: ContextBlock = {
  id: "summary",
  label: "Summary",
  kind: "summary",
  tokens: 11800,
  detail:
    "Condensed turns 1–14: root cause isolated to reused idempotency key in retryPayment(); 19/20 specs passing.",
};

const FIXER_AFTER_COMPACTION: ContextBlock[] = [
  ...FIXER_GROWING_BLOCKS_1,
  FIXER_SUMMARY_BLOCK,
  {
    id: "recent-chat",
    label: "Recent turns",
    kind: "chat",
    tokens: 9600,
    detail: "Latest 3 turns verifying final webhook signature test.",
  },
];

const DEFAULT_AGENTS: ContextAgent[] = [
  {
    id: "fixer",
    name: "Checkout fixer",
    model: "Opus 5.5",
    logo: <ModelBrandMark model="claude" size={14} />,
    limit: 200000,
    blocks: FIXER_AFTER_COMPACTION,
    compaction: {
      before: FIXER_BEFORE_COMPACTION,
      summarized: ["chat"],
      dropped: ["results"],
      summary: FIXER_SUMMARY_BLOCK,
    },
  },
  {
    id: "scout",
    name: "Codebase scout",
    model: "Gemini 3.8 Pro",
    logo: <ModelBrandMark model="gemini" size={14} />,
    limit: 1000000,
    blocks: [
      {
        id: "sc-sys",
        label: "System prompt",
        kind: "system",
        tokens: 8400,
        detail: "Read-only repository indexing and dependency tracing instructions.",
      },
      {
        id: "sc-files",
        label: "Indexed modules · 42",
        kind: "file",
        tokens: 184000,
        detail: "Full AST symbols and route handlers across src/ and packages/.",
      },
      {
        id: "sc-res",
        label: "Search hits · 64",
        kind: "result",
        tokens: 52000,
        detail: "Cross-package call graph matches for billing and webhook handlers.",
      },
    ],
    compaction: null,
  },
  {
    id: "triage",
    name: "Support triage",
    model: "GPT-6 Mini",
    logo: <ModelBrandMark model="openai" size={14} />,
    limit: 128000,
    blocks: [
      {
        id: "tr-sys",
        label: "System prompt",
        kind: "system",
        tokens: 5200,
        detail: "Escalation rubric and customer SLA response guidelines.",
      },
      {
        id: "tr-mem",
        label: "Billing runbook",
        kind: "memory",
        tokens: 11400,
        detail: "Known Stripe error codes and refund eligibility rules.",
      },
      {
        id: "tr-chat",
        label: "Ticket #4821 thread",
        kind: "chat",
        tokens: 26800,
        detail: "Customer conversation and attached invoice metadata.",
      },
    ],
    compaction: null,
  },
];

interface TileItem {
  id: string;
  label: string;
  kind: ContextBlockKind | "free";
  tokens: number;
  fate?: "kept" | "summarized" | "dropped" | "summary";
  block?: ContextBlock;
}

interface LayoutRect {
  item: TileItem;
  x: number;
  y: number;
  w: number;
  h: number;
}

function sliceItems(
  items: TileItem[],
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutRect[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  if (items.length === 1) {
    return [{ item: items[0], x, y, w, h }];
  }
  const total = items.reduce((s, it) => s + Math.max(1, it.tokens), 0);
  if (items.length === 2) {
    const ratio = Math.max(1, items[0].tokens) / total;
    if (w >= h * 1.15) {
      const w1 = w * ratio;
      return [
        { item: items[0], x, y, w: w1, h },
        { item: items[1], x: x + w1, y, w: w - w1, h },
      ];
    }
    const h1 = h * ratio;
    return [
      { item: items[0], x, y, w, h: h1 },
      { item: items[1], x, y: y + h1, w, h: h - h1 },
    ];
  }

  let acc = 0;
  let split = 1;
  for (let i = 0; i < items.length - 1; i += 1) {
    acc += Math.max(1, items[i].tokens);
    split = i + 1;
    if (acc >= total * 0.45) break;
  }
  const groupA = items.slice(0, split);
  const groupB = items.slice(split);
  const ratioA = groupA.reduce((s, it) => s + Math.max(1, it.tokens), 0) / total;

  if (w >= h * 1.15) {
    const wA = w * ratioA;
    return [
      ...sliceItems(groupA, x, y, wA, h),
      ...sliceItems(groupB, x + wA, y, w - wA, h),
    ];
  }
  const hA = h * ratioA;
  return [
    ...sliceItems(groupA, x, y, w, hA),
    ...sliceItems(groupB, x, y + hA, w, h - hA),
  ];
}

function layoutContextTiles(
  usedItems: TileItem[],
  freeItem: TileItem | null,
  areaW: number,
  areaH: number,
): LayoutRect[] {
  const pad = 3;
  const innerW = Math.max(40, areaW - pad * 2);
  const innerH = Math.max(40, areaH - pad * 2);
  const usedTotal = usedItems.reduce((s, it) => s + Math.max(0, it.tokens), 0);
  const freeTotal = freeItem ? Math.max(0, freeItem.tokens) : 0;
  const allTotal = Math.max(1, usedTotal + freeTotal);

  if (!freeItem || freeTotal <= 0) {
    return sliceItems(usedItems, pad, pad, innerW, innerH);
  }
  if (usedItems.length === 0) {
    return [{ item: freeItem, x: pad, y: pad, w: innerW, h: innerH }];
  }

  const usedShare = Math.min(0.96, Math.max(0.08, usedTotal / allTotal));
  if (innerW >= innerH) {
    const usedW = innerW * usedShare;
    const usedRects =
      usedW < 150
        ? (() => {
            let cy = pad;
            return usedItems.map((it) => {
              const rh = innerH * (Math.max(1, it.tokens) / Math.max(1, usedTotal));
              const rect: LayoutRect = { item: it, x: pad, y: cy, w: usedW, h: rh };
              cy += rh;
              return rect;
            });
          })()
        : sliceItems(usedItems, pad, pad, usedW, innerH);
    return [
      ...usedRects,
      { item: freeItem, x: pad + usedW, y: pad, w: innerW - usedW, h: innerH },
    ];
  }

  const usedH = innerH * usedShare;
  return [
    ...sliceItems(usedItems, pad, pad, innerW, usedH),
    { item: freeItem, x: pad, y: pad + usedH, w: innerW, h: innerH - usedH },
  ];
}

function fmtTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  const k = tokens / 1000;
  if (k >= 100) return `${Math.round(k)}k`;
  if (k >= 10) return `${k.toFixed(1).replace(/\.0$/, "")}k`;
  return `${k.toFixed(1)}k`;
}

function fmtLimit(limit: number): string {
  return `${Math.round(limit / 1000)}k`;
}

/**
 * Context Map — 1:1 proportional context window treemap with multi-agent picker,
 * live growth & compaction choreography, Before | After view, and block inspector popover.
 */
export function AfContextMap({
  blocks: blocksProp,
  limit: limitProp,
  budget,
  model = "Opus 5.5",
  modelIcon,
  agents: agentsProp,
  agent: agentProp,
  onAgentChange,
  compaction: compactionProp,
  view: viewProp,
  onViewChange,
  status: statusProp,
  onSelect,
  title = "Context",
  className,
  style,
}: AfContextMapProps = {}) {
  const headingId = useId();
  const isDefaultDemo = !blocksProp && !agentsProp && compactionProp === undefined;
  const agents = agentsProp ?? DEFAULT_AGENTS;

  // Demo phases for "fixer": 0 (initial 30.4k) -> 1 (64.8k) -> 2 (171k high) -> 3 (compacting…) -> 4 (compacted 86.2k with Before|After)
  const [demoStage, setDemoStage] = useState<0 | 1 | 2 | 3 | 4>(isDefaultDemo ? 0 : 4);

  const [activeAgentId, setActiveAgentId] = useControllableState<string>({
    value: agentProp,
    defaultValue: agents[0]?.id ?? "fixer",
    onChange: onAgentChange,
  });

  const [view, setView] = useControllableState<"before" | "after">({
    value: viewProp,
    defaultValue: "after",
    onChange: onViewChange,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [areaSize, setAreaSize] = useState<{ w: number; h: number }>({ w: 680, h: 280 });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const pickRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isDefaultDemo || activeAgentId !== "fixer") return;
    const t1 = window.setTimeout(() => setDemoStage(1), 1500);
    const t2 = window.setTimeout(() => setDemoStage(2), 3000);
    const t3 = window.setTimeout(() => setDemoStage(3), 4300);
    const t4 = window.setTimeout(() => setDemoStage(4), 5300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [isDefaultDemo, activeAgentId]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setAreaSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (pickRef.current && !pickRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? agents[0];
  const hasCustomSingle = Boolean(blocksProp && !agentsProp);

  const effectiveLimit = limitProp ?? budget ?? activeAgent?.limit ?? 200000;
  const effectiveModel = hasCustomSingle ? model : (activeAgent?.model ?? model);
  const effectiveLogo =
    modelIcon ??
    activeAgent?.logo ?? <ModelBrandMark model={effectiveModel} size={14} />;

  const effectiveCompaction: ContextCompaction | null = useMemo(() => {
    if (compactionProp !== undefined) return compactionProp;
    if (blocksProp) return null;
    if (isDefaultDemo && activeAgentId === "fixer" && demoStage < 4) {
      return null;
    }
    return activeAgent?.compaction ?? null;
  }, [activeAgent, activeAgentId, blocksProp, compactionProp, demoStage, isDefaultDemo]);

  const liveStatus =
    statusProp ??
    (isDefaultDemo && activeAgentId === "fixer" && demoStage === 3
      ? "Compacting…"
      : undefined);

  const displayBlocks = useMemo<ContextBlock[]>(() => {
    if (effectiveCompaction && view === "before") {
      return effectiveCompaction.before;
    }
    if (blocksProp) return blocksProp;
    if (isDefaultDemo && activeAgentId === "fixer") {
      if (demoStage === 0) return FIXER_INITIAL_BLOCKS;
      if (demoStage === 1) return FIXER_GROWING_BLOCKS_1;
      if (demoStage === 2 || demoStage === 3) return FIXER_BEFORE_COMPACTION;
      return FIXER_AFTER_COMPACTION;
    }
    return activeAgent?.blocks ?? FIXER_AFTER_COMPACTION;
  }, [activeAgent, activeAgentId, blocksProp, demoStage, effectiveCompaction, isDefaultDemo, view]);

  const summarizedSet = useMemo(
    () => new Set(effectiveCompaction?.summarized ?? []),
    [effectiveCompaction],
  );
  const droppedSet = useMemo(
    () => new Set(effectiveCompaction?.dropped ?? []),
    [effectiveCompaction],
  );

  const usedTokens = useMemo(
    () => displayBlocks.reduce((sum, b) => sum + Math.max(0, b.tokens), 0),
    [displayBlocks],
  );
  const freeTokens = Math.max(0, effectiveLimit - usedTokens);
  const pct = Math.min(100, Math.round((usedTokens / Math.max(1, effectiveLimit)) * 100));
  const pctLevel = pct >= 95 ? "full" : pct >= 80 ? "high" : undefined;

  const rects = useMemo(() => {
    const usedItems: TileItem[] = displayBlocks
      .filter((b) => b.tokens > 0)
      .map((b) => {
        let fate: TileItem["fate"];
        if (effectiveCompaction) {
          if (view === "before") {
            if (summarizedSet.has(b.id)) fate = "summarized";
            else if (droppedSet.has(b.id)) fate = "dropped";
            else fate = "kept";
          } else if (b.kind === "summary" || effectiveCompaction.summary?.id === b.id) {
            fate = "summary";
          }
        }
        return {
          id: b.id,
          label: b.label,
          kind: b.kind,
          tokens: b.tokens,
          fate,
          block: b,
        };
      });

    const freeItem: TileItem | null =
      freeTokens > 0
        ? {
            id: "__free__",
            label: "Free",
            kind: "free",
            tokens: freeTokens,
          }
        : null;

    return layoutContextTiles(usedItems, freeItem, areaSize.w, areaSize.h);
  }, [areaSize.h, areaSize.w, displayBlocks, droppedSet, effectiveCompaction, freeTokens, summarizedSet, view]);

  const activeTileId = pinnedId ?? hoverId;
  const activeRect = useMemo(
    () => (activeTileId ? rects.find((r) => r.item.id === activeTileId && r.item.block) ?? null : null),
    [activeTileId, rects],
  );

  const fateMetrics = useMemo(() => {
    if (!effectiveCompaction) return null;
    let kept = 0;
    let summarized = 0;
    let dropped = 0;
    for (const b of effectiveCompaction.before) {
      if (summarizedSet.has(b.id)) summarized += b.tokens;
      else if (droppedSet.has(b.id)) dropped += b.tokens;
      else kept += b.tokens;
    }
    const summaryOut =
      effectiveCompaction.summary?.tokens ??
      displayBlocks.find((b) => b.kind === "summary")?.tokens ??
      0;
    return { kept, summarized, dropped, summaryOut };
  }, [displayBlocks, droppedSet, effectiveCompaction, summarizedSet]);

  const isStreamingTokens = Boolean(liveStatus) || (isDefaultDemo && activeAgentId === "fixer" && demoStage < 4);

  return (
    <div
      ref={rootRef}
      className={cn("af-cmpc", className)}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Escape" && pinnedId) {
          setPinnedId(null);
          onSelect?.(null);
        }
      }}
    >
      {/* Top header bar */}
      <header className="af-cmpc__bar">
        <span className="af-cmpc__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.8" y="1.8" width="7" height="12.4" rx="1.6" fill="currentColor" />
            <rect x="10" y="1.8" width="4.2" height="6" rx="1.4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="9" width="4.2" height="5.2" rx="1.4" fill="currentColor" opacity="0.3" />
          </svg>
        </span>

        <span className="af-cmpc__title" id={headingId}>
          {title}
        </span>

        {!hasCustomSingle && agents.length > 1 ? (
          <span ref={pickRef} className="af-cmpc__pick">
            <button
              type="button"
              className="af-cmpc__who af-cmpc__agent"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={activeAgent?.name}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="af-cmpc__logo" aria-hidden="true">
                {effectiveLogo}
              </span>
              <span className="af-cmpc__model">{activeAgent?.name}</span>
              <span className="af-cmpc__limit">{fmtLimit(effectiveLimit)}</span>
              <svg className="af-cmpc__chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="m3.5 4.75 2.5 2.5 2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen ? (
              <div className="af-cmpc__menu" role="menu" aria-label="Select agent context">
                {agents.map((ag) => {
                  const selected = ag.id === activeAgentId;
                  return (
                    <button
                      key={ag.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className="af-cmpc__option"
                      onClick={() => {
                        setActiveAgentId(ag.id);
                        setPinnedId(null);
                        setHoverId(null);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="af-cmpc__logo" aria-hidden="true">
                        {ag.logo ?? <ModelBrandMark model={ag.model ?? ag.name} size={13} />}
                      </span>
                      <span className="af-cmpc__option-text">
                        <span className="af-cmpc__option-name">{ag.name}</span>
                        {ag.model ? (
                          <span className="af-cmpc__option-model">{ag.model}</span>
                        ) : null}
                      </span>
                      <span className="af-cmpc__limit">{fmtLimit(ag.limit)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </span>
        ) : (
          <span className="af-cmpc__who">
            <span className="af-cmpc__logo" aria-hidden="true">
              {effectiveLogo}
            </span>
            <span className="af-cmpc__model">{effectiveModel}</span>
            <span className="af-cmpc__limit">{fmtLimit(effectiveLimit)}</span>
          </span>
        )}

        {liveStatus ? (
          <span className="af-cmpc__status" role="status">
            <svg className="af-cmpc__spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.8" />
              <path d="M8 2.2A5.8 5.8 0 0 1 13.8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="af-cmpc__status-text">{liveStatus}</span>
          </span>
        ) : null}

        {effectiveCompaction ? (
          <span className="af-cmpc__compare" role="group" aria-label="Compare compaction">
            <button
              type="button"
              aria-pressed={view === "before"}
              onClick={() => {
                setPinnedId(null);
                setView("before");
              }}
            >
              Before
            </button>
            <button
              type="button"
              aria-pressed={view === "after"}
              onClick={() => {
                setPinnedId(null);
                setView("after");
              }}
            >
              After
            </button>
          </span>
        ) : null}

        <span className="af-cmpc__sum">
          <span>
            <b className={isStreamingTokens ? "af-cmpc__used" : undefined}>
              {fmtTokens(usedTokens)}
            </b>{" "}
            / {fmtLimit(effectiveLimit)}
          </span>
          <span className="af-cmpc__pct" data-level={pctLevel}>
            {pct}%
          </span>
        </span>
      </header>

      {/* Proportional treemap canvas */}
      <div
        ref={areaRef}
        className="af-cmpc__area"
        role="list"
        aria-labelledby={headingId}
      >
        {rects.map((rect) => {
          const { item, x, y, w, h } = rect;
          const isFree = item.kind === "free";
          const isPinned = pinnedId === item.id;
          const dimmed = Boolean(activeTileId && activeTileId !== item.id && !isFree);
          const showName = w >= 54 && h >= 26;
          const showTokens = w >= 54 && h >= 42;
          const showKind = w >= 132 && h >= 44 && !isFree;

          const tileVars = {
            "--x": `${x.toFixed(2)}px`,
            "--y": `${y.toFixed(2)}px`,
            "--w": `${w.toFixed(2)}px`,
            "--h": `${h.toFixed(2)}px`,
          } as CSSProperties;

          if (isFree) {
            return (
              <div
                key={item.id}
                role="listitem"
                className="af-cmpc__tile"
                data-kind="free"
                aria-label={`Free – ${fmtTokens(item.tokens)} tokens`}
                style={tileVars}
                onClick={() => {
                  if (pinnedId) {
                    setPinnedId(null);
                    onSelect?.(null);
                  }
                }}
              >
                <span className="af-cmpc__label" aria-hidden="true">
                  <span className="af-cmpc__name" data-show={showName ? "" : undefined}>
                    Free
                  </span>
                  <span className="af-cmpc__tokens" data-show={showTokens ? "" : undefined}>
                    {fmtTokens(item.tokens)}
                  </span>
                </span>
              </div>
            );
          }

          const block = item.block!;
          const kindName = KIND_LABEL[block.kind];

          return (
            <div
              key={item.id}
              role="listitem"
              tabIndex={0}
              className="af-cmpc__tile"
              data-kind={block.kind}
              data-fate={item.fate}
              data-pinned={isPinned || undefined}
              data-dim={dimmed || undefined}
              aria-label={`${block.label}, ${kindName} – ${fmtTokens(block.tokens)} tokens`}
              style={tileVars}
              onPointerEnter={() => {
                if (!pinnedId) setHoverId(block.id);
              }}
              onPointerLeave={() => {
                if (!pinnedId) setHoverId((cur) => (cur === block.id ? null : cur));
              }}
              onFocus={() => {
                if (!pinnedId) setHoverId(block.id);
              }}
              onBlur={() => {
                if (!pinnedId) setHoverId((cur) => (cur === block.id ? null : cur));
              }}
              onClick={() => {
                const next = isPinned ? null : block.id;
                setPinnedId(next);
                setHoverId(next);
                onSelect?.(next ? block : null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const next = isPinned ? null : block.id;
                  setPinnedId(next);
                  setHoverId(next);
                  onSelect?.(next ? block : null);
                }
              }}
            >
              {item.fate === "summary" && w >= 46 && h >= 32 ? (
                <span className="af-cmpc__badge" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1.2c.35 2.4 1.6 3.65 4 4-2.4.35-3.65 1.6-4 4-.35-2.4-1.6-3.65-4-4 2.4-.35 3.65-1.6 4-4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              ) : null}

              <span className="af-cmpc__label" aria-hidden="true">
                <span className="af-cmpc__name" data-show={showName ? "" : undefined}>
                  {block.icon ? <span className="af-cmpc__icon">{block.icon}</span> : null}
                  {block.label}
                </span>
                <span className="af-cmpc__tokens" data-show={showTokens ? "" : undefined}>
                  {fmtTokens(block.tokens)}
                  {showKind ? (
                    <span className="af-cmpc__kind" data-show="">
                      {" "}
                      · {kindName}
                    </span>
                  ) : null}
                </span>
              </span>
            </div>
          );
        })}

        {/* Floating inspector tooltip clamped inside treemap area */}
        {activeRect && activeRect.item.block ? (
          (() => {
            const b = activeRect.item.block;
            const sharePct = Math.max(
              1,
              Math.round((b.tokens / Math.max(1, effectiveLimit)) * 100),
            );
            const tipLeft = Math.min(
              Math.max(8, activeRect.x + 8),
              Math.max(8, areaSize.w - 292),
            );
            const placeAbove = activeRect.y > 148;
            const tipTop = placeAbove
              ? Math.max(8, activeRect.y - 8)
              : Math.min(areaSize.h - 24, activeRect.y + Math.min(activeRect.h, 64) + 6);

            return (
              <div
                className="af-cmpc__tip"
                data-kind={b.kind}
                style={{
                  left: tipLeft,
                  top: tipTop,
                  transform: placeAbove ? "translateY(-100%)" : undefined,
                }}
                role="tooltip"
              >
                <div className="af-cmpc__tip-head">
                  <span className="af-cmpc__swatch" aria-hidden="true" />
                  <span className="af-cmpc__tip-name">{b.label}</span>
                </div>
                <div className="af-cmpc__tip-meta">
                  {fmtTokens(b.tokens)} tokens · {sharePct}% of {fmtLimit(effectiveLimit)} ·{" "}
                  {KIND_LABEL[b.kind]}
                </div>
                {b.detail ? <div className="af-cmpc__tip-detail">{b.detail}</div> : null}
                {activeRect.item.fate === "summarized" ? (
                  <div className="af-cmpc__tip-fate" data-fate="summarized">
                    <span>Summarized into Summary on compaction</span>
                  </div>
                ) : activeRect.item.fate === "dropped" ? (
                  <div className="af-cmpc__tip-fate" data-fate="dropped">
                    <span>Dropped during compaction</span>
                  </div>
                ) : activeRect.item.fate === "summary" ? (
                  <div className="af-cmpc__tip-fate" data-fate="summary">
                    <span>Compacted from earlier conversation turns</span>
                  </div>
                ) : null}
                {b.items?.length ? (
                  <ul className="af-cmpc__tip-items">
                    {b.items.slice(0, 4).map((it) => (
                      <li key={it.label}>
                        {it.icon ? <span className="af-cmpc__logo">{it.icon}</span> : null}
                        <span className="af-cmpc__tip-item">{it.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })()
        ) : null}
      </div>

      {/* Bottom compaction fate summary */}
      <div className="af-cmpc__fates-row">
        {fateMetrics ? (
          <p className="af-cmpc__fates">
            <span className="af-cmpc__fate" data-fate="kept">
              Kept <b>{fmtTokens(fateMetrics.kept)}</b>
            </span>
            {fateMetrics.summarized > 0 ? (
              <span className="af-cmpc__fate" data-fate="summarized">
                Summarized <b>{fmtTokens(fateMetrics.summarized)}</b> →{" "}
                <b>{fmtTokens(fateMetrics.summaryOut)}</b>
              </span>
            ) : null}
            {fateMetrics.dropped > 0 ? (
              <span className="af-cmpc__fate" data-fate="dropped">
                Dropped <b>{fmtTokens(fateMetrics.dropped)}</b>
              </span>
            ) : null}
          </p>
        ) : (
          <p className="af-cmpc__fates af-cmpc__fates--none">
            Not compacted yet – once it is, compare before and after here.
          </p>
        )}
      </div>
    </div>
  );
}

export const ContextMap = AfContextMap;
export const AfContextMapPattern = AfContextMap;
