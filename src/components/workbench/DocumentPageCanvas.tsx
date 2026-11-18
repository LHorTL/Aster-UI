import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AfButton,
  AfIcon,
  AfIconButton,
  AfSegmented,
  AfTag,
  cn,
  useControllableState,
} from "../../ui";
import { useTween } from "../../ui-pro";

export type AfPaperThemeMode = "print-white" | "follow-theme";

export interface AfDocumentResumeBlock {
  id: string;
  heading: string;
  role?: string;
  period?: string;
  bullets: string[];
}

export interface AfDocumentPageCanvasProps {
  /** 纸张缩放百分比（`50–150`，默认 `85`）。 */
  zoomPercent?: number;
  defaultZoomPercent?: number;
  onZoomPercentChange?: (pct: number) => void;
  /** 纸张视觉底色策略（打印白底仿真 / 跟随深浅色主题）。 */
  paperTheme?: AfPaperThemeMode;
  defaultPaperTheme?: AfPaperThemeMode;
  onPaperThemeChange?: (theme: AfPaperThemeMode) => void;
  /** 单页 A4 安全高度阈值（px，超出时绘制跨页裁切预警虚线）。 */
  pageSafeHeight?: number;
  /** 当前预估内容高度（px，用于演示与实时监测分页溢出）。 */
  estimatedContentHeight?: number;
  /** 简历姓名标题。 */
  candidateName?: string;
  /** 职位副标题与联系方式。 */
  candidateMeta?: string;
  /** 章节正文块数组。 */
  blocks?: AfDocumentResumeBlock[];
  /** 自定义纸面内容渲染。 */
  children?: ReactNode;
  className?: string;
}

const DEFAULT_RESUME_BLOCKS: AfDocumentResumeBlock[] = [
  {
    id: "blk-1",
    heading: "核心工作经历 · 高级客户端研发工程师",
    role: "远川科技 · 桌面效率产品部",
    period: "2023.07 – 至今",
    bullets: [
      "负责跨平台桌面客户端核心模块架构升级，将冷启动耗时缩短 38%，显著提升多屏协同稳定性；",
      "搭建前端工程化与自动化质量保障体系，产物体积缩减 41%，支撑百万级日活版本平稳交付。",
    ],
  },
  {
    id: "blk-2",
    heading: "代表性项目 · 多模态图文翻译与字幕工作台",
    role: "技术负责人",
    period: "2024.03 – 2026.10",
    bullets: [
      "主导截图实时版面识别、原译文双栏同步缩放对照与专业术语词库匹配模块的设计与落地；",
      "构建音视频多轨时间轴与字幕批处理编辑器，实现百段长视频字幕流畅校对与多比例导出。",
    ],
  },
  {
    id: "blk-3",
    heading: "专业技能与开源实践",
    bullets: [
      "熟练掌握 TypeScript、React、Node.js、跨平台桌面应用开发及大规模复杂界面性能调优。",
    ],
  },
];

/**
 * 文档编排工作台 · A4 比例实时分页预览画布（`P3-3`）：
 * - 支持 `50% – 150%` 缩放胶囊与「适应窗口宽」一键复位；
 * - 实时监测内容总高超出单页 A4 安全高度时，在精确分页线位置绘制醒目的跨页裁剪预警虚线与溢出像素提示；
 * - 支持 `print-white`（打印仿真白纸，深色画布自动降眩光且零裸 `#hex` 违禁）与 `follow-theme` 双模式。
 */
export function AfDocumentPageCanvas({
  zoomPercent: zoomProp,
  defaultZoomPercent = 90,
  onZoomPercentChange,
  paperTheme: themeProp,
  defaultPaperTheme = "print-white",
  onPaperThemeChange,
  pageSafeHeight = 352,
  estimatedContentHeight: estimatedHeightProp,
  candidateName = "林星序 · Lin Xingxu",
  candidateMeta = "高级客户端研发工程师 · lin.xingxu@yuanchuan.cn · 上海",
  blocks = DEFAULT_RESUME_BLOCKS,
  children,
  className,
}: AfDocumentPageCanvasProps = {}) {
  const [zoomPct, setZoomPct] = useControllableState<number>({
    value: zoomProp,
    defaultValue: defaultZoomPercent,
    onChange: onZoomPercentChange,
  });

  const [paperTheme, setPaperTheme] = useControllableState<AfPaperThemeMode>({
    value: themeProp,
    defaultValue: defaultPaperTheme,
    onChange: onPaperThemeChange,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(400);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const syncHeight = () => {
      if (el.offsetHeight > 0) {
        setMeasuredHeight(el.offsetHeight);
      }
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [blocks, children]);

  const effectiveContentHeight = estimatedHeightProp ?? measuredHeight;
  const clampedZoom = Math.max(50, Math.min(150, zoomPct));
  const smoothZoomReadout = Math.round(useTween(clampedZoom, 220));
  const overflowPx = Math.max(0, effectiveContentHeight - pageSafeHeight);
  const scaleFactor = clampedZoom / 100;

  // 标准 A4 比例紧凑舞台基线宽度 500px，等比缩放整个纸面而避免仅缩宽导致正文重新断行
  const baseWidth = 500;
  const scaledWidth = Math.round(baseWidth * scaleFactor);
  const scaledHeight = Math.round(Math.max(360, effectiveContentHeight) * scaleFactor);

  const handleFitStageWidth = () => {
    const stageEl = stageRef.current;
    if (!stageEl || stageEl.clientWidth <= 0) {
      setZoomPct(100);
      return;
    }
    const available = Math.max(250, stageEl.clientWidth - 40);
    const fitPct = Math.max(50, Math.min(150, Math.round((available / baseWidth) * 100)));
    setZoomPct(fitPct);
  };

  return (
    <section className={cn("af-doc-canvas", className)} aria-label="A4 文档分页预览画布">
      {/* 顶栏：纸张模式切换 + 分页状态徽章 + 50%~150% 缩放控制 */}
      <div className="af-doc-canvas__bar">
        <div className="af-doc-canvas__bar-left">
          <AfSegmented<AfPaperThemeMode>
            size="xs"
            value={paperTheme}
            onChange={setPaperTheme}
            options={[
              { value: "print-white", label: "打印白纸仿真" },
              { value: "follow-theme", label: "跟随界面主题" },
            ]}
          />
          {overflowPx > 0 ? (
            <AfTag tone="warning" size="sm">
              跨页预警：超出单页 {overflowPx}px
            </AfTag>
          ) : (
            <AfTag tone="success" size="sm">
              单页 A4 完美闭合
            </AfTag>
          )}
        </div>

        <div className="af-doc-canvas__zoom">
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="zoomOut"
            aria-label="缩小纸张比例"
            onClick={() => setZoomPct(Math.max(50, clampedZoom - 10))}
          />
          <span className="af-doc-canvas__zoom-val">{smoothZoomReadout}%</span>
          <AfIconButton
            size="sm"
            variant="ghost"
            icon="zoomIn"
            aria-label="放大纸张比例"
            onClick={() => setZoomPct(Math.min(150, clampedZoom + 10))}
          />
          <AfButton size="sm" variant="secondary" onClick={handleFitStageWidth}>
            适应页宽
          </AfButton>
        </div>
      </div>

      {/* 居中灰底压暗衬垫舞台 */}
      <div ref={stageRef} className="af-doc-canvas__stage">
        <div
          className="af-doc-canvas__sizer"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <article
            ref={sheetRef}
            className="af-doc-canvas__sheet"
            data-paper-theme={paperTheme}
            style={{
              width: baseWidth,
              transform: `scale(${scaleFactor})`,
              transformOrigin: "top left",
            }}
            aria-label="A4 纸面实时排版预览"
          >
            <header className="af-doc-canvas__header">
              <h3>{candidateName}</h3>
              <p>{candidateMeta}</p>
            </header>

            {children ?? (
              <div className="af-doc-canvas__body">
                {blocks.map((blk) => (
                  <section key={blk.id} className="af-doc-canvas__sec">
                    <div className="af-doc-canvas__sec-head">
                      <strong>{blk.heading}</strong>
                      {blk.period ? <span>{blk.period}</span> : null}
                    </div>
                    {blk.role ? <div className="af-doc-canvas__sec-role">{blk.role}</div> : null}
                    <ul>
                      {blk.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {/* 跨页裁剪预警虚线（胶囊右上贴边悬置，避免遮挡末尾正文） */}
            {overflowPx > 0 ? (
              <div
                data-page-break="true"
                className="af-doc-canvas__page-break"
                style={{ top: pageSafeHeight }}
              >
                <span className="af-doc-canvas__break-pill">
                  <AfIcon name="alert" size={11} />
                  <span>第 1/2 页裁切线 · 超出 {overflowPx}px</span>
                </span>
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
