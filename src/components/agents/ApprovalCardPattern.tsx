import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfButton, AfCheckbox, AfCode, AfTag, type AfTone } from "../../ui";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, prefersReducedMotion, useIsomorphicLayoutEffect } from "../../primitives";
import { type ApprovalPhase, Fact, useCountdown } from "../_shared/agents-b";

export interface AfApprovalFact {
  label: string;
  value: ReactNode;
}

export type AfApprovalRisk = "low" | "medium" | "high" | "critical";

export interface AfApprovalCardPatternProps {
  /** Visual preset (`"official"` renders the English AffectUI campaign card; `"default"` preserves contract probe defaults). */
  variant?: "default" | "official";
  /** Approval title. */
  title?: ReactNode;
  /** Approval subtitle description. */
  description?: ReactNode;
  /** Header icon key. */
  icon?: AffectIconKey;
  /** Semantic risk level. */
  risk?: AfApprovalRisk;
  /** Explicit risk badge text. */
  riskLabel?: ReactNode;
  /** Explicit risk badge tone. */
  riskTone?: AfTone;
  /** Custom preview slot. */
  preview?: ReactNode;
  /** Key-value facts list. */
  facts?: AfApprovalFact[];
  /** Alias for `facts`. */
  details?: AfApprovalFact[];
  /** Show "Always allow" checkbox (default `true`). */
  allowAlways?: boolean;
  /** Checkbox label. */
  alwaysAllowLabel?: ReactNode;
  /** Alias for `alwaysAllowLabel`. */
  alwaysLabel?: ReactNode;
  /** Auto-deny countdown seconds (default `30`). */
  timeoutSeconds?: number;
  /** Alias for `timeoutSeconds`. */
  expiresIn?: number;
  /** Countdown expired callback. */
  onExpire?: () => void;
  /** Approve callback (`alwaysAllow` boolean). Supports returning a `Promise` to hold the busy state until settled. */
  onApprove?: (alwaysAllow: boolean) => void | Promise<unknown>;
  /** Deny callback. Supports returning a `Promise` to hold the busy state until settled. */
  onDeny?: () => void | Promise<unknown>;
  /** Undo callback when user reverts a resolved approval/denial receipt. */
  onUndo?: () => void;
  /** Optional edit callback. */
  onEdit?: () => void;
  /** Approve button text. */
  approveLabel?: string;
  /** Deny button text. */
  denyLabel?: string;
  /** Edit button text. */
  editLabel?: string;
  /** Enable keyboard shortcuts & kbd badges (default `true`). */
  shortcuts?: boolean;
  /** Custom footer actions slot. */
  actions?: ReactNode;
  /** Controlled phase override. */
  status?: ApprovalPhase;
  /** Initial phase (`"pending"` by default). */
  defaultStatus?: ApprovalPhase;
  /** Simulated busy duration (ms) when synchronous/omitted callbacks are used. */
  busyDelay?: number;
  /** Show external shortcut note below card. */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

const DEFAULT_FACTS: AfApprovalFact[] = [
  { label: "版本", value: <AfCode>0.4.1 → 0.4.2</AfCode> },
  { label: "变更", value: "3 项修复 · 1 项界面调整" },
  { label: "兼容", value: <AfCode>shell ≥ 0.1.46</AfCode> },
];

const OFFICIAL_FACTS: AfApprovalFact[] = [
  { label: "Subject", value: "What's new in October" },
  { label: "Send", value: "Today, 9:00 AM" },
];

const RISK_DEFAULTS: Record<AfApprovalRisk, { label: string; tone: AfTone; en: string }> = {
  low: { label: "低风险", tone: "neutral", en: "Low risk" },
  medium: { label: "有风险", tone: "warning", en: "Medium risk" },
  high: { label: "高风险", tone: "danger", en: "High risk" },
  critical: { label: "不可逆", tone: "danger", en: "Critical" },
};

function MailEnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2.6 4.4 8 8.3l5.4-3.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ApprovalCardDemo({
  variant = "default",
  title,
  description,
  icon = "upload",
  risk,
  riskLabel,
  riskTone,
  preview,
  facts,
  details,
  allowAlways = true,
  alwaysAllowLabel,
  alwaysLabel,
  timeoutSeconds,
  expiresIn,
  onExpire,
  onApprove,
  onDeny,
  onUndo,
  onEdit,
  approveLabel,
  denyLabel,
  editLabel,
  shortcuts = true,
  actions,
  status: controlledStatus,
  defaultStatus = "pending",
  busyDelay,
  showNote = false,
  className,
  style,
}: AfApprovalCardPatternProps = {}) {
  const isOfficial = variant === "official";
  const resolvedTitle = title ?? (isOfficial ? "Send campaign email" : "发布 Token 统计 0.4.2");
  const resolvedDescription =
    description !== undefined
      ? description
      : isOfficial
        ? "October product update · Newsletter"
        : "2 台设备将在下次启动时更新";
  const effectiveTimeout = expiresIn ?? timeoutSeconds ?? (isOfficial ? 300 : 30);
  const effectiveFacts = details ?? facts ?? (isOfficial ? OFFICIAL_FACTS : DEFAULT_FACTS);
  const effectiveAlwaysLabel =
    alwaysLabel ??
    alwaysAllowLabel ??
    (isOfficial ? "Always allow this action" : "始终允许发布到这两台设备");
  const resolvedRiskLabel =
    riskLabel !== undefined
      ? riskLabel
      : risk
        ? isOfficial
          ? RISK_DEFAULTS[risk].en
          : RISK_DEFAULTS[risk].label
        : isOfficial
          ? "Medium risk"
          : "有风险";
  const resolvedRiskTone = riskTone ?? (risk ? RISK_DEFAULTS[risk].tone : "warning");
  const resolvedApproveLabel = approveLabel ?? (isOfficial ? "Approve" : "批准");
  const resolvedDenyLabel = denyLabel ?? (isOfficial ? "Deny" : "拒绝");
  const resolvedEditLabel = editLabel ?? (isOfficial ? "Edit" : "编辑");

  const [innerPhase, setInnerPhase] = useState<ApprovalPhase>(defaultStatus);
  const phase = controlledStatus ?? innerPhase;
  const setPhase = (next: ApprovalPhase) => {
    if (controlledStatus === undefined) {
      setInnerPhase(next);
    }
  };
  const [busyAction, setBusyAction] = useState<"approve" | "deny" | null>(null);
  const [always, setAlways] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [recordPaused, setRecordPaused] = useState(false);
  const [windowKey, setWindowKey] = useState(0);
  const pendingRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const busyTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const countdown = useCountdown(effectiveTimeout, windowKey, phase !== "pending" || hoverPaused);
  const resolved = phase === "approved" || phase === "denied";
  const recordCountdown = useCountdown(10, windowKey, !resolved || recordPaused);

  useIsomorphicLayoutEffect(() => {
    const el = pendingRef.current;
    if (!el || resolved) return;
    const sync = () => setHeight(el.offsetHeight);
    sync();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [resolved]);

  useIsomorphicLayoutEffect(() => {
    if (!resolved) return;
    const el = recordRef.current;
    const sync = () => setHeight(el && el.offsetHeight > 0 ? el.offsetHeight : 48);
    sync();
    setReady(true);
    const ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    if (el) ro?.observe(el);
    return () => {
      ro?.disconnect();
    };
  }, [resolved]);

  useEffect(() => {
    if (!resolved) return;
    const timer = window.setTimeout(() => {
      if (recordRef.current?.closest(".af")?.getAttribute("data-modality") === "keyboard") {
        recordRef.current.focus({ preventScroll: true });
      }
    }, prefersReducedMotion() ? 20 : 540);
    return () => window.clearTimeout(timer);
  }, [resolved]);

  useEffect(() => {
    if (!isOfficial && phase === "pending" && countdown === 0) {
      setBusyAction(null);
      setPhase("denied");
      onExpire?.();
      void onDeny?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOfficial, phase, countdown, onDeny, onExpire]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (busyTimer.current) window.clearTimeout(busyTimer.current);
    };
  }, []);

  const runDecision = (action: "approve" | "deny") => {
    if (phase !== "pending") return;
    if (busyTimer.current) {
      window.clearTimeout(busyTimer.current);
      busyTimer.current = null;
    }
    const targetPhase: ApprovalPhase = action === "approve" ? "approved" : "denied";
    const handler = action === "approve" ? () => onApprove?.(always) : () => onDeny?.();
    const hasCallback = action === "approve" ? Boolean(onApprove) : Boolean(onDeny);

    if (hasCallback) {
      let result: void | Promise<unknown>;
      try {
        result = handler();
      } catch {
        setBusyAction(null);
        setPhase("pending");
        return;
      }
      if (result != null && typeof (result as PromiseLike<unknown>).then === "function") {
        setBusyAction(action);
        setPhase("busy");
        (result as Promise<unknown>).then(
          () => {
            if (!mountedRef.current) return;
            setBusyAction(null);
            setPhase(targetPhase);
          },
          () => {
            if (!mountedRef.current) return;
            setBusyAction(null);
            setPhase("pending");
          },
        );
        return;
      }
      const syncDelay = busyDelay ?? (prefersReducedMotion() ? 0 : 180);
      if (syncDelay <= 0) {
        setBusyAction(null);
        setPhase(targetPhase);
        return;
      }
      setBusyAction(action);
      setPhase("busy");
      busyTimer.current = window.setTimeout(() => {
        setBusyAction(null);
        setPhase(targetPhase);
      }, syncDelay);
      return;
    }

    const demoDelay = busyDelay ?? (action === "approve" ? 900 : 700);
    if (demoDelay <= 0) {
      setBusyAction(null);
      setPhase(targetPhase);
      return;
    }
    setBusyAction(action);
    setPhase("busy");
    busyTimer.current = window.setTimeout(() => {
      setBusyAction(null);
      setPhase(targetPhase);
    }, demoDelay);
  };

  const approve = () => runDecision("approve");
  const deny = () => runDecision("deny");

  const undo = () => {
    if (busyTimer.current) {
      window.clearTimeout(busyTimer.current);
      busyTimer.current = null;
    }
    setBusyAction(null);
    setPhase("pending");
    setWindowKey((value) => value + 1);
    onUndo?.();
  };

  const busy = phase === "busy";
  const tone = phase === "denied" ? "danger" : "success";
  const inertProps = (resolved ? { inert: "true" as unknown as boolean } : {}) as Record<string, unknown>;

  return (
    <div className={cn("af-agb-approval-wrap", isOfficial && "af-agb-approval-wrap--official", className)} style={style}>
      <div
        className={cn("af-agb-approval", isOfficial && "af-agb-approval--official")}
        data-phase={phase}
        data-ready={ready || undefined}
        style={{ height }}
        onKeyDown={(event) => {
          if (!shortcuts || phase !== "pending") return;
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            approve();
          } else if (event.key === "Escape") {
            event.preventDefault();
            deny();
          }
        }}
        onPointerEnter={() => setHoverPaused(true)}
        onPointerLeave={() => setHoverPaused(false)}
        onFocus={() => setHoverPaused(true)}
        onBlur={() => setHoverPaused(false)}
        role="group"
        aria-label={typeof resolvedTitle === "string" ? resolvedTitle : "Action approval"}
        aria-busy={busy || undefined}
      >
        <div
          className="af-agb-approval__pending"
          ref={pendingRef}
          data-busy={busy || undefined}
          data-busy-action={busy ? busyAction ?? undefined : undefined}
          aria-hidden={resolved || undefined}
          {...inertProps}
        >
          <div className="af-agb-approval__head">
            <span className="af-agb-approval__icon" aria-hidden>
              {isOfficial ? <MailEnvelopeIcon /> : <AfIcon name={icon} size={16} />}
            </span>
            <span className="af-agb-approval__titles">
              <span className="af-agb-approval__title">{resolvedTitle}</span>
              {resolvedDescription ? (
                <span className="af-agb-approval__desc">{resolvedDescription}</span>
              ) : null}
            </span>
            {resolvedRiskLabel ? (
              isOfficial ? (
                <span className="af-agb-approval__riskpill" data-tone={resolvedRiskTone}>
                  {resolvedRiskLabel}
                </span>
              ) : (
                <AfTag tone={resolvedRiskTone} dot>
                  {resolvedRiskLabel}
                </AfTag>
              )
            ) : null}
          </div>

          <div className="af-agb-approval__preview">
            {preview !== undefined ? (
              preview
            ) : isOfficial ? (
              <>
                <div className="af-agb-approval__people">
                  <span className="af-agb-approval__avatars" aria-hidden>
                    <span className="af-agb-avatar" data-tone="1">
                      M
                    </span>
                    <span className="af-agb-avatar" data-tone="2">
                      J
                    </span>
                    <span className="af-agb-avatar" data-tone="3">
                      S
                    </span>
                    <span className="af-agb-avatar" data-tone="4">
                      A
                    </span>
                  </span>
                  <span className="af-agb-approval__people-inline">
                    <span className="af-agb-approval__names">Mia, Jonas, Sara, Alex</span>
                    <span className="af-agb-muted">+38 more</span>
                  </span>
                </div>
                <div className="af-agb-approval__kv">
                  {effectiveFacts.map((fact) => (
                    <div className="af-agb-approval__kvrow" key={fact.label}>
                      <span className="af-agb-approval__kvlabel">{fact.label}</span>
                      <span className="af-agb-approval__kvval">{fact.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="af-agb-approval__people">
                  <span className="af-agb-avatar" data-tone="1" aria-hidden>
                    M
                  </span>
                  <span className="af-agb-avatar" data-tone="2" aria-hidden>
                    J
                  </span>
                  <span className="af-agb-avatar" data-tone="3" aria-hidden>
                    S
                  </span>
                  <span className="af-agb-approval__people-text">
                    <span>目标设备：本机、办公室台式机</span>
                    <span className="af-agb-muted">另有 38 台稍后同步</span>
                  </span>
                </div>
                <div className="af-agb-approval__facts">
                  {effectiveFacts.map((fact) => (
                    <Fact key={fact.label} label={fact.label}>
                      {fact.value}
                    </Fact>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={cn("af-agb-approval__foot", isOfficial && "af-agb-approval__foot--official")}>
            <span className="af-agb-approval__always">
              {allowAlways ? (
                <AfCheckbox checked={always} onChange={setAlways}>
                  {effectiveAlwaysLabel}
                </AfCheckbox>
              ) : null}
              {!isOfficial ? (
                <span className="af-agb-approval__hint">{countdown}s 后自动拒绝 · 悬停暂停</span>
              ) : null}
            </span>
            <span className="af-agb-approval__actions">
              {actions !== undefined ? (
                actions
              ) : (
                <>
                  {onEdit ? (
                    <AfButton variant="ghost" disabled={busy} onClick={onEdit}>
                      {resolvedEditLabel}
                    </AfButton>
                  ) : null}
                  <AfButton
                    variant="ghost"
                    loading={busy && busyAction === "deny"}
                    disabled={busy && busyAction === "approve"}
                    kbd={shortcuts ? "Esc" : undefined}
                    onClick={deny}
                    className="af-agb-approval__deny"
                  >
                    {resolvedDenyLabel}
                  </AfButton>
                  <AfButton
                    variant="primary"
                    loading={busy && busyAction === "approve"}
                    disabled={busy && busyAction === "deny"}
                    kbd={shortcuts ? "Ctrl ↵" : undefined}
                    onClick={approve}
                    className={isOfficial ? "af-agb-approval__approve-dark" : undefined}
                  >
                    {resolvedApproveLabel}
                  </AfButton>
                </>
              )}
            </span>
          </div>
          {!isOfficial ? (
            <span
              className="af-agb-approval__countdown"
              style={{ transform: `scaleX(${countdown / Math.max(1, effectiveTimeout)})` }}
              aria-hidden
            />
          ) : null}
        </div>

        {resolved ? (
          <div
            className="af-agb-record af-agb-approval__record"
            data-tone={tone}
            ref={recordRef}
            tabIndex={-1}
            role="status"
            onPointerEnter={() => setRecordPaused(true)}
            onPointerLeave={() => setRecordPaused(false)}
            onFocus={() => setRecordPaused(true)}
            onBlur={() => setRecordPaused(false)}
          >
            <span className="af-agb-record__icon" aria-hidden>
              <AfIcon name={tone === "success" ? "check" : "x"} size={12} />
            </span>
            <span className="af-agb-record__title">{resolvedTitle}</span>
            <span className="af-agb-record__meta">
              {isOfficial
                ? `${phase === "approved" ? "Approved" : "Denied"} · ${recordCountdown > 0 ? "Just now" : "Sent"}`
                : `${phase === "approved" ? "已批准" : "已拒绝"} · ${recordCountdown > 0 ? "刚刚" : "已生效"}`}
            </span>
            {recordCountdown > 0 ? (
              <AfButton size="sm" variant="ghost" onClick={undo}>
                {isOfficial ? "Undo" : "撤销"}
              </AfButton>
            ) : null}
            {recordCountdown > 0 ? (
              <span
                className="af-agb-record__bar"
                style={{ transform: `scaleX(${recordCountdown / 10})` }}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}
        <span className="af-agb-sr" role="status" aria-live="polite">
          {phase === "approved"
            ? isOfficial
              ? "Approved"
              : "已批准"
            : phase === "denied"
              ? isOfficial
                ? "Denied"
                : "已拒绝"
              : ""}
        </span>
      </div>
      {showNote ? (
        <p className="af-agb-approval__note">
          Ctrl / ⌘ + Enter to approve · Esc to deny · collapses into an undoable single-line receipt
        </p>
      ) : null}
    </div>
  );
}

export { ApprovalCardDemo as AfApprovalCardPattern, ApprovalCardDemo as AfApprovalCard };
export type { AfApprovalCardPatternProps as AfApprovalCardProps };
