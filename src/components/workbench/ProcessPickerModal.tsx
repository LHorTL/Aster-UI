import { useMemo, useRef, useState } from "react";
import {
  AfAppMark,
  AfButton,
  AfCheckbox,
  AfInput,
  AfModal,
  AfSwitch,
  AfTag,
  cn,
  useControllableState,
  useListFlip,
} from "../../ui";
import { useTween } from "../../ui-pro";

export interface AfSystemProcessEntry {
  pid: number;
  name: string;
  exePath: string;
  activeNetwork: boolean;
  upRateKbps: number;
  downRateKbps: number;
}

export interface AfProcessPickerModalProps {
  /** 弹窗开关（省略时默认渲染 `inline` 舞台模式）。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 内联预览模式。 */
  inline?: boolean;
  /** 本机运行进程快照列表。 */
  processes?: AfSystemProcessEntry[];
  /** 受控已勾选进程名数组。 */
  selectedNames?: string[];
  defaultSelectedNames?: string[];
  onSelectedNamesChange?: (names: string[]) => void;
  /** 是否默认仅显示活跃网络进程。 */
  defaultActiveNetworkOnly?: boolean;
  /** 确认导入进程规则回调。 */
  onConfirmImport?: (selected: AfSystemProcessEntry[]) => void;
  className?: string;
}

const DEFAULT_PROCESSES: AfSystemProcessEntry[] = [
  {
    pid: 18420,
    name: "chrome.exe",
    exePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    activeNetwork: true,
    upRateKbps: 184,
    downRateKbps: 4620,
  },
  {
    pid: 24912,
    name: "node.exe",
    exePath: "C:\\Program Files\\nodejs\\node.exe",
    activeNetwork: true,
    upRateKbps: 92,
    downRateKbps: 1280,
  },
  {
    pid: 9044,
    name: "git-remote-https.exe",
    exePath: "C:\\Program Files\\Git\\mingw64\\libexec\\git-core\\git-remote-https.exe",
    activeNetwork: true,
    upRateKbps: 48,
    downRateKbps: 840,
  },
  {
    pid: 6108,
    name: "explorer.exe",
    exePath: "C:\\Windows\\explorer.exe",
    activeNetwork: false,
    upRateKbps: 0,
    downRateKbps: 0,
  },
  {
    pid: 31204,
    name: "Docker Desktop.exe",
    exePath: "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
    activeNetwork: true,
    upRateKbps: 310,
    downRateKbps: 2150,
  },
];

function formatKbps(kbps: number): string {
  if (kbps <= 0) return "0 KB/s";
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps} KB/s`;
}

/**
 * 系统网络工作台 · 本机运行进程多选拾取窗（`P3-4`）：
 * - 支持按进程名、完整可执行路径或 `PID` 实时检索，以及「仅显示活跃网络连接进程」过滤；
 * - 列表接入 `data-af-hover-list="hover"` 全局滑动底块，全量 `tabular-nums` 等宽显示 `PID` 与实时上下行吞吐。
 */
export function AfProcessPickerModal({
  open,
  onOpenChange,
  inline,
  processes = DEFAULT_PROCESSES,
  selectedNames: selectedProp,
  defaultSelectedNames = ["node.exe", "git-remote-https.exe"],
  onSelectedNamesChange,
  defaultActiveNetworkOnly = true,
  onConfirmImport,
  className,
}: AfProcessPickerModalProps = {}) {
  const isInline = inline ?? open === undefined;
  const [selected, setSelected] = useControllableState<string[]>({
    value: selectedProp,
    defaultValue: defaultSelectedNames,
    onChange: onSelectedNamesChange,
  });

  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(defaultActiveNetworkOnly);

  const visibleProcesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return processes.filter((p) => {
      if (activeOnly && !p.activeNetwork) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.exePath.toLowerCase().includes(q) ||
        String(p.pid).includes(q)
      );
    });
  }, [processes, query, activeOnly]);

  const pillsListRef = useRef<HTMLDivElement>(null);
  const pillsFlip = useListFlip(pillsListRef);
  const smoothSelectedCount = Math.round(useTween(selected.length, 220));

  const toggleProcess = (name: string) => {
    pillsFlip.capture();
    setSelected(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );
  };

  const selectedEntries = useMemo(
    () => processes.filter((p) => selected.includes(p.name)),
    [processes, selected],
  );

  const body = (
    <div className={cn("af-proc-picker", isInline && "af-proc-picker--inline", className)}>
      <div className="af-proc-picker__head">
        <div>
          <h4>选择本地运行进程</h4>
          <span>勾选需要分流的本地应用，自动按进程名称生成分流规则</span>
        </div>
        <AfTag tone="accent" size="sm">
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            已选 {smoothSelectedCount} 项
          </span>
        </AfTag>
      </div>

      {/* 检索与活跃网络过滤栏 */}
      <div className="af-proc-picker__toolbar">
        <div className="af-proc-picker__search">
          <AfInput
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索进程名、可执行路径或 PID…"
            aria-label="搜索进程名或 PID"
          />
        </div>
        <label className="af-proc-picker__net-switch">
          <AfSwitch
            size="sm"
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
            aria-label="仅显示活跃网络进程"
          />
          <span>仅活跃连接</span>
        </label>
      </div>

      {/* 进程列表（滑动底块悬停） */}
      <div
        className="af-proc-picker__list"
        data-af-hover-list="hover"
        role="listbox"
        aria-multiselectable="true"
        aria-label="运行进程列表"
      >
        {visibleProcesses.length === 0 ? (
          <div className="af-proc-picker__empty">未找到匹配的运行进程</div>
        ) : (
          visibleProcesses.map((proc, idx) => {
            const checked = selected.includes(proc.name);
            return (
              <div
                key={proc.pid}
                role="option"
                aria-selected={checked}
                tabIndex={0}
                data-af-hover-item
                data-pid={proc.pid}
                data-selected={checked ? "true" : undefined}
                className="af-proc-picker__row"
                onClick={() => toggleProcess(proc.name)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleProcess(proc.name);
                  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const nextIdx =
                      (idx + (e.key === "ArrowDown" ? 1 : -1) + visibleProcesses.length) %
                      visibleProcesses.length;
                    const rows = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="option"]');
                    rows?.[nextIdx]?.focus();
                  }
                }}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <AfCheckbox
                    size="sm"
                    variant="plain"
                    checked={checked}
                    onCheckedChange={() => toggleProcess(proc.name)}
                    ariaLabel={`选择进程 ${proc.name}`}
                  />
                </div>

                <AfAppMark size={26} name={proc.name} tone={checked ? "accent" : "neutral"} />

                <div className="af-proc-picker__meta">
                  <div className="af-proc-picker__name-row">
                    <strong>{proc.name}</strong>
                    <span className="af-proc-picker__pid">PID {proc.pid}</span>
                  </div>
                  <code className="af-proc-picker__path">{proc.exePath}</code>
                </div>

                <div className="af-proc-picker__rates">
                  <span>↑ {formatKbps(proc.upRateKbps)}</span>
                  <strong>↓ {formatKbps(proc.downRateKbps)}</strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底栏：已选胶囊与导入确认 */}
      <div className="af-proc-picker__foot">
        <div ref={pillsListRef} className="af-proc-picker__pills">
          {selected.map((name) => (
            <span key={name} data-flip={name} className="af-proc-picker__pill">
              <code>{name}</code>
            </span>
          ))}
        </div>

        <div className="af-proc-picker__actions">
          {selected.length > 0 ? (
            <AfButton
              size="sm"
              variant="ghost"
              onClick={() => {
                pillsFlip.capture();
                setSelected([]);
              }}
            >
              清空
            </AfButton>
          ) : null}
          <AfButton
            size="sm"
            variant="primary"
            icon="check"
            disabled={selected.length === 0}
            onClick={() => onConfirmImport?.(selectedEntries)}
          >
            导入进程规则 ({selected.length})
          </AfButton>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return body;
  }

  return (
    <AfModal
      open={Boolean(open)}
      closable
      onClose={() => onOpenChange?.(false)}
      title="拾取本机运行进程"
      width={620}
    >
      {body}
    </AfModal>
  );
}
