import { useEffect, useRef, useState } from "react";
import { AfIcon, type AfIconSlot } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import {
  AfAppMark,
  AfButton,
  AfDrawer,
  AfImagePreview,
  AfMenu,
  AfSelect,
  AfTag,
  type AfImagePreviewItem,
} from "../../ui";
import { VerifiedBadge } from "../_shared/project";
import type { AfStoreCardState, AfStoreVisibility } from "../project/ProjectStoreCard";

/** 应用权限风险等级。 */
export type AfStorePermissionRisk = "low" | "medium" | "high";

/** 应用声明的权限项。 */
export type AfStorePermissionItem = {
  key: string;
  scope: "filesystem" | "network" | "process" | "clipboard" | string;
  label: string;
  description: string;
  risk: AfStorePermissionRisk;
};

/** 历史发行版与变更记录。 */
export type AfStoreVersionRecord = {
  version: string;
  date: string;
  sizeLabel: string;
  notes: string[];
};

/** 470px 应用详情抽屉完整数据模型。 */
export type AfStoreAppDetail = {
  id: string;
  name: string;
  author: string;
  verified?: boolean;
  visibility?: AfStoreVisibility;
  icon: AfIconSlot;
  summary: string;
  description: string;
  version: string;
  updateVersion?: string;
  sizeLabel: string;
  minHostVersion: string;
  updatedAt: string;
  state: AfStoreCardState;
  screenshots: AfImagePreviewItem[];
  permissions: AfStorePermissionItem[];
  versions: AfStoreVersionRecord[];
};

/** 应用详情抽屉属性。 */
export type AfStoreAppDetailDrawerProps = {
  /** 是否打开抽屉；未传时默认以 `inline` 舞台卡片模式渲染，满足零参 SSR 与画廊展示。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 强制内联面板模式（不挂载全屏遮罩抽屉）。 */
  inline?: boolean;
  app?: AfStoreAppDetail;
  selectedRollbackVersion?: string;
  defaultSelectedRollbackVersion?: string;
  onSelectedRollbackVersionChange?: (version: string) => void;
  onPrimaryAction?: (app: AfStoreAppDetail) => void;
  onRollbackVersion?: (app: AfStoreAppDetail, targetVersion: string) => void;
  onUninstall?: (app: AfStoreAppDetail) => void;
  onOpenHomepage?: (app: AfStoreAppDetail) => void;
  className?: string;
};

const DEMO_SVG_SHOT_1 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380"><rect width="640" height="380" rx="18" fill="#18181b"/><rect x="24" y="24" width="160" height="332" rx="12" fill="#27272a"/><rect x="200" y="24" width="416" height="96" rx="12" fill="#27272a"/><rect x="200" y="136" width="200" height="220" rx="12" fill="#1e3a8a" fill-opacity="0.45"/><rect x="416" y="136" width="200" height="220" rx="12" fill="#27272a"/><circle cx="56" cy="56" r="14" fill="#3b82f6"/></svg>`,
  );

const DEMO_SVG_SHOT_2 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380"><rect width="640" height="380" rx="18" fill="#0f172a"/><rect x="32" y="32" width="576" height="64" rx="10" fill="#1e293b"/><path d="M56 280 L160 220 L270 245 L390 155 L500 180 L584 120" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="32" y="312" width="576" height="36" rx="8" fill="#1e293b"/></svg>`,
  );

const DEFAULT_APP_DETAIL: AfStoreAppDetail = {
  id: "translate-pro",
  name: "多模态截图互译台",
  author: "官方效率实验室",
  verified: true,
  visibility: "official",
  icon: "translate",
  summary: "屏幕框选识别、双栏同步缩放对照与专业术语精译工具",
  description:
    "集成离线版面分析与云端大模型双引擎，支持快捷键框选任意桌面窗口、自动抹除原文背景回填译文，并提供双视口同步缩放校对台。",
  version: "2.3.1",
  updateVersion: "2.4.0",
  sizeLabel: "28.6 MB",
  minHostVersion: "1.4.0",
  updatedAt: "2026-11-15",
  state: "updatable",
  screenshots: [
    { src: DEMO_SVG_SHOT_1, alt: "截图框选与实时译文回填工作台" },
    { src: DEMO_SVG_SHOT_2, alt: "原译文术语库与耗时监控面板" },
  ],
  permissions: [
    {
      key: "screen",
      scope: "process",
      label: "桌面屏幕区域捕获",
      description: "仅在用户按下截图快捷键时读取选定屏幕矩形像素",
      risk: "medium",
    },
    {
      key: "clipboard",
      scope: "clipboard",
      label: "剪贴板图像与译文读写",
      description: "支持粘贴截图上传及自动写入识别结果",
      risk: "low",
    },
    {
      key: "network",
      scope: "network",
      label: "外部翻译网关 HTTPS 访问",
      description: "仅连接用户已配置的模型服务域名",
      risk: "low",
    },
  ],
  versions: [
    {
      version: "2.4.0",
      date: "2026-11-15",
      sizeLabel: "28.6 MB",
      notes: [
        "新增左右双视口同步缩放与卷帘擦除对比模式",
        "优化高分屏放大镜十字准星帧率至 120fps",
      ],
    },
    {
      version: "2.3.1",
      date: "2026-10-28",
      sizeLabel: "27.9 MB",
      notes: ["修复竖排日文漫画气泡识别顺序偏差", "降低常驻内存占用 34%"],
    },
    {
      version: "2.2.0",
      date: "2026-09-19",
      sizeLabel: "26.4 MB",
      notes: ["支持自定义快捷键冲突检测与本地词典导入"],
    },
  ],
};

function riskTagProps(risk: AfStorePermissionRisk): { tone: "success" | "warning" | "danger"; text: string } {
  if (risk === "high") return { tone: "danger", text: "高敏感" };
  if (risk === "medium") return { tone: "warning", text: "需确认" };
  return { tone: "success", text: "低风险" };
}

function actionButtonLabel(state: AfStoreCardState, updateVer?: string): string {
  if (state === "updatable" || state === "update") {
    return updateVer ? `更新至 v${updateVer}` : "立即更新";
  }
  if (state === "installed") return "打开应用";
  if (state === "incompatible") return "版本不兼容";
  if (state === "queued") return "排队中…";
  if (state === "downloading") return "下载中…";
  if (state === "verifying") return "校验中…";
  if (state === "installing") return "安装中…";
  return "获取并安装";
}

/**
 * `470px` 应用详情抽屉（支持全屏侧滑 `AfDrawer` 与画廊 `inline` 舞台模式）：
 * 包含 `48px` `AfAppMark`、截图横滑画廊（联动全屏 `AfImagePreview`）、4 格等宽规格栏、分级权限声明、平滑展开 Changelog 与历史版本回滚选择器。
 */
export function AfStoreAppDetailDrawer({
  open,
  onOpenChange,
  inline,
  app: appProp,
  selectedRollbackVersion: rollbackProp,
  defaultSelectedRollbackVersion,
  onSelectedRollbackVersionChange,
  onPrimaryAction,
  onRollbackVersion,
  onUninstall,
  onOpenHomepage,
  className,
}: AfStoreAppDetailDrawerProps = {}) {
  const isInline = inline ?? open === undefined;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const frozenAppRef = useRef<AfStoreAppDetail>(appProp ?? DEFAULT_APP_DETAIL);
  if (appProp !== undefined) {
    frozenAppRef.current = appProp;
  }
  const app = appProp ?? (isInline ? DEFAULT_APP_DETAIL : frozenAppRef.current);

  const fallbackRollback =
    defaultSelectedRollbackVersion ??
    app.versions[1]?.version ??
    app.versions[0]?.version ??
    app.version;
  const [rollbackVer, setRollbackVer] = useControllableState<string>({
    value: rollbackProp,
    defaultValue: fallbackRollback,
    onChange: onSelectedRollbackVersionChange,
  });

  const prevAppIdRef = useRef(app.id);
  useEffect(() => {
    if (prevAppIdRef.current !== app.id) {
      prevAppIdRef.current = app.id;
      if (rollbackProp === undefined) {
        const nextFallback = app.versions[1]?.version ?? app.versions[0]?.version ?? app.version;
        setRollbackVer(nextFallback);
      }
    }
  }, [app.id, app.version, app.versions, rollbackProp, setRollbackVer]);

  const busy =
    app.state === "queued" ||
    app.state === "downloading" ||
    app.state === "verifying" ||
    app.state === "installing";

  const detailContent = (
    <div key={app.id} className={cn("af-store-detail af-pj-panel-in", isInline && "af-store-detail--inline", className)}>
      <div className="af-store-detail__hero">
        <AfAppMark size={48} icon={app.icon} name={app.name} tone="accent" />
        <div className="af-store-detail__hero-main">
          <div className="af-store-detail__title-row">
            <h4>{app.name}</h4>
            {app.verified ? <VerifiedBadge /> : null}
            {app.visibility === "private" ? (
              <AfTag tone="info" size="sm">
                内部
              </AfTag>
            ) : app.visibility === "beta" ? (
              <AfTag tone="warning" size="sm">
                测试版
              </AfTag>
            ) : null}
          </div>
          <span className="af-store-detail__author">{app.author}</span>
          <p className="af-store-detail__summary">{app.summary}</p>
        </div>
      </div>

      <div className="af-store-detail__cta-bar">
        <AfButton
          size="md"
          variant={app.state === "installed" ? "secondary" : "primary"}
          icon={
            app.state === "installed"
              ? "external"
              : app.state === "updatable" || app.state === "update"
                ? "refresh"
                : "download"
          }
          loading={busy}
          disabled={app.state === "incompatible"}
          onClick={() => onPrimaryAction?.(app)}
        >
          {actionButtonLabel(app.state, app.updateVersion)}
        </AfButton>

        <AfMenu
          trigger={
            <AfButton size="md" variant="secondary" icon="more" aria-label="更多应用操作" />
          }
          items={[
            {
              key: "homepage",
              label: "访问开发者主页",
              icon: "globe",
              onSelect: () => onOpenHomepage?.(app),
            },
            { type: "separator", key: "sep-1" },
            {
              key: "uninstall",
              label: "卸载此应用",
              icon: "trash",
              danger: true,
              onSelect: () => onUninstall?.(app),
            },
          ]}
        />
      </div>

      {/* 4 格紧凑等宽技术规格矩阵 */}
      <div className="af-store-detail__specs">
        <div className="af-store-detail__spec-cell">
          <span>当前版本</span>
          <strong>v{app.version}</strong>
        </div>
        <div className="af-store-detail__spec-cell">
          <span>安装包体积</span>
          <strong>{app.sizeLabel}</strong>
        </div>
        <div className="af-store-detail__spec-cell">
          <span>最低客户端版本</span>
          <strong>v{app.minHostVersion}+</strong>
        </div>
        <div className="af-store-detail__spec-cell">
          <span>最近更新</span>
          <strong>{app.updatedAt}</strong>
        </div>
      </div>

      {/* 横向截图预览画廊 */}
      {app.screenshots.length > 0 ? (
        <section className="af-store-detail__section" aria-label="界面预览">
          <span className="af-store-detail__sec-title">界面截图预览</span>
          <div className="af-store-detail__shots">
            {app.screenshots.map((shot, idx) => (
              <button
                key={shot.src}
                type="button"
                className="af-store-detail__shot"
                aria-label={`放大查看截图 ${idx + 1}：${shot.alt ?? app.name}`}
                onClick={() => setPreviewIndex(idx)}
              >
                <img src={shot.src} alt={shot.alt ?? `${app.name} 预览 ${idx + 1}`} draggable={false} />
                <span className="af-store-detail__shot-zoom" aria-hidden="true">
                  <AfIcon name="zoomIn" size={12} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="af-store-detail__section" aria-label="功能简介">
        <span className="af-store-detail__sec-title">应用说明</span>
        <p className="af-store-detail__desc">{app.description}</p>
      </section>

      {/* 权限声明清单 */}
      <section className="af-store-detail__section" aria-label="权限与安全说明">
        <span className="af-store-detail__sec-title">权限与安全说明 ({app.permissions.length})</span>
        <div className="af-store-detail__perms" data-af-hover-list="wash">
          {app.permissions.map((perm) => {
            const badge = riskTagProps(perm.risk);
            return (
              <div key={perm.key} data-af-hover-item className="af-store-detail__perm-row">
                <div className="af-store-detail__perm-main">
                  <strong>{perm.label}</strong>
                  <span>{perm.description}</span>
                </div>
                <AfTag tone={badge.tone} size="sm">
                  {badge.text}
                </AfTag>
              </div>
            );
          })}
        </div>
      </section>

      {/* 平滑展开更新日志 */}
      <details className="af-store-detail__changelog">
        <summary>
          <AfIcon name="gitCommit" size={13} />
          <span>更新日志</span>
          <AfIcon name="chevronDown" size={12} />
        </summary>
        <div className="af-store-detail__changelog-body">
          {app.versions.map((ver) => (
            <div key={ver.version} className="af-store-detail__ver-block">
              <div className="af-store-detail__ver-head">
                <strong>v{ver.version}</strong>
                <span>
                  {ver.date} · {ver.sizeLabel}
                </span>
              </div>
              <ul>
                {ver.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* 历史版本回滚选择器 */}
      {app.versions.length > 1 ? (
        <div className="af-store-detail__rollback">
          <div className="af-store-detail__rollback-label">
            <span>历史版本回退</span>
            <small>遇到兼容问题时可切换回旧版本</small>
          </div>
          <div className="af-store-detail__rollback-controls">
            <AfSelect
              size="sm"
              value={rollbackVer}
              onChange={(val) => setRollbackVer(String(val))}
              options={app.versions.map((v) => ({
                value: v.version,
                label: `v${v.version} (${v.date})`,
              }))}
            />
            <AfButton
              size="sm"
              variant="secondary"
              onClick={() => onRollbackVersion?.(app, rollbackVer)}
            >
              回滚到此版
            </AfButton>
          </div>
        </div>
      ) : null}

      <AfImagePreview
        open={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        images={app.screenshots}
        currentIndex={previewIndex ?? 0}
        onIndexChange={(idx) => setPreviewIndex(idx)}
      />
    </div>
  );

  if (isInline) {
    return detailContent;
  }

  return (
    <AfDrawer
      open={Boolean(open)}
      onOpenChange={onOpenChange}
      title={app.name}
      description={`${app.author} · v${app.version}`}
      width={470}
    >
      {detailContent}
    </AfDrawer>
  );
}
