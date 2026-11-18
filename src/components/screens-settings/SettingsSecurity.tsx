import { useId, useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfSwitch } from "../controls/Switch";
import { AfBadge } from "../display/Badge";
import {
  CopyActionButton,
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  copySettingsText,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfSecurityDomain = {
  domain: string;
  verified: boolean;
  txtRecord: string;
};

export type AfIpAllowEntry = {
  cidr: string;
  label?: string;
};

export type AfSecurityValues = {
  domains: AfSecurityDomain[];
  joinByDomain: boolean;
  sso: boolean;
  metadataUrl: string;
  twoStep: boolean;
  sessionLength: string;
  ipRanges: AfIpAllowEntry[];
};

export type AfSettingsSecurityProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Workspace security rules; uses sample Acme workspace when omitted. */
  security?: AfSecurityValues;
  /** Called with all settings whenever something changes (switches & lists at once, metadata URL on blur). */
  onSave?: (security: AfSecurityValues) => void;
  /** Checks the domain's TXT record; resolves `true` once found. */
  onVerifyDomain?: (domain: string) => Promise<boolean>;
  /** Called once signing everyone out is confirmed. */
  onSignOutAll?: () => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching domains, switches, session length, IdP and IP ranges. */
  loading?: boolean;
  /** Empty state: "No domains yet", "No IP ranges", SSO and domain joining off. */
  empty?: boolean;
};

const DEFAULT_SECURITY: AfSecurityValues = {
  domains: [
    { domain: "acme.com", verified: true, txtRecord: "workspace-verify=7b2e91f0" },
    { domain: "acme.io", verified: false, txtRecord: "workspace-verify=7f3c9a1e" },
  ],
  joinByDomain: true,
  sso: true,
  metadataUrl: "https://acme.okta.com/app/exk92a1f/sso/saml/metadata",
  twoStep: false,
  sessionLength: "30d",
  ipRanges: [
    { cidr: "198.51.100.0/24", label: "Vienna HQ" },
    { cidr: "203.0.113.18/32", label: "Prod WireGuard egress" },
  ],
};

const SESSION_LENGTH_OPTIONS: AfSelectOption[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const CIDR_RE = /^(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[0-9]|[12][0-9]|3[0-2]))?$/;

/** Settings / Security — Verified email domains, SAML SSO & 2FA sign-in rules, copyable IdP details, IP allowlist and global sign-out. */
export function AfSettingsSecurity(props: AfSettingsSecurityProps = {}) {
  const {
    security: securityProp,
    onSave,
    onVerifyDomain,
    onSignOutAll,
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const initial = useMemo<AfSecurityValues>(() => {
    const base = securityProp ?? DEFAULT_SECURITY;
    if (!empty) return base;
    return {
      ...base,
      domains: [],
      joinByDomain: false,
      sso: false,
      metadataUrl: "",
      ipRanges: [],
    };
  }, [empty, securityProp]);

  const [values, setValues] = useState<AfSecurityValues>(initial);
  const [savedMetaUrl, setSavedMetaUrl] = useState(initial.metadataUrl);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // Add domain inline form
  const [domainFormOpen, setDomainFormOpen] = useState(false);
  const [domainDraft, setDomainDraft] = useState("");

  // Add IP range inline form
  const [rangeFormOpen, setRangeFormOpen] = useState(false);
  const [cidrDraft, setCidrDraft] = useState("");
  const [cidrLabelDraft, setCidrLabelDraft] = useState("");

  // Sign out everyone confirmation
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const metaUrlId = useId();
  const { toastMessage, announce } = useSettingsToast();

  const hasVerifiedDomain = values.domains.some((d) => d.verified);
  const wsSlug = workspace.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "acme";
  const entityId = `https://app.workspace.ai/saml/${wsSlug}`;
  const acsUrl = `https://app.workspace.ai/saml/${wsSlug}/acs`;

  const commit = (next: AfSecurityValues, msg: string) => {
    setValues(next);
    onSave?.(next);
    announce(msg);
  };

  const handleAddDomain = () => {
    const cleaned = domainDraft.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!DOMAIN_RE.test(cleaned)) {
      announce("Enter a valid domain such as acme.com");
      return;
    }
    if (values.domains.some((d) => d.domain === cleaned)) {
      announce(`${cleaned} is already in the list`);
      return;
    }
    const token = `workspace-verify=${Math.random().toString(16).slice(2, 10)}`;
    const nextDomains = [...values.domains, { domain: cleaned, verified: false, txtRecord: token }];
    setDomainDraft("");
    setDomainFormOpen(false);
    commit({ ...values, domains: nextDomains }, `Added ${cleaned} — add TXT record to verify`);
  };

  const handleVerifyDomain = async (domain: string) => {
    setVerifyingDomain(domain);
    try {
      const ok = onVerifyDomain
        ? await onVerifyDomain(domain)
        : await new Promise<boolean>((resolve) => window.setTimeout(() => resolve(true), 450));
      if (ok) {
        const nextDomains = values.domains.map((d) =>
          d.domain === domain ? { ...d, verified: true } : d,
        );
        commit({ ...values, domains: nextDomains }, `Verified ${domain}`);
      } else {
        announce(`TXT record not found yet for ${domain}`);
      }
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemoveDomain = (domain: string) => {
    const nextDomains = values.domains.filter((d) => d.domain !== domain);
    const stillVerified = nextDomains.some((d) => d.verified);
    commit(
      {
        ...values,
        domains: nextDomains,
        joinByDomain: stillVerified ? values.joinByDomain : false,
        sso: stillVerified ? values.sso : false,
      },
      `Removed ${domain}`,
    );
  };

  const handleAddRange = () => {
    const raw = cidrDraft.trim();
    if (!CIDR_RE.test(raw)) {
      announce("Enter a valid IPv4 CIDR range such as 198.51.100.0/24");
      return;
    }
    const cidr = raw.includes("/") ? raw : `${raw}/32`;
    const nextRanges = [...values.ipRanges, { cidr, label: cidrLabelDraft.trim() || undefined }];
    setCidrDraft("");
    setCidrLabelDraft("");
    setRangeFormOpen(false);
    commit({ ...values, ipRanges: nextRanges }, `Added IP range ${cidr}`);
  };

  return (
    <SettingsShell
      activeSlug="settings-security"
      title="Security"
      lead="Decide who can sign in to your workspace and how."
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      {/* Email domains */}
      <SettingsSection
        title="Email domains"
        description="Verify the domains your team signs in with. Verified domains unlock joining by domain and single sign-on."
        extra={
          !loading ? (
            <AfButton
              size="sm"
              variant="secondary"
              icon={<AfIcon name="plus" size={13} />}
              aria-expanded={domainFormOpen}
              onClick={() => setDomainFormOpen((v) => !v)}
            >
              Add domain
            </AfButton>
          ) : null
        }
      >
        {domainFormOpen ? (
          <div className="af-ss__card">
            <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
              <AfInput
                aria-label="Email domain"
                placeholder="acme.com"
                value={domainDraft}
                onChange={(e) => setDomainDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setDomainFormOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                style={{ flex: "1 1 220px" }}
              />
              <AfButton size="sm" variant="ghost" onClick={() => setDomainFormOpen(false)}>
                Cancel
              </AfButton>
              <AfButton size="sm" variant="primary" onClick={handleAddDomain}>
                Add
              </AfButton>
            </div>
          </div>
        ) : null}

        {loading ? (
          <SettingsSkel width="100%" height={116} radius={14} />
        ) : values.domains.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No domains yet</span>
            <p className="af-ss__empty-desc">
              Add your company domain to let colleagues join automatically or require SAML SSO.
            </p>
            <AfButton size="sm" variant="secondary" onClick={() => setDomainFormOpen(true)}>
              Add domain
            </AfButton>
          </div>
        ) : (
          <div className="af-ss__card">
            {values.domains.map((item) => (
              <div key={item.domain} style={{ display: "flex", flexDirection: "column" }}>
                <SettingsRow
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--af-page-muted)", display: "inline-flex" }} aria-hidden="true">
                        <AfIcon name="globe" size={14} />
                      </span>
                      <span>{item.domain}</span>
                    </span>
                  }
                  badge={
                    item.verified ? (
                      <AfBadge tone="success" size="sm">Verified</AfBadge>
                    ) : (
                      <AfBadge tone="neutral" size="sm">Pending</AfBadge>
                    )
                  }
                  inlineMobile
                >
                  {!item.verified ? (
                    <AfButton
                      size="sm"
                      variant="secondary"
                      loading={verifyingDomain === item.domain}
                      onClick={() => void handleVerifyDomain(item.domain)}
                    >
                      Verify
                    </AfButton>
                  ) : null}
                  <span className="af-ss__hover-rm">
                    <AfButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${item.domain}`}
                      onClick={() => handleRemoveDomain(item.domain)}
                    >
                      Remove
                    </AfButton>
                  </span>
                </SettingsRow>

                {!item.verified ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 16px",
                      background: "var(--af-surface-sunken)",
                      boxShadow: "var(--af-divider-hairline-top)",
                      color: "var(--af-page-muted)",
                      fontSize: "var(--af-fs-xs)",
                      lineHeight: "18px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "var(--af-page-faint)", display: "inline-flex", flex: "none" }} aria-hidden="true">
                      <AfIcon name="info" size={13} />
                    </span>
                    <span>
                      Add a TXT record{" "}
                      <button
                        type="button"
                        aria-label={`Copy TXT record ${item.txtRecord}`}
                        onClick={() => {
                          void copySettingsText(item.txtRecord).then((ok) => {
                            if (ok) announce("Copied DNS TXT record");
                          });
                        }}
                        style={{
                          padding: "1px 6px",
                          border: 0,
                          borderRadius: 5,
                          background: "var(--af-surface)",
                          boxShadow: "var(--af-shadow-hairline)",
                          color: "var(--af-page-strong)",
                          fontFamily: "var(--af-mono)",
                          fontSize: 11.5,
                          cursor: "pointer",
                        }}
                      >
                        {item.txtRecord}
                      </button>{" "}
                      to the domain&apos;s DNS, then press Verify.
                    </span>
                  </div>
                ) : null}
              </div>
            ))}

            <SettingsRow
              label="Join by domain"
              hint={
                hasVerifiedDomain
                  ? "Anyone with a verified address joins as a member without an invite"
                  : "Verify at least one email domain above to enable automatic joining"
              }
              inlineMobile
            >
              <AfSwitch
                ariaLabel="Join by domain"
                checked={values.joinByDomain}
                disabled={!hasVerifiedDomain}
                onChange={(joinByDomain) =>
                  commit({ ...values, joinByDomain }, joinByDomain ? "Domain joining enabled" : "Domain joining disabled")
                }
              />
            </SettingsRow>
          </div>
        )}
      </SettingsSection>

      {/* Sign-in policies */}
      <SettingsSection title="Sign-in">
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow
            label="Require single sign-on (SAML)"
            hint={
              hasVerifiedDomain
                ? "Members at a verified domain sign in through your identity provider"
                : "Requires at least one verified email domain"
            }
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Require single sign-on (SAML)"
                checked={values.sso}
                disabled={!hasVerifiedDomain}
                onChange={(sso) => commit({ ...values, sso }, sso ? "SAML SSO enabled" : "SAML SSO disabled")}
              />
            )}
          </SettingsRow>

          <SettingsRow
            label="Two-step verification"
            hint="Everyone without SSO adds a code from an authenticator app"
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Two-step verification"
                checked={values.twoStep}
                onChange={(twoStep) =>
                  commit({ ...values, twoStep }, twoStep ? "Two-step verification required" : "Two-step verification optional")
                }
              />
            )}
          </SettingsRow>

          <SettingsRow label="Session length" hint="How long people stay signed in without activity">
            {loading ? (
              <SettingsSkel width={140} height={32} />
            ) : (
              <AfSelect
                label="Session length"
                icon="clock"
                value={values.sessionLength}
                options={SESSION_LENGTH_OPTIONS}
                width={148}
                onChange={(sessionLength) => commit({ ...values, sessionLength }, "Session length updated")}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      {/* Identity Provider */}
      <SettingsSection
        title="Identity provider"
        description="Copy these into Okta, Entra ID or Google Workspace, then paste the metadata URL they give you."
      >
        <div className="af-ss__card">
          <SettingsRow label="Audience URI" hint="SP entity ID">
            {loading ? (
              <SettingsSkel width={260} height={30} />
            ) : (
              <div className="af-ss__ro-field">
                <input
                  type="text"
                  readOnly
                  aria-label="Audience URI"
                  className="af-ss__ro-input"
                  value={entityId}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <CopyActionButton
                  value={entityId}
                  variant="secondary"
                  ariaLabel="Copy Audience URI"
                  onCopied={() => announce("Copied Audience URI")}
                />
              </div>
            )}
          </SettingsRow>

          <SettingsRow label="ACS URL" hint="Assertion consumer service">
            {loading ? (
              <SettingsSkel width={260} height={30} />
            ) : (
              <div className="af-ss__ro-field">
                <input
                  type="text"
                  readOnly
                  aria-label="ACS URL"
                  className="af-ss__ro-input"
                  value={acsUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <CopyActionButton
                  value={acsUrl}
                  variant="secondary"
                  ariaLabel="Copy ACS URL"
                  onCopied={() => announce("Copied ACS URL")}
                />
              </div>
            )}
          </SettingsRow>

          <SettingsRow label="IdP Metadata URL" htmlFor={metaUrlId} wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfInput
                id={metaUrlId}
                value={values.metadataUrl}
                placeholder="https://idp.example.com/sso/saml/metadata"
                onChange={(e) => setValues((p) => ({ ...p, metadataUrl: e.target.value }))}
                onBlur={() => {
                  if (values.metadataUrl !== savedMetaUrl) {
                    setSavedMetaUrl(values.metadataUrl);
                    commit(values, "IdP metadata URL saved");
                  }
                }}
                style={{ width: "100%" }}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      {/* IP Allowlist */}
      <SettingsSection
        title="IP allowlist"
        description="Only let people in from these ranges. With none, every network can reach the workspace."
        extra={
          !loading ? (
            <AfButton
              size="sm"
              variant="secondary"
              icon={<AfIcon name="plus" size={13} />}
              aria-expanded={rangeFormOpen}
              onClick={() => setRangeFormOpen((v) => !v)}
            >
              Add range
            </AfButton>
          ) : null
        }
      >
        {rangeFormOpen ? (
          <div className="af-ss__card">
            <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
              <AfInput
                aria-label="CIDR range"
                placeholder="198.51.100.0/24"
                value={cidrDraft}
                onChange={(e) => setCidrDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setRangeFormOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRange();
                  }
                }}
                style={{ flex: "1 1 170px" }}
              />
              <AfInput
                aria-label="Range label"
                placeholder="Note (e.g. Office VPN)"
                value={cidrLabelDraft}
                onChange={(e) => setCidrLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setRangeFormOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRange();
                  }
                }}
                style={{ flex: "1 1 170px" }}
              />
              <AfButton size="sm" variant="ghost" onClick={() => setRangeFormOpen(false)}>
                Cancel
              </AfButton>
              <AfButton size="sm" variant="primary" onClick={handleAddRange}>
                Add
              </AfButton>
            </div>
          </div>
        ) : null}

        {loading ? (
          <SettingsSkel width="100%" height={84} radius={14} />
        ) : values.ipRanges.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No IP ranges</span>
            <p className="af-ss__empty-desc">
              Every network can currently reach {workspace}. Add office or VPN CIDRs to restrict access.
            </p>
            <AfButton size="sm" variant="secondary" onClick={() => setRangeFormOpen(true)}>
              Add range
            </AfButton>
          </div>
        ) : (
          <div className="af-ss__card">
            {values.ipRanges.map((entry) => (
              <SettingsRow
                key={entry.cidr}
                label={<span style={{ fontFamily: "var(--af-mono)", fontSize: 12.5 }}>{entry.cidr}</span>}
                hint={entry.label}
                inlineMobile
              >
                <span className="af-ss__hover-rm">
                  <AfButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${entry.cidr}`}
                    onClick={() =>
                      commit(
                        { ...values, ipRanges: values.ipRanges.filter((r) => r.cidr !== entry.cidr) },
                        `Removed IP range ${entry.cidr}`,
                      )
                    }
                  >
                    Remove
                  </AfButton>
                </span>
              </SettingsRow>
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection title="Danger zone" danger>
        <div className="af-ss__card" data-danger="true">
          <SettingsRow
            label="Sign everyone out"
            hint="Immediately revoke all active browser, mobile and desktop sessions across the workspace."
          >
            <AfButton
              size="sm"
              variant="danger"
              aria-expanded={confirmSignOut}
              onClick={() => setConfirmSignOut((v) => !v)}
            >
              Sign everyone out
            </AfButton>
          </SettingsRow>

          {confirmSignOut ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Every member (including you) will need to sign in again.
                </span>
                <div style={{ display: "inline-flex", gap: 8 }}>
                  <AfButton size="sm" variant="ghost" onClick={() => setConfirmSignOut(false)}>
                    Cancel
                  </AfButton>
                  <AfButton
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setConfirmSignOut(false);
                      onSignOutAll?.();
                      announce("Signed everyone out of the workspace");
                    }}
                  >
                    Confirm sign out
                  </AfButton>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
}
