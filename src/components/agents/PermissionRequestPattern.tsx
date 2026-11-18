import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import {
  AgbBrandLogo,
  PermissionGrant,
  RiskTriangleIcon,
  formatUntil,
  reducedMotion,
  useCountdown,
} from "../_shared/agents-b";

export type { PermissionGrant };

export interface AfPermissionRequestPatternProps {
  /** Requested action label (e.g. `"push to main"`). */
  targetLabel?: ReactNode;
  /** Default grant scope (`"once"` matches official AffectUI). */
  defaultGrant?: PermissionGrant;
  /** Timeout seconds, default `45`. */
  timeoutSeconds?: number;
  /** Grant callback. */
  onGrant?: (grant: PermissionGrant) => void;
  /** Deny callback. */
  onDeny?: () => void;
  /** Show external shortcut hint row, default `false`. */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

const SCOPES: { value: PermissionGrant; label: string; cta: string }[] = [
  { value: "once", label: "Just once", cta: "Allow once" },
  { value: "hour", label: "1 hour", cta: "Allow 1h" },
  { value: "always", label: "Always", cta: "Allow always" },
];

function PermissionRequestDemo({
  targetLabel = "push to main",
  defaultGrant = "once",
  onGrant,
  onDeny,
  showNote = false,
  className,
  style,
}: AfPermissionRequestPatternProps = {}) {
  const [phase, setPhase] = useState<"pending" | "busy" | "granted" | "denied">("pending");
  const [busyAction, setBusyAction] = useState<"allow" | "deny" | null>(null);
  const [grant, setGrant] = useState<PermissionGrant>(defaultGrant);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [recordPaused, setRecordPaused] = useState(false);
  const [windowKey, setWindowKey] = useState(0);
  const pendingRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const busyTimer = useRef<number | null>(null);
  const resolved = phase === "granted" || phase === "denied";
  const grantSeconds = 3600;
  const grantRemaining = useCountdown(grantSeconds, windowKey, !resolved || phase !== "granted" || recordPaused);

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

  useEffect(() => {
    if (!resolved) return;
    setHeight(56);
    setReady(true);
    const timer = window.setTimeout(() => {
      if (recordRef.current?.closest(".af")?.getAttribute("data-modality") === "keyboard") {
        recordRef.current.focus({ preventScroll: true });
      }
    }, reducedMotion() ? 20 : 540);
    return () => window.clearTimeout(timer);
  }, [resolved]);

  useEffect(
    () => () => {
      if (busyTimer.current) window.clearTimeout(busyTimer.current);
    },
    [],
  );

  const allow = () => {
    if (phase !== "pending") return;
    setBusyAction("allow");
    setPhase("busy");
    busyTimer.current = window.setTimeout(() => {
      setBusyAction(null);
      setPhase("granted");
      onGrant?.(grant);
    }, 680);
  };

  const deny = () => {
    if (phase !== "pending") return;
    setBusyAction("deny");
    setPhase("busy");
    busyTimer.current = window.setTimeout(() => {
      setBusyAction(null);
      setPhase("denied");
      onDeny?.();
    }, 560);
  };

  const undo = () => {
    setBusyAction(null);
    setPhase("pending");
    setWindowKey((value) => value + 1);
  };

  const busy = phase === "busy";
  const inertProps = (resolved ? { inert: "true" as unknown as boolean } : {}) as Record<string, unknown>;
  const activeScope = SCOPES.find((item) => item.value === grant) ?? SCOPES[0];
  const recordTitle =
    phase === "denied"
      ? `Denied · ${String(targetLabel)}`
      : `${grant === "once" ? "Allowed once" : grant === "hour" ? "Allowed for 1 hour" : "Always allowed"} · ${String(targetLabel)}`;
  const recordMeta =
    phase === "denied"
      ? "No permission granted"
      : grant === "once"
        ? "Expires right after this push"
        : grant === "always"
          ? "Manage anytime in Settings → Permissions"
          : `${Math.max(1, Math.ceil(grantRemaining / 60))}m left · until ${formatUntil(grantRemaining)}`;

  return (
    <div className={cn("af-agb-permission-wrap", className)} style={style}>
      <div
        className="af-agb-permission"
        data-phase={phase}
        data-ready={ready || undefined}
        style={{ height }}
        onKeyDown={(event) => {
          if (phase !== "pending") return;
          if (event.key === "Enter") {
            event.preventDefault();
            allow();
          } else if (event.key === "Escape") {
            event.preventDefault();
            deny();
          } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setGrant((value) =>
              value === "once"
                ? event.key === "ArrowRight"
                  ? "hour"
                  : "once"
                : value === "hour"
                  ? event.key === "ArrowRight"
                    ? "always"
                    : "once"
                  : event.key === "ArrowRight"
                    ? "always"
                    : "hour",
            );
          }
        }}
        role="dialog"
        aria-label="Permission request"
        aria-busy={busy || undefined}
      >
        <div
          className="af-agb-permission__pending"
          ref={pendingRef}
          data-busy={busy || undefined}
          data-busy-action={busy ? busyAction ?? undefined : undefined}
          aria-hidden={resolved || undefined}
          {...inertProps}
        >
          <div className="af-agb-permission__top">
            <div className="af-agb-permission__head">
              <span className="af-agb-permission__avatar" aria-hidden>
                <AgbBrandLogo brand="openai" size={18} />
              </span>
              <span className="af-agb-permission__titles">
                <span className="af-agb-permission__title">
                  <strong>Coder</strong> <span className="af-agb-permission__wants">wants to</span>{" "}
                  <strong>{targetLabel}</strong>
                </span>
                <span className="af-agb-permission__repo">
                  <AgbBrandLogo brand="github" size={13} />
                  <span>acme/web</span>
                </span>
              </span>
              <span className="af-agb-permission__risk">
                <RiskTriangleIcon size={12} />
                <span>Risky</span>
              </span>
            </div>

            <p className="af-agb-permission__reason">
              The fix for the flaky checkout test passed review and all 214 checks.
            </p>
          </div>

          <div className="af-agb-permission__section">
            <div className="af-agb-permission__sec-head">
              <span>What will happen</span>
              <span className="af-agb-permission__badge">3</span>
            </div>
            <ul className="af-agb-permission__rows">
              <li>
                <span className="af-agb-permission__rowicon" aria-hidden>
                  <AgbBrandLogo brand="file" size={15} />
                </span>
                <span className="af-agb-permission__rowtext">src/checkout/cart.ts</span>
                <span className="af-agb-diff-add">+12</span>
                <span className="af-agb-diff-del">−4</span>
              </li>
              <li>
                <span className="af-agb-permission__rowicon" aria-hidden>
                  <AgbBrandLogo brand="file" size={15} />
                </span>
                <span className="af-agb-permission__rowtext">tests/checkout.spec.ts</span>
                <span className="af-agb-diff-add">+31</span>
                <span className="af-agb-diff-del">−2</span>
              </li>
              <li>
                <span className="af-agb-permission__rowicon" aria-hidden>
                  <AgbBrandLogo brand="rocket" size={15} />
                </span>
                <span className="af-agb-permission__rowtext">Deploys to production after the merge</span>
              </li>
            </ul>
          </div>

          <div className="af-agb-permission__answer">
            <div className="af-agb-permission__scopes" role="radiogroup" aria-label="Grant duration">
              {SCOPES.map((scope) => {
                const active = grant === scope.value;
                return (
                  <button
                    key={scope.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className="af-agb-permission__scope"
                    data-active={active || undefined}
                    disabled={busy}
                    onClick={() => setGrant(scope.value)}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>

            <div className="af-agb-permission__btns">
              <button
                type="button"
                className="af-agb-permission__btn af-agb-permission__btn--deny"
                disabled={busy}
                onClick={deny}
              >
                <span>{busy && busyAction === "deny" ? "Denying…" : "Deny"}</span>
                <kbd>Esc</kbd>
              </button>
              <button
                type="button"
                className="af-agb-permission__btn af-agb-permission__btn--allow"
                disabled={busy}
                onClick={allow}
              >
                <span>{busy && busyAction === "allow" ? "Allowing…" : activeScope.cta}</span>
                <kbd>↵</kbd>
              </button>
            </div>
          </div>
        </div>

        {resolved ? (
          <div
            className="af-agb-record af-agb-permission__record"
            data-tone={phase === "denied" ? "danger" : "success"}
            ref={recordRef}
            tabIndex={-1}
            role="status"
            onPointerEnter={() => setRecordPaused(true)}
            onPointerLeave={() => setRecordPaused(false)}
            onFocus={() => setRecordPaused(true)}
            onBlur={() => setRecordPaused(false)}
          >
            <span className="af-agb-record__icon" aria-hidden>
              <AfIcon name={phase === "denied" ? "x" : "check"} size={12} />
            </span>
            <span className="af-agb-record__text">
              <span className="af-agb-record__title">{recordTitle}</span>
              <span className="af-agb-record__meta">{recordMeta}</span>
            </span>
            <button type="button" className="af-agb-aic-btn" onClick={undo}>
              {phase === "granted" ? "Revoke" : "Ask again"}
            </button>
            {phase === "granted" && grant === "hour" ? (
              <span
                className="af-agb-record__bar af-agb-record__bar--drain"
                style={{ transform: `scaleX(${grantRemaining / grantSeconds})` }}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}
        <span className="af-agb-sr" role="status" aria-live="polite">
          {phase === "granted"
            ? `${activeScope.cta}: ${String(targetLabel)}`
            : phase === "denied"
              ? `Denied: ${String(targetLabel)}`
              : ""}
        </span>
      </div>
      {showNote ? (
        <p className="af-agb-approval__note">
          Enter to allow with selected scope · Esc to deny · collapses into a 56px receipt with live expiry bar
        </p>
      ) : null}
    </div>
  );
}

export { PermissionRequestDemo as AfPermissionRequestPattern, PermissionRequestDemo as AfPermissionRequest };
export type { AfPermissionRequestPatternProps as AfPermissionRequestProps };
