import {
  AfAgentActivity,
  AfAgentMemory,
  AfAgentPermissions,
  AfAgentSchedules,
  AfAgentSkills,
  AfAgentUsage,
  AfAgents,
} from "../components/screens-agent-ops";
import type { ComponentSpec } from "../types";

function AgentActivitySpecimen() {
  return <AfAgentActivity />;
}

function AgentMemorySpecimen() {
  return <AfAgentMemory />;
}

function AgentPermissionsSpecimen() {
  return <AfAgentPermissions />;
}

function AgentSchedulesSpecimen() {
  return <AfAgentSchedules />;
}

function AgentSkillsSpecimen() {
  return <AfAgentSkills />;
}

function AgentUsageSpecimen() {
  return <AfAgentUsage />;
}

function AgentsTeamSpecimen() {
  return <AfAgents />;
}

export const screenAgentOpsSpecs: ComponentSpec[] = [
  {
    id: "agent-activity",
    title: "Agent / Activity",
    group: "Screens",
    source: "pro",
    note: "Agent 跨应用动作审计流：按日分组句子式时间线、授权归因（自动规则 vs 人工批准）、左起划线淡出撤销与右侧 Step 检视栏。",
    render: AgentActivitySpecimen,
    height: 884,
  },
  {
    id: "agent-memory",
    title: "Agent / Memory",
    group: "Screens",
    source: "pro",
    note: "Agent 长期记忆管理与同意审查：Saved / To review 双列表、可折叠项目树、召回流光扫过动效、5 秒撤销恢复与右侧来源编辑栏。",
    render: AgentMemorySpecimen,
    height: 884,
  },
  {
    id: "agent-permissions",
    title: "Agent / Permissions",
    group: "Screens",
    source: "pro",
    note: "Agent 自治等级与红线治理：Careful / Balanced / Hands-off 三档滑移比例条、7 大连接应用动作配额与不可逾越 Red lines 锁定规则。",
    render: AgentPermissionsSpecimen,
    height: 884,
  },
  {
    id: "agent-schedules",
    title: "Agent / Schedules",
    group: "Screens",
    source: "pro",
    note: "Agent 周期调度总览：Around now 实时活动曲线与可点选运行锚点、填充圆环进度胶囊、行内暂停开关与右侧未来 5 次跳过/立即运行面板。",
    render: AgentSchedulesSpecimen,
    height: 884,
  },
  {
    id: "agent-skills",
    title: "Agent / Skills",
    group: "Screens",
    source: "pro",
    note: "Agent 技能库与市场目录：Installed 开关卡与 Discover 1.4s 进度环变勾模糊着陆安装、四路新建技能弹窗及 14 日调用柱图详情栏。",
    render: AgentSkillsSpecimen,
    height: 884,
  },
  {
    id: "agent-usage",
    title: "Agent / Usage",
    group: "Screens",
    source: "pro",
    note: "Agent 月度账单与预算预测：逐位滚轮跳字总额、实线+虚线预测交互曲线、Projects / Models 占比环比切换与异常费用提醒。",
    render: AgentUsageSpecimen,
    height: 884,
  },
  {
    id: "agents",
    title: "Agent / Agents",
    group: "Screens",
    source: "pro",
    note: "Agent 团队花名册与状态总控：工作态对角闪烁像素徽记、Grid / List 双视图、实时像素预览新建智能体弹窗与右侧指令/技能/任务检查器。",
    render: AgentsTeamSpecimen,
    height: 884,
  },
];
