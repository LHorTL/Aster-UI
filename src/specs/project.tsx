import "../patterns/project.css";
import type { ComponentSpec } from "../types";
import { AfAgentGallery } from "../components/project/AgentGallery";
import { AfAppDirectory } from "../components/project/AppDirectory";
import { AfClientContext } from "../components/project/ClientContext";
import { AfLiveSession } from "../components/project/LiveSession";
import { AfMissionControl } from "../components/project/MissionControl";
import { AfMissionTimeline } from "../components/project/MissionTimeline";
import { AfRunInspector } from "../components/project/RunInspector";
import { AfTaskBoard } from "../components/project/TaskBoard";

function AgentGallerySpecimen() {
  return <AfAgentGallery />;
}

function AppDirectorySpecimen() {
  return <AfAppDirectory />;
}

function ClientContextSpecimen() {
  return <AfClientContext />;
}

function LiveSessionSpecimen() {
  return <AfLiveSession />;
}

function MissionControlSpecimen() {
  return <AfMissionControl />;
}

function MissionTimelineSpecimen() {
  return <AfMissionTimeline />;
}

function RunInspectorSpecimen() {
  return <AfRunInspector />;
}

function TaskBoardSpecimen() {
  return <AfTaskBoard />;
}

/** Pro Agent / Workspace Blocks。 */
export const projectSpecs: ComponentSpec[] = [
  {
    id: "agent-gallery",
    title: "Agent Gallery",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。手风琴渐变画廊：两侧窄幅渐变面板 + 中央真实产品工作台窗口平滑展开，支持方向键漫游与子页签交互。",
    render: AgentGallerySpecimen,
    width: 960,
    height: 620,
  },
  {
    id: "app-directory",
    title: "App Directory",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。应用集成目录：侧栏分类计数、实时搜索、连接状态单选菜单与连接旋转反馈卡片。",
    render: AppDirectorySpecimen,
    width: 940,
    height: 620,
  },
  {
    id: "client-context",
    title: "Client Context",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。客户共享上下文工作区：客户切换器、4 枚微走势 KPI 卡、4 页签与 `@Report` 提及时间线。",
    render: ClientContextSpecimen,
    width: 920,
    height: 640,
  },
  {
    id: "live-session",
    title: "Live Session",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。多智能体实时协作会话：左侧对话流与右侧团队计划 + 上下文矩阵联动聚焦。",
    render: LiveSessionSpecimen,
    width: 920,
    height: 620,
  },
  {
    id: "mission-control",
    title: "Mission Control",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。智能体总控台：顶部回溯活动曲线 + 中部主从编队树 + 右侧待批收件箱三区统一筛选。",
    render: MissionControlSpecimen,
    width: 980,
    height: 680,
  },
  {
    id: "mission-timeline",
    title: "Mission Timeline",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。统一时钟多泳道总览：顶部活动曲线 + 30m 泳道甘特时间轴 + 右侧待批收件箱联动更新。",
    render: MissionTimelineSpecimen,
    width: 980,
    height: 660,
  },
  {
    id: "run-inspector",
    title: "Run Inspector",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。多智能体单次运行深潜检视：680px 顶部指标汇总 + 监督者虚线旁路 + 内联工具瀑布展开。",
    render: RunInspectorSpecimen,
    width: 940,
    height: 660,
  },
  {
    id: "task-board",
    title: "Task Board",
    group: "Blocks",
    source: "pro",
    note: "affectUI Pro Block。敏捷任务看板：原生拖拽与蓝线着陆提示、列内速建、标签筛选、紧凑模式与右侧滑入详情抽屉。",
    render: TaskBoardSpecimen,
    width: 1040,
    height: 640,
  },
];
