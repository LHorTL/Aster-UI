import { useState, type ReactNode, type RefObject } from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn, useAnimatedList } from "../../primitives";
import { AfButton, AfTag, type AfTone } from "../../ui";
import { useReducedMotion } from "../_shared/project";

/** 通知条目。 */
export type AfProjectNoticeItem = {
  id: number | string;
  title: string;
  desc: string;
  time: string;
  tone: AfTone;
  icon: AfIconSlot;
  category?: string;
};

/** 通知中心属性。 */
export type AfProjectNotificationCenterProps = {
  notices?: AfProjectNoticeItem[];
  collapsedNotices?: AfProjectNoticeItem[];
  title?: ReactNode;
  onDismiss?: (item: AfProjectNoticeItem) => void;
  onClearAll?: () => void;
  onUndo?: () => void;
  onAction?: (item: AfProjectNoticeItem) => void;
  className?: string;
};

const DEFAULT_NOTICES: AfProjectNoticeItem[] = [
  {
    id: 1,
    title: "客户端 v1.4.2 更新包已下载",
    desc: "包含表格导出优化与深色模式细节修复，重启应用后即可生效。",
    time: "2 分钟前",
    tone: "accent",
    icon: "download",
    category: "更新",
  },
  {
    id: 2,
    title: "云端同步空间已使用 85%",
    desc: "当前剩余可用空间约 2.4 GB，建议定期清理历史归档附件。",
    time: "14 分钟前",
    tone: "warning",
    icon: "alert",
    category: "存储",
  },
  {
    id: 3,
    title: "本地预览端口 3080 连接超时",
    desc: "开发调试服务响应异常，已自动切换至备用端口重新监听。",
    time: "28 分钟前",
    tone: "danger",
    icon: "xCircle",
    category: "服务",
  },
];

const DEFAULT_COLLAPSED: AfProjectNoticeItem[] = [
  { id: "c1", title: "每周自动备份已完成", desc: "已生成 14 份项目文档与偏好设置的本地快照", time: "3 小时前", tone: "success", icon: "checkCircle" },
  { id: "c2", title: "外观主题配置已同步", desc: "浅色与深色预设方案已更新至当前设备", time: "昨天", tone: "neutral", icon: "sliders" },
];

/** 通知中心：柔和语义圆角图标磁贴、未读蓝点、非阻塞内联撤销与 `<details>` 归档抽屉。 */
function ProjectNotificationCenter({
  notices: noticesProp,
  collapsedNotices = DEFAULT_COLLAPSED,
  title = "通知中心",
  onDismiss,
  onClearAll,
  onUndo,
  onAction,
  className,
}: AfProjectNotificationCenterProps = {}) {
  const [innerNotices, setInnerNotices] = useState<AfProjectNoticeItem[]>(DEFAULT_NOTICES);
  const [undoSnapshot, setUndoSnapshot] = useState<AfProjectNoticeItem[] | null>(null);
  const reduced = useReducedMotion();
  const notices = noticesProp ?? innerNotices;

  const { entries, listRef, flip, requestRemove, requestClear } = useAnimatedList<AfProjectNoticeItem>({
    items: notices,
    getKey: (item) => String(item.id),
    exitDuration: 180,
    flipDuration: 260,
    disabled: reduced,
    onRemove: (_key, item) => {
      if (!noticesProp) {
        setInnerNotices((prev) => {
          setUndoSnapshot(prev);
          return prev.filter((n) => n.id !== item.id);
        });
      } else if (onUndo) {
        setUndoSnapshot(notices);
      }
      onDismiss?.(item);
    },
  });

  const handleDismiss = (item: AfProjectNoticeItem) => {
    requestRemove(String(item.id));
  };

  const handleClearAll = () => {
    if (!noticesProp) {
      setUndoSnapshot(innerNotices);
    } else if (onUndo) {
      setUndoSnapshot(notices);
    }
    requestClear();
    if (!noticesProp) {
      setInnerNotices([]);
    }
    onClearAll?.();
  };

  const handleUndo = () => {
    flip.capture();
    if (!noticesProp && undoSnapshot) {
      setInnerNotices(undoSnapshot);
    }
    setUndoSnapshot(null);
    onUndo?.();
  };

  return (
    <div className={cn("af-pj-notify", className)} ref={listRef as RefObject<HTMLDivElement>}>
      <div className="af-pj-notify__head">
        <span className="af-pj-notify__title">
          <AfIcon name="bell" size={14} />
          <span>{title}</span>
        </span>
        {notices.length > 0 ? (
          <AfTag tone="accent" size="sm">
            {notices.length} 未读
          </AfTag>
        ) : (
          <span className="af-pj-notify__count">已读完</span>
        )}
        <span className="af-pj-notify__spacer" />
        {undoSnapshot ? (
          <AfButton size="xs" variant="ghost" icon="undo" onClick={handleUndo}>
            撤销
          </AfButton>
        ) : null}
        {notices.length > 0 ? (
          <AfButton size="xs" variant="ghost" icon="check" onClick={handleClearAll}>
            全部已读
          </AfButton>
        ) : !undoSnapshot && !noticesProp ? (
          <AfButton
            size="xs"
            variant="ghost"
            icon="refresh"
            onClick={() => {
              flip.capture();
              setInnerNotices(DEFAULT_NOTICES);
            }}
          >
            恢复演示
          </AfButton>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <ul className="af-pj-notify__list" role="list" data-af-hover-list="wash">
          {entries.map(({ item, key, leaving }) => (
            <li
              className="af-pj-notice"
              key={key}
              data-flip={key}
              data-leaving={leaving ? "true" : undefined}
            >
              <span className="af-pj-notice__icon" data-tone={item.tone} aria-hidden="true">
                {renderAfIconSlot(item.icon, 15)}
              </span>
              <span
                className="af-pj-notice__main"
                onClick={onAction ? () => onAction(item) : undefined}
                style={onAction ? { cursor: "pointer" } : undefined}
              >
                <span className="af-pj-notice__top">
                  <span className="af-pj-notice__title">
                    <span className="af-pj-notice__unread" aria-hidden="true" />
                    <span>{item.title}</span>
                  </span>
                  <span className="af-pj-notice__time">{item.time}</span>
                </span>
                <span className="af-pj-notice__desc">{item.desc}</span>
              </span>
              <button
                type="button"
                className="af-pj-iconbtn"
                aria-label={`忽略通知：${item.title}`}
                onClick={() => handleDismiss(item)}
              >
                <AfIcon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="af-pj-notify__empty">
          <AfIcon name="checkCircle" size={15} />
          <span>当前没有未读通知</span>
        </div>
      )}

      {collapsedNotices.length > 0 ? (
        <details className="af-pj-notify__details">
          <summary className="af-pj-notify__collapsed">
            <AfIcon name="layers" size={13} />
            <span>已归档 {collapsedNotices.length} 条早先通知</span>
            <AfIcon name="chevronDown" size={13} />
          </summary>
          <ul className="af-pj-notify__list af-pj-notify__list--archived" role="list" data-af-hover-list="wash">
            {collapsedNotices.map((item) => (
              <li className="af-pj-notice af-pj-notice--archived" key={item.id}>
                <span className="af-pj-notice__icon" data-tone={item.tone} aria-hidden="true">
                  {renderAfIconSlot(item.icon, 14)}
                </span>
                <span className="af-pj-notice__main">
                  <span className="af-pj-notice__top">
                    <span className="af-pj-notice__title">{item.title}</span>
                    <span className="af-pj-notice__time">{item.time}</span>
                  </span>
                  <span className="af-pj-notice__desc">{item.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export { ProjectNotificationCenter as AfProjectNotificationCenter };
