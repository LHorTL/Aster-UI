import { type RefObject } from "react";
import { AfIcon, type AfIconSlot } from "../../icons";
import { cn, useAnimatedList, useControllableState } from "../../primitives";
import { AfAppMark, AfButton, AfProgress, AfTag } from "../../ui";
import { useTween } from "../../ui-pro";

/** 宿主内核 Shell 自更新信息。 */
export type AfShellCoreUpdate = {
  currentVersion: string;
  targetVersion: string;
  sizeLabel: string;
  highlights: string[];
  /** 下载进度 `0–100`；`100` 表示已就绪待重启。 */
  progress: number;
  readyToRestart?: boolean;
};

/** 可更新扩展插件条目。 */
export type AfPluginUpdateEntry = {
  id: string;
  name: string;
  icon: AfIconSlot;
  currentVersion: string;
  nextVersion: string;
  sizeLabel: string;
  changelog: string;
  updating?: boolean;
};

/** 宿主内核 + 插件双轨更新工作台属性。 */
export type AfStoreUpdatesWorkspaceProps = {
  /** 置顶宿主内核更新信息；传 `null` 表示当前内核已是最新。 */
  shellUpdate?: AfShellCoreUpdate | null;
  /** 可更新插件队列。 */
  items?: AfPluginUpdateEntry[];
  defaultItems?: AfPluginUpdateEntry[];
  onItemsChange?: (items: AfPluginUpdateEntry[]) => void;
  /** 点击“重启并更新宿主内核”回调。 */
  onRestartShell?: (shellUpdate: AfShellCoreUpdate) => void;
  /** 点击单个插件“更新”回调（非受控下自动触发平滑退场与 FLIP 补位）。 */
  onUpdateItem?: (item: AfPluginUpdateEntry) => void;
  /** 点击“全部更新”回调。 */
  onUpdateAll?: (items: AfPluginUpdateEntry[]) => void;
  className?: string;
};

const DEFAULT_SHELL_UPDATE: AfShellCoreUpdate = {
  currentVersion: "1.4.2",
  targetVersion: "1.5.0",
  sizeLabel: "34.2 MB 增量包",
  highlights: [
    "优化多显示器高分屏切换自适应与悬浮工具唤醒响应",
    "升级全局外观主题与快捷键配置跨窗口实时同步",
  ],
  progress: 100,
  readyToRestart: true,
};

const DEFAULT_PLUGIN_UPDATES: AfPluginUpdateEntry[] = [
  {
    id: "up-translate",
    name: "多模态截图互译台",
    icon: "translate",
    currentVersion: "2.3.1",
    nextVersion: "2.4.0",
    sizeLabel: "8.4 MB",
    changelog: "新增左右双视口同步缩放与卷帘擦除对比模式",
  },
  {
    id: "up-proxy",
    name: "进程规则分流器",
    icon: "proxy",
    currentVersion: "1.1.0",
    nextVersion: "1.2.0",
    sizeLabel: "4.1 MB",
    changelog: "新增顶部域名与进程规则匹配测试与批量启停",
  },
  {
    id: "up-video",
    name: "非线性多轨剪辑台",
    icon: "play",
    currentVersion: "0.9.4",
    nextVersion: "1.0.0",
    sizeLabel: "16.8 MB",
    changelog: "支持轨道片段边缘精准修剪与播放头磁吸对齐",
  },
];

/**
 * 客户端内置商城双轨更新台（置顶宿主内核自更新主卡片 + 下方 `useAnimatedList` 受控退场插件更新队列）。
 */
export function AfStoreUpdatesWorkspace({
  shellUpdate = DEFAULT_SHELL_UPDATE,
  items: itemsProp,
  defaultItems = DEFAULT_PLUGIN_UPDATES,
  onItemsChange,
  onRestartShell,
  onUpdateItem,
  onUpdateAll,
  className,
}: AfStoreUpdatesWorkspaceProps = {}) {
  const [pluginItems, setPluginItems] = useControllableState<AfPluginUpdateEntry[]>({
    value: itemsProp,
    defaultValue: defaultItems,
    onChange: onItemsChange,
  });

  const animated = useAnimatedList<AfPluginUpdateEntry>({
    items: pluginItems,
    getKey: (it) => it.id,
    exitDuration: 190,
    flipDuration: 260,
    onRemove: (_key, item) => {
      setPluginItems(pluginItems.filter((p) => p.id !== item.id));
      onUpdateItem?.(item);
    },
  });

  const handleUpdateSingle = (item: AfPluginUpdateEntry) => {
    if (itemsProp !== undefined) {
      onItemsChange?.(pluginItems.filter((p) => p.id !== item.id));
      onUpdateItem?.(item);
      return;
    }
    animated.requestRemove(item.id);
  };

  const handleUpdateAll = () => {
    const snapshot = [...pluginItems];
    onUpdateAll?.(snapshot);
    if (itemsProp !== undefined) {
      onItemsChange?.([]);
      return;
    }
    animated.requestClear(() => setPluginItems([]));
  };

  const shellProgress = Math.round(useTween(shellUpdate?.progress ?? 100, 320));

  return (
    <div className={cn("af-store-updates", className)}>
      {/* 置顶客户端核心自更新主卡片 */}
      {shellUpdate ? (
        <section className="af-store-updates__shell-card" aria-label="客户端核心更新">
          <div className="af-store-updates__shell-top">
            <div className="af-store-updates__shell-brand">
              <AfAppMark size={36} icon="sparkle" tone="accent" name="核心" />
              <div>
                <div className="af-store-updates__shell-title">
                  <strong>客户端核心更新就绪</strong>
                  <AfTag tone="accent" size="sm">
                    v{shellUpdate.currentVersion} → v{shellUpdate.targetVersion}
                  </AfTag>
                </div>
                <span className="af-store-updates__shell-meta">
                  {shellUpdate.sizeLabel} · 数字签名已通过本地校验
                </span>
              </div>
            </div>

            <AfButton
              size="md"
              variant="primary"
              icon="bolt"
              disabled={!shellUpdate.readyToRestart && shellUpdate.progress < 100}
              onClick={() => onRestartShell?.(shellUpdate)}
            >
              {shellUpdate.readyToRestart || shellUpdate.progress >= 100
                ? "立即重启并更新"
                : `下载中 ${shellProgress}%`}
            </AfButton>
          </div>

          {!shellUpdate.readyToRestart && shellUpdate.progress < 100 ? (
            <AfProgress value={shellProgress} tone="accent" size="sm" label="客户端更新包下载进度" />
          ) : null}

          <ul className="af-store-updates__highlights">
            {shellUpdate.highlights.map((line, i) => (
              <li key={i}>
                <AfIcon name="check" size={12} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 下方扩展插件更新队列 */}
      <section className="af-store-updates__plugins" aria-label="扩展应用更新队列">
        <div className="af-store-updates__head">
          <div>
            <h4>可更新扩展应用</h4>
            <span>共 {pluginItems.length} 个扩展可升级</span>
          </div>
          {pluginItems.length > 0 ? (
            <AfButton size="sm" variant="primary" icon="refresh" onClick={handleUpdateAll}>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                全部更新 ({pluginItems.length})
              </span>
            </AfButton>
          ) : null}
        </div>

        {animated.entries.length === 0 ? (
          <div className="af-store-updates__empty af-pj-panel-in">
            <AfIcon name="checkCircle" size={18} />
            <strong>所有已安装应用均已是最新版本</strong>
            <span>系统将在后台定期同步远程版本目录</span>
          </div>
        ) : (
          <div
            ref={animated.listRef as RefObject<HTMLDivElement>}
            className="af-store-updates__list"
            data-af-hover-list="wash"
          >
            {animated.entries.map(({ item, key, leaving }) => (
              <div
                key={key}
                className="af-store-updates__row"
                data-af-hover-item
                data-flip={key}
                data-leaving={leaving ? "true" : undefined}
              >
                <AfAppMark size={36} icon={item.icon} name={item.name} tone="info" />
                <div className="af-store-updates__row-main">
                  <div className="af-store-updates__row-top">
                    <strong>{item.name}</strong>
                    <code className="af-pj-codechip">
                      v{item.currentVersion} → v{item.nextVersion}
                    </code>
                    <span className="af-store-updates__size">{item.sizeLabel}</span>
                  </div>
                  <p className="af-store-updates__notes">{item.changelog}</p>
                </div>
                <AfButton
                  size="xs"
                  variant="secondary"
                  loading={item.updating}
                  onClick={() => handleUpdateSingle(item)}
                >
                  更新
                </AfButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
