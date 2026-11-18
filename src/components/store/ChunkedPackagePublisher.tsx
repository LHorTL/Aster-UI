import { useState } from "react";
import {
  AfButton,
  AfDropzone,
  AfIcon,
  AfTag,
  cn,
  type UploadFile,
} from "../../ui";
import { useTween } from "../../ui-pro";
import { AfInlineDiff, type DiffStatus } from "../agents/InlineDiffPattern";

export type AfPublisherChunkState = "done" | "uploading" | "queued" | "retrying";

export interface AfPublisherChunkCell {
  index: number;
  state: AfPublisherChunkState;
  sizeMb: number;
}

export interface AfPublisherStageInfo {
  id: "hash" | "upload" | "merge" | "manifest";
  label: string;
  detail: string;
  status: "done" | "running" | "pending" | "error";
}

export interface AfManifestComparePayload {
  previousManifestText: string;
  nextManifestText: string;
}

export interface AfChunkedPackagePublisherProps {
  /** 上传框文件列表。 */
  files?: UploadFile[];
  defaultFiles?: UploadFile[];
  onFilesChange?: (files: UploadFile[]) => void;
  /** 四阶段流水线状态。 */
  stages?: AfPublisherStageInfo[];
  /** 分片并发上传矩阵单元。 */
  chunks?: AfPublisherChunkCell[];
  /** 总体管线完成百分比（`0–100`）。 */
  overallProgress?: number;
  /** 本次包与线上版本 `manifest.json` 关键字段差异对比。 */
  manifestDiff?: AfManifestComparePayload;
  /** 单处权限或宿主版本变更审批回调。 */
  onManifestDecision?: (changeId: number, decision: DiffStatus) => void;
  /** 中止上传发布管线。 */
  onAbort?: () => void;
  /** 确认合并并进入上架审批。 */
  onConfirmPublish?: () => void;
  className?: string;
}

const DEFAULT_UPLOAD_FILES: UploadFile[] = [
  {
    id: "pkg-main",
    name: "translate-workbench-2.4.2-win-x64.zip",
    size: "48.0 MB",
    sizeMb: 48.0,
    kind: "zip",
    progress: 82,
    status: "uploading",
    stageText: "分片 13 / 16 上传中 · 18.6 MB/s",
  },
];

const DEFAULT_STAGES: AfPublisherStageInfo[] = [
  {
    id: "hash",
    label: "1. 本地分片校验",
    detail: "16 × 3.0 MB 完整性摘要完成",
    status: "done",
  },
  {
    id: "upload",
    label: "2. 并发分片传输",
    detail: "4 通道并发 · 已完成 13 / 16 片",
    status: "running",
  },
  {
    id: "merge",
    label: "3. 云端合并与签名",
    detail: "等待全部分片上传完成后合并",
    status: "pending",
  },
  {
    id: "manifest",
    label: "4. 包内配置预检",
    detail: "已解析安装包版本与权限配置",
    status: "done",
  },
];

const CHUNK_STATE_LABEL: Record<AfPublisherChunkState, string> = {
  done: "已完成",
  uploading: "传输中",
  retrying: "自动重传",
  queued: "待调度",
};

const DEFAULT_CHUNKS: AfPublisherChunkCell[] = Array.from({ length: 16 }, (_, idx) => ({
  index: idx + 1,
  sizeMb: 3,
  state: idx < 12 ? "done" : idx === 12 || idx === 13 ? "uploading" : idx === 14 ? "retrying" : "queued",
}));

const DEFAULT_MANIFEST_DIFF: AfManifestComparePayload = {
  previousManifestText: `{ "version": "2.4.1", "minShellVersion": "1.4.0", "entry": "dist/main.js", "permissions": ["clipboard.read", "screen.capture", "https.gateway"] }`,
  nextManifestText: `{ "version": "2.4.2", "minShellVersion": "1.5.0", "entry": "dist/worker-entry.mjs", "permissions": ["clipboard.read", "screen.capture", "https.gateway", "fs.userDictionary"] }`,
};

function summarizeManifestDiff(payload: AfManifestComparePayload): {
  diffTitle: string;
  addedPerms: number;
  removedPerms: number;
  hasFsPerm: boolean;
} {
  try {
    const prev = JSON.parse(payload.previousManifestText) as {
      version?: string;
      permissions?: string[];
    };
    const next = JSON.parse(payload.nextManifestText) as {
      version?: string;
      permissions?: string[];
    };
    const prevPerms = Array.isArray(prev.permissions) ? prev.permissions : [];
    const nextPerms = Array.isArray(next.permissions) ? next.permissions : [];
    const prevSet = new Set(prevPerms);
    const nextSet = new Set(nextPerms);
    const added = nextPerms.filter((p) => !prevSet.has(p));
    const removed = prevPerms.filter((p) => !nextSet.has(p));
    const vPrev = prev.version ? `v${prev.version}` : "线上版";
    const vNext = next.version ? `v${next.version}` : "待发布版";
    return {
      diffTitle: `应用配置清单 · 线上 ${vPrev} → 待发布 ${vNext}`,
      addedPerms: added.length,
      removedPerms: removed.length,
      hasFsPerm: added.some((p) => p.startsWith("fs.")),
    };
  } catch {
    return {
      diffTitle: "应用配置清单 · 线上正式版 → 待发布版",
      addedPerms: 0,
      removedPerms: 0,
      hasFsPerm: false,
    };
  }
}

/**
 * 商城发布后台 · 大体积安装包分片发布与 Manifest Diff 审查台（`P2-3`）：
 * - 上部集成增强版 `AfDropzone`（支持粘贴、断点取消）；
 * - 中部展示四阶段流水线与 16 分片并发状态矩阵；
 * - 下部内嵌复用 `AfInlineDiff` 逐词高亮对比本次包与线上版的 `minShellVersion`、`entry` 与 `permissions` 变更。
 */
export function AfChunkedPackagePublisher({
  files,
  defaultFiles = DEFAULT_UPLOAD_FILES,
  onFilesChange,
  stages = DEFAULT_STAGES,
  chunks = DEFAULT_CHUNKS,
  overallProgress = 82,
  manifestDiff = DEFAULT_MANIFEST_DIFF,
  onManifestDecision,
  onAbort,
  onConfirmPublish,
  className,
}: AfChunkedPackagePublisherProps = {}) {
  const [hoveredState, setHoveredState] = useState<AfPublisherChunkState | null>(null);
  const tweenedPct = useTween(Math.max(0, Math.min(100, overallProgress)), 420);
  const doneChunks = chunks.filter((c) => c.state === "done").length;
  const tweenedDone = Math.round(useTween(doneChunks, 360));
  const manifestSummary = summarizeManifestDiff(manifestDiff);

  return (
    <section className={cn("af-store-publisher", className)} aria-label="分片制品上传与清单差异核验">
      {/* 1. 制品拖拽投递区 */}
      <div className="af-store-publisher__drop">
        <AfDropzone
          locale="zh-CN"
          accept=".zip,.tgz,.exe,.dmg,.AppImage"
          maxSizeMb={1024}
          allowPaste
          files={files}
          defaultFiles={defaultFiles}
          onChange={onFilesChange}
          hint="支持拖入 .zip / .exe / .dmg / .AppImage 安装包（最大 1024 MB，自动按 3 MB 分片断点续传）"
        />
      </div>

      {/* 2. 四阶段分片流水线与分片状态矩阵 */}
      <div className="af-store-publisher__pipeline">
        <div className="af-store-publisher__pipe-head">
          <div className="af-store-publisher__pipe-title">
            <AfIcon name="layers" size={14} />
            <strong>分片并发上传与校验进度</strong>
            <AfTag tone="accent" size="sm">
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {tweenedDone} / {chunks.length} 分片就绪
              </span>
            </AfTag>
          </div>
          <span className="af-store-publisher__pipe-pct">{Math.round(tweenedPct)}%</span>
        </div>

        <div className="af-store-publisher__stages">
          {stages.map((st) => (
            <div key={st.id} className="af-store-publisher__stage" data-status={st.status}>
              <div className="af-store-publisher__stage-top">
                <span className="af-store-publisher__stage-dot" aria-hidden="true">
                  {st.status === "done" ? (
                    <AfIcon name="check" size={10} />
                  ) : st.status === "running" ? (
                    <AfIcon name="loader" size={10} />
                  ) : st.status === "error" ? (
                    <AfIcon name="x" size={10} />
                  ) : null}
                </span>
                <strong>{st.label}</strong>
              </div>
              <span className="af-store-publisher__stage-detail">{st.detail}</span>
            </div>
          ))}
        </div>

        <div className="af-store-publisher__matrix-wrap" onPointerLeave={() => setHoveredState(null)}>
          <div className="af-store-publisher__matrix-legend">
            <span>分片传输状态（每片 3.0 MB）</span>
            <div className="af-store-publisher__legend-items">
              {(["done", "uploading", "retrying", "queued"] as const).map((st) => (
                <span
                  key={st}
                  data-state={st}
                  data-dim={hoveredState !== null && hoveredState !== st ? "true" : undefined}
                  onPointerEnter={() => setHoveredState(st)}
                >
                  {CHUNK_STATE_LABEL[st]}
                </span>
              ))}
            </div>
          </div>
          <div className="af-store-publisher__matrix" role="list" aria-label="分片传输状态矩阵">
            {chunks.map((cell) => (
              <div
                key={cell.index}
                role="listitem"
                className="af-store-publisher__chunk"
                data-state={cell.state}
                data-dim={hoveredState !== null && hoveredState !== cell.state ? "true" : undefined}
                onPointerEnter={() => setHoveredState(cell.state)}
                title={`分片 #${cell.index} (${cell.sizeMb} MB) · ${CHUNK_STATE_LABEL[cell.state]}`}
              >
                <span>#{String(cell.index).padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 内嵌复用 AfInlineDiff 审查权限与客户端版本要求变更 */}
      <div className="af-store-publisher__diff">
        <div className="af-store-publisher__diff-head">
          <div>
            <strong>应用权限与版本要求变更核对</strong>
            <span>已自动对比当前线上版本与待发布包的配置差异</span>
          </div>
          <AfTag
            tone={manifestSummary.addedPerms > 0 ? "warning" : manifestSummary.removedPerms > 0 ? "info" : "success"}
            size="sm"
          >
            {manifestSummary.addedPerms > 0
              ? `新增 ${manifestSummary.addedPerms} 项${manifestSummary.hasFsPerm ? "文件" : ""}权限声明`
              : manifestSummary.removedPerms > 0
                ? `收敛 ${manifestSummary.removedPerms} 项权限声明`
                : "权限声明无新增"}
          </AfTag>
        </div>

        <AfInlineDiff
          title={manifestSummary.diffTitle}
          locale="zh"
          oldText={manifestDiff.previousManifestText}
          newText={manifestDiff.nextManifestText}
          onDecide={onManifestDecision}
        />
      </div>

      {/* 底部确认栏 */}
      <div className="af-store-publisher__foot">
        <AfButton size="sm" variant="secondary" onClick={onAbort}>
          取消本次发布
        </AfButton>
        <AfButton size="sm" variant="primary" icon="check" onClick={onConfirmPublish}>
          确认变更并提交上架
        </AfButton>
      </div>
    </section>
  );
}
