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
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfPortal } from "../../primitives/layer";

export type SeqParticipantKind = "person" | "agent" | "tool";

export interface SeqParticipant {
  id: string;
  name: string;
  kind?: SeqParticipantKind;
  logo?: ReactNode;
  icon?: string;
  color?: string;
  model?: string;
  description?: string;
}

export interface SeqMessage {
  id: string;
  from: string;
  to: string;
  label: string;
  kind?: "call" | "reply";
  replyTo?: string;
  status?: "failed" | "waiting";
  at?: number;
  frame?: string;
  detail?: string;
}

export interface AfAgentSequenceProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onSelect"> {
  /** Sequence diagram participant columns from left to right. */
  participants?: SeqParticipant[];
  /** Ordered message list from top to bottom; new ids draw across with tip light and landing ripple. */
  messages?: SeqMessage[];
  /** Header title. */
  title?: string;
  /** Whether the run is still active (shimmers open lifeline bars and twinkles working agent marks). */
  running?: boolean;
  /** Show left time gutter (defaults to true when empty or when any message carries `at`). */
  times?: boolean;
  /** Fired when a message card opens or closes. */
  onSelect?: (message: SeqMessage | null) => void;
  /** Formats `at` (ms since run start), defaults to `m:ss` / `h:mm:ss`. */
  formatTime?: (ms: number) => string;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style overrides. */
  style?: CSSProperties;
}

export type AfAgentSequencePatternProps = AfAgentSequenceProps;

const AGENT_COLOR_PALETTE = [
  "var(--af-asqc-blue)",
  "var(--af-asqc-purple)",
  "var(--af-asqc-cyan)",
  "var(--af-asqc-green)",
  "var(--af-asqc-amber)",
];

const PIXEL_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

const AGENT_PATTERNS: Record<string, number[]> = {
  lead: [0, 0, 0, 1, 1, 1, 1, 0, 1],
  researcher: [1, 1, 1, 0, 1, 0, 1, 0, 1],
  coder: [1, 0, 1, 1, 0, 1, 0, 1, 0],
  reviewer: [0, 1, 0, 1, 1, 0, 1, 0, 1],
};

const FALLBACK_PATTERNS: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 0, 1, 0, 1],
];

function defaultFormatTime(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatShortDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function SeqPixelMark({
  id,
  kind,
  busy,
  color,
}: {
  id: string;
  kind: SeqParticipantKind;
  busy?: boolean;
  color?: string;
}) {
  const mask = useMemo(() => {
    if (kind === "person") return [1, 1, 1, 1, 1, 1, 1, 1, 1];
    const lower = id.toLowerCase();
    if (AGENT_PATTERNS[lower]) return AGENT_PATTERNS[lower];
    let h = 0;
    for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
    return FALLBACK_PATTERNS[Math.abs(h) % FALLBACK_PATTERNS.length];
  }, [id, kind]);

  return (
    <span
      className="af-asqc__mark"
      data-person={kind === "person" ? "" : undefined}
      data-busy={busy ? "" : undefined}
      style={color ? ({ "--af-asqc-c": color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {mask.map((on, idx) => (
        <i
          key={idx}
          data-on={on ? "" : undefined}
          style={{ animationDelay: `${PIXEL_DELAYS[idx]}ms` }}
        />
      ))}
    </span>
  );
}

function renderToolLogo(participant: SeqParticipant): ReactNode {
  if (participant.logo) return participant.logo;
  const key = (participant.icon || participant.id || participant.name).toLowerCase();
  if (key.includes("github") || key.includes("git")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--af-asqc-strong)" }}>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }
  if (key.includes("vercel") || key.includes("deploy")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--af-asqc-strong)" }}>
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    );
  }
  if (key.includes("linear")) {
    return (
      <svg viewBox="0 0 24 24" fill="#5E6AD2" aria-hidden="true">
        <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 12h6" />
    </svg>
  );
}

/* ---------------- Official Checkout Crash Specimen ---------------- */

const DEMO_PARTICIPANTS: SeqParticipant[] = [
  {
    id: "you",
    name: "You",
    kind: "person",
    description: "Asked for the fix and merges it",
  },
  {
    id: "lead",
    name: "Lead",
    kind: "agent",
    model: "Claude Opus",
    description: "Splits the fix into steps and hands them out",
  },
  {
    id: "researcher",
    name: "Researcher",
    kind: "agent",
    model: "Claude Sonnet",
    description: "Finds where and why empty carts crash the checkout",
  },
  {
    id: "coder",
    name: "Coder",
    kind: "agent",
    model: "Claude Sonnet",
    description: "Writes the patch, deploys a preview and opens the pull request",
  },
  {
    id: "github",
    name: "GitHub",
    kind: "tool",
    description: "MCP server – code search, branches and pull requests in shop/web",
  },
  {
    id: "vercel",
    name: "Vercel",
    kind: "tool",
    description: "MCP server – preview deployments and runtime logs for shop/web",
  },
];

const DEMO_SCRIPT: SeqMessage[] = [
  {
    id: "m1",
    from: "you",
    to: "lead",
    kind: "call",
    label: "Fix the checkout crash",
    at: 0,
    detail: "Empty carts throw a TypeError on /checkout before redirecting back to /cart.",
  },
  {
    id: "m2",
    from: "lead",
    to: "lead",
    kind: "call",
    label: "Plan: find, patch, preview",
    at: 2000,
    detail: "1. Researcher traces emptyCart crash in shop/web\n2. Coder prepares pr/empty-cart branch\n3. Verify preview on Vercel",
  },
  {
    id: "m3",
    from: "lead",
    to: "researcher",
    kind: "call",
    label: "Find the cause",
    at: 3000,
    detail: "Locate where empty cart totals or line items are dereferenced without a guard.",
  },
  {
    id: "m4",
    from: "lead",
    to: "coder",
    kind: "call",
    label: "Prepare a branch",
    at: 3000,
    detail: "Branch pr/empty-cart off main and stage checkout test harness.",
  },
  {
    id: "m5",
    from: "researcher",
    to: "github",
    kind: "call",
    label: 'search_code("emptyCart")',
    at: 5000,
    detail: '{ "repo": "shop/web", "query": "emptyCart cart.ts" }',
  },
  {
    id: "m6",
    from: "github",
    to: "researcher",
    kind: "reply",
    replyTo: "m5",
    label: "3 matches",
    at: 6000,
    detail: "src/checkout/cart.ts:42\nsrc/checkout/session.ts:19\ntests/cart.test.ts:88",
  },
  {
    id: "m7",
    from: "coder",
    to: "lead",
    kind: "reply",
    replyTo: "m4",
    label: "pr/empty-cart-ready",
    at: 8000,
    detail: "Created branch pr/empty-cart @ 8f31c0a",
  },
  {
    id: "m8",
    from: "researcher",
    to: "lead",
    kind: "reply",
    replyTo: "m3",
    label: "Null total in cart.ts:42",
    at: 11000,
    detail: "cart.items[0].currency throws when items.length === 0; guard before creating payment session.",
  },
  {
    id: "m9",
    from: "lead",
    to: "coder",
    kind: "call",
    label: "Guard empty cart in cart.ts:42",
    at: 13000,
    detail: "Return early when cart.items.length === 0 and add empty-cart regression test.",
  },
  {
    id: "m10",
    from: "coder",
    to: "vercel",
    kind: "call",
    label: 'deploy_preview("pr/empty-cart")',
    at: 15000,
    detail: '{ "project": "shop-web", "branch": "pr/empty-cart" }',
  },
  {
    id: "m11",
    from: "vercel",
    to: "coder",
    kind: "reply",
    replyTo: "m10",
    label: "Built in 14s · cart-fix.ui.dev",
    at: 29000,
    detail: "Preview ready in 14s – GET /checkout?empty=1 -> 302 /cart",
  },
  {
    id: "m12",
    from: "coder",
    to: "lead",
    kind: "reply",
    replyTo: "m9",
    label: "Preview verified",
    at: 31000,
    detail: "Regression suite passed and verified against cart-fix.ui.dev.",
  },
  {
    id: "m13",
    from: "lead",
    to: "you",
    kind: "reply",
    replyTo: "m1",
    label: "Ready on cart-fix.ui.dev",
    at: 32000,
    detail: "Empty cart crash guarded in cart.ts:42, regression test added and preview live on cart-fix.ui.dev.",
  },
];

/* ---------------- Layout Computation Types ---------------- */

interface ResolvedParticipant extends SeqParticipant {
  kind: SeqParticipantKind;
  index: number;
  frac: number;
  resolvedColor: string;
}

interface PositionedMessage {
  msg: SeqMessage;
  fromIdx: number;
  toIdx: number;
  isSelf: boolean;
  isReply: boolean;
  top: number;
  height: number;
  lineY: number;
  color: string;
}

interface FrameBox {
  key: string;
  label: string;
  minIdx: number;
  maxIdx: number;
  top: number;
  height: number;
}

interface BusySpan {
  key: string;
  colIdx: number;
  frac: number;
  top: number;
  height: number;
  open: boolean;
  color: string;
  depth: number;
  durationMs: number;
}

type InspectState =
  | { kind: "participant"; id: string }
  | { kind: "message"; id: string }
  | null;

/* ---------------- Main Component ---------------- */

export function AfAgentSequence({
  participants: participantsProp,
  messages: messagesProp,
  title = "Fix the checkout crash",
  running: runningProp,
  times: timesProp,
  onSelect,
  formatTime = defaultFormatTime,
  className,
  style,
  ...restProps
}: AfAgentSequenceProps) {
  const isDemo = !participantsProp && !messagesProp;
  const [demoCount, setDemoCount] = useState<number>(() => (isDemo ? 0 : 8));
  const [fading, setFading] = useState(false);
  const [focusMsgId, setFocusMsgId] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectState>(null);

  const demoFullBodyHeight = useMemo(() => {
    if (!isDemo) return 0;
    let cursorY = 8;
    let activeFrameLabel = "";
    let hasRowsInFrame = false;
    for (let idx = 0; idx < DEMO_SCRIPT.length; idx += 1) {
      const msg = DEMO_SCRIPT[idx];
      const frameLabel = msg.frame?.trim() || "";
      if (activeFrameLabel && activeFrameLabel !== frameLabel) {
        if (hasRowsInFrame) cursorY += 8;
        activeFrameLabel = "";
        hasRowsInFrame = false;
      }
      if (frameLabel && !activeFrameLabel) {
        cursorY += 18;
        activeFrameLabel = frameLabel;
      }
      hasRowsInFrame = true;
      const isSelf = msg.from === msg.to;
      cursorY += (isSelf ? 44 : 36) + 2;
    }
    if (activeFrameLabel && hasRowsInFrame) {
      cursorY += 6;
    }
    return Math.max(84, cursorY + 12);
  }, [isDemo]);

  // Deterministic state-machine playback in demo mode (pauses only while popover is open)
  const isInspecting = inspect !== null;
  useEffect(() => {
    if (!isDemo || isInspecting) return;
    let timer: number;
    if (fading) {
      timer = window.setTimeout(() => {
        setDemoCount(0);
        setFading(false);
      }, 320);
    } else if (demoCount === 0) {
      timer = window.setTimeout(() => {
        setDemoCount(1);
      }, 620);
    } else if (demoCount < DEMO_SCRIPT.length) {
      timer = window.setTimeout(() => {
        setDemoCount((prev) => Math.min(DEMO_SCRIPT.length, prev + 1));
      }, 460);
    } else {
      timer = window.setTimeout(() => {
        setFading(true);
      }, 1800);
    }
    return () => window.clearTimeout(timer);
  }, [isDemo, demoCount, fading, isInspecting]);

  const rawParticipants = participantsProp ?? DEMO_PARTICIPANTS;
  const rawMessages = useMemo(
    () => messagesProp ?? DEMO_SCRIPT.slice(0, demoCount),
    [messagesProp, demoCount],
  );

  const isRunning = runningProp ?? (isDemo ? demoCount < DEMO_SCRIPT.length : true);

  // Resolve participant colors in official palette order
  const resolvedParticipants = useMemo<ResolvedParticipant[]>(() => {
    const n = Math.max(1, rawParticipants.length);
    let agentIdx = 0;
    return rawParticipants.map((p, index) => {
      const kind: SeqParticipantKind = p.kind ?? "agent";
      let resolvedColor = p.color;
      if (!resolvedColor) {
        if (kind === "person") resolvedColor = "var(--af-asqc-person)";
        else if (kind === "tool") resolvedColor = "var(--af-asqc-tool)";
        else {
          resolvedColor = AGENT_COLOR_PALETTE[agentIdx % AGENT_COLOR_PALETTE.length];
          agentIdx += 1;
        }
      }
      return {
        ...p,
        kind,
        index,
        frac: (index + 0.5) / n,
        resolvedColor,
      };
    });
  }, [rawParticipants]);

  const participantById = useMemo(
    () => new Map(resolvedParticipants.map((p) => [p.id, p])),
    [resolvedParticipants],
  );

  // Filter out broken messages referencing unknown participants
  const validMessages = useMemo(
    () => rawMessages.filter((m) => participantById.has(m.from) && participantById.has(m.to)),
    [rawMessages, participantById],
  );

  // Track newly arrived message IDs for draw-across + ripple animation
  const seenIdsRef = useRef<Set<string>>(
    new Set(isDemo ? [] : validMessages.map((m) => m.id)),
  );
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  useEffect(() => {
    // If demo looped back to fewer messages, reset seen set cleanly
    if (validMessages.length <= 1 && seenIdsRef.current.size > 4) {
      seenIdsRef.current = new Set();
    }
    const added: SeqMessage[] = [];
    for (const m of validMessages) {
      if (!seenIdsRef.current.has(m.id)) {
        seenIdsRef.current.add(m.id);
        added.push(m);
      }
    }
    if (!added.length) return;

    const last = added[added.length - 1];
    const fromP = participantById.get(last.from);
    const toP = participantById.get(last.to);
    if (fromP && toP) {
      setLiveAnnouncement(
        fromP.id === toP.id
          ? `${fromP.name}: ${last.label}`
          : `${fromP.name} to ${toP.name}: ${last.label}`,
      );
    }

    setFreshIds((prev) => {
      const next = new Set(prev);
      for (const m of added) next.add(m.id);
      return next;
    });
    const timer = window.setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        for (const m of added) next.delete(m.id);
        return next;
      });
    }, 680);
    return () => window.clearTimeout(timer);
  }, [validMessages, participantById]);

  // Gutter visibility & hours width
  const anyHasTime = useMemo(
    () => validMessages.some((m) => typeof m.at === "number" && Number.isFinite(m.at)),
    [validMessages],
  );
  const showTimes = timesProp ?? (validMessages.length === 0 || anyHasTime);
  const maxAt = useMemo(() => {
    let max = -1;
    for (const m of validMessages) {
      if (typeof m.at === "number" && Number.isFinite(m.at) && m.at > max) {
        max = m.at;
      }
    }
    return max;
  }, [validMessages]);
  const hasHours = maxAt >= 3_600_000;

  // Compute message rows, frame boxes, and lifeline busy bars
  const diagram = useMemo(() => {
    const rows: PositionedMessage[] = [];
    const frames: FrameBox[] = [];
    let cursorY = 8;

    type ActiveFrameState = {
      label: string;
      startRowIdx: number;
      minIdx: number;
      maxIdx: number;
      top: number;
    };
    let activeFrame: ActiveFrameState | null = null;

    for (let idx = 0; idx < validMessages.length; idx += 1) {
      const msg = validMessages[idx];
      const fromP = participantById.get(msg.from)!;
      const toP = participantById.get(msg.to)!;
      const isSelf = fromP.index === toP.index;
      const isReply = msg.kind === "reply";
      const frameLabel = msg.frame?.trim() || "";

      if (activeFrame && activeFrame.label !== frameLabel) {
        const prevRow = rows[rows.length - 1];
        frames.push({
          key: `frame-${activeFrame.startRowIdx}`,
          label: activeFrame.label,
          minIdx: activeFrame.minIdx,
          maxIdx: activeFrame.maxIdx,
          top: activeFrame.top,
          height: prevRow.top + prevRow.height - activeFrame.top + 6,
        });
        activeFrame = null;
        cursorY += 8;
      }

      if (frameLabel && !activeFrame) {
        const frameTop = cursorY + 2;
        cursorY += 18;
        activeFrame = {
          label: frameLabel,
          startRowIdx: idx,
          minIdx: Math.min(fromP.index, toP.index),
          maxIdx: Math.max(fromP.index, toP.index),
          top: frameTop,
        };
      } else if (activeFrame) {
        activeFrame.minIdx = Math.min(activeFrame.minIdx, fromP.index, toP.index);
        activeFrame.maxIdx = Math.max(activeFrame.maxIdx, fromP.index, toP.index);
      }

      const height = isSelf ? 44 : 36;
      const lineY = cursorY + (isSelf ? 14 : 24.5);
      const color =
        msg.status === "failed"
          ? "var(--af-asqc-red)"
          : msg.status === "waiting"
            ? "var(--af-asqc-amber)"
            : fromP.resolvedColor;

      rows.push({
        msg,
        fromIdx: fromP.index,
        toIdx: toP.index,
        isSelf,
        isReply,
        top: cursorY,
        height,
        lineY,
        color,
      });

      cursorY += height + 2;
    }

    if (activeFrame && rows.length > 0) {
      const prevRow = rows[rows.length - 1];
      frames.push({
        key: `frame-${activeFrame.startRowIdx}`,
        label: activeFrame.label,
        minIdx: activeFrame.minIdx,
        maxIdx: activeFrame.maxIdx,
        top: activeFrame.top,
        height: prevRow.top + prevRow.height - activeFrame.top + 6,
      });
      cursorY += 6;
    }

    const bodyHeight = validMessages.length === 0 ? 68 : Math.max(84, cursorY + 12);

    // Match calls to replies (`replyTo`) to build lifeline execution bars
    const replyRowByCallId = new Map<string, PositionedMessage>();
    for (const r of rows) {
      if (r.isReply && r.msg.replyTo && !replyRowByCallId.has(r.msg.replyTo)) {
        replyRowByCallId.set(r.msg.replyTo, r);
      }
    }

    const busySpans: BusySpan[] = [];
    const openByCol = new Set<number>();
    const activeIntervalsPerCol = new Map<number, Array<{ end: number }>>();

    for (const r of rows) {
      if (r.isReply || r.isSelf) continue;
      const target = resolvedParticipants[r.toIdx];
      if (!target || target.kind === "person") continue;

      const replyRow = replyRowByCallId.get(r.msg.id);
      const y0 = r.lineY;
      const isOpen = !replyRow && isRunning;
      const y1 = replyRow ? replyRow.lineY : bodyHeight - 8;
      if (y1 <= y0) continue;

      const colIntervals = activeIntervalsPerCol.get(r.toIdx) ?? [];
      const overlapping = colIntervals.filter((iv) => iv.end > y0 + 1);
      const depth = overlapping.length;
      colIntervals.push({ end: y1 });
      activeIntervalsPerCol.set(r.toIdx, colIntervals);

      if (isOpen) openByCol.add(r.toIdx);

      const barColor =
        target.kind === "tool"
          ? resolvedParticipants[r.fromIdx]?.resolvedColor ?? target.resolvedColor
          : target.resolvedColor;

      const startAt = typeof r.msg.at === "number" ? r.msg.at : 0;
      const endAt =
        replyRow && typeof replyRow.msg.at === "number"
          ? replyRow.msg.at
          : maxAt >= startAt
            ? maxAt
            : startAt;

      busySpans.push({
        key: `busy-${r.msg.id}`,
        colIdx: r.toIdx,
        frac: target.frac,
        top: Math.round(y0),
        height: Math.max(12, Math.round(y1 - y0)),
        open: isOpen,
        color: barColor,
        depth,
        durationMs: Math.max(0, endAt - startAt),
      });
    }

    return { rows, frames, busySpans, openByCol, bodyHeight };
  }, [validMessages, participantById, resolvedParticipants, isRunning, maxAt]);

  // Summary counts
  const failedCount = useMemo(
    () => validMessages.filter((m) => m.status === "failed").length,
    [validMessages],
  );
  const workingCount = isRunning ? diagram.openByCol.size : 0;

  // Scroll overflow edge masks
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEdges, setScrollEdges] = useState<{ start: boolean; end: boolean }>({
    start: false,
    end: false,
  });

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setScrollEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useIsomorphicLayoutEffect(() => {
    updateScrollEdges();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateScrollEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollEdges, resolvedParticipants.length]);

  // Roving focus & popover card state
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const tagRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);

  const activeFocusMsgId =
    focusMsgId && validMessages.some((m) => m.id === focusMsgId)
      ? focusMsgId
      : validMessages[0]?.id ?? null;

  const updateCardPos = useCallback(() => {
    if (!inspect) {
      setCardPos(null);
      return;
    }
    const anchor =
      inspect.kind === "participant"
        ? chipRefs.current.get(inspect.id)
        : tagRefs.current.get(inspect.id) ?? rowRefs.current.get(inspect.id);
    if (!anchor) {
      setCardPos(null);
      return;
    }
    const r = anchor.getBoundingClientRect();
    const cardW = 248;
    const cardH = cardRef.current?.offsetHeight ?? 156;
    let left = Math.round(r.left + r.width / 2 - cardW / 2);
    if (inspect.kind === "message" && window.innerWidth >= 560) {
      const rightCandidate = Math.round(r.right + 8);
      if (rightCandidate + cardW <= window.innerWidth - 10) {
        left = rightCandidate;
      } else if (r.left - cardW - 8 >= 10) {
        left = Math.round(r.left - cardW - 8);
      }
    }
    left = Math.max(10, Math.min(window.innerWidth - cardW - 10, left));
    let top = Math.round(r.bottom + 6);
    if (top + cardH > window.innerHeight - 10 && r.top > cardH + 12) {
      top = Math.round(r.top - cardH - 6);
    }
    setCardPos({ left, top });
  }, [inspect]);

  useIsomorphicLayoutEffect(() => {
    if (!inspect) return;
    updateCardPos();
    const raf = window.requestAnimationFrame(updateCardPos);
    window.addEventListener("scroll", updateCardPos, true);
    window.addEventListener("resize", updateCardPos);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updateCardPos, true);
      window.removeEventListener("resize", updateCardPos);
    };
  }, [inspect, updateCardPos]);

  useEffect(() => {
    if (!inspect) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      const anchor =
        inspect.kind === "participant"
          ? chipRefs.current.get(inspect.id)
          : rowRefs.current.get(inspect.id);
      if (anchor?.contains(target)) return;
      if (inspect.kind === "message") onSelect?.(null);
      setInspect(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [inspect, onSelect]);

  const handleRowKeyDown = (e: ReactKeyboardEvent<HTMLLIElement>, rowIdx: number) => {
    const move = (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(diagram.rows.length - 1, nextIdx));
      const id = diagram.rows[clamped]?.msg.id;
      if (!id) return;
      setFocusMsgId(id);
      rowRefs.current.get(id)?.focus();
    };
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(rowIdx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(rowIdx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(diagram.rows.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const msg = diagram.rows[rowIdx].msg;
      setInspect((prev) => {
        if (prev?.kind === "message" && prev.id === msg.id) {
          onSelect?.(null);
          return null;
        }
        onSelect?.(msg);
        return { kind: "message", id: msg.id };
      });
    } else if (e.key === "Escape" && inspect) {
      e.preventDefault();
      if (inspect.kind === "message") onSelect?.(null);
      setInspect(null);
    }
  };

  const nCols = Math.max(1, resolvedParticipants.length);
  const colPosExpr = (frac: number) =>
    `calc(var(--af-asqc-g) + (100% - var(--af-asqc-g)) * ${frac})`;

  // Participant stats for inspect card
  const inspectedParticipant =
    inspect?.kind === "participant" ? participantById.get(inspect.id) ?? null : null;
  const inspectedRow =
    inspect?.kind === "message"
      ? diagram.rows.find((r) => r.msg.id === inspect.id) ?? null
      : null;

  return (
    <section
      className={cn("af-asqc", className)}
      data-hours={hasHours ? "" : undefined}
      data-fading={fading ? "" : undefined}
      aria-label={title}
      style={
        {
          "--af-asqc-n": nCols,
          "--af-asqc-gw": showTimes ? 1 : 0,
          ...(isDemo ? { minHeight: `${demoFullBodyHeight + 86}px` } : undefined),
          ...style,
        } as CSSProperties
      }
      {...restProps}
    >
      <div className="af-asqc__bar">
        <p className="af-asqc__title" dir="auto" title={title}>
          {title}
        </p>
        <p className="af-asqc__sum">
          {workingCount > 0 ? <span className="af-asqc__sum-run">{workingCount} working</span> : null}
          {failedCount > 0 ? <span className="af-asqc__sum-fail">{failedCount} failed</span> : null}
          <span>
            {validMessages.length} {validMessages.length === 1 ? "message" : "messages"}
          </span>
          {anyHasTime && maxAt >= 0 ? <span>{formatTime(maxAt)}</span> : null}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="af-asqc__scroll"
        data-more-start={scrollEdges.start ? "" : undefined}
        data-more-end={scrollEdges.end ? "" : undefined}
        onScroll={updateScrollEdges}
      >
        <div className="af-asqc__canvas">
          {/* Participant Header Chips */}
          <div className="af-asqc__heads">
            {resolvedParticipants.map((p) => {
              const isBusy = isRunning && diagram.openByCol.has(p.index);
              const isOpen = inspect?.kind === "participant" && inspect.id === p.id;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    if (el) chipRefs.current.set(p.id, el);
                    else chipRefs.current.delete(p.id);
                  }}
                  type="button"
                  className="af-asqc__head-chip"
                  data-kind={p.kind}
                  data-busy={isBusy ? "" : undefined}
                  data-open={isOpen ? "" : undefined}
                  aria-haspopup="dialog"
                  aria-expanded={isOpen}
                  title={p.name}
                  style={
                    {
                      left: colPosExpr(p.frac),
                      maxWidth: `calc(((100% - var(--af-asqc-g)) * ${1 / nCols}) - 6px)`,
                      "--af-asqc-c": p.resolvedColor,
                    } as CSSProperties
                  }
                  onClick={() => {
                    setInspect((prev) => {
                      if (prev?.kind === "participant" && prev.id === p.id) return null;
                      if (prev?.kind === "message") onSelect?.(null);
                      return { kind: "participant", id: p.id };
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && isOpen) {
                      e.preventDefault();
                      setInspect(null);
                    }
                  }}
                >
                  {p.kind === "tool" ? (
                    <span className="af-asqc__logo">{renderToolLogo(p)}</span>
                  ) : p.logo ? (
                    <span className="af-asqc__logo">{p.logo}</span>
                  ) : (
                    <SeqPixelMark id={p.id} kind={p.kind} busy={isBusy} />
                  )}
                  <span className="af-asqc__name" dir="auto">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lifelines, Frames, Busy Bars & Message Arrows */}
          <div className="af-asqc__body-slot">
          <div className="af-asqc__body" style={{ height: `${diagram.bodyHeight}px` }}>
            {resolvedParticipants.map((p) => (
              <i
                key={`life-${p.id}`}
                className="af-asqc__life"
                aria-hidden="true"
                style={{
                  left: colPosExpr(p.frac),
                  top: "-8px",
                  height: `${diagram.bodyHeight + 8}px`,
                }}
              />
            ))}

            {/* Combined Fragments (`PAR`, `RETRY`, etc.) */}
            {diagram.frames.map((fr) => {
              const leftFrac = Math.max(0, (fr.minIdx + 0.14) / nCols);
              const rightFrac = Math.min(1, (fr.maxIdx + 0.86) / nCols);
              return (
                <div
                  key={fr.key}
                  className="af-asqc__frame"
                  style={{
                    left: colPosExpr(leftFrac),
                    width: `calc((100% - var(--af-asqc-g)) * ${Math.max(0.12, rightFrac - leftFrac)})`,
                    top: `${fr.top}px`,
                    height: `${fr.height}px`,
                  }}
                >
                  <b>{fr.label}</b>
                </div>
              );
            })}

            {/* Lifeline Busy Activation Bars */}
            {diagram.busySpans.map((b) => (
              <span
                key={b.key}
                className="af-asqc__busy"
                data-open={b.open ? "" : undefined}
                aria-hidden="true"
                style={
                  {
                    left: `calc(${colPosExpr(b.frac)} - 3px + ${b.depth * 3}px)`,
                    top: `${b.top}px`,
                    height: `${b.height}px`,
                    "--af-asqc-c": b.color,
                  } as CSSProperties
                }
              />
            ))}

            {validMessages.length === 0 ? (
              <p className="af-asqc__empty">No messages yet</p>
            ) : (
              <ol className="af-asqc__list">
                {diagram.rows.map((row, rowIdx) => {
                  const { msg, fromIdx, toIdx, isSelf, isReply, top, color } = row;
                  const fromP = resolvedParticipants[fromIdx];
                  const toP = resolvedParticipants[toIdx];
                  const goLeft = toIdx < fromIdx;
                  const minFrac = Math.min(fromP.frac, toP.frac);
                  const maxFrac = Math.max(fromP.frac, toP.frac);
                  const isOpen = inspect?.kind === "message" && inspect.id === msg.id;
                  const isFresh = freshIds.has(msg.id);
                  const selfOnLastCol = isSelf && fromIdx === nCols - 1 && nCols > 1;

                  const timeStr =
                    showTimes && typeof msg.at === "number" && Number.isFinite(msg.at)
                      ? formatTime(msg.at)
                      : "";

                  const ariaParts = [
                    isSelf ? `${fromP.name}` : `${fromP.name} to ${toP.name}`,
                    msg.label ? `: ${msg.label}` : "",
                    msg.status === "failed"
                      ? ", Failed"
                      : msg.status === "waiting"
                        ? ", Needs you"
                        : "",
                    timeStr ? `, ${timeStr}` : "",
                  ].join("");

                  return (
                    <li
                      key={msg.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(msg.id, el);
                        else rowRefs.current.delete(msg.id);
                      }}
                      className="af-asqc__msg"
                      data-self={isSelf ? "" : undefined}
                      data-reply={isReply ? "" : undefined}
                      data-state={msg.status}
                      data-open={isOpen ? "" : undefined}
                      data-fresh={isFresh ? "" : undefined}
                      tabIndex={activeFocusMsgId === msg.id ? 0 : -1}
                      aria-haspopup="dialog"
                      aria-expanded={isOpen}
                      aria-label={ariaParts}
                      style={
                        {
                          top: `${top}px`,
                          "--af-asqc-c": color,
                        } as CSSProperties
                      }
                      onFocus={() => setFocusMsgId(msg.id)}
                      onClick={() => {
                        setFocusMsgId(msg.id);
                        setInspect((prev) => {
                          if (prev?.kind === "message" && prev.id === msg.id) {
                            onSelect?.(null);
                            return null;
                          }
                          onSelect?.(msg);
                          return { kind: "message", id: msg.id };
                        });
                      }}
                      onKeyDown={(e) => handleRowKeyDown(e, rowIdx)}
                    >
                      {timeStr ? <span className="af-asqc__time">{timeStr}</span> : null}

                      {isSelf ? (
                        <>
                          <svg
                            className="af-asqc__loop"
                            width="26"
                            height="24"
                            viewBox="0 0 26 24"
                            fill="none"
                            aria-hidden="true"
                            style={{
                              left: selfOnLastCol
                                ? `calc(${colPosExpr(fromP.frac)} - 24px)`
                                : colPosExpr(fromP.frac),
                              transform: selfOnLastCol ? "scaleX(-1)" : undefined,
                            }}
                          >
                            <path d="M 1 3 H 18 Q 22 3 22 7 V 16 Q 22 20 18 20 H 4" />
                            <path className="af-asqc__loop-head" d="M 1 20 L 6 17.3 V 22.7 Z" />
                          </svg>
                          {msg.label ? (
                            <span
                              className="af-asqc__label af-asqc__label--self"
                              data-left={selfOnLastCol ? "" : undefined}
                              style={
                                selfOnLastCol
                                  ? {
                                      right: `calc(100% - ${colPosExpr(fromP.frac)} + 28px)`,
                                      maxWidth: "220px",
                                    }
                                  : {
                                      left: `calc(${colPosExpr(fromP.frac)} + 28px)`,
                                      maxWidth: `calc(100% - ${colPosExpr(fromP.frac)} - 32px)`,
                                    }
                              }
                            >
                              <span
                                ref={(el) => {
                                  if (el) tagRefs.current.set(msg.id, el);
                                  else tagRefs.current.delete(msg.id);
                                }}
                                className="af-asqc__tag"
                                title={msg.label}
                              >
                                {msg.label}
                              </span>
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {msg.label ? (
                            <span
                              className="af-asqc__label"
                              style={
                                minFrac < 0.12 && maxFrac - minFrac < 0.22
                                  ? {
                                      left: colPosExpr(minFrac),
                                      textAlign: "left",
                                    }
                                  : maxFrac > 0.88 && maxFrac - minFrac < 0.22
                                    ? {
                                        right: `calc((100% - var(--af-asqc-g)) * ${1 - maxFrac})`,
                                        textAlign: "right",
                                      }
                                    : {
                                        left: colPosExpr((minFrac + maxFrac) / 2),
                                        transform: "translateX(-50%)",
                                        textAlign: "center",
                                      }
                              }
                            >
                              <span
                                ref={(el) => {
                                  if (el) tagRefs.current.set(msg.id, el);
                                  else tagRefs.current.delete(msg.id);
                                }}
                                className="af-asqc__tag"
                                title={msg.label}
                              >
                                {msg.status === "failed" ? `Failed · ${msg.label}` : msg.label}
                              </span>
                            </span>
                          ) : null}

                          <span
                            className="af-asqc__arrow"
                            data-left={goLeft ? "" : undefined}
                            aria-hidden="true"
                            style={{
                              left: colPosExpr(minFrac),
                              width: `calc((100% - var(--af-asqc-g)) * ${maxFrac - minFrac})`,
                            }}
                          >
                            <i className="af-asqc__line" />
                            <i className="af-asqc__tip" />
                            {msg.status === "failed" ? (
                              <svg
                                className="af-asqc__head"
                                data-cross=""
                                width="8"
                                height="8"
                                viewBox="0 0 8 8"
                              >
                                <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
                              </svg>
                            ) : (
                              <svg
                                className="af-asqc__head"
                                width="6"
                                height="8"
                                viewBox="0 0 6 8"
                                fill="var(--af-asqc-arrow)"
                              >
                                <path d="M0 1L6 4L0 7Z" />
                              </svg>
                            )}
                            <i
                              className="af-asqc__ripple"
                              style={goLeft ? { left: "-7px", top: "-2px" } : { right: "-7px", top: "-2px" }}
                            />
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          </div>
        </div>
      </div>

      <span className="af-asqc__sr" aria-live="polite">
        {liveAnnouncement}
      </span>

      {/* Participant / Message Details Card Popover */}
      {inspect && cardPos ? (
        <AfPortal>
          <div
            ref={cardRef}
            role="dialog"
            aria-label={
              inspectedParticipant
                ? inspectedParticipant.name
                : inspectedRow
                  ? inspectedRow.msg.label || "Message details"
                  : "Details"
            }
            className="af-asqc__card"
            style={
              {
                left: `${cardPos.left}px`,
                top: `${cardPos.top}px`,
                "--af-asqc-c": inspectedParticipant
                  ? inspectedParticipant.resolvedColor
                  : inspectedRow?.color ?? "var(--af-asqc-blue)",
              } as CSSProperties
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                if (inspect.kind === "message") {
                  const id = inspect.id;
                  onSelect?.(null);
                  setInspect(null);
                  rowRefs.current.get(id)?.focus();
                } else {
                  const id = inspect.id;
                  setInspect(null);
                  chipRefs.current.get(id)?.focus();
                }
              }
            }}
          >
            {inspectedParticipant ? (
              <>
                <div className="af-asqc__card-top">
                  {inspectedParticipant.kind === "tool" ? (
                    <span className="af-asqc__logo">{renderToolLogo(inspectedParticipant)}</span>
                  ) : inspectedParticipant.logo ? (
                    <span className="af-asqc__logo">{inspectedParticipant.logo}</span>
                  ) : (
                    <SeqPixelMark
                      id={inspectedParticipant.id}
                      kind={inspectedParticipant.kind}
                      busy={isRunning && diagram.openByCol.has(inspectedParticipant.index)}
                      color={inspectedParticipant.resolvedColor}
                    />
                  )}
                  <p className="af-asqc__card-name" dir="auto" title={inspectedParticipant.name}>
                    {inspectedParticipant.name}
                  </p>
                  <button
                    type="button"
                    className="af-asqc__card-close"
                    aria-label="Close"
                    onClick={() => {
                      const id = inspectedParticipant.id;
                      setInspect(null);
                      chipRefs.current.get(id)?.focus();
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <p className="af-asqc__card-tags">
                  <span className="af-asqc__chip">
                    {inspectedParticipant.kind === "person"
                      ? "Person"
                      : inspectedParticipant.kind === "tool"
                        ? "Tool"
                        : "Agent"}
                  </span>
                  {inspectedParticipant.kind !== "person" ? (
                    <span
                      className="af-asqc__chip"
                      data-tone={
                        isRunning && diagram.openByCol.has(inspectedParticipant.index)
                          ? "run"
                          : undefined
                      }
                    >
                      {isRunning && diagram.openByCol.has(inspectedParticipant.index)
                        ? "Working"
                        : "Idle"}
                    </span>
                  ) : null}
                  {inspectedParticipant.model ? (
                    <span className="af-asqc__chip" title={inspectedParticipant.model}>
                      {inspectedParticipant.model}
                    </span>
                  ) : null}
                </p>

                {inspectedParticipant.description ? (
                  <p className="af-asqc__card-text" dir="auto">
                    {inspectedParticipant.description}
                  </p>
                ) : null}

                {(() => {
                  const pId = inspectedParticipant.id;
                  const sent = validMessages.filter((m) => m.from === pId && m.to !== pId).length;
                  const received = validMessages.filter((m) => m.to === pId && m.from !== pId).length;
                  const tasksOrCalls = validMessages.filter(
                    (m) => m.to === pId && m.from !== pId && m.kind !== "reply",
                  ).length;
                  const colBusyMs = diagram.busySpans
                    .filter((b) => b.colIdx === inspectedParticipant.index)
                    .reduce((acc, b) => acc + b.durationMs, 0);
                  const isColBusy = diagram.busySpans.some(
                    (b) => b.colIdx === inspectedParticipant.index,
                  );

                  return (
                    <dl className="af-asqc__card-stats">
                      <div>
                        <dt>Sent</dt>
                        <dd>{sent}</dd>
                      </div>
                      <div>
                        <dt>Received</dt>
                        <dd>{received}</dd>
                      </div>
                      {inspectedParticipant.kind === "agent" ? (
                        <div>
                          <dt>Tasks</dt>
                          <dd>{tasksOrCalls}</dd>
                        </div>
                      ) : inspectedParticipant.kind === "tool" ? (
                        <div>
                          <dt>Calls</dt>
                          <dd>{tasksOrCalls}</dd>
                        </div>
                      ) : null}
                      {isColBusy ? (
                        <div>
                          <dt>Busy</dt>
                          <dd>{formatShortDuration(colBusyMs)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  );
                })()}
              </>
            ) : inspectedRow ? (
              <div className="af-asqc__card-msg">
                <div className="af-asqc__card-top">
                  <div className="af-asqc__card-route">
                    <span className="af-asqc__card-who">
                      {resolvedParticipants[inspectedRow.fromIdx]?.name}
                    </span>
                    {!inspectedRow.isSelf ? (
                      <>
                        <svg
                          className="af-asqc__card-to"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12h14m-4-4 4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="af-asqc__card-who">
                          {resolvedParticipants[inspectedRow.toIdx]?.name}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="af-asqc__card-close"
                    aria-label="Close"
                    onClick={() => {
                      const id = inspectedRow.msg.id;
                      onSelect?.(null);
                      setInspect(null);
                      rowRefs.current.get(id)?.focus();
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {inspectedRow.msg.label ? (
                  <p className="af-asqc__card-label" dir="auto">
                    {inspectedRow.msg.label}
                  </p>
                ) : null}

                <p className="af-asqc__card-tags">
                  <span className="af-asqc__chip" data-tone="msg">
                    {inspectedRow.isSelf ? "Note" : inspectedRow.isReply ? "Reply" : "Call"}
                  </span>
                  {inspectedRow.msg.status === "failed" ? (
                    <span className="af-asqc__chip" data-tone="fail">
                      Failed
                    </span>
                  ) : null}
                  {inspectedRow.msg.status === "waiting" ? (
                    <span className="af-asqc__chip" data-tone="wait">
                      Needs you
                    </span>
                  ) : null}
                  {inspectedRow.msg.frame ? (
                    <span className="af-asqc__chip" data-tone="frame">
                      {inspectedRow.msg.frame}
                    </span>
                  ) : null}
                </p>

                {inspectedRow.msg.detail ? (
                  <pre className="af-asqc__card-detail">{inspectedRow.msg.detail}</pre>
                ) : null}

                {typeof inspectedRow.msg.at === "number" ? (
                  <p className="af-asqc__card-meta">
                    <span>Sent {formatTime(inspectedRow.msg.at)}</span>
                    {inspectedRow.msg.replyTo
                      ? (() => {
                          const origin = validMessages.find((m) => m.id === inspectedRow.msg.replyTo);
                          if (origin && typeof origin.at === "number") {
                            return (
                              <span>
                                Took {formatShortDuration(Math.max(0, inspectedRow.msg.at - origin.at))}
                              </span>
                            );
                          }
                          return null;
                        })()
                      : null}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </AfPortal>
      ) : null}
    </section>
  );
}

export const AfAgentSequencePattern = AfAgentSequence;
export const AgentSequence = AfAgentSequence;
