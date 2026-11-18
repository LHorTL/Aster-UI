import { useState } from "react";
import {
  AfAnalytics,
  AfCrm,
  AfEvals,
  AfFiles,
  AfFolder,
  AfIntegrations,
  AfKanban,
} from "../components/screens-workspace";
import type { ComponentSpec } from "../types";

const KNOWN_FOLDERS = new Set(["Q3 Campaign", "Brand assets", "Hiring", "Research"]);

function AnalyticsSpecimen() {
  return <AfAnalytics />;
}

function CrmSpecimen() {
  return <AfCrm />;
}

function EvalsSpecimen() {
  return <AfEvals />;
}

function FilesSpecimen() {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  if (openFolder) {
    return (
      <AfFolder
        folder={openFolder}
        onNavigate={(label) => {
          if (label === "Folders") setOpenFolder(null);
          else if (KNOWN_FOLDERS.has(label)) setOpenFolder(label);
        }}
      />
    );
  }
  return (
    <AfFiles
      onNavigate={(label) => {
        if (KNOWN_FOLDERS.has(label)) setOpenFolder(label);
      }}
    />
  );
}

function FolderSpecimen() {
  const [viewFiles, setViewFiles] = useState(false);
  const [folder, setFolder] = useState("Q3 Campaign");
  if (viewFiles) {
    return (
      <AfFiles
        onNavigate={(label) => {
          if (KNOWN_FOLDERS.has(label)) {
            setFolder(label);
            setViewFiles(false);
          }
        }}
      />
    );
  }
  return (
    <AfFolder
      folder={folder}
      onNavigate={(label) => {
        if (label === "Folders") setViewFiles(true);
        else if (KNOWN_FOLDERS.has(label)) setFolder(label);
      }}
    />
  );
}

function IntegrationsSpecimen() {
  return <AfIntegrations />;
}

function KanbanSpecimen() {
  return <AfKanban />;
}

export const screenWorkspaceSpecs: ComponentSpec[] = [
  {
    id: "analytics",
    title: "Analytics",
    group: "Screens",
    source: "pro",
    note: "电商与订阅营收分析整页工作台：4 枚迷你柱状指标卡、多渠道折线图、营收拆解单与热门产品占比。",
    render: AnalyticsSpecimen,
    height: 672,
  },
  {
    id: "crm",
    title: "CRM",
    group: "Screens",
    source: "pro",
    note: "多视图电子表格型客户关系工作台：支持双击单元格原位编辑、Ctrl+Z 撤销重做栈、列排序与视图页签切换。",
    render: CrmSpecimen,
    height: 672,
  },
  {
    id: "evals",
    title: "Evals",
    group: "Screens",
    source: "pro",
    note: "AI Prompt 评测工作台：版本通过率趋势图、支持 Y/N 键盘逐条审阅的系统提示词行内 Diff 卡与 25 条用例明细表。",
    render: EvalsSpecimen,
    height: 672,
  },
  {
    id: "files",
    title: "Folders / Overview",
    group: "Screens",
    source: "pro",
    note: "工作区文件夹与文档模板总览：权限胶囊筛选、网格/列表视图切换、微缩纸张预览卡与新建文件夹弹窗。",
    render: FilesSpecimen,
    height: 672,
  },
  {
    id: "folder",
    title: "Folders / Detail",
    group: "Screens",
    source: "pro",
    note: "项目文件夹详情页：面包屑返回、原生多文件上传追加、分享链接弹窗与侧栏项目实时切换。",
    render: FolderSpecimen,
    height: 672,
  },
  {
    id: "integrations",
    title: "Integrations",
    group: "Screens",
    source: "pro",
    note: "团队工具集成目录：吸顶筛选与检索栏、三大分类双列清单、一键连接/断开切换与折叠更多展开。",
    render: IntegrationsSpecimen,
    height: 672,
  },
  {
    id: "kanban",
    title: "Kanban Board",
    group: "Screens",
    source: "pro",
    note: "四列优先级看板与列表双视图：支持跨列拖拽落点指示线、双栏新建任务弹窗与带实时动态流的任务详情弹窗。",
    render: KanbanSpecimen,
    height: 672,
  },
];
