import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";

/** Electron / 桌面端窗口控制按钮属性。 */
export type AfWindowControlsProps = ComponentPropsWithoutRef<"div"> & {
  /** 窗口是否处于最大化状态。 */
  maximized?: boolean;
  /** 最小化回调。 */
  onMinimize?: () => void;
  /** 最大化/还原回调。 */
  onMaximize?: () => void;
  /** 关闭窗口回调。 */
  onClose?: () => void;
  /** 是否显示最小化按钮，默认 true。 */
  showMinimize?: boolean;
  /** 是否显示最大化按钮，默认 true。 */
  showMaximize?: boolean;
  /** 是否显示关闭按钮，默认 true。 */
  showClose?: boolean;
};

/** Electron 原生三键（最小化、最大化/还原、关闭），自动带有 `-webkit-app-region: no-drag`。 */
export const AfWindowControls = forwardRef<HTMLDivElement, AfWindowControlsProps>(function AfWindowControls(
  {
    maximized = false,
    onMinimize,
    onMaximize,
    onClose,
    showMinimize = true,
    showMaximize = true,
    showClose = true,
    className,
    ...rest
  },
  ref,
) {
  return (
    <div ref={ref} className={cn("af-window-controls", className)} {...rest}>
      {showMinimize ? (
        <button
          type="button"
          className="af-window-controls__btn"
          data-kind="minimize"
          aria-label="最小化窗口"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onMinimize?.();
          }}
        >
          <AfIcon name="minus" size={13} />
        </button>
      ) : null}
      {showMaximize ? (
        <button
          type="button"
          className="af-window-controls__btn"
          data-kind="maximize"
          aria-label={maximized ? "还原窗口" : "最大化窗口"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onMaximize?.();
          }}
        >
          <AfIcon name={maximized ? "windowRestore" : "square"} size={12} />
        </button>
      ) : null}
      {showClose ? (
        <button
          type="button"
          className="af-window-controls__btn"
          data-kind="close"
          aria-label="关闭窗口"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onClose?.();
          }}
        >
          <AfIcon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
});

/** Electron 无边框窗口标题栏属性。 */
export type AfTitleBarProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  /** 窗口标题。 */
  title?: ReactNode;
  /** 左侧图标或面包屑区域（可交互元素自动免拖拽）。 */
  leading?: ReactNode;
  /** 中央搜索或标签槽位。 */
  center?: ReactNode;
  /** 右侧附加工具按钮（位于窗口三键之前）。 */
  trailing?: ReactNode;
  /** 历史宿主迁移兼容：右侧操作槽位（与 `trailing` 等效，`actions` 优先）。 */
  actions?: ReactNode;
  /** 是否开启窗口拖拽区域（`-webkit-app-region: drag`），默认 true。 */
  draggable?: boolean;
  /** 平台布局策略；`"mac"` 时左侧自动预留红绿灯交通灯安全区。 */
  platform?: "windows" | "mac" | "linux";
  /** macOS 红绿灯留空像素，默认 72。 */
  macTrafficLightOffset?: number;
  /** 是否展示右侧系统窗口控制按钮（Windows/Linux 默认 true）。 */
  showWindowControls?: boolean;
  /** 是否显示最小化按钮。 */
  showMinimize?: boolean;
  /** 是否显示最大化按钮。 */
  showMaximize?: boolean;
  /** 是否显示关闭按钮。 */
  showClose?: boolean;
  /** 窗口是否处于最大化。 */
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
};

/**
 * Electron 无边框拖拽标题栏：根节点固定 `height: 36px` 与 `-webkit-app-region: drag`，
 * 所有内部按钮/输入框及窗口三键均自带 `no-drag` 并处理 macOS 左侧交通灯安全间距。
 */
export const AfTitleBar = forwardRef<HTMLElement, AfTitleBarProps>(function AfTitleBar(
  {
    title,
    leading,
    center,
    trailing,
    actions,
    draggable = true,
    platform = "windows",
    macTrafficLightOffset = 72,
    showWindowControls,
    showMinimize = true,
    showMaximize = true,
    showClose = true,
    maximized = false,
    onMinimize,
    onMaximize,
    onClose,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const showControls = showWindowControls ?? platform !== "mac";
  const resolvedStyle =
    platform === "mac" ? { paddingLeft: macTrafficLightOffset, ...style } : style;

  return (
    <header
      ref={ref}
      className={cn("af-titlebar", className)}
      data-platform={platform}
      data-draggable={draggable ? "true" : "false"}
      style={resolvedStyle}
      {...rest}
    >
      {platform === "mac" ? (
        <span className="af-titlebar__traffic" aria-hidden="true">
          <i data-dot="close" />
          <i data-dot="min" />
          <i data-dot="max" />
        </span>
      ) : null}
      <div className="af-titlebar__left">
        {leading}
        {title ? <span className="af-titlebar__title">{title}</span> : null}
      </div>
      <div className="af-titlebar__center">{center ?? children}</div>
      <div className="af-titlebar__right">
        {actions ?? trailing}
        {showControls ? (
          <AfWindowControls
            maximized={maximized}
            showMinimize={showMinimize}
            showMaximize={showMaximize}
            showClose={showClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
            onClose={onClose}
          />
        ) : null}
      </div>
    </header>
  );
});
