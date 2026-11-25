import { useState } from "react";
import { AfIcon } from "../icons";
import {
  AfAppShellInset,
  AfThemePanel,
  AfTitleBar,
} from "../patterns/shell";
import { AfBadge, AfButton, AfSegmented, AfTag } from "../ui";
import type { ComponentSpec } from "../types";

function AppShellSpecimen() {
  return <AfAppShellInset />;
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

/** 窗口壳层与核心主题控件。 */
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
    id: "title-bar",
    title: "Title Bar",
    group: "基础控件",
    source: "project",
    note: "桌面无边框拖拽标题栏：36px 标准高度，支持 Windows 右侧三键与 macOS 左侧控制键双平台布局。",
    render: TitleBarSpecimen,
    width: 660,
    height: 280,
  },
  {
    id: "theme-panel",
    title: "Theme Panel",
    group: "基础控件",
    source: "project",
    note: "主题与密度设置面板：支持深浅外观模式、品牌强调色与自定义取色器、控件密度、圆角档位及预设保存。",
    render: ThemePanelSpecimen,
    width: 540,
    height: 540,
  },
];
