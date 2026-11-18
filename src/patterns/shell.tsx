import "./shell.css";
export { AfAppSwitcher } from "../components/shell/AppSwitcher";
export { AfThemeToggle } from "../components/shell/ThemeToggle";
export { AfNotificationBell } from "../components/shell/NotificationBell";
export { AfWindowActions } from "../components/shell/WindowActions";
export { AfWindowFrame, AfAppShell, type AfWindowFrameProps, type AfAppShellProps } from "../components/shell/WindowFrame";
export { AfAppShellInset, type AfAppShellInsetProps } from "../components/shell/AppShellInset";
export {
  AfTitleBar,
  AfWindowControls,
  AfTitleBar as TitleBar,
  type AfTitleBarProps,
  type AfWindowControlsProps,
} from "../components/shell/TitleBar";
export {
  AfThemePanel,
  AfThemePanel as ThemePanel,
  type AfThemePanelProps,
} from "../components/shell/ThemePanel";
export {
  AfAppDock,
  type AfAppDockProps,
  type AfAppDockItem,
  type AfAppDockVariant,
} from "../components/shell/AppDock";
export {
  AfDesktopTools,
  type AfDesktopToolsProps,
  type AfDesktopToolItem,
  type AfDesktopToolEntry,
  type AfDesktopToolSummary,
  type AfDesktopToolPanelProps,
  type AfDesktopToolsEdge,
  type AfDesktopToolsPanelMode,
  type AfDesktopToolsPreferences,
} from "../components/shell/DesktopTools";
export {
  AfInstallerWizard,
  AfRunningProcessesDialog,
  AfViewportFitStage,
  normalizeInstallDirectory,
  type AfInstallerWizardProps,
  type AfInstallerStage,
  type AfInstallerScope,
  type AfInstallerSubPhase,
  type AfInstallerStartPayload,
  type AfRunningProcessesDialogProps,
  type AfRunningProcessItem,
  type AfViewportFitStageProps,
} from "../components/shell/InstallerWizard";
export {
  AfEdgeNotificationOverlay,
  type AfEdgeNotificationOverlayProps,
  type AfEdgeNotificationItem,
  type AfEdgeNotificationAction,
  type AfEdgeNotificationTone,
  type AfEdgeNotificationFilter,
} from "../components/shell/EdgeNotificationOverlay";
export {
  AfSubwindowChrome,
  type AfSubwindowChromeProps,
  type AfSubwindowVariant,
  type AfSubwindowArrowSide,
} from "../components/shell/SubwindowChrome";
export {
  AfRecoveryLockShell,
  type AfRecoveryLockShellProps,
  type AfRecoverySnapshotItem,
} from "../components/shell/RecoveryLockShell";
export type { AfAppEntry, AfNotice } from "../components/shell/types";
