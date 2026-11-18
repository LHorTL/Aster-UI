import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AfLineSeries } from "../advanced/shared";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfModal } from "../overlay/Modal";
import {
  WksKpiCard,
  WksSidebarExpandButton,
  WorkspaceInsetShell,
  type AfWorkspaceUser,
  type WksGroup,
  type WksNavItem,
} from "./WorkspaceShell";

export type AfAnalyticsStat = {
  label: string;
  value: string;
  delta: string;
  bars: number[];
  good?: "up" | "down";
};

export type AfAnalyticsBreakdownItem = {
  label: string;
  value: string;
  spark?: number[];
  tone?: "up" | "down" | "flat";
};

export type AfAnalyticsProduct = {
  label: string;
  value: string;
  share: number;
};

export type AfAnalyticsProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
  onConnect?: () => void;
  stats?: AfAnalyticsStat[];
  breakdown?: AfAnalyticsBreakdownItem[];
  products?: AfAnalyticsProduct[];
  channels?: AfLineSeries[];
};

const NAV: WksNavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Revenue", icon: "chart" },
  { label: "Invoices", icon: "receipt", count: 12 },
  { label: "Payouts", icon: "wallet" },
  { label: "Customers", icon: "users" },
];

const GROUPS: WksGroup[] = [
  {
    label: "Channels",
    items: [
      { label: "Online store", icon: "globe" },
      { label: "Marketplace", icon: "store" },
      { label: "Wholesale", icon: "building" },
      { label: "Subscriptions", icon: "refresh" },
    ],
  },
];

const PERIOD_MULTIPLIERS: Record<string, number> = {
  "Last 7 days": 1,
  "Last 30 days": 3.8,
  "Last 90 days": 10.6,
  "Year to date": 18.4,
};

const DEFAULT_STATS: AfAnalyticsStat[] = [
  { label: "Gross revenue", value: "$96,412", delta: "+12.5%", bars: [50, 71, 57, 79, 71, 86, 100], good: "up" },
  { label: "Active customers", value: "2,847", delta: "+8.2%", bars: [57, 57, 71, 71, 79, 79, 88], good: "up" },
  { label: "Conversion", value: "3.24%", delta: "+0.4%", bars: [71, 50, 57, 79, 57, 71, 79], good: "up" },
  { label: "Refund rate", value: "1.8%", delta: "-0.3%", bars: [86, 79, 79, 57, 71, 50, 36], good: "down" },
];

const DEFAULT_BREAKDOWN: AfAnalyticsBreakdownItem[] = [
  { label: "Gross sales", value: "$104,210", tone: "up", spark: [16, 21, 19, 26, 24, 32, 38] },
  { label: "Discounts", value: "−$4,180", tone: "down", spark: [31, 26, 30, 21, 24, 16, 12] },
  { label: "Refunds", value: "−$1,734", tone: "down", spark: [28, 31, 23, 25, 18, 20, 13] },
  { label: "Shipping", value: "$2,940", tone: "flat", spark: [19, 20, 19, 21, 20, 20, 21] },
  { label: "Taxes", value: "$8,316", tone: "flat", spark: [17, 19, 19, 20, 21, 21, 23] },
  { label: "Net revenue", value: "$96,412", tone: "up", spark: [15, 20, 18, 25, 27, 33, 39] },
];

function MiniSpark({ values, tone = "flat" }: { values?: number[]; tone?: "up" | "down" | "flat" }) {
  const pts = values && values.length >= 2 ? values : tone === "up" ? [14, 19, 18, 25, 31, 36] : tone === "down" ? [32, 27, 29, 20, 16, 12] : [20, 20, 21, 20, 21, 21];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const w = 36;
  const h = 13;
  const poly = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * (w - 2) + 1;
      const y = max === min ? h / 2 : h - 2 - ((v - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="af-wks-rev__spark" data-tone={tone} aria-hidden="true">
      <polyline points={poly} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DEFAULT_PRODUCTS: AfAnalyticsProduct[] = [
  { label: "Annual plan", value: "$38,400", share: 100 },
  { label: "Team seats", value: "$24,150", share: 63 },
  { label: "Monthly plan", value: "$18,920", share: 49 },
  { label: "Add-ons", value: "$9,640", share: 25 },
];

const LABELS_7D = ["Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7", "Mar 8", "Mar 9"];

const DEFAULT_CHANNELS: AfLineSeries[] = [
  { name: "Online store", values: [3650, 4120, 3840, 4420, 4080, 4760, 5180], color: "var(--af-series-4)" },
  { name: "Marketplace", values: [3250, 2860, 3980, 3420, 4150, 3680, 3920], color: "var(--af-series-2)" },
  { name: "Wholesale", values: [1820, 2140, 2480, 2060, 2620, 2840, 2580], color: "var(--af-series-1)" },
  { name: "Subscriptions", values: [1320, 1460, 1680, 1890, 1960, 2120, 2240], color: "var(--af-series-3)" },
];

const SESSIONS_SERIES: AfLineSeries[] = [
  { name: "This week", values: [1620, 1840, 1740, 2120, 2280, 2490, 2760] },
  { name: "Last week", values: [1420, 1540, 1610, 1720, 1840, 1960, 2080], kind: "compare" },
];

const AOV_SERIES: AfLineSeries[] = [
  { name: "This week", values: [118, 124, 129, 136, 138, 144, 148] },
  { name: "Last week", values: [104, 109, 114, 118, 122, 126, 131], kind: "compare" },
];

function fmtUsdK(v: number): string {
  if (v === 0) return "$0";
  return v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(v)}`;
}

function fmtCountK(v: number): string {
  if (v === 0) return "0";
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${Math.round(v)}`;
}

export function AfAnalytics(props: AfAnalyticsProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    onConnect,
    stats,
    breakdown = DEFAULT_BREAKDOWN,
    products = DEFAULT_PRODUCTS,
    channels,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Revenue");
  const [period, setPeriod] = useState("Last 7 days");
  const [exported, setExported] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reportName, setReportName] = useState("Weekly revenue overview");

  const mult = PERIOD_MULTIPLIERS[period] ?? 1;

  const resolvedStats = useMemo(() => {
    if (stats) return stats;
    if (mult === 1) return DEFAULT_STATS;
    const gross = Math.round(96412 * mult).toLocaleString("en-US");
    const cust = Math.round(2847 * Math.sqrt(mult)).toLocaleString("en-US");
    return [
      { ...DEFAULT_STATS[0]!, value: `$${gross}` },
      { ...DEFAULT_STATS[1]!, value: cust },
      DEFAULT_STATS[2]!,
      DEFAULT_STATS[3]!,
    ];
  }, [stats, mult]);

  const resolvedChannels = useMemo(
    () =>
      channels ??
      DEFAULT_CHANNELS.map((s) => ({
        ...s,
        values: s.values.map((v) => Math.round(v * mult)),
      })),
    [channels, mult],
  );

  const periodItems: AfMenuItem[] = Object.keys(PERIOD_MULTIPLIERS).map((label) => ({
    type: "radio",
    id: label,
    label,
    checked: period === label,
    onSelect: () => setPeriod(label),
  }));

  const showEmpty = empty && !loading;

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={GROUPS}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <header className="af-wks-topbar">
        <div className="af-wks-topbar__left">
          <WksSidebarExpandButton />
          <h1 className="af-wks-crumbs">
            <span>Analytics</span>
            <i className="af-wks-crumbs__sep" aria-hidden="true">/</i>
            <b className="af-wks-crumbs__cur">{activeNav}</b>
          </h1>
        </div>
        <div className="af-wks-topbar__right">
          <AfDropdownMenu items={periodItems} side="bottom" align="end" width={168}>
            <button type="button" className="af-wks-btn">
              <AfIcon name="calendar" size={12} />
              <span>{period}</span>
              <AfIcon name="chevronDown" size={11} />
            </button>
          </AfDropdownMenu>
          <button
            type="button"
            className="af-wks-btn"
            onClick={() => {
              setExported(true);
              window.setTimeout(() => setExported(false), 1800);
            }}
          >
            <AfIcon name={exported ? "check" : "download"} size={12} />
            <span>{exported ? "Exported" : "Export"}</span>
          </button>
          <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => setSaveOpen(true)}>
            <span>Save as report</span>
          </button>
        </div>
      </header>

      {showEmpty ? (
        <div className="af-wks-empty-wrap">
          <AfEmptyState
            icon="store"
            title="No revenue yet"
            text="Connect your storefront or billing provider to see gross sales, channel attribution and customer trends."
            action={
              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => onConnect?.()}>
                Connect store
              </button>
            }
          />
        </div>
      ) : (
        <div className="af-wks-scroll af-wks-rev">
          <div className="af-wks-rev__stats">
            {resolvedStats.map((stat) => {
              const isNegative = stat.delta.trim().startsWith("-") || stat.delta.trim().startsWith("−");
              const goodDir = stat.good ?? "up";
              const isBad = goodDir === "up" ? isNegative : !isNegative;
              return (
                <div key={stat.label} className="af-wks-card af-wks-rev__stat">
                  <span className="af-wks-rev__cap">{stat.label}</span>
                  {loading ? (
                    <div className="af-wks-rev__stat-row">
                      <AfSkeleton width={88} height={20} radius={5} />
                      <AfSkeleton width={34} height={16} radius={4} />
                    </div>
                  ) : (
                    <div className="af-wks-rev__stat-row">
                      <strong className="af-wks-rev__stat-val">
                        <span>{stat.value}</span>
                        <em className="af-wks-rev__stat-delta" data-bad={isBad || undefined}>
                          {stat.delta}
                        </em>
                      </strong>
                      <span className="af-wks-rev__bars" aria-hidden="true">
                        {stat.bars.map((pct, idx) => (
                          <i key={idx} style={{ height: `${Math.max(20, Math.min(100, pct))}%` }} />
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="af-wks-rev__main-row">
            <WksKpiCard
              className="af-wks-rev__main-chart"
              title="Revenue by channel"
              amount={mult === 1 ? "$96.4k" : fmtUsdK(96412 * mult)}
              delta={mult === 1 ? "+$7.9k" : `+${fmtUsdK(7900 * mult)}`}
              labels={LABELS_7D}
              series={resolvedChannels}
              format={fmtUsdK}
              yMax={channels ? undefined : Math.round(6000 * mult)}
              height={138}
              footer="Top 4 channels"
              loading={loading}
            />

            <div className="af-wks-card af-wks-rev__breakdown">
              <span className="af-wks-rev__cap">Revenue breakdown</span>
              {loading ? (
                <AfSkeleton lines={6} height={12} style={{ marginTop: 6 }} />
              ) : (
                <ul className="af-wks-rev__bd-list">
                  {breakdown.map((item) => (
                    <li key={item.label} className="af-wks-rev__bd-item" data-tone={item.tone}>
                      <span>{item.label}</span>
                      <span className="af-wks-rev__bd-right">
                        <b>{item.value}</b>
                        <MiniSpark values={item.spark} tone={item.tone} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="af-wks-rev__sub-row">
            <div className="af-wks-card af-wks-rev__sub-col af-wks-rev__products">
              <span className="af-wks-rev__cap">Top products</span>
              {loading ? (
                <AfSkeleton lines={4} height={14} />
              ) : (
                <div className="af-wks-rev__prod-list">
                  {products.map((prod) => (
                    <div key={prod.label} className="af-wks-rev__prod">
                      <div className="af-wks-rev__prod-head">
                        <span>{prod.label}</span>
                        <b>{prod.value}</b>
                      </div>
                      <span className="af-wks-rev__prod-track" aria-hidden="true">
                        <span
                          className="af-wks-rev__prod-fill"
                          style={{ width: `${Math.max(4, Math.min(100, prod.share))}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <WksKpiCard
              className="af-wks-rev__sub-col"
              title="Sessions over time"
              amount="16.4k"
              delta="+2.3k"
              labels={LABELS_7D}
              series={SESSIONS_SERIES}
              format={fmtCountK}
              yMax={3000}
              height={102}
              footer="This week vs. last week"
              loading={loading}
            />

            <WksKpiCard
              className="af-wks-rev__sub-col"
              title="Average order value"
              amount="$141"
              delta="+$17"
              labels={LABELS_7D}
              series={AOV_SERIES}
              format={(v) => `$${Math.round(v)}`}
              yMax={160}
              height={102}
              footer="This week vs. last week"
              loading={loading}
            />
          </div>
        </div>
      )}

      <AfModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save as report"
        description="Pin this view to your workspace sidebar so teammates can track it."
        closable
        contained
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="af-wks-btn" onClick={() => setSaveOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="af-wks-btn af-wks-btn--solid"
              onClick={() => {
                setSaveOpen(false);
                onNavigate?.(`Saved:${reportName}`);
              }}
            >
              Save report
            </button>
          </div>
        }
      >
        <input
          type="text"
          className="af-wks-field-input"
          aria-label="Report title"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
        />
      </AfModal>
    </WorkspaceInsetShell>
  );
}
