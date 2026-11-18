import "../components/illustrations-a/illustrations-a.css";
import type { ComponentSpec, GalleryGroup } from "../types";
import {
  AfAgentTeam,
  AfCoverFlow,
  AfEmptyCalendar,
  AfEnrichmentOrbit,
  AfFrostCloud,
  AfGhostedChat,
  AfGlassFolder,
  AfGlowCloud,
  AfGlowKeyboard,
  AfInspectAgentCard,
  AfInspectComposer,
  AfIntegrationBeam,
  AfIntegrationFlow,
} from "../components/illustrations-a";

const ILLUSTRATION_GROUP: GalleryGroup = "插画";

function AgentTeamSpecimen() {
  return (
    <div className="af-il-wrap">
      <AfAgentTeam />
    </div>
  );
}

function CoverFlowSpecimen() {
  return (
    <div className="af-il-wrap af-il-wrap--wide">
      <AfCoverFlow aria-label="Gradient collection" />
    </div>
  );
}

function EmptyCalendarSpecimen() {
  return (
    <div className="af-il-wrap">
      <AfEmptyCalendar />
    </div>
  );
}

function EnrichmentOrbitSpecimen() {
  return (
    <div className="af-il-wrap">
      <AfEnrichmentOrbit />
    </div>
  );
}

function GhostedChatSpecimen() {
  return (
    <div className="af-il-wrap">
      <AfGhostedChat />
    </div>
  );
}

function GlassFolderSpecimen() {
  return (
    <div className="af-il-wrap">
      <AfGlassFolder />
    </div>
  );
}

function FrostCloudSpecimen() {
  return (
    <div className="af-il-scene af-il-scene--cloud">
      <AfFrostCloud />
    </div>
  );
}

function GlowCloudSpecimen() {
  return (
    <div className="af-il-scene af-il-scene--cloud">
      <AfGlowCloud />
    </div>
  );
}

function GlowKeyboardSpecimen() {
  return (
    <div className="af-il-scene af-il-scene--keyboard">
      <AfGlowKeyboard />
    </div>
  );
}

function InspectAgentCardSpecimen() {
  return <AfInspectAgentCard className="af-il-inspect--agent" />;
}

function InspectComposerSpecimen() {
  return <AfInspectComposer className="af-il-inspect--composer" />;
}

function IntegrationBeamSpecimen() {
  return (
    <div className="af-il-wrap af-il-wrap--beam">
      <AfIntegrationBeam />
    </div>
  );
}

function IntegrationFlowSpecimen() {
  return (
    <div className="af-il-scene af-il-scene--flow">
      <AfIntegrationFlow />
    </div>
  );
}

/** affectUI 动态交互插画（前半部分 A-I，共 13 项）。 */
export const illustrationsASpecs: ComponentSpec[] = [
  {
    id: "agent-team",
    title: "Agent Team",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。提示词自动键入并发起任务后，分流连线依次唤醒三位专属 Agent 角色与工具徽章。",
    render: AgentTeamSpecimen,
    width: 600,
    height: 520,
  },
  {
    id: "cover-flow",
    title: "Cover Flow",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。经典 3D 透视封面流轮播，支持指针拖拽惯性滑行、横向滚轮、键盘方向键与地面倒影。",
    render: CoverFlowSpecimen,
    width: 720,
    height: 580,
  },
  {
    id: "empty-calendar",
    title: "Empty Calendar",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。三层错位堆叠的空日程卡片，底部彩虹光晕呼吸、骨架条微光扫掠，悬停时扇形展开。",
    render: EmptyCalendarSpecimen,
    width: 560,
    height: 480,
  },
  {
    id: "enrichment-orbit",
    title: "Enrichment Orbit",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。中心 Grok 方块配合双环反向彩虹彗星弧线，三枚数据节点沿轨道公转并保持正向直立。",
    render: EnrichmentOrbitSpecimen,
    width: 560,
    height: 480,
  },
  {
    id: "frost-cloud",
    title: "Frost Cloud",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。磨砂半透明云朵角色，全屏晴空/暮色背景、柔和呼吸浮动、视线跟随指针、随机眨眼与点击弹跳眨眼。",
    render: FrostCloudSpecimen,
    width: 680,
    height: 500,
  },
  {
    id: "ghosted-chat",
    title: "Ghosted Chat",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。三条已读未回消息依次上浮并掠过暖红微光，悬停时浮现正在输入的省略号回复气泡。",
    render: GhostedChatSpecimen,
    width: 560,
    height: 500,
  },
  {
    id: "glass-folder",
    title: "Glass Folder",
    group: ILLUSTRATION_GROUP,
    source: "pro",
    note: "affectUI Pro 插画。磨砂玻璃前袋与三页文档卡片组成的蓝色文件夹，悬停时前袋外倾、纸张扇形抽出。",
    render: GlassFolderSpecimen,
    width: 560,
    height: 480,
  },
  {
    id: "glow-cloud",
    title: "Glow Cloud",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。立体柔光体积云角色，高光随视线偏移、自然单双眨眼、指针追踪与点击挤压回弹单眼眨。",
    render: GlowCloudSpecimen,
    width: 680,
    height: 500,
  },
  {
    id: "glow-keyboard",
    title: "Glow Keyboard",
    group: ILLUSTRATION_GROUP,
    source: "pro",
    note: "affectUI Pro 插画。双层流动彩光底座上的全尺寸玻璃键盘与流光输入框，内置拟真节奏自动打字、纠错与按键彩浪，点击或键入即刻接管。",
    render: GlowKeyboardSpecimen,
    width: 760,
    height: 520,
  },
  {
    id: "inspect-agent-card",
    title: "Inspect Agent Card",
    group: ILLUSTRATION_GROUP,
    source: "pro",
    note: "affectUI Pro 插画。3D 倾斜设计检视器自动巡检运行中 Agent 卡片的 Header / Task / Meta 选框、蓝标内距、红标间距与手型光标。",
    render: InspectAgentCardSpecimen,
    width: 600,
    height: 460,
  },
  {
    id: "inspect-composer",
    title: "Inspect Composer",
    group: ILLUSTRATION_GROUP,
    source: "pro",
    note: "affectUI Pro 插画。镜像 3D 倾斜检视器逐步标注消息编辑器的 Message / Toolbar / Footer 图层尺寸与间距标尺。",
    render: InspectComposerSpecimen,
    width: 600,
    height: 480,
  },
  {
    id: "integration-beam",
    title: "Integration Beam",
    group: ILLUSTRATION_GROUP,
    source: "free",
    note: "affectUI 免费插画。左侧输入源汇聚脉冲光束至中心 AI 枢纽再扇出至右侧动作端，支持悬停提示、点击启停节点与窄屏纵向自适应。",
    render: IntegrationBeamSpecimen,
    width: 680,
    height: 480,
  },
  {
    id: "integration-flow",
    title: "Integration Flow",
    group: ILLUSTRATION_GROUP,
    source: "pro",
    note: "affectUI Pro 插画。14 枚呼吸漂移珊瑚色块构成的柔光场，应用胶囊沿虚线轨道轮转聚焦并向中心数据分析枢纽扫射高光束。",
    render: IntegrationFlowSpecimen,
    width: 760,
    height: 500,
  },
];
