import { forwardRef, useState } from "react";
import {
  AfButton,
  AfIcon,
  AfLayeredImage,
  AfModal,
  AfSegmented,
  AfSkeleton,
  AfTag,
  AfTooltip,
  cn,
  useControllableState,
  type AfLayeredImageLayer,
} from "../../ui";
import { AfLineChart, AfSwap, type AfLineSeries } from "../../ui-pro";

export type AfViewportLightingPreset = "studio" | "moonlight" | "warm";

export interface AfCanvasViewportShellProps {
  /** 是否处于引擎资源加载骨架态。 */
  loading?: boolean;
  /** WebGL 上下文是否丢失（展示友好恢复降级态）。 */
  contextLost?: boolean;
  /** 实时帧率读数（`tabular-nums`）。 */
  fps?: number;
  /** 自动旋转开关。 */
  autoRotate?: boolean;
  defaultAutoRotate?: boolean;
  onAutoRotateChange?: (enabled: boolean) => void;
  /** 灯光档位预设。 */
  lighting?: AfViewportLightingPreset;
  defaultLighting?: AfViewportLightingPreset;
  onLightingChange?: (preset: AfViewportLightingPreset) => void;
  /** 视角复位回调。 */
  onResetCamera?: () => void;
  /** 上下文丢失恢复回调。 */
  onRestoreContext?: () => void;
  className?: string;
}

/**
 * 通用外部 WebGL / 360° 3D 画布挂载壳（`P2-4`）：
 * - 通过 `ref` 暴露 `<canvas>` 挂载点给外部 Three.js / Babylon 引擎；
 * - 内置加载骨架、帧率胶囊、自动旋转、灯光档位切换与 WebGL 上下文丢失降级态。
 */
export const AfCanvasViewportShell = forwardRef<HTMLCanvasElement, AfCanvasViewportShellProps>(
  function AfCanvasViewportShell(
    {
      loading = false,
      contextLost = false,
      fps = 60,
      autoRotate: autoRotateProp,
      defaultAutoRotate = true,
      onAutoRotateChange,
      lighting: lightingProp,
      defaultLighting = "studio",
      onLightingChange,
      onResetCamera,
      onRestoreContext,
      className,
    },
    canvasRef,
  ) {
    const [autoRotate, setAutoRotate] = useControllableState<boolean>({
      value: autoRotateProp,
      defaultValue: defaultAutoRotate,
      onChange: onAutoRotateChange,
    });
    const [lighting, setLighting] = useControllableState<AfViewportLightingPreset>({
      value: lightingProp,
      defaultValue: defaultLighting,
      onChange: onLightingChange,
    });

    return (
      <div
        className={cn("af-canvas-shell", className)}
        data-lighting={lighting}
        aria-label="360度 3D 检视视口"
      >
        <canvas ref={canvasRef} className="af-canvas-shell__canvas" />

        {/* 无外部引擎注入时的线框模型台底座示意 */}
        {!loading && !contextLost ? (
          <div className="af-canvas-shell__wireframe" aria-hidden="true">
            <svg viewBox="0 0 240 200" width="210" height="175" fill="none">
              <ellipse cx="120" cy="166" rx="78" ry="18" stroke="currentColor" strokeOpacity="0.28" strokeDasharray="4 4" />
              <ellipse cx="120" cy="166" rx="48" ry="10" stroke="currentColor" strokeOpacity="0.45" />
              <path d="M120 34 L148 92 L134 156 L106 156 L92 92 Z" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.25" />
              <circle cx="120" cy="48" r="14" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.25" />
              <path d="M82 96 Q120 118 158 96" stroke="currentColor" strokeOpacity="0.38" />
            </svg>
            <span>360° 三维模型预览就绪 · 拖拽旋转 / 滚轮缩放</span>
          </div>
        ) : null}

        {loading ? (
          <div className="af-canvas-shell__overlay">
            <AfSkeleton width={160} height={16} />
            <span>正在加载高精度网格拓扑与 PBR 材质贴图…</span>
          </div>
        ) : null}

        {contextLost ? (
          <div className="af-canvas-shell__overlay af-canvas-shell__overlay--lost" role="alert">
            <AfIcon name="alert" size={20} />
            <strong>3D 实时预览已暂停</strong>
            <span>系统省电策略或图形设备重置暂停了 3D 画面，已保留静态立绘展示</span>
            <AfButton size="sm" variant="secondary" icon="refresh" onClick={onRestoreContext}>
              恢复 3D 预览
            </AfButton>
          </div>
        ) : null}

        {/* 顶部帧率与光效状态角标 */}
        <div
          className="af-canvas-shell__hud-top"
          aria-hidden={loading || contextLost || undefined}
          {...(loading || contextLost ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
        >
          <span className="af-canvas-shell__fps">{fps} FPS</span>
          <AfSegmented<AfViewportLightingPreset>
            size="xs"
            value={lighting}
            onChange={setLighting}
            options={[
              { value: "studio", label: "影棚光" },
              { value: "moonlight", label: "月华冷光" },
              { value: "warm", label: "暮色暖金" },
            ]}
          />
        </div>

        {/* 底部控制胶囊条 */}
        <div
          className="af-canvas-shell__hud-bottom"
          aria-hidden={loading || contextLost || undefined}
          {...(loading || contextLost ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
        >
          <button
            type="button"
            className="af-canvas-shell__ctrl"
            data-active={autoRotate ? "true" : undefined}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            <AfIcon name="refresh" size={12} />
            <span>{autoRotate ? "环绕旋转中" : "已暂停旋转"}</span>
          </button>
          <button type="button" className="af-canvas-shell__ctrl" onClick={onResetCamera}>
            <AfIcon name="target" size={12} />
            <span>复位正视角</span>
          </button>
        </div>
      </div>
    );
  },
);

export type AfGoodsStageMode = "layers" | "viewport3d";
export type AfGoodsInspectorTab = "attrs" | "wardrobe" | "trend";

export interface AfGoodsWardrobeSlice {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface AfMarketGoodsModalProps {
  /** 弹窗受控开关（省略时默认 `inline` 舞台渲染）。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 内联舞台预览模式。 */
  inline?: boolean;
  /** 商品标题。 */
  title?: string;
  /** 商品编号。 */
  code?: string;
  /** 生态与规格标签（如 `"实时渲染 · Unreal Engine 5"`）。 */
  serverLabel?: string;
  /** 售价（元）。 */
  priceCny?: number;
  /** 左侧检视模式（多层渲染合成 / 3D 视口）。 */
  stageMode?: AfGoodsStageMode;
  defaultStageMode?: AfGoodsStageMode;
  onStageModeChange?: (mode: AfGoodsStageMode) => void;
  /** 多层叠加通道图层。 */
  layers?: AfLayeredImageLayer[];
  /** 资产包交付物分布段。 */
  wardrobeSlices?: AfGoodsWardrobeSlice[];
  /** 近 30 天同款成交均价标签与序列。 */
  priceTrendLabels?: string[];
  priceTrendSeries?: AfLineSeries[];
  /** 关注比价切换回调。 */
  onToggleWatch?: (watched: boolean) => void;
  /** 立即锁单购买回调。 */
  onLockOrder?: () => void;
  className?: string;
}

const LAYER_BG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="284" viewBox="0 0 440 284" preserveAspectRatio="xMidYMid slice"><rect width="440" height="284" fill="#131926"/><circle cx="220" cy="134" r="98" fill="#1d2b4a" opacity="0.65"/></svg>`,
  );
const LAYER_CHAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="284" viewBox="0 0 440 284" preserveAspectRatio="xMidYMid meet"><path d="M220 50 L258 128 L244 236 L196 236 L182 128 Z" fill="#3b82f6" opacity="0.82"/><circle cx="220" cy="70" r="20" fill="#93c5fd"/></svg>`,
  );
const LAYER_CLOAK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="284" viewBox="0 0 440 284" preserveAspectRatio="xMidYMid meet"><path d="M150 98 Q220 56 290 98 L306 220 Q220 198 134 220 Z" fill="none" stroke="#60a5fa" stroke-width="3" stroke-dasharray="6 4"/></svg>`,
  );

const DEFAULT_GOODS_LAYERS: AfLayeredImageLayer[] = [
  { src: LAYER_BG, alt: "环境光晕底图" },
  { src: LAYER_CHAR, alt: "高精度网格渲染主体" },
  { src: LAYER_CLOAK, alt: "线框拓扑与边缘光叠加层" },
];

const DEFAULT_WARDROBE: AfGoodsWardrobeSlice[] = [
  { key: "mesh", label: "多级 LOD 网格模型", count: 28, color: "var(--af-series-1)" },
  { key: "tex", label: "4K PBR 材质贴图", count: 14, color: "var(--af-series-2)" },
  { key: "rig", label: "骨骼与面部控制器", count: 19, color: "var(--af-series-3)" },
  { key: "scene", label: "示例关卡与灯光预设", count: 7, color: "var(--af-series-4)" },
];

const DEFAULT_TREND_LABELS = ["10-18", "10-23", "10-28", "11-02", "11-07", "11-12", "11-16"];
const DEFAULT_TREND_SERIES: AfLineSeries[] = [
  { name: "同规格授权均价 (¥)", values: [4120, 4190, 4080, 4260, 4350, 4290, 4280] },
];

const CORE_ATTRS = [
  { label: "拓扑面数规格", value: "48,400 面", tip: "LOD0 48,400 三角面 / LOD3 3,200 三角面全四边面拓扑" },
  { label: "贴图与着色器", value: "4K UDIM · 6 通道", tip: "含 BaseColor / Normal / ORM / Emissive 全套无损贴图" },
  { label: "交付资产总量", value: "68 项独立组件", tip: "含完整源工程文件、绑定预设与可复用材质实例" },
  { label: "商业授权状态", value: "平台存证即时签发", tip: "付款后自动签发团队商业授权书并开放云端高速拉取" },
];

/**
 * 数字资产交易市场 · `1120px` 宽屏商品深度检视窗：
 * - 左栏切换 `AfLayeredImage` 多层通道叠加合成与 `AfCanvasViewportShell` 360° 3D 视口；
 * - 右栏整合规格悬停浮层、资产包多段配比退暗条及 `AfLineChart` 近 30 天成交均价走势。
 */
export function AfMarketGoodsModal({
  open,
  onOpenChange,
  inline,
  title = "次世代影视级赛博义体角色 · 含全套面部表情绑定",
  code = "AST-20261116-8821",
  serverLabel = "实时渲染 · Unreal Engine 5",
  priceCny = 4280,
  stageMode: stageProp,
  defaultStageMode = "layers",
  onStageModeChange,
  layers = DEFAULT_GOODS_LAYERS,
  wardrobeSlices = DEFAULT_WARDROBE,
  priceTrendLabels = DEFAULT_TREND_LABELS,
  priceTrendSeries = DEFAULT_TREND_SERIES,
  onToggleWatch,
  onLockOrder,
  className,
}: AfMarketGoodsModalProps = {}) {
  const isInline = inline ?? open === undefined;
  const [stageMode, setStageMode] = useControllableState<AfGoodsStageMode>({
    value: stageProp,
    defaultValue: defaultStageMode,
    onChange: onStageModeChange,
  });
  const [tab, setTab] = useState<AfGoodsInspectorTab>("trend");
  const [showCloakLayer, setShowCloakLayer] = useState(true);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);

  const activeLayers = showCloakLayer ? layers : layers.slice(0, 2);
  const totalWardrobe = wardrobeSlices.reduce((s, x) => s + x.count, 0) || 1;

  const content = (
    <div className={cn("af-mkt-goods", isInline && "af-mkt-goods--inline", className)}>
      {/* 左栏：多层外观检视 / 3D 视口切换 */}
      <div className="af-mkt-goods__stage">
        <div className="af-mkt-goods__stage-bar">
          <AfSegmented<AfGoodsStageMode>
            size="xs"
            value={stageMode}
            onChange={setStageMode}
            options={[
              { value: "layers", label: "多层通道渲染" },
              { value: "viewport3d", label: "360° 实机环视" },
            ]}
          />
          {stageMode === "layers" ? (
            <button
              type="button"
              className="af-mkt-goods__layer-toggle"
              data-active={showCloakLayer ? "true" : undefined}
              onClick={() => setShowCloakLayer((v) => !v)}
            >
              <AfIcon name={showCloakLayer ? "eye" : "eyeOff"} size={12} />
              <span>线框轮廓层</span>
            </button>
          ) : null}
        </div>

        <div className="af-mkt-goods__viewport">
          <AfSwap swapKey={stageMode}>
            {stageMode === "layers" ? (
              <AfLayeredImage layers={activeLayers} width="100%" height={284} />
            ) : (
              <AfCanvasViewportShell />
            )}
          </AfSwap>
        </div>
      </div>

      {/* 右栏：价格头 + 核心指标 + 资产包构成 + 近 30 天成交均价折线图 */}
      <div className="af-mkt-goods__inspector">
        <div className="af-mkt-goods__head">
          <div className="af-mkt-goods__meta">
            <span>
              {code} · {serverLabel}
            </span>
            <h3>{title}</h3>
          </div>
          <div className="af-mkt-goods__price-box">
            <strong>¥ {priceCny.toLocaleString("en-US")}</strong>
            <AfTag tone="success" size="sm">
              支持授权秒签发
            </AfTag>
          </div>
        </div>

        <div className="af-mkt-goods__attrs">
          {CORE_ATTRS.map((attr) => (
            <AfTooltip key={attr.label} content={attr.tip}>
              <div className="af-mkt-goods__attr-card" tabIndex={0}>
                <span>{attr.label}</span>
                <strong>{attr.value}</strong>
              </div>
            </AfTooltip>
          ))}
        </div>

        {/* 资产包构成多段退暗联动条 */}
        <div className="af-mkt-goods__wardrobe">
          <div className="af-mkt-goods__sec-head">
            <strong>数字资产包交付构成 ({totalWardrobe} 项标准组件)</strong>
          </div>
          <div className="af-mkt-goods__bar">
            {wardrobeSlices.map((sl) => (
              <span
                key={sl.key}
                className="af-mkt-goods__bar-seg"
                data-dim={hoveredSlice !== null && hoveredSlice !== sl.key ? "true" : undefined}
                style={{
                  width: `${(sl.count / totalWardrobe) * 100}%`,
                  background: sl.color,
                }}
                onPointerEnter={() => setHoveredSlice(sl.key)}
                onPointerLeave={() => setHoveredSlice(null)}
              />
            ))}
          </div>
          <div className="af-mkt-goods__legend">
            {wardrobeSlices.map((sl) => (
              <span
                key={sl.key}
                className="af-mkt-goods__legend-item"
                data-dim={hoveredSlice !== null && hoveredSlice !== sl.key ? "true" : undefined}
                onPointerEnter={() => setHoveredSlice(sl.key)}
                onPointerLeave={() => setHoveredSlice(null)}
              >
                <i style={{ background: sl.color }} aria-hidden="true" />
                <span>{sl.label}</span>
                <strong>{sl.count}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* 底部页签切换：成交走势折线图 / 过户保障说明 */}
        <div className="af-mkt-goods__chart-box">
          <div className="af-mkt-goods__sec-head">
            <AfSegmented<AfGoodsInspectorTab>
              size="xs"
              value={tab}
              onChange={setTab}
              options={[
                { value: "trend", label: "近 30 天同款均价" },
                { value: "attrs", label: "工程交付清单" },
                { value: "wardrobe", label: "平台担保保障" },
              ]}
            />
          </div>

          <AfSwap swapKey={tab}>
            {tab === "trend" ? (
              <AfLineChart
                label="近 30 天同款商品成交均价走势"
                height={146}
                labels={priceTrendLabels}
                series={priceTrendSeries}
                showLegend={false}
                format={(v) => `¥${Math.round(v)}`}
              />
            ) : tab === "attrs" ? (
              <div className="af-mkt-goods__tab-note">
                含 FBX / GLB / Blend 原生工程源文件 · 附带 18 组动作捕捉重定向预设与完整商业授权校验哈希。
              </div>
            ) : (
              <div className="af-mkt-goods__tab-note">
                平台资金全额托管：付款后自动校验资产包哈希完整性并签发授权证书，72 小时验收保护期安全护航。
              </div>
            )}
          </AfSwap>
        </div>

        <div className="af-mkt-goods__cta">
          <AfButton
            size="md"
            variant="secondary"
            icon="heart"
            aria-pressed={watched}
            onClick={() => {
              const next = !watched;
              setWatched(next);
              onToggleWatch?.(next);
            }}
          >
            {watched ? "已加入关注比价" : "加入关注比价"}
          </AfButton>
          <AfButton size="md" variant="primary" icon="wallet" onClick={onLockOrder}>
            立即锁单购买 (¥{priceCny.toLocaleString("en-US")})
          </AfButton>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <AfModal
      open={Boolean(open)}
      closable
      onClose={() => onOpenChange?.(false)}
      title={title}
      width={1120}
    >
      {content}
    </AfModal>
  );
}
