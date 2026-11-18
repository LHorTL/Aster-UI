import { useState, type ReactNode } from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn } from "../../primitives";
import { AfButton, AfScrollArea, AfSegmented, AfSelect, AfSwitch, AfTag } from "../../ui";

/** 设置项右侧或整行控制定义。 */
export type AfSettingRowProps = {
  /** 设置项标题。 */
  title: ReactNode;
  /** 设置项说明。 */
  description?: ReactNode;
  /** 右侧控件（如 AfSwitch、AfSelect、AfButton 等）。 */
  control?: ReactNode;
  /** 点击行回调（可选，无内置 control 时整行可交互）。 */
  onClick?: () => void;
  /** 附加状态标识。 */
  badge?: ReactNode;
  className?: string;
};

/** 单个设置行：严格对齐 Clean 设置面板行规范，左文案右控件，发丝线分隔。 */
export function AfSettingRow({ title, description, control, onClick, badge, className }: AfSettingRowProps) {
  return (
    <div
      className={cn("af-pj-setting-row", onClick && "af-pj-setting-row--clickable", className)}
      data-af-hover-item
      onClick={onClick}
    >
      <div className="af-pj-setting-row__main">
        <div className="af-pj-setting-row__title">
          <span>{title}</span>
          {badge}
        </div>
        {description ? <p className="af-pj-setting-row__desc">{description}</p> : null}
      </div>
      {control ? <div className="af-pj-setting-row__ctrl">{control}</div> : null}
    </div>
  );
}

/** 设置分组区块属性。 */
export type AfSettingSectionProps = {
  /** 分组标题。 */
  title: ReactNode;
  /** 分组说明。 */
  description?: ReactNode;
  /** 区块右上角附加操作。 */
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** 设置分组区块：白底发丝线卡片分组。 */
export function AfSettingSection({ title, description, extra, children, className }: AfSettingSectionProps) {
  return (
    <section className={cn("af-pj-setting-section", className)}>
      <header className="af-pj-setting-section__head">
        <div className="af-pj-setting-section__titles">
          <h3 className="af-pj-setting-section__title">{title}</h3>
          {description ? <p className="af-pj-setting-section__desc">{description}</p> : null}
        </div>
        {extra ? <div className="af-pj-setting-section__extra">{extra}</div> : null}
      </header>
      <div className="af-pj-setting-section__card" data-af-hover-list="wash">
        {children}
      </div>
    </section>
  );
}

/** 设置页顶部与内容包裹。 */
export type AfSettingsPageProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** 设置子页面正文框架。 */
export function AfSettingsPage({ title, subtitle, actions, children, className }: AfSettingsPageProps) {
  return (
    <div className={cn("af-pj-settings-page", className)}>
      <header className="af-pj-settings-page__head">
        <div>
          <h2 className="af-pj-settings-page__title">{title}</h2>
          {subtitle ? <p className="af-pj-settings-page__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="af-pj-settings-page__actions">{actions}</div> : null}
      </header>
      <div className="af-pj-settings-page__body">{children}</div>
    </div>
  );
}

/** 设置导航项。 */
export type AfSettingsNavItem = {
  id: string;
  label: string;
  icon: AfIconSlot;
  group?: string;
  badge?: string | number;
};

/** 完整设置页布局属性。 */
export type AfSettingsLayoutProps = {
  /** 左侧设置导航项。 */
  items?: AfSettingsNavItem[];
  /** 受控选中项 id。 */
  activeId?: string;
  /** 默认选中项 id。 */
  defaultActiveId?: string;
  /** 导航切换回调。 */
  onChange?: (id: string) => void;
  /** 侧栏标题。 */
  sidebarTitle?: ReactNode;
  /** 自定义渲染当前页正文（未传时根据默认演示项自动渲染）。 */
  renderContent?: (activeId: string) => ReactNode;
  className?: string;
};

const DEFAULT_NAV_ITEMS: AfSettingsNavItem[] = [
  { id: "general", label: "常规与启动", icon: "settings", group: "偏好" },
  { id: "appearance", label: "主题与外观", icon: "palette", group: "偏好" },
  { id: "notifications", label: "通知管理", icon: "bell", group: "偏好", badge: 3 },
  { id: "apps", label: "已安装应用", icon: "grid", group: "工作台" },
  { id: "data", label: "数据与存储", icon: "database", group: "工作台" },
];

/** 宿主设置双栏布局：左侧分类导航轨 + 右侧 SettingsPage + SettingSection/Row。 */
export function AfSettingsLayout({
  items = DEFAULT_NAV_ITEMS,
  activeId: activeIdProp,
  defaultActiveId = items[0]?.id ?? "general",
  onChange,
  sidebarTitle = "系统设置",
  renderContent,
  className,
}: AfSettingsLayoutProps = {}) {
  const [innerId, setInnerId] = useState(defaultActiveId);
  const [autoLaunch, setAutoLaunch] = useState(true);
  const [silentStart, setSilentStart] = useState(false);
  const [hardwareAccel, setHardwareAccel] = useState(true);
  const [updateChannel, setUpdateChannel] = useState("stable");
  const [densityMode, setDensityMode] = useState("comfortable");
  const [quotaAlert, setQuotaAlert] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const activeId = activeIdProp ?? innerId;
  const selectTab = (id: string) => {
    if (activeIdProp === undefined) setInnerId(id);
    onChange?.(id);
  };

  const groups = Array.from(new Set(items.map((item) => item.group ?? "")));
  const currentLabel = items.find((i) => i.id === activeId)?.label ?? "常规与启动";

  const renderBuiltInTab = () => {
    if (activeId === "appearance") {
      return (
        <AfSettingsPage title={currentLabel} subtitle="自定义桌面外壳明暗外观、控件紧凑度与侧栏透明效果。">
          <AfSettingSection title="界面密度与布局">
            <AfSettingRow
              title="默认控件高度"
              description="紧凑档适合高分辨率多栏并排检视。"
              control={
                <AfSegmented
                  size="sm"
                  value={densityMode}
                  onChange={(v) => setDensityMode(String(v))}
                  options={[
                    { value: "comfortable", label: "标准 32px" },
                    { value: "compact", label: "紧凑 28px" },
                  ]}
                />
              }
            />
            <AfSettingRow
              title="启用 GPU 硬件合成"
              description="加速图表重绘与浮层过渡动画，重启客户端后生效。"
              control={<AfSwitch checked={hardwareAccel} onChange={setHardwareAccel} aria-label="启用 GPU 硬件合成" />}
            />
          </AfSettingSection>
        </AfSettingsPage>
      );
    }
    if (activeId === "notifications") {
      return (
        <AfSettingsPage title={currentLabel} subtitle="控制用量阈值提醒、任务完成横幅与免打扰时段。">
          <AfSettingSection title="提醒规则">
            <AfSettingRow
              title="配额阈值自动提醒"
              description="当月度资源使用率超过 80% 时推送非阻塞提醒。"
              badge={<AfTag tone="accent" size="sm">推荐</AfTag>}
              control={<AfSwitch checked={quotaAlert} onChange={setQuotaAlert} aria-label="配额阈值自动提醒" />}
            />
            <AfSettingRow
              title="通知提示音效"
              description="后台任务完成或异常中断时播放轻柔提示音。"
              control={<AfSwitch checked={soundEnabled} onChange={setSoundEnabled} aria-label="通知提示音效" />}
            />
          </AfSettingSection>
        </AfSettingsPage>
      );
    }
    if (activeId === "apps" || activeId === "data") {
      return (
        <AfSettingsPage
          title={currentLabel}
          subtitle={activeId === "apps" ? "管理扩展访问权限、后台保活与自动增量升级。" : "管理本地会话库路径、备份快照与缓存释放。"}
          actions={
            <AfButton size="xs" variant="secondary" icon="folderOpen">
              打开目录
            </AfButton>
          }
        >
          <AfSettingSection title={activeId === "apps" ? "运行策略" : "本地存储"}>
            <AfSettingRow
              title={activeId === "apps" ? "闲置应用自动休眠" : "每日自动归档快照"}
              description={activeId === "apps" ? "后台闲置满 30 分钟自动释放运行内存。" : "保留最近 14 天的配置与额度统计快照。"}
              control={<AfSwitch checked={autoLaunch} onChange={setAutoLaunch} aria-label={currentLabel} />}
            />
          </AfSettingSection>
        </AfSettingsPage>
      );
    }

    return (
      <AfSettingsPage
        title={currentLabel}
        subtitle="配置桌面窗口行为、后台托盘常驻与扩展自动更新策略。"
      >
        <AfSettingSection title="启动与窗口行为">
          <AfSettingRow
            title="登录系统时自动启动"
            description="开机后自动在后台初始化本地服务与扩展。"
            control={<AfSwitch checked={autoLaunch} onChange={setAutoLaunch} aria-label="登录系统时自动启动" />}
          />
          <AfSettingRow
            title="静默驻留到系统托盘"
            description="启动时不主动弹出主窗口，随时通过快捷键或托盘唤醒。"
            control={<AfSwitch checked={silentStart} onChange={setSilentStart} aria-label="静默驻留到系统托盘" />}
          />
        </AfSettingSection>
        <AfSettingSection title="版本更新与硬件">
          <AfSettingRow
            title="扩展更新通道"
            description="稳定版经过完整签名与兼容校验。"
            control={
              <AfSelect
                size="sm"
                value={updateChannel}
                onChange={(v) => setUpdateChannel(String(v))}
                options={[
                  { value: "stable", label: "稳定版" },
                  { value: "beta", label: "预览版" },
                ]}
                style={{ width: 144 }}
              />
            }
          />
          <AfSettingRow
            title="启用 GPU 硬件加速"
            description="使用硬件合成图表、动效与高频数据流。"
            control={<AfSwitch checked={hardwareAccel} onChange={setHardwareAccel} aria-label="启用 GPU 硬件加速" />}
          />
        </AfSettingSection>
      </AfSettingsPage>
    );
  };

  return (
    <div className={cn("af-pj-settings", className)}>
      <aside className="af-pj-settings__nav" aria-label="设置分类">
        {sidebarTitle ? (
          <div className="af-pj-settings__nav-title">
            <AfIcon name="sliders" size={14} />
            <span>{sidebarTitle}</span>
          </div>
        ) : null}
        {groups.map((group) => (
          <div className="af-pj-settings__nav-group" key={group || "default"} data-af-hover-list="hover">
            {group ? <div className="af-pj-settings__nav-label">{group}</div> : null}
            {items
              .filter((item) => (item.group ?? "") === group)
              .map((item) => {
                const current = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="af-pj-settings__nav-item"
                    aria-current={current ? "page" : undefined}
                    data-active={current || undefined}
                    onClick={() => selectTab(item.id)}
                  >
                    {renderAfIconSlot(item.icon, 14)}
                    <span>{item.label}</span>
                    {item.badge !== undefined ? <em className="af-pj-settings__badge">{item.badge}</em> : null}
                  </button>
                );
              })}
          </div>
        ))}
      </aside>
      <div className="af-pj-settings__frame">
        <AfScrollArea className="af-pj-settings__main">
          <div key={activeId} className="af-pj-settings__content">
            {renderContent ? renderContent(activeId) : renderBuiltInTab()}
          </div>
        </AfScrollArea>
      </div>
    </div>
  );
}
