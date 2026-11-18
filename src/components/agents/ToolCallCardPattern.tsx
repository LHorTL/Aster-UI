import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, useControllableState } from "../../primitives";
import {
  Collapse,
  TOOL_CALLS,
  ToolCallCard,
  formatTenths,
  resolveToolIcon,
  useTenthsStopwatch,
} from "../_shared/agents-b";

export type AfToolCallItem = (typeof TOOL_CALLS)[number];

export interface AfToolCallGroupProps {
  /** Controlled tool calls list. */
  calls?: AfToolCallItem[];
  /** Legacy alias for `calls` (`tests/contracts.test.tsx`). */
  items?: AfToolCallItem[];
  /** Uncontrolled initial tool calls list. */
  defaultCalls?: AfToolCallItem[];
  /** Calls change callback. */
  onCallsChange?: (calls: AfToolCallItem[]) => void;
  /** Group expanded by default (`true`). */
  defaultGroupOpen?: boolean;
  /** Retry failed tool call callback. */
  onRetry?: (id: string) => void;
  /** Maximum code block height in px. */
  maxCodeHeight?: number;
  /** Show external hint below group (`false` by default). */
  showHint?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

export interface AfToolCallCardPatternProps extends AfToolCallGroupProps {
  /** Single-card mode: tool name. */
  name?: string;
  /** Single-card mode: call status. */
  status?: "running" | "success" | "error";
  /** Single-card mode: human-readable summary. */
  summary?: string;
  /** Single-card mode: input arguments. */
  args?: Record<string, unknown>;
  /** Single-card mode: output result. */
  result?: unknown;
  /** Single-card mode: error message. */
  error?: string;
  /** Single-card mode: duration in ms. */
  duration?: number;
  /** Single-card mode: started timestamp. */
  startedAt?: number | string;
  /** Single-card mode: custom icon key. */
  icon?: AffectIconKey;
  /** Single-card mode: controlled open state. */
  open?: boolean;
  /** Single-card mode: default open state. */
  defaultOpen?: boolean;
  /** Single-card mode: open change callback. */
  onOpenChange?: (open: boolean) => void;
  /** Single-card mode: auto-expand on error (`true` by default). */
  openOnError?: boolean;
}

export function AfToolCallGroup({
  calls: callsProp,
  items: itemsProp,
  defaultCalls = TOOL_CALLS,
  onCallsChange,
  defaultGroupOpen = true,
  onRetry,
  maxCodeHeight,
  showHint = false,
  className,
  style,
}: AfToolCallGroupProps = {}) {
  const controlledCalls = callsProp ?? itemsProp;
  const [calls, setCalls] = useControllableState<AfToolCallItem[]>({
    value: controlledCalls,
    defaultValue: defaultCalls,
    onChange: onCallsChange,
  });
  const [openId, setOpenId] = useState<string | null>(
    () => (controlledCalls ?? defaultCalls).find((call) => call.status === "error")?.id ?? null,
  );
  const [groupOpen, setGroupOpen] = useState(defaultGroupOpen);
  const retryTimer = useRef<number | null>(null);

  useEffect(() => {
    if (controlledCalls !== undefined) return;
    const hasRunning = calls.some((c) => c.id === "t3" && c.status === "running");
    if (!hasRunning) return;
    const finishTimer = window.setTimeout(() => {
      setCalls((list) =>
        list.map((call) =>
          call.id === "t3" && call.status === "running"
            ? {
                ...call,
                status: "error",
                duration: 500,
                summary: "Reading hubspot.com/pricing",
                error: "Request timed out after 8s — hubspot.com didn't respond.",
              }
            : call,
        ),
      );
      setOpenId("t3");
    }, 1200);
    return () => window.clearTimeout(finishTimer);
  }, [calls, controlledCalls, setCalls]);

  useEffect(
    () => () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
    },
    [],
  );

  const retry = (id: string) => {
    if (onRetry) {
      onRetry(id);
      return;
    }
    setCalls((list) =>
      list.map((call) => (call.id === id ? { ...call, status: "running", error: undefined } : call)),
    );
    setOpenId(id);
    retryTimer.current = window.setTimeout(
      () =>
        setCalls((list) =>
          list.map((call) =>
            call.id === id
              ? {
                  ...call,
                  status: "success",
                  duration: 1400,
                  result: { ok: true, retried: true, took: "1.4s" },
                  error: undefined,
                }
              : call,
          ),
        ),
      1400,
    );
  };

  const running = calls.some((call) => call.status === "running");
  const failedCount = calls.filter((call) => call.status === "error").length;
  const finishedMs = calls.reduce((sum, call) => sum + (call.duration ?? 0), 0);
  const liveMs = useTenthsStopwatch(running, finishedMs || 600);
  const shownSec = (running ? liveMs : finishedMs) / 1000;

  return (
    <div className={cn("af-agb-tccgroup", className)} style={style}>
      <button
        type="button"
        className="af-agb-tccgroup__head"
        data-open={groupOpen || undefined}
        aria-expanded={groupOpen}
        onClick={() => setGroupOpen((value) => !value)}
      >
        <span className="af-agb-tccgroup__stack" aria-hidden>
          {running ? (
            <span className="af-agb-tccgroup__leadicon">
              <AfIcon name={resolveToolIcon(calls[0] ?? { name: "search" })} size={13} />
            </span>
          ) : (
            calls.slice(0, 3).map((call) => (
              <span className="af-agb-tccgroup__stackicon" key={call.id}>
                <AfIcon name={resolveToolIcon(call)} size={13} />
              </span>
            ))
          )}
        </span>
        <span className="af-agb-tccgroup__title">
          <span className={running ? "af-agb-tccgroup__shimmer" : undefined}>
            {running ? "Using tools..." : `Used ${calls.length} ${calls.length === 1 ? "tool" : "tools"}`}
          </span>
          {!running && failedCount > 0 ? (
            <span className="af-agb-tccgroup__failed">&nbsp;· {failedCount} failed</span>
          ) : null}
          <span className="af-agb-tccgroup__time">&nbsp;· {formatTenths(shownSec)}</span>
        </span>
        <AfIcon
          name="chevronDown"
          size={12}
          className={cn("af-agb-tccgroup__chev", groupOpen && "af-agb-tccgroup__chev--open")}
        />
      </button>
      <Collapse open={groupOpen}>
        <div className="af-agb-tccgroup__list af-agb-scroll">
          {calls.map((call) => (
            <ToolCallCard
              key={call.id}
              call={call}
              maxCodeHeight={maxCodeHeight}
              open={openId === call.id}
              onToggle={() => setOpenId((value) => (value === call.id ? null : call.id))}
              onRetry={() => retry(call.id)}
            />
          ))}
        </div>
      </Collapse>
      {showHint ? (
        <p className="af-agb-tccgroup__hint">
          Click any tool call to inspect JSON arguments and results, copy payloads, or retry errors.
        </p>
      ) : null}
    </div>
  );
}

function ToolCallCardDemo(props: AfToolCallCardPatternProps = {}) {
  const {
    name,
    status = "success",
    summary = "",
    args = {},
    result,
    error,
    duration,
    icon,
    open: openProp,
    defaultOpen,
    onOpenChange,
    openOnError = true,
    maxCodeHeight,
    onRetry,
    className,
    style,
  } = props;

  const [singleOpen, setSingleOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen ?? Boolean(openOnError && status === "error"),
    onChange: onOpenChange,
  });

  if (name !== undefined) {
    const singleCall: AfToolCallItem = {
      id: "single",
      name,
      icon,
      summary,
      status,
      duration,
      args,
      result,
      error,
    };
    return (
      <div className={cn("af-agb-tccgroup", className)} style={style}>
        <ToolCallCard
          call={singleCall}
          maxCodeHeight={maxCodeHeight}
          open={singleOpen}
          onToggle={() => setSingleOpen((v) => !v)}
          onRetry={() => onRetry?.("single")}
        />
      </div>
    );
  }

  return <AfToolCallGroup {...props} />;
}

export { ToolCallCardDemo as AfToolCallCardPattern, ToolCallCardDemo as AfToolCallCard };
export type { AfToolCallCardPatternProps as AfToolCallCardProps };
