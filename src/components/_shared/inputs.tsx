import type { CSSProperties, ReactNode, RefObject } from "react";
import type { AffectIconKey } from "../../model";
import type { AfCommand } from "../overlay/CommandPalette";
import { AfPopover } from "../overlay/Popover";
import type { AfDateRangeValue } from "../advanced/shared";
import { addDays, cn, getLocalToday } from "../../primitives";

/* ------------------------------------------------------------------ */
/* Shared helpers & anchored popover                                   */
/* ------------------------------------------------------------------ */

/** Extract up to 2 uppercase initials for Latin names, or 1 character for single-token / CJK names. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 1) ?? "?").toUpperCase();
}

/** Anchored popover container: closes on outside pointer-down and Escape, portals cleanly into AfLayer. */
export function StagePopover({
  open,
  anchorRef,
  align = "start",
  onClose,
  className,
  style,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  align?: "start" | "end";
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <AfPopover
      open={open}
      anchorRef={anchorRef}
      align={align}
      role="dialog"
      flush
      onPointerDownOutside={onClose}
      onEscapeKeyDown={onClose}
      className={cn("af-in-pop", className)}
      style={{ overflowY: "auto", ...style }}
    >
      {children}
    </AfPopover>
  );
}

/* ------------------------------------------------------------------ */
/* Filter Menu (Clean)                                                 */
/* ------------------------------------------------------------------ */

export type FilterMenuGroup = {
  id: string;
  label: string;
  /** Prefix placed in front of the option label on its chip, e.g. `"Deal: "`. */
  chipPrefix?: string;
  options: { id: string; label: string }[];
};

export type AfFilterMenuProps = {
  groups?: FilterMenuGroup[];
  title?: string;
  value?: Record<string, string[]>;
  defaultValue?: Record<string, string[]>;
  onChange?: (value: Record<string, string[]>) => void;
  defaultOpen?: string[];
  hints?: boolean;
  className?: string;
};

export const FILTER_GROUPS: FilterMenuGroup[] = [
  {
    id: "stage",
    label: "Stage",
    options: [
      { id: "new-lead", label: "New lead" },
      { id: "qualified", label: "Qualified" },
      { id: "proposal", label: "Proposal sent" },
      { id: "negotiation", label: "Negotiation" },
    ],
  },
  {
    id: "deal",
    label: "Deal size",
    chipPrefix: "Deal: ",
    options: [
      { id: "under-5k", label: "Under $5k" },
      { id: "5k-20k", label: "$5k–20k" },
      { id: "20k-50k", label: "$20k–50k" },
      { id: "over-50k", label: "Over $50k" },
    ],
  },
  {
    id: "region",
    label: "Region",
    options: [
      { id: "dach", label: "DACH" },
      { id: "nordics", label: "Nordics" },
      { id: "uk-ie", label: "UK & Ireland" },
      { id: "na", label: "North America" },
      { id: "apac", label: "APAC" },
    ],
  },
];

export type FilterChip = { groupId: string; optionId: string; label: string };

/* ------------------------------------------------------------------ */
/* Combobox (Pro: searchable multi/single select)                      */
/* ------------------------------------------------------------------ */

export type AfComboboxOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
};

export type ComboboxPerson = {
  id: string;
  name: string;
  role: string;
  group: "DESIGN" | "ENGINEERING" | "PRODUCT" | "INVITED" | (string & {});
};

export type AfComboboxProps = {
  options?: AfComboboxOption[];
  people?: ComboboxPerson[];
  label?: string;
  placeholder?: string;
  value?: string[] | string;
  defaultValue?: string[] | string;
  onChange?: (value: string[] | string, selectedOptions: AfComboboxOption[]) => void;
  multiple?: boolean;
  creatable?: boolean;
  onCreate?: (inputValue: string) => AfComboboxOption | void;
  createLabel?: (inputValue: string) => ReactNode;
  maxVisibleTags?: number;
  defaultOpen?: boolean;
  emptyText?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const COMBOBOX_PEOPLE: ComboboxPerson[] = [
  { id: "p1", name: "Maya Chen", role: "Product Designer", group: "DESIGN" },
  { id: "p2", name: "Jonas Weber", role: "Design Lead", group: "DESIGN" },
  { id: "p3", name: "Priya Raman", role: "Brand Designer", group: "DESIGN" },
  { id: "p4", name: "Sara Okafor", role: "Staff Engineer", group: "ENGINEERING" },
  { id: "p5", name: "Leo Martins", role: "Frontend", group: "ENGINEERING" },
  { id: "p6", name: "Nina Petrova", role: "Backend", group: "ENGINEERING" },
  { id: "p7", name: "Tom Becker", role: "iOS", group: "ENGINEERING" },
  { id: "p8", name: "Elif Yilmaz", role: "Head of Product", group: "PRODUCT" },
  { id: "p9", name: "Daniel Kim", role: "Product Manager", group: "PRODUCT" },
  { id: "p10", name: "Lucas Moreau", role: "Product Analyst", group: "PRODUCT" },
];

export const COMBOBOX_GROUPS = ["DESIGN", "ENGINEERING", "PRODUCT"] as const;

/* ------------------------------------------------------------------ */
/* OTP Input (Clean: verification code field)                          */
/* ------------------------------------------------------------------ */

export type OtpStatus = "idle" | "verifying" | "success" | "error";

export type AfOtpInputProps = {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  status?: OtpStatus;
  separator?: boolean | number;
  numeric?: boolean;
  clearOnError?: boolean;
  resendIn?: number;
  align?: "start" | "center";
  autoFocus?: boolean;
  subtitle?: ReactNode;
  name?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  showResend?: boolean;
  onResend?: () => void;
  label?: string;
  successLabel?: string;
  errorMessage?: ReactNode;
  /** 文案语种，默认 `"en-US"`；中文场景传 `"zh-CN"` 自动切换全套重发与校验提示文案。 */
  locale?: "en-US" | "zh-CN";
  /** Optional expected code in uncontrolled demo mode (e.g. `"482913"`). */
  validCode?: string;
  /** Initial tries remaining in uncontrolled demo mode (default 4 -> shows `"3 tries left."` on 1st wrong attempt). */
  maxTries?: number;
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Prompt Library (Pro)                                                */
/* ------------------------------------------------------------------ */

export type PromptPart = { text: string } | { variable: string };

export type PromptVariable = {
  key: string;
  label: string;
  placeholder: string;
  width?: number;
};

export type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  tone?: "accent" | "violet" | "warning" | "success";
  parts?: PromptPart[];
  body?: string;
  variables: PromptVariable[];
};

export function parsePromptParts(template: PromptTemplate): PromptPart[] {
  if (template.parts && template.parts.length > 0) return template.parts;
  if (!template.body) return [];
  const result: PromptPart[] = [];
  const regex = /\{([a-zA-Z0-9_-]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template.body)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: template.body.slice(lastIndex, match.index) });
    }
    result.push({ variable: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.body.length) {
    result.push({ text: template.body.slice(lastIndex) });
  }
  return result;
}

export type AfPromptLibraryProps = {
  title?: string;
  templates?: PromptTemplate[];
  value?: string;
  defaultValue?: string;
  onSelect?: (id: string) => void;
  defaultValues?: Record<string, string>;
  onUse?: (assembled: string, template: PromptTemplate, values: Record<string, string>) => void;
  onUsePrompt?: (assembled: string, template: PromptTemplate, values: Record<string, string>) => void;
  onCopy?: (assembled: string, template: PromptTemplate) => void;
  useLabel?: string;
  className?: string;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "meeting",
    name: "Summarize a meeting",
    category: "Notes",
    tone: "accent",
    parts: [
      { text: "Summarize the meeting below for " },
      { variable: "audience" },
      { text: " in under " },
      { variable: "length" },
      { text: ". Lead with the decisions, then list open questions about " },
      { variable: "topic" },
      { text: "." },
    ],
    variables: [
      { key: "audience", label: "audience", placeholder: "audience", width: 68 },
      { key: "length", label: "length", placeholder: "150 words", width: 76 },
      { key: "topic", label: "topic", placeholder: "topic", width: 52 },
    ],
  },
  {
    id: "release",
    name: "Write release notes",
    category: "Product",
    tone: "violet",
    parts: [
      { text: "Write release notes for " },
      { variable: "product" },
      { text: " " },
      { variable: "version" },
      { text: " for " },
      { variable: "audience" },
      { text: ". Keep the tone " },
      { variable: "tone" },
      { text: " and group the changes into New, Improved and Fixed." },
    ],
    variables: [
      { key: "product", label: "product", placeholder: "product", width: 64 },
      { key: "version", label: "version", placeholder: "version", width: 60 },
      { key: "audience", label: "audience", placeholder: "audience", width: 68 },
      { key: "tone", label: "tone", placeholder: "friendly", width: 64 },
    ],
  },
  {
    id: "error",
    name: "Explain an error",
    category: "Debug",
    tone: "warning",
    parts: [
      { text: "Explain why " },
      { variable: "error" },
      { text: " happens in " },
      { variable: "runtime" },
      { text: " when " },
      { variable: "context" },
      { text: ", and give the smallest safe fix." },
    ],
    variables: [
      { key: "error", label: "error", placeholder: "TypeError", width: 76 },
      { key: "runtime", label: "runtime", placeholder: "Node 22", width: 68 },
      { key: "context", label: "context", placeholder: "context", width: 64 },
    ],
  },
  {
    id: "email",
    name: "Draft a cold email",
    category: "Sales",
    tone: "success",
    parts: [
      { text: "Write a short email to " },
      { variable: "prospect" },
      { text: " at " },
      { variable: "company" },
      { text: " about " },
      { variable: "problem" },
      { text: ". End with one low-friction question." },
    ],
    variables: [
      { key: "prospect", label: "prospect", placeholder: "prospect", width: 68 },
      { key: "company", label: "company", placeholder: "company", width: 68 },
      { key: "problem", label: "problem", placeholder: "problem", width: 68 },
    ],
  },
];

export const DEFAULT_PROMPT_VALUES: Record<string, string> = {
  "meeting:length": "150 words",
  "release:tone": "friendly",
};

/* ------------------------------------------------------------------ */
/* Stepper Form (Pro)                                                  */
/* ------------------------------------------------------------------ */

export type StepperRenderContext<TValues extends Record<string, any> = Record<string, any>> = {
  values: TValues;
  setValue: <K extends keyof TValues>(key: K, value: TValues[K]) => void;
  setValues: (patch: Partial<TValues>) => void;
  errors: Record<string, string>;
  shakeKey: number;
  goTo: (stepIndex: number) => void;
  stepIndex: number;
};

export type StepperStep<TValues extends Record<string, any> = Record<string, any>> = {
  id?: string;
  label?: string;
  title: string;
  heading?: string;
  description?: string;
  render?: (ctx: StepperRenderContext<TValues>) => ReactNode;
  validate?: (values: TValues) => Record<string, string> | string | void;
};

export type StepperPlan = {
  id: "free" | "pro" | "team" | (string & {});
  name: string;
  description: string;
  price: string;
};

export type StepperDefaultValues = {
  name: string;
  url: string;
  domains: string[];
  plan: StepperPlan["id"];
  [key: string]: any;
};

export type AfStepperFormProps<TValues extends Record<string, any> = StepperDefaultValues> = {
  steps?: StepperStep<TValues>[];
  plans?: StepperPlan[];
  defaultValues?: Partial<TValues>;
  initialValues?: Partial<TValues>;
  initialStep?: number;
  step?: number;
  onStepChange?: (step: number) => void;
  onComplete?: (values: TValues) => void | Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  success?: (values: TValues, reset: () => void) => ReactNode;
  className?: string;
};

export const STEPPER_STEPS: StepperStep[] = [
  {
    id: "workspace",
    label: "WORKSPACE",
    title: "Name your workspace",
    description: "This is where your team's projects live.",
  },
  {
    id: "team",
    label: "TEAM",
    title: "Invite your team",
    description: "Anyone with a matching email domain can join automatically.",
  },
  {
    id: "plan",
    label: "PLAN",
    title: "Choose a plan",
    description: "You can change or cancel your plan at any time.",
  },
  {
    id: "review",
    label: "REVIEW",
    title: "Review & create",
    description: "Check the details below before creating your workspace.",
  },
];

export const STEPPER_PLANS: StepperPlan[] = [
  { id: "free", name: "Free", description: "Up to 3 projects · 5 members", price: "$0" },
  { id: "pro", name: "Pro", description: "Unlimited projects · SSO & audit log", price: "$24 / mo" },
  { id: "team", name: "Team", description: "Dedicated support · custom roles", price: "$79 / mo" },
];

/* ------------------------------------------------------------------ */
/* Billing Schedule (Pro)                                              */
/* ------------------------------------------------------------------ */

export type BillingRepeat = "once" | "monthly" | "quarterly" | "yearly";

export type BillingRow = {
  id: string;
  name: string;
  description: string;
  repeat: BillingRepeat;
  price: string;
  timing: "advance" | "arrears";
};

export type BillingCatalogItem = {
  name: string;
  description: string;
  repeat: BillingRepeat;
  price: number;
};

export type AfBillingScheduleProps = {
  title?: string;
  phase?: string;
  defaultPhaseName?: string;
  defaultStart?: string;
  defaultStartDate?: string;
  defaultMilestone?: string;
  currency?: string;
  seatPrice?: number;
  catalog?: BillingCatalogItem[];
  defaultLines?: BillingRow[];
  defaultRows?: BillingRow[];
  onRowsChange?: (rows: BillingRow[]) => void;
  onChange?: (summary: {
    phaseName: string;
    startDate: string;
    months: number;
    rows: BillingRow[];
    discount: boolean;
    minimum: boolean;
    firstInvoice: number;
    phaseTotal: number;
  }) => void;
  className?: string;
};

export const BILLING_REPEATS: { value: BillingRepeat; label: string; short: string; months: number }[] = [
  { value: "once", label: "Once", short: "once", months: 0 },
  { value: "monthly", label: "Monthly", short: "mo", months: 1 },
  { value: "quarterly", label: "Quarterly", short: "qtr", months: 3 },
  { value: "yearly", label: "Yearly", short: "yr", months: 12 },
];

export const BILLING_CATALOG: BillingCatalogItem[] = [
  { name: "Platform license", description: "Core workspace, SSO & audit log", repeat: "monthly", price: 1200 },
  { name: "Team seats", description: "Per active workspace member", repeat: "monthly", price: 49 },
  { name: "Priority support", description: "24/7 SLA & dedicated Slack channel", repeat: "monthly", price: 299 },
  { name: "Set-up fee", description: "Onboarding, data migration & SSO", repeat: "once", price: 4999 },
];

export const INITIAL_BILLING_ROWS: BillingRow[] = [
  { id: "b1", name: "Set-up fee", description: "", repeat: "once", price: "4999", timing: "advance" },
];

export const billingMoney = (value: number, currency = "$") =>
  `${currency}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/* Dropzone (Pro)                                                      */
/* ------------------------------------------------------------------ */

export type UploadKind = "pdf" | "zip" | "png" | "dmg";

export type UploadStatus = "hashing" | "uploading" | "merging" | "done" | "failed" | "canceled";

export type UploadProgressMeta = {
  status?: UploadStatus;
  stageText?: string;
};

export type UploadTaskContext = {
  id: string;
  signal: AbortSignal;
  relativePath?: string;
};

export type UploadFile = {
  id: string;
  name: string;
  size: string;
  sizeMb: number;
  kind: UploadKind;
  progress: number;
  status: UploadStatus;
  /** 分片校验、合并等阶段自定义文案。 */
  stageText?: string;
  /** 文件夹拖拽或目录选择时的相对路径（如 `"docs/architecture.pdf"`）。 */
  relativePath?: string;
  error?: string;
};

export type AfDropzoneProps = {
  accept?: string;
  maxSize?: number;
  maxSizeMb?: number;
  files?: UploadFile[];
  defaultFiles?: UploadFile[];
  onChange?: (files: UploadFile[]) => void;
  onUpload?: (
    file: File,
    onProgress: (pct: number, meta?: UploadProgressMeta) => void,
    context: UploadTaskContext,
  ) => Promise<void>;
  /** 取消正在校验/上传/合并的任务回调。 */
  onCancel?: (file: UploadFile) => void;
  /** 是否支持剪贴板直接粘贴文件/截图（`Ctrl+V`），默认 `true`。 */
  allowPaste?: boolean;
  /** 点击选择时启用文件夹模式（`webkitdirectory`），默认 `false`。 */
  directory?: boolean;
  /** 拖入文件夹时是否递归解析子目录文件（`webkitGetAsEntry`），默认 `true`。 */
  allowDirectoryDrop?: boolean;
  /** 界面语言（默认 `"en"`）。 */
  locale?: "en" | "zh-CN";
  hint?: ReactNode;
  autoplay?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
};

export const uploadKindOf = (name: string): UploadKind => {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "pdf";
  if (extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "webp" || extension === "svg") return "png";
  if (extension === "dmg" || extension === "exe" || extension === "pkg") return "dmg";
  return "zip";
};

export const INITIAL_UPLOADS = (): UploadFile[] => [
  { id: "u1", name: "q4-board-deck.pdf", size: "12.4 MB", sizeMb: 12.4, kind: "pdf", progress: 100, status: "done" },
  { id: "u2", name: "brand-guidelines.png", size: "4.8 MB", sizeMb: 4.8, kind: "png", progress: 100, status: "done" },
  { id: "u3", name: "product-roadmap.pdf", size: "2.4 MB", sizeMb: 2.4, kind: "pdf", progress: 36, status: "uploading" },
  { id: "u4", name: "customer-export.zip", size: "31.2 MB", sizeMb: 31.2, kind: "zip", progress: 62, status: "failed", error: "Connection lost — retry" },
];

/* ------------------------------------------------------------------ */
/* Integration Settings (Pro)                                          */
/* ------------------------------------------------------------------ */

export type IntegrationSnapshot = {
  apiKey: string;
  site: string;
  zone: string;
  enabled: boolean;
};

export type AfIntegrationSettingsProps = {
  name?: string;
  title?: string;
  logo?: ReactNode;
  badge?: ReactNode;
  count?: ReactNode;
  meta?: ReactNode;
  icon?: AffectIconKey;
  defaultValue?: Partial<IntegrationSnapshot>;
  defaultValues?: Partial<IntegrationSnapshot> & { siteUrl?: string; timeZone?: string };
  siteHint?: ReactNode;
  timezones?: { value: string; label: string }[];
  timeZones?: (string | { value: string; label: string })[];
  onGenerateKey?: () => string | Promise<string>;
  onToggle?: (enabled: boolean) => void;
  onSave?: (snapshot: IntegrationSnapshot) => void | Promise<void>;
  className?: string;
};

export const INTEGRATION_TIMEZONES = [
  { value: "Europe/Berlin", label: "(GMT +01:00) Berlin" },
  { value: "Europe/London", label: "(GMT +00:00) London" },
  { value: "America/New_York", label: "(GMT -05:00) New York" },
  { value: "America/Los_Angeles", label: "(GMT -08:00) San Francisco" },
  { value: "Asia/Tokyo", label: "(GMT +09:00) Tokyo" },
];

export const INTEGRATION_DEFAULTS: IntegrationSnapshot = {
  apiKey: "",
  site: "yourstore.com",
  zone: "Europe/Berlin",
  enabled: true,
};

/* ------------------------------------------------------------------ */
/* Date Range Picker (Pro)                                             */
/* ------------------------------------------------------------------ */

export type AfPickerLocale = "zh-CN" | "en-US" | (string & {});

export type AfDateRangePresetItem = {
  key: string;
  label: string;
  make: (today: Date) => [Date, Date];
};

export type AfDateRangePickerProps = {
  value?: AfDateRangeValue;
  defaultValue?: AfDateRangeValue;
  initialValue?: AfDateRangeValue;
  onChange?: (value: AfDateRangeValue) => void;
  min?: Date;
  max?: Date;
  today?: Date;
  defaultCompare?: boolean;
  defaultOpen?: boolean;
  /** 语言区域：`"en-US"`（默认）或 `"zh-CN"`。 */
  locale?: AfPickerLocale;
  /** 自定义左侧快捷时间窗预设列表。 */
  presets?: AfDateRangePresetItem[];
  className?: string;
};

export function isZhPickerLocale(locale?: string): boolean {
  return Boolean(locale && locale.toLowerCase().startsWith("zh"));
}

export const EN_RANGE_PRESETS: AfDateRangePresetItem[] = [
  { key: "today", label: "Today", make: (t) => [t, t] },
  { key: "yesterday", label: "Yesterday", make: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: "7d", label: "Last 7 days", make: (t) => [addDays(t, -6), t] },
  { key: "30d", label: "Last 30 days", make: (t) => [addDays(t, -29), t] },
  { key: "90d", label: "Last 90 days", make: (t) => [addDays(t, -89), t] },
  { key: "month", label: "This month", make: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  {
    key: "last-month",
    label: "Last month",
    make: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)],
  },
  { key: "quarter", label: "This quarter", make: (t) => [new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1), t] },
  { key: "ytd", label: "Year to date", make: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

export const ZH_RANGE_PRESETS: AfDateRangePresetItem[] = [
  { key: "today", label: "今日", make: (t) => [t, t] },
  { key: "yesterday", label: "昨日", make: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: "7d", label: "近 7 天", make: (t) => [addDays(t, -6), t] },
  { key: "30d", label: "近 30 天", make: (t) => [addDays(t, -29), t] },
  { key: "90d", label: "近 90 天", make: (t) => [addDays(t, -89), t] },
  { key: "month", label: "本月", make: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  {
    key: "last-month",
    label: "上月",
    make: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)],
  },
  { key: "quarter", label: "本季度", make: (t) => [new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1), t] },
  { key: "ytd", label: "今年以来", make: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const ZH_WEEKDAYS_FULL = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

/** Format single date as `"Mon, Nov 16, 2026"` (or `"2026年11月16日 周一"` in `zh-CN`). */
export const formatDateLabel = (date: Date, locale?: string) =>
  isZhPickerLocale(locale)
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${ZH_WEEKDAYS_FULL[date.getDay()]}`
    : `${SHORT_WEEKDAYS[date.getDay()]}, ${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

/** Format short billing date as `"1 Jan 2026"`. */
export const formatBillingDate = (date: Date) =>
  `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

/** Format month & year header as `"November 2026"` (or `"2026年 11月"` in `zh-CN`). */
export const formatMonthYear = (date: Date, locale?: string) =>
  isZhPickerLocale(locale)
    ? `${date.getFullYear()}年 ${date.getMonth() + 1}月`
    : `${LONG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

/** Format date range as `"Oct 16 – Nov 14, 2026"` (or `"2026-10-16 – 2026-11-14"` in `zh-CN`). */
export function formatRangeEn(start: Date, end: Date, locale?: string): string {
  if (isZhPickerLocale(locale)) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const s = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const e = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    return s === e ? s : `${s} – ${e}`;
  }
  const sMonth = SHORT_MONTHS[start.getMonth()];
  const eMonth = SHORT_MONTHS[end.getMonth()];
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
      return `${sMonth} ${start.getDate()}, ${start.getFullYear()}`;
    }
    if (start.getMonth() === end.getMonth()) {
      return `${sMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${sMonth} ${start.getDate()}, ${start.getFullYear()} – ${eMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* Date Picker (Clean)                                                 */
/* ------------------------------------------------------------------ */

export type AfDatePickerPreset = {
  label: ReactNode;
  value: Date | ((today: Date) => Date);
};

export type AfDatePickerProps = {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (value: Date | null) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  placeholder?: string;
  label?: string;
  showLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  clearable?: boolean;
  today?: Date;
  weekStartsOn?: 0 | 1;
  /** 语言区域：`"en-US"`（默认）或 `"zh-CN"`。 */
  locale?: AfPickerLocale;
  /** 侧栏快捷日期预设（如今日、昨日、7 天前）。 */
  presets?: AfDatePickerPreset[];
  defaultOpen?: boolean;
  /** Whether to show double-chevron year buttons in header (default false; Shift+PageUp/PageDown always works). */
  showYearNav?: boolean;
  /** Whether to show Today / Clear footer bar (default false). */
  showFooter?: boolean;
  /** Optional custom formatter for trigger button text. */
  formatDisplay?: (date: Date) => string;
  className?: string;
};

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const lastDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const shiftDate = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const sameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function clampDate(date: Date, min?: Date, max?: Date) {
  const day = startOfDay(date);
  if (min && day < startOfDay(min)) return startOfDay(min);
  if (max && day > startOfDay(max)) return startOfDay(max);
  return day;
}

export function monthWeeks(year: number, month: number): (Date | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function monthCalendarGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): { date: Date; outside: boolean }[][] {
  const firstDow = new Date(year, month, 1).getDay();
  const lead = weekStartsOn === 1 ? (firstDow + 6) % 7 : firstDow;
  const start = new Date(year, month, 1 - lead);
  const weeks: { date: Date; outside: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: { date: Date; outside: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      row.push({ date: cellDate, outside: cellDate.getMonth() !== month });
    }
    weeks.push(row);
  }
  return weeks;
}

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function fromIsoDate(text: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : getLocalToday();
}

export const DATE_WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export const DATE_WEEKDAYS_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const DATE_WEEKDAYS_ZH = ["一", "二", "三", "四", "五", "六", "日"];
export const DATE_WEEKDAYS_SUN_ZH = ["日", "一", "二", "三", "四", "五", "六"];

/* ------------------------------------------------------------------ */
/* Profile Menu (Clean)                                                */
/* ------------------------------------------------------------------ */

export type ProfileAction = {
  id: string;
  label: string;
  icon: AffectIconKey;
  badge?: string;
  danger?: boolean;
  onSelect?: () => void;
};

export type ProfileSetupConfig = {
  done: number;
  total: number;
  next?: string;
  onContinue?: () => void;
};

export type AfProfileMenuProps = {
  name?: string;
  email?: string;
  avatar?: ReactNode;
  items?: ProfileAction[];
  onSelect?: (id: string) => void;
  setup?: ProfileSetupConfig | null;
  className?: string;
};

export const PROFILE_ACTIONS: ProfileAction[] = [
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "docs", label: "Docs", icon: "file" },
  { id: "apps", label: "Apps", icon: "grid", badge: "New" },
  { id: "logout", label: "Logout", icon: "external" },
];

export const PROFILE_SETUP_STEPS = ["Add a profile photo", "Connect your first app"];

/* ------------------------------------------------------------------ */
/* Integration Picker (Pro)                                            */
/* ------------------------------------------------------------------ */

export type IntegrationService = {
  id: string;
  name: string;
  /** Short category subtitle shown in the left list (e.g. `"Project management"`). */
  category?: string;
  /** Full description shown in the right detail pane. */
  description: string;
  domain: string;
  icon: AffectIconKey;
  tone: "accent" | "violet" | "success" | "warning" | "danger" | "neutral";
  capabilities: string[];
};

export type AfIntegrationPickerProps = {
  appName?: string;
  appIcon?: ReactNode;
  services?: IntegrationService[];
  integrations?: IntegrationService[];
  defaultConnected?: string[];
  defaultSelected?: string;
  onConnectedChange?: (connected: string[]) => void;
  onToggle?: (id: string, connected: boolean) => void;
  onExplore?: (id: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
};

export const INTEGRATION_SERVICES: IntegrationService[] = [
  {
    id: "linear",
    name: "Linear",
    category: "Project management",
    description: "Turn requests from chat into issues and keep their status in sync both ways.",
    domain: "linear.app",
    icon: "target",
    tone: "violet",
    capabilities: ["Create issues from any message", "Two-way status sync", "Link issues to customers"],
  },
  {
    id: "notion",
    name: "Notion",
    category: "Docs & wiki",
    description: "Save thread summaries, meeting notes and action items directly into Notion pages.",
    domain: "notion.so",
    icon: "file",
    tone: "neutral",
    capabilities: ["Append blocks to any page", "Map fields to databases", "Keep source citations intact"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Stream subscription changes, invoice events and payout summaries into your workspace.",
    domain: "stripe.com",
    icon: "wallet",
    tone: "accent",
    capabilities: ["Read subscription status", "Sync payment & refund events", "Generate reconciliation digests"],
  },
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    description: "Unfurl live frames, track component updates and link design comments to tasks.",
    domain: "figma.com",
    icon: "grid",
    tone: "warning",
    capabilities: ["Preview frames inline", "Track library changes", "Sync design review comments"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Log customer conversations to deals and keep contact properties up to date.",
    domain: "hubspot.com",
    icon: "users",
    tone: "danger",
    capabilities: ["Sync contact & company records", "Create follow-up tasks", "Update deal stages"],
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "Commerce",
    description: "Look up orders, inventory levels and fulfillment updates without leaving chat.",
    domain: "shopify.com",
    icon: "store",
    tone: "success",
    capabilities: ["Inspect order & shipping status", "Sync inventory alerts", "Daily revenue snapshots"],
  },
  {
    id: "airtable",
    name: "Airtable",
    category: "Databases",
    description: "Write structured records into bases and trigger automations when rows change.",
    domain: "airtable.com",
    icon: "database",
    tone: "neutral",
    capabilities: ["Insert & update records", "Mirror table schemas", "Trigger base automations"],
  },
  {
    id: "webflow",
    name: "Webflow",
    category: "Website",
    description: "Publish CMS items, review staging changes and monitor form submissions.",
    domain: "webflow.com",
    icon: "globe",
    tone: "accent",
    capabilities: ["Publish CMS collections", "Receive form submissions", "Track site publish events"],
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Developer tools",
    description: "Follow preview deployments, build logs and production rollbacks in real time.",
    domain: "vercel.com",
    icon: "bolt",
    tone: "neutral",
    capabilities: ["Post preview deploy links", "Alert on failed builds", "One-click rollback checks"],
  },
  {
    id: "clickup",
    name: "ClickUp",
    category: "Project management",
    description: "Turn action items into tasks with assignees, due dates and sprint lists.",
    domain: "clickup.com",
    icon: "task",
    tone: "violet",
    capabilities: ["Create tasks with due dates", "Sync assignees & statuses", "Attach thread context"],
  },
];

export const INITIAL_CONNECTED = ["linear", "notion", "stripe"];

/* ------------------------------------------------------------------ */
/* Command Menu (Pro: wraps AfCommandPalette)                          */
/* ------------------------------------------------------------------ */

export type CommandMenuGroup = {
  heading: string;
  items: (Omit<AfCommand, "group"> & { group?: string })[];
};

export type AfCommandMenuProps = {
  commands?: AfCommand[];
  groups?: CommandMenuGroup[];
  placeholder?: string;
  autoFocus?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onRun?: (command: AfCommand) => void;
  className?: string;
};

export const COMMAND_MENU_COMMANDS: AfCommand[] = [
  { id: "mail", group: "SUGGESTIONS", label: "Write an email", hint: "Gmail", kbd: "Ctrl 1", icon: "mail" },
  {
    id: "assistant",
    group: "SUGGESTIONS",
    label: "Ask assistant",
    hint: "Summaries, drafts, answers",
    kbd: "Ctrl 2",
    icon: "sparkle",
  },
  { id: "task", group: "SUGGESTIONS", label: "Create a task", hint: "ClickUp", kbd: "Ctrl 3", icon: "task" },
  { id: "crm", group: "SUGGESTIONS", label: "Add contact to CRM", hint: "HubSpot", kbd: "Ctrl 4", icon: "users" },
  {
    id: "meeting",
    group: "SUGGESTIONS",
    label: "Schedule a meeting",
    hint: "Google Calendar",
    kbd: "Ctrl 5",
    icon: "calendar",
  },
  { id: "share-update", group: "SHARE", label: "Post an update", hint: "#team-updates", icon: "send" },
  { id: "save-page", group: "SHARE", label: "Save as page", hint: "Notion · Meeting notes", icon: "bookmark" },
  { id: "new-doc", group: "GENERAL", label: "New document", kbd: "N", icon: "file" },
  { id: "invite", group: "GENERAL", label: "Invite teammates", kbd: "I", icon: "users" },
  { id: "upload", group: "GENERAL", label: "Upload files", kbd: "U", icon: "upload" },
  { id: "toggle-theme", group: "GENERAL", label: "Switch to dark mode", kbd: "⇧ D", icon: "moon" },
  { id: "goto-home", group: "GO TO", label: "Home", kbd: "G H", icon: "home" },
  { id: "goto-inbox", group: "GO TO", label: "Inbox", kbd: "G I", icon: "inbox" },
  { id: "goto-reports", group: "GO TO", label: "Reports", kbd: "G R", icon: "chart" },
  { id: "goto-settings", group: "GO TO", label: "Settings", kbd: "G S", icon: "settings" },
  { id: "goto-help", group: "GO TO", label: "Help & feedback", kbd: "?", icon: "help" },
];
