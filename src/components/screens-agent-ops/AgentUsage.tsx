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
import { AfNumberTicker } from "../../motion";
import { AfButton } from "../controls/Button";
import { AfBadge } from "../display/Badge";
import { AfSkeleton } from "../display/Skeleton";
import { AfTooltip } from "../overlay/Tooltip";
import {
  AgentOpsShell,
  DEFAULT_AGENT_OPS_USER,
  MiniDailyBars,
  ModelMakerMark,
  formatCompactCount,
  formatCurrencyValue,
  type AgentOpsUser,
} from "./AgentOpsShell";

export type UsageBreakdownItem = {
  id: string;
  name: string;
  amount: number;
  last?: number;
  tone?: string;
  days?: number[];
  tasks?: { title: string; runs: number; cost: number }[];
};

export type UsageNote = {
  id: string;
  kind: "spike" | "jump" | "budget";
  text: string;
  detail?: string;
  badge?: string;
};

export type UsageStats = {
  tasks?: number;
  runs?: number;
  tokens?: number;
};

export type UsageLatestRun = {
  id: string;
  task: string;
  cost: number;
};

export type AgentUsageLabels = {
  usage?: string;
  month?: string;
  monthShort?: string;
  spent?: string;
  onTrack?: string;
  over?: string;
  whereItWent?: string;
  worthALook?: string;
  projects?: string;
  models?: string;
};

export type AfAgentUsageProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  days?: number[];
  daysInMonth?: number;
  budget?: number | null;
  currency?: string;
  projects?: UsageBreakdownItem[];
  models?: UsageBreakdownItem[];
  notes?: UsageNote[];
  stats?: UsageStats;
  latest?: UsageLatestRun | null;
  defaultView?: "projects" | "models";
  defaultSelected?: string | null;
  onOpenNote?: (note: UsageNote) => void;
  onSelect?: (view: "projects" | "models", id: string) => void;
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AgentOpsUser;
  inboxCount?: number;
  labels?: AgentUsageLabels;
  loading?: boolean;
  empty?: boolean;
  className?: string;
  style?: CSSProperties;
};

// 19 daily costs summing to exactly 270.40 EUR
export const DEFAULT_USAGE_DAYS: number[] = [
  11.2, 13.8, 12.4, 15.1, 14.6, 9.8, 10.4, 15.8, 16.2, 14.9, 13.5, 17.4, 11.0, 10.2, 16.5, 15.6, 17.2, 18.4, 16.4,
];

export const DEFAULT_USAGE_PROJECTS: UsageBreakdownItem[] = [
  {
    id: "northwind",
    name: "Northwind",
    amount: 118.4,
    last: 96.26,
    tone: "var(--af-warning)",
    days: [4.2, 3.6, 8.8, 3.1, 4.9, 5.1, 6.4, 10.2, 10.8, 5.4, 3.2, 6.8, 4.1, 3.8, 7.6, 5.9, 5.3, 18.4, 6.8],
    tasks: [
      { title: "Competitor scan", runs: 6, cost: 31.2 },
      { title: "Ingest pipeline", runs: 41, cost: 27.8 },
      { title: "Client dashboard", runs: 18, cost: 22.6 },
      { title: "Weekly update", runs: 3, cost: 4.1 },
    ],
  },
  {
    id: "platform",
    name: "Platform",
    amount: 82.1,
    last: 88.28,
    tone: "var(--af-series-3)",
    days: [3.8, 4.4, 4.1, 4.8, 4.2, 2.8, 3.1, 4.9, 4.5, 4.6, 4.3, 5.0, 3.9, 4.4, 4.8, 4.6, 4.7, 4.8, 4.4],
    tasks: [
      { title: "Retry failed billing webhooks", runs: 46, cost: 32.4 },
      { title: "API v2 schema checks", runs: 58, cost: 26.9 },
      { title: "Staging migrations", runs: 14, cost: 22.8 },
    ],
  },
  {
    id: "evalkit",
    name: "Evalkit",
    amount: 46.3,
    last: 22.92,
    tone: "var(--af-series-4)",
    days: [1.4, 1.6, 1.5, 1.8, 1.6, 1.4, 1.5, 1.9, 3.2, 3.6, 3.8, 4.1, 3.7, 3.9, 3.6, 3.8, 3.9],
    tasks: [
      { title: "Nightly Opus 5.5 suite", runs: 12, cost: 31.8 },
      { title: "Prompt v14 diff check", runs: 19, cost: 14.5 },
    ],
  },
  {
    id: "internal",
    name: "Internal",
    amount: 23.6,
    last: 30.26,
    tone: "var(--af-series-5)",
    days: [1.1, 1.3, 1.2, 1.5, 1.1, 0.8, 1.0, 1.4, 1.2, 1.3, 1.1, 1.5, 1.0, 1.3, 1.2, 1.4, 1.2, 1.5, 1.5],
    tasks: [
      { title: "Standup & release notes", runs: 42, cost: 14.2 },
      { title: "Inbox triage", runs: 96, cost: 9.4 },
    ],
  },
];

export const DEFAULT_USAGE_MODELS: UsageBreakdownItem[] = [
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 5.5",
    amount: 146.8,
    last: 132.2,
    tone: "var(--af-warning)",
    days: [6.8, 7.9, 7.2, 8.4, 7.8, 5.4, 5.8, 8.6, 8.2, 7.9, 7.5, 8.9, 6.4, 8.8],
    tasks: [
      { title: "Code review & PRs", runs: 88, cost: 62.4 },
      { title: "Inbox triage & drafts", runs: 210, cost: 41.2 },
    ],
  },
  {
    id: "claude-opus",
    name: "Claude Opus 5.5",
    amount: 72.4,
    last: 31.0,
    tone: "var(--af-series-2)",
    days: [2.1, 2.4, 2.2, 2.8, 2.5, 1.8, 2.0, 3.1, 6.4, 6.8, 7.2, 7.9, 6.8, 9.2],
    tasks: [
      { title: "Deep research & synthesis", runs: 19, cost: 38.6 },
      { title: "Evalkit judge runs", runs: 12, cost: 33.8 },
    ],
  },
  {
    id: "gpt-6",
    name: "GPT-6 mini",
    amount: 36.1,
    last: 41.0,
    tone: "var(--af-series-4)",
    days: [1.8, 2.4, 2.0, 2.6, 2.8, 1.6, 1.8, 2.8, 2.4, 2.2, 2.1, 2.5, 1.9, 2.4],
    tasks: [{ title: "Spreadsheet & funnel checks", runs: 54, cost: 24.5 }],
  },
  {
    id: "gemini-3",
    name: "Gemini 3.1 Pro",
    amount: 15.1,
    last: 14.0,
    tone: "var(--af-series-3)",
    days: [0.8, 1.1, 1.0, 1.3, 1.0, 0.7, 0.8, 1.2, 1.0, 1.1, 0.9, 1.1, 0.8, 1.0],
    tasks: [{ title: "Long PDF & transcript indexing", runs: 31, cost: 15.1 }],
  },
];

export const DEFAULT_USAGE_NOTES: UsageNote[] = [
  {
    id: "n-spike",
    kind: "spike",
    text: "Competitor scan cost €18.40 yesterday",
    detail: "4× what it usually costs – it read 212 pages instead of 40",
    badge: "4×",
  },
  {
    id: "n-jump",
    kind: "jump",
    text: "Evalkit is up 102% on October",
    detail: "Its evals moved to Claude Opus 5.5 on Nov 12",
    badge: "+102%",
  },
  {
    id: "n-budget",
    kind: "budget",
    text: "Northwind has used 85% of its €140",
    detail: "At this pace it reaches it around Nov 23",
    badge: "85%",
  },
];

function formatDeltaText(amount: number, last?: number): { text: string; up: boolean } | null {
  if (last === undefined || last <= 0) return null;
  const pct = ((amount - last) / last) * 100;
  if (Math.abs(pct) >= 1000) {
    const factor = Math.round(amount / last);
    return { text: `${pct >= 0 ? "↑" : "↓"}${factor}×`, up: pct >= 0 };
  }
  const rounded = Math.round(pct);
  if (rounded === 0) return { text: "0%", up: false };
  return { text: `${rounded > 0 ? "↑" : "↓"}${Math.abs(rounded)}%`, up: rounded > 0 };
}

/**
 * Agent / Usage (`/screens/agent-usage`):
 * Monthly cumulative spend curve against budget with dashed pace forecast, odometer ticker,
 * keyboard/pointer day scrubbing, `Projects | Models` breakdown, and anomaly notes.
 */
export function AfAgentUsage(props: AfAgentUsageProps = {}) {
  const {
    days: daysProp,
    daysInMonth = 30,
    budget = 500,
    currency = "EUR",
    projects = DEFAULT_USAGE_PROJECTS,
    models = DEFAULT_USAGE_MODELS,
    notes = DEFAULT_USAGE_NOTES,
    stats = { tasks: 186, runs: 1284, tokens: 48_200_000 },
    latest: latestProp,
    defaultView = "projects",
    defaultSelected = "northwind",
    onOpenNote,
    onSelect,
    onNavigate,
    workspace = "Fieldwork",
    user = DEFAULT_AGENT_OPS_USER,
    inboxCount = 5,
    labels,
    loading = false,
    empty = false,
    className,
    style,
    ...rest
  } = props;

  const [extraSpend] = useState(0);
  const [flashRun, setFlashRun] = useState<UsageLatestRun | null>(latestProp ?? null);
  const lastSeenRunId = useRef<string | undefined>(latestProp?.id);

  const [view, setView] = useState<"projects" | "models">(defaultView);
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [panelOpen, setPanelOpen] = useState<boolean>(defaultSelected !== null);
  const [scrubDayIdx, setScrubDayIdx] = useState<number | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latestProp && latestProp.id !== lastSeenRunId.current) {
      lastSeenRunId.current = latestProp.id;
      setFlashRun(latestProp);
      setLiveMsg(`${formatCurrencyValue(latestProp.cost, currency, { signed: true })} · ${latestProp.task}`);
    }
  }, [currency, latestProp]);

  const copy = {
    usage: labels?.usage ?? "Usage",
    month: labels?.month ?? "November",
    monthShort: labels?.monthShort ?? "Nov",
    spent: labels?.spent ?? "Spent in November",
    whereItWent: labels?.whereItWent ?? "Where it went",
    worthALook: labels?.worthALook ?? "Worth a look",
    projects: labels?.projects ?? "Projects",
    models: labels?.models ?? "Models",
  };

  const days = useMemo(() => {
    const base = daysProp ?? DEFAULT_USAGE_DAYS;
    if (extraSpend === 0 || base.length === 0) return base;
    const next = [...base];
    next[next.length - 1] = Number((next[next.length - 1]! + extraSpend).toFixed(2));
    return next;
  }, [daysProp, extraSpend]);

  const cumulative = useMemo(() => {
    const acc: number[] = [];
    let sum = 0;
    for (const d of days) {
      sum = Number((sum + d).toFixed(2));
      acc.push(sum);
    }
    return acc;
  }, [days]);

  const totalSpent = cumulative[cumulative.length - 1] ?? 0;
  const dailyPace = days.length > 0 ? totalSpent / days.length : 0;
  const projectedMonthEnd = Math.round(dailyPace * daysInMonth);
  const budgetPct = budget ? Math.round((totalSpent / budget) * 100) : null;
  const zeroDec = currency.toUpperCase() === "JPY" || currency.toUpperCase() === "KRW";
  const shouldAnimateTicker = extraSpend > 0 || Boolean(latestProp);

  const paceSentence = useMemo(() => {
    const endFmt = formatCurrencyValue(projectedMonthEnd, currency, { compact: projectedMonthEnd >= 10000 }).replace(
      /\.00$/,
      "",
    );
    if (!budget) return `At this pace: ${endFmt} by ${copy.monthShort} ${daysInMonth}`;
    if (projectedMonthEnd <= budget) {
      if (labels?.onTrack) {
        return labels.onTrack
          .replace("{amount}", endFmt)
          .replace("{budget}", formatCurrencyValue(budget, currency))
          .replace("{date}", `${copy.monthShort} ${daysInMonth}`);
      }
      return `On track for ${endFmt} by ${copy.monthShort} ${daysInMonth}`;
    }
    const crossDay = Math.max(1, Math.min(daysInMonth, Math.ceil(budget / Math.max(0.01, dailyPace))));
    const dateStr = `${copy.monthShort} ${crossDay}`;
    if (labels?.over) {
      return labels.over
        .replace("{amount}", endFmt)
        .replace("{budget}", formatCurrencyValue(budget, currency))
        .replace("{date}", dateStr);
    }
    return `Passes ${formatCurrencyValue(budget, currency).replace(/\.00$/, "")} around ${dateStr} (${endFmt} by ${copy.monthShort} ${daysInMonth})`;
  }, [budget, copy.monthShort, currency, dailyPace, daysInMonth, labels?.onTrack, labels?.over, projectedMonthEnd]);

  const activeBreakdown = view === "projects" ? projects : models;
  const breakdownSum = Math.max(
    0.01,
    activeBreakdown.reduce((s, item) => s + item.amount, 0),
  );

  const selectedEntry = useMemo(() => {
    if (empty) return null;
    return activeBreakdown.find((x) => x.id === selectedId) ?? activeBreakdown[0] ?? null;
  }, [activeBreakdown, empty, selectedId]);

  // SVG chart geometry (W=640, H=132)
  const W = 640;
  const H = 132;
  const padX = 8;
  const padY = 16;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const yMax = Math.max(budget ?? 0, projectedMonthEnd, totalSpent, 100) * 1.12;

  const xForDay = useCallback(
    (day1Based: number) => padX + ((day1Based - 1) / Math.max(1, daysInMonth - 1)) * plotW,
    [daysInMonth, plotW],
  );
  const yForVal = useCallback(
    (val: number) => padY + plotH - Math.min(1, Math.max(0, val / yMax)) * plotH,
    [plotH, yMax],
  );

  const curvePoints = useMemo(
    () => cumulative.map((val, i) => ({ x: xForDay(i + 1), y: yForVal(val), val, cost: days[i] ?? 0, day: i + 1 })),
    [cumulative, days, xForDay, yForVal],
  );

  const linePath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    return curvePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  }, [curvePoints]);

  const areaPath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    const last = curvePoints[curvePoints.length - 1]!;
    const first = curvePoints[0]!;
    return `${linePath} L ${last.x.toFixed(1)} ${(padY + plotH).toFixed(1)} L ${first.x.toFixed(1)} ${(padY + plotH).toFixed(1)} Z`;
  }, [curvePoints, linePath, plotH]);

  const todayPt = curvePoints[curvePoints.length - 1];
  const forecastEndX = xForDay(daysInMonth);
  const forecastEndY = yForVal(projectedMonthEnd);
  const budgetY = budget ? yForVal(budget) : null;
  const scrubPt = scrubDayIdx !== null ? curvePoints[scrubDayIdx] ?? null : null;

  const handleCurveKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (curvePoints.length === 0) return;
    let nextIdx: number | null = scrubDayIdx;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIdx = scrubDayIdx === null ? curvePoints.length - 1 : Math.max(0, scrubDayIdx - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIdx = scrubDayIdx === null ? 0 : Math.min(curvePoints.length - 1, scrubDayIdx + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = curvePoints.length - 1;
    } else if (e.key === "Escape") {
      e.preventDefault();
      setScrubDayIdx(null);
      return;
    } else {
      return;
    }
    setScrubDayIdx(nextIdx);
    const pt = curvePoints[nextIdx];
    if (pt) {
      setLiveMsg(
        `${copy.monthShort} ${pt.day}: ${formatCurrencyValue(pt.cost, currency)}, ${formatCurrencyValue(pt.val, currency)} so far`,
      );
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

    if (!selectedEntry) {
      return (
        <div className="af-aops-panel-empty">
          <AfIcon name="wallet" size={18} />
          <span>Select a project or model to inspect its daily spend and costliest tasks.</span>
        </div>
      );
    }

    const sharePct = Math.round((selectedEntry.amount / breakdownSum) * 100);
    const delta = formatDeltaText(selectedEntry.amount, selectedEntry.last);

    return (
      <div className="af-aops-inspector">
        <div className="af-aops-inspector__head">
          {view === "models" ? (
            <ModelMakerMark model={selectedEntry.name} size={20} />
          ) : (
            <span
              className="af-aops-sched-swatch af-aops-sched-swatch--lg"
              style={{ background: selectedEntry.tone ?? "var(--af-warning)" }}
            />
          )}
          <div className="af-aops-inspector__titles">
            <h3 className="af-aops-inspector__title">{selectedEntry.name}</h3>
          </div>
        </div>

        <div className="af-aops-usage-hero-block">
          <div className="af-aops-usage-hero-row af-aops-tabular">
            <span className="af-aops-panel-big-num">{formatCurrencyValue(selectedEntry.amount, currency)}</span>
            <span className="af-aops-faint">
              {sharePct}% of {copy.month}
            </span>
          </div>
          {delta ? (
            <div className="af-aops-usage-delta-line af-aops-tabular">
              <span className="af-aops-usage-delta-val" data-up={delta.up ? "true" : undefined}>
                {delta.text}
              </span>{" "}
              <span className="af-aops-faint">vs last month</span>
            </div>
          ) : null}
        </div>

        {selectedEntry.days && selectedEntry.days.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">Day by day</div>
            <MiniDailyBars
              values={selectedEntry.days}
              color={selectedEntry.tone ?? "var(--af-warning)"}
              bare
              height={54}
              animateKey={`${view}-${selectedEntry.id}`}
              formatTip={(v, idx) => `${copy.monthShort} ${idx + 1}: ${formatCurrencyValue(v, currency)}`}
            />
            <div className="af-aops-faint af-aops-tabular">
              {copy.monthShort} 1 – {copy.monthShort} {days.length} ·{" "}
              {formatCurrencyValue(selectedEntry.amount, currency)}
            </div>
          </section>
        ) : null}

        {selectedEntry.tasks && selectedEntry.tasks.length > 0 ? (
          <section className="af-aops-sec">
            <div className="af-aops-sec__title">What cost the most</div>
            <div className="af-aops-flat-list">
              {selectedEntry.tasks.map((t, idx) => (
                <div key={idx} className="af-aops-flat-row af-aops-flat-row--history">
                  <div className="af-aops-flat-row__body">
                    <div className="af-aops-flat-row__title">{t.title}</div>
                    <div className="af-aops-faint af-aops-tabular">{t.runs} runs</div>
                  </div>
                  <span className="af-aops-tabular af-aops-ink">{formatCurrencyValue(t.cost, currency)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const costPerTask =
    stats.tasks && stats.tasks > 0 ? formatCurrencyValue(totalSpent / stats.tasks, currency) : null;

  const topBarNode = (
    <div className="af-aops-topbar__row">
      <div className="af-aops-topbar__left">
        <h1 className="af-aops-topbar__title">{copy.usage}</h1>
        <span className="af-aops-topbar__count">{copy.month}</span>
      </div>
    </div>
  );

  return (
    <AgentOpsShell
      activeNav="Usage"
      workspace={workspace}
      user={user}
      inboxCount={inboxCount}
      onNavigate={onNavigate}
      topBar={topBarNode}
      maxWidth={740}
      panelTitle="Details"
      panelTab={selectedEntry ? selectedEntry.name : undefined}
      panelTabIcon={
        selectedEntry ? (
          view === "models" ? (
            <ModelMakerMark model={selectedEntry.name} size={12} />
          ) : (
            <span
              className="af-aops-sched-swatch"
              style={{ background: selectedEntry.tone ?? "var(--af-warning)" }}
            />
          )
        ) : undefined
      }
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      panelWidth={340}
      panel={renderPanelContent()}
      liveMessage={liveMsg}
      className={className}
      style={style}
      {...rest}
    >
      {loading ? (
        <div className="af-aops-group-stack">
          <AfSkeleton variant="rect" height={240} radius={12} />
          <AfSkeleton variant="rect" height={180} radius={12} />
          <AfSkeleton variant="rect" height={130} radius={12} />
        </div>
      ) : empty ? (
        <div className="af-aops-empty">
          <div className="af-aops-empty__icon">
            <AfIcon name="wallet" size={20} />
          </div>
          <h2 className="af-aops-empty__title">Nothing spent yet</h2>
          <p className="af-aops-empty__desc">
            Spend shows up day by day as soon as your agents run tasks or schedules.
          </p>
          <AfButton variant="primary" size="sm" onClick={() => onNavigate?.("Tasks")}>
            Start a task
          </AfButton>
        </div>
      ) : (
        <div className="af-aops-group-stack">
          <section className="af-aops-spend-card">
            <div className="af-aops-spend-card__top">
              <div>
                <div className="af-aops-sec__title">{copy.spent}</div>
                <div className="af-aops-spend-hero af-aops-tabular">
                  {shouldAnimateTicker ? (
                    <AfNumberTicker
                      value={totalSpent}
                      prefix={currency.toUpperCase() === "EUR" ? "€" : undefined}
                      format={{
                        minimumFractionDigits: zeroDec ? 0 : 2,
                        maximumFractionDigits: zeroDec ? 0 : 2,
                      }}
                    />
                  ) : (
                    <span>{formatCurrencyValue(totalSpent, currency)}</span>
                  )}
                  {budget ? (
                    <span className="af-aops-spend-of">
                      of {formatCurrencyValue(budget, currency).replace(/\.00$/, "")} · {budgetPct}%
                    </span>
                  ) : null}
                </div>
              </div>

              {flashRun ? (
                <span className="af-aops-latest-pill af-aops-tabular" role="status">
                  <span className="af-aops-latest-pill__amt">
                    {formatCurrencyValue(flashRun.cost, currency, { signed: true })}
                  </span>
                  <span>· {flashRun.task}</span>
                </span>
              ) : null}
            </div>

            <div className="af-aops-pace-line">
              {scrubPt ? (
                <span className="af-aops-tabular">
                  <strong>
                    {copy.monthShort} {scrubPt.day}
                  </strong>
                  : {formatCurrencyValue(scrubPt.cost, currency)} that day ·{" "}
                  {formatCurrencyValue(scrubPt.val, currency)} so far
                </span>
              ) : (
                <span>{paceSentence}</span>
              )}
            </div>

            <div
              ref={svgWrapRef}
              tabIndex={0}
              role="img"
              aria-label={`Cumulative spend in ${copy.month}: ${formatCurrencyValue(totalSpent, currency)}${
                budget ? ` of ${formatCurrencyValue(budget, currency)} budget` : ""
              }. ${paceSentence}`}
              className="af-aops-curve-wrap"
              onKeyDown={handleCurveKeyDown}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
                const approxDay = Math.round(ratio * (daysInMonth - 1)) + 1;
                if (approxDay >= 1 && approxDay <= curvePoints.length) {
                  setScrubDayIdx(approxDay - 1);
                } else {
                  setScrubDayIdx(null);
                }
              }}
              onMouseLeave={() => setScrubDayIdx(null)}
            >
              <svg viewBox={`0 0 ${W} ${H}`} className="af-aops-curve-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="af-usage-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--af-accent)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--af-accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Baseline */}
                <line x1={padX} y1={padY + plotH} x2={W - padX} y2={padY + plotH} stroke="var(--af-page-line)" />

                {/* Budget line */}
                {budgetY !== null ? (
                  <g>
                    <line
                      x1={padX}
                      y1={budgetY}
                      x2={W - padX}
                      y2={budgetY}
                      stroke="var(--af-line-strong)"
                      strokeDasharray="3 3"
                    />
                    <text x={W - padX - 2} y={budgetY - 5} textAnchor="end" className="af-aops-svg-label">
                      Budget {formatCurrencyValue(budget!, currency).replace(/\.00$/, "")}
                    </text>
                  </g>
                ) : null}

                {/* Area & solid cumulative curve */}
                {areaPath ? <path d={areaPath} fill="url(#af-usage-area)" className="af-aops-curve-fill" /> : null}
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--af-accent)"
                    strokeWidth="1.8"
                    pathLength={100}
                    className="af-aops-curve-stroke"
                  />
                ) : null}

                {/* Dashed pace forecast line */}
                {todayPt ? (
                  <line
                    x1={todayPt.x}
                    y1={todayPt.y}
                    x2={forecastEndX}
                    y2={forecastEndY}
                    stroke="var(--af-accent)"
                    strokeOpacity="0.45"
                    strokeWidth="1.4"
                    strokeDasharray="3.5 3.5"
                  />
                ) : null}

                {/* Today vertical subtle guide */}
                {todayPt ? (
                  <line
                    x1={todayPt.x}
                    y1={todayPt.y}
                    x2={todayPt.x}
                    y2={padY + plotH}
                    stroke="var(--af-accent)"
                    strokeOpacity="0.2"
                  />
                ) : null}

                {/* Scrub crosshair */}
                {scrubPt ? (
                  <g>
                    <line
                      x1={scrubPt.x}
                      y1={padY}
                      x2={scrubPt.x}
                      y2={padY + plotH}
                      stroke="var(--af-line-strong)"
                    />
                    <circle
                      cx={scrubPt.x}
                      cy={scrubPt.y}
                      r="4"
                      fill="var(--af-accent)"
                      stroke="var(--af-panel)"
                      strokeWidth="1.5"
                    />
                  </g>
                ) : null}

                {/* Today crisp dot */}
                {todayPt ? (
                  <circle
                    cx={todayPt.x}
                    cy={todayPt.y}
                    r="3.5"
                    fill="var(--af-accent)"
                    stroke="var(--af-panel)"
                    strokeWidth="1.5"
                  />
                ) : null}
              </svg>

              <div className="af-aops-timeline-ticks af-aops-tabular" aria-hidden="true">
                <span>{copy.monthShort} 1</span>
                <span>{copy.monthShort} 8</span>
                <span>{copy.monthShort} 15</span>
                <span>{copy.monthShort} 23</span>
                <span>{copy.monthShort} {daysInMonth}</span>
              </div>
            </div>

            <div className="af-aops-stat-strip af-aops-tabular">
              {stats.tasks !== undefined ? (
                <div className="af-aops-stat-cell">
                  <span className="af-aops-stat-cell__label">Tasks</span>
                  <span className="af-aops-stat-cell__val">{stats.tasks.toLocaleString()}</span>
                </div>
              ) : null}
              {stats.runs !== undefined ? (
                <div className="af-aops-stat-cell">
                  <span className="af-aops-stat-cell__label">Runs</span>
                  <span className="af-aops-stat-cell__val">{stats.runs.toLocaleString()}</span>
                </div>
              ) : null}
              {costPerTask ? (
                <div className="af-aops-stat-cell">
                  <span className="af-aops-stat-cell__label">Per task</span>
                  <span className="af-aops-stat-cell__val">{costPerTask}</span>
                </div>
              ) : null}
              {stats.tokens !== undefined ? (
                <div className="af-aops-stat-cell">
                  <span className="af-aops-stat-cell__label">Tokens</span>
                  <span className="af-aops-stat-cell__val">{formatCompactCount(stats.tokens)}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="af-aops-sec">
            <div className="af-aops-sec__head">
              <span className="af-aops-sec__title">{copy.whereItWent}</span>
              <div
                className="af-aops-pills"
                role="tablist"
                aria-label={copy.whereItWent}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const nextView = view === "projects" ? "models" : "projects";
                    setView(nextView);
                    const first = (nextView === "projects" ? projects : models)[0];
                    if (first) setSelectedId(first.id);
                  }
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "projects"}
                  className="af-aops-pill"
                  data-active={view === "projects" ? "true" : undefined}
                  onClick={() => {
                    setView("projects");
                    if (projects[0]) setSelectedId(projects[0].id);
                  }}
                >
                  {copy.projects}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "models"}
                  className="af-aops-pill"
                  data-active={view === "models" ? "true" : undefined}
                  onClick={() => {
                    setView("models");
                    if (models[0]) setSelectedId(models[0].id);
                  }}
                >
                  {copy.models}
                </button>
              </div>
            </div>

            <div className="af-aops-list-card">
              {activeBreakdown.map((row) => {
                const share = Math.round((row.amount / breakdownSum) * 100);
                const delta = formatDeltaText(row.amount, row.last);
                const isSelected = selectedEntry?.id === row.id;
                const fullAmt = formatCurrencyValue(row.amount, currency);
                const shortAmt = formatCurrencyValue(row.amount, currency, {
                  compact: row.amount >= 10_000,
                });

                return (
                  <button
                    key={row.id}
                    type="button"
                    className="af-aops-usage-row"
                    data-selected={isSelected ? "true" : undefined}
                    aria-label={`${row.name}: ${fullAmt}, ${share}%${delta ? `, ${delta.text} on last month` : ""}`}
                    onClick={() => {
                      setSelectedId(row.id);
                      setPanelOpen(true);
                      onSelect?.(view, row.id);
                    }}
                  >
                    <span className="af-aops-usage-row__ident">
                      {view === "models" ? (
                        <ModelMakerMark model={row.name} size={15} />
                      ) : (
                        <span
                          className="af-aops-sched-swatch"
                          style={{ background: row.tone ?? "var(--af-warning)" }}
                        />
                      )}
                      <span className="af-aops-usage-row__name">{row.name}</span>
                    </span>

                    <span className="af-aops-usage-row__bar-track" aria-hidden="true">
                      <span
                        className="af-aops-usage-row__bar-fill"
                        style={{
                          width: `${Math.max(4, share)}%`,
                          background: row.tone ?? "var(--af-warning)",
                        }}
                      />
                    </span>

                    <span className="af-aops-usage-row__amt af-aops-tabular">
                      <AfTooltip label={fullAmt} delay={360}>
                        <span>{shortAmt}</span>
                      </AfTooltip>
                    </span>
                    <span className="af-aops-usage-row__share af-aops-tabular">{share}%</span>
                    <span
                      className="af-aops-usage-row__delta af-aops-tabular"
                      data-up={delta?.up ? "true" : undefined}
                    >
                      {delta?.text ?? "—"}
                    </span>
                    <span className="af-aops-app-row__chev" aria-hidden="true">
                      <AfIcon name="chevronRight" size={12} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="af-aops-sec">
              <div className="af-aops-sec__title">{copy.worthALook}</div>
              <div className="af-aops-list-card">
                {notes.map((note) => (
                  <div key={note.id} className="af-aops-note-row">
                    <span className="af-aops-note-row__icon" data-kind={note.kind}>
                      <AfIcon
                        name={note.kind === "spike" ? "alert" : note.kind === "jump" ? "arrowUpRight" : "wallet"}
                        size={13}
                      />
                    </span>
                    <div className="af-aops-note-row__body">
                      <div className="af-aops-note-row__title">{note.text}</div>
                      {note.detail ? <div className="af-aops-note-row__detail">{note.detail}</div> : null}
                    </div>
                    <div className="af-aops-note-row__end">
                      {note.badge ? (
                        <AfBadge tone={note.kind === "budget" ? "neutral" : "warning"} size="sm">
                          {note.badge}
                        </AfBadge>
                      ) : null}
                      <AfButton
                        variant="secondary"
                        size="xs"
                        onClick={() => (onOpenNote ? onOpenNote(note) : onNavigate?.("Activity"))}
                      >
                        Open
                      </AfButton>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AgentOpsShell>
  );
}
