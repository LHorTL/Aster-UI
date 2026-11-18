import { useEffect, useRef, useState, type ReactNode } from "react";
import { renderAfIconSlot, type AfIconSlot } from "../../icons";
import { installedApps as defaultInstalledApps, runStateLabel, type RunState } from "../../model";
import { cn } from "../../primitives";
import { AfButton, AfSwitch, AfTag } from "../../ui";
import { CardHead, appIcons, useReducedMotion } from "../_shared/project";

/** 设置 App 列表条目。 */
export type AfProjectAppItem = {
  id: string;
  name: string;
  icon?: AfIconSlot;
  state: RunState;
  version: string;
  update?: string;
  autostart?: boolean;
};

/** 设置 App 列表组件属性。 */
export type AfProjectAppRowProps = {
  apps?: AfProjectAppItem[];
  title?: ReactNode;
  desc?: ReactNode;
  /** 可控自启动开关映射。 */
  autostartMap?: Record<string, boolean>;
  /** 切换自启动回调。 */
  onToggleAutostart?: (app: AfProjectAppItem, enabled: boolean) => void;
  /** 点击升级/查看详情回调。 */
  onAction?: (app: AfProjectAppItem) => void;
  className?: string;
};

const DEFAULT_APPS: AfProjectAppItem[] = defaultInstalledApps.slice(0, 5);

const APP_SUBTITLES: Record<string, string> = {
  overview: "内存占用 38 MB · 定时刷新看板指标卡片",
  docs: "本地索引已就绪 · 支持全文离线秒级检索",
  translate: "快捷键 Alt+Q · 划词与截图双模式翻译",
  monitor: "每 60s 检测服务连通性与响应耗时",
  tasks: "后台提醒同步服务已暂停，可手动重连",
};

const stateTone: Record<RunState, "success" | "accent" | "neutral" | "danger"> = {
  running: "success",
  background: "accent",
  stopped: "neutral",
  error: "danger",
};

/** 设置页「应用」列表：精致圆角图标磁贴、版本号芯片、一键更新与开机自启控制。 */
function ProjectAppRow({
  apps: appsProp,
  title = "已安装组件",
  desc = "管理本地扩展模块的运行状态、版本升级与自启偏好",
  autostartMap,
  onToggleAutostart,
  onAction,
  className,
}: AfProjectAppRowProps = {}) {
  const apps = appsProp ?? DEFAULT_APPS;
  const [innerAuto, setInnerAuto] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(apps.map((app) => [app.id, app.autostart ?? app.state === "running"])),
  );
  const [updatedVersions, setUpdatedVersions] = useState<Record<string, string>>({});
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [justUpdatedId, setJustUpdatedId] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);
  const reduced = useReducedMotion();

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const isEnabled = (app: AfProjectAppItem) =>
    autostartMap ? Boolean(autostartMap[app.id]) : Boolean(innerAuto[app.id] ?? app.autostart);

  const toggle = (app: AfProjectAppItem, next: boolean) => {
    if (!autostartMap) {
      setInnerAuto((prev) => ({ ...prev, [app.id]: next }));
    }
    onToggleAutostart?.(app, next);
  };

  const handleUpgrade = (app: AfProjectAppItem, targetVer: string) => {
    onAction?.(app);
    if (reduced) {
      setUpdatedVersions((prev) => ({ ...prev, [app.id]: targetVer }));
      return;
    }
    setUpgradingId(app.id);
    timersRef.current.push(
      window.setTimeout(() => {
        setUpgradingId((cur) => (cur === app.id ? null : cur));
        setUpdatedVersions((prev) => ({ ...prev, [app.id]: targetVer }));
        setJustUpdatedId(app.id);
        timersRef.current.push(
          window.setTimeout(() => {
            setJustUpdatedId((cur) => (cur === app.id ? null : cur));
          }, 650),
        );
      }, 320),
    );
  };

  const runningCount = apps.filter((a) => a.state === "running" || a.state === "background").length;

  return (
    <div className={cn("af-pj-apps", className)}>
      <CardHead
        title={title}
        desc={desc}
        extra={
          <span className="af-pj-pill-group">
            <AfTag tone="success" dot size="sm">
              {runningCount} 运行中
            </AfTag>
            <span className="af-pj-count">共 {apps.length} 项</span>
          </span>
        }
      />
      <div className="af-pj-apps__list" role="list" data-af-hover-list="wash">
        {apps.map((app) => {
          const enabled = isEnabled(app);
          const iconSlot = app.icon ?? appIcons[app.id] ?? "grid";
          const currentVer = updatedVersions[app.id] ?? app.version;
          const pendingUpdate = updatedVersions[app.id] ? undefined : app.update;
          return (
            <div key={app.id} className="af-pj-app" role="listitem" data-af-hover-item>
              <span className="af-pj-sqtile af-pj-sqtile--md" data-state={app.state} aria-hidden="true">
                {renderAfIconSlot(iconSlot, 16)}
                {app.state === "running" ? <span className="af-pj-sqtile__dot" /> : null}
              </span>
              <div className="af-pj-app__main">
                <div className="af-pj-app__name">
                  <span className="af-pj-app__label">{app.name}</span>
                  <code className="af-pj-codechip" data-just-updated={justUpdatedId === app.id ? "true" : undefined}>
                    v{currentVer}
                  </code>
                  <AfTag tone={stateTone[app.state]} dot size="sm">
                    {runStateLabel[app.state]}
                  </AfTag>
                </div>
                <div className="af-pj-app__meta">
                  <span>{APP_SUBTITLES[app.id] ?? `组件标识 ${app.id} · 本地沙箱运行`}</span>
                  {onAction ? (
                    <button type="button" className="af-pj-textbtn" onClick={() => onAction(app)}>
                      详情
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="af-pj-app__right">
                {pendingUpdate ? (
                  <AfButton
                    size="xs"
                    variant="secondary"
                    icon="refresh"
                    loading={upgradingId === app.id}
                    onClick={() => handleUpgrade(app, pendingUpdate)}
                  >
                    升级 v{pendingUpdate}
                  </AfButton>
                ) : null}
                <label className="af-pj-app__toggle">
                  <span>开机自启</span>
                  <AfSwitch
                    checked={enabled}
                    onChange={(checked) => toggle(app, checked)}
                    aria-label={`${app.name} 开机自启动`}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ProjectAppRow as AfProjectAppRow };
