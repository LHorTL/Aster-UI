import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { ShellPanelLeftSvg } from "./AppShellFlat";

export type AfOnboardingLayout = "inset" | "flat";
export type AfOnboardingToneKind = "friendly" | "neutral" | "formal";
export type AfOnboardingLengthKind = "short" | "balanced" | "detailed";

export type AfOnboardingToneValues = {
  name: string;
  tone: AfOnboardingToneKind;
  length: AfOnboardingLengthKind;
  handover: boolean;
  email: string;
};

export type OnboardingPreviewFocus = "knowledge" | "assistant" | "chat" | "live";

/** 清理用户输入的网址，去除协议头、www.、查询串与尾随路径。 */
export function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/** 校验域名或子路径域名格式是否合法（例如 northwind.com 或 docs.northwind.com/help）。 */
export function isValidDomain(cleaned: string): boolean {
  if (!cleaned || cleaned.includes(" ") || cleaned.includes("@")) return false;
  const host = cleaned.split("/")[0] ?? "";
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(host);
}

/** 校验邮箱地址格式。 */
export function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/** 从主域名推导推荐品牌名（如 northwind.com -> Northwind，docs.acme-ai.io -> Acme Ai）。 */
export function deriveBrandFromDomain(domain?: string): string {
  const cleaned = cleanDomain(domain || "northwind.com");
  const host = (cleaned.split("/")[0] || "northwind.com").split(".");
  const commonSubdomains = new Set(["docs", "help", "support", "app", "api", "blog", "status", "dev"]);
  const core = host.length > 2 && commonSubdomains.has(host[0]!) ? host[1]! : host[0]!;
  if (!core) return "Northwind";
  return core
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function LumenLogoSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 107 107" fill="currentColor" aria-hidden="true">
      <path d="M106.447 67.3367C106.447 69.7104 104.523 71.6348 102.149 71.6348H75.928C73.5542 71.6348 71.6299 73.5591 71.6299 75.9329V102.16C71.6299 104.534 69.7056 106.458 67.3318 106.458H35.8198C35.8185 106.458 35.8174 106.459 35.8174 106.46C35.8174 106.462 35.8163 106.463 35.8149 106.463H4.29811C1.92433 106.463 0 104.539 0 102.165V39.1262C0 36.7525 1.92433 34.8281 4.29811 34.8281H30.5193C32.8931 34.8281 34.8174 32.9038 34.8174 30.53V4.29812C34.8174 1.92433 36.7417 0 39.1155 0H102.149C104.523 0 106.447 1.92433 106.447 4.29811V67.3367ZM35.8174 66.3425C35.8174 68.7163 37.7417 70.6406 40.1155 70.6406H66.3318C68.7056 70.6406 70.6299 68.7163 70.6299 66.3425V40.1155C70.6299 37.7417 68.7056 35.8174 66.3318 35.8174H40.1155C37.7417 35.8174 35.8174 37.7417 35.8174 40.1155V66.3425Z" />
    </svg>
  );
}

function LogOutDoorSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 18C18 18.4644 18 18.6965 17.978 18.8918C17.7952 20.5145 16.5145 21.7952 14.8919 21.978C14.6965 22 14.4644 22 14 22H11C7.70017 22 6.05025 22 5.02513 20.9749C4 19.9498 4 18.2998 4 15L4.00001 8.99998C4.00001 5.70016 4.00003 4.05024 5.02514 3.02512C6.05027 2 7.70018 2 11 2H14C14.4644 2 14.6965 2 14.8919 2.02201C16.5145 2.20483 17.7952 3.48547 17.978 5.10816C18 5.30347 18 5.53565 18 6" />
      <path d="M8.07612 11.1183C8 11.3021 8 11.535 8 12.001C8 12.4669 8 12.6999 8.07612 12.8837C8.17761 13.1287 8.37229 13.3234 8.61732 13.4249C8.80109 13.501 9.03406 13.501 9.5 13.501H14.5C14.5002 15.2503 14.511 16.1299 15.0623 16.3858C15.0829 16.3954 15.1037 16.4042 15.1249 16.4124C15.7045 16.6353 16.3999 16.0139 17.7907 14.7711C19.2576 13.4602 19.9912 12.7851 20 11.957C19.9912 11.1289 19.2576 10.4538 17.7907 9.14301C16.3999 7.90018 15.7045 7.27876 15.1249 7.50171C15.1037 7.50985 15.0829 7.51869 15.0623 7.52822C14.5018 7.78844 14.5 8.69318 14.5 10.501H9.5C9.03406 10.501 8.80109 10.501 8.61732 10.5771C8.37229 10.6786 8.17761 10.8733 8.07612 11.1183Z" />
    </svg>
  );
}

/** 3×3 像素级助手徽标（100% Flexbox 实现，0 Grid）。 */
export function AgentPixelMark({ muted = false }: { muted?: boolean }) {
  const activeMap = [1, 0, 1, 0, 1, 1, 1, 1, 0];
  return (
    <span className="af-obw__pixel-mark" data-muted={muted || undefined} aria-hidden="true">
      {activeMap.map((lit, idx) => (
        <i key={idx} data-lit={lit ? "" : undefined} />
      ))}
    </span>
  );
}

/** 根据语气与回复长度生成实时预览对话内容。 */
function buildPreviewReply(
  brand: string,
  tone: AfOnboardingToneKind,
  length: AfOnboardingLengthKind,
): string {
  const table: Record<AfOnboardingToneKind, Record<AfOnboardingLengthKind, string>> = {
    friendly: {
      short: `Yes! Switch your ${brand} plan anytime — we prorate the difference right away.`,
      balanced: `Happy to help! You can change your ${brand} plan at any time, and we prorate unused days automatically.`,
      detailed: `Happy to help! You can switch your ${brand} plan mid-month from Settings → Billing. New features unlock right away and unused days are prorated on your next invoice.`,
    },
    neutral: {
      short: "Yes. Plan changes take effect immediately and are prorated.",
      balanced: "Yes. You can change your plan at any time; the difference is prorated.",
      detailed: `You can change your ${brand} plan at any time in Settings → Billing. Feature limits update immediately and the remaining balance is prorated automatically.`,
    },
    formal: {
      short: "Subscriptions may be modified mid-cycle with automatic proration.",
      balanced: "Certainly. Subscriptions may be modified at any time, and any difference is prorated.",
      detailed: `Certainly. Administrators may adjust a ${brand} subscription mid-cycle under Settings → Billing, with prorated credit applied to the subsequent statement.`,
    },
  };
  return table[tone][length];
}

export type OnboardingSplitFrameProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  step: number;
  steps: number;
  centerStage?: boolean;
  heading: ReactNode;
  subcopy: ReactNode;
  email: string;
  product: string;
  logo?: ReactNode;
  layout?: AfOnboardingLayout;
  onBack?: () => void;
  onLogout?: () => void;
  preview: OnboardingDashboardPreviewProps;
  children: ReactNode;
};

/** 4 步 Assistant Onboarding 统一双栏外壳：保证顶栏、进度短横线、标题高度与右侧滑移预览零跳动。 */
export function OnboardingSplitFrame({
  step,
  steps,
  centerStage = false,
  heading,
  subcopy,
  email,
  product,
  logo,
  layout,
  onBack,
  onLogout,
  preview,
  className,
  children,
  ...rest
}: OnboardingSplitFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inheritedFlat, setInheritedFlat] = useState(false);

  useEffect(() => {
    if (layout) return;
    const ancestor = rootRef.current?.closest('[data-shell="flat"]');
    setInheritedFlat(Boolean(ancestor));
  }, [layout]);

  const resolvedLayout: AfOnboardingLayout = layout ?? (inheritedFlat ? "flat" : "inset");
  const totalDashes = Math.max(1, steps);

  return (
    <div ref={rootRef} className={cn("af-obw", className)} data-step={step} {...rest}>
      <header className="af-obw__top">
        <div className="af-obw__top-left">
          <span className="af-obw__logo" role="img" aria-label={product}>
            {logo ?? <LumenLogoSvg />}
          </span>
          {onBack ? (
            <button type="button" className="af-obw__top-btn" onClick={onBack}>
              <AfIcon name="arrowLeft" size={12} />
              <span>Back</span>
            </button>
          ) : null}
        </div>
        <div className="af-obw__top-right">
          <span className="af-obw__account">Logged in as {email}</span>
          <button type="button" className="af-obw__top-btn" onClick={() => onLogout?.()}>
            <LogOutDoorSvg />
            <span>Log out</span>
          </button>
        </div>
      </header>

      <div className="af-obw__body">
        <div className="af-obw__left">
          <div className={cn("af-obw__stage", centerStage && "af-obw__StageCenter")}>
            <div className="af-obw__dashes" aria-label={`Step ${step} of ${totalDashes}`}>
              {Array.from({ length: totalDashes }, (_, idx) => {
                const index = idx + 1;
                return (
                  <span
                    key={index}
                    className="af-obw__dash"
                    data-done={index < step || undefined}
                    data-current={index === step || undefined}
                  />
                );
              })}
            </div>
            <div className="af-obw__head">
              <h1 className="af-obw__title">{heading}</h1>
              <p className="af-obw__lead">{subcopy}</p>
            </div>
            {children}
          </div>

          <footer className="af-obw__foot">
            <span>© 2026 {product}</span>
            <button type="button" tabIndex={-1}>
              Terms
            </button>
            <button type="button" tabIndex={-1}>
              Privacy
            </button>
          </footer>
        </div>

        <OnboardingDashboardPreview {...preview} layout={resolvedLayout} />
      </div>
    </div>
  );
}

export type OnboardingDashboardPreviewProps = {
  focus: OnboardingPreviewFocus;
  layout?: AfOnboardingLayout;
  domains: string[];
  brand?: string;
  aliases?: string[];
  assistantName?: string;
  tone?: AfOnboardingToneKind;
  length?: AfOnboardingLengthKind;
  handover?: boolean;
  handoverEmail?: string;
  live?: boolean;
};

const CHART_HEIGHTS = [24, 30, 26, 38, 34, 46, 42, 54, 48, 62, 56, 72, 66, 84, 78, 92];
const SIDEBAR_SKEL_WIDTHS_A = [58, 72, 64, 52];
const SIDEBAR_SKEL_WIDTHS_B = [68, 54, 76, 60, 48, 66];

/** 右侧装饰性实时工作台预览（aria-hidden="true"，随步骤平滑纵向滑移聚焦对应模块）。 */
export function OnboardingDashboardPreview({
  focus,
  layout = "inset",
  domains,
  brand,
  aliases = [],
  assistantName,
  tone = "neutral",
  length = "balanced",
  handover = true,
  handoverEmail = "support@northwind.com",
  live = false,
}: OnboardingDashboardPreviewProps) {
  const hasBrand = Boolean((brand || "").trim()) || focus !== "knowledge" || domains.length > 0;
  const displayBrand = (brand || "").trim() || deriveBrandFromDomain(domains[0] || "northwind.com");
  const resolvedAssistant = (assistantName || "").trim() || `${displayBrand} Assistant`;
  const primaryDomain = domains[0] || "northwind.com";
  const replyText = buildPreviewReply(displayBrand, tone, length);
  const greetingText = live
    ? `Hi, I'm ${resolvedAssistant} – ask me anything about our products, plans or your account.`
    : `Hi, I'm the ${displayBrand} assistant – ask me anything about our products, plans or your account.`;

  return (
    <div className="af-obw__preview" aria-hidden="true">
      <div className="af-obw__win" data-layout={layout}>
        <aside className="af-obw__win-side">
          <div className="af-obw__win-ws">
            <span className="af-obw__win-mark" data-skel={!hasBrand || undefined}>
              {hasBrand ? displayBrand.charAt(0).toUpperCase() : ""}
            </span>
            {hasBrand ? (
              <>
                <span className="af-obw__win-wsname">{displayBrand}</span>
                <AfIcon name="chevronDown" size={10} />
              </>
            ) : (
              <span className="af-obw__skel-bar" style={{ width: 64, height: 8 }} />
            )}
          </div>

          <div className="af-obw__win-nav">
            {SIDEBAR_SKEL_WIDTHS_A.map((w, idx) => (
              <div key={`a-${idx}`} className="af-obw__win-skelrow" data-active={idx === 0 || undefined}>
                <span className="af-obw__skel-sq" />
                <span className="af-obw__skel-bar" style={{ width: w, height: 7 }} />
              </div>
            ))}
          </div>

          <div className="af-obw__win-nav">
            <span className="af-obw__skel-bar" style={{ width: 38, height: 6, margin: "4px 6px" }} />
            {SIDEBAR_SKEL_WIDTHS_B.map((w, idx) => (
              <div key={`b-${idx}`} className="af-obw__win-skelrow">
                <span className="af-obw__skel-sq" />
                <span className="af-obw__skel-bar" style={{ width: w, height: 7 }} />
              </div>
            ))}
          </div>
        </aside>

        <div className="af-obw__win-viewport">
          <div className="af-obw__win-sheet" data-focus={focus}>
            {/* Top Overview bar */}
            <div className="af-obw__p-topbar">
              <span className="af-obw__p-topicon">
                <ShellPanelLeftSvg />
              </span>
              {hasBrand ? (
                <span className="af-obw__p-toptitle">Overview</span>
              ) : (
                <span className="af-obw__skel-bar" style={{ width: 58, height: 8 }} />
              )}
            </div>

            {/* Skeleton KPI pills + cards */}
            <div className="af-obw__p-strip">
              {[42, 48, 38, 44].map((w, i) => (
                <div key={i} className="af-obw__p-stripitem">
                  <span className="af-obw__skel-bar" style={{ width: w, height: 6 }} />
                </div>
              ))}
            </div>

            <div className="af-obw__p-kpis">
              <div className="af-obw__p-kpi">
                <span className="af-obw__skel-bar" style={{ width: 64, height: 7 }} />
                <span className="af-obw__skel-bar" style={{ width: 42, height: 12 }} />
              </div>
              <div className="af-obw__p-kpi">
                <span className="af-obw__skel-bar" style={{ width: 58, height: 7 }} />
                <span className="af-obw__skel-bar" style={{ width: 48, height: 12 }} />
              </div>
            </div>

            {/* Section: Your assistant */}
            <div className="af-obw__p-section">
              {hasBrand ? (
                <span className="af-obw__p-sectitle">Your assistant</span>
              ) : (
                <span className="af-obw__skel-bar" style={{ width: 76, height: 8 }} />
              )}
              <div className="af-obw__p-card">
                <div className="af-obw__p-botrow">
                  <AgentPixelMark />
                  {hasBrand ? (
                    <span className="af-obw__p-cardtitle">{resolvedAssistant}</span>
                  ) : (
                    <span className="af-obw__skel-bar" style={{ width: 108, height: 9 }} />
                  )}
                  <span className="af-obw__p-pill">Draft</span>
                </div>

                {hasBrand ? (
                  <div className="af-obw__p-greeting">{greetingText}</div>
                ) : (
                  <div className="af-obw__p-greeting" data-skel="">
                    <span className="af-obw__skel-bar" style={{ width: "86%", height: 7 }} />
                    <span className="af-obw__skel-bar" style={{ width: "62%", height: 7 }} />
                  </div>
                )}

                {aliases.length > 0 ? (
                  <div className="af-obw__p-aliases">
                    <span>Also answers to</span>
                    {aliases.map((alias) => (
                      <span key={alias} className="af-obw__p-alias">
                        {alias}
                      </span>
                    ))}
                  </div>
                ) : hasBrand ? (
                  <div className="af-obw__p-aliases">
                    <span className="af-obw__skel-bar" style={{ width: 64, height: 6 }} />
                    <span className="af-obw__skel-bar" style={{ width: 44, height: 12, borderRadius: 6 }} />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Section: Conversations */}
            <div className="af-obw__p-section">
              {hasBrand ? (
                <span className="af-obw__p-sectitle">Conversations</span>
              ) : (
                <span className="af-obw__skel-bar" style={{ width: 82, height: 8 }} />
              )}
              <div className="af-obw__p-card">
                <div className="af-obw__p-chart">
                  <div className="af-obw__p-yaxis">
                    <span className="af-obw__skel-bar" style={{ width: 14, height: 5 }} />
                    <span className="af-obw__skel-bar" style={{ width: 14, height: 5 }} />
                    <span className="af-obw__skel-bar" style={{ width: 14, height: 5 }} />
                  </div>
                  <div className="af-obw__p-bars">
                    {CHART_HEIGHTS.map((pct, idx) => (
                      <span key={idx} className="af-obw__p-bar" style={{ height: `${pct}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Knowledge */}
            <div className="af-obw__p-section">
              {hasBrand ? (
                <span className="af-obw__p-sectitle">Knowledge</span>
              ) : (
                <span className="af-obw__skel-bar" style={{ width: 68, height: 8 }} />
              )}
              <div className="af-obw__p-card">
                <div className="af-obw__p-klist">
                  {(hasBrand ? (domains.length > 0 ? domains : [primaryDomain]) : []).map((dom) => (
                    <div key={dom} className="af-obw__p-krow">
                      <span className="af-obw__p-kdomain">
                        <span className="af-obw__p-dombadge">{displayBrand.charAt(0).toUpperCase()}</span>
                        <span>{dom}</span>
                      </span>
                      <span className="af-obw__p-klearning">
                        <i />
                        <span>Learning</span>
                      </span>
                    </div>
                  ))}
                  {(hasBrand ? [74, 92, 66, 84] : [86, 74, 92, 66, 84]).map((w, idx) => (
                    <div key={idx} className="af-obw__p-krow" data-skel="">
                      <span className="af-obw__skel-bar" style={{ width: w, height: 7 }} />
                      <span className="af-obw__skel-bar" style={{ width: 38, height: 7 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section: Test chat */}
            <div className="af-obw__p-section">
              <span className="af-obw__p-sectitle">Test chat</span>
              <div className="af-obw__p-card">
                <div className="af-obw__p-chat">
                  <div className="af-obw__p-q">
                    <AgentPixelMark muted />
                    <span>Can I change my plan mid-month?</span>
                  </div>
                  <div className="af-obw__p-a">
                    <span className="af-obw__p-asender">{resolvedAssistant}</span>
                    <p>{replyText}</p>
                  </div>
                  <div className="af-obw__p-handover-note">
                    {handover ? (
                      <>
                        <span>Not sure? It hands over to</span>
                        <em>{handoverEmail || `support@${primaryDomain}`}</em>
                      </>
                    ) : (
                      <span>Answers on its own without human handover</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
