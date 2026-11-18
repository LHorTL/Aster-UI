import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState, useListFlip } from "../../primitives";
import {
  AfButton,
  AfCheckbox,
  AfInput,
  AfModal,
  AfProgress,
  AfRadioGroup,
  AfTag,
} from "../../ui";
import { AfSwap, useTween, useTweens } from "../../ui-pro";
import { AfTitleBar } from "./TitleBar";

/** 安装阶段状态（保留 `"ready"` 作为 `"configure"` 的向后兼容别名）。 */
export type AfInstallerStage = "welcome" | "configure" | "ready" | "installing" | "complete" | "error";

/** 安装用户范围。 */
export type AfInstallerScope = "perUser" | "perMachine";

/** 安装过程三阶段子进度标识。 */
export type AfInstallerSubPhase = "extracting" | "registering" | "verifying";

/** 安装启动回调载荷。 */
export type AfInstallerStartPayload = {
  installPath: string;
  scope: AfInstallerScope;
  createDesktopShortcut: boolean;
  launchOnStartup: boolean;
};

/** 安装向导完整版组件属性。 */
export type AfInstallerWizardProps = {
  appName?: string;
  appFolderName?: string;
  version?: string;
  subtitle?: ReactNode;
  installPath?: string;
  defaultInstallPath?: string;
  onInstallPathChange?: (path: string) => void;
  onBrowsePath?: () => void;
  /** 安装用户范围：当前用户或所有用户。 */
  scope?: AfInstallerScope;
  defaultScope?: AfInstallerScope;
  onScopeChange?: (scope: AfInstallerScope) => void;
  /** 目标磁盘可用空间（MB），默认 `42800`。 */
  availableSpaceMb?: number;
  /** 本次安装所需最小空间（MB），默认 `186`。 */
  requiredSpaceMb?: number;
  stage?: AfInstallerStage;
  defaultStage?: AfInstallerStage;
  onStageChange?: (stage: AfInstallerStage) => void;
  /** 当前安装百分比 `0–100`。 */
  progress?: number;
  /** 是否处于不确定脉冲准备态（如校验大体积压缩包头），默认 `false`。 */
  indeterminate?: boolean;
  /** 安装三阶段子状态。 */
  subPhase?: AfInstallerSubPhase;
  statusMessage?: string;
  errorMessage?: string;
  errorCode?: string;
  logs?: string[];
  onStartInstall?: (options: AfInstallerStartPayload) => void;
  onRetry?: () => void;
  onExportLogs?: (logs: string[]) => void;
  onLaunch?: () => void;
  onClose?: () => void;
  className?: string;
};

/**
 * 规范化安装目标目录：
 * 当用户仅选择盘符根目录（如 `D:\` 或 `D:`）时，自动拼接应用专属子目录避免污染磁盘根级。
 */
export function normalizeInstallDirectory(rawPath: string, appFolderName = "AsterStudio"): string {
  const trimmed = rawPath.trim();
  if (!trimmed) return `C:\\Program Files\\${appFolderName}`;
  const cleanFolder = appFolderName.replace(/^[\\/]+|[\\/]+$/g, "") || "AsterStudio";
  if (/^[A-Za-z]:[\\/]*$/.test(trimmed)) {
    const drive = trimmed.slice(0, 2).toUpperCase();
    return `${drive}\\${cleanFolder}`;
  }
  return trimmed;
}

function formatDiskSize(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return "0 MB";
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

const DEFAULT_LOGS = [
  "[14:20:01] 校验安装包数字签名 SHA-256… 通过",
  "[14:20:02] 解压核心运行时模块与原生渲染桥 (64.2 MB)…",
  "[14:20:03] 注册自定义唤醒协议与系统开始菜单快捷项…",
  "[14:20:04] 完成组件签名核验并初始化默认工作区。",
];

const SUB_PHASE_LABELS: Record<AfInstallerSubPhase, string> = {
  extracting: "阶段 1/3 · 正在解压核心运行时与渲染资源…",
  registering: "阶段 2/3 · 正在写入注册表项与系统快捷方式…",
  verifying: "阶段 3/3 · 正在校验动态模块 SHA-256 完整性签名…",
};

const WIZARD_STEPS: Array<{ key: "welcome" | "configure" | "installing" | "complete"; label: string }> = [
  { key: "welcome", label: "1. 欢迎许可" },
  { key: "configure", label: "2. 安装配置" },
  { key: "installing", label: "3. 写入组件" },
  { key: "complete", label: "4. 完成就绪" },
];

/**
 * 桌面离线安装向导完整版（4 步受控/非受控状态机）：
 * - 移除硬编码演示定时器，完整支持 `welcome -> configure -> installing -> complete | error`；
 * - 支持安装范围单选（当前用户 / 所有用户）、盘符根目录自动拼接子目录、磁盘空间阈值拦截与三阶段子进度。
 */
export function AfInstallerWizard({
  appName = "云端工作台",
  appFolderName = "CloudDesk",
  version = "1.4.0",
  subtitle = "轻量跨平台桌面效率工作台",
  installPath: installPathProp,
  defaultInstallPath,
  onInstallPathChange,
  onBrowsePath,
  scope: scopeProp,
  defaultScope = "perUser",
  onScopeChange,
  availableSpaceMb = 42_800,
  requiredSpaceMb = 186,
  stage: stageProp,
  defaultStage = "configure",
  onStageChange,
  progress: progressProp,
  indeterminate = false,
  subPhase,
  statusMessage,
  errorMessage = "目标目录写入权限受限或核心文件被其他程序占用，请检查进程后重试。",
  errorCode = "ERR_WRITE_LOCKED",
  logs = DEFAULT_LOGS,
  onStartInstall,
  onRetry,
  onExportLogs,
  onLaunch,
  onClose,
  className,
}: AfInstallerWizardProps = {}) {
  const [rawStage, setRawStage] = useControllableState<AfInstallerStage>({
    value: stageProp,
    defaultValue: defaultStage,
    onChange: onStageChange,
  });

  const normalizedStage: Exclude<AfInstallerStage, "ready"> =
    rawStage === "ready" ? "configure" : rawStage;

  const [scope, setScope] = useControllableState<AfInstallerScope>({
    value: scopeProp,
    defaultValue: defaultScope,
    onChange: (next) => {
      onScopeChange?.(next);
      if (installPathProp === undefined) {
        const nextDefault =
          next === "perMachine"
            ? `C:\\Program Files\\${appFolderName}`
            : `C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\${appFolderName}`;
        setInstallPath(nextDefault);
      }
    },
  });

  const computedInitialPath =
    defaultInstallPath ??
    (scope === "perMachine"
      ? `C:\\Program Files\\${appFolderName}`
      : `C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\${appFolderName}`);

  const [installPath, setInstallPath] = useControllableState<string>({
    value: installPathProp,
    defaultValue: computedInitialPath,
    onChange: onInstallPathChange,
  });

  const pathInputId = useId();
  const [agreedLicense, setAgreedLicense] = useState(true);
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [launchStartup, setLaunchStartup] = useState(true);

  const effectivePath = useMemo(
    () => normalizeInstallDirectory(installPath, appFolderName),
    [installPath, appFolderName],
  );
  const pathAutoAppended = effectivePath !== installPath.trim() && installPath.trim().length > 0;

  const insufficientSpace = availableSpaceMb < requiredSpaceMb;
  const usedRatioAfterInstall =
    availableSpaceMb > 0 ? Math.min(100, Math.max(4, Math.round((requiredSpaceMb / availableSpaceMb) * 100))) : 100;

  const effectiveProgress = progressProp ?? (normalizedStage === "complete" ? 100 : normalizedStage === "installing" ? 64 : 0);
  const displayProgress = Math.round(useTween(effectiveProgress, 260));
  const [tweenReqMb, tweenAvailMb] = useTweens([requiredSpaceMb, availableSpaceMb], 360);

  const inferredSubPhase: AfInstallerSubPhase =
    subPhase ?? (effectiveProgress < 40 ? "extracting" : effectiveProgress < 80 ? "registering" : "verifying");

  const resolvedStatusText =
    normalizedStage === "complete"
      ? "安装已完成，核心运行时与桌面协议已就绪"
      : normalizedStage === "error"
        ? "安装过程中断，未对现有用户数据造成更改"
        : (statusMessage ?? SUB_PHASE_LABELS[inferredSubPhase]);

  const stageOrder =
    normalizedStage === "welcome"
      ? 0
      : normalizedStage === "configure"
        ? 1
        : normalizedStage === "installing" || normalizedStage === "error"
          ? 2
          : 3;

  const handleStart = () => {
    if (insufficientSpace) return;
    if (installPath !== effectivePath) {
      setInstallPath(effectivePath);
    }
    setRawStage("installing");
    onStartInstall?.({
      installPath: effectivePath,
      scope,
      createDesktopShortcut: desktopShortcut,
      launchOnStartup: launchStartup,
    });
  };

  const handleRetry = () => {
    setRawStage("configure");
    onRetry?.();
  };

  return (
    <div className={cn("af-shell-installer", className)} data-stage={normalizedStage}>
      <AfTitleBar
        title={`${appName} 安装向导`}
        leading={<AfIcon name="sparkle" size={13} />}
        showMaximize={false}
        onClose={onClose}
      />

      <div className="af-shell-installer__body">
        <div className="af-shell-installer__hero">
          <div className="af-shell-installer__mark" aria-hidden="true">
            <AfIcon name="sparkle" size={22} />
          </div>
          <div className="af-shell-installer__hero-main">
            <div className="af-shell-installer__title-row">
              <h3 className="af-shell-installer__name">{appName}</h3>
              <AfTag tone="accent" size="sm">
                v{version}
              </AfTag>
              <span className="af-shell-installer__arch">x64 · SHA-256 已验签</span>
            </div>
            <p className="af-shell-installer__sub">{subtitle}</p>
          </div>
        </div>

        <div className="af-shell-installer__steps" aria-label="安装步骤">
          {WIZARD_STEPS.map((s, idx) => {
            const state =
              normalizedStage === "error" && idx === 2
                ? "error"
                : idx < stageOrder
                  ? "done"
                  : idx === stageOrder
                    ? "active"
                    : "todo";
            return (
              <span key={s.key} className="af-shell-installer__step" data-state={state}>
                {state === "done" ? <AfIcon name="check" size={11} /> : null}
                {state === "error" ? <AfIcon name="alert" size={11} /> : null}
                <span>{s.label}</span>
              </span>
            );
          })}
        </div>

        <AfSwap swapKey={normalizedStage}>
          {normalizedStage === "welcome" ? (
            <div className="af-shell-installer__welcome af-shell-installer__stage">
              <div className="af-shell-installer__highlights">
                <div className="af-shell-installer__highlight-item">
                  <AfIcon name="bolt" size={14} />
                  <div>
                    <strong>轻量流畅的多任务工作台</strong>
                    <span>主界面、快捷工具与桌面实时提醒无缝协同响应</span>
                  </div>
                </div>
                <div className="af-shell-installer__highlight-item">
                  <AfIcon name="shield" size={14} />
                  <div>
                    <strong>权限隔离与签名校验</strong>
                    <span>内置扩展包数字签名核验与配置文件自动备份恢复</span>
                  </div>
                </div>
              </div>
              <AfCheckbox checked={agreedLicense} onChange={setAgreedLicense}>
                我已阅读并同意《用户许可协议》与《隐私政策》
              </AfCheckbox>
            </div>
          ) : normalizedStage === "configure" ? (
            <div className="af-shell-installer__form af-shell-installer__stage">
              <div className="af-shell-installer__field">
                <span className="af-shell-installer__field-head">
                  <span>安装用户范围</span>
                  <em>{scope === "perMachine" ? "需要管理员 UAC 授权" : "免管理员权限静默部署"}</em>
                </span>
                <AfRadioGroup
                  orientation="horizontal"
                  label="安装用户范围"
                  value={scope}
                  onChange={(val) => setScope(val as AfInstallerScope)}
                  options={[
                    { value: "perUser", label: "仅当前用户（推荐）" },
                    { value: "perMachine", label: "所有用户（本机共享）" },
                  ]}
                />
              </div>

              <div className="af-shell-installer__field">
                <label className="af-shell-installer__field-head" htmlFor={pathInputId}>
                  <span>目标安装路径</span>
                  {pathAutoAppended ? (
                    <em className="af-shell-installer__path-fixed">已自动追加子目录 → {effectivePath}</em>
                  ) : (
                    <em>支持自动识别盘符根路径</em>
                  )}
                </label>
                <div className="af-shell-installer__pathrow">
                  <AfInput
                    id={pathInputId}
                    size="sm"
                    value={installPath}
                    onValueChange={setInstallPath}
                    onBlur={() => {
                      if (installPath !== effectivePath) {
                        setInstallPath(effectivePath);
                      }
                    }}
                  />
                  <AfButton size="sm" variant="secondary" icon="folderOpen" onClick={onBrowsePath}>
                    浏览
                  </AfButton>
                </div>
              </div>

              <div
                className="af-shell-installer__disk"
                data-insufficient={insufficientSpace ? "true" : undefined}
              >
                <div className="af-shell-installer__disk-row">
                  <span>
                    所需空间 <strong>{formatDiskSize(tweenReqMb)}</strong>
                  </span>
                  <span>
                    目标磁盘可用{" "}
                    <strong className="af-shell-installer__disk-avail">
                      {formatDiskSize(tweenAvailMb)}
                    </strong>
                  </span>
                </div>
                <div className="af-shell-installer__disk-track" aria-hidden="true">
                  <div
                    className="af-shell-installer__disk-fill"
                    style={{ width: `${insufficientSpace ? 100 : Math.max(8, usedRatioAfterInstall)}%` }}
                  />
                </div>
                {insufficientSpace ? (
                  <span className="af-shell-installer__disk-err" role="alert">
                    目标磁盘剩余空间不足，请更换磁盘分区或清理至少{" "}
                    {formatDiskSize(requiredSpaceMb - availableSpaceMb)} 空间。
                  </span>
                ) : null}
              </div>

              <div className="af-shell-installer__checks">
                <AfCheckbox checked={desktopShortcut} onChange={setDesktopShortcut}>
                  创建桌面快捷方式
                </AfCheckbox>
                <AfCheckbox checked={launchStartup} onChange={setLaunchStartup}>
                  开机自动驻留系统托盘
                </AfCheckbox>
              </div>
            </div>
          ) : normalizedStage === "error" ? (
            <div className="af-shell-installer__error af-shell-installer__stage" role="alert">
              <div className="af-shell-installer__error-head">
                <AfIcon name="alert" size={16} />
                <strong>安装受阻 · {errorCode}</strong>
              </div>
              <p className="af-shell-installer__error-desc">{errorMessage}</p>
              <details className="af-shell-installer__logs" open>
                <summary>
                  <AfIcon name="terminal" size={12} />
                  <span>错误诊断日志 ({logs.length} 条)</span>
                  <AfIcon name="chevronDown" size={12} />
                </summary>
                <pre>{logs.join("\n")}</pre>
              </details>
            </div>
          ) : (
            <div className="af-shell-installer__progress af-shell-installer__stage">
              <div className="af-shell-installer__status">
                <span>{resolvedStatusText}</span>
                <strong>{indeterminate && normalizedStage === "installing" ? "准备中" : `${displayProgress}%`}</strong>
              </div>

              {indeterminate && normalizedStage === "installing" ? (
                <div className="af-shell-installer__indeterminate" role="progressbar" aria-label="正在准备安装组件">
                  <span className="af-shell-installer__indeterminate-bar" />
                </div>
              ) : (
                <AfProgress
                  value={effectiveProgress}
                  tone={normalizedStage === "complete" ? "success" : "accent"}
                  size="md"
                  label="安装总进度"
                />
              )}

              <div className="af-shell-installer__subphases">
                {(["extracting", "registering", "verifying"] as AfInstallerSubPhase[]).map((phaseKey, idx) => {
                  const activeIdx =
                    inferredSubPhase === "extracting" ? 0 : inferredSubPhase === "registering" ? 1 : 2;
                  const done = normalizedStage === "complete" || idx < activeIdx;
                  const current = normalizedStage === "installing" && idx === activeIdx;
                  return (
                    <span
                      key={phaseKey}
                      className="af-shell-installer__subphase"
                      data-done={done ? "true" : undefined}
                      data-current={current ? "true" : undefined}
                    >
                      <AfIcon name={done ? "checkCircle" : current ? "loader" : "clock"} size={11} />
                      <span>
                        {phaseKey === "extracting"
                          ? "解压核心运行时"
                          : phaseKey === "registering"
                            ? "注册协议与快捷项"
                            : "组件签名核验"}
                      </span>
                    </span>
                  );
                })}
              </div>

              <details className="af-shell-installer__logs">
                <summary>
                  <AfIcon name="terminal" size={12} />
                  <span>安装执行日志 ({logs.length} 条)</span>
                  <AfIcon name="chevronDown" size={12} />
                </summary>
                <pre>{logs.join("\n")}</pre>
              </details>
            </div>
          )}
        </AfSwap>

        <div className="af-shell-installer__foot">
          <span className="af-shell-installer__note">
            <AfIcon name="shield" size={12} />
            <span>目标：{effectivePath}</span>
          </span>
          <div className="af-shell-installer__actions">
            {normalizedStage === "welcome" ? (
              <>
                <AfButton
                  size="md"
                  variant="secondary"
                  disabled={!agreedLicense}
                  onClick={() => setRawStage("configure")}
                >
                  自定义选项
                </AfButton>
                <AfButton
                  size="md"
                  variant="primary"
                  icon="download"
                  disabled={!agreedLicense}
                  onClick={handleStart}
                >
                  快速安装
                </AfButton>
              </>
            ) : normalizedStage === "configure" ? (
              <>
                <AfButton size="md" variant="ghost" onClick={() => setRawStage("welcome")}>
                  上一步
                </AfButton>
                <AfButton
                  size="md"
                  variant="primary"
                  icon="download"
                  disabled={insufficientSpace}
                  onClick={handleStart}
                >
                  立即安装
                </AfButton>
              </>
            ) : normalizedStage === "installing" ? (
              <AfButton size="md" variant="secondary" disabled>
                正在安装…
              </AfButton>
            ) : normalizedStage === "error" ? (
              <>
                <AfButton size="md" variant="ghost" onClick={() => onExportLogs?.(logs)}>
                  导出日志
                </AfButton>
                <AfButton size="md" variant="primary" icon="refresh" onClick={handleRetry}>
                  重试安装
                </AfButton>
              </>
            ) : (
              <>
                <AfButton size="md" variant="ghost" onClick={() => setRawStage("configure")}>
                  返回配置
                </AfButton>
                <AfButton size="md" variant="primary" icon="external" onClick={onLaunch}>
                  立即启动 {appName}
                </AfButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================== */
/* AfRunningProcessesDialog                                                 */
/* ======================================================================== */

export type AfRunningProcessItem = {
  pid: number;
  name: string;
  description?: string;
  memoryMb?: number;
};

export type AfRunningProcessesDialogProps = {
  /** 是否打开弹窗；省略且 `inline !== false` 时默认内嵌卡片渲染以支持零参 SSR 与画廊展示。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 是否以舞台内联卡片渲染（未传 `open` 时默认 `true`）。 */
  inline?: boolean;
  appName?: string;
  processes?: AfRunningProcessItem[];
  killing?: boolean;
  onKillAndContinue?: (pids: number[]) => void | Promise<void>;
  onRetryCheck?: () => void;
  onCancel?: () => void;
  className?: string;
};

const DEFAULT_RUNNING_PROCESSES: AfRunningProcessItem[] = [
  { pid: 18420, name: "CloudDesk.exe", description: "工作台主程序", memoryMb: 164 },
  { pid: 21904, name: "CloudTray.exe", description: "桌面通知与快捷工具服务", memoryMb: 48 },
  { pid: 22612, name: "CloudHelper.exe", description: "本地网络与快捷键服务", memoryMb: 26 },
];

/**
 * 安装前运行进程占用检测对话框：
 * 列出占用安装目录的活跃进程与等宽 `PID`，支持一键结束占用继续安装或重新检测。
 */
export function AfRunningProcessesDialog({
  open,
  onOpenChange,
  inline,
  appName = "云端工作台",
  processes = DEFAULT_RUNNING_PROCESSES,
  killing = false,
  onKillAndContinue,
  onRetryCheck,
  onCancel,
  className,
}: AfRunningProcessesDialogProps = {}) {
  const isInline = inline ?? open === undefined;
  const [busy, setBusy] = useState(false);
  const procListRef = useRef<HTMLDivElement>(null);
  const procFlip = useListFlip(procListRef);

  const handleKillAll = async () => {
    if (busy || killing) return;
    procFlip.capture();
    setBusy(true);
    try {
      await onKillAndContinue?.(processes.map((p) => p.pid));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    onOpenChange?.(false);
    onCancel?.();
  };

  const cardBody = (
    <div className={cn("af-proc-lock", isInline && "af-proc-lock--inline", className)}>
      <div className="af-proc-lock__head">
        <span className="af-proc-lock__icon" aria-hidden="true">
          <AfIcon name="alert" size={16} />
        </span>
        <div className="af-proc-lock__titles">
          <h4>检测到 {appName} 正在运行</h4>
          <p>继续更新或安装前，请先关闭以下 {processes.length} 个占用文件的进程：</p>
        </div>
      </div>

      <div ref={procListRef} className="af-proc-lock__list" data-af-hover-list="wash">
        {processes.map((proc) => (
          <div key={proc.pid} data-flip={String(proc.pid)} className="af-proc-lock__row" data-af-hover-item>
            <span className="af-proc-lock__dot" aria-hidden="true" />
            <div className="af-proc-lock__meta">
              <strong>{proc.name}</strong>
              {proc.description ? <span>{proc.description}</span> : null}
            </div>
            <div className="af-proc-lock__stats">
              {proc.memoryMb !== undefined ? <span>{proc.memoryMb} MB</span> : null}
              <code className="af-proc-lock__pid">PID {proc.pid}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="af-proc-lock__foot">
        <AfButton size="sm" variant="ghost" onClick={handleCancel}>
          取消安装
        </AfButton>
        <div className="af-proc-lock__foot-right">
          <AfButton size="sm" variant="secondary" icon="refresh" onClick={onRetryCheck}>
            重试检测
          </AfButton>
          <AfButton
            size="sm"
            variant="primary"
            loading={busy || killing}
            disabled={processes.length === 0}
            onClick={handleKillAll}
          >
            一键结束占用并继续
          </AfButton>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return cardBody;
  }

  return (
    <AfModal
      open={Boolean(open)}
      onOpenChange={(next) => {
        if (!next) handleCancel();
        else onOpenChange?.(true);
      }}
      title={`请先关闭占用进程 (${processes.length})`}
      width={460}
    >
      {cardBody}
    </AfModal>
  );
}

/* ======================================================================== */
/* AfViewportFitStage                                                       */
/* ======================================================================== */

export type AfViewportFitStageProps = {
  /** 设计基准宽度（px），默认 `520`。 */
  baseWidth?: number;
  /** 设计基准高度（px），默认 `440`。 */
  baseHeight?: number;
  /** 最小等比缩放下限，默认 `0.6`。 */
  minScale?: number;
  /** 最大等比缩放上限，默认 `1`。 */
  maxScale?: number;
  /** 四周安全内边距（px），默认 `12`。 */
  padding?: number;
  /** 是否等待字体就绪后再标记 `data-ready="true"`，默认 `true`。 */
  waitForFonts?: boolean;
  /** 缩放系数变化回调。 */
  onScaleChange?: (scale: number) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * 零滚动条等比缩放视口舞台：
 * 基于 `ResizeObserver` 实时计算 `Math.min(vw / baseW, vh / baseH)` 等比缩放并结合字体就绪门禁，
 * 确保固定无边框向导窗口在 125% / 150% / 175% 高 DPI 小屏设备上完整居中显示且永不溢出滚动条。
 */
export function AfViewportFitStage({
  baseWidth = 520,
  baseHeight = 440,
  minScale = 0.6,
  maxScale = 1,
  padding = 12,
  waitForFonts = true,
  onScaleChange,
  children,
  className,
  style,
}: AfViewportFitStageProps = {}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [fontsReady, setFontsReady] = useState(() => {
    if (!waitForFonts || typeof document === "undefined" || !document.fonts?.ready) {
      return true;
    }
    return document.fonts.status === "loaded";
  });
  const onScaleChangeRef = useRef(onScaleChange);
  onScaleChangeRef.current = onScaleChange;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = hostRef.current;
    if (!host) return;

    const recompute = () => {
      const rect = host.getBoundingClientRect();
      const availW = Math.max(120, rect.width - padding * 2);
      const availH = Math.max(120, rect.height - padding * 2);
      if (rect.width <= 0 || rect.height <= 0) return;
      const raw = Math.min(availW / Math.max(1, baseWidth), availH / Math.max(1, baseHeight));
      const next = Math.round(Math.max(minScale, Math.min(maxScale, raw)) * 1000) / 1000;
      setScale((prev) => {
        if (Math.abs(prev - next) > 0.002) {
          onScaleChangeRef.current?.(next);
          return next;
        }
        return prev;
      });
    };

    recompute();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(recompute) : null;
    ro?.observe(host);
    return () => ro?.disconnect();
  }, [baseWidth, baseHeight, minScale, maxScale, padding]);

  useEffect(() => {
    if (!waitForFonts || typeof document === "undefined" || !document.fonts?.ready) {
      setFontsReady(true);
      return;
    }
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [waitForFonts]);

  return (
    <div
      ref={hostRef}
      className={cn("af-viewport-fit", className)}
      style={style}
      data-ready={fontsReady ? "true" : undefined}
      data-scale={scale}
    >
      <div
        className="af-viewport-fit__frame"
        style={{
          width: baseWidth,
          minHeight: baseHeight,
          transform: scale === 1 ? undefined : `scale(${scale})`,
        }}
      >
        {children ?? <AfInstallerWizard />}
      </div>
    </div>
  );
}
