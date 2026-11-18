import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { AfIcon, type AfIconSlot } from "../../icons";
import {
  cn,
  useAnimatedList,
  useControllableState,
  useExitTransition,
  useHitAreaCollector,
  useHoverIsolatedTimers,
  useTwoPhaseWindowTransition,
  type AfHitRect,
} from "../../primitives";
import { AfAppMark, AfButton, AfSegmented, AfSwitch, AfTag } from "../../ui";

/** 边缘通知分类语气。 */
export type AfEdgeNotificationTone = "accent" | "ok" | "warn" | "err" | "info" | "purple" | "neutral";

/** 单条边缘通知动作项。 */
export type AfEdgeNotificationAction = {
  key: string;
  label: string;
  primary?: boolean;
};

/** 桌面边缘通知数据模型。 */
export type AfEdgeNotificationItem = {
  id: string;
  appName: string;
  appIcon?: AfIconSlot;
  tone?: AfEdgeNotificationTone;
  title: string;
  description?: string;
  timestamp: string;
  unread?: boolean;
  category?: "system" | "app";
  /** 单卡自定义倒计时毫秒数（默认继承 `autoDismissMs`，传 `0` 常驻）。 */
  durationMs?: number;
  actions?: AfEdgeNotificationAction[];
};

export type AfEdgeNotificationFilter = "all" | "unread" | "system";

/** 系统边缘通知透明窗宿主组件属性。 */
export type AfEdgeNotificationOverlayProps = {
  /** 当前实时悬浮弹出的活跃通知栈。 */
  activeItems?: AfEdgeNotificationItem[];
  defaultActiveItems?: AfEdgeNotificationItem[];
  onActiveItemsChange?: (items: AfEdgeNotificationItem[]) => void;
  /** 历史归档通知记录（展示在 `400px` 抽屉内）。 */
  historyItems?: AfEdgeNotificationItem[];
  defaultHistoryItems?: AfEdgeNotificationItem[];
  onHistoryItemsChange?: (items: AfEdgeNotificationItem[]) => void;
  /** 400px 历史抽屉展开状态（受控）。 */
  drawerOpen?: boolean;
  defaultDrawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  /** 单卡默认倒计时时长（ms），默认 `3000`。 */
  autoDismissMs?: number;
  /** 是否暂停全部卡片自动倒计时（如调试或全局冻结），默认 `false`。 */
  pauseTimers?: boolean;
  /** 勿扰静音模式。 */
  dnd?: boolean;
  defaultDnd?: boolean;
  onDndChange?: (dnd: boolean) => void;
  /** 两阶段扩窗钩子：历史抽屉展开前请求宿主放大透明窗。 */
  onExpandWindow?: () => void | Promise<void>;
  /** 两阶段缩窗钩子：历史抽屉退场动画完成后请求宿主缩小透明窗。 */
  onShrinkWindow?: () => void | Promise<void>;
  /** 透明窗可交互热区矩形实时上报。 */
  onHitAreasChange?: (rects: AfHitRect[]) => void;
  /** 单卡动作点击回调。 */
  onAction?: (item: AfEdgeNotificationItem, actionKey: string) => void;
  /** 单卡忽略或倒计时到期关闭回调。 */
  onDismiss?: (item: AfEdgeNotificationItem, reason: "manual" | "timeout") => void;
  /** 是否在固定尺寸局部舞台容器内渲染（默认 `true`，避免锁定全屏视口；桌面透明窗传 `false`）。 */
  contained?: boolean;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_ACTIVE_NOTICES: AfEdgeNotificationItem[] = [
  {
    id: "edge-n1",
    appName: "构建流水线",
    appIcon: "bolt",
    tone: "ok",
    title: "v2.4.0 桌面安装包签名完成",
    description: "Windows x64 / macOS arm64 双架构产物已通过 SHA-256 完整性校验。",
    timestamp: "刚刚",
    unread: true,
    category: "system",
    actions: [
      { key: "open-release", label: "查看产物", primary: true },
      { key: "copy-hash", label: "复制校验值" },
    ],
  },
  {
    id: "edge-n2",
    appName: "即时互译",
    appIcon: "translate",
    tone: "accent",
    title: "截屏识别译文已写入剪贴板",
    description: "已识别 4 段双语文本，可直接粘贴或打开校对。",
    timestamp: "12 秒前",
    unread: true,
    category: "app",
  },
];

const DEFAULT_HISTORY_NOTICES: AfEdgeNotificationItem[] = [
  ...DEFAULT_ACTIVE_NOTICES,
  {
    id: "edge-h3",
    appName: "配额监控",
    appIcon: "chart",
    tone: "warn",
    title: "模型 API 今日预算已使用 80%",
    description: "当前主工作区剩余额度 20.0%，预计 18:40 周期重置。",
    timestamp: "14:18",
    unread: true,
    category: "system",
  },
  {
    id: "edge-h4",
    appName: "应用商城",
    appIcon: "grid",
    tone: "info",
    title: "3 款已安装扩展发布了新版本",
    description: "包含规则代理、文档工作台与多媒体剪辑器性能优化。",
    timestamp: "11:05",
    unread: false,
    category: "app",
  },
];

/**
 * 系统右边缘透明穿透通知宿主（`44×48` 贴边徽章 + 单卡独立悬停暂停 3s 倒计时叠卡栈 + `400px` 两阶段扩缩历史抽屉）。
 */
export function AfEdgeNotificationOverlay({
  activeItems: activeProp,
  defaultActiveItems = DEFAULT_ACTIVE_NOTICES,
  onActiveItemsChange,
  historyItems: historyProp,
  defaultHistoryItems = DEFAULT_HISTORY_NOTICES,
  onHistoryItemsChange,
  drawerOpen: drawerOpenProp,
  defaultDrawerOpen = false,
  onDrawerOpenChange,
  autoDismissMs = 3000,
  pauseTimers = false,
  dnd: dndProp,
  defaultDnd = false,
  onDndChange,
  onExpandWindow,
  onShrinkWindow,
  onHitAreasChange,
  onAction,
  onDismiss,
  contained = true,
  className,
  style,
}: AfEdgeNotificationOverlayProps = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);

  const [activeItems, setActiveItems] = useControllableState<AfEdgeNotificationItem[]>({
    value: activeProp,
    defaultValue: defaultActiveItems,
    onChange: onActiveItemsChange,
  });

  const [historyItems, setHistoryItems] = useControllableState<AfEdgeNotificationItem[]>({
    value: historyProp,
    defaultValue: defaultHistoryItems,
    onChange: onHistoryItemsChange,
  });

  const [drawerOpen, setDrawerOpen] = useControllableState<boolean>({
    value: drawerOpenProp,
    defaultValue: defaultDrawerOpen,
    onChange: onDrawerOpenChange,
  });

  const [dnd, setDnd] = useControllableState<boolean>({
    value: dndProp,
    defaultValue: defaultDnd,
    onChange: onDndChange,
  });

  const [filter, setFilter] = useState<AfEdgeNotificationFilter>("all");

  const removeActiveCard = useCallback(
    (id: string, reason: "manual" | "timeout") => {
      let dismissedItem: AfEdgeNotificationItem | undefined;
      setActiveItems((prev) => {
        dismissedItem = prev.find((n) => n.id === id);
        return prev.filter((n) => n.id !== id);
      });
      if (dismissedItem) {
        onDismiss?.(dismissedItem, reason);
      }
    },
    [setActiveItems, onDismiss],
  );

  const isolatedTimers = useHoverIsolatedTimers<AfEdgeNotificationItem>({
    items: dnd ? [] : activeItems,
    getKey: (item) => item.id,
    defaultDuration: autoDismissMs,
    getDuration: (item) => item.durationMs,
    pausedAll: pauseTimers || drawerOpen,
    onExpire: (key) => removeActiveCard(key, "timeout"),
  });

  const animatedStack = useAnimatedList<AfEdgeNotificationItem>({
    items: dnd ? [] : activeItems,
    getKey: (item) => item.id,
    containerRef: stackRef,
    exitDuration: 190,
    flipDuration: 260,
  });

  const twoPhase = useTwoPhaseWindowTransition({
    expanded: drawerOpen,
    expandWindow: onExpandWindow,
    shrinkWindow: onShrinkWindow,
    duration: 200,
  });

  useHitAreaCollector({
    rootRef,
    includePortals: true,
    enabled: Boolean(onHitAreasChange),
    onAreasChange: onHitAreasChange,
  });

  const unreadCount = useMemo(
    () => historyItems.filter((item) => item.unread).length,
    [historyItems],
  );

  const filteredHistory = useMemo(() => {
    if (filter === "unread") return historyItems.filter((i) => i.unread);
    if (filter === "system") return historyItems.filter((i) => i.category === "system");
    return historyItems;
  }, [historyItems, filter]);

  const historyListRef = useRef<HTMLDivElement | null>(null);
  const animatedHistory = useAnimatedList<AfEdgeNotificationItem>({
    items: filteredHistory,
    getKey: (item) => item.id,
    containerRef: historyListRef,
    exitDuration: 180,
    flipDuration: 260,
  });

  const stackVisible = !drawerOpen && animatedStack.entries.length > 0;
  const stackTransition = useExitTransition(stackVisible, 150);

  const handleMarkAllRead = () => {
    setHistoryItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
  };

  const handleRemoveHistoryItem = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "af-edge-notify",
        contained ? "af-edge-notify--contained" : "af-edge-notify--viewport",
        className,
      )}
      style={style}
      data-drawer-phase={twoPhase.phase}
      data-dnd={dnd ? "true" : undefined}
    >
      {contained ? (
        <div className="af-edge-notify__stage-hint">
          <span>桌面实时通知 · 悬停卡片可暂停自动收起</span>
          {activeProp === undefined && activeItems.length === 0 && !drawerOpen ? (
            <button
              type="button"
              className="af-edge-notify__replay-btn"
              data-af-hit-area
              onClick={() => setActiveItems(defaultActiveItems)}
            >
              重播新通知
            </button>
          ) : null}
        </div>
      ) : null}

      {/* 右缘贴边 44×48 未读胶囊徽章 */}
      <button
        type="button"
        className="af-edge-notify__badge"
        data-af-hit-area
        data-active={drawerOpen ? "true" : undefined}
        aria-label={`通知中心，${unreadCount} 条未读`}
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        <span className="af-edge-notify__badge-icon" aria-hidden="true">
          <AfIcon name="bell" size={16} />
          {dnd ? <span className="af-edge-notify__dnd-dot" /> : null}
        </span>
        <span className="af-edge-notify__badge-count">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </button>

      {/* 活跃通知悬浮叠卡栈（单卡独立悬停暂停计时） */}
      {stackTransition.mounted && animatedStack.entries.length > 0 ? (
        <div
          ref={stackRef}
          className="af-edge-notify__stack"
          data-closing={stackTransition.closing ? "true" : undefined}
          role="region"
          aria-label="实时系统通知栈"
        >
          {animatedStack.entries.map(({ item, key, leaving }) => {
            const ratio = isolatedTimers.getRatio(key);
            const paused = isolatedTimers.isPaused(key);
            const hoverProps = isolatedTimers.getCardHoverProps(key);
            return (
              <div
                key={key}
                className="af-edge-notify__card"
                data-af-hit-area
                data-flip={key}
                data-notice-id={key}
                data-leaving={leaving ? "true" : undefined}
                data-paused={paused ? "true" : undefined}
                onPointerEnter={hoverProps.onPointerEnter}
                onPointerLeave={hoverProps.onPointerLeave}
              >
                <div className="af-edge-notify__card-head">
                  <AfAppMark
                    size={20}
                    icon={item.appIcon ?? "bell"}
                    name={item.appName}
                    tone={item.tone ?? "accent"}
                  />
                  <span className="af-edge-notify__app">{item.appName}</span>
                  {paused ? (
                    <span className="af-edge-notify__paused-pill">已暂停</span>
                  ) : null}
                  <span className="af-edge-notify__time">{item.timestamp}</span>
                  <button
                    type="button"
                    className="af-edge-notify__close"
                    aria-label={`忽略通知：${item.title}`}
                    onClick={() => removeActiveCard(item.id, "manual")}
                  >
                    <AfIcon name="x" size={12} />
                  </button>
                </div>

                <div className="af-edge-notify__card-body">
                  <div className="af-edge-notify__title">{item.title}</div>
                  {item.description ? (
                    <p className="af-edge-notify__desc">{item.description}</p>
                  ) : null}
                  {item.actions && item.actions.length > 0 ? (
                    <div className="af-edge-notify__actions">
                      {item.actions.map((act) => (
                        <AfButton
                          key={act.key}
                          size="xs"
                          variant={act.primary ? "primary" : "secondary"}
                          onClick={() => onAction?.(item, act.key)}
                        >
                          {act.label}
                        </AfButton>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="af-edge-notify__timer-track" aria-hidden="true">
                  <div
                    className="af-edge-notify__timer-bar"
                    style={{ width: `${Math.round(ratio * 1000) / 10}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 两阶段扩缩 400px 历史通知中心抽屉 */}
      {twoPhase.panelMounted ? (
        <aside
          className="af-edge-notify__drawer"
          data-af-hit-area
          data-open={twoPhase.panelOpen ? "true" : undefined}
          data-closing={twoPhase.closing ? "true" : undefined}
          role="dialog"
          tabIndex={-1}
          aria-label="通知历史中心"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setDrawerOpen(false);
            }
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget) {
              twoPhase.notifyTransitionEnd();
            }
          }}
        >
          <div className="af-edge-notify__drawer-head">
            <div className="af-edge-notify__drawer-title">
              <strong>通知历史中心</strong>
              {unreadCount > 0 ? (
                <AfTag tone="accent" size="sm">
                  {unreadCount} 未读
                </AfTag>
              ) : null}
            </div>
            <div className="af-edge-notify__drawer-ops">
              <label className="af-edge-notify__dnd-toggle">
                <span>勿扰</span>
                <AfSwitch size="sm" checked={dnd} onChange={setDnd} aria-label="勿扰模式" />
              </label>
              <AfButton
                size="xs"
                variant="ghost"
                icon="x"
                aria-label="收起通知历史"
                onClick={() => setDrawerOpen(false)}
              />
            </div>
          </div>

          <div className="af-edge-notify__drawer-bar">
            <AfSegmented<AfEdgeNotificationFilter>
              size="xs"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `全部 (${historyItems.length})` },
                { value: "unread", label: `未读 (${unreadCount})` },
                { value: "system", label: "系统" },
              ]}
            />
            <button
              type="button"
              className="af-edge-notify__text-btn"
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
            >
              全部标为已读
            </button>
          </div>

          <div ref={historyListRef} className="af-edge-notify__history" data-af-hover-list="hover">
            {animatedHistory.entries.length === 0 ? (
              <div key={filter} className="af-edge-notify__empty af-pj-panel-in">
                <AfIcon name="bell" size={18} />
                <span>暂无符合筛选条件的通知记录</span>
              </div>
            ) : (
              animatedHistory.entries.map(({ item, key, leaving }) => (
                <div
                  key={key}
                  className="af-edge-notify__history-row"
                  data-flip={key}
                  data-af-hover-item
                  data-unread={item.unread ? "true" : undefined}
                  data-leaving={leaving ? "true" : undefined}
                >
                  <AfAppMark
                    size={28}
                    icon={item.appIcon ?? "bell"}
                    name={item.appName}
                    tone={item.tone ?? "neutral"}
                  />
                  <div className="af-edge-notify__history-main">
                    <div className="af-edge-notify__history-top">
                      <strong>{item.title}</strong>
                      <span>{item.timestamp}</span>
                    </div>
                    {item.description ? (
                      <p className="af-edge-notify__history-desc">{item.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="af-edge-notify__history-del"
                    aria-label={`移除记录 ${item.title}`}
                    onClick={() => handleRemoveHistoryItem(item.id)}
                  >
                    <AfIcon name="x" size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="af-edge-notify__drawer-foot">
            <span className="af-edge-notify__foot-meta">
              {dnd ? "勿扰模式已开启 · 新通知静默归档" : "实时边缘提醒正常开启"}
            </span>
            <AfButton
              size="xs"
              variant="ghost"
              disabled={historyItems.length === 0}
              onClick={handleClearHistory}
            >
              清空归档
            </AfButton>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
