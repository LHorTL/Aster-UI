import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon, renderAfIconSlot, type AfIconName, type AfIconSlot } from "../../icons";
import {
  cn,
  useControllableState,
  useExitTransition,
  useHitAreaCollector,
  useListFlip,
  useReversibleEdgePeek,
  useWindowPointerDrag,
  type AfHitRect,
  type AfWindowDragMovePayload,
} from "../../primitives";
import { AfButton, AfSegmented, AfSelect, AfTag, AfTextarea } from "../../ui";
import { useTweens } from "../advanced/shared";

/** 悬浮入口停靠边缘模式。 */
export type AfDesktopToolsEdge = "left" | "right" | "top" | "free";

/** 工具面板宿主呈现模式：`inline`（同画布内联展开）或 `detached`（联动外部独立 360×520 子窗口）。 */
export type AfDesktopToolsPanelMode = "inline" | "detached";

/** 工具条目在快捷栏中的实时摘要指标。 */
export type AfDesktopToolSummary = {
  metric?: string;
  /** 0–1 之间的小数，表示配额或任务剩余比例。 */
  progress?: number;
  status?: string;
  hint?: string;
  updatedAt?: number;
};

/** 桌面工具条目定义。 */
export type AfDesktopToolItem = {
  id: string;
  name: string;
  desc?: string;
  icon?: AfIconSlot;
  enabled: boolean;
  pinned?: boolean;
  badge?: string;
  order?: number;
  summary?: AfDesktopToolSummary;
  /** 可选自定义分类说明（兼容旧扩展字段）。 */
  category?: string;
  shortcut?: string;
};

/** `AfDesktopToolItem` 语义别名。 */
export type AfDesktopToolEntry = AfDesktopToolItem;

/** 桌面工具栏持久化偏好。 */
export type AfDesktopToolsPreferences = {
  edge: AfDesktopToolsEdge;
  yRatio: number;
  expanded: boolean;
  railCollapsed?: boolean;
  selectedId?: string | null;
};

/** 自定义子应用工具面板渲染上下文。 */
export type AfDesktopToolPanelProps = {
  entry: AfDesktopToolItem;
  summary?: AfDesktopToolSummary;
  updateSummary: (next?: AfDesktopToolSummary) => void;
  openMainWindow: () => void;
  closePanel: () => void;
};

/** 桌面边缘悬浮球与快捷工具面板属性。 */
export type AfDesktopToolsProps = {
  entries?: AfDesktopToolItem[];
  /** `entries` 兼容别名。 */
  tools?: AfDesktopToolItem[];
  defaultEntries?: AfDesktopToolItem[];
  onEntriesChange?: (next: AfDesktopToolItem[]) => void;
  preferences?: Partial<AfDesktopToolsPreferences>;
  defaultPreferences?: Partial<AfDesktopToolsPreferences>;
  onPreferencesChange?: (next: AfDesktopToolsPreferences) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  railCollapsed?: boolean;
  defaultRailCollapsed?: boolean;
  onRailCollapsedChange?: (collapsed: boolean) => void;
  activeToolId?: string | null;
  defaultActiveToolId?: string | null;
  onActiveToolIdChange?: (id: string | null) => void;
  edge?: AfDesktopToolsEdge;
  defaultEdge?: AfDesktopToolsEdge;
  onEdgeChange?: (edge: AfDesktopToolsEdge) => void;
  yRatio?: number;
  defaultYRatio?: number;
  onYRatioChange?: (yRatio: number) => void;
  /** 屏幕边缘半隐露头比例（`0–1`），默认 `0.5`（收起且贴边时隐藏一半，悬停 `70ms` 探出）。 */
  collapsedRatio?: number;
  /** 是否启用边缘半隐露头与中途可逆探出，默认 `true`。 */
  edgePeek?: boolean;
  /** 实时探出插值进度变化回调 `[0, 1]`。 */
  onPeekProgressChange?: (progress: number) => void;
  /** 二级工具面板呈现模式：`inline`（同画布展开）或 `detached`（联动独立 `360×520` 子窗），默认 `"inline"`。 */
  panelMode?: AfDesktopToolsPanelMode;
  /** 面板开闭同步回调（供独立 `360×520` 面板子窗联动）。 */
  onPanelOpenChange?: (open: boolean, activeToolId: string | null) => void;
  /** 宿主透明窗口拖拽屏幕位移回调。 */
  onWindowMove?: (payload: AfWindowDragMovePayload) => void;
  /** 透明穿透窗口可交互热区矩形上报回调。 */
  onHitAreasChange?: (rects: AfHitRect[]) => void;
  /** 按工具 ID 自定义二级展开面板内容；未提供时使用内置默认面板。 */
  renderPanel?: (ctx: AfDesktopToolPanelProps) => ReactNode;
  /** 点击“打开主窗口”或工具内主窗口跳转时触发。 */
  onOpenMainWindow?: () => void;
  /** 悬浮球无障碍提示标题。 */
  orbTitle?: string;
  /** 是否在内置桌面画布舞台中预览展示（默认 true；宿主透明窗口嵌入时可设为 false）。 */
  embedded?: boolean;
  className?: string;
  style?: CSSProperties;
};

const MANAGE_PANEL_ID = "__manage__";

const DEFAULT_ENTRIES: AfDesktopToolItem[] = [
  {
    id: "usage-glance",
    name: "用量速览",
    desc: "查看今日请求配额余量与周期重置进度",
    icon: "chart",
    enabled: true,
    pinned: true,
    summary: {
      metric: "72%",
      progress: 0.72,
      status: "今日额度余量",
      hint: "周重置 5 天后",
    },
  },
  {
    id: "translate",
    name: "翻译",
    desc: "划词与截屏即时双向对照翻译",
    icon: "translate",
    enabled: true,
    pinned: false,
    badge: "Alt+Q",
    summary: {
      status: "即时互译就绪",
      hint: "自动识别 → 简体中文",
    },
  },
  {
    id: "focus-timer",
    name: "专注计时",
    desc: "番茄钟倒计时与阶段休息提醒",
    icon: "clock",
    enabled: true,
    pinned: false,
    summary: {
      status: "专注模式 · 就绪",
      hint: "默认时长 25 分钟",
    },
  },
  {
    id: "quick-memo",
    name: "速记便签",
    desc: "随手记录灵感片段、待办事项与剪贴板摘录",
    icon: "file",
    enabled: false,
    pinned: false,
    badge: "Beta",
    summary: {
      status: "待加入快捷栏",
      hint: "本地自动保存",
    },
  },
];

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0.12, Math.min(0.88, value));
}

function normalizeEntries(items: AfDesktopToolItem[]): AfDesktopToolItem[] {
  const pinned: AfDesktopToolItem[] = [];
  const regular: AfDesktopToolItem[] = [];
  const disabled: AfDesktopToolItem[] = [];
  for (const item of items) {
    if (!item.enabled) disabled.push(item);
    else if (item.pinned) pinned.push(item);
    else regular.push(item);
  }
  return [...pinned, ...regular, ...disabled];
}

function edgeLabel(edge: AfDesktopToolsEdge): string {
  if (edge === "left") return "左缘停靠";
  if (edge === "top") return "顶缘停靠";
  if (edge === "free") return "自由悬浮";
  return "右缘停靠";
}

/** 悬浮入口极简工具锦囊徽标（继承 currentColor）。 */
function ToolsOrbMark() {
  return (
    <svg
      className="af-shell-tools__orb-mark"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5h6l-1.2 3h-3.6L9 5Z" />
      <path d="M8.5 8h7c2.4 2.3 3.5 5 3.5 7.4 0 2.6-2.1 4.1-7 4.1s-7-1.5-7-4.1c0-2.4 1.1-5.1 3.5-7.4Z" />
      <path d="M10 13h4" />
      <path d="M12 11v4" />
    </svg>
  );
}

type ToolBoundaryProps = {
  entryName: string;
  children: ReactNode;
};

type ToolBoundaryState = {
  hasError: boolean;
};

class ToolBoundary extends Component<ToolBoundaryProps, ToolBoundaryState> {
  state: ToolBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ToolBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // 面板隔离错误边界，防止子工具异常导致悬浮工具栏整体崩溃。
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="af-shell-tools__error" role="alert">
          <p className="af-shell-tools__error-title">{this.props.entryName} 面板暂时无法显示</p>
          <AfButton size="xs" variant="secondary" onClick={() => this.setState({ hasError: false })}>
            重新加载
          </AfButton>
        </div>
      );
    }
    return this.props.children;
  }
}

const QUOTA_SAMPLES = [
  { primary: 72, weekly: 86, reset: "今天 18:40", note: "刚刚同步" },
  { primary: 64, weekly: 82, reset: "今天 17:15", note: "1 分钟前" },
  { primary: 88, weekly: 91, reset: "今天 20:00", note: "实时额度" },
];

function UsageGlanceToolPanel({ summary, updateSummary, openMainWindow }: AfDesktopToolPanelProps) {
  const [sampleIdx, setSampleIdx] = useState(0);
  const sample = QUOTA_SAMPLES[sampleIdx];
  const primaryPct =
    typeof summary?.progress === "number" ? Math.max(0, Math.min(100, Math.round(summary.progress * 100))) : sample.primary;
  const [animPrimary, animWeekly] = useTweens([primaryPct, sample.weekly], 380);
  const displayPrimary = Math.round(animPrimary ?? primaryPct);
  const displayWeekly = Math.round(animWeekly ?? sample.weekly);

  const handleRefresh = () => {
    const nextIdx = (sampleIdx + 1) % QUOTA_SAMPLES.length;
    const next = QUOTA_SAMPLES[nextIdx];
    setSampleIdx(nextIdx);
    updateSummary({
      metric: `${next.primary}%`,
      progress: next.primary / 100,
      status: "今日额度余量",
      hint: `${next.note} · ${next.reset}`,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="af-shell-tools__subpanel">
      <div className="af-shell-tools__subcard">
        <div className="af-shell-tools__subrow">
          <span className="af-shell-tools__sublabel">今日主配额剩余</span>
          <strong className="af-shell-tools__subval">{displayPrimary}%</strong>
        </div>
        <div className="af-shell-tools__quota-track" aria-hidden="true">
          <div className="af-shell-tools__quota-fill" style={{ width: `${primaryPct}%` }} />
        </div>
        <span className="af-shell-tools__subhint">预计重置：{sample.reset}</span>
      </div>

      <div className="af-shell-tools__subcard">
        <div className="af-shell-tools__subrow">
          <span className="af-shell-tools__sublabel">本周累计余量</span>
          <strong className="af-shell-tools__subval">{displayWeekly}%</strong>
        </div>
        <div className="af-shell-tools__quota-track" aria-hidden="true">
          <div className="af-shell-tools__quota-fill" data-tone="muted" style={{ width: `${sample.weekly}%` }} />
        </div>
        <span className="af-shell-tools__subhint">已汇总当前工作区全部活动请求</span>
      </div>

      <div className="af-shell-tools__subactions">
        <AfButton size="xs" variant="secondary" icon="refresh" onClick={handleRefresh}>
          刷新额度
        </AfButton>
        <AfButton size="xs" variant="ghost" onClick={openMainWindow}>
          查看用量详情
        </AfButton>
      </div>
    </div>
  );
}

const TRANSLATE_TARGETS = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

const TRANSLATION_PRESETS: Record<string, string> = {
  "zh-CN": "季度产品评审会议调整至周四下午三点，请提前同步演示稿。",
  en: "Quarterly product review moved to Thursday 3:00 PM; please share slides ahead.",
  ja: "四半期プロダクトレビューは木曜 15:00 に変更されました。事前に資料を共有してください。",
};

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return Boolean(document.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

function TranslateToolPanel({ updateSummary }: AfDesktopToolPanelProps) {
  const [targetLang, setTargetLang] = useState("zh-CN");
  const [sourceText, setSourceText] = useState("Quarterly product review moved to Thursday 3:00 PM; please share slides ahead.");
  const [translated, setTranslated] = useState(TRANSLATION_PRESETS["zh-CN"]);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const runTranslate = (lang: string, text: string) => {
    const label = TRANSLATE_TARGETS.find((item) => item.value === lang)?.label ?? lang;
    const trimmed = text.trim();
    if (!trimmed) {
      setTranslated("请输入或截屏提取待翻译文本。");
      return;
    }
    const base =
      trimmed === "Quarterly product review moved to Thursday 3:00 PM; please share slides ahead."
        ? TRANSLATION_PRESETS[lang]
        : `[${label}] ${trimmed}`;
    setTranslated(base);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setCopied(false);
    updateSummary({
      status: "即时互译就绪",
      hint: `自动识别 → ${label}`,
      updatedAt: Date.now(),
    });
  };

  const handleScreenshot = () => {
    const sample = "Release v2.4 rollout completed across all regional nodes.";
    setSourceText(sample);
    runTranslate(targetLang, sample);
  };

  return (
    <div className="af-shell-tools__subpanel">
      <div className="af-shell-tools__translate-bar">
        <AfTag size="sm" variant="soft">
          自动识别
        </AfTag>
        <AfIcon name="chevronRight" size={12} className="af-shell-tools__muted-icon" />
        <AfSelect
          size="sm"
          label="目标语言"
          width={132}
          value={targetLang}
          options={TRANSLATE_TARGETS}
          onChange={(next) => {
            setTargetLang(next);
            runTranslate(next, sourceText);
          }}
        />
      </div>

      <AfTextarea
        rows={2}
        resize="none"
        value={sourceText}
        onValueChange={setSourceText}
        placeholder="输入要翻译的词句或代码注释…"
        aria-label="原文输入"
      />

      <div className="af-shell-tools__subactions">
        <AfButton size="xs" variant="primary" icon="translate" onClick={() => runTranslate(targetLang, sourceText)}>
          翻译
        </AfButton>
        <AfButton size="xs" variant="secondary" icon="camera" onClick={handleScreenshot}>
          截屏翻译
        </AfButton>
      </div>

      <div className="af-shell-tools__result-box">
        <div className="af-shell-tools__subrow">
          <span className="af-shell-tools__subhint">译文结果</span>
          <AfButton
            size="xs"
            variant="ghost"
            onClick={() => {
              void copyTextSafe(translated).then((ok) => {
                if (!ok || !mountedRef.current) return;
                if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
                setCopied(true);
                copyTimerRef.current = window.setTimeout(() => {
                  copyTimerRef.current = null;
                  if (mountedRef.current) setCopied(false);
                }, 1400);
              });
            }}
          >
            {copied ? "已复制" : "复制"}
          </AfButton>
        </div>
        <p className="af-shell-tools__result-text">{translated}</p>
      </div>
    </div>
  );
}

const FOCUS_SCENES = [
  { id: "s1", name: "深度写作", note: "静音次要提醒" },
  { id: "s2", name: "代码评审", note: "保留高优通知" },
];

const FOCUS_PRESETS = ["15 分钟", "25 分钟", "45 分钟", "60 分钟"];
const BREAK_PRESETS = ["5 分钟", "10 分钟", "15 分钟"];

function parsePresetSeconds(preset: string): number {
  const mins = Number.parseInt(preset, 10);
  return (Number.isFinite(mins) && mins > 0 ? mins : 25) * 60;
}

function formatFocusClock(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function FocusTimerToolPanel({ updateSummary, openMainWindow }: AfDesktopToolPanelProps) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [duration, setDuration] = useState("25 分钟");
  const [timerStarted, setTimerStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => parsePresetSeconds("25 分钟"));

  const scene = FOCUS_SCENES[sceneIdx];
  const presets = mode === "focus" ? FOCUS_PRESETS : BREAK_PRESETS;

  useEffect(() => {
    if (!timerStarted || typeof window === "undefined") return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerStarted]);

  const handleSelectDuration = (nextDuration: string) => {
    setDuration(nextDuration);
    setTimerStarted(false);
    setSecondsLeft(parsePresetSeconds(nextDuration));
    updateSummary({
      status: `${scene.name} · 就绪`,
      hint: `预设时长 ${nextDuration}`,
      updatedAt: Date.now(),
    });
  };

  const timerExit = useExitTransition(timerStarted, 150);

  return (
    <div className="af-shell-tools__subpanel">
      <div className="af-shell-tools__subcard">
        <div className="af-shell-tools__subrow">
          <div className="af-shell-tools__role-meta">
            <AfTag size="xs" tone="success" icon="checkCircle">
              就绪
            </AfTag>
            <span className="af-shell-tools__role-name">
              {scene.name} · {scene.note}
            </span>
          </div>
          <AfButton
            size="xs"
            variant="ghost"
            icon="refresh"
            aria-label="切换专注场景"
            onClick={() => {
              const nextIdx = (sceneIdx + 1) % FOCUS_SCENES.length;
              const nextScene = FOCUS_SCENES[nextIdx];
              setSceneIdx(nextIdx);
              setTimerStarted(false);
              updateSummary({
                status: `${nextScene.name} · 就绪`,
                hint: `预设时长 ${duration}`,
                updatedAt: Date.now(),
              });
            }}
          />
        </div>
      </div>

      <AfSegmented
        size="xs"
        aria-label="计时模式"
        value={mode}
        onChange={(next) => {
          const nextMode = next as "focus" | "break";
          const firstPreset = nextMode === "focus" ? FOCUS_PRESETS[1] : BREAK_PRESETS[1];
          setMode(nextMode);
          handleSelectDuration(firstPreset);
        }}
        options={[
          { value: "focus", label: "专注时段" },
          { value: "break", label: "短休放松" },
        ]}
      />

      <div className="af-shell-tools__preset-row" role="group" aria-label="预设时长">
        {presets.map((preset) => (
          <AfButton
            key={preset}
            size="xs"
            variant={duration === preset ? "primary" : "secondary"}
            aria-pressed={duration === preset}
            onClick={() => handleSelectDuration(preset)}
          >
            {preset}
          </AfButton>
        ))}
      </div>

      <div className="af-shell-tools__subactions">
        <AfButton
          size="xs"
          variant="primary"
          onClick={() => {
            if (timerStarted) {
              setTimerStarted(false);
              updateSummary({
                status: `已暂停 · ${scene.name}`,
                hint: `剩余 ${formatFocusClock(secondsLeft)}`,
                updatedAt: Date.now(),
              });
              return;
            }
            const startSec = secondsLeft > 0 ? secondsLeft : parsePresetSeconds(duration);
            setSecondsLeft(startSec);
            setTimerStarted(true);
            updateSummary({
              status: `计时中 · ${scene.name}`,
              hint: `剩余 ${formatFocusClock(startSec)}`,
              updatedAt: Date.now(),
            });
          }}
        >
          {timerStarted ? "暂停计时" : "开始倒计时"}
        </AfButton>
        <AfButton size="xs" variant="ghost" onClick={openMainWindow}>
          打开主面板
        </AfButton>
      </div>

      {timerExit.mounted ? (
        <div
          className="af-shell-tools__result-box af-pj-panel-in"
          data-closing={timerExit.closing ? "true" : undefined}
          style={timerExit.closing ? { opacity: 0, transition: "opacity 140ms ease-in" } : undefined}
        >
          <span className="af-shell-tools__subhint" style={{ fontVariantNumeric: "tabular-nums" }}>
            专注时段进行中 · 剩余 {formatFocusClock(secondsLeft)}
          </span>
          <p className="af-shell-tools__result-text">
            {scene.name} · {duration} 倒计时已开启，期间将自动静音普通通知。
          </p>
        </div>
      ) : null}
    </div>
  );
}

function GenericToolPanel({ entry, summary, openMainWindow }: AfDesktopToolPanelProps) {
  return (
    <div className="af-shell-tools__subpanel">
      <div className="af-shell-tools__subcard">
        <div className="af-shell-tools__subrow">
          <span className="af-shell-tools__sublabel">{entry.name}</span>
          {entry.badge ? (
            <AfTag size="xs" variant="soft">
              {entry.badge}
            </AfTag>
          ) : null}
        </div>
        {entry.desc ? <p className="af-shell-tools__result-text">{entry.desc}</p> : null}
        {summary?.hint ? <span className="af-shell-tools__subhint">{summary.hint}</span> : null}
      </div>
      <div className="af-shell-tools__subactions">
        <AfButton size="xs" variant="secondary" onClick={openMainWindow}>
          在主窗口打开
        </AfButton>
      </div>
    </div>
  );
}

function ToolContent(props: AfDesktopToolPanelProps & { renderPanel?: (ctx: AfDesktopToolPanelProps) => ReactNode }) {
  if (props.renderPanel) {
    return <>{props.renderPanel(props)}</>;
  }
  switch (props.entry.id) {
    case "usage-glance":
    case "token-stats":
      return <UsageGlanceToolPanel {...props} />;
    case "translate":
      return <TranslateToolPanel {...props} />;
    case "focus-timer":
      return <FocusTimerToolPanel {...props} />;
    default:
      return <GenericToolPanel {...props} />;
  }
}

type ManageToolsPanelProps = {
  entries: AfDesktopToolItem[];
  enabledCount: number;
  edge: AfDesktopToolsEdge;
  onChangeEdge: (edge: AfDesktopToolsEdge) => void;
  onToggleEnabled: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onMoveEntry: (id: string, delta: -1 | 1) => void;
  onClose: () => void;
};

function ManageToolsPanel({
  entries,
  enabledCount,
  edge,
  onChangeEdge,
  onToggleEnabled,
  onTogglePinned,
  onMoveEntry,
  onClose,
}: ManageToolsPanelProps) {
  const enabledList = entries.filter((item) => item.enabled);
  const disabledList = entries.filter((item) => !item.enabled);
  const manageListRef = useRef<HTMLDivElement>(null);
  const manageFlip = useListFlip(manageListRef);

  return (
    <div className="af-shell-tools__manage">
      <div className="af-shell-tools__panel-head">
        <div className="af-shell-tools__panel-titles">
          <span className="af-shell-tools__panel-icon" aria-hidden="true">
            <AfIcon name="sliders" size={15} />
          </span>
          <div className="af-shell-tools__panel-heading">
            <h3 className="af-shell-tools__panel-title">管理工具</h3>
            <span className="af-shell-tools__panel-sub">已启用 {enabledCount} 项 · 置顶与停靠调整</span>
          </div>
        </div>
        <AfButton size="xs" variant="ghost" icon="x" aria-label="关闭管理工具" onClick={onClose} />
      </div>

      <div className="af-shell-tools__manage-dock">
        <span className="af-shell-tools__subhint">悬浮球停靠位置</span>
        <AfSegmented
          size="xs"
          aria-label="悬浮球停靠位置"
          value={edge}
          onChange={(next) => onChangeEdge(next as AfDesktopToolsEdge)}
          options={[
            { value: "left", label: "贴靠左缘" },
            { value: "top", label: "贴靠顶缘" },
            { value: "free", label: "自由悬浮" },
            { value: "right", label: "贴靠右缘" },
          ]}
        />
      </div>

      <div className="af-shell-tools__manage-body">
        <div className="af-shell-tools__manage-group">
          <span className="af-shell-tools__manage-caption">快捷栏顺序</span>
          <div ref={manageListRef} className="af-shell-tools__manage-list" data-af-hover-list="wash">
            {enabledList.map((entry, idx) => {
              const prevSameGroup = idx > 0 && Boolean(enabledList[idx - 1].pinned) === Boolean(entry.pinned);
              const nextSameGroup =
                idx < enabledList.length - 1 && Boolean(enabledList[idx + 1].pinned) === Boolean(entry.pinned);

              return (
                <div className="af-shell-tools__manage-row" key={entry.id} data-flip={entry.id} data-af-hover-item>
                  <span className="af-shell-tools__entry-icon" aria-hidden="true">
                    {renderAfIconSlot(entry.icon ?? "sliders", 14)}
                  </span>
                  <div className="af-shell-tools__manage-meta">
                    <span className="af-shell-tools__manage-name">{entry.name}</span>
                    {entry.pinned ? (
                      <AfTag size="xs" tone="accent" variant="soft">
                        已置顶
                      </AfTag>
                    ) : null}
                  </div>
                  <div className="af-shell-tools__manage-ops">
                    <AfButton
                      size="xs"
                      variant={entry.pinned ? "primary" : "ghost"}
                      icon="star"
                      aria-label={entry.pinned ? `取消固定${entry.name}` : `固定${entry.name}`}
                      aria-pressed={Boolean(entry.pinned)}
                      onClick={() => {
                        manageFlip.capture();
                        onTogglePinned(entry.id);
                      }}
                    />
                    <AfButton
                      size="xs"
                      variant="ghost"
                      icon="chevronUp"
                      disabled={!prevSameGroup}
                      aria-label={`上移${entry.name}`}
                      onClick={() => {
                        manageFlip.capture();
                        onMoveEntry(entry.id, -1);
                      }}
                    />
                    <AfButton
                      size="xs"
                      variant="ghost"
                      icon="chevronDown"
                      disabled={!nextSameGroup}
                      aria-label={`下移${entry.name}`}
                      onClick={() => {
                        manageFlip.capture();
                        onMoveEntry(entry.id, 1);
                      }}
                    />
                    <AfButton
                      size="xs"
                      variant="subtle"
                      aria-label={`移除${entry.name}`}
                      onClick={() => {
                        manageFlip.capture();
                        onToggleEnabled(entry.id);
                      }}
                    >
                      移除
                    </AfButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {disabledList.length > 0 ? (
          <div className="af-shell-tools__manage-group">
            <span className="af-shell-tools__manage-caption">可加入工具</span>
            <div className="af-shell-tools__manage-list" data-af-hover-list="wash">
              {disabledList.map((entry) => (
                <div className="af-shell-tools__manage-row" key={entry.id} data-af-hover-item>
                  <span className="af-shell-tools__entry-icon" aria-hidden="true">
                    {renderAfIconSlot(entry.icon ?? "sliders", 14)}
                  </span>
                  <div className="af-shell-tools__manage-meta">
                    <span className="af-shell-tools__manage-name">{entry.name}</span>
                  </div>
                  <div className="af-shell-tools__manage-ops">
                    <AfButton
                      size="xs"
                      variant="secondary"
                      aria-label={`加入${entry.name}`}
                      onClick={() => onToggleEnabled(entry.id)}
                    >
                      加入
                    </AfButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 桌面边缘悬浮工具面板：
 * 三段式桌面快捷表面：
 * 1. 可拖拽边缘停靠悬浮球（支持 Pointer Capture、4px 防误触与键盘微调/停靠）
 * 2. 可折叠“快捷工具”列表轨（实时配额百分比进度条、置顶分组、滑动 hover 底块）
 * 3. 二级滑出工具/管理面板（内置用量速览、翻译、专注计时与工具管理、错误边界与 Esc 关闭）
 */
export function AfDesktopTools({
  entries: entriesProp,
  tools: toolsProp,
  defaultEntries,
  onEntriesChange,
  preferences,
  defaultPreferences,
  onPreferencesChange,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  railCollapsed: railCollapsedProp,
  defaultRailCollapsed,
  onRailCollapsedChange,
  activeToolId: activeToolIdProp,
  defaultActiveToolId,
  onActiveToolIdChange,
  edge: edgeProp,
  defaultEdge,
  onEdgeChange,
  yRatio: yRatioProp,
  defaultYRatio,
  onYRatioChange,
  collapsedRatio = 0.5,
  edgePeek = true,
  onPeekProgressChange,
  panelMode = "inline",
  onPanelOpenChange,
  onWindowMove,
  onHitAreasChange,
  renderPanel,
  onOpenMainWindow,
  orbTitle = "快捷工具",
  embedded = true,
  className,
  style,
}: AfDesktopToolsProps = {}) {
  const railId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const suppressClickUntilRef = useRef(0);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);

  const initialEntries = useMemo(
    () => normalizeEntries(defaultEntries ?? DEFAULT_ENTRIES),
    [defaultEntries],
  );

  const [entriesState, setEntriesState] = useControllableState<AfDesktopToolItem[]>({
    value: entriesProp ?? toolsProp,
    defaultValue: initialEntries,
    onChange: onEntriesChange,
  });

  // 当受控只读模式未传 onEntriesChange 时，本地保留摘要即时更新反馈。
  const [summaryOverrides, setSummaryOverrides] = useState<Record<string, AfDesktopToolSummary>>({});
  const controlledInputRef = useRef(entriesProp ?? toolsProp);
  useEffect(() => {
    const nextProp = entriesProp ?? toolsProp;
    if (controlledInputRef.current !== nextProp) {
      controlledInputRef.current = nextProp;
      setSummaryOverrides({});
    }
  }, [entriesProp, toolsProp]);

  const entries = useMemo(() => {
    const normalized = normalizeEntries(entriesState);
    if (Object.keys(summaryOverrides).length === 0) return normalized;
    return normalized.map((item) =>
      summaryOverrides[item.id] ? { ...item, summary: summaryOverrides[item.id] } : item,
    );
  }, [entriesState, summaryOverrides]);

  const [expanded, setExpanded] = useControllableState<boolean>({
    value: expandedProp ?? preferences?.expanded,
    defaultValue: defaultExpanded ?? defaultPreferences?.expanded ?? true,
    onChange: onExpandedChange,
  });

  const [railCollapsed, setRailCollapsed] = useControllableState<boolean>({
    value: railCollapsedProp ?? preferences?.railCollapsed,
    defaultValue: defaultRailCollapsed ?? defaultPreferences?.railCollapsed ?? false,
    onChange: onRailCollapsedChange,
  });

  const [activeToolId, setActiveToolId] = useControllableState<string | null>({
    value: activeToolIdProp !== undefined ? activeToolIdProp : preferences?.selectedId,
    defaultValue:
      defaultActiveToolId !== undefined
        ? defaultActiveToolId
        : defaultPreferences?.selectedId !== undefined
          ? defaultPreferences.selectedId
          : "usage-glance",
    onChange: onActiveToolIdChange,
  });

  const [edge, setEdge] = useControllableState<AfDesktopToolsEdge>({
    value: edgeProp ?? preferences?.edge,
    defaultValue: defaultEdge ?? defaultPreferences?.edge ?? "right",
    onChange: onEdgeChange,
  });

  const [yRatio, setYRatio] = useControllableState<number>({
    value: yRatioProp ?? preferences?.yRatio,
    defaultValue: clampRatio(defaultYRatio ?? defaultPreferences?.yRatio ?? 0.5),
    onChange: onYRatioChange,
  });

  const emitPreferences = useCallback(
    (patch: Partial<AfDesktopToolsPreferences>) => {
      onPreferencesChange?.({
        edge: patch.edge ?? edge,
        yRatio: patch.yRatio ?? yRatio,
        expanded: patch.expanded ?? expanded,
        railCollapsed: patch.railCollapsed ?? railCollapsed,
        selectedId: patch.selectedId !== undefined ? patch.selectedId : activeToolId,
      });
    },
    [onPreferencesChange, edge, yRatio, expanded, railCollapsed, activeToolId],
  );

  const enabledEntries = useMemo(() => entries.filter((item) => item.enabled), [entries]);
  const isManaging = expanded && activeToolId === MANAGE_PANEL_ID;
  const activeEntry = useMemo(
    () => (activeToolId && activeToolId !== MANAGE_PANEL_ID ? enabledEntries.find((e) => e.id === activeToolId) ?? null : null),
    [activeToolId, enabledEntries],
  );
  const logicalPanelOpen = expanded && (isManaging || activeEntry !== null);
  const panelOpen = panelMode === "inline" && logicalPanelOpen;
  const docked = edge !== "free";

  const panelExit = useExitTransition(panelOpen, 180);
  const frozenPanelRef = useRef<{ isManaging: boolean; entry: AfDesktopToolItem | null }>({
    isManaging,
    entry: activeEntry,
  });
  if (panelOpen) {
    frozenPanelRef.current = { isManaging, entry: activeEntry };
  }
  const renderedManaging = panelOpen ? isManaging : frozenPanelRef.current.isManaging;
  const renderedEntry = panelOpen ? activeEntry : frozenPanelRef.current.entry;

  const prevLogicalPanelRef = useRef<string | null>(null);
  useEffect(() => {
    const sig = `${logicalPanelOpen}:${activeToolId ?? ""}`;
    if (prevLogicalPanelRef.current === sig) return;
    prevLogicalPanelRef.current = sig;
    onPanelOpenChange?.(logicalPanelOpen, logicalPanelOpen ? activeToolId : null);
  }, [logicalPanelOpen, activeToolId, onPanelOpenChange]);

  const winDrag = useWindowPointerDrag({
    threshold: 4,
    disabled: embedded || !onWindowMove,
    onMove: onWindowMove,
  });

  const peekSide = edge === "left" ? "left" : edge === "top" ? "top" : "right";
  const edgePeekState = useReversibleEdgePeek({
    edge: peekSide,
    collapsedRatio,
    enterDelay: 70,
    leaveDelay: 320,
    duration: 220,
    disabled: !edgePeek || !docked,
    pinnedOpen: expanded || dragging || winDrag.dragging,
    onProgressChange: onPeekProgressChange,
  });

  useHitAreaCollector({
    rootRef: surfaceRef,
    includePortals: true,
    enabled: Boolean(onHitAreasChange),
    onAreasChange: onHitAreasChange,
  });

  const setExpandedSynced = useCallback(
    (next: boolean) => {
      setExpanded(next);
      emitPreferences({ expanded: next });
    },
    [setExpanded, emitPreferences],
  );

  const setActiveToolSynced = useCallback(
    (next: string | null) => {
      setActiveToolId(next);
      emitPreferences({ selectedId: next });
    },
    [setActiveToolId, emitPreferences],
  );

  const setEdgeWithAnnouncement = useCallback(
    (nextEdge: AfDesktopToolsEdge) => {
      setEdge(nextEdge);
      emitPreferences({ edge: nextEdge });
      setAnnouncement(`悬浮球已切换为${edgeLabel(nextEdge)}`);
    },
    [setEdge, emitPreferences],
  );

  const handleToggleRailCollapsed = () => {
    const next = !railCollapsed;
    setRailCollapsed(next);
    emitPreferences({ railCollapsed: next });
  };

  const handleSelectTool = (id: string) => {
    const next = activeToolId === id ? null : id;
    setActiveToolSynced(next);
  };

  const handleToggleManage = () => {
    const next = activeToolId === MANAGE_PANEL_ID ? null : MANAGE_PANEL_ID;
    setActiveToolSynced(next);
  };

  const closePanel = useCallback(() => {
    setActiveToolSynced(null);
  }, [setActiveToolSynced]);

  const handleOpenMainWindow = () => {
    onOpenMainWindow?.();
    setAnnouncement("已请求唤起主窗口");
  };

  const handleUpdateSummary = useCallback(
    (id: string, next?: AfDesktopToolSummary) => {
      setSummaryOverrides((prev) => {
        if (!next) {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        }
        return { ...prev, [id]: next };
      });
      setEntriesState((prev) => prev.map((item) => (item.id === id ? { ...item, summary: next } : item)));
    },
    [setEntriesState],
  );

  const handleToggleEnabled = useCallback(
    (id: string) => {
      const target = entries.find((item) => item.id === id);
      if (!target) return;
      const nextEnabled = !target.enabled;
      const nextList = normalizeEntries(
        entriesState.map((item) =>
          item.id === id
            ? { ...item, enabled: nextEnabled, pinned: nextEnabled ? item.pinned : false }
            : item,
        ),
      );
      setEntriesState(nextList);
      if (!nextEnabled && activeToolId === id) {
        const firstRemaining = nextList.find((item) => item.enabled)?.id ?? null;
        setActiveToolSynced(firstRemaining);
      }
      setAnnouncement(`${target.name}${nextEnabled ? "已加入快捷栏" : "已从快捷栏移除"}`);
    },
    [entries, entriesState, setEntriesState, activeToolId, setActiveToolSynced],
  );

  const handleTogglePinned = useCallback(
    (id: string) => {
      const target = entries.find((item) => item.id === id);
      if (!target) return;
      const nextPinned = !target.pinned;
      const nextList = normalizeEntries(
        entriesState.map((item) => (item.id === id ? { ...item, pinned: nextPinned } : item)),
      );
      setEntriesState(nextList);
      setAnnouncement(`${target.name}${nextPinned ? "已置顶" : "已取消置顶"}`);
    },
    [entries, entriesState, setEntriesState],
  );

  const handleMoveEntry = useCallback(
    (id: string, delta: -1 | 1) => {
      const ordered = normalizeEntries(entriesState);
      const enabled = ordered.filter((item) => item.enabled);
      const disabled = ordered.filter((item) => !item.enabled);
      const idx = enabled.findIndex((item) => item.id === id);
      if (idx < 0) return;
      const swapIdx = idx + delta;
      if (swapIdx < 0 || swapIdx >= enabled.length) return;
      if (Boolean(enabled[idx].pinned) !== Boolean(enabled[swapIdx].pinned)) return;
      const copy = [...enabled];
      const [moved] = copy.splice(idx, 1);
      copy.splice(swapIdx, 0, moved);
      setEntriesState([...copy, ...disabled]);
      setAnnouncement(`${moved.name}${delta < 0 ? "已上移" : "已下移"}`);
    },
    [entriesState, setEntriesState],
  );

  // ---- Orb 拖拽与键盘停靠 ----
  const latestEdgeRef = useRef<AfDesktopToolsEdge>(edge);
  latestEdgeRef.current = edge;
  const latestYRatioRef = useRef<number>(yRatio);
  latestYRatioRef.current = yRatio;

  const handleOrbPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 忽略部分无头测试环境未实现 pointer capture 抛错
    }
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const handleOrbPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (!state.moved) {
      if (Math.hypot(e.clientX - state.startX, e.clientY - state.startY) < 4) return;
      state.moved = true;
      setDragging(true);
    }
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return;
    const nextRatio = clampRatio((e.clientY - rect.top) / rect.height);
    const leftDist = e.clientX - rect.left;
    const rightDist = rect.right - e.clientX;
    const topDist = e.clientY - rect.top;
    const nextEdge: AfDesktopToolsEdge =
      topDist <= 44
        ? "top"
        : leftDist <= 56
          ? "left"
          : rightDist <= 56
            ? "right"
            : "free";
    latestYRatioRef.current = nextRatio;
    latestEdgeRef.current = nextEdge;
    setYRatio(nextRatio);
    setEdge(nextEdge);
    emitPreferences({ yRatio: nextRatio, edge: nextEdge });
  };

  const finishDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // 忽略释放异常
    }
    if (state.moved) {
      suppressClickUntilRef.current = Date.now() + 250;
      const rect = surfaceRef.current?.getBoundingClientRect();
      let settledEdge = latestEdgeRef.current;
      const settledRatio = latestYRatioRef.current;
      if (rect && rect.width > 0 && rect.height > 0 && settledEdge === "free") {
        const topDist = e.clientY - rect.top;
        const leftDist = e.clientX - rect.left;
        const rightDist = rect.right - e.clientX;
        settledEdge = topDist <= 52 ? "top" : leftDist <= rightDist ? "left" : "right";
        latestEdgeRef.current = settledEdge;
        setEdge(settledEdge);
        emitPreferences({ edge: settledEdge, yRatio: settledRatio });
      }
      setAnnouncement(`悬浮球已吸附至${edgeLabel(settledEdge)}，纵坐标 ${Math.round(settledRatio * 100)}%`);
    }
    dragStateRef.current = null;
    setDragging(false);
  };

  const handleOrbPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    finishDrag(e);
  };

  const handleOrbPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    finishDrag(e);
  };

  const handleOrbClick = () => {
    if (Date.now() < suppressClickUntilRef.current) return;
    const next = !expanded;
    setExpandedSynced(next);
    setAnnouncement(next ? "已展开快捷工具栏" : "已收起快捷工具栏");
  };

  const handleOrbKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = clampRatio(yRatio - 0.08);
      setYRatio(next);
      emitPreferences({ yRatio: next });
      setAnnouncement(`悬浮球位置 ${Math.round(next * 100)}%`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = clampRatio(yRatio + 0.08);
      setYRatio(next);
      emitPreferences({ yRatio: next });
      setAnnouncement(`悬浮球位置 ${Math.round(next * 100)}%`);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next: AfDesktopToolsEdge = edge === "right" ? "free" : "left";
      setEdgeWithAnnouncement(next);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const next: AfDesktopToolsEdge = edge === "left" ? "free" : "right";
      setEdgeWithAnnouncement(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      const next = clampRatio(0.15);
      setYRatio(next);
      emitPreferences({ yRatio: next });
    } else if (e.key === "End") {
      e.preventDefault();
      const next = clampRatio(0.85);
      setYRatio(next);
      emitPreferences({ yRatio: next });
    }
  };

  const handleSurfaceKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (panelOpen) {
      e.stopPropagation();
      closePanel();
      setAnnouncement("已关闭二级工具面板");
    } else if (expanded) {
      e.stopPropagation();
      setExpandedSynced(false);
      orbRef.current?.focus();
      setAnnouncement("已收起快捷工具栏");
    }
  };

  const railToggleIcon: AfIconName =
    edge === "left"
      ? railCollapsed
        ? "chevronRight"
        : "chevronLeft"
      : railCollapsed
        ? "chevronLeft"
        : "chevronRight";

  const surfaceStyle = {
    ...style,
    "--af-tools-y": `${Math.round(yRatio * 1000) / 10}%`,
    "--peek-x": edge === "top" || !docked ? "0%" : `${edgePeekState.offsetPercent}%`,
    "--peek-y": edge === "top" ? `${edgePeekState.offsetPercent}%` : "0%",
  } as CSSProperties;

  return (
    <div
      ref={surfaceRef}
      className={cn("af-shell-tools", embedded && "af-shell-tools-stage", className)}
      style={surfaceStyle}
      data-edge={edge}
      data-docked={docked ? "true" : "false"}
      data-edge-peek={edgePeek && docked && !expanded ? "true" : undefined}
      data-peeking={edgePeekState.peeking ? "true" : undefined}
      data-peek-progress={Math.round(edgePeekState.progress * 100) / 100}
      data-panel-mode={panelMode}
      data-expanded={expanded ? "true" : "false"}
      data-rail-collapsed={railCollapsed ? "true" : undefined}
      data-panel-open={panelOpen ? "true" : undefined}
      data-dragging={dragging || winDrag.dragging ? "true" : undefined}
      onKeyDown={handleSurfaceKeyDown}
    >
      {embedded ? (
        <div className="af-shell-tools__wallpaper" aria-hidden="true">
          <span className="af-shell-tools__wallpaper-pill">
            拖拽悬浮球可靠边停靠 · 按 Esc 逐级收起面板
          </span>
        </div>
      ) : null}

      <div className="af-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Stage 1: 可拖拽悬浮球入口 */}
      <div className="af-shell-tools__orb-slot" {...edgePeekState.bindPeek}>
        <button
          ref={orbRef}
          type="button"
          className="af-shell-tools__orb"
          data-af-hit-area
          title={orbTitle}
          aria-label={expanded ? "收起快捷工具栏" : "展开快捷工具栏"}
          aria-expanded={expanded}
          aria-controls={railId}
          onPointerDown={(e) => {
            winDrag.bindTarget.onPointerDown(e);
            handleOrbPointerDown(e);
          }}
          onPointerMove={(e) => {
            winDrag.bindTarget.onPointerMove(e);
            handleOrbPointerMove(e);
          }}
          onPointerUp={(e) => {
            winDrag.bindTarget.onPointerUp(e);
            handleOrbPointerUp(e);
          }}
          onPointerCancel={(e) => {
            winDrag.bindTarget.onPointerCancel(e);
            handleOrbPointerCancel(e);
          }}
          onClickCapture={winDrag.bindTarget.onClickCapture}
          onKeyDown={handleOrbKeyDown}
          onClick={handleOrbClick}
        >
          <ToolsOrbMark />
        </button>
      </div>

      {/* Stage 2: 快捷工具轨（收起时仅通过 inert 阻断键盘与交互焦点） */}
      <div
        id={railId}
        className="af-shell-tools__rail-slot"
        {...(!expanded ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
      >
        <nav className="af-shell-tools__rail" data-af-hit-area={expanded ? "" : undefined} aria-label="快捷工具">
          <div className="af-shell-tools__rail-head">
            {!railCollapsed ? <span className="af-shell-tools__rail-title">快捷工具</span> : null}
            <button
              type="button"
              className="af-shell-tools__rail-toggle"
              aria-label={railCollapsed ? "展开工具栏" : "折叠工具栏"}
              aria-pressed={railCollapsed}
              onClick={handleToggleRailCollapsed}
            >
              <AfIcon name={railToggleIcon} size={13} />
            </button>
          </div>

          <div className="af-shell-tools__list" data-af-hover-list="hover">
            {enabledEntries.map((entry) => {
              const isActive = expanded && activeToolId === entry.id;
              const pct =
                typeof entry.summary?.progress === "number"
                  ? Math.max(0, Math.min(100, Math.round(entry.summary.progress * 100)))
                  : null;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="af-shell-tools__entry"
                  data-active={isActive ? "true" : undefined}
                  data-pinned={entry.pinned ? "true" : undefined}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={entry.name}
                  title={railCollapsed ? entry.name : undefined}
                  onClick={() => handleSelectTool(entry.id)}
                >
                  <span className="af-shell-tools__entry-icon" aria-hidden="true">
                    {renderAfIconSlot(entry.icon ?? "sliders", 15)}
                  </span>
                  {!railCollapsed ? (
                    <span className="af-shell-tools__entry-body">
                      <span className="af-shell-tools__entry-row">
                        <span className="af-shell-tools__entry-name">{entry.name}</span>
                        {entry.pinned ? (
                          <span className="af-shell-tools__entry-pin" aria-hidden="true">
                            <AfIcon name="star" size={10} fill="currentColor" />
                          </span>
                        ) : null}
                        {entry.summary?.metric ? (
                          <span className="af-shell-tools__entry-metric">{entry.summary.metric}</span>
                        ) : entry.badge ? (
                          <span className="af-shell-tools__entry-badge">{entry.badge}</span>
                        ) : null}
                      </span>
                      {pct !== null ? (
                        <span className="af-shell-tools__metric" aria-hidden="true">
                          <span className="af-shell-tools__metric-fill" style={{ width: `${pct}%` }} />
                        </span>
                      ) : null}
                      {entry.summary?.hint ? (
                        <span className="af-shell-tools__entry-hint">{entry.summary.hint}</span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="af-shell-tools__rail-foot" data-af-hover-list="hover">
            <button
              type="button"
              className="af-shell-tools__foot-btn"
              data-active={isManaging ? "true" : undefined}
              aria-pressed={isManaging}
              aria-label="管理工具"
              title={railCollapsed ? "管理工具" : undefined}
              onClick={handleToggleManage}
            >
              <span className="af-shell-tools__entry-icon" aria-hidden="true">
                <AfIcon name="sliders" size={14} />
              </span>
              {!railCollapsed ? <span className="af-shell-tools__foot-label">管理工具</span> : null}
            </button>

            <button
              type="button"
              className="af-shell-tools__foot-btn"
              aria-label="打开主窗口"
              title={railCollapsed ? "打开主窗口" : undefined}
              onClick={handleOpenMainWindow}
            >
              <span className="af-shell-tools__entry-icon" aria-hidden="true">
                <AfIcon name="home" size={14} />
              </span>
              {!railCollapsed ? <span className="af-shell-tools__foot-label">打开主窗口</span> : null}
            </button>
          </div>
        </nav>
      </div>

      {/* Stage 3: 二级工具 / 管理展开面板（支持退场快照冻结与 detached 独立面板模式） */}
      {panelMode === "inline" ? (
        <div
          className="af-shell-tools__panel-slot"
          data-closing={panelExit.closing ? "true" : undefined}
          {...(!panelOpen ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
        >
          <section
            className="af-shell-tools__panel"
            data-af-hit-area={panelOpen ? "" : undefined}
            aria-label={renderedManaging ? "管理工具" : renderedEntry?.name ?? "工具详情"}
          >
            {panelExit.mounted ? (
              <div
                key={renderedManaging ? "__manage__" : (renderedEntry?.id ?? "__empty__")}
                className="af-pj-panel-in"
                style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
              >
                {renderedManaging ? (
                  <ManageToolsPanel
                    entries={entries}
                    enabledCount={enabledEntries.length}
                    edge={edge}
                    onChangeEdge={setEdgeWithAnnouncement}
                    onToggleEnabled={handleToggleEnabled}
                    onTogglePinned={handleTogglePinned}
                    onMoveEntry={handleMoveEntry}
                    onClose={closePanel}
                  />
                ) : renderedEntry ? (
                  <ToolBoundary key={renderedEntry.id} entryName={renderedEntry.name}>
                    <div className="af-shell-tools__panel-head">
                      <div className="af-shell-tools__panel-titles">
                        <span className="af-shell-tools__panel-icon" aria-hidden="true">
                          {renderAfIconSlot(renderedEntry.icon ?? "sliders", 15)}
                        </span>
                        <div className="af-shell-tools__panel-heading">
                          <h3 className="af-shell-tools__panel-title">{renderedEntry.name}</h3>
                          {renderedEntry.summary?.status ? (
                            <span className="af-shell-tools__panel-sub">{renderedEntry.summary.status}</span>
                          ) : null}
                        </div>
                      </div>
                      <AfButton
                        size="xs"
                        variant="ghost"
                        icon="x"
                        aria-label="关闭面板"
                        onClick={closePanel}
                      />
                    </div>
                    <div className="af-shell-tools__panel-body">
                      <ToolContent
                        entry={renderedEntry}
                        summary={renderedEntry.summary}
                        updateSummary={(next) => handleUpdateSummary(renderedEntry.id, next)}
                        openMainWindow={handleOpenMainWindow}
                        closePanel={closePanel}
                        renderPanel={renderPanel}
                      />
                    </div>
                  </ToolBoundary>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
