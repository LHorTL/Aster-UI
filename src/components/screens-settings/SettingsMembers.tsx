import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfCheckbox } from "../controls/Checkbox";
import { AfInput } from "../controls/Input";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfAvatar } from "../display/Avatar";
import { AfBadge } from "../display/Badge";
import { AfDropdownMenu } from "../overlay/Menu";
import {
  DEFAULT_SETTINGS_USER,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  copySettingsText,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfMemberRole = "Owner" | "Admin" | "Member" | "Viewer" | "Guest";
export type AfMemberPlan = "Business" | "Pro" | "Free" | "Standard" | "Light";

export type AfSettingsMember = {
  id: string;
  name?: string;
  email: string;
  role: AfMemberRole;
  plan: AfMemberPlan;
  /** Seat/token usage share from 0 to 1. */
  usage: number;
  invited?: boolean;
};

export type AfSettingsTeam = {
  id: string;
  name: string;
  members: string[];
};

export type AfSettingsMembersProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Workspace members; uses sample roster when omitted. */
  members?: AfSettingsMember[];
  /** Teams and their member IDs; uses sample teams when omitted. */
  teams?: AfSettingsTeam[];
  /** ID of the current viewer — marked `(You)` and never removed. Default `"alex"`. */
  me?: string;
  /** Tab opened first. Default `"Members"`. */
  defaultTab?: "Members" | "Teams";
  /** Called with the label of a settings page, or `"Back to app"`. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching numbers, table rows and teams; hides counts. */
  loading?: boolean;
  /** Empty state: numbers at zero, "No members yet" and "No teams yet". */
  empty?: boolean;
};

const DEFAULT_MEMBERS: AfSettingsMember[] = [
  { id: "alex", name: "Alex Morgan", email: "alex@acme.com", role: "Admin", plan: "Business", usage: 0.68 },
  { id: "jonas", name: "Jonas Weber", email: "jonas@acme.com", role: "Admin", plan: "Business", usage: 0.42 },
  { id: "mara", name: "Mara Klein", email: "mara@acme.com", role: "Member", plan: "Pro", usage: 0.81 },
  { id: "lea", name: "Lea Braun", email: "lea@acme.com", role: "Member", plan: "Pro", usage: 0.23 },
  { id: "tom", name: "Tom Fischer", email: "tom@acme.com", role: "Viewer", plan: "Free", usage: 0.05 },
  { id: "sam", email: "sam@acme.com", role: "Member", plan: "Pro", usage: 0, invited: true },
];

const DEFAULT_TEAMS: AfSettingsTeam[] = [
  { id: "t-prod", name: "Product & Design", members: ["alex", "mara", "lea"] },
  { id: "t-eng", name: "Platform Engineering", members: ["jonas", "tom"] },
  { id: "t-ops", name: "Customer Operations", members: ["alex", "jonas", "mara"] },
];

const ROLE_OPTIONS: AfSelectOption[] = [
  { value: "Admin", label: "Admin" },
  { value: "Member", label: "Member" },
  { value: "Viewer", label: "Viewer" },
];

const PLAN_OPTIONS: AfSelectOption[] = [
  { value: "Business", label: "Business" },
  { value: "Pro", label: "Pro" },
  { value: "Free", label: "Free" },
];

const ROLE_FILTER_OPTIONS: AfSelectOption[] = [
  { value: "all", label: "Role" },
  { value: "Admin", label: "Admin" },
  { value: "Member", label: "Member" },
  { value: "Viewer", label: "Viewer" },
  { value: "invited", label: "Invited" },
];

/** Settings / Teams (`settings-members`) — Seats at a glance, search, role filter, CSV export, invite form, bulk actions, and teams. */
export function AfSettingsMembers(props: AfSettingsMembersProps = {}) {
  const {
    members: membersProp,
    teams: teamsProp,
    me = "alex",
    defaultTab = "Members",
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [tab, setTab] = useState<"Members" | "Teams">(defaultTab);
  const [members, setMembers] = useState<AfSettingsMember[]>(() => (empty ? [] : membersProp ?? DEFAULT_MEMBERS));
  const [teams, setTeams] = useState<AfSettingsTeam[]>(() => (empty ? [] : teamsProp ?? DEFAULT_TEAMS));
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Invite inline form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AfMemberRole>("Member");

  // New team inline form
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const { toastMessage, announce } = useSettingsToast();

  const seatLimit = 10;
  const activeSeats = members.length;
  const adminCount = members.filter((m) => m.role === "Owner" || m.role === "Admin").length;
  const invitedCount = members.filter((m) => m.invited).length;

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter === "invited" && !m.invited) return false;
      if (roleFilter !== "all" && roleFilter !== "invited" && m.role !== roleFilter) return false;
      if (!q) return true;
      return (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, query, roleFilter]);

  const selectableFilteredIds = useMemo(
    () => filteredMembers.filter((m) => m.id !== me).map((m) => m.id),
    [filteredMembers, me],
  );

  const allSelected =
    selectableFilteredIds.length > 0 && selectableFilteredIds.every((id) => selectedIds.includes(id));

  const submitInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      announce("Enter a valid email address");
      return;
    }
    const id = `inv-${Date.now()}`;
    setMembers((prev) => [
      ...prev,
      { id, email, role: inviteRole, plan: "Standard", usage: 0, invited: true },
    ]);
    setInviteEmail("");
    setInviteOpen(false);
    announce(`Invitation sent to ${email}`);
  };

  const submitNewTeam = () => {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    setTeams((prev) => [...prev, { id: `team-${Date.now()}`, name: trimmed, members: [me] }]);
    setNewTeamName("");
    setNewTeamOpen(false);
    announce(`Created team "${trimmed}"`);
  };

  return (
    <SettingsShell
      activeSlug="settings-members"
      title="Members & teams"
      lead="Invite people, set what they can do and group them into teams. Learn more"
      workspace={workspace}
      user={user}
      wide
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <div>
        <div className="af-ss__pills" role="tablist" aria-label="Members and teams views">
          {(["Members", "Teams"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className="af-ss__pill"
              onClick={() => setTab(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seats at a glance */}
      <div className="af-ss__kpis">
        <div className="af-ss__kpi">
          <span className="af-ss__kpi-label">Members</span>
          {loading ? (
            <SettingsSkel width={64} height={26} />
          ) : (
            <>
              <div className="af-ss__kpi-val">{activeSeats}</div>
              <span className="af-ss__row-hint">
                {Math.max(0, activeSeats - invitedCount)} active · {invitedCount} invited
              </span>
            </>
          )}
        </div>

        <div className="af-ss__kpi">
          <span className="af-ss__kpi-label">Seats</span>
          {loading ? (
            <SettingsSkel width={84} height={26} />
          ) : (
            <>
              <div className="af-ss__kpi-val">
                <span>{activeSeats}</span>
                <span className="af-ss__kpi-sub">of {seatLimit}</span>
              </div>
              <div
                className="af-ss__meter"
                role="progressbar"
                aria-label={`Seats used: ${activeSeats} of ${seatLimit}`}
                aria-valuenow={activeSeats}
                aria-valuemin={0}
                aria-valuemax={seatLimit}
              >
                <div
                  className="af-ss__meter-fill"
                  data-warn={activeSeats / seatLimit >= 0.8 ? "true" : undefined}
                  style={{ width: `${Math.min(100, Math.round((activeSeats / seatLimit) * 100))}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="af-ss__kpi">
          <span className="af-ss__kpi-label">Admins</span>
          {loading ? (
            <SettingsSkel width={44} height={26} />
          ) : (
            <>
              <div className="af-ss__kpi-val">{adminCount}</div>
              <span className="af-ss__row-hint">Can invite, remove and bill</span>
            </>
          )}
        </div>
      </div>

      <div className="af-ss__banner" data-tone="info" role="note">
        <AfIcon name="info" size={14} />
        <span>
          Extra usage and spending limits are set on{" "}
          <button
            type="button"
            className="af-ss__banner-link"
            onClick={() => onNavigate?.("Billing")}
          >
            Usage &amp; limits
          </button>
          .
        </span>
      </div>

      {tab === "Members" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="af-ss__toolbar">
            <div className="af-ss__toolbar-left">
              <AfInput
                aria-label="Search members"
                icon="search"
                placeholder="Search name or email"
                value={query}
                allowClear
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
                style={{ width: 220 }}
              />
              <AfSelect
                label="Filter by role"
                icon="filter"
                value={roleFilter}
                options={ROLE_FILTER_OPTIONS}
                width={116}
                onChange={setRoleFilter}
              />
            </div>

            <div className="af-ss__toolbar-right">
              <AfButton
                size="sm"
                variant="ghost"
                icon={<AfIcon name="download" size={13} />}
                onClick={() => announce(`Exported ${members.length} members as CSV`)}
              >
                Export
              </AfButton>
              <AfButton
                size="sm"
                variant="primary"
                icon={<AfIcon name="users" size={13} />}
                aria-expanded={inviteOpen}
                onClick={() => setInviteOpen((v) => !v)}
              >
                Invite members
              </AfButton>
            </div>
          </div>

          {inviteOpen ? (
            <div className="af-ss__card" data-overflow="visible">
              <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
                <AfInput
                  aria-label="Colleague email address"
                  type="email"
                  placeholder="colleague@acme.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setInviteOpen(false);
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitInvite();
                    }
                  }}
                  style={{ flex: "1 1 220px" }}
                />
                <AfSelect
                  label="Invite role"
                  value={inviteRole}
                  options={ROLE_OPTIONS}
                  width={132}
                  onChange={(r) => setInviteRole(r as AfMemberRole)}
                />
                <AfButton size="md" variant="ghost" onClick={() => setInviteOpen(false)}>
                  Cancel
                </AfButton>
                <AfButton size="md" variant="primary" onClick={submitInvite}>
                  Send invite
                </AfButton>
              </div>
            </div>
          ) : null}

          {selectedIds.length > 0 ? (
            <div className="af-ss__bulk-bar" role="region" aria-label="Bulk member actions">
              <span style={{ fontWeight: 560 }}>{selectedIds.length} selected</span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AfSelect
                  label="Bulk change role"
                  size="sm"
                  placeholder="Set role…"
                  options={ROLE_OPTIONS}
                  width={126}
                  onChange={(nextRole) => {
                    setMembers((prev) =>
                      prev.map((m) => (selectedIds.includes(m.id) ? { ...m, role: nextRole as AfMemberRole } : m)),
                    );
                    announce(`Updated role for ${selectedIds.length} members`);
                    setSelectedIds([]);
                  }}
                />
                <AfSelect
                  label="Bulk change plan"
                  size="sm"
                  placeholder="Set plan…"
                  options={PLAN_OPTIONS}
                  width={126}
                  onChange={(nextPlan) => {
                    setMembers((prev) =>
                      prev.map((m) => (selectedIds.includes(m.id) ? { ...m, plan: nextPlan as AfMemberPlan } : m)),
                    );
                    announce(`Updated plan for ${selectedIds.length} members`);
                    setSelectedIds([]);
                  }}
                />
                <AfButton
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    const removable = selectedIds.filter((id) => id !== me);
                    setMembers((prev) => prev.filter((m) => !removable.includes(m.id)));
                    setSelectedIds([]);
                    announce(`Removed ${removable.length} members`);
                  }}
                >
                  Remove
                </AfButton>
                <AfButton size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </AfButton>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="af-ss__card">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="af-ss__row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SettingsSkel width={28} height={28} radius={999} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <SettingsSkel width={120} height={14} />
                      <SettingsSkel width={150} height={11} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SettingsSkel width={96} height={28} />
                    <SettingsSkel width={88} height={28} />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="af-ss__empty">
              <span className="af-ss__empty-title">No members yet</span>
              <p className="af-ss__empty-desc">
                Invite teammates to share workspace context, agents and billing seats.
              </p>
              <AfButton size="sm" variant="primary" onClick={() => setInviteOpen(true)}>
                Invite members
              </AfButton>
            </div>
          ) : (
            <div className="af-ss__table-wrap" style={{ overflow: "visible" }}>
              <table className="af-ss__table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 38 }}>
                      <AfCheckbox
                        aria-label="Select all members"
                        checked={allSelected}
                        disabled={selectableFilteredIds.length === 0}
                        onCheckedChange={(checked) =>
                          setSelectedIds(checked ? selectableFilteredIds : [])
                        }
                      />
                    </th>
                    <th scope="col">Name</th>
                    <th scope="col" style={{ width: 132 }}>Role</th>
                    <th scope="col" style={{ width: 132 }}>Plan</th>
                    <th scope="col" style={{ width: 116 }}>Usage</th>
                    <th scope="col" style={{ width: 48 }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const personName = member.name ?? member.email;
                    const isMe = member.id === me;
                    const pct = Math.round(member.usage * 100);
                    const roleIcon =
                      member.role === "Admin" || member.role === "Owner"
                        ? "shield"
                        : member.role === "Viewer" || member.role === "Guest"
                          ? "eye"
                          : "user";
                    return (
                      <tr key={member.id}>
                        <td>
                          <AfCheckbox
                            aria-label={`Select ${personName}`}
                            checked={selectedIds.includes(member.id)}
                            disabled={isMe}
                            onCheckedChange={(checked) =>
                              setSelectedIds((prev) =>
                                checked ? [...prev, member.id] : prev.filter((id) => id !== member.id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <div className="af-ss__person">
                            {member.invited ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 28,
                                  height: 28,
                                  borderRadius: 999,
                                  background: "color-mix(in srgb, var(--af-danger) 12%, var(--af-surface))",
                                  color: "var(--af-danger)",
                                  flex: "none",
                                }}
                                aria-hidden="true"
                              >
                                <AfIcon name="mail" size={13} />
                              </span>
                            ) : isMe ? (
                              <span className="af-ss__user-badge" style={{ width: 28, height: 28, fontSize: 11 }} aria-hidden="true">
                                AM
                              </span>
                            ) : (
                              <AfAvatar name={personName} size={28} seed={member.email} />
                            )}
                            <div className="af-ss__person-meta">
                              <span className="af-ss__person-name">
                                <span>{member.name ?? member.email}</span>
                                {isMe ? (
                                  <span style={{ color: "var(--af-page-faint)", fontWeight: 450, fontSize: 12 }}>
                                    (You)
                                  </span>
                                ) : null}
                                {member.invited ? <AfBadge tone="neutral" size="sm">Invited</AfBadge> : null}
                              </span>
                              {member.name ? <span className="af-ss__person-email">{member.email}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isMe ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: "var(--af-page-muted)",
                                fontSize: "var(--af-fs-sm)",
                              }}
                            >
                              <AfIcon name="shield" size={13} />
                              <span>{member.role}</span>
                            </span>
                          ) : (
                            <AfSelect
                              label={`Role for ${personName}`}
                              icon={roleIcon}
                              size="sm"
                              value={member.role}
                              options={ROLE_OPTIONS}
                              width={122}
                              onChange={(nextRole) => {
                                setMembers((prev) =>
                                  prev.map((m) =>
                                    m.id === member.id ? { ...m, role: nextRole as AfMemberRole } : m,
                                  ),
                                );
                                announce(`Changed ${personName}'s role to ${nextRole}`);
                              }}
                            />
                          )}
                        </td>
                        <td>
                          <AfDropdownMenu
                            align="start"
                            trigger={
                              <button
                                type="button"
                                className="af-ss__plan-pill"
                                data-plan={member.plan}
                                aria-label={`Plan for ${personName}: ${member.plan}`}
                              >
                                <span>{member.plan}</span>
                                <AfIcon name="chevronDown" size={11} />
                              </button>
                            }
                            items={PLAN_OPTIONS.map((opt) => ({
                              type: "radio" as const,
                              id: opt.value,
                              label: opt.label,
                              checked: member.plan === opt.value,
                              onSelect: () => {
                                setMembers((prev) =>
                                  prev.map((m) =>
                                    m.id === member.id ? { ...m, plan: opt.value as AfMemberPlan } : m,
                                  ),
                                );
                                announce(`Changed ${personName}'s plan to ${opt.value}`);
                              },
                            }))}
                          />
                        </td>
                        <td>
                          {member.invited ? (
                            <span style={{ color: "var(--af-page-faint)" }}>—</span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                className="af-ss__meter"
                                style={{ width: 54 }}
                                role="progressbar"
                                aria-label={`Usage for ${personName}: ${pct}%`}
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="af-ss__meter-fill"
                                  data-warn={pct >= 80 ? "true" : undefined}
                                  style={{
                                    width: `${pct}%`,
                                    background: pct < 80 ? "var(--af-faint)" : undefined,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 11.5, color: "var(--af-page-muted)" }}>{pct}%</span>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <AfDropdownMenu
                            align="end"
                            items={[
                              ...(member.invited
                                ? [
                                    {
                                      id: "resend",
                                      label: "Resend invite",
                                      icon: "mail" as const,
                                      onSelect: () => announce(`Resent invite to ${member.email}`),
                                    },
                                  ]
                                : []),
                              {
                                id: "copy",
                                label: "Copy email",
                                icon: "copy" as const,
                                onSelect: () => {
                                  void copySettingsText(member.email).then((ok) => {
                                    if (ok) announce(`Copied ${member.email}`);
                                  });
                                },
                              },
                              { type: "separator" as const },
                              {
                                id: "remove",
                                label: "Remove member",
                                icon: "trash" as const,
                                danger: true,
                                disabled: isMe,
                                onSelect: () => {
                                  if (isMe) return;
                                  setMembers((prev) => prev.filter((m) => m.id !== member.id));
                                  announce(`Removed ${personName}`);
                                },
                              },
                            ]}
                          >
                            <button
                              type="button"
                              className="af-ss__icon-btn"
                              aria-label={`Actions for ${personName}`}
                            >
                              <AfIcon name="more" size={15} />
                            </button>
                          </AfDropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <SettingsSection
          title="Teams"
          description="Group members for shared folders, model access rules and @team mentions."
          extra={
            !loading ? (
              <AfButton
                size="sm"
                variant="primary"
                icon={<AfIcon name="plus" size={13} />}
                aria-expanded={newTeamOpen}
                onClick={() => setNewTeamOpen((v) => !v)}
              >
                New team
              </AfButton>
            ) : null
          }
        >
          {newTeamOpen ? (
            <div className="af-ss__card">
              <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
                <AfInput
                  aria-label="New team name"
                  placeholder="e.g. Security & Compliance"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setNewTeamOpen(false);
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitNewTeam();
                    }
                  }}
                  style={{ flex: "1 1 220px" }}
                />
                <AfButton size="sm" variant="ghost" onClick={() => setNewTeamOpen(false)}>
                  Cancel
                </AfButton>
                <AfButton size="sm" variant="primary" disabled={!newTeamName.trim()} onClick={submitNewTeam}>
                  Create team
                </AfButton>
              </div>
            </div>
          ) : null}

          {loading ? (
            <SettingsSkel width="100%" height={140} radius={14} />
          ) : teams.length === 0 ? (
            <div className="af-ss__empty">
              <span className="af-ss__empty-title">No teams yet</span>
              <p className="af-ss__empty-desc">
                Create teams to grant folder permissions and route approvals to a group.
              </p>
              <AfButton size="sm" variant="primary" onClick={() => setNewTeamOpen(true)}>
                New team
              </AfButton>
            </div>
          ) : (
            <div className="af-ss__card">
              {teams.map((team) => {
                const resolvedMembers = team.members
                  .map((id) => members.find((m) => m.id === id))
                  .filter((m): m is AfSettingsMember => Boolean(m));
                return (
                  <div key={team.id} className="af-ss__row">
                    <div className="af-ss__row-info">
                      <div className="af-ss__row-label">{team.name}</div>
                      <p className="af-ss__row-hint">{resolvedMembers.length} members</p>
                    </div>
                    <div className="af-ss__row-ctrl">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {resolvedMembers.slice(0, 4).map((m) => (
                          <AfAvatar key={m.id} name={m.name ?? m.email} size={22} seed={m.email} />
                        ))}
                      </div>
                      <AfButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete team ${team.name}`}
                        onClick={() => {
                          setTeams((prev) => prev.filter((t) => t.id !== team.id));
                          announce(`Deleted team "${team.name}"`);
                        }}
                      >
                        Remove
                      </AfButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SettingsSection>
      )}
    </SettingsShell>
  );
}

/** Semantic alias matching affectUI's "Settings / Teams" title. */
export function AfSettingsTeams(props: AfSettingsMembersProps = {}) {
  return <AfSettingsMembers {...props} />;
}
