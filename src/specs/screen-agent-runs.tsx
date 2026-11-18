import {
  AfAgentInboxBoard,
  AfAgentOrchestration,
  AfAgentRunDetail,
  AfAgentTasks,
  AfInbox,
  AfWorkflowBuilder,
} from "../components/screens-agent-runs";
import type { ComponentSpec } from "../types";

function AgentInboxBoardSpecimen() {
  return <AfAgentInboxBoard />;
}

function AgentOrchestrationSpecimen() {
  return <AfAgentOrchestration />;
}

function AgentRunDetailSpecimen() {
  return <AfAgentRunDetail />;
}

function AgentTasksSpecimen() {
  return <AfAgentTasks />;
}

function AgentInboxSpecimen() {
  return <AfInbox />;
}

function WorkflowBuilderSpecimen() {
  return <AfWorkflowBuilder />;
}

export const screenAgentRunsSpecs: ComponentSpec[] = [
  {
    id: "agent-inbox-board",
    title: "Agent / Inbox Board",
    group: "Screens",
    source: "pro",
    note: "后台 Agent 任务三列看板（Needs you / Running / Done）：像素印记闪烁、原地变态滑移换列、看板/列表切换与右侧审批重试侧栏。",
    render: AgentInboxBoardSpecimen,
    height: 672,
  },
  {
    id: "agent-orchestration",
    title: "Agent / Orchestration",
    group: "Screens",
    source: "pro",
    note: "多智能体实时编排树画布：父子贝塞尔流动脉冲连线、底部可折叠 Trace / Tokens & cost / Events 面板与右侧单智能体审批检查器。",
    render: AgentOrchestrationSpecimen,
    height: 672,
  },
  {
    id: "agent-run-detail",
    title: "Agent / Run Detail",
    group: "Screens",
    source: "pro",
    note: "单次 Agent 运行时间轴剖析：自适应刻度轴、流式扫光生长色带、蓝色当前时刻游标线、实时成本汇总与步骤输入/输出检视面板。",
    render: AgentRunDetailSpecimen,
    height: 672,
  },
  {
    id: "agent-tasks",
    title: "Agent / Tasks",
    group: "Screens",
    source: "pro",
    note: "按项目分组的任务总览：步骤进度圆环、自然语言状态、琥珀色待决计数及右侧可打开文档/表格/代码产物的详情面板。",
    render: AgentTasksSpecimen,
    height: 672,
  },
  {
    id: "inbox",
    title: "Agent / Inbox",
    group: "Screens",
    source: "pro",
    note: "编排器待人工拍板收件箱：单键选号与利弊对比展开、描勾确认收起滑入下一题，配合右侧关联任务与产物快速预览。",
    render: AgentInboxSpecimen,
    height: 672,
  },
  {
    id: "workflow-builder",
    title: "Workflow Builder",
    group: "Screens",
    source: "pro",
    note: "可视化节点工作流编排画布：左侧可拖入组件库、点阵缩放平移画布、条件分支贝塞尔曲线、逐步点亮测试运行与右侧连接配置器。",
    render: WorkflowBuilderSpecimen,
    height: 672,
  },
];
