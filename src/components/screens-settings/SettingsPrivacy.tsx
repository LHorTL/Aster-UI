import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfSwitch } from "../controls/Switch";
import { AfBadge } from "../display/Badge";
import {
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfPrivacySession = {
  id: string;
  device: "laptop" | "phone" | "desktop";
  name: string;
  meta: string;
  current?: boolean;
};

export type AfSharedChatItem = {
  id: string;
  title: string;
  scope: "Public link" | "Workspace";
  shared: string;
  views: number;
};

export type AfPrivacyValues = {
  adMeasurement: boolean;
  analytics: boolean;
  trainOnChats: boolean;
  cookies: {
    preferences: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  productEmails: boolean;
  sessions: AfPrivacySession[];
  sharedChats: AfSharedChatItem[];
};

export type AfSettingsPrivacyProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Privacy, cookie, session and shared link state; uses sample defaults when omitted. */
  privacy?: AfPrivacyValues;
  /** Called with all settings whenever something changes (including session sign-out and stopping a share). */
  onSave?: (privacy: AfPrivacyValues) => void;
  /** Called when an export of every chat and file is requested. */
  onExport?: () => void;
  /** Called once deleting every chat is confirmed. */
  onDeleteChats?: () => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching the real controls while loading; hides counts. */
  loading?: boolean;
  /** Empty state: only this device signed in, and no shared chats yet. */
  empty?: boolean;
};

const DEFAULT_PRIVACY: AfPrivacyValues = {
  adMeasurement: false,
  analytics: true,
  trainOnChats: false,
  cookies: {
    preferences: true,
    analytics: true,
    marketing: false,
  },
  productEmails: false,
  sessions: [
    { id: "s1", device: "laptop", name: "Chrome on macOS", meta: "Vienna, Austria · Signed in with Google · 82.214.130.34", current: true },
    { id: "s2", device: "phone", name: "Safari on iPhone", meta: "Vienna, Austria · Active 3 hours ago" },
    { id: "s3", device: "desktop", name: "Desktop app on Windows", meta: "Berlin, Germany · Active 6 days ago" },
  ],
  sharedChats: [
    { id: "c1", title: "Q4 Pricing Cohort Breakdown", scope: "Public link", shared: "3d ago", views: 18 },
    { id: "c2", title: "Enterprise Security Questionnaire", scope: "Workspace", shared: "Oct 29", views: 9 },
    { id: "c3", title: "Onboarding Flow Copy Variants", scope: "Public link", shared: "Oct 14", views: 31 },
  ],
};

/** Settings / Privacy — Data & cookie switches, emails, active device sessions, shared chat links and data export/delete. */
export function AfSettingsPrivacy(props: AfSettingsPrivacyProps = {}) {
  const {
    privacy: privacyProp,
    onSave,
    onExport,
    onDeleteChats,
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const initial = useMemo<AfPrivacyValues>(() => {
    const base = privacyProp ?? DEFAULT_PRIVACY;
    if (!empty) return base;
    return {
      ...base,
      sessions: base.sessions.filter((s) => s.current),
      sharedChats: [],
    };
  }, [empty, privacyProp]);

  const [values, setValues] = useState<AfPrivacyValues>(initial);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const [shareFilter, setShareFilter] = useState<"all" | "public" | "workspace">("all");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { toastMessage, announce } = useSettingsToast();

  const commit = (next: AfPrivacyValues, msg: string) => {
    setValues(next);
    onSave?.(next);
    announce(msg);
  };

  const filteredShares = useMemo(() => {
    if (shareFilter === "public") return values.sharedChats.filter((c) => c.scope === "Public link");
    if (shareFilter === "workspace") return values.sharedChats.filter((c) => c.scope === "Workspace");
    return values.sharedChats;
  }, [shareFilter, values.sharedChats]);

  const otherSessionsCount = values.sessions.filter((s) => !s.current).length;

  return (
    <SettingsShell
      activeSlug="settings-privacy"
      title="Privacy"
      lead="Decide what you share and where you're signed in."
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <SettingsSection
        title="Data and cookies"
        description="Changes apply on all your devices. Your chats and files are never shared with ad partners."
      >
        <div className="af-ss__card">
          <SettingsRow
            label="Ad measurement"
            hint={
              <span>
                Shares a hashed email and sign-up events with ad partners, so we can tell which ads work.{" "}
                <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>Privacy policy ↗</span>
              </span>
            }
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Ad measurement"
                checked={values.adMeasurement}
                onChange={(adMeasurement) => commit({ ...values, adMeasurement }, "Ad measurement updated")}
              />
            )}
          </SettingsRow>

          <SettingsRow
            label="Product analytics"
            hint="Counts which features you use – never what you type. Works without cookies."
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Product analytics"
                checked={values.analytics}
                onChange={(analytics) => commit({ ...values, analytics }, "Product analytics updated")}
              />
            )}
          </SettingsRow>

          <SettingsRow
            label="Improve models with my chats"
            hint="Lets anonymised chats help train future models. Off by default; workspace chats are never used."
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Improve models with my chats"
                checked={values.trainOnChats}
                onChange={(trainOnChats) => commit({ ...values, trainOnChats }, "Model training preference saved")}
              />
            )}
          </SettingsRow>

          <SettingsRow label="Cookies on this browser" hint="Choose which cookies this device may keep">
            {loading ? (
              <SettingsSkel width={120} height={28} />
            ) : (
              <AfButton
                size="sm"
                variant="secondary"
                aria-expanded={cookiesOpen}
                onClick={() => setCookiesOpen((v) => !v)}
              >
                Manage cookies
              </AfButton>
            )}
          </SettingsRow>

          {cookiesOpen && !loading ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Essential cookies
                </span>
                <AfBadge tone="neutral" size="sm">Always on</AfBadge>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Preference cookies
                </span>
                <AfSwitch
                  size="sm"
                  ariaLabel="Preference cookies"
                  checked={values.cookies.preferences}
                  onChange={(preferences) =>
                    commit({ ...values, cookies: { ...values.cookies, preferences } }, "Cookie preferences saved")
                  }
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Performance cookies
                </span>
                <AfSwitch
                  size="sm"
                  ariaLabel="Performance cookies"
                  checked={values.cookies.analytics}
                  onChange={(analytics) =>
                    commit({ ...values, cookies: { ...values.cookies, analytics } }, "Cookie preferences saved")
                  }
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Marketing attribution
                </span>
                <AfSwitch
                  size="sm"
                  ariaLabel="Marketing attribution cookies"
                  checked={values.cookies.marketing}
                  onChange={(marketing) =>
                    commit({ ...values, cookies: { ...values.cookies, marketing } }, "Cookie preferences saved")
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection title="Emails">
        <div className="af-ss__card">
          <SettingsRow
            label="Product updates"
            hint="Occasional emails about new features and tips – never more than one a month."
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={96} height={28} />
            ) : (
              <AfButton
                size="sm"
                variant={values.productEmails ? "secondary" : "primary"}
                onClick={() =>
                  commit(
                    { ...values, productEmails: !values.productEmails },
                    values.productEmails ? "Unsubscribed from product updates" : "Subscribed to product updates",
                  )
                }
              >
                {values.productEmails ? "Unsubscribe" : "Subscribe"}
              </AfButton>
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Active sessions"
        description="Devices signed in to your account. Sign out any you don't recognise."
        extra={
          !loading && otherSessionsCount > 0 ? (
            <AfButton
              size="sm"
              variant="ghost"
              icon={<AfIcon name="arrowRight" size={12} />}
              onClick={() =>
                commit(
                  { ...values, sessions: values.sessions.filter((s) => s.current) },
                  "Signed out other sessions",
                )
              }
            >
              Sign out others
            </AfButton>
          ) : null
        }
      >
        <div className="af-ss__card">
          {loading ? (
            <>
              <SettingsRow label={<SettingsSkel width={150} height={16} />} hint={<SettingsSkel width={190} height={13} />}>
                <SettingsSkel width={78} height={24} />
              </SettingsRow>
              <SettingsRow label={<SettingsSkel width={130} height={16} />} hint={<SettingsSkel width={170} height={13} />}>
                <SettingsSkel width={72} height={28} />
              </SettingsRow>
            </>
          ) : (
            values.sessions.map((session) => (
              <SettingsRow
                key={session.id}
                label={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="af-ss__prov-logo" style={{ width: 24, height: 24 }} aria-hidden="true">
                      <AfIcon
                        name={session.device === "phone" ? "phone" : session.device === "desktop" ? "server" : "sidebar"}
                        size={13}
                      />
                    </span>
                    <span>{session.name}</span>
                  </span>
                }
                badge={
                  session.current ? <AfBadge tone="success" size="sm">This device</AfBadge> : undefined
                }
                hint={session.meta}
                inlineMobile
              >
                {session.current ? null : (
                  <AfButton
                    size="sm"
                    variant="secondary"
                    aria-label={`Sign out ${session.name}`}
                    onClick={() =>
                      commit(
                        { ...values, sessions: values.sessions.filter((s) => s.id !== session.id) },
                        `Signed out ${session.name}`,
                      )
                    }
                  >
                    Sign out
                  </AfButton>
                )}
              </SettingsRow>
            ))
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title={loading ? "Shared chats" : `Shared chats (${values.sharedChats.length})`}
        description="Every chat you've shared by link. Stopping a share breaks the link at once."
        extra={
          !loading ? (
            <div className="af-ss__pills" role="tablist" aria-label="Filter shared chats">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "public", label: "Public links" },
                  { id: "workspace", label: "Workspace" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={shareFilter === tab.id}
                  className="af-ss__pill"
                  onClick={() => setShareFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        {loading ? (
          <SettingsSkel width="100%" height={112} radius={14} />
        ) : filteredShares.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">
              {shareFilter === "public" ? "No public links" : "No shared chats"}
            </span>
            <p className="af-ss__empty-desc">
              Chats you share via link can be revoked from here at any time.
            </p>
            <AfButton size="sm" variant="secondary" onClick={() => onNavigate?.("Chat")}>
              Open chats
            </AfButton>
          </div>
        ) : (
          <div className="af-ss__card">
            {filteredShares.map((chat) => (
              <SettingsRow
                key={chat.id}
                label={chat.title}
                hint={`${chat.scope} · Shared ${chat.shared} · ${chat.views} views`}
                inlineMobile
              >
                <AfButton
                  size="sm"
                  variant="ghost"
                  aria-label={`Stop sharing ${chat.title}`}
                  onClick={() =>
                    commit(
                      { ...values, sharedChats: values.sharedChats.filter((c) => c.id !== chat.id) },
                      `Stopped sharing "${chat.title}"`,
                    )
                  }
                >
                  Stop sharing
                </AfButton>
              </SettingsRow>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Danger zone" danger>
        <div className="af-ss__card" data-danger="true">
          <SettingsRow
            label="Export all my data"
            hint="Download an archive of every chat, prompt and uploaded file."
          >
            <AfButton
              size="sm"
              variant="secondary"
              icon={<AfIcon name="download" size={13} />}
              onClick={() => {
                onExport?.();
                announce("Export requested — we'll email your archive link");
              }}
            >
              Export data
            </AfButton>
          </SettingsRow>

          <SettingsRow
            label="Delete every chat"
            hint="Permanently delete your personal chat history across all devices."
          >
            <AfButton
              size="sm"
              variant="danger"
              aria-expanded={confirmDeleteOpen}
              onClick={() => setConfirmDeleteOpen((v) => !v)}
            >
              Delete all chats
            </AfButton>
          </SettingsRow>

          {confirmDeleteOpen ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Delete all personal chats permanently? This cannot be undone.
                </span>
                <div style={{ display: "inline-flex", gap: 8 }}>
                  <AfButton size="sm" variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
                    Cancel
                  </AfButton>
                  <AfButton
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setConfirmDeleteOpen(false);
                      setValues((p) => ({ ...p, sharedChats: [] }));
                      onDeleteChats?.();
                      announce("Deleted every chat");
                    }}
                  >
                    Confirm delete
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
