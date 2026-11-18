import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn, useControllableState } from "../../primitives";

export type StreamMessageKind =
  | "ask"
  | "reply"
  | "handoff"
  | "share"
  | "question"
  | "spawn";

export interface StreamAgent {
  id: string;
  name: string;
  model?: string;
  avatar?: ReactNode;
}

export interface StreamAttachment {
  label: string;
  kind?: "file" | "table" | "folder" | "code";
  preview?: string;
  meta?: string;
}

export interface StreamDetailItem {
  label: string;
  detail?: string;
  icon?: ReactNode;
}

export type StreamDetail = string;

export interface StreamDetails {
  facts?: Array<{ label: string; value: string }>;
  items?: string[];
  entries?: StreamDetailItem[];
}

export interface StreamMessage {
  id: string;
  from: string;
  to: string;
  kind: StreamMessageKind;
  text: string;
  at?: string;
  replyTo?: string;
  typing?: boolean;
  attachments?: StreamAttachment[];
  details?: StreamDetails;
  /** Legacy payload alias. */
  payload?: string;
}

/** Legacy message type alias. */
export type CollabMessage = StreamMessage;

export interface AfCollaborationStreamProps {
  /** Agents in the run — each gets its own pixel mark and color in this order. */
  agents?: StreamAgent[];
  /** Messages in the order they were sent. */
  messages?: StreamMessage[];
  /** What the run is about — part of the stream's accessible label. */
  task?: string;
  /** Live run indicator and auto-follow behavior. */
  live?: boolean;
  /** Controlled id of the picked message — its details open, the rest fades. */
  selected?: string | null;
  /** Called when a message is picked or cleared. */
  onSelectedChange?: (id: string | null) => void;
  /** Controlled id of the focused agent tab on top. */
  focusAgent?: string | null;
  /** Called when an agent tab is picked. */
  onFocusAgentChange?: (id: string | null) => void;
  /** Sends a message from the composer; `to` holds named @ agents or `["all"]`. */
  onSend?: (payload: { text: string; to: string[]; replyTo?: string }) => void;
  /** Legacy broadcast callback. */
  onBroadcast?: (text: string) => void;
  /** Composer placeholder. */
  placeholder?: string;
  /** Names that receive inline micro-logos in message text, e.g. `{ Notion: <NotionLogo /> }`. */
  logos?: Record<string, ReactNode>;
  /** Scroll container height in px. */
  maxHeight?: number;
  /** Accessible label for the stream. */
  title?: string;
  /** Extra class on the root. */
  className?: string;
  /** Inline style override. */
  style?: CSSProperties;
}

export type AfCollaborationStreamPatternProps = AfCollaborationStreamProps;

function NotionLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function FigmaLogo() {
  return (
    <svg viewBox="0 0 38 57" aria-hidden="true">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
    </svg>
  );
}

function SearchTileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "rgb(19, 179, 160)" }}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16 16L20 20" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function GlobeTileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "rgb(79, 176, 254)" }}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3.5 12H20.5M12 3.5C14.2 6 15.3 8.9 15.3 12C15.3 15.1 14.2 18 12 20.5C9.8 18 8.7 15.1 8.7 12C8.7 8.9 9.8 6 12 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const DEFAULT_LOGOS: Record<string, ReactNode> = {
  Notion: <NotionLogo />,
  Figma: <FigmaLogo />,
};

const AGENT_PALETTE = [
  "rgba(0, 96, 226, 0.78)",
  "rgba(166, 81, 240, 0.85)",
  "rgba(20, 179, 240, 0.8)",
  "rgba(30, 168, 108, 0.85)",
  "rgba(232, 121, 36, 0.85)",
];

const PIXEL_PATTERNS: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 0, 0, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
];

const PIXEL_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

function StreamPixelMark({
  you,
  agentIndex = 0,
  busy,
  avatar,
}: {
  you?: boolean;
  agentIndex?: number;
  busy?: boolean;
  avatar?: ReactNode;
}) {
  if (avatar) {
    return (
      <span className="af-crsc__logo" data-busy={busy || undefined} aria-hidden="true">
        {avatar}
      </span>
    );
  }
  const bits = you
    ? [1, 1, 1, 1, 1, 1, 1, 1, 1]
    : PIXEL_PATTERNS[agentIndex % PIXEL_PATTERNS.length];
  const color = you ? undefined : AGENT_PALETTE[agentIndex % AGENT_PALETTE.length];

  return (
    <span
      className="af-crsc__mark"
      data-you={you || undefined}
      data-busy={busy || undefined}
      aria-hidden="true"
      style={color ? ({ "--af-crsc-c": color } as CSSProperties) : undefined}
    >
      <span className="af-crsc__mark-grid">
        {bits.map((on, i) => (
          <i
            key={i}
            data-on={on ? "" : undefined}
            style={{ animationDelay: `${PIXEL_DELAYS[i]}ms` }}
          />
        ))}
      </span>
    </span>
  );
}

const DEFAULT_AGENTS: StreamAgent[] = [
  { id: "orch", name: "Orchestrator", model: "Opus 5.5" },
  { id: "research", name: "Researcher", model: "Gemini 3.8 Flash" },
  { id: "writer", name: "Writer", model: "Sonnet 5.5" },
];

const INITIAL_DEMO_MESSAGES: StreamMessage[] = [
  {
    id: "m1",
    from: "you",
    to: "orch",
    kind: "ask",
    at: "14:02",
    text: "Launch the new pricing page by Friday – per-seat plans, keep a free tier.",
  },
  {
    id: "m2",
    from: "orch",
    to: "research",
    kind: "spawn",
    at: "14:02",
    text: "Find out what Linear, Notion and Figma charge per seat, and what their free tiers allow.",
  },
  {
    id: "m3",
    from: "orch",
    to: "writer",
    kind: "spawn",
    at: "14:02",
    text: "Draft the copy for Free, Pro and Team – short, one line per plan.",
  },
  {
    id: "m4",
    from: "research",
    to: "orch",
    kind: "share",
    at: "14:04",
    replyTo: "m2",
    text: "Linear $10, Notion $12, Figma $15 per seat. All three keep a free tier.",
    attachments: [
      {
        label: "web_search ×6",
        kind: "code",
        meta: "Researcher · 6 queries · 1.8s",
        preview:
          '1. "Linear pricing per seat 2026"\n2. "Notion Plus Business seat pricing"\n3. "Figma Professional per editor price"\n4. "Linear free tier issue limit"\n5. "Notion free tier guest cap"\n6. "Figma Starter free plan limits"',
      },
      {
        label: "pricing-table.csv",
        kind: "table",
        meta: "Researcher · 3 rows",
        preview:
          "Product,Per seat,Free tier,Guest cap\nLinear,$10 / mo,250 issues,Unlimited viewers\nNotion,$12 / mo,1,000 blocks,10 guests\nFigma,$15 / mo,3 files,Unlimited viewers",
      },
    ],
    details: {
      facts: [
        { label: "Model", value: "Gemini 3.8 Flash" },
        { label: "Tokens", value: "41.2k" },
        { label: "Cost", value: "$0.02" },
        { label: "Took", value: "1m 48s" },
      ],
      entries: [
        {
          label: "web_search",
          detail: "6 searches – per-seat pricing 2026",
          icon: <SearchTileIcon />,
        },
        {
          label: "notion.com/pricing",
          detail: "Plus $12 · Business $18 per seat",
          icon: <NotionLogo />,
        },
        {
          label: "figma.com/pricing",
          detail: "Professional $15 per editor",
          icon: <FigmaLogo />,
        },
        {
          label: "linear.app/pricing",
          detail: "Basic $10 per user",
          icon: <GlobeTileIcon />,
        },
      ],
    },
  },
  {
    id: "m5",
    from: "writer",
    to: "research",
    kind: "question",
    at: "14:04",
    replyTo: "m3",
    typing: true,
    text: "Do any of them cap seats on the free tier? I'd like to say ours doesn't.",
    details: {
      facts: [
        { label: "Model", value: "Sonnet 5.5" },
        { label: "Tokens", value: "14.8k" },
        { label: "Cost", value: "$0.01" },
        { label: "Took", value: "24s" },
      ],
    },
  },
];

const STREAM_FOLLOWUPS: StreamMessage[] = [
  {
    id: "m6",
    from: "research",
    to: "writer",
    kind: "reply",
    at: "14:05",
    replyTo: "m5",
    text: "None cap seats – Notion limits guests to 10, Linear caps issues at 250.",
    details: {
      facts: [
        { label: "Model", value: "Gemini 3.8 Flash" },
        { label: "Tokens", value: "8.4k" },
        { label: "Cost", value: "$0.004" },
      ],
    },
  },
  {
    id: "m7",
    from: "writer",
    to: "orch",
    kind: "handoff",
    at: "14:06",
    replyTo: "m3",
    text: 'Copy for the three plans is ready in Notion – Free says "no seat limit".',
    details: {
      facts: [
        { label: "Model", value: "Sonnet 5.5" },
        { label: "Tokens", value: "22.1k" },
        { label: "Cost", value: "$0.02" },
      ],
    },
  },
];

function inferAttachmentKind(att: StreamAttachment): "file" | "table" | "folder" | "code" {
  if (att.kind) return att.kind;
  if (att.label.endsWith("/")) return "folder";
  if (att.label.endsWith(".csv")) return "table";
  if (att.label.includes("×") || /\.(ts|tsx|js|json|py|sh)$/.test(att.label)) return "code";
  return "file";
}

function AttachmentIcon({ kind }: { kind: "file" | "table" | "folder" | "code" }) {
  if (kind === "code") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M3.8 3.6 1.6 6l2.2 2.4M8.2 3.6 10.4 6 8.2 8.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.9 2.8 5.1 9.2"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    );
  }
  if (kind === "table") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M3.3 1h3.9L10 3.8v6.4c0 .72-.58 1.3-1.3 1.3H3.3c-.72 0-1.3-.58-1.3-1.3V2.3C2 1.58 2.58 1 3.3 1Z"
          fill="currentColor"
          opacity="0.45"
        />
        <path d="M7.2 1v1.8c0 .55.45 1 1 1H10Z" fill="currentColor" />
        <rect x="3.4" y="5.6" width="2.3" height="1.6" rx="0.4" fill="currentColor" />
        <rect x="6.3" y="5.6" width="2.3" height="1.6" rx="0.4" fill="currentColor" />
        <rect x="3.4" y="7.8" width="2.3" height="1.6" rx="0.4" fill="currentColor" />
        <rect x="6.3" y="7.8" width="2.3" height="1.6" rx="0.4" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "folder") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M1.5 3C1.5 2.45 1.95 2 2.5 2H4.8L5.8 3.2H9.5C10.05 3.2 10.5 3.65 10.5 4.2V9C10.5 9.55 10.05 10 9.5 10H2.5C1.95 10 1.5 9.55 1.5 9V3Z"
          fill="currentColor"
          opacity="0.65"
        />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3.3 1h3.9L10 3.8v6.4c0 .72-.58 1.3-1.3 1.3H3.3c-.72 0-1.3-.58-1.3-1.3V2.3C2 1.58 2.58 1 3.3 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function renderTextWithLogos(text: string, logos: Record<string, ReactNode>): ReactNode {
  const keys = Object.keys(logos).filter(Boolean);
  if (keys.length === 0) return text;
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "g");
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    const logo = logos[part];
    if (logo) {
      return (
        <span key={idx} className="af-crsc__co">
          <span className="af-crsc__co-logo" aria-hidden="true">
            {logo}
          </span>
          {part}
        </span>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

/**
 * Collaboration Stream — real-time multi-agent conversation stream with agent focus tabs, reply quotes, inline brand logos, attachment preview modal, details popover, and @ mention composer.
 */
export function AfCollaborationStream({
  agents = DEFAULT_AGENTS,
  messages: controlledMessages,
  task = "Launch the new pricing page",
  live = true,
  selected: selectedProp,
  onSelectedChange,
  focusAgent: focusAgentProp,
  onFocusAgentChange,
  onSend,
  onBroadcast,
  placeholder = "Message the agents – @ to name one",
  logos,
  maxHeight = 500,
  title = "Agent chat",
  className,
  style,
}: AfCollaborationStreamProps = {}) {
  const mergedLogos = useMemo(() => ({ ...DEFAULT_LOGOS, ...logos }), [logos]);

  const [internalMessages, setInternalMessages] = useState<StreamMessage[]>(
    controlledMessages ?? INITIAL_DEMO_MESSAGES,
  );
  const messages = controlledMessages ?? internalMessages;

  const [selectedId, setSelectedId] = useControllableState<string | null>({
    value: selectedProp,
    defaultValue: null,
    onChange: onSelectedChange,
  });

  const [focusAgent, setFocusAgent] = useControllableState<string | null>({
    value: focusAgentProp,
    defaultValue: null,
    onChange: onFocusAgentChange,
  });

  const [draft, setDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [previewState, setPreviewState] = useState<{
    att: StreamAttachment;
    senderName: string;
    senderIdx: number;
  } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Live specimen progression when uncontrolled
  useEffect(() => {
    if (controlledMessages || !live) return;
    const t1 = window.setTimeout(() => {
      setInternalMessages((prev) =>
        prev.map((m) => (m.id === "m5" ? { ...m, typing: false } : m)),
      );
    }, 1900);
    const t2 = window.setTimeout(() => {
      setInternalMessages((prev) =>
        prev.some((m) => m.id === "m6") ? prev : [...prev, STREAM_FOLLOWUPS[0]],
      );
    }, 3400);
    const t3 = window.setTimeout(() => {
      setInternalMessages((prev) =>
        prev.some((m) => m.id === "m7") ? prev : [...prev, STREAM_FOLLOWUPS[1]],
      );
    }, 5200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [controlledMessages, live]);

  // Auto-follow bottom on new messages unless user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !live) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, live]);

  const agentIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    agents.forEach((a, idx) => map.set(a.id, idx));
    return map;
  }, [agents]);

  const agentMap = useMemo(() => {
    const map = new Map<string, StreamAgent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const answeredQuestionIds = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.from === "you" && m.replyTo) set.add(m.replyTo);
    });
    return set;
  }, [messages]);

  const visibleAgentTabs = useMemo(() => {
    const activeIds = new Set<string>();
    messages.forEach((m) => {
      if (m.kind !== "spawn" && m.from !== "you") activeIds.add(m.from);
    });
    const spoken = agents.filter((a) => activeIds.has(a.id));
    return spoken.length > 0 ? spoken : agents;
  }, [agents, messages]);

  const filteredMentions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    );
  }, [agents, mentionQuery]);

  const resolveName = (id: string) => {
    if (id === "you") return "You";
    if (id === "all" || id === "everyone") return "everyone";
    return agentMap.get(id)?.name ?? id;
  };

  const namedRecipients = useMemo(() => {
    const lower = draft.toLowerCase();
    return agents.filter(
      (a) =>
        lower.includes(`@${a.name.toLowerCase()}`) ||
        lower.includes(`@${a.id.toLowerCase()}`),
    );
  }, [agents, draft]);

  const insertMention = (agent: StreamAgent) => {
    const replaced = draft.replace(/@[\w-]*$/, `@${agent.name} `);
    const nextText =
      replaced === draft
        ? `${draft}${draft.endsWith(" ") || !draft ? "" : " "}@${agent.name} `
        : replaced;
    setDraft(nextText);
    setMentionOpen(false);
    setMentionQuery("");
    fieldRef.current?.focus();
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const replyMsg = replyTargetId
      ? messages.find((m) => m.id === replyTargetId)
      : undefined;
    const recipients =
      namedRecipients.length > 0
        ? namedRecipients.map((a) => a.id)
        : replyMsg
          ? [replyMsg.from]
          : focusAgent && focusAgent !== "you"
            ? [focusAgent]
            : ["all"];

    const now = new Date();
    const atStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    const nextMsg: StreamMessage = {
      id: `m-${Date.now()}`,
      from: "you",
      to: recipients[0] ?? "all",
      kind: replyTargetId ? "reply" : "ask",
      text,
      at: atStr,
      replyTo: replyTargetId ?? undefined,
    };

    if (!controlledMessages) {
      setInternalMessages((prev) => [...prev, nextMsg]);
    }
    onSend?.({ text, to: recipients, replyTo: replyTargetId ?? undefined });
    onBroadcast?.(text);
    setDraft("");
    setReplyTargetId(null);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const jumpToMessage = (id: string) => {
    const el = msgRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1400);
  };

  const isPicking = Boolean(focusAgent || selectedId);
  const replyDraftTarget = replyTargetId
    ? messages.find((m) => m.id === replyTargetId)
    : undefined;

  return (
    <div
      className={cn("af-crsc", className)}
      data-picking={isPicking || undefined}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (previewState) {
            setPreviewState(null);
          } else if (mentionOpen) {
            setMentionOpen(false);
          } else if (replyTargetId) {
            setReplyTargetId(null);
          } else if (selectedId) {
            setSelectedId(null);
          } else if (focusAgent) {
            setFocusAgent(null);
          }
        }
      }}
    >
      {/* Top toolbar + Live indicator */}
      <div className="af-crsc__top">
        <div
          className="af-crsc__tabs"
          role="toolbar"
          aria-label={`${title}${task ? `: ${task}` : ""} – show messages of`}
        >
          <button
            type="button"
            className="af-crsc__tab"
            aria-pressed={focusAgent === null}
            onClick={() => setFocusAgent(null)}
          >
            Everyone
          </button>

          <button
            type="button"
            className="af-crsc__tab"
            aria-pressed={focusAgent === "you"}
            title="You"
            onClick={() => setFocusAgent(focusAgent === "you" ? null : "you")}
          >
            <StreamPixelMark you />
            <span className="af-crsc__tab-name" dir="auto">
              You
            </span>
          </button>

          {visibleAgentTabs.map((agent) => {
            const idx = agentIndexMap.get(agent.id) ?? 0;
            const pressed = focusAgent === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                className="af-crsc__tab"
                aria-pressed={pressed}
                title={agent.model ? `${agent.name} · ${agent.model}` : agent.name}
                onClick={() => setFocusAgent(pressed ? null : agent.id)}
              >
                <StreamPixelMark agentIndex={idx} avatar={agent.avatar} />
                <span className="af-crsc__tab-name" dir="auto">
                  {agent.name}
                </span>
              </button>
            );
          })}
        </div>

        {live ? (
          <span className="af-crsc__live">
            <span className="af-crsc__pulse" aria-hidden="true" />
            Live
          </span>
        ) : null}
      </div>

      {/* Stream panel + attachment preview overlay */}
      <div className="af-crsc__panel">
        <div
          ref={scrollRef}
          className="af-crsc__scroll"
          style={{ height: maxHeight }}
          onClick={(e) => {
            if (e.target === e.currentTarget && selectedId) {
              setSelectedId(null);
            }
          }}
        >
          <div
            className="af-crsc__stream"
            role="log"
            aria-label={title}
            aria-live={live ? "polite" : "off"}
          >
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
              const isFromYou = msg.from === "you";
              const senderIdx = agentIndexMap.get(msg.from) ?? 0;
              const senderAgent = agentMap.get(msg.from);
              const recipientIdx = agentIndexMap.get(msg.to) ?? 0;
              const recipientAgent = agentMap.get(msg.to);

              const quotedMsg = msg.replyTo
                ? messages.find((m) => m.id === msg.replyTo)
                : undefined;
              const showQuoteText = Boolean(quotedMsg && prevMsg?.id !== quotedMsg.id);
              const showRecipientChip =
                !quotedMsg && msg.to && msg.to !== "all" && msg.to !== "everyone";

              const matchesFocus =
                !focusAgent ||
                msg.from === focusAgent ||
                msg.to === focusAgent ||
                msg.to === "all" ||
                msg.to === "everyone";
              const isSelected = selectedId === msg.id;
              const isKept = selectedId ? isSelected : matchesFocus;
              const needsYou =
                msg.kind === "question" &&
                msg.to === "you" &&
                !answeredQuestionIds.has(msg.id);

              if (msg.kind === "spawn") {
                const spawnedName = resolveName(msg.to);
                const spawnerName = resolveName(msg.from);
                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      msgRefs.current[msg.id] = el;
                    }}
                    tabIndex={-1}
                    className="af-crsc__system"
                    data-kept={isKept || undefined}
                    aria-label={`${spawnerName} started ${spawnedName}: ${msg.text}`}
                  >
                    <span className="af-crsc__system-text" dir="auto" title={msg.text}>
                      {spawnerName} started{" "}
                      <span className="af-crsc__system-name">{spawnedName}</span>
                    </span>
                  </div>
                );
              }

              const hasDetails = Boolean(
                msg.details?.facts?.length ||
                  msg.details?.items?.length ||
                  msg.details?.entries?.length ||
                  msg.payload,
              );

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    msgRefs.current[msg.id] = el;
                  }}
                  tabIndex={0}
                  className="af-crsc__msg"
                  data-you={isFromYou || undefined}
                  data-typing={msg.typing || undefined}
                  data-selected={isSelected || undefined}
                  data-kept={isKept || undefined}
                  data-flash={flashId === msg.id || undefined}
                  aria-label={`${resolveName(msg.from)} to ${resolveName(msg.to)}${
                    msg.at ? `, ${msg.at}` : ""
                  }: ${msg.typing ? "writing…" : msg.text}`}
                  onClick={() => {
                    if (!hasDetails) return;
                    setSelectedId(isSelected ? null : msg.id);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      if (hasDetails) setSelectedId(isSelected ? null : msg.id);
                    }
                  }}
                >
                  <span className="af-crsc__side">
                    <StreamPixelMark
                      you={isFromYou}
                      agentIndex={senderIdx}
                      busy={msg.typing}
                      avatar={senderAgent?.avatar}
                    />
                  </span>

                  <div className="af-crsc__body">
                    <div className="af-crsc__head">
                      <span className="af-crsc__from" dir="auto">
                        {resolveName(msg.from)}
                      </span>
                      {msg.kind === "handoff" ? (
                        <span className="af-crsc__tag">Handoff</span>
                      ) : null}
                      {needsYou ? (
                        <span className="af-crsc__needs">Needs you</span>
                      ) : null}
                      {!isFromYou && !msg.typing ? (
                        <button
                          type="button"
                          className="af-crsc__reply"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyTargetId(msg.id);
                            fieldRef.current?.focus();
                          }}
                        >
                          Reply
                        </button>
                      ) : null}
                      {msg.at && !msg.typing ? (
                        <span className="af-crsc__at">{msg.at}</span>
                      ) : null}
                    </div>

                    {quotedMsg ? (
                      <button
                        type="button"
                        className="af-crsc__quote"
                        data-only={!showQuoteText || undefined}
                        tabIndex={-1}
                        aria-label={`Replying to ${resolveName(quotedMsg.from)}: ${quotedMsg.text} – show it`}
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpToMessage(quotedMsg.id);
                        }}
                      >
                        <span className="af-crsc__quote-name" dir="auto">
                          {msg.to && msg.to !== quotedMsg.from ? (
                            <span className="af-crsc__quote-to">to</span>
                          ) : null}
                          <StreamPixelMark
                            you={quotedMsg.from === "you"}
                            agentIndex={agentIndexMap.get(quotedMsg.from) ?? 0}
                            avatar={agentMap.get(quotedMsg.from)?.avatar}
                          />
                          {resolveName(quotedMsg.from)}
                        </span>
                        {showQuoteText ? (
                          <span className="af-crsc__quote-text" dir="auto">
                            {quotedMsg.text}
                          </span>
                        ) : null}
                      </button>
                    ) : showRecipientChip ? (
                      <span className="af-crsc__quote" data-only="">
                        <span className="af-crsc__quote-name" dir="auto">
                          <span className="af-crsc__quote-to">to</span>
                          <span className="af-crsc__quote-who">
                            <StreamPixelMark
                              you={msg.to === "you"}
                              agentIndex={recipientIdx}
                              avatar={recipientAgent?.avatar}
                            />
                            {resolveName(msg.to)}
                          </span>
                        </span>
                      </span>
                    ) : null}

                    {msg.typing ? (
                      <span className="af-crsc__shimmer" data-text="Writing…">
                        Writing…
                      </span>
                    ) : (
                      <p className="af-crsc__text" dir="auto">
                        {renderTextWithLogos(msg.text, mergedLogos)}
                      </p>
                    )}

                    {!msg.typing && msg.attachments?.length ? (
                      <div className="af-crsc__files" dir="auto">
                        {msg.attachments.map((att) => {
                          const k = inferAttachmentKind(att);
                          return (
                            <button
                              key={att.label}
                              type="button"
                              className="af-crsc__file"
                              title={att.label}
                              aria-label={`Open ${att.label}`}
                              aria-haspopup="dialog"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewState({
                                  att,
                                  senderName: resolveName(msg.from),
                                  senderIdx,
                                });
                              }}
                            >
                              <AttachmentIcon kind={k} />
                              <span className="af-crsc__file-name" dir="auto">
                                {att.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {/* Expandable details card under selected message */}
                  {hasDetails && isSelected ? (
                    <div
                      className="af-crsc__more"
                      data-open=""
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="af-crsc__card">
                        {msg.details?.facts?.length ? (
                          <dl className="af-crsc__facts">
                            {msg.details.facts.map((f) => (
                              <div key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}

                        {(msg.details?.entries?.length || msg.details?.items?.length) ? (
                          <ul className="af-crsc__items">
                            {[
                              ...(msg.details?.entries ?? []),
                              ...(msg.details?.items?.map(
                                (label): { label: string; icon?: ReactNode; detail?: string } => ({
                                  label,
                                }),
                              ) ?? []),
                            ].map((normalized, i) => {
                              return (
                                <li key={i} className="af-crsc__item">
                                  <span className="af-crsc__tile" aria-hidden="true">
                                    {normalized.icon ?? (
                                      <span className="af-crsc__tile-dot" />
                                    )}
                                  </span>
                                  <span
                                    className="af-crsc__item-label"
                                    dir="auto"
                                    title={normalized.label}
                                  >
                                    {normalized.label}
                                  </span>
                                  {normalized.detail ? (
                                    <span
                                      className="af-crsc__item-detail"
                                      dir="auto"
                                      title={normalized.detail}
                                    >
                                      {normalized.detail}
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}

                        {msg.payload ? (
                          <pre className="af-crsc__doc" data-code="">
                            {msg.payload}
                          </pre>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attachment preview window */}
        {previewState ? (
          <div
            className="af-crsc__preview"
            role="dialog"
            aria-modal="true"
            aria-label={previewState.att.label}
            onClick={() => setPreviewState(null)}
          >
            <div
              className="af-crsc__window"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="af-crsc__window-head">
                <span className="af-crsc__window-icon" aria-hidden="true">
                  <AttachmentIcon kind={inferAttachmentKind(previewState.att)} />
                </span>
                <div className="af-crsc__window-title">
                  <span className="af-crsc__window-name">
                    {previewState.att.label}
                  </span>
                  <span className="af-crsc__window-meta">
                    <StreamPixelMark agentIndex={previewState.senderIdx} />
                    {previewState.att.meta ?? previewState.senderName}
                  </span>
                </div>
                <button
                  type="button"
                  className="af-crsc__preview-close"
                  aria-label="Close preview"
                  onClick={() => setPreviewState(null)}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="af-crsc__window-body" tabIndex={0}>
                {inferAttachmentKind(previewState.att) === "table" &&
                previewState.att.preview ? (
                  <table className="af-crsc__sheet">
                    {(() => {
                      const rows = previewState.att.preview
                        .trim()
                        .split("\n")
                        .map((r) => r.split(","));
                      const [head, ...body] = rows;
                      return (
                        <>
                          {head ? (
                            <thead>
                              <tr>
                                {head.map((cell, ci) => (
                                  <th key={ci}>{cell}</th>
                                ))}
                              </tr>
                            </thead>
                          ) : null}
                          <tbody>
                            {body.map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </>
                      );
                    })()}
                  </table>
                ) : previewState.att.preview ? (
                  <pre
                    className="af-crsc__doc"
                    data-code={
                      inferAttachmentKind(previewState.att) === "code" || undefined
                    }
                  >
                    {previewState.att.preview}
                  </pre>
                ) : (
                  <p className="af-crsc__window-empty">No preview available</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom composer */}
      <div className="af-crsc__composer">
        {mentionOpen && filteredMentions.length > 0 ? (
          <div className="af-crsc__menu" role="listbox" aria-label="Mention an agent">
            {filteredMentions.map((agent, i) => {
              const idx = agentIndexMap.get(agent.id) ?? 0;
              return (
                <button
                  key={agent.id}
                  type="button"
                  role="option"
                  aria-selected={i === mentionIndex}
                  className="af-crsc__menu-item"
                  data-active={i === mentionIndex || undefined}
                  onClick={() => insertMention(agent)}
                >
                  <StreamPixelMark agentIndex={idx} avatar={agent.avatar} />
                  <span className="af-crsc__menu-name">{agent.name}</span>
                  {agent.model ? (
                    <span className="af-crsc__menu-model">{agent.model}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className="af-crsc__write"
          onClick={() => fieldRef.current?.focus()}
        >
          {replyDraftTarget ? (
            <div className="af-crsc__quote af-crsc__quote--draft">
              <span className="af-crsc__quote-name">
                <span className="af-crsc__quote-to">Replying to</span>
                <StreamPixelMark
                  you={replyDraftTarget.from === "you"}
                  agentIndex={agentIndexMap.get(replyDraftTarget.from) ?? 0}
                />
                {resolveName(replyDraftTarget.from)}
                <button
                  type="button"
                  className="af-crsc__unreply"
                  aria-label="Clear reply"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyTargetId(null);
                  }}
                >
                  ×
                </button>
              </span>
              <span className="af-crsc__quote-text">{replyDraftTarget.text}</span>
            </div>
          ) : null}

          <textarea
            ref={fieldRef}
            className="af-crsc__field"
            rows={1}
            value={draft}
            placeholder={placeholder}
            aria-label="Message the agents"
            aria-autocomplete="list"
            aria-expanded={mentionOpen}
            onChange={(e) => {
              const val = e.target.value;
              setDraft(val);
              const match = val.match(/@([\w-]*)$/);
              if (match) {
                setMentionOpen(true);
                setMentionQuery(match[1] ?? "");
                setMentionIndex(0);
              } else {
                setMentionOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (mentionOpen && filteredMentions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % filteredMentions.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (i) => (i - 1 + filteredMentions.length) % filteredMentions.length,
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const chosen = filteredMentions[mentionIndex];
                  if (chosen) insertMention(chosen);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="af-crsc__tools">
            <button
              type="button"
              className="af-crsc__at-btn"
              aria-label="Name an agent"
              aria-expanded={mentionOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMentionOpen((o) => !o);
                setMentionQuery("");
                fieldRef.current?.focus();
              }}
            >
              @
            </button>

            <span className="af-crsc__for">
              {namedRecipients.length > 0 ? (
                <>
                  to
                  {namedRecipients.map((a) => (
                    <span key={a.id} className="af-crsc__for-who">
                      <StreamPixelMark
                        agentIndex={agentIndexMap.get(a.id) ?? 0}
                        avatar={a.avatar}
                      />
                      {a.name}
                    </span>
                  ))}
                </>
              ) : replyDraftTarget ? (
                <>
                  to{" "}
                  <span className="af-crsc__for-who">
                    {resolveName(replyDraftTarget.from)}
                  </span>
                </>
              ) : focusAgent && focusAgent !== "you" ? (
                <>
                  to{" "}
                  <span className="af-crsc__for-who">
                    {resolveName(focusAgent)}
                  </span>
                </>
              ) : (
                "to everyone"
              )}
            </span>

            <button
              type="button"
              className="af-crsc__send"
              aria-label="Send"
              disabled={!draft.trim()}
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5.5V19"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const AfCollaborationStreamPattern = AfCollaborationStream;
export const CollaborationStream = AfCollaborationStream;
