import { useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { AfButton } from "../../ui";
import { CardHead, storageSlices as defaultStorageSlices } from "../_shared/project";
import { useTween } from "../advanced/shared";

/** 存储分类切片条目。 */
export type AfProjectStorageSlice = {
  id: string;
  label: string;
  gb: number;
  human: string;
  tone: "data-1" | "data-2" | "data-3" | "data-rest";
};

/** 存储分类卡属性。 */
export type AfProjectStorageCardProps = {
  slices?: AfProjectStorageSlice[];
  title?: ReactNode;
  desc?: ReactNode;
  cleanupLabel?: string;
  onCleanup?: (reclaimedGb: number) => void;
  onUndoCleanup?: () => void;
  className?: string;
};

const DEFAULT_SLICES: AfProjectStorageSlice[] = defaultStorageSlices as AfProjectStorageSlice[];

/** 存储分类卡：大字等宽总占用、多色分段配比条、双列明细卡片与内联确认清理。 */
function ProjectStorageCard({
  slices: slicesProp,
  title = "本地存储空间",
  desc,
  cleanupLabel = "清理缓存",
  onCleanup,
  onUndoCleanup,
  className,
}: AfProjectStorageCardProps = {}) {
  const [innerSlices, setInnerSlices] = useState<AfProjectStorageSlice[]>(DEFAULT_SLICES);
  const [phase, setPhase] = useState<"idle" | "confirm" | "done">("idle");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const slices = slicesProp ?? innerSlices;
  const total = slices.reduce((sum, item) => sum + item.gb, 0);
  const animatedTotal = useTween(total, 440);
  const defaultCacheGb = DEFAULT_SLICES.find((s) => s.id === "cache")?.gb ?? 0.86;
  const cacheGb = slices.find((s) => s.id === "cache")?.gb ?? defaultCacheGb;

  const confirmClean = () => {
    if (!slicesProp) {
      setInnerSlices((prev) => prev.map((s) => (s.id === "cache" ? { ...s, gb: 0.02, human: "20 MB" } : s)));
    }
    setPhase("done");
    onCleanup?.(cacheGb);
  };

  const undoClean = () => {
    if (!slicesProp) {
      setInnerSlices(DEFAULT_SLICES);
    }
    setPhase("idle");
    onUndoCleanup?.();
  };

  return (
    <div className={cn("af-pj-storage", className)}>
      <CardHead
        title={title}
        desc={desc ?? "本地文档库、缓存文件与扩展资源分项统计"}
        extra={
          <span key={phase} className="af-pj-storage__phase-anim">
            {phase === "idle" ? (
              <AfButton size="xs" variant="secondary" icon="trash" onClick={() => setPhase("confirm")}>
                {cleanupLabel}
              </AfButton>
            ) : phase === "confirm" ? (
              <span className="af-pj-storage__done">
                <AfButton size="xs" variant="danger" onClick={confirmClean}>
                  确认释放 {(cacheGb * 1024).toFixed(0)} MB
                </AfButton>
                <AfButton size="xs" variant="ghost" onClick={() => setPhase("idle")}>
                  取消
                </AfButton>
              </span>
            ) : (
              <span className="af-pj-storage__done">
                <span className="af-pj-count">已释放 {((defaultCacheGb - 0.02) * 1024).toFixed(0)} MB</span>
                <AfButton size="xs" variant="ghost" icon="undo" onClick={undoClean}>
                  撤销
                </AfButton>
              </span>
            )}
          </span>
        }
      />

      <div className="af-pj-storage__hero">
        <strong className="af-pj-storage__total">{animatedTotal.toFixed(2)} GB</strong>
        <span className="af-pj-storage__sub">~/Workspace/LocalData · 存储状态健康</span>
      </div>

      <div className="af-pj-storage__bar" role="img" aria-label={`总占用 ${total.toFixed(2)} GB`}>
        {slices.map((slice) => {
          const width = total > 0 ? Math.max(3, (slice.gb / total) * 100) : 25;
          const isActive = hoveredId === slice.id;
          const isDim = hoveredId !== null && hoveredId !== slice.id;
          return (
            <span
              key={slice.id}
              data-tone={slice.tone}
              data-active={isActive ? "true" : undefined}
              data-dim={isDim ? "true" : undefined}
              style={{ width: `${width}%` }}
              title={`${slice.label}: ${slice.human}`}
              onPointerEnter={() => setHoveredId(slice.id)}
              onPointerLeave={() => setHoveredId((prev) => (prev === slice.id ? null : prev))}
            />
          );
        })}
      </div>

      <div className="af-pj-storage__legend" role="list">
        {slices.map((slice) => {
          const pct = total > 0 ? Math.round((slice.gb / total) * 100) : 0;
          const isActive = hoveredId === slice.id;
          const isDim = hoveredId !== null && hoveredId !== slice.id;
          return (
            <div
              key={slice.id}
              className="af-pj-storage__item"
              role="listitem"
              data-active={isActive ? "true" : undefined}
              data-dim={isDim ? "true" : undefined}
              onPointerEnter={() => setHoveredId(slice.id)}
              onPointerLeave={() => setHoveredId((prev) => (prev === slice.id ? null : prev))}
            >
              <span className="af-pj-storage__item-left">
                <i data-tone={slice.tone} aria-hidden="true" />
                <span className="af-pj-storage__label">{slice.label}</span>
              </span>
              <span className="af-pj-storage__size">
                <strong>{slice.human}</strong>
                <em>{pct}%</em>
              </span>
            </div>
          );
        })}
      </div>

      <details className="af-pj-storage__details">
        <summary className="af-pj-storage__summary">
          <AfIcon name="folder" size={13} />
          <span>目录分布与安全清理策略</span>
          <AfIcon name="chevronDown" size={12} />
        </summary>
        <div className="af-pj-storage__detail-body">
          临时缓存仅包含预览缩略图与安装包解压文件；清理操作不会影响已保存的文档记录、偏好配置或本地词库。
        </div>
      </details>
    </div>
  );
}

export { ProjectStorageCard as AfProjectStorageCard };
