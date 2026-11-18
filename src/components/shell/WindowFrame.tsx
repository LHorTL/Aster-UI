import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAsterThemeOptional } from "../../theme";
import { AfAppDock, type AfAppDockItem } from "./AppDock";
import { AfAppSwitcher } from "./AppSwitcher";
import { AfWindowActions } from "./WindowActions";
import type { AfAppEntry, AfNotice } from "./types";

/** 外部窗口框架属性。 */
export type AfWindowFrameProps = {
  /** 是否深色；不传时继承外层主题（组件库预览用）。 */
  dark?: boolean;
  /** 左上角切换器。 */
  appSwitcher?: ReactNode;
  /** 顶栏左侧面包屑或标题插槽。 */
  breadcrumb?: ReactNode;
  /** 顶栏右侧扩展控件插槽（位于 `windowActions` 左侧）。 */
  headerExtra?: ReactNode;
  /** 右上角操作组。 */
  windowActions?: ReactNode;
  /** 侧栏内容。 */
  sidebar?: ReactNode;
  /** 侧栏是否展开（受控）。 */
  sidebarOpen?: boolean;
  /** 侧栏初始是否展开（非受控，默认 `true`）。 */
  defaultSidebarOpen?: boolean;
  /** 侧栏展开变化回调。 */
  onSidebarOpenChange?: (open: boolean) => void;
  /** 右侧可拖拽调宽检查器/预览面板插槽。 */
  rightPanel?: ReactNode;
  /** 右侧面板是否展开（受控）。 */
  rightOpen?: boolean;
  /** 右侧面板初始是否展开（非受控，传入 `rightPanel` 时默认 `true`）。 */
  defaultRightOpen?: boolean;
  /** 右侧面板展开变化回调。 */
  onRightOpenChange?: (open: boolean) => void;
  /** 右侧面板初始宽度（px，默认 `296`）。 */
  defaultRightWidth?: number;
  /** 右侧面板最小宽度（px，默认 `220`）。 */
  minRightWidth?: number;
  /** 右侧面板最大宽度（px，默认 `440`）。 */
  maxRightWidth?: number;
  /** 底部状态栏插槽。 */
  statusBar?: ReactNode;
  /** 主内容。 */
  children?: ReactNode;
  /** 额外类名。 */
  className?: string;
};

/** 外部窗口框架：左侧 App 切换器 + 可收起侧栏，中间圆角内嵌画布，可选右侧可拖拽预览栏。 */
export function AfWindowFrame({
  dark,
  appSwitcher,
  breadcrumb,
  headerExtra,
  windowActions,
  sidebar,
  sidebarOpen: sidebarOpenProp,
  defaultSidebarOpen = true,
  onSidebarOpenChange,
  rightPanel,
  rightOpen: rightOpenProp,
  defaultRightOpen = true,
  onRightOpenChange: _onRightOpenChange,
  defaultRightWidth = 296,
  minRightWidth = 220,
  maxRightWidth = 440,
  statusBar,
  children,
  className,
}: AfWindowFrameProps = {}) {
  const [innerSidebarOpen] = useState(defaultSidebarOpen);
  const [innerRightOpen] = useState(defaultRightOpen);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const isSidebarOpen = sidebarOpenProp ?? innerSidebarOpen;
  const isRightOpen = Boolean(rightPanel) && (rightOpenProp ?? innerRightOpen);

  useEffect(() => {
    if (sidebarOpenProp !== undefined) {
      onSidebarOpenChange?.(sidebarOpenProp);
    }
  }, [sidebarOpenProp, onSidebarOpenChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = drag.startX - event.clientX;
      const next = Math.min(maxRightWidth, Math.max(minRightWidth, Math.round(drag.startW + delta)));
      setRightWidth(next);
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, maxRightWidth, minRightWidth]);

  return (
    <div
      className={["af-window", "af-frame", dark === undefined ? undefined : "af", className].filter(Boolean).join(" ")}
      data-theme={dark === undefined ? undefined : dark ? "dark" : "light"}
      data-sidebar={isSidebarOpen ? undefined : "closed"}
      data-resizing={dragging ? "true" : undefined}
    >
      <div className="af-shell">
        <div className="af-shell__side">
          <div className="af-frame__side">
            {appSwitcher}
            {sidebar}
          </div>
        </div>
        <div className="af-maincol">
          <header className="af-winbar">
            {breadcrumb ? <div className="af-winbar__crumb">{breadcrumb}</div> : null}
            <span className="af-winbar__space" aria-hidden />
            {headerExtra ? <div className="af-winbar__extra">{headerExtra}</div> : null}
            {windowActions}
          </header>
          {isRightOpen ? (
            <div className="af-shell__body">
              <main className="af-panel af-panel--split">{children}</main>
              <div
                role="separator"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label="调整右侧预览栏宽度"
                aria-valuemin={minRightWidth}
                aria-valuemax={maxRightWidth}
                aria-valuenow={rightWidth}
                className="af-shell__splitter"
                data-dragging={dragging ? "true" : undefined}
                onPointerDown={(event) => {
                  event.preventDefault();
                  dragRef.current = { startX: event.clientX, startW: rightWidth };
                  setDragging(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    setRightWidth((w) => Math.min(maxRightWidth, w + 16));
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    setRightWidth((w) => Math.max(minRightWidth, w - 16));
                  }
                }}
              />
              <aside className="af-shell__inspector" style={{ width: rightWidth }} aria-label="右侧工具与文件预览">
                {rightPanel}
              </aside>
            </div>
          ) : (
            <main className="af-panel">{children}</main>
          )}
          {statusBar ? <footer className="af-winbar__status">{statusBar}</footer> : null}
        </div>
      </div>
    </div>
  );
}

/** 宿主工作台整壳属性（开箱即用组合 `AfWindowFrame` + `AfAppSwitcher` + `AfAppDock` + `AfWindowActions`）。 */
export type AfAppShellProps = {
  /** 是否深色主题，不传时跟随外层上下文。 */
  dark?: boolean;
  /** 切换深浅回调。 */
  onToggleDark?: () => void;
  /** 应用列表。 */
  apps?: AfAppEntry[];
  /** 当前选中的应用 id。 */
  activeAppId?: string;
  /** 切换应用回调。 */
  onAppChange?: (id: string) => void;
  /** 可选自定义侧边导航列表（传入时覆盖 `AfAppDock` 默认列表）。 */
  navItems?: AfAppDockItem[];
  /** 当前选中的侧栏导航项 id（省略时与 `activeAppId` 同步）。 */
  activeNavId?: string;
  /** 侧栏导航切换回调。 */
  onNavChange?: (id: string) => void;
  /** 侧栏是否展开（受控）。 */
  sidebarOpen?: boolean;
  /** 侧栏初始是否展开。 */
  defaultSidebarOpen?: boolean;
  /** 侧栏展开变化回调。 */
  onSidebarOpenChange?: (open: boolean) => void;
  /** 顶栏左侧面包屑或标题插槽。 */
  breadcrumb?: ReactNode;
  /** 顶栏右侧扩展插槽。 */
  headerExtra?: ReactNode;
  /** 右侧可拖拽调宽检查器/预览面板插槽。 */
  rightPanel?: ReactNode;
  /** 右侧面板是否展开（受控）。 */
  rightOpen?: boolean;
  /** 右侧面板初始是否展开。 */
  defaultRightOpen?: boolean;
  /** 右侧面板初始宽度（px）。 */
  defaultRightWidth?: number;
  /** 底部状态栏插槽。 */
  statusBar?: ReactNode;
  /** 通知列表。 */
  notices?: AfNotice[];
  /** 打开设置回调。 */
  onOpenSettings?: () => void;
  /** 自定义顶部应用切换器（不传则内置 `AfAppSwitcher`）。 */
  appSwitcher?: ReactNode;
  /** 自定义右上角窗口动作组（不传则内置 `AfWindowActions`）。 */
  windowActions?: ReactNode;
  /** 自定义侧栏内容（不传则内置 `AfAppDock`）。 */
  sidebar?: ReactNode;
  /** 主区域内容。 */
  children?: ReactNode;
  className?: string;
};

const DEFAULT_SHELL_APPS: AfAppEntry[] = [
  { id: "overview", name: "概览看板", icon: "chart" },
  { id: "docs", name: "文档中心", icon: "file" },
  { id: "translate", name: "即时翻译", icon: "translate" },
  { id: "monitor", name: "服务监控", icon: "server" },
];

/** 宿主工作台标准外壳：集成顶部切换器、侧栏 Dock、通知/主题控制条、圆角主画布与可选右侧检查器。 */
export function AfAppShell({
  dark: darkProp,
  onToggleDark,
  apps = DEFAULT_SHELL_APPS,
  activeAppId: activeAppIdProp,
  onAppChange,
  navItems,
  activeNavId,
  onNavChange,
  sidebarOpen,
  defaultSidebarOpen,
  onSidebarOpenChange,
  breadcrumb,
  headerExtra,
  rightPanel,
  rightOpen,
  defaultRightOpen,
  defaultRightWidth,
  statusBar,
  notices = [],
  onOpenSettings,
  appSwitcher,
  windowActions,
  sidebar,
  children,
  className,
}: AfAppShellProps = {}) {
  const [innerAppId, setInnerAppId] = useState(apps[0]?.id ?? "dashboard");
  const [innerNavId, setInnerNavId] = useState<string | undefined>(undefined);
  const [innerDark, setInnerDark] = useState<boolean | undefined>(undefined);

  const outerDark = useAsterThemeOptional()?.resolved === "dark";
  const activeAppId = activeAppIdProp ?? innerAppId;
  const resolvedNavId = activeNavId ?? innerNavId ?? activeAppId;
  const dark = darkProp ?? innerDark;
  const resolvedDark = dark ?? outerDark;

  const handleSelectApp = (id: string) => {
    if (activeAppIdProp === undefined) setInnerAppId(id);
    onAppChange?.(id);
  };

  const handleSelectNav = (id: string) => {
    if (activeNavId === undefined) setInnerNavId(id);
    if (onNavChange) onNavChange(id);
    else handleSelectApp(id);
  };

  return (
    <AfWindowFrame
      dark={dark}
      className={className}
      sidebarOpen={sidebarOpen}
      defaultSidebarOpen={defaultSidebarOpen}
      onSidebarOpenChange={onSidebarOpenChange}
      breadcrumb={breadcrumb}
      headerExtra={headerExtra}
      rightPanel={rightPanel}
      rightOpen={rightOpen}
      defaultRightOpen={defaultRightOpen}
      defaultRightWidth={defaultRightWidth}
      statusBar={statusBar}
      appSwitcher={appSwitcher ?? <AfAppSwitcher apps={apps} value={activeAppId} onChange={handleSelectApp} />}
      windowActions={
        windowActions ?? (
          <AfWindowActions
            dark={resolvedDark}
            onToggleDark={() => {
              if (onToggleDark) onToggleDark();
              else setInnerDark((prev) => !(prev ?? outerDark));
            }}
            notices={notices}
            onOpenSettings={onOpenSettings}
          />
        )
      }
      sidebar={
        sidebar ?? (
          <AfAppDock
            items={navItems}
            activeId={resolvedNavId}
            onSelect={(item) => handleSelectNav(item.id)}
          />
        )
      }
    >
      {children ?? (
        <div key={activeAppId} className="af-frame-content af-pj-panel-in">
          <span className="af-frame-content__kicker">工作台概览</span>
          <h2 className="af-frame-content__title">
            {apps.find((a) => a.id === activeAppId)?.name ?? "工作台总览"}
          </h2>
          <p style={{ margin: 0, color: "var(--af-muted)", fontSize: 13, lineHeight: "20px", maxWidth: 480 }}>
            从左侧导航栏或顶部切换器选择应用，快速切换当前工作空间。
          </p>
        </div>
      )}
    </AfWindowFrame>
  );
}
