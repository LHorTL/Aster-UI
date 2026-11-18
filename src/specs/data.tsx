import "../patterns/data.css";
import type { ComponentSpec } from "../types";
import { AfBreakdownChartPattern as BreakdownChartDemo } from "../components/data/BreakdownChartPattern";
import { AfChangeSummaryPattern as ChangeSummaryDemo } from "../components/data/ChangeSummaryPattern";
import { AfCompactBreakdownPattern as CompactBreakdownDemo } from "../components/data/CompactBreakdownPattern";
import { AfDataTablePattern as DataTableDemo } from "../components/data/DataTablePattern";
import { AfDecisionInboxPattern as DecisionInboxDemo } from "../components/data/DecisionInboxPattern";
import { AfEmailDraftPattern as EmailDraftDemo } from "../components/data/EmailDraftPattern";
import { AfExperimentCardPattern as ExperimentCardDemo } from "../components/data/ExperimentCardPattern";
import { AfKpiChartPattern as KpiChartDemo } from "../components/data/KpiChartPattern";
import { AfNotificationStackPattern as NotificationStackDemo } from "../components/data/NotificationStackPattern";
import { AfProgressTrackerPattern as ProgressTrackerDemo } from "../components/data/ProgressTrackerPattern";
import { AfProjectCardPattern as ProjectCardDemo } from "../components/data/ProjectCardPattern";
import { AfSetupGuidePattern as SetupGuideDemo } from "../components/data/SetupGuidePattern";
import { AfSmartRecommendationPattern as SmartRecommendationDemo } from "../components/data/SmartRecommendationPattern";
import { AfTipsPanelPattern as TipsPanelDemo } from "../components/data/TipsPanelPattern";
import { AfToasterPattern as ToasterDemo } from "../components/data/ToasterPattern";
import { AfUsageMeterPattern as UsageMeterDemo } from "../components/data/UsageMeterPattern";
import { AfKpiBoard } from "../components/data/KpiBoard";
import { AfMetricsDashboard } from "../components/data/MetricsDashboard";
import { AfInvoiceCredit } from "../components/data/InvoiceCredit";
import { AfPricingPlans } from "../components/data/PricingPlans";

function DataTableSpecimen() {
  return <DataTableDemo />;
}

function UsageMeterSpecimen() {
  return <UsageMeterDemo />;
}

function KpiBoardSpecimen() {
  return <AfKpiBoard />;
}

function MetricsDashboardSpecimen() {
  return <AfMetricsDashboard />;
}

function InvoiceCreditSpecimen() {
  return <AfInvoiceCredit />;
}

function PricingPlansSpecimen() {
  return <AfPricingPlans />;
}

/** 数据展示、反馈与经营 Blocks 组件清单（20 个）。 */
export const dataSpecs: ComponentSpec[] = [
  {
    id: "data-table",
    title: "Data Table",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。会话记录表格：类型图标表头、勾选与区域选择、排序筛选、批量归档撤销与行末详情。",
    render: DataTableSpecimen,
    width: 1120,
    height: 560,
  },
  {
    id: "breakdown-chart",
    title: "Breakdown Chart",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。Token 来源的堆叠柱状分布：量/切片/分段选择器、悬停分解、图例即表头的联动明细。",
    render: BreakdownChartDemo,
    width: 960,
    height: 740,
  },
  {
    id: "compact-breakdown",
    title: "Compact Breakdown",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。单卡总量与构成：大数、6px 堆叠条与排名行，切换周期时数字与段宽同步插值。",
    render: CompactBreakdownDemo,
    width: 440,
    height: 400,
  },
  {
    id: "experiment-card",
    title: "Experiment Card",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。A/B 实验两行摘要，悬停展开指标切换、变体差值与选择胜出；可迁移到模型/引擎对比。",
    render: ExperimentCardDemo,
    width: 420,
    height: 440,
  },
  {
    id: "kpi-chart",
    title: "KPI Chart",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。多序列直线折线：任意序列、5 色且末序列灰、无面积、虚线网格与吸附提示框。",
    render: KpiChartDemo,
    width: 540,
    height: 440,
  },
  {
    id: "usage-meter",
    title: "Usage Meter",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。额度与用量：主积分堆叠条、分类图例、每日柱、限额细条与升级入口。",
    render: UsageMeterSpecimen,
    width: 540,
    height: 560,
  },
  {
    id: "project-card",
    title: "Project Card",
    group: "数据展示",
    source: "pro",
    note: "affectUI Pro。项目两行摘要卡：环形分段进度、悬停展开子任务、成员筛选与状态切换。",
    render: ProjectCardDemo,
    width: 440,
    height: 300,
  },
  {
    id: "change-summary",
    title: "Change Summary",
    group: "数据展示",
    source: "free",
    note: "affectUI 免费 Clean。指标变化摘要：一行一个指标，趋势箭头与语义色文字说明数字怎么变。",
    render: ChangeSummaryDemo,
    width: 600,
    height: 420,
  },
  {
    id: "smart-recommendation",
    title: "Smart Recommendation",
    group: "数据展示",
    source: "free",
    note: "affectUI 免费 Clean。智能建议卡：置信信号、推荐理由、备选切换与接受后撤销。",
    render: SmartRecommendationDemo,
    width: 540,
    height: 280,
  },
  {
    id: "tips-panel",
    title: "Tips Panel",
    group: "反馈",
    source: "free",
    note: "affectUI 免费 Clean。上手提示面板：三列磁贴、逐条完成、计数与收起入口。",
    render: TipsPanelDemo,
    width: 860,
    height: 460,
  },
  {
    id: "progress-tracker",
    title: "Progress Tracker",
    group: "反馈",
    source: "free",
    note: "affectUI 免费 Clean。上手进度清单：4px 进度条、圆形对勾、删除线、自动演示与重置。",
    render: ProgressTrackerDemo,
    width: 440,
    height: 400,
  },
  {
    id: "setup-guide",
    title: "Setup Guide",
    group: "反馈",
    source: "pro",
    note: "affectUI Pro。320px 浮层向导：分组任务逐项解锁，完成后停顿、收起并自动展开下一组。",
    render: SetupGuideDemo,
    width: 820,
    height: 480,
  },
  {
    id: "email-draft",
    title: "Email Draft",
    group: "反馈",
    source: "free",
    note: "affectUI 免费 Clean。AI 起草的续费邮件：收件人/语气切换、就地编辑、附件与发送回执撤销。",
    render: EmailDraftDemo,
    width: 640,
    height: 480,
  },
  {
    id: "decision-inbox",
    title: "Decision Inbox",
    group: "反馈",
    source: "free",
    note: "affectUI 免费 Clean。决策收件箱：行内快速答复、答后确认胶囊折叠，底部保留撤销。",
    render: DecisionInboxDemo,
    width: 520,
    height: 460,
  },
  {
    id: "notification-stack",
    title: "Notification Stack",
    group: "反馈",
    source: "free",
    note: "affectUI 免费 Clean。桌面通知栈：后层卡片向下探出露边、关闭后滑入补位、计数入口展开列表。",
    render: NotificationStackDemo,
    width: 460,
    height: 360,
  },
  {
    id: "toaster",
    title: "Toaster",
    group: "反馈",
    source: "pro",
    note: "affectUI Pro。通知系统：356/r10、后层向下堆叠、左上角关闭、底部计时条、promise 变形与撤销动作。",
    render: ToasterDemo,
    width: 800,
    height: 560,
  },
  {
    id: "kpi-board",
    title: "KPI Board",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。五卡经营看板：三张趋势微图卡 + 双序列细分对比总览 + 产品授权聚焦卡。",
    render: KpiBoardSpecimen,
    width: 960,
    height: 620,
  },
  {
    id: "metrics-dashboard",
    title: "Metrics Dashboard",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。全栈经营仪表盘：4 指标切换、折线/柱状与同比开关、磁吸准线及双栏占比榜单。",
    render: MetricsDashboardSpecimen,
    width: 900,
    height: 760,
  },
  {
    id: "invoice-credit",
    title: "Invoice & Credit Note",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。账单发票与红字贷项单：双层实体纸张前后叠放切换、逐行勾选改额冲抵与一键签发。",
    render: InvoiceCreditSpecimen,
    width: 780,
    height: 760,
  },
  {
    id: "pricing-plans",
    title: "Pricing Plans",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。套餐定价表：月/年滑动胶囊与最高折扣标签、数位滚轮跳价、推荐档发丝环与折叠集成明细。",
    render: PricingPlansSpecimen,
    width: 980,
    height: 720,
  },
];
