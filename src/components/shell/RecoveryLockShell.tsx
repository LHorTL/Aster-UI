import { useRef, useState, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState, useExitTransition } from "../../primitives";
import { AfAlertDialog, AfButton, AfTag } from "../../ui";
import { AfTitleBar } from "./TitleBar";

/** 本地配置备份快照条目。 */
export type AfRecoverySnapshotItem = {
  id: string;
  label: string;
  createdAt: string;
  appVersion: string;
  sizeLabel: string;
  verified?: boolean;
  recommended?: boolean;
};

/** 独立安全恢复锁定台属性（用于配置损坏或版本迁移受阻时安全恢复）。 */
export type AfRecoveryLockShellProps = {
  /** 故障错误码。 */
  errorCode?: string;
  /** 故障标题摘要。 */
  faultTitle?: string;
  /** 故障原因说明。 */
  faultDescription?: string;
  /** 受影响的配置文件路径。 */
  corruptedFilePath?: string;
  /** 可用历史备份快照清单。 */
  snapshots?: AfRecoverySnapshotItem[];
  /** 当前选中的备份快照 ID。 */
  selectedSnapshotId?: string;
  defaultSelectedSnapshotId?: string;
  onSelectedSnapshotChange?: (id: string) => void;
  /** 点击“从此快照恢复”时触发。 */
  onRestoreSnapshot?: (snapshot: AfRecoverySnapshotItem) => void | Promise<void>;
  /** 点击“导出诊断包”时触发。 */
  onExportDiagnostics?: () => void | Promise<void>;
  /** 二次确认后点击“重置为出厂设置”时触发。 */
  onResetFactory?: () => void | Promise<void>;
  onClose?: () => void;
  className?: string;
};

const DEFAULT_SNAPSHOTS: AfRecoverySnapshotItem[] = [
  {
    id: "snap-latest",
    label: "自动守护快照 · 升级前归档",
    createdAt: "2026-11-16 08:30:12",
    appVersion: "v1.4.2",
    sizeLabel: "148 KB",
    verified: true,
    recommended: true,
  },
  {
    id: "snap-daily",
    label: "每日定时备份 · 工作区配置",
    createdAt: "2026-11-15 21:00:00",
    appVersion: "v1.4.1",
    sizeLabel: "142 KB",
    verified: true,
  },
  {
    id: "snap-manual",
    label: "手动导出点 · 代理与快捷键",
    createdAt: "2026-11-12 16:45:09",
    appVersion: "v1.4.0",
    sizeLabel: "136 KB",
    verified: true,
  },
];

/**
 * 配置故障安全恢复锁定壳（`recoveryOnly` 模式）：
 * - 提供异常错误码与损坏路径诊断横幅、历史备份快照单选恢复、脱敏诊断日志导出与出厂重置二次确认流。
 */
export function AfRecoveryLockShell({
  errorCode = "ERR_CONFIG_SCHEMA_CORRUPT",
  faultTitle = "本地配置文件损坏，已进入安全恢复模式",
  faultDescription = "为防止已保存的工作区密钥与偏好数据被覆盖丢失，主服务已暂停加载。请选择一份完好的备份快照恢复，或先导出诊断包。",
  corruptedFilePath = "%APPDATA%\\CloudDesk\\settings.v2.json",
  snapshots = DEFAULT_SNAPSHOTS,
  selectedSnapshotId: selectedProp,
  defaultSelectedSnapshotId = DEFAULT_SNAPSHOTS[0]?.id ?? "",
  onSelectedSnapshotChange,
  onRestoreSnapshot,
  onExportDiagnostics,
  onResetFactory,
  onClose,
  className,
}: AfRecoveryLockShellProps = {}) {
  const [selectedId, setSelectedId] = useControllableState<string>({
    value: selectedProp,
    defaultValue: defaultSelectedSnapshotId || snapshots[0]?.id || "",
    onChange: onSelectedSnapshotChange,
  });

  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  if (statusNote) lastStatusRef.current = statusNote;
  const statusExit = useExitTransition(Boolean(statusNote), 160);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const radioGroupRef = useRef<HTMLDivElement | null>(null);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedId) ?? snapshots[0] ?? null;

  const handleRestore = async () => {
    if (!selectedSnapshot || restoring) return;
    setRestoring(true);
    try {
      await onRestoreSnapshot?.(selectedSnapshot);
      setStatusNote(`已从快照「${selectedSnapshot.label}」完成校验恢复`);
    } catch {
      setStatusNote(`快照「${selectedSnapshot.label}」恢复失败，请尝试其他备份点或导出诊断包`);
    } finally {
      setRestoring(false);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await onExportDiagnostics?.();
      setStatusNote("已生成脱敏诊断归档包 diagnostic-bundle.zip");
    } catch {
      setStatusNote("导出脱敏诊断包失败，请检查本地磁盘读写权限");
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await onResetFactory?.();
      setResetConfirmOpen(false);
      setStatusNote("已重置为出厂默认配置，原损坏文件已归档至 .bak");
    } catch {
      setStatusNote("重置出厂配置未完成，请关闭占用进程后重试");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className={cn("af-recovery-shell", className)}>
      <AfTitleBar
        title="安全恢复模式"
        leading={<AfIcon name="shield" size={13} />}
        showMaximize={false}
        onClose={onClose}
      />

      <div className="af-recovery-shell__body">
        <div className="af-recovery-shell__banner" role="alert">
          <div className="af-recovery-shell__banner-icon" aria-hidden="true">
            <AfIcon name="alert" size={18} />
          </div>
          <div className="af-recovery-shell__banner-main">
            <div className="af-recovery-shell__banner-top">
              <strong>{faultTitle}</strong>
              <AfTag tone="danger" size="sm">
                {errorCode}
              </AfTag>
            </div>
            <p className="af-recovery-shell__banner-desc">{faultDescription}</p>
            <div className="af-recovery-shell__path">
              <span>异常路径</span>
              <code>{corruptedFilePath}</code>
            </div>
          </div>
        </div>

        <section className="af-recovery-shell__section" aria-label="可用备份快照">
          <div className="af-recovery-shell__section-head">
            <span>选择备份恢复配置</span>
            <small>共 {snapshots.length} 份已校验归档</small>
          </div>

          {snapshots.length === 0 ? (
            <div className="af-recovery-shell__empty">未发现本地历史快照，请先导出诊断包后执行出厂重置。</div>
          ) : (
            <div
              ref={radioGroupRef}
              className="af-recovery-shell__list"
              role="radiogroup"
              aria-label="备份快照列表"
              data-af-hover-list="hover"
            >
              {snapshots.map((snap, idx) => {
                const checked = snap.id === selectedSnapshot?.id;
                const onRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(snap.id);
                    return;
                  }
                  if (
                    e.key === "ArrowDown" ||
                    e.key === "ArrowRight" ||
                    e.key === "ArrowUp" ||
                    e.key === "ArrowLeft"
                  ) {
                    e.preventDefault();
                    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
                    const nextIdx = (idx + dir + snapshots.length) % snapshots.length;
                    const nextSnap = snapshots[nextIdx];
                    if (nextSnap) {
                      setSelectedId(nextSnap.id);
                      const items = radioGroupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
                      items?.[nextIdx]?.focus();
                    }
                  }
                };
                return (
                  <div
                    key={snap.id}
                    role="radio"
                    tabIndex={checked ? 0 : -1}
                    aria-checked={checked}
                    className="af-recovery-shell__item"
                    data-af-hover-item
                    data-selected={checked ? "true" : undefined}
                    onClick={() => setSelectedId(snap.id)}
                    onKeyDown={onRowKeyDown}
                  >
                    <span className="af-recovery-shell__radio" data-checked={checked ? "true" : undefined} aria-hidden="true" />
                    <div className="af-recovery-shell__item-main">
                      <div className="af-recovery-shell__item-row">
                        <strong>{snap.label}</strong>
                        {snap.recommended ? (
                          <AfTag tone="accent" size="sm">
                            推荐
                          </AfTag>
                        ) : null}
                        {snap.verified ? (
                          <AfTag tone="success" size="sm">
                            SHA-256 完好
                          </AfTag>
                        ) : null}
                      </div>
                      <div className="af-recovery-shell__item-meta">
                        <span>备份时间 {snap.createdAt}</span>
                        <span>版本 {snap.appVersion}</span>
                        <span>体积 {snap.sizeLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {statusExit.mounted && (statusNote ?? lastStatusRef.current) ? (
          <div
            className="af-recovery-shell__status af-pj-panel-in"
            role="status"
            data-closing={statusExit.closing ? "true" : undefined}
            style={statusExit.closing ? { opacity: 0, transition: "opacity 140ms ease-in" } : undefined}
          >
            <AfIcon name="check" size={13} />
            <span>{statusNote ?? lastStatusRef.current}</span>
          </div>
        ) : null}

        <footer className="af-recovery-shell__foot">
          <div className="af-recovery-shell__foot-left">
            <AfButton
              size="sm"
              variant="secondary"
              icon="download"
              loading={exporting}
              onClick={handleExport}
            >
              导出脱敏诊断包
            </AfButton>
            <AfButton
              size="sm"
              variant="ghost"
              disabled={resetting}
              onClick={() => setResetConfirmOpen(true)}
            >
              重置为出厂设置…
            </AfButton>
          </div>

          <AfButton
            size="md"
            variant="primary"
            icon="refresh"
            loading={restoring}
            disabled={!selectedSnapshot}
            onClick={handleRestore}
          >
            从此快照恢复
          </AfButton>
        </footer>
      </div>

      <AfAlertDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        tone="danger"
        title="确认重置为出厂默认配置？"
        description="原损坏配置文件将自动重命名为 .corrupt.bak 留存备份，自定义快捷键、界面密度与非云端同步偏好将恢复初始状态。"
        cancelText="返回保留"
        confirmText="确认重置并解锁"
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
