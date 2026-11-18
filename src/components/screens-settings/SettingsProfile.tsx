import { useId, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput, AfPasswordInput } from "../controls/Input";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfTextarea } from "../controls/Textarea";
import {
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfProfileValues = {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  timezone: string;
  weekStart: string;
  context: string;
  avatar?: string;
  hasPassword?: boolean;
};

export type AfSettingsProfileProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Personal profile values; uses sample Alex Morgan profile when omitted. */
  profile?: AfProfileValues;
  /** Called with the whole profile whenever something is saved (text on blur, choices at once). */
  onSave?: (profile: AfProfileValues) => void;
  /** Called with the label of a settings page, or `"Back to app"`. */
  onNavigate?: (label: string) => void;
  /** Workspace name shown in the sidebar. */
  workspace?: string;
  /** Shows skeleton shapes matching the real controls while loading. */
  loading?: boolean;
};

const DEFAULT_PROFILE: AfProfileValues = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@acme.com",
  role: "",
  timezone: "Europe/Vienna",
  weekStart: "Monday",
  context: "",
  hasPassword: true,
};

const ROLE_OPTIONS: AfSelectOption[] = [
  { value: "Product", label: "Product" },
  { value: "Design", label: "Design" },
  { value: "Engineering", label: "Engineering" },
  { value: "Operations", label: "Operations" },
  { value: "Leadership", label: "Leadership" },
];

const TIMEZONE_OPTIONS: AfSelectOption[] = [
  { value: "Europe/Vienna", label: "Europe/Vienna" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "UTC", label: "UTC" },
];

const WEEK_START_OPTIONS: AfSelectOption[] = [
  { value: "Monday", label: "Monday" },
  { value: "Sunday", label: "Sunday" },
  { value: "Saturday", label: "Saturday" },
];

const SAMPLE_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='32' fill='%237c5cff'/><text x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='24' font-weight='600'>AM</text></svg>";

/** Settings / Profile — Picture, name, role, email, time preferences, personal context and password. */
export function AfSettingsProfile(props: AfSettingsProfileProps = {}) {
  const {
    profile: profileProp,
    onSave,
    onNavigate,
    workspace = "Acme",
    loading = false,
    className,
    ...rest
  } = props;

  const initial = profileProp ?? DEFAULT_PROFILE;
  const [values, setValues] = useState<AfProfileValues>(initial);
  const [saved, setSaved] = useState<AfProfileValues>(initial);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(initial.email);
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");

  const firstId = useId();
  const lastId = useId();
  const contextId = useId();

  const { toastMessage, announce } = useSettingsToast();

  const commit = (next: AfProfileValues, msg: string) => {
    setValues(next);
    setSaved(next);
    onSave?.(next);
    announce(msg);
  };

  const fullName = `${values.firstName} ${values.lastName}`.trim() || DEFAULT_SETTINGS_USER.name;
  const sidebarUser: AfSettingsUser = {
    name: fullName,
    email: values.email,
    avatar: values.avatar,
  };

  const roleSelectOptions: AfSelectOption[] =
    values.role && !ROLE_OPTIONS.some((o) => o.value === values.role)
      ? [{ value: values.role, label: values.role }, ...ROLE_OPTIONS]
      : ROLE_OPTIONS;

  return (
    <SettingsShell
      activeSlug="settings-profile"
      title="Profile"
      lead="Manage your personal details. Learn more"
      workspace={workspace}
      user={sidebarUser}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <div className="af-ss__banner" role="note">
        <AfIcon name="info" size={14} />
        <span>Changes to your profile apply to all of your workspaces.</span>
      </div>

      <div className="af-ss__card" data-overflow="visible">
        <SettingsRow label="Profile picture" hint="PNG, JPEG or GIF, under 10 MB" inlineMobile>
          {loading ? (
            <SettingsSkel width={32} height={32} radius={999} />
          ) : (
            <>
              <span className="af-ss__user-badge" data-size="lg" aria-hidden="true">
                {values.avatar ? (
                  <img src={values.avatar} alt="" />
                ) : (
                  fullName
                    .split(/\s+/)
                    .map((p) => p.charAt(0))
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "AM"
                )}
              </span>
              <AfButton
                size="sm"
                variant="secondary"
                icon="upload"
                aria-label="Upload profile picture"
                onClick={() => commit({ ...values, avatar: SAMPLE_AVATAR }, "Profile picture updated")}
              >
                Upload
              </AfButton>
              {values.avatar ? (
                <AfButton
                  size="sm"
                  variant="ghost"
                  aria-label="Remove profile picture"
                  onClick={() => commit({ ...values, avatar: undefined }, "Profile picture removed")}
                >
                  Remove
                </AfButton>
              ) : null}
            </>
          )}
        </SettingsRow>

        <SettingsRow label="First name" htmlFor={firstId} wideControl>
          {loading ? (
            <SettingsSkel width="100%" height={32} />
          ) : (
            <AfInput
              id={firstId}
              value={values.firstName}
              onChange={(e) => setValues((p) => ({ ...p, firstName: e.target.value }))}
              onBlur={() => {
                if (values.firstName !== saved.firstName) commit(values, "First name saved");
              }}
              style={{ width: "100%" }}
            />
          )}
        </SettingsRow>

        <SettingsRow label="Last name" htmlFor={lastId} wideControl>
          {loading ? (
            <SettingsSkel width="100%" height={32} />
          ) : (
            <AfInput
              id={lastId}
              value={values.lastName}
              onChange={(e) => setValues((p) => ({ ...p, lastName: e.target.value }))}
              onBlur={() => {
                if (values.lastName !== saved.lastName) commit(values, "Last name saved");
              }}
              style={{ width: "100%" }}
            />
          )}
        </SettingsRow>

        <SettingsRow label="Role" hint="Helps tailor suggestions to your work" wideControl>
          {loading ? (
            <SettingsSkel width="100%" height={32} />
          ) : (
            <AfSelect
              label="Role"
              placeholder="Choose your role"
              value={values.role || undefined}
              options={roleSelectOptions}
              width="100%"
              onChange={(nextRole) => commit({ ...values, role: nextRole }, "Role saved")}
            />
          )}
        </SettingsRow>

        <SettingsRow label="Email" wideControl>
          {loading ? (
            <SettingsSkel width="100%" height={32} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <input
                type="text"
                readOnly
                aria-label="Current email"
                className="af-ss__ro-input"
                style={{ flex: 1, width: "auto", fontFamily: "inherit", fontSize: "var(--af-fs-md)" }}
                value={values.email}
              />
              <AfButton
                size="sm"
                variant="secondary"
                aria-expanded={editingEmail}
                onClick={() => {
                  setEmailDraft(values.email);
                  setEditingEmail((v) => !v);
                }}
              >
                Change
              </AfButton>
            </div>
          )}
        </SettingsRow>

        {editingEmail ? (
          <div className="af-ss__subrow">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <AfInput
                aria-label="New email address"
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingEmail(false);
                  if (e.key === "Enter" && emailDraft.includes("@")) {
                    setEditingEmail(false);
                    commit({ ...values, email: emailDraft.trim() }, "Email updated");
                  }
                }}
                style={{ flex: "1 1 220px" }}
              />
              <AfButton size="sm" variant="ghost" onClick={() => setEditingEmail(false)}>
                Cancel
              </AfButton>
              <AfButton
                size="sm"
                variant="primary"
                disabled={!emailDraft.includes("@")}
                onClick={() => {
                  setEditingEmail(false);
                  commit({ ...values, email: emailDraft.trim() }, "Email updated");
                }}
              >
                Save email
              </AfButton>
            </div>
          </div>
        ) : null}
      </div>

      <SettingsSection title="Time preferences" description="Used for reminders, schedules and reports.">
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow label="Timezone" wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Timezone"
                icon="globe"
                value={values.timezone}
                options={TIMEZONE_OPTIONS}
                width="100%"
                onChange={(nextTz) => commit({ ...values, timezone: nextTz }, "Time zone updated")}
              />
            )}
          </SettingsRow>

          <SettingsRow label="Start week on" wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Start week on"
                icon="calendar"
                value={values.weekStart}
                options={WEEK_START_OPTIONS}
                width="100%"
                onChange={(nextDay) => commit({ ...values, weekStart: nextDay }, "Week start updated")}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Personal context"
        description="Describe what you do and how you work, so the assistant can adapt to you."
      >
        {loading ? (
          <SettingsSkel width="100%" height={96} radius={12} />
        ) : (
          <AfTextarea
            id={contextId}
            aria-label="Personal context"
            value={values.context}
            rows={3}
            expandedRows={7}
            expandable
            maxLength={500}
            counter
            placeholder="E.g. I lead product at a small team, prefer short answers and write in British English."
            onChange={(e) => setValues((p) => ({ ...p, context: e.target.value }))}
            onBlur={() => {
              if (values.context !== saved.context) commit(values, "Personal context saved");
            }}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Password">
        <div className="af-ss__card">
          <SettingsRow
            label="Account password"
            hint={
              loading
                ? undefined
                : values.hasPassword !== false
                  ? "Password is set · Last changed 3 months ago."
                  : "Signed in via SSO — set a password to sign in directly."
            }
          >
            {loading ? (
              <SettingsSkel width={132} height={30} />
            ) : (
              <AfButton
                size="sm"
                variant="secondary"
                aria-expanded={editingPassword}
                onClick={() => setEditingPassword((v) => !v)}
              >
                {values.hasPassword !== false ? "Change password" : "Set password"}
              </AfButton>
            )}
          </SettingsRow>

          {editingPassword ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {values.hasPassword !== false ? (
                  <AfPasswordInput
                    aria-label="Current password"
                    placeholder="Current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    style={{ flex: "1 1 160px" }}
                  />
                ) : null}
                <AfPasswordInput
                  aria-label="New password"
                  placeholder="New password (8+ chars)"
                  value={nextPw}
                  onChange={(e) => setNextPw(e.target.value)}
                  style={{ flex: "1 1 180px" }}
                />
                <AfButton size="sm" variant="ghost" onClick={() => setEditingPassword(false)}>
                  Cancel
                </AfButton>
                <AfButton
                  size="sm"
                  variant="primary"
                  disabled={nextPw.length < 8}
                  onClick={() => {
                    setEditingPassword(false);
                    setCurrentPw("");
                    setNextPw("");
                    commit({ ...values, hasPassword: true }, "Password updated");
                  }}
                >
                  Update password
                </AfButton>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
}
