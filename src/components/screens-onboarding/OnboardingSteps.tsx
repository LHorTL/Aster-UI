import {
  useEffect,
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
import {
  AgentPixelMark,
  OnboardingSplitFrame,
  cleanDomain,
  deriveBrandFromDomain,
  isValidDomain,
  isValidEmail,
  type AfOnboardingLayout,
  type AfOnboardingLengthKind,
  type AfOnboardingToneKind,
  type AfOnboardingToneValues,
} from "./OnboardingPreview";

/* ============================================================================
 * Step 1/4: AfOnboardingWebsite (onboarding-website)
 * ========================================================================== */

export type AfOnboardingWebsiteProps = Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> & {
  /** 已预知的网站域名列表（如从注册邮箱推断）；首项作为公司主站。 */
  defaultDomains?: string[];
  /** 点击继续或空输入框按 Enter 时触发，返回清洗后的域名数组。 */
  onContinue?: (domains: string[]) => void;
  /** 顶栏显示返回按钮并触发回调（第一步默认省略）。 */
  onBack?: () => void;
  /** 顶栏退出登录回调。 */
  onLogout?: () => void;
  /** 右上角当前登录账号邮箱，默认 `"alex@northwind.com"`。 */
  email?: string;
  /** 产品名称（用于左上角 Logo 无障碍标签与页脚版权），默认 `"Lumen"`。 */
  product?: string;
  /** 自定义左上角产品图标。 */
  logo?: ReactNode;
  /** 右侧工作台预览布局风格：`"inset"` | `"flat"`（未传时自动跟随祖先 `[data-shell="flat"]`）。 */
  layout?: AfOnboardingLayout;
  /** 打开步骤时自动聚焦主输入框。 */
  autoFocus?: boolean;
  /** 当前步骤序号，默认 `1`。 */
  step?: number;
  /** 总步骤数，默认 `4`。 */
  steps?: number;
  /** 演示自动打字文本（加载后逐字输入一次，用户按键立即接管）。 */
  autoType?: string;
};

/** AI 助手设置第 1 步：添加公司官网、文档与帮助中心域名芯片。 */
export function AfOnboardingWebsite(props: AfOnboardingWebsiteProps = {}) {
  const {
    defaultDomains = [],
    onContinue,
    onBack,
    onLogout,
    email = "alex@northwind.com",
    product = "Lumen",
    logo,
    layout,
    autoFocus = false,
    step = 1,
    steps = 4,
    autoType,
    className,
    ...rest
  } = props;

  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const userTouchedRef = useRef(false);

  const initialCleaned = useMemo(
    () => Array.from(new Set(defaultDomains.map(cleanDomain).filter(isValidDomain))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [domains, setDomains] = useState<string[]>(initialCleaned);
  const [draft, setDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!autoType || userTouchedRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDraft(autoType);
      return;
    }
    let idx = 0;
    const timer = window.setInterval(() => {
      if (userTouchedRef.current) {
        window.clearInterval(timer);
        return;
      }
      idx += 1;
      setDraft(autoType.slice(0, idx));
      if (idx >= autoType.length) {
        window.clearInterval(timer);
      }
    }, 55);
    return () => window.clearInterval(timer);
  }, [autoType]);

  const commitToken = (raw: string): string[] | null => {
    const cleaned = cleanDomain(raw);
    if (!cleaned) return null;
    if (!isValidDomain(cleaned)) {
      setErrorMsg("Enter a valid domain such as northwind.com.");
      return null;
    }
    setErrorMsg(null);
    const next = domains.includes(cleaned) ? domains : [...domains, cleaned];
    setDomains(next);
    setDraft("");
    return next;
  };

  const triggerContinue = (nextDomains: string[]) => {
    if (nextDomains.length === 0) {
      setErrorMsg("Add at least one website or help center domain to continue.");
      return;
    }
    setErrorMsg(null);
    onContinue?.(nextDomains);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim()) {
      const next = commitToken(draft);
      if (next && domains.length === 0) {
        onContinue?.(next);
      }
      return;
    }
    triggerContinue(domains);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    userTouchedRef.current = true;
    if (event.key === "," || event.key === " ") {
      if (draft.trim()) {
        event.preventDefault();
        commitToken(draft);
      }
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && domains.length > 0) {
      event.preventDefault();
      setDomains((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const removeDomain = (target: string) => {
    setDomains((prev) => prev.filter((item) => item !== target));
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const canGo = Boolean(draft.trim()) || domains.length > 0;

  return (
    <OnboardingSplitFrame
      step={step}
      steps={steps}
      centerStage
      heading="What's your company's website?"
      subcopy="Your assistant learns from it. Add your docs or help center, too."
      email={email}
      product={product}
      logo={logo}
      layout={layout}
      onBack={onBack}
      onLogout={onLogout}
      className={className}
      preview={{
        focus: "knowledge",
        domains,
      }}
      {...rest}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="af-obw__entry-wrap">
          <span className="af-obw__glow" aria-hidden="true" />
          <div className="af-obw__entry" data-invalid={errorMsg ? true : undefined}>
            <input
              ref={inputRef}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              className="af-obw__entry-input"
              aria-label="Company website or docs domain"
              aria-invalid={errorMsg ? "true" : undefined}
              aria-describedby={errorMsg ? hintId : undefined}
              placeholder={domains.length > 0 ? "Add docs or help center…" : "northwind.com"}
              value={draft}
              onChange={(e) => {
                userTouchedRef.current = true;
                setDraft(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="af-obw__entry-add"
              disabled={!draft.trim()}
              aria-label="Add domain"
              onClick={() => {
                commitToken(draft);
                inputRef.current?.focus();
              }}
            >
              <AfIcon name="plus" size={13} />
            </button>
            <button
              type="submit"
              className="af-obw__entry-go"
              disabled={!canGo}
              aria-label="Continue"
            >
              <AfIcon name="arrowRight" size={14} />
            </button>
          </div>
        </div>

        {domains.length > 0 ? (
          <div className="af-obw__chips" aria-label="Added domains">
            {domains.map((dom) => (
              <span key={dom} className="af-obw__chip">
                <span>{dom}</span>
                <button
                  type="button"
                  className="af-obw__chip-rm"
                  aria-label={`Remove ${dom}`}
                  onClick={() => removeDomain(dom)}
                >
                  <AfIcon name="x" size={10} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {errorMsg ? (
          <p id={hintId} className="af-obw__hint" data-error="" role="status" aria-live="polite">
            {errorMsg}
          </p>
        ) : null}
      </form>
    </OnboardingSplitFrame>
  );
}

/* ============================================================================
 * Step 2/4: AfOnboardingBrand (onboarding-brand)
 * ========================================================================== */

export type AfOnboardingBrandProps = Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> & {
  /** 上一步的主站域名，用于自动推荐公司品牌名（如 `"northwind.com"` -> `"Northwind"`）。 */
  domain?: string;
  /** 预设名称列表（传入后替代域名推导；首项为助手对外自称主名称）。 */
  defaultNames?: string[];
  /** 点击继续时回调所有品牌名称（首项为主名称）。 */
  onContinue?: (names: string[]) => void;
  /** 顶栏返回回调。 */
  onBack?: () => void;
  /** 顶栏退出登录回调。 */
  onLogout?: () => void;
  /** 右上角登录邮箱，默认 `"alex@northwind.com"`。 */
  email?: string;
  /** 产品名称，默认 `"Lumen"`。 */
  product?: string;
  /** 左上角自定义 Logo。 */
  logo?: ReactNode;
  /** 右侧预览布局风格：`"inset"` | `"flat"`。 */
  layout?: AfOnboardingLayout;
  /** 打开步骤时自动聚焦输入框。 */
  autoFocus?: boolean;
  /** 当前步骤序号，默认 `2`。 */
  step?: number;
  /** 总步骤数，默认 `4`。 */
  steps?: number;
  /** 演示自动打字文本。 */
  autoType?: string;
};

/** AI 助手设置第 2 步：确认公司品牌名称与常用简称，右侧仪表盘实时更新问候语与标签。 */
export function AfOnboardingBrand(props: AfOnboardingBrandProps = {}) {
  const {
    domain = "northwind.com",
    defaultNames,
    onContinue,
    onBack,
    onLogout,
    email = "alex@northwind.com",
    product = "Lumen",
    logo,
    layout,
    autoFocus = false,
    step = 2,
    steps = 4,
    autoType,
    className,
    ...rest
  } = props;

  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const userTouchedRef = useRef(false);

  const initialNames = useMemo(() => {
    if (defaultNames && defaultNames.length > 0) return defaultNames;
    return [deriveBrandFromDomain(domain)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [names, setNames] = useState<string[]>(initialNames);
  const [draft, setDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!autoType || userTouchedRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDraft(autoType);
      return;
    }
    let idx = 0;
    const timer = window.setInterval(() => {
      if (userTouchedRef.current) {
        window.clearInterval(timer);
        return;
      }
      idx += 1;
      setDraft(autoType.slice(0, idx));
      if (idx >= autoType.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [autoType]);

  const addName = (raw: string): string[] | null => {
    const trimmed = raw.replace(/,+$/, "").trim();
    if (!trimmed) return null;
    setErrorMsg(null);
    const exists = names.some((n) => n.toLowerCase() === trimmed.toLowerCase());
    const next = exists ? names : [...names, trimmed];
    setNames(next);
    setDraft("");
    return next;
  };

  const triggerContinue = (nextNames: string[]) => {
    if (nextNames.length === 0) {
      setErrorMsg("Add at least your primary company name to continue.");
      return;
    }
    setErrorMsg(null);
    onContinue?.(nextNames);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim()) {
      addName(draft);
      return;
    }
    triggerContinue(names);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    userTouchedRef.current = true;
    if (event.key === ",") {
      if (draft.trim()) {
        event.preventDefault();
        addName(draft);
      }
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && names.length > 0) {
      event.preventDefault();
      setNames((prev) => prev.slice(0, -1));
    }
  };

  const aliases = names.slice(1);
  const canGo = Boolean(draft.trim()) || names.length > 0;

  return (
    <OnboardingSplitFrame
      step={step}
      steps={steps}
      centerStage
      heading="What's your company called?"
      subcopy="Your assistant introduces itself with it. Add short forms, too."
      email={email}
      product={product}
      logo={logo}
      layout={layout}
      onBack={onBack}
      onLogout={onLogout}
      className={className}
      preview={{
        focus: "assistant",
        domains: [cleanDomain(domain) || "northwind.com"],
        brand: names[0] || deriveBrandFromDomain(domain),
        aliases,
      }}
      {...rest}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="af-obw__entry-wrap">
          <span className="af-obw__glow" aria-hidden="true" />
          <div className="af-obw__entry" data-invalid={errorMsg ? true : undefined}>
            <input
              ref={inputRef}
              type="text"
              autoComplete="organization"
              className="af-obw__entry-input"
              aria-label="Company name or short form"
              aria-invalid={errorMsg ? "true" : undefined}
              aria-describedby={errorMsg ? errorId : undefined}
              placeholder={names.length > 0 ? "Add a short form" : deriveBrandFromDomain(domain)}
              value={draft}
              onChange={(e) => {
                userTouchedRef.current = true;
                setDraft(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="af-obw__entry-add"
              disabled={!draft.trim()}
              aria-label="Add short form"
              onClick={() => {
                addName(draft);
                inputRef.current?.focus();
              }}
            >
              <AfIcon name="plus" size={13} />
            </button>
            <button
              type="submit"
              className="af-obw__entry-go"
              disabled={!canGo}
              aria-label="Continue"
            >
              <AfIcon name="arrowRight" size={14} />
            </button>
          </div>
        </div>

        {names.length > 0 ? (
          <div className="af-obw__chips" aria-label="Brand names">
            {names.map((item) => (
              <span key={item} className="af-obw__chip">
                <span>{item}</span>
                <button
                  type="button"
                  className="af-obw__chip-rm"
                  aria-label={`Remove ${item}`}
                  onClick={() => {
                    setNames((prev) => prev.filter((x) => x !== item));
                    inputRef.current?.focus();
                  }}
                >
                  <AfIcon name="x" size={10} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {errorMsg ? (
          <p id={errorId} className="af-obw__hint" data-error="" role="status" aria-live="polite">
            {errorMsg}
          </p>
        ) : null}
      </form>
    </OnboardingSplitFrame>
  );
}

/* ============================================================================
 * Step 3/4: AfOnboardingTone (onboarding-tone)
 * ========================================================================== */

export type AfOnboardingToneProps = Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> & {
  /** 第一步的主站域名（用于 Knowledge 预览与默认人工转接邮箱 `support@...`）。 */
  domain?: string;
  /** 第二步的主品牌名称（缺省时由 `domain` 自动推导）。 */
  brand?: string;
  /** 第二步的品牌简称标签列表。 */
  aliases?: string[];
  /** 助手初始名称（缺省为 `"<brand> Assistant"`）。 */
  defaultName?: string;
  /** 初始语气，默认 `"neutral"`。 */
  defaultTone?: AfOnboardingToneKind;
  /** 初始回复长度，默认 `"balanced"`。 */
  defaultLength?: AfOnboardingLengthKind;
  /** 不确定时是否转接真人，默认 `true`。 */
  defaultHandover?: boolean;
  /** 初始人工转接邮箱（缺省为 `support@<domain>`）。 */
  defaultEmail?: string;
  /** 提交回调（要求名称非空，且开启转接时邮箱格式合法）。 */
  onContinue?: (values: AfOnboardingToneValues) => void;
  /** 顶栏返回回调。 */
  onBack?: () => void;
  /** 顶栏退出登录回调。 */
  onLogout?: () => void;
  /** 右上角当前登录账号，默认 `"alex@northwind.com"`。 */
  email?: string;
  /** 产品名称，默认 `"Lumen"`。 */
  product?: string;
  /** 左上角自定义 Logo。 */
  logo?: ReactNode;
  /** 右侧预览布局风格：`"inset"` | `"flat"`。 */
  layout?: AfOnboardingLayout;
  /** 打开步骤时自动聚焦第一个字段。 */
  autoFocus?: boolean;
  /** 当前步骤序号，默认 `3`。 */
  step?: number;
  /** 总步骤数，默认 `4`。 */
  steps?: number;
};

const TONE_OPTIONS: { value: AfOnboardingToneKind; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
];

const LENGTH_OPTIONS: { value: AfOnboardingLengthKind; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

/** 单焦点键盘方向键单选组（Roving Tabindex Radio Group）。 */
function SegmentedRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }
    if (nextIndex >= 0) {
      event.preventDefault();
      const target = options[nextIndex]!;
      onChange(target.value);
      btnRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="af-obw__field">
      <span id={labelId} className="af-obw__label">
        {label}
      </span>
      <div className="af-obw__seg" role="radiogroup" aria-labelledby={labelId}>
        {options.map((opt, idx) => {
          const checked = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className="af-obw__seg-btn"
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** AI 助手设置第 3 步：配置助手名称、口吻、回复详略与人工兜底邮箱，右侧实时模拟对话应答。 */
export function AfOnboardingTone(props: AfOnboardingToneProps = {}) {
  const {
    domain = "northwind.com",
    brand,
    aliases = ["Northwind Co."],
    defaultName,
    defaultTone = "neutral",
    defaultLength = "balanced",
    defaultHandover = true,
    defaultEmail,
    onContinue,
    onBack,
    onLogout,
    email = "alex@northwind.com",
    product = "Lumen",
    logo,
    layout,
    autoFocus = false,
    step = 3,
    steps = 4,
    className,
    ...rest
  } = props;

  const cleanedDomain = cleanDomain(domain) || "northwind.com";
  const resolvedBrand = (brand || "").trim() || deriveBrandFromDomain(cleanedDomain);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const handoverLabelId = useId();

  const [assistantName, setAssistantName] = useState(defaultName ?? `${resolvedBrand} Assistant`);
  const [tone, setTone] = useState<AfOnboardingToneKind>(defaultTone);
  const [length, setLength] = useState<AfOnboardingLengthKind>(defaultLength);
  const [handover, setHandover] = useState<boolean>(defaultHandover);
  const [handoverEmail, setHandoverEmail] = useState(defaultEmail ?? `support@${cleanedDomain.split("/")[0]}`);

  useEffect(() => {
    if (autoFocus) nameInputRef.current?.focus();
  }, [autoFocus]);

  const nameValid = assistantName.trim().length > 0;
  const emailValid = !handover || isValidEmail(handoverEmail);
  const canSubmit = nameValid && emailValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onContinue?.({
      name: assistantName.trim(),
      tone,
      length,
      handover,
      email: handover ? handoverEmail.trim() : "",
    });
  };

  return (
    <OnboardingSplitFrame
      step={step}
      steps={steps}
      centerStage
      heading="How should your assistant sound?"
      subcopy="Give it a name, a voice and someone to ask."
      email={email}
      product={product}
      logo={logo}
      layout={layout}
      onBack={onBack}
      onLogout={onLogout}
      className={className}
      preview={{
        focus: "chat",
        domains: [cleanedDomain],
        brand: resolvedBrand,
        aliases,
        assistantName: assistantName.trim() || `${resolvedBrand} Assistant`,
        tone,
        length,
        handover,
        handoverEmail: handoverEmail.trim(),
      }}
      {...rest}
    >
      <form className="af-obw__form" onSubmit={handleSubmit} noValidate>
        <div className="af-obw__field">
          <label htmlFor={nameId} className="af-obw__label">
            Name
          </label>
          <input
            ref={nameInputRef}
            id={nameId}
            type="text"
            className="af-obw__text-input"
            data-invalid={!nameValid || undefined}
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            placeholder={`${resolvedBrand} Assistant`}
          />
        </div>

        <SegmentedRadioGroup label="Tone" options={TONE_OPTIONS} value={tone} onChange={setTone} />

        <SegmentedRadioGroup label="Reply length" options={LENGTH_OPTIONS} value={length} onChange={setLength} />

        <div className="af-obw__handover">
          <div className="af-obw__handover-row">
            <div id={handoverLabelId} className="af-obw__handover-copy">
              <strong>Hand over to a person</strong>
              <span>When it can&apos;t answer for sure</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={handover}
              aria-labelledby={handoverLabelId}
              className="af-ob__switch"
              onClick={() => setHandover((v) => !v)}
            >
              <span className="af-ob__switch-thumb" />
            </button>
          </div>

          {handover ? (
            <input
              type="email"
              aria-label="Handover email address"
              aria-invalid={!emailValid ? "true" : undefined}
              className="af-obw__text-input"
              data-invalid={!emailValid || undefined}
              value={handoverEmail}
              onChange={(e) => setHandoverEmail(e.target.value)}
              placeholder={`support@${cleanedDomain.split("/")[0]}`}
            />
          ) : null}
        </div>

        <button type="submit" className="af-obw__submit" disabled={!canSubmit}>
          <span>Continue</span>
          <AfIcon name="arrowRight" size={13} />
        </button>
      </form>
    </OnboardingSplitFrame>
  );
}

/* ============================================================================
 * Step 4/4: AfOnboardingReady (onboarding-ready)
 * ========================================================================== */

export type AfOnboardingReadyProps = HTMLAttributes<HTMLDivElement> & {
  /** 第一步收集的知识源域名列表，默认 `["northwind.com"]`。 */
  domains?: string[];
  /** 第二步确认的主品牌名（缺省由首域名推导）。 */
  brand?: string;
  /** 第二步添加的品牌简称数组。 */
  aliases?: string[];
  /** 第三步设置的助手名称（缺省为 `"<brand> Assistant"`）。 */
  name?: string;
  /** 第三步选择的口吻，默认 `"neutral"`。 */
  tone?: AfOnboardingToneKind;
  /** 第三步选择的回复详略，默认 `"balanced"`。 */
  length?: AfOnboardingLengthKind;
  /** 第三步设置的人工兜底邮箱；传空字符串时显示 `"Nobody – it answers itself"`。 */
  handoverTo?: string;
  /** 点击主按钮 `"Open dashboard"` 时回调。 */
  onFinish?: () => void;
  /** 点击每行右侧 `"Edit"` 时回调来源步骤编号（`1 | 2 | 3`）。 */
  onEdit?: (step: 1 | 2 | 3) => void;
  /** 顶栏返回回调。 */
  onBack?: () => void;
  /** 顶栏退出登录回调。 */
  onLogout?: () => void;
  /** 右上角当前登录邮箱，默认 `"alex@northwind.com"`。 */
  email?: string;
  /** 产品名称，默认 `"Lumen"`。 */
  product?: string;
  /** 左上角自定义 Logo。 */
  logo?: ReactNode;
  /** 右侧预览布局风格：`"inset"` | `"flat"`。 */
  layout?: AfOnboardingLayout;
  /** 打开步骤时自动聚焦 `"Open dashboard"` 主按钮。 */
  autoFocus?: boolean;
  /** 当前步骤序号，默认 `4`。 */
  step?: number;
  /** 总步骤数，默认 `4`。 */
  steps?: number;
};

/** AI 助手设置第 4 步（完成确认）：语义化 `<dl>` 清单核对全部设置，支持跳步编辑。 */
export function AfOnboardingReady(props: AfOnboardingReadyProps = {}) {
  const {
    domains = ["northwind.com"],
    brand,
    aliases = ["Northwind Co."],
    name,
    tone = "neutral",
    length = "balanced",
    handoverTo = "support@northwind.com",
    onFinish,
    onEdit,
    onBack,
    onLogout,
    email = "alex@northwind.com",
    product = "Lumen",
    logo,
    layout,
    autoFocus = false,
    step = 4,
    steps = 4,
    className,
    ...rest
  } = props;

  const finishBtnRef = useRef<HTMLButtonElement>(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (autoFocus) finishBtnRef.current?.focus();
  }, [autoFocus]);

  const effectiveDomains = domains.length > 0 ? domains : ["northwind.com"];
  const resolvedBrand = (brand || "").trim() || deriveBrandFromDomain(effectiveDomains[0]);
  const resolvedName = (name || "").trim() || `${resolvedBrand} Assistant`;
  const voiceLine = `${tone.charAt(0).toUpperCase() + tone.slice(1)}, ${length} replies`;
  const handoverLine = handoverTo.trim() ? handoverTo.trim() : "Nobody – it answers itself";

  return (
    <OnboardingSplitFrame
      step={step}
      steps={steps}
      centerStage
      heading="Your assistant is ready"
      subcopy="Here's what it knows. You can change all of it later."
      email={email}
      product={product}
      logo={logo}
      layout={layout}
      onBack={onBack}
      onLogout={onLogout}
      className={className}
      preview={{
        focus: "live",
        domains: effectiveDomains,
        brand: resolvedBrand,
        aliases,
        assistantName: resolvedName,
        tone,
        length,
        handover: Boolean(handoverTo.trim()),
        handoverEmail: handoverTo.trim(),
        live: true,
      }}
      {...rest}
    >
      <div className="af-obw__ready">
        <dl className="af-obw__dl">
          <div className="af-obw__dl-row">
            <dt>Learns from</dt>
            <dd title={effectiveDomains.join(", ")}>{effectiveDomains.join(", ")}</dd>
            <button
              type="button"
              className="af-obw__edit-btn"
              aria-label="Edit learns from"
              onClick={() => onEdit?.(1)}
            >
              Edit
            </button>
          </div>

          <div className="af-obw__dl-row">
            <dt>Name</dt>
            <dd title={resolvedName}>
              <span className="af-obw__dl-agent">
                <AgentPixelMark />
                <span>{resolvedName}</span>
              </span>
            </dd>
            <button
              type="button"
              className="af-obw__edit-btn"
              aria-label="Edit name"
              onClick={() => onEdit?.(3)}
            >
              Edit
            </button>
          </div>

          <div className="af-obw__dl-row">
            <dt>Voice</dt>
            <dd title={voiceLine}>{voiceLine}</dd>
            <button
              type="button"
              className="af-obw__edit-btn"
              aria-label="Edit voice"
              onClick={() => onEdit?.(3)}
            >
              Edit
            </button>
          </div>

          <div className="af-obw__dl-row">
            <dt>Hands over to</dt>
            <dd title={handoverLine}>{handoverLine}</dd>
            <button
              type="button"
              className="af-obw__edit-btn"
              aria-label="Edit handover"
              onClick={() => onEdit?.(3)}
            >
              Edit
            </button>
          </div>
        </dl>

        <button
          ref={finishBtnRef}
          type="button"
          className="af-obw__submit"
          onClick={() => {
            setLaunched(true);
            onFinish?.();
          }}
        >
          <span>{launched && !onFinish ? "Dashboard opened" : "Open dashboard"}</span>
          <AfIcon name={launched && !onFinish ? "check" : "arrowRight"} size={13} />
        </button>
      </div>
    </OnboardingSplitFrame>
  );
}
