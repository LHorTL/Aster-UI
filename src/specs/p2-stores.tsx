import { useState, type CSSProperties } from "react";
import {
  AfProjectDownloadRow,
  AfProjectStoreCard,
  AfStoreAppDetailDrawer,
  AfStoreAuthModal,
  AfStoreHeaderBar,
  AfStoreHeroStage,
  AfStorePlatformMatrix,
  AfStoreTaskShelf,
  AfStoreUpdatesWorkspace,
  AfReleaseChangelogEditor,
  AfChunkedPackagePublisher,
  AfAppGrantEditor,
  AfLogTailViewer,
  AfMarketFilterBar,
  AfMarketListingView,
  AfMarketGoodsModal,
  AfCashierModal,
  AfConsignmentCalculator,
  AfAccountAssetMatrix,
  type AfProjectStoreItem,
  type AfStoreNavTab,
  type AfStoreSyncState,
} from "../patterns/store";
import { AfSegmented, AfTag } from "../ui";
import type { ComponentSpec } from "../types";

const STAGE_COL: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  width: "100%",
  alignItems: "center",
};

function StoreHeaderBarSpecimen() {
  const [tab, setTab] = useState<AfStoreNavTab>("discover");
  const [syncState, setSyncState] = useState<AfStoreSyncState>("synced");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <AfSegmented<AfStoreSyncState>
          size="xs"
          value={syncState}
          onChange={setSyncState}
          options={[
            { value: "synced", label: "在线已同步" },
            { value: "syncing", label: "目录同步中" },
            { value: "offline", label: "离线缓存回退" },
          ]}
        />
        <AfTag tone="neutral" size="sm">
          按 / 或 Ctrl+K 聚焦检索框
        </AfTag>
      </div>
      <AfStoreHeaderBar
        activeTab={tab}
        onTabChange={setTab}
        syncState={syncState}
        onRefreshCatalog={() => setSyncState("syncing")}
      />
    </div>
  );
}

const EIGHT_STATE_APPS: AfProjectStoreItem[] = [
  {
    id: "st-avail",
    name: "多模态截图互译",
    icon: "translate",
    desc: "快捷键框选屏幕区域实时 OCR 识别并原地回填双语译文。",
    version: "2.4.0",
    category: "效率工具",
    sizeLabel: "免费 · 28.6 MB",
    visibility: "official",
    state: "available",
    tags: ["离线版面分析", "同步缩放校对", "术语库"],
  },
  {
    id: "st-dl",
    name: "非线性视频工作台",
    icon: "play",
    desc: "支持多轨片段入出点精剪、磁吸时间码标尺与多比例监视器预览。",
    version: "1.1.0",
    category: "多媒体",
    visibility: "beta",
    state: "downloading",
    progress: 64,
    tags: ["多轨时间轴", "逐帧传输"],
  },
  {
    id: "st-incompat",
    name: "企业内网规则网关",
    icon: "proxy",
    desc: "进程级流量分流、命中实时模拟与团队私有规则集下发。",
    version: "3.0.0",
    category: "网络治理",
    visibility: "private",
    state: "incompatible",
    minHostVersion: "2.0.0",
    tags: ["私有授权", "PID 过滤"],
  },
];

function StoreCardSpecimen() {
  const [selected, setSelected] = useState<string>("点击任意卡片打开详情抽屉");
  return (
    <div style={{ ...STAGE_COL, maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
        <AfTag tone="accent" size="sm">
          {selected}
        </AfTag>
      </div>
      <AfProjectStoreCard
        apps={EIGHT_STATE_APPS}
        onSelect={(item) => setSelected(`已选中「${item.name}」v${item.version}`)}
      />
    </div>
  );
}

function StoreDetailDrawerSpecimen() {
  return (
    <div style={STAGE_COL}>
      <AfStoreAppDetailDrawer inline />
    </div>
  );
}

function StoreUpdatesWorkspaceSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 680 }}>
      <AfStoreUpdatesWorkspace />
    </div>
  );
}

function StoreDownloadRowSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 660 }}>
      <AfProjectDownloadRow />
    </div>
  );
}

function StoreTaskShelfSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 380 }}>
      <AfStoreTaskShelf defaultExpanded />
    </div>
  );
}

function StoreAuthModalSpecimen() {
  return (
    <div style={STAGE_COL}>
      <AfStoreAuthModal inline sessionExpired />
    </div>
  );
}

function StoreHeroStageSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 820 }}>
      <AfStoreHeroStage />
    </div>
  );
}

function StorePlatformMatrixSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 860 }}>
      <AfStorePlatformMatrix />
    </div>
  );
}

function ReleaseChangelogEditorSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 860 }}>
      <AfReleaseChangelogEditor />
    </div>
  );
}

function ChunkedPackagePublisherSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 820 }}>
      <AfChunkedPackagePublisher />
    </div>
  );
}

function AppGrantEditorSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 780 }}>
      <AfAppGrantEditor />
    </div>
  );
}

function LogTailViewerSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 860 }}>
      <AfLogTailViewer />
    </div>
  );
}

function MarketFilterBarSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 900 }}>
      <AfMarketFilterBar />
    </div>
  );
}

function MarketListingViewSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 920 }}>
      <AfMarketListingView />
    </div>
  );
}

function MarketGoodsModalSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 1040 }}>
      <AfMarketGoodsModal inline />
    </div>
  );
}

function CashierModalSpecimen() {
  return (
    <div style={STAGE_COL}>
      <AfCashierModal inline countdownPaused />
    </div>
  );
}

function ConsignmentCalculatorSpecimen() {
  return (
    <div style={STAGE_COL}>
      <AfConsignmentCalculator />
    </div>
  );
}

function AccountAssetMatrixSpecimen() {
  return (
    <div style={{ ...STAGE_COL, maxWidth: 940 }}>
      <AfAccountAssetMatrix />
    </div>
  );
}

export const p2StoreSpecs: ComponentSpec[] = [
  {
    id: "store-header-bar",
    title: "商城顶栏与目录同步",
    group: "定制组件",
    source: "project",
    note: "内置应用商城顶栏：发现、已装、更新、任务四页签切换，支持快捷键聚焦检索、目录同步状态提示与账号入口。",
    render: StoreHeaderBarSpecimen,
    width: 840,
    height: 220,
  },
  {
    id: "project-store-card",
    title: "应用商城多状态卡片",
    group: "定制组件",
    source: "project",
    note: "覆盖获取、排队、下载、校验、安装、已装、更新与版本不兼容等完整生命周期状态，支持渠道标识与自适应折叠标签。",
    render: StoreCardSpecimen,
    width: 840,
    height: 310,
  },
  {
    id: "store-app-detail-drawer",
    title: "应用详情侧边抽屉",
    group: "定制组件",
    source: "project",
    note: "应用详情侧栏面板：含应用头部操作区、预览图画廊与大图检视、版本规格信息、分级权限声明及历史版本回退。",
    render: StoreDetailDrawerSpecimen,
    width: 510,
    height: 760,
  },
  {
    id: "store-updates-workspace",
    title: "应用与主程序更新中心",
    group: "定制组件",
    source: "project",
    note: "顶部桌面主程序版本升级提示卡与下方已安装扩展待更新列表，支持单条更新后平滑收起补位与一键全部更新。",
    render: StoreUpdatesWorkspaceSpecimen,
    width: 700,
    height: 520,
  },
  {
    id: "project-download-row",
    title: "下载与安装传输队列",
    group: "定制组件",
    source: "project",
    note: "覆盖排队、下载、暂停、完整性校验、正在安装、已完成与异常重试全流程状态，实时显示传输速率与剩余时间。",
    render: StoreDownloadRowSpecimen,
    width: 680,
    height: 390,
  },
  {
    id: "store-task-shelf",
    title: "右下角悬浮传输任务架",
    group: "定制组件",
    source: "project",
    note: "离开商城页面时的右下角紧凑进度胶囊，实时汇总总体传输进度与速率，点击可平滑展开迷你任务明细。",
    render: StoreTaskShelfSpecimen,
    width: 420,
    height: 300,
  },
  {
    id: "store-auth-modal",
    title: "私有源通行证登录窗",
    group: "定制组件",
    source: "project",
    note: "企业私有应用源认证弹窗：支持企业账号密码与个人访问令牌双模式平滑切换、登录过期提示及校验异常反馈。",
    render: StoreAuthModalSpecimen,
    width: 460,
    height: 460,
  },
  {
    id: "store-hero-stage",
    title: "客户端下载首屏展台",
    group: "定制组件",
    source: "project",
    note: "公开下载中心首屏：根据当前操作系统与处理器架构推荐安装包，并提供校验摘要一键复制与更新日志入口。",
    render: StoreHeroStageSpecimen,
    width: 840,
    height: 420,
  },
  {
    id: "store-platform-matrix",
    title: "全平台安装包下载矩阵",
    group: "定制组件",
    source: "project",
    note: "覆盖 Windows、macOS、Linux 多架构安装包清单，支持按系统筛选、校验值一键复制与历史版本归档展开。",
    render: StorePlatformMatrixSpecimen,
    width: 880,
    height: 540,
  },
  {
    id: "release-changelog-editor",
    title: "版本发布与签名工作台",
    group: "定制组件",
    source: "project",
    note: "版本发布管理台：支持版本号语义递增、双栏更新日志实时预览、定时发布排期以及代码签名证书状态核验。",
    render: ReleaseChangelogEditorSpecimen,
    width: 880,
    height: 620,
  },
  {
    id: "chunked-package-publisher",
    title: "安装包分片上传与权限核验",
    group: "定制组件",
    source: "project",
    note: "支持大体积安装包拖拽校验、16 分片并发上传与单分片失败重试，并内置新旧版本权限声明逐项对比。",
    render: ChunkedPackagePublisherSpecimen,
    width: 840,
    height: 660,
  },
  {
    id: "app-grant-editor",
    title: "私有应用访问白名单",
    group: "定制组件",
    source: "project",
    note: "支持按成员邮箱、研发部门或部署令牌批量添加访问授权，提供有效期配置、状态筛选与单条即时吊销。",
    render: AppGrantEditorSpecimen,
    width: 800,
    height: 460,
  },
  {
    id: "log-tail-viewer",
    title: "实时构建与发布日志台",
    group: "定制组件",
    source: "project",
    note: "顶部多阶段耗时进度条与底部实时滚动日志终端，向上翻阅历史时自动暂停跟随并浮现未读新日志回底提示。",
    render: LogTailViewerSpecimen,
    width: 880,
    height: 440,
  },
  {
    id: "market-filter-bar",
    title: "多维商品筛选检索栏",
    group: "定制组件",
    source: "project",
    note: "交易市场多条件筛选栏：集成关键词联想、兼容生态级联选择、授权规格与资产类型多选、价格区间输入、扩展指标及常用筛选预设。",
    render: MarketFilterBarSpecimen,
    width: 920,
    height: 280,
  },
  {
    id: "market-listing-view",
    title: "商品列表与双栏速览",
    group: "定制组件",
    source: "project",
    note: "支持高密度表格、横版摘要卡片（含公示期倒计时）以及左表右详情双栏速览三种浏览视图无缝切换。",
    render: MarketListingViewSpecimen,
    width: 940,
    height: 460,
  },
  {
    id: "market-goods-modal",
    title: "商品详情与行情检视窗",
    group: "定制组件",
    source: "project",
    note: "宽屏数字资产详情弹窗：支持多层通道渲染与 360° 实机环视切换、交付资产占比分布条以及近 30 天成交均价走势图。",
    render: MarketGoodsModalSpecimen,
    width: 1060,
    height: 540,
  },
  {
    id: "cashier-modal",
    title: "担保交易锁单收银台",
    group: "定制组件",
    source: "project",
    note: "含 15 分钟锁单倒计时、应付金额明细、微信与支付宝双渠道扫码卡片，以及支付完成回执平滑切换。",
    render: CashierModalSpecimen,
    width: 460,
    height: 560,
  },
  {
    id: "consignment-calculator",
    title: "寄售定价与到手收益计算器",
    group: "定制组件",
    source: "project",
    note: "支持挂牌售价与期望到手净额双向反推试算，实时展示平台服务费明细并集成短信验证码上架确认。",
    render: ConsignmentCalculatorSpecimen,
    width: 620,
    height: 460,
  },
  {
    id: "account-asset-matrix",
    title: "多账号店铺与资产工作台",
    group: "定制组件",
    source: "project",
    note: "跨账号多节点创作者资产总览：支持结算积分占比联动高亮、星标置顶、店铺资产与在售关注抽屉检视，以及右侧边缘身份快切浮标。",
    render: AccountAssetMatrixSpecimen,
    width: 960,
    height: 520,
  },
];
