import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfButton, AfTag } from "../../ui";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import {
  AgbBrandLogo,
  Fact,
  InboxStatusIcon,
  SparkleDotIcon,
  StagePopover,
  TRACE_INITIAL,
  TraceSpan,
  buildTrace,
  useStagePlacement,
} from "../_shared/agents-b";

export type { TraceSpan };

export interface TraceSpanTree extends Omit<TraceSpan, "depth" | "parent"> {
  children?: TraceSpanTree[];
}

function flattenSpanTree(root: TraceSpanTree, depth = 0, parent?: string): TraceSpan[] {
  const self: TraceSpan = {
    id: root.id,
    name: root.name,
    detail: root.detail,
    kind: root.kind,
    brand: root.brand,
    start: root.start,
    duration: root.duration,
    running: root.running,
    cost: root.cost,
    tokensIn: root.tokensIn,
    tokensOut: root.tokensOut,
    input: root.input,
    output: root.output,
    depth,
    parent,
  };
  return [
    self,
    ...(root.children ?? []).flatMap((child) => flattenSpanTree(child, depth + 1, root.id)),
  ];
}

export interface AfTraceWaterfallPatternProps {
  /** Header title. */
  title?: ReactNode;
  /** Prompt / task subtitle. */
  taskTitle?: ReactNode;
  /** Flat spans list (optional). */
  spans?: TraceSpan[];
  /** Nested root span tree (optional). */
  root?: TraceSpanTree;
  /** Optional start timestamp descriptor. */
  startedAt?: string | number;
  /** Controlled elapsed seconds (`now`). */
  now?: number;
  /** Initially collapsed span IDs. */
  defaultCollapsed?: string[];
  /** Collapsed change callback. */
  onCollapsedChange?: (collapsed: string[]) => void;
  /** Controlled open span ID for detail popover. */
  openId?: string | null;
  /** Default open span ID. */
  defaultOpenId?: string | null;
  /** Detail popover toggle callback. */
  onOpenChange?: (spanId: string | null) => void;
  /** Highlight slowest finished span (`true` by default). */
  markSlowest?: boolean;
  /** Minimum axis range in seconds (`10` by default). */
  minRange?: number;
  /** Cost formatter. */
  formatCost?: (cost: number) => string;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

function formatTraceTokens(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function TraceWaterfallDemo({
  title = "Trace",
  taskTitle = "Launch the new pricing page by Friday",
  spans: spansProp,
  root,
  now: nowProp,
  defaultCollapsed = [],
  onCollapsedChange,
  openId: openIdProp,
  defaultOpenId = null,
  onOpenChange,
  markSlowest = true,
  minRange = 10,
  formatCost = (v) => `$${v.toFixed(2)}`,
  className,
  style,
}: AfTraceWaterfallPatternProps = {}) {
  const [liveSec, setLiveSec] = useState(2.7);
  const [collapsed, setCollapsed] = useState<string[]>(defaultCollapsed);
  const [focusRow, setFocusRow] = useState("root");
  const [openId, setOpenId] = useControllableState<string | null>({
    value: openIdProp,
    defaultValue: defaultOpenId,
    onChange: onOpenChange,
  });
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const { place, show, hide } = useStagePlacement();

  useEffect(() => {
    if (nowProp !== undefined || spansProp || root) return;
    const timer = window.setInterval(() => {
      setLiveSec((prev) => (prev >= 10.8 ? 10.8 : Math.min(10.8, +(prev + 0.15).toFixed(2))));
    }, 150);
    return () => window.clearInterval(timer);
  }, [nowProp, spansProp, root]);

  const effectiveNow = nowProp ?? liveSec;
  const built = buildTrace(effectiveNow, TRACE_INITIAL);
  const treeSpans = useMemo(() => (root ? flattenSpanTree(root) : undefined), [root]);
  const spans = spansProp ?? treeSpans ?? built.spans;
  const isDone = spansProp || treeSpans ? !spans.some((s) => s.running) : built.done;

  const maxSpanEnd = spans.reduce((max, s) => Math.max(max, s.start + s.duration), 0);
  const axis = maxSpanEnd > 12 ? 15 : maxSpanEnd > 10 ? 12 : Math.max(10, minRange);
  const ticks = axis <= 10 ? [0, 2, 4, 6, 8] : axis <= 12 ? [0, 2, 4, 6, 8, 10] : [0, 3, 6, 9, 12];

  const openSpan = openId ? spans.find((s) => s.id === openId) ?? null : null;
  const totalDuration = spansProp || treeSpans ? maxSpanEnd : built.end;
  const totalCost = spans.reduce((sum, s) => {
    if (s.id === "root") return sum;
    const fullSpan = TRACE_INITIAL.find((base) => base.id === s.id);
    const ratio = fullSpan && fullSpan.duration > 0 ? Math.min(1, s.duration / fullSpan.duration) : 1;
    return sum + (s.cost ?? (s.kind === "llm" ? 0.05 : 0.01)) * ratio;
  }, 0.02);
  const totalTokens = spans.reduce((sum, s) => {
    const fullSpan = TRACE_INITIAL.find((base) => base.id === s.id);
    const ratio = fullSpan && fullSpan.duration > 0 ? Math.min(1, s.duration / fullSpan.duration) : 1;
    return sum + Math.round(((s.tokensIn ?? 600) + (s.tokensOut ?? 200)) * ratio);
  }, 0);
  const llmCalls = spans.filter((span) => span.kind === "llm").length;
  const toolCalls = spans.filter((span) => span.kind === "tool").length;
  const slowest = isDone
    ? spans
        .filter((span) => span.kind !== "agent")
        .reduce((best, span) => (span.duration > best.duration ? span : best), { duration: 0 } as TraceSpan)
    : null;

  const isHidden = (span: TraceSpan): boolean => {
    let parent = span.parent;
    while (parent) {
      if (collapsed.includes(parent)) return true;
      parent = spans.find((item) => item.id === parent)?.parent;
    }
    return false;
  };
  const visible = spans.filter((span) => !isHidden(span));
  const hasChildren = (id: string) => spans.some((span) => span.parent === id);
  const childIds = (id: string) => spans.filter((span) => span.parent === id).map((span) => span.id);

  const toggle = (id: string) => {
    setCollapsed((list) => {
      const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
      onCollapsedChange?.(next);
      return next;
    });
  };

  const moveFocus = (index: number) => {
    const next = visible[Math.max(0, Math.min(visible.length - 1, index))];
    if (!next) return;
    setFocusRow(next.id);
    rowRefs.current.get(next.id)?.focus();
  };

  const openDetail = (span: TraceSpan, element: HTMLElement) => {
    if (openId === span.id) {
      hide();
      setOpenId(null);
      return;
    }
    setOpenId(span.id);
    const barEl = element.querySelector<HTMLElement>(".af-agb-trace__bar") ?? element;
    show(barEl, 316);
  };

  const replay = () => {
    if (nowProp !== undefined || spansProp || root) return;
    hide();
    setOpenId(null);
    setLiveSec(0.8);
  };

  const nowLeftPct = Math.min(98, (totalDuration / axis) * 100);

  return (
    <div className={cn("af-agb-trace", className)} style={style}>
      <header className="af-agb-trace__head">
        <span className="af-agb-trace__spark" aria-hidden>
          <SparkleDotIcon size={14} />
        </span>
        <span className="af-agb-trace__heading">{title}</span>
        <span className="af-agb-trace__task">{taskTitle}</span>
        <button
          type="button"
          className="af-agb-trace__live"
          data-running={!isDone || undefined}
          onClick={replay}
          title={isDone ? "Replay trace" : "Trace streaming live"}
        >
          <i className={!isDone ? "af-agb-trace__pulse" : "af-agb-trace__done-dot"} aria-hidden />
          <span>{!isDone ? "Live" : "Done"}</span>
        </button>
      </header>

      <div className="af-agb-trace__stats">
        {[
          { label: "DURATION", value: `${totalDuration.toFixed(1)}s` },
          { label: "COST", value: formatCost(totalCost) },
          { label: "TOKENS", value: formatTraceTokens(totalTokens) },
          { label: "LLM CALLS", value: String(llmCalls) },
          { label: "TOOL CALLS", value: String(toolCalls) },
          { label: "ERRORS", value: "0" },
        ].map((stat) => (
          <div className="af-agb-trace__stat" key={stat.label}>
            <span className="af-agb-trace__statlabel">{stat.label}</span>
            <span className="af-agb-trace__statvalue">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="af-agb-trace__body">
        <div className="af-agb-trace__axis">
          <span className="af-agb-trace__axis-span">SPAN</span>
          <span className="af-agb-trace__ticks">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="af-agb-trace__tick"
                style={{ left: `${(tick / axis) * 100}%` }}
              >
                {tick}s
              </span>
            ))}
          </span>
        </div>

        <div className="af-agb-trace__stage">
          <div className="af-agb-trace__layer" aria-hidden>
            {ticks.map((tick) => (
              <i
                key={tick}
                className="af-agb-trace__guide"
                style={{ left: `${(tick / axis) * 100}%` }}
              />
            ))}
            {!isDone ? (
              <span className="af-agb-trace__now" style={{ left: `${nowLeftPct}%` }}>
                <i className="af-agb-trace__nowdot" />
              </span>
            ) : null}
          </div>

          <div className="af-agb-trace__rows af-agb-scroll" role="tree" aria-label="Trace spans">
            {visible.map((span, index) => {
              const left = (span.start / axis) * 100;
              const width = Math.max(1.2, (span.duration / axis) * 100);
              const spanCost =
                span.cost !== undefined
                  ? span.cost
                  : span.kind === "llm"
                    ? span.duration * 0.018
                    : 0.01;
              const isSlowest = Boolean(markSlowest && slowest && slowest.id === span.id);
              const tagOnLeft = left + width > 74;
              const brand =
                span.brand ??
                (span.kind === "agent" ? "claude" : span.kind === "llm" ? "openai" : "search");

              return (
                <button
                  type="button"
                  key={span.id}
                  ref={(element) => {
                    if (element) rowRefs.current.set(span.id, element);
                    else rowRefs.current.delete(span.id);
                  }}
                  className="af-agb-trace__row"
                  data-kind={span.kind}
                  data-focus={focusRow === span.id || undefined}
                  data-open={openSpan?.id === span.id || undefined}
                  role="treeitem"
                  aria-level={span.depth + 1}
                  aria-expanded={hasChildren(span.id) ? !collapsed.includes(span.id) : undefined}
                  tabIndex={focusRow === span.id ? 0 : -1}
                  onFocus={() => setFocusRow(span.id)}
                  onClick={(event) => openDetail(span, event.currentTarget)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveFocus(index + 1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveFocus(index - 1);
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      if (hasChildren(span.id) && collapsed.includes(span.id)) toggle(span.id);
                      else if (hasChildren(span.id))
                        moveFocus(visible.findIndex((item) => item.id === childIds(span.id)[0]));
                    } else if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      if (hasChildren(span.id) && !collapsed.includes(span.id)) toggle(span.id);
                      else if (span.parent)
                        moveFocus(visible.findIndex((item) => item.id === span.parent));
                    } else if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetail(span, event.currentTarget);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      moveFocus(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      moveFocus(visible.length - 1);
                    }
                  }}
                >
                  <span
                    className="af-agb-trace__name"
                    data-depth={span.depth}
                    style={{ paddingLeft: `${10 + span.depth * 18}px` }}
                  >
                    {span.depth > 0 ? <i className="af-agb-trace__treeline" aria-hidden /> : null}
                    {hasChildren(span.id) ? (
                      <span
                        className="af-agb-trace__chev"
                        data-collapsed={collapsed.includes(span.id) || undefined}
                        aria-hidden
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle(span.id);
                        }}
                      >
                        <AfIcon name="chevronDown" size={11} />
                      </span>
                    ) : (
                      <span className="af-agb-trace__chevspace" aria-hidden />
                    )}
                    <span className="af-agb-trace__icon" data-kind={span.kind} aria-hidden>
                      <AgbBrandLogo brand={brand} size={12} />
                    </span>
                    <span className="af-agb-trace__label">
                      <span className="af-agb-trace__title" title={span.name}>
                        {span.name}
                      </span>
                      <span className="af-agb-trace__detail" title={span.detail}>
                        {span.detail}
                      </span>
                    </span>
                    {span.running && span.depth > 0 ? (
                      <span className="af-agb-trace__spin" aria-hidden>
                        <InboxStatusIcon status="running" />
                      </span>
                    ) : null}
                  </span>

                  <span className="af-agb-trace__track">
                    <span
                      className="af-agb-trace__bar"
                      data-kind={span.kind}
                      data-running={span.running || undefined}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {span.running ? <span className="af-agb-trace__sheen" aria-hidden /> : null}
                      {collapsed.includes(span.id)
                        ? childIds(span.id).map((childId) => {
                            const child = spans.find((item) => item.id === childId);
                            if (!child) return null;
                            const childStart =
                              ((child.start - span.start) / Math.max(span.duration, 0.1)) * 100;
                            const childWidth =
                              (child.duration / Math.max(span.duration, 0.1)) * 100;
                            return (
                              <i
                                key={childId}
                                className="af-agb-trace__mark"
                                style={{
                                  left: `${childStart}%`,
                                  width: `${Math.max(childWidth, 1.5)}%`,
                                }}
                              />
                            );
                          })
                        : null}
                    </span>
                    <span
                      className="af-agb-trace__barlabel"
                      data-inside={tagOnLeft || undefined}
                      style={
                        tagOnLeft
                          ? { right: `${Math.max(1, 100 - (left + width)) + 1}%` }
                          : { left: `${Math.min(84, left + width + 1.4)}%` }
                      }
                    >
                      <span>{span.duration > 0 ? `${span.duration.toFixed(1)}s` : "…"}</span>
                      {spanCost > 0 ? (
                        <span className="af-agb-trace__barcost">· {formatCost(spanCost)}</span>
                      ) : null}
                      {isSlowest ? <span className="af-agb-trace__slow">Slowest</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StagePopover
        place={openSpan ? place : null}
        label={`${openSpan?.name ?? "Span"} details`}
        onClose={() => {
          const prevId = openSpan?.id;
          hide();
          setOpenId(null);
          if (prevId) rowRefs.current.get(prevId)?.focus();
        }}
      >
        {openSpan ? (
          <div className="af-agb-trace-detail">
            <header>
              <span className="af-agb-trace__icon" data-kind={openSpan.kind} aria-hidden>
                <AgbBrandLogo
                  brand={
                    openSpan.brand ??
                    (openSpan.kind === "agent"
                      ? "claude"
                      : openSpan.kind === "llm"
                        ? "openai"
                        : "search")
                  }
                  size={13}
                />
              </span>
              <span>
                <strong>{openSpan.name}</strong>
                <small>
                  {openSpan.kind === "llm"
                    ? "LLM call"
                    : openSpan.kind === "tool"
                      ? "Tool call"
                      : "Agent"}{" "}
                  · {openSpan.detail}
                </small>
              </span>
              <AfTag tone={openSpan.running ? "accent" : "success"}>
                {openSpan.running ? "Running" : "Done"}
              </AfTag>
            </header>
            <div className="af-agb-trace-detail__facts">
              <Fact label="Duration">{openSpan.duration.toFixed(1)}s</Fact>
              <Fact label="Started">{openSpan.start.toFixed(1)}s</Fact>
              <Fact label="Cost">{formatCost(openSpan.cost ?? 0.05)}</Fact>
              <Fact label="Tokens in">{(openSpan.tokensIn ?? 2400).toLocaleString("en-US")}</Fact>
              <Fact label="Tokens out">{(openSpan.tokensOut ?? 620).toLocaleString("en-US")}</Fact>
            </div>
            <div className="af-agb-trace-detail__block">
              <span className="af-agb-overline">Input</span>
              <p>{openSpan.input ?? `Context and arguments for ${openSpan.detail}.`}</p>
            </div>
            <div className="af-agb-trace-detail__block">
              <span className="af-agb-overline">Output</span>
              <p>
                {openSpan.running
                  ? "Streaming output tokens…"
                  : openSpan.output ?? "Completed without errors."}
              </p>
            </div>
            <footer>
              <AfButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  hide();
                  setOpenId(null);
                }}
              >
                Close
              </AfButton>
            </footer>
          </div>
        ) : null}
      </StagePopover>
    </div>
  );
}

export { TraceWaterfallDemo as AfTraceWaterfallPattern, TraceWaterfallDemo as AfTraceWaterfall };
export type { AfTraceWaterfallPatternProps as AfTraceWaterfallProps };
