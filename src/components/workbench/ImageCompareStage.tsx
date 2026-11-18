import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AfButton,
  AfIcon,
  AfIconButton,
  AfSegmented,
  AfTag,
  cn,
  useCanvasZoomPan,
  useControllableState,
} from "../../ui";

export type AfImageCompareMode =
  | "translated"
  | "original"
  | "side-by-side"
  | "wipe"
  | "segments";

export interface AfImageTranslationSegment {
  id: string;
  index: number;
  sourceText: string;
  translatedText: string;
  /** 图像内归一化锚点框百分比 `[0..100]`。 */
  box: { xPct: number; yPct: number; wPct: number; hPct: number };
}

export interface AfImageCompareStageProps {
  /** 受控对比模式（译后 / 原图 / 双视口同步缩放 / 卷帘擦除 / 逐句校对）。 */
  mode?: AfImageCompareMode;
  defaultMode?: AfImageCompareMode;
  onModeChange?: (mode: AfImageCompareMode) => void;
  /** 原图地址。 */
  originalSrc?: string;
  /** 译后或精修后图片地址。 */
  translatedSrc?: string;
  /** 卷帘模式分割百分比（`5–95`，默认 `52`）。 */
  wipePercent?: number;
  defaultWipePercent?: number;
  onWipePercentChange?: (pct: number) => void;
  /** 原译文逐句对照锚点数组。 */
  segments?: AfImageTranslationSegment[];
  /** 修改单句译文回调。 */
  onSegmentChange?: (id: string, nextTranslated: string) => void;
  className?: string;
}

const DEFAULT_ORIG_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="340" viewBox="0 0 560 340"><rect width="560" height="340" rx="12" fill="#182234"/><rect x="34" y="34" width="492" height="68" rx="8" fill="#24344f"/><text x="54" y="64" fill="#93c5fd" font-family="sans-serif" font-size="15" font-weight="700">DISTRIBUTED CACHE TOPOLOGY</text><text x="54" y="88" fill="#cbd5e1" font-family="sans-serif" font-size="12">Zero-copy shared memory ring buffer across worker threads</text><rect x="34" y="122" width="236" height="176" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/><text x="54" y="154" fill="#e2e8f0" font-family="sans-serif" font-size="13" font-weight="600">Primary Shard #01</text><text x="54" y="180" fill="#94a3b8" font-family="sans-serif" font-size="11">Throughput: 1.42M ops/sec</text><rect x="290" y="122" width="236" height="176" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/><text x="310" y="154" fill="#e2e8f0" font-family="sans-serif" font-size="13" font-weight="600">Replica Failover Pool</text><text x="310" y="180" fill="#94a3b8" font-family="sans-serif" font-size="11">Consensus quorum &lt; 8ms</text></svg>`,
  );

const DEFAULT_TRANS_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="340" viewBox="0 0 560 340"><rect width="560" height="340" rx="12" fill="#142329"/><rect x="34" y="34" width="492" height="68" rx="8" fill="#1d3842"/><text x="54" y="64" fill="#5eead4" font-family="sans-serif" font-size="15" font-weight="700">分布式缓存拓扑架构</text><text x="54" y="88" fill="#e2e8f0" font-family="sans-serif" font-size="12">跨工作线程的零拷贝共享内存环形缓冲区</text><rect x="34" y="122" width="236" height="176" rx="8" fill="#1a2e35" stroke="#14b8a6" stroke-width="1.5"/><text x="54" y="154" fill="#f1f5f9" font-family="sans-serif" font-size="13" font-weight="600">主分片节点 #01</text><text x="54" y="180" fill="#94a3b8" font-family="sans-serif" font-size="11">吞吐峰值：142 万次/秒</text><rect x="290" y="122" width="236" height="176" rx="8" fill="#1a2e35" stroke="#64748b" stroke-width="1.5"/><text x="310" y="154" fill="#f1f5f9" font-family="sans-serif" font-size="13" font-weight="600">副本故障转移池</text><text x="310" y="180" fill="#94a3b8" font-family="sans-serif" font-size="11">共识仲裁延迟 &lt; 8 毫秒</text></svg>`,
  );

const DEFAULT_SEGMENTS: AfImageTranslationSegment[] = [
  {
    id: "seg-1",
    index: 1,
    sourceText: "DISTRIBUTED CACHE TOPOLOGY",
    translatedText: "分布式缓存拓扑架构",
    box: { xPct: 6, yPct: 10, wPct: 88, hPct: 20 },
  },
  {
    id: "seg-2",
    index: 2,
    sourceText: "Primary Shard #01 · Throughput: 1.42M ops/sec",
    translatedText: "主分片节点 #01 · 吞吐峰值：142 万次/秒",
    box: { xPct: 6, yPct: 36, wPct: 42, hPct: 52 },
  },
  {
    id: "seg-3",
    index: 3,
    sourceText: "Replica Failover Pool · Consensus quorum < 8ms",
    translatedText: "副本故障转移池 · 共识仲裁延迟 < 8 毫秒",
    box: { xPct: 52, yPct: 36, wPct: 42, hPct: 52 },
  },
];

/**
 * 图像精修与译图对比工作台（`P3-1`）：
 * - 顶部 `<AfSegmented>` 五态切换：`translated` / `original` / `side-by-side`（双视口共享同一组 `useCanvasZoomPan` 同步缩放平移！）/ `wipe`（`setPointerCapture` 拖拽分割卷帘）/ `segments`（图内锚点联动双语逐句校对侧栏）。
 */
export function AfImageCompareStage({
  mode: modeProp,
  defaultMode = "wipe",
  onModeChange,
  originalSrc = DEFAULT_ORIG_SVG,
  translatedSrc = DEFAULT_TRANS_SVG,
  wipePercent: wipeProp,
  defaultWipePercent = 52,
  onWipePercentChange,
  segments = DEFAULT_SEGMENTS,
  onSegmentChange,
  className,
}: AfImageCompareStageProps = {}) {
  const [mode, setMode] = useControllableState<AfImageCompareMode>({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const [wipePct, setWipePct] = useControllableState<number>({
    value: wipeProp,
    defaultValue: defaultWipePercent,
    onChange: onWipePercentChange,
  });

  const [activeSegId, setActiveSegId] = useState<string>(segments[0]?.id ?? "");
  const [localSegments, setLocalSegments] = useState<AfImageTranslationSegment[]>(segments);

  useEffect(() => {
    setLocalSegments(segments);
    setActiveSegId((prev) =>
      segments.some((s) => s.id === prev) ? prev : (segments[0]?.id ?? ""),
    );
  }, [segments]);

  const rightViewportRef = useRef<HTMLDivElement>(null);
  // 左右并排与单视口共享同一组物理缩放平移状态（双视口同时注册非被动滚轮锚点缩放）
  const zoomPan = useCanvasZoomPan<HTMLDivElement>({
    allowLeftDragPan: mode !== "wipe",
    secondaryViewportRef: mode === "side-by-side" ? rightViewportRef : undefined,
  });

  const wipeContainerRef = useRef<HTMLDivElement>(null);
  const wipeDraggingRef = useRef<number | null>(null);

  const updateWipeFromClientX = (clientX: number) => {
    const el = wipeContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setWipePct(Math.max(5, Math.min(95, Math.round(pct * 10) / 10)));
  };

  const handleWipeDown = (e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
    wipeDraggingRef.current = e.pointerId;
    updateWipeFromClientX(e.clientX);
  };

  const handleWipeMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (wipeDraggingRef.current !== e.pointerId) return;
    updateWipeFromClientX(e.clientX);
  };

  const handleWipeUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (wipeDraggingRef.current !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    wipeDraggingRef.current = null;
  };

  return (
    <section className={cn("af-img-compare", className)} aria-label="图像精修与译图对比工作台">
      {/* 顶栏：五态模式切换 + 光标锚点缩放控制 */}
      <div className="af-img-compare__bar">
        <AfSegmented<AfImageCompareMode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: "translated", label: "译后成片" },
            { value: "original", label: "原图" },
            { value: "side-by-side", label: "双栏同步缩放" },
            { value: "wipe", label: "分割卷帘" },
            { value: "segments", label: "逐句校对" },
          ]}
        />

        <div className="af-img-compare__zoom-controls">
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="zoomOut"
            aria-label="缩小画布"
            onClick={zoomPan.zoomOut}
          />
          <span className="af-img-compare__zoom-pct" data-zoom={zoomPan.zoom.toFixed(2)}>
            {Math.round(zoomPan.zoom * 100)}%
          </span>
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="zoomIn"
            aria-label="放大画布"
            onClick={zoomPan.zoomIn}
          />
          <AfButton size="sm" variant="secondary" onClick={zoomPan.resetFit}>
            自适应复位
          </AfButton>
        </div>
      </div>

      <div key={mode} className="af-pj-panel-in">
      {/* 模式 1 & 2：单视口译后图 / 原图 */}
      {mode === "translated" || mode === "original" ? (
        <div
          ref={zoomPan.viewportRef}
          {...zoomPan.bindViewport}
          className="af-img-compare__viewport"
        >
          <div className="af-img-compare__canvas" style={zoomPan.canvasStyle}>
            <img
              src={mode === "translated" ? translatedSrc : originalSrc}
              alt={mode === "translated" ? "译后成片" : "原始图像"}
              draggable={false}
            />
          </div>
        </div>
      ) : null}

      {/* 模式 3：左右双视口共享 useCanvasZoomPan 同步缩放平移 */}
      {mode === "side-by-side" ? (
        <div className="af-img-compare__sbs">
          <div
            ref={zoomPan.viewportRef}
            {...zoomPan.bindViewport}
            className="af-img-compare__viewport af-img-compare__viewport--half"
            data-pane="original"
          >
            <span className="af-img-compare__pane-badge">原图对照</span>
            <div className="af-img-compare__canvas" style={zoomPan.canvasStyle}>
              <img src={originalSrc} alt="原图对照" draggable={false} />
            </div>
          </div>

          <div
            ref={rightViewportRef}
            {...zoomPan.bindViewport}
            className="af-img-compare__viewport af-img-compare__viewport--half"
            data-pane="translated"
          >
            <span className="af-img-compare__pane-badge af-img-compare__pane-badge--accent">
              译后成片 · 同步缩放
            </span>
            <div className="af-img-compare__canvas" style={zoomPan.canvasStyle}>
              <img src={translatedSrc} alt="译后对照" draggable={false} />
            </div>
          </div>
        </div>
      ) : null}

      {/* 模式 4：指针捕获拖拽分割卷帘（Split Wipe） */}
      {mode === "wipe" ? (
        <div
          ref={wipeContainerRef}
          className="af-img-compare__wipe"
          data-wipe-pct={wipePct}
          onPointerDown={handleWipeDown}
          onPointerMove={handleWipeMove}
          onPointerUp={handleWipeUp}
          onPointerCancel={handleWipeUp}
        >
          <img
            src={translatedSrc}
            alt="底层译后成片"
            className="af-img-compare__wipe-base"
            draggable={false}
          />
          <img
            src={originalSrc}
            alt="顶层原图卷帘"
            className="af-img-compare__wipe-top"
            style={{ clipPath: `inset(0 ${(100 - wipePct).toFixed(2)}% 0 0)` }}
            draggable={false}
          />
          <span className="af-img-compare__pane-badge">原图 {Math.round(wipePct)}%</span>
          <span className="af-img-compare__pane-badge af-img-compare__pane-badge--right">
            译后 {Math.round(100 - wipePct)}%
          </span>

          <div
            className="af-img-compare__wipe-line"
            style={{ left: `${wipePct}%` }}
            role="slider"
            tabIndex={0}
            aria-label="左右推拉对比卷帘"
            aria-valuemin={5}
            aria-valuemax={95}
            aria-valuenow={Math.round(wipePct)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setWipePct(Math.max(5, wipePct - 5));
              else if (e.key === "ArrowRight") setWipePct(Math.min(95, wipePct + 5));
            }}
          >
            <span className="af-img-compare__wipe-knob">
              <AfIcon name="chevronLeft" size={11} />
              <AfIcon name="chevronRight" size={11} />
            </span>
          </div>
        </div>
      ) : null}

      {/* 模式 5：带图内锚点高亮的原译文逐句对照侧栏 */}
      {mode === "segments" ? (
        <div className="af-img-compare__segments">
          <div className="af-img-compare__seg-stage">
            <img src={translatedSrc} alt="带锚点译后画面" draggable={false} />
            {localSegments.map((seg) => {
              const active = seg.id === activeSegId;
              return (
                <button
                  key={seg.id}
                  type="button"
                  className="af-img-compare__anchor"
                  data-active={active ? "true" : undefined}
                  style={{
                    left: `${seg.box.xPct}%`,
                    top: `${seg.box.yPct}%`,
                    width: `${seg.box.wPct}%`,
                    height: `${seg.box.hPct}%`,
                  }}
                  aria-label={`定位区块 #${seg.index}`}
                  onClick={() => setActiveSegId(seg.id)}
                >
                  <span>#{seg.index}</span>
                </button>
              );
            })}
          </div>

          <div className="af-img-compare__seg-list" role="list" aria-label="原译文逐句校对">
            {localSegments.map((seg) => {
              const active = seg.id === activeSegId;
              return (
                <div
                  key={seg.id}
                  role="listitem"
                  className="af-img-compare__seg-card"
                  data-active={active ? "true" : undefined}
                  onClick={() => setActiveSegId(seg.id)}
                >
                  <div className="af-img-compare__seg-head">
                    <AfTag tone={active ? "accent" : "neutral"} size="sm">
                      区块 #{seg.index}
                    </AfTag>
                    <span>识别置信度 99%</span>
                  </div>
                  <p className="af-img-compare__seg-src">{seg.sourceText}</p>
                  <input
                    type="text"
                    className="af-img-compare__seg-input"
                    value={seg.translatedText}
                    aria-label={`编辑区块 ${seg.index} 译文`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalSegments((prev) =>
                        prev.map((item) =>
                          item.id === seg.id ? { ...item, translatedText: val } : item,
                        ),
                      );
                      onSegmentChange?.(seg.id, val);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}
