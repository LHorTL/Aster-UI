import { useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfSwitch } from "../controls/Switch";
import { AfDropdownMenu } from "../overlay/Menu";
import {
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfNotificationChannel = "both" | "email" | "mobile" | "inbox";

export type AfNotificationTypeRow = {
  id: string;
  title: string;
  note: string;
  channel: AfNotificationChannel;
};

export type AfNotificationValues = {
  digestOn: boolean;
  digestTime: string;
  weeklyReport: boolean;
  types: AfNotificationTypeRow[];
  quietHoursOn: boolean;
  quietFrom: string;
  quietTo: string;
};

export type AfSettingsNotificationsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Notification delivery settings; uses sample person defaults when omitted. */
  notifications?: AfNotificationValues;
  /** Called with all settings whenever something changes. */
  onSave?: (notifications: AfNotificationValues) => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching the real controls while loading. */
  loading?: boolean;
};

const CHANNEL_OPTIONS: AfSelectOption[] = [
  { value: "both", label: "Email and mobile" },
  { value: "email", label: "Email" },
  { value: "mobile", label: "Mobile" },
  { value: "inbox", label: "Inbox only" },
];

const TIME_OPTIONS: AfSelectOption[] = [
  { value: "07:00", label: "07:00" },
  { value: "08:00", label: "08:00" },
  { value: "09:00", label: "09:00" },
  { value: "12:00", label: "12:00" },
  { value: "18:00", label: "18:00" },
  { value: "21:00", label: "21:00" },
  { value: "22:00", label: "22:00" },
  { value: "23:00", label: "23:00" },
];

function channelIcon(channel: AfNotificationChannel): AffectIconKey {
  if (channel === "mobile") return "phone";
  if (channel === "email") return "mail";
  if (channel === "inbox") return "inbox";
  return "bell";
}

const DEFAULT_NOTIFICATIONS: AfNotificationValues = {
  digestOn: true,
  digestTime: "08:00",
  weeklyReport: false,
  types: [
    { id: "mentions", title: "Mentions", note: "Someone mentions you in a chat or a file", channel: "both" },
    { id: "replies", title: "Replies", note: "Answers to your comments", channel: "both" },
    { id: "approvals", title: "Approvals", note: "An agent waits for your OK before it acts", channel: "both" },
    { id: "finished-runs", title: "Finished runs", note: "An agent you started is done", channel: "mobile" },
    { id: "failed-runs", title: "Failed runs", note: "A run stopped with an error or ran out of budget", channel: "both" },
    { id: "shared", title: "Shared with you", note: "Chats, folders and agents others share", channel: "email" },
    { id: "access", title: "Access requests", note: "People asking to join a folder or agent you own", channel: "email" },
  ],
  quietHoursOn: true,
  quietFrom: "22:00",
  quietTo: "08:00",
};

/** Settings / Notifications — Daily digest + rising time row, per-event delivery table with bulk preset, and quiet hours. */
export function AfSettingsNotifications(props: AfSettingsNotificationsProps = {}) {
  const {
    notifications: notificationsProp,
    onSave,
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    className,
    ...rest
  } = props;

  const [values, setValues] = useState<AfNotificationValues>(notificationsProp ?? DEFAULT_NOTIFICATIONS);
  const { toastMessage, announce } = useSettingsToast();

  const commit = (next: AfNotificationValues, msg: string) => {
    setValues(next);
    onSave?.(next);
    announce(msg);
  };

  const setRowChannel = (id: string, channel: AfNotificationChannel) => {
    const row = values.types.find((r) => r.id === id);
    const nextTypes = values.types.map((r) => (r.id === id ? { ...r, channel } : r));
    commit({ ...values, types: nextTypes }, row ? `Updated ${row.title}` : "Notification updated");
  };

  const setAllChannels = (channel: AfNotificationChannel) => {
    const nextTypes = values.types.map((r) => ({ ...r, channel }));
    commit({ ...values, types: nextTypes }, "Updated all notification channels");
  };

  const uniformChannel = values.types.every((t) => t.channel === values.types[0]?.channel)
    ? values.types[0]?.channel
    : undefined;

  return (
    <SettingsShell
      activeSlug="settings-notifications"
      title="Notifications"
      lead="Choose what you hear about and where. Everything still lands in your inbox."
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <SettingsSection
        title="Digest"
        description="One email instead of many – what happened while you were away."
      >
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow
            label="Daily digest"
            hint="Approvals waiting, runs that finished or failed, and mentions"
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Daily digest"
                checked={values.digestOn}
                onChange={(digestOn) =>
                  commit({ ...values, digestOn }, digestOn ? "Daily digest turned on" : "Daily digest turned off")
                }
              />
            )}
          </SettingsRow>

          {!loading && values.digestOn ? (
            <SettingsRow
              label="Send at"
              hint="In your time zone, Europe/Vienna"
              inlineMobile
            >
              <AfSelect
                label="Daily digest time"
                icon="sun"
                size="sm"
                value={values.digestTime}
                options={TIME_OPTIONS}
                width={108}
                onChange={(digestTime) => commit({ ...values, digestTime }, `Digest scheduled for ${digestTime}`)}
              />
            </SettingsRow>
          ) : null}

          <SettingsRow
            label="Weekly usage report"
            hint="Credits spent, the busiest agents and the models used, every Monday"
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Weekly usage report"
                checked={values.weeklyReport}
                onChange={(weeklyReport) =>
                  commit({ ...values, weeklyReport }, weeklyReport ? "Weekly report enabled" : "Weekly report paused")
                }
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Notification types" description="Choose where each one is delivered.">
        <div className="af-ss__table-wrap" style={{ overflow: "visible" }}>
          <table className="af-ss__table">
            <thead>
              <tr>
                <th scope="col">Notify me about</th>
                <th scope="col" style={{ width: 204, textAlign: "left" }}>
                  {loading ? (
                    <SettingsSkel width={72} height={18} />
                  ) : (
                    <AfDropdownMenu
                      align="start"
                      trigger={
                        <button
                          type="button"
                          className="af-ss__th-trigger"
                          aria-label="Notify on for all notification types"
                        >
                          <span>Notify on</span>
                          <AfIcon name="chevronDown" size={11} />
                        </button>
                      }
                      items={CHANNEL_OPTIONS.map((opt) => ({
                        type: "radio" as const,
                        id: opt.value,
                        label: opt.label,
                        checked: uniformChannel === opt.value,
                        onSelect: () => setAllChannels(opt.value as AfNotificationChannel),
                      }))}
                    />
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {values.types.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span className="af-ss__row-label">{row.title}</span>
                      <span className="af-ss__row-hint">{row.note}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {loading ? (
                      <SettingsSkel width={164} height={30} />
                    ) : (
                      <div style={{ display: "inline-flex", justifyContent: "flex-end" }}>
                        <AfSelect
                          label={`Where to send ${row.title}`}
                          icon={channelIcon(row.channel)}
                          size="sm"
                          value={row.channel}
                          options={CHANNEL_OPTIONS}
                          width={176}
                          onChange={(val) => setRowChannel(row.id, val as AfNotificationChannel)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <SettingsSection title="Quiet hours">
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow
            label="Mute notifications at night"
            hint="Hold push and email alerts overnight; items still wait quietly in your Inbox."
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Mute notifications at night"
                checked={values.quietHoursOn}
                onChange={(quietHoursOn) =>
                  commit({ ...values, quietHoursOn }, quietHoursOn ? "Quiet hours turned on" : "Quiet hours turned off")
                }
              />
            )}
          </SettingsRow>

          {!loading && values.quietHoursOn ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                  Quiet window
                </span>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <AfSelect
                    label="Quiet hours from"
                    size="sm"
                    value={values.quietFrom}
                    options={TIME_OPTIONS}
                    width={104}
                    onChange={(quietFrom) => commit({ ...values, quietFrom }, "Quiet hours updated")}
                  />
                  <span className="af-ss__row-hint">to</span>
                  <AfSelect
                    label="Quiet hours to"
                    size="sm"
                    value={values.quietTo}
                    options={TIME_OPTIONS}
                    width={104}
                    onChange={(quietTo) => commit({ ...values, quietTo }, "Quiet hours updated")}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
}
