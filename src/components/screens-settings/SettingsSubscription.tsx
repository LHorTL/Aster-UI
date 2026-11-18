import { useId, useState, type HTMLAttributes, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfSegmented } from "../controls/Segmented";
import { AfSwitch } from "../controls/Switch";
import { AfBadge } from "../display/Badge";
import { AfModal } from "../overlay/Modal";
import {
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfSettingsSubscriptionProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Called with `"Members"` from Manage members / `+`, or `"Back to app"` / sidebar label. */
  onNavigate?: (label: string) => void;
  /** Workspace name used by the shell. Default `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching plan, upcoming bill, usage, billing details and invoices. */
  loading?: boolean;
  /** New subscription state: plan and usage stay, history shows "No invoices yet" with Preview first bill. */
  empty?: boolean;
};

type PlanId = "pro" | "team" | "business";

const PLAN_DEFS: {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  tagline: string;
  prefixNote?: string;
  features: ReactNode[];
}[] = [
  {
    id: "pro",
    name: "Pro",
    monthly: 49,
    yearly: 39,
    tagline: "Essential models, agents and workspace storage.",
    features: [
      "Chat with the leading models in one place",
      "50,000 workspace credits per month",
      "100 GB shared knowledge storage",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 69,
    yearly: 55,
    tagline: "Chat and agents for your whole team",
    features: [
      "Chat with the leading models in one place",
      "Your own agents, skills and integrations",
      <span key="wf"><strong>Workflows:</strong> 2,500 runs per month</span>,
      "SSO, SCIM and SAML",
      <span key="mt"><strong>Meetings:</strong> 10 recordings per member a month</span>,
      <span key="ap"><strong>Apps:</strong> share each app with up to 5 people</span>,
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 89,
    yearly: 71,
    tagline: "Unlimited meetings and app sharing, for the whole company",
    prefixNote: "Everything in Team, plus:",
    features: [
      <span key="um"><strong>Unlimited meetings:</strong> record, transcribe and sum up every one</span>,
      <span key="ua"><strong>Unlimited app sharing:</strong> with anyone, any group or the whole workspace</span>,
      <span key="uw"><strong>4× the workflow runs:</strong> 10,000 per month</span>,
    ],
  },
];

const INVOICES = [
  { id: "INV-2026-11", date: "Nov 6, 2026", desc: "Pro plan · 6 members", amount: "$294.00", status: "Paid" },
  { id: "INV-2026-10", date: "Oct 6, 2026", desc: "Pro plan · 6 members", amount: "$294.00", status: "Paid" },
  { id: "INV-2026-09", date: "Sep 6, 2026", desc: "Pro plan · 5 members", amount: "$245.00", status: "Paid" },
];

/** Settings / Billing (`settings-subscription`) — Current plan, upcoming bill breakdown, 4-column usage strip, monthly/yearly plans & add-ons, billing details, invoices and cancel modal. */
export function AfSettingsSubscription(props: AfSettingsSubscriptionProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [currentPlan, setCurrentPlan] = useState<PlanId>("pro");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retentionAddon, setRetentionAddon] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Billing details inline edits
  const [editingCard, setEditingCard] = useState(false);
  const [cardLast4, setCardLast4] = useState("4242");
  const [editingAddress, setEditingAddress] = useState(false);
  const [billingEmail, setBillingEmail] = useState("billing@acme.com");
  const [billingAddress, setBillingAddress] = useState("Acme GmbH · Mariahilfer Straße 47, 1060 Vienna, AT");

  const plansSectionId = useId();
  const { toastMessage, announce } = useSettingsToast();

  const seats = 6;
  const seatCap = 10;
  const activePlanObj = PLAN_DEFS.find((p) => p.id === currentPlan) ?? PLAN_DEFS[0]!;
  const unitPrice = cycle === "yearly" ? activePlanObj.yearly : activePlanObj.monthly;
  const addonPrice = retentionAddon ? 82 : 0;
  const upcomingTotal = seats * unitPrice + addonPrice;

  const otherPlans = PLAN_DEFS.filter((p) => p.id !== currentPlan);

  const usageMeters = [
    {
      id: "seats",
      icon: "users" as const,
      label: "Seats",
      current: String(seats),
      limit: String(seatCap),
      pct: Math.round((seats / seatCap) * 100),
      warn: false,
      hasAdd: true,
      hasInfo: false,
    },
    {
      id: "credits",
      icon: "bolt" as const,
      label: "Credits",
      current: "34,000",
      limit: "50,000",
      pct: 68,
      warn: false,
      hasAdd: false,
      hasInfo: true,
    },
    {
      id: "storage",
      icon: "database" as const,
      label: "Storage",
      current: "42.6 GB",
      limit: "100 GB",
      pct: 43,
      warn: false,
      hasAdd: false,
      hasInfo: false,
    },
    {
      id: "runs",
      icon: "clock" as const,
      label: "Agent runs",
      current: "2,310",
      limit: "2,500",
      pct: 92,
      warn: true,
      hasAdd: false,
      hasInfo: false,
    },
  ];

  return (
    <SettingsShell
      activeSlug="settings-subscription"
      title="Billing"
      lead="See your plan, what you pay and what you've used."
      headerActions={
        <button
          type="button"
          onClick={() => announce("Opened billing documentation")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 6px",
            border: 0,
            borderRadius: 6,
            background: "transparent",
            color: "var(--af-page-muted)",
            font: "inherit",
            fontSize: "var(--af-fs-sm)",
            cursor: "pointer",
          }}
        >
          <span>Open docs</span>
          <AfIcon name="arrowUpRight" size={12} />
        </button>
      }
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      {/* Unified Summary Card: Plan + Upcoming bill + 4-column usage strip */}
      <div className="af-ss__card">
        {loading ? (
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <SettingsSkel width="50%" height={76} radius={10} />
              <SettingsSkel width="50%" height={76} radius={10} />
            </div>
            <SettingsSkel width="100%" height={56} radius={10} />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {/* Left: Current Plan */}
              <div
                style={{
                  flex: "1 1 250px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "color-mix(in srgb, var(--af-accent) 14%, var(--af-surface))",
                      color: "var(--af-accent-ink)",
                      flex: "none",
                    }}
                  >
                    <AfIcon name="sparkle" size={15} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 620, fontSize: "var(--af-fs-md)", color: "var(--af-page-strong)" }}>
                        {activePlanObj.name} plan
                      </span>
                      {cancelled ? <AfBadge tone="warning" size="sm">Ends Dec 6</AfBadge> : null}
                    </div>
                    <p className="af-ss__row-hint" style={{ marginTop: 1 }}>
                      ${unitPrice} per member / month, billed {cycle}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <AfButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      document.getElementById(plansSectionId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      announce("Viewing workspace plans");
                    }}
                  >
                    Explore plans
                  </AfButton>
                  {cancelled ? (
                    <AfButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCancelled(false);
                        announce("Subscription resumed");
                      }}
                    >
                      Resume plan
                    </AfButton>
                  ) : null}
                </div>
              </div>

              {/* Right: Upcoming bill */}
              <div
                style={{
                  flex: "1 1 250px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 18px",
                  boxShadow: "inset 1px 0 0 var(--af-line-strong)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontWeight: 600,
                      fontSize: "var(--af-fs-md)",
                      color: "var(--af-page-strong)",
                    }}
                  >
                    <span>Upcoming bill</span>
                    <span
                      style={{ color: "var(--af-page-faint)", display: "inline-flex" }}
                      title="Prorated automatically as members join or leave"
                    >
                      <AfIcon name="info" size={13} />
                    </span>
                  </div>
                  <p className="af-ss__row-hint" style={{ marginTop: 2 }}>
                    {cancelled ? "Ends on Dec 6, 2026" : "Renews on Dec 6, 2026"}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <button
                    type="button"
                    aria-expanded={detailsOpen}
                    onClick={() => setDetailsOpen((v) => !v)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      color: "var(--af-page-muted)",
                      font: "inherit",
                      fontSize: "var(--af-fs-sm)",
                      cursor: "pointer",
                    }}
                  >
                    <span>{detailsOpen ? "Hide details" : "Show details"}</span>
                    <AfIcon name={detailsOpen ? "chevronUp" : "chevronDown"} size={12} />
                  </button>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 660,
                      letterSpacing: "-0.025em",
                      color: "var(--af-page-strong)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ${upcomingTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {detailsOpen ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 18px",
                  background: "var(--af-surface-sunken)",
                  boxShadow: "var(--af-divider-hairline-top)",
                  fontSize: "var(--af-fs-xs)",
                  color: "var(--af-page-muted)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{seats} × {activePlanObj.name} plan (${unitPrice} / member)</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>${(seats * unitPrice).toLocaleString()}</span>
                </div>
                {retentionAddon ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Extended audit &amp; retention add-on</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>$82</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 4-column usage strip */}
            <div style={{ display: "flex", flexWrap: "wrap", boxShadow: "var(--af-divider-hairline-top)" }}>
              {usageMeters.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    flex: "1 1 135px",
                    minWidth: 130,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "12px 15px 14px",
                    boxShadow: idx > 0 ? "inset 1px 0 0 var(--af-line-strong)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minHeight: 18 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        color: "var(--af-page-muted)",
                        fontSize: "var(--af-fs-xs)",
                        fontWeight: 520,
                      }}
                    >
                      <AfIcon name={m.icon} size={12} />
                      <span>{m.label}</span>
                      {m.hasInfo ? (
                        <span style={{ color: "var(--af-page-faint)", display: "inline-flex" }}>
                          <AfIcon name="info" size={11} />
                        </span>
                      ) : null}
                    </span>
                    {m.hasAdd ? (
                      <button
                        type="button"
                        className="af-ss__icon-btn"
                        style={{ width: 18, height: 18 }}
                        aria-label="Add seats in Members"
                        onClick={() => onNavigate?.("Members")}
                      >
                        <AfIcon name="plus" size={12} />
                      </button>
                    ) : null}
                  </div>

                  <div style={{ fontSize: "var(--af-fs-xs)", fontVariantNumeric: "tabular-nums", lineHeight: "16px" }}>
                    <strong style={{ fontWeight: 640, color: "var(--af-page-strong)" }}>{m.current}</strong>
                    <span style={{ color: "var(--af-page-faint)" }}> / {m.limit}</span>
                  </div>

                  <div
                    className="af-ss__meter"
                    role="progressbar"
                    aria-label={`${m.label}: ${m.pct}% used`}
                    aria-valuenow={m.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="af-ss__meter-fill"
                      data-warn={m.warn ? "true" : undefined}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Plans & add-ons */}
      <div id={plansSectionId} style={{ display: "flex", flexDirection: "column" }}>
        <SettingsSection
          title="Plans & add-ons"
          description="Change your plan any time – we prorate the difference."
          extra={
            !loading ? (
              <AfSegmented
                size="sm"
                aria-label="Billing cycle"
                value={cycle}
                onChange={(val) => {
                  setCycle(val as "monthly" | "yearly");
                  announce(val === "yearly" ? "Switched to yearly pricing (20% off)" : "Switched to monthly pricing");
                }}
                options={[
                  { value: "monthly", label: "Monthly" },
                  {
                    value: "yearly",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span>Yearly</span>
                        <span
                          style={{
                            padding: "1px 5px",
                            borderRadius: 999,
                            background: "color-mix(in srgb, var(--af-accent) 16%, transparent)",
                            color: "var(--af-accent-ink)",
                            fontSize: 10.5,
                            fontWeight: 620,
                            lineHeight: "14px",
                          }}
                        >
                          -20%
                        </span>
                      </span>
                    ),
                  },
                ]}
              />
            ) : null
          }
        >
          {loading ? (
            <SettingsSkel width="100%" height={240} radius={14} />
          ) : (
            <>
              <div className="af-ss__card" style={{ padding: 14, gap: 10 }}>
                {/* Card top header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "2px 2px 4px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "var(--af-accent-ink)", display: "inline-flex" }} aria-hidden="true">
                      <AfIcon name="sparkle" size={16} />
                    </span>
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--af-page-muted)", lineHeight: "15px" }}>Plan</div>
                      <div style={{ fontWeight: 620, fontSize: "var(--af-fs-md)", color: "var(--af-page-strong)", lineHeight: "19px" }}>
                        Chat, agents, meetings &amp; apps
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="af-ss__row-hint" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {seats} members
                    </span>
                    <AfButton size="sm" variant="secondary" onClick={() => onNavigate?.("Members")}>
                      Manage members
                    </AfButton>
                  </div>
                </div>

                {/* Current plan bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--af-surface-sunken)",
                    boxShadow: "var(--af-shadow-hairline)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 620, color: "var(--af-page-strong)", fontSize: "var(--af-fs-md)" }}>
                      {activePlanObj.name}
                    </span>
                    <AfBadge tone="neutral" size="sm">Current plan</AfBadge>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                    <span
                      style={{
                        fontWeight: 650,
                        color: "var(--af-page-strong)",
                        fontSize: "var(--af-fs-md)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${unitPrice}
                    </span>
                    <span className="af-ss__row-hint">per member / month</span>
                  </span>
                </div>

                {/* 2-column upgrade / alternate plans */}
                <div className="af-ss__plans" style={{ gap: 10 }}>
                  {otherPlans.map((plan, pIdx) => {
                    const price = cycle === "yearly" ? plan.yearly : plan.monthly;
                    return (
                      <div
                        key={plan.id}
                        className="af-ss__plan"
                        style={{
                          flex: "1 1 250px",
                          background: "var(--af-surface)",
                          boxShadow: "var(--af-shadow-hairline)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 630, color: "var(--af-page-strong)", fontSize: "var(--af-fs-md)" }}>
                              {plan.name}
                            </div>
                            <p className="af-ss__row-hint" style={{ marginTop: 2 }}>
                              {plan.tagline}
                            </p>
                          </div>

                          <div>
                            <div className="af-ss__plan-price" style={{ fontSize: 22 }}>
                              <span>${price}</span>
                            </div>
                            <p className="af-ss__row-hint" style={{ marginTop: 1 }}>
                              per member / month · models included
                            </p>
                          </div>

                          {plan.prefixNote ? (
                            <p className="af-ss__row-hint" style={{ margin: 0 }}>
                              {plan.prefixNote}
                            </p>
                          ) : null}

                          <ul className="af-ss__plan-features" style={{ gap: 7 }}>
                            {plan.features.map((feat, idx) => (
                              <li key={idx} style={{ alignItems: "flex-start" }}>
                                <span style={{ color: "var(--af-accent-ink)", display: "inline-flex", marginTop: 1 }}>
                                  <AfIcon name="check" size={13} />
                                </span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <AfButton
                          size="sm"
                          variant={pIdx === 0 ? "primary" : "secondary"}
                          onClick={() => {
                            setCurrentPlan(plan.id);
                            announce(`Switched workspace to ${plan.name} plan`);
                          }}
                        >
                          Switch to {plan.name}
                        </AfButton>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="af-ss__card">
                <SettingsRow
                  label="Extended audit & retention add-on"
                  badge={<AfBadge tone="neutral" size="sm">$82 / mo</AfBadge>}
                  hint="365-day audit log exports, SIEM webhook streaming and zero-retention routing."
                  inlineMobile
                >
                  <AfSwitch
                    ariaLabel="Extended audit and retention add-on"
                    checked={retentionAddon}
                    onChange={(on) => {
                      setRetentionAddon(on);
                      announce(on ? "Added Extended retention add-on" : "Removed Extended retention add-on");
                    }}
                  />
                </SettingsRow>
              </div>
            </>
          )}
        </SettingsSection>
      </div>

      {/* Billing details */}
      <SettingsSection title="Billing details" description="Where the invoices go and how they're paid.">
        <div className="af-ss__card">
          <SettingsRow
            label="Payment method"
            hint={loading ? undefined : `Visa ending in ${cardLast4} · Expires 08/2028`}
          >
            {loading ? (
              <SettingsSkel width={120} height={28} />
            ) : (
              <AfButton
                size="sm"
                variant="secondary"
                aria-expanded={editingCard}
                onClick={() => setEditingCard((v) => !v)}
              >
                Update card
              </AfButton>
            )}
          </SettingsRow>

          {editingCard ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AfInput
                  aria-label="Card number last 4 digits"
                  placeholder="Card number (e.g. 4242 4242 •••• 8819)"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length >= 4) setCardLast4(digits.slice(-4));
                  }}
                  style={{ flex: "1 1 220px" }}
                />
                <AfButton size="sm" variant="ghost" onClick={() => setEditingCard(false)}>
                  Cancel
                </AfButton>
                <AfButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setEditingCard(false);
                    announce("Payment method updated");
                  }}
                >
                  Save card
                </AfButton>
              </div>
            </div>
          ) : null}

          <SettingsRow
            label="Billing email & address"
            hint={loading ? undefined : `${billingEmail} · ${billingAddress}`}
          >
            {loading ? (
              <SettingsSkel width={110} height={28} />
            ) : (
              <AfButton
                size="sm"
                variant="secondary"
                aria-expanded={editingAddress}
                onClick={() => setEditingAddress((v) => !v)}
              >
                Edit details
              </AfButton>
            )}
          </SettingsRow>

          {editingAddress ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AfInput
                  aria-label="Billing email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  style={{ flex: "1 1 180px" }}
                />
                <AfInput
                  aria-label="Billing address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  style={{ flex: "2 1 240px" }}
                />
                <AfButton size="sm" variant="ghost" onClick={() => setEditingAddress(false)}>
                  Cancel
                </AfButton>
                <AfButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setEditingAddress(false);
                    announce("Billing details saved");
                  }}
                >
                  Save
                </AfButton>
              </div>
            </div>
          ) : null}

          {!loading && !cancelled ? (
            <SettingsRow
              label="Cancel subscription"
              hint="Downgrade to Free at the end of your current billing cycle."
            >
              <AfButton size="sm" variant="ghost" onClick={() => setCancelModalOpen(true)}>
                Cancel plan
              </AfButton>
            </SettingsRow>
          ) : null}
        </div>
      </SettingsSection>

      {/* Invoice history */}
      <SettingsSection title="History" description="Your past invoices and payments.">
        {loading ? (
          <SettingsSkel width="100%" height={140} radius={14} />
        ) : empty ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No invoices yet</span>
            <p className="af-ss__empty-desc">
              Your first invoice will appear here on Dec 6, 2026.
            </p>
            <AfButton
              size="sm"
              variant="secondary"
              onClick={() => {
                setDetailsOpen(true);
                announce(`Previewing first bill: $${upcomingTotal.toLocaleString()} on Dec 6`);
              }}
            >
              Preview first bill
            </AfButton>
          </div>
        ) : (
          <div className="af-ss__table-wrap">
            <table className="af-ss__table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Amount</th>
                  <th scope="col" style={{ width: 92, textAlign: "right" }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--af-page-strong)" }}>{inv.date}</td>
                    <td>{inv.desc}</td>
                    <td>
                      <AfBadge tone="success" size="sm">{inv.status}</AfBadge>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 550, color: "var(--af-page-strong)" }}>
                      {inv.amount}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <AfButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Download PDF for ${inv.date}`}
                        icon={<AfIcon name="download" size={13} />}
                        onClick={() => announce(`Downloaded ${inv.id}.pdf`)}
                      >
                        PDF
                      </AfButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsSection>

      <AfModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel workspace subscription?"
        description={`Your ${activePlanObj.name} features and shared seats will stay active through Dec 6, 2026, then ${workspace} will downgrade to Free.`}
        size="sm"
        contained
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <AfButton size="sm" variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Keep {activePlanObj.name}
            </AfButton>
            <AfButton
              size="sm"
              variant="danger"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelled(true);
                announce("Subscription scheduled to cancel on Dec 6");
              }}
            >
              Confirm cancellation
            </AfButton>
          </div>
        }
      />
    </SettingsShell>
  );
}

/** Semantic alias matching affectUI's "Settings / Billing" title. */
export function AfSettingsBilling(props: AfSettingsSubscriptionProps = {}) {
  return <AfSettingsSubscription {...props} />;
}
