import { useState } from "react";
import { AfIcon, renderAfIconSlot } from "../icons";
import {
  AfAppDock,
  AfAppShellInset,
  AfDesktopTools,
  AfInstallerWizard,
  AfThemePanel,
  AfTitleBar,
  type AfAppDockItem,
} from "../patterns/shell";
import { AfBadge, AfButton, AfSegmented, AfStatus, AfTag } from "../ui";
import { AfSwap } from "../ui-pro";
import type { ComponentSpec } from "../types";

function AppShellSpecimen() {
  return <AfAppShellInset />;
}

function AppDockSpecimen() {
  const [active, setActive] = useState<AfAppDockItem>({
    id: "overview",
    name: "概览看板",
    icon: "chart",
    group: "日常",
    running: true,
  });

  return (
    <div className="af-shell-dock-demo">
      <AfAppDock
        activeId={active.id}
        onSelect={setActive}
        onTogglePin={() => {}}
      />
      <div className="af-shell-dock-demo__stage">
        <div className="af-shell-dock-demo__top">
          <span className="af-shell-dock-demo__crumb">
            {renderAfIconSlot(active.icon, 14)}
            <strong>{active.name}</strong>
          </span>
          <AfStatus tone="success" pulse>
            模块运行正常
          </AfStatus>
        </div>
        <AfSwap swapKey={active.id}>
          <div className="af-shell-dock-demo__cards">
            <div className="af-shell-dock-demo__card">
              <span>当前选中模块</span>
              <strong>{active.id}</strong>
              <small>独立视图容器 · 切换延迟 0.4ms</small>
            </div>
            <div className="af-shell-dock-demo__card">
              <span>快捷键唤醒</span>
              <strong>Alt + 1~8</strong>
              <small>点击左侧折叠按钮可切换至 60px 图标窄轨</small>
            </div>
          </div>
        </AfSwap>
      </div>
    </div>
  );
}

function TitleBarSpecimen() {
  const [platform, setPlatform] = useState<"windows" | "mac">("windows");
  const [maximized, setMaximized] = useState(false);
  const [lastAction, setLastAction] = useState("等待窗口控制事件");

  return (
    <div className="af-titlebar-demo">
      <div className="af-titlebar-demo__toolbar">
        <span className="af-titlebar-demo__hint">桌面窗口标题栏预览</span>
        <AfSegmented
          size="sm"
          value={platform}
          onChange={(v) => setPlatform(v as "windows" | "mac")}
          options={[
            { value: "windows", label: "Windows 三键" },
            { value: "mac", label: "macOS 红绿灯" },
          ]}
        />
      </div>
      <div className="af-titlebar-demo__win">
        <AfTitleBar
          platform={platform}
          leading={
            <span className="af-titlebar-demo__lead">
              <AfIcon name="sparkle" size={13} />
              <AfBadge count="桌面版" tone="accent" />
            </span>
          }
          title="桌面工作台"
          center={<span className="af-titlebar-demo__center">默认工作区 · v1.2.0</span>}
          trailing={
            <AfButton size="xs" variant="ghost" icon="settings" onClick={() => setLastAction("打开偏好设置")}>
              偏好
            </AfButton>
          }
          maximized={maximized}
          onMinimize={() => setLastAction("触发最小化窗口")}
          onMaximize={() => {
            setMaximized((prev) => !prev);
            setLastAction(!maximized ? "切换至最大化" : "还原默认窗口尺寸");
          }}
          onClose={() => setLastAction("触发关闭确认")}
        />
        <div className="af-titlebar-demo__body">
          <div className="af-titlebar-demo__row">
            <span>拖拽区域策略</span>
            <code>-webkit-app-region: drag</code>
          </div>
          <div className="af-titlebar-demo__row">
            <span>交互控件豁免</span>
            <code>button / input → no-drag</code>
          </div>
          <div className="af-titlebar-demo__row">
            <span>最近窗口回调</span>
            <span key={lastAction} className="af-titlebar-demo__tag-anim">
              <AfTag tone="accent" size="sm">
                {lastAction}
              </AfTag>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePanelSpecimen() {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  return (
    <div className="af-theme-panel-card">
      <div className="af-theme-panel-card__head">
        <div>
          <h3 className="af-theme-panel-card__title">外观与主题引擎</h3>
          <p className="af-theme-panel-card__sub">实时切换深浅外观模式、品牌强调色、控件紧凑度与圆角档位</p>
        </div>
        <AfTag tone="accent" size="sm">
          实时生效
        </AfTag>
      </div>
      <AfThemePanel
        onSave={(payload) => setLastSaved(`${payload.name}（${payload.mode} / ${payload.density} / ${payload.radius}）`)}
      />
      {lastSaved ? <div className="af-theme-panel-card__saved">已保存预设：{lastSaved}</div> : null}
    </div>
  );
}

/** 外部框架与定制宿主组件。 */
export const shellSpecs: ComponentSpec[] = [
  {
    id: "app-shell",
    title: "App Shell Inset",
    group: "Screens",
    source: "pro",
    note: "affectUI Pro：三栏桌面工作台外壳（Inset），含左侧可折叠工作区导航、中央内嵌圆角主画布与右侧多标签检查器。",
    render: AppShellSpecimen,
    height: 672,
  },
  {
    id: "app-dock",
    title: "应用侧栏导航",
    group: "定制组件",
    source: "project",
    note: "桌面左侧应用导航栏：圆角应用磁贴、运行状态绿点、未读计数角标与一键窄栏折叠。",
    render: AppDockSpecimen,
    width: 680,
    height: 400,
  },
  {
    id: "desktop-tools",
    title: "桌面快捷工具球",
    group: "定制组件",
    source: "project",
    note: "桌面边缘悬浮工具面板：边缘磁吸悬浮球、可折叠快捷工具栏与滑出式二级工具抽屉。",
    render: AfDesktopTools,
    width: 760,
    height: 490,
  },
  {
    id: "installer-wizard",
    title: "桌面离线安装向导",
    group: "定制组件",
    source: "project",
    note: "桌面安装程序窗口：含窗口标题栏、安装阶段进度条、目录与空间检查以及可展开的安装详情日志。",
    render: AfInstallerWizard,
    width: 520,
    height: 430,
  },
  {
    id: "title-bar",
    title: "桌面窗口标题栏",
    group: "定制组件",
    source: "project",
    note: "桌面无边框拖拽标题栏：36px 标准高度，支持 Windows 右侧三键与 macOS 左侧控制键双平台布局。",
    render: TitleBarSpecimen,
    width: 660,
    height: 280,
  },
  {
    id: "theme-panel",
    title: "外观与主题面板",
    group: "定制组件",
    source: "project",
    note: "主题与密度设置面板：支持深浅外观模式、品牌强调色与自定义取色器、控件密度、圆角档位及预设保存。",
    render: ThemePanelSpecimen,
    width: 540,
    height: 540,
  },
];
