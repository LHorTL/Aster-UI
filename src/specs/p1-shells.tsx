import { useState, type CSSProperties } from "react";
import { renderAfIconSlot } from "../icons";
import {
  AfAppDock,
  AfDesktopTools,
  AfEdgeNotificationOverlay,
  AfInstallerWizard,
  AfRecoveryLockShell,
  AfRunningProcessesDialog,
  AfSubwindowChrome,
  AfViewportFitStage,
  type AfAppDockItem,
  type AfAppDockVariant,
  type AfInstallerStage,
  type AfSubwindowVariant,
} from "../patterns/shell";
import { AfButton, AfSegmented, AfStatus, AfTag } from "../ui";
import { AfSwap } from "../ui-pro";
import type { ComponentSpec } from "../types";

const DEMO_STAGE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  width: "100%",
  alignItems: "center",
};

const DEMO_BAR: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
};

function P1AppDockSpecimen() {
  const [variant, setVariant] = useState<AfAppDockVariant>("rail");
  const [active, setActive] = useState<AfAppDockItem>({
    id: "overview",
    name: "概览看板",
    icon: "chart",
    group: "日常",
    running: true,
  });
  const [lastEvent, setLastEvent] = useState("拖拽图标或按 Alt+↑/↓ 调序 · 右键打开菜单");

  return (
    <div style={{ ...DEMO_STAGE, maxWidth: 700 }}>
      <div style={DEMO_BAR}>
        <AfSegmented<AfAppDockVariant>
          size="xs"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "rail", label: "标准可折叠侧栏" },
            { value: "compact", label: "紧凑纯图标栏" },
          ]}
        />
        <AfTag tone="neutral" size="sm">
          {lastEvent}
        </AfTag>
      </div>

      <div className="af-shell-dock-demo" style={{ height: 396 }}>
        <AfAppDock
          variant={variant}
          activeId={active.id}
          onSelect={(item) => {
            setActive(item);
            setLastEvent(`已切换至「${item.name}」`);
          }}
          onReorder={(next) => setLastEvent(`已重排顺序（首项：${next[0]?.name ?? "-"}）`)}
          onTogglePin={(item, pinned) =>
            setLastEvent(`${pinned ? "已固定" : "已取消固定"}「${item.name}」`)
          }
          onOpenSubwindow={(item) => setLastEvent(`独立子窗打开：${item.name}`)}
          storeBadgeCount={4}
          onOpenStore={() => setLastEvent("打开内置应用商城（4 项可更新）")}
          onOpenSettings={() => setLastEvent("打开全局设置窗口")}
        />
        <div className="af-shell-dock-demo__stage">
          <div className="af-shell-dock-demo__top">
            <span className="af-shell-dock-demo__crumb">
              {renderAfIconSlot(active.icon, 14)}
              <strong>{active.name}</strong>
            </span>
            <AfStatus tone="success" pulse>
              工作区就绪
            </AfStatus>
          </div>
          <AfSwap swapKey={active.id}>
            <div className="af-shell-dock-demo__cards">
              <div className="af-shell-dock-demo__card">
                <span>当前活跃视图</span>
                <strong>{active.id}</strong>
                <small>支持拖拽与 Alt + 方向键调整顺序，应用较多时上下边缘自动柔和渐隐</small>
              </div>
              <div className="af-shell-dock-demo__card">
                <span>底栏常驻入口</span>
                <strong>应用商城 (4) · 全局设置</strong>
                <small>右键任意应用磁贴可固定、置顶/置底或在独立透明子窗口打开</small>
              </div>
            </div>
          </AfSwap>
        </div>
      </div>
    </div>
  );
}

function P1DesktopToolsSpecimen() {
  return <AfDesktopTools />;
}

function P1EdgeNotificationSpecimen() {
  return (
    <div style={{ width: "100%", maxWidth: 748, height: 460 }}>
      <AfEdgeNotificationOverlay contained />
    </div>
  );
}

function P1InstallerWizardSpecimen() {
  const [stage, setStage] = useState<AfInstallerStage>("configure");
  return (
    <div style={{ ...DEMO_STAGE, maxWidth: 540 }}>
      <AfSegmented<AfInstallerStage>
        size="xs"
        value={stage}
        onChange={setStage}
        options={[
          { value: "welcome", label: "1. 欢迎许可" },
          { value: "configure", label: "2. 范围与空间" },
          { value: "installing", label: "3. 三阶写入" },
          { value: "complete", label: "4. 完成" },
          { value: "error", label: "异常拦截" },
        ]}
      />
      <AfViewportFitStage baseWidth={500} baseHeight={430} padding={4}>
        <AfInstallerWizard stage={stage} onStageChange={setStage} progress={68} />
      </AfViewportFitStage>
    </div>
  );
}

function P1RunningProcessesSpecimen() {
  return (
    <div style={{ ...DEMO_STAGE, maxWidth: 480 }}>
      <AfRunningProcessesDialog inline />
    </div>
  );
}

function P1SubwindowChromeSpecimen() {
  const [variant, setVariant] = useState<AfSubwindowVariant>("floating");
  const [pinned, setPinned] = useState(true);
  const [opacity, setOpacity] = useState(96);

  return (
    <div style={{ ...DEMO_STAGE, maxWidth: 440 }}>
      <AfSegmented<AfSubwindowVariant>
        size="xs"
        value={variant}
        onChange={setVariant}
        options={[
          { value: "floating", label: "独立悬浮窗" },
          { value: "popover", label: "锚定气泡窗" },
          { value: "overlay", label: "半透状态窗" },
        ]}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 220,
          padding: 20,
          borderRadius: "var(--af-r-panel)",
          background: "var(--af-canvas)",
          boxShadow: "inset 0 0 0 1px var(--af-line)",
        }}
      >
        <AfSubwindowChrome
          variant={variant}
          title="模型配额实时浮窗"
          subtitle="实时"
          pinned={pinned}
          onPinnedChange={setPinned}
          opacity={opacity}
          onOpacityChange={setOpacity}
        />
      </div>
    </div>
  );
}

function P1RecoveryLockSpecimen() {
  return (
    <div style={{ ...DEMO_STAGE, maxWidth: 620 }}>
      <AfRecoveryLockShell />
    </div>
  );
}

export const p1ShellSpecs: ComponentSpec[] = [
  {
    id: "app-dock",
    title: "应用侧栏导航",
    group: "定制组件",
    source: "project",
    note: "支持标准可折叠侧栏与紧凑纯图标模式、拖拽与快捷键调序、右键管理菜单以及商城与设置底栏入口。",
    render: P1AppDockSpecimen,
    width: 700,
    height: 450,
  },
  {
    id: "desktop-tools",
    title: "桌面快捷工具球",
    group: "定制组件",
    source: "project",
    note: "屏幕边缘贴靠悬浮球：悬停平滑探出快捷工具栏、松手自动贴边磁吸，并可展开二级工具面板。",
    render: P1DesktopToolsSpecimen,
    width: 760,
    height: 490,
  },
  {
    id: "edge-notification-overlay",
    title: "边缘消息通知中心",
    group: "定制组件",
    source: "project",
    note: "屏幕右侧贴边未读角标、单条悬停独立暂停倒计时的消息叠卡，以及可展开的历史通知抽屉。",
    render: P1EdgeNotificationSpecimen,
    width: 760,
    height: 480,
  },
  {
    id: "installer-wizard",
    title: "桌面离线安装向导",
    group: "定制组件",
    source: "project",
    note: "覆盖欢迎许可、安装范围与磁盘空间校验、分阶段安装进度、完成引导及异常重试的完整安装向导。",
    render: P1InstallerWizardSpecimen,
    width: 540,
    height: 490,
  },
  {
    id: "running-processes-dialog",
    title: "运行进程占用提示",
    group: "定制组件",
    source: "project",
    note: "安装或升级前自动检测占用文件的运行进程清单，支持查看进程号与内存占用并一键结束继续。",
    render: P1RunningProcessesSpecimen,
    width: 500,
    height: 320,
  },
  {
    id: "subwindow-chrome",
    title: "轻量透明子窗口",
    group: "定制组件",
    source: "project",
    note: "覆盖独立置顶悬浮窗（含透明度调节）、无标题栏锚定气泡窗与半透状态浮窗三种形态。",
    render: P1SubwindowChromeSpecimen,
    width: 480,
    height: 300,
  },
  {
    id: "recovery-lock-shell",
    title: "配置异常安全恢复台",
    group: "定制组件",
    source: "project",
    note: "配置文件损坏或版本迁移受阻时的锁定恢复界面：支持按历史备份快照回滚、导出脱敏诊断包与恢复出厂设置。",
    render: P1RecoveryLockSpecimen,
    width: 640,
    height: 500,
  },
];

void AfButton;
