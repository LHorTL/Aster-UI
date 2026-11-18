import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfSwitch } from "../controls/Switch";
import { AfAvatar } from "../display/Avatar";
import { AfSkeleton } from "../display/Skeleton";
import { AfModal } from "../overlay/Modal";
import {
  AgentOpsShell,
  DEFAULT_AGENT_OPS_USER,
  MiniDailyBars,
  formatCompactCount,
  isTypingTarget,
  usePrefersReducedMotion,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type AgentSkillItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: AffectIconKey;
  tone?: string;
  source: "builtin" | "yours" | "community";
  author?: string;
  version?: string;
  installed?: boolean;
  enabled?: boolean;
  uses?: number;
  installs?: number;
  daily?: number[];
  triggers?: string[];
  steps?: string[];
  needs?: string[];
  usedIn?: { task: string; at: string }[];
};

export type AgentSkillsLabels = {
  skills?: string;
  installed?: string;
  discover?: string;
  install?: string;
  installing?: string;
  done?: string;
  runsWhen?: string;
  steps?: string;
  needs?: string;
  newSkill?: string;
  remove?: string;
};

export type AfAgentSkillsProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  skills?: AgentSkillItem[];
  defaultSelected?: string | null;
  onInstall?: (id: string) => void | Promise<unknown>;
  onToggle?: (id: string, enabled: boolean) => void;
  onRemove?: (id: string) => void;
  onCreate?: (skill: AgentSkillItem) => void;
  onSelect?: (id: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  loading?: boolean;
  empty?: boolean;
  labels?: AgentSkillsLabels;
  className?: string;
  style?: CSSProperties;
};

export const DEFAULT_AGENT_SKILLS: AgentSkillItem[] = [
  {
    id: "voice",
    name: "Brand voice",
    description: "Writes in Fieldwork's tone – short, warm, no jargon",
    category: "Writing",
    icon: "pencil",
    tone: "pink",
    source: "yours",
    version: "v1.4",
    installed: true,
    enabled: true,
    uses: 46,
    daily: [3, 1, 2, 1, 0, 2, 5, 2, 3, 2, 6, 4, 8, 7],
    triggers: [
      "“Write this in our voice”",
      "“Draft an email to a client”",
      "“Make this sound like us”",
    ],
    steps: [
      "Reads the brand guide in Drive",
      "Rewrites in short sentences, active voice",
      "Swaps jargon for plain words",
      "Checks British spelling",
    ],
    needs: ["Read files in Google Drive"],
    usedIn: [
      { task: "Weekly update", at: "40 minutes ago" },
      { task: "Onboarding emails", at: "3 hours ago" },
    ],
  },
  {
    id: "weekly-report",
    name: "Weekly report",
    description: "Turns a week of work into a one-page update",
    category: "Writing",
    icon: "file",
    tone: "blue",
    source: "builtin",
    version: "v2.1",
    installed: true,
    enabled: true,
    uses: 14,
    daily: [0, 1, 2, 1, 3, 0, 1, 2, 1, 2, 0, 1, 2, 3],
    triggers: ["“Sum up what shipped this week”", "“Prepare the Friday client update”"],
    steps: ["Collects merged PRs, closed tasks and metrics", "Groups highlights into Shipped, Next and Asks"],
    needs: ["Read repositories in GitHub", "Read channels in Slack"],
  },
  {
    id: "meeting-notes",
    name: "Meeting notes",
    description: "Notes and next steps from a call recording",
    category: "Writing",
    icon: "mic",
    tone: "teal",
    source: "builtin",
    version: "v1.8",
    installed: true,
    enabled: false,
    uses: 11,
    daily: [1, 0, 2, 1, 1, 0, 0, 2, 1, 1, 0, 1, 0, 1],
    triggers: ["“Turn this call into action items”"],
    steps: ["Extracts decisions and owners", "Posts summary in the project folder"],
    needs: ["Read events in Google Calendar", "Read files in Google Drive"],
  },
  {
    id: "deep-research",
    name: "Deep research",
    description: "Reads widely, checks sources, writes a cited brief",
    category: "Research",
    icon: "search",
    tone: "purple",
    source: "builtin",
    version: "v3.0",
    installed: true,
    enabled: true,
    uses: 19,
    daily: [2, 1, 1, 3, 2, 1, 0, 2, 3, 1, 2, 1, 2, 3],
    triggers: ["“Compare webhook retry designs across Stripe and Adyen”"],
    steps: ["Searches primary docs", "Verifies claims across at least two sources", "Writes cited markdown brief"],
    needs: ["Browse the web", "Read files in Google Drive"],
  },
  {
    id: "competitor-watch",
    name: "Competitor watch",
    description: "Spots price, product and campaign changes on rivals' sites",
    category: "Research",
    icon: "compass",
    tone: "amber",
    source: "community",
    author: "@lena",
    version: "v1.2",
    installed: true,
    enabled: true,
    uses: 7,
    daily: [0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2],
    triggers: ["“Scan Northwind's competitors for pricing changes”"],
    steps: ["Diffs pricing & changelog pages", "Summarizes material changes only"],
    needs: ["Browse the web", "Post messages in Slack"],
  },
  {
    id: "code-review",
    name: "Code review",
    description: "Reviews a pull request for bugs, tests and naming",
    category: "Engineering",
    icon: "gitPullRequest",
    tone: "green",
    source: "builtin",
    version: "v2.4",
    installed: true,
    enabled: true,
    uses: 34,
    daily: [3, 4, 2, 5, 3, 1, 0, 4, 3, 5, 2, 4, 3, 5],
    triggers: ["“Review PR #482 before merge”"],
    steps: ["Reads diff and test coverage", "Flags race conditions or schema breaks"],
    needs: ["Read pull requests in GitHub"],
  },
  {
    id: "release-notes",
    name: "Release notes",
    description: "Writes release notes people outside engineering can read",
    category: "Engineering",
    icon: "sparkle",
    tone: "amber",
    source: "yours",
    version: "v1.1",
    installed: true,
    enabled: false,
    uses: 6,
    daily: [0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    triggers: ["“Draft changelog from v2.14 commits”"],
    steps: ["Filters internal refactors", "Translates user-facing improvements into plain words"],
    needs: ["Read commits in GitHub", "Read files in Google Drive"],
  },
  {
    id: "sheet-analysis",
    name: "Spreadsheet analysis",
    description: "Cleans a sheet, finds the trend and says it in a sentence",
    category: "Data",
    icon: "kanban",
    tone: "green",
    source: "builtin",
    version: "v2.0",
    installed: true,
    enabled: true,
    uses: 15,
    daily: [1, 2, 1, 0, 2, 1, 0, 1, 2, 2, 1, 0, 1, 1],
    triggers: ["“What moved in the Q4 revenue sheet?”"],
    steps: ["Normalizes dates and currencies", "Computes week-over-week deltas"],
    needs: ["Read files in Google Drive", "Read payments in Stripe"],
  },
  {
    id: "chart-maker",
    name: "Chart maker",
    description: "Picks the right chart for the numbers and draws it",
    category: "Data",
    icon: "chart",
    tone: "purple",
    source: "community",
    author: "@mika",
    version: "v1.5",
    installed: true,
    enabled: true,
    uses: 9,
    daily: [0, 1, 1, 0, 1, 2, 0, 0, 1, 1, 0, 1, 0, 1],
    triggers: ["“Plot MRR vs churn over the last 90 days”"],
    steps: ["Selects line, bar or breakdown view", "Exports crisp vector chart"],
    needs: ["Read files in Google Drive"],
  },
  // Discover (6)
  {
    id: "pdf-forms",
    name: "PDF forms",
    description: "Reads and fills in PDF forms from your documents",
    category: "Documents",
    icon: "file",
    tone: "teal",
    source: "community",
    author: "@sam",
    version: "v1.3",
    installed: false,
    installs: 8400,
    daily: [1, 1, 2, 1, 2, 1, 0, 2, 1, 2, 1, 2, 1, 2],
    triggers: ["“Fill out the vendor onboarding PDF”"],
    steps: ["Detects form fields", "Maps company facts and asks before signing"],
    needs: ["Read files in Google Drive"],
  },
  {
    id: "translate",
    name: "Translate & localize",
    description: "Translates and adapts copy for each market",
    category: "Writing",
    icon: "translate",
    tone: "blue",
    source: "builtin",
    version: "v2.2",
    installed: false,
    installs: 12900,
    daily: [2, 2, 3, 2, 4, 2, 1, 3, 2, 3, 2, 3, 2, 4],
    triggers: ["“Localize the pricing FAQ into German and French”"],
    steps: ["Preserves product terms and placeholders", "Adapts currency and date conventions"],
    needs: ["Read files in Google Drive"],
  },
  {
    id: "slide-deck",
    name: "Slide deck",
    description: "Turns a brief into a short, clean deck",
    category: "Documents",
    icon: "layers",
    tone: "purple",
    source: "builtin",
    version: "v1.9",
    installed: false,
    installs: 10300,
    daily: [1, 2, 1, 2, 3, 1, 0, 2, 2, 1, 2, 2, 1, 3],
    triggers: ["“Make a 6-slide board deck from this brief”"],
    steps: ["Outlines one takeaway per slide", "Applies brand typography and exports"],
    needs: ["Read files in Google Drive"],
  },
  {
    id: "invoice-extract",
    name: "Invoice extraction",
    description: "Pulls amounts, dates and vendors out of invoices",
    category: "Data",
    icon: "receipt",
    tone: "amber",
    source: "community",
    author: "@jo",
    version: "v1.0",
    installed: false,
    installs: 3400,
    triggers: ["“Extract line items from November PDFs”"],
    steps: ["Parses vendor, VAT and due date", "Flags duplicates against Stripe"],
    needs: ["Read emails in Gmail", "Read payments in Stripe"],
  },
  {
    id: "interview-synth",
    name: "Interview synthesis",
    description: "Finds the patterns across customer interviews",
    category: "Research",
    icon: "users",
    tone: "pink",
    source: "community",
    author: "@nora",
    version: "v1.4",
    installed: false,
    installs: 2000,
    triggers: ["“What came up most across these 8 transcripts?”"],
    steps: ["Clusters recurring pains with verbatim quotes", "Links every quote back to its call"],
    needs: ["Read files in Google Drive"],
  },
  {
    id: "notes-tasks",
    name: "Notes to tasks",
    description: "Turns any notes into tasks with owners and dates",
    category: "Writing",
    icon: "task",
    tone: "green",
    source: "builtin",
    version: "v1.6",
    installed: false,
    installs: 7600,
    triggers: ["“Create Linear tasks from today's standup notes”"],
    steps: ["Extracts concrete deliverables", "Drafts tasks with owners and due dates"],
    needs: ["Read messages in Slack"],
  },
];

const CATEGORY_ORDER = ["All", "Writing", "Research", "Engineering", "Data", "Documents"];

function sourceTagText(s: AgentSkillItem): string {
  if (s.source === "yours") return "Yours";
  if (s.source === "community") return s.author ?? "Community";
  return "Built-in";
}

function toneCssVar(tone?: string): string {
  if (tone === "pink") return "var(--af-series-2)";
  if (tone === "purple") return "var(--af-series-3)";
  if (tone === "teal") return "var(--af-series-4)";
  if (tone === "amber") return "var(--af-warning)";
  if (tone === "green") return "var(--af-success)";
  return "var(--af-accent)";
}

type InstallState = { phase: "filling" | "check"; progress: number };
type NewSkillWay = "describe" | "write" | "upload" | "browse";

/**
 * Agent / Skills (`/screens/agent-skills`):
 * Installed skill cards with switches + Discover catalog with 1.4s progress-ring installation,
 * blur-in blue-glow landing, 14-day bar chart inspector, and 4-way `New skill` modal.
 */
export function AfAgentSkills(props: AfAgentSkillsProps = {}) {
  const {
    skills: skillsProp,
    defaultSelected = "voice",
    onInstall,
    onToggle,
    onRemove,
    onCreate,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 5,
    loading = false,
    empty = false,
    labels,
    className,
    style,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const [items, setItems] = useState<AgentSkillItem[]>(() => skillsProp ?? DEFAULT_AGENT_SKILLS);
  useEffect(() => {
    if (skillsProp) setItems(skillsProp);
  }, [skillsProp]);

  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultSelected !== null);
  const [installing, setInstalling] = useState<Record<string, InstallState>>({});
  const [landedId, setLandedId] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("");

  // New skill modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [way, setWay] = useState<NewSkillWay>("describe");
  const [describePrompt, setDescribePrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftCat] = useState("Writing");
  const [draftSteps, setDraftSteps] = useState("Reads context\nDrafts output\nAsks before external changes");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const discoverRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mountedRef = useRef(true);
  const installRafsRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    const rafs = installRafsRef.current;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      rafs.forEach((id) => window.cancelAnimationFrame(id));
      rafs.clear();
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const copy = {
    skills: labels?.skills ?? "Skills",
    installed: labels?.installed ?? "Installed",
    discover: labels?.discover ?? "Discover",
    install: labels?.install ?? "Install",
    installing: labels?.installing ?? "Installing",
    done: labels?.done ?? "Installed",
    runsWhen: labels?.runsWhen ?? "Steps in when you say",
    steps: labels?.steps ?? "What it does",
    needs: labels?.needs ?? "What it needs",
    newSkill: labels?.newSkill ?? "New skill",
    remove: labels?.remove ?? "Remove",
  };

  const categories = useMemo(() => {
    const set = new Set<string>(CATEGORY_ORDER);
    for (const s of items) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    if (empty) return [];
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [category, empty, items, query]);

  const installedList = useMemo(() => filtered.filter((s) => s.installed), [filtered]);
  const discoverList = useMemo(() => filtered.filter((s) => !s.installed), [filtered]);
  const orderedIds = useMemo(
    () => [...installedList.map((s) => s.id), ...discoverList.map((s) => s.id)],
    [discoverList, installedList],
  );

  const selectedSkill = useMemo(
    () => (empty ? null : items.find((s) => s.id === selectedId) ?? null),
    [empty, items, selectedId],
  );

  const handleToggleSkill = useCallback(
    (id: string, nextEnabled: boolean) => {
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: nextEnabled } : s)));
      const sk = items.find((s) => s.id === id);
      setLiveMsg(`${sk?.name ?? "Skill"}: ${nextEnabled ? "On" : "Off"}`);
      onToggle?.(id, nextEnabled);
    },
    [items, onToggle],
  );

  const handleInstallSkill = useCallback(
    (skill: AgentSkillItem) => {
      if (installing[skill.id] || skill.installed) return;
      setLiveMsg(`${copy.installing} ${skill.name}`);

      let maybePromise: Promise<unknown>;
      try {
        maybePromise = Promise.resolve(onInstall?.(skill.id));
      } catch (err) {
        maybePromise = Promise.reject(err);
      }

      const abortInstall = () => {
        const activeRaf = installRafsRef.current.get(skill.id);
        if (activeRaf !== undefined) {
          window.cancelAnimationFrame(activeRaf);
          installRafsRef.current.delete(skill.id);
        }
        if (!mountedRef.current) return;
        setInstalling((prev) => {
          if (!(skill.id in prev)) return prev;
          const next = { ...prev };
          delete next[skill.id];
          return next;
        });
        setLiveMsg(`Failed to install ${skill.name}`);
      };

      const finalize = () => {
        if (!mountedRef.current) return;
        setInstalling((prev) => {
          const next = { ...prev };
          delete next[skill.id];
          return next;
        });
        setItems((prev) =>
          prev.map((s) =>
            s.id === skill.id ? { ...s, installed: true, enabled: true, uses: s.uses ?? 0 } : s,
          ),
        );
        setSelectedId(skill.id);
        setPanelOpen(true);
        setLiveMsg(`${skill.name}: ${copy.done}`);
        if (!reducedMotion) {
          setLandedId(skill.id);
          const scrollKey = `${skill.id}:scroll`;
          const scrollRaf = window.requestAnimationFrame(() => {
            installRafsRef.current.delete(scrollKey);
            if (mountedRef.current) {
              cardRefs.current[skill.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          });
          installRafsRef.current.set(scrollKey, scrollRaf);
          scheduleTimeout(() => setLandedId((cur) => (cur === skill.id ? null : cur)), 1300);
        }
      };

      if (reducedMotion) {
        maybePromise.then(
          () => finalize(),
          () => abortInstall(),
        );
        return;
      }

      setInstalling((prev) => ({ ...prev, [skill.id]: { phase: "filling", progress: 8 } }));
      const start = performance.now();
      const minMs = 1400;
      let settled = false;
      let failed = false;
      maybePromise.then(
        () => {
          settled = true;
        },
        () => {
          failed = true;
          settled = true;
          abortInstall();
        },
      );

      const step = (now: number) => {
        installRafsRef.current.delete(skill.id);
        if (!mountedRef.current || failed) return;
        const elapsed = now - start;
        const pct = Math.min(settled ? 100 : 92, Math.round((elapsed / minMs) * 100));
        if (elapsed < minMs || !settled) {
          setInstalling((prev) => ({ ...prev, [skill.id]: { phase: "filling", progress: pct } }));
          const rafId = window.requestAnimationFrame(step);
          installRafsRef.current.set(skill.id, rafId);
        } else {
          setInstalling((prev) => ({ ...prev, [skill.id]: { phase: "check", progress: 100 } }));
          scheduleTimeout(finalize, 280);
        }
      };
      const initialRaf = window.requestAnimationFrame(step);
      installRafsRef.current.set(skill.id, initialRaf);
    },
    [copy.done, copy.installing, installing, onInstall, reducedMotion, scheduleTimeout],
  );

  const handleRemoveSkill = useCallback(
    (skill: AgentSkillItem) => {
      if (skill.source === "builtin") return;
      setItems((prev) => prev.map((s) => (s.id === skill.id ? { ...s, installed: false, enabled: false } : s)));
      setLiveMsg(`Removed ${skill.name}`);
      onRemove?.(skill.id);
    },
    [onRemove],
  );

  const runDescribeDraft = () => {
    if (!describePrompt.trim()) return;
    setDrafting(true);
    scheduleTimeout(
      () => {
        const clean = describePrompt.trim();
        const words = clean.split(/\s+/).slice(0, 3).join(" ");
        setDraftName(words.charAt(0).toUpperCase() + words.slice(1));
        setDraftDesc(clean);
        setDraftSteps("Reads relevant context\nApplies your instructions step by step\nChecks permissions before acting");
        setDrafting(false);
        setWay("write");
      },
      reducedMotion ? 0 : 750,
    );
  };

  const commitNewSkill = () => {
    const title = (draftName.trim() || describePrompt.trim().slice(0, 28) || "Custom skill").trim();
    const created: AgentSkillItem = {
      id: `skill-${Date.now()}`,
      name: title,
      description: draftDesc.trim() || describePrompt.trim() || "Custom workflow skill",
      category: draftCat || "Writing",
      icon: "sparkle",
      tone: "pink",
      source: "yours",
      version: "v1.0",
      installed: true,
      enabled: true,
      uses: 0,
      daily: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      triggers: [`“Use ${title}”`],
      steps: draftSteps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      needs: ["Read files in Google Drive"],
    };
    setItems((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setPanelOpen(true);
    setModalOpen(false);
    setDescribePrompt("");
    setDraftName("");
    setDraftDesc("");
    if (!reducedMotion) {
      setLandedId(created.id);
      window.setTimeout(() => setLandedId((cur) => (cur === created.id ? null : cur)), 1300);
    }
    setLiveMsg(`${created.name}: Created`);
    onCreate?.(created);
  };

  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target) || modalOpen) return;
    if (e.key === "/") {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    if (["j", "J", "k", "K", "ArrowDown", "ArrowUp"].includes(e.key) && orderedIds.length > 0) {
      e.preventDefault();
      const delta = e.key === "j" || e.key === "J" || e.key === "ArrowDown" ? 1 : -1;
      const idx = orderedIds.indexOf(selectedId ?? "");
      const nextId = orderedIds[(idx + delta + orderedIds.length) % orderedIds.length]!;
      setSelectedId(nextId);
      setPanelOpen(true);
      onSelect?.(nextId);
      cardRefs.current[nextId]?.focus();
    }
  };

  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="af-aops-inspector">
          <AfSkeleton lines={3} />
          <AfSkeleton variant="rect" height={72} radius={8} />
          <AfSkeleton lines={4} />
        </div>
      );
    }

    if (!selectedSkill) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="sparkle" size={18} />
          <span>Select a skill to see its 14-day runs, triggers, steps and required permissions.</span>
        </div>
      );
    }

    const daily = selectedSkill.daily ?? [1, 0, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2];
    const isEnabled = selectedSkill.enabled !== false;

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-inspector__head">
          <span className="af-aops-skill-glyph af-aops-skill-glyph--lg" data-tone={selectedSkill.tone ?? "blue"}>
            <AfIcon name={selectedSkill.icon ?? "sparkle"} size={15} />
          </span>
          <div className="af-aops-inspector__titles">
            <h3 className="af-aops-inspector__title">{selectedSkill.name}</h3>
            <div className="af-aops-inspector__sub">
              <span>{sourceTagText(selectedSkill)}</span>
              {selectedSkill.version ? <span> · {selectedSkill.version}</span> : null}
            </div>
          </div>
        </div>

        <p className="af-aops-inspector__desc">{selectedSkill.description}</p>

        <div className="af-aops-inspector__actions">
          {selectedSkill.installed ? (
            <>
              <button
                type="button"
                className="af-aops-skill-toggle-btn"
                data-on={isEnabled ? "true" : undefined}
                aria-label={`Enable ${selectedSkill.name}`}
                onClick={() => handleToggleSkill(selectedSkill.id, !isEnabled)}
              >
                <span className="af-aops-skill-toggle-btn__dot" aria-hidden="true" />
                <span>{isEnabled ? "Turn off" : "Turn on"}</span>
              </button>
              {selectedSkill.source !== "builtin" ? (
                <button
                  type="button"
                  className="af-aops-skill-remove-btn"
                  onClick={() => handleRemoveSkill(selectedSkill)}
                >
                  <AfIcon name="trash" size={12} />
                  <span>{copy.remove}</span>
                </button>
              ) : null}
            </>
          ) : (
            <AfButton variant="primary" size="sm" onClick={() => handleInstallSkill(selectedSkill)}>
              {copy.install}
            </AfButton>
          )}
        </div>

        <section className="af-aops-sec">
          <div className="af-aops-sec__head">
            <span className="af-aops-sec__title">Runs</span>
            <span className="af-aops-faint af-aops-tabular">
              {selectedSkill.uses !== undefined
                ? `${selectedSkill.uses}× this week`
                : `${daily.reduce((a, b) => a + b, 0)} runs`}
            </span>
          </div>
          <div className="af-aops-runs-plot">
            <div className="af-aops-runs-plot__y af-aops-tabular" aria-hidden="true">
              <span>10</span>
              <span>5</span>
              <span>0</span>
            </div>
            <div className="af-aops-runs-plot__main">
              <MiniDailyBars
                values={daily}
                color={`color-mix(in srgb, ${toneCssVar(selectedSkill.tone)} 72%, var(--af-page-faint))`}
                bare
                height={52}
                animateKey={selectedSkill.id}
                formatTip={(v, idx) => `Day ${idx + 1}: ${v} runs`}
              />
              <div className="af-aops-runs-plot__x" aria-hidden="true">
                <span>2 weeks ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </section>

        {selectedSkill.triggers && selectedSkill.triggers.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">{copy.runsWhen}</div>
            <div className="af-aops-sunken-list">
              {selectedSkill.triggers.map((t, idx) => (
                <div key={idx} className="af-aops-sunken-quote">
                  {t}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedSkill.steps && selectedSkill.steps.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">{copy.steps}</div>
            <ol className="af-aops-sunken-list af-aops-step-ol">
              {selectedSkill.steps.map((st, idx) => (
                <li key={idx}>
                  <span className="af-aops-step-ol__num af-aops-tabular">{idx + 1}</span>
                  <span>{st}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {selectedSkill.needs && selectedSkill.needs.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">{copy.needs}</div>
            <div className="af-aops-needs-flat">
              {selectedSkill.needs.map((needText) => (
                <div key={needText} className="af-aops-need-line">
                  <span className="af-aops-need-line__left">
                    <span className="af-aops-need-circle" aria-hidden="true" />
                    <span>{needText}</span>
                  </span>
                  <button
                    type="button"
                    className="af-aops-inline-link"
                    onClick={() => onNavigate?.("Permissions")}
                  >
                    <span>Permissions</span>
                    <AfIcon name="chevronRight" size={11} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedSkill.usedIn && selectedSkill.usedIn.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">Ran lately</div>
            <div className="af-aops-flat-list">
              {selectedSkill.usedIn.map((u, idx) => (
                <div key={idx} className="af-aops-flat-row">
                  <span className="af-aops-flat-row__title">{u.task}</span>
                  <span className="af-aops-faint af-aops-tabular">{u.at}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const ways: { id: NewSkillWay; label: string; icon: AffectIconKey }[] = [
    { id: "describe", label: "Describe it", icon: "sparkle" },
    { id: "write", label: "Write it yourself", icon: "pencil" },
    { id: "upload", label: "Upload a file", icon: "upload" },
    { id: "browse", label: "Browse skills", icon: "compass" },
  ];

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.skills}</h1>
      </div>
      <div className="af-aops-topbar__right">
        <div className="af-aops-search af-aops-search--compact">
          <AfIcon name="search" size={13} />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown" && orderedIds[0]) {
                e.preventDefault();
                cardRefs.current[orderedIds[0]]?.focus();
              }
            }}
            placeholder="Search skills"
            aria-label="Search skills"
          />
        </div>
        <AfButton variant="secondary" size="xs" icon="plus" onClick={() => setModalOpen(true)}>
          {copy.newSkill}
        </AfButton>
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Skills"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={840}
      panelTitle="Skill"
      panelTab={selectedSkill ? selectedSkill.name : undefined}
      panelTabIcon={
        selectedSkill ? (
          <span className="af-aops-skill-tab-dot" data-tone={selectedSkill.tone ?? "blue"}>
            <AfIcon name={selectedSkill.icon ?? "sparkle"} size={11} />
          </span>
        ) : undefined
      }
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={302}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      className={className}
      style={style}
      onKeyDown={handleRootKeyDown}
      {...rest}
    >
      <div
        className="af-aops-cat-tabs"
        role="tablist"
        aria-label="Skill categories"
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const idx = categories.indexOf(category);
          const next =
            e.key === "ArrowRight"
              ? categories[(idx + 1) % categories.length]!
              : categories[(idx - 1 + categories.length) % categories.length]!;
          setCategory(next);
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            className="af-aops-cat-tab"
            data-active={category === cat ? "true" : undefined}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="af-aops-card-wrap">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="af-aops-skill-card af-aops-skill-card--skeleton">
              <AfSkeleton variant="rect" width={24} height={24} radius={6} />
              <AfSkeleton line="70%" />
              <AfSkeleton lines={2} />
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="sparkle" size={20} />
          </div>
          <h2 className="af-aops-empty__title">No skills yet</h2>
          <p className="af-aops-empty__desc">
            Describe a repeatable workflow or pick one from Discover so your agent knows how to run it.
          </p>
          <AfButton variant="primary" size="sm" icon="plus" onClick={() => setModalOpen(true)}>
            {copy.newSkill}
          </AfButton>
        </div>
      ) : (
        <div className="af-aops-group-stack">
          <section className="af-aops-sec">
            <div className="af-aops-day-head">
              <span className="af-aops-day-head__title">{copy.installed}</span>
              <span className="af-aops-day-head__count af-aops-tabular">{installedList.length}</span>
            </div>

            <div className="af-aops-card-wrap">
              {installedList.map((skill) => {
                const isSelected = selectedId === skill.id;
                const isOff = skill.enabled === false;
                const fullName = `${skill.name}: ${skill.description}, ${sourceTagText(skill)}${
                  skill.uses ? `, ${skill.uses} runs` : ""
                }${isOff ? ", off" : ""}`;

                return (
                  <div
                    key={skill.id}
                    className="af-aops-skill-card"
                    data-selected={isSelected ? "true" : undefined}
                    data-off={isOff ? "true" : undefined}
                    data-landed={landedId === skill.id ? "true" : undefined}
                  >
                    <button
                      ref={(el) => {
                        cardRefs.current[skill.id] = el;
                      }}
                      type="button"
                      className="af-aops-skill-card__hit"
                      aria-label={fullName}
                      onClick={() => {
                        setSelectedId(skill.id);
                        setPanelOpen(true);
                        onSelect?.(skill.id);
                      }}
                    >
                      <div className="af-aops-skill-card__top">
                        <span className="af-aops-skill-glyph" data-tone={isOff ? "muted" : skill.tone ?? "blue"}>
                          <AfIcon name={skill.icon ?? "sparkle"} size={13} />
                        </span>
                        <span className="af-aops-skill-card__name">{skill.name}</span>
                      </div>
                      <p className="af-aops-skill-card__desc">{skill.description}</p>
                      <div className="af-aops-skill-card__foot">
                        <span className="af-aops-skill-source">{sourceTagText(skill)}</span>
                      </div>
                    </button>

                    <div className="af-aops-skill-card__switch">
                      <AfSwitch
                        size="sm"
                        tone="accent"
                        checked={!isOff}
                        aria-label={skill.name}
                        onCheckedChange={(on) => handleToggleSkill(skill.id, on)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {discoverList.length > 0 ? (
            <section ref={discoverRef} className="af-aops-sec">
              <div className="af-aops-discover-head">
                <div className="af-aops-day-head">
                  <span className="af-aops-day-head__title">{copy.discover}</span>
                  <span className="af-aops-day-head__count af-aops-tabular">{discoverList.length}</span>
                </div>
                <div className="af-aops-discover-sub">
                  Skills others use – add one and your agent can do it right away
                </div>
              </div>

              <div className="af-aops-card-wrap">
                {discoverList.map((skill) => {
                  const inst = installing[skill.id];
                  const isSelected = selectedId === skill.id;
                  return (
                    <div
                      key={skill.id}
                      className="af-aops-skill-card af-aops-skill-card--discover"
                      data-selected={isSelected ? "true" : undefined}
                    >
                      <button
                        ref={(el) => {
                          cardRefs.current[skill.id] = el;
                        }}
                        type="button"
                        className="af-aops-skill-card__hit"
                        aria-label={`${skill.name}: ${skill.description}, ${sourceTagText(skill)}`}
                        onClick={() => {
                          setSelectedId(skill.id);
                          setPanelOpen(true);
                          onSelect?.(skill.id);
                        }}
                      >
                        <div className="af-aops-skill-card__top">
                          <span className="af-aops-skill-glyph" data-tone={skill.tone ?? "blue"}>
                            <AfIcon name={skill.icon ?? "sparkle"} size={13} />
                          </span>
                          <span className="af-aops-skill-card__name">{skill.name}</span>
                        </div>
                        <p className="af-aops-skill-card__desc">{skill.description}</p>
                        <div className="af-aops-skill-card__foot">
                          <span className="af-aops-skill-source">{sourceTagText(skill)}</span>
                          {skill.installs ? (
                            <span className="af-aops-faint af-aops-tabular">
                              {formatCompactCount(skill.installs)} use it
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div className="af-aops-skill-card__install">
                        <button
                          type="button"
                          className="af-aops-install-btn"
                          data-state={inst?.phase}
                          aria-label={`${copy.install} ${skill.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstallSkill(skill);
                          }}
                        >
                          {inst ? (
                            inst.phase === "check" ? (
                              <span className="af-aops-install-check">
                                <AfIcon name="check" size={12} />
                              </span>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                                <circle cx="10" cy="10" r="7.5" fill="none" stroke="var(--af-track)" strokeWidth="2" />
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="7.5"
                                  fill="none"
                                  stroke="var(--af-accent)"
                                  strokeWidth="2"
                                  strokeDasharray={47.1}
                                  strokeDashoffset={47.1 * (1 - inst.progress / 100)}
                                  transform="rotate(-90 10 10)"
                                />
                              </svg>
                            )
                          ) : (
                            <AfIcon name="plus" size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <AfModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contained
        width={480}
        closable
        title={copy.newSkill}
        description="Teach your agent a repeatable skill or import a SKILL.md."
        footer={
          way === "describe" ? (
            <>
              <AfButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </AfButton>
              <AfButton
                variant="primary"
                size="sm"
                loading={drafting}
                disabled={!describePrompt.trim()}
                onClick={runDescribeDraft}
              >
                Draft skill
              </AfButton>
            </>
          ) : way === "browse" ? (
            <AfButton
              variant="primary"
              size="sm"
              onClick={() => {
                setModalOpen(false);
                discoverRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Jump to Discover
            </AfButton>
          ) : (
            <>
              <AfButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </AfButton>
              <AfButton variant="primary" size="sm" onClick={commitNewSkill}>
                Create skill
              </AfButton>
            </>
          )
        }
      >
        <div
          className="af-aops-modal-stack"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (way === "describe") runDescribeDraft();
              else commitNewSkill();
            } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isTypingTarget(e.target)) {
              e.preventDefault();
              const idx = ways.findIndex((w) => w.id === way);
              const delta = e.key === "ArrowDown" ? 1 : -1;
              setWay(ways[(idx + delta + ways.length) % ways.length]!.id);
            }
          }}
        >
          <div className="af-aops-ways" role="tablist" aria-label="Ways to add a skill">
            {ways.map((w) => (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={way === w.id}
                className="af-aops-way-btn"
                data-active={way === w.id ? "true" : undefined}
                onClick={() => setWay(w.id)}
              >
                <AfIcon name={w.icon} size={14} />
                <span>{w.label}</span>
              </button>
            ))}
          </div>

          {way === "describe" ? (
            <div className="af-aops-field-stack">
              <div className="af-aops-row-cluster">
                <AfAvatar kind="agent" working={drafting} seed="skill-author" size={26} />
                <span className="af-aops-faint">
                  {drafting ? "Writing name, triggers and steps…" : "Describe what it should do in plain words"}
                </span>
              </div>
              <textarea
                className="af-aops-mem-editor"
                rows={4}
                placeholder="e.g. Every time a customer asks about SOC2 or GDPR, pull answers from our Security folder and cite the section…"
                value={describePrompt}
                onChange={(e) => setDescribePrompt(e.target.value)}
              />
            </div>
          ) : way === "write" ? (
            <div className="af-aops-field-stack">
              <label className="af-aops-form-label">
                <span>Name</span>
                <input
                  type="text"
                  className="af-aops-text-input"
                  placeholder="Security questionnaire"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </label>
              <label className="af-aops-form-label">
                <span>What it does</span>
                <input
                  type="text"
                  className="af-aops-text-input"
                  placeholder="Short one-line summary…"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                />
              </label>
              <label className="af-aops-form-label">
                <span>Steps (one per line)</span>
                <textarea
                  className="af-aops-mem-editor"
                  rows={3}
                  value={draftSteps}
                  onChange={(e) => setDraftSteps(e.target.value)}
                />
              </label>
            </div>
          ) : way === "upload" ? (
            <label className="af-aops-drop-box">
              <AfIcon name="upload" size={18} />
              <span>Drop a SKILL.md file or click to read it</span>
              <input
                type="file"
                accept=".md,.txt"
                className="af-sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const base = file.name.replace(/\.[^.]+$/, "");
                  setDraftName(base === "SKILL" ? "Imported skill" : base);
                  const reader = new FileReader();
                  reader.onload = () => {
                    const txt = String(reader.result ?? "").trim();
                    setDraftDesc(txt.split("\n")[0]?.replace(/^#+\s*/, "") || "Imported from SKILL.md");
                    setWay("write");
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          ) : (
            <div className="af-aops-status-note" data-tone="muted">
              <AfIcon name="compass" size={15} />
              <span>{discoverList.length} community and built-in skills ready to install below.</span>
            </div>
          )}
        </div>
      </AfModal>
    </AgentOpsShell>
  );
}
