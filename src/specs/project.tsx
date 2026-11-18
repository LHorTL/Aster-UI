import { useRef, useState } from "react";
import "../patterns/project.css";
import "../patterns/shell.css";
import type { ComponentSpec } from "../types";
import { AfIcon } from "../icons";
import { useIsomorphicLayoutEffect } from "../primitives";
import { AfStatus, AfTag } from "../ui";
import { useListFlip } from "../components/_shared/project";
import { AfAgentGallery } from "../components/project/AgentGallery";
import { AfAppDirectory } from "../components/project/AppDirectory";
import { AfClientContext } from "../components/project/ClientContext";
import { AfLiveSession } from "../components/project/LiveSession";
import { AfMissionControl } from "../components/project/MissionControl";
import { AfMissionTimeline } from "../components/project/MissionTimeline";
import { AfProjectAppRow as ProjectAppRow } from "../components/project/ProjectAppRow";
import { AfProjectDownloadRow as ProjectDownloadRow } from "../components/project/ProjectDownloadRow";
import { AfProjectEmptyState as ProjectEmptyState } from "../components/project/ProjectEmptyState";
import { AfProjectFilterToolbar as ProjectFilterToolbar } from "../components/project/ProjectFilterToolbar";
import { AfProjectKpiCard as ProjectKpiCard } from "../components/project/ProjectKpiCard";
import { AfProjectNotificationCenter as ProjectNotificationCenter } from "../components/project/ProjectNotificationCenter";
import { AfProjectProxyRuleRow as ProjectProxyRuleRow } from "../components/project/ProjectProxyRuleRow";
import { AfProjectQuotaRow as ProjectQuotaRow } from "../components/project/ProjectQuotaRow";
import { AfProjectSessionList as ProjectSessionList } from "../components/project/ProjectSessionList";
import { AfProjectStorageCard as ProjectStorageCard } from "../components/project/ProjectStorageCard";
import { AfProjectStoreCard as ProjectStoreCard } from "../components/project/ProjectStoreCard";
import { AfProjectUpdateStack as ProjectUpdateStack } from "../components/project/ProjectUpdateStack";
import { AfRunInspector } from "../components/project/RunInspector";
import { AfSettingsLayout } from "../components/project/SettingsLayout";
import { AfTaskBoard } from "../components/project/TaskBoard";

function ProjectKpiCardSpecimen() {
  return <ProjectKpiCard />;
}

function ProjectEmptyStateSpecimen() {
  return <ProjectEmptyState showVariantSwitcher surface="framed" />;
}

const TOOLBAR_PREVIEW_ITEMS = [
  { id: "p1", name: "季度产品路线图评审材料", status: "running", tokens: "48.2k", icon: "chart" as const },
  { id: "p2", name: "设计系统色彩令牌规范整理", status: "waiting", tokens: "12.9k", icon: "sparkle" as const },
  { id: "p3", name: "多语言帮助文档校对清单", status: "done", tokens: "6.4k", icon: "file" as const },
];

function ProjectFilterToolbarSpecimen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  const demoRef = useRef<HTMLDivElement>(null);
  const flip = useListFlip(demoRef);

  const filtered = TOOLBAR_PREVIEW_ITEMS.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  useIsomorphicLayoutEffect(() => {
    flip.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, view]);

  return (
    <div className="af-pj-toolbar-demo" ref={demoRef}>
      <ProjectFilterToolbar
        search={search}
        onSearchChange={(next) => {
          flip.capture();
          setSearch(next);
        }}
        status={status}
        onStatusChange={(next) => {
          flip.capture();
          setStatus(next);
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        view={view}
        onViewChange={(next) => {
          flip.capture();
          setView(next);
        }}
        totalCount={TOOLBAR_PREVIEW_ITEMS.length}
        filteredCount={filtered.length}
        showSummary
      />
      <div className="af-pj-toolbar-demo__results" data-view={view}>
        {filtered.map((item) => (
          <div key={item.id} className="af-pj-toolbar-demo__item" data-flip>
            <span className="af-pj-sqtile" aria-hidden="true">
              <AfIcon name={item.icon} size={14} />
            </span>
            <span className="af-pj-toolbar-demo__name">{item.name}</span>
            {item.status === "running" ? (
              <AfStatus tone="accent" pulse>
                运行中
              </AfStatus>
            ) : (
              <AfTag tone={item.status === "waiting" ? "warning" : "success"} dot size="sm">
                {item.status === "waiting" ? "等待审批" : "已完成"}
              </AfTag>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsLayoutSpecimen() {
  return <AfSettingsLayout />;
}

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

/** 定制组件 + Pro Agent / Workspace Blocks。 */
export const projectSpecs: ComponentSpec[] = [
  {
    id: "project-kpi-card",
    title: "工作台指标卡",
    group: "定制组件",
    source: "project",
    note: "工作台数据概览指标卡：等宽核心指标读数、环比趋势胶囊、时间窗口切换与面积渐变微折线。",
    render: ProjectKpiCardSpecimen,
    width: 780,
    height: 250,
  },
  {
    id: "project-quota-row",
    title: "订阅与模型额度",
    group: "定制组件",
    source: "project",
    note: "多通道资源配额卡片：图标磁贴、实时用量读数、临近上限自动告警与不限量通道展示。",
    render: ProjectQuotaRow,
    width: 560,
    height: 310,
  },
  {
    id: "project-session-list",
    title: "会话列表",
    group: "定制组件",
    source: "project",
    note: "双行会话摘要与状态快筛，点击平滑展开执行步骤时间轴与快捷操作栏。",
    render: ProjectSessionList,
    width: 680,
    height: 430,
  },
  {
    id: "project-app-row",
    title: "已装扩展管理行",
    group: "定制组件",
    source: "project",
    note: "已安装子应用管理行：圆角图标磁贴、版本号标签、一键增量升级与开机自启开关。",
    render: ProjectAppRow,
    width: 680,
    height: 390,
  },
  {
    id: "project-store-card",
    title: "应用商店卡片",
    group: "定制组件",
    source: "project",
    note: "扩展商店三列应用卡：官方认证标识、已安装/可更新状态切换与实时下载进度展示。",
    render: ProjectStoreCard,
    width: 760,
    height: 280,
  },
  {
    id: "project-download-row",
    title: "下载任务行",
    group: "定制组件",
    source: "project",
    note: "扩展安装传输队列：宽幅进度条、暂停与继续控制，以及取消移除后的平滑补位过渡。",
    render: ProjectDownloadRow,
    width: 640,
    height: 340,
  },
  {
    id: "project-notification-center",
    title: "通知中心",
    group: "定制组件",
    source: "project",
    note: "通知中心展开面板：分类图标、单条忽略、内联快捷撤销条与已归档通知折叠区。",
    render: ProjectNotificationCenter,
    width: 520,
    height: 430,
  },
  {
    id: "project-storage-card",
    title: "存储空间占用卡",
    group: "定制组件",
    source: "project",
    note: "本地存储空间拆解卡：多色分段占比条、容量图例联动高亮、内联二次确认清理与目录说明。",
    render: ProjectStorageCard,
    width: 540,
    height: 330,
  },
  {
    id: "project-proxy-rule-row",
    title: "进程代理规则行",
    group: "定制组件",
    source: "project",
    note: "进程级网络分流面板：进程图标、域名与端口规则标签、代理/直连/拦截策略切换与启用开关。",
    render: ProjectProxyRuleRow,
    width: 680,
    height: 310,
  },
  {
    id: "project-empty-state",
    title: "空状态引导卡",
    group: "定制组件",
    source: "project",
    note: "工作区空状态引导卡：支持首次使用引导与无匹配检索结果场景切换，提供主次操作按钮。",
    render: ProjectEmptyStateSpecimen,
    width: 540,
    height: 340,
  },
  {
    id: "project-update-stack",
    title: "版本公告叠卡",
    group: "定制组件",
    source: "project",
    note: "侧栏底部版本更新提示叠卡：多层错位叠放展示，确认已读后下方卡片平滑前移补位。",
    render: ProjectUpdateStack,
    width: 400,
    height: 250,
  },
  {
    id: "project-filter-toolbar",
    title: "筛选工具栏",
    group: "定制组件",
    source: "project",
    note: "工作台通用筛选工具栏：集成关键词搜索、状态与排序下拉筛选，以及列表/网格视图切换。",
    render: ProjectFilterToolbarSpecimen,
    width: 740,
    height: 240,
  },
  {
    id: "project-settings-panel",
    title: "双栏设置中心",
    group: "定制组件",
    source: "project",
    note: "桌面双栏设置中心：左侧分组导航栏与右侧分区设置卡片联动切换，支持未保存更改底部提示栏。",
    render: SettingsLayoutSpecimen,
    width: 760,
    height: 430,
  },
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
