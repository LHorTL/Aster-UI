import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfPortal } from "../../primitives/layer";

export type FlowStepKind = "trigger" | "action" | "agent" | "branch" | "wait";

export type FlowIconName =
  | "webhook"
  | "schedule"
  | "form"
  | "mail"
  | "message"
  | "slack"
  | "database"
  | "http"
  | "wait"
  | "branch"
  | "user"
  | "task"
  | "flash";

export type FlowStepStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface FlowPath {
  id: string;
  label: string;
  steps: FlowStep[];
}

export interface FlowStep {
  id: string;
  kind: FlowStepKind;
  title: string;
  detail?: string;
  note?: string;
  icon?: FlowIconName;
  paths?: FlowPath[];
}

export interface FlowTemplate {
  kind: FlowStepKind;
  title: string;
  detail?: string;
  note?: string;
  icon?: FlowIconName;
  paths?: string[];
}

export interface AfFlowBuilderProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  /** Workflow name displayed in the header. */
  name?: string;
  /** Controlled workflow steps (first step is the trigger). */
  steps?: FlowStep[];
  /** Uncontrolled initial workflow steps. */
  defaultSteps?: FlowStep[];
  /** Called whenever steps are added, moved, removed, or undone. */
  onStepsChange?: (steps: FlowStep[]) => void;
  /** Templates offered in the `+` step menu. */
  templates?: FlowTemplate[];
  /** Trigger templates offered when the flow is empty. */
  triggers?: FlowTemplate[];
  /** Step and path status map (`stepId` or `pathId` -> status). */
  status?: Record<string, FlowStepStatus>;
  /** Controlled selected step id. */
  selected?: string | null;
  /** Uncontrolled initial selected step id. */
  defaultSelected?: string | null;
  /** Called when step selection changes. */
  onSelect?: (stepId: string | null) => void;
  /** Run test handler (when omitted, runs built-in interactive test simulation). */
  onRun?: () => void;
  /** Stop test handler. */
  onStop?: () => void;
  /** Canvas viewport height in px, defaults to `420`. */
  height?: number;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style overrides. */
  style?: CSSProperties;
}

export type AfFlowBuilderPatternProps = AfFlowBuilderProps;

const PIXEL_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];
const AGENT_PIXEL_MASK = [1, 1, 1, 0, 1, 0, 1, 0, 1];

/* ---------------- Official Default Specimen & Templates ---------------- */

function buildDefaultSteps(): FlowStep[] {
  return [
    {
      id: "signup",
      kind: "trigger",
      icon: "form",
      title: "New signup",
      detail: "Signup form",
      note: "Someone signs up on the website",
    },
    {
      id: "research",
      kind: "agent",
      title: "Research the company",
      detail: "Claude · web search",
      note: "Reads their site, finds size and industry",
    },
    {
      id: "size",
      kind: "branch",
      icon: "branch",
      title: "Company size",
      detail: "employees > 200",
      note: "Goes on as Enterprise or Self-serve",
      paths: [
        {
          id: "path-enterprise",
          label: "Enterprise",
          steps: [
            {
              id: "ping",
              kind: "action",
              icon: "slack",
              title: "Tell sales",
              detail: "Slack · #new-accounts",
              note: "Posts the company brief for sales",
            },
            {
              id: "deal",
              kind: "action",
              icon: "database",
              title: "Create deal",
              detail: "CRM · Inbound pipeline",
              note: "Adds a deal with the research attached",
            },
          ],
        },
        {
          id: "path-self-serve",
          label: "Self-serve",
          steps: [
            {
              id: "welcome",
              kind: "action",
              icon: "mail",
              title: "Send welcome email",
              detail: "Gmail · from Flo",
              note: "A personal welcome, written from the research",
            },
            {
              id: "wait",
              kind: "wait",
              icon: "wait",
              title: "Wait",
              detail: "2 days",
              note: "Gives them time to look around",
            },
            {
              id: "tips",
              kind: "action",
              icon: "mail",
              title: "Send tips email",
              detail: "Gmail · 3 quick wins",
              note: "Three things worth trying first",
            },
          ],
        },
      ],
    },
  ];
}

const DEFAULT_TEMPLATES: FlowTemplate[] = [
  {
    kind: "agent",
    title: "Ask an agent",
    detail: "Search, write, decide",
    note: "Drafts or decides from context",
  },
  {
    kind: "action",
    icon: "mail",
    title: "Send email",
    detail: "Transactional · Reply",
    note: "Sends a tailored message",
  },
  {
    kind: "action",
    icon: "slack",
    title: "Post message",
    detail: "Slack · Email",
    note: "Posts an update to the channel",
  },
  {
    kind: "action",
    icon: "database",
    title: "Update record",
    detail: "CRM · Database",
    note: "Writes fields to the record",
  },
  {
    kind: "action",
    icon: "http",
    title: "HTTP request",
    detail: "POST · GET",
    note: "Calls an external endpoint",
  },
  {
    kind: "branch",
    icon: "branch",
    title: "If / else",
    detail: "Split into two paths",
    note: "Splits into two named paths",
    paths: ["Yes", "No"],
  },
  {
    kind: "wait",
    icon: "wait",
    title: "Wait",
    detail: "Delay · Until",
    note: "Pauses before the next step",
  },
];

const DEFAULT_TRIGGERS: FlowTemplate[] = [
  {
    kind: "trigger",
    icon: "form",
    title: "New signup",
    detail: "Signup form",
    note: "Someone signs up on the website",
  },
  {
    kind: "trigger",
    icon: "webhook",
    title: "Incoming webhook",
    detail: "POST /hooks/signup",
    note: "Fires when a payload arrives",
  },
  {
    kind: "trigger",
    icon: "schedule",
    title: "Every weekday at 9:00",
    detail: "Schedule · UTC",
    note: "Runs on a recurring timetable",
  },
];

/* ---------------- Crisp Official Glyphs ---------------- */

function FlowAgentMark({ busy }: { busy?: boolean }) {
  return (
    <span className="af-flbc__mark" data-busy={busy ? "" : undefined} aria-hidden="true">
      {AGENT_PIXEL_MASK.map((on, idx) => (
        <i
          key={idx}
          data-on={on ? "" : undefined}
          style={{ animationDelay: `${PIXEL_DELAYS[idx]}ms` }}
        />
      ))}
    </span>
  );
}

function FlowGlyph({ icon, kind }: { icon?: FlowIconName; kind: FlowStepKind }) {
  const resolved: FlowIconName =
    icon ??
    (kind === "trigger"
      ? "form"
      : kind === "branch"
        ? "branch"
        : kind === "wait"
          ? "wait"
          : "flash");

  switch (resolved) {
    case "form":
    case "schedule":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16.5 2V5M7.5 2V5M12 2V5" />
          <path d="M13 3.5H11C7.70017 3.5 6.05025 3.5 5.02513 4.52513C4 5.55025 4 7.20017 4 10.5V15C4 18.2998 4 19.9497 5.02513 20.9749C6.05025 22 7.70017 22 11 22H13C16.2998 22 17.9497 22 18.9749 20.9749C20 19.9497 20 18.2998 20 15V10.5C20 7.20017 20 5.55025 18.9749 4.52512C17.9497 3.5 16.2998 3.5 13 3.5Z" />
          <path d="M8 15H12M8 11H16" />
        </svg>
      );
    case "branch":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 19H13C15.8284 19 17.2426 19 18.1213 18.1213C19 17.2426 19 15.8284 19 13V10M19 10C19.7002 10 21.0085 11.9943 21.5 12.5M19 10C18.2998 10 16.9915 11.9943 16.5 12.5" />
          <path d="M5 7L5 17" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
        </svg>
      );
    case "slack":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 9.25V3.75C13 2.7835 13.7835 2 14.75 2C15.7165 2 16.5 2.7835 16.5 3.75V9.25C16.5 10.2165 15.7165 11 14.75 11C13.7835 11 13 10.2165 13 9.25Z" />
          <path d="M7.5 20.25V14.75C7.5 13.7835 8.2835 13 9.25 13C10.2165 13 11 13.7835 11 14.75V20.25C11 21.2165 10.2165 22 9.25 22C8.2835 22 7.5 21.2165 7.5 20.25Z" />
          <path d="M14.75 13L20.25 13C21.2165 13 22 13.7835 22 14.75C22 15.7165 21.2165 16.5 20.25 16.5L14.75 16.5C13.7835 16.5 13 15.7165 13 14.75C13 13.7835 13.7835 13 14.75 13Z" />
          <path d="M3.75 7.5L9.25 7.5C10.2165 7.5 11 8.2835 11 9.25C11 10.2165 10.2165 11 9.25 11L3.75 11C2.7835 11 2 10.2165 2 9.25C2 8.2835 2.7835 7.5 3.75 7.5Z" />
          <path d="M7 3.75C7 4.7165 7.7835 5.5 8.75 5.5H10.5V3.75C10.5 2.7835 9.7165 2 8.75 2C7.7835 2 7 2.7835 7 3.75Z" />
          <path d="M17 20.25C17 19.2835 16.2165 18.5 15.25 18.5H13.5V20.25C13.5 21.2165 14.2835 22 15.25 22C16.2165 22 17 21.2165 17 20.25Z" />
          <path d="M20.25 7C19.2835 7 18.5 7.7835 18.5 8.75L18.5 10.5H20.25C21.2165 10.5 22 9.7165 22 8.75C22 7.7835 21.2165 7 20.25 7Z" />
          <path d="M3.75 17C4.7165 17 5.5 16.2165 5.5 15.25V13.5L3.75 13.5C2.7835 13.5 2 14.2835 2 15.25C2 16.2165 2.7835 17 3.75 17Z" />
        </svg>
      );
    case "database":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M7 10.842C7.60158 11.0229 8.27434 11.1718 9 11.282" />
          <path d="M20 12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12" />
          <path d="M7 17.842C7.60158 18.0229 8.27434 18.1718 9 18.282" />
          <path d="M20 5V19C20 20.6569 16.4183 22 12 22C7.58172 22 4 20.6569 4 19V5" />
        </svg>
      );
    case "mail":
    case "message":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6" />
          <path d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z" />
        </svg>
      );
    case "wait":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8V12L14 14" />
        </svg>
      );
    case "http":
    case "webhook":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M3 12h18M12 2.5c2.6 2.7 4 5.9 4 9.5s-1.4 6.8-4 9.5c-2.6-2.7-4-5.9-4-9.5s1.4-6.8 4-9.5z" />
        </svg>
      );
    case "user":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5c0-3.2 3.1-5.5 7-5.5s7 2.3 7 5.5" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" />
        </svg>
      );
  }
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4V20M20 12H4" />
    </svg>
  );
}

function FlowGradientFloor() {
  const uid = useId().replace(/:/g, "");
  return (
    <span className="af-flbc__got" aria-hidden="true">
      <span className="af-flbc__floor">
        <span className="af-flbc__floor-turn">
          <span className="af-flbc__floor-rise">
            <span className="af-flbc__gf af-flbc__gf--color">
              <span className="af-flbc__gf-bleed">
                <svg viewBox="0 0 256 92" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id={`flbc-gfc-${uid}`} cx="50%" cy="88%" r="65%">
                      <stop offset="0%" stopColor="var(--af-flbc-floor-2)" />
                      <stop offset="60%" stopColor="var(--af-flbc-floor-1)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="128" cy="74" rx="124" ry="50" fill={`url(#flbc-gfc-${uid})`} />
                </svg>
              </span>
            </span>
            <span className="af-flbc__gf af-flbc__gf--light">
              <span className="af-flbc__gf-bleed">
                <svg viewBox="0 0 256 92" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id={`flbc-gfl-${uid}`} cx="50%" cy="92%" r="55%">
                      <stop offset="0%" stopColor="var(--af-flbc-floor-3)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="128" cy="80" rx="92" ry="36" fill={`url(#flbc-gfl-${uid})`} />
                </svg>
              </span>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

/* ---------------- Tree Manipulation Helpers ---------------- */

type InsertTarget = { pathId: string | null; index: number; label: string };

function countSteps(list: FlowStep[]): number {
  let n = 0;
  for (const s of list) {
    n += 1;
    if (s.paths) {
      for (const p of s.paths) n += countSteps(p.steps);
    }
  }
  return n;
}

function flattenReadingOrder(list: FlowStep[]): FlowStep[] {
  const out: FlowStep[] = [];
  const walk = (arr: FlowStep[]) => {
    for (const s of arr) {
      out.push(s);
      if (s.paths) {
        for (const p of s.paths) walk(p.steps);
      }
    }
  };
  walk(list);
  return out;
}

function insertIntoTree(list: FlowStep[], target: InsertTarget, item: FlowStep): FlowStep[] {
  if (target.pathId === null) {
    const copy = [...list];
    copy.splice(target.index, 0, item);
    return copy;
  }
  return list.map((s) => {
    if (!s.paths) return s;
    return {
      ...s,
      paths: s.paths.map((p) => {
        if (p.id === target.pathId) {
          const copy = [...p.steps];
          copy.splice(target.index, 0, item);
          return { ...p, steps: copy };
        }
        return { ...p, steps: insertIntoTree(p.steps, target, item) };
      }),
    };
  });
}

function removeFromTree(
  list: FlowStep[],
  stepId: string,
): { next: FlowStep[]; focusFallbackId: string | null; removedTitle: string | null } {
  let removedTitle: string | null = null;
  let focusFallbackId: string | null = null;

  const walk = (arr: FlowStep[]): FlowStep[] => {
    const idx = arr.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      const target = arr[idx];
      removedTitle = target.title;
      focusFallbackId = arr[idx - 1]?.id ?? arr[idx + 1]?.id ?? null;
      const before = arr.slice(0, idx);
      const after = arr.slice(idx + 1);
      // Official rule: removing an If / else hands its first path's steps back up
      const promoted = target.kind === "branch" && target.paths?.[0] ? target.paths[0].steps : [];
      return [...before, ...promoted, ...after];
    }
    return arr.map((s) =>
      s.paths
        ? {
            ...s,
            paths: s.paths.map((p) => ({ ...p, steps: walk(p.steps) })),
          }
        : s,
    );
  };

  return { next: walk(list), focusFallbackId, removedTitle };
}

function moveInSiblingList(
  list: FlowStep[],
  stepId: string,
  delta: -1 | 1,
  isRootLevel = true,
): { next: FlowStep[]; moved: boolean } {
  let moved = false;
  const walk = (arr: FlowStep[], rootLevel: boolean): FlowStep[] => {
    const idx = arr.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      const minIdx = rootLevel ? 1 : 0; // Keep root trigger at index 0
      const nextIdx = idx + delta;
      if (idx < minIdx || nextIdx < minIdx || nextIdx >= arr.length) return arr;
      const copy = [...arr];
      const [picked] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, picked);
      moved = true;
      return copy;
    }
    return arr.map((s) =>
      s.paths
        ? {
            ...s,
            paths: s.paths.map((p) => ({ ...p, steps: walk(p.steps, false) })),
          }
        : s,
    );
  };
  return { next: walk(list, isRootLevel), moved };
}

function kindTagText(kind: FlowStepKind): string {
  switch (kind) {
    case "trigger":
      return "Trigger";
    case "agent":
      return "Agent";
    case "branch":
      return "If / else";
    case "wait":
      return "Wait";
    default:
      return "Action";
  }
}

function defaultActText(step: FlowStep): string {
  if (step.note) return step.note;
  switch (step.kind) {
    case "trigger":
      return "Starts this workflow automatically";
    case "agent":
      return "Reasons over context and calls tools";
    case "branch":
      return "Routes into the matching path";
    case "wait":
      return "Waits before continuing";
    default:
      return step.detail || "Runs this action";
  }
}

/* ---------------- Main Component ---------------- */

export function AfFlowBuilder({
  name = "Onboard new signups",
  steps: controlledSteps,
  defaultSteps,
  onStepsChange,
  templates = DEFAULT_TEMPLATES,
  triggers = DEFAULT_TRIGGERS,
  status: controlledStatus,
  selected: controlledSelected,
  defaultSelected = null,
  onSelect,
  onRun,
  onStop,
  height = 420,
  className,
  style,
  ...restProps
}: AfFlowBuilderProps) {
  const baseUid = useId().replace(/:/g, "");
  const seqCounterRef = useRef(100);

  const [internalSteps, setInternalSteps] = useState<FlowStep[]>(
    () => defaultSteps ?? buildDefaultSteps(),
  );
  const flowSteps = controlledSteps ?? internalSteps;

  const [undoStack, setUndoStack] = useState<FlowStep[][]>([]);
  const [internalSelected, setInternalSelected] = useState<string | null>(defaultSelected);
  const selectedId = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const [simStatus, setSimStatus] = useState<Record<string, FlowStepStatus>>({});
  const [stepDurations, setStepDurations] = useState<Record<string, number>>({});
  const [runNote, setRunNote] = useState<{
    tone?: "info" | "ok" | "alert";
    pill?: string;
    text: string;
  } | null>(null);

  const activeStatus = controlledStatus ?? simStatus;

  const setSelection = useCallback(
    (next: string | null) => {
      if (controlledSelected === undefined) {
        setInternalSelected(next);
      }
      onSelect?.(next);
    },
    [controlledSelected, onSelect],
  );

  const commitSteps = useCallback(
    (next: FlowStep[], announcement: string) => {
      setUndoStack((prev) => [...prev.slice(-19), flowSteps]);
      if (controlledSteps === undefined) {
        setInternalSteps(next);
      }
      onStepsChange?.(next);
      if (!controlledStatus) {
        setSimStatus({});
        setStepDurations({});
      }
      setRunNote({ text: announcement });
    },
    [flowSteps, controlledSteps, onStepsChange, controlledStatus],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    if (controlledSteps === undefined) {
      setInternalSteps(prev);
    }
    onStepsChange?.(prev);
    setSelection(null);
    setRunNote({ text: "Undid last change" });
  }, [undoStack, controlledSteps, onStepsChange, setSelection]);

  // Measure live step elapsed durations (`0.2s` -> `0.7s`) whenever status changes
  const stepStartTimesRef = useRef<Record<string, number>>({});
  const isRunning = useMemo(
    () => Object.values(activeStatus).some((st) => st === "running"),
    [activeStatus],
  );

  useEffect(() => {
    const now = performance.now();
    for (const [id, st] of Object.entries(activeStatus)) {
      if (st === "running" && stepStartTimesRef.current[id] === undefined) {
        stepStartTimesRef.current[id] = now;
      } else if (st !== "running" && stepStartTimesRef.current[id] !== undefined) {
        const elapsed = Math.max(100, now - stepStartTimesRef.current[id]);
        delete stepStartTimesRef.current[id];
        setStepDurations((prev) => ({ ...prev, [id]: elapsed }));
      }
    }
  }, [activeStatus]);

  useEffect(() => {
    if (!isRunning) return;
    const tick = window.setInterval(() => {
      const now = performance.now();
      setStepDurations((prev) => {
        const next = { ...prev };
        for (const [id, startedAt] of Object.entries(stepStartTimesRef.current)) {
          next[id] = Math.max(100, now - startedAt);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(tick);
  }, [isRunning]);

  // Built-in interactive test run simulation
  const runTimersRef = useRef<number[]>([]);
  const clearRunTimers = useCallback(() => {
    runTimersRef.current.forEach((t) => window.clearTimeout(t));
    runTimersRef.current = [];
  }, []);

  useEffect(() => () => clearRunTimers(), [clearRunTimers]);

  const runBranchToggleRef = useRef(0);
  const startSimulation = useCallback(() => {
    if (onRun) {
      onRun();
      return;
    }
    clearRunTimers();
    stepStartTimesRef.current = {};
    setStepDurations({});
    setSelection(null);

    // Build execution trace picking alternate branch path on each test run
    const branchPick = runBranchToggleRef.current % 2;
    runBranchToggleRef.current += 1;

    const execSteps: FlowStep[] = [];
    const skippedPathIds: string[] = [];
    let chosenPathLabel = "";

    const collect = (arr: FlowStep[]) => {
      for (const s of arr) {
        execSteps.push(s);
        if (s.kind === "branch" && s.paths && s.paths.length > 0) {
          const pickedIdx = Math.min(branchPick, s.paths.length - 1);
          chosenPathLabel = s.paths[pickedIdx].label;
          s.paths.forEach((p, idx) => {
            if (idx === pickedIdx) collect(p.steps);
            else skippedPathIds.push(p.id);
          });
        }
      }
    };
    collect(flowSteps);
    if (execSteps.length === 0) return;

    const nextMap: Record<string, FlowStepStatus> = {};
    let delay = 0;

    execSteps.forEach((step, idx) => {
      const wallDur = idx === 0 ? 180 : step.kind === "agent" ? 440 : 340;
      const displayDur = idx === 0 ? 600 : step.kind === "agent" ? 900 : 500;
      const tStart = window.setTimeout(() => {
        nextMap[step.id] = "running";
        setSimStatus({ ...nextMap });
        setRunNote({
          tone: "info",
          pill: "Running",
          text: `${step.title}…`,
        });
      }, delay);
      runTimersRef.current.push(tStart);

      delay += wallDur;

      const tDone = window.setTimeout(() => {
        delete stepStartTimesRef.current[step.id];
        nextMap[step.id] = "done";
        if (step.kind === "branch") {
          for (const pid of skippedPathIds) nextMap[pid] = "skipped";
        }
        setSimStatus({ ...nextMap });
        setStepDurations((prev) => ({ ...prev, [step.id]: displayDur }));
        if (idx === execSteps.length - 1) {
          setRunNote({
            tone: "ok",
            pill: "Passed",
            text: chosenPathLabel
              ? `${execSteps.length} steps passed · ${chosenPathLabel} path`
              : `${execSteps.length} steps passed`,
          });
        }
      }, delay);
      runTimersRef.current.push(tDone);
    });
  }, [onRun, clearRunTimers, flowSteps, setSelection]);

  const isDefaultDemo =
    !controlledSteps && !controlledStatus && !defaultSteps && !onRun;
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (!isDefaultDemo || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    startSimulation();
  }, [isDefaultDemo, startSimulation]);

  const stopSimulation = useCallback(() => {
    if (onStop) {
      onStop();
      return;
    }
    clearRunTimers();
    stepStartTimesRef.current = {};
    setSimStatus((prev) => {
      const copy: Record<string, FlowStepStatus> = {};
      for (const [k, v] of Object.entries(prev)) {
        copy[k] = v === "running" ? "idle" : v;
      }
      return copy;
    });
    setRunNote({ text: "Test run stopped" });
  }, [onStop, clearRunTimers]);

  // Canvas centering on mount & drag-to-pan
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [panning, setPanning] = useState(false);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollL: number;
    scrollT: number;
  } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) / 2);
    }
  }, []);

  const handleCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    const el = canvasRef.current;
    if (!el) return;
    panStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollL: el.scrollLeft,
      scrollT: el.scrollTop,
    };
  };

  const handleCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = panStateRef.current;
    const el = canvasRef.current;
    if (!st || !el || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!panning && Math.hypot(dx, dy) > 4) {
      setPanning(true);
    }
    if (panning || Math.hypot(dx, dy) > 4) {
      el.scrollLeft = st.scrollL - dx;
      el.scrollTop = st.scrollT - dy;
    }
  };

  const handleCanvasPointerUp = () => {
    panStateRef.current = null;
    if (panning) setPanning(false);
  };

  // `+` Menu state & positioning
  const [menuState, setMenuState] = useState<{
    target: InsertTarget;
    isTriggerMenu: boolean;
    anchorEl: HTMLButtonElement;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stepBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; up: boolean } | null>(null);

  const activeMenuTemplates = menuState?.isTriggerMenu ? triggers : templates;

  useIsomorphicLayoutEffect(() => {
    if (!menuState) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const r = menuState.anchorEl.getBoundingClientRect();
      const menuW = 248;
      const menuH = menuRef.current?.offsetHeight ?? 264;
      const up = window.innerHeight - r.bottom < menuH + 12 && r.top > menuH + 12;
      const left = Math.max(
        10,
        Math.min(window.innerWidth - menuW - 10, Math.round(r.left + r.width / 2 - menuW / 2)),
      );
      const top = up ? Math.round(r.top - menuH - 6) : Math.round(r.bottom + 6);
      setMenuPos({ left, top, up });
    };
    update();
    const raf = window.requestAnimationFrame(() => {
      update();
      menuItemRefs.current[0]?.focus();
    });
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [menuState]);

  useEffect(() => {
    if (!menuState) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || menuState.anchorEl.contains(target)) return;
      setMenuState(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuState]);

  const instantiateTemplate = (tpl: FlowTemplate): FlowStep => {
    seqCounterRef.current += 1;
    const id = `step-${seqCounterRef.current}`;
    if (tpl.kind === "branch") {
      const labels = tpl.paths && tpl.paths.length >= 2 ? tpl.paths : ["Yes", "No"];
      return {
        id,
        kind: "branch",
        icon: tpl.icon ?? "branch",
        title: tpl.title,
        detail: tpl.detail,
        note: tpl.note,
        paths: labels.map((lbl, idx) => ({
          id: `${id}-p${idx + 1}`,
          label: lbl,
          steps: [],
        })),
      };
    }
    return {
      id,
      kind: tpl.kind,
      icon: tpl.icon,
      title: tpl.title,
      detail: tpl.detail,
      note: tpl.note,
    };
  };

  // Global Cmd/Ctrl+Z and Esc shortcuts when focus is inside the builder
  const readingOrder = useMemo(() => flattenReadingOrder(flowSteps), [flowSteps]);
  const totalStepCount = useMemo(() => countSteps(flowSteps), [flowSteps]);
  const selectedStep = useMemo(
    () => (selectedId ? readingOrder.find((s) => s.id === selectedId) ?? null : null),
    [readingOrder, selectedId],
  );

  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      if (undoStack.length > 0 && !isRunning) {
        e.preventDefault();
        handleUndo();
      }
      return;
    }
    if (e.key === "Escape") {
      if (menuState) {
        e.preventDefault();
        const anchor = menuState.anchorEl;
        setMenuState(null);
        anchor.focus();
      } else if (selectedId) {
        e.preventDefault();
        setSelection(null);
      }
    }
  };

  const handleStepKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, step: FlowStep) => {
    const idx = readingOrder.findIndex((s) => s.id === step.id);
    const focusAt = (targetIdx: number) => {
      const clamped = Math.max(0, Math.min(readingOrder.length - 1, targetIdx));
      const targetId = readingOrder[clamped]?.id;
      if (targetId) stepBtnRefs.current.get(targetId)?.focus();
    };

    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && !isRunning) {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? -1 : 1;
      const res = moveInSiblingList(flowSteps, step.id, delta);
      if (res.moved) {
        commitSteps(res.next, `Moved ${step.title}`);
        window.requestAnimationFrame(() => stepBtnRefs.current.get(step.id)?.focus());
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAt(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAt(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAt(readingOrder.length - 1);
    } else if ((e.key === "Backspace" || e.key === "Delete") && !isRunning) {
      // Allow deleting any step except the root trigger when other steps still depend on it
      if (flowSteps[0]?.id === step.id && flowSteps.length > 1) return;
      e.preventDefault();
      const { next, focusFallbackId, removedTitle } = removeFromTree(flowSteps, step.id);
      setSelection(null);
      commitSteps(next, `Removed ${removedTitle ?? step.title}`);
      if (focusFallbackId) {
        window.requestAnimationFrame(() => stepBtnRefs.current.get(focusFallbackId)?.focus());
      }
    }
  };

  const renderLink = (
    target: InsertTarget,
    animIndex: number,
    options: { showDot: boolean; isEnd?: boolean; flowTone?: FlowStepStatus },
  ) => {
    const isMenuAnchor =
      menuState &&
      !menuState.isTriggerMenu &&
      menuState.target.pathId === target.pathId &&
      menuState.target.index === target.index;

    return (
      <div
        className="af-flbc__link"
        data-end={options.isEnd ? "" : undefined}
        data-flow={options.flowTone && options.flowTone !== "idle" ? options.flowTone : undefined}
        style={{ "--af-flbc-i": animIndex } as CSSProperties}
      >
        {options.showDot ? <i className="af-flbc__dot" /> : null}
        <button
          type="button"
          className="af-flbc__plus"
          aria-label={target.label}
          aria-haspopup="menu"
          aria-expanded={Boolean(isMenuAnchor)}
          onClick={(e) => {
            const btn = e.currentTarget;
            setMenuState((prev) =>
              prev &&
              prev.target.pathId === target.pathId &&
              prev.target.index === target.index
                ? null
                : { target, isTriggerMenu: false, anchorEl: btn },
            );
          }}
        >
          <PlusGlyph />
        </button>
      </div>
    );
  };

  let staggerCounter = 0;

  const renderStepSequence = (
    arr: FlowStep[],
    pathId: string | null,
    pathLabel: string | null,
    inheritedSkipped: boolean,
  ): ReactNode => {
    return (
      <>
        {arr.map((step, idx) => {
          const itemStagger = staggerCounter;
          staggerCounter += 1;

          const rawSt = activeStatus[step.id] ?? "idle";
          const stepSt: FlowStepStatus = inheritedSkipped ? "skipped" : rawSt;
          const isSelected = selectedId === step.id;
          const statusElemId = `${baseUid}-${step.id}-st`;

          const tagTone =
            stepSt === "running"
              ? "running"
              : stepSt === "done"
                ? "done"
                : stepSt === "failed"
                  ? "failed"
                  : undefined;

          const tagLabel =
            stepSt === "running"
              ? "Running"
              : stepSt === "done"
                ? "Passed"
                : stepSt === "failed"
                  ? "Failed"
                  : stepSt === "skipped"
                    ? "Skipped"
                    : kindTagText(step.kind);

          const elapsedMs = stepDurations[step.id];
          const numReading =
            stepSt === "idle" || stepSt === "skipped" || elapsedMs === undefined
              ? "–"
              : `${(elapsedMs / 1000).toFixed(1)}s`;

          const prevStep = idx > 0 ? arr[idx - 1] : null;
          const linkTarget: InsertTarget | null =
            pathId === null && idx === 0
              ? null
              : {
                  pathId,
                  index: idx,
                  label:
                    idx === 0 && pathLabel
                      ? `Add a step at the start of ${pathLabel}`
                      : `Add a step after ${prevStep?.title ?? "previous step"}`,
                };

          const canRemove =
            isSelected && !isRunning && !(pathId === null && idx === 0 && flowSteps.length > 1);

          return (
            <div key={step.id} className="af-flbc__item">
              {linkTarget
                ? renderLink(linkTarget, itemStagger, {
                    showDot: !(pathId !== null && idx === 0),
                    flowTone: stepSt,
                  })
                : null}

              <div
                className="af-flbc__step"
                data-step={step.id}
                data-kind={step.kind}
                data-status={stepSt !== "idle" ? stepSt : undefined}
                data-selected={isSelected ? "" : undefined}
                style={{ "--af-flbc-i": itemStagger } as CSSProperties}
              >
                <button
                  ref={(el) => {
                    if (el) stepBtnRefs.current.set(step.id, el);
                    else stepBtnRefs.current.delete(step.id);
                  }}
                  type="button"
                  className="af-flbc__card"
                  aria-pressed={isSelected}
                  aria-describedby={statusElemId}
                  title={step.detail ? `${step.title} – ${step.detail}` : step.title}
                  onClick={() => setSelection(isSelected ? null : step.id)}
                  onKeyDown={(e) => handleStepKeyDown(e, step)}
                >
                  <span className="af-flbc__face">
                    {stepSt === "running" ? <FlowGradientFloor /> : null}

                    <span className="af-flbc__top">
                      <span className="af-flbc__tile">
                        {step.kind === "agent" ? (
                          <FlowAgentMark busy={stepSt === "running"} />
                        ) : (
                          <FlowGlyph icon={step.icon} kind={step.kind} />
                        )}
                      </span>
                      <span className="af-flbc__text">
                        <span className="af-flbc__title" dir="auto">
                          {step.title}
                        </span>
                        {step.detail ? (
                          <span className="af-flbc__detail" dir="auto">
                            {step.detail}
                          </span>
                        ) : null}
                      </span>
                      <span className="af-flbc__tag" id={statusElemId} data-tone={tagTone}>
                        {stepSt === "running" ? (
                          <span className="af-flbc__spin" aria-hidden="true" />
                        ) : stepSt === "done" ? (
                          <svg
                            className="af-flbc__check"
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="m2.3 6.2 2.4 2.4 5-5.2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                        {tagLabel}
                      </span>
                    </span>

                    <span
                      className="af-flbc__act"
                      dir="auto"
                      data-live={stepSt === "running" ? "" : undefined}
                    >
                      {defaultActText(step)}
                    </span>

                    <span className="af-flbc__meter-row" aria-hidden="true">
                      <span className="af-flbc__meter" data-tone={tagTone}>
                        <i />
                      </span>
                      <span className="af-flbc__num">{numReading}</span>
                    </span>
                  </span>
                </button>

                {canRemove ? (
                  <button
                    type="button"
                    className="af-flbc__remove"
                    aria-label={`Remove ${step.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const { next, focusFallbackId, removedTitle } = removeFromTree(
                        flowSteps,
                        step.id,
                      );
                      setSelection(null);
                      commitSteps(next, `Removed ${removedTitle ?? step.title}`);
                      if (focusFallbackId) {
                        window.requestAnimationFrame(() =>
                          stepBtnRefs.current.get(focusFallbackId)?.focus(),
                        );
                      }
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M18 6L6 18M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>

              {step.kind === "branch" && step.paths && step.paths.length > 0 ? (
                <div className="af-flbc__fork" style={{ "--af-flbc-i": itemStagger } as CSSProperties}>
                  <i className="af-flbc__dot" />
                  <div className="af-flbc__lanes">
                    {step.paths.map((lane) => {
                      const laneSkipped = inheritedSkipped || activeStatus[lane.id] === "skipped";
                      const lastInLane = lane.steps[lane.steps.length - 1];
                      return (
                        <div
                          key={lane.id}
                          className="af-flbc__lane"
                          data-skipped={laneSkipped ? "" : undefined}
                        >
                          <span className="af-flbc__path" title={lane.label} dir="auto">
                            {lane.label}
                          </span>
                          {renderStepSequence(lane.steps, lane.id, lane.label, laneSkipped)}
                          {renderLink(
                            {
                              pathId: lane.id,
                              index: lane.steps.length,
                              label: lastInLane
                                ? `Add a step after ${lastInLane.title}`
                                : `Add a step at the start of ${lane.label}`,
                            },
                            staggerCounter + 1,
                            {
                              showDot: lane.steps.length > 0,
                              isEnd: true,
                              flowTone: laneSkipped ? "skipped" : undefined,
                            },
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </>
    );
  };

  const endsWithBranch =
    flowSteps.length > 0 && flowSteps[flowSteps.length - 1].kind === "branch";
  const canRunTest = totalStepCount >= 2;

  return (
    <section
      className={cn("af-flbc", className)}
      data-running={isRunning ? "" : undefined}
      data-selecting={selectedId ? "" : undefined}
      aria-label={name}
      style={style}
      onKeyDown={handleRootKeyDown}
      {...restProps}
    >
      <header className="af-flbc__head">
        <div className="af-flbc__name">
          <h3 title={name} dir="auto">
            {name}
          </h3>
          <span dir="auto">
            {totalStepCount} {totalStepCount === 1 ? "step" : "steps"}
          </span>
        </div>

        <button
          type="button"
          className="af-flbc__run"
          data-solid={isRunning ? undefined : ""}
          disabled={!isRunning && !canRunTest}
          onClick={isRunning ? stopSimulation : startSimulation}
        >
          {isRunning ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2.2" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z" />
              </svg>
              Run test
            </>
          )}
        </button>
      </header>

      <div
        ref={canvasRef}
        className="af-flbc__canvas"
        role="group"
        aria-label="Workflow steps"
        data-panning={panning ? "" : undefined}
        style={{ height: `${height}px` }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("af-flbc__flow")) {
            if (selectedId) setSelection(null);
          }
        }}
      >
        <div className="af-flbc__flow">
          {flowSteps.length === 0 ? (
            <button
              type="button"
              className="af-flbc__start"
              aria-haspopup="menu"
              aria-expanded={Boolean(menuState?.isTriggerMenu)}
              onClick={(e) => {
                const btn = e.currentTarget;
                setMenuState((prev) =>
                  prev?.isTriggerMenu
                    ? null
                    : {
                        target: { pathId: null, index: 0, label: "Add a trigger" },
                        isTriggerMenu: true,
                        anchorEl: btn,
                      },
                );
              }}
            >
              <span className="af-flbc__tile">
                <PlusGlyph />
              </span>
              <span className="af-flbc__text">
                <span className="af-flbc__title">Add a trigger</span>
                <span className="af-flbc__detail">Choose what starts this workflow</span>
              </span>
            </button>
          ) : (
            <>
              {renderStepSequence(flowSteps, null, null, false)}
              {!endsWithBranch
                ? renderLink(
                    {
                      pathId: null,
                      index: flowSteps.length,
                      label: `Add a step after ${flowSteps[flowSteps.length - 1].title}`,
                    },
                    staggerCounter + 1,
                    { showDot: true, isEnd: true },
                  )
                : null}
            </>
          )}
        </div>
      </div>

      <footer className="af-flbc__foot" role="status" aria-live="polite">
        {selectedStep && !isRunning ? (
          <span className="af-flbc__note" data-keys="">
            <b>{selectedStep.title}</b>
            <span className="af-flbc__note-text">
              <kbd>⌥↑↓</kbd> move · <kbd>⌫</kbd> remove
            </span>
          </span>
        ) : runNote ? (
          <span className="af-flbc__note">
            {runNote.pill ? (
              <span className="af-flbc__pill" data-tone={runNote.tone}>
                {runNote.pill}
              </span>
            ) : null}
            <span className="af-flbc__note-text">{runNote.text}</span>
          </span>
        ) : (
          <span className="af-flbc__note">Add steps with the + on each line</span>
        )}

        {undoStack.length > 0 && !isRunning ? (
          <button type="button" className="af-flbc__undo" onClick={handleUndo}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
            Undo
          </button>
        ) : null}
      </footer>

      {/* `+` Step Insertion Menu */}
      {menuState && menuPos ? (
        <AfPortal>
          <div
            ref={menuRef}
            role="menu"
            aria-label={menuState.target.label}
            className="af-flbc__menu"
            data-up={menuPos.up ? "" : undefined}
            style={{
              left: `${menuPos.left}px`,
              top: `${menuPos.top}px`,
            }}
            onKeyDown={(e) => {
              const items = menuItemRefs.current.filter(Boolean) as HTMLButtonElement[];
              const curIdx = items.indexOf(document.activeElement as HTMLButtonElement);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                items[(curIdx + 1) % items.length]?.focus();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                items[(curIdx - 1 + items.length) % items.length]?.focus();
              } else if (e.key === "Home") {
                e.preventDefault();
                items[0]?.focus();
              } else if (e.key === "End") {
                e.preventDefault();
                items[items.length - 1]?.focus();
              } else if (e.key === "Escape") {
                e.preventDefault();
                const anchor = menuState.anchorEl;
                setMenuState(null);
                anchor.focus();
              }
            }}
          >
            {activeMenuTemplates.map((tpl, idx) => (
              <button
                key={`${tpl.kind}-${tpl.title}-${idx}`}
                ref={(el) => {
                  menuItemRefs.current[idx] = el;
                }}
                type="button"
                role="menuitem"
                className="af-flbc__item-btn"
                onClick={() => {
                  clearRunTimers();
                  const created = instantiateTemplate(tpl);
                  const next = insertIntoTree(flowSteps, menuState.target, created);
                  setMenuState(null);
                  commitSteps(next, `Added ${created.title}`);
                  setSelection(created.id);
                  window.requestAnimationFrame(() => stepBtnRefs.current.get(created.id)?.focus());
                }}
              >
                <span className="af-flbc__menu-icon">
                  {tpl.kind === "agent" ? (
                    <FlowAgentMark />
                  ) : (
                    <FlowGlyph icon={tpl.icon} kind={tpl.kind} />
                  )}
                </span>
                <span className="af-flbc__menu-text">
                  <span>{tpl.title}</span>
                  {tpl.detail ? <span>{tpl.detail}</span> : null}
                </span>
              </button>
            ))}
          </div>
        </AfPortal>
      ) : null}
    </section>
  );
}

export const AfFlowBuilderPattern = AfFlowBuilder;
export const FlowBuilder = AfFlowBuilder;
