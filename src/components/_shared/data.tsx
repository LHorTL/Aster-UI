import { useEffect, useRef, useState, type ReactNode } from "react";
import { AfButton, AfCheckbox, AfDescriptions, AfDrawer, AfInput, AfKbd, AfSegmented } from "../../ui";
import { AfIcon } from "../../icons";

/* ------------------------------------------------------------------ */
/* Shared Formatters & Shells                                         */
/* ------------------------------------------------------------------ */

/** Integer thousands formatter. */
export const formatInt = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value));

/** Compact axis/legend formatter (k / M) so tick labels stay single-line. */
export const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
};

/** Preview wrapper providing consistent width and vertical rhythm. */
export function Demo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["af-dt-demo", className].filter(Boolean).join(" ")}>{children}</div>;
}

/** Optional specimen caption note. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="af-dt-note">{children}</p>;
}

/** Card-level header (h3 + description + right-aligned extra slot). */
export function CardHead({ title, description, extra }: { title: ReactNode; description?: ReactNode; extra?: ReactNode }) {
  return (
    <header className="af-dt-cardhead">
      <div className="af-dt-cardhead__text">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {extra ? <div className="af-dt-cardhead__extra">{extra}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Data Table · Design Stack (affectUI Pro 1:1)                       */
/* ------------------------------------------------------------------ */

/** Row category / status label (supports English categories & custom strings). */
export type SessionState = string;

/** Data table record. */
export type SessionRow = {
  /** Row identifier. */
  id: string;
  /** Tool or session name. */
  title: string;
  /** Website domain or project slug. */
  project: string;
  /** Category or status badge text. */
  status: SessionState;
  /** Renewal date or relative timestamp. */
  time: string;
  /** Optional brand mark identifier. */
  brand?: "figma" | "linear" | "vercel" | "framer" | "loom";
};

/** Default Design Stack rows (1:1 affectui.com). */
export const SESSION_ROWS: SessionRow[] = [
  { id: "S-0248", title: "Figma", status: "Design", project: "figma.com", time: "Mar 12, 2026", brand: "figma" },
  { id: "S-0247", title: "Linear", status: "Issue tracking", project: "linear.app", time: "Jan 4, 2026", brand: "linear" },
  { id: "S-0246", title: "Vercel", status: "Hosting", project: "vercel.com", time: "Aug 21, 2026", brand: "vercel" },
  { id: "S-0245", title: "Framer", status: "Website", project: "framer.com", time: "May 2, 2026", brand: "framer" },
  { id: "S-0244", title: "Loom", status: "Video", project: "loom.com", time: "Nov 18, 2026", brand: "loom" },
];

/** Semantic badge tone for table category/status. */
export const sessionTone = (status: SessionState) => {
  if (status === "Design") return "violet";
  if (status === "Issue tracking") return "blue";
  if (status === "Hosting") return "neutral";
  if (status === "Website") return "pink";
  return "green";
};

/** Cell coordinate: row index + data col index (0 Tool / 1 Category / 2 Website / 3 Renews). */
export type CellPoint = { row: number; col: number };

/** Tri-state 14px table checkbox built on AfCheckbox. */
export function TableCheck({ checked, mixed, label, onChange }: { checked: boolean; mixed?: boolean; label: string; onChange: () => void }) {
  return (
    <AfCheckbox
      size="sm"
      checked={checked}
      indeterminate={Boolean(mixed)}
      ariaLabel={label}
      onChange={() => onChange()}
      className="af-dt-dtc__check"
    />
  );
}

/** Row detail drawer built on AfDrawer (420px right sheet, Escape close, inert backdrop). */
export function SessionDrawer({ stage, row, onClose, onSave }: { stage?: HTMLElement | null; row: SessionRow; onClose: () => void; onSave: (next: SessionRow) => void }) {
  const [title, setTitle] = useState(row.title);
  const [status, setStatus] = useState<SessionState>(row.status);
  const dirty = title.trim() !== row.title || status !== row.status;
  const baseCategories = ["Design", "Issue tracking", "Hosting", "Website", "Video"];
  const segOptions = baseCategories.includes(status)
    ? baseCategories.map((c) => ({ value: c, label: c }))
    : [...baseCategories.slice(0, 4), status].map((c) => ({ value: c, label: c }));

  return (
    <AfDrawer
      open
      container={stage}
      onClose={onClose}
      title="Record details"
      description={`${row.id} · ${row.project}`}
      footer={
        <>
          <span className="af-dt-drawerhint">{dirty ? "Unsaved changes" : "Edit fields and save to apply"}</span>
          <AfButton onClick={onClose}>Cancel</AfButton>
          <AfButton variant="primary" disabled={!dirty || !title.trim()} onClick={() => onSave({ ...row, title: title.trim(), status })}>Save changes</AfButton>
        </>
      }
    >
      <div className="af-dt-field">
        <span>Tool</span>
        <AfInput value={title} aria-label="Tool name" onChange={(event) => setTitle(event.target.value)} error={title.trim() ? undefined : "Enter a tool name"} />
      </div>
      <div className="af-dt-field">
        <span>Category</span>
        <AfSegmented
          label="Category"
          value={status}
          onChange={setStatus}
          options={segOptions}
        />
      </div>
      <AfDescriptions
        columns={3}
        size="sm"
        className="af-dt-facts-desc"
        items={[
          { key: "project", label: "Website", children: row.project },
          { key: "time", label: "Renews", children: row.time },
          { key: "id", label: "ID", children: row.id, mono: true },
        ]}
      />
      <div className="af-dt-history">
        <h4>Activity</h4>
        <div><i aria-hidden /><p>Verified workspace domain<small>12:40:08 · Done</small></p></div>
        <div><i aria-hidden /><p>Synced billing renewal schedule<small>12:40:12 · Done</small></p></div>
        <div><i aria-hidden /><p>Active in {status}<small>12:40:18 · {row.time}</small></p></div>
      </div>
    </AfDrawer>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdown Chart · Sprint 24 (affectUI Pro 1:1)                     */
/* ------------------------------------------------------------------ */

/** Slice dimension for stacked bars. */
export type BccSlice = "status" | "owner";

/** Segment dimension for stacked bars. */
export type BccSegment = "priority" | "type";

/** Atomic record: status × owner × priority × type. */
export type BreakdownRecord = {
  status: string;
  owner: string;
  priority: string;
  type: string;
  count: number;
  points: number;
};

/** Ordered slice & segment dimensions. */
export const BCC_STATUS = ["Backlog", "Todo", "In progress", "In review", "Done", "Canceled"];

export const BCC_OWNER = ["Mara", "Jonas", "Priya"];

export const BCC_PRIORITY = ["Urgent", "High", "Medium", "Low", "None"];

export const BCC_TYPE = ["Feature", "Bug", "Chore"];

/** Segment palettes: semantic priority colors & series type colors. */
export const BCC_PRIORITY_COLORS = ["var(--af-danger)", "var(--af-warning)", "var(--af-accent-ink)", "var(--af-data-3)", "var(--af-data-rest)"];

export const BCC_TYPE_COLORS = ["var(--af-series-1)", "var(--af-series-2)", "var(--af-series-3)"];

/** Realistic skewed Sprint 24 distribution (26 + 36 + 34 + 13 + 96 + 7 = 212 tasks). */
const BCC_MATRIX: number[][] = [
  [3, 6, 6, 8, 3],
  [1, 7, 12, 11, 5],
  [1, 9, 12, 7, 5],
  [0, 1, 6, 4, 2],
  [7, 14, 23, 25, 27],
  [0, 1, 3, 1, 2],
];

/** Default Sprint 24 records across status × priority. */
export const BCC_RECORDS: BreakdownRecord[] = BCC_STATUS.flatMap((status, statusIndex) =>
  BCC_PRIORITY.map((priority, priorityIndex) => {
    const count = BCC_MATRIX[statusIndex]?.[priorityIndex] ?? 0;
    return {
      status,
      owner: BCC_OWNER[(statusIndex + priorityIndex) % BCC_OWNER.length],
      priority,
      type: BCC_TYPE[(statusIndex + priorityIndex) % BCC_TYPE.length],
      count,
      points: count * (priorityIndex === 0 ? 5 : priorityIndex === 1 ? 3 : priorityIndex === 2 ? 2 : 1),
    };
  }),
);

/** Icon name for each slice key. */
export const bccSliceIcon = (value: string) => {
  const map: Record<string, "inbox" | "message" | "refresh" | "eye" | "check" | "x" | "alert" | "users"> = {
    Backlog: "inbox",
    Todo: "message",
    "In progress": "refresh",
    "In review": "eye",
    Done: "check",
    Canceled: "x",
    Blocked: "alert",
    Mara: "users",
    Jonas: "users",
    Priya: "users",
  };
  return map[value] ?? "list";
};

/** Semantic 16x16 slice glyph matching affectui.com Breakdown Chart status icons. */
export function BccSliceGlyph({ value, size = 15 }: { value: string; size?: number }) {
  if (value === "Backlog") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--af-faint)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 9.5 4 3.5h8l1.5 6M2.5 9.5v3h11v-3M2.5 9.5H6l.8 1.5h2.4l.8-1.5h3.5" />
      </svg>
    );
  }
  if (value === "Todo") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--af-muted)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="10" height="10" rx="2.5" />
      </svg>
    );
  }
  if (value === "In progress") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--af-series-1)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5v3l2 1.5" />
      </svg>
    );
  }
  if (value === "In review") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--af-series-3)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8Z" />
        <circle cx="8" cy="8" r="1.8" />
      </svg>
    );
  }
  if (value === "Done") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="11" height="11" rx="3" fill="var(--af-accent)" />
        <path d="m5.5 8.2 1.8 1.8 3.3-3.6" stroke="var(--af-on-accent)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (value === "Canceled") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--af-faint)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="8" cy="8" r="5.5" />
        <path d="m4.2 11.8 7.6-7.6" />
      </svg>
    );
  }
  return <AfIcon name={bccSliceIcon(value)} size={size - 1} />;
}

/** Compact dimension picker: uppercase label + 32px trigger + listbox menu. */
export function BccPicker({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="af-dt-bcc__picker" ref={ref} data-open={open || undefined}>
      <span className="af-dt-bcc__picker-label">{label}</span>
      <button
        type="button"
        className="af-dt-bcc__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            const cur = options.indexOf(value);
            const next = options[(cur + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length];
            if (next) onChange(next);
          }
        }}
      >
        <span>{value}</span>
        <AfIcon name="chevronDown" size={12} />
      </button>
      {open ? (
        <div className="af-dt-bcc__menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className="af-dt-bcc__option"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {option === value ? <AfIcon name="check" size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact Breakdown · Revenue by channel (affectUI Pro 1:1)          */
/* ------------------------------------------------------------------ */

export type CompactPeriod = "7d" | "30d" | "90d";

/** Three periods with real rank swaps across periods to drive FLIP row gliding ($13,590 on 30d). */
export const COMPACT_DATA: Record<CompactPeriod, { delta: number; items: { label: string; value: number }[] }> = {
  "7d": {
    delta: 12.4,
    items: [
      { label: "Direct", value: 4820 },
      { label: "Organic search", value: 3910 },
      { label: "Referrals", value: 2240 },
      { label: "Social", value: 1680 },
      { label: "Email", value: 940 },
    ],
  },
  "30d": {
    delta: 8.2,
    items: [
      { label: "Direct", value: 18420 },
      { label: "Organic search", value: 14910 },
      { label: "Social", value: 9680 },
      { label: "Referrals", value: 8240 },
      { label: "Email", value: 3940 },
    ],
  },
  "90d": {
    delta: -3.1,
    items: [
      { label: "Direct", value: 48200 },
      { label: "Referrals", value: 36400 },
      { label: "Organic search", value: 34800 },
      { label: "Social", value: 19120 },
      { label: "Email", value: 9890 },
    ],
  },
};

/** Segment palette: 4 stepped accent shades + neutral gray tail. */
export const compactTone = (index: number, total: number) => (index === total - 1 ? "var(--af-data-rest)" : `var(--af-data-${Math.min(index + 1, 4)})`);

/* ------------------------------------------------------------------ */
/* Experiment Card · Signup CTA copy (affectUI Pro 1:1)               */
/* ------------------------------------------------------------------ */

export type ExperimentMetric = "conversion" | "revenue" | "bounce";

export type ExperimentVariant = {
  id: string;
  key: string;
  name: string;
  control?: boolean;
  visitors: number;
  values: Record<ExperimentMetric, number>;
};

export const EXPERIMENT_METRICS: { id: ExperimentMetric; label: string; lowerIsBetter?: boolean; format: (value: number) => string }[] = [
  { id: "conversion", label: "Conversion", format: (value) => `${value.toFixed(1)}%` },
  { id: "revenue", label: "Revenue", format: (value) => `$${value.toFixed(2)}` },
  { id: "bounce", label: "Bounce", lowerIsBetter: true, format: (value) => `${value.toFixed(1)}%` },
];

export const EXPERIMENT_VARIANTS: ExperimentVariant[] = [
  { id: "a", key: "A", name: "Start free trial", control: true, visitors: 4790, values: { conversion: 4.2, revenue: 18.4, bounce: 38.6 } },
  { id: "b", key: "B", name: "Try it free", visitors: 4812, values: { conversion: 4.7, revenue: 19.8, bounce: 35.2 } },
  { id: "c", key: "C", name: "Get started – $0", visitors: 4755, values: { conversion: 4.0, revenue: 17.9, bounce: 40.1 } },
];

export const experimentColor = (index: number) => (index === 0 ? "var(--af-data-rest)" : index === 1 ? "var(--af-accent-ink)" : "var(--af-series-3)");

/* ------------------------------------------------------------------ */
/* KPI Chart · Revenue by channel (affectUI Pro 1:1)                  */
/* ------------------------------------------------------------------ */

export const KPI_LABELS = ["Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7", "Mar 8", "Mar 9"];

export const KPI_DAY_NAMES = ["Mon, Mar 3", "Tue, Mar 4", "Wed, Mar 5", "Thu, Mar 6", "Fri, Mar 7", "Sat, Mar 8", "Sun, Mar 9"];

/** 5 straight-segment daily channel series ($0..$6k, 7-day total $96.4k, +$7.9k vs prior week). */
export const KPI_SERIES = [
  { name: "Organic", values: [4200, 4700, 3900, 4600, 5400, 5100, 5900] },
  { name: "Paid ads", values: [3600, 3300, 4400, 4800, 4000, 4500, 4200] },
  { name: "Referral", values: [1800, 2300, 2000, 1500, 2400, 2200, 2700] },
  { name: "Email", values: [1200, 1100, 1700, 2100, 1600, 1300, 1500] },
  { name: "Direct", values: [600, 900, 700, 800, 1000, 1400, 1100] },
];

/* ------------------------------------------------------------------ */
/* Usage Meter · Acme AI Credits & Plan Limits (affectUI Pro 1:1)     */
/* ------------------------------------------------------------------ */

export type UsagePeriod = "month" | "last" | "7d";

export type UsageCategory = { label: string; value: number };

export type UsageDay = { height: number; future?: boolean };

export type UsagePeriodData = {
  key: UsagePeriod;
  label: string;
  used: number;
  total: number;
  categories: UsageCategory[];
  avg: number;
  sub: string;
  days: UsageDay[];
  seats: { used: number; limit: number };
  storage: { used: number; limit: number };
  projects: { used: number; limit: number | null };
  status: string;
  action: string;
  height: number;
  limit: boolean;
};

/** Three periods with uniform 4-category height (429px) so period switching never causes vertical shrink. */
export const USAGE_PERIODS: UsagePeriodData[] = [
  {
    key: "month",
    label: "This month",
    used: 6495,
    total: 10000,
    categories: [
      { label: "Chat", value: 3484 },
      { label: "Search", value: 1436 },
      { label: "Image", value: 980 },
      { label: "API", value: 595 },
    ],
    avg: 337,
    sub: "Pro plan · Resets in 9 days",
    days: [
      { height: 47.7 },
      { height: 30.0 },
      { height: 27.9 },
      { height: 51.7 },
      { height: 87.8 },
      { height: 69.2 },
      { height: 75.1 },
      { height: 73.8 },
      { height: 33.8 },
      { height: 30.2 },
      { height: 65.2 },
      { height: 89.5 },
      { height: 63.1 },
      { height: 75.7 },
      { height: 86.9 },
      { height: 45.1 },
      { height: 35.4 },
      { height: 64.3 },
      { height: 71.9 },
      { height: 100 },
      { height: 93.5 },
      { height: 92.8 },
      { height: 68.4 },
      { height: 79.2 },
      { height: 0, future: true },
      { height: 0, future: true },
      { height: 0, future: true },
      { height: 0, future: true },
      { height: 0, future: true },
      { height: 0, future: true },
    ],
    seats: { used: 7, limit: 10 },
    storage: { used: 2.8, limit: 5 },
    projects: { used: 11, limit: null },
    status: "2,258 credits left",
    action: "Upgrade",
    height: 429,
    limit: false,
  },
  {
    key: "last",
    label: "Last month",
    used: 10000,
    total: 10000,
    categories: [
      { label: "Chat", value: 5210 },
      { label: "Search", value: 2140 },
      { label: "Image", value: 1690 },
      { label: "API", value: 960 },
    ],
    avg: 333,
    sub: "Pro plan · resets in 9 days",
    days: [
      { height: 42.1 },
      { height: 72.3 },
      { height: 76.8 },
      { height: 24.6 },
      { height: 27.4 },
      { height: 57.7 },
      { height: 58.9 },
      { height: 72.1 },
      { height: 73.3 },
      { height: 50.6 },
      { height: 23.2 },
      { height: 22.4 },
      { height: 51.6 },
      { height: 48.4 },
      { height: 71.6 },
      { height: 64.3 },
      { height: 69.3 },
      { height: 26.9 },
      { height: 25.1 },
      { height: 92.0 },
      { height: 56.2 },
      { height: 92.7 },
      { height: 56.0 },
      { height: 97.4 },
      { height: 35.0 },
      { height: 30.0 },
      { height: 85.3 },
      { height: 100 },
      { height: 58.2 },
      { height: 71.8 },
    ],
    seats: { used: 10, limit: 10 },
    storage: { used: 2.9, limit: 5 },
    projects: { used: 11, limit: null },
    status: "Limit reached for this period",
    action: "Add credits",
    height: 429,
    limit: true,
  },
  {
    key: "7d",
    label: "7 days",
    used: 2360,
    total: 10000,
    categories: [
      { label: "Chat", value: 1260 },
      { label: "Search", value: 540 },
      { label: "Image", value: 220 },
      { label: "API", value: 340 },
    ],
    avg: 337,
    sub: "Pro plan · resets in 9 days",
    days: [{ height: 24.1 }, { height: 39.5 }, { height: 97.7 }, { height: 76.6 }, { height: 100 }, { height: 71.7 }, { height: 82.3 }],
    seats: { used: 8, limit: 10 },
    storage: { used: 3.1, limit: 5 },
    projects: { used: 12, limit: null },
    status: "7,640 credits left",
    action: "Upgrade",
    height: 429,
    limit: false,
  },
];

/* ------------------------------------------------------------------ */
/* Project Card · Onboarding revamp (affectUI Pro 1:1)                */
/* ------------------------------------------------------------------ */

export type ProjectTask = {
  id: string;
  label: string;
  done: boolean;
  assignee: string;
};

export const PROJECT_STATUS: { id: string; label: string; tone: "violet" | "amber" | "blue" | "green" }[] = [
  { id: "todo", label: "To do", tone: "violet" },
  { id: "progress", label: "In progress", tone: "amber" },
  { id: "review", label: "In review", tone: "blue" },
  { id: "done", label: "Done", tone: "green" },
];

export const PROJECT_TASKS: ProjectTask[] = [
  { id: "welcome", label: "Welcome screen", done: true, assignee: "Mara" },
  { id: "workspace", label: "Workspace setup", done: true, assignee: "Jonas" },
  { id: "invite", label: "Invite teammates", done: true, assignee: "Mara" },
  { id: "checklist", label: "First-run checklist", done: false, assignee: "Priya" },
  { id: "emails", label: "Lifecycle emails", done: false, assignee: "Jonas" },
];

export const PROJECT_MEMBERS = ["Mara", "Jonas", "Priya"];

/* ------------------------------------------------------------------ */
/* Change Summary · What changed (affectUI Clean 1:1)                 */
/* ------------------------------------------------------------------ */

type ChangeTone = "good" | "bad" | "neutral";

export type ChangeRow = {
  label: string;
  change: string;
  tone: ChangeTone;
  direction: "up" | "down";
};

export const CHANGE_DATA: Record<"week" | "last", ChangeRow[]> = {
  week: [
    { label: "Active users", change: "Up 6.1% to 18.2K", tone: "good", direction: "up" },
    { label: "Activation", change: "Climbed to 41%, up 3 pts", tone: "good", direction: "up" },
    { label: "Churn", change: "Down to 2.1% from 2.6%", tone: "good", direction: "down" },
    { label: "Support tickets", change: "Up 14% to 312", tone: "bad", direction: "up" },
  ],
  last: [
    { label: "Active users", change: "Up 3.4% to 17.1K", tone: "good", direction: "up" },
    { label: "Activation", change: "Climbed to 38%, up 2 pts", tone: "good", direction: "up" },
    { label: "Churn", change: "Up to 2.6% from 2.2%", tone: "bad", direction: "up" },
    { label: "Support tickets", change: "Unchanged at 274", tone: "neutral", direction: "up" },
  ],
};

/* ------------------------------------------------------------------ */
/* Smart Recommendation · Recommendation (affectUI Clean 1:1)         */
/* ------------------------------------------------------------------ */

type RecommendationOption = {
  id: string;
  label: string;
  reason: ReactNode;
  signal: number;
};

export const RECOMMEND_OPTIONS: RecommendationOption[] = [
  {
    id: "incremental",
    label: "Incremental sync",
    reason: (
      <>
        Only 4% of rows changed since yesterday – switching to <strong>Incremental sync</strong> saves about 40 minutes.
      </>
    ),
    signal: 3,
  },
  {
    id: "full",
    label: "Full refresh",
    reason: (
      <>
        Rebuilds every table on each run – switching to <strong>Full refresh</strong> catches schema drift (~45 minutes).
      </>
    ),
    signal: 1,
  },
];

export const SIGNAL_TEXT = ["No signal", "Weak signal", "Good signal", "Strong signal"];

/* ------------------------------------------------------------------ */
/* Tips Panel · Getting started (affectUI Clean 1:1)                  */
/* ------------------------------------------------------------------ */

type TipItem = {
  id: string;
  title: string;
  description: ReactNode;
  action: string;
  doneLabel: string;
  primary?: boolean;
};

export const TIPS: TipItem[] = [
  { id: "team", title: "Invite your team", description: "Work on projects together and keep feedback in one place.", action: "Invite", doneLabel: "Invited", primary: false },
  { id: "search", title: "Quick search", description: <>Press <AfKbd>⌘K</AfKbd> to jump to any page, project or setting.</>, action: "Try it", doneLabel: "Tried" },
  { id: "digest", title: "Weekly digest", description: "Get a short summary of what changed every Monday morning.", action: "Turn on", doneLabel: "Enabled" },
  { id: "slack", title: "Connect Slack", description: "Post an update to a channel when something needs your attention.", action: "Connect", doneLabel: "Connected" },
  { id: "mobile", title: "Mobile app", description: "Check activity and approve requests while you're on the go.", action: "Get the app", doneLabel: "Installed" },
  { id: "pro", title: "Ready for Pro?", description: "Unlimited projects, priority support and advanced analytics.", action: "See plans", doneLabel: "Viewed", primary: true },
  { id: "dark", title: "Dark mode", description: "Switch the theme or follow your system setting automatically.", action: "Switch", doneLabel: "Switched" },
  { id: "keys", title: "API keys", description: "Automate your workflow and pull data into your own tools.", action: "Create key", doneLabel: "Created" },
  { id: "export", title: "Export data", description: "Download every project as CSV whenever you need a copy.", action: "Export", doneLabel: "Exported" },
];

/* ------------------------------------------------------------------ */
/* Progress Tracker · Getting started (affectUI Clean 1:1)            */
/* ------------------------------------------------------------------ */

export const PROGRESS_STEPS = [
  "Connect your tools",
  "Turn on notifications",
  "Catch up on blockers",
  "Summarize priorities",
  "Create a project",
];

/* ------------------------------------------------------------------ */
/* Setup Guide · Get started (affectUI Pro 1:1)                       */
/* ------------------------------------------------------------------ */

type SetupTask = { id: string; label: string; done: boolean };

export type SetupGroup = { id: string; title: string; tasks: SetupTask[] };

export const SETUP_GROUPS: SetupGroup[] = [
  {
    id: "workspace",
    title: "Set up your workspace",
    tasks: [
      { id: "name", label: "Choose a workspace name", done: false },
      { id: "team", label: "Invite your teammates to collaborate", done: false },
      { id: "calendar", label: "Connect your calendar", done: false },
    ],
  },
  {
    id: "billing",
    title: "Set up billing",
    tasks: [
      { id: "card", label: "Add a payment method", done: false },
      { id: "plan", label: "Choose a plan", done: false },
    ],
  },
  {
    id: "verify",
    title: "Verify your account",
    tasks: [
      { id: "email", label: "Confirm your email address", done: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Email Draft · Northwind Logistics SUB-1182 (affectUI Clean 1:1)    */
/* ------------------------------------------------------------------ */

export type DraftContact = { id: string; name: string; email: string };

export type DraftTone = "friendly" | "short" | "formal";

export const DRAFT_CONTACTS: DraftContact[] = [
  { id: "jonas", name: "Jonas Weber", email: "jonas@northwind.io" },
  { id: "mara", name: "Mara Chen", email: "mara@northwind.io" },
  { id: "priya", name: "Priya Shah", email: "priya@northwind.io" },
];

export const DRAFT_TONE_LABEL: Record<DraftTone, string> = { friendly: "Friendly", short: "Short", formal: "Formal" };

export const draftBody = (tone: DraftTone, contact: DraftContact) => {
  const first = contact.name.split(" ")[0] ?? contact.name;
  if (tone === "short") {
    return `Hi ${first}, your Growth plan renews Oct 9 for $8,900/yr. Reply here or review your quote to adjust seats.`;
  }
  if (tone === "formal") {
    return `Dear ${contact.name},\n\nYour Growth plan for Northwind Logistics is scheduled to renew on October 9 for $8,900 per year. Please review the attached quote if you wish to modify seats or switch to monthly billing.\n\nBest regards,\nRenewal agent`;
  }
  return `Hi ${first}, a heads-up that your Growth plan renews on October 9 for $8,900 a year. If you'd like to add seats or switch to monthly billing, you can review the quote here: Review quote`;
};

/* ------------------------------------------------------------------ */
/* Decision Inbox · Needs your decision (affectUI Clean 1:1)          */
/* ------------------------------------------------------------------ */

export type DecisionItem = {
  id: string;
  title: string;
  detail: string;
  primary: string;
  secondary: string;
};

export const DECISIONS: DecisionItem[] = [
  { id: "onboarding", title: "Roll out the new onboarding to everyone?", detail: "Test won with +8% activation · 2 weeks of data", primary: "Roll out", secondary: "Keep testing" },
  { id: "figma", title: "Renew Figma for the design team?", detail: "12 seats · $1,800 per year · renews in 5 days", primary: "Renew", secondary: "Change seats" },
];

/* ------------------------------------------------------------------ */
/* Notification Stack · Desktop notices (affectUI Clean 1:1)          */
/* ------------------------------------------------------------------ */

type NoticePattern = "orbit" | "grid" | "rays";

export type NoticeItem = {
  id: string;
  badge: string;
  title: string;
  text: string;
  action: string;
  pattern: NoticePattern;
};

export const NOTICES: NoticeItem[] = [
  { id: "dark-mode", badge: "New", title: "Dark mode is here", text: "Every screen now follows your system theme – or pick one yourself in settings.", action: "Try it", pattern: "orbit" },
  { id: "maintenance", badge: "Notice", title: "Scheduled maintenance", text: "We'll be offline on Sunday from 02:00 to 03:00 UTC. Your data stays safe.", action: "View status", pattern: "grid" },
  { id: "invite", badge: "Invite", title: "Mara invited you to Design Ops", text: "Join the workspace to see shared projects, files and comments.", action: "Accept invite", pattern: "rays" },
];

export const NOTICE_PEEK = 12;

export function NoticePatternArt({ pattern }: { pattern: NoticePattern }) {
  return (
    <svg className="af-dt-ns__pattern" viewBox="0 0 220 160" fill="none" aria-hidden>
      {pattern === "orbit" ? (
        <>
          <circle cx="190" cy="10" r="46" />
          <circle cx="190" cy="10" r="86" />
          <circle cx="190" cy="10" r="128" />
          <path d="M60 160 220 0M0 58h220M150 0v160" />
          <circle cx="150" cy="58" r="3.5" className="af-dt-ns__dot" />
        </>
      ) : pattern === "grid" ? (
        <>
          {[30, 60, 90, 120, 150, 180, 210].map((x) => <path key={`x${x}`} d={`M${x} 0v160`} />)}
          {[20, 50, 80, 110, 140].map((y) => <path key={`y${y}`} d={`M0 ${y}h220`} />)}
          <rect x="150" y="50" width="30" height="30" className="af-dt-ns__fill" />
          <circle cx="180" cy="50" r="3.5" className="af-dt-ns__dot" />
        </>
      ) : (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <path key={index} d={`M210 6 L${210 - Math.cos((index * Math.PI) / 16) * 230} ${6 + Math.sin((index * Math.PI) / 16) * 230}`} />
          ))}
          <path d="M120 6a90 90 0 0 0 90 90" />
          <circle cx="146" cy="70" r="3.5" className="af-dt-ns__dot" />
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Toaster · Notification Stack (affectUI Pro 1:1)                    */
/* ------------------------------------------------------------------ */

export type ToastTone = "neutral" | "success" | "danger" | "info";

export type ToastPhase = "loading" | "success" | "error";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  phase?: ToastPhase;
  action?: { label: string; run: () => void };
  duration: number;
  leaving?: boolean;
};

export type ToastTimer = { remaining: number; start: number; handle?: number };

export function ToastSpinner({ phase }: { phase: ToastPhase }) {
  return (
    <svg className="af-dt-spin" data-phase={phase} viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d={phase === "error" ? "M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" : "M5.25 8.25 7.1 10l3.65-4"} pathLength={1} />
    </svg>
  );
}
