import { useRef, useState } from "react";
import { AfButton, AfPopover, AfTooltip } from "../../ui";
import { AfIcon, renderAfIconSlot } from "../../icons";
import { AfNotice } from "./types";

/** 通知铃铛：带未读点，点击展开通知列表；「通知设置」回到设置的通知分类。 */
export function AfNotificationBell({ notices, onOpenSettings }: { notices: AfNotice[]; onOpenSettings?: () => void }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const unread = notices.some((notice) => notice.unread) && !read;

  return (
    <span className="af-bell" ref={rootRef}>
      <AfTooltip label="通知" side="bottom">
        <AfButton className="af-bell__btn" variant="ghost" size="sm" icon="bell" aria-label={unread ? "通知，有新消息" : "通知"} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)} />
      </AfTooltip>
      {unread ? <span className="af-bell__dot" aria-hidden /> : null}
      <AfPopover
        open={open}
        anchorRef={rootRef}
        role="dialog"
        label="通知"
        side="bottom"
        align="end"
        gap={7}
        flush
        animateExit
        preserveNaturalWidth
        className="af-notice-pop"
        onPointerDownOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <header className="af-notice-pop__head">
          <strong>通知</strong>
          <button type="button" className="af-notice-pop__read" onClick={() => setRead(true)} disabled={!unread}>
            全部已读
          </button>
        </header>
        <ul className="af-notice-pop__list">
          {notices.map((notice) => (
            <li key={notice.id} className="af-notice-pop__item" data-unread={notice.unread && !read ? true : undefined}>
              <span className="af-notice-pop__icon" data-tone={notice.tone ?? "neutral"} aria-hidden>
                {renderAfIconSlot(notice.icon ?? "info", 13)}
              </span>
              <span className="af-notice-pop__body">
                <span className="af-notice-pop__title">{notice.title}</span>
                {notice.description ? <span className="af-notice-pop__desc">{notice.description}</span> : null}
                {notice.time ? <span className="af-notice-pop__time">{notice.time}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <footer className="af-notice-pop__foot">
          <button
            type="button"
            className="af-notice-pop__settings"
            onClick={() => {
              setOpen(false);
              onOpenSettings?.();
            }}
          >
            通知设置
            <AfIcon name="chevronRight" size={12} />
          </button>
        </footer>
      </AfPopover>
    </span>
  );
}
