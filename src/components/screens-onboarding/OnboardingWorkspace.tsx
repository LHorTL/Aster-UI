import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfInput } from "../controls/Input";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AfShellSidebarCards,
  ShellPanelLeftSvg,
  ShellProjectFolderSvg,
} from "./AppShellFlat";
import { isValidEmail } from "./OnboardingPreview";

export type AfOnboardingStep = 1 | 2 | 3 | 4;

export type AfOnboardingUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type AfOnboardingValues = {
  workspace: string;
  slug: string;
  teamSize: string;
  tools: string[];
  invites: string[];
  role: "Member" | "Admin";
  template: string;
};

export type AfOnboardingProps = HTMLAttributes<HTMLDivElement> & {
  /** 首次展示的步骤；在此之前的步骤初始计为已完成，默认 `2`。 */
  defaultStep?: AfOnboardingStep;
  /** 邀请框中预填的团队邮箱列表，默认 `["jamie@acme.com"]`。 */
  defaultInvites?: string[];
  /** 完成第 4 步（创建首个 Agent 或跳过最后一步）时回调完整配置值。 */
  onComplete?: (values: AfOnboardingValues) => void;
  /** 点击侧栏菜单项或完成页快捷入口（Chat / Integrations / Analytics）时触发。 */
  onNavigate?: (label: string) => void;
  /** 工作区初始名称（同步显示在侧栏、欢迎语与第 1 步输入框），默认 `"Acme"`。 */
  workspace?: string;
  /** 侧栏底部当前登录用户信息，名（first name）用于标题问候语，默认 `{ name: "Alex Morgan" }`。 */
  user?: AfOnboardingUser;
};

function BrandSlackSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#E01E5A" d="M5.04 15.17a2.53 2.53 0 0 1-2.52 2.52A2.53 2.53 0 0 1 0 15.17a2.53 2.53 0 0 1 2.52-2.53h2.52zm1.27 0a2.53 2.53 0 0 1 2.53-2.53 2.53 2.53 0 0 1 2.52 2.53v6.31A2.53 2.53 0 0 1 8.84 24a2.53 2.53 0 0 1-2.53-2.52z" />
      <path fill="#36C5F0" d="M8.84 5.04a2.53 2.53 0 0 1-2.53-2.52A2.53 2.53 0 0 1 8.84 0a2.53 2.53 0 0 1 2.52 2.52v2.52zm0 1.27a2.53 2.53 0 0 1 2.52 2.53 2.53 2.53 0 0 1-2.52 2.52H2.52A2.53 2.53 0 0 1 0 8.84a2.53 2.53 0 0 1 2.52-2.53z" />
      <path fill="#2EB67D" d="M18.96 8.84a2.53 2.53 0 0 1 2.52-2.53A2.53 2.53 0 0 1 24 8.84a2.53 2.53 0 0 1-2.52 2.52h-2.52zm-1.27 0a2.53 2.53 0 0 1-2.53 2.52 2.53 2.53 0 0 1-2.52-2.52V2.52A2.53 2.53 0 0 1 15.16 0a2.53 2.53 0 0 1 2.53 2.52z" />
      <path fill="#ECB22E" d="M15.16 18.96a2.53 2.53 0 0 1 2.53 2.52A2.53 2.53 0 0 1 15.16 24a2.53 2.53 0 0 1-2.52-2.52v-2.52zm0-1.27a2.53 2.53 0 0 1-2.52-2.53 2.53 2.53 0 0 1 2.52-2.52h6.32A2.53 2.53 0 0 1 24 15.16a2.53 2.53 0 0 1-2.52 2.53z" />
    </svg>
  );
}

function BrandNotionSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function BrandDriveSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1FA463" d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
    </svg>
  );
}

function BrandHubspotSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FF7A59" d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z" />
    </svg>
  );
}

function BrandLinearSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#5E6AD2" d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  );
}

function BrandCalendarSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" />
    </svg>
  );
}

function HomeCircleSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeadsetSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13V12a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="2" />
      <rect x="17" y="13" width="4" height="6" rx="2" />
      <path d="M19 19a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

type ToolEntry = {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  defaultConnected?: boolean;
};

const WORKSPACE_TOOLS: ToolEntry[] = [
  {
    id: "slack",
    name: "Slack",
    icon: <BrandSlackSvg />,
    description: "Ask your agents from any channel and get their reports there.",
    defaultConnected: true,
  },
  {
    id: "notion",
    name: "Notion",
    icon: <BrandNotionSvg />,
    description: "Search pages while you chat and save answers as docs.",
  },
  {
    id: "drive",
    name: "Google Drive",
    icon: <BrandDriveSvg />,
    description: "Pick files from Drive and let agents read them for context.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    icon: <BrandHubspotSvg />,
    description: "Look up contacts and deals, and log what agents find.",
  },
  {
    id: "linear",
    name: "Linear",
    icon: <BrandLinearSvg />,
    description: "Turn requests from chat into issues and follow them to release.",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    icon: <BrandCalendarSvg />,
    description: "Schedule agent runs and prepare briefs before meetings.",
  },
];

const TEAM_SIZES = ["Just me", "2–10", "11–50", "50+"];

const AGENT_TEMPLATES: { id: string; title: string; summary: string }[] = [
  { id: "support-triage", title: "Support triage", summary: "Drafts cited replies and routes urgent tickets." },
  { id: "pr-reviewer", title: "PR reviewer", summary: "Checks diffs against architecture & style rules." },
  { id: "weekly-researcher", title: "Weekly researcher", summary: "Summarizes product metrics every Monday." },
  { id: "blank", title: "Blank agent", summary: "Start from an empty prompt and custom tools." },
];

const SIDEBAR_NAV: { label: string; icon: AffectIconKey | ReactNode }[] = [
  { label: "Home", icon: <HomeCircleSvg /> },
  { label: "Chat", icon: "message" },
  { label: "Analytics", icon: "chart" },
  { label: "Integrations", icon: "grid" },
];

const SIDEBAR_PROJECTS = ["Q3 Campaign", "Brand assets", "Hiring", "Research"];

function slugifyWorkspace(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "acme"
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/** AI 工作区首次引导整页屏幕（Onboarding）：含完整可折叠工作区侧栏 + 4 步设置向导 + 启动检查单。 */
export function AfOnboarding(props: AfOnboardingProps = {}) {
  const {
    defaultStep = 2,
    defaultInvites = ["jamie@acme.com"],
    onComplete,
    onNavigate,
    workspace: workspaceProp = "Acme",
    user = { name: "Alex Morgan" },
    className,
    ...rest
  } = props;

  const teamSizeGroupId = useId();
  const templateGroupId = useId();
  const tplRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");

  const [currentStep, setCurrentStep] = useState<AfOnboardingStep>(defaultStep);
  const [completedSteps, setCompletedSteps] = useState<Set<AfOnboardingStep>>(() => {
    const initial = new Set<AfOnboardingStep>();
    for (let s = 1; s < defaultStep; s++) initial.add(s as AfOnboardingStep);
    return initial;
  });
  const [finished, setFinished] = useState(false);

  // Step 1 state
  const [wsName, setWsName] = useState(workspaceProp);
  const [wsSlug, setWsSlug] = useState(() => slugifyWorkspace(workspaceProp));
  const [slugEdited, setSlugEdited] = useState(false);
  const [teamSize, setTeamSize] = useState("2–10");

  // Step 2 state
  const [connectedTools, setConnectedTools] = useState<string[]>(() =>
    WORKSPACE_TOOLS.filter((t) => t.defaultConnected).map((t) => t.id),
  );

  // Step 3 state
  const [invites, setInvites] = useState<string[]>(defaultInvites);
  const [inviteDraft, setInviteDraft] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"Member" | "Admin">("Member");

  // Step 4 state
  const [template, setTemplate] = useState("support-triage");

  const firstName = user.name.trim().split(/\s+/)[0] || "Alex";
  const effectiveWorkspace = wsName.trim() || workspaceProp || "Acme";
  const doneCount = finished ? 4 : completedSteps.size;

  const wsMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { id: "invite", label: "Invite people", icon: "users", onSelect: () => setCurrentStep(3) },
      { type: "separator" },
      { id: "settings", label: "Workspace settings", icon: "settings", onSelect: () => onNavigate?.("Workspace settings") },
      { id: "analytics", label: "Analytics", icon: "chart", onSelect: () => onNavigate?.("Analytics") },
      { id: "billing", label: "Billing", icon: "creditCard", onSelect: () => onNavigate?.("Billing") },
      { id: "members", label: "Members", icon: "user", onSelect: () => onNavigate?.("Members") },
      { type: "separator" },
      { id: "switch", label: "Switch workspace", icon: "layers", onSelect: () => onNavigate?.("Switch workspace") },
    ],
    [onNavigate],
  );

  const userMenuItems = useMemo<AfMenuItem[]>(
    () => [
      {
        type: "label",
        label: `${user.name} · ${user.email ?? `${firstName.toLowerCase()}@${wsSlug}.com`}`,
      },
      { id: "profile", label: "Account settings", icon: "settings", onSelect: () => onNavigate?.("Settings") },
      { id: "help", label: "Help & documentation", icon: "help", onSelect: () => onNavigate?.("Help") },
      { type: "separator" },
      { id: "logout", label: "Log out", icon: "arrowLeft", onSelect: () => onNavigate?.("Log out") },
    ],
    [firstName, onNavigate, user.email, user.name, wsSlug],
  );

  const commands = useMemo<AfCommand[]>(
    () => [
      { id: "step-1", group: "Onboarding", label: "Step 1: Workspace", icon: "building", onSelect: () => { setFinished(false); setCurrentStep(1); } },
      { id: "step-2", group: "Onboarding", label: "Step 2: Connect your tools", icon: "grid", onSelect: () => { setFinished(false); setCurrentStep(2); } },
      { id: "step-3", group: "Onboarding", label: "Step 3: Invite your team", icon: "users", onSelect: () => { setFinished(false); setCurrentStep(3); } },
      { id: "step-4", group: "Onboarding", label: "Step 4: Your first agent", icon: "bot", onSelect: () => { setFinished(false); setCurrentStep(4); } },
      { id: "nav-chat", group: "Navigate", label: "Open Chat", icon: "message", kbd: "⌘N", onSelect: () => onNavigate?.("Chat") },
      { id: "nav-int", group: "Navigate", label: "Browse Integrations", icon: "layers", onSelect: () => onNavigate?.("Integrations") },
    ],
    [onNavigate],
  );

  const buildPayload = (): AfOnboardingValues => ({
    workspace: effectiveWorkspace,
    slug: wsSlug.trim() || slugifyWorkspace(effectiveWorkspace),
    teamSize,
    tools: connectedTools,
    invites,
    role: inviteRole,
    template,
  });

  const advanceStep = (markDone: boolean) => {
    const nextDone = new Set(completedSteps);
    if (markDone) nextDone.add(currentStep);
    setCompletedSteps(nextDone);

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as AfOnboardingStep);
    } else {
      setFinished(true);
      onComplete?.(buildPayload());
    }
  };

  const addInviteChip = (raw: string): boolean => {
    const cleaned = raw.replace(/,+$/, "").trim().toLowerCase();
    if (!cleaned) return false;
    if (!isValidEmail(cleaned)) {
      setInviteError("Enter a valid work email address.");
      return false;
    }
    setInviteError(null);
    setInvites((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setInviteDraft("");
    return true;
  };

  const handleStepSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (currentStep === 3 && inviteDraft.trim()) {
      if (!addInviteChip(inviteDraft)) return;
    }
    advanceStep(true);
  };

  const toggleTool = (id: string) => {
    setConnectedTools((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const stepMeta: { step: AfOnboardingStep; title: string; subtitle: (isCurrent: boolean, isDone: boolean) => string }[] = [
    {
      step: 1,
      title: "Workspace",
      subtitle: (isCurrent, isDone) =>
        isDone ? `${effectiveWorkspace} · ${teamSize} people` : isCurrent ? "In progress" : "Name & team size",
    },
    {
      step: 2,
      title: "Connect your tools",
      subtitle: (isCurrent, isDone) =>
        isCurrent ? "In progress" : isDone ? `${connectedTools.length} connected` : "About 1 min",
    },
    {
      step: 3,
      title: "Invite your team",
      subtitle: (isCurrent, isDone) =>
        isCurrent ? "In progress" : isDone ? `${invites.length} invited` : "Under a minute",
    },
    {
      step: 4,
      title: "Your first agent",
      subtitle: (isCurrent, isDone) => (isCurrent ? "In progress" : isDone ? "Ready" : "About 1 min"),
    },
  ];

  const renderSidebarContent = (collapsed: boolean) => (
    <>
      <div className="af-asf__side-head">
        {!collapsed ? (
          <AfDropdownMenu items={wsMenuItems} side="bottom" align="start">
            <button type="button" className="af-asf__ws-btn" aria-label={`${effectiveWorkspace} workspace menu`}>
              <span className="af-asf__ws-logo">{effectiveWorkspace.charAt(0).toUpperCase()}</span>
              <span className="af-asf__ws-name">{effectiveWorkspace}</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          </AfDropdownMenu>
        ) : null}
        <AfTooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <button
            type="button"
            className="af-asf__icon-btn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <ShellPanelLeftSvg />
          </button>
        </AfTooltip>
      </div>

      <div className="af-asf__side-scroll">
        {collapsed ? (
          <AfTooltip content="Search…" kbd="⌘K" side="right">
            <button
              type="button"
              className="af-asf__rail-btn"
              aria-label="Search workspace"
              onClick={() => setPaletteOpen(true)}
            >
              <AfIcon name="search" size={15} />
            </button>
          </AfTooltip>
        ) : (
          <button type="button" className="af-asf__search-btn" onClick={() => setPaletteOpen(true)}>
            <span className="af-asf__search-left">
              <AfIcon name="search" size={13} />
              <span>Search…</span>
            </span>
            <span className="af-asf__kbd">⌘K</span>
          </button>
        )}

        <nav className="af-asf__nav-group" aria-label="Workspace navigation">
          {SIDEBAR_NAV.map((item) => {
            const active = activeNav === item.label;
            const iconNode = typeof item.icon === "string" ? <AfIcon name={item.icon} size={14} /> : item.icon;
            if (collapsed) {
              return (
                <AfTooltip key={item.label} content={item.label} side="right">
                  <button
                    type="button"
                    className="af-asf__rail-btn"
                    data-active={active || undefined}
                    aria-label={item.label}
                    onClick={() => {
                      setActiveNav(item.label);
                      onNavigate?.(item.label);
                    }}
                  >
                    {iconNode}
                  </button>
                </AfTooltip>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                className="af-asf__nav-btn"
                data-active={active || undefined}
                onClick={() => {
                  setActiveNav(item.label);
                  onNavigate?.(item.label);
                }}
              >
                <span className="af-asf__nav-main">
                  {iconNode}
                  <span className="af-asf__nav-label">{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="af-asf__nav-group">
            <div className="af-asf__sec-head">
              <span>Projects</span>
            </div>
            {SIDEBAR_PROJECTS.map((proj) => (
              <button
                key={proj}
                type="button"
                className="af-asf__nav-btn"
                data-active={activeNav === proj || undefined}
                onClick={() => {
                  setActiveNav(proj);
                  onNavigate?.(proj);
                }}
              >
                <span className="af-asf__nav-main">
                  <ShellProjectFolderSvg />
                  <span className="af-asf__nav-label">{proj}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <AfShellSidebarCards
          workspace={effectiveWorkspace}
          onSelectChangelog={() => onNavigate?.("Changelog")}
          onSelectGettingStarted={() => setFinished(false)}
        />
      ) : null}

      <div className="af-asf__side-foot">
        <AfDropdownMenu items={userMenuItems} side="top" align="start">
          {collapsed ? (
            <button type="button" className="af-asf__rail-btn" aria-label={user.name}>
              <span className="af-asf__avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : initialsOf(user.name)}
              </span>
            </button>
          ) : (
            <button type="button" className="af-asf__user-btn">
              <span className="af-asf__avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : initialsOf(user.name)}
              </span>
              <span className="af-asf__nav-label" style={{ flex: 1 }}>
                {user.name}
              </span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          )}
        </AfDropdownMenu>
      </div>
    </>
  );

  return (
    <div ref={setShellEl} className={cn("af-ob-app", className)} data-shell="inset" {...rest}>
      <aside
        className="af-asf__side"
        data-desktop-only=""
        data-collapsed={sidebarCollapsed || undefined}
        aria-label="Workspace sidebar"
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      <AfDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        placement="left"
        width={268}
        title={effectiveWorkspace}
        container={shellEl}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {renderSidebarContent(false)}
        </div>
      </AfDrawer>

      <AfCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        placeholder="Jump to onboarding step or workspace view…"
        container={shellEl}
      />

      <main className="af-ob__main">
        <header className="af-ob__topbar">
          <div className="af-ob__crumb">
            {sidebarCollapsed ? (
              <button
                type="button"
                className="af-asf__icon-btn"
                aria-label="Expand sidebar"
                onClick={() => setSidebarCollapsed(false)}
              >
                <ShellPanelLeftSvg />
              </button>
            ) : null}
            <button
              type="button"
              className="af-asf__icon-btn af-asf__mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <AfIcon name="menu" size={15} />
            </button>
            <span>Home</span>
            <span aria-hidden="true">/</span>
            <strong>Getting started</strong>
          </div>
        </header>

        <div className="af-ob__content">
          <aside className="af-ob__aside" aria-label="Setup checklist">
            <div className="af-ob__welcome">
              <span className="af-ob__eyebrow">Getting started</span>
              <h1>
                Welcome to {effectiveWorkspace}, {firstName}
              </h1>
              <p>A few quick steps – about two minutes.</p>
            </div>

            <div className="af-ob__progress">
              <div className="af-ob__progress-track" aria-hidden="true">
                <div className="af-ob__progress-fill" style={{ width: `${(doneCount / 4) * 100}%` }} />
              </div>
              <span className="af-ob__progress-label">
                <strong>{doneCount}</strong> of 4 done
              </span>
            </div>

            <div className="af-ob__steps" role="list" aria-label="Setup steps">
              {stepMeta.map((item) => {
                const isCurrent = !finished && currentStep === item.step;
                const isDone = completedSteps.has(item.step) || finished;
                return (
                  <button
                    key={item.step}
                    type="button"
                    className="af-ob__step-btn"
                    aria-current={isCurrent ? "step" : undefined}
                    data-done={(!isCurrent && isDone) || undefined}
                    onClick={() => {
                      setFinished(false);
                      setCurrentStep(item.step);
                    }}
                  >
                    <span className="af-ob__step-indicator" aria-hidden="true">
                      {!isCurrent && isDone ? <AfIcon name="check" size={10} /> : null}
                    </span>
                    <span className="af-ob__step-copy">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle(isCurrent, !isCurrent && isDone)}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="af-ob__help"
              onClick={() => onNavigate?.("Setup call")}
            >
              <span className="af-ob__help-icon" aria-hidden="true">
                <HeadsetSvg />
              </span>
              <span className="af-ob__help-copy">
                <strong>Need a hand?</strong>
                <span>Book a free 15-minute setup call</span>
              </span>
            </button>
          </aside>

          {finished ? (
            <section className="af-ob__panel" aria-live="polite">
              <span className="af-ob__panel-kicker">All set</span>
              <h2 className="af-ob__panel-title">{effectiveWorkspace} is ready to go</h2>
              <p className="af-ob__panel-desc">
                Connected {connectedTools.length} {connectedTools.length === 1 ? "tool" : "tools"}, invited{" "}
                {invites.length} {invites.length === 1 ? "teammate" : "teammates"}, and created your starter agent.
              </p>

              <div className="af-ob__launch-cards">
                {[
                  { label: "Chat", desc: "Start a thread with your new agent" },
                  { label: "Integrations", desc: "Manage connected workspace apps" },
                  { label: "Analytics", desc: "Track usage and agent runs" },
                ].map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    className="af-ob__launch-card"
                    onClick={() => onNavigate?.(card.label)}
                  >
                    <strong>{card.label}</strong>
                    <span>{card.desc}</span>
                  </button>
                ))}
              </div>

              <div className="af-ob__foot">
                <button type="button" className="af-ob__skip-btn" onClick={() => setFinished(false)}>
                  Review steps
                </button>
                <div className="af-ob__foot-right">
                  <button type="button" className="af-ob__primary-btn" onClick={() => onNavigate?.("Chat")}>
                    <span>Open Chat</span>
                    <AfIcon name="chevronRight" size={12} />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <form className="af-ob__panel" onSubmit={handleStepSubmit} noValidate>
              <span className="af-ob__panel-kicker">Step {currentStep} of 4</span>

              {currentStep === 1 ? (
                <>
                  <h2 className="af-ob__panel-title">Name your workspace</h2>
                  <p className="af-ob__panel-desc">
                    This is shared across your team&apos;s agents, threads and integrations.
                  </p>
                  <div className="af-obw__form">
                    <AfInput
                      label="Workspace name"
                      value={wsName}
                      onChange={(e) => {
                        setWsName(e.target.value);
                        if (!slugEdited) setWsSlug(slugifyWorkspace(e.target.value));
                      }}
                      placeholder="Acme"
                    />
                    <div className="af-obw__field">
                      <span className="af-obw__label">Workspace URL</span>
                      <div className="af-ob__slug-box">
                        <span className="af-ob__slug-prefix">acme.app/</span>
                        <input
                          type="text"
                          aria-label="Workspace URL slug"
                          value={wsSlug}
                          onChange={(e) => {
                            setSlugEdited(true);
                            setWsSlug(slugifyWorkspace(e.target.value));
                          }}
                        />
                      </div>
                    </div>
                    <div className="af-obw__field">
                      <span id={teamSizeGroupId} className="af-obw__label">
                        Team size
                      </span>
                      <div className="af-obw__seg" role="radiogroup" aria-labelledby={teamSizeGroupId}>
                        {TEAM_SIZES.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            role="radio"
                            aria-checked={teamSize === sz}
                            tabIndex={teamSize === sz ? 0 : -1}
                            className="af-obw__seg-btn"
                            onClick={() => setTeamSize(sz)}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {currentStep === 2 ? (
                <>
                  <h2 className="af-ob__panel-title">Connect your tools</h2>
                  <p className="af-ob__panel-desc">
                    Your agents can read from and act in the apps you connect. Change this anytime.
                  </p>
                  <div className="af-ob__tools">
                    {WORKSPACE_TOOLS.map((tool) => {
                      const checked = connectedTools.includes(tool.id);
                      return (
                        <div key={tool.id} className="af-ob__tool-row">
                          <div className="af-ob__tool-info">
                            <span className="af-ob__tool-badge" aria-hidden="true">
                              {tool.icon}
                            </span>
                            <div className="af-ob__tool-copy">
                              <div className="af-ob__tool-titleline">
                                <strong>{tool.name}</strong>
                                {checked ? <span className="af-ob__connected-pill">Connected</span> : null}
                              </div>
                              <span>{tool.description}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            aria-label={`Connect ${tool.name}`}
                            className="af-ob__switch"
                            onClick={() => toggleTool(tool.id)}
                          >
                            <span className="af-ob__switch-thumb" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {currentStep === 3 ? (
                <>
                  <h2 className="af-ob__panel-title">Invite your team</h2>
                  <p className="af-ob__panel-desc">
                    Teammates get shared access to agents, knowledge folders and runs.
                  </p>
                  <div className="af-obw__form">
                    <div className="af-obw__entry" data-invalid={inviteError ? true : undefined}>
                      <input
                        type="email"
                        className="af-obw__entry-input"
                        aria-label="Teammate email address"
                        aria-invalid={inviteError ? "true" : undefined}
                        placeholder="colleague@acme.com"
                        value={inviteDraft}
                        onChange={(e) => {
                          setInviteDraft(e.target.value);
                          if (inviteError) setInviteError(null);
                        }}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "," || e.key === " ") {
                            if (inviteDraft.trim()) {
                              e.preventDefault();
                              addInviteChip(inviteDraft);
                            }
                          } else if (e.key === "Backspace" && !inviteDraft && invites.length > 0) {
                            e.preventDefault();
                            setInvites((prev) => prev.slice(0, -1));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="af-obw__top-btn"
                        onClick={() => setInviteRole((r) => (r === "Member" ? "Admin" : "Member"))}
                        aria-label={`Invite role: ${inviteRole}`}
                      >
                        <span>{inviteRole}</span>
                        <AfIcon name="chevronDown" size={11} />
                      </button>
                    </div>

                    {invites.length > 0 ? (
                      <div className="af-obw__chips" aria-label="Invited teammates">
                        {invites.map((addr) => (
                          <span key={addr} className="af-obw__chip">
                            <span>{addr}</span>
                            <button
                              type="button"
                              className="af-obw__chip-rm"
                              aria-label={`Remove ${addr}`}
                              onClick={() => setInvites((prev) => prev.filter((x) => x !== addr))}
                            >
                              <AfIcon name="x" size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {inviteError ? (
                      <p className="af-obw__hint" data-error="" role="status">
                        {inviteError}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {currentStep === 4 ? (
                <>
                  <h2 className="af-ob__panel-title">Your first agent</h2>
                  <p className="af-ob__panel-desc" id={templateGroupId}>
                    Pick a starting template — you can customize instructions and tools right after.
                  </p>
                  <div className="af-ob__templates" role="radiogroup" aria-labelledby={templateGroupId}>
                    {AGENT_TEMPLATES.map((tpl, idx) => {
                      const checked = template === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          ref={(el) => {
                            tplRefs.current[idx] = el;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          tabIndex={checked ? 0 : -1}
                          className="af-ob__tpl"
                          onClick={() => setTemplate(tpl.id)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                              e.preventDefault();
                              const next = (idx + 1) % AGENT_TEMPLATES.length;
                              setTemplate(AGENT_TEMPLATES[next]!.id);
                              tplRefs.current[next]?.focus();
                            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                              e.preventDefault();
                              const prev = (idx - 1 + AGENT_TEMPLATES.length) % AGENT_TEMPLATES.length;
                              setTemplate(AGENT_TEMPLATES[prev]!.id);
                              tplRefs.current[prev]?.focus();
                            }
                          }}
                        >
                          <strong>{tpl.title}</strong>
                          <span>{tpl.summary}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              <div className="af-ob__foot">
                <button type="button" className="af-ob__skip-btn" onClick={() => advanceStep(false)}>
                  Skip for now
                </button>
                <div className="af-ob__foot-right">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      className="af-ob__back-btn"
                      onClick={() => setCurrentStep((currentStep - 1) as AfOnboardingStep)}
                    >
                      <AfIcon name="chevronLeft" size={11} />
                      <span>Back</span>
                    </button>
                  ) : null}
                  <button type="submit" className="af-ob__primary-btn">
                    <span>{currentStep === 4 ? "Create agent" : "Continue"}</span>
                    <AfIcon name="chevronRight" size={11} />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
