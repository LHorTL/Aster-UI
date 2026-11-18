import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AfButton,
  AfIconButton,
  cn,
  copyToClipboard,
  useControllableState,
} from "../../ui";

export type AfCaptureToolKey = "rect" | "arrow" | "pen" | "mosaic" | "text";
export type AfCaptureHandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface AfCaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AfScreenCaptureOverlayProps {
  /** 是否约束在父舞台容器内预览（画廊模式默认 `true`，真实桌面全屏捕获可传 `false`）。 */
  contained?: boolean;
  /** 舞台默认宽高（用于 SSR 与静态预览计算四向遮罩及边缘避让）。 */
  stageWidth?: number;
  stageHeight?: number;
  /** 受控选区矩形。 */
  selection?: AfCaptureRect;
  defaultSelection?: AfCaptureRect;
  onSelectionChange?: (next: AfCaptureRect) => void;
  /** 当前激活标注工具。 */
  activeTool?: AfCaptureToolKey;
  defaultActiveTool?: AfCaptureToolKey;
  onToolChange?: (tool: AfCaptureToolKey) => void;
  /** 是否显示跟随光标的像素级网格放大镜。 */
  showLoupe?: boolean;
  /** 复制像素色值回调（默认快捷键 `C`）。 */
  onCopyColor?: (hex: string) => void;
  /** OCR 截图互译触发回调。 */
  onOcrTranslate?: (rect: AfCaptureRect) => void;
  /** 贴图钉到桌面回调。 */
  onPinToScreen?: (rect: AfCaptureRect) => void;
  /** 完成截图复制回调。 */
  onConfirmCopy?: (rect: AfCaptureRect) => void;
  /** 保存截图文件回调。 */
  onSaveFile?: (rect: AfCaptureRect) => void;
  /** 退出取消捕获回调。 */
  onCancel?: () => void;
  className?: string;
}

const DEFAULT_SELECTION: AfCaptureRect = {
  x: 112,
  y: 72,
  width: 440,
  height: 232,
};

const HANDLE_DIRS: readonly AfCaptureHandleDir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** 根据相对坐标生成确定性演示取色值与 7×7 像素矩阵色阶。 */
function sampleDemoPixel(px: number, py: number): { hex: string; rgb: string } {
  const r = Math.max(18, Math.min(235, 24 + ((px * 3) % 160)));
  const g = Math.max(48, Math.min(240, 88 + ((py * 5) % 130)));
  const b = Math.max(120, Math.min(250, 176 + (((px + py) * 2) % 72)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    rgb: `${r}, ${g}, ${b}`,
  };
}

/**
 * 视觉捕获工作台 · 全屏透明框选与像素放大镜覆盖层（`P3-1`）：
 * - **100% Flexbox 四向挖空暗罩**（上全宽条 + 中间「左暗条 + 透明选区框 + 右暗条」+ 下全宽条，零 Canvas 锯齿、零 CSS Grid）；
 * - 8 方向 `setPointerCapture` 调整手柄 + 左上角 `W × H px` 等宽胶囊；
 * - 跟随光标自动四边避让的 `7×7` 像素网格放大镜（十字准星 + `HEX/RGB` 读数 + `C` 键复制色值）；
 * - 近底边自动翻转避让的浮动标注与 OCR 工具栏。
 */
export function AfScreenCaptureOverlay({
  contained = true,
  stageWidth = 760,
  stageHeight = 420,
  selection: selectionProp,
  defaultSelection = DEFAULT_SELECTION,
  onSelectionChange,
  activeTool: toolProp,
  defaultActiveTool = "rect",
  onToolChange,
  showLoupe = true,
  onCopyColor,
  onOcrTranslate,
  onPinToScreen,
  onConfirmCopy,
  onSaveFile,
  onCancel,
  className,
}: AfScreenCaptureOverlayProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: stageWidth, height: stageHeight });

  const [sel, setSel] = useControllableState<AfCaptureRect>({
    value: selectionProp,
    defaultValue: defaultSelection,
    onChange: onSelectionChange,
  });

  const [tool, setTool] = useControllableState<AfCaptureToolKey>({
    value: toolProp,
    defaultValue: defaultActiveTool,
    onChange: onToolChange,
  });

  const [cursor, setCursor] = useState<{ x: number; y: number }>({
    x: defaultSelection.x + defaultSelection.width - 28,
    y: defaultSelection.y + 42,
  });
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    mode: "move" | AfCaptureHandleDir;
    startX: number;
    startY: number;
    origin: AfCaptureRect;
  } | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setStageSize({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentSample = sampleDemoPixel(Math.round(cursor.x), Math.round(cursor.y));

  const triggerCopyHex = () => {
    void copyToClipboard(currentSample.hex);
    setCopiedHex(currentSample.hex);
    onCopyColor?.(currentSample.hex);
  };

  // 仅真实桌面全屏捕获模式挂载 window 快捷键；画廊 contained 内嵌模式仅在焦点位于本舞台时响应，避免劫持页面按键
  useEffect(() => {
    if (contained || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel?.();
      } else if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        if (target instanceof Element && target.closest("input, textarea, [contenteditable='true']")) {
          return;
        }
        void copyToClipboard(currentSample.hex);
        setCopiedHex(currentSample.hex);
        onCopyColor?.(currentSample.hex);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contained, currentSample.hex, onCancel, onCopyColor]);

  const clampRect = (r: AfCaptureRect): AfCaptureRect => {
    const minSize = 48;
    const maxW = Math.max(minSize, stageSize.width);
    const maxH = Math.max(minSize, stageSize.height);
    const width = Math.max(minSize, Math.min(maxW, Math.round(r.width)));
    const height = Math.max(minSize, Math.min(maxH, Math.round(r.height)));
    const x = Math.max(0, Math.min(maxW - width, Math.round(r.x)));
    const y = Math.max(0, Math.min(maxH - height, Math.round(r.y)));
    return { x, y, width, height };
  };

  const startDrag = (mode: "move" | AfCaptureHandleDir, e: ReactPointerEvent<HTMLElement>) => {
    e.stopPropagation();
    try {
      rootRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
    dragRef.current = {
      pointerId: e.pointerId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: sel,
    };
  };

  const handleStagePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = Math.max(0, Math.min(stageSize.width, e.clientX - rect.left));
    const localY = Math.max(0, Math.min(stageSize.height, e.clientY - rect.top));
    setCursor({ x: localX, y: localY });

    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const o = session.origin;

    if (session.mode === "move") {
      setSel(clampRect({ x: o.x + dx, y: o.y + dy, width: o.width, height: o.height }));
      return;
    }

    let nx = o.x;
    let ny = o.y;
    let nw = o.width;
    let nh = o.height;

    if (session.mode.includes("e")) nw = o.width + dx;
    if (session.mode.includes("s")) nh = o.height + dy;
    if (session.mode.includes("w")) {
      nx = o.x + dx;
      nw = o.width - dx;
    }
    if (session.mode.includes("n")) {
      ny = o.y + dy;
      nh = o.height - dy;
    }
    if (nw < 48) {
      if (session.mode.includes("w")) nx = o.x + o.width - 48;
      nw = 48;
    }
    if (nh < 48) {
      if (session.mode.includes("n")) ny = o.y + o.height - 48;
      nh = 48;
    }
    setSel(clampRect({ x: nx, y: ny, width: nw, height: nh }));
  };

  const handleStagePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      dragRef.current = null;
    }
  };

  // 像素放大镜自动四边避让定位
  const loupeW = 148;
  const loupeH = 152;
  const loupeFlipX = cursor.x + 18 + loupeW > stageSize.width;
  const loupeFlipY = cursor.y + 18 + loupeH > stageSize.height;
  const loupeLeft = Math.max(8, loupeFlipX ? cursor.x - loupeW - 14 : cursor.x + 16);
  const loupeTop = Math.max(8, loupeFlipY ? cursor.y - loupeH - 14 : cursor.y + 16);

  // 浮动标注工具条近底边自适应翻转
  const toolbarNearBottom = sel.y + sel.height + 50 > stageSize.height;
  const toolbarTop = toolbarNearBottom
    ? sel.y >= 46
      ? sel.y - 42
      : sel.y + sel.height - 42
    : sel.y + sel.height + 10;
  const toolbarLeft = Math.max(8, Math.min(stageSize.width - 420, sel.x + sel.width - 412));

  const stageStyle: CSSProperties | undefined = contained
    ? { width: "100%", height: stageHeight }
    : undefined;

  return (
    <div
      ref={rootRef}
      tabIndex={contained ? 0 : undefined}
      className={cn("af-capture-stage", !contained && "af-capture-stage--fullscreen", className)}
      style={stageStyle}
      onPointerMove={handleStagePointerMove}
      onPointerUp={handleStagePointerUp}
      onPointerCancel={handleStagePointerUp}
      onKeyDown={
        contained
          ? (e) => {
              if (e.key === "Escape") {
                onCancel?.();
              } else if (
                (e.key === "c" || e.key === "C") &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
              ) {
                if (
                  e.target instanceof Element &&
                  e.target.closest("input, textarea, [contenteditable='true']")
                ) {
                  return;
                }
                triggerCopyHex();
              }
            }
          : undefined
      }
      role="region"
      aria-label="屏幕截图框选与像素取色工作台"
    >
      {/* 模拟底层待捕获桌面文档画面（仅 contained 舞台预览展示层次） */}
      {contained ? (
        <div className="af-capture-stage__backdrop-scene" aria-hidden="true">
          <div className="af-capture-stage__mock-win">
            <div className="af-capture-stage__mock-bar">
              <span />
              <span />
              <span />
              <strong>Technical Specification · API Latency Report</strong>
            </div>
            <div className="af-capture-stage__mock-content">
              <p>Multi-region edge gateway reduced P99 TLS handshake latency from 142ms to 28ms.</p>
              <div className="af-capture-stage__mock-chips">
                <span>Tokyo · 24ms</span>
                <span>Frankfurt · 31ms</span>
                <span>Singapore · 19ms</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 纯 Flexbox 四向挖空暗罩层（上条 + 中三列 + 下条） */}
      <div className="af-capture-stage__mask-root">
        <div className="af-capture-stage__mask-band" style={{ height: sel.y }} />

        <div className="af-capture-stage__mask-mid" style={{ height: sel.height }}>
          <div className="af-capture-stage__mask-side" style={{ width: sel.x }} />

          <div
            className="af-capture-stage__cutout"
            style={{ width: sel.width, height: sel.height }}
            onPointerDown={(e) => startDrag("move", e)}
          >
            {/* 左上角等宽尺寸与坐标胶囊 */}
            <div
              className="af-capture-stage__size-pill"
              data-flipped={sel.y < 30 ? "true" : undefined}
            >
              <span>
                {sel.width} × {sel.height} px
              </span>
              <small>
                ({sel.x}, {sel.y})
              </small>
            </div>

            {/* 8 方向缩放控制手柄 */}
            {HANDLE_DIRS.map((dir) => (
              <span
                key={dir}
                data-handle={dir}
                className="af-capture-stage__handle"
                onPointerDown={(e) => startDrag(dir, e)}
              />
            ))}
          </div>

          <div className="af-capture-stage__mask-side af-capture-stage__mask-side--fill" />
        </div>

        <div className="af-capture-stage__mask-band af-capture-stage__mask-band--fill" />
      </div>

      {/* 跟随光标自动四边避让的 7×7 像素级网格放大镜 */}
      {showLoupe ? (
        <div
          className="af-capture-loupe"
          data-flipped-x={loupeFlipX ? "true" : undefined}
          data-flipped-y={loupeFlipY ? "true" : undefined}
          style={{ transform: `translate3d(${loupeLeft}px, ${loupeTop}px, 0)` }}
          aria-label="像素放大镜与取色器"
        >
          <div className="af-capture-loupe__grid" aria-hidden="true">
            {Array.from({ length: 7 }, (_, rowIdx) => (
              <div key={rowIdx} className="af-capture-loupe__row">
                {Array.from({ length: 7 }, (__, colIdx) => {
                  const isCenter = rowIdx === 3 && colIdx === 3;
                  const cellColor = sampleDemoPixel(
                    Math.round(cursor.x) + (colIdx - 3) * 6,
                    Math.round(cursor.y) + (rowIdx - 3) * 6,
                  );
                  return (
                    <span
                      key={colIdx}
                      className="af-capture-loupe__cell"
                      data-center={isCenter ? "true" : undefined}
                      style={{ background: cellColor.hex }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="af-capture-loupe__readout">
            <div className="af-capture-loupe__hex-row">
              <i style={{ background: currentSample.hex }} aria-hidden="true" />
              <strong>{currentSample.hex}</strong>
              <span>RGB({currentSample.rgb})</span>
            </div>
            <span className="af-capture-loupe__kbd">
              {copiedHex === currentSample.hex ? "已复制色值" : "按 C 复制色值"}
            </span>
          </div>
        </div>
      ) : null}

      {/* 近底边自动翻转避让的浮动标注与动作工具条 */}
      <div
        className="af-capture-toolbar"
        data-flipped={toolbarNearBottom ? "true" : undefined}
        style={{ transform: `translate3d(${toolbarLeft}px, ${toolbarTop}px, 0)` }}
        role="toolbar"
        aria-label="截图批注与识别工具栏"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {(
          [
            { key: "rect" as const, icon: "square", label: "矩形框注" },
            { key: "arrow" as const, icon: "arrowUpRight", label: "箭头指示" },
            { key: "pen" as const, icon: "pencil", label: "自由画笔" },
            { key: "mosaic" as const, icon: "grid", label: "隐私马赛克" },
            { key: "text" as const, icon: "code", label: "文字批注" },
          ] as const
        ).map((item) => (
          <AfIconButton
            key={item.key}
            size="sm"
            variant={tool === item.key ? "secondary" : "ghost"}
            icon={item.icon}
            aria-label={item.label}
            aria-pressed={tool === item.key}
            onClick={() => setTool(item.key)}
          />
        ))}

        <span className="af-capture-toolbar__sep" aria-hidden="true" />

        <AfButton
          size="sm"
          variant="secondary"
          icon="translate"
          onClick={() => onOcrTranslate?.(sel)}
        >
          截图翻译
        </AfButton>
        <AfIconButton
          size="sm"
          variant="ghost"
          icon="layers"
          aria-label="钉在桌面置顶对照"
          onClick={() => onPinToScreen?.(sel)}
        />
        <AfIconButton
          size="sm"
          variant="ghost"
          icon="download"
          aria-label="保存截图文件"
          onClick={() => onSaveFile?.(sel)}
        />
        <AfButton
          size="sm"
          variant="primary"
          icon="check"
          onClick={() => onConfirmCopy?.(sel)}
        >
          完成
        </AfButton>
      </div>
    </div>
  );
}
