import { useState } from "react";
import "../components/illustrations-b/illustrations-b.css";
import {
  AfIntegrationGrid,
  AfLayerStack,
  AfLeadSourcing,
  AfLogoCluster,
  AfModelWheel,
  AfOutreachBranches,
  AfProjectFlow,
  AfRegionDach,
  AfSideFolder,
  AfTabOverload,
  AfTeamInvite,
  AfVoiceOrb,
  AfWorldMap,
  type VoiceOrbState,
} from "../components/illustrations-b";
import type { ComponentSpec, GalleryGroup } from "../types";

const ILLUS_GROUP: GalleryGroup = "插画";

function IntegrationGridSpecimen() {
  return (
    <div className="af-ib-stage-760">
      <AfIntegrationGrid />
    </div>
  );
}

function LayerStackSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfLayerStack />
    </div>
  );
}

function LeadSourcingSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfLeadSourcing />
    </div>
  );
}

function LogoClusterSpecimen() {
  return (
    <div className="af-ib-stage-300">
      <AfLogoCluster />
    </div>
  );
}

function ModelWheelSpecimen() {
  return (
    <div className="af-ib-stage-360">
      <AfModelWheel />
    </div>
  );
}

function OutreachBranchesSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfOutreachBranches />
    </div>
  );
}

function ProjectFlowSpecimen() {
  return (
    <div className="af-ib-stage-760">
      <AfProjectFlow />
    </div>
  );
}

function RegionDachSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfRegionDach />
    </div>
  );
}

function SideFolderSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfSideFolder />
    </div>
  );
}

function TabOverloadSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfTabOverload />
    </div>
  );
}

function TeamInviteSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfTeamInvite />
    </div>
  );
}

const VOICE_STATES: { value: VoiceOrbState; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "listening", label: "Listening" },
  { value: "thinking", label: "Thinking" },
  { value: "speaking", label: "Speaking" },
];

function VoiceOrbSpecimen() {
  const [state, setState] = useState<VoiceOrbState>("idle");
  return (
    <div className="af-ib-vo-demo">
      <AfVoiceOrb
        state={state}
        onPress={() => setState((prev) => (prev === "idle" ? "listening" : "idle"))}
      />
      <div className="af-ib-vo-states" role="radiogroup" aria-label="State">
        {VOICE_STATES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={state === item.value}
            onClick={() => setState(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldMapSpecimen() {
  return (
    <div className="af-ib-stage-560">
      <AfWorldMap />
    </div>
  );
}

export const illustrationsBSpecs: ComponentSpec[] = [
  {
    id: "integration-grid",
    title: "Integration Grid",
    group: ILLUS_GROUP,
    source: "free",
    note: "蜂窝错列集成图标矩阵：中心品牌磁贴高亮聚焦、四周 22 款主流工具向边缘径向渐隐并带悬停微抬升。",
    render: IntegrationGridSpecimen,
    width: 760,
    height: 430,
  },
  {
    id: "layer-stack",
    title: "Layer Stack",
    group: ILLUS_GROUP,
    source: "free",
    note: "五层等轴测架构叠层：右侧列表自动轮播与悬停点选同步抬升对应层并切换主题蓝高亮。",
    render: LayerStackSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "lead-sourcing",
    title: "Lead Sourcing",
    group: ILLUS_GROUP,
    source: "free",
    note: "ChatGPT 连接 Gmail 与 Grok 的双路流光导管插画：柔和彩虹底光与错峰脉冲轨迹。",
    render: LeadSourcingSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "logo-cluster",
    title: "Logo Cluster",
    group: ILLUS_GROUP,
    source: "free",
    note: "中心圆盘与环绕品牌气泡簇：气泡由中心弹性弹出落位，环轨缓慢公转并保持图标正向。",
    render: LogoClusterSpecimen,
    width: 300,
    height: 430,
  },
  {
    id: "model-wheel",
    title: "Model Wheel",
    group: ILLUS_GROUP,
    source: "free",
    note: "AI 模型滚轮鼓面：支持拖拽旋转与自动步进，上下边缘透视弯折且当前行落入柔和底色胶囊。",
    render: ModelWheelSpecimen,
    width: 360,
    height: 400,
  },
  {
    id: "outreach-branches",
    title: "Outreach Branches",
    group: ILLUS_GROUP,
    source: "pro",
    note: "三路外联分支脉冲插画：流光沿连线依次注入 Gmail、Slack 与 Notion 磁贴并沿边缘环绕消散。",
    render: OutreachBranchesSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "project-flow",
    title: "Project Flow",
    group: ILLUS_GROUP,
    source: "pro",
    note: "项目任务拆解全景动效画布：客户需求依次分支为子任务、备注与指派角色，手势拖入子卡自动摆正落位。",
    render: ProjectFlowSpecimen,
    width: 760,
    height: 480,
  },
  {
    id: "region-dach",
    title: "DACH Region",
    group: ILLUS_GROUP,
    source: "free",
    note: "DACH 与多国边界流光地图：邻国轮廓向四周渐隐，彩带沿国界游走，左上菜单支持切换 6 个国家与地区。",
    render: RegionDachSpecimen,
    width: 560,
    height: 460,
  },
  {
    id: "side-folder",
    title: "Side Folder",
    group: ILLUS_GROUP,
    source: "free",
    note: "侧立磨砂玻璃蓝文件夹：悬停时前袋 3D 翻开，两份文档向右滑出。",
    render: SideFolderSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "tab-overload",
    title: "Tab Overload",
    group: ILLUS_GROUP,
    source: "free",
    note: "三层错落浏览器窗口：地址栏呼吸闪烁，悬停任一标签页时激活胶囊平滑跟随。",
    render: TabOverloadSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "team-invite",
    title: "Team Invite",
    group: ILLUS_GROUP,
    source: "free",
    note: "团队成员邀请连线动效：光标将新成员拖入虚线空槽，连接线转实并点亮在线绿点。",
    render: TeamInviteSpecimen,
    width: 560,
    height: 430,
  },
  {
    id: "voice-orb",
    title: "Voice Orb",
    group: ILLUS_GROUP,
    source: "pro",
    note: "语音助手 520 点球体面孔：支持 Idle 呼吸、Listening 声波外跃、Thinking 倾斜高速光环与 Speaking 极点波纹无缝融变。",
    render: VoiceOrbSpecimen,
    width: 560,
    height: 390,
  },
  {
    id: "world-map",
    title: "World Map Continental",
    group: ILLUS_GROUP,
    source: "pro",
    note: "六大洲高亮世界地图：柔和彩带沿选中大洲海岸线流动，左上折叠菜单支持六大洲平滑切换。",
    render: WorldMapSpecimen,
    width: 560,
    height: 430,
  },
];
