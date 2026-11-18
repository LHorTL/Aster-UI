import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn, useControllableState } from "../../primitives";
import { AgentPixelMark, ModelBrandMark, ToolBrandMark } from "../agents-c/_marks";

export type CostStepKind = "agent" | "llm" | "tool";
export type CostStepStatus = "running" | "done" | "failed";

export interface CostStep {
  id: string;
  name: string;
  kind: CostStepKind;
  status: CostStepStatus;
  model?: string;
  detail?: string;
  icon?: ReactNode;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  duration?: number;
  input?: string;
  output?: string;
  error?: string;
  children?: CostStep[];
}

/** Legacy stage interface alias. */
export interface CostWaterfallStage {
  id: string;
  label: string;
  model: string;
  cachedUsd: number;
  inputUsd: number;
  outputUsd: number;
  tokensK: number;
}

export interface AfCostWaterfallProps {
  /** Hierarchical step tree (sub-agents sum their children). */
  steps?: CostStep[];
  /** Legacy stages prop. */
  stages?: CostWaterfallStage[];
  /** Task subtitle shown next to the heading. */
  task?: string;
  /** Override overall run status badge. */
  status?: CostStepStatus;
  /** Controlled metric mode ("cost" | "tokens"). */
  mode?: "cost" | "tokens";
  /** Initial metric mode. */
  defaultMode?: "cost" | "tokens";
  /** Metric mode change callback. */
  onModeChange?: (mode: "cost" | "tokens") => void;
  /** Controlled folded sub-agent IDs. */
  collapsed?: string[];
  /** Initial folded sub-agent IDs. */
  defaultCollapsed?: string[];
  /** Fold change callback. */
  onCollapsedChange?: (collapsed: string[]) => void;
  /** Controlled open detail step ID. */
  openId?: string | null;
  /** Initial open detail step ID. */
  defaultOpenId?: string | null;
  /** Open detail change callback. */
  onOpenChange?: (id: string | null, step?: CostStep) => void;
  /** Max scroll height for rows in px. */
  maxHeight?: number;
  /** Custom currency formatter. */
  formatCost?: (amount: number) => string;
  /** Heading label. */
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export type AfCostWaterfallPatternProps = AfCostWaterfallProps;

function GlobeStepIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.3" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="7" cy="7" rx="2.4" ry="5.3" stroke="currentColor" strokeWidth="1.1" />
      <path d="M1.9 7h10.2" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function PageStepIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2.5" y="1.8" width="9" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.6 5h4.8M4.6 7.4h4.8M4.6 9.8h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const DEMO_STEPS_FINAL: CostStep[] = [
  {
    id: "plan",
    name: "Plan the report",
    kind: "llm",
    status: "done",
    model: "Opus 5.5",
    tokensIn: 4120,
    tokensOut: 995,
    cost: 0.04,
    duration: 3300,
    input:
      "Write a report on what LLM APIs cost in 2026 — compare the five big providers, with batch and cache discounts.",
    output:
      "1. Research prices and discounts\n2. Write the report\n3. Fact-check every number\n4. Save to Notion",
  },
  {
    id: "researcher",
    name: "Researcher",
    kind: "agent",
    status: "done",
    model: "Gemini 3.8 Flash",
    duration: 5000,
    input: "Gather current per-1M token pricing, prompt caching discounts, and batch rates across Anthropic, OpenAI, Google, xAI, and DeepSeek.",
    output: "Verified 14 model tiers across 5 official pricing pages with cache hit discounts up to 90%.",
    children: [
      {
        id: "r-s1",
        name: "web_search",
        kind: "tool",
        status: "done",
        detail: "API prices 2026",
        icon: <GlobeStepIcon />,
        tokensIn: 320,
        tokensOut: 1840,
        cost: 0.01,
        duration: 1200,
        input: '{ "query": "LLM API pricing per million tokens 2026", "limit": 6 }',
        output: "6 official pricing pages matched (anthropic.com, openai.com, cloud.google.com, docs.x.ai…)",
      },
      {
        id: "r-s2",
        name: "web_search",
        kind: "tool",
        status: "done",
        detail: "cache discounts",
        icon: <GlobeStepIcon />,
        tokensIn: 290,
        tokensOut: 1620,
        cost: 0.01,
        duration: 1100,
        input: '{ "query": "prompt caching batch API discount 2026", "limit": 5 }',
        output: "5 docs pages returned with cached input multipliers (0.1x–0.25x).",
      },
      {
        id: "r-fetch",
        name: "fetch_pages",
        kind: "tool",
        status: "done",
        detail: "8 pages",
        icon: <PageStepIcon />,
        tokensIn: 410,
        tokensOut: 19800,
        cost: 0.0,
        duration: 2300,
        input: '{ "urls": ["https://docs.anthropic.com/pricing", "https://openai.com/api/pricing", "..."] }',
        output: "Extracted clean markdown tables from 8 pricing documents.",
      },
      {
        id: "r-sum",
        name: "Summarize sources",
        kind: "llm",
        status: "done",
        model: "Gemini 3.8 Flash",
        tokensIn: 26400,
        tokensOut: 911,
        cost: 0.02,
        duration: 1400,
        input: "Normalize all 8 pricing tables into USD per 1M input, cached input, and output tokens.",
        output: "Normalized table for Opus 5.5, Sonnet 5.5, GPT-6, Gemini 3.8 Pro, and Grok 4.",
      },
    ],
  },
  {
    id: "write",
    name: "Write the report",
    kind: "llm",
    status: "done",
    model: "Opus 5.5",
    tokensIn: 18200,
    tokensOut: 3420,
    cost: 0.18,
    duration: 6800,
    input: "Draft the executive comparison report with workload scenarios and caching recommendations.",
    output: "# LLM API Pricing in 2026\nPrompt caching cuts multi-turn agent spend by 64–78% across all five providers…",
  },
  {
    id: "notion",
    name: "Save to Notion",
    kind: "tool",
    status: "done",
    detail: "notion_create_page",
    icon: <ToolBrandMark tool="notion" size={12} />,
    tokensIn: 480,
    tokensOut: 140,
    cost: 0.0,
    duration: 920,
    input: '{ "parent": "Engineering Research", "title": "LLM API Prices in 2026" }',
    output: "Created page https://notion.so/LLM-API-Prices-2026",
  },
];

function buildDemoPhaseSteps(phase: 0 | 1 | 2 | 3): CostStep[] {
  if (phase === 0) {
    return [
      {
        ...DEMO_STEPS_FINAL[0],
        status: "running",
        tokensIn: 4100,
        tokensOut: 187,
        cost: 0.03,
        duration: 584,
      },
    ];
  }
  if (phase === 1) {
    const researcher = DEMO_STEPS_FINAL[1];
    return [
      DEMO_STEPS_FINAL[0],
      {
        ...researcher,
        status: "running",
        duration: 3100,
        children: [
          researcher.children![0],
          researcher.children![1],
          { ...researcher.children![2], status: "running", duration: 1100 },
        ],
      },
    ];
  }
  if (phase === 2) {
    return [
      DEMO_STEPS_FINAL[0],
      DEMO_STEPS_FINAL[1],
      {
        ...DEMO_STEPS_FINAL[2],
        status: "running",
        tokensOut: 1920,
        cost: 0.13,
        duration: 4100,
      },
    ];
  }
  return DEMO_STEPS_FINAL;
}

interface ComputedRow {
  step: CostStep;
  depth: number;
  parentId?: string;
  inTok: number;
  outTok: number;
  cost: number;
  duration: number;
  startVal: number;
  spanVal: number;
  splitRatio: number;
}

function safeNum(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function sumStep(step: CostStep): { inTok: number; outTok: number; cost: number; duration: number } {
  if (!step.children?.length) {
    return {
      inTok: safeNum(step.tokensIn),
      outTok: safeNum(step.tokensOut),
      cost: safeNum(step.cost),
      duration: safeNum(step.duration),
    };
  }
  return step.children.reduce(
    (acc, child) => {
      const c = sumStep(child);
      return {
        inTok: acc.inTok + c.inTok,
        outTok: acc.outTok + c.outTok,
        cost: acc.cost + c.cost,
        duration: Math.max(acc.duration, c.duration),
      };
    },
    {
      inTok: safeNum(step.tokensIn),
      outTok: safeNum(step.tokensOut),
      cost: safeNum(step.cost),
      duration: safeNum(step.duration),
    },
  );
}

function fmtShortTok(n: number): string {
  if (n <= 0) return "–";
  if (n < 1000) return String(Math.round(n));
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
}

function fmtTime(ms: number): string {
  if (ms <= 0) return "–";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function defaultFormatCost(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

function computeNiceRange(maxVal: number, mode: "cost" | "tokens"): { range: number; ticks: number[] } {
  if (mode === "cost") {
    const raw = Math.max(0.08, maxVal * 1.12);
    const step = raw <= 0.12 ? 0.05 : raw <= 0.3 ? 0.1 : raw <= 0.6 ? 0.2 : 0.5;
    const range = Math.ceil(raw / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v < range - step * 0.25; v += step) {
      ticks.push(Number(v.toFixed(4)));
    }
    return { range, ticks };
  }
  const raw = Math.max(8000, maxVal * 1.12);
  const step = raw <= 15000 ? 5000 : raw <= 40000 ? 10000 : raw <= 90000 ? 25000 : 50000;
  const range = Math.ceil(raw / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v < range - step * 0.25; v += step) {
    ticks.push(v);
  }
  return { range, ticks };
}

function renderStepIcon(step: CostStep): ReactNode {
  if (step.icon) return step.icon;
  if (step.kind === "agent") {
    return <AgentPixelMark seed={step.name} size={12} active={step.status === "running"} />;
  }
  if (step.kind === "llm") {
    return <ModelBrandMark model={step.model ?? step.name} size={12} />;
  }
  const lower = `${step.name} ${step.detail ?? ""}`.toLowerCase();
  if (lower.includes("notion")) return <ToolBrandMark tool="notion" size={12} />;
  if (lower.includes("search")) return <GlobeStepIcon />;
  if (lower.includes("fetch") || lower.includes("page")) return <PageStepIcon />;
  return <span className="af-cwfc__swatch" />;
}

/**
 * Cost Waterfall — 1:1 hierarchical run cost & token waterfall with live progression,
 * collapsible sub-agents, Cost | Tokens switch, Most expensive jump, and I/O detail panes.
 */
export function AfCostWaterfall({
  steps: stepsProp,
  stages: legacyStages,
  task = "Report on LLM API prices in 2026",
  status: statusOverride,
  mode: modeProp,
  defaultMode = "cost",
  onModeChange,
  collapsed: collapsedProp,
  defaultCollapsed = [],
  onCollapsedChange,
  openId: openIdProp,
  defaultOpenId = null,
  onOpenChange,
  maxHeight,
  formatCost = defaultFormatCost,
  title = "Run cost",
  className,
  style,
}: AfCostWaterfallProps = {}) {
  const isDefaultDemo = !stepsProp && !legacyStages;
  const [demoPhase, setDemoPhase] = useState<0 | 1 | 2 | 3>(isDefaultDemo ? 0 : 3);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isDefaultDemo) return;
    const t1 = window.setTimeout(() => setDemoPhase(1), 1300);
    const t2 = window.setTimeout(() => setDemoPhase(2), 2700);
    const t3 = window.setTimeout(() => setDemoPhase(3), 4100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isDefaultDemo]);

  const steps = useMemo<CostStep[]>(() => {
    if (legacyStages?.length && !stepsProp) {
      return legacyStages.map((s) => ({
        id: s.id,
        name: s.label,
        kind: "llm" as const,
        status: "done" as const,
        model: s.model,
        tokensIn: Math.round(s.tokensK * 700),
        tokensOut: Math.round(s.tokensK * 300),
        cost: s.cachedUsd + s.inputUsd + s.outputUsd,
        duration: 2400,
      }));
    }
    if (stepsProp) return stepsProp;
    return buildDemoPhaseSteps(demoPhase);
  }, [demoPhase, legacyStages, stepsProp]);

  const [mode, setMode] = useControllableState<"cost" | "tokens">({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const [collapsed, setCollapsed] = useControllableState<string[]>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const [openId, setOpenId] = useControllableState<string | null>({
    value: openIdProp,
    defaultValue: defaultOpenId,
  });

  const handleModeSwitch = (next: "cost" | "tokens") => {
    if (next === mode) return;
    setSwitching(true);
    setMode(next);
    window.setTimeout(() => setSwitching(false), 600);
  };

  const {
    visibleRows,
    totalCost,
    totalIn,
    totalOut,
    totalTokens,
    priciest,
  } = useMemo(() => {
    const rows: ComputedRow[] = [];
    let cursor = 0;
    let bestLeaf: { step: CostStep; parentId?: string; cost: number; tok: number } | null = null;

    const walk = (list: CostStep[], depth: number, parentId?: string) => {
      for (const st of list) {
        const totals = sumStep(st);
        const tokSum = totals.inTok + totals.outTok;
        const val = mode === "cost" ? totals.cost : tokSum;
        const hasKids = Boolean(st.children?.length);
        const isFolded = collapsed.includes(st.id);
        const outShare = tokSum > 0 ? Math.min(0.85, Math.max(0, totals.outTok / tokSum)) : 0;

        const rowStart = cursor;
        rows.push({
          step: st,
          depth,
          parentId,
          ...totals,
          startVal: rowStart,
          spanVal: Math.max(0, val),
          splitRatio: outShare,
        });

        if (!hasKids) {
          const curMetric = mode === "cost" ? totals.cost : tokSum;
          const prevMetric = bestLeaf ? (mode === "cost" ? bestLeaf.cost : bestLeaf.tok) : -1;
          if (curMetric > prevMetric) {
            bestLeaf = { step: st, parentId, cost: totals.cost, tok: tokSum };
          }
        }

        if (hasKids && !isFolded) {
          walk(st.children!, depth + 1, st.id);
        } else {
          cursor += Math.max(0, val);
        }
      }
    };

    walk(steps, 0);

    const rootSums = steps.reduce(
      (acc, st) => {
        const t = sumStep(st);
        return {
          cost: acc.cost + t.cost,
          inTok: acc.inTok + t.inTok,
          outTok: acc.outTok + t.outTok,
        };
      },
      { cost: 0, inTok: 0, outTok: 0 },
    );

    return {
      visibleRows: rows,
      totalCost: rootSums.cost,
      totalIn: rootSums.inTok,
      totalOut: rootSums.outTok,
      totalTokens: rootSums.inTok + rootSums.outTok,
      priciest: bestLeaf as { step: CostStep; parentId?: string; cost: number; tok: number } | null,
    };
  }, [collapsed, mode, steps]);

  const { range, ticks } = useMemo(
    () => computeNiceRange(mode === "cost" ? totalCost : totalTokens, mode),
    [mode, totalCost, totalTokens],
  );

  const runState: CostStepStatus =
    statusOverride ??
    (steps.some((s) => s.status === "failed" || s.children?.some((c) => c.status === "failed"))
      ? "failed"
      : steps.some((s) => s.status === "running" || s.children?.some((c) => c.status === "running"))
        ? "running"
        : "done");

  const toggleFold = (id: string) => {
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDetail = (step: CostStep) => {
    const next = openId === step.id ? null : step.id;
    setOpenId(next);
    onOpenChange?.(next, next ? step : undefined);
  };

  const jumpToPriciest = () => {
    if (!priciest) return;
    if (priciest.parentId && collapsed.includes(priciest.parentId)) {
      setCollapsed((prev) => prev.filter((x) => x !== priciest.parentId));
    }
    setOpenId(priciest.step.id);
    onOpenChange?.(priciest.step.id, priciest.step);
  };

  return (
    <div
      className={cn("af-cwfc", className)}
      data-mode={mode}
      data-switching={switching || undefined}
      style={{ "--af-cwfc-range": range, ...style } as CSSProperties}
    >
      {/* Header bar */}
      <header className="af-cwfc__head">
        <span className="af-cwfc__spark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M7 1.2c.4 2.9 1.9 4.4 4.8 4.8-2.9.4-4.4 1.9-4.8 4.8C6.6 7.9 5.1 6.4 2.2 6 5.1 5.6 6.6 4.1 7 1.2Z"
              fill="currentColor"
            />
            <circle cx="11.6" cy="11.4" r="1.1" fill="currentColor" opacity="0.55" />
          </svg>
        </span>

        <span className="af-cwfc__heading">{title}</span>
        {task ? (
          <span className="af-cwfc__task" dir="auto" title={task}>
            {task}
          </span>
        ) : null}

        <span className="af-cwfc__switch" role="group" aria-label="Measure by">
          <button
            type="button"
            aria-pressed={mode === "cost"}
            onClick={() => handleModeSwitch("cost")}
          >
            Cost
          </button>
          <button
            type="button"
            aria-pressed={mode === "tokens"}
            onClick={() => handleModeSwitch("tokens")}
          >
            Tokens
          </button>
        </span>

        <span className="af-cwfc__pill" data-status={runState} aria-live="polite">
          {runState === "running" ? <span className="af-cwfc__pulse" aria-hidden="true" /> : null}
          {runState === "running" ? "Live" : runState === "failed" ? "Failed" : "Done"}
        </span>
      </header>

      {/* 3-column summary stats */}
      <dl className="af-cwfc__stats">
        <div className="af-cwfc__stat">
          <dt>Total cost</dt>
          <dd>
            <span
              className="af-cwfc__amount"
              data-live={runState === "running" ? "" : undefined}
            >
              {formatCost(totalCost)}
            </span>
          </dd>
        </div>

        <div className="af-cwfc__stat">
          <dt>Total tokens</dt>
          <dd>
            <span
              className="af-cwfc__amount"
              data-live={runState === "running" ? "" : undefined}
            >
              {fmtShortTok(totalTokens)}
            </span>
            <span className="af-cwfc__sub">
              {fmtShortTok(totalIn)} in · {fmtShortTok(totalOut)} out
            </span>
          </dd>
        </div>

        <div className="af-cwfc__stat af-cwfc__stat--wide">
          <dt>Most expensive</dt>
          <dd>
            {priciest ? (
              <button
                type="button"
                className="af-cwfc__top"
                onClick={jumpToPriciest}
              >
                <span className="af-cwfc__top-name" dir="auto" title={priciest.step.name}>
                  {priciest.step.name}
                </span>
                <span className="af-cwfc__sub">
                  {mode === "cost" ? formatCost(priciest.cost) : fmtShortTok(priciest.tok)}
                </span>
              </button>
            ) : (
              <span className="af-cwfc__sub">–</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Waterfall table body */}
      <div className="af-cwfc__body">
        <div className="af-cwfc__layer" aria-hidden="true">
          {ticks.map((v, idx) => (
            <span
              key={v}
              className="af-cwfc__tick"
              data-zero={idx === 0 ? "" : undefined}
              style={{ "--v": v } as CSSProperties}
            >
              <span>
                {mode === "cost"
                  ? v === 0
                    ? "$0"
                    : formatCost(v)
                  : v === 0
                    ? "0"
                    : fmtShortTok(v)}
              </span>
            </span>
          ))}
        </div>

        <div className="af-cwfc__cols" aria-hidden="true">
          <span className="af-cwfc__col-name">Step</span>
          <span className="af-cwfc__col-track" />
          <span className="af-cwfc__col-num" data-col="in">
            In
          </span>
          <span className="af-cwfc__col-num" data-col="out">
            Out
          </span>
          <span className="af-cwfc__col-num" data-col="cost">
            {mode === "cost" ? "Cost" : "Tokens"}
          </span>
          <span className="af-cwfc__col-num" data-col="time">
            Time
          </span>
        </div>

        <div
          className="af-cwfc__rows"
          role="tree"
          aria-label="Run cost"
          data-scroll={maxHeight ? "" : undefined}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {visibleRows.map((row, rowIdx) => {
            const {
              step,
              depth,
              inTok,
              outTok,
              cost,
              duration,
              startVal,
              spanVal,
              splitRatio,
            } = row;
            const hasKids = Boolean(step.children?.length);
            const isFolded = collapsed.includes(step.id);
            const isOpen = openId === step.id;
            const isTopStep =
              visibleRows.length > 2 && !hasKids && priciest?.step.id === step.id;
            const subtitle = step.model ?? step.detail;
            const ioLabels =
              step.kind === "agent"
                ? ["Task", "Result"]
                : step.kind === "llm"
                  ? ["Prompt", "Response"]
                  : ["Input", "Output"];

            return (
              <div
                key={step.id}
                className="af-cwfc__item"
                style={{ "--af-cwfc-delay": `${rowIdx * 28}ms` } as CSSProperties}
              >
                <div className="af-cwfc__clip">
                  <div
                    className="af-cwfc__row"
                    role="treeitem"
                    aria-level={depth + 1}
                    aria-expanded={hasKids ? !isFolded : undefined}
                    aria-selected={isOpen}
                    tabIndex={0}
                    data-kind={step.kind}
                    data-status={step.status}
                    data-parent={hasKids ? "" : undefined}
                    data-folded={isFolded ? "" : undefined}
                    data-open={isOpen ? "" : undefined}
                    style={
                      {
                        "--s": startVal,
                        "--d": spanVal,
                        "--split": splitRatio,
                      } as CSSProperties
                    }
                    onClick={() => toggleDetail(step)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDetail(step);
                      } else if (hasKids && e.key === "ArrowLeft" && !isFolded) {
                        e.preventDefault();
                        toggleFold(step.id);
                      } else if (hasKids && e.key === "ArrowRight" && isFolded) {
                        e.preventDefault();
                        toggleFold(step.id);
                      }
                    }}
                  >
                    <div className="af-cwfc__name">
                      {depth > 0 ? (
                        <span
                          className="af-cwfc__guides"
                          style={{ width: depth * 14 }}
                          aria-hidden="true"
                        />
                      ) : null}

                      {hasKids ? (
                        <button
                          type="button"
                          className="af-cwfc__chev"
                          aria-label={isFolded ? `Expand ${step.name}` : `Collapse ${step.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFold(step.id);
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path
                              d="M2.5 3.75 5 6.25l2.5-2.5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      ) : (
                        <span className="af-cwfc__chev" data-leaf="" aria-hidden="true" />
                      )}

                      <span className="af-cwfc__icon" aria-hidden="true">
                        {renderStepIcon(step)}
                      </span>

                      <span
                        className="af-cwfc__label"
                        title={subtitle ? `${step.name} · ${subtitle}` : step.name}
                      >
                        <span className="af-cwfc__title" dir="auto">
                          {step.name}
                        </span>
                        {subtitle ? (
                          <span className="af-cwfc__model" dir="auto">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>

                      {hasKids && isFolded ? (
                        <span className="af-cwfc__more">+{step.children!.length}</span>
                      ) : null}

                      {isTopStep ? <span className="af-cwfc__flag">Top</span> : null}

                      {step.status === "running" ? (
                        <span className="af-cwfc__state" data-status="running" aria-hidden="true">
                          <svg className="af-cwfc__spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                            <path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                          </svg>
                        </span>
                      ) : step.status === "failed" ? (
                        <span className="af-cwfc__state" data-status="failed" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="4.8" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M6 3.6v2.8M6 8.2v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </span>
                      ) : null}
                    </div>

                    <div className="af-cwfc__track" aria-hidden="true">
                      <span
                        className="af-cwfc__bar"
                        data-kind={step.kind}
                        data-status={step.status}
                      >
                        <span className="af-cwfc__out" />
                      </span>
                    </div>

                    <span className="af-cwfc__num" data-col="in">
                      <span
                        className="af-cwfc__amount"
                        data-live={step.status === "running" ? "" : undefined}
                      >
                        {fmtShortTok(inTok)}
                      </span>
                    </span>

                    <span className="af-cwfc__num" data-col="out">
                      <span
                        className="af-cwfc__amount"
                        data-live={step.status === "running" ? "" : undefined}
                      >
                        {fmtShortTok(outTok)}
                      </span>
                    </span>

                    <span className="af-cwfc__num" data-col="cost">
                      <span
                        className="af-cwfc__amount"
                        data-live={step.status === "running" ? "" : undefined}
                      >
                        {mode === "cost" ? formatCost(cost) : fmtShortTok(inTok + outTok)}
                      </span>
                    </span>

                    <span className="af-cwfc__num" data-col="time">
                      <span
                        className="af-cwfc__amount"
                        data-live={step.status === "running" ? "" : undefined}
                      >
                        {fmtTime(duration)}
                      </span>
                    </span>
                  </div>

                  {isOpen ? (
                    <div className="af-cwfc__detail">
                      <div
                        className="af-cwfc__detail-in"
                        style={{ "--af-cwfc-level": depth } as CSSProperties}
                      >
                        {depth > 0 ? <span className="af-cwfc__guides" aria-hidden="true" /> : null}
                        {step.error ? (
                          <div className="af-cwfc__error">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <circle cx="6" cy="6" r="4.8" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M6 3.6v2.8M6 8.2v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            <span>{step.error}</span>
                          </div>
                        ) : null}
                        <div className="af-cwfc__io">
                          <div>
                            <span>{ioLabels[0]}</span>
                            <p
                              tabIndex={0}
                              data-mono={step.kind === "tool" ? "" : undefined}
                            >
                              {step.input ?? "—"}
                            </p>
                          </div>
                          <div>
                            <span>{ioLabels[1]}</span>
                            <p
                              tabIndex={0}
                              data-live={step.status === "running" ? "" : undefined}
                            >
                              {step.output ?? (step.status === "running" ? "Streaming…" : "—")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const CostWaterfall = AfCostWaterfall;
export const AfCostWaterfallPattern = AfCostWaterfall;
