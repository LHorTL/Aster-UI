import { useEffect, useState, type CSSProperties } from "react";
import {
  AfIconButton,
  AfSegmented,
  AfSwitch,
  AfTag,
  cn,
  useControllableState,
} from "../../ui";

export type AfPreviewAspectRatio = "16:9" | "9:16" | "3:4" | "1:1";

export interface AfPreviewSlideItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
}

export interface AfAspectPreviewStageProps {
  /** 比例预设（`16:9 | 9:16 | 3:4 | 1:1`）。 */
  aspect?: AfPreviewAspectRatio;
  defaultAspect?: AfPreviewAspectRatio;
  onAspectChange?: (aspect: AfPreviewAspectRatio) => void;
  /** 是否开启手机仿真圆角灵动岛外框。 */
  phoneBezel?: boolean;
  defaultPhoneBezel?: boolean;
  onPhoneBezelChange?: (enabled: boolean) => void;
  /** 是否显示三分法九宫格安全线。 */
  showSafeGrid?: boolean;
  defaultShowSafeGrid?: boolean;
  onShowSafeGridChange?: (enabled: boolean) => void;
  /** 多图轮播页列表（用于社交图文/分镜预览）。 */
  slides?: AfPreviewSlideItem[];
  /** 当前帧号（30fps 基准）。 */
  currentFrame?: number;
  defaultCurrentFrame?: number;
  onCurrentFrameChange?: (frame: number) => void;
  totalFrames?: number;
  className?: string;
}

const DEFAULT_SLIDES: AfPreviewSlideItem[] = [
  {
    id: "sl-1",
    title: "秋日城市漫步 · 周末摄影调色指南",
    subtitle: "柔和暖调高光过渡 · 街景光影构图与成片参数分享",
    badge: "封面 01 / 03",
  },
  {
    id: "sl-2",
    title: "双语字幕排版与画面安全区参考",
    subtitle: "自动避让底部标题栏与右侧互动按钮遮挡区域",
    badge: "内页 02 / 03",
  },
  {
    id: "sl-3",
    title: "多比例封面裁切与高清成片导出",
    subtitle: "一键切换横屏视频、竖屏短片与图文笔记画幅",
    badge: "尾页 03 / 03",
  },
];

function aspectDimensions(ratio: AfPreviewAspectRatio): CSSProperties {
  if (ratio === "16:9") return { width: 460, height: 258 };
  if (ratio === "9:16") return { width: 186, height: 330 };
  if (ratio === "3:4") return { width: 246, height: 328 };
  return { width: 296, height: 296 };
}

/**
 * 多媒体监视器与社交真机比例预览舞台（`P3-2`）：
 * - 支持 `16:9` 横屏监视器、`9:16` 短视频竖屏、`3:4` 社交图文、`1:1` 方形自适应居中切换；
 * - 内置可选「手机灵动岛仿真外框」、纯 Flexbox 三分法九宫格安全线、多图轮播圆点及底部逐帧传输控制条。
 */
export function AfAspectPreviewStage({
  aspect: aspectProp,
  defaultAspect = "3:4",
  onAspectChange,
  phoneBezel: bezelProp,
  defaultPhoneBezel = true,
  onPhoneBezelChange,
  showSafeGrid: gridProp,
  defaultShowSafeGrid = true,
  onShowSafeGridChange,
  slides = DEFAULT_SLIDES,
  currentFrame: frameProp,
  defaultCurrentFrame = 240,
  onCurrentFrameChange,
  totalFrames = 900,
  className,
}: AfAspectPreviewStageProps = {}) {
  const [aspect, setAspect] = useControllableState<AfPreviewAspectRatio>({
    value: aspectProp,
    defaultValue: defaultAspect,
    onChange: onAspectChange,
  });
  const [phoneBezel, setPhoneBezel] = useControllableState<boolean>({
    value: bezelProp,
    defaultValue: defaultPhoneBezel,
    onChange: onPhoneBezelChange,
  });
  const [safeGrid, setSafeGrid] = useControllableState<boolean>({
    value: gridProp,
    defaultValue: defaultShowSafeGrid,
    onChange: onShowSafeGridChange,
  });
  const [slideIdx, setSlideIdx] = useState(0);
  const [frame, setFrame] = useControllableState<number>({
    value: frameProp,
    defaultValue: defaultCurrentFrame,
    onChange: onCurrentFrameChange,
  });
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || typeof window === "undefined") return;
    const id = window.setInterval(() => {
      setFrame((prev) => (prev >= totalFrames ? 0 : prev + 1));
    }, 33);
    return () => window.clearInterval(id);
  }, [playing, totalFrames, setFrame]);

  const safeSlideIdx = slides.length > 0 ? Math.min(slideIdx, slides.length - 1) : 0;
  const activeSlide = slides[safeSlideIdx] ?? slides[0];
  const dims = aspectDimensions(aspect);

  return (
    <section className={cn("af-aspect-stage", className)} aria-label="多比例真机与监视器预览舞台">
      {/* 顶栏：比例切换 + 手机外框开关 + 九宫格安全线开关 */}
      <div className="af-aspect-stage__bar">
        <AfSegmented<AfPreviewAspectRatio>
          size="xs"
          value={aspect}
          onChange={setAspect}
          options={[
            { value: "16:9", label: "16:9 横屏" },
            { value: "9:16", label: "9:16 竖屏" },
            { value: "3:4", label: "3:4 图文" },
            { value: "1:1", label: "1:1 方形" },
          ]}
        />

        <div className="af-aspect-stage__toggles">
          <label className="af-aspect-stage__toggle">
            <AfSwitch
              size="sm"
              checked={phoneBezel}
              onCheckedChange={setPhoneBezel}
              aria-label="切换手机仿真外框"
            />
            <span>真机外框</span>
          </label>
          <label className="af-aspect-stage__toggle">
            <AfSwitch
              size="sm"
              checked={safeGrid}
              onCheckedChange={setSafeGrid}
              aria-label="切换九宫格安全线"
            />
            <span>九宫格线</span>
          </label>
        </div>
      </div>

      {/* 中部居中自适应比例画布 */}
      <div className="af-aspect-stage__canvas">
        <div
          className="af-aspect-stage__device"
          data-bezel={phoneBezel ? "true" : undefined}
          data-aspect={aspect}
          style={dims}
        >
          {phoneBezel && (aspect === "9:16" || aspect === "3:4") ? (
            <span className="af-aspect-stage__island" aria-hidden="true" />
          ) : null}

          {activeSlide ? (
            <div key={activeSlide.id} className="af-aspect-stage__slide af-pj-panel-in">
              <AfTag tone="accent" size="sm">
                {activeSlide.badge}
              </AfTag>
              <h4>{activeSlide.title}</h4>
              <p>{activeSlide.subtitle}</p>
            </div>
          ) : null}

          {/* 纯 Flexbox 三分法九宫格参考线（零 CSS Grid） */}
          {safeGrid ? (
            <div className="af-aspect-stage__grid" aria-hidden="true">
              <span className="af-aspect-stage__vline af-aspect-stage__vline--1" />
              <span className="af-aspect-stage__vline af-aspect-stage__vline--2" />
              <span className="af-aspect-stage__hline af-aspect-stage__hline--1" />
              <span className="af-aspect-stage__hline af-aspect-stage__hline--2" />
            </div>
          ) : null}

          {/* 多图轮播指示点 */}
          {slides.length > 1 ? (
            <div className="af-aspect-stage__dots" role="tablist" aria-label="切换图文分页">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === safeSlideIdx}
                  aria-label={`第 ${idx + 1} 页`}
                  className="af-aspect-stage__dot"
                  data-active={idx === safeSlideIdx ? "true" : undefined}
                  onClick={() => setSlideIdx(idx)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部逐帧传输控制条 */}
      <div className="af-aspect-stage__transport">
        <div className="af-aspect-stage__frame-btns">
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="chevronLeft"
            aria-label="上一帧"
            onClick={() => setFrame((f) => Math.max(0, f - 1))}
          />
          <AfIconButton
            size="sm"
            variant="secondary"
            icon={playing ? "pause" : "play"}
            aria-label={playing ? "暂停" : "播放"}
            onClick={() => setPlaying((p) => !p)}
          />
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="chevronRight"
            aria-label="下一帧"
            onClick={() => setFrame((f) => Math.min(totalFrames, f + 1))}
          />
        </div>

        <span className="af-aspect-stage__readout">
          第 {frame} / {totalFrames} 帧 · {(frame / 30).toFixed(2)}s
        </span>

        <AfTag tone="neutral" size="sm">
          {aspect} 预览
        </AfTag>
      </div>
    </section>
  );
}
