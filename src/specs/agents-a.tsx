import "../patterns/agents-a.css";
import type { ComponentSpec } from "../types";
import { AfAgentCursorsPattern as AgentCursorsDemo } from "../components/agents/AgentCursorsPattern";
import { AfAgentGraphPattern as AgentGraphDemo } from "../components/agents/AgentGraphPattern";
import { AfAgentLanesPattern as AgentLanesDemo } from "../components/agents/AgentLanesPattern";
import { AfAgentPlanPattern as AgentPlanDemo } from "../components/agents/AgentPlanPattern";
import { AfAgentQueuePattern as AgentQueueDemo } from "../components/agents/AgentQueuePattern";
import { AfAgentSteeringPattern as AgentSteeringDemo } from "../components/agents/AgentSteeringPattern";
import { AfAgentTreePattern as AgentTreeDemo } from "../components/agents/AgentTreePattern";
import { AfAutonomyDialPattern as AutonomyDialDemo } from "../components/agents/AutonomyDialPattern";
import { AfDelegateBoardPattern as DelegateBoardDemo } from "../components/agents/DelegateBoardPattern";

/** 编排与可视化类 Agents 组件。 */
export const agentsASpecs: ComponentSpec[] = [
  {
    id: "agent-cursors",
    title: "Agent Cursors",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：多人协作指针与逐条建议。桌面宿主用于发布说明、翻译稿的 Agent 协作修订。",
    render: AgentCursorsDemo,
    width: 760,
    height: 520,
  },
  {
    id: "agent-graph",
    title: "Agent Graph",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：Agent 与工具的调用网络。悬停聚焦邻域、点击看详情，脉冲沿连线流动。",
    render: AgentGraphDemo,
    width: 800,
    height: 520,
  },
  {
    id: "agent-lanes",
    title: "Agent Lanes",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：泳道时间轴与交接曲线。桌面宿主用于监控多个数据源的运行区间与人工确认。",
    render: AgentLanesDemo,
    width: 800,
    height: 420,
  },
  {
    id: "agent-plan",
    title: "Agent Plan",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：分步计划与失败重试。桌面宿主用于批量上架、插件安装等多步操作。",
    render: AgentPlanDemo,
    width: 520,
    height: 560,
  },
  {
    id: "agent-queue",
    title: "Agent Queue",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：队列、worker 与深度图。暂停、限速、优先插队与完成/失败归档都可直接复用。",
    render: AgentQueueDemo,
    width: 800,
    height: 560,
  },
  {
    id: "agent-steering",
    title: "Agent Steering",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：运行中追加指令并看到它被哪一步采纳。长任务纠偏的轻量入口。",
    render: AgentSteeringDemo,
    width: 560,
    height: 560,
  },
  {
    id: "agent-tree",
    title: "Agent Tree",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：谁启动了谁，费用逐级汇总。适合 Token 统计的会话 → 子请求树形汇总。",
    render: AgentTreeDemo,
    width: 800,
    height: 560,
  },
  {
    id: "autonomy-dial",
    title: "Autonomy Dial",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：三档自动化与动作分组滑移。设置页的自动化等级、权限档位可直接使用。",
    render: AutonomyDialDemo,
    width: 560,
    height: 600,
  },
  {
    id: "delegate-board",
    title: "Delegate Board",
    group: "Agents",
    source: "pro",
    note: "affectUI Pro：拖放分配任务并预览忙碌时间与成本。监控任务分派给不同账号时复用。",
    render: DelegateBoardDemo,
    width: 800,
    height: 560,
  },
];
