import { AfIcon } from "../../icons";
import { AfNotice } from "./types";
import { AfNotificationBell } from "./NotificationBell";
import { AfThemeToggle } from "./ThemeToggle";

/** 外框右上角操作组：通知 + 主题切换 + 一组窗口按钮外观。 */
export function AfWindowActions({
  dark,
  onToggleDark,
  notices,
  onOpenSettings,
}: {
  /** 是否深色。 */
  dark: boolean;
  /** 切换明暗。 */
  onToggleDark: () => void;
  /** 通知列表。 */
  notices: AfNotice[];
  /** 打开通知设置。 */
  onOpenSettings?: () => void;
}) {
  return (
    <span className="af-winctls">
      <AfNotificationBell notices={notices} onOpenSettings={onOpenSettings} />
      <AfThemeToggle dark={dark} onToggle={onToggleDark} />
      <span className="af-toolbar__divider" aria-hidden />
      <span className="af-winctl" aria-hidden>
        <AfIcon name="minus" size={14} />
      </span>
      <span className="af-winctl" aria-hidden>
        <AfIcon name="square" size={12} />
      </span>
      <span className="af-winctl af-winctl--close" aria-hidden>
        <AfIcon name="x" size={14} />
      </span>
    </span>
  );
}
