import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn, useIsomorphicLayoutEffect, useSlidingTabIndicator } from "../../primitives";
import { AfNumberTicker } from "../motion/NumberTicker";

export type BillingCycle = "monthly" | "yearly";

export interface PricingLimitItem {
  icon?: "visitors" | "seats" | "workspaces";
  label: string;
  value: string;
}

export interface PricingFeatureItem {
  label: string;
  included: boolean;
}

export interface PricingPlanItem {
  id: string;
  name: string;
  badge?: string;
  monthly: number | string;
  yearly: number | string;
  ctaLabel?: string;
  limits: PricingLimitItem[];
  syncFrequency?: string;
  syncNote?: string;
  features: PricingFeatureItem[];
  onSelect?: (billing: BillingCycle) => void;
}

export interface AfPricingPlansProps {
  /** 套餐卡片定义列表（1–3 列并排，默认内置基础版 / 成长版 / 旗舰版）。 */
  plans?: PricingPlanItem[];
  /** 顶部大标题（默认 `"选择适合团队的方案"`）。 */
  title?: ReactNode;
  /** 副标题描述。 */
  subtitle?: ReactNode;
  /** 初始计费周期（默认 `"yearly"`）。 */
  defaultBilling?: BillingCycle;
  /** 货币符号或三字母 ISO 代码（默认 `"$"`）。 */
  currency?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

export type AfPricingPlansPatternProps = AfPricingPlansProps;

export const DEFAULT_PRICING_PLANS: PricingPlanItem[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 30,
    yearly: 24,
    ctaLabel: "Start free trial",
    limits: [
      { icon: "visitors", label: "Monthly visitors", value: "10k" },
      { icon: "seats", label: "Seats", value: "2" },
      { icon: "workspaces", label: "Workspaces", value: "1" },
    ],
    syncFrequency: "Hourly",
    syncNote: "Choose 2 of 7",
    features: [
      { label: "Unlimited dashboards", included: true },
      { label: "Custom domains", included: false },
      { label: "API access", included: false },
      { label: "Scheduled reports", included: true },
      { label: "SSO", included: false },
      { label: "Dedicated onboarding", included: false },
      { label: "Email support", included: true },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Popular",
    monthly: 99,
    yearly: 79,
    ctaLabel: "Start free trial",
    limits: [
      { icon: "visitors", label: "Monthly visitors", value: "100k" },
      { icon: "seats", label: "Seats", value: "10" },
      { icon: "workspaces", label: "Workspaces", value: "3" },
    ],
    syncFrequency: "Every 15 min",
    syncNote: "Choose 4 of 7",
    features: [
      { label: "Unlimited dashboards", included: true },
      { label: "Custom domains", included: true },
      { label: "API access", included: true },
      { label: "Scheduled reports", included: true },
      { label: "SSO", included: false },
      { label: "Dedicated onboarding", included: false },
      { label: "Chat + Email support", included: true },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 249,
    yearly: 199,
    ctaLabel: "Start free trial",
    limits: [
      { icon: "visitors", label: "Monthly visitors", value: "1M" },
      { icon: "seats", label: "Seats", value: "Unlimited" },
      { icon: "workspaces", label: "Workspaces", value: "10" },
    ],
    syncFrequency: "Real-time",
    syncNote: "Choose 7 of 7",
    features: [
      { label: "Unlimited dashboards", included: true },
      { label: "Custom domains", included: true },
      { label: "API access", included: true },
      { label: "Scheduled reports", included: true },
      { label: "SSO", included: false },
      { label: "Dedicated onboarding", included: true },
      { label: "Priority support + Slack channel", included: true },
    ],
  },
];

const APP_INTEGRATIONS = [
  { name: "Google Analytics" },
  { name: "Stripe", filledBg: "#635bff" },
  { name: "Gmail" },
  { name: "Slack" },
  { name: "Google Calendar" },
  { name: "HubSpot" },
  { name: "Notion" },
] as const;

function IntegrationAppGlyph({ name, gid }: { name: (typeof APP_INTEGRATIONS)[number]["name"]; gid: string }) {
  if (name === "Google Analytics") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#e37800" aria-hidden="true">
        <path d="M22.84 2.9982v17.9987c.0086 1.6473-1.3197 2.9897-2.967 2.9984a2.9808 2.9808 0 01-.3677-.0208c-1.528-.226-2.6477-1.5558-2.6105-3.1V3.1204c-.0369-1.5458 1.0856-2.8762 2.6157-3.1 1.6361-.1915 3.1178.9796 3.3093 2.6158.014.1201.0208.241.0202.3619zM4.1326 18.0548c-1.6417 0-2.9726 1.331-2.9726 2.9726C1.16 22.6691 2.4909 24 4.1326 24s2.9726-1.3309 2.9726-2.9726-1.331-2.9726-2.9726-2.9726zm7.8728-9.0098c-.0171 0-.0342 0-.0513.0003-1.6495.0904-2.9293 1.474-2.891 3.1256v7.9846c0 2.167.9535 3.4825 2.3505 3.763 1.6118.3266 3.1832-.7152 3.5098-2.327.04-.1974.06-.3983.0593-.5998v-8.9585c.003-1.6474-1.33-2.9852-2.9773-2.9882z" />
      </svg>
    );
  }
  if (name === "Stripe") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#ffffff" aria-hidden="true">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    );
  }
  if (name === "Gmail") {
    const g0 = `${gid}-gm0`;
    const g1 = `${gid}-gm1`;
    return (
      <svg width="16" height="16" viewBox="0 -5.77 56.4108 56.4108" fill="none" aria-hidden="true">
        <path d="M44.2255 5.76727H56.4051V41.0239C56.4051 43.148 54.683 44.8701 52.5589 44.8701H46.1486C45.8961 44.8701 45.646 44.8204 45.4127 44.7237C45.1794 44.6271 44.9674 44.4854 44.7888 44.3069C44.6102 44.1283 44.4686 43.9163 44.3719 43.683C44.2753 43.4497 44.2255 43.1996 44.2255 42.947V5.76727Z" fill={`url(#${g0})`} />
        <path d="M12.1796 5.76727H0V41.0239C0 43.148 1.72213 44.8701 3.84618 44.8701H10.2565C10.509 44.8701 10.7591 44.8204 10.9924 44.7237C11.2257 44.6271 11.4377 44.4854 11.6163 44.3069C11.7949 44.1283 11.9365 43.9163 12.0332 43.683C12.1298 43.4497 12.1796 43.1996 12.1796 42.947V5.76727Z" fill="#FC413D" />
        <path d="M10.0085 1.42778C7.43377 -0.736342 3.5924 -0.403647 1.42828 2.17105C-0.735843 4.74543 -0.403148 8.58681 2.17155 10.7512L26.5557 31.2479C27.0178 31.6362 27.602 31.8492 28.2056 31.8492C28.8091 31.8492 29.3934 31.6362 29.8554 31.2479L54.2396 10.7509C56.814 8.58681 57.1467 4.74543 54.9825 2.17073C52.8184 -0.403648 48.977 -0.736342 46.4027 1.42778L28.2054 16.724L10.0085 1.42778Z" fill={`url(#${g1})`} />
        <defs>
          <linearGradient id={g0} x1="50.3153" y1="5.76727" x2="50.3153" y2="44.8701" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60D673" />
            <stop offset="0.17" stopColor="#42C868" />
            <stop offset="0.39" stopColor="#0EBC5F" />
            <stop offset="0.62" stopColor="#00A9BB" />
            <stop offset="0.86" stopColor="#3C90FF" />
            <stop offset="1" stopColor="#3186FF" />
          </linearGradient>
          <linearGradient id={g1} x1="0.00006" y1="6.45153" x2="56.4107" y2="6.45153" gradientUnits="userSpaceOnUse">
            <stop offset="0.08" stopColor="#FF63A0" />
            <stop offset="0.3" stopColor="#FC413D" />
            <stop offset="0.5" stopColor="#FC413D" />
            <stop offset="0.65" stopColor="#FC413D" />
            <stop offset="0.72" stopColor="#FC5C30" />
            <stop offset="0.86" stopColor="#FEB10C" />
            <stop offset="0.91" stopColor="#FEC700" />
            <stop offset="0.96" stopColor="#FFDB0F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  if (name === "Slack") {
    return (
      <svg width="15" height="15" viewBox="0 0 49.883 49.877" fill="none" aria-hidden="true">
        <path d="M18.3549 10.4784C15.4713 10.4784 13.1157 8.12279 13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V10.4784H18.3549Z" fill="#36C5F0" />
        <path d="M18.3575 13.12C21.2411 13.12 23.5967 15.4756 23.5967 18.3592C23.5967 21.2428 21.2411 23.5984 18.3575 23.5984H5.2392C2.35561 23.5984 0 21.2428 0 18.3592C0 15.4756 2.35561 13.12 5.2392 13.12H18.3575Z" fill="#36C5F0" />
        <g transform="translate(26.28 0)">
          <path d="M13.1244 18.3592C13.1244 15.4756 15.48 13.12 18.3636 13.12C21.2472 13.12 23.6028 15.4756 23.6028 18.3592C23.6028 21.2428 21.2472 23.5984 18.3636 23.5984H13.1244V18.3592Z" fill="#2EB67D" />
          <path d="M10.4785 18.3575C10.4785 21.2411 8.12286 23.5967 5.23927 23.5967C2.35568 23.5967 7.4362e-05 21.2411 7.4362e-05 18.3575V5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0C8.12286 0 10.4785 2.35561 10.4785 5.2392V18.3575Z" fill="#2EB67D" />
        </g>
        <g transform="translate(0 26.28)">
          <path d="M10.4784 5.2392C10.4784 8.12279 8.12279 10.4784 5.2392 10.4784C2.35561 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35561 0 5.2392 0H10.4784V5.2392Z" fill="#E01E5A" />
          <path d="M13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V18.3575C23.5941 21.2411 21.2385 23.5967 18.3549 23.5967C15.4713 23.5967 13.1157 21.2411 13.1157 18.3575V5.2392Z" fill="#E01E5A" />
        </g>
        <g transform="translate(26.28 26.28)">
          <path d="M5.23927 13.1157C8.12286 13.1157 10.4785 15.4713 10.4785 18.3549C10.4785 21.2385 8.12286 23.5941 5.23927 23.5941C2.35568 23.5941 7.4362e-05 21.2385 7.4362e-05 18.3549V13.1157H5.23927Z" fill="#ECB22E" />
          <path d="M5.23927 10.4784C2.35568 10.4784 7.4362e-05 8.12279 7.4362e-05 5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0H18.3576C21.2412 0 23.5968 2.35561 23.5968 5.2392C23.5968 8.12279 21.2412 10.4784 18.3576 10.4784H5.23927Z" fill="#ECB22E" />
        </g>
      </svg>
    );
  }
  if (name === "Google Calendar") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#4285F4" aria-hidden="true">
        <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" />
      </svg>
    );
  }
  if (name === "HubSpot") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#FF7A59" aria-hidden="true">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function LimitIcon({ kind }: { kind?: PricingLimitItem["icon"] }) {
  if (kind === "seats") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.9 2.6 2.6 3 5.2" />
      </svg>
    );
  }
  if (kind === "workspaces") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function resolveCurrencyPrefix(currency: string): string {
  const trimmed = currency.trim();
  if (/^[A-Z]{3}$/i.test(trimmed)) {
    try {
      const part = new Intl.NumberFormat("en-US", { style: "currency", currency: trimmed.toUpperCase() })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value;
      return part ?? `${trimmed.toUpperCase()} `;
    } catch {
      return `${trimmed.toUpperCase()} `;
    }
  }
  return trimmed || "$";
}

function PlanCard({
  plan,
  billing,
  prefix,
  selectedId,
  onPick,
}: {
  plan: PricingPlanItem;
  billing: BillingCycle;
  prefix: string;
  selectedId: string | null;
  onPick: (plan: PricingPlanItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const innerRef = useRef<HTMLDivElement>(null);
  const [detailH, setDetailH] = useState<number | null>(null);
  const cardGid = useId().replace(/:/g, "");

  useIsomorphicLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const sync = () => setDetailH(el.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [plan.features.length]);

  const rawPrice = billing === "yearly" ? plan.yearly : plan.monthly;
  const isNumericPrice = typeof rawPrice === "number" && Number.isFinite(rawPrice);
  const hasCents = isNumericPrice && !Number.isInteger(rawPrice);
  const featured = Boolean(plan.badge);
  const isSelected = selectedId === plan.id;

  return (
    <article className="af-dt-ppc__card" data-featured={featured || undefined} data-selected={isSelected || undefined}>
      <p className="af-dt-ppc__name">
        <span className="af-dt-ppc__wrap" title={plan.name}>
          {plan.name}
        </span>
        {plan.badge ? (
          <span className="af-dt-ppc__badge af-dt-ppc__clip" title={plan.badge}>
            {plan.badge}
          </span>
        ) : null}
      </p>

      <p className="af-dt-ppc__price">
        {isNumericPrice ? (
          <>
            <span className="af-dt-ppc__amount">
              <AfNumberTicker
                value={rawPrice}
                prefix={prefix}
                format={{ minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 }}
                duration={440}
                animateOnMount={false}
              />
            </span>
            <span className="af-dt-ppc__per">per month</span>
          </>
        ) : (
          <span className="af-dt-ppc__amount">{typeof rawPrice === "string" ? rawPrice : "Custom"}</span>
        )}
      </p>

      <p className="af-dt-ppc__billed">
        {isNumericPrice ? (billing === "yearly" ? "Billed yearly" : "Billed monthly") : "Tailored to your organization"}
      </p>

      <button
        type="button"
        className="af-dt-ppc__cta"
        data-primary={featured || undefined}
        onClick={() => onPick(plan)}
      >
        <span className="af-dt-ppc__clip">{isSelected ? "✓ 14-day trial active" : (plan.ctaLabel ?? "Start free trial")}</span>
      </button>

      <ul className="af-dt-ppc__limits">
        {plan.limits.map((lim) => (
          <li key={lim.label}>
            <span className="af-dt-ppc__limit-label">
              <span className="af-dt-ppc__icon">
                <LimitIcon kind={lim.icon} />
              </span>
              <span className="af-dt-ppc__wrap" title={lim.label}>
                {lim.label}
              </span>
            </span>
            <span className="af-dt-ppc__limit-value af-dt-ppc__clip" title={lim.value}>
              {lim.value}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="af-dt-ppc__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide details" : "Show details"}
        <svg
          className="af-dt-ppc__chevron"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4.5 9.75 3.5-3.5 3.5 3.5" />
        </svg>
      </button>

      <div
        className="af-dt-ppc__details"
        data-open={open || undefined}
        style={{ height: open ? (detailH ?? "auto") : 0 }}
        aria-hidden={!open || undefined}
        {...(!open ? { inert: "true" as unknown as boolean } : undefined)}
      >
        <div ref={innerRef} className="af-dt-ppc__details-inner">
          {plan.syncFrequency || plan.syncNote ? (
            <>
              <div className="af-dt-ppc__section-head">
                <span className="af-dt-ppc__eyebrow">Integrations</span>
                {plan.syncFrequency ? (
                  <span className="af-dt-ppc__chip af-dt-ppc__clip" title={plan.syncFrequency}>
                    {plan.syncFrequency}
                  </span>
                ) : null}
              </div>
              {plan.syncNote ? (
                <div className="af-dt-ppc__section-sub">
                  <span className="af-dt-ppc__tag">Native sync</span>
                  <span>{plan.syncNote}</span>
                </div>
              ) : null}
              <div className="af-dt-ppc__apps">
                {APP_INTEGRATIONS.map((app) => (
                  <span
                    key={app.name}
                    className="af-dt-ppc__app"
                    role="img"
                    aria-label={app.name}
                    title={app.name}
                    style={"filledBg" in app && app.filledBg ? { background: app.filledBg, color: "#ffffff" } : undefined}
                  >
                    <IntegrationAppGlyph name={app.name} gid={cardGid} />
                  </span>
                ))}
              </div>
            </>
          ) : null}

          <ul className="af-dt-ppc__features">
            {plan.features.map((feat) => (
              <li key={feat.label} data-included={feat.included || undefined}>
                <svg
                  className="af-dt-ppc__mark"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {feat.included ? <path d="m3.5 8.5 3 3 6-7" /> : <path d="M3.5 8h9" />}
                </svg>
                <span className="af-dt-ppc__feature">{feat.label}</span>
                <span className="af-dt-ppc__sr">{feat.included ? " (included)" : " (not included)"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/**
 * 套餐定价表（affectUI Pro Block 1:1，纯 Flexbox 实现）：
 * 月付 / 年付滑动胶囊切换（自动计算最高节省折扣），切换时价格按数位里程表滚动，
 * 推荐档独享柔和强调发丝环与深色主按钮，支持无障碍高度折叠详情与集成图标矩阵。
 */
export function AfPricingPlans({
  plans = DEFAULT_PRICING_PLANS,
  title = "Choose your plan",
  subtitle = "Find the right plan for your team. Start with a 14-day free trial.",
  defaultBilling = "yearly",
  currency = "$",
  className,
  style,
}: AfPricingPlansProps = {}) {
  const [billing, setBilling] = useState<BillingCycle>(defaultBilling);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const monthlyBtnRef = useRef<HTMLButtonElement>(null);
  const yearlyBtnRef = useRef<HTMLButtonElement>(null);
  const thumb = useSlidingTabIndicator(switchRef, '[aria-checked="true"]', billing);

  const prefix = useMemo(() => resolveCurrencyPrefix(currency), [currency]);

  const maxSavingPct = useMemo(() => {
    let best = 0;
    for (const p of plans) {
      if (typeof p.monthly === "number" && typeof p.yearly === "number" && p.monthly > p.yearly && p.monthly > 0) {
        const save = Math.round(((p.monthly - p.yearly) / p.monthly) * 100);
        if (save > best) best = save;
      }
    }
    return best;
  }, [plans]);

  const onSwitchKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next: BillingCycle = billing === "monthly" ? "yearly" : "monthly";
      setBilling(next);
      requestAnimationFrame(() => {
        (next === "monthly" ? monthlyBtnRef.current : yearlyBtnRef.current)?.focus();
      });
    }
  };

  return (
    <section className={cn("af-dt-ppc", className)} style={style} aria-label="Pricing plans">
      <header className="af-dt-ppc__head">
        <h2 className="af-dt-ppc__title">{title}</h2>
        {subtitle ? <p className="af-dt-ppc__subtitle">{subtitle}</p> : null}
      </header>

      <div
        ref={switchRef}
        className="af-dt-ppc__switch"
        role="radiogroup"
        aria-label="Billing cycle"
        onKeyDown={onSwitchKey}
      >
        {thumb ? (
          <span
            className="af-dt-ppc__thumb"
            aria-hidden="true"
            data-ready={thumb.ready || undefined}
            style={{ width: thumb.width, transform: `translateX(${thumb.x}px)` }}
          />
        ) : null}
        <button
          ref={monthlyBtnRef}
          type="button"
          role="radio"
          aria-checked={billing === "monthly"}
          tabIndex={billing === "monthly" ? 0 : -1}
          className="af-dt-ppc__option"
          onClick={() => setBilling("monthly")}
        >
          Monthly
        </button>
        <button
          ref={yearlyBtnRef}
          type="button"
          role="radio"
          aria-checked={billing === "yearly"}
          tabIndex={billing === "yearly" ? 0 : -1}
          className="af-dt-ppc__option"
          onClick={() => setBilling("yearly")}
        >
          Yearly
          {maxSavingPct > 0 ? <span className="af-dt-ppc__save">−{maxSavingPct}%</span> : null}
        </button>
      </div>

      {plans.length === 0 ? (
        <p className="af-dt-ppc__empty">No plans available</p>
      ) : (
        <div className="af-dt-ppc__plans" data-four={plans.length === 4 || undefined}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              prefix={prefix}
              selectedId={selectedId}
              onPick={(picked) => {
                setSelectedId(picked.id);
                picked.onSelect?.(billing);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export const AfPricingPlansPattern = AfPricingPlans;
