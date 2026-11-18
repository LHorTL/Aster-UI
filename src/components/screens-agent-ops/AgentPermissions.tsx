import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  AppBrandTile,
  DEFAULT_AGENT_OPS_USER,
  DEFAULT_FIELDWORK_APPS,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type PermissionLevel = "allow" | "ask" | "never";
export type PermissionPreset = "cautious" | "balanced" | "handsoff";

export type PermissionApp = {
  id: string;
  name: string;
  account?: string;
  logo?: ReactNode;
  tile?: string;
  icon?: AffectIconKey | ReactNode;
};

export type PermissionRule = {
  id: string;
  app: string;
  action: string;
  detail?: string;
  icon?: AffectIconKey;
  level: PermissionLevel;
  defaultLevel?: PermissionLevel;
  kind?: "read" | "write" | "risky";
  locked?: boolean;
  limit?: { value: number; unit: string };
  week?: { done?: number; asked?: number; blocked?: number };
  recent?: { what: string; ruleName?: string; outcome: "done" | "approved" | "declined" | "blocked"; at: string }[];
};

export type AgentPermissionsLabels = {
  permissions?: string;
  intro?: string;
  autonomy?: string;
  allowLong?: string;
  askLong?: string;
  neverLong?: string;
  locked?: string;
  cautious?: string;
  balanced?: string;
  handsoff?: string;
  reads?: string;
  changes?: string;
  care?: string;
  apps?: string;
  reset?: string;
};

export type AfAgentPermissionsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onSelect"> & {
  apps?: PermissionApp[];
  rules?: PermissionRule[];
  defaultApp?: string | null;
  onChange?: (rule: PermissionRule) => void;
  onPreset?: (preset: PermissionPreset) => void;
  onSelect?: (appId: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  labels?: AgentPermissionsLabels;
  user?: AgentOpsUser;
  inboxCount?: number;
  loading?: boolean;
  empty?: boolean;
  onConnect?: () => void;
  className?: string;
  style?: CSSProperties;
};

export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
  // Gmail (3 allow, 1 ask, 1 never)
  { id: "gm-read", app: "gmail", action: "Read threads and labels", kind: "read", level: "allow", week: { done: 42 } },
  { id: "gm-draft", app: "gmail", action: "Save drafts", kind: "write", level: "allow", week: { done: 11 } },
  { id: "gm-internal", app: "gmail", action: "Send to @fieldwork.co teammates", kind: "write", level: "allow", week: { done: 6 } },
  {
    id: "gm-external",
    app: "gmail",
    action: "Send email to external contacts",
    detail: "Clients, vendors and guests",
    kind: "risky",
    level: "ask",
    week: { asked: 5 },
    recent: [{ what: "Sent weekly update to Priya Shah", outcome: "approved", at: "14:45" }],
  },
  { id: "gm-delete", app: "gmail", action: "Delete email", kind: "risky", level: "never", locked: true },

  // Slack (2 allow, 1 ask, 1 never)
  { id: "sl-read", app: "slack", action: "Read public channels", kind: "read", level: "allow", week: { done: 68 } },
  {
    id: "sl-proj",
    app: "slack",
    action: "Post in project channels",
    detail: "#platform, #northwind, #evalkit",
    kind: "write",
    level: "allow",
    week: { done: 14 },
    recent: [{ what: "Posted staging link in #platform", outcome: "done", at: "13:53" }],
  },
  { id: "sl-dm", app: "slack", action: "Direct message external guests", kind: "risky", level: "ask", week: { asked: 2 } },
  {
    id: "sl-general",
    app: "slack",
    action: "Post in #general",
    detail: "Slack · 1,284 members",
    kind: "risky",
    level: "never",
    locked: true,
  },

  // GitHub (2 allow, 1 ask, 1 never)
  { id: "gh-read", app: "github", action: "Read code, issues and checks", kind: "read", level: "allow", week: { done: 94 } },
  {
    id: "gh-pr",
    app: "github",
    action: "Open pull requests on branches",
    kind: "write",
    level: "allow",
    week: { done: 8 },
    recent: [{ what: "Opened PR #482 – Retry failed billing webhooks", outcome: "done", at: "13:22" }],
  },
  {
    id: "gh-merge",
    app: "github",
    action: "Merge to main",
    detail: "GitHub",
    kind: "risky",
    level: "ask",
    locked: true,
    week: { asked: 3 },
  },
  {
    id: "gh-deploy",
    app: "github",
    action: "Deploy to production",
    detail: "GitHub",
    kind: "risky",
    level: "never",
    locked: true,
  },

  // Google Drive (2 allow, 1 ask, 1 never)
  { id: "dr-read", app: "drive", action: "Read shared folders", kind: "read", level: "allow", week: { done: 31 } },
  { id: "dr-create", app: "drive", action: "Create docs and sheets", kind: "write", level: "allow", week: { done: 5 } },
  { id: "dr-share", app: "drive", action: "Share outside Fieldwork", kind: "risky", level: "ask", week: { asked: 1 } },
  { id: "dr-delete", app: "drive", action: "Delete files", detail: "Google Drive", kind: "risky", level: "never", locked: true },

  // Stripe (2 allow, 0 ask, 1 never) -> total across 7 apps: 14 allow, 6 ask, 6 never
  {
    id: "st-read",
    app: "stripe",
    action: "Read payments",
    icon: "file",
    kind: "read",
    level: "allow",
    week: { done: 29 },
  },
  {
    id: "st-refund",
    app: "stripe",
    action: "Issue refunds",
    icon: "wallet",
    kind: "risky",
    level: "allow",
    limit: { value: 50, unit: "€" },
    week: { done: 2, asked: 1 },
    recent: [
      { what: "Refund 38 € to Hannah Kim – charged twice", ruleName: "Issue refunds", outcome: "done", at: "2 hours ago" },
      { what: "Refund 240 € to Lumen Studio", ruleName: "Issue refunds", outcome: "approved", at: "yesterday" },
      { what: "Refund 12 € to Jo Park", ruleName: "Issue refunds", outcome: "done", at: "3 days ago" },
    ],
  },
  {
    id: "st-prices",
    app: "stripe",
    action: "Change prices",
    detail: "Stripe",
    icon: "tag",
    kind: "risky",
    level: "never",
    locked: true,
    week: { blocked: 1 },
  },

  // Google Calendar (2 allow, 1 ask)
  { id: "ca-read", app: "calendar", action: "Check availability", kind: "read", level: "allow", week: { done: 18 } },
  { id: "ca-hold", app: "calendar", action: "Place internal focus holds", kind: "write", level: "allow", week: { done: 4 } },
  { id: "ca-invite", app: "calendar", action: "Send invites to external guests", kind: "risky", level: "ask", week: { asked: 2 } },

  // Web (1 allow, 1 ask, 1 never)
  { id: "wb-read", app: "web", action: "Browse public pages and docs", kind: "read", level: "allow", week: { done: 112 } },
  { id: "wb-form", app: "web", action: "Submit external forms", kind: "write", level: "ask", week: { asked: 2 } },
  {
    id: "wb-buy",
    app: "web",
    action: "Buy things",
    detail: "Web · With a saved card",
    kind: "risky",
    level: "never",
    locked: true,
  },
];

function levelForPreset(preset: PermissionPreset, kind: PermissionRule["kind"] = "write"): PermissionLevel {
  if (preset === "cautious") {
    return kind === "read" ? "allow" : kind === "write" ? "ask" : "never";
  }
  if (preset === "balanced") {
    return kind === "risky" ? "ask" : "allow";
  }
  return "allow";
}

function detectMatchingPreset(rules: PermissionRule[]): PermissionPreset {
  const unlocked = rules.filter((r) => !r.locked);
  if (unlocked.length === 0) return "balanced";
  const score = (p: PermissionPreset) =>
    unlocked.reduce((acc, r) => acc + (r.level === levelForPreset(p, r.kind) ? 1 : 0), 0);
  const sC = score("cautious");
  const sB = score("balanced");
  const sH = score("handsoff");
  if (sH >= sB && sH >= sC && sH > unlocked.length * 0.8) return "handsoff";
  if (sC >= sB && sC >= sH) return "cautious";
  return "balanced";
}

function LimitInlineField({
  rule,
  onSaveLimit,
}: {
  rule: PermissionRule;
  onSaveLimit: (rule: PermissionRule, nextVal: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(rule.limit?.value ?? 50));
  useEffect(() => {
    setDraft(String(rule.limit?.value ?? 50));
  }, [rule.limit?.value]);

  if (!rule.limit) return null;

  const commit = () => {
    const parsed = Number(draft.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(String(rule.limit!.value));
      return;
    }
    if (parsed !== rule.limit!.value) {
      onSaveLimit(rule, parsed);
    }
  };

  return (
    <label className="af-aops-limit-inline">
      <span>On its own up to</span>
      <span className="af-aops-limit-inline__box">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          style={{ width: `${Math.max(2, draft.length + 0.4)}ch` }}
          aria-label={`Limit for ${rule.action}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(String(rule.limit!.value));
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span>{rule.limit.unit}</span>
      </span>
      <span>asks above</span>
    </label>
  );
}

/**
 * Agent / Permissions (`/screens/agent-permissions`):
 * Autonomy preset selector (`Careful` / `Balanced` / `Hands-off`) with gliding stacked bars,
 * connected apps summary, locked `Red lines`, and per-app `Reads` / `Changes` / `Needs care` rules.
 */
export function AfAgentPermissions(props: AfAgentPermissionsProps = {}) {
  const {
    apps = DEFAULT_FIELDWORK_APPS,
    rules: rulesProp,
    defaultApp = "stripe",
    onChange,
    onPreset,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    labels,
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 5,
    loading = false,
    empty = false,
    onConnect,
    className,
    style,
    ...rest
  } = props;

  const initialDefaultsRef = useRef<Map<string, PermissionLevel>>(new Map());
  const [rules, setRules] = useState<PermissionRule[]>(() => {
    const src = rulesProp ?? DEFAULT_PERMISSION_RULES;
    for (const r of src) {
      if (!initialDefaultsRef.current.has(r.id)) {
        initialDefaultsRef.current.set(r.id, r.defaultLevel ?? r.level);
      }
    }
    return src;
  });

  useEffect(() => {
    if (rulesProp) setRules(rulesProp);
  }, [rulesProp]);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(defaultApp);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultApp !== null);
  const [liveMsg, setLiveMsg] = useState("");
  const radioRefs = useRef<Record<PermissionPreset, HTMLButtonElement | null>>({
    cautious: null,
    balanced: null,
    handsoff: null,
  });

  const copy = {
    permissions: labels?.permissions ?? "Permissions",
    autonomy: labels?.autonomy ?? "How much it does on its own",
    allowLong: labels?.allowLong ?? "On its own",
    askLong: labels?.askLong ?? "Asks first",
    neverLong: labels?.neverLong ?? "Never",
    locked: labels?.locked ?? "Red lines",
    cautious: labels?.cautious ?? "Careful",
    balanced: labels?.balanced ?? "Balanced",
    handsoff: labels?.handsoff ?? "Hands-off",
    reads: labels?.reads ?? "Reads",
    changes: labels?.changes ?? "Changes",
    care: labels?.care ?? "Needs care",
    apps: labels?.apps ?? "Apps",
    reset: labels?.reset ?? "Reset",
  };

  const activePreset = useMemo(() => detectMatchingPreset(rules), [rules]);

  const counts = useMemo(() => {
    let allow = 0;
    let ask = 0;
    let never = 0;
    for (const r of rules) {
      if (r.level === "allow") allow += 1;
      else if (r.level === "ask") ask += 1;
      else never += 1;
    }
    const total = Math.max(1, allow + ask + never);
    return { allow, ask, never, total };
  }, [rules]);

  const redLines = useMemo(() => rules.filter((r) => r.locked), [rules]);

  const appMap = useMemo(() => {
    const m = new Map<string, PermissionApp>();
    for (const a of apps) m.set(a.id.toLowerCase(), a);
    return m;
  }, [apps]);

  const selectedApp = useMemo(
    () => (empty ? null : apps.find((a) => a.id === selectedAppId) ?? null),
    [apps, empty, selectedAppId],
  );

  const levelText = useCallback(
    (lvl: PermissionLevel) => (lvl === "allow" ? copy.allowLong : lvl === "ask" ? copy.askLong : copy.neverLong),
    [copy.allowLong, copy.askLong, copy.neverLong],
  );

  const applyPreset = useCallback(
    (preset: PermissionPreset) => {
      const changed: PermissionRule[] = [];
      setRules((prev) =>
        prev.map((r) => {
          if (r.locked) return r;
          const nextLevel = levelForPreset(preset, r.kind);
          if (r.level === nextLevel) return r;
          const nextRule = { ...r, level: nextLevel };
          changed.push(nextRule);
          return nextRule;
        }),
      );
      for (const c of changed) onChange?.(c);
      onPreset?.(preset);

      const nextList = rules.map((r) => (r.locked ? r : { ...r, level: levelForPreset(preset, r.kind) }));
      const allowN = nextList.filter((r) => r.level === "allow").length;
      const askN = nextList.filter((r) => r.level === "ask").length;
      const neverN = nextList.filter((r) => r.level === "never").length;
      const label = preset === "cautious" ? copy.cautious : preset === "balanced" ? copy.balanced : copy.handsoff;
      setLiveMsg(`${label}: ${allowN} on its own, asks before ${askN}, never ${neverN}`);
    },
    [copy.balanced, copy.cautious, copy.handsoff, onChange, onPreset, rules],
  );

  const updateRuleLevel = useCallback(
    (rule: PermissionRule, nextLevel: PermissionLevel) => {
      if (rule.locked && nextLevel === "allow") return;
      if (rule.level === nextLevel) return;
      const updated: PermissionRule = { ...rule, level: nextLevel };
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      setLiveMsg(`${rule.action}: ${levelText(nextLevel)}`);
      onChange?.(updated);
    },
    [levelText, onChange],
  );

  const updateRuleLimit = useCallback(
    (rule: PermissionRule, nextVal: number) => {
      if (!rule.limit) return;
      const updated: PermissionRule = { ...rule, limit: { ...rule.limit, value: nextVal } };
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      setLiveMsg(`${rule.action}: up to ${rule.limit.unit}${nextVal}`);
      onChange?.(updated);
    },
    [onChange],
  );

  const resetAppRules = useCallback(
    (appId: string) => {
      const changed: PermissionRule[] = [];
      setRules((prev) =>
        prev.map((r) => {
          if (r.app !== appId) return r;
          const def = r.defaultLevel ?? initialDefaultsRef.current.get(r.id) ?? r.level;
          if (r.level === def) return r;
          const next = { ...r, level: def };
          changed.push(next);
          return next;
        }),
      );
      for (const c of changed) onChange?.(c);
      setLiveMsg(`Reset ${appMap.get(appId)?.name ?? appId} permissions`);
    },
    [appMap, onChange],
  );

  const presets: { id: PermissionPreset; icon: AffectIconKey; title: string; desc: string }[] = [
    { id: "cautious", icon: "shield", title: copy.cautious, desc: "Reads on its own, asks before it changes anything" },
    { id: "balanced", icon: "sliders", title: copy.balanced, desc: "Works on its own, asks before anything that needs care" },
    { id: "handsoff", icon: "bolt", title: copy.handsoff, desc: "Does everything on its own – except the red lines" },
  ];

  const handlePresetKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const order: PermissionPreset[] = ["cautious", "balanced", "handsoff"];
    const idx = order.indexOf(activePreset);
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = order[(idx + delta + order.length) % order.length]!;
    applyPreset(next);
    radioRefs.current[next]?.focus();
  };

  const renderRuleMenu = (rule: PermissionRule) => {
    const menuItems: AfMenuItem[] = [];
    if (!rule.locked) {
      menuItems.push({
        type: "radio",
        id: "allow",
        label: copy.allowLong,
        description: "Acts right away and logs the step in Activity",
        checked: rule.level === "allow",
        onSelect: () => updateRuleLevel(rule, "allow"),
      });
    } else {
      menuItems.push({
        type: "label",
        label: "Red line – never runs on its own",
      });
    }
    menuItems.push(
      {
        type: "radio",
        id: "ask",
        label: copy.askLong,
        description: "Waits in Inbox until you approve it",
        checked: rule.level === "ask",
        onSelect: () => updateRuleLevel(rule, "ask"),
      },
      {
        type: "radio",
        id: "never",
        label: copy.neverLong,
        description: "Blocked – even if a prompt asks for it",
        checked: rule.level === "never",
        onSelect: () => updateRuleLevel(rule, "never"),
      },
    );

    return (
      <AfDropdownMenu items={menuItems} side="bottom" align="end">
        <button
          type="button"
          className="af-aops-level-btn"
          data-level={rule.level}
          aria-label={`${rule.action}: ${levelText(rule.level)}`}
        >
          {rule.level === "never" ? (
            <span className="af-aops-never-slash" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.4" />
                <line x1="3.4" y1="10.6" x2="10.6" y2="3.4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
          ) : (
            <span className="af-aops-level-dot" data-level={rule.level} aria-hidden="true" />
          )}
          <span>{levelText(rule.level)}</span>
          <AfIcon name="chevronDown" size={11} />
        </button>
      </AfDropdownMenu>
    );
  };

  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="af-aops-inspector">
          <AfSkeleton lines={3} />
          <AfSkeleton lines={5} />
        </div>
      );
    }

    if (!selectedApp) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="shield" size={18} />
          <span>Select a connected app to configure its actions and limits.</span>
        </div>
      );
    }

    const appRules = rules.filter((r) => r.app === selectedApp.id);
    const readRules = appRules.filter((r) => r.kind === "read");
    const writeRules = appRules.filter((r) => (r.kind ?? "write") === "write");
    const careRules = appRules.filter((r) => r.kind === "risky");
    const recents = appRules.flatMap((r) => r.recent ?? []);

    const sections: { title: string; list: PermissionRule[] }[] = [
      { title: copy.reads, list: readRules },
      { title: copy.changes, list: writeRules },
      { title: copy.care, list: careRules },
    ].filter((s) => s.list.length > 0);

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-inspector__head">
          <AppBrandTile appId={selectedApp.id} name={selectedApp.name} icon={selectedApp.icon} size={34} />
          <div className="af-aops-inspector__titles">
            <h3 className="af-aops-inspector__title">{selectedApp.name}</h3>
            {selectedApp.account ? <div className="af-aops-inspector__sub">{selectedApp.account}</div> : null}
          </div>
          {appRules.some((r) => r.level !== (r.defaultLevel ?? initialDefaultsRef.current.get(r.id) ?? r.level)) ? (
            <AfButton variant="ghost" size="xs" onClick={() => resetAppRules(selectedApp.id)}>
              {copy.reset}
            </AfButton>
          ) : null}
        </div>

        {sections.map((sec) => {
          const uniqueLevels = new Set(sec.list.map((r) => r.level));
          const isMixed = sec.list.length > 1 && uniqueLevels.size > 1;
          return (
            <section key={sec.title} className="af-aops-sec">
              <div className="af-aops-sec__head">
                <span className="af-aops-row-cluster">
                  <span className="af-aops-sec__title af-aops-sec__title--muted">{sec.title}</span>
                  <span className="af-aops-faint af-aops-tabular">{sec.list.length}</span>
                </span>
                {isMixed ? (
                  <span className="af-aops-mixed-tag">
                    <span className="af-aops-level-dot" data-level="allow" aria-hidden="true" />
                    <span>Mixed</span>
                    <AfIcon name="chevronDown" size={11} />
                  </span>
                ) : null}
              </div>
              <div className="af-aops-rule-stack">
                {sec.list.map((rule) => (
                  <div key={rule.id} className="af-aops-rule-item">
                    <div className="af-aops-rule-item__top">
                      <div className="af-aops-rule-item__info">
                        <span className="af-aops-rule-item__name">
                          <AfIcon name={rule.icon ?? (rule.kind === "read" ? "eye" : "sliders")} size={13} />
                          <span>{rule.action}</span>
                        </span>
                      </div>
                      {renderRuleMenu(rule)}
                    </div>
                    {rule.limit && rule.level === "allow" ? (
                      <LimitInlineField rule={rule} onSaveLimit={updateRuleLimit} />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {recents.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title af-aops-sec__title--muted">Lately</div>
            <div className="af-aops-used-list">
              {recents.map((rc, i) => (
                <div key={i} className="af-aops-lately-row">
                  <div className="af-aops-lately-row__main">
                    <div className="af-aops-used-item__task">{rc.what}</div>
                    <div className="af-aops-used-item__how af-aops-tabular">
                      {rc.ruleName ? `${rc.ruleName} · ` : ""}
                      {rc.at}
                    </div>
                  </div>
                  <span className="af-aops-outcome-pill" data-outcome={rc.outcome}>
                    {rc.outcome === "done"
                      ? "Done"
                      : rc.outcome === "approved"
                        ? "Approved"
                        : rc.outcome === "blocked"
                          ? "Blocked"
                          : "Declined"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.permissions}</h1>
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Permissions"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={680}
      panelTitle="App"
      panelTab={selectedApp ? selectedApp.name : "App"}
      panelTabIcon={
        selectedApp ? (
          <AppBrandTile
            appId={selectedApp.id}
            name={selectedApp.name}
            icon={selectedApp.icon}
            size={15}
            className="af-aops-tab-tile"
          />
        ) : null
      }
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={360}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      className={["af-aops--permissions", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      <p className="af-aops-page-lead">
        {labels?.intro ?? "What your agent – and every agent it starts – may do without asking you first"}
      </p>

      {loading ? (
        <div className="af-aops-group-stack">
          <AfSkeleton variant="rect" height={108} radius={12} />
          <AfSkeleton variant="rect" height={240} radius={12} />
        </div>
      ) : empty ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="shield" size={20} />
          </div>
          <h2 className="af-aops-empty__title">No apps connected</h2>
          <p className="af-aops-empty__desc">
            Connect Gmail, Slack, GitHub or Stripe to decide what your agent may read and change on its own.
          </p>
          <AfButton
            variant="primary"
            size="sm"
            onClick={() => (onConnect ? onConnect() : onNavigate?.("Integrations"))}
          >
            Connect app
          </AfButton>
        </div>
      ) : (
        <div className="af-aops-group-stack">
          <section className="af-aops-sec">
            <div className="af-aops-sec__title af-aops-sec__title--muted">{copy.autonomy}</div>
            <div className="af-aops-autonomy-card">
              <div
                role="radiogroup"
                aria-label={copy.autonomy}
                className="af-aops-preset-cards"
                onKeyDown={handlePresetKeyDown}
              >
                {presets.map((p) => {
                  const checked = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      ref={(el) => {
                        radioRefs.current[p.id] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked ? 0 : -1}
                      className="af-aops-preset-card"
                      data-checked={checked ? "true" : undefined}
                      onClick={() => applyPreset(p.id)}
                    >
                      <div className="af-aops-preset-card__top">
                        <span className="af-aops-preset-card__icon" aria-hidden="true">
                          <AfIcon name={p.icon} size={14} />
                        </span>
                        <span className="af-aops-preset-card__title">{p.title}</span>
                      </div>
                      <p className="af-aops-preset-card__desc">{p.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="af-aops-prop-summary">
                <div className="af-aops-prop-summary__words af-aops-tabular">
                  <span>
                    Does <strong>{counts.allow}</strong> things on its own
                  </span>
                  <span className="af-aops-faint">·</span>
                  <span>
                    asks before <strong>{counts.ask}</strong>
                  </span>
                  <span className="af-aops-faint">·</span>
                  <span>
                    never does <strong>{counts.never}</strong>
                  </span>
                </div>
                <div className="af-aops-prop-bar" aria-hidden="true">
                  <span
                    className="af-aops-prop-bar__seg"
                    data-level="allow"
                    style={{ width: `${(counts.allow / counts.total) * 100}%` }}
                  />
                  <span
                    className="af-aops-prop-bar__seg"
                    data-level="ask"
                    style={{ width: `${(counts.ask / counts.total) * 100}%` }}
                  />
                  <span
                    className="af-aops-prop-bar__seg"
                    data-level="never"
                    style={{ width: `${(counts.never / counts.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="af-aops-sec">
            <div className="af-aops-day-head">
              <span className="af-aops-sec__title af-aops-sec__title--muted">{copy.apps}</span>
              <span className="af-aops-faint af-aops-tabular">{apps.length}</span>
            </div>
            <div className="af-aops-list-card">
              {apps.map((app) => {
                const ar = rules.filter((r) => r.app === app.id);
                const aAllow = ar.filter((r) => r.level === "allow").length;
                const aAsk = ar.filter((r) => r.level === "ask").length;
                const aNever = ar.filter((r) => r.level === "never").length;
                const aTot = Math.max(1, ar.length);
                const parts: string[] = [];
                if (aAllow > 0) parts.push(`${aAllow} on its own`);
                if (aAsk > 0) parts.push(`asks before ${aAsk}`);
                if (aNever > 0) parts.push(`never ${aNever}`);
                const words = parts.join(" · ");
                const fullName = `${app.name}${app.account ? `, ${app.account}` : ""}: ${words}`;
                const isSelected = selectedAppId === app.id;

                return (
                  <button
                    key={app.id}
                    type="button"
                    className="af-aops-app-row"
                    data-selected={isSelected ? "true" : undefined}
                    aria-label={fullName}
                    onClick={() => {
                      setSelectedAppId(app.id);
                      setPanelOpen(true);
                      onSelect?.(app.id);
                    }}
                  >
                    <AppBrandTile appId={app.id} name={app.name} icon={app.icon} size={26} />
                    <span className="af-aops-app-row__ident">
                      <AfTooltip label={`${app.name}${app.account ? ` · ${app.account}` : ""}`} delay={420}>
                        <span className="af-aops-app-row__ident-in">
                          <span className="af-aops-app-row__name">{app.name}</span>
                          {app.account ? <span className="af-aops-app-row__acct">{app.account}</span> : null}
                        </span>
                      </AfTooltip>
                    </span>
                    <span className="af-aops-mini-bar" aria-hidden="true">
                      <span
                        className="af-aops-prop-bar__seg"
                        data-level="allow"
                        style={{ width: `${(aAllow / aTot) * 100}%` }}
                      />
                      <span
                        className="af-aops-prop-bar__seg"
                        data-level="ask"
                        style={{ width: `${(aAsk / aTot) * 100}%` }}
                      />
                      <span
                        className="af-aops-prop-bar__seg"
                        data-level="never"
                        style={{ width: `${(aNever / aTot) * 100}%` }}
                      />
                    </span>
                    <span className="af-aops-app-row__counts af-aops-tabular" aria-hidden="true">
                      {words}
                    </span>
                    <span className="af-aops-app-row__chev" aria-hidden="true">
                      <AfIcon name="chevronRight" size={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {redLines.length > 0 ? (
            <section className="af-aops-sec">
              <div className="af-aops-redline-head">
                <div className="af-aops-row-cluster">
                  <span className="af-aops-never-slash" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.4" />
                      <line x1="3.4" y1="10.6" x2="10.6" y2="3.4" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </span>
                  <span className="af-aops-sec__title af-aops-sec__title--muted">{copy.locked}</span>
                </div>
                <span className="af-aops-faint">These always ask – or never happen – whatever you pick above</span>
              </div>
              <div className="af-aops-list-card">
                {redLines.map((rl) => {
                  const appInfo = appMap.get(rl.app.toLowerCase());
                  return (
                    <div key={rl.id} className="af-aops-redline-row">
                      <AppBrandTile appId={rl.app} name={appInfo?.name ?? rl.app} size={22} />
                      <div className="af-aops-redline-row__text">
                        <span className="af-aops-redline-row__action">{rl.action}</span>
                        <span className="af-aops-redline-row__sub">{rl.detail ?? appInfo?.name ?? rl.app}</span>
                      </div>
                      {renderRuleMenu(rl)}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AgentOpsShell>
  );
}
