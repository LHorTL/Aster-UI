import { type CSSProperties } from "react";
import {
  AfAspectPreviewStage,
  AfDocumentPageCanvas,
  AfImageCompareStage,
  AfProcessPickerModal,
  AfRuleChainList,
  AfScreenCaptureOverlay,
  AfSectionOutline,
  AfServerMetricPanel,
  AfTimelineTrackEditor,
} from "../patterns/workbench";
import type { ComponentSpec } from "../types";

const STAGE_COL: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  width: "100%",
  alignItems: "center",
};

function ScreenCaptureOverlaySpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 780 }}>
      <AfScreenCaptureOverlay contained stageWidth={760} stageHeight={400} />
    </div>
  );
}

function ImageCompareStageSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 860 }}>
      <AfImageCompareStage />
    </div>
  );
}

function TimelineTrackEditorSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 900 }}>
      <AfTimelineTrackEditor />
    </div>
  );
}

function AspectPreviewStageSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 720 }}>
      <AfAspectPreviewStage />
    </div>
  );
}

function DocumentStudioSpecimen() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        maxWidth: 940,
      }}
    >
      <AfSectionOutline />
      <div style={{ flex: "1 1 520px", minWidth: 0 }}>
        <AfDocumentPageCanvas />
      </div>
    </div>
  );
}

function ProcessPickerModalSpecimen() {
  return (
    <div style={STAGE_COL}>
      <AfProcessPickerModal inline />
    </div>
  );
}

function RuleChainListSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 860 }}>
      <AfRuleChainList />
    </div>
  );
}

function ServerMetricPanelSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 880 }}>
      <AfServerMetricPanel />
    </div>
  );
}

export const p3WorkbenchSpecs: ComponentSpec[] = [
  {
    id: "screen-capture-overlay",
    title: "区域截图与像素取色台",
    group: "定制组件",
    source: "project",
    note: "支持自由框选与八方向尺寸微调、自动避让边缘的 7×7 像素网格放大镜取色器，以及底部批注与截图翻译工具栏。",
    render: ScreenCaptureOverlaySpecimen,
    width: 800,
    height: 440,
  },
  {
    id: "image-compare-stage",
    title: "图片翻译与多视图对比台",
    group: "定制组件",
    source: "project",
    note: "覆盖译后图、原图、双栏联动缩放平移、左右拖动卷帘对比，以及原文与译文逐句对照修订五种检视模式。",
    render: ImageCompareStageSpecimen,
    width: 880,
    height: 440,
  },
  {
    id: "timeline-track-editor",
    title: "多轨视音频剪辑时间轴",
    group: "定制组件",
    source: "project",
    note: "左侧轨道静音与锁定控制栏，右侧支持时间标尺拖动定位、片段平移、入出点裁切微调与关键节点磁吸对齐。",
    render: TimelineTrackEditorSpecimen,
    width: 920,
    height: 340,
  },
  {
    id: "aspect-preview-stage",
    title: "多画幅真机与监视器预览",
    group: "定制组件",
    source: "project",
    note: "支持 16:9、9:16、3:4、1:1 四种画幅比例平滑切换，提供手机仿真外框、九宫格构图线、多页轮播与逐帧播放控制。",
    render: AspectPreviewStageSpecimen,
    width: 740,
    height: 520,
  },
  {
    id: "document-page-canvas",
    title: "A4 文档排版与章节大纲",
    group: "定制组件",
    source: "project",
    note: "左侧章节大纲支持拖拽排序、双击重命名与显隐切换，右侧提供 A4 纸面等比缩放预览与跨页分页线实时提示。",
    render: DocumentStudioSpecimen,
    width: 960,
    height: 540,
  },
  {
    id: "process-picker-modal",
    title: "本机运行进程选择窗",
    group: "定制组件",
    source: "project",
    note: "支持按进程名、执行路径或 PID 实时筛选本机活跃联网进程，实时展示上下行速率并一键生成网络分流规则。",
    render: ProcessPickerModalSpecimen,
    width: 580,
    height: 460,
  },
  {
    id: "rule-chain-list",
    title: "网络分流规则链与命中测试",
    group: "定制组件",
    source: "project",
    note: "顶部支持输入域名或进程名实时模拟首条命中规则与耗时，下方列表支持拖拽调整优先级以及批量启停或移除。",
    render: RuleChainListSpecimen,
    width: 880,
    height: 420,
  },
  {
    id: "server-metric-panel",
    title: "云服务器流量与线路监控",
    group: "定制组件",
    source: "project",
    note: "含月度计费流量环形进度卡、桌面配额速览胶囊、实例负载占比联动条以及多地域回程延迟趋势折线。",
    render: ServerMetricPanelSpecimen,
    width: 900,
    height: 420,
  },
];
