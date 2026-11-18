import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../primitives";
import { ModelBrandMark, ToolBrandMark } from "../agents-c/_marks";

export type FallbackAttemptStatus = "waiting" | "trying" | "failed" | "answered" | "skipped";

export interface FallbackAttempt {
  id: string;
  model: string;
  provider?: string;
  providerLogo?: ReactNode;
  region?: string;
  logo?: ReactNode;
  status: FallbackAttemptStatus;
  startedAt?: number;
  duration?: number;
  timeout?: number;
  cost?: number;
  reason?: string;
  note?: string;
  price?: string;
  details?: Array<{ label: string; value: string }>;
}

/** Legacy node item alias. */
export interface FallbackNodeItem {
  id: string;
  model: string;
  provider: string;
  latency: string;
  status: "active" | "standby" | "degraded" | "disabled";
  errorNote?: string;
}

export interface ChainEnd {
  name: string;
  sub?: string;
  logo?: ReactNode;
  text?: string;
  details?: Array<{ label: string; value: string }>;
}

export interface AfFallbackChainProps {
  /** Models tried in priority order. */
  attempts?: FallbackAttempt[];
  /** Legacy nodes prop. */
  nodes?: FallbackNodeItem[];
  /** Header title. */
  title?: ReactNode;
  /** Router label shown under Request. */
  route?: string;
  /** Left Request card popover details. */
  request?: ChainEnd;
  /** Right Response card popover details. */
  response?: ChainEnd;
  /** Controlled elapsed clock (ms) for active attempt. */
  now?: number;
  /** Retry / replay callback. */
  onRetry?: () => void;
  /** Legacy toggle callback. */
  onToggleNode?: (nodeId: string, enabled: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

export type AfFallbackChainPatternProps = AfFallbackChainProps;

function AwsLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.76 10.04c0 .3.03.53.09.71.06.18.14.37.26.58.04.06.05.12.05.18 0 .08-.05.16-.15.24l-.5.33a.38.38 0 0 1-.21.07c-.08 0-.16-.04-.24-.11a2.5 2.5 0 0 1-.29-.38 6.2 6.2 0 0 1-.25-.47c-.62.73-1.4 1.1-2.35 1.1-.67 0-1.2-.19-1.59-.57-.39-.38-.59-.9-.59-1.53 0-.68.24-1.23.73-1.65.48-.41 1.13-.62 1.95-.62.27 0 .55.02.85.06.3.04.6.1.92.18v-.58c0-.61-.13-1.03-.38-1.28-.25-.25-.68-.37-1.3-.37-.28 0-.56.03-.86.1-.3.08-.58.16-.86.28-.12.05-.21.08-.28.1a.49.49 0 0 1-.13.03c-.11 0-.17-.08-.17-.25v-.39c0-.13.02-.22.06-.28.04-.06.11-.12.22-.17.28-.14.62-.26 1.01-.36.39-.1.8-.15 1.24-.15.95 0 1.65.22 2.1.65.43.43.66 1.08.66 1.96v2.59zm-3.24 1.21c.26 0 .54-.05.82-.14.29-.1.54-.27.76-.51.13-.15.22-.32.27-.51.05-.2.08-.43.08-.7v-.33a6.7 6.7 0 0 0-.74-.14 6 6 0 0 0-.75-.05c-.53 0-.92.11-1.19.32-.26.22-.39.52-.39.92 0 .38.1.66.3.85.19.2.47.29.84.29zm18.18 4.96c-2.63 1.94-6.44 2.97-9.72 2.97-4.6 0-8.74-1.7-11.87-4.53-.25-.22-.03-.53.27-.35 3.38 1.96 7.56 3.15 11.88 3.15 2.91 0 6.11-.6 9.06-1.85.44-.2.81.29.38.61z" />
    </svg>
  );
}

function AzureSquaresLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}

function GoogleGLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

const BASE_DEMO_MODELS: Array<Omit<FallbackAttempt, "status">> = [
  {
    id: "opus",
    model: "Claude Opus 5.5",
    provider: "AWS Bedrock",
    region: "us-east-1",
    logo: <ModelBrandMark model="claude" size={14} />,
    providerLogo: <AwsLogo />,
    timeout: 5000,
    price: "$5 / $25 per 1M",
    reason: "Rate limited · 429",
    note: "Organization output token burst limit reached; switched to #2.",
  },
  {
    id: "gpt6",
    model: "GPT-6",
    provider: "Azure OpenAI",
    region: "Sweden Central",
    logo: <ModelBrandMark model="openai" size={14} />,
    providerLogo: <AzureSquaresLogo />,
    timeout: 5000,
    price: "$1.25 / $10 per 1M",
    reason: "Timed out · 5.0s",
    note: "No first token within 5.0s gateway budget; aborted stream.",
  },
  {
    id: "gemini",
    model: "Gemini 3.8 Pro",
    provider: "Google Vertex",
    region: "europe-west4",
    logo: <ModelBrandMark model="gemini" size={14} />,
    providerLogo: <GoogleGLogo />,
    timeout: 5000,
    price: "$1.25 / $5 per 1M",
    note: "Returned structured 3-bullet escalation summary.",
  },
  {
    id: "grok",
    model: "Grok 4",
    provider: "xAI",
    region: "us-west",
    logo: <ModelBrandMark model="grok" size={14} />,
    providerLogo: <ModelBrandMark model="grok" size={16} />,
    timeout: 5000,
    price: "$3 / $15 per 1M",
    reason: "Not needed",
  },
];

const DEFAULT_REQUEST: ChainEnd = {
  name: "HubSpot · Ticket #4821",
  logo: <ToolBrandMark tool="hubspot" size={16} />,
  text: "Summarize this ticket for the on-call engineer: what broke, who's affected and what the customer already tried.",
  details: [
    { label: "Input", value: "1,284 tokens" },
    { label: "Order", value: "Priority chain, 5s each" },
  ],
};

const DEFAULT_RESPONSE: ChainEnd = {
  name: "Slack · #support-escalations",
  logo: <ToolBrandMark tool="slack" size={16} />,
  text: "EU SSO callback returns 502 for SAML workspaces (14 orgs); customer rotated IdP cert with no change.",
};

const BLOCK_COUNT = 38;
const ROW_H = 60;
const ROW_GAP = 10;

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtCost(c: number): string {
  if (c <= 0) return "$0";
  if (c < 0.01) return `$${c.toFixed(3)}`;
  return `$${c.toFixed(2)}`;
}

/**
 * Fallback Chain — 1:1 request-to-response fallback routing diagram with curved SVG branches,
 * travelling light pulses, per-attempt micro-blocks, and rich hover popovers.
 */
export function AfFallbackChain({
  attempts: attemptsProp,
  nodes: legacyNodes,
  title = "Summarize support ticket",
  route = "openrouter/auto",
  request = DEFAULT_REQUEST,
  response = DEFAULT_RESPONSE,
  onRetry,
  className,
  style,
}: AfFallbackChainProps = {}) {
  const uid = useId();
  const isDefaultDemo = !attemptsProp && !legacyNodes;

  // Timeline elapsed ms (0 -> 4800ms):
  // 0..250: waiting
  // 250..1040: model 0 trying (fails at 790ms)
  // 1040..3240: model 1 trying (simulates 5.0s timeout compressed smoothly)
  // 3240..4640: model 2 trying -> answered at 1.8s!
  const [elapsed, setElapsed] = useState<number>(isDefaultDemo ? 0 : 4800);
  const rafRef = useRef<number | null>(null);

  const startDemoLoop = () => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const dt = now - t0;
      if (dt >= 4700) {
        setElapsed(4700);
        rafRef.current = null;
        return;
      }
      setElapsed(dt);
      rafRef.current = window.requestAnimationFrame(tick);
    };
    setElapsed(0);
    rafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!isDefaultDemo) return;
    startDemoLoop();
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isDefaultDemo]);

  const attempts = useMemo<FallbackAttempt[]>(() => {
    if (attemptsProp) return attemptsProp;
    if (legacyNodes?.length) {
      return legacyNodes.map((n) => ({
        id: n.id,
        model: n.model,
        provider: n.provider,
        logo: <ModelBrandMark model={n.model} size={14} />,
        status:
          n.status === "degraded"
            ? "failed"
            : n.status === "active"
              ? "answered"
              : "skipped",
        reason: n.errorNote ?? n.latency,
      }));
    }

    if (elapsed < 1010) {
      const dur0 = Math.min(790, 260 + Math.round(elapsed * 0.53));
      return BASE_DEMO_MODELS.map((m, i) =>
        i === 0
          ? { ...m, status: "trying", duration: dur0 }
          : { ...m, status: "waiting" },
      );
    }
    if (elapsed < 3100) {
      const frac = (elapsed - 1010) / 2090;
      const dur1 = Math.min(5000, Math.round(frac * 5000));
      return BASE_DEMO_MODELS.map((m, i) => {
        if (i === 0) return { ...m, status: "failed", duration: 790 };
        if (i === 1) return { ...m, status: "trying", duration: dur1 };
        return { ...m, status: "waiting" };
      });
    }
    if (elapsed < 4600) {
      const frac = (elapsed - 3100) / 1500;
      const dur2 = Math.min(1820, Math.round(frac * 1820));
      return BASE_DEMO_MODELS.map((m, i) => {
        if (i === 0) return { ...m, status: "failed", duration: 790 };
        if (i === 1) return { ...m, status: "failed", duration: 5000 };
        if (i === 2) return { ...m, status: "trying", duration: dur2, cost: Number((frac * 0.004).toFixed(4)) };
        return { ...m, status: "waiting" };
      });
    }
    return [
      { ...BASE_DEMO_MODELS[0], status: "failed", duration: 790 },
      { ...BASE_DEMO_MODELS[1], status: "failed", duration: 5000 },
      { ...BASE_DEMO_MODELS[2], status: "answered", duration: 1820, cost: 0.004 },
      { ...BASE_DEMO_MODELS[3], status: "skipped" },
    ];
  }, [attemptsProp, elapsed, legacyNodes]);

  const answeredIdx = attempts.findIndex((a) => a.status === "answered");
  const tryingIdx = attempts.findIndex((a) => a.status === "trying");
  const allFailed =
    attempts.length > 0 &&
    answeredIdx === -1 &&
    tryingIdx === -1 &&
    attempts.every((a) => a.status === "failed" || a.status === "skipped");

  const overallState: "waiting" | "trying" | "answered" | "failed" =
    answeredIdx >= 0
      ? "answered"
      : tryingIdx >= 0
        ? "trying"
        : allFailed
          ? "failed"
          : "waiting";

  const triedCount = attempts.filter(
    (a) => a.status === "trying" || a.status === "failed" || a.status === "answered",
  ).length;
  const totalMs = attempts.reduce((s, a) => s + (a.duration ?? 0), 0);
  const totalCost = attempts.reduce((s, a) => s + (a.cost ?? 0), 0);

  const svgH = Math.max(ROW_H, attempts.length * ROW_H + Math.max(0, attempts.length - 1) * ROW_GAP);
  const midY = svgH / 2;

  const handleRetry = () => {
    onRetry?.();
    if (isDefaultDemo) {
      startDemoLoop();
    }
  };

  return (
    <div className={cn("af-fbkc", className)} style={style}>
      {/* Top status bar */}
      <div className="af-fbkc__bar">
        <span className="af-fbkc__title">{title}</span>

        <div className="af-fbkc__summary" data-state={overallState} role="status" aria-live="polite">
          <span className="af-fbkc__state">
            {overallState === "answered" ? (
              <>
                Answered by <b>#{answeredIdx + 1}</b>
              </>
            ) : overallState === "trying" ? (
              <>
                Attempt <b>{tryingIdx + 1}</b> of {attempts.length}
              </>
            ) : overallState === "failed" ? (
              "All attempts failed"
            ) : (
              "Waiting"
            )}
          </span>

          <span className="af-fbkc__total">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 3.5V6l1.7 1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {fmtDuration(totalMs)}
          </span>

          <span className="af-fbkc__total">{fmtCost(totalCost)}</span>
        </div>

        {overallState === "answered" || overallState === "failed" ? (
          <button type="button" className="af-fbkc__btn" onClick={handleRetry}>
            Retry
          </button>
        ) : null}
      </div>

      {/* Dot-grid flow diagram */}
      <div className="af-fbkc__card">
        <div className="af-fbkc__flow">
          {/* Left node: Request */}
          <div
            className="af-fbkc__node af-fbkc__node--from af-fbkc__hov"
            tabIndex={0}
            aria-describedby={`${uid}-req`}
          >
            <span className="af-fbkc__node-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="3.5" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="12.2" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="12.2" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M5.1 8h2.2c1 0 1.4-.5 1.8-1.7.4-1.2.8-1.8 1.6-1.8M7.3 8c1 0 1.4.5 1.8 1.7.4 1.2.8 1.8 1.6 1.8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="af-fbkc__node-text">
              <span className="af-fbkc__node-title">Request</span>
              <span className="af-fbkc__node-sub" title={route}>
                {route}
              </span>
            </span>

            <span className="af-fbkc__pop" id={`${uid}-req`} role="tooltip" data-place="start">
              <span className="af-fbkc__pop-head">
                <span className="af-fbkc__pop-logo">{request.logo}</span>
                <span className="af-fbkc__pop-who">
                  <span className="af-fbkc__pop-title">{request.name}</span>
                  <span className="af-fbkc__pop-sub">{route}</span>
                </span>
              </span>
              {request.text ? (
                <span className="af-fbkc__pop-quote">
                  <span>{request.text}</span>
                </span>
              ) : null}
              <span className="af-fbkc__pop-rows">
                {(request.details ?? []).map((d) => (
                  <span key={d.label} className="af-fbkc__pop-row">
                    <span className="af-fbkc__pop-label">{d.label}</span>
                    <span className="af-fbkc__pop-value">{d.value}</span>
                  </span>
                ))}
                <span className="af-fbkc__pop-row">
                  <span className="af-fbkc__pop-label">Tried so far</span>
                  <span className="af-fbkc__pop-value">
                    {triedCount} of {attempts.length}
                  </span>
                </span>
              </span>
            </span>
          </div>

          {/* Left fan-out SVG Bézier curves */}
          <svg
            className="af-fbkc__links"
            width="48"
            height={svgH}
            viewBox={`0 0 48 ${svgH}`}
            aria-hidden="true"
          >
            {attempts.map((att, idx) => {
              const targetY = idx * (ROW_H + ROW_GAP) + ROW_H / 2;
              const d = `M0 ${midY}C26.4 ${midY} 21.6 ${targetY} 48 ${targetY}`;
              return (
                <g key={att.id}>
                  <path
                    className="af-fbkc__link"
                    data-status={att.status}
                    d={d}
                    pathLength={1}
                  />
                  {att.status === "trying" || att.status === "answered" ? (
                    <path
                      className="af-fbkc__light"
                      data-status={att.status}
                      d={d}
                      pathLength={1}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {/* Ordered model stack */}
          <ol className="af-fbkc__models" aria-label="Models, in the order they're tried">
            {attempts.map((att, idx) => {
              const timeoutMs = att.timeout ?? 5000;
              const dur = att.duration ?? 0;
              const filledBlocks =
                att.status === "waiting" || att.status === "skipped"
                  ? 0
                  : att.status === "answered"
                    ? Math.max(8, Math.min(BLOCK_COUNT, Math.round((dur / timeoutMs) * BLOCK_COUNT)))
                    : att.status === "trying"
                      ? Math.max(7, Math.min(BLOCK_COUNT, Math.round((dur / timeoutMs) * BLOCK_COUNT)))
                      : Math.max(4, Math.min(BLOCK_COUNT, Math.round((dur / timeoutMs) * BLOCK_COUNT)));

              const isUpNext =
                att.status === "waiting" && tryingIdx >= 0 && idx === tryingIdx + 1;

              const statusLabel =
                att.status === "answered"
                  ? "Answered"
                  : att.status === "trying"
                    ? "Trying…"
                    : att.status === "failed"
                      ? att.reason ?? "Failed"
                      : att.status === "skipped"
                        ? att.reason ?? "Not needed"
                        : isUpNext
                          ? "Up next"
                          : "Waiting";

              const popPlace = idx >= attempts.length / 2 ? "above" : "below";

              return (
                <li
                  key={att.id}
                  className="af-fbkc__model af-fbkc__hov"
                  data-status={att.status}
                  tabIndex={0}
                  aria-describedby={`${uid}-m${idx}`}
                >
                  <div className="af-fbkc__model-main">
                    <span className="af-fbkc__logo">
                      <span className="af-fbkc__mark" data-logo="">
                        {att.logo ?? <ModelBrandMark model={att.model} size={14} />}
                      </span>
                      <span className="af-fbkc__n">{idx + 1}</span>
                    </span>

                    <span className="af-fbkc__who">
                      <span className="af-fbkc__top">
                        <span className="af-fbkc__name" title={att.model}>
                          {att.model}
                        </span>
                        {att.provider ? (
                          <span className="af-fbkc__provider">{att.provider}</span>
                        ) : null}
                      </span>
                      <span className="af-fbkc__status" title={statusLabel}>
                        {statusLabel}
                      </span>
                    </span>

                    <span className="af-fbkc__meta">
                      <span>{dur > 0 ? fmtDuration(dur) : "–"}</span>
                      <span>
                        {att.cost && att.cost > 0
                          ? fmtCost(att.cost)
                          : att.status === "trying"
                            ? "$0"
                            : ""}
                      </span>
                    </span>
                  </div>

                  <span className="af-fbkc__blocks" aria-hidden="true">
                    {Array.from({ length: BLOCK_COUNT }, (_, bi) => (
                      <i
                        key={bi}
                        data-on={bi < filledBlocks ? "" : undefined}
                        data-head={
                          att.status === "trying" && bi === filledBlocks - 1 ? "" : undefined
                        }
                      />
                    ))}
                  </span>

                  <span
                    className="af-fbkc__pop"
                    id={`${uid}-m${idx}`}
                    role="tooltip"
                    data-place={popPlace}
                  >
                    <span className="af-fbkc__pop-head">
                      <span className="af-fbkc__pop-logo">
                        {att.providerLogo ?? att.logo ?? <ModelBrandMark model={att.model} size={16} />}
                      </span>
                      <span className="af-fbkc__pop-who">
                        <span className="af-fbkc__pop-title">{att.provider ?? att.model}</span>
                        {att.region ? (
                          <span className="af-fbkc__pop-sub">{att.region}</span>
                        ) : null}
                      </span>
                      <span className="af-fbkc__pop-badge" data-tone={att.status}>
                        {att.status === "answered"
                          ? "Answered"
                          : att.status === "trying"
                            ? "Trying"
                            : att.status === "failed"
                              ? "Failed"
                              : att.status === "skipped"
                                ? "Skipped"
                                : "Waiting"}
                      </span>
                    </span>

                    {att.note ? (
                      <span
                        className={cn(
                          "af-fbkc__pop-quote",
                          att.status === "failed" && "af-fbkc__pop-err",
                        )}
                      >
                        <span>{att.note}</span>
                      </span>
                    ) : null}

                    <span className="af-fbkc__pop-rows">
                      <span className="af-fbkc__pop-row">
                        <span className="af-fbkc__pop-label">Model</span>
                        <span className="af-fbkc__pop-value">{att.model}</span>
                      </span>
                      <span className="af-fbkc__pop-row">
                        <span className="af-fbkc__pop-label">Time</span>
                        <span className="af-fbkc__pop-value">
                          {dur > 0 ? fmtDuration(dur) : `up to ${(timeoutMs / 1000).toFixed(1)}s`}
                        </span>
                      </span>
                      {att.price ? (
                        <span className="af-fbkc__pop-row">
                          <span className="af-fbkc__pop-label">Price</span>
                          <span className="af-fbkc__pop-value">{att.price}</span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Right fan-in SVG Bézier curves */}
          <svg
            className="af-fbkc__links"
            width="48"
            height={svgH}
            viewBox={`0 0 48 ${svgH}`}
            aria-hidden="true"
          >
            {attempts.map((att, idx) => {
              const sourceY = idx * (ROW_H + ROW_GAP) + ROW_H / 2;
              const d = `M0 ${sourceY}C26.4 ${sourceY} 21.6 ${midY} 48 ${midY}`;
              const outStatus = att.status === "answered" ? "answered" : "idle";
              return (
                <g key={att.id}>
                  <path
                    className="af-fbkc__link af-fbkc__link--out"
                    data-status={outStatus}
                    d={d}
                    pathLength={1}
                  />
                  {outStatus === "answered" ? (
                    <path
                      className="af-fbkc__light"
                      data-status="answered"
                      d={d}
                      pathLength={1}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {/* Right node: Response */}
          <div
            className="af-fbkc__node af-fbkc__node--to af-fbkc__hov"
            data-state={overallState}
            tabIndex={0}
            aria-describedby={`${uid}-res`}
          >
            <span className="af-fbkc__node-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v5a1.5 1.5 0 0 1-1.5 1.5H8l-3 2.5V11h-.5A1.5 1.5 0 0 1 3 9.5v-5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.75 6.25h4.5M5.75 8.25h2.75"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="af-fbkc__node-text">
              <span className="af-fbkc__node-title">Response</span>
              <span className="af-fbkc__node-sub">
                {overallState === "answered"
                  ? "Delivered"
                  : overallState === "failed"
                    ? "Unavailable"
                    : "Waiting…"}
              </span>
            </span>

            <span className="af-fbkc__pop" id={`${uid}-res`} role="tooltip" data-place="end">
              <span className="af-fbkc__pop-head">
                <span className="af-fbkc__pop-logo">{response.logo}</span>
                <span className="af-fbkc__pop-who">
                  <span className="af-fbkc__pop-title">{response.name}</span>
                  <span className="af-fbkc__pop-sub">
                    {answeredIdx >= 0
                      ? `Answered by ${attempts[answeredIdx].model}`
                      : "Waiting for an answer"}
                  </span>
                </span>
                <span className="af-fbkc__pop-badge" data-tone={overallState}>
                  {overallState === "answered" ? "Delivered" : "Pending"}
                </span>
              </span>
              {overallState === "answered" && response.text ? (
                <span className="af-fbkc__pop-quote">
                  <span>{response.text}</span>
                </span>
              ) : null}
              <span className="af-fbkc__pop-rows">
                <span className="af-fbkc__pop-row">
                  <span className="af-fbkc__pop-label">Total time</span>
                  <span className="af-fbkc__pop-value">{fmtDuration(totalMs)}</span>
                </span>
                <span className="af-fbkc__pop-row">
                  <span className="af-fbkc__pop-label">Total cost</span>
                  <span className="af-fbkc__pop-value">{fmtCost(totalCost)}</span>
                </span>
                <span className="af-fbkc__pop-row">
                  <span className="af-fbkc__pop-label">Attempts</span>
                  <span className="af-fbkc__pop-value">
                    {triedCount} of {attempts.length}
                  </span>
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const FallbackChain = AfFallbackChain;
export const AfFallbackChainPattern = AfFallbackChain;
