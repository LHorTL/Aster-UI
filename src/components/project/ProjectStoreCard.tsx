import { useState, type KeyboardEvent } from "react";
import { type AfIconSlot } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { AfAppMark, AfButton, AfOverflowTagList, AfTag, AfTooltip, type AfOverflowTagItem } from "../../ui";
import { useTween } from "../../ui-pro";
import { VerifiedBadge, storeApps as defaultStoreApps, type StoreState } from "../_shared/project";

/** 应用商城卡片 8 态完整状态机（同时向后兼容历史 `"install" | "update"` 字面量）。 */
export type AfStoreCardState =
  | "available"
  | "queued"
  | "downloading"
  | "verifying"
  | "installing"
  | "installed"
  | "updatable"
  | "incompatible"
  | StoreState;

/** 应用可见性与发行渠道标识。 */
export type AfStoreVisibility = "official" | "private" | "beta";

/** 应用商城卡片条目数据模型。 */
export type AfProjectStoreItem = {
  id: string;
  name: string;
  icon: AfIconSlot;
  desc: string;
  version: string;
  /** 可更新目标版本号。 */
  update?: string;
  /** 受控状态（优先于 `initial`）。 */
  state?: AfStoreCardState;
  /** 非受控初始状态（兼容旧版字段）。 */
  initial?: AfStoreCardState;
  /** 渠道可见性角标。 */
  visibility?: AfStoreVisibility;
  /** 分类或来源标签。 */
  category?: string;
  /** 安装包体积文案。 */
  sizeLabel?: string;
  /** 下载/安装实时进度 `0–100`。 */
  progress?: number;
  /** 亮点特性标签（自动单行折叠为 `+N`）。 */
  tags?: Array<string | AfOverflowTagItem>;
  /** 宿主版本不兼容时的原因说明。 */
  incompatibleReason?: string;
  /** 最低宿主版本要求。 */
  minHostVersion?: string;
};

/** 应用商城卡片集合属性。 */
export type AfProjectStoreCardProps = {
  apps?: AfProjectStoreItem[];
  defaultApps?: AfProjectStoreItem[];
  onInstall?: (app: AfProjectStoreItem) => void;
  onUpdate?: (app: AfProjectStoreItem) => void;
  onOpen?: (app: AfProjectStoreItem) => void;
  onCancel?: (app: AfProjectStoreItem) => void;
  onSelect?: (app: AfProjectStoreItem) => void;
  className?: string;
};

const DEFAULT_STORE_ITEMS: AfProjectStoreItem[] = [
  ...defaultStoreApps.map((app, idx) => ({
    ...app,
    visibility: (idx === 0 ? "official" : idx === 1 ? "official" : "beta") as AfStoreVisibility,
    tags:
      idx === 0
        ? ["中英混排", "代码块美化", "离线可用"]
        : idx === 1
          ? ["多源聚合", "周报导出", "阈值预警"]
          : ["全文快照", "双链归档"],
  })),
];

function normalizeCardState(raw: AfStoreCardState | undefined): Exclude<AfStoreCardState, "install" | "update"> {
  if (!raw || raw === "install") return "available";
  if (raw === "update") return "updatable";
  return raw;
}

function StoreProgressFooter({
  app,
  phase,
  rawProgress,
  onCancel,
}: {
  app: AfProjectStoreItem;
  phase: "queued" | "downloading" | "verifying" | "installing";
  rawProgress: number;
  onCancel?: () => void;
}) {
  const tweened = Math.round(useTween(rawProgress, 260));
  const phaseLabel =
    phase === "queued"
      ? "正在排队等待传输…"
      : phase === "downloading"
        ? "正在下载应用包"
        : phase === "verifying"
          ? "正在校验签名完整性"
          : "正在完成本地安装";

  return (
    <footer className="af-pj-storecard__progress" onClick={(e) => e.stopPropagation()}>
      <div className="af-pj-storecard__progcol">
        <div className="af-pj-storecard__progmeta">
          <span>{phaseLabel}</span>
          <strong className="af-pj-storecard__pct">
            {phase === "queued" ? "排队中" : phase === "verifying" ? "验签中" : `${tweened}%`}
          </strong>
        </div>
        <div
          className="af-pj-storecard__progressbar"
          role="progressbar"
          aria-valuenow={tweened}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${app.name} 部署进度`}
        >
          <span style={{ width: `${phase === "queued" ? 8 : phase === "verifying" ? 96 : tweened}%` }} />
        </div>
      </div>
      {phase === "queued" || phase === "downloading" ? (
        <AfButton size="xs" variant="ghost" onClick={onCancel}>
          取消
        </AfButton>
      ) : null}
    </footer>
  );
}

/**
 * 客户端内置应用商城卡片（8 态受控完整版）：
 * - 完整覆盖 `available / queued / downloading / verifying / installing / installed / updatable / incompatible` 8 态；
 * - 支持 `Official / Private / Beta` 渠道标识与 `<AfOverflowTagList>` 自适应标签；
 * - 严格使用 `<div role="button" tabIndex={0}>` 承载整卡点击打开详情抽屉，彻底杜绝 `<button>` 嵌套与点击缩小。
 */
function ProjectStoreCard({
  apps: appsProp,
  defaultApps = DEFAULT_STORE_ITEMS,
  onInstall,
  onUpdate,
  onOpen,
  onCancel,
  onSelect,
  className,
}: AfProjectStoreCardProps = {}) {
  const [items] = useControllableState<AfProjectStoreItem[]>({
    value: appsProp,
    defaultValue: defaultApps,
  });

  const [localStates, setLocalStates] = useState<Record<string, AfStoreCardState>>({});
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  const triggerAction = (app: AfProjectStoreItem, mode: "install" | "update") => {
    if (app.state === undefined) {
      setLocalProgress((prev) => ({ ...prev, [app.id]: 42 }));
      setLocalStates((prev) => ({ ...prev, [app.id]: "downloading" }));
    }
    if (mode === "update") onUpdate?.(app);
    else onInstall?.(app);
  };

  const cancelAction = (app: AfProjectStoreItem) => {
    if (app.state === undefined) {
      setLocalStates((prev) => ({
        ...prev,
        [app.id]: app.update ? "updatable" : "available",
      }));
    }
    onCancel?.(app);
  };

  return (
    <div className={cn("af-pj-store", className)}>
      {items.map((app) => {
        const rawState = app.state ?? localStates[app.id] ?? app.initial;
        const current = normalizeCardState(rawState);
        const pct = app.progress ?? localProgress[app.id] ?? (current === "installing" ? 76 : 42);
        const tileTone =
          app.id === "overview" ? "accent" : app.id === "markdown-kit" ? "warm" : "purple";
        const isBusy =
          current === "queued" ||
          current === "downloading" ||
          current === "verifying" ||
          current === "installing";

        const normalizedTags: AfOverflowTagItem[] = (app.tags ?? []).map((t, idx) =>
          typeof t === "string" ? { key: `${app.id}-tag-${idx}`, label: t } : t,
        );

        const handleCardKeyDown = (e: KeyboardEvent<HTMLElement>) => {
          if (e.target !== e.currentTarget) return;
          if (!onSelect) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(app);
          }
        };

        const visibilityBadge =
          app.visibility === "private" ? (
            <AfTag tone="info" size="sm">
              内部
            </AfTag>
          ) : app.visibility === "beta" ? (
            <AfTag tone="warning" size="sm">
              测试版
            </AfTag>
          ) : null;

        const incompatReason =
          app.incompatibleReason ??
          (app.minHostVersion ? `需客户端 v${app.minHostVersion} 及以上版本` : "当前系统架构或客户端版本暂不兼容");

        return (
          <div
            className="af-pj-storecard"
            key={app.id}
            data-store-state={current}
            data-clickable={onSelect ? "true" : undefined}
            role={onSelect ? "button" : "article"}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `查看 ${app.name} 详情` : undefined}
            onClick={onSelect ? () => onSelect(app) : undefined}
            onKeyDown={onSelect ? handleCardKeyDown : undefined}
          >
            <div className="af-pj-storecard__top">
              <AfAppMark size={36} icon={app.icon} name={app.name} tone={tileTone} />
              <div className="af-pj-storecard__titles">
                <span className="af-pj-storecard__name-row">
                  <span className="af-pj-storecard__name">{app.name}</span>
                  {(app.visibility === undefined || app.visibility === "official") && <VerifiedBadge />}
                  {visibilityBadge}
                </span>
                <span className="af-pj-storecard__meta">
                  <code className="af-pj-codechip">v{app.version}</code>
                  {app.category ? <span>{app.category}</span> : null}
                </span>
              </div>
              {current === "updatable" && app.update ? (
                <AfTag tone="accent" size="sm">
                  新 v{app.update}
                </AfTag>
              ) : null}
            </div>

            <p className="af-pj-storecard__desc">{app.desc}</p>

            {normalizedTags.length > 0 ? (
              <div className="af-pj-storecard__tags" onClick={(e) => e.stopPropagation()}>
                <AfOverflowTagList items={normalizedTags} />
              </div>
            ) : null}

            {isBusy ? (
              <StoreProgressFooter
                app={app}
                phase={current}
                rawProgress={pct}
                onCancel={() => cancelAction(app)}
              />
            ) : (
              <footer className="af-pj-storecard__foot" onClick={(e) => e.stopPropagation()}>
                {current === "installed" ? (
                  <AfTag tone="success" dot size="sm">
                    已安装
                  </AfTag>
                ) : current === "incompatible" ? (
                  <AfTag tone="danger" size="sm">
                    版本受限
                  </AfTag>
                ) : (
                  <span className="af-pj-storecard__hint">
                    {current === "updatable"
                      ? (app.sizeLabel ?? "增量更新包就绪")
                      : (app.sizeLabel ?? "免费 · 12.4 MB")}
                  </span>
                )}

                {current === "available" ? (
                  <AfButton
                    size="xs"
                    variant="primary"
                    icon="download"
                    onClick={() => triggerAction(app, "install")}
                  >
                    获取
                  </AfButton>
                ) : current === "updatable" ? (
                  <AfButton
                    size="xs"
                    variant="primary"
                    icon="refresh"
                    onClick={() => triggerAction(app, "update")}
                  >
                    更新
                  </AfButton>
                ) : current === "incompatible" ? (
                  <AfTooltip content={incompatReason}>
                    <span className="af-pj-storecard__disabled-wrap">
                      <AfButton size="xs" variant="secondary" disabled>
                        不兼容
                      </AfButton>
                    </span>
                  </AfTooltip>
                ) : (
                  <AfButton size="xs" variant="secondary" icon="external" onClick={() => onOpen?.(app)}>
                    打开
                  </AfButton>
                )}
              </footer>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { ProjectStoreCard as AfProjectStoreCard };
