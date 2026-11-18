import { addDays, daysBetween, formatRange, sameDay } from "./primitives/date";

/** 评审场景：工作台、设置页与组件清单。 */
export type Scene = "workbench" | "settings" | "components";

/** 评审视图：单看现状、单看新风格或并排比较。 */
export type StyleView = "soft" | "affect" | "compare";

/** 宿主侧栏中的 App 条目，图标键只在原型内部映射。 */
export type DockApp = {
  /** App 唯一标识。 */
  id: string;
  /** 显示名称。 */
  name: string;
  /** 新风格侧栏使用的线形图标键。 */
  icon: AffectIconKey;
  /** 旧版对照视图侧栏使用的历史兼容图标名。 */
  softIcon: "home" | "barChart" | "translate" | "appstore" | "dashboard" | "qq" | "camera" | "file" | "sliders";
  /** 侧栏分组。 */
  group: "日常" | "工具";
  /** 是否有未读或可更新标记。 */
  badge?: number;
};

/** 新风格原型自绘图标的键名。 */
export type AffectIconKey =
  | "home"
  | "chart"
  | "translate"
  | "store"
  | "server"
  | "game"
  | "message"
  | "file"
  | "proxy"
  | "settings"
  | "search"
  | "plus"
  | "refresh"
  | "chevronDown"
  | "chevronRight"
  | "check"
  | "x"
  | "more"
  | "sun"
  | "moon"
  | "bell"
  | "copy"
  | "trash"
  | "download"
  | "sparkle"
  | "clock"
  | "minus"
  | "square"
  | "filter"
  | "sidebar"
  | "database"
  | "tag"
  | "calendar"
  | "chevronLeft"
  | "undo"
  | "alert"
  | "info"
  | "folder"
  | "bolt"
  | "play"
  | "pause"
  | "stop"
  | "send"
  | "paperclip"
  | "mic"
  | "shield"
  | "lock"
  | "eye"
  | "external"
  | "upload"
  | "users"
  | "layers"
  | "target"
  | "gitBranch"
  | "terminal"
  | "sliders"
  | "grid"
  | "list"
  | "arrowRight"
  | "arrowUpRight"
  | "arrowDown"
  | "arrowUp"
  | "maximize"
  | "minimize"
  | "wallet"
  | "globe"
  | "loader"
  | "key"
  | "thumbsUp"
  | "thumbsDown"
  | "heart"
  | "speaker"
  | "pencil"
  | "quote"
  | "chevronUp"
  | "user"
  | "star"
  | "image"
  | "camera"
  | "code"
  | "palette"
  | "mapPin"
  | "compass"
  | "folderOpen"
  | "checkCircle"
  | "xCircle"
  | "menu"
  | "eyeOff"
  | "rotateLeft"
  | "rotateRight"
  | "zoomIn"
  | "zoomOut"
  | "windowRestore"
  | "panelLeft"
  | "panelRight"
  | "mail"
  | "link"
  | "bulb"
  | "arrowLeft"
  | "redo"
  | "unlock"
  | "grip"
  | "webhook"
  | "schedule"
  | "form"
  | "slack"
  | "http"
  | "wait"
  | "branch"
  | "task"
  | "flash"
  | "starHalf"
  | "creditCard"
  | "receipt"
  | "kanban"
  | "workflow"
  | "bot"
  | "gitCommit"
  | "gitPullRequest"
  | "share"
  | "bookmark"
  | "inbox"
  | "building"
  | "phone"
  | "help"
  | "zap";

/** 宿主侧栏中展示的通用示例模块列表，数据均为演示。 */
export const dockApps: DockApp[] = [
  { id: "overview", name: "概览看板", icon: "chart", softIcon: "barChart", group: "日常", badge: 3 },
  { id: "inbox", name: "消息收件箱", icon: "inbox", softIcon: "home", group: "日常" },
  { id: "translate", name: "即时翻译", icon: "translate", softIcon: "translate", group: "日常" },
  { id: "monitor", name: "服务监控", icon: "server", softIcon: "dashboard", group: "日常" },
  { id: "notes", name: "速记便签", icon: "sparkle", softIcon: "camera", group: "工具" },
  { id: "docs", name: "文档中心", icon: "file", softIcon: "file", group: "工具" },
  { id: "tasks", name: "待办清单", icon: "message", softIcon: "sliders", group: "工具" },
  { id: "network", name: "网络设置", icon: "proxy", softIcon: "sliders", group: "工具" },
];

/** 工作台顶部指标。 */
export type Metric = {
  /** 指标名称。 */
  label: string;
  /** 指标数值，渲染时再格式化。 */
  value: number;
  /** 数值格式。 */
  format: "tokens" | "money" | "count" | "percent";
  /** 与昨日相比的变化百分比，正数表示上升。 */
  delta?: number;
  /** 补充说明。 */
  hint: string;
};

/** 概览面板的通用演示指标。 */
export const metrics: Metric[] = [
  { label: "今日请求", value: 1_284_620, format: "tokens", delta: 12.4, hint: "缓存命中 82% · 实时 18%" },
  { label: "预估费用", value: 18.42, format: "money", delta: -3.1, hint: "较昨日同期下降" },
  { label: "活跃任务", value: 37, format: "count", delta: 8, hint: "其中 4 项正在执行" },
  { label: "配额使用率", value: 64, format: "percent", hint: "周期内余量充足 · 明日重置" },
];

/** 每个指标卡片下方迷你走势的演示数据（最近 12 个采样点）。 */
export const metricSparks: number[][] = [
  [42, 48, 45, 60, 58, 66, 62, 74, 70, 82, 88, 96],
  [30, 34, 33, 31, 36, 35, 33, 30, 32, 29, 31, 28],
  [8, 10, 9, 14, 12, 15, 18, 16, 21, 24, 23, 27],
  [10, 18, 22, 30, 34, 38, 44, 48, 52, 57, 60, 64],
];

/** 最近十四天的用量与成本，Token 单位为千，成本单位为美元。 */
export const usageSeries: { day: string; tokens: number; cost: number }[] = [
  { day: "10-08", tokens: 520, cost: 7.8 },
  { day: "10-09", tokens: 610, cost: 9.1 },
  { day: "10-10", tokens: 480, cost: 6.9 },
  { day: "10-11", tokens: 720, cost: 11.4 },
  { day: "10-12", tokens: 390, cost: 5.2 },
  { day: "10-13", tokens: 450, cost: 6.6 },
  { day: "10-14", tokens: 880, cost: 14.2 },
  { day: "10-15", tokens: 620, cost: 9.7 },
  { day: "10-16", tokens: 840, cost: 12.1 },
  { day: "10-17", tokens: 410, cost: 6.0 },
  { day: "10-18", tokens: 980, cost: 15.8 },
  { day: "10-19", tokens: 760, cost: 10.9 },
  { day: "10-20", tokens: 1120, cost: 17.6 },
  { day: "今天", tokens: 1285, cost: 18.4 },
];

/** 会话展开后显示的执行步骤。 */
export type SessionStep = {
  /** 步骤说明。 */
  text: string;
  /** 相对时间。 */
  time: string;
  /** 步骤状态。 */
  state: "done" | "active" | "failed" | "waiting";
};

/** 每个会话的步骤，键为会话标识。 */
export const sessionSteps: Record<string, SessionStep[]> = {
  s1: [
    { text: "扫描 docs/q3 目录下的 14 份周报文档", time: "3 分钟前", state: "done" },
    { text: "提取关键指标与阶段复盘结论", time: "2 分钟前", state: "done" },
    { text: "生成汇总大纲与图表摘要", time: "进行中", state: "active" },
  ],
  s2: [
    { text: "合并最近 6 次代码提交记录", time: "14 分钟前", state: "done" },
    { text: "自动生成版本更新日志", time: "13 分钟前", state: "done" },
    { text: "推送到预览环境前等待人工确认", time: "12 分钟前", state: "waiting" },
  ],
  s3: [
    { text: "读取最近 3 天的会议纪要文本", time: "40 分钟前", state: "done" },
    { text: "按负责人整理 18 条待办事项", time: "39 分钟前", state: "done" },
    { text: "同步写入团队共享知识库", time: "38 分钟前", state: "done" },
  ],
  s4: [
    { text: "对比两次构建产物的哈希清单", time: "1 小时前", state: "done" },
    { text: "定位增量打包缓存配置差异", time: "1 小时前", state: "done" },
    { text: "连接远程缓存节点超时（30s）", time: "1 小时前", state: "failed" },
  ],
  s5: [
    { text: "渲染 9 套页面模板首屏预览", time: "2 小时前", state: "done" },
    { text: "压缩导出标准尺寸缩略图", time: "2 小时前", state: "done" },
  ],
};

/** App 本机存储占用，单位 MB。 */
export const storageUsage: { label: string; value: number; tone: "ink" | "accent" | "muted" }[] = [
  { label: "应用数据", value: 412, tone: "ink" },
  { label: "临时缓存", value: 268, tone: "accent" },
  { label: "运行日志", value: 54, tone: "muted" },
];

/** 命令面板中的演示命令。 */
export const commands: { id: string; group: string; label: string; hint?: string; icon: AffectIconKey }[] = [
  { id: "open-overview", group: "打开模块", label: "概览看板", hint: "日常", icon: "chart" },
  { id: "open-docs", group: "打开模块", label: "文档中心", hint: "工具", icon: "file" },
  { id: "open-translate", group: "打开模块", label: "即时翻译", hint: "日常", icon: "translate" },
  { id: "refresh", group: "操作", label: "刷新全部面板数据", hint: "Ctrl R", icon: "refresh" },
  { id: "theme", group: "操作", label: "切换浅色 / 深色外观", hint: "Ctrl Shift L", icon: "moon" },
  { id: "update", group: "操作", label: "检查客户端更新", icon: "download" },
];

/** 最近七天的日用量，单位为千 Token。 */
export const dailyUsage: { day: string; value: number }[] = [
  { day: "10-15", value: 620 },
  { day: "10-16", value: 840 },
  { day: "10-17", value: 410 },
  { day: "10-18", value: 980 },
  { day: "10-19", value: 760 },
  { day: "10-20", value: 1120 },
  { day: "今天", value: 1285 },
];

/** 模型用量占比。 */
export const modelShare: { name: string; share: number; tokens: number }[] = [
  { name: "Opus 5.5", share: 46, tokens: 590_900 },
  { name: "Sonnet 5.5", share: 31, tokens: 398_200 },
  { name: "Haiku 5.5", share: 15, tokens: 192_700 },
  { name: "GPT-5.2", share: 8, tokens: 102_820 },
];

/** 会话状态。 */
export type SessionStatus = "running" | "waiting" | "done" | "failed";

/** 最近会话行。 */
export type Session = {
  /** 会话标识。 */
  id: string;
  /** 会话标题。 */
  title: string;
  /** 所属项目。 */
  project: string;
  /** 使用的模型。 */
  model: string;
  /** 当前状态。 */
  status: SessionStatus;
  /** 已用 Token。 */
  tokens: number;
  /** 相对时间文案。 */
  time: string;
};

/** 通用任务记录演示数据，均为合成内容。 */
export const sessions: Session[] = [
  { id: "s1", title: "整理季度产品复盘文档", project: "docs-hub", model: "Opus 5.5", status: "running", tokens: 182_400, time: "3 分钟" },
  { id: "s2", title: "等待确认：发布 v1.4.2 预览版本", project: "web-client", model: "Sonnet 5.5", status: "waiting", tokens: 64_120, time: "12 分钟前" },
  { id: "s3", title: "归档本周会议纪要与待办项", project: "team-notes", model: "Haiku 5.5", status: "done", tokens: 21_870, time: "38 分钟前" },
  { id: "s4", title: "排查静态资源构建缓存异常", project: "ci-runner", model: "Opus 5.5", status: "failed", tokens: 97_300, time: "1 小时前" },
  { id: "s5", title: "批量导出常用演示模板缩略图", project: "design-kit", model: "Sonnet 5.5", status: "done", tokens: 45_010, time: "2 小时前" },
];

/** 设置页「应用」列表的运行状态。 */
export type RunState = "running" | "background" | "stopped" | "error";

/** 设置页左侧的 App 行。 */
export type InstalledApp = {
  /** App 标识，与侧栏一致。 */
  id: string;
  /** 显示名称。 */
  name: string;
  /** 运行状态。 */
  state: RunState;
  /** 当前版本。 */
  version: string;
  /** 是否有可用更新。 */
  update?: string;
};

/** 设置页演示的已安装模块。 */
export const installedApps: InstalledApp[] = [
  { id: "overview", name: "概览看板", state: "running", version: "1.4.2", update: "1.5.0" },
  { id: "docs", name: "文档中心", state: "background", version: "0.8.1" },
  { id: "translate", name: "即时翻译", state: "stopped", version: "0.9.0" },
  { id: "monitor", name: "服务监控", state: "running", version: "0.3.7" },
  { id: "tasks", name: "待办清单", state: "error", version: "0.6.2" },
  { id: "notes", name: "速记便签", state: "stopped", version: "0.3.2" },
  { id: "inbox", name: "消息收件箱", state: "background", version: "0.5.0" },
  { id: "network", name: "网络设置", state: "stopped", version: "0.2.0", update: "0.2.1" },
];

/** 运行状态的中文文案。 */
export const runStateLabel: Record<RunState, string> = {
  running: "运行中",
  background: "后台运行",
  stopped: "未运行",
  error: "异常",
};

/** 会话状态的中文文案。 */
export const sessionStatusLabel: Record<SessionStatus, string> = {
  running: "运行中",
  waiting: "等待确认",
  done: "已完成",
  failed: "失败",
};

/** 按指标格式输出展示文本。 */
export function formatMetric(value: number, format: Metric["format"]): string {
  if (format === "tokens") return value.toLocaleString("zh-CN");
  if (format === "money") return `$${value.toFixed(2)}`;
  if (format === "percent") return `${Math.round(value)}%`;
  return String(Math.round(value));
}

/** 把 Token 数量压缩成 k / M 文案。 */
export function compactTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

/* ------------------------------------------------------------------ */
/* 第五轮：按日期范围计算的演示数据                                    */
/* ------------------------------------------------------------------ */

export { addDays, daysBetween, formatRange, sameDay };

/** 原型里的“今天”，固定下来保证截图稳定。 */
export const TODAY = /* @__PURE__ */ new Date(2026, 9, 21);

/** 演示数据最早的一天。 */
export const DATA_START = /* @__PURE__ */ new Date(2026, 5, 1);

/** 一天的用量记录。 */
export type DayUsage = {
  /** 当天零点。 */
  date: Date;
  /** Token 数（千）。 */
  tokens: number;
  /** 估算成本（美元）。 */
  cost: number;
  /** 会话数。 */
  sessions: number;
  /** 各模型 Token 占比，顺序与 modelNames 一致。 */
  models: number[];
  /** 各项目 Token 占比，顺序与 projectNames 一致。 */
  projects: number[];
};

/** 参与占比统计的模型，按总量从高到低。 */
export const modelNames = ["Opus 5.5", "Sonnet 5.5", "Haiku 5.5", "GPT-5.2", "其他"];

/** 参与排行的项目。 */
export const projectNames = ["web-client", "docs-hub", "design-kit", "ci-runner", "其他"];

/** 可复现的伪随机数，保证每次打开数据一致。 */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/** 把一组权重归一化为占比。 */
function normalize(weights: number[]) {
  const sum = weights.reduce((total, value) => total + value, 0);
  return weights.map((value) => value / sum);
}

/** 生成 DATA_START 到 TODAY 的逐日数据：工作日更高、整体缓慢上涨。 */
export const dailyLog: DayUsage[] = /* @__PURE__ */ (() => {
  const random = seeded(20261021);
  const list: DayUsage[] = [];
  const day = new Date(DATA_START);
  let index = 0;
  while (day <= TODAY) {
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const trend = 380 + index * 4.2;
    const tokens = Math.round(trend * (weekend ? 0.55 : 1) * (0.75 + random() * 0.5));
    list.push({
      date: new Date(day),
      tokens,
      cost: Math.round(tokens * (0.0135 + random() * 0.003) * 100) / 100,
      sessions: Math.max(4, Math.round(tokens / (24 + random() * 10))),
      models: normalize([46 + random() * 10, 30 + random() * 8, 14 + random() * 6, 6 + random() * 4, 2 + random() * 2]),
      projects: normalize([52 + random() * 12, 18 + random() * 8, 12 + random() * 6, 8 + random() * 4, 5 + random() * 3]),
    });
    day.setDate(day.getDate() + 1);
    index++;
  }
  return list;
})();

/** 取出一个日期范围内的逐日数据。 */
export function usageIn(start: Date, end: Date) {
  return dailyLog.filter((item) => item.date >= start && item.date <= end);
}

/** 范围汇总：总量、成本、会话数，以及模型、项目分布（Token 绝对值）。 */
export function summarize(list: DayUsage[]) {
  const tokens = list.reduce((sum, item) => sum + item.tokens, 0);
  const cost = list.reduce((sum, item) => sum + item.cost, 0);
  const sessions = list.reduce((sum, item) => sum + item.sessions, 0);
  const models = modelNames.map((_, index) => list.reduce((sum, item) => sum + item.tokens * item.models[index], 0) * 1000);
  const projects = projectNames.map((_, index) => list.reduce((sum, item) => sum + item.tokens * item.projects[index], 0) * 1000);
  return { tokens: tokens * 1000, cost, sessions, perSession: sessions ? (tokens * 1000) / sessions : 0, models, projects };
}

/** 图表横轴用的“10-08”格式。 */
export function shortDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 订阅额度：每个模型一条，limit 为空表示不限量。 */
export const quotaModels: { name: string; used: number; limit: number | null }[] = [
  { name: "Opus 5.5", used: 512_000, limit: 600_000 },
  { name: "Sonnet 5.5", used: 386_000, limit: 1_000_000 },
  { name: "Haiku 5.5", used: 142_000, limit: null },
];

/** 通知设置里的演示关键词。 */
export const noticeKeywords = ["发布", "失败", "额度"];
