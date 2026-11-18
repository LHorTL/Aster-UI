import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { AfIcon, type AfIconSlot } from "../../icons";
import {
  cn,
  useControllableState,
  useWindowAutoSize,
  useWindowPointerDrag,
  type AfWindowDragMovePayload,
  type AfWindowSize,
} from "../../primitives";
import { AfAppMark, AfPopover, AfSlider, AfTag } from "../../ui";
import { AfSwap, useTween } from "../../ui-pro";

/** 透明子窗口外观形态。 */
export type AfSubwindowVariant = "floating" | "popover" | "overlay";

/** 气泡子窗小三角指示方向。 */
export type AfSubwindowArrowSide = "top" | "bottom" | "none";

/** 轻量透明子窗口通用外壳属性。 */
export type AfSubwindowChromeProps = {
  /** 子窗形态：`floating`（带紧凑拖拽栏）、`popover`（无头锚定气泡壳）、`overlay`（HUD 半透悬浮壳）。 */
  variant?: AfSubwindowVariant;
  /** 子窗口标题（`floating` 顶栏显示）。 */
  title?: ReactNode;
  /** 副标题或快捷状态徽标。 */
  subtitle?: ReactNode;
  /** 应用微标图标。 */
  icon?: AfIconSlot;
  /** 窗口置顶图钉状态。 */
  pinned?: boolean;
  defaultPinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  /** 窗口整体不透明度百分比（`30–100`）。 */
  opacity?: number;
  defaultOpacity?: number;
  onOpacityChange?: (opacity: number) => void;
  /** 是否显示不透明度调节按钮，默认 `true`。 */
  showOpacityControl?: boolean;
  /** 是否显示最小化按钮，默认 `false`。 */
  showMinimize?: boolean;
  /** `popover` 形态下的小三角朝向，默认 `"top"`。 */
  arrowSide?: AfSubwindowArrowSide;
  /** 是否自动测量内容尺寸并通过双 rAF 防闪上报宿主，默认 `false`。 */
  autoSize?: boolean;
  onWindowResize?: (size: AfWindowSize) => void;
  onWindowReady?: (size: AfWindowSize) => void;
  /** 屏幕坐标窗口拖拽位移回调。 */
  onWindowMove?: (payload: AfWindowDragMovePayload) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function DefaultSubwindowContent({ variant }: { variant: AfSubwindowVariant }) {
  const pct = useTween(78.4, 380);
  if (variant === "overlay") {
    return (
      <div className="af-subwin__demo-hud">
        <span className="af-subwin__hud-dot" aria-hidden="true" />
        <span className="af-subwin__hud-label">实时字幕与快捷键监听中</span>
        <AfTag tone="accent" size="sm">
          24 ms
        </AfTag>
      </div>
    );
  }
  return (
    <div className="af-subwin__demo-body">
      <div className="af-subwin__demo-row">
        <span>今日推理配额余量</span>
        <strong>{pct.toFixed(1)}%</strong>
      </div>
      <div className="af-subwin__demo-bar" aria-hidden="true">
        <span style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
      <div className="af-subwin__demo-meta">
        <span>主网关延迟 38ms</span>
        <span>下次重置 18:00</span>
      </div>
    </div>
  );
}

/**
 * 轻量悬浮子窗口通用外壳（`floating | popover | overlay`）：
 * - `floating`：30px 紧凑拖拽标题栏、置顶图钉、30%–100% 不透明度调节气泡与关闭钮；
 * - `popover`：无标题栏圆角锚定浮层壳，支持上下三角指示与 `Esc` 关闭；
 * - `overlay`：HUD 极简半透悬浮壳（配减动效优雅降级）。
 */
export function AfSubwindowChrome({
  variant = "floating",
  title = "用量监控浮窗",
  subtitle,
  icon = "sparkle",
  pinned: pinnedProp,
  defaultPinned = true,
  onPinnedChange,
  opacity: opacityProp,
  defaultOpacity = 96,
  onOpacityChange,
  showOpacityControl = true,
  showMinimize = false,
  arrowSide = "top",
  autoSize = false,
  onWindowResize,
  onWindowReady,
  onWindowMove,
  onMinimize,
  onClose,
  children,
  className,
  style,
}: AfSubwindowChromeProps = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const opacityBtnRef = useRef<HTMLButtonElement | null>(null);
  const [opacityOpen, setOpacityOpen] = useState(false);

  const [pinned, setPinned] = useControllableState<boolean>({
    value: pinnedProp,
    defaultValue: defaultPinned,
    onChange: onPinnedChange,
  });

  const [opacity, setOpacity] = useControllableState<number>({
    value: opacityProp,
    defaultValue: defaultOpacity,
    onChange: onOpacityChange,
  });

  const safeOpacity = Math.max(30, Math.min(100, Math.round(opacity)));

  useWindowAutoSize(rootRef, {
    enabled: autoSize,
    padding: 6,
    onResize: onWindowResize,
    onReady: onWindowReady,
  });

  const winDrag = useWindowPointerDrag({
    threshold: 4,
    disabled: variant === "popover",
    onMove: onWindowMove,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && !opacityOpen) {
      onClose?.();
    }
  };

  const mergedStyle: CSSProperties = {
    ...style,
    opacity: safeOpacity / 100,
  };

  return (
    <div
      ref={rootRef}
      className={cn("af-subwin", `af-subwin--${variant}`, className)}
      style={mergedStyle}
      data-af-hit-area
      data-variant={variant}
      data-pinned={pinned ? "true" : undefined}
      data-dragging={winDrag.dragging ? "true" : undefined}
      tabIndex={variant === "floating" ? undefined : 0}
      onKeyDown={handleKeyDown}
      {...(variant === "overlay" ? winDrag.bindTarget : null)}
    >
      {variant === "popover" && arrowSide !== "none" ? (
        <span className={cn("af-subwin__arrow", `af-subwin__arrow--${arrowSide}`)} aria-hidden="true" />
      ) : null}

      {variant === "floating" ? (
        <header className="af-subwin__bar" {...winDrag.bindTarget}>
          <div className="af-subwin__brand">
            <AfAppMark size={20} icon={icon} tone="accent" name={typeof title === "string" ? title : "浮窗"} />
            <span className="af-subwin__title">{title}</span>
            {subtitle ? <span className="af-subwin__subtitle">{subtitle}</span> : null}
          </div>

          <div
            className="af-subwin__controls"
            data-no-drag="true"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="af-subwin__ctl"
              data-active={pinned ? "true" : undefined}
              aria-label={pinned ? "取消窗口置顶" : "始终置顶窗口"}
              aria-pressed={pinned}
              title={pinned ? "已置顶" : "置顶窗口"}
              onClick={() => setPinned(!pinned)}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M5.5 2.75h5l-.6 3.5 1.85 1.75v1.25H4.25V8l1.85-1.75-.6-3.5ZM8 9.25v4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showOpacityControl ? (
              <>
                <button
                  ref={opacityBtnRef}
                  type="button"
                  className="af-subwin__ctl af-subwin__ctl--pct"
                  data-active={opacityOpen ? "true" : undefined}
                  aria-label={`窗口不透明度 ${safeOpacity}%`}
                  aria-expanded={opacityOpen}
                  onClick={() => setOpacityOpen((v) => !v)}
                >
                  <span>{safeOpacity}%</span>
                </button>
                <AfPopover
                  open={opacityOpen}
                  anchorRef={opacityBtnRef}
                  side="bottom"
                  align="end"
                  onPointerDownOutside={() => setOpacityOpen(false)}
                  onEscapeKeyDown={() => setOpacityOpen(false)}
                >
                  <div className="af-subwin__opacity-pop">
                    <div className="af-subwin__opacity-head">
                      <span>窗口不透明度</span>
                      <strong>{safeOpacity}%</strong>
                    </div>
                    <AfSlider
                      min={30}
                      max={100}
                      step={5}
                      value={safeOpacity}
                      onChange={setOpacity}
                      aria-label="调节子窗口不透明度"
                    />
                  </div>
                </AfPopover>
              </>
            ) : null}

            {showMinimize ? (
              <button
                type="button"
                className="af-subwin__ctl"
                aria-label="最小化子窗口"
                onClick={onMinimize}
              >
                <AfIcon name="minus" size={12} />
              </button>
            ) : null}

            <button
              type="button"
              className="af-subwin__ctl af-subwin__ctl--close"
              aria-label="关闭子窗口"
              onClick={onClose}
            >
              <AfIcon name="x" size={12} />
            </button>
          </div>
        </header>
      ) : null}

      <div className="af-subwin__content">
        {children ?? (
          <AfSwap swapKey={variant}>
            <DefaultSubwindowContent variant={variant} />
          </AfSwap>
        )}
      </div>
    </div>
  );
}
